import { G, gameOver, waveActive, waveIntermission } from '../core/state.js';
import { SKILL_DEFS } from '../data/skills.js';
import { bus } from '../core/events.js';
import { getSkillCooldowns } from '../core/runtime.js';

export class SkillSystem {
  constructor(scene) {
    this.scene = scene;
  }

  tryUseSkill(skillId) {
    if (gameOver || !waveActive || waveIntermission) return;
    const cooldowns = getSkillCooldowns();
    if (cooldowns[skillId] && cooldowns[skillId] > 0) return;

    const def = SKILL_DEFS.find(s => s.id === skillId);
    if (!def) return;

    switch (skillId) {
      case 'fireball':
        this.useFireball(def);
        break;
      case 'frost':
        this.useFrost(def);
        break;
      case 'lightning':
        this.useLightning(def);
        break;
      case 'multishot':
        this.useMultishot(def);
        break;
    }

    cooldowns[skillId] = def.cooldown;
    bus.emit('skill-used', skillId);
  }

  update(dt, time) {
    const cooldowns = getSkillCooldowns();
    for (const key of Object.keys(cooldowns)) {
      if (cooldowns[key] > 0) {
        cooldowns[key] = Math.max(0, cooldowns[key] - dt);
      }
    }
  }

  useFireball(def) {
    const px = this.scene.player.x;
    const py = this.scene.player.y - 30;
    const fireball = this.scene.physics.add.sprite(px, py, 'bullet-skill');
    fireball.setDepth(8);
    fireball.setDisplaySize(14, 14);
    fireball.setTint(0xff6633);

    this.scene.physics.moveTo(fireball, px, -50, 350);

    const skillLv = G.skillLevels.fireball || 1;
    const dmgMul = def.damage + (skillLv - 1) * 0.2;

    this.scene.time.addEvent({
      delay: 100,
      repeat: 15,
      callback: () => {
        if (!fireball.active) return;
        const enemies = this.scene.enemies.getChildren().filter(e => e.active);
        for (const enemy of enemies) {
          const dist = Phaser.Math.Distance.Between(fireball.x, fireball.y, enemy.x, enemy.y);
          if (dist < 60) {
            let hp = enemy.getData('hp') - G.atk * dmgMul;
            enemy.setData('hp', hp);
            this.scene.spawnDamageText(enemy.x, enemy.y - 15, Math.floor(G.atk * dmgMul), '#ff6633');
            if (hp <= 0) {
              this.scene.combatSystem.onEnemyDeath(enemy);
            }
          }
        }
      }
    });

    this.scene.time.delayedCall(2000, () => {
      if (fireball.active) fireball.destroy();
    });
  }

  useFrost(def) {
    const skillLv = G.skillLevels.frost || 1;
    const freezeTime = def.freezeDuration + (skillLv - 1) * 0.5;
    const enemies = this.scene.enemies.getChildren().filter(e => e.active);
    for (const enemy of enemies) {
      enemy.setData('frozen', freezeTime);
      enemy.setTint(0x88ccff);
    }

    const gfx = this.scene.add.graphics();
    gfx.setDepth(15);
    gfx.fillStyle(0x88ccff, 0.15);
    gfx.fillCircle(this.scene.player.x, this.scene.player.y, 200);
    this.scene.time.delayedCall(800, () => gfx.destroy());

    bus.emit('status', '冰霜爆发！冻结 ' + enemies.length + ' 个妖兽', 1.5);
  }

  useLightning(def) {
    const skillLv = G.skillLevels.lightning || 1;
    const chainCount = def.chainCount + (skillLv - 1);
    const enemies = this.scene.enemies.getChildren()
      .filter(e => e.active)
      .sort((a, b) => {
        const dA = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, a.x, a.y);
        const dB = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, b.x, b.y);
        return dA - dB;
      });

    let prevX = this.scene.player.x;
    let prevY = this.scene.player.y;
    let hitCount = 0;

    for (const enemy of enemies) {
      if (hitCount >= chainCount) break;

      this.drawLightningLine(prevX, prevY, enemy.x, enemy.y);
      const dmg = G.atk * (def.damage + (skillLv - 1) * 0.15);
      let hp = enemy.getData('hp') - dmg;
      enemy.setData('hp', hp);
      this.scene.spawnDamageText(enemy.x, enemy.y - 15, Math.floor(dmg), '#ffff44');

      if (hp <= 0) {
        this.scene.combatSystem.onEnemyDeath(enemy);
      }

      prevX = enemy.x;
      prevY = enemy.y;
      hitCount++;
    }
  }

  useMultishot(def) {
    const skillLv = G.skillLevels.multishot || 1;
    const count = def.count + (skillLv - 1) * 2;
    this.scene.projectileSystem.fireMultiProjectiles(count);
    bus.emit('status', '多重炮击！', 1);
  }

  drawLightningLine(x1, y1, x2, y2) {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(16);
    gfx.lineStyle(3, 0xffff44, 0.9);

    const segments = 6;
    let cx = x1, cy = y1;
    gfx.beginPath();
    gfx.moveTo(cx, cy);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const tx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 30;
      const ty = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 30;
      gfx.lineTo(tx, ty);
    }
    gfx.strokePath();

    this.scene.time.delayedCall(200, () => gfx.destroy());
  }
}
