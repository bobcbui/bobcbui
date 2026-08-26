import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { soundManager } from '../utils/soundManager.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data) {
    const cx = GAME_WIDTH / 2;
    const { level, wave, score } = data || {};

    const bg = this.add.graphics();
    bg.fillStyle(0x0c4a6e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Crying Carrot Icon
    this.add.text(cx, 160, '😭', { fontSize: '68px' }).setOrigin(0.5);

    this.add.text(cx, 240, '大萝卜被吃掉啦！', {
      fontSize: '38px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#f87171',
      fontStyle: 'bold',
      stroke: '#450a0a',
      strokeThickness: 6,
    }).setOrigin(0.5);

    if (level) {
      this.add.text(cx, 300, `战役：第 ${level} 关  ·  已坚守至第 ${wave || 0} 波`, {
        fontSize: '16px',
        fontFamily: 'system-ui, Arial, sans-serif',
        color: '#e0f2fe',
      }).setOrigin(0.5);
    }

    if (score !== undefined) {
      this.add.text(cx, 345, `本次战役得分: ${score}`, {
        fontSize: '22px',
        fontFamily: 'system-ui, Arial, sans-serif',
        color: '#facc15',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    // Action Buttons
    this.createButton(cx, 460, '🔄 重新保卫萝卜', 0x16a34a, 0x22c55e, () => {
      soundManager.playClick();
      this.scene.start('GameScene', { level: level || 1 });
    });

    this.createButton(cx, 540, '🗺️ 返回选关', 0x075985, 0x0284c7, () => {
      soundManager.playClick();
      this.scene.start('LevelSelectScene');
    });

    this.createButton(cx, 620, '🏠 返回主菜单', 0x075985, 0x0284c7, () => {
      soundManager.playClick();
      this.scene.start('MenuScene');
    });
  }

  createButton(x, y, label, bgColor, hoverColor, callback) {
    const w = 300;
    const h = 54;
    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    bg.lineStyle(2, 0xffffff, 0.3);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);

    this.add.text(x, y, label, {
      fontSize: '18px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
      bg.lineStyle(2, 0xffffff, 0.6);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    });
    zone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
      bg.lineStyle(2, 0xffffff, 0.3);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    });
    zone.on('pointerdown', callback);
  }
}
