import { bus } from './events.js';
import { SKILL_DEFS, EQ_TYPES, getRealm, getRealmIndex, ACHIEVEMENTS } from '../data/index.js';
import { getEffectiveEquipmentStats } from './equipment.js';

export const P = {
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

export let waveNum = 0;
export let waveTimer = 0;
export let wavePending = false;
export let waveDelay = 8;
export let statusTimer = 0;
export let lootTimer = 0;
export let isCultivating = false;
export let cultProgress = 0;
export let breakPending = false;
export let autoSaveTimer = 0;
export let wallHp = 500;
export let wallMaxHp = 500;
export let defenseWave = 0;
export let gameStarted = false;
export const MAX_WAVES = 20;

export function setWallHp(v){ wallHp = v; if (wallHp < 0) wallHp = 0; }
export function setWallMaxHp(v){ wallMaxHp = v; }
export function setDefenseWave(v){ defenseWave = v; }
export function setGameStarted(v){ gameStarted = v; }
export function setAutoSaveTimer(v){ autoSaveTimer = v; }
export function setHotGen(v){ hotGen = v; }

export let hotGen = -1;
export const hudCache = { realm:'',level:-1,hp:-1,maxHp:-1,xp:-1,xpNext:-1,gold:-1,kills:-1 };

export function setWaveNum(v){ waveNum = v; }
export function setWaveTimer(v){ waveTimer = v; }
export function setWavePending(v){ wavePending = v; }
export function setStatusTimer(v){ statusTimer = v; }
export function setLootTimer(v){ lootTimer = v; }
export function setIsCultivating(v){ isCultivating = v; }
export function setCultProgress(v){ cultProgress = v; }
export function setBreakPending(v){ breakPending = v; }

export function recalcStats(){
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

export function realmText(){
  const r = getRealm(P.realm);
  if(r.stages<=1) return r.name;
  const stageLabels = ['初期','初期','初期','中期','中期','中期','后期','后期','圆满'];
  const idx = Math.min(P.stage-1, stageLabels.length-1);
  return r.name + ' ' + stageLabels[idx];
}

export function refreshSkills(){
  if(!P.skillLevels) P.skillLevels = {};
  P.skills = [];
  for(const sk of SKILL_DEFS){
    if(!P.skillLevels[sk.id]) P.skillLevels[sk.id] = 1;
    P.skills.push(sk.id);
  }
}

export function initHotbar(){
  P.hotbar = [];
  const current = P.hotbar?.[0];
  P.hotbar.push({ kind:'skill', id:'swordfly' });
  const swaps = SKILL_DEFS.filter(s=>s.id!=='swordfly');
  const slotKeys = ['W','E','R','T'];
  for(let i=0;i<4;i++){
    const existing = P.hotbar?.[i+1];
    if(existing && existing.id && swaps.some(s=>s.id===existing.id)){
      P.hotbar.push(existing);
    } else {
      const defaults = ['earthmove','firedomain','thunder','hailstorm'];
      P.hotbar.push({ kind:'skill', id:defaults[i]||swaps[i]?.id||null });
    }
  }
}

refreshSkills();
initHotbar();

export function checkAchievements(){
  let changed = false;
  for(const a of ACHIEVEMENTS){
    if(P.achievements[a.id]) continue;
    if(a.check(P)){
      P.achievements[a.id] = true;
      changed = true;
      if(a.reward.gold){ P.gold = Math.min(99999, P.gold + a.reward.gold); P.totalGoldEarned = (P.totalGoldEarned||0) + a.reward.gold; }
      if(a.reward.attrPoints) P.attrPoints = (P.attrPoints||0) + a.reward.attrPoints;
      if(a.reward.skillPoints) P.skillPoints = (P.skillPoints||0) + a.reward.skillPoints;
      bus.emit('status', '🏅 成就达成: '+a.name, 3);
      bus.emit('save');
    }
  }
  if(changed){ bus.emit('hud-refresh'); }
}

bus.on('check-achievements', checkAchievements);
