/*
[REFACTOR] File: world.js
...
File ini meng-import ui.js untuk memperbarui tampilan dan data.

[FIXED]
- [BUG 2] 'playSound' dipindah ke dalam 'performAttack' agar hanya berbunyi saat kena.
- [BUG 3] Menambah getter/setter untuk 'isAirSerbatTaken'
- [BUG 6] Menambahkan 'export' ke 'startStoryMode' agar main.js bisa mengimpornya.
*/

import * as THREE from 'three';
import { CONFIG } from './config.js';
import {
    UIState, GameData, screens, music, sfx, playSound, saveGameData,
    updateGoldDisplay, addXP, updateXPBar, updateMenuSelection, updateBengkelUI,
    updateStatUpgradeUI, updateEquipConfirmUI, updateCharSelection,
    updateStageSelection, updateShopSkinUI, updateBattleShopUI, updateInventoryUI,
    updateConfirmPopupUI, updateWinOptionSelection, updateLoseOptionSelection,
    showNotification, healthBarElement, enemyCountElement, getGameState,
    setGameStateValue, setCurrentGameMode, getSelectedCharacter, getSelectedStage,
    setSelectedCharacter, setSelectedStage
} from './ui.js';

// ====================================================================
// State Gameplay (Milik 'world')
// ====================================================================

// Objek untuk Tampilan 3D
export const World = {
    scene: null,
    camera: null,
    renderer: null,
    player: null,
    enemies: [],
    npcs: [],
    clock: null,
    textureLoader: null,
    collidableObjects: [],
    visualEffects: [],
    boss: null 
};

// Variabel Gameplay
export const keys = {}; // Status tombol
let isRightMouseDown = false, previousMouseX = 0;
export let playerHealth = 100, playerMaxHealth = 100;
let cameraShake = 0;
let isAirSerbatTaken = false;
// [FIX 3] Tambahkan getter/setter untuk dipakai file lain
export function getIsAirSerbatTaken() { return isAirSerbatTaken; }
export function setIsAirSerbatTaken(value) { isAirSerbatTaken = value; }

let activeEffects = {};

// Story Mode
let storyStep = 0;

// Abilities
let abilities = {
    barrage: { active: false, startTime: 0, cooldown: CONFIG.ABILITIES.BARRAGE_COOLDOWN, lastUse: -CONFIG.ABILITIES.BARRAGE_COOLDOWN, duration: CONFIG.ABILITIES.BARRAGE_DURATION, damagePerSecond: CONFIG.ABILITIES.BARRAGE_DAMAGE_PER_SEC, nextDamageTime: 0 },
    lastPunch: { cooldown: CONFIG.ABILITIES.LAST_PUNCH_COOLDOWN, lastUse: -CONFIG.ABILITIES.LAST_PUNCH_COOLDOWN, damage: CONFIG.ABILITIES.LAST_PUNCH_DAMAGE, knockback: 25 },
    barrageFire: { active: false, startTime: 0, cooldown: CONFIG.ABILITIES.BARRAGE_FIRE_COOLDOWN, lastUse: -CONFIG.ABILITIES.BARRAGE_FIRE_COOLDOWN, duration: CONFIG.ABILITIES.BARRAGE_FIRE_DURATION, damagePerSecond: CONFIG.ABILITIES.BARRAGE_FIRE_DAMAGE_PER_SEC, nextDamageTime: 0 },
    barrier: { active: false, mesh: null, health: CONFIG.ABILITIES.BARRIER_MAX_HEALTH, maxHealth: CONFIG.ABILITIES.BARRIER_MAX_HEALTH, cooldownBeforeRegen: CONFIG.ABILITIES.BARRIER_REGEN_DELAY, lastDeactivationTime: -CONFIG.ABILITIES.BARRIER_REGEN_DELAY, regenerationRate: CONFIG.ABILITIES.BARRIER_REGEN_RATE }
};

// ====================================================================
// State Machine (Pusat Kontrol Game)
// ====================================================================
export function stopAllMusic() { Object.values(music).forEach(m => { m.pause(); m.currentTime = 0; }); }

export function setGameState(newState) {
    const oldState = getGameState(); 
    setGameStateValue(newState);
    
    Object.values(screens).forEach(s => s.classList.add('hidden'));

    const is3DState = [
        'GAMEPLAY', 'STORY_GAMEPLAY', 'CUTSCENE', 'TRANSITION', 
        'BATTLE_SHOP', 'INVENTORY', 'ITEM_CONFIRM'
    ].includes(newState);

    if (World.renderer) {
        World.renderer.domElement.style.display = is3DState ? 'block' : 'none';
    }

    switch (newState) {
        case 'START': screens.start.classList.remove('hidden'); break;
        case 'LOADING': screens.loading.classList.remove('hidden'); setTimeout(() => setGameState('MAIN_MENU'), 2000); break;
        case 'MAIN_MENU': 
            if (music.mainMenu.paused) { stopAllMusic(); music.mainMenu.play(); } 
            screens.mainMenu.classList.remove('hidden'); 
            updateMenuSelection(); 
            break;
        case 'BENGKEL': 
            screens.bengkel.classList.remove('hidden'); 
            if(music.mainMenu.paused) music.mainMenu.play(); 
            updateBengkelUI(); 
            break;
        case 'STAT_UPGRADE':
            screens.statUpgrade.classList.remove('hidden');
            if(music.mainMenu.paused) music.mainMenu.play(); 
            updateStatUpgradeUI();
            break;
        case 'EQUIP_CONFIRM': screens.bengkel.classList.remove('hidden'); screens.equipConfirm.classList.remove('hidden'); updateEquipConfirmUI(); break;
        case 'CHAR_SELECT': stopAllMusic(); screens.charSelect.classList.remove('hidden'); music.charSelect.play(); updateCharSelection(); break;
        case 'STAGE_SELECT': screens.stageSelect.classList.remove('hidden'); if (music.charSelect.paused) music.charSelect.play(); updateStageSelection(); break;
        case 'SHOP_SKIN': screens.shopSkin.classList.remove('hidden'); if (music.mainMenu.paused) music.mainMenu.play(); updateShopSkinUI(); break;
        
        case 'BATTLE_SHOP': screens.gameplay.classList.remove('hidden'); screens.battleShop.classList.remove('hidden'); updateBattleShopUI(isAirSerbatTaken); break;
        case 'INVENTORY': screens.gameplay.classList.remove('hidden'); screens.inventory.classList.remove('hidden'); updateInventoryUI(); break;
        case 'ITEM_CONFIRM': screens.gameplay.classList.remove('hidden'); screens.inventory.classList.remove('hidden'); screens.itemConfirm.classList.remove('hidden'); updateConfirmPopupUI(); break;
        
        case 'GAMEPLAY':
        case 'STORY_GAMEPLAY':
            if (!['BATTLE_SHOP', 'INVENTORY', 'ITEM_CONFIRM', 'CUTSCENE'].includes(oldState)) { 
                if (newState === 'STORY_GAMEPLAY' && music.sekolah.currentTime > 0) {
                    // Musik sudah main, jangan distop
                } else {
                    stopAllMusic(); 
                    if (getSelectedStage() === 'Halaman Sekolah') music.sekolah.play(); 
                    else music.perumahan.play(); 
                }
                
                if (oldState !== 'LOSE') {
                   initGameplay(getSelectedStage(), getSelectedCharacter(), newState === 'STORY_GAMEPLAY' ? 'story' : 'classic');
                }
            } 
            screens.gameplay.classList.remove('hidden'); 
            if (newState === 'STORY_GAMEPLAY') screens.objective.classList.remove('hidden');
            break;
        
        case 'WIN': stopAllMusic(); screens.win.classList.remove('hidden'); updateWinOptionSelection(); break;
        case 'LOSE': stopAllMusic(); screens.lose.classList.remove('hidden'); updateLoseOptionSelection(); break;
        
        case 'STORY_INTRO': screens.storyIntro.classList.remove('hidden'); break;
        case 'CUTSCENE': screens.gameplay.classList.remove('hidden'); screens.cutscene.classList.remove('hidden'); break;
        case 'TRANSITION': screens.gameplay.classList.remove('hidden'); screens.transition.classList.remove('hidden'); break;
        case 'STORY_COMPLETE': stopAllMusic(); screens.storyComplete.classList.remove('hidden'); break;
    }
}

// ====================================================================
// Inisialisasi Three.js & Gameplay
// ====================================================================
export function initThree() {
    World.scene = new THREE.Scene(); 
    World.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); 
    World.renderer = new THREE.WebGLRenderer({ antialias: true }); 
    World.renderer.setSize(window.innerWidth, window.innerHeight); 
    World.renderer.setPixelRatio(window.devicePixelRatio); 
    World.renderer.shadowMap.enabled = true; 
    document.body.appendChild(World.renderer.domElement); 
    World.clock = new THREE.Clock(); 
    World.textureLoader = new THREE.TextureLoader();
    
    document.addEventListener('mousedown', (e) => { if (e.button === 2) { isRightMouseDown = true; previousMouseX = e.clientX; } });
    document.addEventListener('mouseup', (e) => { if (e.button === 2) isRightMouseDown = false; });
    document.addEventListener('mousemove', (e) => { 
        if (isRightMouseDown && World.player) { 
            const deltaX = e.clientX - previousMouseX; 
            World.player.rotation.y -= deltaX * 0.005; // [FIX 4] Kembalikan ke -=
            previousMouseX = e.clientX; 
        } 
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    // Mulai game loop
    animate();
}

export function initGameplay(stage, char, mode = 'classic') {
    setCurrentGameMode(mode);
    while(World.scene.children.length > 0){ World.scene.remove(World.scene.children[0]); }
    World.enemies = []; World.npcs = []; World.collidableObjects = []; World.visualEffects = []; World.boss = null;
    
    const stats = CONFIG.CHAR_STATS[char] || CONFIG.CHAR_STATS['Default'];
    // [FIX 2 & 3] Bug NaN: Pastikan GameData.stats.maxHealthBonus sudah benar
    playerMaxHealth = (stats.maxHealth || CONFIG.PLAYER.DEFAULT_MAX_HEALTH) + GameData.stats.maxHealthBonus;
    playerHealth = playerMaxHealth;
    activeEffects = {}; isAirSerbatTaken = false; 
    abilities.barrier.health = abilities.barrier.maxHealth; abilities.barrier.active = false;
    updatePlayerHealth(); updateGoldDisplay(); updateXPBar();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); World.scene.add(ambientLight); 
    const dirLight = new THREE.DirectionalLight(0xffffff, 1); dirLight.position.set(50, 50, 50); dirLight.castShadow = true; World.scene.add(dirLight);
    
    World.player = createCharacterModel(char); 
    World.player.castShadow = true; 
    World.scene.add(World.player);
    if(GameData.equippedSkins.aura === 'aura'){ createPlayerAura(); }

    let groundSize, groundTexturePath, skyboxTexturePath;
    if (stage === 'Halaman Sekolah') { 
        groundSize = { w: 100, h: 200 }; 
        groundTexturePath = 'assets/HalamanSekolahP.png'; 
        skyboxTexturePath = 'assets/HalamanSekolahB.png'; 
        const buildingGeo = new THREE.BoxGeometry(80, 40, 30); 
        const buildingMat = new THREE.MeshStandardMaterial({ color: 0xcccccc }); 
        const buildingTop = new THREE.Mesh(buildingGeo, buildingMat); buildingTop.position.set(0, 20, -85); World.scene.add(buildingTop); World.collidableObjects.push(buildingTop); 
        const buildingBottom = new THREE.Mesh(buildingGeo, buildingMat); buildingBottom.position.set(0, 20, 85); World.scene.add(buildingBottom); World.collidableObjects.push(buildingBottom); 
        const fountainGroup = new THREE.Group(); 
        const fountainBaseMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3 }); 
        const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1, 32), fountainBaseMat); base.position.y = 0.5; fountainGroup.add(base); 
        const mid = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 4, 16), fountainBaseMat); mid.position.y = 2; fountainGroup.add(mid); 
        fountainGroup.position.set(0, 0, 0); World.scene.add(fountainGroup); World.collidableObjects.push(fountainGroup); 
    } else { // Perumahan
        groundSize = { w: 80, h: 250 }; 
        groundTexturePath = 'assets/PerumahanP.png'; 
        skyboxTexturePath = 'assets/PerumahanB.png'; 
        const houseGeo = new THREE.BoxGeometry(15, 10, 20); 
        const houseMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 }); 
        for(let i = -100; i < 100; i+= 40) {  
            [-1, 1].forEach(side => { 
                const house = new THREE.Mesh(houseGeo, houseMat); house.position.set(side * 30, 5, i); World.scene.add(house); World.collidableObjects.push(house); 
            }); 
        } 
    }
    const groundTexture = World.textureLoader.load(groundTexturePath); groundTexture.wrapS = THREE.RepeatWrapping; groundTexture.wrapT = THREE.RepeatWrapping; groundTexture.repeat.set(groundSize.w / 10, groundSize.h / 10);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize.w, groundSize.h), new THREE.MeshStandardMaterial({ map: groundTexture })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; World.scene.add(ground);
    const skyboxGeo = new THREE.BoxGeometry(1000, 1000, 1000); const skyboxMat = new THREE.MeshBasicMaterial({ map: World.textureLoader.load(skyboxTexturePath), side: THREE.BackSide }); World.scene.add(new THREE.Mesh(skyboxGeo, skyboxMat));

    if (mode === 'classic') {
        World.player.position.set(0, 1, 10); 
        if (stage === 'Halaman Sekolah') {
            for(let i=0; i < 10; i++){ 
                const npc = createCharacterModel(Math.random() > 0.5 ? 'Joko' : 'PNS'); 
                npc.position.set(-25 + (i * 5), 1, -50 + Math.random() * 20); 
                npc.lookAt(World.player.position); 
                World.scene.add(npc); 
                World.npcs.push(npc); 
            }
        }
        for (let i = 0; i < 20; i++) { 
            const enemy = createCharacterModel('Enemy');
            let pos; 
            do { pos = new THREE.Vector3((Math.random() - 0.5) * groundSize.w * 0.9, 1, (Math.random() - 0.5) * groundSize.h * 0.9); } 
            while (pos.distanceTo(World.player.position) < 20); 
            enemy.position.copy(pos); 
            enemy.castShadow = true; 
            enemy.userData.health = CONFIG.ENEMY.DEFAULT_HEALTH; 
            enemy.userData.maxHealth = CONFIG.ENEMY.DEFAULT_HEALTH;
            enemy.userData.attackCooldown = Math.random() * 1.5; 
            enemy.userData.lastBroccoliDamageTime = 0; 
            const healthBar = createHealthBar(); 
            healthBar.position.y = 2.0; 
            healthBar.userData.update(100); 
            enemy.add(healthBar); 
            World.scene.add(enemy); 
            World.enemies.push(enemy); 
        }
    } else if (mode === 'story') {
        storyStep = 1; // [FIX 1] Set storyStep ke 1 DI SINI
        World.player.position.set(20, 1, -65);
        
        const pns = createCharacterModel('PNS');
        pns.position.set(20, 1, -60);
        pns.lookAt(World.player.position);
        pns.userData.isBoss = true;
        pns.userData.health = CONFIG.ENEMY.PNS_HEALTH;
        pns.userData.maxHealth = CONFIG.ENEMY.PNS_HEALTH;
        pns.userData.attackCooldown = 1.0;
        const healthBar = createHealthBar(3.0, 0.3);
        healthBar.position.y = 2.5;
        healthBar.userData.update(100);
        pns.add(healthBar);
        World.scene.add(pns);
        World.npcs.push(pns);
        World.boss = pns;
        
        enemyCountElement.textContent = 1;
        document.getElementById('objective-text').textContent = "???";
    }
    
    updateEnemyCount(); 
    World.camera.position.set(0, 5, 10); 
    World.camera.lookAt(World.player.position); 
}

// ====================================================================
// Game Loop (Animate)
// ====================================================================
function animate() {
    requestAnimationFrame(animate);
    if (!World.clock || !World.renderer || !World.scene || !World.camera) return;
    
    const delta = World.clock.getDelta();
    const time = World.clock.getElapsedTime();
    const currentState = getGameState();

    if (currentState !== 'GAMEPLAY' && currentState !== 'STORY_GAMEPLAY' && currentState !== 'CUTSCENE' && currentState !== 'TRANSITION') { 
        World.renderer.render(World.scene, World.camera); 
        return; 
    }
    
    if (currentState !== 'CUTSCENE' && currentState !== 'TRANSITION') {
        updateAbilitiesUI(time);
        [World.player, ...World.enemies].forEach(char => { if(char && char.userData.actionCooldown > 0) { char.userData.actionCooldown -= delta; if(char.userData.actionCooldown <= 0 && !abilities.barrage.active && !abilities.barrageFire.active) setAnimation(char, 'idle'); } });
        
        // Player Movement
        const moveSpeed = keys['shift'] ? CONFIG.PLAYER.RUN_SPEED : CONFIG.PLAYER.MOVE_SPEED; 
        const velocity = new THREE.Vector3();
        if (keys['w']) velocity.z -= 1; if (keys['s']) velocity.z += 1; if (keys['a']) velocity.x -= 1; if (keys['d']) velocity.x += 1;
        
        if (velocity.length() > 0 && World.player.userData.actionCooldown <= 0 && !abilities.barrage.active && !abilities.barrageFire.active) { 
            setAnimation(World.player, keys['shift'] ? 'run' : 'walk'); 
            velocity.normalize().multiplyScalar(moveSpeed * delta); 
            velocity.applyQuaternion(World.player.quaternion); 
            const prevPosition = World.player.position.clone(); 
            World.player.position.add(velocity); 
            let collision = false; 
            for (const obj of World.collidableObjects) { if (new THREE.Box3().setFromObject(World.player).intersectsBox(new THREE.Box3().setFromObject(obj))) { collision = true; break; } } 
            if (collision) World.player.position.copy(prevPosition); 
        } else if (World.player.userData.actionCooldown <= 0 && !abilities.barrage.active && !abilities.barrageFire.active) { 
            setAnimation(World.player, 'idle'); 
        }

        // Enemy AI
        World.enemies.forEach(enemy => { 
            if (!enemy || enemy.userData.health <= 0) return; 
            if(enemy.userData.velocity.length() > 0.1) { enemy.position.addScaledVector(enemy.userData.velocity, delta); enemy.userData.velocity.lerp(new THREE.Vector3(), delta * 3); } 
            if (enemy.userData.actionCooldown > 0) return; 
            
            const distanceToPlayer = enemy.position.distanceTo(World.player.position); 
            enemy.lookAt(World.player.position); 
            
            if (distanceToPlayer > CONFIG.ENEMY.ATTACK_RANGE) { 
                if(enemy.userData.velocity.length() < 1) { 
                    enemy.translateZ(CONFIG.ENEMY.FOLLOW_SPEED * delta); setAnimation(enemy, 'walk'); 
                }
            } else { 
                setAnimation(enemy, 'idle'); 
                if (enemy.userData.attackCooldown <= 0) { 
                    dealDamageToPlayer(CONFIG.ENEMY.ATTACK_DAMAGE); 
                    cameraShake = 0.3; 
                    setAnimation(enemy, Math.random() > 0.5 ? 'punch' : 'kick', 0.6); 
                    enemy.userData.attackCooldown = CONFIG.ENEMY.ATTACK_COOLDOWN; 
                } 
            } 
            if (enemy.userData.attackCooldown > 0) enemy.userData.attackCooldown -= delta; 
            
            const healthBar = enemy.children.find(c => c.type === 'Sprite'); 
            if (healthBar) { 
                healthBar.quaternion.copy(World.camera.quaternion); 
                if(healthBar.userData.shakeTime > 0) { healthBar.position.x = (Math.random() - 0.5) * 0.2; healthBar.userData.shakeTime -= delta; } 
                else { healthBar.position.x = 0; } 
            } 
        });
        
        if (currentState === 'STORY_GAMEPLAY' && World.boss && World.boss.userData.health <= (CONFIG.ENEMY.PNS_HEALTH * 0.15)) {
            if (storyStep < 17) {
                storyStep = 17;
                setGameState('CUTSCENE');
                updateCutscene();
            }
        }

        // Abilities & Effects
        if (abilities.barrage.active) { 
            const elapsedTime = time - abilities.barrage.startTime; 
            if (elapsedTime > abilities.barrage.duration) { stopBarragePunch(); } 
            else { 
                createBarrageEffect(); 
                if (time >= abilities.barrage.nextDamageTime) { 
                    playSound(sfx.punch);
                    // [FIX 3] Bug NaN: Kalkulasi damage sekarang aman
                    const damage = (abilities.barrage.damagePerSecond + GameData.stats.barrageDamageBonus) * 0.1;
                    const playerDirection = new THREE.Vector3(); 
                    World.player.getWorldDirection(playerDirection); 
                    playerDirection.negate(); 
                    World.enemies.forEach(enemy => { 
                        if (enemy.userData.health <= 0) return; // [FIX 3] Cek musuh mati
                        if (World.player.position.distanceTo(enemy.position) < 4) { 
                            const enemyDirection = enemy.position.clone().sub(World.player.position).normalize(); 
                            if (playerDirection.angleTo(enemyDirection) < Math.PI / 3) { 
                                dealDamageToEnemy(enemy, damage); 
                            } 
                        } 
                    }); 
                    abilities.barrage.nextDamageTime = time + 0.1; 
                } 
            } 
        }
        if (abilities.barrageFire.active) { 
            const elapsedTime = time - abilities.barrageFire.startTime; 
            if (elapsedTime > abilities.barrageFire.duration) { stopBarrageFire(); } 
            else { 
                createBarrageFireEffect(); 
                if (time >= abilities.barrageFire.nextDamageTime) { 
                    const damage = abilities.barrageFire.damagePerSecond * 0.1;
                    const playerDirection = new THREE.Vector3(); 
                    World.player.getWorldDirection(playerDirection); 
                    playerDirection.negate(); 
                    World.enemies.forEach(enemy => { 
                        if (enemy.userData.health <= 0) return; // [FIX 3] Cek musuh mati
                        if (World.player.position.distanceTo(enemy.position) < 4) { 
                            const enemyDirection = enemy.position.clone().sub(World.player.position).normalize(); 
                            if (playerDirection.angleTo(enemyDirection) < Math.PI / 3) { 
                                dealDamageToEnemy(enemy, damage); 
                                createDamageParticles(enemy.position, 0xffa500);
                            } 
                        } 
                    }); 
                    abilities.barrageFire.nextDamageTime = time + 0.1; 
                } 
            } 
        }

        if (!abilities.barrier.active && abilities.barrier.health < abilities.barrier.maxHealth && time > abilities.barrier.lastDeactivationTime + abilities.barrier.cooldownBeforeRegen) { abilities.barrier.health = Math.min(abilities.barrier.maxHealth, abilities.barrier.health + abilities.barrier.regenerationRate * delta); }
        const activeEffectKeys = Object.keys(activeEffects); if (activeEffectKeys.length > 0) { activeEffectKeys.forEach(key => { const effect = activeEffects[key]; const effectAge = time - effect.startTime; if (effectAge >= effect.duration) { delete activeEffects[key]; } else { if (key === 'brokoli') { World.enemies.forEach(enemy => { if (World.player.position.distanceTo(enemy.position) < 5.0) { if (time - (enemy.userData.lastBroccoliDamageTime || 0) > 1.0) { dealDamageToEnemy(enemy, 2, true); enemy.userData.lastBroccoliDamageTime = time; } } }); } } }); }
    }

    updateAnimations(delta);

    World.visualEffects = World.visualEffects.filter(effect => { 
        if(!effect || !effect.mesh) return false; 
        const age = time - effect.created; 
        if (age > effect.lifetime && effect.type !== 'aura' && effect.type !== 'powerup_aura') { 
            if (effect.mesh.parent) effect.mesh.parent.remove(effect.mesh); 
            else World.scene.remove(effect.mesh); 
            return false; 
        } 
        if(effect.type === 'aura' || effect.type === 'powerup_aura'){ 
            effect.mesh.material.uniforms.time.value = time; 
            if (age > effect.lifetime) { 
                if(effect.mesh.parent) effect.mesh.parent.remove(effect.mesh); 
                return false; 
            } 
        } else if(['timed', 'particle', 'broccoli_aura'].includes(effect.type)) { 
            effect.mesh.material.opacity = 1.0 - (age / effect.lifetime); 
        } else if(effect.type === 'explosion'){ 
            const p = age/effect.lifetime; 
            effect.mesh.scale.setScalar(effect.startSize + (effect.endSize - effect.startSize) * p); 
            effect.mesh.material.opacity = 1.0 - p; 
        } 
        if(effect.type === 'particle') { 
            effect.mesh.position.addScaledVector(effect.velocity, delta); 
        } 
        return true; 
    });
    
    if (currentState !== 'CUTSCENE' && currentState !== 'TRANSITION') {
        const cameraOffset = new THREE.Vector3(0, 5, 10); 
        cameraOffset.applyQuaternion(World.player.quaternion); 
        World.camera.position.copy(World.player.position).add(cameraOffset);
        if (cameraShake > 0) { World.camera.position.x += (Math.random() - 0.5) * 0.5; World.camera.position.y += (Math.random() - 0.5) * 0.5; cameraShake -= delta; }
        World.camera.lookAt(World.player.position);
    }

    World.renderer.render(World.scene, World.camera);
}


// ====================================================================
// Fungsi Bantuan (Pembuatan Model, Efek)
// ====================================================================
function createCharacterModel(type, enemyType = null) { 
    const group = new THREE.Group(); 
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); 
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x0000ff }); 
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac }); 
    
    if(type === 'Joko') { bodyMat.color.setHex(0xaaaaaa); }
    else if(type === 'Riski') { bodyMat.color.setHex(0x333333); }
    else if(type === 'PNS') { bodyMat.color.setHex(0xF0E68C); }
    else {
        if (enemyType === 'fast') { bodyMat.color.setHex(0x00cc00); }
        else if (enemyType === 'tank') { bodyMat.color.setHex(0x333333); pantsMat.color.setHex(0x222222); }
        else { bodyMat.color.setHex(0xcc0000); }
    }
    
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.5), bodyMat); body.position.y = 0.6; body.name = 'body'; group.add(body); 
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), skinMat); head.position.y = 1.6; head.name = 'head'; group.add(head); 
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1), pantsMat); leftLeg.position.set(-0.25, -0.5, 0); leftLeg.name = 'leftLeg'; group.add(leftLeg); 
    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1), pantsMat); rightLeg.position.set(0.25, -0.5, 0); rightLeg.name = 'rightLeg'; group.add(rightLeg); 
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.9), skinMat); leftArm.position.set(-0.65, 0.8, 0); leftArm.name = 'leftArm'; group.add(leftArm); 
    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.9), skinMat); rightArm.position.set(0.65, 0.8, 0); rightArm.name = 'rightArm'; group.add(rightArm); 
    
    group.scale.set(0.5, 0.5, 0.5); 
    group.userData.animation = { state: 'idle', time: 0 }; 
    group.userData.actionCooldown = 0; 
    group.userData.velocity = new THREE.Vector3(); 
    return group; 
}
function createHealthBar(width = 1.5, height = 0.15) { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64; const texture = new THREE.CanvasTexture(canvas); const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true })); sprite.scale.set(width, height, 1); sprite.userData.canvas = canvas; sprite.userData.texture = texture; sprite.userData.shakeTime = 0; sprite.userData.update = function(healthPercentage) { const ctx = this.canvas.getContext('2d'); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); ctx.fillStyle = '#333'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); ctx.fillStyle = healthPercentage > 50 ? 'green' : healthPercentage > 20 ? 'orange' : 'red'; ctx.fillRect(4, 4, (this.canvas.width - 8) * (healthPercentage / 100), this.canvas.height - 8); this.texture.needsUpdate = true; }; return sprite; }
function createDamageParticles(position, color = 0xff0000) { for (let i = 0; i < 10; i++) { const particle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: color, transparent: true })); particle.position.copy(position); particle.position.y += 1; particle.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3); World.visualEffects.push({mesh: particle, type: 'particle', created: World.clock.getElapsedTime(), lifetime: 1, velocity: particle.userData.velocity }); World.scene.add(particle); } }
function createPlayerAura() { const auraGeo = new THREE.SphereGeometry(1, 32, 32); const auraMat = new THREE.ShaderMaterial({ uniforms: { time: { value: 0.0 }, color: { value: new THREE.Color(0xffff00) } }, vertexShader: `varying vec3 vNormal; void main() { vNormal = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `uniform float time; uniform vec3 color; varying vec3 vNormal; void main() { float intensity = pow(0.5 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); float noise = sin(vNormal.y * 10.0 + time * 5.0) * 0.5 + 0.5; gl_FragColor = vec4(color, intensity * noise * 0.5); }`, transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending }); const aura = new THREE.Mesh(auraGeo, auraMat); aura.scale.set(1.2, 1.3, 1.2); World.player.add(aura); World.visualEffects.push({mesh: aura, type: 'aura'}); }
export function createBroccoliAura() { const auraGeo = new THREE.SphereGeometry(1, 32, 16); const auraMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2 }); const aura = new THREE.Mesh(auraGeo, auraMat); aura.scale.set(10, 10, 10); World.player.add(aura); World.visualEffects.push({mesh: aura, type: 'broccoli_aura', created: World.clock.getElapsedTime(), lifetime: 10 }); }
function createPoisonEffect(enemy) { const skullCanvas = document.createElement('canvas'); skullCanvas.width=64; skullCanvas.height=64; const ctx = skullCanvas.getContext('2d'); ctx.font = '48px Arial'; ctx.fillStyle = 'green'; ctx.fillText('☠️', 8, 48); const texture = new THREE.CanvasTexture(skullCanvas); const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true })); sprite.position.set(enemy.position.x, enemy.position.y + 2.5, enemy.position.z); World.scene.add(sprite); World.visualEffects.push({mesh: sprite, type: 'timed', created: World.clock.getElapsedTime(), lifetime: 1}); const auraGeo = new THREE.TorusGeometry(0.5, 0.1, 8, 16); const auraMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 }); const aura = new THREE.Mesh(auraGeo, auraMat); aura.rotation.x = Math.PI / 2; aura.position.copy(enemy.position); World.scene.add(aura); World.visualEffects.push({mesh: aura, type: 'timed', created: World.clock.getElapsedTime(), lifetime: 1}); }
export function createPowerupEffect() { const auraGeo = new THREE.SphereGeometry(1, 32, 32); const auraMat = new THREE.ShaderMaterial({ uniforms: { time: { value: 0.0 }, color: { value: new THREE.Color(0xff4500) } }, vertexShader: `varying vec3 vNormal; void main() { vNormal = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `uniform float time; uniform vec3 color; varying vec3 vNormal; void main() { float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); float noise = sin(vNormal.y * 8.0 + time * 6.0) * 0.5 + 0.5; gl_FragColor = vec4(color, intensity * noise * 0.6); }`, transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending }); const aura = new THREE.Mesh(auraGeo, auraMat); aura.scale.set(1.4, 1.5, 1.4); World.player.add(aura); World.visualEffects.push({mesh: aura, type: 'powerup_aura', created: World.clock.getElapsedTime(), lifetime: 10}); }
function createThunderEffect(position){ for(let i=0; i < 4; i++) { const material = new THREE.LineBasicMaterial({color: 0x00ffff, transparent: true, opacity: 0.9}); let points = [new THREE.Vector3(0, 2.0, 0)]; for(let j=0; j < 6; j++){ let last = points[points.length - 1]; points.push(new THREE.Vector3(last.x + (Math.random() - 0.5) * 1.5, last.y - Math.random() * 0.8, last.z + (Math.random() - 0.5) * 1.5)); } const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material); line.position.copy(position); World.scene.add(line); World.visualEffects.push({mesh: line, type: 'timed', lifetime: 0.25, created: World.clock.getElapsedTime()}); } }
function createExplosionEffect(position, color=0xffa500){ const explosion = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({ color: color, transparent: true })); explosion.position.copy(position); explosion.position.y += 1; World.scene.add(explosion); World.visualEffects.push({mesh: explosion, type: 'explosion', lifetime: 0.6, created: World.clock.getElapsedTime(), startSize: 0.2, endSize: 4.5 + Math.random() * 2}); }
function createBarrageEffect() { for(let i=0; i < 2; i++){ const fist = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.4), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true})); const armOffset = (i === 0 ? -0.7 : 0.7) + (Math.random() - 0.5) * 0.2; const localPos = new THREE.Vector3(armOffset, 0.8, -0.5); fist.position.copy(World.player.localToWorld(localPos)); fist.quaternion.copy(World.player.quaternion); const velocity = new THREE.Vector3(0, 0, -30); velocity.applyQuaternion(World.player.quaternion); World.visualEffects.push({mesh: fist, type: 'particle', created: World.clock.getElapsedTime(), lifetime: 0.2, velocity: velocity }); World.scene.add(fist); } }
function createBarrageFireEffect() { playSound(sfx.punch); for(let i=0; i < 3; i++){ const color = Math.random() > 0.5 ? 0xffa500 : 0xff4500; const fist = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.4), new THREE.MeshBasicMaterial({color: color, transparent: true, blending: THREE.AdditiveBlending})); const armOffset = (i % 2 === 0 ? -0.7 : 0.7) + (Math.random() - 0.5) * 0.2; const localPos = new THREE.Vector3(armOffset, 0.8, -0.5); fist.position.copy(World.player.localToWorld(localPos)); fist.quaternion.copy(World.player.quaternion); const velocity = new THREE.Vector3(0, 0, -35); velocity.applyQuaternion(World.player.quaternion); World.visualEffects.push({mesh: fist, type: 'particle', created: World.clock.getElapsedTime(), lifetime: 0.25, velocity: velocity }); World.scene.add(fist); } }

function createCrackEffect(position) { 
    const crackGeo = new THREE.PlaneGeometry(5, 5); 
    // [REFACTOR] Ganti dengan path ke aset. Pastikan Anda punya file 'assets/crack.png'
    const crackMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        alphaMap: World.textureLoader.load('assets/crack.png'), 
        transparent: true, 
        side: THREE.DoubleSide 
    }); 
    const crack = new THREE.Mesh(crackGeo, crackMat); 
    crack.position.copy(position); 
    crack.rotation.x = -Math.PI / 2; 
    crack.rotation.z = Math.random() * Math.PI * 2; 
    World.scene.add(crack); 
    World.visualEffects.push({mesh: crack, type: 'timed', created: World.clock.getElapsedTime(), lifetime: 3}); 
}

// ====================================================================
// Logika Gameplay (Serangan, Damage, Ability)
// ====================================================================
function updatePlayerHealth() { 
    healthBarElement.style.width = `${Math.max(0, (playerHealth / playerMaxHealth) * 100)}%`; 
    if (playerHealth <= 0 && (getGameState() === 'GAMEPLAY' || getGameState() === 'STORY_GAMEPLAY')) { 
        setGameState('LOSE'); 
    } 
}

export function getPlayerHealth() { return playerHealth; }
export function getPlayerMaxHealth() { return playerMaxHealth; }
export function setPlayerHealth(value) { playerHealth = value; }

export function performAttack(type) {
    // [FIX 2] Suara dipindah dari sini
    // playSound(sfx.punch); 

    const attackRange = type === 'punch' ? CONFIG.ATTACKS.PUNCH_RANGE : CONFIG.ATTACKS.KICK_RANGE; 
    let damage = (type === 'punch' ? CONFIG.ATTACKS.PUNCH_DAMAGE : CONFIG.ATTACKS.KICK_DAMAGE) + GameData.stats.damageBonus; 
    
    if (activeEffects.buburAyam) { damage *= 2; createDamageParticles(World.player.position, 0xffa500); }
    setAnimation(World.player, type === 'punch' ? 'punch' : 'kick', 0.5);
    
    const playerDirection = new THREE.Vector3();
    World.player.getWorldDirection(playerDirection);
    playerDirection.negate(); 

    let hitDetected = false; // [FIX 2] Flag untuk memastikan suara hanya main sekali

    World.enemies.forEach((enemy) => {
        if (enemy.userData.health <= 0) return; // [FIX 3] Cek musuh mati
        if (World.player.position.distanceTo(enemy.position) < attackRange) {
            const enemyDirection = enemy.position.clone().sub(World.player.position).normalize();
            if (playerDirection.angleTo(enemyDirection) < Math.PI / 2) { 
                dealDamageToEnemy(enemy, damage);
                hitDetected = true; // [FIX 2] Set flag jika kena
            }
        }
    });

    // [FIX 2] Mainkan suara HANYA JIKA flag-nya true (kena musuh)
    if (hitDetected) {
        playSound(sfx.punch);
    }
}

function dealDamageToPlayer(damage) { 
    playSound(sfx.damage);
    if (abilities.barrier.active && abilities.barrier.health > 0) { 
        abilities.barrier.health -= damage; 
        updateBarrierVisuals(); 
        if (abilities.barrier.health <= 0) { createExplosionEffect(World.player.position, 0x00BFFF); toggleBarrier(false); } 
    } else { 
        playerHealth -= damage; 
        document.getElementById('health-bar-wrapper').classList.add('shake');
        setTimeout(() => document.getElementById('health-bar-wrapper').classList.remove('shake'), 500); 
    } 
    updatePlayerHealth();
}

function dealDamageToEnemy(enemy, damage, isPoison = false) { 
    if (enemy.userData.health <= 0) return; // [FIX 3] Cek musuh mati

    enemy.userData.health -= damage; 
    
    const healthBar = enemy.children.find(c => c.type === 'Sprite'); 
    if (healthBar) { 
        const maxHealth = enemy.userData.maxHealth || CONFIG.ENEMY.DEFAULT_HEALTH;
        // [FIX 3] Pastikan health tidak NaN untuk display
        healthBar.userData.update(Math.max(0, enemy.userData.health) / maxHealth * 100); 
        healthBar.userData.shakeTime = 0.3; 
    } 
    if (isPoison) { 
        createPoisonEffect(enemy); 
    } else { 
        if (GameData.equippedSkins.attack_effect === 'blueThunder') createThunderEffect(enemy.position); 
        else if (GameData.equippedSkins.attack_effect === 'boom') createExplosionEffect(enemy.position); 
        else createDamageParticles(enemy.position); 
    } 
    
    // [FIX 3] Cek kematian sekarang akan berhasil
    if (enemy.userData.health <= 0) { 
        setTimeout(() => { 
            if (World.scene.children.includes(enemy)) { 
                World.scene.remove(enemy); 
                World.enemies = World.enemies.filter(e => e !== enemy); 
                if (getGameState() === 'GAMEPLAY') {
                    addXP(CONFIG.ENEMY.XP_REWARD);
                    GameData.playerGold += CONFIG.GAMEPLAY.KILL_REWARD_GOLD;
                    saveGameData();
                    updateGoldDisplay();
                }
                updateEnemyCount(); 
            } 
        }, 100); 
    } 
}

function updateEnemyCount(){ 
    enemyCountElement.textContent = World.enemies.length; 
    if (World.enemies.length === 0 && getGameState() === 'GAMEPLAY') {
        const reward = CONFIG.GAMEPLAY.CLASSIC_MODE_WIN_REWARD;
        GameData.playerGold += reward; 
        saveGameData(); 
        updateGoldDisplay(); 
        document.getElementById('win-reward-text').textContent = `Kamu mendapatkan ${reward} Gold!`; 
        setGameState('WIN'); 
    } 
}

// ====================================================================
// Animasi & Abilities
// ====================================================================
function setAnimation(character, state, duration = 0) { if (!character) return; character.userData.animation.state = state; character.userData.animation.time = 0; if(duration > 0) { character.userData.actionCooldown = duration; } }
function updateAnimations(delta) { 
    const allCharacters = [World.player, ...World.enemies, ...World.npcs]; 
    allCharacters.forEach(char => { 
        if (!char) return; 
        char.userData.animation.time += delta; 
        const { state, time } = char.userData.animation; 
        const body = char.getObjectByName('body'), leftLeg = char.getObjectByName('leftLeg'), rightLeg = char.getObjectByName('rightLeg'), leftArm = char.getObjectByName('leftArm'), rightArm = char.getObjectByName('rightArm'); 
        if(!body || !leftLeg || !rightLeg || !leftArm || !rightArm) return; 
        leftLeg.rotation.x=0; rightLeg.rotation.x=0; leftArm.rotation.x=0; rightArm.rotation.x=0; body.position.y=0.6; leftArm.position.z=0; rightArm.position.z=0; leftLeg.position.z=0; rightLeg.position.z=0; 
        switch(state) { 
            case 'idle': body.position.y = 0.6 + Math.sin(time * 2) * 0.05; break; 
            case 'walk': leftLeg.rotation.x = Math.sin(time * 8) * 0.5; rightLeg.rotation.x = -Math.sin(time * 8) * 0.5; leftArm.rotation.x = -Math.sin(time * 8) * 0.4; rightArm.rotation.x = Math.sin(time * 8) * 0.4; break; 
            case 'run': leftLeg.rotation.x = Math.sin(time * 15) * 0.8; rightLeg.rotation.x = -Math.sin(time * 15) * 0.8; leftArm.rotation.x = -Math.sin(time * 15) * 0.7; rightArm.rotation.x = Math.sin(time * 15) * 0.7; break; 
            case 'punch': rightArm.rotation.x = -Math.PI / 1.8; rightArm.position.z = 0.4; break; 
            case 'kick': rightLeg.rotation.x = -Math.PI / 2; rightLeg.position.z = 0.5; break; 
            case 'last_punch': body.rotation.y = Math.sin(time * 10) * 0.5; rightArm.rotation.x = -Math.PI / 1.5; rightArm.position.z = 0.6; break; 
            case 'barrage': leftArm.rotation.x = -Math.PI / 2 + Math.sin(time * 50) * 0.2; rightArm.rotation.x = -Math.PI / 2 + Math.cos(time * 50) * 0.2; leftArm.position.z = 0.4; rightArm.position.z = 0.4; break; 
        } 
    }); 
}

export function startBarragePunch() { 
    const time = World.clock.getElapsedTime(); 
    if (time < abilities.barrage.lastUse + abilities.barrage.cooldown) return; 
    abilities.barrage.active = true; 
    abilities.barrage.startTime = time; 
    abilities.barrage.nextDamageTime = time; 
    setAnimation(World.player, 'barrage'); 
}
export function stopBarragePunch() { 
    if (!abilities.barrage.active) return; 
    abilities.barrage.active = false; 
    abilities.barrage.lastUse = World.clock.getElapsedTime(); 
    setAnimation(World.player, 'idle'); 
}
export function startBarrageFire() {
    const time = World.clock.getElapsedTime(); 
    if (time < abilities.barrageFire.lastUse + abilities.barrageFire.cooldown) return; 
    abilities.barrageFire.active = true; 
    abilities.barrageFire.startTime = time; 
    abilities.barrageFire.nextDamageTime = time; 
    setAnimation(World.player, 'barrage'); 
}
export function stopBarrageFire() {
    if (!abilities.barrageFire.active) return; 
    abilities.barrageFire.active = false; 
    abilities.barrageFire.lastUse = World.clock.getElapsedTime(); 
    setAnimation(World.player, 'idle'); 
}

export function performLastPunch() { 
    const time = World.clock.getElapsedTime(); 
    if (time < abilities.lastPunch.lastUse + abilities.lastPunch.cooldown) return; 
    abilities.lastPunch.lastUse = time; 
    setAnimation(World.player, 'last_punch', 0.8); 
    playSound(sfx.punch);
    setTimeout(() => { 
        const punchPosition = World.player.position.clone(); 
        const playerDirection = new THREE.Vector3(); 
        World.player.getWorldDirection(playerDirection); 
        playerDirection.negate(); 
        createExplosionEffect(World.player.localToWorld(new THREE.Vector3(0, 1, -2)), 0xffffff); 
        createCrackEffect(World.player.position.clone().setY(0.1)); 
        // [FIX 3] Bug NaN: Kalkulasi damage sekarang aman
        const damage = abilities.lastPunch.damage + GameData.stats.finalPunchDamageBonus;
        World.enemies.forEach(enemy => { 
            if (enemy.userData.health <= 0) return; // [FIX 3] Cek musuh mati
            if (punchPosition.distanceTo(enemy.position) < 6) { 
                const enemyDirection = enemy.position.clone().sub(punchPosition).normalize(); 
                if (playerDirection.angleTo(enemyDirection) < Math.PI / 2.5) { 
                    dealDamageToEnemy(enemy, damage); 
                    const knockbackVector = enemyDirection.clone().multiplyScalar(abilities.lastPunch.knockback); 
                    enemy.userData.velocity.add(knockbackVector); 
                } 
            } 
        }); 
    }, 300); 
}

export function toggleBarrier(forceState) {
    const barrier = abilities.barrier; 
    const time = World.clock.getElapsedTime();
    const desiredState = forceState !== undefined ? forceState : !barrier.active;
    if (desiredState) {
        if (barrier.health > 0) {
            barrier.active = true;
            if (!barrier.mesh) {
                const barrierGeo = new THREE.SphereGeometry(2.0, 32, 16); 
                const barrierMat = new THREE.MeshBasicMaterial({ color: 0x00BFFF, transparent: true, opacity: 0.3 });
                barrier.mesh = new THREE.Mesh(barrierGeo, barrierMat);
            }
            World.player.add(barrier.mesh);
            updateBarrierVisuals();
        }
    } else {
        barrier.active = false;
        barrier.lastDeactivationTime = time;
        if (barrier.mesh) World.player.remove(barrier.mesh);
    }
}

function updateBarrierVisuals() { if (!abilities.barrier.active || !abilities.barrier.mesh) return; const healthPercent = abilities.barrier.health / abilities.barrier.maxHealth; const barrierColor = new THREE.Color().lerpColors(new THREE.Color(0xff4500), new THREE.Color(0x00BFFF), healthPercent); abilities.barrier.mesh.material.color.set(barrierColor); abilities.barrier.mesh.material.opacity = 0.2 + healthPercent * 0.4; abilities.barrier.mesh.material.wireframe = (healthPercent < 0.3); }

function updateAbilitiesUI(time) { 
    const barrageCD = abilities.barrage.lastUse + abilities.barrage.cooldown - time; 
    const punchCD = abilities.lastPunch.lastUse + abilities.lastPunch.cooldown - time; 
    const barrageFireCD = abilities.barrageFire.lastUse + abilities.barrageFire.cooldown - time;
    const barrier = abilities.barrier; 
    
    const barrageUI = document.getElementById('ability-barrage'); 
    const punchUI = document.getElementById('ability-lastpunch'); 
    const barrierUI = document.getElementById('ability-barrier');
    const barrageFireUI = document.getElementById('ability-barrage-fire');

    barrageUI.classList.toggle('active', abilities.barrage.active); 
    if(barrageCD > 0 && !abilities.barrage.active) { barrageUI.classList.remove('ready'); barrageUI.textContent = barrageCD.toFixed(1); } 
    else { barrageUI.classList.add('ready'); barrageUI.textContent = '3'; } 
    
    if(punchCD > 0) { punchUI.classList.remove('ready'); punchUI.textContent = punchCD.toFixed(1); } 
    else { punchUI.classList.add('ready'); punchUI.textContent = '4'; } 
    
    barrierUI.classList.toggle('active', barrier.active); 
    if(barrier.active) { barrierUI.textContent = Math.round(barrier.health); barrierUI.classList.add('ready');} 
    else { barrierUI.textContent = 'B'; barrierUI.classList.toggle('ready', barrier.health > 0); }

    if (GameData.unlockedBarrageFire) {
        barrageFireUI.classList.remove('hidden');
        barrageFireUI.classList.toggle('active', abilities.barrageFire.active); 
        if(barrageFireCD > 0 && !abilities.barrageFire.active) { barrageFireUI.classList.remove('ready'); barrageFireUI.textContent = barrageFireCD.toFixed(1); } 
        else { barrageFireUI.classList.add('ready'); barrageFireUI.textContent = 'T'; } 
    } else {
        barrageFireUI.classList.add('hidden');
    }
}

// Callback untuk item inventory
export function activateItemEffect(itemId) {
    switch(itemId) {
        case 'airSerbat': playerHealth = Math.min(playerMaxHealth, playerHealth + 50); updatePlayerHealth(); break;
        case 'buburAyam': activeEffects.buburAyam = { startTime: World.clock.getElapsedTime(), duration: 10 }; createPowerupEffect(); break;
        case 'brokoli': activeEffects.brokoli = { startTime: World.clock.getElapsedTime(), duration: 10 }; createBroccoliAura(); break;
    }
}

// ====================================================================
// Logika Story Mode
// ====================================================================
// [FIX 6] Tambahkan 'export' di sini
export function startStoryMode() {
    storyStep = 1;
    setGameState('CUTSCENE');
    updateCutscene();
}

function setCameraTarget(target, pov = 'front', zoom = 8) {
    if (!target) return;
    const offset = new THREE.Vector3();
    if (pov === 'front') { offset.set(0, 2, zoom); } 
    else if (pov === 'behind') { offset.set(0, 2, -zoom); } 
    else { offset.set(zoom, 3, zoom); }

    const targetPos = target.position.clone();
    World.camera.position.copy(targetPos).add(offset);
    World.camera.lookAt(targetPos.add(new THREE.Vector3(0, 1.5, 0)));
}

function showDialogue(speaker, text, prompt = true) {
    const speakerEl = document.getElementById('dialog-speaker');
    const textEl = document.getElementById('dialog-text');

    speakerEl.textContent = speaker;
    textEl.textContent = text;
    
    if (speaker === 'Joko') { speakerEl.style.color = '#FFFFFF'; } 
    else if (speaker === 'PNS') { speakerEl.style.color = '#FF4136'; } 
    else { speakerEl.style.color = '#AAAAAA'; }
    textEl.style.color = 'white';

    document.getElementById('dialog-prompt').style.display = prompt ? 'block' : 'none';
}

function showTransition(text, duration, nextStep) {
    setGameState('TRANSITION');
    const transText = document.getElementById('transition-text');
    transText.textContent = text;
    transText.className = 'text-4xl fade-in-text';
    screens.transition.style.opacity = '1';
    
    setTimeout(() => {
        screens.transition.style.opacity = '0';
        setTimeout(() => {
            setGameState('CUTSCENE');
            storyStep = nextStep;
            updateCutscene();
        }, 1500);
    }, duration);
}

function startBossFight() {
    World.enemies.push(World.boss);
    World.npcs = World.npcs.filter(npc => npc !== World.boss);
    document.getElementById('objective-text').textContent = "Kalahkan PNS Sang Osis!";
    setGameState('STORY_GAMEPLAY');
    World.camera.position.set(0, 5, 10);
    World.camera.lookAt(World.player.position);
}

function playBarrageCutscene() {
    setCameraTarget(World.player, 'front', 3);
    setAnimation(World.player, 'barrage');
    
    const barrageInterval = setInterval(() => {
        if (getGameState() !== 'CUTSCENE' || storyStep !== 19) {
            clearInterval(barrageInterval);
            setAnimation(World.player, 'idle');
            return;
        }
        playSound(sfx.punch);
        createDamageParticles(World.player.position, 0xffa500);
        showDialogue("Joko", "PIA PIA PIA PIA PIA PIA...", false);
    }, 100);

    setTimeout(() => {
        clearInterval(barrageInterval);
        playSound(sfx.punch);
        setAnimation(World.player, 'last_punch', 0.8); 
        createExplosionEffect(World.boss.position, 0xffffff);
        dealDamageToEnemy(World.boss, 9999);
        showDialogue("Joko", "PIAAAAA!", false);

        setTimeout(() => {
            storyStep = 20;
            setAnimation(World.player, 'idle');
            updateCutscene(true); // Maju ke step 20
        }, 1000);
    }, 4000);
}

// [FIX 1] 'nextStep' untuk maju
export function updateCutscene(nextStep = false) { 
    if (nextStep) {
        storyStep++;
    }

    const pns = World.boss;
    if (!pns || !World.player) {
        console.error("Boss or Player not found for cutscene step:", storyStep);
        return; 
    }

    switch (storyStep) {
        case 1: setCameraTarget(World.player, 'front', 5); showDialogue("Joko", "Gila, Panas banget hari Ini."); break;
        case 2: showDialogue("Joko", "Mari Pergi Ke Warung !"); break;
        case 3: showTransition("Singkat Cerita...", 2000, 4); break;
        case 4: setCameraTarget(World.player, 'front', 5); showDialogue("Joko", "Mari Minum S-T !"); break;
        case 5: setCameraTarget(pns, 'front', 5); showDialogue("PNS", "Bagi-Bagi Dong ! Masa minum Sendiri Doang !"); break;
        case 6: setCameraTarget(World.player, 'front', 5); showDialogue("Joko", "Kembalikan S-T Ku..."); break;
        case 7: setCameraTarget(pns, 'front', 7); showDialogue("PNS", "Suka-Suka Gw Lah !"); break;
        case 8: showDialogue("PNS", "Gw Itu PNS !"); break;
        case 9: showDialogue("PNS", "Pandu Nata Syahputra !"); break;
        case 10: showDialogue("PNS", "HuaHaHaHaHaHAHA !!"); break;
        case 11: showDialogue("PNS", "Lawan Gw Dulu Bar-"); break;
        case 12: setCameraTarget(World.player, 'front', 5); showDialogue("Joko", "Osis itu Mengayomi, bukan membully..."); break;
        case 13: 
            World.player.position.copy(pns.position).add(new THREE.Vector3(0, 0, 1.5));
            World.player.lookAt(pns.position);
            setCameraTarget(pns, 'behind', 4);
            showDialogue("Joko", "Benarkan , PNS ?"); 
            break;
        case 14: 
            pns.lookAt(World.player.position);
            setCameraTarget(pns, 'front', 4);
            showDialogue("PNS", "Sejak Kapan !"); 
            break;
        case 15: 
            startBossFight(); 
            break;
        case 17: setCameraTarget(World.player, 'front', 5); showDialogue("Joko", "Potong Saja Anu Mu !!!"); break;
        case 18: showDialogue("Joko", "PUNCH FIST BARRAGE !!"); break;
        case 19: playBarrageCutscene(); break;
        case 20: setCameraTarget(World.player, 'front', 5); showDialogue("Joko", "Sial Banget sih hari ini, uang habis, haus, panas, capek. Perfect !"); break;
        case 21: showTransition("Bersambung !", 2500, 22); break;
        case 22: 
            GameData.playerGold += 500;
            addXP(1000);
            GameData.unlockedBarrageFire = true;
            saveGameData();
            setGameState('STORY_COMPLETE'); 
            break;
    }
}
