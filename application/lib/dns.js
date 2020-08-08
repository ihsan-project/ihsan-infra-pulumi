"use strict";
const cloudflare = require("@pulumi/cloudflare");

exports.recordCNAME = function(hostName, targetEndpoint) {
    const record = new cloudflare.Record(`${hostName}-record`, {
        name: hostName,
        type: "CNAME",
        value: targetEndpoint,
        zoneId: process.env.CLOUDFLARE_ZONE_ID,
        proxied: true
    });
}