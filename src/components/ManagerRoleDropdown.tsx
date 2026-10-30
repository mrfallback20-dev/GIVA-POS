import React from 'react';
import { Shield, UserCheck, Check, X } from 'lucide-react';
import { UserRole } from '../utils/role-access';
import { showToast } from '../utils/toast';

interface ManagerRoleDropdownProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dedicated Role Dropdown for GIVA Mobile Store Manager.
 * STRICTLY FOR STORE MANAGER AND ADMIN ONLY.
 * No cashiers in this dropdown!
 * Fitted nicely to screen width with clean touch targets.
 */
export const ManagerRoleDropdown: React.FC<ManagerRoleDropdownProps> = ({
  currentRole,
  onSelectRole,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleRoleClick = (role: UserRole) => {
    try {
      sessionStorage.setItem('giva_mobile_auth', role);
      localStorage.setItem('giva_active_role', role);
    } catch {}
    onSelectRole(role);
    showToast(
      role === 'ADMIN'
        ? 'Switched to Admin (Store Owner) mode'
        : 'Switched to Store Manager mode',
      'success'
    );
    onClose();
  };

  return (
    <>
      {/* Click-away backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-0 top-full mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl z-50 text-stone-100 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
        {/* Header: Store Management Roles Only */}
        <div className="p-2.5 bg-stone-950 border-b border-stone-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield size={14} className="text-emerald-400" />
            <span className="font-bold text-stone-200 text-xs">Manager &amp; Owner Access</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>

        {/* Roles List: Store Manager & Admin Only */}
        <div className="p-1.5 space-y-1">
          {/* Admin / Store Owner */}
          <button
            type="button"
            onClick={() => handleRoleClick('ADMIN')}
            className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start justify-between ${
              currentRole === 'ADMIN'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'hover:bg-stone-800 text-stone-300'
            }`}
          >
            <div className="flex items-start gap-2">
              <Shield size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-white flex items-center gap-1.5">
                  <span>Admin (Store Owner)</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded font-mono">
                    Full Access
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Bank rates, gross margin, all P&amp;L reports, stock audit &amp; staff
                </p>
              </div>
            </div>
            {currentRole === 'ADMIN' && (
              <Check size={14} className="text-amber-400 shrink-0 ml-1 mt-0.5" />
            )}
          </button>

          {/* Store Manager */}
          <button
            type="button"
            onClick={() => handleRoleClick('MANAGER')}
            className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start justify-between ${
              currentRole === 'MANAGER'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'hover:bg-stone-800 text-stone-300'
            }`}
          >
            <div className="flex items-start gap-2">
              <UserCheck size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-white flex items-center gap-1.5">
                  <span>Store Manager</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-400/20 text-emerald-300 rounded font-mono">
                    Operations
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Stock adjustments, daily inventory check, product catalog &amp; pricing
                </p>
              </div>
            </div>
            {currentRole === 'MANAGER' && (
              <Check size={14} className="text-emerald-400 shrink-0 ml-1 mt-0.5" />
            )}
          </button>
        </div>

        {/* Footer Note */}
        <div className="p-2 bg-stone-950/40 border-t border-stone-800/60 text-[10px] text-stone-500 text-center">
          Tap above to switch between Owner &amp; Manager view
        </div>
      </div>
    </>
  );
};
