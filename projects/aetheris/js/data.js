export const SECTORS = [
  { name: 'Pás Aetheris', desc: 'Vyvážený sektor (+0 % modifikátor)', mod: {} },
  { name: 'Mlhovina Orion', desc: 'Solární vítr: +30 % energie ⚡', mod: { energyMult: 1.3 } },
  { name: 'Kvantová trhlina', desc: 'Anomálie: +35 % výzkumu 🔬', mod: { researchMult: 1.35 } },
  { name: 'Soustava Kryon', desc: 'Bohaté žíly: +30 % rudy z dronů 🪨', mod: { oreMult: 1.3 } },
  { name: 'Pulzarová brána', desc: 'Častější zlaté komety ☄️', mod: { cometMult: 1.8 } },
  { name: 'Temný Horizont', desc: 'Kvantová rezonance: +25 % kreditů 🪙', mod: { creditsMult: 1.25 } },
  { name: 'Jádro Andromedy', desc: 'Všechny bonusy +20 % ✨', mod: { energyMult: 1.2, researchMult: 1.2, oreMult: 1.2, creditsMult: 1.2 } }
];

export function getSectorInfo(sectorIndex) {
  if (sectorIndex < SECTORS.length) {
    return {
      title: `Sektor ${sectorIndex + 1}: ${SECTORS[sectorIndex].name}`,
      desc: SECTORS[sectorIndex].desc,
      mod: SECTORS[sectorIndex].mod
    };
  }
  const cycle = SECTORS[(sectorIndex % (SECTORS.length - 1)) + 1];
  return {
    title: `Sektor ${sectorIndex + 1}: Hluboký vesmír Ω-${sectorIndex - SECTORS.length + 1}`,
    desc: cycle.desc,
    mod: cycle.mod
  };
}

export function getSectorName(sectorIndex) {
  return getSectorInfo(sectorIndex).title;
}

export const MODULES = [
  {
    id: 'solar',
    name: 'Solární křídla',
    icon: '☀️',
    desc: 'Zachytává hvězdné záření a dodává energii celé stanici.',
    baseCost: 15,
    costScale: 1.15,
    energyDelta: 12,
    outputs: { credits: 0.5 },
    unlockAt: 0
  },
  {
    id: 'drone',
    name: 'Těžební drony',
    icon: '🛸',
    desc: 'Autonomní drony těží rudu z okolních asteroidů pomocí laseru.',
    baseCost: 35,
    costScale: 1.16,
    energyDelta: -4,
    outputs: { ore: 2.2 },
    unlockAt: 0
  },
  {
    id: 'refinery',
    name: 'Plazmová rafinerie',
    icon: '🏭',
    desc: 'Tavicí pece mění vytěženou rudu na cenné galaktické kredity.',
    baseCost: 120,
    costScale: 1.18,
    energyDelta: -8,
    outputs: { credits: 6.5 },
    oreInput: 1.4,
    unlockAt: 0
  },
  {
    id: 'lab',
    name: 'Výzkumná laboratoř',
    icon: '🔬',
    desc: 'Analyzuje mimozemské izotopy a generuje výzkumné body.',
    baseCost: 480,
    costScale: 1.19,
    energyDelta: -14,
    outputs: { research: 1.2, credits: 10 },
    unlockAt: 250
  },
  {
    id: 'reactor',
    name: 'Fúzní reaktor',
    icon: '⚛️',
    desc: 'Mohutný zdroj čisté energie pro pokročilé moduly stanice.',
    baseCost: 1800,
    costScale: 1.20,
    energyDelta: 90,
    outputs: { credits: 32 },
    unlockAt: 1000
  },
  {
    id: 'tradehub',
    name: 'Kvantový obchodní uzel',
    icon: '🚀',
    desc: 'Přitahuje obchodní konvoje a násobí zisky z prodeje rudy.',
    baseCost: 7500,
    costScale: 1.22,
    energyDelta: -28,
    outputs: { credits: 145, research: 3.5 },
    unlockAt: 4000
  }
];

export const RESEARCH_TREE = [
  {
    id: 'laser_focus',
    name: 'Fokusovaný těžební paprsek',
    icon: '⚡',
    desc: 'Zdvojnásobí zisk z ručního ťukání na asteroidy.',
    cost: 25,
    effect: { type: 'tapMult', value: 2 }
  },
  {
    id: 'drone_ai',
    name: 'Rojová inteligence dronů',
    icon: '🤖',
    desc: 'Těžební drony produkují o +60 % více rudy.',
    cost: 65,
    effect: { type: 'moduleMult', target: 'drone', value: 1.6 }
  },
  {
    id: 'nano_smelting',
    name: 'Nano-rafinace',
    icon: '🧪',
    desc: 'Rafinerie generují o +75 % více kreditů ze stejného množství rudy.',
    cost: 130,
    effect: { type: 'moduleMult', target: 'refinery', value: 1.75 }
  },
  {
    id: 'solar_nano',
    name: 'Grafenové solární články',
    icon: '🔋',
    desc: 'Globální produkce energie z modulů vzroste o +35 %.',
    cost: 240,
    effect: { type: 'energyMult', value: 1.35 }
  },
  {
    id: 'auto_salvage',
    name: 'Gravitační lapač komet',
    icon: '☄️',
    desc: 'Asteroidy a zlaté komety se objevují častěji a dávají +100 % odměnu.',
    cost: 420,
    effect: { type: 'tapMult', value: 2 }
  },
  {
    id: 'quantum_optics',
    name: 'Kvantová analytika',
    icon: '🧬',
    desc: 'Výzkumné laboratoře generují o +100 % více bodů výzkumu.',
    cost: 750,
    effect: { type: 'moduleMult', target: 'lab', value: 2 }
  },
  {
    id: 'auto_turret',
    name: 'Autopilot obranné věže',
    icon: '🎯',
    desc: 'Stanice každé 2 sekundy sama vystřelí těžební laser na nejbližší asteroid.',
    cost: 600,
    effect: { type: 'autoTurret', value: 1 }
  },
  {
    id: 'plasma_recycle',
    name: 'Recyklace plazmy',
    icon: '♻️',
    desc: 'Snižuje spotřebu rudy v plazmových rafineriích o 50 %.',
    cost: 950,
    effect: { type: 'oreSave', value: 0.5 }
  },
  {
    id: 'hyper_logistics',
    name: 'Hyperprostorová logistika',
    icon: '🛰️',
    desc: 'Veškerá produkce kreditů ve stanici vzroste o +50 %.',
    cost: 1400,
    effect: { type: 'globalCreditsMult', value: 1.5 }
  },
  {
    id: 'dark_resonance',
    name: 'Rezonance temné hmoty',
    icon: '🌌',
    desc: 'Zvyšuje zisk Temné hmoty při Hyperprostorovém skoku o +25 %.',
    cost: 2400,
    effect: { type: 'dmGainMult', value: 1.25 }
  }
];

export const PRESTIGE_UPGRADES = [
  {
    id: 'p_starter',
    name: 'Startovní kapitál',
    icon: '💼',
    desc: 'Po každém skoku začneš s dalšími +250 🪙 a +50 🪨 za úroveň.',
    baseCost: 2,
    costScale: 2,
    maxLevel: 5
  },
  {
    id: 'p_overclock',
    name: 'Kvantové přetaktování',
    icon: '⚙️',
    desc: 'Trvale zvyšuje rychlost všech modulů o +25 % za úroveň.',
    baseCost: 3,
    costScale: 1.8,
    maxLevel: 10
  },
  {
    id: 'p_crit',
    name: 'Těžba antihmoty',
    icon: '💥',
    desc: 'Šance 15 % na kritický zásah (4× zisk) při kliknutí na asteroid.',
    baseCost: 5,
    costScale: 2.5,
    maxLevel: 3
  },
  {
    id: 'p_offline',
    name: 'Stázové pole',
    icon: '⏳',
    desc: 'Zvyšuje efektivitu offline výdělku o +15 % za úroveň (základ 60 %).',
    baseCost: 4,
    costScale: 2,
    maxLevel: 4
  }
];

export const ACHIEVEMENTS = [
  {
    id: 'ach_first_tap',
    name: 'První úlomek',
    icon: '🪨',
    desc: 'Vytěž ručně svůj první asteroid.',
    rewardText: '+5 % k produkci kreditů',
    stat: 'totalTaps',
    target: 1,
    bonusCredits: 0.05
  },
  {
    id: 'ach_tap_50',
    name: 'Vesmírný horník',
    icon: '⛏️',
    desc: 'Klikni na 50 asteroidů nebo komet.',
    rewardText: '+10 % k produkci kreditů',
    stat: 'totalTaps',
    target: 50,
    bonusCredits: 0.10
  },
  {
    id: 'ach_tap_250',
    name: 'Laserový virtuóz',
    icon: '🎯',
    desc: 'Klikni na 250 asteroidů nebo komet.',
    rewardText: '+15 % k produkci kreditů',
    stat: 'totalTaps',
    target: 250,
    bonusCredits: 0.15
  },
  {
    id: 'ach_credits_1k',
    name: 'První tisícovka',
    icon: '🪙',
    desc: 'Nashromáždi celkem 1 000 kreditů.',
    rewardText: '+5 % k produkci kreditů',
    stat: 'lifetimeCredits',
    target: 1000,
    bonusCredits: 0.05
  },
  {
    id: 'ach_credits_50k',
    name: 'Orbitální magnát',
    icon: '💰',
    desc: 'Nashromáždi celkem 50 000 kreditů.',
    rewardText: '+10 % k produkci kreditů',
    stat: 'lifetimeCredits',
    target: 50000,
    bonusCredits: 0.10
  },
  {
    id: 'ach_credits_1m',
    name: 'Galaktický milionář',
    icon: '👑',
    desc: 'Nashromáždi celkem 1 000 000 kreditů.',
    rewardText: '+20 % k produkci kreditů',
    stat: 'lifetimeCredits',
    target: 1000000,
    bonusCredits: 0.20
  },
  {
    id: 'ach_solar_10',
    name: 'Sluneční farma',
    icon: '☀️',
    desc: 'Postav 10× Solární křídla.',
    rewardText: '+5 % k produkci kreditů',
    moduleId: 'solar',
    target: 10,
    bonusCredits: 0.05
  },
  {
    id: 'ach_drone_15',
    name: 'Roj v pohybu',
    icon: '🛸',
    desc: 'Vlastni 15× Těžební drony.',
    rewardText: '+10 % k produkci kreditů',
    moduleId: 'drone',
    target: 15,
    bonusCredits: 0.10
  },
  {
    id: 'ach_refinery_10',
    name: 'Těžký průmysl',
    icon: '🏭',
    desc: 'Postav 10× Plazmová rafinerie.',
    rewardText: '+10 % k produkci kreditů',
    moduleId: 'refinery',
    target: 10,
    bonusCredits: 0.10
  },
  {
    id: 'ach_lab_5',
    name: 'Vědecká akademie',
    icon: '🔬',
    desc: 'Postav 5× Výzkumná laboratoř.',
    rewardText: '+10 % k produkci kreditů',
    moduleId: 'lab',
    target: 5,
    bonusCredits: 0.10
  },
  {
    id: 'ach_trade_5',
    name: 'Obchodní impérium',
    icon: '🚀',
    desc: 'Postav 5× Kvantový obchodní uzel.',
    rewardText: '+15 % k produkci kreditů',
    moduleId: 'tradehub',
    target: 5,
    bonusCredits: 0.15
  },
  {
    id: 'ach_tech_4',
    name: 'Technologický skok',
    icon: '🧬',
    desc: 'Odemkni 4 výzkumné technologie.',
    rewardText: '+10 % k produkci kreditů',
    stat: 'researchCount',
    target: 4,
    bonusCredits: 0.10
  },
  {
    id: 'ach_tech_all',
    name: 'Vrchol vědy',
    icon: '🎓',
    desc: 'Odemkni všechny výzkumné technologie v sektoru.',
    rewardText: '+25 % k produkci kreditů',
    stat: 'researchCount',
    target: 8,
    bonusCredits: 0.25
  },
  {
    id: 'ach_prestige_1',
    name: 'Za horizont událostí',
    icon: '🌌',
    desc: 'Proveď svůj první Hyperprostorový skok.',
    rewardText: '+15 % k produkci kreditů',
    stat: 'prestigeCount',
    target: 1,
    bonusCredits: 0.15
  },
  {
    id: 'ach_prestige_5',
    name: 'Pán sektorů',
    icon: '✨',
    desc: 'Proveď 5 Hyperprostorových skoků.',
    rewardText: '+30 % k produkci kreditů',
    stat: 'prestigeCount',
    target: 5,
    bonusCredits: 0.30
  }
];

export const MISSIONS = [
  { id: 'm_tap_10', title: 'Průzkum pásu', desc: 'Zasáhni 10 asteroidů nebo komet.', stat: 'sectorTaps', target: 10, rewardCredits: 35, rewardResearch: 5 },
  { id: 'm_drone_3', title: 'Automatizace těžby', desc: 'Vlastni alespoň 3× Těžební drony.', moduleId: 'drone', target: 3, rewardCredits: 65, rewardResearch: 10 },
  { id: 'm_refinery_2', title: 'První tavírna', desc: 'Postav 2× Plazmová rafinerie.', moduleId: 'refinery', target: 2, rewardCredits: 140, rewardResearch: 18 },
  { id: 'm_tap_40', title: 'Ostrá palba', desc: 'Zasáhni v sektoru 40 asteroidů.', stat: 'sectorTaps', target: 40, rewardCredits: 260, rewardResearch: 30 },
  { id: 'm_lab_2', title: 'Vědecký tým', desc: 'Postav 2× Výzkumná laboratoř.', moduleId: 'lab', target: 2, rewardCredits: 500, rewardResearch: 55 },
  { id: 'm_solar_10', title: 'Solární síť', desc: 'Vlastni 10× Solární křídla.', moduleId: 'solar', target: 10, rewardCredits: 900, rewardResearch: 85 },
  { id: 'm_reactor_1', title: 'Jádro budoucnosti', desc: 'Postav 1× Fúzní reaktor.', moduleId: 'reactor', target: 1, rewardCredits: 1600, rewardResearch: 140 },
  { id: 'm_trade_2', title: 'Kvantový obchod', desc: 'Postav 2× Kvantový obchodní uzel.', moduleId: 'tradehub', target: 2, rewardCredits: 4000, rewardResearch: 280 }
];
