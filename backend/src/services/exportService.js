const ejs = require('ejs');
const path = require('path');
const { chromium } = require('playwright');
const transactionRepository = require('../repositories/transactionRepository');

const generateReceiptPdf = async ({ receiptNo, recorder }) => {
  const transaction = await transactionRepository.getTransactionByReceiptNo(receiptNo);

  if (!transaction) {
    const error = new Error('ไม่พบบิลหมายเลขนี้');
    error.statusCode = 404;
    throw error;
  }

  const items = await transactionRepository.getItemsByTransactionId(transaction.id);
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
  const formattedItems = items.map((item) => {
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

  const templateData = {
    date: new Date(transaction.created_at).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    receipt_no: transaction.receipt_no,
    recorder: recorder || '-',
    items: formattedItems,
    total_amount: transaction.total_amount,
    payment_method: transaction.payment_method === 'TRANSFER' ? 'เงินโอน (PromptPay)' : 'เงินสด'
  };

  const templatePath = path.join(__dirname, '../templates/receipt.ejs');
  const htmlContent = await ejs.renderFile(templatePath, templateData);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

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

module.exports = {
  generateReceiptPdf
};
