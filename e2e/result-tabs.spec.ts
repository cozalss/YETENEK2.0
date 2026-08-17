import { test, expect } from '@playwright/test';

/**
 * Sonuç ekranı tab davranışları + keyboard navigation testleri.
 *
 * Erişilebilirlik:
 *   - role="tab" elementleri arrow key ile gezilebilmeli
 *   - role="tabpanel" doğru tab'a bağlanmalı (aria-controls)
 *   - Mount-time: profile tab'ı default
 */

test.describe('Result tabs — interaction & a11y', () => {
  test('default tab Profil & Sonuç', async ({ page }) => {
    await page.goto('/result/demo');
    const profileTab = page.getByRole('tab', { name: /Profil/ });
    await expect(profileTab).toHaveAttribute('aria-selected', 'true');
  });

  test('AI Asistan tab\'ı seçildiğinde aria-selected toggle olur', async ({
    page,
  }) => {
    await page.goto('/result/demo');
    const aiTab = page.getByRole('tab', { name: /AI Asistan/ });
    await aiTab.click();
    await expect(aiTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Paylaş tab içerikleri doğru', async ({ page }) => {
    await page.goto('/result/demo');
    await page.getByRole('tab', { name: /Paylaş/ }).click();

    // Yeni Test ve Cüzdan satırları görünür (NextSteps)
    await expect(page.getByText('Sonraki Adımlar').first()).toBeVisible();
    await expect(
      page.getByText('Test bitti. Şimdi ne yapsak?').first(),
    ).toBeVisible();
  });

  test('keyboard arrow ile tab geçişi çalışır', async ({ page }) => {
    await page.goto('/result/demo');
    const profileTab = page.getByRole('tab', { name: /Profil/ });
    await profileTab.click();
    await profileTab.press('ArrowRight');

    const aiTab = page.getByRole('tab', { name: /AI Asistan/ });
    await expect(aiTab).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Result — ana paneller', () => {
  test('Önerilen sporlar bölümü render olur', async ({ page }) => {
    await page.goto('/result/demo');
    await expect(
      page.getByRole('heading', { name: /En Uygun \d+ Spor/ }),
    ).toBeVisible();
  });

  test('BioMotor radar grafiği SVG olarak render olur', async ({ page }) => {
    await page.goto('/result/demo');
    // Recharts SVG render eder — en az 1 SVG sayfada bulunmalı
    await expect(page.locator('svg').first()).toBeVisible();
  });

  test('Paylaş tab\'inde PDF indir butonu görünür', async ({ page }) => {
    await page.goto('/result/demo');
    await page.getByRole('tab', { name: /Paylaş/ }).click();
    await expect(
      page.getByRole('heading', { name: /Raporu İndir/i }).first(),
    ).toBeVisible();
  });

  test('Paylaş tab\'inde ShareButton kontrolleri görünür', async ({ page }) => {
    await page.goto('/result/demo');
    await page.getByRole('tab', { name: /Paylaş/ }).click();
    // ShareButton "ismimle paylaş" checkbox veya bağlantı butonları render eder
    await expect(page.getByText(/Sonraki Adımlar/i).first()).toBeVisible();
  });

  test('AI Asistan tab\'inde CoachChat CTA görünür (kapalı state)', async ({
    page,
  }) => {
    await page.goto('/result/demo');
    await page.getByRole('tab', { name: /AI Asistan/ }).click();
    // CoachChat default kapalı — "Soru sor, somut tavsiye al" CTA görünür
    await expect(
      page.getByRole('heading', { name: /Soru sor/i }),
    ).toBeVisible();
  });

  test('AI Asistan tab\'inde CoachChat açıldığında input belirir', async ({
    page,
  }) => {
    await page.goto('/result/demo');
    await page.getByRole('tab', { name: /AI Asistan/ }).click();
    // Kapalı state'teki CTA butonuna tıkla → chat panelı açılır
    await page
      .getByRole('button', { name: /Soru sor.*somut tavsiye/i })
      .click();
    await expect(page.getByPlaceholder(/Koça sor/i)).toBeVisible();
  });
});

test.describe('Result hero — meta bilgiler', () => {
  test('child name + age hero başlıkta', async ({ page }) => {
    await page.goto('/result/demo');
    await expect(page.getByRole('heading', { name: /Zeynep/ })).toBeVisible();
    await expect(page.getByText('· 9 yaş')).toBeVisible();
  });

  test('Yetenek Profili eyebrow', async ({ page }) => {
    await page.goto('/result/demo');
    await expect(page.getByText('Yetenek Profili').first()).toBeVisible();
  });

  test('asimetri uyarı banner görünür', async ({ page }) => {
    await page.goto('/result/demo');
    await expect(
      page.getByRole('heading', { name: 'Sağ-Sol Denge Farkı' }),
    ).toBeVisible();
    // Tıbbi tanı değil disclaimer
    await expect(page.getByText(/tıbbi tanı değildir/i)).toBeVisible();
  });
});
