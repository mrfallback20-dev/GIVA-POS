import React, { useState, useEffect } from 'react';
import { User, Lock, KeyRound, Check, AlertCircle, LogIn, UserPlus, ArrowLeft, ShieldCheck } from 'lucide-react';
import { playScanBeep, playCheckoutSuccessSound, playErrorBuzzer } from '../utils/audio';

interface CashierLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (cashierName: string) => void;
  initialCashierName?: string;
}

export const CashierLoginModal: React.FC<CashierLoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  initialCashierName,
}) => {
  // Check if a cashier is already configured on this terminal
  const [hasExistingProfile, setHasExistingProfile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('giva_q3_cashier_registered') === 'true';
    }
    return false;
  });

  const [isRegistering, setIsRegistering] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('giva_q3_cashier_registered') !== 'true';
    }
    return true;
  });

  const [name, setName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('giva_q3_cashier_name') || initialCashierName || 'Cathy';
    }
    return initialCashierName || 'Cathy';
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      const registered = localStorage.getItem('giva_q3_cashier_registered') === 'true';
      setHasExistingProfile(registered);
      if (!registered) {
        setIsRegistering(true);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeypadPress = (val: string) => {
    playScanBeep();
    setErrorMessage('');
    if (isRegistering) {
      if (password.length < 4) {
        setPassword((prev) => prev + val);
      } else if (confirmPassword.length < 4) {
        setConfirmPassword((prev) => prev + val);
      }
    } else {
      if (password.length < 8) {
        setPassword((prev) => prev + val);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMessage('');
    if (isRegistering && confirmPassword.length > 0) {
      setConfirmPassword((prev) => prev.slice(0, -1));
    } else {
      setPassword((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setPassword('');
    setConfirmPassword('');
    setErrorMessage('');
  };

  const handleRegisterSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      playErrorBuzzer();
      setErrorMessage('Please enter the cashier name.');
      return;
    }

    if (password.length < 4) {
      playErrorBuzzer();
      setErrorMessage('Please enter a 4-digit PIN.');
      return;
    }

    if (password !== confirmPassword) {
      playErrorBuzzer();
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setErrorMessage('PINs do not match. Please re-enter.');
      return;
    }

    // Save newly created cashier credentials
    try {
      localStorage.setItem('giva_q3_cashier_name', cleanName);
      localStorage.setItem('giva_q3_cashier_pin', password);
      localStorage.setItem('giva_q3_cashier_registered', 'true');
      sessionStorage.setItem('giva_q3_cashier_active', 'true');
    } catch {}

    playCheckoutSuccessSound();
    onLoginSuccess(cleanName);
  };

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      playErrorBuzzer();
      setErrorMessage('Please enter the cashier name.');
      return;
    }

    const savedPin = localStorage.getItem('giva_q3_cashier_pin') || '1234';

    // Verify PIN against saved credential or default 1234
    if (password === savedPin || password === '1234') {
      playCheckoutSuccessSound();
      setErrorMessage('');
      try {
        localStorage.setItem('giva_q3_cashier_name', cleanName);
        sessionStorage.setItem('giva_q3_cashier_active', 'true');
      } catch {}
      onLoginSuccess(cleanName);
    } else {
      playErrorBuzzer();
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setErrorMessage(`Incorrect PIN. (Default PIN: ${savedPin})`);
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
            {isRegistering ? <UserPlus size={22} /> : <User size={22} />}
          </div>
          <div className="pt-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-mono">
              Q3 SMART POS TERMINAL
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white pt-0.5">
            {isRegistering ? 'Create Cashier Credentials' : 'Cashier Sign In'}
          </h2>
          <p className="text-xs text-stone-400">
            {isRegistering
              ? 'Set up cashier name and 4-digit security PIN for this terminal'
              : 'Enter your 4-digit PIN to start sales session'}
          </p>
        </div>

        {/* Existing Profile Switcher */}
        {hasExistingProfile && (
          <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setErrorMessage('');
                setPassword('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer text-center ${
                !isRegistering ? 'bg-amber-600 text-white font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setErrorMessage('');
                setPassword('');
                setConfirmPassword('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer text-center ${
                isRegistering ? 'bg-amber-600 text-white font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              New Cashier
            </button>
          </div>
        )}

        {/* Registration Form */}
        {isRegistering ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-bold text-stone-300 block">
                Cashier Full Name
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

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-stone-300 block">
                  Choose 4-Digit PIN
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={password}
                  onChange={(e) => {
                    setErrorMessage('');
                    setPassword(e.target.value.replace(/\D/g, '').slice(0, 4));
                  }}
                  placeholder="••••"
                  className="w-full py-2 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-center text-base font-mono tracking-widest text-amber-300 placeholder-stone-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-stone-300 block">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={confirmPassword}
                  onChange={(e) => {
                    setErrorMessage('');
                    setConfirmPassword(e.target.value.replace(/\D/g, '').slice(0, 4));
                  }}
                  placeholder="••••"
                  className="w-full py-2 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-center text-base font-mono tracking-widest text-amber-300 placeholder-stone-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Touch Keypad */}
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
                className="py-2.5 rounded-xl bg-stone-800/40 hover:bg-stone-700 text-stone-400 hover:text-white font-bold text-xs uppercase cursor-pointer"
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
                className="py-2.5 rounded-xl bg-stone-800/40 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                &#9003;
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <ShieldCheck size={16} />
              <span>Save &amp; Start Cashier Shift</span>
            </button>
          </form>
        ) : (
          /* Sign In Form */
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-bold text-stone-300 block">
                Cashier
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
                  placeholder="Cashier Name"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-sm font-semibold text-white placeholder-stone-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[11px] font-bold text-stone-300 block">
                Enter Security PIN
              </label>
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
                  placeholder="••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-center text-lg font-mono tracking-widest text-amber-300 placeholder-stone-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Touch Keypad */}
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
                className="py-2.5 rounded-xl bg-stone-800/40 hover:bg-stone-700 text-stone-400 hover:text-white font-bold text-xs uppercase cursor-pointer"
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
                className="py-2.5 rounded-xl bg-stone-800/40 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                &#9003;
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <LogIn size={16} />
              <span>Sign In as Cashier</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
