import { bus } from './events.js';
import { SKILL_DEFS, UPGRADE_DEFS } from '../data/index.js';

export const G = {
  hp: 100,
  maxHp: 100,
  atk: 15,
  atkSpeed: 1.5,
  gold: 0,
  score: 0,
  wave: 0,
  kills: 0,
  skillLevels: {},
  upgradeLevels: {}
};

export let waveActive = false;
export let waveIntermission = true;
export let waveTimer = 0;
export let waveIntermissionTimer = 0;
export let waveMonstersRemaining = 0;
export let waveMonstersTotal = 0;
export let gameOver = false;

export function setWaveActive(v) { waveActive = v; }
export function setWaveIntermission(v) { waveIntermission = v; }
export function setWaveTimer(v) { waveTimer = v; }
export function setWaveIntermissionTimer(v) { waveIntermissionTimer = v; }
export function setWaveMonstersRemaining(v) { waveMonstersRemaining = v; }
export function setWaveMonstersTotal(v) { waveMonstersTotal = v; }
export function setGameOver(v) { gameOver = v; }

export function initState() {
  G.hp = G.maxHp;
  G.atk = 15;
  G.atkSpeed = 1.5;
  G.gold = 0;
  G.score = 0;
  G.wave = 0;
  G.kills = 0;
  G.skillLevels = {};
  G.upgradeLevels = {};
  for (const sk of SKILL_DEFS) {
    G.skillLevels[sk.id] = 1;
  }
  for (const up of UPGRADE_DEFS) {
    G.upgradeLevels[up.id] = 0;
  }
  waveActive = false;
  waveIntermission = true;
  waveTimer = 0;
  waveIntermissionTimer = 3;
  waveMonstersRemaining = 0;
  waveMonstersTotal = 0;
  gameOver = false;
}

export function recalcStats() {
  G.atk = 15 + (G.upgradeLevels.atk || 0) * 5;
  G.atkSpeed = 1.5 + (G.upgradeLevels.atkSpeed || 0) * 0.3;
  G.maxHp = 100 + (G.upgradeLevels.hp || 0) * 20;
  G.hp = Math.min(G.hp, G.maxHp);
}

export function getUpgradeCost(upgradeId) {
  const lv = G.upgradeLevels[upgradeId] || 0;
  const def = UPGRADE_DEFS.find(u => u.id === upgradeId);
  if (!def) return 999999;
  return Math.floor(def.baseCost * Math.pow(def.costScale, lv));
}
