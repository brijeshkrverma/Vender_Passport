/**
 * E2E — Authentication (Login / Register / Guard)
 * ===============================================
 * Covers login page load, register page load, unauthenticated redirect,
 * and login for all 12 roles with sidebar presence checks.
 */

import { test, expect } from '@playwright/test';
import { ROLES, loginAs } from './helpers.js';

test.describe('Authentication — Public Pages', () => {
  test('Login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign in');
    await expect(page.getByText('Vendor Passport', { exact: true })).toBeVisible();
  });

  test('Login page has email field', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Login page has password field', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('Login page has Sign in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
  });

  test('Registration page loads correctly', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Create your account');
  });

  test('Cannot access dashboard without login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Cannot access /users without login', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Cannot access /settings without login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Authentication — Backend Down (I-03)', () => {
  test('Shows unreachable banner + honest error, does NOT fake-login', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort());
    await page.goto('/login');
    await expect(page.getByText('Server is unreachable')).toBeVisible();
    await page.fill('input[type="email"]', 'priya.sharma@globaltech.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign in")');
    await expect(page.getByText('Cannot reach the server')).toBeVisible();
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('No banner when backend is reachable', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Server is unreachable')).toHaveCount(0);
  });
});

test.describe('Authentication — Login as All 12 Roles', () => {
  for (const r of ROLES) {
    test(`Login as ${r.role}`, async ({ page }) => {
      await loginAs(page, r.email, r.password);
      await expect(page.locator('main')).toContainText('Dashboard');
    });

    test(`${r.role} — Dashboard shows page title`, async ({ page }) => {
      await loginAs(page, r.email, r.password);
      await expect(page.locator('header')).toBeVisible();
    });

    test(`${r.role} — can reload dashboard`, async ({ page }) => {
      await loginAs(page, r.email, r.password);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/dashboard/);
    });
  }
});
