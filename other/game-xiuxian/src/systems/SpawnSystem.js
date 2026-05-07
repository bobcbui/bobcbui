import { ZONES, BESTIARY, BOSS_NAMES } from '../data.js';
import { P } from '../state.js';

export class SpawnSystem {
  constructor(scene) {
    this.scene = scene;
  }

  spawnEnemy() {
    const { scene } = this;
    if (scene.isInSafeZone()) return null;

    const zone = scene.getCurrentZone();
    const list = BESTIARY[zone.id] || BESTIARY.village;
    const tmpl = list[Math.floor(Math.random() * list.length)];

    let x = scene.player.x + Phaser.Math.Between(-400, 400);
    let y = scene.player.y + Phaser.Math.Between(-400, 400);
    x = Phaser.Math.Clamp(x, 30, scene.worldSize - 30);
    y = Phaser.Math.Clamp(y, 30, scene.worldSize - 30);

    if (scene.isInSafeZone(x, y)) {
      const angle = Phaser.Math.Angle.Between(scene.worldSize / 2, scene.worldSize / 2, scene.player.x, scene.player.y)
        + Phaser.Math.FloatBetween(-0.9, 0.9);
      const dist = scene.safeZoneRadius + Phaser.Math.Between(120, 420);
      x = Phaser.Math.Clamp(scene.worldSize / 2 + Math.cos(angle) * dist, 30, scene.worldSize - 30);
      y = Phaser.Math.Clamp(scene.worldSize / 2 + Math.sin(angle) * dist, 30, scene.worldSize - 30);
    }

    const isElite = Math.random() < 0.08;
    const isBoss = Math.random() < 0.01 && zone.monsterLv >= 3;
    const texture = isBoss ? 'boss' : (isElite ? 'elite' : 'beast');
    const en = scene.enemies.create(x, y, texture);
    en.setCollideWorldBounds(true);
    en.setDepth(5);

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
}
