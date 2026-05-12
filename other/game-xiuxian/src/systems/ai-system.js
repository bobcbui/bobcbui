import { P } from '../core/state.js';
import { COMBAT_TUNING } from '../data/index.js';
import { bus } from '../core/events.js';

export class AISystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt, time, qRange, qR2) {
    const { scene } = this;
    scene.hpBarGfx.clear();

    let closestQ = null, bestQD2 = Infinity;
    const activeEnemies = [];

    scene.enemies.children.iterate((en) => {
      if (!en || en.getData('dead')) return;

      const dx = scene.player.x - en.x;
      const dy = scene.player.y - en.y;
      const d2 = dx * dx + dy * dy;

      if (d2 < qR2 && d2 < bestQD2) { bestQD2 = d2; closestQ = en; }
      activeEnemies.push(en);

      const atkType = en.getData('atkType') || 'melee';
      const dist = Math.sqrt(d2);
      let speed = en.getData('speed') || 30;

      const freezeTimer = en.getData('freezeTimer') || 0;
      if (freezeTimer > 0) {
        en.setData('freezeTimer', Math.max(0, freezeTimer - dt));
        en.setVelocity(0, 0);
        en.setTint(0xbfefff);
        const lbl = en.getData('label'); if (lbl) lbl.setPosition(en.x, en.y - 14);
        return;
      } else if (en.tintTopLeft === 0xbfefff) {
        en.clearTint();
      }

      const slowTimer = en.getData('slowTimer') || 0;
      if (slowTimer > 0) {
        speed *= 0.45;
        en.setData('slowTimer', Math.max(0, slowTimer - dt));
      }

      if (atkType === 'ranged') {
        const atkRange = en.getData('atkRange') || 200;
        const atkCD = en.getData('atkCD') || 2.5;
        const lastAtk = en.getData('lastRangedAtk') || 0;

        if (dist < atkRange && time - lastAtk > atkCD) {
          en.setData('lastRangedAtk', time);
          scene.entityAnimationSystem?.playEnemyAttack(en);

          const proj = scene.getPooledProj(en.x, en.y, 'arrow', scene.enemyProjs);
          if (proj) {
            proj.setScale(0.7).setTint(en.getData('projColor') || 0xff4444);
            const angle = Phaser.Math.Angle.Between(en.x, en.y, scene.player.x, scene.player.y);
            scene.physics.velocityFromRotation(angle, 250, proj.body.velocity);
            proj.rotation = angle;
            proj.setData('damage', Math.round((en.getData('atk') || 5) * 0.5));
            scene.scheduleProjFree(proj, 2000);
          }
          en.setVelocity(0, speed * 0.1);
        } else if (dist < atkRange) {
          en.setVelocity(0, speed * 0.15);
        } else {
          en.setVelocity(0, speed);
        }
      } else {
        en.setVelocity(0, speed);
      }

      const isBoss = en.getData('isBoss');
      if (isBoss && dist < 350) {
        const ultCD = en.getData('ultCD') || 8;
        const lastUlt = en.getData('lastUlt') || 0;
        if (time - lastUlt > ultCD) {
          const warning = en.getData('ultWarning');
          if (!warning || !warning.active) {
            en.setData('lastUlt', time);
            const w = scene.add.circle(scene.player.x, scene.player.y, 40, 0xff0000, 0)
              .setDepth(25).setStrokeStyle(3, 0xff3333, 0.8);
            en.setData('ultWarning', w);
            scene.tweens.add({
              targets: w, scale: 2.5, alpha: 0.35, duration: 1000,
              onComplete: () => {
                if (w.active) w.destroy();
                en.setData('ultWarning', null);
                const dmg = Math.round((en.getData('atk') || 20) * 2 * (1 - P.buff.shieldPct));
                P.hp = Math.max(0, P.hp - dmg);
                scene.damageFlash(0.4);
                bus.emit('status', '⚡ BOSS大招! -' + dmg, 2);
              }
            });
            bus.emit('status', '⚠️ ' + en.getData('name') + ' 蓄力中...', 1.5);
          }
        }
      }

      const lbl = en.getData('label');
      if (lbl) lbl.setPosition(en.x, en.y - 14);

      const bw = en.getData('barW') || COMBAT_TUNING.hpBar.normalWidth;
      const bh = COMBAT_TUNING.hpBar.height;
      const yPos = en.y - 24;
      const cur = en.getData('hp') || 0, full = en.getData('maxHp') || 1;
      const pct = Math.max(0, Math.min(1, cur / full));
      scene.hpBarGfx.fillStyle(0x8b7752, 0.35);
      scene.hpBarGfx.fillRect(en.x - bw / 2, yPos, bw, bh);
      const hpColor = pct > 0.6 ? 0x6de27a : pct > 0.3 ? 0xffd866 : 0xff6a5f;
      scene.hpBarGfx.fillStyle(hpColor, 1);
      scene.hpBarGfx.fillRect(en.x - bw / 2, yPos, Math.max(0, bw * pct), bh);
    });

    return { closestQ, activeEnemies };
  }
}
