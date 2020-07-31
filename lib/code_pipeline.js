"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

exports.createPipeline = function(roles) {
    const {buildRole} = roles;

    // https://dev.to/danielrbradley/replacing-build-servers-with-pulumi-aws-28fm
    const buildProject = new aws.codebuild.Project('khatm-codeBuild', {
        serviceRole: buildRole.arn,
        source: {
          type: 'GITHUB',
          location: process.env.GITHUB_REPO_URL,
        },
        environment: {
          type: 'LINUX_CONTAINER',
          computeType: 'BUILD_GENERAL1_SMALL',
          image: 'aws/codebuild/standard:3.0',
        },
        artifacts: { type: 'NO_ARTIFACTS' },
    });

    new aws.codebuild.SourceCredential('github-token', {
      authType: 'PERSONAL_ACCESS_TOKEN',
      serverType: 'GITHUB',
      token: process.env.GITHUB_ACCESS_TOKEN,
    });

    new aws.codebuild.Webhook('build-setup-webhook', {
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