/* 系统装配：为 MainScene 安装全部系统类 */

import { AISystem } from '@/systems/ai-system.js';
import { CardSystem } from '@/systems/card-system.js';
import { CombatLoopSystem } from '@/systems/combat-loop-system.js';
import { CombatSystem } from '@/systems/combat-system.js';
import { EntityAnimationSystem } from '@/systems/entity-animation-system.js';
import { GroundEffectSystem } from '@/systems/ground-effect-system.js';
import { SpawnSystem } from '@/systems/spawn-system.js';
import { StageSystem } from '@/systems/stage-system.js';
import { TextPool } from '@/systems/text-pool.js';
import { UiTickSystem } from '@/systems/ui-tick-system.js';
import { SkillEffects } from '@/effects/skill-effects.js';

export function installSceneSystems(scene) {
  scene.textPool = new TextPool(scene, 24);
  scene.skillEffects = new SkillEffects(scene);
  scene.entityAnimationSystem = new EntityAnimationSystem(scene);
  scene.groundEffectSystem = new GroundEffectSystem(scene);
  scene.spawnSystem = new SpawnSystem(scene);
  scene.aiSystem = new AISystem(scene);
  scene.combatSystem = new CombatSystem(scene);
  scene.combatLoopSystem = new CombatLoopSystem(scene);
  scene.cardSystem = new CardSystem(scene);
  scene.stageSystem = new StageSystem(scene);
  scene.uiTickSystem = new UiTickSystem(scene);
}
