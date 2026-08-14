import { jsPDF } from 'jspdf';
import { formatVnd } from './money.js';
import { formatReceiptWhen, receiptViewModel } from './posReceipt.js';
import robotoRegularUrl from '../assets/fonts/Roboto-Regular.ttf?url';
import robotoBoldUrl from '../assets/fonts/Roboto-Bold.ttf?url';

const MARGIN = 12;
const PAGE_BOTTOM = 18;
let cachedFonts = null;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadFonts() {
  if (cachedFonts) return cachedFonts;
  const [regularRes, boldRes] = await Promise.all([
    fetch(robotoRegularUrl),
    fetch(robotoBoldUrl),
  ]);
  const [regularBuf, boldBuf] = await Promise.all([
    regularRes.arrayBuffer(),
    boldRes.arrayBuffer(),
  ]);
  cachedFonts = {
    regular: arrayBufferToBase64(regularBuf),
    bold: arrayBufferToBase64(boldBuf),
  };
  return cachedFonts;
}

function registerFonts(doc, fonts) {
  doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', fonts.bold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  doc.setFont('Roboto', 'normal');
}

function ensureSpace(doc, y, needed) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed <= pageHeight - PAGE_BOTTOM) return y;
  doc.addPage();
  return MARGIN;
}

function drawRule(doc, y, pageWidth) {
  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
}

export async function buildReceiptPdf(order) {
  const receipt = receiptViewModel(order);
  const fonts = await loadFonts();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  registerFonts(doc, fonts);

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(16);
  doc.text(receipt.brand, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(9);
  const headerLines = [receipt.branchName, receipt.branchAddress, receipt.branchPhone ? `Tel: ${receipt.branchPhone}` : '']
    .filter(Boolean);
  for (const line of headerLines) {
    const wrapped = doc.splitTextToSize(line, contentWidth);
    doc.text(wrapped, pageWidth / 2, y, { align: 'center' });
    y += wrapped.length * 4;
  }

  y += 2;
  drawRule(doc, y, pageWidth);
  y += 6;

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.text('INVOICE', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(9);
  const meta = [
    ['Invoice', receipt.invoiceCode || '—'],
    ['Date', formatReceiptWhen(receipt.createdAt)],
    ['Cashier', receipt.cashierName || '—'],
    ['Customer', receipt.walkIn ? 'Walk-in' : receipt.customerName],
  ];
  if (receipt.customerPhone) {
    meta.push(['Phone', receipt.customerPhone]);
  }
  for (const [label, value] of meta) {
    y = ensureSpace(doc, y, 5);
    doc.setFont('Roboto', 'normal');
    doc.text(label, MARGIN, y);
    doc.setFont('Roboto', 'bold');
    doc.text(String(value), pageWidth - MARGIN, y, { align: 'right' });
    y += 5;
  }

  y += 1;
  drawRule(doc, y, pageWidth);
  y += 6;

  const qtyX = pageWidth - MARGIN - 62;
  const unitX = pageWidth - MARGIN - 34;
  const amountX = pageWidth - MARGIN;
  const nameWidth = qtyX - MARGIN - 2;

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.text('Item', MARGIN, y);
  doc.text('Qty', qtyX, y, { align: 'right' });
  doc.text('Price', unitX, y, { align: 'right' });
  doc.text('Amount', amountX, y, { align: 'right' });
  y += 3;
  drawRule(doc, y, pageWidth);
  y += 5;

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);
  for (const line of receipt.lines) {
    const nameLines = doc.splitTextToSize(line.name || '—', nameWidth);
    y = ensureSpace(doc, y, nameLines.length * 4 + 1);
    doc.text(nameLines, MARGIN, y);
    doc.text(String(line.quantity), qtyX, y, { align: 'right' });
    doc.text(formatVnd(line.unitPrice), unitX, y, { align: 'right' });
    doc.text(formatVnd(line.lineTotal), amountX, y, { align: 'right' });
    y += nameLines.length * 4 + 1;
  }

  y += 1;
  y = ensureSpace(doc, y, 28);
  drawRule(doc, y, pageWidth);
  y += 6;

  const totals = [
    ['Subtotal', formatVnd(receipt.subtotal)],
  ];
  if (receipt.discountAmount > 0) {
    totals.push(['Discount', `−${formatVnd(receipt.discountAmount)}`]);
  }
  totals.push(['Total', formatVnd(receipt.total)]);
  totals.push(['Payment', receipt.paymentLabel]);
  if (receipt.isCash) {
    totals.push(['Cash received', formatVnd(receipt.cashReceived)]);
    totals.push(['Change', formatVnd(receipt.changeAmount)]);
  }
  if (receipt.pointsRedeemed > 0) {
    totals.push(['Points redeemed', String(receipt.pointsRedeemed)]);
  }
  if (receipt.pointsEarned > 0) {
    totals.push(['Points earned', String(receipt.pointsEarned)]);
  }

  for (const [label, value] of totals) {
    y = ensureSpace(doc, y, 5);
    const isTotal = label === 'Total';
    doc.setFont('Roboto', isTotal ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 10 : 9);
    doc.text(label, MARGIN, y);
    doc.text(value, amountX, y, { align: 'right' });
    y += isTotal ? 6 : 5;
  }

  y = ensureSpace(doc, y, 12);
  y += 4;
  drawRule(doc, y, pageWidth);
  y += 7;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(9);
  doc.text('Thank you for shopping with us.', pageWidth / 2, y, { align: 'center' });

  return doc;
}

export async function openReceiptPdf(order, reservedWindow = null) {
  try {
    const doc = await buildReceiptPdf(order);
    const url = doc.output('bloburl');
    if (reservedWindow && !reservedWindow.closed) {
      reservedWindow.location = url;
      reservedWindow.focus();
      return { opened: true, url };
    }
    const win = typeof window === 'undefined' ? null : window.open(url, '_blank');
    return { opened: Boolean(win), url };
  } catch (error) {
    if (reservedWindow && !reservedWindow.closed) {
      reservedWindow.close();
    }
    throw error;
  }
}

export function reserveReceiptWindow() {
  if (typeof window === 'undefined') return null;
  const win = window.open('about:blank', '_blank');
  if (!win) return null;
  try {
    win.document.write(
      '<!doctype html><title>Receipt</title><body style="font-family:sans-serif;padding:24px;color:#334155">Generating receipt…</body>',
    );
    win.document.close();
  } catch {
    // Ignore if the blank tab is not writable.
  }
  return win;
}
