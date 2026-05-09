import { P, recalcStats } from '../core/state.js';
import { SKILL_DEFS, RARITY_LABEL, RARITY_COLORS, COMBAT_TUNING } from '../data/index.js';
import { genEquipment, acquireEquipment } from '../core/equipment.js';
import { bus } from '../core/events.js';

const SWORD_VOLLEY_COUNT = 3;
const SWORD_VOLLEY_SPREAD = 0.28;
const SWORD_TURN_RATE = 12;
const SWORD_PROJECTILE_SPEED = 560;
const SWORD_MIN_LIFETIME = 1900;
const SWORD_RANGE_LIFETIME_FACTOR = 7.5;
const SWORD_HITBOX_W = 30;
const SWORD_HITBOX_H = 18;
const SWORD_MAX_HIT_COUNT = 10;
const SWORD_HIT_COOLDOWN_MS = 120;
const SWORD_STORM_SHOTS_PER_SEC = 3;
const SWORD_STORM_INTERVAL = 1 / SWORD_STORM_SHOTS_PER_SEC;
const SWORD_START_SCALE = 0.62;
const SWORD_END_SCALE = 1.2;
const SWORD_GROW_DURATION_MS = 480;
const SWORD_RING_COUNT = 99;
const SWORD_RING_RADIUS = 40;
const SWORD_RING_ROTATE_SPEED = 2.7;
const SWORD_RING_SHOT_LIMIT = 24;
const SWORD_RING_LAYER_CAP = 33;
const SWORD_RING_RADIUS_STEP = 18;
const SWORD_COLOR_PALETTE = Object.freeze([
  0xff5f57,
  0xffa33b,
  0xffdf4f,
  0x6fe786,
  0x62b6ff,
  0x9a7cff,
  0xff74c8
]);

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.swordStorm = {
      nextFireAt: 0,
      colorIndex: 0
    };
    this.swordRing = {
      sprites: [],
      orbitAngle: 0,
      firedCount: 0,
      nextOrbIndex: 0,
      nextFireAt: 0,
      rebuildAt: 0
    };
  }

  getScaledPlayerDamageBase() {
    return (P.atk + P.level * 0.5) * COMBAT_TUNING.playerDamageScale;
  }

  splitDamage(totalDamage, count) {
    const base = Math.floor(totalDamage / count);
    const remainder = Math.max(0, totalDamage - base * count);
    return Array.from({ length: count }, (_, idx) => base + (idx < remainder ? 1 : 0));
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

  spawnProjectile(skillId, angle, dmg, options = {}) {
    const tex = { 'fireball': 'fireball', 'swordfly': 'swordQi', 'thunder': 'bolt', 'waterdomain': 'water', 'tornado': 'wind' }[skillId] || 'arrow';
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

  shootProjectile(skillId, angle, dmg, range) {
    const proj = this.spawnProjectile(skillId, angle, dmg, {
      pierce: false,
      lifetime: 1200
    });
    if (!proj) return;
    if (skillId === 'fireball' && !proj.getData('noFireField')) {
      this.scene.groundEffectSystem?.addFireField(this.scene.player.x, this.scene.player.y, dmg * 0.18, 10);
    }
    this.scene.entityAnimationSystem?.playPlayerAttack(angle);
  }

  doMultiProjectile(angle, dmg, count, range, texture) {
    const tex = texture || 'swordQi';
    const offsets = [];
    for (let i = 0; i < count; i++) offsets.push((i / (count - 1) - 0.5) * 0.6);
    offsets.forEach(o => {
      const ang = angle + o;
      const proj = this.scene.getPooledProj(this.scene.player.x, this.scene.player.y, tex);
      if (proj) {
        proj.setScale(0.8);
        this.scene.physics.velocityFromRotation(ang, 460, proj.body.velocity);
        proj.rotation = ang;
        proj.setData('damage', Math.round(dmg * 0.6));
        proj.setData('pierce', false);
        proj.setData('homing', false);
        proj.setData('turnRate', 0);
        proj.setData('seekRadius', 0);
        proj.setData('targetRef', null);
        proj.setData('speed', 460);
        proj.setData('skillId', 'swordfly');
        this.scene.skillEffects?.onProjectileFired(proj, 'swordfly', ang);
        this.scene.scheduleProjFree(proj, 1000);
      }
    });
  }

  getSwordVolleyTargets(primaryTarget, activeEnemies, count) {
    const uniqueTargets = [];
    const candidates = (activeEnemies || [])
      .filter((en) => this.isEnemyVisible(en))
      .sort((a, b) => {
        const adx = a.x - this.scene.player.x;
        const ady = a.y - this.scene.player.y;
        const bdx = b.x - this.scene.player.x;
        const bdy = b.y - this.scene.player.y;
        return adx * adx + ady * ady - (bdx * bdx + bdy * bdy);
      });

    if (this.isEnemyVisible(primaryTarget)) uniqueTargets.push(primaryTarget);
    for (const enemy of candidates) {
      if (uniqueTargets.includes(enemy)) continue;
      uniqueTargets.push(enemy);
      if (uniqueTargets.length >= count) break;
    }

    while (uniqueTargets.length < count && uniqueTargets.length > 0) {
      uniqueTargets.push(uniqueTargets[uniqueTargets.length % Math.max(1, Math.min(uniqueTargets.length, count))]);
    }
    return uniqueTargets;
  }

  createSwordRingSprites() {
    this.clearSwordRingSprites();
    const paletteLen = SWORD_COLOR_PALETTE.length;
    for (let i = 0; i < SWORD_RING_COUNT; i++) {
      const layer = Math.floor(i / SWORD_RING_LAYER_CAP);
      const inLayerIndex = i % SWORD_RING_LAYER_CAP;
      const layerStart = layer * SWORD_RING_LAYER_CAP;
      const countInLayer = Math.min(SWORD_RING_LAYER_CAP, SWORD_RING_COUNT - layerStart);
      const radius = SWORD_RING_RADIUS + layer * SWORD_RING_RADIUS_STEP;
      const scale = Math.max(0.28, 0.56 - layer * 0.08);
      const baseAngle = (inLayerIndex / Math.max(1, countInLayer)) * Math.PI * 2 + layer * 0.13;
      const color = SWORD_COLOR_PALETTE[i % paletteLen];
      const orb = this.scene.add.sprite(this.scene.player.x, this.scene.player.y, 'swordQi').setDepth(11);
      orb.setScale(scale).setAlpha(0.9).setTint(color);
      this.swordRing.sprites.push({
        sprite: orb,
        baseAngle,
        radius,
        scale,
        color,
        speedMul: layer % 2 === 0 ? 1 : -0.82
      });
    }
  }

  clearSwordRingSprites() {
    for (const item of this.swordRing.sprites) {
      if (item?.sprite?.active) item.sprite.destroy();
    }
    this.swordRing.sprites = [];
  }

  ensureSwordRingReady(skillNow) {
    if (skillNow < (this.swordRing.rebuildAt || 0)) return false;
    if (this.swordRing.sprites.length !== SWORD_RING_COUNT) {
      this.createSwordRingSprites();
    }
    return this.swordRing.sprites.length === SWORD_RING_COUNT;
  }

  updateSwordRingVisual(dt) {
    if (!this.swordRing.sprites.length || this.scene.playerDead) {
      if (this.scene.playerDead) this.clearSwordRingSprites();
      return;
    }
    this.swordRing.orbitAngle += dt * SWORD_RING_ROTATE_SPEED;
    const px = this.scene.player.x;
    const py = this.scene.player.y;
    for (const item of this.swordRing.sprites) {
      const sp = item?.sprite;
      if (!sp || !sp.active) continue;
      const speedMul = item.speedMul ?? 1;
      const radius = item.radius ?? SWORD_RING_RADIUS;
      const a = this.swordRing.orbitAngle * speedMul + item.baseAngle;
      sp.x = px + Math.cos(a) * radius;
      sp.y = py + Math.sin(a) * radius;
      sp.rotation = a + Math.PI * 0.5;
    }
  }

  getSwordShotDamage(qDef) {
    const lv = P.skillLevels?.[qDef.id] || 1;
    const mult = 1 + (P.buff.atkBoost || 0);
    const total = Math.round(this.getScaledPlayerDamageBase() * (qDef.baseDmg || 0.7) * (0.72 + lv * 0.06) * mult);
    return Math.max(1, Math.round(total / SWORD_VOLLEY_COUNT));
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

  fireOneRingSword(target, dmg, range, lifetime) {
    if (!target || this.swordRing.sprites.length === 0) return false;
    const idx = this.swordRing.nextOrbIndex % this.swordRing.sprites.length;
    this.swordRing.nextOrbIndex += 1;
    const ringNode = this.swordRing.sprites[idx];
    const sx = ringNode?.sprite?.x ?? this.scene.player.x;
    const sy = ringNode?.sprite?.y ?? this.scene.player.y;
    const color = ringNode?.color || SWORD_COLOR_PALETTE[idx % SWORD_COLOR_PALETTE.length];
    const angle = Phaser.Math.Angle.Between(sx, sy, target.x, target.y);
    const proj = this.spawnProjectile('swordfly', angle, dmg, {
      startX: sx,
      startY: sy,
      pierce: true,
      homing: true,
      turnRate: SWORD_TURN_RATE,
      speed: SWORD_PROJECTILE_SPEED,
      seekRadius: range,
      maxHits: SWORD_MAX_HIT_COUNT,
      customTint: color,
      customTrailColor: color,
      targetRef: target,
      lifetime
    });
    if (!proj) return false;
    if (ringNode?.sprite?.active) {
      const baseScale = ringNode.scale ?? 0.42;
      ringNode.sprite.setScale(baseScale * 1.25);
      this.scene.tweens.add({
        targets: ringNode.sprite,
        scaleX: baseScale,
        scaleY: baseScale,
        duration: 120
      });
    }
    this.scene.entityAnimationSystem?.playPlayerAttack(angle);
    return true;
  }

  launchOrbitSwords(activeEnemies, dmg, range, lifetime) {
    if (this.swordRing.sprites.length === 0) return;
    const visible = this.getVisibleEnemyCandidates(activeEnemies);
    const usedTargets = new Set();
    for (const node of this.swordRing.sprites) {
      const sp = node?.sprite;
      if (!sp || !sp.active) continue;
      const color = node?.color || SWORD_COLOR_PALETTE[0];
      const target = this.findNearestEnemyFrom(sp.x, sp.y, visible, range, usedTargets);
      if (target) usedTargets.add(target);
      const tx = target?.x ?? (sp.x + Math.cos(sp.rotation - Math.PI * 0.5) * 220);
      const ty = target?.y ?? (sp.y + Math.sin(sp.rotation - Math.PI * 0.5) * 220);
      const angle = Phaser.Math.Angle.Between(sp.x, sp.y, tx, ty);
      this.spawnProjectile('swordfly', angle, dmg, {
        startX: sp.x,
        startY: sp.y,
        pierce: true,
        homing: !!target,
        turnRate: SWORD_TURN_RATE,
        speed: SWORD_PROJECTILE_SPEED,
        seekRadius: range,
        maxHits: SWORD_MAX_HIT_COUNT,
        customTint: color,
        customTrailColor: color,
        targetRef: target || null,
        lifetime
      });
    }
    this.clearSwordRingSprites();
  }

  shootSwordVolley(primaryTarget, totalDamage, qDef, activeEnemies) {
    const targets = this.getSwordVolleyTargets(primaryTarget, activeEnemies, SWORD_VOLLEY_COUNT);
    if (targets.length === 0) return;

    const damages = this.splitDamage(totalDamage, SWORD_VOLLEY_COUNT);
    const firstTarget = targets[0];
    const centerAngle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, firstTarget.x, firstTarget.y);
    const effectiveRange = this.getVisibleSwordRange();
    const lifetime = Math.max(SWORD_MIN_LIFETIME, Math.round(effectiveRange * SWORD_RANGE_LIFETIME_FACTOR));

    targets.forEach((target, idx) => {
      const spreadOffset = SWORD_VOLLEY_COUNT === 1 ? 0 : (idx / (SWORD_VOLLEY_COUNT - 1) - 0.5) * SWORD_VOLLEY_SPREAD;
      const launchAngle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, target.x, target.y) + spreadOffset;
      const proj = this.spawnProjectile('swordfly', launchAngle, damages[idx] || 1, {
        pierce: true,
        homing: true,
        turnRate: SWORD_TURN_RATE,
        speed: SWORD_PROJECTILE_SPEED,
        seekRadius: effectiveRange,
        maxHits: SWORD_MAX_HIT_COUNT,
        targetRef: target,
        lifetime
      });
    });

    this.scene.entityAnimationSystem?.playPlayerAttack(centerAngle);
  }

  shootSwordStorm(target, dmg, range, lifetime, color) {
    if (!target || !this.isEnemyVisible(target)) return false;
    const px = this.scene.player.x;
    const py = this.scene.player.y;
    const angle = Phaser.Math.Angle.Between(px, py, target.x, target.y);
    const proj = this.spawnProjectile('swordfly', angle, dmg, {
      startX: px,
      startY: py,
      pierce: true,
      homing: true,
      turnRate: SWORD_TURN_RATE,
      speed: SWORD_PROJECTILE_SPEED,
      seekRadius: range,
      maxHits: SWORD_MAX_HIT_COUNT,
      customTint: color,
      customTrailColor: color,
      targetRef: target,
      lifetime
    });
    if (!proj) return false;
    this.scene.entityAnimationSystem?.playPlayerAttack(angle);
    return true;
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

  updateSwordProjectiles(dt) {
    if (this.swordRing?.sprites?.length) this.clearSwordRingSprites();
    this.scene.projectiles.children.iterate((proj) => {
      if (!proj || !proj.active || proj.getData('skillId') !== 'swordfly') return;

      let spawnAtMs = proj.getData('spawnAtMs');
      if (spawnAtMs == null) {
        spawnAtMs = this.scene.time.now;
        proj.setData('spawnAtMs', spawnAtMs);
      }
      const scaleStart = proj.getData('scaleStart') ?? SWORD_START_SCALE;
      const scaleEnd = proj.getData('scaleEnd') ?? SWORD_END_SCALE;
      const growMs = proj.getData('scaleGrowMs') || SWORD_GROW_DURATION_MS;
      const growT = Phaser.Math.Clamp((this.scene.time.now - spawnAtMs) / growMs, 0, 1);
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
        else if (def.id === 'tornado') {
          const pull = new Phaser.Math.Vector2(tx - en.x, ty - en.y);
          if (pull.length() > 1) { pull.normalize().scale(80); en.x += pull.x * 0.15; en.y += pull.y * 0.15; }
        }
      }
    });
  }

  castSixWayMiniFireballs(totalDamage, activeEnemies) {
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

    const count = 6;
    const perFireballDamage = Math.max(1, Math.round(totalDamage / count));
    const baseAngle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, target.x, target.y);
    const visibleRange = this.getVisibleSwordRange();
    const speed = 420;
    const lifetime = Math.max(950, Math.round((visibleRange / speed) * 1000) + 320);
    let fired = 0;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.PI * 2 * i) / count;
      const proj = this.spawnProjectile('fireball', angle, perFireballDamage, {
        speed,
        lifetime,
        pierce: false,
        homing: false,
        noFireField: true
      });
      if (!proj) continue;
      proj.setScale(0.78);
      fired++;
    }

    if (fired > 0) this.scene.entityAnimationSystem?.playPlayerAttack(baseAngle);
    return fired > 0;
  }

  castCrimsonLaserBarrage(activeEnemies, totalDamage, def) {
    const targets = (activeEnemies || []).filter((en) => en && en.active && !en.getData('dead'));
    if (!targets.length) return false;

    let focus = targets[0];
    let bestD2 = Infinity;
    for (const en of targets) {
      const dx = en.x - this.scene.player.x;
      const dy = en.y - this.scene.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        focus = en;
      }
    }

    const aimAngle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, focus.x, focus.y);
    this.scene.entityAnimationSystem?.playPlayerAttack(aimAngle);
    this.scene.skillEffects?.castCrimsonLaserBurst?.(
      this.scene.player.x,
      this.scene.player.y,
      targets,
      def?.color || 0xff1f1f
    );

    const perTargetDamage = Math.max(1, Math.round(totalDamage));
    for (const en of targets) this.damageEnemy(en, perTargetDamage, def?.id || 'hailstorm');
    return true;
  }

  doRectDomainSkill(cx, cy, length, width, rotation, dmg, def) {
    const halfLength = Math.max(30, length * 0.5);
    const halfWidth = Math.max(18, width * 0.5);
    const cosA = Math.cos(rotation);
    const sinA = Math.sin(rotation);
    this.scene.enemies.children.iterate((en) => {
      if (!en || en.getData('dead')) return;
      const dx = en.x - cx;
      const dy = en.y - cy;
      const localX = dx * cosA + dy * sinA;
      const localY = -dx * sinA + dy * cosA;
      if (Math.abs(localX) <= halfLength && Math.abs(localY) <= halfWidth) {
        this.damageEnemy(en, dmg, def.id);
        if (def.freeze) en.setData('freezeTimer', def.freeze);
        else if (def.slow) en.setData('slowTimer', 2.5);
      }
    });
  }

  getVisibleSwordRange() {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view) return 360;
    const halfDiagonal = Math.sqrt(view.width * view.width + view.height * view.height) * 0.5;
    return Math.max(320, Math.round(halfDiagonal + 80));
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

    if (def.id === 'hailstorm') {
      return;
    }

    if (!target) return;

    const spreadRadius = Math.round((def.aoeRadius || 140) * 1.18);
    const duration = 8;
    const impactDef = { ...def, aoeRadius: spreadRadius, duration };
    const impactX = target.x;
    const impactY = target.y;
    const angle = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, impactX, impactY);
    scene.entityAnimationSystem?.playPlayerAttack(angle);

    const onImpact = (ix, iy) => {
      const burstDamage = Math.max(1, Math.round(dmg * 0.45));
      this.doDomainSkill(ix, iy, burstDamage, impactDef);
      if (def.id === 'firedomain') {
        scene.groundEffectSystem?.addFireField(ix, iy, dmg, duration, spreadRadius);
      } else if (def.id === 'thunder') {
        scene.groundEffectSystem?.addThunderField(ix, iy, spreadRadius, Math.max(1, Math.round(dmg * 0.95)), duration);
      }
    };

    if (scene.skillEffects?.launchDomainOrb) {
      scene.skillEffects.launchDomainOrb(scene.player.x, scene.player.y, impactX, impactY, impactDef, onImpact);
    } else {
      onImpact(impactX, impactY);
    }
  }

  onProjHit(proj, en) {
    if (!proj.active || !en || en.getData('dead')) return;
    const dmg = proj.getData('damage') || 10;
    const pierce = proj.getData('pierce');
    const skillId = proj.getData('skillId');
    const swordMaxHits = proj.getData('maxHits') || 0;
    if (skillId === 'swordfly' && swordMaxHits > 0) {
      if (!this.isEnemyVisible(en)) return;
      const nowMs = this.scene.time.now;
      const lastHitAtMs = proj.getData('lastHitAtMs') || 0;
      if (nowMs - lastHitAtMs < SWORD_HIT_COOLDOWN_MS) return;
      proj.setData('lastHitAtMs', nowMs);
      this.damageEnemy(en, dmg, skillId);
      const hitCount = (proj.getData('hitCount') || 0) + 1;
      proj.setData('hitCount', hitCount);
      const maxHits = swordMaxHits;
      if (hitCount >= maxHits) {
        this.scene.freeProj(proj);
        return;
      }
      proj.setData('targetRef', null);
      if (proj.body) {
        const v = proj.body.velocity;
        const speed = Math.sqrt(v.x * v.x + v.y * v.y);
        if (speed > 1) {
          proj.x += (v.x / speed) * 8;
          proj.y += (v.y / speed) * 8;
        }
      }
      return;
    }
    this.damageEnemy(en, dmg, skillId);
    if (skillId === 'fireball' && !proj.getData('noFireField')) {
      this.scene.groundEffectSystem?.addFireField(en.x, en.y, dmg * 0.18, 10);
    }
    if (!pierce) this.scene.freeProj(proj);
  }

  onEnemyProjHit(proj) {
    if (!proj.active || this.scene.playerDead || this.scene._inSafeZone()) { this.scene.freeProj(proj); return; }
    const dmg = proj.getData('damage') || 8;
    const sd = P.buff.shieldPct > 0 ? (1 - P.buff.shieldPct) : 1;
    P.hp = Math.max(0, P.hp - Math.round(dmg * sd));
    this.scene.damageFlash(0.15);
    this.scene.freeProj(proj);
    if (P.hp <= 0 && !this.scene.playerDead) {
      this.scene.playerDead = true;
      this.scene.player.setAlpha(0.3); this.scene.player.setVelocity(0, 0); this.scene.isMoving = false;
      if (this.scene.playerAura) { this.scene.playerAura.destroy(); this.scene.playerAura = null; }
      if (this.scene.buffSystem) this.scene.buffSystem.destroyShieldVisual();
      if (this.scene.deathModal) this.scene.deathModal.classList.remove('hidden');
      const lostGold = Math.round(P.gold * 0.15);
      P.gold = Math.max(0, P.gold - lostGold);
      bus.emit('status', '💀 道殒！损失 ' + lostGold + ' 灵石', 3);
    }
    bus.emit('hud-refresh');
  }

  onEnemyContact(en) {
    if (en.getData('dead') || this.scene.playerDead || this.scene._inSafeZone()) return;
    const now = this.scene.time.now;
    const lastHit = en.getData('lastContactTime') || 0;
    if (now - lastHit < 600) return;
    en.setData('lastContactTime', now);
    this.scene.entityAnimationSystem?.playEnemyAttack(en);
    let atk = en.getData('atk') || 5;
    const shieldMult = P.buff.shieldPct > 0 ? (1 - P.buff.shieldPct) : 1;
    const dmg = Math.max(1, Math.round((atk * 0.5 - P.def * 0.3) * shieldMult));
    P.hp = Math.max(0, P.hp - dmg);
    if (this.scene.shieldReflect > 0) this.damageEnemy(en, Math.round(this.scene.shieldReflect * (1 + P.level * 0.03)), 'swordshield');
    this.scene.damageFlash(0.25);
    if (P.hp <= 0 && !this.scene.playerDead) {
      this.scene.playerDead = true;
      this.scene.player.setAlpha(0.3);
      this.scene.player.setVelocity(0, 0);
      this.scene.isMoving = false;
      if (this.scene.playerAura) { this.scene.playerAura.destroy(); this.scene.playerAura = null; }
      if (this.scene.buffSystem) this.scene.buffSystem.destroyShieldVisual();
      const lostGold = Math.round(P.gold * 0.15);
      P.gold = Math.max(0, P.gold - lostGold);
      if (this.scene.deathModal) this.scene.deathModal.classList.remove('hidden');
      bus.emit('status', '💀 道殒！损失 ' + lostGold + ' 灵石', 3);
    }
    bus.emit('hud-refresh');
  }

  damageEnemy(en, dmg, skillId = null) {
    const { scene } = this;
    if (en.getData('dead')) return;
    const critChance = 0.15 + P.level * 0.003;
    const isCrit = Math.random() < critChance;
    const finalDmg = isCrit ? Math.round(dmg * 2) : dmg;
    const hp = en.getData('hp') - finalDmg;
    en.setData('hp', hp);
    scene.skillEffects?.onProjectileHit(en.x, en.y, skillId, isCrit);
    scene.entityAnimationSystem?.playEnemyHit(en);
    en.setTint(isCrit ? 0xffff44 : 0xffffff);
    scene.time.delayedCall(60, () => { if (en.active) en.clearTint(); });
    const dColor = isCrit ? '#ffd700' : '#b94a3e';
    const dSize = isCrit ? '18px' : '13px';
    scene.textPool.show(en.x + Phaser.Math.Between(-8, 8), en.y - 10, (isCrit ? '💥' : '') + '-' + finalDmg, {
      fontSize: dSize, color: dColor, stroke: '#000',
      strokeThickness: isCrit ? 3 : 2, depth: 20, floatDist: 35, duration: 700
    });
    if (hp <= 0) {
      en.setData('dead', true);
      const lbl = en.getData('label'); if (lbl) lbl.destroy();
      const ex = en.x, ey = en.y;
      const xp = en.getData('xp') || 1;
      const gold = en.getData('gold') || 1;
      const isBoss = en.getData('isBoss');
      const isElite = en.getData('isElite');
      en.setVelocity(0, 0); en.body.enable = false;
      scene.tweens.add({ targets: en, alpha: 0, duration: 250, onComplete: () => en.destroy() });
      scene.killStreak = (scene.killStreak || 0);
      const now = scene.time.now;
      if (now - (scene.lastKill || 0) < 3000) scene.killStreak++;
      else scene.killStreak = 1;
      scene.lastKill = now;
      const streakBonus = scene.killStreak >= 5 ? Math.round(xp * (scene.killStreak * 0.1)) : 0;
      P.xp += xp + streakBonus; P.gold += gold; P.kills++;
      P.totalGoldEarned = (P.totalGoldEarned || 0) + gold;
      if (scene.killStreak >= 3) {
        scene.textPool.show(en.x, en.y - 30, '连杀x' + scene.killStreak + (streakBonus ? ' +' + streakBonus + 'exp' : ''), {
          fontSize: '16px', color: '#ff8844', stroke: '#000',
          strokeThickness: 2, depth: 20, floatDist: 50, duration: 1000
        });
      }
      while (P.xp >= P.xpToNext) {
        P.xp -= P.xpToNext; P.level += 1;
        P.attrPoints = (P.attrPoints || 0) + 3;
        P.skillPoints = (P.skillPoints || 0) + 1;
        P.xpToNext = Math.round(10 * Math.pow(1.15, P.level - 1));
        recalcStats();
        scene.textPool.show(scene.player.x, scene.player.y - 50, '🎉 LEVEL UP! Lv.' + P.level, {
          fontSize: '22px', color: '#ffd700', stroke: '#000',
          strokeThickness: 3, depth: 25, floatDist: 80, duration: 1500
        });
        bus.emit('status', '🎉 升级！当前Lv.' + P.level, 2);
      }
      const zoneLv = en.getData('zoneLv') || 1;
      recalcStats();
      const dropRate = isBoss ? 1.0 : (isElite ? 0.6 : 0.35);
      if (Math.random() < dropRate) {
        const eq = genEquipment(zoneLv, isBoss ? 'legendary' : null);
        if (eq.rarity === 'legendary' || eq.rarity === 'mythic') P.legendaryFound = true;
        const result = acquireEquipment(P, eq);
        if (result.stored) {
          if (result.changed) recalcStats();
          bus.emit('loot', '🎁 获得 [' + RARITY_LABEL[eq.rarity] + '] ' + eq.name + (result.equipped ? '（已自动装备）' : ''));
          const spark = scene.add.circle(en.x, en.y, 20, RARITY_COLORS[eq.rarity] || 0xffffff, 0.5).setDepth(18);
          scene.tweens.add({ targets: spark, scale: 2.5, alpha: 0, duration: 500, onComplete: () => spark.destroy() });
        }
      }
      if (Math.random() < 0.1 && P.inventory.length < 30) {
        const dropGold = Math.round((10 + zoneLv * 5) * (isBoss ? 5 : 1));
        P.gold = Math.min(99999, P.gold + dropGold);
        P.totalGoldEarned = (P.totalGoldEarned || 0) + dropGold;
      }
      P.gold = Math.min(P.gold, 99999);
      bus.emit('hud-refresh');
      bus.emit('hotbar-refresh');
      bus.emit('save');
    }
  }

  useAutoAttack(skillNow, closestQ, activeEnemies, qDef) {
    if (qDef.id !== 'swordfly') {
      if (skillNow >= (this.scene.skillCooldowns[qDef.id] || 0) && closestQ) {
        const qCD = qDef.cooldown || 0.7;
        this.scene.skillCooldowns[qDef.id] = skillNow + qCD;
        const lv = P.skillLevels?.[qDef.id] || 1;
        const mult = 1 + (P.buff.atkBoost || 0);
        const dmg = Math.round(this.getScaledPlayerDamageBase() * (qDef.baseDmg || 0.7) * (0.72 + lv * 0.06) * mult);
        this.shootSwordVolley(closestQ, dmg, qDef, activeEnemies);
        this.scene.showSkillName(qDef.name, qDef.color);
      }
      return;
    }

    const qCD = qDef.cooldown || 0.7;
    const range = this.getVisibleSwordRange();
    const visibleTargets = this.getVisibleEnemyCandidates(activeEnemies);
    if (visibleTargets.length === 0) {
      this.recallSwordProjectiles();
      this.scene.skillCooldowns[qDef.id] = skillNow;
      return;
    }

    if (this.swordRing?.sprites?.length) this.clearSwordRingSprites();
    if (!this.swordStorm.nextFireAt) this.swordStorm.nextFireAt = skillNow;
    if (skillNow < this.swordStorm.nextFireAt) return;

    const lv = P.skillLevels?.[qDef.id] || 1;
    const mult = 1 + (P.buff.atkBoost || 0);
    const totalDamage = Math.round(this.getScaledPlayerDamageBase() * (qDef.baseDmg || 0.7) * (0.72 + lv * 0.06) * mult);
    const perSwordDamage = Math.max(1, Math.round(totalDamage / SWORD_VOLLEY_COUNT));
    const lifetime = Math.max(SWORD_MIN_LIFETIME, Math.round(range * SWORD_RANGE_LIFETIME_FACTOR));
    const target = this.pickSwordTarget(closestQ, visibleTargets, range);
    if (target) {
      const color = SWORD_COLOR_PALETTE[this.swordStorm.colorIndex % SWORD_COLOR_PALETTE.length];
      const fired = this.shootSwordStorm(target, perSwordDamage, range, lifetime, color);
      if (fired) {
        this.swordStorm.colorIndex++;
        this.swordStorm.nextFireAt = skillNow + SWORD_STORM_INTERVAL;
        this.scene.showSkillName(qDef.name, qDef.color);
      } else {
        this.swordStorm.nextFireAt = skillNow + SWORD_STORM_INTERVAL;
      }
    }

    this.scene.skillCooldowns[qDef.id] = this.swordStorm.nextFireAt || (skillNow + qCD);
  }

  useManualSkills(skillNow, activeEnemies) {
    const { scene } = this;
    for (let si = 1; si < 5; si++) {
      const def = SKILL_DEFS.find(s => s.id === P.hotbar[si]?.id);
      if (!def || def.type === 'basic') continue;
      if (skillNow < (scene.skillCooldowns[def.id] || 0)) continue;
      const cd = def.cooldown || 2;

      if (def.type === 'heal') {
        scene.skillCooldowns[def.id] = skillNow + cd;
        const healPct = Math.max(0, def.healPct || 0.1);
        const healValue = Math.max(1, Math.round(P.maxHp * healPct));
        const beforeHp = P.hp;
        P.hp = Math.min(P.maxHp, P.hp + healValue);
        const actualHeal = Math.max(0, P.hp - beforeHp);
        scene.skillEffects?.onBuffCast(def.color || 0x66d98f);
        scene.showSkillName(def.name, def.color || 0x66d98f);
        if (actualHeal > 0) {
          scene.textPool.show(scene.player.x, scene.player.y - 36, '+' + actualHeal, {
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
      } else if (def.type === 'shield') {
        scene.skillCooldowns[def.id] = skillNow + cd;
        P.buff.shieldPct = def.shieldPct || 0;
        P.buffTimer = Math.max(P.buffTimer, def.duration || 5);
        scene.shieldReflect = def.reflectDmg || 0;
        if (scene.buffSystem) scene.buffSystem.createShieldVisual(def.color || 0xffd700);
        scene.skillEffects?.onShieldCast(def.color || 0xffd700);
        scene.showSkillName(def.name, def.color || 0xffd700);
        bus.emit('status', def.name + ' 护体!', 1.5);
      } else if (def.type === 'buff') {
        scene.skillCooldowns[def.id] = skillNow + cd;
        if (def.speedBoost) P.buff.speedBoost = def.speedBoost;
        if (def.atkBoost) P.buff.atkBoost = def.atkBoost;
        if (def.rangeBoost) P.buff.rangeBoost = def.rangeBoost;
        if (def.shieldPct) P.buff.shieldPct = def.shieldPct;
        P.buffTimer = Math.max(P.buffTimer, def.duration || 5);
        scene.skillEffects?.onBuffCast(def.color || 0x66ffcc);
        scene.showSkillName(def.name, def.color || 0x66ffcc);
        bus.emit('status', def.name + ' 激活!', 1.5);
      } else if (def.type === 'ground') {
        if (def.id === 'firedomain') {
          const visibleTargets = this.getVisibleEnemyCandidates(activeEnemies);
          if (!visibleTargets.length) continue;
          scene.skillCooldowns[def.id] = skillNow + cd;
          const lv = P.skillLevels?.[def.id] || 1;
          const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (lv - 1) * 0.1)));
          if (this.castSixWayMiniFireballs(dmg, visibleTargets)) {
            scene.showSkillName(def.name, def.color || 0xc95f36);
          }
        } else {
          const target = this.findNearestSkillTarget(activeEnemies, def.range || 220);
          if (target) {
            scene.skillCooldowns[def.id] = skillNow + cd;
            const lv = P.skillLevels?.[def.id] || 1;
            const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (lv - 1) * 0.08)));
            scene.groundEffectSystem?.addFireField(target.x, target.y, dmg, def.duration || 10, def.aoeRadius || 95);
            scene.skillEffects?.onDomainCast(target.x, target.y, { ...def, id: 'firedomain' });
            scene.showSkillName(def.name, def.color || 0xff8844);
          }
        }
      } else if (def.type === 'domain') {
        if (def.id === 'hailstorm') {
          if (!activeEnemies?.length) continue;
          scene.skillCooldowns[def.id] = skillNow + cd;
          const dlv = P.skillLevels?.[def.id] || 1;
          const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (dlv - 1) * 0.16)));
          this.castCrimsonLaserBarrage(activeEnemies, dmg, def);
          scene.showSkillName(def.name, def.color || 0xff2a2a);
          continue;
        }
        if (def.id === 'thunder') {
          const dTarget = this.findNearestSkillTarget(activeEnemies, def.range || 260);
          if (dTarget) {
            scene.skillCooldowns[def.id] = skillNow + cd;
            const dlv = P.skillLevels?.[def.id] || 1;
            const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (dlv - 1) * 0.1)));
            this.castElementDomain(dTarget, def, dmg);
            scene.showSkillName(def.name, def.color || 0xffdd00);
          }
          continue;
        }
        if (def.selfCenter) {
          const aoeR2 = (def.aoeRadius || 260) * (def.aoeRadius || 260);
          let hasTarget = false;
          for (const en of activeEnemies) {
            const dx = en.x - scene.player.x, dy = en.y - scene.player.y;
            if (dx * dx + dy * dy <= aoeR2) { hasTarget = true; break; }
          }
          if (hasTarget) {
            scene.skillCooldowns[def.id] = skillNow + cd;
            const dlv = P.skillLevels?.[def.id] || 1;
            const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (dlv - 1) * 0.08)));
            scene.groundEffectSystem?.addThunderField(scene.player.x, scene.player.y, def.aoeRadius || 300, dmg, def.duration || 5);
            scene.skillEffects?.onDomainCast(scene.player.x, scene.player.y, def);
            scene.showSkillName(def.name, def.color || 0xffdd00);
          }
          continue;
        }
        const dRange = def.range || 200, dR2 = dRange * dRange;
        let dTarget = null, dBest = Infinity;
        for (const en of activeEnemies) {
          const dx = en.x - scene.player.x, dy = en.y - scene.player.y, d2 = dx * dx + dy * dy;
          if (d2 < dR2 && d2 < dBest) { dBest = d2; dTarget = en; }
        }
        if (dTarget) {
          let cnt = 0;
          const aoeR2 = (def.aoeRadius || 130) * (def.aoeRadius || 130);
          for (const en of activeEnemies) {
            const dx = en.x - dTarget.x, dy = en.y - dTarget.y;
            if (dx * dx + dy * dy <= aoeR2) cnt++;
          }
          if (cnt >= 2 || def.freeze) {
            scene.skillCooldowns[def.id] = skillNow + cd;
            const dlv = P.skillLevels?.[def.id] || 1;
            const dmg = Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (dlv - 1) * 0.18));
            this.doDomainSkill(dTarget.x, dTarget.y, dmg, def);
            scene.showSkillName(def.name, def.color || 0xffdd00);
          }
        }
      } else {
        let target = null, bestD2 = Infinity;
        const sRange = (def.range || 200) * (1 + (P.buff.rangeBoost || 0));
        const sR2 = sRange * sRange;
        for (const en of activeEnemies) {
          const dx = en.x - scene.player.x, dy = en.y - scene.player.y, d2 = dx * dx + dy * dy;
          if (d2 < sR2 && d2 < bestD2) { bestD2 = d2; target = en; }
        }
        if (target) {
          scene.skillCooldowns[def.id] = skillNow + cd;
          const angle = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, target.x, target.y);
          const lv = P.skillLevels?.[def.id] || 1;
          const mult = 1 + (P.buff.atkBoost || 0);
          const dmg = Math.round(this.getScaledPlayerDamageBase() * (def.baseDmg || 1) * (1 + (lv - 1) * 0.18) * mult);
          if (def.type === 'multi') {
            this.doMultiProjectile(angle, dmg, def.count || 3, def.range, def.texture);
          } else {
            this.shootProjectile(def.id, angle, dmg, def.range);
          }
          scene.showSkillName(def.name, def.color || 0xffdd00);
        }
      }
    }
  }
}
