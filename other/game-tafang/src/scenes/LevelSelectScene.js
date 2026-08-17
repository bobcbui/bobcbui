import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { getTotalLevels, getLevelInfo } from '../config/levelConfig.js';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }

  create() {
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 70, '选择关卡', { fontSize: '36px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cx, 112, '选择一张地图开始防守', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#7183a6' }).setOrigin(0.5);

    const save = JSON.parse(localStorage.getItem('td_save') || '{}');
    const unlockedLevel = save.maxLevel || 1;
    const stars = save.stars || {};

    const total = getTotalLevels();
    const cardW = 204, cardH = 148, gapX = 16, gapY = 18;
    const startX = 18 + cardW / 2;

    for (let i = 1; i <= total; i++) {
      const idx = i - 1;
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = startX + col * (cardW + gapX);
      const y = 190 + row * (cardH + gapY);
      const info = getLevelInfo(i);
      const unlocked = i <= unlockedLevel;
      const starCount = stars[i] || 0;

      const bg = this.add.graphics();
      bg.fillStyle(unlocked ? COLORS.UI_BUTTON : COLORS.UI_BUTTON_DISABLED, 1);
      bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      bg.lineStyle(2, COLORS.UI_BORDER, 1);
      bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);

      this.add.text(x, y - 40, `${info.name}`, { fontSize: '17px', fontFamily: 'Arial, sans-serif', color: unlocked ? '#ffffff' : '#666666', fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(x, y - 8, `第 ${i} 关`, { fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#93a1bd' }).setOrigin(0.5);

      if (unlocked) {
        let starStr = '';
        for (let s = 1; s <= 3; s++) starStr += s <= starCount ? '★' : '☆';
        this.add.text(x, y + 28, starStr, { fontSize: '22px', fontFamily: 'Arial, sans-serif', color: '#ffdd00' }).setOrigin(0.5);

        const zone = this.add.zone(x, y, cardW, cardH).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => { bg.clear(); bg.fillStyle(COLORS.UI_BUTTON_HOVER, 1); bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10); bg.lineStyle(2, COLORS.UI_BORDER, 1); bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10); });
        zone.on('pointerout', () => { bg.clear(); bg.fillStyle(COLORS.UI_BUTTON, 1); bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10); bg.lineStyle(2, COLORS.UI_BORDER, 1); bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10); });
        zone.on('pointerdown', () => {
          this.scene.start('GameScene', { level: i });
        });
      } else {
        this.add.text(x, y + 28, '🔒', { fontSize: '24px' }).setOrigin(0.5);
      }
    }

    const backBtn = this.add.text(30, GAME_HEIGHT - 48, '← 返回主菜单', { fontSize: '17px', fontFamily: 'Arial, sans-serif', color: '#9aaaca' }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#aaaaaa'));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
