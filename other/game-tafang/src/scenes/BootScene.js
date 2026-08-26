import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    const bg = this.add.graphics();
    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '🌸 保卫圣女', {
      fontSize: '44px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#047857',
      strokeThickness: 7,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, '魔族妖人来袭，正在开启护法法阵...', {
      fontSize: '14px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#fde047',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.time.delayedCall(400, () => {
      this.scene.start('MenuScene');
    });
  }
}
