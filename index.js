"use strict";
require('dotenv').config({ path: `${process.cwd()}/.env` }) // Prepare the have multiple projects share single .env

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const {createStaticSPASite} = require("./lib/static_site.js");
const {recordCNAME, setSSLPageRule} = require("./lib/dns.js");
const {createECS} = require("./lib/ecs.js");
const {createEnvironment} = require("./lib/vpc.js");
const {createRDS} = require("./lib/rds.js");
const {createApiPipeline, createAndroidPipeline} = require("./lib/code_pipeline.js");
const {createCloudWatchDashboard} = require("./lib/cloudwatch.js");

const appName = `${process.env.APP_NAME || 'khatm'}-${pulumi.getStack()}`;
const containerName = `${appName}-container`;

// Setup Foundations
// const environment = createEnvironment(appName);
// const db = createRDS(appName, environment);
// const pipelineBucket = new aws.s3.Bucket(`${appName}-pipe-bucket`, {acl: "private"});


const queue = new aws.sqs.Queue('queue', {
    visibilityTimeoutSeconds: 180
});

queue.onEvent('queue-lambda', (event) => {
    /* event: {
          Records: [
                {
                messageId: 'ad7492b2-4bfa-45ed-b813-a5c54d1bf3e7',
                receiptHandle: 'AQEB8CcQYpA8BHEuARR28W0gD9wqyN4ILjZmkmY972PUShFH6QJ+3d3R/GyLyLmLAfmZKEYSFU42MTIp8AN4Ea4L3xrm+/3wKUd4aC9lOOB+Wvct4gdLDoP+/IKpcvE38u665O/uM7CzkqcBhpVKDK27Ic+qr8Y5YXenXo7P06fg1qf9k+ch/Qd8ZaZU664Z3VugVINKMjCiuLbMTEBqCSmu3OioUUcFFwTbqzJf/abPDQXw1h3UP+7EQR9eatWUDV/7iTdBoxx4hKoIbkaIY/QETb/cAiZB0RGsbaiExWTGo1WuMeR9dWo7CvH/L1rEtkzkbvCdBbr1U5hHw/kzgj+mOKmp+wP516qHfmMuwiiwR1gieDnzKznmJUXrEYL/a2YX',
                body: 'test03',
                attributes: {
                    ApproximateReceiveCount: '1',
                    SentTimestamp: '1609020566538',
                    SenderId: 'AIDA53QQBAJ4JN6KN7LPW',
                    ApproximateFirstReceiveTimestamp: '1609020566545'
                },
                messageAttributes: {
                    token: {
                        stringValue: 'test-token',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    }
                },
                md5OfMessageAttributes: '69e56387962e80f6d4751c1017e34ba0',
                md5OfBody: '0a291f120e0dc2e51ad32a9303d50cac',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:952442618488:queue-8566975',
                awsRegion: 'us-east-1'
                }
            ]
        }
    }
    */

    const message = event.Records[0].body;
    const token = event.Records[0].messageAttributes.token.stringValue;
    const device = event.Records[0].messageAttributes.device.stringValue;

    // TODO: Need to get a value from ASM. Which will need permissions for this lambda function

    console.log('push message', message);
    console.log('push token', token);
    console.log('device', device);

    if (device === 'android') {
        console.log('TODO: Send GCM Push');
    }
});

exports.sqsURL = queue.id;

// if (process.env.PULUMI_APPLICATION == 1) {
//     // Setup the web server on ECS, pointed to a SQL db
//     const {service, cluster, albListener} = createECS(appName, environment, db, containerName);
//     createCloudWatchDashboard(appName, {
//         db,
//         ecs: {service, cluster}
//     });

//     // These will set up the HTTPS url to the server for you to securely use for client apps
//     const subdomain = `${pulumi.getStack()}-api`;
//     const record = recordCNAME(appName, subdomain, albListener.endpoint.hostname);

//     // Cloudflare free account comes with limited page rules
//     // But by using wildcards, we can reuse the same rule for multiple environments
//     // TODO: When using Pulumi for multiple environments (staging and production),
//     //       this need to run for only one of the environments
//     setSSLPageRule(appName, `https://*api.${process.env.DOMAIN}/*`); // Be careful, free accounts only allow 3 page rules
//     // Make Cloudflare SSL/TLS settings is set to Flexible mode
//     // The reason to not use Strict mode is that it will interfere with using S3 for SPA client sites
//     // Hence the page rule to target Strict mode for web servers

//     // TODO: Disable this for now. Causing problems when updating
//     // createStaticSPASite(`admin.${process.env.DOMAIN}`);

//     const apiBaseURL = pulumi.interpolate `https://${record.hostname}/`;

//     const apiCIWebhook = createApiPipeline(appName, containerName, service, cluster, pipelineBucket);
//     let androidCIWebhook = {url: 'Android CI not setup'};
//     if (process.env.GITHUB_ANDROID_REPOSITORY) {
//         androidCIWebhook = createAndroidPipeline(appName, apiBaseURL, pipelineBucket);
//     }

//     // Output helpful URLS you should bookmark
//     exports.apiBaseURL = apiBaseURL;
//     exports.metricsDashboard = `https://${aws.config.region}.console.aws.amazon.com/cloudwatch/home?` +
//         `region=${aws.config.region}#dashboards:name=${appName}`;

//     exports.gitWebhookAPI = apiCIWebhook.url; // In Github add this to the API repository's webhooks
//     exports.gitWebhookAndroid = androidCIWebhook.url; // In Github add this to the API repository's webhooks
// }