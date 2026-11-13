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
const renderer = new SpaceRenderer(canvas, state, (isComet, isAnomaly = false, isAutoTurret = false, isBossDefeat = false) => {
  if (!isAutoTurret) ui.hideTapHint();

  if (isBossDefeat) {
    const bossMult = state.hasTech('boss_hunter') ? 1.5 : 1;
    const cBonus = Math.max(300, state.rates.credits * 35) * bossMult;
    const rBonus = Math.max(25, Math.floor((20 + state.rates.research * 12) * bossMult));
    state.data.credits += cBonus;
    state.data.sectorCredits += cBonus;
    state.data.lifetimeCredits += cBonus;
    state.data.research += rBonus;
    state.data.bossKills = (state.data.bossKills || 0) + 1;
    state.data.eventBoostUntil = Date.now() + 25000;
    if (state.data.sector >= 1) {
      state.data.darkMatter += 1;
    }
    audio.playAchievement();
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
    ui.showToast('💥', 'TITANOVÉ JÁDRO ZNIČENO!', `+${Math.floor(cBonus)} 🪙, +${rBonus} 🔬${state.data.sector >= 1 ? ', +1 ✨' : ''}`);
    return { credits: cBonus, ore: 0, research: rBonus, isCrit: true };
  }

  if (isAnomaly) {
    const resGain = Math.max(12, Math.floor(15 + state.rates.research * 8));
    state.data.research += resGain;
    state.data.eventBoostUntil = Date.now() + 20000;
    audio.playAchievement();
    if (navigator.vibrate) navigator.vibrate(22);
    ui.showToast('🔮', 'Kvantová anomálie!', `+${resGain} 🔬 a 2× produkce na 20s!`);
    return { credits: 0, ore: 0, research: resGain, isCrit: true };
  }

  const reward = state.getTapReward();
  let comboMult = 1;
  if (!isAutoTurret) {
    const comboInfo = state.registerTapCombo();
    comboMult = comboInfo.mult;
    if (comboInfo.triggeredOverdrive) {
      ui.showToast('🔥', 'OVERDRIVE JÁDRA!', '10× kombo! 2× produkce na 10 sekund!');
    }
  }

  const mult = (isComet ? 3.5 : 1) * comboMult;
  const creditsGain = reward.credits * mult;
  const oreGain = reward.ore * mult;

  state.data.credits += creditsGain;
  state.data.sectorCredits += creditsGain;
  state.data.lifetimeCredits += creditsGain;
  state.data.ore += oreGain;
  if (!isAutoTurret) {
    state.data.totalTaps += 1;
    state.data.sectorTaps = (state.data.sectorTaps || 0) + 1;
  }

  if (isComet && Math.random() < 0.45) {
    state.data.eventBoostUntil = Date.now() + 25000;
    ui.showToast('☄️', 'Zlatá kometa!', 'Aktivován 2× přísun surovin na 25 sekund!');
  }

  if (!isAutoTurret) {
    audio.playTap(reward.isCrit || isComet);
    if ((reward.isCrit || isComet) && navigator.vibrate) {
      navigator.vibrate(15);
    }
  }
  return { credits: creditsGain, ore: oreGain, isCrit: reward.isCrit || isComet };
});

ui.onPrestige = () => renderer.triggerWarp();

if (earned) {
  ui.showOfflineModal(earned);
}

window.addEventListener('resize', () => renderer.resize());

let lastTime = performance.now();
let uiAccumulator = 0;
let saveAccumulator = 0;
let achAccumulator = 0;
let lastUnlockedCount = state.data.modules.lab ? 1 : 0;
let lastMissionDone = state.getMissionProgress().done;

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
    const thresholds = [250, 1000, 4000, 35000, 350000, 2500000, 25000000];
    const currentUnlocked = thresholds.filter((t) => state.data.sectorCredits >= t).length;
    if (currentUnlocked !== lastUnlockedCount) {
      lastUnlockedCount = currentUnlocked;
      if (ui.activeTab === 'station') ui.renderTab();
    }

    const mDone = state.getMissionProgress().done;
    if (mDone !== lastMissionDone) {
      lastMissionDone = mDone;
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
