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

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
  }

  getScaledPlayerDamageBase() {
    return (P.atk + P.level * 0.5) * COMBAT_TUNING.playerDamageScale;
  }

  splitDamage(totalDamage, count) {
    const base = Math.floor(totalDamage / count);
    const remainder = Math.max(0, totalDamage - base * count);
    return Array.from({ length: count }, (_, idx) => base + (idx < remainder ? 1 : 0));
  }

  spawnProjectile(skillId, angle, dmg, options = {}) {
    const tex = { 'fireball': 'fireball', 'swordfly': 'swordQi', 'thunder': 'bolt', 'waterdomain': 'water', 'tornado': 'wind' }[skillId] || 'arrow';
    const proj = this.scene.getPooledProj(this.scene.player.x, this.scene.player.y, tex);
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
    proj.setData('lastFireFieldX', this.scene.player.x);
    proj.setData('lastFireFieldY', this.scene.player.y);
    if (proj.body) {
      if (skillId === 'swordfly') proj.body.setSize(SWORD_HITBOX_W, SWORD_HITBOX_H, true);
      else proj.body.setSize(proj.width, proj.height, true);
    }
    this.scene.skillEffects?.onProjectileFired(proj, skillId, angle);

    const lifetime = options.lifetime || 1200;
    this.scene.scheduleProjFree(proj, lifetime);
    return proj;
  }

  shootProjectile(skillId, angle, dmg, range) {
    const proj = this.spawnProjectile(skillId, angle, dmg, {
      pierce: false,
      lifetime: skillId === 'swordfly' ? SWORD_PROJECTILE_LIFETIME : 1200
    });
    if (!proj) return;
    if (skillId === 'fireball') this.scene.groundEffectSystem?.addFireField(this.scene.player.x, this.scene.player.y, dmg * 0.18, 10);
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
      .filter((en) => en && en.active && !en.getData('dead'))
      .sort((a, b) => {
        const adx = a.x - this.scene.player.x;
        const ady = a.y - this.scene.player.y;
        const bdx = b.x - this.scene.player.x;
        const bdy = b.y - this.scene.player.y;
        return adx * adx + ady * ady - (bdx * bdx + bdy * bdy);
      });

    if (primaryTarget) uniqueTargets.push(primaryTarget);
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

  shootSwordVolley(primaryTarget, totalDamage, qDef, activeEnemies) {
    const targets = this.getSwordVolleyTargets(primaryTarget, activeEnemies, SWORD_VOLLEY_COUNT);
    if (targets.length === 0) return;

    const damages = this.splitDamage(totalDamage, SWORD_VOLLEY_COUNT);
    const centerAngle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, primaryTarget.x, primaryTarget.y);
    const effectiveRange = (qDef.range || 300) * (1 + (P.buff.rangeBoost || 0));
    const lifetime = Math.max(SWORD_MIN_LIFETIME, Math.round(effectiveRange * SWORD_RANGE_LIFETIME_FACTOR));

    targets.forEach((target, idx) => {
      const spreadOffset = SWORD_VOLLEY_COUNT === 1 ? 0 : (idx / (SWORD_VOLLEY_COUNT - 1) - 0.5) * SWORD_VOLLEY_SPREAD;
      const launchAngle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, target.x, target.y) + spreadOffset;
      const proj = this.spawnProjectile('swordfly', launchAngle, damages[idx] || 1, {
        pierce: false,
        homing: true,
        turnRate: SWORD_TURN_RATE,
        speed: SWORD_PROJECTILE_SPEED,
        seekRadius: effectiveRange * 2.4,
        targetRef: target,
        lifetime
      });
      if (proj) proj.setScale(0.92);
    });

    this.scene.entityAnimationSystem?.playPlayerAttack(centerAngle);
  }

  findSwordTarget(proj, seekRadius) {
    let nearest = null;
    let bestD2 = seekRadius * seekRadius;
    this.scene.enemies.children.iterate((en) => {
      if (!en || !en.active || en.getData('dead')) return;
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
    this.scene.projectiles.children.iterate((proj) => {
      if (!proj || !proj.active || proj.getData('skillId') !== 'swordfly' || !proj.getData('homing') || !proj.body) return;

      const seekRadius = proj.getData('seekRadius') || 0;
      let target = proj.getData('targetRef');
      const targetValid = target && target.active && !target.getData('dead') && (() => {
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

  onProjHit(proj, en) {
    if (!proj.active || !en || en.getData('dead')) return;
    const dmg = proj.getData('damage') || 10;
    const pierce = proj.getData('pierce');
    const skillId = proj.getData('skillId');
    this.damageEnemy(en, dmg, skillId);
    if (skillId === 'fireball') this.scene.groundEffectSystem?.addFireField(en.x, en.y, dmg * 0.18, 10);
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
    if (skillNow >= (this.scene.skillCooldowns[qDef.id] || 0)) {
      const qCD = qDef.cooldown || 0.7;
      this.scene.skillCooldowns[qDef.id] = skillNow + qCD;
      if (closestQ) {
        const lv = P.skillLevels?.[qDef.id] || 1;
        const mult = 1 + (P.buff.atkBoost || 0);
        const dmg = Math.round(this.getScaledPlayerDamageBase() * (qDef.baseDmg || 0.7) * (0.72 + lv * 0.06) * mult);
        this.shootSwordVolley(closestQ, dmg, qDef, activeEnemies);
        this.scene.showSkillName(qDef.name, qDef.color);
      }
    }
  }

  useManualSkills(skillNow, activeEnemies) {
    const { scene } = this;
    for (let si = 1; si < 5; si++) {
      const def = SKILL_DEFS.find(s => s.id === P.hotbar[si]?.id);
      if (!def || def.type === 'basic') continue;
      if (skillNow < (scene.skillCooldowns[def.id] || 0)) continue;
      const cd = def.cooldown || 2;

      if (def.type === 'shield') {
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
        let target = null, bestD2 = Infinity;
        const gRange = def.range || 220, gR2 = gRange * gRange;
        for (const en of activeEnemies) {
          const dx = en.x - scene.player.x, dy = en.y - scene.player.y, d2 = dx * dx + dy * dy;
          if (d2 < gR2 && d2 < bestD2) { bestD2 = d2; target = en; }
        }
        if (target) {
          scene.skillCooldowns[def.id] = skillNow + cd;
          const lv = P.skillLevels?.[def.id] || 1;
          const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (lv - 1) * 0.08)));
          scene.groundEffectSystem?.addFireField(target.x, target.y, dmg, def.duration || 10, def.aoeRadius || 95);
          scene.skillEffects?.onDomainCast(target.x, target.y, { ...def, id: 'firedomain' });
          scene.showSkillName(def.name, def.color || 0xff8844);
        }
      } else if (def.type === 'domain') {
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
