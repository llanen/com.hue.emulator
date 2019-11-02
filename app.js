"use strict";

const Homey = require("homey");
const { HomeyAPI } = require("athom-api");
const { getLightDevices, getDeviceByDeviceId } = require("./lib/api.js");

class MyApp extends Homey.App {
  async onInit() {
    this.log("MyApp is running...");

    this.lights = await getLightDevices(this);
  }

  apiGetLightDevices(args) {
    return this.lights ? this.lights : {};
  }
}

module.exports = MyApp;
