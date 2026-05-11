export const UPGRADE_DEFS = [
  { id: 'atk', name: '攻击力', desc: '每级+5攻击', baseCost: 50, costScale: 1.5, maxLevel: 20 },
  { id: 'atkSpeed', name: '攻击速度', desc: '每级+0.3攻速', baseCost: 60, costScale: 1.5, maxLevel: 15 },
  { id: 'hp', name: '生命值', desc: '每级+20生命', baseCost: 40, costScale: 1.4, maxLevel: 20 },
  { id: 'fireball', name: '火球术', desc: '每级+20%伤害', baseCost: 80, costScale: 1.6, maxLevel: 10 },
  { id: 'frost', name: '冰霜新星', desc: '每级+0.5秒冻结', baseCost: 70, costScale: 1.6, maxLevel: 10 },
  { id: 'lightning', name: '闪电链', desc: '每级+1链目标', baseCost: 80, costScale: 1.6, maxLevel: 10 },
  { id: 'multishot', name: '多重炮击', desc: '每级+2发炮弹', baseCost: 75, costScale: 1.5, maxLevel: 10 }
];

export function getUpgradeCost(upgradeId, level) {
  const def = UPGRADE_DEFS.find(u => u.id === upgradeId);
  if (!def) return 999999;
  return Math.floor(def.baseCost * Math.pow(def.costScale, level));
}
