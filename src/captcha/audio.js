/* This file will control the audio itself */

//TODO: Gestion du lecteur audio (play/pause)
//      Synthèse vocale ou lecture de fichiers audio
//      Contrôles d'accessibilité (vitesse, volume)

export class CaptchaAudio {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.handlers = {
      onPlay: null,
      onPause: null,
      onEnded: null,
      onError: null,
    };

    this.audio.addEventListener('play', () => {
      if (this.handlers.onPlay) this.handlers.onPlay();
    });
    this.audio.addEventListener('pause', () => {
      if (this.handlers.onPause) this.handlers.onPause();
    });
    this.audio.addEventListener('ended', () => {
      if (this.handlers.onEnded) this.handlers.onEnded();
    });
    this.audio.addEventListener('error', (event) => {
      if (this.handlers.onError) this.handlers.onError(event);
    });
  }

  setHandlers(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  async load(url) {
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
  }

  setVolume(value) {
    this.audio.volume = Math.max(0, Math.min(1, value));
  }

  setPlaybackRate(value) {
    this.audio.playbackRate = Math.max(0.5, Math.min(2, value));
  }

  get isPlaying() {
    return !this.audio.paused;
  }
}
