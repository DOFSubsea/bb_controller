"use strict";

const MAX_TIMEOUT = 5000;//5 seconds in milliseconds
/**
 * NOTE: MAX_UPTIME is used to restart the device every 24 hours - if you change this
 * to a very short period of time, all the devices will go into a bootloop that may not
 * be able to be stopped.
 */
const MAX_UPTIME = 8.64e7;//24 hours in milliseconds

var SerialPort = require('serialport'),
    ser = null,
		nextRestart = MAX_UPTIME/1000,
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

var restartDevice = () => {
  //Sends the shutdown command to the operating system
  exec('shutdown -r now', (err, stdout, stderr) => {
    console.log(err, stdout, stderr);
  });
};

var generateDefaultConfig = () => {
  //creates a default runtime configuration
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
  //saves the configuration to the configFilePath
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config), {encoding: 'utf-8'});
    console.log('Configuration saved.');
  } catch (e) {
    console.log(e);
  }
};

var loadConfig = () => {
  //loads the configuration from the configFilePath
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
  //parses the lastReceived data string which should be a NMEA $GPGGA string
	let fields = lastReceived.split(',');
	if (fields.length !== 15) {
		throw new Error('Error parsing GPS data: field count should be 15 - got '+fields.length);
	}
  //GPS time not system time
	let time = Number(fields[1]);
  //GPS latitude split into degrees and decimal minutes
	let lat = {degrees: Number(fields[2].slice(0,2)), minutes: Number(fields[2].slice(2))};
  //latitude as decimal degrees
  let latDD = (lat.degrees + lat.minutes/60.0).toFixed(4);
  //latitude direction (N,S)
	let latDir = fields[3];
  //GPS longitude split into degrees and decimal minutes
	let lon = {degrees: Number(fields[4].slice(0,3)), minutes: Number(fields[4].slice(3))};
  //longitude as decimal degrees
  let lonDD = (lon.degrees + lon.minutes/60.0).toFixed(4);
  //longitude direction (E,W)
	let lonDir = fields[5];
	let quality = Number(fields[6]) || 0;//if null or undefined is returned make sure 0 is set

  //inverse sign if longitude is W
	if (lonDir === 'W') {
    lon.degress *= -1;
		lonDD *= -1;
	}

  //do not accept the position data if quality is 0
	if (quality == 0) {
		throw new Error('GPS fix not valid');
	}

	return {time: time, lat: lat, lon: lon, latDD: latDD, lonDD: lonDD}
};

var updateThingSpeak = () => {
  //send data to ThingSpeak
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
  //send data to SeaState directly
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
  /**
   * before updating, set updateInProgress to true and
   * add some time to the lastUpdateTime so the update function(s)
   * are not called repeatedly in case an error occurs
   * or the internet is slow.
   */
  if (updateInProgress) return;
  updateInProgress = true;
  lastUpdateTime += 10000;
  statusMessage = 'Updating remote database.';
  if (config.api.target === 'thingspeak') {
    updateThingSpeak();
  } else {
    updateSeaState();
  }
};

exports.init = () => {
  /**
   * load the configuration setup the serial ports
   * and define on('event') functions
   */
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
  /**
   * update the configuration in memory, save it,
   * and apply updates to the serial port
   */
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

exports.requestDeviceRestart = (req, res) => {
	res.send('attempting to restart device');
	restartDevice();
}

exports.getConfig = () => {
  //used to provide access to the config var outside of this file
  return config;
}

exports.readConfig = (req, res) => {
  //respond with the config that is in memory
  res.json(config);
};

exports.readStatus = (req, res) => {
  //respond with the current status of the device
  if (Date.now() - lastReceivedTime > MAX_TIMEOUT) {
    lastReceived = 'No GPS data received.'
  }
  res.json({
    lastReceived: lastReceived,
    lastReceivedTime: lastReceivedTime,
    lastUpdateTime: lastUpdateTime,
		nextRestart: nextRestart,
    statusMessage: statusMessage
  });
};

exports.isOpen = (req, res) => {
  return ser && ser.isOpen();
};

/**
 * Restart the server manually every MAX_UPTIME in case
 * the UARTs hang or there is a network error that is
 * causing the device/software to not work properly
 * 
 * Use a setInterval fn to decrement nextRestart and can be reported
 * in readStatus() and restart the device when nextRestart <= 0
 * 
 * NOTE: if the server has completely crashed, it will not be
 * restarted until the next update from GitHub - if you suspect that
 * a device server has crashed, clone the bb_controller repo from
 * GitHub, add a new file named forcerestart.js and push the changes
 * to GitHub. If forcerestart.js exists already, just delete it and
 * push the changes to GitHub. The next time the device pulls from
 * GitHub the changes will be detected and nodemon will restart the server.
 * Otherwise the device probably does not have access to the Internet.
 */
setInterval(() => {
  nextRestart--;
  if (nextRestart <= 0) {
    restartDevice();
  }
}, 1000);
