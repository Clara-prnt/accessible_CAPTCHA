/* This file will manage the interactions with the user interface,
such as displaying the random words, animate visual elements, and providing feedback. */

export class CaptchaUI {
  constructor() {
    this.captchaContainer = document.getElementById('captcha');
    this.words = [];
    this.currentWordIndex = 0;
    this.wordDisplayDuration = 5000; // 5 seconds default
    this.wordInterval = 5000; // interval between word changes
    this.wordBox = null; // The static box that stays visible
    this.wordElement = null; // The word that appears/disappears
    this.wordDisplayTimeout = null;
    this.wordChangeInterval = null;
    this.isRunning = false;
  }

  /**
   * Generate a random angle between -15 and 15 degrees
   * @returns {number} Random angle in degrees
   */
  getRandomAngle() {
    return (Math.random() * 30 - 15); // Random angle between -15 and 15 degrees
  }

  /**
   * Generate random coordinates within the word box
   * @returns {Object} Object with x and y coordinates as percentages
   */
  getRandomCoordinates() {
    const x = Math.random() * 70 + 15; // 15% to 85% horizontal positioning
    const y = Math.random() * 60 + 20; // 20% to 80% vertical positioning
    return { x, y };
  }

  /**
   * Initialize the UI with a list of words to display
   * @param {Array} words - Array of words to display
   * @param {number} wordDisplayDuration - How long each word is displayed (ms)
   * @param {number} wordInterval - Interval between word changes (ms)
   */
  initialize(words, wordDisplayDuration = 5000, wordInterval = 5000) {
    this.words = words;
    this.wordDisplayDuration = wordDisplayDuration;
    this.wordInterval = wordInterval;
    this.currentWordIndex = 0;

    // Create the static word box that stays visible
    this.wordBox = document.createElement('div');
    this.wordBox.id = 'word-display';
    this.wordBox.className = 'word-display';
    this.wordBox.style.position = 'relative'; // Set position relative for absolute positioning inside
    this.captchaContainer.appendChild(this.wordBox);

    // Create the word element that will appear/disappear inside the box
    this.wordElement = document.createElement('div');
    this.wordElement.className = 'word-text';
    this.wordElement.style.position = 'absolute';
    this.wordElement.style.whiteSpace = 'nowrap';
    this.wordBox.appendChild(this.wordElement);
  }

  /**
   * Start displaying words one at a time
   */
  startDisplayingWords() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Display the first word immediately
    this.displayNextWord();

    // Set up interval for subsequent words
    this.wordChangeInterval = setInterval(() => {
      this.displayNextWord();
    }, this.wordInterval);
  }

  /**
   * Display the next word in the sequence
   */
  displayNextWord() {
    // Clear any existing timeout
    if (this.wordDisplayTimeout) {
      clearTimeout(this.wordDisplayTimeout);
    }

    // If we've gone through all words, loop back to the start
    if (this.currentWordIndex >= this.words.length) {
      this.currentWordIndex = 0;
    }

    const currentWord = this.words[this.currentWordIndex];

    // Get random angle and coordinates
    const angle = this.getRandomAngle();
    const coords = this.getRandomCoordinates();

    // Display the word with fade-in animation and random positioning
    this.wordElement.textContent = currentWord;
    this.wordElement.style.left = coords.x + '%';
    this.wordElement.style.top = coords.y + '%';
    this.wordElement.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    this.wordElement.classList.remove('fade-out');
    this.wordElement.classList.add('fade-in');

    // Schedule the word to disappear after the display duration
    this.wordDisplayTimeout = setTimeout(() => {
      this.wordElement.classList.remove('fade-in');
      this.wordElement.classList.add('fade-out');
    }, this.wordDisplayDuration);

    // Move to next word index for the next iteration
    this.currentWordIndex++;
  }

  /**
   * Stop displaying words
   */
  stopDisplayingWords() {
    this.isRunning = false;
    if (this.wordChangeInterval) {
      clearInterval(this.wordChangeInterval);
      this.wordChangeInterval = null;
    }
    if (this.wordDisplayTimeout) {
      clearTimeout(this.wordDisplayTimeout);
      this.wordDisplayTimeout = null;
    }
    if (this.wordElement) {
      this.wordElement.textContent = '';
    }
  }

  /**
   * Show an error message on the screen
   * @param {string} message - The error message to display
   */
  showError(message) {
    const errorElement = document.getElementById('error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.color = 'red';
      errorElement.style.display = 'block';
    }
  }

  /**
   * Clear error message
   */
  clearError() {
    const errorElement = document.getElementById('error');
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }

  /**
   * Show a success message
   * @param {string} message - The success message to display
   */
  showSuccess(message) {
    const errorElement = document.getElementById('error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.color = 'green';
      errorElement.style.display = 'block';
    }
  }

  /**
   * Clean up the UI
   */
  destroy() {
    this.stopDisplayingWords();
    if (this.wordElement) {
      this.wordElement.remove();
    }
  }
}

