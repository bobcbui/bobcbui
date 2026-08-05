/* ============================================================================
 * 战斗系统：普攻飞剑（自动索敌，弹道受强化卡加成）、抽卡技能自动轮转
 * 伤害结算位于 ./damage.js（本类通过薄封装调用）
 * ========================================================================== */

import { P } from '@/core/state.js';
import { SKILL_CARDS, COMBAT_TUNING } from '@/data/index.js';
import { bus } from '@/core/events.js';
import { onProjHit, onEnemyProjHit, onEnemyContact, damageEnemy } from '@/systems/damage.js';

const SWORD_TURN_RATE = 0;
const SWORD_PROJECTILE_SPEED = 560;
const SWORD_MIN_LIFETIME = 1900;
const SWORD_RANGE_LIFETIME_FACTOR = 7.5;
const SWORD_HITBOX_W = 22;
const SWORD_HITBOX_H = 12;
const SWORD_MAX_HIT_COUNT = 10;
const SWORD_STORM_INTERVAL = 0.33;
const SWORD_START_SCALE = 0.38;
const SWORD_END_SCALE = 0.74;
const SWORD_GROW_DURATION_MS = 420;
const GROWING_FIREBALL_START_SCALE = 1.08;
const GROWING_FIREBALL_END_SCALE = 3.4;
const GROWING_FIREBALL_TRACK_TURN_RATE = 5.2;
const CRIMSON_LASER_DURATION_SEC = 3;
const CRIMSON_LASER_BEAM_TICK_MS = 120;
const CRIMSON_LASER_DAMAGE_TICK_MS = 300;
const SWORD_FLY_TEX = 'swordFlySvg';
const FIREDOMAIN_TEX = 'firedomainSword';
const SWORD_COLOR_PALETTE = Object.freeze([
  0xff5f57,
  0xffa33b,
  0xffdf4f,
  0x6fe786,
  0x62b6ff,
  0x9a7cff,
  0xff74c8
]);

/** 普攻飞剑定义（不来自卡池） */
export const SWORDFLY_DEF = Object.freeze({
  id: 'swordfly',
  name: '飞剑术',
  baseDmg: 1.15,
  cooldown: 0.65
});

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.swordStorm = {
      nextFireAt: 0,
      colorIndex: 0
    };
    this.crimsonLaserState = {
      timer: null,
      startedAtMs: 0,
      lastDamageAtMs: 0,
      durationMs: 0,
      originX: 0,
      originY: 0,
      coreParts: null,
      castToken: 0,
      pendingLaunch: false
    };
  }

  getScaledPlayerDamageBase() {
    return P.atk * COMBAT_TUNING.playerDamageScale * (1 + (P.mods?.skillDamage || 0));
  }

  isInCameraView(x, y, pad = 0) {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view) return true;
    return x >= view.x - pad && x <= view.right + pad && y >= view.y - pad && y <= view.bottom + pad;
  }

  isEnemyVisible(en, pad = 0) {
    if (!en || !en.active || en.getData('dead')) return false;
    return this.isInCameraView(en.x, en.y, pad);
  }

  getSwordFlyTextureKey() {
    return this.scene?.textures?.exists?.(SWORD_FLY_TEX) ? SWORD_FLY_TEX : 'swordQi';
  }

  getFiredomainTextureKey() {
    return this.scene?.textures?.exists?.(FIREDOMAIN_TEX) ? FIREDOMAIN_TEX : 'swordQi';
  }

  spawnProjectile(skillId, angle, dmg, options = {}) {
    const tex = {
      'fireball': 'fireball',
      'firedomain': this.getFiredomainTextureKey(),
      'swordfly': this.getSwordFlyTextureKey(),
      'thunder': 'bolt'
    }[skillId] || 'arrow';
    const startX = options.startX ?? this.scene.player.x;
    const startY = options.startY ?? this.scene.player.y;
    const proj = this.scene.getPooledProj(startX, startY, tex);
    if (!proj) return null;

    const speed = options.speed || (skillId === 'swordfly' ? SWORD_PROJECTILE_SPEED : 450);
    this.scene.physics.velocityFromRotation(angle, speed, proj.body.velocity);
    proj.rotation = angle;
    proj.setData('damage', dmg);
    proj.setData('pierce', !!options.pierce);
    proj.setData('skillId', skillId);
    proj.setData('speed', speed);
    proj.setData('homing', !!options.homing);
    proj.setData('turnRate', options.turnRate || 0);
    proj.setData('seekRadius', options.seekRadius || 0);
    proj.setData('targetRef', options.targetRef || null);
    proj.setData('maxHits', options.maxHits || 0);
    proj.setData('hitCount', 0);
    proj.setData('lastHitAtMs', 0);
    proj.setData('customTint', options.customTint || null);
    proj.setData('customTrailColor', options.customTrailColor || null);
    proj.setData('noFireField', !!options.noFireField);
    proj.setData('lastFireFieldX', startX);
    proj.setData('lastFireFieldY', startY);
    proj.setData('growingFireball', !!options.growingFireball);
    proj.setData('fireballTrackArmed', false);
    proj.setData('hitTargets', null);
    proj.setData('baseBodyW', null);
    proj.setData('baseBodyH', null);
    proj.setData('lifetimeMs', options.lifetime || 1200);
    if (proj.body) {
      if (skillId === 'swordfly') proj.body.setSize(SWORD_HITBOX_W, SWORD_HITBOX_H, true);
      else proj.body.setSize(proj.width, proj.height, true);
    }
    this.scene.skillEffects?.onProjectileFired(proj, skillId, angle);
    if (skillId === 'swordfly') {
      proj.setScale(SWORD_START_SCALE);
      proj.setData('scaleStart', SWORD_START_SCALE);
      proj.setData('scaleEnd', SWORD_END_SCALE);
      proj.setData('scaleGrowMs', SWORD_GROW_DURATION_MS);
      proj.setData('spawnAtMs', this.scene.time.now);
    }

    const lifetime = options.lifetime || 1200;
    this.scene.scheduleProjFree(proj, lifetime);
    return proj;
  }

  getVisibleEnemyCandidates(activeEnemies) {
    return (activeEnemies || []).filter((en) => this.isEnemyVisible(en));
  }

  findNearestEnemyFrom(x, y, enemies, range, usedSet = null) {
    let target = null;
    let bestD2 = range * range;
    for (const en of enemies) {
      if (!this.isEnemyVisible(en)) continue;
      if (usedSet?.has(en)) continue;
      const dx = en.x - x;
      const dy = en.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        target = en;
      }
    }
    return target;
  }

  pickSwordTarget(closestQ, activeEnemies, range) {
    if (this.isEnemyVisible(closestQ)) {
      const dx = closestQ.x - this.scene.player.x;
      const dy = closestQ.y - this.scene.player.y;
      if (dx * dx + dy * dy <= range * range) return closestQ;
    }
    return this.findNearestEnemyFrom(this.scene.player.x, this.scene.player.y, activeEnemies, range);
  }

  /** 发射一发追踪飞剑（齐射由 shots 参数控制；飞行速度受「追风」卡加成） */
  shootSwordStorm(target, dmg, range, lifetime, color, shots = 1, spread = 0.07) {
    if (!target || !this.isEnemyVisible(target)) return false;
    const px = this.scene.player.x;
    const py = this.scene.player.y;
    const baseAngle = Phaser.Math.Angle.Between(px, py, target.x, target.y);
    const speed = SWORD_PROJECTILE_SPEED + (P.mods?.swordSpeed || 0);
    for (let i = 0; i < shots; i++) {
      const angle = shots === 1 ? baseAngle : (baseAngle + (i / (shots - 1) - 0.5) * spread);
      const proj = this.spawnProjectile('swordfly', angle, dmg, {
        startX: px,
        startY: py,
        pierce: true,
        homing: false,
        turnRate: SWORD_TURN_RATE,
        speed,
        seekRadius: range,
        maxHits: SWORD_MAX_HIT_COUNT,
        customTint: color,
        customTrailColor: color,
        targetRef: null,
        lifetime
      });
      if (!proj) return false;
    }
    this.scene.entityAnimationSystem?.playPlayerAttack(baseAngle);
    return true;
  }

  getSwordStormInterval() {
    const speedBoost = Math.max(0, P.mods.swordAtkSpeedBoost || 0);
    const interval = SWORD_STORM_INTERVAL / (1 + speedBoost);
    return Math.max(0.12, interval);
  }

  recallSwordProjectiles() {
    let recalled = 0;
    this.scene.projectiles.children.iterate((proj) => {
      if (!proj || !proj.active) return;
      if (proj.getData('skillId') !== 'swordfly') return;
      this.scene.freeProj(proj);
      recalled++;
    });
    return recalled;
  }

  findSwordTarget(proj, seekRadius) {
    let nearest = null;
    let bestD2 = seekRadius * seekRadius;
    this.scene.enemies.children.iterate((en) => {
      if (!this.isEnemyVisible(en)) return;
      const dx = en.x - proj.x;
      const dy = en.y - proj.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        nearest = en;
      }
    });
    return nearest;
  }

  findFireballTarget(proj, seekRadius, skipSet = null) {
    let nearest = null;
    let bestD2 = seekRadius * seekRadius;
    this.scene.enemies.children.iterate((en) => {
      if (!this.isEnemyVisible(en)) return;
      if (skipSet?.has(en)) return;
      const dx = en.x - proj.x;
      const dy = en.y - proj.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        nearest = en;
      }
    });
    return nearest;
  }

  updateSwordProjectiles(dt) {
    const nowMs = this.scene.time.now;
    this.scene.projectiles.children.iterate((proj) => {
      if (!proj || !proj.active) return;
      const skillId = proj.getData('skillId');

      if (skillId === 'fireball' && proj.getData('growingFireball')) {
        let spawnAtMs = proj.getData('spawnAtMs');
        if (spawnAtMs == null) {
          spawnAtMs = nowMs;
          proj.setData('spawnAtMs', spawnAtMs);
        }
        const scaleStart = proj.getData('scaleStart') ?? GROWING_FIREBALL_START_SCALE;
        const scaleEnd = proj.getData('scaleEnd') ?? GROWING_FIREBALL_END_SCALE;
        const growMs = proj.getData('scaleGrowMs') || proj.getData('lifetimeMs') || 1200;
        const growT = Phaser.Math.Clamp((nowMs - spawnAtMs) / growMs, 0, 1);
        const fireballScale = Phaser.Math.Linear(scaleStart, scaleEnd, growT);
        proj.setScale(fireballScale);

        const lifetimeMs = proj.getData('lifetimeMs') || growMs;
        const lifeT = Phaser.Math.Clamp((nowMs - spawnAtMs) / lifetimeMs, 0, 1);
        const fadeT = Phaser.Math.Clamp((lifeT - 0.72) / 0.28, 0, 1);
        proj.setAlpha(Phaser.Math.Linear(1, 0.15, fadeT));

        if (proj.body) {
          const baseBodyW = proj.getData('baseBodyW') || proj.width;
          const baseBodyH = proj.getData('baseBodyH') || proj.height;
          proj.body.setSize(
            Math.max(10, baseBodyW * fireballScale),
            Math.max(10, baseBodyH * fireballScale),
            true
          );
        }

        if (!proj.getData('homing') || !proj.body) return;

        const seekRadius = proj.getData('seekRadius') || this.getVisibleSwordRange();
        const trackArmed = !!proj.getData('fireballTrackArmed');
        let hitTargets = proj.getData('hitTargets');
        if (!(hitTargets instanceof Set)) {
          hitTargets = new Set();
          proj.setData('hitTargets', hitTargets);
        }
        let target = proj.getData('targetRef');
        const targetValid = this.isEnemyVisible(target) && (() => {
          const dx = target.x - proj.x;
          const dy = target.y - proj.y;
          if (dx * dx + dy * dy > seekRadius * seekRadius) return false;
          if (trackArmed && hitTargets.has(target)) return false;
          return true;
        })();

        if (!targetValid) {
          target = this.findFireballTarget(proj, seekRadius, trackArmed ? hitTargets : null);
          proj.setData('targetRef', target || null);
        }

        const currentAngle = Math.atan2(proj.body.velocity.y, proj.body.velocity.x);
        if (!target) {
          proj.rotation = currentAngle;
          return;
        }
        const desiredAngle = Phaser.Math.Angle.Between(proj.x, proj.y, target.x, target.y);
        const turnRate = proj.getData('turnRate') || GROWING_FIREBALL_TRACK_TURN_RATE;
        const speed = proj.getData('speed') || 340;
        const nextAngle = Phaser.Math.Angle.RotateTo(currentAngle, desiredAngle, turnRate * dt);
        this.scene.physics.velocityFromRotation(nextAngle, speed, proj.body.velocity);
        proj.rotation = nextAngle;
        return;
      }

      if (skillId !== 'swordfly') return;

      let spawnAtMs = proj.getData('spawnAtMs');
      if (spawnAtMs == null) {
        spawnAtMs = nowMs;
        proj.setData('spawnAtMs', spawnAtMs);
      }
      const scaleStart = proj.getData('scaleStart') ?? SWORD_START_SCALE;
      const scaleEnd = proj.getData('scaleEnd') ?? SWORD_END_SCALE;
      const growMs = proj.getData('scaleGrowMs') || SWORD_GROW_DURATION_MS;
      const growT = Phaser.Math.Clamp((nowMs - spawnAtMs) / growMs, 0, 1);
      proj.setScale(Phaser.Math.Linear(scaleStart, scaleEnd, growT));

      if (!proj.getData('homing') || !proj.body) return;

      const seekRadius = proj.getData('seekRadius') || 0;
      let target = proj.getData('targetRef');
      const targetValid = this.isEnemyVisible(target) && (() => {
        const dx = target.x - proj.x;
        const dy = target.y - proj.y;
        return dx * dx + dy * dy <= seekRadius * seekRadius;
      })();

      if (!targetValid) {
        target = this.findSwordTarget(proj, seekRadius || 300);
        proj.setData('targetRef', target || null);
      }

      const currentAngle = Math.atan2(proj.body.velocity.y, proj.body.velocity.x);
      if (!target) {
        proj.rotation = currentAngle;
        return;
      }

      const desiredAngle = Phaser.Math.Angle.Between(proj.x, proj.y, target.x, target.y);
      const turnRate = proj.getData('turnRate') || 0;
      const speed = proj.getData('speed') || SWORD_PROJECTILE_SPEED;
      const nextAngle = Phaser.Math.Angle.RotateTo(currentAngle, desiredAngle, turnRate * dt);
      this.scene.physics.velocityFromRotation(nextAngle, speed, proj.body.velocity);
      proj.rotation = nextAngle;
    });
  }

  doDomainSkill(tx, ty, dmg, def) {
    const { scene } = this;
    scene.skillEffects?.onDomainCast(tx, ty, def);
    scene.enemies.children.iterate((en) => {
      if (!en || en.getData('dead')) return;
      const dx = en.x - tx, dy = en.y - ty;
      if (dx * dx + dy * dy <= (def.aoeRadius || 140) * (def.aoeRadius || 140)) {
        this.damageEnemy(en, dmg, def.id);
        if (def.freeze) en.setData('freezeTimer', def.freeze);
        else if (def.slow) en.setData('slowTimer', 2.5);
      }
    });
  }

  castGrowingFireball(totalDamage, activeEnemies) {
    const visibleTargets = this.getVisibleEnemyCandidates(activeEnemies);
    if (!visibleTargets.length) return false;

    let target = null;
    let bestD2 = Infinity;
    for (const en of visibleTargets) {
      const dx = en.x - this.scene.player.x;
      const dy = en.y - this.scene.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        target = en;
      }
    }
    if (!target) return false;

    const baseAngle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, target.x, target.y);
    const visibleRange = this.getVisibleSwordRange();
    const speed = 340;
    const lifetime = Math.max(2100, Math.round((visibleRange / speed) * 1000) + 850);
    const dmg = Math.max(1, Math.round(totalDamage));
    const proj = this.spawnProjectile('fireball', baseAngle, dmg, {
      speed,
      lifetime,
      pierce: true,
      homing: true,
      turnRate: GROWING_FIREBALL_TRACK_TURN_RATE,
      seekRadius: visibleRange,
      targetRef: target,
      noFireField: true
    });
    if (!proj) return false;

    proj.setData('growingFireball', true);
    proj.setData('scaleStart', GROWING_FIREBALL_START_SCALE);
    proj.setData('scaleEnd', GROWING_FIREBALL_END_SCALE);
    proj.setData('scaleGrowMs', Math.round(lifetime * 0.92));
    proj.setData('lifetimeMs', lifetime);
    proj.setData('fireballTrackArmed', false);
    proj.setData('spawnAtMs', this.scene.time.now);
    proj.setData('hitTargets', new Set());
    proj.setScale(GROWING_FIREBALL_START_SCALE);
    if (proj.body) {
      proj.setData('baseBodyW', proj.width);
      proj.setData('baseBodyH', proj.height);
      proj.body.setSize(
        Math.max(10, proj.width * GROWING_FIREBALL_START_SCALE),
        Math.max(10, proj.height * GROWING_FIREBALL_START_SCALE),
        true
      );
    }
    this.scene.entityAnimationSystem?.playPlayerAttack(baseAngle);
    return true;
  }

  castGiantSwordStrike(target, totalDamage, def) {
    if (!target || !this.isEnemyVisible(target)) return false;
    const angle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, target.x, target.y);
    const visibleRange = this.getVisibleSwordRange();
    const speed = 520;
    const lifetime = Math.max(980, Math.round((visibleRange / speed) * 1000) + 280);
    const dmg = Math.max(1, Math.round(totalDamage));
    const tint = def?.color || 0xffd06a;
    const proj = this.spawnProjectile('firedomain', angle, dmg, {
      speed,
      lifetime,
      pierce: true,
      homing: false,
      seekRadius: visibleRange,
      customTint: tint,
      customTrailColor: 0xff915c,
      noFireField: true
    });
    if (!proj) return false;
    const usingSvgSword = proj.texture?.key === FIREDOMAIN_TEX;
    proj.setScale(usingSvgSword ? 0.92 : 2.8);
    if (proj.body) {
      if (usingSvgSword) proj.body.setSize(118, 34, true);
      else proj.body.setSize(72, 24, true);
    }
    this.scene.entityAnimationSystem?.playPlayerAttack(angle);
    return true;
  }

  createCrimsonGroundCore(x, y, durationMs, color = 0xff2a2a) {
    this.destroyCrimsonGroundCore();
    const lowFx = !!this.scene.skillEffects?.lowFxMode;
    const core = this.scene.add.circle(x, y, lowFx ? 12 : 16, color, 0.82).setDepth(9);
    core.setStrokeStyle(2, 0xffb0b0, 0.9);
    const ring = this.scene.add.circle(x, y, lowFx ? 22 : 30, color, 0.2).setDepth(8);
    ring.setStrokeStyle(2, color, 0.7);
    const glow = this.scene.add.circle(x, y, lowFx ? 34 : 46, 0xff3b3b, 0.14).setDepth(7);
    const pulseTween = this.scene.tweens.add({
      targets: [core, ring],
      scaleX: 1.16,
      scaleY: 1.16,
      duration: lowFx ? 220 : 180,
      yoyo: true,
      repeat: -1
    });
    const glowTween = this.scene.tweens.add({
      targets: glow,
      alpha: lowFx ? 0.22 : 0.28,
      duration: 200,
      yoyo: true,
      repeat: -1
    });
    const lifeTimer = this.scene.time.delayedCall(durationMs + 220, () => this.destroyCrimsonGroundCore());
    this.crimsonLaserState.coreParts = { core, ring, glow, pulseTween, glowTween, lifeTimer };
  }

  destroyCrimsonGroundCore() {
    const parts = this.crimsonLaserState?.coreParts;
    if (!parts) return;
    if (parts.lifeTimer?.remove) parts.lifeTimer.remove(false);
    if (parts.pulseTween) parts.pulseTween.remove();
    if (parts.glowTween) parts.glowTween.remove();
    if (parts.core?.active) parts.core.destroy();
    if (parts.ring?.active) parts.ring.destroy();
    if (parts.glow?.active) parts.glow.destroy();
    this.crimsonLaserState.coreParts = null;
  }

  stopCrimsonLaserBarrage() {
    const timer = this.crimsonLaserState?.timer;
    if (timer?.remove) timer.remove(false);
    this.crimsonLaserState.timer = null;
    this.crimsonLaserState.pendingLaunch = false;
    this.crimsonLaserState.castToken = (this.crimsonLaserState.castToken || 0) + 1;
    this.destroyCrimsonGroundCore();
  }

  getHalfScreenRange() {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view) return 220;
    return Math.max(180, Math.min(view.width, view.height) * 0.5);
  }

  collectAliveEnemies(maxRange = Infinity, centerX = null, centerY = null) {
    const targets = [];
    const hasRangeLimit = Number.isFinite(maxRange) && maxRange > 0;
    const rangeSq = hasRangeLimit ? maxRange * maxRange : Infinity;
    const px = centerX ?? this.scene.player.x;
    const py = centerY ?? this.scene.player.y;
    this.scene.enemies.children.iterate((en) => {
      if (!en || !en.active || en.getData('dead')) return;
      if (hasRangeLimit) {
        const dx = en.x - px;
        const dy = en.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 > rangeSq) return;
      }
      targets.push(en);
    });
    return targets;
  }

  castCrimsonLaserBarrage(activeEnemies, totalDamage, def) {
    const halfScreenRange = this.getHalfScreenRange();
    const initialTargets = (activeEnemies || []).filter((en) => {
      if (!en || !en.active || en.getData('dead')) return false;
      const dx = en.x - this.scene.player.x;
      const dy = en.y - this.scene.player.y;
      return dx * dx + dy * dy <= halfScreenRange * halfScreenRange;
    });
    if (!initialTargets.length) return false;

    this.stopCrimsonLaserBarrage();
    const castToken = this.crimsonLaserState.castToken;

    const durationMs = Math.round(Math.max(0.5, def?.duration || CRIMSON_LASER_DURATION_SEC) * 1000);
    const beamTickMs = this.scene.skillEffects?.lowFxMode ? 180 : CRIMSON_LASER_BEAM_TICK_MS;
    const damageTickMs = CRIMSON_LASER_DAMAGE_TICK_MS;
    const damageTickCount = Math.max(1, Math.ceil(durationMs / damageTickMs));
    const perTickDamage = Math.max(1, Math.round(totalDamage / damageTickCount));
    const skillId = def?.id || 'laser';
    const beamColor = def?.color || 0xff1f1f;
    let focusSeed = initialTargets[0];
    let seedBest = Infinity;
    for (const en of initialTargets) {
      const dx = en.x - this.scene.player.x;
      const dy = en.y - this.scene.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < seedBest) {
        seedBest = d2;
        focusSeed = en;
      }
    }

    const startLaserAt = (originX, originY) => {
      if (this.crimsonLaserState.castToken !== castToken) return;
      this.crimsonLaserState.pendingLaunch = false;
      this.crimsonLaserState.originX = originX;
      this.crimsonLaserState.originY = originY;
      this.createCrimsonGroundCore(originX, originY, durationMs, beamColor);
      this.crimsonLaserState.startedAtMs = this.scene.time.now;
      this.crimsonLaserState.lastDamageAtMs = this.scene.time.now;
      this.crimsonLaserState.durationMs = durationMs;

      const tick = () => {
        if (this.crimsonLaserState.castToken !== castToken) return;
        if (this.scene.playerDead) {
          this.stopCrimsonLaserBarrage();
          return;
        }
        const nowMs = this.scene.time.now;
        if (nowMs - this.crimsonLaserState.startedAtMs >= this.crimsonLaserState.durationMs) {
          this.stopCrimsonLaserBarrage();
          return;
        }

        const rangeNow = this.getHalfScreenRange();
        const targets = this.collectAliveEnemies(rangeNow, originX, originY);
        if (!targets.length) return;

        let focus = targets[0];
        let bestD2 = Infinity;
        for (const en of targets) {
          const dx = en.x - originX;
          const dy = en.y - originY;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) {
            bestD2 = d2;
            focus = en;
          }
        }

        const aimAngle = Phaser.Math.Angle.Between(originX, originY, focus.x, focus.y);
        this.scene.entityAnimationSystem?.playPlayerAttack(aimAngle);
        this.scene.skillEffects?.castCrimsonLaserBurst?.(
          originX,
          originY,
          targets,
          beamColor
        );

        if (nowMs - this.crimsonLaserState.lastDamageAtMs < damageTickMs) return;
        this.crimsonLaserState.lastDamageAtMs = nowMs;
        for (const en of targets) this.damageEnemy(en, perTickDamage, skillId);
      };

      tick();
      this.crimsonLaserState.timer = this.scene.time.addEvent({
        delay: beamTickMs,
        loop: true,
        callback: tick
      });
    };

    const launchFromX = this.scene.player.x;
    const launchFromY = this.scene.player.y;
    const impactX = focusSeed?.x ?? launchFromX;
    const impactY = focusSeed?.y ?? launchFromY;
    const impactDef = { ...def, id: 'laser', color: beamColor };
    this.crimsonLaserState.pendingLaunch = true;

    const onImpact = (ix, iy) => {
      if (this.crimsonLaserState.castToken !== castToken) return;
      let firstHitTarget = null;
      if (focusSeed?.active && !focusSeed.getData('dead')) firstHitTarget = focusSeed;
      if (!firstHitTarget) {
        const impactCandidates = this.collectAliveEnemies(this.getHalfScreenRange(), ix, iy);
        firstHitTarget = this.findNearestEnemyFrom(ix, iy, impactCandidates, this.getHalfScreenRange());
      }
      if (firstHitTarget) this.damageEnemy(firstHitTarget, perTickDamage, skillId);
      startLaserAt(ix, iy);
    };

    const launchAngle = Phaser.Math.Angle.Between(launchFromX, launchFromY, impactX, impactY);
    this.scene.entityAnimationSystem?.playPlayerAttack(launchAngle);
    if (this.scene.skillEffects?.launchDomainOrb) {
      this.scene.skillEffects.launchDomainOrb(launchFromX, launchFromY, impactX, impactY, impactDef, onImpact);
    } else {
      onImpact(impactX, impactY);
    }
    return true;
  }

  getVisibleSwordRange() {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view) return 360;
    const halfDiagonal = Math.sqrt(view.width * view.width + view.height * view.height) * 0.5;
    const range = Math.max(320, Math.round(halfDiagonal + 80));
    return Math.round(range * (1 + (P.mods?.rangeBoost || 0)));
  }

  findNearestSkillTarget(activeEnemies, range) {
    let target = null;
    let bestD2 = Infinity;
    const r2 = range * range;
    for (const en of activeEnemies) {
      if (!en || en.getData('dead')) continue;
      const dx = en.x - this.scene.player.x;
      const dy = en.y - this.scene.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 < bestD2) {
        bestD2 = d2;
        target = en;
      }
    }
    return target;
  }

  castElementDomain(target, def, dmg) {
    const { scene } = this;

    if (!target) return;

    const spreadRadius = Math.round((def.aoeRadius || 140) * 1.18);
    const duration = def.duration || 8;
    const impactDef = { ...def, aoeRadius: spreadRadius, duration };
    const impactX = target.x;
    const impactY = target.y;
    const angle = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, impactX, impactY);
    scene.entityAnimationSystem?.playPlayerAttack(angle);

    const onImpact = (ix, iy) => {
      const burstDamage = Math.max(1, Math.round(dmg * 0.45));
      this.doDomainSkill(ix, iy, burstDamage, impactDef);
      if (def.id === 'thunder') {
        scene.groundEffectSystem?.addThunderField(ix, iy, spreadRadius, Math.max(1, Math.round(dmg * 0.95)), duration);
      }
    };

    if (scene.skillEffects?.launchDomainOrb) {
      scene.skillEffects.launchDomainOrb(scene.player.x, scene.player.y, impactX, impactY, impactDef, onImpact);
    } else {
      onImpact(impactX, impactY);
    }
  }

  /* ---- 伤害 / 战败结算（核心逻辑位于 ./damage.js） ---- */
  onProjHit(proj, en) { onProjHit(this.scene, proj, en); }
  onEnemyProjHit(proj) { onEnemyProjHit(this.scene, proj); }
  onEnemyContact(en) { onEnemyContact(this.scene, en); }
  damageEnemy(en, dmg, skillId) { damageEnemy(this.scene, en, dmg, skillId); }

  /** 普攻飞剑：自动索敌连射，弹道数 = 1 + 分身卡层数 */
  useAutoAttack(skillNow, closestQ, activeEnemies, qDef) {
    const volleyCount = 1 + (P.mods?.multiShot || 0);
    const qCD = qDef.cooldown || 0.7;
    const range = this.getVisibleSwordRange();
    const visibleTargets = this.getVisibleEnemyCandidates(activeEnemies);
    if (visibleTargets.length === 0) {
      this.recallSwordProjectiles();
      this.scene.skillCooldowns[qDef.id] = skillNow;
      return;
    }

    if (!this.swordStorm.nextFireAt) this.swordStorm.nextFireAt = skillNow;
    if (skillNow < this.swordStorm.nextFireAt) return;
    const swordInterval = this.getSwordStormInterval();

    const totalDamage = Math.round(this.getScaledPlayerDamageBase() * (qDef.baseDmg || 0.7) * (0.72 + 1 * 0.06));
    const perSwordDamage = Math.max(1, Math.round(totalDamage / volleyCount));
    const lifetime = Math.max(SWORD_MIN_LIFETIME, Math.round(range * SWORD_RANGE_LIFETIME_FACTOR));
    const target = this.pickSwordTarget(closestQ, visibleTargets, range);
    if (target) {
      const color = SWORD_COLOR_PALETTE[this.swordStorm.colorIndex % SWORD_COLOR_PALETTE.length];
      const fired = this.shootSwordStorm(target, perSwordDamage, range, lifetime, color, volleyCount);
      if (fired) {
        this.swordStorm.colorIndex++;
        this.swordStorm.nextFireAt = skillNow + swordInterval;
      } else {
        this.swordStorm.nextFireAt = skillNow + swordInterval;
      }
    }

    this.scene.skillCooldowns[qDef.id] = this.swordStorm.nextFireAt || (skillNow + qCD);
  }

  /** 抽卡技能自动轮转：CD 到且有目标就施放 */
  useOwnedSkills(skillNow, activeEnemies) {
    const { scene } = this;
    for (const skillId of P.skills) {
      const card = SKILL_CARDS.find(c => c.id === skillId);
      if (!card) continue;
      if (skillNow < (scene.skillCooldowns[skillId] || 0)) continue;
      const cd = (card.cooldown || 3) * (1 - Math.min(0.45, P.mods?.cooldownReduction || 0));
      const lv = P.skillLevels?.[skillId] || 1;
      const lvMult = 1 + (lv - 1) * 0.18;
      const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * (card.baseDmg || 1) * lvMult));

      switch (card.type) {
        case 'projectile': {
          const target = this.findNearestSkillTarget(activeEnemies, this.getVisibleSwordRange());
          if (!target) continue;
          scene.skillCooldowns[skillId] = skillNow + cd;
          if (!this.castGiantSwordStrike(target, dmg, { id: skillId, color: card.color })) {
            scene.skillCooldowns[skillId] = skillNow;
            continue;
          }
          this.scene.showSkillName(card.name, card.color);
          break;
        }
        case 'fireball': {
          if (!this.castGrowingFireball(dmg, activeEnemies)) continue;
          scene.skillCooldowns[skillId] = skillNow + cd;
          this.scene.showSkillName(card.name, card.color);
          break;
        }
        case 'thunder': {
          const target = this.findNearestSkillTarget(activeEnemies, card.aoeRadius || 260);
          if (!target) continue;
          scene.skillCooldowns[skillId] = skillNow + cd;
          this.castElementDomain(target, { id: 'thunder', aoeRadius: card.aoeRadius || 260, duration: card.duration || 4, color: card.color }, dmg);
          this.scene.showSkillName(card.name, card.color);
          break;
        }
        case 'laser': {
          if (!activeEnemies?.length) continue;
          scene.skillCooldowns[skillId] = skillNow + cd;
          this.castCrimsonLaserBarrage(activeEnemies, dmg, { id: 'laser', duration: card.duration || 2.5, color: card.color || 0xff2a2a });
          this.scene.showSkillName(card.name, card.color);
          break;
        }
        case 'frost': {
          const target = this.findNearestSkillTarget(activeEnemies, card.aoeRadius || 150);
          if (!target) continue;
          scene.skillCooldowns[skillId] = skillNow + cd;
          scene.groundEffectSystem?.addFrostField(target.x, target.y, card.aoeRadius || 150, dmg, card.duration || 6, 1.2);
          this.doDomainSkill(target.x, target.y, Math.round(dmg * 0.4), { ...card, id: 'frost' });
          this.scene.showSkillName(card.name, card.color);
          break;
        }
        case 'heal': {
          if (P.hp >= P.maxHp) continue;
          scene.skillCooldowns[skillId] = skillNow + cd;
          const healValue = Math.max(1, Math.round(P.maxHp * (card.healPct || 0.3)));
          const beforeHp = P.hp;
          P.hp = Math.min(P.maxHp, P.hp + healValue);
          scene.skillEffects?.onBuffCast(card.color || 0x66d98f);
          this.scene.showSkillName(card.name, card.color || 0x66d98f);
          if (P.hp > beforeHp) {
            scene.textPool.show(scene.player.x, scene.player.y - 36, '+' + (P.hp - beforeHp), {
              fontSize: '18px',
              color: '#6de27a',
              stroke: '#000',
              strokeThickness: 2,
              depth: 20,
              floatDist: 34,
              duration: 760
            });
          }
          bus.emit('hud-refresh');
          break;
        }
      }
    }
  }
}
