/* 系统装配：为 MainScene 安装全部系统类 */

import { AISystem } from '@/systems/ai-system.js';
import { BuffSystem } from '@/systems/buff-system.js';
import { CombatLoopSystem } from '@/systems/combat-loop-system.js';
import { CombatSystem } from '@/systems/combat-system.js';
import { CultivationProgressSystem } from '@/systems/cultivation-progress-system.js';
import { DefenseSystem } from '@/systems/defense-system.js';
import { EntityAnimationSystem } from '@/systems/entity-animation-system.js';
import { GroundEffectSystem } from '@/systems/ground-effect-system.js';
import { MovementSystem } from '@/systems/movement-system.js';
import { PlayerStatusSystem } from '@/systems/player-status-system.js';
import { SceneEffectsSystem } from '@/systems/scene-effects-system.js';
import { SpawnSystem } from '@/systems/spawn-system.js';
import { TextPool } from '@/systems/text-pool.js';
import { UiTickSystem } from '@/systems/ui-tick-system.js';
import { WaveSystem } from '@/systems/wave-system.js';
import { SkillEffects } from '@/effects/skill-effects.js';

export function installSceneSystems(scene) {
  scene.textPool = new TextPool(scene, 24);
  scene.skillEffects = new SkillEffects(scene);
  scene.entityAnimationSystem = new EntityAnimationSystem(scene);
  scene.groundEffectSystem = new GroundEffectSystem(scene);
  scene.sceneEffectsSystem = new SceneEffectsSystem(scene);
  scene.playerStatusSystem = new PlayerStatusSystem(scene);
  scene.movementSystem = new MovementSystem(scene);
  scene.cultivationProgressSystem = new CultivationProgressSystem(scene);
  scene.buffSystem = new BuffSystem(scene);
  scene.spawnSystem = new SpawnSystem(scene);
  scene.aiSystem = new AISystem(scene);
  scene.combatSystem = new CombatSystem(scene);
  scene.combatLoopSystem = new CombatLoopSystem(scene);
  scene.defenseSystem = new DefenseSystem(scene);
  scene.uiTickSystem = new UiTickSystem(scene);
  scene.waveSystem = new WaveSystem(scene);
}
