# CLAUDE PROMPT: BUILD APP 1 - GIVA Q3 SMART HANDHELD POS TERMINAL

You are an expert mobile and embedded POS engineer. Build the standalone mobile/Android app for **"GIVA Q3 SMART POS Terminal"**.

---

## 1. DEVICE PROFILE & SPECIFICATIONS
- **Target Device**: Q3 SMART Handheld POS Terminal (Android 11, 5.5" IPS capacitive touchscreen, 720x1440 portrait).
- **Integrated Hardware**:
  - **Printer**: Built-in 58mm high-speed thermal receipt printer (paper width 57.5±0.5mm, print width 48mm, 384 dots/line, 70mm/s).
  - **Scanner**: Built-in red laser 1D/2D barcode scanning engine on top bezel (hardware trigger broadcast `android.intent.action.SCAN` or camera preview fallback via ZXing/CameraX).
- **Network**: Dual SIM 4G LTE + Wi-Fi 2.4/5GHz + Offline SQLite Queue.

---

## 2. APP 1 CORE REQUIREMENTS (CASHIER STATION)
1. **Simplified Cashier Login (No Admin Level Access Window)**:
   - On app launch, display a clean Cashier Login screen.
   - Pre-filled or selectable Cashier Name: **Cathy** (with ability to enter another cashier name if needed).
   - 4-digit numeric keypad for Cashier Password/PIN: Default is **1234**.
   - Input is masked (`••••`). NO option to reveal plain-text passwords.
   - Upon entering 1234, unlock the Q3 POS register immediately.
   - Store Cashier session locally (`sessionStorage` / SQLite `active_session`).

2. **Streamlined POS Header**:
   - GIVA Living & Baby logo and brand title.
   - **One-tap Currency Switcher**: Toggle between **USD** and **ZiG** instantly.
   - Cashier Badge: `Cashier: Cathy` with a dropdown to "Switch Cashier / Sign Out".
   - Hardware Overflow Menu (`☰`):
     - Displays: Cashier Station status, Hardware Android 11 specs, Firebase Cloud Synced status, Laser Scan trigger, Camera Scan button.
     - **Official RBZ Bank Rate** is shown as **Read-Only** (e.g. `1 USD = 40.00 ZiG (Locked - Managed by Owner/Admin)`).
     - **STRICT EXCLUSIONS**: Do NOT include "[Change]" rate button, "[Mobile Store Manager]" link, or APK download links in the Q3 cashier app.

3. **Sub-Tabs (Swipeable Left / Right)**:
   - **Tab 1: Sales Register** (Default):
     - Search bar (by barcode or product name).
     - Quick Category pills: All, Baby Creams & Lotions, Diffusers & Room Fragrances, Baby Skin Care, Stiff Baby & Children's Clothing, Dot Bags & Accessories, Diapers & Nappy Care.
     - Product Grid (touch-optimized cards showing high-res product picture, title, size/variant, barcode, and price in selected currency).
     - Cart Drawer / Side Panel:
       - Line items with `+` / `-` / trash controls.
       - Subtotal, Tax/VAT ($0.00 / inclusive), Grand Total in USD and ZiG.
       - "Charge / Checkout" button.
   - **Tab 2: Inventory Check**:
     - Quick scanner search to verify price, variant, and remaining stock quantity on the retail floor without adding to cart.

4. **Checkout & Multi-Currency Settlement**:
   - Currency Selection: USD or ZiG (Zimbabwe Gold).
   - Dynamic conversion using the active RBZ bank rate (`ZiG = USD * bankRate`).
   - Payment Methods:
     - **CASH (USD / ZiG)**: Quick tender buttons ($1, $5, $10, $20, $50, $100 / exact), automatic real-time change calculation.
     - **CARD / POS Swipe**: Integrates with terminal card reader or external swipe.
     - **ECOCASH / INNBUCKS (ZiG / USD)**: Displays reference number input.
   - On successful sale:
     - Deduct stock inventory atomically.
     - Play positive audio chime (`cash-register` or frequency synthesized tone).
     - Open 58mm Thermal Receipt Dialog & automatically trigger hardware ESC/POS print.

5. **Built-in 58mm Thermal Receipt Engine (ESC/POS)**:
   - Header:
     ```text
     ================================
           GIVA LIVING & BABY
       For your Home. For your baby
             for His glory.
     ================================
     Receipt #: GIVA-001003
     Date: 29/10/2026, 08:45 AM
     Cashier: Cathy
     Terminal: Q3-SMART-01
     --------------------------------
     Qty  Item                 Price
     --------------------------------
     2x   Bennetts Hair Wash  $16.00
     1x   Epimax Junior Cream $15.00
     --------------------------------
     TOTAL (USD):         $31.00
     TOTAL (ZiG @ 40.00): ZiG 1,240.00
     Tendered:            $40.00
     Change Due:          $9.00
     Payment Method:      CASH
     --------------------------------
       Thank you for shopping GIVA!
        Exchange within 48h w/ slip
     ================================
     ```
   - Support both native ESC/POS command bytes (`0x1B 0x40`, `0x1B 0x61 0x01`, `0x1D 0x56 0x41`) and web-view printable layout formatted at 48mm width.

6. **Offline First Architecture**:
   - Local SQLite database stores products, pending transactions, and session state.
   - Auto-syncs to Firebase Firestore (`products` and `sales` collections) when Wi-Fi/4G is active.
   - When offline, sales queue locally and batch upload automatically upon reconnection.

---

## 3. RECOMMENDED TECH STACK
- **Framework**: React Native + Expo (or native Android Kotlin / Jetpack Compose).
- **Local Storage**: `@react-native-async-storage/async-storage` or `expo-sqlite`.
- **Barcode Engine**: `expo-camera` or `react-native-camera-kit` + BroadcastReceiver for Android Q3 hardware laser scan intent (`android.intent.action.SCAN`).
- **Thermal Printing**: `react-native-esc-pos-printer` or Bluetooth/USB OTG ESC-POS socket.
- **Styling**: Tailwind CSS via `nativewind` or pure StyleSheet with the luxury amber/stone GIVA palette.
