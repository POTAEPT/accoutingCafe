const reportService = require('../services/reportService');

async function reportRoutes(fastify, options) {
  
  fastify.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify(); } catch (err) { reply.send(err); }
  });

  fastify.get('/api/reports/daily-summary', async (request, reply) => {
    const { date } = request.query;

    if (!date) {
      return reply.code(400).send({ error: 'กรุณาระบุวันที่ (?date=YYYY-MM-DD)' });
    }

    try {
      // เรียกใช้ Service ตัวเดียวจบ ไม่ต้องรู้ว่าข้างในทำยังไง
      const pdfBuffer = await reportService.generateDailySummaryPDF(date, request.user.username);

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="Summary_${date}.pdf"`);
      return reply.send(pdfBuffer);
    } catch (err) {
      console.error(err);
      fastify.log.error(err);
      return reply.code(500).send({ error: 'System error' });
    }
  });

  fastify.get('/api/reports/period-summary', async (request, reply) => {
    const { startDate, endDate } = request.query;

    if (!startDate || !endDate) {
      return reply.code(400).send({ error: 'กรุณาระบุวันที่เริ่มต้นและวันที่สิ้นสุด' });
    }

    try {
      const pdfBuffer = await reportService.generatePeriodSummaryPDF(startDate, endDate, request.user.username);

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="Period_${startDate}_to_${endDate}.pdf"`);
      return reply.send(pdfBuffer);
    } catch (err) {
      console.error(err);
      fastify.log.error(err);
      return reply.code(500).send({ error: 'System error' });
    }
  });

  fastify.get('/api/reports/batch-receipts', async (request, reply) => {
    const { startDate, endDate } = request.query;

    if (!startDate || !endDate) {
      return reply.code(400).send({ error: 'กรุณาระบุวันที่เริ่มต้นและวันที่สิ้นสุด' });
    }

    try {
      const pdfBuffer = await reportService.generateBatchReceiptsPDF(startDate, endDate, request.user.username);
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="batch_receipts_${startDate}_to_${endDate}.pdf"`);
      return reply.send(pdfBuffer);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'System error';
      fastify.log.error(err);
      return reply.code(statusCode).send({ error: message });
    }
  });
}

module.exports = reportRoutes;