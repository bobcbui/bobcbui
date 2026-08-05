/* 刷怪：按关卡波次从顶部生成敌人（普通/精英/Boss），属性随关卡等级缩放 */

import { BESTIARY, BOSS_NAMES, COMBAT_TUNING, PROGRESSION, WORLD } from '@/data/index.js';
import { P } from '@/core/state.js';

const TEXTURES = [
  'monster-rabbit', 'monster-wolf', 'monster-spider', 'monster-wolf', 'monster-golem',
  'monster-ice-spirit', 'monster-fire-demon', 'monster-shadow', 'monster-sword-spirit', 'monster-thunder-beast'
];

function getEnemyMaxHp(tmpl, scale, isBoss, isElite) {
  const tierMult = isBoss
    ? COMBAT_TUNING.enemyHpTierMult.boss
    : (isElite ? COMBAT_TUNING.enemyHpTierMult.elite : COMBAT_TUNING.enemyHpTierMult.normal);
  return Math.round(tmpl.hp * scale * COMBAT_TUNING.enemyHpScale * tierMult);
}

export class SpawnSystem {
  constructor(scene) {
    this.scene = scene;
  }

  /** 生成一波敌人；最后一波为 Boss 波 */
  spawnWave(wn, stageLevel) {
    const count = PROGRESSION.waveCountBase
      + stageLevel * PROGRESSION.waveCountPerStage
      + wn * PROGRESSION.waveCountPerWave;
    const isBossWave = wn >= PROGRESSION.wavesPerStage;
    for (let i = 0; i < count; i++) {
      this.spawnEnemy({ allowBoss: false });
    }
    if (isBossWave) {
      const boss = this.spawnEnemy({ forceBoss: true, allowBoss: false, allowElite: false });
      if (boss) {
        boss.setData('atk', Math.round((boss.getData('atk') || 1) * 2));
        boss.setData('xp', Math.round((boss.getData('xp') || 1) * 5));
      }
    }
  }

  spawnEnemy(options = {}) {
    const { scene } = this;
    const tmpl = BESTIARY[Math.floor(Math.random() * BESTIARY.length)];
    const { forceBoss = false, forceElite = false, allowBoss = true, allowElite = true } = options;

    // 从顶部生成（单屏战场，全部可见）
    const x = Phaser.Math.Between(60, WORLD.width - 60);
    const y = Phaser.Math.Between(-40, 100);

    const isBoss = forceBoss || (allowBoss && Math.random() < 0.01);
    const isElite = !isBoss && (forceElite || (allowElite && Math.random() < 0.08));
    const texture = isBoss ? 'monster-boss' : this.getMonsterTexture(tmpl);
    const en = scene.enemies.create(x, y, texture);
    en.setCollideWorldBounds(true);
    en.setDepth(5);
    if (isElite) {
      en.setTint(0xffdf88);
      en.setScale(1.16);
    }
    en.setData('baseScale', isElite ? 1.16 : 1);

    // 关卡等级缩放
    const stageScale = 1 + (P.stageLevel - 1) * PROGRESSION.enemyScalePerStage;
    const plvMult = 1 + (P.level - 1) * 0.05;
    const scale = stageScale * plvMult;
    const maxHp = getEnemyMaxHp(tmpl, scale, isBoss, isElite);

    en.setData('hp', maxHp);
    en.setData('maxHp', maxHp);
    en.setData('atk', Math.round(tmpl.atk * scale * (isBoss ? 3 : (isElite ? 1.5 : 1))));
    en.setData('speed', Math.round(tmpl.speed * (isBoss ? 0.6 : (isElite ? 0.8 : 1))));
    en.setData('xp', Math.round(tmpl.xp * scale * (isBoss ? 6 : (isElite ? 2 : 1))));
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

  getMonsterTexture(tmpl) {
    const idx = Math.max(0, BESTIARY.indexOf(tmpl));
    return TEXTURES[idx % TEXTURES.length] || 'monster-wolf';
  }
}
