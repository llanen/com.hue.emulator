"use strict";

const Homey = require("homey");
const { getLightDevices, getDeviceByDeviceId } = require("./lib/api.js");

class MyApp extends Homey.App {
  async onInit() {
    this.log("Hue emulator is running...");
    this.scheduleGetLights();
  }

  scheduleGetLights() {
    getLightDevices(this);
    setTimeout(() => this.scheduleGetLights(), 1000 * 30);
  }

  apiGetLightDevices(args) {
    console.log('lights api called');
    return this.lights ? this.lights : {};
  }
}

module.exports = MyApp;
