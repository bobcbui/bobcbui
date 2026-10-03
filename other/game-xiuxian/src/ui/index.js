/* ============================================================================
 * UI：主页（底部 4 页菜单：关卡/装备/技能/活动）、局内 HUD、抽卡面板、结算面板
 * 所有可点击元素通过 data-action + data-arg 由全局事件委托触发（见 actions.js）
 * ========================================================================== */

import { P, gameStarted, waveNum, hudCache } from '@/core/state.js';
import { SKILL_CARDS, UPGRADE_CARDS, PROGRESSION, ACHIEVEMENTS, EQ_TYPES, EQ_NAMES, RARITY_LABEL } from '@/data/index.js';
import { bus } from '@/core/events.js';
import { getEl } from '@/core/dom.js';
import { formatEquipStats } from '@/core/equipment.js';

function syncAlpineHome(values) {
  const menu = getEl('mainMenu');
  const data = menu && window.Alpine?.$data ? window.Alpine.$data(menu) : null;
  if (data) Object.assign(data, values);
}

/* ================= 主页（局外） ================= */

export function renderMenu(){
  // 顶部总等级栏
  const set = (id, text) => { const el = getEl(id); if (el) el.textContent = text; };
  set('menuTotalLevel', P.totalLevel);
  const xpFillEl = getEl('menuTotalXpFill');
  if (xpFillEl) xpFillEl.style.width = Math.min(100, P.totalXp / P.totalXpToNext * 100) + '%';
  set('menuTotalXpText', P.totalXp + '/' + P.totalXpToNext);
  set('menuAtkBonus', (P.totalLevel - 1) * PROGRESSION.totalAtkPerLevel);
  set('menuHpBonus', (P.totalLevel - 1) * PROGRESSION.totalHpPerLevel);
  set('menuMaxStage', P.maxClearedStage);
  syncAlpineHome({
    totalLevel: P.totalLevel,
    totalXp: P.totalXp,
    totalXpToNext: P.totalXpToNext,
    maxStage: P.maxClearedStage + 1,
    selectedStage: P.selectedStage
  });
  renderMenuPages();
}

/* ---- 主页底部菜单：4 页切换 ---- */
export function menuTab(tabId){
  syncAlpineHome({ activeTab: tabId });
  const tabs = ['stage', 'equip', 'skill', 'activity'];
  for (const id of tabs) {
    const tab = getEl('menu-tab-' + id);
    if (tab) tab.classList.toggle('active', id === tabId);
    const page = getEl('page-' + id);
    if (page && !window.Alpine) page.classList.toggle('hidden', id !== tabId);
  }
  if (tabId === 'stage') renderStagePage();
  if (tabId === 'equip') renderEquipPage();
  if (tabId === 'skill') renderSkillPage();
  if (tabId === 'activity') renderActivityPage();
}

function renderMenuPages(){
  const activeTab = document.querySelector('#menu-tabs .menu-tab.active');
  menuTab(activeTab ? activeTab.getAttribute('data-arg') : 'stage');
}

/* ---- 第一页：关卡选择（上一关/下一关） ---- */
export function renderStagePage(){
  const max = P.maxClearedStage + 1;
  if (P.selectedStage < 1) P.selectedStage = 1;
  if (P.selectedStage > max) P.selectedStage = max;
  const set = (id, text) => { const el = getEl(id); if (el) el.textContent = text; };
  const stageInfo = '最高通关：第 ' + P.maxClearedStage + ' 关 · 怪物强度 ×' + (1 + (P.selectedStage - 1) * PROGRESSION.enemyScalePerStage).toFixed(2);
  set('selStageInfo', stageInfo);
  syncAlpineHome({ selectedStage: P.selectedStage, maxStage: max, stageInfo });
  const prevCard = getEl('prevStageCard');
  const nextCard = getEl('nextStageCard');
  if (prevCard) prevCard.disabled = P.selectedStage <= 1;
  if (nextCard) nextCard.disabled = P.selectedStage >= max;
}

export function prevStage(){
  if (P.selectedStage > 1) { P.selectedStage -= 1; renderStagePage(); }
}

export function nextStage(){
  if (P.selectedStage < P.maxClearedStage + 1) { P.selectedStage += 1; renderStagePage(); }
}

/* ---- 第二页：装备 ---- */
const SLOT_ICONS = { weapon: '⚔️', helmet: '⛑️', armor: '🥋', boots: '👢', ring: '💍', amulet: '📿' };

export function renderEquipPage(){
  const eqList = getEl('equipList');
  if (!eqList) return;
  let html = '<div class="page-section-title">已穿戴</div>';
  for (const slot of EQ_TYPES) {
    const eq = P.equipment?.[slot];
    if (eq) {
      const rc = RARITY_LABEL[eq.rarity] || '';
      html += `<div class="wx-cell">
        <div class="wx-icon">${SLOT_ICONS[slot] || '🎒'}</div>
        <div class="wx-body">
          <div class="wx-title" style="color:var(--gold)">${rc} ${eq.name}</div>
          <div class="wx-sub">${EQ_NAMES[slot]} · ${formatEquipStats(eq)}</div>
        </div>
        <button class="btn btn-sm btn-sec wx-btn" data-action="unequipItem" data-arg="${slot}">卸下</button>
      </div>`;
    } else {
      html += `<div class="wx-cell">
        <div class="wx-icon">${SLOT_ICONS[slot] || '🎒'}</div>
        <div class="wx-body"><div class="wx-title">${EQ_NAMES[slot]}</div><div class="wx-sub">未装备</div></div>
      </div>`;
    }
  }
  html += `<div class="page-section-title">背包 (${P.inventory.length}/30)</div>`;
  if (P.inventory.length === 0) {
    html += '<div class="wx-cell"><div class="wx-body"><div class="wx-sub">通关/战败结算可获得装备，点击列表装备</div></div></div>';
  }
  for (const item of P.inventory) {
    const rc = RARITY_LABEL[item.rarity] || '';
    html += `<div class="wx-cell" data-action="equipItem" data-arg="${item.id}">
      <div class="wx-icon">${SLOT_ICONS[item.type] || '🎒'}</div>
      <div class="wx-body">
        <div class="wx-title">${rc} ${item.name}</div>
        <div class="wx-sub">${EQ_NAMES[item.type]} · ${formatEquipStats(item)}</div>
      </div>
      <span class="wx-arrow">›</span>
    </div>`;
  }
  eqList.innerHTML = html;
}

/* ---- 第三页：技能图鉴 ---- */
export function renderSkillPage(){
  const list = getEl('skillPageList');
  if (!list) return;
  let html = '<div class="page-section-title">技能卡</div>';
  for (const c of SKILL_CARDS) {
    html += `<div class="wx-cell">
      <div class="wx-icon">${c.icon}</div>
      <div class="wx-body"><div class="wx-title">${c.name}</div><div class="wx-sub">${c.desc}</div></div>
    </div>`;
  }
  html += '<div class="page-section-title">强化卡</div>';
  for (const c of UPGRADE_CARDS) {
    html += `<div class="wx-cell">
      <div class="wx-icon">${c.icon}</div>
      <div class="wx-body"><div class="wx-title">${c.name}</div><div class="wx-sub">${c.desc}</div></div>
    </div>`;
  }
  list.innerHTML = html;
}

/* ---- 第四页：活动 ---- */
export function renderActivityPage(){
  const list = getEl('activityPageList');
  if (!list) return;
  let html = '<div class="page-section-title">成就</div>';
  let done = 0;
  for (const a of ACHIEVEMENTS) {
    const earned = P.achievements[a.id];
    if (earned) done++;
    html += `<div class="wx-cell${earned ? '' : ''}">
      <div class="wx-icon">${a.icon}</div>
      <div class="wx-body"><div class="wx-title">${a.name}</div><div class="wx-sub">${a.desc}</div></div>
      <span class="wx-tag">${earned ? '✅ 已达成' : '🎁'}</span>
    </div>`;
  }
  html += `<div class="act-summary">已完成 ${done}/${ACHIEVEMENTS.length}</div>`;
  html += '<div class="page-section-title">活动</div>';
  html += '<div class="wx-cell"><div class="wx-icon">🎉</div><div class="wx-body"><div class="wx-title">活动筹备中</div><div class="wx-sub">敬请期待</div></div></div>';
  list.innerHTML = html;
}

/* ================= 局内 HUD ================= */

export function updateHUD(){
  if (!gameStarted) return;
  const set = (id, text) => { const el = getEl(id); if (el) el.textContent = text; };
  const setW = (id, w) => { const el = getEl(id); if (el) el.style.width = w + '%'; };

  set('stageText', P.stageLevel);
  set('waveCounter', waveNum + '/' + PROGRESSION.wavesPerStage);
  setW('waveFill', Math.min(100, Math.max(0, (waveNum / (PROGRESSION.wavesPerStage || 20)) * 100)));

  const hpR = Math.round(P.hp), mhpR = Math.round(P.maxHp);
  if (hudCache.hp !== hpR || hudCache.maxHp !== mhpR) {
    set('hpText', hpR + '/' + mhpR);
    setW('hpFill', P.hp / P.maxHp * 100);
    hudCache.hp = hpR; hudCache.maxHp = mhpR;
  }
  const wallHpR = Math.round(P.wallHp), wallMaxHpR = Math.round(P.wallMaxHp);
  if (hudCache.wallHp !== wallHpR || hudCache.wallMaxHp !== wallMaxHpR) {
    set('wallHpText', wallHpR + '/' + wallMaxHpR);
    setW('wallHpFill', wallMaxHpR > 0 ? P.wallHp / wallMaxHpR * 100 : 0);
    hudCache.wallHp = wallHpR; hudCache.wallMaxHp = wallMaxHpR;
    const wallHudEl = getEl('wallHud');
    if (wallHudEl) wallHudEl.classList.toggle('wall-danger', (P.wallHp / (wallMaxHpR || 100)) <= 0.3);
  }
  if (hudCache.xp !== P.xp || hudCache.xpNext !== P.xpToNext) {
    set('xpText', P.xp + '/' + P.xpToNext);
    setW('xpFill', P.xp / P.xpToNext * 100);
    hudCache.xp = P.xp; hudCache.xpNext = P.xpToNext;
  }
  if (hudCache.level !== P.level) { set('levelText', P.level); hudCache.level = P.level; }
  if (hudCache.kills !== P.kills) { set('killText', P.kills); hudCache.kills = P.kills; }
  if (hudCache.totalLevel !== P.totalLevel) { set('totalLevelText', P.totalLevel); hudCache.totalLevel = P.totalLevel; }
  renderCardsHud();
}

/** 已获得卡牌摘要（技能 + 强化叠层数） */
function renderCardsHud(){
  const cont = getEl('cardsHud');
  if (!cont) return;
  const parts = [];
  for (const id of P.skills) {
    const card = SKILL_CARDS.find(c => c.id === id);
    if (card) parts.push(card.icon + '×' + (P.skillLevels?.[id] || 1));
  }
  for (const card of UPGRADE_CARDS) {
    const count = P.mods[card.effect] ? Math.round(P.mods[card.effect] / card.value) : 0;
    if (count > 0) parts.push(card.icon + '×' + count);
  }
  let html = '<div class="skill-slots-tray">';
  for (let i = 0; i < 4; i++) {
    const id = P.skills[i];
    if (id) {
      const card = SKILL_CARDS.find(c => c.id === id);
      const lv = P.skillLevels?.[id] || 1;
      html += `<div class="skill-slot-badge filled"><span class="slot-icon">${card?.icon || '🗡️'}</span><span class="slot-name">${card?.name || id}</span><span class="slot-lv">Lv.${lv}</span></div>`;
    } else {
      html += `<div class="skill-slot-badge empty"><span class="slot-icon">➕</span><span class="slot-name">待参悟</span></div>`;
    }
  }
  html += '</div>';
  const upParts = [];
  for (const card of UPGRADE_CARDS) {
    const count = P.mods[card.effect] ? Math.round(P.mods[card.effect] / card.value) : 0;
    if (count > 0) upParts.push(`<span class="upgrade-chip">${card.icon} ${card.name} ×${count}</span>`);
  }
  if (upParts.length) {
    html += '<div class="upgrade-chips-tray">' + upParts.join('') + '</div>';
  }
  cont.innerHTML = html;
}

/* ================= 抽卡面板 ================= */

const SKILL_TAGS = {
  giant_sword: '#御剑神威',
  fireball: '#火灵爆燃',
  thunder: '#天雷轰顶',
  laser: '#赤芒射线',
  frost: '#寒霜减速',
  heal: '#回春修城'
};

const UPGRADE_TAGS = {
  swordspeed: '#飞剑疾速',
  dmg: '#剑气增幅',
  speed: '#御剑连发',
  multi: '#分身多重',
  crit: '#暴击暴伤',
  range: '#广域索敌',
  lifesteal: '#汲血续航',
  maxhp: '#体魄固本',
  xp: '#道行进阶'
};

export function renderCardOptions(options){
  const cont = getEl('cardOptions');
  if (!cont) return;
  cont.innerHTML = '';
  options.forEach((card) => {
    const el = document.createElement('div');
    el.className = 'card-option ' + (card.kind === 'skill' ? 'card-skill' : 'card-upgrade');
    const lv = card.kind === 'skill' ? (P.skillLevels?.[card.id] || 0) : 0;
    const tag = (card.kind === 'skill' ? SKILL_TAGS[card.id] : UPGRADE_TAGS[card.id]) || '#道法自然';

    let badgeHtml = '';
    let hintHtml = '';
    if (card.kind === 'skill') {
      const isOwned = P.skills.includes(card.id);
      const slotNum = isOwned ? (P.skills.indexOf(card.id) + 1) : Math.min(4, P.skills.length + 1);
      badgeHtml = `<span class="card-badge badge-skill">主动法术 · 槽位 ${slotNum}/4</span>`;
      if (lv > 0) {
        hintHtml = `<div class="card-upgrade-hint">已有 Lv.${lv} ➔ 升至 <strong>Lv.${lv + 1}</strong> <span class="card-boost">(伤害+18%)</span></div>`;
      } else {
        hintHtml = `<div class="card-upgrade-hint new-skill">✨ 初次研习 · 自动轮转施放</div>`;
      }
    } else {
      const currentCount = P.mods[card.effect] ? Math.round(P.mods[card.effect] / card.value) : 0;
      badgeHtml = `<span class="card-badge badge-upgrade">被动心法</span>`;
      if (currentCount > 0) {
        hintHtml = `<div class="card-upgrade-hint">已叠加 ${currentCount} 层 ➔ 升至 <strong>${currentCount + 1} 层</strong></div>`;
      } else {
        hintHtml = `<div class="card-upgrade-hint">常驻生效 · 可无限叠加</div>`;
      }
    }

    el.innerHTML = `
      <div class="card-top-bar">
        ${badgeHtml}
        <span class="card-tag">${tag}</span>
      </div>
      <div class="card-icon">${card.icon}</div>
      <div class="card-name">${card.name}${lv > 0 ? ' <small>Lv.' + (lv + 1) + '</small>' : ''}</div>
      <div class="card-desc">${card.desc}</div>
      ${hintHtml}`;
    el.setAttribute('data-action', 'pickCard');
    el.setAttribute('data-arg', card.id);
    cont.appendChild(el);
  });
}

bus.on('hud-refresh', updateHUD);
