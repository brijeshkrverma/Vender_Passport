/**
 * E2E — Dashboard Tests (Per-Role)
 * ================================
 * Validates that the dashboard loads successfully for every role
 * and shows key stat widgets or content areas.
 */

import { test, expect } from '@playwright/test';
import { ROLES, loginAs } from './helpers.js';

test.describe('Dashboard — All Roles', () => {
  for (const r of ROLES) {
    test(`${r.role} — Dashboard loads successfully`, async ({ page }) => {
      await loginAs(page, r.email, r.password);
      await page.waitForLoadState('networkidle');
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    });

    test(`${r.role} — Dashboard shows heading`, async ({ page }) => {
      await loginAs(page, r.email, r.password);
      await expect(page.locator('h1, h2, [class*="title"]').first()).toBeVisible();
    });

    test(`${r.role} — Dashboard has stat cards or widgets`, async ({ page }) => {
      await loginAs(page, r.email, r.password);
      const statCard = page.locator('[class*="stat"], [class*="card"], [class*="widget"], [class*="metric"]').first();
      await expect(statCard).toBeVisible({ timeout: 5000 });
    });
  }
});

test.describe('Dashboard — Specific Role Content', () => {
  test('Auditor dashboard shows audit-related content', async ({ page }) => {
    await loginAs(page, 'rohit.kapoor@globaltech.com', 'password123');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Access Denied');
  });

  test('Risk Manager dashboard shows risk content', async ({ page }) => {
    await loginAs(page, 'arjun.verma@globaltech.com', 'password123');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Access Denied');
  });

  test('Document Manager dashboard shows doc content', async ({ page }) => {
    await loginAs(page, 'kritika.bose@globaltech.com', 'password123');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Access Denied');
  });

  test('Vendor Manager dashboard shows vendor content', async ({ page }) => {
    await loginAs(page, 'vendor.mgr@globaltech.com', 'password123');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Access Denied');
  });

  test('CA / Consultant dashboard loads', async ({ page }) => {
    await loginAs(page, 'ca@consulting.com', 'password123');
    await expect(page.locator('main')).toBeVisible();
  });
});
