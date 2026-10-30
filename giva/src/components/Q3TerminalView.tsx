import React, { useState, useMemo } from 'react';
import {
  Search,
  Barcode,
  Camera,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  RotateCcw,
  Wifi,
  BatteryCharging,
  Maximize2,
  Minimize2,
  AlertCircle,
  CheckCircle2,
  Tag,
  ArrowRight,
  Printer,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import {
  CartItem,
  calculateCartTotals,
  formatCurrency,
  getStockStatus,
  CurrencyType,
  convertCurrency,
} from '../utils/pos-logic';
import { BrandLogo } from './BrandLogo';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { CheckoutModal } from './CheckoutModal';
import { ThermalReceiptModal, ReceiptData } from './ThermalReceiptModal';
import { playScanBeep, playCheckoutSuccessSound, playErrorBuzzer } from '../utils/audio';
import { Coins, Shield, User, UserCheck } from 'lucide-react';
import { UserRole, USER_ROLES } from '../utils/role-access';
import { checkoutSale } from '../services/firebase-service';

interface Q3TerminalViewProps {
  products: Product[];
  currency: CurrencyType;
  setCurrency: (c: CurrencyType) => void;
  bankRate: number;
  onRefreshProducts: () => void;
  isOnline: boolean;
  cashierName?: string;
  deviceMode?: 'POS' | 'MOBILE';
  isScannerOpenProp?: boolean;
  onCloseScannerProp?: () => void;
  isLaserFiringProp?: boolean;
  onTriggerLaserProp?: () => void;
}

export const Q3TerminalView: React.FC<Q3TerminalViewProps> = ({
  products,
  currency,
  setCurrency,
  bankRate,
  onRefreshProducts,
  isOnline,
  cashierName = 'Cathy',
  deviceMode = 'POS',
  isScannerOpenProp,
  onCloseScannerProp,
  isLaserFiringProp,
  onTriggerLaserProp,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [internalScannerOpen, setInternalScannerOpen] = useState(false);
  const [internalLaserFiring, setInternalLaserFiring] = useState(false);

  const isScannerOpen = isScannerOpenProp !== undefined ? isScannerOpenProp : internalScannerOpen;
  const setIsScannerOpen = (open: boolean) => {
    if (!open && onCloseScannerProp) onCloseScannerProp();
    setInternalScannerOpen(open);
  };
  const isLaserFiring = isLaserFiringProp !== undefined ? isLaserFiringProp : internalLaserFiring;

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('giva_last_receipt');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return null;
  });
  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('giva_auto_print') !== 'false';
    }
    return true;
  });
  const [isFramedView, setIsFramedView] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Extract categories and counts
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  }, [products]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: products.length };
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtered catalog
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sizeVariant && p.sizeVariant.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Cart calculation
  const cartTotals = useMemo(() => calculateCartTotals(cart), [cart]);

  // Add item to cart
  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      playErrorBuzzer();
      alert(`"${product.name}" is out of stock!`);
      return;
    }

    const existingCartItem = cart.find((item) => item.id === product.id);
    const currentQtyInCart = existingCartItem ? existingCartItem.quantity : 0;

    if (currentQtyInCart + 1 > product.stockQuantity) {
      playErrorBuzzer();
      alert(`Cannot add more than available stock (${product.stockQuantity}).`);
      return;
    }

    playScanBeep();

    const price =
      currency === 'ZiG'
        ? Number((product.sellingPriceUsd * bankRate).toFixed(2))
        : product.sellingPriceUsd;
    const baseCostUsd =
      product.costPriceUsd || Number((product.sellingPriceUsd * 0.58).toFixed(2));
    const cost =
      currency === 'ZiG'
        ? Number((baseCostUsd * bankRate).toFixed(2))
        : baseCostUsd;

    if (existingCartItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          barcode: product.barcode,
          name: product.name,
          category: product.category,
          sizeVariant: product.sizeVariant,
          sellingPrice: price,
          costPrice: cost,
          quantity: 1,
          imageUrl: product.imageUrl,
        },
      ]);
    }
  };

  // Change cart quantity
  const updateQuantity = (productId: number, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart(
      cart
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > product.stockQuantity) {
              alert(`Cannot exceed available stock (${product.stockQuantity}).`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove item
  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  // Barcode scanned
  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      addToCart(product);
    } else {
      playErrorBuzzer();
      alert(`Barcode "${barcode}" not found in inventory.`);
    }
  };

  // Simulate hardware laser scan trigger on device
  const triggerLaserScanner = () => {
    if (onTriggerLaserProp) {
      onTriggerLaserProp();
      return;
    }
    setInternalLaserFiring(true);
    playScanBeep();
    setTimeout(() => {
      setInternalLaserFiring(false);
      setIsScannerOpen(true);
    }, 250);
  };

  // Execute checkout & auto-deduct stock
  const handleConfirmCheckout = async (
    paymentMethod: 'CASH' | 'CARD' | 'SPLIT' | 'MOBILE_MONEY',
    amountTendered: number
  ) => {
    setIsProcessing(true);
    try {
      // Atomic sale + stock deduction. Works offline: it is saved on this terminal
      // and uploaded automatically as soon as Wi-Fi or mobile data returns.
      const { receipt } = checkoutSale({
        cart,
        products,
        paymentMethod,
        amountTendered,
        currency,
        bankRate,
        cashierName: cashierName || 'Cathy',
      });

      playCheckoutSuccessSound();
      setLastReceipt(receipt);
      try {
        localStorage.setItem('giva_last_receipt', JSON.stringify(receipt));
      } catch (e) {}
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (err: any) {
      playErrorBuzzer();
      alert(err.message || 'Checkout failed. Please check stock levels.');
    } finally {
      setIsProcessing(false);
    }
  };

  const terminalContent = (
    <div className="flex flex-col h-full w-full bg-stone-100 text-stone-900 select-none overflow-hidden">
      {/* Sleek, Compact POS Search Bar */}
      <div className="bg-white border-b border-stone-200 px-3 py-2 shrink-0 shadow-2xs">
        <div className="relative flex items-center w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-600">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search product, size, or scan barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-24 py-2 bg-stone-50 hover:bg-stone-100/80 focus:bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs sm:text-sm text-stone-900 font-medium placeholder-stone-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-1">
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="w-5 h-5 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer mr-0.5"
                title="Clear search"
              >
                ✕
              </button>
            ) : null}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer border border-amber-200 flex items-center gap-1 text-[11px] font-bold"
              title="Camera Scan Barcode"
            >
              <Camera size={13} className="text-amber-700" />
              <span className="hidden xs:inline text-[10px]">Scan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Category Filters (Swipe Left/Right on Mobile) */}
      <div className="bg-stone-50 border-b border-stone-200 px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto scroll-smooth snap-x touch-pan-x scrollbar-none overscroll-x-contain shrink-0">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count = categoryCounts[cat] || 0;

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-amber-400 font-bold shadow-xs ring-1 ring-stone-900'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Terminal Body: Catalog Grid (Left/Center) + Active Cart Panel (Right) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Product Catalog Grid (Scrollable Up/Down) */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-2.5 sm:p-3.5 pb-28 lg:pb-6">
          <div className="flex justify-between items-center mb-2 px-0.5">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              {selectedCategory} ({filteredProducts.length} items)
            </span>
            <span className="text-[11px] text-stone-400">
              Tap item to add to sale
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {filteredProducts.map((p) => {
              const threshold = p.lowStockThreshold || 5;
              const stockInfo = getStockStatus(p.stockQuantity, threshold);
              const isLow = p.stockQuantity > 0 && p.stockQuantity <= threshold;
              const price =
                currency === 'ZiG'
                  ? Number((p.sellingPriceUsd * bankRate).toFixed(2))
                  : p.sellingPriceUsd;
              const altPrice =
                currency === 'ZiG'
                  ? p.sellingPriceUsd
                  : Number((p.sellingPriceUsd * bankRate).toFixed(2));
              const altCurrency: CurrencyType = currency === 'ZiG' ? 'USD' : 'ZiG';
              const inCart = cart.find((c) => c.id === p.id);

              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stockQuantity <= 0}
                  className={`flex flex-col text-left bg-white rounded-xl border p-2.5 shadow-2xs hover:shadow-md transition-all relative group cursor-pointer ${
                    p.stockQuantity <= 0
                      ? 'opacity-60 border-stone-200 cursor-not-allowed bg-stone-50'
                      : inCart
                      ? 'border-amber-500 ring-2 ring-amber-400/20'
                      : isLow
                      ? 'border-amber-300 hover:border-amber-500 bg-amber-50/20'
                      : 'border-stone-200 hover:border-amber-400'
                  }`}
                >
                  {/* Product Image / Icon */}
                  <div className="w-full h-24 rounded-lg overflow-hidden bg-stone-100 mb-2 relative flex items-center justify-center">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          // Replace broken image with clean fallback
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 bg-linear-to-br from-amber-50 to-stone-100 -z-0">
                      <Tag size={22} className="text-stone-300" />
                      <span className="text-[9px] font-bold text-stone-400 mt-1 uppercase tracking-tight px-1 text-center truncate max-w-[90%]">
                        {p.category.split(' ')[0]}
                      </span>
                    </div>

                    {/* In-Cart Badge */}
                    {inCart && (
                      <div className="absolute top-1.5 left-1.5 bg-amber-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5 z-10">
                        <ShoppingCart size={10} />
                        <span>{inCart.quantity}</span>
                      </div>
                    )}

                    {/* Stock Status Badge */}
                    <div
                      className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${stockInfo.color}`}
                    >
                      {p.stockQuantity <= 0 ? 'Out' : isLow ? `⚠️ Low: ${p.stockQuantity}` : `${p.stockQuantity} Left`}
                    </div>
                  </div>

                  {/* Product Details */}
                  <h3 className="font-semibold text-xs text-stone-900 line-clamp-2 leading-tight group-hover:text-amber-900">
                    {p.name}
                  </h3>
                  {p.sizeVariant && (
                    <span className="text-[10px] text-stone-500 mt-0.5 truncate">
                      {p.sizeVariant}
                    </span>
                  )}

                  <div className="mt-auto pt-2 flex items-baseline justify-between">
                    <div>
                      <span className="font-extrabold text-sm text-stone-900 block leading-none">
                        {formatCurrency(price, currency)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-semibold mt-0.5 block">
                        ≈ {formatCurrency(altPrice, altCurrency)}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-stone-400">
                      {p.barcode.slice(-4)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-stone-400">
              <Search size={32} className="mb-2 text-stone-300" />
              <p className="text-sm font-medium">No products match your search.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
                className="mt-2 text-xs text-amber-600 font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Right POS Cart & Checkout Terminal Drawer (Responsive Drawer on Mobile, Fixed Sidebar on Desktop) */}
        <div
          className={`${
            isMobileCartOpen
              ? 'fixed inset-x-0 bottom-0 top-16 z-40 bg-white'
              : 'hidden lg:flex'
          } lg:relative lg:top-0 lg:w-88 xl:w-96 bg-white border-t lg:border-t-0 lg:border-l border-stone-200 flex flex-col shadow-lg shrink-0`}
        >
          {/* Cart Header */}
          <div className="px-4 py-3 bg-stone-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-amber-400" />
              <span className="font-bold text-sm tracking-wide">
                Current Sale ({cartTotals.totalItems})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-stone-400 hover:text-rose-400 text-xs flex items-center gap-1 transition-colors cursor-pointer mr-2"
                >
                  <RotateCcw size={13} />
                  <span>Clear</span>
                </button>
              )}
              {/* Close Mobile Drawer Button */}
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="lg:hidden text-stone-400 hover:text-white p-1 rounded cursor-pointer"
                aria-label="Close cart drawer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 divide-y divide-stone-100">
            {cart.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="font-semibold text-xs text-stone-900 truncate">
                      {item.name}
                    </h4>
                  </div>
                  <div className="text-[11px] text-stone-500 flex items-center gap-2">
                    <span>{formatCurrency(item.sellingPrice, currency)} each</span>
                    {item.sizeVariant && (
                      <span className="text-[10px] text-stone-400">({item.sizeVariant})</span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center font-extrabold text-xs text-stone-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                  </button>
                  <span className="w-16 text-right font-bold text-xs text-stone-900">
                    {formatCurrency(item.sellingPrice * item.quantity, currency)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-stone-300 hover:text-rose-500 p-1 transition-colors ml-0.5 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="h-44 flex flex-col items-center justify-center text-stone-400 text-center p-4">
                <ShoppingCart size={28} className="text-stone-300 mb-1.5 stroke-1" />
                <p className="text-xs font-medium text-stone-600">Cart is currently empty</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Scan barcodes with the laser or tap items to begin checkout
                </p>
              </div>
            )}
          </div>

          {/* Cart Summary & Atomic Checkout Button */}
          <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3 shrink-0">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Items Subtotal:</span>
                <span>{formatCurrency(cartTotals.totalAmount, currency)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Estimated Unit Margin:</span>
                <span className="font-semibold text-emerald-700">
                  +{formatCurrency(cartTotals.estimatedMargin, currency)}
                </span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-stone-900 pt-1.5 border-t border-stone-200">
                <span>Total Amount:</span>
                <span className="text-lg text-emerald-800">
                  {formatCurrency(cartTotals.totalAmount, currency)}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsMobileCartOpen(false);
                setIsCheckoutOpen(true);
              }}
              disabled={cart.length === 0}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                cart.length === 0
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-[0.99] shadow-emerald-900/10'
              }`}
            >
              <span>Proceed to Checkout & Print</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Sticky Bottom Cart Bar on Mobile when drawer closed and items exist */}
      {cart.length > 0 && (
        <div className="lg:hidden bg-stone-900 text-white px-4 py-2 flex items-center justify-between border-t border-stone-800 shadow-xl shrink-0 z-30">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="flex items-center gap-2 text-left cursor-pointer"
          >
            <div className="relative">
              <ShoppingCart size={18} className="text-amber-400" />
              <span className="absolute -top-1.5 -right-2 bg-amber-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cartTotals.totalItems}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-stone-200">
                {cartTotals.totalItems} items • {formatCurrency(cartTotals.totalAmount, currency)}
              </div>
              <div className="text-[10px] text-stone-400">Tap to edit cart</div>
            </div>
          </button>

          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-all"
          >
            Checkout
          </button>
        </div>
      )}

      {/* Modals */}
      <BarcodeScannerModal
        products={products}
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      <CheckoutModal
        cart={cart}
        currency={currency}
        bankRate={bankRate}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirmCheckout={handleConfirmCheckout}
        isProcessing={isProcessing}
      />

      <ThermalReceiptModal
        receipt={lastReceipt}
        onClose={() => setLastReceipt(null)}
        autoPrint={autoPrintReceipt}
      />
    </div>
  );

  // If user selected Framed Handheld Q3 Terminal mode
  if (isFramedView) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[calc(100vh-4rem)] bg-stone-900/90">
        <div className="w-full max-w-sm rounded-[36px] bg-stone-950 p-3 shadow-2xl border-4 border-stone-800 relative flex flex-col">
          {/* Q3 Hardware Top: Thermal Printer Head & Paper Feed Teeth */}
          <div className="w-full bg-stone-900 rounded-2xl p-2.5 mb-2 border border-stone-800 flex flex-col items-center">
            <div className="w-40 h-2 bg-stone-950 rounded-full border border-stone-700 shadow-inner mb-1" />
            <div className="flex items-center justify-between w-full px-2 text-[10px] text-stone-400 font-mono">
              <span>58mm ESC/POS THERMAL</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> READY
              </span>
            </div>
          </div>

          {/* Android Screen Frame */}
          <div className="rounded-2xl overflow-hidden bg-white h-[680px] flex flex-col border border-stone-800">
            {terminalContent}
          </div>

          {/* Q3 Bottom Speaker & Android Touch Bar */}
          <div className="mt-3 flex items-center justify-center gap-4 py-1">
            <div className="w-8 h-1 bg-stone-700 rounded-full" />
            <div className="w-3 h-3 rounded-full border-2 border-stone-700" />
            <div className="w-3 h-3 border-2 border-stone-700 rotate-45" />
          </div>
        </div>
      </div>
    );
  }

  // Full Screen Responsive View
  return <div className="h-full w-full flex flex-col overflow-hidden">{terminalContent}</div>;
};
