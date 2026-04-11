"use strict";

function makeMaterial(name, hex, alpha) {
    var material = new BABYLON.StandardMaterial(name, scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(hex);
    material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
    material.emissiveColor = material.diffuseColor.scale(0.07);
    if (alpha !== undefined) {
        material.alpha = alpha;
    }
    return material;
}

function ensureMaterialCatalog() {
    Object.keys(BLOCK_TYPES).forEach(function (type) {
        materials[type] = makeMaterial("mat-" + type, BLOCK_TYPES[type].color, BLOCK_TYPES[type].alpha);
    });
    materials.enemySkin = makeMaterial("enemy-skin", "#d6b28b");
    materials.enemySuit = makeMaterial("enemy-suit", "#5d6f9a");
    materials.enemyEye = makeMaterial("enemy-eye", "#ff5454");
    materials.weaponDark = makeMaterial("weapon-dark", "#32414f");
    materials.weaponMid = makeMaterial("weapon-mid", "#657789");
    materials.weaponAccent = makeMaterial("weapon-accent", "#e4c96c");
    materials.uiGlow = makeMaterial("ui-glow", "#d7f4ff", 0.82);
    materials.pickupRed = makeMaterial("pickup-red", "#ff6a66");
    materials.pickupWhite = makeMaterial("pickup-white", "#f4f7fb");
    materials.pickupBlue = makeMaterial("pickup-blue", "#65c8ff");
    materials.pickupWood = makeMaterial("pickup-wood", "#8f6338");
    materials.pickupMetal = makeMaterial("pickup-metal", "#9aa8b6");
    materials.pickupGear = makeMaterial("pickup-gear", "#ffd35d");
    materials.pickupSnow = makeMaterial("pickup-snow", "#d8f5ff");
}

function createSkyAndLights() {
    var hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.18, 1, 0.1), scene);
    hemi.intensity = 0.95;
    hemi.groundColor = new BABYLON.Color3(0.17, 0.2, 0.24);

    var sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.7, -1, -0.55), scene);
    sun.position = new BABYLON.Vector3(20, 30, 18);
    sun.intensity = 0.58;

    var sky = BABYLON.MeshBuilder.CreateBox("sky", { size: 500, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
    sky.isPickable = false;
    sky.checkCollisions = false;

    var skyMat = new BABYLON.StandardMaterial("sky-mat", scene);
    skyMat.disableLighting = true;
    skyMat.emissiveColor = new BABYLON.Color3(0.56, 0.76, 0.98);
    sky.material = skyMat;
}

function getBiomeAt(x, z) {
    var temperature = smoothNoise(x * 0.03 + 100, z * 0.03 - 45);
    var moisture = smoothNoise(x * 0.03 - 80, z * 0.03 + 12);
    if (temperature > 0.66 && moisture < 0.4) {
        return GAME_DATA.biomes.desert;
    }
    if (temperature < 0.3) {
        return GAME_DATA.biomes.snow;
    }
    if (moisture > 0.58) {
        return GAME_DATA.biomes.forest;
    }
    return GAME_DATA.biomes.meadow;
}

function updateColumnHeight(x, z) {
    var key = columnKey(x, z);
    var top = world.minY - 1;
    for (var y = world.maxY; y >= world.minY; y -= 1) {
        if (world.blocks.has(blockKey(x, y, z))) {
            top = y;
            break;
        }
    }
    if (top < world.minY - 1) {
        world.columns["delete"](key);
    } else {
        world.columns.set(key, top);
    }
}

function getColumnTop(x, z) {
    return world.columns.has(columnKey(x, z)) ? world.columns.get(columnKey(x, z)) : world.minY - 1;
}

function getBlockAt(x, y, z) {
    return world.blocks.get(blockKey(x, y, z)) || null;
}

function hasBlockAt(x, y, z) {
    return world.blocks.has(blockKey(x, y, z));
}

function addBlock(x, y, z, type, options) {
    var opts = options || {};
    var key = blockKey(x, y, z);
    if (world.blocks.has(key)) {
        return world.blocks.get(key);
    }

    var mesh = BABYLON.MeshBuilder.CreateBox("block-" + key, { size: 1 }, scene);
    mesh.position.set(x, y, z);
    mesh.material = materials[type];
    mesh.isPickable = true;
    mesh.checkCollisions = BLOCK_TYPES[type].solid;
    mesh.metadata = {
        kind: "block",
        type: type,
        x: x,
        y: y,
        z: z,
        protected: !!opts.protected,
        chunkKey: opts.chunkKey || null
    };
    if (type === "glass") {
        mesh.visibility = 0.85;
    }
    mesh.freezeWorldMatrix();
    world.blocks.set(key, mesh);
    world.maxY = Math.max(world.maxY, y);
    world.blockCount += 1;
    updateColumnHeight(x, z);
    if (opts.chunkRef) {
        opts.chunkRef.blocks.push(mesh);
    }
    return mesh;
}

function removeBlock(x, y, z, silent) {
    var key = blockKey(x, y, z);
    var mesh = world.blocks.get(key);
    if (!mesh || !mesh.metadata || mesh.metadata.kind !== "block" || mesh.metadata.protected) {
        return false;
    }
    var blockType = mesh.metadata.type;
    world.blocks["delete"](key);
    world.blockCount = Math.max(0, world.blockCount - 1);
    mesh.dispose(false, true);
    updateColumnHeight(x, z);
    if (!silent) {
        spawnBurst(vec3(x, y, z), BLOCK_TYPES[blockType].color, 9, 0.11, 4.4);
        audio.playBlock();
    }
    return true;
}

function replaceBlock(x, y, z, type) {
    var existing = getBlockAt(x, y, z);
    if (!existing || !existing.metadata || existing.metadata.kind !== "block" || existing.metadata.type === type) {
        return;
    }
    var protectedFlag = existing.metadata.protected;
    removeBlock(x, y, z, true);
    addBlock(x, y, z, type, { protected: protectedFlag });
}

function setColumnToHeight(x, z, targetY, topType, chunkRef) {
    var current = getColumnTop(x, z);
    if (current < targetY) {
        for (var y = current + 1; y <= targetY; y += 1) {
            addBlock(x, y, z, y === targetY ? (topType || "dirt") : "stone", {
                chunkKey: chunkRef ? chunkRef.key : null,
                chunkRef: chunkRef
            });
        }
    } else if (current > targetY) {
        for (var yy = current; yy > targetY; yy -= 1) {
            removeBlock(x, yy, z, true);
        }
    }
    replaceBlock(x, targetY, z, topType || "dirt");
}

function preparePlot(cx, cz, halfW, halfD, topType, chunkRef) {
    var sum = 0;
    var count = 0;
    for (var x = cx - halfW; x <= cx + halfW; x += 1) {
        for (var z = cz - halfD; z <= cz + halfD; z += 1) {
            sum += getColumnTop(x, z);
            count += 1;
        }
    }
    var target = Math.round(sum / Math.max(1, count));
    for (var px = cx - halfW; px <= cx + halfW; px += 1) {
        for (var pz = cz - halfD; pz <= cz + halfD; pz += 1) {
            setColumnToHeight(px, pz, target, topType || "stone", chunkRef);
        }
    }
    return target;
}

function createTree(x, z, chunkRef, biome) {
    var baseY = getColumnTop(x, z);
    if (baseY < 1 || baseY > 6 || hasBlockAt(x, baseY + 1, z)) {
        return;
    }
    var trunk = biome && biome.id === "snow" ? 4 : 3 + Math.floor(hash2(x + 10, z - 12) * 2);
    for (var i = 1; i <= trunk; i += 1) {
        addBlock(x, baseY + i, z, "wood", { chunkKey: chunkRef.key, chunkRef: chunkRef });
    }
    for (var dx = -1; dx <= 1; dx += 1) {
        for (var dz = -1; dz <= 1; dz += 1) {
            for (var dy = 0; dy <= 1; dy += 1) {
                if (Math.abs(dx) + Math.abs(dz) < 3) {
                    addBlock(x + dx, baseY + trunk + dy, z + dz, biome && biome.id === "snow" ? "snow" : "leaf", {
                        chunkKey: chunkRef.key,
                        chunkRef: chunkRef
                    });
                }
            }
        }
    }
    addBlock(x, baseY + trunk + 2, z, biome && biome.id === "snow" ? "snow" : "leaf", {
        chunkKey: chunkRef.key,
        chunkRef: chunkRef
    });
}

function createRockPile(x, z, chunkRef, biome) {
    var baseY = getColumnTop(x, z);
    for (var dx = -1; dx <= 1; dx += 1) {
        for (var dz = -1; dz <= 1; dz += 1) {
            if (hash2(x + dx * 3, z + dz * 5) > 0.45) {
                addBlock(
                    x + dx,
                    baseY + (Math.abs(dx) + Math.abs(dz) === 0 ? 1 : 0),
                    z + dz,
                    biome && biome.id === "desert" ? "sand" : (hash2(x + dx, z + dz) > 0.8 ? "metal" : "stone"),
                    { chunkKey: chunkRef.key, chunkRef: chunkRef }
                );
            }
        }
    }
}

function createCoverLine(x, z, length, axis, type, chunkRef) {
    var baseY = preparePlot(
        x,
        z,
        axis === "x" ? Math.ceil(length / 2) + 1 : 1,
        axis === "z" ? Math.ceil(length / 2) + 1 : 1,
        "stone",
        chunkRef
    ) + 1;
    for (var i = 0; i < length; i += 1) {
        var bx = axis === "x" ? x + i : x;
        var bz = axis === "z" ? z + i : z;
        addBlock(bx, baseY, bz, type || "brick", { chunkKey: chunkRef.key, chunkRef: chunkRef });
        if (i % 2 === 0) {
            addBlock(bx, baseY + 1, bz, type || "brick", { chunkKey: chunkRef.key, chunkRef: chunkRef });
        }
    }
}

function createHut(cx, cz, w, d, h, chunkRef) {
    var halfW = Math.floor(w / 2);
    var halfD = Math.floor(d / 2);
    var baseY = preparePlot(cx, cz, halfW + 1, halfD + 1, "stone", chunkRef) + 1;

    for (var x = cx - halfW; x <= cx + halfW; x += 1) {
        for (var z = cz - halfD; z <= cz + halfD; z += 1) {
            addBlock(x, baseY - 1, z, "wood", { chunkKey: chunkRef.key, chunkRef: chunkRef });
            for (var y = 0; y < h; y += 1) {
                var edge = x === cx - halfW || x === cx + halfW || z === cz - halfD || z === cz + halfD;
                if (edge) {
                    addBlock(x, baseY + y, z, "brick", { chunkKey: chunkRef.key, chunkRef: chunkRef });
                } else {
                    removeBlock(x, baseY + y, z, true);
                }
            }
        }
    }

    for (var rx = cx - halfW - 1; rx <= cx + halfW + 1; rx += 1) {
        for (var rz = cz - halfD - 1; rz <= cz + halfD + 1; rz += 1) {
            addBlock(rx, baseY + h, rz, "wood", { chunkKey: chunkRef.key, chunkRef: chunkRef });
        }
    }

    addBlock(cx, baseY + 1, cz - halfD, "glass", { chunkKey: chunkRef.key, chunkRef: chunkRef });
    removeBlock(cx, baseY, cz + halfD, true);
    removeBlock(cx, baseY + 1, cz + halfD, true);
}

function worldToChunkCoord(value) {
    return Math.floor(value / CONFIG.chunkSize);
}

function chunkToWorldOrigin(chunkX, chunkZ) {
    return {
        x: chunkX * CONFIG.chunkSize,
        z: chunkZ * CONFIG.chunkSize
    };
}

function createChunk(chunkX, chunkZ) {
    var key = chunkKey(chunkX, chunkZ);
    if (world.chunks.has(key)) {
        return world.chunks.get(key);
    }

    var centerX = chunkX * CONFIG.chunkSize + CONFIG.chunkSize * 0.5;
    var centerZ = chunkZ * CONFIG.chunkSize + CONFIG.chunkSize * 0.5;
    var biome = getBiomeAt(centerX, centerZ);
    var chunk = {
        x: chunkX,
        z: chunkZ,
        key: key,
        biomeId: biome.id,
        blocks: [],
        pickups: [],
        enemies: []
    };
    world.chunks.set(key, chunk);

    generateChunkTerrain(chunk);
    populateChunk(chunk);
    return chunk;
}

function generateChunkTerrain(chunk) {
    var origin = chunkToWorldOrigin(chunk.x, chunk.z);
    for (var lx = 0; lx < CONFIG.chunkSize; lx += 1) {
        for (var lz = 0; lz < CONFIG.chunkSize; lz += 1) {
            var x = origin.x + lx;
            var z = origin.z + lz;
            var biome = getBiomeAt(x, z);
            var height = terrainHeight(x, z);
            if (Math.abs(x) <= 3 && Math.abs(z) <= 3) {
                height = 2;
            }
            for (var y = CONFIG.minWorldY; y <= height; y += 1) {
                var type = "stone";
                if (y === height) {
                    type = biome.topBlock;
                } else if (y >= height - 1) {
                    type = biome.subsurfaceBlock;
                }
                addBlock(x, y, z, type, {
                    protected: Math.abs(x) <= 1 && Math.abs(z) <= 1 && y <= height,
                    chunkKey: chunk.key,
                    chunkRef: chunk
                });
            }
        }
    }
}

function populateChunk(chunk) {
    var origin = chunkToWorldOrigin(chunk.x, chunk.z);
    var biome = GAME_DATA.biomes[chunk.biomeId];
    var isSpawnChunk = chunk.x === 0 && chunk.z === 0;

    if (isSpawnChunk) {
        setColumnToHeight(0, 0, 2, "metal", chunk);
        setColumnToHeight(0, 1, 2, "metal", chunk);
        setColumnToHeight(1, 0, 2, "metal", chunk);
        setColumnToHeight(0, -1, 2, "metal", chunk);
        setColumnToHeight(-1, 0, 2, "metal", chunk);
    }

    for (var lx = 1; lx < CONFIG.chunkSize - 1; lx += 1) {
        for (var lz = 1; lz < CONFIG.chunkSize - 1; lz += 1) {
            var x = origin.x + lx;
            var z = origin.z + lz;
            var roll = hash2(x * 1.7, z * 1.3);
            if (Math.abs(x) <= 4 && Math.abs(z) <= 4) {
                continue;
            }
            if (roll > 1 - biome.treeChance) {
                createTree(x, z, chunk, biome);
            } else if (roll > 1 - biome.treeChance - biome.rockChance) {
                createRockPile(x, z, chunk, biome);
            }
        }
    }

    var structureRoll = hash2(chunk.x * 0.91 + 17, chunk.z * 0.87 - 12);
    if (!isSpawnChunk && structureRoll > 0.92) {
        createHut(origin.x + 6, origin.z + 6, 5, 5, 3, chunk);
    } else if (!isSpawnChunk && structureRoll > 0.84) {
        createCoverLine(origin.x + 3, origin.z + 5, 4, structureRoll > 0.88 ? "x" : "z", biome.id === "desert" ? "sand" : "brick", chunk);
    }

    populateChunkEntities(chunk, biome);
}

function chooseChunkPickupType(biome) {
    var pool = biome.pickupBias || ["food", "gear", "pistol"];
    return pool[Math.floor(Math.random() * pool.length)];
}

function populateChunkEntities(chunk, biome) {
    if (typeof createEnemy !== "function") {
        return;
    }

    var origin = chunkToWorldOrigin(chunk.x, chunk.z);
    var baseEnemies = Math.abs(chunk.x) + Math.abs(chunk.z) < 2 ? 1 : 2;
    var enemyCount = Math.max(1, Math.round(baseEnemies * biome.enemyScale));
    var pickupCount = Math.abs(chunk.x) + Math.abs(chunk.z) < 1 ? 2 : 1 + Math.round(Math.random());

    for (var i = 0; i < enemyCount; i += 1) {
        var ex = origin.x + 2 + Math.floor(Math.random() * (CONFIG.chunkSize - 4));
        var ez = origin.z + 2 + Math.floor(Math.random() * (CONFIG.chunkSize - 4));
        if (Math.abs(ex) <= 4 && Math.abs(ez) <= 4) {
            continue;
        }
        var enemyPos = vec3(ex, getColumnTop(ex, ez) + 0.55, ez);
        var enemy = createEnemy(enemyPos, world.enemySerial++, {
            chunkKey: chunk.key,
            biomeId: chunk.biomeId,
            tier: Math.max(1, progression.level + Math.abs(chunk.x) + Math.abs(chunk.z))
        });
    }

    for (var p = 0; p < pickupCount; p += 1) {
        var px = origin.x + 2 + Math.floor(Math.random() * (CONFIG.chunkSize - 4));
        var pz = origin.z + 2 + Math.floor(Math.random() * (CONFIG.chunkSize - 4));
        if (Math.abs(px) <= 3 && Math.abs(pz) <= 3) {
            continue;
        }
        var type = chooseChunkPickupType(biome);
        createPickup(type, vec3(px, getColumnTop(px, pz) + 1.35, pz), {
            chunkKey: chunk.key,
            biomeId: chunk.biomeId
        });
    }
}

function disposePickup(pickup) {
    if (!pickup) {
        return;
    }
    if (pickup.chunkKey && world.chunks.has(pickup.chunkKey)) {
        var chunk = world.chunks.get(pickup.chunkKey);
        var chunkIndex = chunk.pickups.indexOf(pickup);
        if (chunkIndex >= 0) {
            chunk.pickups.splice(chunkIndex, 1);
        }
    }
    if (pickup.root) {
        pickup.root.dispose(false, true);
    }
    var index = pickups.indexOf(pickup);
    if (index >= 0) {
        pickups.splice(index, 1);
    }
}

function disposeChunk(chunk) {
    if (!chunk) {
        return;
    }

    chunk.pickups.slice().forEach(function (pickup) {
        disposePickup(pickup);
    });

    if (typeof disposeEnemy === "function") {
        chunk.enemies.slice().forEach(function (enemy) {
            disposeEnemy(enemy);
        });
    }

    chunk.blocks.slice().forEach(function (mesh) {
        if (!mesh || !mesh.metadata) {
            return;
        }
        var key = blockKey(mesh.metadata.x, mesh.metadata.y, mesh.metadata.z);
        world.blocks["delete"](key);
        mesh.dispose(false, true);
        world.blockCount = Math.max(0, world.blockCount - 1);
        updateColumnHeight(mesh.metadata.x, mesh.metadata.z);
    });

    world.chunks["delete"](chunk.key);
}

function ensureChunksAround(chunkX, chunkZ) {
    for (var x = chunkX - CONFIG.activeChunkRadius; x <= chunkX + CONFIG.activeChunkRadius; x += 1) {
        for (var z = chunkZ - CONFIG.activeChunkRadius; z <= chunkZ + CONFIG.activeChunkRadius; z += 1) {
            createChunk(x, z);
        }
    }
}

function unloadFarChunks(chunkX, chunkZ) {
    var toRemove = [];
    world.chunks.forEach(function (chunk) {
        if (Math.abs(chunk.x - chunkX) > CONFIG.unloadChunkRadius || Math.abs(chunk.z - chunkZ) > CONFIG.unloadChunkRadius) {
            toRemove.push(chunk);
        }
    });
    toRemove.forEach(disposeChunk);
}

function generateWorld() {
    ensureChunksAround(0, 0);
    world.currentChunkX = 0;
    world.currentChunkZ = 0;
    world.currentBiomeId = getBiomeAt(0, 0).id;
    registerChunkVisit(0, 0, world.currentBiomeId);
    player.spawnPoint = new BABYLON.Vector3(0, getColumnTop(0, 0) + 1.4, 0);
}

function updateWorldStreaming() {
    if (!player.body) {
        return;
    }
    var chunkX = worldToChunkCoord(player.body.position.x);
    var chunkZ = worldToChunkCoord(player.body.position.z);
    world.currentChunkX = chunkX;
    world.currentChunkZ = chunkZ;
    world.currentBiomeId = getBiomeAt(player.body.position.x, player.body.position.z).id;

    ensureChunksAround(chunkX, chunkZ);
    unloadFarChunks(chunkX, chunkZ);
    registerChunkVisit(chunkX, chunkZ, world.currentBiomeId);
}

function createParticleMaterial(hex) {
    if (particleMaterials[hex]) {
        return particleMaterials[hex];
    }
    var material = new BABYLON.StandardMaterial("particle-" + hex.replace("#", ""), scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(hex);
    material.emissiveColor = material.diffuseColor.scale(0.28);
    material.specularColor = BABYLON.Color3.Black();
    particleMaterials[hex] = material;
    return material;
}

function spawnBurst(position, colorHex, count, size, speed) {
    for (var i = 0; i < count; i += 1) {
        var mesh = BABYLON.MeshBuilder.CreateBox("particle", { size: size }, scene);
        mesh.material = createParticleMaterial(colorHex);
        mesh.isPickable = false;
        mesh.checkCollisions = false;
        mesh.position.copyFrom(position);
        particles.push({
            mesh: mesh,
            life: 0.28 + Math.random() * 0.22,
            velocity: new BABYLON.Vector3(
                (Math.random() - 0.5) * speed,
                Math.random() * speed * 0.55,
                (Math.random() - 0.5) * speed
            )
        });
    }
}

function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i -= 1) {
        var particle = particles[i];
        particle.life -= dt;
        if (particle.life <= 0) {
            particle.mesh.dispose(false, true);
            particles.splice(i, 1);
            continue;
        }
        particle.velocity.y -= 12 * dt;
        particle.mesh.position.addInPlace(particle.velocity.scale(dt));
        particle.mesh.rotation.x += 6 * dt;
        particle.mesh.rotation.y += 7 * dt;
    }
}

function createPickup(type, position, options) {
    var opts = options || {};
    var root = new BABYLON.TransformNode("pickup-" + type + "-" + Math.floor(Math.random() * 100000), scene);
    root.position.copyFrom(position);

    function makePart(name, size, offset, material) {
        var part = BABYLON.MeshBuilder.CreateBox(name, size, scene);
        part.parent = root;
        part.position.copyFrom(offset);
        part.material = material;
        part.isPickable = false;
        part.checkCollisions = false;
    }

    if (type === "food") {
        makePart("food-body", { width: 0.52, height: 0.52, depth: 0.52 }, vec3(0, 0, 0), materials.pickupRed);
        makePart("food-leaf", { width: 0.12, height: 0.18, depth: 0.12 }, vec3(0.1, 0.28, 0), materials.leaf);
    } else if (type === "pistol") {
        makePart("pickup-pistol-grip", { width: 0.12, height: 0.34, depth: 0.1 }, vec3(-0.1, -0.04, 0), materials.weaponDark);
        makePart("pickup-pistol-body", { width: 0.44, height: 0.14, depth: 0.14 }, vec3(0.08, 0.1, 0), materials.weaponMid);
    } else if (type === "rifle") {
        makePart("pickup-rifle-stock", { width: 0.18, height: 0.12, depth: 0.12 }, vec3(-0.18, 0.06, 0), materials.weaponDark);
        makePart("pickup-rifle-body", { width: 0.52, height: 0.14, depth: 0.14 }, vec3(0.06, 0.06, 0), materials.weaponMid);
        makePart("pickup-rifle-mag", { width: 0.1, height: 0.22, depth: 0.1 }, vec3(0.02, -0.12, 0), materials.weaponAccent);
    } else if (type === "gear") {
        makePart("pickup-gear-core", { width: 0.44, height: 0.44, depth: 0.44 }, vec3(0, 0.06, 0), materials.pickupGear);
        makePart("pickup-gear-base", { width: 0.78, height: 0.12, depth: 0.78 }, vec3(0, -0.28, 0), materials.weaponDark);
        makePart("pickup-gear-gem", { width: 0.18, height: 0.18, depth: 0.18 }, vec3(0, 0.34, 0), materials.pickupBlue);
    } else {
        makePart("supply-core", { width: 0.62, height: 0.62, depth: 0.62 }, vec3(0, 0, 0), materials.pickupBlue);
        makePart("supply-base", { width: 0.9, height: 0.12, depth: 0.9 }, vec3(0, -0.32, 0), materials.weaponDark);
    }

    var pickup = {
        type: type,
        root: root,
        basePos: position.clone(),
        bob: Math.random() * Math.PI * 2,
        active: true,
        respawnTimer: 0,
        respawnDelay: type === "gear" ? 18 + Math.random() * 8 : 11 + Math.random() * 5,
        pickupRadius: type === "food" ? 1.85 : 1.95,
        chunkKey: opts.chunkKey || null,
        biomeId: opts.biomeId || null
    };
    pickups.push(pickup);
    if (pickup.chunkKey && world.chunks.has(pickup.chunkKey)) {
        var chunk = world.chunks.get(pickup.chunkKey);
        if (chunk.pickups.indexOf(pickup) < 0) {
            chunk.pickups.push(pickup);
        }
    }
    return pickup;
}

function collectPickup(pickup) {
    if (!pickup.active) {
        return;
    }
    pickup.active = false;
    pickup.root.setEnabled(false);
    pickup.respawnTimer = pickup.respawnDelay;

    if (pickup.type === "food") {
        player.health = clamp(player.health + 22, 0, player.maxHealth);
        showToast("Collected field rations. Health restored.", 1.8);
    } else if (pickup.type === "pistol" || pickup.type === "rifle") {
        grantWeaponPickup(pickup.type);
    } else if (pickup.type === "gear") {
        grantEquipmentDrop();
    } else {
        player.health = clamp(player.health + 12, 0, player.maxHealth);
        showToast("Collected supplies.", 1.8);
    }
    registerPickupCollected();
    audio.playPickup();
}

function updatePickups(dt) {
    for (var i = 0; i < pickups.length; i += 1) {
        var pickup = pickups[i];
        if (!pickup.active) {
            pickup.respawnTimer -= dt;
            if (pickup.respawnTimer <= 0) {
                pickup.active = true;
                pickup.root.setEnabled(true);
            }
            continue;
        }

        pickup.bob += dt * 2.6;
        pickup.root.position.y = pickup.basePos.y + Math.sin(pickup.bob) * 0.18;
        pickup.root.rotation.y += dt * 1.5;
        if (!player.body || state.dead) {
            continue;
        }

        var radiusBonus = player.stats ? player.stats.pickupRadius || 0 : 0;
        var dx = player.body.position.x - pickup.root.position.x;
        var dz = player.body.position.z - pickup.root.position.z;
        var dy = Math.abs(player.body.position.y - pickup.root.position.y);
        if (dx * dx + dz * dz < Math.pow(pickup.pickupRadius + radiusBonus, 2) && dy < 2.2) {
            collectPickup(pickup);
        }
    }
}
