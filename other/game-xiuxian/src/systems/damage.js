/* ============================================================================
 * 碰撞、伤害、经验结算与战败流程（独立函数）
 * CombatSystem 通过薄封装调用本模块。
 * ========================================================================== */

import { P } from '@/core/state.js';
import { bus } from '@/core/events.js';

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

/** 敌人弹丸命中玩家：扣血、战败判定 */
export function onEnemyProjHit(scene, proj) {
  if (!proj.active || scene.runFinished) { scene.freeProj(proj); return; }
  const dmg = proj.getData('damage') || 8;
  scene.damageWall(dmg);
  scene.freeProj(proj);
}

/** 敌人接触玩家：近战伤害、护盾反射、战败判定 */
export function onEnemyContact(scene, en) {
  if (en.getData('dead') || scene.playerDead) return;
  const now = scene.time.now;
  const lastHit = en.getData('lastContactTime') || 0;
  if (now - lastHit < 600) return;
  en.setData('lastContactTime', now);
  scene.entityAnimationSystem?.playEnemyAttack(en);
  let atk = en.getData('atk') || 5;
  const shieldMult = P.buff.shieldPct > 0 ? (1 - P.buff.shieldPct) : 1;
  const dmg = Math.max(1, Math.round((atk * 0.5 - P.def * 0.3) * shieldMult));
  P.hp = Math.max(0, P.hp - dmg);
  scene.damageFlash(0.25);
  if (P.hp <= 0 && !scene.playerDead) {
    scene.playerDead = true;
    scene.stageSystem?.failStage();
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

/** 对敌人造成伤害；击杀后结算经验、局内升级（触发抽卡）、连杀 */
export function damageEnemy(scene, en, dmg, skillId = null) {
  if (en.getData('dead')) return;
  const critChance = 0.15 + (P.mods?.critChance || 0);
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
    en.setVelocity(0, 0); en.body.enable = false;
    scene.tweens.add({ targets: en, alpha: 0, duration: 250, onComplete: () => en.destroy() });
    scene.killStreak = (scene.killStreak || 0);
    const now = scene.time.now;
    if (now - (scene.lastKill || 0) < 3000) scene.killStreak++;
    else scene.killStreak = 1;
    scene.lastKill = now;
    P.kills++; P.totalKills++;
    if (scene.killStreak >= 3) {
      scene.textPool.show(en.x, en.y - 30, '连杀x' + scene.killStreak, {
        fontSize: '16px', color: '#ff8844', stroke: '#000',
        strokeThickness: 2, depth: 20, floatDist: 50, duration: 1000
      });
    }
    bus.emit('hud-refresh');
    bus.emit('save');
  }
}
