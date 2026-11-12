/**
 * Krypta Prázdnoty: Monolit Stínů
 * Inspirováno: Loop Hero x Kingdom x Diablo.
 * Čistý akční WebGL zážitek: Denní příprava a stavba obran, noční brutální vlny stínů.
 * Kompletní Game Feel: Screen-shake, hit-stop, plynulé světelné částice, rezonující basové audio.
 */

// --- GLOBAL STATE ---
const G = {
    dayNight: {
        phase: 'day', // 'day' | 'night'
        dayDuration: 25, // Sekund na přípravu ve dne
        timer: 25,
        nightCount: 1,
        waveProgress: 0
    },
    champion: {
        hp: 350,
        maxHp: 350,
        blood: 120,
        maxBlood: 200,
        speed: 210,
        dashSpeed: 520,
        dashCooldown: 1.2,
        canDash: true,
        atkMin: 32,
        atkMax: 48,
        vampirism: 0.12,
        level: 1
    },
    monolith: {
        hp: 1500,
        maxHp: 1500,
        x: 0,
        y: 0
    },
    currencies: {
        souls: 350,
        blood: 80
    },
    selectedDefense: 'blood_spikes', // 'blood_spikes' | 'soul_turret' | 'pyre_ward'
    defenses: [],
    craftedItem: null
};

// --- PROCEDURAL DARK AUDIO SYNTHESIZER (Low Drone, Resonating Gongs, Slashes) ---
class GothicSoundSynthesizer {
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

        if (sound === 'slash') {
            // White noise filtered whoosh
            const bSize = this.ctx.sampleRate * 0.12;
            const buffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, t);
            filter.frequency.exponentialRampToValueAtTime(300, t + 0.12);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.35, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            noise.connect(filter);
            filter.connect(g);
            g.connect(this.ctx.destination);
            noise.start(t);
        } else if (sound === 'flesh_hit') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, t);
            osc.frequency.exponentialRampToValueAtTime(35, t + 0.09);
            g.gain.setValueAtTime(0.4, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
            osc.start(t);
            osc.stop(t + 0.09);
        } else if (sound === 'gong_night') {
            // Dark Ominous Bell / Gong
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(82.41, t); // E2
            osc.frequency.linearRampToValueAtTime(78.0, t + 1.2);
            g.gain.setValueAtTime(0.5, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
            osc.start(t);
            osc.stop(t + 1.8);
        } else if (sound === 'dash') {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
            g.gain.setValueAtTime(0.25, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
        }
    }
}
const SFX = new GothicSoundSynthesizer();

// --- MAIN PROCEDURAL TEXTURE GENERATOR FOR HIGH-END PIXEL/STYLIZED VISUALS ---
function generateDarkFantasyTextures(scene) {
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });

    // 1. Dark Cobblestone Ground Tile (Loop Hero / Darkest Dungeon vibe)
    if (!scene.textures.exists('dark_ground')) {
        gfx.clear();
        gfx.fillStyle(0x0a080f, 1);
        gfx.fillRect(0, 0, 128, 128);
        // Stone outlines & grit
        gfx.lineStyle(1, 0x1a1524, 0.8);
        gfx.strokeRect(4, 4, 60, 60);
        gfx.strokeRect(68, 4, 56, 60);
        gfx.strokeRect(4, 68, 56, 56);
        gfx.strokeRect(64, 68, 60, 56);
        // Blood specks
        gfx.fillStyle(0x450a0a, 0.35);
        gfx.fillCircle(30, 40, 6);
        gfx.fillCircle(85, 90, 8);
        gfx.generateTexture('dark_ground', 128, 128);
    }

    // 2. The Ancient Monolith (Heart of the Kingdom)
    if (!scene.textures.exists('monolith_core')) {
        gfx.clear();
        // Base altar
        gfx.fillStyle(0x1c1917, 1);
        gfx.lineStyle(3, 0x44403c, 1);
        gfx.fillRoundedRect(16, 60, 64, 36, 6);
        gfx.strokeRoundedRect(16, 60, 64, 36, 6);
        // Towering dark obsidian pillar
        gfx.fillStyle(0x09090b, 1);
        gfx.lineStyle(2, 0xa855f7, 0.9);
        gfx.beginPath();
        gfx.moveTo(48, 6);
        gfx.lineTo(66, 62);
        gfx.lineTo(30, 62);
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();
        // Glowing purple eye / rune
        gfx.fillStyle(0xc084fc, 1);
        gfx.fillCircle(48, 38, 8);
        gfx.generateTexture('monolith_core', 96, 96);
    }

    // 3. The Champion (Player Fighter with Cape & Glowing Blade)
    if (!scene.textures.exists('champion_sprite')) {
        gfx.clear();
        // Shadow cape
        gfx.fillStyle(0x18181b, 1);
        gfx.fillCircle(20, 26, 12);
        // Armored body
        gfx.fillStyle(0x3f3f46, 1);
        gfx.lineStyle(1, 0xd4af37, 1);
        gfx.fillCircle(20, 18, 9);
        gfx.strokeCircle(20, 18, 9);
        // Hood / Helm
        gfx.fillStyle(0x713f12, 1);
        gfx.fillCircle(20, 12, 6);
        // Glowing Claymore Sword
        gfx.lineStyle(3, 0x38bdf8, 1);
        gfx.beginPath();
        gfx.moveTo(22, 10);
        gfx.lineTo(38, -2);
        gfx.strokePath();
        gfx.generateTexture('champion_sprite', 44, 44);
    }

    // 4. Void Beast / Shadow Creeper (Enemy)
    if (!scene.textures.exists('void_stalker')) {
        gfx.clear();
        gfx.fillStyle(0x180509, 1);
        gfx.lineStyle(2, 0xdc2626, 1);
        gfx.fillCircle(18, 18, 13);
        gfx.strokeCircle(18, 18, 13);
        // Blood red twin glowing eyes
        gfx.fillStyle(0xef4444, 1);
        gfx.fillCircle(14, 14, 3);
        gfx.fillCircle(22, 14, 3);
        // Claws
        gfx.lineStyle(2, 0xef4444, 0.8);
        gfx.beginPath();
        gfx.moveTo(6, 26); gfx.lineTo(12, 34);
        gfx.moveTo(30, 26); gfx.lineTo(24, 34);
        gfx.strokePath();
        gfx.generateTexture('void_stalker', 36, 36);
    }

    // 5. Elite Abomination (Night Mini-Boss)
    if (!scene.textures.exists('void_brute')) {
        gfx.clear();
        gfx.fillStyle(0x270707, 1);
        gfx.lineStyle(3, 0xef4444, 1);
        gfx.fillCircle(30, 30, 24);
        gfx.strokeCircle(30, 30, 24);
        // Horns / Spikes
        gfx.fillStyle(0x7f1d1d, 1);
        gfx.beginPath();
        gfx.moveTo(10, 16); gfx.lineTo(2, 0); gfx.lineTo(20, 10);
        gfx.moveTo(50, 16); gfx.lineTo(58, 0); gfx.lineTo(40, 10);
        gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('void_brute', 60, 60);
    }

    // 6. Blood Spikes (Trap)
    if (!scene.textures.exists('blood_spikes')) {
        gfx.clear();
        gfx.fillStyle(0x450a0a, 0.9);
        gfx.lineStyle(2, 0xef4444, 1);
        gfx.fillCircle(20, 20, 14);
        gfx.strokeCircle(20, 20, 14);
        gfx.fillStyle(0xdc2626, 1);
        gfx.fillTriangle(14, 28, 20, 8, 26, 28);
        gfx.generateTexture('blood_spikes', 40, 40);
    }

    // 7. Soul Turret (Eye)
    if (!scene.textures.exists('soul_turret')) {
        gfx.clear();
        gfx.fillStyle(0x1e1b4b, 1);
        gfx.lineStyle(2, 0x818cf8, 1);
        gfx.fillCircle(20, 20, 16);
        gfx.strokeCircle(20, 20, 16);
        gfx.fillStyle(0x38bdf8, 1);
        gfx.fillCircle(20, 20, 7);
        gfx.generateTexture('soul_turret', 40, 40);
    }

    // 8. Pyre Ward (Fire Pit)
    if (!scene.textures.exists('pyre_ward')) {
        gfx.clear();
        gfx.fillStyle(0x292524, 1);
        gfx.lineStyle(2, 0xf59e0b, 1);
        gfx.fillCircle(20, 20, 18);
        gfx.strokeCircle(20, 20, 18);
        gfx.fillStyle(0xf97316, 1);
        gfx.fillCircle(20, 20, 9);
        gfx.generateTexture('pyre_ward', 40, 40);
    }

    // 9. Particle Ember
    if (!scene.textures.exists('ember_particle')) {
        gfx.clear();
        gfx.fillStyle(0xf59e0b, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('ember_particle', 8, 8);
    }

    gfx.destroy();
}

// ====================================================
// SCENE: THE DARK SANCTUM (Main Action & Combat Arena)
// ====================================================
class SanctumScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SanctumScene' });
    }

    create() {
        generateDarkFantasyTextures(this);

        const w = this.scale.width;
        const h = this.scale.height;

        // 1. Tiled Atmospheric Floor
        this.floor = this.add.tileSprite(0, 0, w * 2, h * 2, 'dark_ground');
        this.floor.setOrigin(0.5, 0.5);

        // 2. Center Sacred Monolith
        G.monolith.x = 0;
        G.monolith.y = 0;
        this.monolithSprite = this.physics.add.staticSprite(0, 0, 'monolith_core');
        this.monolithSprite.setScale(1.2);

        // Floating Monolith Rune Pulse
        this.tweens.add({
            targets: this.monolithSprite,
            scaleY: 1.25,
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 3. The Champion (Player Character)
        this.player = this.physics.add.sprite(0, 100, 'champion_sprite');
        this.player.setCollideWorldBounds(false);
        this.player.setCircle(14, 8, 8);

        // Camera Follow with Gothic Smooth Damping
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setZoom(1.15);

        // Ambient Falling Dark Embers / Ashes
        this.embers = this.add.particles(0, 0, 'ember_particle', {
            x: { min: -1000, max: 1000 },
            y: { min: -800, max: 800 },
            speedY: { min: -10, max: -40 },
            speedX: { min: -15, max: 15 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 3000,
            quantity: 2,
            frequency: 150,
            blendMode: 'ADD'
        });

        // Groups
        this.enemies = this.physics.add.group();
        this.defensesGroup = this.physics.add.staticGroup();
        this.projectiles = this.physics.add.group();

        // Controls
        this.keys = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        // Mouse Attack
        this.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) {
                this.executeMeleeAttack(pointer);
            }
        });

        // Setup Collisions
        this.physics.add.overlap(this.enemies, this.monolithSprite, this.onEnemyHitsMonolith, null, this);
        this.physics.add.overlap(this.enemies, this.defensesGroup, this.onEnemyHitsDefense, null, this);
        this.physics.add.overlap(this.projectiles, this.enemies, this.onProjectileHitsEnemy, null, this);

        // Day/Night Loop Timer
        this.time.addEvent({
            delay: 1000,
            callback: this.tickDayNightClock,
            callbackScope: this,
            loop: true
        });

        // Defense Placement on Right Click or via Dock
        this.input.on('pointerup', (pointer) => {
            if (pointer.rightButtonReleased() || this.isPlacingDefense) {
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                this.placeDefense(worldPoint.x, worldPoint.y);
            }
        });
    }

    update(time, delta) {
        this.handlePlayerMovement();

        // Background scroll follow
        this.floor.tilePositionX = this.cameras.main.scrollX;
        this.floor.tilePositionY = this.cameras.main.scrollY;

        // Enemies AI tracking towards Monolith or Player
        this.enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            // Target is whichever is closer: Player or Monolith
            const distToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            const distToMonolith = Phaser.Math.Distance.Between(enemy.x, enemy.y, 0, 0);

            const targetX = (distToPlayer < 180) ? this.player.x : 0;
            const targetY = (distToPlayer < 180) ? this.player.y : 0;

            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
            enemy.setVelocity(Math.cos(angle) * enemy.speed, Math.sin(angle) * enemy.speed);

            // Enemy attacks player if in melee reach
            if (distToPlayer < 28 && !enemy.attackCooldown) {
                this.damagePlayer(enemy.dmg);
                enemy.attackCooldown = true;
                this.time.delayedCall(1000, () => enemy.attackCooldown = false);
            }
        });

        // Turret firing AI
        this.defensesGroup.getChildren().forEach(def => {
            if (def.defenseType === 'soul_turret' && !def.fireCooldown) {
                let nearest = null;
                let minDist = 240;
                this.enemies.getChildren().forEach(e => {
                    const d = Phaser.Math.Distance.Between(def.x, def.y, e.x, e.y);
                    if (d < minDist) {
                        minDist = d;
                        nearest = e;
                    }
                });

                if (nearest) {
                    this.fireTurretOrb(def.x, def.y, nearest);
                    def.fireCooldown = true;
                    this.time.delayedCall(1200, () => def.fireCooldown = false);
                }
            }
        });
    }

    handlePlayerMovement() {
        if (!this.player.active) return;

        let vx = 0;
        let vy = 0;

        if (this.keys.A.isDown) vx -= 1;
        if (this.keys.D.isDown) vx += 1;
        if (this.keys.W.isDown) vy -= 1;
        if (this.keys.S.isDown) vy += 1;

        const currentSpeed = this.isDashing ? G.champion.dashSpeed : G.champion.speed;

        if (vx !== 0 && vy !== 0) {
            vx *= 0.7071;
            vy *= 0.7071;
        }

        this.player.setVelocity(vx * currentSpeed, vy * currentSpeed);

        // Face mouse cursor
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);
        this.player.setRotation(angle);

        // Spacebar Dash
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && G.champion.canDash && (vx !== 0 || vy !== 0)) {
            this.executeDash();
        }
    }

    executeDash() {
        G.champion.canDash = false;
        this.isDashing = true;
        SFX.play('dash');

        // Ghost Trail Shader Effect
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 35, () => {
                const ghost = this.add.image(this.player.x, this.player.y, 'champion_sprite');
                ghost.setRotation(this.player.rotation);
                ghost.setAlpha(0.5);
                ghost.setTint(0x38bdf8);
                this.tweens.add({
                    targets: ghost,
                    alpha: 0,
                    scale: 0.8,
                    duration: 250,
                    onComplete: () => ghost.destroy()
                });
            });
        }

        this.time.delayedCall(180, () => {
            this.isDashing = false;
        });

        this.time.delayedCall(G.champion.dashCooldown * 1000, () => {
            G.champion.canDash = true;
        });
    }

    executeMeleeAttack(pointer) {
        if (this.isAttacking) return;
        this.isAttacking = true;
        SFX.play('slash');

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);

        // Visual Sword Slash Arc Sweep
        const slash = this.add.graphics();
        slash.lineStyle(4, 0x38bdf8, 0.9);
        slash.beginPath();
        slash.arc(this.player.x, this.player.y, 48, angle - 0.7, angle + 0.7);
        slash.strokePath();

        this.tweens.add({
            targets: slash,
            alpha: 0,
            duration: 160,
            onComplete: () => slash.destroy()
        });

        // Hit Detection within arc
        this.enemies.getChildren().forEach(enemy => {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            const enemyAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angle - enemyAngle));

            if (dist <= 62 && angleDiff <= 0.8) {
                const dmg = Phaser.Math.Between(G.champion.atkMin, G.champion.atkMax);
                this.damageEnemy(enemy, dmg, true);
            }
        });

        this.time.delayedCall(240, () => {
            this.isAttacking = false;
        });
    }

    damageEnemy(enemy, dmg, isCrit) {
        enemy.hp -= dmg;
        SFX.play('flesh_hit');

        // Hit-Stop: Micro Freeze-Frame (Extreme Game Feel)
        if (isCrit) {
            this.cameras.main.shake(120, 0.008);
            this.physics.world.pause();
            setTimeout(() => {
                if (this.physics && this.physics.world) this.physics.world.resume();
            }, 35);
        }

        // Floating Damage Number
        this.spawnDamageNumber(enemy.x, enemy.y, dmg, isCrit);

        // Knockback
        const kbAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        enemy.x += Math.cos(kbAngle) * 14;
        enemy.y += Math.sin(kbAngle) * 14;

        // Vampirism Heal
        if (G.champion.vampirism > 0) {
            const heal = Math.floor(dmg * G.champion.vampirism);
            G.champion.hp = Math.min(G.champion.maxHp, G.champion.hp + heal);
            updateHUDVitals();
        }

        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
        }
    }

    damagePlayer(amount) {
        G.champion.hp = Math.max(0, G.champion.hp - amount);
        this.cameras.main.shake(180, 0.015);
        SFX.play('flesh_hit');
        this.spawnDamageNumber(this.player.x, this.player.y, amount, false, '#ef4444');
        updateHUDVitals();

        if (G.champion.hp <= 0) {
            this.triggerGameOver();
        }
    }

    onEnemyHitsMonolith(monolith, enemy) {
        G.monolith.hp = Math.max(0, G.monolith.hp - (enemy.dmg * 0.8));
        this.cameras.main.shake(90, 0.006);
        updateHUDVitals();

        // Spawn hit sparks
        this.spawnDamageNumber(monolith.x + (Math.random() * 40 - 20), monolith.y - 40, Math.floor(enemy.dmg * 0.8), false, '#c084fc');

        if (G.monolith.hp <= 0) {
            this.triggerGameOver();
        }
    }

    onEnemyHitsDefense(defense, enemy) {
        if (defense.defenseType === 'blood_spikes') {
            this.damageEnemy(enemy, 35, false);
            enemy.speed = Math.max(30, enemy.speed * 0.6); // Slow down
        } else if (defense.defenseType === 'pyre_ward') {
            this.damageEnemy(enemy, 20, false);
        }
    }

    fireTurretOrb(x, y, target) {
        const orb = this.projectiles.create(x, y, 'ember_particle');
        orb.setTint(0x38bdf8);
        orb.setScale(1.6);
        const angle = Phaser.Math.Angle.Between(x, y, target.x, target.y);
        orb.setVelocity(Math.cos(angle) * 380, Math.sin(angle) * 380);
        orb.dmg = 45;
        this.time.delayedCall(1500, () => orb.destroy());
    }

    onProjectileHitsEnemy(projectile, enemy) {
        this.damageEnemy(enemy, projectile.dmg, false);
        projectile.destroy();
    }

    killEnemy(enemy) {
        // Collect souls and blood
        G.currencies.souls += enemy.rewardSouls;
        G.currencies.blood += enemy.rewardBlood;
        updateHUDVitals();

        // Death blood explosion particles
        for (let i = 0; i < 6; i++) {
            const p = this.add.circle(enemy.x, enemy.y, 3, 0xef4444);
            const a = Math.random() * Math.PI * 2;
            const spd = Math.random() * 60 + 20;
            this.physics.add.existing(p);
            p.body.setVelocity(Math.cos(a) * spd, Math.sin(a) * spd);
            this.tweens.add({
                targets: p,
                alpha: 0,
                duration: 400,
                onComplete: () => p.destroy()
            });
        }

        enemy.destroy();
    }

    spawnDamageNumber(x, y, dmg, isCrit, colorOverride) {
        const txt = this.add.text(x, y - 10, `${dmg}${isCrit ? '!' : ''}`, {
            fontFamily: 'Cinzel',
            fontSize: isCrit ? '18px' : '13px',
            fontStyle: '800',
            color: colorOverride || (isCrit ? '#fcd34d' : '#f87171')
        }).setOrigin(0.5);

        this.tweens.add({
            targets: txt,
            y: y - 38,
            alpha: 0,
            scale: isCrit ? 1.4 : 1.0,
            duration: 650,
            ease: 'Power2',
            onComplete: () => txt.destroy()
        });
    }

    placeDefense(x, y) {
        const costs = { blood_spikes: 25, soul_turret: 50, pyre_ward: 80 };
        const cost = costs[G.selectedDefense];

        if (G.currencies.blood < cost) {
            showToast('❌ Nedostatek Krevních Rubínů na runovou obranu!');
            return;
        }

        G.currencies.blood -= cost;
        updateHUDVitals();
        SFX.play('slash');

        const def = this.defensesGroup.create(x, y, G.selectedDefense);
        def.defenseType = G.selectedDefense;
        def.setScale(1.1);

        // Placement particle shockwave
        const ring = this.add.circle(x, y, 10, 0xd4af37, 0);
        ring.setStrokeStyle(2, 0xd4af37);
        this.tweens.add({
            targets: ring,
            radius: 40,
            alpha: 0,
            duration: 350,
            onComplete: () => ring.destroy()
        });

        showToast(`📍 Umístěna obrana: ${G.selectedDefense}`);
    }

    tickDayNightClock() {
        if (G.dayNight.phase === 'day') {
            G.dayNight.timer -= 1;
            document.getElementById('cycle-seconds').innerText = `${G.dayNight.timer}s`;
            const fillPct = (G.dayNight.timer / G.dayNight.dayDuration) * 100;
            document.getElementById('cycle-timer-bar').style.width = `${fillPct}%`;

            if (G.dayNight.timer <= 0) {
                this.startNightPhase();
            }
        }
    }

    startNightPhase() {
        G.dayNight.phase = 'night';
        document.getElementById('cycle-phase').innerText = `NOC HRŮZY (${G.dayNight.nightCount})`;
        document.getElementById('cycle-icon').innerText = '🌙';
        document.getElementById('cycle-orb').classList.add('night');
        document.getElementById('btn-trigger-night').style.display = 'none';

        SFX.play('gong_night');
        this.cameras.main.flash(500, 30, 0, 10);
        showToast(`🌙 NOC ${G.dayNight.nightCount} ZAPOČALA! Připrav se k boji!`);

        // Atmospheric Dark Night Tint
        this.cameras.main.setBackgroundColor('#040306');

        // Spawn Wave of Monsters
        const monsterCount = 8 + (G.dayNight.nightCount * 5);
        for (let i = 0; i < monsterCount; i++) {
            this.time.delayedCall(i * 1200, () => {
                this.spawnVoidEnemy();
            });
        }

        // Night duration: after all monsters or 35 seconds
        this.time.delayedCall(35000, () => {
            this.endNightPhase();
        });
    }

    spawnVoidEnemy() {
        // Spawn randomly around outside radius
        const angle = Math.random() * Math.PI * 2;
        const dist = 520;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;

        const isElite = Math.random() < 0.2;
        const key = isElite ? 'void_brute' : 'void_stalker';

        const e = this.enemies.create(x, y, key);
        e.hp = isElite ? 180 + (G.dayNight.nightCount * 30) : 50 + (G.dayNight.nightCount * 12);
        e.dmg = isElite ? 22 : 10;
        e.speed = isElite ? 65 : 105;
        e.rewardSouls = isElite ? 45 : 12;
        e.rewardBlood = isElite ? 15 : 4;
    }

    endNightPhase() {
        G.dayNight.phase = 'day';
        G.dayNight.nightCount += 1;
        G.dayNight.timer = G.dayNight.dayDuration;

        document.getElementById('cycle-phase').innerText = 'ÚSVIT PŘÍPRAVY';
        document.getElementById('cycle-icon').innerText = '☀️';
        document.getElementById('cycle-orb').classList.remove('night');
        document.getElementById('btn-trigger-night').style.display = 'inline-block';
        document.getElementById('cur-night-count').innerText = G.dayNight.nightCount;

        // Heal Monolith slightly for surviving
        G.monolith.hp = Math.min(G.monolith.maxHp, G.monolith.hp + 250);
        updateHUDVitals();

        showToast(`☀️ ÚSVIT! Přežil jsi noc! Monolit zrekonstruoval +250 HP.`);
    }

    triggerGameOver() {
        this.physics.pause();
        document.getElementById('defeat-screen').classList.remove('hidden');
        document.getElementById('defeat-nights-val').innerText = G.dayNight.nightCount - 1;
    }
}

// --- PHASER ENGINE INIT ---
const config = {
    type: Phaser.AUTO,
    parent: 'phaser-root',
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [SanctumScene]
};

let game = null;

window.addEventListener('DOMContentLoaded', () => {
    game = new Phaser.Game(config);
    setupHUDListeners();
    updateHUDVitals();
});

// --- HUD UPDATE & INTERACTION ---
function updateHUDVitals() {
    // Champion Bars
    const hpPct = (G.champion.hp / G.champion.maxHp) * 100;
    document.getElementById('champ-hp-bar').style.width = `${hpPct}%`;
    document.getElementById('champ-hp-text').innerText = `${Math.floor(G.champion.hp)} / ${G.champion.maxHp}`;

    // Monolith Bars
    const mHpPct = (G.monolith.hp / G.monolith.maxHp) * 100;
    document.getElementById('monolith-hp-bar').style.width = `${mHpPct}%`;
    document.getElementById('monolith-hp-val').innerText = `${Math.floor(G.monolith.hp)} / ${G.monolith.maxHp} HP`;

    // Currencies
    document.getElementById('cur-souls').innerText = G.currencies.souls;
    document.getElementById('cur-blood').innerText = G.currencies.blood;
}

function setupHUDListeners() {
    // Immediate Night Trigger Button
    document.getElementById('btn-trigger-night').addEventListener('click', () => {
        const scene = game.scene.getScene('SanctumScene');
        if (scene && G.dayNight.phase === 'day') {
            scene.startNightPhase();
        }
    });

    // Defense Palette Selection
    document.querySelectorAll('.defense-card:not(.action-card)').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.defense-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            G.selectedDefense = card.dataset.type;
        });
    });

    // Open/Close Dark Altar
    document.getElementById('btn-open-altar').addEventListener('click', () => {
        document.getElementById('altar-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-altar').addEventListener('click', () => {
        document.getElementById('altar-modal').classList.add('hidden');
    });

    // Cursed Item Crafting Ritual (Diablo Affixes)
    document.getElementById('btn-forge-item').addEventListener('click', craftCursedItem);

    // Restart
    document.getElementById('btn-restart-game').addEventListener('click', () => {
        window.location.reload();
    });
}

// DIABLO-STYLE RANDOM CURSED AFFIX CRAFTING
function craftCursedItem() {
    if (G.currencies.souls < 120 || G.currencies.blood < 40) {
        showToast('❌ Nedostatek Duší nebo Krve pro obětní rituál!');
        return;
    }

    G.currencies.souls -= 120;
    G.currencies.blood -= 40;
    updateHUDVitals();
    SFX.play('flesh_hit');

    const prefixes = ['Prokletá', 'Krvavá', 'Hladová', 'Stínová', 'Démonická'];
    const items = ['Čepel Zatracených', 'Zbroj Popravčího', 'Relikvie Zmaru'];
    const positiveAffixes = [
        { text: '+25 k Síle Úderu', apply: () => { G.champion.atkMin += 10; G.champion.atkMax += 15; } },
        { text: '+10% Vampirismus', apply: () => { G.champion.vampirism += 0.10; } },
        { text: '+100 k Maximálním Životům', apply: () => { G.champion.maxHp += 100; G.champion.hp += 100; } }
    ];
    const curseAffixes = [
        'Prokletí: Ztrácíš 1 HP za každé zabité monstrum',
        'Prokletí: Monstra způsobují o 10% vyšší poškození Monolitu',
        'Prokletí: Oběť vyžaduje krev šampiona'
    ];

    const chosenName = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${items[Math.floor(Math.random() * items.length)]}`;
    const pos = positiveAffixes[Math.floor(Math.random() * positiveAffixes.length)];
    const curse = curseAffixes[Math.floor(Math.random() * curseAffixes.length)];

    pos.apply();
    updateHUDVitals();

    document.getElementById('item-result-preview').innerHTML = `
        <div style="text-align:left; width:100%;">
            <div style="color:#d4af37; font-weight:bold; font-size:14px; margin-bottom:4px;">✨ ${chosenName}</div>
            <div style="color:#38bdf8; font-size:11px;">${pos.text}</div>
            <div style="color:#ef4444; font-size:11px; font-style:italic;">${curse}</div>
        </div>
    `;

    document.getElementById('stat-atk').innerText = `${G.champion.atkMin}-${G.champion.atkMax}`;
    document.getElementById('stat-vamp').innerText = `${Math.round(G.champion.vampirism * 100)}%`;

    showToast(`🗡️ Vykován artefakt: ${chosenName}!`);
}

function showToast(msg) {
    const shelf = document.getElementById('toast-shelf');
    const toast = document.createElement('div');
    toast.className = 'gothic-toast';
    toast.innerHTML = msg;
    shelf.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}
