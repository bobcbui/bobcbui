import { P, hudCache, hotGen, setHotGen } from './state.js';
import { getRealm } from './data.js';
import { EQ_TYPES, EQ_NAMES, RARITY_COLORS, RARITY_LABEL, SKILL_DEFS } from './data.js';

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

export function renderBagPanel(){
  document.getElementById('bagCount').textContent = P.inventory.length+'/30';
  const grid = document.getElementById('bagGrid');
  grid.innerHTML = '';
  P.inventory.forEach((item,i)=>{
    const d = document.createElement('div');
    d.className = 'inv-item rarity-'+(item.rarity||'common');
    const isEq = Object.values(P.equipment).some(e=>e&&e.id===item.id);
    let stats='';
    if(item.stats){
      const lb={atk:'攻',def:'防',hp:'命',speed:'速'};
      stats = Object.entries(item.stats).map(([k,v])=>(lb[k]||k)+'+'+v).join(' ');
    }
    d.innerHTML = `<div class="in">${item.name}</div><div class="im">${EQ_NAMES[item.type]||item.type||'道具'}</div><div class="is">${stats}</div>`;
    if(isEq) d.classList.add('equipped');
    d.onclick = (e)=>{ e.stopPropagation(); showBagMenu(i); };
    grid.appendChild(d);
  });
}

function showBagMenu(idx){
  const old = document.getElementById('bagMenuOverlay');
  if(old) old.remove();
  const item = P.inventory[idx];
  if(!item) return;
  const eqType = EQ_TYPES.includes(item.type);
  const overlay = document.createElement('div');
  overlay.id = 'bagMenuOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:30;pointer-events:auto;';
  overlay.onclick = ()=>overlay.remove();
  const box = document.createElement('div');
  box.className = 'panel';
  box.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:16px;min-width:240px;max-width:320px;pointer-events:auto;text-align:center;';
  box.onclick = (e)=>e.stopPropagation();
  const rc = eqType?(RARITY_COLORS[item.rarity]||'#aab'):'var(--text)';
  const rl = eqType?(RARITY_LABEL[item.rarity]||''):'';
  box.style.border = `2px solid ${rc}`;
  box.style.boxShadow = `0 4px 24px ${rc}44`;
  let html = `<div style="font-size:13px;color:${rc};margin-bottom:2px;">${rl}</div>`;
  html += `<div style="font-size:18px;font-weight:900;color:${rc};margin-bottom:4px;">${item.name}</div>`;
  html += `<div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">${EQ_NAMES[item.type]||item.type||'道具'}</div>`;
  if(eqType && item.stats){
    const cur = P.equipment[item.type];
    const labels = {atk:'攻击',def:'防御',hp:'生命',speed:'速度'};
    html += '<div style="text-align:left;font-size:12px;margin-bottom:10px;">';
    const allKeys = new Set([...Object.keys(item.stats), ...(cur?.stats?Object.keys(cur.stats):[])]);
    allKeys.forEach(k=>{
      const v = item.stats[k]||0;
      const cv = cur?.stats?.[k]||0;
      const diff = v - cv;
      const diffStr = diff>0?`<span style="color:#4f8c48">↑${diff}</span>`:diff<0?`<span style="color:#b94a3e">↓${Math.abs(diff)}</span>`:'';
      const curStr = cur&&cv?` (${labels[k]||k} +${cv})`:'';
      html += `<div>${labels[k]||k} +${v} ${diffStr}<span style="color:var(--text-dim);font-size:10px;">${curStr}</span></div>`;
    });
    if(cur){
      html += `<div style="margin-top:4px;font-size:10px;color:var(--text-dim);">当前装备: ${cur.name}</div>`;
    }
    html += '</div>';
  }
  const isEquipped = Object.values(P.equipment).some(e=>e&&e.id===item.id);
  if(eqType && !isEquipped){
    html += `<button class="btn btn-sm btn-gold" style="margin:3px;" onclick="doBagEquip(${idx})">装备</button>`;
  }
  const sellPrice = item.stats ? Math.round(Object.values(item.stats).reduce((a,b)=>a+b,0)*2) : 3;
  html += `<button class="btn btn-sm btn-sec" style="margin:3px;" onclick="doBagSell(${idx})">出售(${sellPrice}💰)</button>`;
  html += `<br><button class="btn btn-sm btn-sec" style="margin:3px;" onclick="document.getElementById('bagMenuOverlay').remove()">取消</button>`;
  box.innerHTML = html;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

window.doBagEquip = function(idx){
  const item = P.inventory[idx];
  if(!item || !EQ_TYPES.includes(item.type)) return;
  const current = P.equipment[item.type];
  P.equipment[item.type] = item;
  P.inventory.splice(idx,1);
  if(current) P.inventory.push(current);
  window.recalcStats();
  updateCharPanel(); updateHUD(); hotbarRender();
  const menu = document.getElementById('bagMenuOverlay'); if(menu) menu.remove();
  renderBagPanel();
  const sg = window.saveGame; if(sg) sg();
  const ss = window.setStatus; if(ss) ss('装备 '+item.name,1.2);
};

window.doBagSell = function(idx){
  const item = P.inventory[idx];
  if(!item) return;
  const sellPrice = item.stats ? Math.round(Object.values(item.stats).reduce((a,b)=>a+b,0)*2) : 3;
  P.inventory.splice(idx,1);
  P.gold = Math.min(99999, P.gold + sellPrice);
  updateHUD();
  const menu = document.getElementById('bagMenuOverlay'); if(menu) menu.remove();
  renderBagPanel();
  const sg = window.saveGame; if(sg) sg();
  const ss = window.setStatus; if(ss) ss('出售 '+item.name+' +'+sellPrice+'灵石',1.2);
};

export function toggleBagPanel(){
  const el = document.getElementById('bagPanel');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) renderBagPanel();
}

export function renderSkillPanel(){
  document.getElementById('spSkillPoints').textContent = P.skillPoints || 0;
  const hotbarKeys = P.hotbar.map((h,i)=>['Q','W','E','R','T'][i]+':'+(SKILL_DEFS.find(s=>s.id===h.id)?.name||'空')).join(' ');
  document.getElementById('spHotbarKeys').textContent = '当前: '+hotbarKeys;
  const inSafe = window.scene?.isInSafeZone?.();
  const list = document.getElementById('skillList');
  list.innerHTML = '';

  const header = document.createElement('div');
  header.style.cssText = 'font-size:13px;font-weight:700;color:var(--gold);margin:8px 0 4px;';
  header.textContent = '[Q] 普攻(固定)';
  list.appendChild(header);
  const qDef = SKILL_DEFS.find(s=>s.id==='swordfly');
  const qLv = P.skillLevels?.swordfly||1;
  const qCard = document.createElement('div');
  qCard.className = 'skill-card';
  qCard.style.borderColor='var(--gold)';
  qCard.innerHTML = `<div class="sc-head"><span class="sc-name">${qDef.name}</span><span class="sc-lv">Lv.${qLv}/20</span></div><div class="sc-desc">${qDef.desc} · 伤害x${qDef.baseDmg} · CD${qDef.cooldown}s · 射程${qDef.range}</div><div class="sc-actions"><button class="btn btn-sm btn-gold" onclick="upgradeSkill('swordfly')" ${qLv>=20?'disabled':''}>升级</button><span class="btn btn-sm btn-sec" style="cursor:default">固定</span></div>`;
  list.appendChild(qCard);

  const hdr = document.createElement('div');
  hdr.style.cssText = 'font-size:13px;font-weight:700;color:var(--gold);margin:12px 0 4px;';
  hdr.textContent = '可装备技能 (点击装备→选择槽位)';
  list.appendChild(hdr);

  const allSwaps = SKILL_DEFS.filter(s=>s.id!=='swordfly');
  allSwaps.forEach(def=>{
    const lv = P.skillLevels?.[def.id] || 1;
    const cd = def.cooldown||0;
    let info = def.desc;
    if(def.baseDmg) info += ' · 伤害x'+def.baseDmg;
    info += ' · CD'+cd+'s';
    const slotIdx = P.hotbar.findIndex(h=>h?.id===def.id);
    const active = slotIdx>0;
    const card = document.createElement('div');
    card.className = 'skill-card';
    if(active) card.style.cssText = 'border-color:var(--gold);background:rgba(250,226,168,.15);';
    card.innerHTML = `
      <div class="sc-head"><span class="sc-name">${def.name}</span><span class="sc-lv">Lv.${lv}/20</span></div>
      <div class="sc-desc">${info}${active?' · 已装['+['Q','W','E','R','T'][slotIdx]+']':''}</div>
      <div class="sc-actions" id="act-${def.id}">
        <button class="btn btn-sm btn-gold" onclick="upgradeSkill('${def.id}')" ${lv>=20?'disabled':''}>升级</button>
        ${active?`<span class="btn btn-sm btn-sec" style="cursor:default">使用中</span>`:`<button class="btn btn-sm btn-sec" id="eqbtn-${def.id}" onclick="showSlotPick('${def.id}')" ${!inSafe?'disabled':''}>${inSafe?'装备':'安全区外'}</button>`}
      </div>`;
    list.appendChild(card);
  });
}

window.showSlotPick = function(skillId){
  const actEl = document.getElementById('act-'+skillId);
  const btnEl = document.getElementById('eqbtn-'+skillId);
  if(!actEl || !btnEl) return;
  if(document.getElementById('pick-'+skillId)) return;
  const pick = document.createElement('div');
  pick.id = 'pick-'+skillId;
  pick.style.cssText = 'display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;';
  ['W','E','R','T'].forEach((k,i)=>{
    const cur = P.hotbar[i+1];
    const nm = SKILL_DEFS.find(s=>s.id===cur?.id)?.name||'空';
    const b = document.createElement('button');
    b.className = 'btn btn-sm btn-sec';
    b.textContent = k+':'+nm;
    b.onclick = ()=>{
      equipSkill(skillId, i+1);
      pick.remove();
    };
    pick.appendChild(b);
  });
  const cancel = document.createElement('button');
  cancel.className = 'btn btn-sm btn-sec';
  cancel.textContent = '取消';
  cancel.onclick = ()=>pick.remove();
  pick.appendChild(cancel);
  actEl.appendChild(pick);
};

export function toggleSkillPanel(){
  const el = document.getElementById('skillPanel');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) renderSkillPanel();
}

export function renderAchPanel(){
  const {ACHIEVEMENTS} = window._data || {};
  if(!ACHIEVEMENTS) return;
  const list = document.getElementById('achList');
  let done=0, total=ACHIEVEMENTS.length;
  list.innerHTML = '';
  ACHIEVEMENTS.forEach(a=>{
    const earned = P.achievements[a.id];
    const item = document.createElement('div');
    item.className = 'ach-item' + (earned?' done':'');
    const rwd = Object.entries(a.reward).map(([k,v])=>{
      const lb = {gold:'灵石',attrPoints:'属性点',skillPoints:'技能点'};
      return (lb[k]||k)+'+'+v;
    }).join(' ');
    item.innerHTML = `
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-info"><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>
      <div class="ach-reward">${earned?'✅ 已达成':'🎁 '+rwd}</div>`;
    if(earned) done++;
    list.appendChild(item);
  });
  document.getElementById('achSummary').textContent = '已完成 '+done+'/'+total;
}

export function toggleAchPanel(){
  const el = document.getElementById('achPanel');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) renderAchPanel();
}

export function renderShopPanel(){
  const {SHOP_ITEMS} = window._data || {};
  if(!SHOP_ITEMS) return;
  document.getElementById('shopGold').textContent = P.gold;
  const list = document.getElementById('shopList');
  list.innerHTML = '';
  SHOP_ITEMS.forEach(item=>{
    const card = document.createElement('div');
    card.className = 'shop-item';
    card.innerHTML = `
      <div class="si-icon">${item.icon}</div>
      <div class="si-info"><div class="si-name">${item.name}</div><div class="si-desc">${item.desc}</div></div>
      <span class="si-cost">${item.cost}💰</span>
      <button class="btn btn-sm btn-gold" onclick="buyShopItem('${item.id}')" ${P.gold<item.cost?'disabled':''}>购买</button>`;
    list.appendChild(card);
  });
}

export function toggleShopPanel(){
  const el = document.getElementById('shopPanel');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) renderShopPanel();
}

export function buyShopItem(itemId){
  const {SHOP_ITEMS} = window._data || {};
  const item = SHOP_ITEMS?.find(s=>s.id===itemId);
  if(!item || P.gold < item.cost || P.inventory.length>=30) return;
  P.gold -= item.cost;
  const ss = window.setStatus;
  if(item.effect === 'gold_bag'){
    P.gold = Math.min(99999, P.gold + 120);
    if(ss) ss('获得120灵石!',1.2);
  } else if(item.effect === 'attr_reset'){
    let total = P.attrs.str + P.attrs.body + P.attrs.spirit + P.attrs.agility;
    P.attrs = {str:0,body:0,spirit:0,agility:0};
    P.attrPoints += total;
    window.recalcStats();
    if(ss) ss('属性点已重置!',1.2);
  } else if(item.effect === 'skill_reset'){
    for(const sk of SKILL_DEFS){ const lv = P.skillLevels?.[sk.id]||1; P.skillPoints += Math.max(0,lv-1); P.skillLevels[sk.id]=1; }
    if(ss) ss('技能点已重置!',1.2);
  } else if(item.effect?.startsWith('eq_box_')){
    const rarity = item.effect.replace('eq_box_','');
    if(P.inventory.length < 30){
      const eq = (window.genEquipment||function(){})(rarity==='common'?2:(rarity==='uncommon'?4:(rarity==='rare'?7:(rarity==='epic'?12:18))), rarity);
      if(eq && eq.id){ P.inventory.push(eq); if(ss) ss('获得 '+RARITY_LABEL[eq.rarity]+' '+eq.name,2); }
    }
  }
  updateHUD(); renderShopPanel(); renderBagPanel();
  const sg = window.saveGame; if(sg) sg();
}

export function equipSkill(skillId, slotIdx){
  const def = SKILL_DEFS.find(s=>s.id===skillId);
  if(!def || def.id==='swordfly' || slotIdx<1 || slotIdx>4) return;
  const scene = window.scene;
  if(scene && !scene.isInSafeZone()){ const ss=window.setStatus; if(ss) ss('只能在安全区内切换技能',1.5); return; }
  P.hotbar[slotIdx] = { kind:'skill', id:skillId };
  hotbarRender();
  renderSkillPanel();
  const sg = window.saveGame; if(sg) sg();
  const ss = window.setStatus; if(ss) ss('装备 '+def.name, 1);
}

export function upgradeSkill(skillId){
  if((P.skillPoints || 0) <= 0) return;
  if(!P.skillLevels) P.skillLevels = {};
  const lv = P.skillLevels[skillId] || 1;
  if(lv >= 20) return;
  P.skillLevels[skillId] = lv + 1;
  P.skillPoints -= 1;
  hotbarRender();
  renderSkillPanel();
  const sg = window.saveGame; if(sg) sg();
}

export function addAttr(attr){
  if((P.attrPoints || 0) <= 0) return;
  if(!P.attrs) P.attrs = {str:0, body:0, spirit:0, agility:0};
  P.attrs[attr] = (P.attrs[attr] || 0) + 1;
  P.attrPoints -= 1;
  window.recalcStats();
  updateHUD();
  updateCharPanel();
  const sg = window.saveGame; if(sg) sg();
}

export function updateHotbarCooldowns(){
  const cont = document.getElementById('hotbar');
  if(!cont) return;
  const slots = cont.children;
  const cds = window.skillCooldowns || {};
  const scene = window.scene;
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

export function updateHUD(){
  const rName = getRealm(P.realm).name;
  if(hudCache.realm !== rName){
    document.getElementById('realmText').textContent = rName;
    hudCache.realm = rName;
  }
  const stLabels = ['初期','初期','初期','中期','中期','中期','后期','后期','圆满'];
  const stageLbl = P.realm==='mortal'?'':(stLabels[Math.min(P.stage-1,8)]||'');
  document.getElementById('realmStageText').textContent = stageLbl;
  if(hudCache.level !== P.level){
    document.getElementById('levelText').textContent = 'Lv.'+P.level;
    hudCache.level = P.level;
  }
  const hpR = Math.round(P.hp), mhpR = Math.round(P.maxHp);
  if(hudCache.hp !== hpR || hudCache.maxHp !== mhpR){
    document.getElementById('hpText').textContent = hpR+'/'+mhpR;
    document.getElementById('hpFill').style.width = (P.hp/P.maxHp*100)+'%';
    hudCache.hp = hpR; hudCache.maxHp = mhpR;
  }
  if(hudCache.xp !== P.xp || hudCache.xpNext !== P.xpToNext){
    document.getElementById('xpText').textContent = P.xp+'/'+P.xpToNext;
    document.getElementById('xpFill').style.width = (P.xp/P.xpToNext*100)+'%';
    hudCache.xp = P.xp; hudCache.xpNext = P.xpToNext;
  }
  if(hudCache.gold !== P.gold){
    document.getElementById('moneyText').textContent = P.gold;
    hudCache.gold = P.gold;
  }
  if(hudCache.kills !== P.kills){
    document.getElementById('killText').textContent = P.kills;
    hudCache.kills = P.kills;
  }
}

export function toggleCharPanel(){
  const el = document.getElementById('charPanel');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) updateCharPanel();
}

export function updateCharPanel(){
  const rt = (window.realmText||function(){return ''})();
  document.getElementById('cpRealm').textContent = rt;
  document.getElementById('cpLevel').textContent = 'Lv.'+P.level;
  document.getElementById('cpAtk').textContent = Math.round(P.atk);
  document.getElementById('cpDef').textContent = Math.round(P.def);
  document.getElementById('cpHP').textContent = Math.round(P.hp)+'/'+Math.round(P.maxHp);
  document.getElementById('cpSpeed').textContent = Math.round(P.speed);
  document.getElementById('cpAttrPoints').textContent = P.attrPoints || 0;
  document.getElementById('cpSkillPoints').textContent = P.skillPoints || 0;
  document.getElementById('attr-str').textContent = P.attrs?.str || 0;
  document.getElementById('attr-body').textContent = P.attrs?.body || 0;
  document.getElementById('attr-spirit').textContent = P.attrs?.spirit || 0;
  document.getElementById('attr-agility').textContent = P.attrs?.agility || 0;
  for(const slot of EQ_TYPES){
    const eq = P.equipment[slot];
    const el = document.getElementById('eq-'+slot);
    if(eq){
      const rc = RARITY_COLORS[eq.rarity]||'#aab';
      const statsStr = Object.entries(eq.stats).map(([k,v])=>{
        const labels = {atk:'攻击',def:'防御',hp:'生命',speed:'速度'};
        return (labels[k]||k)+'+'+v;
      }).join(' ');
      el.innerHTML = `<span style="color:${rc}">${RARITY_LABEL[eq.rarity]||''} ${eq.name}</span><br><span style="font-size:11px;color:var(--text-dim)">${statsStr}</span>`;
      el.className = 'val';
    } else {
      el.textContent = '空'; el.className = 'val empty';
    }
  }
}

window.toggleCharPanel = toggleCharPanel;
window.updateHUD = updateHUD;
window.hotbarRender = hotbarRender;
window.toggleBagPanel = toggleBagPanel;
window.toggleSkillPanel = toggleSkillPanel;
window.toggleAchPanel = toggleAchPanel;
window.toggleShopPanel = toggleShopPanel;
window.buyShopItem = buyShopItem;
window.upgradeSkill = upgradeSkill;
window.equipSkill = equipSkill;
window.addAttr = addAttr;
window.updateHotbarCooldowns = updateHotbarCooldowns;
