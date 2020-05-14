"use strict";
const awsx = require("@pulumi/awsx");

exports.createVPC = function(name) {
    // Allocate a new VPC with the default settings:
    const vpc = new awsx.ec2.Vpc(`${name}-vpc`, {
        cidrBlock: "10.0.0.0/16",
        subnets: [{ type: "public" }, { type: "private" }],
    });

    return vpc;
}
