/*
[REFACTOR] File: config.js
File ini berisi semua data statis, konstanta, dan data toko.
Semua variabel di sini di-export agar bisa di-import oleh file lain.

[FIXED]
- [BUG 3] Menambah data stat untuk 'Barrage Fire'
*/

export const CONFIG = {
    PLAYER: {
        MOVE_SPEED: 4,
        RUN_SPEED: 8,
        DEFAULT_MAX_HEALTH: 100,
        STATS: {
            HEALTH: { baseCost: 1, value: 15 },
            DAMAGE: { baseCost: 1, value: 3 },
            BARRAGE: { baseCost: 2, value: 2 },
            FINAL_PUNCH: { baseCost: 3, value: 10 },
            BARRAGE_FIRE: { baseCost: 3, value: 5 } // [BUG 3] Stat baru
        }
    },
    CHAR_STATS: {
        'Joko': { maxHealth: 250 },
        'Riski': { maxHealth: 220 },
        'PNS': { maxHealth: 280 },
    },
    ATTACKS: {
        PUNCH_DAMAGE: 15,
        PUNCH_RANGE: 3.5,
        KICK_DAMAGE: 25,
        KICK_RANGE: 3.5
    },
    ABILITIES: {
        BARRAGE_COOLDOWN: 8,
        BARRAGE_DURATION: 5,
        BARRAGE_DAMAGE_PER_SEC: 10,
        LAST_PUNCH_COOLDOWN: 10,
        LAST_PUNCH_DAMAGE: 30,
        BARRAGE_FIRE_COOLDOWN: 20,
        BARRAGE_FIRE_DURATION: 4,
        BARRAGE_FIRE_DAMAGE_PER_SEC: 15, // Damage dasar
        BARRIER_MAX_HEALTH: 150,
        BARRIER_REGEN_DELAY: 3,
        BARRIER_REGEN_RATE: 15
    },
    ENEMY: {
        DEFAULT_HEALTH: 100,
        ATTACK_DAMAGE: 10,
        ATTACK_COOLDOWN: 2,
        ATTACK_RANGE: 3.0,
        FOLLOW_SPEED: 1.5,
        XP_REWARD: 10, 
        PNS_HEALTH: 500 
    },
    GAMEPLAY: {
        CLASSIC_MODE_WIN_REWARD: 100,
        KILL_REWARD_GOLD: 5
    }
};

// Data Toko
export const skinShopItems = [
    { id: 'blueThunder', name: 'Blue Thunder Effect', price: 250, description: 'Serangan mengeluarkan efek petir biru.', type: 'attack_effect' },
    { id: 'boom', name: 'Boom Effect', price: 200, description: 'Serangan mengeluarkan efek ledakan acak.', type: 'attack_effect' },
    { id: 'aura', name: 'Aura Memancing', price: 400, description: 'Karakter diselimuti aura kuning.', type: 'aura' }
];

export const battleShopItems = [
    { id: 'airSerbat', name: 'Air Serbat', price: 0, description: 'Gratis! Pulihkan 50 HP. Hanya bisa diambil 1x per game.' },
    { id: 'buburAyam', name: 'Bubur Ayam', price: 20, description: 'Menggandakan (x2) kekuatan serangan selama 10 detik.' },
    { id: 'brokoli', name: 'Brokoli', price: 60, description: 'Memberi damage 2/detik ke musuh sekitar selama 10 detik.' }
];

// Data Karakter & Stage
export const characters = ['Joko', 'Riski', 'PNS'];
export const stages = ['Halaman Sekolah', 'Perumahan'];

// Data Stat Upgrade
export const statUpgradeItems = [
    { id: 'health', name: 'Kekuatan Fisik (HP)', key: 'levelHealth', bonusKey: 'maxHealthBonus', value: CONFIG.PLAYER.STATS.HEALTH.value },
    { id: 'damage', name: 'Kekuatan Serangan (DMG)', key: 'levelDamage', bonusKey: 'damageBonus', value: CONFIG.PLAYER.STATS.DAMAGE.value },
    { id: 'barrage', name: 'Damage Barrage (DMG/s)', key: 'levelBarrage', bonusKey: 'barrageDamageBonus', value: CONFIG.PLAYER.STATS.BARRAGE.value },
    { id: 'finalPunch', name: 'Damage Final Punch (DMG)', key: 'levelFinalPunch', bonusKey: 'finalPunchDamageBonus', value: CONFIG.PLAYER.STATS.FINAL_PUNCH.value },
    // [BUG 3] Stat upgrade baru
    { id: 'barrageFire', name: 'Damage Barrage Api (T)', key: 'levelBarrageFire', bonusKey: 'barrageFireDamageBonus', value: CONFIG.PLAYER.STATS.BARRAGE_FIRE.value }
];
