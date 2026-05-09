export class EntityAnimationSystem {
  constructor(scene) {
    this.scene = scene;
    this.playerIdleTick = 0;
  }

  update(dt) {
    this.updatePlayer(dt);
    this.updateEnemies();
  }

  updatePlayer(dt) {
    const p = this.scene.player;
    if (!p || !p.active || this.scene.playerDead) return;

    const vx = p.body?.velocity?.x || 0;
    if (Math.abs(vx) > 3) p.setFlipX(vx < 0);

    this.playerIdleTick += dt;
    if (this.playerIdleTick > 0.55) {
      this.playerIdleTick = 0;
      this.playInnerPulse(p, 0xdfffd8, 0.14);
    }
  }

  updateEnemies() {
    this.scene.enemies.children.iterate((en) => {
      if (!en || !en.active || en.getData('dead')) return;
      const vx = en.body?.velocity?.x || 0;
      if (Math.abs(vx) > 2) en.setFlipX(vx < 0);
    });
  }

  playPlayerAttack(angle) {
    const p = this.scene.player;
    if (!p || !p.active) return;
    this.playInnerSlash(p, angle, 0xe8ffff);
  }

  playEnemyAttack(en) {
    if (!en || !en.active || en.getData('dead')) return;
    const angle = Phaser.Math.Angle.Between(en.x, en.y, this.scene.player.x, this.scene.player.y);
    this.playInnerSlash(en, angle, en.getData('projColor') || 0xffdd66);
  }

  playEnemyHit(en) {
    if (!en || !en.active || en.getData('dead')) return;
    this.playInnerPulse(en, 0xffffff, 0.28);
    this.playInnerCrack(en, 0xfff0aa);
  }

  playInnerPulse(sprite, color, alpha) {
    const r = Math.max(7, Math.min(sprite.displayWidth, sprite.displayHeight) * 0.28);
    const pulse = this.scene.add.circle(sprite.x, sprite.y, r, color, alpha).setDepth(sprite.depth + 1);
    this.scene.tweens.add({
      targets: pulse,
      alpha: 0,
      scale: 1.55,
      duration: 260,
      onUpdate: () => pulse.setPosition(sprite.x, sprite.y),
      onComplete: () => pulse.destroy()
    });
  }

  playInnerSlash(sprite, angle, color) {
    const len = Math.max(10, Math.min(sprite.displayWidth, sprite.displayHeight) * 0.46);
    const slash = this.scene.add.rectangle(sprite.x, sprite.y, len, 3, color, 0.72).setDepth(sprite.depth + 2);
    slash.rotation = angle;
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 0.35,
      duration: 180,
      onUpdate: () => slash.setPosition(sprite.x, sprite.y),
      onComplete: () => slash.destroy()
    });
  }

  playInnerCrack(sprite, color) {
    const r = Math.max(7, Math.min(sprite.displayWidth, sprite.displayHeight) * 0.24);
    const crack = this.scene.add.graphics().setDepth(sprite.depth + 2);
    crack.lineStyle(1, color, 0.65);
    crack.beginPath();
    crack.moveTo(sprite.x - r * 0.4, sprite.y - r * 0.3);
    crack.lineTo(sprite.x, sprite.y + r * 0.1);
    crack.lineTo(sprite.x + r * 0.35, sprite.y - r * 0.2);
    crack.strokePath();
    this.scene.tweens.add({
      targets: crack,
      alpha: 0,
      duration: 180,
      onComplete: () => crack.destroy()
    });
  }
}
