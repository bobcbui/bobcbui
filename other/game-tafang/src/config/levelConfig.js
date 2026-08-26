import { TILE_SIZE, GRID_COLS, GRID_ROWS, MAP_Y, OBSTACLE_TYPES } from './gameConfig.js';

function cx(col) { return col * TILE_SIZE + TILE_SIZE / 2; }
function cy(row) { return MAP_Y + row * TILE_SIZE + TILE_SIZE / 2; }

const OBSTACLE_STATS = {
  [OBSTACLE_TYPES.TREE]: { name: '大松树', hp: 120, reward: 25, icon: '🌲' },
  [OBSTACLE_TYPES.ROCK]: { name: '坚硬巨石', hp: 200, reward: 35, icon: '🪨' },
  [OBSTACLE_TYPES.MUSHROOM]: { name: '彩虹蘑菇', hp: 150, reward: 30, icon: '🍄' },
  [OBSTACLE_TYPES.CHEST]: { name: '神秘宝箱', hp: 320, reward: 80, icon: '🎁' },
  [OBSTACLE_TYPES.HOUSE]: { name: '童话小屋', hp: 250, reward: 50, icon: '🏠' },
};

function generateGrid(waypoints, obstacles, cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1)); // 1 = Buildable

  // Mark Path
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(10, Math.ceil(dist / 6));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      const col = Math.floor(px / TILE_SIZE);
      const row = Math.floor((py - MAP_Y) / TILE_SIZE);

      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        grid[row][col] = 0; // 0 = Path
      }
    }
  }

  // Mark Obstacles
  obstacles.forEach(obs => {
    if (obs.col >= 0 && obs.col < cols && obs.row >= 0 && obs.row < rows) {
      if (grid[obs.row][obs.col] === 1) {
        grid[obs.row][obs.col] = 2; // 2 = Obstacle
      }
    }
  });

  return grid;
}

const LEVELS = [
  {
    id: 1,
    name: '天际草原',
    description: '青翠的大草地，散落着松树与神秘宝箱',
    initialGold: 140,
    initialLives: 10,
    availableTowers: ['bottle', 'poop', 'sun'],
    waypoints: [
      { x: cx(-1), y: cy(2) },
      { x: cx(14), y: cy(2) },
      { x: cx(14), y: cy(7) },
      { x: cx(3), y: cy(7) },
      { x: cx(3), y: cy(13) },
      { x: cx(14), y: cy(13) },
      { x: cx(14), y: cy(19) },
      { x: cx(3), y: cy(19) },
      { x: cx(3), y: cy(24) },
      { x: cx(18), y: cy(24) },
    ],
    obstacles: [
      { col: 6, row: 4, type: OBSTACLE_TYPES.TREE },
      { col: 10, row: 4, type: OBSTACLE_TYPES.CHEST },
      { col: 8, row: 10, type: OBSTACLE_TYPES.MUSHROOM },
      { col: 11, row: 10, type: OBSTACLE_TYPES.TREE },
      { col: 6, row: 16, type: OBSTACLE_TYPES.CHEST },
      { col: 10, row: 16, type: OBSTACLE_TYPES.ROCK },
      { col: 8, row: 21, type: OBSTACLE_TYPES.TREE },
      { col: 12, row: 21, type: OBSTACLE_TYPES.HOUSE },
    ],
    waves: [
      { enemies: [{ type: 'jelly', count: 5, spacing: 700 }] },
      { enemies: [{ type: 'jelly', count: 6, spacing: 600 }, { type: 'duck', count: 3, spacing: 500 }], delay: 800 },
      { enemies: [{ type: 'duck', count: 6, spacing: 450 }, { type: 'jelly', count: 5, spacing: 600 }], delay: 600 },
      { enemies: [{ type: 'piggy', count: 2, spacing: 1200 }, { type: 'jelly', count: 6, spacing: 500 }], delay: 600 },
      { enemies: [{ type: 'duck', count: 8, spacing: 350 }, { type: 'piggy', count: 3, spacing: 900 }] },
      { enemies: [{ type: 'saucer', count: 4, spacing: 800 }, { type: 'duck', count: 6, spacing: 400 }] },
      { enemies: [{ type: 'piggy', count: 4, spacing: 700 }, { type: 'duck', count: 8, spacing: 300 }, { type: 'saucer', count: 4, spacing: 600 }] },
      { enemies: [{ type: 'boss', count: 1 }, { type: 'duck', count: 6, spacing: 350 }], delay: 1500 },
    ],
  },
  {
    id: 2,
    name: '彩虹丛林',
    description: '曲折的丛林大弯道，注意减速呆呆鸭！',
    initialGold: 130,
    initialLives: 10,
    availableTowers: ['bottle', 'poop', 'sun', 'fan'],
    waypoints: [
      { x: cx(-1), y: cy(2) },
      { x: cx(6), y: cy(2) },
      { x: cx(6), y: cy(8) },
      { x: cx(15), y: cy(8) },
      { x: cx(15), y: cy(14) },
      { x: cx(2), y: cy(14) },
      { x: cx(2), y: cy(20) },
      { x: cx(12), y: cy(20) },
      { x: cx(12), y: cy(25) },
      { x: cx(18), y: cy(25) },
    ],
    obstacles: [
      { col: 11, row: 4, type: OBSTACLE_TYPES.MUSHROOM },
      { col: 14, row: 4, type: OBSTACLE_TYPES.TREE },
      { col: 10, row: 11, type: OBSTACLE_TYPES.CHEST },
      { col: 6, row: 11, type: OBSTACLE_TYPES.HOUSE },
      { col: 6, row: 17, type: OBSTACLE_TYPES.ROCK },
      { col: 10, row: 17, type: OBSTACLE_TYPES.MUSHROOM },
      { col: 15, row: 22, type: OBSTACLE_TYPES.CHEST },
      { col: 5, row: 23, type: OBSTACLE_TYPES.TREE },
    ],
    waves: [
      { enemies: [{ type: 'jelly', count: 6, spacing: 600 }] },
      { enemies: [{ type: 'duck', count: 6, spacing: 400 }, { type: 'jelly', count: 4, spacing: 500 }] },
      { enemies: [{ type: 'piggy', count: 3, spacing: 1000 }, { type: 'jelly', count: 6, spacing: 500 }], delay: 800 },
      { enemies: [{ type: 'saucer', count: 5, spacing: 700 }, { type: 'duck', count: 6, spacing: 400 }] },
      { enemies: [{ type: 'duck', count: 10, spacing: 300 }, { type: 'piggy', count: 3, spacing: 800 }] },
      { enemies: [{ type: 'piggy', count: 5, spacing: 650 }, { type: 'saucer', count: 5, spacing: 600 }] },
      { enemies: [{ type: 'spooky', count: 6, spacing: 450 }, { type: 'duck', count: 8, spacing: 300 }] },
      { enemies: [{ type: 'piggy', count: 6, spacing: 550 }, { type: 'spooky', count: 6, spacing: 400 }] },
      { enemies: [{ type: 'boss', count: 1 }, { type: 'saucer', count: 4, spacing: 600 }], delay: 1500 },
      { enemies: [{ type: 'boss', count: 1 }, { type: 'piggy', count: 5, spacing: 600 }, { type: 'duck', count: 10, spacing: 250 }], delay: 1200 },
    ],
  },
  {
    id: 3,
    name: '沙漠遗迹',
    description: '环形回廊，宝箱里藏着大量金币！',
    initialGold: 120,
    initialLives: 10,
    availableTowers: ['bottle', 'poop', 'sun', 'fan', 'magic'],
    waypoints: [
      { x: cx(-1), y: cy(1) },
      { x: cx(16), y: cy(1) },
      { x: cx(16), y: cy(23) },
      { x: cx(1), y: cy(23) },
      { x: cx(1), y: cy(7) },
      { x: cx(12), y: cy(7) },
      { x: cx(12), y: cy(17) },
      { x: cx(5), y: cy(17) },
      { x: cx(5), y: cy(12) },
      { x: cx(9), y: cy(12) },
      { x: cx(9), y: cy(25) },
      { x: cx(18), y: cy(25) },
    ],
    obstacles: [
      { col: 6, row: 4, type: OBSTACLE_TYPES.ROCK },
      { col: 9, row: 4, type: OBSTACLE_TYPES.CHEST },
      { col: 8, row: 9, type: OBSTACLE_TYPES.HOUSE },
      { col: 3, row: 14, type: OBSTACLE_TYPES.TREE },
      { col: 8, row: 20, type: OBSTACLE_TYPES.CHEST },
      { col: 14, row: 12, type: OBSTACLE_TYPES.ROCK },
      { col: 14, row: 20, type: OBSTACLE_TYPES.MUSHROOM },
    ],
    waves: [
      { enemies: [{ type: 'jelly', count: 8, spacing: 500 }] },
      { enemies: [{ type: 'duck', count: 8, spacing: 350 }, { type: 'jelly', count: 6, spacing: 450 }] },
      { enemies: [{ type: 'saucer', count: 6, spacing: 600 }, { type: 'piggy', count: 3, spacing: 900 }] },
      { enemies: [{ type: 'spooky', count: 8, spacing: 400 }, { type: 'duck', count: 8, spacing: 300 }] },
      { enemies: [{ type: 'piggy', count: 6, spacing: 600 }, { type: 'saucer', count: 6, spacing: 550 }] },
      { enemies: [{ type: 'duck', count: 14, spacing: 220 }, { type: 'piggy', count: 5, spacing: 600 }] },
      { enemies: [{ type: 'spooky', count: 10, spacing: 350 }, { type: 'saucer', count: 8, spacing: 500 }] },
      { enemies: [{ type: 'boss', count: 1 }, { type: 'piggy', count: 6, spacing: 500 }], delay: 1500 },
      { enemies: [{ type: 'piggy', count: 8, spacing: 450 }, { type: 'duck', count: 12, spacing: 250 }] },
      { enemies: [{ type: 'boss', count: 2, spacing: 2500 }, { type: 'saucer', count: 8, spacing: 400 }], delay: 1200 },
    ],
  },
  {
    id: 4,
    name: '深海珊瑚',
    description: '交错的奇幻珊瑚道，火箭炮与太阳花大显身手',
    initialGold: 110,
    initialLives: 10,
    availableTowers: ['bottle', 'poop', 'sun', 'fan', 'magic', 'rocket'],
    waypoints: [
      { x: cx(-1), y: cy(3) },
      { x: cx(5), y: cy(3) },
      { x: cx(5), y: cy(9) },
      { x: cx(13), y: cy(9) },
      { x: cx(13), y: cy(2) },
      { x: cx(17), y: cy(2) },
      { x: cx(17), y: cy(16) },
      { x: cx(9), y: cy(16) },
      { x: cx(9), y: cy(21) },
      { x: cx(1), y: cy(21) },
      { x: cx(1), y: cy(13) },
      { x: cx(5), y: cy(13) },
      { x: cx(5), y: cy(25) },
      { x: cx(18), y: cy(25) },
    ],
    obstacles: [
      { col: 9, row: 6, type: OBSTACLE_TYPES.MUSHROOM },
      { col: 2, row: 6, type: OBSTACLE_TYPES.CHEST },
      { col: 9, row: 13, type: OBSTACLE_TYPES.TREE },
      { col: 14, row: 6, type: OBSTACLE_TYPES.HOUSE },
      { col: 14, row: 12, type: OBSTACLE_TYPES.ROCK },
      { col: 14, row: 23, type: OBSTACLE_TYPES.CHEST },
      { col: 3, row: 17, type: OBSTACLE_TYPES.MUSHROOM },
    ],
    waves: [
      { enemies: [{ type: 'jelly', count: 10, spacing: 450 }] },
      { enemies: [{ type: 'duck', count: 10, spacing: 300 }, { type: 'piggy', count: 3, spacing: 700 }] },
      { enemies: [{ type: 'saucer', count: 8, spacing: 500 }, { type: 'spooky', count: 8, spacing: 350 }] },
      { enemies: [{ type: 'piggy', count: 8, spacing: 500 }, { type: 'duck', count: 10, spacing: 260 }] },
      { enemies: [{ type: 'saucer', count: 10, spacing: 450 }, { type: 'spooky', count: 10, spacing: 300 }] },
      { enemies: [{ type: 'boss', count: 1 }, { type: 'piggy', count: 6, spacing: 500 }], delay: 1500 },
      { enemies: [{ type: 'duck', count: 16, spacing: 200 }, { type: 'saucer', count: 8, spacing: 400 }] },
      { enemies: [{ type: 'piggy', count: 10, spacing: 400 }, { type: 'spooky', count: 12, spacing: 280 }] },
      { enemies: [{ type: 'boss', count: 2, spacing: 2000 }, { type: 'duck', count: 10, spacing: 250 }] },
      { enemies: [{ type: 'boss', count: 2, spacing: 1500 }, { type: 'piggy', count: 8, spacing: 350 }, { type: 'saucer', count: 10, spacing: 350 }] },
    ],
  },
  {
    id: 5,
    name: '魔王城堡',
    description: '终极防线！保卫我们最可爱的大萝卜！',
    initialGold: 130,
    initialLives: 10,
    availableTowers: ['bottle', 'poop', 'sun', 'fan', 'magic', 'rocket'],
    waypoints: [
      { x: cx(-1), y: cy(2) },
      { x: cx(8), y: cy(2) },
      { x: cx(8), y: cy(7) },
      { x: cx(2), y: cy(7) },
      { x: cx(2), y: cy(13) },
      { x: cx(15), y: cy(13) },
      { x: cx(15), y: cy(5) },
      { x: cx(11), y: cy(5) },
      { x: cx(11), y: cy(19) },
      { x: cx(5), y: cy(19) },
      { x: cx(5), y: cy(24) },
      { x: cx(18), y: cy(24) },
    ],
    obstacles: [
      { col: 5, row: 4, type: OBSTACLE_TYPES.CHEST },
      { col: 5, row: 10, type: OBSTACLE_TYPES.HOUSE },
      { col: 13, row: 9, type: OBSTACLE_TYPES.ROCK },
      { col: 8, row: 16, type: OBSTACLE_TYPES.TREE },
      { col: 14, row: 16, type: OBSTACLE_TYPES.CHEST },
      { col: 8, row: 22, type: OBSTACLE_TYPES.MUSHROOM },
      { col: 2, row: 22, type: OBSTACLE_TYPES.ROCK },
    ],
    waves: [
      { enemies: [{ type: 'jelly', count: 12, spacing: 400 }] },
      { enemies: [{ type: 'duck', count: 12, spacing: 250 }, { type: 'saucer', count: 6, spacing: 450 }] },
      { enemies: [{ type: 'piggy', count: 8, spacing: 500 }, { type: 'spooky', count: 10, spacing: 300 }] },
      { enemies: [{ type: 'saucer', count: 10, spacing: 400 }, { type: 'duck', count: 14, spacing: 220 }] },
      { enemies: [{ type: 'piggy', count: 10, spacing: 400 }, { type: 'spooky', count: 12, spacing: 260 }] },
      { enemies: [{ type: 'boss', count: 1 }, { type: 'saucer', count: 10, spacing: 350 }], delay: 1500 },
      { enemies: [{ type: 'duck', count: 20, spacing: 180 }, { type: 'piggy', count: 8, spacing: 400 }] },
      { enemies: [{ type: 'saucer', count: 14, spacing: 300 }, { type: 'spooky', count: 14, spacing: 250 }] },
      { enemies: [{ type: 'piggy', count: 14, spacing: 320 }, { type: 'boss', count: 1 }], delay: 1000 },
      { enemies: [{ type: 'boss', count: 2, spacing: 1800 }, { type: 'piggy', count: 10, spacing: 300 }] },
      { enemies: [{ type: 'duck', count: 24, spacing: 150 }, { type: 'saucer', count: 16, spacing: 250 }] },
      { enemies: [{ type: 'boss', count: 3, spacing: 1500 }, { type: 'piggy', count: 12, spacing: 280 }, { type: 'spooky', count: 16, spacing: 200 }], delay: 800 },
    ],
  },
];

export function getLevelData(levelId) {
  const level = LEVELS.find(l => l.id === levelId) || LEVELS[0];
  const grid = generateGrid(level.waypoints, level.obstacles, GRID_COLS, GRID_ROWS);
  const obstacleList = (level.obstacles || []).map(obs => {
    const stats = OBSTACLE_STATS[obs.type];
    return {
      id: `${obs.col}_${obs.row}`,
      col: obs.col,
      row: obs.row,
      x: cx(obs.col),
      y: cy(obs.row),
      type: obs.type,
      name: stats.name,
      icon: stats.icon,
      hp: stats.hp,
      maxHp: stats.hp,
      reward: stats.reward,
      alive: true,
      _gfx: null,
    };
  });

  return { ...level, grid, obstacleList };
}

export function getTotalLevels() {
  return LEVELS.length;
}

export function getLevelInfo(levelId) {
  const l = LEVELS.find(l => l.id === levelId);
  return l ? { id: l.id, name: l.name, description: l.description, totalWaves: l.waves.length } : null;
}

export default LEVELS;
