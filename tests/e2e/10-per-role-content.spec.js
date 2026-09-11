/**
 * E2E — Per-Role Page Access & Content
 * ====================================
 * For every role: pages the permission matrix says it CAN access must
 * render (real heading, no redirect, no "Page Not Found"), and pages it
 * CANNOT access must redirect to /dashboard via the route guard.
 */

import { test, expect } from '@playwright/test';
import { ROLES, loginAs, verifyCannotAccess } from './helpers.js';

// Roles that see every core page
const FULL_ACCESS = ['Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Reviewer'];

// page → expected heading
const PAGES = {
  '/certificates': 'Certificates',
  '/reports': 'Reports',
  '/organizations': 'Organizations',
};

const ACCESS = {
  Auditor: { can: ['/certificates', '/reports'], cannot: ['/organizations', '/client-portfolio', '/users'] },
  'Risk Manager': { can: ['/certificates', '/reports', '/organizations', '/risks'], cannot: ['/findings', '/vendors', '/users'] },
  'Document Manager': { can: ['/certificates', '/reports', '/documents'], cannot: ['/organizations', '/risks', '/findings'] },
  'Vendor Manager': { can: ['/certificates', '/reports', '/organizations', '/vendors'], cannot: ['/findings', '/risks'] },
  Employee: { can: ['/certificates', '/reports', '/documents'], cannot: ['/organizations', '/risks', '/users'] },
  'External Company User': { can: ['/certificates', '/reports', '/documents'], cannot: ['/organizations', '/findings', '/users'] },
  'CA / Consultant': { can: ['/certificates', '/reports', '/organizations', '/findings', '/risks', '/documents', '/client-portfolio'], cannot: ['/vendors', '/users'] },
};

const TITLES = {
  '/certificates': 'Certificates',
  '/reports': 'Reports',
  '/organizations': 'Organizations',
  '/findings': 'Findings',
  '/risks': 'Risk Register',
  '/documents': 'Document Library',
  '/vendors': 'Vendor Management',
  '/client-portfolio': 'Client Portfolio',
};

async function expectPageRenders(page, path, title) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  expect(page.url()).toContain(path);
  await expect(page.locator('h1').filter({ hasText: title }).first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('body')).not.toContainText('Page Not Found');
}

test.describe('Per-Role Page Access', () => {
  for (const role of FULL_ACCESS) {
    for (const [path, title] of Object.entries(PAGES)) {
      test(`${role} can access ${path}`, async ({ page }) => {
        await loginAs(page, ROLES.find(r => r.role === role).email, 'password123');
        await expectPageRenders(page, path, title);
      });
    }
  }

  for (const [role, cfg] of Object.entries(ACCESS)) {
    for (const path of cfg.can) {
      test(`${role} can access ${path}`, async ({ page }) => {
        await loginAs(page, ROLES.find(r => r.role === role).email, 'password123');
        await expectPageRenders(page, path, TITLES[path]);
      });
    }
    for (const path of cfg.cannot) {
      test(`${role} CANNOT access ${path}`, async ({ page }) => {
        await loginAs(page, ROLES.find(r => r.role === role).email, 'password123');
        const blocked = await verifyCannotAccess(page, path);
        expect(blocked).toBe(true);
      });
    }
  }
});
