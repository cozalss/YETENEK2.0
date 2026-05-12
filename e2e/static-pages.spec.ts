import { test, expect } from '@playwright/test';

/**
 * Statik sayfa E2E testleri — about, privacy, terms, sports, training.
 *
 * Her sayfanın render edilebildiğini, h1'inin doğru olduğunu ve ana navigasyon
 * elementlerinin (Ana sayfa linki, SiteHeader) çalıştığını doğrular.
 */

const STATIC_PAGES: Array<{ path: string; h1Match: RegExp }> = [
  { path: '/about', h1Match: /bir yetenek/ },
  { path: '/privacy', h1Match: /cihazda kalır/ },
  { path: '/terms', h1Match: /önce gelir/ },
  { path: '/sports', h1Match: /12 branş/ },
  { path: '/training', h1Match: /başlangıç/ },
  { path: '/test', h1Match: /Yedi test/ },
];

test.describe('Statik sayfalar — render kontrolü', () => {
  for (const { path, h1Match } of STATIC_PAGES) {
    test(`${path} sayfası h1 ile yüklenir`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status(), `${path} 200 dönmedi`).toBe(200);
      await expect(
        page.getByRole('heading', { level: 1 }).first(),
      ).toContainText(h1Match);
    });
  }

  test('about sayfasından ana sayfaya dönüş çalışıyor', async ({ page }) => {
    await page.goto('/about');
    const homeLink = page.locator('a:has-text("Ana sayfa")').first();
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await page.waitForURL('/');
  });
});

test.describe('Spor detay sayfaları', () => {
  test('/sports/voleybol render olur', async ({ page }) => {
    const response = await page.goto('/sports/voleybol');
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1 }).first(),
    ).toBeVisible();
  });

  test('/sports/futbol render olur', async ({ page }) => {
    const response = await page.goto('/sports/futbol');
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1 }).first(),
    ).toBeVisible();
  });

  test('bilinmeyen spor 404 verir', async ({ page }) => {
    const response = await page.goto('/sports/kayitsiz-spor-yok');
    expect(response?.status()).toBe(404);
  });
});

test.describe('Antrenman dimension sayfaları', () => {
  test('/training/balance programı yüklenir', async ({ page }) => {
    const response = await page.goto('/training/balance');
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1 }).first(),
    ).toBeVisible();
  });

  test('/training/explosivePower programı yüklenir', async ({ page }) => {
    const response = await page.goto('/training/explosivePower');
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1 }).first(),
    ).toBeVisible();
  });
});
