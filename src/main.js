import './style.css'
import { CaptchaGenerator } from './captcha/generator.js'

const THEME_STORAGE_KEY = 'captcha-theme';
const themeToggleButton = document.getElementById('theme-toggle');

function getPreferredTheme() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeToggleLabel(theme) {
  if (!themeToggleButton) return;

  const isDark = theme === 'dark';
  themeToggleButton.textContent = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  themeToggleButton.setAttribute('aria-pressed', String(isDark));
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeToggleLabel(theme);
}

function initializeTheme() {
  applyTheme(getPreferredTheme());

  if (!themeToggleButton) return;

  themeToggleButton.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  });
}

initializeTheme();

const form = document.querySelector('#form form');
const captchaCard = document.getElementById('captcha_card');
const successCard = document.getElementById('success_card');
const dashboard = document.getElementById('dashboard');
const formContainer = document.getElementById('form');
const successOkButton = document.getElementById('success-ok-button');
let captchaInstance = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  captchaCard.hidden = false;

  if (captchaInstance) {
    captchaInstance.cleanup();
  }

  captchaInstance = new CaptchaGenerator();
  await captchaInstance.initialize();
});

/**
 * Listen for CAPTCHA validation completion
 */
window.addEventListener('captcha-validated', () => {
  // Hide the CAPTCHA card and form
  captchaCard.hidden = true;
  formContainer.hidden = true;

  // Show the success message
  successCard.hidden = false;

  // Handle the OK button click
  successOkButton.addEventListener('click', () => {
    successCard.hidden = true;
    dashboard.hidden = false;
  });
});

/**
 * Listen for CAPTCHA validation failure (all attempts exhausted)
 */
window.addEventListener('captcha-failed', (event) => {
  // Hide the CAPTCHA card and form
  captchaCard.hidden = true;
  formContainer.hidden = true;

  // Show failure message in the validation element
  const failureMessage = document.getElementById('validation');
  if (failureMessage) {
    failureMessage.textContent = event.detail.feedback.message;
    failureMessage.style.display = 'block';
    failureMessage.style.backgroundColor = '#ffe5e5';
    failureMessage.style.border = '1px solid #FF0000';
    failureMessage.style.color = 'black';
  }

  // Optional: Auto-redirect to login page after delay
  setTimeout(() => {
    window.location.reload(); // Reload to try again
  }, 5000);
});
