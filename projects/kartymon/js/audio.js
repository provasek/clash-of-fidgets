// Procedural Web Audio API Arcade Sound Synthesizer
const ArcadeAudio = (() => {
  let ctx = null;
  let muted = false;

  function getCtx() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function setMuted(val) {
    muted = !!val;
  }

  function isMuted() {
    return muted;
  }

  function playTone(freq, duration, type = 'sine', gainVal = 0.12, delay = 0, slideTo = null) {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playNoise(duration, filterFreq = 1200, gainVal = 0.18) {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const bufferSize = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(filterFreq * 2.5, c.currentTime + duration);
    filter.Q.value = 1.4;

    const gain = c.createGain();
    gain.gain.setValueAtTime(gainVal, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    noise.start();
  }

  function playClick() {
    playTone(580, 0.06, 'triangle', 0.08, 0, 740);
  }

  function playCoin() {
    playTone(987.77, 0.08, 'square', 0.06, 0);
    playTone(1318.51, 0.2, 'square', 0.07, 0.07);
  }

  function playTear() {
    playNoise(0.28, 900, 0.22);
    playTone(180, 0.14, 'sawtooth', 0.08, 0.05, 420);
  }

  function playFlip() {
    playNoise(0.09, 1800, 0.09);
    playTone(340, 0.08, 'triangle', 0.06, 0, 520);
  }

  function playRarity(rarity) {
    switch (rarity) {
      case 'common':
        playTone(440, 0.08, 'triangle', 0.05);
        break;
      case 'uncommon':
        playTone(523.25, 0.1, 'triangle', 0.08, 0);
        playTone(659.25, 0.14, 'triangle', 0.08, 0.06);
        break;
      case 'rare':
        playTone(523.25, 0.11, 'sine', 0.1, 0);
        playTone(659.25, 0.11, 'sine', 0.1, 0.07);
        playTone(783.99, 0.24, 'triangle', 0.12, 0.14);
        break;
      case 'epic':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          playTone(f, 0.22, 'triangle', 0.11, i * 0.065);
        });
        break;
      case 'mythic':
        [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((f, i) => {
          playTone(f, 0.28, i % 2 === 0 ? 'sawtooth' : 'triangle', 0.09, i * 0.06);
        });
        break;
      case 'secret':
        [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0].forEach((f, i) => {
          playTone(f, 0.35, 'square', 0.06, i * 0.055);
          playTone(f * 0.5, 0.35, 'sine', 0.09, i * 0.055);
        });
        break;
    }
  }

  function playGodPack() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98];
    notes.forEach((f, i) => {
      playTone(f, 0.18, 'square', 0.07, i * 0.07);
    });
  }

  return {
    setMuted,
    isMuted,
    playClick,
    playCoin,
    playTear,
    playFlip,
    playRarity,
    playGodPack
  };
})();
