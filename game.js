/**
 * Aetheria: Bastion of the Void
 * Kompletní herní engine postavený na Phaser 3 WebGL.
 * Spojuje dynamickou izometrickou citadelu, syntézu modulů, výpravy do trhlin a taktický boj.
 */

// --- GLOBAL GAME STATE (Saved to localStorage) ---
const STORAGE_KEY = 'aetheria_bastion_v1';

const DEFAULT_STATE = {
    commander: {
        name: "Aetherarch Valerius",
        archetype: "Weaver", // Weaver (Mage/Energy) | Vanguard (Tank/Melee) | Operative (Agility/Tech)
        level: 1,
        resonanceXP: 0,
        resonanceNext: 150,
        attributes: {
            flux: 12,       // Útočná síla a energetický výdej
            kinetic: 10,    // Odolnost, štíty a hull integrity
            synapse: 14,    // Rychlost akcí a kritické frekvence
            coherence: 8    // Stabilita jádra a regenerace
        },
        slots: {
            core: null,     // Primární jádro
            catalyst: null, // Zbraňový katalyzátor
            chassis: null,  // Trup / brnění
            thruster: null  // Pohon / manévrování
        },
        inventory: [] // Moduly a relikvie
    },
    currencies: {
        shards: 1500,
        aether: 800,
        chronos: 20,
        renown: 250
    },
    citadel: {
        coreLevel: 1,
        // Grid 6x6 pro stavby a obranu
        structures: [
            { id: 101, gx: 2, gy: 2, type: 'nexus_core', level: 1, name: 'Rezonanční Jádro' },
            { id: 102, gx: 1, gy: 2, type: 'shard_harvester', level: 1, name: 'Těžební Sonda' },
            { id: 103, gx: 3, gy: 2, type: 'aether_condenser', level: 1, name: 'Kondenzátor Aetheru' },
            { id: 104, gx: 2, gy: 1, type: 'pylon_turret', level: 1, name: 'Obranný Pylon' },
            { id: 105, gx: 2, gy: 3, type: 'warp_gate', level: 1, name: 'Brána do Prázdnoty' }
        ]
    },
    rifts: {
        unlockedTier: 1,
        activeExpedition: null // { riftId, name, duration, remaining, hazard, loot }
    },
    audioEnabled: true
};

let G = JSON.parse(JSON.stringify(DEFAULT_STATE));

// --- SOUND FX SYNTHESIZER (Polyphonic Web Audio API) ---
class SoundManager {
    constructor() {
        this.ctx = null;
    }
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
    }
    play(type) {
        if (!G.audioEnabled) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;

        if (type === 'crystal') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1046.50, t); // C6
            osc.frequency.exponentialRampToValueAtTime(2093.00, t + 0.15); // C7
            g.gain.setValueAtTime(0.18, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc.start(t);
            osc.stop(t + 0.25);
        } else if (type === 'laser') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, t);
            osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);
            g.gain.setValueAtTime(0.2, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc.start(t);
            osc.stop(t + 0.12);
        } else if (type === 'warp') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.linearRampToValueAtTime(880, t + 0.3);
            g.gain.setValueAtTime(0.25, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            osc.start(t);
            osc.stop(t + 0.4);
        } else if (type === 'explosion') {
            // White noise simulation via buffer
            const bufferSize = this.ctx.sampleRate * 0.3;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, t);
            filter.frequency.exponentialRampToValueAtTime(50, t + 0.3);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.3, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            noise.connect(filter);
            filter.connect(g);
            g.connect(this.ctx.destination);
            noise.start(t);
        }
    }
}
const SFX = new SoundManager();

// --- TEXTURE ASSET GENERATOR (High-End Procedural Vector Graphics for Phaser) ---
// Generuje čisté, zářící sci-fi/fantasy textury přímo do GPU bez potřeby stahovat externí obrázky
function generateProceduralTextures(scene) {
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });

    // 1. Isometric Tile (Citadel Ground Grid)
    if (!scene.textures.exists('iso_tile')) {
        gfx.clear();
        gfx.fillStyle(0x0f172a, 1);
        gfx.lineStyle(2, 0x1e293b, 0.9);
        gfx.beginPath();
        gfx.moveTo(64, 0);
        gfx.lineTo(128, 32);
        gfx.lineTo(64, 64);
        gfx.lineTo(0, 32);
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();

        // Inner glowing circuitry
        gfx.lineStyle(1, 0x06b6d4, 0.4);
        gfx.beginPath();
        gfx.moveTo(64, 8);
        gfx.lineTo(112, 32);
        gfx.lineTo(64, 56);
        gfx.lineTo(16, 32);
        gfx.closePath();
        gfx.strokePath();
        gfx.generateTexture('iso_tile', 128, 64);
    }

    // 2. Nexus Core Building
    if (!scene.textures.exists('nexus_core')) {
        gfx.clear();
        // Crystal base
        gfx.fillStyle(0x1e1b4b, 1);
        gfx.lineStyle(2, 0x6366f1, 1);
        gfx.beginPath();
        gfx.moveTo(40, 20);
        gfx.lineTo(80, 40);
        gfx.lineTo(40, 60);
        gfx.lineTo(0, 40);
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();

        // Floating Diamond Crystal
        gfx.fillStyle(0x38bdf8, 0.85);
        gfx.lineStyle(2, 0xa5f3fc, 1);
        gfx.beginPath();
        gfx.moveTo(40, -10);
        gfx.lineTo(60, 20);
        gfx.lineTo(40, 40);
        gfx.lineTo(20, 20);
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();
        gfx.generateTexture('nexus_core', 80, 80);
    }

    // 3. Shard Harvester
    if (!scene.textures.exists('shard_harvester')) {
        gfx.clear();
        gfx.fillStyle(0x083344, 1);
        gfx.lineStyle(2, 0x06b6d4, 1);
        gfx.fillRoundedRect(10, 10, 60, 60, 8);
        gfx.strokeRoundedRect(10, 10, 60, 60, 8);
        // Mining laser drill tip
        gfx.fillStyle(0x22d3ee, 1);
        gfx.fillCircle(40, 40, 12);
        gfx.generateTexture('shard_harvester', 80, 80);
    }

    // 4. Aether Condenser
    if (!scene.textures.exists('aether_condenser')) {
        gfx.clear();
        gfx.fillStyle(0x3b0764, 1);
        gfx.lineStyle(2, 0xa855f7, 1);
        gfx.fillCircle(40, 40, 28);
        gfx.strokeCircle(40, 40, 28);
        gfx.fillStyle(0xc084fc, 0.7);
        gfx.fillCircle(40, 40, 14);
        gfx.generateTexture('aether_condenser', 80, 80);
    }

    // 5. Pylon Turret
    if (!scene.textures.exists('pylon_turret')) {
        gfx.clear();
        gfx.fillStyle(0x18181b, 1);
        gfx.lineStyle(2, 0xef4444, 1);
        gfx.beginPath();
        gfx.moveTo(40, 0);
        gfx.lineTo(65, 60);
        gfx.lineTo(15, 60);
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();
        gfx.fillStyle(0xf87171, 1);
        gfx.fillCircle(40, 15, 6);
        gfx.generateTexture('pylon_turret', 80, 80);
    }

    // 6. Void Particle (Glow Orbs)
    if (!scene.textures.exists('particle_glow')) {
        gfx.clear();
        gfx.fillStyle(0x38bdf8, 1);
        gfx.fillCircle(8, 8, 8);
        gfx.generateTexture('particle_glow', 16, 16);
    }

    // 7. Enemy Drone / Void Entity
    if (!scene.textures.exists('void_swarmer')) {
        gfx.clear();
        gfx.fillStyle(0x450a0a, 1);
        gfx.lineStyle(2, 0xdc2626, 1);
        gfx.beginPath();
        gfx.moveTo(25, 0);
        gfx.lineTo(50, 40);
        gfx.lineTo(25, 30);
        gfx.lineTo(0, 40);
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();
        gfx.generateTexture('void_swarmer', 50, 50);
    }

    gfx.destroy();
}

// ==========================================
// SCENE 1: CITADELA (Interactive Isometric World)
// ==========================================
class CitadelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CitadelScene' });
    }

    create() {
        generateProceduralTextures(this);

        this.cameras.main.setBackgroundColor('#060810');
        this.worldContainer = this.add.container(this.scale.width / 2, this.scale.height / 2 - 40);

        // Grid Dimensions: 6 x 6 Isometric Map
        this.gridSize = 6;
        this.tileWidth = 128;
        this.tileHeight = 64;

        this.renderIsometricGrid();
        this.renderCitadelStructures();
        this.setupCameraControls();
        this.createAmbientAtmosphere();

        // Listen for screen resize
        this.scale.on('resize', this.onResize, this);
    }

    renderIsometricGrid() {
        this.gridTiles = [];
        const startX = 0;
        const startY = - (this.gridSize * this.tileHeight) / 3;

        for (let gx = 0; gx < this.gridSize; gx++) {
            for (let gy = 0; gy < this.gridSize; gy++) {
                const screenX = (gx - gy) * (this.tileWidth / 2);
                const screenY = (gx + gy) * (this.tileHeight / 2) + startY;

                const tile = this.add.image(screenX, screenY, 'iso_tile');
                tile.setOrigin(0.5, 0.5);
                tile.setInteractive({ pixelPerfect: false, cursor: 'pointer' });
                tile.gridX = gx;
                tile.gridY = gy;

                tile.on('pointerover', () => {
                    tile.setTint(0x38bdf8);
                });
                tile.on('pointerout', () => {
                    tile.clearTint();
                });
                tile.on('pointerdown', () => {
                    this.onTileClicked(gx, gy);
                });

                this.worldContainer.add(tile);
                this.gridTiles.push(tile);
            }
        }
    }

    renderCitadelStructures() {
        if (this.structureSprites) {
            this.structureSprites.forEach(s => s.destroy());
        }
        this.structureSprites = [];

        const startY = - (this.gridSize * this.tileHeight) / 3;

        G.citadel.structures.forEach(struct => {
            const screenX = (struct.gx - struct.gy) * (this.tileWidth / 2);
            const screenY = (struct.gx + struct.gy) * (this.tileHeight / 2) + startY - 20;

            const sprite = this.add.image(screenX, screenY, struct.type);
            sprite.setOrigin(0.5, 0.7);
            sprite.setInteractive({ cursor: 'pointer' });

            // Idle floating animation
            this.tweens.add({
                targets: sprite,
                y: screenY - 6,
                duration: 2000 + (struct.id % 5) * 200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Pulse effect for Nexus Core
            if (struct.type === 'nexus_core') {
                const glow = this.add.pointlight(screenX, screenY, 0x38bdf8, 60, 0.3);
                this.worldContainer.add(glow);
            }

            sprite.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
                openStructureInspector(struct);
                SFX.play('crystal');
            });

            this.worldContainer.add(sprite);
            this.structureSprites.push(sprite);
        });
    }

    createAmbientAtmosphere() {
        // Floating Void Aether Motes (Particles)
        const emitter = this.add.particles(0, 0, 'particle_glow', {
            x: { min: -400, max: 400 },
            y: { min: -300, max: 300 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.6, end: 0 },
            speedY: { min: -15, max: -35 },
            lifespan: 4000,
            quantity: 1,
            frequency: 180,
            blendMode: 'ADD'
        });
        this.worldContainer.add(emitter);
    }

    setupCameraControls() {
        // Drag panning for Citadel view
        this.input.on('pointermove', (p) => {
            if (p.isDown) {
                this.worldContainer.x += (p.x - p.prevPosition.x);
                this.worldContainer.y += (p.y - p.prevPosition.y);
            }
        });

        // Mouse Wheel Zoom
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const newScale = Phaser.Math.Clamp(this.worldContainer.scaleX - deltaY * 0.001, 0.7, 1.4);
            this.worldContainer.setScale(newScale);
        });
    }

    onTileClicked(gx, gy) {
        const existing = G.citadel.structures.find(s => s.gx === gx && s.gy === gy);
        if (existing) {
            openStructureInspector(existing);
        } else {
            openBuildInspector(gx, gy);
        }
    }

    onResize(gameSize) {
        this.worldContainer.setPosition(gameSize.width / 2, gameSize.height / 2 - 40);
    }
}

// ==========================================
// SCENE 2: BREACH / INVASION (Real-Time RTS Arena)
// ==========================================
class BreachScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BreachScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#0b0d17');
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.text(24, 80, "⚡ PRŮLOM PRÁZDNOTY: Taktická Invaze", {
            fontFamily: 'Cinzel',
            fontSize: '22px',
            color: '#38bdf8',
            fontStyle: '800'
        });

        this.add.text(24, 110, "Vyber jednotku na spodní liště a klikni do modré zóny pro vysazení. Cíl: zničit rezonátory prázdnoty!", {
            fontFamily: 'Inter',
            fontSize: '13px',
            color: '#94a3b8'
        });

        // Battlefield Grid Background
        const arena = this.add.rectangle(w / 2, h / 2 + 10, w - 80, h - 220, 0x111827);
        arena.setStrokeStyle(2, 0x374151);

        // Enemy Void Obelisks (Targets)
        this.targets = [
            { id: 1, x: w / 2 + 160, y: h / 2 - 60, hp: 450, maxHp: 450, icon: 'shard_harvester' },
            { id: 2, x: w / 2 + 200, y: h / 2 + 40, hp: 600, maxHp: 600, icon: 'nexus_core' },
            { id: 3, x: w / 2 + 120, y: h / 2 + 90, hp: 350, maxHp: 350, icon: 'pylon_turret' }
        ];

        this.targetSprites = [];
        this.targets.forEach(t => {
            const spr = this.add.image(t.x, t.y, t.icon);
            spr.setTint(0xef4444);
            spr.targetData = t;
            this.targetSprites.push(spr);

            // HP bar text
            spr.hpText = this.add.text(t.x, t.y - 45, `${t.hp}/${t.maxHp}`, {
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                color: '#f87171'
            }).setOrigin(0.5);
        });

        this.units = [];

        // Interactive Click to Deploy
        arena.setInteractive();
        arena.on('pointerdown', (p) => {
            this.deployUnit(p.x, p.y);
        });
    }

    deployUnit(x, y) {
        if (x > this.scale.width / 2 - 20) {
            showToast('⚠️ Nemůžeš vysazovat útočné sondy přímo do nepřátelského sektoru!');
            return;
        }

        if (G.currencies.aether < 30) {
            showToast('❌ Nedostatek Aetheru na zhmotnění jednotky (potřebuješ 30 🌀)!');
            return;
        }

        G.currencies.aether -= 30;
        updateHUDValues();
        SFX.play('laser');

        const drone = this.add.image(x, y, 'void_swarmer');
        drone.setTint(0x38bdf8);
        drone.setScale(0.7);
        drone.hp = 80;
        drone.dmg = 15;
        drone.speed = 1.8;

        this.units.push(drone);
    }

    update() {
        // Move deployed player units towards closest enemy target
        this.units.forEach(u => {
            let nearest = null;
            let minDist = 99999;
            this.targetSprites.forEach(t => {
                if (t.targetData.hp > 0) {
                    const d = Phaser.Math.Distance.Between(u.x, u.y, t.x, t.y);
                    if (d < minDist) {
                        minDist = d;
                        nearest = t;
                    }
                }
            });

            if (nearest) {
                const angle = Phaser.Math.Angle.Between(u.x, u.y, nearest.x, nearest.y);
                if (minDist > 40) {
                    u.x += Math.cos(angle) * u.speed;
                    u.y += Math.sin(angle) * u.speed;
                } else {
                    // Attack target
                    nearest.targetData.hp = Math.max(0, nearest.targetData.hp - (u.dmg / 40));
                    nearest.hpText.setText(`${Math.floor(nearest.targetData.hp)}/${nearest.targetData.maxHp}`);

                    if (nearest.targetData.hp <= 0 && !nearest.destroyed) {
                        nearest.destroyed = true;
                        nearest.setAlpha(0.2);
                        SFX.play('explosion');
                        G.currencies.shards += 250;
                        updateHUDValues();
                        showToast('💥 Nepřátelský uzel zničen! Získáno +250 Střepů 💎');
                    }
                }
            }
        });
    }
}

// --- PHASER ENGINE CONFIGURATION ---
const phaserConfig = {
    type: Phaser.AUTO,
    parent: 'phaser-mount',
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: [CitadelScene, BreachScene]
};

let game = null;

window.addEventListener('DOMContentLoaded', () => {
    loadGameState();
    game = new Phaser.Game(phaserConfig);
    setupDOMInteractions();
    startPassiveSimulation();
    updateHUDValues();
});

// --- SAVE & LOAD SYSTEM ---
function loadGameState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            G = Object.assign({}, DEFAULT_STATE, JSON.parse(saved));
        }
    } catch (e) {
        console.warn('Save file fallback');
    }
}

function saveGameState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(G));
    } catch (e) {
        console.error(e);
    }
}

// --- PASSIVE RESOURCES & CORE TICK LOOP ---
function startPassiveSimulation() {
    setInterval(() => {
        let shardGen = 0;
        let aetherGen = 0;

        G.citadel.structures.forEach(s => {
            if (s.type === 'shard_harvester') shardGen += s.level * 3;
            if (s.type === 'aether_condenser') aetherGen += s.level * 2;
        });

        G.currencies.shards += shardGen;
        G.currencies.aether += aetherGen;

        updateHUDValues();
    }, 1000);

    // Auto save
    setInterval(saveGameState, 15000);
}

function updateHUDValues() {
    document.getElementById('res-shards').innerText = Math.floor(G.currencies.shards).toLocaleString();
    document.getElementById('res-aether').innerText = Math.floor(G.currencies.aether).toLocaleString();
    document.getElementById('res-chronos').innerText = G.currencies.chronos;
    document.getElementById('res-renown').innerText = G.currencies.renown;
    document.getElementById('hud-core-rank').innerText = G.citadel.coreLevel;

    // Power score calculation
    const attrSum = Object.values(G.commander.attributes).reduce((a, b) => a + b, 0);
    const structSum = G.citadel.structures.reduce((a, b) => a + b.level * 10, 0);
    document.getElementById('hud-power-score').innerText = attrSum * 4 + structSum;
}

// --- DOM OVERLAYS & UI CONTROLS ---
function setupDOMInteractions() {
    // Dock Navigation Buttons
    document.querySelectorAll('.dock-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetScene = btn.dataset.scene;

            if (targetScene === 'CitadelScene') {
                game.scene.stop('BreachScene');
                game.scene.start('CitadelScene');
                closeInspector();
            } else if (targetScene === 'BreachScene') {
                game.scene.stop('CitadelScene');
                game.scene.start('BreachScene');
                closeInspector();
            } else if (targetScene === 'CommanderScene') {
                openCommanderPanel();
            } else if (targetScene === 'NexusScene') {
                openRiftsPanel();
            } else if (targetScene === 'SanctumScene') {
                openSynthesizerPanel();
            }
        });
    });

    // Close Inspector
    document.getElementById('btn-close-inspector').addEventListener('click', closeInspector);

    // Audio Toggle
    document.getElementById('btn-toggle-audio').addEventListener('click', () => {
        G.audioEnabled = !G.audioEnabled;
        document.getElementById('btn-toggle-audio').innerText = G.audioEnabled ? '🔊' : '🔇';
        showToast(G.audioEnabled ? 'Zvukové efekty zapnuty' : 'Zvukové efekty vypnuty');
    });

    // Fullscreen Toggle
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });
}

function openStructureInspector(struct) {
    const overlay = document.getElementById('inspector-overlay');
    const title = document.getElementById('inspector-title');
    const body = document.getElementById('inspector-content');

    title.innerText = `Struktura: ${struct.name} (Stupeň ${struct.level})`;

    const upgradeCostShards = Math.floor(120 * Math.pow(1.6, struct.level));
    const upgradeCostAether = Math.floor(80 * Math.pow(1.6, struct.level));

    body.innerHTML = `
        <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px;">
            <div style="font-size:42px;">🏛️</div>
            <div>
                <p style="color:#94a3b8;">Pozice v mřížce: [X: ${struct.gx}, Y: ${struct.gy}]</p>
                <p style="font-size:12px; color:#38bdf8;">Zvyšuje rezonanční kapacitu a produkci Citadely.</p>
            </div>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:14px; border-radius:10px; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Požadavek na vylepšení:</span>
                <strong style="color:#06b6d4;">${upgradeCostShards} 💎 Střepů</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span>Aetherová esence:</span>
                <strong style="color:#a855f7;">${upgradeCostAether} 🌀 Aetheru</strong>
            </div>
        </div>
        <button class="dock-btn active" style="width:100%; padding:12px;" onclick="upgradeStructure(${struct.id})">
            ⚡ Vylepšit na Stupeň ${struct.level + 1}
        </button>
    `;

    overlay.classList.remove('hidden');
}

window.upgradeStructure = function(id) {
    const s = G.citadel.structures.find(x => x.id === id);
    if (!s) return;

    const costS = Math.floor(120 * Math.pow(1.6, s.level));
    const costA = Math.floor(80 * Math.pow(1.6, s.level));

    if (G.currencies.shards < costS || G.currencies.aether < costA) {
        showToast('❌ Nedostatek energií pro upgrade struktury!');
        return;
    }

    G.currencies.shards -= costS;
    G.currencies.aether -= costA;
    s.level += 1;

    SFX.play('crystal');
    showToast(`✨ ${s.name} vylepšeno na stupeň ${s.level}!`);
    updateHUDValues();
    closeInspector();

    // Re-render
    const scene = game.scene.getScene('CitadelScene');
    if (scene) scene.renderCitadelStructures();
};

function openBuildInspector(gx, gy) {
    const overlay = document.getElementById('inspector-overlay');
    const title = document.getElementById('inspector-title');
    const body = document.getElementById('inspector-content');

    title.innerText = `Vybudovat Novou Strukturu [${gx}, ${gy}]`;

    body.innerHTML = `
        <p style="color:#94a3b8; margin-bottom:16px;">Vyber energetickou věž nebo těžební uzel k manifestaci na prázdné parcele:</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="dock-btn active" style="width:100%; text-align:left; display:flex; flex-direction:row; justify-content:space-between; padding:12px;" onclick="buildStructure(${gx}, ${gy}, 'shard_harvester')">
                <span>⛏️ Těžební Sonda Střepů</span>
                <strong style="color:#06b6d4;">200 💎</strong>
            </button>
            <button class="dock-btn active" style="width:100%; text-align:left; display:flex; flex-direction:row; justify-content:space-between; padding:12px;" onclick="buildStructure(${gx}, ${gy}, 'aether_condenser')">
                <span>🔮 Kondenzátor Tekutého Aetheru</span>
                <strong style="color:#a855f7;">250 💎</strong>
            </button>
            <button class="dock-btn active" style="width:100%; text-align:left; display:flex; flex-direction:row; justify-content:space-between; padding:12px;" onclick="buildStructure(${gx}, ${gy}, 'pylon_turret')">
                <span>⚡ Obranný Pylon Prázdnoty</span>
                <strong style="color:#ef4444;">350 💎 + 100 🌀</strong>
            </button>
        </div>
    `;

    overlay.classList.remove('hidden');
}

window.buildStructure = function(gx, gy, type) {
    if (G.currencies.shards < 200) {
        showToast('❌ Nedostatek Střepů na stavbu!');
        return;
    }

    G.currencies.shards -= 200;
    const names = {
        shard_harvester: 'Těžební Sonda',
        aether_condenser: 'Kondenzátor Aetheru',
        pylon_turret: 'Obranný Pylon'
    };

    G.citadel.structures.push({
        id: Date.now(),
        gx: gx,
        gy: gy,
        type: type,
        level: 1,
        name: names[type]
    });

    SFX.play('crystal');
    showToast(`🏗️ Postavena struktura: ${names[type]}!`);
    updateHUDValues();
    closeInspector();

    const scene = game.scene.getScene('CitadelScene');
    if (scene) scene.renderCitadelStructures();
};

function openCommanderPanel() {
    const overlay = document.getElementById('inspector-overlay');
    const title = document.getElementById('inspector-title');
    const body = document.getElementById('inspector-content');

    title.innerText = `🧬 Komandér: ${G.commander.name} (Stupeň ${G.commander.level})`;

    body.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>Archetyp: <strong style="color:#38bdf8">${G.commander.archetype}</strong></div>
            <div>Rezonance: <strong>${G.commander.resonanceXP} / ${G.commander.resonanceNext} XP</strong></div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
            <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px;">
                <div style="font-size:12px; color:#94a3b8;">FLUX (Poškození)</div>
                <div style="font-size:20px; font-weight:800; color:#38bdf8;">${G.commander.attributes.flux}</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px;">
                <div style="font-size:12px; color:#94a3b8;">KINETIC (Štíty &amp; Hull)</div>
                <div style="font-size:20px; font-weight:800; color:#34d399;">${G.commander.attributes.kinetic}</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px;">
                <div style="font-size:12px; color:#94a3b8;">SYNAPSE (Krit &amp; Rychlost)</div>
                <div style="font-size:20px; font-weight:800; color:#f59e0b;">${G.commander.attributes.synapse}</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px;">
                <div style="font-size:12px; color:#94a3b8;">COHERENCE (Regenerace)</div>
                <div style="font-size:20px; font-weight:800; color:#a855f7;">${G.commander.attributes.coherence}</div>
            </div>
        </div>
        <button class="dock-btn active" style="width:100%; padding:10px;" onclick="attuneCommander()">
            ⚡ Zvýšit Rezonanci Komandéra (+1 ke všem atributům za 300 💎)
        </button>
    `;

    overlay.classList.remove('hidden');
}

window.attuneCommander = function() {
    if (G.currencies.shards < 300) {
        showToast('❌ Nedostatek Astrálních Střepů!');
        return;
    }
    G.currencies.shards -= 300;
    G.commander.attributes.flux += 1;
    G.commander.attributes.kinetic += 1;
    G.commander.attributes.synapse += 1;
    G.commander.attributes.coherence += 1;
    SFX.play('warp');
    showToast('✨ Rezonance Komandéra byla trvale navýšena!');
    updateHUDValues();
    openCommanderPanel();
};

function openRiftsPanel() {
    const overlay = document.getElementById('inspector-overlay');
    const title = document.getElementById('inspector-title');
    const body = document.getElementById('inspector-content');

    title.innerText = "🌌 Trhliny Prázdnoty (Expedice do Neznáma)";

    body.innerHTML = `
        <p style="color:#94a3b8; margin-bottom:16px;">Vysílej průzkumné expedice skrz nestabilní trhliny. Získej Chronos Kameny a prastaré relikvie.</p>
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="color:#38bdf8;">Trhlina I: Hřbitov Hvězdných Vraků</h4>
                    <div style="font-size:11px; color:#94a3b8;">Doba ponoru: 15s • Riziko: Nízké</div>
                </div>
                <button class="dock-btn active" onclick="launchExpedition(15, 300, 1)">🚀 Vyrazit</button>
            </div>
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="color:#a855f7;">Trhlina II: Jádro Černé Hvězdy</h4>
                    <div style="font-size:11px; color:#94a3b8;">Doba ponoru: 30s • Riziko: Střední</div>
                </div>
                <button class="dock-btn active" onclick="launchExpedition(30, 750, 3)">🚀 Vyrazit</button>
            </div>
        </div>
    `;

    overlay.classList.remove('hidden');
}

window.launchExpedition = function(sec, rewardShards, rewardChronos) {
    closeInspector();
    SFX.play('warp');
    showToast(`🚀 Expedice vyrazila do Prázdnoty! Návrat za ${sec} sekund.`);

    setTimeout(() => {
        G.currencies.shards += rewardShards;
        G.currencies.chronos += rewardChronos;
        SFX.play('crystal');
        showToast(`🎉 Expedice se vrátila s kořistí: +${rewardShards} 💎 a +${rewardChronos} ⏳ Chronos Kameny!`);
        updateHUDValues();
    }, sec * 1000);
};

function openSynthesizerPanel() {
    const overlay = document.getElementById('inspector-overlay');
    const title = document.getElementById('inspector-title');
    const body = document.getElementById('inspector-content');

    title.innerText = "🧪 Alchymistický Syntetizátor Hmoty";

    body.innerHTML = `
        <p style="color:#94a3b8; margin-bottom:14px;">Přeměňuj základní kosmické energie a vytvářej mocné esence pro pohon Citadely.</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="dock-btn active" style="width:100%; text-align:left; display:flex; justify-content:space-between; padding:12px;" onclick="synthesizeAether()">
                <span>Transmutovat 200 💎 Střepů na 100 🌀 Aetheru</span>
                <strong>⚡ Transmutovat</strong>
            </button>
            <button class="dock-btn active" style="width:100%; text-align:left; display:flex; justify-content:space-between; padding:12px;" onclick="synthesizeChronos()">
                <span>Kondenzovat 500 🌀 Aetheru na 2 ⏳ Chronos Kameny</span>
                <strong>⚡ Kondenzovat</strong>
            </button>
        </div>
    `;

    overlay.classList.remove('hidden');
}

window.synthesizeAether = function() {
    if (G.currencies.shards < 200) {
        showToast('❌ Nedostatek Astrálních Střepů!');
        return;
    }
    G.currencies.shards -= 200;
    G.currencies.aether += 100;
    SFX.play('crystal');
    showToast('🌀 Získáno 100 Tekutého Aetheru!');
    updateHUDValues();
};

window.synthesizeChronos = function() {
    if (G.currencies.aether < 500) {
        showToast('❌ Nedostatek Tekutého Aetheru!');
        return;
    }
    G.currencies.aether -= 500;
    G.currencies.chronos += 2;
    SFX.play('warp');
    showToast('⏳ Získány 2 Chronos Kameny!');
    updateHUDValues();
};

function closeInspector() {
    const overlay = document.getElementById('inspector-overlay');
    overlay.classList.add('hidden');
}

function showToast(msg) {
    const rack = document.getElementById('toast-rack');
    const toast = document.createElement('div');
    toast.className = 'game-toast';
    toast.innerHTML = msg;
    rack.appendChild(toast);
    setTimeout(() => toast.remove(), 3400);
}
