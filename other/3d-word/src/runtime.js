import { GAME_DATA } from "./data.js";

function createAmmoState() {
    const ammo = {};
    for (const weaponId of Object.keys(GAME_DATA.weapons)) {
        ammo[weaponId] = { mag: 0, reserve: 0 };
    }
    return ammo;
}

export const CONFIG = {
    seed: 27,
    minWorldY: GAME_DATA.world.heightMin,
    chunkSize: GAME_DATA.world.chunkSize,
    chunkResolution: GAME_DATA.world.chunkResolution,
    activeChunkRadius: GAME_DATA.world.activeChunkRadius,
    unloadChunkRadius: GAME_DATA.world.unloadChunkRadius,
    playerHalfWidth: 0.38,
    playerHalfHeight: 0.9,
    playerSpeed: 6.6,
    crouchMultiplier: 0.58,
    jumpSpeed: 7.3,
    gravity: -20,
    mouseSensitivity: 0.0023,
    cameraPivotHeight: 1.22,
    cameraPivotCrouchHeight: 1.0,
    cameraRootHeight: 0.92,
    cameraRootCrouchHeight: 0.68,
    cameraShoulderX: 0,
    cameraAimShoulderX: 0,
    cameraFocusHeight: 0.24,
    cameraFocusCrouchHeight: 0.16,
    cameraFocusForward: 1.45,
    cameraFollowDistance: -12,
    cameraAimDistance: -6,
    cameraMinDistance: -18,
    cameraMaxDistance: -4,
    enemySight: 18,
    enemyAttackRange: 2.45
};

export const state = {
    dead: false,
    damageFlashTimer: 0,
    spawnLockTimer: 0,
    inventoryOpen: false,
    settingsOpen: false,
    cameraMode: "third",
    statusHint: "",
    statusHintTimer: 0
};

export const world = {
    chunks: new Map(),
    terrainMeshCount: 0,
    propCount: 0,
    currentChunkX: 0,
    currentChunkZ: 0,
    currentBiomeId: "meadow",
    enemySerial: 0
};

export const player = {
    body: null,
    facingNode: null,
    yawNode: null,
    pitchNode: null,
    cameraRoot: null,
    cameraFocus: null,
    camera: null,
    yaw: 0,
    facingYaw: 0,
    pitch: 0,
    velocityY: 0,
    health: 100,
    maxHealth: 100,
    stats: null,
    slot: 0,
    ammo: createAmmoState(),
    primaryCooldown: 0,
    reloading: null,
    reloadTimer: 0,
    attackAnimTimer: 0,
    attackAnimDuration: 0,
    attackAnimStyle: "idle",
    spawnPoint: new BABYLON.Vector3(0, 4, 0),
    grounded: false,
    stuckCounter: 0,
    moveTarget: null,
    avatar: null
};

export { createAmmoState };
