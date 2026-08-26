import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { getTotalLevels } from '../config/levelConfig.js';
import { soundManager } from '../utils/soundManager.js';

export default class WinScene extends Phaser.Scene {
  constructor() {
    super('WinScene');
  }

  create(data) {
    const cx = GAME_WIDTH / 2;
    const { level, stars, score, livesLeft, goldLeft } = data || {};
    const nextLevel = (level || 1) + 1;
    const hasNext = nextLevel <= getTotalLevels();

    const bg = this.add.graphics();
    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const isGoldLotus = stars === 3;
    this.add.text(cx, 130, isGoldLotus ? '👑🌸' : '🌸', { fontSize: '64px' }).setOrigin(0.5);

    this.add.text(cx, 215, isGoldLotus ? '荣获金莲天道勋章！' : '成功保卫我方圣女！', {
      fontSize: '36px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#047857',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 265, `第 ${level || 1} 关 护法大捷`, {
      fontSize: '18px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#fde047',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stars / Lotus
    if (stars) {
      let lotusStr = '';
      for (let i = 1; i <= 3; i++) lotusStr += i <= stars ? '🪷' : '⚪';
      this.add.text(cx, 315, lotusStr, {
        fontSize: '38px',
        fontFamily: 'system-ui, Arial, sans-serif',
      }).setOrigin(0.5);
    }

    // Stats
    if (score !== undefined) {
      this.add.text(cx, 375, `战役功勋: ${score}`, {
        fontSize: '22px',
        fontFamily: 'system-ui, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    this.add.text(cx, 410, `圣女灵力: ${livesLeft}/10 🌸  ·  结余灵石: ${goldLeft || 0} 💎`, {
      fontSize: '14px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#a7f3d0',
    }).setOrigin(0.5);

    // Buttons
    let btnY = 480;
    if (hasNext) {
      this.createButton(cx, btnY, '▶ 进入下一关护法', 0x16a34a, 0x22c55e, () => {
        soundManager.playClick();
        this.scene.start('GameScene', { level: nextLevel });
      });
      btnY += 75;
    }

    this.createButton(cx, btnY, '🔄 再次演练阵法', 0xd97706, 0xf59e0b, () => {
      soundManager.playClick();
      this.scene.start('GameScene', { level: level || 1 });
    });
    btnY += 75;

    this.createButton(cx, btnY, '🗺️ 返回护法道场', 0x047857, 0x059669, () => {
      soundManager.playClick();
      this.scene.start('LevelSelectScene');
    });
  }

  createButton(x, y, label, bgColor, hoverColor, callback) {
    const w = 300;
    const h = 54;
    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    bg.lineStyle(2, 0xffffff, 0.4);
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
      bg.lineStyle(2, 0xffffff, 0.7);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    });
    zone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
      bg.lineStyle(2, 0xffffff, 0.4);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    });
    zone.on('pointerdown', callback);
  }
}
