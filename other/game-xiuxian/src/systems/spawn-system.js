import { ZONES, BESTIARY, BOSS_NAMES, WORLD, COMBAT_TUNING } from '../data/index.js';
import { P } from '../core/state.js';

const MONSTER_TEXTURES = {
  hehuan: ['monster-rabbit', 'monster-wolf', 'monster-spider'],
  yaoshou: ['monster-wolf', 'monster-golem', 'monster-spider'],
  xueshan: ['monster-wolf', 'monster-ice-spirit', 'monster-golem'],
  huoyan: ['monster-fire-demon', 'monster-serpent', 'monster-golem'],
  shenyuan: ['monster-shadow', 'monster-fire-demon', 'monster-ghost'],
  wanjian: ['monster-sword-spirit', 'monster-sword-golem', 'monster-sword-spirit'],
  youming: ['monster-ghost', 'monster-serpent', 'monster-shadow'],
  jiutian: ['monster-thunder-beast', 'monster-thunder-spirit', 'monster-dragon']
};

function getEnemyMaxHp(tmpl, scale, isBoss, isElite) {
  const tierMult = isBoss
    ? COMBAT_TUNING.enemyHpTierMult.boss
    : (isElite ? COMBAT_TUNING.enemyHpTierMult.elite : COMBAT_TUNING.enemyHpTierMult.normal);
  return Math.round(tmpl.hp * scale * COMBAT_TUNING.enemyHpScale * tierMult);
}

export class SpawnSystem {
  constructor(scene) {
    this.scene = scene;
    this.spawnTimer = 0;
  }

  update(dt) {
    const { scene } = this;
    if (scene._inSafeZone()) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    const active = scene.enemies.countActive(true);
    const target = COMBAT_TUNING.maxActiveEnemies;
    if (active < target) {
      const batch = Math.min(target - active, active === 0 ? 2 : 1);
      for (let i = 0; i < batch; i++) this.spawnEnemy();
      this.spawnTimer = active === 0 ? COMBAT_TUNING.spawnInterval.empty : COMBAT_TUNING.spawnInterval.refill;
    } else {
      this.spawnTimer = COMBAT_TUNING.spawnInterval.capped;
    }
  }

  spawnEnemy(options = {}) {
    const { scene } = this;
    const zone = scene.getCurrentZone();
    const list = BESTIARY[zone.id];
    if (!list || list.length === 0) return null;
    const tmpl = list[Math.floor(Math.random() * list.length)];
    const { forceBoss = false, forceElite = false, allowBoss = true, allowElite = true } = options;

    const sz = scene.worldSize;
    let { x, y } = this.pickSpawnPoint();

    const r = WORLD.safeRadius + 40;
    const cx = sz / 2, cy = sz / 2;
    if (Math.abs(x-cx)<=r && Math.abs(y-cy)<=r) {
      const angle = Math.atan2(y-cy, x-cx) + Phaser.Math.FloatBetween(-0.5, 0.5);
      const dist = r + Phaser.Math.Between(60, 300);
      x = Phaser.Math.Clamp(cx + Math.cos(angle) * dist, 30, sz - 30);
      y = Phaser.Math.Clamp(cy + Math.sin(angle) * dist, 30, sz - 30);
    }

    const isBoss = forceBoss || (allowBoss && Math.random() < 0.01 && zone.monsterLv >= 3);
    const isElite = !isBoss && (forceElite || (allowElite && Math.random() < 0.08));
    const texture = isBoss ? 'monster-boss' : this.getMonsterTexture(zone, list, tmpl);
    const en = scene.enemies.create(x, y, texture);
    en.setCollideWorldBounds(true);
    en.setDepth(5);
    if (isElite) {
      en.setTint(0xffdf88);
      en.setScale(1.16);
    }
    en.setData('baseScale', isElite ? 1.16 : 1);
    en.setData('animSeed', Math.random() * Math.PI * 2);

    const lvMult = 1 + (zone.monsterLv - 1) * 0.3;
    const plvMult = 1 + (P.level - 1) * 0.08;
    const scale = lvMult * plvMult;
    const maxHp = getEnemyMaxHp(tmpl, scale, isBoss, isElite);

    en.setData('hp', maxHp);
    en.setData('maxHp', maxHp);
    en.setData('atk', Math.round(tmpl.atk * scale * (isBoss ? 3 : (isElite ? 1.5 : 1))));
    en.setData('speed', Math.round(tmpl.speed * (isBoss ? 0.6 : (isElite ? 0.8 : 1))));
    en.setData('xp', Math.round(tmpl.xp * lvMult * plvMult * (isBoss ? 5 : (isElite ? 2 : 1))));
    en.setData('gold', Math.round(tmpl.gold * lvMult * plvMult * (isBoss ? 6 : (isElite ? 2 : 1))));
    en.setData('zoneLv', zone.monsterLv);
    en.setData('isBoss', !!isBoss);
    en.setData('isElite', !!isElite);

    const enName = isBoss ? BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]
      : (isElite ? ('精英·' + tmpl.name) : tmpl.name);
    en.setData('name', enName);
    en.setData('dead', false);

    const lbl = scene.add.text(x, y - 16, enName, {
      fontSize: '11px',
      fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
      color: isBoss ? '#a86f18' : (isElite ? '#2f8f88' : '#5d6f54'),
      stroke: '#fff4cf',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(15);
    en.setData('label', lbl);

    en.setData('barW', isBoss ? COMBAT_TUNING.hpBar.bossWidth : COMBAT_TUNING.hpBar.normalWidth);
    en.setData('atkType', tmpl.atkType || 'melee');
    en.setData('atkRange', tmpl.atkRange || 150);
    en.setData('atkCD', tmpl.atkCD || 2);
    en.setData('projColor', tmpl.projColor || 0xff4444);
    en.setData('lastRangedAtk', 0);
    en.setData('ultCD', isBoss ? 6 : 99);
    en.setData('lastUlt', 0);
    en.setData('ultWarning', null);

    return en;
  }

  pickSpawnPoint() {
    const { scene } = this;
    const sz = scene.worldSize;
    const cam = scene.cameras.main;
    const margin = 80;
    const minDist = 360;
    const maxDist = 700;

    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(minDist, maxDist);
      const x = Phaser.Math.Clamp(scene.player.x + Math.cos(angle) * dist, 30, sz - 30);
      const y = Phaser.Math.Clamp(scene.player.y + Math.sin(angle) * dist, 30, sz - 30);
      const visible = x > cam.worldView.left - margin && x < cam.worldView.right + margin &&
        y > cam.worldView.top - margin && y < cam.worldView.bottom + margin;
      if (!visible || i > 8) return { x, y };
    }

    const side = Phaser.Math.Between(0, 3);
    const view = cam.worldView;
    const x = side === 0 ? view.left - margin : side === 1 ? view.right + margin : Phaser.Math.Between(view.left, view.right);
    const y = side === 2 ? view.top - margin : side === 3 ? view.bottom + margin : Phaser.Math.Between(view.top, view.bottom);
    return {
      x: Phaser.Math.Clamp(x, 30, sz - 30),
      y: Phaser.Math.Clamp(y, 30, sz - 30)
    };
  }

  getMonsterTexture(zone, list, tmpl) {
    const options = MONSTER_TEXTURES[zone.id] || ['monster-wolf'];
    const idx = Math.max(0, list.indexOf(tmpl));
    return options[idx % options.length];
  }
}
