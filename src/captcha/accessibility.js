/* this file has an important role in ensuring that the captcha is accessible to all users,
including those with disabilities. It will handle keyboard support and ensure the solution is
compatible with tools such as ScreenReader. */

/**
 * Accessibility Manager for CAPTCHA
 * Ensures WCAG 2.1 AA compliance with:
 * - ARIA labels and live regions for screen readers
 * - Full keyboard navigation support
 * - Clear visual focus indicators
 * - Text alternatives for audio
 * - High contrast and readable fonts
 */
export class AccessibilityManager {
  constructor() {
    this.liveRegion = null;
    this.ariaAnnouncer = null;
    this.keyboardHandler = null;
    this.focusManager = null;
  }

  /**
   * Initialize accessibility features
   */
  initialize() {
    this.createLiveRegion();
    this.enhanceARIA();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.addVisualFocusIndicators();
    this.pauseSpeechSynthesisDuringAudio();
  }

  /**
   * Pause speech synthesis during audio playback to avoid conflicts
   */
  pauseSpeechSynthesisDuringAudio() {
    if (!window.speechSynthesis) return;

    // Listen for audio playback events in the window
    window.addEventListener('play', (e) => {
      if (e.target?.tagName === 'AUDIO') {
        // Audio is playing, cancel any speech synthesis
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      }
    }, true);
  }

  /**
   * Create ARIA live region for screen reader announcements
   * All dynamic updates will be announced to screen readers
   */
  createLiveRegion() {
    this.liveRegion = document.createElement('div');
    this.liveRegion.id = 'captcha-aria-live';
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only'; // Screen reader only
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - 'polite' or 'assertive'
   * @param {boolean} skipSpeak - Skip speech synthesis for this announcement
   */
  announce(message, priority = 'polite', skipSpeak = false) {
    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = message;

      // Reset to polite after assertive announcement
      if (priority === 'assertive') {
        setTimeout(() => {
          this.liveRegion.setAttribute('aria-live', 'polite');
        }, 1000);
      }
    }

    // Cancel any ongoing speech synthesis to prevent conflicts with audio
    if (!skipSpeak && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Enhance ARIA labels on important elements
   */
  enhanceARIA() {
    // Audio player
    const audioToggle = document.getElementById('audio-toggle');
    if (audioToggle) {
      audioToggle.setAttribute('aria-label', 'Play or pause audio');
      audioToggle.setAttribute('aria-pressed', 'false');
    }

    // Word display
    const wordDisplay = document.getElementById('word-display');
    if (wordDisplay) {
      wordDisplay.setAttribute('role', 'status');
      wordDisplay.setAttribute('aria-live', 'polite');
      wordDisplay.setAttribute('aria-label', 'Word display area');
    }

    // Validation feedback
    const validation = document.getElementById('validation');
    if (validation) {
      validation.setAttribute('role', 'alert');
      validation.setAttribute('aria-live', 'assertive');
    }

    // CAPTCHA card
    const captchaCard = document.getElementById('captcha_card');
    if (captchaCard) {
      captchaCard.setAttribute('role', 'region');
      captchaCard.setAttribute('aria-label', 'CAPTCHA verification area');
    }

    // Error messages
    const error = document.getElementById('error');
    if (error) {
      error.setAttribute('role', 'alert');
      error.setAttribute('aria-live', 'assertive');
    }
  }

  /**
   * Setup full keyboard navigation
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
      // Tab: native focus management (already works)
      // Space: activate focused button
      if (event.key === ' ' && document.activeElement?.tagName === 'BUTTON') {
        event.preventDefault();
        document.activeElement.click();
        this.announce('Button activated');
      }

      // Enter: same as Space for buttons
      if (event.key === 'Enter' && document.activeElement?.tagName === 'BUTTON') {
        event.preventDefault();
        document.activeElement.click();
        this.announce('Button activated');
      }

      // Escape: close dialog (if any)
      if (event.key === 'Escape') {
        this.announce('Escape key pressed');
      }

      // Alt + H: Help (keyboard shortcuts info)
      if (event.altKey && event.key === 'h') {
        event.preventDefault();
        this.showKeyboardHelp();
      }
    });
  }

  /**
   * Show keyboard shortcuts help
   */
  showKeyboardHelp() {
    const helpText = `
      Keyboard shortcuts:
      - Tab: Move to next button
      - Shift+Tab: Move to previous button
      - Space or Enter: Activate button
      - Shift: Register click for CAPTCHA (same as clicking)
      - Alt+H: Show this help
    `;
    this.announce(helpText, 'assertive');

    // Also show a visual alert
    const helpDialog = document.createElement('div');
    helpDialog.setAttribute('role', 'dialog');
    helpDialog.setAttribute('aria-label', 'Keyboard shortcuts help');
    helpDialog.className = 'keyboard-help-dialog';
    helpDialog.innerHTML = `
      <h2>Keyboard Shortcuts</h2>
      <ul>
        <li><kbd>Tab</kbd> - Move to next button</li>
        <li><kbd>Shift + Tab</kbd> - Move to previous button</li>
        <li><kbd>Space</kbd> or <kbd>Enter</kbd> - Activate button</li>
        <li><kbd>Shift</kbd> - Register click for CAPTCHA</li>
        <li><kbd>Alt + H</kbd> - Show this help</li>
      </ul>
      <button id="close-help">Close</button>
    `;
    document.body.appendChild(helpDialog);

    document.getElementById('close-help').addEventListener('click', () => {
      helpDialog.remove();
      this.announce('Keyboard help closed');
    });
  }

  /**
   * Setup focus management
   */
  setupFocusManagement() {
    // Track focused element
    document.addEventListener('focus', (event) => {
      if (event.target?.tagName === 'BUTTON') {
        this.announce(`Button focused: ${event.target.textContent}`);
      }
    }, true);

    // Skip to main content link
    this.addSkipLink();
  }

  /**
   * Add "Skip to main content" link
   */
  addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#captcha_card';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  /**
   * Add visual focus indicators for keyboard users
   * All styles are defined in style.css
   */
  addVisualFocusIndicators() {
    // Focus indicators are now defined in style.css
    // This method is kept for consistency but no longer injects styles
  }

  /**
   * Announce click feedback
   * @param {Object} feedback - Feedback object from validator
   */
  announceFeedback(feedback) {
    let message = feedback.message;

    // Enhance message for screen readers
    if (feedback.wrongWord) {
      message = `Wrong word. ${message}`;
    }

    if (feedback.attemptFailed) {
      message = `Attempt failed. ${message}`;
    }

    if (feedback.isValidated) {
      message = `Success! ${message}`;
    }

    // Announce with appropriate priority
    const priority = feedback.isValidated ? 'assertive' : 'polite';
    this.announce(message, priority);
  }

  /**
   * Announce validation complete
   */
  announceValidationComplete() {
    this.announce(
      'CAPTCHA validation successful.',
      'assertive'
    );
  }

  /**
   * Announce validation failed
   */
  announceValidationFailed() {
    this.announce(
      'CAPTCHA verification failed. All attempts exhausted. We will not log you in.',
      'assertive'
    );
  }

  /**
   * Announce instructions
   */
  announceInstructions(targetWord, clicksRequired) {
    const message = `
      CAPTCHA Instructions.
      You will hear an everyday situation. Press shift ${clicksRequired} times rapidly when you hear or see the word: ${targetWord}.
      Press Alt+H for keyboard shortcuts help.
      Click the Play button to start the verification.
    `;
    this.announce(message, 'assertive');
  }

  /**
   * Cleanup accessibility features
   */
  destroy() {
    if (this.liveRegion) {
      this.liveRegion.remove();
    }
  }
}

