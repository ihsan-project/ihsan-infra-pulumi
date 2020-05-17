"use strict";
const aws = require("@pulumi/aws");

exports.createRoles = function() {
    const taskRole = new aws.iam.Role("ecs-task-role", {
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
    // Otherwise Crossroads will crate a default task role
    // with all the right policies attached for basic ECS container tasks
    const secretPolicy = new aws.iam.Policy("secret-policy", {
        description: "Give ECS Containers permission to Secrets Manager",
        policy: {
            Version: "2012-10-17",
            Statement: [{
                Action: [
                    "secretsmanager:GetResourcePolicy",
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret",
                    "secretsmanager:ListSecretVersionIds"
                ],
                Resource: "arn:aws:secretsmanager:us-east-1:952442618488:secret:*",
                Effect: "Allow",
                Sid: "2",
            }, {
                Action: [
                    "secretsmanager:GetRandomPassword",
                    "secretsmanager:ListSecrets"
                ],
                Resource: "*",
                Effect: "Allow",
                Sid: "3",
            },{
                Effect: "Allow",
                Action: "kms:Decrypt",
                Resource: "arn:aws:kms:us-east-1:952442618488:key/*",
                Sid: "4",
            }],
        }
    });
    new aws.iam.RolePolicyAttachment("attach-secret", {
        policyArn: secretPolicy.arn,
        role: taskRole.name,
    });

    // These are the AWS Managed policies that Crossroads normally attaches to task role
    new aws.iam.RolePolicyAttachment("attach-ecs-access", {
        role: taskRole.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess",
    });
    new aws.iam.RolePolicyAttachment("attach-lambda-access", {
        role: taskRole.name,
        policyArn: "arn:aws:iam::aws:policy/AWSLambdaFullAccess",
    });

    return {taskRole}
}