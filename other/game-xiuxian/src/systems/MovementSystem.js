import { P } from '../state.js';

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
    const up = scene.cursors.up.isDown || scene.wasd.up.isDown;
    const down = scene.cursors.down.isDown || scene.wasd.down.isDown;
    if (left) { mvx -= 1; }
    if (right) { mvx += 1; }
    if (up) { mvy -= 1; }
    if (down) { mvy += 1; }
    if (left || right || up || down) keyMoving = true;

    const joy = window.joystickDir;
    if (joy) { mvx += joy.x; mvy += joy.y; keyMoving = true; }

    if (keyMoving) {
      const len = Math.sqrt(mvx * mvx + mvy * mvy);
      if (len > 0.01) {
        let spd = P.speed;
        if (P.buffTimer > 0 && P.buff.speedBoost) spd *= (1 + P.buff.speedBoost);
        scene.player.setVelocity(mvx / len * spd, mvy / len * spd);
        scene.isMoving = false;
      } else {
        scene.player.setVelocity(0, 0);
      }
    } else if (scene.isMoving) {
      const dir = new Phaser.Math.Vector2(scene.moveTarget.x - scene.player.x, scene.moveTarget.y - scene.player.y);
      const dist = Math.max(0.01, dir.length());
      let spd = P.speed;
      if (P.buffTimer > 0 && P.buff.speedBoost) spd *= (1 + P.buff.speedBoost);
      if (dist > 5) { dir.scale(spd / dist); scene.player.setVelocity(dir.x, dir.y); }
      else scene.player.setVelocity(0, 0);
    } else {
      scene.player.setVelocity(0, 0);
    }
  }
}
