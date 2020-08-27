"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const {
  createBuildRole,
  createPipelineRole
} = require("./roles.js");

exports.createPipeline = function(appName, containerName, service, cluster, pipelineBucket) {
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

    // https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/codepipeline/#Pipeline
    const pipelineRole = createPipelineRole(appName, pipelineBucket.arn)
    const codepipeline = new aws.codepipeline.Pipeline(`${appName}-pipe`, {
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
                    Repo: process.env.GITHUB_REPOSITORY,
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

    const webhook = new aws.codepipeline.Webhook(`${appName}-wh`, {
      authentication: "GITHUB_HMAC",
      targetAction: "Source",
      targetPipeline: codepipeline.name,
      authenticationConfiguration: {
          secretToken: process.env.GITHUB_WEBHOOK_SECRET,
      },
      filters: [{
          jsonPath: `$.ref`,
          matchEquals: `refs/heads/${process.env.GITHUB_BRANCH}`,
      }],
    });

    return webhook;

}
