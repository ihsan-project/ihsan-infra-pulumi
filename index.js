"use strict";
const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const {createStaticSPASite} = require("./lib/static_site.js");
const {recordCNAME} = require("./lib/dns.js");
const {createECS} = require("./lib/ecs.js");
const {createVPC} = require("./lib/vpc.js");
const {createRDS} = require("./lib/rds.js");
const {createCloudWatchDashboard} = require("./lib/cloudwatch.js");


// createStaticSPASite("admin.khatmapp.com"); // TODO: Disable this for now. Causing problems when updating
const security = createVPC("khatm-app");
createRDS(security);
const {listener, service, cluster} = createECS(security);
recordCNAME("api", listener.endpoint.hostname);

const services = {
    ecs: {service, cluster}
}
const dashboardName = "khatm-api";
createCloudWatchDashboard(dashboardName, services);

exports.frontendURL = pulumi.interpolate `http://${listener.endpoint.hostname}/`;
exports.dashboardUrl =
    `https://${aws.config.region}.console.aws.amazon.com/cloudwatch/home?` +
        `region=${aws.config.region}#dashboards:name=${dashboardName}`;