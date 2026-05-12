import { P, hotGen, setHotGen, recalcStats, realmText } from '../core/state.js';
import { getRealm, EQ_TYPES, EQ_NAMES, RARITY_COLORS, RARITY_LABEL, SKILL_DEFS, ACHIEVEMENTS, SHOP_ITEMS } from '../data/index.js';
import { genEquipment, acquireEquipment } from '../core/equipment.js';
import { bus } from '../core/events.js';
import { getScene, getSkillCooldowns } from '../core/runtime.js';

export function hotbarRender(){
  const cont = document.getElementById('hotbar');
  if(!cont) return;
  const sig = JSON.stringify(P.hotbar.map(h=>h.id+'_'+(P.skillLevels?.[h.id]||1)));
  if(sig === hotGen) return;
  setHotGen(sig);
  cont.innerHTML = '';
  P.hotbar.forEach((item,i)=>{
    const el = document.createElement('div');
    el.className = 'slot';
    let name='', meta='';
    if(item.kind==='skill'){
      const def = SKILL_DEFS.find(s=>s.id===item.id);
      if(def){
        name = def.short||def.name.charAt(0);
        meta = 'Lv.'+(P.skillLevels?.[def.id]||1);
      }
    }
    el.innerHTML = `<div class="n">${name}</div><div class="m">${meta}</div>`;
    cont.appendChild(el);
  });
}

export function updateHotbarCooldowns(){
  const cont = document.getElementById('hotbar');
  if(!cont) return;
  const slots = cont.children;
  const cds = getSkillCooldowns();
  const scene = getScene();
  const now = scene?.time?.now ? scene.time.now/1000 : 0;
  for(let i=0;i<Math.min(5,slots.length);i++){
    const item = P.hotbar[i];
    if(item && item.kind==='skill' && item.id){
      const def = SKILL_DEFS.find(s=>s.id===item.id);
      const cdEnd = cds[item.id] || 0;
      const remain = Math.max(0, cdEnd - now);
      const metaEl = slots[i].querySelector('.m');
      if(metaEl){
        if(remain > 0.05){
          metaEl.textContent = remain.toFixed(1)+'s';
          slots[i].classList.add('cd');
        } else {
          metaEl.textContent = '就绪';
          slots[i].classList.remove('cd');
        }
      }
    }
  }
}

function renderEquipPanel(){
  const el = document.getElementById('panel-equip');
  if(!el) return;
  let html = '<h3>角色信息</h3>';
  html += '<div class="eq-slot"><span class="lbl">境界</span> <span class="val" style="color:var(--gold)">'+realmText()+'</span></div>';
  html += '<div class="eq-slot"><span class="lbl">等级</span> <span class="val">Lv.'+P.level+' (XP:'+P.xp+'/'+P.xpToNext+')</span></div>';
  html += '<div class="eq-slot"><span class="lbl">灵石</span> <span class="val" style="color:var(--gold)">'+P.gold+'</span></div>';
  html += '<div class="eq-slot"><span class="lbl">攻击</span> <span class="val">'+Math.round(P.atk)+'</span></div>';
  html += '<div class="eq-slot"><span class="lbl">防御</span> <span class="val">'+Math.round(P.def)+'</span></div>';
  html += '<div class="eq-slot"><span class="lbl">生命</span> <span class="val">'+Math.round(P.hp)+'/'+Math.round(P.maxHp)+'</span></div>';
  html += '<h3>装备 <span style="font-size:10px;color:rgba(200,160,80,0.5)">(点击背包物品装备)</span></h3>';
  html += '<div id="panel-equip-slots">';
  for(const slot of EQ_TYPES){
    const eq = P.equipment[slot];
    if(eq){
      const rc = RARITY_COLORS[eq.rarity]||'#aab';
      const stats = Object.entries(eq.stats).map(([k,v])=>{ const lb={atk:'攻',def:'防',hp:'命',speed:'速'}; return (lb[k]||k)+'+'+v; }).join(' ');
      html += '<div class="eq-slot"><span class="lbl">'+EQ_NAMES[slot]+'</span> <span class="val" style="color:'+rc+'">'+eq.name+'</span><br><span style="font-size:10px;color:rgba(200,160,80,0.5)">'+stats+'</span></div>';
    } else {
      html += '<div class="eq-slot"><span class="lbl">'+EQ_NAMES[slot]+'</span> <span class="empty">空</span></div>';
    }
  }
  html += '</div>';
  html += '<h3>背包 <span style="font-size:10px;color:rgba(200,160,80,0.5)">('+P.inventory.length+'/30)</span>';
  if(P.inventory.length>0) html += ' <button class="btn btn-sm btn-gold" onclick="sellAllBagItems()">一键售出</button>';
  html += '</h3>';
  html += '<div id="panel-bag-list">';
  P.inventory.forEach((item,i)=>{
    const isEq = Object.values(P.equipment).some(e=>e&&e.id===item.id);
    let stats = '';
    if(item.stats) stats = Object.entries(item.stats).map(([k,v])=>{ const lb={atk:'攻',def:'防',hp:'命',speed:'速'}; return (lb[k]||k)+'+'+v; }).join(' ');
    html += '<div class="inv-item'+(isEq?' equipped':'')+'" onclick="doBagEquip('+i+')">';
    html += '<div class="in">'+item.name+'</div>';
    html += '<div class="im">'+EQ_NAMES[item.type]+'</div>';
    html += '<div class="is">'+stats+'</div>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

function renderSkillPanel(){
  const el = document.getElementById('panel-skill');
  if(!el) return;
  let html = '<h3>技能列表</h3>';
  SKILL_DEFS.forEach(def => {
    const lv = P.skillLevels?.[def.id] || 1;
    html += '<div class="skill-row"><span class="sn">'+def.name+'</span> Lv.'+lv;
    html += '<br><span class="sd">'+def.desc+'</span></div>';
  });
  el.innerHTML = html;
}

function renderShopPanel(){
  const el = document.getElementById('panel-shop');
  if(!el) return;
  let html = '<h3>百宝阁 <span style="font-size:10px">灵石:'+P.gold+'</span></h3>';
  SHOP_ITEMS.forEach(item => {
    html += '<div class="shop-row">';
    html += '<div class="sh-name">'+item.icon+' '+item.name+'</div>';
    html += '<div class="sh-desc">'+item.desc+'</div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<span class="sh-cost">'+item.cost+'💰</span>';
    html += '<button class="btn btn-sm btn-gold" onclick="buyShopItem(\''+item.id+'\')" '+(P.gold<item.cost?'disabled':'')+'>购买</button>';
    html += '</div></div>';
  });
  el.innerHTML = html;
}

function renderActivityPanel(){
  const el = document.getElementById('panel-activity');
  if(!el) return;
  let done = 0;
  let html = '<h3>成就</h3>';
  ACHIEVEMENTS.forEach(a => {
    const earned = P.achievements[a.id];
    if(earned) done++;
    html += '<div class="ach-row'+(earned?' done':'')+'"><span class="ach-icon">'+(earned?'✅':a.icon)+'</span>';
    html += '<span>'+a.name+'</span>';
    html += '</div>';
  });
  html += '<div style="margin-top:8px;font-size:11px;color:rgba(200,160,80,0.5)">已完成 '+done+'/'+ACHIEVEMENTS.length+'</div>';
  el.innerHTML = html;
}

window.switchPanelTab = function(tab) {
  document.querySelectorAll('#ctrl-tabs button').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-'+tab)?.classList.add('active');
  document.querySelectorAll('#ctrl-content > div').forEach(d => d.classList.add('hidden'));
  const panel = document.getElementById('panel-'+tab);
  if(panel) panel.classList.remove('hidden');
  if(tab==='equip') renderEquipPanel();
  else if(tab==='skill') renderSkillPanel();
  else if(tab==='shop') renderShopPanel();
  else if(tab==='activity') renderActivityPanel();
};

window.doBagEquip = function(idx) {
  const item = P.inventory[idx];
  if(!item || !EQ_TYPES.includes(item.type)) return;
  const current = P.equipment[item.type];
  P.equipment[item.type] = item;
  P.inventory.splice(idx,1);
  if(current) P.inventory.push(current);
  recalcStats();
  renderEquipPanel();
  hotbarRender();
  bus.emit('save');
  bus.emit('status', '装备 '+item.name,1.2);
};

window.sellAllBagItems = function() {
  if(P.inventory.length === 0) return;
  const total = P.inventory.reduce((s,i)=>s+(i?.stats?Math.round(Object.values(i.stats).reduce((a,b)=>a+b,0)*2):3),0);
  const cnt = P.inventory.length;
  P.inventory.length = 0;
  P.gold = Math.min(99999, P.gold + total);
  renderEquipPanel();
  renderShopPanel();
  bus.emit('save');
  bus.emit('status', '售出 '+cnt+' 件 +'+total+'灵石',1.5);
};

window.buyShopItem = function(itemId) {
  const item = SHOP_ITEMS.find(s=>s.id===itemId);
  if(!item || P.gold < item.cost || P.inventory.length>=30) return;
  P.gold -= item.cost;
  if(item.effect === 'gold_bag'){
    P.gold = Math.min(99999, P.gold + 120);
    bus.emit('status', '获得120灵石!',1.2);
  } else if(item.effect === 'attr_reset'){
    let total = P.attrs.str + P.attrs.body + P.attrs.spirit + P.attrs.agility;
    P.attrs = {str:0,body:0,spirit:0,agility:0};
    P.attrPoints += total;
    recalcStats();
    bus.emit('status', '属性点已重置!',1.2);
  } else if(item.effect?.startsWith('eq_box_')){
    const rarity = item.effect.replace('eq_box_','');
    const eq = genEquipment(rarity==='common'?2:(rarity==='uncommon'?4:(rarity==='rare'?7:(rarity==='epic'?12:18))), rarity);
    if(eq){
      const result = acquireEquipment(P, eq);
      if(result.stored){
        bus.emit('status', '获得 '+RARITY_LABEL[eq.rarity]+' '+eq.name + (result.equipped?'(已装备)':''),2);
        if(result.changed) recalcStats();
      }
    }
  }
  renderEquipPanel();
  renderShopPanel();
  hotbarRender();
  bus.emit('save');
};

renderEquipPanel();
