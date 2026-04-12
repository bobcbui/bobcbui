"use strict";

var RARITY_COLORS = {
    common: "#d8e1eb",
    uncommon: "#71d988",
    rare: "#65c8ff",
    epic: "#c58cff",
    legendary: "#ffcb6a"
};

var GAME_DATA = {
    world: {
        title: "Voxel Realm Frontier",
        chunkSize: 28,
        chunkResolution: 28,
        activeChunkRadius: 1,
        unloadChunkRadius: 2,
        heightMin: -6,
        waterLevel: 1.55
    },
    biomes: {
        meadow: {
            id: "meadow",
            name: "Meadow",
            topBlock: "grass",
            subsurfaceBlock: "dirt",
            treeChance: 0.015,
            rockChance: 0.01,
            enemyScale: 1,
            pickupBias: ["food", "gear", "pistol"],
            color: "#8fd96c",
            skyColor: "#9bd4ff",
            fogColor: "#d7efff",
            waterColor: "#74b9ff"
        },
        forest: {
            id: "forest",
            name: "Forest",
            topBlock: "grass",
            subsurfaceBlock: "dirt",
            treeChance: 0.022,
            rockChance: 0.012,
            enemyScale: 1.1,
            pickupBias: ["food", "gear", "rifle"],
            color: "#4db86a",
            skyColor: "#86c9ff",
            fogColor: "#caebff",
            waterColor: "#5ea8ff"
        },
        desert: {
            id: "desert",
            name: "Desert",
            topBlock: "sand",
            subsurfaceBlock: "sand",
            treeChance: 0,
            rockChance: 0.016,
            enemyScale: 1.2,
            pickupBias: ["food", "gear", "pistol"],
            color: "#f0cf79",
            skyColor: "#ffd9a8",
            fogColor: "#fff0d9",
            waterColor: "#9fd8ff"
        },
        snow: {
            id: "snow",
            name: "Snowfield",
            topBlock: "snow",
            subsurfaceBlock: "stone",
            treeChance: 0.01,
            rockChance: 0.014,
            enemyScale: 1.25,
            pickupBias: ["food", "gear", "rifle"],
            color: "#cfeaff",
            skyColor: "#cde6ff",
            fogColor: "#eef7ff",
            waterColor: "#96d8ff"
        }
    },
    weapons: {
        pistol: {
            id: "pistol",
            label: "Rune Pistol",
            short: "Pistol",
            family: "sidearm",
            damage: 24,
            range: 34,
            fireRate: 0.28,
            magazine: 12,
            reserve: 48,
            reloadTime: 1.3,
            recoil: 0.12,
            auto: false,
            skill: {
                id: "quickdraw_sigil",
                label: "Quickdraw Sigil",
                description: "Fire an empowered rune round and restore a small amount of health on hit.",
                cooldown: 6,
                damageMultiplier: 2.25,
                healOnHit: 10
            },
            burst: {
                id: "frontier_oath",
                label: "Frontier Oath",
                description: "Temporarily boosts damage and instantly stabilizes health.",
                cooldown: 18,
                duration: 8,
                damageBoost: 0.24,
                healFlat: 24
            }
        },
        rifle: {
            id: "rifle",
            label: "Storm Rifle",
            short: "Rifle",
            family: "rifle",
            damage: 13,
            range: 42,
            fireRate: 0.11,
            magazine: 30,
            reserve: 120,
            reloadTime: 1.8,
            recoil: 0.08,
            auto: true,
            skill: {
                id: "volt_spray",
                label: "Volt Spray",
                description: "Release a burst of rapid empowered shots.",
                cooldown: 7.5,
                pellets: 5,
                spread: 0.065,
                damageMultiplier: 0.85
            },
            burst: {
                id: "hunter_overdrive",
                label: "Hunter Overdrive",
                description: "Boost fire rate and damage for a short time.",
                cooldown: 20,
                duration: 10,
                damageBoost: 0.18,
                fireRateBoost: 0.35
            }
        }
    },
    equipmentTemplates: [
        {
            id: "trail_cap",
            slot: "helmet",
            name: "Trail Cap",
            rarity: "common",
            stats: { maxHealth: 8, critRate: 0.01 }
        },
        {
            id: "warden_hood",
            slot: "helmet",
            name: "Warden Hood",
            rarity: "rare",
            stats: { maxHealth: 12, defense: 3, critRate: 0.02 }
        },
        {
            id: "pathfinder_vest",
            slot: "chest",
            name: "Pathfinder Vest",
            rarity: "common",
            stats: { maxHealth: 12, defense: 2 }
        },
        {
            id: "stormplate_tunic",
            slot: "chest",
            name: "Stormplate Tunic",
            rarity: "rare",
            stats: { maxHealth: 18, defense: 4, attack: 3 }
        },
        {
            id: "wanderer_leggings",
            slot: "legs",
            name: "Wanderer Leggings",
            rarity: "common",
            stats: { maxHealth: 6, defense: 1, moveSpeed: 0.03 }
        },
        {
            id: "dune_runner_greaves",
            slot: "legs",
            name: "Dune Runner Greaves",
            rarity: "rare",
            stats: { defense: 3, moveSpeed: 0.05, attack: 2 }
        },
        {
            id: "frontier_boots",
            slot: "boots",
            name: "Frontier Boots",
            rarity: "common",
            stats: { moveSpeed: 0.04, pickupRadius: 0.2 }
        },
        {
            id: "glacier_treads",
            slot: "boots",
            name: "Glacier Treads",
            rarity: "epic",
            stats: { moveSpeed: 0.06, defense: 2, pickupRadius: 0.35 }
        },
        {
            id: "echo_charm",
            slot: "charm",
            name: "Echo Charm",
            rarity: "rare",
            stats: { attack: 4, critRate: 0.02, skillHaste: 0.05 }
        },
        {
            id: "sunshard_totem",
            slot: "charm",
            name: "Sunshard Totem",
            rarity: "legendary",
            stats: { attack: 7, critRate: 0.04, critDamage: 0.15, skillHaste: 0.08 }
        }
    ],
    achievements: [
        {
            id: "pathfinder",
            title: "Pathfinder",
            description: "Visit 6 unique chunks.",
            metric: "chunksVisited",
            target: 6
        },
        {
            id: "first_blood",
            title: "First Blood",
            description: "Defeat your first enemy.",
            metric: "enemiesDefeated",
            target: 1
        },
        {
            id: "scavenger",
            title: "Scavenger",
            description: "Collect 8 pickups.",
            metric: "pickupsCollected",
            target: 8
        },
        {
            id: "armory_rising",
            title: "Armory Rising",
            description: "Equip 5 gear upgrades.",
            metric: "gearUpgrades",
            target: 5
        },
        {
            id: "spellrunner",
            title: "Spellrunner",
            description: "Use 10 weapon abilities.",
            metric: "skillsUsed",
            target: 10
        }
    ]
};

function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
}

function rarityRank(rarity) {
    var order = {
        common: 1,
        uncommon: 2,
        rare: 3,
        epic: 4,
        legendary: 5
    };
    return order[rarity] || 0;
}
