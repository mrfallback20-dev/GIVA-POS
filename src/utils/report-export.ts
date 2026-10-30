import * as XLSX from 'xlsx';
import {
  calculateQuarterlyPnL,
  convertCurrency,
  CurrencyType,
  ExpenseItem,
  PnLSummary,
  SaleTransaction,
  formatCurrency,
} from './pos-logic';
import { Product } from '../data/inventorySeed';
import { showToast } from './toast';

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

const sym = (c: CurrencyType) => (c === 'ZiG' ? 'ZiG ' : '$');

/**
 * Universal browser file downloader that works reliably across:
 * - Desktop browsers
 * - Mobile Chrome / Safari
 * - Web iframes and preview environments
 */
export function triggerFileDownload(
  content: ArrayBuffer | Uint8Array | string,
  filename: string,
  mimeType: string
): void {
  try {
    const blob =
      typeof content === 'string'
        ? new Blob([content], { type: mimeType })
        : new Blob([content as any], { type: mimeType });

    // Method 1: Blob URL with temporary <a> element
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 1500);

    showToast(`✓ Downloaded ${filename}`, 'success');
  } catch (err) {
    console.warn('Blob URL download failed, trying data-uri fallback:', err);
    try {
      // Method 2: Data URI Fallback
      if (typeof content === 'string') {
        const encoded = encodeURIComponent(content);
        const dataUri = `data:${mimeType};charset=utf-8,${encoded}`;
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`✓ Downloaded ${filename}`, 'success');
      } else {
        // Fallback for binary array
        const u8 = new Uint8Array(content as any);
        let binary = '';
        for (let i = 0; i < u8.length; i++) {
          binary += String.fromCharCode(u8[i]);
        }
        const base64 = btoa(binary);
        const a = document.createElement('a');
        a.href = `data:${mimeType};base64,${base64}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`✓ Downloaded ${filename}`, 'success');
      }
    } catch (fallbackErr) {
      console.error('All download methods failed:', fallbackErr);
      showToast('Download blocked by browser iframe. Please allow file downloads.', 'error');
    }
  }
}

/** 58mm (32 char) accounting slip, built on-device so it works offline. */
export function buildThermalPnLText(pnl: PnLSummary): string {
  const s = sym(pnl.currency);
  return `
================================
      GIVA LIVING & BABY
  For Your Home. For Your Baby.
================================
QUARTERLY PROFIT & LOSS REPORT
Year: ${pnl.year}   Quarter: ${pnl.quarter}
Period: ${pnl.startDate} to ${pnl.endDate}
Currency: ${pnl.currency} (Rate: 1 USD = ${pnl.bankRate.toFixed(2)} ZiG)
Generated: ${new Date().toLocaleString()}
--------------------------------
Total Revenue:    ${s}${pnl.totalRevenue.toFixed(2)}
COGS (Stock):     ${s}${pnl.totalCogs.toFixed(2)}
--------------------------------
GROSS PROFIT:     ${s}${pnl.grossProfit.toFixed(2)}
Gross Margin:     ${pnl.grossMarginPct}%
--------------------------------
Operating Exp:    ${s}${pnl.totalExpenses.toFixed(2)}
--------------------------------
NET PROFIT/LOSS:  ${s}${pnl.netProfit.toFixed(2)}
Net Margin:       ${pnl.netMarginPct}%
--------------------------------
Sales Trx Count:  ${pnl.transactionCount}
Total Items Sold: ${pnl.itemsSold}
================================
  Printed from GIVA Manager
  Store Owner Financial Copy
================================
`;
}

/** Builds the 3-sheet quarterly P&L Excel workbook and triggers download */
export function downloadQuarterlyExcel(
  sales: SaleTransaction[],
  expenses: ExpenseItem[],
  year: number,
  quarter: Quarter,
  currency: CurrencyType,
  bankRate: number
): void {
  const pnl = calculateQuarterlyPnL(sales, expenses, year, quarter, currency, bankRate);
  const cur = sym(currency).trim();
  const startTs = new Date(`${pnl.startDate}T00:00:00.000Z`).getTime();
  const endTs = new Date(`${pnl.endDate}T23:59:59.999Z`).getTime();

  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const summaryRows: (string | number)[][] = [
    ['GIVA LIVING & BABY - QUARTERLY FINANCIAL STATEMENT'],
    ['For your Home. For your baby for His glory.'],
    ['Report Period:', `${quarter} ${year} (${pnl.startDate} to ${pnl.endDate})`],
    ['Reporting Currency:', currency],
    ['Official RBZ Bank Rate:', `1 USD = ${bankRate.toFixed(2)} ZiG`],
    ['Generated On:', new Date().toLocaleString()],
    [],
    ['FINANCIAL METRIC', `AMOUNT (${cur})`, 'PERCENTAGE / NOTES'],
    ['Gross Sales Revenue', pnl.totalRevenue, '100.0%'],
    [
      'Cost of Goods Sold (COGS)',
      pnl.totalCogs,
      `${(pnl.totalRevenue > 0 ? (pnl.totalCogs / pnl.totalRevenue) * 100 : 0).toFixed(1)}% of Revenue`,
    ],
    ['GROSS PROFIT', pnl.grossProfit, `${pnl.grossMarginPct}% Gross Margin`],
    [],
    ['Total Operating Expenses', pnl.totalExpenses, 'Shop overhead, rent, logistics'],
    ['NET PROFIT / (LOSS)', pnl.netProfit, `${pnl.netMarginPct}% Net Margin`],
    [],
    ['Total Transactions', pnl.transactionCount, 'Customer receipts processed'],
    ['Total Units Sold', pnl.itemsSold, 'Stock inventory deducted'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Executive Summary');

  // Sheet 2: Itemized Sales Ledger
  const salesRows: (string | number)[][] = [
    [
      'Receipt #',
      'Date & Time',
      'Cashier',
      'Payment Method',
      'Sale Currency',
      'Bank Rate (ZiG/USD)',
      'Product Name',
      'Barcode',
      'Quantity',
      `Unit Cost (${cur})`,
      `Unit Price (${cur})`,
      `Line Subtotal (${cur})`,
      `Line Gross Profit (${cur})`,
    ],
  ];
  [...sales]
    .filter((s) => {
      const t = new Date(s.createdAt).getTime();
      return t >= startTs && t <= endTs;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .forEach((s) => {
      const rate = s.bankRate || bankRate;
      s.items.forEach((it) => {
        const unitCost = convertCurrency(it.unitCost, s.currency, currency, rate);
        const unitPrice = convertCurrency(it.unitPrice, s.currency, currency, rate);
        const subtotal = convertCurrency(it.subtotal, s.currency, currency, rate);
        salesRows.push([
          s.receiptNo || String(s.id),
          s.createdAt,
          s.cashierName || 'Cashier',
          s.paymentMethod,
          s.currency,
          rate,
          it.name,
          it.barcode,
          it.quantity,
          unitCost,
          unitPrice,
          subtotal,
          Number((subtotal - unitCost * it.quantity).toFixed(2)),
        ]);
      });
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesRows), 'Itemized Sales Ledger');

  // Sheet 3: Operating Expenses
  const expRows: (string | number)[][] = [
    ['Date', 'Category', 'Description', 'Original Amount', 'Currency', `Amount in ${currency}`],
  ];
  expenses
    .filter((e) => {
      const t = new Date(`${e.expenseDate}T12:00:00.000Z`).getTime();
      return t >= startTs && t <= endTs;
    })
    .sort((a, b) => (a.expenseDate < b.expenseDate ? -1 : 1))
    .forEach((e) => {
      const ec: CurrencyType = e.currency || 'USD';
      expRows.push([
        e.expenseDate,
        e.category,
        e.description,
        e.amount,
        ec,
        convertCurrency(e.amount, ec, currency, bankRate),
      ]);
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expRows), 'Operating Expenses');

  // Generate binary XLSX buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const filename = `GIVA_PnL_${year}_${quarter}_${currency}.xlsx`;
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  triggerFileDownload(excelBuffer, filename, mimeType);
}

/** Builds the full Inventory Stock catalog Excel workbook and triggers download */
export function downloadInventoryExcel(
  products: Product[],
  currency: CurrencyType,
  bankRate: number
): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Barcode',
    'Product Name',
    'Category',
    'Size / Volume Variant',
    'Current Stock Units',
    'Stock Status',
    'Cost Price (USD)',
    'Cost Price (ZiG)',
    'Selling Price (USD)',
    'Selling Price (ZiG)',
    'Unit Profit Margin (USD)',
    'Unit Margin (%)',
    'Total Stock Value (USD)',
    'Total Stock Value (ZiG)',
  ];

  const rows: (string | number)[][] = [
    ['GIVA LIVING & BABY - CENTRAL INVENTORY STOCK SHEET'],
    [`Exported On: ${new Date().toLocaleString()}`],
    [`Official RBZ Bank Rate: 1 USD = ${bankRate.toFixed(2)} ZiG`],
    [`Total Catalog Items: ${products.length}`],
    [],
    headers,
  ];

  products.forEach((p) => {
    const costUsd = p.costPrice || 0;
    const costZig = Number((costUsd * bankRate).toFixed(2));
    const priceUsd = p.sellingPriceUsd || p.sellingPrice || 0;
    const priceZig = Number((priceUsd * bankRate).toFixed(2));
    const marginUsd = Number((priceUsd - costUsd).toFixed(2));
    const marginPct = priceUsd > 0 ? Number(((marginUsd / priceUsd) * 100).toFixed(1)) : 0;
    const totalValUsd = Number((priceUsd * p.stockQuantity).toFixed(2));
    const totalValZig = Number((priceZig * p.stockQuantity).toFixed(2));

    const threshold = p.lowStockThreshold || 5;
    let status = 'Healthy Stock';
    if (p.stockQuantity <= 0) status = 'OUT OF STOCK';
    else if (p.stockQuantity <= threshold) status = `LOW STOCK (≤${threshold})`;

    rows.push([
      p.barcode,
      p.name,
      p.category,
      p.sizeVariant || 'Standard',
      p.stockQuantity,
      status,
      costUsd,
      costZig,
      priceUsd,
      priceZig,
      marginUsd,
      `${marginPct}%`,
      totalValUsd,
      totalValZig,
    ]);
  });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Stock Catalog');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const filename = `GIVA_Stock_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  triggerFileDownload(excelBuffer, filename, mimeType);
}
