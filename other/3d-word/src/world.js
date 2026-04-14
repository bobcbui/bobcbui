import { GAME_DATA } from "./data.js";
import { CONFIG, state, world, player } from "./runtime.js";
import {
    scene, materials, particleMaterials, particles, pickups, enemies,
    BLOCK_TYPES, biomeTerrainColors,
    vec3, clamp, lerp, chunkKey, hash2,
    getBiomeBlend, terrainHeight, audio
} from "./shared.js";
import {
    progression, setStatusHint, registerChunkVisit,
    registerPickupCollected, addPotionToBag, addEquipmentToBag,
    createRandomEquipment
} from "./progression.js";
// grantWeaponPickup is imported lazily to break circular dependency
let _grantWeaponPickup = null;
export function setGrantWeaponPickup(fn) { _grantWeaponPickup = fn; }

// 鈹€鈹€ Material Catalog 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function makeMaterial(name, hex, alpha) {
    const material = new BABYLON.StandardMaterial(name, scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(hex);
    material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
    material.emissiveColor = material.diffuseColor.scale(0.05);
    if (alpha !== undefined) material.alpha = alpha;
    return material;
}

export function ensureMaterialCatalog() {
    for (const type of Object.keys(BLOCK_TYPES)) {
        materials[type] = makeMaterial("mat-" + type, BLOCK_TYPES[type].color, BLOCK_TYPES[type].alpha);
    }

    for (const biomeId of Object.keys(GAME_DATA.biomes)) {
        const biome = GAME_DATA.biomes[biomeId];
        materials["terrain-" + biomeId] = makeMaterial("terrain-" + biomeId, biome.color);
        materials["terrain-" + biomeId].specularColor = BABYLON.Color3.Black();
        materials["terrain-" + biomeId].useVertexColor = true;
        biomeTerrainColors[biomeId] = BABYLON.Color3.FromHexString(biome.color);
    }

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
    materials.pickupGreen = makeMaterial("pickup-green", "#63d48f");
    materials.pickupPurple = makeMaterial("pickup-purple", "#b08cff");
    materials.pickupGold = makeMaterial("pickup-gold", "#f3cf6f");
    materials.pickupWood = makeMaterial("pickup-wood", "#8f6338");
    materials.pickupMetal = makeMaterial("pickup-metal", "#9aa8b6");
    materials.pickupSnow = makeMaterial("pickup-snow", "#d8f5ff");
    materials.treeTrunk = makeMaterial("tree-trunk", "#7a5532");
    materials.foliageForest = makeMaterial("foliage-forest", "#4f9350");
    materials.foliageMeadow = makeMaterial("foliage-meadow", "#6ec16a");
    materials.foliageSnow = makeMaterial("foliage-snow", "#d8f0ff");
    materials.rock = makeMaterial("rock-mat", "#7c858d");
}

// 鈹€鈹€ Sky & Lights 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
export function createSkyAndLights() {
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.18, 1, 0.1), scene);
    hemi.intensity = 1.08;
    hemi.groundColor = new BABYLON.Color3(0.24, 0.27, 0.3);

    const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.7, -1, -0.55), scene);
    sun.position = new BABYLON.Vector3(30, 38, 24);
    sun.intensity = 0.84;

    const sky = BABYLON.MeshBuilder.CreateBox("sky", { size: 1200, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
    sky.isPickable = false;
    sky.checkCollisions = false;
    const skyMat = new BABYLON.StandardMaterial("sky-mat", scene);
    skyMat.disableLighting = true;
    skyMat.emissiveColor = new BABYLON.Color3(0.62, 0.82, 1.0);
    sky.material = skyMat;

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.013;
    scene.fogColor = new BABYLON.Color3(0.83, 0.92, 1);
}

// 鈹€鈹€ Biome helpers 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
export function getBiomeAt(x, z) {
    const blend = getBiomeBlend(x, z);
    if (blend.desert >= blend.snow && blend.desert >= blend.forest && blend.desert >= blend.meadow) return GAME_DATA.biomes.desert;
    if (blend.snow >= blend.forest && blend.snow >= blend.meadow) return GAME_DATA.biomes.snow;
    if (blend.forest >= blend.meadow) return GAME_DATA.biomes.forest;
    return GAME_DATA.biomes.meadow;
}

export function getTerrainSurfaceHeight(x, z) {
    return terrainHeight(x, z);
}

export function getTerrainImpactColor(mesh) {
    if (mesh && mesh.metadata && mesh.metadata.biomeId && GAME_DATA.biomes[mesh.metadata.biomeId]) {
        return GAME_DATA.biomes[mesh.metadata.biomeId].color;
    }
    return "#9ecb7f";
}

function worldToChunkCoord(value) {
    return Math.floor(value / CONFIG.chunkSize);
}

function chunkToWorldOrigin(chunkX, chunkZ) {
    return { x: chunkX * CONFIG.chunkSize, z: chunkZ * CONFIG.chunkSize };
}

// 鈹€鈹€ Chunk creation 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function createChunkRoot(chunk) {
    const origin = chunkToWorldOrigin(chunk.x, chunk.z);
    const root = new BABYLON.TransformNode("chunk-root-" + chunk.key, scene);
    root.position.set(origin.x, 0, origin.z);
    chunk.root = root;
}

function createTerrainNormal(worldX, worldZ, step) {
    const sample = Math.max(step, 0.5);
    const left = getTerrainSurfaceHeight(worldX - sample, worldZ);
    const right = getTerrainSurfaceHeight(worldX + sample, worldZ);
    const back = getTerrainSurfaceHeight(worldX, worldZ - sample);
    const front = getTerrainSurfaceHeight(worldX, worldZ + sample);
    const normal = new BABYLON.Vector3(left - right, sample * 2, back - front);
    normal.normalize();
    return normal;
}

function getBlendedBiomeColor(blend) {
    const meadow = biomeTerrainColors.meadow || BABYLON.Color3.FromHexString(GAME_DATA.biomes.meadow.color);
    const forest = biomeTerrainColors.forest || BABYLON.Color3.FromHexString(GAME_DATA.biomes.forest.color);
    const desert = biomeTerrainColors.desert || BABYLON.Color3.FromHexString(GAME_DATA.biomes.desert.color);
    const snow = biomeTerrainColors.snow || BABYLON.Color3.FromHexString(GAME_DATA.biomes.snow.color);
    return new BABYLON.Color3(
        meadow.r * blend.meadow + forest.r * blend.forest + desert.r * blend.desert + snow.r * blend.snow,
        meadow.g * blend.meadow + forest.g * blend.forest + desert.g * blend.desert + snow.g * blend.snow,
        meadow.b * blend.meadow + forest.b * blend.forest + desert.b * blend.desert + snow.b * blend.snow
    );
}

function createTerrainVertexColor(blend, worldY, worldNormal) {
    const base = getBlendedBiomeColor(blend);
    const slope = clamp(worldNormal.y, 0, 1);
    const altitude = clamp((worldY - GAME_DATA.world.waterLevel + 1.5) / 10, 0, 1);
    let shade = lerp(0.72, 1.08, slope) * lerp(0.94, 1.07, altitude);
    if (worldY < GAME_DATA.world.waterLevel + 0.4) shade *= 0.84;
    return new BABYLON.Color3(
        clamp(base.r * shade, 0, 1),
        clamp(base.g * shade, 0, 1),
        clamp(base.b * shade, 0, 1)
    );
}

function createTerrainMesh(chunk) {
    const subdivisions = CONFIG.chunkResolution;
    const step = CONFIG.chunkSize / subdivisions;
    const positions = [];
    const normals = [];
    const indices = [];
    const uvs = [];
    const colors = [];

    for (let z = 0; z <= subdivisions; z++) {
        for (let x = 0; x <= subdivisions; x++) {
            const localX = x * step;
            const localZ = z * step;
            const worldX = chunk.root.position.x + localX;
            const worldZ = chunk.root.position.z + localZ;
            const worldY = getTerrainSurfaceHeight(worldX, worldZ);
            const worldNormal = createTerrainNormal(worldX, worldZ, step);
            const blend = getBiomeBlend(worldX, worldZ);
            positions.push(localX, worldY, localZ);
            normals.push(worldNormal.x, worldNormal.y, worldNormal.z);
            uvs.push(x / subdivisions, z / subdivisions);
            const tc = createTerrainVertexColor(blend, worldY, worldNormal);
            colors.push(tc.r, tc.g, tc.b, 1);
        }
    }

    for (let row = 0; row < subdivisions; row++) {
        for (let col = 0; col < subdivisions; col++) {
            const stride = subdivisions + 1;
            const i0 = row * stride + col;
            const i1 = i0 + 1;
            const i2 = i0 + stride;
            const i3 = i2 + 1;
            indices.push(i0, i1, i2);
            indices.push(i1, i3, i2);
        }
    }

    const mesh = new BABYLON.Mesh("terrain-" + chunk.key, scene);
    const vertexData = new BABYLON.VertexData();
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
    mesh.metadata = { kind: "terrain", chunkKey: chunk.key, biomeId: chunk.biomeId };
    chunk.terrainMesh = mesh;
    world.terrainMeshCount += 1;
}

function createWaterMesh(chunk) {
    const size = CONFIG.chunkSize;
    const water = BABYLON.MeshBuilder.CreateGround("water-" + chunk.key, { width: size, height: size, subdivisions: 1 }, scene);
    water.parent = chunk.root;
    water.position.set(size * 0.5, GAME_DATA.world.waterLevel, size * 0.5);
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
    const worldX = chunk.root.position.x + localX;
    const worldZ = chunk.root.position.z + localZ;
    const groundY = getTerrainSurfaceHeight(worldX, worldZ);
    if (groundY < 1.2 || groundY > 9) return;

    const heightRoll = hash2(worldX + 10, worldZ - 12);
    const crownRoll = hash2(worldX - 16, worldZ + 9);
    const leafTintRoll = hash2(worldX + 22, worldZ + 14);
    const trunkHeight = 3.1 + heightRoll * 1.9;
    const trunk = BABYLON.MeshBuilder.CreateCylinder("tree-trunk", { height: trunkHeight, diameterTop: 0.34, diameterBottom: 0.5, tessellation: 6 }, scene);
    trunk.position.set(localX, groundY + trunkHeight * 0.5, localZ);
    trunk.material = materials.treeTrunk;
    registerPropMesh(trunk, chunk);

    const crownBase = 2.45;
    const crownWidth = crownBase + crownRoll * 0.9;
    const crownHeight = crownWidth + 0.2 + leafTintRoll * 0.45;
    let leafMaterial = materials.foliageMeadow;
    if (biome && biome.id === "forest") leafMaterial = materials.foliageForest;
    else if (biome && biome.id === "snow") leafMaterial = materials.foliageSnow;

    const leaves = BABYLON.MeshBuilder.CreateSphere("tree-leaves", { diameterX: crownWidth, diameterY: crownHeight, diameterZ: crownWidth, segments: 4 }, scene);
    leaves.position.set(localX, groundY + trunkHeight + 0.9, localZ);
    leaves.rotation.y = hash2(worldX - 3, worldZ + 11) * Math.PI;
    leaves.material = leafMaterial;
    registerPropMesh(leaves, chunk);
}

function createRock(localX, localZ, chunk) {
    const worldX = chunk.root.position.x + localX;
    const worldZ = chunk.root.position.z + localZ;
    const groundY = getTerrainSurfaceHeight(worldX, worldZ);
    const rock = BABYLON.MeshBuilder.CreateSphere("rock", {
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
    const baseY = getTerrainSurfaceHeight(0, 0);

    const stem = BABYLON.MeshBuilder.CreateCylinder("spawn-stem", { height: 3.4, diameterTop: 0.24, diameterBottom: 0.36, tessellation: 6 }, scene);
    stem.position.set(0, baseY + 1.7, 0);
    stem.material = materials.weaponDark;
    registerPropMesh(stem, chunk);

    const gem = BABYLON.MeshBuilder.CreatePolyhedron("spawn-gem", { type: 1, size: 0.72 }, scene);
    gem.position.set(0, baseY + 3.9, 0);
    gem.material = materials.uiGlow;
    registerPropMesh(gem, chunk);
}

function buildBiomeMaterialSet(biomeId, biome) {
    const terrain = materials["terrain-" + biomeId];
    if (terrain) terrain.specularColor = new BABYLON.Color3(0.04, 0.04, 0.04);

    if (!materials["water-" + biomeId]) {
        const water = new BABYLON.StandardMaterial("water-" + biomeId, scene);
        water.diffuseColor = BABYLON.Color3.FromHexString(biome.waterColor || "#7ac8ff");
        water.emissiveColor = water.diffuseColor.scale(0.18);
        water.alpha = 0.42;
        water.specularColor = new BABYLON.Color3(0.55, 0.68, 0.78);
        water.disableLighting = false;
        materials["water-" + biomeId] = water;
    }
}

// 鈹€鈹€ Enemy creation (imported lazily) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
let _createEnemy = null;
let _disposeEnemy = null;
export function setEnemyFunctions(createFn, disposeFn) {
    _createEnemy = createFn;
    _disposeEnemy = disposeFn;
}

function createChunk(chunkX, chunkZ) {
    const key = chunkKey(chunkX, chunkZ);
    if (world.chunks.has(key)) return world.chunks.get(key);

    const centerX = chunkX * CONFIG.chunkSize + CONFIG.chunkSize * 0.5;
    const centerZ = chunkZ * CONFIG.chunkSize + CONFIG.chunkSize * 0.5;
    const biome = getBiomeAt(centerX, centerZ);
    const chunk = {
        x: chunkX, z: chunkZ, key,
        biomeId: biome.id, root: null, terrainMesh: null,
        props: [], pickups: [], enemies: []
    };

    world.chunks.set(key, chunk);
    createChunkRoot(chunk);
    buildBiomeMaterialSet(chunk.biomeId, biome);
    createTerrainMesh(chunk);
    createWaterMesh(chunk);
    populateChunk(chunk, biome);
    return chunk;
}

function populateChunk(chunk, currentBiome) {
    const isSpawnChunk = chunk.x === 0 && chunk.z === 0;
    if (isSpawnChunk) createSpawnMarker(chunk);

    for (let lx = 2; lx < CONFIG.chunkSize - 2; lx++) {
        for (let lz = 2; lz < CONFIG.chunkSize - 2; lz++) {
            const worldX = chunk.root.position.x + lx;
            const worldZ = chunk.root.position.z + lz;
            if (Math.abs(worldX) <= 5 && Math.abs(worldZ) <= 5) continue;

            const blend = getBiomeBlend(worldX, worldZ);
            const roll = hash2(worldX * 1.17, worldZ * 1.13);
            const treeChance = (GAME_DATA.biomes.meadow.treeChance * blend.meadow) +
                (GAME_DATA.biomes.forest.treeChance * blend.forest) +
                (GAME_DATA.biomes.desert.treeChance * blend.desert) +
                (GAME_DATA.biomes.snow.treeChance * blend.snow);
            const rockChance = (GAME_DATA.biomes.meadow.rockChance * blend.meadow) +
                (GAME_DATA.biomes.forest.rockChance * blend.forest) +
                (GAME_DATA.biomes.desert.rockChance * blend.desert) +
                (GAME_DATA.biomes.snow.rockChance * blend.snow);

            if (roll > 1 - treeChance) {
                const meadowTreeWeight = blend.meadow * GAME_DATA.biomes.meadow.treeChance;
                const forestTreeWeight = blend.forest * GAME_DATA.biomes.forest.treeChance;
                const snowTreeWeight = blend.snow * GAME_DATA.biomes.snow.treeChance;
                const totalTreeWeight = meadowTreeWeight + forestTreeWeight + snowTreeWeight;
                if (totalTreeWeight <= 0) continue;

                const treeRoll = hash2(worldX * 0.91, worldZ * 0.83);
                let selectedBiome = GAME_DATA.biomes.meadow;
                const snowThreshold = snowTreeWeight / totalTreeWeight;
                const forestThreshold = snowThreshold + forestTreeWeight / totalTreeWeight;
                if (treeRoll < snowThreshold) selectedBiome = GAME_DATA.biomes.snow;
                else if (treeRoll < forestThreshold) selectedBiome = GAME_DATA.biomes.forest;
                createTree(lx, lz, chunk, selectedBiome);
            } else if (roll > 1 - treeChance - rockChance) {
                createRock(lx, lz, chunk);
            }
        }
    }
    populateChunkEntities(chunk, currentBiome);
}

function chooseChunkPickupType(biome, distance) {
    const pool = (biome.pickupBias || ["food", "bow"]).slice();
    if (distance >= 1) pool.push("healPotion");
    if (distance >= 2) pool.push("buffPotion");
    if (distance >= 3 && Math.random() < 0.14) return "gear";
    if (distance >= 4 && Math.random() < 0.08) return "skillBook";
    return pool[Math.floor(Math.random() * pool.length)];
}

function populateChunkEntities(chunk, biome) {
    const distance = Math.abs(chunk.x) + Math.abs(chunk.z);
    const enemyCount = distance === 0 ? 1 : Math.min(2, Math.max(1, Math.round(biome.enemyScale)));
    const pickupCount = distance === 0 ? 2 : 1;
    const bossChance = distance >= 2 ? Math.min(0.16 + distance * 0.025, 0.42) : 0;
    const shouldSpawnBoss = Math.random() < bossChance;

    if (_createEnemy) {
        for (let i = 0; i < enemyCount; i++) {
            const ex = chunk.root.position.x + 4 + Math.random() * (CONFIG.chunkSize - 8);
            const ez = chunk.root.position.z + 4 + Math.random() * (CONFIG.chunkSize - 8);
            if (Math.abs(ex) <= 6 && Math.abs(ez) <= 6) continue;
            const enemyPos = vec3(ex, getTerrainSurfaceHeight(ex, ez) + 0.55, ez);
            _createEnemy(enemyPos, world.enemySerial++, {
                chunkKey: chunk.key, biomeId: chunk.biomeId,
                tier: Math.max(1, progression.level + distance)
            });
        }

        if (shouldSpawnBoss) {
            const bx = chunk.root.position.x + 4 + Math.random() * (CONFIG.chunkSize - 8);
            const bz = chunk.root.position.z + 4 + Math.random() * (CONFIG.chunkSize - 8);
            const bossPos = vec3(bx, getTerrainSurfaceHeight(bx, bz) + 0.55, bz);
            _createEnemy(bossPos, world.enemySerial++, {
                chunkKey: chunk.key, biomeId: chunk.biomeId,
                tier: Math.max(2, progression.level + distance + 2),
                isBoss: true
            });
        }
    }

    for (let p = 0; p < pickupCount; p++) {
        const px = chunk.root.position.x + 3 + Math.random() * (CONFIG.chunkSize - 6);
        const pz = chunk.root.position.z + 3 + Math.random() * (CONFIG.chunkSize - 6);
        if (Math.abs(px) <= 4 && Math.abs(pz) <= 4) continue;
        const pickupType = chooseChunkPickupType(biome, distance);
        let pickupPayload = null;
        if (pickupType === "gear") pickupPayload = createRandomEquipment(Math.max(1, progression.level + distance), false);
        createPickup(pickupType, vec3(px, getTerrainSurfaceHeight(px, pz) + 1.15, pz), {
            chunkKey: chunk.key, biomeId: chunk.biomeId, payload: pickupPayload
        });
    }
}

// 鈹€鈹€ Pickup disposal / chunk disposal 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
export function disposePickup(pickup) {
    if (!pickup) return;
    if (pickup.chunkKey && world.chunks.has(pickup.chunkKey)) {
        const chunk = world.chunks.get(pickup.chunkKey);
        const idx = chunk.pickups.indexOf(pickup);
        if (idx >= 0) chunk.pickups.splice(idx, 1);
    }
    if (pickup.root) pickup.root.dispose(false, true);
    const index = pickups.indexOf(pickup);
    if (index >= 0) pickups.splice(index, 1);
}

function disposeChunk(chunk) {
    if (!chunk) return;
    chunk.pickups.slice().forEach(disposePickup);
    if (_disposeEnemy) chunk.enemies.slice().forEach(e => _disposeEnemy(e));
    if (chunk.root) chunk.root.dispose(false, true);
    world.terrainMeshCount = Math.max(0, world.terrainMeshCount - (chunk.terrainMesh ? 1 : 0));
    world.propCount = Math.max(0, world.propCount - chunk.props.length);
    world.chunks.delete(chunk.key);
}

function ensureChunksAround(chunkX, chunkZ) {
    for (let x = chunkX - CONFIG.activeChunkRadius; x <= chunkX + CONFIG.activeChunkRadius; x++) {
        for (let z = chunkZ - CONFIG.activeChunkRadius; z <= chunkZ + CONFIG.activeChunkRadius; z++) {
            createChunk(x, z);
        }
    }
}

function unloadFarChunks(chunkX, chunkZ) {
    const toRemove = [];
    world.chunks.forEach(chunk => {
        if (Math.abs(chunk.x - chunkX) > CONFIG.unloadChunkRadius || Math.abs(chunk.z - chunkZ) > CONFIG.unloadChunkRadius) {
            toRemove.push(chunk);
        }
    });
    toRemove.forEach(disposeChunk);
}

export function generateWorld() {
    ensureChunksAround(0, 0);
    world.currentChunkX = 0;
    world.currentChunkZ = 0;
    world.currentBiomeId = getBiomeAt(0, 0).id;
    registerChunkVisit(0, 0, world.currentBiomeId);

    let safeHeight = getTerrainSurfaceHeight(0, 0);
    for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
            safeHeight = Math.max(safeHeight, getTerrainSurfaceHeight(dx, dz));
        }
    }
    player.spawnPoint = new BABYLON.Vector3(0, safeHeight, 0);
}

export function updateWorldStreaming() {
    if (!player.body) return;
    const chunkX = worldToChunkCoord(player.body.position.x);
    const chunkZ = worldToChunkCoord(player.body.position.z);
    world.currentChunkX = chunkX;
    world.currentChunkZ = chunkZ;
    const biome = getBiomeAt(player.body.position.x, player.body.position.z);
    world.currentBiomeId = biome.id;
    scene.fogColor = BABYLON.Color3.FromHexString(biome.fogColor || "#d7efff");
    if (scene.clearColor) {
        scene.clearColor = BABYLON.Color4.FromColor3(BABYLON.Color3.FromHexString(biome.skyColor || "#9bd4ff"), 1);
    }
    ensureChunksAround(chunkX, chunkZ);
    unloadFarChunks(chunkX, chunkZ);
    registerChunkVisit(chunkX, chunkZ, world.currentBiomeId);
}

// 鈹€鈹€ Particles 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function createParticleMaterial(hex) {
    if (particleMaterials[hex]) return particleMaterials[hex];
    const material = new BABYLON.StandardMaterial("particle-" + hex.replace("#", ""), scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(hex);
    material.emissiveColor = material.diffuseColor.scale(0.28);
    material.specularColor = BABYLON.Color3.Black();
    particleMaterials[hex] = material;
    return material;
}

export function spawnBurst(position, colorHex, count, size, speed) {
    for (let i = 0; i < count; i++) {
        const mesh = BABYLON.MeshBuilder.CreateBox("particle", { size }, scene);
        mesh.material = createParticleMaterial(colorHex);
        mesh.isPickable = false;
        mesh.checkCollisions = false;
        mesh.position.copyFrom(position);
        particles.push({
            mesh, life: 0.28 + Math.random() * 0.22,
            velocity: new BABYLON.Vector3(
                (Math.random() - 0.5) * speed,
                Math.random() * speed * 0.55,
                (Math.random() - 0.5) * speed
            )
        });
    }
}

export function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { p.mesh.dispose(false, true); particles.splice(i, 1); continue; }
        p.velocity.y -= 12 * dt;
        p.mesh.position.addInPlace(p.velocity.scale(dt));
        p.mesh.rotation.x += 6 * dt;
        p.mesh.rotation.y += 7 * dt;
    }
}

// 鈹€鈹€ Pickup creation / collection / update 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
export function createPickup(type, position, options) {
    const opts = options || {};
    const root = new BABYLON.TransformNode("pickup-" + type + "-" + Math.floor(Math.random() * 100000), scene);
    root.position.copyFrom(position);

    function makePart(name, size, offset, material) {
        const part = BABYLON.MeshBuilder.CreateBox(name, size, scene);
        part.parent = root;
        part.position.copyFrom(offset);
        part.material = material;
        part.isPickable = false;
        part.checkCollisions = false;
    }

    if (type === "food") {
        makePart("food-body", { width: 0.52, height: 0.52, depth: 0.52 }, vec3(0, 0, 0), materials.pickupRed);
        makePart("food-leaf", { width: 0.12, height: 0.18, depth: 0.12 }, vec3(0.1, 0.28, 0), materials.foliageMeadow);
    } else if (type === "healPotion") {
        makePart("heal-pot-body", { width: 0.32, height: 0.52, depth: 0.32 }, vec3(0, 0, 0), materials.pickupRed);
        makePart("heal-pot-cap", { width: 0.18, height: 0.14, depth: 0.18 }, vec3(0, 0.34, 0), materials.pickupWhite);
    } else if (type === "buffPotion") {
        makePart("buff-pot-body", { width: 0.32, height: 0.52, depth: 0.32 }, vec3(0, 0, 0), materials.pickupGreen);
        makePart("buff-pot-cap", { width: 0.18, height: 0.14, depth: 0.18 }, vec3(0, 0.34, 0), materials.pickupWhite);
    } else if (type === "skillBook") {
        makePart("skill-book-cover", { width: 0.5, height: 0.08, depth: 0.36 }, vec3(0, 0, 0), materials.pickupPurple);
        makePart("skill-book-pages", { width: 0.44, height: 0.06, depth: 0.28 }, vec3(0, 0.05, 0), materials.pickupWhite);
    } else if (type === "bow") {
        makePart("pickup-bow-body", { width: 0.12, height: 0.86, depth: 0.12 }, vec3(0, 0, 0), materials.weaponDark);
        makePart("pickup-bow-top", { width: 0.34, height: 0.12, depth: 0.12 }, vec3(0.12, 0.34, 0), materials.weaponMid);
        makePart("pickup-bow-bottom", { width: 0.34, height: 0.12, depth: 0.12 }, vec3(0.12, -0.34, 0), materials.weaponMid);
        makePart("pickup-arrow", { width: 0.56, height: 0.06, depth: 0.06 }, vec3(0.18, 0, 0), materials.pickupWhite);
    } else if (type === "sword") {
        makePart("pickup-sword-blade", { width: 0.12, height: 0.86, depth: 0.12 }, vec3(0, 0.16, 0), materials.pickupWhite);
        makePart("pickup-sword-guard", { width: 0.42, height: 0.08, depth: 0.14 }, vec3(0, -0.22, 0), materials.weaponAccent);
        makePart("pickup-sword-grip", { width: 0.12, height: 0.34, depth: 0.12 }, vec3(0, -0.46, 0), materials.weaponDark);
    } else if (type === "gear") {
        makePart("gear-case-core", { width: 0.56, height: 0.4, depth: 0.56 }, vec3(0, 0, 0), materials.pickupGold);
        makePart("gear-case-band", { width: 0.62, height: 0.1, depth: 0.62 }, vec3(0, 0.12, 0), materials.pickupMetal);
    } else {
        makePart("supply-core", { width: 0.62, height: 0.62, depth: 0.62 }, vec3(0, 0, 0), materials.pickupBlue);
        makePart("supply-base", { width: 0.9, height: 0.12, depth: 0.9 }, vec3(0, -0.32, 0), materials.weaponDark);
    }

    const pickup = {
        type, root, basePos: position.clone(),
        bob: Math.random() * Math.PI * 2,
        active: true, respawnTimer: 0,
        respawnDelay: 11 + Math.random() * 5,
        respawnEnabled: opts.respawn !== false,
        pickupRadius: type === "food" ? 1.85 : 1.95,
        chunkKey: opts.chunkKey || null,
        biomeId: opts.biomeId || null,
        payload: opts.payload || null
    };
    pickups.push(pickup);
    if (pickup.chunkKey && world.chunks.has(pickup.chunkKey)) {
        const chunk = world.chunks.get(pickup.chunkKey);
        if (chunk.pickups.indexOf(pickup) < 0) chunk.pickups.push(pickup);
    }
    return pickup;
}

function collectPickup(pickup) {
    if (!pickup.active) return;
    pickup.active = false;
    pickup.root.setEnabled(false);
    pickup.respawnTimer = pickup.respawnDelay;

    if (pickup.type === "food") {
        player.health = clamp(player.health + 22, 0, player.maxHealth);
    } else if (pickup.type === "healPotion") {
        addPotionToBag("heal", 1);
    } else if (pickup.type === "buffPotion") {
        addPotionToBag("buff", 1);
    } else if (pickup.type === "skillBook") {
        progression.skillBooks += 1;
        setStatusHint("Skill book acquired.", 1.8);
    } else if (pickup.type === "gear") {
        if (!pickup.payload) pickup.payload = createRandomEquipment(Math.max(1, progression.level), false);
        if (pickup.payload) addEquipmentToBag(pickup.payload);
    } else if (pickup.type === "bow" || pickup.type === "sword") {
        if (_grantWeaponPickup) _grantWeaponPickup(pickup.type);
    } else {
        player.health = clamp(player.health + 12, 0, player.maxHealth);
    }
    registerPickupCollected();
    audio.playPickup();
}

export function updatePickups(dt) {
    for (let i = 0; i < pickups.length; i++) {
        const pickup = pickups[i];
        if (!pickup.active) {
            if (!pickup.respawnEnabled) { disposePickup(pickup); i--; continue; }
            pickup.respawnTimer -= dt;
            if (pickup.respawnTimer <= 0) { pickup.active = true; pickup.root.setEnabled(true); }
            continue;
        }
        pickup.bob += dt * 2.6;
        pickup.root.position.y = pickup.basePos.y + Math.sin(pickup.bob) * 0.18;
        pickup.root.rotation.y += dt * 1.5;
        if (!player.body || state.dead) continue;

        const radiusBonus = player.stats ? player.stats.pickupRadius || 0 : 0;
        const dx = player.body.position.x - pickup.root.position.x;
        const dz = player.body.position.z - pickup.root.position.z;
        const dy = Math.abs(player.body.position.y - pickup.root.position.y);
        if (dx * dx + dz * dz < Math.pow(pickup.pickupRadius + radiusBonus, 2) && dy < 2.2) {
            collectPickup(pickup);
        }
    }
}
