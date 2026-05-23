import {
  defenseWave,
  gameStarted,
  MAX_WAVES,
  setDefenseWave,
  setGameStarted,
  setWallHp,
  wallHp,
  wallMaxHp
} from '../core/state.js';
import { bus } from '../core/events.js';
import { getEl } from '../core/dom.js';

export class DefenseSystem {
  constructor(scene) {
    this.scene = scene;
    this.waitingWave = false;
    this.wallGfx = null;
  }

  update() {
    if (!gameStarted) return;
    this.checkWaveCleared();
    this.updateWall();
  }

  updateWall() {
    const { scene } = this;
    const wallY = scene.worldSize - 300;
    const bar = getEl('wallHpBar');
    const waveEl = getEl('waveCounter');
    if (bar) bar.style.width = Math.max(0, wallHp / wallMaxHp * 100) + '%';
    if (waveEl) waveEl.textContent = defenseWave + '/' + MAX_WAVES;

    if (wallHp <= 0) {
      setGameStarted(false);
      const dm = getEl('defeatModal');
      const dw = getEl('defeatWave');
      if (dm) dm.classList.remove('hidden');
      if (dw) dw.textContent = Math.max(0, defenseWave - 1);
    }

    scene.enemies.children.iterate((en) => {
      if (!en || en.getData('dead')) return;
      if (en.y > wallY - 30) {
        setWallHp(wallHp - Math.round(en.getData('atk') || 5) * 0.3);
        en.setData('dead', true);
        const lbl = en.getData('label');
        if (lbl) lbl.destroy();
        en.destroy();
      }
    });
  }

  start() {
    const { scene } = this;
    const mainMenu = getEl('mainMenu');
    if (mainMenu) mainMenu.style.display = 'none';
    setGameStarted(true);
    setWallHp(wallMaxHp);
    setDefenseWave(0);
    scene.player.setPosition(scene.worldSize / 2, scene.worldSize - 400);
    scene.moveTarget.set(scene.worldSize / 2, scene.worldSize - 400);
    scene.clearEnemies();
    this.startNextWave();
    bus.emit('status', '⚔️ 镇守剑气长城！', 3);

    const wallY = scene.worldSize - 300;
    if (this.wallGfx?.active) this.wallGfx.destroy();
    this.wallGfx = scene.add.graphics().setDepth(0);
    this.wallGfx.fillStyle(0x8a7a6a, 0.7);
    this.wallGfx.fillRect(0, wallY - 10, scene.worldSize, 30);
    this.wallGfx.fillStyle(0xc8b898, 0.4);
    this.wallGfx.fillRect(0, wallY - 8, scene.worldSize, 6);
    getEl('wallHud')?.classList.remove('hidden');
  }

  startNextWave() {
    const { scene } = this;
    if (defenseWave >= MAX_WAVES) {
      bus.emit('status', '🎉 剑气长城守住了！全部' + MAX_WAVES + '波妖兽被击退！', 5);
      setGameStarted(false);
      return;
    }
    setDefenseWave(defenseWave + 1);
    const count = Math.min(3 + defenseWave * 2, 25);
    const isBossWave = defenseWave % 5 === 0;
    for (let i = 0; i < count; i++) {
      const en = scene.spawnSystem.spawnEnemy({ allowBoss: isBossWave });
      if (en) {
        en.y = Phaser.Math.Between(100, 500);
        en.x = Phaser.Math.Between(100, scene.worldSize - 100);
      }
    }
    bus.emit('status', '⚔️ 第 ' + defenseWave + ' 波来袭！', 2);
  }

  checkWaveCleared() {
    const { scene } = this;
    if (!gameStarted || this.waitingWave) return;
    if (scene.enemies.countActive(true) === 0) {
      this.waitingWave = true;
      bus.emit('status', '妖兽退散，下一波准备中...', 2);
      scene.time.delayedCall(3000, () => {
        this.waitingWave = false;
        this.startNextWave();
      });
    }
  }
}
