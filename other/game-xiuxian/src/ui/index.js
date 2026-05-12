import { P, hotGen, setHotGen, recalcStats, realmText, baseHp, baseMaxHp, currentWave } from '../core/state.js';
import { getRealm, getRealmIndex, EQ_TYPES, EQ_NAMES, RARITY_COLORS, SKILL_DEFS, ACHIEVEMENTS, SHOP_ITEMS, LEVELS } from '../data/index.js';
import { genEquipment, acquireEquipment } from '../core/equipment.js';
import { bus } from '../core/events.js';
import { getScene, getSkillCooldowns, getGame } from '../core/runtime.js';

export function hotbarRender() {
  const cont = document.getElementById('hotbar');
  if (!cont) return;
  const sig = JSON.stringify(P.hotbar.map(h => h.id + '_' + (P.skillLevels?.[h.id] || 1)));
  if (sig === hotGen) return;
  setHotGen(sig);
  cont.innerHTML = '';
  P.hotbar.forEach(item => {
    const el = document.createElement('div');
    el.className = 'slot';
    let name = '', meta = '';
    if (item.kind === 'skill') {
      const def = SKILL_DEFS.find(s => s.id === item.id);
      if (def) {
        name = def.short || def.name.charAt(0);
        meta = 'Lv.' + (P.skillLevels?.[def.id] || 1);
      }
    }
    el.innerHTML = `<div class="n">${name}</div><div class="m">${meta}</div>`;
    cont.appendChild(el);
  });
}

export function updateHotbarCooldowns() {
  const cont = document.getElementById('hotbar');
  if (!cont) return;
  const slots = cont.children;
  const cds = getSkillCooldowns();
  const scene = getScene();
  const now = scene?.time?.now ? scene.time.now / 1000 : 0;
  for (let i = 0; i < Math.min(5, slots.length); i++) {
    const item = P.hotbar[i];
    if (item && item.kind === 'skill' && item.id) {
      const cdEnd = cds[item.id] || 0;
      const remain = Math.max(0, cdEnd - now);
      const metaEl = slots[i].querySelector('.m');
      if (metaEl) {
        if (remain > 0.05) {
          metaEl.textContent = remain.toFixed(1) + 's';
          slots[i].classList.add('cd');
        } else {
          metaEl.textContent = '就绪';
          slots[i].classList.remove('cd');
        }
      }
    }
  }
}

export function renderAllTabs() {
  renderLevelsTab();
  renderBagTab();
  renderSkillsTab();
  renderMeTab();
}

export function renderLevelsTab() {
  const el = document.getElementById('tab-levels');
  if (!el) return;
  const playerRealmIdx = getRealmIndex(P.realm);

  let html = '<div class="chat-header">修仙之路</div>';
  LEVELS.forEach(lv => {
    const reqIdx = getRealmIndex(lv.realmReq);
    const unlocked = playerRealmIdx >= reqIdx;
    const completed = P.maxWave >= (lv.startWave + lv.waves - 2);

    html += '<div class="level-item' + (unlocked ? '' : ' locked') + '"';
    if (unlocked) {
      html += ' onclick="startLevel(' + lv.id + ')"';
    }
    html += '>';
    html += '<div class="lv-icon">' + lv.icon + '</div>';
    html += '<div class="lv-info">';
    html += '<div class="lv-name">' + lv.name + '</div>';
    html += '<div class="lv-desc">' + (unlocked ? (completed ? '已通关' : lv.desc + ' · '+lv.waves+'波') : '需要 ' + lv.realmReq + ' 境界') + '</div>';
    html += '</div>';
    html += '<div class="lv-status">';
    if (completed) html += '<span class="lv-done">✅</span>';
    else if (!unlocked) html += '<span class="lv-lock">🔒</span>';
    else html += '<span class="lv-arrow">›</span>';
    html += '</div></div>';
  });
  el.innerHTML = html;
}

export function renderBagTab() {
  const el = document.getElementById('tab-bag');
  if (!el) return;
  let html = '<div class="bag-header">背包 (' + P.inventory.length + '/30)';
  if (P.inventory.length > 0) {
    const total = P.inventory.reduce((s, i) => s + (i?.stats ? Math.round(Object.values(i.stats).reduce((a, b) => a + b, 0) * 2) : 3), 0);
    html += ' <button class="btn-outline" onclick="sellAllBagItems()">一键售出('+total+'💰)</button>';
  }
  html += '</div>';

  if (P.inventory.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:var(--text2);">暂无物品</div>';
  } else {
    P.inventory.forEach((item, i) => {
      const isEq = Object.values(P.equipment).some(e => e && e.id === item.id);
      let stats = '';
      if (item.stats) {
        const lb = { atk: '攻', def: '防', hp: '命', speed: '速' };
        stats = Object.entries(item.stats).map(([k, v]) => (lb[k] || k) + '+' + v).join(' ');
      }
      html += '<div class="bag-item' + (isEq ? '" style="border-left:3px solid var(--green)' : '') + '" onclick="doBagEquip(' + i + ')">';
      html += '<div class="bi-icon">' + (EQ_TYPES.includes(item.type) ? '⚔️' : '📦') + '</div>';
      html += '<div class="bi-info">';
      html += '<div class="bi-name">' + item.name + ' <span style="font-size:10px;color:var(--text2)">' + (EQ_NAMES[item.type] || '') + '</span></div>';
      html += '<div class="bi-stats">' + stats + '</div>';
      html += '</div>';
      html += '<div class="bi-action">' + (isEq ? '已装备' : '装备') + '</div>';
      html += '</div>';
    });
  }
  el.innerHTML = html;
}

export function renderSkillsTab() {
  const el = document.getElementById('tab-skills');
  if (!el) return;
  let html = '';
  SKILL_DEFS.forEach(def => {
    const lv = P.skillLevels?.[def.id] || 1;
    html += '<div class="skill-item">';
    html += '<div class="si-name">' + def.name + ' <span style="font-size:12px;color:var(--gold)">Lv.' + lv + '</span></div>';
    html += '<div class="si-info">' + def.desc + '</div>';
    html += '</div>';
  });
  el.innerHTML = html;
}

export function renderMeTab() {
  const el = document.getElementById('tab-me');
  if (!el) return;

  let html = '<div style="text-align:center;padding:20px 0;">';
  html += '<div class="profile-avatar">🧘</div>';
  html += '<div style="font-size:18px;font-weight:700;">' + realmText() + '</div>';
  html += '<div style="font-size:13px;color:var(--text2);">Lv.' + P.level + ' · 杀敌 ' + P.kills + '</div>';
  html += '</div>';

  html += '<div class="profile-section">';
  html += '<div class="ps-title">属性</div>';
  html += '<div class="profile-row"><span>攻击</span><span class="pr-val">' + Math.round(P.atk) + '</span></div>';
  html += '<div class="profile-row"><span>防御</span><span class="pr-val">' + Math.round(P.def) + '</span></div>';
  html += '<div class="profile-row"><span>生命</span><span class="pr-val">' + Math.round(P.hp) + '/' + Math.round(P.maxHp) + '</span></div>';
  html += '<div class="profile-row"><span>速度</span><span class="pr-val">' + Math.round(P.speed) + '</span></div>';
  html += '</div>';

  html += '<div class="profile-section">';
  html += '<div class="ps-title">财富</div>';
  html += '<div class="profile-row"><span>灵石</span><span class="pr-val">' + P.gold + '</span></div>';
  html += '<div class="profile-row"><span>累计获得</span><span class="pr-val">' + (P.totalGoldEarned || 0) + '</span></div>';
  html += '<div class="profile-row"><span>属性点</span><span class="pr-val">' + (P.attrPoints || 0) + '</span></div>';
  html += '<div class="profile-row"><span>技能点</span><span class="pr-val">' + (P.skillPoints || 0) + '</span></div>';
  html += '</div>';

  const done = Object.values(P.achievements || {}).filter(Boolean).length;
  html += '<div class="profile-section">';
  html += '<div class="ps-title">成就 (' + done + '/' + (ACHIEVEMENTS?.length || 0) + ')</div>';
  if (ACHIEVEMENTS) {
    ACHIEVEMENTS.forEach(a => {
      const earned = P.achievements?.[a.id];
      html += '<div class="profile-row" style="' + (earned ? 'color:var(--green)' : 'color:var(--text2)') + '">';
      html += '<span>' + (earned ? '✅' : a.icon) + ' ' + a.name + '</span>';
      html += '<span style="font-size:11px">' + (earned ? '已完成' : '') + '</span>';
      html += '</div>';
    });
  }
  html += '</div>';

  html += '<div style="padding:16px;display:flex;gap:10px;">';
  html += '<button class="btn-green" onclick="manualSave()" style="flex:1">💾 保存</button>';
  html += '<button class="btn-outline" onclick="exportSaveData()" style="flex:1">📤 导出</button>';
  html += '</div>';

  el.innerHTML = html;
}

window.doBagEquip = function (idx) {
  const item = P.inventory[idx];
  if (!item || !EQ_TYPES.includes(item.type)) return;
  const current = P.equipment[item.type];
  P.equipment[item.type] = item;
  P.inventory.splice(idx, 1);
  if (current) P.inventory.push(current);
  recalcStats();
  renderBagTab();
  renderMeTab();
  hotbarRender();
  bus.emit('save');
};

window.sellAllBagItems = function () {
  if (P.inventory.length === 0) return;
  const total = P.inventory.reduce((s, i) => s + (i?.stats ? Math.round(Object.values(i.stats).reduce((a, b) => a + b, 0) * 2) : 3), 0);
  P.inventory.length = 0;
  P.gold = Math.min(99999, P.gold + total);
  recalcStats();
  renderBagTab();
  renderMeTab();
  bus.emit('save');
};

window.startLevel = function (levelId) {
  const lv = LEVELS.find(l => l.id === levelId);
  if (!lv) return;
  const game = getGame();
  if (!game) return;

  document.getElementById('deathModal')?.classList.add('hidden');
  document.getElementById('breakthrough-overlay')?.classList.add('hidden');
  document.getElementById('menu-overlay').classList.add('hidden');
  document.getElementById('gameCanvas').classList.remove('hidden');
  document.getElementById('battle-ui').classList.add('show');

  const scene = game.scene.getScene('Battle');
  if (scene && scene.scene.isActive()) {
    scene.scene.restart({ startWave: lv.startWave, waveCount: lv.waves });
  } else {
    game.scene.start('Battle', { startWave: lv.startWave, waveCount: lv.waves });
  }
};

window.returnToMenu = function () {
  document.getElementById('menu-overlay').classList.remove('hidden');
  document.getElementById('gameCanvas').classList.add('hidden');
  document.getElementById('battle-ui').classList.remove('show');
  document.getElementById('deathModal')?.classList.add('hidden');
  document.getElementById('breakthrough-overlay')?.classList.add('hidden');
  renderAllTabs();
};

window.switchTab = function (tabName) {
  document.querySelectorAll('#menu-tabs .tab').forEach(t => t.classList.remove('active'));
  document.querySelector('#menu-tabs .tab[data-tab="' + tabName + '"]')?.classList.add('active');
  document.querySelectorAll('#menu-content .tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabName)?.classList.add('active');
};

document.querySelectorAll('#menu-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    switchTab(tab.dataset.tab);
  });
});

// ---------------- Skill pick (in-level) ----------------
function createSkillCard(skDef) {
  const div = document.createElement('div');
  div.style.cssText = 'width:160px;padding:10px;background:#fff;border-radius:8px;border:1px solid #eee;text-align:left;';
  const title = document.createElement('div'); title.style.fontWeight = '700'; title.textContent = skDef.name + (P.skillLevels?.[skDef.id] ? (' Lv.' + P.skillLevels[skDef.id]) : '');
  const desc = document.createElement('div'); desc.style.fontSize = '12px'; desc.style.color = 'var(--text2)'; desc.style.margin = '6px 0'; desc.textContent = skDef.desc;
  const btn = document.createElement('button'); btn.className = 'btn-green'; btn.style.width='100%'; btn.textContent = (P.skillLevels?.[skDef.id] ? '升级' : '学习');
  div.appendChild(title); div.appendChild(desc); div.appendChild(btn);
  return { el: div, btn };
}

function showSkillPick(level) {
  const modal = document.getElementById('skillPickModal');
  const cardsCont = document.getElementById('skillCards');
  if(!modal || !cardsCont) return;
  cardsCont.innerHTML = '';
  // pick 3 random skill defs (allow duplicates avoided)
  const pool = SKILL_DEFS.slice();
  const picks = [];
  for(let i=0;i<3 && pool.length>0;i++){
    const idx = Math.floor(Math.random()*pool.length);
    picks.push(pool.splice(idx,1)[0]);
  }
  picks.forEach(sk => {
    const card = createSkillCard(sk);
    cardsCont.appendChild(card.el);
    card.btn.addEventListener('click', ()=>{
      // apply pick: increase skill level or learn
      if(!P.skillLevels) P.skillLevels = {};
      P.skillLevels[sk.id] = (P.skillLevels[sk.id] || 0) + 1;
      if(!P.skills.includes(sk.id)) P.skills.push(sk.id);
      // try to add to hotbar: find empty slot or replace first non-basic
      let placed = false;
      for(let i=0;i<P.hotbar.length;i++){
        if(!P.hotbar[i] || !P.hotbar[i].id){ P.hotbar[i] = { kind:'skill', id: sk.id }; placed = true; break; }
      }
      if(!placed){
        // replace first slot that's not swordfly
        for(let i=0;i<P.hotbar.length;i++){
          if(P.hotbar[i] && P.hotbar[i].id !== 'swordfly'){ P.hotbar[i] = { kind:'skill', id: sk.id }; placed = true; break; }
        }
      }
      // refresh UI
      recalcStats();
      hotbarRender();
      renderSkillsTab();
      renderMeTab();
      document.getElementById('skillPickModal')?.classList.add('hidden');
    });
  });
  document.getElementById('skillPickClose')?.addEventListener('click', ()=>{ document.getElementById('skillPickModal')?.classList.add('hidden'); });
  document.getElementById('skillPickSkip')?.addEventListener('click', ()=>{ document.getElementById('skillPickModal')?.classList.add('hidden'); });
  modal.classList.remove('hidden');
}

bus.on('levelUpPick', (lvl) => {
  // only show when in-battle (canvas visible)
  const canvasHidden = document.getElementById('gameCanvas')?.classList.contains('hidden');
  if(canvasHidden) return;
  showSkillPick(lvl);
});
