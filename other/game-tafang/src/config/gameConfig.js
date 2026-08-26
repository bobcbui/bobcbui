// Defend the Saintess (保卫圣女) Configuration
export const TILE_SIZE = 30;
export const GRID_COLS = 18;
export const GRID_ROWS = 27;

export const GAME_WIDTH = GRID_COLS * TILE_SIZE; // 540
export const GAME_HEIGHT = 960;

export const MAP_Y = 60; // Map area: y=60 to y=870
export const MAP_HEIGHT = GRID_ROWS * TILE_SIZE; // 810

export const SAINTESS_MAX_HP = 10; // 我方纯阳圣女 10 点灵力生命

export const COLORS = {
  // Immortal Realm Emerald Grass & Holy Way
  GRASS_LIGHT: 0x65a30d,
  GRASS_DARK: 0x4d7c0f,
  GRASS_GRID: 0x3f6212,
  PATH: 0xfef08a,
  PATH_INNER: 0xfde047,
  PATH_BORDER: 0xd97706,
  PATH_CHEVRON: 0xea580c,

  // Grid Highlights
  BUILDABLE_HOVER: 0x86efac,
  BUILDABLE_INVALID: 0xf87171,
  RANGE_CIRCLE: 0x38bdf8,
  RANGE_CIRCLE_ALPHA: 0.22,

  // Saintess Divine Halo & Lotus
  SAINTESS_LOTUS: 0xf472b6,
  SAINTESS_LOTUS_CORE: 0xfb7185,
  SAINTESS_ROBE: 0x60a5fa,
  SAINTESS_HALO: 0xfde047,

  // Lock On Target Reticle (🎯 诛邪锁定)
  LOCK_TARGET_RING: 0xef4444,

  // HP & Shields
  HP_BAR_BG: 0x1e293b,
  HP_BAR_FILL: 0x22c55e,
  HP_BAR_WARN: 0xeab308,
  HP_BAR_DANGER: 0xef4444,
  SHIELD_BAR_FILL: 0x38bdf8,

  // In-place Wheel & Buttons
  WHEEL_BG: 0x064e3b,
  WHEEL_BORDER: 0x34d399,
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
  TREE: 'tree',         // 🌲 千年古松 (HP: 120, 灵石: 25)
  ROCK: 'rock',         // 🪨 封魔巨石 (HP: 200, 灵石: 35)
  MUSHROOM: 'mushroom', // 🍄 九转灵芝 (HP: 150, 灵石: 30)
  CHEST: 'chest',       // 🎁 玄天宝匣 (HP: 320, 灵石: 80)
  HOUSE: 'house',       // ⛩️ 镇魔古刹 (HP: 250, 灵石: 50)
};
