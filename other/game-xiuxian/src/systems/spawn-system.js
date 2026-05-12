import { currentWave, P } from '../core/state.js';
import { WORLD, LANES, LANE_WIDTH, COMBAT_TUNING, getEnemyTemplateByWave, getEnemyTexture, BOSS_NAMES } from '../data/index.js';

export class SpawnSystem {
  constructor(scene) {
    this.scene = scene;
    this.spawnedInWave = 0;
  }

  update(dt) {
  }

  spawnEnemy(options = {}) {
    const { scene } = this;
    const wave = currentWave || 1;
    console.log('[SpawnSystem] spawnEnemy called for wave', wave, options);
    const tmpl = getEnemyTemplateByWave(wave);

    const { forceBoss = false, forceElite = false, allowBoss = true, allowElite = true } = options;

    const { x, y } = this.pickSpawnPoint();

    const isBoss = forceBoss || (allowBoss && wave % 5 === 0 && Math.random() < 0.08 && wave >= 4);
    const isElite = !isBoss && (forceElite || (allowElite && Math.random() < 0.1));

    const texture = isBoss ? 'monster-boss' : getEnemyTexture(tmpl);

    const en = scene.enemies.create(x, y, texture);
    en.setCollideWorldBounds(true);
    en.setDepth(5);

    if (isElite) {
      en.setTint(0xffdf88);
      en.setScale(1.2);
    }
    en.setData('baseScale', isElite ? 1.2 : 1);
    en.setData('animSeed', Math.random() * Math.PI * 2);

    const waveMult = 1 + (wave - 1) * 0.18;
    const lvMult = 1 + (P.level - 1) * 0.06;
    const scale = waveMult * lvMult;

    const hpTier = isBoss ? COMBAT_TUNING.enemyHpTierMult.boss : (isElite ? COMBAT_TUNING.enemyHpTierMult.elite : COMBAT_TUNING.enemyHpTierMult.normal);
    const maxHp = Math.round(tmpl.hp * scale * COMBAT_TUNING.enemyHpScale / 190 * hpTier);

    en.setData('hp', maxHp);
    en.setData('maxHp', maxHp);
    en.setData('atk', Math.round(tmpl.atk * scale * (isBoss ? 3 : (isElite ? 1.6 : 1))));
    en.setData('speed', Math.round(tmpl.speed * (isBoss ? 0.55 : (isElite ? 0.75 : 1))));
    en.setData('xp', Math.round(tmpl.xp * lvMult * waveMult * (isBoss ? 6 : (isElite ? 2.5 : 1))));
    en.setData('gold', Math.round(tmpl.gold * lvMult * waveMult * (isBoss ? 8 : (isElite ? 3 : 1))));
    en.setData('waveLv', wave);
    en.setData('isBoss', !!isBoss);
    en.setData('isElite', !!isElite);

    const enName = isBoss ? BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]
      : (isElite ? ('精英·' + tmpl.name) : tmpl.name);
    console.log('[SpawnSystem] enemy created:', enName, 'at', x, y, 'isBoss=', isBoss, 'isElite=', isElite);
    en.setData('name', enName);
    en.setData('dead', false);

    const labelColor = isBoss ? '#ff8c00' : (isElite ? '#2f8f88' : '#5d6f54');
    const lbl = scene.add.text(x, y - 14, enName, {
      fontSize: '11px',
      fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
      color: labelColor,
      stroke: '#fff4cf',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(15);
    en.setData('label', lbl);

    en.setData('barW', isBoss ? COMBAT_TUNING.hpBar.bossWidth : COMBAT_TUNING.hpBar.normalWidth);
    en.setData('atkType', tmpl.atkType || 'melee');
    en.setData('atkRange', tmpl.atkRange || 200);
    en.setData('atkCD', tmpl.atkCD || 2.5);
    en.setData('projColor', tmpl.projColor || 0xff4444);
    en.setData('lastRangedAtk', 0);
    en.setData('ultCD', isBoss ? 7 : 99);
    en.setData('lastUlt', 0);
    en.setData('ultWarning', null);

    return en;
  }

  pickSpawnPoint() {
    const lane = Phaser.Math.Between(0, LANES - 1);
    const laneCenter = lane * LANE_WIDTH + LANE_WIDTH / 2;
    const x = Phaser.Math.Clamp(laneCenter + Phaser.Math.Between(-LANE_WIDTH * 0.3, LANE_WIDTH * 0.3), 20, WORLD.width - 20);
    const y = Phaser.Math.Between(10, 60);
    return { x, y };
  }
}
