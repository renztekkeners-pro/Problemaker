/*
[REFACTOR] File: ui.js
...
[FIXED]
- [BUG 4] Memperbaiki crash 'baseCost' di getStatCost dengan konversi nama (finalPunch -> FINAL_PUNCH)
*/

import { CONFIG, skinShopItems, battleShopItems, statUpgradeItems } from './config.js';

// ====================================================================
// Referensi Elemen UI & Audio
// ====================================================================
export const screens = { 
    start: document.getElementById('start-screen'), 
    loading: document.getElementById('loading-screen'), 
    mainMenu: document.getElementById('main-menu'), 
    charSelect: document.getElementById('char-select-screen'), 
    stageSelect: document.getElementById('stage-select-screen'), 
    gameplay: document.getElementById('gameplay-ui'), 
    win: document.getElementById('win-popup'), 
    lose: document.getElementById('lose-popup'), 
    shopSkin: document.getElementById('shop-skin-screen'), 
    battleShop: document.getElementById('battle-shop-screen'), 
    inventory: document.getElementById('inventory-screen'), 
    itemConfirm: document.getElementById('item-confirm-popup'), 
    bengkel: document.getElementById('bengkel-screen'), 
    statUpgrade: document.getElementById('stat-upgrade-screen'),
    equipConfirm: document.getElementById('equip-confirm-popup'), 
    notification: document.getElementById('notification-popup'),
    storyIntro: document.getElementById('story-intro-screen'),
    storyComplete: document.getElementById('story-complete-screen'),
    transition: document.getElementById('transition-screen'),
    cutscene: document.getElementById('cutscene-ui'),
    objective: document.getElementById('objective-ui')
};

export const music = { 
    mainMenu: document.getElementById('main-menu-music'), 
    charSelect: document.getElementById('char-select-music'), 
    sekolah: document.getElementById('halaman-sekolah-music'), 
    perumahan: document.getElementById('perumahan-music') 
};

export const sfx = {
    punch: document.getElementById('sfx-punch'),
    damage: document.getElementById('sfx-damage'),
    buy: document.getElementById('sfx-buy'),
    click: document.getElementById('sfx-click')
};

// Referensi Elemen UI Gameplay
const healthBarWrapper = document.getElementById('health-bar-wrapper');
export const healthBarElement = document.getElementById('health-bar');
export const enemyCountElement = document.getElementById('enemy-count');
const xpBarElement = document.getElementById('xp-bar');
const xpTextElement = document.getElementById('xp-text');


// ====================================================================
// State UI dan Game
// ====================================================================

// State UI (Menu, Pilihan)
export const UIState = {
    currentMenuIndex: 0,
    currentCharIndex: 0,
    currentStageIndex: 0,
    currentWinOptionIndex: 0,
    currentLoseOptionIndex: 0,
    currentShopSkinIndex: 0,
    currentBattleShopIndex: 0,
    currentInventoryIndex: 0,
    currentConfirmIndex: 0,
    currentBengkelIndex: 0,
    currentEquipConfirmIndex: 0,
    currentStatUpgradeIndex: 0
};

// Data Player yang disimpan (Save Game)
export const GameData = {
    playerGold: 0,
    purchasedSkins: {},
    equippedSkins: { attack_effect: null, aura: null },
    playerInventory: {},
    playerXP: 0,
    playerLevel: 1,
    statPoints: 0,
    stats: { // Nilai default ini akan digunakan jika tidak ada data save
        maxHealthBonus: 0,
        damageBonus: 0,
        barrageDamageBonus: 0,
        finalPunchDamageBonus: 0,
        barrageFireDamageBonus: 0, // [BUG 3] Stat baru
        levelHealth: 1, 
        levelDamage: 1,
        levelBarrage: 1,
        levelFinalPunch: 1,
        levelBarrageFire: 1 // [BUG 3] Stat baru
    },
    unlockedBarrageFire: false
};

// State Utama Game (runtime, tidak disimpan)
export let gameState = 'START';
export let currentGameMode = 'classic';
export let selectedCharacter, selectedStage;

// Getter/Setter untuk state
export function getGameState() { return gameState; }
export function setGameStateValue(newState) { gameState = newState; }
export function setCurrentGameMode(mode) { currentGameMode = mode; }
export function getCurrentGameMode() { return currentGameMode; } // [BUG 1] Export fungsi ini
export function getSelectedCharacter() { return selectedCharacter; } // [BUG 1] Export fungsi ini
export function setSelectedCharacter(char) { selectedCharacter = char; }
export function getSelectedStage() { return selectedStage; }
export function setSelectedStage(stage) { selectedStage = stage; }


// ====================================================================
// Fungsi Utility (SFX, Notifikasi)
// ====================================================================
export function playSound(sound) {
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => {}); // Jangan spam console jika user belum klik
    }
}

export function showNotification(message) { 
    const popup = screens.notification; 
    popup.textContent = message; 
    popup.classList.remove('hidden'); 
    setTimeout(() => { popup.classList.add('hidden'); }, 2000); 
}

// ====================================================================
// Fungsi Save/Load & Data
// ====================================================================
export function saveGameData() {
    localStorage.setItem('problemaker_gold', GameData.playerGold);
    localStorage.setItem('problemaker_skins', JSON.stringify(GameData.purchasedSkins));
    localStorage.setItem('problemaker_equipped', JSON.stringify(GameData.equippedSkins));
    localStorage.setItem('problemaker_inventory', JSON.stringify(GameData.playerInventory));
    localStorage.setItem('problemaker_xp', GameData.playerXP);
    localStorage.setItem('problemaker_level', GameData.playerLevel);
    localStorage.setItem('problemaker_statPoints', GameData.statPoints);
    localStorage.setItem('problemaker_stats', JSON.stringify(GameData.stats));
    localStorage.setItem('problemaker_unlockedBarrageFire', GameData.unlockedBarrageFire);
}

export function loadGameData() {
    GameData.playerGold = parseInt(localStorage.getItem('problemaker_gold')) || 0;
    GameData.purchasedSkins = JSON.parse(localStorage.getItem('problemaker_skins')) || {};
    GameData.equippedSkins = JSON.parse(localStorage.getItem('problemaker_equipped')) || { attack_effect: null, aura: null };
    GameData.playerInventory = JSON.parse(localStorage.getItem('problemaker_inventory')) || {};
    GameData.playerXP = parseInt(localStorage.getItem('problemaker_xp')) || 0;
    GameData.playerLevel = parseInt(localStorage.getItem('problemaker_level')) || 1;
    GameData.statPoints = parseInt(localStorage.getItem('problemaker_statPoints')) || 0;
    
    // [BUG 2 & 3] Bug NaN dan Stat Glitch
    // Gabungkan data save dengan data default, agar data save lama tidak error
    const defaultStats = { 
        maxHealthBonus: 0, damageBonus: 0, barrageDamageBonus: 0, finalPunchDamageBonus: 0, barrageFireDamageBonus: 0,
        levelHealth: 1, levelDamage: 1, levelBarrage: 1, levelFinalPunch: 1, levelBarrageFire: 1
    };
    const loadedStats = JSON.parse(localStorage.getItem('problemaker_stats')) || {};
    GameData.stats = { ...defaultStats, ...loadedStats }; // Data save menimpa default
    
    // Untuk testing unlock, ganti 'false' dengan 'true' di bawah ini
    GameData.unlockedBarrageFire = JSON.parse(localStorage.getItem('problemaker_unlockedBarrageFire')) || false;
    
    updateGoldDisplay();
    updateXPBar();
}

export function updateGoldDisplay() { 
    document.getElementById('gold-display-shop-skin').textContent = `Gold: ${GameData.playerGold}`; 
    document.getElementById('gold-display-shop-battle').textContent = `Gold: ${GameData.playerGold}`; 
    const gameplayDisplay = document.getElementById('gold-display-gameplay'); 
    if (gameplayDisplay) gameplayDisplay.textContent = `Gold: ${GameData.playerGold}`; 
}

// ====================================================================
// Fungsi XP & Level
// ====================================================================
export function getXPForLevel(level) {
    return 100 * level; // Kebutuhan XP meningkat per level
}

export function updateXPBar() {
    const xpNeeded = getXPForLevel(GameData.playerLevel);
    const percentage = Math.min(100, (GameData.playerXP / xpNeeded) * 100);
    xpBarElement.style.width = `${percentage}%`;
    xpTextElement.textContent = `Level ${GameData.playerLevel} (${GameData.playerXP}/${xpNeeded})`;
}

export function addXP(amount) {
    if (currentGameMode === 'story') {
         GameData.playerXP += amount;
    } else {
         GameData.playerXP += amount;
         let xpNeeded = getXPForLevel(GameData.playerLevel);
    
        while (GameData.playerXP >= xpNeeded) {
            GameData.playerLevel++;
            GameData.playerXP -= xpNeeded;
            GameData.statPoints++;
            xpNeeded = getXPForLevel(GameData.playerLevel);
            showNotification(`LEVEL UP! Kamu Level ${GameData.playerLevel}! Dapat 1 Poin Stat!`);
        }
    }

    updateXPBar();
    saveGameData();
}

// ====================================================================
// Fungsi Update Tampilan UI (Seleksi Menu)
// ====================================================================
export function updateMenuSelection() { 
    document.getElementById('menu-option-story').classList.toggle('selected', UIState.currentMenuIndex === 0); 
    document.getElementById('menu-option-play').classList.toggle('selected', UIState.currentMenuIndex === 1); 
    document.getElementById('menu-option-bengkel').classList.toggle('selected', UIState.currentMenuIndex === 2); 
    document.getElementById('menu-option-shop-skin').classList.toggle('selected', UIState.currentMenuIndex === 3); 
    document.getElementById('menu-option-exit').classList.toggle('selected', UIState.currentMenuIndex === 4); 
}
export function updateCharSelection() { 
    const isChapterComplete = GameData.unlockedBarrageFire;
    
    // [FIX 1] Logika untuk update visual Karakter
    const charElementsInfo = [
        { el: document.getElementById('char-select-0'), name: 'Joko' },
        { el: document.getElementById('char-select-1'), name: 'Riski' },
        { el: document.getElementById('char-select-2'), name: 'PNS' }
    ];

    charElementsInfo.forEach(({ el, name }, index) => {
        if (!el) return;
        const isLocked = index > 0 && !isChapterComplete; // Joko (index 0) tidak pernah locked
        
        el.classList.toggle('selected', UIState.currentCharIndex === index);
        el.classList.toggle('disabled', isLocked); // Class 'disabled' dari kode Anda sebelumnya
        
        if (isLocked) {
            // Tambahkan emoji dan teks 'Locked'
            el.innerHTML = `${name} <span class="lock-text opacity-70 ml-2">🔒 Locked</span>`; 
        } else {
            // Pastikan kembali normal jika tidak locked
            el.innerHTML = name; 
        }
    });
}
export function updateStageSelection() { 
    const isChapterComplete = GameData.unlockedBarrageFire;
    
    if (!isChapterComplete) {
        UIState.currentStageIndex = 1; // Index 1 = Perumahan
    }

    // [FIX 1] Logika untuk update visual Stage
    const stageElementsInfo = [
        { el: document.getElementById('stage-select-0'), name: 'Halaman Sekolah' },
        { el: document.getElementById('stage-select-1'), name: 'Perumahan' }
    ];

    stageElementsInfo.forEach(({ el, name }, index) => {
        if (!el) return;
        const isLocked = index === 0 && !isChapterComplete; // Halaman Sekolah (index 0) locked
        
        el.classList.toggle('selected', UIState.currentStageIndex === index);
        el.classList.toggle('disabled', isLocked); // Class 'disabled' dari kode Anda sebelumnya
        
        if (isLocked) {
            // Tambahkan emoji dan teks 'Locked'
            el.innerHTML = `${name} <span class="lock-text opacity-70 ml-2">🔒 Locked</span>`; 
        } else {
            // Pastikan kembali normal jika tidak locked
            el.innerHTML = name; 
        }
    });
}
export function updateWinOptionSelection() { document.getElementById('win-option-menu').classList.toggle('selected', UIState.currentWinOptionIndex === 0); document.getElementById('win-option-exit').classList.toggle('selected', UIState.currentWinOptionIndex === 1); }
export function updateLoseOptionSelection() { document.getElementById('lose-option-restart').classList.toggle('selected', UIState.currentLoseOptionIndex === 0); document.getElementById('lose-option-menu').classList.toggle('selected', UIState.currentLoseOptionIndex === 1); }

// ====================================================================
// Fungsi Update Tampilan UI (Toko, Bengkel, Inventory)
// ====================================================================
export function updateShopSkinUI() { 
    const container = document.getElementById('shop-skin-items-container'); 
    container.innerHTML = ''; 
    skinShopItems.forEach((item, index) => { 
        const isOwned = GameData.purchasedSkins[item.id]; 
        const itemDiv = document.createElement('div'); 
        itemDiv.className = `shop-item ${index === UIState.currentShopSkinIndex ? 'selected' : ''} ${isOwned ? 'owned' : ''}`; 
        itemDiv.innerHTML = `<div class="flex justify-between items-center"><h2 class="text-2xl">${item.name}</h2><p class="text-xl text-yellow-400">${isOwned ? 'DI BENGKEL' : `${item.price} Gold`}</p></div><p class="text-gray-400 mt-2">${item.description}</p>`; 
        container.appendChild(itemDiv); 
    }); 
    updateGoldDisplay(); 
}

export function updateBattleShopUI(isAirSerbatTaken) { 
    const container = document.getElementById('battle-shop-items-container'); 
    container.innerHTML = ''; 
    battleShopItems.forEach((item, index) => { 
        const itemDiv = document.createElement('div'); 
        let priceText = `${item.price} Gold`; 
        let itemClass = `shop-item ${index === UIState.currentBattleShopIndex ? 'selected' : ''}`; 
        if (item.id === 'airSerbat') { 
            if(isAirSerbatTaken) { priceText = 'SUDAH DIAMBIL'; itemClass += ' disabled'; } 
            else { priceText = 'GRATIS'; } 
        } 
        itemDiv.className = itemClass; 
        itemDiv.innerHTML = `<div class="flex justify-between items-center"><h2 class="text-2xl">${item.name}</h2><p class="text-xl text-yellow-400">${priceText}</p></div><p class="text-gray-400 mt-2">${item.description}</p>`; 
        container.appendChild(itemDiv); 
    }); 
    updateGoldDisplay(); 
}

export function updateInventoryUI() {
    const container = document.getElementById('inventory-items-container');
    container.innerHTML = '';
    const inventoryKeys = Object.keys(GameData.playerInventory);
    if (inventoryKeys.length === 0) {
        container.innerHTML = `<p class="text-2xl text-gray-500">Inventaris Kosong</p>`;
        return;
    }
    inventoryKeys.forEach((itemId, index) => {
        const itemData = battleShopItems.find(i => i.id === itemId);
        if (!itemData) return;
        const itemCount = GameData.playerInventory[itemId];
        const itemDiv = document.createElement('div');
        itemDiv.className = `inventory-item ${index === UIState.currentInventoryIndex ? 'selected' : ''}`;
        itemDiv.innerHTML = `
            <div class="flex justify-between items-center">
                <h2 class="text-2xl">${itemData.name}</h2>
                <p class="text-xl text-yellow-400">x${itemCount}</p>
            </div>
            <p class="text-gray-400 mt-2">${itemData.description}</p>`;
        container.appendChild(itemDiv);
    });
}

export function updateBengkelUI() {
    const container = document.getElementById('bengkel-items-container');
    container.innerHTML = '';
    document.getElementById('stat-points-count').textContent = GameData.statPoints;

    const ownedSkins = skinShopItems.filter(item => GameData.purchasedSkins[item.id]);

    if (ownedSkins.length === 0) {
        container.innerHTML = `<p class="text-2xl text-gray-500">Tidak ada skin. Beli di Skin Shop!</p>`;
        return;
    }

    ownedSkins.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        const isEquipped = GameData.equippedSkins[item.type] === item.id;
        itemDiv.className = `bengkel-item ${index === UIState.currentBengkelIndex ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}`;
        itemDiv.innerHTML = `<div class="flex justify-between items-center"><h2 class="text-2xl">${item.name}</h2><p class="text-xl text-blue-400">${isEquipped ? 'TERPASANG' : ''}</p></div>`;
        container.appendChild(itemDiv);
    });
}

function getStatCost(statItem) {
    if (!statItem || !statItem.key || !GameData.stats.hasOwnProperty(statItem.key)) {
        console.error("Error: statItem key not found in GameData.stats", statItem);
        return 9999;
    }
    const level = GameData.stats[statItem.key];
    
    // [FIX 4] Mengkonversi camelCase (finalPunch) menjadi UPPER_SNAKE_CASE (FINAL_PUNCH)
    // Ini memperbaiki bug 'Cannot read properties of undefined (reading 'baseCost')'
    const configKey = statItem.id.replace(/([A-Z])/g, '_$1').toUpperCase();
    
    // Pastikan key-nya ada sebelum diakses
    if (!CONFIG.PLAYER.STATS[configKey]) {
        console.error(`Error: Kunci stat '${configKey}' tidak ditemukan di CONFIG.PLAYER.STATS.`);
        return 9999;
    }
    
    const baseCost = CONFIG.PLAYER.STATS[configKey].baseCost;
    
    if (isNaN(level) || level === undefined) {
        console.error("Error: stat level is NaN or undefined for", statItem.id);
        return 9999;
    }
    
    return baseCost * level;
}

export function updateStatUpgradeUI() {
    const container = document.getElementById('stat-items-container');
    container.innerHTML = '';
    document.getElementById('stat-points-count-upgrade').textContent = GameData.statPoints;

    statUpgradeItems.forEach((item, index) => {
        const level = GameData.stats[item.key] || 1;
        const currentBonus = GameData.stats[item.bonusKey] || 0;
        
        // [BUG 3] Logika untuk item terkunci
        if (item.id === 'barrageFire' && !GameData.unlockedBarrageFire) {
            const itemDiv = document.createElement('div');
            itemDiv.className = `stat-item disabled ${index === UIState.currentStatUpgradeIndex ? 'selected' : ''}`; // Tetap bisa di-select
            itemDiv.innerHTML = `
                <div class="stat-info">
                    <h3>${item.name}</h3>
                    <p>Selesaikan Chapter 1 untuk membuka</p>
                </div>
            `;
            container.appendChild(itemDiv);
        } else {
            // Render item stat normal
            const cost = getStatCost(item);
            const isAffordable = GameData.statPoints >= cost;
            const itemDiv = document.createElement('div');
            itemDiv.className = `stat-item ${index === UIState.currentStatUpgradeIndex ? 'selected' : ''} ${!isAffordable ? 'disabled' : ''}`;
            itemDiv.innerHTML = `
                <div class="stat-info">
                    <h3>${item.name}</h3>
                    <p>Level: ${level} | Bonus Saat Ini: +${currentBonus}</p>
                </div>
                <div class="stat-cost">
                    <p>${cost} Poin</p>
                    <span>Upgrade ke +${currentBonus + item.value}</span>
                </div>
            `;
            container.appendChild(itemDiv);
        }
    });
}

export function updateConfirmPopupUI() { 
    const inventoryKeys = Object.keys(GameData.playerInventory); 
    const itemId = inventoryKeys[UIState.currentInventoryIndex]; 
    if (!itemId) return;
    const itemData = battleShopItems.find(i => i.id === itemId); 
    if (!itemData) return;
    document.getElementById('confirm-item-name').textContent = `Gunakan ${itemData.name}?`; 
    document.getElementById('confirm-option-yes').classList.toggle('selected', UIState.currentConfirmIndex === 0); 
    document.getElementById('confirm-option-no').classList.toggle('selected', UIState.currentConfirmIndex === 1); 
}
export function updateEquipConfirmUI() { 
    const ownedSkins = skinShopItems.filter(item => GameData.purchasedSkins[item.id]); 
    const item = ownedSkins[UIState.currentBengkelIndex];
    if (!item) return; 
    
    const isEquipped = GameData.equippedSkins[item.type] === item.id; 
    const actionText = isEquipped ? 'Lepas' : 'Pasang'; 
    document.getElementById('equip-confirm-item-name').textContent = `${actionText} ${item.name}?`; 
    document.getElementById('equip-confirm-option-yes').classList.toggle('selected', UIState.currentEquipConfirmIndex === 0); 
    document.getElementById('equip-confirm-option-no').classList.toggle('selected', UIState.currentEquipConfirmIndex === 1); 
}

// ====================================================================
// Fungsi Aksi (Beli, Pakai, Equip)
// ====================================================================
export function buySelectedSkin() { 
    const item = skinShopItems[UIState.currentShopSkinIndex]; 
    if (!item || GameData.purchasedSkins[item.id]) return; 
    if (GameData.playerGold >= item.price) { 
        playSound(sfx.buy);
        GameData.playerGold -= item.price; 
        GameData.purchasedSkins[item.id] = true; 
        saveGameData(); 
        updateShopSkinUI(); 
    } 
}

export function buySelectedBattleItem(isAirSerbatTaken) {
    const item = battleShopItems[UIState.currentBattleShopIndex];
    if (!item) return;
    let airSerbatStatusUpdated = false;
    if (item.id === 'airSerbat') {
        if (isAirSerbatTaken) return isAirSerbatTaken;
        playSound(sfx.buy);
        GameData.playerInventory[item.id] = (GameData.playerInventory[item.id] || 0) + 1;
        airSerbatStatusUpdated = true;
    } else {
        if (GameData.playerGold >= item.price) {
            playSound(sfx.buy);
            GameData.playerGold -= item.price;
            GameData.playerInventory[item.id] = (GameData.playerInventory[item.id] || 0) + 1;
        } else { return isAirSerbatTaken; }
    }
    saveGameData();
    updateBattleShopUI(airSerbatStatusUpdated || isAirSerbatTaken);
    return airSerbatStatusUpdated || isAirSerbatTaken;
}

export function useSelectedItem(callback) {
    const inventoryKeys = Object.keys(GameData.playerInventory);
    const itemId = inventoryKeys[UIState.currentInventoryIndex];
    if (!itemId) return;

    GameData.playerInventory[itemId]--;
    if (GameData.playerInventory[itemId] <= 0) {
        delete GameData.playerInventory[itemId];
    }
    
    callback(itemId);
    
    saveGameData();
    const newKeys = Object.keys(GameData.playerInventory);
    if (UIState.currentInventoryIndex >= newKeys.length && newKeys.length > 0) {
        UIState.currentInventoryIndex = newKeys.length - 1;
    }
}

export function toggleEquipSkin() { 
    const ownedSkins = skinShopItems.filter(item => GameData.purchasedSkins[item.id]);
    const item = ownedSkins[UIState.currentBengkelIndex];
    
    if (!item) return false; 

    const isEquipped = GameData.equippedSkins[item.type] === item.id; 
    if (isEquipped) { 
        GameData.equippedSkins[item.type] = null; 
    } else { 
        if (GameData.equippedSkins[item.type] !== null) { 
            showNotification(`Lepas ${skinShopItems.find(s=>s.id === GameData.equippedSkins[item.type]).name} terlebih dahulu!`); 
            return false;
        } 
        GameData.equippedSkins[item.type] = item.id; 
    } 
    saveGameData(); 
    return true;
}

export function upgradeSelectedStat(onHealthUpgraded) {
    const item = statUpgradeItems[UIState.currentStatUpgradeIndex];

    // [BUG 3] Jangan upgrade jika item adalah barrage fire dan belum unlock
    if (item.id === 'barrageFire' && !GameData.unlockedBarrageFire) {
        showNotification("Selesaikan Chapter 1 untuk membuka stat ini!");
        return;
    }

    const cost = getStatCost(item);

    if (GameData.statPoints < cost) {
        showNotification("Poin Stat tidak cukup!");
        return;
    }

    GameData.statPoints -= cost;
    GameData.stats[item.key]++;
    GameData.stats[item.bonusKey] += item.value;
    
    playSound(sfx.buy);
    saveGameData();

    if (item.id === 'health') {
        onHealthUpgraded(item.value);
    }

    updateStatUpgradeUI();
}
