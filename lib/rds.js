"use strict";
const aws = require("@pulumi/aws");

exports.createRDS = function(security) {
    const {vpc, securityGroups} = security;
    const {appSg} = securityGroups;

    const dbSubnets = new aws.rds.SubnetGroup("dbsubnets", {
        subnetIds: vpc.privateSubnetIds,
    })

    const db = new aws.rds.Instance("khatm-db", {
        engine: "postgres",

        instanceClass: "db.t3.micro",
        allocatedStorage: 20, // 20 is the minimum allowed
        maxAllocatedStorage: 1000,

        dbSubnetGroupName: dbSubnets.id,
        vpcSecurityGroupIds: [ appSg.id ],

        name: process.env.RDS_DATABASE_NAME,
        username: process.env.RDS_DATABASE_USER,
        password: process.env.RDS_DATABASE_PASSWORD,

        skipFinalSnapshot: true,
    });

    return db
}