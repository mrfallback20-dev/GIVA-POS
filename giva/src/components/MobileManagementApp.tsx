import React, { useState, useRef } from 'react';
import {
  LayoutGrid,
  BarChart3,
  Coins,
  Shield,
  UserCheck,
  ChevronDown,
  Check,
  Lock,
  KeyRound,
  Activity,
  ArrowRightLeft,
  Clock,
  Package,
  LogOut,
  Smartphone,
  Download,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { CurrencyType, formatCurrency, SaleTransaction } from '../utils/pos-logic';
import { UserRole, USER_ROLES, canChangeBankRate } from '../utils/role-access';
import { OwnerDashboard } from './OwnerDashboard';
import { ReportsView } from './ReportsView';
import { MobileLoginScreen } from './MobileLoginScreen';

interface MobileManagementAppProps {
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
  isFirebaseConnected: boolean;
  lastSyncTime: string;
  currentUserRole: UserRole;
  onSelectRole?: (role: UserRole) => void;
  onOpenRateModal: () => void;
  onOpenApkModal: () => void;
  onSwitchToQ3Pos?: () => void;
  recentSales?: SaleTransaction[];
}

type ManagementTab = 'STOCK' | 'REPORTS' | 'DEDUCTIONS';

export const MobileManagementApp: React.FC<MobileManagementAppProps> = ({
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
  currentUserRole,
  onSelectRole,
  onOpenRateModal,
  onOpenApkModal,
  onSwitchToQ3Pos,
  recentSales = [],
  isFirebaseConnected = false,
  lastSyncTime = '',
}) => {
  const [activeTab, setActiveTab] = useState<ManagementTab>('STOCK');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Authentication State for Mobile Management App (Credentials for Admin & Manager)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('giva_mobile_auth');
      return auth === 'ADMIN' || auth === 'MANAGER';
    }
    return false;
  });

  // Touch Swipe Gesture State for Mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const TABS: ManagementTab[] = ['STOCK', 'REPORTS', 'DEDUCTIONS'];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      const currentIndex = TABS.indexOf(activeTab);
      if (deltaX < 0) {
        if (currentIndex < TABS.length - 1) {
          setActiveTab(TABS[currentIndex + 1]);
        }
      } else {
        if (currentIndex > 0) {
          setActiveTab(TABS[currentIndex - 1]);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleLogout = () => {
    setIsRoleDropdownOpen(false);
    try {
      sessionStorage.removeItem('giva_mobile_auth');
    } catch (e) {}
    setIsAuthenticated(false);
  };

  // If not authenticated with Admin or Manager credentials, display dedicated MobileLoginScreen
  if (!isAuthenticated) {
    return (
      <MobileLoginScreen
        onLoginSuccess={(role) => {
          setIsAuthenticated(true);
          if (onSelectRole) onSelectRole(role);
        }}
        onBackToAppSelector={onSwitchToQ3Pos}
      />
    );
  }

  return (
    <div
      className="flex flex-col h-full w-full bg-stone-100 overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 
        CLEAN UNCLUTTERED MOBILE MANAGEMENT RIBBON:
        1. COMPANY NAME (GIVA Living & Baby)
        2. OPTION TO CHANGE USD TO ZIG RATE (1 USD = X ZiG)
        3. MANAGER OR ADMIN CREDENTIALS DROPDOWN (No passwords shown or options to reveal)
      */}
      <header className="bg-stone-900 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between border-b border-stone-800 shrink-0 z-30 shadow-md">
        {/* 1. COMPANY NAME */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-500 to-amber-700 flex items-center justify-center font-serif font-black text-white text-base shadow-xs shrink-0">
            G
          </div>
          <div className="leading-tight truncate">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate uppercase font-serif">
              GIVA Living &amp; Baby
            </h1>
          </div>
        </div>

        {/* Center/Right Items */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 2. OPTION TO CHANGE USD TO ZIG RATE */}
          <button
            type="button"
            onClick={() => {
              if (canChangeBankRate(currentUserRole)) {
                onOpenRateModal();
              } else {
                alert('Changing the official bank rate requires Admin role. Please switch to Admin in the dropdown.');
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-950 hover:bg-black text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Tap to Change USD to ZiG Exchange Rate"
          >
            <Coins size={13} className="text-amber-400 shrink-0" />
            <span className="font-mono text-[11px] sm:text-xs">
              1 USD = <strong className="text-white font-extrabold">{bankRate.toFixed(2)}</strong> ZiG
            </span>
            <span className="text-[10px] text-amber-500 hidden sm:inline ml-0.5">✎</span>
          </button>

          {/* 3. MANAGER OR ADMIN CREDENTIALS DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                currentUserRole === 'ADMIN'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
              title="Select Role: Manager or Admin"
            >
              {currentUserRole === 'ADMIN' ? (
                <Shield size={13} className="text-amber-400" />
              ) : (
                <UserCheck size={13} className="text-emerald-400" />
              )}
              <span className="text-xs font-bold">
                {currentUserRole === 'ADMIN' ? 'Admin' : 'Manager'}
              </span>
              <ChevronDown
                size={12}
                className={`text-stone-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu (No passwords displayed or revealed) */}
            {isRoleDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsRoleDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-48 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-stone-800 text-[10px] uppercase font-bold text-stone-400 flex items-center justify-between">
                    <span>Credentials</span>
                    <span className="text-stone-500 font-mono text-[9px]">Protected</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRoleDropdownOpen(false);
                      if (currentUserRole !== 'ADMIN') handleLogout();
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs cursor-pointer hover:bg-stone-800 transition-colors ${
                      currentUserRole === 'ADMIN'
                        ? 'text-amber-300 font-bold bg-stone-800/60'
                        : 'text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield size={13} className="text-amber-400" />
                      <span>Admin (Owner)</span>
                    </div>
                    {currentUserRole === 'ADMIN' && <Check size={13} className="text-amber-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRoleDropdownOpen(false);
                      if (currentUserRole !== 'MANAGER') handleLogout();
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs cursor-pointer hover:bg-stone-800 transition-colors ${
                      currentUserRole === 'MANAGER'
                        ? 'text-emerald-300 font-bold bg-stone-800/60'
                        : 'text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck size={13} className="text-emerald-400" />
                      <span>Store Manager</span>
                    </div>
                    {currentUserRole === 'MANAGER' && <Check size={13} className="text-emerald-400" />}
                  </button>

                  <div className="border-t border-stone-800 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRoleDropdownOpen(false);
                        onOpenApkModal();
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-xs text-amber-300 hover:bg-stone-800 cursor-pointer"
                    >
                      <Download size={13} className="text-amber-400" />
                      <span>Download Android APKs</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-xs text-rose-300 hover:bg-stone-800 cursor-pointer"
                    >
                      <LogOut size={13} className="text-rose-400" />
                      <span>Lock &amp; Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Swipeable View Tab Switcher */}
      <div className="bg-stone-950 px-3 py-1.5 flex items-center justify-between border-b border-stone-800 text-xs shrink-0">
        <div className="flex items-center gap-1 bg-stone-900 p-0.5 rounded-lg border border-stone-800 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('STOCK')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'STOCK'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <LayoutGrid size={13} />
            <span>Stock Management</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REPORTS')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'REPORTS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <BarChart3 size={13} />
            <span>P&amp;L Statements</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DEDUCTIONS')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'DEDUCTIONS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Activity size={13} />
            <span>Live Sync Feed</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-stone-400">
          <span>Swipe left / right to navigate tabs</span>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {activeTab === 'STOCK' ? (
          <OwnerDashboard
            products={products}
            currency={currency}
            bankRate={bankRate}
            onUpdateBankRate={onUpdateBankRate}
            onUpdateProductStock={onUpdateProductStock}
            onCreateProduct={onCreateProduct}
            onUpdateProduct={onUpdateProduct}
            onDeleteProduct={onDeleteProduct}
            onRefresh={onRefresh}
            isOnline={isOnline}
            currentUserRole={currentUserRole}
            onOpenApkModal={onOpenApkModal}
            recentSalesData={recentSales}
          />
        ) : activeTab === 'REPORTS' ? (
          <ReportsView
            currency={currency}
            bankRate={bankRate}
          />
        ) : (
          /* Live sales & sync feed tab */
          <div className="h-full overflow-y-auto p-4 sm:p-6 bg-stone-100 space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-stone-900">Live Sales & Stock Sync</h2>
                    <p className="text-xs text-stone-500">
                      Every sale on the Q3 POS deducts stock here, on Wi-Fi or mobile data
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-stone-400 block">Cloud Sync</span>
                  <span
                    className={`text-xs font-bold flex items-center gap-1 justify-end ${
                      isOnline ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`}
                    />
                    {isOnline ? 'Live' : isFirebaseConnected ? 'Reconnecting' : 'Offline'}
                  </span>
                  {lastSyncTime && lastSyncTime !== 'Not yet' && (
                    <span className="text-[10px] text-stone-400 block">Last sync {lastSyncTime}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Active Catalog</span>
                  <span className="text-lg font-black text-stone-900">{products.length} Products</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Units in Stock</span>
                  <span className="text-lg font-black text-stone-900">
                    {products.reduce((acc, p) => acc + Math.max(0, p.stockQuantity), 0)} Units
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Exchange Rate</span>
                  <span className="text-lg font-black text-amber-600 font-mono">
                    1 USD = {bankRate.toFixed(2)} ZiG
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-2">
              <h3 className="text-sm font-extrabold text-stone-900">Latest sales</h3>
              {recentSales.length === 0 ? (
                <p className="text-xs text-stone-500">No sales yet. They appear here the moment they are rung up.</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {recentSales.slice(0, 20).map((s) => (
                    <li key={s.id} className="py-2 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-stone-800">
                          {s.receiptNo || `#${s.id}`}{' '}
                          <span className="font-normal text-stone-400">
                            {new Date(s.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {s.cashierName ? ` - ${s.cashierName}` : ''}
                          </span>
                        </div>
                        <div className="text-stone-500 truncate">
                          {s.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                        </div>
                      </div>
                      <div className="font-mono font-black text-stone-900 shrink-0">
                        {formatCurrency(s.totalAmount, s.currency)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
