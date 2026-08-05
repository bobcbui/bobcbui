/* ============================================================================
 * 关卡系统：开局、波次推进、通关/战败结算、返回主页
 * 每关 5 波（wavesPerStage），第 5 波 Boss；波次间 2 秒休整；
 * 局内等级每关从 1 级重置（startRun），总等级/通关进度跨关保留。
 * ========================================================================== */

import { P, startRun, addTotalXp, gameStarted, runFinished, setGameStarted, setRunFinished, setWaveNum, waveNum, wavePending, setWavePending } from '@/core/state.js';
import { PROGRESSION } from '@/data/index.js';
import { bus } from '@/core/events.js';
import { getEl } from '@/core/dom.js';
import { genEquipment, getRarityLabel } from '@/core/equipment.js';

const WAVE_REST_SEC = 2;

export class StageSystem {
  constructor(scene) {
    this.scene = scene;
    this.waveTimer = 0;
    this.startTimer = null;
    this.isStarting = false;
  }

  /** 进入关卡：重置局内状态并生成第 1 波 */
  start(stageLevel) {
    if (this.isStarting || gameStarted) return;
    this.isStarting = true;
    this.scene.runPaused = true;
    this.waveTimer = 0;
    getEl('mainMenu')?.classList.add('hidden');
    getEl('resultPanel')?.classList.add('hidden');
    getEl('cardPanel')?.classList.add('hidden');
    const loading = getEl('battleLoading');
    const loadingText = getEl('battleLoadingText');
    if (loadingText) loadingText.textContent = '正在加载第 ' + stageLevel + ' 关...';
    loading?.classList.remove('hidden');
    this.startTimer = setTimeout(() => {
      this.startTimer = null;
      this.isStarting = false;
      startRun(stageLevel);
      this.scene.clearEnemies();
      this.scene.runPaused = false;
      this.scene.playerDead = false;
      this.scene.player.setPosition(this.scene.worldSize / 2, this.scene.playerBaseY);
      loading?.classList.add('hidden');
      bus.emit('hud-refresh');
      this.spawnWave(1);
      bus.emit('status', '⚔️ 第 ' + stageLevel + ' 关 开战！', 2);
      bus.emit('save');
    }, 260);
  }

  /** 波次推进：由 update 在敌人清空后调用 */
  spawnWave(wn) {
    const wavesPer = PROGRESSION.wavesPerStage;
    if (wn > wavesPer) {
      this.completeStage();
      return;
    }
    setWaveNum(wn);
    this.scene.spawnSystem.spawnWave(wn, P.stageLevel);
    setWavePending(false);
    if (wn === wavesPer) bus.emit('status', '👑 Boss 来袭！', 2.5);
    else bus.emit('status', '⚔️ 第 ' + wn + '/' + wavesPer + ' 波来袭！', 1.5);
    bus.emit('hud-refresh');
  }

  update(dt) {
    if (!gameStarted) return;
    if (this.scene.spawnSystem?.isSpawning()) return;
    const alive = this.scene.enemies.countActive(true);
    if (alive > 0) return;

    if (!wavePending) {
      setWavePending(true);
      this.waveTimer = 0;
    } else {
      this.waveTimer += dt;
      if (this.waveTimer >= WAVE_REST_SEC) {
        this.spawnWave(waveNum + 1);
      }
    }
  }

  /** 通关：结算总经验、解锁下一关、显示结算面板 */
  completeStage() {
    if (runFinished) return;
    setRunFinished(true);
    setGameStarted(false);
    this.scene.runPaused = true;
    this.scene.clearEnemies();

    const stage = P.stageLevel;
    const xpGain = PROGRESSION.clearXpBase + stage * PROGRESSION.clearXpPerStage;
    const wasNewRecord = stage > P.maxClearedStage;
    this.dropEquipment(stage, true);
    P.maxClearedStage = Math.max(P.maxClearedStage, stage);
    addTotalXp(xpGain);
    bus.emit('save');
    bus.emit('check-achievements');

    const title = getEl('resultTitle');
    const stats = getEl('resultStats');
    const xpEl = getEl('resultXp');
    if (title) title.textContent = wasNewRecord ? '🏆 通关！第 ' + stage + ' 关' : '✅ 通关！';
    if (stats) stats.textContent = '击杀 ' + P.kills + ' 只 · 局内等级 Lv.' + P.level;
    if (xpEl) xpEl.textContent = '+' + xpGain;
    getEl('resultPanel')?.classList.remove('hidden');
  }

  /** 战败：结算总经验、显示结算面板 */
  failStage(reason = '护体被击破') {
    if (runFinished) return;
    setRunFinished(true);
    setGameStarted(false);
    this.scene.runPaused = true;

    const xpGain = P.kills * PROGRESSION.failXpPerKill + waveNum * PROGRESSION.failXpPerWave;
    addTotalXp(xpGain);
    this.dropEquipment(P.stageLevel, false);
    bus.emit('save');
    bus.emit('check-achievements');

    const title = getEl('resultTitle');
    const stats = getEl('resultStats');
    const xpEl = getEl('resultXp');
    if (title) title.textContent = '💀 战败';
    if (stats) stats.textContent = reason + ' · 击杀 ' + P.kills + ' 只 · 止步第 ' + waveNum + ' 波';
    if (xpEl) xpEl.textContent = '+' + xpGain;
    getEl('resultPanel')?.classList.remove('hidden');
  }

  /** 结算装备掉落：通关必得 1 件，战败 30% 概率 */
  dropEquipment(stageLevel, isClear) {
    if (!isClear && Math.random() >= 0.3) return;
    if (P.inventory.length >= 30) { bus.emit('status', '背包已满，装备掉落未拾取', 1.5); return; }
    const eq = genEquipment(stageLevel);
    P.inventory.push(eq);
    bus.emit('loot', '🎁 获得 [' + getRarityLabel(eq.rarity) + '] ' + eq.name);
    bus.emit('status', '装备已入背包', 1.5);
    bus.emit('save');
  }

  /** 返回主页：清场、显示主页并刷新数据 */
  backToMenu() {
    if (this.startTimer) {
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
    this.isStarting = false;
    this.scene.clearEnemies();
    this.scene.runPaused = true;
    setGameStarted(false);
    setRunFinished(false);
    getEl('resultPanel')?.classList.add('hidden');
    getEl('cardPanel')?.classList.add('hidden');
    getEl('battleLoading')?.classList.add('hidden');
    window.location.href = 'index.html';
  }
}
