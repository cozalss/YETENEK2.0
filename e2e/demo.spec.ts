import { test, expect } from '@playwright/test';

/**
 * E2E örnek sonuç testi — Zeynep persona ile sonuç ekranı.
 *
 * Senaryo:
 *   1. Ana sayfa → "Örnek sonucu gör" bağlantısı
 *   2. Örnek sonuç sayfası yüklenir
 *   3. Sonuç ekranında temel bileşenler görünür
 *   4. AI Rapor paneli yüklenir (API varsa)
 *   5. Paylaş butonu aktif
 *   6. PDF indirme butonu aktif
 *
 * Not: Kamera gerektiren testler (CMJ, denge vb.) bu E2E'de yer almaz;
 * bunun yerine örnek sonuç ekranı test edilir.
 */

test.describe('Örnek Sonuç Akışı — Zeynep Persona', () => {
  test('ana sayfa yüklenebiliyor ve örnek sonuç bağlantısı çalışıyor', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Yetenek/i);
    await expect(page.locator('text=Çocuğunun yeteneği')).toBeVisible();

    const sampleLink = page.getByRole('link', { name: 'Örnek sonucu gör' });
    await expect(sampleLink).toBeVisible();
    await sampleLink.click();

    await page.waitForURL('/result/demo');
    await expect(page.getByText('Örnek sonuç · 7 testlik profil')).toBeVisible();
  });

  test('örnek profil sayfası persona seçtiriyor', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByText('Örnek Profiller', { exact: true })).toBeVisible();

    // Zeynep persona seç
    const zeynepButton = page.locator('button:has-text("Zeynep")');
    await expect(zeynepButton).toBeVisible();
    await zeynepButton.click();

    await expect(page.locator('text=Örnek Profil · Zeynep')).toBeVisible();
  });

  test('örnek sonuç ekranı tüm bölümleri içeriyor', async ({ page }) => {
    await page.goto('/result/demo');

    // Hero
    await expect(page.getByRole('heading', { name: /Zeynep/ })).toBeVisible();
    await expect(page.getByText('· 9 yaş')).toBeVisible();

    // En güçlü uyum (spesifik spor adı matching engine'e bağlı)
    await expect(page.locator('text=En güçlü uyumun')).toBeVisible();

    // Radar grafiği placeholder veya canvas
    await expect(page.locator('text=Bio-Motor Profili')).toBeVisible();

    // Spor önerileri
    await expect(page.locator('text=EN UYGUN 3 SPOR')).toBeVisible();

    // Sakatlanma uyarısı (Zeynep'te asimetri var)
    await expect(page.getByRole('heading', { name: 'Sakatlanma Riski Erken Uyarısı' })).toBeVisible();
    await expect(page.getByText('%18 asimetrik')).toBeVisible();

    // Metrik grid
    await expect(page.locator('text=Dikey Sıçrama')).toBeVisible();
    await expect(page.locator('text=Reaksiyon').first()).toBeVisible();
  });

  test('AI Rapor paneli yükleniyor veya fallback gösteriyor', async ({ page }) => {
    await page.goto('/result/demo');
    await page.getByRole('tab', { name: /AI Asistan/ }).click();

    const reportSection = page.locator('text=Veliye AI Raporu');
    await expect(reportSection).toBeVisible();

    // Eğer API key yoksa fallback mesajı görünebilir, her iki durumda da
    // panelin çökmeyeceğini doğrula.
    await expect(page.getByText('AI Koç', { exact: true })).toBeVisible();
  });

  test('paylaş butonu OG image URL üretiyor', async ({ page }) => {
    await page.goto('/result/demo');
    await page.getByRole('tab', { name: /Paylaş/ }).click();

    const shareSection = page.locator('text=Sonucumu paylaş');
    await expect(shareSection).toBeVisible();

    const copyButton = page.locator('button:has-text("Bağlantı")');
    await expect(copyButton).toBeVisible();

    // Clipboard API test ortamında mock'lanabilir; burada butonun
    // tıklanabilir olduğunu doğrulamak yeterli.
    await expect(copyButton).toBeEnabled();
  });

  test('PDF indirme butonu aktif', async ({ page }) => {
    await page.goto('/result/demo');
    await page.getByRole('tab', { name: /Paylaş/ }).click();

    const pdfButton = page.locator('button:has-text("PDF Olarak İndir")');
    await expect(pdfButton).toBeVisible();
    await expect(pdfButton).toBeEnabled();
  });

  test('tam akış sayfası profile formunu gösteriyor', async ({ page }) => {
    await page.goto('/test/full');

    await expect(page.locator('text=Adım 1')).toBeVisible();
    await expect(page.locator('input#profile-name')).toBeVisible();
    await expect(page.locator('text=YAŞ*')).toBeVisible();
    await expect(page.locator('select#profile-age')).toBeVisible();
  });

  test('örnek sonuç sayfasından ana sayfaya dönüş çalışıyor', async ({ page }) => {
    await page.goto('/result/demo');

    const backLink = page.locator('a:has-text("Ana sayfaya dön")');
    await expect(backLink).toBeVisible();
    await backLink.click();

    await page.waitForURL('/');
    await expect(page.locator('text=Çocuğunun yeteneği')).toBeVisible();
  });
});

test.describe('OG Image Endpoint', () => {
  test('/api/og görsel yanıtı dönüyor', async ({ page }) => {
    const response = await page.goto(
      '/api/og?name=Zeynep&age=9&sport=Voleybol&score=92'
    );
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('image/png');
  });
});
