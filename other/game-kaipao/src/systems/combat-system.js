import { G, gameOver, waveActive, waveIntermission } from '../core/state.js';

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

    this.scene.spawnDamageText(enemy.x, enemy.y - 15, Math.floor(damage), '#ffdd57');

    proj.setVisible(false);
    proj.setActive(false);
    proj.body.enable = false;
    this.scene._projectilePool.push(proj);

    if (hp <= 0) {
      this.onEnemyDeath(enemy);
    } else {
      enemy.setTint(0xff4444);
      this.scene.time.delayedCall(80, () => {
        if (enemy.active) enemy.clearTint();
      });
    }
  }

  onEnemyDeath(enemy) {
    const enemyType = enemy.getData('type');
    const gold = enemy.getData('gold') || 1;
    const x = enemy.x;
    const y = enemy.y;

    this.scene.spawnDamageText(x, y, '+' + gold + '💰', '#ffd700');

    enemy.setVisible(false);
    enemy.setActive(false);
    enemy.body.enable = false;
    enemy.destroy();

    this.scene.onMonsterKilled(enemyType, gold);
  }

  onEnemyReachPlayer(enemy) {
    if (!enemy.active || this.scene.playerDead) return;

    const damage = enemy.getData('damage') || 10;
    G.hp -= damage;

    this.scene.spawnDamageText(this.scene.player.x, this.scene.player.y - 20, '-' + damage, '#ff4444');

    enemy.setVisible(false);
    enemy.setActive(false);
    enemy.body.enable = false;
    enemy.destroy();

    G.score += 5;

    if (G.hp <= 0) {
      G.hp = 0;
      this.scene.onPlayerDeath();
    }
  }
}
