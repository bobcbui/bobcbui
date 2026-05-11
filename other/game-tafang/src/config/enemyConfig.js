export const ENEMY_TYPES = {
  NORMAL: 'normal',
  FAST: 'fast',
  TANK: 'tank',
  BOSS: 'boss',
};

export const ENEMY_CONFIG = {
  [ENEMY_TYPES.NORMAL]: {
    name: '普通兵',
    hp: 80, speed: 80, reward: 10, damage: 1,
    color: 0xff4444, radius: 10,
  },
  [ENEMY_TYPES.FAST]: {
    name: '快速兵',
    hp: 40, speed: 140, reward: 12, damage: 1,
    color: 0xffaa00, radius: 8,
  },
  [ENEMY_TYPES.TANK]: {
    name: '重装兵',
    hp: 250, speed: 50, reward: 20, damage: 2,
    color: 0x9933cc, radius: 14,
  },
  [ENEMY_TYPES.BOSS]: {
    name: '首领',
    hp: 800, speed: 40, reward: 80, damage: 5,
    color: 0xff0066, radius: 18,
  },
};
