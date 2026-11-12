/**
 * Polytropia: Civilizace Hvězd (Tahová 4X Strategie - Expanded v3.0)
 * Kompletně přepracováno na základě auditu herního designera a playtestera:
 * 1. Radarová MINIMAPA s klikatelným posunem kamery a real-time trackingem
 * 2. Posádka města: Banner pro okamžité ovládání jednotky stojící ve městě
 * 3. Obléhání a útok na města: Eliminace AI a totální nadvláda
 * 4. Vysoce detailní vektorové textury jednotek (štít, helma, plášť, meč, oř, člun)
 * 5. Expanze Tech Tree na 7 technologií včetně Mořeplavby (plavba po vodě v loďkách) a Hradeb
 * 6. Zpomalené, hlubší tempo na 50 tahů se strategickými bonusy terénu
 */

// --- GLOBAL GAME STATE ---
const G = {
    turn: 1,
    maxTurns: 50, // Zpomalené tempo pro delší a hlubší partii
    score: 120,
    player: {
        id: 'player',
        name: 'Impérium Solaria',
        color: 0x38bdf8,
        stars: 14,
        unlockedTechs: ['farming']
    },
    ai: {
        id: 'ai',
        name: 'Klan Ocelových Hor',
        color: 0xef4444,
        stars: 12,
        unlockedTechs: ['mining']
    },
    gridSize: 15,
    selectedEntity: null,
    gameOver: false
};

// --- DATA DEFINITIONS (Expanded 7 Techs) ---
const TECH_TREE = {
    farming: {
        name: 'Zemědělství',
        icon: '🌾',
        cost: 5,
        desc: 'Umožňuje stavět farmy na polích (+2 Růst města).',
        unlocked: true
    },
    mining: {
        name: 'Hornictví',
        icon: '⛏️',
        cost: 7,
        desc: 'Umožňuje hloubit zlaté doly na horách (+3 Hvězdy/tah).',
        unlocked: false
    },
    archery: {
        name: 'Lukostřelba',
        icon: '🏹',
        cost: 8,
        desc: 'Odemyká výcvik Lučištníků (střelba přes 2 políčka bez protiútoku!).',
        unlocked: false
    },
    sailing: {
        name: 'Mořeplavba',
        icon: '⛵',
        cost: 9,
        desc: 'Jednotky mohou vstupovat na vodu (promění se v loď) a stavět Přístavy (+3 ⭐/tah).',
        unlocked: false
    },
    smithing: {
        name: 'Kovářství',
        icon: '⚔️',
        cost: 11,
        desc: 'Odemyká Rytíře na koních s vysokým poškozením a pohybem 2 políčka.',
        unlocked: false
    },
    fortification: {
        name: 'Opevnění & Hradby',
        icon: '🏰',
        cost: 10,
        desc: 'Stavba kamenných hradeb na městech (+3 k obraně jednotky uvnitř).',
        unlocked: false
    },
    diplomacy: {
        name: 'Diplomacie & Obchod',
        icon: '📜',
        cost: 12,
        desc: 'Zřizuje obchodní cesty mezi městy (+4 Hvězdy/tah).',
        unlocked: false
    }
};

const UNIT_TYPES = {
    warrior: { name: 'Válečník', icon: '🗡️', hp: 10, maxHp: 10, atk: 4, def: 2, range: 1, move: 1, cost: 3 },
    archer: { name: 'Lučištník', icon: '🏹', hp: 8, maxHp: 8, atk: 3, def: 1, range: 2, move: 1, cost: 5 },
    knight: { name: 'Rytíř', icon: '🐎', hp: 14, maxHp: 14, atk: 6, def: 3, range: 1, move: 2, cost: 8 },
    settler: { name: 'Osadník', icon: '⛺', hp: 6, maxHp: 6, atk: 0, def: 1, range: 1, move: 1, cost: 7 },
    boat: { name: 'Válečný Člun', icon: '⛵', hp: 12, maxHp: 12, atk: 4, def: 2, range: 2, move: 2, cost: 0 }
};

// --- PROCEDURAL AUDIO ---
class CivAudioEngine {
    constructor() {
        this.ctx = null;
    }
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
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
        } else if (sound === 'fog') {
            const bSize = this.ctx.sampleRate * 0.15;
            const buffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, t);
            filter.frequency.exponentialRampToValueAtTime(100, t + 0.15);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.25, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            noise.connect(filter);
            filter.connect(g);
            g.connect(this.ctx.destination);
            noise.start(t);
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

// --- DETAILNÍ VEKTOROVÉ TEXTURY JEDNOTEK A TERÉNU ---
function generatePolytopiaTextures(scene) {
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });

    // 1. Plain Grass Tile
    if (!scene.textures.exists('tile_plain')) {
        gfx.clear();
        gfx.fillStyle(0x4ade80, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0); gfx.lineTo(64, 16); gfx.lineTo(32, 32); gfx.lineTo(0, 16);
        gfx.closePath();
        gfx.fillPath();
        gfx.lineStyle(1, 0x22c55e, 0.9);
        gfx.strokePath();
        gfx.generateTexture('tile_plain', 64, 32);
    }

    // 2. Forest Tile
    if (!scene.textures.exists('tile_forest')) {
        gfx.clear();
        gfx.fillStyle(0x16a34a, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0); gfx.lineTo(64, 16); gfx.lineTo(32, 32); gfx.lineTo(0, 16);
        gfx.closePath();
        gfx.fillPath();
        gfx.fillStyle(0x14532d, 1);
        gfx.fillTriangle(32, -6, 22, 16, 42, 16);
        gfx.generateTexture('tile_forest', 64, 32);
    }

    // 3. Mountain Tile
    if (!scene.textures.exists('tile_mountain')) {
        gfx.clear();
        gfx.fillStyle(0x64748b, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0); gfx.lineTo(64, 16); gfx.lineTo(32, 32); gfx.lineTo(0, 16);
        gfx.closePath();
        gfx.fillPath();
        gfx.fillStyle(0x94a3b8, 1);
        gfx.fillTriangle(32, -14, 16, 16, 48, 16);
        gfx.fillStyle(0xf8fafc, 1);
        gfx.fillTriangle(32, -14, 26, -4, 38, -4);
        gfx.generateTexture('tile_mountain', 64, 32);
    }

    // 4. Ocean / Water Tile
    if (!scene.textures.exists('tile_water')) {
        gfx.clear();
        gfx.fillStyle(0x0284c7, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0); gfx.lineTo(64, 16); gfx.lineTo(32, 32); gfx.lineTo(0, 16);
        gfx.closePath();
        gfx.fillPath();
        gfx.lineStyle(1, 0x38bdf8, 0.7);
        gfx.strokePath();
        gfx.generateTexture('tile_water', 64, 32);
    }

    // 5. Cloud Fog
    if (!scene.textures.exists('cloud_fog')) {
        gfx.clear();
        gfx.fillStyle(0x1e293b, 1);
        gfx.fillCircle(32, 16, 26);
        gfx.fillCircle(20, 16, 18);
        gfx.fillCircle(44, 16, 18);
        gfx.generateTexture('cloud_fog', 64, 36);
    }

    // 6. Ancient Ruins
    if (!scene.textures.exists('feat_ruins')) {
        gfx.clear();
        gfx.fillStyle(0xd97706, 1);
        gfx.fillRect(24, 6, 16, 18);
        gfx.fillStyle(0xf59e0b, 1);
        gfx.fillTriangle(20, 6, 32, -6, 44, 6);
        gfx.generateTexture('feat_ruins', 64, 32);
    }

    // 7. City Bastion Icon
    if (!scene.textures.exists('entity_city')) {
        gfx.clear();
        gfx.fillStyle(0x334155, 1);
        gfx.lineStyle(2, 0x0f172a, 1);
        gfx.fillRect(16, 10, 32, 30);
        gfx.strokeRect(16, 10, 32, 30);
        gfx.fillStyle(0x1e293b, 1);
        gfx.fillRect(10, 4, 12, 36);
        gfx.fillRect(42, 4, 12, 36);
        gfx.generateTexture('entity_city', 64, 48);
    }

    // 8. Detailní Válečník (Warrior: Helm, Cape, Round Shield, Sword)
    if (!scene.textures.exists('unit_warrior')) {
        gfx.clear();
        // Shield
        gfx.fillStyle(0x1e293b, 1);
        gfx.lineStyle(2, 0xffffff, 1);
        gfx.fillCircle(20, 22, 14);
        gfx.strokeCircle(20, 22, 14);
        // Armored Helm
        gfx.fillStyle(0x94a3b8, 1);
        gfx.fillCircle(20, 14, 8);
        // Sword Blade with glint
        gfx.lineStyle(3, 0x38bdf8, 1);
        gfx.beginPath();
        gfx.moveTo(12, 30); gfx.lineTo(28, 10);
        gfx.strokePath();
        gfx.generateTexture('unit_warrior', 44, 44);
    }

    // 9. Detailní Lučištník (Archer: Hood, Recurve Bow, Quiver)
    if (!scene.textures.exists('unit_archer')) {
        gfx.clear();
        // Hood
        gfx.fillStyle(0x15803d, 1);
        gfx.fillCircle(20, 15, 8);
        // Quiver on back
        gfx.fillStyle(0x78350f, 1);
        gfx.fillRect(26, 10, 6, 16);
        // Curved Bow
        gfx.lineStyle(2, 0xfacc15, 1);
        gfx.beginPath();
        gfx.arc(16, 22, 10, -Math.PI / 2, Math.PI / 2);
        gfx.strokePath();
        gfx.generateTexture('unit_archer', 44, 44);
    }

    // 10. Detailní Rytíř (Knight: Armored Charger Steed & Lance)
    if (!scene.textures.exists('unit_knight')) {
        gfx.clear();
        // Steed body
        gfx.fillStyle(0x78350f, 1);
        gfx.fillRoundedRect(8, 20, 28, 16, 6);
        // Steed Head
        gfx.fillCircle(34, 16, 7);
        // Knight Rider with plume
        gfx.fillStyle(0x94a3b8, 1);
        gfx.fillCircle(18, 12, 6);
        gfx.fillStyle(0xef4444, 1);
        gfx.fillTriangle(18, 6, 14, 0, 22, 0); // Plume
        // Lance
        gfx.lineStyle(3, 0xfde047, 1);
        gfx.beginPath();
        gfx.moveTo(16, 16); gfx.lineTo(38, 4);
        gfx.strokePath();
        gfx.generateTexture('unit_knight', 48, 44);
    }

    // 11. Detailní Osadník (Settler: Covered Pioneer Wagon & Flag)
    if (!scene.textures.exists('unit_settler')) {
        gfx.clear();
        // Wooden cart
        gfx.fillStyle(0x78350f, 1);
        gfx.fillRect(10, 22, 24, 10);
        // White canvas cover
        gfx.fillStyle(0xf8fafc, 1);
        gfx.lineStyle(1, 0x94a3b8, 1);
        gfx.fillRoundedRect(10, 12, 24, 12, 6);
        gfx.strokeRoundedRect(10, 12, 24, 12, 6);
        // Wheels
        gfx.fillStyle(0x451a03, 1);
        gfx.fillCircle(14, 32, 4);
        gfx.fillCircle(30, 32, 4);
        gfx.generateTexture('unit_settler', 44, 44);
    }

    // 12. Válečný Člun (Boat: Hull, Mast, Striped Sail)
    if (!scene.textures.exists('unit_boat')) {
        gfx.clear();
        // Wooden boat hull
        gfx.fillStyle(0x78350f, 1);
        gfx.beginPath();
        gfx.moveTo(6, 26); gfx.lineTo(38, 26); gfx.lineTo(32, 34); gfx.lineTo(12, 34);
        gfx.closePath();
        gfx.fillPath();
        // Sail
        gfx.fillStyle(0x38bdf8, 1);
        gfx.fillTriangle(22, 6, 22, 24, 36, 24);
        gfx.generateTexture('unit_boat', 44, 44);
    }

    // 13. Features (Farm, Mine, Wall)
    if (!scene.textures.exists('feat_farm')) {
        gfx.clear();
        gfx.fillStyle(0xfacc15, 0.9);
        gfx.fillRoundedRect(14, 6, 36, 20, 4);
        gfx.generateTexture('feat_farm', 64, 32);
    }
    if (!scene.textures.exists('feat_mine')) {
        gfx.clear();
        gfx.fillStyle(0xf59e0b, 1);
        gfx.fillCircle(32, 10, 8);
        gfx.fillStyle(0x1e293b, 1);
        gfx.fillRect(28, 6, 8, 8);
        gfx.generateTexture('feat_mine', 64, 32);
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

        this.cameras.main.setBackgroundColor('#090d16');
        this.world = this.add.container(this.scale.width / 2, this.scale.height / 3);

        this.tileW = 64;
        this.tileH = 32;

        this.initWorldMapData();
        this.renderMapTiles();
        this.renderCities();
        this.renderUnits();
        this.renderFogOfWar();
        this.setupCameraPanning();

        // Reveal Fog around starting player city
        this.revealFogAround(3, 3, 2);

        this.scale.on('resize', (gameSize) => {
            this.world.setPosition(gameSize.width / 2, gameSize.height / 3);
            renderMinimap();
        });

        // Initialize Minimap Canvas
        initMinimapInteractions(this);
        renderMinimap();
    }

    initWorldMapData() {
        this.map = [];
        this.fog = [];

        for (let gx = 0; gx < G.gridSize; gx++) {
            this.map[gx] = [];
            this.fog[gx] = [];
            for (let gy = 0; gy < G.gridSize; gy++) {
                let biome = 'plain';
                if (gx === 0 || gy === 0 || gx === G.gridSize - 1 || gy === G.gridSize - 1) {
                    biome = 'water';
                } else if (Math.random() < 0.22) {
                    biome = 'forest';
                } else if (Math.random() < 0.16) {
                    biome = 'mountain';
                }

                const hasRuins = (biome === 'plain' || biome === 'forest') && Math.random() < 0.08;

                this.map[gx][gy] = {
                    gx, gy,
                    biome,
                    hasRuins,
                    hasFarm: false,
                    hasMine: false
                };

                this.fog[gx][gy] = true;
            }
        }

        this.cities = [
            { id: 1, owner: 'player', name: 'Solaria', gx: 3, gy: 3, level: 1, progress: 0, progressMax: 2, income: 4, hasWalls: false },
            { id: 2, owner: 'ai', name: 'Khar-Durn', gx: 11, gy: 11, level: 1, progress: 0, progressMax: 2, income: 4, hasWalls: false }
        ];

        this.map[3][3].biome = 'plain';
        this.map[11][11].biome = 'plain';

        this.units = [
            { id: 101, owner: 'player', type: 'warrior', gx: 3, gy: 3, hp: 10, maxHp: 10, moved: false, attacked: false },
            { id: 201, owner: 'ai', type: 'warrior', gx: 11, gy: 11, hp: 10, maxHp: 10, moved: false, attacked: false }
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

                if (data.hasRuins) {
                    const r = this.add.image(sx, sy, 'feat_ruins');
                    r.setOrigin(0.5, 0.5);
                    this.world.add(r);
                    spr.ruinsSprite = r;
                }
            }
        }
    }

    renderCities() {
        if (this.citySprites) this.citySprites.forEach(s => s.destroy());
        this.citySprites = [];

        this.cities.forEach(city => {
            const sx = (city.gx - city.gy) * (this.tileW / 2);
            const sy = (city.gx + city.gy) * (this.tileH / 2) - 8;

            const spr = this.add.image(sx, sy, 'entity_city');
            spr.setOrigin(0.5, 0.7);
            spr.setTint(city.owner === 'player' ? G.player.color : G.ai.color);
            spr.setDepth(10);
            spr.setInteractive({ cursor: 'pointer' });
            spr.cityData = city;

            const banner = this.add.text(sx, sy - 28, `${city.name} (Úr. ${city.level})`, {
                fontFamily: 'Outfit',
                fontSize: '11px',
                fontStyle: '800',
                color: '#fff',
                backgroundColor: city.owner === 'player' ? '#0369a1' : '#991b1b',
                padding: { x: 5, y: 2 }
            }).setOrigin(0.5).setDepth(15);

            spr.on('pointerdown', (p) => {
                p.event.stopPropagation();
                // Pokud hráč vybral svou jednotku a klikne na nepřátelské město -> obléhání / útok!
                if (G.selectedEntity && G.selectedEntity.type === 'unit' && G.selectedEntity.data.owner === 'player') {
                    const u = G.selectedEntity.data;
                    const enemyInCity = this.units.find(en => en.gx === city.gx && en.gy === city.gy && en.owner !== 'player');
                    if (enemyInCity) {
                        this.handleUnitAttack(u, enemyInCity);
                        return;
                    } else if (city.owner !== 'player') {
                        // Město je prázdné -> vstup a dobytí!
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
            // Pokud je jednotka ve městě, offsetneme ji lehce výš a dáme vyšší depth
            const inCity = this.cities.some(c => c.gx === u.gx && c.gy === u.gy);
            const sy = (u.gx + u.gy) * (this.tileH / 2) - (inCity ? 18 : 6);

            const texKey = (this.map[u.gx][u.gy].biome === 'water') ? 'unit_boat' : `unit_${u.type}`;
            const spr = this.add.image(sx, sy, texKey);
            spr.setOrigin(0.5, 0.6);
            spr.setTint(u.owner === 'player' ? G.player.color : G.ai.color);
            spr.setDepth(inCity ? 25 : 12);
            spr.setInteractive({ cursor: 'pointer' });
            spr.unitData = u;

            const hpBadge = this.add.text(sx + 14, sy - 12, `${u.hp}`, {
                fontFamily: 'JetBrains Mono',
                fontSize: '10px',
                fontStyle: '800',
                color: '#fff',
                backgroundColor: '#0f172a',
                padding: { x: 3, y: 1 }
            }).setOrigin(0.5).setDepth(inCity ? 26 : 13);

            spr.on('pointerdown', (p) => {
                p.event.stopPropagation();
                if (G.selectedEntity && G.selectedEntity.type === 'unit' && G.selectedEntity.data.owner === 'player' && u.owner !== 'player') {
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
        if (this.fogSprites) {
            this.fogSprites.forEach(f => f.destroy());
        }
        this.fogSprites = [];

        for (let gx = 0; gx < G.gridSize; gx++) {
            for (let gy = 0; gy < G.gridSize; gy++) {
                if (this.fog[gx][gy]) {
                    const sx = (gx - gy) * (this.tileW / 2);
                    const sy = (gx + gy) * (this.tileH / 2);

                    const cloud = this.add.image(sx, sy, 'cloud_fog');
                    cloud.setOrigin(0.5, 0.5);
                    cloud.setDepth(30);
                    cloud.gx = gx;
                    cloud.gy = gy;
                    this.world.add(cloud);
                    this.fogSprites.push(cloud);
                }
            }
        }
    }

    revealFogAround(cx, cy, radius) {
        let revealedAny = false;
        // Hory poskytují +1 rozhled
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

    // --- SELECTION & INTERACTION ---
    selectUnit(unit) {
        if (unit.owner !== 'player') {
            showToast('⚠️ Nepřátelská jednotka. Zvol svou jednotku a zaútoč kliknutím na nepřítele!');
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

                const enemyOnTile = this.units.find(en => en.gx === x && en.gy === y && en.owner !== 'player');
                const canSail = G.player.unlockedTechs.includes('sailing');
                const isWater = this.map[x][y].biome === 'water';

                // ČERVENÝ ÚTOČNÝ INDIKÁTOR
                if (enemyOnTile && !unit.attacked && dist <= attackRange) {
                    const ring = this.add.circle(sx, sy, 14, 0xef4444, 0.7);
                    ring.setStrokeStyle(2, 0xffffff, 0.9);
                    ring.setDepth(18);
                    this.tweens.add({ targets: ring, scale: 1.25, yoyo: true, repeat: -1, duration: 400 });
                    this.world.add(ring);
                    this.moveHighlights.push({ x, y, type: 'attack', target: enemyOnTile, sprite: ring });
                }
                // MODRÝ POHYBOVÝ INDIKÁTOR (pohyb na vodu povolen pouze s Mořeplavbou)
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
            showToast('⚠️ Nepřítel je mimo dosah střelby!');
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

        // Ruin Discovery
        const tile = this.map[targetX][targetY];
        if (tile.hasRuins) {
            tile.hasRuins = false;
            if (this.tileSprites[targetX][targetY].ruinsSprite) {
                this.tileSprites[targetX][targetY].ruinsSprite.destroy();
            }
            const reward = Math.floor(Math.random() * 8 + 6);
            G.player.stars += reward;
            G.score += 50;
            SFX.play('level_up');
            showToast(`🏛️ STAROVĚKÁ RUINA PROZKOUMÁNA! Získáno +${reward} ⭐ Hvězd!`);
            updateHUD();
        }
    }

    checkCityCapture(unit, gx, gy) {
        const city = this.cities.find(c => c.gx === gx && c.gy === gy);
        if (city && city.owner !== unit.owner) {
            city.owner = unit.owner;
            SFX.play('level_up');
            G.score += 150;
            showToast(`🚩 MĚSTO ${city.name.toUpperCase()} BYLO DOBYTO!`);
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

        SFX.play('attack');
        this.cameras.main.shake(120, 0.007);

        // Terénní obranné bonusy:
        let terrainDefBonus = 0;
        const defTile = this.map[defender.gx][defender.gy];
        if (defTile.biome === 'forest') terrainDefBonus += 1;
        const defInCity = this.cities.find(c => c.gx === defender.gx && c.gy === defender.gy);
        if (defInCity) {
            terrainDefBonus += defInCity.hasWalls ? 4 : 2;
        }

        const effectiveDef = defDef.def + terrainDefBonus;
        const dmg = Math.max(1, atkDef.atk - Math.floor(effectiveDef / 2));
        defender.hp -= dmg;
        showToast(`⚔️ Zásah! Způsobeno ${dmg} poškození (Obrana terénu: +${terrainDefBonus})!`);

        // Counterattack
        const dist = Math.max(Math.abs(attacker.gx - defender.gx), Math.abs(attacker.gy - defender.gy));
        if (defender.hp > 0 && dist === 1) {
            const counterDmg = Math.max(1, Math.floor(defDef.atk / 2));
            attacker.hp -= counterDmg;
        }

        if (defender.hp <= 0) {
            showToast(`💀 Nepřítel byl zničen!`);
            this.units = this.units.filter(x => x !== defender);
            G.score += 30;

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

    checkVictoryConditions() {
        const aiCities = this.cities.filter(c => c.owner === 'ai');
        const aiUnits = this.units.filter(u => u.owner === 'ai');

        if (aiCities.length === 0 && aiUnits.length === 0) {
            showVictoryScreen('Totální Vítězství! Nepřátelská civilizace byla zcela vyhlazena.');
        } else if (aiCities.length === 0) {
            showVictoryScreen('Slavné Vítězství! Všechna nepřátelská města padla pod tvou kontrolu.');
        }
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

        // Přepočet pixelů minimapy na mřížku
        const gx = Math.floor((mx / canvas.width) * G.gridSize);
        const gy = Math.floor((my / canvas.height) * G.gridSize);

        // Vycentruj kameru na vybrané souřadnice
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
    const cw = 140;
    const ch = 140;
    ctx.clearRect(0, 0, cw, ch);

    const cellW = cw / G.gridSize;
    const cellH = ch / G.gridSize;

    // 1. Draw Tiles & Fog
    for (let x = 0; x < G.gridSize; x++) {
        for (let y = 0; y < G.gridSize; y++) {
            const px = x * cellW;
            const py = y * cellH;

            if (scene.fog[x][y]) {
                ctx.fillStyle = '#0f172a'; // Fog
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

    // 2. Draw Cities
    scene.cities.forEach(c => {
        if (!scene.fog[c.gx][c.gy]) {
            ctx.fillStyle = c.owner === 'player' ? '#38bdf8' : '#ef4444';
            ctx.fillRect(c.gx * cellW + 1, c.gy * cellH + 1, cellW - 2, cellH - 2);
        }
    });

    // 3. Draw Units
    scene.units.forEach(u => {
        if (!scene.fog[u.gx][u.gy]) {
            ctx.fillStyle = u.owner === 'player' ? '#ffffff' : '#f87171';
            ctx.beginPath();
            ctx.arc(u.gx * cellW + cellW / 2, u.gy * cellH + cellH / 2, cellW / 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// --- HUD & DOCK UI MANAGEMENT ---
function updateHUD() {
    document.getElementById('hud-turn-num').innerText = G.turn;
    document.getElementById('hud-stars').innerText = G.player.stars;
    document.getElementById('hud-score').innerText = G.score;

    let inc = 0;
    const scene = game ? game.scene.getScene('PolytropiaScene') : null;
    if (scene && scene.cities) {
        scene.cities.forEach(c => {
            if (c.owner === 'player') inc += c.income;
        });
    }
    document.getElementById('hud-income').innerText = `+${inc}/kolo`;
    document.getElementById('hud-cities-count').innerText = scene ? scene.cities.filter(c => c.owner === 'player').length : 1;
}

function openUnitDock(unit) {
    const dock = document.getElementById('entity-dock');
    const title = document.getElementById('dock-title');
    const sub = document.getElementById('dock-subtitle');
    const shelf = document.getElementById('dock-actions-shelf');

    title.innerText = UNIT_TYPES[unit.type].name;
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
    if (city.owner !== 'player') return;

    const dock = document.getElementById('entity-dock');
    const title = document.getElementById('dock-title');
    const sub = document.getElementById('dock-subtitle');
    const shelf = document.getElementById('dock-actions-shelf');

    title.innerText = `Město ${city.name} (Úr. ${city.level})`;
    sub.innerText = `Růst: ${city.progress}/${city.progressMax} • Příjem: +${city.income} ⭐/tah`;

    const scene = game.scene.getScene('PolytropiaScene');
    const garrisonUnit = scene.units.find(u => u.gx === city.gx && u.gy === city.gy && u.owner === 'player');

    let garrisonHtml = '';
    if (garrisonUnit) {
        garrisonHtml = `
            <div class="garrison-banner" onclick="selectGarrisonUnit(${garrisonUnit.id})">
                <span>🛡️ Posádka: <strong>${UNIT_TYPES[garrisonUnit.type].name}</strong> (${garrisonUnit.hp}/${garrisonUnit.maxHp} HP)</span>
                <button class="btn-garrison">OVLÁDAT JEDNOTKU</button>
            </div>
        `;
    }

    shelf.innerHTML = `
        ${garrisonHtml}
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:6px;">
            <div class="action-chip ${G.player.stars < 3 ? 'disabled' : ''}" onclick="trainUnitInCity('warrior', ${city.id})">
                <span>🗡️ Válečník</span> <span class="cost">(3 ⭐)</span>
            </div>
            <div class="action-chip ${G.player.stars < 7 ? 'disabled' : ''}" onclick="trainUnitInCity('settler', ${city.id})">
                <span>⛺ Osadník</span> <span class="cost">(7 ⭐)</span>
            </div>
            ${G.player.unlockedTechs.includes('archery') ? `
                <div class="action-chip ${G.player.stars < 5 ? 'disabled' : ''}" onclick="trainUnitInCity('archer', ${city.id})">
                    <span>🏹 Lučištník</span> <span class="cost">(5 ⭐)</span>
                </div>
            ` : ''}
            ${G.player.unlockedTechs.includes('smithing') ? `
                <div class="action-chip ${G.player.stars < 8 ? 'disabled' : ''}" onclick="trainUnitInCity('knight', ${city.id})">
                    <span>🐎 Rytíř</span> <span class="cost">(8 ⭐)</span>
                </div>
            ` : ''}
            <div class="action-chip ${G.player.stars < 5 ? 'disabled' : ''}" onclick="improveCityFarmland(${city.id})">
                <span>🌾 Založit Farmu</span> <span class="cost">(5 ⭐)</span>
            </div>
            ${G.player.unlockedTechs.includes('mining') ? `
                <div class="action-chip ${G.player.stars < 6 ? 'disabled' : ''}" onclick="buildMountainMine(${city.id})">
                    <span>⛏️ Postavit Důl</span> <span class="cost">(6 ⭐)</span>
                </div>
            ` : ''}
            ${G.player.unlockedTechs.includes('fortification') && !city.hasWalls ? `
                <div class="action-chip ${G.player.stars < 8 ? 'disabled' : ''}" onclick="buildCityWalls(${city.id})">
                    <span>🏰 Postavit Hradby</span> <span class="cost">(8 ⭐)</span>
                </div>
            ` : ''}
        </div>
    `;

    dock.classList.remove('hidden');
}

window.selectGarrisonUnit = function(unitId) {
    const scene = game.scene.getScene('PolytropiaScene');
    const u = scene.units.find(x => x.id === unitId);
    if (u) {
        scene.selectUnit(u);
    }
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
    if (existingHere) {
        showToast('⚠️ Na tomto políčku již město existuje!');
        return;
    }

    const tooClose = scene.cities.some(c => Math.max(Math.abs(c.gx - u.gx), Math.abs(c.gy - u.gy)) < 2);
    if (tooClose) {
        showToast('⚠️ Nové město musí být vzdáleno alespoň 2 políčka od jiných měst!');
        return;
    }

    if (scene.map[u.gx][u.gy].biome === 'water' || scene.map[u.gx][u.gy].biome === 'mountain') {
        showToast('⚠️ Město nelze založit na vodě nebo na vysoké hoře!');
        return;
    }

    const cityNames = ['Lunaria', 'Astra', 'Valoria', 'Nova Solis', 'Eldoria', 'Pyros'];
    const newName = cityNames[scene.cities.length % cityNames.length];

    scene.cities.push({
        id: Date.now(),
        owner: 'player',
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
    if (G.player.stars < cost) {
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

    G.player.stars -= cost;
    G.score += 20;

    scene.units.push({
        id: Date.now(),
        owner: 'player',
        type: type,
        gx: city.gx,
        gy: city.gy,
        hp: UNIT_TYPES[type].hp,
        maxHp: UNIT_TYPES[type].hp,
        moved: true,
        attacked: true
    });

    SFX.play('move');
    showToast(`⚔️ Vycvičen nový ${UNIT_TYPES[type].name}!`);

    scene.renderUnits();
    renderMinimap();
    updateHUD();
    closeDock();
};

window.improveCityFarmland = function(cityId) {
    if (G.player.stars < 5) {
        showToast('❌ Nedostatek Hvězd na založení farmy!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);

    G.player.stars -= 5;
    city.progress += 1;
    G.score += 35;

    if (city.progress >= city.progressMax) {
        city.progress = 0;
        city.level += 1;
        city.progressMax += 1;
        city.income += 2;
        SFX.play('level_up');
        showToast(`🎉 MĚSTO ${city.name} POSTOUPILO NA ÚROVEŇ ${city.level}! +2 ⭐ příjem!`);
    } else {
        showToast(`🌾 Farma postavena! Pokrok města: ${city.progress}/${city.progressMax}`);
    }

    scene.renderCities();
    updateHUD();
    openCityDock(city);
};

window.buildMountainMine = function(cityId) {
    if (G.player.stars < 6) {
        showToast('❌ Nedostatek Hvězd na vybudování dolu!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);

    let targetMountain = null;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const tx = city.gx + dx;
            const ty = city.gy + dy;
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

    G.player.stars -= 6;
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
    if (G.player.stars < 8) {
        showToast('❌ Nedostatek Hvězd na vybudování hradeb!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);

    G.player.stars -= 8;
    city.hasWalls = true;
    G.score += 60;

    SFX.play('level_up');
    showToast(`🏰 Město ${city.name} opevněno kamennými hradbami (+3 k obraně posádky)!`);
    updateHUD();
    openCityDock(city);
};

function closeDock() {
    document.getElementById('entity-dock').classList.add('hidden');
    G.selectedEntity = null;
}

// --- TECH TREE INTERACTION ---
function renderTechTree() {
    const grid = document.getElementById('tech-grid');
    grid.innerHTML = '';

    for (let key in TECH_TREE) {
        const t = TECH_TREE[key];
        const isUnlocked = G.player.unlockedTechs.includes(key);

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
    if (G.player.stars < t.cost) {
        showToast('❌ Nemáš dostatek Hvězd ⭐ na výzkum této technologie!');
        return;
    }

    G.player.stars -= t.cost;
    G.player.unlockedTechs.push(techKey);
    G.score += 50;

    SFX.play('level_up');
    showToast(`🔬 TECHNOLOGIE OBJEVENÁ: ${t.name}!`);

    renderTechTree();
    updateHUD();
}

// --- TURN SIMULATION & AI RIVAL TURN ---
function executeEndTurn() {
    if (G.gameOver) return;
    G.turn += 1;

    const scene = game.scene.getScene('PolytropiaScene');
    scene.cities.forEach(c => {
        if (c.owner === 'player') G.player.stars += c.income;
        if (c.owner === 'ai') G.ai.stars += c.income;
    });

    scene.units.forEach(u => {
        u.moved = false;
        u.attacked = false;
    });

    showToast(`⏳ ZAČAL TAH ${G.turn}. Suroviny byly vybrány!`);

    executeAITurn(scene);

    scene.renderUnits();
    scene.clearTileHighlights();
    closeDock();
    updateHUD();
    renderMinimap();

    if (G.turn > G.maxTurns) {
        showVictoryScreen('Konec 50 tahů! Zvítězil jsi na body rozvojem říše.');
    }
}

function executeAITurn(scene) {
    const aiUnits = scene.units.filter(u => u.owner === 'ai');
    const aiCities = scene.cities.filter(c => c.owner === 'ai');

    // AI City unit training
    aiCities.forEach(aiCity => {
        if (G.ai.stars >= 3) {
            const hasUnitInCity = scene.units.some(u => u.gx === aiCity.gx && u.gy === aiCity.gy);
            if (!hasUnitInCity) {
                G.ai.stars -= 3;
                scene.units.push({
                    id: Date.now() + Math.random(),
                    owner: 'ai',
                    type: Math.random() < 0.35 ? 'archer' : 'warrior',
                    gx: aiCity.gx,
                    gy: aiCity.gy,
                    hp: 10,
                    maxHp: 10,
                    moved: false,
                    attacked: false
                });
            }
        }
    });

    // AI Units move towards player cities and attack
    aiUnits.forEach(u => {
        const playerCities = scene.cities.filter(c => c.owner === 'player');
        if (playerCities.length === 0) return;

        // Cíl: nejbližší hráčovo město
        let nearestCity = playerCities[0];
        let minDist = 999;
        playerCities.forEach(pc => {
            const d = Math.hypot(pc.gx - u.gx, pc.gy - u.gy);
            if (d < minDist) {
                minDist = d;
                nearestCity = pc;
            }
        });

        let nextX = u.gx;
        let nextY = u.gy;

        if (nearestCity.gx < u.gx) nextX -= 1;
        else if (nearestCity.gx > u.gx) nextX += 1;

        if (nearestCity.gy < u.gy) nextY -= 1;
        else if (nearestCity.gy > u.gy) nextY += 1;

        const targetPlayer = scene.units.find(pu => pu.gx === nextX && pu.gy === nextY && pu.owner === 'player');
        if (targetPlayer) {
            targetPlayer.hp -= 3;
            showToast('⚠️ Nepřátelská armáda zaútočila na tvou jednotku!');
            if (targetPlayer.hp <= 0) {
                scene.units = scene.units.filter(x => x !== targetPlayer);
            }
        } else if (nextX >= 0 && nextX < G.gridSize && nextY >= 0 && nextY < G.gridSize) {
            if (scene.map[nextX][nextY].biome !== 'water') {
                u.gx = nextX;
                u.gy = nextY;
                // AI can capture player city if standing empty!
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

    document.getElementById('btn-close-dock').addEventListener('click', closeDock);

    document.getElementById('btn-restart-game').addEventListener('click', () => {
        window.location.reload();
    });

    window.addEventListener('keydown', (e) => {
        const techModal = document.getElementById('tech-modal');

        if (e.key === 'Escape') {
            if (!techModal.classList.contains('hidden')) {
                techModal.classList.add('hidden');
            }
            closeDock();
            return;
        }

        if (e.key === 't' || e.key === 'T') {
            techModal.classList.toggle('hidden');
            if (!techModal.classList.contains('hidden')) renderTechTree();
            return;
        }

        if (e.key === 'Enter' || e.code === 'Space') {
            if (techModal && !techModal.classList.contains('hidden')) return;
            if (G.gameOver) return;
            executeEndTurn();
        }
    });

    updateHUD();
});
