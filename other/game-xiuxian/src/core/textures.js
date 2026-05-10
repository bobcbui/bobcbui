const SWORD_FLY_TEXTURE = 'swordFlySvg';
const FIREDOMAIN_SWORD_TEXTURE = 'firedomainSword';

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
  queueSwordFlySvg(scene);
  queueFiredomainSwordSvg(scene);
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

function queueSwordFlySvg(scene) {
  if (!scene?.textures) return;
  if (typeof scene.textures.addBase64 !== 'function') return;
  if (scene?.textures?.exists?.(SWORD_FLY_TEXTURE)) return;
  const svg = [
    "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='30' viewBox='0 0 96 30'>",
    "<defs>",
    "<linearGradient id='sf_blade' x1='0' y1='0' x2='1' y2='1'>",
    "<stop offset='0%' stop-color='#f9fdff'/>",
    "<stop offset='62%' stop-color='#b8d8ff'/>",
    "<stop offset='100%' stop-color='#6c98d3'/>",
    "</linearGradient>",
    "<linearGradient id='sf_edge' x1='0' y1='0.5' x2='1' y2='0.5'>",
    "<stop offset='0%' stop-color='#8fbfff'/>",
    "<stop offset='100%' stop-color='#ffffff'/>",
    "</linearGradient>",
    "<linearGradient id='sf_guard' x1='0' y1='0' x2='0' y2='1'>",
    "<stop offset='0%' stop-color='#d9ecff'/>",
    "<stop offset='100%' stop-color='#85abd5'/>",
    "</linearGradient>",
    "<radialGradient id='sf_aura' cx='0.54' cy='0.5' r='0.8'>",
    "<stop offset='0%' stop-color='#d7f2ff' stop-opacity='0.8'/>",
    "<stop offset='100%' stop-color='#71afff' stop-opacity='0'/>",
    "</radialGradient>",
    "</defs>",
    "<ellipse cx='54' cy='15' rx='44' ry='10' fill='url(#sf_aura)'/>",
    "<path d='M12 14 L63 10.5 L86 15 L63 19.5 L12 16 Z' fill='url(#sf_blade)' stroke='#ebf6ff' stroke-width='1.6' stroke-linejoin='round'/>",
    "<path d='M17 15 L61 13.8 L78 15 L61 16.2 Z' fill='url(#sf_edge)' opacity='0.9'/>",
    "<path d='M58 10.8 L67 15 L58 19.2 Z' fill='#ffffff' opacity='0.76'/>",
    "<rect x='8' y='11' width='6.5' height='8' rx='1.8' fill='url(#sf_guard)' stroke='#e8f5ff' stroke-width='1'/>",
    "<rect x='3.2' y='12.2' width='5' height='5.6' rx='1.3' fill='#eaf6ff' stroke='#c8e6ff' stroke-width='1'/>",
    "</svg>"
  ].join('');
  const base64 = (typeof btoa === 'function')
    ? btoa(svg)
    : (typeof Buffer !== 'undefined' ? Buffer.from(svg, 'utf8').toString('base64') : null);
  if (!base64) return;
  scene.textures.addBase64(SWORD_FLY_TEXTURE, 'data:image/svg+xml;base64,' + base64);
}

function queueFiredomainSwordSvg(scene) {
  if (!scene?.textures) return;
  if (typeof scene.textures.addBase64 !== 'function') return;
  if (scene?.textures?.exists?.(FIREDOMAIN_SWORD_TEXTURE)) return;
  const svg = [
    "<svg xmlns='http://www.w3.org/2000/svg' width='176' height='52' viewBox='0 0 176 52'>",
    "<defs>",
    "<linearGradient id='bladeFill' x1='0' y1='0' x2='1' y2='1'>",
    "<stop offset='0%' stop-color='#fdfefe'/>",
    "<stop offset='55%' stop-color='#c8dcff'/>",
    "<stop offset='100%' stop-color='#7a9fd4'/>",
    "</linearGradient>",
    "<linearGradient id='edgeGlow' x1='0' y1='0.5' x2='1' y2='0.5'>",
    "<stop offset='0%' stop-color='#9cc7ff'/>",
    "<stop offset='100%' stop-color='#ffffff'/>",
    "</linearGradient>",
    "<linearGradient id='guardFill' x1='0' y1='0' x2='0' y2='1'>",
    "<stop offset='0%' stop-color='#f9db85'/>",
    "<stop offset='100%' stop-color='#c78a31'/>",
    "</linearGradient>",
    "<linearGradient id='gripFill' x1='0' y1='0' x2='1' y2='1'>",
    "<stop offset='0%' stop-color='#7f5537'/>",
    "<stop offset='100%' stop-color='#5d3b25'/>",
    "</linearGradient>",
    "<radialGradient id='bladeAura' cx='0.54' cy='0.5' r='0.75'>",
    "<stop offset='0%' stop-color='#e2f4ff' stop-opacity='0.85'/>",
    "<stop offset='100%' stop-color='#89b7ff' stop-opacity='0'/>",
    "</radialGradient>",
    "</defs>",
    "<ellipse cx='96' cy='26' rx='82' ry='20' fill='url(#bladeAura)'/>",
    "<path d='M16 24 L116 18 L162 26 L116 34 L16 28 Z' fill='url(#bladeFill)' stroke='#edf6ff' stroke-width='2' stroke-linejoin='round'/>",
    "<path d='M24 26 L114 24 L148 26 L114 28 Z' fill='url(#edgeGlow)' opacity='0.9'/>",
    "<path d='M110 18 L126 26 L110 34 Z' fill='#ffffff' opacity='0.74'/>",
    "<rect x='8' y='20' width='12' height='12' rx='2.5' fill='url(#guardFill)' stroke='#fbe6ad' stroke-width='1.6'/>",
    "<path d='M2 22 L8 20 L8 32 L2 30 Z' fill='url(#guardFill)' stroke='#fbe6ad' stroke-width='1.4'/>",
    "<rect x='0.6' y='22.8' width='3.2' height='6.6' rx='1.4' fill='#fff5d4'/>",
    "<rect x='20' y='22' width='20' height='8' rx='3.5' fill='url(#gripFill)' stroke='#b48b67' stroke-width='1.2'/>",
    "<circle cx='44.2' cy='26' r='5.1' fill='#f2be5b' stroke='#fff0c2' stroke-width='1.4'/>",
    "<circle cx='44.2' cy='26' r='2.2' fill='#fff8da'/>",
    "</svg>"
  ].join('');
  const base64 = (typeof btoa === 'function')
    ? btoa(svg)
    : (typeof Buffer !== 'undefined' ? Buffer.from(svg, 'utf8').toString('base64') : null);
  if (!base64) return;
  scene.textures.addBase64(FIREDOMAIN_SWORD_TEXTURE, 'data:image/svg+xml;base64,' + base64);
}
