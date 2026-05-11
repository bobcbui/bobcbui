import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  create(data) {
    const cx = GAME_WIDTH / 2;
    const { level, wave, score } = data || {};

    this.add.text(cx, 120, '游戏结束', { fontSize: '48px', fontFamily: 'Arial, sans-serif', color: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5);
    if (level) this.add.text(cx, 200, `关卡 ${level}  ·  波次 ${wave || 0}`, { fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#cccccc' }).setOrigin(0.5);
    if (score !== undefined) this.add.text(cx, 240, `得分: ${score}`, { fontSize: '24px', fontFamily: 'Arial, sans-serif', color: '#ffdd00' }).setOrigin(0.5);

    this.createButton(cx, 340, '重新开始', () => this.scene.start('GameScene', { level: level || 1 }));
    this.createButton(cx, 410, '返回选关', () => this.scene.start('LevelSelectScene'));
    this.createButton(cx, 480, '返回主菜单', () => this.scene.start('MenuScene'));
  }

  createButton(x, y, label, cb) {
    const w = 200, h = 50;
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.UI_BUTTON, 1); bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    bg.lineStyle(2, COLORS.UI_BORDER, 1); bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    this.add.text(x, y, label, { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#ffffff' }).setOrigin(0.5);
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerdown', cb);
  }
}
