// KartyMon Arcade — Main Application Logic

(() => {
  const SAVE_KEY = 'kartymon_arcade_v1';

  const ACHIEVEMENTS = [
    { id: 'first_pack', title: 'První rozbalení', desc: 'Otevři svůj první booster balíček.', reward: 75, check: s => s.packsOpened >= 1 },
    { id: 'packs_10', title: 'Sběratelská horečka', desc: 'Otevři celkem 10 balíčků.', reward: 150, check: s => s.packsOpened >= 10 },
    { id: 'packs_30', title: 'Arkáda šampion', desc: 'Otevři celkem 30 balíčků.', reward: 350, check: s => s.packsOpened >= 30 },
    { id: 'cards_20', title: 'Začínající trenér', desc: 'Nasbírej 20 unikátních příšerek.', reward: 120, check: (s, u) => u >= 20 },
    { id: 'cards_50', title: 'Lovec příšer', desc: 'Nasbírej 50 unikátních příšerek.', reward: 300, check: (s, u) => u >= 50 },
    { id: 'cards_100', title: 'Velké album', desc: 'Nasbírej 100 unikátních příšerek.', reward: 600, check: (s, u) => u >= 100 },
    { id: 'cards_160', title: 'Mistr KartyMonu!', desc: 'Kompletní album: všech 160 karet!', reward: 2500, check: (s, u) => u >= 160 },
    { id: 'got_epic', title: 'Epický úlovek', desc: 'Vytáhni alespoň jednu Epickou kartu.', reward: 150, check: s => hasRarity(s, 'epic') },
    { id: 'got_mythic', title: 'Dotek legendy', desc: 'Vytáhni alespoň jednu Mýtickou kartu.', reward: 300, check: s => hasRarity(s, 'mythic') },
    { id: 'got_secret', title: 'Prismatické tajemství', desc: 'Vytáhni Tajnou (Secret) kartu!', reward: 750, check: s => hasRarity(s, 'secret') },
    { id: 'god_pack', title: 'Požehnání Arkády', desc: 'Zažij vzácný GOD PACK!', reward: 500, check: s => s.godPacks >= 1 }
  ];

  function hasRarity(state, rarity) {
    return Object.keys(state.collection).some(id => {
      const c = CARDS[Number(id) - 1];
      return c && c.rarity === rarity && state.collection[id] > 0;
    });
  }

  // Default state
  let state = {
    coins: 500,
    collection: {},
    packsOpened: 0,
    godPacks: 0,
    claimedAchievements: [],
    muted: false,
    lastFreeClaim: 0
  };

  // Runtime UI state
  let activePackType = null;
  let currentPull = [];
  let revealedIndices = new Set();
  let packTorn = false;
  let albumView = 'binder'; // 'binder' | 'grid'
  let albumPage = 1;
  const BINDER_PAGE_SIZE = 9;
  let modalCardId = null;

  // DOM refs
  const $ = id => document.getElementById(id);

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = { ...state, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load save', e);
    }
    ArcadeAudio.setMuted(state.muted);
  }

  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save', e);
    }
  }

  function getUniqueCount() {
    return Object.values(state.collection).filter(c => c > 0).length;
  }

  function getDuplicateStats() {
    let count = 0;
    let value = 0;
    for (const [idStr, qty] of Object.entries(state.collection)) {
      if (qty > 1) {
        const card = CARDS[Number(idStr) - 1];
        if (card) {
          const extra = qty - 1;
          count += extra;
          value += extra * card.sellValue;
        }
      }
    }
    return { count, value };
  }

  // Toast notifications
  function showToast(msg, type = 'info') {
    const container = $('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  // Particle FX Canvas
  const fxCanvas = $('fx-canvas');
  const fxCtx = fxCanvas.getContext('2d');
  let particles = [];
  let fxRunning = false;

  function resizeFx() {
    fxCanvas.width = window.innerWidth;
    fxCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeFx);
  resizeFx();

  function spawnParticles(x, y, count = 30, colors = ['#ffd43b', '#38bdf8', '#f472b6', '#4ade80']) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.014 + Math.random() * 0.015,
        gravity: 0.16
      });
    }
    if (!fxRunning) {
      fxRunning = true;
      requestAnimationFrame(tickFx);
    }
  }

  function tickFx() {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    particles = particles.filter(p => p.alpha > 0.02);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;
      fxCtx.globalAlpha = Math.max(0, p.alpha);
      fxCtx.fillStyle = p.color;
      fxCtx.fillRect(p.x, p.y, p.size, p.size);
    }
    fxCtx.globalAlpha = 1;
    if (particles.length > 0) {
      requestAnimationFrame(tickFx);
    } else {
      fxRunning = false;
    }
  }

  // Update HUD
  function updateHUD() {
    const unique = getUniqueCount();
    const dupes = getDuplicateStats();
    $('coin-display').textContent = state.coins.toLocaleString('cs-CZ');
    $('nav-album-count').textContent = `${unique}/160`;
    $('stat-packs').textContent = state.packsOpened;
    $('stat-unique').textContent = `${unique} / 160`;
    $('shop-dupe-count').textContent = dupes.count;
    $('album-dupe-value').textContent = dupes.value;
    $('btn-sound').textContent = state.muted ? '🔇' : '🔊';

    // Check claimable achievements dot
    const hasUnclaimed = ACHIEVEMENTS.some(a => !state.claimedAchievements.includes(a.id) && a.check(state, unique));
    $('nav-ach-dot').classList.toggle('hidden', !hasUnclaimed);
  }

  // Render Pack Shop
  function renderPackShop() {
    const grid = $('pack-grid');
    grid.innerHTML = PACK_TYPES.map(pack => {
      const canAfford = state.coins >= pack.cost;
      return `
        <div class="pack-card" style="--pack-theme: ${pack.theme}; --pack-accent: ${pack.accent}">
          <div class="pack-card-art">
            <div class="mini-pack">
              <div class="mini-pack-emblem">${pack.emblem}</div>
              <div class="mini-pack-stripe">5 KARET</div>
            </div>
          </div>
          <div class="pack-card-info">
            <h3>${pack.name}</h3>
            <p>${pack.subtitle}</p>
            <div class="pack-odds">
              <span>Vzácná+: <strong>${(pack.weights.rare + pack.weights.epic + pack.weights.mythic + pack.weights.secret).toFixed(0)}%</strong></span>
              <span>Mýtická/Tajná: <strong>${(pack.weights.mythic + pack.weights.secret).toFixed(1)}%</strong></span>
            </div>
            <button class="btn-buy-pack ${canAfford ? '' : 'disabled'}" data-pack="${pack.id}">
              Otevřít za <strong>${pack.cost} 🪙</strong>
            </button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-buy-pack').forEach(btn => {
      btn.addEventListener('click', () => startPackOpening(btn.dataset.pack));
    });
  }

  // Weighted random rarity roll
  function rollRarity(weights, minRarity = null) {
    const order = ['common', 'uncommon', 'rare', 'epic', 'mythic', 'secret'];
    const minIdx = minRarity ? order.indexOf(minRarity) : 0;

    let pool = [];
    let total = 0;
    for (let i = minIdx; i < order.length; i++) {
      const r = order[i];
      const w = weights[r] || 0;
      if (w > 0) {
        pool.push({ r, w });
        total += w;
      }
    }
    let roll = Math.random() * total;
    for (const item of pool) {
      roll -= item.w;
      if (roll <= 0) return item.r;
    }
    return pool[pool.length - 1].r;
  }

  function pickRandomCardByRarity(rarity) {
    const candidates = CARDS.filter(c => c.rarity === rarity);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function generatePackPull(pack) {
    const isGodPack = Math.random() < 0.018; // ~1.8% God Pack chance!
    const pull = [];
    for (let i = 0; i < 5; i++) {
      let minR = null;
      if (isGodPack) {
        minR = 'rare';
      } else if (i === 4 && pack.guaranteedMin) {
        minR = pack.guaranteedMin;
      }
      const rarity = rollRarity(pack.weights, minR);
      const card = pickRandomCardByRarity(rarity);
      const wasNew = !state.collection[card.id] || state.collection[card.id] === 0;
      pull.push({ card, wasNew });
    }
    // Sort so highest rarity is last for suspense!
    pull.sort((a, b) => RARITIES[a.card.rarity].order - RARITIES[b.card.rarity].order);
    return { pull, isGodPack };
  }

  function startPackOpening(packId) {
    const pack = PACK_TYPES.find(p => p.id === packId);
    if (!pack) return;
    if (state.coins < pack.cost) {
      ArcadeAudio.playClick();
      showToast('Nemáš dost mincí! Klikni na ⚡ +Mince nebo prodej duplikáty.', 'warn');
      return;
    }

    ArcadeAudio.playClick();
    state.coins -= pack.cost;
    state.packsOpened += 1;

    const { pull, isGodPack } = generatePackPull(pack);
    if (isGodPack) state.godPacks += 1;

    // Add cards to collection immediately so state is safe even if user leaves early
    for (const item of pull) {
      state.collection[item.card.id] = (state.collection[item.card.id] || 0) + 1;
    }
    saveState();
    updateHUD();

    activePackType = pack;
    currentPull = pull;
    revealedIndices = new Set();
    packTorn = false;

    // Setup stage UI
    $('pack-shop-view').classList.add('hidden');
    $('pack-stage-view').classList.remove('hidden');
    $('stage-pack-name').textContent = pack.name;
    $('tear-zone').classList.remove('hidden');
    $('reveal-zone').classList.add('hidden');
    $('btn-reveal-all').classList.add('hidden');
    $('btn-open-another').classList.add('hidden');
    $('reveal-summary').classList.add('hidden');
    $('god-pack-banner').classList.toggle('hidden', !isGodPack);

    const visual = $('active-pack-visual');
    visual.className = 'pack-wrapper';
    visual.style.setProperty('--pack-theme', pack.theme);
    visual.style.setProperty('--pack-accent', pack.accent);
    $('pack-emblem').textContent = pack.emblem;
    $('pack-visual-title').textContent = pack.name.toUpperCase();

    if (isGodPack) {
      visual.classList.add('god-pack-glow');
    }
  }

  function tearPack() {
    if (packTorn) return;
    packTorn = true;
    ArcadeAudio.playTear();

    const visual = $('active-pack-visual');
    visual.classList.add('tearing');
    const rect = visual.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + 40, 45, ['#ffffff', activePackType.accent, '#ffd43b']);

    const isGod = !$('god-pack-banner').classList.contains('hidden');
    if (isGod) {
      setTimeout(() => ArcadeAudio.playGodPack(), 220);
      document.body.classList.add('screen-shake');
      setTimeout(() => document.body.classList.remove('screen-shake'), 600);
    }

    setTimeout(() => {
      $('tear-zone').classList.add('hidden');
      $('reveal-zone').classList.remove('hidden');
      $('btn-reveal-all').classList.remove('hidden');
      renderRevealRow();
    }, 450);
  }

  function renderRevealRow() {
    const row = $('reveal-cards-row');
    row.innerHTML = currentPull.map((item, idx) => {
      const rar = item.card.rarity;
      const isHigh = rar === 'rare' || rar === 'epic' || rar === 'mythic' || rar === 'secret';
      return `
        <div class="flip-slot ${isHigh ? `hint-${rar}` : ''}" data-idx="${idx}">
          <div class="flip-card-inner">
            <div class="flip-face flip-back">
              <div class="card-back-logo">KM</div>
              <div class="card-back-sub">KLEPNI PRO ODHALENÍ</div>
            </div>
            <div class="flip-face flip-front">
              ${MonsterArt.renderCardHTML(item.card, { isNew: item.wasNew })}
            </div>
          </div>
        </div>
      `;
    }).join('');

    row.querySelectorAll('.flip-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const idx = Number(slot.dataset.idx);
        if (!revealedIndices.has(idx)) {
          revealCardAt(idx, slot);
        } else {
          openCardModal(currentPull[idx].card.id);
        }
      });
    });
  }

  function revealCardAt(idx, slotEl) {
    if (revealedIndices.has(idx)) return;
    revealedIndices.add(idx);
    slotEl.classList.add('flipped');

    const { card } = currentPull[idx];
    ArcadeAudio.playFlip();
    setTimeout(() => ArcadeAudio.playRarity(card.rarity), 120);

    const rect = slotEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (card.rarity === 'rare') {
      spawnParticles(cx, cy, 24, ['#fbbf24', '#fef08a', '#ffffff']);
    } else if (card.rarity === 'epic') {
      spawnParticles(cx, cy, 38, ['#c084fc', '#e879f9', '#38bdf8', '#ffffff']);
    } else if (card.rarity === 'mythic' || card.rarity === 'secret') {
      spawnParticles(cx, cy, 65, ['#fde047', '#fb7185', '#38bdf8', '#4ade80', '#c084fc']);
      document.body.classList.add('screen-shake');
      setTimeout(() => document.body.classList.remove('screen-shake'), 500);
    }

    if (revealedIndices.size === currentPull.length) {
      finishReveal();
    }
  }

  function revealAllCards() {
    const slots = $('reveal-cards-row').querySelectorAll('.flip-slot');
    let delay = 0;
    slots.forEach((slot, idx) => {
      if (!revealedIndices.has(idx)) {
        setTimeout(() => revealCardAt(idx, slot), delay);
        delay += 180;
      }
    });
  }

  function finishReveal() {
    $('btn-reveal-all').classList.add('hidden');
    $('btn-open-another').classList.remove('hidden');
    $('btn-open-another').textContent = `🎴 Otevřít další (${activePackType.cost} 🪙)`;

    const newCount = currentPull.filter(i => i.wasNew).length;
    const best = currentPull[currentPull.length - 1].card;
    $('reveal-summary-text').innerHTML = `Nové karty do alba: <strong>${newCount}</strong> • Nejlepší úlovek: <strong>${best.name}</strong> (${RARITIES[best.rarity].label})`;
    $('reveal-summary').classList.remove('hidden');

    checkAndNotifyAchievements();
  }

  function checkAndNotifyAchievements() {
    const unique = getUniqueCount();
    const newlyUnlocked = ACHIEVEMENTS.filter(a => !state.claimedAchievements.includes(a.id) && a.check(state, unique));
    if (newlyUnlocked.length > 0) {
      showToast(`🏆 Odemčena výzva: ${newlyUnlocked[0].title}! Vyzvedni si odměnu v záložce Výzvy.`, 'success');
      updateHUD();
    }
  }

  // === ALBUM / BINDER ===
  function getFilteredCards() {
    const q = $('filter-search').value.trim().toLowerCase();
    const ownedFilter = $('filter-owned').value;
    const elemFilter = $('filter-element').value;
    const rarFilter = $('filter-rarity').value;

    return CARDS.filter(c => {
      const qty = state.collection[c.id] || 0;
      if (ownedFilter === 'owned' && qty === 0) return false;
      if (ownedFilter === 'missing' && qty > 0) return false;
      if (elemFilter !== 'all' && c.element !== elemFilter) return false;
      if (rarFilter !== 'all' && c.rarity !== rarFilter) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q) && String(c.id) !== q) {
        return false;
      }
      return true;
    });
  }

  function renderRaritySummary() {
    const strip = $('rarity-summary-strip');
    strip.innerHTML = Object.values(RARITIES).map(r => {
      const total = CARDS.filter(c => c.rarity === r.id).length;
      const owned = CARDS.filter(c => c.rarity === r.id && (state.collection[c.id] || 0) > 0).length;
      return `
        <div class="rar-chip" style="--rc: ${r.color}">
          <span class="rar-dot"></span>
          <span>${r.label}: <strong>${owned}/${total}</strong></span>
        </div>
      `;
    }).join('');
  }

  function renderAlbum() {
    const unique = getUniqueCount();
    const pct = Math.round((unique / CARDS.length) * 100);
    $('album-progress-fill').style.width = `${pct}%`;
    $('album-progress-text').textContent = `${unique} / ${CARDS.length} (${pct}%)`;
    renderRaritySummary();

    const filtered = getFilteredCards();
    const grid = $('album-grid');
    const controls = $('binder-controls');

    let cardsToShow = filtered;
    if (albumView === 'binder') {
      controls.classList.remove('hidden');
      grid.classList.add('binder-mode');
      const totalPages = Math.max(1, Math.ceil(filtered.length / BINDER_PAGE_SIZE));
      if (albumPage > totalPages) albumPage = totalPages;
      if (albumPage < 1) albumPage = 1;
      const start = (albumPage - 1) * BINDER_PAGE_SIZE;
      cardsToShow = filtered.slice(start, start + BINDER_PAGE_SIZE);
      $('page-indicator').textContent = `Strana ${albumPage} / ${totalPages}`;
      $('btn-prev-page').disabled = albumPage <= 1;
      $('btn-next-page').disabled = albumPage >= totalPages;
    } else {
      controls.classList.add('hidden');
      grid.classList.remove('binder-mode');
    }

    if (cardsToShow.length === 0) {
      grid.innerHTML = `<div class="empty-album">Žádné karty neodpovídají zvolenému filtru.</div>`;
      return;
    }

    grid.innerHTML = cardsToShow.map(card => {
      const count = state.collection[card.id] || 0;
      return `<div class="album-slot">${MonsterArt.renderCardHTML(card, { locked: count === 0, count })}</div>`;
    }).join('');

    grid.querySelectorAll('.poke-card:not(.locked)').forEach(el => {
      el.addEventListener('click', () => openCardModal(Number(el.dataset.id)));
    });
  }

  // === 3D CARD INSPECT MODAL ===
  function openCardModal(cardId) {
    const card = CARDS[cardId - 1];
    if (!card) return;
    modalCardId = cardId;
    ArcadeAudio.playClick();

    const elem = ELEMENTS[card.element];
    const rar = RARITIES[card.rarity];
    const count = state.collection[card.id] || 0;

    const stage = $('modal-card-stage');
    stage.innerHTML = `<div class="tilt-card-wrap">${MonsterArt.renderCardHTML(card, { count })}</div>`;
    attach3DTilt(stage.querySelector('.tilt-card-wrap'));

    $('modal-badges').innerHTML = `
      <span class="m-badge" style="border-color:${elem.color}; color:${elem.color}">${elem.icon} ${elem.name}</span>
      <span class="m-badge" style="border-color:${rar.color}; color:${rar.color}">★ ${rar.label}</span>
      <span class="m-badge">${card.code}</span>
    `;
    $('modal-name').textContent = card.name;
    $('modal-lore').textContent = card.lore;
    $('modal-stats').innerHTML = `
      <div class="m-stat"><span>HP</span><strong>${card.hp}</strong></div>
      <div class="m-stat"><span>ATK</span><strong>${card.atk}</strong></div>
      <div class="m-stat"><span>DEF</span><strong>${card.def}</strong></div>
      <div class="m-stat"><span>Schopnost</span><strong>${card.ability}</strong></div>
    `;
    $('modal-evo').textContent = `Úroveň: ${card.stage === 'Apex' ? 'Apex / Legendární forma' : `Vývojová fáze ${card.stage}`}`;
    $('modal-owned-count').textContent = `${count}×`;

    const sellBtn = $('modal-sell-dupe');
    if (count > 1) {
      sellBtn.classList.remove('hidden');
      $('modal-sell-price').textContent = card.sellValue;
    } else {
      sellBtn.classList.add('hidden');
    }

    $('card-modal').classList.remove('hidden');
  }

  function closeCardModal() {
    $('card-modal').classList.add('hidden');
    modalCardId = null;
  }

  function attach3DTilt(el) {
    if (!el) return;
    const card = el.querySelector('.poke-card');
    function handleMove(clientX, clientY) {
      const r = el.getBoundingClientRect();
      const px = (clientX - r.left) / r.width;
      const py = (clientY - r.top) / r.height;
      const rx = (0.5 - py) * 24;
      const ry = (px - 0.5) * 24;
      card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    }
    el.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
    el.addEventListener('touchmove', e => {
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    el.addEventListener('mouseleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }

  // === SELL DUPLICATES ===
  function sellAllDuplicates() {
    const { count, value } = getDuplicateStats();
    if (count === 0) {
      showToast('Nemáš žádné duplikáty k prodeji.', 'info');
      return;
    }
    for (const [idStr, qty] of Object.entries(state.collection)) {
      if (qty > 1) state.collection[idStr] = 1;
    }
    state.coins += value;
    saveState();
    ArcadeAudio.playCoin();
    spawnParticles(window.innerWidth / 2, 80, 30, ['#ffd43b', '#fef08a']);
    showToast(`Prodáno ${count} duplikátů za +${value} 🪙!`, 'success');
    updateHUD();
    renderPackShop();
    renderAlbum();
  }

  // === ACHIEVEMENTS ===
  function renderAchievements() {
    const unique = getUniqueCount();
    const grid = $('achievements-grid');
    grid.innerHTML = ACHIEVEMENTS.map(a => {
      const done = a.check(state, unique);
      const claimed = state.claimedAchievements.includes(a.id);
      return `
        <div class="ach-card ${claimed ? 'claimed' : done ? 'ready' : ''}">
          <div class="ach-icon">${claimed ? '✅' : done ? '🎁' : '🔒'}</div>
          <div class="ach-body">
            <h4>${a.title}</h4>
            <p>${a.desc}</p>
          </div>
          <div class="ach-action">
            ${claimed
              ? '<span class="ach-done-label">Vyzvednuto</span>'
              : done
                ? `<button class="btn-primary btn-claim-ach" data-ach="${a.id}">Vyzvednout +${a.reward} 🪙</button>`
                : `<span class="ach-reward">+${a.reward} 🪙</span>`
            }
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-claim-ach').forEach(btn => {
      btn.addEventListener('click', () => {
        const ach = ACHIEVEMENTS.find(x => x.id === btn.dataset.ach);
        if (!ach || state.claimedAchievements.includes(ach.id)) return;
        state.claimedAchievements.push(ach.id);
        state.coins += ach.reward;
        saveState();
        ArcadeAudio.playCoin();
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, 40, ['#ffd43b', '#4ade80']);
        showToast(`Vyzvednuta odměna +${ach.reward} 🪙!`, 'success');
        updateHUD();
        renderPackShop();
        renderAchievements();
      });
    });
  }

  // === NAVIGATION & EVENTS ===
  function switchTab(tabName) {
    ArcadeAudio.playClick();
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
    if (tabName === 'album') renderAlbum();
    if (tabName === 'achievements') renderAchievements();
    if (tabName === 'packs') renderPackShop();
  }

  function bindEvents() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    $('btn-sound').addEventListener('click', () => {
      state.muted = !state.muted;
      ArcadeAudio.setMuted(state.muted);
      saveState();
      updateHUD();
      if (!state.muted) ArcadeAudio.playClick();
    });

    $('btn-free-coins').addEventListener('click', () => {
      const now = Date.now();
      const cooldown = 20000;
      if (state.coins >= 100 && now - state.lastFreeClaim < cooldown) {
        const wait = Math.ceil((cooldown - (now - state.lastFreeClaim)) / 1000);
        showToast(`Arkáda dobíjení bude připraveno za ${wait}s (nebo kdykoliv pod 100 🪙).`, 'info');
        return;
      }
      state.lastFreeClaim = now;
      state.coins += 100;
      saveState();
      ArcadeAudio.playCoin();
      spawnParticles(window.innerWidth - 120, 50, 22, ['#ffd43b', '#fbbf24']);
      showToast('Arkáda bonus: +100 🪙!', 'success');
      updateHUD();
      renderPackShop();
    });

    // Pack stage buttons
    $('btn-back-to-shop').addEventListener('click', () => {
      ArcadeAudio.playClick();
      $('pack-stage-view').classList.add('hidden');
      $('pack-shop-view').classList.remove('hidden');
      renderPackShop();
      updateHUD();
    });

    $('btn-reveal-all').addEventListener('click', revealAllCards);
    $('btn-open-another').addEventListener('click', () => {
      if (activePackType) startPackOpening(activePackType.id);
    });

    // Tear pack via click or drag
    const packVisual = $('active-pack-visual');
    let dragStartX = null;
    packVisual.addEventListener('click', tearPack);
    packVisual.addEventListener('pointerdown', e => { dragStartX = e.clientX; });
    packVisual.addEventListener('pointermove', e => {
      if (dragStartX !== null && Math.abs(e.clientX - dragStartX) > 35) {
        dragStartX = null;
        tearPack();
      }
    });
    packVisual.addEventListener('pointerup', () => { dragStartX = null; });

    // Duplicate selling
    $('btn-sell-all-dupes-shop').addEventListener('click', sellAllDuplicates);
    $('btn-sell-all-dupes').addEventListener('click', sellAllDuplicates);

    // Album filters & view toggle
    ['filter-search', 'filter-owned', 'filter-element', 'filter-rarity'].forEach(id => {
      $(id).addEventListener('input', () => {
        albumPage = 1;
        renderAlbum();
      });
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        ArcadeAudio.playClick();
        albumView = btn.dataset.view;
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderAlbum();
      });
    });

    $('btn-prev-page').addEventListener('click', () => {
      if (albumPage > 1) {
        ArcadeAudio.playFlip();
        albumPage--;
        renderAlbum();
      }
    });

    $('btn-next-page').addEventListener('click', () => {
      ArcadeAudio.playFlip();
      albumPage++;
      renderAlbum();
    });

    // Modal events
    $('modal-close').addEventListener('click', closeCardModal);
    $('modal-backdrop').addEventListener('click', closeCardModal);
    $('modal-sell-dupe').addEventListener('click', () => {
      if (!modalCardId) return;
      const qty = state.collection[modalCardId] || 0;
      if (qty <= 1) return;
      const card = CARDS[modalCardId - 1];
      state.collection[modalCardId] = qty - 1;
      state.coins += card.sellValue;
      saveState();
      ArcadeAudio.playCoin();
      showToast(`Prodán 1 duplikát (${card.name}) za +${card.sellValue} 🪙`, 'success');
      updateHUD();
      openCardModal(modalCardId);
      if ($('tab-album').classList.contains('active')) renderAlbum();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeCardModal();
    });

    $('btn-reset-save').addEventListener('click', () => {
      if (confirm('Opravdu chceš smazat celou sbírku 160 karet a začít od nuly?')) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
      }
    });
  }

  // Init
  loadState();
  bindEvents();
  updateHUD();
  renderPackShop();
})();
