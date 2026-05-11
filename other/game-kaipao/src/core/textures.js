export function createSVGTextures(scene) {
  if (!scene?.textures || typeof scene.textures.addBase64 !== 'function') {
    createFallbackTextures(scene);
    return;
  }

  addPlayerSVG(scene);
  addSwordSVG(scene);
  addMonsterSVG(scene, 'monster-small', '#e94560', 28);
  addMonsterSVG(scene, 'monster-fast', '#f5a623', 24);
  addMonsterSVG(scene, 'monster-tank', '#6c5ce7', 32);
  addMonsterSVG(scene, 'monster-boss', '#d63031', 44);
  addAOEIndicator(scene);
}

function addPlayerSVG(scene) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64">
    <ellipse cx="24" cy="14" rx="9" ry="10" fill="#f5d0a0"/>
    <rect x="19" y="24" width="10" height="22" rx="4" fill="#3a5a8c"/>
    <rect x="14" y="26" width="20" height="18" rx="3" fill="#2c4a7a" opacity="0.5"/>
    <rect x="10" y="46" width="28" height="14" rx="5" fill="#1a3a5e"/>
    <line x1="24" y1="32" x2="8" y2="44" stroke="#8899bb" stroke-width="3" stroke-linecap="round"/>
    <circle cx="24" cy="9" r="4" fill="#f5d0a0"/>
    <circle cx="21" cy="12" r="1.5" fill="#3a3a3a"/>
    <circle cx="27" cy="12" r="1.5" fill="#3a3a3a"/>
    <path d="M22 16 Q24 18 26 16" stroke="#3a3a3a" stroke-width="0.8" fill="none"/>
  </svg>`;
  const b64 = btoa(svg);
  scene.textures.addBase64('player', 'data:image/svg+xml;base64,' + b64);
}

function addSwordSVG(scene) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="16" viewBox="0 0 48 16">
    <defs>
      <linearGradient id="swd" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#ddeeff"/>
        <stop offset="50%" stop-color="#99ddff"/>
        <stop offset="100%" stop-color="#55bbee"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <ellipse cx="24" cy="8" rx="22" ry="6" fill="#88ccff" opacity="0.15" filter="url(#glow)"/>
    <rect x="4" y="1" width="42" height="5" rx="2.5" fill="url(#swd)" stroke="#bbddff" stroke-width="0.5"/>
    <rect x="8" y="1" width="6" height="1.5" rx="0.5" fill="#ffffff" opacity="0.6"/>
    <rect x="0" y="4" width="8" height="8" rx="2" fill="#cc8844"/>
    <rect x="1" y="5" width="6" height="6" rx="1" fill="#dd9955"/>
    <circle cx="1.5" cy="8" r="1.5" fill="#eeaa66"/>
  </svg>`;
  const b64 = btoa(svg);
  scene.textures.addBase64('sword', 'data:image/svg+xml;base64,' + b64);
}

function addMonsterSVG(scene, key, color, size) {
  const s = size;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <circle cx="${s/2}" cy="${s/2}" r="${s*0.44}" fill="${color}" opacity="0.3"/>
    <circle cx="${s/2}" cy="${s/2}" r="${s*0.38}" fill="${color}"/>
    <circle cx="${s*0.35}" cy="${s*0.38}" r="${s*0.12}" fill="#ffffff" opacity="0.25"/>
    <circle cx="${s*0.35}" cy="${s*0.42}" r="${s*0.04}" fill="#111111"/>
    <circle cx="${s*0.65}" cy="${s*0.42}" r="${s*0.04}" fill="#111111"/>
    <path d="M${s*0.3} ${s*0.6} L${s*0.5} ${s*0.78} L${s*0.7} ${s*0.6} Z" fill="#ff4444" opacity="0.7"/>
  </svg>`;
  const b64 = btoa(svg);
  scene.textures.addBase64(key, 'data:image/svg+xml;base64,' + b64);
}

function addAOEIndicator(scene) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <circle cx="30" cy="30" r="28" fill="none" stroke="#ffaa00" stroke-width="2" opacity="0.6"/>
    <circle cx="30" cy="30" r="24" fill="#ffaa00" opacity="0.1"/>
  </svg>`;
  const b64 = btoa(svg);
  scene.textures.addBase64('aoe', 'data:image/svg+xml;base64,' + b64);
}

function createFallbackTextures(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x3a5a8c, 1);
  g.fillRect(16, 18, 16, 28);
  g.fillStyle(0xf5d0a0, 1);
  g.fillCircle(24, 12, 8);
  g.fillStyle(0x2c4a7a, 1);
  g.fillRect(10, 40, 28, 18);
  g.generateTexture('player', 48, 64);
  g.clear();

  g.fillStyle(0x88ccff, 1);
  g.fillRect(2, 0, 44, 6);
  g.fillStyle(0xffffff, 0.5);
  g.fillRect(4, 0, 8, 2);
  g.fillStyle(0xcc8844, 1);
  g.fillRect(0, 2, 8, 12);
  g.fillStyle(0xdd9955, 1);
  g.fillRect(1, 4, 6, 8);
  g.generateTexture('sword', 48, 16);
  g.clear();

  const colors = { 'monster-small': 0xe94560, 'monster-fast': 0xf5a623, 'monster-tank': 0x6c5ce7, 'monster-boss': 0xd63031 };
  const sizes = { 'monster-small': 28, 'monster-fast': 24, 'monster-tank': 32, 'monster-boss': 44 };
  for (const [key, color] of Object.entries(colors)) {
    const s = sizes[key] || 28;
    const c = s / 2;
    g.fillStyle(Phaser.Display.Color.IntegerToColor(color).brighten(40).color, 0.3);
    g.fillCircle(c, c, s * 0.44);
    g.fillStyle(color, 1);
    g.fillCircle(c, c, s * 0.38);
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(c - s * 0.12, c - s * 0.12, s * 0.08);
    g.fillStyle(0x111111, 1);
    g.fillCircle(c - s * 0.08, c - s * 0.08, s * 0.04);
    g.fillCircle(c + s * 0.08, c - s * 0.08, s * 0.04);
    g.fillStyle(0xff4444, 0.7);
    g.fillTriangle(c - s * 0.15, c + s * 0.15, c + s * 0.15, c + s * 0.15, c, c + s * 0.35);
    g.generateTexture(key, s, s);
    g.clear();
  }

  g.fillStyle(0xffaa00, 0.15);
  g.fillCircle(30, 30, 28);
  g.lineStyle(2, 0xffaa00, 0.6);
  g.strokeCircle(30, 30, 28);
  g.generateTexture('aoe', 60, 60);
  g.clear();

  g.destroy();
}
