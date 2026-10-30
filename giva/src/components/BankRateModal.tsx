import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Check, RefreshCw, DollarSign, Coins } from 'lucide-react';
import { formatCurrency } from '../utils/pos-logic';

interface BankRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRate: number;
  onUpdateRate: (newRate: number) => Promise<void>;
}

export const BankRateModal: React.FC<BankRateModalProps> = ({
  isOpen,
  onClose,
  currentRate,
  onUpdateRate,
}) => {
  const [rateInput, setRateInput] = useState<string>(currentRate.toString());
  const [isSaving, setIsSaving] = useState(false);

  // Always show the latest synced rate when the editor is opened
  useEffect(() => {
    if (isOpen) setRateInput(currentRate.toString());
  }, [isOpen, currentRate]);

  if (!isOpen) return null;

  const parsedRate = parseFloat(rateInput) || currentRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedRate <= 0) {
      alert('Please enter a valid positive exchange rate.');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateRate(parsedRate);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update bank rate.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-stone-900 px-4 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="text-amber-400" size={18} />
            <h2 className="text-sm font-bold tracking-wide">
              ZiG / USD Bank Exchange Rate
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">
              Official Interbank Rate (ZiG / ZWL per 1 USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-stone-400 text-xs">
                1 USD =
              </span>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="w-full pl-20 pr-12 py-2 bg-stone-50 border border-stone-300 rounded-xl text-base font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                autoFocus
              />
              <span className="absolute right-3 top-2.5 font-bold text-stone-500 text-xs">
                ZiG
              </span>
            </div>
            <p className="text-[10px] text-stone-500">
              All catalogue prices, stock valuations, and transactions convert dynamically using this bank rate.
            </p>
          </div>

          {/* Quick presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Quick Bank Rate Presets
            </span>
            <div className="flex gap-1.5">
              {[35.00, 38.00, 40.00, 42.00, 45.00].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRateInput(preset.toString())}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    Math.abs(parsedRate - preset) < 0.001
                      ? 'border-amber-600 bg-amber-50 text-amber-900'
                      : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                  }`}
                >
                  {preset.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {/* Conversion Preview Box */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs space-y-1">
            <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wider block">
              Live Conversion Preview
            </span>
            <div className="flex justify-between text-stone-700">
              <span>$5.00 item</span>
              <span className="font-bold text-amber-900">
                ZiG {(5 * parsedRate).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>$15.00 item</span>
              <span className="font-bold text-amber-900">
                ZiG {(15 * parsedRate).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>$50.00 item</span>
              <span className="font-bold text-amber-900">
                ZiG {(50 * parsedRate).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Footer Button */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Update Bank Rate</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
