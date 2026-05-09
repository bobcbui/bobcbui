const EFFECTS = {
  hehuan: { type: 'petal', color: 0xe8d5a8, rate: 0.45 },
  yaoshou: { type: 'leaf', color: 0x7f8f45, rate: 0.35 },
  xueshan: { type: 'snow', color: 0xffffff, rate: 1.8 },
  huoyan: { type: 'ember', color: 0xff8844, rate: 1.2 },
  shenyuan: { type: 'wisp', color: 0x9b66cc, rate: 0.7 },
  wanjian: { type: 'sword-glint', color: 0xcfe8ff, rate: 0.65 },
  youming: { type: 'mist', color: 0x88aacc, rate: 0.75 },
  jiutian: { type: 'spark', color: 0xffdd44, rate: 0.95 }
};

export class SceneEffectsSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentZoneId = null;
    this.emitAcc = 0;
  }

  update(dt, zone) {
    if (!zone) return;
    if (zone.id !== this.currentZoneId) {
      this.currentZoneId = zone.id;
      this.emitAcc = 0;
    }
    const cfg = EFFECTS[zone.id];
    if (!cfg) return;
    this.emitAcc += dt * cfg.rate;
    while (this.emitAcc >= 1) {
      this.emitAcc -= 1;
      this.spawn(cfg);
    }
  }

  spawn(cfg) {
    if (cfg.type === 'snow') this.spawnSnow(cfg.color);
    else if (cfg.type === 'ember') this.spawnEmber(cfg.color);
    else if (cfg.type === 'wisp') this.spawnWisp(cfg.color);
    else if (cfg.type === 'sword-glint') this.spawnSwordGlint(cfg.color);
    else if (cfg.type === 'mist') this.spawnMist(cfg.color);
    else if (cfg.type === 'spark') this.spawnSpark(cfg.color);
    else this.spawnPetal(cfg.color);
  }

  randomNearCamera(margin = 40) {
    const cam = this.scene.cameras.main;
    return {
      x: cam.scrollX + Phaser.Math.Between(-margin, cam.width + margin),
      y: cam.scrollY + Phaser.Math.Between(-margin, cam.height + margin)
    };
  }

  spawnSnow(color) {
    const cam = this.scene.cameras.main;
    const x = cam.scrollX + Phaser.Math.Between(-30, cam.width + 30);
    const y = cam.scrollY - Phaser.Math.Between(10, 80);
    const flake = this.scene.add.circle(x, y, Phaser.Math.FloatBetween(1.2, 2.5), color, 0.72).setDepth(30);
    this.scene.tweens.add({
      targets: flake,
      x: x + Phaser.Math.Between(-35, 35),
      y: y + cam.height + Phaser.Math.Between(60, 140),
      alpha: 0,
      duration: Phaser.Math.Between(2600, 4200),
      onComplete: () => flake.destroy()
    });
  }

  spawnEmber(color) {
    const cam = this.scene.cameras.main;
    const x = cam.scrollX + Phaser.Math.Between(-20, cam.width + 20);
    const y = cam.scrollY + cam.height + Phaser.Math.Between(5, 60);
    const ember = this.scene.add.circle(x, y, Phaser.Math.FloatBetween(1.4, 3.2), color, 0.65).setDepth(30);
    this.scene.tweens.add({
      targets: ember,
      x: x + Phaser.Math.Between(-50, 50),
      y: y - Phaser.Math.Between(180, 360),
      alpha: 0,
      scale: 0.25,
      duration: Phaser.Math.Between(1300, 2300),
      onComplete: () => ember.destroy()
    });
  }

  spawnWisp(color) {
    const p = this.randomNearCamera();
    const wisp = this.scene.add.circle(p.x, p.y, Phaser.Math.FloatBetween(3, 6), color, 0.18).setDepth(2);
    this.scene.tweens.add({
      targets: wisp,
      x: p.x + Phaser.Math.Between(-70, 70),
      y: p.y - Phaser.Math.Between(30, 100),
      alpha: 0,
      scale: 2.4,
      duration: Phaser.Math.Between(1800, 3000),
      onComplete: () => wisp.destroy()
    });
  }

  spawnSwordGlint(color) {
    const p = this.randomNearCamera();
    const glint = this.scene.add.rectangle(p.x, p.y, 18, 2, color, 0.58).setDepth(30);
    glint.rotation = Phaser.Math.FloatBetween(-0.7, 0.7);
    this.scene.tweens.add({
      targets: glint,
      alpha: 0,
      scaleX: 0.2,
      duration: Phaser.Math.Between(360, 700),
      onComplete: () => glint.destroy()
    });
  }

  spawnMist(color) {
    const p = this.randomNearCamera();
    const mist = this.scene.add.ellipse(p.x, p.y, Phaser.Math.Between(45, 85), Phaser.Math.Between(12, 24), color, 0.08).setDepth(1);
    this.scene.tweens.add({
      targets: mist,
      x: p.x + Phaser.Math.Between(-80, 80),
      alpha: 0,
      duration: Phaser.Math.Between(2000, 3400),
      onComplete: () => mist.destroy()
    });
  }

  spawnSpark(color) {
    const p = this.randomNearCamera();
    const spark = this.scene.add.rectangle(p.x, p.y, 3, 18, color, 0.62).setDepth(30);
    spark.rotation = Phaser.Math.FloatBetween(-0.4, 0.4);
    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      y: p.y + Phaser.Math.Between(25, 60),
      scaleY: 0.15,
      duration: Phaser.Math.Between(180, 360),
      onComplete: () => spark.destroy()
    });
  }

  spawnPetal(color) {
    const cam = this.scene.cameras.main;
    const x = cam.scrollX + Phaser.Math.Between(-30, cam.width + 30);
    const y = cam.scrollY - Phaser.Math.Between(0, 80);
    const petal = this.scene.add.ellipse(x, y, 5, 3, color, 0.46).setDepth(30);
    petal.rotation = Phaser.Math.FloatBetween(0, Math.PI);
    this.scene.tweens.add({
      targets: petal,
      x: x + Phaser.Math.Between(-70, 70),
      y: y + Phaser.Math.Between(180, 360),
      angle: Phaser.Math.Between(120, 360),
      alpha: 0,
      duration: Phaser.Math.Between(2200, 3600),
      onComplete: () => petal.destroy()
    });
  }
}
