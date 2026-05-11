import { G, waveActive, waveIntermission, waveIntermissionTimer, gameOver,
  setWaveActive, setWaveIntermission, setWaveTimer, setWaveIntermissionTimer,
  setWaveMonstersRemaining, setWaveMonstersTotal, setGameOver,
  initState, recalcStats } from './state.js';
import { SKILL_DEFS } from '../data/index.js';
import { installSceneSystems } from '../systems/index.js';
import { bus } from './events.js';
import { loadGame, saveGame } from './save.js';
import { setScene, setSkillCooldowns } from './runtime.js';
import { createGeneratedTextures } from './textures.js';
import { renderHUD, renderSkillBar, renderUpgradePanel, renderGameOver } from '../ui/index.js';
import { updateSkillCooldowns } from '../ui/skill-bar.js';

export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'main' });
  }

  preload() {
    createGeneratedTextures(this);
  }

  create() {
    setScene(this);
    const w = this.scale.width;
    const h = this.scale.height;

    initState();
    loadGame();
    G.hp = G.maxHp;

    this.physics.world.setBounds(0, 0, w, h);

    this.player = this.physics.add.sprite(w / 2, h - 60, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setImmovable(true);
    this.playerDead = false;

    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();

    this._projectilePool = [];
    this._maxPoolSize = 80;

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

    this._attackTimer = 0;

    this._damageTexts = [];
    this._damageTextPool = [];

    installSceneSystems(this);

    setWaveIntermissionTimer(3);
    setWaveIntermission(true);

    renderHUD();
    renderSkillBar();

    bus.emit('hud-refresh');
    bus.emit('skillbar-refresh');
  }

  startNewWave() {
    if (gameOver) return;
    G.wave++;
    const config = this.getWaveConfig(G.wave);
    this.spawnSystem.startWave(config);
    setWaveActive(true);
    setWaveIntermission(false);
    bus.emit('status', '第 ' + G.wave + ' 波妖兽来袭！', 2);
  }

  getWaveConfig(waveNum) {
    const isBoss = waveNum % 5 === 0;
    const baseCount = 5 + Math.floor(waveNum * 1.5);
    const monsters = [];
    if (isBoss) {
      monsters.push({ type: 'boss', count: 1 });
      monsters.push({ type: 'common', count: baseCount - 1 });
    } else {
      monsters.push({ type: 'common', count: Math.floor(baseCount * 0.5) });
      monsters.push({ type: 'fast', count: Math.floor(baseCount * 0.3) });
      if (waveNum >= 3) {
        monsters.push({ type: 'tank', count: Math.floor(baseCount * 0.2) });
      }
    }
    const totalMonsters = monsters.reduce((s, m) => s + m.count, 0);
    setWaveMonstersTotal(totalMonsters);
    setWaveMonstersRemaining(totalMonsters);
    return {
      monsters,
      interval: Math.max(0.3, 1.5 - waveNum * 0.05)
    };
  }

  onMonsterKilled(type, goldReward) {
    G.kills++;
    G.gold += goldReward;
    G.score += goldReward * 10;

    setWaveMonstersRemaining(waveMonstersRemaining - 1);

    bus.emit('hud-refresh');

    if (waveActive && waveMonstersRemaining <= 0 && !this.spawnSystem.spawning && this.enemies.countActive(true) <= 0) {
      this.onWaveComplete();
    }
  }

  onWaveComplete() {
    setWaveActive(false);
    setWaveIntermission(true);
    setWaveIntermissionTimer(5);
    G.gold += 50 + G.wave * 10;
    bus.emit('status', '第 ' + G.wave + ' 波已击退！', 2);
    bus.emit('hud-refresh');
    bus.emit('save');
    renderUpgradePanel();
  }

  startNextWave() {
    const panel = document.getElementById('upgrade-panel');
    if (panel) panel.classList.add('hidden');
    this.startNewWave();
    renderSkillBar();
  }

  onPlayerDeath() {
    setGameOver(true);
    this.playerDead = true;
    this.player.setTint(0x666666);
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    bus.emit('save');
    renderGameOver();
  }

  restartGame() {
    this.playerDead = false;
    this.player.clearTint();
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    initState();
    G.hp = G.maxHp;
    this.skillCooldowns = {};
    for (const sk of SKILL_DEFS) {
      this.skillCooldowns[sk.id] = 0;
    }
    setSkillCooldowns(this.skillCooldowns);
    renderHUD();
    renderSkillBar();
    renderUpgradePanel();
    this.startNewWave();
    bus.emit('hud-refresh');
    bus.emit('skillbar-refresh');
  }

  spawnDamageText(x, y, value, color) {
    let txt = this._damageTextPool.pop();
    if (!txt) {
      txt = this.add.text(x, y, '', {
        fontSize: '16px',
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
      y: y - 50,
      alpha: 0,
      scale: 1.3,
      duration: 800,
      onComplete: () => {
        txt.setVisible(false);
        this._damageTextPool.push(txt);
      }
    });
  }

  update(time, delta) {
    if (gameOver) return;

    const dt = delta / 1000;

    if (waveIntermission) {
      let t = waveIntermissionTimer - dt;
      if (t <= 0) {
        t = 0;
        this.startNextWave();
      }
      setWaveIntermissionTimer(t);
      if (t > 0) {
        renderUpgradePanel();
      }
      return;
    }

    if (waveActive && !this.playerDead) {
      this.spawnSystem.update(dt);
      this.movementSystem.update(dt);
      this.projectileSystem.update(time, dt);
      this.combatSystem.update(dt);
      this.skillSystem.update(dt, time);
    }

    updateSkillCooldowns();

    this.updateDamageTexts();

    if (Math.floor(time / 500) !== this._lastHudTick) {
      this._lastHudTick = Math.floor(time / 500);
      bus.emit('hud-refresh');
    }
  }

  updateDamageTexts() {
  }
}

MainScene.prototype._lastHudTick = 0;
