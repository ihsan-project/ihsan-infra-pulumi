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
const {
    createExecutionRole
} = require("./roles.js");

const createALB = function(appName, environment) {
    const { vpc, securityGroups: { lbSg } } = environment;

    // Creates an ALB associated with our custom VPC.
    const alb = new awsx.lb.ApplicationLoadBalancer(`${appName}-alb`, {
        vpc,
        securityGroups: [lbSg],
    });

    // The certificate for the LB to use for HTTPS:443
    // Assume that it's been setup as a wildcard certificate to allow any subdomain
    const sslCert = pulumi.output(aws.acm.getCertificate({ domain: `*.${process.env.DOMAIN}`, }));

    // Listen on HTTPS 443, terminate SSL,
    // output to HTTP 80 for all target EC2 instances that attach to it
    const albTarget = alb.createTargetGroup(`${appName}-alb-trgt`, {
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
    const albListener = albTarget.createListener(`${appName}-alb-lstnr`, {
        port: 443,
        certificateArn: sslCert.arn,
        protocol: "HTTPS",
    });

    return { albTarget, albListener }
}

exports.createECS = function(appName, environment, db, containerName) {
    const { vpc, securityGroups: { appSg } } = environment;

    const { albTarget, albListener } = createALB(appName, environment);
    const executionRole = createExecutionRole(appName);

    const logGroup = new aws.cloudwatch.LogGroup(`${appName}-ecs-logs`, {
        retentionInDays: 7,
    });

    // Create an ECS cluster
    const cluster = new awsx.ecs.Cluster(`${appName}-ecs-clst`, {
        vpc,
        securityGroups: [ appSg ]
    });

    // Specify the auto scale settings for cluster
    cluster.createAutoScalingGroup(`${appName}-ecs-inst`, {
        targetGroups: [albTarget],
        templateParameters: {
            minSize: 1,
            maxSize: 10
        },
        launchConfigurationArgs: { instanceType: "t2.nano" },
    }, { dependsOn: [albTarget, albListener] }); // The timing won't be right without this dependency

    const service = new awsx.ecs.EC2Service(`${appName}-ecs-srvc`, {
        cluster,
        logGroup,
        desiredCount: 1,
        healthCheckGracePeriod: 120,
        // Note: https://stackoverflow.com/a/48952145
        //       The deploymentMaximumPercent and deploymentMinimumHealthyPercent work together to allow rolling deploys
        // deploymentMaximumPercent: 200, // Default is 200
        deploymentMinimumHealthyPercent: 0, // When using 1 instance, you need to allow ECS to bring that entire instance down during deployments
        taskDefinitionArgs: {
            executionRole,
            networkMode: "bridge", // Default is awsvpc mode which behaves really differently from classical Containers
            containers: {
                [containerName]: {
                    image: `${process.env.ECR_REPOSITORY_URI}:latest`,
                    // image: "nginx:latest", // Keep for testing base case
                    memory: 128, // TODO: What should a good amount be? In MiB
                    portMappings: [albListener], // This will setup the ALB to the Service, and set the portmappings as 80:80
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

    return {service, cluster, albListener};
}
