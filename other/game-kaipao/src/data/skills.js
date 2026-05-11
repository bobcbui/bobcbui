export const SKILL_DEFS = [
  {
    id: 'fireball',
    name: '火球术',
    short: '火',
    desc: '向前方发射一颗火球，对路径上的妖兽造成AOE伤害',
    cooldown: 6,
    damage: 1.5,
    icon: '🔥'
  },
  {
    id: 'frost',
    name: '冰霜新星',
    short: '冰',
    desc: '冻结场上所有妖兽3秒',
    cooldown: 12,
    freezeDuration: 3,
    icon: '❄️'
  },
  {
    id: 'lightning',
    name: '闪电链',
    short: '雷',
    desc: '连锁闪电击中最近的5个妖兽',
    cooldown: 8,
    chainCount: 5,
    damage: 1.0,
    icon: '⚡'
  },
  {
    id: 'multishot',
    name: '多重炮击',
    short: '炮',
    desc: '向多个方向同时发射炮弹',
    cooldown: 10,
    count: 8,
    damage: 0.6,
    icon: '💥'
  }
];
