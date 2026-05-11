import { bus } from './events.js';
import { G } from './state.js';
import { SKILL_DEFS, UPGRADE_DEFS } from '../data/index.js';

function buildSaveData() {
  return {
    G: {
      maxHp: G.maxHp,
      atk: G.atk,
      atkSpeed: G.atkSpeed,
      gold: G.gold,
      score: G.score,
      kills: G.kills,
      wave: G.wave,
      skillLevels: G.skillLevels,
      upgradeLevels: G.upgradeLevels
    },
    version: 1
  };
}

export function saveGame() {
  try {
    localStorage.setItem('kaipao_save', JSON.stringify(buildSaveData()));
  } catch (e) {}
}

export function loadGame() {
  try {
    const raw = localStorage.getItem('kaipao_save');
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 1) return false;
    G.wave = data.G.wave || 0;
    G.maxHp = data.G.maxHp || 100;
    G.atk = data.G.atk || 15;
    G.atkSpeed = data.G.atkSpeed || 1.5;
    G.gold = data.G.gold || 0;
    G.score = data.G.score || 0;
    G.kills = data.G.kills || 0;
    G.skillLevels = data.G.skillLevels || {};
    G.upgradeLevels = data.G.upgradeLevels || {};
    for (const sk of SKILL_DEFS) {
      if (!G.skillLevels[sk.id]) G.skillLevels[sk.id] = 1;
    }
    for (const up of UPGRADE_DEFS) {
      if (G.upgradeLevels[up.id] === undefined) G.upgradeLevels[up.id] = 0;
    }
    return true;
  } catch (e) { return false; }
}

export function resetGameData() {
  localStorage.removeItem('kaipao_save');
  location.reload();
}

bus.on('save', saveGame);
