export class GroundEffectSystem {
  constructor(scene) {
    this.scene = scene;
    this.effects = [];
  }

  addFireField(x, y, damage, duration = 10, radius = 56) {
    const exists = this.effects.some(effect => {
      const dx = effect.x - x;
      const dy = effect.y - y;
      return effect.type === 'fire' && dx * dx + dy * dy < 42 * 42;
    });
    if (exists) return;

    const gfx = this.scene.add.circle(x, y, radius, 0xff5522, 0.24).setDepth(4);
    gfx.setStrokeStyle(3, 0xffaa44, 0.6);
    const core = this.scene.add.circle(x, y, radius * 0.45, 0xffaa33, 0.22).setDepth(4);
    this.scene.tweens.add({
      targets: core,
      alpha: 0.42,
      scale: 1.25,
      duration: 520,
      yoyo: true,
      repeat: -1
    });

    this.effects.push({
      type: 'fire',
      x,
      y,
      radius,
      damage,
      ttl: duration,
      tick: 0,
      gfx,
      core
    });
  }

  addThunderField(x, y, radius, damage, duration = 5) {
    const gfx = this.scene.add.circle(x, y, radius, 0xd6a742, 0.12).setDepth(5);
    gfx.setStrokeStyle(3, 0xffdd44, 0.6);
    const pulse = this.scene.add.circle(x, y, radius * 0.2, 0xffffcc, 0.22).setDepth(6);
    pulse.setStrokeStyle(3, 0xffdd44, 0.6);
    this.scene.tweens.add({
      targets: pulse,
      scale: radius / (radius * 0.2),
      alpha: 0.12,
      duration: 900,
      repeat: -1
    });

    this.effects.push({
      type: 'thunder',
      x,
      y,
      radius,
      damage,
      ttl: duration,
      tick: 0,
      arcTimer: 0,
      gfx,
      core: pulse
    });
  }

  update(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.ttl -= dt;
      effect.tick -= dt;

      if (effect.ttl <= 0) {
        this.destroyEffect(effect);
        this.effects.splice(i, 1);
        continue;
      }

      const alpha = effect.type === 'fire'
        ? Math.min(0.3, Math.max(0.14, effect.ttl / 10 * 0.3))
        : Math.min(0.22, Math.max(0.1, effect.ttl / 10 * 0.22));
      effect.gfx.setAlpha(alpha);
      effect.core.setAlpha(Math.min(0.48, alpha + (effect.type === 'fire' ? 0.12 : 0.16)));

      if (effect.type === 'thunder') this.updateThunderVisual(effect, dt);

      if (effect.tick <= 0) {
        effect.tick = 0.6;
        if (effect.type === 'thunder') {
          this.applyDamageTick(effect, 'thunder');
          effect.tick = 0.75;
        } else {
          this.applyDamageTick(effect, 'fireball');
        }
      }
    }
  }

  updateThunderVisual(effect, dt) {
    effect.arcTimer -= dt;
    if (effect.arcTimer > 0) return;
    effect.arcTimer = 0.18;
    const angle = Math.random() * Math.PI * 2;
    const length = effect.radius * Phaser.Math.FloatBetween(0.35, 0.95);
    const g = this.scene.add.graphics().setDepth(12);
    g.lineStyle(3, 0xffdd44, 0.86);
    g.beginPath();
    g.moveTo(effect.x, effect.y);
    for (let i = 1; i <= 4; i++) {
      const t = i / 4;
      const jitter = Phaser.Math.FloatBetween(-16, 16);
      g.lineTo(
        effect.x + Math.cos(angle) * length * t + Math.cos(angle + Math.PI / 2) * jitter,
        effect.y + Math.sin(angle) * length * t + Math.sin(angle + Math.PI / 2) * jitter
      );
    }
    g.strokePath();
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 160,
      onComplete: () => g.destroy()
    });
  }

  applyDamageTick(effect, skillId) {
    const r2 = effect.radius * effect.radius;
    this.scene.enemies.children.iterate((en) => {
      if (!en || !en.active || en.getData('dead')) return;
      const dx = en.x - effect.x;
      const dy = en.y - effect.y;
      if (dx * dx + dy * dy <= r2) {
        this.scene.combatSystem.damageEnemy(en, Math.max(1, Math.round(effect.damage)), skillId);
      }
    });
  }

  destroyEffect(effect) {
    if (effect.gfx?.active) effect.gfx.destroy();
    if (effect.core?.active) effect.core.destroy();
  }
}
