"use strict";

var canvas = document.getElementById("gameCanvas");
var engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true
});
var scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.68, 0.84, 0.98, 1);
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogDensity = 0.012;
scene.collisionsEnabled = true;
scene.skipPointerMovePicking = true;
scene.gravity = new BABYLON.Vector3(0, -0.35, 0);

var dom = {
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

function createEmptySlotItem() {
    return {
        kind: "empty",
        name: "Unarmed",
        short: "Unarmed"
    };
}

function createWeaponSlotItem(weaponId) {
    var def = weaponDefs[weaponId];
    return {
        kind: "weapon",
        weaponId: weaponId,
        name: def ? def.label : weaponId,
        short: def ? def.short : weaponId
    };
}

var weaponDefs = cloneData(GAME_DATA.weapons);

var hotbar = [
    createWeaponSlotItem("pistol"),
    createEmptySlotItem(),
    createEmptySlotItem(),
    createEmptySlotItem()
];

var BLOCK_TYPES = {
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

var materials = {};
var particleMaterials = {};
var particles = [];
var tracers = [];
var pickups = [];
var enemies = [];
var hotbarEls = [];

var input = {
    keys: {},
    mouseButtons: { 0: false, 1: false, 2: false },
    jumpQueued: false,
    fireLatch: false
};

function ensureStarterLoadout() {
    if (!hotbar[0] || hotbar[0].kind !== "weapon") {
        hotbar[0] = createWeaponSlotItem("pistol");
    }
    if (player.ammo.pistol.mag <= 0 && player.ammo.pistol.reserve <= 0) {
        player.ammo.pistol.mag = weaponDefs.pistol.magazine;
        player.ammo.pistol.reserve = 24;
    }
}

var viewModel = {
    root: null,
    arm: null,
    models: {},
    currentKey: "empty",
    kick: 0,
    bobPhase: 0,
    muzzleTimer: 0,
    aimBlend: 0
};

function vec3(x, y, z) {
    return new BABYLON.Vector3(x, y, z);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function chunkKey(x, z) {
    return x + "|" + z;
}

function fract(value) {
    return value - Math.floor(value);
}

function hash2(x, z) {
    return fract(Math.sin(x * 127.1 + z * 311.7 + CONFIG.seed * 13.17) * 43758.5453);
}

function smoothNoise(x, z) {
    var x0 = Math.floor(x);
    var z0 = Math.floor(z);
    var fx = x - x0;
    var fz = z - z0;
    var v00 = hash2(x0, z0);
    var v10 = hash2(x0 + 1, z0);
    var v01 = hash2(x0, z0 + 1);
    var v11 = hash2(x0 + 1, z0 + 1);
    var ux = fx * fx * (3 - 2 * fx);
    var uz = fz * fz * (3 - 2 * fz);
    var nx0 = BABYLON.Scalar.Lerp(v00, v10, ux);
    var nx1 = BABYLON.Scalar.Lerp(v01, v11, ux);
    return BABYLON.Scalar.Lerp(nx0, nx1, uz);
}

function smoothstep(edge0, edge1, value) {
    var t = clamp((value - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
    return t * t * (3 - 2 * t);
}

function getBiomeBlend(x, z) {
    var temperature = smoothNoise(x * 0.03 + 100, z * 0.03 - 45);
    var moisture = smoothNoise(x * 0.03 - 80, z * 0.03 + 12);
    var desert = smoothstep(0.56, 0.76, temperature) * (1 - smoothstep(0.36, 0.52, moisture));
    var snow = 1 - smoothstep(0.22, 0.38, temperature);
    var forest = smoothstep(0.5, 0.7, moisture) * smoothstep(0.24, 0.46, temperature) * (1 - desert) * (1 - snow * 0.7);
    var meadow = Math.max(0, 1 - desert - snow - forest);
    var total = meadow + forest + desert + snow;

    if (total <= 0.0001) {
        return {
            meadow: 1,
            forest: 0,
            desert: 0,
            snow: 0,
            temperature: temperature,
            moisture: moisture
        };
    }

    return {
        meadow: meadow / total,
        forest: forest / total,
        desert: desert / total,
        snow: snow / total,
        temperature: temperature,
        moisture: moisture
    };
}

function terrainHeight(x, z) {
    var blend = getBiomeBlend(x, z);
    var macro = smoothNoise(x * 0.0045, z * 0.0045) * 2 - 1;
    var ridge = Math.abs(smoothNoise(x * 0.018 + 180, z * 0.018 - 240) * 2 - 1);
    var detail = smoothNoise(x * 0.065 - 90, z * 0.065 + 120) * 2 - 1;

    var meadowHeight = GAME_DATA.world.flatHeight + macro * 1.7 + detail * 0.55;
    var forestHeight = GAME_DATA.world.flatHeight + 0.7 + macro * 2.1 + detail * 0.75;
    var desertHeight = GAME_DATA.world.flatHeight - 0.35 + macro * 0.8 + ridge * 1.85 + detail * 0.35;
    var snowHeight = GAME_DATA.world.flatHeight + 1.4 + macro * 3 + ridge * 1.25 + detail * 1.05;

    var height = meadowHeight * blend.meadow +
        forestHeight * blend.forest +
        desertHeight * blend.desert +
        snowHeight * blend.snow;

    var valley = (smoothNoise(x * 0.011 + 420, z * 0.011 - 370) * 2 - 1) * 0.55;
    height += valley;
    return clamp(height, GAME_DATA.world.heightMin, 18);
}

function isPointerLocked() {
    return document.pointerLockElement === canvas;
}

function canControlGame() {
    return isPointerLocked() && !state.dead && !state.inventoryOpen && !state.settingsOpen;
}

function currentHotbarItem() {
    return hotbar[player.slot] || createEmptySlotItem();
}

function currentWeaponDef() {
    var item = currentHotbarItem();
    return item.kind === "weapon" ? weaponDefs[item.weaponId] : null;
}

function animateTimers(dt) {
    state.damageFlashTimer = Math.max(0, state.damageFlashTimer - dt);
    if (state.statusHintTimer > 0) {
        state.statusHintTimer = Math.max(0, state.statusHintTimer - dt);
        if (state.statusHintTimer <= 0) {
            state.statusHint = "";
        }
    }
}

function runFrame() {
    var dt = Math.min(engine.getDeltaTime() / 1000, 0.033);
    animateTimers(dt);
    if (typeof updateProgressionSystems === "function") {
        updateProgressionSystems(dt);
    }
    updateParticles(dt);
    updateTracers(dt);

    if (!state.dead) {
        updatePlayerMovement(dt);
    }

    updateWorldStreaming();
    updatePickups(dt);

    if (!state.dead) {
        updateCombat(dt);
        updateEnemies(dt);
    }

    updateBlockHighlight();
    updateHotbarUI();
    updateHUD();
    scene.render();
}

function bootstrapGame() {
    ensureStarterLoadout();
    ensureMaterialCatalog();
    createSkyAndLights();
    createPlayer();
    initializeProgression();
    generateWorld();
    createViewModel();
    buildHotbarUI();
    registerInput();
    setSlot(0);
    respawnPlayer();

    engine.runRenderLoop(runFrame);
    window.addEventListener("resize", function () {
        engine.resize();
    });
}

window.addEventListener("load", bootstrapGame);
