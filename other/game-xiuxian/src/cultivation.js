import { P, isCultivating, breakPending, setIsCultivating, setBreakPending } from './state.js';
import { REALMS, getRealm, getRealmIndex } from './data.js';

export function tryBreakthrough(){
  if(P.realm==='feisheng'){ const s=window.setStatus; if(s)s('已至飞升，大道已成！',2); return; }
  const idx = getRealmIndex(P.realm);
  const r = REALMS[idx];
  if(P.stage < r.stages){ const s=window.setStatus; if(s)s('境界尚未圆满，继续修炼',1.5); return; }
  const ss = window.setStatus;
  if(P.kills < r.reqKills){ if(ss)ss('杀敌不足 ('+P.kills+'/'+r.reqKills+')',1.5); return; }
  const btCost = 50 * (idx+1) * (idx+1);
  if(P.gold < btCost){ if(ss)ss('灵石不足 需要'+btCost,1.5); return; }
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
  const ss = window.setStatus;
  if(P.gold < btCost){ if(ss)ss('灵石不足',1.2); cancelBreakthrough(); return; }
  P.gold -= btCost;
  const chance = Math.min(90, 50 + idx*5);
  const roll = Math.random()*100;
  if(roll < chance){
    P.realm = next.id;
    P.stage = 1;
    P.hp = P.maxHp;
    P.qi = P.maxQi;
    const rfs=window.refreshSkills; if(rfs)rfs();
    const ih=window.initHotbar; if(ih)ih();
    if(ss)ss('🎉 突破成功！踏入 ' + next.name, 3);
    const sc = window.scene;
    if(sc && sc.doLightningEffect) sc.doLightningEffect(true);
  } else {
    if(ss)ss('💥 突破失败！天雷反噬', 2);
    P.hp = Math.max(1, P.hp - P.maxHp*0.3);
    const sc = window.scene;
    if(sc && sc.doLightningEffect) sc.doLightningEffect(false);
  }
  cancelBreakthrough();
  const rs=window.recalcStats; if(rs)rs();
  const h=window.updateHUD; if(h)h();
  const sg=window.saveGame; if(sg)sg();
}

export function cancelBreakthrough(){
  document.getElementById('breakthrough-box').classList.add('hidden');
  document.getElementById('breakthrough-overlay').classList.remove('show');
  setBreakPending(false);
}

export function toggleCultivate(){
  const newVal = !isCultivating;
  setIsCultivating(newVal);
  const ss = window.setStatus;
  if(ss)ss(newVal ? '🧘 打坐修炼中...' : '停止修炼', newVal ? 2 : 1);
}

window.tryBreakthrough = tryBreakthrough;
window.doBreakthrough = doBreakthrough;
window.cancelBreakthrough = cancelBreakthrough;
window.toggleCultivate = toggleCultivate;
