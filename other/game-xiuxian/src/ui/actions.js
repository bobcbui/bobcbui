/* ============================================================================
 * 全局动作表 ACTIONS + data-action 事件委托
 * index.html 与 JS 动态生成的按钮统一通过 data-action / data-arg 触发
 * ========================================================================== */

import {
  addAttr,
  buyShopItem,
  doBagEquip,
  doBagSell,
  sellAllBagItems,
  renderGameplayPanel,
  equipSkill,
  showSlotPick,
  toggleAchPanel,
  toggleBagPanel,
  toggleCharPanel,
  toggleShopPanel,
  toggleGameplayPanel,
  toggleHudExpand,
  toggleSkillPanel,
  updateCharPanel,
  upgradeSkill
} from '@/ui/index.js';
import {
  claimBestiaryReward,
  claimQuest,
  craftRecipe,
  enhanceEquipped,
  evolveSkill,
  learnTalent,
  reforgeEquipped,
  resetQuests,
  startDungeon
} from '@/core/progression.js';
import {
  exportSaveData,
  importSaveData,
  manualSave,
  resetGameData,
  toggleSettingsPanel
} from '@/core/save.js';
import {
  cancelBreakthrough,
  doBreakthrough,
  toggleCultivate,
  tryBreakthrough
} from '@/core/cultivation.js';
import { getScene } from '@/core/runtime.js';

/* ---- 组合动作（原内联 onclick 多语句调用） ---- */
function enhanceAndRefresh(slot){ enhanceEquipped(slot); renderGameplayPanel(); updateCharPanel(); }
function reforgeAndRefresh(slot){ reforgeEquipped(slot); renderGameplayPanel(); updateCharPanel(); }
function craftAndRefresh(id){ craftRecipe(id); renderGameplayPanel(); }
function claimQuestAndRefresh(id){ claimQuest(id); renderGameplayPanel(); }
function resetQuestsAndRefresh(){ resetQuests(); renderGameplayPanel(); }
function evolveAndRefresh(id){ evolveSkill(id); renderGameplayPanel(); }
function claimBestiaryAndRefresh(name){ claimBestiaryReward(name); renderGameplayPanel(); }
function learnTalentAndRefresh(id){ learnTalent(id); renderGameplayPanel(); updateCharPanel(); }
function dungeonAndRefresh(){ startDungeon(); renderGameplayPanel(); }
function enterDefense(){ const sc = getScene(); if (sc) sc.startDefense(); toggleGameplayPanel(); }
function closeBagMenu(){ const m = document.getElementById('bagMenuOverlay'); if (m) m.remove(); }
function respawnPlayer(){ const sc = getScene(); if (sc) sc.respawnPlayer(); }
function reloadPage(){ location.reload(); }
function startAdventure(){ const sc = getScene(); if (sc) sc.startAdventure(); }

/* ---- 全局动作表 ---- */
export const ACTIONS = {
  addAttr,
  buyShopItem,
  cancelBreakthrough,
  claimBestiaryAndRefresh,
  claimBestiaryReward,
  claimQuest,
  claimQuestAndRefresh,
  closeBagMenu,
  craftAndRefresh,
  craftRecipe,
  doBagEquip,
  doBagSell,
  doBreakthrough,
  dungeonAndRefresh,
  enhanceAndRefresh,
  enhanceEquipped,
  enterDefense,
  equipSkill,
  evolveAndRefresh,
  evolveSkill,
  exportSaveData,
  importSaveData,
  learnTalent,
  learnTalentAndRefresh,
  manualSave,
  reforgeAndRefresh,
  reforgeEquipped,
  reloadPage,
  renderGameplayPanel,
  resetGameData,
  resetQuests,
  resetQuestsAndRefresh,
  respawnPlayer,
  sellAllBagItems,
  showSlotPick,
  startAdventure,
  startDungeon,
  toggleAchPanel,
  toggleBagPanel,
  toggleCharPanel,
  toggleCultivate,
  toggleGameplayPanel,
  toggleHudExpand,
  toggleSettingsPanel,
  toggleShopPanel,
  toggleSkillPanel,
  tryBreakthrough,
  upgradeSkill
};

/* ---- 统一事件委托：data-action -> ACTIONS ---- */
export function bindActions() {
  document.addEventListener('click', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el) return;
    const fn = ACTIONS[el.getAttribute('data-action')];
    if (typeof fn !== 'function') return;
    const arg = el.getAttribute('data-arg');
    if (arg !== null) fn(arg);
    else fn();
  });
}
