"use strict";
const pulumi = require("@pulumi/pulumi");
const {createStaticSPASite} = require("./lib/static_site.js");
const {createECS} = require("./lib/ecs.js");


createStaticSPASite("admin.khatmapp.com");
const listener = createECS();

exports.frontendURL = pulumi.interpolate `http://${listener.endpoint.hostname}/`;