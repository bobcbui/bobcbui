import { G, gameOver, levelActive, cardDrawPhase } from '../core/state.js';
import { getMonsterDef, getMonsterHP, getMonsterDamage } from '../data/monsters.js';

export class SpawnSystem {
  constructor(scene) {
    this.scene = scene;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1.2;
    this.spawning = false;
  }

  startLevel(config) {
    this.spawnQueue = [];
    this.spawnInterval = config.interval || 1.2;
    this.spawnTimer = 0;
    this.spawning = true;

    let delay = 0;
    for (const entry of config.monsters) {
      for (let i = 0; i < entry.count; i++) {
        this.spawnQueue.push({ type: entry.type, delay: delay });
        delay += this.spawnInterval * 0.5;
      }
    }
  }

  update(dt) {
    if (gameOver || !levelActive || cardDrawPhase || !this.spawning) return;

    this.spawnTimer += dt;

    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      if (this.spawnTimer >= this.spawnQueue[i].delay) {
        this.spawnMonster(this.spawnQueue[i].type);
        this.spawnQueue.splice(i, 1);
      }
    }

    if (this.spawnQueue.length === 0) {
      this.spawning = false;
    }
  }

  spawnMonster(type) {
    const w = this.scene.scale.width;
    const def = getMonsterDef(type);
    const hp = getMonsterHP(type, G.stage, G.level);
    const dmg = getMonsterDamage(type, G.stage);

    const x = Phaser.Math.Between(60, w - 60);
    const y = -30;

    const tex = 'monster-' + type;
    const enemy = this.scene.physics.add.sprite(x, y, tex);
    enemy.setDepth(5);
    enemy.setData('type', type);
    enemy.setData('hp', hp);
    enemy.setData('maxHp', hp);
    enemy.setData('speed', def.speed);
    enemy.setData('damage', dmg);
    enemy.setData('frozen', 0);
    enemy.setData('gold', def.gold);
    enemy.setData('boss', type === 'boss');
    enemy.setDisplaySize(def.scale * 28, def.scale * 28);

    this.scene.enemies.add(enemy);
  }

  clearAll() {
    this.spawnQueue = [];
    this.spawning = false;
    this.spawnTimer = 0;
    this.scene.enemies.clear(true, true);
  }
}
