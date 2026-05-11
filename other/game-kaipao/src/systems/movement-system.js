import { gameOver, waveActive } from '../core/state.js';

export class MovementSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt) {
    if (gameOver || !waveActive) return;
    const player = this.scene.player;
    const enemies = this.scene.enemies.getChildren();

    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const speed = enemy.getData('speed') || 60;
      const frozen = enemy.getData('frozen') || 0;

      if (frozen > 0) {
        enemy.setVelocity(0, 0);
        enemy.setData('frozen', frozen - dt);
        if (enemy.getData('frozen') <= 0) {
          enemy.clearTint();
        }
        continue;
      }

      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
      enemy.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );
    }
  }
}
