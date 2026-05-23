import { AISystem } from './ai-system.js';
import { BuffSystem } from './buff-system.js';
import { CombatLoopSystem } from './combat-loop-system.js';
import { CombatSystem } from './combat-system.js';
import { CultivationProgressSystem } from './cultivation-progress-system.js';
import { DefenseSystem } from './defense-system.js';
import { EntityAnimationSystem } from './entity-animation-system.js';
import { GroundEffectSystem } from './ground-effect-system.js';
import { MovementSystem } from './movement-system.js';
import { PlayerStatusSystem } from './player-status-system.js';
import { SceneEffectsSystem } from './scene-effects-system.js';
import { SpawnSystem } from './spawn-system.js';
import { TextPool } from './text-pool.js';
import { UiTickSystem } from './ui-tick-system.js';
import { WaveSystem } from './wave-system.js';
import { SkillEffects } from '../effects/skill-effects.js';

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
