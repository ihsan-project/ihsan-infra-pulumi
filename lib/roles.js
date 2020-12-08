"use strict";
const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");

exports.createAPIBuildRole = function(appName) {
    const buildRole = new aws.iam.Role(`${appName}-api-role-cb`, {
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
    const codebuildPolicy = new aws.iam.Policy(`${appName}-api-policy-cb`, {
        description: "Give Codebuild access to ECR and Cloudwatch",
        policy: {
            Version: "2012-10-17",
            Statement: [{
                Action: [
                    "ecr:GetAuthorizationToken",
                    "ecr:BatchCheckLayerAvailability",
                    "ecr:GetDownloadUrlForLayer",
                    "ecr:GetRepositoryPolicy",
                    "ecr:DescribeRepositories",
                    "ecr:ListImages",
                    "ecr:DescribeImages",
                    "ecr:BatchGetImage",
                    "ecr:GetLifecyclePolicy",
                    "ecr:GetLifecyclePolicyPreview",
                    "ecr:ListTagsForResource",
                    "ecr:DescribeImageScanFindings",
                    "ecr:InitiateLayerUpload",
                    "ecr:UploadLayerPart",
                    "ecr:CompleteLayerUpload",
                    "ecr:PutImage",
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                    "s3:PutObject",
                    "s3:GetObject",
                    "s3:GetObjectVersion",
                ],
                Resource: "*",
                Effect: "Allow",
                Sid: "6",
            }],
        }
    });
    new aws.iam.RolePolicyAttachment(`${appName}-api-attach-cb`, {
        policyArn: codebuildPolicy.arn,
        role: buildRole.name,
    });

    return buildRole;
}

exports.createAndroidBuildRole = function(appName) {
  const buildRole = new aws.iam.Role(`${appName}-droid-role-cb`, {
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
  const codebuildPolicy = new aws.iam.Policy(`${appName}-droid-policy-cb`, {
      description: "Give Codebuild access to ECR and Cloudwatch",
      policy: {
          Version: "2012-10-17",
          Statement: [{
              Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "s3:PutObject",
                "s3:GetObject",
                "s3:GetObjectVersion",
                "s3:GetBucketAcl",
                "s3:GetBucketLocation",
                "codebuild:CreateReportGroup",
                "codebuild:CreateReport",
                "codebuild:UpdateReport",
                "codebuild:BatchPutTestCases"
              ],
              Resource: "*",
              Effect: "Allow",
              Sid: "6",
          }],
      }
  });
  new aws.iam.RolePolicyAttachment(`${appName}-droid-attach-cb`, {
      policyArn: codebuildPolicy.arn,
      role: buildRole.name,
  });

  return buildRole;
}

exports.createApiPipelineRole = function(appName, bucketARN) {
    const pipelineRole = new aws.iam.Role(`${appName}-api-role-pipe`, {
        assumeRolePolicy: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'codepipeline.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
    });

    new aws.iam.RolePolicy(`${appName}-api-policy-pipe`, {
        role: pipelineRole.id,
        policy: pulumi.interpolate`{
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect":"Allow",
              "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion",
                "s3:GetBucketVersioning",
                "s3:PutObject"
              ],
              "Resource": [
                "${bucketARN}",
                "${bucketARN}/*"
              ]
            },
            {
              "Effect": "Allow",
              "Action": [
                "codebuild:BatchGetBuilds",
                "codebuild:StartBuild",
                "iam:PassRole",
                "ecs:*"
              ],
              "Resource": "*"
            }
          ]
        }
        `,
    });

    return pipelineRole;
}

exports.createAndroidPipelineRole = function(appName, bucketARN) {
  const pipelineRole = new aws.iam.Role(`${appName}-droid-role-pipe`, {
      assumeRolePolicy: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'codepipeline.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
  });

  new aws.iam.RolePolicy(`${appName}-droid-policy-pipe`, {
      role: pipelineRole.id,
      policy: pulumi.interpolate`{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect":"Allow",
            "Action": [
              "s3:GetObject",
              "s3:GetObjectVersion",
              "s3:GetBucketVersioning",
              "s3:PutObject"
            ],
            "Resource": [
              "${bucketARN}",
              "${bucketARN}/*"
            ]
          },
          {
            "Effect": "Allow",
            "Action": [
              "iam:PassRole",
              "codecommit:CancelUploadArchive",
              "codecommit:GetBranch",
              "codecommit:GetCommit",
              "codecommit:GetUploadArchiveStatus",
              "codecommit:UploadArchive",
              "codedeploy:CreateDeployment",
              "codedeploy:GetApplication",
              "codedeploy:GetApplicationRevision",
              "codedeploy:GetDeployment",
              "codedeploy:GetDeploymentConfig",
              "codedeploy:RegisterApplicationRevision",
              "elasticbeanstalk:*",
              "ec2:*",
              "elasticloadbalancing:*",
              "autoscaling:*",
              "cloudwatch:*",
              "sns:*",
              "cloudformation:*",
              "rds:*",
              "sqs:*",
              "ecs:*",
              "lambda:InvokeFunction",
              "lambda:ListFunctions",
              "opsworks:CreateDeployment",
              "opsworks:DescribeApps",
              "opsworks:DescribeCommands",
              "opsworks:DescribeDeployments",
              "opsworks:DescribeInstances",
              "opsworks:DescribeStacks",
              "opsworks:UpdateApp",
              "opsworks:UpdateStack",
              "cloudformation:CreateStack",
              "cloudformation:DeleteStack",
              "cloudformation:DescribeStacks",
              "cloudformation:UpdateStack",
              "cloudformation:CreateChangeSet",
              "cloudformation:DeleteChangeSet",
              "cloudformation:DescribeChangeSet",
              "cloudformation:ExecuteChangeSet",
              "cloudformation:SetStackPolicy",
              "cloudformation:ValidateTemplate",
              "codebuild:BatchGetBuilds",
              "codebuild:StartBuild",
              "devicefarm:ListProjects",
              "devicefarm:ListDevicePools",
              "devicefarm:GetRun",
              "devicefarm:GetUpload",
              "devicefarm:CreateUpload",
              "devicefarm:ScheduleRun",
              "servicecatalog:ListProvisioningArtifacts",
              "servicecatalog:CreateProvisioningArtifact",
              "servicecatalog:DescribeProvisioningArtifact",
              "servicecatalog:DeleteProvisioningArtifact",
              "servicecatalog:UpdateProduct",
              "cloudformation:ValidateTemplate",
              "ecr:DescribeImages"
            ],
            "Resource": "*"
          }
        ]
      }
      `,
    });

  return pipelineRole;
}

exports.createExecutionRole = function(appName) {
    // Access to Secrets Manager is the reason to create a custom execution role
    // Otherwise Crossroads will crate a default task role
    // with all the right policies attached for basic ECS container tasks
    const secretPolicy = new aws.iam.Policy(`${appName}-policy-sm`, {
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
                Resource: `arn:aws:secretsmanager:${process.env.AWS_REGION}:${process.env.AWS_USER_ID}:secret:*`, // Can replace * with more specific to limit acces
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
                Resource: `arn:aws:kms:${process.env.AWS_REGION}:${process.env.AWS_USER_ID}:key/*`,
                Sid: "4",
            }],
        }
    });

    // This role would've been created by default by Crossroads or ECS
    const taskExecutionPolicy = new aws.iam.Policy(`${appName}-policy-te`, {
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

    const executionRole = new aws.iam.Role(`${appName}-role-te`, {
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
    new aws.iam.RolePolicyAttachment(`${appName}-attach-sm`, {
        policyArn: secretPolicy.arn,
        role: executionRole.name,
    });
    new aws.iam.RolePolicyAttachment(`${appName}-attach-te`, {
        policyArn: taskExecutionPolicy.arn,
        role: executionRole.name,
    });

    return executionRole;
}
