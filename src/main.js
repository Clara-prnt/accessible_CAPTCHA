import './style.css'
import { CaptchaGenerator } from './captcha/generator.js'

const form = document.querySelector('#form form');
const captchaCard = document.getElementById('captcha_card');
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