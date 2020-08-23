"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const {
  createBuildRole
} = require("./roles.js");

exports.createPipeline = function(appName, containerName, service, cluster) {
    const buildRole = createBuildRole(appName);

    // https://dev.to/danielrbradley/replacing-build-servers-with-pulumi-aws-28fm
    const buildProject = new aws.codebuild.Project(`${appName}-cb`, {
        serviceRole: buildRole.arn,
        source: {
          type: 'CODEPIPELINE',
        },
        // https://docs.aws.amazon.com/codepipeline/latest/userguide/ecs-cd-pipeline.html
        environment: {
          type: 'LINUX_CONTAINER',
          computeType: 'BUILD_GENERAL1_SMALL',
          image: 'aws/codebuild/amazonlinux2-x86_64-standard:3.0', // https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-available.html
          privilegedMode: true,
          environmentVariables: [
                {name: 'REPOSITORY_URI', value: process.env.ECR_REPOSITORY_URI},
                {name: 'CONTAINER_NAME', value: containerName}
            ]
        },
        artifacts: { type: 'CODEPIPELINE' },
    });

    // new aws.codebuild.SourceCredential(`${appName}-cb-src-crd`, {
    //   authType: 'PERSONAL_ACCESS_TOKEN',
    //   serverType: 'GITHUB',
    //   token: process.env.GITHUB_ACCESS_TOKEN,
    // });

    // new aws.codebuild.Webhook(`${appName}-cb-src-hook`, {
    //     projectName: buildProject.name,
    //     filterGroups: [
    //       {
    //         filters: [
    //           {
    //             type: 'EVENT',
    //             pattern: 'PUSH',
    //           },
    //           {
    //             type: 'HEAD_REF',
    //             pattern: `refs/heads/${process.env.GITHUB_BRANCH}`,
    //           },
    //         ],
    //       },
    //     ],
    // });







    // https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/codepipeline/#Pipeline
    const codepipelineBucket = new aws.s3.Bucket("codepipelineBucket", {acl: "private"});
    const codepipelineRole = new aws.iam.Role("codepipelineRole", {assumeRolePolicy: `{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": "codepipeline.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    }
    `});
    // const s3kmskey = aws.kms.getAlias({
    //   name: `alias/khatmalias`,
    // });
    // const s3kmskey = new aws.kms.Key("key", {});
    // const alias = new aws.kms.Alias("alias/test", {targetKeyId: s3kmskey.keyId});
    const codepipeline = new aws.codepipeline.Pipeline("codepipeline", {
      artifactStore: {
        location: codepipelineBucket.bucket,
        type: "S3",
        // encryptionKey: {
        //     id: s3kmskey.keyId,//s3kmskey.then(s3kmskey => s3kmskey.arn),
        //     type: "KMS",
        // },
      },
      roleArn: codepipelineRole.arn,
      stages: [
        {
          name: "Source",
          actions: [{
              name: "Source",
              category: "Source",
              owner: "ThirdParty",
              provider: "GitHub",
              version: "1",
              outputArtifacts: ["source_output"],
              configuration: {
                  Owner: "khatm-org",
                  Repo: "khatm-api",
                  Branch: process.env.GITHUB_BRANCH,
                  OAuthToken: process.env.GITHUB_ACCESS_TOKEN,
              },
          }],
      },
          {
              actions: [{
                  category: "Build",
                  configuration: {
                      ProjectName: buildProject.name,
                  },
                  inputArtifacts: ["source_output"],
                  name: "Build",
                  outputArtifacts: ["build_output"],
                  owner: "AWS",
                  provider: "CodeBuild",
                  version: "1",
              }],
              name: "Build",
          },
          {
              actions: [{
                  category: "Deploy",
                  configuration: {
                    ClusterName: cluster.cluster.name,
                    ServiceName: service.service.name,
                    FileName: "imagedefinitions.json",
                    // DeploymentTimeout: "MyStack",
                  },
                  inputArtifacts: ["build_output"],
                  name: "Deploy",
                  owner: "AWS",
                  provider: "ECS",
                  version: "1",
              }],
              name: "Deploy",
          },
      ],
    });
    const codepipelinePolicy = new aws.iam.RolePolicy("codepipelinePolicy", {
      role: codepipelineRole.id,
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
              "${codepipelineBucket.arn}",
              "${codepipelineBucket.arn}/*"
            ]
          },
          {
            "Effect": "Allow",
            "Action": [
              "codebuild:BatchGetBuilds",
              "codebuild:StartBuild"
            ],
            "Resource": "*"
          }
        ]
      }
      `,
    });

    const webhookSecret = "super-secret-1234";
    const barWebhook = new aws.codepipeline.Webhook("barWebhook", {
      authentication: "GITHUB_HMAC",
      targetAction: "Source",
      targetPipeline: codepipeline.name,
      authenticationConfiguration: {
          secretToken: webhookSecret,
      },
      filters: [{
          jsonPath: `$.ref`,
          matchEquals: `refs/heads/${process.env.GITHUB_BRANCH}`,
      }],
    });

    return barWebhook;

}
