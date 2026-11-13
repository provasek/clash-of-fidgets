class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.musicRunning = false;
    this.musicNodes = [];
    this.chimeTimer = null;
    this.sector = 0;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.musicEnabled && !this.musicRunning && this.ctx) {
      this.startMusic();
    }
  }

  setEnabled(val) {
    this.enabled = val;
  }

  setMusicEnabled(val) {
    this.musicEnabled = val;
    if (val) {
      this.init();
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  setSector(sectorIndex) {
    if (this.sector === sectorIndex) return;
    this.sector = sectorIndex;
    if (this.musicRunning) {
      this.stopMusic();
      this.startMusic();
    }
  }

  startMusic() {
    if (!this.musicEnabled || this.musicRunning) return;
    if (!this.ctx) return;

    this.musicRunning = true;
    const now = this.ctx.currentTime;

    // Základní tónina se jemně posouvá podle sektoru (C, D, E, G)
    const rootFreqs = [65.41, 73.42, 82.41, 98.0];
    const root = rootFreqs[this.sector % rootFreqs.length];

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.055, now + 2.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);

    // Pomalé LFO na filtr pro dýchající vesmírný pad
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.09, now);
    lfoGain.gain.setValueAtTime(140, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);

    filter.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    const padRatios = [1, 1.5, 2.003];
    const oscs = padRatios.map((ratio, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(root * ratio, now);
      osc.connect(filter);
      osc.start(now);
      return osc;
    });

    this.musicNodes = [masterGain, filter, lfo, lfoGain, ...oscs];

    // Občasné vesmírné pentatonické zvonění
    const pentatonic = [4, 4.5, 6, 7.5, 8, 9, 12];
    const scheduleChime = () => {
      if (!this.musicRunning || !this.musicEnabled || !this.ctx) return;
      const delayMs = 2600 + Math.random() * 3400;
      this.chimeTimer = setTimeout(() => {
        if (this.musicRunning && this.musicEnabled) {
          const mult = pentatonic[Math.floor(Math.random() * pentatonic.length)];
          this.playSpaceChime(root * mult);
          scheduleChime();
        }
      }, delayMs);
    };
    scheduleChime();
  }

  playSpaceChime(freq) {
    if (!this.ctx || !this.musicEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.025, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 2.8);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 2.9);
  }

  stopMusic() {
    this.musicRunning = false;
    if (this.chimeTimer) {
      clearTimeout(this.chimeTimer);
      this.chimeTimer = null;
    }
    this.musicNodes.forEach((node) => {
      try {
        if (typeof node.stop === 'function') node.stop();
        node.disconnect();
      } catch {
        // Ignore already stopped nodes
      }
    });
    this.musicNodes = [];
  }

  playTone(freq, duration, type = 'sine', volume = 0.08, slideTo = null) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playTap(isCrit = false) {
    if (isCrit) {
      this.playTone(720, 0.14, 'triangle', 0.12, 1280);
      setTimeout(() => this.playTone(960, 0.16, 'sine', 0.09, 1520), 40);
    } else {
      this.playTone(460, 0.09, 'triangle', 0.08, 220);
    }
  }

  playBuy() {
    this.playTone(523.25, 0.08, 'sine', 0.08, 659.25);
    setTimeout(() => this.playTone(659.25, 0.11, 'sine', 0.07, 783.99), 50);
  }

  playAchievement() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.18, 'triangle', 0.09), idx * 75);
    });
  }

  playPrestige() {
    this.playTone(220, 0.45, 'sawtooth', 0.07, 880);
    setTimeout(() => this.playTone(440, 0.5, 'sine', 0.1, 1320), 150);
  }
}

export const audio = new SoundEngine();
