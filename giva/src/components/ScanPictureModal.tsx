import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Barcode,
  Search,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Tag,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { playScanBeep, playCheckoutSuccessSound, playErrorBuzzer } from '../utils/audio';

interface ScanPictureModalProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateProduct: (id: number, data: Partial<Product>) => Promise<void>;
  onCreateWithBarcodeAndImage?: (barcode: string, imageUrl: string) => void;
  initialProduct?: Product | null;
}

export const ScanPictureModal: React.FC<ScanPictureModalProps> = ({
  products,
  isOpen,
  onClose,
  onUpdateProduct,
  onCreateWithBarcodeAndImage,
  initialProduct,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedImage, setScannedImage] = useState<string>('');
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        setSelectedProduct(initialProduct);
        setBarcodeInput(initialProduct.barcode);
        setScannedImage(initialProduct.imageUrl || '');
      } else {
        setSelectedProduct(null);
        setBarcodeInput('');
        setScannedImage('');
      }
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [isOpen, initialProduct]);

  if (!isOpen) return null;

  // Barcode Lookup
  const handleBarcodeSubmit = (codeToLookup: string) => {
    const cleanCode = codeToLookup.trim();
    if (!cleanCode) return;

    const match = products.find((p) => p.barcode === cleanCode);
    if (match) {
      playScanBeep();
      setSelectedProduct(match);
      setBarcodeInput(match.barcode);
      setScannedImage(match.imageUrl || '');
      setErrorMessage('');
    } else {
      playErrorBuzzer();
      setSelectedProduct(null);
      setErrorMessage(`Barcode "${cleanCode}" is not yet in catalog.`);
    }
  };

  // Convert File to compressed Data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image to reasonable resolution for POS performance
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setScannedImage(dataUrl);
          playScanBeep();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePicture = async () => {
    if (!selectedProduct) {
      alert('Please select or scan a product first.');
      return;
    }
    if (!scannedImage) {
      alert('Please take or upload a product picture.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      await onUpdateProduct(selectedProduct.id, { imageUrl: scannedImage });
      playCheckoutSuccessSound();
      setSuccessMessage(`✓ Picture saved to "${selectedProduct.name}"!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      playErrorBuzzer();
      setErrorMessage(err.message || 'Failed to update product picture.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Scan Barcode to Add Picture
              </h2>
              <p className="text-[10px] text-stone-400 font-mono">
                Store Admin &amp; Owner Inventory Camera
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-stone-800">
          {/* Step 1: Scan Barcode */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                1
              </span>
              <span>Scan or Enter Product Barcode</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Scan barcode on shelf or enter code..."
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    setErrorMessage('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBarcodeSubmit(barcodeInput);
                    }
                  }}
                  className="w-full px-3 py-2.5 font-mono text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button
                type="button"
                onClick={() => handleBarcodeSubmit(barcodeInput)}
                className="px-3.5 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Search size={14} />
                <span>Find</span>
              </button>
            </div>
          </div>

          {/* Quick Barcode Selector from Catalog */}
          {!selectedProduct && (
            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-stone-500 block">
                Or pick an item without an image:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {products
                  .filter((p) => !p.imageUrl)
                  .slice(0, 8)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(p);
                        setBarcodeInput(p.barcode);
                        setScannedImage('');
                        playScanBeep();
                      }}
                      className="px-2 py-1 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-stone-200 rounded-lg text-[11px] font-semibold text-stone-700 transition-colors cursor-pointer text-left truncate max-w-[200px]"
                    >
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Error / Not Found with Option to Create New Product */}
          {errorMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-amber-600" />
                <span>{errorMessage}</span>
              </div>
              {onCreateWithBarcodeAndImage && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateWithBarcodeAndImage(barcodeInput, scannedImage);
                  }}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Create New Product with Barcode "{barcodeInput}"
                </button>
              )}
            </div>
          )}

          {/* Step 2: Selected Product Preview */}
          {selectedProduct && (
            <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-800">
                  Target Product Found
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {selectedProduct.barcode}
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-stone-900 leading-snug">
                {selectedProduct.name}
              </h3>
              <p className="text-[11px] text-stone-500">
                {selectedProduct.category} • Current Stock: {selectedProduct.stockQuantity} units
              </p>
            </div>
          )}

          {/* Step 3: Capture / Upload Product Picture */}
          {selectedProduct && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                  2
                </span>
                <span>Snap Photo or Upload Picture</span>
              </label>

              {/* Photo Preview Box */}
              <div className="w-full h-44 rounded-2xl bg-stone-100 border-2 border-dashed border-stone-300 overflow-hidden flex flex-col items-center justify-center relative group">
                {scannedImage ? (
                  <>
                    <img
                      src={scannedImage}
                      alt="Scanned Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setScannedImage('')}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors cursor-pointer"
                      title="Remove Picture"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-stone-400 p-4 text-center space-y-1">
                    <Camera size={36} className="text-stone-300" />
                    <span className="text-xs font-bold text-stone-600">No Photo Selected</span>
                    <span className="text-[10px] text-stone-400">
                      Snap photo directly with phone camera or upload from files
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons for Camera & File Pick */}
              <div className="grid grid-cols-2 gap-2">
                {/* Direct Camera Capture */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-3 px-3 bg-stone-900 hover:bg-black active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <Camera size={16} className="text-amber-400" />
                  <span>Snap Photo</span>
                </button>

                {/* File Upload from Gallery */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-3 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-stone-300 transition-all"
                >
                  <Upload size={16} className="text-stone-600" />
                  <span>Choose File</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Notification */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedProduct || !scannedImage || isSaving}
            onClick={handleSavePicture}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 ${
              !selectedProduct || !scannedImage || isSaving
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98 shadow-emerald-950/20'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>{isSaving ? 'Saving Picture...' : 'Save Picture to Product'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
