import { GAME_DATA, cloneData } from "./data.js";
import { CONFIG, state, player } from "./runtime.js";

// ── Engine & Scene ──────────────────────────────────────────
export const canvas = document.getElementById("gameCanvas");
export const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true
});
export const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.68, 0.84, 0.98, 1);
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogDensity = 0.012;
scene.collisionsEnabled = true;
scene.skipPointerMovePicking = true;
scene.gravity = new BABYLON.Vector3(0, -0.35, 0);

// ── DOM references ──────────────────────────────────────────
export const dom = {
    healthText: document.getElementById("healthText"),
    healthFill: document.getElementById("healthFill"),
    ammoText: document.getElementById("ammoText"),
    statusText: document.getElementById("statusText"),
    hotbar: document.getElementById("hotbar"),
    pausePanel: document.getElementById("pausePanel"),
    deathPanel: document.getElementById("deathPanel"),
    resumeBtn: document.getElementById("resumeBtn"),
    respawnBtn: document.getElementById("respawnBtn"),
    damageFlash: document.getElementById("damageFlash"),
    openInventoryBtn: document.getElementById("openInventoryBtn"),
    openSettingsBtn: document.getElementById("openSettingsBtn"),
    inventoryPanel: document.getElementById("inventoryPanel"),
    settingsPanel: document.getElementById("settingsPanel"),
    closeInventoryBtn: document.getElementById("closeInventoryBtn"),
    closeSettingsBtn: document.getElementById("closeSettingsBtn"),
    inventoryContent: document.getElementById("inventoryContent"),
    settingsContent: document.getElementById("settingsContent")
};

// ── Shared data structures ──────────────────────────────────
export const weaponDefs = cloneData(GAME_DATA.weapons);

export const BLOCK_TYPES = {
    grass: { label: "Grass", color: "#63b447", solid: true },
    dirt: { label: "Dirt", color: "#8f6338", solid: true },
    stone: { label: "Stone", color: "#7a8088", solid: true },
    wood: { label: "Wood", color: "#9b6a3d", solid: true },
    brick: { label: "Brick", color: "#bb654f", solid: true },
    metal: { label: "Metal", color: "#95a6b5", solid: true },
    sand: { label: "Sand", color: "#d7c27a", solid: true },
    snow: { label: "Snow", color: "#eef8ff", solid: true },
    glass: { label: "Glass", color: "#a4edff", solid: true, alpha: 0.45 },
    leaf: { label: "Leaf", color: "#4f9350", solid: true, alpha: 0.92 }
};

export const materials = {};
export const particleMaterials = {};
export const particles = [];
export const tracers = [];
export const pickups = [];
export const enemies = [];
export const hotbarEls = [];
export const biomeTerrainColors = {};

export const input = {
    keys: {},
    mouseButtons: { 0: false, 1: false, 2: false },
    jumpQueued: false,
    fireLatch: false
};

export const viewModel = {
    root: null,
    arm: null,
    models: {},
    currentKey: "empty",
    kick: 0,
    bobPhase: 0,
    muzzleTimer: 0,
    aimBlend: 0
};

// ── Hotbar helpers ──────────────────────────────────────────
export function createEmptySlotItem() {
    return { kind: "empty", name: "Unarmed", short: "Unarmed" };
}

export function createWeaponSlotItem(weaponId) {
    const def = weaponDefs[weaponId];
    return {
        kind: "weapon",
        weaponId,
        name: def ? def.label : weaponId,
        short: def ? def.short : weaponId
    };
}

export const hotbar = [
    createWeaponSlotItem("pistol"),
    createEmptySlotItem(),
    createEmptySlotItem(),
    createEmptySlotItem()
];

export function ensureStarterLoadout() {
    if (!hotbar[0] || hotbar[0].kind !== "weapon") {
        hotbar[0] = createWeaponSlotItem("pistol");
    }
    if (player.ammo.pistol.mag <= 0 && player.ammo.pistol.reserve <= 0) {
        player.ammo.pistol.mag = weaponDefs.pistol.magazine;
        player.ammo.pistol.reserve = 24;
    }
}

// ── Utility functions ───────────────────────────────────────
export function vec3(x, y, z) {
    return new BABYLON.Vector3(x, y, z);
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function chunkKey(x, z) {
    return x + "|" + z;
}

export function fract(value) {
    return value - Math.floor(value);
}

export function hash2(x, z) {
    return fract(Math.sin(x * 127.1 + z * 311.7 + CONFIG.seed * 13.17) * 43758.5453);
}

export function smoothNoise(x, z) {
    const x0 = Math.floor(x);
    const z0 = Math.floor(z);
    const fx = x - x0;
    const fz = z - z0;
    const v00 = hash2(x0, z0);
    const v10 = hash2(x0 + 1, z0);
    const v01 = hash2(x0, z0 + 1);
    const v11 = hash2(x0 + 1, z0 + 1);
    const ux = fx * fx * (3 - 2 * fx);
    const uz = fz * fz * (3 - 2 * fz);
    const nx0 = BABYLON.Scalar.Lerp(v00, v10, ux);
    const nx1 = BABYLON.Scalar.Lerp(v01, v11, ux);
    return BABYLON.Scalar.Lerp(nx0, nx1, uz);
}

export function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
    return t * t * (3 - 2 * t);
}

export function getBiomeBlend(x, z) {
    const temperature = smoothNoise(x * 0.03 + 100, z * 0.03 - 45);
    const moisture = smoothNoise(x * 0.03 - 80, z * 0.03 + 12);
    let desert = smoothstep(0.56, 0.76, temperature) * (1 - smoothstep(0.36, 0.52, moisture));
    let snow = 1 - smoothstep(0.22, 0.38, temperature);
    let forest = smoothstep(0.5, 0.7, moisture) * smoothstep(0.24, 0.46, temperature) * (1 - desert) * (1 - snow * 0.7);
    let meadow = Math.max(0, 1 - desert - snow - forest);
    const total = meadow + forest + desert + snow;

    if (total <= 0.0001) {
        return { meadow: 1, forest: 0, desert: 0, snow: 0, temperature, moisture };
    }

    return {
        meadow: meadow / total,
        forest: forest / total,
        desert: desert / total,
        snow: snow / total,
        temperature,
        moisture
    };
}

export function terrainHeight(x, z) {
    const blend = getBiomeBlend(x, z);
    const macro = smoothNoise(x * 0.0045, z * 0.0045) * 2 - 1;
    const ridge = Math.abs(smoothNoise(x * 0.018 + 180, z * 0.018 - 240) * 2 - 1);
    const detail = smoothNoise(x * 0.065 - 90, z * 0.065 + 120) * 2 - 1;

    const meadowHeight = GAME_DATA.world.flatHeight + macro * 1.7 + detail * 0.55;
    const forestHeight = GAME_DATA.world.flatHeight + 0.7 + macro * 2.1 + detail * 0.75;
    const desertHeight = GAME_DATA.world.flatHeight - 0.35 + macro * 0.8 + ridge * 1.85 + detail * 0.35;
    const snowHeight = GAME_DATA.world.flatHeight + 1.4 + macro * 3 + ridge * 1.25 + detail * 1.05;

    let height = meadowHeight * blend.meadow +
        forestHeight * blend.forest +
        desertHeight * blend.desert +
        snowHeight * blend.snow;

    const valley = (smoothNoise(x * 0.011 + 420, z * 0.011 - 370) * 2 - 1) * 0.55;
    height += valley;
    return clamp(height, GAME_DATA.world.heightMin, 18);
}

export function isPointerLocked() {
    return document.pointerLockElement === canvas;
}

export function canControlGame() {
    return !state.dead && !state.inventoryOpen && !state.settingsOpen;
}

export function currentHotbarItem() {
    return hotbar[player.slot] || createEmptySlotItem();
}

export function currentWeaponDef() {
    const item = currentHotbarItem();
    return item.kind === "weapon" ? weaponDefs[item.weaponId] : null;
}

export function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

// ── Audio ───────────────────────────────────────────────────
export const audio = {
    context: null,
    ensure() {
        if (!this.context) {
            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextCtor) return null;
            this.context = new AudioContextCtor();
        }
        if (this.context.state === "suspended") this.context.resume();
        return this.context;
    },
    pulse(freq, duration, gain, type, endFreq) {
        const ctx = this.ensure();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = type || "square";
        osc.frequency.setValueAtTime(freq, now);
        if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
        amp.gain.setValueAtTime(gain, now);
        amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(amp);
        amp.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    },
    noise(duration, gain) {
        const ctx = this.ensure();
        if (!ctx) return;
        const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        }
        const source = ctx.createBufferSource();
        const amp = ctx.createGain();
        source.buffer = buffer;
        amp.gain.value = gain;
        source.connect(amp);
        amp.connect(ctx.destination);
        source.start();
    },
    playShoot(weaponId) {
        if (weaponId === "rifle") this.pulse(180, 0.06, 0.032, "sawtooth", 110);
        else this.pulse(240, 0.07, 0.03, "square", 130);
    },
    playHit() { this.pulse(560, 0.04, 0.018, "triangle", 360); },
    playBlock() { this.pulse(190, 0.05, 0.014, "square", 120); },
    playPickup() { this.pulse(480, 0.08, 0.022, "triangle", 760); },
    playDamage() {
        this.noise(0.06, 0.014);
        this.pulse(120, 0.1, 0.02, "sawtooth", 80);
    },
    playReload() {
        this.pulse(290, 0.05, 0.012, "square", 180);
        this.pulse(360, 0.05, 0.01, "square", 260);
    },
    playDry() { this.pulse(110, 0.04, 0.01, "square", 70); },
    playEnemyDown() { this.pulse(210, 0.08, 0.018, "triangle", 100); }
};

// ── Timer animation ─────────────────────────────────────────
export function animateTimers(dt) {
    state.damageFlashTimer = Math.max(0, state.damageFlashTimer - dt);
    if (state.statusHintTimer > 0) {
        state.statusHintTimer = Math.max(0, state.statusHintTimer - dt);
        if (state.statusHintTimer <= 0) state.statusHint = "";
    }
}
