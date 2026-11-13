import { MODULES, RESEARCH_TREE, PRESTIGE_UPGRADES, ACHIEVEMENTS, DOCTRINES, MEGASTRUCTURE_STAGES, getSectorName, getSectorInfo } from './data.js';
import { formatNum } from './state.js';
import { audio } from './audio.js';

export class UIController {
  constructor(state) {
    this.state = state;
    this.activeTab = 'station';
    this.buyMode = 1; // 1, 10, 'max'

    this.els = {
      sectorName: document.getElementById('sector-name'),
      credits: document.getElementById('res-credits'),
      rateCredits: document.getElementById('rate-credits'),
      ore: document.getElementById('res-ore'),
      rateOre: document.getElementById('rate-ore'),
      energy: document.getElementById('res-energy'),
      rateEnergy: document.getElementById('rate-energy'),
      energyCard: document.querySelector('.res-energy'),
      research: document.getElementById('res-research'),
      rateResearch: document.getElementById('rate-research'),
      dm: document.getElementById('res-dm'),
      dmBonus: document.getElementById('dm-bonus'),
      drawerTitle: document.getElementById('drawer-title'),
      drawerContent: document.getElementById('drawer-content'),
      multGroup: document.getElementById('buy-multiplier-group'),
      btnMusic: document.getElementById('btn-music'),
      btnSound: document.getElementById('btn-sound'),
      btnSettings: document.getElementById('btn-settings'),
      btnEventBoost: document.getElementById('btn-event-boost'),
      eventTimer: document.getElementById('event-timer'),
      toastContainer: document.getElementById('toast-container'),
      modalBackdrop: document.getElementById('modal-backdrop'),
      modalTitle: document.getElementById('modal-title'),
      modalBody: document.getElementById('modal-body'),
      modalClose: document.getElementById('modal-close'),
      badgeResearch: document.getElementById('badge-research'),
      badgeAchievements: document.getElementById('badge-achievements'),
      badgePrestige: document.getElementById('badge-prestige'),
      tapHint: document.getElementById('tap-hint')
    };

    this.bindEvents();
    this.renderTab();
  }

  bindEvents() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab === this.activeTab) return;
        this.activeTab = tab;
        document.querySelectorAll('.nav-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.tab === tab);
          b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
        });
        this.renderTab();
      });
    });

    this.els.multGroup.querySelectorAll('.mult-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = btn.dataset.mult;
        this.buyMode = m === 'max' ? 'max' : Number(m);
        this.els.multGroup.querySelectorAll('.mult-btn').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        this.renderTab();
      });
    });

    this.els.btnMusic.addEventListener('click', () => {
      const next = !this.state.data.musicEnabled;
      this.state.data.musicEnabled = next;
      audio.setMusicEnabled(next);
      this.els.btnMusic.style.opacity = next ? '1' : '0.45';
      this.state.save();
    });

    this.els.btnSound.addEventListener('click', () => {
      const next = !this.state.data.soundEnabled;
      this.state.data.soundEnabled = next;
      audio.setEnabled(next);
      this.els.btnSound.textContent = next ? '🔊' : '🔇';
      this.state.save();
    });

    this.els.btnSettings.addEventListener('click', () => this.openSettingsModal());
    this.els.modalClose.addEventListener('click', () => this.closeModal());
    this.els.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.els.modalBackdrop) this.closeModal();
    });

    // Delegované klikání v drawer-content
    this.els.drawerContent.addEventListener('click', (e) => {
      const modBtn = e.target.closest('[data-buy-module]');
      if (modBtn) {
        const id = modBtn.dataset.buyModule;
        if (this.state.buyModule(id, this.buyMode)) {
          audio.playBuy();
          this.renderTab();
          this.updateHUD();
        }
        return;
      }

      const techBtn = e.target.closest('[data-buy-tech]');
      if (techBtn) {
        const id = techBtn.dataset.buyTech;
        if (this.state.buyResearch(id)) {
          audio.playBuy();
          this.renderTab();
          this.updateHUD();
        }
        return;
      }

      const pUpgBtn = e.target.closest('[data-buy-prestige]');
      if (pUpgBtn) {
        const id = pUpgBtn.dataset.buyPrestige;
        if (this.state.buyPrestigeUpgrade(id)) {
          audio.playBuy();
          this.renderTab();
          this.updateHUD();
        }
        return;
      }

      const claimBtn = e.target.closest('[data-claim-mission]');
      if (claimBtn) {
        const claimed = this.state.claimMission();
        if (claimed) {
          audio.playAchievement();
          if (navigator.vibrate) navigator.vibrate(20);
          this.showToast('🎯', `Mise splněna: ${claimed.title}`, `+${formatNum(claimed.rewardCredits)} 🪙  +${formatNum(claimed.rewardResearch)} 🔬`);
          this.renderTab();
          this.updateHUD();
        }
        return;
      }

      const megaBtn = e.target.closest('#btn-build-mega');
      if (megaBtn) {
        const built = this.state.buildMegastructureStage();
        if (built) {
          audio.playAchievement();
          if (navigator.vibrate) navigator.vibrate(25);
          this.showToast('🏛️', `Megastruktura: ${built.name}`, '+25 % ke globální produkci v sektoru!');
          this.renderTab();
          this.updateHUD();
        }
        return;
      }

      const jumpBtn = e.target.closest('#btn-do-prestige');
      if (jumpBtn) {
        const gain = this.state.doPrestige();
        if (gain > 0) {
          audio.setSector(this.state.data.sector);
          audio.playPrestige();
          if (this.onPrestige) this.onPrestige();
          this.showToast('🌌', 'Hyperprostorový skok!', `Získáno +${formatNum(gain)} ✨ Temné hmoty`);
          this.renderTab();
          this.updateHUD();
          this.showDoctrineModal();
        }
      }
    });
  }

  hideTapHint() {
    if (this.els.tapHint) {
      this.els.tapHint.style.opacity = '0';
    }
  }

  updateHUD() {
    const d = this.state.data;
    const r = this.state.rates;

    this.els.sectorName.textContent = getSectorName(d.sector);
    this.els.credits.textContent = formatNum(d.credits);
    this.els.rateCredits.textContent = `+${formatNum(r.credits)}/s`;

    this.els.ore.textContent = formatNum(d.ore);
    const oreSign = r.ore >= 0 ? '+' : '';
    this.els.rateOre.textContent = `${oreSign}${formatNum(r.ore)}/s`;

    this.els.energy.textContent = `${Math.floor(r.energyProd)} / ${Math.floor(r.energyUse)}`;
    const effPct = Math.round(r.efficiency * 100);
    this.els.rateEnergy.textContent = `${effPct}% výkon`;
    this.els.energyCard.classList.toggle('low', r.efficiency < 0.99);

    this.els.research.textContent = formatNum(d.research);
    this.els.rateResearch.textContent = `+${formatNum(r.research)}/s`;

    this.els.dm.textContent = formatNum(d.darkMatter);
    this.els.dmBonus.textContent = `(+${Math.round(d.darkMatter * 15)}%)`;
    this.els.btnMusic.style.opacity = d.musicEnabled ? '1' : '0.45';
    this.els.btnSound.textContent = d.soundEnabled ? '🔊' : '🔇';

    // Událost / Overdrive / Kombo boost
    const now = Date.now();
    const remMs = Math.max((d.eventBoostUntil || 0) - now, (d.overdriveUntil || 0) - now);
    const comboMult = this.state.getComboMultiplier();
    if (remMs > 0) {
      this.els.btnEventBoost.classList.remove('hidden');
      this.els.eventTimer.textContent = `${this.state.getEventMultiplier()}× ${Math.ceil(remMs / 1000)}s`;
    } else if (comboMult > 1) {
      this.els.btnEventBoost.classList.remove('hidden');
      this.els.eventTimer.textContent = `Kombo ${comboMult}×`;
    } else {
      this.els.btnEventBoost.classList.add('hidden');
    }

    // Odznaky v navigaci
    const canTech = RESEARCH_TREE.some((t) => !this.state.hasTech(t.id) && d.research >= this.state.getTechCost(t));
    this.els.badgeResearch.classList.toggle('hidden', !canTech);

    const pendingDm = this.state.getPendingDarkMatter();
    this.els.badgePrestige.classList.toggle('hidden', pendingDm <= 0);

    // Dynamicky aktualizuj dostupnost tlačítek v aktivní záložce bez překreslování celého DOMu
    this.refreshAffordability();
  }

  refreshAffordability() {
    if (this.activeTab === 'station') {
      MODULES.forEach((mod) => {
        const btn = this.els.drawerContent.querySelector(`[data-buy-module="${mod.id}"]`);
        if (!btn) return;
        const qty = this.buyMode === 'max' ? Math.max(1, this.state.getMaxAffordable(mod)) : this.buyMode;
        const cost = this.state.getModuleCost(mod, qty);
        const canBuy = this.state.data.credits >= cost;
        btn.disabled = !canBuy;
        const card = btn.closest('.item-card');
        if (card) card.classList.toggle('affordable', canBuy);
      });
    } else if (this.activeTab === 'research') {
      RESEARCH_TREE.forEach((tech) => {
        const btn = this.els.drawerContent.querySelector(`[data-buy-tech="${tech.id}"]`);
        if (!btn) return;
        const canBuy = this.state.data.research >= this.state.getTechCost(tech);
        btn.disabled = !canBuy;
        const card = btn.closest('.item-card');
        if (card) card.classList.toggle('affordable', canBuy);
      });
    } else if (this.activeTab === 'prestige') {
      const megaBtn = this.els.drawerContent.querySelector('#btn-build-mega');
      if (megaBtn) {
        const canMega = this.state.canBuildMegastructure();
        megaBtn.disabled = !canMega;
        const card = megaBtn.closest('.item-card');
        if (card) card.classList.toggle('affordable', canMega);
      }
      const jumpBtn = this.els.drawerContent.querySelector('#btn-do-prestige');
      const gainEl = this.els.drawerContent.querySelector('#prestige-pending-val');
      if (jumpBtn && gainEl) {
        const pending = this.state.getPendingDarkMatter();
        jumpBtn.disabled = pending <= 0;
        gainEl.textContent = `+${formatNum(pending)} ✨`;
      }
      PRESTIGE_UPGRADES.forEach((upg) => {
        const btn = this.els.drawerContent.querySelector(`[data-buy-prestige="${upg.id}"]`);
        if (!btn) return;
        const cost = this.state.getPrestigeUpgradeCost(upg);
        btn.disabled = this.state.data.darkMatter < cost;
      });
    }
  }

  renderTab() {
    const titles = {
      station: 'Moduly stanice',
      research: 'Technologický výzkum',
      achievements: 'Úspěchy a odměny',
      prestige: 'Hyperprostorový skok'
    };
    this.els.drawerTitle.textContent = titles[this.activeTab];
    this.els.multGroup.classList.toggle('hidden', this.activeTab !== 'station');

    if (this.activeTab === 'station') this.renderStationTab();
    else if (this.activeTab === 'research') this.renderResearchTab();
    else if (this.activeTab === 'achievements') this.renderAchievementsTab();
    else if (this.activeTab === 'prestige') this.renderPrestigeTab();
  }

  renderStationTab() {
    const d = this.state.data;
    const mission = this.state.getCurrentMission();
    const mProg = this.state.getMissionProgress(mission);
    const sectorInfo = getSectorInfo(d.sector);
    const docInfo = d.doctrine ? DOCTRINES.find((doc) => doc.id === d.doctrine) : null;
    const missionCard = (() => {
      const docBadge = docInfo ? ` • ${docInfo.icon} ${docInfo.name}` : '';
      return `
      <div class="item-card ${mProg.done ? 'completed' : ''}" style="border-color: rgba(56, 189, 248, 0.3);">
        <div class="item-icon-box">🎯</div>
        <div class="item-body">
          <div class="item-title">Mise: ${mission.title}</div>
          <div class="item-desc">${mission.desc} (${formatNum(mProg.cur)} / ${formatNum(mProg.target)})</div>
          <div class="item-stats">+${formatNum(mission.rewardCredits)} 🪙 • +${formatNum(mission.rewardResearch)} 🔬</div>
        </div>
        ${
          mProg.done
            ? `<button class="buy-btn" data-claim-mission="1" style="border-color: var(--accent-emerald); background: rgba(16,185,129,0.22);">
                 <span>Vyzvednout</span>
                 <span class="buy-qty">Odměna!</span>
               </button>`
            : `<span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); padding: 0 6px;">${Math.round((mProg.cur / mProg.target) * 100)}%</span>`
        }
      </div>
      <div style="font-size: 0.7rem; color: var(--text-muted); padding: 0 4px;">
        🌌 ${sectorInfo.desc}${docBadge}
      </div>
    `;
    })();

    const html = MODULES.map((mod) => {
      const count = d.modules[mod.id] || 0;
      const locked = d.sectorCredits < mod.unlockAt && count === 0;
      if (locked) {
        return `
          <div class="item-card">
            <div class="item-icon-box">🔒</div>
            <div class="item-body">
              <div class="item-title">${mod.name}</div>
              <div class="item-desc">Odemkne se při dosažení ${formatNum(mod.unlockAt)} 🪙 celkových kreditů v sektoru.</div>
            </div>
          </div>
        `;
      }

      const qty = this.buyMode === 'max' ? Math.max(1, this.state.getMaxAffordable(mod)) : this.buyMode;
      const cost = this.state.getModuleCost(mod, qty);
      const canBuy = d.credits >= cost;

      const stats = [];
      if (mod.outputs.credits) stats.push(`+${formatNum(mod.outputs.credits * this.state.getModuleMultiplier(mod.id) * this.state.getGlobalCreditsMultiplier())} 🪙/s`);
      if (mod.outputs.ore) stats.push(`+${formatNum(mod.outputs.ore * this.state.getModuleMultiplier(mod.id))} 🪨/s`);
      if (mod.outputs.research) stats.push(`+${formatNum(mod.outputs.research * this.state.getModuleMultiplier(mod.id))} 🔬/s`);
      if (mod.energyDelta >= 0) stats.push(`+${mod.energyDelta} ⚡`);
      else stats.push(`<span class="stat-neg">${mod.energyDelta} ⚡</span>`);

      const ms = this.state.getModuleMilestoneInfo(mod.id);
      const msSpan = ms.nextTarget - ms.prevTarget;
      const msPct = ms.maxed ? 100 : Math.min(100, Math.round(((count - ms.prevTarget) / msSpan) * 100));

      return `
        <div class="item-card ${canBuy ? 'affordable' : ''}">
          <div class="item-icon-box">
            <span>${mod.icon}</span>
            <span class="item-level-badge">${count}</span>
          </div>
          <div class="item-body">
            <div class="item-title">
              ${mod.name}
              ${ms.mult > 1 ? `<span style="font-size:0.65rem; color:var(--accent-gold); background:rgba(251,191,36,0.15); padding:1px 5px; border-radius:6px;">×${ms.mult}</span>` : ''}
            </div>
            <div class="item-desc">${mod.desc}</div>
            <div class="item-stats">${stats.join(' • ')}</div>
            <div class="progress-track" style="height:4px; margin-top:5px;" title="Další milník (2× výkon): ${ms.maxed ? 'MAX' : ms.nextTarget + ' ks'}">
              <div class="progress-fill" style="width:${msPct}%"></div>
            </div>
          </div>
          <button class="buy-btn" data-buy-module="${mod.id}" ${canBuy ? '' : 'disabled'}>
            <span>${formatNum(cost)} 🪙</span>
            <span class="buy-qty">Koupit ${qty}×</span>
          </button>
        </div>
      `;
    }).join('');

    this.els.drawerContent.innerHTML = missionCard + html;
  }

  renderResearchTab() {
    const d = this.state.data;
    const html = RESEARCH_TREE.map((tech) => {
      const done = this.state.hasTech(tech.id);
      const cost = this.state.getTechCost(tech);
      const canBuy = !done && d.research >= cost;

      return `
        <div class="item-card ${done ? 'completed' : canBuy ? 'affordable' : ''}">
          <div class="item-icon-box">${tech.icon}</div>
          <div class="item-body">
            <div class="item-title">${tech.name}</div>
            <div class="item-desc">${tech.desc}</div>
          </div>
          ${
            done
              ? `<span style="color: var(--accent-emerald); font-size: 0.78rem; font-weight: 700; padding: 0 8px;">✓ Hotovo</span>`
              : `<button class="buy-btn" data-buy-tech="${tech.id}" ${canBuy ? '' : 'disabled'}>
                   <span>${formatNum(cost)} 🔬</span>
                   <span class="buy-qty">Vyzkoumat</span>
                 </button>`
          }
        </div>
      `;
    }).join('');

    this.els.drawerContent.innerHTML = html;
  }

  renderAchievementsTab() {
    const unlockedCount = this.state.data.achievements.length;
    const totalCount = ACHIEVEMENTS.length;
    const bonusPct = Math.round((this.state.getAchievementBonus() - 1) * 100);

    const summary = `
      <div class="ach-summary">
        <span>Odemčeno: <strong>${unlockedCount} / ${totalCount}</strong></span>
        <span style="color: var(--accent-emerald); font-weight: 700;">Celkový bonus: +${bonusPct} % 🪙</span>
      </div>
    `;

    const list = ACHIEVEMENTS.map((ach) => {
      const unlocked = this.state.data.achievements.includes(ach.id);
      const cur = Math.min(ach.target, this.state.getStatValue(ach));
      const pct = Math.min(100, Math.round((cur / ach.target) * 100));

      return `
        <div class="item-card ${unlocked ? 'completed' : ''}">
          <div class="item-icon-box">${unlocked ? ach.icon : '❔'}</div>
          <div class="item-body">
            <div class="item-title">${ach.name} ${unlocked ? '✓' : ''}</div>
            <div class="item-desc">${ach.desc}</div>
            <div class="ach-reward">Odměna: ${ach.rewardText}</div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${pct}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.els.drawerContent.innerHTML = summary + list;
  }

  renderPrestigeTab() {
    const d = this.state.data;
    const pending = this.state.getPendingDarkMatter();
    const threshold = this.state.getPrestigeThreshold();

    const hero = `
      <div class="prestige-hero">
        <h3>🌌 Hyperprostorový skok</h3>
        <p>Přesuň kolonii do dalšího sektoru. Moduly a výzkum se resetují, ale získáš trvalou <strong>Temnou hmotu (✨)</strong> (+15 % produkce za každý kus) a zachováš si všechny Úspěchy!</p>
        <div class="prestige-gain" id="prestige-pending-val">+${formatNum(pending)} ✨</div>
        <p style="margin-bottom: 10px; font-size: 0.72rem;">
          Cíl sektoru: ${formatNum(d.sectorCredits)} / ${formatNum(threshold)} 🪙
        </p>
        <button id="btn-do-prestige" class="prestige-btn" ${pending <= 0 ? 'disabled' : ''}>
          Skočit do Sektoru ${d.sector + 2}
        </button>
      </div>
    `;

    const upgrades = PRESTIGE_UPGRADES.map((upg) => {
      const lvl = d.prestigeLevels[upg.id] || 0;
      const maxed = lvl >= upg.maxLevel;
      const cost = this.state.getPrestigeUpgradeCost(upg);
      const canBuy = !maxed && d.darkMatter >= cost;

      return `
        <div class="item-card ${maxed ? 'completed' : canBuy ? 'affordable' : ''}">
          <div class="item-icon-box">
            <span>${upg.icon}</span>
            <span class="item-level-badge">${lvl}/${upg.maxLevel}</span>
          </div>
          <div class="item-body">
            <div class="item-title">${upg.name}</div>
            <div class="item-desc">${upg.desc}</div>
          </div>
          ${
            maxed
              ? `<span style="color: var(--accent-purple); font-size: 0.76rem; font-weight: 700; padding: 0 8px;">MAX</span>`
              : `<button class="buy-btn" data-buy-prestige="${upg.id}" ${canBuy ? '' : 'disabled'}>
                   <span>${formatNum(cost)} ✨</span>
                   <span class="buy-qty">Vylepšit</span>
                 </button>`
          }
        </div>
      `;
    }).join('');

    const megaNext = this.state.getMegastructureNextStage();
    const megaBuilt = d.megastructureStage || 0;
    const canMega = this.state.canBuildMegastructure();
    const megaCard = `
      <div class="item-card ${megaBuilt >= MEGASTRUCTURE_STAGES.length ? 'completed' : canMega ? 'affordable' : ''}">
        <div class="item-icon-box">
          <span>🏛️</span>
          <span class="item-level-badge">${megaBuilt}/5</span>
        </div>
        <div class="item-body">
          <div class="item-title">Megastruktura: Hvězdná brána</div>
          <div class="item-desc">${megaNext ? `Další fáze: ${megaNext.name} (+25 % produkce)` : 'Hvězdná brána dokončena! (+125 % produkce)'}</div>
          ${megaNext ? `<div class="item-stats">${formatNum(megaNext.credits)} 🪙 • ${formatNum(megaNext.ore)} 🪨 • ${formatNum(megaNext.research)} 🔬</div>` : ''}
        </div>
        ${
          megaNext
            ? `<button id="btn-build-mega" class="buy-btn" ${canMega ? '' : 'disabled'}>
                 <span>Postavit</span>
                 <span class="buy-qty">Fáze ${megaBuilt + 1}/5</span>
               </button>`
            : `<span style="color: var(--accent-emerald); font-size: 0.76rem; font-weight: 700; padding: 0 8px;">✓ Aktivní</span>`
        }
      </div>
    `;

    this.els.drawerContent.innerHTML = hero + megaCard + upgrades;
  }

  showDoctrineModal() {
    this.els.modalTitle.textContent = `🚀 Doktrína pro Sektor ${this.state.data.sector + 1}`;
    this.els.modalBody.innerHTML = `
      <p>Vyber specializaci kolonie pro tento sektor:</p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${DOCTRINES.map((doc) => `
          <button class="item-card affordable" data-pick-doctrine="${doc.id}" style="text-align:left; cursor:pointer; width:100%;">
            <div class="item-icon-box">${doc.icon}</div>
            <div class="item-body">
              <div class="item-title">${doc.name}</div>
              <div class="item-desc">${doc.desc}</div>
            </div>
          </button>
        `).join('')}
      </div>
    `;
    this.els.modalBackdrop.classList.remove('hidden');

    this.els.modalBody.querySelectorAll('[data-pick-doctrine]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.data.doctrine = btn.dataset.pickDoctrine;
        this.state.recalculateRates();
        this.state.save();
        audio.playBuy();
        this.closeModal();
        this.renderTab();
        this.updateHUD();
      });
    });
  }

  showToast(icon, title, desc) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div>
        <div class="toast-title">${title}</div>
        <div class="toast-desc">${desc}</div>
      </div>
    `;
    this.els.toastContainer.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-10px)';
      el.style.transition = 'all 0.25s ease';
      setTimeout(() => el.remove(), 260);
    }, 3400);
  }

  showOfflineModal(earned) {
    const mins = Math.floor(earned.seconds / 60);
    const hrs = Math.floor(mins / 60);
    const timeStr = hrs > 0 ? `${hrs} h ${mins % 60} min` : `${mins} min`;

    this.els.modalTitle.textContent = '🛰️ Vítej zpět na stanici!';
    this.els.modalBody.innerHTML = `
      <p>Tvoje autonomní drony pracovaly během tvé nepřítomnosti (<strong>${timeStr}</strong>) a vytěžily:</p>
      <div style="background: rgba(30,41,59,0.8); padding: 12px; border-radius: 12px; font-family: var(--font-mono); display: flex; flex-direction: column; gap: 6px; color: var(--text-main);">
        <div>🪙 Kredity: <strong>+${formatNum(earned.credits)}</strong></div>
        <div>🪨 Ruda: <strong>+${formatNum(earned.ore)}</strong></div>
        <div>🔬 Výzkum: <strong>+${formatNum(earned.research)}</strong></div>
      </div>
      <button class="btn-primary" id="btn-claim-offline">Super, pokračovat!</button>
    `;
    this.els.modalBackdrop.classList.remove('hidden');
    document.getElementById('btn-claim-offline').addEventListener('click', () => this.closeModal());
  }

  openSettingsModal() {
    const d = this.state.data;
    this.els.modalTitle.textContent = '⚙️ Nastavení a statistiky';
    this.els.modalBody.innerHTML = `
      <div style="font-family: var(--font-mono); font-size: 0.78rem; background: rgba(30,41,59,0.7); padding: 10px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px;">
        <div>Celkem kreditů: <strong>${formatNum(d.lifetimeCredits)} 🪙</strong></div>
        <div>Ručních zásahů: <strong>${d.totalTaps}</strong></div>
        <div>Hyperprostorových skoků: <strong>${d.prestigeCount}</strong></div>
      </div>
      <button class="btn-primary" id="btn-export-save">📋 Kopírovat zálohu (Export)</button>
      <button class="btn-primary" id="btn-import-save" style="background: rgba(56,189,248,0.2); color: var(--text-main); border: 1px solid var(--border-glow);">📥 Načíst zálohu (Import)</button>
      <button class="btn-danger" id="btn-hard-reset">🗑️ Smazat postup a začít znovu</button>
    `;
    this.els.modalBackdrop.classList.remove('hidden');

    document.getElementById('btn-export-save').addEventListener('click', async () => {
      const code = this.state.exportSave();
      try {
        await navigator.clipboard.writeText(code);
        this.showToast('📋', 'Záloha zkopírována', 'Kód uložené hry máš ve schránce.');
      } catch {
        prompt('Zkopíruj si kód uložené hry:', code);
      }
    });

    document.getElementById('btn-import-save').addEventListener('click', () => {
      const code = prompt('Vlož exportovaný kód uložené hry:');
      if (!code) return;
      try {
        this.state.importSave(code);
        this.renderTab();
        this.updateHUD();
        this.closeModal();
        this.showToast('✅', 'Hra načtena', 'Tvůj postup byl úspěšně obnoven.');
      } catch (err) {
        alert(err.message);
      }
    });

    document.getElementById('btn-hard-reset').addEventListener('click', () => {
      if (confirm('Opravdu chceš smazat veškerý postup včetně Temné hmoty?')) {
        this.state.resetHard();
        this.renderTab();
        this.updateHUD();
        this.closeModal();
      }
    });
  }

  closeModal() {
    this.els.modalBackdrop.classList.add('hidden');
  }
}
