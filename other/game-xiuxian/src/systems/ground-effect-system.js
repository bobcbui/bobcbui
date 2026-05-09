export class GroundEffectSystem {
  constructor(scene) {
    this.scene = scene;
    this.effects = [];
    this.frostTrail = null;
    this.lowFxMode = this.detectLowFxMode();
    this.fxScale = this.lowFxMode ? 0.56 : 1;
    this.maxEffects = this.lowFxMode ? 10 : 14;
  }

  detectLowFxMode() {
    const device = this.scene?.sys?.game?.device;
    const isMobileOs = !!(device?.os?.android || device?.os?.iOS || device?.os?.iPad);
    const hasTouch = !!(device?.input?.touch || navigator.maxTouchPoints > 0);
    return isMobileOs || hasTouch || window.innerWidth <= 900;
  }

  fxCount(base, min = 1) {
    return Math.max(min, Math.round(base * this.fxScale));
  }

  isOnCamera(x, y, radius = 0, pad = 130) {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view) return true;
    return x + radius >= view.x - pad
      && x - radius <= view.right + pad
      && y + radius >= view.y - pad
      && y - radius <= view.bottom + pad;
  }

  trimEffectCount() {
    while (this.effects.length >= this.maxEffects) {
      const oldest = this.effects.shift();
      if (oldest) this.destroyEffect(oldest);
    }
  }

  hasNearbyEffect(type, x, y, mergeDist) {
    const mergeD2 = mergeDist * mergeDist;
    return this.effects.some((effect) => {
      if (effect.type !== type) return false;
      const dx = effect.x - x;
      const dy = effect.y - y;
      return dx * dx + dy * dy < mergeD2;
    });
  }

  startFrostTrail(damage, duration = 5, radius = 74, freezeDuration = 1.2) {
    const player = this.scene?.player;
    if (!player) return;
    const safeRadius = Math.max(48, Math.round(radius));
    const step = this.lowFxMode ? Math.max(42, safeRadius * 0.72) : Math.max(34, safeRadius * 0.58);
    this.frostTrail = {
      ttl: Math.max(0.2, duration),
      damage: Math.max(1, Math.round(damage)),
      radius: safeRadius,
      freezeDuration: Math.max(0.4, freezeDuration || 1.2),
      step,
      lastX: player.x,
      lastY: player.y
    };
    this.addFrostField(
      player.x,
      player.y,
      safeRadius,
      this.frostTrail.damage,
      Math.min(2.6, duration),
      this.frostTrail.freezeDuration
    );
  }

  stopFrostTrail() {
    this.frostTrail = null;
  }

  updateFrostTrail(dt) {
    const trail = this.frostTrail;
    if (!trail) return;
    trail.ttl -= dt;
    const player = this.scene?.player;
    if (!player || trail.ttl <= 0) {
      this.stopFrostTrail();
      return;
    }
    const dx = player.x - trail.lastX;
    const dy = player.y - trail.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < trail.step) return;

    const steps = Math.min(6, Math.max(1, Math.floor(dist / trail.step)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const sx = trail.lastX + dx * t;
      const sy = trail.lastY + dy * t;
      this.addFrostField(
        sx,
        sy,
        trail.radius,
        trail.damage,
        Math.min(2.6, Math.max(1.4, trail.ttl + 0.6)),
        trail.freezeDuration
      );
    }
    trail.lastX = player.x;
    trail.lastY = player.y;
  }

  addFireField(x, y, damage, duration = 10, radius = 56) {
    if (this.hasNearbyEffect('fire', x, y, 42)) return;
    this.trimEffectCount();

    const gfx = this.scene.add.circle(x, y, radius, 0x5e170f, 0.32).setDepth(4);
    gfx.setStrokeStyle(4, 0xd1451e, 0.78);
    const core = this.scene.add.circle(x, y, radius * 0.5, 0xff5f2b, 0.3).setDepth(5);
    const glow = this.scene.add.circle(x, y, radius * 0.86, 0x992012, 0.2).setDepth(4);
    this.scene.tweens.add({
      targets: core,
      alpha: 0.48,
      scale: 1.35,
      duration: 460,
      yoyo: true,
      repeat: -1
    });
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.34,
      duration: 360,
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
      emberTimer: 0,
      gfx,
      core,
      glow
    });
  }

  addThunderField(x, y, radius, damage, duration = 5) {
    if (this.hasNearbyEffect('thunder', x, y, Math.max(72, radius * 0.45))) return;
    this.trimEffectCount();
    const gfx = this.scene.add.circle(x, y, radius, 0x4f3a0f, 0.2).setDepth(5);
    gfx.setStrokeStyle(4, 0xf2bf2d, 0.82);
    const pulse = this.scene.add.circle(x, y, radius * 0.24, 0xffdc66, 0.28).setDepth(6);
    pulse.setStrokeStyle(3, 0xfff4c0, 0.8);
    const glow = this.scene.add.circle(x, y, radius * 0.6, 0x8a5f12, 0.18).setDepth(5);
    this.scene.tweens.add({
      targets: pulse,
      scale: radius / (radius * 0.24),
      alpha: 0.1,
      duration: 740,
      repeat: -1
    });
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.32,
      duration: 300,
      yoyo: true,
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
      sparkTimer: 0,
      gfx,
      core: pulse,
      glow
    });
  }

  addFrostField(x, y, radius, damage, duration = 8, freezeDuration = 1.2) {
    if (this.hasNearbyEffect('frost', x, y, Math.max(66, radius * 0.4))) return;
    this.trimEffectCount();
    const gfx = this.scene.add.circle(x, y, radius, 0x1d3966, 0.24).setDepth(5);
    gfx.setStrokeStyle(4, 0x6eaee8, 0.76);
    const core = this.scene.add.circle(x, y, radius * 0.46, 0x4d86bf, 0.24).setDepth(6);
    const ripple = this.scene.add.circle(x, y, radius * 0.32, 0xcff2ff, 0.2).setDepth(6);
    ripple.setStrokeStyle(2, 0xcff2ff, 0.7);
    this.scene.tweens.add({
      targets: core,
      alpha: 0.4,
      scale: 1.22,
      duration: 460,
      yoyo: true,
      repeat: -1
    });
    this.scene.tweens.add({
      targets: ripple,
      scale: radius / (radius * 0.32),
      alpha: 0,
      duration: 880,
      repeat: -1
    });

    this.effects.push({
      type: 'frost',
      x,
      y,
      radius,
      damage,
      ttl: duration,
      tick: 0,
      shardTimer: 0,
      freezeDuration,
      gfx,
      core,
      ripple
    });
  }

  addFrostRectField(x, y, length, width, rotation, damage, duration = 8, freezeDuration = 1.2) {
    if (this.hasNearbyEffect('frost_rect', x, y, Math.max(82, length * 0.35))) return;
    this.trimEffectCount();
    const safeLength = Math.max(120, length);
    const safeWidth = Math.max(48, width);
    const gfx = this.scene.add.rectangle(x, y, safeLength, safeWidth, 0x1d3966, 0.24).setDepth(5);
    gfx.setStrokeStyle(4, 0x6eaee8, 0.76);
    gfx.setRotation(rotation);
    const core = this.scene.add.rectangle(x, y, safeLength * 0.56, safeWidth * 0.58, 0x4d86bf, 0.24).setDepth(6);
    core.setRotation(rotation);
    const ripple = this.scene.add.rectangle(x, y, safeLength * 0.36, safeWidth * 0.34, 0xcff2ff, 0.18).setDepth(6);
    ripple.setStrokeStyle(2, 0xcff2ff, 0.68);
    ripple.setRotation(rotation);
    this.scene.tweens.add({
      targets: core,
      alpha: 0.4,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 460,
      yoyo: true,
      repeat: -1
    });
    this.scene.tweens.add({
      targets: ripple,
      scaleX: safeLength / Math.max(1, safeLength * 0.36),
      scaleY: safeWidth / Math.max(1, safeWidth * 0.34),
      alpha: 0,
      duration: 880,
      repeat: -1
    });

    this.effects.push({
      type: 'frost_rect',
      x,
      y,
      length: safeLength,
      width: safeWidth,
      halfLength: safeLength * 0.5,
      halfWidth: safeWidth * 0.5,
      rotation,
      cosA: Math.cos(rotation),
      sinA: Math.sin(rotation),
      radius: Math.max(safeLength, safeWidth) * 0.62,
      damage,
      ttl: duration,
      tick: 0,
      shardTimer: 0,
      freezeDuration,
      gfx,
      core,
      ripple
    });
  }

  update(dt) {
    this.updateFrostTrail(dt);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.ttl -= dt;
      effect.tick -= dt;

      if (effect.ttl <= 0) {
        this.destroyEffect(effect);
        this.effects.splice(i, 1);
        continue;
      }

      const visible = this.isOnCamera(effect.x, effect.y, effect.radius, 170);
      if (visible) {
        const ttlRatio = Math.max(0.12, Math.min(1, effect.ttl / 8));
        const alpha = effect.type === 'fire'
          ? 0.14 + ttlRatio * 0.2
          : (effect.type === 'frost' || effect.type === 'frost_rect')
            ? 0.12 + ttlRatio * 0.16
            : 0.1 + ttlRatio * 0.18;
        effect.gfx.setAlpha(alpha);
        effect.core.setAlpha(Math.min(0.54, alpha + (effect.type === 'fire' ? 0.16 : 0.18)));
        if (effect.glow?.active) effect.glow.setAlpha(Math.min(0.45, alpha + 0.1));
        if (effect.ripple?.active) effect.ripple.setAlpha(Math.min(0.42, alpha + 0.18));

        if (effect.type === 'fire') this.updateFireVisual(effect, dt);
        if (effect.type === 'thunder') this.updateThunderVisual(effect, dt);
        if (effect.type === 'frost' || effect.type === 'frost_rect') this.updateFrostVisual(effect, dt);
      }

      if (effect.tick <= 0) {
        if (effect.type === 'thunder') {
          this.applyDamageTick(effect, 'thunder');
          effect.tick = 0.7;
        } else if (effect.type === 'frost' || effect.type === 'frost_rect') {
          if (effect.type === 'frost_rect') {
            this.applyRectDamageTick(effect, 'hailstorm', (en) => {
              const remaining = en.getData('freezeTimer') || 0;
              en.setData('freezeTimer', Math.max(remaining, effect.freezeDuration || 1.2));
            });
          } else {
            this.applyDamageTick(effect, 'hailstorm', (en) => {
              const remaining = en.getData('freezeTimer') || 0;
              en.setData('freezeTimer', Math.max(remaining, effect.freezeDuration || 1.2));
            });
          }
          effect.tick = 0.72;
        } else {
          this.applyDamageTick(effect, 'fireball');
          effect.tick = 0.56;
        }
      }
    }
  }

  updateFireVisual(effect, dt) {
    effect.emberTimer -= dt;
    if (effect.emberTimer > 0) return;
    effect.emberTimer = this.lowFxMode ? 0.18 : 0.1;
    const count = this.fxCount(2, 1);
    const palette = [0xff5f2b, 0xff8c41, 0xd13b19];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(6, effect.radius * 0.82);
      const fx = effect.x + Math.cos(a) * r;
      const fy = effect.y + Math.sin(a) * r;
      const ember = this.scene.add.circle(fx, fy, Phaser.Math.FloatBetween(2.6, 4.6), Phaser.Utils.Array.GetRandom(palette), 0.84).setDepth(11);
      this.scene.tweens.add({
        targets: ember,
        y: fy - Phaser.Math.Between(20, 42),
        alpha: 0,
        scale: 0.15,
        duration: Phaser.Math.Between(280, 520),
        onComplete: () => ember.destroy()
      });
    }
  }

  updateThunderVisual(effect, dt) {
    effect.arcTimer -= dt;
    if (effect.arcTimer <= 0) {
      effect.arcTimer = this.lowFxMode ? 0.2 : 0.12;
      const angle = Math.random() * Math.PI * 2;
      const length = effect.radius * Phaser.Math.FloatBetween(0.45, 1.05);
      const g = this.scene.add.graphics().setDepth(12);
      g.lineStyle(this.lowFxMode ? 3 : 4, 0xffcf3a, 0.92);
      g.beginPath();
      g.moveTo(effect.x, effect.y);
      const segments = this.lowFxMode ? 4 : 5;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const jitter = Phaser.Math.FloatBetween(-20, 20);
        g.lineTo(
          effect.x + Math.cos(angle) * length * t + Math.cos(angle + Math.PI / 2) * jitter,
          effect.y + Math.sin(angle) * length * t + Math.sin(angle + Math.PI / 2) * jitter
        );
      }
      g.strokePath();
      this.scene.tweens.add({
        targets: g,
        alpha: 0,
        duration: 150,
        onComplete: () => g.destroy()
      });
    }

    effect.sparkTimer -= dt;
    if (effect.sparkTimer > 0) return;
    effect.sparkTimer = this.lowFxMode ? 0.24 : 0.16;
    const sparkCount = this.fxCount(2, 1);
    for (let i = 0; i < sparkCount; i++) {
      const burstA = Math.random() * Math.PI * 2;
      const burstR = Phaser.Math.FloatBetween(effect.radius * 0.25, effect.radius * 0.95);
      const spark = this.scene.add.circle(
        effect.x + Math.cos(burstA) * burstR,
        effect.y + Math.sin(burstA) * burstR,
        Phaser.Math.FloatBetween(2.8, 4.8),
        0xffe07a,
        0.86
      ).setDepth(12);
      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(150, 260),
        onComplete: () => spark.destroy()
      });
    }
  }

  updateFrostVisual(effect, dt) {
    effect.shardTimer -= dt;
    if (effect.shardTimer > 0) return;
    effect.shardTimer = this.lowFxMode ? 0.22 : 0.12;
    const count = this.fxCount(2, 1);
    for (let i = 0; i < count; i++) {
      let sx = effect.x;
      let sy = effect.y;
      let driftAngle = Math.random() * Math.PI * 2;
      if (effect.type === 'frost_rect') {
        const lx = Phaser.Math.FloatBetween(-effect.halfLength * 0.86, effect.halfLength * 0.86);
        const ly = Phaser.Math.FloatBetween(-effect.halfWidth * 0.86, effect.halfWidth * 0.86);
        sx = effect.x + lx * effect.cosA - ly * effect.sinA;
        sy = effect.y + lx * effect.sinA + ly * effect.cosA;
        driftAngle = effect.rotation + Phaser.Math.FloatBetween(-0.85, 0.85);
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Phaser.Math.FloatBetween(0, effect.radius * 0.8);
        sx = effect.x + Math.cos(a) * r;
        sy = effect.y + Math.sin(a) * r;
        driftAngle = a;
      }
      const shard = this.scene.add.rectangle(sx, sy, 4, Phaser.Math.Between(10, 16), 0xd6f4ff, 0.86).setDepth(12);
      shard.rotation = driftAngle + Math.PI / 2;
      this.scene.tweens.add({
        targets: shard,
        x: sx + Math.cos(driftAngle) * Phaser.Math.Between(8, 18),
        y: sy + Math.sin(driftAngle) * Phaser.Math.Between(8, 18),
        alpha: 0,
        scaleY: 0.2,
        duration: Phaser.Math.Between(260, 420),
        onComplete: () => shard.destroy()
      });
    }
  }

  applyDamageTick(effect, skillId, onHit) {
    const r2 = effect.radius * effect.radius;
    this.scene.enemies.children.iterate((en) => {
      if (!en || !en.active || en.getData('dead')) return;
      const dx = en.x - effect.x;
      const dy = en.y - effect.y;
      if (dx * dx + dy * dy <= r2) {
        this.scene.combatSystem.damageEnemy(en, Math.max(1, Math.round(effect.damage)), skillId);
        if (onHit) onHit(en);
      }
    });
  }

  applyRectDamageTick(effect, skillId, onHit) {
    const halfLength = effect.halfLength || 0;
    const halfWidth = effect.halfWidth || 0;
    const cosA = effect.cosA || 1;
    const sinA = effect.sinA || 0;
    this.scene.enemies.children.iterate((en) => {
      if (!en || !en.active || en.getData('dead')) return;
      const dx = en.x - effect.x;
      const dy = en.y - effect.y;
      const localX = dx * cosA + dy * sinA;
      const localY = -dx * sinA + dy * cosA;
      if (Math.abs(localX) <= halfLength && Math.abs(localY) <= halfWidth) {
        this.scene.combatSystem.damageEnemy(en, Math.max(1, Math.round(effect.damage)), skillId);
        if (onHit) onHit(en);
      }
    });
  }

  destroyEffect(effect) {
    if (effect.gfx?.active) effect.gfx.destroy();
    if (effect.core?.active) effect.core.destroy();
    if (effect.glow?.active) effect.glow.destroy();
    if (effect.ripple?.active) effect.ripple.destroy();
  }
}
