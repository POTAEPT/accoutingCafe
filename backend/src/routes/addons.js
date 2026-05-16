const addonController = require('../controllers/addonController');
const { authenticate } = require('../middlewares/auth');

async function addonRoutes(fastify, options) {
  fastify.get('/api/addons', {
    preHandler: authenticate,
    handler: addonController.getAddons
  });

  fastify.post('/api/addons', {
    preHandler: authenticate,
    handler: addonController.createAddon
  });

  fastify.put('/api/addons/:id', {
    preHandler: authenticate,
    handler: addonController.updateAddon
  });

  fastify.delete('/api/addons/:id', {
    preHandler: authenticate,
    handler: addonController.deleteAddon
  });
}

module.exports = addonRoutes;
