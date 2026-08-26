import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { soundManager } from '../utils/soundManager.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // Celestial jade green mountain background
    const bg = this.add.graphics();
    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Ethereal glowing mountain mist
    bg.fillStyle(0x047857, 0.45);
    bg.fillCircle(100, 180, 100);
    bg.fillCircle(440, 160, 110);
    bg.fillCircle(cx, 1100, 480);

    // Divine Saintess Halo & Lotus Mascot
    this.add.text(cx, 125, '🌸', { fontSize: '64px' }).setOrigin(0.5);

    this.add.text(cx, 205, '保卫圣女', {
      fontSize: '46px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#047857',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(cx, 252, '魔族妖人来袭 · 请少侠布阵护法！', {
      fontSize: '13px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#fde047',
      letterSpacing: 2,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Start Game Button
    this.createButton(cx, 340, '▶ 降妖除魔 · 保卫圣女', 0x16a34a, 0x22c55e, () => {
      soundManager.playClick();
      this.scene.start('LevelSelectScene');
    });

    // Continue Game Button
    const save = JSON.parse(localStorage.getItem('td_save') || '{}');
    const hasSave = !!save.currentLevel;
    const contBtn = this.createButton(cx, 420, `🔄 继续护法 (第 ${save.currentLevel || 1} 关)`, 0xd97706, 0xf59e0b, () => {
      soundManager.playClick();
      this.scene.start('GameScene', { level: save.currentLevel || 1 });
    });

    if (!hasSave) {
      contBtn.setAlpha(0.45);
      contBtn.disableInteractive();
    }

    // Sound toggle button
    this.createButton(cx, 500, soundManager.isMuted() ? '🔇 开启仙乐音效' : '🔊 关闭仙乐音效', 0x0f766e, 0x14b8a6, (btnTxt) => {
      const muted = soundManager.toggleMute();
      btnTxt.setText(muted ? '🔇 开启仙乐音效' : '🔊 关闭仙乐音效');
    }, true);

    // Saintess Guide Card
    const guide = this.add.graphics();
    guide.fillStyle(0x064e3b, 0.95);
    guide.fillRoundedRect(30, 595, GAME_WIDTH - 60, 285, 16);
    guide.lineStyle(2, 0x34d399, 0.8);
    guide.strokeRoundedRect(30, 595, GAME_WIDTH - 60, 285, 16);

    this.add.text(50, 615, '🌸 护法修仙除魔秘籍', {
      fontSize: '17px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#fde047',
      fontStyle: 'bold',
    });

    const tips = [
      '1. 🎯 点击地图上的妖魔或古松/宝匣可施展诛邪锁定集火！',
      '2. 🪓 清除灵山封魔障碍可获巨量灵石，并开辟全新布阵法位！',
      '3. 🗡️ 飞剑塔满级触发“万剑归宗”，极大提升周围法塔攻速！',
      '4. ☀️ 九阳真火塔释放 360° 三昧真火，乃大面积清图除魔神塔！',
      '5. 🪨 玄龟镇魔塔引动重水迟滞泥沼，强力减速狂暴妖魔！',
      '6. 🌸 誓死守护圣女灵力 10/10 满血通关，荣获金莲天道勋章！',
    ];

    tips.forEach((tip, idx) => {
      this.add.text(50, 650 + idx * 34, tip, {
        fontSize: '12px',
        fontFamily: 'system-ui, Arial, sans-serif',
        color: '#e0f2fe',
      });
    });

    this.add.text(cx, 915, '🌸 点击圣女大人有惊喜 · 自动保存 · 仙侠除魔', {
      fontSize: '12px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  createButton(x, y, label, bgColor, hoverColor, callback, passBtn = false) {
    const w = 320;
    const h = 54;

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    bg.lineStyle(2, 0xffffff, 0.4);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);

    const txt = this.add.text(x, y, label, {
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

    zone.on('pointerdown', () => {
      if (passBtn) callback(txt);
      else callback();
    });

    return zone;
  }
}
