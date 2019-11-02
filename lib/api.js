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

  if (light.capabilities.includes("onoff")) {
    stateObject.on = light.capabilitiesObj.onoff.value === true;
    stateObject.bri = light.capabilitiesObj.onoff.value ? 254 : 0;
  }

  // Override the value set by on/off if dimming is supported
  if (light.capabilities.includes("dim")) {
    stateObject.bri = Math.ceil(light.capabilitiesObj.dim.value * 254);
  }

  if (light.capabilities.includes("light_hue")) {
    stateObject.hue = Math.ceil(light.capabilitiesObj.light_hue.value * 65535);
  }

  if (light.capabilities.includes("light_mode")) {
    stateObject.colormode = light.capabilitiesObj.light_mode.value === 'color' ? 'xy' : 'ct';
  }

  if (light.capabilities.includes("light_temperature")) {
    stateObject.ct = Math.ceil(153 + light.capabilitiesObj.light_temperature.value * (500 - 153));
  }

  if (light.capabilities.includes("light_saturation")) {
    stateObject.sat = Math.ceil(light.capabilitiesObj.light_saturation.value * 254);
  }

  stateObject.reachable = light.available;
  stateObject.mode = "homeautomation";
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
    return "extended color light";
  } else if (light.capabilities.includes("light_temperature")) {
    return "color temperature light";
  } else {
    return "dimmable light";
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
      idToUuid: {},
    }
  }

  let hueLights = {};
  let configModified = false;
  for (let elm in lightDevices) {
    const light = lightDevices[elm];
    if (!mappingObject.uuidToId[light.id]) {
      mappingObject.lastId++
      console.log('Add new uuid to id mapping '+light.id +' -> ' + mappingObject.lastId);
      mappingObject.uuidToId[light.id] = mappingObject.lastId;
      configModified = true;
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
  if (configModified) {
    // Store the new mapping
    ManagerSettings.set('deviceUuidToIdMapping', mappingObject);
  }
  return hueLights;
};

let getApi = async function(aDevice) {
  if (!aDevice._api) {
    aDevice._api = await HomeyAPI.forCurrentHomey();
  }
  return aDevice._api;
};

let setLightDevice = async function(aDevice, lightId, actionJson) {

  const api = await getApi(aDevice);
  const lightUuid = getLightUuidById(lightId);
  try {
    if ( (typeof actionJson.bri === 'undefined') && (typeof actionJson.on === 'undefined') ) {
      for (var elm in actionJson) {
        actionJson = JSON.parse(elm);
      }
    }

    // Set state
    if ((typeof actionJson.bri !== 'undefined') && (typeof actionJson.on === 'undefined' || actionJson.on === true)) {
      const newState = Math.round(actionJson.bri / 254 * 100) / 100;
      await api.devices.setCapabilityValue({deviceId: lightUuid, capabilityId: 'dim',  value: newState});
      aDevice.lights[''+lightId].state.bri = actionJson.newState;
    } else if (typeof actionJson.on !== 'undefined') {
      await api.devices.setCapabilityValue({deviceId: lightUuid, capabilityId: 'onoff',  value: actionJson.on});
      aDevice.lights[''+lightId].state.on = actionJson.on;
    }
  } catch (error) {
    aDevice.log("error fetching devices", error);
  }
}

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

let getLightUuidById = function(lightId) {
  let mappingObject = ManagerSettings.get('deviceUuidToIdMapping');
  const lightUuid = mappingObject.idToUuid[''+lightId];
  return lightUuid;
};

module.exports = {
  getLightDevices: getLightDevices,
  setLightDevice: setLightDevice,
};
