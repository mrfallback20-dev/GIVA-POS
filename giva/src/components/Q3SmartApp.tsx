import React, { useState } from 'react';
import {
  ShoppingCart,
  Package,
  Tablet,
  Flame,
  Wifi,
  WifiOff,
  Coins,
  User,
  ChevronDown,
  Menu,
  X,
  Barcode,
  Camera,
  LogOut,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { CurrencyType } from '../utils/pos-logic';
import { Q3TerminalView } from './Q3TerminalView';
import { InventoryCheckView } from './InventoryCheckView';
import { BrandLogo } from './BrandLogo';
import { CashierLoginModal } from './CashierLoginModal';

interface Q3SmartAppProps {
  products: Product[];
  currency: CurrencyType;
  setCurrency: (c: CurrencyType) => void;
  bankRate: number;
  onRefreshProducts: () => void;
  isOnline: boolean;
  isFirebaseConnected: boolean;
  lastSyncTime: string;
}

export const Q3SmartApp: React.FC<Q3SmartAppProps> = ({
  products,
  currency,
  setCurrency,
  bankRate,
  onRefreshProducts,
  isOnline,
  isFirebaseConnected,
  lastSyncTime,
}) => {
  const [subTab, setSubTab] = useState<'SALES' | 'INVENTORY_CHECK'>('SALES');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLaserFiring, setIsLaserFiring] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Cashier Authentication State (Default: Cathy, Password: 1234)
  const [cashierName, setCashierName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('giva_q3_cashier_name') || 'Cathy';
    }
    return 'Cathy';
  });

  // When Q3 Smart POS opens, prompt for Cashier Name & Password unless already logged in
  const [isCashierLoggedIn, setIsCashierLoggedIn] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('giva_q3_cashier_active') === 'true';
    }
    return false;
  });

  const [isCashierMenuOpen, setIsCashierMenuOpen] = useState(false);

  // Trigger laser scan
  const handleTriggerLaser = () => {
    setIsLaserFiring(true);
    setIsDrawerOpen(false);
    setTimeout(() => {
      setIsLaserFiring(false);
      setIsScannerOpen(true);
    }, 250);
  };

  const handleOpenScanner = () => {
    setIsDrawerOpen(false);
    setIsScannerOpen(true);
  };

  const handleCashierLogout = () => {
    setIsCashierMenuOpen(false);
    try {
      sessionStorage.removeItem('giva_q3_cashier_active');
    } catch (e) {}
    setIsCashierLoggedIn(false);
  };

  // Mobile swipe right / left between Sales and Inventory Check
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && subTab === 'SALES') {
        setSubTab('INVENTORY_CHECK');
      } else if (deltaX > 0 && subTab === 'INVENTORY_CHECK') {
        setSubTab('SALES');
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  return (
    <div
      className="flex flex-col h-full w-full bg-stone-100 overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 
        CLEAN STREAMLINED Q3 COUNTER RIBBON:
        1. Company Name (Brand Logo)
        2. Option to change to USD or ZiG
        3. Cashier Status Badge: Cathy (Cashier) with Switch / Logout
        (NO Level Access Window, NO Rate Change Button, NO Admin settings)
      */}
      <header className="bg-stone-900 text-white px-3 sm:px-4 py-2 flex items-center justify-between border-b border-stone-800 shrink-0 z-30 shadow-sm">
        {/* 1. COMPANY NAME */}
        <div className="flex items-center gap-2 min-w-0">
          <BrandLogo size="sm" showSubtitle={false} className="py-0" />
        </div>

        {/* 2. USD / ZiG TOGGLE & 3. CASHIER BADGE */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* OPTION TO CHANGE TO USD OR ZIG */}
          <div className="flex bg-stone-950 p-0.5 rounded-xl border border-stone-800 text-xs font-bold shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                currency === 'USD'
                  ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              USD
            </button>
            <button
              type="button"
              onClick={() => setCurrency('ZiG')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                currency === 'ZiG'
                  ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              ZiG
            </button>
          </div>

          {/* CASHIER STATUS BADGE (NO LEVEL ACCESS WINDOW - JUST CASHIER CATHY) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCashierMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-950 hover:bg-black text-amber-300 border border-stone-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title={`Cashier: ${cashierName} • Tap to switch cashier`}
            >
              <User size={13} className="text-amber-400 shrink-0" />
              <span className="truncate max-w-[85px] sm:max-w-none">
                Cashier: <strong className="text-white">{cashierName}</strong>
              </span>
              <ChevronDown size={12} className="text-stone-400 shrink-0" />
            </button>

            {/* Quick Cashier Dropdown */}
            {isCashierMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-2.5 z-50 text-xs animate-in fade-in duration-150">
                <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800/80 mb-2">
                  <span className="text-[10px] text-stone-400 uppercase font-mono block">
                    Active Cashier
                  </span>
                  <span className="text-sm font-extrabold text-white block">
                    {cashierName}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-bold">
                      Q3 Counter Station • Ready
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCashierLogout}
                  className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut size={13} className="text-amber-400" />
                  <span>Switch Cashier / Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* OVERFLOW MENU (☰) FOR CASHIER HARDWARE TOOLS */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer border border-stone-700 shrink-0"
            title="Open Hardware Tools & Options"
            aria-label="Open Tools Menu"
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      {/* COMPACT TOUCH-FRIENDLY SUB-TAB SWITCHER (Swipeable left-right) */}
      <div className="bg-stone-950 px-3 py-1.5 border-b border-stone-800 shrink-0 flex items-center justify-between">
        <div className="flex bg-stone-900 p-0.5 rounded-xl border border-stone-800 text-xs font-bold w-full max-w-sm mx-auto shadow-inner">
          <button
            type="button"
            onClick={() => setSubTab('SALES')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
              subTab === 'SALES'
                ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <ShoppingCart size={13} />
            <span>1. Sales Register</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('INVENTORY_CHECK')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
              subTab === 'INVENTORY_CHECK'
                ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Package size={13} />
            <span>2. Inventory Check</span>
            <span className="text-[10px] bg-stone-800 px-1.5 py-0.2 rounded text-stone-300 font-mono">
              {products.length}
            </span>
          </button>
        </div>
      </div>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {subTab === 'SALES' ? (
          <Q3TerminalView
            products={products}
            currency={currency}
            setCurrency={setCurrency}
            bankRate={bankRate}
            onRefreshProducts={onRefreshProducts}
            isOnline={isOnline}
            cashierName={cashierName}
            deviceMode="POS"
            isScannerOpenProp={isScannerOpen}
            onCloseScannerProp={() => setIsScannerOpen(false)}
            isLaserFiringProp={isLaserFiring}
            onTriggerLaserProp={handleTriggerLaser}
          />
        ) : (
          <InventoryCheckView
            products={products}
            currency={currency}
            bankRate={bankRate}
            onSwitchToSales={() => setSubTab('SALES')}
          />
        )}
      </main>

      {/* 
        HARDWARE TOOLS & TERMINAL CONTROLS DRAWER
        (Strictly cashier-appropriate: Laser Scan, Camera Scan, Station status, Read-only Bank Rate.
        NO Change Rate button, NO Mobile Store Manager button, NO Download APK button)
      */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="bg-stone-900 w-full max-w-xs h-full text-white flex flex-col justify-between shadow-2xl border-l border-stone-800 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2">
                <Tablet size={18} className="text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">Q3 SMART Features</h3>
                  <p className="text-[10px] text-stone-400 font-mono">Terminal #01 Controls</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Cashier Station Info */}
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-1">
                <div className="flex items-center justify-between text-stone-300">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <User size={14} className="text-amber-400" />
                    <span>Cashier Station</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-stone-300">
                  Logged in: <strong className="text-white">{cashierName}</strong> (Cashier)
                </p>
              </div>

              {/* Hardware Specs */}
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-1">
                <div className="flex items-center justify-between text-stone-300">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Q3SMART POS Terminal</span>
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                    Android 11
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 leading-tight">
                  Handheld 58mm Thermal POS • Built-in Laser Scanner Engine
                </p>
              </div>

              {/* FIREBASE SYNCED STATUS */}
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isFirebaseConnected ? (
                    <Flame size={16} className="text-amber-400 fill-amber-400" />
                  ) : isOnline ? (
                    <Wifi size={16} className="text-emerald-400" />
                  ) : (
                    <WifiOff size={16} className="text-rose-400" />
                  )}
                  <div>
                    <span className="font-bold text-stone-200 block text-xs">
                      {isFirebaseConnected ? 'Firebase Cloud Synced' : isOnline ? 'Online Synced' : 'Offline Mode'}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Last sync: {lastSyncTime}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    isFirebaseConnected
                      ? 'bg-amber-400/20 text-amber-300'
                      : isOnline
                      ? 'bg-emerald-400/20 text-emerald-300'
                      : 'bg-rose-400/20 text-rose-300'
                  }`}
                >
                  Live
                </span>
              </div>

              {/* HARDWARE SCANNER TOOLS (LASER SCAN & CAMERA) */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                  Barcode Scanner Tools
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {/* LASER SCAN */}
                  <button
                    onClick={handleTriggerLaser}
                    className="p-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer border border-stone-700 transition-all active:scale-95"
                  >
                    <Barcode size={20} className="text-amber-400" />
                    <span>Laser Scan</span>
                  </button>

                  {/* CAMERA */}
                  <button
                    onClick={handleOpenScanner}
                    className="p-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer border border-stone-700 transition-all active:scale-95"
                  >
                    <Camera size={20} className="text-stone-300" />
                    <span>Camera Scan</span>
                  </button>
                </div>
              </div>

              {/* RATE (OFFICIAL RBZ BANK RATE - READ ONLY FOR CASHIER) */}
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">
                      Official RBZ Bank Rate
                    </span>
                    <span className="font-extrabold text-amber-300 text-sm font-mono block mt-0.5">
                      1 USD = {bankRate.toFixed(2)} ZiG
                    </span>
                  </div>
                  <span className="text-[10px] bg-stone-900 border border-stone-800 text-stone-400 px-2 py-0.5 rounded font-mono">
                    Interbank
                  </span>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Automatic conversion applied to USD and ZiG cash tenders.
                </p>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-stone-950 border-t border-stone-800 text-center">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        CASHIER LOGIN MODAL (OPENS ON INITIAL LOAD OR LOGOUT):
        Asks for Cashier's Name (default Cathy) and Password (1234).
        She is the cashier. No level access window!
      */}
      <CashierLoginModal
        isOpen={!isCashierLoggedIn}
        initialCashierName={cashierName}
        onLoginSuccess={(name) => {
          setCashierName(name);
          setIsCashierLoggedIn(true);
          try {
            sessionStorage.setItem('giva_q3_cashier_active', 'true');
          } catch (e) {}
        }}
      />
    </div>
  );
};
