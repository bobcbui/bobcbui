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
  updateHotbarCooldowns,
  upgradeSkill
} from './index.js';
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
} from '../core/progression.js';
import {
  exportSaveData,
  importSaveData,
  manualSave,
  resetGameData,
  toggleSettingsPanel
} from '../core/save.js';
import {
  cancelBreakthrough,
  doBreakthrough,
  toggleCultivate,
  tryBreakthrough
} from '../core/cultivation.js';
import { getScene } from '../core/runtime.js';

export const uiActions = {
  addAttr,
  buyShopItem,
  cancelBreakthrough,
  doBagEquip,
  doBagSell,
  sellAllBagItems,
  claimBestiaryReward,
  claimQuest,
  craftRecipe,
  doBreakthrough,
  enhanceEquipped,
  equipSkill,
  evolveSkill,
  exportSaveData,
  importSaveData,
  learnTalent,
  manualSave,
  reforgeEquipped,
  renderGameplayPanel,
  resetGameData,
  resetQuests,
  showSlotPick,
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
  updateHotbarCooldowns,
  upgradeSkill
};

export function bindGlobalActions(target = window) {
  Object.assign(target, uiActions, {
    teleportToZone(zoneId) {
      getScene()?.teleportToZone?.(zoneId);
    }
  });
}
