"use strict";
const aws = require("@pulumi/aws");
const {
    dbName
} = require("./secrets.js");

exports.createSQS = function(appName, func) {

    const queue = new aws.sqs.Queue(`${appName}-sqs`, {
        visibilityTimeoutSeconds: 180
    });

    queue.onEvent(`${appName}-event`, func);

    return queue;
}