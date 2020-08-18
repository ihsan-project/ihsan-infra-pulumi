"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const github = require("@pulumi/github");
const {
  createBuildRole
} = require("./roles.js");

exports.createBuildPhase = function(appName) {
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
                {name: 'CONTAINER_NAME', value: 'web_container'}
            ]
        },
        artifacts: { type: 'NO_ARTIFACTS' },
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

    return buildProject;
  //   buildProject    : {
  //     arn               : "arn:aws:codebuild:us-east-1:952442618488:project/khatm-staging-cb-8378220"
  //     artifacts         : {
  //         encryptionDisabled  : false
  //         overrideArtifactName: false
  //         type                : "NO_ARTIFACTS"
  //     }
  //     badgeEnabled      : false
  //     buildTimeout      : 60
  //     cache             : {
  //         type    : "NO_CACHE"
  //     }
  //     encryptionKey     : "arn:aws:kms:us-east-1:952442618488:alias/aws/s3"
  //     environment       : {
  //         computeType             : "BUILD_GENERAL1_SMALL"
  //         environmentVariables    : [
  //             [0]: {
  //                 name : "REPOSITORY_URI"
  //                 type : "PLAINTEXT"
  //                 value: "952442618488.dkr.ecr.us-east-1.amazonaws.com/khatm"
  //             }
  //             [1]: {
  //                 name : "CONTAINER_NAME"
  //                 type : "PLAINTEXT"
  //                 value: "web_container"
  //             }
  //         ]
  //         image                   : "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
  //         imagePullCredentialsType: "CODEBUILD"
  //         privilegedMode          : true
  //         type                    : "LINUX_CONTAINER"
  //     }
  //     id                : "arn:aws:codebuild:us-east-1:952442618488:project/khatm-staging-cb-8378220"
  //     logsConfig        : {
  //         cloudwatchLogs: {
  //             status    : "ENABLED"
  //         }
  //         s3Logs        : {
  //             encryptionDisabled: false
  //             status            : "DISABLED"
  //         }
  //     }
  //     name              : "khatm-staging-cb-8378220"
  //     queuedTimeout     : 480
  //     serviceRole       : "arn:aws:iam::952442618488:role/khatm-staging-role-cb-8e3f600"
  //     source            : {
  //         gitCloneDepth      : 0
  //         insecureSsl        : false
  //         location           : "https://github.com/khatm-org/khatm-api.git"
  //         reportBuildStatus  : false
  //         type               : "GITHUB"
  //     }
  //     urn               : "urn:pulumi:staging::khatm::aws:codebuild/project:Project::khatm-staging-cb"
  // }

}


exports.createPipeline = function(appName, buildPhase) {
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
	const s3kmskey = new aws.kms.Key("key", {});
	const alias = new aws.kms.Alias("alias/test", {targetKeyId: s3kmskey.keyId});
  const codepipeline = new aws.codepipeline.Pipeline("codepipeline", {
    artifactStore: {
			location: codepipelineBucket.bucket,
			type: "S3",
			encryptionKey: {
					id: s3kmskey.keyId,//s3kmskey.then(s3kmskey => s3kmskey.arn),
					type: "KMS",
			},
		},
    roleArn: codepipelineRole.arn,
    stages: [
        {
            actions: [{
                category: "Source",
                configuration: {
										OAuthToken: process.env.GITHUB_ACCESS_TOKEN,
                    Branch: process.env.GITHUB_BRANCH,
                    Owner: "khatm-org",
                    Repo: "khatm-api",
                },
                name: "Source",
                outputArtifacts: ["source_output"],
                owner: "ThirdParty",
                provider: "GitHub",
                version: "1",
            }],
            name: "Source",
        },
        {
            actions: [{
                category: "Build",
                configuration: {
                    ProjectName: buildPhase.name,
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
        // {
        //     actions: [{
        //         category: "Deploy",
        //         configuration: {
        //             ActionMode: "REPLACE_ON_FAILURE",
        //             Capabilities: "CAPABILITY_AUTO_EXPAND,CAPABILITY_IAM",
        //             OutputFileName: "CreateStackOutput.json",
        //             StackName: "MyStack",
        //             TemplatePath: "build_output::sam-templated.yaml",
        //         },
        //         inputArtifacts: ["build_output"],
        //         name: "Deploy",
        //         owner: "AWS",
        //         provider: "CloudFormation",
        //         version: "1",
        //     }],
        //     name: "Deploy",
        // },
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

	const webhookSecret = process.env.GITHUB_ACCESS_TOKEN;
	const barWebhook = new aws.codepipeline.Webhook("bar", {
			authentication: "GITHUB_HMAC",
			authenticationConfiguration: {
					secretToken: webhookSecret,
			},
			filters: [{
					jsonPath: "$.ref",
					matchEquals: `refs/heads/${process.env.GITHUB_BRANCH}`,
			}],
			targetAction: "Source",
			targetPipeline: codepipeline.name,
	});
	// Wire the CodePipeline webhook into a GitHub repository.
	const barRepositoryWebhook = new github.RepositoryWebhook("bar", {
			configuration: {
					contentType: "json",
					insecureSsl: true,
					secret: webhookSecret,
					url: barWebhook.url,
			},
			events: ["push"],
			repository: process.env.GITHUB_REPO_URL,
	});

	// new aws.codebuild.SourceCredential(`${appName}-cb-src-crd`, {
	// 	authType: 'PERSONAL_ACCESS_TOKEN',
	// 	serverType: 'GITHUB',
	// 	token: process.env.GITHUB_ACCESS_TOKEN,
	// });

	// new aws.codebuild.Webhook(`${appName}-cb-src-hook`, {
	// 		projectName: buildProject.name,
	// 		filterGroups: [
	// 			{
	// 				filters: [
	// 					{
	// 						type: 'EVENT',
	// 						pattern: 'PUSH',
	// 					},
	// 					{
	// 						type: 'HEAD_REF',
	// 						pattern: `refs/heads/${process.env.GITHUB_BRANCH}`,
	// 					},
	// 				],
	// 			},
	// 		],
	// });
}
