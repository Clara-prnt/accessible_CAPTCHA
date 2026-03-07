/**
 * CaptchaAudio class manages audio playback for CAPTCHA challenges.
 * It provides methods to load, play, pause, and stop audio.
 */

export class CaptchaAudio {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.ambientAudio = new Audio();
    this.ambientAudio.preload = 'auto';
    this.ambientAudio.loop = true;
    this.ambientVolumeRatio = 0.22;
    this.handlers = {
      onPlay: null,
      onPause: null,
      onEnded: null,
      onError: null,
    };

    this.audio.addEventListener('play', () => {
      this.syncAmbientPlayback();
      if (this.handlers.onPlay) this.handlers.onPlay();
    });
    this.audio.addEventListener('pause', () => {
      this.ambientAudio.pause();
      if (this.handlers.onPause) this.handlers.onPause();
    });
    this.audio.addEventListener('ended', () => {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
      if (this.handlers.onEnded) this.handlers.onEnded();
    });
    this.audio.addEventListener('error', (event) => {
      if (this.handlers.onError) this.handlers.onError(event);
    });
  }

  setHandlers(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  async load(url, options = {}) {
    // Cancel any ongoing speech synthesis when loading audio
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const ambientUrl = typeof options.ambientUrl === 'string' ? options.ambientUrl : '';
    const ambientVolumeRatio = Number(options.ambientVolumeRatio);
    if (!Number.isNaN(ambientVolumeRatio) && ambientVolumeRatio >= 0 && ambientVolumeRatio <= 1) {
      this.ambientVolumeRatio = ambientVolumeRatio;
    }

    if (ambientUrl) {
      this.setAmbientTrack(ambientUrl);
    } else {
      this.clearAmbientTrack();
    }

    return new Promise((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = (event) => {
        cleanup();
        reject(event);
      };
      const cleanup = () => {
        this.audio.removeEventListener('canplaythrough', onReady);
        this.audio.removeEventListener('error', onError);
      };

      this.audio.addEventListener('canplaythrough', onReady);
      this.audio.addEventListener('error', onError);
      this.audio.src = url;
      this.audio.load();
    });
  }

  async play() {
    // Cancel any ongoing speech synthesis to prevent conflicts
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    return this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  async toggle() {
    if (this.audio.paused) {
      return this.play();
    }
    this.pause();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.ambientAudio.pause();
    this.ambientAudio.currentTime = 0;
  }

  setVolume(value) {
    const clamped = Math.max(0, Math.min(1, value));
    this.audio.volume = clamped;
    this.ambientAudio.volume = clamped * this.ambientVolumeRatio;
  }

  setPlaybackRate(value) {
    this.audio.playbackRate = Math.max(0.5, Math.min(2, value));
  }

  setAmbientTrack(url) {
    this.ambientAudio.src = url;
    this.ambientAudio.load();
    this.ambientAudio.volume = this.audio.volume * this.ambientVolumeRatio;

    // Background ambiance is optional; if missing, keep voice-only playback.
    this.ambientAudio.onerror = () => {
      this.clearAmbientTrack();
    };
  }

  clearAmbientTrack() {
    this.ambientAudio.pause();
    this.ambientAudio.currentTime = 0;
    this.ambientAudio.removeAttribute('src');
    this.ambientAudio.load();
  }

  syncAmbientPlayback() {
    if (!this.ambientAudio.src) return;
    this.ambientAudio.currentTime = this.audio.currentTime;
    const playPromise = this.ambientAudio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignore autoplay/device restrictions for optional background track.
      });
    }
  }

  get isPlaying() {
    return !this.audio.paused;
  }
}
