var express = require('./config/express'),
    bbController = require('./app/controllers/bb.server.controller');

var app = express();

var port = process.env.PORT || 80;

bbController.init();

console.log('listening on port: '+port);
app.listen(port);
