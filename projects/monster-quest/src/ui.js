import { MONSTERS, calcStats, expForLevel } from './data/monsters.js';
import { MOVES } from './data/moves.js';
import { TYPES } from './data/types.js';
import { ITEMS } from './data/items.js';
import { drawMonsterSprite } from './sprites.js';
import { audio } from './audio.js';

export class UIOverlay {
  constructor(game) {
    this.game = game;
    this.screen = null; // null | 'start' | 'dex' | 'party' | 'summary' | 'bag' | 'bagTarget' | 'shop' | 'pc' | 'card' | 'options'
    this.cursor = 0;
    this.subCursor = 0;
    this.swapFrom = -1;
    this.pendingItem = null;
    this.pcMode = 'withdraw'; // 'withdraw' | 'deposit'
  }

  open(screen) {
    this.screen = screen;
    this.cursor = 0;
    this.subCursor = 0;
    this.swapFrom = -1;
    this.pendingItem = null;
  }

  close() {
    this.screen = null;
  }

  handleInput(key) {
    if (!this.screen) return;

    if (this.screen === 'start') {
      const opts = 7;
      if (key === 'ArrowDown' || key === 's') { this.cursor = (this.cursor + 1) % opts; audio.sfx('blip'); }
      if (key === 'ArrowUp' || key === 'w')   { this.cursor = (this.cursor - 1 + opts) % opts; audio.sfx('blip'); }
      if (key === 'x' || key === 'Escape' || key === 'm') { audio.sfx('cancel'); this.close(); return; }
      if (key === 'z' || key === 'Enter' || key === ' ') {
        audio.sfx('confirm');
        if (this.cursor === 0) this.open('dex');
        else if (this.cursor === 1) this.open('party');
        else if (this.cursor === 2) this.open('bag');
        else if (this.cursor === 3) this.open('card');
        else if (this.cursor === 4) this.open('options');
        else if (this.cursor === 5) {
          this.game.saveGame();
          this.close();
          this.game.showDialog(['Hra byla úspěšně uložena!']);
        } else {
          this.close();
        }
      }
      return;
    }

    if (this.screen === 'dex') {
      const max = 21;
      if (key === 'ArrowDown' || key === 's') { this.cursor = Math.min(max - 1, this.cursor + 1); audio.sfx('blip'); }
      if (key === 'ArrowUp' || key === 'w')   { this.cursor = Math.max(0, this.cursor - 1); audio.sfx('blip'); }
      if (key === 'x' || key === 'Escape') { audio.sfx('cancel'); this.open('start'); }
      return;
    }

    if (this.screen === 'party') {
      const len = this.game.state.party.length;
      if (len === 0) { if (key === 'x' || key === 'Escape') this.open('start'); return; }
      if (key === 'ArrowDown' || key === 's') { this.cursor = (this.cursor + 1) % len; audio.sfx('blip'); }
      if (key === 'ArrowUp' || key === 'w')   { this.cursor = (this.cursor - 1 + len) % len; audio.sfx('blip'); }
      if (key === 'x' || key === 'Escape') {
        audio.sfx('cancel');
        if (this.swapFrom >= 0) { this.swapFrom = -1; }
        else this.open('start');
        return;
      }
      if (key === 'z' || key === 'Enter' || key === ' ') {
        audio.sfx('confirm');
        if (this.swapFrom < 0) {
          this.subCursor = this.cursor;
          this.screen = 'summary';
        } else {
          const p = this.game.state.party;
          const tmp = p[this.swapFrom];
          p[this.swapFrom] = p[this.cursor];
          p[this.cursor] = tmp;
          this.swapFrom = -1;
        }
      }
      if (key === 'Shift') {
        // Quick swap lead
        if (this.swapFrom < 0) { this.swapFrom = this.cursor; audio.sfx('blip'); }
      }
      return;
    }

    if (this.screen === 'summary') {
      if (key === 'x' || key === 'Escape') {
        audio.sfx('cancel');
        this.screen = 'party';
        this.cursor = this.subCursor;
      } else if (key === 'z' || key === 'Enter' || key === ' ') {
        audio.sfx('confirm');
        this.swapFrom = this.subCursor;
        this.screen = 'party';
        this.cursor = this.subCursor;
      }
      return;
    }

    if (this.screen === 'bag') {
      const entries = this.getBagEntries();
      if (key === 'ArrowDown' || key === 's') { if (this.cursor + 1 < entries.length) this.cursor++; audio.sfx('blip'); }
      if (key === 'ArrowUp' || key === 'w')   { if (this.cursor > 0) this.cursor--; audio.sfx('blip'); }
      if (key === 'x' || key === 'Escape') { audio.sfx('cancel'); this.open('start'); return; }
      if ((key === 'z' || key === 'Enter' || key === ' ') && entries[this.cursor]) {
        const item = ITEMS[entries[this.cursor].id];
        if (item.repelSteps) {
          audio.sfx('confirm');
          this.game.removeItem(item.id, 1);
          this.game.state.repelSteps = item.repelSteps;
          this.close();
          this.game.showDialog([`Použil jsi ${item.name}! Slabší příšerky se ti na ${item.repelSteps} kroků vyhnou.`]);
        } else if (item.heal || item.cureStatus || item.revive || item.levelUp) {
          if (this.game.state.party.length === 0) {
            audio.sfx('bump');
            return;
          }
          audio.sfx('confirm');
          this.pendingItem = item.id;
          this.screen = 'bagTarget';
          this.subCursor = 0;
        } else {
          audio.sfx('bump');
        }
      }
      return;
    }

    if (this.screen === 'bagTarget') {
      const party = this.game.state.party;
      if (key === 'ArrowDown' || key === 's') { this.subCursor = (this.subCursor + 1) % party.length; audio.sfx('blip'); }
      if (key === 'ArrowUp' || key === 'w')   { this.subCursor = (this.subCursor - 1 + party.length) % party.length; audio.sfx('blip'); }
      if (key === 'x' || key === 'Escape') { audio.sfx('cancel'); this.screen = 'bag'; return; }
      if (key === 'z' || key === 'Enter' || key === ' ') {
        this.applyFieldItem(this.pendingItem, party[this.subCursor]);
      }
      return;
    }

    if (this.screen === 'shop') {
      const shopIds = ['orb', 'super_orb', 'ultra_orb', 'potion', 'super_potion', 'full_heal', 'revive', 'repel', 'rare_candy'];
      if (key === 'ArrowDown' || key === 's') { this.cursor = (this.cursor + 1) % shopIds.length; audio.sfx('blip'); }
      if (key === 'ArrowUp' || key === 'w')   { this.cursor = (this.cursor - 1 + shopIds.length) % shopIds.length; audio.sfx('blip'); }
      if (key === 'x' || key === 'Escape') { audio.sfx('cancel'); this.close(); return; }
      if (key === 'z' || key === 'Enter' || key === ' ') {
        const item = ITEMS[shopIds[this.cursor]];
        if (this.game.state.money >= item.price) {
          this.game.state.money -= item.price;
          this.game.addItem(item.id, 1);
          audio.sfx('confirm');
        } else {
          audio.sfx('bump');
        }
      }
      return;
    }

    if (this.screen === 'pc') {
      if (key === 'ArrowLeft' || key === 'a' || key === 'ArrowRight' || key === 'd') {
        this.pcMode = this.pcMode === 'withdraw' ? 'deposit' : 'withdraw';
        this.cursor = 0;
        audio.sfx('blip');
      }
      const list = this.pcMode === 'withdraw' ? this.game.state.pcBox : this.game.state.party;
      if (key === 'ArrowDown' || key === 's') { if (this.cursor + 1 < list.length) this.cursor++; audio.sfx('blip'); }
      if (key === 'ArrowUp' || key === 'w')   { if (this.cursor > 0) this.cursor--; audio.sfx('blip'); }
      if (key === 'x' || key === 'Escape') { audio.sfx('cancel'); this.close(); return; }
      if (key === 'z' || key === 'Enter' || key === ' ') {
        if (this.pcMode === 'withdraw') {
          if (this.game.state.pcBox.length > 0 && this.game.state.party.length < 6) {
            const mon = this.game.state.pcBox.splice(this.cursor, 1)[0];
            this.game.state.party.push(mon);
            this.cursor = Math.max(0, this.cursor - 1);
            audio.sfx('confirm');
          } else audio.sfx('bump');
        } else {
          const hasOtherAlive = this.game.state.party.some((m, idx) => idx !== this.cursor && m.hp > 0);
          if (this.game.state.party.length > 1 && hasOtherAlive) {
            const mon = this.game.state.party.splice(this.cursor, 1)[0];
            this.game.state.pcBox.push(mon);
            this.cursor = Math.max(0, this.cursor - 1);
            audio.sfx('confirm');
          } else audio.sfx('bump');
        }
      }
      return;
    }

    if (this.screen === 'card') {
      if (key === 'x' || key === 'Escape' || key === 'z' || key === 'Enter' || key === ' ') {
        audio.sfx('cancel');
        this.open('start');
      }
      return;
    }

    if (this.screen === 'options') {
      const opts = 5;
      if (key === 'ArrowDown' || key === 's') { this.cursor = (this.cursor + 1) % opts; audio.sfx('blip'); }
      if (key === 'ArrowUp' || key === 'w')   { this.cursor = (this.cursor - 1 + opts) % opts; audio.sfx('blip'); }
      if (key === 'x' || key === 'Escape') { audio.sfx('cancel'); this.open('start'); return; }
      if (key === 'z' || key === 'Enter' || key === ' ') {
        audio.sfx('confirm');
        const o = this.game.state.options;
        if (this.cursor === 0) {
          audio.setEnabled(!audio.enabled);
          this.game.syncTopButtons();
        } else if (this.cursor === 1) {
          this.game.speedMult = this.game.speedMult === 1 ? 2 : 1;
          this.game.syncTopButtons();
        } else if (this.cursor === 2) {
          o.expShare = !o.expShare;
        } else if (this.cursor === 3) {
          o.dayNight = !o.dayNight;
        } else if (this.cursor === 4) {
          localStorage.removeItem('monster_quest_save_v1');
          location.reload();
        }
      }
    }
  }

  getBagEntries() {
    const bag = this.game.state.bag;
    return Object.keys(bag).filter((id) => bag[id] > 0).map((id) => ({ id, count: bag[id] }));
  }

  applyFieldItem(itemId, mon) {
    const item = ITEMS[itemId];
    if (item.heal) {
      if (mon.hp <= 0 || mon.hp >= mon.maxHp) { audio.sfx('bump'); return; }
      mon.hp = Math.min(mon.maxHp, mon.hp + item.heal);
      this.game.removeItem(itemId, 1);
      audio.sfx('heal');
      this.cursor = Math.min(this.cursor, Math.max(0, this.getBagEntries().length - 1));
      this.screen = 'bag';
    } else if (item.cureStatus) {
      if (!mon.status) { audio.sfx('bump'); return; }
      mon.status = null;
      mon.sleepTurns = 0;
      this.game.removeItem(itemId, 1);
      audio.sfx('heal');
      this.cursor = Math.min(this.cursor, Math.max(0, this.getBagEntries().length - 1));
      this.screen = 'bag';
    } else if (item.revive) {
      if (mon.hp > 0) { audio.sfx('bump'); return; }
      mon.hp = Math.max(1, Math.floor(mon.maxHp / 2));
      mon.status = null;
      mon.sleepTurns = 0;
      this.game.removeItem(itemId, 1);
      audio.sfx('heal');
      this.cursor = Math.min(this.cursor, Math.max(0, this.getBagEntries().length - 1));
      this.screen = 'bag';
    } else if (item.levelUp) {
      if (mon.hp <= 0) { audio.sfx('bump'); return; }
      mon.level++;
      mon.exp = expForLevel(mon.level);
      mon.nextExp = expForLevel(mon.level + 1);
      const oldMax = mon.maxHp;
      const st = calcStats(mon.speciesId, mon.level);
      mon.maxHp = st.maxHp; mon.atk = st.atk; mon.def = st.def; mon.spd = st.spd;
      mon.hp = Math.min(mon.maxHp, mon.hp + Math.max(0, mon.maxHp - oldMax));
      const sp = MONSTERS[mon.speciesId];
      if (sp.learnset[mon.level]) {
        for (const mId of sp.learnset[mon.level]) {
          if (!mon.moves.some((m) => m.id === mId)) {
            if (mon.moves.length >= 4) mon.moves.shift();
            mon.moves.push({ id: mId, pp: MOVES[mId].pp });
          }
        }
      }
      if (sp.evolve && mon.level >= sp.evolve.level) {
        mon.speciesId = sp.evolve.to;
        mon.nickname = MONSTERS[mon.speciesId].name;
        const nst = calcStats(mon.speciesId, mon.level);
        mon.hp = Math.min(nst.maxHp, mon.hp + Math.max(0, nst.maxHp - mon.maxHp));
        mon.maxHp = nst.maxHp; mon.atk = nst.atk; mon.def = nst.def; mon.spd = nst.spd;
        this.game.markSeen(mon.speciesId);
        this.game.markCaught(mon.speciesId);
        audio.sfx('evolve');
      } else {
        audio.sfx('levelUp');
      }
      this.game.removeItem(itemId, 1);
      this.cursor = Math.min(this.cursor, Math.max(0, this.getBagEntries().length - 1));
      this.screen = 'bag';
    }
  }

  draw(ctx) {
    if (!this.screen) return;
    const W = 480;
    const H = 360;

    if (this.screen === 'start') {
      ctx.fillStyle = '#1a202c';
      ctx.fillRect(300, 14, 166, 236);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.strokeRect(300, 14, 166, 236);

      const labels = ['📖 Monsterdex', '🐾 Tým', '🎒 Batoh', '🪪 Karta trenéra', '⚙️ Možnosti', '💾 Uložit hru', '❌ Zavřít'];
      labels.forEach((lbl, i) => {
        const y = 34 + i * 29;
        ctx.fillStyle = i === this.cursor ? '#f6e05e' : '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`${i === this.cursor ? '▶ ' : '  '}${lbl}`, 312, y);
      });
      return;
    }

    // Fullscreen overlay panel
    ctx.fillStyle = '#141923';
    ctx.fillRect(10, 10, W - 20, H - 20);
    ctx.strokeStyle = '#68d391';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    if (this.screen === 'dex') {
      ctx.fillStyle = '#68d391';
      ctx.font = 'bold 15px monospace';
      const caughtCnt = Object.keys(this.game.state.dexCaught).length;
      ctx.fillText(`MONSTERDEX (Chyceno: ${caughtCnt}/21)`, 24, 34);

      const start = Math.max(0, this.cursor - 5);
      for (let i = 0; i < 11; i++) {
        const id = start + i + 1;
        if (id > 21) break;
        const y = 52 + i * 26;
        const seen = this.game.state.dexSeen[id];
        const caught = this.game.state.dexCaught[id];
        ctx.fillStyle = (id - 1) === this.cursor ? '#2b6cb0' : 'transparent';
        ctx.fillRect(20, y, 180, 22);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        const num = String(id).padStart(2, '0');
        ctx.fillText(`${(id - 1) === this.cursor ? '▶' : ' '} #${num} ${seen ? MONSTERS[id].name : '???'} ${caught ? '●' : ''}`, 24, y + 15);
      }

      const selId = this.cursor + 1;
      const sp = MONSTERS[selId];
      if (this.game.state.dexSeen[selId]) {
        drawMonsterSprite(ctx, selId, 260, 54, 96, false, false, false);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(sp.name, 230, 174);
        ctx.fillStyle = '#a0aec0';
        ctx.font = '12px monospace';
        ctx.fillText(sp.types.map((t) => TYPES[t].name).join(' / '), 230, 194);
        ctx.fillText(`HP:${sp.base.hp} ATK:${sp.base.atk} DEF:${sp.base.def} SPD:${sp.base.spd}`, 230, 214);
        this.wrap(ctx, sp.desc, 230, 240, 220, 16);
      } else {
        ctx.fillStyle = '#718096';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('Neznámá příšerka', 250, 140);
      }
      return;
    }

    if (this.screen === 'party' || this.screen === 'bagTarget') {
      ctx.fillStyle = '#68d391';
      ctx.font = 'bold 14px monospace';
      const title = this.screen === 'bagTarget'
        ? `POUŽÍT ${ITEMS[this.pendingItem].name.toUpperCase()} NA:`
        : (this.swapFrom >= 0 ? 'VYBER POZICI PRO VÝMĚNU' : 'TÝM (Z = Detail, Shift = Vyměnit pořadí)');
      ctx.fillText(title, 24, 34);

      const cur = this.screen === 'bagTarget' ? this.subCursor : this.cursor;
      this.game.state.party.forEach((m, i) => {
        const y = 50 + i * 48;
        ctx.fillStyle = i === cur ? '#2b6cb0' : (i === this.swapFrom ? '#744210' : '#1f2937');
        ctx.fillRect(24, y, W - 48, 42);
        drawMonsterSprite(ctx, m.speciesId, 30, y + 3, 36, m.shiny);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`${m.nickname}${m.shiny ? '★' : ''}  Lv.${m.level} ${m.status ? `[${m.status}]` : ''}`, 78, y + 18);
        ctx.fillStyle = '#cbd5e0';
        ctx.font = '12px monospace';
        ctx.fillText(`HP: ${m.hp}/${m.maxHp}  (${MONSTERS[m.speciesId].types.map((t) => TYPES[t].name).join('/')})`, 78, y + 35);
      });
      return;
    }

    if (this.screen === 'summary') {
      const m = this.game.state.party[this.subCursor];
      const sp = MONSTERS[m.speciesId];
      drawMonsterSprite(ctx, m.speciesId, 34, 42, 96, m.shiny);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${m.nickname}${m.shiny ? ' ★SHINY' : ''} (Lv.${m.level})`, 150, 60);
      ctx.fillStyle = '#a0aec0';
      ctx.font = '13px monospace';
      ctx.fillText(`Typ: ${sp.types.map((t) => TYPES[t].name).join(' / ')}`, 150, 84);
      ctx.fillText(`HP: ${m.hp}/${m.maxHp} | ATK: ${m.atk} | DEF: ${m.def} | SPD: ${m.spd}`, 150, 106);
      ctx.fillText(`XP: ${m.exp} / ${m.nextExp}`, 150, 128);

      ctx.fillStyle = '#f6e05e';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('ÚTOKY:', 30, 175);
      m.moves.forEach((slot, i) => {
        const mv = MOVES[slot.id];
        ctx.fillStyle = '#fff';
        ctx.font = '13px monospace';
        ctx.fillText(`• ${mv.name} (${TYPES[mv.type].name}) | Síla: ${mv.power || '-'}`, 34, 200 + i * 24);
      });
      ctx.fillStyle = '#68d391';
      ctx.fillText('Z = Nastavit jako vedoucího / Vyměnit   |   X = Zpět', 30, 328);
      return;
    }

    if (this.screen === 'bag') {
      ctx.fillStyle = '#68d391';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`BATOH (Peníze: ${this.game.state.money} G)`, 24, 34);
      const entries = this.getBagEntries();
      if (entries.length === 0) {
        this.cursor = 0;
        ctx.fillStyle = '#a0aec0';
        ctx.fillText('Batoh je prázdný.', 24, 70);
      } else {
        this.cursor = Math.min(this.cursor, entries.length - 1);
        entries.forEach((e, i) => {
          const y = 52 + i * 28;
          ctx.fillStyle = i === this.cursor ? '#2b6cb0' : 'transparent';
          ctx.fillRect(20, y, W - 40, 24);
          ctx.fillStyle = '#fff';
          ctx.font = '13px monospace';
          ctx.fillText(`${i === this.cursor ? '▶ ' : '  '}${ITEMS[e.id].name} x${e.count}`, 26, y + 17);
        });
        const sel = ITEMS[entries[this.cursor].id];
        ctx.fillStyle = '#f6e05e';
        ctx.font = '12px monospace';
        this.wrap(ctx, sel.desc, 26, 304, W - 52, 16);
      }
      return;
    }

    if (this.screen === 'shop') {
      const shopIds = ['orb', 'super_orb', 'ultra_orb', 'potion', 'super_potion', 'full_heal', 'revive', 'repel', 'rare_candy'];
      ctx.fillStyle = '#68d391';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`OBCHOD (Z = Koupit, X = Odejit)   ${this.game.state.money} G`, 24, 34);
      shopIds.forEach((id, i) => {
        const it = ITEMS[id];
        const y = 50 + i * 28;
        ctx.fillStyle = i === this.cursor ? '#2b6cb0' : 'transparent';
        ctx.fillRect(20, y, W - 40, 24);
        ctx.fillStyle = this.game.state.money >= it.price ? '#fff' : '#fc8181';
        ctx.font = '13px monospace';
        ctx.fillText(`${i === this.cursor ? '▶ ' : '  '}${it.name.padEnd(18, ' ')} ${it.price} G`, 26, y + 17);
      });
      return;
    }

    if (this.screen === 'pc') {
      ctx.fillStyle = '#68d391';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`PC ÚLOŽIŠTĚ  |  Režim: ${this.pcMode === 'withdraw' ? 'VYBRAT Z PC' : 'ULOŽIT DO PC'} (◀/▶)`, 24, 34);
      const list = this.pcMode === 'withdraw' ? this.game.state.pcBox : this.game.state.party;
      if (list.length === 0) {
        ctx.fillStyle = '#a0aec0';
        ctx.fillText('Žádné příšerky k zobrazení.', 24, 80);
      } else {
        const start = Math.max(0, this.cursor - 4);
        list.slice(start, start + 9).forEach((m, idx) => {
          const real = start + idx;
          const y = 54 + idx * 28;
          ctx.fillStyle = real === this.cursor ? '#2b6cb0' : 'transparent';
          ctx.fillRect(20, y, W - 40, 24);
          ctx.fillStyle = '#fff';
          ctx.font = '13px monospace';
          ctx.fillText(`${real === this.cursor ? '▶ ' : '  '}${m.nickname}${m.shiny ? '★' : ''} Lv.${m.level} (HP ${m.hp}/${m.maxHp})`, 26, y + 17);
        });
      }
      ctx.fillStyle = '#f6e05e';
      ctx.font = '12px monospace';
      ctx.fillText('Z = Přesunout   |   ◀/▶ = Přepnout režim   |   X = Zavřít', 24, 332);
      return;
    }

    if (this.screen === 'card') {
      const s = this.game.state;
      ctx.fillStyle = '#68d391';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('🪪 KARTA TRENÉRA', 26, 40);
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      ctx.fillText(`Peníze: ${s.money} G`, 30, 82);
      ctx.fillText(`Chyceno v Dexu: ${Object.keys(s.dexCaught).length} / 21`, 30, 110);
      ctx.fillText(`Nalezeno Shiny: ${s.shinyCount} ★`, 30, 138);
      ctx.fillText(`Odznaky & Trofeje:`, 30, 174);
      if (s.badges.length === 0) {
        ctx.fillStyle = '#a0aec0';
        ctx.fillText('  Zatím žádné. Poraž Vůdce Terru v Kamenném Městě!', 30, 200);
      } else {
        s.badges.forEach((b, i) => {
          ctx.fillStyle = '#f6e05e';
          ctx.fillText(`  🏆 ${b}`, 30, 200 + i * 24);
        });
      }
      return;
    }

    if (this.screen === 'options') {
      const o = this.game.state.options;
      ctx.fillStyle = '#68d391';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('⚙️ MOŽNOSTI', 24, 38);
      const rows = [
        `Zvuk & Hudba: ${audio.enabled ? 'ZAPNUTO' : 'VYPNUTO'}`,
        `Rychlost hry: ${this.game.speedMult}x`,
        `EXP Share (sdílení XP): ${o.expShare ? 'ZAPNUTO' : 'VYPNUTO'}`,
        `Cyklus Den / Noc: ${o.dayNight ? 'ZAPNUTO' : 'VYPNUTO'}`,
        `🔄 Začít novou hru (smaže uloženou pozici)`,
      ];
      rows.forEach((r, i) => {
        const y = 68 + i * 36;
        ctx.fillStyle = i === this.cursor ? '#2b6cb0' : 'transparent';
        ctx.fillRect(20, y, W - 40, 28);
        ctx.fillStyle = i === 4 ? '#fc8181' : '#fff';
        ctx.font = '13px monospace';
        ctx.fillText(`${i === this.cursor ? '▶ ' : '  '}${r}`, 26, y + 19);
      });
    }
  }

  wrap(ctx, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '';
    let cy = y;
    ctx.fillStyle = '#cbd5e0';
    ctx.font = '12px monospace';
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, cy);
        line = w + ' ';
        cy += lh;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, cy);
  }
}
