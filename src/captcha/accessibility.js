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
    this.audioPlayHandler = null;
    this.keydownHandler = null;
    this.helpDialog = null;
    this.skipLink = null;
    this.ariaObserver = null;
    this.liveRegionResetTimeout = null;
    this.isInitialized = false;
  }

  /**
   * Initialize accessibility features
   */
  initialize() {
    if (this.isInitialized) return;

    this.createLiveRegion();
    this.enhanceARIA();
    this.observeDynamicElements();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.pauseSpeechSynthesisDuringAudio();

    this.isInitialized = true;
  }

  /**
   * Pause speech synthesis during audio playback to avoid conflicts
   */
  pauseSpeechSynthesisDuringAudio() {
    if (!window.speechSynthesis || this.audioPlayHandler) return;

    this.audioPlayHandler = (event) => {
      if (event.target?.tagName === 'AUDIO' && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };

    window.addEventListener('play', this.audioPlayHandler, true);
  }

  /**
   * Create ARIA live region for screen reader announcements
   * All dynamic updates will be announced to screen readers
   */
  createLiveRegion() {
    const existing = document.getElementById('captcha-aria-live');
    if (existing) {
      this.liveRegion = existing;
      return;
    }

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
    if (!message) return;

    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = '';
      // Force live-region update even when message is similar.
      requestAnimationFrame(() => {
        if (this.liveRegion) this.liveRegion.textContent = message;
      });

      if (priority === 'assertive') {
        if (this.liveRegionResetTimeout) {
          clearTimeout(this.liveRegionResetTimeout);
        }
        this.liveRegionResetTimeout = setTimeout(() => {
          if (this.liveRegion) {
            this.liveRegion.setAttribute('aria-live', 'polite');
          }
          this.liveRegionResetTimeout = null;
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
    const applyAria = () => {
      const audioToggle = document.getElementById('audio-toggle');
      if (audioToggle) {
        audioToggle.setAttribute('aria-label', 'Play or pause audio');
        audioToggle.setAttribute('aria-pressed', audioToggle.getAttribute('aria-pressed') || 'false');
      }

      const wordDisplay = document.getElementById('word-display');
      if (wordDisplay) {
        wordDisplay.setAttribute('role', 'status');
        wordDisplay.setAttribute('aria-live', 'polite');
        wordDisplay.setAttribute('aria-label', 'Word display area');
      }

      const validation = document.getElementById('validation');
      if (validation) {
        validation.setAttribute('role', 'alert');
        validation.setAttribute('aria-live', 'assertive');
      }

      const captchaCard = document.getElementById('captcha_card');
      if (captchaCard) {
        captchaCard.setAttribute('role', 'region');
        captchaCard.setAttribute('aria-label', 'CAPTCHA verification area');
      }

      const error = document.getElementById('error');
      if (error) {
        error.setAttribute('role', 'alert');
        error.setAttribute('aria-live', 'assertive');
      }
    };

    applyAria();
  }

  /**
   * Observe dynamic elements for ARIA updates
   */
  observeDynamicElements() {
    if (this.ariaObserver) return;

    this.ariaObserver = new MutationObserver(() => {
      this.enhanceARIA();
    });

    this.ariaObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Setup full keyboard navigation
   */
  setupKeyboardNavigation() {
    if (this.keydownHandler) return;

    this.keydownHandler = (event) => {
      const active = document.activeElement;
      const isButton = active?.tagName === 'BUTTON';

      // Space: activate focused button
      if (event.key === ' ' && isButton) {
        event.preventDefault();
        active.click();
        return;
      }

      // Enter: same as Space for buttons
      if (event.key === 'Enter' && isButton) {
        event.preventDefault();
        active.click();
        return;
      }

      // Escape: close dialog (if any)
      if (event.key === 'Escape') {
        if (this.helpDialog) {
          event.preventDefault();
          this.closeKeyboardHelp();
        }
        return;
      }

      // Alt + H: Help (keyboard shortcuts info)
      if (event.altKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        this.showKeyboardHelp();
      }
    };

    document.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * Show keyboard shortcuts help
   */
  showKeyboardHelp() {
    if (this.helpDialog && document.body.contains(this.helpDialog)) {
      const closeBtn = this.helpDialog.querySelector('#close-help');
      if (closeBtn) closeBtn.focus();
      this.announce('Keyboard shortcuts help is already open.', 'polite');
      return;
    }

    const helpText = `
      Keyboard shortcuts:
      - Tab: Move to next button
      - Shift+Tab: Move to previous button
      - Space or Enter: Activate button
      - Shift: Register click for CAPTCHA (same as clicking)
      - Alt+H: Show this help
      - Escape: Close this help dialog
    `;
    this.announce(helpText, 'assertive');

    this.helpDialog = document.createElement('div');
    this.helpDialog.setAttribute('role', 'dialog');
    this.helpDialog.setAttribute('aria-modal', 'true');
    this.helpDialog.className = 'keyboard-help-dialog';
    this.helpDialog.innerHTML = `
      <h2>Keyboard Shortcuts</h2>
      <ul>
        <li><kbd>Tab</kbd> - Move to next button</li>
        <li><kbd>Shift + Tab</kbd> - Move to previous button</li>
        <li><kbd>Space</kbd> or <kbd>Enter</kbd> - Activate button</li>
        <li><kbd>Shift</kbd> - Register click for CAPTCHA</li>
        <li><kbd>Alt + H</kbd> - Show this help</li>
        <li><kbd>Escape</kbd> - Close this help</li>
      </ul>
      <button id="close-help" type="button">Close</button>
    `;
    document.body.appendChild(this.helpDialog);

    const closeBtn = this.helpDialog.querySelector('#close-help');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeKeyboardHelp());
      closeBtn.focus();
    }
  }

  /**
   * Close the keyboard help dialog
   */
  closeKeyboardHelp() {
    if (this.helpDialog && document.body.contains(this.helpDialog)) {
      this.helpDialog.remove();
    }
    this.helpDialog = null;
    this.announce('Keyboard help closed.', 'polite');
  }

  /**
   * Setup focus management
   */
  setupFocusManagement() {
    if (!this.skipLink) {
      this.addSkipLink();
    }
  }

  /**
   * Add "Skip to main content" link
   */
  addSkipLink() {
    const existing = document.querySelector('.skip-link[href="#captcha_card"]');
    if (existing) {
      this.skipLink = existing;
      return;
    }

    const skipLink = document.createElement('a');
    skipLink.href = '#captcha_card';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    document.body.insertBefore(skipLink, document.body.firstChild);
    this.skipLink = skipLink;
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
      You will hear an everyday situation with random words. 
      Press shift ${clicksRequired} times rapidly when you hear the word: ${targetWord}.
      Press Alt+H for keyboard shortcuts help.
      Click the Play button to start the verification.
    `;
    this.announce(message, 'assertive');
  }

  /**
   * Cleanup accessibility features
   */
  destroy() {
    if (this.audioPlayHandler) {
      window.removeEventListener('play', this.audioPlayHandler, true);
      this.audioPlayHandler = null;
    }

    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    if (this.ariaObserver) {
      this.ariaObserver.disconnect();
      this.ariaObserver = null;
    }

    if (this.helpDialog && document.body.contains(this.helpDialog)) {
      this.helpDialog.remove();
      this.helpDialog = null;
    }

    if (this.skipLink && document.body.contains(this.skipLink)) {
      this.skipLink.remove();
      this.skipLink = null;
    }

    if (this.liveRegionResetTimeout) {
      clearTimeout(this.liveRegionResetTimeout);
      this.liveRegionResetTimeout = null;
    }

    if (this.liveRegion && document.body.contains(this.liveRegion)) {
      this.liveRegion.remove();
    }
    this.liveRegion = null;
    this.isInitialized = false;
  }
}

