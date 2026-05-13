import { test, expect } from '@playwright/test';

/**
 * 404 / not-found davranışı.
 *
 * Next.js 16 App Router → bilinmeyen route otomatik global-error.tsx veya
 * not-found.tsx'a düşer. Bu testler 404 status'unun döndüğünü ve sayfanın
 * hard crash etmediğini doğrular.
 */

test.describe('404 — bilinmeyen route', () => {
  test('/bilinmeyen-sayfa-yok 404 döner', async ({ page }) => {
    const response = await page.goto('/bilinmeyen-sayfa-yok');
    expect(response?.status()).toBe(404);
  });

  test('/random/derin/path 404 döner', async ({ page }) => {
    const response = await page.goto('/random/derin/path');
    expect(response?.status()).toBe(404);
  });

  test('404 sayfasında body görünür içerikle render olur', async ({ page }) => {
    await page.goto('/yok-boyle-bir-sayfa');
    // Crash olmamalı — bir <body> render olmalı
    await expect(page.locator('body')).toBeVisible();
  });
});
