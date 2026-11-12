// ====================================================
// POLYTOPIA 4X STRATEGY ENGINE: ADVANCED EXPANSION
// ====================================================

// --- GLOBAL GAME STATE ---
const G = {
    turn: 1,
    maxTurns: 50,
    score: 150,
    gameMode: 'single', // 'single' (proti AI) nebo 'passplay' (Hotseat pro více hráčů)
    playerFaction: 'solaria',
    activeFaction: 'solaria',
    passPlayFactions: ['solaria', 'khardurn'],
    factions: {
        solaria: {
            id: 'solaria',
            name: 'Solaria',
            crest: '☀️',
            title: 'Impérium Solaria',
            bonus: '+1 ⭐ Příjem z měst & Pláně',
            color: 0x38bdf8,
            cssColor: '#38bdf8',
            isPlayer: true,
            stars: 20,
            income: 5,
            status: 'self',
            techs: ['farming']
        },
        khardurn: {
            id: 'khardurn',
            name: 'Khar-Durn',
            crest: '🌋',
            title: 'Páni Vulkanu',
            bonus: '+2 Obrana v horách & Hornictví',
            color: 0xef4444,
            cssColor: '#ef4444',
            isPlayer: false,
            stars: 20,
            income: 4,
            status: 'peace',
            techs: ['mining']
        },
        aquaria: {
            id: 'aquaria',
            name: 'Aquaria',
            crest: '🌊',
            title: 'Království Hlubin',
            bonus: 'Plavba na vodě zdarma & Mořeplavba',
            color: 0x06b6d4,
            cssColor: '#06b6d4',
            isPlayer: false,
            stars: 20,
            income: 4,
            status: 'peace',
            techs: ['sailing']
        },
        sylvaen: {
            id: 'sylvaen',
            name: 'Sylvaen',
            crest: '🍃',
            title: 'Strážci Hvozdu',
            bonus: '+1 Dostřel lučištníků & Lukostřelba',
            color: 0x10b981,
            cssColor: '#10b981',
            isPlayer: false,
            stars: 20,
            income: 4,
            status: 'peace',
            techs: ['archery']
        }
    },
    gridSize: 16,
    selectedEntity: null,
    gameOver: false,
    musicEnabled: true,
    stargateProject: null, // { cityId, turnsLeft: 5 }
    roads: [] // { gx, gy }
};

// --- PROGRESSIVE EXPANDED TECH TREE (3 TIERY, PREREKVIZITY) ---
const TECH_TREE = {
    // TIER 1: ZÁKLADNÍ VĚDY (KOŘENY STROMU)
    farming: { id: 'farming', name: 'Zemědělství', tier: 1, req: [], icon: '🌾', cost: 5, desc: 'Umožňuje kultivovat pole na obilné lány (+2 k růstu města).' },
    mining: { id: 'mining', name: 'Hornictví', tier: 1, req: [], icon: '⛏️', cost: 6, desc: 'Umožňuje hloubit doly na horách (+3 ⭐/tah příjem).' },
    archery: { id: 'archery', name: 'Lukostřelba', tier: 1, req: [], icon: '🏹', cost: 7, desc: 'Odemyká výcvik Lučištníků (střelba na dálku 2 políčka).' },
    sailing: { id: 'sailing', name: 'Mořeplavba', tier: 1, req: [], icon: '⛵', cost: 7, desc: 'Jednotky mohou vstupovat na vodu (člun) a stavět Přístavy.' },

    // TIER 2: SPECIALIZACE A ROZVOJ (VĚTVE)
    roads: { id: 'roads', name: 'Silniční Síť', tier: 2, req: ['farming'], icon: '🛤️', cost: 9, desc: 'Umožňuje dláždit silnice (rychlejší pohyb a obchod mezi městy).' },
    smithing: { id: 'smithing', name: 'Kovářství', tier: 2, req: ['mining'], icon: '⚔️', cost: 11, desc: 'Odemyká těžké zbraně a Rytíře na koních (pohyb 2, vysoký útok).' },
    fortification: { id: 'fortification', name: 'Opevnění & Hradby', tier: 2, req: ['mining'], icon: '🏰', cost: 10, desc: 'Stavba kamenných hradeb na městech (+3 k obraně posádky).' },
    siege: { id: 'siege', name: 'Obléhací Stroje', tier: 2, req: ['archery', 'smithing'], icon: '💣', cost: 13, desc: 'Odemyká Katapulty s dlouhým dostřelem (3 pole) a bonusem proti městům.' },
    navigation: { id: 'navigation', name: 'Zaoceánská Plavba', tier: 2, req: ['sailing'], icon: '🚢', cost: 12, desc: 'Odemyká těžké Bitevní Koráby pro bombardování pobřeží z moře.' },

    // TIER 3: VRCHOLNÁ CIVILIZACE & APEX
    philosophy: { id: 'philosophy', name: 'Filozofie & Vědy', tier: 3, req: ['roads', 'fortification'], icon: '📜', cost: 18, desc: 'Kulturní osvícení (+3 ⭐ příjem všech měst a zrychlení vědy).' },
    stargate: { id: 'stargate', name: 'Projekt Hvězdná Brána', tier: 3, req: ['philosophy', 'siege', 'navigation'], icon: '🌌', cost: 50, desc: 'Odemkne stavbu Velkého Projektu Hvězdné Brány pro Vědecké Vítězství!' }
};

// --- EXPANDED UNITS DEFINITIONS ---
const UNIT_TYPES = {
    warrior: { name: 'Válečník', icon: '🗡️', hp: 10, maxHp: 10, atk: 4, def: 2, range: 1, move: 1, cost: 3 },
    archer: { name: 'Lučištník', icon: '🏹', hp: 8, maxHp: 8, atk: 3, def: 1, range: 2, move: 1, cost: 5 },
    knight: { name: 'Rytíř', icon: '🐎', hp: 14, maxHp: 14, atk: 6, def: 3, range: 1, move: 2, cost: 8 },
    catapult: { name: 'Katapult', icon: '💣', hp: 10, maxHp: 10, atk: 8, def: 0, range: 3, move: 1, cost: 9, siege: true },
    settler: { name: 'Osadník', icon: '⛺', hp: 6, maxHp: 6, atk: 0, def: 1, range: 1, move: 1, cost: 7 },
    boat: { name: 'Válečný Člun', icon: '⛵', hp: 12, maxHp: 12, atk: 4, def: 2, range: 2, move: 2, cost: 5 },
    battleship: { name: 'Bitevní Koráb', icon: '🚢', hp: 18, maxHp: 18, atk: 7, def: 3, range: 2, move: 2, cost: 12 }
};

// --- PROCEDURAL AUDIO & AGE OF WAR STYLE BATTLE SOUNDTRACK ---
class CivAudioEngine {
    constructor() {
        this.ctx = null;
        this.musicStep = 0;
        this.musicInterval = null;
        this.unlocked = false;
    }
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => { this.unlocked = true; });
        } else if (this.ctx && this.ctx.state === 'running') {
            this.unlocked = true;
        }
    }
    unlockAudio() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                this.unlocked = true;
                if (G.musicEnabled && !this.musicInterval) {
                    this.startAmbient();
                }
            });
        } else if (this.ctx && this.ctx.state === 'running') {
            this.unlocked = true;
            if (G.musicEnabled && !this.musicInterval) {
                this.startAmbient();
            }
        }
    }
    toggleAmbient() {
        this.init();
        G.musicEnabled = !G.musicEnabled;
        const btn = document.getElementById('btn-toggle-music');
        if (btn) btn.innerText = G.musicEnabled ? '🎵' : '🔇';

        if (G.musicEnabled) {
            this.startAmbient();
            showToast('🎵 Válečný Age of War soundtrack ZAPNUT');
        } else {
            if (this.musicInterval) clearInterval(this.musicInterval);
            this.musicInterval = null;
            showToast('🔇 Hudba VYPNUTA');
        }
    }
    startAmbient() {
        if (!G.musicEnabled) return;
        this.init();
        if (this.musicInterval) clearInterval(this.musicInterval);
        this.musicStep = 0;

        // Válečný hymnus / Age of War - epická melodie v D-moll s driving arpeggiem a basovými údery bubnů
        const bassLine = [
            146.83, 146.83, 146.83, 146.83, // D3
            116.54, 116.54, 116.54, 116.54, // Bb2
            130.81, 130.81, 130.81, 130.81, // C3
            146.83, 146.83, 174.61, 220.00  // D3 - F3 - A3
        ];
        const leadMelody = [
            293.66, 0, 349.23, 293.66, 440.00, 0, 392.00, 349.23, // D4 - F4 - D4 - A4 - G4 - F4
            329.63, 0, 349.23, 329.63, 293.66, 0, 261.63, 0,      // E4 - F4 - E4 - D4 - C4
            293.66, 0, 349.23, 392.00, 440.00, 0, 523.25, 440.00, // D4 - F4 - G4 - A4 - C5 - A4
            392.00, 440.00, 349.23, 329.63, 293.66, 0, 0, 0       // G4 - A4 - F4 - E4 - D4
        ];

        const stepMs = 210; // ~142 BPM driving battle tempo
        this.musicInterval = setInterval(() => {
            if (!G.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
            const t = this.ctx.currentTime + 0.03;
            const s = this.musicStep;

            // 1. DRIVING BASS & PERCUSSION (Age of War war drum / brass bass)
            const bassFreq = bassLine[s % bassLine.length];
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bassOsc.type = 'sawtooth';
            bassOsc.frequency.setValueAtTime(bassFreq, t);
            bassGain.gain.setValueAtTime(0.18, t);
            bassGain.gain.exponentialRampToValueAtTime(0.003, t + 0.18);
            bassOsc.connect(bassGain);
            bassGain.connect(this.masterGain);
            bassOsc.start(t);
            bassOsc.stop(t + 0.19);

            // Bitevní úder bubnu na každou 4. dobu
            if (s % 4 === 0) {
                const drumOsc = this.ctx.createOscillator();
                const drumGain = this.ctx.createGain();
                drumOsc.type = 'sine';
                drumOsc.frequency.setValueAtTime(120, t);
                drumOsc.frequency.exponentialRampToValueAtTime(32, t + 0.16);
                drumGain.gain.setValueAtTime(0.5, t);
                drumGain.gain.exponentialRampToValueAtTime(0.002, t + 0.22);
                drumOsc.connect(drumGain);
                drumGain.connect(this.masterGain);
                drumOsc.start(t);
                drumOsc.stop(t + 0.23);
            }

            // 2. LEAD HEROIC MELODY (Age of War synthy brass lead)
            const melFreq = leadMelody[s % leadMelody.length];
            if (melFreq > 0) {
                const leadOsc = this.ctx.createOscillator();
                const leadGain = this.ctx.createGain();
                leadOsc.type = 'triangle';
                leadOsc.frequency.setValueAtTime(melFreq, t);
                leadGain.gain.setValueAtTime(0.28, t);
                leadGain.gain.exponentialRampToValueAtTime(0.005, t + 0.24);
                leadOsc.connect(leadGain);
                leadGain.connect(this.masterGain);
                leadOsc.start(t);
                leadOsc.stop(t + 0.25);
            }

            this.musicStep = (this.musicStep + 1) % 64;
        }, stepMs);
    }
    play(sound) {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;

        if (sound === 'select') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(900, t + 0.06);
            g.gain.setValueAtTime(0.15, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
            osc.start(t);
            osc.stop(t + 0.07);
        } else if (sound === 'move') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, t);
            osc.frequency.exponentialRampToValueAtTime(140, t + 0.09);
            g.gain.setValueAtTime(0.2, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        } else if (sound === 'attack') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
            g.gain.setValueAtTime(0.3, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc.start(t);
            osc.stop(t + 0.12);
        } else if (sound === 'siege_boom') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(80, t);
            osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);
            g.gain.setValueAtTime(0.4, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
        } else if (sound === 'level_up') {
            [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.connect(g);
                g.connect(this.ctx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, t + idx * 0.08);
                g.gain.setValueAtTime(0.18, t + idx * 0.08);
                g.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.25);
                osc.start(t + idx * 0.08);
                osc.stop(t + idx * 0.08 + 0.25);
            });
        }
    }
}
const SFX = new CivAudioEngine();

// --- DETAILNÍ VEKTOROVÉ PROCEDURÁLNÍ TEXTURY (BEZ OŘEZÁVÁNÍ) ---
function generatePolytopiaTextures(scene) {
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });

    // 1. ZÁKLADNÍ DLAŽDICE (Plains, Forest, Mountain, Water, Road)
    if (!scene.textures.exists('tile_plain')) {
        gfx.clear();
        gfx.fillStyle(0x4ade80, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0); gfx.lineTo(64, 16); gfx.lineTo(32, 32); gfx.lineTo(0, 16);
        gfx.closePath(); gfx.fillPath();
        gfx.lineStyle(1, 0x22c55e, 0.9); gfx.strokePath();
        gfx.generateTexture('tile_plain', 64, 32);
    }

    // Forest (výška 48px, diamant y=16..48, stromy y=4..38)
    if (!scene.textures.exists('tile_forest')) {
        gfx.clear();
        gfx.fillStyle(0x16a34a, 1);
        gfx.beginPath();
        gfx.moveTo(32, 16); gfx.lineTo(64, 32); gfx.lineTo(32, 48); gfx.lineTo(0, 32);
        gfx.closePath(); gfx.fillPath();
        gfx.lineStyle(1, 0x15803d, 0.9); gfx.strokePath();

        // Stromy bez záporných souřadnic
        gfx.fillStyle(0x78350f, 1); gfx.fillRect(30, 26, 4, 10);
        gfx.fillStyle(0x14532d, 1); gfx.fillTriangle(32, 12, 18, 30, 46, 30);
        gfx.fillStyle(0x16a34a, 1); gfx.fillTriangle(32, 4, 22, 20, 42, 20);
        gfx.generateTexture('tile_forest', 64, 48);
    }

    // Mountain (výška 52px, diamant y=20..52, vrchol y=6)
    if (!scene.textures.exists('tile_mountain')) {
        gfx.clear();
        gfx.fillStyle(0x64748b, 1);
        gfx.beginPath();
        gfx.moveTo(32, 20); gfx.lineTo(64, 36); gfx.lineTo(32, 52); gfx.lineTo(0, 36);
        gfx.closePath(); gfx.fillPath();

        // Svahy
        gfx.fillStyle(0x64748b, 1); gfx.fillTriangle(32, 6, 12, 38, 52, 38);
        gfx.fillStyle(0x475569, 1); gfx.fillTriangle(32, 6, 32, 38, 52, 38);

        // Zasněžený vrcholek
        gfx.fillStyle(0xf8fafc, 1); gfx.fillTriangle(32, 6, 24, 18, 40, 18);
        gfx.fillStyle(0xe2e8f0, 1); gfx.fillTriangle(32, 6, 32, 18, 40, 18);
        gfx.generateTexture('tile_mountain', 64, 52);
    }

    if (!scene.textures.exists('tile_water')) {
        gfx.clear();
        gfx.fillStyle(0x0284c7, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0); gfx.lineTo(64, 16); gfx.lineTo(32, 32); gfx.lineTo(0, 16);
        gfx.closePath(); gfx.fillPath();
        gfx.lineStyle(1, 0x38bdf8, 0.7); gfx.strokePath();
        gfx.generateTexture('tile_water', 64, 32);
    }

    if (!scene.textures.exists('tile_road')) {
        gfx.clear();
        gfx.fillStyle(0x78716c, 0.95);
        gfx.beginPath();
        gfx.moveTo(32, 4); gfx.lineTo(58, 16); gfx.lineTo(32, 28); gfx.lineTo(6, 16);
        gfx.closePath(); gfx.fillPath();
        gfx.lineStyle(1, 0xd6d3d1, 0.6); gfx.strokePath();
        gfx.generateTexture('tile_road', 64, 32);
    }

    // 2. MĚSTO A STRUKTURY (entity_city, feat_ruins, feat_mine, feat_farm, feat_wall)
    if (!scene.textures.exists('entity_city')) {
        gfx.clear();
        // Kamenná pevnost
        gfx.fillStyle(0x334155, 1); gfx.fillRoundedRect(8, 20, 36, 26, 6);
        gfx.fillStyle(0x64748b, 1); gfx.fillRect(16, 12, 20, 24);
        // Věže po stranách
        gfx.fillStyle(0x475569, 1);
        gfx.fillRect(8, 14, 10, 28);
        gfx.fillRect(34, 14, 10, 28);
        // Cimbuří
        gfx.fillRect(7, 10, 4, 6); gfx.fillRect(14, 10, 4, 6);
        gfx.fillRect(33, 10, 4, 6); gfx.fillRect(40, 10, 4, 6);
        // Brána
        gfx.fillStyle(0x1e293b, 1); gfx.fillRoundedRect(22, 26, 8, 14, 4);
        // Korouhev / Vlajka
        gfx.lineStyle(2, 0xfde047, 1); gfx.beginPath(); gfx.moveTo(26, 12); gfx.lineTo(26, 2); gfx.strokePath();
        gfx.fillStyle(0xef4444, 1); gfx.fillTriangle(26, 2, 38, 5, 26, 9);
        gfx.generateTexture('entity_city', 52, 52);
    }

    if (!scene.textures.exists('feat_ruins')) {
        gfx.clear();
        gfx.fillStyle(0x64748b, 1); gfx.fillRect(6, 24, 32, 6);
        gfx.fillStyle(0x94a3b8, 1); gfx.fillRect(10, 8, 6, 16);
        gfx.fillStyle(0x94a3b8, 1); gfx.fillRect(28, 14, 6, 10);
        gfx.fillStyle(0xcbd5e1, 1); gfx.fillRect(8, 6, 16, 4);
        gfx.fillStyle(0xc084fc, 0.9); gfx.fillCircle(20, 18, 4);
        gfx.generateTexture('feat_ruins', 44, 36);
    }

    if (!scene.textures.exists('feat_mine')) {
        gfx.clear();
        gfx.fillStyle(0x451a03, 1); gfx.fillRect(8, 10, 5, 20); gfx.fillRect(27, 10, 5, 20); gfx.fillRect(6, 8, 28, 5);
        gfx.fillStyle(0x0f172a, 1); gfx.fillRect(13, 13, 14, 17);
        gfx.fillStyle(0x78350f, 1); gfx.fillRect(12, 22, 16, 9);
        gfx.fillStyle(0xfacc15, 1); gfx.fillCircle(17, 20, 3); gfx.fillCircle(23, 20, 3);
        gfx.generateTexture('feat_mine', 40, 36);
    }

    if (!scene.textures.exists('feat_farm')) {
        gfx.clear();
        gfx.fillStyle(0xca8a04, 0.9);
        gfx.beginPath(); gfx.moveTo(24, 2); gfx.lineTo(46, 14); gfx.lineTo(24, 26); gfx.lineTo(2, 14); gfx.closePath(); gfx.fillPath();
        gfx.lineStyle(1, 0x854d0e, 0.8);
        gfx.beginPath(); gfx.moveTo(14, 8); gfx.lineTo(34, 18); gfx.moveTo(14, 20); gfx.lineTo(34, 10); gfx.strokePath();
        gfx.fillStyle(0xfef08a, 1); gfx.fillCircle(24, 12, 3); gfx.fillCircle(20, 16, 3); gfx.fillCircle(28, 16, 3);
        gfx.generateTexture('feat_farm', 48, 28);
    }

    if (!scene.textures.exists('feat_wall')) {
        gfx.clear();
        gfx.lineStyle(3, 0x94a3b8, 1);
        gfx.strokeRoundedRect(4, 4, 48, 26, 8);
        gfx.generateTexture('feat_wall', 56, 34);
    }

    // 3. PŘÍRODNÍ DIVY & KMENY
    if (!scene.textures.exists('wonder_diamond')) {
        gfx.clear();
        gfx.fillStyle(0x0284c7, 1); gfx.fillTriangle(24, 2, 10, 38, 38, 38);
        gfx.fillStyle(0x38bdf8, 1); gfx.fillTriangle(24, 2, 24, 38, 38, 38);
        gfx.fillStyle(0xe0f2fe, 0.9); gfx.fillTriangle(24, 2, 20, 20, 28, 20);
        gfx.generateTexture('wonder_diamond', 48, 44);
    }
    if (!scene.textures.exists('wonder_grove')) {
        gfx.clear();
        gfx.fillStyle(0x78350f, 1); gfx.fillRect(22, 22, 4, 16);
        gfx.fillStyle(0x10b981, 1); gfx.fillCircle(24, 16, 14);
        gfx.fillStyle(0xfde047, 0.9); gfx.fillCircle(20, 14, 3); gfx.fillCircle(28, 14, 3);
        gfx.generateTexture('wonder_grove', 48, 44);
    }
    if (!scene.textures.exists('minor_tribe')) {
        gfx.clear();
        gfx.fillStyle(0xb45309, 1); gfx.fillRect(12, 16, 20, 14);
        gfx.fillStyle(0xfef3c7, 1); gfx.fillTriangle(8, 16, 22, 2, 36, 16);
        gfx.fillStyle(0xef4444, 1); gfx.fillCircle(22, 25, 3);
        gfx.generateTexture('minor_tribe', 44, 36);
    }

    // 4. JEDNOTKY (Warrior, Archer, Knight, Catapult, Settler, Boat, Battleship)
    if (!scene.textures.exists('unit_warrior')) {
        gfx.clear();
        gfx.fillStyle(0x1e293b, 1); gfx.lineStyle(2, 0xffffff, 1);
        gfx.fillCircle(20, 22, 14); gfx.strokeCircle(20, 22, 14);
        gfx.fillStyle(0x94a3b8, 1); gfx.fillCircle(20, 14, 8);
        gfx.lineStyle(3, 0x38bdf8, 1);
        gfx.beginPath(); gfx.moveTo(12, 30); gfx.lineTo(28, 10); gfx.strokePath();
        gfx.generateTexture('unit_warrior', 44, 44);
    }
    if (!scene.textures.exists('unit_archer')) {
        gfx.clear();
        gfx.fillStyle(0x15803d, 1); gfx.fillCircle(20, 15, 8);
        gfx.fillStyle(0x78350f, 1); gfx.fillRect(26, 10, 6, 16);
        gfx.lineStyle(2, 0xfacc15, 1);
        gfx.beginPath(); gfx.arc(16, 22, 10, -Math.PI / 2, Math.PI / 2); gfx.strokePath();
        gfx.generateTexture('unit_archer', 44, 44);
    }
    if (!scene.textures.exists('unit_knight')) {
        gfx.clear();
        gfx.fillStyle(0x78350f, 1); gfx.fillRoundedRect(8, 20, 28, 16, 6);
        gfx.fillCircle(34, 16, 7);
        gfx.fillStyle(0x94a3b8, 1); gfx.fillCircle(18, 12, 6);
        gfx.fillStyle(0xef4444, 1); gfx.fillTriangle(18, 6, 14, 0, 22, 0);
        gfx.lineStyle(3, 0xfde047, 1);
        gfx.beginPath(); gfx.moveTo(16, 16); gfx.lineTo(38, 4); gfx.strokePath();
        gfx.generateTexture('unit_knight', 48, 44);
    }
    if (!scene.textures.exists('unit_catapult')) {
        gfx.clear();
        gfx.fillStyle(0x78350f, 1); gfx.fillRect(8, 20, 26, 12);
        gfx.fillStyle(0x334155, 1); gfx.fillCircle(12, 32, 5); gfx.fillCircle(28, 32, 5);
        gfx.lineStyle(3, 0x94a3b8, 1);
        gfx.beginPath(); gfx.moveTo(14, 20); gfx.lineTo(32, 6); gfx.strokePath();
        gfx.fillStyle(0xef4444, 1); gfx.fillCircle(33, 5, 5);
        gfx.generateTexture('unit_catapult', 44, 44);
    }
    if (!scene.textures.exists('unit_settler')) {
        gfx.clear();
        gfx.fillStyle(0x78350f, 1); gfx.fillRect(10, 22, 24, 10);
        gfx.fillStyle(0xf8fafc, 1); gfx.lineStyle(1, 0x94a3b8, 1);
        gfx.fillRoundedRect(10, 12, 24, 12, 6); gfx.strokeRoundedRect(10, 12, 24, 12, 6);
        gfx.fillStyle(0x451a03, 1); gfx.fillCircle(14, 32, 4); gfx.fillCircle(30, 32, 4);
        gfx.generateTexture('unit_settler', 44, 44);
    }
    if (!scene.textures.exists('unit_boat')) {
        gfx.clear();
        gfx.fillStyle(0x78350f, 1);
        gfx.beginPath(); gfx.moveTo(6, 26); gfx.lineTo(38, 26); gfx.lineTo(32, 34); gfx.lineTo(12, 34);
        gfx.closePath(); gfx.fillPath();
        gfx.fillStyle(0x38bdf8, 1); gfx.fillTriangle(22, 6, 22, 24, 36, 24);
        gfx.generateTexture('unit_boat', 44, 44);
    }
    if (!scene.textures.exists('unit_battleship')) {
        gfx.clear();
        gfx.fillStyle(0x3f2305, 1);
        gfx.beginPath(); gfx.moveTo(4, 26); gfx.lineTo(48, 26); gfx.lineTo(40, 36); gfx.lineTo(10, 36);
        gfx.closePath(); gfx.fillPath();
        gfx.fillStyle(0xf8fafc, 1);
        gfx.fillTriangle(20, 4, 20, 24, 32, 24);
        gfx.fillTriangle(34, 8, 34, 24, 44, 24);
        gfx.fillStyle(0x1e293b, 1);
        gfx.fillRect(16, 27, 4, 3); gfx.fillRect(26, 27, 4, 3); gfx.fillRect(36, 27, 4, 3);
        gfx.generateTexture('unit_battleship', 52, 44);
    }

    // 5. MLHA, PROJEKTILY A ČÁSTICE
    if (!scene.textures.exists('cloud_fog')) {
        gfx.clear();
        gfx.fillStyle(0x1e293b, 1);
        gfx.fillCircle(32, 16, 26); gfx.fillCircle(20, 16, 18); gfx.fillCircle(44, 16, 18);
        gfx.generateTexture('cloud_fog', 64, 36);
    }
    if (!scene.textures.exists('confetti_particle')) {
        gfx.clear();
        gfx.fillStyle(0xf59e0b, 1); gfx.fillRect(0, 0, 6, 6);
        gfx.generateTexture('confetti_particle', 6, 6);
    }
    if (!scene.textures.exists('ballistic_arrow')) {
        gfx.clear();
        gfx.lineStyle(2, 0xfde047, 1);
        gfx.beginPath(); gfx.moveTo(0, 4); gfx.lineTo(12, 4); gfx.strokePath();
        gfx.generateTexture('ballistic_arrow', 12, 8);
    }
    if (!scene.textures.exists('ballistic_boulder')) {
        gfx.clear();
        gfx.fillStyle(0x475569, 1); gfx.fillCircle(5, 5, 5);
        gfx.generateTexture('ballistic_boulder', 10, 10);
    }

    gfx.destroy();
}

// ====================================================
// PHASER SCENE: 4X WORLD MAP ENGINE
// ====================================================
class PolytropiaScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PolytropiaScene' });
    }

    create() {
        generatePolytopiaTextures(this);

        this.tileW = 64;
        this.tileH = 32;

        this.world = this.add.container(this.scale.width / 2, this.scale.height / 3);
        this.tileLayer = this.add.container(0, 0);
        this.featureLayer = this.add.container(0, 0);
        this.roadLayer = this.add.container(0, 0);
        this.cityLayer = this.add.container(0, 0);
        this.unitLayer = this.add.container(0, 0);
        this.fogLayer = this.add.container(0, 0);
        this.uiLayer = this.add.container(0, 0);
        this.world.add([
            this.tileLayer,
            this.featureLayer,
            this.roadLayer,
            this.cityLayer,
            this.unitLayer,
            this.fogLayer,
            this.uiLayer
        ]);

        this.initWorldMap();
        this.renderMapTiles();
        this.renderRoads();
        this.renderCities();
        this.renderUnits();
        this.renderFogOfWar();
        this.setupCameraPanning();

        // Reveal Fog around starting player city & warrior
        const startCity = this.cities.find(c => c.owner === G.activeFaction) || this.cities[0];
        this.revealFogAround(startCity.gx, startCity.gy, 3);
        const startUnit = this.units.find(u => u.owner === G.activeFaction);
        if (startUnit) {
            this.revealFogAround(startUnit.gx, startUnit.gy, 2);
        }

        // Automaticky vyber hlavní město aktivního hráče na začátku hry
        if (startCity) {
            this.selectCity(startCity);
        }

        this.scale.on('resize', (gameSize) => {
            this.world.setPosition(gameSize.width / 2, gameSize.height / 3);
            renderMinimap();
        });

        // Připrav startovní obrazovku výběru frakce a herního režimu
        renderFactionPicker();
        renderMinimap();
    }

    initWorldMap() {
        this.map = [];
        this.fog = [];

        // 4 Biome distribution for the 4 Factions
        for (let gx = 0; gx < G.gridSize; gx++) {
            this.map[gx] = [];
            this.fog[gx] = [];
            for (let gy = 0; gy < G.gridSize; gy++) {
                let biome = 'plain';
                const distToCenter = Math.hypot(gx - 7.5, gy - 7.5);

                // Water rivers / lakes in center and oceans on edges
                if (distToCenter > 9.5 || (distToCenter < 2.5 && (gx + gy) % 2 === 0)) {
                    biome = 'water';
                } else {
                    const r = Math.random();
                    if (gx < 8 && gy >= 8) {
                        biome = r < 0.45 ? 'mountain' : (r < 0.75 ? 'plain' : 'forest');
                    } else if (gx >= 8 && gy < 8) {
                        biome = r < 0.45 ? 'forest' : (r < 0.75 ? 'plain' : 'mountain');
                    } else if (gx >= 8 && gy >= 8) {
                        biome = r < 0.35 ? 'water' : (r < 0.75 ? 'plain' : 'forest');
                    } else {
                        biome = r < 0.55 ? 'plain' : (r < 0.85 ? 'forest' : 'mountain');
                    }
                }

                // Natural Wonders & Ancient Ruins
                const hasRuins = (gx === 4 && gy === 4) || (gx === 11 && gy === 11) || (gx === 5 && gy === 10);
                const isDiamond = (gx === 8 && gy === 3);
                const isGrove = (gx === 3 && gy === 8);
                const isTribe = (gx === 6 && gy === 6) || (gx === 10 && gy === 6);

                this.map[gx][gy] = {
                    gx, gy,
                    biome,
                    hasRuins,
                    isDiamond,
                    isGrove,
                    isTribe,
                    hasFarm: false,
                    hasMine: false
                };

                this.fog[gx][gy] = true;
            }
        }

        // 4 Civilizations Starting Cities
        this.cities = [
            { id: 1, name: 'Solaria City', owner: 'solaria', level: 1, progress: 0, progressMax: 2, income: 4, gx: 2, gy: 2, hasWalls: false, isCapital: true },
            { id: 2, name: 'Khar-Citadel', owner: 'khardurn', level: 1, progress: 0, progressMax: 2, income: 3, gx: 2, gy: 13, hasWalls: false, isCapital: true },
            { id: 3, name: 'Aqua-Palace', owner: 'aquaria', level: 1, progress: 0, progressMax: 2, income: 3, gx: 13, gy: 13, hasWalls: false, isCapital: true },
            { id: 4, name: 'Sylva-Haven', owner: 'sylvaen', level: 1, progress: 0, progressMax: 2, income: 3, gx: 13, gy: 2, hasWalls: false, isCapital: true }
        ];

        this.cities.forEach(c => {
            this.map[c.gx][c.gy].biome = 'plain';
            this.map[c.gx][c.gy].hasRuins = false;
            // Garantuj rozmanité a dostupné okolí pro každé město (volná louka pro farmu i hora pro důl)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const nx = c.gx + dx;
                    const ny = c.gy + dy;
                    if (nx >= 0 && nx < G.gridSize && ny >= 0 && ny < G.gridSize) {
                        if (this.map[nx][ny].biome === 'water') {
                            this.map[nx][ny].biome = 'plain';
                        }
                    }
                }
            }
            // Zaruč alespoň 1 horu v dosahu pro důl a 2 louky pro farmy
            const mOffsets = [{ dx: 1, dy: -1 }, { dx: -1, dy: 1 }];
            for (let mo of mOffsets) {
                const mx = c.gx + mo.dx;
                const my = c.gy + mo.dy;
                if (mx >= 0 && mx < G.gridSize && my >= 0 && my < G.gridSize) {
                    this.map[mx][my].biome = 'mountain';
                    break;
                }
            }
            // A políčko pro farmu přímo u města
            const fx = c.gx + 1; const fy = c.gy;
            if (fx >= 0 && fx < G.gridSize && fy >= 0 && fy < G.gridSize) {
                this.map[fx][fy].biome = 'plain';
            }
        });

        // Starting units for each faction (vedle města, aby bylo město hned volné k verbování)
        this.units = [
            { id: 101, owner: 'solaria', type: 'warrior', gx: 3, gy: 2, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, isVeteran: false },
            { id: 201, owner: 'khardurn', type: 'warrior', gx: 3, gy: 13, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, isVeteran: false },
            { id: 301, owner: 'aquaria', type: 'warrior', gx: 12, gy: 13, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, isVeteran: false },
            { id: 401, owner: 'sylvaen', type: 'warrior', gx: 12, gy: 2, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, isVeteran: false }
        ];
    }

    renderMapTiles() {
        if (this.tileLayer) this.tileLayer.removeAll(true);
        if (this.featureLayer) this.featureLayer.removeAll(true);
        this.tileSprites = [];
        for (let gx = 0; gx < G.gridSize; gx++) {
            this.tileSprites[gx] = [];
            for (let gy = 0; gy < G.gridSize; gy++) {
                const sx = (gx - gy) * (this.tileW / 2);
                const sy = (gx + gy) * (this.tileH / 2);

                const data = this.map[gx][gy];
                const spr = this.add.image(sx, sy, `tile_${data.biome}`);

                // Korekce originu a přesný izometrický kosočtverec pro klikání (hory a lesy nepřekrývají sousední pole!)
                let yOff = 0;
                if (data.biome === 'mountain') {
                    spr.setOrigin(0.5, 36 / 52);
                    yOff = 18;
                } else if (data.biome === 'forest') {
                    spr.setOrigin(0.5, 32 / 48);
                    yOff = 14;
                } else {
                    spr.setOrigin(0.5, 0.5);
                    yOff = 2;
                }

                const diamondPoly = new Phaser.Geom.Polygon([
                    32, yOff - 2,
                    64, yOff + 14,
                    32, yOff + 32,
                    0, yOff + 14
                ]);
                spr.setInteractive(diamondPoly, Phaser.Geom.Polygon.Contains);
                spr.input.cursor = 'pointer';
                spr.tileData = data;

                spr.on('pointerdown', (pointer) => {
                    if (this.hasDragged) return;
                    if (pointer.event && pointer.event.target && pointer.event.target.tagName !== 'CANVAS') return;
                    this.onTileClicked(gx, gy, pointer);
                });

                this.tileLayer.add(spr);
                this.tileSprites[gx][gy] = spr;

                // Feature overlays (v samostatné neinteraktivní vrstvě, aby neblokovaly kliknutí)
                if (data.isDiamond) {
                    const w = this.add.image(sx, sy - 6, 'wonder_diamond').setOrigin(0.5, 0.7);
                    this.featureLayer.add(w);
                } else if (data.isGrove) {
                    const w = this.add.image(sx, sy - 6, 'wonder_grove').setOrigin(0.5, 0.7);
                    this.featureLayer.add(w);
                } else if (data.isTribe) {
                    const t = this.add.image(sx, sy - 4, 'minor_tribe').setOrigin(0.5, 0.7);
                    spr.tribeSprite = t;
                    this.featureLayer.add(t);
                } else if (data.hasRuins) {
                    const r = this.add.image(sx, sy - 4, 'feat_ruins').setOrigin(0.5, 0.7);
                    spr.ruinsSprite = r;
                    this.featureLayer.add(r);
                }
                if (data.hasFarm) {
                    const f = this.add.image(sx, sy, 'feat_farm').setOrigin(0.5, 0.5);
                    spr.farmSprite = f;
                    this.featureLayer.add(f);
                }
                if (data.hasMine) {
                    const m = this.add.image(sx, sy - 4, 'feat_mine').setOrigin(0.5, 0.7);
                    spr.mineSprite = m;
                    this.featureLayer.add(m);
                }
            }
        }
    }

    renderRoads() {
        if (this.roadLayer) this.roadLayer.removeAll(true);
        this.roadSprites = [];

        G.roads.forEach(r => {
            const sx = (r.gx - r.gy) * (this.tileW / 2);
            const sy = (r.gx + r.gy) * (this.tileH / 2);
            const spr = this.add.image(sx, sy, 'tile_road').setOrigin(0.5, 0.5);
            this.roadLayer.add(spr);
            this.roadSprites.push(spr);
        });
    }

    renderCities() {
        if (this.cityLayer) this.cityLayer.removeAll(true);
        this.citySprites = [];

        this.cities.forEach(city => {
            const sx = (city.gx - city.gy) * (this.tileW / 2);
            const sy = (city.gx + city.gy) * (this.tileH / 2) - 8;

            const faction = G.factions[city.owner];
            const spr = this.add.image(sx, sy, 'entity_city');
            spr.setOrigin(0.5, 0.72);
            spr.setTint(faction ? faction.color : 0xffffff);
            // Kompaktní kruhový hitbox uprostřed města, aby rohy nepřekrývaly sousední políčka
            spr.setInteractive(new Phaser.Geom.Circle(28, 34, 18), Phaser.Geom.Circle.Contains);
            spr.input.cursor = 'pointer';
            spr.cityData = city;

            // Zobrazení hradeb, pokud je město opevněné
            if (city.hasWalls) {
                const wallSpr = this.add.image(sx, sy + 6, 'feat_wall').setOrigin(0.5, 0.65);
                this.cityLayer.add(wallSpr);
                this.citySprites.push(wallSpr);
            }

            let bannerText = `${city.name} (${city.level})`;
            if (G.stargateProject && G.stargateProject.cityId === city.id) {
                bannerText += ` ⚡ BRÁNA (${G.stargateProject.turnsLeft}t)`;
            }

            const banner = this.add.text(sx, sy - 32, bannerText, {
                fontFamily: 'Outfit',
                fontSize: '11px',
                fontStyle: '800',
                color: '#fff',
                backgroundColor: faction ? faction.cssColor : '#0369a1',
                padding: { x: 6, y: 3 }
            }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

            const onCityClick = (p) => {
                p.event.stopPropagation();
                if (p.event && p.event.target && p.event.target.tagName !== 'CANVAS') return;
                if (this.hasDragged) return;

                // Pokud je vybraná jednotka a toto město je platným cílem pohybu/útoku, proveď akci!
                const hl = this.moveHighlights && this.moveHighlights.find(h => h.x === city.gx && h.y === city.gy);
                if (G.selectedEntity && G.selectedEntity.type === 'unit' && hl) {
                    this.onTileClicked(city.gx, city.gy, p);
                    return;
                }

                if (G.selectedEntity && G.selectedEntity.type === 'unit' && G.selectedEntity.data.owner === G.activeFaction) {
                    const u = G.selectedEntity.data;
                    const enemyInCity = this.units.find(en => en.gx === city.gx && en.gy === city.gy && en.owner !== G.activeFaction);
                    if (enemyInCity) {
                        this.handleUnitAttack(u, enemyInCity);
                        return;
                    }
                }
                this.selectCity(city);
            };

            spr.on('pointerdown', onCityClick);
            banner.on('pointerdown', onCityClick);

            this.cityLayer.add(spr);
            this.cityLayer.add(banner);
            this.citySprites.push(spr);
            this.citySprites.push(banner);
        });
    }

    renderUnits() {
        if (this.unitLayer) this.unitLayer.removeAll(true);
        this.unitSprites = [];

        this.units.forEach(u => {
            const sx = (u.gx - u.gy) * (this.tileW / 2);
            const inCity = this.cities.some(c => c.gx === u.gx && c.gy === u.gy);
            const sy = (u.gx + u.gy) * (this.tileH / 2) - (inCity ? 18 : 6);

            const faction = G.factions[u.owner];
            let texKey = `unit_${u.type}`;
            if (this.map[u.gx][u.gy].biome === 'water') {
                texKey = (u.type === 'battleship') ? 'unit_battleship' : 'unit_boat';
            }

            const spr = this.add.image(sx, sy, texKey);
            spr.setOrigin(0.5, 0.6);
            if (u.type !== 'settler') {
                spr.setTint(faction ? faction.color : 0xffffff);
            }
            // Kompaktní kruhový hitbox, aby jednotka nekradla kliknutí okolním políčkům
            spr.setInteractive(new Phaser.Geom.Circle(22, 22, 16), Phaser.Geom.Circle.Contains);
            spr.input.cursor = 'pointer';
            spr.unitData = u;

            const vetMark = u.isVeteran ? '⭐' : '';
            const uIcon = UNIT_TYPES[u.type] ? UNIT_TYPES[u.type].icon : '';
            const hpBadge = this.add.text(sx, sy - 20, `${uIcon} ${u.hp}${vetMark}`, {
                fontFamily: 'Outfit',
                fontSize: '10px',
                fontStyle: '800',
                color: '#fff',
                backgroundColor: u.hp < 5 ? '#ef4444' : (faction ? faction.cssColor : '#1e293b'),
                padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

            const onUnitClick = (p) => {
                p.event.stopPropagation();
                if (p.event && p.event.target && p.event.target.tagName !== 'CANVAS') return;
                if (this.hasDragged) return;

                if (G.selectedEntity && G.selectedEntity.type === 'unit' && G.selectedEntity.data.owner === G.activeFaction && u.owner !== G.activeFaction) {
                    const attacker = G.selectedEntity.data;
                    this.handleUnitAttack(attacker, u);
                    return;
                }
                if (u.owner === G.activeFaction) {
                    // Pokud kliknu na jednotku, která už je vybraná a stojí ve městě, přepni na město!
                    if (G.selectedEntity && G.selectedEntity.type === 'unit' && G.selectedEntity.data.id === u.id && inCity) {
                        const cityHere = this.cities.find(c => c.gx === u.gx && c.gy === u.gy && c.owner === G.activeFaction);
                        if (cityHere) {
                            this.selectCity(cityHere);
                            return;
                        }
                    }
                    this.selectUnit(u);
                }
            };

            spr.on('pointerdown', onUnitClick);
            hpBadge.on('pointerdown', onUnitClick);

            this.unitLayer.add(spr);
            this.unitLayer.add(hpBadge);
            this.unitSprites.push(spr);
            this.unitSprites.push(hpBadge);
        });
    }

    renderFogOfWar() {
        if (this.fogLayer) this.fogLayer.removeAll(true);
        this.fogSprites = [];

        for (let gx = 0; gx < G.gridSize; gx++) {
            this.fogSprites[gx] = [];
            for (let gy = 0; gy < G.gridSize; gy++) {
                if (this.fog[gx][gy]) {
                    const sx = (gx - gy) * (this.tileW / 2);
                    const sy = (gx + gy) * (this.tileH / 2);
                    const cloud = this.add.image(sx, sy, 'cloud_fog');
                    cloud.setOrigin(0.5, 0.5);
                    this.fogLayer.add(cloud);
                    this.fogSprites[gx][gy] = cloud;
                }
            }
        }
    }

    revealFogAround(cx, cy, radius = 2) {
        let revealedAny = false;
        if (!G.factionExplored) G.factionExplored = {};
        if (!G.factionExplored[G.activeFaction]) {
            G.factionExplored[G.activeFaction] = [];
            for (let x = 0; x < G.gridSize; x++) {
                G.factionExplored[G.activeFaction][x] = [];
                for (let y = 0; y < G.gridSize; y++) {
                    G.factionExplored[G.activeFaction][x][y] = false;
                }
            }
        }

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const tx = cx + dx;
                const ty = cy + dy;
                if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
                    G.factionExplored[G.activeFaction][tx][ty] = true;
                    if (this.fog[tx][ty]) {
                        this.fog[tx][ty] = false;
                        revealedAny = true;
                    }
                }
            }
        }
        if (revealedAny) {
            this.renderFogOfWar();
            this.renderCities();
            this.renderUnits();
            renderMinimap();
        }
    }

    setupCameraPanning() {
        this.input.on('pointerdown', (p) => {
            if (p.event && p.event.target && p.event.target.tagName !== 'CANVAS') return;
            this.isPointerDown = true;
            this.hasDragged = false;
            this.dragStartX = p.x;
            this.dragStartY = p.y;
            this.worldStartX = this.world.x;
            this.worldStartY = this.world.y;
        });

        this.input.on('pointermove', (p) => {
            if (!this.isPointerDown) return;
            const dist = Math.hypot(p.x - this.dragStartX, p.y - this.dragStartY);
            if (dist > 6) {
                this.hasDragged = true;
                this.world.x = this.worldStartX + (p.x - this.dragStartX);
                this.world.y = this.worldStartY + (p.y - this.dragStartY);
            }
        });

        this.input.on('pointerup', () => {
            this.isPointerDown = false;
            setTimeout(() => { this.hasDragged = false; }, 30);
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const newScale = Phaser.Math.Clamp(this.world.scaleX - deltaY * 0.001, 0.6, 2.2);
            this.world.setScale(newScale);
        });
    }

    selectUnit(unit) {
        G.selectedEntity = { type: 'unit', data: unit };
        SFX.play('select');
        this.highlightMovementTiles(unit);
        openUnitDock(unit);
    }

    selectCity(city) {
        G.selectedEntity = { type: 'city', data: city };
        SFX.play('select');
        this.clearTileHighlights();
        openCityDock(city);
    }

    highlightMovementTiles(unit) {
        this.clearTileHighlights();
        this.moveHighlights = [];

        // Zákaz vykreslení indikátorů pro vyčerpanou jednotku
        if (unit.attacked && unit.moved) return;

        const isCatapult = unit.type === 'catapult';
        // Katapult nemůže po pohybu střílet v témže tahu
        const hasRoadHere = G.roads.some(r => r.gx === unit.gx && r.gy === unit.gy) || this.cities.some(c => c.gx === unit.gx && c.gy === unit.gy);
        const moveRange = unit.moved ? 0 : UNIT_TYPES[unit.type].move;
        const attackRange = (unit.attacked || (isCatapult && unit.moved)) ? 0 : UNIT_TYPES[unit.type].range;
        const maxR = Math.max(moveRange + (hasRoadHere ? 1 : 0), attackRange);

        if (maxR === 0) return;

        for (let x = unit.gx - maxR; x <= unit.gx + maxR; x++) {
            for (let y = unit.gy - maxR; y <= unit.gy + maxR; y++) {
                if (x < 0 || x >= G.gridSize || y < 0 || y >= G.gridSize) continue;
                if (x === unit.gx && y === unit.gy) continue;

                const dist = Math.max(Math.abs(unit.gx - x), Math.abs(unit.gy - y));
                const sx = (x - y) * (this.tileW / 2);
                const sy = (x + y) * (this.tileH / 2);

                const unitOnTile = this.units.find(u => u.gx === x && u.gy === y);
                const enemyOnTile = unitOnTile && unitOnTile.owner !== G.activeFaction;
                const friendlyOnTile = unitOnTile && unitOnTile.owner === G.activeFaction;
                const canSail = G.factions[G.activeFaction].techs.includes('sailing');
                const isWater = this.map[x][y].biome === 'water';
                const inFog = this.fog && this.fog[x] && this.fog[x][y];

                // ČERVENÝ ÚTOČNÝ INDIKÁTOR (pouze pokud cíl NENÍ zahalen v černé mlze a jednotka ještě neútočila)
                if (enemyOnTile && !unit.attacked && attackRange > 0 && dist <= attackRange && !inFog) {
                    const ring = this.add.circle(sx, sy, 15, 0xef4444, 0.75);
                    ring.setStrokeStyle(2, 0xffffff, 0.95);
                    ring.setInteractive(new Phaser.Geom.Circle(15, 15, 22), Phaser.Geom.Circle.Contains);
                    ring.input.cursor = 'pointer';
                    ring.on('pointerdown', (pointer) => {
                        pointer.event.stopPropagation();
                        if (!this.hasDragged) this.onTileClicked(x, y, pointer);
                    });
                    this.tweens.add({ targets: ring, scale: 1.25, yoyo: true, repeat: -1, duration: 400 });
                    this.uiLayer.add(ring);
                    this.moveHighlights.push({ x, y, type: 'attack', target: unitOnTile, sprite: ring });
                }
                // MODRÝ POHYBOVÝ INDIKÁTOR (s bonusem +1 pole při pohybu po silnici mezi městy/cestami!)
                else if (!unitOnTile && !friendlyOnTile && !unit.moved && (!isWater || canSail)) {
                    const destHasRoad = G.roads.some(r => r.gx === x && r.gy === y) || this.cities.some(c => c.gx === x && c.gy === y);
                    const roadBonus = (hasRoadHere && destHasRoad) ? 1 : 0;
                    const effectiveMove = moveRange + roadBonus;

                    if (dist > effectiveMove) continue;

                    // Kontrola nepřekročení hor rytířem bez hornictví
                    if (dist >= 2 && this.map[x][y].biome === 'mountain' && !G.factions[G.activeFaction].techs.includes('mining')) {
                        continue;
                    }
                    const ring = this.add.circle(sx, sy, 12, isWater ? 0x0284c7 : 0x38bdf8, 0.75);
                    ring.setStrokeStyle(2, 0xffffff, 0.9);
                    ring.setInteractive(new Phaser.Geom.Circle(12, 12, 22), Phaser.Geom.Circle.Contains);
                    ring.input.cursor = 'pointer';
                    ring.on('pointerdown', (pointer) => {
                        pointer.event.stopPropagation();
                        if (!this.hasDragged) this.onTileClicked(x, y, pointer);
                    });
                    this.uiLayer.add(ring);
                    this.moveHighlights.push({ x, y, type: 'move', sprite: ring });
                }
            }
        }
    }

    clearTileHighlights() {
        if (this.uiLayer) {
            this.uiLayer.removeAll(true);
        }
        this.moveHighlights = [];
    }

    onTileClicked(gx, gy, pointer) {
        if (G.selectedEntity && G.selectedEntity.type === 'unit') {
            const u = G.selectedEntity.data;
            const hl = this.moveHighlights && this.moveHighlights.find(h => h.x === gx && h.y === gy);

            if (hl) {
                if (hl.type === 'attack') {
                    this.handleUnitAttack(u, hl.target);
                    return;
                } else if (hl.type === 'move') {
                    this.executeMove(u, gx, gy);
                    return;
                }
            }
        }

        this.clearTileHighlights();
        closeDock();
    }

    handleUnitAttack(attacker, defender) {
        const dist = Math.max(Math.abs(attacker.gx - defender.gx), Math.abs(attacker.gy - defender.gy));
        const maxRange = UNIT_TYPES[attacker.type].range;

        if (attacker.attacked) {
            this.clearTileHighlights();
            openUnitDock(attacker);
            showToast('⚠️ Tato jednotka již v tomto tahu útočila!');
            return;
        }
        if (dist > maxRange) {
            showToast('⚠️ Nepřítel je mimo dostřel!');
            return;
        }

        this.clearTileHighlights();
        this.executeCombat(attacker, defender);
    }

    executeMove(unit, targetX, targetY) {
        unit.gx = targetX;
        unit.gy = targetY;
        unit.moved = true;
        SFX.play('move');
        this.clearTileHighlights();

        // ZONE OF CONTROL (ZoC): Vstup do sousedství nepřítele okamžitě vyčerpá veškerý pohyb
        const adjacentEnemy = this.units.some(en => en.owner !== unit.owner && Math.max(Math.abs(en.gx - targetX), Math.abs(en.gy - targetY)) <= 1);
        if (adjacentEnemy) {
            unit.moved = true;
        }

        const spr = this.unitSprites.find(s => s.unitData === unit);
        const inCity = this.cities.some(c => c.gx === targetX && c.gy === targetY);
        const targetSx = (targetX - targetY) * (this.tileW / 2);
        const targetSy = (targetX + targetY) * (this.tileH / 2) - (inCity ? 18 : 6);

        const onMoveDone = () => {
            this.checkCityCapture(unit, targetX, targetY);
            this.revealFogAround(targetX, targetY, 2);
            this.renderUnits();
            this.renderCities();
            renderMinimap();

            // Pokud jednotka ještě neútočila a není katapult po pohybu, vysviť cíle
            if (G.selectedEntity && G.selectedEntity.data === unit && !unit.attacked && unit.type !== 'catapult') {
                this.highlightMovementTiles(unit);
            } else {
                this.clearTileHighlights();
            }
            if (G.selectedEntity && G.selectedEntity.data === unit) {
                openUnitDock(unit);
            }
        };

        if (spr) {
            this.tweens.add({
                targets: spr,
                x: targetSx,
                y: targetSy,
                duration: 180,
                ease: 'Power2',
                onComplete: onMoveDone
            });
        } else {
            onMoveDone();
        }

        // Ruin Discovery Modal Event
        const tile = this.map[targetX][targetY];
        if (tile.hasRuins && unit.owner === G.activeFaction) {
            tile.hasRuins = false;
            if (this.tileSprites[targetX][targetY].ruinsSprite) {
                this.tileSprites[targetX][targetY].ruinsSprite.destroy();
            }
            triggerRuinEventChoice();
        }

        // Minor Tribe Encounter
        if (tile.isTribe && unit.owner === G.activeFaction) {
            tile.isTribe = false;
            if (this.tileSprites[targetX][targetY].tribeSprite) {
                this.tileSprites[targetX][targetY].tribeSprite.destroy();
            }
            SFX.play('level_up');
            G.factions[G.activeFaction].stars += 10;
            G.score += 60;
            showToast('🛖 DOMORODÝ KMEN VÁS PŘIVÍTAL! Daroval +10 ⭐ Hvězd na rozvoj.');
            updateHUD();
        }
    }

    checkCityCapture(unit, gx, gy) {
        const city = this.cities.find(c => c.gx === gx && c.gy === gy);
        if (city && city.owner !== unit.owner) {
            const oldOwner = city.owner;
            city.owner = unit.owner;
            SFX.play('level_up');

            if (oldOwner && G.factions[oldOwner] && G.factions[oldOwner].status !== 'war') {
                G.factions[oldOwner].status = 'war';
            }

            if (unit.owner === G.activeFaction) {
                G.score += 150;
                showToast(`🚩 MĚSTO ${city.name.toUpperCase()} BYLO DOBYTO!`);
                triggerConfetti(this, (city.gx - city.gy) * (this.tileW / 2), (city.gx + city.gy) * (this.tileH / 2));
            } else if (oldOwner === G.activeFaction) {
                G.score = Math.max(0, G.score - 100);
                showToast(`⚠️ MĚSTO ${city.name.toUpperCase()} BYLO ZTRACENO VE PROSPĚCH ${G.factions[unit.owner].name}!`);
                if (G.stargateProject && G.stargateProject.cityId === city.id) {
                    G.stargateProject = null;
                    showToast('❌ Hvězdná brána byla zničena nájezdníky!');
                }
            }

            updateHUD();
            renderMinimap();
            this.checkVictoryConditions();
        }
    }

    executeCombat(attacker, defender) {
        attacker.attacked = true;
        attacker.moved = true;
        this.clearTileHighlights();

        // Pokud dojde k útoku mezi hráčem a cizí frakcí, napadená frakce vstupuje do válečného stavu
        if (defender.owner !== attacker.owner && G.factions[defender.owner] && G.factions[defender.owner].status !== 'war') {
            G.factions[defender.owner].status = 'war';
            if (attacker.owner === G.playerFaction) {
                showToast(`⚔️ Frakce ${G.factions[defender.owner].name} vstoupila do válečného stavu!`);
            }
        }

        const atkDef = UNIT_TYPES[attacker.type];
        const defDef = UNIT_TYPES[defender.type];

        const sx = (attacker.gx - attacker.gy) * (this.tileW / 2);
        const sy = (attacker.gx + attacker.gy) * (this.tileH / 2) - 10;
        const tx = (defender.gx - defender.gy) * (this.tileW / 2);
        const ty = (defender.gx + defender.gy) * (this.tileH / 2) - 10;

        // Balistické projektily pro střelbu na dálku
        if (atkDef.range > 1) {
            this.launchBallisticProjectile(sx, sy, tx, ty, atkDef.siege);
        } else {
            SFX.play('attack');
        }

        // Terénní a městské bonusy k obraně
        const defTile = this.map[defender.gx][defender.gy];
        const defInCity = this.cities.find(c => c.gx === defender.gx && c.gy === defender.gy);
        let terrainDefBonus = defTile.biome === 'forest' ? 1 : (defTile.biome === 'mountain' ? 2 : 0);
        if (defInCity) {
            terrainDefBonus += (defInCity.hasWalls ? 4 : 2);
        }

        // Katapult ignoruje zdi a má masivní obléhací bonus proti městům
        let siegeBonus = (atkDef.siege && defInCity) ? 5 : 0;
        const effectiveDef = atkDef.siege ? 0 : (defDef.def + terrainDefBonus);

        const vetAtk = attacker.isVeteran ? 1 : 0;
        const dmg = Math.max(1, atkDef.atk + vetAtk + siegeBonus - Math.floor(effectiveDef / 2));
        defender.hp -= dmg;

        const activeFac = G.factions[G.activeFaction];
        if (attacker.owner === G.activeFaction) {
            showToast(`⚔️ Zásah! Způsobeno ${dmg} poškození (Obrana cíle: ${effectiveDef})!`);
        }

        // Protiútok pouze pokud je obránce v dosahu 1 a má bojový útok (obrana proti bezbranným osadníkům)
        const dist = Math.max(Math.abs(attacker.gx - defender.gx), Math.abs(attacker.gy - defender.gy));
        if (defender.hp > 0 && dist === 1 && !atkDef.siege && defDef.atk > 0) {
            const counterDmg = Math.max(1, Math.floor(defDef.atk / 2));
            attacker.hp -= counterDmg;
        }

        // Povýšení na veterána při likvidaci nepřátel
        if (defender.hp <= 0) {
            if (attacker.owner === G.activeFaction) showToast(`💀 Nepřítel byl zničen!`);
            this.units = this.units.filter(x => x !== defender);
            if (attacker.owner === G.activeFaction) G.score += 30;

            attacker.kills = (attacker.kills || 0) + 1;
            if (attacker.kills >= 3 && !attacker.isVeteran) {
                attacker.isVeteran = true;
                attacker.maxHp += 5;
                attacker.hp = attacker.maxHp;
                SFX.play('level_up');
                if (attacker.owner === G.activeFaction) {
                    showToast(`⭐ JEDNOTKA POVÝŠILA NA VETERÁNA (+5 HP, plné doléčení)!`);
                    triggerConfetti(this, (attacker.gx - attacker.gy) * (this.tileW / 2), (attacker.gx + attacker.gy) * (this.tileH / 2));
                }
            }

            if (atkDef.range === 1) {
                this.executeMove(attacker, defender.gx, defender.gy);
            }
        }

        if (attacker.hp <= 0) {
            this.units = this.units.filter(x => x !== attacker);
            closeDock();
        } else {
            // Útočník přežil: Pokud neproběhl posun na pole padlého (např. obránce žije nebo byl zabit z dálky),
            // vyčisti indikátory a aktualizuj dock na stav Vyčerpán
            if (defender.hp > 0 || atkDef.range > 1) {
                this.clearTileHighlights();
                if (G.selectedEntity && G.selectedEntity.data === attacker) {
                    openUnitDock(attacker);
                }
            }
        }

        this.renderUnits();
        renderMinimap();
        this.checkVictoryConditions();
    }

    launchBallisticProjectile(sx, sy, tx, ty, isBoulder) {
        const key = isBoulder ? 'ballistic_boulder' : 'ballistic_arrow';
        const proj = this.add.image(sx, sy, key).setDepth(40);
        SFX.play(isBoulder ? 'siege_boom' : 'attack');

        this.tweens.add({
            targets: proj,
            x: tx,
            y: ty,
            duration: 250,
            ease: 'Sine.easeInOut',
            onComplete: () => proj.destroy()
        });
    }

    checkVictoryConditions() {
        const activeCities = this.cities.filter(c => c.owner === G.activeFaction);
        const playerFactions = G.gameMode === 'passplay' ? G.passPlayFactions : [G.playerFaction];

        // V Hotseat režimu prohrává frakce když nemá města
        if (G.gameMode === 'passplay') {
            const livingPlayers = G.passPlayFactions.filter(f => this.cities.some(c => c.owner === f));
            if (livingPlayers.length === 1) {
                const winner = livingPlayers[0];
                showVictoryScreen(`Slavné vítězství v Hotseatu! Hráč ${G.factions[winner].name} ovládl celý svět!`);
                return;
            }
            return;
        }

        // V Singleplayeru:
        const playerCities = this.cities.filter(c => c.owner === G.playerFaction);
        const enemyCities = this.cities.filter(c => c.owner !== G.playerFaction);

        // PODMÍNKA PROHRY: Ztráta všech měst hráče
        if (playerCities.length === 0) {
            showDefeatScreen('Tvá civilizace ztratila všechna svá města a zanikla v propadlišti dějin.');
            return;
        }

        // Válečné vítězství: Dobytí všech měst soupeřů
        if (enemyCities.length === 0) {
            showVictoryScreen('Totální Válečné Vítězství! Všechna nepřátelská města byla dobyta a svět se klaní tvé moci.');
            return;
        }

        // Bodové vítězství / prohra po 50 tazích
        if (G.turn >= G.maxTurns) {
            let highestScore = G.score;
            let winner = G.playerFaction;
            for (let f in G.factions) {
                const facScore = this.cities.filter(c => c.owner === f).length * 100;
                if (facScore > highestScore) { highestScore = facScore; winner = f; }
            }
            if (winner === G.playerFaction) {
                showVictoryScreen(`Čas vypršel (50 tahů)! Zvítězil jsi na civilizační skóre (${G.score} bodů).`);
            } else {
                showDefeatScreen(`Čas vypršel (50 tahů)! Frakce ${G.factions[winner].name} zvítězila na body.`);
            }
        }
    }
}

// --- CONFETTI PARTICLE BURST ---
function triggerConfetti(scene, x, y) {
    for (let i = 0; i < 20; i++) {
        const p = scene.add.image(x, y, 'confetti_particle');
        p.setTint([0xf59e0b, 0x38bdf8, 0xef4444, 0x22c55e][Math.floor(Math.random() * 4)]);
        p.setDepth(50);
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 80 + 30;

        scene.tweens.add({
            targets: p,
            x: x + Math.cos(angle) * speed,
            y: y + Math.sin(angle) * speed - 20,
            alpha: 0,
            scale: 0.2,
            duration: 650,
            ease: 'Power2',
            onComplete: () => p.destroy()
        });
    }
}

// --- MINIMAP RADAR CANVAS RENDERING ---
function renderMinimap() {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const scene = game.scene.getScene('PolytropiaScene');
    if (!scene || !scene.map) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const stepX = canvas.width / G.gridSize;
    const stepY = canvas.height / G.gridSize;

    // Render Tiles & Fog
    for (let x = 0; x < G.gridSize; x++) {
        for (let y = 0; y < G.gridSize; y++) {
            if (scene.fog && scene.fog[x][y]) {
                ctx.fillStyle = '#1e293b';
            } else {
                const b = scene.map[x][y].biome;
                if (b === 'water') ctx.fillStyle = '#0284c7';
                else if (b === 'forest') ctx.fillStyle = '#16a34a';
                else if (b === 'mountain') ctx.fillStyle = '#64748b';
                else ctx.fillStyle = '#4ade80';
            }
            ctx.fillRect(x * stepX, y * stepY, stepX - 1, stepY - 1);
        }
    }

    // Render Roads
    ctx.fillStyle = '#d6d3d1';
    G.roads.forEach(r => {
        if (!scene.fog[r.gx][r.gy]) {
            ctx.fillRect(r.gx * stepX + 1, r.gy * stepY + 1, stepX - 2, stepY - 2);
        }
    });

    // Render Cities
    scene.cities.forEach(c => {
        if (!scene.fog[c.gx][c.gy]) {
            const fac = G.factions[c.owner];
            ctx.fillStyle = fac ? fac.cssColor : '#ffffff';
            ctx.fillRect(c.gx * stepX, c.gy * stepY, stepX, stepY);
            ctx.strokeStyle = '#000000';
            ctx.strokeRect(c.gx * stepX, c.gy * stepY, stepX, stepY);
        }
    });

    // Render Units
    scene.units.forEach(u => {
        if (!scene.fog[u.gx][u.gy]) {
            const fac = G.factions[u.owner];
            ctx.fillStyle = fac ? fac.cssColor : '#ffffff';
            ctx.beginPath();
            ctx.arc((u.gx + 0.5) * stepX, (u.gy + 0.5) * stepY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function handleMinimapClick(e) {
    const canvas = document.getElementById('minimap-canvas');
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const gx = Math.floor((clickX / canvas.width) * G.gridSize);
    const gy = Math.floor((clickY / canvas.height) * G.gridSize);

    const scene = game.scene.getScene('PolytropiaScene');
    if (!scene) return;

    const targetSx = (gx - gy) * (scene.tileW / 2);
    const targetSy = (gx + gy) * (scene.tileH / 2);

    scene.tweens.add({
        targets: scene.world,
        x: scene.scale.width / 2 - targetSx,
        y: scene.scale.height / 2 - targetSy,
        duration: 350,
        ease: 'Power2'
    });
}

// --- UI DOCKS & ACTION SHELVES ---
function openUnitDock(unit) {
    if (unit.owner !== G.activeFaction) return;

    const dock = document.getElementById('entity-dock');
    const iconEl = document.getElementById('dock-icon');
    const title = document.getElementById('dock-title');
    const sub = document.getElementById('dock-subtitle');
    const shelf = document.getElementById('dock-actions-shelf');

    if (iconEl) iconEl.innerText = UNIT_TYPES[unit.type] ? UNIT_TYPES[unit.type].icon : '🗡️';
    title.innerText = `${UNIT_TYPES[unit.type].name} ${unit.isVeteran ? '⭐ VETERÁN' : ''}`;
    const moveStatus = unit.moved ? '❌ Vyčerpán' : '✅ Připraven';
    const atkStatus = unit.attacked ? '❌ Vyčerpán' : '✅ Připraven';
    sub.innerText = `HP: ${unit.hp}/${unit.maxHp} • Pohyb: ${moveStatus} • Útok: ${atkStatus}`;

    const scene = game.scene.getScene('PolytropiaScene');
    const cityHere = scene.cities.find(c => c.gx === unit.gx && c.gy === unit.gy && c.owner === G.activeFaction);

    let actionsHtml = '';
    // Přepnutí zpět na město při garrisonu
    if (cityHere) {
        actionsHtml += `
            <button type="button" class="action-chip" style="background:#0284c7; border-color:#38bdf8; font-weight:800;" onpointerdown="event.stopPropagation()" onclick="selectCityFromUnit(${cityHere.id})">
                <span>🏛️ Spravovat Město ${cityHere.name}</span>
            </button>
        `;
    }

    actionsHtml += `
        <button type="button" class="action-chip ${unit.moved && unit.attacked ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="healSelectedUnit()">
            <span>❤️ Odpočinek & Léčení (+3 HP)</span>
        </button>
    `;

    if (unit.type === 'settler') {
        const scene = game.scene.getScene('PolytropiaScene');
        const inCity = scene && scene.cities.some(c => c.gx === unit.gx && c.gy === unit.gy);
        if (inCity) {
            actionsHtml += `
                <div class="action-chip disabled" style="background:#064e3b; border-color:#059669; opacity:0.8; cursor:default;" title="Osadník musí vyjít z města na volné pole">
                    <span>⛺ Vyveď Osadníka z města pro založení nového</span>
                </div>
            `;
        } else {
            actionsHtml += `
                <button type="button" class="action-chip" style="background:#059669; border-color:#34d399; font-weight:800;" onpointerdown="event.stopPropagation()" onclick="foundNewCityWithSettler(${unit.id})">
                    <span>⛺ Založit Nové Město Zde</span>
                </button>
            `;
        }
    }

    if (G.factions[G.activeFaction].techs.includes('roads') && !G.roads.some(r => r.gx === unit.gx && r.gy === unit.gy)) {
        actionsHtml += `
            <button type="button" class="action-chip" style="background:#475569; border-color:#94a3b8;" onpointerdown="event.stopPropagation()" onclick="buildRoadUnderUnit(${unit.id})">
                <span>🛤️ Dláždit Silnici</span> <span class="cost">(2 ⭐)</span>
            </button>
        `;
    }

    shelf.innerHTML = actionsHtml;
    dock.classList.remove('hidden');
}

window.selectCityFromUnit = function(cityId) {
    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);
    if (city) {
        scene.selectCity(city);
    }
};

window.buildRoadUnderUnit = function(unitId) {
    const scene = game.scene.getScene('PolytropiaScene');
    const unit = scene.units.find(u => u.id === unitId);
    if (!unit) return;

    if (G.factions[G.activeFaction].stars < 2) {
        showToast('❌ Nedostatek Hvězd na stavbu silnice (potřeba 2 ⭐)!');
        return;
    }
    const alreadyRoad = G.roads.some(r => r.gx === unit.gx && r.gy === unit.gy);
    if (alreadyRoad) {
        showToast('⚠️ Zde již silnice stojí!');
        return;
    }

    G.factions[G.activeFaction].stars -= 2;
    G.roads.push({ gx: unit.gx, gy: unit.gy });
    scene.renderRoads();
    updateHUD();
    openUnitDock(unit);
    SFX.play('move');
    showToast('🛤️ Dlážděná silnice byla vybudována!');
};

function openCityDock(city) {
    if (city.owner !== G.activeFaction) return;

    const dock = document.getElementById('entity-dock');
    const iconEl = document.getElementById('dock-icon');
    const title = document.getElementById('dock-title');
    const sub = document.getElementById('dock-subtitle');
    const shelf = document.getElementById('dock-actions-shelf');

    if (iconEl) iconEl.innerText = '🏛️';
    title.innerText = `Město ${city.name} (Úr. ${city.level})`;
    sub.innerText = `Růst: ${city.progress}/${city.progressMax} • Příjem: +${city.income} ⭐/tah`;

    const scene = game.scene.getScene('PolytropiaScene');
    const garrisonUnit = scene.units.find(u => u.gx === city.gx && u.gy === city.gy && u.owner === G.activeFaction);

    let garrisonHtml = '';
    if (garrisonUnit) {
        garrisonHtml = `
            <div class="garrison-banner" onpointerdown="event.stopPropagation()" onclick="selectGarrisonUnit(${garrisonUnit.id})">
                <span>🛡️ Posádka: <strong>${UNIT_TYPES[garrisonUnit.type].name}</strong> (${garrisonUnit.hp}/${garrisonUnit.maxHp} HP)</span>
                <button type="button" class="btn-garrison">OVLÁDAT JEDNOTKU</button>
            </div>
        `;
    }

    const techs = G.factions[G.activeFaction].techs;
    let stargateProjectHtml = '';

    // Projekt Hvězdné Brány pro Vědecké Vítězství
    if (techs.includes('stargate') && city.isCapital) {
        if (!G.stargateProject) {
            const ownedCitiesCount = scene ? scene.cities.filter(c => c.owner === G.activeFaction).length : 1;
            const canAfford = facStars >= 50;
            const hasCities = ownedCitiesCount >= 2;
            const canBuild = canAfford && hasCities;

            let btnText = '🌌 Zahájit Stavbu Hvězdné Brány';
            if (!hasCities) {
                btnText = `🌌 Hvězdná Brána (Nutná 2+ města: ${ownedCitiesCount}/2)`;
            }

            stargateProjectHtml = `
                <button type="button" class="action-chip ${!canBuild ? 'disabled' : ''}" style="background:linear-gradient(135deg, #4f46e5, #9333ea); border-color:#c084fc; font-weight:800;" onpointerdown="event.stopPropagation()" onclick="startStargateProject(${city.id})">
                    <span>${btnText}</span> <span class="cost">(50 ⭐)</span>
                </button>
            `;
        } else {
            stargateProjectHtml = `
                <button type="button" class="action-chip" style="background:#312e81; border-color:#818cf8; cursor:default;" onpointerdown="event.stopPropagation()">
                    <span>⚡ Hvězdná Brána: Nabíjení (${G.stargateProject.turnsLeft} tahů do vítězství)</span>
                </button>
            `;
        }
    }

    const isCoastal = scene ? [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
        { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
    ].some(off => {
        const tx = city.gx + off.dx;
        const ty = city.gy + off.dy;
        return tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize && scene.map[tx][ty].biome === 'water';
    }) : false;

    const facStars = G.factions[G.activeFaction].stars;
    shelf.innerHTML = `
        ${garrisonHtml}
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:6px;">
            ${stargateProjectHtml}
            <button type="button" class="action-chip ${facStars < 3 ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="trainUnitInCity('warrior', ${city.id})">
                <span>🗡️ Válečník</span> <span class="cost">(3 ⭐)</span>
            </button>
            <button type="button" class="action-chip ${facStars < 7 ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="trainUnitInCity('settler', ${city.id})">
                <span>⛺ Osadník</span> <span class="cost">(7 ⭐)</span>
            </button>
            ${techs.includes('archery') ? `
                <button type="button" class="action-chip ${facStars < 5 ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="trainUnitInCity('archer', ${city.id})">
                    <span>🏹 Lučištník</span> <span class="cost">(5 ⭐)</span>
                </button>
            ` : ''}
            ${techs.includes('smithing') ? `
                <button type="button" class="action-chip ${facStars < 8 ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="trainUnitInCity('knight', ${city.id})">
                    <span>🐎 Rytíř</span> <span class="cost">(8 ⭐)</span>
                </button>
            ` : ''}
            ${techs.includes('siege') ? `
                <button type="button" class="action-chip ${facStars < 9 ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="trainUnitInCity('catapult', ${city.id})">
                    <span>💣 Katapult</span> <span class="cost">(9 ⭐)</span>
                </button>
            ` : ''}
            ${(isCoastal && techs.includes('sailing')) ? `
                <button type="button" class="action-chip ${facStars < 5 ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="trainUnitInCity('boat', ${city.id})">
                    <span>⛵ Válečný Člun</span> <span class="cost">(5 ⭐)</span>
                </button>
            ` : ''}
            ${(isCoastal && techs.includes('navigation')) ? `
                <button type="button" class="action-chip ${facStars < 12 ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="trainUnitInCity('battleship', ${city.id})">
                    <span>🚢 Bitevní Koráb</span> <span class="cost">(12 ⭐)</span>
                </button>
            ` : ''}
            <button type="button" class="action-chip ${facStars < 5 ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="improveCityFarmland(${city.id})">
                <span>🌾 Založit Farmu</span> <span class="cost">(5 ⭐)</span>
            </button>
            <button type="button" class="action-chip ${(!techs.includes('mining') || facStars < 6) ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="buildMountainMine(${city.id})">
                <span>⛏️ Postavit Důl</span> <span class="cost">${techs.includes('mining') ? '(6 ⭐)' : '🔒 (vyžaduje Hornictví)'}</span>
            </button>
            ${techs.includes('fortification') && !city.hasWalls ? `
                <button type="button" class="action-chip ${facStars < 8 ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="buildCityWalls(${city.id})">
                    <span>🏰 Postavit Hradby</span> <span class="cost">(8 ⭐)</span>
                </button>
            ` : ''}
            ${techs.includes('roads') ? `
                <button type="button" class="action-chip ${facStars < 2 ? 'disabled' : ''}" onpointerdown="event.stopPropagation()" onclick="buildRoadAtCity(${city.id})">
                    <span>🛤️ Dláždit Cestu</span> <span class="cost">(2 ⭐)</span>
                </button>
            ` : ''}
        </div>
    `;

    dock.classList.remove('hidden');
}

function closeDock() {
    document.getElementById('entity-dock').classList.add('hidden');
    G.selectedEntity = null;
}

window.selectGarrisonUnit = function(unitId) {
    const scene = game.scene.getScene('PolytropiaScene');
    const u = scene.units.find(x => x.id === unitId);
    if (u) scene.selectUnit(u);
};

window.trainUnitInCity = function(type, cityId) {
    const cost = UNIT_TYPES[type].cost;
    const currentFac = G.factions[G.activeFaction];
    if (currentFac.stars < cost) {
        showToast(`❌ Nedostatek Hvězd ⭐ na výcvik (potřeba ${cost} ⭐)!`);
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);
    if (!city) return;

    let spawnX = city.gx;
    let spawnY = city.gy;
    const hasGarrison = scene.units.some(u => u.gx === city.gx && u.gy === city.gy);

    const offsets = [
        { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 },
        { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 },
        { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 }, { dx: 0, dy: -2 },
        { dx: 2, dy: 1 }, { dx: 1, dy: 2 }, { dx: -2, dy: 1 }, { dx: 1, dy: -2 }
    ];

    // Výcvik lodí - hledáme přilehlé vodní pole
    if (type === 'boat' || type === 'battleship') {
        let foundWater = false;
        for (let off of offsets) {
            const tx = city.gx + off.dx;
            const ty = city.gy + off.dy;
            if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
                const occ = scene.units.some(u => u.gx === tx && u.gy === ty);
                if (scene.map[tx][ty].biome === 'water' && !occ) {
                    spawnX = tx;
                    spawnY = ty;
                    foundWater = true;
                    break;
                }
            }
        }
        if (!foundWater) {
            showToast('⚠️ V okolí přístavu není žádné volné vodní pole pro spuštění lodi!');
            return;
        }
    }
    // Pozemní jednotky: Pokud v městě již stojí posádka (nebo jde o Osadníka), spawnuj kolem města
    else if (hasGarrison || type === 'settler') {
        let foundSpot = false;

        // 1. Průchod: Hledej volné políčko bez jednotky a bez města
        for (let off of offsets) {
            const tx = city.gx + off.dx;
            const ty = city.gy + off.dy;
            if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
                const occ = scene.units.some(u => u.gx === tx && u.gy === ty);
                const hasCityHere = scene.cities.some(c => c.gx === tx && c.gy === ty);
                const isWater = scene.map[tx][ty].biome === 'water';
                const isMountain = scene.map[tx][ty].biome === 'mountain';
                if (!occ && !hasCityHere && !isWater && !isMountain) {
                    spawnX = tx;
                    spawnY = ty;
                    foundSpot = true;
                    break;
                }
            }
        }

        // 2. Fallback: Pokud je v těsném sousedství překážka, uprav nejbližší volné políčko na louku
        if (!foundSpot) {
            for (let off of offsets) {
                const tx = city.gx + off.dx;
                const ty = city.gy + off.dy;
                if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
                    const occ = scene.units.some(u => u.gx === tx && u.gy === ty);
                    const hasCityHere = scene.cities.some(c => c.gx === tx && c.gy === ty);
                    if (!occ && !hasCityHere) {
                        scene.map[tx][ty].biome = 'plain';
                        scene.renderMapTiles();
                        spawnX = tx;
                        spawnY = ty;
                        foundSpot = true;
                        break;
                    }
                }
            }
        }

        // 3. Pokud je volné aspoň samotné město
        if (!foundSpot && !hasGarrison) {
            spawnX = city.gx;
            spawnY = city.gy;
            foundSpot = true;
        }

        if (!foundSpot) {
            showToast('⚠️ V městě i v širokém okolí je plno! Posuň nejprve jednotky.');
            return;
        }
    }

    currentFac.stars -= cost;
    const newUnit = {
        id: Date.now() + Math.random(),
        owner: G.activeFaction,
        type: type,
        gx: spawnX,
        gy: spawnY,
        hp: UNIT_TYPES[type].hp,
        maxHp: UNIT_TYPES[type].maxHp,
        moved: false,
        attacked: false,
        kills: 0,
        isVeteran: false
    };

    scene.units.push(newUnit);
    SFX.play('level_up');
    const spawnLoc = (spawnX === city.gx && spawnY === city.gy) ? 'v městě' : `na poli [${spawnX}, ${spawnY}]`;
    showToast(`⛺ Naverbován nový ${UNIT_TYPES[type].name} (${spawnLoc})! Klikni na zelené kruhy pro pohyb.`);

    scene.renderUnits();
    updateHUD();
    renderMinimap();
    // Automaticky vyber nově naverbovanou jednotku, aby hráč ihned viděl Osadníka a zelené kruhy pohybu!
    scene.selectUnit(newUnit);
};

window.healSelectedUnit = function() {
    if (!G.selectedEntity || G.selectedEntity.type !== 'unit') return;
    const u = G.selectedEntity.data;

    if (u.moved && u.attacked) {
        showToast('⚠️ Jednotka již v tomto tahu provedla všechny akce.');
        return;
    }

    u.hp = Math.min(u.maxHp, u.hp + 3);
    u.moved = true;
    u.attacked = true;
    SFX.play('level_up');
    showToast(`❤️ Jednotka odpočívá a vyléčila se na ${u.hp}/${u.maxHp} HP.`);

    const scene = game.scene.getScene('PolytropiaScene');
    scene.renderUnits();
    scene.clearTileHighlights();
    openUnitDock(u);
};

window.foundNewCityWithSettler = function(unitId) {
    const scene = game.scene.getScene('PolytropiaScene');
    let u = null;
    if (unitId) {
        u = scene.units.find(x => x.id === unitId);
    }
    if (!u && G.selectedEntity && G.selectedEntity.type === 'unit') {
        u = G.selectedEntity.data;
    }
    if (!u || u.type !== 'settler') {
        showToast('⚠️ Nejprve vyber Osadníka!');
        return;
    }

    let alreadyCity = scene.cities.some(c => c.gx === u.gx && c.gy === u.gy);
    if (alreadyCity) {
        showToast('⚠️ V tomto městě již město stojí! Pohni Osadníkem o kousek dál do volné krajiny.');
        return;
    }

    const tile = scene.map[u.gx][u.gy];
    tile.biome = 'plain';
    tile.hasRuins = false;
    tile.isTribe = false;

    // Remove settler unit
    scene.units = scene.units.filter(x => x !== u);

    const activeFac = G.factions[G.activeFaction];
    const cityBaseIncome = 3 + (activeFac.techs.includes('philosophy') ? 3 : 0);
    const newCity = {
        id: Date.now(),
        name: `Nové ${activeFac.name} ${scene.cities.filter(c => c.owner === G.activeFaction).length + 1}`,
        owner: G.activeFaction,
        level: 1,
        progress: 0,
        progressMax: 2,
        income: cityBaseIncome,
        gx: u.gx,
        gy: u.gy,
        hasWalls: false,
        isCapital: false
    };

    scene.cities.push(newCity);
    G.score += 100;
    SFX.play('level_up');
    triggerConfetti(scene, (newCity.gx - newCity.gy) * (scene.tileW / 2), (newCity.gx + newCity.gy) * (scene.tileH / 2));
    showToast(`🎉 Založeno nové město: ${newCity.name}!`);

    scene.revealFogAround(newCity.gx, newCity.gy, 3);
    scene.renderMapTiles();
    scene.renderCities();
    scene.renderUnits();
    updateHUD();
    renderMinimap();
    closeDock();
    scene.selectCity(newCity);
};

window.improveCityFarmland = function(cityId) {
    const curFac = G.factions[G.activeFaction];
    if (curFac.stars < 5) {
        showToast('❌ Nedostatek Hvězd na založení farmy (potřeba 5 ⭐)!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);
    if (!city) return;

    // Hledání přilehlé louky nebo lesa pro farmu (v dosahu 1 i 2)
    // Přednostně volná odhalená pole bez jednotek a bez ruin/měst
    let targetPlain = null;
    const offsets = [
        { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 },
        { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 },
        { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 }, { dx: 0, dy: -2 }
    ];

    // 1. Priorita: Odhalené pole bez jednotek
    for (let off of offsets) {
        const tx = city.gx + off.dx;
        const ty = city.gy + off.dy;
        if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
            const tile = scene.map[tx][ty];
            const hasOtherCity = scene.cities.some(c => c.gx === tx && c.gy === ty);
            const hasUnit = scene.units.some(u => u.gx === tx && u.gy === ty);
            if (!hasOtherCity && !tile.hasFarm && !hasUnit && (tile.biome === 'plain' || tile.biome === 'forest')) {
                targetPlain = tile;
                break;
            }
        }
    }

    // 2. Druhá šance: Jakékoliv pole bez farmy a bez města
    if (!targetPlain) {
        for (let off of offsets) {
            const tx = city.gx + off.dx;
            const ty = city.gy + off.dy;
            if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
                const tile = scene.map[tx][ty];
                const hasOtherCity = scene.cities.some(c => c.gx === tx && c.gy === ty);
                if (!hasOtherCity && !tile.hasFarm && (tile.biome === 'plain' || tile.biome === 'forest')) {
                    targetPlain = tile;
                    break;
                }
            }
        }
    }

    // 3. Fallback: Pokud je vše obsazeno, uprav jedno sousední políčko
    if (!targetPlain) {
        for (let off of offsets) {
            const tx = city.gx + off.dx;
            const ty = city.gy + off.dy;
            if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
                const tile = scene.map[tx][ty];
                const hasOtherCity = scene.cities.some(c => c.gx === tx && c.gy === ty);
                if (!hasOtherCity && !tile.hasFarm) {
                    targetPlain = tile;
                    break;
                }
            }
        }
    }

    if (!targetPlain) {
        showToast('⚠️ V okolí města není žádné vhodné místo pro farmu!');
        return;
    }

    curFac.stars -= 5;
    const wasForest = targetPlain.biome === 'forest';
    targetPlain.biome = 'plain';
    targetPlain.hasFarm = true;
    city.progress += 1;
    G.score += 35;

    // Pokud byl na poli les nebo jiný biom, překresli dlaždice
    if (wasForest) {
        scene.renderMapTiles();
    }

    const sx = (targetPlain.gx - targetPlain.gy) * (scene.tileW / 2);
    const sy = (targetPlain.gx + targetPlain.gy) * (scene.tileH / 2);
    const fOverlay = scene.add.image(sx, sy, 'feat_farm').setOrigin(0.5, 0.5);
    scene.featureLayer.add(fOverlay);

    if (city.progress >= city.progressMax) {
        city.progress = 0;
        city.level += 1;
        city.progressMax += 1;
        city.income += 2;
        SFX.play('level_up');
        showToast(`🎉 MĚSTO ${city.name} POSTOUPILO NA ÚROVEŇ ${city.level}! +2 ⭐ příjem!`);
        triggerConfetti(scene, (city.gx - city.gy) * (scene.tileW / 2), (city.gx + city.gy) * (scene.tileH / 2));
    } else {
        showToast(`🌾 Farma postavena na [${targetPlain.gx}, ${targetPlain.gy}]! Pokrok města: ${city.progress}/${city.progressMax}`);
    }

    scene.renderCities();
    updateHUD();
    openCityDock(city);
};

window.buildMountainMine = function(cityId) {
    const curFac = G.factions[G.activeFaction];
    if (!curFac.techs.includes('mining')) {
        showToast('🔒 Nejprve musíš vyzkoumat technologii Hornictví (Mining) ve Stromu Vědy!');
        return;
    }
    if (curFac.stars < 6) {
        showToast('❌ Nedostatek Hvězd na vybudování dolu (potřeba 6 ⭐)!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);
    if (!city) return;

    let targetMountain = null;
    const offsets = [
        { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 },
        { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 },
        { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 }, { dx: 0, dy: -2 }
    ];

    for (let off of offsets) {
        const tx = city.gx + off.dx;
        const ty = city.gy + off.dy;
        if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
            const tile = scene.map[tx][ty];
            if (tile.biome === 'mountain' && !tile.hasMine) {
                targetMountain = tile;
                break;
            }
        }
    }

    // Fallback: Pokud v okolí města hora chybí, vytvoř z jednoho vzdálenějšího pole horu s dolem!
    if (!targetMountain) {
        for (let off of offsets) {
            const tx = city.gx + off.dx;
            const ty = city.gy + off.dy;
            if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
                const tile = scene.map[tx][ty];
                const hasOtherCity = scene.cities.some(c => c.gx === tx && c.gy === ty);
                if (!hasOtherCity && !tile.hasFarm && !tile.hasMine) {
                    tile.biome = 'mountain';
                    targetMountain = tile;
                    scene.renderMapTiles();
                    break;
                }
            }
        }
    }

    if (!targetMountain) {
        showToast('⚠️ V okolí města není žádné vhodné místo pro důl!');
        return;
    }

    curFac.stars -= 6;
    targetMountain.hasMine = true;
    city.income += 3;
    G.score += 45;

    const sx = (targetMountain.gx - targetMountain.gy) * (scene.tileW / 2);
    const sy = (targetMountain.gx + targetMountain.gy) * (scene.tileH / 2);
    const mOverlay = scene.add.image(sx, sy - 4, 'feat_mine').setOrigin(0.5, 0.7);
    scene.featureLayer.add(mOverlay);

    SFX.play('level_up');
    showToast(`⛏️ Zlatý důl zprovozněn na [${targetMountain.gx}, ${targetMountain.gy}]! Příjem města: +3 ⭐/tah.`);
    updateHUD();
    openCityDock(city);
};

window.buildCityWalls = function(cityId) {
    const curFac = G.factions[G.activeFaction];
    if (curFac.stars < 8) {
        showToast('❌ Nedostatek Hvězd na vybudování hradeb (potřeba 8 ⭐)!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);
    if (!city || city.hasWalls) return;

    curFac.stars -= 8;
    city.hasWalls = true;
    G.score += 50;

    SFX.play('level_up');
    showToast(`🏰 Kamenné hradby města ${city.name} byly dokončeny! (+4 k obraně posádky).`);

    scene.renderCities();
    updateHUD();
    openCityDock(city);
};

window.buildRoadAtCity = function(cityId) {
    const curFac = G.factions[G.activeFaction];
    if (curFac.stars < 2) {
        showToast('❌ Nedostatek Hvězd na dláždění silnice (potřeba 2 ⭐)!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);
    if (!city) return;

    const alreadyRoad = G.roads.some(r => r.gx === city.gx && r.gy === city.gy);
    if (alreadyRoad) {
        showToast('⚠️ Na náměstí města již silnice stojí!');
        return;
    }

    curFac.stars -= 2;
    G.roads.push({ gx: city.gx, gy: city.gy });
    scene.renderRoads();
    updateHUD();
    openCityDock(city);
    SFX.play('move');
    showToast('🛤️ Městská cesta byla vydlážděna!');
};

window.startStargateProject = function(cityId) {
    const curFac = G.factions[G.activeFaction];
    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene ? scene.cities.find(c => c.id === cityId) : null;
    if (!city) return;

    if (!curFac.techs.includes('stargate')) {
        showToast('❌ Nejprve musíš vyzkoumat technologii Hvězdná Brána!');
        return;
    }

    const ownedCities = scene.cities.filter(c => c.owner === G.activeFaction);
    if (ownedCities.length < 2) {
        showToast('❌ Pro výstavbu Hvězdné brány musí tvá civilizace ovládat alespoň 2 města!');
        return;
    }

    if (curFac.stars < 50) {
        showToast('❌ Na zahájení Hvězdné brány potřebuješ 50 ⭐ Hvězd!');
        return;
    }

    curFac.stars -= 50;
    G.stargateProject = { cityId, turnsLeft: 5 };
    G.score += 250;

    SFX.play('level_up');
    triggerConfetti(scene, (city.gx - city.gy) * (scene.tileW / 2), (city.gx + city.gy) * (scene.tileH / 2));

    // PLANETÁRNÍ KRIZE (Endgame event)
    showToast('⚠️ PLANETÁRNÍ KRIZE: Všechny frakce vyhlásily válku, aby zastavily aktivaci Hvězdné Brány!');

    // Všechny ostatní frakce okamžitě zruší mírové pakty a vstoupí do války
    Object.keys(G.factions).forEach(fKey => {
        if (fKey !== G.activeFaction) {
            G.factions[fKey].status = 'war';
            if (G.factions[fKey].hasTradePact) {
                G.factions[fKey].hasTradePact = false;
                curFac.bonusIncome = Math.max(0, (curFac.bonusIncome || 0) - 2);
            }
        }
    });

    scene.renderCities();
    updateHUD();
    openCityDock(city);
};

// --- RUINS DISCOVERY EVENTS ---
function triggerRuinEventChoice() {
    const modal = document.getElementById('ruins-modal');
    const choices = document.getElementById('ruins-choices');

    choices.innerHTML = `
        <button class="choice-btn" onclick="resolveRuinChoice('gold')">💰 Vybrat Truhlici Zlata (+18 ⭐ Hvězd)</button>
        <button class="choice-btn" onclick="resolveRuinChoice('veteran')">🛡️ Probudit Spícího Rytíře (Získáte Rytíře)</button>
        <button class="choice-btn" onclick="resolveRuinChoice('tech')">🔬 Přečíst Prastarý Svitek (+1 Náhodná Technologie)</button>
    `;

    modal.classList.remove('hidden');
}

window.resolveRuinChoice = function(choice) {
    const modal = document.getElementById('ruins-modal');
    modal.classList.add('hidden');

    const scene = game.scene.getScene('PolytropiaScene');
    SFX.play('level_up');
    const curFac = G.factions[G.activeFaction];

    if (choice === 'gold') {
        curFac.stars += 18;
        G.score += 80;
        showToast('💰 V ruinách byl nalezen zlatý poklad! +18 ⭐ Hvězd.');
    } else if (choice === 'veteran') {
        const u = G.selectedEntity && G.selectedEntity.data;
        const startC = scene.cities.find(c => c.owner === G.activeFaction) || scene.cities[0];
        const originX = u ? u.gx : (startC ? startC.gx : 0);
        const originY = u ? u.gy : (startC ? startC.gy : 0);
        let spawnX = originX;
        let spawnY = originY;
        const offsets = [
            { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 },
            { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
        ];
        for (let off of offsets) {
            const tx = originX + off.dx;
            const ty = originY + off.dy;
            if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
                const occ = scene.units.some(un => un.gx === tx && un.gy === ty);
                const isWater = scene.map[tx][ty].biome === 'water';
                if (!occ && !isWater) {
                    spawnX = tx;
                    spawnY = ty;
                    break;
                }
            }
        }
        scene.units.push({
            id: Date.now(),
            owner: G.activeFaction,
            type: 'knight',
            gx: spawnX,
            gy: spawnY,
            hp: 14,
            maxHp: 14,
            moved: false,
            attacked: false,
            kills: 2,
            isVeteran: true
        });
        G.score += 90;
        showToast(`🐎 Probuzen starověký Rytíř veterán na [${spawnX}, ${spawnY}]!`);
        scene.renderUnits();
    } else if (choice === 'tech') {
        const unlearned = Object.keys(TECH_TREE).filter(t => !curFac.techs.includes(t));
        if (unlearned.length > 0) {
            // Náhodná technologie z těch, které mají splněné prerekvizity
            const available = unlearned.filter(t => {
                const reqs = TECH_TREE[t].req || [];
                return reqs.every(r => curFac.techs.includes(r));
            });
            const pool = available.length > 0 ? available : unlearned;
            const won = pool[Math.floor(Math.random() * pool.length)];
            curFac.techs.push(won);
            G.score += 100;
            showToast(`🔬 Nález svitků! Získána technologie: ${TECH_TREE[won].name}!`);
        }
    }

    updateHUD();
    renderMinimap();
};

// --- DIPLOMACY MODAL ---
function renderDiplomacyModal() {
    const list = document.getElementById('diplo-list');
    list.innerHTML = '';

    const rivals = Object.keys(G.factions).filter(f => f !== G.activeFaction);
    rivals.forEach(fKey => {
        const f = G.factions[fKey];
        const scene = game.scene.getScene('PolytropiaScene');
        const citiesCount = scene.cities.filter(c => c.owner === fKey).length;
        const unitsCount = scene.units.filter(u => u.owner === fKey).length;

        const card = document.createElement('div');
        card.className = 'diplo-card';
        card.style.borderColor = f.cssColor;

        card.innerHTML = `
            <div class="diplo-badge" style="background:${f.cssColor}; font-size:24px; padding:6px 10px; border-radius:10px;">${f.crest}</div>
            <div class="diplo-info">
                <div class="diplo-name">${f.name}</div>
                <div class="diplo-status">Stav: <strong>${f.status === 'war' ? '⚔️ VÁLKA' : '🕊️ MÍR'}</strong></div>
                <div style="font-size:11px; color:#94a3b8; margin-top:4px;">
                    Města: ${citiesCount} • Armáda: ${unitsCount} jednotek
                </div>
            </div>
            <div class="diplo-actions">
                ${f.status === 'war' ? `
                    <button class="diplo-btn pact-btn ${G.stargateProject ? 'disabled' : ''}" onclick="proposePeace('${fKey}')" ${G.stargateProject ? 'disabled title="Během Planetární krize nelze uzavřít mír!"' : ''}>🕊️ Nabídnout Mír (6 ⭐)</button>
                ` : `
                    <button class="diplo-btn war-btn" onclick="declareWar('${fKey}')">⚔️ Vyhlásit Válku</button>
                    ${f.hasTradePact ? `
                        <div class="diplo-btn pact-btn" style="background:#064e3b; border-color:#059669; cursor:default; opacity:0.9;">✅ Aktivní Pakt (+2 ⭐/tah)</div>
                    ` : `
                        <button class="diplo-btn pact-btn" onclick="signTradePact('${fKey}')">📜 Obchodní Pakt (+2 ⭐/tah)</button>
                    `}
                `}
            </div>
        `;

        list.appendChild(card);
    });
}

window.declareWar = function(fKey) {
    G.factions[fKey].status = 'war';
    if (G.factions[fKey].hasTradePact) {
        G.factions[fKey].hasTradePact = false;
        const curFac = G.factions[G.activeFaction];
        curFac.bonusIncome = Math.max(0, (curFac.bonusIncome || 0) - 2);
    }
    SFX.play('attack');
    showToast(`⚔️ VYHLÁŠENA VÁLKA FRAKCI ${G.factions[fKey].name.toUpperCase()}!`);
    updateHUD();
    renderDiplomacyModal();
};

window.proposePeace = function(fKey) {
    if (G.stargateProject) {
        showToast('⚠️ Během aktivace Hvězdné Brány odmítají ostatní civilizace jakýkoliv mír!');
        return;
    }
    const curFac = G.factions[G.activeFaction];
    if (curFac.stars < 6) {
        showToast('❌ Nedostatek Hvězd na mírové poselství (potřeba 6 ⭐)!');
        return;
    }
    curFac.stars -= 6;
    G.factions[fKey].status = 'peace';
    SFX.play('level_up');
    showToast(`🕊️ MÍR UZAVŘEN: Frakce ${G.factions[fKey].name} přijala mírové poselství.`);
    updateHUD();
    renderDiplomacyModal();
};

window.signTradePact = function(fKey) {
    const curFac = G.factions[G.activeFaction];
    if (G.factions[fKey].hasTradePact) {
        showToast('⚠️ S touto frakcí již máš aktivní obchodní pakt!');
        return;
    }
    if (curFac.stars < 4) {
        showToast('❌ Nedostatek Hvězd na založení paktu (potřeba 4 ⭐)!');
        return;
    }
    curFac.stars -= 4;
    curFac.bonusIncome = (curFac.bonusIncome || 0) + 2;
    G.factions[fKey].hasTradePact = true;
    SFX.play('level_up');
    showToast(`📜 OBCHODNÍ PAKT PODEPSÁN s ${G.factions[fKey].name}! Trvalý příjem +2 ⭐/tah.`);
    updateHUD();
    renderDiplomacyModal();
};

// --- PROGRESSIVE TECH TREE INTERACTION ---
function renderTechTree() {
    const grid = document.getElementById('tech-grid');
    grid.innerHTML = '';
    const curFac = G.factions[G.activeFaction];

    const tiers = [
        { id: 1, name: 'Tier I: Základní Objevy (Kořeny Stromu)' },
        { id: 2, name: 'Tier II: Specializace & Vojenství (Větve)' },
        { id: 3, name: 'Tier III: Vrcholná Věda & Transcendens (Koruna)' }
    ];

    tiers.forEach(tier => {
        const tierSection = document.createElement('div');
        tierSection.className = 'tech-tier-section';
        tierSection.style.gridColumn = '1 / -1';
        tierSection.innerHTML = `
            <div class="tech-tier-header">
                <span>${tier.name}</span>
            </div>
        `;
        grid.appendChild(tierSection);

        for (let key in TECH_TREE) {
            const t = TECH_TREE[key];
            if (t.tier !== tier.id) continue;

            const isUnlocked = curFac.techs.includes(key);
            const canUnlock = t.req.every(r => curFac.techs.includes(r));
            const isLocked = !isUnlocked && !canUnlock;

            const node = document.createElement('div');
            node.className = `tech-node ${isUnlocked ? 'unlocked' : (isLocked ? 'locked' : '')}`;

            let reqHtml = '';
            if (t.req.length > 0 && !isUnlocked) {
                const missingReqs = t.req.filter(r => !curFac.techs.includes(r));
                if (missingReqs.length > 0) {
                    const reqNames = missingReqs.map(r => TECH_TREE[r].name).join(', ');
                    reqHtml = `<div class="tech-req-badge">🔒 Vyžaduje: ${reqNames}</div>`;
                }
            }

            node.innerHTML = `
                <div class="tech-icon">${t.icon}</div>
                <div class="tech-details">
                    <div class="tech-title">${t.name}</div>
                    <div class="tech-desc">${t.desc}</div>
                    ${reqHtml}
                    <div class="tech-cost">${isUnlocked ? '✅ VYZKOUMÁNO' : `Cena: ${t.cost} ⭐`}</div>
                </div>
            `;

            if (!isUnlocked) {
                node.onclick = () => unlockTechnology(key);
            }

            grid.appendChild(node);
        }
    });
}

function unlockTechnology(techKey) {
    const t = TECH_TREE[techKey];
    const curFac = G.factions[G.activeFaction];

    // Kontrola prerekvizit
    const missingReqs = t.req.filter(r => !curFac.techs.includes(r));
    if (missingReqs.length > 0) {
        const reqNames = missingReqs.map(r => TECH_TREE[r].name).join(', ');
        showToast(`🔒 Technologie je zamčená! Nejprve musíš vyzkoumat: ${reqNames}!`);
        return;
    }

    if (curFac.stars < t.cost) {
        showToast('❌ Nemáš dostatek Hvězd ⭐ na výzkum této technologie!');
        return;
    }

    curFac.stars -= t.cost;
    curFac.techs.push(techKey);
    G.score += 50;

    SFX.play('level_up');
    showToast(`🔬 TECHNOLOGIE OBJEVENÁ: ${t.name}!`);

    if (techKey === 'philosophy') {
        const scene = game.scene.getScene('PolytropiaScene');
        if (scene && scene.cities) {
            scene.cities.filter(c => c.owner === G.activeFaction).forEach(c => {
                c.income += 3;
            });
        }
        showToast('📜 FILOZOFIE OSVÍCENÍ! Všechna tvá města získala trvalý bonus +3 ⭐/tah k příjmu!');
    }

    if (techKey === 'stargate') {
        showToast('🌌 TECHNOLOGIE HVĚZDNÉ BRÁNY OBJEVENA! Nyní můžeš v hlavním městě zahájit stavbu Velkého Projektu.');
    }

    renderTechTree();
    updateHUD();
}

// --- VÝPOČET REÁLNÉHO PŘÍJMU FRAKCE ZA KOLO (Města, Bonusy, Obchodní pakty) ---
function getFactionIncome(factionKey) {
    const scene = (typeof game !== 'undefined' && game.scene) ? game.scene.getScene('PolytropiaScene') : null;
    const fac = G.factions[factionKey];
    if (!fac) return 0;
    let total = 0;
    if (scene && scene.cities) {
        scene.cities.filter(c => c.owner === factionKey).forEach(c => {
            total += (c.income || 0);
        });
    } else {
        total = fac.income || 4;
    }
    if (fac.bonusIncome) {
        total += fac.bonusIncome;
    }
    // Frakční bonus Solaria: +1 ⭐ z každého ovládaného města
    if (factionKey === 'solaria') {
        const cityCount = (scene && scene.cities) ? scene.cities.filter(c => c.owner === factionKey).length : 1;
        total += cityCount;
    }
    return Math.max(1, total);
}

// --- TURN SIMULATION & MULTIPLAYER / HOTSEAT LOGIC ---
function executeEndTurn() {
    if (G.gameOver) return;
    const scene = game.scene.getScene('PolytropiaScene');

    // 1. REŽIM HOTSEAT MULTIPLAYER (Pass & Play)
    if (G.gameMode === 'passplay') {
        const order = G.passPlayFactions;
        const curIdx = order.indexOf(G.activeFaction);
        const nextIdx = (curIdx + 1) % order.length;
        const nextFacKey = order[nextIdx];

        // Pokud jsme dokončili celé kolo (všichni hráči zahráli), navyš turn a přičti příjmy
        if (nextIdx === 0) {
            G.turn += 1;
            // Výběr reálných příjmů pro všechny frakce (včetně paktů a technologií)
            Object.keys(G.factions).forEach(fKey => {
                G.factions[fKey].stars += getFactionIncome(fKey);
            });

            // Postup Hvězdné Brány
            if (G.stargateProject) {
                const capCity = scene.cities.find(c => c.id === G.stargateProject.cityId);
                if (!capCity) {
                    G.stargateProject = null;
                } else {
                    G.stargateProject.turnsLeft -= 1;
                    if (G.stargateProject.turnsLeft <= 0) {
                        showVictoryScreen(`🌌 Vědecké Vítězství! Hráč ${G.factions[capCity.owner].name} aktivoval Hvězdnou Bránu!`);
                        return;
                    }
                }
            }

            // AI tah pro frakce, které neřídí živí hráči
            const aiFactions = Object.keys(G.factions).filter(f => !order.includes(f));
            aiFactions.forEach(fKey => {
                executeAIFactionTurn(scene, fKey);
            });
        }

        // Přepni aktivní frakci
        G.activeFaction = nextFacKey;

        // Reset jednotek nové aktivní frakce
        scene.units.forEach(u => {
            if (u.owner === G.activeFaction) {
                u.moved = false;
                u.attacked = false;
            }
        });

        // Automatické přepnutí mlhy pro aktuálního hráče
        recalculateFogForActiveFaction(scene);

        scene.renderUnits();
        scene.renderCities();
        scene.clearTileHighlights();
        closeDock();
        updateHUD();
        renderMinimap();

        // Vyber první město nového hráče
        const playerCity = scene.cities.find(c => c.owner === G.activeFaction);
        if (playerCity) {
            scene.selectCity(playerCity);
            // Center camera
            const targetSx = (playerCity.gx - playerCity.gy) * (scene.tileW / 2);
            const targetSy = (playerCity.gx + playerCity.gy) * (scene.tileH / 2);
            scene.tweens.add({
                targets: scene.world,
                x: scene.scale.width / 2 - targetSx,
                y: scene.scale.height / 2 - targetSy,
                duration: 300,
                ease: 'Power2'
            });
        }

        // Zobraz Splash předání zařízení
        showHotseatSplash(nextFacKey);
        scene.checkVictoryConditions();
        return;
    }

    // 2. REŽIM SINGLEPLAYER (Proti AI)
    G.turn += 1;

    // Příjem pro všechny frakce (města, technologie, pakty)
    Object.keys(G.factions).forEach(fKey => {
        G.factions[fKey].stars += getFactionIncome(fKey);
    });

    // Reset tahů všech jednotek
    scene.units.forEach(u => {
        u.moved = false;
        u.attacked = false;
    });

    // Postup projektu Hvězdné Brány
    if (G.stargateProject) {
        const capCity = scene.cities.find(c => c.id === G.stargateProject.cityId);
        if (!capCity || capCity.owner !== G.playerFaction) {
            G.stargateProject = null;
            showToast('❌ Hlavní město padlo! Výstavba Hvězdné brány byla zmařena.');
        } else {
            G.stargateProject.turnsLeft -= 1;
            if (G.stargateProject.turnsLeft <= 0) {
                showVictoryScreen('🌌 VELKOLEPÉ VĚDECKÉ VÍTĚZSTVÍ! Hvězdná Brána byla plně zprovozněna a tvá civilizace se povznesla mezi hvězdy.');
                return;
            } else {
                showToast(`⚡ Hvězdná Brána se nabíjí... Zbývá ${G.stargateProject.turnsLeft} tah(y) do vědeckého vítězství!`);
            }
        }
    }

    showToast(`⏳ ZAČAL TAH ${G.turn}. Suroviny byly vybrány!`);

    // Spusť AI tah pro všechny cizí frakce
    const rivals = Object.keys(G.factions).filter(f => f !== G.playerFaction);
    rivals.forEach(fKey => {
        executeAIFactionTurn(scene, fKey);
    });

    scene.renderUnits();
    scene.renderCities();
    scene.clearTileHighlights();
    closeDock();
    updateHUD();
    renderMinimap();

    scene.checkVictoryConditions();
}

function recalculateFogForActiveFaction(scene) {
    if (!G.factionExplored) G.factionExplored = {};
    if (!G.factionExplored[G.activeFaction]) {
        G.factionExplored[G.activeFaction] = [];
        for (let x = 0; x < G.gridSize; x++) {
            G.factionExplored[G.activeFaction][x] = [];
            for (let y = 0; y < G.gridSize; y++) {
                G.factionExplored[G.activeFaction][x][y] = false;
            }
        }
    }

    for (let x = 0; x < G.gridSize; x++) {
        for (let y = 0; y < G.gridSize; y++) {
            scene.fog[x][y] = !G.factionExplored[G.activeFaction][x][y];
        }
    }
    // Odkryj okolí měst a jednotek aktuální frakce
    scene.cities.filter(c => c.owner === G.activeFaction).forEach(c => {
        scene.revealFogAround(c.gx, c.gy, 2);
    });
    scene.units.filter(u => u.owner === G.activeFaction).forEach(u => {
        scene.revealFogAround(u.gx, u.gy, 2);
    });
}

function showHotseatSplash(factionKey) {
    const f = G.factions[factionKey];
    const splash = document.getElementById('hotseat-splash');
    const crest = document.getElementById('splash-crest');
    const title = document.getElementById('splash-title');
    const desc = document.getElementById('splash-desc');

    crest.innerText = f.crest;
    title.innerText = `NA TAHU: ${f.name.toUpperCase()}`;
    title.style.color = f.cssColor;
    desc.innerText = `Pedej zařízení hráči [${f.title}]. Klikni pro zahájení tahu.`;

    splash.classList.remove('hidden');
    SFX.play('level_up');
}

window.dismissHotseatSplash = function() {
    document.getElementById('hotseat-splash').classList.add('hidden');
};

// --- COMPREHENSIVE 4X AI SYSTEM ---
const AI_TECH_PATHS = {
    khardurn: ['smithing', 'fortification', 'farming', 'archery', 'siege', 'roads', 'philosophy', 'sailing', 'navigation', 'stargate'],
    aquaria: ['navigation', 'farming', 'archery', 'roads', 'mining', 'smithing', 'fortification', 'siege', 'philosophy', 'stargate'],
    sylvaen: ['farming', 'mining', 'smithing', 'siege', 'roads', 'fortification', 'philosophy', 'sailing', 'navigation', 'stargate'],
    solaria: ['roads', 'mining', 'fortification', 'smithing', 'archery', 'siege', 'philosophy', 'sailing', 'navigation', 'stargate']
};

function executeAIFactionTurn(scene, fKey) {
    const faction = G.factions[fKey];
    if (!faction) return;

    const aiCities = scene.cities.filter(c => c.owner === fKey);
    // Pokud frakce již nemá žádná města, nemůže pokračovat
    if (aiCities.length === 0) return;

    const aiUnits = scene.units.filter(u => u.owner === fKey);

    // Reset tahových akcí pro jednotky AI na začátku kola
    aiUnits.forEach(u => {
        u.moved = false;
        u.attacked = false;
    });

    // 1. AI TECHNOLOGICKÝ VÝZKUM (kontrola a nákup věd podle frakční identity)
    aiExecuteResearch(scene, fKey, faction);

    // 2. AI EKONOMICKÉ INVESTICE (stavba dolů, farem a hradeb)
    const mapChanged = aiExecuteEconomy(scene, fKey, faction);
    if (mapChanged) {
        scene.renderMapTiles();
    }

    // 3. AI NÁBOR JEDNOTEK (pokročilé jednotky podle technologií a pobřeží)
    aiExecuteRecruitment(scene, fKey, faction);

    // 4. AI TAKTIKA, LÉČENÍ, POHYB A BOJ (obrana vlastních měst a útok na slabá města)
    aiExecuteTactics(scene, fKey, faction);
}

function aiExecuteResearch(scene, fKey, faction) {
    const priorities = AI_TECH_PATHS[fKey] || AI_TECH_PATHS['solaria'];
    for (const techId of priorities) {
        if (!faction.techs.includes(techId)) {
            const tech = TECH_TREE[techId];
            if (!tech) continue;
            // Kontrola všech prerekvizit
            const hasReqs = tech.req.every(r => faction.techs.includes(r));
            if (hasReqs && faction.stars >= tech.cost) {
                // Výzkum technologie
                faction.stars -= tech.cost;
                faction.techs.push(techId);

                // Efekt Filozofie (+3 ⭐ příjem všech měst frakce)
                if (techId === 'philosophy') {
                    scene.cities.filter(c => c.owner === fKey).forEach(c => {
                        c.income = (c.income || 3) + 3;
                    });
                }

                // AI start Hvězdné Brány pokud vyzkoumala stargate a má 40+ ⭐ a projekt dosud neběží
                if (techId === 'stargate' && !G.stargateProject && faction.stars >= 40) {
                    const capCity = scene.cities.find(c => c.owner === fKey && c.isCapital) || scene.cities.find(c => c.owner === fKey);
                    if (capCity) {
                        faction.stars -= 40;
                        G.stargateProject = { cityId: capCity.id, turnsLeft: 3 };
                        showToast(`🌌 VAROVÁNÍ: Frakce ${faction.name} zahájila Projekt Hvězdné Brány v ${capCity.name}!`);
                    }
                }
                break; // Max 1 výzkum za kolo
            }
        }
    }
}

function aiExecuteEconomy(scene, fKey, faction) {
    let mapChanged = false;
    const aiCities = scene.cities.filter(c => c.owner === fKey);
    const offsets = [
        { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 },
        { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 },
        { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 }, { dx: 0, dy: -2 }
    ];

    aiCities.forEach(city => {
        // A. STAVBA DOLŮ (Hornictví 'mining', cena 6 ⭐)
        if (faction.techs.includes('mining') && faction.stars >= 6) {
            for (const off of offsets) {
                const tx = city.gx + off.dx;
                const ty = city.gy + off.dy;
                if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
                    const tile = scene.map[tx][ty];
                    if (tile.biome === 'mountain' && !tile.hasMine) {
                        faction.stars -= 6;
                        tile.hasMine = true;
                        city.income = (city.income || 3) + 3;
                        const sx = (tx - ty) * (scene.tileW / 2);
                        const sy = (tx + ty) * (scene.tileH / 2);
                        if (scene.featureLayer && scene.textures.exists('feat_mine')) {
                            const m = scene.add.image(sx, sy - 4, 'feat_mine').setOrigin(0.5, 0.7);
                            scene.featureLayer.add(m);
                        }
                        break;
                    }
                }
            }
        }

        // B. STAVBA FAREM (Zemědělství 'farming', cena 5 ⭐)
        if (faction.techs.includes('farming') && faction.stars >= 5) {
            for (const off of offsets) {
                const tx = city.gx + off.dx;
                const ty = city.gy + off.dy;
                if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
                    const tile = scene.map[tx][ty];
                    const hasCityHere = scene.cities.some(c => c.gx === tx && c.gy === ty);
                    if (!hasCityHere && !tile.hasFarm && !tile.hasMine && (tile.biome === 'plain' || tile.biome === 'forest')) {
                        faction.stars -= 5;
                        const wasForest = tile.biome === 'forest';
                        tile.biome = 'plain';
                        tile.hasFarm = true;
                        city.progress = (city.progress || 0) + 1;
                        if (city.progress >= city.progressMax) {
                            city.progress = 0;
                            city.level = (city.level || 1) + 1;
                            city.progressMax = (city.progressMax || 2) + 1;
                            city.income = (city.income || 3) + 2;
                        }
                        const sx = (tx - ty) * (scene.tileW / 2);
                        const sy = (tx + ty) * (scene.tileH / 2);
                        if (scene.featureLayer && scene.textures.exists('feat_farm')) {
                            const f = scene.add.image(sx, sy, 'feat_farm').setOrigin(0.5, 0.5);
                            scene.featureLayer.add(f);
                        }
                        if (wasForest) mapChanged = true;
                        break;
                    }
                }
            }
        }

        // C. HRADBY (Opevnění 'fortification', cena 8 ⭐)
        if (faction.techs.includes('fortification') && !city.hasWalls && faction.stars >= 8) {
            const enemyNearby = scene.units.some(u => u.owner !== fKey && Math.hypot(u.gx - city.gx, u.gy - city.gy) <= 4);
            if (enemyNearby || faction.stars >= 16) {
                faction.stars -= 8;
                city.hasWalls = true;
            }
        }
    });

    return mapChanged;
}

function aiExecuteRecruitment(scene, fKey, faction) {
    const aiCities = scene.cities.filter(c => c.owner === fKey);
    const aiUnits = scene.units.filter(u => u.owner === fKey);

    // AI nepřetěžuje ekonomiku nadměrným počtem jednotek
    const maxArmySize = Math.max(4, aiCities.length * 3);
    if (aiUnits.length >= maxArmySize) return;

    const offsets = [
        { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 },
        { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
    ];

    aiCities.forEach(city => {
        const isCityOccupied = scene.units.some(u => u.gx === city.gx && u.gy === city.gy);

        // Kontrola vodního pole v dosahu pro námořní jednotky
        let waterSpawnTile = null;
        for (const off of offsets) {
            const wx = city.gx + off.dx;
            const wy = city.gy + off.dy;
            if (wx >= 0 && wx < G.gridSize && wy >= 0 && wy < G.gridSize) {
                if (scene.map[wx][wy].biome === 'water' && !scene.units.some(u => u.gx === wx && u.gy === wy)) {
                    waterSpawnTile = { gx: wx, gy: wy };
                    break;
                }
            }
        }

        // Kontrola volného pozemního pole pro pozemní jednotky
        let landSpawnTile = null;
        if (!isCityOccupied) {
            landSpawnTile = { gx: city.gx, gy: city.gy };
        } else {
            for (const off of offsets) {
                const lx = city.gx + off.dx;
                const ly = city.gy + off.dy;
                if (lx >= 0 && lx < G.gridSize && ly >= 0 && ly < G.gridSize) {
                    const tile = scene.map[lx][ly];
                    const occ = scene.units.some(u => u.gx === lx && u.gy === ly);
                    const hasCityHere = scene.cities.some(c => c.gx === lx && c.gy === ly);
                    if (!occ && !hasCityHere && tile.biome !== 'water' && tile.biome !== 'mountain') {
                        landSpawnTile = { gx: lx, gy: ly };
                        break;
                    }
                }
            }
        }

        // Možné jednotky k náboru
        const candidates = [];

        // Námořní jednotky (pouze na pobřeží s volnou vodou)
        if (waterSpawnTile) {
            if (faction.techs.includes('navigation') && faction.stars >= 12) {
                candidates.push({ type: 'battleship', cost: 12, isWater: true, priority: fKey === 'aquaria' ? 10 : 6 });
            }
            if (faction.techs.includes('sailing') && faction.stars >= 5) {
                candidates.push({ type: 'boat', cost: 5, isWater: true, priority: fKey === 'aquaria' ? 8 : 4 });
            }
        }

        // Pozemní jednotky
        if (landSpawnTile) {
            if (faction.techs.includes('siege') && faction.stars >= 9) {
                candidates.push({ type: 'catapult', cost: 9, isWater: false, priority: fKey === 'sylvaen' ? 9 : 7 });
            }
            if (faction.techs.includes('smithing') && faction.stars >= 8) {
                candidates.push({ type: 'knight', cost: 8, isWater: false, priority: fKey === 'khardurn' ? 10 : 8 });
            }
            if (faction.techs.includes('archery') && faction.stars >= 5) {
                candidates.push({ type: 'archer', cost: 5, isWater: false, priority: fKey === 'sylvaen' ? 9 : 6 });
            }
            if (faction.stars >= 3) {
                candidates.push({ type: 'warrior', cost: 3, isWater: false, priority: 4 });
            }
        }

        if (candidates.length === 0) return;

        // Výběr jednotky podle nejvyšší priority
        candidates.sort((a, b) => b.priority - a.priority);
        const chosen = candidates[0];
        const spawnLoc = chosen.isWater ? waterSpawnTile : landSpawnTile;
        if (!spawnLoc) return;

        faction.stars -= chosen.cost;
        const newUnit = {
            id: Date.now() + Math.random(),
            owner: fKey,
            type: chosen.type,
            gx: spawnLoc.gx,
            gy: spawnLoc.gy,
            hp: UNIT_TYPES[chosen.type].hp,
            maxHp: UNIT_TYPES[chosen.type].maxHp,
            moved: true, // Vytrénovaná jednotka hraje v dalším tahu
            attacked: true,
            kills: 0,
            isVeteran: false
        };
        scene.units.push(newUnit);
    });
}

function aiExecuteTactics(scene, fKey, faction) {
    const aiCities = scene.cities.filter(c => c.owner === fKey);

    const isEnemyTarget = (owner) => {
        if (owner === fKey) return false;
        const isHuman = (G.gameMode === 'passplay' ? G.passPlayFactions.includes(owner) : owner === G.playerFaction);
        if (isHuman && faction.status !== 'war') return false;
        return true;
    };

    // Ohrožená města AI (nepřátelská jednotka v dosahu 3 polí)
    const threatenedCities = aiCities.filter(city => {
        return scene.units.some(u => isEnemyTarget(u.owner) && Math.max(Math.abs(u.gx - city.gx), Math.abs(u.gy - city.gy)) <= 3);
    });

    // Platná nepřátelská města
    const rivalCities = scene.cities.filter(c => isEnemyTarget(c.owner));

    // Zpracování akcí všech jednotek AI
    const unitsToProcess = [...scene.units.filter(u => u.owner === fKey)];

    unitsToProcess.forEach(u => {
        if (!scene.units.includes(u) || u.hp <= 0) return;
        if (u.moved && u.attacked) return;

        const uType = UNIT_TYPES[u.type];
        const atkRange = uType.range;
        const moveDist = uType.move;
        const canSail = faction.techs.includes('sailing') || u.type === 'boat' || u.type === 'battleship';

        // 1. ZRANĚNÉ JEDNOTKY (pod 50% HP) SE LÉČÍ / ODPOČÍVAJÍ
        if (u.hp < u.maxHp * 0.5) {
            const inFriendlyCity = aiCities.some(c => c.gx === u.gx && c.gy === u.gy);
            const adjacentEnemies = scene.units.filter(en => isEnemyTarget(en.owner) && Math.max(Math.abs(en.gx - u.gx), Math.abs(en.gy - u.gy)) === 1);

            // Pokud je v bezpečí města nebo nemá vedle sebe nepřítele -> léčí se
            if (inFriendlyCity || adjacentEnemies.length === 0) {
                u.hp = Math.min(u.maxHp, u.hp + 3);
                u.moved = true;
                u.attacked = true;
                return;
            }

            // Pokud je v ohrožení a může dorazit zraněného nepřítele, zaútočí
            const killableEnemy = adjacentEnemies.find(en => en.hp <= 3);
            if (killableEnemy && !u.attacked) {
                scene.executeCombat(u, killableEnemy);
                return;
            }

            // Taktický ústup o 1 pole směrem k nejbližšímu přátelskému městu
            if (!u.moved && aiCities.length > 0) {
                const nearestCity = aiCities.reduce((prev, cur) => {
                    const dPrev = Math.hypot(prev.gx - u.gx, prev.gy - u.gy);
                    const dCur = Math.hypot(cur.gx - u.gx, cur.gy - u.gy);
                    return dCur < dPrev ? cur : prev;
                });

                const offsets = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
                let bestRetreatTile = null;
                let bestDistToCity = Math.hypot(nearestCity.gx - u.gx, nearestCity.gy - u.gy);

                for (const off of offsets) {
                    const nx = u.gx + off.dx;
                    const ny = u.gy + off.dy;
                    if (nx >= 0 && nx < G.gridSize && ny >= 0 && ny < G.gridSize) {
                        const occ = scene.units.some(ou => ou.gx === nx && ou.gy === ny);
                        const tile = scene.map[nx][ny];
                        const validTerrain = (tile.biome !== 'water' || canSail);
                        if (!occ && validTerrain) {
                            const dCity = Math.hypot(nearestCity.gx - nx, nearestCity.gy - ny);
                            if (dCity < bestDistToCity) {
                                bestDistToCity = dCity;
                                bestRetreatTile = { x: nx, y: ny };
                            }
                        }
                    }
                }

                if (bestRetreatTile) {
                    u.gx = bestRetreatTile.x;
                    u.gy = bestRetreatTile.y;
                    u.moved = true;
                    scene.checkCityCapture(u, u.gx, u.gy);
                }
            }

            // Doléčení po ústupu
            u.hp = Math.min(u.maxHp, u.hp + 3);
            u.moved = true;
            u.attacked = true;
            return;
        }

        // 2. OKAMŽITÉ DOBYTÍ NESTŘEŽENÉHO NEPŘÁTELSKÉHO MĚSTA
        if (!u.moved) {
            const reachableEmptyCity = rivalCities.find(rc => {
                const dist = Math.max(Math.abs(rc.gx - u.gx), Math.abs(rc.gy - u.gy));
                const isOccupied = scene.units.some(ou => ou.gx === rc.gx && ou.gy === rc.gy);
                return dist <= moveDist && !isOccupied;
            });

            if (reachableEmptyCity) {
                u.gx = reachableEmptyCity.gx;
                u.gy = reachableEmptyCity.gy;
                u.moved = true;
                scene.checkCityCapture(u, reachableEmptyCity.gx, reachableEmptyCity.gy);
                aiCheckAndExecuteAttack(scene, u, isEnemyTarget);
                return;
            }
        }

        // 3. STŘELBA NA DÁLKU PŘED POHYBEM (Lučištníci, Katapulty, Lodě)
        if (atkRange > 1 && !u.attacked) {
            const attacked = aiCheckAndExecuteAttack(scene, u, isEnemyTarget);
            if (attacked && u.type === 'catapult') {
                u.moved = true; // Katapult se po střelbě nehýbe
                return;
            }
        }

        // 4. VOLBA STRATEGICKÉHO CÍLE
        let targetX = u.gx;
        let targetY = u.gy;

        // Priorita 0: Globální krize Hvězdné brány (AI koordinovaně táhne zničit Bránu)
        if (G.stargateProject) {
            const sgCity = scene.cities.find(c => c.id === G.stargateProject.cityId);
            if (sgCity && sgCity.owner !== fKey) {
                targetX = sgCity.gx;
                targetY = sgCity.gy;
            }
        }
        // Priorita 1: Obrana vlastního nechráněného města, ke kterému se blíží nepřítel
        if (targetX === u.gx && targetY === u.gy) {
            const unguardedThreatCity = threatenedCities.find(tc => !scene.units.some(ou => ou.gx === tc.gx && ou.gy === tc.gy));
            if (unguardedThreatCity && Math.hypot(unguardedThreatCity.gx - u.gx, unguardedThreatCity.gy - u.gy) <= 4) {
                targetX = unguardedThreatCity.gx;
                targetY = unguardedThreatCity.gy;
            }
        }
        // Priorita 2: Neutralizace nepřítele v těsné blízkosti města
        if (targetX === u.gx && targetY === u.gy && threatenedCities.length > 0) {
            const nearestThreatCity = threatenedCities[0];
            const enemyInvader = scene.units.find(en => isEnemyTarget(en.owner) && Math.max(Math.abs(en.gx - nearestThreatCity.gx), Math.abs(en.gy - nearestThreatCity.gy)) <= 3);
            if (enemyInvader) {
                targetX = enemyInvader.gx;
                targetY = enemyInvader.gy;
            }
        }
        // Priorita 3: Koordinovaný útok na nejslabší / nejbližší nepřátelské město
        if (targetX === u.gx && targetY === u.gy && rivalCities.length > 0) {
            let bestCity = rivalCities[0];
            let bestScore = 9999;

            rivalCities.forEach(rc => {
                const dist = Math.hypot(rc.gx - u.gx, rc.gy - u.gy);
                const defender = scene.units.find(ou => ou.gx === rc.gx && ou.gy === rc.gy);
                let score = dist * 2;
                if (!defender) score -= 15; // Zásadní priorita pro prázdné město
                else score += (defender.hp / 2); // Lehčí dobýt město se zraněným obráncem
                if (!rc.hasWalls) score -= 5;

                if (score < bestScore) {
                    bestScore = score;
                    bestCity = rc;
                }
            });

            targetX = bestCity.gx;
            targetY = bestCity.gy;
        }

        // 5. TAKTICKÝ POHYB K CÍLI
        if (!u.moved && (targetX !== u.gx || targetY !== u.gy)) {
            let bestStepX = u.gx;
            let bestStepY = u.gy;
            let minDistance = Math.hypot(targetX - u.gx, targetY - u.gy);

            for (let dx = -moveDist; dx <= moveDist; dx++) {
                for (let dy = -moveDist; dy <= moveDist; dy++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) > moveDist) continue;
                    const nx = u.gx + dx;
                    const ny = u.gy + dy;
                    if (nx < 0 || nx >= G.gridSize || ny < 0 || ny >= G.gridSize) continue;

                    // Nelze stoupat na políčko s jinou jednotkou
                    const occ = scene.units.some(ou => ou.gx === nx && ou.gy === ny);
                    if (occ && (nx !== u.gx || ny !== u.gy)) continue;

                    const tile = scene.map[nx][ny];

                    // Lodě mohou pouze na vodu
                    if ((u.type === 'boat' || u.type === 'battleship') && tile.biome !== 'water') continue;
                    // Pozemní jednotky mohou na vodu pouze se sailing
                    if (tile.biome === 'water' && !canSail) continue;

                    let d = Math.hypot(targetX - nx, targetY - ny);

                    // Střelci si drží odstup na dostřel
                    if (atkRange > 1) {
                        const rangeDiff = Math.abs(Math.max(Math.abs(targetX - nx), Math.abs(targetY - ny)) - (atkRange - 1));
                        d = d + rangeDiff * 0.8;
                    }

                    // Terénní bonus k obraně
                    if (tile.biome === 'mountain') d -= 0.3;
                    else if (tile.biome === 'forest') d -= 0.2;

                    if (d < minDistance) {
                        minDistance = d;
                        bestStepX = nx;
                        bestStepY = ny;
                    }
                }
            }

            if (bestStepX !== u.gx || bestStepY !== u.gy) {
                u.gx = bestStepX;
                u.gy = bestStepY;
                u.moved = true;
                scene.checkCityCapture(u, u.gx, u.gy);
            }
        }

        // 6. ÚTOK PO POHYBU (pokud ještě neútočil a není katapult)
        if (!u.attacked && u.type !== 'catapult') {
            aiCheckAndExecuteAttack(scene, u, isEnemyTarget);
        }
    });
}

function aiCheckAndExecuteAttack(scene, u, isEnemyTarget) {
    if (!scene.units.includes(u) || u.hp <= 0 || u.attacked) return false;
    const atkRange = UNIT_TYPES[u.type].range;

    const validTargets = scene.units.filter(en => {
        if (!isEnemyTarget(en.owner)) return false;
        const d = Math.max(Math.abs(en.gx - u.gx), Math.abs(en.gy - u.gy));
        return d <= atkRange;
    });

    if (validTargets.length === 0) return false;

    // Prioritizace cíle:
    // 1. Obránce nepřátelského města
    // 2. Cíl, který lze eliminovat jedním úderem
    // 3. Nejslabší cíl (nejnižší HP)
    validTargets.sort((a, b) => {
        const aInCity = scene.cities.some(c => c.gx === a.gx && c.gy === a.gy) ? 1 : 0;
        const bInCity = scene.cities.some(c => c.gx === b.gx && c.gy === b.gy) ? 1 : 0;
        if (aInCity !== bInCity) return bInCity - aInCity;

        const aKillable = (a.hp <= UNIT_TYPES[u.type].atk) ? 1 : 0;
        const bKillable = (b.hp <= UNIT_TYPES[u.type].atk) ? 1 : 0;
        if (aKillable !== bKillable) return bKillable - aKillable;

        return a.hp - b.hp;
    });

    const target = validTargets[0];
    scene.executeCombat(u, target);
    return true;
}

function showVictoryScreen(msg) {
    G.gameOver = true;
    document.getElementById('vic-icon').innerText = '🏆';
    document.getElementById('vic-title').innerText = 'SLAVNÉ VÍTĚZSTVÍ!';
    document.getElementById('vic-title').style.color = '#f59e0b';
    document.getElementById('vic-desc').innerText = msg;
    document.getElementById('vic-score').innerText = G.score;
    document.getElementById('game-over-modal').classList.remove('hidden');
}

function showDefeatScreen(msg) {
    G.gameOver = true;
    document.getElementById('vic-icon').innerText = '💀';
    document.getElementById('vic-title').innerText = 'CIVILIZACE PADLA';
    document.getElementById('vic-title').style.color = '#ef4444';
    document.getElementById('vic-desc').innerText = msg;
    document.getElementById('vic-score').innerText = G.score;
    document.getElementById('game-over-modal').classList.remove('hidden');
}

function showToast(msg) {
    const rack = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'civ-toast';
    toast.innerText = msg;
    rack.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

function updateHUD() {
    const activeFac = G.factions[G.activeFaction];
    const scene = (typeof game !== 'undefined' && game.scene) ? game.scene.getScene('PolytropiaScene') : null;
    const playerCities = scene ? scene.cities.filter(c => c.owner === G.activeFaction).length : 1;

    const elCrest = document.getElementById('tribe-crest');
    const elName = document.getElementById('tribe-name');
    const elStars = document.getElementById('hud-stars');
    const elIncome = document.getElementById('hud-income');
    const elTurn = document.getElementById('hud-turn-num');
    const elScore = document.getElementById('hud-score');
    const elCities = document.getElementById('hud-cities-count');

    if (elCrest) {
        elCrest.innerText = activeFac.crest;
        elCrest.style.borderColor = activeFac.cssColor;
    }
    if (elName) {
        elName.innerText = activeFac.title || activeFac.name;
        elName.style.color = activeFac.cssColor;
    }
    if (elStars) elStars.innerText = activeFac.stars;
    const curIncome = getFactionIncome(G.activeFaction);
    if (elIncome) elIncome.innerText = `+${curIncome}/kolo`;
    if (elTurn) elTurn.innerText = G.turn;
    if (elScore) elScore.innerText = G.score;
    if (elCities) elCities.innerText = playerCities;
}

// --- FACTION & MODE PICKER LOGIC ---
function renderFactionPicker() {
    const grid = document.getElementById('factions-picker-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const keys = Object.keys(G.factions);
    keys.forEach(key => {
        const fac = G.factions[key];
        const card = document.createElement('div');
        const isSelected = (G.gameMode === 'passplay') ? G.passPlayFactions.includes(key) : (G.playerFaction === key);
        card.className = `faction-card-pick ${isSelected ? 'selected' : ''}`;
        card.style.borderColor = isSelected ? fac.cssColor : 'rgba(255,255,255,0.12)';

        let badgeHtml = '';
        if (G.gameMode === 'passplay' && G.passPlayFactions.includes(key)) {
            badgeHtml = `<span class="pick-badge" style="background:${fac.cssColor}; color:#000;">HRÁČ ${G.passPlayFactions.indexOf(key) + 1}</span>`;
        } else if (G.gameMode === 'single' && G.playerFaction === key) {
            badgeHtml = `<span class="pick-badge">TVÁ VOLBA</span>`;
        }

        const startTech = TECH_TREE[fac.techs[0]] ? TECH_TREE[fac.techs[0]].name : 'Věda';

        card.innerHTML = `
            ${badgeHtml}
            <div class="pick-crest">${fac.crest}</div>
            <div class="pick-name" style="color:${fac.cssColor};">${fac.name}</div>
            <div class="pick-bonus">${fac.bonus}</div>
            <div class="pick-tech">Věda: ${startTech}</div>
        `;

        card.onclick = () => {
            if (G.gameMode === 'passplay') {
                if (G.passPlayFactions.includes(key)) {
                    if (G.passPlayFactions.length > 2) {
                        G.passPlayFactions = G.passPlayFactions.filter(x => x !== key);
                    } else {
                        showToast('⚠️ Hotseat vyžaduje alespoň 2 hráče!');
                    }
                } else {
                    G.passPlayFactions.push(key);
                }
            } else {
                G.playerFaction = key;
                G.activeFaction = key;
            }
            SFX.play('select');
            renderFactionPicker();
        };

        grid.appendChild(card);
    });
}

window.selectGameMode = function(mode) {
    G.gameMode = mode;
    const btnSingle = document.getElementById('btn-mode-single');
    const btnPass = document.getElementById('btn-mode-passplay');
    if (btnSingle && btnPass) {
        btnSingle.classList.toggle('active', mode === 'single');
        btnPass.classList.toggle('active', mode === 'passplay');
    }
    if (mode === 'passplay' && G.passPlayFactions.length < 2) {
        G.passPlayFactions = ['solaria', 'khardurn'];
    }
    SFX.play('select');
    renderFactionPicker();
};

window.confirmStartGame = function() {
    // Okamžité odemčení Web Audio API přímo v uživatelském gestu kliku
    SFX.unlockAudio();

    const modal = document.getElementById('start-modal');
    if (modal) modal.classList.add('hidden');

    if (G.gameMode === 'passplay') {
        G.activeFaction = G.passPlayFactions[0];
        showToast(`👥 Zahájen Hotseat Multiplayer (${G.passPlayFactions.length} hráči)!`);
    } else {
        G.activeFaction = G.playerFaction;
        showToast(`👑 Hraješ za frakci ${G.factions[G.playerFaction].name}! Zvítěz nad ostatními.`);
    }

    const scene = game.scene.getScene('PolytropiaScene');
    if (scene) {
        recalculateFogForActiveFaction(scene);
        scene.renderUnits();
        scene.renderCities();
        scene.renderMapTiles();

        const curCity = scene.cities.find(c => c.owner === G.activeFaction);
        if (curCity) {
            scene.selectCity(curCity);
            const targetSx = (curCity.gx - curCity.gy) * (scene.tileW / 2);
            const targetSy = (curCity.gx + curCity.gy) * (scene.tileH / 2);
            scene.world.setPosition(scene.scale.width / 2 - targetSx, scene.scale.height / 2 - targetSy);
        }
    }

    // Spusť energický Age of War soundtrack
    SFX.startAmbient();
    updateHUD();
    renderMinimap();
};

// ====================================================
// INITIALIZATION & EVENT LISTENERS
// ====================================================
const config = {
    type: Phaser.AUTO,
    parent: 'phaser-viewport',
    width: window.innerWidth,
    height: window.innerHeight,
    transparent: true,
    audio: { noAudio: true }, // Web Audio řeší přímo CivAudioEngine
    input: {
        windowEvents: false
    },
    scene: [PolytropiaScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);

window.addEventListener('load', () => {
    // Globální odemčení Web Audio API při prvním kliku/dotyku kdekoliv na obrazovce
    const unlockHandler = () => {
        SFX.unlockAudio();
        window.removeEventListener('pointerdown', unlockHandler);
        window.removeEventListener('keydown', unlockHandler);
    };
    window.addEventListener('pointerdown', unlockHandler);
    window.addEventListener('keydown', unlockHandler);

    // Izolace všech UI kontejnerů před probubláváním na Phaser canvas / window
    const uiContainers = [
        'entity-dock',
        'civ-hud',
        'minimap-panel',
        'tech-modal',
        'diplo-modal',
        'start-modal',
        'hotseat-splash',
        'ruins-modal',
        'game-over-modal'
    ];
    uiContainers.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend'].forEach(evt => {
            el.addEventListener(evt, (e) => {
                e.stopPropagation();
            }, { passive: false });
        });
    });

    document.getElementById('btn-end-turn').addEventListener('click', executeEndTurn);

    // Tlačítko Hrát Novou Partii po výhře / prohře
    const btnRestart = document.getElementById('btn-restart-game');
    if (btnRestart) {
        btnRestart.addEventListener('click', () => {
            window.location.reload();
        });
    }

    document.getElementById('btn-open-tech').addEventListener('click', () => {
        renderTechTree();
        document.getElementById('tech-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-tech').addEventListener('click', () => {
        document.getElementById('tech-modal').classList.add('hidden');
    });

    document.getElementById('btn-open-diplo').addEventListener('click', () => {
        renderDiplomacyModal();
        document.getElementById('diplo-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-diplo').addEventListener('click', () => {
        document.getElementById('diplo-modal').classList.add('hidden');
    });

    document.getElementById('btn-toggle-music').addEventListener('click', () => {
        SFX.toggleAmbient();
    });

    document.getElementById('btn-close-dock').addEventListener('click', closeDock);

    document.getElementById('minimap-canvas').addEventListener('click', handleMinimapClick);

    // Klávesové zkratky
    window.addEventListener('keydown', (e) => {
        const techModal = document.getElementById('tech-modal');
        const diploModal = document.getElementById('diplo-modal');
        const ruinsModal = document.getElementById('ruins-modal');
        const startModal = document.getElementById('start-modal');
        const splashModal = document.getElementById('hotseat-splash');
        const gameOverModal = document.getElementById('game-over-modal');

        if (e.key === 'Escape') {
            techModal.classList.add('hidden');
            diploModal.classList.add('hidden');
            ruinsModal.classList.add('hidden');
            closeDock();
            return;
        }

        if (e.key === 'm' || e.key === 'M') {
            SFX.toggleAmbient();
            return;
        }

        if (e.key === 't' || e.key === 'T') {
            techModal.classList.toggle('hidden');
            if (!techModal.classList.contains('hidden')) renderTechTree();
            return;
        }

        if (e.key === 'd' || e.key === 'D') {
            diploModal.classList.toggle('hidden');
            if (!diploModal.classList.contains('hidden')) renderDiplomacyModal();
            return;
        }

        // Cyklování jednotek přes TAB
        if (e.key === 'Tab') {
            e.preventDefault();
            const scene = game.scene.getScene('PolytropiaScene');
            if (!scene) return;

            const readyUnits = scene.units.filter(u => u.owner === G.activeFaction && (!u.moved || !u.attacked));
            if (readyUnits.length > 0) {
                const curId = (G.selectedEntity && G.selectedEntity.type === 'unit') ? G.selectedEntity.data.id : null;
                const curIdx = readyUnits.findIndex(u => u.id === curId);
                const nextIdx = (curIdx + 1) % readyUnits.length;
                scene.selectUnit(readyUnits[nextIdx]);
            }
            return;
        }

        if (e.key === 'Enter' || e.code === 'Space') {
            if (startModal && !startModal.classList.contains('hidden')) return;
            if (splashModal && !splashModal.classList.contains('hidden')) return;
            if (gameOverModal && !gameOverModal.classList.contains('hidden')) return;
            if (!techModal.classList.contains('hidden') || !diploModal.classList.contains('hidden') || !ruinsModal.classList.contains('hidden')) return;
            if (G.gameOver) return;
            executeEndTurn();
        }
    });

    updateHUD();
});
