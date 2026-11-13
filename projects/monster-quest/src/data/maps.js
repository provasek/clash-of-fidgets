// Tile Legend:
// '.' grass, ',' path, 'T' tree, 'G' tall grass, 'W' water, 'F' flower
// 'B' building wall, 'R' roof, 'D' door/warp, 'L' ledge (jump down), 'S' sign
// 'C' indoor floor, 'I' indoor wall, 'H' heal tile, 'P' PC terminal, 'M' mart
// 'K' cave floor (encounters), 'O' cave wall

export const SOLID_TILES = new Set(['T', 'W', 'B', 'R', 'S', 'I', 'H', 'P', 'M', 'O', 'L']);

export const MAPS = {
  verdant_town: {
    id: 'verdant_town',
    name: 'Zelené Městečko',
    bgm: 'town',
    outdoor: true,
    grid: [
      'TTTTTTTT..TTTTTTTT',
      'T..RRRR....RRRR..T',
      'T..BBBB....BBBB..T',
      'T..BDDB....BDDB..T',
      'T...,,......,,...T',
      'T.FF,,,,,,,,,,FF.T',
      'T...,,......,,...T',
      'T..RRRR....RRRR..T',
      'T..BBBB....BBBB..T',
      'T..BDDB....BBBB..T',
      'T...,,,,,,,,,,...T',
      'T..FF........FF..T',
      'T......WWWW......T',
      'T......WWWW......T',
      'TTTTTTTTTTTTTTTTTT',
    ],
    warps: [
      { x: 8, y: 0, to: 'route_1', tx: 8, ty: 12 },
      { x: 9, y: 0, to: 'route_1', tx: 9, ty: 12 },
      { x: 4, y: 3, to: 'prof_lab', tx: 5, ty: 7 },
      { x: 5, y: 3, to: 'prof_lab', tx: 5, ty: 7 },
      { x: 12, y: 3, to: 'heal_center', tx: 5, ty: 6 },
      { x: 13, y: 3, to: 'heal_center', tx: 5, ty: 6 },
      { x: 4, y: 9, to: 'mart_shop', tx: 4, ty: 5 },
      { x: 5, y: 9, to: 'mart_shop', tx: 4, ty: 5 },
    ],
    signs: [
      { x: 13, y: 9, text: 'Dům trenéra: Tady bydlíš ty! Odpočiň si kdykoliv.' },
    ],
    npcs: [
      {
        id: 'town_guide', x: 7, y: 5, dir: 'down', color: '#4299e1',
        text: [
          'Vítej v Zeleném Městečku!',
          'Jdi do Laboratoře (levý horní dům) za Profesorem Dubem a vyber si svou první příšerku!',
          'Vpravo nahoře je Léčebné centrum a dole vlevo Obchod.'
        ],
      },
      {
        id: 'town_mom', x: 14, y: 10, dir: 'up', color: '#ed64a6',
        healParty: true,
        text: [
          'Mami: Ahoj zlatíčko! Vypadáš unaveně.',
          'Nech mě vyléčit tvé příšerky! ... Hotovo! Hodně štěstí na cestě!'
        ],
      },
    ],
    items: [],
    encounters: [],
  },

  prof_lab: {
    id: 'prof_lab',
    name: 'Laboratoř Prof. Duba',
    bgm: 'town',
    outdoor: false,
    grid: [
      'IIIIIIIIIIII',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCDDCCCCC',
      'IIIIIIIIIIII',
    ],
    warps: [
      { x: 5, y: 8, to: 'verdant_town', tx: 5, ty: 4 },
      { x: 6, y: 8, to: 'verdant_town', tx: 5, ty: 4 },
    ],
    signs: [],
    npcs: [
      {
        id: 'prof_oak', x: 5, y: 2, dir: 'down', color: '#e2e8f0',
        isProf: true,
        text: [
          'Prof. Dub: Vítej v mé laboratoři!',
          'Vyber si jeden ze tří Orbů na stole a získej svou první příšerku!'
        ],
      },
      {
        id: 'starter_grass', x: 7, y: 3, dir: 'down', color: '#48bb78', isOrb: true, starterId: 1,
        text: ['Travní Orb: Uvnitř je Lístek (Travní typ)! Chceš si ho vybrat?'],
      },
      {
        id: 'starter_fire', x: 8, y: 3, dir: 'down', color: '#ed8936', isOrb: true, starterId: 4,
        text: ['Ohnivý Orb: Uvnitř je Ohníček (Ohnivý typ)! Chceš si ho vybrat?'],
      },
      {
        id: 'starter_water', x: 9, y: 3, dir: 'down', color: '#4299e1', isOrb: true, starterId: 7,
        text: ['Vodní Orb: Uvnitř je Kapička (Vodní typ)! Chceš si ho vybrat?'],
      },
    ],
    items: [],
    encounters: [],
  },

  heal_center: {
    id: 'heal_center',
    name: 'Léčebné centrum & PC',
    bgm: 'town',
    outdoor: false,
    grid: [
      'IIIIIIIIIIII',
      'ICCHHCCCCPPI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCDDCCCCC',
      'IIIIIIIIIIII',
    ],
    warps: [
      { x: 5, y: 7, to: 'verdant_town', tx: 13, ty: 4 },
      { x: 6, y: 7, to: 'verdant_town', tx: 13, ty: 4 },
    ],
    signs: [],
    npcs: [
      {
        id: 'nurse_1', x: 3, y: 2, dir: 'down', color: '#f687b3', healParty: true,
        text: [
          'Sestra: Vítej v Léčebném centru!',
          'Okamžitě tvé příšerky plně uzdravíme... Píp píp píp! Jsou jako nové!'
        ],
      },
      {
        id: 'pc_1', x: 9, y: 2, dir: 'down', color: '#63b3ed', openPC: true,
        text: ['Otevírám PC úložiště příšerek...'],
      },
    ],
    items: [],
    encounters: [],
  },

  mart_shop: {
    id: 'mart_shop',
    name: 'Obchod pro trenéry',
    bgm: 'town',
    outdoor: false,
    grid: [
      'IIIIIIIIII',
      'ICMMMMCCCI',
      'ICCCCCCCCI',
      'ICCCCCCCCI',
      'ICCCCCCCCI',
      'ICCCCCCCCI',
      'ICCCDDCCCI',
      'IIIIIIIIII',
    ],
    warps: [
      { x: 4, y: 6, to: 'verdant_town', tx: 5, ty: 10 },
      { x: 5, y: 6, to: 'verdant_town', tx: 5, ty: 10 },
    ],
    signs: [],
    npcs: [
      {
        id: 'clerk_1', x: 3, y: 2, dir: 'down', color: '#4299e1', openShop: true,
        text: ['Prodavač: Vítej! Podívej se na naši nabídku vybavení!'],
      },
    ],
    items: [],
    encounters: [],
  },

  route_1: {
    id: 'route_1',
    name: 'Cesta 1 - Smaragdová stezka',
    bgm: 'route',
    outdoor: true,
    grid: [
      'TTTTTTTT..TTTTTTTT',
      'TGGGGTT,,,,TTGGGGT',
      'TGGGG..,,,,..GGGGT',
      'TLLLLLLLL,,LLLLLLT',
      'T........,,......T',
      'T..GGGG..,,..GGGGT',
      'T..GGGG..,,..GGGGT',
      '.,,,,,,,,..,,....T',
      '.,,,,,,,,..,,GGGGT',
      'TLLLL,,LLLLLLGGGGT',
      'T....,,..........T',
      'TGGGG,,,,GGGG....T',
      'TGGGG,,,,GGGG..FFT',
      'TTTTTTTT..TTTTTTTT',
    ],
    warps: [
      { x: 8, y: 13, to: 'verdant_town', tx: 8, ty: 1 },
      { x: 9, y: 13, to: 'verdant_town', tx: 9, ty: 1 },
      { x: 8, y: 0, to: 'stonecrest_city', tx: 8, ty: 12 },
      { x: 9, y: 0, to: 'stonecrest_city', tx: 9, ty: 12 },
      { x: 0, y: 7, to: 'whispering_woods', tx: 16, ty: 7 },
      { x: 0, y: 8, to: 'whispering_woods', tx: 16, ty: 8 },
    ],
    signs: [],
    npcs: [
      {
        id: 'tr_youngster', x: 7, y: 8, dir: 'right', color: '#ecc94b',
        trainer: {
          name: 'Mladík Petr',
          reward: 180,
          sight: 3,
          party: [
            { id: 12, level: 4 },
            { id: 10, level: 4 },
          ],
          intro: 'Naše pohledy se střetly! To znamená zápas!',
          defeat: 'Páni, tvoje příšerka je fakt silná!',
        },
      },
      {
        id: 'tr_lass', x: 11, y: 4, dir: 'left', color: '#ed64a6',
        trainer: {
          name: 'Trenérka Klára',
          reward: 240,
          sight: 3,
          party: [
            { id: 10, level: 5 },
            { id: 15, level: 5 },
          ],
          intro: 'Moje příšerky jsou roztomilé, ale nepodceňuj je!',
          defeat: 'Au! Ale byl to skvělý souboj!',
        },
      },
    ],
    items: [
      { id: 'r1_potion', x: 15, y: 11, item: 'potion', count: 2 },
      { id: 'r1_orbs', x: 2, y: 2, item: 'orb', count: 3 },
    ],
    encounters: [
      { id: 10, min: 2, max: 4, weight: 40 },
      { id: 12, min: 2, max: 4, weight: 35 },
      { id: 13, min: 3, max: 5, weight: 15 },
      { id: 15, min: 3, max: 5, weight: 10, nightBonus: 20 },
    ],
  },

  whispering_woods: {
    id: 'whispering_woods',
    name: 'Šeptající les',
    bgm: 'route',
    outdoor: true,
    grid: [
      'TTTTTTTTTTTTTTTTTT',
      'TGGGG..TTTT..GGGGT',
      'TGGGG........GGGGT',
      'T..TT..GGGG..TT..T',
      'T......GGGG......T',
      'TGGGG..TTTT..GGGGT',
      'TGGGG........GGGGT',
      'T....,,,,,,,,,,...',
      'TGGGG,,,,,,,,,,...',
      'TGGGG..TTTT..GGGGT',
      'T..TT..GGGG..GGGGT',
      'T......GGGG......T',
      'TGGGG........GGGGT',
      'TTTTTTTTTTTTTTTTTT',
    ],
    warps: [
      { x: 17, y: 7, to: 'route_1', tx: 1, ty: 7 },
      { x: 17, y: 8, to: 'route_1', tx: 1, ty: 8 },
    ],
    signs: [],
    npcs: [
      {
        id: 'tr_bug1', x: 9, y: 7, dir: 'up', color: '#48bb78',
        trainer: {
          name: 'Lovec brouků Honza',
          reward: 260,
          sight: 3,
          party: [
            { id: 13, level: 5 },
            { id: 13, level: 6 },
            { id: 14, level: 8 },
          ],
          intro: 'Lesní hmyzí příšerky jsou ty nejlepší!',
          defeat: 'Moji broučci potřebují ještě trénink!',
        },
      },
      {
        id: 'tr_psy1', x: 4, y: 4, dir: 'right', color: '#9f7aea',
        trainer: {
          name: 'Médium Eliška',
          reward: 420,
          sight: 3,
          party: [
            { id: 19, level: 8 },
          ],
          intro: 'Předvídala jsem tvůj příchod do tohoto lesa...',
          defeat: 'Moje vize neukázaly, že prohraju!',
        },
      },
    ],
    items: [
      { id: 'ww_superorb', x: 2, y: 1, item: 'super_orb', count: 2 },
      { id: 'ww_candy', x: 15, y: 12, item: 'rare_candy', count: 1 },
    ],
    encounters: [
      { id: 13, min: 4, max: 7, weight: 35 },
      { id: 10, min: 4, max: 6, weight: 20 },
      { id: 15, min: 5, max: 7, weight: 20 },
      { id: 19, min: 5, max: 8, weight: 15, nightBonus: 25 },
      { id: 14, min: 7, max: 9, weight: 10 },
    ],
  },

  stonecrest_city: {
    id: 'stonecrest_city',
    name: 'Kamenné Město',
    bgm: 'town',
    outdoor: true,
    grid: [
      'TTTTTTTT..TTTTTTTT',
      'T..RRRR....RRRR..T',
      'T..BBBB....BBBB..T',
      'T..BDDB....BDDB..T',
      'T...,,......,,...T',
      'T...,,,,,,,,,,...T',
      'T......,,,,......T',
      'T..RRRR....FF....T',
      'T..BBBB..........T',
      'T..BDDB..WWWW....T',
      'T...,,...WWWW....T',
      'T...,,,,,,,,,,...T',
      'T......,,,,......T',
      'TTTTTTTT..TTTTTTTT',
    ],
    warps: [
      { x: 8, y: 13, to: 'route_1', tx: 8, ty: 1 },
      { x: 9, y: 13, to: 'route_1', tx: 9, ty: 1 },
      { x: 4, y: 3, to: 'stonecrest_gym', tx: 5, ty: 9 },
      { x: 5, y: 3, to: 'stonecrest_gym', tx: 5, ty: 9 },
      { x: 12, y: 3, to: 'heal_center_city', tx: 5, ty: 6 },
      { x: 13, y: 3, to: 'heal_center_city', tx: 5, ty: 6 },
      { x: 4, y: 9, to: 'mart_city', tx: 4, ty: 5 },
      { x: 5, y: 9, to: 'mart_city', tx: 4, ty: 5 },
      { x: 8, y: 0, to: 'dragons_peak', tx: 8, ty: 11 },
      { x: 9, y: 0, to: 'dragons_peak', tx: 9, ty: 11 },
    ],
    signs: [],
    npcs: [
      {
        id: 'city_healer', x: 10, y: 5, dir: 'down', color: '#68d391',
        text: [
          'Vlevo nahoře je Kamenná Aréna (Gym)!',
          'Vůdce Terra používá kamenné příšerky. Travní a Vodní typy jsou proti němu super účinné!'
        ],
      },
      {
        id: 'city_guru', x: 13, y: 7, dir: 'left', color: '#ecc94b',
        text: [
          'Tip pro mistry: Stisknutím F přepneš rychlost bitvy na 2x!',
          'A pokud hledáš vzácné Dračí příšerky, vydej se na sever na Dračí Štít!'
        ],
      },
    ],
    items: [
      { id: 'sc_superpotion', x: 15, y: 11, item: 'super_potion', count: 1 },
    ],
    encounters: [],
  },

  heal_center_city: {
    id: 'heal_center_city',
    name: 'Léčebné centrum (Kamenné)',
    bgm: 'town',
    outdoor: false,
    grid: [
      'IIIIIIIIIIII',
      'ICCHHCCCCPPI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCDDCCCCC',
      'IIIIIIIIIIII',
    ],
    warps: [
      { x: 5, y: 7, to: 'stonecrest_city', tx: 13, ty: 4 },
      { x: 6, y: 7, to: 'stonecrest_city', tx: 13, ty: 4 },
    ],
    signs: [],
    npcs: [
      {
        id: 'nurse_2', x: 3, y: 2, dir: 'down', color: '#f687b3', healParty: true,
        text: ['Sestra: Tvé příšerky jsou teď v perfektní kondici!'],
      },
      {
        id: 'pc_2', x: 9, y: 2, dir: 'down', color: '#63b3ed', openPC: true,
        text: ['Otevírám PC úložiště...'],
      },
    ],
    items: [],
    encounters: [],
  },

  mart_city: {
    id: 'mart_city',
    name: 'Velký Obchod',
    bgm: 'town',
    outdoor: false,
    grid: [
      'IIIIIIIIII',
      'ICMMMMCCCI',
      'ICCCCCCCCI',
      'ICCCCCCCCI',
      'ICCCCCCCCI',
      'ICCCCCCCCI',
      'ICCCDDCCCI',
      'IIIIIIIIII',
    ],
    warps: [
      { x: 4, y: 6, to: 'stonecrest_city', tx: 5, ty: 10 },
      { x: 5, y: 6, to: 'stonecrest_city', tx: 5, ty: 10 },
    ],
    signs: [],
    npcs: [
      {
        id: 'clerk_2', x: 3, y: 2, dir: 'down', color: '#4299e1', openShop: true,
        text: ['Prodavač: Vítej v našem obchodě! Co si přeješ?'],
      },
    ],
    items: [],
    encounters: [],
  },

  stonecrest_gym: {
    id: 'stonecrest_gym',
    name: 'Kamenná Aréna (Gym)',
    bgm: 'gym',
    outdoor: false,
    grid: [
      'IIIIIIIIIIII',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICOOCCCCOOCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICOOCCCCOOCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCCCCCCCI',
      'ICCCCDDCCCCC',
      'IIIIIIIIIIII',
    ],
    warps: [
      { x: 5, y: 10, to: 'stonecrest_city', tx: 5, ty: 4 },
      { x: 6, y: 10, to: 'stonecrest_city', tx: 5, ty: 4 },
    ],
    signs: [],
    npcs: [
      {
        id: 'tr_gym1', x: 5, y: 6, dir: 'down', color: '#a0aec0',
        trainer: {
          name: 'Horolezec Marek',
          reward: 500,
          sight: 3,
          party: [
            { id: 17, level: 9 },
            { id: 17, level: 10 },
          ],
          intro: 'Než se dostaneš k vůdci Terrovi, musíš porazit mě!',
          defeat: 'Tvůj tým prorazil moji kamennou obranu!',
        },
      },
      {
        id: 'gym_leader_terra', x: 5, y: 2, dir: 'down', color: '#d69e2e',
        trainer: {
          name: 'Vůdce Terra',
          reward: 1800,
          sight: 0,
          badge: 'Kamenný odznak',
          party: [
            { id: 17, level: 12 },
            { id: 18, level: 15 },
          ],
          intro: 'Jsem Terra, vůdce Kamenné Arény! Ukaž mi, zda dokážeš zlomit naši skálopevnou vůli!',
          defeat: 'Neuvěřitelné! Tvá strategie i pouto s příšerkami jsou obdivuhodné. Získáváš Kamenný odznak!',
        },
      },
    ],
    items: [],
    encounters: [],
  },

  dragons_peak: {
    id: 'dragons_peak',
    name: 'Dračí Štít',
    bgm: 'gym',
    outdoor: true,
    grid: [
      'OOOOOOOOOOOOOOOOOO',
      'OKKKKKKK..KKKKKKKO',
      'OKKOOOKK..KKOOOKKO',
      'OKKKKKKK..KKKKKKKO',
      'O..KKK......KKK..O',
      'OKKKKKK,,,,KKKKKKO',
      'OKKOOOK,,,,KOOOKKO',
      'OKKKKKK,,,,KKKKKKO',
      'O......,,,,......O',
      'OKKKKKK,,,,KKKKKKO',
      'OKKKKKK,,,,KKKKKKO',
      'OKKKKKK,,,,KKKKKKO',
      'OOOOOOOO..OOOOOOOO',
    ],
    warps: [
      { x: 8, y: 12, to: 'stonecrest_city', tx: 8, ty: 1 },
      { x: 9, y: 12, to: 'stonecrest_city', tx: 9, ty: 1 },
    ],
    signs: [],
    npcs: [
      {
        id: 'champ_rival', x: 8, y: 2, dir: 'down', color: '#e53e3e',
        trainer: {
          name: 'Šampion Rival Alex',
          reward: 5000,
          sight: 0,
          badge: 'Pohár Šampiona',
          party: [
            { id: 11, level: 15 },
            { id: 16, level: 16 },
            { id: 21, level: 18 },
          ],
          intro: 'Tak jsi dorazil až na Dračí Štít! Ukaž mi, jestli jsi hoden titulu Šampiona!',
          defeat: 'Úžasný souboj! Porazil jsi mě i mého Arcidraka. Jsi skutečný Šampion!',
        },
      },
    ],
    items: [
      { id: 'dp_ultra', x: 2, y: 3, item: 'ultra_orb', count: 3 },
      { id: 'dp_revive', x: 15, y: 3, item: 'revive', count: 2 },
    ],
    encounters: [
      { id: 17, min: 10, max: 13, weight: 25 },
      { id: 11, min: 11, max: 14, weight: 20 },
      { id: 16, min: 12, max: 14, weight: 15 },
      { id: 18, min: 13, max: 15, weight: 15 },
      { id: 20, min: 12, max: 15, weight: 25 },
    ],
  },
};
