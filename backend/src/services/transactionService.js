const { pool } = require('../db');
const { getDb } = require('../repositories/dbProvider');
const transactionRepository = require('../repositories/transactionRepository');

const createTransaction = async ({ payment_method, items, record_date, manual_receipt_no }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const targetDate = record_date ? new Date(record_date) : new Date();
    if (Number.isNaN(targetDate.getTime())) {
      const error = new Error('รูปแบบวันที่ไม่ถูกต้อง');
      error.statusCode = 400;
      throw error;
    }

    const dateStr = targetDate.toISOString().slice(0, 10).replace(/-/g, '');
    const dbDateStr = targetDate.toISOString().slice(0, 10);

    const db = getDb(client);
    let receipt_no;
    if (manual_receipt_no && String(manual_receipt_no).trim()) {
      receipt_no = String(manual_receipt_no).trim();
      const existing = await transactionRepository.getTransactionByReceiptNo(receipt_no, db);
      if (existing) {
        const error = new Error('เลขที่บิลซ้ำ');
        error.statusCode = 409;
        throw error;
      }
    } else {
      const count = await transactionRepository.countTransactionsByDate(db, dbDateStr);
      const orderNum = count + 1;
      receipt_no = `INV-${dateStr}-${String(orderNum).padStart(3, '0')}`;
    }

    let total_amount = 0;
    const normalizedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const unit_price = Number(item.unit_price);
      const subtotal = quantity * unit_price;
      total_amount += subtotal;

      return {
        product_name: item.product_name,
        product_variant: item.product_variant || null,
        sweetness: item.sweetness || null,
        is_cup: item.is_cup === undefined ? true : Boolean(item.is_cup),
        quantity,
        unit_price,
        subtotal
      };
    });

    const transaction = await transactionRepository.insertTransaction(db, {
      receipt_no,
      total_amount,
      payment_method,
      created_at: targetDate
    });
    const transaction_id = transaction.id;

    for (const item of normalizedItems) {
      await transactionRepository.insertTransactionItem(db, {
        transaction_id,
        product_name: item.product_name,
        product_variant: item.product_variant,
        sweetness: item.sweetness,
        is_cup: item.is_cup,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal
      });
    }

    await client.query('COMMIT');

    return {
      receipt_no,
      total_amount
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const voidTransaction = async (id) => {
  const transaction = await transactionRepository.getTransactionById(id);

  if (!transaction) {
    throw new Error('NOT_FOUND');
  }

  if (transaction.status === 'VOID') {
    throw new Error('ALREADY_VOIDED');
  }

  return transactionRepository.updateStatus(transaction.id, 'VOID');
};

const hardDeleteTransaction = async (id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const db = getDb(client);
    const existing = await transactionRepository.getTransactionById(id, db);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    await transactionRepository.deleteItemsByTransactionId(db, id);
    await transactionRepository.deleteTransactionById(db, id);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getTransactions = async ({ date, startDate, endDate }) => {
  return transactionRepository.listTransactionsByDate({ date, startDate, endDate });
};

const getTransactionItems = async (id) => {
  const transaction = await transactionRepository.getTransactionById(id);
  if (!transaction) {
    throw new Error('NOT_FOUND');
  }
  return transactionRepository.getItemsByTransactionId(id);
};

module.exports = {
  createTransaction,
  voidTransaction,
  getTransactions,
  hardDeleteTransaction,
  getTransactionItems
};
