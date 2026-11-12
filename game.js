/**
 * Hrad & Hrdina: Clash of Fidgets
 * Komplexní kombinace budování vesnice a taktických nájezdů (Clash of Clans)
 * s RPG systémem hrdiny, hospodou, obchody a podzemím (Shakes & Fidget).
 */

// --- STATE MANAGEMENT ---
const STORAGE_KEY = 'hrad_hrdina_save_v1';

const INITIAL_STATE = {
    res: {
        gold: 500,
        elixir: 300,
        gems: 25,
        trophies: 100
    },
    hero: {
        name: "Rekrut Artuš",
        class: "warrior", // warrior | ranger | mage
        level: 1,
        xp: 0,
        xpNext: 100,
        stats: {
            str: 10,
            dex: 10,
            int: 10,
            con: 10,
            lck: 10
        },
        equipment: {
            helmet: null,
            amulet: null,
            weapon: null,
            armor: null,
            offhand: null,
            boots: null
        },
        inventory: [] // max 16 items
    },
    village: {
        townHallLevel: 1,
        buildings: [
            { id: 1, type: 'townhall', level: 1, name: 'Radnice', icon: '🏛️', slot: 0 },
            { id: 2, type: 'goldmine', level: 1, name: 'Zlatý Důl', icon: '⛏️', slot: 1, lastCollected: Date.now() },
            { id: 3, type: 'elixircamp', level: 1, name: 'Sběrač Elixíru', icon: '🔮', slot: 2, lastCollected: Date.now() },
            { id: 4, type: 'barracks', level: 1, name: 'Kasárna', icon: '⛺', slot: 3 },
            { id: 5, type: 'camp', level: 1, name: 'Vojenský Tábor', icon: '🏕️', slot: 4 },
            { id: 6, type: 'cannon', level: 1, name: 'Obranné Dělo', icon: '💣', slot: 5 },
            { id: 7, type: 'empty', level: 0, name: 'Volná Parcela', icon: '➕', slot: 6 },
            { id: 8, type: 'empty', level: 0, name: 'Volná Parcela', icon: '➕', slot: 7 }
        ]
    },
    army: {
        barbarian: 4,
        archer: 2,
        giant: 0,
        wizard: 0
    },
    spells: {
        heal: 1,
        lightning: 1
    },
    tavern: {
        stamina: 100,
        maxStamina: 100,
        activeQuest: null, // { title, story, durationSec, remainingSec, rewardGold, rewardXp, rewardItem, icon }
        availableQuests: []
    },
    shop: {
        items: []
    },
    dungeon: {
        floor: 1,
        maxFloors: 12
    },
    soundEnabled: true
};

let G = JSON.parse(JSON.stringify(INITIAL_STATE));
let selectedBuildingId = null;
let selectedInvIndex = null;
let currentDeployUnit = 'hero'; // 'hero', 'barbarian', 'archer', 'giant', 'wizard', 'heal', 'lightning'

// Unit configurations
const TROOP_DEFS = {
    barbarian: { name: 'Barbar', icon: '🪓', hp: 80, dmg: 16, spd: 1.5, range: 25, space: 1, costElixir: 25, unlockBarracks: 1 },
    archer: { name: 'Lučištnice', icon: '🏹', hp: 45, dmg: 18, spd: 1.6, range: 110, space: 1, costElixir: 35, unlockBarracks: 1 },
    giant: { name: 'Obr', icon: '🦍', hp: 320, dmg: 22, spd: 0.9, range: 25, space: 5, costElixir: 120, unlockBarracks: 2 },
    wizard: { name: 'Mág', icon: '🧙', hp: 70, dmg: 38, spd: 1.3, range: 120, space: 4, costElixir: 160, unlockBarracks: 3 }
};

const SPELL_DEFS = {
    heal: { name: 'Léčivý Kruh', icon: '💚', costElixir: 80, radius: 80, effectVal: 150 },
    lightning: { name: 'Blesk', icon: '⚡', costElixir: 120, radius: 50, effectVal: 180 }
};

// Item definitions generator
const ITEM_TYPES = ['weapon', 'armor', 'helmet', 'boots', 'amulet', 'offhand'];
const RARITY = [
    { name: 'Běžný', color: '#9ca3af', cls: 'common', mul: 1 },
    { name: 'Vzácný', color: '#3b82f6', cls: 'rare', mul: 1.5 },
    { name: 'Epický', color: '#a855f7', cls: 'epic', mul: 2.2 },
    { name: 'Legendární', color: '#f59e0b', cls: 'legendary', mul: 3.2 }
];

const ITEM_ICONS = {
    weapon: { warrior: '⚔️', ranger: '🏹', mage: '🪄' },
    armor: '🥋',
    helmet: '🪖',
    boots: '👢',
    amulet: '📿',
    offhand: { warrior: '🛡️', ranger: '🎯', mage: '📖' }
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    loadGame();
    setupEventListeners();
    setupAudioSynth();
    generateTavernQuests();
    generateShopItems();
    renderAll();
    startMainGameLoop();
    initRaidEngine();
});

// --- AUDIO SYNTHESIZER (Web Audio API - No external mp3 files needed) ---
let audioCtx = null;
function setupAudioSynth() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    } catch(e) {
        console.warn('Web Audio not supported');
    }
}

function playSound(type) {
    if (!G.soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, t); // B5
        osc.frequency.exponentialRampToValueAtTime(1318.51, t + 0.12); // E6
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
    } else if (type === 'magic') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.linearRampToValueAtTime(880, t + 0.25);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
    } else if (type === 'upgrade') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(329.63, t); // E4
        osc.frequency.setValueAtTime(440, t + 0.1); // A4
        osc.frequency.setValueAtTime(659.25, t + 0.2); // E5
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.35);
    } else if (type === 'fanfare') {
        // Heroic Victory Fanfare (Tadaaa!)
        const notes = [
            { f: 523.25, d: 0.12, del: 0 },      // C5
            { f: 523.25, d: 0.12, del: 0.12 },   // C5
            { f: 523.25, d: 0.12, del: 0.24 },   // C5
            { f: 659.25, d: 0.35, del: 0.36 },   // E5
            { f: 587.33, d: 0.15, del: 0.72 },   // D5
            { f: 783.99, d: 0.55, del: 0.88 }    // G5 (Long finish)
        ];
        notes.forEach(n => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.type = 'triangle';
            o.frequency.setValueAtTime(n.f, t + n.del);
            g.gain.setValueAtTime(0.22, t + n.del);
            g.gain.exponentialRampToValueAtTime(0.01, t + n.del + n.d);
            o.start(t + n.del);
            o.stop(t + n.del + n.d);
        });
    }
}

// --- SAVE & LOAD ---
function saveGame() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(G));
        showToast('💾 Hra byla úspěšně uložena!');
    } catch(e) {
        console.error(e);
    }
}

function loadGame() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            G = Object.assign({}, INITIAL_STATE, data);
            G.hero = Object.assign({}, INITIAL_STATE.hero, data.hero);
            G.res = Object.assign({}, INITIAL_STATE.res, data.res);
            G.village = Object.assign({}, INITIAL_STATE.village, data.village);
            G.army = Object.assign({}, INITIAL_STATE.army, data.army);
            G.spells = Object.assign({}, INITIAL_STATE.spells, data.spells);
            G.tavern = Object.assign({}, INITIAL_STATE.tavern, data.tavern);
            G.shop = Object.assign({}, INITIAL_STATE.shop, data.shop);
            G.dungeon = Object.assign({}, INITIAL_STATE.dungeon, data.dungeon);
        } else {
            // First time gift
            giveInitialStarterPack();
        }
    } catch(e) {
        console.warn('Failed to load save', e);
    }
}

function giveInitialStarterPack() {
    const starterSword = generateRandomItem('weapon', 1, 1);
    starterSword.name = "Rezavý Královský Meč";
    const starterArmor = generateRandomItem('armor', 1, 0);
    starterArmor.name = "Plátěná Halena";
    G.hero.equipment.weapon = starterSword;
    G.hero.equipment.armor = starterArmor;
}

function resetGame() {
    if (confirm('Opravdu si přeješ restartovat celou hru od začátku? Ztratíš veškerý postup!')) {
        localStorage.removeItem(STORAGE_KEY);
        G = JSON.parse(JSON.stringify(INITIAL_STATE));
        giveInitialStarterPack();
        generateTavernQuests();
        generateShopItems();
        renderAll();
        showToast('🔄 Hra byla resetována do výchozího stavu.');
    }
}

// --- MAIN LOOP (Passive Resource generation & Quest Timers) ---
function startMainGameLoop() {
    setInterval(() => {
        // Resource accumulation inside mines/collectors (Clash of Clans style)
        G.village.buildings.forEach(b => {
            if (b.type === 'goldmine') {
                b.uncollectedGold = Math.min((b.level * 500), (b.uncollectedGold || 0) + (b.level * 2));
            }
            if (b.type === 'elixircamp') {
                b.uncollectedElixir = Math.min((b.level * 400), (b.uncollectedElixir || 0) + (b.level * 1.5));
            }
        });

        // Quest timer progress
        if (G.tavern.activeQuest) {
            G.tavern.activeQuest.remainingSec -= 1;
            if (G.tavern.activeQuest.remainingSec <= 0) {
                completeActiveQuest();
            } else {
                updateQuestUI();
            }
        }

        updateResourceUI();
        renderVillageGridBadges();
    }, 1000);

    // Auto save every 30s
    setInterval(saveGame, 30000);
}

// --- RENDER FUNCTIONS ---
function renderAll() {
    updateResourceUI();
    renderHeroMiniCard();
    renderVillageGrid();
    renderBarracks();
    renderHeroTab();
    renderTavern();
    renderShop();
    renderForge();
    renderDungeonTab();
}

function updateResourceUI() {
    document.getElementById('res-gold').innerText = Math.floor(G.res.gold);
    document.getElementById('res-elixir').innerText = Math.floor(G.res.elixir);
    document.getElementById('res-gems').innerText = G.res.gems;
    document.getElementById('res-trophies').innerText = G.res.trophies;

    // Rates
    let goldRate = 0;
    let elixirRate = 0;
    G.village.buildings.forEach(b => {
        if (b.type === 'goldmine') goldRate += b.level * 120;
        if (b.type === 'elixircamp') elixirRate += b.level * 90;
    });
    document.getElementById('res-gold-rate').innerText = `+${goldRate}/min`;
    document.getElementById('res-elixir-rate').innerText = `+${elixirRate}/min`;

    // Army capacity
    const curArmy = getArmyCapacityUsed();
    const maxArmy = getArmyCapacityMax();
    document.getElementById('res-army').innerText = `${curArmy} / ${maxArmy}`;
    const barCap = document.getElementById('barracks-cap');
    if (barCap) barCap.innerText = `${curArmy} / ${maxArmy}`;

    // Mini card XP
    const xpPercent = Math.min(100, Math.floor((G.hero.xp / G.hero.xpNext) * 100));
    document.getElementById('mini-xp-bar').style.width = `${xpPercent}%`;
    document.getElementById('mini-xp-text').innerText = `${G.hero.xp} / ${G.hero.xpNext} XP`;
    document.getElementById('mini-lvl').innerText = G.hero.level;
    document.getElementById('th-level-display').innerText = G.village.townHallLevel;
}

function getArmyCapacityUsed() {
    let used = 0;
    for (let u in G.army) {
        used += G.army[u] * (TROOP_DEFS[u]?.space || 1);
    }
    return used;
}

function getArmyCapacityMax() {
    let max = 15;
    G.village.buildings.forEach(b => {
        if (b.type === 'camp') max += b.level * 10;
    });
    return max;
}

function renderHeroMiniCard() {
    document.getElementById('mini-name').innerText = G.hero.name;
    const classNames = { warrior: 'Válečník', ranger: 'Hraničář', mage: 'Čaroděj' };
    const classIcons = { warrior: '🛡️', ranger: '🏹', mage: '🔮' };
    document.getElementById('mini-class').innerText = classNames[G.hero.class] || 'Hrdina';
    document.getElementById('mini-avatar').innerText = classIcons[G.hero.class] || '🛡️';
    document.getElementById('hero-big-portrait').innerText = classIcons[G.hero.class] || '🛡️';
}

// --- VILLAGE & BUILDING INSPECTOR ---
function renderVillageGrid() {
    const grid = document.getElementById('village-grid');
    grid.innerHTML = '';

    G.village.buildings.forEach(b => {
        const card = document.createElement('div');
        card.className = `building-card ${b.type === 'empty' ? 'empty-plot' : ''} ${selectedBuildingId === b.id ? 'selected' : ''}`;
        
        let subText = b.type === 'empty' ? 'Klikni pro stavbu' : `Úroveň ${b.level}`;
        
        let badgeHtml = '';
        if (b.type === 'goldmine' && (b.uncollectedGold || 0) >= 10) {
            badgeHtml = `<div class="bldg-ready-badge" onclick="event.stopPropagation(); collectSingleBuilding(${b.id})">🪙 +${Math.floor(b.uncollectedGold)}</div>`;
        } else if (b.type === 'elixircamp' && (b.uncollectedElixir || 0) >= 10) {
            badgeHtml = `<div class="bldg-ready-badge" style="background:#ec4899" onclick="event.stopPropagation(); collectSingleBuilding(${b.id})">🧪 +${Math.floor(b.uncollectedElixir)}</div>`;
        }

        card.innerHTML = `
            ${badgeHtml}
            <div class="bldg-icon">${b.icon}</div>
            <div class="bldg-name">${b.name}</div>
            <div class="bldg-lvl">${subText}</div>
        `;

        card.addEventListener('click', () => {
            selectedBuildingId = b.id;
            renderVillageGrid();
            renderBuildingInspector(b);
        });

        grid.appendChild(card);
    });

    if (selectedBuildingId) {
        const current = G.village.buildings.find(x => x.id === selectedBuildingId);
        if (current) renderBuildingInspector(current);
    }
}

function renderVillageGridBadges() {
    // Rychlá aktualizace bublin nad doly bez překreslení celého gridu
    G.village.buildings.forEach(b => {
        if (b.type === 'goldmine' || b.type === 'elixircamp') {
            const hasG = (b.uncollectedGold || 0) >= 15;
            const hasE = (b.uncollectedElixir || 0) >= 15;
            if (hasG || hasE) {
                const badge = document.getElementById('badge-village');
                if (badge) badge.style.display = 'inline-block';
            }
        }
    });
}

window.collectSingleBuilding = function(id) {
    const b = G.village.buildings.find(x => x.id === id);
    if (!b) return;
    if (b.type === 'goldmine' && b.uncollectedGold > 0) {
        const amt = Math.floor(b.uncollectedGold);
        G.res.gold += amt;
        b.uncollectedGold = 0;
        playSound('coin');
        showToast(`🪙 Sebráno ${amt} zlata z dolu!`);
    } else if (b.type === 'elixircamp' && b.uncollectedElixir > 0) {
        const amt = Math.floor(b.uncollectedElixir);
        G.res.elixir += amt;
        b.uncollectedElixir = 0;
        playSound('coin');
        showToast(`🧪 Sebráno ${amt} elixíru ze sběrače!`);
    }
    renderVillageGrid();
    updateResourceUI();
};

window.collectAllResources = function() {
    let totG = 0;
    let totE = 0;
    G.village.buildings.forEach(b => {
        if (b.type === 'goldmine' && (b.uncollectedGold || 0) > 0) {
            totG += Math.floor(b.uncollectedGold);
            b.uncollectedGold = 0;
        }
        if (b.type === 'elixircamp' && (b.uncollectedElixir || 0) > 0) {
            totE += Math.floor(b.uncollectedElixir);
            b.uncollectedElixir = 0;
        }
    });

    if (totG > 0 || totE > 0) {
        G.res.gold += totG;
        G.res.elixir += totE;
        playSound('coin');
        showToast(`🌾 Sebráno ${totG} 🪙 a ${totE} 🧪 ze všech dolů a sběračů!`);
    } else {
        showToast('ℹ️ V dolech zatím není nasbírané žádné nové množství surovin.');
    }
    renderVillageGrid();
    updateResourceUI();
};

function renderBuildingInspector(b) {
    const insp = document.getElementById('building-inspector');

    if (b.type === 'empty') {
        insp.innerHTML = `
            <div class="inspector-details">
                <div class="inspector-header">
                    <span class="bldg-icon">🏗️</span>
                    <div>
                        <h3>Stavba Nové Budovy</h3>
                        <p style="font-size:12px; color:#9ca3af;">Vyber budovu k postavení na parcele</p>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                    <button class="btn btn-secondary" onclick="buildNewBuilding(${b.id}, 'goldmine')">⛏️ Zlatý Důl (150 🧪)</button>
                    <button class="btn btn-secondary" onclick="buildNewBuilding(${b.id}, 'elixircamp')">🔮 Sběrač Elixíru (150 🪙)</button>
                    <button class="btn btn-secondary" onclick="buildNewBuilding(${b.id}, 'camp')">🏕️ Vojenský Tábor (200 🧪)</button>
                    <button class="btn btn-secondary" onclick="buildNewBuilding(${b.id}, 'cannon')">💣 Obranné Dělo (250 🪙)</button>
                </div>
            </div>
        `;
        return;
    }

    const upgradeCost = Math.floor(100 * Math.pow(1.8, b.level));
    const costType = (b.type === 'goldmine' || b.type === 'camp') ? 'elixir' : 'gold';
    const costIcon = costType === 'gold' ? '🪙' : '🧪';

    let benefitDesc = "";
    if (b.type === 'townhall') benefitDesc = "Zvyšuje maximální limity všech budov a odemyká nová vylepšení.";
    else if (b.type === 'goldmine') benefitDesc = `Produkce: +${b.level * 120} zlata / min`;
    else if (b.type === 'elixircamp') benefitDesc = `Produkce: +${b.level * 90} elixíru / min`;
    else if (b.type === 'camp') benefitDesc = `Kapacita armády: +${b.level * 10} míst pro vojáky`;
    else if (b.type === 'barracks') benefitDesc = "Zvyšuje rychlost výcviku a odemyká nové typy vojska.";
    else if (b.type === 'cannon') benefitDesc = `Obranná palebná síla: ${b.level * 25} DPS v obraně`;

    insp.innerHTML = `
        <div class="inspector-details">
            <div class="inspector-header">
                <span class="bldg-icon">${b.icon}</span>
                <div>
                    <h3>${b.name} (Úr. ${b.level})</h3>
                    <span style="font-size:11px; color:#f59e0b;">Maximální úroveň: ${G.village.townHallLevel * 2}</span>
                </div>
            </div>
            <div class="inspector-stats">
                <div class="inspector-stat-row">
                    <span>Funkce:</span>
                    <strong>${benefitDesc}</strong>
                </div>
                <div class="inspector-stat-row">
                    <span>Náklady na úroveň ${b.level + 1}:</span>
                    <strong style="color:${costType === 'gold' ? '#fcd34d' : '#f472b6'};">${upgradeCost} ${costIcon}</strong>
                </div>
            </div>
            <button class="btn btn-gold btn-lg" style="margin-top:10px;" onclick="upgradeBuilding(${b.id})">
                🔨 Vylepšit na Úroveň ${b.level + 1}
            </button>
        </div>
    `;
}

window.buildNewBuilding = function(slotId, type) {
    const costs = { goldmine: { elixir: 150 }, elixircamp: { gold: 150 }, camp: { elixir: 200 }, cannon: { gold: 250 } };
    const cost = costs[type];
    if (cost.gold && G.res.gold < cost.gold) { showToast('❌ Nedostatek zlata pro stavbu!'); return; }
    if (cost.elixir && G.res.elixir < cost.elixir) { showToast('❌ Nedostatek elixíru pro stavbu!'); return; }

    if (cost.gold) G.res.gold -= cost.gold;
    if (cost.elixir) G.res.elixir -= cost.elixir;

    const b = G.village.buildings.find(x => x.id === slotId);
    if (!b) return;

    const typeMeta = {
        goldmine: { name: 'Zlatý Důl', icon: '⛏️' },
        elixircamp: { name: 'Sběrač Elixíru', icon: '🔮' },
        camp: { name: 'Vojenský Tábor', icon: '🏕️' },
        cannon: { name: 'Obranné Dělo', icon: '💣' }
    };

    b.type = type;
    b.level = 1;
    b.name = typeMeta[type].name;
    b.icon = typeMeta[type].icon;

    playSound('upgrade');
    showToast(`🏗️ Postavena budova ${b.name}!`);
    renderVillageGrid();
    renderBarracks();
    updateResourceUI();
};

window.upgradeBuilding = function(id) {
    const b = G.village.buildings.find(x => x.id === id);
    if (!b) return;

    if (b.type !== 'townhall' && b.level >= G.village.townHallLevel * 2) {
        showToast('⚠️ Nejprve musíš vylepšit svou Radnici!');
        return;
    }

    const cost = Math.floor(100 * Math.pow(1.8, b.level));
    const costType = (b.type === 'goldmine' || b.type === 'camp') ? 'elixir' : 'gold';

    if (costType === 'gold' && G.res.gold < cost) {
        showToast('❌ Nedostatek zlata!');
        return;
    }
    if (costType === 'elixir' && G.res.elixir < cost) {
        showToast('❌ Nedostatek elixíru!');
        return;
    }

    if (costType === 'gold') G.res.gold -= cost;
    else G.res.elixir -= cost;

    b.level += 1;
    if (b.type === 'townhall') {
        G.village.townHallLevel = b.level;
    }

    playSound('upgrade');
    showToast(`✨ ${b.name} vylepšeno na úroveň ${b.level}!`);
    renderVillageGrid();
    renderBarracks();
    updateResourceUI();
};

// --- BARRACKS & SPELL TRAINING ---
function renderBarracks() {
    const grid = document.getElementById('barracks-grid');
    grid.innerHTML = '';

    const barracksBldg = G.village.buildings.find(b => b.type === 'barracks');
    const barracksLvl = barracksBldg ? barracksBldg.level : 1;

    for (let uKey in TROOP_DEFS) {
        const u = TROOP_DEFS[uKey];
        const isUnlocked = barracksLvl >= u.unlockBarracks;
        const count = G.army[uKey] || 0;

        const card = document.createElement('div');
        card.className = 'troop-card';
        card.innerHTML = `
            <div>
                <div class="troop-top">
                    <div class="troop-avatar">${u.icon}</div>
                    <div>
                        <h4>${u.name}</h4>
                        <div style="font-size:11px; color:#9ca3af;">Místo: ${u.space} | Cena: ${u.costElixir} 🧪</div>
                    </div>
                </div>
                <div class="troop-stats">
                    <span>❤️ Životy: ${u.hp}</span>
                    <span>⚔️ Útok: ${u.dmg} / rána</span>
                    <span>🎯 Dosah: ${u.range > 50 ? 'Dálkový (' + u.range + ')' : 'Zblízka'}</span>
                </div>
            </div>
            <div>
                <div class="troop-count">Ve výzbroji: ${count} ks</div>
                ${isUnlocked ? 
                    `<button class="btn btn-secondary btn-sm" style="width:100%" onclick="trainTroop('${uKey}')">➕ Vycvičit (+1)</button>` :
                    `<div style="font-size:11px; color:#ef4444; font-weight:bold;">Vyžaduje Kasárna úr. ${u.unlockBarracks}</div>`
                }
            </div>
        `;
        grid.appendChild(card);
    }

    // Spells
    const spellsGrid = document.getElementById('spells-grid');
    spellsGrid.innerHTML = '';
    for (let sKey in SPELL_DEFS) {
        const s = SPELL_DEFS[sKey];
        const count = G.spells[sKey] || 0;
        const card = document.createElement('div');
        card.className = 'spell-card';
        card.innerHTML = `
            <div class="troop-top">
                <div class="troop-avatar">${s.icon}</div>
                <div>
                    <h4>${s.name}</h4>
                    <div style="font-size:11px; color:#ec4899;">Cena: ${s.costElixir} 🧪</div>
                </div>
            </div>
            <div class="troop-stats">
                <span>Rádius zásahu: ${s.radius}px</span>
                <span>Efekt: ${s.effectVal} bodů</span>
            </div>
            <div>
                <div class="troop-count">Připraveno: ${count} ks</div>
                <button class="btn btn-purple btn-sm" style="width:100%" onclick="brewSpell('${sKey}')">⚗️ Připravit kouzlo</button>
            </div>
        `;
        spellsGrid.appendChild(card);
    }
}

window.trainTroop = function(troopKey) {
    const u = TROOP_DEFS[troopKey];
    if (!u) return;

    if (getArmyCapacityUsed() + u.space > getArmyCapacityMax()) {
        showToast('⚠️ Armádní tábory jsou plné! Vylepši Vojenský Tábor.');
        return;
    }
    if (G.res.elixir < u.costElixir) {
        showToast('❌ Nedostatek elixíru pro výcvik jednotky!');
        return;
    }

    G.res.elixir -= u.costElixir;
    G.army[troopKey] = (G.army[troopKey] || 0) + 1;
    playSound('coin');
    renderBarracks();
    updateResourceUI();
};

window.brewSpell = function(spellKey) {
    const s = SPELL_DEFS[spellKey];
    if (G.res.elixir < s.costElixir) {
        showToast('❌ Nedostatek elixíru na uvaření kouzla!');
        return;
    }
    G.res.elixir -= s.costElixir;
    G.spells[spellKey] = (G.spells[spellKey] || 0) + 1;
    playSound('magic');
    showToast(`✨ Kouzlo ${s.name} bylo připraveno!`);
    renderBarracks();
    updateResourceUI();
};

// --- HERO TAB, STATS & INVENTORY ---
function renderHeroTab() {
    renderHeroStats();
    renderEquipmentPaperdoll();
    renderInventorySlots();
}

function renderHeroStats() {
    const s = G.hero.stats;
    const eqStats = calculateEquipmentBonusStats();

    const totalStr = s.str + eqStats.str;
    const totalDex = s.dex + eqStats.dex;
    const totalInt = s.int + eqStats.int;
    const totalCon = s.con + eqStats.con;
    const totalLck = s.lck + eqStats.lck;

    document.getElementById('stat-str').innerText = `${totalStr} ${eqStats.str ? '(+' + eqStats.str + ')' : ''}`;
    document.getElementById('stat-dex').innerText = `${totalDex} ${eqStats.dex ? '(+' + eqStats.dex + ')' : ''}`;
    document.getElementById('stat-int').innerText = `${totalInt} ${eqStats.int ? '(+' + eqStats.int + ')' : ''}`;
    document.getElementById('stat-con').innerText = `${totalCon} ${eqStats.con ? '(+' + eqStats.con + ')' : ''}`;
    document.getElementById('stat-lck').innerText = `${totalLck} ${eqStats.lck ? '(+' + eqStats.lck + ')' : ''}`;

    // Costs to upgrade
    const costStat = stat => Math.floor(15 * Math.pow(1.15, G.hero.stats[stat]));
    document.getElementById('cost-str').innerText = costStat('str');
    document.getElementById('cost-dex').innerText = costStat('dex');
    document.getElementById('cost-int').innerText = costStat('int');
    document.getElementById('cost-con').innerText = costStat('con');
    document.getElementById('cost-lck').innerText = costStat('lck');

    // Secondary descriptions
    const hp = calculateHeroMaxHP();
    document.getElementById('stat-con-desc').innerText = `(Životy: ${hp} HP)`;
    const critRate = Math.min(50, Math.floor((totalLck * 2) / (G.hero.level + 2)));
    document.getElementById('stat-lck-desc').innerText = `(Kritický zásah: ${critRate}%)`;

    // Power score
    const power = Math.floor(totalStr * 1.5 + totalDex * 1.5 + totalInt * 1.5 + totalCon * 2 + totalLck);
    document.getElementById('hero-power-val').innerText = power;
}

function calculateEquipmentBonusStats() {
    let bonus = { str: 0, dex: 0, int: 0, con: 0, lck: 0 };
    for (let slot in G.hero.equipment) {
        const item = G.hero.equipment[slot];
        if (item && item.stats) {
            for (let st in item.stats) {
                bonus[st] = (bonus[st] || 0) + item.stats[st];
            }
        }
    }
    return bonus;
}

function calculateHeroMaxHP() {
    const s = G.hero.stats.con + (calculateEquipmentBonusStats().con || 0);
    const mul = G.hero.class === 'warrior' ? 25 : (G.hero.class === 'ranger' ? 20 : 15);
    return s * mul + G.hero.level * 30;
}

function renderEquipmentPaperdoll() {
    const slots = ['helmet', 'amulet', 'weapon', 'armor', 'offhand', 'boots'];
    slots.forEach(slotKey => {
        const el = document.querySelector(`.equip-slot[data-slot="${slotKey}"]`);
        if (!el) return;
        const item = G.hero.equipment[slotKey];
        el.className = `equip-slot ${item ? 'has-item ' + item.rarityCls : ''}`;
        el.innerHTML = item ? item.icon : '';
        el.onclick = () => {
            if (item) inspectItem(item, 'equipped', slotKey);
        };
    });
}

function renderInventorySlots() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    const invCount = document.getElementById('inv-count');
    invCount.innerText = G.hero.inventory.length;

    for (let i = 0; i < 16; i++) {
        const item = G.hero.inventory[i];
        const slotEl = document.createElement('div');
        slotEl.className = `inv-slot ${item ? item.rarityCls : 'empty'} ${selectedInvIndex === i ? 'selected' : ''}`;
        slotEl.innerHTML = item ? item.icon : '';
        if (item) {
            slotEl.addEventListener('click', () => {
                selectedInvIndex = i;
                renderInventorySlots();
                inspectItem(item, 'inventory', i);
            });
        }
        grid.appendChild(slotEl);
    }
}

function inspectItem(item, location, indexOrSlot) {
    const insp = document.getElementById('item-inspector');
    let statText = [];
    if (item.stats) {
        if (item.stats.str) statText.push(`+${item.stats.str} Síla`);
        if (item.stats.dex) statText.push(`+${item.stats.dex} Obratnost`);
        if (item.stats.int) statText.push(`+${item.stats.int} Inteligence`);
        if (item.stats.con) statText.push(`+${item.stats.con} Výdrž`);
        if (item.stats.lck) statText.push(`+${item.stats.lck} Štěstí`);
    }

    let actions = "";
    if (location === 'inventory') {
        actions = `
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="btn btn-gold btn-sm" onclick="equipItemFromInv(${indexOrSlot})">🛡️ Nasadit</button>
                <button class="btn btn-secondary btn-sm" onclick="sellItemFromInv(${indexOrSlot})">💰 Prodat (${item.value} 🪙)</button>
            </div>
        `;
    } else {
        actions = `
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="btn btn-secondary btn-sm" onclick="unequipItem('${indexOrSlot}')">🎒 Sundat do batohu</button>
            </div>
        `;
    }

    insp.innerHTML = `
        <div style="display:flex; align-items:center; gap:14px;">
            <div style="font-size:36px;">${item.icon}</div>
            <div>
                <h4 style="color:${item.rarityColor};">${item.name}</h4>
                <div style="font-size:11px; color:#9ca3af;">${item.rarityName} ${item.type} • Hodnota: ${item.value} 🪙</div>
                <div style="font-size:12px; color:#60a5fa; margin-top:4px;">${statText.join(', ') || 'Bez bonusů'}</div>
            </div>
        </div>
        ${actions}
    `;
}

window.equipItemFromInv = function(invIndex) {
    const item = G.hero.inventory[invIndex];
    if (!item) return;

    const slot = item.slot;
    const oldItem = G.hero.equipment[slot];

    G.hero.equipment[slot] = item;
    G.hero.inventory.splice(invIndex, 1);

    if (oldItem) {
        G.hero.inventory.push(oldItem);
    }

    playSound('upgrade');
    selectedInvIndex = null;
    renderHeroTab();
    renderHeroMiniCard();
};

window.unequipItem = function(slot) {
    const item = G.hero.equipment[slot];
    if (!item) return;
    if (G.hero.inventory.length >= 16) {
        showToast('⚠️ Batoh je plný, nelze sundat předmět!');
        return;
    }
    G.hero.equipment[slot] = null;
    G.hero.inventory.push(item);
    renderHeroTab();
};

window.sellItemFromInv = function(invIndex) {
    const item = G.hero.inventory[invIndex];
    if (!item) return;
    G.res.gold += item.value;
    G.hero.inventory.splice(invIndex, 1);
    playSound('coin');
    showToast(`💰 Předmět prodán za ${item.value} zlata!`);
    selectedInvIndex = null;
    renderHeroTab();
    updateResourceUI();
};

function generateRandomItem(slotHint, level, rarityForce) {
    const slot = slotHint || ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    const rarityIdx = rarityForce !== undefined ? rarityForce : Math.floor(Math.random() * (Math.random() < 0.2 ? 4 : 2));
    const rarity = RARITY[rarityIdx];

    let icon = '🗡️';
    if (slot === 'weapon') icon = ITEM_ICONS.weapon[G.hero.class] || '⚔️';
    else if (slot === 'offhand') icon = ITEM_ICONS.offhand[G.hero.class] || '🛡️';
    else icon = ITEM_ICONS[slot] || '📿';

    const names = {
        weapon: ['Meč Hromu', 'Dýka Zákeřnosti', 'Hůl Ohně', 'Sekera Běsů', 'Luk Lovce'],
        armor: ['Brnění Šampiona', 'Kožená Vesta', 'Róba Elementů', 'Kroužková Košile'],
        helmet: ['Železná Přílba', 'Kápě Stínů', 'Královská Korunka', 'Těžká Helma'],
        boots: ['Rychlé Boty', 'Válečné Okovy', 'Šeptavé Šlápoty', 'Střevíce Poutníka'],
        amulet: ['Talisman Osudu', 'Medailon Síly', 'Rubínový Přívěsek', 'Sluneční Kámen'],
        offhand: ['Erbovní Pavéza', 'Runový Štít', 'Kniha Kouzel', 'Lovecký Toulec']
    };

    const chosenName = names[slot][Math.floor(Math.random() * names[slot].length)];
    const baseStat = Math.floor((level * 2 + 3) * rarity.mul);

    let stats = {};
    if (G.hero.class === 'warrior') {
        stats.str = baseStat;
        if (rarityIdx >= 1) stats.con = Math.floor(baseStat * 0.7);
        if (rarityIdx >= 2) stats.lck = Math.floor(baseStat * 0.5);
    } else if (G.hero.class === 'ranger') {
        stats.dex = baseStat;
        if (rarityIdx >= 1) stats.con = Math.floor(baseStat * 0.7);
        if (rarityIdx >= 2) stats.lck = Math.floor(baseStat * 0.5);
    } else {
        stats.int = baseStat;
        if (rarityIdx >= 1) stats.con = Math.floor(baseStat * 0.7);
        if (rarityIdx >= 2) stats.lck = Math.floor(baseStat * 0.5);
    }

    return {
        name: `${rarity.name} ${chosenName}`,
        slot: slot,
        rarityName: rarity.name,
        rarityCls: rarity.cls,
        rarityColor: rarity.color,
        icon: icon,
        stats: stats,
        value: Math.floor(level * 35 * rarity.mul)
    };
}

// --- HOSPODA / TAVERN QUESTS (S&F Style) ---
function generateTavernQuests() {
    const titles = [
        { title: "Záchrana ztraceného kupce", story: "Bandité přepadli kupeckou karavanu na kraji Královského hvozdu.", icon: "🏹", dur: 10, stamina: 10 },
        { title: "Lov na jeskynního trolla", story: "V opuštěných dolech straší obrovitý troll. Vesničané mají strach jít těžit.", icon: "🧌", dur: 20, stamina: 20 },
        { title: "Tajemství staré krypty", story: "Kněz v klášteře slyší podivné rány z podzemní hrobky dávného krále.", icon: "💀", dur: 30, stamina: 30 }
    ];

    G.tavern.availableQuests = titles.map((t, idx) => {
        const goldReward = Math.floor((G.hero.level * 40 + 20) * (idx + 1));
        const xpReward = Math.floor((G.hero.level * 30 + 15) * (idx + 1));
        const hasItem = Math.random() < 0.35;
        const gemReward = Math.random() < 0.25 ? 1 : 0; // 25% šance na houbičku z questu!
        return {
            id: idx,
            title: t.title,
            story: t.story,
            icon: t.icon,
            durationSec: t.dur,
            staminaCost: t.stamina,
            rewardGold: goldReward,
            rewardXp: xpReward,
            rewardGems: gemReward,
            rewardItem: hasItem ? generateRandomItem(null, G.hero.level) : null
        };
    });
}

function renderTavern() {
    document.getElementById('tavern-stamina').innerText = `${Math.floor(G.tavern.stamina)} / ${G.tavern.maxStamina}`;
    const selView = document.getElementById('tavern-selection-view');
    const actView = document.getElementById('tavern-active-view');

    if (G.tavern.activeQuest) {
        selView.style.display = 'none';
        actView.style.display = 'block';
        updateQuestUI();
    } else {
        selView.style.display = 'grid';
        actView.style.display = 'none';
        selView.innerHTML = '';

        G.tavern.availableQuests.forEach(q => {
            const card = document.createElement('div');
            card.className = 'quest-card';
            card.innerHTML = `
                <div>
                    <div class="quest-top">
                        <div class="quest-card-icon">${q.icon}</div>
                        <h4 class="quest-title">${q.title}</h4>
                        <p class="quest-desc">${q.story}</p>
                    </div>
                    <div class="quest-rewards">
                        <div><span>Délka výpravy:</span> <strong>⏱️ ${q.durationSec}s</strong></div>
                        <div><span>Spotřeba touhy:</span> <strong>🍻 ${q.staminaCost}</strong></div>
                        <div><span>Odměna zlato:</span> <strong style="color:#fcd34d">🪙 ${q.rewardGold}</strong></div>
                        <div><span>Odměna zkušenosti:</span> <strong style="color:#60a5fa">✨ ${q.rewardXp} XP</strong></div>
                        ${q.rewardGems ? `<div><span>Vzácný nález:</span> <strong style="color:#10b981">🍄 +${q.rewardGems} Houbička</strong></div>` : ''}
                        ${q.rewardItem ? `<div><span>Speciální lup:</span> <strong style="color:${q.rewardItem.rarityColor}">${q.rewardItem.name}</strong></div>` : ''}
                    </div>
                </div>
                <button class="btn btn-gold btn-lg" style="width:100%" onclick="startQuest(${q.id})">⚔️ Vyrazit na výpravu</button>
            `;
            selView.appendChild(card);
        });
    }
}

window.startQuest = function(qId) {
    const q = G.tavern.availableQuests.find(x => x.id === qId);
    if (!q) return;

    if (G.tavern.stamina < q.staminaCost) {
        showToast('🍺 Nemáš dostatek Touhy po dobrodružství! Dej si pivo za houbičku.');
        return;
    }

    G.tavern.stamina -= q.staminaCost;
    G.tavern.activeQuest = {
        ...q,
        remainingSec: q.durationSec
    };

    playSound('upgrade');
    renderTavern();
};

function updateQuestUI() {
    const q = G.tavern.activeQuest;
    if (!q) return;

    document.getElementById('active-quest-icon').innerText = q.icon;
    document.getElementById('active-quest-title').innerText = q.title;
    document.getElementById('active-quest-story').innerText = q.story;
    document.getElementById('active-quest-timer').innerText = `Zbývá: ${q.remainingSec}s`;

    const progress = Math.max(0, Math.min(100, ((q.durationSec - q.remainingSec) / q.durationSec) * 100));
    document.getElementById('active-quest-fill').style.width = `${progress}%`;
}

function completeActiveQuest() {
    const q = G.tavern.activeQuest;
    if (!q) return;

    G.res.gold += q.rewardGold;
    addHeroXP(q.rewardXp);
    if (q.rewardGems) {
        G.res.gems += q.rewardGems;
    }

    let toastMsg = `🎉 Úkol splněn! Získáno ${q.rewardGold} 🪙 a ${q.rewardXp} XP!`;
    if (q.rewardGems) {
        toastMsg += ` 🍄 +${q.rewardGems} Houbička nalezena!`;
    }
    if (q.rewardItem) {
        if (G.hero.inventory.length < 16) {
            G.hero.inventory.push(q.rewardItem);
            toastMsg += ` Nalezen předmět: ${q.rewardItem.name}!`;
        } else {
            G.res.gold += q.rewardItem.value;
            toastMsg += ` Batoh byl plný, předmět byl automaticky zpeněžen za ${q.rewardItem.value} 🪙!`;
        }
    }

    playSound('coin');
    showToast(toastMsg);

    G.tavern.activeQuest = null;
    generateTavernQuests();
    renderTavern();
    renderHeroTab();
    updateResourceUI();
}

function addHeroXP(amount) {
    G.hero.xp += amount;
    while (G.hero.xp >= G.hero.xpNext) {
        G.hero.xp -= G.hero.xpNext;
        G.hero.level += 1;
        G.hero.xpNext = Math.floor(G.hero.xpNext * 1.35);
        showToast(`⭐ ÚROVEŇ ZVÝŠENA! Hrdina postoupil na Úroveň ${G.hero.level}!`);
        playSound('upgrade');
    }
}

// --- FORGE SYSTEM (Královská Kovárna) ---
let forgeSelectedInvIndex = null;

function renderForge() {
    const grid = document.getElementById('forge-inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    G.hero.inventory.forEach((item, idx) => {
        const slotEl = document.createElement('div');
        slotEl.className = `inv-slot ${item.rarityCls} ${forgeSelectedInvIndex === idx ? 'selected' : ''}`;
        slotEl.innerHTML = item.icon;
        slotEl.addEventListener('click', () => {
            forgeSelectedInvIndex = idx;
            renderForge();
            previewForgeSmelt(item);
        });
        grid.appendChild(slotEl);
    });

    // Button Craft
    const btnCraft = document.getElementById('btn-craft-artifact');
    if (btnCraft) {
        btnCraft.onclick = craftEpicArtifact;
    }
}

function previewForgeSmelt(item) {
    const slot = document.getElementById('forge-smelt-slot');
    const prev = document.getElementById('forge-smelt-preview');
    slot.innerHTML = `
        <div style="font-size:32px;">${item.icon}</div>
        <div style="margin-left:12px; text-align:left;">
            <strong style="color:${item.rarityColor};">${item.name}</strong>
            <div style="font-size:11px; color:#9ca3af;">${item.rarityName} ${item.type}</div>
        </div>
        <button class="btn btn-danger btn-sm" style="margin-left:auto;" onclick="smeltItem(${forgeSelectedInvIndex})">🔥 Roztavit</button>
    `;
    prev.innerText = `Výnos z tavení: +${Math.floor(item.value * 1.5)} Zlata a šance na 1 Houbičku 🍄!`;
}

window.smeltItem = function(idx) {
    const item = G.hero.inventory[idx];
    if (!item) return;

    const goldGained = Math.floor(item.value * 1.5);
    G.res.gold += goldGained;
    
    let gotGem = false;
    if (item.rarityCls === 'epic' || item.rarityCls === 'legendary' || Math.random() < 0.2) {
        G.res.gems += 1;
        gotGem = true;
    }

    G.hero.inventory.splice(idx, 1);
    forgeSelectedInvIndex = null;

    playSound('magic');
    showToast(`🔥 Předmět ${item.name} roztaven! Získáno +${goldGained} 🪙 ${gotGem ? 'a +1 🍄!' : ''}`);

    document.getElementById('forge-smelt-slot').innerHTML = `<span>Klikni na předmět v batohu níže pro roztavení</span>`;
    document.getElementById('forge-smelt-preview').innerText = '';

    renderForge();
    renderHeroTab();
    updateResourceUI();
};

function craftEpicArtifact() {
    if (G.res.gold < 500 || G.res.elixir < 300) {
        showToast('❌ Nedostatek surovin pro kování (potřebuješ 500 🪙 a 300 🧪)!');
        return;
    }
    if (G.hero.inventory.length >= 16) {
        showToast('⚠️ Batoh je plný, uvolni místo!');
        return;
    }

    G.res.gold -= 500;
    G.res.elixir -= 300;

    // Craft guaranteed Epic or Legendary item scaled to hero level
    const isLegendary = Math.random() < 0.25;
    const craftedItem = generateRandomItem(null, G.hero.level + 1, isLegendary ? 3 : 2);
    craftedItem.name = `Kovaný ${craftedItem.name}`;
    G.hero.inventory.push(craftedItem);

    playSound('fanfare');
    showToast(`⚡ ÚSPĚCH! Ukován mistrovský artefakt: ${craftedItem.name}!`);

    renderForge();
    renderHeroTab();
    updateResourceUI();
}
function generateShopItems() {
    G.shop.items = [];
    for (let i = 0; i < 6; i++) {
        G.shop.items.push(generateRandomItem(null, G.hero.level));
    }
}

function renderShop() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';

    G.shop.items.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'shop-item-card';

        let statText = [];
        if (item.stats) {
            for (let s in item.stats) statText.push(`+${item.stats[s]} ${s.toUpperCase()}`);
        }

        card.innerHTML = `
            <div class="shop-item-icon">${item.icon}</div>
            <div class="shop-item-name" style="color:${item.rarityColor};">${item.name}</div>
            <div class="shop-item-stats">${statText.join(', ') || 'Základní výbava'}</div>
            <div class="shop-item-cost">Cena: ${item.value * 2} 🪙</div>
            <button class="btn btn-gold btn-sm" style="width:100%" onclick="buyShopItem(${idx})">Koupit</button>
        `;
        grid.appendChild(card);
    });
}

window.buyShopItem = function(idx) {
    const item = G.shop.items[idx];
    if (!item) return;

    const cost = item.value * 2;
    if (G.res.gold < cost) {
        showToast('❌ Nemáš dostatek zlata na koupi!');
        return;
    }
    if (G.hero.inventory.length >= 16) {
        showToast('⚠️ Batoh je plný!');
        return;
    }

    G.res.gold -= cost;
    G.hero.inventory.push(item);
    G.shop.items.splice(idx, 1);

    playSound('coin');
    showToast(`🛒 Zakoupeno: ${item.name}!`);
    renderShop();
    renderHeroTab();
    updateResourceUI();
};

// --- DUNGEON & ARENA COMBAT ---
const DUNGEON_BOSSES = [
    { name: "Skřetí Náčelník Grimgor", icon: "👹", hp: 450, dmg: 22, rewardGold: 300, rewardXp: 200 },
    { name: "Nemrtvý Rytíř z Katakomb", icon: "💀", hp: 650, dmg: 32, rewardGold: 600, rewardXp: 400 },
    { name: "Ohnivý Démon z Hlubin", icon: "🔥", hp: 950, dmg: 45, rewardGold: 1000, rewardXp: 750 },
    { name: "Dračí Král Ignis", icon: "🐉", hp: 1600, dmg: 65, rewardGold: 2500, rewardXp: 1800 }
];

function renderDungeonTab() {
    const floor = G.dungeon.floor;
    const boss = DUNGEON_BOSSES[Math.min(floor - 1, DUNGEON_BOSSES.length - 1)];

    document.getElementById('dungeon-floor').innerText = floor;
    document.getElementById('dungeon-boss-icon').innerText = boss.icon;
    document.getElementById('dungeon-boss-name').innerText = boss.name;
    document.getElementById('dungeon-boss-stats').innerText = `HP: ${boss.hp} • Útok: ~${boss.dmg}`;

    // Arena Rival (dynamic)
    const rivalName = "Rytíř " + ["Lancelot", "Bivoj", "Percival", "Galahad"][Math.floor(Math.random() * 4)];
    document.getElementById('arena-rival-name').innerText = rivalName;
    const rivalHP = Math.floor(calculateHeroMaxHP() * (0.8 + Math.random() * 0.4));
    document.getElementById('arena-rival-stats').innerText = `HP: ${rivalHP} • Hrdost šampiona`;
}

// TURN COMBAT ENGINE (Shakes & Fidget Style)
let combatState = null;
let combatInterval = null;

function startTurnCombat(enemy) {
    const heroMaxHP = calculateHeroMaxHP();
    const enemyMaxHP = enemy.hp;

    combatState = {
        hero: {
            name: G.hero.name,
            avatar: document.getElementById('hero-big-portrait').innerText,
            maxHp: heroMaxHP,
            hp: heroMaxHP,
            stats: G.hero.stats,
            eq: calculateEquipmentBonusStats()
        },
        enemy: {
            name: enemy.name,
            avatar: enemy.icon,
            maxHp: enemyMaxHP,
            hp: enemyMaxHP,
            dmg: enemy.dmg,
            rewardGold: enemy.rewardGold,
            rewardXp: enemy.rewardXp,
            isDungeon: enemy.isDungeon
        },
        turn: 'hero',
        logs: [],
        ended: false
    };

    document.getElementById('combat-modal').style.display = 'flex';
    document.getElementById('combat-title').innerText = `⚔️ ${G.hero.name} vs ${enemy.name}`;
    document.getElementById('combat-hero-avatar').innerText = combatState.hero.avatar;
    document.getElementById('combat-hero-name').innerText = G.hero.name;
    document.getElementById('combat-enemy-avatar').innerText = enemy.icon;
    document.getElementById('combat-enemy-name').innerText = enemy.name;
    document.getElementById('btn-combat-skip').style.display = 'inline-flex';
    document.getElementById('btn-combat-close').style.display = 'none';

    document.getElementById('combat-log').innerHTML = '';
    updateCombatUI();

    combatInterval = setInterval(executeCombatRound, 900);
}

function executeCombatRound() {
    if (!combatState || combatState.ended) return;

    const h = combatState.hero;
    const e = combatState.enemy;

    if (combatState.turn === 'hero') {
        // Hero attacks
        const mainStat = G.hero.class === 'warrior' ? (h.stats.str + h.eq.str) : (G.hero.class === 'ranger' ? (h.stats.dex + h.eq.dex) : (h.stats.int + h.eq.int));
        const isCrit = Math.random() < Math.min(0.5, ((h.stats.lck + h.eq.lck) * 2) / (G.hero.level + 2) / 100);
        let dmg = Math.floor((mainStat * 2 + Math.random() * 10) * (isCrit ? 2.0 : 1.0));

        e.hp = Math.max(0, e.hp - dmg);
        showFloatingDamage('enemy', dmg, isCrit);
        logCombat(`⚔️ <strong>${h.name}</strong> zasadil úder za <span style="color:#f87171">${dmg}</span> poškození! ${isCrit ? '💥 <strong>KRITICKÝ ZÁSAH!</strong>' : ''}`, 'hero');
        playSound('hit');

        if (e.hp <= 0) {
            endCombat(true);
            return;
        }
        combatState.turn = 'enemy';
    } else {
        // Enemy attacks
        let dmg = Math.floor(e.dmg * (0.8 + Math.random() * 0.4));
        h.hp = Math.max(0, h.hp - dmg);
        showFloatingDamage('hero', dmg, false);
        logCombat(`👹 <strong>${e.name}</strong> zaútočil a způsobil <span style="color:#f87171">${dmg}</span> zranění.`, 'enemy');
        playSound('hit');

        if (h.hp <= 0) {
            endCombat(false);
            return;
        }
        combatState.turn = 'hero';
    }

    updateCombatUI();
}

function showFloatingDamage(target, dmg, isCrit) {
    const el = document.getElementById(`dmg-${target}`);
    if (!el) return;
    el.innerText = `-${dmg}${isCrit ? '!' : ''}`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 450);
}

function updateCombatUI() {
    if (!combatState) return;
    const h = combatState.hero;
    const e = combatState.enemy;

    const heroHpPct = (h.hp / h.maxHp) * 100;
    const enemyHpPct = (e.hp / e.maxHp) * 100;

    document.getElementById('combat-hero-hp-bar').style.width = `${heroHpPct}%`;
    document.getElementById('combat-hero-hp-text').innerText = `${Math.floor(h.hp)} / ${h.maxHp}`;

    document.getElementById('combat-enemy-hp-bar').style.width = `${enemyHpPct}%`;
    document.getElementById('combat-enemy-hp-text').innerText = `${Math.floor(e.hp)} / ${e.maxHp}`;
}

function logCombat(html, cls) {
    const logBox = document.getElementById('combat-log');
    const p = document.createElement('div');
    p.className = `combat-log-line ${cls}`;
    p.innerHTML = html;
    logBox.appendChild(p);
    logBox.scrollTop = logBox.scrollHeight;
}

function endCombat(won) {
    combatState.ended = true;
    clearInterval(combatInterval);
    updateCombatUI();

    document.getElementById('btn-combat-skip').style.display = 'none';
    document.getElementById('btn-combat-close').style.display = 'inline-flex';

    if (won) {
        logCombat(`🏆 <strong>VÍTĚZSTVÍ! Nepřítel padl k zemi!</strong>`, 'crit');
        playSound('fanfare');

        const gEarned = combatState.enemy.rewardGold;
        const xpEarned = combatState.enemy.rewardXp;
        G.res.gold += gEarned;
        addHeroXP(xpEarned);

        if (combatState.enemy.isDungeon) {
            G.dungeon.floor += 1;
            // Guarantee Epic Drop from dungeon boss
            const epicItem = generateRandomItem(null, G.hero.level + 2, 2);
            if (G.hero.inventory.length < 16) {
                G.hero.inventory.push(epicItem);
                logCombat(`🎁 Nalezen vzácný lup z podzemí: <strong style="color:${epicItem.rarityColor}">${epicItem.name}</strong>!`, 'crit');
            }
        } else {
            // Arena trophies
            G.res.trophies += 25;
            logCombat(`🏆 Získáno +25 Trofejí do žebříčku slávy!`, 'crit');
        }

        updateResourceUI();
        renderHeroTab();
        renderDungeonTab();
    } else {
        logCombat(`💀 <strong>PORÁŽKA! Tvůj hrdina byl omráčen.</strong>`, 'enemy');
    }
}

// --- TAB 3: REAL-TIME TACTICAL RAID CANVAS ENGINE (Clash of Clans Style) ---
let raidCtx = null;
let raidCanvas = null;
let raidLoopId = null;
let raidState = null;

function initRaidEngine() {
    raidCanvas = document.getElementById('raid-canvas');
    if (!raidCanvas) return;
    raidCtx = raidCanvas.getContext('2d');

    raidCanvas.addEventListener('click', onRaidCanvasClick);
    document.getElementById('btn-next-target').addEventListener('click', generateRaidBase);
    document.getElementById('btn-retreat').addEventListener('click', endRaidBattle);

    generateRaidBase();
}

function generateRaidBase() {
    if (raidLoopId) cancelAnimationFrame(raidLoopId);

    const baseBuildings = [
        { type: 'th', name: 'Hlavní Pevnost', x: 430, y: 220, w: 60, h: 60, hp: 600, maxHp: 600, icon: '🏰' },
        { type: 'cannon', name: 'Obranná Věž', x: 310, y: 150, w: 40, h: 40, hp: 250, maxHp: 250, range: 130, dmg: 12, fireRate: 60, cd: 0, icon: '💣' },
        { type: 'cannon', name: 'Obranná Věž', x: 550, y: 150, w: 40, h: 40, hp: 250, maxHp: 250, range: 130, dmg: 12, fireRate: 60, cd: 0, icon: '💣' },
        { type: 'cannon', name: 'Minomet', x: 430, y: 310, w: 40, h: 40, hp: 200, maxHp: 200, range: 150, dmg: 18, fireRate: 90, cd: 0, icon: '💥' },
        { type: 'storage', name: 'Zásobník Zlata', x: 330, y: 260, w: 45, h: 45, hp: 350, maxHp: 350, lootGold: 350, icon: '🪙' },
        { type: 'storage', name: 'Zásobník Elixíru', x: 530, y: 260, w: 45, h: 45, hp: 350, maxHp: 350, lootElixir: 250, icon: '🧪' }
    ];

    raidState = {
        buildings: baseBuildings,
        troops: [], // { type, x, y, hp, maxHp, dmg, range, spd, target, isHero }
        particles: [],
        totalBuildings: baseBuildings.length,
        destroyedBuildings: 0,
        lootGold: 0,
        lootElixir: 0,
        timerSec: 90,
        battleStarted: false,
        ended: false,
        heroDeployed: false
    };

    updateRaidHUD();
    renderDeployDock();
    drawRaid();
}

function renderDeployDock() {
    const dock = document.getElementById('deploy-dock');
    dock.innerHTML = '';

    // Hero slot
    const heroSlot = document.createElement('div');
    heroSlot.className = `deploy-slot ${currentDeployUnit === 'hero' ? 'active' : ''} ${raidState.heroDeployed ? 'disabled' : ''}`;
    heroSlot.innerHTML = `
        <div class="deploy-icon">${document.getElementById('mini-avatar').innerText}</div>
        <div style="font-size:11px; font-weight:bold;">Hrdina</div>
        <div class="deploy-count">${raidState.heroDeployed ? 'Nasazen' : '1x'}</div>
    `;
    heroSlot.onclick = () => {
        if (!raidState.heroDeployed) {
            currentDeployUnit = 'hero';
            renderDeployDock();
        }
    };
    dock.appendChild(heroSlot);

    // Troops
    for (let uKey in TROOP_DEFS) {
        const u = TROOP_DEFS[uKey];
        const count = G.army[uKey] || 0;
        const slot = document.createElement('div');
        slot.className = `deploy-slot ${currentDeployUnit === uKey ? 'active' : ''} ${count === 0 ? 'disabled' : ''}`;
        slot.innerHTML = `
            <div class="deploy-icon">${u.icon}</div>
            <div style="font-size:11px; font-weight:bold;">${u.name}</div>
            <div class="deploy-count">${count} ks</div>
        `;
        slot.onclick = () => {
            if (count > 0) {
                currentDeployUnit = uKey;
                renderDeployDock();
            }
        };
        dock.appendChild(slot);
    }

    // Spells
    for (let sKey in SPELL_DEFS) {
        const s = SPELL_DEFS[sKey];
        const count = G.spells[sKey] || 0;
        const slot = document.createElement('div');
        slot.className = `deploy-slot ${currentDeployUnit === sKey ? 'active' : ''} ${count === 0 ? 'disabled' : ''}`;
        slot.innerHTML = `
            <div class="deploy-icon">${s.icon}</div>
            <div style="font-size:11px; font-weight:bold;">${s.name}</div>
            <div class="deploy-count">${count} ks</div>
        `;
        slot.onclick = () => {
            if (count > 0) {
                currentDeployUnit = sKey;
                renderDeployDock();
            }
        };
        dock.appendChild(slot);
    }
}

function onRaidCanvasClick(e) {
    if (raidState.ended) return;

    const rect = raidCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check deploy zone: must not be in forbidden center unless casting spell
    const isSpell = currentDeployUnit === 'heal' || currentDeployUnit === 'lightning';
    const distToCenter = Math.hypot(x - 430, y - 220);

    if (!isSpell && distToCenter < 140) {
        showToast('❌ Nemůžeš vysazovat vojáky přímo doprostřed nepřátelské pevnosti!');
        return;
    }

    if (!raidState.battleStarted) {
        startRaidBattle();
    }

    if (currentDeployUnit === 'hero') {
        if (raidState.heroDeployed) return;
        raidState.heroDeployed = true;
        const heroHp = calculateHeroMaxHP();
        raidState.troops.push({
            type: 'hero',
            name: G.hero.name,
            icon: document.getElementById('mini-avatar').innerText,
            x: x,
            y: y,
            hp: heroHp,
            maxHp: heroHp,
            dmg: 45 + G.hero.level * 5,
            range: G.hero.class === 'ranger' ? 120 : (G.hero.class === 'mage' ? 100 : 30),
            spd: 1.6,
            isHero: true
        });
        playSound('upgrade');
        currentDeployUnit = 'barbarian';
        renderDeployDock();
    } else if (TROOP_DEFS[currentDeployUnit]) {
        if ((G.army[currentDeployUnit] || 0) <= 0) return;
        G.army[currentDeployUnit] -= 1;
        const def = TROOP_DEFS[currentDeployUnit];
        raidState.troops.push({
            type: currentDeployUnit,
            name: def.name,
            icon: def.icon,
            x: x,
            y: y,
            hp: def.hp,
            maxHp: def.hp,
            dmg: def.dmg,
            range: def.range,
            spd: def.spd
        });
        playSound('hit');
        renderDeployDock();
        updateResourceUI();
    } else if (SPELL_DEFS[currentDeployUnit]) {
        if ((G.spells[currentDeployUnit] || 0) <= 0) return;
        G.spells[currentDeployUnit] -= 1;
        castRaidSpell(currentDeployUnit, x, y);
        renderDeployDock();
        updateResourceUI();
    }
}

function castRaidSpell(spellKey, x, y) {
    const s = SPELL_DEFS[spellKey];
    playSound('magic');

    if (spellKey === 'heal') {
        raidState.particles.push({ type: 'healCircle', x: x, y: y, r: s.radius, life: 60 });
        raidState.troops.forEach(t => {
            if (Math.hypot(t.x - x, t.y - y) <= s.radius) {
                t.hp = Math.min(t.maxHp, t.hp + s.effectVal);
            }
        });
        showToast('💚 Hojivý kruh vyléčil tvé bojovníky!');
    } else if (spellKey === 'lightning') {
        raidState.particles.push({ type: 'lightning', x: x, y: y, life: 25 });
        raidState.buildings.forEach(b => {
            if (b.hp > 0 && Math.hypot((b.x + b.w / 2) - x, (b.y + b.h / 2) - y) <= s.radius + 20) {
                b.hp = Math.max(0, b.hp - s.effectVal);
                if (b.hp <= 0) onBuildingDestroyed(b);
            }
        });
        showToast('⚡ Blesk udeřil do nepřátelských budov!');
    }
}

function startRaidBattle() {
    raidState.battleStarted = true;
    document.getElementById('btn-retreat').style.display = 'inline-flex';
    document.getElementById('btn-next-target').style.display = 'none';

    raidLoopId = requestAnimationFrame(raidUpdateLoop);

    // Timer countdown
    const raidTimerInterval = setInterval(() => {
        if (raidState.ended) {
            clearInterval(raidTimerInterval);
            return;
        }
        raidState.timerSec -= 1;
        const mins = Math.floor(raidState.timerSec / 60);
        const secs = raidState.timerSec % 60;
        document.getElementById('raid-timer').innerText = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
        if (raidState.timerSec <= 0) {
            clearInterval(raidTimerInterval);
            endRaidBattle();
        }
    }, 1000);
}

function raidUpdateLoop() {
    if (raidState.ended) return;

    updateRaidLogic();
    drawRaid();

    raidLoopId = requestAnimationFrame(raidUpdateLoop);
}

function updateRaidLogic() {
    // 1. Defenses attack troops
    raidState.buildings.forEach(b => {
        if (b.hp > 0 && (b.type === 'cannon' || b.type === 'th')) {
            b.cd = (b.cd || 0) + 1;
            if (b.cd >= b.fireRate) {
                // Find nearest troop
                let nearest = null;
                let minDist = b.range;
                raidState.troops.forEach(t => {
                    const d = Math.hypot(t.x - (b.x + b.w / 2), t.y - (b.y + b.h / 2));
                    if (d < minDist) {
                        minDist = d;
                        nearest = t;
                    }
                });

                if (nearest) {
                    nearest.hp -= b.dmg;
                    b.cd = 0;
                    raidState.particles.push({
                        type: 'projectile',
                        sx: b.x + b.w / 2, sy: b.y + b.h / 2,
                        tx: nearest.x, ty: nearest.y,
                        life: 15
                    });
                }
            }
        }
    });

    // 2. Troops move and attack nearest active building
    raidState.troops.forEach(t => {
        if (t.hp <= 0) return;

        // Find target
        let target = null;
        let minDist = 99999;
        raidState.buildings.forEach(b => {
            if (b.hp > 0) {
                const cx = b.x + b.w / 2;
                const cy = b.y + b.h / 2;
                const d = Math.hypot(cx - t.x, cy - t.y);
                if (d < minDist) {
                    minDist = d;
                    target = b;
                }
            }
        });

        // Hero Morale Aura (Clash + S&F integration: Hrdinova síla posiluje vojsko!)
        const heroAtkBonus = Math.floor((G.hero.stats.str + G.hero.stats.dex) / 10);
        const actualDmg = t.dmg + (t.isHero ? 0 : heroAtkBonus);

        if (target) {
            const cx = target.x + target.w / 2;
            const cy = target.y + target.h / 2;
            const dist = Math.hypot(cx - t.x, cy - t.y);

            if (dist > t.range) {
                // Move towards
                const angle = Math.atan2(cy - t.y, cx - t.x);
                t.x += Math.cos(angle) * t.spd;
                t.y += Math.sin(angle) * t.spd;
            } else {
                // Attack with floating hit particle
                target.hp -= (actualDmg / 30);
                if (Math.random() < 0.08) {
                    raidState.particles.push({
                        type: 'dmgText',
                        x: cx + (Math.random() * 20 - 10),
                        y: cy - 10,
                        text: `-${actualDmg}`,
                        life: 25
                    });
                }
                if (target.hp <= 0) {
                    target.hp = 0;
                    onBuildingDestroyed(target);
                }
            }
        }
    });

    // Remove dead troops
    raidState.troops = raidState.troops.filter(t => t.hp > 0);

    // Check win condition
    const aliveBuildings = raidState.buildings.filter(b => b.hp > 0).length;
    if (aliveBuildings === 0) {
        endRaidBattle();
    }
}

function onBuildingDestroyed(b) {
    raidState.destroyedBuildings += 1;
    if (b.lootGold) raidState.lootGold += b.lootGold;
    if (b.lootElixir) raidState.lootElixir += b.lootElixir;
    playSound('coin');
    updateRaidHUD();
}

function updateRaidHUD() {
    const pct = Math.floor((raidState.destroyedBuildings / raidState.totalBuildings) * 100);
    document.getElementById('raid-destruction').innerText = `${pct}%`;

    let stars = "☆☆☆";
    if (pct >= 100) stars = "⭐⭐⭐";
    else if (pct >= 50) stars = "⭐⭐☆";
    else if (pct >= 25) stars = "⭐☆☆";
    document.getElementById('raid-stars').innerText = stars;

    document.getElementById('raid-loot-gold').innerText = raidState.lootGold;
    document.getElementById('raid-loot-elixir').innerText = raidState.lootElixir;
}

function drawRaid() {
    if (!raidCtx) return;
    const ctx = raidCtx;
    const w = raidCanvas.width;
    const h = raidCanvas.height;

    // Grass & Grid background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    // Deployable outer ring border
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Red center zone (forbidden deployment)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.beginPath();
    ctx.arc(430, 220, 140, 0, Math.PI * 2);
    ctx.fill();

    // Draw Buildings
    raidState.buildings.forEach(b => {
        if (b.hp > 0) {
            ctx.fillStyle = '#334155';
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeStyle = '#64748b';
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            // Icon
            ctx.font = '24px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.icon, b.x + b.w / 2, b.y + b.h / 2);

            // HP bar
            const hpPct = b.hp / b.maxHp;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(b.x, b.y - 8, b.w, 5);
            ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : '#ef4444';
            ctx.fillRect(b.x, b.y - 8, b.w * hpPct, 5);
        } else {
            // Ruin
            ctx.fillStyle = '#1e2530';
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.font = '20px serif';
            ctx.fillText('💨', b.x + b.w / 2, b.y + b.h / 2);
        }
    });

    // Draw Troops
    raidState.troops.forEach(t => {
        ctx.font = t.isHero ? '28px serif' : '20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.icon, t.x, t.y);

        // HP bar above unit
        const hpPct = t.hp / t.maxHp;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(t.x - 12, t.y - 18, 24, 4);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(t.x - 12, t.y - 18, 24 * hpPct, 4);
    });

    // Draw Particles
    raidState.particles.forEach((p, idx) => {
        p.life -= 1;
        if (p.type === 'projectile') {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(p.sx + (p.tx - p.sx) * (1 - p.life / 15), p.sy + (p.ty - p.sy) * (1 - p.life / 15), 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'healCircle') {
            ctx.strokeStyle = `rgba(16, 185, 129, ${p.life / 60})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
    raidState.particles = raidState.particles.filter(p => p.life > 0);
}

function endRaidBattle() {
    raidState.ended = true;
    if (raidLoopId) cancelAnimationFrame(raidLoopId);

    document.getElementById('btn-retreat').style.display = 'none';
    document.getElementById('btn-next-target').style.display = 'inline-flex';

    // Collect loot
    G.res.gold += raidState.lootGold;
    G.res.elixir += raidState.lootElixir;
    const trophiesWon = Math.floor(raidState.destroyedBuildings * 5);
    G.res.trophies += trophiesWon;

    playSound('upgrade');
    showToast(`🏆 Nájezd ukončen! Kořist: ${raidState.lootGold} 🪙 | ${raidState.lootElixir} 🧪 | +${trophiesWon} 🏆`);

    updateResourceUI();
}

// --- GLOBAL EVENT LISTENERS ---
function setupEventListeners() {
    // Navigation Tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetPane = document.getElementById(tabId);
            if (targetPane) targetPane.classList.add('active');

            // Hook: Refresh raid dock when opening raid tab
            if (tabId === 'tab-raid' && raidState) {
                renderDeployDock();
                updateRaidHUD();
            }
        });
    });

    // Sounds, Save, Reset
    document.getElementById('btn-sound').addEventListener('click', () => {
        G.soundEnabled = !G.soundEnabled;
        document.getElementById('btn-sound').innerText = G.soundEnabled ? '🔊' : '🔇';
        showToast(G.soundEnabled ? 'Zvuky zapnuty' : 'Zvuky vypnuty');
    });

    document.getElementById('btn-save').addEventListener('click', saveGame);
    document.getElementById('btn-reset').addEventListener('click', resetGame);

    // Collect All Resources
    document.getElementById('btn-collect-all').addEventListener('click', collectAllResources);

    // Quick Army Fill
    document.getElementById('btn-quick-army').addEventListener('click', () => {
        let max = getArmyCapacityMax();
        let used = getArmyCapacityUsed();
        while (used < max && G.res.elixir >= 25) {
            G.army.barbarian = (G.army.barbarian || 0) + 1;
            G.res.elixir -= 25;
            used += 1;
        }
        playSound('coin');
        renderBarracks();
        updateResourceUI();
        showToast('⚡ Armáda byla rychle doplněna barbary!');
    });

    // Hero Class Selection
    document.getElementById('select-hero-class').addEventListener('change', (e) => {
        G.hero.class = e.target.value;
        renderHeroMiniCard();
        renderHeroTab();
        showToast(`Povolání změněno na: ${e.target.options[e.target.selectedIndex].text}`);
    });

    // Hero Name Input
    document.getElementById('hero-name-input').addEventListener('change', (e) => {
        G.hero.name = e.target.value || "Hrdina";
        renderHeroMiniCard();
    });

    // Plus Stat Buttons
    document.querySelectorAll('.btn-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const statKey = btn.dataset.stat;
            const cost = Math.floor(15 * Math.pow(1.15, G.hero.stats[statKey]));
            if (G.res.gold < cost) {
                showToast('❌ Nedostatek zlata pro trénink tohoto atributu!');
                return;
            }
            G.res.gold -= cost;
            G.hero.stats[statKey] += 1;
            playSound('coin');
            renderHeroStats();
            updateResourceUI();
        });
    });

    // Tavern Beer Button (+20 Stamina for 1 Gem)
    document.getElementById('btn-drink-beer').addEventListener('click', () => {
        if (G.res.gems < 1) {
            showToast('❌ Nemáš žádné Houbičky!');
            return;
        }
        G.res.gems -= 1;
        G.tavern.stamina = Math.min(G.tavern.maxStamina, G.tavern.stamina + 20);
        playSound('magic');
        showToast('🍺 Objednal sis orosený korbel piva! +20 Touhy!');
        renderTavern();
        updateResourceUI();
    });

    // Skip Quest with Gem
    document.getElementById('btn-skip-quest').addEventListener('click', () => {
        if (G.res.gems < 1) {
            showToast('❌ Nemáš Houbičku na přeskočení!');
            return;
        }
        G.res.gems -= 1;
        completeActiveQuest();
    });

    // Shop Refresh Buttons
    document.getElementById('btn-refresh-shop-gold').addEventListener('click', () => {
        if (G.res.gold < 150) {
            showToast('❌ Nedostatek zlata (potřebuješ 150 🪙)!');
            return;
        }
        G.res.gold -= 150;
        playSound('coin');
        generateShopItems();
        renderShop();
        updateResourceUI();
        showToast('🎲 Obchodník vybalil nové zboží za zlato!');
    });

    document.getElementById('btn-refresh-shop-gem').addEventListener('click', () => {
        if (G.res.gems < 1) {
            showToast('❌ Nemáš žádnou Houbičku!');
            return;
        }
        G.res.gems -= 1;
        playSound('magic');
        generateShopItems();
        renderShop();
        updateResourceUI();
        showToast('🍄 Čaroděj očaroval nabídku obchodu novým zbožím!');
    });

    // Dungeon & Arena Buttons
    document.getElementById('btn-fight-dungeon').addEventListener('click', () => {
        const floor = G.dungeon.floor;
        const b = DUNGEON_BOSSES[Math.min(floor - 1, DUNGEON_BOSSES.length - 1)];
        startTurnCombat({
            name: b.name,
            icon: b.icon,
            hp: b.hp + (floor - 1) * 80,
            dmg: b.dmg + (floor - 1) * 6,
            rewardGold: b.rewardGold,
            rewardXp: b.rewardXp,
            isDungeon: true
        });
    });

    document.getElementById('btn-fight-arena').addEventListener('click', () => {
        const hHp = calculateHeroMaxHP();
        startTurnCombat({
            name: document.getElementById('arena-rival-name').innerText,
            icon: "🤺",
            hp: Math.floor(hHp * 0.95),
            dmg: Math.floor(G.hero.stats.str * 1.8),
            rewardGold: 120,
            rewardXp: 90,
            isDungeon: false
        });
    });

    // Combat Modal Buttons
    document.getElementById('btn-combat-skip').addEventListener('click', () => {
        if (combatInterval) clearInterval(combatInterval);
        while (combatState && !combatState.ended) {
            executeCombatRound();
        }
    });

    document.getElementById('btn-combat-close').addEventListener('click', () => {
        document.getElementById('combat-modal').style.display = 'none';
        combatState = null;
    });
}

// --- NOTIFICATION TOASTS ---
function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3200);
}
