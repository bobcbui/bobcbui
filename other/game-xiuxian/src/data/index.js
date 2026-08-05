/* ============================================================================
 * 静态配置：从 data.json 加载、校验并建立索引
 * ----------------------------------------------------------------------------
 * 所有配置常量均为 let 导出（live binding），由 buildDataIndexes() 在
 * 启动时从 data.json 填充；加载失败时抛错，由启动流程展示错误页。
 * ========================================================================== */

export let SKILL_CARDS = [];
export let UPGRADE_CARDS = [];
export let BESTIARY = [];
export let BOSS_NAMES = [];
export let ACHIEVEMENTS = [];
export let WORLD = {};
export let COMBAT_TUNING = {};
export let PROGRESSION = {};
export let EQ_TYPES = [];
export let EQ_NAMES = {};
export let RARITY_LABEL = {};
export let RARITY_MULT = {};
export let EQ_BASES = {};
export let EQ_PREFIXES = {};
export let EQ_NAME_POOLS = {};

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
  const required = ['world', 'cards', 'bestiary', 'bossNames', 'achievements', 'combatTuning', 'progression', 'equipment'];
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
  assertUnique(data.cards.skill, 'id', '技能卡');
  assertUnique(data.cards.upgrade, 'id', '强化卡');
  assertUnique(data.achievements, 'id', '成就');

  if (!Array.isArray(data.bestiary) || data.bestiary.length === 0) throw new Error('bestiary 为空');
  if (!(data.world.width > 0) || !(data.world.height > 0) || !(data.world.playerY > 0)) throw new Error('world 参数非法');
  if (!(data.combatTuning.maxActiveEnemies > 0)) throw new Error('combatTuning 参数非法');
  const pg = data.progression;
  if (!(pg.wavesPerStage > 0) || !(pg.totalXpBase > 0) || !(pg.runXpBase > 0)) throw new Error('progression 参数非法');

  SKILL_CARDS = data.cards.skill;
  UPGRADE_CARDS = data.cards.upgrade;
  BESTIARY = data.bestiary;
  BOSS_NAMES = data.bossNames;
  ACHIEVEMENTS = data.achievements;
  WORLD = data.world;
  COMBAT_TUNING = data.combatTuning;
  PROGRESSION = data.progression;

  const eq = data.equipment;
  EQ_TYPES = eq.types;
  EQ_NAMES = eq.names;
  RARITY_LABEL = eq.rarityLabels;
  RARITY_MULT = eq.rarityMult;
  EQ_BASES = eq.bases;
  EQ_PREFIXES = eq.prefixes;
  EQ_NAME_POOLS = eq.namePools;
}
