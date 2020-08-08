"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

exports.googleSSO = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: "khatm/production/google_sso_client_id", }));
exports.apiKey = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: "khatm/production/api_key", }));
exports.dbName = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: "khatm/production/db/name", }));
exports.dbUser = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: "khatm/production/db/user", }));
exports.dbPassword = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: "khatm/production/db/password", }));