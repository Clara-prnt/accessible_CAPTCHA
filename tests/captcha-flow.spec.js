import { test, expect } from '@playwright/test';

test.describe('CAPTCHA End-to-End Flow', () => {
  test('User can solve the CAPTCHA', async ({ page }) => {
    // Force deterministic random values so clicksRequired is always 2.
    await page.addInitScript(() => {
      Math.random = () => 0;

      // Make audio loading/playing deterministic in CI browsers.
      const mediaProto = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
      if (!mediaProto) return;

      mediaProto.load = function load() {
        this.dispatchEvent(new Event('canplaythrough'));
      };

      mediaProto.play = function play() {
        this.dispatchEvent(new Event('play'));
        return Promise.resolve();
      };

      mediaProto.pause = function pause() {
        this.dispatchEvent(new Event('pause'));
      };
    });

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

    // Wait explicitly for audio controls injected by initialize().
    await expect(page.locator('#audio-toggle')).toBeVisible({ timeout: 15000 });

    // Start audio so validation becomes active.
    await page.click('#audio-toggle');
    await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'true');

    // Wait until the word is displayed before clicking, to avoid "Wrong word" feedback.
    await expect(page.locator('#word-display')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#word-display')).not.toHaveText('');

    const wordDisplay = page.locator('#word-display');
    await wordDisplay.click();
    await wordDisplay.click();

    await expect(page.locator('#success_card')).toBeVisible();
    await expect(page.locator('#success-message')).toContainText('CAPTCHA Validated!');

    await expect(page.locator('#success_card')).toBeVisible();
    await expect(page.locator('#success-message')).toContainText('CAPTCHA Validated!');
  });
});