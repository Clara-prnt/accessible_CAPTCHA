/**
 *
    * Captcha Generator for Audio-Based Challenges
    * This module generates audio-based CAPTCHA challenges where users must listen to a scenario and
    * click when they hear a specific target word. The generator creates random scenarios,
    * selects target words, and configures the difficulty by determining how many clicks are required.
 *
 **/

//TODO: Génération des scénarios audio | Sélection des mots cibles | Configuration de la difficulté

export class CaptchaGenerator {
  constructor() {
    this.targetWord = null;
    this.clicksRequired = null;
    this.scenario = null;
    this.scenarios = null;
  }

  async initialize() {
    // Load scenarios from the JSON file
    await this.loadScenarios();

    // Generate a random scenario with a target word and number of clicks required
    this.generateScenario();

    // Display instructions to the user with the target word and number of clicks required
    this.displayInstructions();

    // Start audio
    await this.startAudio();
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

  async startAudio() {
    // TODO: Implement audio playback using Web Audio API or HTML5 Audio
    // This should play the audio scenario and handle pausing/resuming on click
    console.log('Starting audio for scenario:', this.scenario.description);
  }
}