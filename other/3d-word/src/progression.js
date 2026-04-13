"use strict";

var EQUIPMENT_SLOT_ORDER = ["helmet", "chest", "legs", "boots", "charm"];

var progression = {
    level: 1,
    xp: 0,
    xpToNext: 40,
    shards: 0,
    metrics: {
        chunksVisited: 0,
        enemiesDefeated: 0,
        pickupsCollected: 0,
        gearUpgrades: 0,
        skillsUsed: 0,
        distanceTravelled: 0
    },
    visitedChunks: new Set(),
    discoveredBiomes: new Set(),
    achievements: {},
    equipment: {
        helmet: null,
        chest: null,
        legs: null,
        boots: null,
        charm: null
    },
    gearStash: []
};

function buildEquipmentInstance(template, rarity) {
    var chosenRarity = rarity || template.rarity || "common";
    var item = cloneData(template);
    var multiplier = 1 + Math.max(0, rarityRank(chosenRarity) - 1) * 0.16;
    item.rarity = chosenRarity;
    item.instanceId = template.id + "-" + Math.floor(Math.random() * 1000000);
    item.stats = item.stats || {};
    Object.keys(item.stats).forEach(function (key) {
        item.stats[key] = Math.round(item.stats[key] * multiplier * 100) / 100;
    });
    return item;
}

function computeEquipmentScore(item) {
    if (!item || !item.stats) {
        return 0;
    }
    var stats = item.stats;
    return (stats.attack || 0) * 4 +
        (stats.maxHealth || 0) * 0.6 +
        (stats.defense || 0) * 3.2 +
        (stats.critRate || 0) * 120 +
        (stats.critDamage || 0) * 60 +
        (stats.moveSpeed || 0) * 80 +
        (stats.skillHaste || 0) * 100 +
        (stats.pickupRadius || 0) * 40 +
        rarityRank(item.rarity) * 6;
}

function getEquipmentTemplatePool() {
    return GAME_DATA.equipmentTemplates || [];
}

function pickWeightedRarity() {
    var roll = Math.random();
    if (roll > 0.97) {
        return "legendary";
    }
    if (roll > 0.9) {
        return "epic";
    }
    if (roll > 0.68) {
        return "rare";
    }
    if (roll > 0.35) {
        return "uncommon";
    }
    return "common";
}

function createRandomEquipmentDrop() {
    var pool = getEquipmentTemplatePool();
    var template = pool[Math.floor(Math.random() * pool.length)];
    return buildEquipmentInstance(template, pickWeightedRarity());
}

function resolvePlayerStats() {
    var combined = {
        maxHealth: 100,
        attack: 0,
        defense: 0,
        critRate: 0.05,
        critDamage: 0.5,
        moveSpeed: 0,
        skillHaste: 0,
        pickupRadius: 0
    };

    EQUIPMENT_SLOT_ORDER.forEach(function (slot) {
        var item = progression.equipment[slot];
        if (!item || !item.stats) {
            return;
        }
        Object.keys(item.stats).forEach(function (key) {
            combined[key] = (combined[key] || 0) + item.stats[key];
        });
    });

    combined.power = Math.round(
        combined.maxHealth * 0.4 +
        combined.attack * 8 +
        combined.defense * 5 +
        combined.critRate * 180 +
        combined.critDamage * 40 +
        combined.moveSpeed * 80 +
        combined.skillHaste * 100
    );

    player.stats = combined;
    player.maxHealth = Math.round(combined.maxHealth);
    if (typeof player.health !== "number" || isNaN(player.health)) {
        player.health = player.maxHealth;
    } else if (player.health > player.maxHealth) {
        player.health = player.maxHealth;
    }
}

function equipItem(item, silent) {
    if (!item || !item.slot) {
        return false;
    }
    var equipped = progression.equipment[item.slot];
    var isUpgrade = !equipped || computeEquipmentScore(item) >= computeEquipmentScore(equipped);
    if (!isUpgrade) {
        progression.gearStash.push(item);
        progression.shards += 1;
        if (!silent && typeof showToast === "function") {
            showToast(item.name + " salvaged into 1 shard.", 1.8);
        }
        return false;
    }

    progression.equipment[item.slot] = item;
    progression.metrics.gearUpgrades += 1;
    resolvePlayerStats();
    if (!silent && typeof showToast === "function") {
        showToast("Equipped " + item.name + ".", 1.8);
    }
    evaluateAchievements();
    return true;
}

function grantEquipmentDrop(item) {
    var gear = item || createRandomEquipmentDrop();
    equipItem(gear, false);
}

function grantXP(amount) {
    if (!amount) {
        return;
    }
    progression.xp += amount;
    while (progression.xp >= progression.xpToNext) {
        progression.xp -= progression.xpToNext;
        progression.level += 1;
        progression.xpToNext = Math.round(progression.xpToNext * 1.28);
        if (typeof showToast === "function") {
            showToast("Adventure level up! Lv." + progression.level, 2);
        }
    }
}

function awardMetric(metric, amount) {
    if (!progression.metrics.hasOwnProperty(metric)) {
        progression.metrics[metric] = 0;
    }
    progression.metrics[metric] += amount || 1;
    evaluateAchievements();
}

function registerTravelDistance(distance) {
    if (distance > 0.001) {
        progression.metrics.distanceTravelled += distance;
    }
}

function registerChunkVisit(chunkX, chunkZ, biomeId) {
    var key = chunkX + "|" + chunkZ;
    if (progression.visitedChunks.has(key)) {
        return;
    }
    progression.visitedChunks.add(key);
    progression.metrics.chunksVisited += 1;
    if (biomeId) {
        progression.discoveredBiomes.add(biomeId);
    }
    evaluateAchievements();
}

function registerPickupCollected() {
    awardMetric("pickupsCollected", 1);
    grantXP(4);
}

function registerEnemyDefeat() {
    awardMetric("enemiesDefeated", 1);
    grantXP(12);
}

function registerSkillUsed() {
    awardMetric("skillsUsed", 1);
}

function evaluateAchievements() {
    (GAME_DATA.achievements || []).forEach(function (achievement) {
        var entry = progression.achievements[achievement.id];
        if (!entry) {
            entry = progression.achievements[achievement.id] = {
                unlocked: false,
                progress: 0
            };
        }

        entry.progress = Math.min(achievement.target, progression.metrics[achievement.metric] || 0);
        if (!entry.unlocked && entry.progress >= achievement.target) {
            entry.unlocked = true;
            grantXP(20);
            if (typeof showToast === "function") {
                showToast("Achievement unlocked: " + achievement.title, 2.2);
            }
        }
    });
}

function initializeProgression() {
    progression.achievements = {};
    progression.visitedChunks = new Set();
    progression.discoveredBiomes = new Set();
    progression.gearStash = [];
    progression.metrics = {
        chunksVisited: 0,
        enemiesDefeated: 0,
        pickupsCollected: 0,
        gearUpgrades: 0,
        skillsUsed: 0,
        distanceTravelled: 0
    };
    progression.level = 1;
    progression.xp = 0;
    progression.xpToNext = 40;
    progression.shards = 0;

    progression.equipment = {
        helmet: buildEquipmentInstance(getEquipmentTemplatePool()[0], "common"),
        chest: buildEquipmentInstance(getEquipmentTemplatePool()[2], "common"),
        legs: buildEquipmentInstance(getEquipmentTemplatePool()[4], "common"),
        boots: buildEquipmentInstance(getEquipmentTemplatePool()[6], "common"),
        charm: buildEquipmentInstance(getEquipmentTemplatePool()[8], "rare")
    };

    resolvePlayerStats();
    evaluateAchievements();
}

function formatStatValue(key, value) {
    if (key === "critRate" || key === "critDamage" || key === "moveSpeed" || key === "skillHaste") {
        return Math.round(value * 100) + "%";
    }
    if (key === "pickupRadius") {
        return "+" + value.toFixed(2);
    }
    return String(Math.round(value * 100) / 100);
}

function buildEquipmentSummaryLines() {
    var lines = [];
    EQUIPMENT_SLOT_ORDER.forEach(function (slot) {
        var item = progression.equipment[slot];
        var label = slot.charAt(0).toUpperCase() + slot.slice(1);
        var value = item ? item.name + " [" + item.rarity + "]" : "Empty";
        lines.push("<div class=\"inventory-line\"><span>" + label + "</span><span>" + value + "</span></div>");
    });
    lines.push("<div class=\"inventory-line\"><span>Shards</span><span>" + progression.shards + "</span></div>");
    return lines.join("");
}

function buildAchievementSummaryLines() {
    var lines = [];
    var unlockedCount = 0;
    (GAME_DATA.achievements || []).forEach(function (achievement) {
        var stateEntry = progression.achievements[achievement.id] || { unlocked: false, progress: 0 };
        if (stateEntry.unlocked) {
            unlockedCount += 1;
        }
        lines.push(
            "<div class=\"inventory-line\"><span>" +
            achievement.title +
            "</span><span>" +
            (stateEntry.unlocked ? "Done" : stateEntry.progress + " / " + achievement.target) +
            "</span></div>"
        );
    });
    lines.unshift("<div class=\"inventory-line\"><span>Unlocked</span><span>" + unlockedCount + " / " + (GAME_DATA.achievements || []).length + "</span></div>");
    return lines.join("");
}
