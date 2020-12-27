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

exports.pushLambda = new aws.lambda.CallbackFunction('push-lambda', {
    // memorySize: 256 /*MB*/,
    callback: (event) => {
        const message = event.Records[0].body;
        const token = event.Records[0].messageAttributes.token.stringValue;
        const device = event.Records[0].messageAttributes.device.stringValue;

        console.log('push message', message);
        console.log('push token', token);
        console.log('device', device);

        if (device === 'android') {
            console.log('TODO: Send GCM Push');

            // TODO: Need permission to push to SNS
            // Sample typescript code on using AWS SDK within a lambda: https://github.com/pulumi/examples/blob/master/aws-ts-s3-lambda-copyzip/index.ts
        }
    },
});
