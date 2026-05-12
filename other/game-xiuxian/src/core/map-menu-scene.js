import { WORLD } from '../data/index.js';
import { P, recalcStats } from './state.js';
import { setScene } from './runtime.js';
import { loadGame } from './save.js';
import { renderAllTabs } from '../ui/index.js';

export class MapMenuScene extends Phaser.Scene {
  constructor(){ super({key:'MapMenu'}); }

  create(){
    setScene(this);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBackgroundColor('#efe3c0');

    loadGame();
    recalcStats();
    renderAllTabs();
    window.returnToMenu();
  }
}
