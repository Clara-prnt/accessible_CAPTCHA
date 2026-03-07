import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mockCaptchaBackend(page) {
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
}

test.describe('CAPTCHA accessibility checks', () => {
  test('ARIA assertions and axe violations', async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0;

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

    await mockCaptchaBackend(page);

    await page.goto('/');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'test1234');
    await page.click('button[type="submit"]');

    await expect(page.locator('#captcha_card')).toBeVisible();
    await expect(page.locator('#audio-toggle')).toBeVisible({ timeout: 15000 });

    // ARIA critical assertions
    await expect(page.locator('#captcha-aria-live')).toHaveAttribute('aria-live', /polite|assertive/);
    await expect(page.locator('#captcha_card')).toHaveAttribute('role', 'region');
    await expect(page.locator('#captcha_card')).toHaveAttribute('aria-label', /CAPTCHA verification area/i);
    await expect(page.locator('#validation')).toHaveAttribute('role', 'alert');
    await expect(page.locator('#validation')).toHaveAttribute('aria-live', 'assertive');
    await expect(page.locator('#error')).toHaveAttribute('role', 'alert');
    await expect(page.locator('#error')).toHaveAttribute('aria-live', 'assertive');
    await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-label', /Play or pause audio/i);
    await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', /true|false/);

    // Keyboard help dialog opens with Alt+H and closes with Escape
    await page.keyboard.press('Alt+H');
    await expect(page.locator('.keyboard-help-dialog')).toBeVisible();
    await expect(page.locator('.keyboard-help-dialog')).toHaveAttribute('role', 'dialog');
    await expect(page.locator('.keyboard-help-dialog')).toHaveAttribute('aria-modal', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('.keyboard-help-dialog')).toHaveCount(0);

    // axe-core audit on the CAPTCHA area
    const axe = await new AxeBuilder({ page })
      .include('#captcha_card')
      .analyze();

    expect(axe.violations, `A11y violations: ${JSON.stringify(axe.violations, null, 2)}`).toEqual([]);
  });
});

