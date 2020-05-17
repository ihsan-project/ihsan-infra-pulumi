"use strict";
const aws = require("@pulumi/aws");
const {
    dbName,
    dbUser,
    dbPassword
} = require("./secrets.js");

exports.createRDS = function(security) {
    const {vpc, securityGroups} = security;
    const {appSg} = securityGroups;

    const dbSubnets = new aws.rds.SubnetGroup("dbsubnets", {
        subnetIds: vpc.privateSubnetIds,
    });

    const db = new aws.rds.Instance("khatm-db", {
        engine: "postgres",

        instanceClass: "db.t3.micro",
        allocatedStorage: 20, // 20 GiB is the minimum allowed
        maxAllocatedStorage: 1000, // Setting a max enables autoscaling

        dbSubnetGroupName: dbSubnets.id,
        vpcSecurityGroupIds: [ appSg.id ],

        name: dbName.secretString,
        username: dbUser.secretString,
        password: dbPassword.secretString,

        skipFinalSnapshot: true,
    });

    return db
}