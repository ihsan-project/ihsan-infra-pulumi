"use strict";
const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const mime = require("mime");
const cloudflare = require("@pulumi/cloudflare");

// Create an S3 Bucket Policy to allow public read of all objects in bucket
// This reusable function can be pulled out into its own module
function publicReadPolicyForBucket(bucketName) {
    return JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
        Effect: "Allow",
        Principal: "*",
        Action: [
            "s3:GetObject"
        ],
        Resource: [
            `arn:aws:s3:::${bucketName}/*` // policy refers to bucket name explicitly
        ]
        }]
    })
}

exports.createStaticSPASite = function(domainName) {
    // Create an S3 bucket
    let siteBucket = new aws.s3.Bucket(domainName, {
        bucket: domainName, // Disable pulumi unique autonaming or else DNS doesn't work for static S3 buckets
        website: {
        indexDocument: "index.html",
        errorDocument: "index.html", // Required for SPA
        },
    });

    // Set the access policy for the bucket so all objects are readable
    let bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
        bucket: siteBucket.bucket,
        policy: siteBucket.bucket.apply(publicReadPolicyForBucket)
    });

    const record = new cloudflare.Record("website-record", {
        name: domainName,
        type: "CNAME",
        value: siteBucket.websiteEndpoint,
        zoneId: process.env.CLOUDFLARE_ZONE_ID,
        proxied: true
    });

    let siteDir = "www"; // directory for content files

    // For each file in the directory, create an S3 object stored in `siteBucket`
    for (let item of require("fs").readdirSync(siteDir)) {
        let filePath = require("path").join(siteDir, item);
        let object = new aws.s3.BucketObject(item, {
        bucket: siteBucket,
        source: new pulumi.asset.FileAsset(filePath),     // use FileAsset to point to a file
        contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
        });
    }
}