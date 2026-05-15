const { pool } = require('../db');

const getDb = (client) => client || pool;

module.exports = {
  getDb,
  pool
};
