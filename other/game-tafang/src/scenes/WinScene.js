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
    bg.fillStyle(0x0ea5e9, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Mascot
    const isGoldCarrot = stars === 3;
    this.add.text(cx, 130, isGoldCarrot ? '👑🥕' : '🥕', { fontSize: '64px' }).setOrigin(0.5);

    this.add.text(cx, 215, isGoldCarrot ? '获得金萝卜勋章！' : '成功保卫大萝卜！', {
      fontSize: '38px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#ea580c',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 265, `第 ${level || 1} 关 完美通关`, {
      fontSize: '18px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#fef08a',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stars
    if (stars) {
      let starStr = '';
      for (let i = 1; i <= 3; i++) starStr += i <= stars ? '★' : '☆';
      this.add.text(cx, 315, starStr, {
        fontSize: '44px',
        fontFamily: 'system-ui, Arial, sans-serif',
        color: '#facc15',
        stroke: '#854d0e',
        strokeThickness: 4,
      }).setOrigin(0.5);
    }

    // Stats
    if (score !== undefined) {
      this.add.text(cx, 375, `战役得分: ${score}`, {
        fontSize: '22px',
        fontFamily: 'system-ui, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    this.add.text(cx, 410, `萝卜生命: ${livesLeft}/10 🥕  ·  剩余金币: ${goldLeft || 0} 💰`, {
      fontSize: '14px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#e0f2fe',
    }).setOrigin(0.5);

    // Buttons
    let btnY = 480;
    if (hasNext) {
      this.createButton(cx, btnY, '▶ 进入下一关', 0x16a34a, 0x22c55e, () => {
        soundManager.playClick();
        this.scene.start('GameScene', { level: nextLevel });
      });
      btnY += 75;
    }

    this.createButton(cx, btnY, '🔄 再次挑战', 0xf59e0b, 0xfbbf24, () => {
      soundManager.playClick();
      this.scene.start('GameScene', { level: level || 1 });
    });
    btnY += 75;

    this.createButton(cx, btnY, '🗺️ 返回选关', 0x0369a1, 0x0284c7, () => {
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
