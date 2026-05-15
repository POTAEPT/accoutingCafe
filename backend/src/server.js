
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { connectDB } = require('./db.js');
require('dotenv').config();

fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
});


fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET
});

fastify.register(require('./routes/auth'));
fastify.register(require('./routes/transactions'))
fastify.register(require('./routes/export.js'))
fastify.register(require('./routes/reportRoutes'))
fastify.register(require('./routes/products'))
// -------------------------

fastify.get('/', async (request, reply) => {
  return { 
    status: 'OK', 
    message: 'Drink Sales API is running securely!',
    timestamp: new Date().toISOString()
  };
});
const start = async () => {
  try {
    await connectDB();
    

    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    console.log(`🚀 Server is listening on port ${process.env.PORT || 3000}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();