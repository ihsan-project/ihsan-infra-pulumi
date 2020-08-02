"use strict";
const awsx = require("@pulumi/awsx");

exports.createVPC = function(name) {
    // VPC Crossroad will create two subnets (public and private) for each availability zone
    // Default 2 zones, so 4 subnets total
    const vpc = new awsx.ec2.Vpc(`${name}-vpc`, {
        cidrBlock: "10.0.0.0/16",
        numberOfNatGateways: 1, // Default is a NAT for each private subnet. Use 1 for now to reduce cost
    });

    // Create two security groups, one for the Load Balancer to manage
    // The other for the Applications to use
    const lbSg = new awsx.ec2.SecurityGroup(`${name}-lb-sg`, { vpc });
    // No need for ingress rule, the LB Crossroad will add it when necessary
    awsx.ec2.SecurityGroupRule.egress("http-out", lbSg,
        new awsx.ec2.AnyIPv4Location(),
        new awsx.ec2.TcpPorts(80),
        "allow http out"
    );

    const appSg = new awsx.ec2.SecurityGroup(`${name}-app-sg`, { vpc });
    // Make the LB security group the only source for the application security group
    awsx.ec2.SecurityGroupRule.ingress("lb-sg-in", appSg,
        {sourceSecurityGroupId: lbSg.id},
        new awsx.ec2.TcpPorts(80),
        "allow http from lb in"
    );
    awsx.ec2.SecurityGroupRule.ingress("db-sg-in", appSg,
        new awsx.ec2.AnyIPv4Location(),
        new awsx.ec2.TcpPorts(5432),
        "allow db from app in"
    );
    awsx.ec2.SecurityGroupRule.egress("all-out", appSg,
        new awsx.ec2.AnyIPv4Location(),
        new awsx.ec2.AllTraffic,
        "allow all http out"
    );

    return {vpc, securityGroups: { appSg, lbSg }};
}
