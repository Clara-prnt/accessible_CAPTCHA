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

export class CaptchaGenerator {
  constructor() {
    this.targetWord = null;
    this.clicksRequired = null;
    this.scenario = null;
    this.scenarios = null;
    this.ui = new CaptchaUI();
    this.audio = new CaptchaAudio();
    this.validator = null; // Will be initialized after generating the scenario
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

  async initialize() {
    try {
      // Step 1: Initialize CAPTCHA session and get security tokens
      await this.initializeCaptchaSession();

      // Step 2: Load scenarios from the JSON file
      await this.loadScenarios();

      // Step 3: Generate a random scenario with a target word and number of clicks required
      this.generateScenario();

      // Step 4: Display instructions to the user with the target word and number of clicks required
      this.displayInstructions();

      // Step 5: Start audio (and word display will sync with it)
      await this.startAudio();

      // Step 6: Load words from the backend
      await this.loadTextboxWords();
    } catch (error) {
      console.error('Error initializing CAPTCHA:', error);
      this.ui.showError('Failed to initialize CAPTCHA: ' + error.message);
    }
  }

  async initializeCaptchaSession() {
    try {
      console.log('🔐 Initializing CAPTCHA security session...');
      const response = await fetch('/backend/InitCaptcha.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.csrf_token || !data.captcha_session_id) {
        throw new Error('Failed to get security tokens from InitCaptcha');
      }

      this.csrfToken = data.csrf_token;
      this.captchaSessionId = data.captcha_session_id;

      console.log('✅ Security session initialized');
      console.log('   CSRF Token:', this.csrfToken.substring(0, 10) + '...');
      console.log('   Session ID:', this.captchaSessionId.substring(0, 10) + '...');
    } catch (error) {
      console.error('❌ Failed to initialize CAPTCHA session:', error);
      throw new Error('Failed to initialize CAPTCHA security: ' + error.message);
    }
  }

  async loadScenarios() {
    try {
      const response = await fetch('/src/data/scenarios.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.scenarios = data.scenarios;
    } catch (error) {
      console.error('Erreur lors du chargement des scénarios:', error);
      throw new Error('Impossible de charger les scénarios CAPTCHA');
    }
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

    // Initialize the validator with only the clicks required
    // (Clicks are now detected anywhere on screen, not tied to a specific word)
    this.validator = new CaptchaValidator(this.clicksRequired);

    // Set up validation callbacks
    this.validator.onClickFeedback((feedback) => {
      this.handleClickFeedback(feedback);
    });

    this.validator.onValidation((feedback) => {
      this.handleValidationComplete(feedback);
    });
  }

  displayInstructions() {
    const explanation = document.getElementById('explanation');
    explanation.textContent =
        `You will hear an everyday situation, and see random words appear.
        Click ${this.clicksRequired} times rapidly anywhere on the screen OR press Shift ${this.clicksRequired} times when you hear/see "${this.targetWord}".
        To start the verification, click on the play button once. You can listen to the audio multiple times.`;
  }

  async loadTextboxWords() {
    try {
      // API endpoint for the backend
      const apiUrl = '/backend/GenerateTextbox.php';

      console.log('📡 Fetching words from:', apiUrl);
      console.log('Request data:', {
        scenarioId: this.scenario.id,
        targetWord: this.targetWord,
        clicksRequired: this.clicksRequired,
      });

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get response as text first to debug
      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 100));

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON');
        console.error('Response starts with:', responseText.substring(0, 50));
        throw new Error('Server returned invalid JSON. Make sure PHP server is running on port 8000');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Update CSRF token for next request
      if (data.csrf_token) {
        this.csrfToken = data.csrf_token;
        console.log('✅ CSRF token updated');
      }

      console.log('✅ Words received:', data.words);

      // Initialize the UI with the received words
      this.ui.initialize(
          data.words,
          data.wordDisplayDuration,
          data.wordInterval
      );

      // Set up the click/keyboard validation handler
      // Users can click anywhere on the screen OR press Shift key
      this.ui.setClickValidationHandler((event, inputType) => {
        // Only count clicks/keys if audio is playing
        if (!this.isValidationActive) {
          console.log(`${inputType === 'keyboard' ? 'Shift key' : 'Click'} ignored (audio not playing)`);
          return;
        }

        // Register the input (click or keyboard)
        const feedback = this.validator.registerClick();
        const method = inputType === 'keyboard' ? 'Shift key' : 'click';
        console.log(`${method} detected:`, feedback);
      });
    } catch (error) {
      console.error('Error loading textbox words:', error);
      throw new Error('Failed to load textbox words: ' + error.message);
    }
  }

  async startAudio() {
    try {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
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
      // This gives time for screen readers to read the description
    } catch (error) {
      console.error('Error starting audio:', error);
      this.ui.showError('Failed to start audio: ' + error.message);
      throw error;
    }
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
    console.log('Click feedback:', feedback);
    this.ui.displayClickFeedback(feedback);
  }

  /**
   * Handle validation complete event
   * @param {Object} feedback - Feedback object from validator
   */
  handleValidationComplete(feedback) {
    console.log('✅ CAPTCHA validation complete:', feedback);
    this.ui.displayClickFeedback(feedback);

    // Stop displaying words and playing audio
    this.ui.stopDisplayingWords();

    // Optionally show a success message
    this.ui.showSuccess('CAPTCHA Validation Complete! You can now submit the form.');

    // Log the validation state for debugging
    const state = this.validator.getState();
    console.log('Final validation state:', state);
  }

  // Cleanup method to stop the UI when CAPTCHA is done
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
  }
}