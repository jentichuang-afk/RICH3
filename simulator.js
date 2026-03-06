const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('reset') === '1') {
    localStorage.removeItem('sim_games_played');
    localStorage.removeItem('sim_results');
    // Change URL without reload to avoid infinite reset loops
    window.history.replaceState({}, document.title, window.location.pathname);
}

let gamesPlayed = parseInt(localStorage.getItem('sim_games_played') || '0');
let results = JSON.parse(localStorage.getItem('sim_results') || '{"Liu":0,"Cao":0,"Sun":0,"Dong":0}');
const MAX_GAMES = 30;

if (gamesPlayed >= MAX_GAMES) {
    window.addEventListener('load', () => {
        document.body.innerHTML = `
            <div id="sim-result" style="padding: 20px; font-size: 24px; background: white; z-index: 10000; position: absolute; top:0; left:0; width:100%; height:100%;">
                <h2 id="sim-complete-title">Simulation Complete</h2>
                <pre id="sim-final-data">${JSON.stringify(results, null, 2)}</pre>
                <p>Results have been saved to sim_result.json automatically. You can close this window.</p>
            </div>
        `;
        fetch('http://localhost:8000', { method: 'POST', body: JSON.stringify(results) }).catch(e => console.log(e));
        // Clear for next manual run if needed
        localStorage.removeItem('sim_games_played');
        localStorage.removeItem('sim_results');
    });
} else {
    // Fast-forward time
    const origSetTimeout = window.setTimeout;
    const origSetInterval = window.setInterval;
    window.setTimeout = function (cb, delay, ...args) { return origSetTimeout(cb, 1, ...args); };
    window.setInterval = function (cb, delay, ...args) { return origSetInterval(cb, 1, ...args); };

    window.alert = function (msg) {
        if (msg.includes('獲勝')) {
            let winnerOpts = { '劉備': 'Liu', '曹操': 'Cao', '孫權': 'Sun', '董卓': 'Dong' };
            let winnerStr = '';
            for (let name in winnerOpts) {
                if (msg.includes(name)) {
                    winnerStr = winnerOpts[name];
                    break;
                }
            }

            if (winnerStr) results[winnerStr]++;
            gamesPlayed++;

            localStorage.setItem('sim_games_played', gamesPlayed.toString());
            localStorage.setItem('sim_results', JSON.stringify(results));

            origSetTimeout(() => window.location.reload(), 200);
        }
    };

    window.addEventListener('load', () => {
        // Overlay progress
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:10px; left:10px; background:rgba(0,0,0,0.8); color:white; padding:10px; z-index:9999; font-size:20px; font-family:sans-serif; border-radius:8px;';
        overlay.innerHTML = `Running simulation <b style="color:yellow">${gamesPlayed + 1}</b> / ${MAX_GAMES}...<br><span style="font-size:14px">Wins: Liu(${results['Liu']}) Cao(${results['Cao']}) Sun(${results['Sun']}) Dong(${results['Dong']})</span>`;
        document.body.appendChild(overlay);

        // Auto start 4-player AI game by simulating UI clicks
        origSetTimeout(() => {
            const script = document.createElement('script');
            script.textContent = `
                if (typeof selectPlayerCount === 'function') {
                    selectPlayerCount(4);
                    setTimeout(() => {
                        selectFaction(1);
                        selectFaction(2);
                        selectFaction(3);
                        selectFaction(4);
                        humanFactions = []; // All bots
                        startGame();
                    }, 100);
                } else {
                    console.error('selectPlayerCount not found');
                }
            `;
            document.body.appendChild(script);
        }, 500);

        // Check for modals and game over
        const monitor = origSetInterval(() => {
            try {
                if (window.GAME_STATE && window.GAME_STATE.gameOver) {
                    // Handled by window.alert override, but fallback
                    return;
                }
                const modal = document.getElementById('modal');
                if (modal && !modal.classList.contains('hidden')) {
                    const btnYes = document.getElementById('btn-modal-yes');
                    const btnNo = document.getElementById('btn-modal-no');

                    if (btnYes && window.getComputedStyle(btnYes).display !== 'none') {
                        btnYes.click();
                    } else if (btnNo && window.getComputedStyle(btnNo).display !== 'none') {
                        btnNo.click();
                    }
                }
            } catch (e) {
                console.error("Simulator monitor error:", e);
            }
        }, 50);
    });
}
