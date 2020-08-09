"use strict";
require('dotenv').config({ path: `${process.cwd()}/../.env` })

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const {createStaticSPASite} = require("./lib/static_site.js");
const {createECS} = require("./lib/ecs.js");
const {createCloudWatchDashboard} = require("./lib/cloudwatch.js");

const appName = process.env.APP_NAME || 'khatm';

const env = pulumi.getStack();
const foundation = new pulumi.StackReference(`mmislam101/khatm-foundation/${env}`);

// Reference the resources from the khatm-foundation stack
const dbInfo = foundation.getOutput("db");
const db = pulumi.output(aws.rds.Instance.get(dbInfo.name, dbInfo.id));
const vpcInfo = foundation.getOutput("vpc");
const vpc = pulumi.output(aws.ec2.Vpc.get(vpcInfo.name, vpcInfo.id));
const appSgInfo = foundation.getOutput("appSg");
const appSg = pulumi.output(aws.ec2.SecurityGroup.get(appSgInfo.name, appSgInfo.id));


const albTargetInfo = foundation.getOutput("albTarget")
const albTarget = pulumi.output(aws.alb.TargetGroup.get(albTargetInfo.name, albTargetInfo.id));
const albListenerInfo = foundation.getOutput("albListener")
const albListener = pulumi.output(aws.alb.Listener.get(albListenerInfo.name, albListenerInfo.id));

const environment = { vpc, securityGroups: { appSg }, alb: { albTarget, albListener } }

const {service, cluster} = createECS(appName, environment, db);
// createCloudWatchDashboard(appName, {
//     db,
//     ecs: {service, cluster}
// });

// TODO: Disable this for now. Causing problems when updating
// createStaticSPASite("admin.khatmapp.com");

// exports.albTarget = albTarget;
// exports.albListener = albListener;
exports.dashboardUrl =
    `https://${aws.config.region}.console.aws.amazon.com/cloudwatch/home?` +
        `region=${aws.config.region}#dashboards:name=${appName}`;