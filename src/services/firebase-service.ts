import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  increment,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, INITIAL_PRODUCTS } from '../data/inventorySeed';
import {
  SaleTransaction,
  ExpenseItem,
  CartItem,
  CurrencyType,
  DEFAULT_ZIG_BANK_RATE,
} from '../utils/pos-logic';
import type { ReceiptData } from '../components/ThermalReceiptModal';

const PRODUCTS = 'products';
const SALES = 'sales';
const EXPENSES = 'expenses';
const SETTINGS = 'settings';

export interface SnapshotMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
}

/** Fires when a queued write is finally rejected by the server (e.g. rules / permissions). */
export const WRITE_ERROR_EVENT = 'giva:write-error';
function reportWriteError(what: string, err: unknown) {
  const msg = (err as any)?.message || String(err);
  console.error(`[Firebase] ${what} failed:`, err);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WRITE_ERROR_EVENT, { detail: `${what}: ${msg}` }));
  }
}

/** Unique numeric id that is safe to generate on several offline devices at once. */
export function newId(): number {
  return Date.now() * 10 + Math.floor(Math.random() * 10);
}

const nowIso = () => new Date().toISOString();
const stripUndefined = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/* ------------------------------------------------------------------ */
/* Seeding + one-time data repair                                      */
/* ------------------------------------------------------------------ */

/**
 * Seeds the catalogue ONLY when the server confirms the database has never been
 * seeded. (Reading the local cache while offline looks "empty" and would
 * overwrite real stock levels once the device reconnects.)
 * Also repairs products whose cost was saved in rand instead of USD.
 */
export async function seedInitialFirestoreData(): Promise<void> {
  try {
    const metaRef = doc(db, SETTINGS, 'meta');
    const meta = await getDocFromServer(metaRef); // throws if offline -> we skip safely
    const metaData = meta.exists() ? (meta.data() as any) : {};

    if (!metaData.seeded) {
      const existing = await getDocsFromServer(collection(db, PRODUCTS));
      if (existing.empty) {
        console.log('[Firebase] Seeding initial catalogue...');
        for (let i = 0; i < INITIAL_PRODUCTS.length; i += 400) {
          const batch = writeBatch(db);
          INITIAL_PRODUCTS.slice(i, i + 400).forEach((p) =>
            batch.set(doc(db, PRODUCTS, String(p.id)), p)
          );
          await batch.commit();
        }
        await setDoc(
          doc(db, SETTINGS, 'bankRate'),
          { bankRate: DEFAULT_ZIG_BANK_RATE, updatedAt: nowIso(), currencyPair: 'USD/ZiG' },
          { merge: true }
        );
      }
      await setDoc(metaRef, { seeded: true, seededAt: nowIso() }, { merge: true });
    }

    if (!metaData.costFixV1) {
      const snap = await getDocsFromServer(collection(db, PRODUCTS));
      const seedById = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p]));
      const fixes: { id: number; costUsd: number }[] = [];
      snap.forEach((d) => {
        const p = d.data() as Product;
        const seed = seedById.get(p.id);
        // Old records: no USD cost, and "cost" higher than the USD selling price (it was rand).
        if (seed && p.costPriceUsd === undefined && p.costPrice >= p.sellingPriceUsd) {
          fixes.push({ id: p.id, costUsd: seed.costPriceUsd! });
        }
      });
      for (let i = 0; i < fixes.length; i += 400) {
        const batch = writeBatch(db);
        fixes.slice(i, i + 400).forEach((f) =>
          batch.update(doc(db, PRODUCTS, String(f.id)), {
            costPrice: f.costUsd,
            costPriceUsd: f.costUsd,
            sellingPrice: seedById.get(f.id)!.sellingPriceUsd,
          })
        );
        await batch.commit();
      }
      await setDoc(metaRef, { costFixV1: true }, { merge: true });
    }
  } catch (err) {
    console.warn('[Firebase] Seed/repair skipped (offline or no permission):', (err as any)?.code || err);
  }
}

/* ------------------------------------------------------------------ */
/* Live subscriptions                                                  */
/* ------------------------------------------------------------------ */

export function subscribeToProducts(
  onUpdate: (products: Product[], meta: SnapshotMeta) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, PRODUCTS),
    { includeMetadataChanges: true },
    (snap) => {
      const items: Product[] = [];
      snap.forEach((d) => items.push(d.data() as Product));
      items.sort((a, b) => a.id - b.id);
      onUpdate(items, {
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
      });
    },
    (err) => {
      console.warn('[Firebase] products listener error:', err);
      onError?.(err);
    }
  );
}

export function subscribeToBankRate(onUpdate: (rate: number) => void): Unsubscribe {
  return onSnapshot(
    doc(db, SETTINGS, 'bankRate'),
    (snap) => {
      if (snap.exists()) {
        const r = Number((snap.data() as any).bankRate);
        if (r > 0) onUpdate(r);
      }
    },
    (err) => console.warn('[Firebase] bank-rate listener error:', err)
  );
}

/** Newest sales first (activity feed). */
export function subscribeToRecentSales(
  count: number,
  onUpdate: (sales: SaleTransaction[], meta: SnapshotMeta) => void
): Unsubscribe {
  const q = query(collection(db, SALES), orderBy('createdAt', 'desc'), limit(count));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      const items: SaleTransaction[] = [];
      snap.forEach((d) => items.push(d.data() as SaleTransaction));
      onUpdate(items, {
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
      });
    },
    (err) => console.warn('[Firebase] recent-sales listener error:', err)
  );
}

/** Every sale in a calendar year (P&L + Excel ledger). */
export function subscribeToSalesForYear(
  year: number,
  onUpdate: (sales: SaleTransaction[]) => void
): Unsubscribe {
  const q = query(
    collection(db, SALES),
    where('createdAt', '>=', `${year}-01-01`),
    where('createdAt', '<', `${year + 1}-01-01`)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: SaleTransaction[] = [];
      snap.forEach((d) => items.push(d.data() as SaleTransaction));
      items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      onUpdate(items);
    },
    (err) => console.warn('[Firebase] sales listener error:', err)
  );
}

export function subscribeToExpenses(onUpdate: (expenses: ExpenseItem[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, EXPENSES),
    (snap) => {
      const items: ExpenseItem[] = [];
      snap.forEach((d) => items.push(d.data() as ExpenseItem));
      items.sort((a, b) => (a.expenseDate < b.expenseDate ? 1 : -1));
      onUpdate(items);
    },
    (err) => console.warn('[Firebase] expenses listener error:', err)
  );
}

/* ------------------------------------------------------------------ */
/* Writes. NOTE: we never `await` a Firestore commit in the UI path:  */
/* offline, the promise only settles on reconnect. Local cache and    */
/* listeners update instantly; failures are reported via an event.    */
/* ------------------------------------------------------------------ */

export async function updateBankRateInFirestore(newRate: number): Promise<void> {
  if (!(newRate > 0)) throw new Error('Bank rate must be a positive number.');
  setDoc(
    doc(db, SETTINGS, 'bankRate'),
    { bankRate: Number(newRate.toFixed(4)), updatedAt: nowIso(), currencyPair: 'USD/ZiG' },
    { merge: true }
  ).catch((e) => reportWriteError('Bank rate update', e));
}

/**
 * Relative stock change (+restock / -write-off). Uses an atomic increment so two
 * devices (or a sale ringing up while you restock) never overwrite each other.
 */
export async function adjustProductStock(id: number, delta: number): Promise<void> {
  if (!delta) return;
  updateDoc(doc(db, PRODUCTS, String(id)), {
    stockQuantity: increment(delta),
    updatedAt: nowIso(),
  }).catch((e) => reportWriteError('Stock adjustment', e));
}

export interface NewProductInput extends Partial<Product> {}

export async function createProduct(
  input: NewProductInput,
  existing: Product[],
  bankRate: number
): Promise<Product> {
  const barcode = String(input.barcode ?? '').trim();
  const name = String(input.name ?? '').trim();
  const usd = Number(input.sellingPriceUsd ?? input.sellingPrice ?? 0);
  if (!barcode || !name || !(usd > 0)) {
    throw new Error('Barcode, Name and a Selling Price in USD are required.');
  }
  const dup = existing.find((p) => p.barcode === barcode);
  if (dup) throw new Error(`Barcode ${barcode} already exists (${dup.name}).`);

  const cost = Number(input.costPriceUsd ?? input.costPrice ?? Number((usd * 0.6).toFixed(2)));
  const ts = nowIso();
  const product: Product = stripUndefined({
    id: newId(),
    barcode,
    name,
    category: input.category || 'General Merchandise',
    sizeVariant: input.sizeVariant || '',
    costPrice: cost,
    costPriceUsd: cost,
    sellingPrice: usd,
    sellingPriceUsd: usd,
    sellingPriceZig: Number((usd * bankRate).toFixed(2)),
    stockQuantity: Math.max(0, Number(input.stockQuantity) || 0),
    lowStockThreshold: Number(input.lowStockThreshold) >= 1 ? Number(input.lowStockThreshold) : 5,
    imageUrl: input.imageUrl || '',
    createdAt: ts,
    updatedAt: ts,
  });
  setDoc(doc(db, PRODUCTS, String(product.id)), product).catch((e) =>
    reportWriteError('Create product', e)
  );
  return product;
}

export async function updateProduct(
  id: number,
  patch: Partial<Product>,
  existing: Product[],
  bankRate: number
): Promise<void> {
  const current = existing.find((p) => p.id === id);
  if (!current) throw new Error('Product not found.');
  if (patch.barcode !== undefined) {
    const dup = existing.find((p) => p.barcode === String(patch.barcode).trim() && p.id !== id);
    if (dup) throw new Error(`Barcode ${patch.barcode} already used by ${dup.name}.`);
  }
  const next: Partial<Product> = { ...patch, updatedAt: nowIso() };
  const usd = patch.sellingPriceUsd ?? patch.sellingPrice;
  if (usd !== undefined) {
    next.sellingPrice = Number(usd);
    next.sellingPriceUsd = Number(usd);
    next.sellingPriceZig = Number((Number(usd) * bankRate).toFixed(2));
  }
  const cost = patch.costPriceUsd ?? patch.costPrice;
  if (cost !== undefined) {
    next.costPrice = Number(cost);
    next.costPriceUsd = Number(cost);
  }
  // Stock is changed ONLY through adjustProductStock (atomic), never overwritten here.
  delete next.stockQuantity;
  delete (next as any).id;
  updateDoc(doc(db, PRODUCTS, String(id)), stripUndefined(next) as any).catch((e) =>
    reportWriteError('Update product', e)
  );
}

export async function deleteProductFromFirestore(id: number): Promise<void> {
  deleteDoc(doc(db, PRODUCTS, String(id))).catch((e) => reportWriteError('Delete product', e));
}

/* ------------------------------------------------------------------ */
/* Checkout                                                            */
/* ------------------------------------------------------------------ */

const TERMINAL_KEY = 'giva_terminal_id';
export function getTerminalId(): string {
  try {
    return localStorage.getItem(TERMINAL_KEY) || 'Q3-SMART-01';
  } catch {
    return 'Q3-SMART-01';
  }
}

function nextReceiptNo(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
  const key = `giva_rcpt_${ymd}`;
  let n = 1;
  try {
    n = (parseInt(localStorage.getItem(key) || '0', 10) || 0) + 1;
    localStorage.setItem(key, String(n));
  } catch {}
  return `GIVA-${ymd}-${String(n).padStart(3, '0')}`;
}

export interface CheckoutInput {
  cart: CartItem[];
  products: Product[];
  paymentMethod: SaleTransaction['paymentMethod'];
  amountTendered: number;
  currency: CurrencyType;
  bankRate: number;
  cashierName: string;
}

/**
 * Records a sale and deducts stock in ONE atomic batch. Works with no signal:
 * the batch is stored on the device and uploaded when a connection returns.
 * Stock uses increment(-qty), so simultaneous sales on several devices add up
 * correctly instead of overwriting each other.
 */
export function checkoutSale(input: CheckoutInput): { sale: SaleTransaction; receipt: ReceiptData } {
  const { cart, products, paymentMethod, currency, bankRate, cashierName } = input;
  if (!cart.length) throw new Error('Cart is empty.');
  const isZig = currency === 'ZiG';

  const lines = cart.map((item) => {
    const p = products.find((x) => x.id === item.id);
    if (!p) throw new Error(`"${item.name}" is no longer in the catalogue.`);
    if (p.stockQuantity < item.quantity) {
      throw new Error(`Not enough stock for "${p.name}". Available: ${p.stockQuantity}.`);
    }
    const costUsd = p.costPriceUsd || Number((p.sellingPriceUsd * 0.58).toFixed(2));
    const unitPrice = isZig ? Number((p.sellingPriceUsd * bankRate).toFixed(2)) : p.sellingPriceUsd;
    const unitCost = isZig ? Number((costUsd * bankRate).toFixed(2)) : costUsd;
    return {
      productId: p.id,
      barcode: p.barcode,
      name: p.name,
      quantity: item.quantity,
      unitCost,
      unitPrice,
      subtotal: Number((unitPrice * item.quantity).toFixed(2)),
    };
  });

  const totalAmount = Number(lines.reduce((s, l) => s + l.subtotal, 0).toFixed(2));
  const tendered = Number.isFinite(input.amountTendered) && input.amountTendered > 0 ? input.amountTendered : totalAmount;
  const changeAmount = Number(Math.max(0, tendered - totalAmount).toFixed(2));
  const createdAt = nowIso();
  const receiptNo = nextReceiptNo();

  const sale: SaleTransaction = {
    id: newId(),
    receiptNo,
    totalAmount,
    paymentMethod,
    amountTendered: tendered,
    changeAmount,
    currency,
    bankRate,
    createdAt,
    cashierName,
    terminalId: getTerminalId(),
    items: lines,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, SALES, String(sale.id)), sale);
  lines.forEach((l) =>
    batch.update(doc(db, PRODUCTS, String(l.productId)), {
      stockQuantity: increment(-l.quantity),
      updatedAt: createdAt,
    })
  );
  batch.commit().catch((e) => reportWriteError(`Sale ${receiptNo}`, e));

  const receipt: ReceiptData = {
    receiptNo,
    storeName: 'GIVA LIVING & BABY',
    tagline: 'For your Home. For your baby for His glory.',
    timestamp: createdAt,
    paymentMethod,
    items: lines,
    totalAmount,
    currency,
    bankRate,
    amountTendered: tendered,
    changeAmount,
    cashierName,
  };
  return { sale, receipt };
}

/* ------------------------------------------------------------------ */
/* Expenses                                                            */
/* ------------------------------------------------------------------ */

export async function addExpenseToFirestore(expense: Omit<ExpenseItem, 'id'> & { id?: number }): Promise<ExpenseItem> {
  const full: ExpenseItem = { ...expense, id: expense.id ?? newId() } as ExpenseItem;
  setDoc(doc(db, EXPENSES, String(full.id)), full).catch((e) => reportWriteError('Add expense', e));
  return full;
}

export async function deleteExpenseFromFirestore(id: number): Promise<void> {
  deleteDoc(doc(db, EXPENSES, String(id))).catch((e) => reportWriteError('Delete expense', e));
}

/* ------------------------------------------------------------------ */
/* Connectivity helper                                                 */
/* ------------------------------------------------------------------ */

import { disableNetwork, enableNetwork, waitForPendingWrites } from 'firebase/firestore';

/** Manual "retry sync": drops and re-opens the connection (handy after a weak-signal spell). */
export async function forceReconnect(): Promise<void> {
  try {
    await disableNetwork(db);
    await enableNetwork(db);
  } catch (e) {
    console.warn('[Firebase] reconnect failed:', e);
  }
}

export { waitForPendingWrites };
