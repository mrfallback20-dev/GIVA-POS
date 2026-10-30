import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Tablet,
  Smartphone,
  Layers,
  Eye,
  FileCode,
  Shield,
  Coins,
  RefreshCw,
  CloudOff,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
  Printer,
  Barcode,
  Sparkles,
  Info,
  SlidersHorizontal,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Product, INITIAL_PRODUCTS } from './data/inventorySeed';
import { CurrencyType, DEFAULT_ZIG_BANK_RATE, SaleTransaction } from './utils/pos-logic';
import { UserRole } from './utils/role-access';
import { Q3SmartApp } from './components/Q3SmartApp';
import { MobileManagementApp } from './components/MobileManagementApp';
import { BankRateModal } from './components/BankRateModal';
import { InstallApkModal } from './components/InstallApkModal';
import { ShowcaseView } from './components/ShowcaseView';
import { DeviceFrame } from './components/DeviceFrame';
import { ToastItem, showToast } from './utils/toast';
import { ensureAuth } from './firebase';
import {
  seedInitialFirestoreData,
  subscribeToProducts,
  subscribeToBankRate,
  subscribeToRecentSales,
  updateBankRateInFirestore,
  adjustProductStock,
  createProduct,
  updateProduct,
  deleteProductFromFirestore,
  forceReconnect,
  WRITE_ERROR_EVENT,
} from './services/firebase-service';

export type AppPreviewMode = 'Q3_POS' | 'MOBILE_MANAGER' | 'DUAL_VIEW' | 'SHOWCASE';

const CACHE_KEY = 'giva_cached_products';
const RATE_KEY = 'giva_cached_rate';

export default function App() {
  // Navigation & preview mode
  const [previewMode, setPreviewMode] = useState<AppPreviewMode>(() => {
    if (typeof window !== 'undefined') {
      const declared = document.documentElement.dataset.app;
      if (declared === 'pos') return 'Q3_POS';
      if (declared === 'manager') return 'MOBILE_MANAGER';
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mode') || params.get('app');
      if (m === 'pos' || m === 'q3') return 'Q3_POS';
      if (m === 'manager' || m === 'stock') return 'MOBILE_MANAGER';
      if (m === 'dual') return 'DUAL_VIEW';
      if (m === 'showcase' || m === 'gallery') return 'SHOWCASE';
    }
    return 'Q3_POS';
  });

  const isStandalone = typeof window !== 'undefined' && (
    document.documentElement.dataset.app === 'pos' ||
    document.documentElement.dataset.app === 'manager' ||
    window.location.pathname.includes('pos.html') ||
    window.location.pathname.includes('manager.html') ||
    new URLSearchParams(window.location.search).get('standalone') === 'true'
  );

  const [deviceFrameEnabled, setDeviceFrameEnabled] = useState(true);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [laserCounter, setLaserCounter] = useState(0);

  // Currency & Rate
  const [currency, setCurrency] = useState<CurrencyType>('USD');
  const [bankRate, setBankRate] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(RATE_KEY));
      return saved > 0 ? saved : DEFAULT_ZIG_BANK_RATE;
    } catch {
      return DEFAULT_ZIG_BANK_RATE;
    }
  });

  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Authentication & Roles
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    try {
      const session = sessionStorage.getItem('giva_mobile_auth');
      if (session === 'ADMIN' || session === 'MANAGER') return session;
    } catch {}
    return 'ADMIN';
  });

  // Inventory & Sales State
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {}
    return INITIAL_PRODUCTS;
  });
  const [recentSales, setRecentSales] = useState<SaleTransaction[]>([]);

  // Connectivity
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [serverConfirmed, setServerConfirmed] = useState(false);
  const [pendingWrites, setPendingWrites] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Ready');
  const [writeError, setWriteError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Toast notifications list
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const productsRef = useRef(products);
  productsRef.current = products;
  const rateRef = useRef(bankRate);
  rateRef.current = bankRate;

  // Sync title
  useEffect(() => {
    if (previewMode === 'Q3_POS') {
      document.title = 'GIVA Q3 SMART POS Terminal';
    } else if (previewMode === 'MOBILE_MANAGER') {
      document.title = 'GIVA Mobile Store Manager & P&L';
    } else if (previewMode === 'DUAL_VIEW') {
      document.title = 'GIVA Live Dual App Preview';
    } else {
      document.title = 'GIVA Living & Baby - App Preview & Suite';
    }
  }, [previewMode]);

  // Online / Offline listeners
  useEffect(() => {
    const on = () => setBrowserOnline(true);
    const off = () => setBrowserOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Listen to write error events
  useEffect(() => {
    const h = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail || 'A change could not be saved.';
      setWriteError(detail);
      showToast(detail, 'error');
    };
    window.addEventListener(WRITE_ERROR_EVENT, h);
    return () => window.removeEventListener(WRITE_ERROR_EVENT, h);
  }, []);

  // Toast listener
  useEffect(() => {
    const onToast = (e: Event) => {
      const item = (e as CustomEvent<ToastItem>).detail;
      if (!item) return;
      setToasts((prev) => [...prev.slice(-3), item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 4000);
    };
    window.addEventListener('giva:toast', onToast);
    return () => window.removeEventListener('giva:toast', onToast);
  }, []);

  // Firestore live subscriptions
  useEffect(() => {
    let unsubProducts: (() => void) | undefined;
    let unsubRate: (() => void) | undefined;
    let unsubSales: (() => void) | undefined;
    let cancelled = false;

    ensureAuth()
      .then(() => {
        if (cancelled) return;
        seedInitialFirestoreData().catch(() => {});

        unsubProducts = subscribeToProducts((items, meta) => {
          if (items.length > 0) {
            setProducts(items);
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(items));
            } catch {}
          }
          setServerConfirmed(!meta.fromCache);
          setPendingWrites(meta.hasPendingWrites);
          if (!meta.fromCache && !meta.hasPendingWrites) {
            setLastSyncTime(new Date().toLocaleTimeString());
          }
        });

        unsubRate = subscribeToBankRate((rate) => {
          setBankRate(rate);
          try {
            localStorage.setItem(RATE_KEY, String(rate));
          } catch {}
        });

        unsubSales = subscribeToRecentSales(20, (sales, meta) => {
          setRecentSales(sales);
          if (meta.hasPendingWrites) setPendingWrites(true);
        });
      })
      .catch((err) => {
        console.warn('[Firebase] Initial auth/sync:', err);
      });

    return () => {
      cancelled = true;
      unsubProducts?.();
      unsubRate?.();
      unsubSales?.();
    };
  }, []);

  const isOnline = !simulatedOffline && browserOnline && serverConfirmed;

  const handleRefresh = useCallback(async () => {
    setIsReconnecting(true);
    await forceReconnect();
    showToast('Reconnected to Firestore cloud database', 'success');
    setTimeout(() => setIsReconnecting(false), 800);
  }, []);

  // Data update handlers
  const handleUpdateBankRate = async (newRate: number) => {
    await updateBankRateInFirestore(newRate);
    setBankRate(newRate);
    try {
      localStorage.setItem(RATE_KEY, String(newRate));
    } catch {}
    showToast(`Official RBZ Bank Rate updated: 1 USD = ${newRate.toFixed(2)} ZiG`, 'success');
  };

  const handleUpdateProductStock = async (id: number, newStock: number) => {
    const current = productsRef.current.find((p) => p.id === id);
    if (!current) return;
    const diff = Math.max(0, Math.round(newStock)) - current.stockQuantity;
    await adjustProductStock(id, diff);
    // Instant local state update for responsiveness
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stockQuantity: Math.max(0, Math.round(newStock)) } : p))
    );
    showToast(`Stock updated for ${current.name} (${newStock} units)`, 'success');
  };

  const handleCreateProduct = async (data: Partial<Product>) => {
    await createProduct(data, productsRef.current, rateRef.current);
    showToast(`Product "${data.name}" added to catalog`, 'success');
  };

  const handleUpdateProduct = async (id: number, data: Partial<Product>) => {
    const current = productsRef.current.find((p) => p.id === id);
    await updateProduct(id, data, productsRef.current, rateRef.current);
    if (current && data.stockQuantity !== undefined && Number(data.stockQuantity) !== current.stockQuantity) {
      await adjustProductStock(id, Math.max(0, Number(data.stockQuantity)) - current.stockQuantity);
    }
    showToast(`Product updated successfully`, 'success');
  };

  const handleDeleteProduct = async (id: number) => {
    await deleteProductFromFirestore(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast(`Product removed from catalog`, 'info');
  };

  const handleSelectRole = (newRole: UserRole) => {
    setCurrentUserRole(newRole);
    try {
      localStorage.setItem('giva_active_role', newRole);
    } catch {}
    showToast(`Switched active role to ${newRole}`, 'info');
  };

  // Quick 1-click test login helpers
  const handleQuickLoginCashier = () => {
    try {
      sessionStorage.setItem('giva_q3_cashier_active', 'true');
      sessionStorage.setItem('giva_q3_cashier_name', 'Cathy');
    } catch {}
    setPreviewMode('Q3_POS');
    showToast('Started Cashier Cathy shift on Q3 POS', 'success');
  };

  const handleQuickLoginManager = (role: 'ADMIN' | 'MANAGER') => {
    try {
      sessionStorage.setItem('giva_mobile_auth', role);
    } catch {}
    setCurrentUserRole(role);
    setPreviewMode('MOBILE_MANAGER');
    showToast(
      `Signed in as ${role === 'ADMIN' ? 'Store Owner / Admin' : 'Store Manager'}`,
      'success'
    );
  };

  // Laser scanner trigger simulation for Q3 terminal
  const handleTriggerQ3Laser = () => {
    setLaserCounter((c) => c + 1);
    showToast('Hardware red-laser barcode scanner triggered!', 'info');
  };

  // Standalone split mode: Dedicated app without preview header
  if (isStandalone) {
    return (
      <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-stone-900 text-stone-100 font-sans relative">
        {/* Toast Notification Container */}
        <div className="fixed top-3 right-3 z-[999999] flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center justify-between gap-3 border backdrop-blur-md animate-fade-in ${
                t.type === 'success'
                  ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
                  : t.type === 'error'
                  ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
                  : t.type === 'warning'
                  ? 'bg-amber-950/90 text-amber-200 border-amber-500/40'
                  : 'bg-stone-900/90 text-stone-200 border-stone-700'
              }`}
            >
              <span>{t.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-stone-400 hover:text-white cursor-pointer ml-1"
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        <div className="flex-1 w-full h-full overflow-hidden">
          {previewMode === 'Q3_POS' ? (
            <Q3SmartApp
              products={products}
              currency={currency}
              setCurrency={setCurrency}
              bankRate={bankRate}
              onRefreshProducts={handleRefresh}
              isOnline={isOnline}
              isFirebaseConnected={serverConfirmed}
              lastSyncTime={lastSyncTime}
            />
          ) : (
            <MobileManagementApp
              products={products}
              currency={currency}
              bankRate={bankRate}
              onUpdateBankRate={handleUpdateBankRate}
              onUpdateProductStock={handleUpdateProductStock}
              onCreateProduct={handleCreateProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onRefresh={handleRefresh}
              isOnline={isOnline}
              isFirebaseConnected={serverConfirmed}
              lastSyncTime={lastSyncTime}
              currentUserRole={currentUserRole}
              onSelectRole={handleSelectRole}
              onOpenRateModal={() => setIsRateModalOpen(true)}
              onOpenApkModal={() => setIsInstallModalOpen(true)}
              recentSales={recentSales}
            />
          )}
        </div>

        <BankRateModal
          isOpen={isRateModalOpen}
          onClose={() => setIsRateModalOpen(false)}
          currentRate={bankRate}
          onUpdateRate={handleUpdateBankRate}
        />
        <InstallApkModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          deviceMode={previewMode === 'Q3_POS' ? 'POS' : 'MOBILE'}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-stone-950 text-stone-100 font-sans relative">
      {/* Toast Notification Container */}
      <div className="fixed top-14 right-4 z-[999999] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center justify-between gap-3 border backdrop-blur-md animate-fade-in ${
              t.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
                : t.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
                : t.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/40'
                : 'bg-stone-900/90 text-stone-200 border-stone-700'
            }`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-stone-400 hover:text-white cursor-pointer ml-1"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Main Top Control & Preview Navigation Bar */}
      <header className="shrink-0 bg-stone-900/95 border-b border-stone-800 px-3 py-2 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
          {/* Logo & Brand title */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setPreviewMode('SHOWCASE')}>
              <img
                src="/assets-pack/giva-brand-circle.jpg"
                alt="GIVA"
                className="w-8 h-8 rounded-full border border-amber-500/40 object-cover shadow-sm"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-sm tracking-wide text-white">GIVA</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    Living &amp; Baby
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 block -mt-0.5 font-medium">Dual Retail Suite</span>
              </div>
            </div>

            {/* Live Exchange Rate Pill */}
            <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800 text-[11px]">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono font-bold text-amber-300">1 USD = {bankRate.toFixed(2)} ZiG</span>
              <button
                type="button"
                onClick={() => setIsRateModalOpen(true)}
                className="text-[10px] text-stone-400 hover:text-white underline ml-1 cursor-pointer"
                title="Edit RBZ Exchange Rate"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Center: App Switcher Tabs & Standalone Split Launchers */}
          <div className="flex items-center gap-1.5 bg-stone-950/80 p-1 rounded-xl border border-stone-800 text-xs w-full md:w-auto overflow-x-auto justify-center">
            <button
              onClick={() => setPreviewMode('SHOWCASE')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                previewMode === 'SHOWCASE'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Showcase</span>
            </button>

            <button
              onClick={() => setPreviewMode('Q3_POS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                previewMode === 'Q3_POS'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
              title="App 1: Q3 Smart POS for Cashiers Only"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>App 1: Q3 POS (Cashiers)</span>
            </button>

            <button
              onClick={() => setPreviewMode('MOBILE_MANAGER')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                previewMode === 'MOBILE_MANAGER'
                  ? 'bg-emerald-600 text-white font-bold shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
              title="App 2: Store Manager & Admin Only"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>App 2: Store Manager (Admin/Manager)</span>
            </button>

            <button
              onClick={() => setPreviewMode('DUAL_VIEW')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                previewMode === 'DUAL_VIEW'
                  ? 'bg-indigo-600 text-white font-bold shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dual Live View</span>
            </button>

            {/* Standalone Separate App Launchers */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-stone-800 shrink-0">
              <a
                href="/pos.html"
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 rounded bg-stone-900 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-stone-700 text-[10px] font-bold flex items-center gap-1 transition-colors"
                title="Launch App 1 (Q3 POS) in dedicated window"
              >
                <span>POS ↗</span>
              </a>
              <a
                href="/manager.html"
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 rounded bg-stone-900 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 border border-stone-700 text-[10px] font-bold flex items-center gap-1 transition-colors"
                title="Launch App 2 (Store Manager) in dedicated window"
              >
                <span>Manager ↗</span>
              </a>
            </div>
          </div>

          {/* Right Controls: Device Frame, Simulation & Credentials */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end text-xs">
            {/* Offline simulation toggle */}
            <button
              type="button"
              onClick={() => {
                setSimulatedOffline((v) => {
                  const next = !v;
                  showToast(
                    next
                      ? 'Simulated Offline Mode enabled (sales & changes queue locally in Firestore)'
                      : 'Simulated Online Mode restored',
                    next ? 'warning' : 'success'
                  );
                  return next;
                });
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                simulatedOffline
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                  : 'bg-stone-950 text-emerald-400 border-stone-800 hover:text-emerald-300'
              }`}
              title="Toggle simulated network connectivity"
            >
              {simulatedOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              <span>{simulatedOffline ? 'Offline' : 'Online'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Preview Area */}
      <main className="flex-1 min-h-0 overflow-auto relative">
        {/* MODE 1: SHOWCASE & SCREENSHOT GALLERY */}
        {previewMode === 'SHOWCASE' && (
          <ShowcaseView
            onLaunchPos={() => setPreviewMode('Q3_POS')}
            onLaunchManager={(role) => handleQuickLoginManager(role || 'ADMIN')}
            onLaunchDual={() => setPreviewMode('DUAL_VIEW')}
            bankRate={bankRate}
          />
        )}

        {/* MODE 2: Q3 SMART POS TERMINAL - Strictly for Cashiers Only */}
        {previewMode === 'Q3_POS' && (
          <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto overflow-x-auto scroll-both bg-stone-950 p-0 sm:p-3">
            <div className="w-full max-w-3xl min-h-full bg-stone-100 flex flex-col relative shadow-2xl sm:rounded-3xl border-0 sm:border border-stone-800 overflow-visible">
              <Q3SmartApp
                products={products}
                currency={currency}
                setCurrency={setCurrency}
                bankRate={bankRate}
                onRefreshProducts={handleRefresh}
                isOnline={isOnline}
                isFirebaseConnected={serverConfirmed}
                lastSyncTime={lastSyncTime}
              />
            </div>
          </div>
        )}

        {/* MODE 3: STORE MANAGER & P&L - Strictly for Store Manager & Admin Only */}
        {previewMode === 'MOBILE_MANAGER' && (
          <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto overflow-x-auto scroll-both bg-stone-950 p-0 sm:p-3">
            <div className="w-full max-w-5xl min-h-full bg-stone-100 flex flex-col relative shadow-2xl sm:rounded-3xl border-0 sm:border border-stone-800 overflow-visible">
              <MobileManagementApp
                products={products}
                currency={currency}
                bankRate={bankRate}
                onUpdateBankRate={handleUpdateBankRate}
                onUpdateProductStock={handleUpdateProductStock}
                onCreateProduct={handleCreateProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onRefresh={handleRefresh}
                isOnline={isOnline}
                isFirebaseConnected={serverConfirmed}
                lastSyncTime={lastSyncTime}
                currentUserRole={currentUserRole}
                onSelectRole={handleSelectRole}
                onOpenRateModal={() => setIsRateModalOpen(true)}
                onOpenApkModal={() => setIsInstallModalOpen(true)}
                recentSales={recentSales}
              />
            </div>
          </div>
        )}

        {/* MODE 4: DUAL LIVE SPLIT VIEW (Q3 POS + STORE MANAGER INTERACTING LIVE) */}
        {previewMode === 'DUAL_VIEW' && (
          <div className="w-full h-full flex flex-col bg-stone-950 overflow-auto p-2 sm:p-4">
            <div className="max-w-7xl mx-auto w-full mb-3 flex items-center justify-between bg-stone-900/80 px-4 py-2.5 rounded-xl border border-stone-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-sm text-white">Live Synchronized Dual View</span>
                <span className="text-xs text-stone-400 hidden sm:inline">
                  &bull; Ring up a sale on the Q3 POS on the left &rarr; stock decrements live in Store Manager on the right!
                </span>
              </div>
              <div className="text-xs text-amber-400 font-mono font-semibold">
                Both apps share the same live inventory state
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-7xl mx-auto w-full items-start">
              {/* Left Column: Q3 Smart POS in Hardware Frame */}
              <div className="w-full flex flex-col items-center">
                <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5 mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Tablet className="w-3.5 h-3.5" /> App 1: Q3 POS Handheld Terminal
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">Cashier: Cathy (1234)</span>
                </div>

                <DeviceFrame
                  type="Q3_POS"
                  title="Q3 Terminal"
                  onFireLaser={handleTriggerQ3Laser}
                >
                  <Q3SmartApp
                    products={products}
                    currency={currency}
                    setCurrency={setCurrency}
                    bankRate={bankRate}
                    onRefreshProducts={handleRefresh}
                    isOnline={isOnline}
                    isFirebaseConnected={serverConfirmed}
                    lastSyncTime={lastSyncTime}
                  />
                </DeviceFrame>
              </div>

              {/* Right Column: Mobile Store Manager in Smartphone Frame */}
              <div className="w-full flex flex-col items-center">
                <div className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-3 py-1.5 mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" /> App 2: Store Manager &amp; P&amp;L
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">Role: {currentUserRole}</span>
                </div>

                <DeviceFrame
                  type="SMARTPHONE"
                  title="Store Manager"
                >
                  <MobileManagementApp
                    products={products}
                    currency={currency}
                    bankRate={bankRate}
                    onUpdateBankRate={handleUpdateBankRate}
                    onUpdateProductStock={handleUpdateProductStock}
                    onCreateProduct={handleCreateProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onRefresh={handleRefresh}
                    isOnline={isOnline}
                    isFirebaseConnected={serverConfirmed}
                    lastSyncTime={lastSyncTime}
                    currentUserRole={currentUserRole}
                    onSelectRole={handleSelectRole}
                    onOpenRateModal={() => setIsRateModalOpen(true)}
                    onOpenApkModal={() => setIsInstallModalOpen(true)}
                    recentSales={recentSales}
                  />
                </DeviceFrame>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Modals for Rate and APK */}
      <BankRateModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        currentRate={bankRate}
        onUpdateRate={handleUpdateBankRate}
      />
      <InstallApkModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deviceMode={previewMode === 'Q3_POS' ? 'POS' : 'MOBILE'}
      />
    </div>
  );
}
