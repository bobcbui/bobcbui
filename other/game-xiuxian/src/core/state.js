/* ============================================================================
 * 全局状态：玩家属性（总等级永久加成 + 局内等级 + 卡牌加成）、
 * 局内等级/经验、关卡进度、成就判定
 * ----------------------------------------------------------------------------
 * 局内状态（level/xp/skills/mods）每关开始由 startRun() 重置；
 * 总等级（totalLevel/totalXp/maxClearedStage）跨关累积并持久化。
 * ========================================================================== */

import { bus } from '@/core/events.js';
import { ACHIEVEMENTS, PROGRESSION, EQ_TYPES } from '@/data/index.js';

export const P = {
  hp:100, maxHp:100,
  atk:10, def:0,
  level:1, xp:0, xpToNext:5,          // 局内等级（每关重置）
  totalLevel:1, totalXp:0, totalXpToNext:40,  // 游戏总等级（永久）
  stageLevel:1,                        // 当前进入的关卡
  maxClearedStage:0,                   // 最高通关关卡
  kills:0, totalKills:0,               // 局内击杀 / 累计击杀
  skills:[],                           // 已获得技能 id（自动轮转施放）
  skillLevels:{},                      // 技能卡等级
  mods:{ critChance:0, lifestealPct:0, xpBonus:0, cooldownReduction:0, skillDamage:0,
         multiShot:0, rangeBoost:0, swordAtkSpeedBoost:0, swordSpeed:0, maxHpBonus:0 },
  buffTimer:0, buff:{ speedBoost:0, shieldPct:0, atkBoost:0, rangeBoost:0,
                      swordAtkSpeedBoost:0, lifestealPct:0, swordColor:0, swordTrailColor:0 },
  equipment:{},                          // 已穿戴装备（6 部位）
  inventory:[],                          // 背包（上限 30）
  selectedStage:1,                       // 主页选中的关卡
  totalPlayTime:0,
  achievements:{}
};

/* ---- 运行期可变状态 ---- */
export let waveNum = 0;        // 当前波次（1..wavesPerStage）
export let wavePending = false;
export let statusTimer = 0;
export let lootTimer = 0;
export let autoSaveTimer = 0;
export let gameStarted = false;   // 局内进行中
export let runFinished = false;   // 本局已结算（防止重复结算）

export const hudCache = { hp:-1, maxHp:-1, xp:-1, xpNext:-1, level:-1, stage:-1, wave:-1, kills:-1, totalLevel:-1, totalXp:-1, totalXpNext:-1 };

export function setWaveNum(v){ waveNum = v; }
export function setWavePending(v){ wavePending = v; }
export function setStatusTimer(v){ statusTimer = v; }
export function setLootTimer(v){ lootTimer = v; }
export function setAutoSaveTimer(v){ autoSaveTimer = v; }
export function setGameStarted(v){ gameStarted = v; }
export function setRunFinished(v){ runFinished = v; }

/* ---- 经验曲线 ---- */
export function runXpToNext(level) {
  return PROGRESSION.runXpBase + level * PROGRESSION.runXpPerLevel;
}

export function totalXpToNext(level) {
  return PROGRESSION.totalXpBase + level * PROGRESSION.totalXpPerLevel;
}

/* ---- 属性重算：总等级永久加成 + 局内等级加成 + 卡牌加成 ---- */
export function recalcStats(){
  P.atk = PROGRESSION.baseAtk + (P.totalLevel - 1) * PROGRESSION.totalAtkPerLevel;
  P.maxHp = PROGRESSION.baseMaxHp + (P.totalLevel - 1) * PROGRESSION.totalHpPerLevel;
  P.atk += (P.level - 1) * PROGRESSION.runAtkPerLevel;
  P.maxHp += P.mods.maxHpBonus || 0;
  // 装备加成
  for (const slot of EQ_TYPES) {
    const eq = P.equipment?.[slot];
    if (!eq?.stats) continue;
    if (eq.stats.atk) P.atk += eq.stats.atk;
    if (eq.stats.def) P.def += eq.stats.def;
    if (eq.stats.hp) P.maxHp += eq.stats.hp;
    if (eq.stats.speed) P.speed += eq.stats.speed;
  }
  P.hp = Math.min(P.hp, P.maxHp);
}

/** 开始一局：局内状态全部重置为 1 级 */
export function startRun(stageLevel) {
  P.stageLevel = stageLevel;
  P.level = 1;
  P.xp = 0;
  P.xpToNext = runXpToNext(1);
  P.kills = 0;
  P.skills = [];
  P.skillLevels = {};
  P.mods = { critChance:0, lifestealPct:0, xpBonus:0, cooldownReduction:0, skillDamage:0,
             multiShot:0, rangeBoost:0, swordAtkSpeedBoost:0, swordSpeed:0, maxHpBonus:0 };
  P.buffTimer = 0;
  P.buff = { speedBoost:0, shieldPct:0, atkBoost:0, rangeBoost:0,
             swordAtkSpeedBoost:0, lifestealPct:0, swordColor:0, swordTrailColor:0 };
  recalcStats();
  P.hp = P.maxHp;
  setWaveNum(0);
  setWavePending(false);
  setGameStarted(true);
  setRunFinished(false);
}

/* ---- 成就（条件从 data.json 的结构化描述解释执行） ---- */
function checkAchievementCondition(cond, p) {
  if (!cond) return false;
  switch (cond.type) {
    case 'totalKills': return (p.totalKills || 0) >= (cond.value || 0);
    case 'totalLevel': return (p.totalLevel || 0) >= (cond.value || 0);
    case 'stageCleared': return (p.maxClearedStage || 0) >= (cond.value || 0);
    case 'playtime': return (p.totalPlayTime || 0) >= (cond.value || 0);
    default: return false;
  }
}

export function checkAchievements(){
  let changed = false;
  for(const a of ACHIEVEMENTS){
    if(P.achievements[a.id]) continue;
    if(!checkAchievementCondition(a.condition, P)) continue;
    P.achievements[a.id] = true;
    changed = true;
    if(a.reward.xp){ addTotalXp(a.reward.xp); }
    bus.emit('status', '🏅 成就达成: ' + a.name, 3);
    bus.emit('save');
  }
  if(changed){ bus.emit('hud-refresh'); }
}

/** 增加游戏总经验，处理总等级升级（永久属性加成自动生效） */
export function addTotalXp(amount) {
  P.totalXp += amount;
  while (P.totalXp >= P.totalXpToNext) {
    P.totalXp -= P.totalXpToNext;
    P.totalLevel += 1;
    P.totalXpToNext = totalXpToNext(P.totalLevel);
    recalcStats();
    bus.emit('status', '🎉 游戏总等级提升至 Lv.' + P.totalLevel + '！永久属性增强', 2.5);
  }
  bus.emit('hud-refresh');
}

bus.on('check-achievements', checkAchievements);
