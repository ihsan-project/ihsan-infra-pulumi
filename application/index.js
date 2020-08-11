"use strict";
require('dotenv').config({ path: `${process.cwd()}/../.env` })

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const awsx = require("@pulumi/awsx");
const {createStaticSPASite} = require("./lib/static_site.js");
const {createECS} = require("./lib/ecs.js");
const {createCloudWatchDashboard} = require("./lib/cloudwatch.js");
const {recreateEnvironment, createEnvironment} = require("./lib/vpc.js");
const {recordCNAME} = require("./lib/dns.js");
const {recreateRDS} = require("./lib/rds.js");

const appName = process.env.APP_NAME || 'khatm';

// Reference the resources from the khatm-foundation stack

// ATTEMPT 1: Recreate environment by passing in existing resource in Args
//            Get the registered twice (read and read) error

const env = pulumi.getStack();
const stack = new pulumi.StackReference(`mmislam101/khatm-foundation/${env}`);

const environment = recreateEnvironment(appName, stack);

// ATTEMPT 1 END **************************

// ATTEMPT 2: Import the environment using the id
//            It creates another set entirely

// const env = pulumi.getStack();
// const foundation = new pulumi.StackReference(`mmislam101/khatm-foundation/${env}`);
// const vpcInfo = foundation.getOutput("vpc");
// const appSgInfo = foundation.getOutput("appSg");
// const lbSgInfo = foundation.getOutput("lbSg");
// const dataSgInfo = foundation.getOutput("dataSg");

// const environment = createEnvironment(appName, {
//     vpcId: vpcInfo.id,
//     appSgId: appSgInfo.id,
//     lbSgId: lbSgInfo.id,
//     dataSg: dataSgInfo.id
// });

// ATTEMPT 2 END **************************

// Reference the resources from the khatm-foundation stack
const dbInfo = stack.getOutput("db");
const db = pulumi.output(aws.rds.Instance.get(dbInfo.name, dbInfo.id));

const {service, cluster, albListener} = createECS(appName, environment, db);
createCloudWatchDashboard(appName, {
    db,
    ecs: {service, cluster}
});

recordCNAME("api", albListener.endpoint.hostname); // Create api.hostname.com CNAME entry in DNS

// TODO: Disable this for now. Causing problems when updating
// createStaticSPASite("admin.khatmapp.com");

exports.dashboardUrl =
    `https://${aws.config.region}.console.aws.amazon.com/cloudwatch/home?` +
        `region=${aws.config.region}#dashboards:name=${appName}`;