"use strict";
const awsx = require("@pulumi/awsx");

const createSecurityGroups = function(appName, vpc) {
    const lbSg = new awsx.ec2.SecurityGroup(`${appName}-sg-lb`, { vpc });
    // No need for ingress rule, the LB Crossroad will add it when necessary
    awsx.ec2.SecurityGroupRule.egress(`${appName}-sg-lb-out`, lbSg,
        new awsx.ec2.AnyIPv4Location(),
        new awsx.ec2.AllTraffic,
        "allow http out"
    );

    const appSg = new awsx.ec2.SecurityGroup(`${appName}-sg-app`, { vpc });
    awsx.ec2.SecurityGroupRule.ingress(`${appName}-sg-app-in`, appSg,
        {sourceSecurityGroupId: lbSg.id}, // LB security group the only source
        new awsx.ec2.AllTraffic,
        "allow http from lb in"
    );
    awsx.ec2.SecurityGroupRule.egress(`${appName}-sg-app-out`, appSg,
        new awsx.ec2.AnyIPv4Location(),
        new awsx.ec2.AllTraffic,
        "allow all http out"
    );

    const dataSg = new awsx.ec2.SecurityGroup(`${appName}-sg-data`, { vpc });
    awsx.ec2.SecurityGroupRule.ingress(`${appName}-sg-data-in`, dataSg,
        {sourceSecurityGroupId: appSg.id}, // App security group the only source
        new awsx.ec2.TcpPorts(5432),
        "allow app traffic in"
    );
    awsx.ec2.SecurityGroupRule.egress(`${appName}-sg-data-out`, dataSg,
        new awsx.ec2.AnyIPv4Location(),
        new awsx.ec2.AllTraffic,
        "allow all http out"
    );

    return { appSg, lbSg, dataSg }
}

exports.createEnvironment = function(appName) {
    // VPC Crossroad will create two subnets (public and private) for each availability zone
    // Default 2 zones, so 4 subnets total
    const vpc = new awsx.ec2.Vpc(`${appName}-vpc`, {
        cidrBlock: "10.0.0.0/16",
        numberOfNatGateways: 1, // Default is a NAT for each private subnet. Use 1 for now to reduce cost
    });

    const securityGroups = createSecurityGroups(appName, vpc);

    return {vpc, securityGroups};
}