/**
 * E2E — Certificate Flow (List, Filters, Alerts)
 * ==============================================
 * Tests the certificates page: load for multiple roles, filter pills,
 * table content, and navigation from the sidebar.
 */

import { test, expect } from '@playwright/test';
import { loginAs, openSection } from './helpers.js';

const LOAD_ROLES = [
  { email: 'priya.sharma@globaltech.com', role: 'Compliance Manager' },
  { email: 'arjun.verma@globaltech.com', role: 'Risk Manager' },
  { email: 'vendor.mgr@globaltech.com', role: 'Vendor Manager' },
  { email: 'employee@globaltech.com', role: 'Employee' },
  { email: 'jwhitfield@securecore.com', role: 'External Company User' },
];

test.describe('Certificates — Page Load', () => {
  for (const r of LOAD_ROLES) {
    test(`Certificates page loads for ${r.role}`, async ({ page }) => {
      await loginAs(page, r.email, 'password123');
      await page.goto('/certificates');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/certificates');
      await expect(page.locator('h1.page-title')).toContainText('Certificates');
      await expect(page.locator('body')).not.toContainText('Page Not Found');
    });
  }
});

test.describe('Certificates — Content & Filters', () => {
  test('Certificate table shows seeded records', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.goto('/certificates');
    await page.waitForLoadState('networkidle');
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('Filter pills render and switch the certificate list', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.goto('/certificates');
    await page.waitForLoadState('networkidle');
    for (const label of ['All', 'Active', 'Expiring Soon', 'Expired']) {
      const pill = page.locator('.filter-pill').filter({ hasText: label }).first();
      await expect(pill).toBeVisible();
    }
    await page.locator('.filter-pill').filter({ hasText: 'Expired' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
  });

  test('Certificate page renders without error state', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.goto('/certificates');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Page Not Found');
  });
});

test.describe('Certificates — Navigation from Sidebar', () => {
  test('Navigate to Certificates via the sidebar', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const items = await openSection(page, 'Certificates & Evidence');
    await items.filter({ hasText: 'Certificates' }).first().click();
    await page.waitForURL('**/certificates');
    await expect(page.locator('h1.page-title')).toContainText('Certificates');
  });
});
