"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
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

    // Creates an ALB associated with our custom VPC.
    const alb = new awsx.lb.ApplicationLoadBalancer(`${appName}-alb`, {
        vpc,
        securityGroups: [securityGroups.lbSg ],
    });

    // The certificate for the LB to use for HTTPS:443
    const sslCert = pulumi.output(aws.acm.getCertificate({ domain: process.env.ACM_DOMAIN, }));

    // Listen on HTTPS 443, terminate SSL,
    // output to HTTP 80 for all target EC2 instances that attach to it
    const albTarget = alb.createTargetGroup(`${appName}-alb-trgt`, {
        port: 80,
        protocol: "HTTP",
        targetType: "instance",
        healthCheck: {
            // The web application needs to return a 200 at this path
            // Default path is `/`
            path: "/api", // TODO: Get from Env
            // The following is to give the instance in private subnet some time to come up
            interval: 120, // Slow down how often it does health checks
            unhealthyThreshold: 5 // Increase how unhealthy checks before it drains from the instance
        }
    });
    const albListener = albTarget.createListener(`${appName}-alb-lstnr`, {
        port: 443,
        certificateArn: sslCert.arn,
        protocol: "HTTPS",
    });

    return {vpc, securityGroups, alb: { albTarget, albListener }};
}