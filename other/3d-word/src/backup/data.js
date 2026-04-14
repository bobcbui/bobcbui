"use strict";

var GAME_DATA = {
    world: {
        title: "Voxel Realm Frontier",
        chunkSize: 28,
        chunkResolution: 28,
        activeChunkRadius: 1,
        unloadChunkRadius: 2,
        flatHeight: 2,
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
            pickupBias: ["food", "pistol"],
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
            pickupBias: ["food", "rifle"],
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
            pickupBias: ["food", "pistol"],
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
            pickupBias: ["food", "rifle"],
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
            auto: false
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
            auto: true
        }
    },
    skills: {
        shockwave: {
            id: "shockwave",
            name: "Shockwave",
            baseCooldown: 8.2,
            maxLevel: 5
        },
        overdrive: {
            id: "overdrive",
            name: "Overdrive",
            baseCooldown: 16.5,
            maxLevel: 5
        }
    },
    potions: {
        heal: {
            id: "heal",
            label: "Recovery Potion",
            healAmount: 42
        },
        buff: {
            id: "buff",
            label: "Battle Tonic",
            duration: 12
        }
    },
    equipment: {
        slots: ["helmet", "armor", "boots", "relic"],
        rarities: [
            { id: "common", label: "Common", weight: 56, power: 1 },
            { id: "rare", label: "Rare", weight: 28, power: 1.28 },
            { id: "epic", label: "Epic", weight: 12, power: 1.62 },
            { id: "legendary", label: "Legendary", weight: 4, power: 2.05 }
        ]
    }
};

function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
}
