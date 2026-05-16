const transactionController = require('../controllers/transactionController');
const { authenticate } = require('../middlewares/auth');

async function transactionRoutes(fastify, options) {
  fastify.post('/api/transactions', {
    preHandler: authenticate,
    handler: transactionController.createTransaction
  });

  fastify.get('/api/transactions', {
    preHandler: authenticate,
    handler: transactionController.getTransactions
  });

  fastify.get('/api/transactions/:id/items', {
    preHandler: authenticate,
    handler: transactionController.getTransactionItems
  });

  fastify.delete('/api/transactions/:id', {
    preHandler: authenticate,
    handler: transactionController.deleteTransaction
  });

  fastify.patch('/api/transactions/:id/void', {
    preHandler: authenticate,
    handler: transactionController.voidTransaction
  });

}

module.exports = transactionRoutes;