import { GameState } from './state.js';
import { SpaceRenderer } from './renderer.js';
import { UIController } from './ui.js';
import { audio } from './audio.js';

const state = new GameState();
const { earned } = state.load();
audio.setEnabled(state.data.soundEnabled);
audio.setMusicEnabled(state.data.musicEnabled !== false);
audio.setSector(state.data.sector);

window.addEventListener('pointerdown', () => audio.init(), { once: true });

const ui = new UIController(state);

const canvas = document.getElementById('game-canvas');
const renderer = new SpaceRenderer(canvas, state, (isComet) => {
  ui.hideTapHint();
  const reward = state.getTapReward();
  const mult = isComet ? 3.5 : 1;
  const creditsGain = reward.credits * mult;
  const oreGain = reward.ore * mult;

  state.data.credits += creditsGain;
  state.data.sectorCredits += creditsGain;
  state.data.lifetimeCredits += creditsGain;
  state.data.ore += oreGain;
  state.data.totalTaps += 1;

  if (isComet && Math.random() < 0.45) {
    state.data.eventBoostUntil = Date.now() + 25000;
    ui.showToast('☄️', 'Zlatá kometa!', 'Aktivován 2× přísun surovin na 25 sekund!');
  }

  audio.playTap(reward.isCrit || isComet);
  return { credits: creditsGain, ore: oreGain, isCrit: reward.isCrit || isComet };
});

if (earned) {
  ui.showOfflineModal(earned);
}

window.addEventListener('resize', () => renderer.resize());

let lastTime = performance.now();
let uiAccumulator = 0;
let saveAccumulator = 0;
let achAccumulator = 0;
let lastUnlockedCount = state.data.modules.lab ? 1 : 0;

function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  state.tick(dt);
  renderer.update(dt);
  renderer.draw();

  uiAccumulator += dt;
  if (uiAccumulator >= 0.1) {
    uiAccumulator = 0;
    ui.updateHUD();

    // Zkontroluj nově odemčené moduly v záložce Stanice
    const currentUnlocked = (state.data.sectorCredits >= 250 ? 1 : 0) +
      (state.data.sectorCredits >= 1000 ? 1 : 0) +
      (state.data.sectorCredits >= 4000 ? 1 : 0);
    if (currentUnlocked !== lastUnlockedCount) {
      lastUnlockedCount = currentUnlocked;
      if (ui.activeTab === 'station') ui.renderTab();
    }
  }

  achAccumulator += dt;
  if (achAccumulator >= 0.8) {
    achAccumulator = 0;
    const newlyUnlocked = state.checkAchievements();
    if (newlyUnlocked.length > 0) {
      audio.playAchievement();
      newlyUnlocked.forEach((ach) => {
        ui.showToast(ach.icon, `Úspěch odemčen: ${ach.name}`, ach.rewardText);
      });
      if (ui.activeTab === 'achievements') ui.renderTab();
    }
  }

  saveAccumulator += dt;
  if (saveAccumulator >= 5) {
    saveAccumulator = 0;
    state.save();
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    state.save();
  }
});
window.addEventListener('beforeunload', () => state.save());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
