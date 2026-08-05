/* ============================================================================
 * 九天仙途 (index.js) — 全部运行时逻辑
 * ----------------------------------------------------------------------------
 * 区块结构（按顺序）：
 *   1. 数据加载与配置校验（data.json -> 全局常量 + 校验）
 *   2. 常量、工具函数与默认状态（事件总线 bus / DOM 缓存 / 运行时 / 玩家状态 P）
 *   3. 状态读写、属性重算、境界修炼、装备与进度规则
 *   4. 存档：读档、保存、导入、导出与 v1 兼容
 *   5. Phaser 配置、MainScene、纹理、实体生成、移动、AI、波次、战斗与技能
 *   6. 特效、对象池、碰撞、伤害、掉落与死亡流程
 *   7. HUD、热栏、面板、导航与 DOM 渲染
 *   8. 事件委托与键盘/鼠标/触摸/摇杆输入
 *   9. 启动流程、错误处理与页面生命周期
 * ----------------------------------------------------------------------------
 * 依赖：lib/phaser.min.js（全局 Phaser）；静态配置来自 data.json；
 *       纹理全部代码生成，无外部图片/音频/字体资源。
 * ============================================================================
 */
(function () {
'use strict';

/* ============================================================================
 * 区块 1：数据加载与配置校验
 * ========================================================================== */
const SAVE_KEY = 'xiuxian_save';

let DATA = null;
let SKILL_DEFS = [];
let REALMS = [];
let ZONES = [];
let BESTIARY = {};
let BOSS_NAMES = [];
let ACHIEVEMENTS = [];
let SHOP_ITEMS = [];
let EQ_TYPES = [];
let EQ_NAMES = {};
let RARITY_LABEL = {};
let RARITY_MULT = {};
let RARITY_COLORS = {};
let EQ_BASES = {};
let EQ_PREFIXES = {};
let EQ_NAME_POOLS = {};
let WORLD = {};
let COMBAT_TUNING = {};
let MATERIALS = {};
let AFFIXES = [];
let SET_LABELS = {};
let RECIPES = [];
let TALENTS = [];
let SKILL_EVOLUTIONS = [];
let QUEST_POOL = [];
let SCENE_EFFECTS = {};
let MONSTER_TEXTURES = {};

/** 从服务器加载 data.json；失败时抛出，由启动流程展示错误页 */
async function loadConfig() {
  const res = await fetch('data.json', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('data.json 加载失败 (HTTP ' + res.status + ')，请通过静态服务器访问');
  }
  const json = await res.json();
  if (!json || typeof json !== 'object') throw new Error('data.json 格式错误');
  return json;
}

/** 校验配置并把 DATA 分发到全局常量；任何不合法输入直接抛错，避免半初始化运行 */
function buildDataIndexes() {
  const required = ['realms', 'skills', 'zones', 'bestiary', 'bossNames', 'achievements',
    'shopItems', 'equipment', 'world', 'combatTuning'];
  for (const key of required) {
    if (!DATA[key]) throw new Error('配置缺失: ' + key);
  }

  const assertUnique = (list, key, label) => {
    const seen = new Set();
    for (const item of list || []) {
      if (!item || seen.has(item[key])) throw new Error(label + ' 重复 id: ' + (item && item[key]));
      seen.add(item[key]);
    }
  };
  assertUnique(DATA.realms, 'id', '境界');
  assertUnique(DATA.skills, 'id', '技能');
  assertUnique(DATA.zones, 'id', '区域');
  assertUnique(DATA.achievements, 'id', '成就');
  assertUnique(DATA.shopItems, 'id', '商品');

  const zoneIds = new Set(DATA.zones.map(z => z.id));
  for (const zid of Object.keys(DATA.bestiary || {})) {
    if (!zoneIds.has(zid)) throw new Error('bestiary 引用了未知区域: ' + zid);
  }

  const skillIds = new Set(DATA.skills.map(s => s.id));
  for (const id of ['swordfly', 'earthmove', 'firedomain', 'thunder', 'hailstorm']) {
    if (!skillIds.has(id)) throw new Error('缺少默认技能: ' + id);
  }

  if (!(DATA.world.size > 0) || !(DATA.world.safeRadius > 0)) throw new Error('world 参数非法');
  if (!(DATA.combatTuning.maxActiveEnemies > 0)) throw new Error('combatTuning 参数非法');

  REALMS = DATA.realms;
  SKILL_DEFS = DATA.skills;
  ZONES = DATA.zones;
  BESTIARY = DATA.bestiary;
  BOSS_NAMES = DATA.bossNames;
  ACHIEVEMENTS = DATA.achievements;
  SHOP_ITEMS = DATA.shopItems;
  WORLD = DATA.world;
  COMBAT_TUNING = DATA.combatTuning;

  const eq = DATA.equipment;
  EQ_TYPES = eq.types;
  EQ_NAMES = eq.names;
  RARITY_LABEL = eq.rarityLabels;
  RARITY_MULT = eq.rarityMult;
  RARITY_COLORS = eq.rarityColors;
  EQ_BASES = eq.bases;
  EQ_PREFIXES = eq.prefixes;
  EQ_NAME_POOLS = eq.namePools;

  const pg = DATA.progression || {};
  MATERIALS = pg.materials;
  AFFIXES = pg.affixes;
  SET_LABELS = pg.setLabels;
  RECIPES = pg.recipes;
  TALENTS = pg.talents;
  SKILL_EVOLUTIONS = pg.skillEvolutions;
  QUEST_POOL = pg.questPool;

  SCENE_EFFECTS = DATA.sceneEffects || {};
  MONSTER_TEXTURES = DATA.monsterTextures || {};
}

/* ============================================================================
 * 区块 2：常量、工具函数与默认状态
 * ========================================================================== */

/* ---- 事件总线 ---- */
const listeners = {};

const bus = {
  on(event, fn) {
    (listeners[event] = listeners[event] || []).push(fn);
  },
  off(event, fn) {
    const arr = listeners[event];
    if (arr) { const i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1); }
  },
  emit(event, ...args) {
    (listeners[event] || []).forEach(fn => fn(...args));
  }
};

/* ---- DOM 缓存 ---- */
const elementCache = new Map();

function getEl(id) {
  if (!id) return null;
  const cached = elementCache.get(id);
  if (cached && cached.isConnected) return cached;
  const el = document.getElementById(id);
  if (el) elementCache.set(id, el);
  return el;
}

function clearDomCache() {
  elementCache.clear();
}

/* ---- 运行时引用（Phaser Game / Scene / 摇杆 / 冷却） ---- */
const runtime = {
  game: null,
  scene: null,
  joystickDir: null,
  skillCooldowns: {}
};

function setGame(game) { runtime.game = game; }
function getGame() { return runtime.game; }
function setScene(scene) { runtime.scene = scene; }
function getScene() { return runtime.scene; }
function setJoystickDir(dir) { runtime.joystickDir = dir; }
function getJoystickDir() { return runtime.joystickDir; }
function setSkillCooldowns(cooldowns) { runtime.skillCooldowns = cooldowns || {}; }
function getSkillCooldowns() { return runtime.skillCooldowns; }

/* ---- 消息提示（status / loot，配合状态计时器） ---- */
function setStatus(text, dur) {
  setStatusTimer(dur || 2);
  const el = getEl('status');
  if (el) {
    el.textContent = text;
    el.classList.add('show');
  }
}

function setLoot(text) {
  setLootTimer(2.5);
  const el = getEl('loot-popup');
  if (el) { el.textContent = text; el.classList.add('show'); }
}

bus.on('status', setStatus);
bus.on('loot', setLoot);

/* ---- 玩家默认状态 P ---- */
const P = {
  hp:100, maxHp:100,
  atk:10, def:5, speed:220,
  realm:'mortal', stage:1,
  level:1, xp:0, xpToNext:10,
  gold:0, kills:0,
  attrPoints:0, skillPoints:0,
  attrs:{ str:0, body:0, spirit:0, agility:0 },
  skillLevels:{ swordfly:1, earthmove:1, firedomain:1, thunder:1, hailstorm:1 },
  skills:[],
  hotbar:[],
  equipment:{},
  inventory:[],
  materials:{ ore:0, herb:0, core:0, dust:0 },
  bestiary:{},
  quests:[],
  talents:{},
  skillEvolutions:{},
  dungeon:{ active:false, kills:0, target:0 },
  mods:{ critChance:0, lifestealPct:0, dropRate:0, xpBonus:0, goldBonus:0, cooldownReduction:0, skillDamage:0 },
  buffTimer:0, buff:{ speedBoost:0, shieldPct:0, atkBoost:0, rangeBoost:0, swordAtkSpeedBoost:0, lifestealPct:0, swordColor:0, swordTrailColor:0 },
  totalPlayTime:0,
  totalGoldEarned:0, legendaryFound:false, maxWave:0,
  achievements:{}
};

/* ---- 运行期可变状态 ---- */
let waveNum = 0;
let waveTimer = 0;
let wavePending = false;
let waveDelay = 8;
let statusTimer = 0;
let lootTimer = 0;
let isCultivating = false;
let cultProgress = 0;
let breakPending = false;
let autoSaveTimer = 0;
let wallHp = 500;
let wallMaxHp = 500;
let defenseWave = 0;
let gameStarted = false;
const MAX_WAVES = 20;

let hotGen = -1;
const hudCache = { realm:'', level:-1, hp:-1, maxHp:-1, xp:-1, xpNext:-1, gold:-1, kills:-1 };

function setWallHp(v){ wallHp = v; if (wallHp < 0) wallHp = 0; }
function setWallMaxHp(v){ wallMaxHp = v; }
function setDefenseWave(v){ defenseWave = v; }
function setGameStarted(v){ gameStarted = v; }
function setAutoSaveTimer(v){ autoSaveTimer = v; }
function setHotGen(v){ hotGen = v; }
function setWaveNum(v){ waveNum = v; }
function setWaveTimer(v){ waveTimer = v; }
function setWavePending(v){ wavePending = v; }
function setStatusTimer(v){ statusTimer = v; }
function setLootTimer(v){ lootTimer = v; }
function setIsCultivating(v){ isCultivating = v; }
function setCultProgress(v){ cultProgress = v; }
function setBreakPending(v){ breakPending = v; }

/* ============================================================================
 * 区块 3：状态读写、属性重算、境界/修炼、装备/进度规则
 * ========================================================================== */

/* ---- 属性重算 ---- */
function getRealm(rId){ return REALMS.find(r => r.id === rId) || REALMS[0]; }
function getRealmIndex(rId){ return REALMS.findIndex(r => r.id === rId); }

function recalcStats(){
  P.mods = { critChance:0, lifestealPct:0, dropRate:0, xpBonus:0, goldBonus:0, cooldownReduction:0, skillDamage:0 };
  const r = getRealm(P.realm);
  const stageMult = (P.stage-1) / (r.stages-1 || 1);
  P.maxHp = 100 + r.hpBonus * (1 + stageMult * 0.5);
  P.atk = 10 + r.atkBonus * (1 + stageMult * 0.5);
  P.def = 5 + r.defBonus * (1 + stageMult * 0.5);
  P.speed = 220 + (getRealmIndex(P.realm) * 10);
  P.atk += (P.attrs?.str || 0) * 2;
  P.maxHp += (P.attrs?.body || 0) * 12;
  P.def += (P.attrs?.body || 0) * 0.8;
  P.atk += (P.attrs?.spirit || 0) * 0.8;
  P.speed += (P.attrs?.agility || 0) * 5;
  for(const slot of EQ_TYPES){
    const eq = P.equipment[slot];
    if(!eq) continue;
    const stats = getEffectiveEquipmentStats(eq);
    if(stats.atk) P.atk += stats.atk;
    if(stats.def) P.def += stats.def;
    if(stats.hp) P.maxHp += stats.hp;
    if(stats.speed) P.speed += stats.speed;
    for(const affix of eq.affixes || []) {
      if(P.mods[affix.key] != null) P.mods[affix.key] += affix.value;
    }
  }
  applySetBonuses();
  applyTalentBonuses();
  applySkillEvolutionBonuses();
  P.speed = Math.min(P.speed, 420);
  P.hp = Math.min(P.hp, P.maxHp);
}

function applySetBonuses() {
  const counts = {};
  for(const slot of EQ_TYPES) {
    const setId = P.equipment[slot]?.setId;
    if(setId) counts[setId] = (counts[setId] || 0) + 1;
  }
  for(const [setId, count] of Object.entries(counts)) {
    if(count >= 2) {
      if(setId === 'sword') P.mods.skillDamage += 0.08;
      if(setId === 'thunder') P.mods.cooldownReduction += 0.06;
      if(setId === 'body') P.maxHp += 80;
    }
    if(count >= 4) {
      if(setId === 'sword') P.atk += 25;
      if(setId === 'thunder') P.mods.critChance += 0.05;
      if(setId === 'body') P.def += 18;
    }
    if(count >= 6) {
      if(setId === 'sword') P.mods.lifestealPct += 0.02;
      if(setId === 'thunder') P.mods.skillDamage += 0.12;
      if(setId === 'body') P.mods.dropRate += 0.12;
    }
  }
}

function applyTalentBonuses() {
  const t = P.talents || {};
  if(t.sword_1) { P.atk += 15; P.mods.skillDamage += 0.05; }
  if(t.body_1) { P.maxHp += 120; P.def += 8; }
  if(t.luck_1) { P.mods.dropRate += 0.1; P.mods.goldBonus += 0.1; }
  if(t.dao_1) { P.mods.xpBonus += 0.12; P.mods.cooldownReduction += 0.05; }
}

function applySkillEvolutionBonuses() {
  const ev = P.skillEvolutions || {};
  if(ev.swordfly) P.mods.skillDamage += 0.12;
  if(ev.thunder) P.mods.critChance += 0.08;
  if(ev.hailstorm) P.mods.cooldownReduction += 0.08;
}

function realmText(){
  const r = getRealm(P.realm);
  if(r.stages<=1) return r.name;
  const stageLabels = ['初期','初期','初期','中期','中期','中期','后期','后期','圆满'];
  const idx = Math.min(P.stage-1, stageLabels.length-1);
  return r.name + ' ' + stageLabels[idx];
}

function refreshSkills(){
  if(!P.skillLevels) P.skillLevels = {};
  P.skills = [];
  for(const sk of SKILL_DEFS){
    if(!P.skillLevels[sk.id]) P.skillLevels[sk.id] = 1;
    P.skills.push(sk.id);
  }
}

function initHotbar(){
  P.hotbar = [];
  const current = P.hotbar?.[0];
  P.hotbar.push({ kind:'skill', id:'swordfly' });
  const swaps = SKILL_DEFS.filter(s => s.id !== 'swordfly');
  const slotKeys = ['W','E','R','T'];
  for(let i=0;i<4;i++){
    const existing = P.hotbar?.[i+1];
    if(existing && existing.id && swaps.some(s => s.id === existing.id)){
      P.hotbar.push(existing);
    } else {
      const defaults = ['earthmove','firedomain','thunder','hailstorm'];
      P.hotbar.push({ kind:'skill', id:defaults[i] || swaps[i]?.id || null });
    }
  }
}

/* ---- 成就（条件从 data.json 的结构化描述解释执行） ---- */
function checkAchievementCondition(cond, p) {
  if (!cond) return false;
  switch (cond.type) {
    case 'kills': return p.kills >= (cond.value || 0);
    case 'level': return p.level >= (cond.value || 0);
    case 'realmIndex': return getRealmIndex(p.realm) >= (cond.value || 0);
    case 'goldEarned': return (p.totalGoldEarned || 0) >= (cond.value || 0);
    case 'legendaryFound': return !!p.legendaryFound;
    case 'maxWave': return (p.maxWave || 0) >= (cond.value || 0);
    case 'playtime': return (p.totalPlayTime || 0) >= (cond.value || 0);
    default: return false;
  }
}

function checkAchievements(){
  let changed = false;
  for(const a of ACHIEVEMENTS){
    if(P.achievements[a.id]) continue;
    if(!checkAchievementCondition(a.condition, P)) continue;
    P.achievements[a.id] = true;
    changed = true;
    if(a.reward.gold){ P.gold = Math.min(99999, P.gold + a.reward.gold); P.totalGoldEarned = (P.totalGoldEarned || 0) + a.reward.gold; }
    if(a.reward.attrPoints) P.attrPoints = (P.attrPoints || 0) + a.reward.attrPoints;
    if(a.reward.skillPoints) P.skillPoints = (P.skillPoints || 0) + a.reward.skillPoints;
    bus.emit('status', '🏅 成就达成: ' + a.name, 3);
    bus.emit('save');
  }
  if(changed){ bus.emit('hud-refresh'); }
}

bus.on('check-achievements', checkAchievements);

/* ---- 境界 / 突破 / 打坐 ---- */
function tryBreakthrough(){
  if(P.realm==='feisheng'){ bus.emit('status','已至飞升，大道已成！',2); return; }
  const idx = getRealmIndex(P.realm);
  const r = REALMS[idx];
  if(P.stage < r.stages){ bus.emit('status','境界尚未圆满，继续修炼',1.5); return; }
  if(P.kills < r.reqKills){ bus.emit('status','杀敌不足 ('+P.kills+'/'+r.reqKills+')',1.5); return; }
  const btCost = 50 * (idx+1) * (idx+1);
  if(P.gold < btCost){ bus.emit('status','灵石不足 需要'+btCost,1.5); return; }
  const next = REALMS[idx+1];
  if(!next) return;
  const chance = Math.min(90, 50 + idx*5);
  document.getElementById('btTitle').textContent = '突破至 ' + next.name + '!';
  document.getElementById('btDesc').textContent = '天劫将至，引雷淬体！ 消耗 '+btCost+' 灵石';
  document.getElementById('btChance').textContent = chance + '%';
  document.getElementById('btChance').style.color = chance>=70 ? 'var(--gold)' : 'var(--hp)';
  document.getElementById('breakthrough-box').classList.remove('hidden');
  document.getElementById('breakthrough-overlay').classList.add('show');
  setBreakPending(true);
}

function doBreakthrough(){
  if(!breakPending) return;
  const idx = getRealmIndex(P.realm);
  const next = REALMS[idx+1];
  if(!next) return;
  const btCost = 50 * (idx+1) * (idx+1);
  if(P.gold < btCost){ bus.emit('status','灵石不足',1.2); cancelBreakthrough(); return; }
  P.gold -= btCost;
  const chance = Math.min(90, 50 + idx*5);
  const roll = Math.random()*100;
  if(roll < chance){
    P.realm = next.id;
    P.stage = 1;
    P.hp = P.maxHp;
    refreshSkills();
    initHotbar();
    bus.emit('status','🎉 突破成功！踏入 ' + next.name, 3);
    const sc = getScene();
    if(sc && sc.doLightningEffect) sc.doLightningEffect(true);
  } else {
    bus.emit('status','💥 突破失败！天雷反噬', 2);
    P.hp = Math.max(1, P.hp - P.maxHp*0.3);
    const sc = getScene();
    if(sc && sc.doLightningEffect) sc.doLightningEffect(false);
  }
  cancelBreakthrough();
  recalcStats();
  bus.emit('hud-refresh');
  bus.emit('save');
}

function cancelBreakthrough(){
  document.getElementById('breakthrough-box').classList.add('hidden');
  document.getElementById('breakthrough-overlay').classList.remove('show');
  setBreakPending(false);
}

function toggleCultivate(){
  const newVal = !isCultivating;
  setIsCultivating(newVal);
  bus.emit('status', newVal ? '🧘 打坐修炼中...' : '停止修炼', newVal ? 2 : 1);
}

/* ---- 装备生成与穿戴 ---- */
const RARITY_ORDER = ['common','uncommon','rare','epic','legendary','mythic'];
const SET_IDS = ['sword', 'thunder', 'body'];

function genEquipment(monsterLv, forceRarity=null){
  const rarityRoll = Math.random();
  let rarity;
  if(forceRarity) rarity = forceRarity;
  else if(monsterLv>=15 && rarityRoll<0.02) rarity = 'mythic';
  else if(monsterLv>=10 && rarityRoll<0.06) rarity = 'legendary';
  else if(monsterLv>=7 && rarityRoll<0.15) rarity = 'epic';
  else if(monsterLv>=4 && rarityRoll<0.35) rarity = 'rare';
  else if(monsterLv>=2 && rarityRoll<0.65) rarity = 'uncommon';
  else rarity = 'common';

  const type = EQ_TYPES[Math.floor(Math.random()*EQ_TYPES.length)];
  const base = EQ_BASES[type];
  const mult = RARITY_MULT[rarity];
  const stats = {};
  for(const [key,range] of Object.entries(base)){
    if(range[1]<=0) continue;
    const val = Math.max(1, Math.round((range[0] + Math.random()*(range[1]-range[0])) * mult * (0.8 + Math.random()*0.4)));
    stats[key] = val;
  }
  const prefix = EQ_PREFIXES[rarity] || '';
  const nameList = EQ_NAME_POOLS[type] || [];
  const idx = Math.min(RARITY_ORDER.indexOf(rarity), nameList.length-1);
  const itemName = prefix + (nameList[idx] || '无名');
  const setId = RARITY_ORDER.indexOf(rarity) >= 2 ? SET_IDS[Math.floor(Math.random() * SET_IDS.length)] : null;
  return { id:Date.now()+'_'+Math.random().toString(36).slice(2,6), type, name:itemName, rarity, stats, enhance:0, affixes:[], setId };
}

function getEffectiveEquipmentStats(item) {
  const result = {};
  if (!item?.stats) return result;
  const enhance = Math.max(0, item.enhance || 0);
  const mult = 1 + enhance * 0.08;
  for (const [key, value] of Object.entries(item.stats)) {
    result[key] = Math.max(1, Math.round(value * mult));
  }
  return result;
}

function getEquipmentScore(item){
  if(!item || !item.type || !item.stats) return Number.NEGATIVE_INFINITY;
  const base = EQ_BASES[item.type];
  if(!base) return Number.NEGATIVE_INFINITY;
  let score = 0;
  for(const [key, range] of Object.entries(base)){
    if(range[1] <= 0) continue;
    const effective = getEffectiveEquipmentStats(item);
    score += (effective[key] || 0) / Math.max(1, range[1]);
  }
  const rarityIdx = Math.max(0, RARITY_ORDER.indexOf(item.rarity));
  return score + rarityIdx * 0.01;
}

function isBetterEquipment(candidate, current){
  if(!candidate) return false;
  if(!current) return true;
  if(candidate.type !== current.type) return false;
  const candidateScore = getEquipmentScore(candidate);
  const currentScore = getEquipmentScore(current);
  if(candidateScore !== currentScore) return candidateScore > currentScore;
  return String(candidate.id || '') > String(current.id || '');
}

function autoEquipBestEquipment(playerState){
  if(!playerState) return false;
  if(!playerState.equipment) playerState.equipment = {};
  if(!Array.isArray(playerState.inventory)) playerState.inventory = [];

  const nextEquipment = { ...playerState.equipment };
  const nextInventory = [];

  for(const item of playerState.inventory){
    if(!item || !EQ_TYPES.includes(item.type)){
      nextInventory.push(item);
      continue;
    }
    const current = nextEquipment[item.type];
    if(isBetterEquipment(item, current)){
      if(current) nextInventory.push(current);
      nextEquipment[item.type] = item;
    } else {
      nextInventory.push(item);
    }
  }

  let changed = false;
  for(const slot of EQ_TYPES){
    if((playerState.equipment?.[slot]?.id || null) !== (nextEquipment[slot]?.id || null)){
      changed = true;
      break;
    }
  }
  if(!changed && playerState.inventory.length !== nextInventory.length) changed = true;

  playerState.equipment = nextEquipment;
  playerState.inventory = nextInventory;
  return changed;
}

function acquireEquipment(playerState, item){
  if(!item || !EQ_TYPES.includes(item.type)) return { stored:false, equipped:false, changed:false };
  if(!playerState.equipment) playerState.equipment = {};
  if(!Array.isArray(playerState.inventory)) playerState.inventory = [];

  const roomInBag = playerState.inventory.length < 30;
  if(!roomInBag){
    if(!playerState.equipment[item.type]){
      playerState.equipment[item.type] = item;
      return { stored:true, equipped:true, changed:true };
    }
    return { stored:false, equipped:false, changed:false };
  }

  playerState.inventory.push(item);
  const changed = autoEquipBestEquipment(playerState);
  return {
    stored:true,
    equipped: playerState.equipment?.[item.type]?.id === item.id,
    changed
  };
}

/* ---- 进度规则：材料、强化、炼丹、任务、天赋、技能进阶、秘境、图鉴 ---- */
function ensureProgressionState() {
  if(!P.materials) P.materials = { ore:0, herb:0, core:0, dust:0 };
  for(const key of Object.keys(MATERIALS)) if(P.materials[key] == null) P.materials[key] = 0;
  if(!P.bestiary) P.bestiary = {};
  if(!Array.isArray(P.quests)) P.quests = [];
  if(!P.talents) P.talents = {};
  if(!P.skillEvolutions) P.skillEvolutions = {};
  if(!P.dungeon) P.dungeon = { active:false, kills:0, target:0 };
  if(P.talentPoints == null) P.talentPoints = 0;
  if(P.quests.length === 0) resetQuests();
}

function addMaterial(id, amount = 1) {
  ensureProgressionState();
  P.materials[id] = (P.materials[id] || 0) + amount;
}

function canPay(cost) {
  ensureProgressionState();
  return Object.entries(cost || {}).every(([id, amount]) => (P.materials[id] || 0) >= amount);
}

function pay(cost) {
  if(!canPay(cost)) return false;
  for(const [id, amount] of Object.entries(cost || {})) P.materials[id] -= amount;
  return true;
}

function enhanceEquipped(slot) {
  ensureProgressionState();
  const eq = P.equipment?.[slot];
  if(!eq) { bus.emit('status', '该部位没有装备', 1.2); return false; }
  const lv = eq.enhance || 0;
  const cost = { ore: 2 + lv, dust: Math.floor(lv / 3) };
  const goldCost = 30 + lv * 18;
  if(P.gold < goldCost || !canPay(cost)) { bus.emit('status', '强化材料不足', 1.5); return false; }
  P.gold -= goldCost;
  pay(cost);
  eq.enhance = lv + 1;
  recalcStats();
  bus.emit('status', eq.name + ' 强化至 +' + eq.enhance, 1.5);
  bus.emit('hud-refresh');
  bus.emit('save');
  return true;
}

function reforgeEquipped(slot) {
  ensureProgressionState();
  const eq = P.equipment?.[slot];
  if(!eq) { bus.emit('status', '该部位没有装备', 1.2); return false; }
  const cost = { dust:2, core:1 };
  if(P.gold < 80 || !canPay(cost)) { bus.emit('status', '洗炼材料不足', 1.5); return false; }
  P.gold -= 80;
  pay(cost);
  const tpl = AFFIXES[Math.floor(Math.random() * AFFIXES.length)];
  const value = +(tpl.min + Math.random() * (tpl.max - tpl.min)).toFixed(3);
  eq.affixes = [{ key:tpl.key, name:tpl.name, value }];
  recalcStats();
  bus.emit('status', eq.name + ' 获得词条: ' + tpl.name, 1.8);
  bus.emit('hud-refresh');
  bus.emit('save');
  return true;
}

function craftRecipe(recipeId) {
  ensureProgressionState();
  const recipe = RECIPES.find(r => r.id === recipeId);
  if(!recipe || !pay(recipe.cost)) { bus.emit('status', '炼丹材料不足', 1.5); return false; }
  if(recipe.id === 'heal') P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.35);
  if(recipe.id === 'xp') {
    P.xp += Math.max(10, P.xpToNext);
    applyLevelUps();
  }
  if(recipe.id === 'battle') P.skillPoints = (P.skillPoints || 0) + 1;
  bus.emit('status', '炼成 ' + recipe.name, 1.5);
  bus.emit('hud-refresh');
  bus.emit('save');
  return true;
}

function applyLevelUps() {
  while(P.xp >= P.xpToNext) {
    P.xp -= P.xpToNext;
    P.level += 1;
    P.attrPoints = (P.attrPoints || 0) + 3;
    P.skillPoints = (P.skillPoints || 0) + 1;
    P.xpToNext = Math.round(10 * Math.pow(1.15, P.level - 1));
  }
  recalcStats();
}

function resetQuests() {
  P.quests = QUEST_POOL.map(q => ({ ...q, progress:0, done:false, claimed:false }));
  bus.emit('save');
}

function claimQuest(questId) {
  ensureProgressionState();
  const q = P.quests.find(item => item.id === questId);
  if(!q || q.claimed || q.progress < q.target) { bus.emit('status', '任务尚未完成', 1.2); return false; }
  q.claimed = true;
  P.gold = Math.min(99999, P.gold + (q.reward.gold || 0));
  if(q.reward.talentPoints) P.talentPoints = (P.talentPoints || 0) + q.reward.talentPoints;
  for(const [id, amount] of Object.entries(q.reward.materials || {})) addMaterial(id, amount);
  bus.emit('status', '领取任务奖励: ' + q.name, 1.5);
  bus.emit('hud-refresh');
  bus.emit('save');
  return true;
}

function learnTalent(talentId) {
  ensureProgressionState();
  const t = TALENTS.find(item => item.id === talentId);
  if(!t || P.talents[talentId]) return false;
  if((P.talentPoints || 0) < t.cost) { bus.emit('status', '天赋点不足', 1.2); return false; }
  P.talentPoints -= t.cost;
  P.talents[talentId] = true;
  recalcStats();
  bus.emit('status', '领悟天赋: ' + t.name, 1.5);
  bus.emit('hud-refresh');
  bus.emit('save');
  return true;
}

function evolveSkill(skillId) {
  ensureProgressionState();
  const ev = SKILL_EVOLUTIONS.find(item => item.id === skillId);
  if(!ev || P.skillEvolutions[skillId]) return false;
  if(!pay(ev.cost)) { bus.emit('status', '进阶材料不足', 1.5); return false; }
  P.skillEvolutions[skillId] = true;
  recalcStats();
  bus.emit('status', '技能进阶: ' + ev.name, 1.8);
  bus.emit('hotbar-refresh');
  bus.emit('save');
  return true;
}

function startDungeon() {
  ensureProgressionState();
  const scene = getScene();
  if(!scene || P.dungeon.active) { bus.emit('status', '秘境正在进行中', 1.2); return false; }
  P.dungeon = { active:true, kills:0, target:18 };
  scene.clearEnemies();
  const x = scene.worldSize / 2 + 1300;
  const y = scene.worldSize / 2;
  scene.player.setPosition(x, y);
  scene.moveTarget.set(x, y);
  for(let i = 0; i < 14; i++) {
    const en = scene.spawnSystem.spawnEnemy({ forceElite:i % 4 === 0, allowBoss:false });
    placeNearPlayer(scene, en);
  }
  const boss = scene.spawnSystem.spawnEnemy({ forceBoss:true, allowBoss:false, allowElite:false });
  if(boss) {
    placeNearPlayer(scene, boss);
    boss.setScale(1.35);
  }
  bus.emit('status', '秘境开启：击杀18只妖兽可结算', 3);
  bus.emit('save');
  return true;
}

function placeNearPlayer(scene, en) {
  if(!en) return;
  const angle = Math.random() * Math.PI * 2;
  const dist = Phaser.Math.Between(260, 620);
  en.x = Phaser.Math.Clamp(scene.player.x + Math.cos(angle) * dist, 40, scene.worldSize - 40);
  en.y = Phaser.Math.Clamp(scene.player.y + Math.sin(angle) * dist, 40, scene.worldSize - 40);
}

function recordEnemyKill(enemy) {
  ensureProgressionState();
  const name = enemy.getData('name') || '未知妖兽';
  const isBoss = !!enemy.getData('isBoss');
  const zoneLv = enemy.getData('zoneLv') || 1;
  const entry = P.bestiary[name] || { kills:0, rewardClaimed:false };
  entry.kills++;
  P.bestiary[name] = entry;

  addKillMaterials(zoneLv, isBoss);
  for(const q of P.quests) {
    if(q.claimed) continue;
    if(q.type === 'kill' || (q.type === 'boss' && isBoss)) {
      q.progress = Math.min(q.target, (q.progress || 0) + 1);
      if(q.progress >= q.target) q.done = true;
    }
  }

  if(P.dungeon?.active) {
    P.dungeon.kills = Math.min(P.dungeon.target, (P.dungeon.kills || 0) + 1);
    if(P.dungeon.kills >= P.dungeon.target) completeDungeon();
  }
}

function addKillMaterials(zoneLv, isBoss) {
  const dropBoost = 1 + (P.mods?.dropRate || 0);
  if(Math.random() < 0.55 * dropBoost) addMaterial('ore', 1 + Math.floor(zoneLv / 8));
  if(Math.random() < 0.38 * dropBoost) addMaterial('herb', 1);
  if(isBoss || Math.random() < 0.16 * dropBoost) addMaterial('core', isBoss ? 2 : 1);
  if(isBoss || Math.random() < 0.08 * dropBoost) addMaterial('dust', 1);
}

function completeDungeon() {
  P.dungeon.active = false;
  addMaterial('core', 4);
  addMaterial('dust', 3);
  P.gold = Math.min(99999, P.gold + 380);
  P.talentPoints = (P.talentPoints || 0) + 1;
  bus.emit('status', '秘境完成！获得妖核、星尘和1点天赋', 3);
  bus.emit('hud-refresh');
  bus.emit('save');
}

function claimBestiaryReward(name) {
  ensureProgressionState();
  const entry = P.bestiary[name];
  if(!entry || entry.rewardClaimed || entry.kills < 10) { bus.emit('status', '图鉴击杀数不足', 1.2); return false; }
  entry.rewardClaimed = true;
  P.attrPoints = (P.attrPoints || 0) + 1;
  addMaterial('dust', 1);
  bus.emit('status', '图鉴奖励: 属性点+1 星尘+1', 1.5);
  bus.emit('hud-refresh');
  bus.emit('save');
  return true;
}

function formatCost(cost) {
  return Object.entries(cost || {}).map(([id, amount]) => MATERIALS[id] + 'x' + amount).join(' ');
}

function formatAffix(affix) {
  if(!affix) return '';
  return affix.name + '+' + Math.round(affix.value * 100) + '%';
}

function getSetName(item) {
  return item?.setId ? (SET_LABELS[item.setId] || item.setId) : '';
}

/* ============================================================================
 * 区块 4：存档、读档、导入、导出和 v1 兼容
 * ========================================================================== */
const SAVE_THROTTLE_MS = 1500;
let savePending = false;
let saveTimer = null;
let lastSaveAt = 0;

function buildSaveData() {
  return {
    P: { hp: P.hp, maxHp: P.maxHp, atk: P.atk, def: P.def, speed: P.speed,
         realm: P.realm, stage: P.stage, level: P.level, xp: P.xp, xpToNext: P.xpToNext,
         gold: P.gold, kills: P.kills, attrPoints: P.attrPoints, skillPoints: P.skillPoints,
         attrs: P.attrs, skillLevels: P.skillLevels, skills: P.skills, hotbar: P.hotbar,
         equipment: P.equipment, inventory: P.inventory, totalPlayTime: P.totalPlayTime,
         totalGoldEarned: P.totalGoldEarned, legendaryFound: P.legendaryFound, maxWave: P.maxWave,
         achievements: P.achievements, materials: P.materials, bestiary: P.bestiary,
         quests: P.quests, talents: P.talents, talentPoints: P.talentPoints,
         skillEvolutions: P.skillEvolutions, dungeon: P.dungeon },
    wave: waveNum,
    version: 1
  };
}

function saveGame({ notify = false } = {}) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildSaveData()));
    lastSaveAt = Date.now();
    savePending = false;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (notify) {
      const n = getEl('saveNotif');
      if (n) {
        n.style.opacity = '1';
        setTimeout(() => n.style.opacity = '0', 1200);
      }
    }
  } catch (e) {}
}

function requestSave() {
  savePending = true;
  const wait = Math.max(0, SAVE_THROTTLE_MS - (Date.now() - lastSaveAt));
  if (wait === 0) {
    saveGame();
    return;
  }
  if (!saveTimer) {
    saveTimer = setTimeout(() => saveGame(), wait);
  }
}

function flushPendingSave() {
  if (savePending) saveGame();
}

function exportSaveData() {
  try {
    const json = JSON.stringify(buildSaveData(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xiuxian_save_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    bus.emit('status', '📤 存档已导出', 1.5);
  } catch (e) { bus.emit('status', '导出失败', 1.5); }
}

function importSaveData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.version !== 1) { bus.emit('status', '存档版本不兼容', 2); return; }
        applySaveData(data);
        bus.emit('status', '📥 存档已导入', 2);
        bus.emit('hud-refresh');
        bus.emit('hotbar-refresh');
      } catch (e) { bus.emit('status', '导入失败: 文件格式错误', 2); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetGameData() {
  if (!confirm('确定要清除所有存档并重置游戏？此操作不可撤销。')) return;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

function toggleSettingsPanel() {
  const el = getEl('settingsPanel');
  el.classList.toggle('hidden');
}

function manualSave() {
  saveGame({ notify: true });
  bus.emit('status', '💾 已保存', 1);
}

/** 将旧存档字段补全到当前默认结构；缺失字段/非法数值一律回退，不让坏存档阻止启动 */
function applySaveData(data) {
  Object.assign(P, data.P);
  if (!P.attrs) P.attrs = { str: 0, body: 0, spirit: 0, agility: 0 };
  if (P.attrPoints == null) P.attrPoints = 0;
  if (P.skillPoints == null) P.skillPoints = 0;
  if (!P.skillLevels) P.skillLevels = {};
  if (P.totalGoldEarned == null) P.totalGoldEarned = 0;
  if (P.legendaryFound == null) P.legendaryFound = false;
  if (P.maxWave == null) P.maxWave = 0;
  if (!P.achievements) P.achievements = {};
  ensureProgressionState();
  for (const sk of SKILL_DEFS) {
    if (!P.skillLevels[sk.id]) P.skillLevels[sk.id] = 1;
  }
  refreshSkills();
  initHotbar();
  autoEquipBestEquipment(P);
  setWaveNum(data.wave || 0);
  recalcStats();
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 1) return false;
    applySaveData(data);
    return true;
  } catch (e) { return false; }
}

bus.on('save', requestSave);
window.addEventListener('pagehide', flushPendingSave);

/* ============================================================================
 * 区块 5：Phaser 配置、MainScene、纹理、实体生成、移动、AI、波次、战斗和技能
 * ========================================================================== */

/* ---- Phaser 配置 ---- */
function createGameConfig(canvas) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    type: Phaser.CANVAS,
    renderType: Phaser.CANVAS,
    canvas,
    width,
    height,
    backgroundColor: '#efe3c0',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    scene: [MainScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height
    }
  };
}

/* ---- 代码生成纹理（玩家/怪物/弹丸/地面），无外部图片资源 ---- */
const SWORD_FLY_TEXTURE = 'swordFlySvg';
const FIREDOMAIN_SWORD_TEXTURE = 'firedomainSword';

function createGeneratedTextures(scene) {
  const g = scene.make.graphics({ add: false });

  drawPlayerOrb(g);
  drawMonsterOrb(g, 'monster-rabbit', 0xf6f8ff, 0x93d8ff, drawRabbitMark);
  drawMonsterOrb(g, 'monster-wolf', 0x7d8a69, 0xd8e5b8, drawWolfMark);
  drawMonsterOrb(g, 'monster-spider', 0x2c3328, 0x9dff66, drawSpiderMark);
  drawMonsterOrb(g, 'monster-golem', 0x777a75, 0xd9d2bb, drawGolemMark);
  drawMonsterOrb(g, 'monster-ice-spirit', 0x86d8ff, 0xffffff, drawIceMark);
  drawMonsterOrb(g, 'monster-fire-demon', 0xff6a35, 0xffffaa, drawFireMark);
  drawMonsterOrb(g, 'monster-serpent', 0x55a866, 0xd8ffd8, drawSerpentMark);
  drawMonsterOrb(g, 'monster-shadow', 0x553377, 0xff88e8, drawShadowMark);
  drawMonsterOrb(g, 'monster-ghost', 0xbfd6ff, 0x223355, drawGhostMark);
  drawMonsterOrb(g, 'monster-sword-spirit', 0x9ddcff, 0xffffff, drawSwordMark);
  drawMonsterOrb(g, 'monster-sword-golem', 0x728aa0, 0xe8f7ff, drawSwordGolemMark);
  drawMonsterOrb(g, 'monster-thunder-beast', 0xd0a63a, 0xffffbb, drawThunderBeastMark);
  drawMonsterOrb(g, 'monster-thunder-spirit', 0xffdd44, 0xffffff, drawThunderMark);
  drawMonsterOrb(g, 'monster-dragon', 0xaa7f25, 0xffe080, drawDragonMark);
  drawMonsterOrb(g, 'monster-boss', 0x5b247a, 0xffdd44, drawBossMark, 42);

  drawLegacyFallbacks(g);
  drawProjectiles(g);
  queueSwordFlySvg(scene);
  queueFiredomainSwordSvg(scene);
  g.destroy();
}

function drawOrbBase(g, cx, cy, r, fill, glow) {
  g.fillStyle(glow, 0.28); g.fillCircle(cx, cy, r + 5);
  g.fillStyle(fill, 1); g.fillCircle(cx, cy, r);
  g.fillStyle(0xffffff, 0.18); g.fillCircle(cx - r * 0.32, cy - r * 0.36, r * 0.34);
  g.lineStyle(2, glow, 0.75); g.strokeCircle(cx, cy, r - 1);
  g.lineStyle(1, 0xffffff, 0.28); g.strokeCircle(cx, cy, r - 5);
}

function drawPlayerOrb(g) {
  drawOrbBase(g, 22, 22, 17, 0x5fcf88, 0xdfffd8);
  g.fillStyle(0x2b2118, 1); g.fillCircle(22, 14, 5);
  g.fillStyle(0xf3d3a4, 1); g.fillCircle(22, 17, 5);
  g.fillStyle(0x2b2118, 1); g.fillRect(17, 11, 10, 3);
  g.fillStyle(0xdff7c9, 1); g.fillTriangle(22, 21, 14, 34, 30, 34);
  g.fillStyle(0x2f7a58, 1); g.fillRect(16, 26, 12, 3);
  g.lineStyle(2, 0xe8ffff, 0.95); g.lineBetween(28, 16, 34, 9);
  g.fillStyle(0xffffff, 0.9); g.fillTriangle(34, 9, 31, 13, 33, 14);
  g.generateTexture('player', 44, 44); g.clear();
}

function drawMonsterOrb(g, key, fill, glow, drawMark, size = 36) {
  const c = size / 2;
  drawOrbBase(g, c, c, size * 0.38, fill, glow);
  drawMark(g, c, c, size, glow);
  g.generateTexture(key, size, size);
  g.clear();
}

function drawRabbitMark(g, c) {
  g.fillStyle(0xffffff, 0.95); g.fillEllipse(c - 4, c - 8, 4, 12); g.fillEllipse(c + 4, c - 8, 4, 12);
  g.fillStyle(0xf5b2bd, 1); g.fillCircle(c, c + 3, 3);
  g.fillStyle(0x5a6a80, 1); g.fillCircle(c - 5, c, 1.5); g.fillCircle(c + 5, c, 1.5);
}

function drawWolfMark(g, c) {
  g.fillStyle(0x2f352b, 1); g.fillTriangle(c, c - 10, c - 10, c + 8, c + 10, c + 8);
  g.fillStyle(0x5f6f50, 1); g.fillTriangle(c - 7, c - 4, c - 12, c - 12, c - 3, c - 8);
  g.fillTriangle(c + 7, c - 4, c + 12, c - 12, c + 3, c - 8);
  g.fillStyle(0xffdd66, 1); g.fillCircle(c - 4, c, 1.5); g.fillCircle(c + 4, c, 1.5);
}

function drawSpiderMark(g, c) {
  g.lineStyle(2, 0x101410, 1);
  for (let i = -1; i <= 1; i++) {
    g.lineBetween(c - 4, c + i * 4, c - 12, c + i * 6);
    g.lineBetween(c + 4, c + i * 4, c + 12, c + i * 6);
  }
  g.fillStyle(0x101410, 1); g.fillEllipse(c, c, 13, 11);
  g.fillStyle(0x9dff66, 1); g.fillCircle(c - 3, c - 2, 1.5); g.fillCircle(c + 3, c - 2, 1.5);
}

function drawGolemMark(g, c) {
  g.fillStyle(0x4d504b, 1); g.fillRect(c - 8, c - 7, 16, 15);
  g.fillStyle(0x9ea29a, 1); g.fillRect(c - 5, c - 13, 10, 7);
  g.lineStyle(1, 0xd9d2bb, 0.8); g.lineBetween(c - 7, c, c + 8, c - 4); g.lineBetween(c - 3, c - 7, c + 5, c + 8);
}

function drawIceMark(g, c) {
  g.fillStyle(0xffffff, 0.95); g.fillTriangle(c, c - 13, c - 8, c + 5, c + 8, c + 5);
  g.lineStyle(2, 0xe8fbff, 0.9); g.lineBetween(c, c - 11, c, c + 12); g.lineBetween(c - 9, c, c + 9, c);
}

function drawFireMark(g, c) {
  g.fillStyle(0xffdd66, 1); g.fillTriangle(c, c - 13, c - 9, c + 10, c + 9, c + 10);
  g.fillStyle(0xff5533, 1); g.fillTriangle(c, c - 5, c - 5, c + 10, c + 5, c + 10);
}

function drawSerpentMark(g, c) {
  g.lineStyle(4, 0xd8ffd8, 1); g.beginPath(); g.moveTo(c - 10, c + 8); g.lineTo(c - 4, c); g.lineTo(c + 3, c + 4); g.lineTo(c + 10, c - 7); g.strokePath();
  g.fillStyle(0x1d4f2b, 1); g.fillCircle(c + 10, c - 7, 4);
}

function drawShadowMark(g, c) {
  g.fillStyle(0x201029, 1); g.fillTriangle(c, c - 13, c - 10, c + 11, c + 10, c + 11);
  g.fillStyle(0xff88e8, 1); g.fillCircle(c - 4, c, 2); g.fillCircle(c + 4, c, 2);
}

function drawGhostMark(g, c) {
  g.fillStyle(0xffffff, 0.82); g.fillEllipse(c, c - 1, 16, 20);
  g.fillTriangle(c - 8, c + 7, c - 8, c + 14, c - 3, c + 9);
  g.fillTriangle(c - 2, c + 8, c + 2, c + 15, c + 5, c + 8);
  g.fillTriangle(c + 5, c + 8, c + 9, c + 14, c + 9, c + 7);
  g.fillStyle(0x223355, 1); g.fillCircle(c - 4, c - 3, 2); g.fillCircle(c + 4, c - 3, 2);
}

function drawSwordMark(g, c) {
  g.fillStyle(0xffffff, 1); g.fillTriangle(c, c - 13, c - 5, c + 5, c + 5, c + 5);
  g.fillStyle(0x446688, 1); g.fillRect(c - 2, c + 4, 4, 10); g.fillRect(c - 8, c + 10, 16, 2);
}

function drawSwordGolemMark(g, c) {
  drawGolemMark(g, c);
  g.fillStyle(0xe8f7ff, 1); g.fillTriangle(c + 8, c - 12, c + 5, c + 5, c + 12, c + 5);
}

function drawThunderBeastMark(g, c) {
  drawWolfMark(g, c);
  g.fillStyle(0xffffaa, 1); g.fillTriangle(c, c - 14, c - 3, c - 2, c + 3, c - 2);
  g.fillTriangle(c - 1, c - 2, c + 5, c - 2, c - 4, c + 11);
}

function drawThunderMark(g, c) {
  g.fillStyle(0xffffff, 1); g.fillTriangle(c + 2, c - 14, c - 8, c + 2, c, c + 2);
  g.fillTriangle(c - 1, c, c + 8, c, c - 5, c + 14);
}

function drawDragonMark(g, c) {
  g.lineStyle(4, 0xffe080, 1); g.beginPath(); g.moveTo(c - 11, c + 8); g.lineTo(c - 4, c); g.lineTo(c + 4, c + 4); g.lineTo(c + 11, c - 7); g.strokePath();
  g.fillStyle(0x5c3512, 1); g.fillCircle(c + 11, c - 7, 5);
  g.fillStyle(0xffe080, 1); g.fillTriangle(c + 7, c - 10, c + 3, c - 15, c + 11, c - 12);
}

function drawBossMark(g, c) {
  g.fillStyle(0x2b1238, 1); g.fillTriangle(c, c - 14, c - 12, c + 13, c + 12, c + 13);
  g.fillStyle(0xffdd44, 1); g.fillTriangle(c - 8, c - 6, c - 16, c - 15, c - 10, c + 2);
  g.fillTriangle(c + 8, c - 6, c + 16, c - 15, c + 10, c + 2);
  g.fillStyle(0xff5533, 1); g.fillCircle(c - 4, c, 2); g.fillCircle(c + 4, c, 2);
}

function drawLegacyFallbacks(g) {
  drawMonsterOrb(g, 'beast', 0xff5544, 0xffccaa, drawWolfMark, 28);
  drawMonsterOrb(g, 'elite', 0xffaa44, 0xffffaa, drawThunderMark, 30);
  drawMonsterOrb(g, 'boss', 0x5b247a, 0xffdd44, drawBossMark, 42);
}

function drawProjectiles(g) {
  g.fillStyle(0x8b5a2b, 1); g.fillRect(0, 3, 18, 3); g.generateTexture('arrow', 18, 9); g.clear();
  g.fillStyle(0xff6633, 1); g.fillCircle(6, 6, 5); g.fillStyle(0xffaa66, 0.5); g.fillCircle(6, 6, 7);
  g.generateTexture('fireball', 14, 14); g.clear();
  g.fillStyle(0x99ddff, 1); g.fillRect(0, 3, 22, 4); g.fillStyle(0xccffff, 0.5); g.fillRect(0, 2, 22, 6);
  g.generateTexture('swordQi', 22, 10); g.clear();
  g.fillStyle(0x5aa6b1, 0.75); g.fillCircle(12, 12, 10); g.fillStyle(0xd8f2ef, 0.5); g.fillCircle(12, 12, 14);
  g.generateTexture('water', 28, 28); g.clear();
  g.fillStyle(0x9fb884, 0.75); g.fillCircle(12, 12, 10); g.fillStyle(0xf5f0d8, 0.55); g.fillCircle(12, 12, 15);
  g.generateTexture('wind', 30, 30); g.clear();
  g.fillStyle(0xffee88, 1); g.fillRect(1, 0, 5, 20); g.fillStyle(0xffffcc, 0.5); g.fillRect(0, 0, 7, 20);
  g.generateTexture('bolt', 7, 20); g.clear();
  g.fillStyle(0x65c8ff, 1); g.fillCircle(5, 5, 4); g.generateTexture('loot', 10, 10); g.clear();
}

function queueSwordFlySvg(scene) {
  if (!scene?.textures) return;
  if (typeof scene.textures.addBase64 !== 'function') return;
  if (scene?.textures?.exists?.(SWORD_FLY_TEXTURE)) return;
  const svg = [
    "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='30' viewBox='0 0 96 30'>",
    "<defs>",
    "<linearGradient id='sf_blade' x1='0' y1='0' x2='1' y2='1'>",
    "<stop offset='0%' stop-color='#f9fdff'/>",
    "<stop offset='62%' stop-color='#b8d8ff'/>",
    "<stop offset='100%' stop-color='#6c98d3'/>",
    "</linearGradient>",
    "<linearGradient id='sf_edge' x1='0' y1='0.5' x2='1' y2='0.5'>",
    "<stop offset='0%' stop-color='#8fbfff'/>",
    "<stop offset='100%' stop-color='#ffffff'/>",
    "</linearGradient>",
    "<linearGradient id='sf_guard' x1='0' y1='0' x2='0' y2='1'>",
    "<stop offset='0%' stop-color='#d9ecff'/>",
    "<stop offset='100%' stop-color='#85abd5'/>",
    "</linearGradient>",
    "<radialGradient id='sf_aura' cx='0.54' cy='0.5' r='0.8'>",
    "<stop offset='0%' stop-color='#d7f2ff' stop-opacity='0.8'/>",
    "<stop offset='100%' stop-color='#71afff' stop-opacity='0'/>",
    "</radialGradient>",
    "</defs>",
    "<ellipse cx='54' cy='15' rx='44' ry='10' fill='url(#sf_aura)'/>",
    "<path d='M12 14 L63 10.5 L86 15 L63 19.5 L12 16 Z' fill='url(#sf_blade)' stroke='#ebf6ff' stroke-width='1.6' stroke-linejoin='round'/>",
    "<path d='M17 15 L61 13.8 L78 15 L61 16.2 Z' fill='url(#sf_edge)' opacity='0.9'/>",
    "<path d='M58 10.8 L67 15 L58 19.2 Z' fill='#ffffff' opacity='0.76'/>",
    "<rect x='8' y='11' width='6.5' height='8' rx='1.8' fill='url(#sf_guard)' stroke='#e8f5ff' stroke-width='1'/>",
    "<rect x='3.2' y='12.2' width='5' height='5.6' rx='1.3' fill='#eaf6ff' stroke='#c8e6ff' stroke-width='1'/>",
    "</svg>"
  ].join('');
  const base64 = (typeof btoa === 'function')
    ? btoa(svg)
    : (typeof Buffer !== 'undefined' ? Buffer.from(svg, 'utf8').toString('base64') : null);
  if (!base64) return;
  scene.textures.addBase64(SWORD_FLY_TEXTURE, 'data:image/svg+xml;base64,' + base64);
}

function queueFiredomainSwordSvg(scene) {
  if (!scene?.textures) return;
  if (typeof scene.textures.addBase64 !== 'function') return;
  if (scene?.textures?.exists?.(FIREDOMAIN_SWORD_TEXTURE)) return;
  const svg = [
    "<svg xmlns='http://www.w3.org/2000/svg' width='176' height='52' viewBox='0 0 176 52'>",
    "<defs>",
    "<linearGradient id='bladeFill' x1='0' y1='0' x2='1' y2='1'>",
    "<stop offset='0%' stop-color='#fdfefe'/>",
    "<stop offset='55%' stop-color='#c8dcff'/>",
    "<stop offset='100%' stop-color='#7a9fd4'/>",
    "</linearGradient>",
    "<linearGradient id='edgeGlow' x1='0' y1='0.5' x2='1' y2='0.5'>",
    "<stop offset='0%' stop-color='#9cc7ff'/>",
    "<stop offset='100%' stop-color='#ffffff'/>",
    "</linearGradient>",
    "<linearGradient id='guardFill' x1='0' y1='0' x2='0' y2='1'>",
    "<stop offset='0%' stop-color='#f9db85'/>",
    "<stop offset='100%' stop-color='#c78a31'/>",
    "</linearGradient>",
    "<linearGradient id='gripFill' x1='0' y1='0' x2='1' y2='1'>",
    "<stop offset='0%' stop-color='#7f5537'/>",
    "<stop offset='100%' stop-color='#5d3b25'/>",
    "</linearGradient>",
    "<radialGradient id='bladeAura' cx='0.54' cy='0.5' r='0.75'>",
    "<stop offset='0%' stop-color='#e2f4ff' stop-opacity='0.85'/>",
    "<stop offset='100%' stop-color='#89b7ff' stop-opacity='0'/>",
    "</radialGradient>",
    "</defs>",
    "<ellipse cx='96' cy='26' rx='82' ry='20' fill='url(#bladeAura)'/>",
    "<path d='M16 24 L116 18 L162 26 L116 34 L16 28 Z' fill='url(#bladeFill)' stroke='#edf6ff' stroke-width='2' stroke-linejoin='round'/>",
    "<path d='M24 26 L114 24 L148 26 L114 28 Z' fill='url(#edgeGlow)' opacity='0.9'/>",
    "<path d='M110 18 L126 26 L110 34 Z' fill='#ffffff' opacity='0.74'/>",
    "<rect x='8' y='20' width='12' height='12' rx='2.5' fill='url(#guardFill)' stroke='#fbe6ad' stroke-width='1.6'/>",
    "<path d='M2 22 L8 20 L8 32 L2 30 Z' fill='url(#guardFill)' stroke='#fbe6ad' stroke-width='1.4'/>",
    "<rect x='0.6' y='22.8' width='3.2' height='6.6' rx='1.4' fill='#fff5d4'/>",
    "<rect x='20' y='22' width='20' height='8' rx='3.5' fill='url(#gripFill)' stroke='#b48b67' stroke-width='1.2'/>",
    "<circle cx='44.2' cy='26' r='5.1' fill='#f2be5b' stroke='#fff0c2' stroke-width='1.4'/>",
    "<circle cx='44.2' cy='26' r='2.2' fill='#fff8da'/>",
    "</svg>"
  ].join('');
  const base64 = (typeof btoa === 'function')
    ? btoa(svg)
    : (typeof Buffer !== 'undefined' ? Buffer.from(svg, 'utf8').toString('base64') : null);
  if (!base64) return;
  scene.textures.addBase64(FIREDOMAIN_SWORD_TEXTURE, 'data:image/svg+xml;base64,' + base64);
}

/* ---- 系统类：AI / 移动 / 状态 / 波次 / 防御 / 缓冲 / 打坐进度 ---- */

class AISystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt, time, qRange, qR2) {
    const { scene } = this;
    scene.hpBarGfx.clear();
    let closestQ = null, bestQD2 = Infinity;
    const activeEnemies = [];

    scene.enemies.children.iterate((en) => {
      if (!en || en.getData('dead')) return;
      const dx = scene.player.x - en.x, dy = scene.player.y - en.y;
      const d2 = dx * dx + dy * dy;

      if (d2 < qR2 && d2 < bestQD2) { bestQD2 = d2; closestQ = en; }
      activeEnemies.push(en);

      const atkType = en.getData('atkType') || 'melee';
      const dist = Math.sqrt(d2);
      let speed = en.getData('speed') || 30;
      const freezeTimer = en.getData('freezeTimer') || 0;
      if (freezeTimer > 0) {
        en.setData('freezeTimer', Math.max(0, freezeTimer - dt));
        en.setVelocity(0, 0);
        en.setTint(0xbfefff);
        const lbl = en.getData('label'); if (lbl) lbl.setPosition(en.x, en.y - 16);
        return;
      } else if (en.tintTopLeft === 0xbfefff) {
        en.clearTint();
      }
      const slowTimer = en.getData('slowTimer') || 0;
      if (slowTimer > 0) {
        speed *= 0.45;
        en.setData('slowTimer', Math.max(0, slowTimer - dt));
      }

      if (atkType === 'ranged') {
        const atkRange = en.getData('atkRange') || 200;
        const atkCD = en.getData('atkCD') || 2.5;
        const lastAtk = en.getData('lastRangedAtk') || 0;
        if (dist < atkRange * 1.2 && time - lastAtk > atkCD) {
          en.setData('lastRangedAtk', time);
          scene.entityAnimationSystem?.playEnemyAttack(en);
          const proj = scene.getPooledProj(en.x, en.y, 'arrow', scene.enemyProjs);
          if (proj) {
            proj.setScale(0.7).setTint(en.getData('projColor') || 0xff4444);
            const angle = Phaser.Math.Angle.Between(en.x, en.y, scene.player.x, scene.player.y);
            scene.physics.velocityFromRotation(angle, 280, proj.body.velocity);
            proj.rotation = angle;
            proj.setData('damage', Math.round((en.getData('atk') || 5) * 0.6));
            scene.scheduleProjFree(proj, 2000);
          }
        }
        if (dist > atkRange) scene.physics.moveToObject(en, scene.player, speed * 0.7);
      } else {
        scene.physics.moveToObject(en, scene.player, speed);
      }

      const isBoss = en.getData('isBoss');
      if (isBoss) {
        const ultCD = en.getData('ultCD') || 8;
        const lastUlt = en.getData('lastUlt') || 0;
        if (time - lastUlt > ultCD && dist < 300) {
          const warning = en.getData('ultWarning');
          if (!warning || !warning.active) {
            en.setData('lastUlt', time);
            const w = scene.add.circle(scene.player.x, scene.player.y, 40, 0xff0000, 0)
              .setDepth(25).setStrokeStyle(3, 0xff3333, 0.8);
            en.setData('ultWarning', w);
            scene.tweens.add({
              targets: w, scale: 2.5, alpha: 0.35, duration: 1000,
              onComplete: () => {
                if (w.active) w.destroy();
                en.setData('ultWarning', null);
                const dmg = Math.round((en.getData('atk') || 20) * 2 * (1 - P.buff.shieldPct));
                P.hp = Math.max(0, P.hp - dmg);
                scene.damageFlash(0.4);
                bus.emit('status', '⚡ BOSS大招! -' + dmg, 2);
              }
            });
            bus.emit('status', '⚠️ ' + en.getData('name') + ' 蓄力中...', 1.5);
          }
        }
      }

      const lbl = en.getData('label'); if (lbl) lbl.setPosition(en.x, en.y - 16);
      const bw = en.getData('barW') || COMBAT_TUNING.hpBar.normalWidth;
      const bh = COMBAT_TUNING.hpBar.height;
      const yPos = en.y - 24;
      const cur = en.getData('hp') || 0, full = en.getData('maxHp') || 1;
      const pct = Math.max(0, Math.min(1, cur / full));
      scene.hpBarGfx.fillStyle(0x8b7752, 0.35);
      scene.hpBarGfx.fillRect(en.x - bw / 2, yPos, bw, bh);
      scene.hpBarGfx.fillStyle(pct > 0.6 ? 0x6de27a : pct > 0.3 ? 0xffd866 : 0xff6a5f, 1);
      scene.hpBarGfx.fillRect(en.x - bw / 2, yPos, Math.max(0, bw * pct), bh);
    });

    return { closestQ, activeEnemies };
  }
}

class BuffSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt) {
    if (P.buffTimer > 0) {
      P.buffTimer -= dt;
      if (P.buffTimer <= 0) {
        P.buff.speedBoost = 0;
        P.buff.shieldPct = 0;
        P.buff.atkBoost = 0;
        P.buff.rangeBoost = 0;
        P.buff.swordAtkSpeedBoost = 0;
        P.buff.lifestealPct = 0;
        P.buff.swordColor = 0;
        P.buff.swordTrailColor = 0;
        this.destroyShieldVisual();
        this.scene.shieldReflect = 0;
      }
    }
    if (this.scene.shieldOrbs.length > 0) {
      this.updateShieldVisual();
    }
  }

  createShieldVisual(color) {
    this.destroyShieldVisual();
    const { scene } = this;
    const count = 4;
    for (let i = 0; i < count; i++) {
      const orb = scene.add.circle(scene.player.x, scene.player.y, 7, color, 0.55)
        .setDepth(12).setStrokeStyle(1, 0xffffff, 0.3);
      scene.shieldOrbs.push({ sprite: orb, offset: (i / count) * Math.PI * 2 });
    }
  }

  updateShieldVisual() {
    const { scene } = this;
    const t = scene.time.now / 1000;
    scene.shieldOrbs.forEach(o => {
      if (!o.sprite.active) return;
      const a = o.offset + t * 3;
      o.sprite.setPosition(scene.player.x + Math.cos(a) * 30, scene.player.y + Math.sin(a) * 30);
    });
  }

  destroyShieldVisual() {
    this.scene.shieldOrbs.forEach(o => { if (o.sprite.active) o.sprite.destroy(); });
    this.scene.shieldOrbs = [];
  }
}

class MovementSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update() {
    const { scene } = this;
    if (scene.playerDead) return;

    let mvx = 0, mvy = 0, keyMoving = false;
    const left = scene.cursors.left.isDown || scene.wasd.left.isDown;
    const right = scene.cursors.right.isDown || scene.wasd.right.isDown;
    const up = scene.cursors.up.isDown || scene.wasd.up.isDown;
    const down = scene.cursors.down.isDown || scene.wasd.down.isDown;
    if (left) { mvx -= 1; }
    if (right) { mvx += 1; }
    if (up) { mvy -= 1; }
    if (down) { mvy += 1; }
    if (left || right || up || down) keyMoving = true;

    const joy = getJoystickDir();
    if (joy) { mvx += joy.x; mvy += joy.y; keyMoving = true; }

    if (keyMoving) {
      const len = Math.sqrt(mvx * mvx + mvy * mvy);
      if (len > 0.01) {
        let spd = P.speed;
        if (P.buffTimer > 0 && P.buff.speedBoost) spd *= (1 + P.buff.speedBoost);
        spd = Math.min(spd, 480);
        scene.player.setVelocity(mvx / len * spd, mvy / len * spd);
        scene.isMoving = false;
      } else {
        scene.player.setVelocity(0, 0);
      }
    } else if (scene.isMoving) {
      const dir = new Phaser.Math.Vector2(scene.moveTarget.x - scene.player.x, scene.moveTarget.y - scene.player.y);
      const dist = Math.max(0.01, dir.length());
      let spd = P.speed;
      if (P.buffTimer > 0 && P.buff.speedBoost) spd *= (1 + P.buff.speedBoost);
      spd = Math.min(spd, 480);
      if (dist > 5) { dir.scale(spd / dist); scene.player.setVelocity(dir.x, dir.y); }
      else scene.player.setVelocity(0, 0);
    } else {
      scene.player.setVelocity(0, 0);
    }
  }
}

const AURA_COLORS = [
  0x6de27a,
  0x66ffcc,
  0x88ccff,
  0xffd700,
  0xcc66ff,
  0xff8866,
  0xaa44ff,
  0xffffff,
  0xffdd00
];

class PlayerStatusSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt) {
    const inSafe = this.updateSafeZone();
    this.updateRecovery(dt, inSafe);
    this.updateAura();
    return { inSafe };
  }

  updateSafeZone() {
    const { scene } = this;
    const inSafe = scene._inSafeZone();

    if (inSafe && !scene._wasInSafe) {
      scene._wasInSafe = true;
      if (scene.defenseSystem) scene.defenseSystem.waitingWave = false;
      scene.clearEnemies();
      scene.showWorldNotice('进入安全区', '#dfffd8');
      bus.emit('status', '已进入安全区', 1.2);
    } else if (!inSafe && scene._wasInSafe) {
      scene._wasInSafe = false;
      scene.showWorldNotice('离开安全区', '#ffd866');
      bus.emit('status', '已离开安全区', 1.2);
    }

    if (inSafe && scene.enemies.countActive(true) > 0) {
      scene.clearEnemies();
    }
    return inSafe;
  }

  updateRecovery(dt, inSafe) {
    const { scene } = this;
    if (scene.playerDead || P.hp >= P.maxHp) return;
    const noEnemies = scene.enemies.countActive(true) === 0;
    if (!inSafe && !noEnemies) return;
    const healRate = inSafe ? P.maxHp * 0.05 : P.maxHp * 0.02;
    P.hp = Math.min(P.maxHp, P.hp + healRate * dt);
  }

  updateAura() {
    const { scene } = this;
    if (scene.playerDead) return;
    if (!scene.playerAura || !scene.playerAura.active) {
      const colorIndex = Math.min(getRealmIndex(P.realm), AURA_COLORS.length - 1);
      scene.playerAura = scene.add
        .circle(scene.player.x, scene.player.y, 22, AURA_COLORS[colorIndex] || 0x6de27a, 0.15)
        .setDepth(1);
      scene.tweens.add({
        targets: scene.playerAura,
        alpha: 0.08,
        scale: 1.6,
        duration: 1200,
        yoyo: true,
        repeat: -1
      });
      return;
    }
    scene.playerAura.setPosition(scene.player.x, scene.player.y);
  }
}

class CultivationProgressSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt) {
    const { scene } = this;
    if (!isCultivating || scene.playerDead) return;

    const cultRate = 0.02 + getRealmIndex(P.realm) * 0.005;
    let progress = cultProgress + cultRate * dt;

    if (progress >= 1) {
      progress = 0;
      const realm = getRealm(P.realm);
      if (P.stage < realm.stages) {
        P.stage++;
        recalcStats();
        refreshSkills();
        initHotbar();
        bus.emit('status', '🌊 ' + realm.name + ' ' + P.stage + '层！', 2);
        bus.emit('hud-refresh');
        bus.emit('hotbar-refresh');
        bus.emit('save');
      } else {
        bus.emit('status', '⚡ 境界圆满，按 C 尝试突破！', 2);
      }
    }

    setCultProgress(progress);
    this.emitCultivationParticles();
  }

  emitCultivationParticles() {
    const { scene } = this;
    if (Math.random() >= 0.3) return;
    const px = scene.player.x + Phaser.Math.Between(-20, 20);
    const py = scene.player.y + Phaser.Math.Between(-20, 20);
    const dot = scene.add.circle(px, py, 3, 0x88ddff, 0.6).setDepth(2);
    scene.tweens.add({
      targets: dot,
      alpha: 0,
      y: py - 30,
      duration: 600,
      onComplete: () => dot.destroy()
    });
  }
}

class SpawnSystem {
  constructor(scene) {
    this.scene = scene;
    this.spawnTimer = 0;
  }

  update(dt) {
    const { scene } = this;
    if (scene._inSafeZone()) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    const active = scene.enemies.countActive(true);
    const target = COMBAT_TUNING.maxActiveEnemies;
    if (active < target) {
      const batch = Math.min(target - active, active === 0 ? 4 : 2);
      for (let i = 0; i < batch; i++) this.spawnEnemy();
      this.spawnTimer = active === 0 ? COMBAT_TUNING.spawnInterval.empty : COMBAT_TUNING.spawnInterval.refill;
    } else {
      this.spawnTimer = COMBAT_TUNING.spawnInterval.capped;
    }
  }

  spawnEnemy(options = {}) {
    const { scene } = this;
    const zone = scene.getCurrentZone();
    const list = BESTIARY[zone.id];
    if (!list || list.length === 0) return null;
    const tmpl = list[Math.floor(Math.random() * list.length)];
    const { forceBoss = false, forceElite = false, allowBoss = true, allowElite = true } = options;

    const sz = scene.worldSize;
    let { x, y } = this.pickSpawnPoint();
    const safeRadius = WORLD.safeRadius + 40;
    const cx = sz / 2, cy = sz / 2;
    if (Math.abs(x - cx) <= safeRadius && Math.abs(y - cy) <= safeRadius) {
      const angle = Math.atan2(y - cy, x - cx) + Phaser.Math.FloatBetween(-0.5, 0.5);
      const dist = safeRadius + Phaser.Math.Between(80, 360);
      x = Phaser.Math.Clamp(cx + Math.cos(angle) * dist, 30, sz - 30);
      y = Phaser.Math.Clamp(cy + Math.sin(angle) * dist, 30, sz - 30);
    }

    const isBoss = forceBoss || (allowBoss && Math.random() < 0.01 && zone.monsterLv >= 3);
    const isElite = !isBoss && (forceElite || (allowElite && Math.random() < 0.08));
    const texture = isBoss ? 'monster-boss' : this.getMonsterTexture(zone, list, tmpl);
    const en = scene.enemies.create(x, y, texture);
    en.setCollideWorldBounds(true);
    en.setDepth(5);
    if (isElite) {
      en.setTint(0xffdf88);
      en.setScale(1.16);
    }
    en.setData('baseScale', isElite ? 1.16 : 1);
    en.setData('animSeed', Math.random() * Math.PI * 2);

    const lvMult = 1 + (zone.monsterLv - 1) * 0.3;
    const plvMult = 1 + (P.level - 1) * 0.08;
    const scale = lvMult * plvMult;
    const maxHp = getEnemyMaxHp(tmpl, scale, isBoss, isElite);

    en.setData('hp', maxHp);
    en.setData('maxHp', maxHp);
    en.setData('atk', Math.round(tmpl.atk * scale * (isBoss ? 3 : (isElite ? 1.5 : 1))));
    en.setData('speed', Math.round(tmpl.speed * (isBoss ? 0.6 : (isElite ? 0.8 : 1))));
    en.setData('xp', Math.round(tmpl.xp * lvMult * plvMult * (isBoss ? 5 : (isElite ? 2 : 1))));
    en.setData('gold', Math.round(tmpl.gold * lvMult * plvMult * (isBoss ? 6 : (isElite ? 2 : 1))));
    en.setData('zoneLv', zone.monsterLv);
    en.setData('isBoss', !!isBoss);
    en.setData('isElite', !!isElite);

    const enName = isBoss ? BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]
      : (isElite ? ('精英·' + tmpl.name) : tmpl.name);
    en.setData('name', enName);
    en.setData('dead', false);

    const lbl = scene.add.text(x, y - 16, enName, {
      fontSize: '11px',
      fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
      color: isBoss ? '#a86f18' : (isElite ? '#2f8f88' : '#5d6f54'),
      stroke: '#fff4cf',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(15);
    en.setData('label', lbl);

    en.setData('barW', isBoss ? COMBAT_TUNING.hpBar.bossWidth : COMBAT_TUNING.hpBar.normalWidth);
    en.setData('atkType', tmpl.atkType || 'melee');
    en.setData('atkRange', tmpl.atkRange || 150);
    en.setData('atkCD', tmpl.atkCD || 2);
    en.setData('projColor', tmpl.projColor || 0xff4444);
    en.setData('lastRangedAtk', 0);
    en.setData('ultCD', isBoss ? 6 : 99);
    en.setData('lastUlt', 0);
    en.setData('ultWarning', null);

    return en;
  }

  pickSpawnPoint() {
    const { scene } = this;
    const sz = scene.worldSize;
    const cam = scene.cameras.main;
    const margin = 80;
    const minDist = 360;
    const maxDist = 700;

    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(minDist, maxDist);
      const x = Phaser.Math.Clamp(scene.player.x + Math.cos(angle) * dist, 30, sz - 30);
      const y = Phaser.Math.Clamp(scene.player.y + Math.sin(angle) * dist, 30, sz - 30);
      const visible = x > cam.worldView.left - margin && x < cam.worldView.right + margin &&
        y > cam.worldView.top - margin && y < cam.worldView.bottom + margin;
      if (!visible || i > 8) return { x, y };
    }

    const side = Phaser.Math.Between(0, 3);
    const view = cam.worldView;
    const x = side === 0 ? view.left - margin : side === 1 ? view.right + margin : Phaser.Math.Between(view.left, view.right);
    const y = side === 2 ? view.top - margin : side === 3 ? view.bottom + margin : Phaser.Math.Between(view.top, view.bottom);
    return {
      x: Phaser.Math.Clamp(x, 30, sz - 30),
      y: Phaser.Math.Clamp(y, 30, sz - 30)
    };
  }

  getMonsterTexture(zone, list, tmpl) {
    const options = MONSTER_TEXTURES[zone.id] || ['monster-wolf'];
    const idx = Math.max(0, list.indexOf(tmpl));
    return options[idx % options.length];
  }
}

function getEnemyMaxHp(tmpl, scale, isBoss, isElite) {
  const tierMult = isBoss
    ? COMBAT_TUNING.enemyHpTierMult.boss
    : (isElite ? COMBAT_TUNING.enemyHpTierMult.elite : COMBAT_TUNING.enemyHpTierMult.normal);
  return Math.round(tmpl.hp * scale * COMBAT_TUNING.enemyHpScale * tierMult);
}

class WaveSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt) {
    const { scene } = this;
    const alive = scene.enemies.countActive(true);
    if (!scene._inSafeZone() && alive === 0) {
      if (!wavePending) {
        setWavePending(true);
        setWaveTimer(0);
        scene.showWorldNotice?.('区域已清，休整中...', '#dff7ff');
      } else {
        let wt = waveTimer + dt;
        if (wt >= 2) {
          let wn = waveNum + 1;
          setWaveNum(wn);
          if (wn > P.maxWave) P.maxWave = wn;
          const isBossWave = wn % 5 === 0;
          const count = isBossWave ? COMBAT_TUNING.maxActiveEnemies - 1 : COMBAT_TUNING.maxActiveEnemies;
          for (let i = 0; i < count; i++) {
            scene.spawnSystem.spawnEnemy({ allowBoss: !isBossWave });
          }
          if (isBossWave) {
            const bos = scene.spawnSystem.spawnEnemy({ forceBoss: true, allowBoss: false, allowElite: false });
            if (bos) {
              bos.setData('atk', Math.round((bos.getData('atk') || 1) * 2));
              bos.setData('xp', Math.round((bos.getData('xp') || 1) * 5));
              bos.setData('isBoss', true);
              bos.setTexture('monster-boss');
              bos.setScale(1.3);
              bos.setData('baseScale', 1.3);
              bus.emit('status', '👑 妖兽王降临！', 2.5);
            }
          }
          setWavePending(false);
          wt = 0;
          bus.emit('status', '⚔️ 第 ' + wn + ' 波来袭！', 2);
        }
        setWaveTimer(wt);
      }
    } else if (wavePending) {
      setWavePending(false);
      setWaveTimer(0);
    }
  }
}

class DefenseSystem {
  constructor(scene) {
    this.scene = scene;
    this.waitingWave = false;
    this.wallGfx = null;
  }

  update() {
    if (!gameStarted) return;
    this.checkWaveCleared();
    this.updateWall();
  }

  updateWall() {
    const { scene } = this;
    const wallY = scene.worldSize - 300;
    const bar = getEl('wallHpBar');
    const waveEl = getEl('waveCounter');
    if (bar) bar.style.width = Math.max(0, wallHp / wallMaxHp * 100) + '%';
    if (waveEl) waveEl.textContent = defenseWave + '/' + MAX_WAVES;

    if (wallHp <= 0) {
      setGameStarted(false);
      const dm = getEl('defeatModal');
      const dw = getEl('defeatWave');
      if (dm) dm.classList.remove('hidden');
      if (dw) dw.textContent = Math.max(0, defenseWave - 1);
    }

    scene.enemies.children.iterate((en) => {
      if (!en || en.getData('dead')) return;
      if (en.y > wallY - 30) {
        setWallHp(wallHp - Math.round(en.getData('atk') || 5) * 0.3);
        en.setData('dead', true);
        const lbl = en.getData('label');
        if (lbl) lbl.destroy();
        en.destroy();
      }
    });
  }

  start() {
    const { scene } = this;
    const mainMenu = getEl('mainMenu');
    if (mainMenu) mainMenu.style.display = 'none';
    setGameStarted(true);
    setWallHp(wallMaxHp);
    setDefenseWave(0);
    scene.player.setPosition(scene.worldSize / 2, scene.worldSize - 400);
    scene.moveTarget.set(scene.worldSize / 2, scene.worldSize - 400);
    scene.clearEnemies();
    this.startNextWave();
    bus.emit('status', '⚔️ 镇守剑气长城！', 3);

    const wallY = scene.worldSize - 300;
    if (this.wallGfx?.active) this.wallGfx.destroy();
    this.wallGfx = scene.add.graphics().setDepth(0);
    this.wallGfx.fillStyle(0x8a7a6a, 0.7);
    this.wallGfx.fillRect(0, wallY - 10, scene.worldSize, 30);
    this.wallGfx.fillStyle(0xc8b898, 0.4);
    this.wallGfx.fillRect(0, wallY - 8, scene.worldSize, 6);
    getEl('wallHud')?.classList.remove('hidden');
  }

  startNextWave() {
    const { scene } = this;
    if (defenseWave >= MAX_WAVES) {
      bus.emit('status', '🎉 剑气长城守住了！全部' + MAX_WAVES + '波妖兽被击退！', 5);
      setGameStarted(false);
      return;
    }
    setDefenseWave(defenseWave + 1);
    const count = Math.min(3 + defenseWave * 2, 25);
    const isBossWave = defenseWave % 5 === 0;
    for (let i = 0; i < count; i++) {
      const en = scene.spawnSystem.spawnEnemy({ allowBoss: isBossWave });
      if (en) {
        en.y = Phaser.Math.Between(100, 500);
        en.x = Phaser.Math.Between(100, scene.worldSize - 100);
      }
    }
    bus.emit('status', '⚔️ 第 ' + defenseWave + ' 波来袭！', 2);
  }

  checkWaveCleared() {
    const { scene } = this;
    if (!gameStarted || this.waitingWave) return;
    if (scene.enemies.countActive(true) === 0) {
      this.waitingWave = true;
      bus.emit('status', '妖兽退散，下一波准备中...', 2);
      scene.time.delayedCall(3000, () => {
        this.waitingWave = false;
        this.startNextWave();
      });
    }
  }
}

class UiTickSystem {
  constructor(scene) {
    this.scene = scene;
    this.hudTick = 0;
  }

  update(dt, time) {
    this.updateMessageTimers(dt);
    this.updateAutoSave(dt);
    this.updateHud();
    this.updateAchievements(time, dt);
  }

  updateMessageTimers(dt) {
    let st = statusTimer;
    if (st > 0) {
      st -= dt;
      if (st <= 0) getEl('status')?.classList.remove('show');
    }
    setStatusTimer(st);

    let lt = lootTimer;
    if (lt > 0) {
      lt -= dt;
      if (lt <= 0) getEl('loot-popup')?.classList.remove('show');
    }
    setLootTimer(lt);
  }

  updateAutoSave(dt) {
    let at = autoSaveTimer + dt;
    if (at >= 30) {
      at = 0;
      bus.emit('save');
    }
    setAutoSaveTimer(at);
  }

  updateHud() {
    this.hudTick++;
    if (this.hudTick <= 6) return;
    this.hudTick = 0;
    bus.emit('hud-refresh');
    bus.emit('hotbar-refresh');
    updateHotbarCooldowns();
    this.scene.updateZoneLabel();
  }

  updateAchievements(time, dt) {
    if (time % 2000 < dt * 1000 * 1.5) {
      bus.emit('check-achievements');
    }
  }
}

/* ---- 战斗系统（技能、弹丸、冷却、领域） ---- */
const SWORD_VOLLEY_COUNT = 3;
const SWORD_VOLLEY_SPREAD = 0.28;
const SWORD_TURN_RATE = 12;
const SWORD_PROJECTILE_SPEED = 560;
const SWORD_MIN_LIFETIME = 1900;
const SWORD_RANGE_LIFETIME_FACTOR = 7.5;
const SWORD_HITBOX_W = 22;
const SWORD_HITBOX_H = 12;
const SWORD_MAX_HIT_COUNT = 10;
const SWORD_HIT_COOLDOWN_MS = 120;
const SWORD_STORM_SHOTS_PER_SEC = 3;
const SWORD_STORM_INTERVAL = 1 / SWORD_STORM_SHOTS_PER_SEC;
const SWORD_START_SCALE = 0.38;
const SWORD_END_SCALE = 0.74;
const SWORD_GROW_DURATION_MS = 420;
const GROWING_FIREBALL_START_SCALE = 1.08;
const GROWING_FIREBALL_END_SCALE = 3.4;
const GROWING_FIREBALL_TRACK_TURN_RATE = 5.2;
const CRIMSON_LASER_DURATION_SEC = 3;
const CRIMSON_LASER_BEAM_TICK_MS = 120;
const CRIMSON_LASER_DAMAGE_TICK_MS = 300;
const SWORD_RING_COUNT = 99;
const SWORD_RING_RADIUS = 40;
const SWORD_RING_ROTATE_SPEED = 2.7;
const SWORD_RING_SHOT_LIMIT = 24;
const SWORD_RING_LAYER_CAP = 33;
const SWORD_RING_RADIUS_STEP = 18;
const SWORD_FLY_TEX = 'swordFlySvg';
const FIREDOMAIN_TEX = 'firedomainSword';
const SWORD_COLOR_PALETTE = Object.freeze([
  0xff5f57,
  0xffa33b,
  0xffdf4f,
  0x6fe786,
  0x62b6ff,
  0x9a7cff,
  0xff74c8
]);

class CombatLoopSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt, time, inSafe) {
    const { scene } = this;
    scene.combatSystem.updateSwordProjectiles(dt);
    scene.skillEffects?.updateProjectileTrails();
    scene.updateFireballFields();
    scene.groundEffectSystem?.update(dt);
    scene.buffSystem.update(dt);

    const skillNow = time / 1000;
    const qDef = SKILL_DEFS.find(s => s.id === P.hotbar[0]?.id) ||
      SKILL_DEFS.find(s => s.id === 'swordfly');
    const qRange = this.getAutoAttackRange(qDef);
    const qR2 = qRange * qRange;
    const { closestQ, activeEnemies } = scene.aiSystem.update(dt, skillNow, qRange, qR2);
    scene.sceneEffectsSystem?.update(dt, scene.getCurrentZone());

    if (scene.playerDead || inSafe) return;
    scene.combatSystem.useAutoAttack(skillNow, closestQ, activeEnemies, qDef);
    scene.combatSystem.useManualSkills(skillNow, activeEnemies);
  }

  getAutoAttackRange(qDef) {
    const { scene } = this;
    const view = scene.cameras.main?.worldView;
    const visibleRange = view
      ? Math.sqrt(view.width * view.width + view.height * view.height) * 0.5 + 80
      : (qDef.range || 280);
    if (qDef.id === 'swordfly') {
      return Math.max(qDef.range || 280, visibleRange);
    }
    return (qDef.range || 280) * (1 + (P.buff.rangeBoost || 0));
  }
}

class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.swordStorm = {
      nextFireAt: 0,
      colorIndex: 0
    };
    this.swordRing = {
      sprites: [],
      orbitAngle: 0,
      firedCount: 0,
      nextOrbIndex: 0,
      nextFireAt: 0,
      rebuildAt: 0
    };
    this.crimsonLaserState = {
      timer: null,
      startedAtMs: 0,
      lastDamageAtMs: 0,
      durationMs: 0,
      originX: 0,
      originY: 0,
      coreParts: null,
      castToken: 0,
      pendingLaunch: false
    };
  }

  getScaledPlayerDamageBase() {
    return (P.atk + P.level * 0.5) * COMBAT_TUNING.playerDamageScale * (1 + (P.mods?.skillDamage || 0));
  }

  splitDamage(totalDamage, count) {
    const base = Math.floor(totalDamage / count);
    const remainder = Math.max(0, totalDamage - base * count);
    return Array.from({ length: count }, (_, idx) => base + (idx < remainder ? 1 : 0));
  }

  isInCameraView(x, y, pad = 0) {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view) return true;
    return x >= view.x - pad && x <= view.right + pad && y >= view.y - pad && y <= view.bottom + pad;
  }

  isEnemyVisible(en, pad = 0) {
    if (!en || !en.active || en.getData('dead')) return false;
    return this.isInCameraView(en.x, en.y, pad);
  }

  getSwordFlyTextureKey() {
    return this.scene?.textures?.exists?.(SWORD_FLY_TEX) ? SWORD_FLY_TEX : 'swordQi';
  }

  getFiredomainTextureKey() {
    return this.scene?.textures?.exists?.(FIREDOMAIN_TEX) ? FIREDOMAIN_TEX : 'swordQi';
  }

  spawnProjectile(skillId, angle, dmg, options = {}) {
    const tex = {
      'fireball': 'fireball',
      'firedomain': this.getFiredomainTextureKey(),
      'swordfly': this.getSwordFlyTextureKey(),
      'thunder': 'bolt',
      'waterdomain': 'water',
      'tornado': 'wind'
    }[skillId] || 'arrow';
    const startX = options.startX ?? this.scene.player.x;
    const startY = options.startY ?? this.scene.player.y;
    const proj = this.scene.getPooledProj(startX, startY, tex);
    if (!proj) return null;

    const speed = options.speed || (skillId === 'swordfly' ? SWORD_PROJECTILE_SPEED : 450);
    this.scene.physics.velocityFromRotation(angle, speed, proj.body.velocity);
    proj.rotation = angle;
    proj.setData('damage', dmg);
    proj.setData('pierce', !!options.pierce);
    proj.setData('skillId', skillId);
    proj.setData('speed', speed);
    proj.setData('homing', !!options.homing);
    proj.setData('turnRate', options.turnRate || 0);
    proj.setData('seekRadius', options.seekRadius || 0);
    proj.setData('targetRef', options.targetRef || null);
    proj.setData('maxHits', options.maxHits || 0);
    proj.setData('hitCount', 0);
    proj.setData('lastHitAtMs', 0);
    proj.setData('customTint', options.customTint || null);
    proj.setData('customTrailColor', options.customTrailColor || null);
    proj.setData('noFireField', !!options.noFireField);
    proj.setData('lastFireFieldX', startX);
    proj.setData('lastFireFieldY', startY);
    proj.setData('growingFireball', !!options.growingFireball);
    proj.setData('fireballTrackArmed', false);
    proj.setData('hitTargets', null);
    proj.setData('baseBodyW', null);
    proj.setData('baseBodyH', null);
    proj.setData('lifetimeMs', options.lifetime || 1200);
    if (proj.body) {
      if (skillId === 'swordfly') proj.body.setSize(SWORD_HITBOX_W, SWORD_HITBOX_H, true);
      else proj.body.setSize(proj.width, proj.height, true);
    }
    this.scene.skillEffects?.onProjectileFired(proj, skillId, angle);
    if (skillId === 'swordfly') {
      proj.setScale(SWORD_START_SCALE);
      proj.setData('scaleStart', SWORD_START_SCALE);
      proj.setData('scaleEnd', SWORD_END_SCALE);
      proj.setData('scaleGrowMs', SWORD_GROW_DURATION_MS);
      proj.setData('spawnAtMs', this.scene.time.now);
    }

    const lifetime = options.lifetime || 1200;
    this.scene.scheduleProjFree(proj, lifetime);
    return proj;
  }

  shootProjectile(skillId, angle, dmg, range) {
    const proj = this.spawnProjectile(skillId, angle, dmg, {
      pierce: false,
      lifetime: 1200
    });
    if (!proj) return;
    if (skillId === 'fireball' && !proj.getData('noFireField')) {
      this.scene.groundEffectSystem?.addFireField(this.scene.player.x, this.scene.player.y, dmg * 0.18, 10);
    }
    this.scene.entityAnimationSystem?.playPlayerAttack(angle);
  }

  doMultiProjectile(angle, dmg, count, range, texture) {
    const tex = texture || this.getSwordFlyTextureKey();
    const offsets = [];
    for (let i = 0; i < count; i++) offsets.push((i / (count - 1) - 0.5) * 0.6);
    offsets.forEach(o => {
      const ang = angle + o;
      const proj = this.scene.getPooledProj(this.scene.player.x, this.scene.player.y, tex);
      if (proj) {
        proj.setScale(0.5);
        this.scene.physics.velocityFromRotation(ang, 460, proj.body.velocity);
        proj.rotation = ang;
        proj.setData('damage', Math.round(dmg * 0.6));
        proj.setData('pierce', false);
        proj.setData('homing', false);
        proj.setData('turnRate', 0);
        proj.setData('seekRadius', 0);
        proj.setData('targetRef', null);
        proj.setData('speed', 460);
        proj.setData('skillId', 'swordfly');
        this.scene.skillEffects?.onProjectileFired(proj, 'swordfly', ang);
        this.scene.scheduleProjFree(proj, 1000);
      }
    });
  }

  getSwordVolleyTargets(primaryTarget, activeEnemies, count) {
    const uniqueTargets = [];
    const candidates = (activeEnemies || [])
      .filter((en) => this.isEnemyVisible(en))
      .sort((a, b) => {
        const adx = a.x - this.scene.player.x;
        const ady = a.y - this.scene.player.y;
        const bdx = b.x - this.scene.player.x;
        const bdy = b.y - this.scene.player.y;
        return adx * adx + ady * ady - (bdx * bdx + bdy * bdy);
      });

    if (this.isEnemyVisible(primaryTarget)) uniqueTargets.push(primaryTarget);
    for (const enemy of candidates) {
      if (uniqueTargets.includes(enemy)) continue;
      uniqueTargets.push(enemy);
      if (uniqueTargets.length >= count) break;
    }

    while (uniqueTargets.length < count && uniqueTargets.length > 0) {
      uniqueTargets.push(uniqueTargets[uniqueTargets.length % Math.max(1, Math.min(uniqueTargets.length, count))]);
    }
    return uniqueTargets;
  }

  createSwordRingSprites() {
    this.clearSwordRingSprites();
    const paletteLen = SWORD_COLOR_PALETTE.length;
    for (let i = 0; i < SWORD_RING_COUNT; i++) {
      const layer = Math.floor(i / SWORD_RING_LAYER_CAP);
      const inLayerIndex = i % SWORD_RING_LAYER_CAP;
      const layerStart = layer * SWORD_RING_LAYER_CAP;
      const countInLayer = Math.min(SWORD_RING_LAYER_CAP, SWORD_RING_COUNT - layerStart);
      const radius = SWORD_RING_RADIUS + layer * SWORD_RING_RADIUS_STEP;
      const scale = Math.max(0.16, 0.34 - layer * 0.05);
      const baseAngle = (inLayerIndex / Math.max(1, countInLayer)) * Math.PI * 2 + layer * 0.13;
      const color = SWORD_COLOR_PALETTE[i % paletteLen];
      const orb = this.scene.add.sprite(this.scene.player.x, this.scene.player.y, this.getSwordFlyTextureKey()).setDepth(11);
      orb.setScale(scale).setAlpha(0.9).setTint(color);
      this.swordRing.sprites.push({
        sprite: orb,
        baseAngle,
        radius,
        scale,
        color,
        speedMul: layer % 2 === 0 ? 1 : -0.82
      });
    }
  }

  clearSwordRingSprites() {
    for (const item of this.swordRing.sprites) {
      if (item?.sprite?.active) item.sprite.destroy();
    }
    this.swordRing.sprites = [];
  }

  ensureSwordRingReady(skillNow) {
    if (skillNow < (this.swordRing.rebuildAt || 0)) return false;
    if (this.swordRing.sprites.length !== SWORD_RING_COUNT) {
      this.createSwordRingSprites();
    }
    return this.swordRing.sprites.length === SWORD_RING_COUNT;
  }

  updateSwordRingVisual(dt) {
    if (!this.swordRing.sprites.length || this.scene.playerDead) {
      if (this.scene.playerDead) this.clearSwordRingSprites();
      return;
    }
    this.swordRing.orbitAngle += dt * SWORD_RING_ROTATE_SPEED;
    const px = this.scene.player.x;
    const py = this.scene.player.y;
    for (const item of this.swordRing.sprites) {
      const sp = item?.sprite;
      if (!sp || !sp.active) continue;
      const speedMul = item.speedMul ?? 1;
      const radius = item.radius ?? SWORD_RING_RADIUS;
      const a = this.swordRing.orbitAngle * speedMul + item.baseAngle;
      sp.x = px + Math.cos(a) * radius;
      sp.y = py + Math.sin(a) * radius;
      sp.rotation = a + Math.PI * 0.5;
    }
  }

  getSwordShotDamage(qDef) {
    const lv = P.skillLevels?.[qDef.id] || 1;
    const mult = 1 + (P.buff.atkBoost || 0);
    const total = Math.round(this.getScaledPlayerDamageBase() * (qDef.baseDmg || 0.7) * (0.72 + lv * 0.06) * mult);
    return Math.max(1, Math.round(total / SWORD_VOLLEY_COUNT));
  }

  getVisibleEnemyCandidates(activeEnemies) {
    return (activeEnemies || []).filter((en) => this.isEnemyVisible(en));
  }

  findNearestEnemyFrom(x, y, enemies, range, usedSet = null) {
    let target = null;
    let bestD2 = range * range;
    for (const en of enemies) {
      if (!this.isEnemyVisible(en)) continue;
      if (usedSet?.has(en)) continue;
      const dx = en.x - x;
      const dy = en.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        target = en;
      }
    }
    return target;
  }

  pickSwordTarget(closestQ, activeEnemies, range) {
    if (this.isEnemyVisible(closestQ)) {
      const dx = closestQ.x - this.scene.player.x;
      const dy = closestQ.y - this.scene.player.y;
      if (dx * dx + dy * dy <= range * range) return closestQ;
    }
    return this.findNearestEnemyFrom(this.scene.player.x, this.scene.player.y, activeEnemies, range);
  }

  fireOneRingSword(target, dmg, range, lifetime) {
    if (!target || this.swordRing.sprites.length === 0) return false;
    const idx = this.swordRing.nextOrbIndex % this.swordRing.sprites.length;
    this.swordRing.nextOrbIndex += 1;
    const ringNode = this.swordRing.sprites[idx];
    const sx = ringNode?.sprite?.x ?? this.scene.player.x;
    const sy = ringNode?.sprite?.y ?? this.scene.player.y;
    const color = ringNode?.color || SWORD_COLOR_PALETTE[idx % SWORD_COLOR_PALETTE.length];
    const angle = Phaser.Math.Angle.Between(sx, sy, target.x, target.y);
    const proj = this.spawnProjectile('swordfly', angle, dmg, {
      startX: sx,
      startY: sy,
      pierce: true,
      homing: true,
      turnRate: SWORD_TURN_RATE,
      speed: SWORD_PROJECTILE_SPEED,
      seekRadius: range,
      maxHits: SWORD_MAX_HIT_COUNT,
      customTint: color,
      customTrailColor: color,
      targetRef: target,
      lifetime
    });
    if (!proj) return false;
    if (ringNode?.sprite?.active) {
      const baseScale = ringNode.scale ?? 0.42;
      ringNode.sprite.setScale(baseScale * 1.25);
      this.scene.tweens.add({
        targets: ringNode.sprite,
        scaleX: baseScale,
        scaleY: baseScale,
        duration: 120
      });
    }
    this.scene.entityAnimationSystem?.playPlayerAttack(angle);
    return true;
  }

  launchOrbitSwords(activeEnemies, dmg, range, lifetime) {
    if (this.swordRing.sprites.length === 0) return;
    const visible = this.getVisibleEnemyCandidates(activeEnemies);
    const usedTargets = new Set();
    for (const node of this.swordRing.sprites) {
      const sp = node?.sprite;
      if (!sp || !sp.active) continue;
      const color = node?.color || SWORD_COLOR_PALETTE[0];
      const target = this.findNearestEnemyFrom(sp.x, sp.y, visible, range, usedTargets);
      if (target) usedTargets.add(target);
      const tx = target?.x ?? (sp.x + Math.cos(sp.rotation - Math.PI * 0.5) * 220);
      const ty = target?.y ?? (sp.y + Math.sin(sp.rotation - Math.PI * 0.5) * 220);
      const angle = Phaser.Math.Angle.Between(sp.x, sp.y, tx, ty);
      this.spawnProjectile('swordfly', angle, dmg, {
        startX: sp.x,
        startY: sp.y,
        pierce: true,
        homing: !!target,
        turnRate: SWORD_TURN_RATE,
        speed: SWORD_PROJECTILE_SPEED,
        seekRadius: range,
        maxHits: SWORD_MAX_HIT_COUNT,
        customTint: color,
        customTrailColor: color,
        targetRef: target || null,
        lifetime
      });
    }
    this.clearSwordRingSprites();
  }

  shootSwordVolley(primaryTarget, totalDamage, qDef, activeEnemies) {
    const targets = this.getSwordVolleyTargets(primaryTarget, activeEnemies, SWORD_VOLLEY_COUNT);
    if (targets.length === 0) return;

    const damages = this.splitDamage(totalDamage, SWORD_VOLLEY_COUNT);
    const firstTarget = targets[0];
    const centerAngle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, firstTarget.x, firstTarget.y);
    const effectiveRange = this.getVisibleSwordRange();
    const lifetime = Math.max(SWORD_MIN_LIFETIME, Math.round(effectiveRange * SWORD_RANGE_LIFETIME_FACTOR));

    targets.forEach((target, idx) => {
      const spreadOffset = SWORD_VOLLEY_COUNT === 1 ? 0 : (idx / (SWORD_VOLLEY_COUNT - 1) - 0.5) * SWORD_VOLLEY_SPREAD;
      const launchAngle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, target.x, target.y) + spreadOffset;
      const proj = this.spawnProjectile('swordfly', launchAngle, damages[idx] || 1, {
        pierce: true,
        homing: true,
        turnRate: SWORD_TURN_RATE,
        speed: SWORD_PROJECTILE_SPEED,
        seekRadius: effectiveRange,
        maxHits: SWORD_MAX_HIT_COUNT,
        targetRef: target,
        lifetime
      });
    });

    this.scene.entityAnimationSystem?.playPlayerAttack(centerAngle);
  }

  shootSwordStorm(target, dmg, range, lifetime, color, trailColor = color) {
    if (!target || !this.isEnemyVisible(target)) return false;
    const px = this.scene.player.x;
    const py = this.scene.player.y;
    const angle = Phaser.Math.Angle.Between(px, py, target.x, target.y);
    const proj = this.spawnProjectile('swordfly', angle, dmg, {
      startX: px,
      startY: py,
      pierce: true,
      homing: true,
      turnRate: SWORD_TURN_RATE,
      speed: SWORD_PROJECTILE_SPEED,
      seekRadius: range,
      maxHits: SWORD_MAX_HIT_COUNT,
      customTint: color,
      customTrailColor: trailColor,
      targetRef: target,
      lifetime
    });
    if (!proj) return false;
    this.scene.entityAnimationSystem?.playPlayerAttack(angle);
    return true;
  }

  getSwordStormInterval() {
    const speedBoost = Math.max(0, P.buff.swordAtkSpeedBoost || 0);
    const cooldownReduction = Math.min(0.45, Math.max(0, P.mods?.cooldownReduction || 0));
    const interval = SWORD_STORM_INTERVAL * (1 - cooldownReduction) / (1 + speedBoost);
    return Math.max(0.08, interval);
  }

  getBloodSwordColor() {
    const color = P.buff.swordColor || 0;
    return color > 0 ? color : null;
  }

  getBloodSwordTrailColor(fallbackColor) {
    const trail = P.buff.swordTrailColor || 0;
    return trail > 0 ? trail : fallbackColor;
  }

  tintActiveSwords(color, trailColor = color) {
    if (!color) return;
    this.scene.projectiles.children.iterate((proj) => {
      if (!proj || !proj.active) return;
      if (proj.getData('skillId') !== 'swordfly') return;
      proj.setTint(color);
      proj.setData('customTint', color);
      proj.setData('customTrailColor', trailColor);
      proj.setData('trailColor', trailColor);
    });
  }

  recallSwordProjectiles() {
    let recalled = 0;
    this.scene.projectiles.children.iterate((proj) => {
      if (!proj || !proj.active) return;
      if (proj.getData('skillId') !== 'swordfly') return;
      this.scene.freeProj(proj);
      recalled++;
    });
    return recalled;
  }

  findSwordTarget(proj, seekRadius) {
    let nearest = null;
    let bestD2 = seekRadius * seekRadius;
    this.scene.enemies.children.iterate((en) => {
      if (!this.isEnemyVisible(en)) return;
      const dx = en.x - proj.x;
      const dy = en.y - proj.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        nearest = en;
      }
    });
    return nearest;
  }

  findFireballTarget(proj, seekRadius, skipSet = null) {
    let nearest = null;
    let bestD2 = seekRadius * seekRadius;
    this.scene.enemies.children.iterate((en) => {
      if (!this.isEnemyVisible(en)) return;
      if (skipSet?.has(en)) return;
      const dx = en.x - proj.x;
      const dy = en.y - proj.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        nearest = en;
      }
    });
    return nearest;
  }

  updateSwordProjectiles(dt) {
    if (this.swordRing?.sprites?.length) this.clearSwordRingSprites();
    const nowMs = this.scene.time.now;
    this.scene.projectiles.children.iterate((proj) => {
      if (!proj || !proj.active) return;
      const skillId = proj.getData('skillId');

      if (skillId === 'fireball' && proj.getData('growingFireball')) {
        let spawnAtMs = proj.getData('spawnAtMs');
        if (spawnAtMs == null) {
          spawnAtMs = nowMs;
          proj.setData('spawnAtMs', spawnAtMs);
        }
        const scaleStart = proj.getData('scaleStart') ?? GROWING_FIREBALL_START_SCALE;
        const scaleEnd = proj.getData('scaleEnd') ?? GROWING_FIREBALL_END_SCALE;
        const growMs = proj.getData('scaleGrowMs') || proj.getData('lifetimeMs') || 1200;
        const growT = Phaser.Math.Clamp((nowMs - spawnAtMs) / growMs, 0, 1);
        const fireballScale = Phaser.Math.Linear(scaleStart, scaleEnd, growT);
        proj.setScale(fireballScale);

        const lifetimeMs = proj.getData('lifetimeMs') || growMs;
        const lifeT = Phaser.Math.Clamp((nowMs - spawnAtMs) / lifetimeMs, 0, 1);
        const fadeT = Phaser.Math.Clamp((lifeT - 0.72) / 0.28, 0, 1);
        proj.setAlpha(Phaser.Math.Linear(1, 0.15, fadeT));

        if (proj.body) {
          const baseBodyW = proj.getData('baseBodyW') || proj.width;
          const baseBodyH = proj.getData('baseBodyH') || proj.height;
          proj.body.setSize(
            Math.max(10, baseBodyW * fireballScale),
            Math.max(10, baseBodyH * fireballScale),
            true
          );
        }

        if (!proj.getData('homing') || !proj.body) return;

        const seekRadius = proj.getData('seekRadius') || this.getVisibleSwordRange();
        const trackArmed = !!proj.getData('fireballTrackArmed');
        let hitTargets = proj.getData('hitTargets');
        if (!(hitTargets instanceof Set)) {
          hitTargets = new Set();
          proj.setData('hitTargets', hitTargets);
        }
        let target = proj.getData('targetRef');
        const targetValid = this.isEnemyVisible(target) && (() => {
          const dx = target.x - proj.x;
          const dy = target.y - proj.y;
          if (dx * dx + dy * dy > seekRadius * seekRadius) return false;
          if (trackArmed && hitTargets.has(target)) return false;
          return true;
        })();

        if (!targetValid) {
          target = this.findFireballTarget(proj, seekRadius, trackArmed ? hitTargets : null);
          proj.setData('targetRef', target || null);
        }

        const currentAngle = Math.atan2(proj.body.velocity.y, proj.body.velocity.x);
        if (!target) {
          proj.rotation = currentAngle;
          return;
        }
        const desiredAngle = Phaser.Math.Angle.Between(proj.x, proj.y, target.x, target.y);
        const turnRate = proj.getData('turnRate') || GROWING_FIREBALL_TRACK_TURN_RATE;
        const speed = proj.getData('speed') || 340;
        const nextAngle = Phaser.Math.Angle.RotateTo(currentAngle, desiredAngle, turnRate * dt);
        this.scene.physics.velocityFromRotation(nextAngle, speed, proj.body.velocity);
        proj.rotation = nextAngle;
        return;
      }

      if (skillId !== 'swordfly') return;

      let spawnAtMs = proj.getData('spawnAtMs');
      if (spawnAtMs == null) {
        spawnAtMs = nowMs;
        proj.setData('spawnAtMs', spawnAtMs);
      }
      const scaleStart = proj.getData('scaleStart') ?? SWORD_START_SCALE;
      const scaleEnd = proj.getData('scaleEnd') ?? SWORD_END_SCALE;
      const growMs = proj.getData('scaleGrowMs') || SWORD_GROW_DURATION_MS;
      const growT = Phaser.Math.Clamp((nowMs - spawnAtMs) / growMs, 0, 1);
      proj.setScale(Phaser.Math.Linear(scaleStart, scaleEnd, growT));

      if (!proj.getData('homing') || !proj.body) return;

      const seekRadius = proj.getData('seekRadius') || 0;
      let target = proj.getData('targetRef');
      const targetValid = this.isEnemyVisible(target) && (() => {
        const dx = target.x - proj.x;
        const dy = target.y - proj.y;
        return dx * dx + dy * dy <= seekRadius * seekRadius;
      })();

      if (!targetValid) {
        target = this.findSwordTarget(proj, seekRadius || 300);
        proj.setData('targetRef', target || null);
      }

      const currentAngle = Math.atan2(proj.body.velocity.y, proj.body.velocity.x);
      if (!target) {
        proj.rotation = currentAngle;
        return;
      }

      const desiredAngle = Phaser.Math.Angle.Between(proj.x, proj.y, target.x, target.y);
      const turnRate = proj.getData('turnRate') || 0;
      const speed = proj.getData('speed') || SWORD_PROJECTILE_SPEED;
      const nextAngle = Phaser.Math.Angle.RotateTo(currentAngle, desiredAngle, turnRate * dt);
      this.scene.physics.velocityFromRotation(nextAngle, speed, proj.body.velocity);
      proj.rotation = nextAngle;
    });
  }

  doDomainSkill(tx, ty, dmg, def) {
    const { scene } = this;
    scene.skillEffects?.onDomainCast(tx, ty, def);
    scene.enemies.children.iterate((en) => {
      if (!en || en.getData('dead')) return;
      const dx = en.x - tx, dy = en.y - ty;
      if (dx * dx + dy * dy <= (def.aoeRadius || 140) * (def.aoeRadius || 140)) {
        this.damageEnemy(en, dmg, def.id);
        if (def.freeze) en.setData('freezeTimer', def.freeze);
        else if (def.slow) en.setData('slowTimer', 2.5);
        else if (def.id === 'tornado') {
          const pull = new Phaser.Math.Vector2(tx - en.x, ty - en.y);
          if (pull.length() > 1) { pull.normalize().scale(80); en.x += pull.x * 0.15; en.y += pull.y * 0.15; }
        }
      }
    });
  }

  castGrowingFireball(totalDamage, activeEnemies) {
    const visibleTargets = this.getVisibleEnemyCandidates(activeEnemies);
    if (!visibleTargets.length) return false;

    let target = null;
    let bestD2 = Infinity;
    for (const en of visibleTargets) {
      const dx = en.x - this.scene.player.x;
      const dy = en.y - this.scene.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        target = en;
      }
    }
    if (!target) return false;

    const baseAngle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, target.x, target.y);
    const visibleRange = this.getVisibleSwordRange();
    const speed = 340;
    const lifetime = Math.max(2100, Math.round((visibleRange / speed) * 1000) + 850);
    const dmg = Math.max(1, Math.round(totalDamage));
    const proj = this.spawnProjectile('fireball', baseAngle, dmg, {
      speed,
      lifetime,
      pierce: true,
      homing: true,
      turnRate: GROWING_FIREBALL_TRACK_TURN_RATE,
      seekRadius: visibleRange,
      targetRef: target,
      noFireField: true
    });
    if (!proj) return false;

    proj.setData('growingFireball', true);
    proj.setData('scaleStart', GROWING_FIREBALL_START_SCALE);
    proj.setData('scaleEnd', GROWING_FIREBALL_END_SCALE);
    proj.setData('scaleGrowMs', Math.round(lifetime * 0.92));
    proj.setData('lifetimeMs', lifetime);
    proj.setData('fireballTrackArmed', false);
    proj.setData('spawnAtMs', this.scene.time.now);
    proj.setData('hitTargets', new Set());
    proj.setScale(GROWING_FIREBALL_START_SCALE);
    if (proj.body) {
      proj.setData('baseBodyW', proj.width);
      proj.setData('baseBodyH', proj.height);
      proj.body.setSize(
        Math.max(10, proj.width * GROWING_FIREBALL_START_SCALE),
        Math.max(10, proj.height * GROWING_FIREBALL_START_SCALE),
        true
      );
    }
    this.scene.entityAnimationSystem?.playPlayerAttack(baseAngle);
    return true;
  }

  castGiantSwordStrike(target, totalDamage, def) {
    if (!target || !this.isEnemyVisible(target)) return false;
    const angle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, target.x, target.y);
    const visibleRange = this.getVisibleSwordRange();
    const speed = 520;
    const lifetime = Math.max(980, Math.round((visibleRange / speed) * 1000) + 280);
    const dmg = Math.max(1, Math.round(totalDamage));
    const tint = def?.color || 0xffd06a;
    const proj = this.spawnProjectile('firedomain', angle, dmg, {
      speed,
      lifetime,
      pierce: true,
      homing: false,
      seekRadius: visibleRange,
      customTint: tint,
      customTrailColor: 0xff915c,
      noFireField: true
    });
    if (!proj) return false;
    const usingSvgSword = proj.texture?.key === FIREDOMAIN_TEX;
    proj.setScale(usingSvgSword ? 0.92 : 2.8);
    if (proj.body) {
      if (usingSvgSword) proj.body.setSize(118, 34, true);
      else proj.body.setSize(72, 24, true);
    }
    this.scene.entityAnimationSystem?.playPlayerAttack(angle);
    return true;
  }

  createCrimsonGroundCore(x, y, durationMs, color = 0xff2a2a) {
    this.destroyCrimsonGroundCore();
    const lowFx = !!this.scene.skillEffects?.lowFxMode;
    const core = this.scene.add.circle(x, y, lowFx ? 12 : 16, color, 0.82).setDepth(9);
    core.setStrokeStyle(2, 0xffb0b0, 0.9);
    const ring = this.scene.add.circle(x, y, lowFx ? 22 : 30, color, 0.2).setDepth(8);
    ring.setStrokeStyle(2, color, 0.7);
    const glow = this.scene.add.circle(x, y, lowFx ? 34 : 46, 0xff3b3b, 0.14).setDepth(7);
    const pulseTween = this.scene.tweens.add({
      targets: [core, ring],
      scaleX: 1.16,
      scaleY: 1.16,
      duration: lowFx ? 220 : 180,
      yoyo: true,
      repeat: -1
    });
    const glowTween = this.scene.tweens.add({
      targets: glow,
      alpha: lowFx ? 0.22 : 0.28,
      duration: 200,
      yoyo: true,
      repeat: -1
    });
    const lifeTimer = this.scene.time.delayedCall(durationMs + 220, () => this.destroyCrimsonGroundCore());
    this.crimsonLaserState.coreParts = { core, ring, glow, pulseTween, glowTween, lifeTimer };
  }

  destroyCrimsonGroundCore() {
    const parts = this.crimsonLaserState?.coreParts;
    if (!parts) return;
    if (parts.lifeTimer?.remove) parts.lifeTimer.remove(false);
    if (parts.pulseTween) parts.pulseTween.remove();
    if (parts.glowTween) parts.glowTween.remove();
    if (parts.core?.active) parts.core.destroy();
    if (parts.ring?.active) parts.ring.destroy();
    if (parts.glow?.active) parts.glow.destroy();
    this.crimsonLaserState.coreParts = null;
  }

  stopCrimsonLaserBarrage() {
    const timer = this.crimsonLaserState?.timer;
    if (timer?.remove) timer.remove(false);
    this.crimsonLaserState.timer = null;
    this.crimsonLaserState.pendingLaunch = false;
    this.crimsonLaserState.castToken = (this.crimsonLaserState.castToken || 0) + 1;
    this.destroyCrimsonGroundCore();
  }

  getHalfScreenRange() {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view) return 220;
    return Math.max(180, Math.min(view.width, view.height) * 0.5);
  }

  collectAliveEnemies(maxRange = Infinity, centerX = null, centerY = null) {
    const targets = [];
    const hasRangeLimit = Number.isFinite(maxRange) && maxRange > 0;
    const rangeSq = hasRangeLimit ? maxRange * maxRange : Infinity;
    const px = centerX ?? this.scene.player.x;
    const py = centerY ?? this.scene.player.y;
    this.scene.enemies.children.iterate((en) => {
      if (!en || !en.active || en.getData('dead')) return;
      if (hasRangeLimit) {
        const dx = en.x - px;
        const dy = en.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 > rangeSq) return;
      }
      targets.push(en);
    });
    return targets;
  }

  castCrimsonLaserBarrage(activeEnemies, totalDamage, def) {
    const halfScreenRange = this.getHalfScreenRange();
    const initialTargets = (activeEnemies || []).filter((en) => {
      if (!en || !en.active || en.getData('dead')) return false;
      const dx = en.x - this.scene.player.x;
      const dy = en.y - this.scene.player.y;
      return dx * dx + dy * dy <= halfScreenRange * halfScreenRange;
    });
    if (!initialTargets.length) return false;

    this.stopCrimsonLaserBarrage();
    const castToken = this.crimsonLaserState.castToken;

    const durationMs = Math.round(Math.max(0.5, def?.duration || CRIMSON_LASER_DURATION_SEC) * 1000);
    const beamTickMs = this.scene.skillEffects?.lowFxMode ? 180 : CRIMSON_LASER_BEAM_TICK_MS;
    const damageTickMs = CRIMSON_LASER_DAMAGE_TICK_MS;
    const damageTickCount = Math.max(1, Math.ceil(durationMs / damageTickMs));
    const perTickDamage = Math.max(1, Math.round(totalDamage / damageTickCount));
    const skillId = def?.id || 'hailstorm';
    const beamColor = def?.color || 0xff1f1f;
    let focusSeed = initialTargets[0];
    let seedBest = Infinity;
    for (const en of initialTargets) {
      const dx = en.x - this.scene.player.x;
      const dy = en.y - this.scene.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < seedBest) {
        seedBest = d2;
        focusSeed = en;
      }
    }

    const startLaserAt = (originX, originY) => {
      if (this.crimsonLaserState.castToken !== castToken) return;
      this.crimsonLaserState.pendingLaunch = false;
      this.crimsonLaserState.originX = originX;
      this.crimsonLaserState.originY = originY;
      this.createCrimsonGroundCore(originX, originY, durationMs, beamColor);
      this.crimsonLaserState.startedAtMs = this.scene.time.now;
      this.crimsonLaserState.lastDamageAtMs = this.scene.time.now;
      this.crimsonLaserState.durationMs = durationMs;

      const tick = () => {
        if (this.crimsonLaserState.castToken !== castToken) return;
        if (this.scene.playerDead) {
          this.stopCrimsonLaserBarrage();
          return;
        }
        const nowMs = this.scene.time.now;
        if (nowMs - this.crimsonLaserState.startedAtMs >= this.crimsonLaserState.durationMs) {
          this.stopCrimsonLaserBarrage();
          return;
        }

        const rangeNow = this.getHalfScreenRange();
        const targets = this.collectAliveEnemies(rangeNow, originX, originY);
        if (!targets.length) return;

        let focus = targets[0];
        let bestD2 = Infinity;
        for (const en of targets) {
          const dx = en.x - originX;
          const dy = en.y - originY;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) {
            bestD2 = d2;
            focus = en;
          }
        }

        const aimAngle = Phaser.Math.Angle.Between(originX, originY, focus.x, focus.y);
        this.scene.entityAnimationSystem?.playPlayerAttack(aimAngle);
        this.scene.skillEffects?.castCrimsonLaserBurst?.(
          originX,
          originY,
          targets,
          beamColor
        );

        if (nowMs - this.crimsonLaserState.lastDamageAtMs < damageTickMs) return;
        this.crimsonLaserState.lastDamageAtMs = nowMs;
        for (const en of targets) this.damageEnemy(en, perTickDamage, skillId);
      };

      tick();
      this.crimsonLaserState.timer = this.scene.time.addEvent({
        delay: beamTickMs,
        loop: true,
        callback: tick
      });
    };

    const launchFromX = this.scene.player.x;
    const launchFromY = this.scene.player.y;
    const impactX = focusSeed?.x ?? launchFromX;
    const impactY = focusSeed?.y ?? launchFromY;
    const impactDef = { ...def, id: 'hailstorm', color: beamColor };
    this.crimsonLaserState.pendingLaunch = true;

    const onImpact = (ix, iy) => {
      if (this.crimsonLaserState.castToken !== castToken) return;
      let firstHitTarget = null;
      if (focusSeed?.active && !focusSeed.getData('dead')) firstHitTarget = focusSeed;
      if (!firstHitTarget) {
        const impactCandidates = this.collectAliveEnemies(this.getHalfScreenRange(), ix, iy);
        firstHitTarget = this.findNearestEnemyFrom(ix, iy, impactCandidates, this.getHalfScreenRange());
      }
      if (firstHitTarget) this.damageEnemy(firstHitTarget, perTickDamage, skillId);
      startLaserAt(ix, iy);
    };

    const launchAngle = Phaser.Math.Angle.Between(launchFromX, launchFromY, impactX, impactY);
    this.scene.entityAnimationSystem?.playPlayerAttack(launchAngle);
    if (this.scene.skillEffects?.launchDomainOrb) {
      this.scene.skillEffects.launchDomainOrb(launchFromX, launchFromY, impactX, impactY, impactDef, onImpact);
    } else {
      onImpact(impactX, impactY);
    }
    return true;
  }

  doRectDomainSkill(cx, cy, length, width, rotation, dmg, def) {
    const halfLength = Math.max(30, length * 0.5);
    const halfWidth = Math.max(18, width * 0.5);
    const cosA = Math.cos(rotation);
    const sinA = Math.sin(rotation);
    this.scene.enemies.children.iterate((en) => {
      if (!en || en.getData('dead')) return;
      const dx = en.x - cx;
      const dy = en.y - cy;
      const localX = dx * cosA + dy * sinA;
      const localY = -dx * sinA + dy * cosA;
      if (Math.abs(localX) <= halfLength && Math.abs(localY) <= halfWidth) {
        this.damageEnemy(en, dmg, def.id);
        if (def.freeze) en.setData('freezeTimer', def.freeze);
        else if (def.slow) en.setData('slowTimer', 2.5);
      }
    });
  }

  getVisibleSwordRange() {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view) return 360;
    const halfDiagonal = Math.sqrt(view.width * view.width + view.height * view.height) * 0.5;
    return Math.max(320, Math.round(halfDiagonal + 80));
  }

  findNearestSkillTarget(activeEnemies, range) {
    let target = null;
    let bestD2 = Infinity;
    const r2 = range * range;
    for (const en of activeEnemies) {
      if (!en || en.getData('dead')) continue;
      const dx = en.x - this.scene.player.x;
      const dy = en.y - this.scene.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 < bestD2) {
        bestD2 = d2;
        target = en;
      }
    }
    return target;
  }

  castElementDomain(target, def, dmg) {
    const { scene } = this;

    if (def.id === 'hailstorm') {
      return;
    }

    if (!target) return;

    const spreadRadius = Math.round((def.aoeRadius || 140) * 1.18);
    const duration = 8;
    const impactDef = { ...def, aoeRadius: spreadRadius, duration };
    const impactX = target.x;
    const impactY = target.y;
    const angle = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, impactX, impactY);
    scene.entityAnimationSystem?.playPlayerAttack(angle);

    const onImpact = (ix, iy) => {
      const burstDamage = Math.max(1, Math.round(dmg * 0.45));
      this.doDomainSkill(ix, iy, burstDamage, impactDef);
      if (def.id === 'firedomain') {
        scene.groundEffectSystem?.addFireField(ix, iy, dmg, duration, spreadRadius);
      } else if (def.id === 'thunder') {
        scene.groundEffectSystem?.addThunderField(ix, iy, spreadRadius, Math.max(1, Math.round(dmg * 0.95)), duration);
      }
    };

    if (scene.skillEffects?.launchDomainOrb) {
      scene.skillEffects.launchDomainOrb(scene.player.x, scene.player.y, impactX, impactY, impactDef, onImpact);
    } else {
      onImpact(impactX, impactY);
    }
  }

  /* ---- 伤害 / 掉落 / 死亡结算（核心逻辑位于区块 6，此处为兼容调用入口） ---- */
  onProjHit(proj, en) { onProjHit(this.scene, proj, en); }
  onEnemyProjHit(proj) { onEnemyProjHit(this.scene, proj); }
  onEnemyContact(en) { onEnemyContact(this.scene, en); }
  damageEnemy(en, dmg, skillId) { damageEnemy(this.scene, en, dmg, skillId); }

  useAutoAttack(skillNow, closestQ, activeEnemies, qDef) {
    if (qDef.id !== 'swordfly') {
      if (skillNow >= (this.scene.skillCooldowns[qDef.id] || 0) && closestQ) {
        const qCD = (qDef.cooldown || 0.7) * (1 - Math.min(0.45, P.mods?.cooldownReduction || 0));
        this.scene.skillCooldowns[qDef.id] = skillNow + qCD;
        const lv = P.skillLevels?.[qDef.id] || 1;
        const mult = 1 + (P.buff.atkBoost || 0);
        const dmg = Math.round(this.getScaledPlayerDamageBase() * (qDef.baseDmg || 0.7) * (0.72 + lv * 0.06) * mult);
        this.shootSwordVolley(closestQ, dmg, qDef, activeEnemies);
        this.scene.showSkillName(qDef.name, qDef.color);
      }
      return;
    }

    const qCD = qDef.cooldown || 0.7;
    const range = this.getVisibleSwordRange();
    const visibleTargets = this.getVisibleEnemyCandidates(activeEnemies);
    if (visibleTargets.length === 0) {
      this.recallSwordProjectiles();
      this.scene.skillCooldowns[qDef.id] = skillNow;
      return;
    }

    if (this.swordRing?.sprites?.length) this.clearSwordRingSprites();
    if (!this.swordStorm.nextFireAt) this.swordStorm.nextFireAt = skillNow;
    if (skillNow < this.swordStorm.nextFireAt) return;
    const swordInterval = this.getSwordStormInterval();

    const lv = P.skillLevels?.[qDef.id] || 1;
    const mult = 1 + (P.buff.atkBoost || 0);
    const totalDamage = Math.round(this.getScaledPlayerDamageBase() * (qDef.baseDmg || 0.7) * (0.72 + lv * 0.06) * mult);
    const perSwordDamage = Math.max(1, Math.round(totalDamage / SWORD_VOLLEY_COUNT));
    const lifetime = Math.max(SWORD_MIN_LIFETIME, Math.round(range * SWORD_RANGE_LIFETIME_FACTOR));
    const target = this.pickSwordTarget(closestQ, visibleTargets, range);
    if (target) {
      const bloodColor = this.getBloodSwordColor();
      const color = bloodColor || SWORD_COLOR_PALETTE[this.swordStorm.colorIndex % SWORD_COLOR_PALETTE.length];
      const trailColor = this.getBloodSwordTrailColor(color);
      const fired = this.shootSwordStorm(target, perSwordDamage, range, lifetime, color, trailColor);
      if (fired) {
        if (!bloodColor) this.swordStorm.colorIndex++;
        this.swordStorm.nextFireAt = skillNow + swordInterval;
        this.scene.showSkillName(qDef.name, qDef.color);
      } else {
        this.swordStorm.nextFireAt = skillNow + swordInterval;
      }
    }

    this.scene.skillCooldowns[qDef.id] = this.swordStorm.nextFireAt || (skillNow + qCD);
  }

  useManualSkills(skillNow, activeEnemies) {
    const { scene } = this;
    for (let si = 1; si < 5; si++) {
      const def = SKILL_DEFS.find(s => s.id === P.hotbar[si]?.id);
      if (!def || def.type === 'basic') continue;
      if (skillNow < (scene.skillCooldowns[def.id] || 0)) continue;
      const cd = (def.cooldown || 2) * (1 - Math.min(0.45, P.mods?.cooldownReduction || 0));

      if (def.type === 'heal') {
        scene.skillCooldowns[def.id] = skillNow + cd;
        const healPct = Math.max(0, def.healPct || 0.1);
        const healValue = Math.max(1, Math.round(P.maxHp * healPct));
        const beforeHp = P.hp;
        P.hp = Math.min(P.maxHp, P.hp + healValue);
        const actualHeal = Math.max(0, P.hp - beforeHp);
        scene.skillEffects?.onBuffCast(def.color || 0x66d98f);
        scene.showSkillName(def.name, def.color || 0x66d98f);
        if (actualHeal > 0) {
          scene.textPool.show(scene.player.x, scene.player.y - 36, '+' + actualHeal, {
            fontSize: '18px',
            color: '#6de27a',
            stroke: '#000',
            strokeThickness: 2,
            depth: 20,
            floatDist: 34,
            duration: 760
          });
        }
        bus.emit('hud-refresh');
      } else if (def.type === 'shield') {
        scene.skillCooldowns[def.id] = skillNow + cd;
        P.buff.shieldPct = def.shieldPct || 0;
        P.buffTimer = Math.max(P.buffTimer, def.duration || 5);
        scene.shieldReflect = def.reflectDmg || 0;
        if (scene.buffSystem) scene.buffSystem.createShieldVisual(def.color || 0xffd700);
        scene.skillEffects?.onShieldCast(def.color || 0xffd700);
        scene.showSkillName(def.name, def.color || 0xffd700);
        bus.emit('status', def.name + ' 护体!', 1.5);
      } else if (def.type === 'buff') {
        scene.skillCooldowns[def.id] = skillNow + cd;
        if (def.speedBoost) P.buff.speedBoost = def.speedBoost;
        if (def.atkBoost) P.buff.atkBoost = def.atkBoost;
        if (def.rangeBoost) P.buff.rangeBoost = def.rangeBoost;
        if (def.shieldPct) P.buff.shieldPct = def.shieldPct;
        if (def.swordAtkSpeedBoost != null) P.buff.swordAtkSpeedBoost = Math.max(0, def.swordAtkSpeedBoost);
        if (def.lifestealPct != null) P.buff.lifestealPct = Math.max(0, def.lifestealPct);
        if (def.swordColor != null) P.buff.swordColor = def.swordColor;
        if (def.swordTrailColor != null) P.buff.swordTrailColor = def.swordTrailColor;
        P.buffTimer = Math.max(P.buffTimer, def.duration || 5);
        if (P.buff.swordColor > 0) {
          this.tintActiveSwords(P.buff.swordColor, P.buff.swordTrailColor || P.buff.swordColor);
        }
        scene.skillEffects?.onBuffCast(def.color || 0x66ffcc);
        scene.showSkillName(def.name, def.color || 0x66ffcc);
        bus.emit('status', def.name + ' 激活!', 1.5);
      } else if (def.type === 'ground') {
        if (def.id === 'firedomain') {
          const visibleTargets = this.getVisibleEnemyCandidates(activeEnemies);
          if (!visibleTargets.length) continue;
          scene.skillCooldowns[def.id] = skillNow + cd;
          const lv = P.skillLevels?.[def.id] || 1;
          const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (lv - 1) * 0.1)));
          if (this.castGrowingFireball(dmg, visibleTargets)) {
            scene.showSkillName(def.name, def.color || 0xc95f36);
          }
        } else {
          const target = this.findNearestSkillTarget(activeEnemies, def.range || 220);
          if (target) {
            scene.skillCooldowns[def.id] = skillNow + cd;
            const lv = P.skillLevels?.[def.id] || 1;
            const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (lv - 1) * 0.08)));
            scene.groundEffectSystem?.addFireField(target.x, target.y, dmg, def.duration || 10, def.aoeRadius || 95);
            scene.skillEffects?.onDomainCast(target.x, target.y, { ...def, id: 'firedomain' });
            scene.showSkillName(def.name, def.color || 0xff8844);
          }
        }
      } else if (def.type === 'domain') {
        if (def.id === 'hailstorm') {
          if (!activeEnemies?.length) continue;
          const dlv = P.skillLevels?.[def.id] || 1;
          const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (dlv - 1) * 0.16)));
          const casted = this.castCrimsonLaserBarrage(activeEnemies, dmg, def);
          if (!casted) continue;
          scene.skillCooldowns[def.id] = skillNow + cd;
          scene.showSkillName(def.name, def.color || 0xff2a2a);
          continue;
        }
        if (def.id === 'thunder') {
          const dTarget = this.findNearestSkillTarget(activeEnemies, def.range || 260);
          if (dTarget) {
            scene.skillCooldowns[def.id] = skillNow + cd;
            const dlv = P.skillLevels?.[def.id] || 1;
            const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (dlv - 1) * 0.1)));
            this.castElementDomain(dTarget, def, dmg);
            scene.showSkillName(def.name, def.color || 0xffdd00);
          }
          continue;
        }
        if (def.selfCenter) {
          const aoeR2 = (def.aoeRadius || 260) * (def.aoeRadius || 260);
          let hasTarget = false;
          for (const en of activeEnemies) {
            const dx = en.x - scene.player.x, dy = en.y - scene.player.y;
            if (dx * dx + dy * dy <= aoeR2) { hasTarget = true; break; }
          }
          if (hasTarget) {
            scene.skillCooldowns[def.id] = skillNow + cd;
            const dlv = P.skillLevels?.[def.id] || 1;
            const dmg = Math.max(1, Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (dlv - 1) * 0.08)));
            scene.groundEffectSystem?.addThunderField(scene.player.x, scene.player.y, def.aoeRadius || 300, dmg, def.duration || 5);
            scene.skillEffects?.onDomainCast(scene.player.x, scene.player.y, def);
            scene.showSkillName(def.name, def.color || 0xffdd00);
          }
          continue;
        }
        const dRange = def.range || 200, dR2 = dRange * dRange;
        let dTarget = null, dBest = Infinity;
        for (const en of activeEnemies) {
          const dx = en.x - scene.player.x, dy = en.y - scene.player.y, d2 = dx * dx + dy * dy;
          if (d2 < dR2 && d2 < dBest) { dBest = d2; dTarget = en; }
        }
        if (dTarget) {
          let cnt = 0;
          const aoeR2 = (def.aoeRadius || 130) * (def.aoeRadius || 130);
          for (const en of activeEnemies) {
            const dx = en.x - dTarget.x, dy = en.y - dTarget.y;
            if (dx * dx + dy * dy <= aoeR2) cnt++;
          }
          if (cnt >= 2 || def.freeze) {
            scene.skillCooldowns[def.id] = skillNow + cd;
            const dlv = P.skillLevels?.[def.id] || 1;
            const dmg = Math.round(this.getScaledPlayerDamageBase() * def.baseDmg * (1 + (dlv - 1) * 0.18));
            this.doDomainSkill(dTarget.x, dTarget.y, dmg, def);
            scene.showSkillName(def.name, def.color || 0xffdd00);
          }
        }
      } else {
        let target = null, bestD2 = Infinity;
        const sRange = (def.range || 200) * (1 + (P.buff.rangeBoost || 0));
        const sR2 = sRange * sRange;
        for (const en of activeEnemies) {
          const dx = en.x - scene.player.x, dy = en.y - scene.player.y, d2 = dx * dx + dy * dy;
          if (d2 < sR2 && d2 < bestD2) { bestD2 = d2; target = en; }
        }
        if (target) {
          scene.skillCooldowns[def.id] = skillNow + cd;
          const angle = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, target.x, target.y);
          const lv = P.skillLevels?.[def.id] || 1;
          const mult = 1 + (P.buff.atkBoost || 0);
          const dmg = Math.round(this.getScaledPlayerDamageBase() * (def.baseDmg || 1) * (1 + (lv - 1) * 0.18) * mult);
          if (def.id === 'firedomain') {
            if (!this.castGiantSwordStrike(target, dmg, def)) {
              scene.skillCooldowns[def.id] = skillNow;
              continue;
            }
          } else if (def.type === 'multi') {
            this.doMultiProjectile(angle, dmg, def.count || 3, def.range, def.texture);
          } else {
            this.shootProjectile(def.id, angle, dmg, def.range);
          }
          scene.showSkillName(def.name, def.color || 0xffdd00);
        }
      }
    }
  }
}

/* ---- MainScene：地图、实体、对象池、输入绑定 ---- */
class MainScene extends Phaser.Scene {
  constructor(){ super({key:'main'}); }

  isMobileViewport() {
    const device = this.sys?.game?.device;
    const isMobileOs = !!(device?.os?.android || device?.os?.iOS || device?.os?.iPad);
    const hasTouch = !!(device?.input?.touch || navigator.maxTouchPoints > 0);
    return isMobileOs || hasTouch || window.innerWidth <= 900;
  }

  applyCameraProfile() {
    const cam = this.cameras.main;
    if (!cam) return;
    const mobile = this.isMobileViewport();
    cam.setZoom(mobile ? 0.8 : 1.2);
    cam.setLerp(mobile ? 0.11 : 0.08, mobile ? 0.11 : 0.08);
  }

  preload(){
    reportLoading(40, '生成纹理资源...');
    createGeneratedTextures(this);
    reportLoading(60, '纹理加载完成');
  }

  create(){
    setScene(this);
    reportLoading(65, '初始化场景...');
    this.worldSize = WORLD.size;
    this._currentMap = { worldSize: WORLD.size, safeRadius: WORLD.safeRadius, id:'hehuan', name:'古剑门', colorName:'#c9a96e' };
    this.physics.world.setBounds(0,0,this.worldSize,this.worldSize);
    this.ground = this.add.graphics();
    this.drawGround();
    this.player = this.physics.add.sprite(this.worldSize/2, this.worldSize/2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setData('baseScale', 1);
    this.playerDead = false;
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.applyCameraProfile();
    this.cameras.main.setBounds(0,0,this.worldSize,this.worldSize);
    this._onResizeCamera = () => this.applyCameraProfile();
    this.scale.on('resize', this._onResizeCamera);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this._onResizeCamera) this.scale.off('resize', this._onResizeCamera);
      this._onResizeCamera = null;
    });
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.enemyProjs = this.physics.add.group();
    this.hpBarGfx = this.add.graphics().setDepth(16);
    this.pool = {};
    installSceneSystems(this);
    this.physics.add.overlap(this.projectiles, this.enemies, (proj, en)=>{ this.combatSystem.onProjHit(proj, en); }, null, this);
    this.physics.add.overlap(this.player, this.enemies, (p, en)=>{ this.combatSystem.onEnemyContact(en); }, null, this);
    this.physics.add.overlap(this.player, this.enemyProjs, (p, proj)=>{ this.combatSystem.onEnemyProjHit(proj); }, null, this);
    this.isMoving = false;
    this.moveTarget = new Phaser.Math.Vector2(this.worldSize/2, this.worldSize/2);
    this.input.on('pointerdown', (ptr)=>{
      if(ptr.event.button===0){ this.isMoving=true; this.moveTarget.set(ptr.worldX,ptr.worldY); }
      else if(ptr.event.button===2){ this.placeMarker(ptr.worldX,ptr.worldY); }
    });
    this.input.on('pointerup', (ptr)=>{ if(ptr.event.button===0) this.isMoving=false; });
    this.input.on('pointermove', (ptr)=>{ if(this.isMoving) this.moveTarget.set(ptr.worldX,ptr.worldY); });
    this.input.mouse.disableContextMenu();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    this.input.keyboard.addKeys('SPACE,B,C,X,Z');
    this.input.keyboard.on('keydown-SPACE', toggleCultivate);
    this.input.keyboard.on('keydown-B', toggleCharPanel);
    this.input.keyboard.on('keydown-C', tryBreakthrough);
    this.input.keyboard.on('keydown-X', toggleShopPanel);
    this.skillCooldowns = {};
    for(const sk of SKILL_DEFS) this.skillCooldowns[sk.id] = 0;
    setSkillCooldowns(this.skillCooldowns);
    this.shieldOrbs = [];
    this.shieldTimer = 0;
    this.shieldReflect = 0;

    this.deathModal = getEl('deathModal');

    this.marker = null;
    this.lastZoneId = null;
    this._wasInSafe = true;

    loadGame();
    reportLoading(75, '加载存档...');
    recalcStats();
    bus.emit('hud-refresh');
    bus.emit('hotbar-refresh');
    reportLoading(85, '加载完成...');
    this.updateZoneLabel();

    // 挂载顶部/底部导航
    const uiLayer = document.querySelector('.ui-layer');
    if (uiLayer) {
      mountTopNav(uiLayer, ACTIONS);
      mountBottomNav(ACTIONS);
    }

    // 自动进入游戏并完成加载流程
    const doAutoStart = () => {
      reportLoading(100, '进入游戏...');
      this.startAdventure();
      const lbWrap = document.getElementById('loading-bar-wrap');
      const startBtn = document.getElementById('startBtn');
      if (lbWrap) lbWrap.classList.add('hidden');
      if (startBtn) { startBtn.style.display = 'none'; }
    };
    // 等待首帧渲染完成后自动进入
    setTimeout(doAutoStart, 400);
  }

  getSectSpawnPoint() {
    return { x: this.worldSize / 2, y: this.worldSize / 2 };
  }

  placeAtSect() {
    const p = this.getSectSpawnPoint();
    this.player.setPosition(p.x, p.y);
    this.moveTarget.set(p.x, p.y);
    this.lastZoneId = null;
    this._wasInSafe = true;
    this.updateZoneLabel();
  }

  drawGround(){
    const g = this.ground; g.clear();
    const s = this.worldSize;
    g.fillStyle(0xefe3c0, 1); g.fillRect(0, 0, s, s);
    for(const zone of ZONES){
      for(let x=0;x<s;x+=100){
        for(let y=0;y<s;y+=100){
          const cx=x+50,cy=y+50;
          const dist=Math.sqrt((cx-s/2)*(cx-s/2)+(cy-s/2)*(cy-s/2));
          if(dist>=zone.minDist&&dist<zone.maxDist){
            g.fillStyle(zone.color,0.12+Math.random()*0.06);
            g.fillRect(x-1,y-1,102,102);
          }
        }
      }
    }
    const r = WORLD.safeRadius;
    const half = s/2;
    g.fillStyle(0xf7edc8,0.82); g.fillRect(half-r, half-r, r*2, r*2);
    this._drawWorldGrid(g);
    g.lineStyle(3,0xb57a19,0.45); g.strokeRect(half-r, half-r, r*2, r*2);
    g.lineStyle(2,0xb99a59,0.15);
    for(let d=1200;d<4400;d+=600) g.strokeCircle(s/2,s/2,d);
    this._drawScenery(g);
  }

  _drawWorldGrid(g){
    const s = this.worldSize;
    const step = 100;
    g.lineStyle(1,0x8aa678,0.16);
    for(let v=0;v<=s;v+=step){
      g.lineBetween(v,0,v,s);
      g.lineBetween(0,v,s,v);
    }
  }

  _drawScenery(g){
    const s = this.worldSize;
    const center = s/2;
    const sr = WORLD.safeRadius;
    const h = (x,y)=>Math.abs(Math.sin(x*12.9898+y*78.233)*43758.5453)%1;

    for(let x=20;x<s;x+=80){
      for(let y=20;y<s;y+=80){
        if(Math.abs(x-center)<=sr+60&&Math.abs(y-center)<=sr+60) continue;
        const v = h(x,y);
        if(v<0.08){
          g.fillStyle(0x7a7a80,0.45); g.fillRect(x-12,y-8,24+Math.floor(v*20),16+Math.floor(v*10));
          g.fillStyle(0x9a9aa0,0.3); g.fillRect(x-8,y-12,16,8);
        }else if(v<0.11){
          g.fillStyle(0x5599cc,0.25); g.fillRect(x-40,y-15,80,30);
        }
      }
    }

    for(let i=0;i<6;i++){
      const sx=Phaser.Math.Between(sr+200,s-sr-200), sy=Phaser.Math.Between(sr+200,s-sr-200);
      g.fillStyle(0x667788,0.18); g.fillTriangle(sx,sy,sx-50,sy+120,sx+50,sy+120);
      g.fillStyle(0x8899aa,0.14); g.fillTriangle(sx-15,sy-40,sx,sy+60,sx+30,sy+60);
    }

    for(let i=0;i<4;i++){
      const sx=Phaser.Math.Between(sr+100,s-sr-100), sy=Phaser.Math.Between(sr+100,s-sr-100);
      g.fillStyle(0x889988,0.1); g.fillTriangle(sx,sy,sx-30,sy+80,sx+40,sy+80);
      g.fillStyle(0x99aa99,0.08); g.fillTriangle(sx-10,sy-20,sx+20,sy+50,sx+45,sy+50);
    }

    for(let ri=0;ri<3;ri++){
      let rx=Phaser.Math.Between(sr+150,s*0.6), ry=Phaser.Math.Between(sr+150,s-sr-150);
      g.lineStyle(8+Math.floor(h(rx,ry+ri*99)*10),0x5599cc,0.14);
      g.beginPath(); g.moveTo(rx,ry);
      for(let seg=0;seg<8;seg++){
        rx+=Phaser.Math.Between(-30,60); ry+=Phaser.Math.Between(-80,80);
        rx=Phaser.Math.Clamp(rx,50,s-50); ry=Phaser.Math.Clamp(ry,50,s-50);
        g.lineTo(rx,ry);
      }
      g.strokePath();
    }

    this._drawSectDecor(g);
  }

  _drawSectDecor(g){
    const c=this.worldSize/2, sr=WORLD.safeRadius;
    const h=(x,y)=>Math.abs(Math.sin(x*31.337+y*17.771)*43758.5453)%1;
    for(let x=c-sr+40;x<c+sr;x+=90){
      for(let y=c-sr+40;y<c+sr;y+=90){
        if(Math.abs(x-c)<sr*0.5&&Math.abs(y-c)<sr*0.5) continue;
        const v=h(x,y);
        if(v<0.15){
          g.fillStyle(0xc9a66b,0.35); g.fillRect(x-10,y-10,20,20);
          g.fillStyle(0xb89a5a,0.28); g.fillRect(x-8,y-20,8,14);
          g.fillStyle(0x8a6a3a,0.35); g.fillTriangle(x-12,y+10,x,y+10,x-6,y-2);
        }else if(v<0.28){
          g.fillStyle(0x7a5a3a,0.3); g.fillRect(x-4,y-4,8,14);
          g.fillStyle(0x9a7a5a,0.2); g.fillRect(x-6,y+10,12,4);
        }else if(v<0.38){
          g.fillStyle(0x5599cc,0.2); g.fillCircle(x,y,8+Math.floor(v*12));
          g.fillStyle(0x88aacc,0.1); g.fillCircle(x,y,14+Math.floor(v*12));
        }else if(v<0.48){
          g.fillStyle(0x66aa44,0.25); g.fillCircle(x,y,6+Math.floor(v*8));
          g.fillStyle(0x88cc66,0.15); g.fillCircle(x+3,y-2,4+Math.floor(v*6));
        }else if(v<0.55){
          g.fillStyle(0xd4b896,0.3); g.fillRect(x-14,y-2,28,4);
          g.fillStyle(0xc4a886,0.2); g.fillRect(x-10,y-6,6,12);
        }
      }
    }
    g.fillStyle(0xc9a96e,0.25);
    g.fillRect(c-14,c-14,28,28);
    g.fillStyle(0xd4b896,0.18);
    g.fillTriangle(c-18,c+14,c,c-8,c+18,c+14);
    g.lineStyle(2,0xd4b896,0.3);
    g.strokeRect(c-18,c-18,36,36);
    g.fillStyle(0xe8d5a8,0.18);
    for(let ax=-1;ax<=1;ax+=2){
      for(let ay=-1;ay<=1;ay+=2){
        g.fillRect(c+ax*30-10,c+ay*30-10,20,20);
        g.fillStyle(0xb89a5a,0.2); g.fillRect(c+ax*30-3,c+ay*30-18,6,12);
      }
    }
  }

  getCurrentZone(){
    const cx=this.player.x,cy=this.player.y;
    const s=this.worldSize/2;
    const dist=Math.sqrt((cx-s)*(cx-s)+(cy-s)*(cy-s));
    for(const zone of ZONES){ if(dist>=zone.minDist&&dist<zone.maxDist) return zone; }
    return ZONES[ZONES.length-1];
  }

  getZoneName(zone){
    return zone?.id === 'hehuan' ? '古剑门' : zone?.name;
  }

  _inSafeZone(){
    const c = this.worldSize/2;
    const r = WORLD.safeRadius;
    return Math.abs(this.player.x-c)<=r && Math.abs(this.player.y-c)<=r;
  }

  updateZoneLabel(){
    const zone = this.getCurrentZone();
    const el=getEl('zone-label');
    if(el){
      el.textContent=this.getZoneName(zone);
      el.style.color=zone.colorName||'#fff';
      el.classList.add('show');
    }
  }

  clearEnemies(){
    this.enemies.children.iterate((en)=>{
      if(!en) return;
      const lbl=en.getData && en.getData('label');
      if(lbl) lbl.destroy();
      const uw=en.getData && en.getData('ultWarning');
      if(uw) uw.destroy();
      en.destroy();
    });
    this.projectiles.children.iterate((p)=>{ if(p&&p.active) this.freeProj(p); });
    this.enemyProjs.children.iterate((p)=>{ if(p&&p.active) this.freeProj(p); });
    this.hpBarGfx.clear();
  }

  damageFlash(t){
    const el=getEl('damageFlash');
    if(!el)return;
    el.style.opacity='1';
    clearTimeout(el._to);
    el._to=setTimeout(()=>{el.style.opacity='0';},60);
  }

  teleportToZone(zoneId){
    const zone = ZONES.find(z => z.id === zoneId);
    if (!zone) return;
    const s = this.worldSize;
    const c = s / 2;
    const dist = zoneId === 'hehuan' ? 0 : (zone.minDist + zone.maxDist) / 2;
    const angle = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(c + Math.cos(angle) * dist, 30, s - 30);
    const y = Phaser.Math.Clamp(c + Math.sin(angle) * dist, 30, s - 30);
    this.player.setPosition(x, y);
    this.moveTarget.set(x, y);
    this.lastZoneId = null;
    this.updateZoneLabel();
    bus.emit('status', '📍 传送至 ' + this.getZoneName(zone), 2);
    bus.emit('save');
  }

  respawnPlayer(){
    P.hp=P.maxHp;
    this.playerDead=false;
    this.player.setAlpha(1);
    this.placeAtSect();
    if(this.deathModal)this.deathModal.classList.add('hidden');
    recalcStats();
    bus.emit('status','转生归来',1.5);
    bus.emit('hud-refresh');
    bus.emit('save');
  }

  placeMarker(x,y){
    if(this.marker)this.marker.destroy();
    this.marker=this.add.circle(x,y,12,0xfff4cc,1).setDepth(20);
    this.marker.setStrokeStyle(4,0xffa01f,1);
    this.tweens.add({ targets:this.marker, scale:1.35, alpha:0.88, yoyo:true, repeat:2, duration:180 });
    this.time.delayedCall(1200,()=>{if(this.marker){this.marker.destroy();this.marker=null;}});
  }

  /* ---- 弹丸对象池 ---- */
  getPooledProj(x, y, tex, group) {
    group = group || this.projectiles;
    const pool = this.pool[tex] || (this.pool[tex] = []);
    let p = pool.pop();
    if (p && p.scene) {
      const despawnTimer = p.getData('despawnTimer');
      if (despawnTimer?.remove) despawnTimer.remove(false);
      p.setActive(true).setVisible(true).setPosition(x, y);
      p.setAlpha(1).setScale(1).clearTint();
      p.setData('despawnTimer', null);
      if (p.body) { p.body.enable = true; p.body.reset(x, y); }
      return p;
    }
    p = group.create(x, y, tex);
    if (p && p.body) p.body.allowGravity = false;
    if (p) {
      p.setDepth(8);
      p.setData('despawnTimer', null);
    }
    return p;
  }

  scheduleProjFree(p, lifetime) {
    if (!p) return;
    const oldTimer = p.getData('despawnTimer');
    if (oldTimer?.remove) oldTimer.remove(false);
    const timer = this.time.delayedCall(lifetime, () => {
      if (p?.active) this.freeProj(p);
    });
    p.setData('despawnTimer', timer);
  }

  freeProj(p) {
    if (!p) return;
    const despawnTimer = p.getData('despawnTimer');
    if (despawnTimer?.remove) despawnTimer.remove(false);
    p.setData('despawnTimer', null);
    if (!p.active) return;
    p.setActive(false).setVisible(false);
    if (p.body) { p.body.enable = false; p.body.velocity.set(0, 0); }
    const tex = p.texture.key;
    (this.pool[tex] = this.pool[tex] || []).push(p);
  }

  updateFireballFields(){
    this.projectiles.children.iterate((proj)=>{
      if(!proj || !proj.active || proj.getData('skillId') !== 'fireball') return;
      if (proj.getData('noFireField')) return;
      const lastX = proj.getData('lastFireFieldX') ?? proj.x;
      const lastY = proj.getData('lastFireFieldY') ?? proj.y;
      const dx = proj.x - lastX;
      const dy = proj.y - lastY;
      if(dx * dx + dy * dy < 70 * 70) return;
      const dmg = proj.getData('damage') || 10;
      this.groundEffectSystem?.addFireField(proj.x, proj.y, dmg * 0.18, 10);
      proj.setData('lastFireFieldX', proj.x);
      proj.setData('lastFireFieldY', proj.y);
    });
  }

  applyBuffVisual(color){
    this.skillEffects?.onBuffCast(color || 0x66ffcc);
  }

  showSkillName(name, color){
    this.skillEffects?.showSkillName(name, color);
  }

  showWorldNotice(text, color = '#f7d98e'){
    if(!this.textPool || !this.player) return;
    this.textPool.show(this.player.x, this.player.y - 58, text, {
      fontSize: '16px',
      color,
      stroke: '#3f2d1d',
      strokeThickness: 3,
      depth: 28,
      floatDist: 52,
      duration: 1100
    });
  }

  doLightningEffect(success){
    const color=success?0xffdd44:0xff4444;
    for(let i=0;i<12;i++){
      const x=this.player.x+Phaser.Math.Between(-60,60);
      const y=this.player.y+Phaser.Math.Between(-120,0);
      const bolt=this.add.sprite(x,y,'bolt').setDepth(15).setScale(1+Math.random()*0.8);
      bolt.setTint(color);
      this.tweens.add({targets:bolt,alpha:0,y:y+80,scale:0.2,duration:300+Math.random()*200,delay:i*40,onComplete:()=>bolt.destroy()});
    }
  }

  update(time,delta){
    const dt=delta/1000;
    const { inSafe } = this.playerStatusSystem?.update(dt) || { inSafe: this._inSafeZone() };
    P.totalPlayTime += dt;
    if (!inSafe) this.spawnSystem.update(dt);
    this.movementSystem.update();
    this.entityAnimationSystem?.update(dt);
    if (this.playerDead) this.player.setVelocity(0, 0);
    this.cultivationProgressSystem?.update(dt);
    this.combatLoopSystem?.update(dt, time, inSafe);
    this.waveSystem.update(dt);
    this.uiTickSystem?.update(dt, time);
    this.defenseSystem?.update(dt);
  }

  startDefense() {
    this.defenseSystem?.start();
  }

  startAdventure() {
    const mainMenu = getEl('mainMenu');
    if (mainMenu) mainMenu.style.display = 'none';
    this.clearEnemies();
    this.placeAtSect();
    bus.emit('status', '已入古剑门，修行开始', 2);
  }

  startNextWave() {
    this.defenseSystem?.startNextWave();
  }

  checkWaveCleared() {
    this.defenseSystem?.checkWaveCleared();
  }
}

/* ---- 系统装配 ---- */
function installSceneSystems(scene) {
  scene.textPool = new TextPool(scene, 24);
  scene.skillEffects = new SkillEffects(scene);
  scene.entityAnimationSystem = new EntityAnimationSystem(scene);
  scene.groundEffectSystem = new GroundEffectSystem(scene);
  scene.sceneEffectsSystem = new SceneEffectsSystem(scene);
  scene.playerStatusSystem = new PlayerStatusSystem(scene);
  scene.movementSystem = new MovementSystem(scene);
  scene.cultivationProgressSystem = new CultivationProgressSystem(scene);
  scene.buffSystem = new BuffSystem(scene);
  scene.spawnSystem = new SpawnSystem(scene);
  scene.aiSystem = new AISystem(scene);
  scene.combatSystem = new CombatSystem(scene);
  scene.combatLoopSystem = new CombatLoopSystem(scene);
  scene.defenseSystem = new DefenseSystem(scene);
  scene.uiTickSystem = new UiTickSystem(scene);
  scene.waveSystem = new WaveSystem(scene);
}

/* ============================================================================
 * 区块 6：特效、对象池、碰撞、伤害、掉落与死亡流程
 * ========================================================================== */

/* ---- 浮动文字池 ---- */
class TextPool {
  constructor(scene, size = 24) {
    this.scene = scene;
    this.pool = [];
    this.ptr = 0;
    for (let i = 0; i < size; i++) {
      const txt = scene.add.text(0, 0, '', {
        fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(20).setActive(false).setVisible(false);
      this.pool.push(txt);
    }
  }

  _findSlot() {
    for (let i = 0; i < this.pool.length; i++) {
      const idx = (this.ptr + i) % this.pool.length;
      if (!this.pool[idx].active) {
        this.ptr = (idx + 1) % this.pool.length;
        return idx;
      }
    }
    const idx = this.ptr;
    this.ptr = (this.ptr + 1) % this.pool.length;
    return idx;
  }

  show(x, y, text, opts = {}) {
    const obj = this.pool[this._findSlot()];
    this.scene.tweens.getTweensOf(obj).forEach(t => t.stop());
    obj.setPosition(x, y);
    obj.setText(String(text));
    obj.setFontSize(opts.fontSize || '14px');
    obj.setColor(opts.color || '#ffffff');
    obj.setStroke(opts.stroke || '#000', opts.strokeThickness != null ? opts.strokeThickness : 1);
    obj.setDepth(opts.depth || 20);
    obj.setAlpha(1);
    obj.setActive(true).setVisible(true);
    const floatDist = opts.floatDist || 40;
    this.scene.tweens.add({
      targets: obj,
      y: y - floatDist,
      alpha: 0,
      duration: opts.duration || 800,
      onComplete: () => { obj.setActive(false).setVisible(false); }
    });
    return obj;
  }
}

/* ---- 技能特效 ---- */
const PROJECTILE_STYLE = {
  swordfly: { trail: 0x99ddff, glow: 0xdff7ff, scale: 0.72, pulse: false },
  fireball: { trail: 0xff7a32, glow: 0xffd199, scale: 1.12, pulse: true },
  thunderbolt: { trail: 0xffdd44, glow: 0xffffcc, scale: 1.1, pulse: false },
  thunder: { trail: 0xffdd44, glow: 0xffffcc, scale: 1.1, pulse: false },
  waterdomain: { trail: 0x80d8ff, glow: 0xd8f6ff, scale: 1.08, pulse: true },
  tornado: { trail: 0xcfe8c1, glow: 0xf5ffe8, scale: 1.12, pulse: true }
};

const DOMAIN_STYLE = {
  firedomain: { core: 0x7a1d12, stroke: 0xff5d2f, glow: 0xe23615, trail: 0xff8f4a, orbRadius: 20 },
  thunder: { core: 0x5a4312, stroke: 0xffcf3c, glow: 0xe39f1a, trail: 0xffe07d, orbRadius: 18 },
  hailstorm: { core: 0x8f1a1a, stroke: 0xff3f3f, glow: 0xff6b6b, trail: 0xff9e9e, orbRadius: 19 },
  default: { core: 0x444444, stroke: 0xffffff, glow: 0x999999, trail: 0xffffff, orbRadius: 17 }
};

function hex(color) {
  return '#' + (color || 0xffffff).toString(16).padStart(6, '0');
}

class SkillEffects {
  constructor(scene) {
    this.scene = scene;
    this.lowFxMode = this.detectLowFxMode();
    this.fxScale = this.lowFxMode ? 0.58 : 1;
    this.trailInterval = this.lowFxMode ? 92 : 52;
  }

  detectLowFxMode() {
    const device = this.scene?.sys?.game?.device;
    const isMobileOs = !!(device?.os?.android || device?.os?.iOS || device?.os?.iPad);
    const hasTouch = !!(device?.input?.touch || navigator.maxTouchPoints > 0);
    return isMobileOs || hasTouch || window.innerWidth <= 900;
  }

  fxCount(base, min = 1) {
    return Math.max(min, Math.round(base * this.fxScale));
  }

  isOnCamera(x, y, pad = 90) {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view) return true;
    return x >= view.x - pad && x <= view.right + pad && y >= view.y - pad && y <= view.bottom + pad;
  }

  onProjectileFired(proj, skillId, angle) {
    const style = PROJECTILE_STYLE[skillId] || { trail: 0xffffff, glow: 0xffffff, scale: 1, pulse: false };
    const customTint = proj.getData('customTint');
    const customTrailColor = proj.getData('customTrailColor');
    const projTint = customTint || style.glow || 0xffffff;
    const trailColor = customTrailColor || style.trail || style.glow || 0xffffff;
    proj.setScale(style.scale || 1);
    proj.setTint(projTint);
    proj.setData('skillId', skillId);
    proj.setData('trailColor', trailColor);
    proj.setData('lastTrailAt', 0);

    const flashRadius = skillId === 'fireball' ? 14 : 10;
    const flash = this.scene.add.circle(proj.x, proj.y, this.lowFxMode ? flashRadius * 0.8 : flashRadius, projTint, 0.34).setDepth(7);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.8,
      duration: 220,
      onComplete: () => flash.destroy()
    });

    if (style.pulse) {
      this.scene.tweens.add({
        targets: proj,
        scaleX: (style.scale || 1) * 1.2,
        scaleY: (style.scale || 1) * 1.2,
        duration: 160,
        yoyo: true,
        repeat: 2
      });
    }
  }

  updateProjectileTrails() {
    const now = this.scene.time.now;
    this.drawTrailForGroup(this.scene.projectiles, now);
    if (!this.lowFxMode) this.drawTrailForGroup(this.scene.enemyProjs, now, 0xff6666);
  }

  drawTrailForGroup(group, now, fallbackColor) {
    group.children.iterate((proj) => {
      if (!proj || !proj.active) return;
      if (!this.isOnCamera(proj.x, proj.y, 80)) return;
      const last = proj.getData('lastTrailAt') || 0;
      if (now - last < this.trailInterval) return;
      proj.setData('lastTrailAt', now);
      const color = proj.getData('trailColor') || fallbackColor || 0xffffff;
      const dot = this.scene.add.circle(proj.x, proj.y, this.lowFxMode ? 3.8 : 5, color, this.lowFxMode ? 0.18 : 0.22).setDepth(5);
      this.scene.tweens.add({
        targets: dot,
        alpha: 0,
        scale: 0.25,
        duration: 260,
        onComplete: () => dot.destroy()
      });
    });
  }

  onProjectileHit(x, y, skillId, isCrit) {
    const style = PROJECTILE_STYLE[skillId] || {};
    const color = isCrit ? 0xffdd44 : (style.trail || 0xffffff);
    const onCamera = this.isOnCamera(x, y, 120);
    const ring = this.scene.add.circle(x, y, isCrit ? 18 : 11, color, isCrit ? 0.26 : 0.18).setDepth(18);
    ring.setStrokeStyle(isCrit ? 3 : 2, color, isCrit ? 0.82 : 0.52);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: isCrit ? 1.9 : 1.45,
      duration: isCrit ? 360 : 240,
      onComplete: () => ring.destroy()
    });

    if (!onCamera) return;
    const sparkCount = this.fxCount(isCrit ? 8 : 4, isCrit ? 4 : 2);
    for (let i = 0; i < sparkCount; i++) {
      const spark = this.scene.add.circle(x, y, isCrit ? 3 : 2, color, 0.62).setDepth(19);
      const angle = Math.random() * Math.PI * 2;
      const dist = isCrit ? Phaser.Math.Between(20, 42) : Phaser.Math.Between(10, 24);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: isCrit ? 360 : 240,
        onComplete: () => spark.destroy()
      });
    }
  }

  getDomainOrbStyle(def = {}) {
    const preset = DOMAIN_STYLE[def.id];
    if (preset) return preset;
    const fallback = def.color || DOMAIN_STYLE.default.stroke;
    return {
      core: fallback,
      stroke: fallback,
      glow: fallback,
      trail: fallback,
      orbRadius: DOMAIN_STYLE.default.orbRadius
    };
  }

  launchDomainOrb(fromX, fromY, toX, toY, def, onImpact) {
    const style = this.getDomainOrbStyle(def);
    const orb = this.scene.add.circle(fromX, fromY, style.orbRadius, style.core, 0.96).setDepth(14);
    orb.setStrokeStyle(4, style.stroke, 0.92);
    const glow = this.scene.add.circle(fromX, fromY, style.orbRadius * 1.9, style.glow, 0.35).setDepth(13);
    const shell = this.scene.add.circle(fromX, fromY, style.orbRadius * 1.35, style.stroke, 0.18).setDepth(13);
    shell.setStrokeStyle(2, style.stroke, 0.72);
    const dist = Phaser.Math.Distance.Between(fromX, fromY, toX, toY);
    const duration = Phaser.Math.Clamp(Math.round(220 + dist * 0.55), 260, this.lowFxMode ? 520 : 620);
    const tracker = { x: fromX, y: fromY };

    this.scene.tweens.add({
      targets: [orb, shell],
      angle: 360,
      duration: 240,
      repeat: -1
    });
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.52,
      duration: 160,
      yoyo: true,
      repeat: -1
    });

    const trailTimer = this.scene.time.addEvent({
      delay: this.lowFxMode ? 58 : 38,
      loop: true,
      callback: () => {
        if (!orb.active) return;
        if (!this.isOnCamera(orb.x, orb.y, 110)) return;
        const trail = this.scene.add.circle(orb.x, orb.y, Phaser.Math.FloatBetween(4, 7), style.trail, 0.62).setDepth(12);
        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          scale: 0.2,
          duration: 220,
          onComplete: () => trail.destroy()
        });
      }
    });

    this.scene.tweens.add({
      targets: tracker,
      x: toX,
      y: toY,
      duration,
      ease: 'Cubic.In',
      onUpdate: () => {
        orb.setPosition(tracker.x, tracker.y);
        glow.setPosition(tracker.x, tracker.y);
        shell.setPosition(tracker.x, tracker.y);
      },
      onComplete: () => {
        trailTimer.remove(false);
        const impactX = tracker.x;
        const impactY = tracker.y;
        const onCamera = this.isOnCamera(impactX, impactY, 150);
        if (onCamera) {
          const burstCount = this.fxCount(12, 4);
          for (let i = 0; i < burstCount; i++) {
            const a = (i / burstCount) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.15, 0.15);
            const burst = this.scene.add.circle(impactX, impactY, Phaser.Math.FloatBetween(3, 5), style.trail, 0.9).setDepth(15);
            this.scene.tweens.add({
              targets: burst,
              x: impactX + Math.cos(a) * Phaser.Math.Between(26, 52),
              y: impactY + Math.sin(a) * Phaser.Math.Between(26, 52),
              alpha: 0,
              scale: 0.16,
              duration: Phaser.Math.Between(220, 340),
              onComplete: () => burst.destroy()
            });
          }
        }
        const shock = this.scene.add.circle(impactX, impactY, style.orbRadius * 1.2, style.stroke, 0.34).setDepth(14);
        shock.setStrokeStyle(4, style.stroke, 0.95);
        this.scene.tweens.add({
          targets: shock,
          alpha: 0,
          scale: this.lowFxMode ? 2.35 : 2.8,
          duration: this.lowFxMode ? 300 : 360,
          onComplete: () => shock.destroy()
        });
        orb.destroy();
        glow.destroy();
        shell.destroy();
        if (onImpact) onImpact(impactX, impactY);
      }
    });
  }

  castCrimsonLaserBurst(fromX, fromY, targets, color = 0xff1f1f) {
    const validTargets = (targets || []).filter((en) => en && en.active && !en.getData('dead'));
    if (!validTargets.length) return;
    const beamCount = this.lowFxMode ? Math.min(8, validTargets.length) : validTargets.length;
    for (let i = 0; i < beamCount; i++) {
      const target = validTargets[i];
      const dx = target.x - fromX;
      const dy = target.y - fromY;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const angle = Math.atan2(dy, dx);
      const midX = fromX + dx * 0.5;
      const midY = fromY + dy * 0.5;
      const coreWidth = this.lowFxMode ? 1.8 : 2.2;
      const glowWidth = this.lowFxMode ? 4.8 : 6.2;

      const core = this.scene.add.rectangle(midX, midY, dist, coreWidth, color, 0.92).setDepth(15);
      core.rotation = angle;
      const glow = this.scene.add.rectangle(midX, midY, dist, glowWidth, 0xff5454, 0.28).setDepth(14);
      glow.rotation = angle;

      this.scene.tweens.add({
        targets: [core, glow],
        alpha: 0,
        duration: this.lowFxMode ? 120 : 170,
        onComplete: () => {
          core.destroy();
          glow.destroy();
        }
      });

      const hit = this.scene.add.circle(target.x, target.y, this.lowFxMode ? 12 : 16, 0xff3838, 0.45).setDepth(16);
      hit.setStrokeStyle(2, 0xffb0b0, 0.9);
      this.scene.tweens.add({
        targets: hit,
        alpha: 0,
        scale: 1.8,
        duration: this.lowFxMode ? 170 : 230,
        onComplete: () => hit.destroy()
      });
    }
  }

  onDomainCast(x, y, def) {
    const radius = def.aoeRadius || 140;
    if (this.lowFxMode && !this.isOnCamera(x, y, radius, 180)) return;
    const style = this.getDomainOrbStyle(def);
    const color = style.stroke || def.color || 0xffee44;
    const fill = this.scene.add.circle(x, y, radius, style.core, 0.16).setDepth(6);
    const ring = this.scene.add.circle(x, y, radius * 0.65, style.glow, 0.1).setDepth(8);
    const edge = this.scene.add.circle(x, y, radius * 0.9, style.stroke, 0.04).setDepth(8);
    ring.setStrokeStyle(4, color, 0.76);
    edge.setStrokeStyle(3, style.stroke, 0.62);
    this.scene.tweens.add({
      targets: fill,
      alpha: 0,
      scale: 1.34,
      duration: 760,
      onComplete: () => fill.destroy()
    });
    this.scene.tweens.add({
      targets: [ring, edge],
      alpha: 0,
      scale: 1.8,
      rotation: 0.8,
      duration: 820,
      onComplete: () => {
        ring.destroy();
        edge.destroy();
      }
    });

    if (def.id === 'tornado') this.drawTornado(x, y, radius, color);
    else if (def.id === 'waterdomain') this.drawWaterDomain(x, y, radius, color);
    else if (def.id === 'firedomain') this.drawFireDomain(x, y, radius, style.stroke);
    else if (def.id === 'hailstorm') this.drawHailstorm(x, y, radius, style.stroke);
    else if (def.id === 'thunder') this.drawThunderDomain(x, y, radius, style.stroke);
  }

  drawTornado(x, y, radius, color) {
    const count = this.fxCount(14, 8);
    for (let i = 0; i < count; i++) {
      const a = i * 0.9;
      const r = 18 + i * radius / 18;
      const leaf = this.scene.add.circle(x + Math.cos(a) * r, y + Math.sin(a) * r, 3, color, 0.4).setDepth(9);
      this.scene.tweens.add({
        targets: leaf,
        angle: 240,
        x: x + Math.cos(a + 1.6) * (r * 0.45),
        y: y + Math.sin(a + 1.6) * (r * 0.45) - 18,
        alpha: 0,
        duration: 600,
        delay: i * 18,
        onComplete: () => leaf.destroy()
      });
    }
  }

  drawWaterDomain(x, y, radius, color) {
    for (let i = 0; i < 3; i++) {
      const wave = this.scene.add.circle(x, y, radius * (0.3 + i * 0.18), color, 0.02).setDepth(9);
      wave.setStrokeStyle(2, color, 0.24);
      this.scene.tweens.add({
        targets: wave,
        alpha: 0,
        scale: 1.8,
        duration: 520,
        delay: i * 110,
        onComplete: () => wave.destroy()
      });
    }
  }

  drawFireDomain(x, y, radius, color) {
    const palette = [0xff5d2f, 0xff8f4a, 0xc83018];
    const flameCount = this.fxCount(24, 10);
    for (let i = 0; i < flameCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(10, radius * 0.9);
      const flame = this.scene.add.circle(
        x + Math.cos(a) * r,
        y + Math.sin(a) * r,
        Phaser.Math.FloatBetween(4, 7),
        Phaser.Utils.Array.GetRandom(palette),
        0.86
      ).setDepth(10);
      flame.setStrokeStyle(2, 0xfff3a5, 0.8);
      this.scene.tweens.add({
        targets: flame,
        y: flame.y - Phaser.Math.Between(28, 56),
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(360, 680),
        delay: i * (this.lowFxMode ? 18 : 12),
        onComplete: () => flame.destroy()
      });
    }

    const blastCount = this.fxCount(4, 2);
    for (let i = 0; i < blastCount; i++) {
      const blast = this.scene.add.circle(x, y, radius * (0.22 + i * 0.1), color, 0.08).setDepth(9);
      blast.setStrokeStyle(3, 0xff9f66, 0.7 - i * 0.1);
      this.scene.tweens.add({
        targets: blast,
        alpha: 0,
        scale: 1.8 + i * 0.16,
        duration: 520 + i * 70,
        delay: i * 60,
        onComplete: () => blast.destroy()
      });
    }
  }

  drawHailstorm(x, y, radius, color) {
    const hailCount = this.fxCount(28, 10);
    for (let i = 0; i < hailCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(0, radius);
      const hx = x + Math.cos(a) * r;
      const hy = y + Math.sin(a) * r;
      const hail = this.scene.add.rectangle(hx, hy - 120, 4, Phaser.Math.FloatBetween(10, 18), 0xe6f8ff, 0.9).setDepth(12);
      hail.setStrokeStyle(1, color, 0.82);
      hail.rotation = Phaser.Math.FloatBetween(-0.35, 0.35);
      this.scene.tweens.add({
        targets: hail,
        y: hy,
        x: hx + Phaser.Math.FloatBetween(-8, 8),
        rotation: hail.rotation + Phaser.Math.FloatBetween(-0.35, 0.35),
        alpha: 0,
        duration: Phaser.Math.Between(220, 460),
        delay: i * (this.lowFxMode ? 24 : 18),
        onComplete: () => hail.destroy()
      });
    }

    const mistCount = this.fxCount(3, 2);
    for (let i = 0; i < mistCount; i++) {
      const mist = this.scene.add.circle(x, y, radius * (0.3 + i * 0.22), 0xa9ddff, 0.07).setDepth(10);
      mist.setStrokeStyle(2, 0xd8f5ff, 0.5 - i * 0.08);
      this.scene.tweens.add({
        targets: mist,
        alpha: 0,
        scale: 1.9,
        duration: 620 + i * 120,
        delay: i * 90,
        onComplete: () => mist.destroy()
      });
    }
  }

  drawThunderDomain(x, y, radius, color) {
    const ringCount = this.fxCount(6, 3);
    for (let i = 0; i < ringCount; i++) {
      const ring = this.scene.add.circle(x, y, 20 + i * 10, color, 0.12).setDepth(10);
      ring.setStrokeStyle(4, color, 0.8 - i * 0.08);
      this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scale: radius / (20 + i * 10),
        duration: 680,
        delay: i * 65,
        onComplete: () => ring.destroy()
      });
    }

    const arcCount = this.fxCount(22, 9);
    for (let i = 0; i < arcCount; i++) {
      const angle = (i / arcCount) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.16, 0.16);
      const delay = i * 16;
      this.drawThunderArc(x, y, angle, radius * Phaser.Math.FloatBetween(0.58, 1.08), color, delay);
    }

    const core = this.scene.add.circle(x, y, 24, 0xffee99, 0.66).setDepth(12);
    this.scene.tweens.add({
      targets: core,
      alpha: 0,
      scale: 2.8,
      duration: 360,
      onComplete: () => core.destroy()
    });
  }

  drawThunderArc(x, y, angle, length, color, delay) {
    const g = this.scene.add.graphics().setDepth(12);
    g.lineStyle(4, color, 0.95);
    g.beginPath();
    g.moveTo(x, y);
    const segments = 5;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const jitter = Phaser.Math.FloatBetween(-18, 18) * (1 - Math.abs(t - 0.5));
      const px = x + Math.cos(angle) * length * t + Math.cos(angle + Math.PI / 2) * jitter;
      const py = y + Math.sin(angle) * length * t + Math.sin(angle + Math.PI / 2) * jitter;
      g.lineTo(px, py);
    }
    g.strokePath();
    g.alpha = 0;
    this.scene.tweens.add({
      targets: g,
      alpha: 0.9,
      duration: 70,
      delay,
      yoyo: true,
      hold: 60,
      onComplete: () => g.destroy()
    });
  }

  onBuffCast(color) {
    const p = this.scene.player;
    const aura = this.scene.add.circle(p.x, p.y, 28, color || 0x66ffcc, 0.18).setDepth(4);
    aura.setStrokeStyle(2, color || 0x66ffcc, 0.38);
    this.scene.tweens.add({
      targets: aura,
      alpha: 0,
      scale: 2.6,
      duration: 620,
      onComplete: () => aura.destroy()
    });
  }

  onShieldCast(color) {
    const p = this.scene.player;
    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add.circle(p.x, p.y, 30 + i * 10, color || 0xffd700, 0.02).setDepth(11);
      ring.setStrokeStyle(2, color || 0xffd700, 0.28 - i * 0.05);
      this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scale: 1.7,
        duration: 520,
        delay: i * 80,
        onComplete: () => ring.destroy()
      });
    }
  }

  showSkillName(name, color) {
    this.scene.textPool.show(this.scene.player.x, this.scene.player.y - 40, name, {
      fontSize: '14px',
      color: hex(color),
      stroke: '#000',
      strokeThickness: 1,
      depth: 20,
      floatDist: 40,
      duration: 900
    });
  }
}

/* ---- 地面领域特效（火焰/雷电/冰霜） ---- */
class GroundEffectSystem {
  constructor(scene) {
    this.scene = scene;
    this.effects = [];
    this.frostTrail = null;
    this.lowFxMode = this.detectLowFxMode();
    this.fxScale = this.lowFxMode ? 0.56 : 1;
    this.maxEffects = this.lowFxMode ? 10 : 14;
  }

  detectLowFxMode() {
    const device = this.scene?.sys?.game?.device;
    const isMobileOs = !!(device?.os?.android || device?.os?.iOS || device?.os?.iPad);
    const hasTouch = !!(device?.input?.touch || navigator.maxTouchPoints > 0);
    return isMobileOs || hasTouch || window.innerWidth <= 900;
  }

  fxCount(base, min = 1) {
    return Math.max(min, Math.round(base * this.fxScale));
  }

  isOnCamera(x, y, radius = 0, pad = 130) {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view) return true;
    return x + radius >= view.x - pad
      && x - radius <= view.right + pad
      && y + radius >= view.y - pad
      && y - radius <= view.bottom + pad;
  }

  trimEffectCount() {
    while (this.effects.length >= this.maxEffects) {
      const oldest = this.effects.shift();
      if (oldest) this.destroyEffect(oldest);
    }
  }

  hasNearbyEffect(type, x, y, mergeDist) {
    const mergeD2 = mergeDist * mergeDist;
    return this.effects.some((effect) => {
      if (effect.type !== type) return false;
      const dx = effect.x - x;
      const dy = effect.y - y;
      return dx * dx + dy * dy < mergeD2;
    });
  }

  startFrostTrail(damage, duration = 5, radius = 74, freezeDuration = 1.2) {
    const player = this.scene?.player;
    if (!player) return;
    const safeRadius = Math.max(48, Math.round(radius));
    const step = this.lowFxMode ? Math.max(42, safeRadius * 0.72) : Math.max(34, safeRadius * 0.58);
    this.frostTrail = {
      ttl: Math.max(0.2, duration),
      damage: Math.max(1, Math.round(damage)),
      radius: safeRadius,
      freezeDuration: Math.max(0.4, freezeDuration || 1.2),
      step,
      lastX: player.x,
      lastY: player.y
    };
    this.addFrostField(
      player.x,
      player.y,
      safeRadius,
      this.frostTrail.damage,
      Math.min(2.6, duration),
      this.frostTrail.freezeDuration
    );
  }

  stopFrostTrail() {
    this.frostTrail = null;
  }

  updateFrostTrail(dt) {
    const trail = this.frostTrail;
    if (!trail) return;
    trail.ttl -= dt;
    const player = this.scene?.player;
    if (!player || trail.ttl <= 0) {
      this.stopFrostTrail();
      return;
    }
    const dx = player.x - trail.lastX;
    const dy = player.y - trail.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < trail.step) return;

    const steps = Math.min(6, Math.max(1, Math.floor(dist / trail.step)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const sx = trail.lastX + dx * t;
      const sy = trail.lastY + dy * t;
      this.addFrostField(
        sx,
        sy,
        trail.radius,
        trail.damage,
        Math.min(2.6, Math.max(1.4, trail.ttl + 0.6)),
        trail.freezeDuration
      );
    }
    trail.lastX = player.x;
    trail.lastY = player.y;
  }

  addFireField(x, y, damage, duration = 10, radius = 56) {
    if (this.hasNearbyEffect('fire', x, y, 42)) return;
    this.trimEffectCount();

    const gfx = this.scene.add.circle(x, y, radius, 0x5e170f, 0.32).setDepth(4);
    gfx.setStrokeStyle(4, 0xd1451e, 0.78);
    const core = this.scene.add.circle(x, y, radius * 0.5, 0xff5f2b, 0.3).setDepth(5);
    const glow = this.scene.add.circle(x, y, radius * 0.86, 0x992012, 0.2).setDepth(4);
    this.scene.tweens.add({
      targets: core,
      alpha: 0.48,
      scale: 1.35,
      duration: 460,
      yoyo: true,
      repeat: -1
    });
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.34,
      duration: 360,
      yoyo: true,
      repeat: -1
    });

    this.effects.push({
      type: 'fire',
      x,
      y,
      radius,
      damage,
      ttl: duration,
      tick: 0,
      emberTimer: 0,
      gfx,
      core,
      glow
    });
  }

  addThunderField(x, y, radius, damage, duration = 5) {
    if (this.hasNearbyEffect('thunder', x, y, Math.max(72, radius * 0.45))) return;
    this.trimEffectCount();
    const gfx = this.scene.add.circle(x, y, radius, 0x4f3a0f, 0.2).setDepth(5);
    gfx.setStrokeStyle(4, 0xf2bf2d, 0.82);
    const pulse = this.scene.add.circle(x, y, radius * 0.24, 0xffdc66, 0.28).setDepth(6);
    pulse.setStrokeStyle(3, 0xfff4c0, 0.8);
    const glow = this.scene.add.circle(x, y, radius * 0.6, 0x8a5f12, 0.18).setDepth(5);
    this.scene.tweens.add({
      targets: pulse,
      scale: radius / (radius * 0.24),
      alpha: 0.1,
      duration: 740,
      repeat: -1
    });
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.32,
      duration: 300,
      yoyo: true,
      repeat: -1
    });

    this.effects.push({
      type: 'thunder',
      x,
      y,
      radius,
      damage,
      ttl: duration,
      tick: 0,
      arcTimer: 0,
      sparkTimer: 0,
      gfx,
      core: pulse,
      glow
    });
  }

  addFrostField(x, y, radius, damage, duration = 8, freezeDuration = 1.2) {
    if (this.hasNearbyEffect('frost', x, y, Math.max(66, radius * 0.4))) return;
    this.trimEffectCount();
    const gfx = this.scene.add.circle(x, y, radius, 0x1d3966, 0.24).setDepth(5);
    gfx.setStrokeStyle(4, 0x6eaee8, 0.76);
    const core = this.scene.add.circle(x, y, radius * 0.46, 0x4d86bf, 0.24).setDepth(6);
    const ripple = this.scene.add.circle(x, y, radius * 0.32, 0xcff2ff, 0.2).setDepth(6);
    ripple.setStrokeStyle(2, 0xcff2ff, 0.7);
    this.scene.tweens.add({
      targets: core,
      alpha: 0.4,
      scale: 1.22,
      duration: 460,
      yoyo: true,
      repeat: -1
    });
    this.scene.tweens.add({
      targets: ripple,
      scale: radius / (radius * 0.32),
      alpha: 0,
      duration: 880,
      repeat: -1
    });

    this.effects.push({
      type: 'frost',
      x,
      y,
      radius,
      damage,
      ttl: duration,
      tick: 0,
      shardTimer: 0,
      freezeDuration,
      gfx,
      core,
      ripple
    });
  }

  addFrostRectField(x, y, length, width, rotation, damage, duration = 8, freezeDuration = 1.2) {
    if (this.hasNearbyEffect('frost_rect', x, y, Math.max(82, length * 0.35))) return;
    this.trimEffectCount();
    const safeLength = Math.max(120, length);
    const safeWidth = Math.max(48, width);
    const gfx = this.scene.add.rectangle(x, y, safeLength, safeWidth, 0x1d3966, 0.24).setDepth(5);
    gfx.setStrokeStyle(4, 0x6eaee8, 0.76);
    gfx.setRotation(rotation);
    const core = this.scene.add.rectangle(x, y, safeLength * 0.56, safeWidth * 0.58, 0x4d86bf, 0.24).setDepth(6);
    core.setRotation(rotation);
    const ripple = this.scene.add.rectangle(x, y, safeLength * 0.36, safeWidth * 0.34, 0xcff2ff, 0.18).setDepth(6);
    ripple.setStrokeStyle(2, 0xcff2ff, 0.68);
    ripple.setRotation(rotation);
    this.scene.tweens.add({
      targets: core,
      alpha: 0.4,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 460,
      yoyo: true,
      repeat: -1
    });
    this.scene.tweens.add({
      targets: ripple,
      scaleX: safeLength / Math.max(1, safeLength * 0.36),
      scaleY: safeWidth / Math.max(1, safeWidth * 0.34),
      alpha: 0,
      duration: 880,
      repeat: -1
    });

    this.effects.push({
      type: 'frost_rect',
      x,
      y,
      length: safeLength,
      width: safeWidth,
      halfLength: safeLength * 0.5,
      halfWidth: safeWidth * 0.5,
      rotation,
      cosA: Math.cos(rotation),
      sinA: Math.sin(rotation),
      radius: Math.max(safeLength, safeWidth) * 0.62,
      damage,
      ttl: duration,
      tick: 0,
      shardTimer: 0,
      freezeDuration,
      gfx,
      core,
      ripple
    });
  }

  update(dt) {
    this.updateFrostTrail(dt);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.ttl -= dt;
      effect.tick -= dt;

      if (effect.ttl <= 0) {
        this.destroyEffect(effect);
        this.effects.splice(i, 1);
        continue;
      }

      const visible = this.isOnCamera(effect.x, effect.y, effect.radius, 170);
      if (visible) {
        const ttlRatio = Math.max(0.12, Math.min(1, effect.ttl / 8));
        const alpha = effect.type === 'fire'
          ? 0.14 + ttlRatio * 0.2
          : (effect.type === 'frost' || effect.type === 'frost_rect')
            ? 0.12 + ttlRatio * 0.16
            : 0.1 + ttlRatio * 0.18;
        effect.gfx.setAlpha(alpha);
        effect.core.setAlpha(Math.min(0.54, alpha + (effect.type === 'fire' ? 0.16 : 0.18)));
        if (effect.glow?.active) effect.glow.setAlpha(Math.min(0.45, alpha + 0.1));
        if (effect.ripple?.active) effect.ripple.setAlpha(Math.min(0.42, alpha + 0.18));

        if (effect.type === 'fire') this.updateFireVisual(effect, dt);
        if (effect.type === 'thunder') this.updateThunderVisual(effect, dt);
        if (effect.type === 'frost' || effect.type === 'frost_rect') this.updateFrostVisual(effect, dt);
      }

      if (effect.tick <= 0) {
        if (effect.type === 'thunder') {
          this.applyDamageTick(effect, 'thunder');
          effect.tick = 0.7;
        } else if (effect.type === 'frost' || effect.type === 'frost_rect') {
          if (effect.type === 'frost_rect') {
            this.applyRectDamageTick(effect, 'hailstorm', (en) => {
              const remaining = en.getData('freezeTimer') || 0;
              en.setData('freezeTimer', Math.max(remaining, effect.freezeDuration || 1.2));
            });
          } else {
            this.applyDamageTick(effect, 'hailstorm', (en) => {
              const remaining = en.getData('freezeTimer') || 0;
              en.setData('freezeTimer', Math.max(remaining, effect.freezeDuration || 1.2));
            });
          }
          effect.tick = 0.72;
        } else {
          this.applyDamageTick(effect, 'fireball');
          effect.tick = 0.56;
        }
      }
    }
  }

  updateFireVisual(effect, dt) {
    effect.emberTimer -= dt;
    if (effect.emberTimer > 0) return;
    effect.emberTimer = this.lowFxMode ? 0.18 : 0.1;
    const count = this.fxCount(2, 1);
    const palette = [0xff5f2b, 0xff8c41, 0xd13b19];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(6, effect.radius * 0.82);
      const fx = effect.x + Math.cos(a) * r;
      const fy = effect.y + Math.sin(a) * r;
      const ember = this.scene.add.circle(fx, fy, Phaser.Math.FloatBetween(2.6, 4.6), Phaser.Utils.Array.GetRandom(palette), 0.84).setDepth(11);
      this.scene.tweens.add({
        targets: ember,
        y: fy - Phaser.Math.Between(20, 42),
        alpha: 0,
        scale: 0.15,
        duration: Phaser.Math.Between(280, 520),
        onComplete: () => ember.destroy()
      });
    }
  }

  updateThunderVisual(effect, dt) {
    effect.arcTimer -= dt;
    if (effect.arcTimer <= 0) {
      effect.arcTimer = this.lowFxMode ? 0.2 : 0.12;
      const angle = Math.random() * Math.PI * 2;
      const length = effect.radius * Phaser.Math.FloatBetween(0.45, 1.05);
      const g = this.scene.add.graphics().setDepth(12);
      g.lineStyle(this.lowFxMode ? 3 : 4, 0xffcf3a, 0.92);
      g.beginPath();
      g.moveTo(effect.x, effect.y);
      const segments = this.lowFxMode ? 4 : 5;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const jitter = Phaser.Math.FloatBetween(-20, 20);
        g.lineTo(
          effect.x + Math.cos(angle) * length * t + Math.cos(angle + Math.PI / 2) * jitter,
          effect.y + Math.sin(angle) * length * t + Math.sin(angle + Math.PI / 2) * jitter
        );
      }
      g.strokePath();
      this.scene.tweens.add({
        targets: g,
        alpha: 0,
        duration: 150,
        onComplete: () => g.destroy()
      });
    }

    effect.sparkTimer -= dt;
    if (effect.sparkTimer > 0) return;
    effect.sparkTimer = this.lowFxMode ? 0.24 : 0.16;
    const sparkCount = this.fxCount(2, 1);
    for (let i = 0; i < sparkCount; i++) {
      const burstA = Math.random() * Math.PI * 2;
      const burstR = Phaser.Math.FloatBetween(effect.radius * 0.25, effect.radius * 0.95);
      const spark = this.scene.add.circle(
        effect.x + Math.cos(burstA) * burstR,
        effect.y + Math.sin(burstA) * burstR,
        Phaser.Math.FloatBetween(2.8, 4.8),
        0xffe07a,
        0.86
      ).setDepth(12);
      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(150, 260),
        onComplete: () => spark.destroy()
      });
    }
  }

  updateFrostVisual(effect, dt) {
    effect.shardTimer -= dt;
    if (effect.shardTimer > 0) return;
    effect.shardTimer = this.lowFxMode ? 0.22 : 0.12;
    const count = this.fxCount(2, 1);
    for (let i = 0; i < count; i++) {
      let sx = effect.x;
      let sy = effect.y;
      let driftAngle = Math.random() * Math.PI * 2;
      if (effect.type === 'frost_rect') {
        const lx = Phaser.Math.FloatBetween(-effect.halfLength * 0.86, effect.halfLength * 0.86);
        const ly = Phaser.Math.FloatBetween(-effect.halfWidth * 0.86, effect.halfWidth * 0.86);
        sx = effect.x + lx * effect.cosA - ly * effect.sinA;
        sy = effect.y + lx * effect.sinA + ly * effect.cosA;
        driftAngle = effect.rotation + Phaser.Math.FloatBetween(-0.85, 0.85);
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Phaser.Math.FloatBetween(0, effect.radius * 0.8);
        sx = effect.x + Math.cos(a) * r;
        sy = effect.y + Math.sin(a) * r;
        driftAngle = a;
      }
      const shard = this.scene.add.rectangle(sx, sy, 4, Phaser.Math.Between(10, 16), 0xd6f4ff, 0.86).setDepth(12);
      shard.rotation = driftAngle + Math.PI / 2;
      this.scene.tweens.add({
        targets: shard,
        x: sx + Math.cos(driftAngle) * Phaser.Math.Between(8, 18),
        y: sy + Math.sin(driftAngle) * Phaser.Math.Between(8, 18),
        alpha: 0,
        scaleY: 0.2,
        duration: Phaser.Math.Between(260, 420),
        onComplete: () => shard.destroy()
      });
    }
  }

  applyDamageTick(effect, skillId, onHit) {
    const r2 = effect.radius * effect.radius;
    this.scene.enemies.children.iterate((en) => {
      if (!en || !en.active || en.getData('dead')) return;
      const dx = en.x - effect.x;
      const dy = en.y - effect.y;
      if (dx * dx + dy * dy <= r2) {
        this.scene.combatSystem.damageEnemy(en, Math.max(1, Math.round(effect.damage)), skillId);
        if (onHit) onHit(en);
      }
    });
  }

  applyRectDamageTick(effect, skillId, onHit) {
    const halfLength = effect.halfLength || 0;
    const halfWidth = effect.halfWidth || 0;
    const cosA = effect.cosA || 1;
    const sinA = effect.sinA || 0;
    this.scene.enemies.children.iterate((en) => {
      if (!en || !en.active || en.getData('dead')) return;
      const dx = en.x - effect.x;
      const dy = en.y - effect.y;
      const localX = dx * cosA + dy * sinA;
      const localY = -dx * sinA + dy * cosA;
      if (Math.abs(localX) <= halfLength && Math.abs(localY) <= halfWidth) {
        this.scene.combatSystem.damageEnemy(en, Math.max(1, Math.round(effect.damage)), skillId);
        if (onHit) onHit(en);
      }
    });
  }

  destroyEffect(effect) {
    if (effect.gfx?.active) effect.gfx.destroy();
    if (effect.core?.active) effect.core.destroy();
    if (effect.glow?.active) effect.glow.destroy();
    if (effect.ripple?.active) effect.ripple.destroy();
  }
}

/* ---- 场景氛围特效（按区域） ---- */
class SceneEffectsSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentZoneId = null;
    this.emitAcc = 0;
  }

  update(dt, zone) {
    if (!zone) return;
    if (zone.id !== this.currentZoneId) {
      this.currentZoneId = zone.id;
      this.emitAcc = 0;
    }
    const cfg = SCENE_EFFECTS[zone.id];
    if (!cfg) return;
    this.emitAcc += dt * cfg.rate;
    while (this.emitAcc >= 1) {
      this.emitAcc -= 1;
      this.spawn(cfg);
    }
  }

  spawn(cfg) {
    if (cfg.type === 'snow') this.spawnSnow(cfg.color);
    else if (cfg.type === 'ember') this.spawnEmber(cfg.color);
    else if (cfg.type === 'wisp') this.spawnWisp(cfg.color);
    else if (cfg.type === 'sword-glint') this.spawnSwordGlint(cfg.color);
    else if (cfg.type === 'mist') this.spawnMist(cfg.color);
    else if (cfg.type === 'spark') this.spawnSpark(cfg.color);
    else this.spawnPetal(cfg.color);
  }

  randomNearCamera(margin = 40) {
    const cam = this.scene.cameras.main;
    return {
      x: cam.scrollX + Phaser.Math.Between(-margin, cam.width + margin),
      y: cam.scrollY + Phaser.Math.Between(-margin, cam.height + margin)
    };
  }

  spawnSnow(color) {
    const cam = this.scene.cameras.main;
    const x = cam.scrollX + Phaser.Math.Between(-30, cam.width + 30);
    const y = cam.scrollY - Phaser.Math.Between(10, 80);
    const flake = this.scene.add.circle(x, y, Phaser.Math.FloatBetween(1.2, 2.5), color, 0.72).setDepth(30);
    this.scene.tweens.add({
      targets: flake,
      x: x + Phaser.Math.Between(-35, 35),
      y: y + cam.height + Phaser.Math.Between(60, 140),
      alpha: 0,
      duration: Phaser.Math.Between(2600, 4200),
      onComplete: () => flake.destroy()
    });
  }

  spawnEmber(color) {
    const cam = this.scene.cameras.main;
    const x = cam.scrollX + Phaser.Math.Between(-20, cam.width + 20);
    const y = cam.scrollY + cam.height + Phaser.Math.Between(5, 60);
    const ember = this.scene.add.circle(x, y, Phaser.Math.FloatBetween(1.4, 3.2), color, 0.65).setDepth(30);
    this.scene.tweens.add({
      targets: ember,
      x: x + Phaser.Math.Between(-50, 50),
      y: y - Phaser.Math.Between(180, 360),
      alpha: 0,
      scale: 0.25,
      duration: Phaser.Math.Between(1300, 2300),
      onComplete: () => ember.destroy()
    });
  }

  spawnWisp(color) {
    const p = this.randomNearCamera();
    const wisp = this.scene.add.circle(p.x, p.y, Phaser.Math.FloatBetween(3, 6), color, 0.18).setDepth(2);
    this.scene.tweens.add({
      targets: wisp,
      x: p.x + Phaser.Math.Between(-70, 70),
      y: p.y - Phaser.Math.Between(30, 100),
      alpha: 0,
      scale: 2.4,
      duration: Phaser.Math.Between(1800, 3000),
      onComplete: () => wisp.destroy()
    });
  }

  spawnSwordGlint(color) {
    const p = this.randomNearCamera();
    const glint = this.scene.add.rectangle(p.x, p.y, 18, 2, color, 0.58).setDepth(30);
    glint.rotation = Phaser.Math.FloatBetween(-0.7, 0.7);
    this.scene.tweens.add({
      targets: glint,
      alpha: 0,
      scaleX: 0.2,
      duration: Phaser.Math.Between(360, 700),
      onComplete: () => glint.destroy()
    });
  }

  spawnMist(color) {
    const p = this.randomNearCamera();
    const mist = this.scene.add.ellipse(p.x, p.y, Phaser.Math.Between(45, 85), Phaser.Math.Between(12, 24), color, 0.08).setDepth(1);
    this.scene.tweens.add({
      targets: mist,
      x: p.x + Phaser.Math.Between(-80, 80),
      alpha: 0,
      duration: Phaser.Math.Between(2000, 3400),
      onComplete: () => mist.destroy()
    });
  }

  spawnSpark(color) {
    const p = this.randomNearCamera();
    const spark = this.scene.add.rectangle(p.x, p.y, 3, 18, color, 0.62).setDepth(30);
    spark.rotation = Phaser.Math.FloatBetween(-0.4, 0.4);
    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      y: p.y + Phaser.Math.Between(25, 60),
      scaleY: 0.15,
      duration: Phaser.Math.Between(180, 360),
      onComplete: () => spark.destroy()
    });
  }

  spawnPetal(color) {
    const cam = this.scene.cameras.main;
    const x = cam.scrollX + Phaser.Math.Between(-30, cam.width + 30);
    const y = cam.scrollY - Phaser.Math.Between(0, 80);
    const petal = this.scene.add.ellipse(x, y, 5, 3, color, 0.46).setDepth(30);
    petal.rotation = Phaser.Math.FloatBetween(0, Math.PI);
    this.scene.tweens.add({
      targets: petal,
      x: x + Phaser.Math.Between(-70, 70),
      y: y + Phaser.Math.Between(180, 360),
      angle: Phaser.Math.Between(120, 360),
      alpha: 0,
      duration: Phaser.Math.Between(2200, 3600),
      onComplete: () => petal.destroy()
    });
  }
}

/* ---- 实体动画 ---- */
class EntityAnimationSystem {
  constructor(scene) {
    this.scene = scene;
    this.playerIdleTick = 0;
  }

  update(dt) {
    this.updatePlayer(dt);
    this.updateEnemies();
  }

  updatePlayer(dt) {
    const p = this.scene.player;
    if (!p || !p.active || this.scene.playerDead) return;

    const vx = p.body?.velocity?.x || 0;
    if (Math.abs(vx) > 3) p.setFlipX(vx < 0);

    this.playerIdleTick += dt;
    if (this.playerIdleTick > 0.55) {
      this.playerIdleTick = 0;
      this.playInnerPulse(p, 0xdfffd8, 0.14);
    }
  }

  updateEnemies() {
    this.scene.enemies.children.iterate((en) => {
      if (!en || !en.active || en.getData('dead')) return;
      const vx = en.body?.velocity?.x || 0;
      if (Math.abs(vx) > 2) en.setFlipX(vx < 0);
    });
  }

  playPlayerAttack(angle) {
    const p = this.scene.player;
    if (!p || !p.active) return;
    this.playInnerSlash(p, angle, 0xe8ffff);
  }

  playEnemyAttack(en) {
    if (!en || !en.active || en.getData('dead')) return;
    const angle = Phaser.Math.Angle.Between(en.x, en.y, this.scene.player.x, this.scene.player.y);
    this.playInnerSlash(en, angle, en.getData('projColor') || 0xffdd66);
  }

  playEnemyHit(en) {
    if (!en || !en.active || en.getData('dead')) return;
    this.playInnerPulse(en, 0xffffff, 0.28);
    this.playInnerCrack(en, 0xfff0aa);
  }

  playInnerPulse(sprite, color, alpha) {
    const r = Math.max(7, Math.min(sprite.displayWidth, sprite.displayHeight) * 0.28);
    const pulse = this.scene.add.circle(sprite.x, sprite.y, r, color, alpha).setDepth(sprite.depth + 1);
    this.scene.tweens.add({
      targets: pulse,
      alpha: 0,
      scale: 1.55,
      duration: 260,
      onUpdate: () => pulse.setPosition(sprite.x, sprite.y),
      onComplete: () => pulse.destroy()
    });
  }

  playInnerSlash(sprite, angle, color) {
    const len = Math.max(10, Math.min(sprite.displayWidth, sprite.displayHeight) * 0.46);
    const slash = this.scene.add.rectangle(sprite.x, sprite.y, len, 3, color, 0.72).setDepth(sprite.depth + 2);
    slash.rotation = angle;
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 0.35,
      duration: 180,
      onUpdate: () => slash.setPosition(sprite.x, sprite.y),
      onComplete: () => slash.destroy()
    });
  }

  playInnerCrack(sprite, color) {
    const r = Math.max(7, Math.min(sprite.displayWidth, sprite.displayHeight) * 0.24);
    const crack = this.scene.add.graphics().setDepth(sprite.depth + 2);
    crack.lineStyle(1, color, 0.65);
    crack.beginPath();
    crack.moveTo(sprite.x - r * 0.4, sprite.y - r * 0.3);
    crack.lineTo(sprite.x, sprite.y + r * 0.1);
    crack.lineTo(sprite.x + r * 0.35, sprite.y - r * 0.2);
    crack.strokePath();
    this.scene.tweens.add({
      targets: crack,
      alpha: 0,
      duration: 180,
      onComplete: () => crack.destroy()
    });
  }
}

/* ---- 碰撞、伤害、掉落与死亡流程（CombatSystem 通过薄封装调用） ---- */

/** 弹丸命中敌人：伤害 + 穿透/连击/火球特殊逻辑 */
function onProjHit(scene, proj, en) {
  if (!proj.active || !en || en.getData('dead')) return;
  const dmg = proj.getData('damage') || 10;
  const pierce = proj.getData('pierce');
  const skillId = proj.getData('skillId');
  if (skillId === 'fireball' && proj.getData('growingFireball')) {
    let hitTargets = proj.getData('hitTargets');
    if (!(hitTargets instanceof Set)) {
      hitTargets = new Set();
      proj.setData('hitTargets', hitTargets);
    }
    if (hitTargets.has(en)) return;
    hitTargets.add(en);
    damageEnemy(scene, en, dmg, skillId);
    proj.setData('fireballTrackArmed', true);
    proj.setData('targetRef', null);
    if (proj.body) {
      const v = proj.body.velocity;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y);
      if (speed > 1) {
        proj.x += (v.x / speed) * 6;
        proj.y += (v.y / speed) * 6;
      }
    }
    return;
  }
  const swordMaxHits = proj.getData('maxHits') || 0;
  if (skillId === 'swordfly' && swordMaxHits > 0) {
    if (!combatSystemIsEnemyVisible(scene.combatSystem, en)) return;
    const nowMs = scene.time.now;
    const lastHitAtMs = proj.getData('lastHitAtMs') || 0;
    if (nowMs - lastHitAtMs < SWORD_HIT_COOLDOWN_MS) return;
    proj.setData('lastHitAtMs', nowMs);
    damageEnemy(scene, en, dmg, skillId);
    const hitCount = (proj.getData('hitCount') || 0) + 1;
    proj.setData('hitCount', hitCount);
    const maxHits = swordMaxHits;
    if (hitCount >= maxHits) {
      scene.freeProj(proj);
      return;
    }
    proj.setData('targetRef', null);
    if (proj.body) {
      const v = proj.body.velocity;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y);
      if (speed > 1) {
        proj.x += (v.x / speed) * 8;
        proj.y += (v.y / speed) * 8;
      }
    }
    return;
  }
  damageEnemy(scene, en, dmg, skillId);
  if (skillId === 'fireball' && !proj.getData('noFireField')) {
    scene.groundEffectSystem?.addFireField(en.x, en.y, dmg * 0.18, 10);
  }
  if (!pierce) scene.freeProj(proj);
}

function combatSystemIsEnemyVisible(combatSystem, en, pad = 0) {
  if (!en || !en.active || en.getData('dead')) return false;
  const view = combatSystem?.scene?.cameras?.main?.worldView;
  if (!view) return true;
  return en.x >= view.x - pad && en.x <= view.right + pad && en.y >= view.y - pad && en.y <= view.bottom + pad;
}

/** 敌人弹丸命中玩家：扣血、死亡流程 */
function onEnemyProjHit(scene, proj) {
  if (!proj.active || scene.playerDead || scene._inSafeZone()) { scene.freeProj(proj); return; }
  const dmg = proj.getData('damage') || 8;
  const sd = P.buff.shieldPct > 0 ? (1 - P.buff.shieldPct) : 1;
  P.hp = Math.max(0, P.hp - Math.round(dmg * sd));
  scene.damageFlash(0.15);
  scene.freeProj(proj);
  if (P.hp <= 0 && !scene.playerDead) {
    scene.playerDead = true;
    scene.player.setAlpha(0.3); scene.player.setVelocity(0, 0); scene.isMoving = false;
    if (scene.playerAura) { scene.playerAura.destroy(); scene.playerAura = null; }
    if (scene.buffSystem) scene.buffSystem.destroyShieldVisual();
    if (scene.deathModal) scene.deathModal.classList.remove('hidden');
    const lostGold = Math.round(P.gold * 0.15);
    P.gold = Math.max(0, P.gold - lostGold);
    bus.emit('status', '💀 道殒！损失 ' + lostGold + ' 灵石', 3);
  }
  bus.emit('hud-refresh');
}

/** 敌人接触玩家：近战伤害、护盾反射、死亡流程 */
function onEnemyContact(scene, en) {
  if (en.getData('dead') || scene.playerDead || scene._inSafeZone()) return;
  const now = scene.time.now;
  const lastHit = en.getData('lastContactTime') || 0;
  if (now - lastHit < 600) return;
  en.setData('lastContactTime', now);
  scene.entityAnimationSystem?.playEnemyAttack(en);
  let atk = en.getData('atk') || 5;
  const shieldMult = P.buff.shieldPct > 0 ? (1 - P.buff.shieldPct) : 1;
  const dmg = Math.max(1, Math.round((atk * 0.5 - P.def * 0.3) * shieldMult));
  P.hp = Math.max(0, P.hp - dmg);
  if (scene.shieldReflect > 0) damageEnemy(scene, en, Math.round(scene.shieldReflect * (1 + P.level * 0.03)), 'swordshield');
  scene.damageFlash(0.25);
  if (P.hp <= 0 && !scene.playerDead) {
    scene.playerDead = true;
    scene.player.setAlpha(0.3);
    scene.player.setVelocity(0, 0);
    scene.isMoving = false;
    if (scene.playerAura) { scene.playerAura.destroy(); scene.playerAura = null; }
    if (scene.buffSystem) scene.buffSystem.destroyShieldVisual();
    const lostGold = Math.round(P.gold * 0.15);
    P.gold = Math.max(0, P.gold - lostGold);
    if (scene.deathModal) scene.deathModal.classList.remove('hidden');
    bus.emit('status', '💀 道殒！损失 ' + lostGold + ' 灵石', 3);
  }
  bus.emit('hud-refresh');
}

/** 飞剑吸血（仅飞剑系技能） */
function applySwordLifesteal(scene, skillId, dealtDamage) {
  if (skillId !== 'swordfly') return;
  if (scene.playerDead) return;
  const lifestealPct = Math.max(0, (P.buff.lifestealPct || 0) + (P.mods?.lifestealPct || 0));
  if (lifestealPct <= 0) return;
  if (P.hp >= P.maxHp) return;
  const heal = Math.max(1, Math.round(dealtDamage * lifestealPct));
  const beforeHp = P.hp;
  P.hp = Math.min(P.maxHp, P.hp + heal);
  const actualHeal = Math.max(0, P.hp - beforeHp);
  if (actualHeal <= 0) return;
  scene.textPool.show(scene.player.x + Phaser.Math.Between(-6, 6), scene.player.y - 34, '+' + actualHeal, {
    fontSize: '14px',
    color: '#ff6b6b',
    stroke: '#000',
    strokeThickness: 2,
    depth: 21,
    floatDist: 30,
    duration: 620
  });
}

/** 对敌人造成伤害；击杀后结算经验、金币、掉落、任务进度、升级与死亡动画 */
function damageEnemy(scene, en, dmg, skillId = null) {
  if (en.getData('dead')) return;
  const critChance = 0.15 + P.level * 0.003 + (P.mods?.critChance || 0);
  const isCrit = Math.random() < critChance;
  const finalDmg = isCrit ? Math.round(dmg * 2) : dmg;
  const hp = en.getData('hp') - finalDmg;
  en.setData('hp', hp);
  applySwordLifesteal(scene, skillId, finalDmg);
  scene.skillEffects?.onProjectileHit(en.x, en.y, skillId, isCrit);
  scene.entityAnimationSystem?.playEnemyHit(en);
  en.setTint(isCrit ? 0xffff44 : 0xffffff);
  scene.time.delayedCall(60, () => { if (en.active) en.clearTint(); });
  const dColor = isCrit ? '#ffd700' : '#b94a3e';
  const dSize = isCrit ? '18px' : '13px';
  scene.textPool.show(en.x + Phaser.Math.Between(-8, 8), en.y - 10, (isCrit ? '💥' : '') + '-' + finalDmg, {
    fontSize: dSize, color: dColor, stroke: '#000',
    strokeThickness: isCrit ? 3 : 2, depth: 20, floatDist: 35, duration: 700
  });
  if (hp <= 0) {
    en.setData('dead', true);
    const lbl = en.getData('label'); if (lbl) lbl.destroy();
    const ex = en.x, ey = en.y;
    const xp = Math.round((en.getData('xp') || 1) * (1 + (P.mods?.xpBonus || 0)));
    const gold = Math.round((en.getData('gold') || 1) * (1 + (P.mods?.goldBonus || 0)));
    const isBoss = en.getData('isBoss');
    const isElite = en.getData('isElite');
    en.setVelocity(0, 0); en.body.enable = false;
    scene.tweens.add({ targets: en, alpha: 0, duration: 250, onComplete: () => en.destroy() });
    scene.killStreak = (scene.killStreak || 0);
    const now = scene.time.now;
    if (now - (scene.lastKill || 0) < 3000) scene.killStreak++;
    else scene.killStreak = 1;
    scene.lastKill = now;
    const streakBonus = scene.killStreak >= 5 ? Math.round(xp * (scene.killStreak * 0.1)) : 0;
    P.xp += xp + streakBonus; P.gold += gold; P.kills++;
    P.totalGoldEarned = (P.totalGoldEarned || 0) + gold;
    recordEnemyKill(en);
    if (scene.killStreak >= 3) {
      scene.textPool.show(en.x, en.y - 30, '连杀x' + scene.killStreak + (streakBonus ? ' +' + streakBonus + 'exp' : ''), {
        fontSize: '16px', color: '#ff8844', stroke: '#000',
        strokeThickness: 2, depth: 20, floatDist: 50, duration: 1000
      });
    }
    while (P.xp >= P.xpToNext) {
      P.xp -= P.xpToNext; P.level += 1;
      P.attrPoints = (P.attrPoints || 0) + 3;
      P.skillPoints = (P.skillPoints || 0) + 1;
      P.xpToNext = Math.round(10 * Math.pow(1.15, P.level - 1));
      recalcStats();
      scene.textPool.show(scene.player.x, scene.player.y - 50, '🎉 LEVEL UP! Lv.' + P.level, {
        fontSize: '22px', color: '#ffd700', stroke: '#000',
        strokeThickness: 3, depth: 25, floatDist: 80, duration: 1500
      });
      bus.emit('status', '🎉 升级！当前Lv.' + P.level, 2);
    }
    const zoneLv = en.getData('zoneLv') || 1;
    recalcStats();
    const dropRate = Math.min(0.95, (isBoss ? 1.0 : (isElite ? 0.6 : 0.35)) + (P.mods?.dropRate || 0));
    if (Math.random() < dropRate) {
      const eq = genEquipment(zoneLv, isBoss ? 'legendary' : null);
      if (eq.rarity === 'legendary' || eq.rarity === 'mythic') P.legendaryFound = true;
      const result = acquireEquipment(P, eq);
      if (result.stored) {
        if (result.changed) recalcStats();
        bus.emit('loot', '🎁 获得 [' + RARITY_LABEL[eq.rarity] + '] ' + eq.name + (result.equipped ? '（已自动装备）' : ''));
        const spark = scene.add.circle(en.x, en.y, 20, RARITY_COLORS[eq.rarity] || 0xffffff, 0.5).setDepth(18);
        scene.tweens.add({ targets: spark, scale: 2.5, alpha: 0, duration: 500, onComplete: () => spark.destroy() });
      }
    }
    if (Math.random() < 0.1 && P.inventory.length < 30) {
      const dropGold = Math.round((10 + zoneLv * 5) * (isBoss ? 5 : 1) * (1 + (P.mods?.goldBonus || 0)));
      P.gold = Math.min(99999, P.gold + dropGold);
      P.totalGoldEarned = (P.totalGoldEarned || 0) + dropGold;
    }
    P.gold = Math.min(P.gold, 99999);
    bus.emit('hud-refresh');
    bus.emit('hotbar-refresh');
    bus.emit('save');
  }
}

/* ============================================================================
 * 区块 7：HUD、热栏、面板、导航与 DOM 渲染
 * ========================================================================== */

/* ---- 加载进度（无依赖，供启动流程调用） ---- */
let loadingBar = null;
let loadingWrap = null;
let loadingTextEl = null;

function ensureElements() {
  if (!loadingBar) loadingBar = document.getElementById('loading-bar-fill');
  if (!loadingWrap) loadingWrap = document.getElementById('loading-bar-wrap');
  if (!loadingTextEl) loadingTextEl = document.getElementById('loading-text');
}

function reportLoading(pct, text) {
  ensureElements();
  const progress = Math.min(100, Math.max(0, pct));
  if (loadingBar) loadingBar.style.width = progress + '%';
  if (loadingTextEl) loadingTextEl.textContent = text || '正在加载...';
}

function showLoadingBar() {
  ensureElements();
  if (loadingWrap) loadingWrap.classList.remove('hidden');
}

function hideLoadingBar() {
  ensureElements();
  if (loadingWrap) loadingWrap.classList.add('hidden');
}

function setStartBtnEnabled(enabled) {
  const btn = document.getElementById('startBtn');
  if (btn) btn.disabled = !enabled;
}

/* ---- 热栏 ---- */
function hotbarRender(){
  const cont = document.getElementById('hotbar');
  if(!cont) return;
  const sig = JSON.stringify(P.hotbar.map(h => h.id + '_' + (P.skillLevels?.[h.id] || 1)));
  if(sig === hotGen) return;
  setHotGen(sig);
  cont.innerHTML = '';
  P.hotbar.forEach((item,i)=>{
    const el = document.createElement('div');
    el.className = 'slot';
    let name='', meta='';
    if(item.kind==='skill'){
      const def = SKILL_DEFS.find(s=>s.id===item.id);
      if(def){
        name = def.short||def.name.charAt(0);
        meta = 'Lv.'+(P.skillLevels?.[def.id]||1);
      }
    }
    el.innerHTML = `<div class="n">${name}</div><div class="m">${meta}</div>`;
    cont.appendChild(el);
  });
}

/* ---- HUD ---- */
function updateHUD(){
  const rName = getRealm(P.realm).name;
  if(hudCache.realm !== rName){
    document.getElementById('realmText').textContent = rName;
    hudCache.realm = rName;
  }
  const stLabels = ['初期','初期','初期','中期','中期','中期','后期','后期','圆满'];
  const stageLbl = P.realm==='mortal'?'':(stLabels[Math.min(P.stage-1,8)]||'');
  document.getElementById('realmStageText').textContent = stageLbl;
  if(hudCache.level !== P.level){
    document.getElementById('levelText').textContent = 'Lv.'+P.level;
    hudCache.level = P.level;
  }
  const hpR = Math.round(P.hp), mhpR = Math.round(P.maxHp);
  if(hudCache.hp !== hpR || hudCache.maxHp !== mhpR){
    document.getElementById('hpText').textContent = hpR+'/'+mhpR;
    document.getElementById('hpFill').style.width = (P.hp/P.maxHp*100)+'%';
    hudCache.hp = hpR; hudCache.maxHp = mhpR;
  }
  if(hudCache.xp !== P.xp || hudCache.xpNext !== P.xpToNext){
    document.getElementById('xpText').textContent = P.xp+'/'+P.xpToNext;
    document.getElementById('xpFill').style.width = (P.xp/P.xpToNext*100)+'%';
    hudCache.xp = P.xp; hudCache.xpNext = P.xpToNext;
  }
  if(hudCache.gold !== P.gold){
    document.getElementById('moneyText').textContent = P.gold;
    hudCache.gold = P.gold;
  }
  if(hudCache.kills !== P.kills){
    document.getElementById('killText').textContent = P.kills;
    hudCache.kills = P.kills;
  }
}

function updateHotbarCooldowns(){
  const cont = document.getElementById('hotbar');
  if(!cont) return;
  const slots = cont.children;
  const cds = getSkillCooldowns();
  const scene = getScene();
  const now = scene?.time?.now ? scene.time.now/1000 : 0;
  for(let i=0;i<Math.min(5,slots.length);i++){
    const item = P.hotbar[i];
    if(item && item.kind==='skill' && item.id){
      const def = SKILL_DEFS.find(s=>s.id===item.id);
      const cdEnd = cds[item.id] || 0;
      const remain = Math.max(0, cdEnd - now);
      const metaEl = slots[i].querySelector('.m');
      if(metaEl){
        if(remain > 0.05){
          metaEl.textContent = remain.toFixed(1)+'s';
          slots[i].classList.add('cd');
        } else {
          metaEl.textContent = '就绪';
          slots[i].classList.remove('cd');
        }
      }
    }
  }
}

/* ---- 角色面板 ---- */
function toggleCharPanel(){
  const el = document.getElementById('charPanel');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) updateCharPanel();
}

function updateCharPanel(){
  const rt = (realmText||function(){return ''})();
  document.getElementById('cpRealm').textContent = rt;
  document.getElementById('cpLevel').textContent = 'Lv.'+P.level;
  document.getElementById('cpAtk').textContent = Math.round(P.atk);
  document.getElementById('cpDef').textContent = Math.round(P.def);
  document.getElementById('cpHP').textContent = Math.round(P.hp)+'/'+Math.round(P.maxHp);
  document.getElementById('cpSpeed').textContent = Math.round(P.speed);
  document.getElementById('cpAttrPoints').textContent = P.attrPoints || 0;
  document.getElementById('attr-str').textContent = P.attrs?.str || 0;
  document.getElementById('attr-body').textContent = P.attrs?.body || 0;
  document.getElementById('attr-spirit').textContent = P.attrs?.spirit || 0;
  document.getElementById('attr-agility').textContent = P.attrs?.agility || 0;
  for(const slot of EQ_TYPES){
    const eq = P.equipment[slot];
    const el = document.getElementById('eq-'+slot);
    if(eq){
      const rc = RARITY_COLORS[eq.rarity]||'#aab';
      const statsStr = Object.entries(getEffectiveEquipmentStats(eq)).map(([k,v])=>{
        const labels = {atk:'攻击',def:'防御',hp:'生命',speed:'速度'};
        return (labels[k]||k)+'+'+v;
      }).join(' ');
      const affix = (eq.affixes || []).map(formatAffix).join(' ');
      const setName = getSetName(eq);
      el.innerHTML = `<span style="color:${rc}">${RARITY_LABEL[eq.rarity]||''} ${eq.name} +${eq.enhance || 0}</span><br><span style="font-size:11px;color:var(--text-dim)">${statsStr}${setName ? ' · '+setName : ''}${affix ? ' · '+affix : ''}</span>`;
      el.className = 'val';
    } else {
      el.textContent = '空'; el.className = 'val empty';
    }
  }
}

function addAttr(attr){
  if((P.attrPoints || 0) <= 0) return;
  if(!P.attrs) P.attrs = {str:0, body:0, spirit:0, agility:0};
  P.attrs[attr] = (P.attrs[attr] || 0) + 1;
  P.attrPoints -= 1;
  recalcStats();
  updateHUD();
  updateCharPanel();
  bus.emit('save');
}

function toggleHudExpand() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  hud.classList.toggle('collapsed');
  const btn = document.getElementById('hud-toggle');
  if (btn) btn.textContent = hud.classList.contains('collapsed') ? '📊' : '📋';
}

/* ---- 背包 ---- */
function renderBagPanel(){
  document.getElementById('bagCount').textContent = P.inventory.length+'/30';
  const sellAllBtn = document.getElementById('bagSellAllBtn');
  const totalSellPrice = P.inventory.reduce((sum, item) => {
    if(!item) return sum;
    const price = item.stats ? Math.round(Object.values(item.stats).reduce((acc,val)=>acc+val,0)*2) : 3;
    return sum + price;
  }, 0);
  if(sellAllBtn){
    sellAllBtn.disabled = P.inventory.length === 0;
    sellAllBtn.textContent = P.inventory.length > 0 ? '一键售出(' + totalSellPrice + '💰)' : '一键售出';
  }
  const grid = document.getElementById('bagGrid');
  grid.innerHTML = '';
  P.inventory.forEach((item,i)=>{
    const d = document.createElement('div');
    d.className = 'inv-item rarity-'+(item.rarity||'common');
    const isEq = Object.values(P.equipment).some(e=>e&&e.id===item.id);
    let stats='';
    if(item.stats){
      const lb={atk:'攻',def:'防',hp:'命',speed:'速'};
      stats = Object.entries(getEffectiveEquipmentStats(item)).map(([k,v])=>(lb[k]||k)+'+'+v).join(' ');
    }
    d.innerHTML = `<div class="in">${item.name}</div><div class="im">${EQ_NAMES[item.type]||item.type||'道具'}</div><div class="is">${stats}</div>`;
    if(isEq) d.classList.add('equipped');
    d.addEventListener('click', (e)=>{ e.stopPropagation(); showBagMenu(i); });
    grid.appendChild(d);
  });
}

function showBagMenu(idx){
  const old = document.getElementById('bagMenuOverlay');
  if(old) old.remove();
  const item = P.inventory[idx];
  if(!item) return;
  const eqType = EQ_TYPES.includes(item.type);
  const overlay = document.createElement('div');
  overlay.id = 'bagMenuOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:30;pointer-events:auto;';
  overlay.addEventListener('click', ()=>overlay.remove());
  const box = document.createElement('div');
  box.className = 'panel';
  box.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:16px;min-width:240px;max-width:320px;pointer-events:auto;text-align:center;';
  box.addEventListener('click', (e)=>e.stopPropagation());
  const rc = eqType?(RARITY_COLORS[item.rarity]||'#aab'):'var(--text)';
  const rl = eqType?(RARITY_LABEL[item.rarity]||''):'';
  box.style.border = `2px solid ${rc}`;
  box.style.boxShadow = `0 4px 24px ${rc}44`;
  let html = `<div style="font-size:13px;color:${rc};margin-bottom:2px;">${rl}</div>`;
  html += `<div style="font-size:18px;font-weight:900;color:${rc};margin-bottom:4px;">${item.name}</div>`;
  html += `<div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">${EQ_NAMES[item.type]||item.type||'道具'}</div>`;
  if(eqType && item.stats){
    const cur = P.equipment[item.type];
    const labels = {atk:'攻击',def:'防御',hp:'生命',speed:'速度'};
    html += '<div style="text-align:left;font-size:12px;margin-bottom:10px;">';
    const itemStats = getEffectiveEquipmentStats(item);
    const curStats = getEffectiveEquipmentStats(cur);
    const allKeys = new Set([...Object.keys(itemStats), ...Object.keys(curStats)]);
    allKeys.forEach(k=>{
      const v = itemStats[k]||0;
      const cv = curStats[k]||0;
      const diff = v - cv;
      const diffStr = diff>0?`<span style="color:#4f8c48">↑${diff}</span>`:diff<0?`<span style="color:#b94a3e">↓${Math.abs(diff)}</span>`:'';
      const curStr = cur&&cv?` (${labels[k]||k} +${cv})`:'';
      html += `<div>${labels[k]||k} +${v} ${diffStr}<span style="color:var(--text-dim);font-size:10px;">${curStr}</span></div>`;
    });
    if(cur){
      html += `<div style="margin-top:4px;font-size:10px;color:var(--text-dim);">当前装备: ${cur.name}</div>`;
    }
    const setName = getSetName(item);
    if(setName) html += `<div style="font-size:11px;color:var(--gold);">套装: ${setName}</div>`;
    const affix = (item.affixes || []).map(formatAffix).join(' ');
    if(affix) html += `<div style="font-size:11px;color:var(--gold);">词条: ${affix}</div>`;
    html += '</div>';
  }
  const isEquipped = Object.values(P.equipment).some(e=>e&&e.id===item.id);
  if(eqType && !isEquipped){
    html += `<button class="btn btn-sm btn-gold" style="margin:3px;" data-action="doBagEquip" data-arg="${idx}">装备</button>`;
  }
  const sellPrice = item.stats ? Math.round(Object.values(item.stats).reduce((a,b)=>a+b,0)*2) : 3;
  html += `<button class="btn btn-sm btn-sec" style="margin:3px;" data-action="doBagSell" data-arg="${idx}">出售(${sellPrice}💰)</button>`;
  html += `<br><button class="btn btn-sm btn-sec" style="margin:3px;" data-action="closeBagMenu">取消</button>`;
  box.innerHTML = html;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function doBagEquip(idx){
  idx = Number(idx);
  const item = P.inventory[idx];
  if(!item || !EQ_TYPES.includes(item.type)) return;
  const current = P.equipment[item.type];
  P.equipment[item.type] = item;
  P.inventory.splice(idx,1);
  if(current) P.inventory.push(current);
  recalcStats();
  updateCharPanel(); updateHUD(); hotbarRender();
  const menu = document.getElementById('bagMenuOverlay'); if(menu) menu.remove();
  renderBagPanel();
  bus.emit('save');
  bus.emit('status', '装备 '+item.name,1.2);
}

function doBagSell(idx){
  idx = Number(idx);
  const item = P.inventory[idx];
  if(!item) return;
  const sellPrice = item.stats ? Math.round(Object.values(item.stats).reduce((a,b)=>a+b,0)*2) : 3;
  P.inventory.splice(idx,1);
  P.gold = Math.min(99999, P.gold + sellPrice);
  updateHUD();
  const menu = document.getElementById('bagMenuOverlay'); if(menu) menu.remove();
  renderBagPanel();
  bus.emit('save');
  bus.emit('status', '出售 '+item.name+' +'+sellPrice+'灵石',1.2);
}

function sellAllBagItems(){
  if(P.inventory.length === 0){
    bus.emit('status', '背包里没有可出售的物品',1.2);
    return;
  }
  const totalSellPrice = P.inventory.reduce((sum, item) => {
    if(!item) return sum;
    const price = item.stats ? Math.round(Object.values(item.stats).reduce((acc,val)=>acc+val,0)*2) : 3;
    return sum + price;
  }, 0);
  const soldCount = P.inventory.length;
  P.inventory.length = 0;
  P.gold = Math.min(99999, P.gold + totalSellPrice);
  const menu = document.getElementById('bagMenuOverlay'); if(menu) menu.remove();
  updateHUD();
  renderBagPanel();
  bus.emit('save');
  bus.emit('status', '一键售出 '+soldCount+' 件物品 +'+totalSellPrice+'灵石',1.5);
}

function toggleBagPanel(){
  const el = document.getElementById('bagPanel');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) renderBagPanel();
}

/* ---- 技能面板 ---- */
function renderSkillPanel(){
  const list = document.getElementById('skillList');
  list.innerHTML = '';

  const qDef = SKILL_DEFS.find(s=>s.id==='swordfly');
  const qCard = document.createElement('div');
  qCard.className = 'skill-card';
  qCard.style.borderColor='var(--gold)';
  qCard.innerHTML = `<div class="sc-head"><span class="sc-name">${qDef.name}</span></div><div class="sc-desc">${qDef.desc} · 伤害x${qDef.baseDmg} · CD${qDef.cooldown}s · 射程${qDef.range}</div>`;
  list.appendChild(qCard);

  const allSwaps = SKILL_DEFS.filter(s=>s.id!=='swordfly');
  allSwaps.forEach(def=>{
    const cd = def.cooldown||0;
    let info = def.desc;
    if(def.baseDmg) info += ' · 伤害x'+def.baseDmg;
    info += ' · CD'+cd+'s';
    const card = document.createElement('div');
    card.className = 'skill-card';
    card.style.cssText = 'border-color:var(--gold);background:rgba(250,226,168,.15);';
    card.innerHTML = `
      <div class="sc-head"><span class="sc-name">${def.name}</span></div>
      <div class="sc-desc">${info}</div>`;
    list.appendChild(card);
  });
}

function toggleSkillPanel(){
  const el = document.getElementById('skillPanel');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) renderSkillPanel();
}

function showSlotPick(skillId){
  bus.emit('status', '当前版本无法切换技能', 1.5);
}

function equipSkill(skillId, slotIdx){
  bus.emit('status', '当前版本无法切换技能', 1.5);
}

function upgradeSkill(skillId){
  bus.emit('status', '当前版本无法升级技能', 1.5);
}

/* ---- 成就面板 ---- */
function renderAchPanel(){
  if(!ACHIEVEMENTS) return;
  const list = document.getElementById('achList');
  let done=0, total=ACHIEVEMENTS.length;
  list.innerHTML = '';
  ACHIEVEMENTS.forEach(a=>{
    const earned = P.achievements[a.id];
    const item = document.createElement('div');
    item.className = 'ach-item' + (earned?' done':'');
    const rwd = Object.entries(a.reward).map(([k,v])=>{
      const lb = {gold:'灵石',attrPoints:'属性点',skillPoints:'技能点'};
      return (lb[k]||k)+'+'+v;
    }).join(' ');
    item.innerHTML = `
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-info"><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>
      <div class="ach-reward">${earned?'✅ 已达成':'🎁 '+rwd}</div>`;
    if(earned) done++;
    list.appendChild(item);
  });
  document.getElementById('achSummary').textContent = '已完成 '+done+'/'+total;
}

function toggleAchPanel(){
  const el = document.getElementById('achPanel');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) renderAchPanel();
}

/* ---- 商店 ---- */
function renderShopPanel(){
  if(!SHOP_ITEMS) return;
  document.getElementById('shopGold').textContent = P.gold;
  const list = document.getElementById('shopList');
  list.innerHTML = '';
  SHOP_ITEMS.filter(item=>item.effect!=='skill_reset').forEach(item=>{
    const card = document.createElement('div');
    card.className = 'shop-item';
    card.innerHTML = `
      <div class="si-icon">${item.icon}</div>
      <div class="si-info"><div class="si-name">${item.name}</div><div class="si-desc">${item.desc}</div></div>
      <span class="si-cost">${item.cost}💰</span>
      <button class="btn btn-sm btn-gold" data-action="buyShopItem" data-arg="${item.id}" ${P.gold<item.cost?'disabled':''}>购买</button>`;
    list.appendChild(card);
  });
}

function toggleShopPanel(){
  const el = document.getElementById('shopPanel');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) renderShopPanel();
}

function buyShopItem(itemId){
  const item = SHOP_ITEMS?.find(s=>s.id===itemId);
  if(!item || P.gold < item.cost || P.inventory.length>=30) return;
  if(item.effect === 'skill_reset'){
    bus.emit('status', '当前版本无需技能洗点',1.2);
    return;
  }
  P.gold -= item.cost;
  if(item.effect === 'gold_bag'){
    P.gold = Math.min(99999, P.gold + 120);
      bus.emit('status', '获得120灵石!',1.2);
  } else if(item.effect === 'attr_reset'){
    let total = P.attrs.str + P.attrs.body + P.attrs.spirit + P.attrs.agility;
    P.attrs = {str:0,body:0,spirit:0,agility:0};
    P.attrPoints += total;
    recalcStats();
    bus.emit('status', '属性点已重置!',1.2);
  } else if(item.effect === 'skill_reset'){
    for(const sk of SKILL_DEFS){ const lv = P.skillLevels?.[sk.id]||1; P.skillPoints += Math.max(0,lv-1); P.skillLevels[sk.id]=1; }
    bus.emit('status', '技能点已重置!',1.2);
  } else if(item.effect?.startsWith('eq_box_')){
    const rarity = item.effect.replace('eq_box_','');
    const eq = genEquipment(rarity==='common'?2:(rarity==='uncommon'?4:(rarity==='rare'?7:(rarity==='epic'?12:18))), rarity);
    const result = acquireEquipment(P, eq);
    if(result.stored){
      if(eq && eq.id){ bus.emit('status', '获得 '+RARITY_LABEL[eq.rarity]+' '+eq.name + (result.equipped ? '，已自动装备' : ''),2); }
      if(result.changed) recalcStats();
    }
  }
  updateHUD(); renderShopPanel(); renderBagPanel();
  bus.emit('save');
}

/* ---- 玩法面板（材料/装备养成/炼丹/任务/秘境/长城/进阶/图鉴/天赋） ---- */
function renderGameplayPanel(){
  ensureProgressionState();
  const list = document.getElementById('gameplayList');
  if(!list) return;
  list.innerHTML = '';

  const materials = Object.entries(MATERIALS)
    .map(([id, name]) => `${name}: ${P.materials?.[id] || 0}`)
    .join('　');
  list.appendChild(sectionCard('材料', `<div class="sc-desc">${materials}</div>`));

  const eqRows = EQ_TYPES.map(slot => {
    const eq = P.equipment?.[slot];
    if(!eq) return `<div class="skill-card"><div class="sc-head"><span class="sc-name">${EQ_NAMES[slot]}</span></div><div class="sc-desc">未装备</div></div>`;
    const stats = getEffectiveEquipmentStats(eq);
    const statText = Object.entries(stats).map(([k,v]) => `${{atk:'攻',def:'防',hp:'命',speed:'速'}[k]||k}+${v}`).join(' ');
    const affix = (eq.affixes || []).map(formatAffix).join(' ');
    const setName = getSetName(eq);
    return `<div class="skill-card">
      <div class="sc-head"><span class="sc-name">${EQ_NAMES[slot]} ${eq.name} +${eq.enhance || 0}</span></div>
      <div class="sc-desc">${RARITY_LABEL[eq.rarity] || ''} ${setName ? ' · '+setName : ''} · ${statText}${affix ? ' · '+affix : ''}</div>
      <button class="btn btn-sm btn-gold" data-action="enhanceAndRefresh" data-arg="${slot}">强化</button>
      <button class="btn btn-sm btn-sec" data-action="reforgeAndRefresh" data-arg="${slot}">洗炼</button>
    </div>`;
  }).join('');
  list.appendChild(sectionCard('装备养成', eqRows));

  const recipeRows = RECIPES.map(r => `<div class="skill-card">
    <div class="sc-head"><span class="sc-name">${r.name}</span></div>
    <div class="sc-desc">${r.effect} · ${formatCost(r.cost)}</div>
    <button class="btn btn-sm btn-gold" data-action="craftAndRefresh" data-arg="${r.id}">炼制</button>
  </div>`).join('');
  list.appendChild(sectionCard('炼丹', recipeRows));

  const questRows = (P.quests || []).map(q => `<div class="skill-card">
    <div class="sc-head"><span class="sc-name">${q.name}</span><span>${q.progress || 0}/${q.target}</span></div>
    <div class="sc-desc">${q.type === 'boss' ? '击杀首领' : '击杀妖兽'} · 奖励灵石${q.reward.gold || 0}</div>
    <button class="btn btn-sm btn-gold" data-action="claimQuestAndRefresh" data-arg="${q.id}" ${q.progress >= q.target && !q.claimed ? '' : 'disabled'}>${q.claimed ? '已领取' : '领取'}</button>
  </div>`).join('');
  list.appendChild(sectionCard('宗门任务', questRows + `<button class="btn btn-sm btn-sec" data-action="resetQuestsAndRefresh">刷新任务</button>`));

  const dungeon = P.dungeon || {};
  list.appendChild(sectionCard('秘境副本', `<div class="skill-card">
    <div class="sc-head"><span class="sc-name">妖雾秘境</span><span>${dungeon.active ? (dungeon.kills || 0)+'/'+(dungeon.target || 0) : '未开启'}</span></div>
    <div class="sc-desc">限时清剿玩法雏形，完成后获得妖核、星尘、天赋点。</div>
    <button class="btn btn-sm btn-gold" data-action="dungeonAndRefresh" ${dungeon.active ? 'disabled' : ''}>进入秘境</button>
  </div>`));

  list.appendChild(sectionCard('剑气长城', `<div class="skill-card">
    <div class="sc-head"><span class="sc-name">镇守长城</span></div>
    <div class="sc-desc">从古剑门出发挑战兽潮波次，适合需要集中刷怪和材料时进入。</div>
    <button class="btn btn-sm btn-gold" data-action="enterDefense">前往镇守</button>
  </div>`));

  const skillRows = SKILL_EVOLUTIONS.map(ev => `<div class="skill-card">
    <div class="sc-head"><span class="sc-name">${ev.name}</span></div>
    <div class="sc-desc">${ev.desc} · ${formatCost(ev.cost)}</div>
    <button class="btn btn-sm btn-gold" data-action="evolveAndRefresh" data-arg="${ev.id}" ${P.skillEvolutions?.[ev.id] ? 'disabled' : ''}>${P.skillEvolutions?.[ev.id] ? '已进阶' : '进阶'}</button>
  </div>`).join('');
  list.appendChild(sectionCard('技能进阶', skillRows));

  const bestiaryEntries = Object.entries(P.bestiary || {})
    .sort((a,b) => (b[1].kills || 0) - (a[1].kills || 0))
    .slice(0, 10);
  const bestiaryRows = bestiaryEntries.length ? bestiaryEntries.map(([name, entry]) => `<div class="skill-card">
    <div class="sc-head"><span class="sc-name">${name}</span><span>${entry.kills || 0}杀</span></div>
    <div class="sc-desc">10杀可领取图鉴奖励：属性点+1、星尘+1。</div>
    <button class="btn btn-sm btn-gold" data-action="claimBestiaryAndRefresh" data-arg="${name}" ${(entry.kills || 0) >= 10 && !entry.rewardClaimed ? '' : 'disabled'}>${entry.rewardClaimed ? '已领取' : '领取'}</button>
  </div>`).join('') : '<div class="sc-desc">击杀怪物后解锁图鉴。</div>';
  list.appendChild(sectionCard('怪物图鉴', bestiaryRows));

  const talentRows = TALENTS.map(t => `<div class="skill-card">
    <div class="sc-head"><span class="sc-name">${t.name}</span></div>
    <div class="sc-desc">${t.desc} · 消耗${t.cost}天赋点</div>
    <button class="btn btn-sm btn-gold" data-action="learnTalentAndRefresh" data-arg="${t.id}" ${P.talents?.[t.id] ? 'disabled' : ''}>${P.talents?.[t.id] ? '已领悟' : '领悟'}</button>
  </div>`).join('');
  list.appendChild(sectionCard('境界天赋', `<div class="sc-desc">天赋点: ${P.talentPoints || 0}</div>${talentRows}`));
}

function sectionCard(title, innerHtml) {
  const wrap = document.createElement('div');
  wrap.className = 'skill-card';
  wrap.innerHTML = `<div class="sc-head"><span class="sc-name">${title}</span></div>${innerHtml}`;
  return wrap;
}

function toggleGameplayPanel(){
  const el = document.getElementById('gameplayPanel');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) renderGameplayPanel();
}

/* ---- 导航条 ---- */
function mountTopNav(container, actions) {
  if (!container) return;

  const navBar = document.getElementById('top-nav');
  if (navBar) navBar.remove();

  const newNav = document.createElement('div');
  newNav.id = 'top-nav';
  newNav.className = 'top-nav';

  const items = [
    ['角色', 'btn-gold', actions.toggleCharPanel],
    ['背包', 'btn-sec', actions.toggleBagPanel],
    ['技能', 'btn-sec', actions.toggleSkillPanel],
    ['玩法', 'btn-gold', actions.toggleGameplayPanel],
    ['成就', 'btn-sec', actions.toggleAchPanel],
    ['百宝阁', 'btn-gold', actions.toggleShopPanel],
    ['设置', 'btn-sec', actions.toggleSettingsPanel]
  ];

  for (const [label, tone, onClick] of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn-sm ${tone}`;
    button.textContent = label;
    button.addEventListener('click', onClick);
    newNav.appendChild(button);
  }

  container.appendChild(newNav);
}

function mountBottomNav(actions) {
  const cont = document.getElementById('bottom-nav');
  if (!cont) return;
  cont.innerHTML = '';

  const items = [
    ['🧑', '角色', actions.toggleCharPanel],
    ['🎒', '背包', actions.toggleBagPanel],
    ['📖', '技能', actions.toggleSkillPanel],
    ['🎮', '玩法', actions.toggleGameplayPanel],
    ['🏅', '成就', actions.toggleAchPanel],
    ['🏪', '商店', actions.toggleShopPanel],
    ['⚙️', '设置', actions.toggleSettingsPanel]
  ];

  for (const [icon, label, onClick] of items) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.innerHTML = `<span class="tab-icon">${icon}</span><span class="tab-label">${label}</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    cont.appendChild(btn);
  }
}

bus.on('hud-refresh', updateHUD);
bus.on('hotbar-refresh', hotbarRender);

/* ============================================================================
 * 区块 8：事件委托、键盘/鼠标/触摸/摇杆输入
 * ========================================================================== */

/* ---- 组合动作（原内联 onclick 多语句调用） ---- */
function enhanceAndRefresh(slot){ enhanceEquipped(slot); renderGameplayPanel(); updateCharPanel(); }
function reforgeAndRefresh(slot){ reforgeEquipped(slot); renderGameplayPanel(); updateCharPanel(); }
function craftAndRefresh(id){ craftRecipe(id); renderGameplayPanel(); }
function claimQuestAndRefresh(id){ claimQuest(id); renderGameplayPanel(); }
function resetQuestsAndRefresh(){ resetQuests(); renderGameplayPanel(); }
function evolveAndRefresh(id){ evolveSkill(id); renderGameplayPanel(); }
function claimBestiaryAndRefresh(name){ claimBestiaryReward(name); renderGameplayPanel(); }
function learnTalentAndRefresh(id){ learnTalent(id); renderGameplayPanel(); updateCharPanel(); }
function dungeonAndRefresh(){ startDungeon(); renderGameplayPanel(); }
function enterDefense(){ const sc = getScene(); if (sc) sc.startDefense(); toggleGameplayPanel(); }
function closeBagMenu(){ const m = document.getElementById('bagMenuOverlay'); if (m) m.remove(); }
function respawnPlayer(){ const sc = getScene(); if (sc) sc.respawnPlayer(); }
function reloadPage(){ location.reload(); }
function startAdventure(){ const sc = getScene(); if (sc) sc.startAdventure(); }

/* ---- 全局动作表：index.html 与 JS 生成的 data-action 统一入口 ---- */
const ACTIONS = {
  addAttr,
  buyShopItem,
  cancelBreakthrough,
  claimBestiaryAndRefresh,
  claimBestiaryReward,
  claimQuest,
  claimQuestAndRefresh,
  closeBagMenu,
  craftAndRefresh,
  craftRecipe,
  doBagEquip,
  doBagSell,
  doBreakthrough,
  dungeonAndRefresh,
  enhanceAndRefresh,
  enhanceEquipped,
  enterDefense,
  equipSkill,
  evolveAndRefresh,
  evolveSkill,
  exportSaveData,
  importSaveData,
  learnTalent,
  learnTalentAndRefresh,
  manualSave,
  reforgeAndRefresh,
  reforgeEquipped,
  reloadPage,
  renderGameplayPanel,
  resetGameData,
  resetQuests,
  resetQuestsAndRefresh,
  respawnPlayer,
  sellAllBagItems,
  showSlotPick,
  startAdventure,
  startDungeon,
  toggleAchPanel,
  toggleBagPanel,
  toggleCharPanel,
  toggleCultivate,
  toggleGameplayPanel,
  toggleHudExpand,
  toggleSettingsPanel,
  toggleShopPanel,
  toggleSkillPanel,
  tryBreakthrough,
  upgradeSkill
};

/* ---- 统一事件委托：data-action -> ACTIONS ---- */
function bindActions() {
  document.addEventListener('click', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el) return;
    const fn = ACTIONS[el.getAttribute('data-action')];
    if (typeof fn !== 'function') return;
    const arg = el.getAttribute('data-arg');
    if (arg !== null) fn(arg);
    else fn();
  });
}

/* ---- 触摸设备标记与虚拟摇杆 ---- */
function markTouchDevice() {
  if (window.ontouchstart !== undefined || navigator.maxTouchPoints > 0) {
    document.body.classList.add('has-touch');
  }
}

class JoystickController {
  constructor(zone, thumb) {
    this.zone = zone;
    this.thumb = thumb;
    this.touchId = null;
    this.startX = 0;
    this.startY = 0;
  }

  mount() {
    if (!this.zone || !this.thumb) return;

    this.zone.addEventListener('touchstart', (e) => this.onStart(e));
    this.zone.addEventListener('touchmove', (e) => this.onMove(e));
    this.zone.addEventListener('touchend', (e) => this.onEnd(e));
    this.zone.addEventListener('touchcancel', (e) => this.onCancel(e));
  }

  onStart(e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    this.touchId = t.identifier;
    this.startX = t.clientX;
    this.startY = t.clientY;
    this.zone.classList.add('active');
  }

  onMove(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== this.touchId) continue;

      const dx = t.clientX - this.startX;
      const dy = t.clientY - this.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = 45;
      const clamp = Math.min(dist, maxR);
      const nx = dist > 0.01 ? dx / dist : 0;
      const ny = dist > 0.01 ? dy / dist : 0;

      this.thumb.style.transform = `translate(calc(-50% + ${clamp * nx}px), calc(-50% + ${clamp * ny}px))`;
      setJoystickDir({ x: nx, y: ny });
    }
  }

  onEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        e.preventDefault();
        this.reset();
      }
    }
  }

  onCancel(e) {
    e.preventDefault();
    this.reset();
  }

  reset() {
    this.touchId = null;
    this.thumb.style.transform = 'translate(-50%,-50%)';
    setJoystickDir(null);
    this.zone.classList.remove('active');
  }
}

/* ============================================================================
 * 区块 9：启动流程、错误处理与页面生命周期
 * ========================================================================== */

function mountJoystick() {
  const joyZone = document.getElementById('joystick-zone');
  const joyThumb = document.getElementById('joystick-thumb');
  new JoystickController(joyZone, joyThumb).mount();
}

function startGame() {
  const canvas = document.getElementById('gameCanvas');
  const game = new Phaser.Game(createGameConfig(canvas));
  setGame(game);
}

function showFatalError(err) {
  console.error('[九天仙途] 启动失败:', err);
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;z-index:999;background:#1a0a00;color:#ffd700;' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;' +
    'padding:24px;text-align:center;font-family:"Segoe UI","Microsoft YaHei",sans-serif;';
  div.innerHTML =
    '<div style="font-size:24px;font-weight:900;">九天仙途 启动失败</div>' +
    '<div style="font-size:13px;color:rgba(255,215,0,0.7);max-width:480px;line-height:1.8;">' +
    '游戏配置或资源加载失败，请通过静态服务器访问（例如在项目根目录执行 ' +
    '<code>python -m http.server</code>，然后打开 http://localhost:8000）。<br>' +
    '错误详情: ' + String(err && err.message ? err.message : err) + '</div>';
  document.body.appendChild(div);
}

function startGameFlow() {
  showLoadingBar();
  setStartBtnEnabled(false);
  reportLoading(5, '启动游戏引擎...');

  hotbarRender();
  updateHUD();
  reportLoading(20, '创建游戏场景...');

  startGame();
  mountJoystick();
}

/** 启动入口：加载并校验数据 -> 初始化状态 -> 绑定 UI/输入 -> 创建 Phaser 场景 */
async function boot() {
  try {
    DATA = await loadConfig();
  } catch (err) {
    showFatalError(err);
    return;
  }

  try {
    buildDataIndexes();
  } catch (err) {
    showFatalError(err);
    return;
  }

  refreshSkills();
  initHotbar();
  ensureProgressionState();
  bindActions();
  markTouchDevice();

  if (document.readyState === 'loading') {
    window.addEventListener('load', startGameFlow, { once: true });
  } else {
    startGameFlow();
  }
}

boot();

})();
