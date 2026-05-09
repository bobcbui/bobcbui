import { bus } from './events.js';
import { P, isCultivating, breakPending, setIsCultivating, setBreakPending, recalcStats, refreshSkills, initHotbar } from './state.js';
import { getScene } from './runtime.js';
import { REALMS, getRealm, getRealmIndex } from '../data/index.js';

export function tryBreakthrough(){
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

export function doBreakthrough(){
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

export function cancelBreakthrough(){
  document.getElementById('breakthrough-box').classList.add('hidden');
  document.getElementById('breakthrough-overlay').classList.remove('show');
  setBreakPending(false);
}

export function toggleCultivate(){
  const newVal = !isCultivating;
  setIsCultivating(newVal);
  bus.emit('status', newVal ? '🧘 打坐修炼中...' : '停止修炼', newVal ? 2 : 1);
}

