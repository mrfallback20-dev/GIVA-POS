import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Zap, Barcode, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { playScanBeep, playErrorBuzzer } from '../utils/audio';

interface BarcodeScannerModalProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  products,
  isOpen,
  onClose,
  onScan,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Categories list
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = activeCategoryFilter === 'All'
    ? products
    : products.filter((p) => p.category === activeCategoryFilter);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setManualCode('');
      setCameraError(null);
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access error or unsupported:', err);
      setCameraError('Camera access unavailable. Use laser barcode buttons or manual entry.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleScanSubmit = (codeToScan?: string) => {
    const code = (codeToScan || manualCode).trim();
    if (!code) return;

    const matched = products.find((p) => p.barcode === code);
    if (matched) {
      playScanBeep();
      onScan(code);
      onClose();
    } else {
      playErrorBuzzer();
      alert(`Barcode "${code}" not found in catalog.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-stone-900 px-4 py-3 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Barcode className="text-amber-400" size={20} />
            <h2 className="text-sm font-bold tracking-wide">Q3 Smart Barcode Scanner</h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Laser Scanner Viewfinder Simulation / Camera */}
          <div className="relative rounded-xl overflow-hidden bg-stone-950 border-2 border-stone-800 h-44 sm:h-52 flex flex-col items-center justify-center text-center p-4">
            {isCameraActive ? (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-stone-400 space-y-2 z-10">
                <div className="w-12 h-12 rounded-full bg-stone-800/80 flex items-center justify-center text-amber-400">
                  <Zap size={24} className="animate-pulse" />
                </div>
                <div className="text-xs font-semibold text-stone-200">
                  Optical Laser & Camera Viewfinder
                </div>
                <p className="text-[11px] text-stone-400 max-w-xs">
                  Aligned for standard Code 128 & EAN-13 barcodes
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium border border-stone-700 cursor-pointer"
                >
                  <Camera size={14} />
                  <span>Enable Physical Camera</span>
                </button>
              </div>
            )}

            {/* Red Laser Scanning Beam Effect */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse z-20 pointer-events-none" />
            <div className="absolute inset-x-12 top-1/3 bottom-1/3 border-2 border-dashed border-rose-400/60 rounded-lg pointer-events-none z-20" />

            {isCameraActive && (
              <button
                type="button"
                onClick={stopCamera}
                className="absolute top-2 right-2 bg-stone-900/80 text-white p-1.5 rounded-lg text-xs flex items-center gap-1 z-30"
              >
                <X size={12} />
                <span>Stop Camera</span>
              </button>
            )}
          </div>

          {cameraError && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
              <AlertCircle size={14} className="shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Quick Manual / Wedge Scanner Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScanSubmit();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
              <input
                type="text"
                placeholder="Scan or type barcode (e.g. 6001001001)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              Scan Key
            </button>
          </form>

          {/* Rapid Test Catalog: Click to Instant-Scan items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                1-Tap Barcode Simulator ({filteredProducts.length})
              </span>
              <span className="text-[10px] text-stone-500">Tap item to trigger scan</span>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-2 py-1 rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                    activeCategoryFilter === cat
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  {cat.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="max-h-48 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl bg-white shadow-xs">
              {filteredProducts.slice(0, 15).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleScanSubmit(p.barcode)}
                  className="w-full text-left p-2.5 hover:bg-amber-50/60 flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-6 h-6 rounded-md bg-stone-100 text-stone-600 flex items-center justify-center font-mono text-[10px] shrink-0 border border-stone-200">
                      |||
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-medium text-stone-900 truncate group-hover:text-amber-800">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-stone-500 font-mono">
                        {p.barcode} • {p.sizeVariant || p.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <span className="text-xs font-bold text-emerald-700">
                      ${p.sellingPriceUsd} • ZiG {(p.sellingPriceUsd * 27.5).toFixed(0)}
                    </span>
                    <p className="text-[10px] text-stone-400">Stock: {p.stockQuantity}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
