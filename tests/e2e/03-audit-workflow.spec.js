/**
 * E2E — Audit Workflow (List → Filter → Detail)
 * ==============================================
 * Tests what actually exists: the Audits list with filter pills,
 * navigation to a real audit detail page, and related module pages.
 * NOTE: audit creation and row-click navigation are NOT implemented
 * in the UI yet (rows only console.log on click), so those flows are
 * not asserted as working.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('Audit Workflow', () => {
  test('Audits list page loads with heading and table', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.goto('/audits');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1.page-title')).toContainText('Audits');
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('Audits filter pills render and switch status', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.goto('/audits');
    await page.waitForLoadState('networkidle');
    for (const label of ['All', 'Planning', 'In Progress', 'Closed']) {
      const pill = page.locator('.pill-tab button').filter({ hasText: label }).first();
      await expect(pill).toBeVisible();
    }
    await page.locator('.pill-tab button').filter({ hasText: 'Closed' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
  });

  test('Audit detail page loads for a real audit ID', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const list = await page.evaluate(async () => {
      const token = localStorage.getItem('vp_token');
      const res = await fetch('/api/audits', { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    });
    const audits = Array.isArray(list) ? list : (list.data || list.results || []);
    const id = audits[0]?._id || audits[0]?.id;
    expect(id).toBeTruthy();
    await page.goto(`/audits/${id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Page Not Found');
    expect(page.url()).toContain('/audits/');
  });

  test('Findings page loads for Compliance Manager', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.goto('/findings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/findings');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Page Not Found');
  });

  test('CAPA page loads for Compliance Manager', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.goto('/capa');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Page Not Found');
  });

  test('Audit Universe page loads', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.goto('/audit-universe');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Page Not Found');
  });
});
