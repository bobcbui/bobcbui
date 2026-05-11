import { bus } from './events.js';

export const G = {
  hp: 100,
  maxHp: 100,
  atk: 15,
  atkSpeed: 1.2,
  swordLevel: 1,
  stage: 1,
  level: 1,
  kills: 0,
  score: 0,
  skills: [],
  skillSlots: 5
};

export let waveLevel = 1;
export let levelActive = false;
export let levelIntermission = false;
export let levelTimer = 0;
export let monstersRemaining = 0;
export let monstersTotal = 0;
export let gameOver = false;
export let cardDrawPhase = false;

export function setLevel(v) { levelIntermission = false; levelActive = false; }
export function setWaveLevel(v) { waveLevel = v; }
export function setLevelActive(v) { levelActive = v; }
export function setLevelIntermission(v) { levelIntermission = v; }
export function setLevelTimer(v) { levelTimer = v; }
export function setMonstersRemaining(v) { monstersRemaining = v; }
export function setMonstersTotal(v) { monstersTotal = v; }
export function setGameOver(v) { gameOver = v; }
export function setCardDrawPhase(v) { cardDrawPhase = v; }

export function initGameState() {
  G.hp = 100;
  G.maxHp = 100;
  G.atk = 15;
  G.atkSpeed = 1.2;
  G.swordLevel = 1;
  G.stage = 1;
  G.level = 1;
  G.kills = 0;
  G.score = 0;
  G.skills = [];
  G.skillSlots = 5;
  waveLevel = 1;
  levelActive = false;
  levelIntermission = false;
  levelTimer = 0;
  monstersRemaining = 0;
  monstersTotal = 0;
  gameOver = false;
  cardDrawPhase = false;
}

export function recalcStats() {
  G.atk = 15 + (G.swordLevel - 1) * 5;
  G.atkSpeed = 1.2 + (G.swordLevel - 1) * 0.08;
  G.maxHp = 100 + (G.swordLevel - 1) * 10;
  G.hp = Math.min(G.hp, G.maxHp);
}

export function hasSkill(skillId) {
  return G.skills.some(s => s.id === skillId);
}

export function getSkillLevel(skillId) {
  const sk = G.skills.find(s => s.id === skillId);
  return sk ? sk.level : 0;
}

export function addSkill(skillId) {
  if (G.skills.length >= G.skillSlots) return false;
  if (hasSkill(skillId)) return false;
  G.skills.push({ id: skillId, level: 1 });
  return true;
}

export function upgradeSkill(skillId) {
  const sk = G.skills.find(s => s.id === skillId);
  if (sk) {
    sk.level++;
    return true;
  }
  return false;
}

export function upgradeSword() {
  G.swordLevel++;
  recalcStats();
}

export function getActiveSkills() {
  return G.skills;
}
