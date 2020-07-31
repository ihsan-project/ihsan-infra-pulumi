"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");
const {
    googleSSO,
    apiKey,
    dbName,
    dbUser,
    dbPassword
} = require("./secrets.js");

exports.createECS = function(security, db, roles) {
    const {vpc, securityGroups} = security;
    const {appSg, lbSg} = securityGroups;
    const {executionRole} = roles;

    // Creates an ALB associated with our custom VPC.
    const alb = new awsx.lb.ApplicationLoadBalancer("api-alb", {
        vpc,
        securityGroups: [ lbSg ],
     });

    // The certificate for the LB to use for HTTPS:443
    const sslCert = pulumi.output(aws.acm.getCertificate({ domain: process.env.ACM_DOMAIN, }));

    // Listen on HTTPS:443, terminate SSL, output to HTTP:80
    const httpTarget = alb.createTargetGroup("http-target", { port: 80, protocol: "HTTP" });
    const listener = httpTarget.createListener("https-listener", {
        port: 443,
        certificateArn: sslCert.arn,
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
            executionRole,
            containers: {
                khatm_container: {
                    // Need Docker Engine installed on CLI environment for awsx.ecs.Image
                    image: awsx.ecs.Image.fromPath("khatm-images", "./app"),
                    // image: `${process.env.ECR_REPOSITORY_URI}:latest`,
                    memory: 128, // TODO: What should a good amount be? I'm guessing this is MB
                    portMappings: [listener],
                    secrets: [{
                        name: "GOOGLE_SSO_CLIENT_ID",
                        valueFrom: googleSSO.arn
                    }, {
                        name: "API_KEY",
                        valueFrom: apiKey.arn
                    }, {
                        name: "PG_CONNECTION_DB_NAME",
                        valueFrom: dbName.arn
                    }, {
                        name: "PG_CONNECTION_USER",
                        valueFrom: dbUser.arn
                    }, {
                        name: "PG_CONNECTION_PASSWORD",
                        valueFrom: dbPassword.arn
                    }],
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
