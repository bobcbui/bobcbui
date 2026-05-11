import { G, gameOver, levelActive, levelIntermission, cardDrawPhase,
  setLevelActive, setLevelIntermission, setGameOver, setCardDrawPhase,
  initGameState, recalcStats } from './state.js';
import { SKILL_DEFS, generateCards, applyCard } from '../data/index.js';
import { installSceneSystems } from '../systems/index.js';
import { bus } from './events.js';
import { loadGame, saveGame } from './save.js';
import { setScene, setSkillCooldowns } from './runtime.js';
import { createSVGTextures } from './textures.js';
import { renderHUD, renderSkillList, renderCardDraw, renderLevelIntro, renderGameOver, renderStageComplete } from '../ui/index.js';

export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'main' });
  }

  preload() {
    createSVGTextures(this);
  }

  create() {
    setScene(this);
    const w = this.scale.width;
    const h = this.scale.height;

    initGameState();
    loadGame();
    G.hp = G.maxHp;
    recalcStats();

    this.physics.world.setBounds(0, 0, w, h);

    this.player = this.physics.add.sprite(w / 2, h - 70, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setImmovable(true);
    this.player.setDisplaySize(36, 48);
    this.playerDead = false;

    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();

    this._projPool = [];
    this._attackTimer = 0;
    this._shieldHP = 0;
    this._damageTextPool = [];
    this.monstersRemaining = 0;
    this._lastHudTick = 0;
    this._lastSkillTick = 0;

    this.physics.add.overlap(this.projectiles, this.enemies, (proj, enemy) => {
      this.combatSystem.onProjHit(proj, enemy);
    }, null, this);

    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      this.combatSystem.onEnemyReachPlayer(enemy);
    }, null, this);

    this.skillCooldowns = {};
    for (const sk of SKILL_DEFS) {
      this.skillCooldowns[sk.id] = 0;
    }
    setSkillCooldowns(this.skillCooldowns);

    installSceneSystems(this);

    renderHUD();
    renderSkillList();

    this.time.delayedCall(800, () => {
      this.startNewLevel();
    });

    bus.emit('hud-refresh');
    bus.emit('skillbar-refresh');
  }

  startNewLevel() {
    if (gameOver) return;

    setCardDrawPhase(false);
    setLevelIntermission(false);
    setLevelActive(true);

    const config = this.getLevelConfig(G.stage, G.level);
    this.spawnSystem.startLevel(config);
    this.monstersRemaining = config.total;

    renderHUD();
    renderSkillList();
    bus.emit('hud-refresh');
    bus.emit('status', '第' + G.stage + '关 ' + G.level + '/20', 2);
  }

  getLevelConfig(stage, level) {
    const isBoss = level % 5 === 0 || level === 20;
    const mul = 1 + (stage - 1) * 0.5;
    const baseCount = 4 + Math.floor(level * 0.8 * mul);
    const monsters = [];

    if (isBoss) {
      monsters.push({ type: 'boss', count: Math.max(1, Math.floor(stage * 0.5)) });
      const remaining = Math.max(0, baseCount - 1);
      if (remaining > 0) monsters.push({ type: 'small', count: remaining });
    } else {
      monsters.push({ type: 'small', count: Math.ceil(baseCount * 0.5) });
      monsters.push({ type: 'fast', count: Math.ceil(baseCount * 0.3) });
      if (level >= 3) monsters.push({ type: 'tank', count: Math.ceil(baseCount * 0.2) });
    }

    const total = monsters.reduce((s, m) => s + m.count, 0);
    return { monsters, total, interval: Math.max(0.4, 1.5 - level * 0.03) };
  }

  checkLevelComplete() {
    if (!levelActive || gameOver || cardDrawPhase) return;
    if (this.monstersRemaining <= 0 && !this.spawnSystem.spawning && this.enemies.countActive(true) <= 0) {
      this.onLevelComplete();
    }
  }

  onLevelComplete() {
    setLevelActive(false);
    setLevelIntermission(true);

    G.score += 50 + G.level * 20;

    bus.emit('save');

    if (G.level >= 20) {
      this.onStageComplete();
    } else {
      this.showCardDraw();
    }
  }

  showCardDraw() {
    setCardDrawPhase(true);
    const cards = generateCards(G.skills);
    renderCardDraw(cards);
  }

  onCardChosen(card) {
    applyCard(card, G);
    recalcStats();

    G.level++;
    setCardDrawPhase(false);

    renderHUD();
    renderSkillList();
    bus.emit('hud-refresh');
    bus.emit('skillbar-refresh');

    this.time.delayedCall(800, () => {
      this.startNewLevel();
    });
  }

  onStageComplete() {
    setLevelActive(false);
    setLevelIntermission(true);
    setCardDrawPhase(false);

    G.stage++;
    G.level = 1;

    renderStageComplete();
    bus.emit('save');
  }

  startNextStage() {
    G.level = 1;
    renderHUD();
    renderSkillList();
    this.time.delayedCall(500, () => {
      this.startNewLevel();
    });
  }

  onPlayerDeath() {
    setGameOver(true);
    setLevelActive(false);
    setCardDrawPhase(false);
    this.playerDead = true;
    this.player.setTint(0x666666);
    this.spawnSystem.clearAll();
    this.projectileSystem.clearAll();
    this.cameras.main.shake(300, 0.01);
    bus.emit('save');
    bus.emit('hud-refresh');
    renderGameOver();
  }

  restartGame() {
    this.playerDead = false;
    this.player.clearTint();
    this.spawnSystem.clearAll();
    this.projectileSystem.clearAll();
    this._shieldHP = 0;
    this._attackTimer = 0;

    initGameState();
    loadGame();
    G.hp = G.maxHp;
    G.level = 1;
    G.score = 0;
    G.kills = 0;
    recalcStats();

    this.skillCooldowns = {};
    for (const sk of SKILL_DEFS) {
      this.skillCooldowns[sk.id] = 0;
    }
    setSkillCooldowns(this.skillCooldowns);

    renderHUD();
    renderSkillList();
    bus.emit('hud-refresh');
    bus.emit('skillbar-refresh');

    this.time.delayedCall(500, () => this.startNewLevel());
  }

  spawnDamageText(x, y, value, color) {
    let txt = this._damageTextPool.pop();
    if (!txt) {
      txt = this.add.text(x, y, '', {
        fontSize: '14px',
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 2
      }).setDepth(20);
    } else {
      txt.setVisible(true);
      txt.setPosition(x, y);
    }
    txt.setText(value);
    txt.setColor(color || '#ffffff');
    txt.setAlpha(1);
    txt.setScale(1);
    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      scale: 1.2,
      duration: 700,
      onComplete: () => {
        txt.setVisible(false);
        this._damageTextPool.push(txt);
      }
    });
  }

  _drawLightning(x1, y1, x2, y2) {
    const gfx = this.add.graphics().setDepth(16);
    gfx.lineStyle(2, 0xffff44, 0.9);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    for (let i = 1; i <= 5; i++) {
      const t = i / 5;
      const tx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 20;
      const ty = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 20;
      gfx.lineTo(tx, ty);
    }
    gfx.strokePath();
    this.time.delayedCall(150, () => gfx.destroy());
  }

  addGlowTrail(proj) {
    if (!proj || !proj.active) return;
    const glow = this.add.circle(proj.x, proj.y, 8, 0x88ccff, 0.5).setDepth(7);
    const follow = () => {
      if (!proj.active || !glow.active) { glow.destroy(); return; }
      glow.setPosition(proj.x, proj.y);
      glow.setAlpha(glow.alpha * 0.9);
      glow.setScale(glow.scale * 0.95);
      this.time.delayedCall(30, follow);
    };
    this.time.delayedCall(30, follow);
  }

  autoCastSkills() {
    if (!levelActive || this.playerDead) return;
    const skills = G.skills;
    if (skills.length === 0) return;
    for (const skill of skills) {
      const cd = this.skillCooldowns[skill.id] || 0;
      if (cd > 0) continue;

      if (skill.id === 'heal') {
        if (G.hp < G.maxHp * 0.5) this.skillSystem.tryUseSkill(skill.id);
        continue;
      }
      if (skill.id === 'shield') {
        if (this._shieldHP <= 0) this.skillSystem.tryUseSkill(skill.id);
        continue;
      }

      this.skillSystem.tryUseSkill(skill.id);
    }
  }

  update(time, delta) {
    if (gameOver) return;

    const dt = delta / 1000;

    if (levelActive && !this.playerDead) {
      this.spawnSystem.update(dt);
      this.movementSystem.update(dt);
      this.projectileSystem.update(time, dt);
      this.combatSystem.update(dt);
      this.skillSystem.updateAllCooldowns(dt);
      this.autoCastSkills();
    }

    if (Math.floor(time / 400) !== this._lastHudTick) {
      this._lastHudTick = Math.floor(time / 400);
      bus.emit('hud-refresh');
    }
    if (Math.floor(time / 800) !== this._lastSkillTick) {
      this._lastSkillTick = Math.floor(time / 800);
      bus.emit('skillbar-refresh');
    }
  }
}
