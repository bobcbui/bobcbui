export const TOWER_TYPES = {
  ARROW: 'arrow',
  CANNON: 'cannon',
  ICE: 'ice',
  LIGHTNING: 'lightning',
};

export const TOWER_CONFIG = {
  [TOWER_TYPES.ARROW]: {
    name: '箭塔',
    description: '单体攻击，攻速快',
    levels: [
      { damage: 20, range: 150, attackSpeed: 800, buildCost: 30, upgradeCost: 0, sellValue: 18 },
      { damage: 40, range: 170, attackSpeed: 650, buildCost: 30, upgradeCost: 40, sellValue: 42 },
      { damage: 70, range: 200, attackSpeed: 500, buildCost: 30, upgradeCost: 80, sellValue: 90 },
    ],
    color: 0x44aa44,
  },
  [TOWER_TYPES.CANNON]: {
    name: '炮塔',
    description: '范围溅射伤害',
    levels: [
      { damage: 35, range: 120, attackSpeed: 1500, buildCost: 50, upgradeCost: 0, sellValue: 30, splash: 60 },
      { damage: 60, range: 140, attackSpeed: 1300, buildCost: 50, upgradeCost: 60, sellValue: 66, splash: 70 },
      { damage: 100, range: 170, attackSpeed: 1100, buildCost: 50, upgradeCost: 100, sellValue: 126, splash: 85 },
    ],
    color: 0xaa4444,
  },
  [TOWER_TYPES.ICE]: {
    name: '冰塔',
    description: '减速敌人',
    levels: [
      { damage: 10, range: 130, attackSpeed: 1200, buildCost: 25, upgradeCost: 0, sellValue: 15, slow: 0.4, slowDuration: 2000 },
      { damage: 18, range: 150, attackSpeed: 1000, buildCost: 25, upgradeCost: 30, sellValue: 33, slow: 0.5, slowDuration: 2500 },
      { damage: 30, range: 180, attackSpeed: 800, buildCost: 25, upgradeCost: 60, sellValue: 69, slow: 0.6, slowDuration: 3000 },
    ],
    color: 0x88ccff,
  },
  [TOWER_TYPES.LIGHTNING]: {
    name: '雷塔',
    description: '连锁闪电攻击',
    levels: [
      { damage: 25, range: 140, attackSpeed: 1100, buildCost: 40, upgradeCost: 0, sellValue: 24, chain: 2 },
      { damage: 45, range: 160, attackSpeed: 900, buildCost: 40, upgradeCost: 50, sellValue: 54, chain: 3 },
      { damage: 75, range: 190, attackSpeed: 700, buildCost: 40, upgradeCost: 90, sellValue: 108, chain: 4 },
    ],
    color: 0xffff44,
  },
};
