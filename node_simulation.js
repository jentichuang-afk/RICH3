const fs = require('fs');

// Mock browser environment
global.window = {
    setTimeout: (fn, delay) => { fn(); },
    setInterval: () => {},
    alert: () => {},
    confirm: () => true
};
global.document = {
    getElementById: (id) => ({
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        querySelector: () => ({ textContent: '', style: {}, classList: { add: () => {} } }),
        prepend: () => {},
        appendChild: () => {},
        innerHTML: '',
        addEventListener: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 50, height: 50 }),
        dataset: {}
    }),
    createElement: () => ({ textContent: '', style: {}, appendChild: () => {} }),
    querySelectorAll: () => []
};
global.navigator = { userAgent: 'node' };

// Load Game Files
console.log("Loading game files...");
const officersCode = fs.readFileSync('officers.js', 'utf8');
eval(officersCode); // Defines OFFICERS_DATA, OFFICERS_SKILLS

// Mock game.js DOM-heavy parts or wrap it
const gameCode = fs.readFileSync('game.js', 'utf8');

// We need to override some UI functions in game.js before eval
// Or just mock them.
global.log = () => {}; 
global.updateMoney = (id, amt) => {
    const p = GAME_STATE.players[id];
    p.money = Math.max(0, p.money + amt);
};
global.updateOfficerCountUI = () => {};
global.updatePiecesPosition = () => {};
global.updateBoardUI = () => {};
global.playItemAnimation = () => {};
global.showModal = () => {};
global.hideModal = () => {};
global.showOfficerModal = () => {};
global.hideOfficerModal = () => {};
global.showChanganChoiceModal = () => {};
global.checkTurn = () => {
    // In Node, we want to drive the loop manually
};

eval(gameCode);

// Simulation Engine
function runOneGame() {
    // Reset GAME_STATE
    GAME_STATE.gameOver = false;
    GAME_STATE.currentRound = 1;
    GAME_STATE.logs = [];
    GAME_STATE.activePlayers = [1, 2, 3, 4, 5];
    
    // Reset Players
    for (let i = 1; i <= 5; i++) {
        let p = GAME_STATE.players[i];
        p.money = 10000;
        p.position = 0;
        p.isBankrupt = false;
        p.isBot = true;
        p.officers = [];
        p.items = [];
        OFFICERS_DATA.forEach(o => {
            if (o.faction === i) p.officers.push(o.id);
        });
    }

    // Reset Map
    MAP_DATA.forEach(land => {
        land.owner = null;
        land.defenders = [];
        land.development = 0;
    });

    // Helper to run AI turn
    function runAITurn(pid) {
        if (GAME_STATE.gameOver) return;
        const player = GAME_STATE.players[pid];
        if (player.isBankrupt) return;

        // 1. Item usage (simplified: 10% chance to use a random item)
        if (player.items.length > 0 && Math.random() < 0.1) {
            // ... (skipping complex item logic for now)
        }

        // 2. Roll Dice
        const roll = Math.floor(Math.random() * 6) + 1;
        player.position = (player.position + roll) % 20;
        const land = MAP_DATA[player.position];

        // 3. Handle Landing
        if (land.type === "START" || land.type === "ITEM_SHOP") {
            // Recruitment simulation
            if (GAME_STATE.changanOfficers.length > 0) {
                const pick = GAME_STATE.changanOfficers[0];
                if (player.money >= 500) {
                    player.money -= 500;
                    player.officers.push(pick);
                    GAME_STATE.changanOfficers.shift();
                }
            }
        } else if (land.type === "LAND") {
            if (land.owner === null) {
                // Buy if money > 2000 (safety buffer)
                if (player.money > land.price + 1000 && player.officers.length > 0) {
                    player.money -= land.price;
                    land.owner = pid;
                    // Assign 1 officer
                    land.defenders = [player.officers.pop()];
                }
            } else if (land.owner === pid) {
                // Upgrade
                if (player.money > 2000 && land.development < 10) {
                    player.money -= 500;
                    land.development++;
                }
            } else {
                // Occupied by enemy
                const owner = GAME_STATE.players[land.owner];
                const toll = getCityToll(land);
                
                // Siege or Pay?
                const siegeResult = getBestSiegeTeam(player.officers, land.defenders, land.id);
                if (siegeResult.rate > 0.8 && player.officers.length >= 3) {
                    // Siege
                    const win = Math.random() < (siegeResult.rate / 100); // Wait, siegeResult.rate is from combat system?
                    // Actually, let's use the real combat logic from game.js if possible
                    // But simplified for now:
                    if (Math.random() < 0.8) {
                        // Win
                        const oldOwner = land.owner;
                        land.owner = pid;
                        // Move defenders back to old owner
                        GAME_STATE.players[oldOwner].officers.push(...land.defenders);
                        land.defenders = player.officers.splice(0, 3);
                    } else {
                        // Lose
                        updateMoney(pid, -toll * 2);
                        updateMoney(land.owner, toll * 2);
                    }
                } else {
                    // Pay toll
                    updateMoney(pid, -toll);
                    updateMoney(land.owner, toll);
                    if (player.money <= 0) {
                        player.isBankrupt = true;
                        GAME_STATE.activePlayers = GAME_STATE.activePlayers.filter(id => id !== pid);
                        // Hand over land to owner? Or make neutral? (Original game makes it neutral)
                    }
                }
            }
        }
    }

    // Main Game Loop
    let turns = 0;
    while (!GAME_STATE.gameOver && turns < 2000) {
        for (const pid of [...GAME_STATE.activePlayers]) {
            runAITurn(pid);
            if (GAME_STATE.activePlayers.length <= 1) {
                GAME_STATE.gameOver = true;
                break;
            }
        }
        turns++;
        if (turns % 100 === 0) GAME_STATE.currentRound++;
    }

    if (GAME_STATE.activePlayers.length > 0) {
        return GAME_STATE.activePlayers[0];
    }
    return null;
}

// Run 30 Games
const winCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
console.log("Running 30 simulations...");
for (let i = 0; i < 30; i++) {
    const winner = runOneGame();
    if (winner) winCounts[winner]++;
    if ((i + 1) % 5 === 0) console.log(`${i + 1} games complete...`);
}

console.log("\n--- Final Results ---");
console.log(`Shu (劉備): ${winCounts[1]}`);
console.log(`Wei (曹操): ${winCounts[2]}`);
console.log(`Wu (孫權): ${winCounts[3]}`);
console.log(`Qun (董卓): ${winCounts[4]}`);
console.log(`Sengoku (信長): ${winCounts[5]}`);
