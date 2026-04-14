"use strict";

var progression = {
    level: 1,
    xp: 0,
    xpToNext: 3,
    metrics: {
        chunksVisited: 0,
        enemiesDefeated: 0,
        pickupsCollected: 0,
        distanceTravelled: 0
    },
    visitedChunks: new Set()
};

function resolvePlayerStats() {
    var levelBonus = Math.max(0, progression.level - 1);
    player.stats = {
        maxHealth: 100 + levelBonus * 4,
        attack: levelBonus,
        defense: Math.floor(levelBonus * 0.5),
        moveSpeed: 0,
        pickupRadius: 0,
        power: progression.level
    };
    player.maxHealth = player.stats.maxHealth;
    if (typeof player.health !== "number" || isNaN(player.health)) {
        player.health = player.maxHealth;
    } else if (player.health > player.maxHealth) {
        player.health = player.maxHealth;
    }
}

function grantXP(amount) {
    if (!amount) {
        return;
    }
    progression.xp += amount;
    while (progression.xp >= progression.xpToNext) {
        progression.xp -= progression.xpToNext;
        progression.level += 1;
        progression.xpToNext = Math.min(progression.xpToNext + 1, 8);
        resolvePlayerStats();
    }
}

function registerTravelDistance(distance) {
    if (distance > 0.001) {
        progression.metrics.distanceTravelled += distance;
    }
}

function registerChunkVisit(chunkX, chunkZ) {
    var key = chunkX + "|" + chunkZ;
    if (progression.visitedChunks.has(key)) {
        return;
    }
    progression.visitedChunks.add(key);
    progression.metrics.chunksVisited += 1;
    grantXP(1);
}

function registerPickupCollected() {
    progression.metrics.pickupsCollected += 1;
    grantXP(1);
}

function registerEnemyDefeat() {
    progression.metrics.enemiesDefeated += 1;
    grantXP(2);
}

function initializeProgression() {
    progression.level = 1;
    progression.xp = 0;
    progression.xpToNext = 3;
    progression.visitedChunks = new Set();
    progression.metrics = {
        chunksVisited: 0,
        enemiesDefeated: 0,
        pickupsCollected: 0,
        distanceTravelled: 0
    };
    resolvePlayerStats();
}
