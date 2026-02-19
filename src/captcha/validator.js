/**
 * CAPTCHA Validator
 * This module detects rapid successive clicks (like a multi-click pattern)
 * to validate the CAPTCHA. Clicks must occur within a time window to be counted.
 */

export class CaptchaValidator {
  constructor(clicksRequired) {
    this.clicksRequired = clicksRequired;
    this.clickSequence = []; // Array of click timestamps
    this.clickTimeout = null; // Timeout to reset the sequence if too slow
    this.clickTimeWindow = 800; // 800ms between clicks to count as a sequence
    this.validationCallback = null;
    this.clickFeedbackCallback = null;
    this.isValidated = false;
  }

  /**
   * Register a click anywhere on screen
   * @returns {Object} Feedback object with click information
   */
  registerClick() {
    if (this.isValidated) {
      return { isValidated: true, message: 'CAPTCHA already validated' };
    }

    const now = Date.now();
    this.clickSequence.push(now);

    // Clear the existing timeout
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
    }

    // Provide feedback for this click
    const feedback = {
      clickCount: this.clickSequence.length,
      clicksRequired: this.clicksRequired,
      message: `Click ${this.clickSequence.length}/${this.clicksRequired}`,
      isValidated: false
    };

    // Check if we have enough clicks
    if (this.clickSequence.length >= this.clicksRequired) {
      // Check if all clicks are within the time window
      const firstClick = this.clickSequence[0];
      const lastClick = this.clickSequence[this.clickSequence.length - 1];
      const timeDifference = lastClick - firstClick;

      if (timeDifference <= this.clickTimeWindow) {
        // Validation successful!
        this.isValidated = true;
        feedback.isValidated = true;
        feedback.message = `🎉 CAPTCHA passed! (${this.clicksRequired} rapid clicks detected)`;

        if (this.validationCallback) {
          this.validationCallback(feedback);
        }
      } else {
        // Clicks were too slow, reset the sequence
        this.clickSequence = [];
        feedback.message = '⏱️ Clicks were too slow. Starting over...';
      }
    } else {
      // Set a timeout to reset the sequence if no click within the time window
      this.clickTimeout = setTimeout(() => {
        if (this.clickSequence.length > 0 && this.clickSequence.length < this.clicksRequired) {
          this.clickSequence = [];
          if (this.clickFeedbackCallback) {
            this.clickFeedbackCallback({
              clickCount: 0,
              clicksRequired: this.clicksRequired,
              message: '⏱️ Too slow. Reset. Click again!',
              isValidated: false
            });
          }
        }
      }, this.clickTimeWindow);
    }

    // Call click feedback callback
    if (this.clickFeedbackCallback) {
      this.clickFeedbackCallback(feedback);
    }

    return feedback;
  }

  /**
   * Set a callback to be called when validation is complete
   * @param {Function} callback - Function to call on validation
   */
  onValidation(callback) {
    this.validationCallback = callback;
  }

  /**
   * Set a callback to be called on each click
   * @param {Function} callback - Function to call on each click
   */
  onClickFeedback(callback) {
    this.clickFeedbackCallback = callback;
  }

  /**
   * Get the current validation state
   * @returns {Object} Current validation state
   */
  getState() {
    return {
      clicksRequired: this.clicksRequired,
      currentClicks: this.clickSequence.length,
      isValidated: this.isValidated,
      progress: `${this.clickSequence.length}/${this.clicksRequired}`,
      clickSequence: this.clickSequence
    };
  }

  /**
   * Check if CAPTCHA is validated
   * @returns {boolean} True if validated
   */
  isComplete() {
    return this.isValidated;
  }

  /**
   * Reset the validator
   */
  reset() {
    this.clickSequence = [];
    this.isValidated = false;
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }
  }
}
