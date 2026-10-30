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

interface ReportsViewProps {
  currency: CurrencyType;
  bankRate: number;
}

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

  // New Expense Form State
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState<number>(0);
  const [newExpCurrency, setNewExpCurrency] = useState<CurrencyType>(currency);
  const [newExpCategory, setNewExpCategory] = useState('Store Supplies');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);

  // Live data straight from Firestore: updates the moment Q3 POS rings up a sale,
  // over Wi-Fi or mobile data, and still shows the last synced figures offline.
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
    } catch (err) {
      alert('Error creating expense entry.');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (confirm('Delete this expense entry?')) {
      await deleteExpenseFromFirestore(id);
    }
  };

  const handleDownloadExcel = () => {
    try {
      downloadQuarterlyExcel(sales, expenses, year, quarter, currency, bankRate);
    } catch (err) {
      console.error(err);
      alert('Could not create the Excel file on this device.');
    }
  };

  const handleViewThermal = () => {
    if (summary) setThermalText(buildThermalPnLText(summary));
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <span>Quarterly Profit & Loss Engine</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
              Module C Analytics
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-stone-500">
              Automated Gross & Net Profit calculation, real Excel .xlsx exporter, and 58mm thermal slips
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
            onClick={handleViewThermal}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold border border-stone-300 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>58mm Slip</span>
          </button>

          {/* Excel Download Button */}
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            <span>Export Official .xlsx</span>
          </button>
        </div>
      </div>

      {/* P&L Statement Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Revenue */}
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Gross Revenue
            </span>
            <div className="text-xl font-black text-stone-900 mt-1">
              {formatCurrency(summary.totalRevenue, currency)}
            </div>
            <span className="text-[10px] text-stone-400 mt-1">
              {summary.transactionCount} transactions
            </span>
          </div>

          {/* COGS */}
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              COGS (Wholesale)
            </span>
            <div className="text-xl font-black text-stone-800 mt-1">
              {formatCurrency(summary.totalCogs, currency)}
            </div>
            <span className="text-[10px] text-stone-400 mt-1">
              {summary.itemsSold} items sold
            </span>
          </div>

          {/* Gross Profit */}
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Gross Profit
            </span>
            <div className="text-xl font-black text-emerald-800 mt-1">
              {formatCurrency(summary.grossProfit, currency)}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1">
              {summary.grossMarginPct}% gross margin
            </span>
          </div>

          {/* Total Expenses */}
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Operating Exp.
            </span>
            <div className="text-xl font-black text-rose-700 mt-1">
              {formatCurrency(summary.totalExpenses, currency)}
            </div>
            <span className="text-[10px] text-stone-400 mt-1">
              Overheads & Logistics
            </span>
          </div>

          {/* Net Profit */}
          <div
            className={`p-3.5 rounded-2xl border shadow-2xs flex flex-col justify-between ${
              summary.netProfit >= 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                summary.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              Net Profit / Loss
            </span>
            <div
              className={`text-xl font-black mt-1 ${
                summary.netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'
              }`}
            >
              {formatCurrency(summary.netProfit, currency)}
            </div>
            <span
              className={`text-[10px] font-bold mt-1 ${
                summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {summary.netMarginPct}% net margin
            </span>
          </div>

          {/* Period Range */}
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={12} />
              <span>Reporting Range</span>
            </span>
            <div className="text-xs font-mono font-bold text-stone-800 mt-1">
              {summary.startDate}
              <br />
              <span className="text-stone-400 font-sans">to</span> {summary.endDate}
            </div>
            <span className="text-[10px] text-amber-700 font-semibold mt-1">
              Quarter {quarter} {year}
            </span>
          </div>
        </div>
      )}

      {/* Grid: Operating Expenses Ledger + Recent Transaction Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operating Expenses Module */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Operating Expenses Ledger</h3>
              <p className="text-[11px] text-stone-500">
                Rent, thermal roll paper, shipping, and store utilities
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
              Total: {formatCurrency(summary?.totalExpenses || 0, currency)}
            </span>
          </div>

          {/* New Expense Entry Form */}
          <form onSubmit={handleAddExpense} className="space-y-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Record New Store Overhead Expense
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Description (e.g. 58mm Thermal Rolls)"
                required
                value={newExpDesc}
                onChange={(e) => setNewExpDesc(e.target.value)}
                className="col-span-2 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2 text-stone-400 text-xs font-bold">
                    {newExpCurrency === 'ZiG' ? 'ZiG' : '$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Amount"
                    required
                    value={newExpAmount || ''}
                    onChange={(e) => setNewExpAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <select
                  value={newExpCurrency}
                  onChange={(e) => setNewExpCurrency(e.target.value as CurrencyType)}
                  className="px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-700"
                >
                  <option value="USD">USD ($)</option>
                  <option value="ZiG">ZiG</option>
                </select>
              </div>
              <select
                value={newExpCategory}
                onChange={(e) => setNewExpCategory(e.target.value)}
                className="px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
              >
                <option value="Rent & Lease">Rent & Lease</option>
                <option value="Store Supplies">Store Supplies (Paper/Tape)</option>
                <option value="Utilities">Utilities & Terminal Data</option>
                <option value="Logistics">Logistics & Freight</option>
                <option value="Salaries">Salaries & Wages</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              <span>Record Expense (Recalculate Net Profit)</span>
            </button>
          </form>

          {/* Expenses List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-stone-100 text-xs border border-stone-200 rounded-xl">
            {expenses.map((e) => (
              <div key={e.id} className="p-2.5 flex items-center justify-between hover:bg-stone-50">
                <div>
                  <div className="font-semibold text-stone-900">{e.description}</div>
                  <div className="text-[10px] text-stone-400 flex items-center gap-2 mt-0.5">
                    <span>{e.category}</span>
                    <span>•</span>
                    <span>{e.expenseDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-rose-700">
                    -{formatCurrency(e.amount, currency)}
                  </span>
                  <button
                    onClick={() => handleDeleteExpense(e.id)}
                    className="text-stone-300 hover:text-rose-500 p-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History & Gross Margins */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Sales Transactions Ledger</h3>
              <p className="text-[11px] text-stone-500">
                Itemized POS checkout receipts with line margin breakdown
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {sales.length} Total Sales
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl text-xs">
            {sales.map((s) => (
              <div key={s.id} className="p-3 hover:bg-amber-50/40 transition-colors space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 font-mono">
                      GIVA-#{s.id}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-semibold uppercase">
                      {s.paymentMethod}
                    </span>
                  </div>
                  <span className="font-extrabold text-sm text-stone-900">
                    {formatCurrency(s.totalAmount, s.currency || currency)}
                  </span>
                </div>

                {/* Sub items */}
                <div className="text-[11px] text-stone-600 bg-stone-50 p-2 rounded-lg space-y-1">
                  {s.items.map((it, i) => {
                    const lineMargin = Number((it.subtotal - it.unitCost * it.quantity).toFixed(2));
                    return (
                      <div key={i} className="flex justify-between items-center text-[11px]">
                        <span className="truncate max-w-[200px]">
                          {it.quantity}x {it.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-bold">
                            +{formatCurrency(lineMargin, s.currency || currency)} margin
                          </span>
                          <span className="font-semibold text-stone-900">
                            {formatCurrency(it.subtotal, s.currency || currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[10px] text-stone-400 flex items-center justify-between">
                  <span>{new Date(s.createdAt).toLocaleString()}</span>
                  <span>Change: {formatCurrency(s.changeAmount || 0, s.currency || currency)}</span>
                </div>
              </div>
            ))}

            {sales.length === 0 && (
              <div className="p-8 text-center text-stone-400">
                <Receipt size={32} className="mx-auto text-stone-300 mb-1.5" />
                <p>No transactions executed in this period yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thermal P&L Slip Modal */}
      {thermalText && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-stone-900 px-4 py-3 text-white flex items-center justify-between">
              <span className="text-xs font-bold tracking-wide">
                58mm Thermal P&L Financial Slip
              </span>
              <button
                onClick={() => setThermalText(null)}
                className="text-stone-400 hover:text-white"
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
