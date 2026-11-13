// Procedural SVG Monster Artwork & Trading Card HTML Renderer

const MonsterArt = (() => {
  const PALETTES = {
    fire: [
      ['#ff6b35', '#d9261c', '#ffd166', '#fff3b0'],
      ['#ff4d6d', '#9e0031', '#ffbe0b', '#ffe5ec'],
      ['#fb8500', '#ae2012', '#ffb703', '#fff1d0']
    ],
    water: [
      ['#38bdf8', '#0369a1', '#a5f3fc', '#e0f2fe'],
      ['#2dd4bf', '#0f766e', '#99f6e4', '#ccfbf1'],
      ['#60a5fa', '#1d4ed8', '#bfdbfe', '#eff6ff']
    ],
    nature: [
      ['#4ade80', '#15803d', '#bef264', '#ecfccb'],
      ['#34d399', '#047857', '#fde047', '#fef9c3'],
      ['#84cc16', '#3f6212', '#d9f99d', '#f7fee7']
    ],
    electric: [
      ['#facc15', '#ca8a04', '#fef08a', '#ffffff'],
      ['#fbbf24', '#b45309', '#38bdf8', '#e0f2fe'],
      ['#fde047', '#eab308', '#fb7185', '#fff1f2']
    ],
    shadow: [
      ['#a855f7', '#4c1d95', '#f472b6', '#fae8ff'],
      ['#6366f1', '#1e1b4b', '#c084fc', '#eef2ff'],
      ['#8b5cf6', '#3b0764', '#22d3ee', '#f5f3ff']
    ],
    crystal: [
      ['#22d3ee', '#0e7490', '#e0f2fe', '#ffffff'],
      ['#f472b6', '#9d174d', '#fbcfe8', '#fff1f2'],
      ['#38bdf8', '#3730a3', '#a5f3fc', '#f0f9ff']
    ],
    wind: [
      ['#7dd3fc', '#0284c7', '#f0f9ff', '#ffffff'],
      ['#a5f3fc', '#0891b2', '#fde68a', '#fefce8'],
      ['#93c5fd', '#1e40af', '#e0e7ff', '#ffffff']
    ],
    cosmic: [
      ['#e879f9', '#701a75', '#38bdf8', '#fdf4ff'],
      ['#f43f5e', '#881337', '#fbbf24', '#fff1f2'],
      ['#818cf8', '#312e81', '#f472b6', '#eef2ff']
    ]
  };

  function hash(n) {
    const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function pick(arr, seed) {
    return arr[Math.floor(hash(seed) * arr.length)];
  }

  function generateMonsterSVG(card) {
    const id = card.id;
    const pal = pick(PALETTES[card.element], id * 3);
    const [cMain, cDark, cAccent, cLight] = pal;
    const gradId = `g-${id}-${Math.floor(Math.random() * 100000)}`;

    const stageNum = card.stage === 'Apex' ? 3 : card.stage;
    const bodyType = id % 7; // 7 distinct creature silhouettes
    const eyeType = (id * 3) % 5;
    const hornType = (id * 5) % 6;
    const tailType = (id * 7) % 5;
    const hasWings = stageNum >= 2 && (id % 2 === 0 || card.element === 'wind' || card.rarity === 'mythic' || card.rarity === 'secret');
    const isApex = card.rarity === 'epic' || card.rarity === 'mythic' || card.rarity === 'secret';

    // Background effects by rarity
    let bgLayer = `
      <defs>
        <radialGradient id="${gradId}-bg" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stop-color="${cMain}" stop-opacity="0.38" />
          <stop offset="65%" stop-color="${cDark}" stop-opacity="0.88" />
          <stop offset="100%" stop-color="#090b14" stop-opacity="1" />
        </radialGradient>
        <linearGradient id="${gradId}-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${cLight}" />
          <stop offset="35%" stop-color="${cMain}" />
          <stop offset="100%" stop-color="${cDark}" />
        </linearGradient>
        <linearGradient id="${gradId}-acc" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${cLight}" />
          <stop offset="100%" stop-color="${cAccent}" />
        </linearGradient>
      </defs>
      <rect width="200" height="170" fill="url(#${gradId}-bg)" />
    `;

    // Subtle background pattern
    if (card.rarity === 'uncommon' || card.rarity === 'rare') {
      bgLayer += `<circle cx="100" cy="85" r="62" fill="none" stroke="${cAccent}" stroke-opacity="0.22" stroke-width="1.5" stroke-dasharray="6 4" />`;
    }
    if (card.rarity === 'rare' || isApex) {
      bgLayer += `
        <g opacity="0.26" stroke="${cLight}" stroke-width="1.2">
          <line x1="100" y1="85" x2="15" y2="15" />
          <line x1="100" y1="85" x2="185" y2="15" />
          <line x1="100" y1="85" x2="15" y2="155" />
          <line x1="100" y1="85" x2="185" y2="155" />
          <line x1="100" y1="85" x2="100" y2="5" />
          <line x1="100" y1="85" x2="100" y2="165" />
        </g>
      `;
    }
    if (card.rarity === 'mythic' || card.rarity === 'secret') {
      bgLayer += `
        <circle cx="100" cy="85" r="70" fill="none" stroke="${cAccent}" stroke-opacity="0.45" stroke-width="2" />
        <circle cx="100" cy="85" r="52" fill="none" stroke="${cLight}" stroke-opacity="0.35" stroke-width="1.2" stroke-dasharray="3 5" />
      `;
    }

    // Floating sparkles
    const sparkCount = card.rarity === 'secret' ? 14 : card.rarity === 'mythic' ? 10 : card.rarity === 'epic' ? 7 : card.rarity === 'rare' ? 4 : 2;
    let sparks = '';
    for (let i = 0; i < sparkCount; i++) {
      const sx = 18 + hash(id * 13 + i * 7) * 164;
      const sy = 14 + hash(id * 17 + i * 11) * 140;
      const sr = 1.2 + hash(id + i * 3) * 2.4;
      sparks += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr.toFixed(1)}" fill="${i % 2 === 0 ? cLight : cAccent}" opacity="0.75" />`;
    }

    // Wings (behind body)
    let wingsSVG = '';
    if (hasWings) {
      const wingSpread = stageNum === 3 ? 66 : 52;
      if (card.element === 'shadow' || card.element === 'fire') {
        // Bat / Dragon wings
        wingsSVG = `
          <path d="M90 82 Q${90 - wingSpread} 38 ${95 - wingSpread} 90 Q${100 - wingSpread * 0.5} 82 92 98 Z" fill="${cDark}" stroke="${cAccent}" stroke-width="2" />
          <path d="M110 82 Q${110 + wingSpread} 38 ${105 + wingSpread} 90 Q${100 + wingSpread * 0.5} 82 108 98 Z" fill="${cDark}" stroke="${cAccent}" stroke-width="2" />
        `;
      } else {
        // Feathered / Energy wings
        wingsSVG = `
          <path d="M88 86 C${75 - wingSpread} 40, ${70 - wingSpread} 85, 88 104 Z" fill="url(#${gradId}-acc)" opacity="0.88" stroke="${cLight}" stroke-width="1.5" />
          <path d="M112 86 C${125 + wingSpread} 40, ${130 + wingSpread} 85, 112 104 Z" fill="url(#${gradId}-acc)" opacity="0.88" stroke="${cLight}" stroke-width="1.5" />
        `;
      }
    }

    // Tail (behind body)
    let tailSVG = '';
    if (tailType === 0) {
      tailSVG = `<path d="M122 115 Q165 110 158 72 Q148 88 124 102 Z" fill="${cAccent}" stroke="${cDark}" stroke-width="2" />`;
    } else if (tailType === 1) {
      // Lightning / spiky tail
      tailSVG = `<polyline points="120,115 148,100 138,88 166,68 148,108" fill="${cAccent}" stroke="${cLight}" stroke-width="2" stroke-linejoin="round" />`;
    } else if (tailType === 2) {
      // Fluffy / leaf tail
      tailSVG = `<ellipse cx="144" cy="100" rx="20" ry="12" transform="rotate(-25 144 100)" fill="url(#${gradId}-acc)" stroke="${cDark}" stroke-width="2" />`;
    } else if (tailType === 3) {
      // Twin ribbons
      tailSVG = `
        <path d="M78 105 Q45 90 42 125" fill="none" stroke="${cAccent}" stroke-width="5" stroke-linecap="round" />
        <path d="M122 105 Q155 90 158 125" fill="none" stroke="${cAccent}" stroke-width="5" stroke-linecap="round" />
      `;
    }

    // Main Body silhouette
    const scale = stageNum === 1 ? 0.86 : stageNum === 2 ? 0.98 : 1.08;
    let bodySVG = '';
    let headY = 76;
    let eyeSpread = 14;

    if (bodyType === 0) {
      // Cute Round / Blob / Slime
      headY = 86;
      bodySVG = `
        <ellipse cx="100" cy="102" rx="40" ry="34" fill="url(#${gradId}-body)" stroke="${cDark}" stroke-width="2.5" />
        <ellipse cx="100" cy="112" rx="24" ry="16" fill="${cLight}" opacity="0.45" />
      `;
    } else if (bodyType === 1) {
      // Bipedal Monster / Dino
      headY = 66;
      bodySVG = `
        <ellipse cx="100" cy="108" rx="30" ry="30" fill="url(#${gradId}-body)" stroke="${cDark}" stroke-width="2.5" />
        <ellipse cx="100" cy="112" rx="18" ry="20" fill="${cLight}" opacity="0.5" />
        <circle cx="100" cy="68" r="26" fill="url(#${gradId}-body)" stroke="${cDark}" stroke-width="2.5" />
        <ellipse cx="82" cy="136" rx="11" ry="6" fill="${cDark}" />
        <ellipse cx="118" cy="136" rx="11" ry="6" fill="${cDark}" />
        <path d="M72 102 Q58 112 68 118" fill="none" stroke="${cMain}" stroke-width="8" stroke-linecap="round" />
        <path d="M128 102 Q142 112 132 118" fill="none" stroke="${cMain}" stroke-width="8" stroke-linecap="round" />
      `;
    } else if (bodyType === 2) {
      // Fox / Quadruped
      headY = 72;
      bodySVG = `
        <ellipse cx="104" cy="110" rx="34" ry="22" fill="url(#${gradId}-body)" stroke="${cDark}" stroke-width="2.5" />
        <rect x="78" y="120" width="9" height="20" rx="4" fill="${cDark}" />
        <rect x="115" y="120" width="9" height="20" rx="4" fill="${cDark}" />
        <circle cx="92" cy="74" r="24" fill="url(#${gradId}-body)" stroke="${cDark}" stroke-width="2.5" />
        <ellipse cx="92" cy="84" rx="14" ry="9" fill="${cLight}" opacity="0.55" />
      `;
      eyeSpread = 12;
    } else if (bodyType === 3) {
      // Floating Spirit / Star / Orb
      headY = 82;
      bodySVG = `
        <circle cx="100" cy="84" r="32" fill="url(#${gradId}-body)" stroke="${cLight}" stroke-width="2.2" />
        <path d="M74 96 Q100 135 126 96 Q112 145 100 138 Q88 145 74 96 Z" fill="url(#${gradId}-acc)" opacity="0.85" />
      `;
    } else if (bodyType === 4) {
      // Armored Golem / Crystal Titan
      headY = 72;
      bodySVG = `
        <polygon points="72,88 128,88 138,128 118,140 82,140 62,128" fill="url(#${gradId}-body)" stroke="${cLight}" stroke-width="2.2" />
        <polygon points="78,52 122,52 130,86 70,86" fill="url(#${gradId}-body)" stroke="${cDark}" stroke-width="2.5" />
        <polygon points="56,92 70,86 68,120 52,115" fill="${cAccent}" stroke="${cDark}" stroke-width="2" />
        <polygon points="144,92 130,86 132,120 148,115" fill="${cAccent}" stroke="${cDark}" stroke-width="2" />
      `;
    } else if (bodyType === 5) {
      // Avian / Owl / Griffin
      headY = 70;
      bodySVG = `
        <ellipse cx="100" cy="106" rx="28" ry="30" fill="url(#${gradId}-body)" stroke="${cDark}" stroke-width="2.5" />
        <circle cx="100" cy="70" r="24" fill="url(#${gradId}-body)" stroke="${cDark}" stroke-width="2.5" />
        <polygon points="94,76 106,76 100,86" fill="#fbbf24" stroke="${cDark}" stroke-width="1.5" />
      `;
    } else {
      // Serpent / Sea Dragon
      headY = 66;
      bodySVG = `
        <path d="M76 134 C58 115, 138 105, 118 82 C108 70, 92 70, 92 84" fill="none" stroke="url(#${gradId}-body)" stroke-width="24" stroke-linecap="round" />
        <path d="M76 134 C58 115, 138 105, 118 82" fill="none" stroke="${cAccent}" stroke-width="6" stroke-linecap="round" opacity="0.6" />
        <circle cx="100" cy="66" r="23" fill="url(#${gradId}-body)" stroke="${cDark}" stroke-width="2.5" />
      `;
    }

    // Horns / Ears / Crest
    let hornsSVG = '';
    const hx = bodyType === 2 ? 92 : 100;
    if (hornType === 0) {
      // Fox ears
      hornsSVG = `
        <polygon points="${hx - 20},${headY - 10} ${hx - 28},${headY - 36} ${hx - 6},${headY - 20}" fill="${cMain}" stroke="${cDark}" stroke-width="2" />
        <polygon points="${hx + 20},${headY - 10} ${hx + 28},${headY - 36} ${hx + 6},${headY - 20}" fill="${cMain}" stroke="${cDark}" stroke-width="2" />
      `;
    } else if (hornType === 1) {
      // Curved horns
      hornsSVG = `
        <path d="M${hx - 14} ${headY - 18} Q${hx - 30} ${headY - 38} ${hx - 18} ${headY - 46}" fill="none" stroke="${cAccent}" stroke-width="6" stroke-linecap="round" />
        <path d="M${hx + 14} ${headY - 18} Q${hx + 30} ${headY - 38} ${hx + 18} ${headY - 46}" fill="none" stroke="${cAccent}" stroke-width="6" stroke-linecap="round" />
      `;
    } else if (hornType === 2) {
      // Crystal crown / spikes
      hornsSVG = `
        <polygon points="${hx - 16},${headY - 18} ${hx - 20},${headY - 38} ${hx - 6},${headY - 22}" fill="${cAccent}" stroke="${cLight}" stroke-width="1.5" />
        <polygon points="${hx - 6},${headY - 22} ${hx},${headY - 44} ${hx + 6},${headY - 22}" fill="${cLight}" stroke="${cAccent}" stroke-width="1.5" />
        <polygon points="${hx + 6},${headY - 22} ${hx + 20},${headY - 38} ${hx + 16},${headY - 18}" fill="${cAccent}" stroke="${cLight}" stroke-width="1.5" />
      `;
    } else if (hornType === 3) {
      // Antennae / Leaf
      hornsSVG = `
        <path d="M${hx} ${headY - 22} Q${hx - 12} ${headY - 42} ${hx - 22} ${headY - 36}" fill="none" stroke="${cAccent}" stroke-width="3" />
        <circle cx="${hx - 22}" cy="${headY - 36}" r="4.5" fill="${cLight}" />
        <path d="M${hx} ${headY - 22} Q${hx + 12} ${headY - 42} ${hx + 22} ${headY - 36}" fill="none" stroke="${cAccent}" stroke-width="3" />
        <circle cx="${hx + 22}" cy="${headY - 36}" r="4.5" fill="${cLight}" />
      `;
    } else if (hornType === 4) {
      // Halo / Floating ring for higher tiers
      hornsSVG = `<ellipse cx="${hx}" cy="${headY - 32}" rx="20" ry="6" fill="none" stroke="${cLight}" stroke-width="2.5" opacity="0.9" />`;
    }

    // Eyes
    const ex = bodyType === 2 ? 92 : 100;
    let eyesSVG = '';
    if (eyeType === 0) {
      // Cute big glossy eyes
      eyesSVG = `
        <circle cx="${ex - eyeSpread}" cy="${headY}" r="6" fill="#0f172a" />
        <circle cx="${ex + eyeSpread}" cy="${headY}" r="6" fill="#0f172a" />
        <circle cx="${ex - eyeSpread - 1.8}" cy="${headY - 2}" r="2.2" fill="#ffffff" />
        <circle cx="${ex + eyeSpread - 1.8}" cy="${headY - 2}" r="2.2" fill="#ffffff" />
      `;
    } else if (eyeType === 1) {
      // Fierce glowing eyes
      eyesSVG = `
        <polygon points="${ex - eyeSpread - 6},${headY - 4} ${ex - eyeSpread + 5},${headY} ${ex - eyeSpread - 3},${headY + 4}" fill="${cLight}" stroke="#0f172a" stroke-width="1.2" />
        <polygon points="${ex + eyeSpread + 6},${headY - 4} ${ex + eyeSpread - 5},${headY} ${ex + eyeSpread + 3},${headY + 4}" fill="${cLight}" stroke="#0f172a" stroke-width="1.2" />
      `;
    } else if (eyeType === 2) {
      // Happy crescent / arcade eyes
      eyesSVG = `
        <circle cx="${ex - eyeSpread}" cy="${headY}" r="5.5" fill="${cLight}" stroke="#0f172a" stroke-width="1.5" />
        <circle cx="${ex + eyeSpread}" cy="${headY}" r="5.5" fill="${cLight}" stroke="#0f172a" stroke-width="1.5" />
        <circle cx="${ex - eyeSpread}" cy="${headY}" r="2.5" fill="#0f172a" />
        <circle cx="${ex + eyeSpread}" cy="${headY}" r="2.5" fill="#0f172a" />
      `;
    } else if (eyeType === 3) {
      // Visor / Cyber eyes
      eyesSVG = `
        <rect x="${ex - eyeSpread - 5}" y="${headY - 4}" width="${eyeSpread * 2 + 10}" height="9" rx="4" fill="#0f172a" stroke="${cLight}" stroke-width="1.5" />
        <circle cx="${ex - eyeSpread + 2}" cy="${headY + 0.5}" r="2.5" fill="${cAccent}" />
        <circle cx="${ex + eyeSpread - 2}" cy="${headY + 0.5}" r="2.5" fill="${cAccent}" />
      `;
    } else {
      // Mystic 3rd eye
      eyesSVG = `
        <circle cx="${ex - eyeSpread}" cy="${headY + 1}" r="5" fill="#0f172a" />
        <circle cx="${ex + eyeSpread}" cy="${headY + 1}" r="5" fill="#0f172a" />
        <circle cx="${ex - eyeSpread - 1}" cy="${headY - 0.5}" r="1.8" fill="${cLight}" />
        <circle cx="${ex + eyeSpread - 1}" cy="${headY - 0.5}" r="1.8" fill="${cLight}" />
        <polygon points="${ex},${headY - 15} ${ex - 4},${headY - 9} ${ex},${headY - 5} ${ex + 4},${headY - 9}" fill="${cLight}" />
      `;
    }

    // Mouth (skip if avian beak)
    const mouthSVG = bodyType === 5 ? '' : `
      <path d="M${ex - 6} ${headY + 11} Q${ex} ${headY + 16} ${ex + 6} ${headY + 11}" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" />
    `;

    // Shadow under creature
    const shadowSVG = `<ellipse cx="100" cy="146" rx="42" ry="8" fill="#000000" opacity="0.42" />`;

    return `
      <svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg" class="monster-svg">
        ${bgLayer}
        ${sparks}
        ${shadowSVG}
        <g transform="translate(100,90) scale(${scale}) translate(-100,-90)">
          ${wingsSVG}
          ${tailSVG}
          ${bodySVG}
          ${hornsSVG}
          ${eyesSVG}
          ${mouthSVG}
        </g>
      </svg>
    `;
  }

  function renderCardHTML(card, opts = {}) {
    const elem = ELEMENTS[card.element];
    const rar = RARITIES[card.rarity];
    const isLocked = !!opts.locked;
    const count = opts.count || 0;
    const isNew = !!opts.isNew;

    if (isLocked) {
      return `
        <div class="poke-card locked" data-id="${card.id}">
          <div class="card-inner-locked">
            <div class="locked-code">${card.code}</div>
            <div class="locked-silhouette">?</div>
            <div class="locked-name">???</div>
            <div class="locked-rarity">${rar.label}</div>
          </div>
        </div>
      `;
    }

    const stageLabel = card.stage === 'Apex' ? 'APEX' : `Fáze ${card.stage}`;
    const svg = generateMonsterSVG(card);

    return `
      <div class="poke-card rarity-${card.rarity} elem-${card.element}" data-id="${card.id}" style="--elem-color:${elem.color}; --elem-glow:${elem.glow}; --rar-color:${rar.color}">
        <div class="card-holo"></div>
        <div class="card-glare"></div>
        <div class="card-sparkle"></div>
        ${isNew ? '<div class="badge-new">NOVÁ!</div>' : ''}
        ${count > 1 ? `<div class="badge-count">×${count}</div>` : ''}
        <div class="card-header">
          <span class="card-code">${card.code}</span>
          <span class="card-name" title="${card.name}">${card.name}</span>
          <span class="card-hp"><small>HP</small>${card.hp} <span class="elem-dot" title="${elem.name}">${elem.icon}</span></span>
        </div>
        <div class="card-art-frame">
          ${svg}
          <div class="rarity-pill">${rar.label}</div>
        </div>
        <div class="card-meta">
          <span class="stage-tag">${stageLabel}</span>
          <span class="ability-tag" title="${card.ability}">⚔️ ${card.ability}</span>
        </div>
        <div class="card-stats-row">
          <span>ATK <strong>${card.atk}</strong></span>
          <span>DEF <strong>${card.def}</strong></span>
          <span class="sell-tag" title="Hodnota duplikátu">${rar.sell}🪙</span>
        </div>
      </div>
    `;
  }

  return {
    generateMonsterSVG,
    renderCardHTML
  };
})();
