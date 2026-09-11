/**
 * E2E — Full End-to-End Workflow
 * ==============================
 * A single walk-through of the main modules as Compliance Manager,
 * then a role switch to Auditor with RBAC verification. Only asserts
 * behavior that actually exists in the app.
 */

import { test, expect } from '@playwright/test';
import { loginAs, verifyCannotAccess, countSidebarItems } from './helpers.js';

test.describe('Full End-to-End Workflow', () => {
  test('CORE WORKFLOW — login, modules, assistant, role switch, RBAC', async ({ page }) => {
    // STEP 1: Login as Compliance Manager
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await expect(page.locator('h1.page-title')).toContainText('Dashboard');

    // STEP 2: Dashboard shows stat widgets
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[class*="stat"], [class*="card"], [class*="metric"]').first()).toBeVisible({ timeout: 5000 });

    // STEP 3: Audits list renders
    await page.goto('/audits');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/audits');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });

    // STEP 4: Findings renders
    await page.goto('/findings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/findings');
    await expect(page.locator('main')).toBeVisible();

    // STEP 5: CAPA renders
    await page.goto('/capa');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/capa');
    await expect(page.locator('main')).toBeVisible();

    // STEP 6: Certificates renders with records
    await page.goto('/certificates');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });

    // STEP 7: Risk register renders
    await page.goto('/risks');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/risks');
    await expect(page.locator('main')).toBeVisible();

    // STEP 8: Controls renders
    await page.goto('/controls');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Page Not Found');

    // STEP 9: Documents renders
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Page Not Found');

    // STEP 10: AI assistant opens and renders the panel
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.locator('[aria-label="Open assistant"]').click();
    await expect(page.locator('.assistant-panel')).toHaveClass(/translate-x-0/);
    await expect(page.locator('.assistant-panel')).toContainText('Ask Passport');

    // STEP 11: Settings renders
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Page Not Found');

    // STEP 12: Logout → login as Auditor
    await page.goto('/login');
    await loginAs(page, 'rohit.kapoor@globaltech.com', 'password123');
    await expect(page.locator('h1.page-title')).toContainText('Dashboard');

    // STEP 13: Auditor sidebar has fewer items than a full admin
    const auditorCount = await countSidebarItems(page);
    expect(auditorCount).toBeGreaterThan(0);
    expect(auditorCount).toBeLessThan(61);

    // STEP 14: Auditor CANNOT access /users (route guard redirects)
    const blocked = await verifyCannotAccess(page, '/users');
    expect(blocked).toBe(true);
  }, { timeout: 120_000 });
});
