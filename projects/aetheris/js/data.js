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
  },
  {
    id: 'cruiser',
    name: 'Těžební křižník',
    icon: '🚢',
    desc: 'Těžká průmyslová loď vybavená hlubinnými lasery, která drtí celé asteroidy.',
    baseCost: 55000,
    costScale: 1.21,
    energyDelta: -65,
    outputs: { credits: 650, ore: 18 },
    unlockAt: 35000
  },
  {
    id: 'antimatter',
    name: 'Antihmotový reaktor',
    icon: '🌀',
    desc: 'Anihilace částic uvolňuje obrovské množství energie a stabilizuje chod stanice.',
    baseCost: 550000,
    costScale: 1.22,
    energyDelta: 480,
    outputs: { credits: 3600, research: 14 },
    unlockAt: 350000
  },
  {
    id: 'exchange',
    name: 'Galaktická burza',
    icon: '🏛️',
    desc: 'Mezihvězdné obchodní centrum propojující trhy napříč sektory.',
    baseCost: 4500000,
    costScale: 1.23,
    energyDelta: -180,
    outputs: { credits: 24000, research: 45 },
    oreInput: 10,
    unlockAt: 2500000
  },
  {
    id: 'dyson',
    name: 'Dysonův kolektor',
    icon: '🌟',
    desc: 'Gigantická struktura obepínající blízkou hvězdu pro neomezené čerpání energie.',
    baseCost: 45000000,
    costScale: 1.24,
    energyDelta: 2800,
    outputs: { credits: 160000, research: 160 },
    unlockAt: 25000000
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
  },
  {
    id: 'turret_mk2',
    name: 'Obranná věž Mk.II',
    icon: '🔫',
    desc: 'Autopilot obranné věže střílí 2× rychleji (každou 1 s).',
    cost: 3500,
    effect: { type: 'turretSpeed', value: 2 }
  },
  {
    id: 'cruiser_lasers',
    name: 'Kvantové vrtačky křižníků',
    icon: '⛏️',
    desc: 'Těžební křižníky produkují o +75 % více rudy a kreditů.',
    cost: 6000,
    effect: { type: 'moduleMult', target: 'cruiser', value: 1.75 }
  },
  {
    id: 'boss_hunter',
    name: 'Protipancéřové lasery',
    icon: '💎',
    desc: 'Zvyšuje poškození do Boss asteroidů o +100 % a jejich odměny o +50 %.',
    cost: 10000,
    effect: { type: 'bossHunter', value: 1.5 }
  },
  {
    id: 'antimatter_core',
    name: 'Magnetické pole antihmoty',
    icon: '🧲',
    desc: 'Antihmotové reaktory generují o +80 % více kreditů a výzkumu.',
    cost: 18000,
    effect: { type: 'moduleMult', target: 'antimatter', value: 1.8 }
  },
  {
    id: 'exchange_algo',
    name: 'Algoritmické obchodování',
    icon: '📈',
    desc: 'Galaktické burzy generují o +80 % více kreditů.',
    cost: 32000,
    effect: { type: 'moduleMult', target: 'exchange', value: 1.8 }
  },
  {
    id: 'solar_swarm',
    name: 'Hvězdný energetický roj',
    icon: '🔆',
    desc: 'Globální produkce energie vzroste o dalších +50 %.',
    cost: 55000,
    effect: { type: 'energyMult', value: 1.5 }
  },
  {
    id: 'dyson_beam',
    name: 'Přenos hvězdného paprsku',
    icon: '☀️',
    desc: 'Dysonovy kolektory produkují o +100 % více kreditů a výzkumu.',
    cost: 90000,
    effect: { type: 'moduleMult', target: 'dyson', value: 2 }
  },
  {
    id: 'galactic_network',
    name: 'Galaktická hyper-síť',
    icon: '🌐',
    desc: 'Veškerá produkce kreditů ve stanici vzroste o +75 %.',
    cost: 150000,
    effect: { type: 'globalCreditsMult', value: 1.75 }
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
  },
  {
    id: 'p_discount',
    name: 'Kvantová optimalizace',
    icon: '🏷️',
    desc: 'Trvale snižuje cenu všech modulů stanice o 6 % za úroveň.',
    baseCost: 5,
    costScale: 2.2,
    maxLevel: 5
  },
  {
    id: 'p_research',
    name: 'Akcelerátor částic',
    icon: '🔭',
    desc: 'Trvale zvyšuje rychlost generování výzkumu o +30 % za úroveň.',
    baseCost: 4,
    costScale: 2.0,
    maxLevel: 6
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
  },
  {
    id: 'ach_credits_100m',
    name: 'Hvězdný miliardář',
    icon: '💎',
    desc: 'Nashromáždi celkem 100M kreditů.',
    rewardText: '+25 % k produkci kreditů',
    stat: 'lifetimeCredits',
    target: 100000000,
    bonusCredits: 0.25
  },
  {
    id: 'ach_credits_10b',
    name: 'Vládce soustavy',
    icon: '🪐',
    desc: 'Nashromáždi celkem 10B kreditů.',
    rewardText: '+35 % k produkci kreditů',
    stat: 'lifetimeCredits',
    target: 10000000000,
    bonusCredits: 0.35
  },
  {
    id: 'ach_credits_1t',
    name: 'Kosmický hegemon',
    icon: '🌌',
    desc: 'Nashromáždi celkem 1T kreditů.',
    rewardText: '+50 % k produkci kreditů',
    stat: 'lifetimeCredits',
    target: 1000000000000,
    bonusCredits: 0.50
  },
  {
    id: 'ach_tap_1000',
    name: 'Ničitel pásů',
    icon: '💥',
    desc: 'Klikni na 1 000 asteroidů nebo komet.',
    rewardText: '+20 % k produkci kreditů',
    stat: 'totalTaps',
    target: 1000,
    bonusCredits: 0.20
  },
  {
    id: 'ach_boss_1',
    name: 'První trofej',
    icon: '☄️',
    desc: 'Znič svůj první Boss asteroid.',
    rewardText: '+10 % k produkci kreditů',
    stat: 'bossKills',
    target: 1,
    bonusCredits: 0.10
  },
  {
    id: 'ach_boss_5',
    name: 'Lovec titánů',
    icon: '🛡️',
    desc: 'Znič 5 Boss asteroidů.',
    rewardText: '+20 % k produkci kreditů',
    stat: 'bossKills',
    target: 5,
    bonusCredits: 0.20
  },
  {
    id: 'ach_boss_15',
    name: 'Metla vesmíru',
    icon: '⚔️',
    desc: 'Znič 15 Boss asteroidů.',
    rewardText: '+35 % k produkci kreditů',
    stat: 'bossKills',
    target: 15,
    bonusCredits: 0.35
  },
  {
    id: 'ach_mega_1',
    name: 'Architekt brány',
    icon: '⛩️',
    desc: 'Dokonči stavbu Hvězdné brány (5/5).',
    rewardText: '+30 % k produkci kreditů',
    stat: 'megaCompleted',
    target: 1,
    bonusCredits: 0.30
  },
  {
    id: 'ach_cruiser_5',
    name: 'Těžební flotila',
    icon: '🚢',
    desc: 'Postav 5× Těžební křižník.',
    rewardText: '+15 % k produkci kreditů',
    moduleId: 'cruiser',
    target: 5,
    bonusCredits: 0.15
  },
  {
    id: 'ach_antimatter_3',
    name: 'Pán antihmoty',
    icon: '🌀',
    desc: 'Postav 3× Antihmotový reaktor.',
    rewardText: '+15 % k produkci kreditů',
    moduleId: 'antimatter',
    target: 3,
    bonusCredits: 0.15
  },
  {
    id: 'ach_exchange_3',
    name: 'Wall Street galaxie',
    icon: '🏛️',
    desc: 'Postav 3× Galaktická burza.',
    rewardText: '+20 % k produkci kreditů',
    moduleId: 'exchange',
    target: 3,
    bonusCredits: 0.20
  },
  {
    id: 'ach_dyson_1',
    name: 'Síla hvězdy',
    icon: '🌟',
    desc: 'Postav svůj první Dysonův kolektor.',
    rewardText: '+25 % k produkci kreditů',
    moduleId: 'dyson',
    target: 1,
    bonusCredits: 0.25
  },
  {
    id: 'ach_tech_18',
    name: 'Absolutní vědění',
    icon: '🧠',
    desc: 'Odemkni všech 18 technologií v jednom sektoru.',
    rewardText: '+40 % k produkci kreditů',
    stat: 'researchCount',
    target: 18,
    bonusCredits: 0.40
  },
  {
    id: 'ach_prestige_10',
    name: 'Průzkumník hlubin',
    icon: '🚀',
    desc: 'Proveď 10 Hyperprostorových skoků.',
    rewardText: '+40 % k produkci kreditů',
    stat: 'prestigeCount',
    target: 10,
    bonusCredits: 0.40
  },
  {
    id: 'ach_prestige_15',
    name: 'Nesmrtelný kolonizátor',
    icon: '👑',
    desc: 'Proveď 15 Hyperprostorových skoků.',
    rewardText: '+60 % k produkci kreditů',
    stat: 'prestigeCount',
    target: 15,
    bonusCredits: 0.60
  }
];

export const MODULE_MILESTONES = [10, 25, 50, 100, 200];

export const DOCTRINES = [
  {
    id: 'mining',
    name: 'Těžební kartel',
    icon: '⛏️',
    desc: '+40 % produkce dronů a rafinerií, -15 % rychlost výzkumu.'
  },
  {
    id: 'science',
    name: 'Vědecká akademie',
    icon: '🔬',
    desc: '+50 % rychlost výzkumu a -20 % cena technologií.'
  },
  {
    id: 'hunter',
    name: 'Lovec anomálií',
    icon: '☄️',
    desc: '+80 % zisk z ručního ťukání, komet a kvantových anomálií.'
  }
];

export const MEGASTRUCTURE_STAGES = [
  { name: 'Základní prstenec', credits: 8000, ore: 600, research: 120 },
  { name: 'Gravitační kotvy', credits: 25000, ore: 1800, research: 320 },
  { name: 'Plazmové cívky', credits: 75000, ore: 4500, research: 750 },
  { name: 'Kvantové jádro brány', credits: 220000, ore: 12000, research: 1600 },
  { name: 'Aktivní Hvězdná brána', credits: 650000, ore: 30000, research: 3200 }
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
