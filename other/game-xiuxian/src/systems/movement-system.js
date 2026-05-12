import { P } from '../core/state.js';
import { getJoystickDir } from '../core/runtime.js';
import { WORLD, PLAYER_ZONE_TOP } from '../data/index.js';

export class MovementSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update() {
    const { scene } = this;
    if (scene.playerDead) return;

    let mvx = 0, mvy = 0, keyMoving = false;
    const left = scene.cursors.left.isDown || scene.wasd.left.isDown;
    const right = scene.cursors.right.isDown || scene.wasd.right.isDown;

    if (left) { mvx -= 1; keyMoving = true; }
    if (right) { mvx += 1; keyMoving = true; }

    const joy = getJoystickDir();
    if (joy) { mvx += joy.x; mvy += joy.y; keyMoving = true; }

    if (keyMoving) {
      const len = Math.sqrt(mvx * mvx + mvy * mvy);
      if (len > 0.01) {
        let spd = P.speed;
        if (P.buffTimer > 0 && P.buff.speedBoost) spd *= (1 + P.buff.speedBoost);
        spd = Math.min(spd, 420);

        let vx = mvx / len * spd;
        let vy = mvy / len * spd * 0.5;

        const newY = scene.player.y + vy * (scene.game.loop.delta / 1000);
        if (newY < PLAYER_ZONE_TOP) vy = 0;
        if (newY > WORLD.height - 30) vy = 0;

        scene.player.setVelocity(vx, vy);
        scene.isMoving = false;
      } else {
        scene.player.setVelocity(0, 0);
      }
    } else if (scene.isMoving) {
      const clampedTargetY = Phaser.Math.Clamp(scene.moveTarget.y, PLAYER_ZONE_TOP, WORLD.height - 30);
      const dir = new Phaser.Math.Vector2(scene.moveTarget.x - scene.player.x, clampedTargetY - scene.player.y);
      const dist = Math.max(0.01, dir.length());
      let spd = P.speed;
      if (P.buffTimer > 0 && P.buff.speedBoost) spd *= (1 + P.buff.speedBoost);
      spd = Math.min(spd, 420);
      if (dist > 5) {
        dir.scale(spd / dist);
        scene.player.setVelocity(dir.x, dir.y);
      } else {
        scene.player.setVelocity(0, 0);
      }
    } else {
      scene.player.setVelocity(0, 0);
    }
  }
}
