export class SceneEffectsSystem {
  constructor(scene) {
    this.scene = scene;
    this.emitAcc = 0;
  }

  update(dt) {
    this.emitAcc += dt * 0.55;
    while (this.emitAcc >= 1) {
      this.emitAcc -= 1;
      this.spawnLeaf();
    }
  }

  spawnLeaf() {
    const cam = this.scene.cameras.main;
    const x = cam.scrollX + Phaser.Math.Between(-30, cam.width + 30);
    const y = cam.scrollY - Phaser.Math.Between(0, 60);
    const leaf = this.scene.add.ellipse(x, y, 5, 3, 0x9bbf7a, 0.4).setDepth(30);
    leaf.rotation = Phaser.Math.FloatBetween(0, Math.PI);
    this.scene.tweens.add({
      targets: leaf,
      x: x + Phaser.Math.Between(-70, 70),
      y: y + Phaser.Math.Between(200, 400),
      angle: Phaser.Math.Between(120, 360),
      alpha: 0,
      duration: Phaser.Math.Between(2400, 3800),
      onComplete: () => leaf.destroy()
    });
  }
}
