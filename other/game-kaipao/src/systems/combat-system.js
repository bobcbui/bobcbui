import { G, gameOver, levelActive } from '../core/state.js';

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt) {
    if (gameOver) return;
    this.scene.projectileSystem.updateProjectileLife(dt);
  }

  onProjHit(proj, enemy) {
    if (!proj.active || !enemy.active) return;

    const damage = proj.getData('damage') || G.atk;
    let hp = enemy.getData('hp') - damage;
    enemy.setData('hp', hp);

    this.scene.spawnDamageText(enemy.x, enemy.y - 10, Math.floor(damage), '#ffdd57');

    const angle = proj.rotation;
    const small = this.scene.add.circle(proj.x, proj.y, 4, 0xffffff, 0.6).setDepth(18);
    this.scene.tweens.add({ targets: small, alpha: 0, scale: 2, duration: 150, onComplete: () => small.destroy() });

    this.scene.projectileSystem.recycleProjectile(proj);

    if (hp <= 0) {
      this.onEnemyDeath(enemy);
    } else {
      enemy.setTint(0xff4444);
      this.scene.time.delayedCall(60, () => { if (enemy.active) enemy.clearTint(); });
    }
  }

  onEnemyDeath(enemy) {
    const enemyType = enemy.getData('type');
    const gold = enemy.getData('gold') || 3;
    const x = enemy.x, y = enemy.y;

    this.scene.spawnDamageText(x, y, '+' + gold + '💰', '#ffd700');

    enemy.setVisible(false);
    enemy.setActive(false);
    enemy.body.enable = false;
    enemy.destroy();

    G.kills++;
    G.score += gold * 10;
    this.scene.monstersRemaining--;

    this.scene.checkLevelComplete();

    const particles = this.scene.add.graphics().setDepth(16);
    particles.fillStyle(0xffdd57, 0.6);
    for (let i = 0; i < 5; i++) {
      const px = x + (Math.random() - 0.5) * 20;
      const py = y + (Math.random() - 0.5) * 20;
      particles.fillCircle(px, py, 2 + Math.random() * 2);
    }
    this.scene.tweens.add({ targets: particles, alpha: 0, duration: 400, onComplete: () => particles.destroy() });
  }

  onEnemyReachPlayer(enemy) {
    if (!enemy.active || this.scene.playerDead) return;

    let damage = enemy.getData('damage') || 10;

    if (this.scene._shieldHP > 0) {
      const absorbed = Math.min(this.scene._shieldHP, damage);
      this.scene._shieldHP -= absorbed;
      damage -= absorbed;
      this.scene.spawnDamageText(this.scene.player.x, this.scene.player.y - 30, '-' + absorbed + '🛡️', '#4488ff');
    }

    if (damage > 0) {
      G.hp -= damage;
      this.scene.spawnDamageText(this.scene.player.x, this.scene.player.y - 20, '-' + Math.floor(damage), '#ff4444');
      this.scene.cameras.main.shake(100, 0.005);
    }

    enemy.setVisible(false);
    enemy.setActive(false);
    enemy.body.enable = false;
    enemy.destroy();

    if (G.hp <= 0) {
      G.hp = 0;
      this.scene.onPlayerDeath();
    }
  }
}
