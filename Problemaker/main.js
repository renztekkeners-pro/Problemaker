/*
[REFACTOR] File: main.js
...
[FIXED]
- ...
- [BUG 6] Mengimpor 'startStoryMode' dan memanggilnya di 'STORY_INTRO' untuk memperbaiki game stuck.
*/

import { characters, stages, skinShopItems, battleShopItems, statUpgradeItems } from './config.js';
import {
    UIState, GameData, sfx, playSound, saveGameData, loadGameData,
    music, // [FIX 5] TAMBAHKAN INI. Ini adalah bug yang membuat Story Mode stuck.
    buySelectedSkin, updateShopSkinUI, buySelectedBattleItem, updateBattleShopUI,
    useSelectedItem, updateInventoryUI, upgradeSelectedStat, updateStatUpgradeUI,
    toggleEquipSkin, updateBengkelUI, updateMenuSelection, updateCharSelection,
    updateStageSelection, updateWinOptionSelection, updateLoseOptionSelection,
    getGameState, setSelectedCharacter, setSelectedStage, updateEquipConfirmUI,
    updateConfirmPopupUI,
    getSelectedStage, getSelectedCharacter, 
    setCurrentGameMode, getCurrentGameMode 
} from './ui.js';

import {
    initThree, initGameplay, setGameState, stopAllMusic, keys,
    performAttack, startBarragePunch, stopBarragePunch, startBarrageFire,
    stopBarrageFire, performLastPunch, toggleBarrier, 
    startStoryMode, // [FIX 6] Impor fungsi yang benar
    updateCutscene, // updateCutscene tetap diimpor untuk tombol 'E'
    setPlayerHealth, getPlayerMaxHealth, getPlayerHealth, activateItemEffect,
    getIsAirSerbatTaken, setIsAirSerbatTaken
} from './world.js';

// ====================================================================
// Event Listener (Keyboard)
// ====================================================================
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true; 
    const currentState = getGameState();
    
    // Navigasi UI Universal
    if (['MAIN_MENU', 'BENGKEL', 'SHOP_SKIN', 'BATTLE_SHOP', 'INVENTORY', 'CHAR_SELECT', 'STAGE_SELECT', 'WIN', 'LOSE', 'STAT_UPGRADE'].includes(currentState)) {
        if (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
            playSound(sfx.click);
        }
        if (key === 'enter') {
            playSound(sfx.click);
        }
    }
    
    switch (currentState) {
        case 'START': if (key === 'enter') setGameState('LOADING'); break;
        case 'MAIN_MENU': 
            if (key === 'arrowup') UIState.currentMenuIndex = (UIState.currentMenuIndex - 1 + 5) % 5; 
            if (key === 'arrowdown') UIState.currentMenuIndex = (UIState.currentMenuIndex + 1) % 5; 
            if (key === 'enter') { 
                if (UIState.currentMenuIndex === 0) {
                    stopAllMusic(); 
                    setCurrentGameMode('story'); // [FITUR 2] Set mode
                    setGameState('STORY_INTRO');
                }
                else if (UIState.currentMenuIndex === 1) {
                    setCurrentGameMode('classic'); // [FITUR 2] Set mode
                    setGameState('CHAR_SELECT'); 
                }
                else if (UIState.currentMenuIndex === 2) setGameState('BENGKEL'); 
                else if (UIState.currentMenuIndex === 3) setGameState('SHOP_SKIN'); 
                else window.close(); 
            } 
            updateMenuSelection(); 
            break;
        case 'BENGKEL':
            const ownedSkins = skinShopItems.filter(item => GameData.purchasedSkins[item.id]);
            if (ownedSkins.length > 0) { 
                if (key === 'arrowup') UIState.currentBengkelIndex = (UIState.currentBengkelIndex - 1 + ownedSkins.length) % ownedSkins.length; 
                if (key === 'arrowdown') UIState.currentBengkelIndex = (UIState.currentBengkelIndex + 1) % ownedSkins.length; 
                if (key === 'enter') { 
                    UIState.currentEquipConfirmIndex = 0; 
                    setGameState('EQUIP_CONFIRM'); 
                } 
            } 
            if (key === 'p') { UIState.currentStatUpgradeIndex = 0; setGameState('STAT_UPGRADE'); }
            if (key === 'escape') setGameState('MAIN_MENU'); 
            updateBengkelUI(); 
            break;
        case 'STAT_UPGRADE':
            // [BUG 3] Navigasi Stat Upgrade
            const totalStats = statUpgradeItems.length;
            let currentStatIndex = UIState.currentStatUpgradeIndex;
            if (key === 'arrowup') {
                currentStatIndex = (currentStatIndex - 1 + totalStats) % totalStats;
            } else if (key === 'arrowdown') {
                currentStatIndex = (currentStatIndex + 1) % totalStats;
            }
            UIState.currentStatUpgradeIndex = currentStatIndex;

            if (key === 'enter') {
                // Cek apakah item bisa di-upgrade (bukan yang terkunci)
                const item = statUpgradeItems[UIState.currentStatUpgradeIndex];
                if (!(item.id === 'barrageFire' && !GameData.unlockedBarrageFire)) {
                    upgradeSelectedStat((healthToAdd) => {
                        // Callback ini dipanggil jika health di-upgrade
                        if(getPlayerHealth && getPlayerMaxHealth && setPlayerHealth) {
                             setPlayerHealth(Math.min(getPlayerMaxHealth(), getPlayerHealth() + healthToAdd));
                        }
                    });
                }
            }
            if (key === 'escape' || key === 'p') setGameState('BENGKEL');
            updateStatUpgradeUI();
            break;
        case 'EQUIP_CONFIRM': 
            if (key === 'arrowleft' || key === 'arrowright') UIState.currentEquipConfirmIndex = 1 - UIState.currentEquipConfirmIndex; 
            if (key === 'enter') { 
                if (UIState.currentEquipConfirmIndex === 0) { 
                    if (toggleEquipSkin()) {
                        setGameState('BENGKEL');
                    }
                } 
                else { setGameState('BENGKEL'); } 
            } 
            if (key === 'escape') setGameState('BENGKEL'); 
            updateEquipConfirmUI(); 
            break;
        case 'SHOP_SKIN': 
            if (key === 'arrowup') UIState.currentShopSkinIndex = (UIState.currentShopSkinIndex - 1 + skinShopItems.length) % skinShopItems.length; 
            if (key === 'arrowdown') UIState.currentShopSkinIndex = (UIState.currentShopSkinIndex + 1) % skinShopItems.length; 
            if (key === 'enter') buySelectedSkin(); 
            if (key === 'escape') setGameState('MAIN_MENU'); 
            updateShopSkinUI(); 
            break;
        case 'BATTLE_SHOP': 
            // [FIX 3] Logika Air Serbat
            const airSerbatTaken = getIsAirSerbatTaken(); // Ambil status dari world.js
            if (key === 'arrowup') UIState.currentBattleShopIndex = (UIState.currentBattleShopIndex - 1 + battleShopItems.length) % battleShopItems.length; 
            if (key === 'arrowdown') UIState.currentBattleShopIndex = (UIState.currentBattleShopIndex + 1) % battleShopItems.length; 
            if (key === 'enter') {
                // Kirim status saat ini, dapatkan status baru, lalu simpan status baru
                const newStatus = buySelectedBattleItem(airSerbatTaken); 
                setIsAirSerbatTaken(newStatus);
            } 
            if (key === 'escape' || key === 'h') setGameState(getCurrentGameMode() === 'story' ? 'STORY_GAMEPLAY' : 'GAMEPLAY');
            updateBattleShopUI(getIsAirSerbatTaken()); // Update UI dengan status terbaru
            break;
        case 'INVENTORY': 
            const invKeys = Object.keys(GameData.playerInventory); 
            if (invKeys.length > 0) { 
                if (key === 'arrowup') UIState.currentInventoryIndex = (UIState.currentInventoryIndex - 1 + invKeys.length) % invKeys.length; 
                if (key === 'arrowdown') UIState.currentInventoryIndex = (UIState.currentInventoryIndex + 1) % invKeys.length; 
                if (key === 'enter') { UIState.currentConfirmIndex = 0; setGameState('ITEM_CONFIRM'); } 
            } 
            if (key === 'escape' || key === 'i') setGameState(getCurrentGameMode() === 'story' ? 'STORY_GAMEPLAY' : 'GAMEPLAY');
            updateInventoryUI(); 
            break;
        case 'ITEM_CONFIRM': 
            if (key === 'arrowleft' || key === 'arrowright') UIState.currentConfirmIndex = 1 - UIState.currentConfirmIndex; 
            if (key === 'enter') { 
                if (UIState.currentConfirmIndex === 0) { 
                    useSelectedItem(activateItemEffect); 
                    setGameState(getCurrentGameMode() === 'story' ? 'STORY_GAMEPLAY' : 'GAMEPLAY');
                } 
                else { setGameState('INVENTORY'); } 
            } 
            if (key === 'escape') setGameState('INVENTORY'); 
            updateConfirmPopupUI(); 
            break;
        case 'CHAR_SELECT': 
            const isChapterComplete = GameData.unlockedBarrageFire;
            let nextCharIndex = UIState.currentCharIndex;
            if (key === 'arrowleft') nextCharIndex = Math.max(0, UIState.currentCharIndex - 1); 
            if (key === 'arrowright') nextCharIndex = Math.min(characters.length - 1, UIState.currentCharIndex + 1); 

            if (isChapterComplete || nextCharIndex === 0) { 
                UIState.currentCharIndex = nextCharIndex;
            }

            if (key === 'enter') { 
                if (isChapterComplete || UIState.currentCharIndex === 0) { 
                    setSelectedCharacter(characters[UIState.currentCharIndex]); 
                    setGameState('STAGE_SELECT'); 
                }
            } 
            updateCharSelection(); 
            break;
        case 'STAGE_SELECT': 
            const isChapterCompleteStage = GameData.unlockedBarrageFire;
            let nextStageIndex = UIState.currentStageIndex;
            if (key === 'arrowleft') nextStageIndex = Math.max(0, UIState.currentStageIndex - 1); 
            if (key === 'arrowright') nextStageIndex = Math.min(stages.length - 1, UIState.currentStageIndex + 1); 

            // Hanya bisa pindah ke Halaman Sekolah (index 0) jika chapter 1 selesai
            if (isChapterCompleteStage || nextStageIndex !== 0) {
                 UIState.currentStageIndex = nextStageIndex;
            }

            if (key === 'enter') { 
                // Hanya bisa pilih Halaman Sekolah (index 0) jika chapter 1 selesai
                if (isChapterCompleteStage || UIState.currentStageIndex !== 0) {
                    setSelectedStage(stages[UIState.currentStageIndex]); 
                    setGameState('GAMEPLAY'); 
                }
            } 
            updateStageSelection(); 
            break;
        
        case 'GAMEPLAY': 
        case 'STORY_GAMEPLAY':
            if (key === '1') performAttack('punch'); 
            if (key === '2') performAttack('kick'); 
            if (key === '3') startBarragePunch(); 
            if (key === '4') performLastPunch(); 
            if (key === 't' && GameData.unlockedBarrageFire) startBarrageFire();
            if (key === 'b') toggleBarrier(); 
            if (key === 'i') { UIState.currentInventoryIndex = 0; setGameState('INVENTORY'); } 
            if (key === 'h') { UIState.currentBattleShopIndex = 0; setGameState('BATTLE_SHOP'); }
            break;

        case 'WIN': 
            if (key === 'arrowup' || key === 'arrowleft') UIState.currentWinOptionIndex = 0; 
            if (key === 'arrowdown' || key === 'arrowright') UIState.currentWinOptionIndex = 1; 
            if (key === 'enter') { 
                if (UIState.currentWinOptionIndex === 0) { setGameState('MAIN_MENU'); } 
                else { window.close(); } 
            } 
            updateWinOptionSelection(); 
            break;
        case 'LOSE': 
            if (key === 'arrowup' || key === 'arrowleft') UIState.currentLoseOptionIndex = 0; 
            if (key === 'arrowdown' || key === 'arrowright') UIState.currentLoseOptionIndex = 1; 
            if (key === 'enter') { 
                if (UIState.currentLoseOptionIndex === 0) { 
                    setPlayerHealth(getPlayerMaxHealth()); 
                    setGameState(getCurrentGameMode() === 'story' ? 'STORY_GAMEPLAY' : 'GAMEPLAY'); // [FIX] Restart ke mode yang benar
                } else { setGameState('MAIN_MENU'); } 
            } 
            updateLoseOptionSelection(); 
            break;
        
        case 'STORY_INTRO':
            if (key === 'enter') {
                stopAllMusic();
                setSelectedCharacter('Joko');
                setSelectedStage('Halaman Sekolah');
                initGameplay(getSelectedStage(), getSelectedCharacter(), 'story'); 
                
                if (music && music.sekolah) {
                    music.sekolah.play().catch(e => console.error("Error playing story music:", e));
                }
                
                // [FIX 6] Panggil 'startStoryMode()' BUKAN 'updateCutscene()'
                // updateCutscene(); // <-- INI YANG SALAH
                startStoryMode(); // <-- INI YANG BENAR
            }
            break;
        case 'CUTSCENE':
            if (key === 'e') {
                playSound(sfx.click);
                updateCutscene(true); // Kirim 'true' untuk menandakan 'next step'
            }
            break;
        case 'STORY_COMPLETE':
            if (key === 'enter') {
                stopAllMusic();
                setGameState('MAIN_MENU');
            }
            break;
    }
});

window.addEventListener('keyup', (e) => { 
    const key = e.key.toLowerCase();
    keys[key] = false; 
    if (key === '3') { stopBarragePunch(); }
    if (key === 't') { stopBarrageFire(); }
});

// ====================================================================
// Inisialisasi Game
// ====================================================================
loadGameData();
initThree(); // Fungsi ini juga memulai animate() loop
setGameState('START');
