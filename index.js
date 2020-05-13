"use strict";
const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const {createStaticSPASite} = require("./lib/static_site.js");
const {recordCNAME} = require("./lib/dns.js");
const {createECS} = require("./lib/ecs.js");
const {createVPC} = require("./lib/vpc.js");
const {createCloudWatchDashboard} = require("./lib/cloudwatch.js");


// createStaticSPASite("admin.khatmapp.com"); // TODO: Disable this for now. Causing problems when updating
const vpc = createVPC("khatm-app");
const {listener, service, cluster} = createECS(vpc);
const dashboardName = "khatm-api";
recordCNAME("api", listener.endpoint.hostname);

const services = {
    ecs: {service, cluster}
}
createCloudWatchDashboard(dashboardName, services);

exports.frontendURL = pulumi.interpolate `http://${listener.endpoint.hostname}/`;
exports.dashboardUrl =
    `https://${aws.config.region}.console.aws.amazon.com/cloudwatch/home?` +
        `region=${aws.config.region}#dashboards:name=${dashboardName}`;