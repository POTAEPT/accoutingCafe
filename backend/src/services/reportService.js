const ejs = require('ejs');
const path = require('path');
const { chromium } = require('playwright');
const reportRepo = require('../repositories/reportRepository');

const formatMoney = (value) => {
  const amount = Number(value) || 0;
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const variantLabels = {
  hot: 'ร้อน',
  iced: 'เย็น',
  frappe: 'ปั่น',
  regular: 'ปกติ'
};

const normalizeDetailParts = (parts, baseName) => {
  if (!baseName) return parts;
  return parts.filter((part) => part && !baseName.includes(part));
};

const appendToExistingDetails = (baseName, partsToAdd) => {
  if (!partsToAdd.length) return baseName;
  const start = baseName.indexOf('(');
  const end = baseName.lastIndexOf(')');
  if (start === -1 || end === -1 || end <= start) {
    return `${baseName} (${partsToAdd.join(', ')})`;
  }
  const head = baseName.slice(0, end);
  const tail = baseName.slice(end);
  return `${head}, ${partsToAdd.join(', ')}${tail}`;
};

const formatReceiptItems = (items) => {
  return items.map((item) => {
    const variantLabel = item.product_variant ? (variantLabels[item.product_variant] || item.product_variant) : '';
    const sweetnessLabel = item.sweetness ? `หวาน ${item.sweetness}%` : '';
    const detailParts = [variantLabel, sweetnessLabel].filter(Boolean);
    const filteredParts = normalizeDetailParts(detailParts, item.product_name || '');
    const hasDetails = (item.product_name || '').includes('(') && (item.product_name || '').includes(')');
    const displayName = hasDetails
      ? appendToExistingDetails(item.product_name, filteredParts)
      : `${item.product_name}${filteredParts.length ? ` (${filteredParts.join(', ')})` : ''}`;
    return {
      ...item,
      display_name: displayName
    };
  });
};

const extractReceiptParts = (html) => {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const linkTags = html.match(/<link[^>]+>/gi) || [];
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return {
    styles: styleMatch ? styleMatch[1] : '',
    links: linkTags.join('\n'),
    body: bodyMatch ? bodyMatch[1] : html
  };
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

const generateBatchReceiptsPDF = async (startDate, endDate, username) => {
  const { transactions, itemsByTransactionId } = await reportRepo.getBatchReceiptsData(startDate, endDate);
  if (!transactions.length) {
    const error = new Error('ไม่พบรายการบิลในช่วงวันที่นี้');
    error.statusCode = 404;
    throw error;
  }

  const templatePath = path.join(__dirname, '../templates/receipt.ejs');
  const receiptHtmlList = [];

  for (const transaction of transactions) {
    const items = itemsByTransactionId[transaction.id] || [];
    const formattedItems = formatReceiptItems(items);
    const templateData = {
      date: new Date(transaction.created_at).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      receipt_no: transaction.receipt_no,
      recorder: username || '-',
      items: formattedItems,
      total_amount: transaction.total_amount,
      payment_method: transaction.payment_method === 'TRANSFER' ? 'เงินโอน (PromptPay)' : 'เงินสด'
    };

    const htmlContent = await ejs.renderFile(templatePath, templateData);
    receiptHtmlList.push(htmlContent);
  }

  const { styles, links } = extractReceiptParts(receiptHtmlList[0]);
  const receiptBodies = receiptHtmlList
    .map((receiptHtml) => {
      const { body } = extractReceiptParts(receiptHtml);
      return `<section class="receipt-container">${body}</section>`;
    })
    .join('<div class="page-break"></div>');

  const masterHtml = `<!DOCTYPE html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <title>Batch Receipts</title>
    ${links}
    <style>
      ${styles}
      body { margin: 0; font-family: 'Sarabun', sans-serif; }
      body, table, th, td { font-family: 'Sarabun', sans-serif !important; }
      .receipt-container { margin: 40px; }
      .page-break { page-break-after: always; }
    </style>
  </head>
  <body>
    ${receiptBodies}
  </body>
</html>`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(masterHtml, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' }
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

module.exports = { generateDailySummaryPDF, generatePeriodSummaryPDF, generateBatchReceiptsPDF };