const ejs = require('ejs');
const path = require('path');
const { chromium } = require('playwright');
const reportRepo = require('../repositories/reportRepository');

const formatMoney = (value) => {
  const amount = Number(value) || 0;
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const generateDailySummaryPDF = async (date, username) => {
  // 1. ไปเอาข้อมูลจาก Repository
  const { payments, items } = await reportRepo.getDailySummaryData(date);

  // 2. คำนวณ Logic บัญชีเพิ่มเติม (เช่น ยอดรวม Grand Total)
  const grandTotal = payments.reduce((acc, curr) => acc + parseFloat(curr.total), 0);
  const totalCups = items.reduce((acc, item) => acc + Number(item.total_qty_cup || 0), 0);
  const totalOthers = items.reduce((acc, item) => acc + Number(item.total_qty_other || 0), 0);
  const totalUnits = items.reduce((acc, item) => acc + Number(item.total_qty_all || 0), 0);
  const uniqueItemCount = items.length;
  const formattedDate = new Date(date).toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  const formattedPayments = payments.map((payment) => ({
    ...payment,
    total_formatted: formatMoney(payment.total)
  }));
  const formattedItems = items.map((item) => ({
    ...item,
    total_amount_formatted: formatMoney(item.total_amount)
  }));

  // 3. ประกอบร่าง Template
  const templatePath = path.join(__dirname, '../templates/daily_summary.ejs');
  const htmlContent = await ejs.renderFile(templatePath, {
    reportDate: formattedDate,
    payments: formattedPayments,
    items: formattedItems,
    grandTotal: formatMoney(grandTotal),
    totalCups,
    totalOthers,
    totalUnits,
    uniqueItemCount,
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

  const grandTotal = payments.reduce((acc, curr) => acc + parseFloat(curr.total), 0);
  const totalCups = items.reduce((acc, item) => acc + Number(item.total_qty_cup || 0), 0);
  const totalOthers = items.reduce((acc, item) => acc + Number(item.total_qty_other || 0), 0);
  const totalUnits = items.reduce((acc, item) => acc + Number(item.total_qty_all || 0), 0);
  const uniqueItemCount = items.length;
  const formattedPayments = payments.map((payment) => ({
    ...payment,
    total_formatted: formatMoney(payment.total)
  }));
  const formattedItems = items.map((item) => ({
    ...item,
    total_amount_formatted: formatMoney(item.total_amount)
  }));
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
    payments: formattedPayments,
    items: formattedItems,
    grandTotal: formatMoney(grandTotal),
    totalCups,
    totalOthers,
    totalUnits,
    uniqueItemCount,
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