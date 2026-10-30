/**
 * Pure business logic for GIVA Living & Baby POS & P&L Engine
 * Multi-Currency: USD ($) and ZiG / ZWL (Zimbabwe Gold) at Bank Interbank Rate
 */

export type CurrencyType = 'USD' | 'ZiG';

export const DEFAULT_ZIG_BANK_RATE = 40.0; // 1 USD = 40.00 ZiG / ZWL

export interface CartItem {
  id: number;
  barcode: string;
  name: string;
  sellingPrice: number; // in active currency
  costPrice: number;    // in active currency
  quantity: number;
  category: string;
  sizeVariant?: string;
  imageUrl?: string;
}

export interface ExpenseItem {
  id: number;
  description: string;
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  category: string;
  currency?: CurrencyType;
}

export interface SaleTransaction {
  id: number;
  receiptNo?: string;
  cashierName?: string;
  terminalId?: string;
  totalAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'SPLIT' | 'MOBILE_MONEY';
  amountTendered?: number;
  changeAmount?: number;
  createdAt: string;
  currency: CurrencyType;
  bankRate: number; // Stored snapshot of ZiG to USD bank rate at checkout
  items: {
    productId: number;
    barcode: string;
    name: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

export interface PnLSummary {
  year: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  startDate: string;
  endDate: string;
  currency: CurrencyType;
  bankRate: number;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPct: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPct: number;
  transactionCount: number;
  itemsSold: number;
}

/**
 * Converts value between USD and ZiG (ZWL) using the official bank rate
 */
export function convertCurrency(
  amount: number,
  from: CurrencyType,
  to: CurrencyType,
  bankRate: number = DEFAULT_ZIG_BANK_RATE
): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'ZiG') {
    return Number((amount * bankRate).toFixed(2));
  }
  if (from === 'ZiG' && to === 'USD') {
    return bankRate > 0 ? Number((amount / bankRate).toFixed(2)) : 0;
  }
  return amount;
}

/**
 * Calculates cart subtotal, total items, and gross profit estimate
 */
export function calculateCartTotals(items: CartItem[]): {
  totalAmount: number;
  totalItems: number;
  estimatedCost: number;
  estimatedMargin: number;
} {
  let totalAmount = 0;
  let totalItems = 0;
  let estimatedCost = 0;

  for (const item of items) {
    const qty = Math.max(0, item.quantity);
    totalAmount += item.sellingPrice * qty;
    totalItems += qty;
    estimatedCost += item.costPrice * qty;
  }

  return {
    totalAmount: Number(totalAmount.toFixed(2)),
    totalItems,
    estimatedCost: Number(estimatedCost.toFixed(2)),
    estimatedMargin: Number((totalAmount - estimatedCost).toFixed(2)),
  };
}

/**
 * Calculates cash change due in active currency
 */
export function calculateChange(totalAmount: number, amountTendered: number): number {
  if (amountTendered < totalAmount) return 0;
  return Number((amountTendered - totalAmount).toFixed(2));
}

/**
 * Computes unit margin and percentage
 */
export function calculateUnitMargin(costPrice: number, sellingPrice: number): {
  unitMargin: number;
  marginPct: number;
} {
  const margin = sellingPrice - costPrice;
  const pct = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;
  return {
    unitMargin: Number(margin.toFixed(2)),
    marginPct: Number(pct.toFixed(1)),
  };
}

/**
 * Categorizes stock health status with dynamic low stock threshold
 */
export function getStockStatus(stock: number, lowStockThreshold: number = 5): {
  status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
  color: string;
  label: string;
} {
  const threshold = Math.max(1, lowStockThreshold);
  if (stock <= 0) {
    return {
      status: 'OUT_OF_STOCK',
      color: 'text-rose-700 bg-rose-50 border-rose-300 ring-1 ring-rose-400/20',
      label: 'Out of Stock',
    };
  }
  if (stock <= threshold) {
    return {
      status: 'LOW_STOCK',
      color: 'text-amber-800 bg-amber-50 border-amber-300 ring-1 ring-amber-400/30',
      label: `Low Stock (≤${threshold})`,
    };
  }
  return {
    status: 'IN_STOCK',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
    label: 'In Stock',
  };
}

/**
 * Checks whether an item's current stock has fallen to or below the low stock threshold
 */
export function isLowStock(stock: number, lowStockThreshold: number = 5): boolean {
  const threshold = Math.max(1, lowStockThreshold);
  return stock > 0 && stock <= threshold;
}

/**
 * Computes date ranges for quarterly P&L
 */
export function getQuarterDateRange(year: number, quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'): {
  startDate: string;
  endDate: string;
} {
  switch (quarter) {
    case 'Q1':
      return { startDate: `${year}-01-01`, endDate: `${year}-03-31` };
    case 'Q2':
      return { startDate: `${year}-04-01`, endDate: `${year}-06-30` };
    case 'Q3':
      return { startDate: `${year}-07-01`, endDate: `${year}-09-30` };
    case 'Q4':
      return { startDate: `${year}-10-01`, endDate: `${year}-12-31` };
  }
}

/**
 * Calculates quarterly Profit & Loss metrics from sales and expense arrays
 * Normalizes metrics to requested reporting currency using bank rate
 */
export function calculateQuarterlyPnL(
  sales: SaleTransaction[],
  expenses: ExpenseItem[],
  year: number,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
  currency: CurrencyType = 'USD',
  bankRate: number = DEFAULT_ZIG_BANK_RATE
): PnLSummary {
  const { startDate, endDate } = getQuarterDateRange(year, quarter);
  const startTs = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const endTs = new Date(`${endDate}T23:59:59.999Z`).getTime();

  let totalRevenue = 0;
  let totalCogs = 0;
  let itemsSold = 0;
  let transactionCount = 0;

  for (const sale of sales) {
    const saleTs = new Date(sale.createdAt).getTime();
    if (saleTs >= startTs && saleTs <= endTs) {
      transactionCount += 1;
      const rateToUse = sale.bankRate || bankRate;
      
      // Normalize sale total to requested currency
      const saleInCurrency = convertCurrency(sale.totalAmount, sale.currency, currency, rateToUse);
      totalRevenue += saleInCurrency;

      for (const item of sale.items) {
        itemsSold += item.quantity;
        const itemCostInCurrency = convertCurrency(item.unitCost * item.quantity, sale.currency, currency, rateToUse);
        totalCogs += itemCostInCurrency;
      }
    }
  }

  let totalExpenses = 0;
  for (const exp of expenses) {
    const expTs = new Date(`${exp.expenseDate}T12:00:00.000Z`).getTime();
    if (expTs >= startTs && expTs <= endTs) {
      const expCurrency: CurrencyType = exp.currency || 'USD';
      const expInCurrency = convertCurrency(exp.amount, expCurrency, currency, bankRate);
      totalExpenses += expInCurrency;
    }
  }

  const grossProfit = Number((totalRevenue - totalCogs).toFixed(2));
  const grossMarginPct = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;
  const netProfit = Number((grossProfit - totalExpenses).toFixed(2));
  const netMarginPct = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

  return {
    year,
    quarter,
    startDate,
    endDate,
    currency,
    bankRate,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalCogs: Number(totalCogs.toFixed(2)),
    grossProfit,
    grossMarginPct,
    totalExpenses: Number(totalExpenses.toFixed(2)),
    netProfit,
    netMarginPct,
    transactionCount,
    itemsSold,
  };
}

/**
 * Formats currency neatly with international and Zimbabwe ZiG / ZWL standards
 */
export function formatCurrency(amount: number, currency: CurrencyType = 'USD'): string {
  if (currency === 'ZiG') {
    return `ZiG ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
