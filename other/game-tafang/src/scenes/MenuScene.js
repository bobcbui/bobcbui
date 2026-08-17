import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { getTotalLevels } from '../config/levelConfig.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 116, '2D 塔防游戏', { fontSize: '42px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cx, 164, 'TOWER DEFENSE  ·  MOBILE EDITION', { fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#6f87b3', letterSpacing: 2 }).setOrigin(0.5);

    const badge = this.add.graphics();
    badge.fillStyle(0x182b4b, 1);
    badge.fillRoundedRect(cx - 110, 205, 220, 34, 17);
    badge.lineStyle(1, 0x2d568e, 0.8);
    badge.strokeRoundedRect(cx - 110, 205, 220, 34, 17);
    this.add.text(cx, 222, '守住基地 · 赢下每一波', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#9fc7ff' }).setOrigin(0.5);

    this.createButton(cx, 320, '开始游戏', () => {
      this.scene.start('LevelSelectScene');
    });

    const continueBtn = this.createButton(cx, 390, '继续游戏', () => {
      const save = JSON.parse(localStorage.getItem('td_save') || '{}');
      const lvl = save.currentLevel || 1;
      this.scene.start('GameScene', { level: lvl });
    });

    const saved = localStorage.getItem('td_save');
    if (!saved) {
      continueBtn.setAlpha(0.4);
      continueBtn.removeInteractive();
    }

    const guide = this.add.graphics();
    guide.fillStyle(0x101a30, 0.92);
    guide.fillRoundedRect(36, 520, GAME_WIDTH - 72, 196, 16);
    guide.lineStyle(1, 0x263e65, 1);
    guide.strokeRoundedRect(36, 520, GAME_WIDTH - 72, 196, 16);
    this.add.text(60, 548, '新手指南', { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#dbe9ff', fontStyle: 'bold' });
    this.add.text(60, 588, '01  选择下方防御塔，再点击地图空地建造', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#9aaaca' });
    this.add.text(60, 624, '02  点击已建防御塔，可升级或出售', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#9aaaca' });
    this.add.text(60, 660, '03  准备好后点击“开始下一波”', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#9aaaca' });
    this.add.text(cx, 820, '自动保存进度 · 支持触控操作', { fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#526383' }).setOrigin(0.5);
  }

  createButton(x, y, label, callback) {
    const w = 300, h = 58;
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.UI_BUTTON, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    bg.lineStyle(2, COLORS.UI_BORDER, 1);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);

    const txt = this.add.text(x, y, label, { fontSize: '21px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { bg.clear(); bg.fillStyle(COLORS.UI_BUTTON_HOVER, 1); bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12); bg.lineStyle(2, COLORS.UI_BORDER, 1); bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12); });
    zone.on('pointerout', () => { bg.clear(); bg.fillStyle(COLORS.UI_BUTTON, 1); bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12); bg.lineStyle(2, COLORS.UI_BORDER, 1); bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12); });
    zone.on('pointerdown', callback);
    return zone;
  }
}
