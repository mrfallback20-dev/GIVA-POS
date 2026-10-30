import React from 'react';
import { Printer } from 'lucide-react';

interface DeviceFrameProps {
  type: 'Q3_POS' | 'SMARTPHONE';
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  onFireLaser?: () => void;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  type,
  title,
  subtitle,
  badge,
  children,
  onFireLaser,
}) => {
  if (type === 'Q3_POS') {
    return (
      <div className="flex flex-col items-center justify-center p-2 sm:p-4 w-full h-full">
        {/* Hardware Shell: Clean Q3 Handheld Android Terminal without battery/network clutter */}
        <div className="w-full max-w-[430px] h-[860px] max-h-[96vh] rounded-[38px] bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 p-2.5 shadow-2xl border-4 border-stone-800 flex flex-col relative select-none">
          {/* Top Thermal Printer Chamber */}
          <div className="w-full bg-stone-900/90 rounded-2xl p-2 mb-2 border border-stone-800 shadow-inner flex flex-col items-center relative">
            {/* Paper feed slot */}
            <div className="w-44 h-1.5 bg-stone-950 rounded-full border border-stone-700/80 shadow-inner mb-1 flex items-center justify-center">
              <div className="w-36 h-0.5 bg-stone-800 rounded-full" />
            </div>

            <div className="flex items-center justify-between w-full px-2 text-[10px] text-stone-400 font-mono">
              <span className="flex items-center gap-1.5 font-bold tracking-wider text-amber-400">
                <Printer className="w-3 h-3 text-emerald-400" />
                <span>58mm ESC/POS</span>
              </span>

              {onFireLaser && (
                <button
                  type="button"
                  onClick={onFireLaser}
                  className="px-2 py-0.5 rounded bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-300 text-[9px] font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                  title="Simulate hardware red-laser barcode scan trigger"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  LASER SCAN
                </button>
              )}

              <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[9px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                PRINTER READY
              </span>
            </div>
          </div>

          {/* Android Touchscreen Display - Full Screen with smooth 2D scrolling */}
          <div className="flex-1 rounded-2xl bg-white flex flex-col relative border border-stone-800 shadow-lg min-h-0 overflow-hidden">
            <div className="flex-1 overflow-x-auto overflow-y-auto scroll-smooth overscroll-contain touch-pan-x touch-pan-y relative flex flex-col h-full w-full">
              {children}
            </div>
          </div>

          {/* Bottom hardware bezel */}
          <div className="mt-2 flex items-center justify-between px-4 py-0.5 text-stone-500 text-[9px] font-mono">
            <span className="tracking-widest font-bold text-stone-400">Q3 SMART TERMINAL</span>
            <div className="flex items-center gap-5">
              <div className="w-3 h-3 border-2 border-stone-600 rounded-xs" />
              <div className="w-3 h-3 border-2 border-stone-600 rounded-full" />
              <div className="w-3 h-3 border-2 border-stone-600 rotate-45" />
            </div>
            <span className="text-stone-500 font-semibold">POS #01</span>
          </div>
        </div>
      </div>
    );
  }

  // Smartphone Frame
  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 w-full h-full">
      <div className="w-full max-w-[420px] h-[860px] max-h-[96vh] rounded-[48px] bg-stone-950 p-2.5 shadow-2xl border-4 border-stone-700/80 flex flex-col relative">
        {/* Smartphone Screen - clean */}
        <div className="flex-1 rounded-[38px] bg-stone-900 flex flex-col relative border border-stone-800 shadow-inner min-h-0 overflow-hidden">
          {/* Subtle Dynamic Island Notch */}
          <div className="h-6 bg-stone-950 flex items-center justify-center shrink-0">
            <div className="w-20 h-4 bg-black rounded-full border border-stone-800" />
          </div>

          {/* Screen Content - Smooth 2-way scrolling (left, right, up, down) */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scroll-smooth overscroll-contain touch-pan-x touch-pan-y relative flex flex-col h-full w-full">
            {children}
          </div>

          {/* Bottom Home Indicator */}
          <div className="h-4 bg-stone-950 flex items-center justify-center shrink-0">
            <div className="w-28 h-1 bg-stone-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
