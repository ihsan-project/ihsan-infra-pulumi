"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

const taskRole = function() {
    const role = new aws.iam.Role("ecs-task-role", {
        assumeRolePolicy: {
            Version: "2012-10-17",
            Statement: [{
                Action: "sts:AssumeRole",
                Principal: {
                    Service: "ecs-tasks.amazonaws.com"
                },
                Effect: "Allow",
                Sid: "1",
            }],
        }
    });

    // This is the main reason to create a custom task role
    // Otherwise Crossroads will crate a default task role with all the right policies attached
    const secretPolicy = new aws.iam.Policy("secret-policy", {
        description: "A test policy",
        policy: `{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Action": ["ssm:GetParameters", "secretsmanager:GetSecretValue"],
          "Effect": "Allow",
          "Resource": ["arn:aws:secretsmanager:us-east-1:952442618488:secret:khatm/production/*"]
        }
      ]
    }`,
    });
    new aws.iam.RolePolicyAttachment("attach-secret", {
        policyArn: secretPolicy.arn,
        role: role.name,
    });

    // These are the AWS Managed policies that Crossroads normally attaches to task role
    new aws.iam.RolePolicyAttachment("attach-ecs-access", {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess",
    });
    new aws.iam.RolePolicyAttachment("attach-lambda-access", {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/AWSLambdaFullAccess",
    });

    return role
}

exports.createECS = function(security, db) {
    const {vpc, securityGroups} = security;
    const {appSg, lbSg} = securityGroups;

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
            minSize: 2,
            maxSize: 10
        },
        subnetIds: vpc.publicSubnetIds, // Server nodes need to be in the public subnet
        launchConfigurationArgs: { instanceType: "t2.nano" },
    });

    // Pass in the listener to hook up the network load balancer
    // to the containers the service will launch.
    const service = new awsx.ecs.EC2Service("api-orchestrator", {
        cluster,
        logGroup,
        desiredCount: 1,
        healthCheckGracePeriod: 120,
        taskDefinitionArgs: {
            taskRole: taskRole(),
            containers: {
                nginx: {
                    // Need Docker Engine installed on CLI environment for awsx.ecs.Image
                    image: awsx.ecs.Image.fromPath("khatm-images", "./app"),
                    memory: 128, // TODO: What should a good amount be? I'm guessing this is MB
                    portMappings: [listener],
                    secrets: [{
                        name: "GOOGLE_SSO_CLIENT_ID",
                        valueFrom: "arn:aws:secretsmanager:us-east-1:952442618488:secret:khatm/production/app-nKQ3wx"
                    }, {
                        name: "API_KEY",
                        valueFrom: "arn:aws:secretsmanager:us-east-1:952442618488:secret:khatm/production/app-nKQ3wx"
                    }],
                    environment: [{
                        name: "PG_CONNECTION_DB_NAME",
                        value: process.env.RDS_DATABASE_NAME
                    }, {
                        name: "PG_CONNECTION_USER",
                        value: process.env.RDS_DATABASE_USER
                    }, {
                        name: "PG_CONNECTION_PASSWORD",
                        value: process.env.RDS_DATABASE_PASSWORD
                    }, {
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
