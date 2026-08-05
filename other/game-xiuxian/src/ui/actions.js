/* ============================================================================
 * 全局动作表 ACTIONS + data-action 事件委托
 * index.html 与 JS 动态生成的按钮统一通过 data-action / data-arg 触发
 * ========================================================================== */

import { P } from '@/core/state.js';
import { getScene } from '@/core/runtime.js';
import {
  exportSaveData,
  importSaveData,
  manualSave,
  resetGameData,
  toggleSettingsPanel
} from '@/core/save.js';
import { equipItem, unequipItem } from '@/core/equipment.js';
import { menuTab, prevStage, nextStage } from '@/ui/index.js';

/* ---- 场景动作 ---- */
function enterStage(){
  const sc = getScene();
  if (sc) sc.stageSystem?.start(P.selectedStage);
}

function pickCard(cardId){
  const sc = getScene();
  if (sc) sc.cardSystem?.pick(cardId);
}

function backToMenu(){
  const sc = getScene();
  if (sc) sc.stageSystem?.backToMenu();
}

/* ---- 全局动作表 ---- */
export const ACTIONS = {
  backToMenu,
  enterStage,
  equipItem,
  exportSaveData,
  importSaveData,
  manualSave,
  menuTab,
  nextStage,
  pickCard,
  prevStage,
  resetGameData,
  toggleSettingsPanel,
  unequipItem
};

/* ---- 统一事件委托：data-action -> ACTIONS ---- */
export function bindActions() {
  window.XiuxianMenuBridge = { enterStage, menuTab, nextStage, prevStage };
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
