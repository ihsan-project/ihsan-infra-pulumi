"use strict";
const awsx = require("@pulumi/awsx");

exports.createVPC = function(name) {
    // Create VPC
    // VPC Crossroad will create two subnets (public and private) for each availability zone
    // Default 2 zones, so 4 subnets total
    const vpc = new awsx.ec2.Vpc(`${name}-vpc`, {
        cidrBlock: "10.0.0.0/16",
    });

    const sg = new awsx.ec2.SecurityGroup(`${name}-sg`, { vpc });

    // TODO: When securing it, maybe we need an ingress/egress rule with a from->to ports
    // https://www.pulumi.com/docs/guides/crosswalk/aws/elb/#load-balancing-ec2-instance-targets
    // egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: [ "0.0.0.0/0" ] }],
    // or, egress: [{ protocol: "-1", fromPort: 443, toPort: 80, cidrBlocks: [ "0.0.0.0/0" ] }],

    // Outbound all traffic on any port to anywhere
    sg.createEgressRule("outbound-all-rule", {
        location: new awsx.ec2.AnyIPv4Location(),
        ports: new awsx.ec2.AllTraffic,
        description: "allow outbound access to anywhere",
    });

    return {vpc, sg};
}
