import { TILE_SIZE, GRID_COLS, GRID_ROWS, GAME_WIDTH, GAME_HEIGHT, MAP_HEIGHT, COLORS, GAME_STATES } from '../config/gameConfig.js';
import { TOWER_CONFIG, TOWER_TYPES } from '../config/towerConfig.js';
import { ENEMY_CONFIG } from '../config/enemyConfig.js';
import { getLevelData } from '../config/levelConfig.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.levelId = data.level || 1;
  }

  create() {
    const lvl = getLevelData(this.levelId);
    this.levelData = lvl;
    this.gold = lvl.initialGold;
    this.lives = lvl.initialLives;
    this.currentWave = 0;
    this.totalWaves = lvl.waves.length;
    this.state = GAME_STATES.PREPARATION;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.placementType = null;
    this.selectedTower = null;
    this.waveEnemiesRemaining = 0;
    this.waveEnemiesSpawned = 0;
    this.waveQueue = [];
    this.waveTimer = null;
    this.totalKills = 0;
    this.totalGoldEarned = 0;
    this.score = 0;
    this.baseSpeed = 1;

    this.buildGrid();

    this.mapGfx = this.add.graphics();
    this.entityGfx = this.add.graphics();
    this.uiGfx = this.add.graphics();
    this.previewGfx = this.add.graphics();

    this.drawMap();

    this.input.on('pointermove', (pointer) => this.onPointerMove(pointer));
    this.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    this.input.keyboard.on('keydown-ESC', () => this.cancelPlacement());
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.state === GAME_STATES.PREPARATION || this.state === GAME_STATES.WAVE_COMPLETE) {
        this.startWave();
      }
    });

    this.scene.launch('UIScene', {
      level: this.levelId,
      levelName: lvl.name,
      gold: this.gold,
      lives: this.lives,
      wave: this.currentWave,
      totalWaves: this.totalWaves,
      availableTowers: lvl.availableTowers,
      state: this.state,
    });

    this.emitUIUpdate();
  }

  buildGrid() {
    this.grid = this.levelData.grid;
    this.waypoints = this.levelData.waypoints;
  }

  drawMap() {
    const g = this.mapGfx;
    g.clear();

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        const tile = this.grid[row][col];

        if (tile === 0) {
          g.fillStyle(COLORS.PATH, 1);
        } else if (tile === 2) {
          g.fillStyle(COLORS.BLOCKED, 1);
        } else {
          g.fillStyle(COLORS.BUILDABLE, 1);
        }
        g.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        g.lineStyle(1, COLORS.GRID_LINE, 0.2);
        g.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw waypoints and path decoration
    g.lineStyle(3, COLORS.PATH, 0.2);
    // Don't redraw path - it's already in the grid

    // Draw spawn and exit markers
    if (this.waypoints.length >= 2) {
      const start = this.waypoints[0];
      const end = this.waypoints[this.waypoints.length - 1];
      g.fillStyle(0x44ff44, 0.3);
      g.fillCircle(start.x, start.y, 12);
      g.fillStyle(0xff4444, 0.3);
      g.fillCircle(end.x, end.y, 12);
    }
  }

  onPointerMove(pointer) {
    if (this.state === GAME_STATES.PAUSED || this.state === GAME_STATES.GAME_OVER) return;
    if (pointer.y > MAP_HEIGHT) {
      this.clearPreview();
      return;
    }

    if (this.placementType) {
      this.drawPlacementPreview(pointer);
    } else if (!this.selectedTower) {
      this.hoverTile(pointer);
    }
  }

  hoverTile(pointer) {
    const col = Math.floor(pointer.x / TILE_SIZE);
    const row = Math.floor(pointer.y / TILE_SIZE);

    // Only hover on map area
    if (pointer.y >= MAP_HEIGHT || col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return;
    }

    const g = this.previewGfx;
    g.clear();
    if (this.grid[row][col] === 1) {
      const existingTower = this.towers.find(t => t.gridCol === col && t.gridRow === row);
      if (!existingTower) {
        g.fillStyle(COLORS.BUILDABLE_HOVER, 0.3);
        g.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  drawPlacementPreview(pointer) {
    const col = Math.floor(pointer.x / TILE_SIZE);
    const row = Math.floor(pointer.y / TILE_SIZE);

    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS || pointer.y >= MAP_HEIGHT) {
      this.clearPreview();
      return;
    }

    const g = this.previewGfx;
    g.clear();

    const canPlace = this.grid[row][col] === 1 && !this.towers.find(t => t.gridCol === col && t.gridRow === row);
    const cfg = TOWER_CONFIG[this.placementType];
    const cost = cfg.levels[0].buildCost;
    if (this.gold < cost) {
      // can't afford
    }

    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;

    if (canPlace && this.gold >= cost) {
      g.fillStyle(COLORS.BUILDABLE_HOVER, 0.5);
    } else {
      g.fillStyle(COLORS.BUILDABLE_INVALID, 0.4);
    }
    g.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Draw tower preview
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;
    g.fillStyle(cfg.color, 0.6);
    this.drawTowerShape(g, cx, cy, this.placementType, 1, 0);

    // Draw range preview
    const range = cfg.levels[0].range;
    g.lineStyle(1, COLORS.RANGE_CIRCLE, 0.3);
    g.strokeCircle(cx, cy, range);
  }

  clearPreview() {
    this.previewGfx.clear();
  }

  onPointerDown(pointer) {
    if (this.state === GAME_STATES.PAUSED || this.state === GAME_STATES.GAME_OVER) return;

    if (pointer.y >= MAP_HEIGHT) return;

    const col = Math.floor(pointer.x / TILE_SIZE);
    const row = Math.floor(pointer.y / TILE_SIZE);

    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

    if (this.placementType) {
      this.tryPlaceTower(col, row);
      return;
    }

    const existing = this.towers.find(t => t.gridCol === col && t.gridRow === row);
    if (existing) {
      this.selectTower(existing);
    } else {
      this.deselectTower();
    }
  }

  tryPlaceTower(col, row) {
    if (this.grid[row][col] !== 1) return;
    if (this.towers.find(t => t.gridCol === col && t.gridRow === row)) return;

    const cfg = TOWER_CONFIG[this.placementType];
    const cost = cfg.levels[0].buildCost;
    if (this.gold < cost) {
      this.showFloatingText('金币不足!', col * TILE_SIZE + 32, row * TILE_SIZE + 32, '#ff4444');
      return;
    }

    this.gold -= cost;
    this.totalGoldEarned -= cost;

    const tower = {
      type: this.placementType,
      level: 1,
      gridCol: col,
      gridRow: row,
      lastAttackTime: 0,
      target: null,
      angle: 0,
    };
    this.towers.push(tower);
    this.drawTowers();
    this.cancelPlacement();
    this.emitUIUpdate();
    this.selectTower(tower);
  }

  selectTower(tower) {
    this.deselectTower();
    this.selectedTower = tower;

    const g = this.previewGfx;
    g.clear();
    const cfg = TOWER_CONFIG[tower.type].levels[tower.level - 1];
    const cx = tower.gridCol * TILE_SIZE + TILE_SIZE / 2;
    const cy = tower.gridRow * TILE_SIZE + TILE_SIZE / 2;
    g.lineStyle(2, COLORS.RANGE_CIRCLE, 0.4);
    g.strokeCircle(cx, cy, cfg.range);
    g.fillStyle(COLORS.RANGE_CIRCLE, COLORS.RANGE_CIRCLE_ALPHA);
    g.fillCircle(cx, cy, cfg.range);

    this.events.emit('towerSelected', tower);
  }

  deselectTower() {
    this.selectedTower = null;
    this.previewGfx.clear();
    this.events.emit('towerDeselected');
  }

  cancelPlacement() {
    this.placementType = null;
    this.clearPreview();
    this.events.emit('placementCancelled');
  }

  drawTowers() {
    this.towers.forEach(t => {
      if (t._gfx) { t._gfx.destroy(); t._gfx = null; }
    });
  }

  renderTower(tower) {
    if (!tower._gfx) {
      tower._gfx = this.add.graphics();
    }
    const g = tower._gfx;
    g.clear();

    const cfg = TOWER_CONFIG[tower.type].levels[tower.level - 1];
    const x = tower.gridCol * TILE_SIZE + TILE_SIZE / 2;
    const y = tower.gridRow * TILE_SIZE + TILE_SIZE / 2;
    const size = 14 + tower.level * 6;

    this.drawTowerShape(g, x, y, tower.type, tower.level, tower.angle);

    // Level indicator dots
    for (let i = 0; i < tower.level; i++) {
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(x - 12 + i * 12, y + size + 6, 3);
    }
    for (let i = tower.level; i < 3; i++) {
      g.fillStyle(0x666666, 0.4);
      g.fillCircle(x - 12 + i * 12, y + size + 6, 3);
    }
  }

  drawTowerShape(g, cx, cy, type, level, angle) {
    const size = 14 + level * 6;

    switch (type) {
      case TOWER_TYPES.ARROW:
        // Square base with triangle top
        g.fillStyle(TOWER_CONFIG.arrow.color, 1);
        g.fillRect(cx - size, cy - size, size * 2, size * 2);
        // Directional triangle
        g.fillStyle(0x338833, 1);
        const tipX = cx + Math.cos(angle) * (size + 10);
        const tipY = cy + Math.sin(angle) * (size + 10);
        const a1 = angle + Math.PI * 0.75;
        const a2 = angle - Math.PI * 0.75;
        g.fillTriangle(
          tipX, tipY,
          cx + Math.cos(a1) * size * 0.7, cy + Math.sin(a1) * size * 0.7,
          cx + Math.cos(a2) * size * 0.7, cy + Math.sin(a2) * size * 0.7
        );
        break;

      case TOWER_TYPES.CANNON:
        // Circle base
        g.fillStyle(TOWER_CONFIG.cannon.color, 1);
        g.fillCircle(cx, cy, size);
        g.lineStyle(2, 0x662222, 1);
        g.strokeCircle(cx, cy, size);
        // Barrel rectangle
        g.fillStyle(0x663333, 1);
        const bx = cx + Math.cos(angle) * size * 0.5;
        const by = cy + Math.sin(angle) * size * 0.5;
        g.save && g.save();
        // Draw barrel as rotated rect using lines
        const bl = size * 0.9;
        const bw = size * 0.4;
        const corners = [
          { x: -bw, y: -bl },
          { x: bw, y: -bl },
          { x: bw, y: 0 },
          { x: -bw, y: 0 },
        ];
        const rc = corners.map(c => ({
          x: bx + Math.cos(angle) * c.y - Math.sin(angle) * c.x,
          y: by + Math.sin(angle) * c.y + Math.cos(angle) * c.x,
        }));
        g.fillStyle(0x663333, 1);
        g.beginPath();
        g.moveTo(rc[0].x, rc[0].y);
        for (let i = 1; i < rc.length; i++) g.lineTo(rc[i].x, rc[i].y);
        g.closePath();
        g.fillPath();
        break;

      case TOWER_TYPES.ICE:
        // Hexagonal shape
        g.fillStyle(TOWER_CONFIG.ice.color, 1);
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = angle + (Math.PI * 2 * i) / 6;
          pts.push({ x: cx + Math.cos(a) * size, y: cy + Math.sin(a) * size });
        }
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.closePath();
        g.fillPath();
        g.lineStyle(2, 0x6699cc, 1);
        g.strokePath();
        break;

      case TOWER_TYPES.LIGHTNING:
        // Diamond shape
        g.fillStyle(TOWER_CONFIG.lightning.color, 1);
        g.beginPath();
        g.moveTo(cx, cy - size);
        g.lineTo(cx + size, cy);
        g.lineTo(cx, cy + size);
        g.lineTo(cx - size, cy);
        g.closePath();
        g.fillPath();
        // Inner zigzag
        g.lineStyle(2, 0xffffff, 0.8);
        g.beginPath();
        g.moveTo(cx - size * 0.4, cy - size * 0.2);
        g.lineTo(cx + size * 0.1, cy);
        g.lineTo(cx - size * 0.2, cy + size * 0.2);
        g.strokePath();
        break;
    }
  }

  // ---- Enemy System ----
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
          spawnTime: delay + i * (group.spacing || 1000),
        });
        this.waveEnemiesRemaining++;
      }
    }

    this.waveStartTime = this.time.now;
    this.emitUIUpdate();
  }

  spawnEnemy(type) {
    const cfg = ENEMY_CONFIG[type];
    const startWp = this.waypoints[0];

    const enemy = {
      type,
      hp: cfg.hp * (1 + this.currentWave * 0.15),
      maxHp: cfg.hp * (1 + this.currentWave * 0.15),
      speed: cfg.speed * this.baseSpeed,
      baseSpeed: cfg.speed,
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
      _gfx: null,
    };

    enemy.maxHp = enemy.hp;
    this.enemies.push(enemy);
  }

  updateEnemy(enemy, dt) {
    if (!enemy.alive) return;

    // Slow effect
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;
      if (enemy.slowTimer <= 0) {
        enemy.slowTimer = 0;
        enemy.slowFactor = 1;
      }
    }
    const speed = enemy.speed * enemy.slowFactor * (dt / 1000);

    const wp = this.waypoints[enemy.waypointIndex];
    if (!wp) {
      // Reached end
      enemy.alive = false;
      this.lives -= enemy.damage;
      this.waveEnemiesRemaining--;
      if (this.lives <= 0) {
        this.lives = 0;
        this.gameOver();
      }
      this.emitUIUpdate();
      return;
    }

    const dx = wp.x - enemy.x;
    const dy = wp.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= speed) {
      enemy.x = wp.x;
      enemy.y = wp.y;
      enemy.waypointIndex++;
    } else {
      enemy.x += (dx / dist) * speed;
      enemy.y += (dy / dist) * speed;
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

    // Slow effect tint
    if (enemy.slowTimer > 0) {
      const blueTint = 0x6688cc;
      color = blueTint;
    }

    // Body
    g.fillStyle(color, 1);
    g.fillCircle(enemy.x, enemy.y, r);
    g.lineStyle(1, 0x000000, 0.4);
    g.strokeCircle(enemy.x, enemy.y, r);

    // Direction indicator (small triangle)
    if (enemy.waypointIndex < this.waypoints.length) {
      const wp = this.waypoints[enemy.waypointIndex];
      const ang = Math.atan2(wp.y - enemy.y, wp.x - enemy.x);
      g.fillStyle(0xffffff, 0.6);
      const tx = enemy.x + Math.cos(ang) * (r + 4);
      const ty = enemy.y + Math.sin(ang) * (r + 4);
      g.fillCircle(tx, ty, 3);
    }

    // HP bar
    const barW = r * 2.2;
    const barH = 4;
    const barY = enemy.y - r - 10;
    const hpRatio = enemy.hp / enemy.maxHp;

    g.fillStyle(COLORS.HP_BAR_BG, 0.8);
    g.fillRect(enemy.x - barW / 2, barY, barW, barH);

    let barColor = COLORS.HP_BAR_FILL;
    if (hpRatio < 0.3) barColor = COLORS.HP_BAR_DANGER;
    else if (hpRatio < 0.6) barColor = COLORS.HP_BAR_WARN;
    g.fillStyle(barColor, 1);
    g.fillRect(enemy.x - barW / 2, barY, barW * hpRatio, barH);

    // Boss crown
    if (enemy.type === 'boss') {
      g.fillStyle(0xffdd00, 0.8);
      const crownY = enemy.y - r - 16;
      g.fillRect(enemy.x - 5, crownY, 10, 4);
      g.fillRect(enemy.x - 5, crownY - 3, 3, 6);
      g.fillRect(enemy.x - 1, crownY - 4, 2, 7);
      g.fillRect(enemy.x + 2, crownY - 3, 3, 6);
    }
  }

  removeEnemy(enemy) {
    if (enemy._gfx) { enemy._gfx.destroy(); enemy._gfx = null; }
    this.enemies = this.enemies.filter(e => e !== enemy);
  }

  // ---- Combat ----
  updateTower(tower, time, dt) {
    const cfg = TOWER_CONFIG[tower.type].levels[tower.level - 1];
    const cx = tower.gridCol * TILE_SIZE + TILE_SIZE / 2;
    const cy = tower.gridRow * TILE_SIZE + TILE_SIZE / 2;

    // Find target
    if (!tower.target || !tower.target.alive || this.dist(cx, cy, tower.target.x, tower.target.y) > cfg.range + 30) {
      tower.target = this.findBestTarget(cx, cy, cfg.range, tower.type);
    }

    // Attack
    if (tower.target && tower.target.alive) {
      const angle = Math.atan2(tower.target.y - cy, tower.target.x - cx);
      tower.angle = angle;

      if (time - tower.lastAttackTime >= cfg.attackSpeed) {
        tower.lastAttackTime = time;
        this.fireProjectile(tower, tower.target, cx, cy, cfg);
      }
    }
  }

  findBestTarget(cx, cy, range, towerType) {
    let best = null;
    let bestProgress = -1;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = this.dist(cx, cy, enemy.x, enemy.y);
      if (d > range) continue;

      // Priority for ice tower: target non-slowed enemies first
      if (towerType === TOWER_TYPES.ICE && enemy.slowTimer > 0) continue;

      const progress = enemy.waypointIndex + (1 - this.distToNextWaypoint(enemy));
      if (progress > bestProgress) {
        bestProgress = progress;
        best = enemy;
      }
    }
    return best;
  }

  distToNextWaypoint(enemy) {
    const wp = this.waypoints[enemy.waypointIndex];
    if (!wp) return 0;
    const dx = wp.x - enemy.x;
    const dy = wp.y - enemy.y;
    return Math.sqrt(dx * dx + dy * dy) / (TILE_SIZE * 2); // normalize
  }

  fireProjectile(tower, target, sx, sy, cfg) {
    const p = {
      type: tower.type,
      x: sx,
      y: sy,
      target,
      targetX: target.x,
      targetY: target.y,
      speed: 350,
      damage: cfg.damage,
      splash: cfg.splash || 0,
      slow: cfg.slow || 0,
      slowDuration: cfg.slowDuration || 0,
      chain: cfg.chain || 0,
      chainHit: [],
      _gfx: null,
    };
    this.projectiles.push(p);

    // Lightning: instant chain effect
    if (tower.type === TOWER_TYPES.LIGHTNING && p.chain > 0) {
      this.applyDamage(target, p.damage);
      this.chainLightning(target, p.damage, cfg.range, p.chain, [target]);
      p.hit = true;
    }
  }

  chainLightning(from, damage, range, remainingChains, hitList) {
    if (remainingChains <= 0) return;
    let next = null;
    let minDist = range;
    for (const enemy of this.enemies) {
      if (!enemy.alive || hitList.includes(enemy)) continue;
      const d = this.dist(from.x, from.y, enemy.x, enemy.y);
      if (d < minDist) {
        minDist = d;
        next = enemy;
      }
    }
    if (next) {
      const newList = [...hitList, next];
      this.applyDamage(next, damage * 0.7);
      this.showLightningArc(from, next);
      this.chainLightning(next, damage * 0.7, range, remainingChains - 1, newList);
    }
  }

  showLightningArc(from, to) {
    // Draw a lightning bolt for a brief time
    const g = this.add.graphics();
    g.lineStyle(2, 0xffff44, 0.8);
    this.drawLightningLine(g, from.x, from.y, to.x, to.y, 5);
    this.time.delayedCall(200, () => g.destroy());
  }

  drawLightningLine(g, x1, y1, x2, y2, segments) {
    const segLen = 1 / segments;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const perpAngle = angle + Math.PI / 2;
    g.beginPath();
    g.moveTo(x1, y1);
    for (let i = 1; i <= segments; i++) {
      const t = i * segLen;
      const offset = (Math.random() - 0.5) * len * 0.15;
      const px = x1 + dx * t + Math.cos(perpAngle) * offset;
      const py = y1 + dy * t + Math.sin(perpAngle) * offset;
      g.lineTo(px, py);
    }
    g.strokePath();
  }

  updateProjectile(p, dt) {
    if (p.hit) return true;

    if (!p.target || !p.target.alive) {
      // Move to last known target position
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = p.speed * (dt / 1000);

      if (dist <= speed + 5) {
        // Hit last position (no target)
        if (p.splash > 0) this.splashDamage(p.x, p.y, p.damage, p.splash);
        return true;
      }
      p.x += (dx / dist) * speed;
      p.y += (dy / dist) * speed;
      return false;
    }

    // Track target
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = p.speed * (dt / 1000);

    if (dist <= speed + 8) {
      // Hit
      this.applyDamage(p.target, p.damage);
      if (p.slow > 0) {
        p.target.slowTimer = p.slowDuration;
        p.target.slowFactor = p.slow;
      }
      if (p.splash > 0) {
        this.splashDamage(p.target.x, p.target.y, p.damage, p.splash);
      }
      return true;
    }

    p.x += (dx / dist) * speed;
    p.y += (dy / dist) * speed;
    p.targetX = p.target.x;
    p.targetY = p.target.y;
    return false;
  }

  renderProjectile(p) {
    if (!p._gfx) p._gfx = this.add.graphics();
    const g = p._gfx;
    g.clear();

    const r = 3;
    let color;
    switch (p.type) {
      case TOWER_TYPES.ARROW: color = COLORS.PROJECTILE_ARROW; break;
      case TOWER_TYPES.CANNON: color = COLORS.PROJECTILE_CANNON; break;
      case TOWER_TYPES.ICE: color = COLORS.PROJECTILE_ICE; break;
      case TOWER_TYPES.LIGHTNING: color = COLORS.PROJECTILE_LIGHTNING; break;
      default: color = 0xffffff;
    }
    g.fillStyle(color, 1);
    g.fillCircle(p.x, p.y, r);
  }

  removeProjectile(p) {
    if (p._gfx) { p._gfx.destroy(); p._gfx = null; }
    this.projectiles = this.projectiles.filter(proj => proj !== p);
  }

  applyDamage(enemy, damage) {
    if (!enemy.alive) return;
    enemy.hp -= damage;
    this.showFloatingText(damage.toFixed(0), enemy.x, enemy.y - enemy.radius - 15, '#ffff00');
    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.gold += enemy.reward;
      this.totalGoldEarned += enemy.reward;
      this.totalKills++;
      this.waveEnemiesRemaining--;
      this.score += enemy.reward * 10;
      this.showDeathEffect(enemy);
      this.removeEnemy(enemy);
      this.emitUIUpdate();
      this.checkWaveComplete();
    }
  }

  splashDamage(x, y, damage, radius) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = this.dist(x, y, enemy.x, enemy.y);
      if (d <= radius) {
        const falloff = 1 - (d / radius) * 0.5;
        this.applyDamage(enemy, damage * falloff);
      }
    }
    this.showSplashEffect(x, y, radius);
  }

  // ---- Effects ----
  showFloatingText(text, x, y, color) {
    const t = this.add.text(x, y, text, {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: color || '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: t,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => t.destroy(),
    });
  }

  showDeathEffect(enemy) {
    const g = this.add.graphics();
    const cx = enemy.x, cy = enemy.y;

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const dist = enemy.radius * 2;
      const ex = cx + Math.cos(angle) * dist;
      const ey = cy + Math.sin(angle) * dist;

      const p = this.add.circle(cx, cy, 3, enemy.color, 1);
      this.tweens.add({
        targets: p,
        x: ex, y: ey,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        onComplete: () => p.destroy(),
      });
    }
  }

  showSplashEffect(x, y, radius) {
    const g = this.add.graphics();
    g.fillStyle(0xff8800, 0.3);
    g.fillCircle(x, y, 10);
    this.tweens.add({
      targets: g,
      scaleX: radius / 10,
      scaleY: radius / 10,
      alpha: 0,
      duration: 300,
      onComplete: () => g.destroy(),
    });
  }

  // ---- Wave Management ----
  checkWaveComplete() {
    if (this.waveEnemiesRemaining <= 0 && this.waveQueue.length === 0) {
      this.state = GAME_STATES.WAVE_COMPLETE;
      // Wave reward
      const bonus = 25 + this.currentWave * 5;
      this.gold += bonus;
      this.totalGoldEarned += bonus;
      this.emitUIUpdate();

      if (this.currentWave >= this.totalWaves) {
        this.time.delayedCall(500, () => this.victory());
      }
    }
  }

  gameOver() {
    this.state = GAME_STATES.GAME_OVER;
    this.emitUIUpdate();
    this.saveProgress(false);
    this.time.delayedCall(1000, () => {
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
    const ratio = this.lives / this.levelData.initialLives;
    if (ratio >= 0.8) return 3;
    if (ratio >= 0.4) return 2;
    return 1;
  }

  saveProgress(won, stars) {
    const save = JSON.parse(localStorage.getItem('td_save') || '{}');
    save.currentLevel = this.levelId;
    save.maxLevel = Math.max(save.maxLevel || 1, won ? this.levelId + 1 : this.levelId);
    save.stars = save.stars || {};
    if (won && stars > (save.stars[this.levelId] || 0)) {
      save.stars[this.levelId] = stars;
    }
    save.lastScore = this.score;

    // Leaderboard
    save.scores = save.scores || [];
    save.scores.push({
      level: this.levelId,
      score: this.score,
      stars: won ? stars : 0,
      date: new Date().toISOString(),
    });
    save.scores.sort((a, b) => b.score - a.score);
    save.scores = save.scores.slice(0, 10);

    localStorage.setItem('td_save', JSON.stringify(save));
  }

  // ---- Update Loop ----
  update(time, delta) {
    if (this.state === GAME_STATES.PAUSED || this.state === GAME_STATES.GAME_OVER || this.state === GAME_STATES.VICTORY) return;

    const dt = Math.min(delta, 50); // Cap delta

    // Spawn queued enemies
    if (this.state === GAME_STATES.IN_WAVE && this.waveQueue.length > 0) {
      const elapsed = time - this.waveStartTime;
      while (this.waveQueue.length > 0 && this.waveQueue[0].spawnTime <= elapsed) {
        const entry = this.waveQueue.shift();
        this.spawnEnemy(entry.type);
        this.waveEnemiesSpawned++;
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      this.updateEnemy(enemy, dt);
      this.renderEnemy(enemy);
    }

    // Update towers
    for (const tower of this.towers) {
      this.renderTower(tower);
      this.updateTower(tower, time, dt);
    }

    // Update projectiles
    for (const p of this.projectiles) {
      if (this.updateProjectile(p, dt)) {
        this.removeProjectile(p);
      } else {
        this.renderProjectile(p);
      }
    }

    // Cleanup dead enemies
    this.enemies = this.enemies.filter(e => e.alive || (e._gfx && e._gfx.destroy(), false));

    // Check wave state
    if (this.state === GAME_STATES.IN_WAVE && this.waveQueue.length === 0 && this.enemies.length === 0 && this.waveEnemiesRemaining <= 0) {
      // All enemies for this wave are dead
      if (this.currentWave >= this.totalWaves) {
        if (this.state !== GAME_STATES.VICTORY) {
          this.state = GAME_STATES.WAVE_COMPLETE;
          this.emitUIUpdate();
          this.time.delayedCall(500, () => this.victory());
        }
      }
    }
  }

  // ---- UI Communication ----
  emitUIUpdate() {
    this.events.emit('uiUpdate', {
      gold: this.gold,
      lives: this.lives,
      wave: this.currentWave,
      totalWaves: this.totalWaves,
      state: this.state,
      score: this.score,
    });
  }

  // Events from UIScene
  onUIStartPlacement(type) {
    if (this.state === GAME_STATES.PAUSED) return;
    this.deselectTower();
    this.placementType = type;
  }

  onUICancelPlacement() {
    this.cancelPlacement();
  }

  onUIUpgradeTower() {
    if (!this.selectedTower) return;
    const t = this.selectedTower;
    if (t.level >= 3) return;
    const cfg = TOWER_CONFIG[t.type].levels[t.level];
    if (this.gold < cfg.upgradeCost) return;

    this.gold -= cfg.upgradeCost;
    t.level++;
    if (t._gfx) { t._gfx.destroy(); t._gfx = null; }
    this.deselectTower();
    this.selectTower(t);
    this.emitUIUpdate();
  }

  onUISellTower() {
    if (!this.selectedTower) return;
    const t = this.selectedTower;
    let totalInvested = 0;
    for (let i = 0; i < t.level; i++) {
      const lvlCfg = TOWER_CONFIG[t.type].levels[i];
      totalInvested += i === 0 ? lvlCfg.buildCost : lvlCfg.upgradeCost;
    }
    const refund = Math.floor(totalInvested * 0.6);
    this.gold += refund;

    if (t._gfx) { t._gfx.destroy(); t._gfx = null; }
    this.towers = this.towers.filter(tw => tw !== t);
    this.selectedTower = null;
    this.previewGfx.clear();
    this.emitUIUpdate();
    this.events.emit('towerDeselected');
  }

  onUIStartWave() {
    if (this.state === GAME_STATES.PREPARATION || this.state === GAME_STATES.WAVE_COMPLETE) {
      this.startWave();
    }
  }

  onUIPause() {
    if (this.state === GAME_STATES.PAUSED) {
      this.state = this._prevState || GAME_STATES.PREPARATION;
      this.emitUIUpdate();
    } else {
      this._prevState = this.state;
      this.state = GAME_STATES.PAUSED;
      this.emitUIUpdate();
    }
  }

  onUIUseSkill(skillType) {
    if (this.state === GAME_STATES.PAUSED) return;

    switch (skillType) {
      case 'meteor':
        if (this.gold < 50) return;
        this.gold -= 50;
        this.skillMeteor();
        break;
      case 'freeze':
        if (this.gold < 30) return;
        this.gold -= 30;
        this.skillFreeze();
        break;
      case 'goldRush':
        if (this.gold < 20) return;
        this.gold -= 20;
        this.skillGoldRush();
        break;
    }
    this.emitUIUpdate();
  }

  skillMeteor() {
    // Hit all enemies for 50 damage
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      this.applyDamage(enemy, 50 + this.currentWave * 10);
    }
    // Visual flash
    this.cameras.main.flash(300, 255, 200, 50);
    this.showFloatingText('陨石术!', GAME_WIDTH / 2, MAP_HEIGHT / 2, '#ff8800');
  }

  skillFreeze() {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.slowTimer = 4000;
      enemy.slowFactor = 0.3;
    }
    this.cameras.main.flash(300, 100, 180, 255);
    this.showFloatingText('冰冻术!', GAME_WIDTH / 2, MAP_HEIGHT / 2, '#88ccff');
  }

  skillGoldRush() {
    const bonus = 40 + this.currentWave * 10;
    this.gold += bonus;
    this.totalGoldEarned += bonus;
    this.score += bonus;
    this.showFloatingText(`+${bonus} 金币!`, GAME_WIDTH / 2, MAP_HEIGHT / 2, '#ffdd00');
  }

  dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
}
