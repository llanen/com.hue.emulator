"use strict";

const { HomeyAPI } = require("athom-api");
const { ManagerSettings } = require('homey');

const isHueLightDevice = function(device) {
  return device.class === "socket" || device.class === "light";
};

const filterDevices = function(devices) {
  return devices.filter(isHueLightDevice);
};

const generateHueLightStateFromDevice = function(light) {
  let stateObject = {};
  if (light.capabilities.includes("dim")) {
    stateObject.bri = Math.floor(light.capabilitiesObj.dim.value * 254);
  }

  if (light.capabilities.includes("onoff")) {
    stateObject.on = light.capabilitiesObj.onoff.value === true;
  }

  if (light.capabilities.includes("light_hue")) {
    stateObject.hue = Math.ceil(light.capabilitiesObj.light_hue.value * 65535);
  }

  stateObject.reachable = light.available;
  stateObject.alert = false;

  return stateObject;
};

const getHueDeviceTypeByCapabilities = function(light) {
  if (light.capabilities.includes("light_hue")) {
    return "LCT001";
  } else if (light.capabilities.includes("light_temperature")) {
    return "LTC003";
  } else {
    return "LWB006";
  }
};

const getHueModelIdByCapabilities = function(light) {
  if (light.capabilities.includes("light_hue")) {
    return "Extended color light";
  } else if (light.capabilities.includes("light_temperature")) {
    return "Color temperature light";
  } else {
    return "Dimmable light";
  }
};

const transformDevicesToHueLights = function(lightDevices) {
  // Find the mapping between uuid and id
  let mappingObject = ManagerSettings.get('deviceUuidToIdMapping');
  if (!mappingObject) {
    console.log("Create initial mapping object");
    mappingObject = {
      lastId: 0,
      uuidToId: {},
    }
  }

  let hueLights = {};
  //let lightId = 0;
  for (let elm in lightDevices) {
    const light = lightDevices[elm];
    if (!mappingObject.uuidToId[light.id]) {
      mappingObject.lastId++
      console.log('Add new uuid to id mapping '+light.id +' -> ' + mappingObject.lastId);
      mappingObject.uuidToId[light.id] = mappingObject.lastId;

      // Store the new mapping
      ManagerSettings.set('deviceUuidToIdMapping', mappingObject);
    }

    const lightId = mappingObject.uuidToId[light.id];
    // Create object with id
    hueLights["" + lightId] = {
      state: generateHueLightStateFromDevice(light),
      name: light.name,
      type: getHueDeviceTypeByCapabilities(light),
      modelid: getHueModelIdByCapabilities(light),
      manufacturername: "Philips",
      uniqueid: light.id
    };
  }
  return hueLights;
};

let getApi = async function(aDevice) {
  if (!aDevice._api) {
    aDevice._api = await HomeyAPI.forCurrentHomey();
  }
  return aDevice._api;
};

let getLightDevices = async function(aDevice) {
  try {
    const api = await getApi(aDevice);
    const devices = await api.devices.getDevices();
    const lights = filterDevices(Object.values(devices));
    // Now create HUE light device from these
    aDevice.lights = transformDevicesToHueLights(lights);
    console.log("Got lights");
  } catch (error) {
    aDevice.log("error fetching devices", error);
  }
};

let getDeviceByDeviceId = function(deviceId, devices) {
  for (let device in devices) {
    let d = devices[device];
    if (d.data && d.data.id === deviceId) {
      return d;
    }
  }
  return undefined;
};

module.exports = {
  getLightDevices: getLightDevices,
  getDeviceByDeviceId: getDeviceByDeviceId
};
