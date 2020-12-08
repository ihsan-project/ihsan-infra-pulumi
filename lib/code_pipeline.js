"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const {
  createAPIBuildRole,
  createApiPipelineRole,
  createAndroidBuildRole,
  createAndroidPipelineRole
} = require("./roles.js");
const {
  apiKey,
} = require("./secrets.js");

exports.createApiPipeline = function(appName, containerName, service, cluster, pipelineBucket) {
    const buildRole = createAPIBuildRole(appName);

    // https://dev.to/danielrbradley/replacing-build-servers-with-pulumi-aws-28fm
    const buildProject = new aws.codebuild.Project(`${appName}-api-cb`, {
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

    // https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/codepipeline/#Pipeline
    const pipelineRole = createApiPipelineRole(appName, pipelineBucket.arn)
    const codepipeline = new aws.codepipeline.Pipeline(`${appName}-api-pipe`, {
      artifactStore: {
        location: pipelineBucket.bucket,
        type: "S3",
      },
      roleArn: pipelineRole.arn,
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
                    Owner: process.env.GITHUB_OWNER,
                    Repo: process.env.GITHUB_API_REPOSITORY,
                    Branch: process.env.GITHUB_API_BRANCH,
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

    const webhook = new aws.codepipeline.Webhook(`${appName}-api-wh`, {
      authentication: "GITHUB_HMAC",
      targetAction: "Source",
      targetPipeline: codepipeline.name,
      authenticationConfiguration: {
          secretToken: process.env.GITHUB_WEBHOOK_SECRET,
      },
      filters: [{
          jsonPath: `$.ref`,
          matchEquals: `refs/heads/${process.env.GITHUB_API_BRANCH}`,
      }],
    });

    return webhook;
}

exports.createAndroidPipeline = function(appName, apiBaseURL, pipelineBucket) {
  const buildRole = createAndroidBuildRole(appName);

  const buildProject = new aws.codebuild.Project(`${appName}-droid-cb`, {
      serviceRole: buildRole.arn,
      source: {
        type: 'CODEPIPELINE',
      },
      environment: {
        type: 'LINUX_CONTAINER',
        computeType: 'BUILD_GENERAL1_SMALL',
        image: 'mingc/android-build-box:1.12.0',
        privilegedMode: true,
        environmentVariables: [
              {name: 'KEYSTORE_PASSWORD', value: process.env.ANDROID_KEYSTORE_PASSWORD},
              {name: 'KEY_PASSWORD', value: process.env.ANDROID_KEY_PASSWORD},
              {name: 'KEY_ALIAS', value: process.env.ANDROID_KEY_ALIAS},
              {name: 'AWS_SECRET_ACCESS_KEY', value: process.env.BUILD_AWS_SECRET_ACCESS_KEY},
              {name: 'AWS_ACCESS_KEY_ID', value: process.env.BUILD_AWS_ACCESS_KEY_ID},
              {name: 'AWS_CERT_BUCKET', value: process.env.BUILD_AWS_CERT_BUCKET},
              {name: 'AWS_BUCKET_REGION', value: process.env.BUILD_AWS_BUCKET_REGION},
              {name: 'API_URL', value: apiBaseURL},
              {name: 'API_KEY', value: apiKey.secretString}
          ]
      },
      artifacts: { type: 'CODEPIPELINE' },
  });

  const pipelineRole = createAndroidPipelineRole(appName, pipelineBucket.arn)
  const codepipeline = new aws.codepipeline.Pipeline(`${appName}-droid-pipe`, {
    artifactStore: {
      location: pipelineBucket.bucket,
      type: "S3",
    },
    roleArn: pipelineRole.arn,
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
                  Owner: process.env.GITHUB_OWNER,
                  Repo: process.env.GITHUB_ANDROID_REPOSITORY,
                  Branch: process.env.GITHUB_ANDROID_BRANCH,
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
        }
    ],
  });

  const webhook = new aws.codepipeline.Webhook(`${appName}-droid-wh`, {
    authentication: "GITHUB_HMAC",
    targetAction: "Source",
    targetPipeline: codepipeline.name,
    authenticationConfiguration: {
        secretToken: process.env.GITHUB_WEBHOOK_SECRET,
    },
    filters: [{
        jsonPath: `$.ref`,
        matchEquals: `refs/heads/${process.env.GITHUB_ANDROID_BRANCH}`,
    }],
  });

  return webhook;
}
