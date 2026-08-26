import {
  GAME_WIDTH,
  GAME_HEIGHT,
  COLORS,
  GAME_STATES,
  SAINTESS_MAX_HP,
} from '../config/gameConfig.js';
import { soundManager } from '../utils/soundManager.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  init(data) {
    this.levelId = data.level;
    this.levelName = data.levelName;
    this.waves = data.waves || [];
    this.gameSpeed = data.gameSpeed || 1;
    this.autoWave = data.autoWave || false;
  }

  create() {
    this.gold = 0;
    this.lives = SAINTESS_MAX_HP;
    this.wave = 0;
    this.totalWaves = 0;
    this.score = 0;
    this.state = GAME_STATES.PREPARATION;

    // 1. Top Floating Celestial Ribbon (y: 8 to 52)
    this.createTopFloatingRibbon();

    // 2. Bottom Floating Immortal Tactical Dock (y: 895 to 948)
    this.createBottomFloatingDock();

    // 3. Connect GameScene Events
    const gs = this.scene.get('GameScene');
    if (gs) {
      gs.events.on('uiUpdate', (data) => this.onUIUpdate(data));
    }
  }

  // ==================== TOP FLOATING RIBBON ====================
  createTopFloatingRibbon() {
    const rx = 12;
    const ry = 8;
    const rw = GAME_WIDTH - 24; // 516
    const rh = 44;

    const g = this.add.graphics();
    g.fillStyle(0x064e3b, 0.9);
    g.fillRoundedRect(rx, ry, rw, rh, 22);
    g.lineStyle(2, 0x34d399, 0.8);
    g.strokeRoundedRect(rx, ry, rw, rh, 22);

    // Wave Text
    this.waveText = this.add.text(rx + 16, ry + 12, '波次 1/8', {
      fontSize: '15px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    // Speed Toggle
    this.speedBtn = this.add.text(rx + 115, ry + 9, '1x ⏩', {
      fontSize: '13px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#047857',
      padding: { left: 6, right: 6, top: 4, bottom: 4 },
    }).setInteractive({ useHandCursor: true });

    this.speedBtn.on('pointerdown', () => {
      let nextSpeed = this.gameSpeed === 1 ? 2 : this.gameSpeed === 2 ? 3 : 1;
      this.callGame('onUISetSpeed', nextSpeed);
    });

    // Sound Toggle
    this.soundBtn = this.add.text(rx + 180, ry + 9, soundManager.isMuted() ? '🔇' : '🔊', {
      fontSize: '14px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#047857',
      padding: { left: 5, right: 5, top: 4, bottom: 4 },
    }).setInteractive({ useHandCursor: true });

    this.soundBtn.on('pointerdown', () => {
      const muted = soundManager.toggleMute();
      this.soundBtn.setText(muted ? '🔇' : '🔊');
    });

    // Pause Button
    this.pauseBtn = this.add.text(rx + 225, ry + 9, '⏸️', {
      fontSize: '14px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#047857',
      padding: { left: 5, right: 5, top: 4, bottom: 4 },
    }).setInteractive({ useHandCursor: true });

    this.pauseBtn.on('pointerdown', () => {
      this.callGame('onUIPause');
    });

    // Spirit Stone Counter
    this.goldText = this.add.text(rx + 280, ry + 12, '💎 140', {
      fontSize: '15px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#facc15',
      fontStyle: 'bold',
    });

    // Saintess HP Counter
    this.saintessHpText = this.add.text(rx + rw - 16, ry + 12, '🌸 10/10', {
      fontSize: '15px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#f472b6',
      fontStyle: 'bold',
    }).setOrigin(1, 0);
  }

  // ==================== BOTTOM FLOATING DOCK ====================
  createBottomFloatingDock() {
    const dockY = 896;

    // 1. Saintess Divine Magic Skills (Left)
    this.skillButtons = [];
    const skills = [
      { type: 'thunder', name: '玄雷', icon: '⚡', cost: 40, color: 0xef4444 },
      { type: 'freeze', name: '定身', icon: '❄️', cost: 30, color: 0x38bdf8 },
      { type: 'blessing', name: '祈福', icon: '🌸', cost: 20, color: 0xf472b6 },
    ];

    skills.forEach((sk, i) => {
      const sx = 30 + i * 58;
      const sy = dockY + 24;

      const bg = this.add.graphics();
      bg.fillStyle(0x064e3b, 0.92);
      bg.fillCircle(sx, sy, 24);
      bg.lineStyle(2, 0x34d399, 0.85);
      bg.strokeCircle(sx, sy, 24);

      const icon = this.add.text(sx, sy - 6, sk.icon, { fontSize: '18px' }).setOrigin(0.5);
      const cost = this.add.text(sx, sy + 11, `${sk.cost}`, {
        fontSize: '10px',
        fontFamily: 'system-ui, Arial, sans-serif',
        color: '#facc15',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const zone = this.add.zone(sx, sy, 48, 48).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.callGame('onUIUseSkill', sk.type);
      });

      this.skillButtons.push({ sk, bg, sx, sy, costTxt: cost });
    });

    // 2. Auto Wave Toggle Pill
    this.autoWaveBtn = this.add.text(216, dockY + 7, '🔁 自动除魔: 关', {
      fontSize: '11px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#047857',
      padding: { left: 8, right: 8, top: 11, bottom: 11 },
    }).setInteractive({ useHandCursor: true });

    this.autoWaveBtn.on('pointerdown', () => {
      this.callGame('onUIToggleAutoWave');
    });

    // 3. Start Wave Big Pill Button (Right)
    const btnW = 180;
    const btnH = 44;
    const btnX = 340;
    const btnY = dockY + 4;

    this.startWaveBtnGfx = this.add.graphics();
    this.drawStartWaveBtn(btnX, btnY, btnW, btnH, false);

    this.startWaveBtnTxt = this.add.text(btnX + btnW / 2, btnY + btnH / 2, '▶ 迎战第 1 波', {
      fontSize: '16px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const waveZone = this.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
    waveZone.on('pointerdown', () => {
      this.callGame('onUIStartWave');
    });
  }

  drawStartWaveBtn(x, y, w, h, inWave) {
    const g = this.startWaveBtnGfx;
    g.clear();
    if (inWave) {
      g.fillStyle(0x064e3b, 0.92);
      g.fillRoundedRect(x, y, w, h, 22);
      g.lineStyle(2, 0x34d399, 0.7);
      g.strokeRoundedRect(x, y, w, h, 22);
    } else {
      g.fillStyle(0x16a34a, 0.95);
      g.fillRoundedRect(x, y, w, h, 22);
      g.lineStyle(2, 0x86efac, 0.9);
      g.strokeRoundedRect(x, y, w, h, 22);
    }
  }

  // ==================== STATE UPDATES ====================
  onUIUpdate(data) {
    this.gold = data.gold;
    this.lives = data.lives;
    this.wave = data.wave;
    this.totalWaves = data.totalWaves;
    this.state = data.state;
    this.score = data.score;
    this.gameSpeed = data.gameSpeed;
    this.autoWave = data.autoWave;

    this.goldText.setText(`💎 ${this.gold}`);
    this.saintessHpText.setText(`🌸 ${this.lives}/${SAINTESS_MAX_HP}`);
    this.waveText.setText(`波次 ${this.wave}/${this.totalWaves}`);
    this.speedBtn.setText(`${this.gameSpeed}x ⏩`);
    this.autoWaveBtn.setText(this.autoWave ? '🔁 自动除魔: 开' : '🔁 自动除魔: 关');
    this.autoWaveBtn.setBackgroundColor(this.autoWave ? '#059669' : '#047857');

    const inWave = this.state === GAME_STATES.IN_WAVE;
    this.drawStartWaveBtn(340, 900, 180, 44, inWave);
    if (inWave) {
      this.startWaveBtnTxt.setText('⚔️ 妖魔进犯中…');
    } else if (this.state === GAME_STATES.PAUSED) {
      this.startWaveBtnTxt.setText('⏸️ 乾坤已暂停');
    } else {
      this.startWaveBtnTxt.setText(`▶ 迎战第 ${this.wave + 1} 波`);
    }

    this.skillButtons.forEach(btn => {
      const canAfford = this.gold >= btn.sk.cost;
      btn.bg.clear();
      btn.bg.fillStyle(canAfford ? 0x064e3b : 0x0f172a, 0.92);
      btn.bg.fillCircle(btn.sx, btn.sy, 24);
      btn.bg.lineStyle(2, canAfford ? 0x34d399 : 0x475569, 0.85);
      btn.bg.strokeCircle(btn.sx, btn.sy, 24);
      btn.costTxt.setColor(canAfford ? '#facc15' : '#f87171');
    });
  }

  callGame(method, ...args) {
    const gs = this.scene.get('GameScene');
    if (gs && gs[method]) {
      gs[method](...args);
    }
  }
}
