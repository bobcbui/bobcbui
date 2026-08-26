import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    const bg = this.add.graphics();
    bg.fillStyle(0x0ea5e9, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '🥕 保卫大萝卜', {
      fontSize: '40px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#ea580c',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, '正在准备可爱的萝卜世界...', {
      fontSize: '14px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#fef08a',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.time.delayedCall(400, () => {
      this.scene.start('MenuScene');
    });
  }
}
