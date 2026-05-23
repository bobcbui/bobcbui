import { P, recalcStats } from './state.js';
import { bus } from './events.js';
import { getScene } from './runtime.js';
import { EQ_TYPES, RARITY_LABEL } from '../data/index.js';

export const MATERIALS = {
  ore: '玄铁矿',
  herb: '灵草',
  core: '妖核',
  dust: '星尘'
};

export const AFFIXES = [
  { key:'critChance', name:'会心', min:0.02, max:0.06, suffix:'%' },
  { key:'lifestealPct', name:'吸血', min:0.01, max:0.03, suffix:'%' },
  { key:'dropRate', name:'寻宝', min:0.04, max:0.1, suffix:'%' },
  { key:'xpBonus', name:'悟性', min:0.04, max:0.1, suffix:'%' },
  { key:'goldBonus', name:'聚财', min:0.04, max:0.12, suffix:'%' },
  { key:'cooldownReduction', name:'灵转', min:0.02, max:0.06, suffix:'%' }
];

export const SET_LABELS = {
  sword: '万剑套',
  thunder: '九霄套',
  body: '玄体套'
};

export const RECIPES = [
  { id:'heal', name:'回春丹', cost:{ herb:3 }, effect:'立即恢复35%生命' },
  { id:'xp', name:'悟道丹', cost:{ herb:4, dust:1 }, effect:'获得当前等级经验' },
  { id:'battle', name:'战魄丹', cost:{ herb:2, core:1 }, effect:'获得1个技能点' }
];

export const TALENTS = [
  { id:'sword_1', name:'剑修入门', desc:'攻击+15，技能伤害+5%', cost:1 },
  { id:'body_1', name:'体修筑基', desc:'生命+120，防御+8', cost:1 },
  { id:'luck_1', name:'福缘深厚', desc:'掉落率+10%，金币+10%', cost:1 },
  { id:'dao_1', name:'悟道通明', desc:'经验+12%，冷却缩减+5%', cost:1 }
];

export const SKILL_EVOLUTIONS = [
  { id:'swordfly', name:'飞剑术·万剑', cost:{ dust:3, core:2 }, desc:'所有技能伤害+12%' },
  { id:'thunder', name:'雷域·九霄', cost:{ dust:4, core:2 }, desc:'会心率+8%' },
  { id:'hailstorm', name:'高能射线·星陨', cost:{ dust:5, ore:5 }, desc:'冷却缩减+8%' }
];

const QUEST_POOL = [
  { id:'kill_12', name:'清剿妖兽', type:'kill', target:12, reward:{ gold:80, materials:{ ore:2, herb:2 } } },
  { id:'kill_25', name:'宗门试炼', type:'kill', target:25, reward:{ gold:160, materials:{ core:2, dust:1 } } },
  { id:'boss_1', name:'斩妖首领', type:'boss', target:1, reward:{ gold:220, materials:{ core:3, dust:2 }, talentPoints:1 } }
];

export function ensureProgressionState() {
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

export function addMaterial(id, amount = 1) {
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

export function enhanceEquipped(slot) {
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

export function reforgeEquipped(slot) {
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

export function craftRecipe(recipeId) {
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

export function resetQuests() {
  P.quests = QUEST_POOL.map(q => ({ ...q, progress:0, done:false, claimed:false }));
  bus.emit('save');
}

export function claimQuest(questId) {
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

export function learnTalent(talentId) {
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

export function evolveSkill(skillId) {
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

export function startDungeon() {
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

export function recordEnemyKill(enemy) {
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

export function claimBestiaryReward(name) {
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

export function formatCost(cost) {
  return Object.entries(cost || {}).map(([id, amount]) => MATERIALS[id] + 'x' + amount).join(' ');
}

export function formatAffix(affix) {
  if(!affix) return '';
  return affix.name + '+' + Math.round(affix.value * 100) + '%';
}

export function getSetName(item) {
  return item?.setId ? (SET_LABELS[item.setId] || item.setId) : '';
}
