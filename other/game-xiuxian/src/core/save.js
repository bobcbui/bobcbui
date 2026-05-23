import { bus } from './events.js';
import { P, waveNum, setWaveNum, recalcStats, refreshSkills, initHotbar } from './state.js';
import { SKILL_DEFS } from '../data/index.js';
import { autoEquipBestEquipment } from './equipment.js';
import { getEl } from './dom.js';
import { ensureProgressionState } from './progression.js';

const SAVE_THROTTLE_MS = 1500;
let savePending = false;
let saveTimer = null;
let lastSaveAt = 0;

function buildSaveData() {
  return {
    P: { hp: P.hp, maxHp: P.maxHp, atk: P.atk, def: P.def, speed: P.speed,
         realm: P.realm, stage: P.stage, level: P.level, xp: P.xp, xpToNext: P.xpToNext,
         gold: P.gold, kills: P.kills, attrPoints: P.attrPoints, skillPoints: P.skillPoints,
         attrs: P.attrs, skillLevels: P.skillLevels, skills: P.skills, hotbar: P.hotbar,
         equipment: P.equipment, inventory: P.inventory, totalPlayTime: P.totalPlayTime,
         totalGoldEarned: P.totalGoldEarned, legendaryFound: P.legendaryFound, maxWave: P.maxWave,
         achievements: P.achievements, materials: P.materials, bestiary: P.bestiary,
         quests: P.quests, talents: P.talents, talentPoints: P.talentPoints,
         skillEvolutions: P.skillEvolutions, dungeon: P.dungeon },
    wave: waveNum,
    version: 1
  };
}

export function saveGame({ notify = false } = {}) {
  try {
    localStorage.setItem('xiuxian_save', JSON.stringify(buildSaveData()));
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
        if (data.version !== 1) { bus.emit('status', '存档版本不兼容', 2); return; }
        applySaveData(data);
        bus.emit('status', '📥 存档已导入', 2);
        bus.emit('hud-refresh');
        bus.emit('hotbar-refresh');
      } catch (e) { bus.emit('status', '导入失败: 文件格式错误', 2); }
    };
    reader.readAsText(file);
  };
  input.click();
}

export function resetGameData() {
  if (!confirm('确定要清除所有存档并重置游戏？此操作不可撤销。')) return;
  localStorage.removeItem('xiuxian_save');
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

function applySaveData(data) {
  Object.assign(P, data.P);
  if (!P.attrs) P.attrs = { str: 0, body: 0, spirit: 0, agility: 0 };
  if (P.attrPoints == null) P.attrPoints = 0;
  if (P.skillPoints == null) P.skillPoints = 0;
  if (!P.skillLevels) P.skillLevels = {};
  if (P.totalGoldEarned == null) P.totalGoldEarned = 0;
  if (P.legendaryFound == null) P.legendaryFound = false;
  if (P.maxWave == null) P.maxWave = 0;
  if (!P.achievements) P.achievements = {};
  ensureProgressionState();
  for (const sk of SKILL_DEFS) {
    if (!P.skillLevels[sk.id]) P.skillLevels[sk.id] = 1;
  }
  refreshSkills();
  initHotbar();
  autoEquipBestEquipment(P);
  setWaveNum(data.wave || 0);
  recalcStats();
}

export function loadGame() {
  try {
    const raw = localStorage.getItem('xiuxian_save');
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 1) return false;
    applySaveData(data);
    return true;
  } catch (e) { return false; }
}

bus.on('save', requestSave);
window.addEventListener('pagehide', flushPendingSave);
