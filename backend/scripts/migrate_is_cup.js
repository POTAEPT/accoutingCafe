const { pool } = require('../src/db');

const run = async () => {
  try {
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS is_cup BOOLEAN DEFAULT TRUE');
    await pool.query('UPDATE products SET is_cup = TRUE WHERE is_cup IS NULL');
    await pool.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS is_cup BOOLEAN DEFAULT TRUE');
    await pool.query('UPDATE transaction_items SET is_cup = TRUE WHERE is_cup IS NULL');
    console.log('✅ is_cup migration completed');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
