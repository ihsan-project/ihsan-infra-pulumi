"use strict";
const aws = require("@pulumi/aws");

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

exports.pushLambda = function(appName, role, gcmApp) {

    const lambda = new aws.lambda.CallbackFunction(`${appName}-push-lambda`, {
        environment: {
            variables: {
                'SNS_GCM_APP_ARN': gcmApp.id,
                'AWS_ACCESS_KEY_ID': process.env.AWS_ACCESS_KEY_ID,
                'AWS_SECRET_ACCESS_KEY': process.env.AWS_SECRET_ACCESS_KEY,
                'AWS_REGION': process.env.AWS_REGION
            }
        },
        role,
        callback: (event) => {
            const Uuid = require("node-uuid");
            const AWS = require('aws-sdk');

            const message = event.Records[0].body;
            const token = event.Records[0].messageAttributes.token.stringValue;
            const device = event.Records[0].messageAttributes.device.stringValue;
            const meta = {}
            const badge = 0

            console.log('push message', message);
            console.log('push token', token);
            console.log('device', device);

            // Set region
            AWS.config.update({
                region: process.env.AWS_REGION,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            });

            const sns = new AWS.SNS({ apiVersion: '2010-03-31' });

            if (device === 'android') {
                console.log('Begin GCM push');

                sns.createPlatformEndpoint({
                    PlatformApplicationArn: process.env.SNS_GCM_APP_ARN,
                    Token: token,
                }).promise().then((endpoint) => {
                    console.log('done 1: createPlatformEndpoint');

                    const topicName = Uuid.v4();
                    return sns.createTopic({
                        Name: topicName,
                    }).promise().then((topic) => {
                        console.log('done 2: createTopic');

                        return Promise.resolve({endpoint, topic})
                    });
                }).then((res) => {
                    console.log('done 2a: createTopic');

                    return sns.subscribe({
                        Protocol: 'application',
                        TopicArn: res.topic.TopicArn,
                        Endpoint: res.endpoint.EndpointArn
                    }).promise().then((subscription) => {
                        console.log('done 3: subscribe');

                        return Promise.resolve(topic)
                    });
                }).then((topic) => {
                    console.log('done 3a: subscribe');

                    return sns.publish({
                        MessageStructure: 'json',
                        Message: JSON.stringify({
                          default: message,
                          APNS: JSON.stringify({
                            aps: {
                              alert: message,
                              badge,
                              sound: 'default',
                            },
                            meta,
                            s: 'section',
                          }),
                          APNS_SANDBOX: JSON.stringify({
                            aps: {
                              alert: message,
                              badge,
                              sound: 'default',
                            },
                            meta,
                            s: 'section',
                          }),
                          GCM: JSON.stringify({
                            data: {
                              message,
                              meta,
                            },
                            notification: {
                              text: message,
                            },
                          }),
                        }),
                        TopicArn: topic.TopicArn,
                    }).promise().then((res) => {
                        console.log('done 4: publish');

                        return Promise.resolve(topic);
                    });
                }).then((topic) => {
                    console.log('done 4a: publish');

                    return sns.deleteTopic({
                        TopicArn: topic.TopicArn,
                    }).promise().then(() => {
                        console.log('Complete GCM push');
                    });
                }).catch((error) => {
                    console.log("Error:", error);
                });
            }
        },
    });

    return lambda;
}
