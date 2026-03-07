/**
 * CAPTCHA Validator
 * This module detects rapid successive clicks (like a multi-click pattern)
 * to validate the CAPTCHA. Clicks must occur within a time window to be counted.
 */

export class CaptchaValidator {
  constructor(clicksRequired, targetWord) {
    this.clicksRequired = clicksRequired;
    this.targetWord = targetWord; // The word user should click on
    this.clickSequence = []; // Array of click timestamps
    this.clickTimeout = null; // Timeout to reset the sequence if too slow
    this.clickTimeWindow = 1200; // 1200ms between clicks to count as a sequence
    this.validationCallback = null;
    this.clickFeedbackCallback = null;
    this.failureCallback = null; // Callback for failed attempts
    this.isValidated = false;
    this.isFailed = false; // Track if user has exhausted attempts
    this.attemptsRemaining = 2; // Maximum 2 attempts
    this.currentAttempt = 1;
  }

  /**
   * Register a click with the currently displayed word
   * @param {null} currentWord - The word currently displayed to the user
   * @returns {Object} Feedback object with click information
   */
  registerClick(currentWord = null) {
    if (this.isValidated) {
      return { isValidated: true, message: 'CAPTCHA already validated' };
    }

    if (this.isFailed) {
      return { isFailed: true, message: '❌ Verification failed. No more attempts.' };
    }

    // Check if the click is on the correct word
    if (currentWord && currentWord !== this.targetWord) {
      const feedback = {
        clickCount: this.clickSequence.length,
        clicksRequired: this.clicksRequired,
        message: `❌ Wrong word! Click when you see/hear "${this.targetWord}"`,
        isValidated: false,
        wrongWord: true
      };

      if (this.clickFeedbackCallback) {
        this.clickFeedbackCallback(feedback);
      }

      return feedback;
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
      isValidated: false,
      attempt: this.currentAttempt,
      attemptsRemaining: this.attemptsRemaining
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
        // Clicks were too slow - this is a failed attempt
        this.handleFailedAttempt();
        feedback.message = `⏱️ Clicks were too slow. Attempt ${this.currentAttempt}/${this.attemptsRemaining + this.currentAttempt} failed.`;
        feedback.attemptFailed = true;
      }
    } else {
      // Set a timeout to reset the sequence if no click within the time window
      this.clickTimeout = setTimeout(() => {
        if (this.clickSequence.length > 0 && this.clickSequence.length < this.clicksRequired) {
          this.handleFailedAttempt();
          if (this.clickFeedbackCallback) {
            this.clickFeedbackCallback({
              clickCount: 0,
              clicksRequired: this.clicksRequired,
              message: `⏱️ Too slow. Attempt ${this.currentAttempt}/${this.attemptsRemaining + this.currentAttempt} failed.`,
              isValidated: false,
              attemptFailed: true,
              attempt: this.currentAttempt,
              attemptsRemaining: this.attemptsRemaining
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
   * Handle a failed attempt
   */
  handleFailedAttempt() {
    this.clickSequence = []; // Reset click sequence
    this.attemptsRemaining--;

    if (this.attemptsRemaining <= 0) {
      // No more attempts - user has failed
      this.isFailed = true;
      const failureFeedback = {
        isFailed: true,
        message: '❌ Verification failed. You have exhausted all attempts. We won\'t log you in.',
        attemptsRemaining: 0,
        attempt: this.currentAttempt
      };

      if (this.failureCallback) {
        this.failureCallback(failureFeedback);
      }
    } else {
      // Still have attempts remaining
      this.currentAttempt++;
    }
  }

  /**
   * Set a callback to be called when all attempts are exhausted
   * @param {Function} callback - Function to call on failure
   */
  onFailure(callback) {
    this.failureCallback = callback;
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
      isFailed: this.isFailed,
      attemptsRemaining: this.attemptsRemaining,
      currentAttempt: this.currentAttempt,
      progress: `${this.clickSequence.length}/${this.clicksRequired}`,
      clickSequence: this.clickSequence,
      targetWord: this.targetWord
    };
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
