/* 战斗主循环：弹丸更新 -> 领域/Buff -> AI 遍历 -> 普攻飞剑 + 抽卡技能轮转 */

import { SWORDFLY_DEF } from '@/systems/combat-system.js';

export class CombatLoopSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt, time) {
    const { scene } = this;
    scene.combatSystem.updateSwordProjectiles(dt);
    scene.skillEffects?.updateProjectileTrails();
    scene.groundEffectSystem?.update(dt);
    scene.buffSystem.update(dt);

    const skillNow = time / 1000;
    const qDef = SWORDFLY_DEF;
    const qRange = this.getAutoAttackRange(qDef);
    const qR2 = qRange * qRange;
    const { closestQ, activeEnemies } = scene.aiSystem.update(dt, skillNow, qRange, qR2);

    if (scene.playerDead || scene.runPaused) return;
    scene.combatSystem.useAutoAttack(skillNow, closestQ, activeEnemies, qDef);
    scene.combatSystem.useOwnedSkills(skillNow, activeEnemies);
  }

  getAutoAttackRange(qDef) {
    const { scene } = this;
    const view = scene.cameras.main?.worldView;
    const visibleRange = view
      ? Math.sqrt(view.width * view.width + view.height * view.height) * 0.5 + 80
      : (qDef.range || 280);
    return Math.max(qDef.range || 280, visibleRange);
  }
}
