import { MONSTERS, calcStats, expForLevel, createMonster } from './data/monsters.js';
import { MOVES } from './data/moves.js';
import { TYPES, getTypeEffectiveness } from './data/types.js';
import { ITEMS } from './data/items.js';
import { drawMonsterSprite } from './sprites.js';
import { audio } from './audio.js';

export class BattleSystem {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.isTrainer = false;
    this.trainerData = null;
    this.enemyParty = [];
    this.enemyIdx = 0;
    this.playerIdx = 0;

    this.menu = 'main'; // 'main' | 'fight' | 'bag' | 'party' | 'busy'
    this.cursor = 0;
    this.bagItems = [];

    this.logQueue = [];
    this.currentLog = '';
    this.waitTimer = 0;
    this.phase = 'intro'; // 'intro' | 'command' | 'anim' | 'end'
    this.pendingActions = [];

    this.playerStages = { atkStage: 0, defStage: 0 };
    this.enemyStages = { atkStage: 0, defStage: 0 };

    this.playerFlash = 0;
    this.enemyFlash = 0;
    this.orbAnim = null; // { phase, timer, shakes, caught }
    this.shinySparkle = 0;
  }

  startWild(speciesId, level) {
    const foe = createMonster(speciesId, level);
    this.initBattle([foe], false, null);
  }

  startTrainer(npc) {
    const t = npc.trainer;
    const foes = t.party.map((p) => createMonster(p.id, p.level, false));
    this.initBattle(foes, true, { ...t, npcId: npc.id });
  }

  initBattle(enemyParty, isTrainer, trainerData) {
    this.active = true;
    this.isTrainer = isTrainer;
    this.trainerData = trainerData;
    this.enemyParty = enemyParty;
    this.enemyIdx = 0;

    const firstAlive = this.game.state.party.findIndex((m) => m.hp > 0);
    this.playerIdx = firstAlive >= 0 ? firstAlive : 0;

    this.playerStages = { atkStage: 0, defStage: 0 };
    this.enemyStages = { atkStage: 0, defStage: 0 };
    this.menu = 'busy';
    this.cursor = 0;
    this.logQueue = [];
    this.orbAnim = null;
    this.playerFlash = 0;
    this.enemyFlash = 0;

    const foe = this.foe;
    this.game.markSeen(foe.speciesId);

    audio.sfx('battleStart');
    audio.playBgm('battle');

    if (foe.shiny) {
      this.shinySparkle = 60;
      audio.sfx('shiny');
    }

    if (isTrainer) {
      this.pushLog(`${trainerData.name} tě vyzývá k souboji!`);
      this.pushLog(`${trainerData.name} posílá do boje: ${foe.nickname}!`);
    } else {
      const shinyTxt = foe.shiny ? ' ✨ (SHINY!)' : '';
      this.pushLog(`Objevil se divoký ${foe.nickname}${shinyTxt} (Lv.${foe.level})!`);
    }
    this.pushLog(`Do toho, ${this.playerMon.nickname}!`, () => {
      this.menu = 'main';
      this.cursor = 0;
      this.phase = 'command';
    });
    this.nextLog();
  }

  get playerMon() {
    return this.game.state.party[this.playerIdx];
  }

  get foe() {
    return this.enemyParty[this.enemyIdx];
  }

  pushLog(text, onDone = null) {
    this.logQueue.push({ text, onDone });
  }

  nextLog() {
    while (this.logQueue.length > 0) {
      const item = this.logQueue.shift();
      if (!item.text) {
        this.currentLog = '';
        this.onLogDone = null;
        this.waitTimer = 0;
        if (item.onDone) item.onDone();
        if (!this.active || this.orbAnim || this.menu !== 'busy' || this.currentLog) return;
        continue;
      }
      this.currentLog = item.text;
      this.onLogDone = item.onDone;
      this.waitTimer = this.game.speedMult === 2 ? 22 : 42;
      return;
    }
    this.currentLog = '';
    this.onLogDone = null;
    this.waitTimer = 0;
  }

  update() {
    if (!this.active) return;
    if (this.playerFlash > 0) this.playerFlash--;
    if (this.enemyFlash > 0) this.enemyFlash--;
    if (this.shinySparkle > 0) this.shinySparkle--;

    if (this.orbAnim) {
      this.orbAnim.timer++;
      const step = this.game.speedMult === 2 ? 15 : 28;
      if (this.orbAnim.timer % step === 0) {
        if (this.orbAnim.shakesDone < this.orbAnim.targetShakes) {
          this.orbAnim.shakesDone++;
          audio.sfx('orbShake');
        } else {
          const { caught, foe } = this.orbAnim;
          this.orbAnim = null;
          if (caught) {
            audio.sfx('catchSuccess');
            this.game.markCaught(foe.speciesId);
            if (foe.shiny) this.game.state.shinyCount++;
            const addedToParty = this.game.addMonster(foe);
            this.pushLog(`Skvělé! ${foe.nickname} byl chycen!`);
            if (!addedToParty) {
              this.pushLog(`${foe.nickname} byl odeslán do PC úložiště.`);
            }
            this.pushLog('', () => this.finishBattle(true));
          } else {
            this.pushLog(`Ach ne! ${foe.nickname} se z Orbu vymanil!`, () => {
              this.runEnemyTurnOnly();
            });
          }
          this.nextLog();
        }
      }
      return;
    }

    if (this.currentLog && this.waitTimer > 0) {
      this.waitTimer--;
      if (this.waitTimer === 0) {
        const cb = this.onLogDone;
        this.currentLog = '';
        this.onLogDone = null;
        if (cb) cb();
        if (this.active && !this.orbAnim && this.menu === 'busy' && !this.currentLog && this.logQueue.length > 0) {
          this.nextLog();
        }
      }
    }
  }

  handleInput(key) {
    if (!this.active || this.orbAnim) return;

    if (this.menu === 'busy') {
      if ((key === 'z' || key === 'Enter' || key === ' ') && this.currentLog) {
        this.waitTimer = 1;
      }
      return;
    }

    if (this.menu === 'main') {
      if (key === 'ArrowRight' || key === 'd') { this.cursor = (this.cursor % 2 === 0) ? this.cursor + 1 : this.cursor - 1; audio.sfx('blip'); }
      if (key === 'ArrowLeft' || key === 'a')  { this.cursor = (this.cursor % 2 === 1) ? this.cursor - 1 : this.cursor + 1; audio.sfx('blip'); }
      if (key === 'ArrowDown' || key === 's')  { this.cursor = (this.cursor < 2) ? this.cursor + 2 : this.cursor - 2; audio.sfx('blip'); }
      if (key === 'ArrowUp' || key === 'w')    { this.cursor = (this.cursor >= 2) ? this.cursor - 2 : this.cursor + 2; audio.sfx('blip'); }
      if (key === 'z' || key === 'Enter' || key === ' ') {
        audio.sfx('confirm');
        if (this.cursor === 0) { this.menu = 'fight'; this.cursor = 0; }
        else if (this.cursor === 1) { this.openBagMenu(); }
        else if (this.cursor === 2) { this.menu = 'party'; this.cursor = 0; }
        else if (this.cursor === 3) { this.tryRun(); }
      }
      return;
    }

    if (this.menu === 'fight') {
      const moves = this.playerMon.moves;
      if (key === 'ArrowRight' || key === 'd') { if (this.cursor + 1 < moves.length && this.cursor % 2 === 0) this.cursor++; audio.sfx('blip'); }
      if (key === 'ArrowLeft' || key === 'a')  { if (this.cursor % 2 === 1) this.cursor--; audio.sfx('blip'); }
      if (key === 'ArrowDown' || key === 's')  { if (this.cursor + 2 < moves.length) this.cursor += 2; audio.sfx('blip'); }
      if (key === 'ArrowUp' || key === 'w')    { if (this.cursor - 2 >= 0) this.cursor -= 2; audio.sfx('blip'); }
      if (key === 'x' || key === 'Escape') {
        audio.sfx('cancel');
        this.menu = 'main';
        this.cursor = 0;
        return;
      }
      if (key === 'z' || key === 'Enter' || key === ' ') {
        const hasAnyPp = moves.some((slot) => (slot.pp === null ? MOVES[slot.id].pp : slot.pp) > 0);
        if (!hasAnyPp) {
          audio.sfx('confirm');
          this.executeRound({ id: '_struggle', pp: 1 });
          return;
        }
        const moveSlot = moves[this.cursor];
        if (!moveSlot) return;
        const mDef = MOVES[moveSlot.id];
        if (moveSlot.pp === null) moveSlot.pp = mDef.pp;
        if (moveSlot.pp <= 0) {
          audio.sfx('bump');
          return;
        }
        audio.sfx('confirm');
        this.executeRound(moveSlot);
      }
      return;
    }

    if (this.menu === 'bag') {
      if (key === 'ArrowDown' || key === 's') { if (this.cursor + 1 < this.bagItems.length) this.cursor++; audio.sfx('blip'); }
      if (key === 'ArrowUp' || key === 'w')   { if (this.cursor > 0) this.cursor--; audio.sfx('blip'); }
      if (key === 'x' || key === 'Escape') {
        audio.sfx('cancel');
        this.menu = 'main';
        this.cursor = 1;
        return;
      }
      if (key === 'z' || key === 'Enter' || key === ' ') {
        const itemEntry = this.bagItems[this.cursor];
        if (!itemEntry) return;
        this.useBattleItem(itemEntry.id);
      }
      return;
    }

    if (this.menu === 'party') {
      const party = this.game.state.party;
      if (key === 'ArrowRight' || key === 'd') { if (this.cursor + 1 < party.length && this.cursor % 2 === 0) { this.cursor++; audio.sfx('blip'); } }
      if (key === 'ArrowLeft' || key === 'a')  { if (this.cursor % 2 === 1) { this.cursor--; audio.sfx('blip'); } }
      if (key === 'ArrowDown' || key === 's')  { if (this.cursor + 2 < party.length) { this.cursor += 2; audio.sfx('blip'); } else if (this.cursor + 1 < party.length) { this.cursor++; audio.sfx('blip'); } }
      if (key === 'ArrowUp' || key === 'w')    { if (this.cursor - 2 >= 0) { this.cursor -= 2; audio.sfx('blip'); } else if (this.cursor > 0) { this.cursor--; audio.sfx('blip'); } }
      if (key === 'x' || key === 'Escape') {
        if (this.playerMon.hp <= 0) {
          audio.sfx('bump');
          return;
        }
        audio.sfx('cancel');
        this.menu = 'main';
        this.cursor = 2;
        return;
      }
      if (key === 'z' || key === 'Enter' || key === ' ') {
        const chosen = party[this.cursor];
        if (!chosen || chosen.hp <= 0 || this.cursor === this.playerIdx) {
          audio.sfx('bump');
          return;
        }
        audio.sfx('confirm');
        const wasFainted = this.playerMon.hp <= 0;
        this.playerIdx = this.cursor;
        this.playerStages = { atkStage: 0, defStage: 0 };
        this.menu = 'busy';
        this.pushLog(`Vrať se! Do boje jde ${this.playerMon.nickname}!`, () => {
          if (wasFainted) {
            this.menu = 'main';
            this.cursor = 0;
          } else {
            this.runEnemyTurnOnly();
          }
        });
        this.nextLog();
      }
    }
  }

  openBagMenu() {
    const bag = this.game.state.bag;
    this.bagItems = Object.keys(bag)
      .filter((id) => bag[id] > 0 && (ITEMS[id].cat === 'orbs' || ITEMS[id].heal || ITEMS[id].cureStatus))
      .map((id) => ({ id, count: bag[id], def: ITEMS[id] }));
    if (this.bagItems.length === 0) {
      audio.sfx('bump');
      return;
    }
    this.menu = 'bag';
    this.cursor = 0;
  }

  useBattleItem(itemId) {
    const item = ITEMS[itemId];
    if (item.cat === 'orbs') {
      if (this.isTrainer) {
        audio.sfx('bump');
        this.menu = 'busy';
        this.pushLog('Trenér zablokoval Orb! Cizí příšerky nelze chytat!', () => {
          this.menu = 'main';
          this.cursor = 0;
        });
        this.nextLog();
        return;
      }
      this.game.removeItem(itemId, 1);
      this.menu = 'busy';
      const foe = this.foe;
      const sp = MONSTERS[foe.speciesId];
      const hpFactor = (3 * foe.maxHp - 2 * foe.hp) / (3 * foe.maxHp);
      const statusBonus = foe.status ? 1.4 : 1.0;
      const prob = Math.min(0.95, (sp.catchRate / 255) * item.catchMult * hpFactor * statusBonus * 1.35);
      const caught = Math.random() < prob;
      const targetShakes = caught ? 3 : Math.floor(Math.random() * 3);

      this.pushLog(`Hodil jsi ${item.name}!`, () => {
        this.orbAnim = { timer: 0, shakesDone: 0, targetShakes, caught, foe };
      });
      this.nextLog();
      return;
    }

    // Healing / Status item on active monster
    const mon = this.playerMon;
    if (item.heal && mon.hp >= mon.maxHp) {
      audio.sfx('bump');
      return;
    }
    if (item.cureStatus && !mon.status) {
      audio.sfx('bump');
      return;
    }
    this.game.removeItem(itemId, 1);
    audio.sfx('heal');
    this.menu = 'busy';
    if (item.heal) {
      mon.hp = Math.min(mon.maxHp, mon.hp + item.heal);
      this.pushLog(`${mon.nickname} si obnovil HP pomocí ${item.name}!`, () => this.runEnemyTurnOnly());
    } else if (item.cureStatus) {
      mon.status = null;
      mon.sleepTurns = 0;
      this.pushLog(`${mon.nickname} byl vyléčen ze stavových potíží!`, () => this.runEnemyTurnOnly());
    }
    this.nextLog();
  }

  tryRun() {
    if (this.isTrainer) {
      audio.sfx('bump');
      this.menu = 'busy';
      this.pushLog('Z trenérského souboje nelze utéct!', () => {
        this.menu = 'main';
        this.cursor = 0;
      });
      this.nextLog();
      return;
    }
    this.menu = 'busy';
    this.pushLog('Úspěšně jsi utekl z boje!', () => this.finishBattle(false));
    this.nextLog();
  }

  pickEnemyMove() {
    const moves = this.foe.moves;
    return moves[Math.floor(Math.random() * moves.length)];
  }

  getMoveDef(id) {
    if (id === '_struggle') {
      return { name: 'Zápas', type: 'NORMAL', power: 50, acc: 100, pp: 1, cat: 'phys', recoil: 0.25 };
    }
    return MOVES[id];
  }

  executeRound(playerMoveSlot) {
    this.menu = 'busy';
    const enemyMoveSlot = this.pickEnemyMove();
    const pMove = this.getMoveDef(playerMoveSlot.id);
    const eMove = this.getMoveDef(enemyMoveSlot.id);

    const pSpd = this.playerMon.spd * (this.playerMon.status === 'PAR' ? 0.5 : 1);
    const eSpd = this.foe.spd * (this.foe.status === 'PAR' ? 0.5 : 1);
    const pPrio = pMove.priority || 0;
    const ePrio = eMove.priority || 0;

    const playerFirst = pPrio !== ePrio ? pPrio > ePrio : pSpd >= eSpd;

    if (playerFirst) {
      this.performAttack(this.playerMon, this.foe, playerMoveSlot, this.playerStages, this.enemyStages, true, () => {
        if (this.foe.hp <= 0) {
          this.handleEnemyFainted();
        } else if (this.playerMon.hp <= 0) {
          this.handlePlayerFainted();
        } else {
          this.performAttack(this.foe, this.playerMon, enemyMoveSlot, this.enemyStages, this.playerStages, false, () => {
            this.endOfTurnEffects();
          });
        }
      });
    } else {
      this.performAttack(this.foe, this.playerMon, enemyMoveSlot, this.enemyStages, this.playerStages, false, () => {
        if (this.playerMon.hp <= 0) {
          this.handlePlayerFainted();
        } else {
          this.performAttack(this.playerMon, this.foe, playerMoveSlot, this.playerStages, this.enemyStages, true, () => {
            this.endOfTurnEffects();
          });
        }
      });
    }
    this.nextLog();
  }

  runEnemyTurnOnly() {
    const enemyMoveSlot = this.pickEnemyMove();
    this.performAttack(this.foe, this.playerMon, enemyMoveSlot, this.enemyStages, this.playerStages, false, () => {
      this.endOfTurnEffects();
    });
    this.nextLog();
  }

  performAttack(attacker, defender, moveSlot, atkStages, defStages, isPlayer, onDone) {
    const move = this.getMoveDef(moveSlot.id);
    if (moveSlot.pp === null) moveSlot.pp = move.pp;

    // Sleep check
    if (attacker.status === 'SLP') {
      if (attacker.sleepTurns > 0) {
        attacker.sleepTurns--;
        this.pushLog(`${attacker.nickname} tvrdě spí...`, onDone);
        return;
      } else {
        attacker.status = null;
        this.pushLog(`${attacker.nickname} se probudil!`);
      }
    }

    // Paralysis check
    if (attacker.status === 'PAR' && Math.random() < 0.25) {
      this.pushLog(`${attacker.nickname} je paralyzován a nemůže se pohnout!`, onDone);
      return;
    }

    if (isPlayer) moveSlot.pp = Math.max(0, moveSlot.pp - 1);
    this.pushLog(`${attacker.nickname} použil ${move.name}!`);

    if (Math.random() * 100 > move.acc) {
      this.pushLog(`Útok ale minul cíl!`, onDone);
      return;
    }

    if (move.cat === 'status') {
      if (move.stat) {
        const targetStages = move.stat.target === 'self' ? atkStages : defStages;
        const targetMon = move.stat.target === 'self' ? attacker : defender;
        targetStages[move.stat.key] = Math.max(-4, Math.min(4, targetStages[move.stat.key] + move.stat.delta));
        const statName = move.stat.key === 'atkStage' ? 'Útok' : 'Obrana';
        const dirTxt = move.stat.delta > 0 ? 'vzrostla' : 'klesla';
        audio.sfx('blip');
        this.pushLog(`${statName} (${targetMon.nickname}) ${dirTxt}!`, onDone);
        return;
      }
      if (move.status) {
        if (defender.status) {
          this.pushLog(`Ale neuspělo to!`, onDone);
        } else {
          defender.status = move.status.type;
          if (move.status.type === 'SLP') defender.sleepTurns = 1 + Math.floor(Math.random() * 2);
          audio.sfx('hit');
          this.pushLog(`${defender.nickname} získal stav ${defender.status}!`, onDone);
        }
        return;
      }
    }

    // Damage calculation
    const atkMult = Math.pow(1.25, atkStages.atkStage);
    const defMult = Math.pow(1.25, defStages.defStage);
    const spAtk = MONSTERS[attacker.speciesId];
    const spDef = MONSTERS[defender.speciesId];

    const stab = spAtk.types.includes(move.type) ? 1.5 : 1.0;
    const eff = getTypeEffectiveness(move.type, spDef.types);
    const crit = Math.random() < (move.highCrit ? 0.18 : 0.06) ? 1.5 : 1.0;
    const burnMult = attacker.status === 'BRN' && move.cat === 'phys' ? 0.7 : 1.0;
    const rand = 0.88 + Math.random() * 0.12;

    let dmg = Math.floor(
      (((2 * attacker.level) / 5 + 2) * move.power * ((attacker.atk * atkMult) / Math.max(1, defender.def * defMult)) / 42 + 2) *
      stab * eff * crit * burnMult * rand
    );
    if (eff === 0) dmg = 0;
    else if (dmg < 1) dmg = 1;

    defender.hp = Math.max(0, defender.hp - dmg);
    if (isPlayer) this.enemyFlash = 14;
    else this.playerFlash = 14;

    if (eff >= 2) audio.sfx('superHit');
    else audio.sfx('hit');

    if (eff === 0) this.pushLog(`Nemá to žádný účinek!`);
    else {
      if (crit > 1) this.pushLog(`Kritický zásah!`);
      if (eff >= 2) this.pushLog(`Je to super účinné!`);
      else if (eff < 1) this.pushLog(`Není to moc účinné...`);
    }

    if (move.drain && dmg > 0) {
      const heal = Math.max(1, Math.floor(dmg * move.drain));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      this.pushLog(`${attacker.nickname} vysál energii!`);
    }

    if (move.status && defender.hp > 0 && !defender.status && Math.random() < move.status.chance) {
      defender.status = move.status.type;
      if (move.status.type === 'SLP') defender.sleepTurns = 1 + Math.floor(Math.random() * 2);
      this.pushLog(`${defender.nickname} dostal stav ${defender.status}!`);
    }

    if (move.recoil && dmg > 0) {
      const rec = Math.max(1, Math.floor(attacker.maxHp * move.recoil));
      attacker.hp = Math.max(0, attacker.hp - rec);
      this.pushLog(`${attacker.nickname} utrpěl zpětný ráz!`);
    }

    this.pushLog('', onDone);
  }

  endOfTurnEffects() {
    const applyDot = (mon) => {
      if (mon.hp > 0 && (mon.status === 'PSN' || mon.status === 'BRN')) {
        const dot = Math.max(1, Math.floor(mon.maxHp / 8));
        mon.hp = Math.max(0, mon.hp - dot);
        this.pushLog(`${mon.nickname} ztrácí HP kvůli ${mon.status === 'PSN' ? 'jedu' : 'popálení'}!`);
      }
    };
    applyDot(this.playerMon);
    applyDot(this.foe);

    if (this.foe.hp <= 0) {
      this.handleEnemyFainted();
    } else if (this.playerMon.hp <= 0) {
      this.handlePlayerFainted();
    } else {
      this.pushLog('', () => {
        this.menu = 'main';
        this.cursor = 0;
      });
    }
    this.nextLog();
  }

  handleEnemyFainted() {
    const foe = this.foe;
    const sp = MONSTERS[foe.speciesId];
    const baseXp = Math.floor((sp.expYield * foe.level) / 4) * (this.isTrainer ? 1.4 : 1);
    const xpGain = Math.max(12, Math.floor(baseXp));

    this.pushLog(`Nepřátelský ${foe.nickname} byl poražen!`);
    this.awardExp(this.playerMon, xpGain, true);

    if (this.game.state.options.expShare) {
      for (let i = 0; i < this.game.state.party.length; i++) {
        const ally = this.game.state.party[i];
        if (i !== this.playerIdx && ally.hp > 0) {
          this.awardExp(ally, Math.max(6, Math.floor(xpGain * 0.5)), false);
        }
      }
    }

    // Check next enemy in trainer party
    const nextIdx = this.enemyParty.findIndex((m, idx) => idx > this.enemyIdx && m.hp > 0);
    if (nextIdx >= 0) {
      this.enemyIdx = nextIdx;
      this.enemyStages = { atkStage: 0, defStage: 0 };
      const nextFoe = this.foe;
      this.game.markSeen(nextFoe.speciesId);
      this.pushLog(`${this.trainerData.name} posílá: ${nextFoe.nickname}!`, () => {
        this.menu = 'main';
        this.cursor = 0;
      });
    } else {
      if (this.isTrainer) {
        const t = this.trainerData;
        this.game.state.defeatedTrainers[t.npcId] = true;
        this.game.state.money += t.reward;
        this.pushLog(t.defeat);
        this.pushLog(`Získal jsi ${t.reward} G za vítězství!`);
        if (t.badge && !this.game.state.badges.includes(t.badge)) {
          this.game.state.badges.push(t.badge);
          audio.sfx('catchSuccess');
          this.pushLog(`🏆 Získal jsi: ${t.badge}!`);
        }
      }
      this.pushLog('', () => this.finishBattle(true));
    }
    this.nextLog();
  }

  awardExp(mon, amount, verbose) {
    mon.exp += amount;
    if (verbose) this.pushLog(`${mon.nickname} získal ${amount} XP!`);
    while (mon.exp >= mon.nextExp) {
      mon.level++;
      mon.nextExp = expForLevel(mon.level + 1);
      const oldMax = mon.maxHp;
      const stats = calcStats(mon.speciesId, mon.level);
      mon.maxHp = stats.maxHp;
      mon.atk = stats.atk;
      mon.def = stats.def;
      mon.spd = stats.spd;
      mon.hp += Math.max(1, mon.maxHp - oldMax);
      audio.sfx('levelUp');
      this.pushLog(`⬆️ ${mon.nickname} dosáhl úrovně ${mon.level}!`);

      // Check new moves
      const sp = MONSTERS[mon.speciesId];
      if (sp.learnset[mon.level]) {
        for (const mId of sp.learnset[mon.level]) {
          if (!mon.moves.some((m) => m.id === mId)) {
            if (mon.moves.length >= 4) mon.moves.shift();
            mon.moves.push({ id: mId, pp: MOVES[mId].pp });
            this.pushLog(`${mon.nickname} se naučil ${MOVES[mId].name}!`);
          }
        }
      }

      // Check evolution
      if (sp.evolve && mon.level >= sp.evolve.level) {
        const newSp = MONSTERS[sp.evolve.to];
        const oldName = mon.nickname;
        mon.speciesId = sp.evolve.to;
        mon.nickname = newSp.name;
        const newStats = calcStats(mon.speciesId, mon.level);
        mon.hp += Math.max(0, newStats.maxHp - mon.maxHp);
        mon.maxHp = newStats.maxHp;
        mon.atk = newStats.atk;
        mon.def = newStats.def;
        mon.spd = newStats.spd;
        this.game.markSeen(mon.speciesId);
        this.game.markCaught(mon.speciesId);
        audio.sfx('evolve');
        this.pushLog(`✨ Co se to děje?! ${oldName} se vyvinul v ${newSp.name}!`);
      }
    }
  }

  handlePlayerFainted() {
    this.pushLog(`${this.playerMon.nickname} byl vyřazen!`);
    const aliveIdx = this.game.state.party.findIndex((m) => m.hp > 0);
    if (aliveIdx >= 0) {
      this.pushLog('Vyber další příšerku do boje!', () => {
        this.menu = 'party';
        this.cursor = aliveIdx;
      });
    } else {
      this.pushLog('Všechny tvé příšerky jsou vyřazené! Spěcháš do Léčebného centra...', () => {
        this.finishBattle(false, true);
      });
    }
    this.nextLog();
  }

  finishBattle(won, blackout = false) {
    this.active = false;
    if (blackout) {
      this.game.blackoutRecover();
    } else {
      this.game.playMapBgm();
    }
  }

  draw(ctx) {
    const W = 480;
    const H = 360;

    // Battle background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, '#81e6d9');
    grad.addColorStop(0.65, '#c6f6d5');
    grad.addColorStop(1, '#9ae6b4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 244);

    // Platforms
    ctx.fillStyle = '#68d391';
    ctx.beginPath();
    ctx.ellipse(355, 136, 86, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(125, 224, 96, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Enemy sprite or Orb animation
    const foe = this.foe;
    if (this.orbAnim) {
      const shakeOffset = (this.orbAnim.timer % 12 < 6 && this.orbAnim.shakesDone < this.orbAnim.targetShakes) ? 4 : -4;
      ctx.fillStyle = '#1a202c';
      ctx.fillRect(343 + shakeOffset, 106, 24, 24);
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(345 + shakeOffset, 108, 20, 9);
      ctx.fillStyle = '#fff';
      ctx.fillRect(345 + shakeOffset, 119, 20, 9);
    } else if (foe.hp > 0 || this.enemyFlash > 0) {
      drawMonsterSprite(ctx, foe.speciesId, 308, 44, 96, foe.shiny, true, this.enemyFlash % 4 >= 2);
      if (this.shinySparkle > 0 && this.shinySparkle % 6 < 3) {
        ctx.fillStyle = '#f6e05e';
        ctx.fillRect(300, 48, 8, 8);
        ctx.fillRect(404, 72, 8, 8);
        ctx.fillRect(350, 32, 6, 6);
      }
    }

    // Player monster sprite
    const pMon = this.playerMon;
    if (pMon.hp > 0 || this.playerFlash > 0) {
      drawMonsterSprite(ctx, pMon.speciesId, 72, 126, 108, pMon.shiny, false, this.playerFlash % 4 >= 2);
    }

    // Enemy HUD
    this.drawHudBox(ctx, 18, 18, 210, 58, foe, false);
    // Player HUD
    this.drawHudBox(ctx, 250, 174, 214, 66, pMon, true);

    // Bottom UI panel
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 244, W, 116);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 248, W - 8, 108);

    if (this.menu === 'busy') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px monospace';
      this.drawWrappedText(ctx, this.currentLog, 20, 282, W - 40, 22);
    } else if (this.menu === 'main') {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`Co udělá ${pMon.nickname}?`, 18, 280);

      const opts = ['⚔️ BOJ', '🎒 BATOH', '🐾 TÝM', '🏃 ÚTĚK'];
      for (let i = 0; i < 4; i++) {
        const bx = 246 + (i % 2) * 112;
        const by = 262 + Math.floor(i / 2) * 40;
        const sel = this.cursor === i;
        ctx.fillStyle = sel ? '#2b6cb0' : '#2d3748';
        ctx.fillRect(bx, by, 104, 32);
        ctx.strokeStyle = sel ? '#f6e05e' : '#4a5568';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, 104, 32);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(opts[i], bx + 12, by + 21);
      }
    } else if (this.menu === 'fight') {
      const foeTypes = MONSTERS[foe.speciesId].types;
      pMon.moves.forEach((slot, i) => {
        const m = MOVES[slot.id];
        const pp = slot.pp === null ? m.pp : slot.pp;
        const bx = 14 + (i % 2) * 226;
        const by = 256 + Math.floor(i / 2) * 46;
        const sel = this.cursor === i;
        ctx.fillStyle = sel ? '#2b6cb0' : '#2d3748';
        ctx.fillRect(bx, by, 218, 40);
        ctx.strokeStyle = sel ? '#f6e05e' : '#4a5568';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, 218, 40);

        ctx.fillStyle = TYPES[m.type].color;
        ctx.fillRect(bx + 6, by + 6, 8, 28);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(m.name, bx + 20, by + 19);

        ctx.fillStyle = '#cbd5e0';
        ctx.font = '11px monospace';
        const eff = m.cat === 'status' ? '' : getTypeEffectiveness(m.type, foeTypes);
        const effTxt = eff === 2 ? ' [2x]' : eff >= 4 ? ' [4x]' : eff === 0.5 ? ' [½]' : eff === 0 ? ' [0x]' : '';
        ctx.fillText(`${TYPES[m.type].name}  PP:${pp}/${m.pp}${effTxt}`, bx + 20, by + 34);
      });
    } else if (this.menu === 'bag') {
      ctx.fillStyle = '#f6e05e';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('BATOH (Z = Použít, X = Zpět)', 18, 266);
      const start = Math.max(0, this.cursor - 2);
      const slice = this.bagItems.slice(start, start + 3);
      slice.forEach((entry, idx) => {
        const realIdx = start + idx;
        const y = 276 + idx * 24;
        ctx.fillStyle = realIdx === this.cursor ? '#2b6cb0' : 'transparent';
        ctx.fillRect(14, y, W - 28, 22);
        ctx.fillStyle = '#fff';
        ctx.font = '13px monospace';
        ctx.fillText(`${realIdx === this.cursor ? '▶ ' : '  '}${entry.def.name} x${entry.count}`, 20, y + 16);
      });
    } else if (this.menu === 'party') {
      ctx.fillStyle = '#f6e05e';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('VYBER PŘÍŠERKU (Z = Vyměnit, X = Zpět)', 18, 266);
      const party = this.game.state.party;
      party.forEach((m, i) => {
        const bx = 14 + (i % 2) * 228;
        const by = 274 + Math.floor(i / 2) * 26;
        ctx.fillStyle = i === this.cursor ? '#2b6cb0' : '#2d3748';
        ctx.fillRect(bx, by, 220, 22);
        ctx.fillStyle = m.hp > 0 ? '#fff' : '#fc8181';
        ctx.font = '12px monospace';
        ctx.fillText(`${m.nickname} Lv${m.level} (${m.hp}/${m.maxHp})`, bx + 8, by + 15);
      });
    }
  }

  drawHudBox(ctx, x, y, w, h, mon, showXp) {
    ctx.fillStyle = '#f7fafc';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#1a202c';
    ctx.font = 'bold 13px monospace';
    const shinyMark = mon.shiny ? '★' : '';
    ctx.fillText(`${mon.nickname}${shinyMark}`, x + 10, y + 18);
    ctx.fillText(`Lv.${mon.level}`, x + w - 52, y + 18);

    if (mon.status) {
      ctx.fillStyle = '#d69e2e';
      ctx.fillRect(x + w - 92, y + 7, 34, 14);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(mon.status, x + w - 86, y + 17);
    }

    // HP Bar
    const barW = w - 20;
    const ratio = Math.max(0, mon.hp / mon.maxHp);
    ctx.fillStyle = '#cbd5e0';
    ctx.fillRect(x + 10, y + 26, barW, 10);
    ctx.fillStyle = ratio > 0.5 ? '#48bb78' : ratio > 0.2 ? '#ecc94b' : '#f56565';
    ctx.fillRect(x + 10, y + 26, Math.floor(barW * ratio), 10);

    if (showXp) {
      ctx.fillStyle = '#2d3748';
      ctx.font = '11px monospace';
      ctx.fillText(`HP ${mon.hp}/${mon.maxHp}`, x + 10, y + 50);

      const curLvExp = expForLevel(mon.level);
      const span = Math.max(1, mon.nextExp - curLvExp);
      const xpRatio = Math.min(1, Math.max(0, (mon.exp - curLvExp) / span));
      ctx.fillStyle = '#cbd5e0';
      ctx.fillRect(x + 10, y + 56, barW, 5);
      ctx.fillStyle = '#4299e1';
      ctx.fillRect(x + 10, y + 56, Math.floor(barW * xpRatio), 5);
    }
  }

  drawWrappedText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let cy = y;
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, cy);
        line = w + ' ';
        cy += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, cy);
  }
}
