import React, { useState, useEffect } from 'react';
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
  Tablet,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { CurrencyType, formatCurrency, SaleTransaction } from '../utils/pos-logic';
import { UserRole, USER_ROLES, canChangeBankRate } from '../utils/role-access';
import { OwnerDashboard } from './OwnerDashboard';
import { ReportsView } from './ReportsView';
import { MobileLoginScreen } from './MobileLoginScreen';
import { RoleAuthModal } from './RoleAuthModal';
import { BrandLogo } from './BrandLogo';
import { ManagerRoleDropdown } from './ManagerRoleDropdown';
import { showToast } from '../utils/toast';

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
  recentSales = [],
  isFirebaseConnected = false,
  lastSyncTime = '',
}) => {
  const [activeTab, setActiveTab] = useState<ManagementTab>('STOCK');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const handleSwitchRole = (role: UserRole) => {
    setIsRoleDropdownOpen(false);
    if (role !== 'ADMIN' && role !== 'MANAGER') return;
    try {
      sessionStorage.setItem('giva_mobile_auth', role);
      localStorage.setItem('giva_active_role', role);
    } catch {}
    if (onSelectRole) onSelectRole(role);
    showToast(`Switched role to ${role === 'ADMIN' ? 'Store Owner (Admin)' : 'Store Manager'}`, 'success');
  };

  return (
    <div className="flex flex-col h-full w-full bg-stone-100 overflow-y-auto overflow-x-auto scroll-both">
      {/* 
        CLEAN UNCLUTTERED MOBILE MANAGEMENT RIBBON:
        1. COMPANY NAME (GIVA Living & Baby)
        2. OPTION TO CHANGE USD TO ZIG RATE (1 USD = X ZiG)
        3. MANAGER OR ADMIN CREDENTIALS DROPDOWN (1-Tap Switch)
      */}
      <header className="bg-stone-900 text-white px-2.5 sm:px-3 py-2 flex items-center justify-between border-b border-stone-800 shrink-0 z-30 shadow-sm gap-1.5 overflow-x-hidden">
        {/* 1. COMPANY LOGO */}
        <div className="flex items-center shrink-0">
          <BrandLogo size="sm" showSubtitle={false} isDarkTheme={true} className="py-0" />
        </div>

        {/* Center/Right Items */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 2. OPTION TO CHANGE USD TO ZIG RATE */}
          <button
            type="button"
            onClick={() => {
              if (canChangeBankRate(currentUserRole)) {
                onOpenRateModal();
              } else {
                showToast('Switching to Admin role to change official bank rate...', 'info');
                handleSwitchRole('ADMIN');
                onOpenRateModal();
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

          {/* 3. MANAGER OR ADMIN ROLES DROPDOWN (Strictly Store Manager & Admin Only) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 max-w-[130px] sm:max-w-[160px] ${
                currentUserRole === 'ADMIN'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
              title="Select Role: Store Manager or Admin (1-Tap Switch)"
            >
              {currentUserRole === 'ADMIN' ? (
                <Shield size={13} className="text-amber-400 shrink-0" />
              ) : (
                <UserCheck size={13} className="text-emerald-400 shrink-0" />
              )}
              <span className="text-xs font-bold truncate">
                {currentUserRole === 'ADMIN' ? 'Admin' : 'Manager'}
              </span>
              <ChevronDown
                size={12}
                className={`text-stone-400 shrink-0 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <ManagerRoleDropdown
              isOpen={isRoleDropdownOpen}
              onClose={() => setIsRoleDropdownOpen(false)}
              currentRole={currentUserRole}
              onSelectRole={handleSwitchRole}
            />
          </div>
        </div>
      </header>

      {/* View Tab Switcher (Tap to switch tabs) */}
      <div className="bg-stone-950 px-3 py-1.5 flex items-center justify-between border-b border-stone-800 text-xs shrink-0">
        <div className="flex items-center gap-1 bg-stone-900 p-0.5 rounded-xl border border-stone-800 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('STOCK')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
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
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
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
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'DEDUCTIONS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Activity size={13} />
            <span>Live Sync Feed</span>
          </button>
        </div>
      </div>

      {/* Main Content Pane - Allows clean scrolling */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative">
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
          <ReportsView currency={currency} bankRate={bankRate} />
        ) : (
          <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-stone-900">Live Sales &amp; Stock Sync</h2>
                    <p className="text-xs text-stone-500">
                      Every sale on the Q3 POS automatically deducts inventory in real time
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

            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs space-y-2">
              <h3 className="text-sm font-extrabold text-stone-900">Latest POS Terminal Sales</h3>
              {recentSales.length === 0 ? (
                <p className="text-xs text-stone-500">No sales yet. They appear here the moment they are rung up on Q3.</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {recentSales.slice(0, 20).map((s) => (
                    <li key={s.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
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
                            {s.cashierName ? ` • ${s.cashierName}` : ''}
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
