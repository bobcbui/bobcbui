export const MONSTER_DEFS = [
  { type: 'common', name: '普通妖兽', hp: 30, speed: 60, damage: 10, gold: 5, texture: 'monster-common' },
  { type: 'fast', name: '迅捷妖兽', hp: 15, speed: 120, damage: 8, gold: 8, texture: 'monster-fast' },
  { type: 'tank', name: '巨型妖兽', hp: 100, speed: 35, damage: 20, gold: 15, texture: 'monster-tank' },
  { type: 'boss', name: '妖兽首领', hp: 400, speed: 40, damage: 30, gold: 100, texture: 'monster-boss' }
];

export function getMonsterDef(type) {
  return MONSTER_DEFS.find(m => m.type === type) || MONSTER_DEFS[0];
}

export function getMonsterHP(type, wave) {
  const def = getMonsterDef(type);
  const scale = 1 + (wave - 1) * 1.5;
  if (type === 'boss') return Math.floor(def.hp * scale * 2);
  return Math.floor(def.hp * scale);
}

export function getMonsterDamage(type, wave) {
  const def = getMonsterDef(type);
  return Math.floor(def.damage * (1 + (wave - 1) * 0.2));
}
