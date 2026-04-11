"use strict";

function makeMaterial(name, hex, alpha) {
    var material = new BABYLON.StandardMaterial(name, scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(hex);
    material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
    material.emissiveColor = material.diffuseColor.scale(0.05);
    if (alpha !== undefined) {
        material.alpha = alpha;
    }
    return material;
}

function lerpColor(a, b, t) {
    return new BABYLON.Color3(
        lerp(a.r, b.r, t),
        lerp(a.g, b.g, t),
        lerp(a.b, b.b, t)
    );
}

function ensureMaterialCatalog() {
    Object.keys(BLOCK_TYPES).forEach(function (type) {
        materials[type] = makeMaterial("mat-" + type, BLOCK_TYPES[type].color, BLOCK_TYPES[type].alpha);
    });

    Object.keys(GAME_DATA.biomes).forEach(function (biomeId) {
        var biome = GAME_DATA.biomes[biomeId];
        materials["terrain-" + biomeId] = makeMaterial("terrain-" + biomeId, biome.color);
        materials["terrain-" + biomeId].specularColor = BABYLON.Color3.Black();
        materials["terrain-" + biomeId].useVertexColor = true;
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
    materials.treeTrunk = makeMaterial("tree-trunk", "#7a5532");
    materials.foliageForest = makeMaterial("foliage-forest", "#4f9350");
    materials.foliageMeadow = makeMaterial("foliage-meadow", "#6ec16a");
    materials.foliageSnow = makeMaterial("foliage-snow", "#d8f0ff");
    materials.rock = makeMaterial("rock-mat", "#7c858d");
}

function createSkyAndLights() {
    var hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.18, 1, 0.1), scene);
    hemi.intensity = 1.08;
    hemi.groundColor = new BABYLON.Color3(0.24, 0.27, 0.3);

    var sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.7, -1, -0.55), scene);
    sun.position = new BABYLON.Vector3(30, 38, 24);
    sun.intensity = 0.84;

    var sky = BABYLON.MeshBuilder.CreateBox("sky", { size: 1200, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
    sky.isPickable = false;
    sky.checkCollisions = false;

    var skyMat = new BABYLON.StandardMaterial("sky-mat", scene);
    skyMat.disableLighting = true;
    skyMat.emissiveColor = new BABYLON.Color3(0.62, 0.82, 1.0);
    sky.material = skyMat;

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.013;
    scene.fogColor = new BABYLON.Color3(0.83, 0.92, 1);
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

function updateColumnHeight() {
    return;
}

function getTerrainSurfaceHeight(x, z) {
    return terrainHeight(x, z);
}

function getColumnTop(x, z) {
    return Math.floor(getTerrainSurfaceHeight(x, z));
}

function getBlockAt() {
    return null;
}

function hasBlockAt() {
    return false;
}

function getTerrainImpactColor(mesh) {
    if (mesh && mesh.metadata && mesh.metadata.biomeId && GAME_DATA.biomes[mesh.metadata.biomeId]) {
        return GAME_DATA.biomes[mesh.metadata.biomeId].color;
    }
    return "#9ecb7f";
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

function createChunkRoot(chunk) {
    var origin = chunkToWorldOrigin(chunk.x, chunk.z);
    var root = new BABYLON.TransformNode("chunk-root-" + chunk.key, scene);
    root.position.set(origin.x, 0, origin.z);
    chunk.root = root;
}

function createTerrainMesh(chunk) {
    var subdivisions = CONFIG.chunkResolution;
    var step = CONFIG.chunkSize / subdivisions;
    var positions = [];
    var normals = [];
    var indices = [];
    var uvs = [];
    var colors = [];

    function getTerrainColor(worldY) {
        var biome = GAME_DATA.biomes[chunk.biomeId] || GAME_DATA.biomes.meadow;
        var lowColor;
        var midColor;
        var highColor;

        if (chunk.biomeId === "desert") {
            lowColor = BABYLON.Color3.FromHexString("#d9bf79");
            midColor = BABYLON.Color3.FromHexString("#ead593");
            highColor = BABYLON.Color3.FromHexString("#fff0cf");
        } else if (chunk.biomeId === "snow") {
            lowColor = BABYLON.Color3.FromHexString("#8fb5c9");
            midColor = BABYLON.Color3.FromHexString("#d1e6f2");
            highColor = BABYLON.Color3.FromHexString("#f7fcff");
        } else if (chunk.biomeId === "forest") {
            lowColor = BABYLON.Color3.FromHexString("#406d46");
            midColor = BABYLON.Color3.FromHexString("#77b56d");
            highColor = BABYLON.Color3.FromHexString("#d6efc2");
        } else {
            lowColor = BABYLON.Color3.FromHexString("#5d8f59");
            midColor = BABYLON.Color3.FromHexString(biome.color || "#8fd96c");
            highColor = BABYLON.Color3.FromHexString("#eef6c8");
        }

        if (worldY < 1.3) {
            return lerpColor(lowColor, midColor, clamp((worldY - 0.1) / 1.2, 0, 1));
        }
        if (worldY < 4.8) {
            return lerpColor(midColor, highColor, clamp((worldY - 1.3) / 3.5, 0, 1));
        }
        return lerpColor(highColor, BABYLON.Color3.White(), clamp((worldY - 4.8) / 6.0, 0, 1));
    }

    for (var z = 0; z <= subdivisions; z += 1) {
        for (var x = 0; x <= subdivisions; x += 1) {
            var localX = x * step;
            var localZ = z * step;
            var worldX = chunk.root.position.x + localX;
            var worldZ = chunk.root.position.z + localZ;
            var worldY = getTerrainSurfaceHeight(worldX, worldZ);
            positions.push(localX, worldY, localZ);
            uvs.push(x / subdivisions, z / subdivisions);
            var terrainColor = getTerrainColor(worldY);
            colors.push(terrainColor.r, terrainColor.g, terrainColor.b, 1);
        }
    }

    for (var row = 0; row < subdivisions; row += 1) {
        for (var col = 0; col < subdivisions; col += 1) {
            var stride = subdivisions + 1;
            var i0 = row * stride + col;
            var i1 = i0 + 1;
            var i2 = i0 + stride;
            var i3 = i2 + 1;
            indices.push(i0, i2, i1);
            indices.push(i1, i2, i3);
        }
    }

    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    var mesh = new BABYLON.Mesh("terrain-" + chunk.key, scene);
    var vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.colors = colors;
    vertexData.applyToMesh(mesh, true);
    mesh.parent = chunk.root;
    mesh.material = materials["terrain-" + chunk.biomeId] || materials["terrain-meadow"];
    mesh.isPickable = true;
    mesh.checkCollisions = true;
    mesh.receiveShadows = false;
    mesh.alwaysSelectAsActiveMesh = false;
    mesh.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
    mesh.metadata = {
        kind: "terrain",
        chunkKey: chunk.key,
        biomeId: chunk.biomeId
    };

    chunk.terrainMesh = mesh;
    world.terrainMeshCount += 1;
}

function createWaterMesh(chunk) {
    var size = CONFIG.chunkSize;
    var water = BABYLON.MeshBuilder.CreateGround("water-" + chunk.key, {
        width: size,
        height: size,
        subdivisions: 1
    }, scene);
    water.position.set(chunk.root.position.x + size * 0.5, GAME_DATA.world.waterLevel, chunk.root.position.z + size * 0.5);
    water.parent = chunk.root;
    water.material = materials["water-" + chunk.biomeId] || materials["water-meadow"];
    water.isPickable = false;
    water.checkCollisions = false;
    water.alphaIndex = 1;
    water.metadata = { kind: "water", chunkKey: chunk.key, biomeId: chunk.biomeId };
    chunk.waterMesh = water;
}

function registerPropMesh(mesh, chunk) {
    mesh.parent = chunk.root;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.alwaysSelectAsActiveMesh = false;
    mesh.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
    mesh.freezeWorldMatrix();
    chunk.props.push(mesh);
    world.propCount += 1;
}

function createTree(localX, localZ, chunk, biome) {
    var worldX = chunk.root.position.x + localX;
    var worldZ = chunk.root.position.z + localZ;
    var groundY = getTerrainSurfaceHeight(worldX, worldZ);
    if (groundY < 1.2 || groundY > 9) {
        return;
    }

    var trunkHeight = biome.id === "snow" ? 4.2 : 3.1 + hash2(worldX + 10, worldZ - 12) * 1.6;
    var trunk = BABYLON.MeshBuilder.CreateCylinder("tree-trunk", {
        height: trunkHeight,
        diameterTop: 0.34,
        diameterBottom: 0.5,
        tessellation: 6
    }, scene);
    trunk.position.set(localX, groundY + trunkHeight * 0.5, localZ);
    trunk.material = materials.treeTrunk;
    registerPropMesh(trunk, chunk);

    var leaves = BABYLON.MeshBuilder.CreateSphere("tree-leaves", {
        diameterX: biome.id === "forest" ? 2.8 : 2.3,
        diameterY: biome.id === "forest" ? 3.2 : 2.6,
        diameterZ: biome.id === "forest" ? 2.8 : 2.3,
        segments: 4
    }, scene);
    leaves.position.set(localX, groundY + trunkHeight + 0.9, localZ);
    leaves.material = biome.id === "snow" ? materials.foliageSnow : (biome.id === "forest" ? materials.foliageForest : materials.foliageMeadow);
    registerPropMesh(leaves, chunk);
}

function createRock(localX, localZ, chunk) {
    var worldX = chunk.root.position.x + localX;
    var worldZ = chunk.root.position.z + localZ;
    var groundY = getTerrainSurfaceHeight(worldX, worldZ);
    var rock = BABYLON.MeshBuilder.CreateSphere("rock", {
        diameterX: 1.4 + hash2(worldX, worldZ) * 0.9,
        diameterY: 0.8 + hash2(worldX + 30, worldZ - 18) * 0.4,
        diameterZ: 1.1 + hash2(worldX - 8, worldZ + 21) * 0.8,
        segments: 4
    }, scene);
    rock.position.set(localX, groundY + 0.4, localZ);
    rock.rotation.y = hash2(worldX + 4, worldZ - 4) * Math.PI;
    rock.material = materials.rock;
    registerPropMesh(rock, chunk);
}

function createSpawnMarker(chunk) {
    var baseY = getTerrainSurfaceHeight(0, 0);

    var stem = BABYLON.MeshBuilder.CreateCylinder("spawn-stem", {
        height: 3.4,
        diameterTop: 0.24,
        diameterBottom: 0.36,
        tessellation: 6
    }, scene);
    stem.position.set(0, baseY + 1.7, 0);
    stem.material = materials.weaponDark;
    registerPropMesh(stem, chunk);

    var gem = BABYLON.MeshBuilder.CreatePolyhedron("spawn-gem", {
        type: 1,
        size: 0.72
    }, scene);
    gem.position.set(0, baseY + 3.9, 0);
    gem.material = materials.uiGlow;
    registerPropMesh(gem, chunk);
}

function buildBiomeMaterialSet(biomeId, biome) {
    var terrain = materials["terrain-" + biomeId];
    if (terrain) {
        terrain.specularColor = new BABYLON.Color3(0.04, 0.04, 0.04);
    }

    if (!materials["water-" + biomeId]) {
        var water = new BABYLON.StandardMaterial("water-" + biomeId, scene);
        water.diffuseColor = BABYLON.Color3.FromHexString(biome.waterColor || "#7ac8ff");
        water.emissiveColor = water.diffuseColor.scale(0.18);
        water.alpha = 0.42;
        water.specularColor = new BABYLON.Color3(0.55, 0.68, 0.78);
        water.disableLighting = false;
        materials["water-" + biomeId] = water;
    }
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
        root: null,
        terrainMesh: null,
        props: [],
        pickups: [],
        enemies: []
    };

    world.chunks.set(key, chunk);
    createChunkRoot(chunk);
    buildBiomeMaterialSet(chunk.biomeId, biome);
    createTerrainMesh(chunk);
    createWaterMesh(chunk);
    populateChunk(chunk, biome);
    return chunk;
}

function populateChunk(chunk, biome) {
    var isSpawnChunk = chunk.x === 0 && chunk.z === 0;
    if (isSpawnChunk) {
        createSpawnMarker(chunk);
    }

    for (var lx = 2; lx < CONFIG.chunkSize - 2; lx += 1) {
        for (var lz = 2; lz < CONFIG.chunkSize - 2; lz += 1) {
            var worldX = chunk.root.position.x + lx;
            var worldZ = chunk.root.position.z + lz;
            var roll = hash2(worldX * 1.17, worldZ * 1.13);

            if (Math.abs(worldX) <= 5 && Math.abs(worldZ) <= 5) {
                continue;
            }
            if (roll > 1 - biome.treeChance) {
                createTree(lx, lz, chunk, biome);
            } else if (roll > 1 - biome.treeChance - biome.rockChance) {
                createRock(lx, lz, chunk);
            }
        }
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

    var distance = Math.abs(chunk.x) + Math.abs(chunk.z);
    var enemyCount = distance === 0 ? 1 : Math.min(2, Math.max(1, Math.round(biome.enemyScale)));
    var pickupCount = distance === 0 ? 2 : 1;

    for (var i = 0; i < enemyCount; i += 1) {
        var ex = chunk.root.position.x + 4 + Math.random() * (CONFIG.chunkSize - 8);
        var ez = chunk.root.position.z + 4 + Math.random() * (CONFIG.chunkSize - 8);
        if (Math.abs(ex) <= 6 && Math.abs(ez) <= 6) {
            continue;
        }
        var enemyPos = vec3(ex, getTerrainSurfaceHeight(ex, ez) + 0.55, ez);
        createEnemy(enemyPos, world.enemySerial++, {
            chunkKey: chunk.key,
            biomeId: chunk.biomeId,
            tier: Math.max(1, progression.level + distance)
        });
    }

    for (var p = 0; p < pickupCount; p += 1) {
        var px = chunk.root.position.x + 3 + Math.random() * (CONFIG.chunkSize - 6);
        var pz = chunk.root.position.z + 3 + Math.random() * (CONFIG.chunkSize - 6);
        if (Math.abs(px) <= 4 && Math.abs(pz) <= 4) {
            continue;
        }
        createPickup(chooseChunkPickupType(biome), vec3(px, getTerrainSurfaceHeight(px, pz) + 1.15, pz), {
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

    if (chunk.root) {
        chunk.root.dispose(false, true);
    }

    world.terrainMeshCount = Math.max(0, world.terrainMeshCount - (chunk.terrainMesh ? 1 : 0));
    world.propCount = Math.max(0, world.propCount - chunk.props.length);
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

    var spawnX = 0;
    var spawnZ = 0;
    var safeHeight = getTerrainSurfaceHeight(spawnX, spawnZ);
    for (var dx = -3; dx <= 3; dx += 1) {
        for (var dz = -3; dz <= 3; dz += 1) {
            safeHeight = Math.max(safeHeight, getTerrainSurfaceHeight(spawnX + dx, spawnZ + dz));
        }
    }

    player.spawnPoint = new BABYLON.Vector3(spawnX, safeHeight + CONFIG.playerHalfHeight + 200, spawnZ);
}

function prepareSpawnZone() {
    createChunk(0, 0);
    createChunk(1, 0);
    createChunk(-1, 0);
    createChunk(0, 1);
    createChunk(0, -1);
    world.currentChunkX = 0;
    world.currentChunkZ = 0;
    world.currentBiomeId = getBiomeAt(0, 0).id;
}

function updateWorldStreaming() {
    if (!player.body) {
        return;
    }
    var chunkX = worldToChunkCoord(player.body.position.x);
    var chunkZ = worldToChunkCoord(player.body.position.z);
    world.currentChunkX = chunkX;
    world.currentChunkZ = chunkZ;
    var biome = getBiomeAt(player.body.position.x, player.body.position.z);
    world.currentBiomeId = biome.id;
    scene.fogColor = BABYLON.Color3.FromHexString(biome.fogColor || "#d7efff");
    if (scene.clearColor) {
        scene.clearColor = BABYLON.Color4.FromColor3(BABYLON.Color3.FromHexString(biome.skyColor || "#9bd4ff"), 1);
    }

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
        makePart("food-leaf", { width: 0.12, height: 0.18, depth: 0.12 }, vec3(0.1, 0.28, 0), materials.foliageMeadow);
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
