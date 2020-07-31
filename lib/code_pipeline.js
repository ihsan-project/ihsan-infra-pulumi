"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

exports.createPipeline = function(roles) {
    const {buildRole} = roles;

    const codeCommit = new aws.codecommit.Repository("khatm-codeCommit", {
        description: "This is the Repository for your container code",
        repositoryName: "KhatmRepository",
    });

    // https://www.pulumi.com/docs/reference/pkg/aws/codebuild/sourcecredential/
    // const example = new aws.codebuild.SourceCredential("khatm-sourceCredential", {
    //     authType: "PERSONAL_ACCESS_TOKEN",
    //     serverType: "CODECOMMIT",
    //     token: "example",
    // });

    // https://dev.to/danielrbradley/replacing-build-servers-with-pulumi-aws-28fm
    const buildProject = new aws.codebuild.Project('khatm-codeBuild', {
        serviceRole: buildRole.arn,
        source: {
          type: 'CODECOMMIT',
          location: codeCommit.cloneUrlHttp,
        },
        environment: {
          type: 'LINUX_CONTAINER',
          computeType: 'BUILD_GENERAL1_SMALL',
          image: 'aws/codebuild/standard:3.0',
        },
        artifacts: { type: 'NO_ARTIFACTS' },
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
                pattern: 'refs/heads/master',
              },
            ],
          },
        ],
    });
}