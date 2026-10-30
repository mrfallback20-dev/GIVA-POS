import React from 'react';
import {
  X,
  Tag,
  DollarSign,
  Package,
  AlertTriangle,
  Camera,
  Edit3,
  Trash2,
  Printer,
  TrendingUp,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { BarcodeRenderer } from './BarcodeRenderer';
import { formatCurrency, calculateUnitMargin, getStockStatus, CurrencyType } from '../utils/pos-logic';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onOpenScanPicture: (product: Product) => void;
  onPrintLabel: (product: Product) => void;
  currency: CurrencyType;
  bankRate: number;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onOpenScanPicture,
  onPrintLabel,
  currency,
  bankRate,
}) => {
  if (!isOpen || !product) return null;

  const costUsd = product.costPriceUsd || product.costPrice || 0;
  const sellingUsd = product.sellingPriceUsd || product.sellingPrice || 0;
  const margin = calculateUnitMargin(costUsd, sellingUsd);

  const priceInActiveCurrency =
    currency === 'ZiG' ? Number((sellingUsd * bankRate).toFixed(2)) : sellingUsd;
  const costInActiveCurrency =
    currency === 'ZiG' ? Number((costUsd * bankRate).toFixed(2)) : costUsd;

  const priceInAltCurrency =
    currency === 'ZiG' ? sellingUsd : Number((sellingUsd * bankRate).toFixed(2));
  const altCurrency: CurrencyType = currency === 'ZiG' ? 'USD' : 'ZiG';

  const threshold = product.lowStockThreshold || 5;
  const stockInfo = getStockStatus(product.stockQuantity, threshold);
  const isLow = product.stockQuantity > 0 && product.stockQuantity <= threshold;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">Product Details</h2>
              <p className="text-[10px] text-stone-400 font-mono">Barcode: {product.barcode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-stone-800">
          {/* Product Image & Quick Picture Action */}
          <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center group">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-stone-400 p-4 text-center">
                <Tag size={40} className="text-stone-300 mb-2" />
                <span className="text-xs font-bold text-stone-500">No Image Attached</span>
                <span className="text-[10px] text-stone-400 mt-0.5">
                  Scan barcode to attach a high-resolution photo
                </span>
              </div>
            )}

            {/* Change / Add Picture Floating Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenScanPicture(product);
              }}
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-black text-amber-300 border border-amber-500/40 text-xs font-bold shadow-lg backdrop-blur-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Camera size={14} className="text-amber-400" />
              <span>{product.imageUrl ? 'Change Picture' : 'Add Picture'}</span>
            </button>
          </div>

          {/* Title & Category Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                {product.category}
              </span>
              {product.sizeVariant && (
                <span className="text-[10px] font-semibold text-stone-500 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                  {product.sizeVariant}
                </span>
              )}
            </div>
            <h1 className="text-lg font-black text-stone-900 leading-snug">
              {product.name}
            </h1>
          </div>

          {/* Barcode Display */}
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 flex flex-col items-center justify-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Scannable Code 128 Barcode
            </span>
            <BarcodeRenderer value={product.barcode} width={1.5} height={36} fontSize={11} />
          </div>

          {/* Pricing, Cost & Profit Margin Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Selling Price */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                Selling Price
              </span>
              <div className="text-lg font-black text-emerald-900 mt-0.5">
                {formatCurrency(priceInActiveCurrency, currency)}
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                ≈ {formatCurrency(priceInAltCurrency, altCurrency)}
              </span>
            </div>

            {/* Cost Price */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-600 block">
                Unit Cost Price
              </span>
              <div className="text-lg font-black text-stone-900 mt-0.5">
                {formatCurrency(costInActiveCurrency, currency)}
              </div>
              <span className="text-[10px] text-stone-500 font-semibold block mt-0.5">
                Base cost in inventory
              </span>
            </div>

            {/* Unit Margin */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-800 block flex items-center gap-1">
                <TrendingUp size={12} />
                <span>Unit Profit Margin</span>
              </span>
              <div className="text-lg font-black text-amber-950 mt-0.5">
                +${margin.unitMargin.toFixed(2)}
              </div>
              <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                Margin: {margin.marginPct}%
              </span>
            </div>

            {/* Stock Level */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-600 block">
                Available Stock
              </span>
              <div className="text-lg font-black text-stone-900 mt-0.5 flex items-center gap-2">
                <span>{product.stockQuantity} Units</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${stockInfo.color}`}>
                  {product.stockQuantity <= 0 ? 'Out' : isLow ? 'Low' : 'OK'}
                </span>
              </div>
              <span className="text-[10px] text-stone-500 block mt-0.5">
                Alert threshold: {threshold}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onPrintLabel(product);
            }}
            className="flex-1 py-2.5 px-3 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer size={13} className="text-amber-400" />
            <span>Print Label</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(product);
            }}
            className="flex-1 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Edit3 size={13} />
            <span>Edit Product</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${product.name}" from inventory?`)) {
                onDelete(product.id);
                onClose();
              }
            }}
            className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            title="Delete Product"
          >
            <Trash2 size={13} />
            <span className="hidden xs:inline">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
