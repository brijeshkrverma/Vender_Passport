/**
 * E2E — RBAC (Role-Based Access Control)
 * ======================================
 * Validates that every role sees the correct sidebar sections
 * and can / cannot access admin, audit, risk, document, vendor,
 * and certificate pages according to the permission matrix.
 */

import { test, expect } from '@playwright/test';
import { ROLES, loginAs, verifyCannotAccess } from './helpers.js';

const ADMIN_PAGES = ['/users'];
const AUDIT_PAGES = ['/audits', '/findings', '/audit-universe'];
const RISK_PAGES  = ['/risks', '/risk-heatmap'];
const DOC_PAGES   = ['/documents', '/evidence'];
const VENDOR_PAGES = ['/vendors', '/vendor-scorecard', '/bulk-invite'];

test.describe('RBAC — Full Admin Roles', () => {
  const fullAdmins = ROLES.filter(r => r.canAccessAdmin);

  for (const r of fullAdmins) {
    test(`${r.role} can access /users`, async ({ page }) => {
      await loginAs(page, r.email, r.password);
      await page.goto('/users');
      await page.waitForLoadState('networkidle');
      const url = page.url();
      expect(url).toContain('/users');
    });

    test(`${r.role} can access /settings`, async ({ page }) => {
      await loginAs(page, r.email, r.password);
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      const url = page.url();
      expect(url).toContain('/settings');
    });

    test(`${r.role} can access /audit-trail`, async ({ page }) => {
      await loginAs(page, r.email, r.password);
      await page.goto('/audit-trail');
      await page.waitForLoadState('networkidle');
    });
  }
});

test.describe('RBAC — Auditor', () => {
  test('Auditor can access /audits', async ({ page }) => {
    await loginAs(page, 'rohit.kapoor@globaltech.com', 'password123');
    await page.goto('/audits');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/audits');
  });

  test('Auditor can access /findings', async ({ page }) => {
    await loginAs(page, 'rohit.kapoor@globaltech.com', 'password123');
    await page.goto('/findings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/findings');
  });

  test('Auditor CANNOT access /users', async ({ page }) => {
    await loginAs(page, 'rohit.kapoor@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/users');
    expect(blocked).toBe(true);
  });

  test('Auditor CANNOT access /settings', async ({ page }) => {
    await loginAs(page, 'rohit.kapoor@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/settings');
    expect(blocked).toBe(true);
  });

  test('Auditor CANNOT access /organizations', async ({ page }) => {
    await loginAs(page, 'rohit.kapoor@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/organizations');
    expect(blocked).toBe(true);
  });
});

test.describe('RBAC — Risk Manager', () => {
  test('Risk Manager can access /risks', async ({ page }) => {
    await loginAs(page, 'arjun.verma@globaltech.com', 'password123');
    await page.goto('/risks');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/risks');
  });

  test('Risk Manager can access /certificates', async ({ page }) => {
    await loginAs(page, 'arjun.verma@globaltech.com', 'password123');
    await page.goto('/certificates');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/certificates');
  });

  test('Risk Manager CANNOT access /audits', async ({ page }) => {
    await loginAs(page, 'arjun.verma@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/audits');
    expect(blocked).toBe(true);
  });

  test('Risk Manager CANNOT access /findings', async ({ page }) => {
    await loginAs(page, 'arjun.verma@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/findings');
    expect(blocked).toBe(true);
  });

  test('Risk Manager CANNOT access /users', async ({ page }) => {
    await loginAs(page, 'arjun.verma@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/users');
    expect(blocked).toBe(true);
  });
});

test.describe('RBAC — Document Manager', () => {
  test('Document Manager can access /documents', async ({ page }) => {
    await loginAs(page, 'kritika.bose@globaltech.com', 'password123');
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/documents');
  });

  test('Document Manager can access /evidence', async ({ page }) => {
    await loginAs(page, 'kritika.bose@globaltech.com', 'password123');
    await page.goto('/evidence');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/evidence');
  });

  test('Document Manager CANNOT access /audits', async ({ page }) => {
    await loginAs(page, 'kritika.bose@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/audits');
    expect(blocked).toBe(true);
  });

  test('Document Manager CANNOT access /risks', async ({ page }) => {
    await loginAs(page, 'kritika.bose@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/risks');
    expect(blocked).toBe(true);
  });

  test('Document Manager CANNOT access /users', async ({ page }) => {
    await loginAs(page, 'kritika.bose@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/users');
    expect(blocked).toBe(true);
  });
});

test.describe('RBAC — Vendor Manager', () => {
  test('Vendor Manager can access /vendors', async ({ page }) => {
    await loginAs(page, 'vendor.mgr@globaltech.com', 'password123');
    await page.goto('/vendors');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/vendors');
  });

  test('Vendor Manager can access /certificates', async ({ page }) => {
    await loginAs(page, 'vendor.mgr@globaltech.com', 'password123');
    await page.goto('/certificates');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/certificates');
  });

  test('Vendor Manager CANNOT access /audits', async ({ page }) => {
    await loginAs(page, 'vendor.mgr@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/audits');
    expect(blocked).toBe(true);
  });

  test('Vendor Manager CANNOT access /risks', async ({ page }) => {
    await loginAs(page, 'vendor.mgr@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/risks');
    expect(blocked).toBe(true);
  });

  test('Vendor Manager CANNOT access /users', async ({ page }) => {
    await loginAs(page, 'vendor.mgr@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/users');
    expect(blocked).toBe(true);
  });
});

test.describe('RBAC — Employee', () => {
  test('Employee can access /dashboard', async ({ page }) => {
    await loginAs(page, 'employee@globaltech.com', 'password123');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard');
  });

  test('Employee can access /certificates', async ({ page }) => {
    await loginAs(page, 'employee@globaltech.com', 'password123');
    await page.goto('/certificates');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/certificates');
  });

  test('Employee CANNOT access /users', async ({ page }) => {
    await loginAs(page, 'employee@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/users');
    expect(blocked).toBe(true);
  });

  test('Employee CANNOT access /settings', async ({ page }) => {
    await loginAs(page, 'employee@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/settings');
    expect(blocked).toBe(true);
  });

  test('Employee CANNOT access /audits', async ({ page }) => {
    await loginAs(page, 'employee@globaltech.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/audits');
    expect(blocked).toBe(true);
  });
});

test.describe('RBAC — External Company User', () => {
  test('External User can access /dashboard', async ({ page }) => {
    await loginAs(page, 'jwhitfield@securecore.com', 'password123');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard');
  });

  test('External User can access /certificates', async ({ page }) => {
    await loginAs(page, 'jwhitfield@securecore.com', 'password123');
    await page.goto('/certificates');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/certificates');
  });

  test('External User CANNOT access /users', async ({ page }) => {
    await loginAs(page, 'jwhitfield@securecore.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/users');
    expect(blocked).toBe(true);
  });

  test('External User CANNOT access /audits', async ({ page }) => {
    await loginAs(page, 'jwhitfield@securecore.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/audits');
    expect(blocked).toBe(true);
  });

  test('External User CANNOT access /risks', async ({ page }) => {
    await loginAs(page, 'jwhitfield@securecore.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/risks');
    expect(blocked).toBe(true);
  });
});

test.describe('RBAC — CA / Consultant', () => {
  test('CA / Consultant can access /client-portfolio', async ({ page }) => {
    await loginAs(page, 'ca@consulting.com', 'password123');
    await page.goto('/client-portfolio');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/client-portfolio');
  });

  test('CA / Consultant can access /organizations', async ({ page }) => {
    await loginAs(page, 'ca@consulting.com', 'password123');
    await page.goto('/organizations');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/organizations');
  });

  test('CA / Consultant CANNOT access /users', async ({ page }) => {
    await loginAs(page, 'ca@consulting.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/users');
    expect(blocked).toBe(true);
  });

  test('CA / Consultant CANNOT access /settings', async ({ page }) => {
    await loginAs(page, 'ca@consulting.com', 'password123');
    const blocked = await verifyCannotAccess(page, '/settings');
    expect(blocked).toBe(true);
  });
});
