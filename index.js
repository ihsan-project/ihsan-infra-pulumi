"use strict";
const pulumi = require("@pulumi/pulumi");
const {createStaticSPASite} = require("./lib/static_site.js");
const {createECS} = require("./lib/ecs.js");
const {createVPC} = require("./lib/vpc.js");


createStaticSPASite("admin.khatmapp.com");
const vpc = createVPC("khatm-app")
const listener = createECS(vpc);

exports.frontendURL = pulumi.interpolate `http://${listener.endpoint.hostname}/`;