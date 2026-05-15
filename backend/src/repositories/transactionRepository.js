const { pool } = require('./dbProvider');
const getTransactionByReceiptNo = async (receiptNo) => {
  const result = await pool.query('SELECT * FROM transactions WHERE receipt_no = $1', [receiptNo]);
  return result.rows[0];
};

const getTransactionById = async (id, db) => {
  const client = db || pool;
  const result = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
  return result.rows[0];
};

const getItemsByTransactionId = async (transactionId) => {
  const result = await pool.query(
    'SELECT * FROM transaction_items WHERE transaction_id = $1',
    [transactionId]
  );
  return result.rows;
};

const countTransactionsByDate = async (db, dbDateStr) => {
  const result = await db.query(
    'SELECT count(*) FROM transactions WHERE DATE(created_at) = $1',
    [dbDateStr]
  );
  return parseInt(result.rows[0].count, 10);
};

const insertTransaction = async (db, { receipt_no, total_amount, payment_method, created_at }) => {
  const insertTxQuery = `
    INSERT INTO transactions (receipt_no, total_amount, payment_method, status, created_at)
    VALUES ($1, $2, $3, 'COMPLETED', $4) RETURNING id
  `;
  const result = await db.query(insertTxQuery, [
    receipt_no,
    total_amount,
    payment_method,
    created_at
  ]);
  return result.rows[0];
};

const insertTransactionItem = async (db, item) => {
  const insertItemQuery = `
    INSERT INTO transaction_items (transaction_id, product_name, product_variant, sweetness, quantity, unit_price, subtotal)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  await db.query(insertItemQuery, [
    item.transaction_id,
    item.product_name,
    item.product_variant,
    item.sweetness,
    item.quantity,
    item.unit_price,
    item.subtotal
  ]);
};

const findByReceiptNo = async (receiptNo) => {
  const query = 'SELECT * FROM transactions WHERE receipt_no = $1';
  const result = await pool.query(query, [receiptNo]);
  return result.rows[0];
};

const updateStatus = async (id, status) => {
    const query = 'UPDATE transactions SET status = $2 WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id, status]);
    return result.rows[0];
};

const listTransactionsByDate = async ({ date, startDate, endDate }) => {
  if (startDate && endDate) {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE DATE(created_at) BETWEEN $1 AND $2 ORDER BY created_at DESC',
      [startDate, endDate]
    );
    return result.rows;
  }

  if (date) {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE DATE(created_at) = $1 ORDER BY created_at DESC',
      [date]
    );
    return result.rows;
  }

  const result = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
  return result.rows;
};

const deleteItemsByTransactionId = async (db, transactionId) => {
  await db.query('DELETE FROM transaction_items WHERE transaction_id = $1', [transactionId]);
};

const deleteTransactionById = async (db, transactionId) => {
  await db.query('DELETE FROM transactions WHERE id = $1', [transactionId]);
};

module.exports = {
  getTransactionByReceiptNo,
  getItemsByTransactionId,
  countTransactionsByDate,
  insertTransaction,
  insertTransactionItem,
  getTransactionById,
  findByReceiptNo,
  updateStatus,
  listTransactionsByDate,
  deleteItemsByTransactionId,
  deleteTransactionById
};


