export function createGeneratedTextures(scene) {
  const g = scene.make.graphics({ add: false });

  drawPlayerOrb(g);
  drawMonsterOrb(g, 'monster-rabbit', 0xf6f8ff, 0x93d8ff, drawRabbitMark);
  drawMonsterOrb(g, 'monster-wolf', 0x7d8a69, 0xd8e5b8, drawWolfMark);
  drawMonsterOrb(g, 'monster-spider', 0x2c3328, 0x9dff66, drawSpiderMark);
  drawMonsterOrb(g, 'monster-golem', 0x777a75, 0xd9d2bb, drawGolemMark);
  drawMonsterOrb(g, 'monster-ice-spirit', 0x86d8ff, 0xffffff, drawIceMark);
  drawMonsterOrb(g, 'monster-fire-demon', 0xff6a35, 0xffffaa, drawFireMark);
  drawMonsterOrb(g, 'monster-serpent', 0x55a866, 0xd8ffd8, drawSerpentMark);
  drawMonsterOrb(g, 'monster-shadow', 0x553377, 0xff88e8, drawShadowMark);
  drawMonsterOrb(g, 'monster-ghost', 0xbfd6ff, 0x223355, drawGhostMark);
  drawMonsterOrb(g, 'monster-sword-spirit', 0x9ddcff, 0xffffff, drawSwordMark);
  drawMonsterOrb(g, 'monster-sword-golem', 0x728aa0, 0xe8f7ff, drawSwordGolemMark);
  drawMonsterOrb(g, 'monster-thunder-beast', 0xd0a63a, 0xffffbb, drawThunderBeastMark);
  drawMonsterOrb(g, 'monster-thunder-spirit', 0xffdd44, 0xffffff, drawThunderMark);
  drawMonsterOrb(g, 'monster-dragon', 0xaa7f25, 0xffe080, drawDragonMark);
  drawMonsterOrb(g, 'monster-boss', 0x5b247a, 0xffdd44, drawBossMark, 42);

  drawLegacyFallbacks(g);
  drawProjectiles(g);
  g.destroy();
}

function drawOrbBase(g, cx, cy, r, fill, glow) {
  g.fillStyle(glow, 0.28); g.fillCircle(cx, cy, r + 5);
  g.fillStyle(fill, 1); g.fillCircle(cx, cy, r);
  g.fillStyle(0xffffff, 0.18); g.fillCircle(cx - r * 0.32, cy - r * 0.36, r * 0.34);
  g.lineStyle(2, glow, 0.75); g.strokeCircle(cx, cy, r - 1);
  g.lineStyle(1, 0xffffff, 0.28); g.strokeCircle(cx, cy, r - 5);
}

function drawPlayerOrb(g) {
  drawOrbBase(g, 22, 22, 17, 0x5fcf88, 0xdfffd8);
  g.fillStyle(0x2b2118, 1); g.fillCircle(22, 14, 5);
  g.fillStyle(0xf3d3a4, 1); g.fillCircle(22, 17, 5);
  g.fillStyle(0x2b2118, 1); g.fillRect(17, 11, 10, 3);
  g.fillStyle(0xdff7c9, 1); g.fillTriangle(22, 21, 14, 34, 30, 34);
  g.fillStyle(0x2f7a58, 1); g.fillRect(16, 26, 12, 3);
  g.lineStyle(2, 0xe8ffff, 0.95); g.lineBetween(28, 16, 34, 9);
  g.fillStyle(0xffffff, 0.9); g.fillTriangle(34, 9, 31, 13, 33, 14);
  g.generateTexture('player', 44, 44); g.clear();
}

function drawMonsterOrb(g, key, fill, glow, drawMark, size = 36) {
  const c = size / 2;
  drawOrbBase(g, c, c, size * 0.38, fill, glow);
  drawMark(g, c, c, size, glow);
  g.generateTexture(key, size, size);
  g.clear();
}

function drawRabbitMark(g, c) {
  g.fillStyle(0xffffff, 0.95); g.fillEllipse(c - 4, c - 8, 4, 12); g.fillEllipse(c + 4, c - 8, 4, 12);
  g.fillStyle(0xf5b2bd, 1); g.fillCircle(c, c + 3, 3);
  g.fillStyle(0x5a6a80, 1); g.fillCircle(c - 5, c, 1.5); g.fillCircle(c + 5, c, 1.5);
}

function drawWolfMark(g, c) {
  g.fillStyle(0x2f352b, 1); g.fillTriangle(c, c - 10, c - 10, c + 8, c + 10, c + 8);
  g.fillStyle(0x5f6f50, 1); g.fillTriangle(c - 7, c - 4, c - 12, c - 12, c - 3, c - 8);
  g.fillTriangle(c + 7, c - 4, c + 12, c - 12, c + 3, c - 8);
  g.fillStyle(0xffdd66, 1); g.fillCircle(c - 4, c, 1.5); g.fillCircle(c + 4, c, 1.5);
}

function drawSpiderMark(g, c) {
  g.lineStyle(2, 0x101410, 1);
  for (let i = -1; i <= 1; i++) {
    g.lineBetween(c - 4, c + i * 4, c - 12, c + i * 6);
    g.lineBetween(c + 4, c + i * 4, c + 12, c + i * 6);
  }
  g.fillStyle(0x101410, 1); g.fillEllipse(c, c, 13, 11);
  g.fillStyle(0x9dff66, 1); g.fillCircle(c - 3, c - 2, 1.5); g.fillCircle(c + 3, c - 2, 1.5);
}

function drawGolemMark(g, c) {
  g.fillStyle(0x4d504b, 1); g.fillRect(c - 8, c - 7, 16, 15);
  g.fillStyle(0x9ea29a, 1); g.fillRect(c - 5, c - 13, 10, 7);
  g.lineStyle(1, 0xd9d2bb, 0.8); g.lineBetween(c - 7, c, c + 8, c - 4); g.lineBetween(c - 3, c - 7, c + 5, c + 8);
}

function drawIceMark(g, c) {
  g.fillStyle(0xffffff, 0.95); g.fillTriangle(c, c - 13, c - 8, c + 5, c + 8, c + 5);
  g.lineStyle(2, 0xe8fbff, 0.9); g.lineBetween(c, c - 11, c, c + 12); g.lineBetween(c - 9, c, c + 9, c);
}

function drawFireMark(g, c) {
  g.fillStyle(0xffdd66, 1); g.fillTriangle(c, c - 13, c - 9, c + 10, c + 9, c + 10);
  g.fillStyle(0xff5533, 1); g.fillTriangle(c, c - 5, c - 5, c + 10, c + 5, c + 10);
}

function drawSerpentMark(g, c) {
  g.lineStyle(4, 0xd8ffd8, 1); g.beginPath(); g.moveTo(c - 10, c + 8); g.lineTo(c - 4, c); g.lineTo(c + 3, c + 4); g.lineTo(c + 10, c - 7); g.strokePath();
  g.fillStyle(0x1d4f2b, 1); g.fillCircle(c + 10, c - 7, 4);
}

function drawShadowMark(g, c) {
  g.fillStyle(0x201029, 1); g.fillTriangle(c, c - 13, c - 10, c + 11, c + 10, c + 11);
  g.fillStyle(0xff88e8, 1); g.fillCircle(c - 4, c, 2); g.fillCircle(c + 4, c, 2);
}

function drawGhostMark(g, c) {
  g.fillStyle(0xffffff, 0.82); g.fillEllipse(c, c - 1, 16, 20);
  g.fillTriangle(c - 8, c + 7, c - 8, c + 14, c - 3, c + 9);
  g.fillTriangle(c - 2, c + 8, c + 2, c + 15, c + 5, c + 8);
  g.fillTriangle(c + 5, c + 8, c + 9, c + 14, c + 9, c + 7);
  g.fillStyle(0x223355, 1); g.fillCircle(c - 4, c - 3, 2); g.fillCircle(c + 4, c - 3, 2);
}

function drawSwordMark(g, c) {
  g.fillStyle(0xffffff, 1); g.fillTriangle(c, c - 13, c - 5, c + 5, c + 5, c + 5);
  g.fillStyle(0x446688, 1); g.fillRect(c - 2, c + 4, 4, 10); g.fillRect(c - 8, c + 10, 16, 2);
}

function drawSwordGolemMark(g, c) {
  drawGolemMark(g, c);
  g.fillStyle(0xe8f7ff, 1); g.fillTriangle(c + 8, c - 12, c + 5, c + 5, c + 12, c + 5);
}

function drawThunderBeastMark(g, c) {
  drawWolfMark(g, c);
  g.fillStyle(0xffffaa, 1); g.fillTriangle(c, c - 14, c - 3, c - 2, c + 3, c - 2);
  g.fillTriangle(c - 1, c - 2, c + 5, c - 2, c - 4, c + 11);
}

function drawThunderMark(g, c) {
  g.fillStyle(0xffffff, 1); g.fillTriangle(c + 2, c - 14, c - 8, c + 2, c, c + 2);
  g.fillTriangle(c - 1, c, c + 8, c, c - 5, c + 14);
}

function drawDragonMark(g, c) {
  g.lineStyle(4, 0xffe080, 1); g.beginPath(); g.moveTo(c - 11, c + 8); g.lineTo(c - 4, c); g.lineTo(c + 4, c + 4); g.lineTo(c + 11, c - 7); g.strokePath();
  g.fillStyle(0x5c3512, 1); g.fillCircle(c + 11, c - 7, 5);
  g.fillStyle(0xffe080, 1); g.fillTriangle(c + 7, c - 10, c + 3, c - 15, c + 11, c - 12);
}

function drawBossMark(g, c) {
  g.fillStyle(0x2b1238, 1); g.fillTriangle(c, c - 14, c - 12, c + 13, c + 12, c + 13);
  g.fillStyle(0xffdd44, 1); g.fillTriangle(c - 8, c - 6, c - 16, c - 15, c - 10, c + 2);
  g.fillTriangle(c + 8, c - 6, c + 16, c - 15, c + 10, c + 2);
  g.fillStyle(0xff5533, 1); g.fillCircle(c - 4, c, 2); g.fillCircle(c + 4, c, 2);
}

function drawLegacyFallbacks(g) {
  drawMonsterOrb(g, 'beast', 0xff5544, 0xffccaa, drawWolfMark, 28);
  drawMonsterOrb(g, 'elite', 0xffaa44, 0xffffaa, drawThunderMark, 30);
  drawMonsterOrb(g, 'boss', 0x5b247a, 0xffdd44, drawBossMark, 42);
}

function drawProjectiles(g) {
  g.fillStyle(0x8b5a2b, 1); g.fillRect(0, 3, 18, 3); g.generateTexture('arrow', 18, 9); g.clear();
  g.fillStyle(0xff6633, 1); g.fillCircle(6, 6, 5); g.fillStyle(0xffaa66, 0.5); g.fillCircle(6, 6, 7);
  g.generateTexture('fireball', 14, 14); g.clear();
  g.fillStyle(0x99ddff, 1); g.fillRect(0, 3, 22, 4); g.fillStyle(0xccffff, 0.5); g.fillRect(0, 2, 22, 6);
  g.generateTexture('swordQi', 22, 10); g.clear();
  g.fillStyle(0x5aa6b1, 0.75); g.fillCircle(12, 12, 10); g.fillStyle(0xd8f2ef, 0.5); g.fillCircle(12, 12, 14);
  g.generateTexture('water', 28, 28); g.clear();
  g.fillStyle(0x9fb884, 0.75); g.fillCircle(12, 12, 10); g.fillStyle(0xf5f0d8, 0.55); g.fillCircle(12, 12, 15);
  g.generateTexture('wind', 30, 30); g.clear();
  g.fillStyle(0xffee88, 1); g.fillRect(1, 0, 5, 20); g.fillStyle(0xffffcc, 0.5); g.fillRect(0, 0, 7, 20);
  g.generateTexture('bolt', 7, 20); g.clear();
  g.fillStyle(0x65c8ff, 1); g.fillCircle(5, 5, 4); g.generateTexture('loot', 10, 10); g.clear();
}
