export class TextPool {
  constructor(scene, size = 24) {
    this.scene = scene;
    this.pool = [];
    this.ptr = 0;
    for (let i = 0; i < size; i++) {
      const txt = scene.add.text(0, 0, '', {
        fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(20).setActive(false).setVisible(false);
      this.pool.push(txt);
    }
  }

  _findSlot() {
    for (let i = 0; i < this.pool.length; i++) {
      const idx = (this.ptr + i) % this.pool.length;
      if (!this.pool[idx].active) {
        this.ptr = (idx + 1) % this.pool.length;
        return idx;
      }
    }
    const idx = this.ptr;
    this.ptr = (this.ptr + 1) % this.pool.length;
    return idx;
  }

  show(x, y, text, opts = {}) {
    const obj = this.pool[this._findSlot()];
    this.scene.tweens.getTweensOf(obj).forEach(t => t.stop());
    obj.setPosition(x, y);
    obj.setText(String(text));
    obj.setFontSize(opts.fontSize || '14px');
    obj.setColor(opts.color || '#ffffff');
    obj.setStroke(opts.stroke || '#000', opts.strokeThickness != null ? opts.strokeThickness : 1);
    obj.setDepth(opts.depth || 20);
    obj.setAlpha(1);
    obj.setActive(true).setVisible(true);
    const floatDist = opts.floatDist || 40;
    this.scene.tweens.add({
      targets: obj,
      y: y - floatDist,
      alpha: 0,
      duration: opts.duration || 800,
      onComplete: () => { obj.setActive(false).setVisible(false); }
    });
    return obj;
  }
}
