import React, { useState, useMemo } from 'react';
import {
  Search,
  Barcode as BarcodeIcon,
  Camera,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  ArrowLeft,
  X,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { CurrencyType, formatCurrency, getStockStatus } from '../utils/pos-logic';
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
  const [justAddedId, setJustAddedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(12); // Default to 12 items so it fits on 1 page!

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

  // Reset page on filter changes
  useMemo(() => {
    setPage(1);
  }, [selectedCategory, stockFilter, searchTerm]);

  // Pagination calculation
  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    if (pageSize === 'ALL') return filteredProducts;
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  const handleBarcodeScanned = (scannedCode: string) => {
    const code = scannedCode.trim();
    setSearchTerm(code);
    setIsScannerOpen(false);

    const found = products.find((p) => p.barcode === code);
    if (found) {
      playScanBeep();
    } else {
      playErrorBuzzer();
    }
  };

  const handleAdd = (product: Product) => {
    if (product.stockQuantity <= 0) {
      playErrorBuzzer();
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
    <div className="flex flex-col h-full w-full bg-stone-100 text-stone-900 select-none overflow-hidden">
      {/* Search & Filter Toolbar */}
      <div className="bg-white border-b border-stone-200 px-3 py-2 space-y-1.5 shrink-0 shadow-2xs">
        {/* Search Bar with integrated camera scanner and instant clear */}
        <div className="relative flex items-center w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search items, barcodes, sizes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-20 py-1.5 sm:py-2 bg-stone-50 hover:bg-stone-100/80 focus:bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
          />
          <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="w-5 h-5 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer mr-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Scan physical product barcode"
            >
              <Camera size={12} />
              <span>Scan</span>
            </button>
          </div>
        </div>

        {/* Stock Filter Pills & Category Filter Row Side-by-Side on Desktop / Stacked on Mobile */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 text-xs">
          <div className="flex items-center gap-1 shrink-0">
            {[
              { id: 'ALL', label: `All (${products.length})` },
              { id: 'IN_STOCK', label: 'In Stock' },
              { id: 'LOW', label: 'Low' },
              { id: 'OUT', label: 'Out' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStockFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap text-[11px] font-bold ${
                  stockFilter === f.id
                    ? 'bg-stone-900 text-amber-300 shadow-2xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Page fit controls */}
          <div className="flex items-center gap-1 shrink-0 text-[10px]">
            <span className="text-stone-400 hidden xs:inline">Fit:</span>
            <button
              onClick={() => setPageSize(12)}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                pageSize === 12 ? 'bg-amber-500 text-stone-950' : 'bg-stone-100 text-stone-600'
              }`}
            >
              1 Page (12)
            </button>
            <button
              onClick={() => setPageSize('ALL')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                pageSize === 'ALL' ? 'bg-amber-500 text-stone-950' : 'bg-stone-100 text-stone-600'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] font-semibold ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white font-bold shadow-2xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-side Product Grid - Fits on One Page */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 sm:p-3">
        {filteredProducts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-stone-400 p-4 text-center">
            <Package size={36} className="text-stone-300 mb-2 stroke-1" />
            <p className="text-xs font-bold text-stone-600">No matching items found</p>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Try a different barcode or product name search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {paginatedProducts.map((p) => {
              const threshold = p.lowStockThreshold || 5;
              const statusObj = getStockStatus(p.stockQuantity, threshold);
              const usdPrice = p.sellingPriceUsd || p.sellingPrice || 0;
              const zigPrice = Number((usdPrice * bankRate).toFixed(2));
              const isOut = p.stockQuantity <= 0;
              const isLow = statusObj.status === 'LOW_STOCK';
              const isJustAdded = justAddedId === p.id;

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl border p-2.5 sm:p-3 flex flex-col justify-between transition-all shadow-2xs ${
                    isOut
                      ? 'border-rose-200 bg-rose-50/20 opacity-80'
                      : isLow
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    {/* Header: Category & Stock Status Badge */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wide truncate">
                        {p.category}
                      </span>
                      {isOut ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 shrink-0">
                          Out (0)
                        </span>
                      ) : isLow ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 shrink-0">
                          {p.stockQuantity} left
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                          {p.stockQuantity} units
                        </span>
                      )}
                    </div>

                    {/* Product Name & Variant */}
                    <h3 className="font-extrabold text-xs text-stone-900 leading-snug line-clamp-2">
                      {p.name}
                    </h3>
                    {p.sizeVariant && (
                      <span className="text-[10px] text-stone-500 font-medium block">
                        {p.sizeVariant}
                      </span>
                    )}

                    {/* Barcode Pill */}
                    <div className="mt-1 py-0.5 px-1.5 bg-stone-50 rounded border border-stone-200 inline-flex items-center gap-1 font-mono text-[9px] text-stone-600 font-bold">
                      <BarcodeIcon size={10} className="text-amber-600 shrink-0" />
                      <span className="truncate">{p.barcode}</span>
                    </div>
                  </div>

                  {/* Pricing & Add to Cart Action */}
                  <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between gap-1">
                    <div>
                      <span className="text-sm sm:text-base font-black text-stone-900 block leading-none">
                        ${usdPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 font-mono block">
                        ZiG {zigPrice.toFixed(0)}
                      </span>
                    </div>

                    {onAddToCart && (
                      <button
                        type="button"
                        onClick={() => handleAdd(p)}
                        disabled={isOut}
                        className={`px-2.5 py-1 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 ${
                          isOut
                            ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            : isJustAdded
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                            : 'bg-stone-900 hover:bg-black text-amber-400'
                        }`}
                        title="Add to sales cart"
                      >
                        {isJustAdded ? (
                          <>
                            <CheckCircle2 size={11} />
                            <span className="text-[10px]">Added</span>
                          </>
                        ) : (
                          <>
                            <Plus size={11} />
                            <span className="text-[10px]">Add</span>
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

      {/* Pagination Footer - Fits cleanly on One Page */}
      {pageSize !== 'ALL' && totalPages > 1 && (
        <div className="bg-white border-t border-stone-200 px-3 py-2 flex items-center justify-between shrink-0 text-xs text-stone-600">
          <span className="text-[11px] font-medium">
            Page <strong className="text-stone-900">{page}</strong> of{' '}
            <strong className="text-stone-900">{totalPages}</strong> ({filteredProducts.length} items)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-stone-100 rounded">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal with Camera */}
      <BarcodeScannerModal
        products={products}
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        onBarcodeScanned={handleBarcodeScanned}
        currency={currency}
        bankRate={bankRate}
      />
    </div>
  );
};
