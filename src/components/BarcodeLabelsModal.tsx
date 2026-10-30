import React, { useState } from 'react';
import { X, Printer, Check, Copy, Tag } from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { BarcodeRenderer } from './BarcodeRenderer';
import { formatCurrency, CurrencyType } from '../utils/pos-logic';

interface BarcodeLabelsModalProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyType;
  bankRate: number;
}

export const BarcodeLabelsModal: React.FC<BarcodeLabelsModalProps> = ({
  products,
  isOpen,
  onClose,
  currency,
  bankRate = 40.0,
}) => {
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>(
    products.slice(0, 6).map((p) => p.id)
  );

  if (!isOpen) return null;

  const toggleSelect = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedProductIds(products.map((p) => p.id));
  };

  const deselectAll = () => {
    setSelectedProductIds([]);
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Tag className="text-amber-400" size={18} />
              <span>58mm Thermal Barcode Label Generator</span>
            </h2>
            <p className="text-xs text-stone-400">
              Formatted for 58mm shelf tags and retail merchandise stickers
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Selection controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-200">
            <span className="text-xs font-bold text-stone-700">
              Selected ({selectedProductIds.length} of {products.length})
            </span>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
              >
                Select All
              </button>
              <span className="text-stone-300">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-stone-500 hover:text-stone-700 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Printable Labels Sheet Preview */}
          <div id="barcode-labels-print-area" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedProducts.map((p) => {
              const usdPrice = p.sellingPriceUsd;
              const zigPrice = Number((p.sellingPriceUsd * bankRate).toFixed(2));
              return (
                <div
                  key={p.id}
                  className="border-2 border-dashed border-stone-400 bg-amber-50/50 p-3 rounded-lg flex flex-col items-center justify-between text-center relative"
                >
                  <div className="w-full">
                    <span className="text-[10px] font-extrabold text-stone-800 uppercase tracking-widest block">
                      GIVA LIVING & BABY
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 line-clamp-1 mt-0.5">
                      {p.name}
                    </h4>
                    {p.sizeVariant && (
                      <span className="text-[10px] text-stone-500 block">
                        {p.sizeVariant}
                      </span>
                    )}
                  </div>

                  <div className="my-1.5 w-full flex justify-center">
                    <BarcodeRenderer
                      value={p.barcode}
                      width={1.3}
                      height={36}
                      fontSize={10}
                    />
                  </div>

                  <div className="w-full flex justify-between items-baseline pt-1 border-t border-stone-300 px-1">
                    <span className="text-[10px] text-stone-500 font-mono">
                      Rate: {bankRate.toFixed(1)}
                    </span>
                    <span className="text-xs font-black text-stone-900">
                      ${usdPrice.toFixed(2)} <span className="text-emerald-700 font-bold">• ZiG {zigPrice.toFixed(0)}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedProducts.length === 0 && (
            <p className="text-center py-8 text-xs text-stone-500">
              No products selected. Please select items from catalog to generate labels.
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-stone-500">
            Supports standard thermal barcode paper rolls (58mm × 40mm)
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-100 cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              disabled={selectedProducts.length === 0}
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Printer size={15} />
              <span>Print {selectedProducts.length} Labels</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
