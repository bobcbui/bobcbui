"use strict";

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

    var back = BABYLON.MeshBuilder.CreatePlane("enemy-bar-back-" + index, {
        width: 1,
        height: 0.16
    }, scene);
    back.parent = root;
    back.position = vec3(0, 3.02, 0);
    back.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    back.material = materials.enemyBarBack;
    back.isPickable = false;
    back.checkCollisions = false;
    back.renderingGroupId = 1;

    var fill = BABYLON.MeshBuilder.CreatePlane("enemy-bar-fill-" + index, {
        width: 0.88,
        height: 0.09
    }, scene);
    fill.parent = root;
    fill.position = vec3(0, 3.02, -0.01);
    fill.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    fill.material = materials.enemyBarFill;
    fill.isPickable = false;
    fill.checkCollisions = false;
    fill.renderingGroupId = 1;

    return {
        back: back,
        fill: fill
    };
}

function updateEnemyHealthBar(enemy) {
    if (!enemy.healthBar) {
        return;
    }

    var alive = enemy.state !== "dead";
    enemy.healthBar.back.isVisible = alive;
    enemy.healthBar.fill.isVisible = alive;
    if (!alive) {
        return;
    }

    var ratio = clamp(enemy.health / enemy.maxHealth, 0, 1);
    enemy.healthBar.fill.scaling.x = Math.max(0.001, ratio);
    enemy.healthBar.fill.position.x = -0.44 * (1 - ratio);
}

function createEnemy(position, index, options) {
    var opts = options || {};
    var tier = opts.tier || 1;
    var root = new BABYLON.TransformNode("enemy-root-" + index, scene);
    root.position.copyFrom(position);
    var enemySkinMat = materials.enemySkin.clone("enemy-skin-" + index);
    var enemySuitMat = materials.enemySuit.clone("enemy-suit-" + index);
    var enemyEyeMat = materials.enemyEye.clone("enemy-eye-" + index);

    var skeleton = {
        root: root,
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
        var part = BABYLON.MeshBuilder.CreateBox(name, size, scene);
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

    var enemy = {
        id: index,
        root: root,
        skeleton: skeleton,
        chunkKey: opts.chunkKey || null,
        biomeId: opts.biomeId || "meadow",
        tier: tier,
        health: 56 + tier * 7,
        maxHealth: 56 + tier * 7,
        home: position.clone(),
        patrolTarget: position.clone(),
        state: "patrol",
        speed: 2.05 + Math.min(1.1, tier * 0.03),
        attackCooldown: 0.8,
        senseTimer: 0,
        seesPlayer: false,
        walkPhase: Math.random() * Math.PI * 2,
        flashTimer: 0,
        deadTimer: 0,
        healthBar: createEnemyHealthBar(root, index)
    };

    skeleton.parts.forEach(function (part) {
        part.metadata = { kind: "enemyPart", enemy: enemy };
    });

    updateEnemyHealthBar(enemy);
    enemies.push(enemy);
    if (enemy.chunkKey && world.chunks.has(enemy.chunkKey)) {
        var chunk = world.chunks.get(enemy.chunkKey);
        if (chunk.enemies.indexOf(enemy) < 0) {
            chunk.enemies.push(enemy);
        }
    }
    return enemy;
}

function spawnEnemies() {
    return;
}

function enemyHasLineOfSight(enemy) {
    var from = enemy.root.position.add(vec3(0, 2.1, 0));
    var to = player.camera.globalPosition.clone();
    var direction = to.subtract(from);
    var distance = direction.length();
    if (distance > CONFIG.enemySight) {
        return false;
    }
    direction.normalize();
    var ray = new BABYLON.Ray(from, direction, distance);
    var hit = scene.pickWithRay(ray, function (mesh) {
        return !!(mesh && mesh.metadata && mesh.metadata.kind === "terrain");
    }, false);
    return !(hit && hit.hit && hit.distance < distance - 0.05);
}

function chooseEnemyPatrolTarget(enemy) {
    var tries = 12;
    while (tries > 0) {
        tries -= 1;
        var x = Math.round(enemy.home.x + (Math.random() - 0.5) * 8);
        var z = Math.round(enemy.home.z + (Math.random() - 0.5) * 8);
        enemy.patrolTarget = vec3(x, getTerrainSurfaceHeight(x, z) + 0.55, z);
        return;
    }
    enemy.patrolTarget = enemy.home.clone();
}

function killEnemy(enemy) {
    if (enemy.state === "dead") {
        return;
    }
    enemy.state = "dead";
    enemy.deadTimer = 0;
    enemy.flashTimer = 0;
    enemy.skeleton.parts.forEach(function (part) {
        part.isPickable = false;
    });
    updateEnemyHealthBar(enemy);
    spawnBurst(enemy.root.position.add(vec3(0, 1.5, 0)), "#ff7d73", 14, 0.12, 4.6);
    audio.playEnemyDown();
    registerEnemyDefeat();

    var dropRoll = Math.random();
    if (dropRoll > 0.82) {
        createPickup("gear", enemy.root.position.add(vec3(0, 0.9, 0)), {
            chunkKey: enemy.chunkKey,
            biomeId: enemy.biomeId
        });
    } else if (dropRoll > 0.5) {
        createPickup(Math.random() > 0.5 ? "food" : "pistol", enemy.root.position.add(vec3(0, 0.9, 0)), {
            chunkKey: enemy.chunkKey,
            biomeId: enemy.biomeId
        });
    }
}

function respawnEnemy(enemy) {
    enemy.health = enemy.maxHealth;
    enemy.state = "patrol";
    enemy.deadTimer = 0;
    enemy.root.rotation.setAll(0);
    enemy.root.position.copyFrom(enemy.home);
    enemy.root.position.y = getTerrainSurfaceHeight(enemy.home.x, enemy.home.z) + 0.55;
    enemy.skeleton.parts.forEach(function (part) {
        part.isPickable = true;
    });
    chooseEnemyPatrolTarget(enemy);
    updateEnemyHealthBar(enemy);
}

function disposeEnemy(enemy) {
    if (!enemy) {
        return;
    }
    if (enemy.chunkKey && world.chunks.has(enemy.chunkKey)) {
        var chunk = world.chunks.get(enemy.chunkKey);
        var chunkIndex = chunk.enemies.indexOf(enemy);
        if (chunkIndex >= 0) {
            chunk.enemies.splice(chunkIndex, 1);
        }
    }
    if (enemy.root) {
        enemy.root.dispose(false, true);
    }
    var index = enemies.indexOf(enemy);
    if (index >= 0) {
        enemies.splice(index, 1);
    }
}

function damageEnemy(enemy, amount, point) {
    if (enemy.state === "dead") {
        return;
    }
    enemy.health -= amount;
    enemy.flashTimer = 0.16;
    state.hitMarkerTimer = 0.11;
    updateEnemyHealthBar(enemy);
    spawnBurst(point || enemy.root.position.add(vec3(0, 1.6, 0)), "#ffc57a", 5, 0.09, 3.8);
    audio.playHit();
    if (enemy.health <= 0) {
        killEnemy(enemy);
    }
}

function updateEnemyAnimation(enemy, moveFactor, dt) {
    enemy.walkPhase += dt * (moveFactor > 0.02 ? 7.5 : 2.2);
    var swing = moveFactor > 0.02 ? 0.72 : 0.08;
    enemy.skeleton.leftArm.rotation.x = Math.sin(enemy.walkPhase) * swing;
    enemy.skeleton.rightArm.rotation.x = -Math.sin(enemy.walkPhase) * swing;
    enemy.skeleton.leftLeg.rotation.x = -Math.sin(enemy.walkPhase) * swing;
    enemy.skeleton.rightLeg.rotation.x = Math.sin(enemy.walkPhase) * swing;

    enemy.flashTimer -= dt;
    enemy.skeleton.parts.forEach(function (part) {
        if (part.material && part.name.indexOf("enemy-eye") !== 0) {
            part.material.emissiveColor = enemy.flashTimer > 0
                ? new BABYLON.Color3(0.45, 0.12, 0.12)
                : part.material.diffuseColor.scale(0.05);
        }
    });
}

function updateEnemies(dt) {
    enemies.slice().forEach(function (enemy) {
        if (!enemy.root || (typeof enemy.root.isDisposed === "function" && enemy.root.isDisposed())) {
            disposeEnemy(enemy);
            return;
        }

        if (enemy.state === "dead") {
            enemy.deadTimer += dt;
            enemy.root.position.y -= dt * 0.7;
            enemy.root.rotation.z = clamp(enemy.root.rotation.z + dt * 1.4, 0, 1.36);
            if (enemy.deadTimer > 5.4) {
                respawnEnemy(enemy);
            }
            return;
        }

        enemy.attackCooldown -= dt;
        enemy.senseTimer -= dt;
        if (enemy.senseTimer <= 0) {
            enemy.seesPlayer = enemyHasLineOfSight(enemy);
            enemy.senseTimer = 0.28 + Math.random() * 0.12;
        }

        var toPlayer = player.body.position.subtract(enemy.root.position);
        var flatToPlayer = new BABYLON.Vector3(toPlayer.x, 0, toPlayer.z);
        var playerDistance = flatToPlayer.length();

        if (enemy.seesPlayer && playerDistance < CONFIG.enemySight) {
            enemy.state = playerDistance <= CONFIG.enemyAttackRange ? "attack" : "chase";
        } else if (enemy.state === "chase" || enemy.state === "attack") {
            enemy.state = "patrol";
            chooseEnemyPatrolTarget(enemy);
        }

        var moveDir = BABYLON.Vector3.Zero();
        var speed = 0;

        if (enemy.state === "patrol") {
            var patrolDelta = enemy.patrolTarget.subtract(enemy.root.position);
            var patrolFlat = new BABYLON.Vector3(patrolDelta.x, 0, patrolDelta.z);
            if (patrolFlat.length() < 0.8) {
                chooseEnemyPatrolTarget(enemy);
            } else {
                moveDir = patrolFlat.normalize();
                speed = enemy.speed * 0.7;
            }
        } else if (enemy.state === "chase") {
            moveDir = flatToPlayer.normalize();
            speed = enemy.speed * 1.12;
        } else if (enemy.state === "attack") {
            if (playerDistance > CONFIG.enemyAttackRange + 0.3) {
                enemy.state = "chase";
            } else if (enemy.attackCooldown <= 0) {
                enemy.attackCooldown = 0.92;
                damagePlayer(8 + enemy.tier * 0.2, "Enemy strike landed");
            }
        }

        if (speed > 0 && moveDir.lengthSquared() > 0) {
            var nextX = enemy.root.position.x + moveDir.x * speed * dt;
            var nextZ = enemy.root.position.z + moveDir.z * speed * dt;
            var nextGround = getTerrainSurfaceHeight(nextX, nextZ) + 0.55;
            if (Math.abs(nextGround - enemy.root.position.y) < 2.4) {
                enemy.root.position.x = nextX;
                enemy.root.position.z = nextZ;
            } else if (enemy.state === "patrol") {
                chooseEnemyPatrolTarget(enemy);
            }
            enemy.root.position.y = getTerrainSurfaceHeight(enemy.root.position.x, enemy.root.position.z) + 0.55;
            enemy.root.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }

        updateEnemyAnimation(enemy, speed, dt);
    });
}
