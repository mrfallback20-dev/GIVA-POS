import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Minus,
  ShoppingCart,
  Tag,
  AlertCircle,
  Check,
  Package,
  Sparkles,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { CurrencyType, formatCurrency } from '../utils/pos-logic';
import { playScanBeep, playErrorBuzzer } from '../utils/audio';

interface QuantityInputModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmQuantity: (product: Product, quantity: number) => void;
  currency: CurrencyType;
  bankRate: number;
  initialQuantity?: number;
  existingCartQuantity?: number;
}

export const QuantityInputModal: React.FC<QuantityInputModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirmQuantity,
  currency,
  bankRate,
  initialQuantity = 1,
  existingCartQuantity = 0,
}) => {
  const [quantityStr, setQuantityStr] = useState<string>('1');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setQuantityStr(String(initialQuantity > 0 ? initialQuantity : 1));
      setErrorMessage('');
      // Auto focus input
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, product, initialQuantity]);

  if (!isOpen || !product) return null;

  const currentQty = parseInt(quantityStr, 10) || 0;
  const maxAvailable = product.stockQuantity;
  const priceUsd = product.sellingPriceUsd || product.sellingPrice || 0;
  const unitPrice =
    currency === 'ZiG'
      ? Number((priceUsd * bankRate).toFixed(2))
      : priceUsd;
  const altCurrency: CurrencyType = currency === 'ZiG' ? 'USD' : 'ZiG';
  const altUnitPrice =
    currency === 'ZiG'
      ? priceUsd
      : Number((priceUsd * bankRate).toFixed(2));

  const totalLinePrice = unitPrice * currentQty;
  const altTotalLinePrice = altUnitPrice * currentQty;

  const handleSetQuantity = (qty: number) => {
    setErrorMessage('');
    if (qty <= 0) {
      setQuantityStr('1');
      return;
    }
    if (qty > maxAvailable) {
      playErrorBuzzer();
      setErrorMessage(`Max stock available is ${maxAvailable}.`);
      setQuantityStr(String(maxAvailable));
      return;
    }
    playScanBeep();
    setQuantityStr(String(qty));
  };

  const handleStep = (delta: number) => {
    const next = Math.max(1, currentQty + delta);
    handleSetQuantity(next);
  };

  const handleKeypadPress = (val: string) => {
    setErrorMessage('');
    playScanBeep();
    if (val === '00') {
      if (quantityStr === '' || quantityStr === '0') {
        setQuantityStr('0');
      } else {
        const next = parseInt(quantityStr + '00', 10);
        handleSetQuantity(next);
      }
      return;
    }

    if (quantityStr === '0' || quantityStr === '1' && val !== '0') {
      // If default 1 was not changed yet, replacing with first key tap makes it faster!
      // But if user typed 1 and now typing 2 (making 12), we allow appending
      const next = parseInt(val, 10);
      handleSetQuantity(next);
    } else {
      const next = parseInt((quantityStr + val), 10);
      handleSetQuantity(next);
    }
  };

  const handleBackspace = () => {
    setErrorMessage('');
    if (quantityStr.length <= 1) {
      setQuantityStr('1');
    } else {
      setQuantityStr(quantityStr.slice(0, -1));
    }
  };

  const handleClear = () => {
    setErrorMessage('');
    setQuantityStr('1');
  };

  const handleConfirm = () => {
    if (currentQty <= 0) {
      playErrorBuzzer();
      setErrorMessage('Quantity must be at least 1.');
      return;
    }
    if (currentQty > maxAvailable) {
      playErrorBuzzer();
      setErrorMessage(`Cannot exceed available stock of ${maxAvailable}.`);
      return;
    }

    onConfirmQuantity(product, currentQty);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const PRESETS = [1, 2, 3, 4, 5, 6, 10, 12, 24];

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-stone-900 px-4 sm:px-5 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
              <ShoppingCart size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white leading-tight">
                Enter Item Quantity
              </h3>
              <span className="text-[10px] text-stone-400 font-mono">
                Barcode: {product.barcode}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product Card Overview */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
              />
            ) : (
              <Package size={24} className="text-stone-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate">
              {product.name}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
              <span className="bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded font-medium">
                {product.category}
              </span>
              {product.sizeVariant && (
                <span className="text-stone-600 font-semibold">
                  Size: {product.sizeVariant}
                </span>
              )}
              <span
                className={`px-1.5 py-0.2 rounded font-bold ${
                  maxAvailable > 5
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {maxAvailable} in stock
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-extrabold text-sm text-stone-900">
                {formatCurrency(unitPrice, currency)}
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                (≈ {formatCurrency(altUnitPrice, altCurrency)})
              </span>
              {existingCartQuantity > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold ml-auto">
                  {existingCartQuantity} currently in cart
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quantity Input Area */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              disabled={currentQty <= 1}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl transition-all cursor-pointer shadow-xs active:scale-95 ${
                currentQty <= 1
                  ? 'bg-stone-100 text-stone-300 cursor-not-allowed border border-stone-200'
                  : 'bg-stone-800 hover:bg-stone-700 text-white border border-stone-700'
              }`}
              title="Decrease quantity"
            >
              <Minus size={20} />
            </button>

            <div className="relative flex-1 max-w-[170px]">
              <input
                ref={inputRef}
                type="number"
                min="1"
                max={maxAvailable}
                value={quantityStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setQuantityStr(val);
                  setErrorMessage('');
                }}
                className="w-full text-center py-2.5 bg-stone-100 border-2 border-amber-500/60 rounded-2xl text-3xl font-black text-stone-900 focus:outline-none focus:ring-4 focus:ring-amber-500/20 font-mono"
              />
              <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block text-center mt-1">
                Units to Add
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleStep(1)}
              disabled={currentQty >= maxAvailable}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl transition-all cursor-pointer shadow-xs active:scale-95 ${
                currentQty >= maxAvailable
                  ? 'bg-stone-100 text-stone-300 cursor-not-allowed border border-stone-200'
                  : 'bg-stone-800 hover:bg-stone-700 text-white border border-stone-700'
              }`}
              title="Increase quantity"
            >
              <Plus size={20} />
            </button>
          </div>

          {errorMessage && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold animate-in fade-in">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                Quick Select Presets
              </span>
              <span className="text-[10px] text-stone-400">Tap to set quantity</span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
              {PRESETS.map((num) => {
                const disabled = num > maxAvailable;
                const active = currentQty === num;
                return (
                  <button
                    key={num}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSetQuantity(num)}
                    className={`py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                      active
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs scale-105'
                        : disabled
                        ? 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed'
                        : 'bg-white hover:bg-amber-50 text-stone-800 border-stone-200 hover:border-amber-400 active:scale-95'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Touch-Friendly On-Screen Numpad */}
          <div className="bg-stone-100 p-2 rounded-2xl border border-stone-200">
            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="py-2.5 bg-white hover:bg-stone-50 active:bg-amber-100 active:scale-95 text-stone-900 font-extrabold text-base rounded-xl transition-all cursor-pointer shadow-2xs border border-stone-200"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-2.5 bg-white hover:bg-stone-50 active:bg-amber-100 active:scale-95 text-stone-900 font-extrabold text-base rounded-xl transition-all cursor-pointer shadow-2xs border border-stone-200"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                ⌫
              </button>
            </div>
          </div>

          {/* Subtotal Calculation Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-300/60 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-900 block">
                Item Line Total
              </span>
              <span className="text-[11px] text-amber-800">
                {currentQty} unit{currentQty > 1 ? 's' : ''} × {formatCurrency(unitPrice, currency)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-black text-amber-950 block">
                {formatCurrency(totalLinePrice, currency)}
              </span>
              <span className="text-[10px] text-amber-800 font-mono">
                ≈ {formatCurrency(altTotalLinePrice, altCurrency)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl font-bold text-xs bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 rounded-xl font-extrabold text-sm bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Check size={18} />
              <span>
                Add {currentQty} to Sale • {formatCurrency(totalLinePrice, currency)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
