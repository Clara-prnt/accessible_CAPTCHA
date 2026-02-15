import './style.css'

const form = document.querySelector('#form form');
const captchaCard = document.getElementById('captcha_card');
let captchaInstance = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  captchaCard.hidden = false;

  captchaInstance = new CaptchaGenerator();
  await captchaInstance.initialize();
});



/* Text to display in h3 id="explanation" : You will hear an everyday situation, and see random words appear.
        Click [x] times anywhere on the screen when you hear/see “[y]”.
        To pause the audio, click one time on the screen. Click one time again to resume the audio.*/