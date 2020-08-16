"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

exports.googleSSO = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: `${process.env.APP_NAME}/${pulumi.getStack()}/google_sso_client_id`, }));
exports.apiKey = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: `${process.env.APP_NAME}/${pulumi.getStack()}/api_key`, }));
exports.dbName = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: `${process.env.APP_NAME}/${pulumi.getStack()}/db/name`, }));
exports.dbUser = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: `${process.env.APP_NAME}/${pulumi.getStack()}/db/user`, }));
exports.dbPassword = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: `${process.env.APP_NAME}/${pulumi.getStack()}/db/password`, }));
