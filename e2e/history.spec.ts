import { test, expect } from '@playwright/test';

/**
 * /history sayfası — auth-protected route.
 *
 * proxy.ts → unauthenticated kullanıcıyı /auth/sign-up?next=/history'e
 * yönlendirir. Testler bu redirect davranışını + sign-up sayfasının
 * doğru next param ile yüklendiğini doğrular.
 */

test.describe('History — auth korumalı route', () => {
  test('unauthenticated /history → /auth/sign-up redirect', async ({
    page,
  }) => {
    await page.goto('/history');
    // Redirect tetiklenir → URL artık sign-up sayfasına döner
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });

  test('redirect sonrası next=/history query param eklenir', async ({
    page,
  }) => {
    await page.goto('/history');
    await expect(page).toHaveURL(/next=.*history/);
  });

  test('sign-up sayfası h1 ile yüklenir', async ({ page }) => {
    await page.goto('/history');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('unauthenticated /profile da sign-up\'e yönlendirir', async ({
    page,
  }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });
});
