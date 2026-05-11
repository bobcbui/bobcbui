import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '2D 塔防游戏', {
      fontSize: '32px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
    }).setOrigin(0.5);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, '加载中...', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa',
    }).setOrigin(0.5);

    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
