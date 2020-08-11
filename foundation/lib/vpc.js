"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

const createSecurityGroups = function(appName, vpc, importResource) {
    const lbSg = new awsx.ec2.SecurityGroup(`${appName}-sg-lb`,
        { vpc, name: importResource ? importResource.lbSgId : null },
        { import: importResource ? importResource.lbSgId : null });
    // No need for ingress rule, the LB Crossroad will add it when necessary
    awsx.ec2.SecurityGroupRule.egress("sg-out", lbSg,
        new awsx.ec2.AnyIPv4Location(),
        new awsx.ec2.AllTraffic,
        "allow http out"
    );

    const appSg = new awsx.ec2.SecurityGroup(`${appName}-sg-app`,
        { vpc, name: importResource ? importResource.appSgId : null },
        { import: importResource ? importResource.appSgId : null });
    awsx.ec2.SecurityGroupRule.ingress("app-in", appSg,
        {sourceSecurityGroupId: lbSg.id}, // LB security group the only source
        new awsx.ec2.AllTraffic,
        "allow http from lb in"
    );
    awsx.ec2.SecurityGroupRule.egress("app-out", appSg,
        new awsx.ec2.AnyIPv4Location(),
        new awsx.ec2.AllTraffic,
        "allow all http out"
    );

    const dataSg = new awsx.ec2.SecurityGroup(`${appName}-sg-data`,
        { vpc, name: importResource ? importResource.dataSgId : null },
        { import: importResource ? importResource.dataSgId : null });
    awsx.ec2.SecurityGroupRule.ingress("data-in", dataSg,
        {sourceSecurityGroupId: appSg.id}, // App security group the only source
        new awsx.ec2.TcpPorts(5432),
        "allow app traffic in"
    );
    awsx.ec2.SecurityGroupRule.egress("data-out", dataSg,
        new awsx.ec2.AnyIPv4Location(),
        new awsx.ec2.AllTraffic,
        "allow all http out"
    );

    return { appSg, lbSg, dataSg }
}

exports.createEnvironment = function(appName, importResource) {
    // VPC Crossroad will create two subnets (public and private) for each availability zone
    // Default 2 zones, so 4 subnets total

    const vpc = new awsx.ec2.Vpc(`${appName}-vpc`, {
        cidrBlock: "10.0.0.0/16",
        numberOfNatGateways: 1, // Default is a NAT for each private subnet. Use 1 for now to reduce cost
    }, { import: importResource ? importResource.vpcId : null });

    // const vpc = new aws.ec2.Vpc(`${appName}-vpc`, {}, { id: importResource ? importResource.vpcId : null });

    const securityGroups = {}//createSecurityGroups(appName, vpc, importResource);

    return {vpc, securityGroups};
}

exports.recreateEnvironment = function(appName, stack) {
    // Reference the resources from the khatm-foundation stack
    const vpcInfo = stack.getOutput("vpc");
    // const vpc = new awsx.ec2.Vpc(`${appName}-vpc-1`, {
    //     vpc: aws.ec2.Vpc.get(vpcInfo.name, vpcInfo.id)
    // });
    // const vpc = pulumi.output(aws.ec2.Vpc.get(vpcInfo.name, vpcInfo.id));
    const vpc = new aws.ec2.Vpc(`${appName}-vpc`, {},
        { id: vpcInfo.id });

    const lbSgInfo = stack.getOutput("lbSg");
    // const lbSg = pulumi.output(aws.ec2.SecurityGroup.get(lbSgInfo.name, lbSgInfo.id));
    // const lbSg = new awsx.ec2.SecurityGroup(`${appName}-sg-lb-1`, {
    //     securityGroup: aws.ec2.SecurityGroup.get(lbSgInfo.name, lbSgInfo.id)
    // });
    const lbSg = new aws.ec2.SecurityGroup(`${appName}-sg-lb`, {},
        { id: lbSgInfo.id });

    const appSgInfo = stack.getOutput("appSg");
    // const appSg = pulumi.output(aws.ec2.SecurityGroup.get(appSgInfo.name, appSgInfo.id));
    // const appSg = new awsx.ec2.SecurityGroup(`${appName}-sg-app-1`, {
    //     securityGroup: aws.ec2.SecurityGroup.get(appSgInfo.name, appSgInfo.id)
    // });
    const appSg = new aws.ec2.SecurityGroup(`${appName}-sg-app`, {},
        { id: appSgInfo.id });


    // Use: https://github.com/pulumi/pulumi-awsx/pull/548
    //      https://github.com/pulumi/pulumi-awsx/pull/553
    //      https://github.com/pulumi/pulumi-awsx/pull/560 when ready
    // const albTargetInfo = foundation.getOutput("albTarget")
    // const albTarget = pulumi.output(aws.alb.TargetGroup.get(albTargetInfo.name, albTargetInfo.id));
    // const albListenerInfo = foundation.getOutput("albListener")
    // const albListener = pulumi.output(aws.alb.Listener.get(albListenerInfo.name, albListenerInfo.id));

    return { vpc, securityGroups: { appSg, lbSg } }
}