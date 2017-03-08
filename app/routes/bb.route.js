var bbController = require('../controllers/bb.server.controller'),
    portHelper = require('../controllers/serial.port.helper');

module.exports = (app) => {
  app.route('/')
  .get((req, res) => {
    res.render('index', {settings: bbController.getConfig()});
  });

  app.route('/status')
  .get(bbController.readStatus);

  app.route('/configure')
  .get((req, res) => {
    res.render('configure', {settings: bbController.getConfig(), ports: portHelper.listPorts()});
  })
  .post(bbController.updateConfig);

  app.route('/wait')
  .get((req, res) => {
    res.render('wait');
  });

  app.route('/restart/confirmed')
  .get((req, res) => {
    setTimeout(bbController.requestDeviceRestart, 3000);
    res.redirect('/wait');
	});
}
