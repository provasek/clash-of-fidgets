/**
 * Království Železa a Kamene: Budovatelská Strategie
 * Plnohodnotná izometrická budovatelská strategie (ve stylu Settlers / Anno / Stronghold).
 * Reálná ekonomická simulace: Dělníci, těžba dřeva a kamene, tavení železa, pole a chléb, hradby a věže.
 * 20x20 volná stavitelská mapa s kamerovým posunem myší (WASD / drag), plynulým zoomem a detailní simulací.
 */

// --- GLOBAL KINGDOM SIMULATION STATE ---
const K = {
    speedMultiplier: 1,
    resources: {
        wood: 450,
        stone: 300,
        iron: 150,
        food: 280,
        gold: 650
    },
    demographics: {
        population: 12,
        maxPopulation: 20,
        employed: 8
    },
    mapSize: 20, // 20x20 Isometric Tile Grid
    selectedBuildTool: null, // null | 'lumberjack' | 'quarry' | 'iron_mine' | 'farm' | 'house' | 'wall' | 'guard_tower' | 'road' | 'demolish'
    buildings: [
        // Počáteční královský hrad uprostřed
        { id: 1, type: 'castle', gx: 9, gy: 9, level: 1, name: 'Královský Hrad', workers: 0 },
        { id: 2, type: 'house', gx: 8, gy: 11, level: 1, name: 'Selská Chalupa', workers: 0 },
        { id: 3, type: 'house', gx: 10, gy: 11, level: 1, name: 'Selská Chalupa', workers: 0 },
        { id: 4, type: 'lumberjack', gx: 6, gy: 8, level: 1, name: 'Dřevorubecký Srub', workers: 2 },
        { id: 5, type: 'farm', gx: 12, gy: 8, level: 1, name: 'Pšeničné Pole & Mlýn', workers: 2 }
    ],
    roads: [
        { gx: 9, gy: 10 },
        { gx: 9, gy: 11 },
        { gx: 8, gy: 10 },
        { gx: 10, gy: 10 }
    ],
    soundEnabled: true
};

// --- DEFINICE VŠECH BUDOV A JEJICH NÁKLADŮ/PRODUKCE ---
const BUILDING_TYPES = {
    lumberjack: {
        name: 'Dřevorubec',
        icon: '🪓',
        category: 'economy',
        desc: 'Těží dřevo z okolních hvozdů. Základní surovina pro veškerou výstavbu.',
        cost: { wood: 40, gold: 30 },
        produces: { wood: 18 },
        consumes: { food: 4 },
        workers: 2
    },
    quarry: {
        name: 'Kamenolom',
        icon: '⛏️',
        category: 'economy',
        desc: 'Dobývá stavební kvádry z kamenných ložisek. Nutné pro hradby a věže.',
        cost: { wood: 80, gold: 50 },
        produces: { stone: 12 },
        consumes: { food: 5 },
        workers: 3
    },
    iron_mine: {
        name: 'Železná Huť',
        icon: '⛓️',
        category: 'economy',
        desc: 'Taví železnou rudu na ingotovou ocel pro zbraně a pokročilá opevnění.',
        cost: { wood: 120, stone: 90, gold: 80 },
        produces: { iron: 6 },
        consumes: { food: 6 },
        workers: 4
    },
    farm: {
        name: 'Pšeničné Pole',
        icon: '🌾',
        category: 'economy',
        desc: 'Pěstuje obilí a peče chléb. Bez jídla lidé hladoví a odcházejí z panství.',
        cost: { wood: 50, gold: 40 },
        produces: { food: 24 },
        consumes: {},
        workers: 2
    },
    house: {
        name: 'Obytný Dům',
        icon: '🏡',
        category: 'housing',
        desc: 'Poskytuje přístřeší pro 8 nových poddaných a generuje daně do pokladny.',
        cost: { wood: 60, stone: 30, gold: 50 },
        produces: { gold: 15 },
        popCapacity: 8,
        workers: 0
    },
    tavern: {
        name: 'Královský Hostinec',
        icon: '🍺',
        category: 'housing',
        desc: 'Zvyšuje spokojenost obyvatel a přitahuje do království zkušené řemeslníky.',
        cost: { wood: 110, stone: 60, gold: 120 },
        produces: { gold: 30 },
        consumes: { food: 8 },
        workers: 2
    },
    wall: {
        name: 'Kamenná Hradba',
        icon: '🧱',
        category: 'military',
        desc: 'Neprostupné opevnění chránící vnitřní město před nájezdy banditů.',
        cost: { stone: 25 },
        workers: 0
    },
    guard_tower: {
        name: 'Strážní Věž',
        icon: '🏹',
        category: 'military',
        desc: 'Lučištníci střeží perimetr města a automaticky odrážejí nepřátelské nájezdníky.',
        cost: { wood: 80, stone: 100, iron: 30, gold: 90 },
        workers: 2
    }
};

// --- PROCEDURAL STRATEGY AUDIO SYNTHESIZER ---
class MedievalAudioEngine {
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
        if (!K.soundEnabled) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;

        if (sound === 'wood_chop') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
            g.gain.setValueAtTime(0.35, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
            osc.start(t);
            osc.stop(t + 0.09);
        } else if (sound === 'stone_place') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(110, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.14);
            g.gain.setValueAtTime(0.4, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
        } else if (sound === 'coin_tax') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
            g.gain.setValueAtTime(0.18, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
        }
    }
}
const SFX = new MedievalAudioEngine();

// --- DETAILNÍ PROCEDURÁLNÍ TEXTURY PRO IZOMETRICKÝ STRATEGICKÝ ENGINE ---
function generateStrategyTextures(scene) {
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });

    // 1. Lush Green Grass Tile (64x32 Isometric Diamond)
    if (!scene.textures.exists('tile_grass')) {
        gfx.clear();
        gfx.fillStyle(0x2d6a4f, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0);
        gfx.lineTo(64, 16);
        gfx.lineTo(32, 32);
        gfx.lineTo(0, 16);
        gfx.closePath();
        gfx.fillPath();
        // Grass texture blades
        gfx.lineStyle(1, 0x40916c, 0.6);
        gfx.strokePath();
        gfx.fillStyle(0x1b4332, 0.4);
        gfx.fillCircle(24, 16, 4);
        gfx.fillCircle(42, 14, 5);
        gfx.generateTexture('tile_grass', 64, 32);
    }

    // 2. Cobblestone Road Tile
    if (!scene.textures.exists('tile_road')) {
        gfx.clear();
        gfx.fillStyle(0x64748b, 1);
        gfx.beginPath();
        gfx.moveTo(32, 0);
        gfx.lineTo(64, 16);
        gfx.lineTo(32, 32);
        gfx.lineTo(0, 16);
        gfx.closePath();
        gfx.fillPath();
        gfx.lineStyle(1, 0x334155, 0.8);
        gfx.strokePath();
        gfx.generateTexture('tile_road', 64, 32);
    }

    // 3. Castle Town Hall (Central Bastion)
    if (!scene.textures.exists('bldg_castle')) {
        gfx.clear();
        // Stone base walls
        gfx.fillStyle(0x475569, 1);
        gfx.lineStyle(2, 0x1e293b, 1);
        gfx.fillRect(10, 20, 60, 48);
        gfx.strokeRect(10, 20, 60, 48);
        // Towers with battlements
        gfx.fillStyle(0x334155, 1);
        gfx.fillRect(4, 8, 20, 60);
        gfx.fillRect(56, 8, 20, 60);
        // Red Royal Roofs
        gfx.fillStyle(0x991b1b, 1);
        gfx.fillTriangle(4, 8, 14, -6, 24, 8);
        gfx.fillTriangle(56, 8, 66, -6, 76, 8);
        // Golden Flag
        gfx.fillStyle(0xf59e0b, 1);
        gfx.fillTriangle(14, -6, 26, -12, 14, -2);
        // Gate
        gfx.fillStyle(0x1e1b18, 1);
        gfx.fillRoundedRect(30, 44, 20, 24, 6);
        gfx.generateTexture('bldg_castle', 80, 72);
    }

    // 4. House (Peasant Cottage)
    if (!scene.textures.exists('bldg_house')) {
        gfx.clear();
        gfx.fillStyle(0xd6d3d1, 1);
        gfx.lineStyle(2, 0x78716c, 1);
        gfx.fillRect(10, 18, 36, 28);
        gfx.strokeRect(10, 18, 36, 28);
        // Thatch Roof
        gfx.fillStyle(0xa16207, 1);
        gfx.fillTriangle(6, 18, 28, 0, 50, 18);
        // Door & Window
        gfx.fillStyle(0x44403c, 1);
        gfx.fillRect(24, 32, 8, 14);
        gfx.fillStyle(0x38bdf8, 1);
        gfx.fillRect(14, 24, 6, 6);
        gfx.generateTexture('bldg_house', 56, 48);
    }

    // 5. Lumberjack Hut
    if (!scene.textures.exists('bldg_lumberjack')) {
        gfx.clear();
        gfx.fillStyle(0x78350f, 1);
        gfx.lineStyle(2, 0x451a03, 1);
        gfx.fillRect(8, 16, 40, 28);
        gfx.strokeRect(8, 16, 40, 28);
        // Wood log piles
        gfx.fillStyle(0xb45309, 1);
        gfx.fillCircle(16, 36, 5);
        gfx.fillCircle(24, 36, 5);
        // Green roof
        gfx.fillStyle(0x166534, 1);
        gfx.fillTriangle(4, 16, 28, 2, 52, 16);
        gfx.generateTexture('bldg_lumberjack', 56, 48);
    }

    // 6. Quarry (Stone Pit)
    if (!scene.textures.exists('bldg_quarry')) {
        gfx.clear();
        gfx.fillStyle(0x64748b, 1);
        gfx.lineStyle(2, 0x334155, 1);
        gfx.fillRect(8, 14, 44, 30);
        gfx.strokeRect(8, 14, 44, 30);
        // Pickaxe & stone boulders
        gfx.fillStyle(0x94a3b8, 1);
        gfx.fillCircle(18, 28, 7);
        gfx.fillCircle(34, 28, 9);
        gfx.generateTexture('bldg_quarry', 56, 48);
    }

    // 7. Farm (Windmill & Wheat)
    if (!scene.textures.exists('bldg_farm')) {
        gfx.clear();
        // Wheat patch
        gfx.fillStyle(0xeab308, 0.85);
        gfx.fillRect(6, 22, 44, 22);
        // Mill tower
        gfx.fillStyle(0xf5f5f4, 1);
        gfx.lineStyle(2, 0x78716c, 1);
        gfx.fillRect(20, 8, 18, 32);
        // Blades
        gfx.lineStyle(2, 0x78350f, 1);
        gfx.strokeLineShape(new Phaser.Geom.Line(10, 6, 48, 26));
        gfx.strokeLineShape(new Phaser.Geom.Line(48, 6, 10, 26));
        gfx.generateTexture('bldg_farm', 56, 48);
    }

    // 8. Stone Wall
    if (!scene.textures.exists('bldg_wall')) {
        gfx.clear();
        gfx.fillStyle(0x64748b, 1);
        gfx.lineStyle(2, 0x1e293b, 1);
        gfx.fillRect(10, 10, 28, 26);
        gfx.strokeRect(10, 10, 28, 26);
        // Battlements
        gfx.fillRect(10, 4, 8, 6);
        gfx.fillRect(30, 4, 8, 6);
        gfx.generateTexture('bldg_wall', 48, 38);
    }

    // 9. Guard Tower
    if (!scene.textures.exists('bldg_guard_tower')) {
        gfx.clear();
        gfx.fillStyle(0x475569, 1);
        gfx.lineStyle(2, 0x1e293b, 1);
        gfx.fillRect(14, 12, 24, 48);
        gfx.strokeRect(14, 12, 24, 48);
        // Watch platform
        gfx.fillStyle(0x991b1b, 1);
        gfx.fillTriangle(10, 12, 26, -4, 42, 12);
        gfx.generateTexture('bldg_guard_tower', 52, 64);
    }

    // 10. Forest Tree Decoration
    if (!scene.textures.exists('dec_tree')) {
        gfx.clear();
        gfx.fillStyle(0x451a03, 1);
        gfx.fillRect(18, 26, 6, 14);
        gfx.fillStyle(0x15803d, 1);
        gfx.fillCircle(21, 16, 14);
        gfx.fillStyle(0x16a34a, 1);
        gfx.fillCircle(21, 12, 10);
        gfx.generateTexture('dec_tree', 42, 42);
    }

    gfx.destroy();
}

// ====================================================
// PHASER SCENE: ISOMETRIC STRATEGY ENGINE
// ====================================================
class StrategyKingdomScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StrategyKingdomScene' });
    }

    create() {
        generateStrategyTextures(this);

        this.cameras.main.setBackgroundColor('#141e2e');
        this.world = this.add.container(this.scale.width / 2, this.scale.height / 3);

        this.tileW = 64;
        this.tileH = 32;

        this.buildIsometricTerrain();
        this.renderRoads();
        this.renderBuildings();
        this.scatterEnvironmentalFlora();
        this.setupInteractiveControls();

        // Listen for screen resize
        this.scale.on('resize', (gameSize) => {
            this.world.setPosition(gameSize.width / 2, gameSize.height / 3);
        });
    }

    buildIsometricTerrain() {
        this.terrainTiles = [];
        for (let gx = 0; gx < K.mapSize; gx++) {
            this.terrainTiles[gx] = [];
            for (let gy = 0; gy < K.mapSize; gy++) {
                const sx = (gx - gy) * (this.tileW / 2);
                const sy = (gx + gy) * (this.tileH / 2);

                const tile = this.add.image(sx, sy, 'tile_grass');
                tile.setOrigin(0.5, 0.5);
                tile.setInteractive({ cursor: 'pointer' });
                tile.gx = gx;
                tile.gy = gy;

                tile.on('pointerover', () => {
                    tile.setTint(0x86efac);
                });
                tile.on('pointerout', () => {
                    tile.clearTint();
                });
                tile.on('pointerdown', (pointer) => {
                    this.onTileClicked(gx, gy, pointer);
                });

                this.world.add(tile);
                this.terrainTiles[gx][gy] = tile;
            }
        }
    }

    renderRoads() {
        if (this.roadSprites) {
            this.roadSprites.forEach(r => r.destroy());
        }
        this.roadSprites = [];

        K.roads.forEach(r => {
            const sx = (r.gx - r.gy) * (this.tileW / 2);
            const sy = (r.gx + r.gy) * (this.tileH / 2);

            const road = this.add.image(sx, sy, 'tile_road');
            road.setOrigin(0.5, 0.5);
            this.world.add(road);
            this.roadSprites.push(road);
        });
    }

    renderBuildings() {
        if (this.buildingSprites) {
            this.buildingSprites.forEach(b => b.destroy());
        }
        this.buildingSprites = [];

        K.buildings.forEach(b => {
            const sx = (b.gx - b.gy) * (this.tileW / 2);
            const sy = (b.gx + b.gy) * (this.tileH / 2);

            const texKey = `bldg_${b.type}`;
            const spr = this.add.image(sx, sy, texKey);
            spr.setOrigin(0.5, 0.8);
            spr.setInteractive({ cursor: 'pointer' });
            spr.buildingData = b;

            spr.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
                openBuildingInspector(b);
            });

            this.world.add(spr);
            this.buildingSprites.push(spr);
        });
    }

    scatterEnvironmentalFlora() {
        // Dekorativní stromy na okrajích mapy
        for (let i = 0; i < 40; i++) {
            const gx = Math.floor(Math.random() * K.mapSize);
            const gy = Math.floor(Math.random() * K.mapSize);
            // Don't place on center city
            if (gx > 5 && gx < 14 && gy > 5 && gy < 14) continue;

            const sx = (gx - gy) * (this.tileW / 2);
            const sy = (gx + gy) * (this.tileH / 2);
            const tree = this.add.image(sx, sy, 'dec_tree');
            tree.setOrigin(0.5, 0.85);
            this.world.add(tree);
        }
    }

    setupInteractiveControls() {
        // Drag panning for Kingdom view
        this.input.on('pointermove', (p) => {
            if (p.isDown && p.buttons === 1 && !K.selectedBuildTool) {
                this.world.x += (p.x - p.prevPosition.x);
                this.world.y += (p.y - p.prevPosition.y);
            }
        });

        // Mouse Wheel Zoom
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const newScale = Phaser.Math.Clamp(this.world.scaleX - deltaY * 0.001, 0.6, 1.8);
            this.world.setScale(newScale);
        });
    }

    onTileClicked(gx, gy, pointer) {
        if (!K.selectedBuildTool) {
            // If empty tile, show info
            const existingB = K.buildings.find(b => b.gx === gx && b.gy === gy);
            if (existingB) {
                openBuildingInspector(existingB);
            }
            return;
        }

        if (K.selectedBuildTool === 'road') {
            const hasRoad = K.roads.some(r => r.gx === gx && r.gy === gy);
            if (!hasRoad && K.resources.stone >= 2) {
                K.resources.stone -= 2;
                K.roads.push({ gx, gy });
                SFX.play('stone_place');
                this.renderRoads();
                updateEconomyHUD();
            }
            return;
        }

        if (K.selectedBuildTool === 'demolish') {
            const idx = K.buildings.findIndex(b => b.gx === gx && b.gy === gy);
            if (idx !== -1 && K.buildings[idx].type !== 'castle') {
                const b = K.buildings[idx];
                K.buildings.splice(idx, 1);
                SFX.play('stone_place');
                showToast(`💥 Budova ${b.name} byla zbourána.`);
                this.renderBuildings();
                recalculateDemographics();
                updateEconomyHUD();
            }
            return;
        }

        // Construct new building
        const bDef = BUILDING_TYPES[K.selectedBuildTool];
        if (!bDef) return;

        // Check if tile is occupied
        const isOccupied = K.buildings.some(b => b.gx === gx && b.gy === gy);
        if (isOccupied) {
            showToast('⚠️ Na této parcele již stojí jiná budova!');
            return;
        }

        // Check resource costs
        for (let res in bDef.cost) {
            if (K.resources[res] < bDef.cost[res]) {
                showToast(`❌ Nedostatek surovin! Chybí ti ${bDef.cost[res]} ${res}.`);
                return;
            }
        }

        // Check workforce
        const freeWorkers = K.demographics.population - K.demographics.employed;
        if (bDef.workers > freeWorkers) {
            showToast(`⚠️ Nedostatek volných dělníků! Potřebuješ ${bDef.workers} lidi, volných máš ${freeWorkers}. Postav obytné domy.`);
            return;
        }

        // Deduct costs
        for (let res in bDef.cost) {
            K.resources[res] -= bDef.cost[res];
        }

        K.buildings.push({
            id: Date.now(),
            type: K.selectedBuildTool,
            gx: gx,
            gy: gy,
            level: 1,
            name: bDef.name,
            workers: bDef.workers
        });

        SFX.play(bDef.category === 'economy' ? 'wood_chop' : 'stone_place');
        showToast(`🏗️ Postavena budova: ${bDef.name}!`);

        this.renderBuildings();
        recalculateDemographics();
        updateEconomyHUD();
    }
}

// --- SIMULATION TICK LOOP (Anno / Settlers Economy) ---
function startKingdomSimulation() {
    setInterval(() => {
        const mul = K.speedMultiplier;

        // 1. Gather all production & consumption from active buildings
        let netWood = 0;
        let netStone = 0;
        let netIron = 0;
        let netFood = 0;
        let netGold = 0;

        K.buildings.forEach(b => {
            const def = BUILDING_TYPES[b.type];
            if (!def) return;

            // Production
            if (def.produces) {
                if (def.produces.wood) netWood += (def.produces.wood / 60) * b.level * mul;
                if (def.produces.stone) netStone += (def.produces.stone / 60) * b.level * mul;
                if (def.produces.iron) netIron += (def.produces.iron / 60) * b.level * mul;
                if (def.produces.food) netFood += (def.produces.food / 60) * b.level * mul;
                if (def.produces.gold) netGold += (def.produces.gold / 60) * b.level * mul;
            }

            // Consumption
            if (def.consumes) {
                if (def.consumes.food) netFood -= (def.consumes.food / 60) * mul;
            }
        });

        // 2. People consume food (1 food per 10 people every second)
        const citizenHunger = (K.demographics.population * 0.12) * mul;
        netFood -= citizenHunger;

        // Apply net
        K.resources.wood = Math.max(0, K.resources.wood + netWood);
        K.resources.stone = Math.max(0, K.resources.stone + netStone);
        K.resources.iron = Math.max(0, K.resources.iron + netIron);
        K.resources.food = Math.max(0, K.resources.food + netFood);
        K.resources.gold = Math.max(0, K.resources.gold + netGold);

        // Population growth if food is plentiful
        if (K.resources.food > 50 && K.demographics.population < K.demographics.maxPopulation) {
            if (Math.random() < 0.15 * mul) {
                K.demographics.population += 1;
                showToast('👶 Do království dorazili noví osadníci!');
            }
        }

        // Famine warning
        if (K.resources.food <= 0) {
            showToast('⚠️ HLADOMOR! Lidé nemají co jíst, produkce klesá!');
        }

        updateEconomyHUD();
    }, 1000);
}

function recalculateDemographics() {
    let cap = 12; // Base Castle capacity
    let emp = 0;

    K.buildings.forEach(b => {
        const def = BUILDING_TYPES[b.type];
        if (def) {
            if (def.popCapacity) cap += def.popCapacity * b.level;
            emp += def.workers;
        }
    });

    K.demographics.maxPopulation = cap;
    K.demographics.employed = emp;
}

// --- HUD & DOM MANAGEMENT ---
function updateEconomyHUD() {
    document.getElementById('stat-pop').innerText = `${K.demographics.employed} / ${K.demographics.population} (Max ${K.demographics.maxPopulation})`;
    document.getElementById('stat-wood').innerText = Math.floor(K.resources.wood);
    document.getElementById('stat-stone').innerText = Math.floor(K.resources.stone);
    document.getElementById('stat-iron').innerText = Math.floor(K.resources.iron);
    document.getElementById('stat-food').innerText = Math.floor(K.resources.food);
    document.getElementById('stat-gold').innerText = Math.floor(K.resources.gold);
}

function setupDockInteraction() {
    // Category Tabs
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            populateBuildCards(btn.dataset.cat);
        });
    });

    // Speed Multiplier
    const speedBtn = document.getElementById('btn-speed');
    speedBtn.addEventListener('click', () => {
        if (K.speedMultiplier === 1) K.speedMultiplier = 2;
        else if (K.speedMultiplier === 2) K.speedMultiplier = 5;
        else K.speedMultiplier = 1;
        speedBtn.innerText = `⏩ ${K.speedMultiplier}x`;
    });

    // Audio
    document.getElementById('btn-audio').addEventListener('click', () => {
        K.soundEnabled = !K.soundEnabled;
        document.getElementById('btn-audio').innerText = K.soundEnabled ? '🔊' : '🔇';
    });

    // Close Inspector
    document.getElementById('btn-close-insp').addEventListener('click', () => {
        document.getElementById('inspector-panel').classList.add('hidden');
    });

    populateBuildCards('economy');
}

function populateBuildCards(category) {
    const shelf = document.getElementById('build-shelf');
    shelf.innerHTML = '';

    if (category === 'roads') {
        shelf.innerHTML = `
            <div class="build-card ${K.selectedBuildTool === 'road' ? 'selected' : ''}" onclick="selectTool('road')">
                <div class="b-icon">🛤️</div>
                <div class="b-info">
                    <div class="b-name">Dlážděná Cesta</div>
                    <div class="b-costs">2 🪨 Kamene</div>
                </div>
            </div>
            <div class="build-card ${K.selectedBuildTool === 'demolish' ? 'selected' : ''}" onclick="selectTool('demolish')">
                <div class="b-icon">💥</div>
                <div class="b-info">
                    <div class="b-name">Zbourat Budovu</div>
                    <div class="b-costs">Uvolní parcelu</div>
                </div>
            </div>
        `;
        return;
    }

    for (let key in BUILDING_TYPES) {
        const b = BUILDING_TYPES[key];
        if (b.category === category) {
            let costStr = [];
            for (let c in b.cost) costStr.push(`${b.cost[c]} ${c}`);

            const card = document.createElement('div');
            card.className = `build-card ${K.selectedBuildTool === key ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="b-icon">${b.icon}</div>
                <div class="b-info">
                    <div class="b-name">${b.name}</div>
                    <div class="b-costs">${costStr.join(' • ')}</div>
                </div>
            `;
            card.onclick = () => selectTool(key);
            shelf.appendChild(card);
        }
    }
}

window.selectTool = function(toolKey) {
    if (K.selectedBuildTool === toolKey) {
        K.selectedBuildTool = null; // Toggle off
    } else {
        K.selectedBuildTool = toolKey;
    }
    const curCat = document.querySelector('.cat-btn.active').dataset.cat;
    populateBuildCards(curCat);
    showToast(K.selectedBuildTool ? `Vybrán nástroj: ${toolKey}. Klikni na mapu pro umístění.` : 'Nástroj zrušen.');
};

function openBuildingInspector(b) {
    const panel = document.getElementById('inspector-panel');
    const title = document.getElementById('insp-title');
    const content = document.getElementById('insp-content');

    title.innerText = `${b.name} (Úr. ${b.level})`;

    const def = BUILDING_TYPES[b.type] || {};
    let prodText = [];
    if (def.produces) {
        for (let p in def.produces) prodText.push(`+${def.produces[p]} ${p}/min`);
    }

    content.innerHTML = `
        <div style="color:#94a3b8; font-size:12px;">${def.desc || 'Centrální královský hrad panství.'}</div>
        <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; margin:8px 0;">
            <div>Produkce: <strong style="color:#4ade80;">${prodText.join(', ') || 'Bez přímé produkce'}</strong></div>
            <div>Pracovníci: <strong>${b.workers} poddaných</strong></div>
            <div>Pozice: [${b.gx}, ${b.gy}]</div>
        </div>
        <button class="cat-btn active" style="width:100%; padding:10px;" onclick="upgradeBuilding(${b.id})">
            🔨 Vylepšit na Úroveň ${b.level + 1}
        </button>
    `;

    panel.classList.remove('hidden');
}

window.upgradeBuilding = function(id) {
    const b = K.buildings.find(x => x.id === id);
    if (!b) return;

    if (K.resources.wood < 80 || K.resources.stone < 50 || K.resources.gold < 70) {
        showToast('❌ Nedostatek surovin na vylepšení budovy (potřebuješ 80 🪵, 50 🪨, 70 🪙)!');
        return;
    }

    K.resources.wood -= 80;
    K.resources.stone -= 50;
    K.resources.gold -= 70;
    b.level += 1;

    SFX.play('stone_place');
    showToast(`✨ ${b.name} vylepšeno na úroveň ${b.level}! Zvýšena efektivita.`);
    document.getElementById('inspector-panel').classList.add('hidden');
    recalculateDemographics();
    updateEconomyHUD();
};

function showToast(msg) {
    const deck = document.getElementById('toast-deck');
    const toast = document.createElement('div');
    toast.className = 'strat-toast';
    toast.innerText = msg;
    deck.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

// --- INIT ENGINE ---
const phaserConfig = {
    type: Phaser.AUTO,
    parent: 'canvas-container',
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [StrategyKingdomScene]
};

window.addEventListener('DOMContentLoaded', () => {
    new Phaser.Game(phaserConfig);
    setupDockInteraction();
    startKingdomSimulation();
    recalculateDemographics();
    updateEconomyHUD();
});
