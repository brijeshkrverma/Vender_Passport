/**
 * E2E — Sidebar Accordion & Navigation
 * ====================================
 * The sidebar is an accordion (one section open at a time).
 * Tests verify section toggling, navigation via items, the active
 * item highlight, and role-based sidebar size differences.
 */

import { test, expect } from '@playwright/test';
import { loginAs, countSidebarItems, openSection } from './helpers.js';

test.describe('Sidebar — Accordion Behavior (Compliance Manager)', () => {
  test('Sidebar is visible after login', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Sidebar shows all section titles for admin role', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const titles = page.locator('aside .nav-section-title');
    expect(await titles.count()).toBeGreaterThanOrEqual(10);
  });

  test('Clicking a section title expands its items', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const items = await openSection(page, 'Audit Lifecycle');
    await expect(items.first()).toBeVisible({ timeout: 3000 });
    await expect(items.first()).toContainText('Audits');
  });

  test('Clicking "Audits" in the sidebar navigates to /audits', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const items = await openSection(page, 'Audit Lifecycle');
    await items.filter({ hasText: 'Audits' }).first().click();
    await page.waitForURL('**/audits');
  });

  test('Active item is highlighted after navigation', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const active = page.locator('aside button[class*="F2D9AE"]').first();
    await expect(active).toBeVisible({ timeout: 3000 });
    await expect(active).toContainText('Dashboard');
  });

  test('Accordion closes when the open section title is clicked again', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const items = await openSection(page, 'Audit Lifecycle');
    await expect(items.first()).toBeVisible({ timeout: 3000 });
    await page.locator('aside .nav-section-title').filter({ hasText: 'Audit Lifecycle' }).first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('aside button')).toHaveCount(0);
  });
});

test.describe('Sidebar — Role-Specific Visibility', () => {
  test('Auditor sidebar has fewer items than Compliance Manager', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const adminCount = await countSidebarItems(page);
    await page.goto('/login');
    await loginAs(page, 'rohit.kapoor@globaltech.com', 'password123');
    const auditorCount = await countSidebarItems(page);
    expect(auditorCount).toBeGreaterThan(0);
    expect(auditorCount).toBeLessThan(adminCount);
  });

  test('Super Admin total sidebar item count matches the permission matrix', async ({ page }) => {
    await loginAs(page, 'super.admin@globaltech.com', 'password123');
    const total = await countSidebarItems(page);
    expect(total).toBe(61);
  });

  test('Employee sidebar is limited to a subset', async ({ page }) => {
    await loginAs(page, 'employee@globaltech.com', 'password123');
    const empCount = await countSidebarItems(page);
    expect(empCount).toBeGreaterThan(0);
    expect(empCount).toBeLessThan(50);
  });
});
