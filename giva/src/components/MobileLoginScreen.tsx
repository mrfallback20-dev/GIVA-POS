import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, LogIn, Delete, AlertCircle, ArrowLeft } from 'lucide-react';
import { UserRole, USER_ROLES, verifyPin } from '../utils/role-access';
import { playScanBeep, playCheckoutSuccessSound, playErrorBuzzer } from '../utils/audio';

interface MobileLoginScreenProps {
  onLoginSuccess: (role: 'ADMIN' | 'MANAGER') => void;
  onBackToAppSelector?: () => void;
}

export const MobileLoginScreen: React.FC<MobileLoginScreenProps> = ({
  onLoginSuccess,
  onBackToAppSelector,
}) => {
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'MANAGER'>('MANAGER');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);

  // Retrieve any custom pins saved by user, otherwise uses defaults (Admin: 2026, Manager: 1984)
  const getCustomPins = () => {
    try {
      const saved = localStorage.getItem('giva_custom_role_pins');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      ADMIN: USER_ROLES.ADMIN.defaultPin,
      MANAGER: USER_ROLES.MANAGER.defaultPin,
    };
  };

  const handleRoleSelect = (role: 'ADMIN' | 'MANAGER') => {
    setSelectedRole(role);
    setPassword('');
    setErrorMessage('');
    playScanBeep();
  };

  const handleKeypadPress = (digit: string) => {
    if (password.length < 8) {
      playScanBeep();
      setErrorMessage('');
      setPassword((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setErrorMessage('');
    setPassword((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPassword('');
    setErrorMessage('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!password.trim()) {
      playErrorBuzzer();
      setErrorMessage('Please enter your security password.');
      return;
    }

    const customPins = getCustomPins();
    const isValid = verifyPin(selectedRole, password.trim(), customPins);

    if (isValid) {
      playCheckoutSuccessSound();
      try {
        sessionStorage.setItem('giva_mobile_auth', selectedRole);
        localStorage.setItem('giva_active_role', selectedRole);
      } catch (err) {}
      onLoginSuccess(selectedRole);
    } else {
      playErrorBuzzer();
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setErrorMessage('Invalid credentials. Access denied.');
      setPassword('');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-stone-950 text-white items-center justify-center p-3 sm:p-6 overflow-y-auto select-none">
      <div
        className={`max-w-sm w-full bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 ${
          shake ? 'animate-bounce' : 'animate-in fade-in zoom-in-95 duration-200'
        }`}
      >
        {/* Back navigation button if app launcher exists */}
        {onBackToAppSelector && (
          <button
            type="button"
            onClick={onBackToAppSelector}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Switch App</span>
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
            <Lock size={22} />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono inline-block">
            GIVA MOBILE STORE MANAGER
          </span>
          <h2 className="text-xl font-black tracking-tight text-white pt-0.5">
            Management Sign In
          </h2>
          <p className="text-xs text-stone-400">
            Sign in with Administrator or Store Manager credentials
          </p>
        </div>

        {/* Role Credentials Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-stone-300 block">
            Select Credential Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleRoleSelect('MANAGER')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                selectedRole === 'MANAGER'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-xs ring-1 ring-emerald-500/40'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-850 hover:text-stone-300'
              }`}
            >
              <UserCheck size={18} className={selectedRole === 'MANAGER' ? 'text-emerald-400' : 'text-stone-400'} />
              <span className="text-xs font-bold">Store Manager</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('ADMIN')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                selectedRole === 'ADMIN'
                  ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-xs ring-1 ring-amber-500/40'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-850 hover:text-stone-300'
              }`}
            >
              <ShieldCheck size={18} className={selectedRole === 'ADMIN' ? 'text-amber-400' : 'text-stone-400'} />
              <span className="text-xs font-bold">Admin (Owner)</span>
            </button>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Password Input: STRICTLY MASKED (type="password"), NO SHOW PASSWORD BUTTONS OR REVEAL OPTIONS */}
          <div className="space-y-1 text-left">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-stone-300">
                Security Password
              </label>
              <span className="text-[10px] font-mono text-stone-500 flex items-center gap-1">
                <Lock size={10} />
                <span>Protected</span>
              </span>
            </div>

            <div className="relative">
              <input
                type="password"
                required
                maxLength={8}
                value={password}
                onChange={(e) => {
                  setErrorMessage('');
                  setPassword(e.target.value);
                }}
                placeholder="••••"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-emerald-500 rounded-xl text-lg font-mono font-bold tracking-widest text-emerald-300 placeholder-stone-700 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Masked PIN Indicators */}
          <div className="flex justify-center gap-2.5 py-0.5">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  password.length > idx
                    ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-xs shadow-emerald-400/50'
                    : 'bg-stone-800 border-stone-700'
                }`}
              />
            ))}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-center gap-2">
              <AlertCircle size={14} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Touch Keypad for Handheld Phone Entry */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="py-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 active:bg-emerald-600 font-mono text-base font-bold text-white transition-all cursor-pointer shadow-xs"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="py-2.5 rounded-xl bg-stone-800/50 hover:bg-stone-800 active:bg-stone-700 text-stone-400 text-xs font-bold transition-all cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 active:bg-emerald-600 font-mono text-base font-bold text-white transition-all cursor-pointer shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-2.5 rounded-xl bg-stone-800/50 hover:bg-stone-800 active:bg-stone-700 text-stone-400 flex items-center justify-center transition-all cursor-pointer"
              aria-label="Backspace"
            >
              <Delete size={18} />
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
          >
            <LogIn size={16} />
            <span>Sign In to Mobile Manager</span>
          </button>
        </form>

        <div className="text-center text-[10px] text-stone-500 font-mono">
          Security: Encrypted Access • No Passwords Revealed
        </div>
      </div>
    </div>
  );
};
