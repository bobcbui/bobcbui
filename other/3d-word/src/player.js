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

function createPlayerAvatar() {
    var skinMat = materials.enemySkin.clone("player-skin");
    var coatMat = materials.weaponMid.clone("player-coat");
    var trimMat = materials.weaponAccent.clone("player-trim");
    var hairMat = materials.weaponDark.clone("player-hair");

    var avatar = {
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

    function makePart(name, size, parent, positionOffset, material) {
        var part = BABYLON.MeshBuilder.CreateBox(name, size, scene);
        part.parent = parent;
        part.position.copyFrom(positionOffset);
        part.material = material;
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
    if (!player.avatar) {
        return;
    }

    var avatar = player.avatar;
    var walkSpeed = player.grounded ? lerp(2.4, 10.5, clamp(moveRatio, 0, 1)) : 2.4;
    avatar.walkPhase += dt * walkSpeed;

    var swing = Math.sin(avatar.walkPhase) * 0.75 * clamp(moveRatio, 0, 1);
    var armLift = aiming ? -0.45 : -0.12;
    var crouchOffset = crouching ? -0.18 : 0;

    avatar.root.position.y = lerp(avatar.root.position.y, crouchOffset, dt * 10);
    avatar.torso.rotation.x = lerp(avatar.torso.rotation.x, (crouching ? 0.18 : 0) + (aiming ? -0.08 : 0), dt * 10);
    avatar.head.rotation.x = lerp(avatar.head.rotation.x, -player.pitch * 0.35, dt * 8);
    avatar.leftArm.rotation.x = lerp(avatar.leftArm.rotation.x, armLift + swing, dt * 10);
    avatar.rightArm.rotation.x = lerp(avatar.rightArm.rotation.x, armLift - swing, dt * 10);
    avatar.leftLeg.rotation.x = lerp(avatar.leftLeg.rotation.x, -swing, dt * 10);
    avatar.rightLeg.rotation.x = lerp(avatar.rightLeg.rotation.x, swing, dt * 10);
}

function normalizeAngle(angle) {
    while (angle > Math.PI) {
        angle -= Math.PI * 2;
    }
    while (angle < -Math.PI) {
        angle += Math.PI * 2;
    }
    return angle;
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

function getGroundClearance(extraHeight) {
    return CONFIG.playerHalfHeight + (extraHeight === undefined ? 0.05 : extraHeight);
}

function getPlayerFootprintSurfaceHeight(x, z) {
    var inset = CONFIG.playerHalfWidth * 0.82;
    var offsets = [
        [0, 0],
        [inset, 0],
        [-inset, 0],
        [0, inset],
        [0, -inset],
        [inset, inset],
        [inset, -inset],
        [-inset, inset],
        [-inset, -inset]
    ];
    var maxHeight = getTerrainSurfaceHeight(x, z);
    for (var i = 0; i < offsets.length; i += 1) {
        maxHeight = Math.max(maxHeight, getTerrainSurfaceHeight(x + offsets[i][0], z + offsets[i][1]));
    }
    return maxHeight;
}

function getGroundContactHeight(x, z) {
    var sampledSurfaceY = getPlayerFootprintSurfaceHeight(x, z);
    var start = new BABYLON.Vector3(x, Math.max(sampledSurfaceY + 8, 40), z);
    var ray = new BABYLON.Ray(start, BABYLON.Vector3.Down(), 80);
    var hit = scene.pickWithRay(ray, function (mesh) {
        return !!(mesh && mesh.metadata && mesh.metadata.kind === "terrain");
    }, false);

    // Prefer the actual mesh hit if available — pickWithRay returns the real terrain geometry.
    if (hit && hit.hit && hit.pickedPoint) {
        return hit.pickedPoint.y;
    }
    return sampledSurfaceY;
}

function alignPlayerToSpawn(lockDuration) {
    var surfaceY = getGroundContactHeight(player.spawnPoint.x, player.spawnPoint.z);
    // Diagnostic log to help debug spawn alignment issues.
    try {
        console.debug("alignPlayerToSpawn: spawnPoint=", player.spawnPoint, "sampledSurfaceY=", surfaceY, "playerHalfHeight=", CONFIG.playerHalfHeight);
        if (world && world.chunks) {
            console.debug("alignPlayerToSpawn: chunks=", world.chunks.size, "terrainMeshCount=", world.terrainMeshCount);
            var spawnChunk = world.chunks.get(chunkKey(0,0));
            if (spawnChunk) {
                console.debug("alignPlayerToSpawn: spawnChunk.terrainMesh=", !!spawnChunk.terrainMesh, spawnChunk.terrainMesh && spawnChunk.terrainMesh.name);
            }
        }
    } catch (e) {
        // ignore logging errors
    }

    player.body.position.set(player.spawnPoint.x, surfaceY + getGroundClearance(0), player.spawnPoint.z);
    player.velocityY = 0;
    // Use a shorter spawn lock and snap with zero extra clearance so the feet sit flush with terrain.
    state.spawnLockTimer = lockDuration || 0.18;
    snapPlayerToGround(0);
}

function createViewModel() {
    viewModel.root = new BABYLON.TransformNode("view-root", scene);
    viewModel.root.parent = player.facingNode;
    viewModel.root.position.set(0.12, 0.4, 0.2); 
    // Scale it up a bit if it was designed for FP view
    viewModel.root.scaling.set(1.1, 1.1, 1.1);

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
    updatePlayerAvatar(dt, moveRatio, crouching, aim > 0.5);
    viewModel.aimBlend = lerp(viewModel.aimBlend, aim, dt * 9);
    viewModel.kick = lerp(viewModel.kick, 0, dt * 10);
    viewModel.bobPhase += dt * (moveRatio > 0.08 ? 7.6 : 2.2);

    var bobX = Math.sin(viewModel.bobPhase) * 0.03 * moveRatio;
    var bobY = Math.abs(Math.cos(viewModel.bobPhase)) * 0.02 * moveRatio;
    
    // In 3rd person, we want the "View Model" (which is now the player's weapon/arm)
    // to follow the body's orientation and tilt with pitch slightly.
    var targetX = 0.22 + bobX;
    var targetY = 0.4 - (crouching ? 0.15 : 0) + bobY + viewModel.kick * 0.1;
    var targetZ = 0.3 + viewModel.kick * 0.2;

    viewModel.root.position.x = lerp(viewModel.root.position.x, targetX, dt * 10);
    viewModel.root.position.y = lerp(viewModel.root.position.y, targetY, dt * 10);
    viewModel.root.position.z = lerp(viewModel.root.position.z, targetZ, dt * 10);
    
    // Tilt the weapon root based on pitch
    viewModel.root.rotation.x = player.pitch * 0.8 + viewModel.kick * 0.4;
    viewModel.root.rotation.y = viewModel.kick * 0.1;
    viewModel.root.rotation.z = -viewModel.kick * 0.2;

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
        if (mesh.metadata.kind === "terrain") {
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
    var groundY = getGroundContactHeight(player.body.position.x, player.body.position.z);
    var feetY = player.body.position.y - CONFIG.playerHalfHeight;
    return feetY <= groundY + 0.08;
}

function enforceGroundClearance(extraHeight) {
    var surfaceY = getGroundContactHeight(player.body.position.x, player.body.position.z);
    var minAllowedY = surfaceY + getGroundClearance(extraHeight);
    var snapGap = player.body.position.y - minAllowedY;
    if (player.body.position.y < minAllowedY) {
        player.body.position.y = minAllowedY;
        if (player.velocityY < 0) {
            player.velocityY = 0;
        }
        return true;
    }
    if (player.velocityY <= 0 && snapGap < 0.18) {
        player.body.position.y = minAllowedY;
        return true;
    }
    return false;
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
    if (!hotbar[0] || hotbar[0].kind !== "weapon") {
        hotbar[0] = createWeaponSlotItem("pistol");
    }
    if (player.ammo.pistol.mag <= 0 && player.ammo.pistol.reserve <= 0) {
        player.ammo.pistol.mag = weaponDefs.pistol.magazine;
        player.ammo.pistol.reserve = 24;
    }
    alignPlayerToSpawn(0.35);
    player.yaw = 0;
    player.facingYaw = 0;
    player.pitch = 0.25;
    player.facingNode.rotation.y = 0;
    player.yawNode.rotation.y = 0;
    player.pitchNode.rotation.x = 0.25;
    setSlot(0);
    state.dead = false;
    dom.deathPanel.classList.add("hidden");
}

function snapPlayerToGround(extraHeight) {
    if (!player.body || !scene) {
        return false;
    }

    var targetX = player.body.position.x;
    var targetZ = player.body.position.z;
    var sampledSurfaceY = getGroundContactHeight(targetX, targetZ);
    var clearance = getGroundClearance(extraHeight);
    var start = player.body.position.clone();
    start.y = Math.max(start.y + 4, 120);
    var ray = new BABYLON.Ray(start, BABYLON.Vector3.Down(), 200);

    var hit = scene.pickWithRay(ray, function (mesh) {
        return !!(mesh && mesh.metadata && mesh.metadata.kind === "terrain");
    }, false);

    try {
        console.debug("snapPlayerToGround: start=", start, "sampledSurfaceY=", sampledSurfaceY, "clearance=", clearance);
        if (hit && hit.hit) {
            console.debug("snapPlayerToGround: ray hit mesh=", hit.pickedMesh && hit.pickedMesh.name, "pickedPoint=", hit.pickedPoint, "distance=", hit.distance);
        } else {
            console.debug("snapPlayerToGround: ray did not hit terrain; using sampledSurfaceY");
        }
    } catch (e) {
        // ignore
    }

    if (hit && hit.hit && hit.pickedPoint) {
        // Use the raycast picked point as authoritative for the visible terrain surface.
        player.body.position.y = hit.pickedPoint.y + clearance;
        player.velocityY = 0;
        try { console.debug("snapPlayerToGround: finalY=", player.body.position.y); } catch (e) {}
        return true;
    }

    // Fallback to sampled procedural height when raycast doesn't hit.
    player.body.position.y = sampledSurfaceY + clearance;
    player.velocityY = 0;
    try { console.debug("snapPlayerToGround: finalY(no hit)=", player.body.position.y); } catch (e) {}
    return false;
}

function computeWeaponDamage(def, multiplier) {
    var stats = player.stats || {};
    return Math.max(1, Math.round((def.damage + (stats.attack || 0)) * (multiplier || 1)));
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
        return mesh.metadata.kind === "terrain" || mesh.metadata.kind === "enemyPart";
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
        } else if (pick.pickedMesh.metadata.kind === "terrain") {
            spawnBurst(pick.pickedPoint, getTerrainImpactColor(pick.pickedMesh), 6, 0.08, 3.4);
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
    player.primaryCooldown = def.fireRate;
    viewModel.kick += def.recoil;
    viewModel.muzzleTimer = 0.05;
    audio.playShoot(item.weaponId);
    performRayAttack(def.range, computeWeaponDamage(def, 1), 0);

    if (ammo.mag <= 0 && ammo.reserve > 0) {
        startReload();
    }
}

function updateCombat(dt) {
    player.primaryCooldown = Math.max(0, player.primaryCooldown - dt);

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
    if (state.spawnLockTimer > 0) {
        state.spawnLockTimer = Math.max(0, state.spawnLockTimer - dt);
        // During spawn lock, ensure we snap without extra clearance so the feet align precisely.
        snapPlayerToGround(0);
        player.velocityY = 0;
        updateViewModel(dt, 0);
        return;
    }

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

    var cameraForward = new BABYLON.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    var cameraRight = new BABYLON.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    var move = cameraForward.scale(moveZ).add(cameraRight.scale(moveX));
    if (move.lengthSquared() > 1) {
        move.normalize();
    }

    var crouch = !!(input.keys.ShiftLeft || input.keys.ShiftRight);
    var moveBonus = player.stats ? player.stats.moveSpeed || 0 : 0;
    var speedScale = (moveZ < 0 && moveX === 0) ? 0.55 : 1;
    var speed = CONFIG.playerSpeed * (1 + moveBonus) * (crouch ? CONFIG.crouchMultiplier : 1) * speedScale;

    if (move.lengthSquared() > 0.0001 && !(moveZ < 0 && moveX === 0)) {
        var targetFacingYaw = Math.atan2(move.x, move.z);
        var yawDelta = normalizeAngle(targetFacingYaw - player.facingYaw);
        player.facingYaw += yawDelta * Math.min(1, dt * 12);
    }
    player.facingNode.rotation.y = player.facingYaw;

    var displacement = move.scale(speed * dt);
    displacement.y = player.velocityY * dt;

    var previous = player.body.position.clone();

    var nextX = player.body.position.x + displacement.x;
    var nextZ = player.body.position.z + displacement.z;
    var surfaceY = getGroundContactHeight(nextX, nextZ);
    var minAllowedY = surfaceY + getGroundClearance(0);
    if (player.body.position.y + displacement.y < minAllowedY) {
        displacement.y = minAllowedY - player.body.position.y;
        player.velocityY = 0;
    }

    player.body.moveWithCollisions(displacement);
    var moved = player.body.position.subtract(previous);
    // If player didn't move significantly in XZ when a move was requested, consider them stuck.
    if ((Math.abs(displacement.x) > 0.001 || Math.abs(displacement.z) > 0.001) && Math.abs(moved.x) < 0.001 && Math.abs(moved.z) < 0.001) {
        player.stuckCounter = (player.stuckCounter || 0) + 1;
        var now = performance.now();
        if (player.stuckCounter > 6 && now - (player.lastBlockedLogTime || 0) > 800) {
            console.warn("Player appears stuck at", player.body.position, "attempted displacement", displacement);
            player.lastBlockedLogTime = now;
        }
        // Try a small upward nudge to escape geometry (temporary unstuck)
        player.body.position.y += 0.06;
    } else {
        player.stuckCounter = 0;
    }
    enforceGroundClearance(0);

    var groundedAfter = isGrounded();
    player.grounded = groundedAfter;
    if (groundedAfter && player.velocityY < 0) {
        player.velocityY = -0.01;
    }
    
    if (player.body.position.y < -30) {
        damagePlayer(999, "You fell out of the world.");
    }

    player.pitchNode.position.y = lerp(
        player.pitchNode.position.y,
        crouch ? CONFIG.cameraPivotCrouchHeight : CONFIG.cameraPivotHeight,
        dt * 12
    );
    player.cameraRoot.position.y = lerp(
        player.cameraRoot.position.y,
        crouch ? CONFIG.cameraRootCrouchHeight : CONFIG.cameraRootHeight,
        dt * 12
    );
    var isAiming = currentWeaponDef() && input.mouseButtons[2];
    var targetCamZ = isAiming ? CONFIG.cameraAimDistance : CONFIG.cameraFollowDistance;
    // Clamp target camera distances to configured min/max
    targetCamZ = Math.max(CONFIG.cameraMinDistance, Math.min(CONFIG.cameraMaxDistance, targetCamZ));
    var targetCamX = isAiming ? CONFIG.cameraAimShoulderX : CONFIG.cameraShoulderX;
    player.camera.position.x = lerp(player.camera.position.x, targetCamX, dt * 8);
    player.camera.position.z = lerp(player.camera.position.z, targetCamZ, dt * 6);
    player.camera.fov = lerp(player.camera.fov, isAiming ? 0.75 : 0.85, dt * 10);

    var cameraPivot = player.cameraRoot.getAbsolutePosition();
    var cameraOffset = player.camera.globalPosition.subtract(cameraPivot);
    var cameraDistance = cameraOffset.length();
    var ray = new BABYLON.Ray(cameraPivot, cameraOffset.scale(1 / Math.max(cameraDistance, 0.0001)), cameraDistance);
    var pick = scene.pickWithRay(ray, function(mesh) {
        return mesh && mesh.metadata && mesh.metadata.kind === "terrain";
    });
    if (pick && pick.hit) {
        var safeDistance = Math.max(0, pick.distance - 0.2);
        var retract = safeDistance / Math.max(cameraDistance, 0.0001);
        player.camera.position.x *= retract;
        player.camera.position.z *= retract;
    }

    var travelled = player.body.position.subtract(previous);
    var planarDistance = Math.sqrt(travelled.x * travelled.x + travelled.z * travelled.z);
    registerTravelDistance(planarDistance);
    var planar = planarDistance / Math.max(dt, 0.001);
    var moveRatio = canControlGame() ? clamp(planar / Math.max(0.01, speed), 0, 1.2) : 0;
    updateViewModel(dt, moveRatio);
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

    var aliveEnemies = enemies.filter(function (enemy) {
        return enemy.state !== "dead";
    }).length;
    var biome = GAME_DATA.biomes[world.currentBiomeId] || GAME_DATA.biomes.meadow;
    var status = state.dead ? "Down" : (canControlGame() ? "Exploring" : "Paused");
    if (player.reloading && item.kind === "weapon") {
        status += " | Reloading";
    }
    dom.statusText.textContent = status + " | Lv." + progression.level + " | " + biome.name + " | Enemies " + aliveEnemies;
    dom.damageFlash.style.opacity = String(clamp(state.damageFlashTimer / 0.28, 0, 1) * 0.9);
    dom.pausePanel.classList.toggle("hidden", canControlGame() || state.dead);
    dom.deathPanel.classList.toggle("hidden", !state.dead);
}

function updateInventoryUI() {
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
    return forceValue;
}

function registerInput() {
    document.addEventListener("contextmenu", function (event) {
        event.preventDefault();
    });

    canvas.addEventListener("click", function () {
        audio.ensure();
        if (!state.dead && !isPointerLocked()) {
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
        audio.ensure();
        if (event.button === 0 && !isPointerLocked() && !state.dead) {
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
        if (event.repeat && (event.code === "KeyR" || /^Digit[1-4]$/.test(event.code))) {
            return;
        }
        if (event.code === "KeyR") {
            startReload();
        } else if (/^Digit[1-4]$/.test(event.code)) {
            setSlot(parseInt(event.code.replace("Digit", ""), 10) - 1);
        }
    });

    document.addEventListener("keyup", function (event) {
        input.keys[event.code] = false;
    });

    // Mouse wheel now controls camera follow distance (replace hotbar wheel behavior).
    window.addEventListener("wheel", function (event) {
        event.preventDefault();
        // Normalize delta: positive means zoom out (more negative Z), negative means zoom in
        var delta = event.deltaY > 0 ? -1 : 1;
        // Change camera follow distance in steps, keep within configured bounds
        var step = 0.8;
        var newFollow = CONFIG.cameraFollowDistance + delta * step;
        newFollow = Math.max(CONFIG.cameraMinDistance, Math.min(CONFIG.cameraMaxDistance, newFollow));
        CONFIG.cameraFollowDistance = newFollow;
        // Also scale aim distance proportionally (so zoom in aim feels consistent)
        var aimScale = 0.48; // keep aim noticeably closer
        CONFIG.cameraAimDistance = Math.max(CONFIG.cameraMinDistance, Math.min(CONFIG.cameraMaxDistance, newFollow * aimScale));
    }, { passive: false });

    dom.resumeBtn.addEventListener("click", function () {
        canvas.requestPointerLock();
    });

    dom.respawnBtn.addEventListener("click", function () {
        respawnPlayer();
    });
}
