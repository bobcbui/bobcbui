import { MovementSystem } from './movement-system.js';
import { SpawnSystem } from './spawn-system.js';
import { ProjectileSystem } from './projectile-system.js';
import { CombatSystem } from './combat-system.js';
import { SkillSystem } from './skill-system.js';

export function installSceneSystems(scene) {
  scene.movementSystem = new MovementSystem(scene);
  scene.spawnSystem = new SpawnSystem(scene);
  scene.projectileSystem = new ProjectileSystem(scene);
  scene.combatSystem = new CombatSystem(scene);
  scene.skillSystem = new SkillSystem(scene);
}
