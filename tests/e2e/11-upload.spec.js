/**
 * E2E — File Upload (I-11 / R25)
 * ==============================
 * Tests the real upload flow on Evidence + Documents pages:
 * upload a file via the modal, see it appear in the list, download it back,
 * verify tenant scoping of the download endpoint, and confirm that
 * disallowed file types are rejected by the server.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

const UNIQ = Date.now();

async function getToken(page) {
  return page.evaluate(() => localStorage.getItem('vp_token') || '');
}

async function originOf(page) {
  return page.evaluate(() => location.origin);
}

test.describe('File upload (I-11/R25)', () => {
  test('Evidence: upload via modal, appears in list, downloads back', async ({ page, request }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const token = await getToken(page);
    const origin = await originOf(page);
    const name = `E2E Evidence ${UNIQ}`;

    await page.goto('/evidence');
    await expect(page.locator('button:has-text("Upload Evidence")')).toBeVisible();
    await page.locator('button:has-text("Upload Evidence")').click();

    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Upload Evidence' });
    await expect(modal).toBeVisible();
    await modal.locator('input[type="file"]').setInputFiles({
      name: 'e2e-evidence.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(`E2E evidence payload ${UNIQ}`),
    });
    await modal.locator('input[placeholder*="defaults to file name"]').fill(name);
    await modal.locator('button:has-text("Upload")').click();

    const card = page.locator(`text=${name}`).first();
    await expect(card).toBeVisible({ timeout: 10000 });

    const listRes = await request.get(`${origin}/api/evidence?search=${encodeURIComponent(name)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.status()).toBe(200);
    const listJson = await listRes.json();
    const record = (listJson.data || []).find(e => (e.name || '') === name);
    expect(record).toBeTruthy();
    expect(record.fileSize).toBeGreaterThan(0);
    expect(record.filePath).toMatch(/^\/uploads\//);

    const dlRes = await request.get(`${origin}/api/evidence/${record._id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dlRes.status()).toBe(200);
    expect(await dlRes.text()).toContain('E2E evidence payload');

    const delRes = await request.delete(`${origin}/api/evidence/${record._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status()).toBe(204);
  });

  test('Documents: upload via modal, appears in table, downloads back', async ({ page, request }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const token = await getToken(page);
    const origin = await originOf(page);
    const name = `E2E Document ${UNIQ}`;

    await page.goto('/documents');
    await expect(page.locator('button:has-text("Upload Document")')).toBeVisible();
    await page.locator('button:has-text("Upload Document")').click();

    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Upload Document' });
    await expect(modal).toBeVisible();
    await modal.locator('input[type="file"]').setInputFiles({
      name: 'e2e-doc.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(`E2E document payload ${UNIQ}`),
    });
    await modal.locator('input[placeholder*="defaults to file name"]').fill(name);
    await modal.locator('button:has-text("Upload")').click();

    const row = page.locator(`text=${name}`).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    const listRes = await request.get(`${origin}/api/documents?search=${encodeURIComponent(name)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.status()).toBe(200);
    const listJson = await listRes.json();
    const record = (listJson.data || []).find(d => (d.name || '') === name);
    expect(record).toBeTruthy();
    expect(record.filePath).toMatch(/^\/uploads\//);

    const dlRes = await request.get(`${origin}/api/documents/${record._id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dlRes.status()).toBe(200);
    expect(await dlRes.text()).toContain('E2E document payload');

    const delRes = await request.delete(`${origin}/api/documents/${record._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status()).toBe(204);
  });

  test('Download endpoint is tenant-scoped (cross-org → 404)', async ({ page, request }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const token = await getToken(page);
    const origin = await originOf(page);
    const name = `E2E Scoped ${UNIQ}`;

    const upRes = await request.post(`${origin}/api/evidence/upload`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        name,
        type: 'Document',
        file: { name: 'scoped.txt', mimeType: 'text/plain', buffer: Buffer.from('scoped payload') },
      },
    });
    expect(upRes.status()).toBe(201);
    const created = (await upRes.json()).data;

    // A user from another org must NOT be able to download ORG-101 evidence
    await loginAs(page, 'jwhitfield@securecore.com', 'password123');
    const otherToken = await getToken(page);
    const dlRes = await request.get(`${origin}/api/evidence/${created._id}/download`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    expect(dlRes.status()).toBe(404);

    const delRes = await request.delete(`${origin}/api/evidence/${created._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status()).toBe(204);
  });

  test('Disallowed file types are rejected with 400', async ({ page, request }) => {
    await loginAs(page, 'priya.sharma@globaltech.com', 'password123');
    const token = await getToken(page);
    const origin = await originOf(page);

    const res = await request.post(`${origin}/api/evidence/upload`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        name: 'bad file',
        type: 'Document',
        file: { name: 'evil.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') },
      },
    });
    expect(res.status()).toBe(400);
  });
});
