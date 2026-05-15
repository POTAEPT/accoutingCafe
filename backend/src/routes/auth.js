const authController = require('../controllers/authController');

async function authRoutes(fastify, options) {
  fastify.post('/api/auth/login', authController.login);
}

module.exports = authRoutes;