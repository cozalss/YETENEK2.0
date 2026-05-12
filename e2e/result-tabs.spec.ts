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
      page.getByRole('heading', { name: 'Sakatlanma Riski Erken Uyarısı' }),
    ).toBeVisible();
    // Tıbbi tanı değil disclaimer
    await expect(page.getByText(/tıbbi tanı değildir/i)).toBeVisible();
  });
});
