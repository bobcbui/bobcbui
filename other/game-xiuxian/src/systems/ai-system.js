/* AI：单次敌人遍历（移动/攻击/血条/定位收集） */

import { COMBAT_TUNING } from '@/data/index.js';
import { bus } from '@/core/events.js';

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
      const dx = scene.player.x - en.x, dy = scene.player.y - en.y;
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
        const lbl = en.getData('label'); if (lbl) lbl.setPosition(en.x, en.y - 16);
        return;
      } else if (en.tintTopLeft === 0xbfefff) {
        en.clearTint();
      }
      const slowTimer = en.getData('slowTimer') || 0;
      if (slowTimer > 0) {
        speed *= 0.45;
        en.setData('slowTimer', Math.max(0, slowTimer - dt));
      }

      const wallY = scene.wallY || scene.worldHeight - 60;
      const wallReach = en.getData('wallReach') || 24;
      if (en.y < wallY - wallReach) {
        // 敌人沿自己的出生列直线下落，不再向玩家横向聚拢。
        en.setVelocity(0, speed);
      } else {
        en.setVelocity(0, 0);
        const wallAtkCD = en.getData('wallAtkCD') || 1.8;
        const lastWallAtk = en.getData('lastWallAtk') || 0;
        if (time - lastWallAtk >= wallAtkCD) {
          en.setData('lastWallAtk', time);
          scene.entityAnimationSystem?.playEnemyAttack(en);
          scene.damageWall(Math.max(1, Math.round((en.getData('atk') || 5) * 0.35)), en);
        }
      }

      const isBoss = en.getData('isBoss');
      if (isBoss) {
        const ultCD = en.getData('ultCD') || 8;
        const lastUlt = en.getData('lastUlt') || 0;
        if (time - lastUlt > ultCD && dist < 300) {
          const warning = en.getData('ultWarning');
          if (!warning || !warning.active) {
            en.setData('lastUlt', time);
            const w = scene.add.circle(scene.wallX, scene.wallY - 18, 40, 0xff0000, 0)
              .setDepth(25).setStrokeStyle(3, 0xff3333, 0.8);
            en.setData('ultWarning', w);
            scene.tweens.add({
              targets: w, scale: 2.5, alpha: 0.35, duration: 1000,
              onComplete: () => {
                if (w.active) w.destroy();
                en.setData('ultWarning', null);
                const dmg = Math.round((en.getData('atk') || 20) * 2);
                scene.damageWall(dmg, en);
                scene.damageFlash(0.4);
                bus.emit('status', '⚡ BOSS大招! -' + dmg, 2);
              }
            });
            bus.emit('status', '⚠️ ' + en.getData('name') + ' 蓄力中...', 1.5);
          }
        }
      }

      const lbl = en.getData('label'); if (lbl) lbl.setPosition(en.x, en.y - 16);
      const bw = en.getData('barW') || COMBAT_TUNING.hpBar.normalWidth;
      const bh = COMBAT_TUNING.hpBar.height;
      const yPos = en.y - 24;
      const cur = en.getData('hp') || 0, full = en.getData('maxHp') || 1;
      const pct = Math.max(0, Math.min(1, cur / full));
      scene.hpBarGfx.fillStyle(0x8b7752, 0.35);
      scene.hpBarGfx.fillRect(en.x - bw / 2, yPos, bw, bh);
      scene.hpBarGfx.fillStyle(pct > 0.6 ? 0x6de27a : pct > 0.3 ? 0xffd866 : 0xff6a5f, 1);
      scene.hpBarGfx.fillRect(en.x - bw / 2, yPos, Math.max(0, bw * pct), bh);
    });

    return { closestQ, activeEnemies };
  }
}
