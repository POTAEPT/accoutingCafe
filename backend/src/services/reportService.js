const ejs = require('ejs');
const path = require('path');
const { chromium } = require('playwright');
const reportRepo = require('../repositories/reportRepository');

const generateDailySummaryPDF = async (date, username) => {
  // 1. ไปเอาข้อมูลจาก Repository
  const { payments, items } = await reportRepo.getDailySummaryData(date);

  // 2. คำนวณ Logic บัญชีเพิ่มเติม (เช่น ยอดรวม Grand Total)
  const grandTotal = payments.reduce((acc, curr) => acc + parseFloat(curr.total), 0).toFixed(2);
  const formattedDate = new Date(date).toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  // 3. ประกอบร่าง Template
  const templatePath = path.join(__dirname, '../templates/daily_summary.ejs');
  const htmlContent = await ejs.renderFile(templatePath, {
    reportDate: formattedDate,
    payments,
    items,
    grandTotal,
    generatedBy: username
  });

  // 4. สั่ง Playwright ทำงาน
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({ 
    format: 'A4', 
    printBackground: true,
    margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' }
  });
  await browser.close();

  return pdfBuffer;
};

const generatePeriodSummaryPDF = async (startDate, endDate, username) => {
  const { payments, items } = await reportRepo.getPeriodSummaryData(startDate, endDate);

  const grandTotal = payments.reduce((acc, curr) => acc + parseFloat(curr.total), 0).toFixed(2);
  const formattedStart = new Date(startDate).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const formattedEnd = new Date(endDate).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const templatePath = path.join(__dirname, '../templates/period_summary.ejs');
  const htmlContent = await ejs.renderFile(templatePath, {
    reportStart: formattedStart,
    reportEnd: formattedEnd,
    payments,
    items,
    grandTotal,
    generatedBy: username
  });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' }
  });
  await browser.close();

  return pdfBuffer;
};

module.exports = { generateDailySummaryPDF, generatePeriodSummaryPDF };