import { REALMS, SKILL_DEFS, EQ_TYPES, getRealm, getRealmIndex } from './data.js';

export const P = {
  hp:100, maxHp:100, qi:50, maxQi:50,
  atk:10, def:5, speed:180,
  realm:'mortal', stage:1,
  level:1, xp:0, xpToNext:10,
  gold:0, kills:0,
  skills:[],
  hotbar:[],
  equipment:{},
  inventory:[],
  buffTimer:0, buff:{ speedBoost:0, shieldPct:0 },
  totalPlayTime:0
};

export let waveNum = 0;
export let waveTimer = 0;
export let wavePending = false;
export let waveDelay = 8;
export let statusMsg = '';
export let statusTimer = 0;
export let lootMsg = '';
export let lootTimer = 0;
export let isCultivating = false;
export let cultProgress = 0;
export let breakPending = false;
export let autoSaveTimer = 0;

export let hotGen = -1;
export const hudCache = { realm:'',level:-1,hp:-1,maxHp:-1,qi:-1,maxQi:-1,xp:-1,xpNext:-1,gold:-1,kills:-1 };

export function setWaveNum(v){ waveNum = v; }
export function setWaveTimer(v){ waveTimer = v; }
export function setWavePending(v){ wavePending = v; }
export function setStatusTimer(v){ statusTimer = v; }
export function setLootTimer(v){ lootTimer = v; }
export function setIsCultivating(v){ isCultivating = v; }
export function setCultProgress(v){ cultProgress = v; }
export function setBreakPending(v){ breakPending = v; }
export function setAutoSaveTimer(v){ autoSaveTimer = v; }
export function setHotGen(v){ hotGen = v; }

export function recalcStats(){
  const r = getRealm(P.realm);
  const stageMult = (P.stage-1) / (r.stages-1 || 1);
  P.maxHp = 100 + r.hpBonus * (1 + stageMult * 0.5);
  P.maxQi = 50 + r.qiBonus * (1 + stageMult * 0.5);
  P.atk = 10 + r.atkBonus * (1 + stageMult * 0.5);
  P.def = 5 + r.defBonus * (1 + stageMult * 0.5);
  P.speed = 180 + (getRealmIndex(P.realm) * 10);
  for(const slot of EQ_TYPES){
    const eq = P.equipment[slot];
    if(!eq) continue;
    if(eq.stats.atk) P.atk += eq.stats.atk;
    if(eq.stats.def) P.def += eq.stats.def;
    if(eq.stats.hp) P.maxHp += eq.stats.hp;
    if(eq.stats.qi) P.maxQi += eq.stats.qi;
    if(eq.stats.speed) P.speed += eq.stats.speed;
  }
  P.hp = Math.min(P.hp, P.maxHp);
  P.qi = Math.min(P.qi, P.maxQi);
}

export function realmText(){
  const r = getRealm(P.realm);
  if(r.stages<=1) return r.name;
  const stageLabels = ['初期','初期','初期','中期','中期','中期','后期','后期','圆满'];
  const idx = Math.min(P.stage-1, stageLabels.length-1);
  return r.name + ' ' + stageLabels[idx];
}

export function refreshSkills(){
  const idx = getRealmIndex(P.realm);
  P.skills = [];
  for(const sk of SKILL_DEFS){
    const reqIdx = getRealmIndex(sk.realmReq);
    if(reqIdx < idx || (reqIdx === idx && sk.stageReq <= P.stage)){
      if(P.realm==='mortal' && sk.realmReq!=='mortal') continue;
      P.skills.push(sk.id);
    }
  }
  if(P.skills.length===0 && P.realm==='mortal') P.skills.push('fireball');
}

export function initHotbar(){
  const keyOrder = ['Q','W','E','R'];
  P.hotbar = [];
  for(let i=0;i<4;i++){
    const key = keyOrder[i];
    const candidates = SKILL_DEFS.filter(s=>s.key===key && P.skills.includes(s.id));
    if(candidates.length>0){
      const best = candidates[candidates.length-1];
      P.hotbar.push({ kind:'skill', id:best.id });
    } else {
      P.hotbar.push({ kind:'skill', id:null });
    }
  }
  for(let i=0;i<4;i++){
    P.hotbar.push({ kind:'consumable', idx:i });
  }
}

refreshSkills();
initHotbar();

window.realmText = realmText;
window.recalcStats = recalcStats;
window.refreshSkills = refreshSkills;
window.initHotbar = initHotbar;
