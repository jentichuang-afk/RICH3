let passed = 0;
let failed = 0;

function out(msg, isError) {
    const res = document.getElementById('test-results');
    const p = document.createElement('p');
    p.textContent = msg;
    p.style.color = isError ? 'red' : 'green';
    res.appendChild(p);
    console[isError ? 'error' : 'log'](msg);
}

function assert(condition, message) {
    if (condition) {
        passed++;
        out(`✅ 通過: ${message}`, false);
    } else {
        failed++;
        out(`❌ 失敗: ${message}`, true);
    }
}

// Ensure game.js is loaded
setTimeout(() => {
    out("================ 開始執行核心邏輯自動化測試 ================", false);

    // [測試 1] 武將分配測試 (由 initGame 執行)
    assert(GAME_STATE.players[1].officers.length === 20, "劉備(P1) 應該獲得 20 名武將");
    assert(GAME_STATE.players[2].officers.length === 20, "曹操(P2) 應該獲得 20 名武將");
    assert(GAME_STATE.players[3].officers.length === 20, "孫權(P3) 應該獲得 20 名武將");

    // [測試 2] 財產移轉與破產測試
    GAME_STATE.players[1].money = 1000;
    GAME_STATE.players[2].money = 1000;
    GAME_STATE.players[1].isBankrupt = false;

    payToll(GAME_STATE.players[1], GAME_STATE.players[2], 500);
    assert(GAME_STATE.players[1].money === 500, "P1 支付 500 後資金應剩餘 500");
    assert(GAME_STATE.players[2].money === 1500, "P2 收到 500 後資金應為 1500");

    // 扣到破產
    payToll(GAME_STATE.players[1], GAME_STATE.players[2], 1000);
    assert(GAME_STATE.players[1].money === 0, "P1 的資金扣除不應低於 0");
    assert(GAME_STATE.players[2].money === 2000, "P2 應只收到對方剩下的 500 資金");
    assert(GAME_STATE.players[1].isBankrupt === true, "P1 觸發破產狀態");

    // [測試 3] 防守方 3% 加成優勢測試
    const mockAttacker = { id: 998, name: "測試攻", faction: 1, stats: { 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 } };
    const mockDefender = { id: 999, name: "測試守", faction: 2, stats: { 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 } };
    OFFICERS_DATA.push(mockAttacker, mockDefender);

    let bestTeam = getBestSiegeTeam([998], [999]);
    assert(bestTeam === null, "能力值(100)相等的情況下，受防守方 3% 加成(103)影響，攻方應無法達到勝率門檻");

    const mockAttacker2 = { id: 997, name: "測試強攻", faction: 1, stats: { 1: 103, 2: 103, 3: 103, 4: 103, 5: 103, 6: 103 } };
    OFFICERS_DATA.push(mockAttacker2);
    let bestTeam2 = getBestSiegeTeam([997], [999]);
    assert(bestTeam2 !== null && bestTeam2[0] === 997, "當攻方能力高於加成後的防守方能力時，應能成功找出攻城陣容");

    // [測試 4] 取消長安路過獎金測試
    let p3 = GAME_STATE.players[3];
    p3.money = 5000;
    p3.position = 9;
    movePlayer(p3, 2);
    assert(p3.money === 5000, "經過長安時，資金不應增加 (維持 5000)");

    out(`================ 測試完成: 成功 ${passed} 項 / 失敗 ${failed} 項 ================`, failed > 0);
}, 500);
