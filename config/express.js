var express = require('express'),
  bodyParser = require('body-parser'),
  morgan = require('morgan'),
  cwd = process.cwd();

var app = express();

module.exports = () => {
  //setup static routes
  app.use('/public', express.static(cwd + '/public'));
  app.use('/controllers', express.static(cwd + '/app/controllers'));

  //setup middleware
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());
  app.use(morgan('dev'));

  //set views location
  app.set('views', './app/views');

  //set view engine
  app.set('view engine', 'ejs');

  //wire routes
  require(cwd+'/app/routes/bb.route')(app);
  return app;
}
