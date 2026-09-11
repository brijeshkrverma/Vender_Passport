/**
 * E2E — Notifications & Global Search
 * ====================================
 * Tests the real topbar components: global search input + results,
 * the notification bell + dropdown panel, and the Notifications page.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('Notifications & Search', () => {
  test('Global search input exists in the topbar', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const search = page.locator('header input[type="search"]');
    await expect(search).toBeVisible();
    await expect(search).toHaveAttribute('placeholder', /Search/);
  });

  test('Global search returns seeded results', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.locator('header input[type="search"]').fill('ISO');
    const results = page.locator('header div.absolute button').filter({ hasText: /ISO/ });
    await expect(results.first()).toBeVisible({ timeout: 8000 });
  });

  test('Bell icon opens the notification panel', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.locator('header button:has(span.bg-danger)').click();
    const panel = page.locator('div.absolute.top-14').first();
    await expect(panel).toBeVisible({ timeout: 5000 });
    await expect(panel).toContainText('Mark all read');
    const items = panel.locator('div.flex.gap-3');
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('Notifications page loads for Compliance Manager', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/notifications');
    await expect(page.locator('h1.page-title')).toContainText('Notifications');
    await expect(page.locator('body')).not.toContainText('Page Not Found');
  });
});
