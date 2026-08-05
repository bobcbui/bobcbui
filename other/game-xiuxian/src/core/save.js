/* ============================================================================
 * 存档：读档、保存（手动 + 30s 自动）、导入、导出、重置
 * localStorage key：xiuxian_save；v2 = 总等级/关卡进度（局内状态不入存档）
 * v1 旧存档读取时迁移 achievements/kills 后按 v2 默认初始化。
 * ========================================================================== */

import { bus } from '@/core/events.js';
import { P, totalXpToNext, recalcStats } from '@/core/state.js';
import { getEl } from '@/core/dom.js';

const SAVE_KEY = 'xiuxian_save';
const SAVE_THROTTLE_MS = 1500;
let savePending = false;
let saveTimer = null;
let lastSaveAt = 0;

function buildSaveData() {
  return {
    version: 2,
    totalLevel: P.totalLevel,
    totalXp: P.totalXp,
    totalXpToNext: P.totalXpToNext,
    maxClearedStage: P.maxClearedStage,
    totalKills: P.totalKills,
    equipment: P.equipment,
    inventory: P.inventory,
    selectedStage: P.selectedStage,
    totalPlayTime: P.totalPlayTime,
    achievements: P.achievements
  };
}

export function saveGame({ notify = false } = {}) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildSaveData()));
    lastSaveAt = Date.now();
    savePending = false;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (notify) {
      const n = getEl('saveNotif');
      if (n) {
        n.style.opacity = '1';
        setTimeout(() => n.style.opacity = '0', 1200);
      }
    }
  } catch (e) {}
}

export function requestSave() {
  savePending = true;
  const wait = Math.max(0, SAVE_THROTTLE_MS - (Date.now() - lastSaveAt));
  if (wait === 0) {
    saveGame();
    return;
  }
  if (!saveTimer) {
    saveTimer = setTimeout(() => saveGame(), wait);
  }
}

export function flushPendingSave() {
  if (savePending) saveGame();
}

export function exportSaveData() {
  try {
    const json = JSON.stringify(buildSaveData(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xiuxian_save_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    bus.emit('status', '📤 存档已导出', 1.5);
  } catch (e) { bus.emit('status', '导出失败', 1.5); }
}

export function importSaveData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.version !== 2) { bus.emit('status', '存档版本不兼容', 2); return; }
        applySaveData(data);
        bus.emit('status', '📥 存档已导入', 2);
        bus.emit('hud-refresh');
      } catch (e) { bus.emit('status', '导入失败: 文件格式错误', 2); }
    };
    reader.readAsText(file);
  };
  input.click();
}

export function resetGameData() {
  if (!confirm('确定要清除所有存档并重置游戏？此操作不可撤销。')) return;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

export function toggleSettingsPanel() {
  const el = getEl('settingsPanel');
  el.classList.toggle('hidden');
}

export function manualSave() {
  saveGame({ notify: true });
  bus.emit('status', '💾 已保存', 1);
}

/** 应用存档；缺失字段/非法数值一律回退默认，不让坏存档阻止启动 */
function applySaveData(data) {
  P.totalLevel = Math.max(1, data.totalLevel || 1);
  P.totalXp = Math.max(0, data.totalXp || 0);
  P.totalXpToNext = data.totalXpToNext || totalXpToNext(P.totalLevel);
  P.maxClearedStage = Math.max(0, data.maxClearedStage || 0);
  P.totalKills = Math.max(0, data.totalKills || 0);
  P.totalPlayTime = Math.max(0, data.totalPlayTime || 0);
  P.achievements = (data.achievements && typeof data.achievements === 'object') ? data.achievements : {};
  P.equipment = (data.equipment && typeof data.equipment === 'object') ? data.equipment : {};
  P.inventory = Array.isArray(data.inventory) ? data.inventory.filter(i => i && i.stats) : [];
  P.selectedStage = Math.max(1, Math.min(data.selectedStage || 1, (P.maxClearedStage || 0) + 1));
  recalcStats();
}

/** v1 旧存档迁移：保留成就与击杀数，其余按 v2 默认初始化 */
function applyLegacySaveData(data) {
  P.achievements = (data.P?.achievements && typeof data.P.achievements === 'object') ? data.P.achievements : {};
  P.totalKills = Math.max(0, data.P?.kills || 0);
  P.totalLevel = 1;
  P.totalXp = 0;
  P.totalXpToNext = totalXpToNext(1);
  P.maxClearedStage = 0;
  recalcStats();
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version === 2) applySaveData(data);
    else if (data.version === 1) applyLegacySaveData(data);
    else return false;
    return true;
  } catch (e) { return false; }
}

bus.on('save', requestSave);
window.addEventListener('pagehide', flushPendingSave);
