const exportService = require('../services/exportService');

const exportReceipt = async (request, reply) => {
  const { receipt_no } = request.params || {};

  if (!receipt_no) {
    return reply.code(400).send({ error: 'กรุณาระบุเลขที่บิล' });
  }

  try {
    const pdfBuffer = await exportService.generateReceiptPdf({
      receiptNo: receipt_no,
      recorder: request.user?.username
    });

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${receipt_no}.pdf"`);
    return reply.send(pdfBuffer);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF';
    return reply.code(statusCode).send({ error: message });
  }
};

module.exports = {
  exportReceipt
};
