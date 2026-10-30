/**
 * Role-Based Access Control (RBAC) for GIVA Living & Baby POS & Mobile System
 * Roles: Admin (Owner), Manager, Cashier
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface UserProfile {
  role: UserRole;
  title: string;
  badge: string;
  description: string;
  defaultPin: string;
}

export const USER_ROLES: Record<UserRole, UserProfile> = {
  ADMIN: {
    role: 'ADMIN',
    title: 'Store Owner / Admin',
    badge: 'Admin (Owner)',
    description: 'Full unrestricted access: POS sales, inventory editing & deletion, quarterly P&L, bank rate adjustments, staff access management.',
    defaultPin: '2026',
  },
  MANAGER: {
    role: 'MANAGER',
    title: 'Store Manager',
    badge: 'Store Manager',
    description: 'Operational access: Stock management, add/edit/delete products, price adjustments, barcode printing, sales reports, and profit tracking.',
    defaultPin: '1984',
  },
  CASHIER: {
    role: 'CASHIER',
    title: 'Cashier / Sales Staff',
    badge: 'POS Cashier',
    description: 'Point of Sale terminal access only: Barcode scanning, cart building, customer checkout in USD & ZiG, 58mm receipt printing. Inventory & Reports are restricted.',
    defaultPin: '1234',
  },
};

/**
 * Checks if current user role has permission for a specific application tab
 */
export function canAccessTab(role: UserRole, tab: 'POS' | 'INVENTORY' | 'REPORTS'): boolean {
  switch (tab) {
    case 'POS':
      return true; // Cashier, Manager, Admin all can use POS
    case 'INVENTORY':
      return role === 'ADMIN' || role === 'MANAGER'; // Restricted from Cashier
    case 'REPORTS':
      return role === 'ADMIN' || role === 'MANAGER'; // Restricted from Cashier (full P&L restricted to Admin/Manager)
    default:
      return false;
  }
}

/**
 * Checks if current user role can modify product catalog (create or edit)
 */
export function canManageProducts(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

/**
 * Checks if current user role can delete products from inventory
 */
export function canDeleteProduct(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'MANAGER'; // Admin and Manager can remove items
}

/**
 * Checks if current user role can configure the official RBZ ZiG bank rate
 */
export function canChangeBankRate(role: UserRole): boolean {
  return role === 'ADMIN'; // Only Admin can update official bank rate
}

/**
 * Checks if current user role can view confidential quarterly net margins & expenses
 */
export function canViewFinancialPnL(role: UserRole): boolean {
  return role === 'ADMIN';
}

/**
 * Verifies a 4-digit PIN against stored role credentials
 */
export function verifyPin(
  targetRole: UserRole,
  inputPin: string,
  customPins?: Partial<Record<UserRole, string>>
): boolean {
  const expectedPin = customPins?.[targetRole] || USER_ROLES[targetRole].defaultPin;
  return inputPin.trim() === expectedPin.trim();
}
