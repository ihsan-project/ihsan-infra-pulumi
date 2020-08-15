"use strict";
const cloudflare = require("@pulumi/cloudflare");

exports.recordCNAME = function(appName, subdomain, targetEndpoint) {
    const record = new cloudflare.Record(`${appName}-record`, {
        name: subdomain,
        type: "CNAME",
        value: targetEndpoint,
        zoneId: process.env.CLOUDFLARE_ZONE_ID,
        proxied: true
    });

    return record;
}

exports.setSSLPageRule = function(appName, url) {
    new cloudflare.PageRule(`${appName}-rule`, {
        zoneId: process.env.CLOUDFLARE_ZONE_ID,
        target: url,
        priority: 1,
        actions: {
            ssl: "strict",
        },
    });
}