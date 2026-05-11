import { bus } from './events.js';
import { G } from './state.js';

function buildSaveData() {
  return {
    G: {
      maxHp: G.maxHp,
      atk: G.atk,
      atkSpeed: G.atkSpeed,
      swordLevel: G.swordLevel,
      stage: G.stage,
      skills: G.skills,
      score: G.score,
      kills: G.kills
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
    const d = data.G;
    G.maxHp = d.maxHp || 100;
    G.atk = d.atk || 15;
    G.atkSpeed = d.atkSpeed || 1.2;
    G.swordLevel = d.swordLevel || 1;
    G.stage = d.stage || 1;
    G.skills = d.skills || [];
    G.score = d.score || 0;
    G.kills = d.kills || 0;
    G.hp = G.maxHp;
    return true;
  } catch (e) { return false; }
}

bus.on('save', saveGame);
