import { GRID_COLS, GRID_ROWS, TILE_SIZE, GAME_WIDTH, GAME_HEIGHT, MAP_Y, MAP_HEIGHT, CARROT_MAX_HP } from './src/config/gameConfig.js';
import { TOWER_CONFIG, TOWER_TYPES } from './src/config/towerConfig.js';
import { ENEMY_CONFIG, ENEMY_TYPES } from './src/config/enemyConfig.js';
import { getLevelData, getTotalLevels, getLevelInfo } from './src/config/levelConfig.js';

console.log('=== RUNNING CARROT FANTASY INTEGRITY CHECKS ===');

// 1. Check Dimensions & Carrot
console.log(`Grid: ${GRID_COLS}x${GRID_ROWS}, Tile: ${TILE_SIZE}px => Map: ${GAME_WIDTH}x${MAP_HEIGHT}px`);
console.log(`Map Y: ${MAP_Y}, Game Height: ${GAME_HEIGHT}, Carrot Max HP: ${CARROT_MAX_HP}`);
if (GAME_WIDTH !== GRID_COLS * TILE_SIZE || MAP_HEIGHT !== GRID_ROWS * TILE_SIZE) {
  throw new Error('Dimension calculation mismatch!');
}

// 2. Check Carrot Fantasy Towers
const towerTypes = Object.values(TOWER_TYPES);
console.log(`Verifying ${towerTypes.length} tower types...`);
towerTypes.forEach(type => {
  const cfg = TOWER_CONFIG[type];
  if (!cfg) throw new Error(`Missing tower config for ${type}`);
  if (!cfg.levels || cfg.levels.length !== 3) throw new Error(`Tower ${type} must have 3 levels`);
  console.log(`  ✓ Tower [${cfg.name} (${type})] icon: ${cfg.icon}, tag: ${cfg.tag}`);
});

// 3. Check Cute Enemies
const enemyTypes = Object.values(ENEMY_TYPES);
console.log(`Verifying ${enemyTypes.length} enemy types...`);
enemyTypes.forEach(type => {
  const cfg = ENEMY_CONFIG[type];
  if (!cfg) throw new Error(`Missing enemy config for ${type}`);
  if (!cfg.hp || !cfg.speed || !cfg.reward) throw new Error(`Enemy ${type} missing essential attributes`);
  console.log(`  ✓ Enemy [${cfg.name} (${type})] HP: ${cfg.hp}, Speed: ${cfg.speed}, Reward: ${cfg.reward}`);
});

// 4. Check Levels, Obstacles & Waypoints
const totalLevels = getTotalLevels();
console.log(`Verifying ${totalLevels} levels with obstacles...`);
for (let id = 1; id <= totalLevels; id++) {
  const level = getLevelData(id);
  const info = getLevelInfo(id);
  if (!level || !info) throw new Error(`Failed to load level ${id}`);
  if (!level.grid || level.grid.length !== GRID_ROWS || level.grid[0].length !== GRID_COLS) {
    throw new Error(`Level ${id} grid size mismatch!`);
  }
  if (!level.waypoints || level.waypoints.length < 2) {
    throw new Error(`Level ${id} waypoints must have at least 2 points`);
  }
  if (!level.waves || level.waves.length === 0) {
    throw new Error(`Level ${id} has no waves`);
  }
  if (!level.obstacleList || level.obstacleList.length === 0) {
    throw new Error(`Level ${id} must have obstacles to clear!`);
  }

  // Verify all enemy types used in waves
  level.waves.forEach((w, wIdx) => {
    w.enemies.forEach(e => {
      if (!ENEMY_CONFIG[e.type]) {
        throw new Error(`Level ${id} wave ${wIdx + 1} references unknown enemy type: ${e.type}`);
      }
    });
  });

  // Verify all available towers in level
  level.availableTowers.forEach(t => {
    if (!TOWER_CONFIG[t]) {
      throw new Error(`Level ${id} references unknown tower type: ${t}`);
    }
  });

  console.log(`  ✓ Level ${id} [${info.name}] - Waves: ${level.waves.length}, Obstacles: ${level.obstacleList.length}, Waypoints: ${level.waypoints.length}`);
}

console.log('=== ALL CARROT FANTASY INTEGRITY CHECKS PASSED! ===');
