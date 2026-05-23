import { P } from '../core/state.js';
import { SKILL_DEFS } from '../data/index.js';

export class CombatLoopSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt, time, inSafe) {
    const { scene } = this;
    scene.combatSystem.updateSwordProjectiles(dt);
    scene.skillEffects?.updateProjectileTrails();
    scene.updateFireballFields();
    scene.groundEffectSystem?.update(dt);
    scene.buffSystem.update(dt);

    const skillNow = time / 1000;
    const qDef = SKILL_DEFS.find(s => s.id === P.hotbar[0]?.id) ||
      SKILL_DEFS.find(s => s.id === 'swordfly');
    const qRange = this.getAutoAttackRange(qDef);
    const qR2 = qRange * qRange;
    const { closestQ, activeEnemies } = scene.aiSystem.update(dt, skillNow, qRange, qR2);
    scene.sceneEffectsSystem?.update(dt, scene.getCurrentZone());

    if (scene.playerDead || inSafe) return;
    scene.combatSystem.useAutoAttack(skillNow, closestQ, activeEnemies, qDef);
    scene.combatSystem.useManualSkills(skillNow, activeEnemies);
  }

  getAutoAttackRange(qDef) {
    const { scene } = this;
    const view = scene.cameras.main?.worldView;
    const visibleRange = view
      ? Math.sqrt(view.width * view.width + view.height * view.height) * 0.5 + 80
      : (qDef.range || 280);
    if (qDef.id === 'swordfly') {
      return Math.max(qDef.range || 280, visibleRange);
    }
    return (qDef.range || 280) * (1 + (P.buff.rangeBoost || 0));
  }
}
