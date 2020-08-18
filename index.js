"use strict";
require('dotenv').config({ path: `${process.cwd()}/.env` }) // Prepare the have multiple projects share single .env

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const {createStaticSPASite} = require("./lib/static_site.js");
const {recordCNAME, setSSLPageRule} = require("./lib/dns.js");
const {createECS} = require("./lib/ecs.js");
const {createEnvironment} = require("./lib/vpc.js");
const {createRDS} = require("./lib/rds.js");
const {createBuildPhase, createPipeline} = require("./lib/code_pipeline.js");
const {createCloudWatchDashboard} = require("./lib/cloudwatch.js");

const appName = `${process.env.APP_NAME || 'khatm'}-${pulumi.getStack()}`;

// Setup Foundations
const environment = createEnvironment(appName);
const db = createRDS(appName, environment);
const buildProject = createBuildPhase(appName);
createPipeline(appName, buildProject);

if (process.env.PULUMI_APPLICATION == 1) {
    // Setup the web server on ECS, pointed to a SQL db
    const {service, cluster, albListener} = createECS(appName, environment, db);
    createCloudWatchDashboard(appName, {
        db,
        ecs: {service, cluster}
    });

    // These will set up the HTTPS url to the server for you to securely use for client apps
    const subdomain = `${pulumi.getStack()}-api`;
    const record = recordCNAME(appName, subdomain, albListener.endpoint.hostname);

    // Cloudflare free account comes with limited page rules
    // But by using wildcards, we can reuse the same rule for multiple environments
    // TODO: When using Pulumi for multiple environments (staging and production),
    //       this need to run for only one of the environments
    setSSLPageRule(appName, `https://*api.${process.env.DOMAIN}/*`); // Be careful, free accounts only allow 3 page rules
    // Make Cloudflare SSL/TLS settings is set to Flexible mode
    // The reason to not use Strict mode is that it will interfere with using S3 for SPA client sites
    // Hence the page rule to target Strict mode for web servers

    // TODO: Disable this for now. Causing problems when updating
    // createStaticSPASite(`admin.${process.env.DOMAIN}`);

    // Output helpful URLS you should bookmark
    exports.apiBaseURL = pulumi.interpolate `https://${record.hostname}/`;
    exports.metricsDashboard = `https://${aws.config.region}.console.aws.amazon.com/cloudwatch/home?` +
        `region=${aws.config.region}#dashboards:name=${appName}`;
}
