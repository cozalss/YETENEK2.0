import { test, expect } from '@playwright/test';

/**
 * /test/full ProfileForm akış testleri — isim/yaş/cinsiyet alanları,
 * disclosure ile boy alanı, validation davranışı.
 */

test.describe('Profile form — input validation', () => {
  test('form alanları doğru tiplerle render olur', async ({ page }) => {
    await page.goto('/test/full');

    const nameInput = page.locator('input#profile-name');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveAttribute('type', 'text');
    await expect(nameInput).toHaveAttribute('required', '');

    const ageSelect = page.locator('select#profile-age');
    await expect(ageSelect).toBeVisible();

    const sexSelect = page.locator('select#profile-sex');
    await expect(sexSelect).toBeVisible();
  });

  test('yaş seçeneklerinde 8-15 aralığı bulunuyor', async ({ page }) => {
    await page.goto('/test/full');
    const ageSelect = page.locator('select#profile-age');
    const options = await ageSelect.locator('option').allTextContents();
    expect(options.map((o) => o.trim())).toEqual([
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
    ]);
  });

  test('cinsiyet seçeneklerinde Kız ve Erkek var', async ({ page }) => {
    await page.goto('/test/full');
    const sexSelect = page.locator('select#profile-sex');
    const options = await sexSelect.locator('option').allTextContents();
    expect(options.map((o) => o.trim())).toEqual(['Kız', 'Erkek']);
  });

  test('Testlere Başla butonu boş ismle disabled', async ({ page }) => {
    await page.goto('/test/full');
    const submit = page.getByRole('button', { name: /Testlere Başla/ });
    await expect(submit).toBeDisabled();
  });

  test('Testlere Başla isim girince enabled olur', async ({ page }) => {
    await page.goto('/test/full');
    await page.locator('input#profile-name').fill('Ali');
    const submit = page.getByRole('button', { name: /Testlere Başla/ });
    await expect(submit).toBeEnabled();
  });

  test('boy alanı disclosure altında — açılınca görünür', async ({ page }) => {
    await page.goto('/test/full');
    // Başlangıçta gizli
    await expect(page.locator('input#profile-height')).toHaveCount(0);

    const disclosure = page.getByRole('button', {
      name: /Detay \(opsiyonel\)/,
    });
    await disclosure.click();
    await expect(page.locator('input#profile-height')).toBeVisible();
  });

  test('quick mode (?mode=quick) ile sayfa açılır', async ({ page }) => {
    const response = await page.goto('/test/full?mode=quick');
    expect(response?.status()).toBe(200);
    await expect(page.locator('input#profile-name')).toBeVisible();
  });
});
