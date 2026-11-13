// 8-bit Chiptune Web Audio API Synthesizer

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmEnabled = true;
    this.currentTrack = null;
    this.bgmTimer = null;
    this.stepIndex = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setEnabled(val) {
    this.enabled = val;
    if (!val) {
      this.stopBgm();
    } else if (this.currentTrack) {
      const t = this.currentTrack;
      this.currentTrack = null;
      this.playBgm(t);
    }
  }

  playTone(freq, duration = 0.08, type = 'square', volume = 0.08, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  sfx(name) {
    if (!this.enabled) return;
    this.unlock();
    switch (name) {
      case 'blip':
        this.playTone(660, 0.045, 'square', 0.06);
        break;
      case 'confirm':
        this.playTone(523, 0.05, 'square', 0.06, 0);
        this.playTone(784, 0.07, 'square', 0.06, 0.05);
        break;
      case 'cancel':
        this.playTone(440, 0.05, 'square', 0.06, 0);
        this.playTone(311, 0.08, 'square', 0.06, 0.05);
        break;
      case 'bump':
        this.playTone(110, 0.07, 'triangle', 0.09);
        break;
      case 'hit':
        this.playTone(180, 0.06, 'sawtooth', 0.1, 0);
        this.playTone(110, 0.09, 'sawtooth', 0.08, 0.04);
        break;
      case 'superHit':
        this.playTone(260, 0.05, 'sawtooth', 0.11, 0);
        this.playTone(390, 0.06, 'square', 0.1, 0.04);
        this.playTone(150, 0.12, 'sawtooth', 0.1, 0.09);
        break;
      case 'heal':
        [523, 523, 523, 659, 784].forEach((f, i) => {
          this.playTone(f, 0.12, 'triangle', 0.09, i * 0.13);
        });
        break;
      case 'orbShake':
        this.playTone(320, 0.05, 'triangle', 0.07, 0);
        this.playTone(380, 0.05, 'triangle', 0.06, 0.06);
        break;
      case 'catchSuccess':
        [523, 659, 784, 1046].forEach((f, i) => {
          this.playTone(f, 0.14, 'square', 0.08, i * 0.11);
        });
        break;
      case 'levelUp':
        [440, 554, 659, 880].forEach((f, i) => {
          this.playTone(f, 0.11, 'square', 0.08, i * 0.09);
        });
        break;
      case 'evolve':
        [392, 440, 494, 523, 587, 659, 784, 1046].forEach((f, i) => {
          this.playTone(f, 0.1, 'square', 0.07, i * 0.09);
        });
        break;
      case 'battleStart':
        [330, 392, 494, 659, 587, 784].forEach((f, i) => {
          this.playTone(f, 0.06, 'sawtooth', 0.08, i * 0.055);
        });
        break;
      case 'shiny':
        [880, 1175, 1397, 1760].forEach((f, i) => {
          this.playTone(f, 0.09, 'triangle', 0.09, i * 0.07);
        });
        break;
      case 'exclamation':
        this.playTone(880, 0.06, 'square', 0.09, 0);
        this.playTone(1046, 0.12, 'square', 0.09, 0.06);
        break;
    }
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  playBgm(track) {
    if (this.currentTrack === track && this.bgmTimer) return;
    this.currentTrack = track;
    this.stopBgm();
    if (!this.enabled || !this.bgmEnabled || !track) return;

    const tracks = {
      town: {
        tempo: 260,
        notes: [392, 440, 494, 523, 494, 440, 392, 330, 349, 392, 440, 392, 349, 330, 294, 330],
        type: 'triangle',
        vol: 0.035,
      },
      route: {
        tempo: 200,
        notes: [523, 587, 659, 523, 784, 659, 587, 523, 440, 494, 523, 587, 659, 587, 523, 440],
        type: 'square',
        vol: 0.024,
      },
      gym: {
        tempo: 220,
        notes: [294, 349, 440, 349, 523, 440, 392, 349, 294, 330, 392, 440, 392, 330, 294, 262],
        type: 'triangle',
        vol: 0.035,
      },
      battle: {
        tempo: 145,
        notes: [330, 349, 392, 330, 440, 392, 349, 330, 294, 330, 349, 392, 440, 494, 523, 392],
        type: 'square',
        vol: 0.028,
      },
    };

    const data = tracks[track];
    if (!data) return;
    this.stepIndex = 0;
    this.bgmTimer = setInterval(() => {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      const freq = data.notes[this.stepIndex % data.notes.length];
      if (freq > 0) {
        this.playTone(freq, data.tempo / 1100, data.type, data.vol);
      }
      this.stepIndex++;
    }, data.tempo);
  }
}

export const audio = new AudioEngine();
