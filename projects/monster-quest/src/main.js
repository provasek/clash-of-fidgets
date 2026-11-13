import { GameEngine } from './engine.js';
import { audio } from './audio.js';

const canvas = document.getElementById('game-canvas');
const game = new GameEngine(canvas);

// Keyboard input
window.addEventListener('keydown', (e) => {
  const preventKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
  if (preventKeys.includes(e.key)) e.preventDefault();
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.repeat && (key === 'z' || key === 'Enter' || key === ' ' || key === 'x' || key === 'm' || key === 'Escape')) {
    return;
  }
  game.onKeyDown(key);
});

window.addEventListener('keyup', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  game.onKeyUp(key);
});

// On-screen handheld buttons (mouse & touch)
document.querySelectorAll('[data-key]').forEach((btn) => {
  const key = btn.getAttribute('data-key');
  const press = (e) => {
    e.preventDefault();
    game.onKeyDown(key);
  };
  const release = (e) => {
    e.preventDefault();
    game.onKeyUp(key);
  };
  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', release);
  btn.addEventListener('touchstart', press, { passive: false });
  btn.addEventListener('touchend', release, { passive: false });
});

// Top bar controls
const btnSound = document.getElementById('btn-sound');
const btnSpeed = document.getElementById('btn-speed');
const btnBezel = document.getElementById('btn-bezel');
const wrapper = document.getElementById('console-wrapper');

btnSound.addEventListener('click', () => {
  audio.unlock();
  audio.setEnabled(!audio.enabled);
  game.syncTopButtons();
});

btnSpeed.addEventListener('click', () => {
  game.speedMult = game.speedMult === 1 ? 2 : 1;
  game.syncTopButtons();
});

btnBezel.addEventListener('click', () => {
  wrapper.classList.toggle('clean-mode');
  btnBezel.textContent = wrapper.classList.contains('clean-mode') ? '🖥️ Čistý režim' : '🎮 Konzole';
});

// 60fps loop
function loop() {
  game.update();
  game.draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
