"use strict";
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

exports.createECS = function(security, db, roles) {
    const {vpc, securityGroups} = security;
    const {appSg, lbSg} = securityGroups;
    const {taskRole} = roles;

    // Creates an ALB associated with our custom VPC.
    const alb = new awsx.lb.ApplicationLoadBalancer("api-alb", {
        vpc,
        securityGroups: [ lbSg ],
     });

    // Listen on HTTPS:443, terminate SSL, output to HTTP:80
    const httpTarget = alb.createTargetGroup("http-target", { port: 80, protocol: "HTTP" });
    const listener = httpTarget.createListener("https-listener", {
        port: 443,
        certificateArn: process.env.DOMAIN_CERTIFICATE_ARN,
        protocol: "HTTPS",
    });

    const logGroup = new aws.cloudwatch.LogGroup("api-logs", {
        retentionInDays: 7,
    });

    // Create an ECS cluster
    const cluster = new awsx.ecs.Cluster("api-cluster", {
        vpc,
        securityGroups: [ appSg ]
    });

    // Specify the auto scale settings for cluster
    cluster.createAutoScalingGroup("api-scale", {
        templateParameters: {
            minSize: 1,
            maxSize: 10
        },
        subnetIds: vpc.publicSubnetIds, // Server nodes need to be in the public subnet
        launchConfigurationArgs: { instanceType: "t2.nano" },
    });

    // Pass in the listener to hook up the network load balancer
    // to the containers the service will launch.
    const service = new awsx.ecs.EC2Service("api-service", {
        cluster,
        logGroup,
        desiredCount: 1,
        healthCheckGracePeriod: 120,
        taskDefinitionArgs: {
            taskRole,
            containers: {
                nginx: {
                    // Need Docker Engine installed on CLI environment for awsx.ecs.Image
                    image: awsx.ecs.Image.fromPath("khatm-images", "./app"),
                    memory: 128, // TODO: What should a good amount be? I'm guessing this is MB
                    portMappings: [listener],
                    // secrets: [{
                    //     name: "GOOGLE_SSO_CLIENT_ID",
                    //     valueFrom: "khatm/production/google_sso_client_id"
                    // }, {
                    //     name: "API_KEY",
                    //     valueFrom: "khatm/production/api_key"
                    // }, {
                    //     name: "PG_CONNECTION_DB_NAME",
                    //     valueFrom: "khatm/production/db/name"
                    // }, {
                    //     name: "PG_CONNECTION_USER",
                    //     valueFrom: "khatm/production/db/user"
                    // }, {
                    //     name: "PG_CONNECTION_PASSWORD",
                    //     valueFrom: "khatm/production/db/password"
                    // }],
                    environment: [{
                        name: "PG_CONNECTION_STRING",
                        value: db.address
                    }, {
                        name: "NODE_ENV",
                        value: "production" // TODO: Configure dynamically
                    }]
                },
            },
        },
    });

    return {listener, service, cluster};
}
