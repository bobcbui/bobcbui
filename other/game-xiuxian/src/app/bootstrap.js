import '../data/index.js';
import '../core/state.js';
import '../core/helpers.js';
import '../core/save.js';
import { ensureProgressionState } from '../core/progression.js';
import { createGameConfig } from '../core/game-config.js';
import { setGame } from '../core/runtime.js';
import { JoystickController } from '../input/joystick-controller.js';
import { hotbarRender, updateHUD, toggleHudExpand } from '../ui/index.js';
import { bindGlobalActions, uiActions } from '../ui/actions.js';
import { mountTopNav, mountBottomNav } from '../ui/nav-bar.js';
import { reportLoading, showLoadingBar, setStartBtnEnabled } from './loader.js';

function markTouchDevice() {
  if (window.ontouchstart !== undefined || navigator.maxTouchPoints > 0) {
    document.body.classList.add('has-touch');
  }
}

function mountJoystick() {
  const joyZone = document.getElementById('joystick-zone');
  const joyThumb = document.getElementById('joystick-thumb');
  new JoystickController(joyZone, joyThumb).mount();
}

function startGame() {
  const canvas = document.getElementById('gameCanvas');
  const game = new Phaser.Game(createGameConfig(canvas));
  setGame(game);
}

export function bootstrap() {
  ensureProgressionState();
  bindGlobalActions();
  markTouchDevice();

  // Auto-start game on page load
  window.addEventListener('load', () => {
    showLoadingBar();
    setStartBtnEnabled(false);
    reportLoading(5, '启动游戏引擎...');

    hotbarRender();
    updateHUD();
    reportLoading(20, '创建游戏场景...');

    startGame();
    mountJoystick();
  });

  window.toggleHudExpand = toggleHudExpand;
}
