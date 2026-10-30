import React, { useState, useMemo } from 'react';
import {
  Search,
  Barcode,
  Camera,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Coins,
  ArrowRight,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { CurrencyType, formatCurrency, getStockStatus } from '../utils/pos-logic';
import { BarcodeRenderer } from './BarcodeRenderer';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { playScanBeep, playErrorBuzzer } from '../utils/audio';

interface InventoryCheckViewProps {
  products: Product[];
  currency: CurrencyType;
  bankRate: number;
  onAddToCart?: (product: Product) => void;
  onSwitchToSales?: () => void;
}

export const InventoryCheckView: React.FC<InventoryCheckViewProps> = ({
  products,
  currency,
  bankRate,
  onAddToCart,
  onSwitchToSales,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW' | 'OUT'>('ALL');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLaserFiring, setIsLaserFiring] = useState(false);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const statusObj = getStockStatus(p.stockQuantity, p.lowStockThreshold || 5);

      let matchesStock = true;
      if (stockFilter === 'IN_STOCK') matchesStock = statusObj.status === 'IN_STOCK';
      if (stockFilter === 'LOW') matchesStock = statusObj.status === 'LOW_STOCK';
      if (stockFilter === 'OUT') matchesStock = statusObj.status === 'OUT_OF_STOCK';

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.sizeVariant && p.sizeVariant.toLowerCase().includes(q));

      return matchesCategory && matchesStock && matchesSearch;
    });
  }, [products, selectedCategory, stockFilter, searchTerm]);

  // Laser scanner trigger simulation
  const triggerLaserScanner = () => {
    setIsLaserFiring(true);
    playScanBeep();
    setTimeout(() => {
      setIsLaserFiring(false);
      setIsScannerOpen(true);
    }, 200);
  };

  const handleBarcodeScanned = (barcode: string) => {
    setSearchTerm(barcode);
    const found = products.find((p) => p.barcode === barcode);
    if (found) {
      playScanBeep();
    } else {
      playErrorBuzzer();
    }
  };

  const handleAdd = (product: Product) => {
    if (product.stockQuantity <= 0) {
      playErrorBuzzer();
      alert(`"${product.name}" is out of stock!`);
      return;
    }
    if (onAddToCart) {
      playScanBeep();
      onAddToCart(product);
      setJustAddedId(product.id);
      setTimeout(() => setJustAddedId(null), 1200);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-100 text-stone-900 select-none overflow-hidden">
      {/* Top Banner / Barcode Scan Command Bar */}
      <div className="bg-stone-900 text-white px-3 sm:px-4 py-2.5 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            <Package size={17} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold tracking-tight">
              Q3 Fast Inventory &amp; Price Check
            </h2>
            <p className="text-[10px] text-stone-400">
              Scan barcode to verify live stock level and USD / ZiG retail price
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Laser Hardware Trigger Button */}
          <button
            onClick={triggerLaserScanner}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap ${
              isLaserFiring
                ? 'bg-rose-600 text-white scale-95 shadow-[0_0_15px_#f43f5e]'
                : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-98'
            }`}
          >
            <Barcode size={15} />
            <span>Laser Scan</span>
          </button>

          {/* Camera Scanner Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl border border-stone-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Camera size={14} className="text-stone-300" />
            <span className="hidden sm:inline">Camera</span>
          </button>

          {onSwitchToSales && (
            <button
              onClick={onSwitchToSales}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-stone-900 rounded-xl font-bold text-xs hover:bg-stone-100 transition-colors cursor-pointer shadow-xs"
            >
              <ShoppingCart size={14} className="text-amber-600" />
              <span>Back to Register</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input & Quick Filters Bar */}
      <div className="bg-white border-b border-stone-200 p-3 shrink-0 flex flex-col md:flex-row gap-2 items-stretch md:items-center justify-between shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Scan barcode or type product name, size, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-20 py-2 bg-stone-50 hover:bg-stone-100/80 focus:bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs sm:text-sm text-stone-900 font-medium placeholder-stone-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-stone-400 hover:text-stone-600 font-bold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Stock Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 shrink-0 text-xs font-semibold">
          {[
            { id: 'ALL', label: `All (${products.length})` },
            { id: 'IN_STOCK', label: 'In Stock' },
            { id: 'LOW', label: 'Low Stock' },
            { id: 'OUT', label: 'Out of Stock' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStockFilter(f.id as any)}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                stockFilter === f.id
                  ? 'bg-stone-900 text-white font-bold shadow-2xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Category Filters */}
      <div className="bg-stone-50 border-b border-stone-200 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] font-semibold ${
              selectedCategory === cat
                ? 'bg-amber-600 text-white font-bold shadow-2xs'
                : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Inventory List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-stone-400 p-4 text-center">
            <Package size={40} className="stroke-1 text-stone-300 mb-2" />
            <p className="text-sm font-semibold text-stone-600">No matching items found</p>
            <p className="text-xs text-stone-400 mt-0.5">
              Try a different barcode or product name search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredProducts.map((p) => {
              const statusObj = getStockStatus(p.stockQuantity, p.lowStockThreshold || 5);
              const usdPrice = p.sellingPriceUsd;
              const zigPrice = Number((usdPrice * bankRate).toFixed(2));
              const isOut = p.stockQuantity <= 0;
              const isLow = statusObj.status === 'LOW_STOCK';
              const isJustAdded = justAddedId === p.id;

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-xl border p-3 flex flex-col justify-between transition-all shadow-2xs ${
                    isOut
                      ? 'border-rose-200 bg-rose-50/20 opacity-80'
                      : isLow
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    {/* Header: Category & Stock Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide truncate">
                        {p.category}
                      </span>
                      {isOut ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1 shrink-0">
                          <XCircle size={11} />
                          <span>Out of Stock (0)</span>
                        </span>
                      ) : isLow ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1 shrink-0">
                          <AlertTriangle size={11} />
                          <span>Low Stock ({p.stockQuantity} left)</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 shrink-0">
                          <CheckCircle2 size={11} />
                          <span>In Stock: {p.stockQuantity} units</span>
                        </span>
                      )}
                    </div>

                    {/* Product Name & Variant */}
                    <h3 className="font-bold text-xs sm:text-sm text-stone-900 leading-snug line-clamp-2">
                      {p.name}
                    </h3>
                    {p.sizeVariant && (
                      <span className="text-[11px] text-stone-500 font-medium block mt-0.5">
                        Variant: {p.sizeVariant}
                      </span>
                    )}

                    {/* Barcode Display */}
                    <div className="mt-2 py-1 px-2 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between font-mono text-[11px] text-stone-600">
                      <div className="flex items-center gap-1">
                        <Barcode size={13} className="text-amber-600" />
                        <span>{p.barcode}</span>
                      </div>
                      <span className="text-[10px] text-stone-400">Barcode</span>
                    </div>
                  </div>

                  {/* Pricing & Add Action Bar */}
                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-stone-400 font-semibold">Retail Price:</div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-stone-900">
                          ${usdPrice.toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-amber-800 font-mono">
                          • ZiG {zigPrice.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {onAddToCart && (
                      <button
                        onClick={() => handleAdd(p)}
                        disabled={isOut}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                          isOut
                            ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            : isJustAdded
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                            : 'bg-stone-900 hover:bg-black text-amber-400 active:scale-95'
                        }`}
                        title="Add this verified product to current sales cart"
                      >
                        {isJustAdded ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Added!</span>
                          </>
                        ) : (
                          <>
                            <Plus size={13} />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        products={products}
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </div>
  );
};
