import React, { useState, useEffect } from 'react';
import { User, Lock, KeyRound, Check, AlertCircle, Sparkles, LogIn, Delete } from 'lucide-react';
import { playScanBeep, playCheckoutSuccessSound, playErrorBuzzer } from '../utils/audio';

interface CashierLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (cashierName: string) => void;
  initialCashierName?: string;
}

export const CashierLoginModal: React.FC<CashierLoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  initialCashierName = 'Cathy',
}) => {
  const [name, setName] = useState(initialCashierName);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMessage('');
      if (!name) setName('Cathy');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeypadPress = (val: string) => {
    playScanBeep();
    setErrorMessage('');
    if (password.length < 8) {
      setPassword((prev) => prev + val);
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

  const handleQuickFillCathy = () => {
    setName('Cathy');
    setPassword('1234');
    setErrorMessage('');
    playScanBeep();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      playErrorBuzzer();
      setErrorMessage('Please enter the Cashier’s name.');
      return;
    }

    // Cashier password is 1234
    if (password === '1234') {
      playCheckoutSuccessSound();
      setErrorMessage('');
      try {
        localStorage.setItem('giva_q3_cashier_name', cleanName);
        localStorage.setItem('giva_q3_cashier_logged_in', 'true');
      } catch (err) {}
      onLoginSuccess(cleanName);
    } else {
      playErrorBuzzer();
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setErrorMessage('Incorrect password. Default password is 1234');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
      <div
        className={`bg-stone-900 border border-stone-800 text-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 transition-transform ${
          shake ? 'animate-bounce' : 'animate-in fade-in zoom-in-95 duration-200'
        }`}
      >
        {/* Terminal Header Info */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
            <User size={24} />
          </div>
          <div className="pt-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-mono">
              Q3 SMART POS TERMINAL #01
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white pt-0.5">
            Cashier Sign In
          </h2>
          <p className="text-xs text-stone-400">
            Enter Cashier Name and Password to start sales session
          </p>
        </div>

        {/* Quick Fill Cathy Button */}
        <div className="bg-stone-950/80 p-2.5 rounded-2xl border border-stone-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              C
            </div>
            <div className="text-left leading-tight">
              <span className="text-xs font-bold text-stone-200 block">Default Cashier: Cathy</span>
              <span className="text-[10px] text-stone-400 font-mono">Password: 1234</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickFillCathy}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
          >
            <Sparkles size={12} />
            <span>Auto Fill</span>
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Cashier Name */}
          <div className="space-y-1 text-left">
            <label className="text-[11px] font-bold text-stone-300 block">
              Cashier's Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <User size={15} />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cathy"
                className="w-full pl-9 pr-3 py-2.5 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-sm font-semibold text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Cashier Password */}
          <div className="space-y-1 text-left">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-stone-300">
                Password (PIN)
              </label>
              <span className="text-[10px] font-mono text-amber-400">
                Default: 1234
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Lock size={15} />
              </div>
              <input
                type="password"
                required
                maxLength={8}
                value={password}
                onChange={(e) => {
                  setErrorMessage('');
                  setPassword(e.target.value);
                }}
                placeholder="Enter 1234"
                className="w-full pl-9 pr-3 py-2.5 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-sm font-mono tracking-widest text-amber-300 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-center text-lg"
              />
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* On-screen Q3 Touch Keypad for Handheld Terminal Convenience */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="py-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 active:bg-amber-600 font-mono text-base font-bold text-white transition-all cursor-pointer shadow-xs"
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
              className="py-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 active:bg-amber-600 font-mono text-base font-bold text-white transition-all cursor-pointer shadow-xs"
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
            className="w-full mt-2 py-3 px-4 bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition-all cursor-pointer"
          >
            <LogIn size={16} />
            <span>Sign In as Cashier</span>
          </button>
        </form>

        <div className="text-center text-[10px] text-stone-500">
          Role: Cashier • GIVA Living & Baby POS Station
        </div>
      </div>
    </div>
  );
};
