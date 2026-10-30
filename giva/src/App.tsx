import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CloudOff, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { Product, INITIAL_PRODUCTS } from './data/inventorySeed';
import { CurrencyType, DEFAULT_ZIG_BANK_RATE, SaleTransaction } from './utils/pos-logic';
import { UserRole } from './utils/role-access';
import { Q3SmartApp } from './components/Q3SmartApp';
import { MobileManagementApp } from './components/MobileManagementApp';
import { BankRateModal } from './components/BankRateModal';
import { InstallApkModal } from './components/InstallApkModal';
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

export type AppSelection = 'Q3_POS' | 'MOBILE_MANAGER';

/**
 * Two separately installable apps share this code:
 *   /pos      -> App 1: Q3 SMART POS (cashier)
 *   /manager  -> App 2: Mobile Store Manager (owner / manager)
 * The HTML entry file declares which one it is via <html data-app="...">.
 */
function detectApp(): AppSelection {
  if (typeof document !== 'undefined') {
    const declared = document.documentElement.dataset.app;
    if (declared === 'pos') return 'Q3_POS';
    if (declared === 'manager') return 'MOBILE_MANAGER';
  }
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const p = params.get('app') || params.get('mode');
  if (p === 'q3' || p === 'pos') return 'Q3_POS';
  return 'MOBILE_MANAGER';
}

const CACHE_KEY = 'giva_cached_products';
const RATE_KEY = 'giva_cached_rate';

export default function App() {
  const currentApp = useRef<AppSelection>(detectApp()).current;

  const [currency, setCurrency] = useState<CurrencyType>('USD');
  const [bankRate, setBankRate] = useState<number>(() => {
    const saved = Number(localStorage.getItem(RATE_KEY));
    return saved > 0 ? saved : DEFAULT_ZIG_BANK_RATE;
  });
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    try {
      const session = sessionStorage.getItem('giva_mobile_auth');
      if (session === 'ADMIN' || session === 'MANAGER') return session;
    } catch {}
    return 'MANAGER';
  });

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

  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [serverConfirmed, setServerConfirmed] = useState(false); // data came from the server, not just cache
  const [pendingWrites, setPendingWrites] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Not yet');
  const [writeError, setWriteError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Keep latest products/rate available to handlers without re-subscribing
  const productsRef = useRef(products);
  productsRef.current = products;
  const rateRef = useRef(bankRate);
  rateRef.current = bankRate;

  // Page title for the installed app
  useEffect(() => {
    document.title = currentApp === 'Q3_POS' ? 'GIVA Q3 POS' : 'GIVA Store Manager';
  }, [currentApp]);

  // Browser connectivity (Wi-Fi / mobile data switching)
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

  // Surface queued writes that the server later rejected
  useEffect(() => {
    const h = (e: Event) => setWriteError((e as CustomEvent<string>).detail || 'A change could not be saved.');
    window.addEventListener(WRITE_ERROR_EVENT, h);
    return () => window.removeEventListener(WRITE_ERROR_EVENT, h);
  }, []);

  // Live Firestore subscriptions (single source of truth, works on any network)
  useEffect(() => {
    let unsubProducts: (() => void) | undefined;
    let unsubRate: (() => void) | undefined;
    let unsubSales: (() => void) | undefined;
    let cancelled = false;

    ensureAuth().then(() => {
      if (cancelled) return;

      seedInitialFirestoreData();

      unsubProducts = subscribeToProducts((items, meta) => {
        if (items.length > 0) {
          setProducts(items);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(items));
          } catch {}
        }
        setServerConfirmed(!meta.fromCache);
        setPendingWrites(meta.hasPendingWrites);
        if (!meta.fromCache && !meta.hasPendingWrites) setLastSyncTime(new Date().toLocaleTimeString());
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
    });

    return () => {
      cancelled = true;
      unsubProducts?.();
      unsubRate?.();
      unsubSales?.();
    };
  }, []);

  const isOnline = browserOnline && serverConfirmed;

  const handleRefresh = useCallback(async () => {
    setIsReconnecting(true);
    await forceReconnect();
    setTimeout(() => setIsReconnecting(false), 800);
  }, []);

  /* ---------- Handlers used by the Manager app ---------- */

  const handleUpdateBankRate = async (newRate: number) => {
    await updateBankRateInFirestore(newRate);
    setBankRate(newRate);
    try {
      localStorage.setItem(RATE_KEY, String(newRate));
    } catch {}
  };

  // The UI passes an absolute stock number; we convert it to a relative change so that a
  // sale ringing up on the Q3 at the same moment is never overwritten.
  const handleUpdateProductStock = async (id: number, newStock: number) => {
    const current = productsRef.current.find((p) => p.id === id);
    if (!current) return;
    await adjustProductStock(id, Math.max(0, Math.round(newStock)) - current.stockQuantity);
  };

  const handleCreateProduct = async (data: Partial<Product>) => {
    await createProduct(data, productsRef.current, rateRef.current);
  };

  const handleUpdateProduct = async (id: number, data: Partial<Product>) => {
    const current = productsRef.current.find((p) => p.id === id);
    await updateProduct(id, data, productsRef.current, rateRef.current);
    if (current && data.stockQuantity !== undefined && Number(data.stockQuantity) !== current.stockQuantity) {
      await adjustProductStock(id, Math.max(0, Number(data.stockQuantity)) - current.stockQuantity);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    await deleteProductFromFirestore(id);
  };

  const handleSelectRole = (newRole: UserRole) => {
    setCurrentUserRole(newRole);
    try {
      localStorage.setItem('giva_active_role', newRole);
    } catch {}
  };

  const pendingBanner =
    !isOnline || pendingWrites ? (
      <div
        className={`shrink-0 flex items-center justify-between gap-2 px-3 py-1 text-[11px] font-bold ${
          !isOnline ? 'bg-rose-600 text-white' : 'bg-amber-500 text-stone-900'
        }`}
        role="status"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {!isOnline ? <CloudOff size={13} /> : <RefreshCw size={13} className="animate-spin" />}
          <span className="truncate">
            {!isOnline
              ? 'No connection - you can keep working. Changes upload automatically when Wi-Fi or mobile data returns.'
              : 'Uploading changes...'}
          </span>
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isReconnecting}
          className="shrink-0 underline underline-offset-2 cursor-pointer disabled:opacity-60"
        >
          {isReconnecting ? 'Retrying...' : 'Retry now'}
        </button>
      </div>
    ) : null;

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-stone-900 text-stone-100 font-sans relative">
      {pendingBanner}

      {writeError && (
        <div className="shrink-0 flex items-start justify-between gap-2 px-3 py-1.5 bg-red-700 text-white text-[11px] font-bold">
          <span className="flex items-start gap-1.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>A change was rejected by the server and was NOT saved: {writeError}</span>
          </span>
          <button type="button" onClick={() => setWriteError(null)} className="shrink-0 cursor-pointer" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden relative">
        {currentApp === 'Q3_POS' ? (
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

      {currentApp === 'MOBILE_MANAGER' && (
        <>
          <BankRateModal
            isOpen={isRateModalOpen}
            onClose={() => setIsRateModalOpen(false)}
            currentRate={bankRate}
            onUpdateRate={handleUpdateBankRate}
          />
          <InstallApkModal
            isOpen={isInstallModalOpen}
            onClose={() => setIsInstallModalOpen(false)}
            deviceMode="MOBILE"
          />
        </>
      )}
    </div>
  );
}
