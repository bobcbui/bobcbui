import {
  addAttr,
  buyShopItem,
  doBagEquip,
  doBagSell,
  equipSkill,
  showSlotPick,
  toggleAchPanel,
  toggleBagPanel,
  toggleCharPanel,
  toggleShopPanel,
  toggleSkillPanel,
  updateHotbarCooldowns,
  upgradeSkill
} from './index.js';
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
  doBreakthrough,
  equipSkill,
  exportSaveData,
  importSaveData,
  manualSave,
  resetGameData,
  showSlotPick,
  toggleAchPanel,
  toggleBagPanel,
  toggleCharPanel,
  toggleCultivate,
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
