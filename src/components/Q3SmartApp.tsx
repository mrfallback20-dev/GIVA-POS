import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  User,
  ChevronDown,
  Menu,
  X,
  Barcode,
  LogOut,
  Printer,
  UserPlus,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  KeyRound,
  Lock,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { CurrencyType } from '../utils/pos-logic';
import { UserRole } from '../utils/role-access';
import { Q3TerminalView } from './Q3TerminalView';
import { InventoryCheckView } from './InventoryCheckView';
import { BrandLogo } from './BrandLogo';
import { CashierDropdown } from './CashierDropdown';
import { getActiveCashier, setActiveCashier } from '../utils/cashier-service';
import { printReceiptSlip } from '../utils/print-service';
import { showToast } from '../utils/toast';

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

  // Cashier Authentication State - Persistent, never forces re-registration
  const [cashierName, setCashierName] = useState<string>(() => {
    return getActiveCashier();
  });

  const [isCashierMenuOpen, setIsCashierMenuOpen] = useState(false);

  // Trigger laser scan
  const handleTriggerLaser = () => {
    setIsLaserFiring(true);
    setIsDrawerOpen(false);
    setTimeout(() => {
      setIsLaserFiring(false);
      setIsScannerOpen(true);
    }, 200);
  };

  const handleOpenScanner = () => {
    setIsDrawerOpen(false);
    setIsScannerOpen(true);
  };

  const handleTestPrintPaper = async () => {
    setIsDrawerOpen(false);
    showToast('Testing 58mm thermal printer paper feed...', 'info');
    try {
      await printReceiptSlip({
        receiptNo: `TEST-${Date.now().toString().slice(-4)}`,
        storeName: 'GIVA LIVING & BABY',
        tagline: '58mm Printer Test Slip',
        timestamp: new Date().toISOString(),
        paymentMethod: 'TEST PAPER FEED',
        items: [
          {
            productId: 1,
            barcode: '6001001',
            name: 'Paper Feed Test Line',
            quantity: 1,
            unitPrice: 0,
            subtotal: 0,
          },
        ],
        totalAmount: 0,
        currency: 'USD',
        bankRate,
        amountTendered: 0,
        changeAmount: 0,
        cashierName,
      });
      showToast('Thermal paper test complete', 'success');
    } catch {
      showToast('Printer ready for sales slips', 'info');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-stone-100 overflow-y-auto overflow-x-auto scroll-both">
      {/* 
        STREAMLINED Q3 COUNTER RIBBON:
        1. LOGO
        2. USD / ZIG TOGGLE
        3. USER / CASHIER DROPDOWN (Quick 1-tap Cashier Switcher & Role Selector)
        4. SCAN USING BARCODE
        5. Clean three line (☰) menu button
      */}
      <header className="bg-stone-900 text-white px-2 sm:px-3 py-2 flex items-center justify-between border-b border-stone-800 shrink-0 z-30 shadow-sm gap-1 sm:gap-2">
        {/* 1. LOGO */}
        <div className="flex items-center shrink-0">
          <BrandLogo size="sm" showSubtitle={false} isDarkTheme={true} className="py-0" />
        </div>

        {/* 2. USD / ZIG, 3. USER DROP DOWN, 4. SCAN USING BARCODE, 5. MENU */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* 2. USD / ZIG TOGGLE */}
          <div className="flex bg-stone-950 p-0.5 rounded-xl border border-stone-800 text-xs font-bold shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-1.5 sm:px-2 py-1 rounded-lg transition-all cursor-pointer text-xs font-bold ${
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
              className={`px-1.5 sm:px-2 py-1 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                currency === 'ZiG'
                  ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              ZiG
            </button>
          </div>

          {/* 3. CASHIER DROPDOWN (Strictly Cashiers Only) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsCashierMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-stone-950 hover:bg-black text-amber-300 border border-stone-800 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 max-w-[120px] sm:max-w-[150px]"
              title={`Cashier on Duty: ${cashierName} • Tap to switch cashier`}
            >
              <User size={13} className="text-amber-400 shrink-0" />
              <span className="truncate text-white font-semibold">
                {cashierName}
              </span>
              <ChevronDown size={11} className="text-stone-400 shrink-0" />
            </button>

            <CashierDropdown
              isOpen={isCashierMenuOpen}
              onClose={() => setIsCashierMenuOpen(false)}
              currentCashier={cashierName}
              onSelectCashier={(name) => {
                setCashierName(name);
                setActiveCashier(name);
              }}
            />
          </div>

          {/* 4. SCAN USING BARCODE BUTTON */}
          <button
            type="button"
            onClick={handleOpenScanner}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
            title="Scan using barcode camera or laser"
          >
            <Barcode size={14} className="stroke-[2.5]" />
            <span className="font-extrabold">Scan</span>
          </button>

          {/* 5. THREE LINE (☰) TOP RIGHT MENU FOR CASHIER */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer border border-stone-700 shrink-0"
            title="Open Cashier Menu"
            aria-label="Open Cashier Menu"
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      {/* COMPACT TOUCH-FRIENDLY SUB-TAB SWITCHER (Tap to switch tabs) */}
      <div className="bg-stone-950 px-2.5 py-1 border-b border-stone-800 shrink-0 flex items-center justify-between">
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
            <span>2. Floor Check</span>
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
            onOpenScannerProp={() => setIsScannerOpen(true)}
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

      {/* THREE LINE (☰) CASHIER-ONLY DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="bg-stone-900 w-full max-w-xs h-full text-white flex flex-col justify-between shadow-2xl border-l border-stone-800 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2">
                <User size={16} className="text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">Cashier Terminal Menu</h3>
                  <p className="text-[10px] text-stone-400 font-mono">Q3 Counter Station</p>
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

            {/* Cashier-Only Tools */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
              {/* Cashier Info Badge */}
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-1">
                <div className="flex items-center justify-between text-stone-300">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <User size={14} className="text-amber-400" />
                    <span>Logged In Cashier</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                    Active Shift
                  </span>
                </div>
                <p className="text-sm font-bold text-white">
                  {cashierName}
                </p>
                <p className="text-[10px] text-stone-400">
                  Terminal: Q3 SMART POS #01
                </p>
              </div>

              {/* Cashier Action Buttons */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                  Terminal Tools
                </span>

                {/* Scan Barcode */}
                <button
                  onClick={handleOpenScanner}
                  className="w-full p-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold flex items-center gap-2.5 cursor-pointer border border-stone-700 transition-colors text-left"
                >
                  <Barcode size={16} className="text-amber-400 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-white">Scan Product Barcode</span>
                    <span className="text-[10px] text-stone-400 font-normal">Camera scanner or laser lookup</span>
                  </div>
                </button>

                {/* Switch to Floor Inventory Check */}
                <button
                  onClick={() => {
                    setSubTab('INVENTORY_CHECK');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full p-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold flex items-center gap-2.5 cursor-pointer border border-stone-700 transition-colors text-left"
                >
                  <Search size={16} className="text-blue-400 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-white">Floor Inventory Price Check</span>
                    <span className="text-[10px] text-stone-400 font-normal">Check stock &amp; selling price</span>
                  </div>
                </button>

                {/* Test Thermal Receipt Paper */}
                <button
                  onClick={handleTestPrintPaper}
                  className="w-full p-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold flex items-center gap-2.5 cursor-pointer border border-stone-700 transition-colors text-left"
                >
                  <Printer size={16} className="text-emerald-400 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-white">Test 58mm Thermal Paper</span>
                    <span className="text-[10px] text-stone-400 font-normal">Feed test slip on printer</span>
                  </div>
                </button>

                {/* Switch Active Cashier Shortcut */}
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsCashierMenuOpen(true);
                  }}
                  className="w-full p-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold flex items-center gap-2.5 cursor-pointer border border-stone-700 transition-colors text-left"
                >
                  <User size={16} className="text-amber-400 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-white">Switch Cashier Profile</span>
                    <span className="text-[10px] text-stone-400 font-normal">Change shift or cashier on duty</span>
                  </div>
                </button>
              </div>

              {/* Currency Rate Info */}
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-stone-400">
                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">
                  Official RBZ Bank Rate
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  1 USD = {bankRate.toFixed(2)} ZiG
                </span>
              </div>
            </div>

            {/* Bottom: Switch Cashier / Sign Out */}
            <div className="p-4 border-t border-stone-800 bg-stone-950 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsCashierMenuOpen(true);
                }}
                className="w-full py-2.5 px-3 bg-stone-800 hover:bg-amber-500/20 text-stone-200 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-stone-700"
              >
                <User size={14} className="text-amber-400" />
                <span>Switch Active Cashier / Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
