"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

exports.createRDS = function(security) {
    const {vpc, securityGroups} = security;
    const {appSg} = securityGroups;

    const dbSubnets = new aws.rds.SubnetGroup("dbsubnets", {
        subnetIds: vpc.privateSubnetIds,
    })

    const secretName = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: "khatm/production/db/name", }));
    const secretUser = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: "khatm/production/db/user", }));
    const secretPassword = pulumi.output(aws.secretsmanager.getSecretVersion({ secretId: "khatm/production/db/password", }));

    const db = new aws.rds.Instance("khatm-db", {
        engine: "postgres",

        instanceClass: "db.t3.micro",
        allocatedStorage: 20, // 20 GiB is the minimum allowed
        maxAllocatedStorage: 1000, // Setting a max enables autoscaling

        dbSubnetGroupName: dbSubnets.id,
        vpcSecurityGroupIds: [ appSg.id ],

        name: secretName.secretString,
        username: secretUser.secretString,
        password: secretPassword.secretString,

        skipFinalSnapshot: true,
    });

    return db
}