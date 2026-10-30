import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessTab,
  canManageProducts,
  canDeleteProduct,
  canChangeBankRate,
  canViewFinancialPnL,
  verifyPin,
  USER_ROLES,
} from './role-access';

test('Cashier has POS access only and is locked out of Inventory and Reports', () => {
  assert.equal(canAccessTab('CASHIER', 'POS'), true);
  assert.equal(canAccessTab('CASHIER', 'INVENTORY'), false);
  assert.equal(canAccessTab('CASHIER', 'REPORTS'), false);
  assert.equal(canManageProducts('CASHIER'), false);
  assert.equal(canDeleteProduct('CASHIER'), false);
  assert.equal(canChangeBankRate('CASHIER'), false);
});

test('Manager has POS and Inventory access and can add/delete items but cannot change bank rate', () => {
  assert.equal(canAccessTab('MANAGER', 'POS'), true);
  assert.equal(canAccessTab('MANAGER', 'INVENTORY'), true);
  assert.equal(canAccessTab('MANAGER', 'REPORTS'), true);
  assert.equal(canManageProducts('MANAGER'), true);
  assert.equal(canDeleteProduct('MANAGER'), true);
  assert.equal(canChangeBankRate('MANAGER'), false);
});

test('Admin has full unrestricted access across all system features', () => {
  assert.equal(canAccessTab('ADMIN', 'POS'), true);
  assert.equal(canAccessTab('ADMIN', 'INVENTORY'), true);
  assert.equal(canAccessTab('ADMIN', 'REPORTS'), true);
  assert.equal(canManageProducts('ADMIN'), true);
  assert.equal(canDeleteProduct('ADMIN'), true);
  assert.equal(canChangeBankRate('ADMIN'), true);
  assert.equal(canViewFinancialPnL('ADMIN'), true);
});

test('verifyPin validates default and custom PINs correctly', () => {
  // Documented defaults: Owner 2026, Manager 1984, Cashier 1234
  assert.equal(verifyPin('ADMIN', '2026'), true);
  assert.equal(verifyPin('ADMIN', '0000'), false);
  assert.equal(verifyPin('MANAGER', '1984'), true);
  assert.equal(verifyPin('CASHIER', '1234'), true);

  // Custom PIN test
  assert.equal(verifyPin('ADMIN', '1234', { ADMIN: '1234' }), true);
  assert.equal(verifyPin('ADMIN', '2026', { ADMIN: '1234' }), false);
});
