"use strict";
const awsx = require("@pulumi/awsx");

exports.createECS = function(vpc) {
    // Creates an ALB associated with our custom VPC.
    const alb = new awsx.lb.ApplicationLoadBalancer("api-alb", { vpc });
    // Listen to HTTP traffic on port 80.
    const listener = alb.createListener("api-listener", { port: 80 });

    // Create an ECS cluster
    const cluster = new awsx.ecs.Cluster("api-cluster", { vpc });

    // Specify the auto scale settings for cluster
    const asg = cluster.createAutoScalingGroup("api-scale", {
        templateParameters: {
            minSize: 2,
            maxSize: 10
        },
        subnetIds: vpc.publicSubnetIds,
        launchConfigurationArgs: { instanceType: "t2.nano", associatePublicIpAddress: true },
    });

    // Define the service to run.  We pass in the listener to hook up the network load balancer
    // to the containers the service will launch.
    const service = new awsx.ecs.FargateService("api-orchestrator", {
        cluster,
        desiredCount: 2,
        healthCheckGracePeriod: 120,
        taskDefinitionArgs: {
            containers: {
                nginx: {
                    // Need Docker Engine Installed for awsx.ecs.Image
                    image: awsx.ecs.Image.fromPath("khatm-images", "./app"),
                    memory: 128, // TODO: What should a good amount be? I'm guessing this is MB
                    portMappings: [listener],
                },
            },
        },
    });

    return listener;
}
