"use strict";
const aws = require("@pulumi/aws");
const {
    gcmApiKey
} = require("./secrets.js");

exports.createGCMApplication = function(appName, func) {

    const gcmApplication = new aws.sns.PlatformApplication(`${appName}-gcm-sns`, {
        platform: "GCM",
        platformCredential: gcmApiKey.secretString,
    });

    return gcmApplication;
}