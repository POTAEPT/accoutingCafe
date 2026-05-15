const exportController = require('../controllers/exportController');
const { authenticate } = require('../middlewares/auth');

async function exportRoutes(fastify, options) {
  fastify.get('/api/export/:receipt_no', {
    preHandler: authenticate,
    handler: exportController.exportReceipt
  });
}

module.exports = exportRoutes;