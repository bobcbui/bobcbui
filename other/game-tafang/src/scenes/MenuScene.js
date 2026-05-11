import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { getTotalLevels } from '../config/levelConfig.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 80, '2D 塔防游戏', { fontSize: '48px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cx, 130, 'Tower Defense', { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#888888' }).setOrigin(0.5);

    const startBtn = this.createButton(cx, 240, '开始游戏', () => {
      this.scene.start('LevelSelectScene');
    });

    const continueBtn = this.createButton(cx, 310, '继续游戏', () => {
      const save = JSON.parse(localStorage.getItem('td_save') || '{}');
      const lvl = save.currentLevel || 1;
      this.scene.start('GameScene', { level: lvl });
    });

    const saved = localStorage.getItem('td_save');
    if (!saved) {
      continueBtn.setAlpha(0.4);
      continueBtn.removeInteractive();
    }

    this.add.text(cx, 440, '操作说明', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#666666' }).setOrigin(0.5);
    this.add.text(cx, 470, '选择底部的塔 → 点击地图空地建造', { fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#555555' }).setOrigin(0.5);
    this.add.text(cx, 490, '点击已建塔查看信息 → 升级 / 出售', { fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#555555' }).setOrigin(0.5);
    this.add.text(cx, 510, '使用左下技能按钮释放主动技能', { fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#555555' }).setOrigin(0.5);
  }

  createButton(x, y, label, callback) {
    const w = 200, h = 50;
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.UI_BUTTON, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    bg.lineStyle(2, COLORS.UI_BORDER, 1);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    const txt = this.add.text(x, y, label, { fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#ffffff' }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { bg.clear(); bg.fillStyle(COLORS.UI_BUTTON_HOVER, 1); bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8); bg.lineStyle(2, COLORS.UI_BORDER, 1); bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8); });
    zone.on('pointerout', () => { bg.clear(); bg.fillStyle(COLORS.UI_BUTTON, 1); bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8); bg.lineStyle(2, COLORS.UI_BORDER, 1); bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8); });
    zone.on('pointerdown', callback);
    return zone;
  }
}
