import {
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  GAME_WIDTH,
  GAME_HEIGHT,
  MAP_Y,
  MAP_HEIGHT,
  COLORS,
  GAME_STATES,
  OBSTACLE_TYPES,
  CARROT_MAX_HP,
} from '../config/gameConfig.js';
import { TOWER_CONFIG, TOWER_TYPES } from '../config/towerConfig.js';
import { ENEMY_CONFIG, ENEMY_TYPES } from '../config/enemyConfig.js';
import { getLevelData } from '../config/levelConfig.js';
import { soundManager } from '../utils/soundManager.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.levelId = data.level || 1;
    this.gameSpeed = 1;
    this.autoWave = false;
  }

  create() {
    const lvl = getLevelData(this.levelId);
    this.levelData = lvl;
    this.gold = lvl.initialGold;
    this.lives = lvl.initialLives || CARROT_MAX_HP;
    this.maxLives = CARROT_MAX_HP;
    this.currentWave = 0;
    this.totalWaves = lvl.waves.length;
    this.state = GAME_STATES.PREPARATION;

    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.piercingBlades = [];
    this.magicBeams = [];
    this.obstacles = lvl.obstacleList || [];
    this.lockedTarget = null; // 🎯 Enemy or Obstacle

    this.activeBuildTile = null;
    this.selectedTower = null;
    this.waveEnemiesRemaining = 0;
    this.waveEnemiesSpawned = 0;
    this.waveQueue = [];
    this.waveStartTime = 0;

    this.totalKills = 0;
    this.totalObstaclesCleared = 0;
    this.score = 0;

    this.buildGrid();

    // Graphic Layers
    this.mapGfx = this.add.graphics();
    this.decorGfx = this.add.graphics();
    this.obstacleGfx = this.add.graphics();
    this.carrotGfx = this.add.graphics();
    this.entityGfx = this.add.graphics();
    this.fxGfx = this.add.graphics();
    this.lockGfx = this.add.graphics();
    this.rangeGfx = this.add.graphics();

    this.drawMap();
    this.drawCarrot();

    // In-place UI Containers
    this.createInPlaceBuildWheel();
    this.createInPlaceTowerActionBubbles();

    // Input handlers
    this.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));

    // Keyboard Shortcuts
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', () => this.dismissAllInPlacePopups());
      this.input.keyboard.on('keydown-SPACE', () => {
        if (this.state === GAME_STATES.PREPARATION || this.state === GAME_STATES.WAVE_COMPLETE) {
          this.startWave();
        }
      });
    }

    // Launch UI Scene
    this.scene.launch('UIScene', {
      level: this.levelId,
      levelName: lvl.name,
      gold: this.gold,
      lives: this.lives,
      wave: this.currentWave,
      totalWaves: this.totalWaves,
      availableTowers: lvl.availableTowers,
      state: this.state,
      gameSpeed: this.gameSpeed,
      autoWave: this.autoWave,
      waves: lvl.waves,
    });

    this.emitUIUpdate();
  }

  buildGrid() {
    this.grid = this.levelData.grid;
    this.waypoints = this.levelData.waypoints;
  }

  // ==================== FULL-SCREEN MAP RENDERING ====================
  drawMap() {
    const g = this.mapGfx;
    g.clear();

    // Full canvas green grass background
    g.fillStyle(COLORS.GRASS_LIGHT, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Decorative clouds on top/bottom
    g.fillStyle(0xffffff, 0.2);
    g.fillCircle(80, 40, 50);
    g.fillCircle(140, 30, 60);
    g.fillCircle(450, 40, 55);

    // Draw Map Tiles (18 cols x 27 rows)
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = col * TILE_SIZE;
        const y = MAP_Y + row * TILE_SIZE;
        const tile = this.grid[row][col];

        if (tile === 0) {
          // Yellow Sand Path
          g.fillStyle(COLORS.PATH, 1);
          g.fillRect(x, y, TILE_SIZE, TILE_SIZE);

          g.fillStyle(COLORS.PATH_INNER, 0.45);
          g.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

          g.lineStyle(1, COLORS.PATH_BORDER, 0.3);
          g.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        } else {
          // Checkerboard green grass
          const isAlt = (row + col) % 2 === 0;
          if (isAlt) {
            g.fillStyle(COLORS.GRASS_DARK, 0.3);
            g.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          }

          // Subtle grass wireframe
          g.lineStyle(1, COLORS.GRASS_GRID, 0.25);
          g.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    this.drawPathChevrons();

    // Start Portal
    if (this.waypoints.length > 0) {
      const start = this.waypoints[0];
      g.fillStyle(0x38bdf8, 0.35);
      g.fillCircle(start.x, start.y, 16);
      g.lineStyle(2, 0x0284c7, 0.85);
      g.strokeCircle(start.x, start.y, 13);
      g.fillStyle(0x0284c7, 0.9);
      g.fillCircle(start.x, start.y, 6);
    }
  }

  drawPathChevrons() {
    const g = this.decorGfx;
    g.clear();

    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const a = this.waypoints[i];
      const b = this.waypoints[i + 1];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const count = Math.floor(dist / 40);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);

      for (let k = 1; k <= count; k++) {
        const t = k / (count + 1);
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;

        g.fillStyle(COLORS.PATH_CHEVRON, 0.4);
        const p1x = px + Math.cos(angle) * 5;
        const p1y = py + Math.sin(angle) * 5;
        const p2x = px + Math.cos(angle + 2.4) * 6;
        const p2y = py + Math.sin(angle + 2.4) * 6;
        const p3x = px + Math.cos(angle - 2.4) * 6;
        const p3y = py + Math.sin(angle - 2.4) * 6;
        g.fillTriangle(p1x, p1y, p2x, p2y, p3x, p3y);
      }
    }
  }

  // ==================== CUTE BIG CARROT ====================
  drawCarrot() {
    const g = this.carrotGfx;
    g.clear();

    const carrotWp = this.waypoints[this.waypoints.length - 1];
    if (!carrotWp) return;

    const cx = carrotWp.x;
    const cy = carrotWp.y;

    // Grass shadow
    g.fillStyle(0x4d7c0f, 0.45);
    g.fillEllipse(cx, cy + 12, 28, 12);

    // Carrot Body
    g.fillStyle(COLORS.CARROT_BODY, 1);
    g.fillRoundedRect(cx - 13, cy - 8, 26, 26, 12);
    g.fillStyle(COLORS.CARROT_BODY_DARK, 0.3);
    g.fillRect(cx - 10, cy + 4, 20, 3);
    g.fillRect(cx - 8, cy + 10, 16, 2.5);

    // Leaves
    g.fillStyle(COLORS.CARROT_LEAF, 1);
    g.fillTriangle(cx - 8, cy - 8, cx - 14, cy - 22, cx - 3, cy - 8);
    g.fillTriangle(cx - 4, cy - 8, cx, cy - 26, cx + 4, cy - 8);
    g.fillTriangle(cx + 3, cy - 8, cx + 14, cy - 22, cx + 8, cy - 8);

    // Expression
    if (this.lives >= 8) {
      // Happy Smiling
      g.fillStyle(0x0f172a, 1);
      g.fillCircle(cx - 5, cy - 1, 2.5);
      g.fillCircle(cx + 5, cy - 1, 2.5);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx - 6, cy - 2, 1);
      g.fillCircle(cx + 4, cy - 2, 1);

      g.fillStyle(COLORS.CARROT_BLUSH, 0.85);
      g.fillCircle(cx - 8, cy + 4, 3);
      g.fillCircle(cx + 8, cy + 4, 3);

      g.lineStyle(1.5, 0x0f172a, 1);
      g.beginPath();
      g.arc(cx, cy + 2, 3, 0, Math.PI);
      g.strokePath();
    } else if (this.lives >= 4) {
      // Worried
      g.fillStyle(0x0f172a, 1);
      g.fillCircle(cx - 5, cy - 1, 2.5);
      g.fillCircle(cx + 5, cy - 1, 2.5);
      g.fillStyle(0x38bdf8, 1);
      g.fillCircle(cx + 10, cy - 6, 2);

      g.lineStyle(1.5, 0x0f172a, 1);
      g.beginPath();
      g.moveTo(cx - 4, cy + 4);
      g.lineTo(cx + 4, cy + 4);
      g.strokePath();
    } else {
      // Crying
      g.fillStyle(0x0f172a, 1);
      g.fillCircle(cx - 5, cy - 1, 2.5);
      g.fillCircle(cx + 5, cy - 1, 2.5);
      g.fillStyle(0x38bdf8, 0.9);
      g.fillCircle(cx - 5, cy + 4, 2);
      g.fillCircle(cx + 5, cy + 4, 2);

      g.fillStyle(COLORS.GRASS_LIGHT, 1);
      g.fillCircle(cx + 12, cy + 3, 5);
    }
  }

  // ==================== DESTRUCTIBLE OBSTACLES ====================
  renderObstacles() {
    const g = this.obstacleGfx;
    g.clear();

    for (const obs of this.obstacles) {
      if (!obs.alive) continue;

      const cx = obs.x;
      const cy = obs.y;

      switch (obs.type) {
        case OBSTACLE_TYPES.TREE: {
          g.fillStyle(0x78350f, 1);
          g.fillRect(cx - 3, cy + 4, 6, 8);
          g.fillStyle(0x15803d, 1);
          g.fillTriangle(cx - 11, cy + 5, cx, cy - 6, cx + 11, cy + 5);
          g.fillStyle(0x16a34a, 1);
          g.fillTriangle(cx - 9, cy - 2, cx, cy - 12, cx + 9, cy - 2);
          g.fillStyle(0x22c55e, 1);
          g.fillTriangle(cx - 7, cy - 8, cx, cy - 16, cx + 7, cy - 8);
          break;
        }

        case OBSTACLE_TYPES.ROCK: {
          g.fillStyle(0x475569, 1);
          g.fillRoundedRect(cx - 10, cy - 9, 20, 18, 5);
          g.fillStyle(0x94a3b8, 0.8);
          g.fillCircle(cx - 3, cy - 4, 3.5);
          g.lineStyle(1.5, 0x1e293b, 0.8);
          g.strokeRoundedRect(cx - 10, cy - 9, 20, 18, 5);
          break;
        }

        case OBSTACLE_TYPES.MUSHROOM: {
          g.fillStyle(0xfde047, 1);
          g.fillRoundedRect(cx - 4, cy + 2, 8, 9, 2);
          g.fillStyle(0xef4444, 1);
          g.fillCircle(cx, cy - 2, 10);
          g.fillStyle(0xffffff, 1);
          g.fillCircle(cx - 4, cy - 5, 2);
          g.fillCircle(cx + 4, cy - 5, 2);
          g.fillCircle(cx, cy - 1, 2);
          break;
        }

        case OBSTACLE_TYPES.CHEST: {
          g.fillStyle(0x92400e, 1);
          g.fillRoundedRect(cx - 11, cy - 7, 22, 16, 4);
          g.fillStyle(0xfacc15, 1);
          g.fillRect(cx - 11, cy - 1, 22, 3);
          g.fillCircle(cx, cy, 3);
          g.lineStyle(1.5, 0x78350f, 1);
          g.strokeRoundedRect(cx - 11, cy - 7, 22, 16, 4);
          break;
        }

        case OBSTACLE_TYPES.HOUSE: {
          g.fillStyle(0xfbbf24, 1);
          g.fillRect(cx - 9, cy - 1, 18, 13);
          g.fillStyle(0xef4444, 1);
          g.fillTriangle(cx - 13, cy - 1, cx, cy - 15, cx + 13, cy - 1);
          g.fillStyle(0x38bdf8, 1);
          g.fillRect(cx - 3, cy + 2, 6, 6);
          break;
        }
      }

      if (obs.hp < obs.maxHp) {
        const barW = 20;
        const barH = 3;
        const barY = cy - 16;
        const hpRatio = Math.max(0, obs.hp / obs.maxHp);

        g.fillStyle(0x1e293b, 0.85);
        g.fillRect(cx - barW / 2, barY, barW, barH);
        g.fillStyle(0x22c55e, 1);
        g.fillRect(cx - barW / 2, barY, barW * hpRatio, barH);
      }
    }
  }

  // ==================== IN-PLACE BUILD WHEEL (保卫萝卜就地造塔轮盘) ====================
  createInPlaceBuildWheel() {
    this.buildWheelContainer = this.add.container(0, 0).setVisible(false).setDepth(100);
    this.wheelGfx = this.add.graphics();
    this.buildWheelContainer.add(this.wheelGfx);

    this.wheelButtons = [];
    const available = this.levelData.availableTowers || Object.values(TOWER_TYPES);

    // Create 6 radial/dock buttons
    available.forEach((type, idx) => {
      const cfg = TOWER_CONFIG[type];
      const btnGfx = this.add.graphics();
      const iconTxt = this.add.text(0, -6, cfg.icon, { fontSize: '20px' }).setOrigin(0.5);
      const costTxt = this.add.text(0, 12, `${cfg.levels[0].buildCost}`, {
        fontSize: '11px',
        fontFamily: 'system-ui, Arial, sans-serif',
        color: '#facc15',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const zone = this.add.zone(0, 0, 44, 44).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        if (this.activeBuildTile) {
          this.tryPlaceTower(this.activeBuildTile.col, this.activeBuildTile.row, type);
        }
      });

      const btnContainer = this.add.container(0, 0, [btnGfx, iconTxt, costTxt, zone]);
      this.buildWheelContainer.add(btnContainer);
      this.wheelButtons.push({ type, cfg, container: btnContainer, gfx: btnGfx, costTxt });
    });
  }

  showInPlaceBuildWheel(col, row) {
    this.dismissAllInPlacePopups();
    this.activeBuildTile = { col, row };

    const tileX = col * TILE_SIZE + TILE_SIZE / 2;
    const tileY = MAP_Y + row * TILE_SIZE + TILE_SIZE / 2;

    // Highlight Tile
    this.rangeGfx.clear();
    this.rangeGfx.lineStyle(2, 0x16a34a, 0.95);
    this.rangeGfx.strokeRoundedRect(col * TILE_SIZE, MAP_Y + row * TILE_SIZE, TILE_SIZE, TILE_SIZE, 6);

    const count = this.wheelButtons.length;
    const radius = 54;

    this.wheelGfx.clear();
    this.wheelGfx.fillStyle(0x0369a1, 0.85);
    this.wheelGfx.fillCircle(tileX, tileY, radius + 28);
    this.wheelGfx.lineStyle(2, 0x38bdf8, 0.9);
    this.wheelGfx.strokeCircle(tileX, tileY, radius + 28);

    this.wheelButtons.forEach((btn, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / count;
      const bx = tileX + Math.cos(angle) * radius;
      const by = tileY + Math.sin(angle) * radius;

      btn.container.setPosition(bx, by);

      const canAfford = this.gold >= btn.cfg.levels[0].buildCost;
      btn.gfx.clear();
      btn.gfx.fillStyle(canAfford ? 0x0284c7 : 0x0f172a, 0.95);
      btn.gfx.fillCircle(0, 0, 20);
      btn.gfx.lineStyle(1.5, canAfford ? 0x38bdf8 : 0x475569, 1);
      btn.gfx.strokeCircle(0, 0, 20);
      btn.costTxt.setColor(canAfford ? '#facc15' : '#f87171');
    });

    this.buildWheelContainer.setVisible(true);
    soundManager.playClick();
  }

  // ==================== IN-PLACE TOWER UPGRADE & SELL BUBBLES ====================
  createInPlaceTowerActionBubbles() {
    this.towerActionContainer = this.add.container(0, 0).setVisible(false).setDepth(101);

    // 1. Upgrade Bubble (Above Tower)
    this.upgradeBubbleGfx = this.add.graphics();
    this.upgradeBubbleTxt = this.add.text(0, 0, '⬆️ 升级 30', {
      fontSize: '12px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.upgradeZone = this.add.zone(0, 0, 92, 34).setInteractive({ useHandCursor: true });
    this.upgradeZone.on('pointerdown', () => {
      if (this.selectedTower) this.onUIUpgradeTower();
    });
    this.upgradeContainer = this.add.container(0, -38, [this.upgradeBubbleGfx, this.upgradeBubbleTxt, this.upgradeZone]);

    // 2. Sell Bubble (Below Tower)
    this.sellBubbleGfx = this.add.graphics();
    this.sellBubbleTxt = this.add.text(0, 0, '💰 出售 14', {
      fontSize: '12px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.sellZone = this.add.zone(0, 0, 92, 34).setInteractive({ useHandCursor: true });
    this.sellZone.on('pointerdown', () => {
      if (this.selectedTower) this.onUISellTower();
    });
    this.sellContainer = this.add.container(0, 38, [this.sellBubbleGfx, this.sellBubbleTxt, this.sellZone]);

    this.towerActionContainer.add([this.upgradeContainer, this.sellContainer]);
  }

  showInPlaceTowerActions(tower) {
    this.dismissAllInPlacePopups();
    this.selectedTower = tower;

    const cfg = TOWER_CONFIG[tower.type];
    const curLevelCfg = cfg.levels[tower.level - 1];
    const nextLevelCfg = tower.level < 3 ? cfg.levels[tower.level] : null;

    // Draw Range Circle
    this.rangeGfx.clear();
    this.rangeGfx.lineStyle(2, COLORS.RANGE_CIRCLE, 0.85);
    this.rangeGfx.strokeCircle(tower.x, tower.y, curLevelCfg.range);
    this.rangeGfx.fillStyle(COLORS.RANGE_CIRCLE, COLORS.RANGE_CIRCLE_ALPHA);
    this.rangeGfx.fillCircle(tower.x, tower.y, curLevelCfg.range);

    // Selected Border
    this.rangeGfx.lineStyle(2, 0xfacc15, 0.95);
    this.rangeGfx.strokeRoundedRect(tower.gridCol * TILE_SIZE, MAP_Y + tower.gridRow * TILE_SIZE, TILE_SIZE, TILE_SIZE, 6);

    // Position Container
    this.towerActionContainer.setPosition(tower.x, tower.y);

    // Upgrade Bubble
    const ug = this.upgradeBubbleGfx;
    ug.clear();
    if (nextLevelCfg) {
      const canAfford = this.gold >= nextLevelCfg.upgradeCost;
      ug.fillStyle(canAfford ? COLORS.BTN_UPGRADE : 0x475569, 0.95);
      ug.fillRoundedRect(-46, -16, 92, 32, 16);
      ug.lineStyle(1.5, 0xffffff, 0.8);
      ug.strokeRoundedRect(-46, -16, 92, 32, 16);
      this.upgradeBubbleTxt.setText(`⬆️ 升级 💰${nextLevelCfg.upgradeCost}`);
      this.upgradeContainer.setVisible(true);
    } else {
      ug.fillStyle(0x334155, 0.9);
      ug.fillRoundedRect(-46, -16, 92, 32, 16);
      this.upgradeBubbleTxt.setText('★ MAX 满级');
      this.upgradeContainer.setVisible(true);
    }

    // Sell Bubble
    let totalInvested = 0;
    for (let i = 0; i < tower.level; i++) {
      totalInvested += i === 0 ? cfg.levels[i].buildCost : cfg.levels[i].upgradeCost;
    }
    const refund = Math.floor(totalInvested * 0.7);

    const sg = this.sellBubbleGfx;
    sg.clear();
    sg.fillStyle(COLORS.BTN_SELL, 0.95);
    sg.fillRoundedRect(-46, -16, 92, 32, 16);
    sg.lineStyle(1.5, 0xffffff, 0.8);
    sg.strokeRoundedRect(-46, -16, 92, 32, 16);
    this.sellBubbleTxt.setText(`🗑️ 出售 +💰${refund}`);

    this.towerActionContainer.setVisible(true);
    soundManager.playClick();
  }

  dismissAllInPlacePopups() {
    this.activeBuildTile = null;
    this.selectedTower = null;
    this.buildWheelContainer.setVisible(false);
    this.towerActionContainer.setVisible(false);
    this.rangeGfx.clear();
  }

  // ==================== POINTER & INTERACTION ====================
  onPointerDown(pointer) {
    if (this.state === GAME_STATES.PAUSED || this.state === GAME_STATES.GAME_OVER) return;

    // Ignore clicks on floating HUD bars (Top: 0~58, Bottom: 880~960)
    if (pointer.y < 58 || pointer.y > 880) return;

    const col = Math.floor(pointer.x / TILE_SIZE);
    const row = Math.floor((pointer.y - MAP_Y) / TILE_SIZE);

    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

    // 1. Check Carrot Click
    const carrotWp = this.waypoints[this.waypoints.length - 1];
    if (carrotWp && Math.hypot(pointer.x - carrotWp.x, pointer.y - carrotWp.y) <= 26) {
      this.interactCarrot();
      return;
    }

    // 2. Check Click on existing Tower
    const clickedTower = this.towers.find(t => t.gridCol === col && t.gridRow === row);
    if (clickedTower) {
      this.showInPlaceTowerActions(clickedTower);
      return;
    }

    // 3. Check Click on Enemy (Lock-on 🎯)
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (Math.hypot(pointer.x - enemy.x, pointer.y - enemy.y) <= enemy.radius + 10) {
        this.toggleLockTarget(enemy);
        return;
      }
    }

    // 4. Check Click on Obstacle (Lock-on 🎯)
    const clickedObstacle = this.obstacles.find(obs => obs.alive && obs.col === col && obs.row === row);
    if (clickedObstacle) {
      this.toggleLockTarget(clickedObstacle);
      return;
    }

    // 5. Check Click on empty buildable Grass Tile -> In-Place Wheel!
    if (this.grid[row][col] === 1) {
      this.showInPlaceBuildWheel(col, row);
      return;
    }

    // Dismiss popups
    this.dismissAllInPlacePopups();
    this.clearLockTarget();
  }

  interactCarrot() {
    soundManager.playCarrot();
    const carrotWp = this.waypoints[this.waypoints.length - 1];
    this.showFloatingText('🥕 萌萌大萝卜!', carrotWp.x, carrotWp.y - 30, '#fb923c');

    this.tweens.add({
      targets: this.carrotGfx,
      scaleY: 1.25,
      y: -6,
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });
  }

  toggleLockTarget(target) {
    this.dismissAllInPlacePopups();
    if (this.lockedTarget === target) {
      this.clearLockTarget();
    } else {
      this.lockedTarget = target;
      soundManager.playLock();
      this.showFloatingText('🎯 锁定集火!', target.x, target.y - 20, '#ef4444');
    }
  }

  clearLockTarget() {
    this.lockedTarget = null;
    this.lockGfx.clear();
  }

  tryPlaceTower(col, row, type) {
    if (this.grid[row][col] !== 1) return;
    if (this.towers.find(t => t.gridCol === col && t.gridRow === row)) return;

    const cfg = TOWER_CONFIG[type];
    const cost = cfg.levels[0].buildCost;
    if (this.gold < cost) {
      soundManager.playError();
      this.showFloatingText('金币不足!', col * TILE_SIZE + 15, MAP_Y + row * TILE_SIZE + 15, '#f59e0b');
      return;
    }

    this.gold -= cost;

    const tower = {
      type,
      level: 1,
      gridCol: col,
      gridRow: row,
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: MAP_Y + row * TILE_SIZE + TILE_SIZE / 2,
      lastAttackTime: 0,
      target: null,
      angle: -Math.PI / 2,
      _gfx: null,
    };

    this.towers.push(tower);
    soundManager.playBuild();
    this.createPopParticleEffect(tower.x, tower.y, cfg.color);

    this.dismissAllInPlacePopups();
    this.emitUIUpdate();
  }

  // ==================== TOWER RENDERING ====================
  renderTower(tower) {
    if (!tower._gfx) {
      tower._gfx = this.add.graphics();
    }
    const g = tower._gfx;
    g.clear();

    const x = tower.x;
    const y = tower.y;

    this.drawTowerShape(g, x, y, tower.type, tower.level, tower.angle);

    // Rank Stars
    const dotSpacing = 7;
    const startDotX = x - ((tower.level - 1) * dotSpacing) / 2;
    for (let i = 0; i < tower.level; i++) {
      g.fillStyle(0xfacc15, 1);
      g.fillCircle(startDotX + i * dotSpacing, y + 10, 2.2);
    }
  }

  drawTowerShape(g, cx, cy, type, level, angle) {
    const baseRadius = 12;

    g.fillStyle(0x0f172a, 0.3);
    g.fillCircle(cx, cy + 2, baseRadius);

    g.fillStyle(0x334155, 1);
    g.fillCircle(cx, cy, baseRadius);
    g.lineStyle(1.5, 0x475569, 1);
    g.strokeCircle(cx, cy, baseRadius);

    const cfg = TOWER_CONFIG[type];

    switch (type) {
      case TOWER_TYPES.BOTTLE: {
        g.fillStyle(cfg.color, 1);
        g.fillRoundedRect(cx - 7, cy - 7, 14, 14, 4);

        const nx = cx + Math.cos(angle) * 11;
        const ny = cy + Math.sin(angle) * 11;
        g.lineStyle(4, 0x34d399, 1);
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(nx, ny);
        g.strokePath();

        g.fillStyle(0xffffff, 1);
        g.fillCircle(nx, ny, 2.5);

        if (level === 3) {
          g.lineStyle(1.5, 0xfacc15, 0.6);
          g.strokeCircle(cx, cy, baseRadius + 3);
        }
        break;
      }

      case TOWER_TYPES.POOP: {
        g.fillStyle(cfg.color, 1);
        g.fillCircle(cx, cy + 4, 8);
        g.fillCircle(cx, cy - 1, 6);
        g.fillCircle(cx, cy - 6, 3.5);

        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 3, cy, 2);
        g.fillCircle(cx + 3, cy, 2);
        g.fillStyle(0x000000, 1);
        g.fillCircle(cx - 3, cy, 1);
        g.fillCircle(cx + 3, cy, 1);
        break;
      }

      case TOWER_TYPES.SUN: {
        const petals = 8;
        g.fillStyle(0xfde047, 1);
        for (let i = 0; i < petals; i++) {
          const a = angle + (Math.PI * 2 * i) / petals;
          g.fillCircle(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 4);
        }
        g.fillStyle(0xb45309, 1);
        g.fillCircle(cx, cy, 6);
        g.fillStyle(0xf59e0b, 1);
        g.fillCircle(cx, cy, 3);
        break;
      }

      case TOWER_TYPES.FAN: {
        g.fillStyle(cfg.color, 1);
        g.fillCircle(cx, cy, 4);
        for (let i = 0; i < 4; i++) {
          const a = angle + (Math.PI / 2) * i;
          const fx = cx + Math.cos(a) * 9;
          const fy = cy + Math.sin(a) * 9;
          g.fillStyle(0x38bdf8, 1);
          g.fillTriangle(cx, cy, fx + Math.cos(a + 0.8) * 4, fy + Math.sin(a + 0.8) * 4, fx, fy);
        }
        break;
      }

      case TOWER_TYPES.MAGIC: {
        g.fillStyle(0x7e22ce, 1);
        g.fillCircle(cx, cy, 8);
        g.fillStyle(0xc084fc, 1);
        g.fillCircle(cx - 2, cy - 2, 4);
        g.lineStyle(1.5, 0xf0abfc, 1);
        g.strokeCircle(cx, cy, 8);
        break;
      }

      case TOWER_TYPES.ROCKET: {
        g.fillStyle(cfg.color, 1);
        g.fillCircle(cx, cy, 8);

        const rx = cx + Math.cos(angle) * 11;
        const ry = cy + Math.sin(angle) * 11;
        g.lineStyle(4, 0xef4444, 1);
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(rx, ry);
        g.strokePath();

        g.fillStyle(0xfacc15, 1);
        g.fillCircle(rx, ry, 3);
        break;
      }
    }
  }

  // ==================== ENEMY & COMBAT ====================
  startWave() {
    if (this.state === GAME_STATES.IN_WAVE) return;
    if (this.currentWave >= this.totalWaves) return;

    this.currentWave++;
    this.state = GAME_STATES.IN_WAVE;
    this.waveEnemiesSpawned = 0;
    this.waveEnemiesRemaining = 0;

    const waveCfg = this.levelData.waves[this.currentWave - 1];
    this.waveQueue = [];

    let delay = waveCfg.delay || 0;
    for (const group of waveCfg.enemies) {
      for (let i = 0; i < (group.count || 1); i++) {
        this.waveQueue.push({
          type: group.type,
          spawnTime: delay + i * (group.spacing || 750),
        });
        this.waveEnemiesRemaining++;
      }
      delay += (group.count || 1) * (group.spacing || 750) + 400;
    }

    this.waveStartTime = this.time.now;
    soundManager.playWaveStart();
    this.emitUIUpdate();
  }

  spawnEnemy(type) {
    const cfg = ENEMY_CONFIG[type];
    const startWp = this.waypoints[0];

    const waveScaling = 1 + (this.currentWave - 1) * 0.16;
    const hp = Math.round(cfg.hp * waveScaling);
    const shield = Math.round((cfg.shield || 0) * waveScaling);

    const enemy = {
      type,
      hp,
      maxHp: hp,
      shield,
      maxShield: shield,
      speed: cfg.speed,
      baseSpeed: cfg.speed,
      armor: cfg.armor || 0,
      reward: cfg.reward,
      damage: cfg.damage,
      color: cfg.color,
      radius: cfg.radius,
      x: startWp.x,
      y: startWp.y,
      waypointIndex: 1,
      alive: true,
      slowTimer: 0,
      slowFactor: 1,
      stealthSpeedTimer: 0,
      _gfx: null,
    };

    this.enemies.push(enemy);
  }

  updateEnemy(enemy, dt) {
    if (!enemy.alive) return;

    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;
      if (enemy.slowTimer <= 0) {
        enemy.slowTimer = 0;
        enemy.slowFactor = 1;
      }
    }

    let currentSpeed = enemy.baseSpeed * enemy.slowFactor;
    if (enemy.stealthSpeedTimer > 0) {
      enemy.stealthSpeedTimer -= dt;
      currentSpeed *= 1.4;
    }

    const moveDist = currentSpeed * (dt / 1000);
    const wp = this.waypoints[enemy.waypointIndex];

    if (!wp) {
      enemy.alive = false;
      this.lives -= enemy.damage;
      this.waveEnemiesRemaining--;

      soundManager.playCarrotHurt();
      this.cameras.main.shake(150, 0.01);
      this.drawCarrot();

      if (this.lives <= 0) {
        this.lives = 0;
        this.gameOver();
      }
      this.emitUIUpdate();
      return;
    }

    const dx = wp.x - enemy.x;
    const dy = wp.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= moveDist) {
      enemy.x = wp.x;
      enemy.y = wp.y;
      enemy.waypointIndex++;
    } else {
      enemy.x += (dx / dist) * moveDist;
      enemy.y += (dy / dist) * moveDist;
    }
  }

  renderEnemy(enemy) {
    if (!enemy.alive) return;
    if (!enemy._gfx) {
      enemy._gfx = this.add.graphics();
    }
    const g = enemy._gfx;
    g.clear();

    const r = enemy.radius;
    let color = enemy.color;
    if (enemy.slowTimer > 0) color = 0x67e8f9;

    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(enemy.x, enemy.y + r + 1, r * 1.6, r * 0.7);

    g.fillStyle(color, 1);
    g.fillCircle(enemy.x, enemy.y, r);
    g.lineStyle(1.5, 0x0f172a, 0.7);
    g.strokeCircle(enemy.x, enemy.y, r);

    // Googly Eyes
    if (enemy.waypointIndex < this.waypoints.length) {
      const wp = this.waypoints[enemy.waypointIndex];
      const ang = Math.atan2(wp.y - enemy.y, wp.x - enemy.x);
      const ex1 = enemy.x + Math.cos(ang - 0.4) * (r * 0.45);
      const ey1 = enemy.y + Math.sin(ang - 0.4) * (r * 0.45);
      const ex2 = enemy.x + Math.cos(ang + 0.4) * (r * 0.45);
      const ey2 = enemy.y + Math.sin(ang + 0.4) * (r * 0.45);

      g.fillStyle(0xffffff, 1);
      g.fillCircle(ex1, ey1, 2.5);
      g.fillCircle(ex2, ey2, 2.5);
      g.fillStyle(0x000000, 1);
      g.fillCircle(ex1 + Math.cos(ang) * 0.8, ey1 + Math.sin(ang) * 0.8, 1.2);
      g.fillCircle(ex2 + Math.cos(ang) * 0.8, ey2 + Math.sin(ang) * 0.8, 1.2);
    }

    if (enemy.type === ENEMY_TYPES.BOSS) {
      g.fillStyle(0xfacc15, 1);
      const crownY = enemy.y - r - 12;
      g.fillTriangle(enemy.x - 7, crownY, enemy.x - 4, crownY - 5, enemy.x - 1, crownY);
      g.fillTriangle(enemy.x - 1, crownY, enemy.x, crownY - 7, enemy.x + 1, crownY);
      g.fillTriangle(enemy.x + 1, crownY, enemy.x + 4, crownY - 5, enemy.x + 7, crownY);
    }

    const barW = Math.max(20, r * 2.2);
    const barH = 3.5;
    const barY = enemy.y - r - 7;
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);

    g.fillStyle(COLORS.HP_BAR_BG, 0.85);
    g.fillRoundedRect(enemy.x - barW / 2, barY, barW, barH, 2);

    let barColor = COLORS.HP_BAR_FILL;
    if (hpRatio < 0.3) barColor = COLORS.HP_BAR_DANGER;
    else if (hpRatio < 0.6) barColor = COLORS.HP_BAR_WARN;
    g.fillStyle(barColor, 1);
    g.fillRoundedRect(enemy.x - barW / 2, barY, barW * hpRatio, barH, 2);
  }

  removeEnemy(enemy) {
    if (enemy._gfx) {
      enemy._gfx.destroy();
      enemy._gfx = null;
    }
    this.enemies = this.enemies.filter(e => e !== enemy);
    if (this.lockedTarget === enemy) {
      this.clearLockTarget();
    }
  }

  updateTower(tower, time, dt) {
    const cfg = TOWER_CONFIG[tower.type].levels[tower.level - 1];

    let attackSpeed = cfg.attackSpeed;
    const hasNearbyBottleAura = this.towers.some(
      t => t !== tower && t.type === TOWER_TYPES.BOTTLE && t.level === 3 && Math.hypot(t.x - tower.x, t.y - tower.y) <= 80
    );
    if (hasNearbyBottleAura) {
      attackSpeed *= 0.75;
    }

    if (tower.type === TOWER_TYPES.SUN) {
      if (time - tower.lastAttackTime >= attackSpeed) {
        tower.lastAttackTime = time;
        this.fireSunflower(tower, cfg);
      }
      return;
    }

    const target = this.findBestTarget(tower, cfg.range);
    tower.target = target;

    if (target && target.alive) {
      const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      tower.angle = angle;

      if (tower.type === TOWER_TYPES.MAGIC) {
        if (time - tower.lastAttackTime >= attackSpeed) {
          tower.lastAttackTime = time;
          this.fireMagicBeams(tower, cfg);
        }
      } else {
        if (time - tower.lastAttackTime >= attackSpeed) {
          tower.lastAttackTime = time;
          this.fireProjectile(tower, target, cfg);
        }
      }
    }
  }

  findBestTarget(tower, range) {
    if (this.lockedTarget && this.lockedTarget.alive) {
      const dist = Math.hypot(tower.x - this.lockedTarget.x, tower.y - this.lockedTarget.y);
      if (dist <= range) return this.lockedTarget;
    }

    let bestEnemy = null;
    let maxProgress = -Infinity;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(tower.x - enemy.x, tower.y - enemy.y);
      if (dist <= range) {
        const progress = enemy.waypointIndex * 1000 - Math.hypot(this.waypoints[enemy.waypointIndex].x - enemy.x, this.waypoints[enemy.waypointIndex].y - enemy.y);
        if (progress > maxProgress) {
          maxProgress = progress;
          bestEnemy = enemy;
        }
      }
    }

    if (bestEnemy) return bestEnemy;

    for (const obs of this.obstacles) {
      if (!obs.alive) continue;
      const dist = Math.hypot(tower.x - obs.x, tower.y - obs.y);
      if (dist <= range) return obs;
    }

    return null;
  }

  fireProjectile(tower, target, cfg) {
    const p = {
      type: tower.type,
      x: tower.x,
      y: tower.y,
      target,
      targetX: target.x,
      targetY: target.y,
      speed: 400,
      damage: cfg.damage,
      splash: cfg.splash || 0,
      slow: cfg.slow || 0,
      slowDuration: cfg.slowDuration || 0,
      piercing: cfg.piercing || false,
      _gfx: null,
    };

    switch (tower.type) {
      case TOWER_TYPES.BOTTLE:
        soundManager.playBottle();
        this.projectiles.push(p);
        break;

      case TOWER_TYPES.POOP:
        soundManager.playPoop();
        p.speed = 320;
        this.projectiles.push(p);
        break;

      case TOWER_TYPES.FAN: {
        soundManager.playFan();
        const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        p.vx = Math.cos(angle) * 450;
        p.vy = Math.sin(angle) * 450;
        p.hitList = [];
        this.piercingBlades.push(p);
        break;
      }

      case TOWER_TYPES.ROCKET:
        soundManager.playRocket();
        p.speed = 280;
        this.projectiles.push(p);
        break;
    }
  }

  fireSunflower(tower, cfg) {
    soundManager.playSun();

    const ring = this.add.graphics();
    ring.fillStyle(0xfde047, 0.45);
    ring.fillCircle(tower.x, tower.y, 10);
    ring.lineStyle(3, 0xf59e0b, 0.9);
    ring.strokeCircle(tower.x, tower.y, 10);

    this.tweens.add({
      targets: ring,
      scaleX: cfg.range / 10,
      scaleY: cfg.range / 10,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (Math.hypot(tower.x - enemy.x, tower.y - enemy.y) <= cfg.range) {
        this.applyDamage(enemy, cfg.damage, '#f59e0b');
      }
    }

    for (const obs of this.obstacles) {
      if (!obs.alive) continue;
      if (Math.hypot(tower.x - obs.x, tower.y - obs.y) <= cfg.range) {
        this.damageObstacle(obs, cfg.damage);
      }
    }
  }

  fireMagicBeams(tower, cfg) {
    soundManager.playMagic();
    const maxTargets = cfg.maxTargets || 1;
    let hitCount = 0;

    if (this.lockedTarget && this.lockedTarget.alive && Math.hypot(tower.x - this.lockedTarget.x, tower.y - this.lockedTarget.y) <= cfg.range) {
      this.magicBeams.push({ x1: tower.x, y1: tower.y, x2: this.lockedTarget.x, y2: this.lockedTarget.y });
      if (this.lockedTarget.reward !== undefined && this.lockedTarget.type in OBSTACLE_TYPES) {
        this.damageObstacle(this.lockedTarget, cfg.damage);
      } else {
        this.applyDamage(this.lockedTarget, cfg.damage, '#c084fc');
      }
      hitCount++;
    }

    for (const enemy of this.enemies) {
      if (hitCount >= maxTargets) break;
      if (!enemy.alive || enemy === this.lockedTarget) continue;
      if (Math.hypot(tower.x - enemy.x, tower.y - enemy.y) <= cfg.range) {
        this.magicBeams.push({ x1: tower.x, y1: tower.y, x2: enemy.x, y2: enemy.y });
        this.applyDamage(enemy, cfg.damage, '#c084fc');
        hitCount++;
      }
    }
  }

  updateProjectile(p, dt) {
    if (p.hit) return true;

    let tx = p.targetX;
    let ty = p.targetY;
    if (p.target && p.target.alive) {
      tx = p.target.x;
      ty = p.target.y;
      p.targetX = tx;
      p.targetY = ty;
    }

    const dx = tx - p.x;
    const dy = ty - p.y;
    const dist = Math.hypot(dx, dy);
    const move = p.speed * (dt / 1000);

    if (dist <= move + 8) {
      this.onProjectileHit(p);
      return true;
    }

    p.x += (dx / dist) * move;
    p.y += (dy / dist) * move;
    return false;
  }

  onProjectileHit(p) {
    p.hit = true;
    soundManager.playHit();

    if (p.target && p.target.alive) {
      if (p.target.reward !== undefined && p.target.type in OBSTACLE_TYPES) {
        this.damageObstacle(p.target, p.damage);
      } else {
        this.applyDamage(p.target, p.damage, '#facc15');
        if (p.slow > 0) {
          p.target.slowTimer = p.slowDuration;
          p.target.slowFactor = 1 - p.slow;
        }
      }
    }

    if (p.splash > 0) {
      this.splashDamage(p.x, p.y, p.damage, p.splash);
    }
  }

  splashDamage(x, y, damage, radius) {
    this.createExplosionEffect(x, y, radius);
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = Math.hypot(enemy.x - x, enemy.y - y);
      if (d <= radius) {
        this.applyDamage(enemy, damage * (1 - (d / radius) * 0.4), '#ef4444');
      }
    }
    for (const obs of this.obstacles) {
      if (!obs.alive) continue;
      const d = Math.hypot(obs.x - x, obs.y - y);
      if (d <= radius) {
        this.damageObstacle(obs, damage * (1 - (d / radius) * 0.4));
      }
    }
  }

  damageObstacle(obs, damage) {
    if (!obs.alive) return;
    obs.hp -= damage;
    this.showFloatingText(damage.toFixed(0), obs.x, obs.y - 12, '#ffffff');

    if (obs.hp <= 0) {
      obs.alive = false;
      this.totalObstaclesCleared++;
      this.gold += obs.reward;
      this.score += obs.reward * 15;

      if (obs.type === OBSTACLE_TYPES.CHEST) {
        soundManager.playTreasure();
        this.showFloatingText(`🎁 宝箱大奖 +${obs.reward} 💰`, obs.x, obs.y, '#facc15');
      } else {
        soundManager.playObstacleBreak();
        this.showFloatingText(`+${obs.reward} 💰`, obs.x, obs.y, '#facc15');
      }

      this.grid[obs.row][obs.col] = 1;
      this.createPopParticleEffect(obs.x, obs.y, 0xfacc15);

      if (this.lockedTarget === obs) {
        this.clearLockTarget();
      }
      this.emitUIUpdate();
    }
  }

  applyDamage(enemy, rawDamage, color) {
    if (!enemy.alive) return;
    let damage = rawDamage * (1 - (enemy.armor || 0));

    if (enemy.shield > 0) {
      if (enemy.shield >= damage) {
        enemy.shield -= damage;
        this.showFloatingText(damage.toFixed(0), enemy.x, enemy.y - 12, '#38bdf8');
        return;
      } else {
        damage -= enemy.shield;
        enemy.shield = 0;
      }
    }

    enemy.hp -= damage;
    this.showFloatingText(damage.toFixed(0), enemy.x, enemy.y - 12, color || '#facc15');

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    if (!enemy.alive) return;
    enemy.alive = false;

    this.gold += enemy.reward;
    this.totalKills++;
    this.waveEnemiesRemaining--;
    this.score += enemy.reward * 12;

    soundManager.playEnemyDeath();
    soundManager.playCoin();

    this.createCoinDropEffect(enemy.x, enemy.y, enemy.reward);
    this.removeEnemy(enemy);
    this.emitUIUpdate();
    this.checkWaveComplete();
  }

  renderLockReticle() {
    const g = this.lockGfx;
    g.clear();

    if (!this.lockedTarget || !this.lockedTarget.alive) return;

    const tx = this.lockedTarget.x;
    const ty = this.lockedTarget.y;
    const r = (this.lockedTarget.radius || 14) + 6;

    g.lineStyle(2, COLORS.LOCK_TARGET_RING, 0.95);
    g.strokeCircle(tx, ty, r);

    g.lineStyle(2, COLORS.LOCK_TARGET_RING, 1);
    g.beginPath();
    g.moveTo(tx - r - 4, ty); g.lineTo(tx - r + 4, ty);
    g.moveTo(tx + r - 4, ty); g.lineTo(tx + r + 4, ty);
    g.moveTo(tx, ty - r - 4); g.lineTo(tx, ty - r + 4);
    g.moveTo(tx, ty + r - 4); g.lineTo(tx, ty + r + 4);
    g.strokePath();
  }

  showFloatingText(text, x, y, color) {
    const t = this.add.text(x, y, text, {
      fontSize: '13px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: color || '#ffffff',
      fontStyle: 'bold',
      stroke: '#0f172a',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: t,
      y: y - 22,
      alpha: 0,
      duration: 600,
      onComplete: () => t.destroy(),
    });
  }

  createPopParticleEffect(x, y, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 0.6);
    g.fillCircle(x, y, 8);
    this.tweens.add({
      targets: g,
      scaleX: 2.8,
      scaleY: 2.8,
      alpha: 0,
      duration: 300,
      onComplete: () => g.destroy(),
    });
  }

  createExplosionEffect(x, y, radius) {
    const g = this.add.graphics();
    g.fillStyle(0xf97316, 0.65);
    g.fillCircle(x, y, 12);
    this.tweens.add({
      targets: g,
      scaleX: radius / 12,
      scaleY: radius / 12,
      alpha: 0,
      duration: 260,
      onComplete: () => g.destroy(),
    });
  }

  createCoinDropEffect(x, y, amount) {
    const t = this.add.text(x, y, `+${amount}🪙`, {
      fontSize: '13px',
      fontFamily: 'system-ui, Arial, sans-serif',
      color: '#facc15',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2.5,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: t,
      x: 350,
      y: 28,
      scale: 0.65,
      alpha: 0.2,
      duration: 600,
      ease: 'Cubic.easeIn',
      onComplete: () => t.destroy(),
    });
  }

  // ==================== WAVE MANAGEMENT ====================
  checkWaveComplete() {
    if (this.waveEnemiesRemaining <= 0 && this.waveQueue.length === 0) {
      this.state = GAME_STATES.WAVE_COMPLETE;
      const bonus = 25 + this.currentWave * 8;
      this.gold += bonus;
      this.score += bonus * 10;
      this.showFloatingText(`🥕 波次防守成功! +${bonus} 💰`, GAME_WIDTH / 2, MAP_Y + MAP_HEIGHT / 2, '#facc15');
      this.emitUIUpdate();

      if (this.currentWave >= this.totalWaves) {
        this.time.delayedCall(800, () => this.victory());
      } else if (this.autoWave) {
        this.time.delayedCall(1200, () => {
          if (this.state === GAME_STATES.WAVE_COMPLETE) {
            this.startWave();
          }
        });
      }
    }
  }

  gameOver() {
    this.state = GAME_STATES.GAME_OVER;
    soundManager.playDefeat();
    this.emitUIUpdate();
    this.saveProgress(false);

    this.time.delayedCall(900, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        level: this.levelId,
        wave: this.currentWave,
        score: this.score,
      });
    });
  }

  victory() {
    this.state = GAME_STATES.VICTORY;
    soundManager.playVictory();
    this.emitUIUpdate();

    const stars = this.calculateStars();
    this.saveProgress(true, stars);

    this.time.delayedCall(1000, () => {
      this.scene.stop('UIScene');
      this.scene.start('WinScene', {
        level: this.levelId,
        stars,
        score: this.score,
        livesLeft: this.lives,
        goldLeft: this.gold,
      });
    });
  }

  calculateStars() {
    if (this.lives >= 10) return 3;
    if (this.lives >= 5) return 2;
    return 1;
  }

  saveProgress(won, stars) {
    try {
      const save = JSON.parse(localStorage.getItem('td_save') || '{}');
      save.currentLevel = this.levelId;
      save.maxLevel = Math.max(save.maxLevel || 1, won ? this.levelId + 1 : this.levelId);
      save.stars = save.stars || {};
      if (won && stars > (save.stars[this.levelId] || 0)) {
        save.stars[this.levelId] = stars;
      }
      save.lastScore = this.score;
      localStorage.setItem('td_save', JSON.stringify(save));
    } catch (e) {}
  }

  // ==================== MAIN UPDATE LOOP ====================
  update(time, delta) {
    if (this.state === GAME_STATES.PAUSED || this.state === GAME_STATES.GAME_OVER || this.state === GAME_STATES.VICTORY) {
      return;
    }

    const dt = Math.min(delta, 50) * this.gameSpeed;

    if (this.state === GAME_STATES.IN_WAVE && this.waveQueue.length > 0) {
      const elapsed = (time - this.waveStartTime) * this.gameSpeed;
      while (this.waveQueue.length > 0 && this.waveQueue[0].spawnTime <= elapsed) {
        const entry = this.waveQueue.shift();
        this.spawnEnemy(entry.type);
        this.waveEnemiesSpawned++;
      }
    }

    this.fxGfx.clear();
    this.magicBeams = [];

    this.renderObstacles();

    for (const enemy of this.enemies) {
      this.updateEnemy(enemy, dt);
      this.renderEnemy(enemy);
    }

    for (const tower of this.towers) {
      this.renderTower(tower);
      this.updateTower(tower, time, dt);
    }

    for (const beam of this.magicBeams) {
      this.fxGfx.lineStyle(3, 0xc084fc, 0.9);
      this.fxGfx.beginPath();
      this.fxGfx.moveTo(beam.x1, beam.y1);
      this.fxGfx.lineTo(beam.x2, beam.y2);
      this.fxGfx.strokePath();
    }

    for (const p of this.projectiles) {
      if (this.updateProjectile(p, dt)) {
        if (p._gfx) { p._gfx.destroy(); p._gfx = null; }
      } else {
        if (!p._gfx) p._gfx = this.add.graphics();
        p._gfx.clear();
        p._gfx.fillStyle(p.type === TOWER_TYPES.POOP ? 0xb45309 : p.type === TOWER_TYPES.ROCKET ? 0xef4444 : 0x10b981, 1);
        p._gfx.fillCircle(p.x, p.y, p.type === TOWER_TYPES.ROCKET ? 4.5 : 3.5);
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.hit);

    for (const blade of this.piercingBlades) {
      blade.x += blade.vx * (dt / 1000);
      blade.y += blade.vy * (dt / 1000);

      for (const enemy of this.enemies) {
        if (!enemy.alive || blade.hitList.includes(enemy)) continue;
        if (Math.hypot(blade.x - enemy.x, blade.y - enemy.y) <= enemy.radius + 6) {
          blade.hitList.push(enemy);
          this.applyDamage(enemy, blade.damage, '#06b6d4');
          soundManager.playHit();
        }
      }

      for (const obs of this.obstacles) {
        if (!obs.alive || blade.hitList.includes(obs)) continue;
        if (Math.hypot(blade.x - obs.x, blade.y - obs.y) <= 16) {
          blade.hitList.push(obs);
          this.damageObstacle(obs, blade.damage);
        }
      }

      if (!blade._gfx) blade._gfx = this.add.graphics();
      blade._gfx.clear();
      blade._gfx.fillStyle(0x06b6d4, 1);
      blade._gfx.fillCircle(blade.x, blade.y, 4);

      if (blade.x < -20 || blade.x > GAME_WIDTH + 20 || blade.y < MAP_Y - 20 || blade.y > MAP_Y + MAP_HEIGHT + 20) {
        blade.hit = true;
        if (blade._gfx) blade._gfx.destroy();
      }
    }
    this.piercingBlades = this.piercingBlades.filter(b => !b.hit);

    this.renderLockReticle();

    this.enemies = this.enemies.filter(e => e.alive || (e._gfx && e._gfx.destroy(), false));
  }

  // ==================== UI COMMUNICATION ====================
  emitUIUpdate() {
    this.events.emit('uiUpdate', {
      gold: this.gold,
      lives: this.lives,
      wave: this.currentWave,
      totalWaves: this.totalWaves,
      state: this.state,
      score: this.score,
      gameSpeed: this.gameSpeed,
      autoWave: this.autoWave,
    });
  }

  onUIUpgradeTower() {
    if (!this.selectedTower) return;
    const t = this.selectedTower;
    if (t.level >= 3) return;
    const nextCfg = TOWER_CONFIG[t.type].levels[t.level];
    if (this.gold < nextCfg.upgradeCost) {
      soundManager.playError();
      return;
    }

    this.gold -= nextCfg.upgradeCost;
    t.level++;
    if (t._gfx) { t._gfx.destroy(); t._gfx = null; }

    soundManager.playUpgrade();
    this.createPopParticleEffect(t.x, t.y, TOWER_CONFIG[t.type].color);

    this.showInPlaceTowerActions(t);
    this.emitUIUpdate();
  }

  onUISellTower() {
    if (!this.selectedTower) return;
    const t = this.selectedTower;
    let totalSpent = 0;
    for (let i = 0; i < t.level; i++) {
      const lvlCfg = TOWER_CONFIG[t.type].levels[i];
      totalSpent += i === 0 ? lvlCfg.buildCost : lvlCfg.upgradeCost;
    }
    const refund = Math.floor(totalSpent * 0.7);
    this.gold += refund;

    soundManager.playSell();
    this.showFloatingText(`+${refund} 💰`, t.x, t.y, '#facc15');

    if (t._gfx) { t._gfx.destroy(); t._gfx = null; }
    this.towers = this.towers.filter(tw => tw !== t);
    this.dismissAllInPlacePopups();
    this.emitUIUpdate();
  }

  onUIStartWave() {
    if (this.state === GAME_STATES.PREPARATION || this.state === GAME_STATES.WAVE_COMPLETE) {
      this.startWave();
    }
  }

  onUIPause() {
    soundManager.playClick();
    if (this.state === GAME_STATES.PAUSED) {
      this.state = this._prevState || GAME_STATES.PREPARATION;
    } else {
      this._prevState = this.state;
      this.state = GAME_STATES.PAUSED;
    }
    this.emitUIUpdate();
  }

  onUISetSpeed(speed) {
    this.gameSpeed = speed;
    soundManager.playClick();
    this.emitUIUpdate();
  }

  onUIToggleAutoWave() {
    this.autoWave = !this.autoWave;
    soundManager.playClick();
    this.emitUIUpdate();
  }

  onUIUseSkill(skillType) {
    if (this.state === GAME_STATES.PAUSED) return;

    switch (skillType) {
      case 'bomb':
        if (this.gold < 40) { soundManager.playError(); return; }
        this.gold -= 40;
        this.skillBomb();
        break;
      case 'freeze':
        if (this.gold < 30) { soundManager.playError(); return; }
        this.gold -= 30;
        this.skillFreeze();
        break;
      case 'gold':
        if (this.gold < 20) { soundManager.playError(); return; }
        this.gold -= 20;
        this.skillGold();
        break;
    }
    this.emitUIUpdate();
  }

  skillBomb() {
    soundManager.playRocket();
    this.cameras.main.flash(300, 249, 115, 22, 0.4);
    this.cameras.main.shake(250, 0.015);

    const dmg = 85 + this.currentWave * 20;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      this.applyDamage(enemy, dmg, '#ef4444');
    }
    for (const obs of this.obstacles) {
      if (!obs.alive) continue;
      this.damageObstacle(obs, dmg);
    }
    this.showFloatingText('💣 全场大爆破!', GAME_WIDTH / 2, MAP_Y + MAP_HEIGHT / 2, '#ef4444');
  }

  skillFreeze() {
    soundManager.playSun();
    this.cameras.main.flash(300, 103, 232, 249, 0.4);

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.slowTimer = 4500;
      enemy.slowFactor = 0.2;
    }
    this.showFloatingText('❄️ 全场冰冻!', GAME_WIDTH / 2, MAP_Y + MAP_HEIGHT / 2, '#38bdf8');
  }

  skillGold() {
    soundManager.playTreasure();
    const bonus = 45 + this.currentWave * 10;
    this.gold += bonus;
    this.showFloatingText(`🎁 萝卜福袋 +${bonus} 💰`, GAME_WIDTH / 2, MAP_Y + MAP_HEIGHT / 2, '#facc15');
  }
}
