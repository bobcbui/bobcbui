import { G, gameOver, levelActive, levelIntermission } from '../core/state.js';

export class ProjectileSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(time, dt) {
    if (gameOver || !levelActive || levelIntermission) return;

    this.scene._attackTimer += dt;
    const fireInterval = 1 / G.atkSpeed;

    while (this.scene._attackTimer >= fireInterval) {
      this.scene._attackTimer -= fireInterval;
      this.fireSword();
    }
  }

  fireSword() {
    const enemies = this.scene.enemies.getChildren().filter(e => e.active);
    if (enemies.length === 0) return;

    let nearest = null;
    let nearestDist = Infinity;
    const px = this.scene.player.x;
    const py = this.scene.player.y - 20;

    for (const enemy of enemies) {
      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    if (!nearest) return;
    this.fireProjectile(px, py, nearest);
  }

  fireProjectile(x, y, target) {
    let proj = this.getProjectile();
    proj.setPosition(x, y);
    proj.setDisplaySize(48, 14);

    const angle = Phaser.Math.Angle.Between(x, y, target.x, target.y);
    proj.setRotation(angle);
    proj.setData('damage', G.atk);
    proj.setTint(0x88ccff);

    const speed = 400;
    this.scene.physics.moveToObject(proj, target, speed);

    proj._lifeTimer = 2.5;

    this.scene.projectiles.add(proj);

    this.scene.addGlowTrail(proj);

    return proj;
  }

  fireMultiSwords(count) {
    const enemies = this.scene.enemies.getChildren().filter(e => e.active);
    if (enemies.length === 0) return;

    const px = this.scene.player.x;
    const py = this.scene.player.y - 20;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / (count + 1)) * (i + 1) - Math.PI / 2;
      const targetX = px + Math.cos(angle) * 200;
      const targetY = py + Math.sin(angle) * 200;

      let proj = this.getProjectile();
      proj.setPosition(px, py);
      proj.setDisplaySize(48, 14);
      proj.setRotation(angle);
      proj.setData('damage', G.atk * 0.7);
      proj.setTint(0x88ccff);

      const fakeTarget = { x: targetX, y: targetY };
      this.scene.physics.moveToObject(proj, fakeTarget, 400);
      proj._lifeTimer = 2;

      this.scene.addGlowTrail(proj);

      const checkHit = () => {
        if (!proj.active) return;
        const enemies2 = this.scene.enemies.getChildren().filter(e => e.active);
        for (const enemy of enemies2) {
          const dist = Phaser.Math.Distance.Between(proj.x, proj.y, enemy.x, enemy.y);
          if (dist < 30) {
            const dmg = proj.getData('damage');
            let hp = enemy.getData('hp') - dmg;
            enemy.setData('hp', hp);
            this.scene.spawnDamageText(enemy.x, enemy.y - 10, Math.floor(dmg), '#ffdd57');
            if (hp <= 0) {
              this.scene.combatSystem.onEnemyDeath(enemy);
            }
            this.recycleProjectile(proj);
            return;
          }
        }
        if (proj.active) this.scene.time.delayedCall(50, checkHit);
      };
      this.scene.time.delayedCall(50, checkHit);

      this.scene.projectiles.add(proj);
    }
  }

  getProjectile() {
    let proj = this.scene._projPool.pop();
    if (!proj) {
      proj = this.scene.physics.add.sprite(0, 0, 'sword');
      proj.setDepth(8);
    }
    proj.setVisible(true);
    proj.setActive(true);
    proj.body.enable = true;
    proj.setAlpha(1);
    return proj;
  }

  recycleProjectile(proj) {
    if (!proj.active) return;
    proj.setVisible(false);
    proj.setActive(false);
    proj.body.enable = false;
    this.scene._projPool.push(proj);
  }

  clearAll() {
    this.scene.projectiles.clear(true, true);
    this.scene._projPool = [];
  }

  updateProjectileLife(dt) {
    const projectiles = this.scene.projectiles.getChildren();
    for (const proj of projectiles) {
      if (!proj.active) continue;
      proj._lifeTimer = (proj._lifeTimer || 0) - dt;
      if (proj._lifeTimer <= 0) {
        this.recycleProjectile(proj);
      }
    }
  }
}
