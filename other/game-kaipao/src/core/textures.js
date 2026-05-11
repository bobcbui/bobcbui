export function createGeneratedTextures(scene) {
  const g = scene.make.graphics({ add: false });

  drawPlayer(g);
  drawMonster(g, 'monster-common', 0xe94560, 0xff6b6b);
  drawMonster(g, 'monster-fast', 0xf5a623, 0xffd93d);
  drawMonster(g, 'monster-tank', 0x6c5ce7, 0xa29bfe);
  drawMonster(g, 'monster-boss', 0xd63031, 0xff7675, 48);
  drawProjectile(g, 'bullet', 0xffdd57, 10);
  drawProjectile(g, 'bullet-skill', 0xff6b6b, 14);

  g.destroy();
}

function drawPlayer(g) {
  const cx = 30, cy = 30;
  g.fillStyle(0x16213e, 1);
  g.fillRect(cx - 2, cy - 5, 4, 30);
  g.fillStyle(0x0f3460, 1);
  g.fillRect(cx - 6, cy + 5, 12, 16);
  g.fillStyle(0x533483, 1);
  g.fillCircle(cx, cy - 5, 10);
  g.fillStyle(0xe94560, 0.7);
  g.fillCircle(cx, cy - 5, 4);
  g.fillStyle(0xffdd57, 0.6);
  g.fillRect(cx - 8, cy + 22, 16, 4);
  g.generateTexture('player', 60, 60);
  g.clear();
}

function drawMonster(g, key, fill, glow, size = 32) {
  const c = size / 2;
  g.fillStyle(glow, 0.25);
  g.fillCircle(c, c, size * 0.48);
  g.fillStyle(fill, 1);
  g.fillCircle(c, c, size * 0.4);
  g.fillStyle(glow, 0.4);
  g.fillCircle(c - size * 0.12, c - size * 0.12, size * 0.14);
  g.fillStyle(0x1a1a2e, 1);
  g.fillCircle(c - size * 0.1, c - size * 0.08, size * 0.06);
  g.fillCircle(c + size * 0.1, c - size * 0.08, size * 0.06);
  g.fillStyle(0xff4444, 0.9);
  g.fillTriangle(c - size * 0.12, c + size * 0.16, c + size * 0.12, c + size * 0.16, c, c + size * 0.28);
  g.generateTexture(key, size, size);
  g.clear();
}

function drawProjectile(g, key, color, size) {
  g.fillStyle(0xffffff, 0.3);
  g.fillCircle(size / 2, size / 2, size / 2 + 2);
  g.fillStyle(color, 1);
  g.fillCircle(size / 2, size / 2, size / 2);
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(size / 2 - size * 0.15, size / 2 - size * 0.15, size * 0.15);
  g.generateTexture(key, size + 4, size + 4);
  g.clear();
}
