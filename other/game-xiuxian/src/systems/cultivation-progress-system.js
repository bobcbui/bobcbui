import {
  P,
  cultProgress,
  isCultivating,
  initHotbar,
  recalcStats,
  refreshSkills,
  setCultProgress
} from '../core/state.js';
import { bus } from '../core/events.js';
import { getRealm, getRealmIndex } from '../data/index.js';

export class CultivationProgressSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt) {
    const { scene } = this;
    if (!isCultivating || scene.playerDead) return;

    const cultRate = 0.02 + getRealmIndex(P.realm) * 0.005;
    let progress = cultProgress + cultRate * dt;

    if (progress >= 1) {
      progress = 0;
      const realm = getRealm(P.realm);
      if (P.stage < realm.stages) {
        P.stage++;
        recalcStats();
        refreshSkills();
        initHotbar();
        bus.emit('status', '🌊 ' + realm.name + ' ' + P.stage + '层！', 2);
        bus.emit('hud-refresh');
        bus.emit('hotbar-refresh');
        bus.emit('save');
      } else {
        bus.emit('status', '⚡ 境界圆满，按 C 尝试突破！', 2);
      }
    }

    setCultProgress(progress);
    this.emitCultivationParticles();
  }

  emitCultivationParticles() {
    const { scene } = this;
    if (Math.random() >= 0.3) return;
    const px = scene.player.x + Phaser.Math.Between(-20, 20);
    const py = scene.player.y + Phaser.Math.Between(-20, 20);
    const dot = scene.add.circle(px, py, 3, 0x88ddff, 0.6).setDepth(2);
    scene.tweens.add({
      targets: dot,
      alpha: 0,
      y: py - 30,
      duration: 600,
      onComplete: () => dot.destroy()
    });
  }
}
