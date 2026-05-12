import {
  cancelBreakthrough,
  doBreakthrough,
  toggleCultivate,
  tryBreakthrough
} from '../core/cultivation.js';

export const uiActions = {
  cancelBreakthrough,
  doBreakthrough,
  toggleCultivate,
  tryBreakthrough,
};

export function bindGlobalActions(target = window) {
  Object.assign(target, uiActions);
}
