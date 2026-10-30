import React, { useState, useEffect, useRef } from 'react';
import { User, Check, Plus, Trash2, X, Users } from 'lucide-react';
import {
  getSavedCashiers,
  saveCashier,
  removeCashier,
  setActiveCashier,
} from '../utils/cashier-service';
import { showToast } from '../utils/toast';

interface CashierDropdownProps {
  currentCashier: string;
  onSelectCashier: (name: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dedicated Cashier Dropdown for GIVA Q3 Smart POS.
 * STRICTLY FOR CASHIERS ONLY - No Managers, No Admin, No App Switcher.
 * Fits cleanly on mobile screens and terminal viewports.
 */
export const CashierDropdown: React.FC<CashierDropdownProps> = ({
  currentCashier,
  onSelectCashier,
  isOpen,
  onClose,
}) => {
  const [cashiersList, setCashiersList] = useState<string[]>(() => getSavedCashiers());
  const [isAddingCashier, setIsAddingCashier] = useState(false);
  const [newCashierName, setNewCashierName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCashiersList(getSavedCashiers());
      setIsAddingCashier(false);
      setNewCashierName('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isAddingCashier) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isAddingCashier]);

  if (!isOpen) return null;

  const handlePickCashier = (name: string) => {
    setActiveCashier(name);
    onSelectCashier(name);
    showToast(`Active cashier: ${name}`, 'success');
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
    showToast(`Cashier "${clean}" added & active!`, 'success');
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

  return (
    <>
      {/* Click-away backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        ref={dropdownRef}
        className="absolute right-0 top-full mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl z-50 text-stone-100 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header: Cashiers Only */}
        <div className="p-2.5 bg-stone-950 border-b border-stone-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-amber-400" />
            <span className="font-bold text-stone-200 text-xs">Cashier On Duty</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>

        {/* Cashier Roster List */}
        <div className="p-1.5 max-h-56 overflow-y-auto space-y-0.5">
          {cashiersList.map((cashier) => {
            const isCurrent = currentCashier === cashier;
            return (
              <div
                key={cashier}
                onClick={() => handlePickCashier(cashier)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <User
                    size={14}
                    className={isCurrent ? 'text-amber-400 shrink-0' : 'text-stone-500 shrink-0'}
                  />
                  <span className="truncate">{cashier}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isCurrent && <Check size={14} className="text-amber-400" />}
                  {cashiersList.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCashier(e, cashier)}
                      title="Remove cashier"
                      className="opacity-0 group-hover:opacity-100 p-1 text-stone-500 hover:text-rose-400 transition-opacity rounded cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline Add Cashier Form */}
        <div className="p-2 border-t border-stone-800/80 bg-stone-950/50">
          {isAddingCashier ? (
            <form onSubmit={handleAddNewCashier} className="space-y-1.5">
              <input
                ref={inputRef}
                type="text"
                placeholder="Cashier name (e.g. Tendai M.)"
                value={newCashierName}
                onChange={(e) => setNewCashierName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  disabled={!newCashierName.trim()}
                  className="flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold rounded-lg transition-colors cursor-pointer text-center text-xs"
                >
                  Save Cashier
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCashier(false)}
                  className="py-1.5 px-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingCashier(true)}
              className="w-full py-1.5 px-2.5 text-stone-400 hover:text-amber-300 flex items-center justify-center gap-1.5 rounded-lg hover:bg-stone-800/60 transition-colors font-medium text-xs cursor-pointer"
            >
              <Plus size={13} />
              <span>Add New Cashier</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
