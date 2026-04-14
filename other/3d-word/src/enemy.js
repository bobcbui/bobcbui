import { CONFIG, world, player } from "./runtime.js";
import {
    scene, materials, enemies,
    vec3, clamp, audio
} from "./shared.js";
import { getTerrainSurfaceHeight, spawnBurst, createPickup } from "./world.js";
import {
    progression, registerEnemyDefeat, createRandomEquipment
} from "./progression.js";

function enemyGroundToRootY(surfaceY) {
    return surfaceY - 0.04;
}

function ensureEnemyBarMaterials() {
    if (!materials.enemyBarBack) {
        materials.enemyBarBack = new BABYLON.StandardMaterial("enemy-bar-back", scene);
        materials.enemyBarBack.diffuseColor = new BABYLON.Color3(0.18, 0.04, 0.04);
        materials.enemyBarBack.emissiveColor = new BABYLON.Color3(0.22, 0.05, 0.05);
        materials.enemyBarBack.disableLighting = true;
        materials.enemyBarBack.backFaceCulling = false;
    }
    if (!materials.enemyBarFill) {
        materials.enemyBarFill = new BABYLON.StandardMaterial("enemy-bar-fill", scene);
        materials.enemyBarFill.diffuseColor = new BABYLON.Color3(0.26, 0.86, 0.38);
        materials.enemyBarFill.emissiveColor = new BABYLON.Color3(0.24, 0.76, 0.34);
        materials.enemyBarFill.disableLighting = true;
        materials.enemyBarFill.backFaceCulling = false;
    }
}

function createEnemyHealthBar(root, index) {
    ensureEnemyBarMaterials();
    const back = BABYLON.MeshBuilder.CreatePlane("enemy-bar-back-" + index, { width: 1, height: 0.16 }, scene);
    back.parent = root;
    back.position = vec3(0, 3.02, 0);
    back.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    back.material = materials.enemyBarBack;
    back.isPickable = false;
    back.checkCollisions = false;
    back.renderingGroupId = 1;

    const fill = BABYLON.MeshBuilder.CreatePlane("enemy-bar-fill-" + index, { width: 0.88, height: 0.09 }, scene);
    fill.parent = root;
    fill.position = vec3(0, 3.02, -0.01);
    fill.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    fill.material = materials.enemyBarFill;
    fill.isPickable = false;
    fill.checkCollisions = false;
    fill.renderingGroupId = 1;

    return { back, fill };
}

function updateEnemyHealthBar(enemy) {
    if (!enemy.healthBar) return;
    const alive = enemy.state !== "dead";
    enemy.healthBar.back.isVisible = alive;
    enemy.healthBar.fill.isVisible = alive;
    if (!alive) return;
    const ratio = clamp(enemy.health / enemy.maxHealth, 0, 1);
    enemy.healthBar.fill.scaling.x = Math.max(0.001, ratio);
    enemy.healthBar.fill.position.x = -0.44 * (1 - ratio);
}

export function createEnemy(position, index, options) {
    const opts = options || {};
    const tier = opts.tier || 1;
    const isBoss = !!opts.isBoss;
    const root = new BABYLON.TransformNode("enemy-root-" + index, scene);
    root.position.copyFrom(position);
    root.position.y = enemyGroundToRootY(getTerrainSurfaceHeight(position.x, position.z));
    if (isBoss) root.scaling = new BABYLON.Vector3(1.36, 1.36, 1.36);

    const enemySkinMat = materials.enemySkin.clone("enemy-skin-" + index);
    const enemySuitMat = materials.enemySuit.clone("enemy-suit-" + index);
    const enemyEyeMat = materials.enemyEye.clone("enemy-eye-" + index);
    if (isBoss) {
        enemySuitMat.diffuseColor = new BABYLON.Color3(0.5, 0.25, 0.2);
        enemySuitMat.emissiveColor = enemySuitMat.diffuseColor.scale(0.08);
        enemyEyeMat.emissiveColor = new BABYLON.Color3(1, 0.55, 0.2);
    }

    const skeleton = {
        root,
        torso: new BABYLON.TransformNode("enemy-torso-" + index, scene),
        head: null,
        leftArm: new BABYLON.TransformNode("enemy-larm-" + index, scene),
        rightArm: new BABYLON.TransformNode("enemy-rarm-" + index, scene),
        leftLeg: new BABYLON.TransformNode("enemy-lleg-" + index, scene),
        rightLeg: new BABYLON.TransformNode("enemy-rleg-" + index, scene),
        parts: []
    };
    skeleton.torso.parent = root;
    skeleton.leftArm.parent = root;
    skeleton.rightArm.parent = root;
    skeleton.leftLeg.parent = root;
    skeleton.rightLeg.parent = root;

    function makePart(name, size, parent, positionOffset, material) {
        const part = BABYLON.MeshBuilder.CreateBox(name, size, scene);
        part.parent = parent;
        part.position.copyFrom(positionOffset);
        part.material = material;
        part.checkCollisions = false;
        part.isPickable = true;
        skeleton.parts.push(part);
        return part;
    }

    makePart("enemy-body-" + index, { width: 0.82, height: 1.05, depth: 0.45 }, skeleton.torso, vec3(0, 1.4, 0), enemySuitMat);
    skeleton.head = makePart("enemy-head-" + index, { width: 0.62, height: 0.62, depth: 0.62 }, root, vec3(0, 2.24, 0), enemySkinMat);
    makePart("enemy-eye-left-" + index, { width: 0.08, height: 0.08, depth: 0.08 }, skeleton.head, vec3(-0.12, 0.03, -0.31), enemyEyeMat);
    makePart("enemy-eye-right-" + index, { width: 0.08, height: 0.08, depth: 0.08 }, skeleton.head, vec3(0.12, 0.03, -0.31), enemyEyeMat);
    makePart("enemy-arm-left-" + index, { width: 0.22, height: 0.84, depth: 0.22 }, skeleton.leftArm, vec3(0, -0.4, 0), enemySuitMat);
    makePart("enemy-arm-right-" + index, { width: 0.22, height: 0.84, depth: 0.22 }, skeleton.rightArm, vec3(0, -0.4, 0), enemySuitMat);
    makePart("enemy-leg-left-" + index, { width: 0.28, height: 0.92, depth: 0.28 }, skeleton.leftLeg, vec3(0, -0.45, 0), enemySuitMat);
    makePart("enemy-leg-right-" + index, { width: 0.28, height: 0.92, depth: 0.28 }, skeleton.rightLeg, vec3(0, -0.45, 0), enemySuitMat);

    skeleton.leftArm.position.set(-0.56, 1.88, 0);
    skeleton.rightArm.position.set(0.56, 1.88, 0);
    skeleton.leftLeg.position.set(-0.2, 0.95, 0);
    skeleton.rightLeg.position.set(0.2, 0.95, 0);

    let healthPool = 56 + tier * 7;
    if (isBoss) healthPool = Math.round(healthPool * 3.1);

    const enemy = {
        id: index, root, skeleton,
        chunkKey: opts.chunkKey || null,
        biomeId: opts.biomeId || "meadow",
        isBoss, tier,
        health: healthPool, maxHealth: healthPool,
        home: position.clone(),
        patrolTarget: position.clone(),
        state: "patrol",
        speed: (isBoss ? 1.8 : 2.05) + Math.min(1.1, tier * 0.03),
        attackDamage: (isBoss ? 15 : 8) + tier * (isBoss ? 0.35 : 0.2),
        attackCooldown: 0.8,
        senseTimer: 0, seesPlayer: false,
        walkPhase: Math.random() * Math.PI * 2,
        flashTimer: 0, deadTimer: 0,
        healthBar: createEnemyHealthBar(root, index)
    };

    skeleton.parts.forEach(part => { part.metadata = { kind: "enemyPart", enemy }; });
    updateEnemyHealthBar(enemy);
    enemies.push(enemy);
    if (enemy.chunkKey && world.chunks.has(enemy.chunkKey)) {
        const chunk = world.chunks.get(enemy.chunkKey);
        if (chunk.enemies.indexOf(enemy) < 0) chunk.enemies.push(enemy);
    }
    return enemy;
}

function enemyHasLineOfSight(enemy) {
    const from = enemy.root.position.add(vec3(0, 2.1, 0));
    const to = player.camera.globalPosition.clone();
    const direction = to.subtract(from);
    const distance = direction.length();
    if (distance > CONFIG.enemySight) return false;
    direction.normalize();
    const ray = new BABYLON.Ray(from, direction, distance);
    const hit = scene.pickWithRay(ray, mesh => !!(mesh && mesh.metadata && mesh.metadata.kind === "terrain"), false);
    return !(hit && hit.hit && hit.distance < distance - 0.05);
}

function chooseEnemyPatrolTarget(enemy) {
    const x = Math.round(enemy.home.x + (Math.random() - 0.5) * 8);
    const z = Math.round(enemy.home.z + (Math.random() - 0.5) * 8);
    enemy.patrolTarget = vec3(x, enemyGroundToRootY(getTerrainSurfaceHeight(x, z)), z);
}

function killEnemy(enemy) {
    if (enemy.state === "dead") return;
    enemy.state = "dead";
    enemy.deadTimer = 0;
    enemy.flashTimer = 0;
    enemy.skeleton.parts.forEach(part => { part.isPickable = false; });
    updateEnemyHealthBar(enemy);
    spawnBurst(enemy.root.position.add(vec3(0, 1.5, 0)), "#ff7d73", 14, 0.12, 4.6);
    audio.playEnemyDown();
    registerEnemyDefeat(enemy);

    if (enemy.isBoss) {
        if (Math.random() < 0.72) {
            createPickup("skillBook", enemy.root.position.add(vec3(0, 0.9, 0)), {
                chunkKey: enemy.chunkKey, biomeId: enemy.biomeId, respawn: false
            });
        }
        if (Math.random() < 0.82) {
            createPickup("gear", enemy.root.position.add(vec3(0.6, 0.9, 0)), {
                chunkKey: enemy.chunkKey, biomeId: enemy.biomeId, respawn: false,
                payload: createRandomEquipment(enemy.tier + 1, true)
            });
        }
        if (Math.random() < 0.64) {
            createPickup(Math.random() > 0.5 ? "healPotion" : "buffPotion", enemy.root.position.add(vec3(-0.6, 0.9, 0)), {
                chunkKey: enemy.chunkKey, biomeId: enemy.biomeId, respawn: false
            });
        }
        return;
    }

    const dropRoll = Math.random();
    if (dropRoll > 0.55) {
        createPickup(Math.random() > 0.5 ? "food" : (Math.random() > 0.45 ? "bow" : "sword"), enemy.root.position.add(vec3(0, 0.9, 0)), {
            chunkKey: enemy.chunkKey, biomeId: enemy.biomeId, respawn: false
        });
    } else if (dropRoll > 0.38) {
        createPickup(Math.random() > 0.5 ? "healPotion" : "buffPotion", enemy.root.position.add(vec3(0, 0.9, 0)), {
            chunkKey: enemy.chunkKey, biomeId: enemy.biomeId, respawn: false
        });
    } else if (dropRoll > 0.26) {
        createPickup("gear", enemy.root.position.add(vec3(0, 0.9, 0)), {
            chunkKey: enemy.chunkKey, biomeId: enemy.biomeId, respawn: false,
            payload: createRandomEquipment(enemy.tier, false)
        });
    }
}

function respawnEnemy(enemy) {
    enemy.health = enemy.maxHealth;
    enemy.state = "patrol";
    enemy.deadTimer = 0;
    enemy.root.rotation.setAll(0);
    enemy.root.position.copyFrom(enemy.home);
    enemy.root.position.y = enemyGroundToRootY(getTerrainSurfaceHeight(enemy.home.x, enemy.home.z));
    enemy.skeleton.parts.forEach(part => { part.isPickable = true; });
    chooseEnemyPatrolTarget(enemy);
    updateEnemyHealthBar(enemy);
}

export function disposeEnemy(enemy) {
    if (!enemy) return;
    if (enemy.chunkKey && world.chunks.has(enemy.chunkKey)) {
        const chunk = world.chunks.get(enemy.chunkKey);
        const idx = chunk.enemies.indexOf(enemy);
        if (idx >= 0) chunk.enemies.splice(idx, 1);
    }
    if (enemy.root) enemy.root.dispose(false, true);
    const index = enemies.indexOf(enemy);
    if (index >= 0) enemies.splice(index, 1);
}

export function damageEnemy(enemy, amount, point) {
    if (enemy.state === "dead") return;
    enemy.health -= amount;
    enemy.flashTimer = 0.16;
    updateEnemyHealthBar(enemy);
    spawnBurst(point || enemy.root.position.add(vec3(0, 1.6, 0)), "#ffc57a", 5, 0.09, 3.8);
    audio.playHit();
    if (enemy.health <= 0) killEnemy(enemy);
}

function updateEnemyAnimation(enemy, moveFactor, dt) {
    enemy.walkPhase += dt * (moveFactor > 0.02 ? 7.5 : 2.2);
    const swing = moveFactor > 0.02 ? 0.72 : 0.08;
    enemy.skeleton.leftArm.rotation.x = Math.sin(enemy.walkPhase) * swing;
    enemy.skeleton.rightArm.rotation.x = -Math.sin(enemy.walkPhase) * swing;
    enemy.skeleton.leftLeg.rotation.x = -Math.sin(enemy.walkPhase) * swing;
    enemy.skeleton.rightLeg.rotation.x = Math.sin(enemy.walkPhase) * swing;

    enemy.flashTimer -= dt;
    enemy.skeleton.parts.forEach(part => {
        if (part.material && part.name.indexOf("enemy-eye") !== 0) {
            part.material.emissiveColor = enemy.flashTimer > 0
                ? new BABYLON.Color3(0.45, 0.12, 0.12)
                : part.material.diffuseColor.scale(0.05);
        }
    });
}

// Need a lazy reference to damagePlayer  
let _damagePlayer = null;
export function setDamagePlayer(fn) { _damagePlayer = fn; }

export function updateEnemies(dt) {
    enemies.slice().forEach(enemy => {
        if (!enemy.root || (typeof enemy.root.isDisposed === "function" && enemy.root.isDisposed())) {
            disposeEnemy(enemy);
            return;
        }

        if (enemy.state === "dead") {
            enemy.deadTimer += dt;
            enemy.root.position.y -= dt * 0.7;
            enemy.root.rotation.z = clamp(enemy.root.rotation.z + dt * 1.4, 0, 1.36);
            if (enemy.deadTimer > 5.4) respawnEnemy(enemy);
            return;
        }

        enemy.attackCooldown -= dt;
        enemy.senseTimer -= dt;
        if (enemy.senseTimer <= 0) {
            enemy.seesPlayer = enemyHasLineOfSight(enemy);
            enemy.senseTimer = 0.28 + Math.random() * 0.12;
        }

        const toPlayer = player.body.position.subtract(enemy.root.position);
        const flatToPlayer = new BABYLON.Vector3(toPlayer.x, 0, toPlayer.z);
        const playerDistance = flatToPlayer.length();

        if (enemy.seesPlayer && playerDistance < CONFIG.enemySight) {
            enemy.state = playerDistance <= CONFIG.enemyAttackRange ? "attack" : "chase";
        } else if (enemy.state === "chase" || enemy.state === "attack") {
            enemy.state = "patrol";
            chooseEnemyPatrolTarget(enemy);
        }

        let moveDir = BABYLON.Vector3.Zero();
        let speed = 0;

        if (enemy.state === "patrol") {
            const patrolDelta = enemy.patrolTarget.subtract(enemy.root.position);
            const patrolFlat = new BABYLON.Vector3(patrolDelta.x, 0, patrolDelta.z);
            if (patrolFlat.length() < 0.8) {
                chooseEnemyPatrolTarget(enemy);
            } else {
                moveDir = patrolFlat.normalize();
                speed = enemy.speed * 0.45;
            }
        } else if (enemy.state === "chase") {
            moveDir = flatToPlayer.normalize();
            speed = enemy.speed;
        } else if (enemy.state === "attack") {
            moveDir = BABYLON.Vector3.Zero();
            speed = 0;
            if (enemy.attackCooldown <= 0 && _damagePlayer) {
                _damagePlayer(enemy.attackDamage, enemy);
                enemy.attackCooldown = 0.8;
            }
        }

        if (speed > 0) {
            const step = moveDir.scale(speed * dt);
            const nextX = enemy.root.position.x + step.x;
            const nextZ = enemy.root.position.z + step.z;
            enemy.root.position.x = nextX;
            enemy.root.position.z = nextZ;
            enemy.root.position.y = enemyGroundToRootY(getTerrainSurfaceHeight(nextX, nextZ));
            enemy.root.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }

        updateEnemyAnimation(enemy, speed > 0 ? 1 : 0, dt);
        updateEnemyHealthBar(enemy);
    });
}
