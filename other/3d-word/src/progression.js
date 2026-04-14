"use strict";

var progression = {
    level: 1,
    xp: 0,
    xpToNext: 3,
    gold: 0,
    skillBooks: 0,
    potionBag: {},
    skills: {},
    activeBuff: {
        name: "",
        timer: 0,
        attack: 0,
        defense: 0,
        moveSpeed: 0,
        pickupRadius: 0,
        maxHealth: 0
    },
    equipmentSerial: 1,
    equipmentBag: [],
    equipment: {
        helmet: null,
        armor: null,
        boots: null,
        relic: null
    },
    quests: {},
    metrics: {
        chunksVisited: 0,
        enemiesDefeated: 0,
        pickupsCollected: 0,
        distanceTravelled: 0
    },
    visitedChunks: new Set()
};

function setStatusHint(text, duration) {
    state.statusHint = text || "";
    state.statusHintTimer = Math.max(0, duration || 0);
}

function createDefaultPotionBag() {
    return {
        heal: 2,
        buff: 1
    };
}

function createDefaultSkills() {
    var skills = {};
    Object.keys(GAME_DATA.skills || {}).forEach(function (skillId) {
        var def = GAME_DATA.skills[skillId];
        skills[skillId] = {
            id: skillId,
            name: def.name,
            level: 1,
            maxLevel: def.maxLevel || 5,
            baseCooldown: def.baseCooldown || 8,
            cooldown: 0
        };
    });
    return skills;
}

function createQuest(id, label, target, rewardXp, rewardGold, rewardBooks) {
    return {
        id: id,
        label: label,
        level: 1,
        progress: 0,
        target: target,
        rewardXp: rewardXp,
        rewardGold: rewardGold,
        rewardBooks: rewardBooks || 0
    };
}

function createDefaultQuests() {
    return {
        slayer: createQuest("slayer", "Bounty Hunt", 6, 3, 30, 0),
        collector: createQuest("collector", "Field Supplies", 7, 2, 20, 0),
        explorer: createQuest("explorer", "Frontier Cartography", 4, 2, 24, 0)
    };
}

function emptyStatBlock() {
    return {
        maxHealth: 0,
        attack: 0,
        defense: 0,
        moveSpeed: 0,
        pickupRadius: 0
    };
}

function mergeStatBlock(target, source) {
    target.maxHealth += source.maxHealth || 0;
    target.attack += source.attack || 0;
    target.defense += source.defense || 0;
    target.moveSpeed += source.moveSpeed || 0;
    target.pickupRadius += source.pickupRadius || 0;
}

function getEquippedStatBonus() {
    var total = emptyStatBlock();
    Object.keys(progression.equipment).forEach(function (slot) {
        var item = progression.equipment[slot];
        if (item && item.stats) {
            mergeStatBlock(total, item.stats);
        }
    });
    return total;
}

function getBuffStatBonus() {
    return {
        maxHealth: progression.activeBuff.maxHealth || 0,
        attack: progression.activeBuff.attack || 0,
        defense: progression.activeBuff.defense || 0,
        moveSpeed: progression.activeBuff.moveSpeed || 0,
        pickupRadius: progression.activeBuff.pickupRadius || 0
    };
}

function resolvePlayerStats() {
    var levelBonus = Math.max(0, progression.level - 1);
    var equipBonus = getEquippedStatBonus();
    var buffBonus = getBuffStatBonus();
    player.stats = {
        maxHealth: 100 + levelBonus * 4 + equipBonus.maxHealth + buffBonus.maxHealth,
        attack: levelBonus + equipBonus.attack + buffBonus.attack,
        defense: Math.floor(levelBonus * 0.5) + equipBonus.defense + buffBonus.defense,
        moveSpeed: equipBonus.moveSpeed + buffBonus.moveSpeed,
        pickupRadius: equipBonus.pickupRadius + buffBonus.pickupRadius,
        power: progression.level
    };
    player.maxHealth = Math.max(1, Math.round(player.stats.maxHealth));
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
        progression.xpToNext = Math.min(progression.xpToNext + 1, 12);
        setStatusHint("Level up! Lv." + progression.level, 2.2);
        resolvePlayerStats();
    }
}

function grantGold(amount) {
    if (!amount) {
        return;
    }
    progression.gold += Math.max(0, Math.round(amount));
}

function getSkillUpgradeCost(skillId) {
    var skill = progression.skills[skillId];
    if (!skill) {
        return 999;
    }
    return 1 + Math.floor((skill.level - 1) * 0.75);
}

function upgradeSkill(skillId) {
    var skill = progression.skills[skillId];
    if (!skill) {
        return false;
    }
    if (skill.level >= skill.maxLevel) {
        setStatusHint(skill.name + " is already max level.", 1.8);
        return false;
    }
    var cost = getSkillUpgradeCost(skillId);
    if (progression.skillBooks < cost) {
        setStatusHint("Need " + cost + " skill books.", 1.8);
        return false;
    }
    progression.skillBooks -= cost;
    skill.level += 1;
    setStatusHint(skill.name + " upgraded to Lv." + skill.level, 2.2);
    return true;
}

function triggerSkillCooldown(skillId, overrideCooldown) {
    var skill = progression.skills[skillId];
    if (!skill) {
        return;
    }
    var cooldown = overrideCooldown;
    if (cooldown === undefined || cooldown === null) {
        cooldown = Math.max(1.2, skill.baseCooldown - (skill.level - 1) * 0.55);
    }
    skill.cooldown = cooldown;
}

function weightedRandomRarity(bossDrop) {
    var rarities = (GAME_DATA.equipment && GAME_DATA.equipment.rarities) || [];
    if (!rarities.length) {
        return { id: "common", label: "Common", power: 1 };
    }

    var total = 0;
    for (var i = 0; i < rarities.length; i += 1) {
        var baseWeight = rarities[i].weight || 1;
        if (bossDrop && (rarities[i].id === "epic" || rarities[i].id === "legendary")) {
            baseWeight *= 1.6;
        }
        total += baseWeight;
    }

    var roll = Math.random() * total;
    for (var j = 0; j < rarities.length; j += 1) {
        var adjusted = rarities[j].weight || 1;
        if (bossDrop && (rarities[j].id === "epic" || rarities[j].id === "legendary")) {
            adjusted *= 1.6;
        }
        roll -= adjusted;
        if (roll <= 0) {
            return rarities[j];
        }
    }
    return rarities[0];
}

function buildEquipmentStats(slot, power) {
    if (slot === "helmet") {
        return {
            maxHealth: Math.round(8 + power * 6.5),
            attack: 0,
            defense: Math.round(1 + power * 1.3),
            moveSpeed: 0,
            pickupRadius: 0
        };
    }
    if (slot === "armor") {
        return {
            maxHealth: Math.round(12 + power * 7.5),
            attack: 0,
            defense: Math.round(2 + power * 1.7),
            moveSpeed: 0,
            pickupRadius: 0
        };
    }
    if (slot === "boots") {
        return {
            maxHealth: 0,
            attack: 0,
            defense: Math.round(power * 0.8),
            moveSpeed: Math.round((0.04 + power * 0.018) * 1000) / 1000,
            pickupRadius: Math.round((0.1 + power * 0.07) * 100) / 100
        };
    }
    return {
        maxHealth: Math.round(power * 3),
        attack: Math.round(1 + power * 1.4),
        defense: Math.round(power * 0.6),
        moveSpeed: 0,
        pickupRadius: Math.round((0.12 + power * 0.05) * 100) / 100
    };
}

function createRandomEquipment(tier, bossDrop) {
    var slots = (GAME_DATA.equipment && GAME_DATA.equipment.slots) || ["helmet", "armor", "boots", "relic"];
    var slot = slots[Math.floor(Math.random() * slots.length)];
    var rarity = weightedRandomRarity(!!bossDrop);
    var tierPower = Math.max(1, tier || 1);
    var rarityPower = rarity.power || 1;
    var power = tierPower * rarityPower * (bossDrop ? 1.18 : 1);

    var slotLabel = {
        helmet: "Helm",
        armor: "Armor",
        boots: "Boots",
        relic: "Relic"
    };

    return {
        id: "eq-" + progression.equipmentSerial++,
        slot: slot,
        slotLabel: slotLabel[slot] || slot,
        rarity: rarity.id,
        rarityLabel: rarity.label,
        tier: tierPower,
        name: rarity.label + " " + (slotLabel[slot] || slot),
        stats: buildEquipmentStats(slot, power)
    };
}

function addEquipmentToBag(item) {
    if (!item) {
        return;
    }
    progression.equipmentBag.push(item);
    if (progression.equipmentBag.length > 28) {
        progression.equipmentBag.shift();
    }
    setStatusHint("Looted: " + item.name, 2.2);
}

function equipEquipment(itemId) {
    var index = progression.equipmentBag.findIndex(function (item) {
        return item.id === itemId;
    });
    if (index < 0) {
        return false;
    }
    var item = progression.equipmentBag[index];
    var slot = item.slot;
    if (!slot) {
        return false;
    }

    var equipped = progression.equipment[slot];
    if (equipped) {
        progression.equipmentBag.push(equipped);
    }
    progression.equipment[slot] = item;
    progression.equipmentBag.splice(index, 1);
    setStatusHint("Equipped " + item.name, 1.8);
    resolvePlayerStats();
    return true;
}

function unequipEquipment(slot) {
    var item = progression.equipment[slot];
    if (!item) {
        return false;
    }
    progression.equipmentBag.push(item);
    progression.equipment[slot] = null;
    setStatusHint("Unequipped " + item.name, 1.8);
    resolvePlayerStats();
    return true;
}

function addPotionToBag(type, count) {
    if (!type) {
        return;
    }
    progression.potionBag[type] = (progression.potionBag[type] || 0) + Math.max(1, count || 1);
    setStatusHint("Picked up " + (type === "heal" ? "Recovery Potion" : "Battle Tonic"), 1.6);
}

function useHealingPotion() {
    if ((progression.potionBag.heal || 0) <= 0) {
        setStatusHint("No recovery potion left.", 1.3);
        return false;
    }
    if (player.health >= player.maxHealth - 0.01) {
        setStatusHint("HP is already full.", 1.3);
        return false;
    }

    progression.potionBag.heal -= 1;
    var healAmount = (GAME_DATA.potions.heal && GAME_DATA.potions.heal.healAmount) || 42;
    player.health = clamp(player.health + healAmount, 0, player.maxHealth);
    setStatusHint("Recovered +" + healAmount + " HP", 1.6);
    return true;
}

function useBuffPotion() {
    if ((progression.potionBag.buff || 0) <= 0) {
        setStatusHint("No battle tonic left.", 1.3);
        return false;
    }

    progression.potionBag.buff -= 1;
    var levelScale = Math.max(0, progression.level - 1);
    progression.activeBuff.name = "Battle Tonic";
    progression.activeBuff.timer = (GAME_DATA.potions.buff && GAME_DATA.potions.buff.duration) || 12;
    progression.activeBuff.attack = 4 + Math.round(levelScale * 0.25);
    progression.activeBuff.defense = 2 + Math.round(levelScale * 0.15);
    progression.activeBuff.moveSpeed = 0.16;
    progression.activeBuff.pickupRadius = 0.35;
    progression.activeBuff.maxHealth = 8;
    resolvePlayerStats();
    setStatusHint("Battle tonic active for " + Math.round(progression.activeBuff.timer) + "s", 2.2);
    return true;
}

function completeQuestLevel(quest) {
    if (!quest) {
        return;
    }

    var rewardXp = quest.rewardXp + Math.round((quest.level - 1) * 1.2);
    var rewardGold = quest.rewardGold + Math.round((quest.level - 1) * 6);
    var rewardBooks = quest.rewardBooks + (quest.level % 3 === 0 ? 1 : 0);

    grantXP(rewardXp);
    grantGold(rewardGold);
    progression.skillBooks += rewardBooks;

    setStatusHint(
        quest.label + " Lv." + quest.level + " complete! +" + rewardXp + " XP / +" + rewardGold + " Gold" + (rewardBooks ? " / +" + rewardBooks + " Book" : ""),
        3.2
    );

    quest.level += 1;
    quest.target = Math.round(quest.target * 1.28 + 1);
}

function advanceQuest(questId, amount) {
    var quest = progression.quests[questId];
    if (!quest || !amount) {
        return;
    }
    quest.progress += amount;
    while (quest.progress >= quest.target) {
        quest.progress -= quest.target;
        completeQuestLevel(quest);
    }
}

function updateProgressionSystems(dt) {
    Object.keys(progression.skills).forEach(function (skillId) {
        var skill = progression.skills[skillId];
        skill.cooldown = Math.max(0, skill.cooldown - dt);
    });

    if (progression.activeBuff.timer > 0) {
        progression.activeBuff.timer -= dt;
        if (progression.activeBuff.timer <= 0) {
            progression.activeBuff.timer = 0;
            progression.activeBuff.attack = 0;
            progression.activeBuff.defense = 0;
            progression.activeBuff.moveSpeed = 0;
            progression.activeBuff.pickupRadius = 0;
            progression.activeBuff.maxHealth = 0;
            progression.activeBuff.name = "";
            resolvePlayerStats();
            setStatusHint("Buff expired.", 1.4);
        }
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
    advanceQuest("explorer", 1);
}

function registerPickupCollected() {
    progression.metrics.pickupsCollected += 1;
    grantXP(1);
    advanceQuest("collector", 1);
}

function registerEnemyDefeat(enemy) {
    progression.metrics.enemiesDefeated += 1;
    var isBoss = !!(enemy && enemy.isBoss);
    grantXP(isBoss ? 4 : 2);
    grantGold((isBoss ? 26 : 9) + (enemy && enemy.tier ? Math.round(enemy.tier * 2) : 0));
    advanceQuest("slayer", isBoss ? 3 : 1);
}

function initializeProgression() {
    progression.level = 1;
    progression.xp = 0;
    progression.xpToNext = 3;
    progression.gold = 0;
    progression.skillBooks = 0;
    progression.equipmentSerial = 1;
    progression.equipmentBag = [];
    progression.equipment = {
        helmet: null,
        armor: null,
        boots: null,
        relic: null
    };
    progression.potionBag = createDefaultPotionBag();
    progression.skills = createDefaultSkills();
    progression.quests = createDefaultQuests();
    progression.activeBuff = {
        name: "",
        timer: 0,
        attack: 0,
        defense: 0,
        moveSpeed: 0,
        pickupRadius: 0,
        maxHealth: 0
    };
    progression.visitedChunks = new Set();
    progression.metrics = {
        chunksVisited: 0,
        enemiesDefeated: 0,
        pickupsCollected: 0,
        distanceTravelled: 0
    };
    resolvePlayerStats();
}
