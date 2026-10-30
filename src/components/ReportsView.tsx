import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  Receipt,
  FileText,
  Clock,
  Sparkles,
  CheckCircle,
  Coins,
  X,
  Package,
  Layers,
  ShoppingBag,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  formatCurrency,
  PnLSummary,
  ExpenseItem,
  SaleTransaction,
  CurrencyType,
  convertCurrency,
} from '../utils/pos-logic';
import {
  addExpenseToFirestore,
  deleteExpenseFromFirestore,
  subscribeToExpenses,
  subscribeToSalesForYear,
} from '../services/firebase-service';
import { calculateQuarterlyPnL } from '../utils/pos-logic';
import { buildThermalPnLText, downloadQuarterlyExcel } from '../utils/report-export';
import { showToast } from '../utils/toast';

interface ReportsViewProps {
  currency: CurrencyType;
  bankRate: number;
}

type PnLMetricType = 'REVENUE' | 'COGS' | 'GROSS_PROFIT' | 'EXPENSES' | 'NET_PROFIT' | 'RANGE';

export const ReportsView: React.FC<ReportsViewProps> = ({ currency, bankRate }) => {
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [quarter, setQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>(
    () => (`Q${Math.floor(new Date().getMonth() / 3) + 1}` as 'Q1' | 'Q2' | 'Q3' | 'Q4')
  );
  const [summary, setSummary] = useState<PnLSummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [thermalText, setThermalText] = useState<string | null>(null);

  // Detail Modal States for Tapping P&L Metrics
  const [activeMetricModal, setActiveMetricModal] = useState<PnLMetricType | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<SaleTransaction | null>(null);

  // New Expense Form State
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState<number>(0);
  const [newExpCurrency, setNewExpCurrency] = useState<CurrencyType>(currency);
  const [newExpCategory, setNewExpCategory] = useState('Store Supplies');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);

  // Live data straight from Firestore
  useEffect(() => {
    setLoading(true);
    const unsubSales = subscribeToSalesForYear(year, (rows) => {
      setSales(rows);
      setLoading(false);
    });
    const unsubExp = subscribeToExpenses(setExpenses);
    return () => {
      unsubSales();
      unsubExp();
    };
  }, [year]);

  useEffect(() => {
    setSummary(calculateQuarterlyPnL(sales, expenses, year, quarter, currency, bankRate));
  }, [sales, expenses, year, quarter, currency, bankRate]);

  // Quarterly Sales Filtered
  const currentQuarterSales = React.useMemo(() => {
    if (!summary) return [];
    const startTs = new Date(`${summary.startDate}T00:00:00.000Z`).getTime();
    const endTs = new Date(`${summary.endDate}T23:59:59.999Z`).getTime();
    return sales.filter((s) => {
      const t = new Date(s.createdAt).getTime();
      return t >= startTs && t <= endTs;
    });
  }, [sales, summary]);

  // Quarterly Expenses Filtered
  const currentQuarterExpenses = React.useMemo(() => {
    if (!summary) return [];
    const startTs = new Date(`${summary.startDate}T00:00:00.000Z`).getTime();
    const endTs = new Date(`${summary.endDate}T23:59:59.999Z`).getTime();
    return expenses.filter((e) => {
      const t = new Date(`${e.expenseDate}T12:00:00.000Z`).getTime();
      return t >= startTs && t <= endTs;
    });
  }, [expenses, summary]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpDesc || newExpAmount <= 0) return;
    try {
      await addExpenseToFirestore({
        description: newExpDesc.trim(),
        amount: newExpAmount,
        currency: newExpCurrency,
        category: newExpCategory,
        expenseDate: newExpDate,
      });
      setNewExpDesc('');
      setNewExpAmount(0);
      showToast('Expense recorded successfully.', 'success');
    } catch (err) {
      showToast('Error creating expense entry.', 'error');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      await deleteExpenseFromFirestore(id);
      showToast('Expense removed.', 'info');
    } catch {
      showToast('Could not delete expense.', 'error');
    }
  };

  const handleDownloadExcel = () => {
    try {
      downloadQuarterlyExcel(sales, expenses, year, quarter, currency, bankRate);
      showToast('P&L Excel file downloaded.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Could not create the Excel file on this device.', 'error');
    }
  };

  const handleViewThermal = () => {
    if (summary) setThermalText(buildThermalPnLText(summary));
  };

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 max-w-7xl mx-auto space-y-6 select-none">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <span>Quarterly Profit &amp; Loss Engine</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
              Module C Analytics
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-stone-500">
              Tap any financial metric card below to inspect full transaction breakdowns
            </p>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
              <Coins size={12} className="text-amber-700" />
              <span>Reporting: {currency} (1 USD = {bankRate.toFixed(2)} ZiG)</span>
            </span>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quarter Pills */}
          <div className="flex bg-white p-1 rounded-xl border border-stone-300 shadow-2xs text-xs font-bold">
            {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuarter(q)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  quarter === q
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Year selector */}
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 shadow-2xs"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>

          {/* Thermal View */}
          <button
            type="button"
            onClick={handleViewThermal}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold border border-stone-300 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>58mm Slip</span>
          </button>

          {/* Excel Download Button */}
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            <span>Export Official .xlsx</span>
          </button>
        </div>
      </div>

      {/* P&L Statement Metric Cards - CLICKABLE TO VIEW FULL DETAILS */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* 1. Gross Revenue - Clickable */}
          <button
            type="button"
            onClick={() => setActiveMetricModal('REVENUE')}
            className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between text-left hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
          >
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Gross Revenue
              </span>
              <div className="text-lg sm:text-xl font-black text-stone-900 mt-1 truncate">
                {formatCurrency(summary.totalRevenue, currency)}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-emerald-700 font-bold">
              <span>{summary.transactionCount} orders</span>
              <span className="group-hover:translate-x-0.5 transition-transform">Details →</span>
            </div>
          </button>

          {/* 2. COGS (Wholesale Stock Cost) - Clickable */}
          <button
            type="button"
            onClick={() => setActiveMetricModal('COGS')}
            className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between text-left hover:border-stone-500 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
          >
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                COGS (Stock)
              </span>
              <div className="text-lg sm:text-xl font-black text-stone-800 mt-1 truncate">
                {formatCurrency(summary.totalCogs, currency)}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-600 font-bold">
              <span>{summary.itemsSold} sold</span>
              <span className="group-hover:translate-x-0.5 transition-transform">Details →</span>
            </div>
          </button>

          {/* 3. Gross Profit - Clickable */}
          <button
            type="button"
            onClick={() => setActiveMetricModal('GROSS_PROFIT')}
            className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between text-left hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
          >
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                Gross Profit
              </span>
              <div className="text-lg sm:text-xl font-black text-emerald-800 mt-1 truncate">
                {formatCurrency(summary.grossProfit, currency)}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-emerald-700 font-bold">
              <span>{summary.grossMarginPct}% margin</span>
              <span className="group-hover:translate-x-0.5 transition-transform">Details →</span>
            </div>
          </button>

          {/* 4. Operating Expenses - Clickable */}
          <button
            type="button"
            onClick={() => setActiveMetricModal('EXPENSES')}
            className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between text-left hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
          >
            <div>
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                Operating Exp.
              </span>
              <div className="text-lg sm:text-xl font-black text-rose-700 mt-1 truncate">
                {formatCurrency(summary.totalExpenses, currency)}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-rose-700 font-bold">
              <span>Shop overheads</span>
              <span className="group-hover:translate-x-0.5 transition-transform">Details →</span>
            </div>
          </button>

          {/* 5. Net Profit / Loss - Clickable */}
          <button
            type="button"
            onClick={() => setActiveMetricModal('NET_PROFIT')}
            className={`p-3.5 rounded-2xl border shadow-2xs flex flex-col justify-between text-left hover:shadow-md transition-all cursor-pointer group active:scale-[0.98] ${
              summary.netProfit >= 0
                ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
                : 'bg-rose-50 border-rose-200 hover:border-rose-400'
            }`}
          >
            <div>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider block ${
                  summary.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                Net Profit / Loss
              </span>
              <div
                className={`text-lg sm:text-xl font-black mt-1 truncate ${
                  summary.netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'
                }`}
              >
                {formatCurrency(summary.netProfit, currency)}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[10px] font-bold">
              <span className={summary.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
                {summary.netMarginPct}% net
              </span>
              <span className="group-hover:translate-x-0.5 transition-transform">Formula →</span>
            </div>
          </button>

          {/* 6. Period Range - Clickable */}
          <button
            type="button"
            onClick={() => setActiveMetricModal('RANGE')}
            className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between text-left hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
          >
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} />
                <span>Period Details</span>
              </span>
              <div className="text-xs font-mono font-bold text-stone-800 mt-1 leading-snug">
                {summary.startDate}
                <br />
                <span className="text-stone-400 font-sans">to</span> {summary.endDate}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-amber-700 font-bold">
              <span>{quarter} {year}</span>
              <span className="group-hover:translate-x-0.5 transition-transform">Slip →</span>
            </div>
          </button>
        </div>
      )}

      {/* Grid: Operating Expenses Ledger + Recent Transaction Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operating Expenses Module */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Operating Expenses Ledger</h3>
              <p className="text-[11px] text-stone-500">
                Rent, thermal paper, shop utilities, logistics &amp; freight
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
              {currentQuarterExpenses.length} entries
            </span>
          </div>

          {/* Add Expense Form */}
          <form onSubmit={handleAddExpense} className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2 text-xs">
            <span className="text-[10px] font-bold uppercase text-stone-500 block">Record New Expense</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Description (e.g. 58mm Thermal Paper Rolls)"
                value={newExpDesc}
                onChange={(e) => setNewExpDesc(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
              />
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Amount"
                  value={newExpAmount || ''}
                  onChange={(e) => setNewExpAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold"
                />
                <select
                  value={newExpCurrency}
                  onChange={(e) => setNewExpCurrency(e.target.value as CurrencyType)}
                  className="px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold"
                >
                  <option value="USD">USD</option>
                  <option value="ZiG">ZiG</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={newExpCategory}
                onChange={(e) => setNewExpCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
              >
                <option value="Store Supplies">Store Supplies (Paper/Packaging)</option>
                <option value="Rent & Utilities">Rent &amp; Utilities</option>
                <option value="Shipping & Logistics">Shipping &amp; Logistics</option>
                <option value="Maintenance">Maintenance &amp; Repairs</option>
                <option value="Marketing">Marketing &amp; Display</option>
              </select>

              <div className="flex gap-2">
                <input
                  type="date"
                  value={newExpDate}
                  onChange={(e) => setNewExpDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0"
                >
                  Add
                </button>
              </div>
            </div>
          </form>

          {/* Expenses List */}
          <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto">
            {currentQuarterExpenses.map((exp) => (
              <div
                key={exp.id}
                className="py-2.5 flex items-center justify-between text-xs hover:bg-stone-50 px-2 rounded-lg transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-stone-800 truncate">{exp.description}</div>
                  <div className="text-[10px] text-stone-400">
                    {exp.category} • {exp.expenseDate}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-rose-700">
                    -{formatCurrency(convertCurrency(exp.amount, exp.currency || 'USD', currency, bankRate), currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Delete expense entry"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {currentQuarterExpenses.length === 0 && (
              <div className="p-6 text-center text-stone-400">
                <Receipt size={28} className="mx-auto text-stone-300 mb-1" />
                <p>No expenses recorded in {quarter} {year}.</p>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Sales Transaction Log */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Quarterly Sales Ledger</h3>
              <p className="text-[11px] text-stone-500">
                Tap any receipt to inspect itemized line items and payment details
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {currentQuarterSales.length} sales
            </span>
          </div>

          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
            {currentQuarterSales.map((sale) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => setSelectedTransaction(sale)}
                className="w-full py-2.5 px-2 flex items-center justify-between text-xs hover:bg-emerald-50/50 rounded-lg transition-colors text-left cursor-pointer group"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <span className="font-mono">{sale.receiptNo || `#${sale.id}`}</span>
                    <span className="text-[10px] text-stone-400 font-normal">
                      {new Date(sale.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 truncate">
                    {sale.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-extrabold text-stone-900 block group-hover:text-emerald-700">
                    +{formatCurrency(sale.totalAmount, (sale.currency as CurrencyType) || currency)}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {sale.paymentMethod}
                  </span>
                </div>
              </button>
            ))}

            {currentQuarterSales.length === 0 && (
              <div className="p-8 text-center text-stone-400">
                <Receipt size={32} className="mx-auto text-stone-300 mb-1.5" />
                <p>No transactions executed in {quarter} {year} yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          DETAILED METRIC MODALS (Triggered by Tapping Any P&L Card)
         ========================================================================= */}

      {/* 1. GROSS REVENUE DETAILS MODAL */}
      {activeMetricModal === 'REVENUE' && summary && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <DollarSign className="text-emerald-400" size={20} />
                <div>
                  <h3 className="font-extrabold text-base">Gross Revenue Details</h3>
                  <p className="text-xs text-stone-400">{quarter} {year} Total Sales Inflow</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMetricModal(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-stone-950 text-white space-y-2">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Gross Revenue</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  {formatCurrency(summary.totalRevenue, currency)}
                </div>
                <p className="text-[11px] text-stone-300">
                  Generated across {summary.transactionCount} completed orders ({summary.itemsSold} total items sold)
                </p>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-stone-800 uppercase text-[11px] tracking-wider">
                  Payment Methods Distribution
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {['CASH', 'CARD', 'MOBILE_MONEY', 'SPLIT'].map((pm) => {
                    const count = currentQuarterSales.filter((s) => s.paymentMethod === pm).length;
                    const total = currentQuarterSales
                      .filter((s) => s.paymentMethod === pm)
                      .reduce((acc, s) => acc + s.totalAmount, 0);
                    return (
                      <div key={pm} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        <span className="text-[10px] font-bold text-stone-500 uppercase block">{pm}</span>
                        <div className="text-sm font-black text-stone-900 font-mono mt-0.5">
                          {formatCurrency(total, currency)}
                        </div>
                        <span className="text-[10px] text-stone-400">{count} receipts</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setActiveMetricModal(null)}
                  className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. COGS (WHOLESALE COST) DETAILS MODAL */}
      {activeMetricModal === 'COGS' && summary && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Package className="text-amber-400" size={20} />
                <div>
                  <h3 className="font-extrabold text-base">Cost of Goods Sold (COGS)</h3>
                  <p className="text-xs text-stone-400">Wholesale Stock Replacement Expense</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMetricModal(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-stone-950 text-white space-y-2">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total COGS Deduction</span>
                <div className="text-2xl sm:text-3xl font-black text-stone-100 font-mono">
                  {formatCurrency(summary.totalCogs, currency)}
                </div>
                <p className="text-[11px] text-stone-300">
                  Consumes{' '}
                  <strong className="text-amber-300">
                    {summary.totalRevenue > 0
                      ? ((summary.totalCogs / summary.totalRevenue) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </strong>{' '}
                  of gross revenue to restock {summary.itemsSold} sold units
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-xs">
                  <Info size={14} /> Stock Cost Accounting Rule
                </span>
                <p className="text-[11px] text-amber-800">
                  Every time a product is rung up on the Q3 POS Terminal, its recorded wholesale cost is deducted
                  here atomically, ensuring real-time profit tracking without waiting for month-end stock takes.
                </p>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setActiveMetricModal(null)}
                  className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. GROSS PROFIT DETAILS MODAL */}
      {activeMetricModal === 'GROSS_PROFIT' && summary && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="text-emerald-400" size={20} />
                <div>
                  <h3 className="font-extrabold text-base">Gross Profit Analysis</h3>
                  <p className="text-xs text-stone-400">Revenue minus Wholesale Stock Cost</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMetricModal(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950 to-stone-900 text-white space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Gross Profit</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  +{formatCurrency(summary.grossProfit, currency)}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-stone-300">
                  <span>Gross Margin: <strong className="text-white">{summary.grossMarginPct}%</strong></span>
                  <span>•</span>
                  <span>Quarter: <strong className="text-white">{quarter} {year}</strong></span>
                </div>
              </div>

              {/* Visual Breakdown Bar */}
              <div className="space-y-1.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div className="flex justify-between text-xs font-bold text-stone-700">
                  <span>Revenue Composition</span>
                  <span>100%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-stone-200 overflow-hidden flex">
                  <div
                    className="bg-amber-500 h-full"
                    style={{
                      width: `${summary.totalRevenue > 0 ? (summary.totalCogs / summary.totalRevenue) * 100 : 0}%`,
                    }}
                    title="COGS"
                  />
                  <div
                    className="bg-emerald-600 h-full"
                    style={{
                      width: `${summary.totalRevenue > 0 ? (summary.grossProfit / summary.totalRevenue) * 100 : 0}%`,
                    }}
                    title="Gross Profit"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono font-bold text-stone-500 pt-1">
                  <span className="text-amber-800">■ COGS: {formatCurrency(summary.totalCogs, currency)}</span>
                  <span className="text-emerald-800">■ Gross Profit: {formatCurrency(summary.grossProfit, currency)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setActiveMetricModal(null)}
                  className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. OPERATING EXPENSES DETAILS MODAL */}
      {activeMetricModal === 'EXPENSES' && summary && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <TrendingDown className="text-rose-400" size={20} />
                <div>
                  <h3 className="font-extrabold text-base">Operating Expenses Details</h3>
                  <p className="text-xs text-stone-400">Total Overhead Deductions in {quarter} {year}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMetricModal(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-stone-950 text-white space-y-2">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Expenses</span>
                <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
                  -{formatCurrency(summary.totalExpenses, currency)}
                </div>
                <p className="text-[11px] text-stone-300">
                  {currentQuarterExpenses.length} recorded expense transactions
                </p>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                <h4 className="font-bold text-stone-800 uppercase text-[11px] tracking-wider">Itemized Expenses</h4>
                {currentQuarterExpenses.map((exp) => (
                  <div key={exp.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-stone-900 block">{exp.description}</span>
                      <span className="text-[10px] text-stone-400">{exp.category} • {exp.expenseDate}</span>
                    </div>
                    <span className="font-mono font-bold text-rose-700">
                      -{formatCurrency(convertCurrency(exp.amount, exp.currency || 'USD', currency, bankRate), currency)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setActiveMetricModal(null)}
                  className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. NET PROFIT / LOSS DETAILS MODAL */}
      {activeMetricModal === 'NET_PROFIT' && summary && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-emerald-400" size={20} />
                <div>
                  <h3 className="font-extrabold text-base">Net Profit Equation &amp; Verdict</h3>
                  <p className="text-xs text-stone-400">Official Bottom-Line Performance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMetricModal(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div
                className={`p-4 rounded-2xl text-white space-y-2 ${
                  summary.netProfit >= 0 ? 'bg-emerald-950' : 'bg-rose-950'
                }`}
              >
                <span className="text-[10px] uppercase font-bold opacity-80 block">Net Bottom Line</span>
                <div className="text-2xl sm:text-3xl font-black font-mono">
                  {formatCurrency(summary.netProfit, currency)}
                </div>
                <p className="text-[11px] opacity-90">
                  Net Margin: <strong>{summary.netMarginPct}%</strong> • Status:{' '}
                  <strong>{summary.netProfit >= 0 ? 'Profitable Quarter' : 'Operating at Loss'}</strong>
                </p>
              </div>

              {/* Step-by-Step Accounting Walkthrough */}
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 font-mono">
                <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                  <span>Gross Sales Revenue:</span>
                  <span className="text-emerald-800">+{formatCurrency(summary.totalRevenue, currency)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-stone-600">
                  <span>- Cost of Goods Sold (COGS):</span>
                  <span className="text-stone-700">-{formatCurrency(summary.totalCogs, currency)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-stone-800 pt-1 border-t border-stone-200">
                  <span>= Gross Profit:</span>
                  <span className="text-emerald-700">+{formatCurrency(summary.grossProfit, currency)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-rose-700">
                  <span>- Total Operating Expenses:</span>
                  <span>-{formatCurrency(summary.totalExpenses, currency)}</span>
                </div>
                <div
                  className={`flex justify-between items-center text-sm font-black pt-2 border-t-2 border-stone-300 ${
                    summary.netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'
                  }`}
                >
                  <span>= Final Net Profit:</span>
                  <span>{formatCurrency(summary.netProfit, currency)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setActiveMetricModal(null)}
                  className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. PERIOD RANGE & THERMAL PRINT MODAL */}
      {activeMetricModal === 'RANGE' && summary && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="text-amber-400" size={18} />
                <h3 className="font-extrabold text-sm">Fiscal Period Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveMetricModal(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Accounting Range</span>
                <p className="font-mono font-bold text-stone-900 text-sm">
                  {summary.startDate} → {summary.endDate}
                </p>
                <p className="text-[11px] text-stone-500">
                  Fiscal Period: Quarter {quarter} of {year}
                </p>
                <p className="text-[11px] text-amber-700 font-mono font-bold">
                  RBZ Interbank Rate: 1 USD = {bankRate.toFixed(2)} ZiG
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleViewThermal}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs border border-stone-300 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>58mm Slip</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={13} />
                  <span>Excel .xlsx</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SELECTED RECEIPT DETAIL POPUP */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            <div className="bg-stone-900 px-4 py-3 text-white flex items-center justify-between shrink-0">
              <span className="font-mono font-bold text-sm">Receipt {selectedTransaction.receiptNo || `#${selectedTransaction.id}`}</span>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center text-[11px] text-stone-500 pb-2 border-b border-stone-100">
                <span>{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
                <span className="font-bold text-emerald-700 font-mono">{selectedTransaction.paymentMethod}</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedTransaction.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-stone-100 text-xs">
                    <div>
                      <div className="font-bold text-stone-900">{it.name}</div>
                      <div className="text-[10px] text-stone-400">{it.quantity} × ${it.unitPrice.toFixed(2)}</div>
                    </div>
                    <span className="font-mono font-bold text-stone-900">${it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm font-black text-stone-900 pt-2 border-t border-stone-200">
                <span>Total Tendered:</span>
                <span className="font-mono">{formatCurrency(selectedTransaction.totalAmount, (selectedTransaction.currency as CurrencyType) || currency)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thermal P&L Slip Modal */}
      {thermalText && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-stone-900 px-4 py-3 text-white flex items-center justify-between">
              <span className="text-xs font-bold tracking-wide">
                58mm Thermal P&amp;L Financial Slip
              </span>
              <button
                onClick={() => setThermalText(null)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-stone-100 flex flex-col items-center">
              <pre className="w-full bg-amber-50 border border-stone-300 p-4 font-mono text-[11px] text-stone-900 whitespace-pre-wrap rounded shadow-inner">
                {thermalText}
              </pre>
            </div>
            <div className="p-3 bg-white border-t border-stone-200 flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(thermalText);
                  alert('Thermal slip copied to clipboard.');
                }}
                className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold border border-stone-300 cursor-pointer"
              >
                Copy Slip
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Print Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
