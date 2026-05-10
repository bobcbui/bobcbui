const PROJECTILE_STYLE = {
  swordfly: { trail: 0x99ddff, glow: 0xdff7ff, scale: 0.72, pulse: false },
  fireball: { trail: 0xff7a32, glow: 0xffd199, scale: 1.12, pulse: true },
  thunderbolt: { trail: 0xffdd44, glow: 0xffffcc, scale: 1.1, pulse: false },
  thunder: { trail: 0xffdd44, glow: 0xffffcc, scale: 1.1, pulse: false },
  waterdomain: { trail: 0x80d8ff, glow: 0xd8f6ff, scale: 1.08, pulse: true },
  tornado: { trail: 0xcfe8c1, glow: 0xf5ffe8, scale: 1.12, pulse: true }
};

const DOMAIN_STYLE = {
  firedomain: { core: 0x7a1d12, stroke: 0xff5d2f, glow: 0xe23615, trail: 0xff8f4a, orbRadius: 20 },
  thunder: { core: 0x5a4312, stroke: 0xffcf3c, glow: 0xe39f1a, trail: 0xffe07d, orbRadius: 18 },
  hailstorm: { core: 0x8f1a1a, stroke: 0xff3f3f, glow: 0xff6b6b, trail: 0xff9e9e, orbRadius: 19 },
  default: { core: 0x444444, stroke: 0xffffff, glow: 0x999999, trail: 0xffffff, orbRadius: 17 }
};

function hex(color) {
  return '#' + (color || 0xffffff).toString(16).padStart(6, '0');
}

export class SkillEffects {
  constructor(scene) {
    this.scene = scene;
    this.lowFxMode = this.detectLowFxMode();
    this.fxScale = this.lowFxMode ? 0.58 : 1;
    this.trailInterval = this.lowFxMode ? 92 : 52;
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

  isOnCamera(x, y, pad = 90) {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view) return true;
    return x >= view.x - pad && x <= view.right + pad && y >= view.y - pad && y <= view.bottom + pad;
  }

  onProjectileFired(proj, skillId, angle) {
    const style = PROJECTILE_STYLE[skillId] || { trail: 0xffffff, glow: 0xffffff, scale: 1, pulse: false };
    const customTint = proj.getData('customTint');
    const customTrailColor = proj.getData('customTrailColor');
    const projTint = customTint || style.glow || 0xffffff;
    const trailColor = customTrailColor || style.trail || style.glow || 0xffffff;
    proj.setScale(style.scale || 1);
    proj.setTint(projTint);
    proj.setData('skillId', skillId);
    proj.setData('trailColor', trailColor);
    proj.setData('lastTrailAt', 0);

    const flashRadius = skillId === 'fireball' ? 14 : 10;
    const flash = this.scene.add.circle(proj.x, proj.y, this.lowFxMode ? flashRadius * 0.8 : flashRadius, projTint, 0.34).setDepth(7);
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
    if (!this.lowFxMode) this.drawTrailForGroup(this.scene.enemyProjs, now, 0xff6666);
  }

  drawTrailForGroup(group, now, fallbackColor) {
    group.children.iterate((proj) => {
      if (!proj || !proj.active) return;
      if (!this.isOnCamera(proj.x, proj.y, 80)) return;
      const last = proj.getData('lastTrailAt') || 0;
      if (now - last < this.trailInterval) return;
      proj.setData('lastTrailAt', now);
      const color = proj.getData('trailColor') || fallbackColor || 0xffffff;
      const dot = this.scene.add.circle(proj.x, proj.y, this.lowFxMode ? 3.8 : 5, color, this.lowFxMode ? 0.18 : 0.22).setDepth(5);
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
    const onCamera = this.isOnCamera(x, y, 120);
    const ring = this.scene.add.circle(x, y, isCrit ? 18 : 11, color, isCrit ? 0.26 : 0.18).setDepth(18);
    ring.setStrokeStyle(isCrit ? 3 : 2, color, isCrit ? 0.82 : 0.52);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: isCrit ? 1.9 : 1.45,
      duration: isCrit ? 360 : 240,
      onComplete: () => ring.destroy()
    });

    if (!onCamera) return;
    const sparkCount = this.fxCount(isCrit ? 8 : 4, isCrit ? 4 : 2);
    for (let i = 0; i < sparkCount; i++) {
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

  getDomainOrbStyle(def = {}) {
    const preset = DOMAIN_STYLE[def.id];
    if (preset) return preset;
    const fallback = def.color || DOMAIN_STYLE.default.stroke;
    return {
      core: fallback,
      stroke: fallback,
      glow: fallback,
      trail: fallback,
      orbRadius: DOMAIN_STYLE.default.orbRadius
    };
  }

  launchDomainOrb(fromX, fromY, toX, toY, def, onImpact) {
    const style = this.getDomainOrbStyle(def);
    const orb = this.scene.add.circle(fromX, fromY, style.orbRadius, style.core, 0.96).setDepth(14);
    orb.setStrokeStyle(4, style.stroke, 0.92);
    const glow = this.scene.add.circle(fromX, fromY, style.orbRadius * 1.9, style.glow, 0.35).setDepth(13);
    const shell = this.scene.add.circle(fromX, fromY, style.orbRadius * 1.35, style.stroke, 0.18).setDepth(13);
    shell.setStrokeStyle(2, style.stroke, 0.72);
    const dist = Phaser.Math.Distance.Between(fromX, fromY, toX, toY);
    const duration = Phaser.Math.Clamp(Math.round(220 + dist * 0.55), 260, this.lowFxMode ? 520 : 620);
    const tracker = { x: fromX, y: fromY };

    this.scene.tweens.add({
      targets: [orb, shell],
      angle: 360,
      duration: 240,
      repeat: -1
    });
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.52,
      duration: 160,
      yoyo: true,
      repeat: -1
    });

    const trailTimer = this.scene.time.addEvent({
      delay: this.lowFxMode ? 58 : 38,
      loop: true,
      callback: () => {
        if (!orb.active) return;
        if (!this.isOnCamera(orb.x, orb.y, 110)) return;
        const trail = this.scene.add.circle(orb.x, orb.y, Phaser.Math.FloatBetween(4, 7), style.trail, 0.62).setDepth(12);
        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          scale: 0.2,
          duration: 220,
          onComplete: () => trail.destroy()
        });
      }
    });

    this.scene.tweens.add({
      targets: tracker,
      x: toX,
      y: toY,
      duration,
      ease: 'Cubic.In',
      onUpdate: () => {
        orb.setPosition(tracker.x, tracker.y);
        glow.setPosition(tracker.x, tracker.y);
        shell.setPosition(tracker.x, tracker.y);
      },
      onComplete: () => {
        trailTimer.remove(false);
        const impactX = tracker.x;
        const impactY = tracker.y;
        const onCamera = this.isOnCamera(impactX, impactY, 150);
        if (onCamera) {
          const burstCount = this.fxCount(12, 4);
          for (let i = 0; i < burstCount; i++) {
            const a = (i / burstCount) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.15, 0.15);
            const burst = this.scene.add.circle(impactX, impactY, Phaser.Math.FloatBetween(3, 5), style.trail, 0.9).setDepth(15);
            this.scene.tweens.add({
              targets: burst,
              x: impactX + Math.cos(a) * Phaser.Math.Between(26, 52),
              y: impactY + Math.sin(a) * Phaser.Math.Between(26, 52),
              alpha: 0,
              scale: 0.16,
              duration: Phaser.Math.Between(220, 340),
              onComplete: () => burst.destroy()
            });
          }
        }
        const shock = this.scene.add.circle(impactX, impactY, style.orbRadius * 1.2, style.stroke, 0.34).setDepth(14);
        shock.setStrokeStyle(4, style.stroke, 0.95);
        this.scene.tweens.add({
          targets: shock,
          alpha: 0,
          scale: this.lowFxMode ? 2.35 : 2.8,
          duration: this.lowFxMode ? 300 : 360,
          onComplete: () => shock.destroy()
        });
        orb.destroy();
        glow.destroy();
        shell.destroy();
        if (onImpact) onImpact(impactX, impactY);
      }
    });
  }

  launchHailWheel(fromX, fromY, toX, toY, def, onImpact) {
    const style = this.getDomainOrbStyle({ ...def, id: 'hailstorm' });
    const pathAngle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY);
    const wheelLength = this.lowFxMode ? 52 : 66;
    const wheelWidth = this.lowFxMode ? 24 : 30;
    const wheel = this.scene.add.ellipse(fromX, fromY, wheelLength, wheelWidth, style.core, 0.95).setDepth(14);
    wheel.setStrokeStyle(4, style.stroke, 0.92);
    wheel.rotation = pathAngle;
    const bandA = this.scene.add.rectangle(fromX, fromY, wheelLength * 0.92, 4, style.trail, 0.66).setDepth(15);
    const bandB = this.scene.add.rectangle(fromX, fromY, wheelWidth * 1.7, 4, style.trail, 0.66).setDepth(15);
    const glow = this.scene.add.ellipse(fromX, fromY, wheelLength * 1.5, wheelWidth * 1.7, style.glow, 0.26).setDepth(13);
    glow.rotation = pathAngle;
    const shell = this.scene.add.ellipse(fromX, fromY, wheelLength * 1.18, wheelWidth * 1.18, style.stroke, 0.12).setDepth(13);
    shell.setStrokeStyle(2, style.stroke, 0.72);
    shell.rotation = pathAngle;

    const dist = Phaser.Math.Distance.Between(fromX, fromY, toX, toY);
    const duration = Phaser.Math.Clamp(Math.round(260 + dist * 0.62), 300, this.lowFxMode ? 640 : 760);
    const tracker = { x: fromX, y: fromY };
    let prevX = fromX;
    let prevY = fromY;
    let roll = 0;

    this.scene.tweens.add({
      targets: glow,
      alpha: 0.46,
      duration: 160,
      yoyo: true,
      repeat: -1
    });

    const trailTimer = this.scene.time.addEvent({
      delay: this.lowFxMode ? 70 : 44,
      loop: true,
      callback: () => {
        if (!wheel.active) return;
        if (!this.isOnCamera(wheel.x, wheel.y, 120)) return;
        const shard = this.scene.add.rectangle(
          wheel.x,
          wheel.y,
          Phaser.Math.FloatBetween(10, 16),
          Phaser.Math.FloatBetween(4, 7),
          style.trail,
          0.58
        ).setDepth(12);
        shard.rotation = pathAngle + Phaser.Math.FloatBetween(-0.35, 0.35);
        this.scene.tweens.add({
          targets: shard,
          x: shard.x - Math.cos(pathAngle) * Phaser.Math.Between(18, 32),
          y: shard.y - Math.sin(pathAngle) * Phaser.Math.Between(18, 32),
          alpha: 0,
          scaleX: 0.18,
          scaleY: 0.18,
          duration: Phaser.Math.Between(220, 320),
          onComplete: () => shard.destroy()
        });
      }
    });

    this.scene.tweens.add({
      targets: tracker,
      x: toX,
      y: toY,
      duration,
      ease: 'Cubic.InOut',
      onUpdate: () => {
        const stepDist = Phaser.Math.Distance.Between(prevX, prevY, tracker.x, tracker.y);
        prevX = tracker.x;
        prevY = tracker.y;
        roll += stepDist * 0.12;
        wheel.setPosition(tracker.x, tracker.y);
        glow.setPosition(tracker.x, tracker.y);
        shell.setPosition(tracker.x, tracker.y);
        bandA.setPosition(tracker.x, tracker.y);
        bandB.setPosition(tracker.x, tracker.y);
        wheel.rotation = pathAngle + roll;
        bandA.rotation = pathAngle + roll;
        bandB.rotation = pathAngle + roll + Math.PI / 2;
        shell.rotation = pathAngle + roll * 0.35;
        glow.rotation = pathAngle;
      },
      onComplete: () => {
        trailTimer.remove(false);
        const impactX = tracker.x;
        const impactY = tracker.y;
        const onCamera = this.isOnCamera(impactX, impactY, 180);
        if (onCamera) {
          const burstCount = this.fxCount(16, 6);
          for (let i = 0; i < burstCount; i++) {
            const a = Phaser.Math.FloatBetween(-0.55, 0.55) + pathAngle;
            const burst = this.scene.add.rectangle(
              impactX,
              impactY,
              Phaser.Math.FloatBetween(8, 15),
              Phaser.Math.FloatBetween(3, 6),
              style.trail,
              0.92
            ).setDepth(16);
            burst.rotation = a;
            this.scene.tweens.add({
              targets: burst,
              x: impactX + Math.cos(a) * Phaser.Math.Between(26, 64),
              y: impactY + Math.sin(a) * Phaser.Math.Between(26, 64),
              alpha: 0,
              scaleX: 0.2,
              scaleY: 0.2,
              duration: Phaser.Math.Between(220, 360),
              onComplete: () => burst.destroy()
            });
          }
        }

        const shock = this.scene.add.rectangle(
          impactX,
          impactY,
          this.lowFxMode ? 170 : 220,
          this.lowFxMode ? 58 : 72,
          style.stroke,
          0.2
        ).setDepth(14);
        shock.setStrokeStyle(3, style.trail, 0.92);
        shock.rotation = pathAngle;
        this.scene.tweens.add({
          targets: shock,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.36,
          duration: this.lowFxMode ? 320 : 380,
          onComplete: () => shock.destroy()
        });

        wheel.destroy();
        bandA.destroy();
        bandB.destroy();
        glow.destroy();
        shell.destroy();
        if (onImpact) onImpact(impactX, impactY, pathAngle);
      }
    });
  }

  castCrimsonLaserBurst(fromX, fromY, targets, color = 0xff1f1f) {
    const validTargets = (targets || []).filter((en) => en && en.active && !en.getData('dead'));
    if (!validTargets.length) return;
    const beamCount = this.lowFxMode ? Math.min(8, validTargets.length) : validTargets.length;
    for (let i = 0; i < beamCount; i++) {
      const target = validTargets[i];
      const dx = target.x - fromX;
      const dy = target.y - fromY;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const angle = Math.atan2(dy, dx);
      const midX = fromX + dx * 0.5;
      const midY = fromY + dy * 0.5;
      const coreWidth = this.lowFxMode ? 1.8 : 2.2;
      const glowWidth = this.lowFxMode ? 4.8 : 6.2;

      const core = this.scene.add.rectangle(midX, midY, dist, coreWidth, color, 0.92).setDepth(15);
      core.rotation = angle;
      const glow = this.scene.add.rectangle(midX, midY, dist, glowWidth, 0xff5454, 0.28).setDepth(14);
      glow.rotation = angle;

      this.scene.tweens.add({
        targets: [core, glow],
        alpha: 0,
        duration: this.lowFxMode ? 120 : 170,
        onComplete: () => {
          core.destroy();
          glow.destroy();
        }
      });

      const hit = this.scene.add.circle(target.x, target.y, this.lowFxMode ? 12 : 16, 0xff3838, 0.45).setDepth(16);
      hit.setStrokeStyle(2, 0xffb0b0, 0.9);
      this.scene.tweens.add({
        targets: hit,
        alpha: 0,
        scale: 1.8,
        duration: this.lowFxMode ? 170 : 230,
        onComplete: () => hit.destroy()
      });
    }
  }

  onDomainCast(x, y, def) {
    const radius = def.aoeRadius || 140;
    if (this.lowFxMode && !this.isOnCamera(x, y, radius, 180)) return;
    const style = this.getDomainOrbStyle(def);
    const color = style.stroke || def.color || 0xffee44;
    const fill = this.scene.add.circle(x, y, radius, style.core, 0.16).setDepth(6);
    const ring = this.scene.add.circle(x, y, radius * 0.65, style.glow, 0.1).setDepth(8);
    const edge = this.scene.add.circle(x, y, radius * 0.9, style.stroke, 0.04).setDepth(8);
    ring.setStrokeStyle(4, color, 0.76);
    edge.setStrokeStyle(3, style.stroke, 0.62);
    this.scene.tweens.add({
      targets: fill,
      alpha: 0,
      scale: 1.34,
      duration: 760,
      onComplete: () => fill.destroy()
    });
    this.scene.tweens.add({
      targets: [ring, edge],
      alpha: 0,
      scale: 1.8,
      rotation: 0.8,
      duration: 820,
      onComplete: () => {
        ring.destroy();
        edge.destroy();
      }
    });

    if (def.id === 'tornado') this.drawTornado(x, y, radius, color);
    else if (def.id === 'waterdomain') this.drawWaterDomain(x, y, radius, color);
    else if (def.id === 'firedomain') this.drawFireDomain(x, y, radius, style.stroke);
    else if (def.id === 'hailstorm') this.drawHailstorm(x, y, radius, style.stroke);
    else if (def.id === 'thunder') this.drawThunderDomain(x, y, radius, style.stroke);
  }

  drawTornado(x, y, radius, color) {
    const count = this.fxCount(14, 8);
    for (let i = 0; i < count; i++) {
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
    const palette = [0xff5d2f, 0xff8f4a, 0xc83018];
    const flameCount = this.fxCount(24, 10);
    for (let i = 0; i < flameCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(10, radius * 0.9);
      const flame = this.scene.add.circle(
        x + Math.cos(a) * r,
        y + Math.sin(a) * r,
        Phaser.Math.FloatBetween(4, 7),
        Phaser.Utils.Array.GetRandom(palette),
        0.86
      ).setDepth(10);
      flame.setStrokeStyle(2, 0xfff3a5, 0.8);
      this.scene.tweens.add({
        targets: flame,
        y: flame.y - Phaser.Math.Between(28, 56),
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(360, 680),
        delay: i * (this.lowFxMode ? 18 : 12),
        onComplete: () => flame.destroy()
      });
    }

    const blastCount = this.fxCount(4, 2);
    for (let i = 0; i < blastCount; i++) {
      const blast = this.scene.add.circle(x, y, radius * (0.22 + i * 0.1), color, 0.08).setDepth(9);
      blast.setStrokeStyle(3, 0xff9f66, 0.7 - i * 0.1);
      this.scene.tweens.add({
        targets: blast,
        alpha: 0,
        scale: 1.8 + i * 0.16,
        duration: 520 + i * 70,
        delay: i * 60,
        onComplete: () => blast.destroy()
      });
    }
  }

  drawHailstorm(x, y, radius, color) {
    const hailCount = this.fxCount(28, 10);
    for (let i = 0; i < hailCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(0, radius);
      const hx = x + Math.cos(a) * r;
      const hy = y + Math.sin(a) * r;
      const hail = this.scene.add.rectangle(hx, hy - 120, 4, Phaser.Math.FloatBetween(10, 18), 0xe6f8ff, 0.9).setDepth(12);
      hail.setStrokeStyle(1, color, 0.82);
      hail.rotation = Phaser.Math.FloatBetween(-0.35, 0.35);
      this.scene.tweens.add({
        targets: hail,
        y: hy,
        x: hx + Phaser.Math.FloatBetween(-8, 8),
        rotation: hail.rotation + Phaser.Math.FloatBetween(-0.35, 0.35),
        alpha: 0,
        duration: Phaser.Math.Between(220, 460),
        delay: i * (this.lowFxMode ? 24 : 18),
        onComplete: () => hail.destroy()
      });
    }

    const mistCount = this.fxCount(3, 2);
    for (let i = 0; i < mistCount; i++) {
      const mist = this.scene.add.circle(x, y, radius * (0.3 + i * 0.22), 0xa9ddff, 0.07).setDepth(10);
      mist.setStrokeStyle(2, 0xd8f5ff, 0.5 - i * 0.08);
      this.scene.tweens.add({
        targets: mist,
        alpha: 0,
        scale: 1.9,
        duration: 620 + i * 120,
        delay: i * 90,
        onComplete: () => mist.destroy()
      });
    }
  }

  drawThunderDomain(x, y, radius, color) {
    const ringCount = this.fxCount(6, 3);
    for (let i = 0; i < ringCount; i++) {
      const ring = this.scene.add.circle(x, y, 20 + i * 10, color, 0.12).setDepth(10);
      ring.setStrokeStyle(4, color, 0.8 - i * 0.08);
      this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scale: radius / (20 + i * 10),
        duration: 680,
        delay: i * 65,
        onComplete: () => ring.destroy()
      });
    }

    const arcCount = this.fxCount(22, 9);
    for (let i = 0; i < arcCount; i++) {
      const angle = (i / arcCount) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.16, 0.16);
      const delay = i * 16;
      this.drawThunderArc(x, y, angle, radius * Phaser.Math.FloatBetween(0.58, 1.08), color, delay);
    }

    const core = this.scene.add.circle(x, y, 24, 0xffee99, 0.66).setDepth(12);
    this.scene.tweens.add({
      targets: core,
      alpha: 0,
      scale: 2.8,
      duration: 360,
      onComplete: () => core.destroy()
    });
  }

  drawThunderArc(x, y, angle, length, color, delay) {
    const g = this.scene.add.graphics().setDepth(12);
    g.lineStyle(4, color, 0.95);
    g.beginPath();
    g.moveTo(x, y);
    const segments = 5;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const jitter = Phaser.Math.FloatBetween(-18, 18) * (1 - Math.abs(t - 0.5));
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
