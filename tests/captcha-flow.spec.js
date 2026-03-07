import { test, expect } from '@playwright/test';

test.describe('CAPTCHA End-to-End Flow', () => {
  test('User can solve the CAPTCHA without clicks', async ({ page }) => {
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

    // Wait for audio controls to be available
    await expect(page.locator('#audio-toggle')).toBeVisible({ timeout: 15000 });

    // Simulate validation by directly calling the validator's registerClick method
    // This bypasses the need for actual UI clicks
    const validationResult = await page.evaluate(() => {
      // Access the global validator instance
      if (!window.captchaValidator) {
        return { error: 'Validator not found', available: false };
      }

      console.log('Validator state:', {
        targetWord: window.captchaValidator.targetWord,
        clicksRequired: window.captchaValidator.clicksRequired,
        isValidated: window.captchaValidator.isValidated
      });

      // Simulate 2 rapid clicks on the target word
      const result1 = window.captchaValidator.registerClick('apple');
      console.log('First click result:', result1);

      const result2 = window.captchaValidator.registerClick('apple');
      console.log('Second click result:', result2);

      return {
        success: true,
        isValidated: window.captchaValidator.isValidated,
        message: result2.message,
        clickCount: window.captchaValidator.clickSequence.length
      };
    });

    console.log('Validation result:', validationResult);

    // Wait for success card to appear
    await expect(page.locator('#success_card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#success-message')).toContainText('CAPTCHA Validated!');
  });
});