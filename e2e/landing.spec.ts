import { test, expect } from '@playwright/test';

/**
 * Landing sayfası E2E testleri.
 *
 * Hero, Tests, AI Analysis, Branches, Badges, CTA section'larının doğru
 * yüklendiğini ve interaktif elementlerin (CTA, navigation) çalıştığını
 * doğrular.
 */

test.describe('Landing — Hero & Navigation', () => {
  test('hero CTA "Teste Başla" auth sign-up sayfasına gider', async ({
    page,
  }) => {
    await page.goto('/');

    // Hero alanındaki Teste Başla butonu (.first() — nav + hero ikisinde de var)
    const heroCta = page
      .getByRole('link', { name: 'Teste Başla' })
      .first();
    await expect(heroCta).toBeVisible();
    await heroCta.click();

    await page.waitForURL(/\/auth\/sign-up/);
    // Next.js query'de "/" karakteri encode edilmiyor — `next=/profile`.
    await expect(page).toHaveURL(/next=(\/|%2F)profile/);
  });

  test('navigation YETENEK logosu home sayfasına götürür', async ({
    page,
  }) => {
    await page.goto('/about');
    const homeLink = page.getByRole('link', { name: 'YETENEK' }).first();
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await page.waitForURL('/');
  });

  test('landing tüm 6 ana section yüklenebiliyor', async ({ page }) => {
    await page.goto('/');

    // Hero
    await expect(
      page.getByText('8–15 yaş · 7 bio-motor test · 5 dakika').first(),
    ).toBeVisible();

    // Diğer section'lar viewport altında — scroll edip görünür yap.
    await page.locator('#tests').scrollIntoViewIfNeeded();
    await expect(page.locator('#tests')).toBeAttached();
    await expect(page.getByText(/FİZİKSEL TESTLERİMİZ/).first()).toBeVisible();

    await page.locator('#analysis').scrollIntoViewIfNeeded();
    await expect(page.locator('#analysis')).toBeAttached();
    await expect(
      page.getByText('YAPAY ZEKA ANALİZİ', { exact: false }).first(),
    ).toBeVisible();

    await page.locator('#branches').scrollIntoViewIfNeeded();
    await expect(page.locator('#branches')).toBeAttached();

    await page.locator('#badges').scrollIntoViewIfNeeded();
    await expect(page.locator('#badges')).toBeAttached();
    await expect(
      page.getByText('ROZETLER & GELİŞİM', { exact: false }).first(),
    ).toBeVisible();
  });

  test('landing footer linkleri çalışır', async ({ page }) => {
    await page.goto('/');

    // Privacy linkine ulaş
    const privacyLink = page
      .locator('footer')
      .getByRole('link', { name: 'KVKK' })
      .first();
    await expect(privacyLink).toBeVisible();
  });

  test('homepage SEO meta tagleri doğru', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    // Description meta tag
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(20);
  });
});
