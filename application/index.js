"use strict";
require('dotenv').config({ path: `${process.cwd()}/../.env` }) // Prepare the have multiple projects share single .env

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const {createStaticSPASite} = require("./lib/static_site.js");
const {recordCNAME} = require("./lib/dns.js");
const {createECS} = require("./lib/ecs.js");
const {createEnvironment} = require("./lib/vpc.js");
const {createRDS} = require("./lib/rds.js");
const {createPipeline} = require("./lib/code_pipeline.js");
const {createCloudWatchDashboard} = require("./lib/cloudwatch.js");

const appName = process.env.APP_NAME || 'khatm';

// Setup Foundations
const environment = createEnvironment(appName);
// recordCNAME("api", environment.alb.albListener.endpoint.hostname); // Create api.hostname.com CNAME entry in DNS
// const db = createRDS(appName, environment);
// createPipeline(appName);

// TODO: Dependencies cause the Foundations to be setup before the following can be setup
//       Sure we can use dependencies, but we need to seperate these concerns anways into two different pulumi apps:
//       https://github.com/khatm-org/khatm-infrastructure/issues/27

// Setup Apps
// const {service, cluster} = createECS(appName, environment, db);
// createCloudWatchDashboard(appName, {
//     db,
//     ecs: {service, cluster}
// });


// TODO: Disable this for now. Causing problems when updating
// createStaticSPASite("admin.khatmapp.com");

exports.lbURL = pulumi.interpolate `http://${environment.alb.albListener.endpoint.hostname}/`;
exports.dashboardUrl =
    `https://${aws.config.region}.console.aws.amazon.com/cloudwatch/home?` +
        `region=${aws.config.region}#dashboards:name=${appName}`;