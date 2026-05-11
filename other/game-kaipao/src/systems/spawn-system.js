import { G, gameOver, waveActive, waveMonstersTotal, setWaveMonstersTotal } from '../core/state.js';
import { getMonsterDef, getMonsterHP, getMonsterDamage } from '../data/monsters.js';

export class SpawnSystem {
  constructor(scene) {
    this.scene = scene;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1.0;
    this.spawning = false;
  }

  startWave(config) {
    this.spawnQueue = [];
    this.spawnInterval = config.interval || 1.0;
    this.spawnTimer = 0;
    this.spawning = true;

    for (const entry of config.monsters) {
      for (let i = 0; i < entry.count; i++) {
        this.spawnQueue.push({ type: entry.type, delay: i * this.spawnInterval * 0.3 });
      }
    }
  }

  update(dt) {
    if (gameOver || !waveActive || !this.spawning) return;

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
    const hp = getMonsterHP(type, G.wave);
    const dmg = getMonsterDamage(type, G.wave);

    const x = Phaser.Math.Between(50, w - 50);
    const y = -30;

    const enemy = this.scene.physics.add.sprite(x, y, def.texture);
    enemy.setDepth(5);
    enemy.setData('type', type);
    enemy.setData('hp', hp);
    enemy.setData('maxHp', hp);
    enemy.setData('speed', def.speed);
    enemy.setData('damage', dmg);
    enemy.setData('frozen', 0);
    enemy.setData('gold', def.gold);
    enemy.setData('boss', type === 'boss');

    enemy.setDisplaySize(
      type === 'boss' ? 48 : 32,
      type === 'boss' ? 48 : 32
    );

    this.scene.enemies.add(enemy);
  }
}
