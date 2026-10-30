# CLAUDE PROMPT: BUILD APP 2 - GIVA MOBILE STORE MANAGEMENT & P&L TRACKER

You are an expert mobile app developer. Build the standalone mobile app (iOS and Android) for **"GIVA Mobile Store Management & P&L Tracker"**.

---

## 1. DEVICE PROFILE & AUDIENCE
- **Target Devices**: Standard smartphones (Android and iOS / iPhone).
- **Target Users**:
  - **Store Owner / Admin** (PIN: **2026**): Full master control (stock updates, add new product, barcode scanning & photo updates, delete items, change RBZ bank exchange rate, quarterly P&L financials, Excel exports, staff PIN configuration).
  - **Store Manager** (PIN: **1984**): Stock count adjustments, restock (+) / write-off (-), view products, add new products, scan barcode to take/attach picture, barcode label PDF generator, sales reports. (Cannot change bank exchange rate).

---

## 2. APP 2 CORE REQUIREMENTS

### A. Login & Credential Security
- Dedicated Mobile Login Screen on launch.
- Role Selector: **Store Owner / Admin** vs **Store Manager**.
- 4-Digit Numeric PIN Pad with visual dot indicators (`••••`).
- **SECURITY DISCIPLINE**: Passwords and PINs must be strictly masked. NO "show password" eye toggle or plain-text reveals.
- Stored session tokens with automatic timeout/logout option.

### B. Clean Navigation & Header
- Brand Header: GIVA Living & Baby logo.
- Official RBZ Bank Rate Indicator: `1 USD = 40.00 ZiG ✎` (Tap to open Rate Editor modal if Admin).
- Role Badge: Displays `Store Owner` or `Store Manager` with quick switch/lock button.
- 3 Primary Tabs (Swipeable left/right with tactile touch feedback):
  1. **Stock & Catalog** (`STOCK`)
  2. **Sales & Reports** (`REPORTS`)
  3. **Staff & Settings** (`SETTINGS` or `DEDUCTIONS`)

---

### C. Feature 1: Stock Management & Inventory Catalog
- Real-time list of all inventory items (50+ SKUs across 6 categories: Baby Creams & Lotions, Diffusers, Baby Skin Care, Clothing, Bags, Diapers).
- Quick Category Filter Bar + Search Bar (searches by product name, variant, or barcode).
- Product Card shows:
  - High-resolution product photo thumbnail.
  - Product Name and Size/Variant (e.g., "Bennetts Hair & Body Wash 400ml").
  - Barcode: e.g. `6001001001`.
  - Cost Price (USD) and Selling Price (USD + calculated ZiG).
  - Stock Level with badge:
    - Normal (Green): `> 10 units`
    - Low Stock (Amber alert): `1 - 10 units`
    - Out of Stock (Red): `0 units`
- One-Tap Quick Adjustment buttons:
  - `+ Restock`: Increment quantity (+1, +5, +10, custom).
  - `- Deduct`: Decrement quantity (for breakage, samples, theft write-offs).
- Action Menu per item:
  - **View Product Details**: High-res photo viewer, barcode render, full pricing details and profit margins.
  - **Scan Barcode & Update Photo**: Opens camera scanner -> matches product barcode -> prompts to take or upload new photo.
  - **Print Barcode Label**: Generates ready-to-print 58mm or standard barcode label sticker.
  - **Edit Product Details**: Edit name, price, variant, category.
  - **Delete Product** (Owner only, with confirmation modal).

---

### D. Feature 2: Add New Product
- Prominent floating action button: `+ Add New Product`.
- Fields:
  - Product Name (e.g., "Purity Essentials Baby Lotion").
  - Barcode (can be typed or scanned directly using the camera).
  - Category (Dropdown: Baby Creams, Diffusers, Skin Care, Clothing, Bags, Diapers, etc.).
  - Size / Variant (e.g., "500ml", "Size 3", "200g").
  - Cost Price USD (e.g. $4.50).
  - Selling Price USD (e.g. $8.00).
  - Selling Price in ZiG (automatically calculated using current bank rate: `8.00 * 40.00 = 320.00 ZiG`).
  - Initial Stock Quantity (e.g. 24 units).
  - Product Photo: Take picture using camera or select from photo gallery.
- Saves directly to local store and synchronizes to Firebase Firestore.

---

### E. Feature 3: Scan Barcode to Add / Update Picture
- In retail environments, owners frequently take physical inventory by scanning the product barcode on the shelf and instantly snapping a fresh photo.
- Workflow:
  1. Tap `Scan Barcode to Add Photo`.
  2. Camera scanner opens and reads the 1D/2D barcode.
  3. App searches database for matching SKU.
  4. Shows current item preview: "Found: Bennetts Hair & Body Wash (Barcode: 6001001001)".
  5. Owner taps `Capture New Photo` (or `Choose from Gallery`).
  6. Image is compressed and saved to the product record across POS and mobile apps.

---

### F. Feature 4: Official RBZ Bank Exchange Rate Editor
- Allows Admin (PIN 2026) to update the official Reserve Bank of Zimbabwe exchange rate (ZiG per 1 USD).
- Live calculation preview: shows how a $10.00 item changes in ZiG across all stores.
- Instant broadcast to all connected Q3 POS terminals and cashier devices.

---

### G. Feature 5: Quarterly Profit & Loss (P&L) Analytics & Excel Export
- Tracks real-time retail performance:
  - **Gross Sales Revenue**: Total sales in USD and ZiG equivalent.
  - **Cost of Goods Sold (COGS)**: Sum of wholesale acquisition costs.
  - **Gross Profit & Margin %**: `(Revenue - COGS) / Revenue * 100`.
  - **Operating Expenses Ledger**: Rent, thermal rolls, Wi-Fi, logistics, salaries.
  - **Net Operating Income / Profit**.
- Financial Selector: Quarter (Q1, Q2, Q3, Q4) and Year (2026).
- Export Features:
  - **Download Detailed Excel Workbook (`.xlsx`)**: Formatted with 3 sheets (Executive Summary, Itemized Sales Ledger, Operating Expenses Ledger).
  - **Print 58mm Thermal Slip**: Formatted accounting receipt for filing in the physical cash drawer.

---

## 3. RECOMMENDED TECH STACK
- **Framework**: React Native + Expo (TypeScript).
- **Camera & Barcode**: `expo-camera` or `react-native-vision-camera`.
- **Image Picker**: `expo-image-picker`.
- **Database / Cloud**: Firebase Firestore (`@react-native-firebase/firestore` or Firebase JS SDK) + Local cache.
- **Excel Export**: `xlsx` (SheetJS) + `expo-file-system` + `expo-sharing`.
- **UI & Icons**: Tailwind CSS (`nativewind`) + `lucide-react-native`.
