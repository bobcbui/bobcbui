/* ============================================================================
 * 碰撞、伤害、掉落与死亡流程（独立函数）
 * CombatSystem 通过薄封装（onProjHit/onEnemyProjHit/onEnemyContact/damageEnemy）
 * 调用本模块，地面领域等系统也经由 scene.combatSystem.damageEnemy 结算。
 * ========================================================================== */

import { P, recalcStats } from '@/core/state.js';
import { bus } from '@/core/events.js';
import { recordEnemyKill } from '@/core/progression.js';
import { genEquipment, acquireEquipment } from '@/core/equipment.js';
import { RARITY_LABEL, RARITY_COLORS } from '@/data/index.js';

const SWORD_HIT_COOLDOWN_MS = 120;

function combatSystemIsEnemyVisible(combatSystem, en, pad = 0) {
  if (!en || !en.active || en.getData('dead')) return false;
  const view = combatSystem?.scene?.cameras?.main?.worldView;
  if (!view) return true;
  return en.x >= view.x - pad && en.x <= view.right + pad && en.y >= view.y - pad && en.y <= view.bottom + pad;
}

/** 弹丸命中敌人：伤害 + 穿透/连击/火球特殊逻辑 */
export function onProjHit(scene, proj, en) {
  if (!proj.active || !en || en.getData('dead')) return;
  const dmg = proj.getData('damage') || 10;
  const pierce = proj.getData('pierce');
  const skillId = proj.getData('skillId');
  if (skillId === 'fireball' && proj.getData('growingFireball')) {
    let hitTargets = proj.getData('hitTargets');
    if (!(hitTargets instanceof Set)) {
      hitTargets = new Set();
      proj.setData('hitTargets', hitTargets);
    }
    if (hitTargets.has(en)) return;
    hitTargets.add(en);
    damageEnemy(scene, en, dmg, skillId);
    proj.setData('fireballTrackArmed', true);
    proj.setData('targetRef', null);
    if (proj.body) {
      const v = proj.body.velocity;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y);
      if (speed > 1) {
        proj.x += (v.x / speed) * 6;
        proj.y += (v.y / speed) * 6;
      }
    }
    return;
  }
  const swordMaxHits = proj.getData('maxHits') || 0;
  if (skillId === 'swordfly' && swordMaxHits > 0) {
    if (!combatSystemIsEnemyVisible(scene.combatSystem, en)) return;
    const nowMs = scene.time.now;
    const lastHitAtMs = proj.getData('lastHitAtMs') || 0;
    if (nowMs - lastHitAtMs < SWORD_HIT_COOLDOWN_MS) return;
    proj.setData('lastHitAtMs', nowMs);
    damageEnemy(scene, en, dmg, skillId);
    const hitCount = (proj.getData('hitCount') || 0) + 1;
    proj.setData('hitCount', hitCount);
    const maxHits = swordMaxHits;
    if (hitCount >= maxHits) {
      scene.freeProj(proj);
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
  damageEnemy(scene, en, dmg, skillId);
  if (skillId === 'fireball' && !proj.getData('noFireField')) {
    scene.groundEffectSystem?.addFireField(en.x, en.y, dmg * 0.18, 10);
  }
  if (!pierce) scene.freeProj(proj);
}

/** 敌人弹丸命中玩家：扣血、死亡流程 */
export function onEnemyProjHit(scene, proj) {
  if (!proj.active || scene.playerDead || scene._inSafeZone()) { scene.freeProj(proj); return; }
  const dmg = proj.getData('damage') || 8;
  const sd = P.buff.shieldPct > 0 ? (1 - P.buff.shieldPct) : 1;
  P.hp = Math.max(0, P.hp - Math.round(dmg * sd));
  scene.damageFlash(0.15);
  scene.freeProj(proj);
  if (P.hp <= 0 && !scene.playerDead) {
    scene.playerDead = true;
    scene.player.setAlpha(0.3); scene.player.setVelocity(0, 0); scene.isMoving = false;
    if (scene.playerAura) { scene.playerAura.destroy(); scene.playerAura = null; }
    if (scene.buffSystem) scene.buffSystem.destroyShieldVisual();
    if (scene.deathModal) scene.deathModal.classList.remove('hidden');
    const lostGold = Math.round(P.gold * 0.15);
    P.gold = Math.max(0, P.gold - lostGold);
    bus.emit('status', '💀 道殒！损失 ' + lostGold + ' 灵石', 3);
  }
  bus.emit('hud-refresh');
}

/** 敌人接触玩家：近战伤害、护盾反射、死亡流程 */
export function onEnemyContact(scene, en) {
  if (en.getData('dead') || scene.playerDead || scene._inSafeZone()) return;
  const now = scene.time.now;
  const lastHit = en.getData('lastContactTime') || 0;
  if (now - lastHit < 600) return;
  en.setData('lastContactTime', now);
  scene.entityAnimationSystem?.playEnemyAttack(en);
  let atk = en.getData('atk') || 5;
  const shieldMult = P.buff.shieldPct > 0 ? (1 - P.buff.shieldPct) : 1;
  const dmg = Math.max(1, Math.round((atk * 0.5 - P.def * 0.3) * shieldMult));
  P.hp = Math.max(0, P.hp - dmg);
  if (scene.shieldReflect > 0) damageEnemy(scene, en, Math.round(scene.shieldReflect * (1 + P.level * 0.03)), 'swordshield');
  scene.damageFlash(0.25);
  if (P.hp <= 0 && !scene.playerDead) {
    scene.playerDead = true;
    scene.player.setAlpha(0.3);
    scene.player.setVelocity(0, 0);
    scene.isMoving = false;
    if (scene.playerAura) { scene.playerAura.destroy(); scene.playerAura = null; }
    if (scene.buffSystem) scene.buffSystem.destroyShieldVisual();
    const lostGold = Math.round(P.gold * 0.15);
    P.gold = Math.max(0, P.gold - lostGold);
    if (scene.deathModal) scene.deathModal.classList.remove('hidden');
    bus.emit('status', '💀 道殒！损失 ' + lostGold + ' 灵石', 3);
  }
  bus.emit('hud-refresh');
}

/** 飞剑吸血（仅飞剑系技能） */
function applySwordLifesteal(scene, skillId, dealtDamage) {
  if (skillId !== 'swordfly') return;
  if (scene.playerDead) return;
  const lifestealPct = Math.max(0, (P.buff.lifestealPct || 0) + (P.mods?.lifestealPct || 0));
  if (lifestealPct <= 0) return;
  if (P.hp >= P.maxHp) return;
  const heal = Math.max(1, Math.round(dealtDamage * lifestealPct));
  const beforeHp = P.hp;
  P.hp = Math.min(P.maxHp, P.hp + heal);
  const actualHeal = Math.max(0, P.hp - beforeHp);
  if (actualHeal <= 0) return;
  scene.textPool.show(scene.player.x + Phaser.Math.Between(-6, 6), scene.player.y - 34, '+' + actualHeal, {
    fontSize: '14px',
    color: '#ff6b6b',
    stroke: '#000',
    strokeThickness: 2,
    depth: 21,
    floatDist: 30,
    duration: 620
  });
}

/** 对敌人造成伤害；击杀后结算经验、金币、掉落、任务进度、升级与死亡动画 */
export function damageEnemy(scene, en, dmg, skillId = null) {
  if (en.getData('dead')) return;
  const critChance = 0.15 + P.level * 0.003 + (P.mods?.critChance || 0);
  const isCrit = Math.random() < critChance;
  const finalDmg = isCrit ? Math.round(dmg * 2) : dmg;
  const hp = en.getData('hp') - finalDmg;
  en.setData('hp', hp);
  applySwordLifesteal(scene, skillId, finalDmg);
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
    const xp = Math.round((en.getData('xp') || 1) * (1 + (P.mods?.xpBonus || 0)));
    const gold = Math.round((en.getData('gold') || 1) * (1 + (P.mods?.goldBonus || 0)));
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
    recordEnemyKill(en);
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
    const dropRate = Math.min(0.95, (isBoss ? 1.0 : (isElite ? 0.6 : 0.35)) + (P.mods?.dropRate || 0));
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
      const dropGold = Math.round((10 + zoneLv * 5) * (isBoss ? 5 : 1) * (1 + (P.mods?.goldBonus || 0)));
      P.gold = Math.min(99999, P.gold + dropGold);
      P.totalGoldEarned = (P.totalGoldEarned || 0) + dropGold;
    }
    P.gold = Math.min(P.gold, 99999);
    bus.emit('hud-refresh');
    bus.emit('hotbar-refresh');
    bus.emit('save');
  }
}
