import { EL, ELEMENTS, ELEMENT_GROUPS } from './elements.js';
import { SandboxSim } from './simulation.js';

const GRID_W = 240;
const GRID_H = 150;

const canvas = document.getElementById('sandbox');
canvas.width = GRID_W;
canvas.height = GRID_H;
const ctx = canvas.getContext('2d', { alpha: false });

const sim = new SandboxSim(GRID_W, GRID_H);

let selectedEl = EL.SAND;
let brushSize = 4;
let brushShape = 'circle';
let paused = false;

let isDrawing = false;
let eraseMode = false;
let lastCell = null;

// UI refs
const btnPlayPause = document.getElementById('btn-play-pause');
const btnStep = document.getElementById('btn-step');
const btnClear = document.getElementById('btn-clear');
const brushSlider = document.getElementById('brush-size');
const brushSizeVal = document.getElementById('brush-size-val');
const shapeCircleBtn = document.getElementById('shape-circle');
const shapeSquareBtn = document.getElementById('shape-square');
const elementGroupsEl = document.getElementById('element-groups');
const selectedNameEl = document.getElementById('selected-name');
const selectedDescEl = document.getElementById('selected-desc');
const hoverEl = document.getElementById('hover-element');
const particleCountEl = document.getElementById('particle-count');
const fpsCounterEl = document.getElementById('fps-counter');
const cursorPreview = document.getElementById('cursor-preview');

function buildPalette() {
  elementGroupsEl.innerHTML = '';
  for (const group of ELEMENT_GROUPS) {
    const section = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = group.title;
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'element-grid';

    for (const elId of group.items) {
      const info = ELEMENTS[elId];
      const btn = document.createElement('button');
      btn.className = 'el-btn' + (elId === selectedEl ? ' active' : '');
      btn.dataset.el = elId;
      btn.title = info.desc;

      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = info.color;

      const label = document.createElement('span');
      label.textContent = info.name;

      btn.appendChild(swatch);
      btn.appendChild(label);

      btn.addEventListener('click', () => selectElement(elId));
      grid.appendChild(btn);
    }

    section.appendChild(grid);
    elementGroupsEl.appendChild(section);
  }
  updateSelectedInfo();
}

function selectElement(elId) {
  selectedEl = elId;
  document.querySelectorAll('.el-btn').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.el) === elId);
  });
  updateSelectedInfo();
}

function updateSelectedInfo() {
  const info = ELEMENTS[selectedEl];
  selectedNameEl.textContent = info.name;
  selectedDescEl.textContent = `— ${info.desc}`;
}

function togglePause() {
  paused = !paused;
  btnPlayPause.textContent = paused ? '▶ Spustit' : '⏸ Pauza';
}

// Compute actual rendered rectangle of the canvas (respecting object-fit: contain)
function getCanvasRenderRect() {
  const rect = canvas.getBoundingClientRect();
  const canvasAspect = GRID_W / GRID_H;
  const rectAspect = rect.width / rect.height;

  let renderW, renderH, offsetX, offsetY;
  if (rectAspect > canvasAspect) {
    renderH = rect.height;
    renderW = renderH * canvasAspect;
    offsetX = (rect.width - renderW) / 2;
    offsetY = 0;
  } else {
    renderW = rect.width;
    renderH = renderW / canvasAspect;
    offsetX = 0;
    offsetY = (rect.height - renderH) / 2;
  }
  return {
    left: rect.left + offsetX,
    top: rect.top + offsetY,
    width: renderW,
    height: renderH,
    wrapperLeft: offsetX,
    wrapperTop: offsetY,
  };
}

function clientToGrid(clientX, clientY) {
  const r = getCanvasRenderRect();
  const gx = Math.floor(((clientX - r.left) / r.width) * GRID_W);
  const gy = Math.floor(((clientY - r.top) / r.height) * GRID_H);
  return { x: gx, y: gy, rect: r };
}

function updateCursorPreview(clientX, clientY) {
  const r = getCanvasRenderRect();
  const scale = r.width / GRID_W;
  const sizePx = Math.max(4, (brushSize * 2 - 1) * scale);
  const wrapperRect = canvas.parentElement.getBoundingClientRect();

  cursorPreview.style.display = 'block';
  cursorPreview.style.left = `${clientX - wrapperRect.left}px`;
  cursorPreview.style.top = `${clientY - wrapperRect.top}px`;
  cursorPreview.style.width = `${sizePx}px`;
  cursorPreview.style.height = `${sizePx}px`;
  cursorPreview.style.borderRadius = brushShape === 'circle' ? '50%' : '2px';
}

function handlePointerDown(e) {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  isDrawing = true;
  eraseMode = e.button === 2;
  const { x, y } = clientToGrid(e.clientX, e.clientY);
  const el = eraseMode ? EL.EMPTY : selectedEl;
  sim.paint(x, y, brushSize, el, brushShape);
  lastCell = { x, y };
}

function handlePointerMove(e) {
  const { x, y } = clientToGrid(e.clientX, e.clientY);
  updateCursorPreview(e.clientX, e.clientY);

  if (sim.inBounds(x, y)) {
    const hovered = sim.get(x, y);
    hoverEl.textContent = ELEMENTS[hovered]?.name ?? 'Prázdno';
  } else {
    hoverEl.textContent = 'Mimo plátno';
  }

  if (!isDrawing) return;
  const el = eraseMode ? EL.EMPTY : selectedEl;
  if (lastCell) {
    sim.paintLine(lastCell.x, lastCell.y, x, y, brushSize, el, brushShape);
  } else {
    sim.paint(x, y, brushSize, el, brushShape);
  }
  lastCell = { x, y };
}

function handlePointerUp() {
  isDrawing = false;
  eraseMode = false;
  lastCell = null;
}

canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('pointercancel', handlePointerUp);
canvas.addEventListener('pointerleave', () => {
  cursorPreview.style.display = 'none';
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Controls
btnPlayPause.addEventListener('click', togglePause);
btnStep.addEventListener('click', () => {
  if (!paused) togglePause();
  sim.step();
});
btnClear.addEventListener('click', () => sim.clear());

brushSlider.addEventListener('input', (e) => {
  brushSize = Number(e.target.value);
  brushSizeVal.textContent = brushSize;
});

shapeCircleBtn.addEventListener('click', () => {
  brushShape = 'circle';
  shapeCircleBtn.classList.add('active');
  shapeSquareBtn.classList.remove('active');
});

shapeSquareBtn.addEventListener('click', () => {
  brushShape = 'square';
  shapeSquareBtn.classList.add('active');
  shapeCircleBtn.classList.remove('active');
});

document.querySelectorAll('.btn-preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    sim.loadPreset(btn.dataset.preset);
  });
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    togglePause();
  } else if (e.key === 'c' || e.key === 'C') {
    sim.clear();
  } else if (e.key === '[') {
    brushSize = Math.max(1, brushSize - 1);
    brushSlider.value = brushSize;
    brushSizeVal.textContent = brushSize;
  } else if (e.key === ']') {
    brushSize = Math.min(18, brushSize + 1);
    brushSlider.value = brushSize;
    brushSizeVal.textContent = brushSize;
  }
});

// Main loop
let frameCount = 0;
let lastFpsTime = performance.now();

function loop(now) {
  if (!paused) {
    sim.step();
  }
  sim.render(ctx);
  particleCountEl.textContent = sim.particleCount.toLocaleString('cs-CZ');

  frameCount++;
  if (now - lastFpsTime >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
    fpsCounterEl.textContent = fps;
    frameCount = 0;
    lastFpsTime = now;
  }

  requestAnimationFrame(loop);
}

buildPalette();
sim.loadPreset('terrarium');
requestAnimationFrame(loop);
