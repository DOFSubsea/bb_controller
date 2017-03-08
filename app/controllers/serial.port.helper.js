"use strict";

/**
 * The validPorts array should be updated to give access to any ports that
 * are needed to be availabe as more devices with needs for specific serial ports
 * become available. This was initially written to support a BeagleBone Black,
 * and an Arduino device. If the serial ports you need to use are not in the
 * valid ports list, they will not be populated in the configuration windows'
 * port select dropdown. Also note that the listPorts function filters the list
 * so that only devices in the /dev folder are returned.
 */

var validPorts = [
  '/dev/ttyO2',//beaglebone UART 2
  '/dev/ttyO4',//beaglebone UART 4
  '/dev/tty.usbmodem1413',//arduino
  '/dev/tty.usbmodem1411',//arduino
  '/dev/tty.Bluetooth-Incoming-Port'];//non-error-throwing tty port on Mac

var fs = require('fs');

exports.listPorts = () => {
  return validPorts.filter((port) => fs.existsSync(port));
};