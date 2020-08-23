"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const {
  createBuildRole
} = require("./roles.js");

exports.createPipeline = function(appName, containerName) {
    const buildRole = createBuildRole(appName);

    // https://dev.to/danielrbradley/replacing-build-servers-with-pulumi-aws-28fm
    const buildProject = new aws.codebuild.Project(`${appName}-cb`, {
        serviceRole: buildRole.arn,
        source: {
          type: 'GITHUB',
          location: process.env.GITHUB_REPO_URL,
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
        artifacts: { type: 'NO_ARTIFACTS' },
    });

    new aws.codebuild.SourceCredential(`${appName}-cb-src-crd`, {
      authType: 'PERSONAL_ACCESS_TOKEN',
      serverType: 'GITHUB',
      token: process.env.GITHUB_ACCESS_TOKEN,
    });

    new aws.codebuild.Webhook(`${appName}-cb-src-hook`, {
        projectName: buildProject.name,
        filterGroups: [
          {
            filters: [
              {
                type: 'EVENT',
                pattern: 'PUSH',
              },
              {
                type: 'HEAD_REF',
                pattern: `refs/heads/${process.env.GITHUB_BRANCH}`,
              },
            ],
          },
        ],
    });
}
