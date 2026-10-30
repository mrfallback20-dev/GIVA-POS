import React, { useState, useEffect } from 'react';
import { Shield, UserCheck, Lock, X, Check, AlertCircle, KeyRound } from 'lucide-react';
import { UserRole, USER_ROLES, verifyPin } from '../utils/role-access';
import { playScanBeep, playCheckoutSuccessSound, playErrorBuzzer } from '../utils/audio';

interface RoleAuthModalProps {
  isOpen: boolean;
  targetRole: 'ADMIN' | 'MANAGER';
  onSuccess: (role: 'ADMIN' | 'MANAGER') => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export const RoleAuthModal: React.FC<RoleAuthModalProps> = ({
  isOpen,
  targetRole,
  onSuccess,
  onClose,
  title,
  subtitle,
}) => {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMessage('');
      setShake(false);
    }
  }, [isOpen, targetRole]);

  if (!isOpen) return null;

  const roleInfo = USER_ROLES[targetRole];
  const isTargetAdmin = targetRole === 'ADMIN';

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 8) {
      playScanBeep();
      setErrorMessage('');
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setErrorMessage('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage('');
  };

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      playErrorBuzzer();
      setErrorMessage('Please enter the 4-digit security PIN.');
      return;
    }

    // Check custom pins or default role pin (Admin: 2026, Manager: 1984)
    let customPins: Partial<Record<UserRole, string>> | undefined;
    try {
      const saved = localStorage.getItem('giva_custom_role_pins');
      if (saved) customPins = JSON.parse(saved);
    } catch {}

    const isValid = verifyPin(targetRole, pin.trim(), customPins);

    if (isValid) {
      playCheckoutSuccessSound();
      try {
        sessionStorage.setItem('giva_mobile_auth', targetRole);
        localStorage.setItem('giva_active_role', targetRole);
      } catch {}
      onSuccess(targetRole);
      onClose();
    } else {
      playErrorBuzzer();
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setErrorMessage(`Invalid PIN for ${roleInfo.badge}. Access denied.`);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      <div
        className={`bg-stone-900 text-stone-100 rounded-3xl shadow-2xl max-w-sm w-full border border-stone-800 overflow-hidden flex flex-col ${
          shake ? 'animate-shake ring-2 ring-rose-500' : ''
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isTargetAdmin
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {isTargetAdmin ? <Shield size={18} /> : <UserCheck size={18} />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                {title || `${roleInfo.badge} Authentication`}
              </h2>
              <p className="text-[11px] text-stone-400">
                {subtitle || 'Security PIN required to proceed'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          <div className="text-center space-y-1">
            <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold block">
              Enter 4-Digit Security PIN
            </span>
            {/* PIN Dots Display */}
            <div className="flex items-center justify-center gap-2.5 py-2">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      filled
                        ? isTargetAdmin
                          ? 'bg-amber-400 scale-110 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                          : 'bg-emerald-400 scale-110 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                        : 'border-2 border-stone-700 bg-stone-950'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center gap-2 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle size={14} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Helper Default PIN notice */}
          <div className="p-2 bg-stone-950/70 border border-stone-800/80 rounded-xl text-center">
            <span className="text-[11px] text-stone-400">
              Default PIN:{' '}
              <strong className="text-amber-300 font-mono">
                {isTargetAdmin ? '2026' : '1984'}
              </strong>
            </span>
          </div>

          {/* Touch-Friendly Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="py-3 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 active:scale-95 text-white font-extrabold text-lg rounded-xl transition-all cursor-pointer shadow-xs"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="py-3 bg-stone-800/50 hover:bg-stone-800 text-stone-400 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-3 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 active:scale-95 text-white font-extrabold text-lg rounded-xl transition-all cursor-pointer shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 bg-stone-800/50 hover:bg-stone-800 text-stone-400 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              ⌫
            </button>
          </div>

          {/* Verify Button */}
          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={pin.length === 0}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 ${
              pin.length === 0
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : isTargetAdmin
                ? 'bg-amber-500 hover:bg-amber-400 active:scale-98 text-stone-950 font-extrabold'
                : 'bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold'
            }`}
          >
            <KeyRound size={16} />
            <span>Verify &amp; Enter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
