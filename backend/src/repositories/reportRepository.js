const { pool } = require('./dbProvider'); // ดึง pool ที่เราทำไว้ตอนแรก

const getDailySummaryData = async (date) => {
  // 1. ดึงยอดเงินรวมแยกตามประเภท
  const paymentQuery = `
    SELECT payment_method, SUM(total_amount) as total 
    FROM transactions 
    WHERE DATE(created_at) = $1 AND status = 'COMPLETED'
    GROUP BY payment_method
  `;
  
  // 2. ดึงยอดขายแยกตามเมนูสินค้า
  const itemQuery = `
    SELECT product_name, SUM(quantity) as total_qty, SUM(subtotal) as total_amount
    FROM transaction_items 
    WHERE transaction_id IN (
        SELECT id FROM transactions WHERE DATE(created_at) = $1 AND status = 'COMPLETED'
    )
    GROUP BY product_name
    ORDER BY total_qty DESC
  `;

  const [payments, items] = await Promise.all([
    pool.query(paymentQuery, [date]),
    pool.query(itemQuery, [date])
  ]);

  return { 
    payments: payments.rows, 
    items: items.rows 
  };
};

const getPeriodSummaryData = async (startDate, endDate) => {
  const paymentQuery = `
    SELECT payment_method, SUM(total_amount) as total
    FROM transactions
    WHERE DATE(created_at) BETWEEN $1 AND $2 AND status = 'COMPLETED'
    GROUP BY payment_method
  `;

  const itemQuery = `
    SELECT product_name, SUM(quantity) as total_qty, SUM(subtotal) as total_amount
    FROM transaction_items
    WHERE transaction_id IN (
        SELECT id FROM transactions WHERE DATE(created_at) BETWEEN $1 AND $2 AND status = 'COMPLETED'
    )
    GROUP BY product_name
    ORDER BY total_qty DESC
  `;

  const [payments, items] = await Promise.all([
    pool.query(paymentQuery, [startDate, endDate]),
    pool.query(itemQuery, [startDate, endDate])
  ]);

  return {
    payments: payments.rows,
    items: items.rows
  };
};

module.exports = { getDailySummaryData, getPeriodSummaryData };