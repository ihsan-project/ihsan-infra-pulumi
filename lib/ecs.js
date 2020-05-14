"use strict";
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

exports.createECS = function(security) {
    const {vpc, sg} = security;

    // Creates an ALB associated with our custom VPC.
    const alb = new awsx.lb.ApplicationLoadBalancer("api-alb", {
        vpc,
        securityGroups: [ sg ]
     });

    // Listen to HTTPS traffic
    // const listener = alb.createListener("api-listener", {
    //     port: 443,
    //     certificateArn: "arn:aws:acm:us-east-1:952442618488:certificate/3fc83113-436f-4019-aedc-bc17a936c755",
    //     protocol: "HTTPS",
    //     sslPolicy: "ELBSecurityPolicy-FS-2018-06",
    // });
    const listener = alb.createListener("api-listener", { port: 80 });

    // Create an ECS cluster
    const cluster = new awsx.ecs.Cluster("api-cluster", {
        vpc,
        securityGroups: [ sg ]
    });

    // Specify the auto scale settings for cluster
    const asg = cluster.createAutoScalingGroup("api-scale", {
        templateParameters: {
            minSize: 2,
            maxSize: 10
        },
        subnetIds: vpc.publicSubnetIds, // Server nodes need to be in the public subnet
        launchConfigurationArgs: { instanceType: "t2.nano" },
    });

    const logGroup = new aws.cloudwatch.LogGroup("api-logs", {
        retentionInDays: 7,
    });

    // Define the service to run.  We pass in the listener to hook up the network load balancer
    // to the containers the service will launch.
    const service = new awsx.ecs.EC2Service("api-orchestrator", {
        cluster,
        logGroup,
        desiredCount: 1,
        healthCheckGracePeriod: 120,
        taskDefinitionArgs: {
            containers: {
                nginx: {
                    // Need Docker Engine installed on CLI environment for awsx.ecs.Image
                    image: awsx.ecs.Image.fromPath("khatm-images", "./app"),
                    memory: 128, // TODO: What should a good amount be? I'm guessing this is MB
                    portMappings: [listener],
                },
            },
        },
    });

    return {listener, service, cluster};
}
