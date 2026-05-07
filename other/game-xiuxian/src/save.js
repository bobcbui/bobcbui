import { P, waveNum, setWaveNum, recalcStats } from './state.js';

export function saveGame(){
  try {
    const data = {
      P: { hp:P.hp, maxHp:P.maxHp, qi:P.qi, maxQi:P.maxQi, atk:P.atk, def:P.def, speed:P.speed,
           realm:P.realm, stage:P.stage, level:P.level, xp:P.xp, xpToNext:P.xpToNext,
           gold:P.gold, kills:P.kills, skills:P.skills, hotbar:P.hotbar,
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
    setWaveNum(data.wave || 0);
    recalcStats();
    return true;
  } catch(e){ return false; }
}
