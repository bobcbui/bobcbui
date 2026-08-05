/* 运行时引用：Phaser Game / Scene / 摇杆方向 / 技能冷却 */

const runtime = {
  game: null,
  scene: null,
  joystickDir: null,
  skillCooldowns: {}
};

export function setGame(game) { runtime.game = game; }
export function getGame() { return runtime.game; }
export function setScene(scene) { runtime.scene = scene; }
export function getScene() { return runtime.scene; }
export function setJoystickDir(dir) { runtime.joystickDir = dir; }
export function getJoystickDir() { return runtime.joystickDir; }
export function setSkillCooldowns(cooldowns) { runtime.skillCooldowns = cooldowns || {}; }
export function getSkillCooldowns() { return runtime.skillCooldowns; }
