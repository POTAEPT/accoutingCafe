const productController = require('../controllers/productController');
const { authenticate } = require('../middlewares/auth');

async function productRoutes(fastify, options) {
  fastify.get('/api/products', {
    preHandler: authenticate,
    handler: productController.getProducts
  });

  fastify.post('/api/products', {
    preHandler: authenticate,
    handler: productController.createProduct
  });

  fastify.put('/api/products/:id', {
    preHandler: authenticate,
    handler: productController.updateProduct
  });
}

module.exports = productRoutes;
