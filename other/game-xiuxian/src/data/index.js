/* ============================================================================
 * 静态配置：从 data.json 加载、校验并建立索引
 * ----------------------------------------------------------------------------
 * 所有配置常量均为 let 导出（live binding），由 buildDataIndexes() 在
 * 启动时从 data.json 填充；加载失败时抛错，由启动流程展示错误页。
 * ========================================================================== */

export let SKILL_DEFS = [];
export let REALMS = [];
export let ZONES = [];
export let BESTIARY = {};
export let BOSS_NAMES = [];
export let ACHIEVEMENTS = [];
export let SHOP_ITEMS = [];
export let EQ_TYPES = [];
export let EQ_NAMES = {};
export let RARITY_LABEL = {};
export let RARITY_MULT = {};
export let RARITY_COLORS = {};
export let EQ_BASES = {};
export let EQ_PREFIXES = {};
export let EQ_NAME_POOLS = {};
export let WORLD = {};
export let COMBAT_TUNING = {};
export let MATERIALS = {};
export let AFFIXES = [];
export let SET_LABELS = {};
export let RECIPES = [];
export let TALENTS = [];
export let SKILL_EVOLUTIONS = [];
export let QUEST_POOL = [];
export let SCENE_EFFECTS = {};
export let MONSTER_TEXTURES = {};

export function getRealm(rId){ return REALMS.find(r => r.id === rId) || REALMS[0]; }
export function getRealmIndex(rId){ return REALMS.findIndex(r => r.id === rId); }

/** 从服务器加载 data.json；失败时抛出，由启动流程展示错误页 */
export async function loadConfig() {
  const res = await fetch('data.json', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('data.json 加载失败 (HTTP ' + res.status + ')，请通过静态服务器访问');
  }
  const json = await res.json();
  if (!json || typeof json !== 'object') throw new Error('data.json 格式错误');
  return json;
}

/** 校验配置并把 data 分发到全局常量；任何不合法输入直接抛错，避免半初始化运行 */
export function buildDataIndexes(data) {
  const required = ['realms', 'skills', 'zones', 'bestiary', 'bossNames', 'achievements',
    'shopItems', 'equipment', 'world', 'combatTuning'];
  for (const key of required) {
    if (!data[key]) throw new Error('配置缺失: ' + key);
  }

  const assertUnique = (list, key, label) => {
    const seen = new Set();
    for (const item of list || []) {
      if (!item || seen.has(item[key])) throw new Error(label + ' 重复 id: ' + (item && item[key]));
      seen.add(item[key]);
    }
  };
  assertUnique(data.realms, 'id', '境界');
  assertUnique(data.skills, 'id', '技能');
  assertUnique(data.zones, 'id', '区域');
  assertUnique(data.achievements, 'id', '成就');
  assertUnique(data.shopItems, 'id', '商品');

  const zoneIds = new Set(data.zones.map(z => z.id));
  for (const zid of Object.keys(data.bestiary || {})) {
    if (!zoneIds.has(zid)) throw new Error('bestiary 引用了未知区域: ' + zid);
  }

  const skillIds = new Set(data.skills.map(s => s.id));
  for (const id of ['swordfly', 'earthmove', 'firedomain', 'thunder', 'hailstorm']) {
    if (!skillIds.has(id)) throw new Error('缺少默认技能: ' + id);
  }

  if (!(data.world.size > 0) || !(data.world.safeRadius > 0)) throw new Error('world 参数非法');
  if (!(data.combatTuning.maxActiveEnemies > 0)) throw new Error('combatTuning 参数非法');

  REALMS = data.realms;
  SKILL_DEFS = data.skills;
  ZONES = data.zones;
  BESTIARY = data.bestiary;
  BOSS_NAMES = data.bossNames;
  ACHIEVEMENTS = data.achievements;
  SHOP_ITEMS = data.shopItems;
  WORLD = data.world;
  COMBAT_TUNING = data.combatTuning;

  const eq = data.equipment;
  EQ_TYPES = eq.types;
  EQ_NAMES = eq.names;
  RARITY_LABEL = eq.rarityLabels;
  RARITY_MULT = eq.rarityMult;
  RARITY_COLORS = eq.rarityColors;
  EQ_BASES = eq.bases;
  EQ_PREFIXES = eq.prefixes;
  EQ_NAME_POOLS = eq.namePools;

  const pg = data.progression || {};
  MATERIALS = pg.materials;
  AFFIXES = pg.affixes;
  SET_LABELS = pg.setLabels;
  RECIPES = pg.recipes;
  TALENTS = pg.talents;
  SKILL_EVOLUTIONS = pg.skillEvolutions;
  QUEST_POOL = pg.questPool;

  SCENE_EFFECTS = data.sceneEffects || {};
  MONSTER_TEXTURES = data.monsterTextures || {};
}
