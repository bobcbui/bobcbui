import { P, waveNum, setWaveNum, recalcStats, refreshSkills, initHotbar } from './state.js';
import { SKILL_DEFS } from './data.js';

export function saveGame(){
  try {
    const data = {
      P: { hp:P.hp, maxHp:P.maxHp, qi:P.qi, maxQi:P.maxQi, atk:P.atk, def:P.def, speed:P.speed,
           realm:P.realm, stage:P.stage, level:P.level, xp:P.xp, xpToNext:P.xpToNext,
           gold:P.gold, kills:P.kills, attrPoints:P.attrPoints, skillPoints:P.skillPoints,
           attrs:P.attrs, skillLevels:P.skillLevels, skills:P.skills, hotbar:P.hotbar,
           equipment:P.equipment, inventory:P.inventory, totalPlayTime:P.totalPlayTime },
      wave: waveNum,
      version:1
    };
    localStorage.setItem('xiuxian_save', JSON.stringify(data));
    const n = document.getElementById('saveNotif');
    n.style.opacity='1'; setTimeout(()=>n.style.opacity='0',1200);
  } catch(e){}
}

export function loadGame(){
  try {
    const raw = localStorage.getItem('xiuxian_save');
    if(!raw) return false;
    const data = JSON.parse(raw);
    if(data.version!==1) return false;
    Object.assign(P, data.P);
    if(!P.attrs) P.attrs = { str:0, body:0, spirit:0, agility:0 };
    if(P.attrPoints == null) P.attrPoints = 0;
    if(P.skillPoints == null) P.skillPoints = 0;
    if(!P.skillLevels) P.skillLevels = {};
    for(const sk of SKILL_DEFS){
      if(!P.skillLevels[sk.id]) P.skillLevels[sk.id] = 1;
    }
    refreshSkills();
    const activeIds = new Set(SKILL_DEFS.map(s=>s.id));
    const invalidHotbar = !Array.isArray(P.hotbar) || P.hotbar.length < 8 || P.hotbar.slice(0,4).some(h=>h?.id && !activeIds.has(h.id));
    if(invalidHotbar) initHotbar();
    setWaveNum(data.wave || 0);
    recalcStats();
    return true;
  } catch(e){ return false; }
}
