const PROJECTILE_STYLE = {
  swordfly: { trail: 0x99ddff, glow: 0xdff7ff, scale: 1.04, pulse: false },
  fireball: { trail: 0xff7a32, glow: 0xffd199, scale: 1.12, pulse: true },
  thunderbolt: { trail: 0xffdd44, glow: 0xffffcc, scale: 1.1, pulse: false },
  thunder: { trail: 0xffdd44, glow: 0xffffcc, scale: 1.1, pulse: false },
  waterdomain: { trail: 0x80d8ff, glow: 0xd8f6ff, scale: 1.08, pulse: true },
  tornado: { trail: 0xcfe8c1, glow: 0xf5ffe8, scale: 1.12, pulse: true }
};

function hex(color) {
  return '#' + (color || 0xffffff).toString(16).padStart(6, '0');
}

export class SkillEffects {
  constructor(scene) {
    this.scene = scene;
  }

  onProjectileFired(proj, skillId, angle) {
    const style = PROJECTILE_STYLE[skillId] || { trail: 0xffffff, glow: 0xffffff, scale: 1, pulse: false };
    proj.setScale(style.scale || 1);
    proj.setTint(style.glow || 0xffffff);
    proj.setData('skillId', skillId);
    proj.setData('trailColor', style.trail || style.glow || 0xffffff);
    proj.setData('lastTrailAt', 0);

    const flash = this.scene.add.circle(proj.x, proj.y, skillId === 'fireball' ? 14 : 10, style.glow, 0.34).setDepth(7);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.8,
      duration: 220,
      onComplete: () => flash.destroy()
    });

    if (style.pulse) {
      this.scene.tweens.add({
        targets: proj,
        scaleX: (style.scale || 1) * 1.2,
        scaleY: (style.scale || 1) * 1.2,
        duration: 160,
        yoyo: true,
        repeat: 2
      });
    }
  }

  updateProjectileTrails() {
    const now = this.scene.time.now;
    this.drawTrailForGroup(this.scene.projectiles, now);
    this.drawTrailForGroup(this.scene.enemyProjs, now, 0xff6666);
  }

  drawTrailForGroup(group, now, fallbackColor) {
    group.children.iterate((proj) => {
      if (!proj || !proj.active) return;
      const last = proj.getData('lastTrailAt') || 0;
      if (now - last < 42) return;
      proj.setData('lastTrailAt', now);
      const color = proj.getData('trailColor') || fallbackColor || 0xffffff;
      const dot = this.scene.add.circle(proj.x, proj.y, 5, color, 0.22).setDepth(5);
      this.scene.tweens.add({
        targets: dot,
        alpha: 0,
        scale: 0.25,
        duration: 260,
        onComplete: () => dot.destroy()
      });
    });
  }

  onProjectileHit(x, y, skillId, isCrit) {
    const style = PROJECTILE_STYLE[skillId] || {};
    const color = isCrit ? 0xffdd44 : (style.trail || 0xffffff);
    const ring = this.scene.add.circle(x, y, isCrit ? 18 : 11, color, isCrit ? 0.26 : 0.18).setDepth(18);
    ring.setStrokeStyle(isCrit ? 3 : 2, color, isCrit ? 0.82 : 0.52);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: isCrit ? 1.9 : 1.45,
      duration: isCrit ? 360 : 240,
      onComplete: () => ring.destroy()
    });

    for (let i = 0; i < (isCrit ? 8 : 4); i++) {
      const spark = this.scene.add.circle(x, y, isCrit ? 3 : 2, color, 0.62).setDepth(19);
      const angle = Math.random() * Math.PI * 2;
      const dist = isCrit ? Phaser.Math.Between(20, 42) : Phaser.Math.Between(10, 24);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: isCrit ? 360 : 240,
        onComplete: () => spark.destroy()
      });
    }
  }

  onDomainCast(x, y, def) {
    const radius = def.aoeRadius || 140;
    const color = def.color || 0xffee44;
    const fill = this.scene.add.circle(x, y, radius, color, 0.08).setDepth(6);
    const ring = this.scene.add.circle(x, y, radius * 0.78, color, 0.03).setDepth(8);
    ring.setStrokeStyle(3, color, 0.5);
    this.scene.tweens.add({
      targets: fill,
      alpha: 0,
      scale: 1.15,
      duration: 650,
      onComplete: () => fill.destroy()
    });
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.55,
      rotation: 0.8,
      duration: 720,
      onComplete: () => ring.destroy()
    });

    if (def.id === 'tornado') this.drawTornado(x, y, radius, color);
    else if (def.id === 'waterdomain') this.drawWaterDomain(x, y, radius, color);
    else if (def.id === 'firedomain') this.drawFireDomain(x, y, radius, color);
    else if (def.id === 'hailstorm') this.drawHailstorm(x, y, radius, color);
    else if (def.id === 'thunder') this.drawThunderDomain(x, y, radius, color);
  }

  drawTornado(x, y, radius, color) {
    for (let i = 0; i < 14; i++) {
      const a = i * 0.9;
      const r = 18 + i * radius / 18;
      const leaf = this.scene.add.circle(x + Math.cos(a) * r, y + Math.sin(a) * r, 3, color, 0.4).setDepth(9);
      this.scene.tweens.add({
        targets: leaf,
        angle: 240,
        x: x + Math.cos(a + 1.6) * (r * 0.45),
        y: y + Math.sin(a + 1.6) * (r * 0.45) - 18,
        alpha: 0,
        duration: 600,
        delay: i * 18,
        onComplete: () => leaf.destroy()
      });
    }
  }

  drawWaterDomain(x, y, radius, color) {
    for (let i = 0; i < 3; i++) {
      const wave = this.scene.add.circle(x, y, radius * (0.3 + i * 0.18), color, 0.02).setDepth(9);
      wave.setStrokeStyle(2, color, 0.24);
      this.scene.tweens.add({
        targets: wave,
        alpha: 0,
        scale: 1.8,
        duration: 520,
        delay: i * 110,
        onComplete: () => wave.destroy()
      });
    }
  }

  drawFireDomain(x, y, radius, color) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(8, radius * 0.8);
      const flame = this.scene.add.circle(x + Math.cos(a) * r, y + Math.sin(a) * r, Phaser.Math.FloatBetween(3, 5), color, 0.78).setDepth(10);
      flame.setStrokeStyle(1, 0xfff1a8, 0.7);
      this.scene.tweens.add({
        targets: flame,
        y: flame.y - Phaser.Math.Between(18, 36),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(420, 780),
        onComplete: () => flame.destroy()
      });
    }
  }

  drawHailstorm(x, y, radius, color) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(0, radius);
      const hx = x + Math.cos(a) * r;
      const hy = y + Math.sin(a) * r;
      const hail = this.scene.add.circle(hx, hy - 90, Phaser.Math.FloatBetween(2, 4), 0xe8fbff, 0.85).setDepth(12);
      hail.setStrokeStyle(1, color, 0.75);
      this.scene.tweens.add({
        targets: hail,
        y: hy,
        alpha: 0,
        duration: Phaser.Math.Between(260, 520),
        delay: i * 26,
        onComplete: () => hail.destroy()
      });
    }
  }

  drawThunderDomain(x, y, radius, color) {
    for (let i = 0; i < 4; i++) {
      const ring = this.scene.add.circle(x, y, 24 + i * 12, color, 0.1).setDepth(10);
      ring.setStrokeStyle(3, color, 0.68 - i * 0.08);
      this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scale: radius / (24 + i * 12),
        duration: 720,
        delay: i * 90,
        onComplete: () => ring.destroy()
      });
    }

    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.12, 0.12);
      const delay = i * 24;
      this.drawThunderArc(x, y, angle, radius * Phaser.Math.FloatBetween(0.55, 0.98), color, delay);
    }

    const core = this.scene.add.circle(x, y, 22, 0xffffcc, 0.58).setDepth(12);
    this.scene.tweens.add({
      targets: core,
      alpha: 0,
      scale: 2.2,
      duration: 320,
      onComplete: () => core.destroy()
    });
  }

  drawThunderArc(x, y, angle, length, color, delay) {
    const g = this.scene.add.graphics().setDepth(12);
    g.lineStyle(3, color, 0.92);
    g.beginPath();
    g.moveTo(x, y);
    const segments = 5;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const jitter = Phaser.Math.FloatBetween(-14, 14) * (1 - Math.abs(t - 0.5));
      const px = x + Math.cos(angle) * length * t + Math.cos(angle + Math.PI / 2) * jitter;
      const py = y + Math.sin(angle) * length * t + Math.sin(angle + Math.PI / 2) * jitter;
      g.lineTo(px, py);
    }
    g.strokePath();
    g.alpha = 0;
    this.scene.tweens.add({
      targets: g,
      alpha: 0.9,
      duration: 70,
      delay,
      yoyo: true,
      hold: 60,
      onComplete: () => g.destroy()
    });
  }

  onBuffCast(color) {
    const p = this.scene.player;
    const aura = this.scene.add.circle(p.x, p.y, 28, color || 0x66ffcc, 0.18).setDepth(4);
    aura.setStrokeStyle(2, color || 0x66ffcc, 0.38);
    this.scene.tweens.add({
      targets: aura,
      alpha: 0,
      scale: 2.6,
      duration: 620,
      onComplete: () => aura.destroy()
    });
  }

  onShieldCast(color) {
    const p = this.scene.player;
    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add.circle(p.x, p.y, 30 + i * 10, color || 0xffd700, 0.02).setDepth(11);
      ring.setStrokeStyle(2, color || 0xffd700, 0.28 - i * 0.05);
      this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scale: 1.7,
        duration: 520,
        delay: i * 80,
        onComplete: () => ring.destroy()
      });
    }
  }

  showSkillName(name, color) {
    this.scene.textPool.show(this.scene.player.x, this.scene.player.y - 40, name, {
      fontSize: '14px',
      color: hex(color),
      stroke: '#000',
      strokeThickness: 1,
      depth: 20,
      floatDist: 40,
      duration: 900
    });
  }
}
