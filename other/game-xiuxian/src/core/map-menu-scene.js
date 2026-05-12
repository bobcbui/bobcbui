import { WORLD, LEVELS, getRealmIndex } from '../data/index.js';
import { P, recalcStats, realmText } from './state.js';
import { setScene } from './runtime.js';
import { loadGame } from './save.js';
import { hotbarRender } from '../ui/index.js';

export class MapMenuScene extends Phaser.Scene {
  constructor(){ super({key:'MapMenu'}); }

  create(){
    setScene(this);
    this.worldWidth = WORLD.width;
    this.worldHeight = WORLD.height;
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 0;

    loadGame();
    recalcStats();

    this.drawMapBackground();
    this.drawLevelNodes();
    this.drawPlayerInfo();
    hotbarRender();
  }

  drawMapBackground(){
    const g = this.add.graphics();
    const w = this.worldWidth;
    const h = this.worldHeight;

    g.fillStyle(0x1a0a00, 1);
    g.fillRect(0, 0, w, h);

    for (let i = 0; i < 60; i++) {
      const sx = Phaser.Math.Between(0, w);
      const sy = Phaser.Math.Between(0, h);
      g.fillStyle(0xffffff, 0.03 + Math.random() * 0.04);
      g.fillCircle(sx, sy, Phaser.Math.Between(1, 2));
    }

    g.lineStyle(4, 0xffd700, 0.3);
    g.beginPath();
    g.moveTo(w * 0.5, h * 0.96);
    for (let i = 0; i < LEVELS.length + 1; i++) {
      const t = i / LEVELS.length;
      const y = h * 0.92 - t * h * 0.82;
      const x = w * 0.5 + Math.sin(t * Math.PI * 3) * 30;
      g.lineTo(x, y);
    }
    g.strokePath();
  }

  drawLevelNodes(){
    LEVELS.forEach((lv, idx) => {
      const px = this.worldWidth * lv.x;
      const py = this.worldHeight * lv.y;
      const playerRealmIdx = getRealmIndex(P.realm);
      const reqRealmIdx = getRealmIndex(lv.realmReq);
      const unlocked = playerRealmIdx >= reqRealmIdx;
      const completed = P.maxWave >= (lv.startWave + lv.waves - 2);
      const curWave = lv.startWave;

      const r = 22;
      const g = this.add.graphics();

      if (completed) {
        g.fillStyle(0xffd700, 0.25);
        g.fillCircle(px, py, r + 6);
      }

      if (unlocked) {
        g.fillStyle(completed ? 0x66dd88 : 0xf7d98e, 0.8);
        g.fillCircle(px, py, r);
        g.lineStyle(2, completed ? 0x44aa66 : 0xb57a19, 1);
        g.strokeCircle(px, py, r);

        const txt = this.add.text(px, py, lv.icon, {
          fontSize: '18px'
        }).setOrigin(0.5).setDepth(10);

        const label = this.add.text(px, py + r + 12, lv.name, {
          fontSize: '11px',
          fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
          color: '#f7d98e',
          stroke: '#000',
          strokeThickness: 2
        }).setOrigin(0.5, 0).setDepth(10);

        const hitArea = this.add.circle(px, py, r + 8, 0xffffff, 0)
          .setDepth(9).setInteractive({ useHandCursor: true });
        hitArea.on('pointerover', () => {
          g.clear();
          g.fillStyle(completed ? 0x88ffaa : 0xfff4cc, 0.45);
          g.fillCircle(px, py, r + 6);
          g.fillStyle(completed ? 0x66dd88 : 0xf7d98e, 0.9);
          g.fillCircle(px, py, r + 2);
          g.lineStyle(2, completed ? 0x44aa66 : 0xb57a19, 1);
          g.strokeCircle(px, py, r + 2);
        });
        hitArea.on('pointerout', () => {
          g.clear();
          if (completed) {
            g.fillStyle(0xffd700, 0.25);
            g.fillCircle(px, py, r + 6);
          }
          g.fillStyle(completed ? 0x66dd88 : 0xf7d98e, 0.8);
          g.fillCircle(px, py, r);
          g.lineStyle(2, completed ? 0x44aa66 : 0xb57a19, 1);
          g.strokeCircle(px, py, r);
        });
        hitArea.on('pointerdown', () => {
          this.scene.start('Battle', { levelId: lv.id, startWave: lv.startWave, waveCount: lv.waves });
        });
      } else {
        g.fillStyle(0x555555, 0.5);
        g.fillCircle(px, py, r);
        g.lineStyle(2, 0x444444, 0.6);
        g.strokeCircle(px, py, r);
        const lockIcon = this.add.text(px, py, '🔒', {
          fontSize: '14px'
        }).setOrigin(0.5).setDepth(10);
        const label = this.add.text(px, py + r + 12, lv.name, {
          fontSize: '11px',
          fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
          color: '#666',
          stroke: '#000',
          strokeThickness: 2
        }).setOrigin(0.5, 0).setDepth(10);
      }
    });
  }

  drawPlayerInfo(){
    const topY = 12;
    const infoText = realmText() + ' · Lv.' + P.level;
    this.add.text(this.worldWidth / 2, topY, infoText, {
      fontSize: '14px',
      fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 2
    }).setOrigin(0.5, 0).setDepth(20);

    this.add.text(this.worldWidth / 2, topY + 22, '灵石 ' + P.gold + ' · 杀敌 ' + P.kills, {
      fontSize: '11px',
      fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
      color: '#b57a19',
      stroke: '#000',
      strokeThickness: 1
    }).setOrigin(0.5, 0).setDepth(20);
  }
}
