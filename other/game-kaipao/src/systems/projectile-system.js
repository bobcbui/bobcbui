import { G, gameOver, waveActive, waveIntermission } from '../core/state.js';

export class ProjectileSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(time, dt) {
    if (gameOver || !waveActive || waveIntermission) return;

    this.scene._attackTimer += dt;
    const fireInterval = 1 / G.atkSpeed;

    while (this.scene._attackTimer >= fireInterval) {
      this.scene._attackTimer -= fireInterval;
      this.fireAtNearestEnemy();
    }
  }

  fireAtNearestEnemy() {
    const enemies = this.scene.enemies.getChildren().filter(e => e.active);
    if (enemies.length === 0) return;

    let nearest = null;
    let nearestDist = Infinity;
    const px = this.scene.player.x;
    const py = this.scene.player.y;

    for (const enemy of enemies) {
      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    if (!nearest) return;

    this.fireProjectile(px, py - 10, nearest, false);
  }

  fireProjectile(x, y, target, isSkill) {
    const texture = isSkill ? 'bullet-skill' : 'bullet';
    let proj = this.scene._projectilePool.pop();
    if (!proj) {
      proj = this.scene.physics.add.sprite(x, y, texture);
      proj.setDepth(8);
      proj.setDisplaySize(8, 8);
    } else {
      proj.setVisible(true);
      proj.setActive(true);
      proj.body.enable = true;
      proj.setPosition(x, y);
      proj.setTexture(texture);
    }

    proj.setData('target', target);
    proj.setData('damage', G.atk * (isSkill ? 1.5 : 1));

    const speed = 400;
    this.scene.physics.moveToObject(proj, target, speed);

    proj._lifeTimer = 3;
    proj._autoFree = () => {
      if (proj.active) {
        proj.setVisible(false);
        proj.setActive(false);
        proj.body.enable = false;
        this.scene._projectilePool.push(proj);
      }
    };

    this.scene.projectiles.add(proj);
    return proj;
  }

  fireMultiProjectiles(count) {
    const enemies = this.scene.enemies.getChildren().filter(e => e.active);
    if (enemies.length === 0) return;

    const px = this.scene.player.x;
    const py = this.scene.player.y;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      const target = enemies[i % enemies.length];
      this.fireProjectile(px + Math.cos(angle) * 5, py + Math.sin(angle) * 5, target, true);
    }
  }

  updateProjectileLife(dt) {
    const projectiles = this.scene.projectiles.getChildren();
    for (const proj of projectiles) {
      if (!proj.active) continue;
      proj._lifeTimer -= dt;
      if (proj._lifeTimer <= 0) {
        this.recycleProjectile(proj);
      }
    }
  }

  recycleProjectile(proj) {
    if (!proj.active) return;
    proj.setVisible(false);
    proj.setActive(false);
    proj.body.enable = false;
    this.scene._projectilePool.push(proj);
  }
}
