import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  Barcode as BarcodeIcon,
  Tag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Printer,
  TrendingUp,
  Coins,
  Lock,
  DollarSign,
  Activity,
  ArrowDownRight,
  Sparkles,
  X,
  Radio,
  Camera,
  Eye,
  Download,
  FileSpreadsheet,
  Receipt,
  ChevronLeft,
  ChevronRight,
  LayoutGrid as GridIcon,
  Table as TableIcon,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { getStockStatus, formatCurrency, calculateUnitMargin, CurrencyType, SaleTransaction } from '../utils/pos-logic';
import { UserRole, USER_ROLES, canDeleteProduct, canChangeBankRate } from '../utils/role-access';
import { ProductFormModal } from './ProductFormModal';
import { BarcodeLabelsModal } from './BarcodeLabelsModal';
import { BarcodeRenderer } from './BarcodeRenderer';
import { BankRateModal } from './BankRateModal';
import { ProductDetailModal } from './ProductDetailModal';
import { ScanPictureModal } from './ScanPictureModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { downloadInventoryExcel } from '../utils/report-export';

interface OwnerDashboardProps {
  products: Product[];
  currency: CurrencyType;
  bankRate: number;
  onUpdateBankRate: (newRate: number) => Promise<void>;
  onUpdateProductStock: (id: number, newStock: number) => Promise<void>;
  onCreateProduct: (data: Partial<Product>) => Promise<void>;
  onUpdateProduct: (id: number, data: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: number) => Promise<void>;
  onRefresh: () => void;
  isOnline: boolean;
  currentUserRole?: UserRole;
  onOpenApkModal?: () => void;
  recentSalesData?: SaleTransaction[];
}

interface RecentSaleActivity {
  id: number;
  time: string;
  items: { name: string; quantity: number }[];
  totalAmount: number;
  currency: CurrencyType;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  products,
  currency,
  bankRate,
  onUpdateBankRate,
  onUpdateProductStock,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onRefresh,
  isOnline,
  currentUserRole = 'ADMIN',
  onOpenApkModal,
  recentSalesData = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);

  // View Product Detail Modal State (Admin & Store Owner)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Interactive KPI Breakdown Modals State (Clickable Stock, Valuation, Profit, Sales)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isValuationModalOpen, setIsValuationModalOpen] = useState(false);
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isBarcodeLookupOpen, setIsBarcodeLookupOpen] = useState(false);

  // Scan Barcode & Snap/Upload Picture State
  const [isScanPictureOpen, setIsScanPictureOpen] = useState(false);
  const [scanPictureTarget, setScanPictureTarget] = useState<Product | null>(null);
  const [initialNewBarcode, setInitialNewBarcode] = useState<string>('');
  const [initialNewImageUrl, setInitialNewImageUrl] = useState<string>('');

  // Quick Price Edit State
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [quickNewPriceUsd, setQuickNewPriceUsd] = useState<string>('');
  const [quickNewCostUsd, setQuickNewCostUsd] = useState<string>('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // Recent Q3 POS Transactions Feed
  const [showActivityFeed, setShowActivityFeed] = useState(true);

  // Live feed of the latest POS sales (comes from Firestore via App, any network)
  const recentSales: RecentSaleActivity[] = useMemo(
    () =>
      recentSalesData.slice(0, 5).map((s) => ({
        id: s.id,
        time: new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: s.items.map((it) => ({ name: it.name, quantity: it.quantity })),
        totalAmount: s.totalAmount,
        currency: (s.currency as CurrencyType) || 'USD',
      })),
    [recentSalesData]
  );

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  }, [products]);

  // Inventory stats & Profit calculations
  const stats = useMemo(() => {
    let totalItems = products.length;
    let outOfStock = 0;
    let lowStock = 0;
    let healthyStock = 0;
    let totalStockUnits = 0;
    let totalValuationUsd = 0;
    let totalCostValuationUsd = 0;

    for (const p of products) {
      totalStockUnits += p.stockQuantity;
      const priceUsd = p.sellingPriceUsd || p.sellingPrice || 0;
      const costUsd = p.costPrice || Number((priceUsd * 0.58).toFixed(2));
      totalValuationUsd += priceUsd * p.stockQuantity;
      totalCostValuationUsd += costUsd * p.stockQuantity;

      const threshold = p.lowStockThreshold || 5;
      if (p.stockQuantity <= 0) outOfStock++;
      else if (p.stockQuantity <= threshold) lowStock++;
      else healthyStock++;
    }

    const potentialGrossProfitUsd = totalValuationUsd - totalCostValuationUsd;
    const overallMarginPct =
      totalValuationUsd > 0
        ? ((potentialGrossProfitUsd / totalValuationUsd) * 100).toFixed(1)
        : '0.0';

    const totalValuation =
      currency === 'ZiG'
        ? totalValuationUsd * bankRate
        : totalValuationUsd;

    const potentialProfit =
      currency === 'ZiG'
        ? potentialGrossProfitUsd * bankRate
        : potentialGrossProfitUsd;

    return {
      totalItems,
      outOfStock,
      lowStock,
      healthyStock,
      totalStockUnits,
      totalValuation,
      totalValuationUsd,
      totalValuationZig: totalValuationUsd * bankRate,
      potentialProfit,
      overallMarginPct,
    };
  }, [products, currency, bankRate]);

  // Filtered inventory
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sizeVariant && p.sizeVariant.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

      const threshold = p.lowStockThreshold || 5;
      let matchesStock = true;
      if (stockFilter === 'OUT_OF_STOCK') matchesStock = p.stockQuantity <= 0;
      else if (stockFilter === 'LOW_STOCK') matchesStock = p.stockQuantity > 0 && p.stockQuantity <= threshold;
      else if (stockFilter === 'IN_STOCK') matchesStock = p.stockQuantity > threshold;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  // View mode and pagination so inventory fits on one page
  const [dashboardViewMode, setDashboardViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(12); // Default 12 items to fit cleanly on 1 page!

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory, stockFilter]);

  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    if (pageSize === 'ALL') return filteredProducts;
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  const handleViewProduct = (p: Product) => {
    setViewingProduct(p);
    setIsDetailModalOpen(true);
  };

  const handleOpenScanPicture = (p?: Product) => {
    setScanPictureTarget(p || null);
    setIsScanPictureOpen(true);
  };

  const handleCreateWithBarcodeAndImage = (barcode: string, imageUrl: string) => {
    setEditingProduct(null);
    setInitialNewBarcode(barcode);
    setInitialNewImageUrl(imageUrl);
    setIsScanPictureOpen(false);
    setIsFormModalOpen(true);
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setIsFormModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingProduct(null);
    setInitialNewBarcode('');
    setInitialNewImageUrl('');
    setIsFormModalOpen(true);
  };

  const handleDelete = async (p: Product) => {
    if (confirm(`Remove "${p.name}" (Barcode: ${p.barcode}) from inventory?`)) {
      try {
        await onDeleteProduct(p.id);
      } catch (err: any) {
        alert(err.message || 'Error deleting product');
      }
    }
  };

  const openQuickPriceEdit = (p: Product) => {
    setQuickPriceProduct(p);
    setQuickNewPriceUsd(String(p.sellingPriceUsd || p.sellingPrice || ''));
    setQuickNewCostUsd(String(p.costPrice || ''));
  };

  const handleSaveQuickPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceProduct) return;
    const numPrice = parseFloat(quickNewPriceUsd);
    const numCost = parseFloat(quickNewCostUsd);

    if (isNaN(numPrice) || numPrice <= 0) {
      alert('Please enter a valid positive selling price.');
      return;
    }

    setIsSavingPrice(true);
    try {
      await onUpdateProduct(quickPriceProduct.id, {
        sellingPrice: numPrice,
        sellingPriceUsd: numPrice,
        sellingPriceZig: Number((numPrice * bankRate).toFixed(2)),
        costPrice: isNaN(numCost) ? quickPriceProduct.costPrice : numCost,
        costPriceUsd: isNaN(numCost) ? quickPriceProduct.costPrice : numCost,
      });
      setQuickPriceProduct(null);
    } catch (err: any) {
      alert(err.message || 'Error updating price');
    } finally {
      setIsSavingPrice(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Top Banner & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Store Stock &amp; Price Management
            </h1>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {isOnline ? 'Linked to Q3 Terminal' : 'Offline Mode'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time multi-currency inventory. Sales made on the Q3 POS automatically deduct stock here.
          </p>
        </div>

        {/* Responsive Side-by-Side Action Grid */}
        <div className="space-y-2 w-full lg:w-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* SCAN BARCODE */}
            <button
              onClick={() => setIsBarcodeLookupOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-black active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Scan barcode with camera to find product or check stock"
            >
              <BarcodeIcon size={14} className="text-amber-400" />
              <span>Scan Barcode</span>
            </button>

            {/* SCAN BARCODE TO ADD PICTURE */}
            <button
              onClick={() => handleOpenScanPicture()}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Scan product barcode to snap or upload picture"
            >
              <Camera size={14} className="text-amber-200" />
              <span>Add Photo</span>
            </button>

            {/* ADD PRODUCT BUTTON */}
            <button
              onClick={handleCreateNew}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Add Item</span>
            </button>

            {/* EXPORT STOCK CATALOG TO EXCEL (.XLSX) */}
            <button
              onClick={() => downloadInventoryExcel(products, currency, bankRate)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Export complete inventory catalog to Excel .xlsx"
            >
              <FileSpreadsheet size={14} className="text-emerald-200" />
              <span>Export Excel</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* RBZ Interbank Rate Pill */}
            <button
              onClick={() => {
                if (canChangeBankRate(currentUserRole)) {
                  setIsRateModalOpen(true);
                } else {
                  alert('Changing official bank rate is reserved for Store Owner (Admin).');
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Configure Official RBZ Bank Rate"
            >
              <Coins size={14} className="text-amber-600" />
              <span>1 USD = {bankRate.toFixed(2)} ZiG</span>
            </button>

            {/* PRINT LABELS */}
            <button
              onClick={() => setIsLabelModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Printer size={13} className="text-stone-600" />
              <span>Labels</span>
            </button>

            {/* SYNC DATABASE */}
            <button
              onClick={onRefresh}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Refresh database catalog"
            >
              <RefreshCw size={13} />
              <span>Sync Cloud</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Financial & Stock Metric Cards - ALL CLICKABLE FOR DETAILED BREAKDOWN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. Total SKUs & Units - Clickable */}
        <button
          type="button"
          onClick={() => setIsStockModalOpen(true)}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs hover:border-emerald-500 hover:shadow-md transition-all text-left flex flex-col justify-between cursor-pointer group active:scale-[0.98]"
        >
          <div>
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-600">
                Stock &amp; SKUs
              </span>
              <Package size={17} className="text-stone-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-stone-900">{stats.totalItems}</span>
              <span className="text-[11px] text-stone-500 font-medium">({stats.totalStockUnits} units)</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[10px] text-emerald-700 font-bold">
            <span>{stats.lowStock > 0 ? `⚠️ ${stats.lowStock} low stock` : '✓ Stock healthy'}</span>
            <span className="group-hover:translate-x-0.5 transition-transform">View Stock →</span>
          </div>
        </button>

        {/* 2. Total Stock Valuation - Clickable */}
        <button
          type="button"
          onClick={() => setIsValuationModalOpen(true)}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs hover:border-emerald-500 hover:shadow-md transition-all text-left flex flex-col justify-between cursor-pointer group active:scale-[0.98]"
        >
          <div>
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-600">
                Stock Valuation
              </span>
              <TrendingUp size={17} className="text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-800 truncate">
              {formatCurrency(stats.totalValuation, currency)}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[10px] text-emerald-700 font-bold">
            <span className="font-mono text-stone-500">
              {currency === 'USD'
                ? `≈ ZiG ${(stats.totalValuationUsd * bankRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                : `≈ $${stats.totalValuationUsd.toFixed(2)}`}
            </span>
            <span className="group-hover:translate-x-0.5 transition-transform">Valuation →</span>
          </div>
        </button>

        {/* 3. Potential Gross Profit - Clickable */}
        <button
          type="button"
          onClick={() => setIsProfitModalOpen(true)}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs hover:border-amber-500 hover:shadow-md transition-all text-left flex flex-col justify-between cursor-pointer group active:scale-[0.98]"
        >
          <div>
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-600">
                Estimated Profit
              </span>
              <Sparkles size={17} className="text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-stone-900 truncate">
              +{formatCurrency(stats.potentialProfit, currency)}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[10px] text-amber-700 font-bold">
            <span>Margin: {stats.overallMarginPct}%</span>
            <span className="group-hover:translate-x-0.5 transition-transform">Profit Details →</span>
          </div>
        </button>

        {/* 4. POS Sales & Deductions - Clickable */}
        <button
          type="button"
          onClick={() => setIsSalesModalOpen(true)}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs hover:border-indigo-500 hover:shadow-md transition-all text-left flex flex-col justify-between cursor-pointer group active:scale-[0.98]"
        >
          <div>
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-600">
                POS Sales &amp; Trx
              </span>
              <Receipt size={17} className="text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-indigo-900">
                {recentSalesData.length}
              </span>
              <span className="text-[11px] text-stone-500 font-medium">Receipts Rung Up</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[10px] text-indigo-700 font-bold">
            <span>
              Total: {formatCurrency(recentSalesData.reduce((acc, s) => acc + s.totalAmount, 0), currency)}
            </span>
            <span className="group-hover:translate-x-0.5 transition-transform">View Sales →</span>
          </div>
        </button>
      </div>

      {/* Live Q3 POS Activity & Automatic Deduction Banner */}
      {recentSales.length > 0 && (
        <div className="bg-stone-900 text-stone-200 rounded-2xl p-3.5 sm:p-4 border border-stone-800 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-extrabold uppercase tracking-wide text-white">
                Live Q3 Terminal Deductions Feed
              </span>
              <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full font-mono">
                Auto-Deducts on Sale
              </span>
            </div>
            <button
              onClick={() => setShowActivityFeed(!showActivityFeed)}
              className="text-[11px] text-stone-400 hover:text-white cursor-pointer font-medium"
            >
              {showActivityFeed ? 'Hide Feed ▲' : 'Show Feed ▼'}
            </button>
          </div>

          {showActivityFeed && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {recentSales.slice(0, 3).map((sale) => (
                <div
                  key={sale.id}
                  className="bg-stone-950/70 p-2.5 rounded-xl border border-stone-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white font-mono text-[11px]">
                        Q3 #{sale.id}
                      </span>
                      <span className="text-[10px] text-stone-400">at {sale.time}</span>
                    </div>
                    <div className="text-[11px] text-stone-300 truncate">
                      {sale.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-emerald-400 font-bold block">
                      -Stock Deducted
                    </span>
                    <span className="text-[11px] font-extrabold text-stone-200">
                      {formatCurrency(sale.totalAmount, sale.currency || currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Toolbar & View Mode Controls */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
            <input
              type="text"
              placeholder="Search items by name, barcode, or size..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* View Mode & Fit on One Page Selector */}
          <div className="flex items-center gap-1.5 shrink-0 justify-between">
            {/* View Mode Switcher */}
            <div className="flex bg-stone-100 p-0.5 rounded-xl border border-stone-200 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => setDashboardViewMode('GRID')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-xs ${
                  dashboardViewMode === 'GRID'
                    ? 'bg-stone-900 text-amber-300 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Side-by-Side 2-Column Grid"
              >
                <GridIcon size={13} />
                <span className="text-[11px]">Side-by-Side</span>
              </button>
              <button
                type="button"
                onClick={() => setDashboardViewMode('TABLE')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-xs ${
                  dashboardViewMode === 'TABLE'
                    ? 'bg-stone-900 text-amber-300 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Fit on 1 Page Dense Table"
              >
                <TableIcon size={13} />
                <span className="text-[11px]">Dense Table</span>
              </button>
            </div>

            {/* Page Size / Fit Selector */}
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPageSize(12)}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[10px] ${
                  pageSize === 12
                    ? 'bg-emerald-600 text-white font-black shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Fit 12 items on one page"
              >
                Fit Page (12)
              </button>
              <button
                type="button"
                onClick={() => setPageSize(24)}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[10px] ${
                  pageSize === 24
                    ? 'bg-emerald-600 text-white font-black shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                24
              </button>
              <button
                type="button"
                onClick={() => setPageSize('ALL')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[10px] ${
                  pageSize === 'ALL'
                    ? 'bg-emerald-600 text-white font-black shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Stock Status Pills and Categories */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-stone-100">
          {/* Stock Filter Pills */}
          <div className="flex gap-1 overflow-x-auto pb-1 text-xs shrink-0">
            {[
              { id: 'ALL', label: `All (${products.length})` },
              { id: 'IN_STOCK', label: `Healthy (${stats.healthyStock})` },
              { id: 'LOW_STOCK', label: `Low (≤${stats.lowStock})` },
              { id: 'OUT_OF_STOCK', label: `Out (${stats.outOfStock})` },
            ].map((sf) => (
              <button
                key={sf.id}
                onClick={() => setStockFilter(sf.id as any)}
                className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer transition-colors whitespace-nowrap text-[11px] ${
                  stockFilter === sf.id
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>

          {/* Category selector row */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs flex-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 
        PRODUCT LISTING:
        Side-by-side 2-column cards on phones & tablets ("side to side down to up"),
        and dense table view that fits on one page!
      */}
      {dashboardViewMode === 'GRID' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
          {paginatedProducts.map((p) => {
            const threshold = p.lowStockThreshold || 5;
            const stock = getStockStatus(p.stockQuantity, threshold);
            const priceUsd = p.sellingPriceUsd || p.sellingPrice || 0;
            const costUsd = p.costPrice || 0;
            const margin = calculateUnitMargin(costUsd, priceUsd);

            const priceZig = Number((priceUsd * bankRate).toFixed(2));
            const activePrice = currency === 'ZiG' ? priceZig : priceUsd;
            const activeCost = currency === 'ZiG' ? Number((costUsd * bankRate).toFixed(2)) : costUsd;
            const activeMargin = activePrice - activeCost;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-stone-200 p-2.5 sm:p-3 shadow-2xs hover:border-stone-300 transition-all flex flex-col justify-between group"
              >
                {/* Product Header: Photo Thumbnail + Stock Badge Side-by-Side */}
                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-1.5">
                    <button
                      type="button"
                      onClick={() => handleViewProduct(p)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 relative group cursor-pointer"
                      title="Tap to view full product details"
                    >
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50">
                          <Package size={15} />
                          <span className="text-[7px] font-bold text-stone-400">No pic</span>
                        </div>
                      )}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenScanPicture(p);
                        }}
                        className="absolute bottom-0 right-0 p-0.5 bg-stone-900/85 text-amber-300 rounded-tl-md text-[9px]"
                        title="Scan / Snap photo"
                      >
                        <Camera size={10} />
                      </span>
                    </button>

                    {/* Stock Status Badge */}
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold border shrink-0 text-right ${stock.color}`}
                    >
                      {p.stockQuantity <= 0 ? 'Out' : `${p.stockQuantity} left`}
                    </span>
                  </div>

                  {/* Product Name & Variant */}
                  <h3
                    onClick={() => handleViewProduct(p)}
                    className="font-extrabold text-stone-900 text-xs sm:text-sm leading-snug line-clamp-2 cursor-pointer hover:text-emerald-700 transition-colors"
                  >
                    {p.name}
                  </h3>

                  <div className="flex items-center gap-1 mt-1 text-[10px]">
                    <span className="font-mono bg-stone-100 text-stone-700 px-1 py-0.2 rounded font-bold border border-stone-200 truncate">
                      {p.barcode}
                    </span>
                    <span className="text-stone-400 truncate">{p.category}</span>
                  </div>

                  {/* Price & Margin Block */}
                  <div className="mt-2 p-1.5 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-sm sm:text-base font-black text-stone-900">
                        {formatCurrency(activePrice, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openQuickPriceEdit(p)}
                        className="text-[9px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                        title="Edit Price"
                      >
                        ✎ Edit
                      </button>
                    </div>
                    <div className="text-[9px] text-stone-400 font-mono">
                      ${priceUsd.toFixed(2)} • ZiG {priceZig.toFixed(0)}
                    </div>
                    <div className="text-[9px] text-emerald-700 font-bold mt-0.5">
                      +{formatCurrency(activeMargin, currency)} ({margin.marginPct}%)
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Compact Stock +/- Adjuster & Action Buttons */}
                <div className="mt-2 pt-2 border-t border-stone-100 space-y-1.5">
                  {/* Inline Stock +/- */}
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => onUpdateProductStock(p.id, Math.max(0, p.stockQuantity - 1))}
                      className="w-6 h-6 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                      title="Deduct 1"
                    >
                      -
                    </button>
                    <span className="text-center font-extrabold text-xs font-mono text-stone-900">
                      {p.stockQuantity}
                    </span>
                    <button
                      onClick={() => onUpdateProductStock(p.id, p.stockQuantity + 1)}
                      className="w-6 h-6 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                      title="Add 1"
                    >
                      +
                    </button>
                    <button
                      onClick={() => onUpdateProductStock(p.id, p.stockQuantity + 5)}
                      className="px-1.5 py-0.5 bg-stone-100 hover:bg-amber-100 text-amber-900 rounded text-[9px] font-bold cursor-pointer"
                      title="Quick restock +5"
                    >
                      +5
                    </button>
                  </div>

                  {/* Quick Action Icons: View, Photo, Edit, Delete */}
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => handleViewProduct(p)}
                      className="p-1 bg-stone-100 hover:bg-emerald-100 text-stone-700 rounded-lg transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye size={11} className="text-emerald-700" />
                    </button>
                    <button
                      onClick={() => handleOpenScanPicture(p)}
                      className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors cursor-pointer"
                      title="Camera Photo"
                    >
                      <Camera size={11} className="text-amber-700" />
                    </button>
                    <button
                      onClick={() => handleEdit(p)}
                      className="p-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-1 bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* 2. DENSE TABLE (Visible when Table View Mode is selected) */}
      {dashboardViewMode === 'TABLE' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Barcode</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4">Unit Margin</th>
                  <th className="py-3 px-4">Selling Price (USD / ZiG)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedProducts.map((p) => {
                const threshold = p.lowStockThreshold || 5;
                const stock = getStockStatus(p.stockQuantity, threshold);
                const isUnderThreshold = p.stockQuantity <= threshold;
                const priceUsd = p.sellingPriceUsd || p.sellingPrice || 0;
                const costUsd = p.costPrice || 0;
                const margin = calculateUnitMargin(costUsd, priceUsd);

                const priceZig = Number((priceUsd * bankRate).toFixed(2));
                const costZig = Number((costUsd * bankRate).toFixed(2));

                const activePrice = currency === 'ZiG' ? priceZig : priceUsd;
                const activeCost = currency === 'ZiG' ? costZig : costUsd;
                const activeMargin = activePrice - activeCost;

                return (
                  <tr key={p.id} className="hover:bg-amber-50/40 transition-colors">
                    {/* Item */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleViewProduct(p)}
                          className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200 relative group cursor-pointer"
                          title="View product specifications"
                        >
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-50">
                              <Package size={15} />
                            </div>
                          )}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenScanPicture(p);
                            }}
                            className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                            title="Scan / Snap picture"
                          >
                            <Camera size={12} className="text-amber-300" />
                          </span>
                        </button>
                        <div>
                          <button
                            type="button"
                            onClick={() => handleViewProduct(p)}
                            className="font-bold text-stone-900 hover:text-emerald-700 transition-colors text-left cursor-pointer"
                          >
                            {p.name}
                          </button>
                          <div className="flex items-center gap-2 mt-0.5">
                            {p.sizeVariant && (
                              <span className="text-[10px] text-stone-500">
                                {p.sizeVariant}
                              </span>
                            )}
                            {isUnderThreshold && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded border border-amber-300">
                                Alert ≤{threshold}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Barcode */}
                    <td className="py-3 px-4 font-mono">
                      <span className="text-stone-800 font-bold bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        {p.barcode}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-stone-600">
                      <span className="truncate max-w-[140px] block">{p.category}</span>
                    </td>

                    {/* Stock Level with threshold badge and inline restock */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stock.color}`}
                          >
                            {p.stockQuantity <= 0 ? 'Out of Stock' : `${p.stockQuantity} in stock`}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            (Min: {threshold})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => onUpdateProductStock(p.id, Math.max(0, p.stockQuantity - 1))}
                              className="text-stone-400 hover:text-stone-700 p-0.5 transition-colors cursor-pointer"
                              title="Decrease stock by 1"
                            >
                              <MinusCircle size={13} />
                            </button>
                            <button
                              onClick={() => onUpdateProductStock(p.id, p.stockQuantity + 1)}
                              className="text-stone-400 hover:text-stone-700 p-0.5 transition-colors cursor-pointer"
                              title="Increase stock by 1"
                            >
                              <PlusCircle size={13} />
                            </button>
                          </div>
                          <span className="text-stone-300">|</span>
                          <button
                            onClick={() => onUpdateProductStock(p.id, p.stockQuantity + 5)}
                            className="px-1.5 py-0.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-600 rounded font-semibold transition-colors cursor-pointer"
                            title="Quick restock +5 units"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => onUpdateProductStock(p.id, p.stockQuantity + 10)}
                            className="px-1.5 py-0.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-600 rounded font-semibold transition-colors cursor-pointer"
                            title="Quick restock +10 units"
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Unit Margin */}
                    <td className="py-3 px-4">
                      <div className="text-stone-800 font-medium">
                        <span className="text-emerald-700 font-bold">
                          +{formatCurrency(activeMargin, currency)}
                        </span>
                        <span className="text-[10px] text-stone-400 ml-1">
                          ({margin.marginPct}%)
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">
                        Cost: {formatCurrency(activeCost, currency)}
                      </span>
                    </td>

                    {/* Selling Price */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-extrabold text-sm text-stone-900">
                            {formatCurrency(activePrice, currency)}
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono">
                            ${priceUsd.toFixed(2)} • ZiG {priceZig.toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => openQuickPriceEdit(p)}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-300 cursor-pointer"
                          title="Quick Price Change"
                        >
                          Edit
                        </button>
                      </div>
                    </td>

                    {/* Actions: View, Photo, Edit & Remove */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewProduct(p)}
                          className="p-1.5 bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                          title="View Full Specifications & Barcode"
                        >
                          <Eye size={13} />
                        </button>

                        <button
                          onClick={() => handleOpenScanPicture(p)}
                          className="p-1.5 bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-800 rounded-lg transition-colors cursor-pointer"
                          title="Scan Barcode to Add/Replace Picture"
                        >
                          <Camera size={13} />
                        </button>

                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors cursor-pointer"
                          title="Edit Full Product Details"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                          title="Remove Item from Catalog"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Pagination Footer - Fits Cleanly on One Page */}
      {pageSize !== 'ALL' && totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 flex items-center justify-between text-xs text-stone-600 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium">
            Showing <strong className="text-stone-900">{paginatedProducts.length}</strong> of{' '}
            <strong className="text-stone-900">{filteredProducts.length}</strong> products (Page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-stone-700"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-stone-100 rounded-lg text-stone-900">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-stone-700"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200 p-8">
          <Package size={36} className="mx-auto text-stone-300 mb-2" />
          <p className="text-sm font-semibold">No products found matching filters</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
              setStockFilter('ALL');
            }}
            className="mt-2 text-xs text-amber-700 font-bold hover:underline cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* QUICK PRICE EDIT MODAL */}
      {quickPriceProduct && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-stone-900 px-4 py-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold">Quick Price Adjustment</h3>
              </div>
              <button
                onClick={() => setQuickPriceProduct(null)}
                className="text-stone-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPrice} className="p-4 space-y-3 text-xs">
              <div>
                <span className="font-extrabold text-stone-900 text-sm block">
                  {quickPriceProduct.name}
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  Barcode: {quickPriceProduct.barcode}
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Selling Price (USD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={quickNewPriceUsd}
                    onChange={(e) => setQuickNewPriceUsd(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
                <p className="text-[10px] text-stone-400 font-mono">
                  Converts to ≈ ZiG {(parseFloat(quickNewPriceUsd || '0') * bankRate).toFixed(2)} at official rate
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Unit Cost Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quickNewCostUsd}
                    onChange={(e) => setQuickNewCostUsd(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                <span>Estimated Profit: </span>
                <strong className="text-emerald-800">
                  +$
                  {(
                    parseFloat(quickNewPriceUsd || '0') -
                    parseFloat(quickNewCostUsd || '0')
                  ).toFixed(2)}{' '}
                  per unit
                </strong>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickPriceProduct(null)}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrice}
                  className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-xs"
                >
                  {isSavingPrice ? 'Saving...' : 'Update Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Form Modal (Add & Full Edit) */}
      <ProductFormModal
        product={editingProduct}
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingProduct(null);
          setInitialNewBarcode('');
          setInitialNewImageUrl('');
        }}
        onSave={async (data) => {
          if (editingProduct) {
            await onUpdateProduct(editingProduct.id, data);
            setViewingProduct({ ...editingProduct, ...data } as Product);
          } else {
            await onCreateProduct(data);
            // Immediately open newly created product in ProductDetailModal so Admin/Owner can view it
            const newlyAdded = products.find((p) => p.barcode === data.barcode) || {
              id: Date.now(),
              barcode: data.barcode || '',
              name: data.name || 'New Product',
              category: data.category || 'Baby Creams, Oils & Lotions',
              sellingPrice: data.sellingPriceUsd || data.sellingPrice || 0,
              sellingPriceUsd: data.sellingPriceUsd || data.sellingPrice || 0,
              sellingPriceZig: Number(((data.sellingPriceUsd || data.sellingPrice || 0) * bankRate).toFixed(2)),
              costPrice: data.costPriceUsd || data.costPrice || 0,
              costPriceUsd: data.costPriceUsd || data.costPrice || 0,
              stockQuantity: data.stockQuantity || 10,
              lowStockThreshold: data.lowStockThreshold || 5,
              imageUrl: data.imageUrl || '',
              sizeVariant: data.sizeVariant || '',
            } as Product;
            setViewingProduct(newlyAdded);
            setIsDetailModalOpen(true);
          }
        }}
        categories={categories.filter((c) => c !== 'All')}
        bankRate={bankRate}
        initialBarcode={initialNewBarcode}
        initialImageUrl={initialNewImageUrl}
        allProducts={products}
      />

      {/* Product Detail Viewer Modal (Admin & Store Owner) */}
      <ProductDetailModal
        product={viewingProduct}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setViewingProduct(null);
        }}
        onEdit={(p) => {
          setIsDetailModalOpen(false);
          handleEdit(p);
        }}
        onDelete={async (id) => {
          setIsDetailModalOpen(false);
          await onDeleteProduct(id);
        }}
        onOpenScanPicture={(p) => {
          setIsDetailModalOpen(false);
          handleOpenScanPicture(p);
        }}
        onPrintLabel={(p) => {
          setIsDetailModalOpen(false);
          setIsLabelModalOpen(true);
        }}
        currency={currency}
        bankRate={bankRate}
      />

      {/* Barcode Scanning & Photo Capture Modal (Camera + File Upload) */}
      <ScanPictureModal
        products={products}
        isOpen={isScanPictureOpen}
        onClose={() => {
          setIsScanPictureOpen(false);
          setScanPictureTarget(null);
        }}
        onUpdateProduct={onUpdateProduct}
        onCreateWithBarcodeAndImage={handleCreateWithBarcodeAndImage}
        initialProduct={scanPictureTarget}
      />

      {/* Barcode Labels Generator Modal */}
      <BarcodeLabelsModal
        products={products}
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        currency={currency}
        bankRate={bankRate}
      />

      {/* Bank Rate Setting Modal */}
      <BankRateModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        currentRate={bankRate}
        onUpdateRate={onUpdateBankRate}
      />

      {/* Toolbar Barcode Lookup Scanner */}
      <BarcodeScannerModal
        isOpen={isBarcodeLookupOpen}
        onClose={() => setIsBarcodeLookupOpen(false)}
        onBarcodeScanned={(code) => {
          setIsBarcodeLookupOpen(false);
          setSearchTerm(code.trim());
          const match = products.find((p) => p.barcode === code.trim());
          if (match) {
            handleViewProduct(match);
          }
        }}
        currency={currency}
        bankRate={bankRate}
        products={products}
      />

      {/* 1. STOCK & SKUS BREAKDOWN MODAL */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Package className="text-emerald-400" size={20} />
                <div>
                  <h3 className="font-extrabold text-base">Central Stock &amp; Inventory Health</h3>
                  <p className="text-xs text-stone-400">Total Catalog SKUs &amp; Shelf Units</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">Catalog SKUs</span>
                  <span className="text-xl font-black text-stone-900">{stats.totalItems}</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Units</span>
                  <span className="text-xl font-black text-emerald-900">{stats.totalStockUnits}</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Low / Out</span>
                  <span className="text-xl font-black text-amber-900">{stats.lowStock + stats.outOfStock}</span>
                </div>
              </div>

              {/* Status Breakdown Pills */}
              <div className="space-y-2">
                <h4 className="font-bold text-stone-800 uppercase text-[11px] tracking-wider">
                  Stock Health Thresholds
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Healthy Stock (&gt; threshold)</span>
                    </span>
                    <span className="font-mono font-black text-emerald-900">{stats.healthyStock} products</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/70 border border-amber-200">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <span>Low Stock Warning (≤ threshold)</span>
                    </span>
                    <span className="font-mono font-black text-amber-900">{stats.lowStock} products</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/70 border border-rose-200">
                    <span className="font-bold text-rose-900 flex items-center gap-1.5">
                      <XCircle size={14} className="text-rose-600" />
                      <span>Depleted / Out of Stock (0 units)</span>
                    </span>
                    <span className="font-mono font-black text-rose-900">{stats.outOfStock} products</span>
                  </div>
                </div>
              </div>

              {/* Breakdown by Category */}
              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-stone-800 uppercase text-[11px] tracking-wider">
                  Stock Units by Category
                </h4>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {categories.filter((c) => c !== 'All').map((cat) => {
                    const catProducts = products.filter((p) => p.category === cat);
                    const units = catProducts.reduce((acc, p) => acc + p.stockQuantity, 0);
                    const pct = stats.totalStockUnits > 0 ? ((units / stats.totalStockUnits) * 100).toFixed(0) : '0';
                    return (
                      <div key={cat} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-stone-800 truncate">{cat}</span>
                          <span className="font-mono font-bold text-stone-700">{units} units ({pct}%)</span>
                        </div>
                        <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fast Action Filter Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setStockFilter('LOW_STOCK');
                    setIsStockModalOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold cursor-pointer transition-colors text-center"
                >
                  Show Low Stock Only
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadInventoryExcel(products, currency, bankRate);
                  }}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer transition-colors text-center flex items-center justify-center gap-1.5"
                >
                  <FileSpreadsheet size={14} />
                  <span>Download Excel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. STOCK VALUATION BREAKDOWN MODAL */}
      {isValuationModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-emerald-400" size={20} />
                <div>
                  <h3 className="font-extrabold text-base">Central Inventory Stock Valuation</h3>
                  <p className="text-xs text-stone-400">Total Asset Worth in USD &amp; ZiG</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsValuationModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Dual Currency Valuation Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900 to-stone-900 text-white space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                  Total Inventory Retail Value
                </span>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                    ${stats.totalValuationUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-lg font-bold text-amber-300 font-mono">
                    ≈ ZiG {(stats.totalValuationUsd * bankRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <p className="text-[11px] text-stone-300">
                  Calculated at official RBZ rate: 1 USD = {bankRate.toFixed(2)} ZiG
                </p>
              </div>

              {/* Category-by-Category Valuation */}
              <div className="space-y-2">
                <h4 className="font-bold text-stone-800 uppercase text-[11px] tracking-wider">
                  Valuation Breakdown by Department
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {categories.filter((c) => c !== 'All').map((cat) => {
                    const catProducts = products.filter((p) => p.category === cat);
                    const catValUsd = catProducts.reduce((acc, p) => {
                      const price = p.sellingPriceUsd || p.sellingPrice || 0;
                      return acc + price * p.stockQuantity;
                    }, 0);
                    const pct = stats.totalValuationUsd > 0 ? ((catValUsd / stats.totalValuationUsd) * 100).toFixed(1) : '0';

                    return (
                      <div key={cat} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-stone-900 block truncate">{cat}</span>
                          <span className="text-[10px] text-stone-500">{pct}% of total catalog value</span>
                        </div>
                        <div className="text-right shrink-0 font-mono">
                          <span className="font-black text-stone-900 text-xs block">${catValUsd.toFixed(2)}</span>
                          <span className="text-[10px] text-amber-700 font-bold">
                            ZiG {(catValUsd * bankRate).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Export Action */}
              <div className="pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => downloadInventoryExcel(products, currency, bankRate)}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <FileSpreadsheet size={15} />
                  <span>Download Complete Valuation Ledger (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ESTIMATED PROFIT & MARGIN MODAL */}
      {isProfitModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-400" size={20} />
                <div>
                  <h3 className="font-extrabold text-base">Estimated Profit &amp; Margins</h3>
                  <p className="text-xs text-stone-400">Projected Gross Margins Across Current Stock</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfitModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950 to-stone-900 text-white space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-300 block">
                  Potential Gross Profit
                </span>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  +${stats.potentialProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-stone-300">
                  <span>Gross Margin: <strong className="text-white">{stats.overallMarginPct}%</strong></span>
                  <span>•</span>
                  <span>In ZiG: <strong className="text-amber-300">≈ ZiG {(stats.potentialProfit * bankRate).toFixed(0)}</strong></span>
                </div>
              </div>

              {/* Highest Margin Products */}
              <div className="space-y-2">
                <h4 className="font-bold text-stone-800 uppercase text-[11px] tracking-wider">
                  Top High-Margin Inventory Lines
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {[...products]
                    .map((p) => {
                      const price = p.sellingPriceUsd || p.sellingPrice || 0;
                      const cost = p.costPrice || 0;
                      const margin = calculateUnitMargin(cost, price);
                      return { ...p, unitProfitUsd: margin.unitMargin, marginPct: margin.marginPct };
                    })
                    .sort((a, b) => b.unitProfitUsd - a.unitProfitUsd)
                    .slice(0, 6)
                    .map((p) => (
                      <div key={p.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-stone-900 block truncate">{p.name}</span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            Cost: ${(p.costPrice || 0).toFixed(2)} → Price: ${(p.sellingPriceUsd || p.sellingPrice || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-emerald-700 text-xs font-mono block">
                            +${p.unitProfitUsd.toFixed(2)}
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                            {p.marginPct}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsProfitModalOpen(false)}
                  className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl font-bold cursor-pointer transition-colors text-center"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. POS SALES & TRANSACTIONS BREAKDOWN MODAL */}
      {isSalesModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="text-indigo-400" size={20} />
                <div>
                  <h3 className="font-extrabold text-base">POS Sales &amp; Customer Receipts</h3>
                  <p className="text-xs text-stone-400">Live sales recorded from Q3 POS Terminal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSalesModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 block">Total Receipts</span>
                  <span className="text-xl font-black text-indigo-950">{recentSalesData.length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Gross Sales Value</span>
                  <span className="text-xl font-black text-emerald-950">
                    {formatCurrency(recentSalesData.reduce((acc, s) => acc + s.totalAmount, 0), currency)}
                  </span>
                </div>
              </div>

              {/* Itemized Sales Receipts List */}
              <div className="space-y-2">
                <h4 className="font-bold text-stone-800 uppercase text-[11px] tracking-wider">
                  Recent Sales Ledger
                </h4>
                {recentSalesData.length === 0 ? (
                  <div className="p-6 text-center text-stone-400 bg-stone-50 rounded-2xl border border-stone-200">
                    <Receipt size={32} className="mx-auto mb-2 text-stone-300" />
                    <p className="font-bold text-stone-600">No Sales Recorded Yet</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Ring up transactions on the Q3 POS to see live deductions and receipts here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {recentSalesData.map((sale) => (
                      <div key={sale.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-stone-900 font-mono">
                            {sale.receiptNo || `#${sale.id}`}
                          </span>
                          <span className="font-extrabold text-stone-900">
                            {formatCurrency(sale.totalAmount, (sale.currency as CurrencyType) || currency)}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 flex justify-between">
                          <span>
                            {new Date(sale.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {sale.cashierName ? ` • ${sale.cashierName}` : ''}
                          </span>
                          <span className="font-mono text-emerald-700 font-bold">{sale.paymentMethod}</span>
                        </div>
                        <div className="text-[11px] text-stone-600 bg-white p-2 rounded-lg border border-stone-200/80">
                          {sale.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsSalesModalOpen(false)}
                  className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl font-bold cursor-pointer transition-colors text-center"
                >
                  Close Sales View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
