import { P } from '../core/state.js';
import { bus } from '../core/events.js';
import { getRealmIndex } from '../data/index.js';

const AURA_COLORS = [
  0x6de27a,
  0x66ffcc,
  0x88ccff,
  0xffd700,
  0xcc66ff,
  0xff8866,
  0xaa44ff,
  0xffffff,
  0xffdd00
];

export class PlayerStatusSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt) {
    const inSafe = this.updateSafeZone();
    this.updateRecovery(dt, inSafe);
    this.updateAura();
    return { inSafe };
  }

  updateSafeZone() {
    const { scene } = this;
    const inSafe = scene._inSafeZone();

    if (inSafe && !scene._wasInSafe) {
      scene._wasInSafe = true;
      if (scene.defenseSystem) scene.defenseSystem.waitingWave = false;
      scene.clearEnemies();
      scene.showWorldNotice('进入安全区', '#dfffd8');
      bus.emit('status', '已进入安全区', 1.2);
    } else if (!inSafe && scene._wasInSafe) {
      scene._wasInSafe = false;
      scene.showWorldNotice('离开安全区', '#ffd866');
      bus.emit('status', '已离开安全区', 1.2);
    }

    if (inSafe && scene.enemies.countActive(true) > 0) {
      scene.clearEnemies();
    }
    return inSafe;
  }

  updateRecovery(dt, inSafe) {
    const { scene } = this;
    if (scene.playerDead || P.hp >= P.maxHp) return;
    const noEnemies = scene.enemies.countActive(true) === 0;
    if (!inSafe && !noEnemies) return;
    const healRate = inSafe ? P.maxHp * 0.05 : P.maxHp * 0.02;
    P.hp = Math.min(P.maxHp, P.hp + healRate * dt);
  }

  updateAura() {
    const { scene } = this;
    if (scene.playerDead) return;
    if (!scene.playerAura || !scene.playerAura.active) {
      const colorIndex = Math.min(getRealmIndex(P.realm), AURA_COLORS.length - 1);
      scene.playerAura = scene.add
        .circle(scene.player.x, scene.player.y, 22, AURA_COLORS[colorIndex] || 0x6de27a, 0.15)
        .setDepth(1);
      scene.tweens.add({
        targets: scene.playerAura,
        alpha: 0.08,
        scale: 1.6,
        duration: 1200,
        yoyo: true,
        repeat: -1
      });
      return;
    }
    scene.playerAura.setPosition(scene.player.x, scene.player.y);
  }
}
