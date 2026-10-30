import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Smartphone, Split, Check, X, ArrowRight, Printer, Coins } from 'lucide-react';
import { CartItem, calculateCartTotals, calculateChange, formatCurrency, CurrencyType } from '../utils/pos-logic';

interface CheckoutModalProps {
  cart: CartItem[];
  currency: CurrencyType;
  bankRate: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCheckout: (paymentMethod: 'CASH' | 'CARD' | 'SPLIT' | 'MOBILE_MONEY', amountTendered: number) => Promise<void>;
  isProcessing: boolean;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cart,
  currency,
  bankRate,
  isOpen,
  onClose,
  onConfirmCheckout,
  isProcessing,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT' | 'MOBILE_MONEY'>('CASH');
  const totals = calculateCartTotals(cart);
  const [tenderedInput, setTenderedInput] = useState<string>(totals.totalAmount.toString());

  useEffect(() => {
    if (isOpen) {
      setTenderedInput(totals.totalAmount.toString());
    }
  }, [isOpen, totals.totalAmount]);

  if (!isOpen) return null;

  const currentTendered = parseFloat(tenderedInput) || 0;
  const changeDue = calculateChange(totals.totalAmount, currentTendered);
  const isSufficient = paymentMethod !== 'CASH' || currentTendered >= totals.totalAmount;

  // Alternate currency calculation
  const altCurrency: CurrencyType = currency === 'USD' ? 'ZiG' : 'USD';
  const altTotalAmount =
    currency === 'USD'
      ? Number((totals.totalAmount * bankRate).toFixed(2))
      : Number((totals.totalAmount / bankRate).toFixed(2));

  // Cash denomination buttons
  const cashDenominations =
    currency === 'USD'
      ? [totals.totalAmount, 5, 10, 20, 50, 100]
      : [totals.totalAmount, 50, 100, 200, 500, 1000, 2000];

  const handleDenominationClick = (amount: number) => {
    setTenderedInput(amount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSufficient) return;
    await onConfirmCheckout(paymentMethod, currentTendered);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Process Payment & Print Receipt</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-stone-300">
                Total: <strong className="text-amber-400">{formatCurrency(totals.totalAmount, currency)}</strong>
              </span>
              <span className="text-[11px] text-stone-400 font-mono">
                (~{formatCurrency(altTotalAmount, altCurrency)})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Bank Exchange Rate Reference Banner */}
          <div className="flex items-center justify-between bg-stone-100 px-3 py-1.5 rounded-lg text-xs font-mono text-stone-700 border border-stone-200">
            <span className="flex items-center gap-1 font-sans text-stone-600 font-semibold">
              <Coins size={14} className="text-amber-600" />
              <span>Bank Rate:</span>
            </span>
            <span className="font-bold text-stone-900">1 USD = {bankRate.toFixed(2)} ZiG (ZWL)</span>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'CARD', label: 'Card / Swipe', icon: CreditCard },
                { id: 'MOBILE_MONEY', label: 'EcoCash / EFT', icon: Smartphone },
                { id: 'SPLIT', label: 'Split', icon: Split },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id as any);
                      if (m.id !== 'CASH') setTenderedInput(totals.totalAmount.toString());
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 text-stone-600 bg-stone-50'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-amber-600' : 'text-stone-400'} />
                    <span className="mt-1 text-[11px] truncate w-full text-center">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Handling & Denominations */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700">Amount Tendered</label>
                <span className="text-[11px] text-stone-500 font-medium">
                  Due: {formatCurrency(totals.totalAmount, currency)}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-stone-500 text-sm">
                  {currency === 'USD' ? '$' : 'ZiG'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tenderedInput}
                  onChange={(e) => setTenderedInput(e.target.value)}
                  className={`w-full pr-3 py-2 bg-white border border-stone-300 rounded-lg text-base font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                    currency === 'USD' ? 'pl-8' : 'pl-14'
                  }`}
                  autoFocus
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {cashDenominations.map((denom, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDenominationClick(denom)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-stone-300 hover:border-amber-500 hover:text-amber-700 text-stone-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    {denom === totals.totalAmount ? 'Exact' : formatCurrency(denom, currency)}
                  </button>
                ))}
              </div>

              {/* Change Indicator */}
              <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                <span className="text-xs font-bold text-stone-700">Change Due:</span>
                <div className="text-right">
                  <span className={`text-base font-extrabold ${changeDue > 0 ? 'text-emerald-700' : 'text-stone-900'}`}>
                    {formatCurrency(changeDue, currency)}
                  </span>
                  {changeDue > 0 && (
                    <span className="text-[10px] text-stone-400 block font-mono">
                      (~{formatCurrency(currency === 'USD' ? changeDue * bankRate : changeDue / bankRate, altCurrency)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Unit Margin Insight for Store Owner/Cashier */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs flex justify-between items-center">
            <div>
              <span className="font-semibold text-emerald-900">Estimated Transaction Margin</span>
              <p className="text-[10px] text-emerald-700">Gross profit generated upon auto-deduction</p>
            </div>
            <div className="text-right">
              <span className="font-black text-emerald-800 text-sm">
                +{formatCurrency(totals.estimatedMargin, currency)}
              </span>
              <p className="text-[10px] text-emerald-600 font-semibold">
                {totals.totalAmount > 0 ? ((totals.estimatedMargin / totals.totalAmount) * 100).toFixed(1) : 0}% margin
              </p>
            </div>
          </div>

          {/* Commit Button */}
          <button
            type="submit"
            disabled={!isSufficient || isProcessing}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
              !isSufficient || isProcessing
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-[0.99]'
            }`}
          >
            <Printer size={18} />
            <span>
              {isProcessing
                ? 'Deducting Stock & Printing...'
                : `Complete Sale & Print 58mm Receipt (${formatCurrency(totals.totalAmount, currency)})`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
