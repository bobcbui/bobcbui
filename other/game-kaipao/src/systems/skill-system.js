import { G, gameOver, levelActive, getSkillLevel } from '../core/state.js';
import { SKILL_DEFS } from '../data/skills.js';
import { bus } from '../core/events.js';
import { getSkillCooldowns } from '../core/runtime.js';

export class SkillSystem {
  constructor(scene) {
    this.scene = scene;
  }

  tryUseSkill(skillId) {
    if (gameOver || !levelActive) return;

    const cooldowns = getSkillCooldowns();
    if (cooldowns[skillId] && cooldowns[skillId] > 0) return;

    const def = SKILL_DEFS.find(s => s.id === skillId);
    if (!def) return;

    switch (skillId) {
      case 'fireball': this.useFireball(def); break;
      case 'frost': this.useFrost(def); break;
      case 'lightning': this.useLightning(def); break;
      case 'multisword': this.useMultisword(def); break;
      case 'shield': this.useShield(def); break;
      case 'heal': this.useHeal(def); break;
      case 'poison': this.usePoison(def); break;
      case 'meteor': this.useMeteor(def); break;
    }

    cooldowns[skillId] = def.cooldown;
    bus.emit('skillbar-refresh');
  }

  update(dt, time) {
    const cooldowns = getSkillCooldowns();
    for (const key of Object.keys(cooldowns)) {
      if (cooldowns[key] > 0) {
        cooldowns[key] = Math.max(0, cooldowns[key] - dt);
      }
    }
  }

  updateAllCooldowns(dt) {
    this.update(dt, 0);
  }

  useFireball(def) {
    const px = this.scene.player.x;
    const py = this.scene.player.y - 30;
    const fb = this.scene.add.circle(px, py, 10, 0xff6633, 0.9).setDepth(15);
    const lv = getSkillLevel('fireball');
    const dmgMul = 1.5 + (lv - 1) * 0.3;

    this.scene.tweens.add({ targets: fb, y: -50, duration: 1200, onUpdate: () => {
      fb.setPosition(fb.x, fb.y);
      const enemies = this.scene.enemies.getChildren().filter(e => e.active);
      for (const enemy of enemies) {
        const dist = Phaser.Math.Distance.Between(fb.x, fb.y, enemy.x, enemy.y);
        if (dist < 70) {
          let hp = enemy.getData('hp') - G.atk * dmgMul;
          enemy.setData('hp', hp);
          this.scene.spawnDamageText(enemy.x, enemy.y - 10, Math.floor(G.atk * dmgMul), '#ff6633');
          if (hp <= 0) this.scene.combatSystem.onEnemyDeath(enemy);
        }
      }
    }, onComplete: () => fb.destroy() });
    bus.emit('status', '火球术！', 1.5);
  }

  useFrost(def) {
    const lv = getSkillLevel('frost');
    const freezeTime = 3 + (lv - 1) * 0.8;
    const enemies = this.scene.enemies.getChildren().filter(e => e.active);
    for (const enemy of enemies) {
      enemy.setData('frozen', freezeTime);
      enemy.setTint(0x88ccff);
    }
    const flash = this.scene.add.circle(this.scene.player.x, this.scene.player.y, 180, 0x88ccff, 0.15).setDepth(15);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration: 800, onComplete: () => flash.destroy() });
    bus.emit('status', '冰霜爆发！', 1.5);
  }

  useLightning(def) {
    const lv = getSkillLevel('lightning');
    const chain = 5 + (lv - 1) * 2;
    const enemies = this.scene.enemies.getChildren().filter(e => e.active)
      .sort((a, b) => {
        const dA = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, a.x, a.y);
        const dB = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, b.x, b.y);
        return dA - dB;
      });

    let prevX = this.scene.player.x, prevY = this.scene.player.y, hit = 0;
    for (const enemy of enemies) {
      if (hit >= chain) break;
      this.scene._drawLightning(prevX, prevY, enemy.x, enemy.y);
      const dmg = G.atk * (1 + (lv - 1) * 0.2);
      let hp = enemy.getData('hp') - dmg;
      enemy.setData('hp', hp);
      this.scene.spawnDamageText(enemy.x, enemy.y - 10, Math.floor(dmg), '#ffff44');
      if (hp <= 0) this.scene.combatSystem.onEnemyDeath(enemy);
      prevX = enemy.x; prevY = enemy.y; hit++;
    }
    bus.emit('status', '雷击术！', 1.5);
  }

  useMultisword(def) {
    const lv = getSkillLevel('multisword');
    const count = 6 + (lv - 1) * 3;
    this.scene.projectileSystem.fireMultiSwords(count);
    bus.emit('status', '万剑诀！', 1.5);
  }

  useShield(def) {
    const lv = getSkillLevel('shield');
    const shieldHp = 30 + (lv - 1) * 15;
    this.scene._shieldHP = (this.scene._shieldHP || 0) + shieldHp;
    const circle = this.scene.add.circle(this.scene.player.x, this.scene.player.y, 28, 0x4488ff, 0.3).setDepth(9);
    this.scene.tweens.add({ targets: circle, alpha: 0, duration: 1000, onComplete: () => circle.destroy() });
    bus.emit('status', '护盾 +' + shieldHp, 1.5);
  }

  useHeal(def) {
    const lv = getSkillLevel('heal');
    const healAmount = 25 + (lv - 1) * 10;
    G.hp = Math.min(G.maxHp, G.hp + healAmount);
    this.scene.spawnDamageText(this.scene.player.x, this.scene.player.y - 20, '+' + healAmount + '💚', '#44ff44');
    bus.emit('status', '回春术 +' + healAmount, 1.5);
  }

  usePoison(def) {
    const lv = getSkillLevel('poison');
    const duration = 5 + (lv - 1) * 2;
    const dmgPerSec = 2 + lv * 1.5;
    const circle = this.scene.add.circle(this.scene.player.x, this.scene.player.y - 100, 120, 0x44aa44, 0.12).setDepth(6);
    const startTime = this.scene.time.now;
    this.scene.time.addEvent({ delay: 500, repeat: Math.floor(duration / 0.5), callback: () => {
      if (!circle.active) return;
      circle.setPosition(this.scene.player.x, this.scene.player.y - 100);
      const enemies = this.scene.enemies.getChildren().filter(e => e.active);
      for (const enemy of enemies) {
        const dist = Phaser.Math.Distance.Between(circle.x, circle.y, enemy.x, enemy.y);
        if (dist < 120) {
          let hp = enemy.getData('hp') - dmgPerSec * 0.5;
          enemy.setData('hp', hp);
          if (hp <= 0) this.scene.combatSystem.onEnemyDeath(enemy);
        }
      }
      if (this.scene.time.now - startTime > duration * 1000) circle.destroy();
    }});
    bus.emit('status', '毒雾术！', 1.5);
  }

  useMeteor(def) {
    const lv = getSkillLevel('meteor');
    const dmg = G.atk * (3 + (lv - 1) * 0.5);
    const centerX = this.scene.player.x + Phaser.Math.Between(-80, 80);
    const centerY = this.scene.player.y - 180;

    const indicator = this.scene.add.sprite(centerX, centerY, 'aoe').setDepth(14).setAlpha(0.6);
    this.scene.tweens.add({ targets: indicator, scale: 1.3, alpha: 1, duration: 600, yoyo: true, onComplete: () => {
      const enemies = this.scene.enemies.getChildren().filter(e => e.active);
      for (const enemy of enemies) {
        const dist = Phaser.Math.Distance.Between(indicator.x, indicator.y, enemy.x, enemy.y);
        if (dist < 70) {
          let hp = enemy.getData('hp') - dmg;
          enemy.setData('hp', hp);
          this.scene.spawnDamageText(enemy.x, enemy.y - 10, Math.floor(dmg), '#ff8800');
          if (hp <= 0) this.scene.combatSystem.onEnemyDeath(enemy);
        }
      }
      const boom = this.scene.add.circle(centerX, centerY, 60, 0xff8800, 0.5).setDepth(14);
      this.scene.tweens.add({ targets: boom, scale: 1.5, alpha: 0, duration: 400, onComplete: () => { boom.destroy(); indicator.destroy(); }});
    }});
    bus.emit('status', '陨石术！', 1.5);
  }
}
