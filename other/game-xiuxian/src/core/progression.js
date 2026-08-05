/* 进度结构防御性初始化：局内技能/强化/成就字段缺省补全 */

import { P } from '@/core/state.js';

export function ensureProgressionState() {
  if (!P.skills) P.skills = [];
  if (!P.skillLevels) P.skillLevels = {};
  if (!P.mods) P.mods = { critChance:0, lifestealPct:0, xpBonus:0, cooldownReduction:0, skillDamage:0,
                         multiShot:0, rangeBoost:0, swordAtkSpeedBoost:0, swordSpeed:0, maxHpBonus:0 };
  if (!P.achievements) P.achievements = {};
  if (!P.equipment) P.equipment = {};
  if (!Array.isArray(P.inventory)) P.inventory = [];
  if (!P.selectedStage) P.selectedStage = 1;
}
