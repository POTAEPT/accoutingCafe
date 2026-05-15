const { pool } = require('./dbProvider');

const listActiveProducts = async () => {
  const result = await pool.query(
    'SELECT * FROM products WHERE is_active = TRUE ORDER BY category, name'
  );
  return result.rows;
};

const listAllProducts = async () => {
  const result = await pool.query('SELECT * FROM products ORDER BY category, name');
  return result.rows;
};

const createProduct = async ({ name, category, prices, has_sweetness, is_active }) => {
  const result = await pool.query(
    'INSERT INTO products (name, category, prices, has_sweetness, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, category, prices, has_sweetness, is_active]
  );
  return result.rows[0];
};

const updateProduct = async (id, { name, category, prices, has_sweetness, is_active }) => {
  const result = await pool.query(
    `UPDATE products
     SET name = COALESCE($2, name),
         category = COALESCE($3, category),
         prices = COALESCE($4, prices),
         has_sweetness = COALESCE($5, has_sweetness),
         is_active = COALESCE($6, is_active)
     WHERE id = $1
     RETURNING *`,
    [id, name, category, prices, has_sweetness, is_active]
  );
  return result.rows[0];
};

module.exports = {
  listActiveProducts,
  listAllProducts,
  createProduct,
  updateProduct
};
