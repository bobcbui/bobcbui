import { ZONES, BESTIARY, BOSS_NAMES, WORLD } from '../data/index.js';
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

export class SpawnSystem {
  constructor(scene) {
    this.scene = scene;
  }

  spawnEnemy() {
    const { scene } = this;
    const zone = scene.getCurrentZone();
    const list = BESTIARY[zone.id];
    if (!list || list.length === 0) return null;
    const tmpl = list[Math.floor(Math.random() * list.length)];

    const sz = scene.worldSize;
    let x = scene.player.x + Phaser.Math.Between(-400, 400);
    let y = scene.player.y + Phaser.Math.Between(-400, 400);
    x = Phaser.Math.Clamp(x, 30, sz - 30);
    y = Phaser.Math.Clamp(y, 30, sz - 30);

    const r = WORLD.safeRadius + 40;
    const cx = sz / 2, cy = sz / 2;
    if (Math.abs(x-cx)<=r && Math.abs(y-cy)<=r) {
      const angle = Math.atan2(y-cy, x-cx) + Phaser.Math.FloatBetween(-0.5, 0.5);
      const dist = r + Phaser.Math.Between(60, 300);
      x = Phaser.Math.Clamp(cx + Math.cos(angle) * dist, 30, sz - 30);
      y = Phaser.Math.Clamp(cy + Math.sin(angle) * dist, 30, sz - 30);
    }

    const isElite = Math.random() < 0.08;
    const isBoss = Math.random() < 0.01 && zone.monsterLv >= 3;
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

    en.setData('hp', Math.round(tmpl.hp * scale * (isBoss ? 4 : (isElite ? 1.8 : 1))));
    en.setData('maxHp', Math.round(tmpl.hp * scale * (isBoss ? 4 : (isElite ? 1.8 : 1))));
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

    en.setData('barW', isBoss ? 32 : 24);
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

  getMonsterTexture(zone, list, tmpl) {
    const options = MONSTER_TEXTURES[zone.id] || ['monster-wolf'];
    const idx = Math.max(0, list.indexOf(tmpl));
    return options[idx % options.length];
  }
}
