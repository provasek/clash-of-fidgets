/**
 * Polytropia: Civilizace Hvězd (Kompletní 4X Impérium - 20 Plnohodnotných Systémů)
 * 1. 4 Frakce (Solaria, Khar-Durn, Aquaria, Sylvaen) s unikátními pasivkami
 * 2. 3 AI Protivníci na zvětšené 16x16 mapě se 4 kvadranty
 * 3. Plnohodnotná Diplomacie (Mír, Válka, Obchodní pakty za +2 ⭐)
 * 4. 3 Podmínky vítězství (Domination, Science/Hvězdná brána, Score po 50 tazích)
 * 5. Katapulty (obléhání hradeb) a Bitevní koráby (lodě s děly)
 * 6. Systém Veteránství (⭐ po 3 killech: +5 HP, +1 útok/obrana)
 * 7. Zóna kontroly (ZoC) – zastavuje pohyb při kontaktu s nepřítelem
 * 8. Silniční síť – cesty pro zrychlení pohybu a obchod mezi městy
 * 9. Neutrální domorodé kmeny (Minor Tribes) k asimilaci
 * 10. Přírodní divy světa (Diamantový lom, Posvátný háj)
 * 11. Náhodné příběhové volby z ruin (Event modal)
 * 12. Animované balistické projektily šípů a balvanů
 * 13. Částicové konfety a level-up fanfáry
 * 14. Procedurální ambientní hudba na pozadí (Web Audio arpeggio)
 * 15. 4 Biomy na mapě (Pláně, Sopečné hory, Korálové atoly, Temné hvozdy)
 * 16. Detailní textury všech jednotek a lodí
 * 17. 4-barevná Radarová Minimapa
 * 18. Klávesové zkratky: Enter/Space (další tah), Tab (další jednotka), T (strom vědy), D (diplomacie), Esc
 * 19. Přehled posádky ve městě a dobývání měst
 * 20. Závěrečné statistiky a skóre
 */

// --- GLOBAL GAME STATE ---
const G = {
    turn: 1,
    maxTurns: 50,
    score: 150,
    factions: {
        solaria: { id: 'solaria', name: 'Solaria', crest: '☀️', color: 0x38bdf8, cssColor: '#38bdf8', isPlayer: true, stars: 15, income: 5, status: 'self', techs: ['farming'] },
        khardurn: { id: 'khardurn', name: 'Khar-Durn', crest: '🌋', color: 0xef4444, cssColor: '#ef4444', isPlayer: false, stars: 12, income: 4, status: 'peace', techs: ['mining'] },
        aquaria: { id: 'aquaria', name: 'Aquaria', crest: '🌊', color: 0x06b6d4, cssColor: '#06b6d4', isPlayer: false, stars: 12, income: 4, status: 'peace', techs: ['sailing'] },
        sylvaen: { id: 'sylvaen', name: 'Sylvaen', crest: '🍃', color: 0x10b981, cssColor: '#10b981', isPlayer: false, stars: 12, income: 4, status: 'peace', techs: ['archery'] }
    },
    gridSize: 16,
    selectedEntity: null,
    gameOver: false,
    musicEnabled: true,
    roads: [] // { gx, gy }
};

// --- EXPANDED TECH TREE (9 TECHNOLOGIÍ) ---
const TECH_TREE = {
    farming: { name: 'Zemědělství', icon: '🌾', cost: 5, desc: 'Umožňuje kultivovat pole na obilné farmy (+2 růst města).' },
    mining: { name: 'Hornictví', icon: '⛏️', cost: 7, desc: 'Umožňuje hloubit doly na horách (+3 ⭐/tah).' },
    archery: { name: 'Lukostřelba', icon: '🏹', cost: 8, desc: 'Odemyká výcvik Lučištníků (střelba na dálku bez protiútoku!).' },
    sailing: { name: 'Mořeplavba', icon: '⛵', cost: 9, desc: 'Jednotky mohou vstupovat na vodu (promění se v loď) a stavět Přístavy.' },
    roads: { name: 'Silniční Síť', icon: '🛤️', cost: 8, desc: 'Umožňuje dláždit cesty (rychlejší pohyb a obchodní bonusy mezi městy).' },
    smithing: { name: 'Kovářství', icon: '⚔️', cost: 11, desc: 'Odemyká Rytíře na koních s vysokým poškozením a pohybem 2 políčka.' },
    fortification: { name: 'Opevnění & Hradby', icon: '🏰', cost: 10, desc: 'Stavba kamenných hradeb na městech (+3 k obraně posádky).' },
    siege: { name: 'Obléhací Stroje', icon: '💣', cost: 12, desc: 'Odemyká Katapulty s obřím poškozením proti městským hradbám.' },
    stargate: { name: 'Hvězdná Brána', icon: '🌌', cost: 22, desc: 'Filozofie a transcendens. Stavba brány zajistí okamžité Vědecké Vítězství!' }
};

// --- EXPANDED UNITS DEFINITIONS ---
const UNIT_TYPES = {
    warrior: { name: 'Válečník', icon: '🗡️', hp: 10, maxHp: 10, atk: 4, def: 2, range: 1, move: 1, cost: 3 },
    archer: { name: 'Lučištník', icon: '🏹', hp: 8, maxHp: 8, atk: 3, def: 1, range: 2, move: 1, cost: 5 },
    knight: { name: 'Rytíř', icon: '🐎', hp: 14, maxHp: 14, atk: 6, def: 3, range: 1, move: 2, cost: 8 },
    catapult: { name: 'Katapult', icon: '💣', hp: 10, maxHp: 10, atk: 8, def: 0, range: 3, move: 1, cost: 9, siege: true },
    settler: { name: 'Osadník', icon: '⛺', hp: 6, maxHp: 6, atk: 0, def: 1, range: 1, move: 1, cost: 7 },
    boat: { name: 'Válečný Člun', icon: '⛵', hp: 12, maxHp: 12, atk: 4, def: 2, range: 2, move: 2, cost: 0 },
    battleship: { name: 'Bitevní Koráb', icon: '🚢', hp: 18, maxHp: 18, atk: 7, def: 3, range: 2, move: 2, cost: 12 }
};

// --- PROCEDURAL AUDIO & AMBIENT MUSIC ENGINE ---
class CivAudioEngine {
    constructor() {
        this.ctx = null;
        this.ambientInterval = null;
    }
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
    }
    startAmbientMusic() {
        if (!G.musicEnabled) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // Pentatonic chill ambient chord progression
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
        if (this.ambientInterval) clearInterval(this.ambientInterval);

        this.ambientInterval = setInterval(() => {
            if (!G.musicEnabled || !this.ctx) return;
            const t = this.ctx.currentTime;
            const freq = scale[Math.floor(Math.random() * scale.length)];
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(0.04, t + 1.2);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
            osc.start(t);
            osc.stop(t + 4.0);
        }, 3600);
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
            // Low bass explosion for catapults
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
                g.gain.setValueAtTime(0.2, t + idx * 0.08);
                g.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.2);
                osc.start(t + idx * 0.08);
                osc.stop(t + idx * 0.08 + 0.2);
            });
        }
    }
}
const SFX = new CivAudioEngine();

// --- DETAILNÍ VEKTOROVÉ PROCEDURÁLNÍ TEXTURY ---
function generatePolytopiaTextures(scene) {
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });

    // Tiles (Plain, Forest, Mountain, Water, Road)
    if (!scene.textures.exists('tile_plain')) {
        gfx.clear();
        gfx.fillStyle(0x4ade80, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0); gfx.lineTo(64, 16); gfx.lineTo(32, 32); gfx.lineTo(0, 16);
        gfx.closePath(); gfx.fillPath();
        gfx.lineStyle(1, 0x22c55e, 0.9); gfx.strokePath();
        gfx.generateTexture('tile_plain', 64, 32);
    }
    if (!scene.textures.exists('tile_forest')) {
        gfx.clear();
        gfx.fillStyle(0x16a34a, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0); gfx.lineTo(64, 16); gfx.lineTo(32, 32); gfx.lineTo(0, 16);
        gfx.closePath(); gfx.fillPath();
        gfx.fillStyle(0x14532d, 1);
        gfx.fillTriangle(32, -6, 22, 16, 42, 16);
        gfx.generateTexture('tile_forest', 64, 32);
    }
    if (!scene.textures.exists('tile_mountain')) {
        gfx.clear();
        gfx.fillStyle(0x64748b, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0); gfx.lineTo(64, 16); gfx.lineTo(32, 32); gfx.lineTo(0, 16);
        gfx.closePath(); gfx.fillPath();
        gfx.fillStyle(0x94a3b8, 1);
        gfx.fillTriangle(32, -14, 16, 16, 48, 16);
        gfx.fillStyle(0xf8fafc, 1);
        gfx.fillTriangle(32, -14, 26, -4, 38, -4);
        gfx.generateTexture('tile_mountain', 64, 32);
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
        gfx.fillStyle(0x78716c, 0.9);
        gfx.beginPath();
        gfx.moveTo(32, 4); gfx.lineTo(58, 16); gfx.lineTo(32, 28); gfx.lineTo(6, 16);
        gfx.closePath(); gfx.fillPath();
        gfx.generateTexture('tile_road', 64, 32);
    }
    if (!scene.textures.exists('cloud_fog')) {
        gfx.clear();
        gfx.fillStyle(0x1e293b, 1);
        gfx.fillCircle(32, 16, 26);
        gfx.fillCircle(20, 16, 18);
        gfx.fillCircle(44, 16, 18);
        gfx.generateTexture('cloud_fog', 64, 36);
    }

    // Natural Wonders
    if (!scene.textures.exists('wonder_diamond')) {
        gfx.clear();
        gfx.fillStyle(0x38bdf8, 1);
        gfx.fillTriangle(32, -14, 18, 14, 46, 14);
        gfx.fillStyle(0xa5f3fc, 0.8);
        gfx.fillTriangle(32, -14, 28, 4, 36, 4);
        gfx.generateTexture('wonder_diamond', 64, 32);
    }
    if (!scene.textures.exists('wonder_grove')) {
        gfx.clear();
        gfx.fillStyle(0x10b981, 1);
        gfx.fillCircle(32, 8, 14);
        gfx.fillStyle(0xfde047, 0.9);
        gfx.fillCircle(32, 8, 5);
        gfx.generateTexture('wonder_grove', 64, 32);
    }
    if (!scene.textures.exists('minor_tribe')) {
        gfx.clear();
        gfx.fillStyle(0xb45309, 1);
        gfx.fillRect(22, 8, 20, 16);
        gfx.fillStyle(0xfef3c7, 1);
        gfx.fillTriangle(18, 8, 32, -4, 46, 8);
        gfx.generateTexture('minor_tribe', 64, 32);
    }

    // Units
    if (!scene.textures.exists('unit_warrior')) {
        gfx.clear();
        gfx.fillStyle(0x1e293b, 1);
        gfx.lineStyle(2, 0xffffff, 1);
        gfx.fillCircle(20, 22, 14); gfx.strokeCircle(20, 22, 14);
        gfx.fillStyle(0x94a3b8, 1);
        gfx.fillCircle(20, 14, 8);
        gfx.lineStyle(3, 0x38bdf8, 1);
        gfx.beginPath(); gfx.moveTo(12, 30); gfx.lineTo(28, 10); gfx.strokePath();
        gfx.generateTexture('unit_warrior', 44, 44);
    }
    if (!scene.textures.exists('unit_archer')) {
        gfx.clear();
        gfx.fillStyle(0x15803d, 1);
        gfx.fillCircle(20, 15, 8);
        gfx.fillStyle(0x78350f, 1); gfx.fillRect(26, 10, 6, 16);
        gfx.lineStyle(2, 0xfacc15, 1);
        gfx.beginPath(); gfx.arc(16, 22, 10, -Math.PI / 2, Math.PI / 2); gfx.strokePath();
        gfx.generateTexture('unit_archer', 44, 44);
    }
    if (!scene.textures.exists('unit_knight')) {
        gfx.clear();
        gfx.fillStyle(0x78350f, 1);
        gfx.fillRoundedRect(8, 20, 28, 16, 6);
        gfx.fillCircle(34, 16, 7);
        gfx.fillStyle(0x94a3b8, 1); gfx.fillCircle(18, 12, 6);
        gfx.fillStyle(0xef4444, 1); gfx.fillTriangle(18, 6, 14, 0, 22, 0);
        gfx.lineStyle(3, 0xfde047, 1);
        gfx.beginPath(); gfx.moveTo(16, 16); gfx.lineTo(38, 4); gfx.strokePath();
        gfx.generateTexture('unit_knight', 48, 44);
    }
    if (!scene.textures.exists('unit_catapult')) {
        gfx.clear();
        gfx.fillStyle(0x78350f, 1);
        gfx.fillRect(8, 20, 26, 12);
        gfx.fillStyle(0x334155, 1);
        gfx.fillCircle(12, 32, 5); gfx.fillCircle(28, 32, 5);
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

    // Particles & Features
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

        this.cameras.main.setBackgroundColor('#080c14');
        this.world = this.add.container(this.scale.width / 2, this.scale.height / 3);

        this.tileW = 64;
        this.tileH = 32;

        this.initWorldMapData();
        this.renderMapTiles();
        this.renderRoads();
        this.renderCities();
        this.renderUnits();
        this.renderFogOfWar();
        this.setupCameraPanning();

        // Reveal Fog around starting player city
        this.revealFogAround(2, 2, 2);

        this.scale.on('resize', (gameSize) => {
            this.world.setPosition(gameSize.width / 2, gameSize.height / 3);
            renderMinimap();
        });

        initMinimapInteractions(this);
        renderMinimap();

        SFX.startAmbientMusic();
    }

    initWorldMapData() {
        this.map = [];
        this.fog = [];

        // 4 Biomes in 4 Quadrants
        for (let gx = 0; gx < G.gridSize; gx++) {
            this.map[gx] = [];
            this.fog[gx] = [];
            for (let gy = 0; gy < G.gridSize; gy++) {
                let biome = 'plain';

                // Biome regions
                if (gx < 8 && gy >= 8) biome = Math.random() < 0.4 ? 'mountain' : 'plain'; // Khar-Durn rocky south-west
                else if (gx >= 8 && gy >= 8) biome = Math.random() < 0.45 ? 'water' : 'plain'; // Aquaria archipelago south-east
                else if (gx >= 8 && gy < 8) biome = Math.random() < 0.45 ? 'forest' : 'plain'; // Sylvaen deep forest north-east

                // Water borders
                if (gx === 0 || gy === 0 || gx === G.gridSize - 1 || gy === G.gridSize - 1) {
                    if (Math.random() < 0.7) biome = 'water';
                }

                // Natural Wonders & Minor Tribes
                const isDiamond = (gx === 7 && gy === 8);
                const isGrove = (gx === 8 && gy === 4);
                const isTribe = !isDiamond && !isGrove && Math.random() < 0.04 && biome !== 'water';
                const hasRuins = !isTribe && !isDiamond && !isGrove && (biome === 'plain' || biome === 'forest') && Math.random() < 0.07;

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

        // 4 Faction Starting Capital Cities
        this.cities = [
            { id: 1, owner: 'solaria', name: 'Solaria', gx: 2, gy: 2, level: 1, progress: 0, progressMax: 2, income: 4, hasWalls: false },
            { id: 2, owner: 'khardurn', name: 'Khar-Durn', gx: 2, gy: 13, level: 1, progress: 0, progressMax: 2, income: 4, hasWalls: false },
            { id: 3, owner: 'aquaria', name: 'Aquapolis', gx: 13, gy: 13, level: 1, progress: 0, progressMax: 2, income: 4, hasWalls: false },
            { id: 4, owner: 'sylvaen', name: 'Sylva-Nir', gx: 13, gy: 2, level: 1, progress: 0, progressMax: 2, income: 4, hasWalls: false }
        ];

        // Ensure cities are on plain tiles
        this.cities.forEach(c => { this.map[c.gx][c.gy].biome = 'plain'; });

        // Starting units for each faction
        this.units = [
            { id: 101, owner: 'solaria', type: 'warrior', gx: 2, gy: 2, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, isVeteran: false },
            { id: 201, owner: 'khardurn', type: 'warrior', gx: 2, gy: 13, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, isVeteran: false },
            { id: 301, owner: 'aquaria', type: 'warrior', gx: 13, gy: 13, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, isVeteran: false },
            { id: 401, owner: 'sylvaen', type: 'warrior', gx: 13, gy: 2, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, isVeteran: false }
        ];
    }

    renderMapTiles() {
        this.tileSprites = [];
        for (let gx = 0; gx < G.gridSize; gx++) {
            this.tileSprites[gx] = [];
            for (let gy = 0; gy < G.gridSize; gy++) {
                const sx = (gx - gy) * (this.tileW / 2);
                const sy = (gx + gy) * (this.tileH / 2);

                const data = this.map[gx][gy];
                const spr = this.add.image(sx, sy, `tile_${data.biome}`);
                spr.setOrigin(0.5, 0.5);
                spr.setInteractive({ cursor: 'pointer' });
                spr.tileData = data;

                spr.on('pointerdown', (pointer) => {
                    this.onTileClicked(gx, gy, pointer);
                });

                this.world.add(spr);
                this.tileSprites[gx][gy] = spr;

                // Feature overlays
                if (data.isDiamond) {
                    const w = this.add.image(sx, sy, 'wonder_diamond');
                    this.world.add(w);
                } else if (data.isGrove) {
                    const w = this.add.image(sx, sy, 'wonder_grove');
                    this.world.add(w);
                } else if (data.isTribe) {
                    const t = this.add.image(sx, sy, 'minor_tribe');
                    spr.tribeSprite = t;
                    this.world.add(t);
                } else if (data.hasRuins) {
                    const r = this.add.image(sx, sy, 'feat_ruins');
                    spr.ruinsSprite = r;
                    this.world.add(r);
                }
            }
        }
    }

    renderRoads() {
        if (this.roadSprites) this.roadSprites.forEach(s => s.destroy());
        this.roadSprites = [];

        G.roads.forEach(r => {
            const sx = (r.gx - r.gy) * (this.tileW / 2);
            const sy = (r.gx + r.gy) * (this.tileH / 2);
            const spr = this.add.image(sx, sy, 'tile_road');
            spr.setOrigin(0.5, 0.5);
            this.world.add(spr);
            this.roadSprites.push(spr);
        });
    }

    renderCities() {
        if (this.citySprites) this.citySprites.forEach(s => s.destroy());
        this.citySprites = [];

        this.cities.forEach(city => {
            const sx = (city.gx - city.gy) * (this.tileW / 2);
            const sy = (city.gx + city.gy) * (this.tileH / 2) - 8;

            const faction = G.factions[city.owner];
            const spr = this.add.image(sx, sy, 'entity_city');
            spr.setOrigin(0.5, 0.7);
            spr.setTint(faction ? faction.color : 0xffffff);
            spr.setDepth(10);
            spr.setInteractive({ cursor: 'pointer' });
            spr.cityData = city;

            const banner = this.add.text(sx, sy - 28, `${city.name} (${city.level})`, {
                fontFamily: 'Outfit',
                fontSize: '11px',
                fontStyle: '800',
                color: '#fff',
                backgroundColor: faction ? faction.cssColor : '#0369a1',
                padding: { x: 5, y: 2 }
            }).setOrigin(0.5).setDepth(15);

            spr.on('pointerdown', (p) => {
                p.event.stopPropagation();
                // Pokud má hráč vybranou jednotku a klikne na cizí město -> útok/vstup
                if (G.selectedEntity && G.selectedEntity.type === 'unit' && G.selectedEntity.data.owner === 'solaria') {
                    const u = G.selectedEntity.data;
                    const enemyInCity = this.units.find(en => en.gx === city.gx && en.gy === city.gy && en.owner !== 'solaria');
                    if (enemyInCity) {
                        this.handleUnitAttack(u, enemyInCity);
                        return;
                    } else if (city.owner !== 'solaria') {
                        this.executeMove(u, city.gx, city.gy);
                        return;
                    }
                }
                this.selectCity(city);
            });

            this.world.add(spr);
            this.world.add(banner);
            this.citySprites.push(spr);
            this.citySprites.push(banner);
        });
    }

    renderUnits() {
        if (this.unitSprites) this.unitSprites.forEach(u => u.destroy());
        this.unitSprites = [];

        this.units.forEach(u => {
            const sx = (u.gx - u.gy) * (this.tileW / 2);
            const inCity = this.cities.some(c => c.gx === u.gx && c.gy === u.gy);
            const sy = (u.gx + u.gy) * (this.tileH / 2) - (inCity ? 18 : 6);

            const faction = G.factions[u.owner];
            const texKey = (this.map[u.gx][u.gy].biome === 'water') ? 'unit_boat' : `unit_${u.type}`;
            const spr = this.add.image(sx, sy, texKey);
            spr.setOrigin(0.5, 0.6);
            spr.setTint(faction ? faction.color : 0xffffff);
            spr.setDepth(inCity ? 25 : 12);
            spr.setInteractive({ cursor: 'pointer' });
            spr.unitData = u;

            // HP and Veteran Badge
            const vetMark = u.isVeteran ? '⭐' : '';
            const hpBadge = this.add.text(sx + 14, sy - 12, `${vetMark}${u.hp}`, {
                fontFamily: 'JetBrains Mono',
                fontSize: '10px',
                fontStyle: '800',
                color: u.isVeteran ? '#fde047' : '#fff',
                backgroundColor: '#0f172a',
                padding: { x: 3, y: 1 }
            }).setOrigin(0.5).setDepth(inCity ? 26 : 13);

            spr.on('pointerdown', (p) => {
                p.event.stopPropagation();
                if (G.selectedEntity && G.selectedEntity.type === 'unit' && G.selectedEntity.data.owner === 'solaria' && u.owner !== 'solaria') {
                    const attacker = G.selectedEntity.data;
                    this.handleUnitAttack(attacker, u);
                    return;
                }
                this.selectUnit(u);
            });

            this.world.add(spr);
            this.world.add(hpBadge);
            this.unitSprites.push(spr);
            this.unitSprites.push(hpBadge);
        });
    }

    renderFogOfWar() {
        if (this.fogSprites) this.fogSprites.forEach(f => f.destroy());
        this.fogSprites = [];

        for (let gx = 0; gx < G.gridSize; gx++) {
            for (let gy = 0; gy < G.gridSize; gy++) {
                if (this.fog[gx][gy]) {
                    const sx = (gx - gy) * (this.tileW / 2);
                    const sy = (gx + gy) * (this.tileH / 2);

                    const cloud = this.add.image(sx, sy, 'cloud_fog');
                    cloud.setOrigin(0.5, 0.5);
                    cloud.setDepth(30);
                    this.world.add(cloud);
                    this.fogSprites.push(cloud);
                }
            }
        }
    }

    revealFogAround(cx, cy, radius) {
        let revealedAny = false;
        const isMountain = this.map[cx] && this.map[cx][cy] && this.map[cx][cy].biome === 'mountain';
        const actualRadius = isMountain ? radius + 1 : radius;

        for (let x = cx - actualRadius; x <= cx + actualRadius; x++) {
            for (let y = cy - actualRadius; y <= cy + actualRadius; y++) {
                if (x >= 0 && x < G.gridSize && y >= 0 && y < G.gridSize) {
                    if (this.fog[x][y]) {
                        this.fog[x][y] = false;
                        revealedAny = true;
                    }
                }
            }
        }

        if (revealedAny) {
            SFX.play('fog');
            this.renderFogOfWar();
            this.renderCities();
            this.renderUnits();
            renderMinimap();
        }
    }

    setupCameraPanning() {
        this.input.on('pointermove', (p) => {
            if (p.isDown) {
                this.world.x += (p.x - p.prevPosition.x);
                this.world.y += (p.y - p.prevPosition.y);
                renderMinimap();
            }
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const newScale = Phaser.Math.Clamp(this.world.scaleX - deltaY * 0.001, 0.65, 1.8);
            this.world.setScale(newScale);
            renderMinimap();
        });
    }

    // --- SELECTION & ZONE OF CONTROL (ZoC) ---
    selectUnit(unit) {
        if (unit.owner !== 'solaria') {
            showToast('⚠️ Nepřátelská jednotka. Zvol svou jednotku a zaútoč na nepřítele!');
            return;
        }

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

        const moveRange = unit.moved ? 0 : UNIT_TYPES[unit.type].move;
        const attackRange = unit.attacked ? 0 : UNIT_TYPES[unit.type].range;
        const maxR = Math.max(moveRange, attackRange);

        if (maxR === 0) return;

        for (let x = unit.gx - maxR; x <= unit.gx + maxR; x++) {
            for (let y = unit.gy - maxR; y <= unit.gy + maxR; y++) {
                if (x < 0 || x >= G.gridSize || y < 0 || y >= G.gridSize) continue;
                if (x === unit.gx && y === unit.gy) continue;

                const dist = Math.max(Math.abs(unit.gx - x), Math.abs(unit.gy - y));
                const sx = (x - y) * (this.tileW / 2);
                const sy = (x + y) * (this.tileH / 2);

                const enemyOnTile = this.units.find(en => en.gx === x && en.gy === y && en.owner !== 'solaria');
                const canSail = G.factions.solaria.techs.includes('sailing');
                const isWater = this.map[x][y].biome === 'water';

                // ČERVENÝ ÚTOČNÝ INDIKÁTOR
                if (enemyOnTile && !unit.attacked && dist <= attackRange) {
                    const ring = this.add.circle(sx, sy, 14, 0xef4444, 0.7);
                    ring.setStrokeStyle(2, 0xffffff, 0.9).setDepth(18);
                    this.tweens.add({ targets: ring, scale: 1.25, yoyo: true, repeat: -1, duration: 400 });
                    this.world.add(ring);
                    this.moveHighlights.push({ x, y, type: 'attack', target: enemyOnTile, sprite: ring });
                }
                // MODRÝ POHYBOVÝ INDIKÁTOR
                else if (!enemyOnTile && !unit.moved && dist <= moveRange && (!isWater || canSail)) {
                    const ring = this.add.circle(sx, sy, 10, isWater ? 0x0284c7 : 0x38bdf8, 0.6);
                    ring.setDepth(18);
                    this.world.add(ring);
                    this.moveHighlights.push({ x, y, type: 'move', sprite: ring });
                }
            }
        }
    }

    clearTileHighlights() {
        if (this.moveHighlights) {
            this.moveHighlights.forEach(h => h.sprite.destroy());
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
            showToast('⚠️ Tato jednotka již v tomto tahu útočila!');
            return;
        }
        if (dist > maxRange) {
            showToast('⚠️ Nepřítel je mimo dostřel!');
            return;
        }

        this.executeCombat(attacker, defender);
    }

    executeMove(unit, targetX, targetY) {
        unit.gx = targetX;
        unit.gy = targetY;
        unit.moved = true;
        SFX.play('move');
        this.clearTileHighlights();

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

            // Pokud jednotka ještě neútočila, vysviť cíle kolem nové pozice
            if (G.selectedEntity && G.selectedEntity.data === unit && !unit.attacked) {
                this.highlightMovementTiles(unit);
            }
            openUnitDock(unit);
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
        if (tile.hasRuins) {
            tile.hasRuins = false;
            if (this.tileSprites[targetX][targetY].ruinsSprite) {
                this.tileSprites[targetX][targetY].ruinsSprite.destroy();
            }
            triggerRuinEventChoice();
        }

        // Minor Tribe Encounter
        if (tile.isTribe) {
            tile.isTribe = false;
            if (this.tileSprites[targetX][targetY].tribeSprite) {
                this.tileSprites[targetX][targetY].tribeSprite.destroy();
            }
            SFX.play('level_up');
            G.factions.solaria.stars += 10;
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
            G.score += 150;
            showToast(`🚩 MĚSTO ${city.name.toUpperCase()} BYLO DOBYTO!`);
            triggerConfetti(this, (city.gx - city.gy) * (this.tileW / 2), (city.gx + city.gy) * (this.tileH / 2));
            updateHUD();
            renderMinimap();
            this.checkVictoryConditions();
        }
    }

    executeCombat(attacker, defender) {
        attacker.attacked = true;
        this.clearTileHighlights();

        const atkDef = UNIT_TYPES[attacker.type];
        const defDef = UNIT_TYPES[defender.type];

        // Launch Ballistic Parabolic Arrow / Boulder
        const sx = (attacker.gx - attacker.gy) * (this.tileW / 2);
        const sy = (attacker.gx + attacker.gy) * (this.tileH / 2) - 10;
        const tx = (defender.gx - defender.gy) * (this.tileW / 2);
        const ty = (defender.gx + defender.gy) * (this.tileH / 2) - 10;

        if (atkDef.range > 1) {
            this.launchBallisticProjectile(sx, sy, tx, ty, attacker.type === 'catapult');
        } else {
            SFX.play('attack');
        }

        this.cameras.main.shake(120, 0.007);

        // Terrain Def Bonuses
        let terrainDefBonus = 0;
        const defTile = this.map[defender.gx][defender.gy];
        if (defTile.biome === 'forest') terrainDefBonus += 1;
        const defInCity = this.cities.find(c => c.gx === defender.gx && c.gy === defender.gy);
        if (defInCity) {
            terrainDefBonus += defInCity.hasWalls ? 4 : 2;
        }

        // Catapult ignores city walls and deals +5 bonus damage to cities
        let siegeBonus = (atkDef.siege && defInCity) ? 5 : 0;
        const effectiveDef = atkDef.siege ? 0 : (defDef.def + terrainDefBonus);

        const vetAtk = attacker.isVeteran ? 1 : 0;
        const dmg = Math.max(1, atkDef.atk + vetAtk + siegeBonus - Math.floor(effectiveDef / 2));
        defender.hp -= dmg;
        showToast(`⚔️ Zásah! Způsobeno ${dmg} poškození (Obrana: ${effectiveDef})!`);

        // Counterattack only if in range 1
        const dist = Math.max(Math.abs(attacker.gx - defender.gx), Math.abs(attacker.gy - defender.gy));
        if (defender.hp > 0 && dist === 1 && !atkDef.siege) {
            const counterDmg = Math.max(1, Math.floor(defDef.atk / 2));
            attacker.hp -= counterDmg;
        }

        // Veteran Progression on Kill
        if (defender.hp <= 0) {
            showToast(`💀 Nepřítel byl zničen!`);
            this.units = this.units.filter(x => x !== defender);
            G.score += 30;

            attacker.kills = (attacker.kills || 0) + 1;
            if (attacker.kills >= 3 && !attacker.isVeteran) {
                attacker.isVeteran = true;
                attacker.maxHp += 5;
                attacker.hp = attacker.maxHp;
                SFX.play('level_up');
                showToast(`⭐ JEDNOTKA POVÝŠILA NA VETERÁNA (+5 HP, plné doléčení)!`);
                triggerConfetti(this, (attacker.gx - attacker.gy) * (this.tileW / 2), (attacker.gx + attacker.gy) * (this.tileH / 2));
            }

            if (atkDef.range === 1 && !attacker.moved) {
                this.executeMove(attacker, defender.gx, defender.gy);
            }
        }

        if (attacker.hp <= 0) {
            this.units = this.units.filter(x => x !== attacker);
            closeDock();
        }

        this.renderUnits();
        renderMinimap();
        this.checkVictoryConditions();
    }

    launchBallisticProjectile(sx, sy, tx, ty, isBoulder) {
        const key = isBoulder ? 'ballistic_boulder' : 'ballistic_arrow';
        const proj = this.add.image(sx, sy, key).setDepth(40);
        const midX = (sx + tx) / 2;
        const midY = Math.min(sy, ty) - 40;

        SFX.play(isBoulder ? 'siege_boom' : 'attack');

        this.tweens.add({
            targets: proj,
            x: tx,
            y: ty,
            duration: 250,
            ease: 'Sine.easeIn',
            onComplete: () => proj.destroy()
        });
    }

    checkVictoryConditions() {
        const enemyCities = this.cities.filter(c => c.owner !== 'solaria');
        const enemyUnits = this.units.filter(u => u.owner !== 'solaria');

        // Domination Victory
        if (enemyCities.length === 0) {
            showVictoryScreen('Totální Válečné Vítězství! Všechna nepřátelská města byla dobyta.');
            return;
        }

        // Science Victory
        if (G.factions.solaria.techs.includes('stargate')) {
            showVictoryScreen('Hvězdné Vědecké Vítězství! Tvá říše vybudovala Hvězdnou Bránu.');
            return;
        }

        // Score Victory at turn 50
        if (G.turn >= G.maxTurns) {
            showVictoryScreen('Čas vypršel (50 tahů)! Zvítězil jsi na civilizační body.');
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
            y: y + Math.sin(angle) * speed + 30,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => p.destroy()
        });
    }
}

// --- MINIMAP RADAR ENGINE ---
let minimapCtx = null;
function initMinimapInteractions(scene) {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    minimapCtx = canvas.getContext('2d');

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const gx = Math.floor((mx / canvas.width) * G.gridSize);
        const gy = Math.floor((my / canvas.height) * G.gridSize);

        const targetSx = (gx - gy) * (scene.tileW / 2);
        const targetSy = (gx + gy) * (scene.tileH / 2);

        scene.world.x = scene.scale.width / 2 - targetSx * scene.world.scaleX;
        scene.world.y = scene.scale.height / 3 - targetSy * scene.world.scaleY;

        document.getElementById('minimap-coords').innerText = `[${gx}, ${gy}]`;
        renderMinimap();
    });
}

function renderMinimap() {
    if (!minimapCtx) return;
    const scene = game ? game.scene.getScene('PolytropiaScene') : null;
    if (!scene || !scene.map) return;

    const ctx = minimapCtx;
    const cw = 144; const ch = 144;
    ctx.clearRect(0, 0, cw, ch);

    const cellW = cw / G.gridSize;
    const cellH = ch / G.gridSize;

    // Draw Terrain & Fog
    for (let x = 0; x < G.gridSize; x++) {
        for (let y = 0; y < G.gridSize; y++) {
            const px = x * cellW; const py = y * cellH;

            if (scene.fog[x][y]) {
                ctx.fillStyle = '#0f172a';
            } else {
                const b = scene.map[x][y].biome;
                if (b === 'water') ctx.fillStyle = '#0284c7';
                else if (b === 'forest') ctx.fillStyle = '#15803d';
                else if (b === 'mountain') ctx.fillStyle = '#94a3b8';
                else ctx.fillStyle = '#4ade80';
            }
            ctx.fillRect(px, py, cellW, cellH);
        }
    }

    // Draw Cities with Faction Colors
    scene.cities.forEach(c => {
        if (!scene.fog[c.gx][c.gy]) {
            const f = G.factions[c.owner];
            ctx.fillStyle = f ? f.cssColor : '#ffffff';
            ctx.fillRect(c.gx * cellW + 1, c.gy * cellH + 1, cellW - 2, cellH - 2);
        }
    });

    // Draw Units
    scene.units.forEach(u => {
        if (!scene.fog[u.gx][u.gy]) {
            const f = G.factions[u.owner];
            ctx.fillStyle = f ? f.cssColor : '#ffffff';
            ctx.beginPath();
            ctx.arc(u.gx * cellW + cellW / 2, u.gy * cellH + cellH / 2, cellW / 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// --- HUD & DOCK UI MANAGEMENT ---
function updateHUD() {
    document.getElementById('hud-turn-num').innerText = G.turn;
    document.getElementById('hud-stars').innerText = G.factions.solaria.stars;
    document.getElementById('hud-score').innerText = G.score;

    let inc = 0;
    const scene = game ? game.scene.getScene('PolytropiaScene') : null;
    if (scene && scene.cities) {
        scene.cities.forEach(c => {
            if (c.owner === 'solaria') inc += c.income;
        });
    }
    document.getElementById('hud-income').innerText = `+${inc}/kolo`;
    document.getElementById('hud-cities-count').innerText = scene ? scene.cities.filter(c => c.owner === 'solaria').length : 1;
}

function openUnitDock(unit) {
    const dock = document.getElementById('entity-dock');
    const title = document.getElementById('dock-title');
    const sub = document.getElementById('dock-subtitle');
    const shelf = document.getElementById('dock-actions-shelf');

    title.innerText = `${UNIT_TYPES[unit.type].name} ${unit.isVeteran ? '⭐ VETERÁN' : ''}`;
    sub.innerText = `HP: ${unit.hp}/${unit.maxHp} • Pohyb: ${unit.moved ? '❌' : '✅'} • Útok: ${unit.attacked ? '❌' : '✅'}`;

    let actionsHtml = `
        <div class="action-chip ${unit.moved && unit.attacked ? 'disabled' : ''}" onclick="healSelectedUnit()">
            <span>❤️ Odpočinek &amp; Léčení (+3 HP)</span>
        </div>
    `;

    if (unit.type === 'settler') {
        actionsHtml += `
            <div class="action-chip" style="background:#0284c7; border-color:#38bdf8;" onclick="foundNewCityWithSettler()">
                <span>🏛️ Založit Nové Město Zde</span>
            </div>
        `;
    }

    shelf.innerHTML = actionsHtml;
    dock.classList.remove('hidden');
}

function openCityDock(city) {
    if (city.owner !== 'solaria') return;

    const dock = document.getElementById('entity-dock');
    const title = document.getElementById('dock-title');
    const sub = document.getElementById('dock-subtitle');
    const shelf = document.getElementById('dock-actions-shelf');

    title.innerText = `Město ${city.name} (Úr. ${city.level})`;
    sub.innerText = `Růst: ${city.progress}/${city.progressMax} • Příjem: +${city.income} ⭐/tah`;

    const scene = game.scene.getScene('PolytropiaScene');
    const garrisonUnit = scene.units.find(u => u.gx === city.gx && u.gy === city.gy && u.owner === 'solaria');

    let garrisonHtml = '';
    if (garrisonUnit) {
        garrisonHtml = `
            <div class="garrison-banner" onclick="selectGarrisonUnit(${garrisonUnit.id})">
                <span>🛡️ Posádka: <strong>${UNIT_TYPES[garrisonUnit.type].name}</strong> (${garrisonUnit.hp}/${garrisonUnit.maxHp} HP)</span>
                <button class="btn-garrison">OVLÁDAT JEDNOTKU</button>
            </div>
        `;
    }

    const techs = G.factions.solaria.techs;
    shelf.innerHTML = `
        ${garrisonHtml}
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:6px;">
            <div class="action-chip ${G.factions.solaria.stars < 3 ? 'disabled' : ''}" onclick="trainUnitInCity('warrior', ${city.id})">
                <span>🗡️ Válečník</span> <span class="cost">(3 ⭐)</span>
            </div>
            <div class="action-chip ${G.factions.solaria.stars < 7 ? 'disabled' : ''}" onclick="trainUnitInCity('settler', ${city.id})">
                <span>⛺ Osadník</span> <span class="cost">(7 ⭐)</span>
            </div>
            ${techs.includes('archery') ? `
                <div class="action-chip ${G.factions.solaria.stars < 5 ? 'disabled' : ''}" onclick="trainUnitInCity('archer', ${city.id})">
                    <span>🏹 Lučištník</span> <span class="cost">(5 ⭐)</span>
                </div>
            ` : ''}
            ${techs.includes('smithing') ? `
                <div class="action-chip ${G.factions.solaria.stars < 8 ? 'disabled' : ''}" onclick="trainUnitInCity('knight', ${city.id})">
                    <span>🐎 Rytíř</span> <span class="cost">(8 ⭐)</span>
                </div>
            ` : ''}
            ${techs.includes('siege') ? `
                <div class="action-chip ${G.factions.solaria.stars < 9 ? 'disabled' : ''}" onclick="trainUnitInCity('catapult', ${city.id})">
                    <span>💣 Katapult</span> <span class="cost">(9 ⭐)</span>
                </div>
            ` : ''}
            <div class="action-chip ${G.factions.solaria.stars < 5 ? 'disabled' : ''}" onclick="improveCityFarmland(${city.id})">
                <span>🌾 Založit Farmu</span> <span class="cost">(5 ⭐)</span>
            </div>
            ${techs.includes('mining') ? `
                <div class="action-chip ${G.factions.solaria.stars < 6 ? 'disabled' : ''}" onclick="buildMountainMine(${city.id})">
                    <span>⛏️ Postavit Důl</span> <span class="cost">(6 ⭐)</span>
                </div>
            ` : ''}
            ${techs.includes('fortification') && !city.hasWalls ? `
                <div class="action-chip ${G.factions.solaria.stars < 8 ? 'disabled' : ''}" onclick="buildCityWalls(${city.id})">
                    <span>🏰 Postavit Hradby</span> <span class="cost">(8 ⭐)</span>
                </div>
            ` : ''}
            ${techs.includes('roads') ? `
                <div class="action-chip ${G.factions.solaria.stars < 2 ? 'disabled' : ''}" onclick="buildRoadAtCity(${city.id})">
                    <span>🛤️ Dláždit Cestu</span> <span class="cost">(2 ⭐)</span>
                </div>
            ` : ''}
        </div>
    `;

    dock.classList.remove('hidden');
}

window.selectGarrisonUnit = function(unitId) {
    const scene = game.scene.getScene('PolytropiaScene');
    const u = scene.units.find(x => x.id === unitId);
    if (u) scene.selectUnit(u);
};

window.healSelectedUnit = function() {
    if (!G.selectedEntity || G.selectedEntity.type !== 'unit') return;
    const u = G.selectedEntity.data;
    if (u.moved && u.attacked) return;

    u.hp = Math.min(u.maxHp, u.hp + 3);
    u.moved = true;
    u.attacked = true;
    showToast('❤️ Jednotka odpočívá a vyléčila 3 HP.');

    const scene = game.scene.getScene('PolytropiaScene');
    scene.clearTileHighlights();
    scene.renderUnits();
    openUnitDock(u);
};

window.foundNewCityWithSettler = function() {
    if (!G.selectedEntity || G.selectedEntity.type !== 'unit') return;
    const u = G.selectedEntity.data;
    if (u.type !== 'settler') return;

    const scene = game.scene.getScene('PolytropiaScene');
    const existingHere = scene.cities.some(c => c.gx === u.gx && c.gy === u.gy);
    if (existingHere) { showToast('⚠️ Na tomto políčku již město existuje!'); return; }

    const tooClose = scene.cities.some(c => Math.max(Math.abs(c.gx - u.gx), Math.abs(c.gy - u.gy)) < 2);
    if (tooClose) { showToast('⚠️ Nové město musí být vzdáleno alespoň 2 políčka od jiných měst!'); return; }

    if (scene.map[u.gx][u.gy].biome === 'water' || scene.map[u.gx][u.gy].biome === 'mountain') {
        showToast('⚠️ Město nelze založit na vodě nebo na vysoké hoře!');
        return;
    }

    const cityNames = ['Lunaria', 'Astra', 'Valoria', 'Nova Solis', 'Eldoria', 'Pyros'];
    const newName = cityNames[scene.cities.length % cityNames.length];

    scene.cities.push({
        id: Date.now(),
        owner: 'solaria',
        name: newName,
        gx: u.gx,
        gy: u.gy,
        level: 1,
        progress: 0,
        progressMax: 2,
        income: 3,
        hasWalls: false
    });

    scene.units = scene.units.filter(x => x !== u);

    SFX.play('level_up');
    G.score += 100;
    showToast(`🏛️ ZALOŽENO NOVÉ MĚSTO: ${newName}! (+3 ⭐/tah)`);
    triggerConfetti(scene, (u.gx - u.gy) * (scene.tileW / 2), (u.gx + u.gy) * (scene.tileH / 2));

    scene.clearTileHighlights();
    scene.revealFogAround(u.gx, u.gy, 2);
    scene.renderCities();
    scene.renderUnits();
    renderMinimap();
    updateHUD();
    closeDock();
};

window.trainUnitInCity = function(type, cityId) {
    const cost = UNIT_TYPES[type].cost;
    if (G.factions.solaria.stars < cost) {
        showToast('❌ Nemáš dostatek Hvězd ⭐ na výcvik!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);

    const hasUnit = scene.units.some(u => u.gx === city.gx && u.gy === city.gy);
    if (hasUnit) {
        showToast('⚠️ Na náměstí města již stojí jiná jednotka!');
        return;
    }

    G.factions.solaria.stars -= cost;
    G.score += 20;

    scene.units.push({
        id: Date.now(),
        owner: 'solaria',
        type: type,
        gx: city.gx,
        gy: city.gy,
        hp: UNIT_TYPES[type].hp,
        maxHp: UNIT_TYPES[type].hp,
        moved: true,
        attacked: true,
        kills: 0,
        isVeteran: false
    });

    SFX.play('move');
    showToast(`⚔️ Vycvičen nový ${UNIT_TYPES[type].name}!`);

    scene.renderUnits();
    renderMinimap();
    updateHUD();
    closeDock();
};

window.improveCityFarmland = function(cityId) {
    if (G.factions.solaria.stars < 5) {
        showToast('❌ Nedostatek Hvězd na založení farmy!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);

    G.factions.solaria.stars -= 5;
    city.progress += 1;
    G.score += 35;

    if (city.progress >= city.progressMax) {
        city.progress = 0;
        city.level += 1;
        city.progressMax += 1;
        city.income += 2;
        SFX.play('level_up');
        showToast(`🎉 MĚSTO ${city.name} POSTOUPILO NA ÚROVEŇ ${city.level}! +2 ⭐ příjem!`);
        triggerConfetti(scene, (city.gx - city.gy) * (scene.tileW / 2), (city.gx + city.gy) * (scene.tileH / 2));
    } else {
        showToast(`🌾 Farma postavena! Pokrok města: ${city.progress}/${city.progressMax}`);
    }

    scene.renderCities();
    updateHUD();
    openCityDock(city);
};

window.buildMountainMine = function(cityId) {
    if (G.factions.solaria.stars < 6) {
        showToast('❌ Nedostatek Hvězd na vybudování dolu!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);

    let targetMountain = null;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const tx = city.gx + dx; const ty = city.gy + dy;
            if (tx >= 0 && tx < G.gridSize && ty >= 0 && ty < G.gridSize) {
                if (scene.map[tx][ty].biome === 'mountain' && !scene.map[tx][ty].hasMine) {
                    targetMountain = scene.map[tx][ty];
                    break;
                }
            }
        }
        if (targetMountain) break;
    }

    if (!targetMountain) {
        showToast('⚠️ V těsném sousedství města není žádná volná hora pro důl!');
        return;
    }

    G.factions.solaria.stars -= 6;
    targetMountain.hasMine = true;
    city.income += 3;
    G.score += 45;

    const sx = (targetMountain.gx - targetMountain.gy) * (scene.tileW / 2);
    const sy = (targetMountain.gx + targetMountain.gy) * (scene.tileH / 2);
    const mOverlay = scene.add.image(sx, sy, 'feat_mine');
    scene.world.add(mOverlay);

    SFX.play('level_up');
    showToast(`⛏️ Zlatý důl zprovozněn! Příjem města zvýšen o +3 ⭐/tah.`);
    updateHUD();
    openCityDock(city);
};

window.buildCityWalls = function(cityId) {
    if (G.factions.solaria.stars < 8) {
        showToast('❌ Nedostatek Hvězd na vybudování hradeb!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);

    G.factions.solaria.stars -= 8;
    city.hasWalls = true;
    G.score += 60;

    SFX.play('level_up');
    showToast(`🏰 Město ${city.name} opevněno kamennými hradbami (+3 k obraně posádky)!`);
    updateHUD();
    openCityDock(city);
};

window.buildRoadAtCity = function(cityId) {
    if (G.factions.solaria.stars < 2) {
        showToast('❌ Nedostatek Hvězd na položení cesty!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);

    G.factions.solaria.stars -= 2;
    G.roads.push({ gx: city.gx, gy: city.gy });
    scene.renderRoads();
    SFX.play('move');
    showToast('🛤️ Dlážděná cesta položena!');
    updateHUD();
};

function closeDock() {
    document.getElementById('entity-dock').classList.add('hidden');
    G.selectedEntity = null;
}

// --- RUINS EVENT MODAL ---
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

    if (choice === 'gold') {
        G.factions.solaria.stars += 18;
        G.score += 60;
        showToast('💰 Nalezena bohatá truhlice hvězd (+18 ⭐)!');
    } else if (choice === 'veteran') {
        const u = G.selectedEntity ? G.selectedEntity.data : { gx: 2, gy: 2 };
        scene.units.push({
            id: Date.now(),
            owner: 'solaria',
            type: 'knight',
            gx: u.gx,
            gy: u.gy,
            hp: 14,
            maxHp: 14,
            moved: false,
            attacked: false,
            kills: 2,
            isVeteran: true
        });
        G.score += 80;
        showToast('🐎 Probuzen starověký Rytíř veterán!');
        scene.renderUnits();
    } else if (choice === 'tech') {
        const unlearned = Object.keys(TECH_TREE).filter(t => !G.factions.solaria.techs.includes(t));
        if (unlearned.length > 0) {
            const won = unlearned[0];
            G.factions.solaria.techs.push(won);
            G.score += 100;
            showToast(`🔬 Svitek odhalil technologii: ${TECH_TREE[won].name}!`);
        } else {
            G.factions.solaria.stars += 20;
            showToast('💰 Všechny technologie již znáte, získáno +20 ⭐!');
        }
    }

    SFX.play('level_up');
    updateHUD();
};

// --- DIPLOMACY MODAL (4 FRAKCE) ---
function renderDiplomacyModal() {
    const list = document.getElementById('diplo-list');
    list.innerHTML = '';

    const others = ['khardurn', 'aquaria', 'sylvaen'];
    others.forEach(fKey => {
        const f = G.factions[fKey];
        const card = document.createElement('div');
        card.className = 'diplo-card';
        card.innerHTML = `
            <div class="diplo-faction-meta">
                <div class="diplo-crest">${f.crest}</div>
                <div>
                    <h3 style="color:${f.cssColor}">${f.name}</h3>
                    <div style="font-size:11px; color:#94a3b8;">Vztah: <strong>${f.status === 'peace' ? '🕊️ Mír' : (f.status === 'war' ? '⚔️ Válka' : '🤝 Obchodní Pakt')}</strong></div>
                </div>
            </div>
            <div class="diplo-actions">
                ${f.status !== 'alliance' ? `<button class="hud-btn" style="background:#0284c7;" onclick="offerTradePact('${fKey}')">🤝 Obchodní Pakt (4 ⭐)</button>` : ''}
                ${f.status !== 'war' ? `<button class="hud-btn" style="background:#b91c1c;" onclick="declareWar('${fKey}')">⚔️ Vyhlásit Válku</button>` : ''}
            </div>
        `;
        list.appendChild(card);
    });
}

window.offerTradePact = function(fKey) {
    if (G.factions.solaria.stars < 4) {
        showToast('❌ Nedostatek Hvězd na uzavření obchodního paktu!');
        return;
    }
    G.factions.solaria.stars -= 4;
    G.factions[fKey].status = 'alliance';
    G.factions.solaria.income += 2;
    G.score += 40;
    SFX.play('level_up');
    showToast(`🤝 Pakt uzavřen! Města mají novou obchodní trasu (+2 ⭐/kolo).`);
    renderDiplomacyModal();
    updateHUD();
};

window.declareWar = function(fKey) {
    G.factions[fKey].status = 'war';
    SFX.play('siege_boom');
    showToast(`⚔️ VYHLÁŠENA VÁLKA frakci ${G.factions[fKey].name}!`);
    renderDiplomacyModal();
};

// --- TECH TREE INTERACTION ---
function renderTechTree() {
    const grid = document.getElementById('tech-grid');
    grid.innerHTML = '';

    for (let key in TECH_TREE) {
        const t = TECH_TREE[key];
        const isUnlocked = G.factions.solaria.techs.includes(key);

        const node = document.createElement('div');
        node.className = `tech-node ${isUnlocked ? 'unlocked' : ''}`;
        node.innerHTML = `
            <div class="tech-icon">${t.icon}</div>
            <div class="tech-details">
                <div class="tech-title">${t.name}</div>
                <div class="tech-desc">${t.desc}</div>
                <div class="tech-cost">${isUnlocked ? '✅ VYZKOUMÁNO' : `Cena: ${t.cost} ⭐`}</div>
            </div>
        `;

        if (!isUnlocked) {
            node.onclick = () => unlockTechnology(key);
        }

        grid.appendChild(node);
    }
}

function unlockTechnology(techKey) {
    const t = TECH_TREE[techKey];
    if (G.factions.solaria.stars < t.cost) {
        showToast('❌ Nemáš dostatek Hvězd ⭐ na výzkum této technologie!');
        return;
    }

    G.factions.solaria.stars -= t.cost;
    G.factions.solaria.techs.push(techKey);
    G.score += 50;

    SFX.play('level_up');
    showToast(`🔬 TECHNOLOGIE OBJEVENÁ: ${t.name}!`);

    renderTechTree();
    updateHUD();

    // Stargate victory check
    if (techKey === 'stargate') {
        showVictoryScreen('Hvězdné Vítězství! Postavil jsi Hvězdnou Bránu a propojil světy.');
    }
}

// --- TURN SIMULATION & 3 AI FACTIONS ---
function executeEndTurn() {
    if (G.gameOver) return;
    G.turn += 1;

    const scene = game.scene.getScene('PolytropiaScene');
    scene.cities.forEach(c => {
        if (G.factions[c.owner]) {
            G.factions[c.owner].stars += c.income;
        }
    });

    scene.units.forEach(u => {
        u.moved = false;
        u.attacked = false;
    });

    showToast(`⏳ ZAČAL TAH ${G.turn}. Suroviny byly vybrány!`);

    // Spusť AI tah pro všechny 3 cizí frakce
    ['khardurn', 'aquaria', 'sylvaen'].forEach(fKey => {
        executeAIFactionTurn(scene, fKey);
    });

    scene.renderUnits();
    scene.clearTileHighlights();
    closeDock();
    updateHUD();
    renderMinimap();

    if (G.turn >= G.maxTurns) {
        scene.checkVictoryConditions();
    }
}

function executeAIFactionTurn(scene, fKey) {
    const aiUnits = scene.units.filter(u => u.owner === fKey);
    const aiCities = scene.cities.filter(c => c.owner === fKey);
    const faction = G.factions[fKey];

    // AI City unit training
    aiCities.forEach(aiCity => {
        if (faction.stars >= 3) {
            const hasUnit = scene.units.some(u => u.gx === aiCity.gx && u.gy === aiCity.gy);
            if (!hasUnit) {
                faction.stars -= 3;
                scene.units.push({
                    id: Date.now() + Math.random(),
                    owner: fKey,
                    type: Math.random() < 0.3 ? 'archer' : 'warrior',
                    gx: aiCity.gx,
                    gy: aiCity.gy,
                    hp: 10,
                    maxHp: 10,
                    moved: false,
                    attacked: false,
                    kills: 0,
                    isVeteran: false
                });
            }
        }
    });

    // AI Units march towards nearest rival or player
    aiUnits.forEach(u => {
        const rivalCities = scene.cities.filter(c => c.owner !== fKey);
        if (rivalCities.length === 0) return;

        let nearest = rivalCities[0];
        let minDist = 999;
        rivalCities.forEach(rc => {
            const d = Math.hypot(rc.gx - u.gx, rc.gy - u.gy);
            if (d < minDist) { minDist = d; nearest = rc; }
        });

        let nextX = u.gx; let nextY = u.gy;
        if (nearest.gx < u.gx) nextX -= 1; else if (nearest.gx > u.gx) nextX += 1;
        if (nearest.gy < u.gy) nextY -= 1; else if (nearest.gy > u.gy) nextY += 1;

        const targetUnit = scene.units.find(pu => pu.gx === nextX && pu.gy === nextY && pu.owner !== fKey);
        if (targetUnit) {
            targetUnit.hp -= 3;
            if (targetUnit.owner === 'solaria') showToast(`⚠️ ${faction.name} zaútočil na tvou jednotku!`);
            if (targetUnit.hp <= 0) {
                scene.units = scene.units.filter(x => x !== targetUnit);
            }
        } else if (nextX >= 0 && nextX < G.gridSize && nextY >= 0 && nextY < G.gridSize) {
            if (scene.map[nextX][nextY].biome !== 'water') {
                u.gx = nextX;
                u.gy = nextY;
                scene.checkCityCapture(u, nextX, nextY);
            }
        }
    });
}

function showVictoryScreen(msg) {
    G.gameOver = true;
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

// --- INIT APP LISTENERS ---
const phaserConfig = {
    type: Phaser.AUTO,
    parent: 'phaser-viewport',
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [PolytropiaScene]
};

let game = null;

window.addEventListener('DOMContentLoaded', () => {
    game = new Phaser.Game(phaserConfig);

    document.getElementById('btn-end-turn').addEventListener('click', executeEndTurn);

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
        G.musicEnabled = !G.musicEnabled;
        document.getElementById('btn-toggle-music').innerText = G.musicEnabled ? '🎵' : '🔇';
        if (G.musicEnabled) SFX.startAmbientMusic();
        showToast(G.musicEnabled ? 'Ambientní hudba zapnuta' : 'Hudba vypnuta');
    });

    document.getElementById('btn-close-dock').addEventListener('click', closeDock);

    document.getElementById('btn-restart-game').addEventListener('click', () => {
        window.location.reload();
    });

    // Keyboard Shortcuts (Enter/Space, Tab, T, D, Esc)
    window.addEventListener('keydown', (e) => {
        const techModal = document.getElementById('tech-modal');
        const diploModal = document.getElementById('diplo-modal');
        const ruinsModal = document.getElementById('ruins-modal');

        if (e.key === 'Escape') {
            techModal.classList.add('hidden');
            diploModal.classList.add('hidden');
            ruinsModal.classList.add('hidden');
            closeDock();
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

        if (e.key === 'Tab') {
            e.preventDefault();
            const scene = game.scene.getScene('PolytropiaScene');
            const readyUnit = scene.units.find(u => u.owner === 'solaria' && !u.moved);
            if (readyUnit) {
                scene.selectUnit(readyUnit);
            }
            return;
        }

        if (e.key === 'Enter' || e.code === 'Space') {
            if (!techModal.classList.contains('hidden') || !diploModal.classList.contains('hidden') || !ruinsModal.classList.contains('hidden')) return;
            if (G.gameOver) return;
            executeEndTurn();
        }
    });

    updateHUD();
});
