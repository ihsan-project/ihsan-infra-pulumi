"use strict";
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

exports.createECS = function(appName, environment, db) {
    const { vpc, securityGroups, alb: { albTarget, albListener } } = environment;
    const { appSg } = securityGroups;

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
    });

    const service = new awsx.ecs.EC2Service(`${appName}-ecs-srvc`, {
        cluster,
        logGroup,
        desiredCount: 1,
        healthCheckGracePeriod: 120,
        taskDefinitionArgs: {
            executionRole,
            networkMode: "bridge", // Default is awsvpc mode which behaves really differently from classical Containers
            containers: {
                web_container: {
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

    return {service, cluster};
}
