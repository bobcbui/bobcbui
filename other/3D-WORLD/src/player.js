"use strict";

var audio = {
    context: null,
    ensure: function () {
        if (!this.context) {
            var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextCtor) {
                return null;
            }
            this.context = new AudioContextCtor();
        }
        if (this.context.state === "suspended") {
            this.context.resume();
        }
        return this.context;
    },
    pulse: function (freq, duration, gain, type, endFreq) {
        var ctx = this.ensure();
        if (!ctx) {
            return;
        }
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var amp = ctx.createGain();
        osc.type = type || "square";
        osc.frequency.setValueAtTime(freq, now);
        if (endFreq) {
            osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
        }
        amp.gain.setValueAtTime(gain, now);
        amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(amp);
        amp.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    },
    noise: function (duration, gain) {
        var ctx = this.ensure();
        if (!ctx) {
            return;
        }
        var buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < data.length; i += 1) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        }
        var source = ctx.createBufferSource();
        var amp = ctx.createGain();
        source.buffer = buffer;
        amp.gain.value = gain;
        source.connect(amp);
        amp.connect(ctx.destination);
        source.start();
    },
    playShoot: function (weaponId) {
        if (weaponId === "rifle") {
            this.pulse(180, 0.06, 0.032, "sawtooth", 110);
        } else {
            this.pulse(240, 0.07, 0.03, "square", 130);
        }
    },
    playHit: function () {
        this.pulse(560, 0.04, 0.018, "triangle", 360);
    },
    playBlock: function () {
        this.pulse(190, 0.05, 0.014, "square", 120);
    },
    playPickup: function () {
        this.pulse(480, 0.08, 0.022, "triangle", 760);
    },
    playDamage: function () {
        this.noise(0.06, 0.014);
        this.pulse(120, 0.1, 0.02, "sawtooth", 80);
    },
    playReload: function () {
        this.pulse(290, 0.05, 0.012, "square", 180);
        this.pulse(360, 0.05, 0.01, "square", 260);
    },
    playDry: function () {
        this.pulse(110, 0.04, 0.01, "square", 70);
    },
    playEnemyDown: function () {
        this.pulse(210, 0.08, 0.018, "triangle", 100);
    }
};

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
    if (!from || !to || BABYLON.Vector3.DistanceSquared(from, to) < 0.001) {
        return;
    }

    var tracer = BABYLON.MeshBuilder.CreateTube("bullet-tracer", {
        path: [from, to],
        radius: 0.07,
        cap: BABYLON.Mesh.CAP_ALL
    }, scene);
    tracer.material = ensureTracerMaterial();
    tracer.isPickable = false;
    tracer.checkCollisions = false;
    tracer.renderingGroupId = 1;
    tracer.alwaysSelectAsActiveMesh = true;

    var tracerCore = BABYLON.MeshBuilder.CreateTube("bullet-tracer-core", {
        path: [from, to],
        radius: 0.025,
        cap: BABYLON.Mesh.CAP_ALL
    }, scene);
    tracerCore.material = materials.tracerCore;
    tracerCore.isPickable = false;
    tracerCore.checkCollisions = false;
    tracerCore.renderingGroupId = 1;
    tracerCore.alwaysSelectAsActiveMesh = true;

    tracers.push({
        meshes: [tracer, tracerCore],
        life: 0.15,
        maxLife: 0.15
    });
}

function updateTracers(dt) {
    for (var i = tracers.length - 1; i >= 0; i -= 1) {
        var tracer = tracers[i];
        tracer.life -= dt;
        if (tracer.life <= 0) {
            tracer.meshes.forEach(function (mesh) {
                mesh.dispose(false, true);
            });
            tracers.splice(i, 1);
            continue;
        }
        var alpha = clamp(tracer.life / tracer.maxLife, 0, 1);
        tracer.meshes.forEach(function (mesh) {
            mesh.visibility = alpha;
        });
    }
}

function findWeaponSlot(weaponId) {
    return hotbar.findIndex(function (item) {
        return item.kind === "weapon" && item.weaponId === weaponId;
    });
}

function ensureWeaponSlot(weaponId) {
    var existingIndex = findWeaponSlot(weaponId);
    if (existingIndex >= 0) {
        return existingIndex;
    }

    var emptyIndex = hotbar.findIndex(function (item) {
        return item.kind === "empty";
    });

    if (emptyIndex === -1) {
        hotbar.push(createWeaponSlotItem(weaponId));
        buildHotbarUI();
        return hotbar.length - 1;
    }

    hotbar[emptyIndex] = createWeaponSlotItem(weaponId);
    buildHotbarUI();
    return emptyIndex;
}

function grantWeaponPickup(weaponId) {
    var slotIndex = ensureWeaponSlot(weaponId);
    var def = weaponDefs[weaponId];
    var ammo = player.ammo[weaponId];
    var reserveGain = Math.max(12, Math.round(def.magazine * 2));
    var alreadyOwned = ammo.mag > 0 || ammo.reserve > 0;

    if (alreadyOwned) {
        ammo.reserve += reserveGain;
        showToast("Picked up " + def.label + " ammo.", 1.8);
    } else {
        ammo.mag = def.magazine;
        ammo.reserve = Math.round(def.reserve * 0.5);
        showToast("Picked up " + def.label + ".", 1.8);
    }

    if (!currentWeaponDef()) {
        setSlot(slotIndex);
    } else {
        updateHotbarUI();
    }
}

function createPlayer() {
    player.body = BABYLON.MeshBuilder.CreateBox("player-body", {
        width: 0.76,
        height: 1.8,
        depth: 0.76
    }, scene);
    player.body.isVisible = false;
    player.body.isPickable = false;
    player.body.checkCollisions = true;
    player.body.ellipsoid = new BABYLON.Vector3(CONFIG.playerHalfWidth, CONFIG.playerHalfHeight, CONFIG.playerHalfWidth);
    player.body.ellipsoidOffset = BABYLON.Vector3.Zero();

    player.yawNode = new BABYLON.TransformNode("player-yaw", scene);
    player.pitchNode = new BABYLON.TransformNode("player-pitch", scene);
    player.yawNode.parent = player.body;
    player.pitchNode.parent = player.yawNode;
    player.pitchNode.position.y = 0.56;

    player.camera = new BABYLON.FreeCamera("camera", BABYLON.Vector3.Zero(), scene);
    player.camera.parent = player.pitchNode;
    player.camera.position.set(0, 0, 0);
    player.camera.minZ = 0.05;
    player.camera.maxZ = 180;
    player.camera.fov = 1.12;
    player.camera.inputs.clear();
    scene.activeCamera = player.camera;
    player.body.position.copyFrom(player.spawnPoint);
}

function createViewModel() {
    viewModel.root = new BABYLON.TransformNode("view-root", scene);
    viewModel.root.parent = player.camera;
    viewModel.root.position.set(0.38, -0.36, 0.82);

    viewModel.arm = BABYLON.MeshBuilder.CreateBox("view-arm", {
        width: 0.22,
        height: 0.78,
        depth: 0.24
    }, scene);
    viewModel.arm.parent = viewModel.root;
    viewModel.arm.position.set(0.02, -0.04, 0.03);
    viewModel.arm.rotation.z = 0.25;
    viewModel.arm.material = materials.enemySkin;
    viewModel.arm.isPickable = false;

    function buildEmptyModel() {
        var root = new BABYLON.TransformNode("empty-model", scene);
        root.parent = viewModel.root;
        return root;
    }

    function buildPistolModel() {
        var root = new BABYLON.TransformNode("pistol-model", scene);
        root.parent = viewModel.root;

        var grip = BABYLON.MeshBuilder.CreateBox("pistol-grip", { width: 0.18, height: 0.56, depth: 0.16 }, scene);
        grip.parent = root;
        grip.position.set(0.18, -0.08, 0.18);
        grip.rotation.z = -0.22;
        grip.material = materials.weaponDark;
        grip.isPickable = false;

        var body = BABYLON.MeshBuilder.CreateBox("pistol-body", { width: 0.68, height: 0.22, depth: 0.22 }, scene);
        body.parent = root;
        body.position.set(0.34, 0.14, 0.22);
        body.material = materials.weaponMid;
        body.isPickable = false;

        var muzzle = BABYLON.MeshBuilder.CreateBox("pistol-muzzle", { width: 0.12, height: 0.12, depth: 0.12 }, scene);
        muzzle.parent = root;
        muzzle.position.set(0.72, 0.14, 0.22);
        muzzle.material = materials.uiGlow;
        muzzle.isVisible = false;
        muzzle.isPickable = false;
        root.metadata = { muzzle: muzzle };
        return root;
    }

    function buildRifleModel() {
        var root = new BABYLON.TransformNode("rifle-model", scene);
        root.parent = viewModel.root;

        var stock = BABYLON.MeshBuilder.CreateBox("rifle-stock", { width: 0.3, height: 0.22, depth: 0.22 }, scene);
        stock.parent = root;
        stock.position.set(0.02, 0.03, 0.22);
        stock.material = materials.weaponDark;
        stock.isPickable = false;

        var body = BABYLON.MeshBuilder.CreateBox("rifle-body", { width: 0.8, height: 0.22, depth: 0.22 }, scene);
        body.parent = root;
        body.position.set(0.46, 0.06, 0.22);
        body.material = materials.weaponMid;
        body.isPickable = false;

        var barrel = BABYLON.MeshBuilder.CreateBox("rifle-barrel", { width: 0.72, height: 0.12, depth: 0.12 }, scene);
        barrel.parent = root;
        barrel.position.set(0.92, 0.08, 0.22);
        barrel.material = materials.weaponDark;
        barrel.isPickable = false;

        var magazine = BABYLON.MeshBuilder.CreateBox("rifle-magazine", { width: 0.16, height: 0.4, depth: 0.16 }, scene);
        magazine.parent = root;
        magazine.position.set(0.42, -0.2, 0.22);
        magazine.rotation.z = 0.1;
        magazine.material = materials.weaponAccent;
        magazine.isPickable = false;

        var muzzle = BABYLON.MeshBuilder.CreateBox("rifle-muzzle", { width: 0.12, height: 0.12, depth: 0.12 }, scene);
        muzzle.parent = root;
        muzzle.position.set(1.25, 0.08, 0.22);
        muzzle.material = materials.uiGlow;
        muzzle.isVisible = false;
        muzzle.isPickable = false;
        root.metadata = { muzzle: muzzle };
        return root;
    }

    viewModel.models.empty = buildEmptyModel();
    viewModel.models.pistol = buildPistolModel();
    viewModel.models.rifle = buildRifleModel();
    updateViewModelSelection();
}

function updateViewModelSelection() {
    var item = currentHotbarItem();
    var key = item.kind === "weapon" ? item.weaponId : "empty";
    viewModel.currentKey = key;
    Object.keys(viewModel.models).forEach(function (name) {
        viewModel.models[name].setEnabled(name === key);
    });
}

function updateViewModel(dt, moveRatio) {
    var crouching = !!(input.keys.ShiftLeft || input.keys.ShiftRight);
    var aim = currentWeaponDef() && input.mouseButtons[2] ? 1 : 0;
    viewModel.aimBlend = lerp(viewModel.aimBlend, aim, dt * 9);
    viewModel.kick = lerp(viewModel.kick, 0, dt * 10);
    viewModel.bobPhase += dt * (moveRatio > 0.08 ? 7.6 : 2.2);

    var bobX = Math.sin(viewModel.bobPhase) * 0.03 * moveRatio;
    var bobY = Math.abs(Math.cos(viewModel.bobPhase)) * 0.02 * moveRatio;
    var targetX = 0.38 + bobX - viewModel.aimBlend * 0.12;
    var targetY = -0.36 - (crouching ? 0.1 : 0) + bobY + viewModel.kick * 0.06;
    var targetZ = 0.82 - viewModel.aimBlend * 0.22 + viewModel.kick * 0.28;

    viewModel.root.position.x = lerp(viewModel.root.position.x, targetX, dt * 12);
    viewModel.root.position.y = lerp(viewModel.root.position.y, targetY, dt * 12);
    viewModel.root.position.z = lerp(viewModel.root.position.z, targetZ, dt * 12);
    viewModel.root.rotation.x = viewModel.kick * 0.35;
    viewModel.root.rotation.y = viewModel.kick * 0.18;
    viewModel.root.rotation.z = -viewModel.kick * 0.22;

    Object.keys(viewModel.models).forEach(function (name) {
        var model = viewModel.models[name];
        if (model.metadata && model.metadata.muzzle) {
            model.metadata.muzzle.isVisible = viewModel.muzzleTimer > 0 && viewModel.currentKey === name;
        }
    });
    viewModel.muzzleTimer -= dt;
}

function centerPick(predicate) {
    return scene.pick(engine.getRenderWidth() * 0.5, engine.getRenderHeight() * 0.5, predicate, false, player.camera);
}

function pickCenterTarget(maxDistance, includeEnemies) {
    var pick = centerPick(function (mesh) {
        if (!mesh || !mesh.metadata) {
            return false;
        }
        if (mesh.metadata.kind === "block") {
            return true;
        }
        return includeEnemies && mesh.metadata.kind === "enemyPart";
    });
    if (!pick || !pick.hit || pick.distance > maxDistance) {
        return null;
    }
    return pick;
}

var highlightBox = BABYLON.MeshBuilder.CreateBox("highlight", { size: 1.03 }, scene);
var highlightMaterial = new BABYLON.StandardMaterial("highlight-mat", scene);
highlightMaterial.wireframe = true;
highlightMaterial.emissiveColor = new BABYLON.Color3(0.86, 0.96, 1);
highlightMaterial.alpha = 0.9;
highlightMaterial.disableLighting = true;
highlightBox.material = highlightMaterial;
highlightBox.isPickable = false;
highlightBox.checkCollisions = false;
highlightBox.isVisible = false;

function updateBlockHighlight() {
    highlightBox.isVisible = false;
}

function isGrounded() {
    var ray = new BABYLON.Ray(player.body.position.clone(), BABYLON.Vector3.Down(), 0.96);
    var hit = scene.pickWithRay(ray, function (mesh) {
        return !!(mesh && mesh.metadata && mesh.metadata.kind === "block");
    }, false);
    return !!(hit && hit.hit && hit.distance <= 0.95);
}

function blockIntersectsPlayer(x, y, z) {
    return Math.abs(player.body.position.x - x) < CONFIG.playerHalfWidth + 0.5 &&
        Math.abs(player.body.position.y - y) < CONFIG.playerHalfHeight + 0.5 &&
        Math.abs(player.body.position.z - z) < CONFIG.playerHalfWidth + 0.5;
}

function setSlot(index) {
    player.slot = (index + hotbar.length) % hotbar.length;
    player.reloading = null;
    player.reloadTimer = 0;
    updateViewModelSelection();
    updateHotbarUI();
}

function startReload() {
    var item = currentHotbarItem();
    if (item.kind !== "weapon") {
        return;
    }
    var weapon = weaponDefs[item.weaponId];
    var ammo = player.ammo[item.weaponId];
    if (player.reloading || ammo.reserve <= 0 || ammo.mag >= weapon.magazine) {
        return;
    }
    player.reloading = item.weaponId;
    player.reloadTimer = weapon.reloadTime;
    audio.playReload();
    showToast("Reloading " + weapon.label + "...", 1.2);
}

function finishReload() {
    if (!player.reloading) {
        return;
    }
    var weaponId = player.reloading;
    var weapon = weaponDefs[weaponId];
    var ammo = player.ammo[weaponId];
    var need = weapon.magazine - ammo.mag;
    var taken = Math.min(need, ammo.reserve);
    ammo.mag += taken;
    ammo.reserve -= taken;
    player.reloading = null;
    player.reloadTimer = 0;
}

function damagePlayer(amount, source) {
    if (state.dead) {
        return;
    }
    var defense = player.stats ? player.stats.defense : 0;
    var finalDamage = Math.max(1, Math.round(amount * (100 / (100 + defense * 12))));
    player.health -= finalDamage;
    state.damageFlashTimer = 0.28;
    audio.playDamage();
    if (source) {
        showToast(source, 1.2);
    }
    if (player.health <= 0) {
        player.health = 0;
        state.dead = true;
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
    player.skillCooldown = 0;
    player.burstCooldown = 0;
    player.burstBuffTimer = 0;
    player.burstDamageBoost = 0;
    player.burstFireRateBoost = 0;
    if (!hotbar[0] || hotbar[0].kind !== "weapon") {
        hotbar[0] = createWeaponSlotItem("pistol");
    }
    if (player.ammo.pistol.mag <= 0 && player.ammo.pistol.reserve <= 0) {
        player.ammo.pistol.mag = weaponDefs.pistol.magazine;
        player.ammo.pistol.reserve = 24;
    }
    player.body.position.copyFrom(player.spawnPoint);
    player.yaw = 0;
    player.pitch = 0;
    player.yawNode.rotation.y = 0;
    player.pitchNode.rotation.x = 0;
    setSlot(0);
    state.dead = false;
    dom.deathPanel.classList.add("hidden");
    showToast("Respawned. Back in the frontier.", 1.8);
}

function computeWeaponDamage(def, multiplier) {
    var stats = player.stats || {};
    var damage = (def.damage + (stats.attack || 0)) * (multiplier || 1);
    if (player.burstBuffTimer > 0) {
        damage *= 1 + player.burstDamageBoost;
    }
    var critRate = stats.critRate || 0;
    var critDamage = stats.critDamage || 0.5;
    if (Math.random() < critRate) {
        damage *= 1 + critDamage;
    }
    return Math.max(1, Math.round(damage));
}

function getAimVectors() {
    var forward = player.camera.getForwardRay(1).direction.clone().normalize();
    var right = player.camera.getDirection(BABYLON.Axis.X).normalize();
    var up = player.camera.getDirection(BABYLON.Axis.Y).normalize();
    return {
        forward: forward,
        right: right,
        up: up
    };
}

function getTracerStart(vectors) {
    return player.camera.globalPosition
        .add(vectors.forward.scale(0.75))
        .add(vectors.right.scale(0.34))
        .add(vectors.up.scale(-0.2));
}

function performRayAttack(range, damage, spread) {
    var vectors = getAimVectors();
    var direction = vectors.forward.clone();
    if (spread) {
        direction = direction
            .add(vectors.right.scale((Math.random() - 0.5) * spread))
            .add(vectors.up.scale((Math.random() - 0.5) * spread))
            .normalize();
    }

    var tracerStart = getTracerStart(vectors);
    var ray = new BABYLON.Ray(tracerStart, direction, range);
    var pick = scene.pickWithRay(ray, function (mesh) {
        if (!mesh || !mesh.metadata) {
            return false;
        }
        return mesh.metadata.kind === "block" || mesh.metadata.kind === "enemyPart";
    }, false);

    var tracerEnd = tracerStart.add(direction.scale(range));
    var hitEnemy = false;
    if (pick && pick.hit && pick.pickedPoint) {
        tracerEnd = pick.pickedPoint.clone();
    }
    spawnTracer(tracerStart, tracerEnd);

    if (pick && pick.hit && pick.pickedMesh && pick.pickedMesh.metadata) {
        if (pick.pickedMesh.metadata.kind === "enemyPart") {
            hitEnemy = true;
            damageEnemy(pick.pickedMesh.metadata.enemy, damage, pick.pickedPoint);
        } else if (pick.pickedMesh.metadata.kind === "block") {
            spawnBurst(pick.pickedPoint, BLOCK_TYPES[pick.pickedMesh.metadata.type].color, 6, 0.08, 3.4);
        }
    }

    return {
        hitEnemy: hitEnemy,
        hit: pick && pick.hit
    };
}

function fireWeapon() {
    var item = currentHotbarItem();
    if (item.kind !== "weapon" || player.reloading) {
        return;
    }
    var def = weaponDefs[item.weaponId];
    var ammo = player.ammo[item.weaponId];
    if (ammo.mag <= 0) {
        audio.playDry();
        startReload();
        return;
    }

    ammo.mag -= 1;
    player.primaryCooldown = def.fireRate / (1 + player.burstFireRateBoost);
    viewModel.kick += def.recoil;
    viewModel.muzzleTimer = 0.05;
    audio.playShoot(item.weaponId);
    performRayAttack(def.range, computeWeaponDamage(def, 1), 0);

    if (ammo.mag <= 0 && ammo.reserve > 0) {
        startReload();
    }
}

function useWeaponSkill() {
    var weapon = currentWeaponDef();
    if (!weapon || player.skillCooldown > 0 || player.reloading || !canControlGame()) {
        return;
    }
    var skill = weapon.skill;
    var haste = player.stats ? player.stats.skillHaste || 0 : 0;
    player.skillCooldown = Math.max(1.5, skill.cooldown * (1 - haste));
    registerSkillUsed();
    audio.playShoot(currentHotbarItem().weaponId);
    viewModel.kick += 0.2;
    viewModel.muzzleTimer = 0.08;

    if (currentHotbarItem().weaponId === "pistol") {
        var pistolHit = performRayAttack(weapon.range + 8, computeWeaponDamage(weapon, skill.damageMultiplier), 0.01);
        if (pistolHit.hitEnemy) {
            player.health = clamp(player.health + skill.healOnHit, 0, player.maxHealth);
        }
    } else if (currentHotbarItem().weaponId === "rifle") {
        for (var i = 0; i < skill.pellets; i += 1) {
            performRayAttack(weapon.range, computeWeaponDamage(weapon, skill.damageMultiplier), skill.spread);
        }
    }

    showToast(skill.label + " activated.", 1.4);
}

function useWeaponBurst() {
    var weapon = currentWeaponDef();
    if (!weapon || player.burstCooldown > 0 || !canControlGame()) {
        return;
    }
    var burst = weapon.burst;
    var haste = player.stats ? player.stats.skillHaste || 0 : 0;
    player.burstCooldown = Math.max(4, burst.cooldown * (1 - haste * 0.5));
    player.burstBuffTimer = burst.duration || 0;
    player.burstDamageBoost = burst.damageBoost || 0;
    player.burstFireRateBoost = burst.fireRateBoost || 0;
    if (burst.healFlat) {
        player.health = clamp(player.health + burst.healFlat, 0, player.maxHealth);
    }
    registerSkillUsed();
    spawnBurst(player.body.position.add(vec3(0, 1.1, 0)), "#7ac8ff", 18, 0.12, 4.5);
    showToast(burst.label + " unleashed.", 1.4);
}

function showToast(message, duration) {
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");
    state.toastTimer = duration || 1.6;
}

function updateCombat(dt) {
    player.primaryCooldown = Math.max(0, player.primaryCooldown - dt);
    player.secondaryCooldown = Math.max(0, player.secondaryCooldown - dt);
    player.skillCooldown = Math.max(0, player.skillCooldown - dt);
    player.burstCooldown = Math.max(0, player.burstCooldown - dt);
    player.burstBuffTimer = Math.max(0, player.burstBuffTimer - dt);
    if (player.burstBuffTimer <= 0) {
        player.burstDamageBoost = 0;
        player.burstFireRateBoost = 0;
    }

    if (player.reloading) {
        player.reloadTimer -= dt;
        if (player.reloadTimer <= 0) {
            finishReload();
        }
    }

    if (!canControlGame()) {
        return;
    }

    var weapon = currentWeaponDef();
    if (weapon && input.mouseButtons[0] && player.primaryCooldown <= 0) {
        if (weapon.auto || !input.fireLatch) {
            fireWeapon();
            input.fireLatch = true;
        }
    }
    if (!input.mouseButtons[0]) {
        input.fireLatch = false;
    }
}

function updatePlayerMovement(dt) {
    var groundedBefore = isGrounded();
    player.grounded = groundedBefore;
    if (groundedBefore && player.velocityY < 0) {
        player.velocityY = -0.01;
    }
    if (input.jumpQueued && groundedBefore && canControlGame()) {
        player.velocityY = CONFIG.jumpSpeed;
    }
    input.jumpQueued = false;
    player.velocityY += CONFIG.gravity * dt;

    var moveX = 0;
    var moveZ = 0;
    if (canControlGame()) {
        moveX = (input.keys.KeyD ? 1 : 0) - (input.keys.KeyA ? 1 : 0);
        moveZ = (input.keys.KeyW ? 1 : 0) - (input.keys.KeyS ? 1 : 0);
    }

    var forward = new BABYLON.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    var right = new BABYLON.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    var move = forward.scale(moveZ).add(right.scale(moveX));
    if (move.lengthSquared() > 1) {
        move.normalize();
    }

    var crouch = !!(input.keys.ShiftLeft || input.keys.ShiftRight);
    var moveBonus = player.stats ? player.stats.moveSpeed || 0 : 0;
    var speed = CONFIG.playerSpeed * (1 + moveBonus) * (crouch ? CONFIG.crouchMultiplier : 1);
    var displacement = move.scale(speed * dt);
    displacement.y = player.velocityY * dt;

    var previous = player.body.position.clone();
    player.body.moveWithCollisions(displacement);

    var groundedAfter = isGrounded();
    player.grounded = groundedAfter;
    if (groundedAfter && player.velocityY < 0) {
        player.velocityY = -0.01;
    }
    if (player.body.position.y < -8) {
        damagePlayer(999, "You fell out of the world.");
    }

    player.pitchNode.position.y = lerp(player.pitchNode.position.y, crouch ? 0.34 : 0.56, dt * 12);
    player.camera.fov = lerp(player.camera.fov, currentWeaponDef() && input.mouseButtons[2] ? 0.92 : 1.12, dt * 10);

    var travelled = player.body.position.subtract(previous);
    var planarDistance = Math.sqrt(travelled.x * travelled.x + travelled.z * travelled.z);
    registerTravelDistance(planarDistance);
    var planar = planarDistance / Math.max(dt, 0.001);
    var moveRatio = canControlGame() ? clamp(planar / Math.max(0.01, speed), 0, 1.2) : 0;
    updateViewModel(dt, moveRatio);
}

function formatCooldown(seconds) {
    return seconds > 0 ? seconds.toFixed(1) + "s" : "Ready";
}

function updateHUD() {
    resolvePlayerStats();
    var item = currentHotbarItem();
    dom.healthText.textContent = Math.round(player.health) + " / " + player.maxHealth;
    dom.healthFill.style.width = (player.health / player.maxHealth * 100) + "%";

    if (item.kind === "weapon") {
        var ammo = player.ammo[item.weaponId];
        dom.ammoText.textContent = weaponDefs[item.weaponId].label + "  " + ammo.mag + " / " + ammo.reserve;
    } else {
        dom.ammoText.textContent = "Unarmed";
    }

    dom.levelText.textContent = "Lv. " + progression.level + " | Power " + (player.stats ? player.stats.power : 0);
    dom.abilityText.textContent = "Q " + formatCooldown(player.skillCooldown) + " | F " + formatCooldown(player.burstCooldown);

    var aliveEnemies = enemies.filter(function (enemy) {
        return enemy.state !== "dead";
    }).length;
    var biome = GAME_DATA.biomes[world.currentBiomeId] || GAME_DATA.biomes.meadow;
    var status = state.dead ? "Down" : (canControlGame() ? "Exploring" : (state.inventoryOpen ? "Inventory" : "Paused"));
    dom.statusText.textContent = status + " | " + biome.name + " | Chunk " + world.currentChunkX + "," + world.currentChunkZ + " | Enemies " + aliveEnemies;

    if (player.reloading) {
        var def = weaponDefs[player.reloading];
        var progress = 1 - clamp(player.reloadTimer / def.reloadTime, 0, 1);
        dom.reloadFill.style.width = (progress * 100) + "%";
    } else {
        dom.reloadFill.style.width = "0%";
    }

    dom.toast.classList.toggle("visible", state.toastTimer > 0);
    dom.hitMarker.classList.toggle("visible", state.hitMarkerTimer > 0);
    dom.damageFlash.style.opacity = String(clamp(state.damageFlashTimer / 0.28, 0, 1) * 0.9);
    dom.pausePanel.classList.toggle("hidden", canControlGame() || state.inventoryOpen || state.dead);
    dom.inventoryPanel.classList.toggle("hidden", !state.inventoryOpen);
    dom.deathPanel.classList.toggle("hidden", !state.dead);
}

function updateInventoryUI() {
    var item = currentHotbarItem();
    var lines = [];
    lines.push("<div class=\"inventory-line\"><span>Active Slot</span><span>" + (player.slot + 1) + " - " + item.short + "</span></div>");
    lines.push("<div class=\"inventory-line\"><span>Adventure Lv.</span><span>" + progression.level + "</span></div>");
    lines.push("<div class=\"inventory-line\"><span>Health</span><span>" + Math.round(player.health) + " / " + player.maxHealth + "</span></div>");
    lines.push("<div class=\"inventory-line\"><span>Attack</span><span>" + Math.round((player.stats && player.stats.attack) || 0) + "</span></div>");
    lines.push("<div class=\"inventory-line\"><span>Defense</span><span>" + Math.round((player.stats && player.stats.defense) || 0) + "</span></div>");
    if (item.kind === "weapon") {
        var ammo = player.ammo[item.weaponId];
        lines.push("<div class=\"inventory-line\"><span>Ammo</span><span>" + ammo.mag + " / " + ammo.reserve + "</span></div>");
        lines.push("<div class=\"inventory-line\"><span>Skill</span><span>" + weaponDefs[item.weaponId].skill.label + "</span></div>");
        lines.push("<div class=\"inventory-line\"><span>Burst</span><span>" + weaponDefs[item.weaponId].burst.label + "</span></div>");
    }
    dom.inventoryLoadout.innerHTML = lines.join("");

    if (dom.inventoryEquipment) {
        dom.inventoryEquipment.innerHTML = buildEquipmentSummaryLines();
    }

    var aliveEnemies = enemies.filter(function (enemy) {
        return enemy.state !== "dead";
    }).length;
    var worldLines = [];
    worldLines.push("<div class=\"inventory-line\"><span>Loaded Chunks</span><span>" + world.chunks.size + "</span></div>");
    worldLines.push("<div class=\"inventory-line\"><span>Biome</span><span>" + (GAME_DATA.biomes[world.currentBiomeId] ? GAME_DATA.biomes[world.currentBiomeId].name : "Unknown") + "</span></div>");
    worldLines.push("<div class=\"inventory-line\"><span>Explored Chunks</span><span>" + progression.metrics.chunksVisited + "</span></div>");
    worldLines.push("<div class=\"inventory-line\"><span>Discovered Biomes</span><span>" + progression.discoveredBiomes.size + "</span></div>");
    worldLines.push("<div class=\"inventory-line\"><span>Active Enemies</span><span>" + aliveEnemies + "</span></div>");
    worldLines.push("<div class=\"inventory-line\"><span>Ground Pickups</span><span>" + pickups.filter(function (pickup) { return pickup.active; }).length + "</span></div>");
    dom.inventoryWorld.innerHTML = worldLines.join("");

    if (dom.inventoryAchievements) {
        dom.inventoryAchievements.innerHTML = buildAchievementSummaryLines();
    }
    if (dom.inventoryPet) {
        dom.inventoryPet.innerHTML = buildPetSummaryLines();
    }
}

function buildHotbarUI() {
    hotbarEls = [];
    if (!dom.hotbar) {
        return;
    }
    dom.hotbar.innerHTML = "";
    hotbar.forEach(function (item, index) {
        var el = document.createElement("div");
        el.className = "slot panel";
        el.innerHTML = "<div class=\"slot-index\">" + (index + 1) + "</div><div class=\"slot-name\">" + item.name + "</div><div class=\"slot-meta\"></div>";
        dom.hotbar.appendChild(el);
        hotbarEls.push(el);
    });
    updateHotbarUI();
}

function updateHotbarUI() {
    if (!hotbarEls.length) {
        return;
    }
    hotbarEls.forEach(function (el, index) {
        var item = hotbar[index];
        el.classList.toggle("active", index === player.slot);
        var meta = "";
        if (item.kind === "weapon") {
            var ammo = player.ammo[item.weaponId];
            meta = ammo.mag + " / " + ammo.reserve;
        } else {
            meta = "Unarmed";
        }
        el.querySelector(".slot-meta").textContent = meta;
    });
}

function toggleInventory(forceValue) {
    if (state.dead) {
        return;
    }
    state.inventoryOpen = typeof forceValue === "boolean" ? forceValue : !state.inventoryOpen;
    updateInventoryUI();
    if (state.inventoryOpen && isPointerLocked()) {
        document.exitPointerLock();
    }
}

function registerInput() {
    document.addEventListener("contextmenu", function (event) {
        event.preventDefault();
    });

    canvas.addEventListener("click", function () {
        audio.ensure();
        if (!state.inventoryOpen && !state.dead && !isPointerLocked()) {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener("mousemove", function (event) {
        if (!canControlGame()) {
            return;
        }
        player.yaw += event.movementX * CONFIG.mouseSensitivity;
        player.pitch += event.movementY * CONFIG.mouseSensitivity;
        player.pitch = clamp(player.pitch, -1.25, 1.25);
        player.yawNode.rotation.y = player.yaw;
        player.pitchNode.rotation.x = player.pitch;
    });

    document.addEventListener("mousedown", function (event) {
        input.mouseButtons[event.button] = true;
        state.started = true;
        audio.ensure();
        if (event.button === 0 && !isPointerLocked() && !state.inventoryOpen && !state.dead) {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener("mouseup", function (event) {
        input.mouseButtons[event.button] = false;
        if (event.button === 0) {
            input.fireLatch = false;
        }
    });

    document.addEventListener("keydown", function (event) {
        input.keys[event.code] = true;
        if (event.code === "Space") {
            event.preventDefault();
            input.jumpQueued = true;
            return;
        }
        if (event.repeat && (event.code === "KeyE" || event.code === "KeyR" || event.code === "KeyQ" || event.code === "KeyF" || /^Digit[1-4]$/.test(event.code))) {
            return;
        }
        if (event.code === "KeyE") {
            event.preventDefault();
            toggleInventory();
        } else if (event.code === "KeyR") {
            startReload();
        } else if (event.code === "KeyQ") {
            useWeaponSkill();
        } else if (event.code === "KeyF") {
            useWeaponBurst();
        } else if (/^Digit[1-4]$/.test(event.code)) {
            setSlot(parseInt(event.code.replace("Digit", ""), 10) - 1);
        }
    });

    document.addEventListener("keyup", function (event) {
        input.keys[event.code] = false;
    });

    window.addEventListener("wheel", function (event) {
        event.preventDefault();
        var delta = event.deltaY > 0 ? 1 : -1;
        setSlot(player.slot + delta);
    }, { passive: false });

    dom.resumeBtn.addEventListener("click", function () {
        toggleInventory(false);
        canvas.requestPointerLock();
    });

    dom.openInventoryBtn.addEventListener("click", function () {
        toggleInventory(true);
    });

    dom.closeInventoryBtn.addEventListener("click", function () {
        toggleInventory(false);
    });

    dom.resumeFromInventoryBtn.addEventListener("click", function () {
        toggleInventory(false);
        canvas.requestPointerLock();
    });

    dom.respawnBtn.addEventListener("click", function () {
        respawnPlayer();
    });
}
