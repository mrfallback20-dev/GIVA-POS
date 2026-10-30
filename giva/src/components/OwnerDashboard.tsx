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
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
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

        <div className="flex flex-wrap items-center gap-2">
          {/* RBZ Interbank Rate Pill */}
          <button
            onClick={() => {
              if (canChangeBankRate(currentUserRole)) {
                setIsRateModalOpen(true);
              } else {
                alert('Changing official bank rate is reserved for Store Owner (Admin).');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Configure Official RBZ Bank Rate"
          >
            <Coins size={14} className="text-amber-600" />
            <span>1 USD = {bankRate.toFixed(2)} ZiG</span>
          </button>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Refresh database catalog"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={() => setIsLabelModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer size={13} className="text-amber-400" />
            <span>Barcode Labels</span>
          </button>

          {/* SCAN BARCODE TO ADD PICTURE */}
          <button
            onClick={() => handleOpenScanPicture()}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Scan product barcode to snap or upload picture"
          >
            <Camera size={14} className="text-amber-200" />
            <span>Scan to Add Photo</span>
          </button>

          {/* DOWNLOAD APKS PORTAL */}
          {onOpenApkModal && (
            <button
              onClick={onOpenApkModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer border border-stone-700"
              title="Download Android APK packages for POS and Mobile"
            >
              <Download size={13} className="text-amber-400" />
              <span className="hidden md:inline">Download APKs</span>
              <span className="md:hidden">APKs</span>
            </button>
          )}

          {/* ADD PRODUCT BUTTON */}
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* KPI Financial & Stock Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total SKUs & Units */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Catalog SKUs</span>
            <Package size={17} className="text-stone-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-stone-900">{stats.totalItems}</span>
            <span className="text-[11px] text-stone-500 font-medium">({stats.totalStockUnits} units)</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">Shared live with Q3 POS</p>
        </div>

        {/* Total Stock Valuation */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Stock Valuation</span>
            <TrendingUp size={17} className="text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 truncate">
            {formatCurrency(stats.totalValuation, currency)}
          </div>
          <p className="text-[10px] text-stone-400 mt-1 font-mono">
            {currency === 'USD'
              ? `≈ ZiG ${stats.totalValuationZig.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
              : `≈ $${stats.totalValuationUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </p>
        </div>

        {/* Potential Gross Profit */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Estimated Profit</span>
            <Sparkles size={17} className="text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 truncate">
            +{formatCurrency(stats.potentialProfit, currency)}
          </div>
          <p className="text-[10px] text-stone-500 mt-1">
            Expected gross margin: <strong className="text-emerald-700">{stats.overallMarginPct}%</strong>
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Low / Out of Stock</span>
            <AlertTriangle size={17} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-amber-700">{stats.lowStock}</span>
            {stats.outOfStock > 0 && (
              <span className="text-xs font-bold text-rose-600">({stats.outOfStock} out)</span>
            )}
          </div>
          <button
            onClick={() => setStockFilter(stats.lowStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK')}
            className="text-[10px] text-amber-700 hover:underline font-bold mt-1 text-left cursor-pointer"
          >
            Review depleted items →
          </button>
        </div>
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

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Stock Filter Pills */}
          <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'ALL', label: `All (${products.length})` },
              { id: 'IN_STOCK', label: `Healthy (${stats.healthyStock})` },
              { id: 'LOW_STOCK', label: `Low (≤${stats.lowStock})` },
              { id: 'OUT_OF_STOCK', label: `Out (${stats.outOfStock})` },
            ].map((sf) => (
              <button
                key={sf.id}
                onClick={() => setStockFilter(sf.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors whitespace-nowrap text-xs ${
                  stockFilter === sf.id
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category selector row */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
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

      {/* 
        PRODUCT LISTING:
        1. Clean Mobile Cards (Visible on phones)
        2. Full Data Table (Visible on Tablets & Desktops)
      */}

      {/* 1. MOBILE CARD VIEW (Phones) */}
      <div className="block md:hidden space-y-2.5">
        {filteredProducts.map((p) => {
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
              className="bg-white rounded-2xl border border-stone-200 p-3.5 shadow-2xs space-y-2.5"
            >
              {/* Product Header with Photo Thumbnail */}
              <div className="flex items-start justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => handleViewProduct(p)}
                  className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 relative group cursor-pointer"
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
                      <Package size={16} />
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

                <div className="min-w-0 flex-1">
                  <h3
                    onClick={() => handleViewProduct(p)}
                    className="font-extrabold text-stone-900 text-sm leading-snug cursor-pointer hover:text-emerald-700 transition-colors"
                  >
                    {p.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                    <span className="font-mono bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded font-semibold border border-stone-200">
                      {p.barcode}
                    </span>
                    <span className="text-stone-400">•</span>
                    <span className="text-stone-500 truncate">{p.category}</span>
                    {p.sizeVariant && (
                      <span className="text-stone-400">({p.sizeVariant})</span>
                    )}
                  </div>
                </div>

                {/* Stock Status Badge */}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${stock.color}`}
                >
                  {p.stockQuantity <= 0 ? 'Out of Stock' : `${p.stockQuantity} in stock`}
                </span>
              </div>

              {/* Price & Margin Block with Quick Edit */}
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100 flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-stone-900">
                      {formatCurrency(activePrice, currency)}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      (${priceUsd.toFixed(2)} • ZiG {priceZig.toFixed(2)})
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-500">
                    Cost: {formatCurrency(activeCost, currency)} • Margin:{' '}
                    <strong className="text-emerald-700">+{formatCurrency(activeMargin, currency)} ({margin.marginPct}%)</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openQuickPriceEdit(p)}
                  className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-amber-300/60"
                  title="Quick Price Adjustment"
                >
                  Edit Price
                </button>
              </div>

              {/* Bottom Actions: Stock +/- Adjuster & View / Photo / Edit / Delete */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100">
                {/* Inline Stock Level Quick +/- */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-stone-500 font-semibold mr-1">Stock:</span>
                  <button
                    onClick={() => onUpdateProductStock(p.id, Math.max(0, p.stockQuantity - 1))}
                    className="w-7 h-7 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer"
                    title="Deduct 1 unit"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-xs font-mono">
                    {p.stockQuantity}
                  </span>
                  <button
                    onClick={() => onUpdateProductStock(p.id, p.stockQuantity + 1)}
                    className="w-7 h-7 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer"
                    title="Add 1 unit"
                  >
                    +
                  </button>
                  <button
                    onClick={() => onUpdateProductStock(p.id, p.stockQuantity + 5)}
                    className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[10px] font-bold cursor-pointer ml-1"
                    title="Quick restock +5"
                  >
                    +5
                  </button>
                </div>

                {/* View, Photo, Edit & Remove Action Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewProduct(p)}
                    className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="View Product Full Specifications"
                  >
                    <Eye size={12} className="text-emerald-700" />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => handleOpenScanPicture(p)}
                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Scan Barcode to Add/Replace Picture"
                  >
                    <Camera size={12} className="text-amber-700" />
                    <span>Photo</span>
                  </button>

                  <button
                    onClick={() => handleEdit(p)}
                    className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 size={11} />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDelete(p)}
                    className="p-1.5 bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                    title="Remove item from inventory"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. DESKTOP / TABLET DATA TABLE */}
      <div className="hidden md:block bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
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
              {filteredProducts.map((p) => {
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
    </div>
  );
};
