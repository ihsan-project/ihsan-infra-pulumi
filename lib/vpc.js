"use strict";
const awsx = require("@pulumi/awsx");

exports.createVPC = function(name) {
    // Allocate a new VPC with the default settings:
    const vpc = new awsx.ec2.Vpc(`${name}-vpc`, {
        cidrBlock: "10.0.0.0/16",
        subnets: [{ type: "public" }, { type: "private" }],
    });

    const sg = new awsx.ec2.SecurityGroup(`${name}-sg`, { vpc });

    // TODO: Temp rule
    // Inbound HTTP web traffic from anywhere
    sg.createIngressRule("inbound-http-rule", {
        location: new awsx.ec2.AnyIPv4Location(),
        ports: new awsx.ec2.TcpPorts(80),
        description: "allow HTTP web access from anywhere",
    });

    // Inbound HTTPS traffic on port 443 from anywhere
    sg.createIngressRule("inbound-https-rule", {
        location: new awsx.ec2.AnyIPv4Location(),
        ports: new awsx.ec2.TcpPorts(443),
        description: "allow HTTPS access from anywhere",
    });

    // Outbound all traffic on any port to anywhere
    sg.createEgressRule("outbound-all-rule", {
        location: new awsx.ec2.AnyIPv4Location(),
        ports: new awsx.ec2.AllTraffic,
        description: "allow outbound access to anywhere",
    });

    return {vpc, sg};
}
