"use strict";
const awsx = require("@pulumi/awsx");

exports.createCloudWatchDashboard = function(appName, services) {
    const {ecs} = services;
    const {service, cluster} = ecs;
    const dashboard = new awsx.cloudwatch.Dashboard(appName, {
        widgets: [
            // Service Metrics
            new awsx.cloudwatch.SingleNumberMetricWidget({
                title: "ECS Service",
                width: 8,
                metrics: [
                    awsx.ecs.metrics.cpuUtilization({ service }),
                    awsx.ecs.metrics.memoryUtilization({ service })
                ],
            }),
            new awsx.cloudwatch.LineGraphMetricWidget({
                title: "ECS Service CPU",
                width: 16,
                metrics: [
                    awsx.ecs.metrics.cpuUtilization({ service })
                ],
            }),

            // Cluster Metrics
            new awsx.cloudwatch.SingleNumberMetricWidget({
                title: "ECS Cluster Memory",
                width: 8,
                metrics: [
                    awsx.ecs.metrics.memoryReservation({ cluster }),
                    awsx.ecs.metrics.memoryUtilization({ cluster })
                ],
            }),
            new awsx.cloudwatch.LineGraphMetricWidget({
                title: "ECS Cluster CPU",
                width: 16,
                metrics: [
                    awsx.ecs.metrics.cpuUtilization({ cluster })
                ],
            }),
        ],
    });
}

