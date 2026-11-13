import { formatNum } from './state.js';

const SECTOR_PALETTES = [
  { nebula1: 'rgba(56, 189, 248, 0.14)', nebula2: 'rgba(99, 102, 241, 0.12)' },
  { nebula1: 'rgba(168, 85, 247, 0.16)', nebula2: 'rgba(236, 72, 153, 0.10)' },
  { nebula1: 'rgba(16, 185, 129, 0.14)', nebula2: 'rgba(56, 189, 248, 0.12)' },
  { nebula1: 'rgba(245, 158, 11, 0.14)', nebula2: 'rgba(239, 68, 68, 0.10)' }
];

export class SpaceRenderer {
  constructor(canvas, state, onAsteroidTap) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.onAsteroidTap = onAsteroidTap;

    this.width = 360;
    this.height = 300;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.time = 0;
    this.stars = [];
    this.asteroids = [];
    this.particles = [];
    this.floatingTexts = [];
    this.lasers = [];
    this.shuttles = [];
    this.anomalies = [];
    this.turretTimer = 0;
    this.warpFlash = 0;
    this.killsSinceBoss = 0;

    this.initStars();
    this.resize();
    this.bindInput();

    // Počáteční asteroidy
    for (let i = 0; i < 5; i++) {
      this.spawnAsteroid(true);
    }
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 75; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.6 + 0.4,
        speed: Math.random() * 0.012 + 0.004,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.max(200, rect.width);
    this.height = Math.max(180, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  bindInput() {
    const handlePointer = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      this.handleTap(x, y);
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handlePointer(e.clientX, e.clientY);
    });
  }

  triggerWarp() {
    this.warpFlash = 1.0;
    this.spawnBurst(this.width / 2, this.height / 2, '#c084fc', 30);
  }

  handleTap(x, y) {
    // 1. Zkontroluj zásah kvantové anomálie / zásobovací kapsle
    for (let i = this.anomalies.length - 1; i >= 0; i--) {
      const an = this.anomalies[i];
      if (Math.hypot(x - an.x, y - an.y) <= an.radius + 18) {
        this.spawnBurst(an.x, an.y, '#c084fc', 22);
        const res = this.onAsteroidTap(false, true);
        this.addFloatingText(an.x, an.y - 12, `ANOMÁLIE! +${formatNum(res.research || 15)} 🔬`, '#c084fc', true);
        this.anomalies.splice(i, 1);
        return;
      }
    }

    // 2. Zkontroluj zásah asteroidu (s velkorysým mobilním poloměrem)
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      const dx = x - a.x;
      const dy = y - a.y;
      if (dx * dx + dy * dy <= (a.radius + 18) * (a.radius + 18)) {
        const isComet = a.isComet;
        this.lasers.push({
          x1: this.width / 2,
          y1: this.height / 2,
          x2: a.x,
          y2: a.y,
          life: 0.18,
          maxLife: 0.18,
          color: isComet ? '#fbbf24' : '#38bdf8'
        });

        this.spawnBurst(a.x, a.y, isComet ? '#fbbf24' : '#94a3b8', isComet ? 18 : 10);
        const dmg = a.isBoss && this.state.hasTech('boss_hunter') ? 2 : 1;
        a.hp -= dmg;
        const reward = this.onAsteroidTap(isComet);

        const label = reward.isCrit
          ? `KRIT! +${formatNum(reward.credits)} 🪙`
          : `+${formatNum(reward.credits)} 🪙`;
        this.addFloatingText(a.x, a.y - 10, label, reward.isCrit ? '#fbbf24' : '#f8fafc', reward.isCrit);

        if (a.hp <= 0) {
          const wasBoss = a.isBoss;
          this.asteroids.splice(i, 1);
          if (wasBoss) {
            this.spawnBurst(a.x, a.y, '#fb7185', 32);
            this.onAsteroidTap(false, false, false, true);
          } else {
            this.killsSinceBoss += 1;
          }
          this.spawnAsteroid(false);
        }
        return;
      }
    }

    // Pokud hráč klikne mimo asteroid, lehký pulz stanice + drobný bonus za klik na jádro
    const cx = this.width / 2;
    const cy = this.height / 2;
    if (Math.hypot(x - cx, y - cy) < 52) {
      this.spawnBurst(cx, cy, '#38bdf8', 6);
    }
  }

  spawnAsteroid(randomPos = false) {
    const hasBoss = this.asteroids.some((a) => a.isBoss);
    const isBoss = !randomPos && !hasBoss && this.killsSinceBoss >= 18;
    if (isBoss) this.killsSinceBoss = 0;

    const isComet = !isBoss && Math.random() < (this.state.hasTech('auto_salvage') ? 0.24 : 0.13);
    const side = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const margin = 30;

    if (randomPos) {
      x = Math.random() * this.width;
      y = Math.random() * this.height;
      // Vyhni se středu stanice
      if (Math.hypot(x - this.width / 2, y - this.height / 2) < 75) {
        x = x < this.width / 2 ? 35 : this.width - 35;
      }
    } else if (side === 0) {
      x = -margin;
      y = Math.random() * this.height;
    } else if (side === 1) {
      x = this.width + margin;
      y = Math.random() * this.height;
    } else if (side === 2) {
      x = Math.random() * this.width;
      y = -margin;
    } else {
      x = Math.random() * this.width;
      y = this.height + margin;
    }

    const angle = Math.atan2(this.height / 2 - y, this.width / 2 - x) + (Math.random() - 0.5) * (isBoss ? 0.4 : 1.2);
    const speed = isBoss ? 8 : isComet ? 46 + Math.random() * 25 : 14 + Math.random() * 18;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;

    const radius = isBoss ? 25 : isComet ? 13 : 14 + Math.random() * 10;
    const maxHp = isBoss ? 24 : isComet ? 1 : 2 + Math.floor(Math.random() * 2);
    const verts = [];
    const count = isBoss ? 10 : 8;
    for (let i = 0; i < count; i++) {
      verts.push(0.75 + Math.random() * 0.4);
    }

    this.asteroids.push({
      x,
      y,
      vx,
      vy,
      radius,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * (isBoss ? 0.4 : 1.4),
      hp: maxHp,
      maxHp,
      isComet,
      isBoss,
      verts
    });
  }

  spawnBurst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 90;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        size: 1.8 + Math.random() * 2.5,
        color
      });
    }
  }

  addFloatingText(x, y, text, color = '#f8fafc', big = false) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      big,
      life: 0.95,
      maxLife: 0.95
    });
  }

  update(dt) {
    this.time += dt;

    // Hvězdy
    for (const s of this.stars) {
      s.x -= s.speed * dt;
      if (s.x < 0) s.x = 1;
    }

    // Udržuj optimální počet asteroidů
    const targetAsteroids = this.state.hasTech('auto_salvage') ? 7 : 5;
    if (this.asteroids.length < targetAsteroids && Math.random() < dt * 1.6) {
      this.spawnAsteroid(false);
    }

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.rotSpeed * dt;

      if (a.isComet && Math.random() < dt * 18) {
        this.particles.push({
          x: a.x,
          y: a.y,
          vx: -a.vx * 0.25 + (Math.random() - 0.5) * 15,
          vy: -a.vy * 0.25 + (Math.random() - 0.5) * 15,
          life: 0.35,
          maxLife: 0.35,
          size: 2.2,
          color: '#fbbf24'
        });
      }

      if (a.x < -60 || a.x > this.width + 60 || a.y < -60 || a.y > this.height + 60) {
        this.asteroids.splice(i, 1);
      }
    }

    // Obchodní lodě pokud je postaven Trade Hub
    const tradeCount = this.state.data.modules.tradehub || 0;
    if (tradeCount > 0 && this.shuttles.length < Math.min(4, tradeCount) && Math.random() < dt * 0.5) {
      const fromLeft = Math.random() < 0.5;
      this.shuttles.push({
        x: fromLeft ? -20 : this.width + 20,
        y: Math.random() * this.height * 0.8 + this.height * 0.1,
        progress: 0,
        fromLeft
      });
    }

    for (let i = this.shuttles.length - 1; i >= 0; i--) {
      const sh = this.shuttles[i];
      sh.progress += dt * 0.28;
      if (sh.progress >= 1) {
        this.shuttles.splice(i, 1);
      }
    }

    // Lasery
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      this.lasers[i].life -= dt;
      if (this.lasers[i].life <= 0) this.lasers.splice(i, 1);
    }

    // Částice
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Plovoucí texty
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 28 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Anomálie / zásobovací kapsle
    if (this.anomalies.length === 0 && Math.random() < dt * 0.045) {
      const margin = 45;
      let ax = margin + Math.random() * Math.max(40, this.width - margin * 2);
      let ay = margin + Math.random() * Math.max(40, this.height - margin * 2);
      if (Math.hypot(ax - this.width / 2, ay - this.height / 2) < 70) {
        ax = ax < this.width / 2 ? 42 : this.width - 42;
      }
      this.anomalies.push({ x: ax, y: ay, radius: 15, life: 12 });
    }
    for (let i = this.anomalies.length - 1; i >= 0; i--) {
      this.anomalies[i].life -= dt;
      if (this.anomalies[i].life <= 0) this.anomalies.splice(i, 1);
    }

    // Autopilot obranné věže (tech)
    if (this.state.hasTech('auto_turret') && this.asteroids.length > 0) {
      this.turretTimer += dt;
      const turretInterval = this.state.hasTech('turret_mk2') ? 1.0 : 2.0;
      if (this.turretTimer >= turretInterval) {
        this.turretTimer = 0;
        const target = this.asteroids[0];
        this.lasers.push({
          x1: this.width / 2,
          y1: this.height / 2,
          x2: target.x,
          y2: target.y,
          life: 0.22,
          maxLife: 0.22,
          color: '#34d399'
        });
        this.spawnBurst(target.x, target.y, '#34d399', 8);
        const reward = this.onAsteroidTap(target.isComet, false, true);
        this.addFloatingText(target.x, target.y - 8, `+${formatNum(reward.credits)} 🪙`, '#34d399', false);
        target.hp -= 1;
        if (target.hp <= 0) {
          this.asteroids.shift();
          this.spawnAsteroid(false);
        }
      }
    }

    if (this.warpFlash > 0) {
      this.warpFlash = Math.max(0, this.warpFlash - dt * 1.4);
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    // 1. Pozadí + mlhovina sektoru
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, w, h);

    const pal = SECTOR_PALETTES[this.state.data.sector % SECTOR_PALETTES.length];
    const grad1 = ctx.createRadialGradient(cx * 0.5, cy * 0.6, 10, cx * 0.5, cy * 0.6, w * 0.7);
    grad1.addColorStop(0, pal.nebula1);
    grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, w, h);

    const grad2 = ctx.createRadialGradient(cx * 1.5, cy * 1.4, 10, cx * 1.5, cy * 1.4, w * 0.65);
    grad2.addColorStop(0, pal.nebula2);
    grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, w, h);

    // 2. Hvězdy
    for (const s of this.stars) {
      const alpha = 0.35 + 0.55 * Math.abs(Math.sin(this.time * 1.5 + s.phase));
      ctx.fillStyle = `rgba(226, 232, 240, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Orbitální kruhy
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, 78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 118, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Nákladní lodě (Trade Hub)
    for (const sh of this.shuttles) {
      const t = sh.progress;
      const sx = sh.fromLeft ? t * cx * 2 : (1 - t) * cx * 2;
      const sy = cy + Math.sin(t * Math.PI) * -45;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.moveTo(sh.fromLeft ? 8 : -8, 0);
      ctx.lineTo(sh.fromLeft ? -6 : 6, -4);
      ctx.lineTo(sh.fromLeft ? -6 : 6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 5. Stanice a její moduly
    if (Date.now() < (this.state.data.overdriveUntil || 0)) {
      const auraGrad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 78);
      auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
      auraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 78, 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawStation(ctx, cx, cy);

    // 5b. Kvantové anomálie
    for (const an of this.anomalies) {
      ctx.save();
      ctx.translate(an.x, an.y);
      ctx.rotate(this.time * 2.2);
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, an.radius, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.fillStyle = 'rgba(192, 132, 252, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, an.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Autonomní drony
    this.drawDrones(ctx, cx, cy);

    // 7. Asteroidy a komety
    for (const a of this.asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);

      if (a.isBoss) {
        ctx.shadowColor = '#fb7185';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#4c0519';
        ctx.strokeStyle = '#fb7185';
      } else if (a.isComet) {
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#fde68a';
        ctx.strokeStyle = '#f59e0b';
      } else {
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#94a3b8';
      }

      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < a.verts.length; i++) {
        const ang = (i / a.verts.length) * Math.PI * 2;
        const r = a.radius * a.verts[i];
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Kráter na asteroidu
      if (!a.isComet) {
        ctx.fillStyle = a.isBoss ? '#881337' : '#334155';
        ctx.beginPath();
        ctx.arc(-a.radius * 0.25, -a.radius * 0.15, a.radius * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // HP bar pro Boss asteroid
      if (a.isBoss) {
        const bw = 42;
        const bx = a.x - bw / 2;
        const by = a.y - a.radius - 12;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(bx, by, bw, 5);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(bx, by, bw * Math.max(0, a.hp / a.maxHp), 5);
      }
    }

    // 8. Těžební lasery
    for (const l of this.lasers) {
      const alpha = l.life / l.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = l.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.restore();
    }

    // 9. Částice
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 10. Plovoucí texty
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.font = ft.big ? '700 14px "JetBrains Mono", monospace' : '700 12px "JetBrains Mono", monospace';
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // 11. Hyperprostorový záblesk
    if (this.warpFlash > 0) {
      ctx.fillStyle = `rgba(192, 132, 252, ${this.warpFlash * 0.45})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawStation(ctx, cx, cy) {
    const mods = this.state.data.modules;

    ctx.save();
    ctx.translate(cx, cy);

    // Megastruktura: Hvězdná brána (5 segmentů kolem stanice)
    const megaStage = this.state.data.megastructureStage || 0;
    if (megaStage > 0) {
      ctx.save();
      ctx.rotate(-this.time * 0.22);
      for (let s = 0; s < megaStage; s++) {
        const startA = (s / 5) * Math.PI * 2 + 0.08;
        const endA = ((s + 1) / 5) * Math.PI * 2 - 0.08;
        ctx.strokeStyle = megaStage === 5 ? '#34d399' : '#fbbf24';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = megaStage === 5 ? '#34d399' : '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 56, startA, endA);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Dysonův kolektor (vnější zlatá korona kolem stanice)
    if ((mods.dyson || 0) > 0) {
      ctx.save();
      ctx.rotate(this.time * 0.18);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Fúzní prstenec (pokud existuje reaktor)
    if ((mods.reactor || 0) > 0) {
      ctx.save();
      ctx.rotate(this.time * 0.5);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Solární křídla (vlevo a vpravo)
    const solarLvl = mods.solar || 0;
    if (solarLvl > 0) {
      const wingLen = Math.min(54, 28 + solarLvl * 2.5);
      for (const dir of [-1, 1]) {
        ctx.fillStyle = '#0369a1';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(dir === -1 ? -24 - wingLen : 24, -12, wingLen, 24, 4);
        ctx.fill();
        ctx.stroke();

        // Mřížka panelu
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
        ctx.beginPath();
        const startX = dir === -1 ? -24 - wingLen : 24;
        ctx.moveTo(startX + wingLen * 0.5, -12);
        ctx.lineTo(startX + wingLen * 0.5, 12);
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX + wingLen, 0);
        ctx.stroke();
      }
    }

    // Rafinerie (horní modul)
    if ((mods.refinery || 0) > 0) {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-14, -44, 28, 18, 4);
      ctx.fill();
      ctx.stroke();

      // Pulzující plazmové jádro pece
      const glow = 0.5 + 0.5 * Math.sin(this.time * 4);
      ctx.fillStyle = `rgba(251, 146, 60, ${0.5 + glow * 0.5})`;
      ctx.beginPath();
      ctx.arc(0, -35, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Výzkumná laboratoř (dolní modul)
    if ((mods.lab || 0) > 0) {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 34, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(0, 34, 4 + Math.sin(this.time * 3) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Centrální šestiúhelníkové jádro stanice
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const px = Math.cos(ang) * 26;
      const py = Math.sin(ang) * 26;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vnitřní reaktor jádra
    const corePulse = 10 + Math.sin(this.time * 2.5) * 2;
    const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, corePulse * 1.4);
    coreGrad.addColorStop(0, '#f8fafc');
    coreGrad.addColorStop(0.4, '#38bdf8');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, corePulse * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Rotující radar (Trade Hub nebo základ)
    ctx.save();
    ctx.rotate(this.time * 1.2);
    ctx.strokeStyle = (mods.tradehub || 0) > 0 ? '#fbbf24' : '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  drawDrones(ctx, cx, cy) {
    const droneCount = Math.min(8, this.state.data.modules.drone || 0);
    if (droneCount <= 0) return;

    for (let i = 0; i < droneCount; i++) {
      const ang = this.time * (0.7 + (i % 3) * 0.15) + (i / droneCount) * Math.PI * 2;
      const orbitR = 66 + (i % 2) * 18;
      const dx = cx + Math.cos(ang) * orbitR;
      const dy = cy + Math.sin(ang) * orbitR;

      // Občasný těžební paprsek k nejbližšímu asteroidu
      if (this.asteroids.length > 0 && Math.sin(this.time * 3 + i * 2) > 0.55) {
        const target = this.asteroids[i % this.asteroids.length];
        if (Math.hypot(target.x - dx, target.y - dy) < 150) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(dx, dy);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(ang + Math.PI / 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}
