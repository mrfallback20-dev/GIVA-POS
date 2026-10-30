import React, { useState, useEffect } from 'react';
import {
  Printer,
  Check,
  Copy,
  X,
  Share2,
  Sparkles,
  Coins,
  Bluetooth,
  Send,
  Download,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { BarcodeRenderer } from './BarcodeRenderer';
import { formatCurrency, CurrencyType } from '../utils/pos-logic';
import {
  printReceiptSlip,
  printReceiptBluetooth,
  formatThermalReceiptAscii,
  openWhatsAppReceipt,
} from '../utils/print-service';

export interface ReceiptData {
  receiptNo: string;
  storeName: string;
  tagline: string;
  timestamp: string;
  paymentMethod: string;
  items: {
    productId: number;
    barcode: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  totalAmount: number;
  currency: CurrencyType;
  bankRate: number;
  amountTendered: number;
  changeAmount: number;
  cashierName?: string;
}

interface ThermalReceiptModalProps {
  receipt: ReceiptData | null;
  onClose: () => void;
  autoPrint?: boolean;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  receipt,
  onClose,
  autoPrint = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [btStatus, setBtStatus] = useState<string | null>(null);
  const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');

  // Auto-print upon initial modal display immediately if enabled
  useEffect(() => {
    if (receipt && autoPrint) {
      handlePrint();
    }
  }, [receipt, autoPrint]);

  if (!receipt) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printReceiptSlip(receipt);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleBluetoothPrint = async () => {
    setBtStatus('Connecting to 58mm printer...');
    const result = await printReceiptBluetooth(receipt);
    setBtStatus(result.message);
    setTimeout(() => setBtStatus(null), 5000);
  };

  const formattedReceiptText = formatThermalReceiptAscii(receipt);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedReceiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    openWhatsAppReceipt(receipt, customerPhone);
    setShowWhatsAppInput(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Terminal Header */}
        <div className="bg-stone-900 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase text-stone-200">
              58mm Thermal Receipt
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white transition-colors p-1 rounded-lg cursor-pointer"
            aria-label="Close receipt"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Printing Status Banner */}
        <div className="bg-amber-500/10 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-[11px] text-amber-950 font-medium">
          <div className="flex items-center gap-1.5">
            <Printer size={13} className="text-amber-700" />
            <span>Standard 58mm Thermal Roll (Android Q3 &amp; ESC/POS)</span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
            Ready
          </span>
        </div>

        {/* 58mm Thermal Paper Roll Visual Container */}
        <div className="p-4 bg-stone-100 flex flex-col items-center max-h-[55vh] overflow-y-auto">
          {/* Paper roll slit simulator */}
          <div className="w-48 h-1.5 bg-stone-400 rounded-full mb-3 shadow-inner shrink-0" />

          {/* Thermal Paper Slip */}
          <div
            id="thermal-receipt-slip"
            className="w-full bg-amber-50/70 border border-stone-300 shadow-md p-4 sm:p-5 font-mono text-xs text-stone-900 rounded-xs relative select-text"
            style={{
              backgroundImage: 'radial-gradient(#d5cdc4 0.5px, transparent 0.5px)',
              backgroundSize: '8px 8px',
            }}
          >
            {/* Top Store Info */}
            <div className="text-center border-b border-dashed border-stone-400 pb-3 mb-3">
              <div className="w-12 h-12 mx-auto rounded-full overflow-hidden border border-stone-300 mb-1.5 bg-white p-0.5 shadow-2xs">
                <img
                  src="/assets/giva-logo.jpg"
                  alt="GIVA Logo"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <h1 className="text-sm font-black tracking-widest text-stone-900 uppercase">
                {receipt.storeName}
              </h1>
              <p className="text-[10px] italic font-serif text-stone-600 mt-0.5">
                {receipt.tagline}
              </p>
              <div className="text-[10px] text-stone-500 mt-2 space-y-0.5">
                <p>Tax Invoice &amp; Cash Receipt</p>
                <p className="font-semibold text-stone-800 font-mono">
                  {receipt.receiptNo}
                </p>
                <p>{new Date(receipt.timestamp).toLocaleString()}</p>
                <p>Terminal: Android 11 Q3 POS #01</p>
                <p className="font-semibold text-stone-700">Cashier: {receipt.cashierName || 'Cathy'}</p>
                <div className="pt-1 text-[9px] font-bold text-amber-900 bg-amber-100 py-0.5 rounded px-1.5 inline-block font-mono">
                  RBZ Rate: 1 USD = {(receipt.bankRate || 40).toFixed(2)} ZiG
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="border-b border-dashed border-stone-400 pb-3 mb-3 space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-stone-600 pb-1 border-b border-stone-200">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>
              {receipt.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-semibold text-stone-900 break-words">
                    {item.name}
                  </div>
                  <div className="flex justify-between text-stone-600 text-[11px]">
                    <span>
                      {item.quantity} x {formatCurrency(item.unitPrice, receipt.currency)}
                    </span>
                    <span className="font-semibold text-stone-900">
                      {formatCurrency(item.subtotal, receipt.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-xs border-b border-dashed border-stone-400 pb-3 mb-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(receipt.totalAmount, receipt.currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-stone-200">
                <span>TOTAL ({receipt.currency}):</span>
                <span className="text-base font-black text-emerald-800">
                  {formatCurrency(receipt.totalAmount, receipt.currency)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600 pt-1">
                <span>Payment:</span>
                <span className="font-semibold">{receipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Tendered:</span>
                <span>{formatCurrency(receipt.amountTendered, receipt.currency)}</span>
              </div>
              <div className="flex justify-between text-stone-900 font-semibold">
                <span>Change Due:</span>
                <span>{formatCurrency(receipt.changeAmount, receipt.currency)}</span>
              </div>
            </div>

            {/* Barcode & Thermal Footer */}
            <div className="text-center pt-1">
              <div className="flex justify-center mb-1">
                <BarcodeRenderer
                  value={receipt.receiptNo}
                  width={1.2}
                  height={32}
                  fontSize={10}
                />
              </div>
              <p className="text-[10px] text-stone-500 font-sans font-medium">
                Thank you for shopping at GIVA Living &amp; Baby!
              </p>
              <p className="text-[10px] font-serif italic text-stone-600 mt-0.5">
                "For your Home. For your baby for His glory."
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Customer Modal Section */}
        {showWhatsAppInput && (
          <form onSubmit={handleSendWhatsApp} className="p-3 bg-emerald-50 border-t border-emerald-200 flex gap-2">
            <input
              type="tel"
              placeholder="e.g. 263771234567"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Send size={12} />
              <span>Send</span>
            </button>
            <button
              type="button"
              onClick={() => setShowWhatsAppInput(false)}
              className="px-2 py-1.5 text-stone-500 hover:text-stone-700 text-xs cursor-pointer"
            >
              ✕
            </button>
          </form>
        )}

        {/* Bluetooth Status Alert */}
        {btStatus && (
          <div className="px-4 py-2 bg-stone-800 text-amber-300 text-[11px] font-mono flex items-center gap-1.5 border-t border-stone-700">
            <Bluetooth size={13} className="shrink-0" />
            <span className="truncate">{btStatus}</span>
          </div>
        )}

        {/* Primary Action Controls */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-col gap-2">
          {/* Main Print Button */}
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="w-full py-3 px-4 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Printer size={16} className={isPrinting ? 'animate-bounce text-amber-400' : 'text-amber-400'} />
            <span>{isPrinting ? 'Opening Print Spooler...' : 'Print 58mm Thermal Slip (System / Q3)'}</span>
          </button>

          {/* Secondary Actions: Bluetooth, WhatsApp, Copy */}
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <button
              type="button"
              onClick={handleBluetoothPrint}
              className="py-2 px-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-semibold border border-stone-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Print directly to Bluetooth POS thermal printer"
            >
              <Bluetooth size={13} className="text-blue-600 shrink-0" />
              <span>Bluetooth</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWhatsAppInput(!showWhatsAppInput)}
              className="py-2 px-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-semibold border border-stone-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Send digital receipt via WhatsApp"
            >
              <Send size={13} className="text-emerald-600 shrink-0" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="py-2 px-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-semibold border border-stone-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Copy receipt text to clipboard"
            >
              {copied ? <Check size={13} className="text-emerald-600 shrink-0" /> : <Copy size={13} className="shrink-0" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          {/* New Sale Button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer mt-0.5"
          >
            Done / Next Transaction
          </button>
        </div>
      </div>
    </div>
  );
};
