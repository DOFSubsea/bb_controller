"use strict";

const MAX_TIMEOUT = 5000;//5 seconds
const MAX_UPTIME = 8.64e7;//24 hours

var SerialPort = require('serialport'),
    ser = null,
    lastReceived = "No GPS data received",
    lastReceivedTime = Date.now(),
		lastUpdateTime = Date.now(),
    updateInProgress = false,
    statusMessage = 'Device started: '+new Date().toLocaleString(),
    configFilePath = process.cwd()+'/config/bb.config.json',
    config = {};

var fs = require('fs'),
    qs = require('querystring'),
    request = require('request'),
    exec = require('child_process').exec;

var restartServer = () => {
  console.log('restarting server');
  exec("echo var LAST_RESTART=\"'$(date)'\" > nodemon.restart.js", (err, stdout, stderr) => {
    console.log(err, stdout, stderr);
  });
};

var restartDevice = () => {
  exec('shutdown -r now', (err, stdout, stderr) => {
    console.log(err, stdout, stderr);
  });
};

var generateDefaultConfig = () => {
  config = {
    "serial": {
      "port": "/dev/ttyO4",
      "baudrate": "9600"
    },
    "api": {
      "frequency": "5",
      "target": "thingspeak",
      "vin": "",
      "channel": "",
      "key": ""
    }
  }
};

var saveConfig = () => {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config), {encoding: 'utf-8'});
    console.log('Configuration saved.');
  } catch (e) {
    console.log(e);
  }
};

var loadConfig = () => {
  try {
    if (!fs.existsSync(configFilePath)){
      console.log('No config file exists. Loading with default settings.');
      statusMessage = 'Using default configuration.';
      generateDefaultConfig();
      saveConfig();
    } else {
      config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    }
  } catch (e) {
    console.log(e);
    config = {}
  }
};

var getGPSData = () => {
	let fields = lastReceived.split(',');
	if (fields.length !== 15) {
		throw new Error('Error parsing GPS data: field count should be 15 - got '+fields.length);
	}
	let time = Number(fields[1]);
	let lat = {degrees: Number(fields[2].slice(0,2)), minutes: Number(fields[2].slice(2))};
  let latDD = (lat.degrees + lat.minutes/60.0).toFixed(4);//decimal degrees
	let latDir = fields[3];
	let lon = {degrees: Number(fields[4].slice(0,3)), minutes: Number(fields[4].slice(3))};
  let lonDD = (lon.degrees + lon.minutes/60.0).toFixed(4);//decimal degrees
  
	let lonDir = fields[5];
	let quality = Number(fields[6]);

	if (lonDir === 'W') {
    lon.degress *= -1;
		lonDD *= -1;
	}

	if (quality == 0) {
		throw new Error('GPS fix not valid');
	}

	return {time: time, lat: lat, lon: lon, latDD: latDD, lonDD: lonDD}
};

var updateThingSpeak = () => {
  console.log('updating thingspeak');
	try {
		let data = getGPSData();
    let query = qs.stringify({api_key: config.api.key, field1: data.latDD, field2: data.lonDD, field3: data.time});
    let req = request('https://api.thingspeak.com/update.json?'+query, (err, res, body) => {
      if (err) {
        statusMessage = 'Unable to update ThingSpeak database: '+err.toString();
      } else {
        lastUpdateTime = Date.now();
        statusMessage = 'Updated ThingSpeak database @ '+new Date().toLocaleString();
      }
      updateInProgress = false;
    });
	} catch (e) {
    console.log(e);
		statusMessage = e.toString();
    updateInProgress = false;
	}
};

var updateSeaState = () => {
  console.log('updating seastate');
	try {
    let data = getGPSData();
    lastUpdateTime = Date.now();
    statusMessage = 'Updated SeaState database @ '+new Date().toLocaleString();
    lastUpdateTime = Date.now();
    updateInProgress = false;
	} catch (e) {
		console.log(e);
    statusMessage = e.toString();
    updateInProgress = false;
	}
};

var updateRemoteDatabase = () => {
  if (updateInProgress) return;
  /**
   * before updating, set updateInProgress to true and
   * add some time to the lastUpdateTime so the update function(s)
   * are not called repeatedly in case an error occurs
   * or the internet is slow.
   */
  updateInProgress = true;
  lastUpdateTime += 5000;
  statusMessage = 'Updating remote database.';
  if (config.api.target === 'thingspeak') {
    updateThingSpeak();
  } else {
    updateSeaState();
  }
};

exports.init = () => {
  loadConfig();
  console.log('initializing serial port');
  ser = new SerialPort(config.serial.port,
  {
    baudRate: Number(config.serial.baudrate),
    parser: SerialPort.parsers.readline('\n')
  });

  ser.on('error', (err) => {
    statusMessage = err.message;
    console.log(err);
  });

  ser.on('data', (data) => {
    lastReceived = data;
    lastReceivedTime = Date.now();
    const freq = config.api.frequency * 60 * 1000;//convert minutes to milliseconds
    //const freq = 5000;//5 seconds for testings
    if (Date.now() - lastUpdateTime > freq) {
      updateRemoteDatabase();
    }
  });
};

exports.updateConfig = (req, res) => {
  console.log(req.body);
  const params = req.body;
  config.serial.baudrate = params.baudrate;
  config.api.frequency = params.frequency;
  config.api.target = params.target;
  if (params.target === 'seastate') {
    config.api.vin = params.vin;
  }
  if (params.target === 'thingspeak') {
    config.api.channel = params.channel;
    config.api.key = params.apiKey;
  }
  saveConfig();
  if (ser && ser.isOpen()) {
    ser.update({baudRate: Number(params.baudrate)},
    (err) => {
      statusMessage = 'Configuration successfully updated.'
	    res.redirect('/');
    });
  } else {
    statusMessage = 'Configuration was updated but no serial port is available. Try restarting the device.'
    res.redirect('/');
  }
};

exports.getConfig = () => {
  return config;
};

exports.readConfig = (req, res) => {
  res.json(getConfig());
};

exports.readStatus = (req, res) => {
  if (Date.now() - lastReceivedTime > MAX_TIMEOUT) {
    lastReceived = 'No GPS data received.'
  }
  res.json({
    lastReceived: lastReceived,
    lastReceivedTime: lastReceivedTime,
    lastUpdateTime: lastUpdateTime,
    statusMessage: statusMessage
  });
};

exports.isOpen = (req, res) => {
  return ser && ser.isOpen();
};

setTimeout(restartServer, MAX_UPTIME);

