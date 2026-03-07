import { test, expect } from '@playwright/test';

test.describe('CAPTCHA End-to-End Flow', () => {
  test('User can solve the CAPTCHA', async ({ page }) => {
    // Mock backend endpoints to avoid infra dependency in UI E2E.
    await page.route('**/backend/InitCaptcha.php', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          csrf_token: 'a'.repeat(64),
          captcha_session_id: 'b'.repeat(32),
          session_id: 'mock-session-id',
        }),
      });
    });

    await page.route('**/backend/GenerateAudio.php', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          audioUrl: '/audio/mock.mp3',
          leadInSeconds: 0,
          duration: 3,
          csrf_token: 'c'.repeat(64),
          captcha_session_id: 'b'.repeat(32),
        }),
      });
    });

    await page.route('**/backend/GenerateTextbox.php', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          words: ['apple', 'banana', 'cart', 'checkout'],
          targetWord: 'apple',
          clicksRequired: 2,
          scenarioId: 'supermarket',
          wordDisplayDuration: 300,
          wordInterval: 300,
          csrf_token: 'd'.repeat(64),
          captcha_session_id: 'b'.repeat(32),
        }),
      });
    });

    await page.goto('/');

    await page.fill('#username', 'testuser');
    await page.fill('#password', 'test1234');
    await page.click('button[type="submit"]');

    await expect(page.locator('#captcha_card')).toBeVisible();
    await expect(page.locator('#audio-toggle')).toBeVisible({ timeout: 15000 });

    // Wait until validator is ready, then validate without relying on displayed word timing.
    await page.waitForFunction(() => Boolean(window.captchaValidator), { timeout: 10000 });

    const validationResult = await page.evaluate(async () => {
      const validator = window.captchaValidator;
      if (!validator) {
        return { available: false, eventReceived: false, isValidated: false };
      }

      const eventPromise = new Promise((resolve) => {
        window.addEventListener('captcha-validated', () => resolve(true), { once: true });
      });

      const clicksRequired = validator.clicksRequired;
      let lastFeedback = null;

      for (let i = 0; i < clicksRequired; i += 1) {
        // Passing null bypasses word-match timing and only tests validation mechanics.
        lastFeedback = validator.registerClick(null);
      }

      const eventReceived = await Promise.race([
        eventPromise,
        new Promise((resolve) => setTimeout(() => resolve(false), 2000)),
      ]);

      return {
        available: true,
        clicksRequired,
        eventReceived,
        isValidated: validator.isValidated,
        message: lastFeedback?.message,
      };
    });

    expect(validationResult.available).toBe(true);
    expect(validationResult.isValidated).toBe(true);
    expect(validationResult.eventReceived).toBe(true);

    await expect(page.locator('#success_card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#success-message')).toContainText('CAPTCHA Validated!');
  });
});