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

export class CaptchaGenerator {
  constructor() {
    this.targetWord = null;
    this.clicksRequired = null;
    this.scenario = null;
    this.scenarios = null;
    this.ui = new CaptchaUI();
    this.audio = new CaptchaAudio();
  }

  async initialize() {
    try {
      // Load scenarios from the JSON file
      await this.loadScenarios();

      // Generate a random scenario with a target word and number of clicks required
      this.generateScenario();

      // Display instructions to the user with the target word and number of clicks required
      this.displayInstructions();

      // Load words from the backend
      await this.loadTextboxWords();

      // Start audio (and word display will sync with it)
      await this.startAudio();
    } catch (error) {
      console.error('Error initializing CAPTCHA:', error);
      this.ui.showError('Failed to initialize CAPTCHA: ' + error.message);
    }
  }

  async loadScenarios() {
    try {
      const response = await fetch('./src/data/scenarios.json');
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

    // Random number of clicks required between 2 and 4
    this.clicksRequired = Math.floor(Math.random() * 3) + 2;
  }

  displayInstructions() {
    const explanation = document.getElementById('explanation');
    explanation.textContent =
        `You will hear an everyday situation, and see random words appear.
        Click ${this.clicksRequired} times anywhere on the screen when you hear/see "${this.targetWord}".
        To pause the audio, click one time on the screen. Click one time again to resume the audio.`;
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

      console.log('✅ Words received:', data.words);

      // Initialize the UI with the received words
      this.ui.initialize(
          data.words,
          data.wordDisplayDuration,
          data.wordInterval
      );
    } catch (error) {
      console.error('Error loading textbox words:', error);
      throw new Error('Failed to load textbox words: ' + error.message);
    }
  }

  async startAudio() {
    try {
      const apiUrl = '/backend/GenerateAudio.php';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId: this.scenario.id,
          targetWord: this.targetWord,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

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
          this.ui.startDisplayingWords();
        },
        onPause: () => {
          this.ui.setPlayPauseState(false);
          this.ui.setAudioStatus('Paused');
          this.ui.stopDisplayingWords();
        },
        onEnded: () => {
          this.ui.setPlayPauseState(false);
          this.ui.setAudioStatus('Finished');
          this.ui.stopDisplayingWords();
        },
        onError: () => {
          this.ui.setAudioStatus('Audio error');
          this.ui.showError('Audio playback failed.');
        },
      });

      await this.audio.load(data.audioUrl);

      this.ui.setWordBoxToggleHandler(() => this.toggleAudio());
      this.ui.setAudioStatus('Ready');

      try {
        await this.audio.play();
      } catch (playError) {
        this.ui.setPlayPauseState(false);
        this.ui.setAudioStatus('Press Play to start');
        console.warn('Autoplay blocked or failed:', playError);
      }
    } catch (error) {
      console.error('Error starting audio:', error);
      this.ui.showError('Failed to start audio: ' + error.message);
      throw error;
    }
  }

  async toggleAudio() {
    try {
      await this.audio.toggle();
    } catch (error) {
      this.ui.showError('Audio control failed: ' + error.message);
    }
  }

  // Cleanup method to stop the UI when CAPTCHA is done
  cleanup() {
    if (this.audio) {
      this.audio.stop();
    }
    if (this.ui) {
      this.ui.destroy();
    }
  }
}