"use strict";
require('dotenv').config({ path: `${process.cwd()}/../.env` })

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const {recordCNAME} = require("./lib/dns.js");
const {createEnvironment} = require("./lib/vpc.js");

const appName = process.env.APP_NAME || 'khatm';

// Setup Foundations
const environment = createEnvironment(appName);
recordCNAME("api", environment.alb.albListener.endpoint.hostname); // Create api.hostname.com CNAME entry in DNS
// const db = createRDS(appName, environment);
// createPipeline(appName);


// exports.dashboardUrl =
//     `https://${aws.config.region}.console.aws.amazon.com/cloudwatch/home?` +
//         `region=${aws.config.region}#dashboards:name=${appName}`;