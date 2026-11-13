import { MONSTERS } from './data/monsters.js';

export const TILE_SIZE = 32;

export function drawTile(ctx, ch, px, py, animTick) {
  const s = TILE_SIZE;
  switch (ch) {
    case '.': // Grass
      ctx.fillStyle = '#5fb85b';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#52a64e';
      ctx.fillRect(px + 6, py + 8, 4, 2);
      ctx.fillRect(px + 20, py + 22, 4, 2);
      break;
    case ',': // Path
      ctx.fillStyle = '#d9c28f';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#cbb079';
      ctx.fillRect(px + 4, py + 6, 4, 4);
      ctx.fillRect(px + 18, py + 20, 4, 4);
      break;
    case 'F': { // Flowers
      ctx.fillStyle = '#5fb85b';
      ctx.fillRect(px, py, s, s);
      const sway = Math.floor(animTick / 24) % 2;
      ctx.fillStyle = '#f6e05e';
      ctx.fillRect(px + 6 + sway, py + 6, 6, 6);
      ctx.fillStyle = '#f56565';
      ctx.fillRect(px + 18 - sway, py + 18, 6, 6);
      ctx.fillStyle = '#fff';
      ctx.fillRect(px + 8 + sway, py + 8, 2, 2);
      ctx.fillRect(px + 20 - sway, py + 20, 2, 2);
      break;
    }
    case 'G': { // Tall grass
      ctx.fillStyle = '#489b45';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#2f6e2d';
      for (let i = 0; i < 4; i++) {
        const bx = px + 3 + i * 7;
        ctx.fillRect(bx, py + 10, 4, 18);
        ctx.fillStyle = '#68d391';
        ctx.fillRect(bx + 1, py + 8, 2, 10);
        ctx.fillStyle = '#2f6e2d';
      }
      break;
    }
    case 'T': // Tree
      ctx.fillStyle = '#5fb85b';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#744210';
      ctx.fillRect(px + 11, py + 20, 10, 12);
      ctx.fillStyle = '#22543d';
      ctx.fillRect(px + 2, py + 2, 28, 22);
      ctx.fillStyle = '#2f855a';
      ctx.fillRect(px + 5, py + 4, 22, 16);
      ctx.fillStyle = '#48bb78';
      ctx.fillRect(px + 8, py + 6, 12, 8);
      break;
    case 'W': { // Water
      ctx.fillStyle = '#3182ce';
      ctx.fillRect(px, py, s, s);
      const wave = (Math.floor(animTick / 20) % 2) * 4;
      ctx.fillStyle = '#63b3ed';
      ctx.fillRect(px + 4 + wave, py + 8, 10, 3);
      ctx.fillRect(px + 16 - wave, py + 22, 10, 3);
      break;
    }
    case 'L': // Ledge (jump down)
      ctx.fillStyle = '#5fb85b';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#744210';
      ctx.fillRect(px, py + 20, s, 8);
      ctx.fillStyle = '#975a16';
      ctx.fillRect(px, py + 18, s, 4);
      break;
    case 'R': // Roof
      ctx.fillStyle = '#c53030';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#9b2c2c';
      ctx.fillRect(px, py + 26, s, 6);
      ctx.fillStyle = '#fc8181';
      ctx.fillRect(px, py, s, 4);
      break;
    case 'B': // Building wall
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#cbd5e0';
      ctx.fillRect(px, py + 28, s, 4);
      ctx.fillStyle = '#63b3ed';
      ctx.fillRect(px + 8, py + 8, 16, 12);
      ctx.fillStyle = '#2b6cb0';
      ctx.fillRect(px + 8, py + 8, 16, 3);
      break;
    case 'D': // Door / Warp
      ctx.fillStyle = '#cbd5e0';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(px + 4, py + 2, 24, 30);
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(px + 7, py + 5, 18, 27);
      ctx.fillStyle = '#ecc94b';
      ctx.fillRect(px + 20, py + 16, 3, 4);
      break;
    case 'S': // Signpost
      ctx.fillStyle = '#5fb85b';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#744210';
      ctx.fillRect(px + 13, py + 18, 6, 12);
      ctx.fillStyle = '#b7791f';
      ctx.fillRect(px + 4, py + 6, 24, 14);
      ctx.fillStyle = '#fefcbf';
      ctx.fillRect(px + 7, py + 10, 18, 2);
      ctx.fillRect(px + 7, py + 14, 14, 2);
      break;
    case 'C': // Indoor floor
      ctx.fillStyle = '#f7fafc';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#edf2f7';
      ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
      break;
    case 'I': // Indoor wall
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(px, py + 24, s, 8);
      break;
    case 'H': // Heal counter
      ctx.fillStyle = '#f7fafc';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#f56565';
      ctx.fillRect(px, py + 8, s, 20);
      ctx.fillStyle = '#fff';
      ctx.fillRect(px + 12, py + 12, 8, 8);
      break;
    case 'P': // PC terminal
      ctx.fillStyle = '#f7fafc';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(px + 4, py + 4, 24, 24);
      ctx.fillStyle = '#63b3ed';
      ctx.fillRect(px + 7, py + 7, 18, 12);
      break;
    case 'M': // Mart counter
      ctx.fillStyle = '#f7fafc';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#3182ce';
      ctx.fillRect(px, py + 8, s, 20);
      ctx.fillStyle = '#90cdf4';
      ctx.fillRect(px, py + 8, s, 4);
      break;
    case 'K': // Cave floor
      ctx.fillStyle = '#8b7355';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#755f44';
      ctx.fillRect(px + 6, py + 10, 4, 4);
      ctx.fillRect(px + 20, py + 22, 5, 3);
      break;
    case 'O': // Cave wall / rock
      ctx.fillStyle = '#5c4b37';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#3e3224';
      ctx.fillRect(px + 3, py + 4, 26, 24);
      ctx.fillStyle = '#755f44';
      ctx.fillRect(px + 6, py + 6, 16, 10);
      break;
    default:
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(px, py, s, s);
  }
}

export function drawCharacter(ctx, px, py, dir, color, isPlayer = false, walkFrame = 0) {
  const bob = walkFrame % 2 === 1 ? -2 : 0;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(px + 6, py + 26, 20, 4);

  // Legs
  ctx.fillStyle = '#2d3748';
  const step = walkFrame === 1 ? 2 : walkFrame === 3 ? -2 : 0;
  ctx.fillRect(px + 8, py + 21 + (step > 0 ? -1 : 0), 6, 7);
  ctx.fillRect(px + 18, py + 21 + (step < 0 ? -1 : 0), 6, 7);

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(px + 7, py + 13 + bob, 18, 10);

  // Head
  ctx.fillStyle = '#fbd38d';
  ctx.fillRect(px + 8, py + 4 + bob, 16, 11);

  // Hat / Hair
  ctx.fillStyle = isPlayer ? '#e53e3e' : '#4a5568';
  ctx.fillRect(px + 7, py + 2 + bob, 18, 5);
  if (isPlayer) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 13, py + 3 + bob, 6, 3);
  }

  // Eyes based on direction
  ctx.fillStyle = '#1a202c';
  if (dir === 'down') {
    ctx.fillRect(px + 10, py + 9 + bob, 3, 3);
    ctx.fillRect(px + 19, py + 9 + bob, 3, 3);
  } else if (dir === 'left') {
    ctx.fillRect(px + 9, py + 9 + bob, 3, 3);
  } else if (dir === 'right') {
    ctx.fillRect(px + 20, py + 9 + bob, 3, 3);
  }
}

export function drawItemOrb(ctx, px, py, color = '#e53e3e') {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(px + 8, py + 24, 16, 4);
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(px + 8, py + 10, 16, 16);
  ctx.fillStyle = color;
  ctx.fillRect(px + 10, py + 11, 12, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px + 10, py + 19, 12, 6);
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(px + 10, py + 17, 12, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px + 14, py + 16, 4, 4);
}

export function drawMonsterSprite(ctx, speciesId, x, y, size = 96, shiny = false, flip = false, flash = false) {
  const sp = MONSTERS[speciesId];
  if (!sp) return;
  const pal = shiny ? sp.shinyPal : sp.pal;
  const grid = sp.sprite;
  const rows = grid.length;
  const cols = grid[0].length;
  const pxSize = Math.floor(size / cols);

  ctx.save();
  if (flip) {
    ctx.translate(x + size, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      if (ch === '.') continue;
      if (flash) {
        ctx.fillStyle = '#ffffff';
      } else if (ch === 'k') {
        ctx.fillStyle = '#1a1c2c';
      } else {
        ctx.fillStyle = pal[ch] || '#cbd5e0';
      }
      ctx.fillRect(x + c * pxSize, y + r * pxSize, pxSize, pxSize);
    }
  }
  ctx.restore();
}
