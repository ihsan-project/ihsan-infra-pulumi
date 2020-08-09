"use strict";
require('dotenv').config({ path: `${process.cwd()}/../.env` })

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const {recordCNAME} = require("./lib/dns.js");
const {createEnvironment} = require("./lib/vpc.js");
const {createRDS} = require("./lib/rds.js");
const {createPipeline} = require("./lib/code_pipeline.js");

const appName = process.env.APP_NAME || 'khatm';

const environment = createEnvironment(appName);
recordCNAME("api", environment.lb.albListener.endpoint.hostname); // Create api.hostname.com CNAME entry in DNS
const db = createRDS(appName, environment);
createPipeline(appName);

// console.log('albTarget', environment.lb.alb.loadBalancer)

exports.vpc = { name: environment.vpc.arn, id: environment.vpc.id };
exports.db = { name: db.arn, id: db.id };
exports.appSg = { name: environment.securityGroups.appSg.arn, id: environment.securityGroups.appSg.id };
exports.albTarget = { name: environment.lb.albTarget.targetGroup.arn, id: environment.lb.albTarget.targetGroup.id };
exports.albListener = { name: environment.lb.albListener.listener.arn, id: environment.lb.albListener.listener.id };
exports.alb = { name: environment.lb.alb.loadBalancer.arn, id: environment.lb.alb.loadBalancer.id };