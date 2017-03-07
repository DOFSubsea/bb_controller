var bbController = require('../controllers/bb.server.controller');

module.exports = (app) => {
  app.route('/')
  .get((req, res) => {
    res.render('index', {settings: bbController.getConfig()});
  });

  app.route('/status')
  .get(bbController.readStatus);

  app.route('/configure')
  .get((req, res) => {
    res.render('configure', {settings: bbController.getConfig()});
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
