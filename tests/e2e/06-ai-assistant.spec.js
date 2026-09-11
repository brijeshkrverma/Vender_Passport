/**
 * E2E — AI Assistant Panel
 * ========================
 * The assistant FAB opens a slide-over panel. The backend pipeline
 * (backend/assistantService.js) classifies the message, queries the
 * org-scoped data, and returns a real answer. These tests assert the
 * panel renders a live response rather than a raw error.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

const FAB = '[aria-label="Open assistant"]';
const PANEL = '.assistant-panel';

test.describe('AI Assistant — Panel & FAB', () => {
  test('FAB button is visible on dashboard', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await expect(page.locator(FAB)).toBeVisible();
  });

  test('Clicking FAB opens the assistant panel', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.locator(FAB).click();
    await expect(page.locator(PANEL)).toHaveClass(/translate-x-0/);
    await expect(page.locator(PANEL)).toContainText('Ask Passport');
  });

  test('Assistant panel can be closed', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.locator(FAB).click();
    await expect(page.locator(PANEL)).toHaveClass(/translate-x-0/);
    await page.locator(PANEL).locator('[aria-label="Close"]').click();
    await expect(page.locator(PANEL)).toHaveClass(/translate-x-full/);
  });

  test('Assistant panel shows suggested prompts', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.locator(FAB).click();
    await expect(page.locator(PANEL)).toContainText('Ask Passport');
    const prompts = page.locator(PANEL).getByRole('button').filter({ hasText: 'Which certificates expire this month?' });
    await expect(prompts.first()).toBeVisible();
  });

  test('Panel advertises that the assistant is in beta', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.locator(FAB).click();
    await expect(page.locator(PANEL)).toContainText('Beta');
  });

  test('Sending a message returns a real assistant answer (no raw error)', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await page.locator(FAB).click();
    const panel = page.locator(PANEL);
    const input = panel.locator('textarea').first();
    await input.fill('Which certificates expire this month?');
    await input.press('Enter');
    await expect(panel).toContainText('Which certificates expire this month?');
    await expect(panel).toContainText('Certificates', { timeout: 15000 });
    await expect(panel).not.toContainText('Internal Server Error');
    await expect(panel).not.toContainText('still in beta');
  });

  test('Assistant FAB is available from multiple pages', async ({ page }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    await expect(page.locator(FAB)).toBeVisible();
    await page.goto('/audits');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(FAB)).toBeVisible();
  });
});
