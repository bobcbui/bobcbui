import { GAME_DATA } from "./data.js";
import { CONFIG, state, world, player } from "./runtime.js";
import {
    canvas, engine, scene, dom,
    materials, tracers, enemies, hotbarEls,
    weaponDefs, input, viewModel, hotbar,
    vec3, clamp, lerp,
    canControlGame,
    currentHotbarItem, currentWeaponDef, normalizeAngle,
    createEmptySlotItem, createWeaponSlotItem, ensureStarterLoadout,
    audio
} from "./shared.js";
import { getTerrainSurfaceHeight, getTerrainImpactColor, spawnBurst } from "./world.js";
import { damageEnemy } from "./enemy.js";
import {
    progression, setStatusHint, resolvePlayerStats,
    getSkillUpgradeCost, upgradeSkill, triggerSkillCooldown,
    useHealingPotion, useBuffPotion,
    equipEquipment, unequipEquipment,
    registerTravelDistance
} from "./progression.js";

// ── Tracers ─────────────────────────────────────────────────
function ensureTracerMaterial() {
    if (!materials.tracer) {
        materials.tracer = new BABYLON.StandardMaterial("tracer-mat", scene);
        materials.tracer.diffuseColor = new BABYLON.Color3(0.2, 0.95, 0.34);
        materials.tracer.emissiveColor = new BABYLON.Color3(0.18, 1, 0.3);
        materials.tracer.alpha = 0.88;
        materials.tracer.disableLighting = true;
        materials.tracer.backFaceCulling = false;
    }
    if (!materials.tracerCore) {
        materials.tracerCore = new BABYLON.StandardMaterial("tracer-core-mat", scene);
        materials.tracerCore.diffuseColor = new BABYLON.Color3(0.9, 1, 0.92);
        materials.tracerCore.emissiveColor = new BABYLON.Color3(0.4, 1, 0.48);
        materials.tracerCore.alpha = 0.98;
        materials.tracerCore.disableLighting = true;
        materials.tracerCore.backFaceCulling = false;
    }
    return materials.tracer;
}

function spawnTracer(from, to) {
    if (!from || !to || BABYLON.Vector3.DistanceSquared(from, to) < 0.001) return;
    const tracer = BABYLON.MeshBuilder.CreateTube("bullet-tracer", { path: [from, to], radius: 0.07, cap: BABYLON.Mesh.CAP_ALL }, scene);
    tracer.material = ensureTracerMaterial();
    tracer.isPickable = false;
    tracer.checkCollisions = false;
    tracer.renderingGroupId = 1;
    tracer.alwaysSelectAsActiveMesh = true;

    const tracerCore = BABYLON.MeshBuilder.CreateTube("bullet-tracer-core", { path: [from, to], radius: 0.025, cap: BABYLON.Mesh.CAP_ALL }, scene);
    tracerCore.material = materials.tracerCore;
    tracerCore.isPickable = false;
    tracerCore.checkCollisions = false;
    tracerCore.renderingGroupId = 1;
    tracerCore.alwaysSelectAsActiveMesh = true;

    tracers.push({ meshes: [tracer, tracerCore], life: 0.15, maxLife: 0.15 });
}

function updateTracers(dt) {
    for (let i = tracers.length - 1; i >= 0; i--) {
        const t = tracers[i];
        t.life -= dt;
        if (t.life <= 0) {
            t.meshes.forEach(m => m.dispose(false, true));
            tracers.splice(i, 1);
            continue;
        }
        const alpha = clamp(t.life / t.maxLife, 0, 1);
        t.meshes.forEach(m => { m.visibility = alpha; });
    }
}

// ── Hotbar slot helpers ─────────────────────────────────────
function findWeaponSlot(weaponId) {
    return hotbar.findIndex(item => item.kind === "weapon" && item.weaponId === weaponId);
}

function ensureWeaponSlot(weaponId) {
    const existing = findWeaponSlot(weaponId);
    if (existing >= 0) return existing;
    const empty = hotbar.findIndex(item => item.kind === "empty");
    if (empty === -1) {
        hotbar.push(createWeaponSlotItem(weaponId));
        buildHotbarUI();
        return hotbar.length - 1;
    }
    hotbar[empty] = createWeaponSlotItem(weaponId);
    buildHotbarUI();
    return empty;
}

export function grantWeaponPickup(weaponId) {
    const slotIndex = ensureWeaponSlot(weaponId);
    const def = weaponDefs[weaponId];
    const ammo = player.ammo[weaponId];
    const reserveGain = Math.max(12, Math.round(def.magazine * 2));
    const alreadyOwned = ammo.mag > 0 || ammo.reserve > 0;
    if (alreadyOwned) {
        ammo.reserve += reserveGain;
    } else {
        ammo.mag = def.magazine;
        ammo.reserve = Math.round(def.reserve * 0.5);
    }
    if (!currentWeaponDef()) {
        setSlot(slotIndex);
    } else {
        updateHotbarUI();
    }
}

// ── Overlay panels ──────────────────────────────────────────
function isAnyOverlayOpen() {
    return !!(state.inventoryOpen || state.settingsOpen);
}

function closeOverlayPanels() {
    state.inventoryOpen = false;
    state.settingsOpen = false;
}

function toggleInventoryPanel(forceValue) {
    const nextValue = typeof forceValue === "boolean" ? forceValue : !state.inventoryOpen;
    state.inventoryOpen = nextValue;
    if (nextValue) {
        state.settingsOpen = false;
        input.mouseButtons[0] = false;
        input.mouseButtons[1] = false;
        input.mouseButtons[2] = false;
        input.fireLatch = false;
        if (typeof document.exitPointerLock === "function") document.exitPointerLock();
        updateInventoryUI();
    }
}

function toggleSettingsPanel(forceValue) {
    const nextValue = typeof forceValue === "boolean" ? forceValue : !state.settingsOpen;
    state.settingsOpen = nextValue;
    if (nextValue) {
        state.inventoryOpen = false;
        input.mouseButtons[0] = false;
        input.mouseButtons[1] = false;
        input.mouseButtons[2] = false;
        input.fireLatch = false;
        if (typeof document.exitPointerLock === "function") document.exitPointerLock();
        updateSettingsUI();
    }
}

function toggleCameraMode(forceMode) {
    if (forceMode === "first" || forceMode === "third") {
        state.cameraMode = forceMode;
    } else {
        state.cameraMode = state.cameraMode === "third" ? "first" : "third";
    }
    setStatusHint(state.cameraMode === "third" ? "Camera: Third-person" : "Camera: First-person", 1.6);
    updateSettingsUI();
}

// ── Inventory / Settings UI ─────────────────────────────────
function getEquipmentStatText(item) {
    if (!item || !item.stats) return "No bonuses";
    const lines = [];
    if (item.stats.maxHealth) lines.push("HP +" + item.stats.maxHealth);
    if (item.stats.attack) lines.push("ATK +" + item.stats.attack);
    if (item.stats.defense) lines.push("DEF +" + item.stats.defense);
    if (item.stats.moveSpeed) lines.push("SPD +" + Math.round(item.stats.moveSpeed * 100) + "%");
    if (item.stats.pickupRadius) lines.push("Loot +" + item.stats.pickupRadius.toFixed(2));
    return lines.join(" | ") || "No bonuses";
}

function updateInventoryUI() {
    if (!dom.inventoryContent) return;

    const healPotions = progression.potionBag.heal || 0;
    const buffPotions = progression.potionBag.buff || 0;
    const buffTimer = progression.activeBuff.timer > 0 ? Math.ceil(progression.activeBuff.timer) + "s" : "inactive";

    const skillsHtml = Object.keys(progression.skills).map(skillId => {
        const skill = progression.skills[skillId];
        const upgradeCost = getSkillUpgradeCost(skillId);
        const cooldown = skill.cooldown > 0 ? skill.cooldown.toFixed(1) + "s" : "Ready";
        const canUpgrade = skill.level < skill.maxLevel;
        return "<div class=\"inventory-line\">" +
            "<div><strong>" + skill.name + " Lv." + skill.level + "</strong><br><span>" + cooldown + "</span></div>" +
            "<div>" + (canUpgrade
                ? "<button class=\"secondary mini-btn\" data-action=\"upgrade-skill\" data-skill-id=\"" + skillId + "\">Upgrade (" + upgradeCost + " book)</button>"
                : "<span class=\"muted\">MAX</span>") +
            "</div></div>";
    }).join("");

    const equipmentSlots = Object.keys(progression.equipment).map(slot => {
        const equipped = progression.equipment[slot];
        return "<div class=\"inventory-line\">" +
            "<div><strong>" + slot.toUpperCase() + "</strong><br><span>" + (equipped ? equipped.name : "Empty") + "</span></div>" +
            "<div>" + (equipped
                ? "<button class=\"secondary mini-btn\" data-action=\"unequip-slot\" data-slot=\"" + slot + "\">Unequip</button>"
                : "<span class=\"muted\">-</span>") +
            "</div></div>";
    }).join("");

    const bagItems = progression.equipmentBag.length
        ? progression.equipmentBag.map(item =>
            "<div class=\"inventory-line\">" +
            "<div><strong>" + item.name + "</strong><br><span>" + getEquipmentStatText(item) + "</span></div>" +
            "<div><button class=\"secondary mini-btn\" data-action=\"equip-item\" data-item-id=\"" + item.id + "\">Equip</button></div></div>"
        ).join("")
        : "<p class=\"muted\">No spare equipment yet.</p>";

    const questsHtml = Object.keys(progression.quests).map(questId => {
        const quest = progression.quests[questId];
        return "<div class=\"inventory-line\">" +
            "<div><strong>" + quest.label + " Lv." + quest.level + "</strong><br><span>" + quest.progress + " / " + quest.target + "</span></div>" +
            "<div><span class=\"muted\">+" + quest.rewardXp + " XP</span></div></div>";
    }).join("");

    dom.inventoryContent.innerHTML =
        "<div class=\"card\">" +
        "<h3>Resources</h3>" +
        "<p>Gold: <strong>" + progression.gold + "</strong> | Skill Books: <strong>" + progression.skillBooks + "</strong></p>" +
        "<div class=\"actions\">" +
        "<button class=\"secondary mini-btn\" data-action=\"use-heal\">Recovery Potion x" + healPotions + "</button>" +
        "<button class=\"secondary mini-btn\" data-action=\"use-buff\">Battle Tonic x" + buffPotions + "</button>" +
        "</div>" +
        "<p>Active Buff: " + buffTimer + "</p>" +
        "</div>" +
        "<div class=\"card\"><h3>Skills</h3>" + skillsHtml + "</div>" +
        "<div class=\"card\"><h3>Equipped</h3>" + equipmentSlots + "</div>" +
        "<div class=\"card\"><h3>Equipment Bag</h3>" + bagItems + "</div>" +
        "<div class=\"card\"><h3>Quest Board</h3>" + questsHtml + "</div>";
}

function updateSettingsUI() {
    if (!dom.settingsContent) return;
    const modeLabel = state.cameraMode === "third" ? "Third-person" : "First-person";
    dom.settingsContent.innerHTML =
        "<div class=\"card\">" +
        "<h3>Perspective</h3>" +
        "<p>Current: <strong>" + modeLabel + "</strong></p>" +
        "<div class=\"actions\"><button class=\"secondary mini-btn\" data-action=\"toggle-camera\">Switch Perspective (V)</button></div>" +
        "</div>" +
        "<div class=\"card\">" +
        "<h3>Mouse Sensitivity</h3>" +
        "<p>Value: <strong>" + CONFIG.mouseSensitivity.toFixed(4) + "</strong></p>" +
        "<div class=\"actions\">" +
        "<button class=\"secondary mini-btn\" data-action=\"sens-down\">-</button>" +
        "<button class=\"secondary mini-btn\" data-action=\"sens-up\">+</button>" +
        "</div></div>";
}

// ── Skills ──────────────────────────────────────────────────
function castShockwaveSkill() {
    const skill = progression.skills.shockwave;
    if (!skill) return false;
    if (skill.cooldown > 0) {
        setStatusHint("Shockwave cooldown: " + skill.cooldown.toFixed(1) + "s", 1.2);
        return false;
    }
    const radius = 3.6 + skill.level * 0.8;
    const damage = 20 + skill.level * 7 + (player.stats ? Math.round(player.stats.attack * 0.9) : 0);
    const center = player.body.position.clone();
    let hitCount = 0;
    enemies.forEach(enemy => {
        if (!enemy || enemy.state === "dead") return;
        const dx = enemy.root.position.x - center.x;
        const dz = enemy.root.position.z - center.z;
        if (dx * dx + dz * dz <= radius * radius) {
            hitCount++;
            damageEnemy(enemy, damage, enemy.root.position.add(vec3(0, 1.4, 0)));
        }
    });
    spawnBurst(center.add(vec3(0, 1, 0)), "#6ec8ff", 20, 0.12, 5.2);
    triggerSkillCooldown("shockwave", Math.max(1.2, skill.baseCooldown - (skill.level - 1) * 0.65));
    setStatusHint("Shockwave cast" + (hitCount ? " (" + hitCount + " hits)" : ""), 1.6);
    return true;
}

function castOverdriveSkill() {
    const skill = progression.skills.overdrive;
    if (!skill) return false;
    if (skill.cooldown > 0) {
        setStatusHint("Overdrive cooldown: " + skill.cooldown.toFixed(1) + "s", 1.2);
        return false;
    }
    const duration = 5 + skill.level * 1.4;
    progression.activeBuff.name = "Overdrive";
    progression.activeBuff.timer = Math.max(progression.activeBuff.timer, duration);
    progression.activeBuff.attack = Math.max(progression.activeBuff.attack, 3 + skill.level * 2);
    progression.activeBuff.defense = Math.max(progression.activeBuff.defense, 1 + skill.level);
    progression.activeBuff.moveSpeed = Math.max(progression.activeBuff.moveSpeed, 0.08 + skill.level * 0.03);
    progression.activeBuff.pickupRadius = Math.max(progression.activeBuff.pickupRadius, 0.15 + skill.level * 0.05);
    progression.activeBuff.maxHealth = Math.max(progression.activeBuff.maxHealth, 4 + skill.level * 2);
    resolvePlayerStats();
    triggerSkillCooldown("overdrive", Math.max(2.4, skill.baseCooldown - (skill.level - 1) * 0.8));
    spawnBurst(player.body.position.add(vec3(0, 1.1, 0)), "#ffd27f", 18, 0.13, 4.6);
    setStatusHint("Overdrive active for " + Math.round(duration) + "s", 1.8);
    return true;
}

// ── Player Avatar ───────────────────────────────────────────
function createPlayerAvatar() {
    const skinMat = materials.enemySkin.clone("player-skin");
    const coatMat = materials.weaponMid.clone("player-coat");
    const trimMat = materials.weaponAccent.clone("player-trim");
    const hairMat = materials.weaponDark.clone("player-hair");

    const avatar = {
        root: new BABYLON.TransformNode("player-avatar", scene),
        torso: new BABYLON.TransformNode("player-avatar-torso", scene),
        head: null,
        leftArm: new BABYLON.TransformNode("player-avatar-larm", scene),
        rightArm: new BABYLON.TransformNode("player-avatar-rarm", scene),
        leftLeg: new BABYLON.TransformNode("player-avatar-lleg", scene),
        rightLeg: new BABYLON.TransformNode("player-avatar-rleg", scene),
        parts: [],
        walkPhase: 0
    };

    avatar.root.parent = player.body;
    avatar.torso.parent = avatar.root;
    avatar.leftArm.parent = avatar.root;
    avatar.rightArm.parent = avatar.root;
    avatar.leftLeg.parent = avatar.root;
    avatar.rightLeg.parent = avatar.root;

    function makePart(name, size, parent, posOffset, mat) {
        const part = BABYLON.MeshBuilder.CreateBox(name, size, scene);
        part.parent = parent;
        part.position.copyFrom(posOffset);
        part.material = mat;
        part.checkCollisions = false;
        part.isPickable = false;
        avatar.parts.push(part);
        return part;
    }

    makePart("player-body-core", { width: 0.86, height: 1.08, depth: 0.48 }, avatar.torso, vec3(0, 1.38, 0), coatMat);
    makePart("player-body-trim", { width: 0.9, height: 0.24, depth: 0.5 }, avatar.torso, vec3(0, 0.96, -0.01), trimMat);
    avatar.head = makePart("player-head", { width: 0.62, height: 0.62, depth: 0.62 }, avatar.root, vec3(0, 2.23, 0), skinMat);
    makePart("player-hair", { width: 0.68, height: 0.24, depth: 0.68 }, avatar.head, vec3(0, 0.21, 0.02), hairMat);
    makePart("player-eye-left", { width: 0.08, height: 0.08, depth: 0.08 }, avatar.head, vec3(-0.12, 0.03, -0.31), materials.uiGlow);
    makePart("player-eye-right", { width: 0.08, height: 0.08, depth: 0.08 }, avatar.head, vec3(0.12, 0.03, -0.31), materials.uiGlow);
    makePart("player-arm-left", { width: 0.24, height: 0.9, depth: 0.24 }, avatar.leftArm, vec3(0, -0.42, 0), coatMat);
    makePart("player-arm-right", { width: 0.24, height: 0.9, depth: 0.24 }, avatar.rightArm, vec3(0, -0.42, 0), coatMat);
    makePart("player-leg-left", { width: 0.3, height: 0.96, depth: 0.3 }, avatar.leftLeg, vec3(0, -0.48, 0), hairMat);
    makePart("player-leg-right", { width: 0.3, height: 0.96, depth: 0.3 }, avatar.rightLeg, vec3(0, -0.48, 0), hairMat);

    avatar.leftArm.position.set(-0.58, 1.86, 0);
    avatar.rightArm.position.set(0.58, 1.86, 0);
    avatar.leftLeg.position.set(-0.2, 0.96, 0);
    avatar.rightLeg.position.set(0.2, 0.96, 0);

    player.avatar = avatar;
}

function updatePlayerAvatar(dt, moveRatio, crouching, aiming) {
    if (!player.avatar) return;
    const avatar = player.avatar;
    const walkSpeed = player.grounded ? lerp(2.4, 10.5, clamp(moveRatio, 0, 1)) : 2.4;
    avatar.walkPhase += dt * walkSpeed;

    const swing = Math.sin(avatar.walkPhase) * 0.75 * clamp(moveRatio, 0, 1);
    const armLift = aiming ? -0.45 : -0.12;
    const crouchOffset = crouching ? -0.18 : 0;

    avatar.root.position.y = lerp(avatar.root.position.y, crouchOffset, dt * 10);
    avatar.torso.rotation.x = lerp(avatar.torso.rotation.x, (crouching ? 0.18 : 0) + (aiming ? -0.08 : 0), dt * 10);
    avatar.head.rotation.x = lerp(avatar.head.rotation.x, -player.pitch * 0.35, dt * 8);
    avatar.leftArm.rotation.x = lerp(avatar.leftArm.rotation.x, armLift + swing, dt * 10);
    avatar.rightArm.rotation.x = lerp(avatar.rightArm.rotation.x, armLift - swing, dt * 10);
    avatar.leftLeg.rotation.x = lerp(avatar.leftLeg.rotation.x, -swing, dt * 10);
    avatar.rightLeg.rotation.x = lerp(avatar.rightLeg.rotation.x, swing, dt * 10);
}

// ── Player Body ─────────────────────────────────────────────
export function createPlayer() {
    player.body = BABYLON.MeshBuilder.CreateBox("player-body", { width: 0.76, height: 1.8, depth: 0.76 }, scene);
    player.body.isVisible = false;
    player.body.isPickable = false;
    player.body.checkCollisions = true;
    player.body.ellipsoid = new BABYLON.Vector3(CONFIG.playerHalfWidth, CONFIG.playerHalfHeight, CONFIG.playerHalfWidth);
    player.body.ellipsoidOffset = BABYLON.Vector3.Zero();
    player.facingNode = new BABYLON.TransformNode("player-facing", scene);
    player.facingNode.parent = player.body;
    createPlayerAvatar();
    player.avatar.root.parent = player.facingNode;

    player.yawNode = new BABYLON.TransformNode("player-yaw", scene);
    player.pitchNode = new BABYLON.TransformNode("player-pitch", scene);
    player.yawNode.parent = player.body;
    player.pitchNode.parent = player.yawNode;
    player.pitchNode.position.y = CONFIG.cameraPivotHeight;

    player.cameraRoot = new BABYLON.TransformNode("camera-root", scene);
    player.cameraRoot.parent = player.pitchNode;
    player.cameraRoot.position.y = CONFIG.cameraRootHeight;
    player.cameraFocus = new BABYLON.TransformNode("camera-focus", scene);
    player.cameraFocus.parent = player.pitchNode;
    player.cameraFocus.position.set(0, CONFIG.cameraFocusHeight, CONFIG.cameraFocusForward);

    player.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(CONFIG.cameraShoulderX, 0, CONFIG.cameraFollowDistance), scene);
    player.camera.parent = player.cameraRoot;
    player.camera.rotation.set(0, 0, 0);
    player.camera.lockedTarget = null;
    player.camera.minZ = 0.1;
    player.camera.maxZ = 800;
    player.camera.fov = 0.85;
    player.camera.inputs.clear();
    scene.activeCamera = player.camera;
    player.body.position.copyFrom(player.spawnPoint);
}

// ── Ground / collision helpers ──────────────────────────────
function getGroundClearance(extraHeight) {
    return CONFIG.playerHalfHeight + (extraHeight === undefined ? 0.05 : extraHeight);
}

function getPlayerFootprintSurfaceHeight(x, z) {
    const inset = CONFIG.playerHalfWidth * 0.82;
    const offsets = [
        [0, 0], [inset, 0], [-inset, 0],
        [0, inset], [0, -inset],
        [inset, inset], [inset, -inset],
        [-inset, inset], [-inset, -inset]
    ];
    let maxH = getTerrainSurfaceHeight(x, z);
    for (const [ox, oz] of offsets) {
        maxH = Math.max(maxH, getTerrainSurfaceHeight(x + ox, z + oz));
    }
    return maxH;
}

function getGroundContactHeight(x, z) {
    const sampledSurfaceY = getPlayerFootprintSurfaceHeight(x, z);
    const start = new BABYLON.Vector3(x, Math.max(sampledSurfaceY + 8, 40), z);
    const ray = new BABYLON.Ray(start, BABYLON.Vector3.Down(), 80);
    const hit = scene.pickWithRay(ray, mesh => !!(mesh && mesh.metadata && mesh.metadata.kind === "terrain"), false);
    if (hit && hit.hit && hit.pickedPoint) return hit.pickedPoint.y;
    return sampledSurfaceY;
}

export function alignPlayerToSpawn(lockDuration) {
    const surfaceY = getGroundContactHeight(player.spawnPoint.x, player.spawnPoint.z);
    player.body.position.set(player.spawnPoint.x, surfaceY + getGroundClearance(0), player.spawnPoint.z);
    player.velocityY = 0;
    state.spawnLockTimer = lockDuration || 0.18;
    snapPlayerToGround(0);
}

function isGrounded() {
    const groundY = getGroundContactHeight(player.body.position.x, player.body.position.z);
    const feetY = player.body.position.y - CONFIG.playerHalfHeight;
    return feetY <= groundY + 0.08;
}

function enforceGroundClearance(extraHeight) {
    const surfaceY = getGroundContactHeight(player.body.position.x, player.body.position.z);
    const minAllowedY = surfaceY + getGroundClearance(extraHeight);
    const snapGap = player.body.position.y - minAllowedY;
    if (player.body.position.y < minAllowedY) {
        player.body.position.y = minAllowedY;
        if (player.velocityY < 0) player.velocityY = 0;
        return true;
    }
    if (player.velocityY <= 0 && snapGap < 0.18) {
        player.body.position.y = minAllowedY;
        return true;
    }
    return false;
}

function snapPlayerToGround(extraHeight) {
    if (!player.body || !scene) return false;
    const targetX = player.body.position.x;
    const targetZ = player.body.position.z;
    const sampledSurfaceY = getGroundContactHeight(targetX, targetZ);
    const clearance = getGroundClearance(extraHeight);
    const start = player.body.position.clone();
    start.y = Math.max(start.y + 4, 120);
    const ray = new BABYLON.Ray(start, BABYLON.Vector3.Down(), 200);
    const hit = scene.pickWithRay(ray, mesh => !!(mesh && mesh.metadata && mesh.metadata.kind === "terrain"), false);
    if (hit && hit.hit && hit.pickedPoint) {
        player.body.position.y = hit.pickedPoint.y + clearance;
        player.velocityY = 0;
        return true;
    }
    player.body.position.y = sampledSurfaceY + clearance;
    player.velocityY = 0;
    return false;
}

// ── Slot management ─────────────────────────────────────────
function setSlot(index) {
    player.slot = (index + hotbar.length) % hotbar.length;
    player.reloading = null;
    player.reloadTimer = 0;
    updateViewModelSelection();
    updateHotbarUI();
}

function startReload() {
    const item = currentHotbarItem();
    if (item.kind !== "weapon") return;
    const weapon = weaponDefs[item.weaponId];
    const ammo = player.ammo[item.weaponId];
    if (player.reloading || ammo.reserve <= 0 || ammo.mag >= weapon.magazine) return;
    player.reloading = item.weaponId;
    player.reloadTimer = weapon.reloadTime;
    audio.playReload();
}

function finishReload() {
    if (!player.reloading) return;
    const weaponId = player.reloading;
    const weapon = weaponDefs[weaponId];
    const ammo = player.ammo[weaponId];
    const need = weapon.magazine - ammo.mag;
    const taken = Math.min(need, ammo.reserve);
    ammo.mag += taken;
    ammo.reserve -= taken;
    player.reloading = null;
    player.reloadTimer = 0;
}

// ── Player damage / death / respawn ─────────────────────────
export function damagePlayer(amount, source) {
    if (state.dead) return;
    const defense = player.stats ? player.stats.defense : 0;
    const finalDamage = Math.max(1, Math.round(amount * (100 / (100 + defense * 12))));
    player.health -= finalDamage;
    state.damageFlashTimer = 0.28;
    audio.playDamage();
    if (player.health <= 0) {
        player.health = 0;
        state.dead = true;
        closeOverlayPanels();
        document.exitPointerLock();
        dom.deathPanel.classList.remove("hidden");
    }
}

function respawnPlayer() {
    resolvePlayerStats();
    player.health = player.maxHealth;
    player.velocityY = 0;
    player.reloading = null;
    player.reloadTimer = 0;
    ensureStarterLoadout();
    alignPlayerToSpawn(0.35);
    player.yaw = 0;
    player.facingYaw = 0;
    player.pitch = 0.25;
    player.facingNode.rotation.y = 0;
    player.yawNode.rotation.y = 0;
    player.pitchNode.rotation.x = 0.25;
    setSlot(0);
    state.dead = false;
    closeOverlayPanels();
    dom.deathPanel.classList.add("hidden");
}

// ── View model ──────────────────────────────────────────────
export function createViewModel() {
    viewModel.root = new BABYLON.TransformNode("view-root", scene);
    viewModel.root.parent = player.facingNode;
    viewModel.root.position.set(0.12, 0.4, 0.2);
    viewModel.root.scaling.set(1.1, 1.1, 1.1);

    viewModel.arm = BABYLON.MeshBuilder.CreateBox("view-arm", { width: 0.22, height: 0.78, depth: 0.24 }, scene);
    viewModel.arm.parent = viewModel.root;
    viewModel.arm.position.set(0.02, -0.04, 0.03);
    viewModel.arm.rotation.z = 0.25;
    viewModel.arm.material = materials.enemySkin;
    viewModel.arm.isPickable = false;

    function buildEmptyModel() {
        const root = new BABYLON.TransformNode("empty-model", scene);
        root.parent = viewModel.root;
        return root;
    }

    function buildPistolModel() {
        const root = new BABYLON.TransformNode("pistol-model", scene);
        root.parent = viewModel.root;
        const grip = BABYLON.MeshBuilder.CreateBox("pistol-grip", { width: 0.18, height: 0.56, depth: 0.16 }, scene);
        grip.parent = root; grip.position.set(0.18, -0.08, 0.18); grip.rotation.z = -0.22;
        grip.material = materials.weaponDark; grip.isPickable = false;
        const body = BABYLON.MeshBuilder.CreateBox("pistol-body", { width: 0.68, height: 0.22, depth: 0.22 }, scene);
        body.parent = root; body.position.set(0.34, 0.14, 0.22);
        body.material = materials.weaponMid; body.isPickable = false;
        const muzzle = BABYLON.MeshBuilder.CreateBox("pistol-muzzle", { width: 0.12, height: 0.12, depth: 0.12 }, scene);
        muzzle.parent = root; muzzle.position.set(0.72, 0.14, 0.22);
        muzzle.material = materials.uiGlow; muzzle.isVisible = false; muzzle.isPickable = false;
        root.metadata = { muzzle };
        return root;
    }

    function buildRifleModel() {
        const root = new BABYLON.TransformNode("rifle-model", scene);
        root.parent = viewModel.root;
        const stock = BABYLON.MeshBuilder.CreateBox("rifle-stock", { width: 0.3, height: 0.22, depth: 0.22 }, scene);
        stock.parent = root; stock.position.set(0.02, 0.03, 0.22);
        stock.material = materials.weaponDark; stock.isPickable = false;
        const body = BABYLON.MeshBuilder.CreateBox("rifle-body", { width: 0.8, height: 0.22, depth: 0.22 }, scene);
        body.parent = root; body.position.set(0.46, 0.06, 0.22);
        body.material = materials.weaponMid; body.isPickable = false;
        const barrel = BABYLON.MeshBuilder.CreateBox("rifle-barrel", { width: 0.72, height: 0.12, depth: 0.12 }, scene);
        barrel.parent = root; barrel.position.set(0.92, 0.08, 0.22);
        barrel.material = materials.weaponDark; barrel.isPickable = false;
        const magazine = BABYLON.MeshBuilder.CreateBox("rifle-magazine", { width: 0.16, height: 0.4, depth: 0.16 }, scene);
        magazine.parent = root; magazine.position.set(0.42, -0.2, 0.22); magazine.rotation.z = 0.1;
        magazine.material = materials.weaponAccent; magazine.isPickable = false;
        const muzzle = BABYLON.MeshBuilder.CreateBox("rifle-muzzle", { width: 0.12, height: 0.12, depth: 0.12 }, scene);
        muzzle.parent = root; muzzle.position.set(1.25, 0.08, 0.22);
        muzzle.material = materials.uiGlow; muzzle.isVisible = false; muzzle.isPickable = false;
        root.metadata = { muzzle };
        return root;
    }

    viewModel.models.empty = buildEmptyModel();
    viewModel.models.pistol = buildPistolModel();
    viewModel.models.rifle = buildRifleModel();
    updateViewModelSelection();
}

function updateViewModelSelection() {
    const item = currentHotbarItem();
    const key = item.kind === "weapon" ? item.weaponId : "empty";
    viewModel.currentKey = key;
    Object.keys(viewModel.models).forEach(name => {
        viewModel.models[name].setEnabled(name === key);
    });
}

function updateViewModel(dt, moveRatio) {
    const crouching = !!(input.keys.ShiftLeft || input.keys.ShiftRight);
    const aim = 0;
    updatePlayerAvatar(dt, moveRatio, crouching, aim > 0.5);
    viewModel.aimBlend = lerp(viewModel.aimBlend, aim, dt * 9);
    viewModel.kick = lerp(viewModel.kick, 0, dt * 10);
    viewModel.bobPhase += dt * (moveRatio > 0.08 ? 7.6 : 2.2);

    const bobX = Math.sin(viewModel.bobPhase) * 0.03 * moveRatio;
    const bobY = Math.abs(Math.cos(viewModel.bobPhase)) * 0.02 * moveRatio;

    const targetX = 0.22 + bobX;
    const targetY = 0.4 - (crouching ? 0.15 : 0) + bobY + viewModel.kick * 0.1;
    const targetZ = 0.3 + viewModel.kick * 0.2;

    viewModel.root.position.x = lerp(viewModel.root.position.x, targetX, dt * 10);
    viewModel.root.position.y = lerp(viewModel.root.position.y, targetY, dt * 10);
    viewModel.root.position.z = lerp(viewModel.root.position.z, targetZ, dt * 10);

    viewModel.root.rotation.x = player.pitch * 0.8 + viewModel.kick * 0.4;
    viewModel.root.rotation.y = viewModel.kick * 0.1;
    viewModel.root.rotation.z = -viewModel.kick * 0.2;

    Object.keys(viewModel.models).forEach(name => {
        const model = viewModel.models[name];
        if (model.metadata && model.metadata.muzzle) {
            model.metadata.muzzle.isVisible = viewModel.muzzleTimer > 0 && viewModel.currentKey === name;
        }
    });
    viewModel.muzzleTimer -= dt;
}

// ── Block highlight (stub) ──────────────────────────────────
let highlightBox = null;
export function initHighlightBox() {
    highlightBox = BABYLON.MeshBuilder.CreateBox("highlight", { size: 1.03 }, scene);
    const highlightMaterial = new BABYLON.StandardMaterial("highlight-mat", scene);
    highlightMaterial.wireframe = true;
    highlightMaterial.emissiveColor = new BABYLON.Color3(0.86, 0.96, 1);
    highlightMaterial.alpha = 0.9;
    highlightMaterial.disableLighting = true;
    highlightBox.material = highlightMaterial;
    highlightBox.isPickable = false;
    highlightBox.checkCollisions = false;
    highlightBox.isVisible = false;
}

function updateBlockHighlight() {
    if (highlightBox) highlightBox.isVisible = false;
}

// ── Combat ──────────────────────────────────────────────────
function computeWeaponDamage(def, multiplier) {
    const stats = player.stats || {};
    return Math.max(1, Math.round((def.damage + (stats.attack || 0)) * (multiplier || 1)));
}

function getAimVectors() {
    const forward = player.camera.getForwardRay(1).direction.clone().normalize();
    const right = player.camera.getDirection(BABYLON.Axis.X).normalize();
    const up = player.camera.getDirection(BABYLON.Axis.Y).normalize();
    return { forward, right, up };
}

function getTracerStart(vectors) {
    return player.camera.globalPosition
        .add(vectors.forward.scale(0.75))
        .add(vectors.right.scale(0.34))
        .add(vectors.up.scale(-0.2));
}

function performRayAttack(range, damage, spread) {
    const vectors = getAimVectors();
    let direction = vectors.forward.clone();
    if (spread) {
        direction = direction
            .add(vectors.right.scale((Math.random() - 0.5) * spread))
            .add(vectors.up.scale((Math.random() - 0.5) * spread))
            .normalize();
    }

    const tracerStart = getTracerStart(vectors);
    const ray = new BABYLON.Ray(tracerStart, direction, range);
    const pick = scene.pickWithRay(ray, mesh => {
        if (!mesh || !mesh.metadata) return false;
        return mesh.metadata.kind === "terrain" || mesh.metadata.kind === "enemyPart";
    }, false);

    let tracerEnd = tracerStart.add(direction.scale(range));
    let hitEnemy = false;
    if (pick && pick.hit && pick.pickedPoint) tracerEnd = pick.pickedPoint.clone();
    spawnTracer(tracerStart, tracerEnd);

    if (pick && pick.hit && pick.pickedMesh && pick.pickedMesh.metadata) {
        if (pick.pickedMesh.metadata.kind === "enemyPart") {
            hitEnemy = true;
            damageEnemy(pick.pickedMesh.metadata.enemy, damage, pick.pickedPoint);
        } else if (pick.pickedMesh.metadata.kind === "terrain") {
            spawnBurst(pick.pickedPoint, getTerrainImpactColor(pick.pickedMesh), 6, 0.08, 3.4);
        }
    }

    return { hitEnemy, hit: pick && pick.hit };
}

function fireWeapon() {
    const item = currentHotbarItem();
    if (item.kind !== "weapon" || player.reloading) return;
    const def = weaponDefs[item.weaponId];
    const ammo = player.ammo[item.weaponId];
    if (ammo.mag <= 0) {
        audio.playDry();
        startReload();
        return;
    }
    ammo.mag -= 1;
    player.primaryCooldown = def.fireRate;
    viewModel.kick += def.recoil;
    viewModel.muzzleTimer = 0.05;
    audio.playShoot(item.weaponId);
    performRayAttack(def.range, computeWeaponDamage(def, 1), 0);
    if (ammo.mag <= 0 && ammo.reserve > 0) startReload();
}

function performMeleeAttack() {
    const stats = player.stats || {};
    const damage = Math.max(1, 5 + (stats.attack || 0));
    const range = 2.5;
    const center = player.body.position.clone();
    const forward = new BABYLON.Vector3(Math.sin(player.facingYaw), 0, Math.cos(player.facingYaw));
    let hitCount = 0;
    enemies.forEach(enemy => {
        if (!enemy || enemy.state === "dead") return;
        const toEnemy = enemy.root.position.subtract(center);
        toEnemy.y = 0;
        const dist = toEnemy.length();
        if (dist > range) return;
        if (dist > 0.1) {
            const dot = BABYLON.Vector3.Dot(toEnemy.normalize(), forward);
            if (dot < 0.3) return;
        }
        hitCount++;
        damageEnemy(enemy, damage, enemy.root.position.add(vec3(0, 1.4, 0)));
    });
    player.primaryCooldown = 0.6;
    spawnBurst(center.add(forward.scale(1.2)).add(vec3(0, 1, 0)), "#ffcc66", 6, 0.06, 2.5);
    audio.playDry();
}

export function updateCombat(dt) {
    player.primaryCooldown = Math.max(0, player.primaryCooldown - dt);
    if (player.reloading) {
        player.reloadTimer -= dt;
        if (player.reloadTimer <= 0) finishReload();
    }
    if (!canControlGame()) return;

    if (input.keys.KeyE && player.primaryCooldown <= 0) {
        const weapon = currentWeaponDef();
        if (weapon) {
            if (weapon.auto || !input.fireLatch) {
                fireWeapon();
                input.fireLatch = true;
            }
        } else {
            if (!input.fireLatch) {
                performMeleeAttack();
                input.fireLatch = true;
            }
        }
    }
    if (!input.keys.KeyE) input.fireLatch = false;
}

// ── Player Movement ─────────────────────────────────────────
export function updatePlayerMovement(dt) {
    if (state.spawnLockTimer > 0) {
        state.spawnLockTimer = Math.max(0, state.spawnLockTimer - dt);
        snapPlayerToGround(0);
        player.velocityY = 0;
        updateViewModel(dt, 0);
        return;
    }

    const groundedBefore = isGrounded();
    player.grounded = groundedBefore;
    if (groundedBefore && player.velocityY < 0) player.velocityY = -0.01;
    if (input.jumpQueued && groundedBefore && canControlGame()) player.velocityY = CONFIG.jumpSpeed;
    input.jumpQueued = false;
    player.velocityY += CONFIG.gravity * dt;

    let moveX = 0, moveZ = 0;
    let moveFromWASD = false;
    if (canControlGame()) {
        moveX = (input.keys.KeyD ? 1 : 0) - (input.keys.KeyA ? 1 : 0);
        moveZ = (input.keys.KeyW ? 1 : 0) - (input.keys.KeyS ? 1 : 0);
        if (moveX !== 0 || moveZ !== 0) {
            moveFromWASD = true;
            player.moveTarget = null;
        }
    }

    const cameraForward = new BABYLON.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const cameraRight = new BABYLON.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    let move;
    if (moveFromWASD) {
        move = cameraForward.scale(moveZ).add(cameraRight.scale(moveX));
    } else if (player.moveTarget && canControlGame()) {
        const toTarget = player.moveTarget.subtract(player.body.position);
        toTarget.y = 0;
        const dist = toTarget.length();
        if (dist < 0.5) {
            player.moveTarget = null;
            move = BABYLON.Vector3.Zero();
        } else {
            move = toTarget.normalize();
        }
    } else {
        move = BABYLON.Vector3.Zero();
    }
    if (move.lengthSquared() > 1) move.normalize();

    const crouch = !!(input.keys.ShiftLeft || input.keys.ShiftRight);
    const moveBonus = player.stats ? player.stats.moveSpeed || 0 : 0;
    const isBackwardOnly = moveFromWASD && moveZ < 0 && moveX === 0;
    const speedScale = isBackwardOnly ? 0.55 : 1;
    const speed = CONFIG.playerSpeed * (1 + moveBonus) * (crouch ? CONFIG.crouchMultiplier : 1) * speedScale;

    if (move.lengthSquared() > 0.0001 && !isBackwardOnly) {
        const targetFacingYaw = Math.atan2(move.x, move.z);
        const yawDelta = normalizeAngle(targetFacingYaw - player.facingYaw);
        player.facingYaw += yawDelta * Math.min(1, dt * 12);
    }
    player.facingNode.rotation.y = player.facingYaw;

    const displacement = move.scale(speed * dt);
    displacement.y = player.velocityY * dt;

    const previous = player.body.position.clone();

    const nextX = player.body.position.x + displacement.x;
    const nextZ = player.body.position.z + displacement.z;
    const surfaceY = getGroundContactHeight(nextX, nextZ);
    const minAllowedY = surfaceY + getGroundClearance(0);
    if (player.body.position.y + displacement.y < minAllowedY) {
        displacement.y = minAllowedY - player.body.position.y;
        player.velocityY = 0;
    }

    player.body.moveWithCollisions(displacement);
    const moved = player.body.position.subtract(previous);
    if ((Math.abs(displacement.x) > 0.001 || Math.abs(displacement.z) > 0.001) &&
        Math.abs(moved.x) < 0.001 && Math.abs(moved.z) < 0.001) {
        player.stuckCounter = (player.stuckCounter || 0) + 1;
        player.body.position.y += 0.06;
    } else {
        player.stuckCounter = 0;
    }
    enforceGroundClearance(0);

    const groundedAfter = isGrounded();
    player.grounded = groundedAfter;
    if (groundedAfter && player.velocityY < 0) player.velocityY = -0.01;

    if (player.body.position.y < -30) damagePlayer(999, "You fell out of the world.");

    const firstPerson = state.cameraMode === "first";
    if (player.avatar && player.avatar.root) player.avatar.root.setEnabled(!firstPerson);
    if (viewModel.root) viewModel.root.setEnabled(firstPerson);

    const targetPivotHeight = firstPerson
        ? (crouch ? 1.1 : 1.36)
        : (crouch ? CONFIG.cameraPivotCrouchHeight : CONFIG.cameraPivotHeight);
    const targetRootHeight = firstPerson
        ? 0.02
        : (crouch ? CONFIG.cameraRootCrouchHeight : CONFIG.cameraRootHeight);

    player.pitchNode.position.y = lerp(player.pitchNode.position.y, targetPivotHeight, dt * 12);
    player.cameraRoot.position.y = lerp(player.cameraRoot.position.y, targetRootHeight, dt * 12);

    const isAiming = false;
    let targetCamZ = firstPerson
        ? (isAiming ? -0.05 : -0.08)
        : (isAiming ? CONFIG.cameraAimDistance : CONFIG.cameraFollowDistance);
    if (!firstPerson) {
        targetCamZ = Math.max(CONFIG.cameraMinDistance, Math.min(CONFIG.cameraMaxDistance, targetCamZ));
    }
    const targetCamX = firstPerson ? 0 : (isAiming ? CONFIG.cameraAimShoulderX : CONFIG.cameraShoulderX);
    player.camera.position.x = lerp(player.camera.position.x, targetCamX, dt * 8);
    player.camera.position.z = lerp(player.camera.position.z, targetCamZ, dt * 6);
    player.camera.fov = lerp(player.camera.fov, isAiming ? 0.75 : (firstPerson ? 0.9 : 0.85), dt * 10);

    if (!firstPerson) {
        const cameraPivot = player.cameraRoot.getAbsolutePosition();
        const cameraOffset = player.camera.globalPosition.subtract(cameraPivot);
        const cameraDistance = cameraOffset.length();
        const ray = new BABYLON.Ray(cameraPivot, cameraOffset.scale(1 / Math.max(cameraDistance, 0.0001)), cameraDistance);
        const pick = scene.pickWithRay(ray, mesh => mesh && mesh.metadata && mesh.metadata.kind === "terrain");
        if (pick && pick.hit) {
            const safeDistance = Math.max(0, pick.distance - 0.2);
            const retract = safeDistance / Math.max(cameraDistance, 0.0001);
            player.camera.position.x *= retract;
            player.camera.position.z *= retract;
        }
    }

    const travelled = player.body.position.subtract(previous);
    const planarDistance = Math.sqrt(travelled.x * travelled.x + travelled.z * travelled.z);
    registerTravelDistance(planarDistance);
    const planar = planarDistance / Math.max(dt, 0.001);
    const moveRatio = canControlGame() ? clamp(planar / Math.max(0.01, speed), 0, 1.2) : 0;
    updateViewModel(dt, moveRatio);
}

// ── HUD ─────────────────────────────────────────────────────
export function updateHUD() {
    resolvePlayerStats();
    const item = currentHotbarItem();
    dom.healthText.textContent = Math.round(player.health) + " / " + player.maxHealth;
    dom.healthFill.style.width = (player.health / player.maxHealth * 100) + "%";

    if (item.kind === "weapon") {
        const ammo = player.ammo[item.weaponId];
        dom.ammoText.textContent = weaponDefs[item.weaponId].label + "  " + ammo.mag + " / " + ammo.reserve;
    } else {
        dom.ammoText.textContent = "Fist (E)";
    }

    const aliveEnemies = enemies.filter(e => e.state !== "dead").length;
    const biome = GAME_DATA.biomes[world.currentBiomeId] || GAME_DATA.biomes.meadow;
    const perspective = state.cameraMode === "first" ? "FP" : "TP";
    let status = state.dead ? "Down" : "Exploring";
    if (player.reloading && item.kind === "weapon") status += " | Reloading";
    if (progression.activeBuff.timer > 0) status += " | Buff " + Math.ceil(progression.activeBuff.timer) + "s";
    if (state.statusHint) status += " | " + state.statusHint;
    dom.statusText.textContent = status + " | Lv." + progression.level + " | " + biome.name +
        " | Enemies " + aliveEnemies + " | " + perspective + " | Gold " + progression.gold +
        " | Books " + progression.skillBooks;

    dom.damageFlash.style.opacity = String(clamp(state.damageFlashTimer / 0.28, 0, 1) * 0.9);
    dom.pausePanel.classList.toggle("hidden", true);
    dom.deathPanel.classList.toggle("hidden", !state.dead);
    if (dom.inventoryPanel) dom.inventoryPanel.classList.toggle("hidden", !state.inventoryOpen || state.dead);
    if (dom.settingsPanel) dom.settingsPanel.classList.toggle("hidden", !state.settingsOpen || state.dead);
    if (state.inventoryOpen) updateInventoryUI();
    if (state.settingsOpen) updateSettingsUI();
    updateHotbarUI();
}

// ── Hotbar UI ───────────────────────────────────────────────
export function buildHotbarUI() {
    hotbarEls.length = 0;
    if (!dom.hotbar) return;
    dom.hotbar.innerHTML = "";
    hotbar.forEach((item, index) => {
        const el = document.createElement("div");
        el.className = "slot panel";
        el.innerHTML = "<div class=\"slot-index\">" + (index + 1) + "</div><div class=\"slot-name\">" + item.name + "</div><div class=\"slot-meta\"></div>";
        dom.hotbar.appendChild(el);
        hotbarEls.push(el);
    });
    updateHotbarUI();
}

function updateHotbarUI() {
    if (!hotbarEls.length) return;
    hotbarEls.forEach((el, index) => {
        const item = hotbar[index];
        el.classList.toggle("active", index === player.slot);
        let meta = "";
        if (item.kind === "weapon") {
            const ammo = player.ammo[item.weaponId];
            meta = ammo.mag + " / " + ammo.reserve;
        } else {
            meta = "Fist";
        }
        el.querySelector(".slot-meta").textContent = meta;
    });
}

// ── Tracers + highlight update (called from render loop) ────
export function updateTracersAndHighlight(dt) {
    updateTracers(dt);
    updateBlockHighlight();
}

// ── Bootstrap helper (called once from main.js after createPlayer + createViewModel + buildHotbarUI)
export function bootstrapPlayer() {
    setSlot(0);
    respawnPlayer();
}

// ── Input registration ──────────────────────────────────────
export function registerInput() {
    document.addEventListener("contextmenu", e => e.preventDefault());

    canvas.addEventListener("click", () => {
        audio.ensure();
    });

    const rotateDrag = { active: false, lastX: 0, lastY: 0 };

    function stopRotateDrag() {
        rotateDrag.active = false;
        input.mouseButtons[0] = false;
        canvas.style.cursor = "grab";
    }

    function rotateCamera(deltaX, deltaY) {
        const sensitivity = CONFIG.mouseSensitivity * 2.2;
        player.yaw += deltaX * sensitivity;
        player.pitch += deltaY * sensitivity;
        player.pitch = clamp(player.pitch, -1.25, 1.25);
        player.yawNode.rotation.y = player.yaw;
        player.pitchNode.rotation.x = player.pitch;
    }

    function pickTerrainPoint(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const pickX = clientX - rect.left;
        const pickY = clientY - rect.top;
        if (pickX < 0 || pickY < 0 || pickX > rect.width || pickY > rect.height) return null;
        const pick = scene.pick(pickX, pickY, mesh => !!(mesh && mesh.metadata && mesh.metadata.kind === "terrain"));
        return pick && pick.hit && pick.pickedPoint ? pick.pickedPoint.clone() : null;
    }

    canvas.addEventListener("pointerdown", e => {
        if (isAnyOverlayOpen()) return;
        audio.ensure();

        if (e.button === 0 && !state.dead) {
            rotateDrag.active = true;
            rotateDrag.lastX = e.clientX;
            rotateDrag.lastY = e.clientY;
            input.mouseButtons[0] = true;
            canvas.style.cursor = "grabbing";
            e.preventDefault();
            return;
        }

        input.mouseButtons[e.button] = true;
        if (e.button === 2 && !state.dead && canControlGame()) {
            const target = pickTerrainPoint(e.clientX, e.clientY);
            if (target) player.moveTarget = target;
            e.preventDefault();
        }
    });

    window.addEventListener("pointermove", e => {
        if (!rotateDrag.active) return;
        if (state.dead || isAnyOverlayOpen()) {
            stopRotateDrag();
            return;
        }
        const deltaX = e.clientX - rotateDrag.lastX;
        const deltaY = e.clientY - rotateDrag.lastY;
        rotateDrag.lastX = e.clientX;
        rotateDrag.lastY = e.clientY;
        rotateCamera(deltaX, deltaY);
        e.preventDefault();
    });

    window.addEventListener("pointerup", e => {
        input.mouseButtons[e.button] = false;
        if (e.button === 0) stopRotateDrag();
    });

    window.addEventListener("blur", () => {
        stopRotateDrag();
        input.mouseButtons[1] = false;
        input.mouseButtons[2] = false;
    });

    document.addEventListener("keydown", e => {
        input.keys[e.code] = true;
        if (e.code === "Escape" && isAnyOverlayOpen()) { closeOverlayPanels(); return; }
        if (e.code === "Space") { e.preventDefault(); input.jumpQueued = true; return; }
        if (e.repeat && (e.code === "KeyR" || /^Digit[1-4]$/.test(e.code) || /^Key[QFIOZXV]$/.test(e.code))) return;
        if (e.code === "KeyI") { toggleInventoryPanel(); return; }
        if (e.code === "KeyO") { toggleSettingsPanel(); return; }
        if (e.code === "KeyV") { toggleCameraMode(); return; }
        if (e.code === "KeyZ") { useHealingPotion(); return; }
        if (e.code === "KeyX") { useBuffPotion(); return; }
        if (!canControlGame()) return;
        if (e.code === "KeyR") startReload();
        else if (e.code === "KeyQ") castShockwaveSkill();
        else if (e.code === "KeyF") castOverdriveSkill();
        else if (/^Digit[1-4]$/.test(e.code)) setSlot(parseInt(e.code.replace("Digit", ""), 10) - 1);
    });

    document.addEventListener("keyup", e => {
        input.keys[e.code] = false;
        if (e.code === "KeyE") input.fireLatch = false;
    });

    // ── Scroll wheel: zoom camera (Shift+scroll to switch weapons) ──
    window.addEventListener("wheel", e => {
        if (!canControlGame()) return;
        e.preventDefault();
        const wheelDir = e.deltaY > 0 ? 1 : -1;
        if (e.shiftKey) {
            setSlot(player.slot + wheelDir);
            return;
        }
        const zoomStep = 0.8;
        let newFollow = CONFIG.cameraFollowDistance - wheelDir * zoomStep;
        newFollow = Math.max(CONFIG.cameraMinDistance, Math.min(CONFIG.cameraMaxDistance, newFollow));
        CONFIG.cameraFollowDistance = newFollow;
        CONFIG.cameraAimDistance = Math.max(CONFIG.cameraMinDistance, Math.min(CONFIG.cameraMaxDistance, newFollow * 0.48));
    }, { passive: false });

    if (dom.resumeBtn) dom.resumeBtn.addEventListener("click", () => { closeOverlayPanels(); });
    if (dom.respawnBtn) dom.respawnBtn.addEventListener("click", () => respawnPlayer());
    if (dom.openInventoryBtn) dom.openInventoryBtn.addEventListener("click", () => toggleInventoryPanel(true));
    if (dom.openSettingsBtn) dom.openSettingsBtn.addEventListener("click", () => toggleSettingsPanel(true));
    if (dom.closeInventoryBtn) dom.closeInventoryBtn.addEventListener("click", () => toggleInventoryPanel(false));
    if (dom.closeSettingsBtn) dom.closeSettingsBtn.addEventListener("click", () => toggleSettingsPanel(false));

    if (dom.inventoryContent) {
        dom.inventoryContent.addEventListener("click", e => {
            const button = e.target.closest("button[data-action]");
            if (!button) return;
            const action = button.getAttribute("data-action");
            if (action === "use-heal") useHealingPotion();
            else if (action === "use-buff") useBuffPotion();
            else if (action === "upgrade-skill") upgradeSkill(button.getAttribute("data-skill-id"));
            else if (action === "equip-item") equipEquipment(button.getAttribute("data-item-id"));
            else if (action === "unequip-slot") unequipEquipment(button.getAttribute("data-slot"));
            updateInventoryUI();
        });
    }

    if (dom.settingsContent) {
        dom.settingsContent.addEventListener("click", e => {
            const button = e.target.closest("button[data-action]");
            if (!button) return;
            const action = button.getAttribute("data-action");
            if (action === "toggle-camera") toggleCameraMode();
            else if (action === "sens-up") CONFIG.mouseSensitivity = clamp(CONFIG.mouseSensitivity + 0.0002, 0.0008, 0.006);
            else if (action === "sens-down") CONFIG.mouseSensitivity = clamp(CONFIG.mouseSensitivity - 0.0002, 0.0008, 0.006);
            updateSettingsUI();
        });
    }
}
