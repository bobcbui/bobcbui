import { P } from './state.js';

export function craftPill(type){
  const costs = { heal_pill:5, qi_pill:8, buff_pill:12 };
  const cost = costs[type];
  if(!cost) return;
  const ss = window.setStatus;
  if(P.gold < cost){ if(ss)ss('灵石不足('+cost+')',1.2); return; }
  if(P.inventory.length >= 30){ if(ss)ss('背包已满',1.2); return; }
  P.gold -= cost;
  const names = { heal_pill:'回血丹', qi_pill:'回灵丹', buff_pill:'爆气丹' };
  const uid = Date.now()+'_'+Math.random().toString(36).slice(2,6);
  P.inventory.push({ id:uid, name:names[type], type:'consumable', subType:type });
  for(let i=4;i<8;i++){
    const hot = P.hotbar[i];
    if(hot.kind==='consumable' && !hot.id){
      hot.id = type; hot.uid = uid; break;
    }
  }
  if(ss)ss('炼制 '+names[type]+' 成功',1.2);
  const h=window.updateHUD; if(h)h();
  const sg=window.saveGame; if(sg)sg();
}

export function useConsumable(slotIdx){
  const hot = P.hotbar[4+slotIdx];
  if(!hot || hot.kind!=='consumable') return;
  const ss = window.setStatus;
  const type = hot.id;
  if(type==='heal_pill'){
    P.hp = Math.min(P.hp + Math.round(P.maxHp*0.35), P.maxHp);
    if(ss)ss('服用回血丹 +'+Math.round(P.maxHp*0.35)+'hp',1.2);
    P.inventory = P.inventory.filter(i=>i.id!==hot.uid);
    hot.id = null; hot.uid = null;
    const h=window.updateHUD; if(h)h();
    const hr=window.hotbarRender; if(hr)hr();
  } else if(type==='qi_pill'){
    P.qi = Math.min(P.qi + Math.round(P.maxQi*0.4), P.maxQi);
    if(ss)ss('服用回灵丹 +'+Math.round(P.maxQi*0.4)+'qi',1.2);
    P.inventory = P.inventory.filter(i=>i.id!==hot.uid);
    hot.id = null; hot.uid = null;
    const h=window.updateHUD; if(h)h();
    const hr=window.hotbarRender; if(hr)hr();
  } else if(type==='buff_pill'){
    P.buffTimer = 8;
    P.buff.speedBoost = 0.3;
    P.buff.shieldPct = 0.25;
    if(ss)ss('服用爆气丹 移速+30% 减伤25%',1.5);
    P.inventory = P.inventory.filter(i=>i.id!==hot.uid);
    hot.id = null; hot.uid = null;
    const h=window.updateHUD; if(h)h();
    const hr=window.hotbarRender; if(hr)hr();
  }
}

window.craftPill = craftPill;
window.useConsumable = useConsumable;
