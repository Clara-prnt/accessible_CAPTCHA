/**
 *
    * Captcha Generator for Audio-Based Challenges
    * This module generates audio-based CAPTCHA challenges where users must listen to a scenario and
    * click when they hear a specific target word. The generator creates random scenarios,
    * selects target words, and configures the difficulty by determining how many clicks are required.
 *
 **/

import { CaptchaUI } from './ui.js';
import { CaptchaAudio } from './audio.js';
import { CaptchaValidator } from './validator.js';
import { AccessibilityManager } from './accessibility.js';
import { CaptchaActions } from './actions.js';

export class CaptchaGenerator {
  constructor() {
    this.targetWord = null;
    this.clicksRequired = null;
    this.scenario = null;
    this.scenarios = null;
    this.ui = new CaptchaUI();
    this.audio = new CaptchaAudio();
    this.validator = null; // Will be initialized after generating the scenario
    this.accessibility = new AccessibilityManager(); // Initialize accessibility manager
    this.actions = new CaptchaActions(this);
    this.leadInMs = 0;
    this.wordStartTimeout = null;
    this.wordStartRemainingMs = 0;
    this.wordStartTimestamp = 0;
    this.wordsStarted = false;
    this.isValidationActive = false; // Only count clicks when audio is playing

    // Security tokens (initialized by initializeCaptchaSession)
    this.csrfToken = null;
    this.captchaSessionId = null;
  }

  /**
   * Initialize the CAPTCHA generator by setting up the session, loading scenarios, and preparing the UI and audio
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.accessibility.initialize();
      this.accessibility.announce('CAPTCHA initialization starting', 'polite');
      this.actions.initialize();
      await this.initializeCaptchaSession();
      await this.loadScenarios();
      this.generateScenario();
      this.displayInstructions();
      await this.startAudio();
      await this.loadTextboxWords();
    } catch (error) {
      console.error('Error initializing CAPTCHA:', error);
      this.ui.showError('Failed to initialize CAPTCHA: ' + error.message);
    }
  }

  /**
   * Initialize CAPTCHA session by requesting security tokens from the backend
    * This is necessary to protect against CSRF attacks and ensure that the CAPTCHA session is valid
   * @returns {Promise<void>}
   */
  async initializeCaptchaSession() {
    const response = await fetch('/backend/InitCaptcha.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`InitCaptcha request failed with HTTP ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(`InitCaptcha returned invalid JSON : ${parseError}`);
    }

    if (!data.success || !data.csrf_token || !data.captcha_session_id) {
      throw new Error('InitCaptcha response missing required security tokens');
    }

    this.csrfToken = data.csrf_token;
    this.captchaSessionId = data.captcha_session_id;
  }

  async loadScenarios() {
    const response = await fetch('/src/data/scenarios.json');
    if (!response.ok) {
      throw new Error(`Failed to load scenarios (HTTP ${response.status})`);
    }

    const data = await response.json();
    if (!Array.isArray(data.scenarios) || data.scenarios.length === 0) {
      throw new Error('Scenarios payload is invalid or empty');
    }

    this.scenarios = data.scenarios;
  }

  generateScenario() {
    // Select a random scenario from the loaded scenarios
    const randomIndex = Math.floor(Math.random() * this.scenarios.length);
    this.scenario = this.scenarios[randomIndex];

    // Select a random target word from the scenario's words
    const wordIndex = Math.floor(Math.random() * this.scenario.words.length);
    this.targetWord = this.scenario.words[wordIndex];

    // Random number of clicks required between 2 and 3
    this.clicksRequired = Math.floor(Math.random() * 2) + 2;

    // Initialize the validator with clicks required AND target word
    this.validator = new CaptchaValidator(this.clicksRequired, this.targetWord);

    // Set up validation callbacks
    this.validator.onClickFeedback((feedback) => {
      this.handleClickFeedback(feedback);
    });

    this.validator.onValidation((feedback) => {
      this.handleValidationComplete(feedback);
    });

    // Set up failure callback for exhausted attempts
    this.validator.onFailure((feedback) => {
      this.handleValidationFailed(feedback);
    });
  }

  displayInstructions() {
    const explanation = document.getElementById('explanation');
    explanation.textContent =
        `You will hear an everyday situation, and see random words appear.
        Press shift ${this.clicksRequired} times rapidly when you hear or see "${this.targetWord}".
        To start the verification, click on the play button once. You can listen to the audio multiple times.`;

    // Announce instructions to screen readers
    this.accessibility.announceInstructions(this.targetWord, this.clicksRequired);
  }

  async loadTextboxWords() {
    // API endpoint for the backend
    const apiUrl = '/backend/GenerateTextbox.php';
    console.log('📡 Fetching words from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenarioId: this.scenario.id,
        targetWord: this.targetWord,
        clicksRequired: this.clicksRequired,
        csrf_token: this.csrfToken,
        captcha_session_id: this.captchaSessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`GenerateTextbox failed (HTTP ${response.status})`);
    }

    // Get response as text first to debug
    const responseText = await response.text();

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Response starts with:', responseText.substring(0, 50));
      throw new Error(`Server returned invalid JSON. Make sure PHP server is running on port 8000. Cause: ${parseError}`);
    }

    if (data.error) {
      throw new Error(`GenerateTextbox error: ${data.error}`);
    }

    if (data.csrf_token) {
      this.csrfToken = data.csrf_token;
      console.log('✅ CSRF token updated');
    }

    this.ui.initialize(
      data.words,
      data.wordDisplayDuration,
      data.wordInterval
    );

    // Set up the click/keyboard validation handler
    this.ui.setClickValidationHandler((event, inputType) => {
      if (!this.isValidationActive) {
        console.log(`${inputType === 'keyboard' ? 'Shift key' : 'Click'} ignored (audio not playing)`);
        return;
      }

      if (inputType === 'click') {
        const target = event.target;
        const clickedWordArea = target instanceof Element && target.closest('#word-display');
        if (!clickedWordArea) {
          return;
        }
      }

      const currentWord = this.ui.getCurrentWord();
      this.validator.registerClick(currentWord);
    });
  }

  /**
   * Start audio playback and synchronize word display
   * @returns {Promise<void>}
   */
  async startAudio() {
    const apiUrl = '/backend/GenerateAudio.php';
    console.log('📡 Generating audio...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenarioId: this.scenario.id,
        targetWord: this.targetWord,
        csrf_token: this.csrfToken,
        captcha_session_id: this.captchaSessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ GenerateAudio error response:', errorData.substring(0, 200));
      throw new Error(`GenerateAudio failed (HTTP ${response.status})`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`GenerateAudio error: ${data.error}`);
    }

    // Update CSRF token for next request
    if (data.csrf_token) {
      this.csrfToken = data.csrf_token;
      console.log('✅ CSRF token updated');
    }

    const leadInSeconds = Number(data.leadInSeconds ?? 0);
    this.leadInMs = Math.max(0, leadInSeconds * 1000);
    this.wordStartRemainingMs = this.leadInMs;
    this.wordsStarted = false;
    this.ui.initializeAudioControls({
      onToggle: () => this.toggleAudio(),
      onVolumeChange: (value) => this.audio.setVolume(value),
      onRateChange: (value) => this.audio.setPlaybackRate(value),
    });

    this.ui.setAudioStatus('Loading audio...');
    this.audio.setHandlers({
      onPlay: () => {
        this.ui.setPlayPauseState(true);
        this.ui.setAudioStatus('Playing');
        this.isValidationActive = true; // Enable click/key validation
        if (this.wordsStarted) {
          this.ui.startDisplayingWords();
        } else {
          this.scheduleWordStart();
        }
      },
      onPause: () => {
        this.ui.setPlayPauseState(false);
        this.ui.setAudioStatus('Paused');
        this.isValidationActive = false; // Disable click/key validation
        if (this.wordStartTimeout) {
          clearTimeout(this.wordStartTimeout);
          this.wordStartTimeout = null;
          const elapsed = Date.now() - this.wordStartTimestamp;
          this.wordStartRemainingMs = Math.max(0, this.wordStartRemainingMs - elapsed);
        }
        if (this.wordsStarted) {
          this.ui.stopDisplayingWords();
        }
      },
      onEnded: () => {
        this.ui.setPlayPauseState(false);
        this.ui.setAudioStatus('Finished');
        this.isValidationActive = false; // Disable click/key validation
        if (this.wordStartTimeout) {
          clearTimeout(this.wordStartTimeout);
          this.wordStartTimeout = null;
        }
        this.ui.stopDisplayingWords();
      },
      onError: () => {
        this.ui.setAudioStatus('Audio error');
        this.isValidationActive = false; // Disable on error
        this.ui.showError('Audio playback failed.');
      },
    });

    await this.audio.load(data.audioUrl);

    this.ui.setWordBoxToggleHandler(() => this.toggleAudio());
    this.ui.setAudioStatus('Ready - Click Play to start');

    // Don't autoplay - let the user click Play
  }

  scheduleWordStart() {
    if (this.wordsStarted) return;
    if (this.wordStartTimeout) {
      clearTimeout(this.wordStartTimeout);
    }

    if (this.wordStartRemainingMs <= 0) {
      this.wordsStarted = true;
      this.ui.startDisplayingWords();
      return;
    }

    this.wordStartTimestamp = Date.now();
    this.wordStartTimeout = setTimeout(() => {
      this.wordStartTimeout = null;
      this.wordStartRemainingMs = 0;
      this.wordsStarted = true;
      this.ui.startDisplayingWords();
    }, this.wordStartRemainingMs);
  }

  async toggleAudio() {
    try {
      await this.audio.toggle();
    } catch (error) {
      this.ui.showError('Audio control failed: ' + error.message);
    }
  }

  /**
   * Handle click feedback from the validator
   * @param {Object} feedback - Feedback object from validator
   */
  handleClickFeedback(feedback) {
    this.ui.displayClickFeedback(feedback);

    // Announce feedback to screen readers
    this.accessibility.announceFeedback(feedback);
  }

  /**
   * Handle validation complete event
   * @param {Object} feedback - Feedback object from validator
   */
  handleValidationComplete(feedback) {
    console.log('✅ CAPTCHA validation complete:', feedback);

    // Stop audio immediately
    this.audio.stop();

    // Stop displaying words
    this.ui.stopDisplayingWords();

    // Hide audio controls and word display
    this.ui.hideAudioControls();
    this.ui.hideWordDisplay();

    // Display validation feedback
    this.ui.displayClickFeedback(feedback);

    // Announce success to screen readers
    this.accessibility.announceValidationComplete();

    // Emit a custom event to notify about validation completion
    const validationEvent = new CustomEvent('captcha-validated', {
      detail: {
        feedback: feedback,
        validator: this.validator.getState()
      }
    });
    window.dispatchEvent(validationEvent);

    // Log the validation state for debugging
    const state = this.validator.getState();
    console.log('Final validation state:', state);
  }

  /**
   * Handle validation failed event (all attempts exhausted)
   * @param {Object} feedback - Feedback object from validator
   */
  handleValidationFailed(feedback) {
    console.log('❌ CAPTCHA validation failed:', feedback);

    // Stop audio immediately
    this.audio.stop();

    // Stop displaying words
    this.ui.stopDisplayingWords();

    // Hide audio controls and word display
    this.ui.hideAudioControls();
    this.ui.hideWordDisplay();

    // Display failure feedback
    this.ui.displayClickFeedback(feedback);

    // Announce failure to screen readers
    this.accessibility.announceValidationFailed();

    // Emit a custom event to notify about validation failure
    const failureEvent = new CustomEvent('captcha-failed', {
      detail: {
        feedback: feedback,
        validator: this.validator.getState()
      }
    });
    window.dispatchEvent(failureEvent);

    // Log the failure state for debugging
    const state = this.validator.getState();
    console.log('Final failure state:', state);
  }

  /**
   * Cleanup resources and event listeners when CAPTCHA is closed or reset
    * This should be called when the CAPTCHA is no longer needed to prevent memory leaks and stop any ongoing processes
   */
  cleanup() {
    if (this.wordStartTimeout) {
      clearTimeout(this.wordStartTimeout);
      this.wordStartTimeout = null;
    }
    if (this.audio) {
      this.audio.stop();
    }
    if (this.ui) {
      this.ui.destroy();
    }
    if (this.validator) {
      this.validator.reset();
    }
    if (this.actions) {
      this.actions.cleanup();
    }
    if (this.accessibility) {
      this.accessibility.destroy();
    }
  }
}