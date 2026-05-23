import '../data/index.js';
import '../core/state.js';
import '../core/helpers.js';
import '../core/save.js';
import { ensureProgressionState } from '../core/progression.js';
import { createGameConfig } from '../core/game-config.js';
import { setGame } from '../core/runtime.js';
import { JoystickController } from '../input/joystick-controller.js';
import { hotbarRender, updateHUD } from '../ui/index.js';
import { bindGlobalActions, uiActions } from '../ui/actions.js';
import { mountTopNav } from '../ui/nav-bar.js';

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

  window.addEventListener('load', () => {
    hotbarRender();
    updateHUD();
    startGame();
    mountTopNav(document.querySelector('.ui-layer'), uiActions);
    mountJoystick();
  });
}
