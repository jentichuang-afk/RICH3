(async function runFullTest() {
    const TOTAL_GAMES = 30;
    const results = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let gamesFinished = 0;

    console.log("Starting balance test for 30 games...");

    // Speed up logic
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = (fn, delay) => originalSetTimeout(fn, 1);
    window.alert = () => {};
    window.confirm = () => true;

    // Track winners by monitoring logs
    const originalLog = window.log;
    window.log = function(msg) {
        // originalLog(msg); // Optional: don't clog console
        if (msg.includes("🎉 遊戲結束！天下歸")) {
            for (let i = 1; i <= 5; i++) {
                if (msg.includes(GAME_STATE.players[i].name)) {
                    results[i]++;
                    gamesFinished++;
                    console.log(`Game ${gamesFinished} finished. Winner: ${GAME_STATE.players[i].name}`);
                    
                    if (gamesFinished < TOTAL_GAMES) {
                        // Restart game manually instead of reloading (faster)
                        restartGameInternal();
                    } else {
                        console.log("TEST FINISHED", results);
                        window.FINAL_RESULTS = results;
                    }
                    break;
                }
            }
        }
    };

    function restartGameInternal() {
        // Reset state
        GAME_STATE.gameOver = false;
        GAME_STATE.currentRound = 1;
        GAME_STATE.logs = [];
        GAME_STATE.changanOfficers = [];
        // Reset players
        for(let i=1; i<=5; i++){
            let p = GAME_STATE.players[i];
            p.money = 10000;
            p.position = 0;
            p.isBankrupt = false;
            p.officers = [];
            p.items = [];
            // Re-assign initial officers
            OFFICERS_DATA.forEach(o => {
                if(o.faction === i) p.officers.push(o.id);
            });
        }
        // Reset map
        MAP_DATA.forEach(land => {
            land.owner = null;
            land.defenders = [];
            land.development = 0;
        });
        
        // Start anew
        selectPlayerCount(5);
        startGame();
    }

    // Initial start
    selectPlayerCount(5);
    startGame();
})();
