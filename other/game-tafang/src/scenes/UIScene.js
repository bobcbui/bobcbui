import { TILE_SIZE, GRID_COLS, GRID_ROWS, GAME_WIDTH, MAP_HEIGHT, GAME_HEIGHT, COLORS, GAME_STATES } from '../config/gameConfig.js';
import { TOWER_CONFIG } from '../config/towerConfig.js';

export default class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  init(data) {
    this.levelId = data.level;
    this.levelName = data.levelName;
    this.availableTowers = data.availableTowers;
  }

  create() {
    this.hudY = MAP_HEIGHT;
    this.hudH = GAME_HEIGHT - MAP_HEIGHT;

    this.gold = 0;
    this.lives = 0;
    this.wave = 0;
    this.totalWaves = 0;
    this.state = GAME_STATES.PREPARATION;
    this.selectedTowerType = null;
    this.inspectingTower = null;

    this.bgGfx = this.add.graphics();
    this.drawHUDBackground();

    this.goldText = this.add.text(20, this.hudY + 16, '', { fontSize: '21px', fontFamily: 'Arial, sans-serif', color: '#ffdd00', fontStyle: 'bold' });
    this.livesText = this.add.text(20, this.hudY + 48, '', { fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ff7d8b' });
    this.waveText = this.add.text(GAME_WIDTH / 2, this.hudY + 16, '', { fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.stateText = this.add.text(GAME_WIDTH / 2, this.hudY + 48, '', { fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#9baaca' }).setOrigin(0.5, 0);
    this.scoreText = this.add.text(GAME_WIDTH - 62, this.hudY + 18, '', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#91a3c9' }).setOrigin(1, 0);

    this.towerButtons = [];
    this.createTowerButtons();

    this.waveBtn = this.createBtn(20, this.hudY + 550, '▶ 开始下一波', GAME_WIDTH - 40, 62, () => {
      this.callGame('onUIStartWave');
    });

    this.pauseBtn = this.add.text(GAME_WIDTH - 24, this.hudY + 48, 'Ⅱ', { fontSize: '19px', fontFamily: 'Arial, sans-serif', color: '#b3c0db' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerover', () => this.pauseBtn.setColor('#ffffff'));
    this.pauseBtn.on('pointerout', () => this.pauseBtn.setColor('#aaaaaa'));
    this.pauseBtn.on('pointerdown', () => this.callGame('onUIPause'));

    this.infoPanelBg = this.add.graphics();
    this.infoPanelBg.setVisible(false);
    this.infoHint = this.add.text(240, this.hudY + 382, '点击地图上的防御塔查看属性', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#667b9f',
    }).setOrigin(0.5);
    this.infoTitle = this.add.text(0, 0, '', { fontSize: '17px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold' }).setVisible(false);
    this.infoStats = this.add.text(0, 0, '', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#c1cde2', lineSpacing: 4 }).setVisible(false);
    this.upgradeBtn = null;
    this.sellBtn = null;

    this.skillButtons = [];
    this.createSkillButtons();

    const gs = this.scene.get('GameScene');
    gs.events.on('uiUpdate', (data) => this.onUIUpdate(data));
    gs.events.on('towerSelected', (tower) => this.onTowerSelected(tower));
    gs.events.on('towerDeselected', () => this.onTowerDeselected());
    gs.events.on('placementCancelled', () => this.onPlacementCancelled());
  }

  drawHUDBackground() {
    const g = this.bgGfx;
    g.clear();
    g.fillStyle(0x10182a, 1);
    g.fillRect(0, this.hudY, GAME_WIDTH, this.hudH);
    g.fillStyle(0x17243e, 1);
    g.fillRoundedRect(14, this.hudY + 10, GAME_WIDTH - 28, 64, 14);
    g.fillStyle(0x141f35, 1);
    g.fillRoundedRect(14, this.hudY + 86, GAME_WIDTH - 28, 122, 14);
    g.fillStyle(0x141f35, 1);
    g.fillRoundedRect(14, this.hudY + 220, GAME_WIDTH - 28, 92, 14);
    g.fillRoundedRect(14, this.hudY + 348, GAME_WIDTH - 28, 166, 14);
    g.lineStyle(2, 0x2a426a, 1);
    g.beginPath();
    g.moveTo(0, this.hudY);
    g.lineTo(GAME_WIDTH, this.hudY);
    g.strokePath();
    g.lineStyle(1, 0x273b60, 0.9);
    g.beginPath();
    g.moveTo(24, this.hudY + 86);
    g.lineTo(GAME_WIDTH - 24, this.hudY + 86);
    g.moveTo(24, this.hudY + 220);
    g.lineTo(GAME_WIDTH - 24, this.hudY + 220);
    g.strokePath();

    this.add.text(24, this.hudY + 94, '建造防御塔', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#8ea5ca', fontStyle: 'bold' });
    this.add.text(24, this.hudY + 228, '主动技能', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#8ea5ca', fontStyle: 'bold' });
    this.add.text(24, this.hudY + 326, '防御塔详情', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#8ea5ca', fontStyle: 'bold' });
  }

  createTowerButtons() {
    const startX = 20;
    const startY = this.hudY + 122;
    const btnW = 100, btnH = 52, gap = 12;

    this.availableTowers.forEach((type, i) => {
      const cfg = TOWER_CONFIG[type];
      const x = startX + i * (btnW + gap);
      const y = startY;

      const g = this.add.graphics();
      g.fillStyle(cfg.color, 0.8);
      g.fillRoundedRect(x, y, btnW, btnH, 10);
      g.lineStyle(1, COLORS.UI_BORDER, 0.5);
      g.strokeRoundedRect(x, y, btnW, btnH, 10);

      const txt = this.add.text(x + btnW / 2, y + btnH / 2, cfg.name, {
        fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      const costTxt = this.add.text(x + btnW / 2, y + btnH + 4, `${cfg.levels[0].buildCost} 金`, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#ffdd00',
      }).setOrigin(0.5, 0);

      const zone = this.add.zone(x + btnW / 2, y + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.selectedTowerType = type;
        this.callGame('onUIStartPlacement', type);
        this.highlightTowerButton(i);
      });

      this.towerButtons.push({ g, txt, costTxt, zone, x, y, w: btnW, h: btnH, type });
    });
  }

  highlightTowerButton(index) {
    this.towerButtons.forEach((btn, i) => {
      btn.g.clear();
      const cfg = TOWER_CONFIG[btn.type];
      if (i === index) {
        btn.g.fillStyle(cfg.color, 1);
        btn.g.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 10);
        btn.g.lineStyle(2, 0xffffff, 0.8);
        btn.g.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 10);
      } else {
        btn.g.fillStyle(cfg.color, 0.5);
        btn.g.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 10);
        btn.g.lineStyle(1, COLORS.UI_BORDER, 0.5);
        btn.g.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 10);
      }
    });
  }

  resetTowerButtons() {
    this.towerButtons.forEach(btn => {
      const cfg = TOWER_CONFIG[btn.type];
      btn.g.clear();
      btn.g.fillStyle(cfg.color, 0.8);
      btn.g.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 10);
      btn.g.lineStyle(1, COLORS.UI_BORDER, 0.5);
      btn.g.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 10);
    });
  }

  createSkillButtons() {
    const skills = [
      { type: 'meteor', name: '陨石术', cost: 50, color: 0xff8800, desc: '50金 - 全体伤害' },
      { type: 'freeze', name: '冰冻术', cost: 30, color: 0x4488ff, desc: '30金 - 全体减速' },
      { type: 'goldRush', name: '金币雨', cost: 20, color: 0xffdd00, desc: '20金 - 获得金币' },
    ];

    const startX = 20;
    const startY = this.hudY + 248;
    const btnW = 128, btnH = 50, gap = 10;

    skills.forEach((skill, i) => {
      const x = startX + i * (btnW + gap);
      const y = startY;

      const g = this.add.graphics();
      g.fillStyle(skill.color, 0.6);
      g.fillRoundedRect(x, y, btnW, btnH, 10);

      this.add.text(x + btnW / 2, y + btnH / 2, skill.name, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      const zone = this.add.zone(x + btnW / 2, y + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.callGame('onUIUseSkill', skill.type);
      });

      this.skillButtons.push({ g, x, y, w: btnW, h: btnH, type: skill.type, color: skill.color, zone });
    });
  }

  createBtn(x, y, label, w, h, callback) {
    const g = this.add.graphics();
    g.fillStyle(COLORS.UI_BUTTON, 1);
    g.fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(1, COLORS.UI_BORDER, 0.5);
    g.strokeRoundedRect(x, y, w, h, 12);

    const txt = this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      g.clear();
      g.fillStyle(COLORS.UI_BUTTON_HOVER, 1);
      g.fillRoundedRect(x, y, w, h, 12);
      g.lineStyle(1, COLORS.UI_BORDER, 0.5);
      g.strokeRoundedRect(x, y, w, h, 12);
    });
    zone.on('pointerout', () => {
      g.clear();
      g.fillStyle(COLORS.UI_BUTTON, 1);
      g.fillRoundedRect(x, y, w, h, 12);
      g.lineStyle(1, COLORS.UI_BORDER, 0.5);
      g.strokeRoundedRect(x, y, w, h, 12);
    });
    zone.on('pointerdown', callback);
    return { g, txt, x, y, w, h, zone };
  }

  onUIUpdate(data) {
    this.gold = data.gold;
    this.lives = data.lives;
    this.wave = data.wave;
    this.totalWaves = data.totalWaves;
    this.state = data.state;

    this.goldText.setText(`💰 ${data.gold}`);
    this.livesText.setText(`❤ ${data.lives}`);
    this.waveText.setText(`🏴 第 ${data.wave} / ${data.totalWaves} 波`);
    this.scoreText.setText(`得分: ${data.score || 0}`);
    this.waveBtn.txt.setText(data.state === GAME_STATES.IN_WAVE ? '战斗进行中…' : data.state === GAME_STATES.PAUSED ? '已暂停' : '▶ 开始下一波');

    let stateLabel = '';
    switch (data.state) {
      case GAME_STATES.PREPARATION: stateLabel = '点击"开始"进入下一波'; break;
      case GAME_STATES.IN_WAVE: stateLabel = '战斗中...'; break;
      case GAME_STATES.WAVE_COMPLETE: stateLabel = '波次完成! 点击"开始"继续'; break;
      case GAME_STATES.PAUSED: stateLabel = '已暂停'; break;
    }
    this.stateText.setText(stateLabel);
  }

  onTowerSelected(tower) {
    this.inspectingTower = tower;
    this.resetTowerButtons();
    this.infoHint.setVisible(false);

    const cfg = TOWER_CONFIG[tower.type].levels[tower.level - 1];
    const nextCfg = tower.level < 3 ? TOWER_CONFIG[tower.type].levels[tower.level] : null;

    const panelX = 20;
    const panelY = this.hudY + 350;
    const panelW = GAME_WIDTH - 40;
    const panelH = 166;

    const g = this.infoPanelBg;
    g.clear();
    g.setVisible(true);
    g.fillStyle(0x1a1a2e, 0.95);
    g.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    g.lineStyle(1, COLORS.UI_BORDER, 0.8);
    g.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);

    this.infoTitle.setVisible(true);
    this.infoTitle.setPosition(panelX + 16, panelY + 12);
    this.infoTitle.setText(`${TOWER_CONFIG[tower.type].name} Lv.${tower.level}`);

    this.infoStats.setVisible(true);
    this.infoStats.setPosition(panelX + 16, panelY + 48);
    this.infoStats.setText(
      `攻击力: ${cfg.damage}\n范围: ${cfg.range}\n攻速: ${(cfg.attackSpeed / 1000).toFixed(1)}秒`
    );

    // Remove old buttons
    if (this.upgradeBtn) { this.upgradeBtn.zone.destroy(); this.upgradeBtn.g.destroy(); }
    if (this.sellBtn) { this.sellBtn.zone.destroy(); this.sellBtn.g.destroy(); }

    if (nextCfg) {
      this.upgradeBtn = this.createBtn(panelX + 16, panelY + 112, `升级 ${nextCfg.upgradeCost} 金`, 190, 38, () => {
        this.callGame('onUIUpgradeTower');
      });
    }

    this.sellBtn = this.createBtn(panelX + (nextCfg ? 230 : 16), panelY + 112, '出售防御塔', nextCfg ? 194 : 408, 38, () => {
      this.callGame('onUISellTower');
    });
  }

  onTowerDeselected() {
    this.inspectingTower = null;
    this.infoPanelBg.setVisible(false);
    this.infoHint.setVisible(true);
    this.infoTitle.setVisible(false);
    this.infoStats.setVisible(false);
    if (this.upgradeBtn) { this.upgradeBtn.zone.destroy(); this.upgradeBtn.g.destroy(); this.upgradeBtn = null; }
    if (this.sellBtn) { this.sellBtn.zone.destroy(); this.sellBtn.g.destroy(); this.sellBtn = null; }
  }

  onPlacementCancelled() {
    this.selectedTowerType = null;
    this.resetTowerButtons();
  }

  callGame(method, ...args) {
    const gs = this.scene.get('GameScene');
    if (gs && gs[method]) {
      gs[method](...args);
    }
  }
}
