import React, { useState } from 'react';
import {
  Smartphone,
  Tablet,
  CheckCircle2,
  ExternalLink,
  Shield,
  Coins,
  Printer,
  Barcode,
  Layers,
  Database,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Eye,
  FileCode,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface ShowcaseViewProps {
  onLaunchPos: () => void;
  onLaunchManager: (role?: 'ADMIN' | 'MANAGER') => void;
  onLaunchDual: () => void;
  bankRate: number;
}

interface ScreenshotItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'POS' | 'Manager' | 'Checkout' | 'Hardware';
  image: string;
  description: string;
  features: string[];
  launchAction: () => void;
  actionLabel: string;
}

export const ShowcaseView: React.FC<ShowcaseViewProps> = ({
  onLaunchPos,
  onLaunchManager,
  onLaunchDual,
  bankRate,
}) => {
  const [activeTab, setActiveTab] = useState<'GALLERY' | 'SPECS' | 'PROMPTS'>('GALLERY');
  const [selectedImage, setSelectedImage] = useState<ScreenshotItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const screenshots: ScreenshotItem[] = [
    {
      id: 'desktop-pos',
      title: 'Q3 POS Terminal - Full Register Screen',
      subtitle: 'Desktop & widescreen counter checkout mode',
      category: 'POS',
      image: '/assets-pack/desktop-pos-live.png',
      description:
        'Live touchscreen register showing category filter pills, instant barcode search, live stock counter badges, cart calculation, and Cathy Cashier active shift.',
      features: [
        '5 categories with item counters',
        'Out-of-stock lockout with red badges',
        'USD and ZiG live price displays',
        'Tap navigation between Sales Register and Inventory Floor Check',
      ],
      launchAction: onLaunchPos,
      actionLabel: 'Launch Q3 POS Register',
    },
    {
      id: 'mobile-pos',
      title: 'Q3 Handheld Terminal Display',
      subtitle: 'Optimized for 5.5-inch Android 11 POS handhelds',
      category: 'POS',
      image: '/assets-pack/mobile-pos-live.png',
      description:
        'Compact handheld layout engineered specifically for Q3 hardware with top thermal printer and built-in laser scanner.',
      features: [
        'One-thumb cashier controls',
        'Quick barcode scan button',
        'Floor inventory verification view',
        'Instant add-to-cart with touch feedback',
      ],
      launchAction: onLaunchPos,
      actionLabel: 'Test Handheld View',
    },
    {
      id: 'checkout-zig',
      title: 'Dual Currency ZiG & USD Checkout',
      subtitle: 'Zimbabwe official RBZ bank rate conversion',
      category: 'Checkout',
      image: '/assets-pack/checkout_zig_modal.png',
      description:
        'Live multi-currency payment modal supporting Cash USD, Cash ZiG, Swipe/Card, EcoCash Mobile Money, and Split Tender at official rate.',
      features: [
        `Official RBZ Bank Rate: 1 USD = ${bankRate.toFixed(2)} ZiG`,
        'Change calculator in both USD & ZiG',
        'Denomination quick-tap buttons',
        'Offline transaction batching',
      ],
      launchAction: onLaunchPos,
      actionLabel: 'Try Checkout Modal',
    },
    {
      id: 'zig-switched',
      title: 'Instant Currency Conversion',
      subtitle: 'Real-time recalculated store pricing',
      category: 'Checkout',
      image: '/assets-pack/zig_switched.png',
      description:
        'With one tap, the cashier can toggle between USD ($) and ZiG pricing throughout the entire catalog and cart.',
      features: [
        'Zero latency recalculation',
        'Clear currency badge status',
        'Dual-formatted 58mm receipts',
        'Customer tender input in either currency',
      ],
      launchAction: onLaunchPos,
      actionLabel: 'Test Currency Switch',
    },
    {
      id: 'mobile-stock',
      title: 'Store Manager - Live Stock Catalog',
      subtitle: 'Real-time inventory restock & deduction',
      category: 'Manager',
      image: '/assets-pack/mobile-stock-live.png',
      description:
        'Store Manager phone app displaying all 90+ luxury baby products with atomic +/- stock increment buttons, search, and margin metrics.',
      features: [
        'Atomic stock increments to prevent race conditions',
        'Search by barcode, name, or size variant',
        'Profit margin and unit cost indicators',
        'Filter by Out of Stock and Low Stock',
      ],
      launchAction: () => onLaunchManager('MANAGER'),
      actionLabel: 'Open Stock Manager',
    },
    {
      id: 'mobile-reports',
      title: 'Store Manager - Quarterly P&L Analytics',
      subtitle: 'Financial tracking with 3-sheet Excel export',
      category: 'Manager',
      image: '/assets-pack/mobile-reports-live.png',
      description:
        'Comprehensive P&L reporting showing Revenue, Cost of Goods Sold, Gross Margin, Operating Expenses, and Net Profit in both USD and ZiG.',
      features: [
        'Quarterly switcher: Q1, Q2, Q3, Q4',
        'Expense recording (Utilities, Rent, Packaging, Data)',
        'Built-in XLSX 3-sheet export on device',
        'Thermal P&L slip generator for 58mm printer',
      ],
      launchAction: () => onLaunchManager('ADMIN'),
      actionLabel: 'Open P&L Reports',
    },
    {
      id: 'mobile-role',
      title: 'Role-Based Access Control',
      subtitle: 'PIN-secured Owner, Manager, and Cashier tiers',
      category: 'Manager',
      image: '/assets-pack/mobile-role-modal.png',
      description:
        'Tiered security model separating Store Owner (Admin), Store Manager, and Cashier.',
      features: [
        'Admin Role: Full access + RBZ bank exchange rate control',
        'Manager Role: Stock inventory & P&L access (protected rate)',
        'Cashier Role: Locked strictly to POS sales register',
        'Device-level authentication for offline security',
      ],
      launchAction: () => onLaunchManager('ADMIN'),
      actionLabel: 'Test Role Logins',
    },
    {
      id: 'app-home',
      title: 'GIVA PWA Home & Install Screen',
      subtitle: 'Installable on Q3 terminal & iOS/Android phones',
      category: 'Hardware',
      image: '/assets-pack/app_home.png',
      description:
        'Dual Progressive Web App architecture allowing /pos and /manager to be installed as two separate standalone app icons with individual manifests.',
      features: [
        'App 1: GIVA Q3 Smart POS (cashier terminal icon)',
        'App 2: GIVA Store Manager (owner phone icon)',
        'Offline Service Worker caching',
        'Automatic Firestore long-polling on mobile carriers',
      ],
      launchAction: onLaunchDual,
      actionLabel: 'View Dual Live Mode',
    },
  ];

  return (
    <div className="min-h-full bg-stone-950 text-stone-100 flex flex-col p-4 md:p-8">
      {/* Hero Banner */}
      <div className="max-w-7xl mx-auto w-full mb-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/40 border border-amber-500/20 p-6 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>GIVA LIVING &amp; BABY &bull; DUAL APP SUITE</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-serif tracking-tight text-white font-bold mb-2">
                Q3 Smart POS <span className="text-amber-400 font-sans">&amp;</span> Store Manager
              </h1>
              <p className="text-stone-300 max-w-2xl text-sm md:text-base leading-relaxed italic">
                &ldquo;For your Home. For your baby for His glory.&rdquo;
              </p>
              <p className="text-stone-400 max-w-2xl text-xs md:text-sm mt-2">
                A dual mobile &amp; handheld retail ecosystem for Zimbabwe with multi-currency (USD &amp; ZiG),
                built-in 58mm ESC/POS thermal printing, laser barcode scanning, atomic offline inventory sync, and quarterly P&amp;L analytics.
              </p>
            </div>

            {/* Quick Action Cards */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
              <button
                onClick={onLaunchPos}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-950/50 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Tablet className="w-4 h-4" />
                <span>Launch Q3 POS</span>
              </button>

              <button
                onClick={() => onLaunchManager('ADMIN')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm border border-stone-700 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Launch Manager</span>
              </button>

              <button
                onClick={onLaunchDual}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-bold text-sm transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Dual Live View</span>
              </button>
            </div>
          </div>

          {/* System Specs Pill Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-stone-800/80 text-xs text-stone-300">
            <div className="flex items-center gap-2 bg-stone-950/40 p-2.5 rounded-lg border border-stone-800">
              <Coins className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-stone-400 block text-[10px]">Official RBZ Rate</span>
                <span className="font-mono font-bold text-white">1 USD = {bankRate.toFixed(2)} ZiG</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-stone-950/40 p-2.5 rounded-lg border border-stone-800">
              <Printer className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-stone-400 block text-[10px]">Thermal Printing</span>
                <span className="font-bold text-white">58mm ESC/POS + Labels</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-stone-950/40 p-2.5 rounded-lg border border-stone-800">
              <Database className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-stone-400 block text-[10px]">Sync Engine</span>
                <span className="font-bold text-white">Firestore + Offline Queue</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-stone-950/40 p-2.5 rounded-lg border border-stone-800">
              <Shield className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-stone-400 block text-[10px]">Role Security</span>
                <span className="font-bold text-white">Encrypted Credential RBAC</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto w-full mb-6">
        <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
          <button
            onClick={() => setActiveTab('GALLERY')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'GALLERY'
                ? 'bg-amber-500 text-stone-950 shadow-md font-bold'
                : 'text-stone-400 hover:text-white hover:bg-stone-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Live Screens &amp; Visual Tour ({screenshots.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('SPECS')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'SPECS'
                ? 'bg-amber-500 text-stone-950 shadow-md font-bold'
                : 'text-stone-400 hover:text-white hover:bg-stone-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Architecture &amp; Key Fixes</span>
          </button>
          <button
            onClick={() => setActiveTab('PROMPTS')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'PROMPTS'
                ? 'bg-amber-500 text-stone-950 shadow-md font-bold'
                : 'text-stone-400 hover:text-white hover:bg-stone-900'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Developer Prompts &amp; Credentials</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SCREENSHOTS & LIVE SCREENS */}
      {activeTab === 'GALLERY' && (
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {screenshots.map((s) => (
              <div
                key={s.id}
                className="group bg-stone-900/90 rounded-2xl border border-stone-800 hover:border-amber-500/40 overflow-hidden flex flex-col transition-all hover:shadow-xl hover:shadow-amber-950/20"
              >
                {/* Thumbnail Image */}
                <div
                  onClick={() => setSelectedImage(s)}
                  className="relative aspect-[4/3] bg-stone-950 overflow-hidden cursor-pointer"
                >
                  <img
                    src={s.image}
                    alt={s.title}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-60" />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-stone-950/80 backdrop-blur-md border border-stone-700 text-[10px] font-semibold text-amber-300">
                    {s.category}
                  </span>
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded bg-stone-900/90 text-stone-300 text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-3 h-3 text-amber-400" /> Click to Zoom
                  </div>
                </div>

                {/* Body Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-xs text-stone-400 mb-2 line-clamp-1">{s.subtitle}</p>
                    <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed mb-3">
                      {s.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-stone-800/80">
                    <ul className="space-y-1 mb-3">
                      {s.features.slice(0, 2).map((f, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-[11px] text-stone-300">
                          <CheckCircle2 className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={s.launchAction}
                      className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{s.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ARCHITECTURE & WHAT WAS FIXED */}
      {activeTab === 'SPECS' && (
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* App 1 Specs */}
            <div className="bg-stone-900 rounded-2xl border border-stone-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Tablet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">App 1: GIVA Q3 SMART POS Terminal</h3>
                  <p className="text-xs text-stone-400">Handheld Android 11 POS terminal (/pos)</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-stone-300">
                <p className="leading-relaxed">
                  Engineered specifically for handheld Android 11 smart terminals (such as Sunmi, iMin, and Q3 terminals)
                  featuring built-in 58mm direct thermal ESC/POS receipt printing and a hardware red-laser barcode scan engine.
                </p>

                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
                  <span className="font-semibold text-amber-400 text-xs block uppercase tracking-wider">
                    Core Capabilities
                  </span>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Cathy Cashier Login</strong> (PIN 1234) with shift tracking and thermal slip attribution.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Dual-Currency USD &amp; ZiG Checkout</strong> with cash, card, mobile money, and split tenders.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Floor Inventory Quick Check</strong>: cashier scans any item to instantly verify price, stock, and cost.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong>58mm Thermal Receipt Generator</strong>: authentic ESC/POS tax invoice with barcode, breakdown, and WhatsApp sharing.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Audio Chime Feedback</strong>: pleasant POS scan blip and success cash register chimes via Web Audio API.</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={onLaunchPos}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  <Tablet className="w-4 h-4" />
                  <span>Launch Q3 POS Register Preview</span>
                </button>
              </div>
            </div>

            {/* App 2 Specs */}
            <div className="bg-stone-900 rounded-2xl border border-stone-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">App 2: Mobile Store Management &amp; P&amp;L</h3>
                  <p className="text-xs text-stone-400">Owner &amp; Manager iPhone/Android app (/manager)</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-stone-300">
                <p className="leading-relaxed">
                  A high-end management companion for store owners and managers to monitor live floor sales, manage inventory,
                  adjust official exchange rates, and view Quarterly Profit &amp; Loss statements from anywhere in the world.
                </p>

                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
                  <span className="font-semibold text-indigo-400 text-xs block uppercase tracking-wider">
                    Core Capabilities
                  </span>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Role-Based PINs</strong>: Owner / Admin (2026) vs Store Manager (1984).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Atomic Stock Control</strong>: +/- increment buttons record restocks/deductions with reasons without overwriting live POS sales.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong>RBZ Exchange Rate Editor</strong>: Store owner updates the central USD/ZiG rate live across all POS terminals.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Product Creation &amp; Barcode Camera Scanner</strong>: add new items, generate barcodes, take product photos.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Quarterly P&amp;L &amp; 3-Sheet Excel Export</strong>: built directly on the device using XLSX library.</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => onLaunchManager('ADMIN')}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Launch Mobile Store Manager Preview</span>
                </button>
              </div>
            </div>
          </div>

          {/* Critical Technical Fixes Table */}
          <div className="bg-stone-900 rounded-2xl border border-stone-800 p-6">
            <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Resolved Architectural Flaws &amp; Production Fixes</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800/80">
                <span className="font-bold text-amber-300 block mb-1">1. Atomic Stock Adjustments</span>
                <p className="text-stone-400 leading-relaxed">
                  Previous restock logic replaced stock with absolute numbers, erasing concurrent cashier sales.
                  Now uses Firestore atomic <code className="text-amber-400 font-mono">increment(+qty)</code> / <code className="text-amber-400 font-mono">increment(-qty)</code> so sales and restocks never collide.
                </p>
              </div>

              <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800/80">
                <span className="font-bold text-amber-300 block mb-1">2. Multi-Item Cart Firestore Fix</span>
                <p className="text-stone-400 leading-relaxed">
                  Firestore transactions threw errors on multi-item carts because writes were attempted before all reads completed.
                  Rewritten to read all item snapshots first, then apply atomic write batching.
                </p>
              </div>

              <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800/80">
                <span className="font-bold text-amber-300 block mb-1">3. Seed Overwrite on Offline Reconnect</span>
                <p className="text-stone-400 leading-relaxed">
                  Local cache reading looked &ldquo;empty&rdquo; when offline and previously re-seeded sample data, overwriting real inventory.
                  Seeding now checks server metadata and runs only once.
                </p>
              </div>

              <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800/80">
                <span className="font-bold text-amber-300 block mb-1">4. Currency Cost Fix (ZAR vs USD)</span>
                <p className="text-stone-400 leading-relaxed">
                  Original 92 seed products had cost entered in South African Rand while selling price was in USD, resulting in false negative margins.
                  Automated cost converter normalizes all values to USD &amp; ZiG.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEVELOPER PROMPTS & CREDENTIALS */}
      {activeTab === 'PROMPTS' && (
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {/* Credentials Card */}
          <div className="bg-stone-900 rounded-2xl border border-stone-800 p-6">
            <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Access Credentials Cheat Sheet</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-stone-950 p-4 rounded-xl border border-amber-500/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                      CASHIER
                    </span>
                    <span className="text-xs text-stone-400">Q3 POS Terminal</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">Cathy</h4>
                  <p className="text-xs text-stone-400 mt-1">Cashier Station &amp; POS checkout</p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-500 block">CREDENTIAL STATUS</span>
                    <span className="font-mono font-bold text-amber-400 text-xs">PIN Protected</span>
                  </div>
                  <button
                    onClick={() => onLaunchPos()}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer"
                  >
                    Open Cashier
                  </button>
                </div>
              </div>

              <div className="bg-stone-950 p-4 rounded-xl border border-indigo-500/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                      MANAGER
                    </span>
                    <span className="text-xs text-stone-400">Store Manager App</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">Store Manager</h4>
                  <p className="text-xs text-stone-400 mt-1">Stock adjustments &amp; inventory</p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-500 block">CREDENTIAL STATUS</span>
                    <span className="font-mono font-bold text-indigo-400 text-xs">PIN Protected</span>
                  </div>
                  <button
                    onClick={() => onLaunchManager('MANAGER')}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer"
                  >
                    Open Manager
                  </button>
                </div>
              </div>

              <div className="bg-stone-950 p-4 rounded-xl border border-purple-500/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold">
                      OWNER / ADMIN
                    </span>
                    <span className="text-xs text-stone-400">All Apps</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">Store Owner</h4>
                  <p className="text-xs text-stone-400 mt-1">Full control + RBZ rate editor</p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-500 block">CREDENTIAL STATUS</span>
                    <span className="font-mono font-bold text-purple-400 text-xs">PIN Protected</span>
                  </div>
                  <button
                    onClick={() => onLaunchManager('ADMIN')}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer"
                  >
                    Open Owner
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bundled Developer Prompts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-stone-900 rounded-2xl border border-stone-800 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-400" /> CLAUDE_PROMPT_Q3_POS.md
                </span>
                <button
                  onClick={() => copyText('q3', 'See giva/CLAUDE_PROMPT_Q3_POS.md in repository')}
                  className="text-xs text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'q3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'q3' ? 'Copied path' : 'Copy reference'}</span>
                </button>
              </div>
              <p className="text-xs text-stone-400 mb-3 leading-relaxed">
                Contains the full standalone specification for compiling App 1 directly into a Kotlin or React Native Android app
                for the Sunmi/Q3 POS hardware terminal.
              </p>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 font-mono text-[11px] text-stone-300 max-h-48 overflow-y-auto">
                <p className="text-amber-400 font-bold mb-1"># GIVA Q3 SMART POS Terminal Specification</p>
                <p>- Target Device: Handheld Android 11 POS terminal (Sunmi / Q3)</p>
                <p>- Printer: Built-in 58mm ESC/POS thermal head (203 dpi, 384 dots/line)</p>
                <p>- Scanner: Red-laser barcode scan engine (Code128, EAN13)</p>
                <p>- Currency: Dual USD ($) &amp; Zimbabwe ZiG (1 USD = 40.00 ZiG)</p>
                <p>- Storage: Firestore with persistent local cache</p>
              </div>
            </div>

            <div className="bg-stone-900 rounded-2xl border border-stone-800 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-400" /> CLAUDE_PROMPT_MOBILE_MANAGER.md
                </span>
                <button
                  onClick={() => copyText('mgr', 'See giva/CLAUDE_PROMPT_MOBILE_MANAGER.md in repository')}
                  className="text-xs text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'mgr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'mgr' ? 'Copied path' : 'Copy reference'}</span>
                </button>
              </div>
              <p className="text-xs text-stone-400 mb-3 leading-relaxed">
                Contains the complete specification for building App 2 as an iOS/Android Expo mobile application
                for Store Owners and Managers with camera barcode scanning and Excel P&amp;L reporting.
              </p>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 font-mono text-[11px] text-stone-300 max-h-48 overflow-y-auto">
                <p className="text-indigo-400 font-bold mb-1"># GIVA Mobile Store Management Specification</p>
                <p>- Roles: Store Owner (Admin) &amp; Store Manager (Encrypted Credentials)</p>
                <p>- Stock: Atomic +/- increments with deduction audit trail</p>
                <p>- Analytics: Quarterly P&amp;L (Revenue, COGS, Gross Profit, Expenses, Net Profit)</p>
                <p>- Export: 3-Sheet XLSX workbook (Summary, Items, Expenses)</p>
                <p>- Exchange Rate: Official RBZ Bank Rate editor</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Zoom Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 rounded-2xl border border-stone-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div>
                <span className="text-xs text-amber-400 font-semibold uppercase">{selectedImage.category}</span>
                <h3 className="font-bold text-white text-base">{selectedImage.title}</h3>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-stone-950 flex items-center justify-center">
              <img
                src={selectedImage.image}
                alt={selectedImage.title}
                className="max-h-[60vh] max-w-full rounded-lg shadow-lg object-contain border border-stone-800"
              />
            </div>

            <div className="p-4 bg-stone-900 border-t border-stone-800 flex items-center justify-between gap-4">
              <p className="text-xs text-stone-300 max-w-lg">{selectedImage.description}</p>
              <button
                onClick={() => {
                  const act = selectedImage.launchAction;
                  setSelectedImage(null);
                  act();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer flex-shrink-0"
              >
                <span>{selectedImage.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
