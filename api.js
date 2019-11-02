"use strict";
const Homey = require("homey");

module.exports = [
  {
    method: "GET",
    path: "/lights",
    public: true,
    fn: (args, callback) => {
      const result = Homey.app.apiGetLightDevices(args);
      if (result instanceof Error) return callback(result);
      return callback(null, result);
    }
  },

  {
    method: 'PUT',
    path: '/lights/:id/state',
    public: true,
    fn: (args, callback) => {
        var result = Homey.app.apiSetLightState(args.params.id, args.body);
        if(result instanceof Error) return callback(result);
        return callback(null, result);
    }
},
];
