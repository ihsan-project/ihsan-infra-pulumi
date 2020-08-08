"use strict";
const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const {createStaticSPASite} = require("./lib/static_site.js");
const {recordCNAME} = require("./lib/dns.js");
const {createECS} = require("./lib/ecs.js");
const {createVPC} = require("./lib/vpc.js");
const {createRDS} = require("./lib/rds.js");
const {createRoles} = require("./lib/roles.js");
const {createPipeline} = require("./lib/code_pipeline.js");
const {createCloudWatchDashboard} = require("./lib/cloudwatch.js");

const appName = process.env.APP_NAME || 'khatm';

// createStaticSPASite("admin.khatmapp.com"); // TODO: Disable this for now. Causing problems when updating
const security = createVPC(appName);
const roles = createRoles(appName);
const db = createRDS(appName, security);
const {listener, service, cluster} = createECS(appName, security, db, roles);

// Create api.hostname.com CNAME entry in DNS
recordCNAME("api", listener.endpoint.hostname);

const services = {
    db,
    ecs: {service, cluster}
}
createCloudWatchDashboard(appName, services);

createPipeline(appName, roles);

exports.lbURL = pulumi.interpolate `http://${listener.endpoint.hostname}/`;
exports.dashboardUrl =
    `https://${aws.config.region}.console.aws.amazon.com/cloudwatch/home?` +
        `region=${aws.config.region}#dashboards:name=${appName}`;