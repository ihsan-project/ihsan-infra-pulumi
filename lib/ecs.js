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

    // Listen on HTTPS 443, terminate SSL,
    // output to HTTP 80 for all target EC2 instances that attach to it
    const httpTarget = alb.createTargetGroup("http-target", {
        port: 80,
        protocol: "HTTP",
        targetType: "instance",
        healthCheck: {
            // The web application needs to return a 200 at this path
            // Default path is `/`
            path: "/api", // TODO: Get from Env
            // The following is to give the instance in private subnet some time to come up
            interval: 120, // Slow down how often it does health checks
            unhealthyThreshold: 5 // Increase how unhealthy checks before it drains from the instance
        }
    });
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
        targetGroups: [httpTarget],
        templateParameters: {
            minSize: 1,
            maxSize: 10
        },
        launchConfigurationArgs: { instanceType: "t2.nano" },
    });

    const service = new awsx.ecs.EC2Service("api-service", {
        cluster,
        logGroup,
        desiredCount: 1,
        healthCheckGracePeriod: 120,
        // subnets: vpc.privateSubnets,
        taskDefinitionArgs: {
            executionRole,
            networkMode: "bridge",
            containers: {
                khatm_container: {
                    image: `${process.env.ECR_REPOSITORY_URI}:latest`,
                    // image: "nginx:latest", // Keep for testing base case
                    memory: 128, // TODO: What should a good amount be? In MiB
                    portMappings: [listener], // This will setup the ALB to the Service, and set the portmappings as 80:80
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
                        value: "production" // TODO: Configure from Env
                    }, {
                        name: "PORT",
                        value: "80" // Make sure application is serving on port 80 and bound to host 0.0.0.0
                    }]
                },
            },
        },
    });

    return {listener, service, cluster};
}
