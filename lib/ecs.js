"use strict";
const awsx = require("@pulumi/awsx");

exports.createECS = function(vpc) {
    // Creates an ALB associated with our custom VPC.
    const alb = new awsx.lb.ApplicationLoadBalancer("api", { vpc });
    // Listen to HTTP traffic on port 80.
    const listener = alb.createListener("web-listener", { port: 80 });

    // Create an ECS cluster
    const cluster = new awsx.ecs.Cluster("api-cluster", {
        vpc
    });

    // Specify the auto scale settings for cluster
    const asg = cluster.createAutoScalingGroup("api-scale", {
        templateParameters: { minSize: 2 },
        launchConfigurationArgs: { instanceType: "t2.nano" },
    });

    // Define the service to run.  We pass in the listener to hook up the network load balancer
    // to the containers the service will launch.
    const service = new awsx.ecs.FargateService("nginx", {
        cluster,
        desiredCount: 2,
        taskDefinitionArgs: {
            containers: {
                nginx: {
                    image: awsx.ecs.Image.fromPath("khatm-images", "./app"),
                    memory: 128,
                    portMappings: [listener],
                },
            },
        },
    });

    return listener;
}
