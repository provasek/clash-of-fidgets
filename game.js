/**
 * Polytropia: Civilizace Hvězd (Tahová 4X Strategie)
 * Inspirováno: The Battle of Polytopia x Sid Meier's Civilization.
 * Komplexní tahový model: Mlha neznáma (Fog of War), expanze měst, technologický strom,
 * rivalská AI civilizace a uspokojivý "eXplore, eXpand, eXploit, eXterminate" cyklus.
 */

// --- GLOBAL GAME STATE ---
const G = {
    turn: 1,
    maxTurns: 30,
    score: 120,
    player: {
        id: 'player',
        name: 'Impérium Solaria',
        color: 0x38bdf8, // Cyan Blue
        stars: 12,
        unlockedTechs: ['farming'] // 'farming', 'mining', 'archery', 'sailing', 'smithing'
    },
    ai: {
        id: 'ai',
        name: 'Klan Ocelových Hor',
        color: 0xef4444, // Crimson Red
        stars: 10,
        unlockedTechs: ['mining']
    },
    gridSize: 14, // 14x14 Hex/Iso Grid
    selectedEntity: null, // { type: 'unit' | 'city', data: obj }
    gameOver: false
};

// --- DATA DEFINITIONS ---
const TECH_TREE = {
    farming: {
        name: 'Zemědělství',
        icon: '🌾',
        cost: 6,
        desc: 'Umožňuje kultivovat úrodná pole na obilné farmy (+2 Růst města).',
        unlocked: true
    },
    mining: {
        name: 'Hornictví',
        icon: '⛏️',
        cost: 8,
        desc: 'Umožňuje hloubit doly na horách se zlatem (+3 Hvězdy/tah).',
        unlocked: false
    },
    archery: {
        name: 'Lukostřelba',
        icon: '🏹',
        cost: 9,
        desc: 'Odemyká výcvik Lučištníků (dálkový útok přes 2 políčka).',
        unlocked: false
    },
    smithing: {
        name: 'Kovářství',
        icon: '⚔️',
        cost: 14,
        desc: 'Odemyká Těžkooděnce (silná pěchota s vysokým brněním).',
        unlocked: false
    }
};

const UNIT_TYPES = {
    warrior: { name: 'Válečník', icon: '🗡️', hp: 10, maxHp: 10, atk: 4, def: 2, range: 1, move: 1, cost: 3 },
    archer: { name: 'Lučištník', icon: '🏹', hp: 8, maxHp: 8, atk: 3, def: 1, range: 2, move: 1, cost: 5 },
    knight: { name: 'Rytíř', icon: '🐎', hp: 14, maxHp: 14, atk: 6, def: 3, range: 1, move: 2, cost: 8 }
};

// --- PROCEDURAL AUDIO (Clean Modern UI Pops, Fanfares & Hits) ---
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
        } else if (sound === 'fog') {
            // White noise whoosh
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
            // Cheerful Arpeggio
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

// --- CLEAN LOW-POLY / VECTOR PROCEDURAL TEXTURES ---
function generatePolytopiaTextures(scene) {
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });

    // 1. Plain Grass Tile (64x32 Isometric Diamond)
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
        // Stylized pine tree
        gfx.fillStyle(0x14532d, 1);
        gfx.fillTriangle(32, -4, 24, 16, 40, 16);
        gfx.generateTexture('tile_forest', 64, 32);
    }

    // 3. Mountain Tile (Stone & Gold)
    if (!scene.textures.exists('tile_mountain')) {
        gfx.clear();
        gfx.fillStyle(0x64748b, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0); gfx.lineTo(64, 16); gfx.lineTo(32, 32); gfx.lineTo(0, 16);
        gfx.closePath();
        gfx.fillPath();
        // Peak
        gfx.fillStyle(0x94a3b8, 1);
        gfx.fillTriangle(32, -12, 18, 16, 46, 16);
        // Snow tip
        gfx.fillStyle(0xf8fafc, 1);
        gfx.fillTriangle(32, -12, 27, -2, 37, -2);
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

    // 5. Cloud / Fog of War Cover
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
        // Towers
        gfx.fillStyle(0x1e293b, 1);
        gfx.fillRect(10, 4, 12, 36);
        gfx.fillRect(42, 4, 12, 36);
        gfx.generateTexture('entity_city', 64, 48);
    }

    // 8. Warrior Unit
    if (!scene.textures.exists('unit_warrior')) {
        gfx.clear();
        gfx.fillStyle(0x0284c7, 1);
        gfx.fillCircle(20, 20, 14);
        gfx.lineStyle(2, 0xffffff, 1);
        gfx.strokeCircle(20, 20, 14);
        // Sword icon
        gfx.lineStyle(3, 0xffffff, 1);
        gfx.beginPath();
        gfx.moveTo(14, 26); gfx.lineTo(26, 14);
        gfx.strokePath();
        gfx.generateTexture('unit_warrior', 40, 40);
    }

    // 9. Archer Unit
    if (!scene.textures.exists('unit_archer')) {
        gfx.clear();
        gfx.fillStyle(0x16a34a, 1);
        gfx.fillCircle(20, 20, 14);
        gfx.lineStyle(2, 0xffffff, 1);
        gfx.strokeCircle(20, 20, 14);
        // Bow
        gfx.lineStyle(2, 0xfacc15, 1);
        gfx.strokeCircle(20, 20, 8);
        gfx.generateTexture('unit_archer', 40, 40);
    }

    // 10. Farm Feature Overlay
    if (!scene.textures.exists('feat_farm')) {
        gfx.clear();
        gfx.fillStyle(0xfacc15, 0.9);
        gfx.fillRoundedRect(14, 6, 36, 20, 4);
        gfx.generateTexture('feat_farm', 64, 32);
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
        });
    }

    initWorldMapData() {
        this.map = [];
        this.fog = []; // true = covered in clouds

        for (let gx = 0; gx < G.gridSize; gx++) {
            this.map[gx] = [];
            this.fog[gx] = [];
            for (let gy = 0; gy < G.gridSize; gy++) {
                // Procedural Biomes
                let biome = 'plain';
                const distToCenter = Math.hypot(gx - G.gridSize / 2, gy - G.gridSize / 2);

                if (gx === 0 || gy === 0 || gx === G.gridSize - 1 || gy === G.gridSize - 1) {
                    biome = 'water';
                } else if (Math.random() < 0.22) {
                    biome = 'forest';
                } else if (Math.random() < 0.16) {
                    biome = 'mountain';
                }

                // Ruins discovery
                const hasRuins = (biome === 'plain' || biome === 'forest') && Math.random() < 0.08;

                this.map[gx][gy] = {
                    gx, gy,
                    biome,
                    hasRuins,
                    hasFarm: false,
                    hasMine: false
                };

                this.fog[gx][gy] = true; // All fogged initially
            }
        }

        // Initialize Player City & AI City
        this.cities = [
            { id: 1, owner: 'player', name: 'Solaria', gx: 3, gy: 3, level: 1, progress: 0, progressMax: 2, income: 4 },
            { id: 2, owner: 'ai', name: 'Khar-Durn', gx: 10, gy: 10, level: 1, progress: 0, progressMax: 2, income: 4 }
        ];

        // Ensure tiles under cities are plain
        this.map[3][3].biome = 'plain';
        this.map[10][10].biome = 'plain';

        // Initialize Starting Units
        this.units = [
            { id: 101, owner: 'player', type: 'warrior', gx: 3, gy: 4, hp: 10, maxHp: 10, moved: false, attacked: false },
            { id: 201, owner: 'ai', type: 'warrior', gx: 10, gy: 9, hp: 10, maxHp: 10, moved: false, attacked: false }
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

                // Feature ruins overlay
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
            spr.setInteractive({ cursor: 'pointer' });
            spr.cityData = city;

            // City Name & Level Banner
            const banner = this.add.text(sx, sy - 28, `${city.name} (Úr. ${city.level})`, {
                fontFamily: 'Outfit',
                fontSize: '11px',
                fontStyle: '800',
                color: '#fff',
                backgroundColor: city.owner === 'player' ? '#0369a1' : '#991b1b',
                padding: { x: 5, y: 2 }
            }).setOrigin(0.5);

            spr.on('pointerdown', (p) => {
                p.event.stopPropagation();
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
            const sy = (u.gx + u.gy) * (this.tileH / 2) - 6;

            const spr = this.add.image(sx, sy, `unit_${u.type}`);
            spr.setOrigin(0.5, 0.6);
            spr.setTint(u.owner === 'player' ? G.player.color : G.ai.color);
            spr.setInteractive({ cursor: 'pointer' });
            spr.unitData = u;

            // HP text badge
            const hpBadge = this.add.text(sx + 14, sy - 12, `${u.hp}`, {
                fontFamily: 'JetBrains Mono',
                fontSize: '10px',
                fontStyle: '800',
                color: '#fff',
                backgroundColor: '#0f172a',
                padding: { x: 3, y: 1 }
            }).setOrigin(0.5);

            spr.on('pointerdown', (p) => {
                p.event.stopPropagation();
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
        for (let x = cx - radius; x <= cx + radius; x++) {
            for (let y = cy - radius; y <= cy + radius; y++) {
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
            // Bring cities and units back above clouds
            this.renderCities();
            this.renderUnits();
        }
    }

    setupCameraPanning() {
        this.input.on('pointermove', (p) => {
            if (p.isDown) {
                this.world.x += (p.x - p.prevPosition.x);
                this.world.y += (p.y - p.prevPosition.y);
            }
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const newScale = Phaser.Math.Clamp(this.world.scaleX - deltaY * 0.001, 0.65, 1.8);
            this.world.setScale(newScale);
        });
    }

    // --- SELECTION & INTERACTION ---
    selectUnit(unit) {
        if (unit.owner !== 'player') {
            showToast('⚠️ To je jednotka nepřátelské civilizace!');
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

        if (unit.moved) return;

        const maxMove = UNIT_TYPES[unit.type].move;
        for (let x = unit.gx - maxMove; x <= unit.gx + maxMove; x++) {
            for (let y = unit.gy - maxMove; y <= unit.gy + maxMove; y++) {
                if (x >= 0 && x < G.gridSize && y >= 0 && y < G.gridSize) {
                    if (x === unit.gx && y === unit.gy) continue;
                    // Don't move into deep water unless sailing
                    if (this.map[x][y].biome === 'water') continue;

                    const sx = (x - y) * (this.tileW / 2);
                    const sy = (x + y) * (this.tileH / 2);

                    const ring = this.add.circle(sx, sy, 10, 0x38bdf8, 0.5);
                    this.world.add(ring);
                    this.moveHighlights.push({ x, y, sprite: ring });
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
        // If a unit is selected, try to move or attack
        if (G.selectedEntity && G.selectedEntity.type === 'unit') {
            const u = G.selectedEntity.data;

            // Check if clicked tile is a valid highlighted move
            const valid = this.moveHighlights && this.moveHighlights.some(h => h.x === gx && h.y === gy);
            if (valid && !u.moved) {
                // Check if tile has an enemy unit (Attack!)
                const targetEnemy = this.units.find(en => en.gx === gx && en.gy === gy && en.owner !== 'player');
                if (targetEnemy) {
                    this.executeCombat(u, targetEnemy);
                } else {
                    this.executeMove(u, gx, gy);
                }
                return;
            }
        }

        // Otherwise deselect
        this.clearTileHighlights();
        closeDock();
    }

    executeMove(unit, targetX, targetY) {
        unit.gx = targetX;
        unit.gy = targetY;
        unit.moved = true;

        SFX.play('move');
        this.clearTileHighlights();

        // Reveal Fog of war
        this.revealFogAround(targetX, targetY, 2);

        // Check Ruins Exploration
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

        this.renderUnits();
        openUnitDock(unit);
    }

    executeCombat(attacker, defender) {
        attacker.moved = true;
        attacker.attacked = true;
        this.clearTileHighlights();

        const atkDef = UNIT_TYPES[attacker.type];
        const defDef = UNIT_TYPES[defender.type];

        const dmg = Math.max(1, atkDef.atk - Math.floor(defDef.def / 2));
        defender.hp -= dmg;
        SFX.play('move');
        showToast(`⚔️ Boj! Způsobeno ${dmg} poškození nepříteli!`);

        // Counterattack if in reach
        if (defender.hp > 0 && Math.abs(attacker.gx - defender.gx) <= 1 && Math.abs(attacker.gy - defender.gy) <= 1) {
            const counterDmg = Math.max(1, Math.floor(defDef.atk / 2));
            attacker.hp -= counterDmg;
        }

        // Defender death
        if (defender.hp <= 0) {
            showToast(`💀 Nepřátelská jednotka padla!`);
            this.units = this.units.filter(x => x !== defender);

            // Move attacker to tile if melee
            if (atkDef.range === 1) {
                attacker.gx = defender.gx;
                attacker.gy = defender.gy;
            }
        }

        // Attacker death
        if (attacker.hp <= 0) {
            this.units = this.units.filter(x => x !== attacker);
            closeDock();
        }

        this.renderUnits();
        this.checkVictoryConditions();
    }

    checkVictoryConditions() {
        const aiCity = this.cities.find(c => c.owner === 'ai');
        if (!aiCity) {
            showVictoryScreen('Vítězství! Nepřátelské hlavní město padlo.');
        }
    }
}

// --- HUD & DOCK UI MANAGEMENT ---
function updateHUD() {
    document.getElementById('hud-turn-num').innerText = G.turn;
    document.getElementById('hud-stars').innerText = G.player.stars;
    document.getElementById('hud-score').innerText = G.score;

    // Calculate income from player cities
    let inc = 0;
    const scene = game.scene.getScene('PolytropiaScene');
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
    sub.innerText = `HP: ${unit.hp}/${unit.maxHp} • Tah: ${unit.moved ? 'Vyčerpán' : 'Připraven'}`;

    shelf.innerHTML = `
        <div class="action-chip ${unit.moved ? 'disabled' : ''}" onclick="healSelectedUnit()">
            <span>❤️ Odpočinek &amp; Léčení (+3 HP)</span>
        </div>
    `;

    dock.classList.remove('hidden');
}

function openCityDock(city) {
    if (city.owner !== 'player') return;

    const dock = document.getElementById('entity-dock');
    const title = document.getElementById('dock-title');
    const sub = document.getElementById('dock-subtitle');
    const shelf = document.getElementById('dock-actions-shelf');

    title.innerText = `Město ${city.name} (Úr. ${city.level})`;
    sub.innerText = `Růst: ${city.progress}/${city.progressMax} • Příjem: +${city.income} ⭐`;

    shelf.innerHTML = `
        <div class="action-chip ${G.player.stars < 3 ? 'disabled' : ''}" onclick="trainUnitInCity('warrior', ${city.id})">
            <span>🗡️ Válečník</span> <span class="cost">(3 ⭐)</span>
        </div>
        ${G.player.unlockedTechs.includes('archery') ? `
            <div class="action-chip ${G.player.stars < 5 ? 'disabled' : ''}" onclick="trainUnitInCity('archer', ${city.id})">
                <span>🏹 Lučištník</span> <span class="cost">(5 ⭐)</span>
            </div>
        ` : ''}
        <div class="action-chip ${G.player.stars < 5 ? 'disabled' : ''}" onclick="improveCityFarmland(${city.id})">
            <span>🌾 Založit Farmu</span> <span class="cost">(5 ⭐)</span>
        </div>
    `;

    dock.classList.remove('hidden');
}

window.healSelectedUnit = function() {
    if (!G.selectedEntity || G.selectedEntity.type !== 'unit') return;
    const u = G.selectedEntity.data;
    if (u.moved) return;

    u.hp = Math.min(u.maxHp, u.hp + 3);
    u.moved = true;
    showToast('❤️ Jednotka odpočívá a vyléčila 3 HP.');

    const scene = game.scene.getScene('PolytropiaScene');
    scene.clearTileHighlights();
    scene.renderUnits();
    openUnitDock(u);
};

window.trainUnitInCity = function(type, cityId) {
    const cost = UNIT_TYPES[type].cost;
    if (G.player.stars < cost) {
        showToast('❌ Nemáš dostatek Hvězd ⭐ na výcvik!');
        return;
    }

    const scene = game.scene.getScene('PolytropiaScene');
    const city = scene.cities.find(c => c.id === cityId);

    // Check if city tile already has a unit
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

    // Check City Level Up!
    if (city.progress >= city.progressMax) {
        city.progress = 0;
        city.level += 1;
        city.progressMax += 1;
        city.income += 2; // Increases city income per turn
        SFX.play('level_up');
        showToast(`🎉 MĚSTO ${city.name} POSTOUPILO NA ÚROVEŇ ${city.level}! +2 ⭐ příjem!`);
    } else {
        showToast(`🌾 Farma postavena! Pokrok města: ${city.progress}/${city.progressMax}`);
    }

    scene.renderCities();
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
    G.turn += 1;

    // 1. Gather player income
    const scene = game.scene.getScene('PolytropiaScene');
    scene.cities.forEach(c => {
        if (c.owner === 'player') G.player.stars += c.income;
        if (c.owner === 'ai') G.ai.stars += c.income;
    });

    // 2. Reset player units move flag
    scene.units.forEach(u => {
        u.moved = false;
        u.attacked = false;
    });

    showToast(`⏳ ZAČAL TAH ${G.turn}. Suroviny byly vybrány!`);

    // 3. AI Rival Turn Execution (Smart Simple Bot)
    executeAITurn(scene);

    scene.renderUnits();
    scene.clearTileHighlights();
    closeDock();
    updateHUD();

    // Check Max Turn Victory (30 Turns Limit)
    if (G.turn > G.maxTurns) {
        showVictoryScreen('Konec 30 tahů! Zvítězil jsi na body rozvojem říše.');
    }
}

function executeAITurn(scene) {
    const aiUnits = scene.units.filter(u => u.owner === 'ai');
    const aiCity = scene.cities.find(c => c.owner === 'ai');

    // AI train unit if enough stars and empty city
    if (G.ai.stars >= 3 && aiCity) {
        const hasUnitInCity = scene.units.some(u => u.gx === aiCity.gx && u.gy === aiCity.gy);
        if (!hasUnitInCity) {
            G.ai.stars -= 3;
            scene.units.push({
                id: Date.now() + Math.random(),
                owner: 'ai',
                type: 'warrior',
                gx: aiCity.gx,
                gy: aiCity.gy,
                hp: 10,
                maxHp: 10,
                moved: false,
                attacked: false
            });
        }
    }

    // AI Units move towards player city
    aiUnits.forEach(u => {
        const playerCity = scene.cities.find(c => c.owner === 'player');
        if (!playerCity) return;

        let nextX = u.gx;
        let nextY = u.gy;

        if (playerCity.gx < u.gx) nextX -= 1;
        else if (playerCity.gx > u.gx) nextX += 1;

        if (playerCity.gy < u.gy) nextY -= 1;
        else if (playerCity.gy > u.gy) nextY += 1;

        // Check if player unit is adjacent -> attack!
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

    // End Turn Button
    document.getElementById('btn-end-turn').addEventListener('click', executeEndTurn);

    // Tech Modal
    document.getElementById('btn-open-tech').addEventListener('click', () => {
        renderTechTree();
        document.getElementById('tech-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-tech').addEventListener('click', () => {
        document.getElementById('tech-modal').classList.add('hidden');
    });

    // Dock Close
    document.getElementById('btn-close-dock').addEventListener('click', closeDock);

    // Restart
    document.getElementById('btn-restart-game').addEventListener('click', () => {
        window.location.reload();
    });

    updateHUD();
});
