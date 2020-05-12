"use strict";
const awsx = require("@pulumi/awsx");

exports.createCloudWatchDashboard = function(dashboardName, services) {
    const {ecs} = services;
    const {service} = ecs;
    const dashboard = new awsx.cloudwatch.Dashboard(dashboardName, {
        widgets: [
            new awsx.cloudwatch.SingleNumberMetricWidget({
                title: "ECS Service CPU",
                width: 8,
                metrics: [
                    awsx.ecs.metrics.cpuReservation({ service }),
                    awsx.ecs.metrics.cpuUtilization({ service })
                ],
            }),
            new awsx.cloudwatch.SingleNumberMetricWidget({
                title: "ECS Service Memory",
                width: 8,
                metrics: [
                    awsx.ecs.metrics.memoryReservation({ service }),
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
        ],
    });
}

