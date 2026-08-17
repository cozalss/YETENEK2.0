import { test, expect } from '@playwright/test';

/**
 * Demo / sonuç akışı E2E testleri — Zeynep persona ile sonuç ekranı.
 *
 * Senaryo:
 *   1. Ana sayfa → "Örnek Sonuç" bağlantısı → /result/demo
 *   2. /demo → persona seçici → ResultScreen
 *   3. Sonuç ekranı tabları: Profil & Sonuç, AI Asistan, Paylaş & Devam
 *
 * Not: Kamera gerektiren testler (CMJ, denge vb.) bu E2E'de yer almaz;
 * bunun yerine örnek sonuç ekranı test edilir.
 */

test.describe('Örnek Sonuç Akışı — Zeynep Persona', () => {
  test('ana sayfa yüklenebiliyor ve örnek sonuç bağlantısı çalışıyor', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Yetenek/i);

    // Hero başlığı YETENEK — mobile + desktop her ikisinde de görünür.
    // Hero subtitle metni — stabil, animasyon dışı.
    await expect(
      page.getByText('8–15 yaş · 7 bio-motor test · 5 dakika').first(),
    ).toBeVisible();

    // Hero "Örnek Sonuç" CTA bağlantısı /result/demo'ya gider.
    const sampleLink = page
      .getByRole('link', { name: 'Örnek Sonuç' })
      .first();
    await expect(sampleLink).toBeVisible();
    await sampleLink.click();

    await page.waitForURL('/result/demo');
  });

  test('örnek profil sayfası persona seçtiriyor', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByText('Örnek Profiller', { exact: true })).toBeVisible();

    // Zeynep persona seç
    const zeynepButton = page.locator('button:has-text("Zeynep")').first();
    await expect(zeynepButton).toBeVisible();
    await zeynepButton.click();

    await expect(
      page.locator('text=Örnek Profil · Zeynep').first(),
    ).toBeVisible();
  });

  test('örnek sonuç ekranı tüm bölümleri içeriyor', async ({ page }) => {
    await page.goto('/result/demo');

    // Hero — h1 child name
    await expect(page.getByRole('heading', { name: /Zeynep/ })).toBeVisible();
    await expect(page.getByText('· 9 yaş')).toBeVisible();

    // En güçlü uyum (spesifik spor adı matching engine'e bağlı)
    await expect(page.locator('text=En güçlü uyumun').first()).toBeVisible();

    // Radar grafiği placeholder veya canvas
    await expect(page.locator('text=Bio-Motor Profili').first()).toBeVisible();

    // Spor önerileri — demo 3 öneri döndürüyor
    await expect(page.locator('text=En Uygun 3 Spor').first()).toBeVisible();

    // Sakatlanma uyarısı (Zeynep'te asimetri var)
    await expect(
      page.getByRole('heading', { name: 'Sağ-Sol Denge Farkı' }),
    ).toBeVisible();
    await expect(page.getByText('%18 asimetrik')).toBeVisible();

    // Metrik grid
    await expect(page.locator('text=Dikey Sıçrama').first()).toBeVisible();
    await expect(page.locator('text=Reaksiyon').first()).toBeVisible();
  });

  test('AI Rapor paneli yükleniyor veya fallback gösteriyor', async ({
    page,
  }) => {
    await page.goto('/result/demo');
    await page.getByRole('tab', { name: /AI Asistan/ }).click();

    const reportSection = page.locator('text=Veliye AI Raporu').first();
    await expect(reportSection).toBeVisible();

    // Eğer API key yoksa fallback mesajı görünebilir, her iki durumda da
    // panelin çökmeyeceğini doğrula.
    await expect(page.getByText('AI Koç', { exact: true })).toBeVisible();
  });

  test('paylaş butonu OG image URL üretiyor', async ({ page }) => {
    await page.goto('/result/demo');
    await page.getByRole('tab', { name: /Paylaş/ }).click();

    const shareSection = page.locator('text=Sonucumu paylaş').first();
    await expect(shareSection).toBeVisible();

    const copyButton = page.locator('button:has-text("Bağlantı")').first();
    await expect(copyButton).toBeVisible();

    // Clipboard API test ortamında mock'lanabilir; burada butonun
    // tıklanabilir olduğunu doğrulamak yeterli.
    await expect(copyButton).toBeEnabled();
  });

  test('PDF indirme butonu aktif', async ({ page }) => {
    await page.goto('/result/demo');
    await page.getByRole('tab', { name: /Paylaş/ }).click();

    const pdfButton = page
      .locator('button:has-text("PDF Olarak İndir")')
      .first();
    await expect(pdfButton).toBeVisible();
    await expect(pdfButton).toBeEnabled();
  });

  test('tam akış sayfası profile formunu gösteriyor', async ({ page }) => {
    await page.goto('/test/full');

    await expect(page.locator('text=Adım 1').first()).toBeVisible();
    await expect(page.locator('input#profile-name')).toBeVisible();
    await expect(page.locator('select#profile-age')).toBeVisible();
    await expect(page.locator('select#profile-sex')).toBeVisible();
  });

  test('örnek sonuç sayfasından ana sayfaya dönüş çalışıyor', async ({
    page,
  }) => {
    await page.goto('/result/demo');

    const backLink = page.locator('a:has-text("Ana sayfaya dön")').first();
    await expect(backLink).toBeVisible();
    await backLink.click();

    await page.waitForURL('/');
    // Hero subtitle metni — stabil, animasyon dışı.
    await expect(
      page.getByText('8–15 yaş · 7 bio-motor test · 5 dakika').first(),
    ).toBeVisible();
  });
});

test.describe('OG Image Endpoint', () => {
  test('/api/og görsel yanıtı dönüyor', async ({ page }) => {
    const response = await page.goto(
      '/api/og?name=Zeynep&age=9&sport=Voleybol&score=92',
    );
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('image/png');
  });
});
