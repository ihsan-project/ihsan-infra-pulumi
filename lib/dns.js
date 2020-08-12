"use strict";
const cloudflare = require("@pulumi/cloudflare");

exports.recordCNAME = function(appName, hostName, targetEndpoint) {
    const record = new cloudflare.Record(`${appName}-record`, {
        name: hostName,
        type: "CNAME",
        value: targetEndpoint,
        zoneId: process.env.CLOUDFLARE_ZONE_ID,
        proxied: true
    });
}