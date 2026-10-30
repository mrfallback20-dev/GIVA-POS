# GIVA Living & Baby – Q3 POS + Store Manager

Two installable apps from one codebase. **All data lives in Firebase Firestore**, so the
Q3 terminal and your phone stay in sync over *any* Wi-Fi or mobile data, and both keep working
with no signal (changes queue on the device and upload automatically).

| App | Address | Who |
|---|---|---|
| App 1 – Q3 SMART POS | `/pos` | Cashier (Cathy / PIN 1234) |
| App 2 – Store Manager & P&L | `/manager` | Owner PIN 2026, Manager PIN 1984 |

## One-time setup (about 10 minutes)

1. **Firebase console** → your project (`gen-lang-client-0449395815`) → *Authentication* →
   *Sign-in method* → enable **Anonymous**. (Devices sign in silently; the database is no longer open to everyone.)
2. *Hosting* → *Get started* (enables free HTTPS hosting). Phones need HTTPS to install the app.
3. In this folder:
   ```bash
   npm install
   npx firebase-tools login
   npm run deploy        # builds, then publishes the apps and the new security rules
   ```
4. On the **Q3 terminal** open `https://<your-project>.web.app/pos` in Chrome → menu → *Install app*.
   On **your phone** open `https://<your-project>.web.app/manager` → *Install app* (Safari → Share → Add to Home Screen on iPhone).
5. Open each app once while online so it can cache itself for offline use.

Prefer another host? `npm run build` and upload the `dist` folder to Netlify / Vercel / Cloudflare Pages.

Local testing: `npm run dev` then open `/pos.html` and `/manager.html`.

## What was fixed

- **Sales, expenses and reports lived only in the Express server's memory** (lost on every restart, invisible to a phone on mobile data). Everything now goes through Firestore; the server is optional.
- **Two competing sources of truth** (REST server + Firestore) for stock – removed.
- **Offline sales were impossible**; now a sale + stock deduction is one atomic batch that is stored on the terminal and uploaded on reconnect.
- **Lost stock updates**: restocks overwrote stock with an absolute number. Now stock changes are atomic `+/-` increments, so a sale made while you restock is never erased.
- **Firestore transaction bug**: multi-item carts failed (reads after writes).
- **Offline "seed" could overwrite real stock** after reconnecting; seeding now only happens once, confirmed by the server.
- **All 92 seed products had cost in rand but price in USD** (every item looked like a loss). Converted, and existing database records are repaired once automatically.
- **Service worker** intercepted Firebase traffic and cached fake "offline" API answers; rewritten (app shell + images only). Duplicate service workers removed.
- **Mobile-network friendly**: Firestore auto-falls back to long-polling when a carrier blocks streaming.
- Two apps are now genuinely separate installs (`/pos`, `/manager`) with their own manifests; the cashier app has no manager/rate/APK links.
- Quarterly P&L, Excel (3 sheets) and 58mm slip are built on the device, so they work offline.
- Stale rate in the rate editor, stale unit test (old PINs), hard-coded "Cloud Sync Active" label, WebSocket/console monkey-patches in `index.html`.
- Removed the two identical, unverifiable `.apk` files.

## Honest limits

- PINs are a lock on the device, **not** server accounts. Anyone who reaches the URL and signs in anonymously can read the data. For real per-user security, add Firebase email sign-in later.
- This is a web app (PWA), not a native APK. For a Play-Store-style APK wrap each URL with [PWABuilder](https://www.pwabuilder.com) or Bubblewrap. Direct ESC/POS printing to the Q3's built-in printer, and the hardware laser-scan trigger, need a native wrapper/bridge from your Q3 vendor; the browser print dialog and camera scanner work today.
- Offline oversell: two devices can both sell the last unit while offline; stock can show negative until reconciled.
- Manager role can still delete products (the original tests expect it; the written spec says owner-only). Tell me which you want.
- Product photos are stored inside Firestore (compressed). Fine for ~100 items; use Firebase Storage if the catalogue grows a lot.
