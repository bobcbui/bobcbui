// Carrot Fantasy (保卫萝卜) Full-Screen Immersive Map & Theme Configuration
export const TILE_SIZE = 30;
export const GRID_COLS = 18;
export const GRID_ROWS = 27;

export const GAME_WIDTH = GRID_COLS * TILE_SIZE; // 540
export const GAME_HEIGHT = 960;

export const MAP_Y = 60; // Map area from y=60 to y=870
export const MAP_HEIGHT = GRID_ROWS * TILE_SIZE; // 810

export const CARROT_MAX_HP = 10; // 经典保卫大萝卜 10 点生命

export const COLORS = {
  // Fresh Lawn & Sand Path
  GRASS_LIGHT: 0x8edb4b,
  GRASS_DARK: 0x7bc73a,
  GRASS_GRID: 0x6db530,
  PATH: 0xfef08a,
  PATH_INNER: 0xfde047,
  PATH_BORDER: 0xf59e0b,
  PATH_CHEVRON: 0xf97316,

  // Grid Highlights
  BUILDABLE_HOVER: 0x86efac,
  BUILDABLE_INVALID: 0xf87171,
  RANGE_CIRCLE: 0x38bdf8,
  RANGE_CIRCLE_ALPHA: 0.22,

  // Carrot Base
  CARROT_BODY: 0xf97316,
  CARROT_BODY_DARK: 0xea580c,
  CARROT_LEAF: 0x22c55e,
  CARROT_BLUSH: 0xf43f5e,

  // Lock On Target Reticle
  LOCK_TARGET_RING: 0xef4444,

  // HP Bar
  HP_BAR_BG: 0x334155,
  HP_BAR_FILL: 0x22c55e,
  HP_BAR_WARN: 0xeab308,
  HP_BAR_DANGER: 0xef4444,

  // In-place Wheel & Bubbles
  WHEEL_BG: 0x0369a1,
  WHEEL_BORDER: 0x38bdf8,
  BTN_UPGRADE: 0x16a34a,
  BTN_SELL: 0xdc2626,
};

export const GAME_STATES = {
  PREPARATION: 'preparation',
  IN_WAVE: 'in_wave',
  WAVE_COMPLETE: 'wave_complete',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
};

export const OBSTACLE_TYPES = {
  TREE: 'tree',         // 🌲 绿叶松树 (HP: 120, 奖励: 25金币)
  ROCK: 'rock',         // 🪨 坚硬大石 (HP: 200, 奖励: 35金币)
  MUSHROOM: 'mushroom', // 🍄 彩虹蘑菇 (HP: 150, 奖励: 30金币)
  CHEST: 'chest',       // 🎁 豪华宝箱 (HP: 350, 奖励: 80金币)
  HOUSE: 'house',       // 🏠 童话木屋 (HP: 280, 奖励: 50金币)
};
