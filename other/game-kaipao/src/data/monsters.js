export const MONSTER_DEFS = [
  { type: 'small', name: '小妖', hp: 20, speed: 50, damage: 8, gold: 3, scale: 0.9, color: '#e94560' },
  { type: 'fast', name: '快妖', hp: 12, speed: 100, damage: 6, gold: 5, scale: 0.8, color: '#f5a623' },
  { type: 'tank', name: '巨妖', hp: 80, speed: 30, damage: 15, gold: 12, scale: 1.2, color: '#6c5ce7' },
  { type: 'boss', name: '妖王', hp: 300, speed: 35, damage: 25, gold: 50, scale: 1.6, color: '#d63031' }
];

export function getMonsterDef(type) {
  return MONSTER_DEFS.find(m => m.type === type) || MONSTER_DEFS[0];
}

export function getMonsterHP(type, stage, level) {
  const def = getMonsterDef(type);
  const stageScale = 1 + (stage - 1) * 2;
  const levelScale = 1 + (level - 1) * 0.15;
  if (type === 'boss') return Math.floor(def.hp * stageScale * levelScale * 2.5);
  return Math.floor(def.hp * stageScale * levelScale);
}

export function getMonsterDamage(type, stage) {
  const def = getMonsterDef(type);
  return Math.floor(def.damage * (1 + (stage - 1) * 0.3));
}
