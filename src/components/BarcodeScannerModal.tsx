import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Zap, Barcode, Search, AlertCircle, CheckCircle2, Upload, RefreshCw } from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { playScanBeep, playErrorBuzzer } from '../utils/audio';
import { showToast } from '../utils/toast';

interface BarcodeScannerModalProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onScan?: (barcode: string) => void;
  onBarcodeScanned?: (barcode: string) => void;
  currency?: string;
  bankRate?: number;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  products,
  isOpen,
  onClose,
  onScan,
  onBarcodeScanned,
  bankRate = 40.0,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Categories list
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts =
    activeCategoryFilter === 'All'
      ? products
      : products.filter((p) => p.category === activeCategoryFilter);

  // When modal opens, auto-attempt camera
  useEffect(() => {
    if (isOpen) {
      setManualCode('');
      setCameraError(null);
      // Auto-start camera
      startCamera();
    } else {
      stopCamera();
      setManualCode('');
      setCameraError(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Live video stream not supported on this browser. Use Camera Snap or quick tap.');
        setIsCameraActive(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        startBarcodeDetection();
      } else {
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access unavailable:', err);
      setCameraError('Camera access unavailable or blocked. Tap "Snap Photo" or use quick code tap below.');
      setIsCameraActive(false);
    }
  };

  const startBarcodeDetection = () => {
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a'],
        });

        const checkFrame = async () => {
          if (!videoRef.current || !streamRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const detected = barcodes[0].rawValue;
              if (detected) {
                handleScanSubmit(detected);
                return;
              }
            }
          } catch (e) {}
          animFrameRef.current = requestAnimationFrame(checkFrame);
        };
        animFrameRef.current = requestAnimationFrame(checkFrame);
      } catch (e) {}
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const triggerNotify = (code: string) => {
    if (onScan) onScan(code);
    if (onBarcodeScanned) onBarcodeScanned(code);
  };

  const handleScanSubmit = (codeToScan?: string) => {
    const code = (codeToScan || manualCode).trim();
    if (!code) return;

    const matched = products.find((p) => p.barcode === code);
    if (matched) {
      playScanBeep();
      triggerNotify(code);
      showToast(`Scanned: ${matched.name} (${code})`, 'success');
      onClose();
    } else {
      playErrorBuzzer();
      showToast(`Barcode "${code}" not found in inventory catalog.`, 'warning');
    }
  };

  // Handle Photo file or camera snap capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturingPhoto(true);
    showToast('Analyzing captured photo for barcode...', 'info');

    // Attempt detection via BarcodeDetector API on image bitmap
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a'],
        });
        createImageBitmap(file).then(async (bitmap) => {
          const detectedBarcodes = await detector.detect(bitmap);
          setIsCapturingPhoto(false);
          if (detectedBarcodes && detectedBarcodes.length > 0) {
            const rawVal = detectedBarcodes[0].rawValue;
            if (rawVal) {
              handleScanSubmit(rawVal);
              return;
            }
          }
          // If no barcode detected automatically in the photo, prompt with first catalog item or search
          showToast('Photo captured. Select product barcode from list below.', 'info');
        }).catch(() => {
          setIsCapturingPhoto(false);
          showToast('Photo captured. Select product barcode from list below.', 'info');
        });
        return;
      } catch (err) {}
    }

    setIsCapturingPhoto(false);
    showToast('Photo captured! Tap product to register scan.', 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-stone-900 px-4 py-3 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Barcode className="text-amber-400" size={20} />
            <h2 className="text-sm font-bold tracking-wide">Q3 Barcode &amp; Camera Scanner</h2>
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
        <div className="p-4 overflow-y-auto space-y-3.5">
          {/* Laser Scanner Viewfinder Simulation / Camera */}
          <div className="relative rounded-2xl overflow-hidden bg-stone-950 border-2 border-stone-800 h-44 sm:h-52 flex flex-col items-center justify-center text-center p-4">
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
                <div className="w-12 h-12 rounded-full bg-stone-800/80 flex items-center justify-center text-amber-400 shadow-inner">
                  <Zap size={24} className="animate-pulse" />
                </div>
                <div className="text-xs font-bold text-stone-200">
                  Optical Laser &amp; Camera Scanner
                </div>
                <p className="text-[11px] text-stone-400 max-w-xs">
                  Ready for GIVA product barcodes (Code 128 &amp; EAN-13)
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg text-xs font-bold border border-stone-700 cursor-pointer shadow-xs transition-colors"
                  >
                    <RefreshCw size={13} />
                    <span>Start Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    <Camera size={13} />
                    <span>Snap Photo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Red Laser Scanning Beam Effect */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse z-20 pointer-events-none" />
            <div className="absolute inset-x-12 top-1/3 bottom-1/3 border-2 border-dashed border-rose-400/60 rounded-lg pointer-events-none z-20" />

            {isCameraActive && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 z-30">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Snap photo with camera"
                >
                  <Camera size={12} />
                  <span>Snap</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-stone-900/90 hover:bg-black text-white p-1.5 rounded-lg text-xs flex items-center gap-1 border border-stone-700 cursor-pointer"
                >
                  <X size={12} />
                  <span>Stop</span>
                </button>
              </div>
            )}
          </div>

          {/* Hidden Direct Camera & File Inputs */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            onChange={handlePhotoCapture}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePhotoCapture}
            className="hidden"
          />

          {cameraError && (
            <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-amber-600" />
                <span>{cameraError}</span>
              </div>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shrink-0 ml-2 cursor-pointer"
              >
                Snap Photo
              </button>
            </div>
          )}

          {/* Manual Barcode Input */}
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
                placeholder="Scan or type barcode (e.g. 6001001)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-semibold"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Scan
            </button>
          </form>

          {/* Quick-Tap Barcode Simulator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Tap to Simulate Barcode Scan ({filteredProducts.length})
              </span>
              <span className="text-[10px] text-stone-500">Instant add to sale</span>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap cursor-pointer transition-colors text-xs font-medium ${
                    activeCategoryFilter === cat
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products quick barcode buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {filteredProducts.slice(0, 15).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    handleScanSubmit(p.barcode);
                  }}
                  className="p-2 text-left bg-stone-50 hover:bg-amber-50 hover:border-amber-400 border border-stone-200 rounded-xl text-xs transition-colors cursor-pointer flex flex-col justify-between group active:scale-95"
                >
                  <div className="font-bold text-stone-800 line-clamp-1 group-hover:text-amber-900">
                    {p.name}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-stone-500">
                    <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-stone-200 font-bold text-stone-700">
                      {p.barcode}
                    </span>
                    <span className="font-bold text-emerald-700">
                      ${p.sellingPriceUsd.toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-4 py-2.5 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500 shrink-0">
          <span className="text-[11px]">GIVA Living &amp; Baby Q3 Hardware Scanner Engine</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
