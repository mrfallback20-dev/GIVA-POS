import * as XLSX from 'xlsx';
import {
  calculateQuarterlyPnL,
  convertCurrency,
  CurrencyType,
  ExpenseItem,
  PnLSummary,
  SaleTransaction,
} from './pos-logic';

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

const sym = (c: CurrencyType) => (c === 'ZiG' ? 'ZiG ' : '$');

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

/** Builds the 3-sheet workbook and triggers a browser download (no server needed). */
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
    ['Total Operating Expenses', pnl.totalExpenses, 'Shop overhead & freight'],
    ['NET PROFIT / (LOSS)', pnl.netProfit, `${pnl.netMarginPct}% Net Margin`],
    [],
    ['Total Transactions', pnl.transactionCount, 'Orders completed'],
    ['Total Units Sold', pnl.itemsSold, 'Stock units deducted'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Executive Summary');

  const salesRows: (string | number)[][] = [
    [
      'Receipt', 'Date & Time', 'Cashier', 'Payment', 'Sale Currency', 'Bank Rate (ZiG/USD)',
      'Product', 'Barcode', 'Qty', `Unit Cost (${cur})`, `Unit Price (${cur})`,
      `Line Subtotal (${cur})`, `Line Gross Profit (${cur})`,
    ],
  ];
  [...sales]
    .filter((s) => {
      const t = new Date(s.createdAt).getTime();
      return t >= startTs && t <= endTs; // ledger matches the selected quarter
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .forEach((s) => {
      const rate = s.bankRate || bankRate;
      s.items.forEach((it) => {
        const unitCost = convertCurrency(it.unitCost, s.currency, currency, rate);
        const unitPrice = convertCurrency(it.unitPrice, s.currency, currency, rate);
        const subtotal = convertCurrency(it.subtotal, s.currency, currency, rate);
        salesRows.push([
          s.receiptNo || String(s.id), s.createdAt, s.cashierName || '', s.paymentMethod, s.currency, rate,
          it.name, it.barcode, it.quantity, unitCost, unitPrice, subtotal,
          Number((subtotal - unitCost * it.quantity).toFixed(2)),
        ]);
      });
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesRows), 'Itemized Sales Ledger');

  const expRows: (string | number)[][] = [
    ['Date', 'Category', 'Description', 'Original Amount', 'Currency', `Amount (${cur})`],
  ];
  expenses
    .filter((e) => {
      const t = new Date(`${e.expenseDate}T12:00:00.000Z`).getTime();
      return t >= startTs && t <= endTs;
    })
    .sort((a, b) => (a.expenseDate < b.expenseDate ? -1 : 1))
    .forEach((e) => {
      const ec: CurrencyType = e.currency || 'USD';
      expRows.push([e.expenseDate, e.category, e.description, e.amount, ec, convertCurrency(e.amount, ec, currency, bankRate)]);
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expRows), 'Operating Expenses');

  // writeFile triggers a download in browsers / installed PWAs / Android WebView
  XLSX.writeFile(wb, `GIVA_PnL_${year}_${quarter}_${currency}.xlsx`);
}
