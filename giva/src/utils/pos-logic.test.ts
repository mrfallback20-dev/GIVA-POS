import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  calculateChange,
  calculateUnitMargin,
  getStockStatus,
  calculateQuarterlyPnL,
  convertCurrency,
  formatCurrency,
  DEFAULT_ZIG_BANK_RATE,
  CartItem,
  SaleTransaction,
  ExpenseItem,
} from './pos-logic';

test('convertCurrency handles USD and ZiG conversions at official bank rate of 1 USD = 40 ZiG', () => {
  const bankRate = DEFAULT_ZIG_BANK_RATE; // 1 USD = 40.00 ZiG
  assert.equal(bankRate, 40.0);

  const usdAmount = 10;
  const zigAmount = convertCurrency(usdAmount, 'USD', 'ZiG', bankRate);
  assert.equal(zigAmount, 400.0);

  const backToUsd = convertCurrency(400.0, 'ZiG', 'USD', bankRate);
  assert.equal(backToUsd, 10.0);
});

test('formatCurrency outputs correct currency symbols for USD and ZiG', () => {
  assert.equal(formatCurrency(15.5, 'USD'), '$15.50');
  assert.equal(formatCurrency(400, 'ZiG'), 'ZiG 400.00');
});

test('calculateCartTotals computes subtotal, item count and estimated margins', () => {
  const items: CartItem[] = [
    {
      id: 1,
      barcode: '6001001',
      name: 'Bennetts Hair & Body Wash',
      sellingPrice: 8, // USD
      costPrice: 4.5, // USD
      quantity: 2,
      category: 'Baby Creams, Oils & Lotions',
    },
    {
      id: 2,
      barcode: '6001002',
      name: 'Epimax Baby & Junior Cream',
      sellingPrice: 15,
      costPrice: 9,
      quantity: 1,
      category: 'Baby Creams, Oils & Lotions',
    },
  ];

  const result = calculateCartTotals(items);
  assert.equal(result.totalAmount, 31); // 8*2 + 15*1 = 31
  assert.equal(result.totalItems, 3);
  assert.equal(result.estimatedCost, 18); // 4.5*2 + 9*1 = 18
  assert.equal(result.estimatedMargin, 13); // 31 - 18 = 13
});

test('calculateChange handles exact and overpayment', () => {
  assert.equal(calculateChange(31, 50), 19);
  assert.equal(calculateChange(31, 31), 0);
  assert.equal(calculateChange(31, 20), 0);
});

test('calculateUnitMargin calculates profit margin and percentage', () => {
  const res = calculateUnitMargin(10, 20);
  assert.equal(res.unitMargin, 10);
  assert.equal(res.marginPct, 50.0);
});

test('getStockStatus returns correct stock health thresholds with default and custom low stock levels', () => {
  assert.equal(getStockStatus(0).status, 'OUT_OF_STOCK');
  assert.equal(getStockStatus(3).status, 'LOW_STOCK');
  assert.equal(getStockStatus(5).status, 'LOW_STOCK');
  assert.equal(getStockStatus(15).status, 'IN_STOCK');

  // Custom threshold test (e.g. threshold = 10 for fast-moving items)
  assert.equal(getStockStatus(8, 10).status, 'LOW_STOCK');
  assert.equal(getStockStatus(12, 10).status, 'IN_STOCK');
});

test('calculateQuarterlyPnL computes Q4 revenue, COGS, expenses, and net profit in USD and ZiG', () => {
  const mockSales: SaleTransaction[] = [
    {
      id: 1,
      totalAmount: 50,
      paymentMethod: 'CASH',
      createdAt: '2026-10-15T10:00:00.000Z',
      currency: 'USD',
      bankRate: 40.0,
      items: [
        {
          productId: 1,
          barcode: '6001001',
          name: 'Bennetts Wash',
          quantity: 2,
          unitCost: 15,
          unitPrice: 25,
          subtotal: 50,
        },
      ],
    },
  ];

  const mockExpenses: ExpenseItem[] = [
    {
      id: 1,
      description: 'Store Electricity & Terminal Data',
      amount: 10,
      expenseDate: '2026-10-20',
      category: 'Utilities',
      currency: 'USD',
    },
  ];

  // P&L in USD
  const pnlUsd = calculateQuarterlyPnL(mockSales, mockExpenses, 2026, 'Q4', 'USD', 40.0);
  assert.equal(pnlUsd.totalRevenue, 50);
  assert.equal(pnlUsd.totalCogs, 30);
  assert.equal(pnlUsd.grossProfit, 20);
  assert.equal(pnlUsd.totalExpenses, 10);
  assert.equal(pnlUsd.netProfit, 10);
  assert.equal(pnlUsd.netMarginPct, 20.0);

  // P&L in ZiG at 40.0
  const pnlZig = calculateQuarterlyPnL(mockSales, mockExpenses, 2026, 'Q4', 'ZiG', 40.0);
  assert.equal(pnlZig.totalRevenue, 2000.0); // 50 * 40
  assert.equal(pnlZig.totalCogs, 1200.0);   // 30 * 40
  assert.equal(pnlZig.grossProfit, 800.0);
  assert.equal(pnlZig.totalExpenses, 400.0); // 10 * 40
  assert.equal(pnlZig.netProfit, 400.0);
});
