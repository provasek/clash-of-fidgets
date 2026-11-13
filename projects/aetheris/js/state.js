import { MODULES, RESEARCH_TREE, PRESTIGE_UPGRADES, ACHIEVEMENTS, MISSIONS, getSectorInfo } from './data.js';

const SAVE_KEY = 'aetheris_tycoon_save_v1';

export function formatNum(n) {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) < 1000) {
    return n >= 100 || Number.isInteger(n) ? Math.floor(n).toString() : n.toFixed(1);
  }
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];
  const tier = Math.min(Math.floor(Math.log10(Math.abs(n)) / 3), suffixes.length - 1);
  const scaled = n / Math.pow(10, tier * 3);
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}${suffixes[tier]}`;
}

export function createInitialState() {
  const modules = {};
  MODULES.forEach((m) => {
    modules[m.id] = m.id === 'solar' ? 1 : 0;
  });

  const prestigeLevels = {};
  PRESTIGE_UPGRADES.forEach((p) => {
    prestigeLevels[p.id] = 0;
  });

  return {
    credits: 30,
    ore: 10,
    research: 0,
    darkMatter: 0,
    sector: 0,
    sectorCredits: 0,
    lifetimeCredits: 30,
    totalTaps: 0,
    sectorTaps: 0,
    prestigeCount: 0,
    modules,
    researched: [],
    prestigeLevels,
    achievements: [],
    missionIndex: 0,
    soundEnabled: true,
    musicEnabled: true,
    lastSavedAt: Date.now(),
    eventBoostUntil: 0,
    overdriveUntil: 0,
    eventName: ''
  };
}

export class GameState {
  constructor() {
    this.data = createInitialState();
    this.combo = 0;
    this.comboExpiresAt = 0;
    this.rates = {
      credits: 0,
      ore: 0,
      research: 0,
      energyProd: 0,
      energyUse: 0,
      efficiency: 1
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { offlineSeconds: 0, earned: null };
      const parsed = JSON.parse(raw);
      const base = createInitialState();
      this.data = {
        ...base,
        ...parsed,
        modules: { ...base.modules, ...(parsed.modules || {}) },
        prestigeLevels: { ...base.prestigeLevels, ...(parsed.prestigeLevels || {}) },
        researched: Array.isArray(parsed.researched) ? parsed.researched : [],
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : []
      };

      this.recalculateRates();

      const now = Date.now();
      const elapsedSec = Math.max(0, (now - (this.data.lastSavedAt || now)) / 1000);
      const cappedSec = Math.min(elapsedSec, 8 * 3600);
      let earned = null;

      if (cappedSec >= 15) {
        const offlineLvl = this.data.prestigeLevels.p_offline || 0;
        const offlineEff = Math.min(1.2, 0.6 + offlineLvl * 0.15);
        const cGain = this.rates.credits * cappedSec * offlineEff;
        const oGain = Math.max(0, this.rates.ore) * cappedSec * offlineEff;
        const rGain = this.rates.research * cappedSec * offlineEff;

        this.data.credits += cGain;
        this.data.sectorCredits += cGain;
        this.data.lifetimeCredits += cGain;
        this.data.ore += oGain;
        this.data.research += rGain;

        if (cGain >= 1 || oGain >= 1 || rGain >= 1) {
          earned = { credits: cGain, ore: oGain, research: rGain, seconds: cappedSec };
        }
      }

      this.data.lastSavedAt = now;
      return { offlineSeconds: cappedSec, earned };
    } catch {
      this.data = createInitialState();
      return { offlineSeconds: 0, earned: null };
    }
  }

  save() {
    this.data.lastSavedAt = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage quota errors
    }
  }

  resetHard() {
    localStorage.removeItem(SAVE_KEY);
    this.data = createInitialState();
    this.recalculateRates();
    this.save();
  }

  exportSave() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(this.data))));
  }

  importSave(encoded) {
    const json = decodeURIComponent(escape(atob(encoded.trim())));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed.credits !== 'number') {
      throw new Error('Neplatný formát uložené hry.');
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
    this.load();
    this.recalculateRates();
  }

  hasTech(techId) {
    return this.data.researched.includes(techId);
  }

  getAchievementBonus() {
    let bonus = 0;
    for (const achId of this.data.achievements) {
      const ach = ACHIEVEMENTS.find((a) => a.id === achId);
      if (ach && ach.bonusCredits) bonus += ach.bonusCredits;
    }
    return 1 + bonus;
  }

  getDarkMatterMultiplier() {
    // Každá 1 Temná hmota = +15 % ke všem příjmům
    return 1 + this.data.darkMatter * 0.15;
  }

  getOverclockMultiplier() {
    const lvl = this.data.prestigeLevels.p_overclock || 0;
    return 1 + lvl * 0.25;
  }

  getEventMultiplier() {
    const now = Date.now();
    let mult = 1;
    if (now < (this.data.eventBoostUntil || 0)) mult += 0.75;
    if (now < (this.data.overdriveUntil || 0)) mult += 0.75;
    return mult;
  }

  getComboMultiplier() {
    if (Date.now() > this.comboExpiresAt) {
      this.combo = 0;
      return 1;
    }
    if (this.combo >= 10) return 2.0;
    if (this.combo >= 6) return 1.5;
    if (this.combo >= 3) return 1.25;
    return 1;
  }

  registerTapCombo() {
    const now = Date.now();
    if (now > this.comboExpiresAt) {
      this.combo = 1;
    } else {
      this.combo += 1;
    }
    this.comboExpiresAt = now + 2200;

    let triggeredOverdrive = false;
    if (this.combo >= 10) {
      this.data.overdriveUntil = now + 10000;
      this.combo = 0;
      triggeredOverdrive = true;
    }
    return { combo: this.combo, mult: this.getComboMultiplier(), triggeredOverdrive };
  }

  getGlobalCreditsMultiplier() {
    const sectorMod = getSectorInfo(this.data.sector).mod;
    let mult = this.getDarkMatterMultiplier() * this.getAchievementBonus() * this.getOverclockMultiplier() * this.getEventMultiplier();
    if (this.hasTech('hyper_logistics')) mult *= 1.5;
    if (sectorMod.creditsMult) mult *= sectorMod.creditsMult;
    // Mírný sektorový bonus za postup
    mult *= 1 + this.data.sector * 0.2;
    return mult;
  }

  getModuleMultiplier(moduleId) {
    let mult = 1;
    for (const techId of this.data.researched) {
      const tech = RESEARCH_TREE.find((t) => t.id === techId);
      if (tech && tech.effect.type === 'moduleMult' && tech.effect.target === moduleId) {
        mult *= tech.effect.value;
      }
    }
    return mult;
  }

  getTapReward() {
    let base = 4 + this.rates.credits * 0.12 + Math.max(0, this.rates.ore) * 0.25;
    if (this.hasTech('laser_focus')) base *= 2;
    if (this.hasTech('auto_salvage')) base *= 2;
    base *= this.getDarkMatterMultiplier();

    const critLvl = this.data.prestigeLevels.p_crit || 0;
    const critChance = critLvl > 0 ? 0.15 * critLvl : 0.04;
    const isCrit = Math.random() < critChance;
    const finalMult = isCrit ? 4 : 1;

    return {
      ore: Math.max(2, base * 0.7 * finalMult),
      credits: Math.max(3, base * finalMult),
      isCrit
    };
  }

  recalculateRates() {
    let energyProd = 0;
    let energyUse = 0;
    const sectorMod = getSectorInfo(this.data.sector).mod;
    const energyTechMult = (this.hasTech('solar_nano') ? 1.35 : 1) * (sectorMod.energyMult || 1);
    const oreSaveMult = this.hasTech('plasma_recycle') ? 0.5 : 1;
    const sectorOreMult = sectorMod.oreMult || 1;
    const sectorResMult = sectorMod.researchMult || 1;

    for (const mod of MODULES) {
      const count = this.data.modules[mod.id] || 0;
      if (count <= 0) continue;
      if (mod.energyDelta >= 0) {
        energyProd += mod.energyDelta * count * energyTechMult;
      } else {
        energyUse += Math.abs(mod.energyDelta) * count;
      }
    }

    const efficiency = energyUse === 0
      ? 1
      : Math.max(0.25, Math.min(1, energyProd / energyUse));

    const globalMult = this.getGlobalCreditsMultiplier();
    const overclock = this.getOverclockMultiplier() * this.getEventMultiplier();

    let creditsRate = 0;
    let oreRate = 0;
    let researchRate = 0;

    // Nejprve spočítej čistou produkci vs. spotřebu rudy pro případný nedostatek rudy v rafineriích
    let rawOreProd = 0;
    let rawOreUse = 0;
    for (const mod of MODULES) {
      const count = this.data.modules[mod.id] || 0;
      if (count <= 0) continue;
      const modMult = this.getModuleMultiplier(mod.id);
      const eff = mod.energyDelta >= 0 ? 1 : efficiency;
      if (mod.outputs.ore) {
        rawOreProd += mod.outputs.ore * count * modMult * eff * overclock * this.getDarkMatterMultiplier() * sectorOreMult;
      }
      if (mod.oreInput) {
        rawOreUse += mod.oreInput * count * eff * 0.4 * oreSaveMult;
      }
    }
    const oreStarved = this.data.ore <= 0.1 && rawOreProd < rawOreUse;

    for (const mod of MODULES) {
      const count = this.data.modules[mod.id] || 0;
      if (count <= 0) continue;
      const modMult = this.getModuleMultiplier(mod.id);
      const eff = mod.energyDelta >= 0 ? 1 : efficiency;
      const oreFactor = mod.oreInput && oreStarved ? 0.3 : 1;

      if (mod.outputs.credits) {
        creditsRate += mod.outputs.credits * count * modMult * eff * oreFactor * globalMult;
      }
      if (mod.outputs.ore) {
        oreRate += mod.outputs.ore * count * modMult * eff * overclock * this.getDarkMatterMultiplier() * sectorOreMult;
      }
      if (mod.outputs.research) {
        researchRate += mod.outputs.research * count * modMult * eff * overclock * sectorResMult;
      }
      if (mod.oreInput) {
        oreRate -= mod.oreInput * count * eff * 0.4 * oreSaveMult;
      }
    }

    this.rates = {
      credits: creditsRate,
      ore: oreRate,
      research: researchRate,
      energyProd,
      energyUse,
      efficiency
    };
  }

  tick(dt) {
    this.recalculateRates();
    const cGain = this.rates.credits * dt;
    const oGain = this.rates.ore * dt;
    const rGain = this.rates.research * dt;

    this.data.credits += cGain;
    this.data.sectorCredits += cGain;
    this.data.lifetimeCredits += cGain;
    this.data.ore = Math.max(0, this.data.ore + oGain);
    this.data.research += rGain;
  }

  getModuleCost(mod, qty = 1) {
    const owned = this.data.modules[mod.id] || 0;
    const r = mod.costScale;
    const first = mod.baseCost * Math.pow(r, owned);
    if (qty === 1) return Math.floor(first);
    return Math.floor(first * ((Math.pow(r, qty) - 1) / (r - 1)));
  }

  getMaxAffordable(mod) {
    const owned = this.data.modules[mod.id] || 0;
    const r = mod.costScale;
    const first = mod.baseCost * Math.pow(r, owned);
    if (this.data.credits < first) return 0;
    const maxN = Math.floor(Math.log(1 + (this.data.credits * (r - 1)) / first) / Math.log(r));
    return Math.max(1, maxN);
  }

  buyModule(modId, mode = 1) {
    const mod = MODULES.find((m) => m.id === modId);
    if (!mod) return false;
    const qty = mode === 'max' ? this.getMaxAffordable(mod) : Number(mode);
    if (qty <= 0) return false;
    const cost = this.getModuleCost(mod, qty);
    if (this.data.credits < cost) return false;

    this.data.credits -= cost;
    this.data.modules[mod.id] = (this.data.modules[mod.id] || 0) + qty;
    this.recalculateRates();
    return true;
  }

  buyResearch(techId) {
    if (this.hasTech(techId)) return false;
    const tech = RESEARCH_TREE.find((t) => t.id === techId);
    if (!tech || this.data.research < tech.cost) return false;

    this.data.research -= tech.cost;
    this.data.researched.push(techId);
    this.recalculateRates();
    return true;
  }

  getPrestigeUpgradeCost(upg) {
    const lvl = this.data.prestigeLevels[upg.id] || 0;
    return Math.floor(upg.baseCost * Math.pow(upg.costScale, lvl));
  }

  buyPrestigeUpgrade(upgId) {
    const upg = PRESTIGE_UPGRADES.find((p) => p.id === upgId);
    if (!upg) return false;
    const lvl = this.data.prestigeLevels[upgId] || 0;
    if (lvl >= upg.maxLevel) return false;
    const cost = this.getPrestigeUpgradeCost(upg);
    if (this.data.darkMatter < cost) return false;

    this.data.darkMatter -= cost;
    this.data.prestigeLevels[upgId] = lvl + 1;
    this.recalculateRates();
    return true;
  }

  getPrestigeThreshold() {
    return 50000 * Math.pow(2.5, this.data.sector);
  }

  getPendingDarkMatter() {
    const threshold = this.getPrestigeThreshold();
    if (this.data.sectorCredits < threshold) return 0;
    let gain = Math.floor(Math.pow(this.data.sectorCredits / threshold, 0.55) * (2 + this.data.sector));
    if (this.hasTech('dark_resonance')) gain = Math.ceil(gain * 1.25);
    return Math.max(1, gain);
  }

  doPrestige() {
    const gain = this.getPendingDarkMatter();
    if (gain <= 0) return 0;

    this.data.darkMatter += gain;
    this.data.prestigeCount += 1;
    this.data.sector += 1;

    const starterLvl = this.data.prestigeLevels.p_starter || 0;
    this.data.credits = 30 + starterLvl * 250;
    this.data.ore = 10 + starterLvl * 50;
    this.data.research = 0;
    this.data.sectorCredits = this.data.credits;
    this.data.sectorTaps = 0;
    this.data.missionIndex = 0;
    this.data.researched = [];

    MODULES.forEach((m) => {
      this.data.modules[m.id] = m.id === 'solar' ? 1 : 0;
    });

    this.recalculateRates();
    this.save();
    return gain;
  }

  getStatValue(ach) {
    if (ach.moduleId) {
      return this.data.modules[ach.moduleId] || 0;
    }
    if (ach.stat === 'researchCount') {
      return this.data.researched.length;
    }
    return this.data[ach.stat] || 0;
  }

  getCurrentMission() {
    const idx = this.data.missionIndex || 0;
    const scale = 1 + this.data.sector * 0.5;
    if (idx < MISSIONS.length) {
      const m = MISSIONS[idx];
      return {
        ...m,
        rewardCredits: Math.floor(m.rewardCredits * scale),
        rewardResearch: Math.floor(m.rewardResearch * (1 + this.data.sector * 0.25))
      };
    }
    const loop = idx - MISSIONS.length + 1;
    return {
      id: `m_endless_${idx}`,
      title: `Zakázka sektoru #${loop}`,
      desc: `Nashromáždi v sektoru celkem ${formatNum(25000 * Math.pow(1.7, loop) * scale)} 🪙.`,
      stat: 'sectorCredits',
      target: Math.floor(25000 * Math.pow(1.7, loop) * scale),
      rewardCredits: Math.floor(2500 * Math.pow(1.5, loop) * scale),
      rewardResearch: Math.floor(120 * Math.pow(1.3, loop))
    };
  }

  getMissionProgress(m = this.getCurrentMission()) {
    const cur = m.moduleId ? (this.data.modules[m.moduleId] || 0) : (this.data[m.stat] || 0);
    return { cur: Math.min(m.target, cur), target: m.target, done: cur >= m.target };
  }

  claimMission() {
    const m = this.getCurrentMission();
    const prog = this.getMissionProgress(m);
    if (!prog.done) return null;

    this.data.credits += m.rewardCredits;
    this.data.sectorCredits += m.rewardCredits;
    this.data.lifetimeCredits += m.rewardCredits;
    this.data.research += m.rewardResearch;
    this.data.missionIndex = (this.data.missionIndex || 0) + 1;
    this.recalculateRates();
    return m;
  }

  checkAchievements() {
    const unlockedNow = [];
    for (const ach of ACHIEVEMENTS) {
      if (this.data.achievements.includes(ach.id)) continue;
      if (this.getStatValue(ach) >= ach.target) {
        this.data.achievements.push(ach.id);
        unlockedNow.push(ach);
      }
    }
    if (unlockedNow.length > 0) {
      this.recalculateRates();
    }
    return unlockedNow;
  }
}
