/* ============================================================================
 * 装备系统（轻量版）：关卡结算掉落、永久穿戴、属性加成
 * 6 部位 / 6 品质；品质概率随关卡等级提升；无词条/强化/套装。
 * ========================================================================== */

import { P, recalcStats } from './state.js';
import { EQ_TYPES, EQ_NAMES, RARITY_LABEL, RARITY_MULT, EQ_BASES, EQ_PREFIXES, EQ_NAME_POOLS } from '../data/index.js';
import { bus } from './events.js';

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

/** 按关卡等级生成一件装备（品质概率随关卡提升） */
export function genEquipment(stageLevel) {
  const roll = Math.random();
  let rarity = 'common';
  if (stageLevel >= 9 && roll < 0.03) rarity = 'mythic';
  else if (stageLevel >= 6 && roll < 0.08) rarity = 'legendary';
  else if (stageLevel >= 4 && roll < 0.2) rarity = 'epic';
  else if (stageLevel >= 2 && roll < 0.4) rarity = 'rare';
  else if (roll < 0.65) rarity = 'uncommon';

  const type = EQ_TYPES[Math.floor(Math.random() * EQ_TYPES.length)];
  const base = EQ_BASES[type];
  const mult = RARITY_MULT[rarity];
  const stats = {};
  for (const [key, range] of Object.entries(base)) {
    if (range[1] <= 0) continue;
    const val = Math.max(1, Math.round((range[0] + Math.random() * (range[1] - range[0])) * mult));
    stats[key] = val;
  }
  const prefix = EQ_PREFIXES[rarity] || '';
  const nameList = EQ_NAME_POOLS[type] || [];
  const idx = Math.min(RARITY_ORDER.indexOf(rarity), nameList.length - 1);
  const name = prefix + (nameList[idx] || '无名');
  return { id: Date.now() + '_' + Math.random().toString(36).slice(2, 6), type, name, rarity, stats };
}

/** 装备属性展示文本（"攻+5 防+2"） */
export function formatEquipStats(eq) {
  if (!eq?.stats) return '';
  const lb = { atk: '攻', def: '防', hp: '命', speed: '速' };
  return Object.entries(eq.stats).map(([k, v]) => (lb[k] || k) + '+' + v).join(' ');
}

/** 装备/卸下 */
export function equipItem(itemId) {
  const item = P.inventory.find(i => i && i.id === itemId);
  if (!item || !EQ_TYPES.includes(item.type)) return false;
  const current = P.equipment[item.type];
  P.equipment[item.type] = item;
  P.inventory = P.inventory.filter(i => i !== item);
  if (current) P.inventory.push(current);
  recalcStats();
  bus.emit('hud-refresh');
  bus.emit('save');
  bus.emit('status', '装备 ' + item.name, 1.2);
  return true;
}

export function unequipItem(slot) {
  const item = P.equipment[slot];
  if (!item) return false;
  if (P.inventory.length >= 30) { bus.emit('status', '背包已满', 1.2); return false; }
  delete P.equipment[slot];
  P.inventory.push(item);
  recalcStats();
  bus.emit('hud-refresh');
  bus.emit('save');
  bus.emit('status', '卸下 ' + item.name, 1.2);
  return true;
}

/** 装备数据渲染用辅助 */
export function getEquipLabel(slot) {
  return EQ_NAMES[slot] || slot;
}

export function getRarityLabel(rarity) {
  return RARITY_LABEL[rarity] || rarity;
}
