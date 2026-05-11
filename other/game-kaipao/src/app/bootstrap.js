import '../data/index.js';
import '../core/state.js';
import '../core/save.js';
import { createGameConfig } from '../core/game-config.js';
import { setGame } from '../core/runtime.js';
import { renderHUD, renderSkillList } from '../ui/index.js';
import { bindGlobalActions } from '../ui/actions.js';
import * as stateModule from '../core/state.js';
import * as dataModule from '../data/index.js';
import * as uiModule from '../ui/index.js';

function startGame() {
  const canvas = document.getElementById('gameCanvas');
  const game = new Phaser.Game(createGameConfig(canvas));
  setGame(game);

  const checkScene = setInterval(() => {
    const scene = game.scene.getScene('main');
    if (scene) {
      window._scene = scene;
      window._stateModule = stateModule;
      window._dataModule = dataModule;
      window._uiModule = uiModule;
      clearInterval(checkScene);
    }
  }, 100);
}

export function bootstrap() {
  bindGlobalActions();

  window.addEventListener('load', () => {
    renderHUD();
    renderSkillList();
    startGame();
  });
}
