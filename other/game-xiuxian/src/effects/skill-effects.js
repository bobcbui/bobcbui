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

  drawThunderDomain(x, y, radius, color) {
    for (let i = 0; i < 8; i++) {
      const sx = x + Phaser.Math.Between(-radius, radius);
      const sy = y + Phaser.Math.Between(-radius, radius);
      if ((sx - x) * (sx - x) + (sy - y) * (sy - y) > radius * radius) continue;
      const bolt = this.scene.add.rectangle(sx, sy - 16, 4, 34, color, 0.64).setDepth(11);
      bolt.rotation = Phaser.Math.FloatBetween(-0.4, 0.4);
      this.scene.tweens.add({
        targets: bolt,
        alpha: 0,
        scaleY: 0.3,
        y: sy + 12,
        duration: 180,
        delay: i * 38,
        onComplete: () => bolt.destroy()
      });
    }
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
