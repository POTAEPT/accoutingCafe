const { pool } = require('./dbProvider');

const listAddons = async () => {
  const result = await pool.query('SELECT * FROM addons ORDER BY category, name');
  return result.rows;
};

const createAddon = async ({ name, price, category }) => {
  const result = await pool.query(
    'INSERT INTO addons (name, price, category) VALUES ($1, $2, $3) RETURNING *',
    [name, price, category]
  );
  return result.rows[0];
};

const updateAddon = async (id, { name, price, category }) => {
  const result = await pool.query(
    `UPDATE addons
     SET name = COALESCE($2, name),
         price = COALESCE($3, price),
         category = COALESCE($4, category)
     WHERE id = $1
     RETURNING *`,
    [id, name, price, category]
  );
  return result.rows[0];
};

const deleteAddon = async (id) => {
  const result = await pool.query(
    'DELETE FROM addons WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
};

module.exports = {
  listAddons,
  createAddon,
  updateAddon,
  deleteAddon
};
