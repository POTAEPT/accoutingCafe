const transactionService = require('../services/transactionService');

const createTransaction = async (request, reply) => {
  const { payment_method, items, record_date, manual_receipt_no } = request.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return reply.code(400).send({ error: 'ต้องมีรายการสินค้าอย่างน้อย 1 รายการ' });
  }

  try {
    const result = await transactionService.createTransaction({
      payment_method,
      items,
      record_date,
      manual_receipt_no
    });

    return reply.code(201).send({
      message: 'บันทึกบิลสำเร็จ',
      receipt_no: result.receipt_no,
      total_amount: result.total_amount
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
    return reply.code(statusCode).send({ error: message });
  }
};

const voidTransaction = async (request, reply) => {
  const { id } = request.params;
  try {
    const updated = await transactionService.voidTransaction(id);
    return { message: 'ยกเลิกบิลสำเร็จ', data: updated };
  } catch (err) {
    if (err.message === 'NOT_FOUND') return reply.code(404).send({ error: 'ไม่พบเลขที่บิลนี้' });
    if (err.message === 'ALREADY_VOIDED') return reply.code(400).send({ error: 'บิลนี้ถูกยกเลิกไปก่อนหน้านี้แล้ว' });

    request.log.error(err);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
};

const deleteTransaction = async (request, reply) => {
  const { id } = request.params;
  try {
    await transactionService.hardDeleteTransaction(id);
    return reply.send({ message: 'ลบรายการทดสอบสำเร็จ' });
  } catch (err) {
    if (err.message === 'NOT_FOUND') return reply.code(404).send({ error: 'ไม่พบเลขที่บิลนี้' });
    request.log.error(err);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
};

const getTransactions = async (request, reply) => {
  const { date, startDate, endDate } = request.query || {};
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (date && !datePattern.test(date)) {
    return reply.code(400).send({ error: 'รูปแบบวันที่ไม่ถูกต้อง' });
  }
  if ((startDate && !datePattern.test(startDate)) || (endDate && !datePattern.test(endDate))) {
    return reply.code(400).send({ error: 'รูปแบบวันที่ไม่ถูกต้อง' });
  }

  try {
    const transactions = await transactionService.getTransactions({ date, startDate, endDate });
    return reply.send({ data: transactions });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล';
    return reply.code(statusCode).send({ error: message });
  }
};

module.exports = {
  createTransaction,
  voidTransaction,
  getTransactions,
  deleteTransaction
};
