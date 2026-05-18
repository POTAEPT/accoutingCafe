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
    SELECT product_name,
      SUM(quantity) as total_qty_all,
      SUM(CASE WHEN COALESCE(is_cup, TRUE) THEN quantity ELSE 0 END) as total_qty_cup,
      SUM(CASE WHEN COALESCE(is_cup, TRUE) THEN 0 ELSE quantity END) as total_qty_other,
      SUM(subtotal) as total_amount
    FROM transaction_items 
    WHERE transaction_id IN (
        SELECT id FROM transactions WHERE DATE(created_at) = $1 AND status = 'COMPLETED'
    )
    GROUP BY product_name
    ORDER BY total_qty_all DESC
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
    SELECT product_name,
      SUM(quantity) as total_qty_all,
      SUM(CASE WHEN COALESCE(is_cup, TRUE) THEN quantity ELSE 0 END) as total_qty_cup,
      SUM(CASE WHEN COALESCE(is_cup, TRUE) THEN 0 ELSE quantity END) as total_qty_other,
      SUM(subtotal) as total_amount
    FROM transaction_items
    WHERE transaction_id IN (
        SELECT id FROM transactions WHERE DATE(created_at) BETWEEN $1 AND $2 AND status = 'COMPLETED'
    )
    GROUP BY product_name
    ORDER BY total_qty_all DESC
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

const getBatchReceiptsData = async (startDate, endDate) => {
  const transactionsQuery = `
    SELECT *
    FROM transactions
    WHERE DATE(created_at) BETWEEN $1 AND $2 AND status = 'COMPLETED'
    ORDER BY receipt_no ASC
  `;

  const transactionsResult = await pool.query(transactionsQuery, [startDate, endDate]);
  const transactions = transactionsResult.rows || [];
  if (!transactions.length) {
    return { transactions: [], itemsByTransactionId: {} };
  }

  const transactionIds = transactions.map((transaction) => transaction.id);
  const itemsQuery = `
    SELECT *
    FROM transaction_items
    WHERE transaction_id = ANY($1::uuid[])
    ORDER BY transaction_id, id
  `;
  const itemsResult = await pool.query(itemsQuery, [transactionIds]);
  const itemsByTransactionId = itemsResult.rows.reduce((acc, item) => {
    if (!acc[item.transaction_id]) {
      acc[item.transaction_id] = [];
    }
    acc[item.transaction_id].push(item);
    return acc;
  }, {});

  return { transactions, itemsByTransactionId };
};

module.exports = { getDailySummaryData, getPeriodSummaryData, getBatchReceiptsData };