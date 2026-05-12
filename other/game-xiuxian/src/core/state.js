import { bus } from './events.js';
import { SKILL_DEFS, EQ_TYPES, getRealm, getRealmIndex, ACHIEVEMENTS } from '../data/index.js';

export const P = {
  hp:100, maxHp:100,
  atk:10, def:5, speed:240,
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
  buffTimer:0, buff:{ speedBoost:0, shieldPct:0, atkBoost:0, rangeBoost:0, swordAtkSpeedBoost:0, lifestealPct:0, swordColor:0, swordTrailColor:0 },
  totalPlayTime:0,
  totalGoldEarned:0, legendaryFound:false, maxWave:0,
  achievements:{}
};

export let baseHp = 100;
export let baseMaxHp = 100;
export let currentWave = 0;
export let wavePending = false;
export let waveDelayTimer = 0;

export let statusTimer = 0;
export let lootTimer = 0;
export let isCultivating = false;
export let cultProgress = 0;
export let breakPending = false;
export let autoSaveTimer = 0;

export function setBaseHp(v){ baseHp = Math.max(0, Math.min(baseMaxHp, v)); }
export function setBaseMaxHp(v){ baseMaxHp = v; }
export function setCurrentWave(v){ currentWave = v; }
export function setWavePending(v){ wavePending = v; }
export function setWaveDelayTimer(v){ waveDelayTimer = v; }

export let hotGen = -1;
export function setHotGen(v){ hotGen = v; }

export function setAutoSaveTimer(v){ autoSaveTimer = v; }
export function setStatusTimer(v){ statusTimer = v; }
export function setLootTimer(v){ lootTimer = v; }
export function setIsCultivating(v){ isCultivating = v; }
export function setCultProgress(v){ cultProgress = v; }
export function setBreakPending(v){ breakPending = v; }

export const hudCache = { realm:'',level:-1,hp:-1,maxHp:-1,xp:-1,xpNext:-1,gold:-1,kills:-1 };

export function recalcStats(){
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
    if(eq.stats.atk) P.atk += eq.stats.atk;
    if(eq.stats.def) P.def += eq.stats.def;
    if(eq.stats.hp) P.maxHp += eq.stats.hp;
    if(eq.stats.speed) P.speed += eq.stats.speed;
  }
  P.speed = Math.min(P.speed, 420);
  P.hp = Math.min(P.hp, P.maxHp);
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
  // Start with only the basic attack (swordfly). Other skills are learned via in-level draws
  P.hotbar.push({ kind: 'skill', id: 'swordfly' });
}

refreshSkills();
initHotbar();

export function checkAchievements(){
  for(const a of ACHIEVEMENTS){
    if(P.achievements[a.id]) continue;
    if(a.check(P)){
      P.achievements[a.id] = true;
      if(a.reward.gold){ P.gold = Math.min(99999, P.gold + a.reward.gold); P.totalGoldEarned = (P.totalGoldEarned||0) + a.reward.gold; }
      if(a.reward.attrPoints) P.attrPoints = (P.attrPoints||0) + a.reward.attrPoints;
      if(a.reward.skillPoints) P.skillPoints = (P.skillPoints||0) + a.reward.skillPoints;
      bus.emit('status', '🏅 成就达成: '+a.name, 3);
      bus.emit('save');
    }
  }
}

bus.on('check-achievements', checkAchievements);
