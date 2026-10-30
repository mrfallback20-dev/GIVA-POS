import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  UserCheck,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  Sparkles,
  Smartphone,
  Tablet,
  LogOut,
  X,
  Lock,
} from 'lucide-react';
import { UserRole, USER_ROLES } from '../utils/role-access';
import {
  getSavedCashiers,
  saveCashier,
  removeCashier,
  setActiveCashier,
  getActiveCashier,
} from '../utils/cashier-service';
import { showToast } from '../utils/toast';

interface UserRoleDropdownProps {
  currentCashier: string;
  onSelectCashier: (name: string) => void;
  currentRole?: UserRole;
  onSelectRole?: (role: UserRole) => void;
  onSwitchApp?: (app: 'Q3_POS' | 'MOBILE_MANAGER') => void;
  currentApp?: 'Q3_POS' | 'MOBILE_MANAGER';
  isOpen: boolean;
  onClose: () => void;
}

export const UserRoleDropdown: React.FC<UserRoleDropdownProps> = ({
  currentCashier,
  onSelectCashier,
  currentRole = 'CASHIER',
  onSelectRole,
  onSwitchApp,
  currentApp = 'Q3_POS',
  isOpen,
  onClose,
}) => {
  const [cashiersList, setCashiersList] = useState<string[]>(() => getSavedCashiers());
  const [isAddingCashier, setIsAddingCashier] = useState(false);
  const [newCashierName, setNewCashierName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCashiersList(getSavedCashiers());
      setIsAddingCashier(false);
      setNewCashierName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePickCashier = (name: string) => {
    setActiveCashier(name);
    onSelectCashier(name);
    showToast(`Switched active cashier to ${name}`, 'success');
    onClose();
  };

  const handleAddNewCashier = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCashierName.trim();
    if (!clean) return;

    const updated = saveCashier(clean);
    setCashiersList(updated);
    onSelectCashier(clean);
    setNewCashierName('');
    setIsAddingCashier(false);
    showToast(`Cashier "${clean}" saved and active!`, 'success');
    onClose();
  };

  const handleDeleteCashier = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (cashiersList.length <= 1) {
      showToast('You must keep at least one cashier on the terminal.', 'warning');
      return;
    }
    const updated = removeCashier(name);
    setCashiersList(updated);
    if (currentCashier === name && updated.length > 0) {
      onSelectCashier(updated[0]);
    }
    showToast(`Removed "${name}" from cashier list`, 'info');
  };

  const handleSelectRole = (role: UserRole) => {
    try {
      sessionStorage.setItem('giva_mobile_auth', role);
      localStorage.setItem('giva_active_role', role);
    } catch {}

    if (onSelectRole) {
      onSelectRole(role);
    }

    if (role === 'ADMIN' || role === 'MANAGER') {
      if (onSwitchApp && currentApp !== 'MOBILE_MANAGER') {
        onSwitchApp('MOBILE_MANAGER');
      }
      showToast(`Switched to ${role === 'ADMIN' ? 'Store Owner (Admin)' : 'Store Manager'}`, 'success');
    } else {
      if (onSwitchApp && currentApp !== 'Q3_POS') {
        onSwitchApp('Q3_POS');
      }
      showToast('Switched to POS Cashier Register', 'success');
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs"
        onClick={onClose}
      />

      {/* Dropdown Card */}
      <div className="absolute right-2 sm:right-4 top-12 mt-1 w-80 max-w-[92vw] bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 text-stone-100 flex flex-col gap-2.5">
        {/* Active Profile Header */}
        <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold shrink-0">
              {currentRole === 'ADMIN' ? (
                <Shield size={18} />
              ) : currentRole === 'MANAGER' ? (
                <UserCheck size={18} />
              ) : (
                <User size={18} />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                {currentRole === 'ADMIN'
                  ? 'Store Owner / Admin'
                  : currentRole === 'MANAGER'
                  ? 'Store Manager'
                  : 'Active Cashier'}
              </span>
              <h4 className="font-extrabold text-sm text-white truncate">
                {currentCashier || 'Cathy M.'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-300">Ready</span>
          </div>
        </div>

        {/* 1. Quick Cashier Switcher (No password hassle, remembered forever) */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
              Switch Cashier (1-Tap)
            </span>
            <button
              type="button"
              onClick={() => setIsAddingCashier(!isAddingCashier)}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={12} />
              <span>{isAddingCashier ? 'Cancel' : 'Add Cashier'}</span>
            </button>
          </div>

          {/* Inline Add Cashier Form */}
          {isAddingCashier && (
            <form onSubmit={handleAddNewCashier} className="mb-2 p-2 bg-stone-950 rounded-xl border border-amber-500/30 flex gap-1.5">
              <input
                type="text"
                placeholder="Cashier name (e.g. Farai)"
                value={newCashierName}
                onChange={(e) => setNewCashierName(e.target.value)}
                className="flex-1 bg-stone-900 border border-stone-700 px-2.5 py-1.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newCashierName.trim()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-bold rounded-lg text-xs cursor-pointer transition-colors"
              >
                Save
              </button>
            </form>
          )}

          {/* Cashier List */}
          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
            {cashiersList.map((cashier) => {
              const active = currentCashier.toLowerCase() === cashier.toLowerCase();
              return (
                <div
                  key={cashier}
                  onClick={() => handlePickCashier(cashier)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl border cursor-pointer transition-all group ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold shadow-xs'
                      : 'bg-stone-800/80 hover:bg-stone-800 text-stone-200 border-stone-700/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <User size={12} className={active ? 'text-amber-400' : 'text-stone-400'} />
                    <span className="truncate text-xs">{cashier}</span>
                  </div>

                  {active ? (
                    <Check size={13} className="text-amber-400 shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCashier(e, cashier)}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity cursor-pointer shrink-0"
                      title="Remove cashier"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Mode & Role Switcher */}
        <div className="pt-2 border-t border-stone-800">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1.5 px-1">
            Switch Store Role &amp; View
          </span>

          <div className="space-y-1.5">
            {/* Cashier Mode */}
            <button
              type="button"
              onClick={() => handleSelectRole('CASHIER')}
              className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                currentRole === 'CASHIER'
                  ? 'bg-stone-800 border-amber-500/60 text-white font-bold'
                  : 'bg-stone-950/60 border-stone-800 hover:bg-stone-800/70 text-stone-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tablet size={15} className="text-amber-400" />
                <div>
                  <span className="block text-xs font-bold text-white">Q3 POS Cashier</span>
                  <span className="block text-[10px] text-stone-400 font-normal">Sales register &amp; 58mm printer</span>
                </div>
              </div>
              {currentRole === 'CASHIER' && <Check size={14} className="text-amber-400" />}
            </button>

            {/* Store Manager */}
            <button
              type="button"
              onClick={() => handleSelectRole('MANAGER')}
              className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                currentRole === 'MANAGER'
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-white font-bold'
                  : 'bg-stone-950/60 border-stone-800 hover:bg-emerald-950/30 text-stone-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck size={15} className="text-emerald-400" />
                <div>
                  <span className="block text-xs font-bold text-white">Store Manager</span>
                  <span className="block text-[10px] text-stone-400 font-normal">Stock counts, labels, sales report</span>
                </div>
              </div>
              {currentRole === 'MANAGER' && <Check size={14} className="text-emerald-400" />}
            </button>

            {/* Admin (Owner) */}
            <button
              type="button"
              onClick={() => handleSelectRole('ADMIN')}
              className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                currentRole === 'ADMIN'
                  ? 'bg-amber-950/70 border-amber-500/60 text-white font-bold'
                  : 'bg-stone-950/60 border-stone-800 hover:bg-amber-950/30 text-stone-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-amber-400" />
                <div>
                  <span className="block text-xs font-bold text-white">Store Owner (Admin)</span>
                  <span className="block text-[10px] text-stone-400 font-normal">Full P&amp;L, net margin, RBZ bank rate</span>
                </div>
              </div>
              {currentRole === 'ADMIN' && <Check size={14} className="text-amber-400" />}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white rounded-xl font-bold text-xs transition-colors cursor-pointer text-center"
        >
          Close Menu
        </button>
      </div>
    </>
  );
};
