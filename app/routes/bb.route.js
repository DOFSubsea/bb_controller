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

  app.route('/restart')
  .get((req, res) => {
		res.render('restart');
	})
	.post((req, res) => {
    res.send();
		bbController.restartDevice();
	});
}
