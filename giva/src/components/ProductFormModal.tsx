import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Barcode as BarcodeIcon,
  Tag,
  DollarSign,
  Layers,
  Camera,
  Upload,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Product } from '../data/inventorySeed';
import { calculateUnitMargin, formatCurrency } from '../utils/pos-logic';
import { BarcodeRenderer } from './BarcodeRenderer';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { playScanBeep } from '../utils/audio';

interface ProductFormModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Partial<Product>) => Promise<void>;
  categories: string[];
  bankRate: number;
  initialBarcode?: string;
  initialImageUrl?: string;
  allProducts?: Product[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
  categories,
  bankRate,
  initialBarcode,
  initialImageUrl,
  allProducts = [],
}) => {
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Baby Creams, Oils & Lotions');
  const [sizeVariant, setSizeVariant] = useState('');
  const [costPriceUsd, setCostPriceUsd] = useState<number>(0);
  const [sellingPriceUsd, setSellingPriceUsd] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setBarcode(product.barcode);
      setCategory(product.category);
      setSizeVariant(product.sizeVariant || '');
      setCostPriceUsd(product.costPrice || 0);
      setSellingPriceUsd(product.sellingPriceUsd || product.sellingPrice || 0);
      setStockQuantity(product.stockQuantity);
      setLowStockThreshold(product.lowStockThreshold || 5);
      setImageUrl(product.imageUrl || '');
    } else {
      const defaultBarcode =
        initialBarcode || `600${Math.floor(1000000 + Math.random() * 9000000)}`;
      setName('');
      setBarcode(defaultBarcode);
      setCategory(categories[0] || 'Baby Creams, Oils & Lotions');
      setSizeVariant('');
      setCostPriceUsd(5.0);
      setSellingPriceUsd(10.0);
      setStockQuantity(12);
      setLowStockThreshold(5);
      setImageUrl(initialImageUrl || '');
    }
  }, [product, isOpen, categories, initialBarcode, initialImageUrl]);

  if (!isOpen) return null;

  const marginUsd = calculateUnitMargin(costPriceUsd, sellingPriceUsd);
  const priceInZig = Number((sellingPriceUsd * bankRate).toFixed(2));
  const costInZig = Number((costPriceUsd * bankRate).toFixed(2));
  const marginInZig = Number((priceInZig - costInZig).toFixed(2));

  const generateBarcode = () => {
    const randomCode = `600${Math.floor(1000000 + Math.random() * 9000000)}`;
    setBarcode(randomCode);
    playScanBeep();
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    setBarcode(scannedCode.trim());
    setIsBarcodeScannerOpen(false);
    playScanBeep();
  };

  // Convert uploaded image to compressed data URL
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > MAX_DIM) {
            h *= MAX_DIM / w;
            w = MAX_DIM;
          }
        } else {
          if (h > MAX_DIM) {
            w *= MAX_DIM / h;
            h = MAX_DIM;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setImageUrl(canvas.toDataURL('image/jpeg', 0.85));
          playScanBeep();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) {
      alert('Product name and barcode are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        barcode: barcode.trim(),
        category,
        sizeVariant: sizeVariant.trim(),
        costPrice: Number(costPriceUsd),
        costPriceUsd: Number(costPriceUsd),
        sellingPrice: Number(sellingPriceUsd),
        sellingPriceUsd: Number(sellingPriceUsd),
        sellingPriceZig: priceInZig,
        stockQuantity: Number(stockQuantity),
        lowStockThreshold: Number(lowStockThreshold) >= 1 ? Number(lowStockThreshold) : 5,
        imageUrl: imageUrl.trim(),
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error saving product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-bold">
                {product ? 'Edit Catalog Product' : 'Add New Inventory Product'}
              </h2>
              <p className="text-xs text-stone-400">
                GIVA Living &amp; Baby Central Inventory Database
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
            {/* Product Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Bennetts Hair & Body Wash"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            {/* Barcode with Scan Barcode Button & Auto-Generate */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-stone-700">Code 128 Barcode *</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera size={13} />
                    <span>Scan Barcode</span>
                  </button>
                  <span className="text-stone-300">|</span>
                  <button
                    type="button"
                    onClick={generateBarcode}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={12} />
                    <span>Auto-Generate</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or enter barcode"
                  className="flex-1 px-3 py-2 font-mono bg-stone-50 border border-stone-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-bold"
                />
                <button
                  type="button"
                  onClick={() => setIsBarcodeScannerOpen(true)}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
                  title="Scan physical barcode with camera"
                >
                  <BarcodeIcon size={14} className="text-stone-600" />
                  <span className="hidden xs:inline">Scan</span>
                </button>
              </div>

              {barcode && (
                <div className="mt-1 p-2 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-center">
                  <BarcodeRenderer value={barcode} width={1.2} height={28} fontSize={10} />
                </div>
              )}
            </div>

            {/* Category and Variant */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Volume / Size / Variant</label>
                <input
                  type="text"
                  placeholder="e.g. 400ml, Size 5, 200x290cm"
                  value={sizeVariant}
                  onChange={(e) => setSizeVariant(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>

            {/* Pricing & Margins in USD with Dynamic ZiG Conversion */}
            <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Cost Price (USD $)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-stone-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPriceUsd}
                    onChange={(e) => setCostPriceUsd(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <span className="text-[10px] text-stone-500 block">
                  ≈ ZiG {costInZig.toFixed(2)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Selling Price (USD $)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-stone-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPriceUsd}
                    onChange={(e) => setSellingPriceUsd(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold text-emerald-800"
                  />
                </div>
                <span className="text-[10px] font-bold text-emerald-700 block">
                  ≈ ZiG {priceInZig.toFixed(2)} (at {bankRate.toFixed(2)})
                </span>
              </div>

              {/* Calculated Margin Pill */}
              <div className="col-span-2 pt-2 text-[11px] flex justify-between items-center text-stone-600 border-t border-stone-200">
                <span>Unit Profit Margin:</span>
                <span className="font-extrabold text-emerald-700">
                  +${marginUsd.unitMargin.toFixed(2)} / +ZiG {marginInZig.toFixed(2)} ({marginUsd.marginPct}%)
                </span>
              </div>
            </div>

            {/* Stock Quantities & Low Stock Alert Level */}
            <div className="grid grid-cols-2 gap-3 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-800">Current Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold"
                />
                <span className="text-[10px] text-stone-500 block">Available units on shelves</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <span>Low Stock Level</span>
                    <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold">Alert</span>
                  </label>
                </div>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900 focus:ring-2 focus:ring-amber-500/40"
                />
                <span className="text-[10px] text-amber-800/80 block">Triggers low stock warnings at or below</span>
              </div>
            </div>

            {/* Product Picture: Camera Snap & File Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">Product Picture</label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Remove Picture
                  </button>
                )}
              </div>

              {/* Preview Box */}
              {imageUrl ? (
                <div className="relative w-full h-36 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : null}

              {/* Camera Snap & File Pick Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={handleImageFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-2.5 px-3 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  <Camera size={15} className="text-amber-400" />
                  <span>Snap Photo</span>
                </button>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-stone-300 active:scale-95 transition-all"
                >
                  <Upload size={15} className="text-stone-600" />
                  <span>Upload File</span>
                </button>
              </div>

              <input
                type="url"
                placeholder="Or paste image URL (https://...)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs"
              />
            </div>

            {/* Footer Action */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Add to Catalog'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Barcode Scanner Modal to scan code with camera into form */}
      <BarcodeScannerModal
        products={allProducts}
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  );
};
