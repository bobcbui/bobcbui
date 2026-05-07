import { P, hudCache, hotGen, setHotGen } from './state.js';
import { getRealm } from './data.js';
import { EQ_TYPES, EQ_NAMES, RARITY_COLORS, RARITY_LABEL, SKILL_DEFS } from './data.js';

export function hotbarRender(){
  const cont = document.getElementById('hotbar');
  if(!cont) return;
  const sig = JSON.stringify(P.hotbar.map(h=>(h.kind==='consumable'?h.id+'_'+(h.id?P.inventory.filter(i=>i.id===h.uid).length:0):h.id+'_'+(P.skillLevels?.[h.id]||1))));
  if(sig === hotGen) return;
  setHotGen(sig);
  cont.innerHTML = '';
  const keys = ['Q','W','E','R','1','2','3','4'];
  P.hotbar.forEach((item,i)=>{
    const el = document.createElement('div');
    el.className = 'slot';
    const k = keys[i]||'';
    let name='', meta='';
    if(item.kind==='skill'){
      const def = SKILL_DEFS.find(s=>s.id===item.id);
      if(def){
        name = def.name;
        meta = 'Lv.'+(P.skillLevels?.[def.id]||1)+' 灵力'+def.qiCost;
        if(P.qi < def.qiCost) el.classList.add('no-qi');
      }
    } else if(item.kind==='consumable'){
      const types = { heal_pill:'回血丹', qi_pill:'回灵丹', buff_pill:'爆气丹' };
      name = types[item.id]||'空位';
      const count = item.id ? P.inventory.filter(i=>i.id===item.uid).length : 0;
      meta = count>0 ? 'x'+count : '';
      if(count===0 && item.id) { item.id=null; item.uid=null; name='空位'; }
    }
    el.innerHTML = `<div class="k">${k}</div><div class="n">${name}</div><div class="m">${meta}</div>`;
    el.onclick = ()=>{
      if(item.kind==='skill'){ const fn = window.tryUseSkill; if(fn) fn(item.id); }
      else if(item.kind==='consumable' && item.id){ const fn = window.useConsumable; if(fn) fn(item.idx); }
    };
    cont.appendChild(el);
  });
}

export function renderTownPanel(){
  const panel = document.getElementById('townPanel');
  if(!panel) return;
  document.getElementById('townAttrPoints').textContent = P.attrPoints || 0;
  document.getElementById('townSkillPoints').textContent = P.skillPoints || 0;
  document.getElementById('townGold').textContent = P.gold || 0;
  const statDefs = [
    ['str','筋骨','攻击 +2'],
    ['body','体魄','生命 +12 / 防御 +0.8'],
    ['spirit','神识','灵力 +10 / 攻击 +0.8'],
    ['agility','身法','速度 +5']
  ];
  const stats = document.getElementById('townStats');
  stats.innerHTML = '';
  statDefs.forEach(([id,name,desc])=>{
    const div = document.createElement('div');
    div.className = 'eq-slot';
    div.innerHTML = `<div class="lbl">${name}</div><div class="val">${P.attrs?.[id]||0}</div><div class="lbl">${desc}</div><button class="btn btn-sm btn-sec" onclick="assignAttr('${id}')">加点</button>`;
    stats.appendChild(div);
  });
  const keys = ['Q','W','E','R'];
  const hot = document.getElementById('townHotbar');
  hot.innerHTML = '';
  for(let i=0;i<4;i++){
    const def = SKILL_DEFS.find(s=>s.id===P.hotbar[i]?.id);
    const btn = document.createElement('span');
    btn.className = 'btn btn-sm btn-sec';
    btn.textContent = keys[i] + ': ' + (def ? def.name : '空');
    hot.appendChild(btn);
  }
  const skills = document.getElementById('townSkills');
  skills.innerHTML = '';
  SKILL_DEFS.forEach(def=>{
    const lv = P.skillLevels?.[def.id] || 1;
    const div = document.createElement('div');
    div.className = 'town-skill';
    const bindBtns = def.type === 'basic'
      ? '<span class="lbl">普通攻击</span>'
      : keys.map((k,idx)=>`<button class="btn btn-sm btn-sec" onclick="equipSkill('${def.id}',${idx})">${k}</button>`).join('');
    div.innerHTML = `
      <div class="name">${def.name} Lv.${lv}</div>
      <div class="desc">${def.desc}</div>
      <div class="lbl">消耗 ${def.qiCost} / 伤害系数 ${def.baseDmg}</div>
      <div class="actions">
        <button class="btn btn-sm btn-gold" onclick="upgradeSkill('${def.id}')">升级</button>
        ${bindBtns}
      </div>`;
    skills.appendChild(div);
  });
}

export function enterTown(){
  const scene = window.scene;
  if(scene && scene.enterTown) scene.enterTown();
  const panel = document.getElementById('townPanel');
  if(panel) panel.classList.remove('hidden');
  renderTownPanel();
}

export function leaveTown(){
  const panel = document.getElementById('townPanel');
  if(panel) panel.classList.add('hidden');
  const scene = window.scene;
  if(scene && scene.leaveTown) scene.leaveTown();
}

export function assignAttr(attr){
  if((P.attrPoints || 0) <= 0) return;
  if(!P.attrs) P.attrs = { str:0, body:0, spirit:0, agility:0 };
  if(!(attr in P.attrs)) return;
  P.attrs[attr] += 1;
  P.attrPoints -= 1;
  window.recalcStats();
  updateHUD();
  renderTownPanel();
  const sg = window.saveGame; if(sg) sg();
}

export function upgradeSkill(skillId){
  if((P.skillPoints || 0) <= 0) return;
  if(!P.skillLevels) P.skillLevels = {};
  const lv = P.skillLevels[skillId] || 1;
  if(lv >= 20) return;
  P.skillLevels[skillId] = lv + 1;
  P.skillPoints -= 1;
  hotbarRender();
  renderTownPanel();
  const sg = window.saveGame; if(sg) sg();
}

export function equipSkill(skillId, slotIdx){
  const def = SKILL_DEFS.find(s=>s.id===skillId);
  if(!def || def.type === 'basic' || slotIdx < 0 || slotIdx > 3) return;
  P.hotbar[slotIdx] = { kind:'skill', id:skillId };
  hotbarRender();
  renderTownPanel();
  const sg = window.saveGame; if(sg) sg();
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
  const qiR = Math.round(P.qi), mqiR = Math.round(P.maxQi);
  if(hudCache.qi !== qiR || hudCache.maxQi !== mqiR){
    document.getElementById('qiText').textContent = qiR+'/'+mqiR;
    document.getElementById('qiFill').style.width = (P.qi/P.maxQi*100)+'%';
    hudCache.qi = qiR; hudCache.maxQi = mqiR;
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
  document.getElementById('cpQi').textContent = Math.round(P.qi)+'/'+Math.round(P.maxQi);
  for(const slot of EQ_TYPES){
    const eq = P.equipment[slot];
    const el = document.getElementById('eq-'+slot);
    if(eq){
      const rc = RARITY_COLORS[eq.rarity]||'#aab';
      const statsStr = Object.entries(eq.stats).map(([k,v])=>{
        const labels = {atk:'攻击',def:'防御',hp:'生命',qi:'灵力',speed:'速度'};
        return (labels[k]||k)+'+'+v;
      }).join(' ');
      el.innerHTML = `<span style="color:${rc}">${RARITY_LABEL[eq.rarity]||''} ${eq.name}</span><br><span style="font-size:11px;color:var(--text-dim)">${statsStr}</span>`;
      el.className = 'val';
    } else {
      el.textContent = '空'; el.className = 'val empty';
    }
  }
  const inv = document.getElementById('invGrid');
  inv.innerHTML = '';
  document.getElementById('invCount').textContent = P.inventory.length;
  P.inventory.forEach((item,i)=>{
    const d = document.createElement('div');
    d.className = 'inv-item rarity-'+(item.rarity||'common');
    const isEq = Object.values(P.equipment).some(e=>e&&e.id===item.id);
    d.innerHTML = `<div class="in">${item.name}</div><div class="im">${EQ_NAMES[item.type]||item.type}</div>`;
    if(isEq) d.classList.add('equipped');
    d.onclick = (e)=>{ e.stopPropagation(); invItemClick(i); };
    inv.appendChild(d);
  });
}

export function invItemClick(idx){
  const item = P.inventory[idx];
  if(!item) return;
  if(EQ_TYPES.includes(item.type)){
    const current = P.equipment[item.type];
    P.equipment[item.type] = item;
    P.inventory.splice(idx,1);
    if(current) P.inventory.push(current);
    window.recalcStats();
    updateCharPanel(); updateHUD(); hotbarRender();
    const sg = window.saveGame; if(sg) sg();
    const ss = window.setStatus; if(ss) ss('装备 '+item.name,1.2);
  }
}

window.toggleCharPanel = toggleCharPanel;
window.updateHUD = updateHUD;
window.hotbarRender = hotbarRender;
window.renderTownPanel = renderTownPanel;
window.enterTown = enterTown;
window.leaveTown = leaveTown;
window.assignAttr = assignAttr;
window.upgradeSkill = upgradeSkill;
window.equipSkill = equipSkill;
