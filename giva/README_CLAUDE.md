# GIVA LIVING & BABY - CLAUDE MOBILE APP DEVELOPER BUNDLE
*For your Home. For your baby for His glory.*

This package contains the complete source code, seed database, logic algorithms, brand assets, screenshots, and Claude architectural instructions to build **two separate mobile applications**:

1. **App 1: `GIVA Q3 SMART POS Terminal`** (Handheld Android 11 POS terminal with built-in 58mm thermal ESC/POS receipt printer and red laser barcode scanner engine).
2. **App 2: `GIVA Mobile Store Management & P&L Tracker`** (Mobile phone app for iPhone/Android for Store Owners and Managers with stock restock/deductions, barcode camera photo updates, product creation, RBZ ZiG exchange rate adjustments, and Quarterly P&L analytics).

---

## FOLDER STRUCTURE & KEY FILES

```text
├── CLAUDE_PROMPT_Q3_POS.md         # Complete Claude master prompt for App 1 (Q3 POS)
├── CLAUDE_PROMPT_MOBILE_MANAGER.md # Complete Claude master prompt for App 2 (Store Manager)
├── README_CLAUDE.md                # This developer overview guide
│
├── giva-assets-pack/               # High-res Brand logos, device screenshots, and UI mockups
│   ├── giva-logo.jpg               # Official luxury gold emblem & typography
│   ├── giva-brand-circle.jpg       # App circular icon / avatar
│   ├── Screenshot__34__af3ca7b8.png# UI screenshot reference (Role credentials)
│   ├── Screenshot__35__ce05d755.png# UI screenshot reference (Terminal controls)
│   ├── desktop-pos-live.png        # Full-screen POS register reference
│   ├── mobile-pos-live.png         # Handheld Q3 screen reference
│   ├── mobile-stock-live.png       # Mobile stock & catalog screen reference
│   ├── mobile-reports-live.png     # Mobile P&L quarterly analytics reference
│   └── checkout_zig_modal.png      # USD/ZiG dual currency checkout reference
│
├── src/                            # Complete React 19 + TypeScript reference source code
│   ├── components/                 # UI components
│   │   ├── Q3SmartApp.tsx          # App 1 container (Cashier station, swipe tabs)
│   │   ├── Q3TerminalView.tsx      # App 1 POS register, cart, barcode scanner
│   │   ├── InventoryCheckView.tsx  # App 1 Floor inventory verification screen
│   │   ├── CashierLoginModal.tsx   # App 1 Cathy Cashier PIN login (1234)
│   │   ├── ThermalReceiptModal.tsx # App 1 58mm ESC/POS thermal receipt formatter
│   │   ├── CheckoutModal.tsx       # App 1 USD/ZiG cash/card/mobile money checkout
│   │   │
│   │   ├── MobileManagementApp.tsx # App 2 container (Stock, Reports, Settings)
│   │   ├── MobileLoginScreen.tsx   # App 2 Owner/Admin (2026) & Manager (1984) PIN login
│   │   ├── OwnerDashboard.tsx      # App 2 Stock catalog, restock/deduct, search
│   │   ├── ProductFormModal.tsx    # App 2 Add New Product modal
│   │   ├── ProductDetailModal.tsx  # App 2 View product details & high-res image
│   │   ├── ScanPictureModal.tsx    # App 2 Scan Barcode -> Take/Attach New Photo
│   │   ├── BarcodeLabelsModal.tsx  # App 2 Print 58mm sticky barcode labels
│   │   ├── BankRateModal.tsx       # App 2 Official RBZ Bank Rate editor (ZiG/USD)
│   │   └── ReportsView.tsx         # App 2 Quarterly P&L + Excel (.xlsx) export
│   │
│   ├── data/
│   │   └── inventorySeed.ts        # 50+ Real products with barcodes, variants, costs, prices
│   ├── utils/
│   │   ├── pos-logic.ts            # P&L calculations, currency conversion (USD/ZiG), formatting
│   │   ├── role-access.ts          # Role permissions, PIN verification (Admin: 2026, Manager: 1984)
│   │   ├── print-service.ts        # 58mm thermal ESC/POS byte sequence generation
│   │   └── audio.ts                # Audio chime feedback for scanner and checkout
│   ├── firebase.ts                 # Firestore connection initialization
│   ├── main.tsx                    # React client entry point
│   └── index.css                   # Tailwind CSS styles and luxury theme
│
├── server.ts                       # Complete Node.js / Express backend
│   ├── REST APIs for Products, Sales, Expenses, Bank Rate, Thermal slip text
│   ├── Server-Sent Events (SSE) for live multi-device stock synchronization
│   └── Dynamic Excel (.xlsx) 3-sheet Quarterly P&L workbook export
│
├── firestore.rules                 # Production Firestore security rules
├── firebase-blueprint.json         # Database schema for Products, Sales, Expenses, Config
└── package.json                    # Dependencies & build scripts
```

---

## HOW TO INSTRUCT CLAUDE

### Option A: Build App 1 (Q3 SMART POS Terminal)
Feed Claude `CLAUDE_PROMPT_Q3_POS.md` along with:
- `src/components/Q3SmartApp.tsx`
- `src/components/Q3TerminalView.tsx`
- `src/components/CashierLoginModal.tsx`
- `src/components/ThermalReceiptModal.tsx`
- `src/data/inventorySeed.ts`
- `src/utils/pos-logic.ts`
- `src/utils/print-service.ts`

Claude will generate the complete React Native / Expo or Kotlin Android project configured for the Q3 handheld terminal!

### Option B: Build App 2 (Mobile Store Management & P&L Tracker)
Feed Claude `CLAUDE_PROMPT_MOBILE_MANAGER.md` along with:
- `src/components/MobileManagementApp.tsx`
- `src/components/MobileLoginScreen.tsx`
- `src/components/OwnerDashboard.tsx`
- `src/components/ProductFormModal.tsx`
- `src/components/ProductDetailModal.tsx`
- `src/components/ScanPictureModal.tsx`
- `src/components/BankRateModal.tsx`
- `src/components/ReportsView.tsx`
- `src/data/inventorySeed.ts`
- `src/utils/pos-logic.ts`
- `src/utils/role-access.ts`

Claude will generate the complete React Native / Expo mobile app for iOS and Android!

---

## DEFAULT CREDENTIALS (NO PASSWORDS EXPOSED IN UI)
- **App 1 (Q3 POS Terminal Cashier)**:
  - Cashier Name: `Cathy`
  - PIN / Password: `1234`
- **App 2 (Store Owner / Admin)**:
  - Role: `Store Owner / Admin`
  - PIN: `2026`
- **App 2 (Store Manager)**:
  - Role: `Store Manager`
  - PIN: `1984`
- **Official Exchange Rate**:
  - Default: `1 USD = 40.00 ZiG` (editable by Admin).
