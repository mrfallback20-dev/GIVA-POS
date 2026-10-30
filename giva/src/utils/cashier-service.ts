/**
 * Cashier Management Service for GIVA Q3 Smart POS
 * Ensures cashiers are remembered persistently without forcing re-registration on every launch.
 */

export const DEFAULT_CASHIERS = [
  'Cathy M.',
  'Tatenda N.',
  'Chipo K.',
];

const STORAGE_KEY_CASHIERS = 'giva_saved_cashiers';
const STORAGE_KEY_ACTIVE_CASHIER = 'giva_active_cashier_name';

/**
 * Filter out any legacy admin/manager entries from cashier roster
 */
function sanitizeCashiers(list: string[]): string[] {
  const filtered = list.filter(
    (name) =>
      name &&
      !name.toLowerCase().includes('admin') &&
      !name.toLowerCase().includes('owner') &&
      !name.toLowerCase().includes('manager')
  );
  return filtered.length > 0 ? filtered : DEFAULT_CASHIERS;
}

/**
 * Retrieves the persistent list of cashiers from localStorage
 */
export function getSavedCashiers(): string[] {
  if (typeof window === 'undefined') return DEFAULT_CASHIERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CASHIERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const clean = sanitizeCashiers(parsed);
        return clean;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved cashiers, using defaults:', e);
  }
  // Initialize with defaults if empty
  try {
    localStorage.setItem(STORAGE_KEY_CASHIERS, JSON.stringify(DEFAULT_CASHIERS));
  } catch (e) {}
  return DEFAULT_CASHIERS;
}

/**
 * Saves a new cashier to the persistent list and makes them active
 */
export function saveCashier(name: string): string[] {
  const cleanName = name.trim();
  if (!cleanName) return getSavedCashiers();

  const current = getSavedCashiers();
  const exists = current.some((c) => c.toLowerCase() === cleanName.toLowerCase());
  const updated = exists ? current : [...current, cleanName];

  try {
    localStorage.setItem(STORAGE_KEY_CASHIERS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_ACTIVE_CASHIER, cleanName);
  } catch (e) {}

  return updated;
}

/**
 * Removes a cashier from the roster (keeps at least 1)
 */
export function removeCashier(name: string): string[] {
  const current = getSavedCashiers();
  if (current.length <= 1) return current;

  const updated = current.filter((c) => c !== name);
  try {
    localStorage.setItem(STORAGE_KEY_CASHIERS, JSON.stringify(updated));
    if (getActiveCashier() === name) {
      setActiveCashier(updated[0]);
    }
  } catch (e) {}
  return updated;
}

/**
 * Gets the currently active cashier name (defaults to first available or Cathy M.)
 */
export function getActiveCashier(): string {
  if (typeof window === 'undefined') return 'Cathy M.';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_CASHIER);
    if (saved && saved.trim()) {
      return saved.trim();
    }
    const all = getSavedCashiers();
    const fallback = all[0] || 'Cathy M.';
    localStorage.setItem(STORAGE_KEY_ACTIVE_CASHIER, fallback);
    return fallback;
  } catch {
    return 'Cathy M.';
  }
}

/**
 * Sets the active cashier
 */
export function setActiveCashier(name: string): void {
  if (typeof window === 'undefined') return;
  const clean = name.trim();
  if (!clean) return;
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_CASHIER, clean);
    // Also mark active session flag
    sessionStorage.setItem('giva_q3_cashier_active', 'true');
  } catch (e) {}
}
