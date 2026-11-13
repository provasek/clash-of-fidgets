import { EL, ELEMENTS } from './elements.js';

export class SandboxSim {
  constructor(width = 240, height = 150) {
    this.width = width;
    this.height = height;
    const size = width * height;

    this.grid = new Uint8Array(size);
    this.colorVar = new Uint8Array(size);
    this.life = new Uint8Array(size);
    this.updated = new Uint8Array(size);

    this.imageData = new ImageData(width, height);
    this.pixels = new Uint32Array(this.imageData.data.buffer);
    this.tick = 0;
    this.particleCount = 0;
  }

  idx(x, y) {
    return y * this.width + x;
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return EL.STONE;
    return this.grid[this.idx(x, y)];
  }

  set(x, y, el, life = 0) {
    if (!this.inBounds(x, y)) return;
    const i = this.idx(x, y);
    this.grid[i] = el;
    const palette = ELEMENTS[el].colors;
    this.colorVar[i] = Math.floor(Math.random() * palette.length);
    this.life[i] = life || this.defaultLife(el);
    this.updated[i] = 1;
  }

  defaultLife(el) {
    switch (el) {
      case EL.FIRE:
        return 20 + Math.floor(Math.random() * 35);
      case EL.SMOKE:
        return 50 + Math.floor(Math.random() * 60);
      case EL.STEAM:
        return 70 + Math.floor(Math.random() * 70);
      case EL.SPARK:
        return 6 + Math.floor(Math.random() * 6);
      default:
        return 0;
    }
  }

  clear() {
    this.grid.fill(EL.EMPTY);
    this.life.fill(0);
    this.colorVar.fill(0);
    this.updated.fill(0);
  }

  swap(x1, y1, x2, y2) {
    const i1 = this.idx(x1, y1);
    const i2 = this.idx(x2, y2);

    const tmpEl = this.grid[i1];
    this.grid[i1] = this.grid[i2];
    this.grid[i2] = tmpEl;

    const tmpCol = this.colorVar[i1];
    this.colorVar[i1] = this.colorVar[i2];
    this.colorVar[i2] = tmpCol;

    const tmpLife = this.life[i1];
    this.life[i1] = this.life[i2];
    this.life[i2] = tmpLife;

    this.updated[i1] = 1;
    this.updated[i2] = 1;
  }

  paint(cx, cy, radius, el, shape = 'circle') {
    const r = Math.max(0, radius - 1);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (shape === 'circle' && dx * dx + dy * dy > r * r + 0.5) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (!this.inBounds(x, y)) continue;
        // For powders/liquids/gases, add slight organic scatter when radius > 1
        if (el !== EL.EMPTY && !ELEMENTS[el].solid && r > 1 && Math.random() < 0.25) {
          continue;
        }
        if (el === EL.EMPTY || this.get(x, y) === EL.EMPTY) {
          this.set(x, y, el);
        }
      }
    }
  }

  paintLine(x0, y0, x1, y1, radius, el, shape = 'circle') {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.paint(x0, y0, radius, el, shape);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  explode(cx, cy, radius = 7) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distSq = dx * dx + dy * dy;
        if (distSq > radius * radius) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (!this.inBounds(x, y)) continue;
        const target = this.get(x, y);
        if (target === EL.STONE || target === EL.METAL || target === EL.GLASS) {
          if (distSq > (radius * 0.5) ** 2) continue;
        }
        if (target === EL.GUNPOWDER && distSq > 2) {
          // Chain reaction
          this.set(x, y, EL.FIRE);
          continue;
        }
        if (Math.random() < 0.65) {
          this.set(x, y, Math.random() < 0.7 ? EL.FIRE : EL.SMOKE);
        } else if (Math.random() < 0.35) {
          this.set(x, y, EL.SPARK);
        } else {
          this.set(x, y, EL.EMPTY);
        }
      }
    }
  }

  canDisplace(moverEl, targetEl) {
    if (targetEl === EL.EMPTY) return true;
    const m = ELEMENTS[moverEl];
    const t = ELEMENTS[targetEl];
    if (t.solid) return false;
    return m.density > t.density && (t.liquid || t.gas);
  }

  step() {
    this.tick++;
    this.updated.fill(0);

    const w = this.width;
    const h = this.height;
    const leftToRight = (this.tick & 1) === 0;

    // Bottom-to-top pass for gravity-driven elements
    for (let y = h - 1; y >= 0; y--) {
      for (let stepX = 0; stepX < w; stepX++) {
        const x = leftToRight ? stepX : w - 1 - stepX;
        const i = this.idx(x, y);
        if (this.updated[i]) continue;

        const el = this.grid[i];
        if (el === EL.EMPTY || el === EL.STONE || el === EL.GLASS) continue;

        this.updateCell(x, y, i, el);
      }
    }
  }

  updateCell(x, y, i, el) {
    switch (el) {
      case EL.SAND:
        this.updatePowder(x, y, el);
        break;
      case EL.GUNPOWDER:
        if (this.checkIgnition(x, y)) {
          this.explode(x, y, 7);
          return;
        }
        this.updatePowder(x, y, el);
        break;
      case EL.SEED:
        this.updateSeed(x, y);
        break;
      case EL.PLANT:
        this.updatePlant(x, y);
        break;
      case EL.WOOD:
        if (this.hasNeighbor(x, y, [EL.FIRE, EL.LAVA]) && Math.random() < 0.04) {
          this.set(x, y, EL.FIRE);
        }
        break;
      case EL.METAL:
        // Metal is static; sparks propagate into it from updateSpark
        break;
      case EL.ICE:
        this.updateIce(x, y);
        break;
      case EL.WATER:
        this.updateWater(x, y);
        break;
      case EL.OIL:
        if (this.checkIgnition(x, y) && Math.random() < 0.35) {
          this.set(x, y, EL.FIRE);
          return;
        }
        this.updateLiquid(x, y, el, 3);
        break;
      case EL.LAVA:
        this.updateLava(x, y);
        break;
      case EL.ACID:
        this.updateAcid(x, y);
        break;
      case EL.FIRE:
        this.updateFire(x, y, i);
        break;
      case EL.SMOKE:
        this.updateGas(x, y, i, el, false);
        break;
      case EL.STEAM:
        this.updateGas(x, y, i, el, true);
        break;
      case EL.SPARK:
        this.updateSpark(x, y, i);
        break;
    }
  }

  updatePowder(x, y, el) {
    const below = this.get(x, y + 1);
    if (this.canDisplace(el, below)) {
      this.swap(x, y, x, y + 1);
      return;
    }
    const dir = Math.random() < 0.5 ? -1 : 1;
    const d1 = this.get(x + dir, y + 1);
    if (this.canDisplace(el, d1)) {
      this.swap(x, y, x + dir, y + 1);
      return;
    }
    const d2 = this.get(x - dir, y + 1);
    if (this.canDisplace(el, d2)) {
      this.swap(x, y, x - dir, y + 1);
    }
  }

  updateLiquid(x, y, el, spread = 3) {
    const below = this.get(x, y + 1);
    if (this.canDisplace(el, below)) {
      this.swap(x, y, x, y + 1);
      return;
    }
    const dir = Math.random() < 0.5 ? -1 : 1;
    if (this.canDisplace(el, this.get(x + dir, y + 1))) {
      this.swap(x, y, x + dir, y + 1);
      return;
    }
    if (this.canDisplace(el, this.get(x - dir, y + 1))) {
      this.swap(x, y, x - dir, y + 1);
      return;
    }

    // Horizontal flow
    for (let d = 1; d <= spread; d++) {
      const nx = x + dir * d;
      if (!this.inBounds(nx, y)) break;
      const target = this.get(nx, y);
      if (this.canDisplace(el, target)) {
        this.swap(x, y, nx, y);
        return;
      }
      if (target !== EL.EMPTY) break;
    }
    for (let d = 1; d <= spread; d++) {
      const nx = x - dir * d;
      if (!this.inBounds(nx, y)) break;
      const target = this.get(nx, y);
      if (this.canDisplace(el, target)) {
        this.swap(x, y, nx, y);
        return;
      }
      if (target !== EL.EMPTY) break;
    }
  }

  updateWater(x, y) {
    // Extinguish nearby fire
    const dirs = [
      [0, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
    ];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!this.inBounds(nx, ny)) continue;
      const nb = this.get(nx, ny);
      if (nb === EL.FIRE) {
        this.set(nx, ny, EL.STEAM);
      } else if (nb === EL.LAVA) {
        this.set(nx, ny, EL.STONE);
        this.set(x, y, EL.STEAM);
        return;
      }
    }
    this.updateLiquid(x, y, EL.WATER, 4);
  }

  updateLava(x, y) {
    const dirs = [
      [0, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
    ];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!this.inBounds(nx, ny)) continue;
      const nb = this.get(nx, ny);
      if (nb === EL.WATER) {
        this.set(nx, ny, EL.STEAM);
        this.set(x, y, EL.STONE);
        return;
      }
      if (nb === EL.ICE) {
        this.set(nx, ny, EL.WATER);
      } else if (nb === EL.SAND && Math.random() < 0.08) {
        this.set(nx, ny, EL.GLASS);
      } else if (nb === EL.GUNPOWDER) {
        this.explode(nx, ny, 7);
      } else if (ELEMENTS[nb]?.flammable && Math.random() < 0.15) {
        this.set(nx, ny, EL.FIRE);
      }
    }
    // Emit occasional fire spark above
    if (this.get(x, y - 1) === EL.EMPTY && Math.random() < 0.015) {
      this.set(x, y - 1, EL.FIRE);
    }
    if (Math.random() < 0.45) {
      this.updateLiquid(x, y, EL.LAVA, 2);
    }
  }

  updateAcid(x, y) {
    const dirs = [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!this.inBounds(nx, ny)) continue;
      const nb = this.get(nx, ny);
      if (
        nb !== EL.EMPTY &&
        nb !== EL.ACID &&
        nb !== EL.SMOKE &&
        nb !== EL.STEAM &&
        !ELEMENTS[nb]?.acidProof
      ) {
        if (Math.random() < 0.18) {
          this.set(nx, ny, Math.random() < 0.35 ? EL.SMOKE : EL.EMPTY);
          if (Math.random() < 0.55) {
            this.set(x, y, EL.EMPTY);
          }
          return;
        }
      }
    }
    this.updateLiquid(x, y, EL.ACID, 3);
  }

  updateSeed(x, y) {
    if (this.checkIgnition(x, y)) {
      this.set(x, y, EL.FIRE);
      return;
    }
    if (this.hasNeighbor(x, y, [EL.WATER])) {
      this.set(x, y, EL.PLANT);
      return;
    }
    this.updatePowder(x, y, EL.SEED);
  }

  updatePlant(x, y) {
    if (this.checkIgnition(x, y) && Math.random() < 0.25) {
      this.set(x, y, EL.FIRE);
      return;
    }
    // Absorb nearby water to grow upward/outward
    if (Math.random() < 0.08) {
      const dirs = [
        [0, 1],
        [-1, 0],
        [1, 0],
        [0, -1],
        [-1, 1],
        [1, 1],
      ];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (this.inBounds(nx, ny) && this.get(nx, ny) === EL.WATER) {
          const gx = x + (Math.floor(Math.random() * 3) - 1);
          const gy = y - 1;
          if (this.inBounds(gx, gy) && this.get(gx, gy) === EL.EMPTY) {
            this.set(nx, ny, EL.EMPTY);
            this.set(gx, gy, EL.PLANT);
            return;
          }
        }
      }
    }
  }

  updateIce(x, y) {
    if (this.hasNeighbor(x, y, [EL.FIRE, EL.LAVA, EL.STEAM]) && Math.random() < 0.08) {
      this.set(x, y, EL.WATER);
      return;
    }
    // Slowly freeze adjacent water
    if (Math.random() < 0.004) {
      const dirs = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (this.inBounds(nx, ny) && this.get(nx, ny) === EL.WATER) {
          this.set(nx, ny, EL.ICE);
          break;
        }
      }
    }
  }

  updateFire(x, y, i) {
    if (this.life[i] <= 1) {
      this.set(x, y, Math.random() < 0.4 ? EL.SMOKE : EL.EMPTY);
      return;
    }
    this.life[i]--;

    // Ignite neighbors
    const dirs = [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
    ];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!this.inBounds(nx, ny)) continue;
      const nb = this.get(nx, ny);
      if (nb === EL.GUNPOWDER) {
        this.explode(nx, ny, 7);
        return;
      }
      if (ELEMENTS[nb]?.flammable && Math.random() < 0.12) {
        this.set(nx, ny, EL.FIRE);
      }
    }

    // Flicker upward
    const dx = Math.floor(Math.random() * 3) - 1;
    const ny = y - 1;
    if (this.inBounds(x + dx, ny) && this.get(x + dx, ny) === EL.EMPTY && Math.random() < 0.65) {
      this.swap(x, y, x + dx, ny);
    }
  }

  updateGas(x, y, i, el, canCondense) {
    if (this.life[i] <= 1) {
      if (canCondense && Math.random() < 0.3) {
        this.set(x, y, EL.WATER);
      } else {
        this.set(x, y, EL.EMPTY);
      }
      return;
    }
    this.life[i]--;

    const dx = Math.floor(Math.random() * 3) - 1;
    const dy = Math.random() < 0.75 ? -1 : 0;
    const nx = x + dx;
    const ny = y + dy;
    if (this.inBounds(nx, ny)) {
      const target = this.get(nx, ny);
      if (target === EL.EMPTY || (ELEMENTS[target]?.liquid && Math.random() < 0.3)) {
        this.swap(x, y, nx, ny);
      }
    }
  }

  updateSpark(x, y, i) {
    if (this.life[i] <= 1) {
      this.set(x, y, EL.EMPTY);
      return;
    }
    this.life[i]--;

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!this.inBounds(nx, ny)) continue;
      const nb = this.get(nx, ny);
      if (nb === EL.GUNPOWDER) {
        this.explode(nx, ny, 7);
        return;
      }
      if (ELEMENTS[nb]?.flammable && Math.random() < 0.3) {
        this.set(nx, ny, EL.FIRE);
      } else if (nb === EL.SAND && Math.random() < 0.08) {
        this.set(nx, ny, EL.GLASS);
      } else if (ELEMENTS[nb]?.conductive && Math.random() < 0.45) {
        // Propagate spark onto an empty neighbor adjacent to the conductor
        for (const [sx, sy] of dirs) {
          const ex = nx + sx;
          const ey = ny + sy;
          if (this.inBounds(ex, ey) && this.get(ex, ey) === EL.EMPTY && Math.random() < 0.25) {
            this.set(ex, ey, EL.SPARK, Math.max(2, this.life[i] - 1));
            break;
          }
        }
      }
    }

    // Random jitter movement
    const [rx, ry] = dirs[Math.floor(Math.random() * dirs.length)];
    if (this.inBounds(x + rx, y + ry) && this.get(x + rx, y + ry) === EL.EMPTY) {
      this.swap(x, y, x + rx, y + ry);
    }
  }

  hasNeighbor(x, y, targets) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (this.inBounds(nx, ny) && targets.includes(this.get(nx, ny))) {
          return true;
        }
      }
    }
    return false;
  }

  checkIgnition(x, y) {
    return this.hasNeighbor(x, y, [EL.FIRE, EL.LAVA, EL.SPARK]);
  }

  render(ctx) {
    let count = 0;
    const len = this.grid.length;
    for (let i = 0; i < len; i++) {
      const el = this.grid[i];
      if (el !== EL.EMPTY) count++;
      const palette = ELEMENTS[el].colors;
      // Flicker fire/lava/spark slightly every frame
      let cIdx = this.colorVar[i];
      if (el === EL.FIRE || el === EL.LAVA || el === EL.SPARK) {
        cIdx = (cIdx + this.tick) % palette.length;
      }
      const [r, g, b] = palette[cIdx % palette.length];
      // Little-endian ABGR for Uint32Array
      this.pixels[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
    this.particleCount = count;
    ctx.putImageData(this.imageData, 0, 0);
  }

  loadPreset(name) {
    this.clear();
    const w = this.width;
    const h = this.height;

    if (name === 'terrarium') {
      // Glass bowl with sand, water, seeds, wood
      for (let x = 25; x < w - 25; x++) {
        this.set(x, h - 10, EL.GLASS);
        this.set(x, h - 9, EL.GLASS);
      }
      for (let y = 40; y < h - 9; y++) {
        this.set(25, y, EL.GLASS);
        this.set(w - 26, y, EL.GLASS);
      }
      for (let x = 26; x < w - 26; x++) {
        for (let y = h - 25; y < h - 10; y++) {
          this.set(x, y, EL.SAND);
        }
      }
      // Water pool
      for (let x = 55; x < w - 55; x++) {
        for (let y = h - 38; y < h - 25; y++) {
          this.set(x, y, EL.WATER);
        }
      }
      // Seeds
      for (let x = 65; x < w - 65; x += 14) {
        this.set(x, h - 45, EL.SEED);
      }
    } else if (name === 'volcano') {
      // Stone volcano cone with lava chamber and water lake
      const mid = Math.floor(w / 2);
      for (let y = 45; y < h; y++) {
        const halfWidth = Math.floor((y - 40) * 0.85) + 6;
        for (let x = mid - halfWidth; x <= mid + halfWidth; x++) {
          if (Math.abs(x - mid) > 6) {
            this.set(x, y, EL.STONE);
          } else if (y > 55) {
            this.set(x, y, EL.LAVA);
          }
        }
      }
      // Water pools on sides
      for (let x = 10; x < 50; x++) {
        for (let y = h - 20; y < h - 2; y++) {
          if (this.get(x, y) === EL.EMPTY) this.set(x, y, EL.WATER);
        }
      }
    } else if (name === 'tesla') {
      // Metal bridge + gunpowder barrels + sparks
      for (let x = 30; x < w - 30; x++) {
        this.set(x, 60, EL.METAL);
        this.set(x, 61, EL.METAL);
      }
      for (let bx = 50; bx <= w - 50; bx += 45) {
        for (let x = bx - 8; x <= bx + 8; x++) {
          for (let y = 62; y <= 76; y++) {
            this.set(x, y, EL.GUNPOWDER);
          }
        }
      }
      // Wooden floor below
      for (let x = 20; x < w - 20; x++) {
        this.set(x, h - 18, EL.WOOD);
        this.set(x, h - 17, EL.WOOD);
      }
      this.set(32, 59, EL.SPARK, 12);
    } else if (name === 'acid') {
      // Glass beaker vs stone/metal shelves with acid rain
      for (let x = 60; x < w - 60; x++) {
        this.set(x, h - 15, EL.GLASS);
      }
      for (let y = 70; y < h - 14; y++) {
        this.set(60, y, EL.GLASS);
        this.set(w - 61, y, EL.GLASS);
      }
      for (let x = 75; x < w - 75; x++) {
        this.set(x, 55, EL.STONE);
        this.set(x, 56, EL.STONE);
        this.set(x, 85, EL.METAL);
      }
      for (let x = 80; x < w - 80; x += 3) {
        for (let y = 20; y < 38; y += 2) {
          this.set(x, y, EL.ACID);
        }
      }
    }
  }
}
