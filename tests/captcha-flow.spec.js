import { test, expect } from '@playwright/test';

test.describe('CAPTCHA End-to-End Flow', () => {
  test('User can solve the CAPTCHA', async ({ page }) => {
    // 1. Charger la page
    await page.goto('http://localhost:5173');

    // 2. Remplir le formulaire de login
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'test1234');
    await page.click('button[type="submit"]');

    // 3. Vérifier que le CAPTCHA s'affiche
    await expect(page.locator('#captcha_card')).toBeVisible();

    // 4. Cliquer sur le bouton audio
    await page.click('#audio-toggle');

    // 5. Attendre que le mot cible s'affiche
    await page.waitForSelector('.word-text');

    // 6. Simuler 2 clics rapides (validation)
    const captchaBox = page.locator('#captcha');
    await captchaBox.click({ clickCount: 2, delay: 100 });

    // 7. Vérifier le succès
    await expect(page.locator('#success_card')).toBeVisible();
    await expect(page.locator('.success-message'))
      .toContainText('CAPTCHA validated!');
  });
});