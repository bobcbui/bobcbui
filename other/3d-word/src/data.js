export const GAME_DATA = {
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
            pickupBias: ["food", "bow"],
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
            pickupBias: ["food", "sword"],
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
            pickupBias: ["food", "bow"],
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
            pickupBias: ["food", "sword"],
            color: "#cfeaff",
            skyColor: "#cde6ff",
            fogColor: "#eef7ff",
            waterColor: "#96d8ff"
        }
    },
    weapons: {
        bow: {
            id: "bow",
            label: "Hunter Bow",
            short: "Bow",
            family: "bow",
            damage: 22,
            range: 34,
            fireRate: 0.52,
            magazine: 8,
            reserve: 32,
            reloadTime: 1.15,
            recoil: 0.09,
            auto: false
        },
        sword: {
            id: "sword",
            label: "Knight Sword",
            short: "Sword",
            family: "melee",
            damage: 18,
            range: 3.2,
            fireRate: 0.48,
            magazine: 0,
            reserve: 0,
            reloadTime: 0,
            recoil: 0.05,
            auto: false
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

export function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
}
