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

    this.goldText = this.add.text(10, this.hudY + 5, '', { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#ffdd00', fontStyle: 'bold' });
    this.livesText = this.add.text(10, this.hudY + 28, '', { fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ff6666' });
    this.waveText = this.add.text(GAME_WIDTH / 2, this.hudY + 8, '', { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.stateText = this.add.text(GAME_WIDTH / 2, this.hudY + 32, '', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa' }).setOrigin(0.5, 0);
    this.scoreText = this.add.text(GAME_WIDTH - 10, this.hudY + 5, '', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#888888' }).setOrigin(1, 0);

    this.towerButtons = [];
    this.createTowerButtons();

    this.waveBtn = this.createBtn(GAME_WIDTH - 90, this.hudY + 30, '▶ 开始', 80, 32, () => {
      this.callGame('onUIStartWave');
    });

    this.pauseBtn = this.add.text(GAME_WIDTH - 30, this.hudY + 5, '⏸', { fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa' })
      .setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerover', () => this.pauseBtn.setColor('#ffffff'));
    this.pauseBtn.on('pointerout', () => this.pauseBtn.setColor('#aaaaaa'));
    this.pauseBtn.on('pointerdown', () => this.callGame('onUIPause'));

    this.infoPanelBg = this.add.graphics();
    this.infoPanelBg.setVisible(false);
    this.infoTitle = this.add.text(0, 0, '', { fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffffff' }).setVisible(false);
    this.infoStats = this.add.text(0, 0, '', { fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#cccccc' }).setVisible(false);
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
    g.fillStyle(COLORS.UI_BG, 1);
    g.fillRect(0, this.hudY, GAME_WIDTH, this.hudH);
    g.lineStyle(2, COLORS.UI_BORDER, 1);
    g.beginPath();
    g.moveTo(0, this.hudY);
    g.lineTo(GAME_WIDTH, this.hudY);
    g.strokePath();
  }

  createTowerButtons() {
    const startX = 10;
    const startY = this.hudY + 52;
    const btnW = 60, btnH = 24, gap = 6;

    this.availableTowers.forEach((type, i) => {
      const cfg = TOWER_CONFIG[type];
      const x = startX + i * (btnW + gap);
      const y = startY;

      const g = this.add.graphics();
      g.fillStyle(cfg.color, 0.8);
      g.fillRoundedRect(x, y, btnW, btnH, 4);
      g.lineStyle(1, COLORS.UI_BORDER, 0.5);
      g.strokeRoundedRect(x, y, btnW, btnH, 4);

      const txt = this.add.text(x + btnW / 2, y + btnH / 2, cfg.name, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
      }).setOrigin(0.5);

      const costTxt = this.add.text(x + btnW / 2, y + btnH + 2, `${cfg.levels[0].buildCost}金`, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#ffdd00',
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
        btn.g.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 4);
        btn.g.lineStyle(2, 0xffffff, 0.8);
        btn.g.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 4);
      } else {
        btn.g.fillStyle(cfg.color, 0.5);
        btn.g.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 4);
        btn.g.lineStyle(1, COLORS.UI_BORDER, 0.5);
        btn.g.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 4);
      }
    });
  }

  resetTowerButtons() {
    this.towerButtons.forEach(btn => {
      const cfg = TOWER_CONFIG[btn.type];
      btn.g.clear();
      btn.g.fillStyle(cfg.color, 0.8);
      btn.g.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 4);
      btn.g.lineStyle(1, COLORS.UI_BORDER, 0.5);
      btn.g.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 4);
    });
  }

  createSkillButtons() {
    const skills = [
      { type: 'meteor', name: '陨石术', cost: 50, color: 0xff8800, desc: '50金 - 全体伤害' },
      { type: 'freeze', name: '冰冻术', cost: 30, color: 0x4488ff, desc: '30金 - 全体减速' },
      { type: 'goldRush', name: '金币雨', cost: 20, color: 0xffdd00, desc: '20金 - 获得金币' },
    ];

    const startX = 270;
    const startY = this.hudY + 52;
    const btnW = 80, btnH = 24, gap = 8;

    skills.forEach((skill, i) => {
      const x = startX + i * (btnW + gap);
      const y = startY;

      const g = this.add.graphics();
      g.fillStyle(skill.color, 0.6);
      g.fillRoundedRect(x, y, btnW, btnH, 4);

      this.add.text(x + btnW / 2, y + btnH / 2, skill.name, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
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
    g.fillRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, COLORS.UI_BORDER, 0.5);
    g.strokeRoundedRect(x, y, w, h, 4);

    this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
    }).setOrigin(0.5);

    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      g.clear();
      g.fillStyle(COLORS.UI_BUTTON_HOVER, 1);
      g.fillRoundedRect(x, y, w, h, 4);
      g.lineStyle(1, COLORS.UI_BORDER, 0.5);
      g.strokeRoundedRect(x, y, w, h, 4);
    });
    zone.on('pointerout', () => {
      g.clear();
      g.fillStyle(COLORS.UI_BUTTON, 1);
      g.fillRoundedRect(x, y, w, h, 4);
      g.lineStyle(1, COLORS.UI_BORDER, 0.5);
      g.strokeRoundedRect(x, y, w, h, 4);
    });
    zone.on('pointerdown', callback);
    return { g, x, y, w, h, zone };
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

    const cfg = TOWER_CONFIG[tower.type].levels[tower.level - 1];
    const nextCfg = tower.level < 3 ? TOWER_CONFIG[tower.type].levels[tower.level] : null;

    const panelX = GAME_WIDTH - 200;
    const panelY = 10;
    const panelW = 190;
    const panelH = nextCfg ? 160 : 130;

    const g = this.infoPanelBg;
    g.clear();
    g.setVisible(true);
    g.fillStyle(0x1a1a2e, 0.95);
    g.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    g.lineStyle(1, COLORS.UI_BORDER, 0.8);
    g.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    this.infoTitle.setVisible(true);
    this.infoTitle.setPosition(panelX + 10, panelY + 8);
    this.infoTitle.setText(`${TOWER_CONFIG[tower.type].name} Lv.${tower.level}`);

    this.infoStats.setVisible(true);
    this.infoStats.setPosition(panelX + 10, panelY + 32);
    this.infoStats.setText(
      `攻击力: ${cfg.damage}\n范围: ${cfg.range}\n攻速: ${(cfg.attackSpeed / 1000).toFixed(1)}秒`
    );

    // Remove old buttons
    if (this.upgradeBtn) { this.upgradeBtn.zone.destroy(); this.upgradeBtn.g.destroy(); }
    if (this.sellBtn) { this.sellBtn.zone.destroy(); this.sellBtn.g.destroy(); }

    if (nextCfg) {
      this.upgradeBtn = this.createBtn(panelX + 10, panelY + 105, `升级 ${nextCfg.upgradeCost}金`, panelW - 20, 28, () => {
        this.callGame('onUIUpgradeTower');
      });
    }

    this.sellBtn = this.createBtn(panelX + 10, panelY + (nextCfg ? 140 : 105), `出售`, panelW - 20, 28, () => {
      this.callGame('onUISellTower');
    });
  }

  onTowerDeselected() {
    this.inspectingTower = null;
    this.infoPanelBg.setVisible(false);
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
