import { MAPS, SOLID_TILES } from './data/maps.js';
import { MONSTERS, createMonster } from './data/monsters.js';
import { ITEMS } from './data/items.js';
import { TILE_SIZE, drawTile, drawCharacter, drawItemOrb } from './sprites.js';
import { BattleSystem } from './battle.js';
import { UIOverlay } from './ui.js';
import { audio } from './audio.js';

const SAVE_KEY = 'monster_quest_save_v1';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.battle = new BattleSystem(this);
    this.ui = new UIOverlay(this);

    this.speedMult = 1;
    this.animTick = 0;
    this.keys = new Set();

    this.mode = 'title'; // 'title' | 'overworld'
    this.titleCursor = 0;
    this.hasSave = Boolean(localStorage.getItem(SAVE_KEY));

    this.dialogQueue = [];
    this.dialogOnDone = null;
    this.bannerText = '';
    this.bannerTimer = 0;
    this.alertBubble = null; // { x, y, timer }

    this.moving = false;
    this.moveProgress = 0;
    this.moveFrom = { x: 0, y: 0 };
    this.moveTo = { x: 0, y: 0 };
    this.jumpOffset = 0;

    this.state = this.createInitialState();
  }

  createInitialState() {
    return {
      mapId: 'verdant_town',
      x: 13,
      y: 10,
      dir: 'down',
      money: 1000,
      party: [],
      pcBox: [],
      bag: { orb: 5, potion: 3 },
      dexSeen: {},
      dexCaught: {},
      defeatedTrainers: {},
      collectedItems: {},
      badges: [],
      shinyCount: 0,
      repelSteps: 0,
      starterPicked: false,
      timeTick: 200, // 0..2400 (day: 0..1400, night: 1400..2400)
      options: {
        expShare: true,
        dayNight: true,
      },
    };
  }

  saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    this.hasSave = true;
  }

  loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      this.state = JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  }

  isNight() {
    if (!this.state.options.dayNight) return false;
    return (this.state.timeTick % 2400) >= 1400;
  }

  markSeen(speciesId) {
    this.state.dexSeen[speciesId] = true;
  }

  markCaught(speciesId) {
    this.state.dexSeen[speciesId] = true;
    this.state.dexCaught[speciesId] = true;
  }

  addMonster(mon) {
    this.markCaught(mon.speciesId);
    if (this.state.party.length < 6) {
      this.state.party.push(mon);
      return true;
    }
    this.state.pcBox.push(mon);
    return false;
  }

  addItem(id, count = 1) {
    this.state.bag[id] = (this.state.bag[id] || 0) + count;
  }

  removeItem(id, count = 1) {
    if (!this.state.bag[id]) return;
    this.state.bag[id] = Math.max(0, this.state.bag[id] - count);
    if (this.state.bag[id] === 0) delete this.state.bag[id];
  }

  showDialog(lines, onDone = null) {
    this.dialogQueue = [...lines];
    this.dialogOnDone = onDone;
  }

  playMapBgm() {
    const map = MAPS[this.state.mapId];
    if (map) audio.playBgm(map.bgm);
  }

  syncTopButtons() {
    const soundBtn = document.getElementById('btn-sound');
    const speedBtn = document.getElementById('btn-speed');
    if (soundBtn) soundBtn.textContent = audio.enabled ? '🔊 Zvuk: ZAP' : '🔇 Zvuk: VYP';
    if (speedBtn) speedBtn.textContent = `⚡ ${this.speedMult}x`;
  }

  blackoutRecover() {
    this.moving = false;
    this.moveProgress = 0;
    this.jumpOffset = 0;
    this.state.mapId = 'heal_center';
    this.state.x = 5;
    this.state.y = 4;
    this.state.dir = 'down';
    this.healAllParty();
    this.playMapBgm();
    this.showDialog(['Sestra: Tvé příšerky jsme rychle ošetřili. Dávej na sebe větší pozor!']);
  }

  healAllParty() {
    audio.sfx('heal');
    for (const m of this.state.party) {
      m.hp = m.maxHp;
      m.status = null;
      m.sleepTurns = 0;
      for (const mv of m.moves) {
        mv.pp = null;
      }
    }
  }

  onKeyDown(rawKey) {
    const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
    audio.unlock();
    this.keys.add(key);

    if (key === 'f') {
      this.speedMult = this.speedMult === 1 ? 2 : 1;
      this.syncTopButtons();
      return;
    }

    if (this.mode === 'title') {
      if (this.hasSave && (key === 'ArrowDown' || key === 'ArrowUp' || key === 'w' || key === 's')) {
        this.titleCursor = 1 - this.titleCursor;
        audio.sfx('blip');
      }
      if (key === 'z' || key === 'Enter' || key === ' ') {
        audio.sfx('confirm');
        if (this.hasSave && this.titleCursor === 0) {
          this.loadGame();
        } else {
          this.state = this.createInitialState();
          this.showDialog([
            'Vítej ve světě MONSTER QUEST!',
            'Jdi do Laboratoře (levý horní dům) a vyber si svou první příšerku!'
          ]);
        }
        this.mode = 'overworld';
        this.playMapBgm();
      }
      return;
    }

    if (this.battle.active) {
      this.battle.handleInput(key);
      return;
    }

    if (this.dialogQueue.length > 0) {
      if (key === 'z' || key === 'Enter' || key === ' ' || key === 'x') {
        audio.sfx('blip');
        this.dialogQueue.shift();
        if (this.dialogQueue.length === 0 && this.dialogOnDone) {
          const cb = this.dialogOnDone;
          this.dialogOnDone = null;
          cb();
        }
      }
      return;
    }

    if (this.ui.screen) {
      this.ui.handleInput(key);
      return;
    }

    if (key === 'm' || key === 'Escape') {
      audio.sfx('confirm');
      this.ui.open('start');
      return;
    }

    if (key === 'z' || key === 'Enter' || key === ' ') {
      this.interact();
    }
  }

  onKeyUp(rawKey) {
    const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
    this.keys.delete(key);
  }

  interact() {
    const map = MAPS[this.state.mapId];
    const deltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = deltas[this.state.dir];
    const tx = this.state.x + dx;
    const ty = this.state.y + dy;

    // Signs
    const sign = map.signs.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      audio.sfx('confirm');
      this.showDialog([sign.text]);
      return;
    }

    // Ground items
    const itemObj = map.items.find((it) => it.x === tx && it.y === ty && !this.state.collectedItems[it.id]);
    if (itemObj) {
      audio.sfx('catchSuccess');
      this.state.collectedItems[itemObj.id] = true;
      this.addItem(itemObj.item, itemObj.count);
      this.showDialog([`Našel jsi ${ITEMS[itemObj.item].name} (x${itemObj.count})!`]);
      return;
    }

    // NPCs
    const npc = map.npcs.find((n) => n.x === tx && n.y === ty);
    if (!npc) return;

    if (npc.isOrb) {
      if (this.state.starterPicked) {
        this.showDialog(['Už sis svou první příšerku vybral!']);
        return;
      }
      audio.sfx('catchSuccess');
      const starter = createMonster(npc.starterId, 5, false);
      this.addMonster(starter);
      this.state.starterPicked = true;
      this.showDialog([
        `Vybral sis příšerku ${MONSTERS[npc.starterId].name}!`,
        'Prof. Dub ti věnoval 5x Chytací Orb a Monsterdex!',
        'Vydej se na sever na Cestu 1 a získej Kamenný odznak v Kamenném Městě!'
      ]);
      return;
    }

    if (npc.healParty) {
      this.healAllParty();
      this.showDialog(npc.text);
      return;
    }

    if (npc.openShop) {
      audio.sfx('confirm');
      this.showDialog(npc.text, () => this.ui.open('shop'));
      return;
    }

    if (npc.openPC) {
      audio.sfx('confirm');
      this.ui.open('pc');
      return;
    }

    if (npc.trainer) {
      if (this.state.defeatedTrainers[npc.id]) {
        this.showDialog([npc.trainer.defeat]);
      } else {
        this.showDialog([npc.trainer.intro], () => this.battle.startTrainer(npc));
      }
      return;
    }

    if (npc.text) {
      audio.sfx('confirm');
      this.showDialog(npc.text);
    }
  }

  update() {
    this.animTick++;

    if (this.bannerTimer > 0) this.bannerTimer--;

    if (this.mode !== 'overworld') return;

    // Day/Night progression
    if (this.state.options.dayNight && this.animTick % 4 === 0) {
      this.state.timeTick = (this.state.timeTick + 1) % 2400;
      const badge = document.getElementById('time-badge');
      if (badge) {
        badge.textContent = this.isNight() ? '🌙 NOC' : '☀️ DEN';
      }
    }

    if (this.battle.active) {
      this.battle.update();
      return;
    }

    if (this.alertBubble) {
      this.alertBubble.timer--;
      if (this.alertBubble.timer <= 0) {
        const npc = this.alertBubble.npc;
        this.alertBubble = null;
        this.showDialog([npc.trainer.intro], () => this.battle.startTrainer(npc));
      }
      return;
    }

    if (this.dialogQueue.length > 0 || this.ui.screen) return;

    if (this.moving) {
      const running = this.keys.has('Shift') || this.keys.has('x');
      const stepSpeed = (running ? 0.22 : 0.125) * this.speedMult;
      this.moveProgress += stepSpeed;
      if (this.moveProgress >= 1) {
        this.moving = false;
        this.moveProgress = 0;
        this.jumpOffset = 0;
        this.state.x = this.moveTo.x;
        this.state.y = this.moveTo.y;
        this.onStepComplete();
      }
      return;
    }

    // Check directional input
    let dir = null;
    if (this.keys.has('ArrowUp') || this.keys.has('w')) dir = 'up';
    else if (this.keys.has('ArrowDown') || this.keys.has('s')) dir = 'down';
    else if (this.keys.has('ArrowLeft') || this.keys.has('a')) dir = 'left';
    else if (this.keys.has('ArrowRight') || this.keys.has('d')) dir = 'right';

    if (dir) {
      this.tryMove(dir);
    }
  }

  tryMove(dir) {
    this.state.dir = dir;
    const map = MAPS[this.state.mapId];
    const deltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = deltas[dir];
    const nx = this.state.x + dx;
    const ny = this.state.y + dy;

    if (ny < 0 || ny >= map.grid.length || nx < 0 || nx >= map.grid[0].length) return;

    // Block Route 1 if player has no monsters yet
    if (this.state.mapId === 'verdant_town' && ny === 0 && !this.isBlocked(map, nx, ny) && this.state.party.length === 0) {
      audio.sfx('bump');
      this.showDialog(['Počkej! V trávě jsou divoké příšerky! Nejdřív si vyzvedni svou příšerku v Laboratoři!']);
      return;
    }

    const tile = map.grid[ny][nx];

    // Ledge jump (only when moving down)
    if (tile === 'L' && dir === 'down') {
      const jy = ny + 1;
      if (jy < map.grid.length && !this.isBlocked(map, nx, jy)) {
        this.moving = true;
        this.moveProgress = 0;
        this.moveFrom = { x: this.state.x, y: this.state.y };
        this.moveTo = { x: nx, y: jy };
        this.jumpOffset = 1;
        return;
      }
    }

    if (this.isBlocked(map, nx, ny)) {
      return;
    }

    this.moving = true;
    this.moveProgress = 0;
    this.moveFrom = { x: this.state.x, y: this.state.y };
    this.moveTo = { x: nx, y: ny };
  }

  isBlocked(map, x, y) {
    const tile = map.grid[y][x];
    if (SOLID_TILES.has(tile)) return true;
    if (map.npcs.some((n) => n.x === x && n.y === y)) return true;
    if (map.items.some((it) => it.x === x && it.y === y && !this.state.collectedItems[it.id])) return true;
    return false;
  }

  onStepComplete() {
    const map = MAPS[this.state.mapId];
    const { x, y } = this.state;

    if (this.state.repelSteps > 0) this.state.repelSteps--;

    // Check warps
    const warp = map.warps.find((w) => w.x === x && w.y === y);
    if (warp) {
      audio.sfx('blip');
      this.state.mapId = warp.to;
      this.state.x = warp.tx;
      this.state.y = warp.ty;
      this.playMapBgm();
      this.bannerText = MAPS[warp.to].name;
      this.bannerTimer = 110;
      return;
    }

    // Check Trainer line-of-sight
    const losDeltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const npc of map.npcs) {
      if (!npc.trainer || this.state.defeatedTrainers[npc.id] || !npc.trainer.sight) continue;
      const sight = npc.trainer.sight;
      const [ldx, ldy] = losDeltas[npc.dir];
      let spotted = false;
      for (let step = 1; step <= sight; step++) {
        const sx = npc.x + ldx * step;
        const sy = npc.y + ldy * step;
        if (sy < 0 || sy >= map.grid.length || sx < 0 || sx >= map.grid[0].length) break;
        if (sx === x && sy === y) {
          spotted = true;
          break;
        }
        if (this.isBlocked(map, sx, sy)) break;
      }
      if (spotted) {
        audio.sfx('exclamation');
        this.alertBubble = { x: npc.x, y: npc.y, timer: 32, npc };
        return;
      }
    }

    // Check Wild Encounters on Tall Grass ('G') or Cave ('K')
    const tile = map.grid[y][x];
    if ((tile === 'G' || tile === 'K') && map.encounters.length > 0 && this.state.party.length > 0) {
      if (this.state.repelSteps > 0) return;
      if (Math.random() < 0.16) {
        const night = this.isNight();
        let totalW = 0;
        const pool = map.encounters.map((e) => {
          const w = e.weight + (night && e.nightBonus ? e.nightBonus : 0);
          totalW += w;
          return { ...e, w };
        });
        let r = Math.random() * totalW;
        let chosen = pool[0];
        for (const p of pool) {
          r -= p.w;
          if (r <= 0) { chosen = p; break; }
        }
        const level = chosen.min + Math.floor(Math.random() * (chosen.max - chosen.min + 1));
        this.battle.startWild(chosen.id, level);
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const W = 480;
    const H = 360;
    ctx.clearRect(0, 0, W, H);

    if (this.mode === 'title') {
      this.drawTitle(ctx, W, H);
      return;
    }

    if (this.battle.active) {
      this.battle.draw(ctx);
      return;
    }

    const map = MAPS[this.state.mapId];
    // Interpolated player pixel position
    let px = this.state.x * TILE_SIZE;
    let py = this.state.y * TILE_SIZE;
    let walkFrame = 0;
    if (this.moving) {
      px = (this.moveFrom.x + (this.moveTo.x - this.moveFrom.x) * this.moveProgress) * TILE_SIZE;
      py = (this.moveFrom.y + (this.moveTo.y - this.moveFrom.y) * this.moveProgress) * TILE_SIZE;
      if (this.jumpOffset) {
        py -= Math.sin(this.moveProgress * Math.PI) * 14;
      }
      walkFrame = Math.floor(this.moveProgress * 4);
    }

    const camX = Math.floor(px - W / 2 + TILE_SIZE / 2);
    const camY = Math.floor(py - H / 2 + TILE_SIZE / 2);

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    // Draw map tiles
    for (let r = 0; r < map.grid.length; r++) {
      for (let c = 0; c < map.grid[r].length; c++) {
        const sx = c * TILE_SIZE - camX;
        const sy = r * TILE_SIZE - camY;
        if (sx < -TILE_SIZE || sy < -TILE_SIZE || sx > W || sy > H) continue;
        drawTile(ctx, map.grid[r][c], sx, sy, this.animTick);
      }
    }

    // Draw ground items
    for (const it of map.items) {
      if (this.state.collectedItems[it.id]) continue;
      drawItemOrb(ctx, it.x * TILE_SIZE - camX, it.y * TILE_SIZE - camY);
    }

    // Draw NPCs
    for (const npc of map.npcs) {
      const nx = npc.x * TILE_SIZE - camX;
      const ny = npc.y * TILE_SIZE - camY;
      if (npc.isOrb) {
        if (!this.state.starterPicked) drawItemOrb(ctx, nx, ny, npc.color);
      } else {
        drawCharacter(ctx, nx, ny, npc.dir, npc.color, false, 0);
      }
    }

    // Draw Player
    drawCharacter(ctx, px - camX, py - camY, this.state.dir, '#3182ce', true, walkFrame);

    // Alert exclamation bubble
    if (this.alertBubble) {
      const ax = this.alertBubble.x * TILE_SIZE - camX + 8;
      const ay = this.alertBubble.y * TILE_SIZE - camY - 22;
      ctx.fillStyle = '#fff';
      ctx.fillRect(ax, ay, 16, 18);
      ctx.strokeStyle = '#1a202c';
      ctx.lineWidth = 2;
      ctx.strokeRect(ax, ay, 16, 18);
      ctx.fillStyle = '#e53e3e';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('!', ax + 4, ay + 14);
    }

    // Day/Night outdoor tint
    if (map.outdoor && this.isNight()) {
      ctx.fillStyle = 'rgba(15, 25, 65, 0.34)';
      ctx.fillRect(0, 0, W, H);
    }

    // Map Banner
    if (this.bannerTimer > 0) {
      ctx.fillStyle = 'rgba(26, 32, 44, 0.88)';
      ctx.fillRect(12, 12, 230, 30);
      ctx.strokeStyle = '#68d391';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, 230, 30);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(this.bannerText, 22, 31);
    }

    // Repel indicator
    if (this.state.repelSteps > 0) {
      ctx.fillStyle = 'rgba(26,32,44,0.8)';
      ctx.fillRect(W - 126, 10, 116, 22);
      ctx.fillStyle = '#f6e05e';
      ctx.font = '11px monospace';
      ctx.fillText(`Odpuzovač: ${this.state.repelSteps}`, W - 118, 25);
    }

    // Dialog Box
    if (this.dialogQueue.length > 0) {
      ctx.fillStyle = '#f7fafc';
      ctx.fillRect(14, H - 96, W - 28, 82);
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 4;
      ctx.strokeRect(14, H - 96, W - 28, 82);

      ctx.fillStyle = '#1a202c';
      ctx.font = 'bold 13px monospace';
      this.battle.drawWrappedText(ctx, this.dialogQueue[0], 28, H - 70, W - 56, 20);

      if (Math.floor(this.animTick / 15) % 2 === 0) {
        ctx.fillStyle = '#e53e3e';
        ctx.fillText('▼', W - 36, H - 24);
      }
    }

    // UI Overlay
    this.ui.draw(ctx);
  }

  drawTitle(ctx, W, H) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a365d');
    grad.addColorStop(1, '#22543d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#68d391';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('MONSTER QUEST', 92, 105);

    ctx.fillStyle = '#f6e05e';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('VERDANT VERSION', 158, 136);

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(130, 184, 220, 96);
    ctx.strokeStyle = '#68d391';
    ctx.lineWidth = 2;
    ctx.strokeRect(130, 184, 220, 96);

    ctx.font = 'bold 15px monospace';
    if (this.hasSave) {
      ctx.fillStyle = this.titleCursor === 0 ? '#f6e05e' : '#ffffff';
      ctx.fillText(`${this.titleCursor === 0 ? '▶ ' : '  '}Pokračovat`, 166, 218);
      ctx.fillStyle = this.titleCursor === 1 ? '#f6e05e' : '#ffffff';
      ctx.fillText(`${this.titleCursor === 1 ? '▶ ' : '  '}Nová hra`, 166, 252);
    } else {
      ctx.fillStyle = '#f6e05e';
      ctx.fillText('▶ Nová hra', 176, 236);
    }

    ctx.fillStyle = '#cbd5e0';
    ctx.font = '12px monospace';
    ctx.fillText('Stiskni Z / Enter / Mezerník', 136, 326);
  }
}
