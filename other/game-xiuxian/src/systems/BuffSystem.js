import { P } from '../state.js';

export class BuffSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt) {
    if (P.buffTimer > 0) {
      P.buffTimer -= dt;
      if (P.buffTimer <= 0) {
        P.buff.speedBoost = 0;
        P.buff.shieldPct = 0;
        P.buff.atkBoost = 0;
        P.buff.rangeBoost = 0;
        this.destroyShieldVisual();
        this.scene.shieldReflect = 0;
      }
    }
    if (this.scene.shieldOrbs.length > 0) {
      this.updateShieldVisual();
    }
  }

  createShieldVisual(color) {
    this.destroyShieldVisual();
    const { scene } = this;
    const count = 4;
    for (let i = 0; i < count; i++) {
      const orb = scene.add.circle(scene.player.x, scene.player.y, 7, color, 0.55)
        .setDepth(12).setStrokeStyle(1, 0xffffff, 0.3);
      scene.shieldOrbs.push({ sprite: orb, offset: (i / count) * Math.PI * 2 });
    }
  }

  updateShieldVisual() {
    const { scene } = this;
    const t = scene.time.now / 1000;
    scene.shieldOrbs.forEach(o => {
      if (!o.sprite.active) return;
      const a = o.offset + t * 3;
      o.sprite.setPosition(scene.player.x + Math.cos(a) * 30, scene.player.y + Math.sin(a) * 30);
    });
  }

  destroyShieldVisual() {
    this.scene.shieldOrbs.forEach(o => { if (o.sprite.active) o.sprite.destroy(); });
    this.scene.shieldOrbs = [];
  }
}
