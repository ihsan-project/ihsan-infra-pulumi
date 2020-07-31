"use strict";
const aws = require("@pulumi/aws");

exports.createRoles = function() {
    // Access to Secrets Manager is the reason to create a custom execution role
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
                Resource: process.env.SECRETS_MANAGER_ARN,
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
                Resource: process.env.SECRETS_KMS_ARN,
                Sid: "4",
            }],
        }
    });

    // This role would've been created by default by Crossroads or ECS
    const taskExecutionPolicy = new aws.iam.Policy("task-execution-policy", {
        description: "Give ECS Task Execution Rights",
        policy: {
            Version: "2012-10-17",
            Statement: [{
                Action: [
                    "ecr:GetAuthorizationToken",
                    "ecr:BatchCheckLayerAvailability",
                    "ecr:GetDownloadUrlForLayer",
                    "ecr:BatchGetImage",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                ],
                Resource: "*",
                Effect: "Allow",
                Sid: "5",
            }],
        }
    });

    const executionRole = new aws.iam.Role("ecs-execution-role", {
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
    new aws.iam.RolePolicyAttachment("attach-secret-execution", {
        policyArn: secretPolicy.arn,
        role: executionRole.name,
    });
    new aws.iam.RolePolicyAttachment("attach-task-execution", {
        policyArn: taskExecutionPolicy.arn,
        role: executionRole.name,
    });

    const buildRole = new aws.iam.Role('build-setup-role', {
        assumeRolePolicy: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'codebuild.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
    });
    new aws.iam.RolePolicyAttachment('build-setup-policy', {
        role: buildRole,
        policyArn: 'arn:aws:iam::aws:policy/AdministratorAccess', // TODO: Minimize this role to only what it needs
    });



    return {executionRole, buildRole}
}