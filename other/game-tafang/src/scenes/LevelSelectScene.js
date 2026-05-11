import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { getTotalLevels, getLevelInfo } from '../config/levelConfig.js';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }

  create() {
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 50, '选择关卡', { fontSize: '36px', fontFamily: 'Arial, sans-serif', color: '#ffffff' }).setOrigin(0.5);

    const save = JSON.parse(localStorage.getItem('td_save') || '{}');
    const unlockedLevel = save.maxLevel || 1;
    const stars = save.stars || {};

    const total = getTotalLevels();
    const cardW = 160, cardH = 140, gap = 24;
    const startX = cx - ((Math.min(total, 5)) * (cardW + gap) - gap) / 2 + cardW / 2;

    for (let i = 1; i <= total; i++) {
      const idx = i - 1;
      const x = startX + idx * (cardW + gap);
      const y = 220;
      const info = getLevelInfo(i);
      const unlocked = i <= unlockedLevel;
      const starCount = stars[i] || 0;

      const bg = this.add.graphics();
      bg.fillStyle(unlocked ? COLORS.UI_BUTTON : COLORS.UI_BUTTON_DISABLED, 1);
      bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      bg.lineStyle(2, COLORS.UI_BORDER, 1);
      bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);

      this.add.text(x, y - 30, `${info.name}`, { fontSize: '16px', fontFamily: 'Arial, sans-serif', color: unlocked ? '#ffffff' : '#666666' }).setOrigin(0.5);
      this.add.text(x, y + 5, `第${i}关`, { fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#888888' }).setOrigin(0.5);

      if (unlocked) {
        let starStr = '';
        for (let s = 1; s <= 3; s++) starStr += s <= starCount ? '★' : '☆';
        this.add.text(x, y + 30, starStr, { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#ffdd00' }).setOrigin(0.5);

        const zone = this.add.zone(x, y, cardW, cardH).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => { bg.clear(); bg.fillStyle(COLORS.UI_BUTTON_HOVER, 1); bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10); bg.lineStyle(2, COLORS.UI_BORDER, 1); bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10); });
        zone.on('pointerout', () => { bg.clear(); bg.fillStyle(COLORS.UI_BUTTON, 1); bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10); bg.lineStyle(2, COLORS.UI_BORDER, 1); bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10); });
        zone.on('pointerdown', () => {
          this.scene.start('GameScene', { level: i });
        });
      } else {
        this.add.text(x, y + 25, '🔒', { fontSize: '22px' }).setOrigin(0.5);
      }
    }

    const backBtn = this.add.text(60, GAME_HEIGHT - 50, '← 返回', { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa' }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#aaaaaa'));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
