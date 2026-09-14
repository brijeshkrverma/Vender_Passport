/**
 * E2E Test Helpers — Vendor Passport
 * ==================================
 * Shared utilities: role definitions, real login helper, sidebar counting
 * (accordion-aware), and strict access-control assertions.
 */

const { expect } = require('@playwright/test');

/**
 * `canAccessAdmin`  — may open /settings and /audit-trail.
 * `canManageUsers`  — may open /users. NARROWER: `/api/users` is Super Admin and
 *                     Organization Admin only, so a Compliance Manager reaching
 *                     that page would be refused. The two used to be one flag,
 *                     which is why this suite asserted access the API refuses.
 */
const ROLES = [
  { role: 'Super Admin', email: 'super.admin@globaltech.com', password: 'password123', name: 'Admin User', sidebarItems: 61, canAccessAdmin: true, canManageUsers: true },
  { role: 'Organization Admin', email: 'org.admin@globaltech.com', password: 'password123', name: 'Org Admin', sidebarItems: 61, canAccessAdmin: true, canManageUsers: true },
  { role: 'Compliance Manager', email: 'priya.sharma@globaltech.com', password: 'password123', name: 'Priya Sharma', sidebarItems: 61, canAccessAdmin: true, canManageUsers: false },
  { role: 'Audit Manager', email: 'meera.nair@globaltech.com', password: 'password123', name: 'Meera Nair', sidebarItems: 51, canAccessAdmin: false },
  { role: 'Auditor', email: 'rohit.kapoor@globaltech.com', password: 'password123', name: 'Rohit Kapoor', sidebarItems: 35, canAccessAdmin: false },
  { role: 'Reviewer', email: 'reviewer@globaltech.com', password: 'password123', name: 'Reviewer User', sidebarItems: 40, canAccessAdmin: false },
  { role: 'Risk Manager', email: 'arjun.verma@globaltech.com', password: 'password123', name: 'Arjun Verma', sidebarItems: 16, canAccessAdmin: false },
  { role: 'Document Manager', email: 'kritika.bose@globaltech.com', password: 'password123', name: 'Kritika Bose', sidebarItems: 12, canAccessAdmin: false },
  { role: 'Vendor Manager', email: 'vendor.mgr@globaltech.com', password: 'password123', name: 'Vendor Manager', sidebarItems: 25, canAccessAdmin: false },
  { role: 'Employee', email: 'employee@globaltech.com', password: 'password123', name: 'Employee User', sidebarItems: 15, canAccessAdmin: false },
  { role: 'External Company User', email: 'jwhitfield@securecore.com', password: 'password123', name: 'External User', sidebarItems: 15, canAccessAdmin: false },
  { role: 'CA / Consultant', email: 'ca@consulting.com', password: 'password123', name: 'CA Consultant', sidebarItems: 18, canAccessAdmin: false },
];

async function loginAs(page, email, password) {
  await page.goto('/login', { waitUntil: 'commit' });
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  await expect(page.locator('main')).toBeVisible();
  await dismissOnboarding(page, email);
}

/**
 * Roles the first-run wizard is offered to — mirrors `SETUP_ROLES` in
 * `components/OnboardingWizard.jsx`.
 */
const ONBOARDED_ROLES = ['Super Admin', 'Organization Admin', 'Compliance Manager'];

/**
 * Close the first-run wizard, for the accounts that get one.
 *
 * It is a modal with a full-screen backdrop, so while it is open every other
 * click in the suite lands on that backdrop and times out with
 * "subtree intercepts pointer events".
 *
 * Two things make this fiddly, and both have already cost a debugging session:
 *
 *   1. It used to be suppressed by writing `sessionStorage.vp_onboarding_done`
 *      before signing in. That stopped working when the flag became per-user
 *      and moved to `localStorage` — and the failures pointed at the assistant,
 *      not at onboarding.
 *   2. The wizard decides whether to open in an effect, so for one tick after
 *      the dashboard renders it is not there yet. Asking `isVisible()` at that
 *      instant answers "no", the dismissal is skipped, and the modal appears a
 *      moment later over everything.
 *
 * So: wait for it, but only for the roles that actually get it — otherwise
 * every login in the suite would pay the timeout for a dialog that was never
 * coming.
 */
async function dismissOnboarding(page, email) {
  const role = ROLES.find((r) => r.email === email)?.role;
  if (role && !ONBOARDED_ROLES.includes(role)) return;

  const skip = page.locator('button:has-text("Skip setup")');
  try {
    await skip.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    return;                       // already dismissed for this account
  }
  await skip.click();
  await expect(skip).toBeHidden({ timeout: 5000 });
}

/**
 * Sidebar renders one expanded section at a time (accordion).
 * Open every section title in turn and accumulate the item buttons,
 * so the total equals the role's full sidebar item count.
 */
async function countSidebarItems(page) {
  const titles = page.locator('aside .nav-section-title');
  const n = await titles.count();
  let total = 0;
  for (let i = 0; i < n; i++) {
    const title = titles.nth(i);
    const chevron = title.locator('span').last();
    const glyph = (await chevron.textContent()).trim();
    if (glyph !== '▼') {
      await title.click();
      await page.waitForTimeout(120);
    }
    total += await page.locator('aside button').count();
  }
  return total;
}

/**
 * Expand the given section (by title) and return its item buttons locator.
 */
async function openSection(page, name) {
  const title = page.locator('aside .nav-section-title').filter({ hasText: name }).first();
  await expect(title).toBeVisible();
  await title.click();
  return page.locator('aside button');
}

/**
 * True when the SPA redirects away from `path` (route guard → /dashboard or /login).
 * Uses waitForURL instead of a fixed sleep so it is deterministic.
 */
async function verifyCannotAccess(page, path) {
  await page.goto(path);
  try {
    await page.waitForURL(/\/dashboard|\/login/, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

module.exports = { ROLES, loginAs, dismissOnboarding, countSidebarItems, openSection, verifyCannotAccess };
