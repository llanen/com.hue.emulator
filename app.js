"use strict";

const Homey = require("homey");
const { ManagerSettings } = require('homey');
const { getLightDevices, setLightDevice } = require("./lib/api.js");

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

  apiSetLightState(lightId, body) {
    // Don't wait for the result just return success, as Toon will not handle errors anyway
    setLightDevice(this, lightId, body);
    return [{}]
  }
}

module.exports = MyApp;
