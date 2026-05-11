import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { getTotalLevels } from '../config/levelConfig.js';

export default class WinScene extends Phaser.Scene {
  constructor() { super('WinScene'); }

  create(data) {
    const cx = GAME_WIDTH / 2;
    const { level, stars, score, livesLeft, goldLeft } = data || {};
    const nextLevel = (level || 1) + 1;
    const hasNext = nextLevel <= getTotalLevels();

    this.add.text(cx, 80, '胜利！', { fontSize: '52px', fontFamily: 'Arial, sans-serif', color: '#44ff44', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cx, 140, `关卡 ${level || '?'} 通过`, { fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#cccccc' }).setOrigin(0.5);

    if (stars) {
      let s = '';
      for (let i = 1; i <= 3; i++) s += i <= stars ? '★' : '☆';
      this.add.text(cx, 190, s, { fontSize: '36px', fontFamily: 'Arial, sans-serif', color: '#ffdd00' }).setOrigin(0.5);
    }

    if (score !== undefined) this.add.text(cx, 250, `得分: ${score}`, { fontSize: '22px', fontFamily: 'Arial, sans-serif', color: '#ffffff' }).setOrigin(0.5);
    if (livesLeft !== undefined) this.add.text(cx, 280, `剩余生命: ${livesLeft}  ·  剩余金币: ${goldLeft || 0}`, { fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa' }).setOrigin(0.5);

    if (hasNext) {
      this.createButton(cx, 370, '下一关', () => this.scene.start('GameScene', { level: nextLevel }));
    }
    this.createButton(cx, 440, '重新挑战', () => this.scene.start('GameScene', { level: level || 1 }));
    this.createButton(cx, 510, '返回选关', () => this.scene.start('LevelSelectScene'));
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
