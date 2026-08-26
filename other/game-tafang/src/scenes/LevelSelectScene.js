import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { getTotalLevels, getLevelInfo, getLevelData } from '../config/levelConfig.js';
import { TOWER_CONFIG } from '../config/towerConfig.js';
import { soundManager } from '../utils/soundManager.js';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    this.add.text(cx, 55, '选择护法道场', {
      fontSize: '32px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#047857',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 95, '诛灭魔族妖人 · 誓死保卫我方圣女', {
      fontSize: '13px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#fde047',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const save = JSON.parse(localStorage.getItem('td_save') || '{}');
    const unlockedLevel = save.maxLevel || 1;
    const stars = save.stars || {};

    const total = getTotalLevels();
    const cardW = 240;
    const cardH = 168;
    const gapX = 16;
    const gapY = 18;
    const startY = 205;

    for (let i = 1; i <= total; i++) {
      const idx = i - 1;
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = (col === 0 ? 20 : 20 + cardW + gapX) + cardW / 2;
      const y = startY + row * (cardH + gapY);

      const info = getLevelInfo(i);
      const lvlData = getLevelData(i);
      const unlocked = i <= unlockedLevel;
      const starCount = stars[i] || 0;

      const cardGfx = this.add.graphics();
      this.drawLevelCard(cardGfx, x - cardW / 2, y - cardH / 2, cardW, cardH, unlocked);

      if (unlocked) {
        // Level number
        this.add.text(x - cardW / 2 + 14, y - cardH / 2 + 14, `第 ${i} 关`, {
          fontSize: '13px',
          fontFamily: 'system-ui, Arial, sans-serif',
          color: '#fde047',
          fontStyle: 'bold',
        });

        // Level name
        this.add.text(x - cardW / 2 + 14, y - cardH / 2 + 34, info.name, {
          fontSize: '18px',
          fontFamily: 'system-ui, Arial, sans-serif',
          color: '#ffffff',
          fontStyle: 'bold',
        });

        // Tower icons
        const towerIcons = lvlData.availableTowers.map(t => TOWER_CONFIG[t]?.icon || '').join(' ');
        this.add.text(x - cardW / 2 + 14, y - cardH / 2 + 70, `法塔: ${towerIcons}`, {
          fontSize: '13px',
        });

        // Obstacles & Waves
        this.add.text(x - cardW / 2 + 14, y - cardH / 2 + 96, `妖波: ${info.totalWaves} 波  ·  灵物: ${lvlData.obstacles.length} 处`, {
          fontSize: '11px',
          fontFamily: 'system-ui, Arial, sans-serif',
          color: '#a7f3d0',
        });

        // Lotus / Stars
        let starStr = '';
        for (let s = 1; s <= 3; s++) starStr += s <= starCount ? '🪷' : '⚪';
        this.add.text(x + cardW / 2 - 14, y - cardH / 2 + 16, starStr, {
          fontSize: '14px',
          fontFamily: 'system-ui, Arial, sans-serif',
          color: '#f472b6',
        }).setOrigin(1, 0);

        const zone = this.add.zone(x, y, cardW, cardH).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => {
          cardGfx.clear();
          cardGfx.fillStyle(0x047857, 0.98);
          cardGfx.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 12);
          cardGfx.lineStyle(2, 0xfde047, 1);
          cardGfx.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 12);
        });
        zone.on('pointerout', () => {
          this.drawLevelCard(cardGfx, x - cardW / 2, y - cardH / 2, cardW, cardH, true);
        });
        zone.on('pointerdown', () => {
          soundManager.playClick();
          this.scene.start('GameScene', { level: i });
        });
      } else {
        // Locked
        this.add.text(x, y - 20, '🔒', { fontSize: '32px' }).setOrigin(0.5);
        this.add.text(x, y + 25, `第 ${i} 关 (未解锁)`, {
          fontSize: '14px',
          fontFamily: 'system-ui, Arial, sans-serif',
          color: '#6ee7b7',
          fontStyle: 'bold',
        }).setOrigin(0.5);
      }
    }

    // Return Button
    const backBtn = this.add.text(cx, 890, '← 返回道门主峰', {
      fontSize: '16px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#047857',
      padding: { left: 24, right: 24, top: 12, bottom: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      soundManager.playClick();
      this.scene.start('MenuScene');
    });
  }

  drawLevelCard(g, x, y, w, h, unlocked) {
    g.clear();
    if (unlocked) {
      g.fillStyle(0x064e3b, 0.95);
      g.fillRoundedRect(x, y, w, h, 12);
      g.lineStyle(1.5, 0x34d399, 0.8);
      g.strokeRoundedRect(x, y, w, h, 12);
    } else {
      g.fillStyle(0x022c22, 0.6);
      g.fillRoundedRect(x, y, w, h, 12);
      g.lineStyle(1, 0x065f46, 0.4);
      g.strokeRoundedRect(x, y, w, h, 12);
    }
  }
}
