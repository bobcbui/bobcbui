import { TILE_SIZE, GRID_COLS, GRID_ROWS } from './gameConfig.js';

function cx(col) { return col * TILE_SIZE + TILE_SIZE / 2; }
function cy(row) { return row * TILE_SIZE + TILE_SIZE / 2; }

function generateGrid(waypoints, cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1));
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const steps = 40;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      const col = Math.floor(px / TILE_SIZE);
      const row = Math.floor(py / TILE_SIZE);
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        if (col + 1 < cols) grid[row][col + 1] = 0;
        if (col - 1 >= 0) grid[row][col - 1] = 0;
        grid[row][col] = 0;
        if (row + 1 < rows) grid[row + 1][col] = 0;
        if (row - 1 >= 0) grid[row - 1][col] = 0;
      }
    }
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] === 1 && Math.random() < 0.04)
        grid[r][c] = 2;
  return grid;
}

const LEVELS = [
  {
    id: 1,
    name: '新手之路',
    description: '一条简单的蜿蜒小路',
    initialGold: 120,
    initialLives: 20,
    availableTowers: ['arrow', 'cannon'],
    waves: [
      { enemies: [{ type: 'normal', count: 3, spacing: 800 }] },
      { enemies: [{ type: 'normal', count: 5, spacing: 700 }] },
      { enemies: [{ type: 'normal', count: 4 }, { type: 'fast', count: 2, spacing: 600 }], delay: 1500 },
      { enemies: [{ type: 'normal', count: 6, spacing: 600 }, { type: 'fast', count: 3, spacing: 500 }], delay: 1000 },
      { enemies: [{ type: 'normal', count: 8, spacing: 500 }, { type: 'fast', count: 4, spacing: 400 }] },
      { enemies: [{ type: 'tank', count: 3, spacing: 1200 }] },
      { enemies: [{ type: 'normal', count: 6 }, { type: 'tank', count: 3, spacing: 1000 }, { type: 'fast', count: 5, spacing: 350 }], delay: 500 },
      { enemies: [{ type: 'boss', count: 1 }], delay: 2000 },
    ],
    waypoints: [
      { x: cx(-1), y: cy(1) },
      { x: cx(8), y: cy(1) },
      { x: cx(8), y: cy(3) },
      { x: cx(3), y: cy(3) },
      { x: cx(3), y: cy(5) },
      { x: cx(11), y: cy(5) },
      { x: cx(11), y: cy(7) },
      { x: cx(15), y: cy(7) },
    ],
  },
  {
    id: 2,
    name: '蛇形弯道',
    description: '蜿蜒曲折的S形路径',
    initialGold: 100,
    initialLives: 20,
    availableTowers: ['arrow', 'cannon', 'ice'],
    waves: [
      { enemies: [{ type: 'normal', count: 5, spacing: 700 }] },
      { enemies: [{ type: 'fast', count: 4, spacing: 500 }, { type: 'normal', count: 3, spacing: 600 }] },
      { enemies: [{ type: 'normal', count: 6 }, { type: 'tank', count: 2, spacing: 1000 }], delay: 1000 },
      { enemies: [{ type: 'fast', count: 6, spacing: 400 }, { type: 'tank', count: 2, spacing: 800 }] },
      { enemies: [{ type: 'normal', count: 10, spacing: 400 }, { type: 'fast', count: 6, spacing: 300 }] },
      { enemies: [{ type: 'tank', count: 4, spacing: 800 }, { type: 'fast', count: 5, spacing: 350 }], delay: 500 },
      { enemies: [{ type: 'normal', count: 8 }, { type: 'tank', count: 5, spacing: 700 }] },
      { enemies: [{ type: 'tank', count: 4, spacing: 600 }, { type: 'fast', count: 8, spacing: 300 }], delay: 1000 },
      { enemies: [{ type: 'boss', count: 1 }], delay: 2000 },
      { enemies: [{ type: 'boss', count: 1 }, { type: 'fast', count: 6, spacing: 300 }], delay: 1500 },
    ],
    waypoints: [
      { x: cx(-1), y: cy(0) },
      { x: cx(7), y: cy(0) },
      { x: cx(7), y: cy(2) },
      { x: cx(2), y: cy(2) },
      { x: cx(2), y: cy(4) },
      { x: cx(12), y: cy(4) },
      { x: cx(12), y: cy(6) },
      { x: cx(4), y: cy(6) },
      { x: cx(4), y: cy(8) },
      { x: cx(15), y: cy(8) },
    ],
  },
  {
    id: 3,
    name: '环形要塞',
    description: '围绕中心区域的大环形路径',
    initialGold: 100,
    initialLives: 15,
    availableTowers: ['arrow', 'cannon', 'ice', 'lightning'],
    waves: [
      { enemies: [{ type: 'normal', count: 6, spacing: 600 }] },
      { enemies: [{ type: 'fast', count: 5, spacing: 450 }, { type: 'normal', count: 4, spacing: 500 }] },
      { enemies: [{ type: 'tank', count: 3, spacing: 900 }] },
      { enemies: [{ type: 'normal', count: 8 }, { type: 'fast', count: 6, spacing: 350 }, { type: 'tank', count: 2 }], delay: 800 },
      { enemies: [{ type: 'tank', count: 5, spacing: 700 }, { type: 'fast', count: 8, spacing: 300 }] },
      { enemies: [{ type: 'fast', count: 10, spacing: 250 }, { type: 'tank', count: 4, spacing: 600 }] },
      { enemies: [{ type: 'tank', count: 6, spacing: 500 }, { type: 'normal', count: 10, spacing: 350 }] },
      { enemies: [{ type: 'boss', count: 1 }], delay: 2000 },
      { enemies: [{ type: 'tank', count: 5, spacing: 400 }, { type: 'boss', count: 1 }], delay: 1500 },
      { enemies: [{ type: 'boss', count: 2, spacing: 2000 }], delay: 1000 },
    ],
    waypoints: [
      { x: cx(-1), y: cy(0) },
      { x: cx(14), y: cy(0) },
      { x: cx(14), y: cy(9) },
      { x: cx(0), y: cy(9) },
      { x: cx(0), y: cy(4) },
      { x: cx(5), y: cy(4) },
      { x: cx(5), y: cy(5) },
      { x: cx(9), y: cy(5) },
      { x: cx(9), y: cy(4) },
      { x: cx(14), y: cy(4) },
      { x: cx(14), y: cy(1) },
      { x: cx(0), y: cy(1) },
      { x: cx(0), y: cy(3) },
      { x: cx(15), y: cy(3) },
    ],
  },
  {
    id: 4,
    name: '交叉火网',
    description: '多段交叉路径，需要精心布局',
    initialGold: 90,
    initialLives: 20,
    availableTowers: ['arrow', 'cannon', 'ice', 'lightning'],
    waves: [
      { enemies: [{ type: 'normal', count: 6, spacing: 600 }] },
      { enemies: [{ type: 'fast', count: 6, spacing: 400 }, { type: 'normal', count: 4, spacing: 500 }] },
      { enemies: [{ type: 'tank', count: 3, spacing: 800 }] },
      { enemies: [{ type: 'normal', count: 8 }, { type: 'tank', count: 3, spacing: 700 }, { type: 'fast', count: 5 }], delay: 600 },
      { enemies: [{ type: 'fast', count: 10, spacing: 300 }, { type: 'tank', count: 4, spacing: 600 }] },
      { enemies: [{ type: 'tank', count: 6, spacing: 500 }, { type: 'normal', count: 8, spacing: 350 }] },
      { enemies: [{ type: 'fast', count: 12, spacing: 250 }, { type: 'tank', count: 5, spacing: 450 }] },
      { enemies: [{ type: 'boss', count: 1 }], delay: 2000 },
      { enemies: [{ type: 'tank', count: 6, spacing: 400 }, { type: 'boss', count: 1 }], delay: 1000 },
      { enemies: [{ type: 'boss', count: 2 }, { type: 'tank', count: 4, spacing: 400 }], delay: 1000 },
    ],
    waypoints: [
      { x: cx(-1), y: cy(0) },
      { x: cx(4), y: cy(0) },
      { x: cx(4), y: cy(4) },
      { x: cx(10), y: cy(4) },
      { x: cx(10), y: cy(0) },
      { x: cx(14), y: cy(0) },
      { x: cx(14), y: cy(5) },
      { x: cx(10), y: cy(5) },
      { x: cx(10), y: cy(9) },
      { x: cx(4), y: cy(9) },
      { x: cx(4), y: cy(5) },
      { x: cx(0), y: cy(5) },
      { x: cx(0), y: cy(0) },
      { x: cx(15), y: cy(0) },
    ],
  },
  {
    id: 5,
    name: '终极迷宫',
    description: '极其复杂的路径，真正的考验',
    initialGold: 80,
    initialLives: 15,
    availableTowers: ['arrow', 'cannon', 'ice', 'lightning'],
    waves: [
      { enemies: [{ type: 'normal', count: 8, spacing: 500 }] },
      { enemies: [{ type: 'fast', count: 8, spacing: 350 }, { type: 'normal', count: 5, spacing: 400 }] },
      { enemies: [{ type: 'tank', count: 4, spacing: 700 }] },
      { enemies: [{ type: 'normal', count: 10 }, { type: 'tank', count: 3, spacing: 600 }, { type: 'fast', count: 6 }], delay: 500 },
      { enemies: [{ type: 'fast', count: 12, spacing: 250 }, { type: 'tank', count: 5, spacing: 500 }] },
      { enemies: [{ type: 'tank', count: 8, spacing: 400 }, { type: 'normal', count: 10, spacing: 300 }] },
      { enemies: [{ type: 'fast', count: 15, spacing: 200 }, { type: 'tank', count: 6, spacing: 400 }] },
      { enemies: [{ type: 'boss', count: 1 }], delay: 2000 },
      { enemies: [{ type: 'tank', count: 8, spacing: 350 }, { type: 'boss', count: 1 }], delay: 1000 },
      { enemies: [{ type: 'boss', count: 2 }, { type: 'tank', count: 6, spacing: 350 }, { type: 'fast', count: 10, spacing: 180 }], delay: 800 },
      { enemies: [{ type: 'boss', count: 2, spacing: 1500 }], delay: 2000 },
    ],
    waypoints: [
      { x: cx(-1), y: cy(0) },
      { x: cx(6), y: cy(0) },
      { x: cx(6), y: cy(2) },
      { x: cx(2), y: cy(2) },
      { x: cx(2), y: cy(1) },
      { x: cx(0), y: cy(1) },
      { x: cx(0), y: cy(4) },
      { x: cx(4), y: cy(4) },
      { x: cx(4), y: cy(3) },
      { x: cx(10), y: cy(3) },
      { x: cx(10), y: cy(1) },
      { x: cx(12), y: cy(1) },
      { x: cx(12), y: cy(4) },
      { x: cx(8), y: cy(4) },
      { x: cx(8), y: cy(6) },
      { x: cx(4), y: cy(6) },
      { x: cx(4), y: cy(9) },
      { x: cx(8), y: cy(9) },
      { x: cx(8), y: cy(7) },
      { x: cx(12), y: cy(7) },
      { x: cx(12), y: cy(5) },
      { x: cx(14), y: cy(5) },
      { x: cx(14), y: cy(9) },
      { x: cx(15), y: cy(9) },
    ],
  },
];

function getWaypointsCenter(waypoints) {
  let cx = 0, cy = 0;
  waypoints.forEach(w => { cx += w.x; cy += w.y; });
  return { x: cx / waypoints.length, y: cy / waypoints.length };
}

export function getLevelData(levelId) {
  const level = LEVELS.find(l => l.id === levelId) || LEVELS[0];
  const grid = generateGrid(level.waypoints, GRID_COLS, GRID_ROWS);
  return { ...level, grid };
}

export function getTotalLevels() {
  return LEVELS.length;
}

export function getLevelInfo(levelId) {
  const l = LEVELS.find(l => l.id === levelId);
  return l ? { id: l.id, name: l.name, description: l.description } : null;
}

export default LEVELS;
