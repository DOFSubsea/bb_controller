var express = require('./config/express'),
    serialController = require('./app/controllers/bb.server.controller');

var app = express();

var port = process.env.PORT || 80;

serialController.init();

console.log('listening on port: '+port);
console.log('git update: 4');
app.listen(port);
