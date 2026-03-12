/**
 * 三國大富翁 - 核心邏輯
 * 安全性注意:
 * - 狀態完全存放於記憶體變數中，不依賴 DOM 的 textContent 來計算金額
 * - 增加 parseInt() 確保運算安全，預防 XSS 及型別錯誤
 */

// Fallback: 如果 items.js 未能載入，此處提供備用資料
if (typeof ITEMS_DATA === 'undefined') {
    var ITEMS_DATA = {
        1: { id: 1, name: "瞞天過海", price: 1000, desc: "使用後這個回合可以走兩次", type: "active" },
        2: { id: 2, name: "以逸待勞", price: 500, desc: "原地停留一次 (直接觸發事件)", type: "active" },
        3: { id: 3, name: "暗度陳倉", price: 1000, desc: "到達任意位置", type: "active_target_land" },
        4: { id: 4, name: "暗箭傷人", price: 1000, desc: "選定一名主公，使其能力前五名的武將中隨機三人受到 99% 傷勢", type: "active_target_player" },
        5: { id: 5, name: "臨陣磨槍", price: 1000, desc: "攻城戰時可選用，我方全能力增加 5%", type: "active_buff" },
        6: { id: 6, name: "無懈可擊", price: 500, desc: "被動防禦，抵銷敵方對自己使用的負面計謀", type: "passive" },
        7: { id: 7, name: "迴光返照", price: 300, desc: "治療己方任意武將 (傷勢歸零)", type: "active_target_officer" }
    };
    console.warn('[Fallback] ITEMS_DATA was not loaded from items.js, using built-in fallback.');
}

// 遊戲資料模型
const GAME_STATE = {
    currentRound: 1, // Phase 70: 回合計算
    currentPlayer: 1, // 1: 劉備, 2: 曹操, 3: 孫權
    isWaitingForAction: false,
    gameOver: false,
    activePlayers: [1, 2, 3, 4], // 記錄存活玩家的 ID
    changanOfficers: [], // 流亡長安的在野武將 (Phase 15)
    // Phase 65: 擴充 items 陣列與相關 flag (actTwice, stayInPlace, siegeBuff, blockScheme)
    players: {
        1: { id: 1, name: "劉備", money: 10000, position: 0, colorClass: 'p1', nameClass: 'p1-text', isBot: false, isBankrupt: false, officers: [], items: [], actTwice: false, stayInPlace: false, siegeBuff: false, blockScheme: false },
        2: { id: 2, name: "曹操", money: 10000, position: 0, colorClass: 'p2', nameClass: 'p2-text', isBot: false, isBankrupt: false, officers: [], items: [], actTwice: false, stayInPlace: false, siegeBuff: false, blockScheme: false },
        3: { id: 3, name: "孫權", money: 10000, position: 0, colorClass: 'p3', nameClass: 'p3-text', isBot: false, isBankrupt: false, officers: [], items: [], actTwice: false, stayInPlace: false, siegeBuff: false, blockScheme: false },
        4: { id: 4, name: "董卓", money: 10000, position: 0, colorClass: 'p4', nameClass: 'p4-text', isBot: false, isBankrupt: false, officers: [], items: [], actTwice: false, stayInPlace: false, siegeBuff: false, blockScheme: false }
    }
};

// Phase 66: 計算連續領地長度 (相連城池加成)
// 地圖因為長安(0)與建業(8)的隔斷，不再是完整的環狀，而是被分為左右兩段 (1~7 與 9~15)。
function getCityChainLength(playerId, cityId) {
    if (cityId === 0 || cityId === 8 || playerId == null) return 0;
    
    const visited = new Set();
    visited.add(cityId);
    
    // 往「左」搜尋 (cityId → cityId-1)
    let cur = cityId;
    while (true) {
        let next = cur - 1;
        if (next === 0 || next === 8) break; // 遇到中立城池阻斷
        if (MAP_DATA[next] && MAP_DATA[next].owner === playerId) {
            visited.add(next);
            cur = next;
        } else {
            break;
        }
    }
    
    // 往「右」搜尋 (cityId → cityId+1)
    cur = cityId;
    while (true) {
        let next = cur + 1;
        if (next === 16 || next === 0 || next === 8) break; // 遇到中立城池阻斷或出界
        if (MAP_DATA[next] && MAP_DATA[next].owner === playerId) {
            visited.add(next);
            cur = next;
        } else {
            break;
        }
    }
    
    const count = visited.size;
    // 使用者規定：單獨領地不加成
    return count > 1 ? count : 0;
}


// Phase 21: 取得戰鬥時有效的能力 (計算衰減)
function getEffectiveStat(o, statIdx) {
    let val = o.stats[statIdx];
    if (o.injuryRate > 0) {
        val = Math.floor(val * (100 - o.injuryRate) / 100);
    }
    return val;
}

// Phase 17 & 21: 戰鬥成長與受傷呈現輔助函式
function formatStatDisplay(base, current, injuryRate = 0) {
    let effective = current;
    if (injuryRate > 0) {
        effective = Math.floor(current * (100 - injuryRate) / 100);
    }
    let html = `${base}`;
    if (current > base) {
        html += ` &nbsp;<span style="color: #ff5252; font-weight: bold;">(+${current - base})</span>`;
    }
    if (injuryRate > 0) {
        html += ` <span style="color: #e57373; font-weight: bold; font-size: 0.9em;">(傷&rarr;${effective})</span>`;
    }
    return html;
}

// 地圖資料 (16格)
const MAP_DATA = [
    { id: 0, name: "長安", type: "START", price: 0, owner: null },
    { id: 1, name: "洛陽", type: "LAND", price: 2000, toll: 1000, owner: null, defenders: [] },
    { id: 2, name: "許昌", type: "LAND", price: 1800, toll: 900, owner: null, defenders: [] },
    { id: 3, name: "宛城", type: "LAND", price: 1300, toll: 650, owner: null, defenders: [] },
    { id: 4, name: "鄴城", type: "LAND", price: 1600, toll: 800, owner: null, defenders: [] },
    { id: 5, name: "下邳", type: "LAND", price: 1500, toll: 750, owner: null, defenders: [] },
    { id: 6, name: "臨淄", type: "LAND", price: 1500, toll: 750, owner: null, defenders: [] },
    { id: 7, name: "徐州", type: "LAND", price: 1500, toll: 750, owner: null, defenders: [] },
    { id: 8, name: "建業", type: "ITEM_SHOP", price: 0, owner: null }, // 中立道具店
    { id: 9, name: "廬江", type: "LAND", price: 1500, toll: 750, owner: null, defenders: [] },
    { id: 10, name: "江夏", type: "LAND", price: 1300, toll: 650, owner: null, defenders: [] },
    { id: 11, name: "襄陽", type: "LAND", price: 1800, toll: 900, owner: null, defenders: [] },
    { id: 12, name: "成都", type: "LAND", price: 2000, toll: 1000, owner: null, defenders: [] },
    { id: 13, name: "江州", type: "LAND", price: 1200, toll: 600, owner: null, defenders: [] },
    { id: 14, name: "梓潼", type: "LAND", price: 1200, toll: 600, owner: null, defenders: [] },
    { id: 15, name: "漢中", type: "LAND", price: 1100, toll: 550, owner: null, defenders: [] },
];

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// DOM 元件
const UI = {
    startScreen: document.getElementById('start-screen'),
    startScreenStage1: document.getElementById('start-screen-stage1'),
    startScreenStage2: document.getElementById('start-screen-stage2'),
    currentSelectingPlayer: document.getElementById('current-selecting-player'),

    btnRoll: document.getElementById('btn-roll'),
    dice: document.getElementById('dice'),
    p1Card: document.getElementById('p1-card'),
    p2Card: document.getElementById('p2-card'),
    p3Card: document.getElementById('p3-card'),
    p4Card: document.getElementById('p4-card'),
    p1Money: document.getElementById('p1-money'),
    p2Money: document.getElementById('p2-money'),
    p3Money: document.getElementById('p3-money'),
    p4Money: document.getElementById('p4-money'),
    currentTurnName: document.getElementById('current-turn-name'),
    logPanel: document.getElementById('log-panel'),
    pieces: {
        1: document.getElementById('piece-p1'),
        2: document.getElementById('piece-p2'),
        3: document.getElementById('piece-p3'),
        4: document.getElementById('piece-p4')
    },
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMessage: document.getElementById('modal-message'),
    btnModalYes: document.getElementById('btn-modal-yes'),
    btnModalNo: document.getElementById('btn-modal-no'),
    officerModal: document.getElementById('officer-modal'),
    officerModalTitle: document.getElementById('officer-modal-title'),
    officerModalMessage: document.getElementById('officer-modal-message'),
    officerList: document.getElementById('officer-list') || document.getElementById('officer-list-tbody'),
    btnOfficerConfirm: document.getElementById('btn-officer-confirm'),
    btnOfficerCancel: document.getElementById('btn-officer-cancel'),

    infoModal: document.getElementById('info-modal'),
    infoModalTitle: document.getElementById('info-modal-title'),
    infoModalMessage: document.getElementById('info-modal-message'),
    btnInfoClose: document.getElementById('btn-info-close'),

    // 圖鑑專用
    btnShowEncyclopedia: document.getElementById('btn-show-encyclopedia'),
    encyclopediaModal: document.getElementById('encyclopedia-modal'),
    btnEncyclopediaClose: document.getElementById('btn-encyclopedia-close'),
    encyclopediaTbody: document.getElementById('encyclopedia-tbody'),

    // 長安招募專用
    changanModal: document.getElementById('changan-modal'),
    changanOfficerList: document.getElementById('changan-officer-list'),
    btnChanganConfirm: document.getElementById('btn-changan-confirm'),
    btnChanganCancel: document.getElementById('btn-changan-cancel'),
    changanTotalCost: document.getElementById('changan-total-cost'),

    // Phase 65: 道具系統專用 UI
    btnUseItem: document.getElementById('btn-use-item'),
    changanChoiceModal: document.getElementById('changan-choice-modal'),
    btnChanganGoRecruit: document.getElementById('btn-changan-go-recruit'),
    btnChanganGoShop: document.getElementById('btn-changan-go-shop'),
    btnChanganLeave: document.getElementById('btn-changan-leave'),

    changanItemShopModal: document.getElementById('changan-item-shop-modal'),
    changanItemList: document.getElementById('changan-item-list'),
    btnChanganBuyItem: document.getElementById('btn-changan-buy-item'),
    btnChanganShopCancel: document.getElementById('btn-changan-shop-cancel'),
    changanItemCost: document.getElementById('changan-item-cost'),

    inventoryModal: document.getElementById('inventory-modal'),
    inventoryItemList: document.getElementById('inventory-item-list'),
    btnConfirmUseItem: document.getElementById('btn-confirm-use-item'),
    btnCancelInventory: document.getElementById('btn-cancel-inventory'),

    targetSelectModal: document.getElementById('target-select-modal'),
    targetSelectTitle: document.getElementById('target-select-title'),
    targetSelectMessage: document.getElementById('target-select-message'),
    targetSelectList: document.getElementById('target-select-list'),
    btnTargetConfirm: document.getElementById('btn-target-confirm'),
    btnTargetCancel: document.getElementById('btn-target-cancel'),
    
    // Phase 69: 臨陣磨槍 Siege checkbox
    siegeBuffContainer: document.getElementById('siege-buff-container'),
    useSiegeBuffCheckbox: document.getElementById('use-siege-buff-checkbox')
};

// Modal 回調函數
let modalConfirmCallback = null;
let modalCancelCallback = null;
let officerConfirmCallback = null;
let officerCancelCallback = null;
let selectedOfficers = [];
let maxSelectableOfficers = 3;

// 初始化遊戲
function initGame() {
    console.log("Game initialization started...");

    try {
        // 優先綁定核心按鈕，防止後續資料出錯導致功能全滅
        if (UI.btnRoll) UI.btnRoll.addEventListener('click', handleRollDice);
        // Phase 65: 使用道具
        if (UI.btnUseItem) UI.btnUseItem.addEventListener('click', openInventory);
        if (UI.btnShowEncyclopedia) UI.btnShowEncyclopedia.addEventListener('click', openEncyclopedia);
        if (UI.btnEncyclopediaClose) UI.btnEncyclopediaClose.addEventListener('click', () => UI.encyclopediaModal.classList.add('hidden'));

        // 分配初始武將 (強化錯誤處理)
        if (typeof OFFICERS_DATA === 'undefined') {
            throw new Error("找不到 OFFICERS_DATA，請檢查 officers.js 是否載入成功。");
        }

        OFFICERS_DATA.forEach(officer => {
            if (officer && officer.faction && GAME_STATE.players[officer.faction]) {
                GAME_STATE.players[officer.faction].officers.push(officer.id);
            } else {
                console.warn(`跳過無效武將資料或陣營:`, officer);
            }
        });

        // 綁定其餘 Modal 事件
        if (UI.btnModalYes) UI.btnModalYes.addEventListener('click', () => {
            hideModal();
            if (modalConfirmCallback) {
                const cb = modalConfirmCallback;
                modalConfirmCallback = null;
                try {
                    cb();
                } catch (e) {
                    console.error('modalConfirmCallback error:', e);
                    log(`[系統區] 確認回調錯誤: ${e.message}`);
                    GAME_STATE.isWaitingForAction = false;
                    endTurn();
                }
            }
        });


        UI.btnModalNo.addEventListener('click', () => {
            hideModal();
            if (modalCancelCallback) {
                modalCancelCallback();
                modalCancelCallback = null;
            }
        });

        UI.btnOfficerConfirm.addEventListener('click', () => {
            hideOfficerModal();
            let consumedBuff = false;
            
            // Phase 69: Consume item if checked
            if (UI.useSiegeBuffCheckbox && UI.useSiegeBuffCheckbox.checked) {
                if (currentSiegePlayer && currentSiegePlayer.items) {
                    const itemIdx = currentSiegePlayer.items.findIndex(it => it.id === 5);
                    if (itemIdx !== -1) {
                        consumeItem(currentSiegePlayer, itemIdx);
                        playItemAnimation("臨陣磨槍", currentSiegePlayer.name);
                        log(`🔥 士氣大振！${currentSiegePlayer.name} 使用了「臨陣磨槍」，全軍能力提升 5%！`);
                        consumedBuff = true;
                    }
                }
            }

            if (officerConfirmCallback) {
                officerConfirmCallback([...selectedOfficers], consumedBuff);
                officerConfirmCallback = null;
            }
        });

        UI.btnOfficerCancel.addEventListener('click', () => {
            hideOfficerModal();
            if (officerCancelCallback) {
                officerCancelCallback();
                officerCancelCallback = null;
            }
        });

        updateOfficerCountUI(1);
        updateOfficerCountUI(2);
        updateOfficerCountUI(3);
        updateOfficerCountUI(4); // Added for player 4

        UI.btnInfoClose.addEventListener('click', () => {
            UI.infoModal.classList.add('hidden');
        });

        UI.btnShowEncyclopedia.addEventListener('click', () => {
            openEncyclopedia();
        });

        UI.btnEncyclopediaClose.addEventListener('click', () => {
            UI.encyclopediaModal.classList.add('hidden');
        });

        setupEncyclopediaSort();

        if (UI.useSiegeBuffCheckbox) {
            UI.useSiegeBuffCheckbox.addEventListener('change', () => {
                if (currentSiegePlayer && window.currentDefIds) {
                    const bestTeam = getBestSiegeTeam(currentSiegePlayer.officers, window.currentDefIds, currentSiegeCityId, UI.useSiegeBuffCheckbox.checked, true);
                    if (bestTeam && bestTeam.length > 0) {
                        selectedOfficers = [...bestTeam];
                    } else {
                        selectedOfficers = [];
                    }
                    renderSiegeOfficerList();
                } else {
                    updateWinRateDisplay();
                }
            });
        }

        // 為所有地圖格子加上點擊事件 (查看情報)
        document.querySelectorAll('.cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const index = parseInt(cell.getAttribute('data-index'), 10);
                const landInfo = MAP_DATA[index];
                if (!landInfo || landInfo.type === 'START') return;

                let info = '';
                if (landInfo.owner) {
                    const owner = GAME_STATE.players[landInfo.owner];
                    info += `擁有者：${owner.name}\n過路費：$${landInfo.toll}\n\n`;
                    if (landInfo.defenders.length > 0) {
                        info += '【駐軍陣容】';
                        landInfo.defenders.forEach(id => {
                            const o = getOfficer(id);
                            if (o) {
                                let injuryStr = o.injuryRate > 0 ? ` [受傷 -${o.injuryRate}%]` : '';
                                info += `\n${o.name}${injuryStr} (武:${getEffectiveStat(o, 1)} 智:${getEffectiveStat(o, 2)} 統:${getEffectiveStat(o, 3)} 政:${getEffectiveStat(o, 4)} 魅:${getEffectiveStat(o, 5)} 運:${getEffectiveStat(o, 6)})`;
                            }
                        });
                    } else {
                        info += '(目前空無一人駐守)';
                    }
                } else {
                    info = `此城池尚未被佔領。\n佔領價格：$${landInfo.price}`;
                }

                UI.infoModalTitle.textContent = `${landInfo.name} 情報`;
                UI.infoModalMessage.textContent = info;
                UI.infoModal.classList.remove('hidden');
            });
        });

        // 等待玩家選擇人數與勢力...
        console.log("Game initialization completed successfully.");
    } catch (e) {
        console.error("Critical error in initGame:", e);
        // 若日誌尚未準備好，嘗試在 body 頂端警告
        if (UI && UI.logPanel) {
            log(`[致命錯誤] 遊戲初始化失敗: ${e.message}`);
        } else {
            alert(`遊戲初始化致命錯誤: ${e.message}`);
        }
    }
}

let selectedPlayerCount = 1;
let humanFactions = [];

function updateFactionButtons() {
    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById(`btn-faction-${i}`);
        if (btn) btn.style.display = humanFactions.includes(i) ? 'none' : 'inline-block';
    }
}

// 第一步：選擇遊玩人數
function selectPlayerCount(count) {
    selectedPlayerCount = count;
    UI.startScreenStage1.classList.add('hidden');
    UI.startScreenStage2.classList.remove('hidden');

    if (count === 4) {
        // 如果選 4 人，不需選陣營，直接 1=蜀, 2=魏, 3=吳, 4=群
        humanFactions = [1, 2, 3, 4];
        startGame();
    } else {
        UI.currentSelectingPlayer.textContent = humanFactions.length + 1;
        updateFactionButtons();
    }
}

// 第二步：選擇操作勢力
function selectFaction(factionId) {
    humanFactions.push(factionId);
    document.getElementById(`btn-faction-${factionId}`).style.display = 'none';

    if (humanFactions.length < selectedPlayerCount) {
        UI.currentSelectingPlayer.textContent = humanFactions.length + 1;
        updateFactionButtons();
    } else {
        startGame();
    }
}

// 開始遊戲初始化
function startGame() {
    UI.startScreen.classList.add('hidden');

    // 沒被人類選走的陣營，給電腦設定 (最多 4 人)
    for (let i = 1; i <= 4; i++) {
        GAME_STATE.players[i].isBot = !humanFactions.includes(i);

        // Phase 55: 開局隨機初始站位
        GAME_STATE.players[i].position = Math.floor(Math.random() * 16);

        // 如果電腦玩家（非人類），顯示其 UI 為電腦標記
        if (GAME_STATE.players[i].isBot) {
            const card = UI[`p${i}Card`];
            const strongElement = card.querySelector('.info strong');
            if (strongElement && !strongElement.textContent.includes('(電腦)')) {
                strongElement.textContent += " (電腦)";
            }
        }
    }

    // Phase 55: 隨機決定起手順序
    GAME_STATE.activePlayers = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
    GAME_STATE.currentPlayer = GAME_STATE.activePlayers[0];

    // 更新 UI 指示燈
    UI.p1Card.classList.toggle('active', GAME_STATE.currentPlayer === 1);
    UI.p2Card.classList.toggle('active', GAME_STATE.currentPlayer === 2);
    UI.p3Card.classList.toggle('active', GAME_STATE.currentPlayer === 3);
    if (UI.p4Card) UI.p4Card.classList.toggle('active', GAME_STATE.currentPlayer === 4);

    log(`遊戲開始！玩家操作：${humanFactions.map(id => GAME_STATE.players[id].name).join('、')}。`);

    // 首次排位
    setTimeout(() => updatePiecesPosition(true), 100);
    checkTurn();
}

// 日誌系統
function log(message) {
    const p = document.createElement('p');
    p.textContent = message; // 防止 XSS
    UI.logPanel.prepend(p);
}


// 檢查當前回合 (處理 AI)
function checkTurn() {
    if (GAME_STATE.gameOver) return;

    const currentPlayer = GAME_STATE.players[GAME_STATE.currentPlayer];

    // UI 控制
    enableRollButton(!currentPlayer.isBot);
    // Phase 65: 控制使用道具按鈕 (戰鬥中或動畫中不可用)
    if (UI.btnUseItem) {
        UI.btnUseItem.disabled = currentPlayer.isBot || GAME_STATE.isWaitingForAction;
    }

    if (currentPlayer.isBot) {
        log(`[電腦] 輪到 ${currentPlayer.name} 回合...`);
        // Phase 65: AI 嘗試使用道具
        handleAIItemUsage(currentPlayer);

        setTimeout(() => {
            // 防止重入：如果 AI 已經因為傳送等原因觸發了事件，不再重複擲骰
            if (GAME_STATE.isWaitingForAction) {
                console.log(`[Debug] Skipping handleRollDice for ${currentPlayer.name} - isWaitingForAction is true`);
                return;
            }
            handleRollDice();
        }, 3000); // 增加一點延遲讓玩家看清楚 AI 動作
    }
}

// Phase 65: AI 使用道具決策
function handleAIItemUsage(player) {
    if (!player.items || player.items.length === 0) return;

    // 隨機亂序檢查道具，避免 AI 永遠選第一個
    let indices = player.items.map((_, i) => i).sort(() => 0.5 - Math.random());

    for (let idx of indices) {
        const item = player.items[idx];

        if (item.id === 7) { // 迴光返照: 治療
            let targetId = null;
            const check = (id) => { let o = getOfficer(id); if (o && o.injuryRate > 50) targetId = id; };
            player.officers.forEach(check);
            if (!targetId) MAP_DATA.forEach(land => { if (land.owner === player.id) land.defenders.forEach(check); });
            if (targetId) {
                useItem(player, { ...item, index: idx }, targetId);
                return;
            }
        }

        if (item.id === 4) { // 暗箭傷人
            if (player.money > 2000 && Math.random() < 0.4) {
                let enemies = GAME_STATE.activePlayers.filter(pid => pid !== player.id && !GAME_STATE.players[pid].isBankrupt);
                if (enemies.length > 0) {
                    let targetPid = enemies[Math.floor(Math.random() * enemies.length)];
                    useItem(player, { ...item, index: idx }, GAME_STATE.players[targetPid]);
                    return;
                }
            }
        }

        if (item.id === 1 || item.id === 2 || item.id === 5) { // 瞞天過海, 以逸待勞, 臨陣磨槍
            if (Math.random() < 0.2) {
                useItem(player, { ...item, index: idx });
                return;
            }
        }

        if (item.id === 3) { // 暗度陳倉: 傳送
            if (player.money > 4000 && Math.random() < 0.1) {
                let targetCell = MAP_DATA[Math.floor(Math.random() * MAP_DATA.length)];
                useItem(player, { ...item, index: idx }, targetCell);
                return;
            }
        }
    }
}

// 擲骰子
function handleRollDice() {
    if (GAME_STATE.gameOver) return;
    if (GAME_STATE.isWaitingForAction) {
        log(`[提示] 系統正在處理對話框或動畫，請稍後再試。`);
        // 作為一種防禦機制，如果真的卡死，讓使用者有個反饋
        // 特別設計一個強行解除鎖定的 fallback:
        // 如果這個 log 連續出現，代表狀態機可能死鎖，直接釋放
        if (!window.__deadlockCounter) window.__deadlockCounter = 0;
        window.__deadlockCounter++;
        if (window.__deadlockCounter >= 3) {
            log(`[系統區] 偵測到可能卡死，強行解除等待鎖定。`);
            console.error('[Deadlock] Force clearing all modals and isWaitingForAction');
            try { hideModal(); } catch(e) {}
            try { hideOfficerModal(); } catch(e) {}
            // 安全關閉所有可能的 Modal
            try { UI.changanModal.classList.add('hidden'); } catch(e) {}
            try { UI.changanChoiceModal.classList.add('hidden'); } catch(e) {}
            try { UI.changanItemShopModal.classList.add('hidden'); } catch(e) {}
            try { UI.inventoryModal.classList.add('hidden'); } catch(e) {}
            try { UI.targetSelectModal.classList.add('hidden'); } catch(e) {}
            GAME_STATE.isWaitingForAction = false;
            window.__deadlockCounter = 0;
            enableRollButton(true);
        }
        return;
    }
    window.__deadlockCounter = 0;

    enableRollButton(false);
    UI.dice.classList.add('rolling');

    // 模擬擲骰延遲
    setTimeout(() => {
        UI.dice.classList.remove('rolling');
        const player = GAME_STATE.players[GAME_STATE.currentPlayer];

        let rollResult = Math.floor(Math.random() * 6) + 1; // 1-6

        // Phase 65: 【以逸待勞】 原地停留
        if (player.stayInPlace) {
            player.stayInPlace = false;
            rollResult = 0;
            log(`💤 【以逸待勞】！${player.name} 選擇原地休整。`);
        } else {
            log(`${player.name} 擲出了 ${rollResult} 點。`);
        }

        UI.dice.textContent = rollResult === 0 ? '💤' : DICE_FACES[rollResult - 1];

        movePlayer(player, rollResult);
    }, 600);
}

// 移動玩家格子
function movePlayer(player, steps) {
    let oldPos = player.position;
    let newPos = (oldPos + steps) % 16;

    // 已依需求取消經過起點發放 $2000 的設定

    player.position = newPos;
    updatePiecesPosition();

    // 抵達後觸發事件
    setTimeout(() => {
        triggerLandEvent(player, MAP_DATA[newPos]);
    }, 600); // 等待 CSS 動畫完成
}

// 根據玩家位置更新棋子座標 (相對於對應 cell)
function updatePiecesPosition(initial = false) {
    for (let i = 1; i <= 4; i++) {
        const p = GAME_STATE.players[i];
        const piece = UI.pieces[i];

        if (!piece) continue; // For pieces that might not be visible initially

        if (p.isBankrupt) {
            piece.style.display = 'none'; // 破產隱藏棋子
            continue;
        }

        const targetCell = document.getElementById(`cell-${p.position}`);

        if (targetCell && piece) {
            const rect = targetCell.getBoundingClientRect();
            const boardRect = document.getElementById('board').getBoundingClientRect();

            // 計算相對於 board 的中心
            let left = rect.left - boardRect.left + (rect.width / 2);
            let top = rect.top - boardRect.top + (rect.height / 2);

            piece.style.left = `${left}px`;
            piece.style.top = `${top}px`;
        }
    }
}

// 土地事件處理
function triggerLandEvent(player, landInfo) {
    if (landInfo.type === "START" || landInfo.type === "ITEM_SHOP") {
        let offeredIds = [];
        if (GAME_STATE.changanOfficers.length > 0) {
            // Phase 64: 隨機選出至多 3 名在野武將
            offeredIds = [...GAME_STATE.changanOfficers].sort(() => 0.5 - Math.random()).slice(0, 3);
        }
        
        let cityName = landInfo.type === "START" ? "長安" : "建業";
        
        if (offeredIds.length > 0) {
            log(`${player.name} 抵達了${cityName}。市集人聲鼎沸，發現了 ${offeredIds.length} 名在野武將的蹤跡與各式奇珍異寶！`);
        } else {
            log(`${player.name} 抵達了${cityName}。雖無在野武將可供招募，仍可逛逛市集購買奇珍異寶。`);
        }

        if (player.isBot) {
            handleCityMenuAI(player, offeredIds, cityName);
        } else {
            // Update modal title to reflect the city
            const modalTitle = UI.changanChoiceModal.querySelector('h3');
            if (modalTitle) modalTitle.textContent = `${cityName}行館`;
            showChanganChoiceModal(player, offeredIds);
        }
        return;
    }

    if (landInfo.owner === null) {
        // Phase 70: 前三回合所有土地免費
        let currentPrice = GAME_STATE.currentRound <= 3 ? 0 : parseInt(landInfo.price);
        // 若為 0 元，加註提示
        let priceText = currentPrice === 0 ? `免費 (前三回合)` : `$${currentPrice}`;

        // 無人土地
        if (player.money < currentPrice) {
            log(`${player.name} 停在 ${landInfo.name}，但資金不足無法佔領 (持有 $${player.money}，需要 ${priceText})。`);
            endTurn();
        } else if (player.officers && player.officers.length === 0) {
            log(`${player.name} 停在 ${landInfo.name}，但無可用武將可派駐，放棄佔領。`);
            endTurn();
        } else if (player.money >= currentPrice && player.officers.length > 0) {
            if (player.isBot) {
                try {
                    // AI 自動購買邏輯
                    log(`[追蹤] 1. 準備佔領`);
                    log(`[電腦] ${player.name} 自動佔領了 ${landInfo.name}。`);
                    // Phase 54: 強制 AI 派滿 3 名守城武將 (若兵力不足則全派)
                    let sendCount = 3;
                    sendCount = Math.min(sendCount, player.officers.length);
                    let chosen = player.officers.slice(0, sendCount);
                    log(`[追蹤] 2. SetTimeout 設定前`);
                    setTimeout(() => {
                        log(`[追蹤] 3. SetTimeout 已觸發，呼叫 executeBuyLand...`);
                        executeBuyLand(player, landInfo, chosen);
                    }, 1000);
                    log(`[追蹤] 4. SetTimeout 設定完成`);
                } catch (e) {
                    log(`[追蹤錯誤] AI買地前崩潰: ${e.message}`);
                }
            } else {
                showModal(
                    `發現無主之地：${landInfo.name}`,
                    `是否花費 ${priceText} 佔領 ${landInfo.name}？\n需派駐至少1名武將。`,
                    () => {
                        // 打開選將畫面
                        showOfficerModal(
                            `派駐守將 - ${landInfo.name}`,
                            `請選擇 1~3 名武將駐防 ${landInfo.name} (佔領花費 ${priceText})`,
                            player,
                            (selectedIds) => {
                                executeBuyLand(player, landInfo, selectedIds);
                            },
                            () => {
                                log(`${player.name} 放棄佔領 ${landInfo.name}。`);
                                endTurn();
                            },
                            false,
                            false,
                            [],
                            false,
                            landInfo.id
                        );
                    },
                    () => {
                        log(`${player.name} 放棄佔領 ${landInfo.name}。`);
                        endTurn();
                    },
                    '佔領', '放棄'
                );
            }
        } else {
            log(`${player.name} 停在 ${landInfo.name}，發生未知錯誤無法佔領 (資金: ${player.money}, 武將數: ${player.officers ? player.officers.length : 'undefined'})。`);
            endTurn();
        }
    } else if (landInfo.owner === player.id) {
        // 自己的土地
        if (player.isBot) {
            log(`${player.name} 回到自己的領地 ${landInfo.name}，軍心大振。`);
            endTurn();
        } else {
            const originalDefenders = [...landInfo.defenders];

            showModal(
                `回到領地：${landInfo.name}`,
                `${player.name} 回到自己的領地 ${landInfo.name}，軍心大振。<br>目前有 ${originalDefenders.length} 名武將駐守。<br>是否更換守城武將？`,
                () => { // 選擇更換
                    // 將守護武將暫時放回閒置清單
                    player.officers.push(...landInfo.defenders);
                    landInfo.defenders = [];
                    updateOfficerCountUI(player.id);

                    showOfficerModal(
                        `更換守將 - ${landInfo.name}`,
                        `請為 ${landInfo.name} 重新選擇 0~3 名武將駐防 (若不選將撤離所有守軍)`,
                        player,
                        (selectedIds) => { // 確認
                            landInfo.defenders = selectedIds;
                            player.officers = player.officers.filter(id => !selectedIds.includes(id));
                            updateOfficerCountUI(player.id);
                            log(`${player.name} 重新指派了 ${selectedIds.length} 名武將駐守 ${landInfo.name}。`);
                            endTurn();
                        },
                        () => { // 取消
                            landInfo.defenders = originalDefenders;
                            player.officers = player.officers.filter(id => !originalDefenders.includes(id));
                            updateOfficerCountUI(player.id);
                            log(`${player.name} 取消了更換守將。`);
                            endTurn();
                        },
                        true, // show cancel button
                        false, // isSiege
                        [], // defIds
                        true, // allowZero
                        landInfo.id
                    );
                },
                () => { // 選擇不更換
                    log(`${player.name} 決定維持 ${landInfo.name} 原有的防守佈局。`);
                    endTurn();
                },
                '更換', '不更換'
            );
        }
    } else {
        // 別人的土地
        const owner = GAME_STATE.players[landInfo.owner];
        const toll = landInfo.toll;

        // 若對方已破產則免付費並成為無主地
        if (owner.isBankrupt) {
            log(`${player.name} 來到 ${landInfo.name}，但原領主已破產。`);
            endTurn();
            return;
        }

        // Phase 41 & 45: 魅力 (95+)「名德重望」- 30% 機率不戰而退
        let eliteCharismaId = landInfo.defenders.find(id => {
            const o = getOfficer(id);
            return o && getEffectiveStat(o, 5) >= 95;
        });

        if (eliteCharismaId && Math.random() < 0.3) {
            const charmer = getOfficer(eliteCharismaId);
            log(`✨ 【名德重望】${charmer.name} 威名遠播，${player.name} 被其風采感化，決定繳費離開。`);

            // Phase 47: 魅力特技發動後體力透支，受傷增加 50%
            charmer.injuryRate = Math.min(100, charmer.injuryRate + 50);
            log(`🩸 ${charmer.name} 因為發揮特技消耗大量精神，受傷程度大幅增加！(目前健康: ${100 - charmer.injuryRate}%)`);

            // Phase 53: 播放 1 秒的「名德重望」動畫
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(156, 39, 176, 0.4); z-index: 9999;
                display: flex; justify-content: center; align-items: center;
                pointer-events: none; opacity: 0; transition: opacity 0.3s;
            `;
            overlay.innerHTML = `<h1 style="color: white; font-size: 5vw; text-shadow: 0 0 20px #e1bee7; transform: scale(0.5); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">✨ 名德重望 - ${charmer.name} ✨</h1>`;
            document.body.appendChild(overlay);

            // Trigger animation
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                overlay.querySelector('h1').style.transform = 'scale(1)';
            });

            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 500);

                // Continue original logic
                if (player.isBot) {
                    setTimeout(() => { payToll(player, owner, toll); }, 500);
                } else {
                    showModal(
                        `名德重望 - ${charmer.name}`,
                        `<div style="text-align:center;">
                            <div style="font-size: 1.2rem; color: #9c27b0; font-weight: bold; margin-bottom: 10px;">★ 名德重望 ★</div>
                            <p>${charmer.name} 的仁德之風使我軍肅然起敬，<br>不忍與其正對。僅繳納過路費 $${toll} 後離去。</p>
                            <p style="color:#d32f2f; font-size: 0.9rem; margin-top: 10px;">(※ ${charmer.name} 因發動特技消耗精神，受傷程度增加 50%)</p>
                        </div>`,
                        () => { payToll(player, owner, toll); },
                        null, "繳費離開", null
                    );
                }
            }, 1000);
            return;
        }

        log(`${player.name} 來到 ${owner.name} 的領地 ${landInfo.name}，防守兵力：${landInfo.defenders.length}將！\n可繳交軍費 $${toll} 或 發起攻城！`);

        if (player.isBot) {
            // AI 自動抉擇：計算所有可能派出的 1~3 名武將組合
            // 如果有一組陣容能在 6 個屬性中贏過對手至少 4 項 (>50% 勝率)，則發起攻城
            const bestTeam = getBestSiegeTeam(player.officers, landInfo.defenders, landInfo.id);
            if (bestTeam) {
                log(`[電腦] ${player.name} 評估勝算極高，決定發起攻城！`);
                let useBuff = false;
                const itemIdx = player.items.findIndex(it => it.id === 5);
                if (itemIdx !== -1) {
                    consumeItem(player, itemIdx);
                    playItemAnimation("臨陣磨槍", player.name);
                    log(`🔥 士氣大振！[電腦] ${player.name} 使用了「臨陣磨槍」，全軍能力提升 5%！`);
                    useBuff = true;
                }
                setTimeout(() => { executeSiege(player, landInfo, bestTeam, useBuff); }, 1500);
            } else {
                log(`[電腦] ${player.name} 評估軍力不足以攻下 ${landInfo.name}，決定繳交過路費。`);
                setTimeout(() => { payToll(player, owner, toll); }, 1500);
            }
        } else {
            const canSiege = player.officers.length > 0;

            let defInfoHtml = ''; // Changed from defInfoStr to defInfoHtml
            if (landInfo.defenders.length > 0) {
                defInfoHtml = '\n\n【防守武將】';
                landInfo.defenders.forEach(id => {
                    const o = getOfficer(id);
                    if (!o) return;

                    let skillHtml = "";
                    if (OFFICER_SKILLS[id]) {
                        const skill = OFFICER_SKILLS[id];
                        skillHtml = `<div style="font-size: 11px; margin-top: 5px; color: #ffeb3b; background: rgba(0,0,0,0.4); padding: 2px 5px; border-radius: 4px; display: inline-block;">
                            <strong>★${skill.name}★</strong>: ${skill.desc}
                        </div>`;
                    }

                    defInfoHtml += `<div style="margin-bottom: 5px;">
                        <strong>${o.name}</strong>
                        <span style="font-size:12px;">(武${formatStatDisplay(o.baseStats[1], o.stats[1])} 智${formatStatDisplay(o.baseStats[2], o.stats[2])} 統${formatStatDisplay(o.baseStats[3], o.stats[3])} 政${formatStatDisplay(o.baseStats[4], o.stats[4])} 魅${formatStatDisplay(o.baseStats[5], o.stats[5])} 運${formatStatDisplay(o.baseStats[6], o.stats[6])})</span>
                        ${skillHtml}
                    </div>`;
                });
            } else {
                defInfoHtml = '\n\n(目前空無一人駐守)';
            }

            showModal(
                `抵達 ${landInfo.name} (擁有者: ${owner.name})`,
                `過路費: $${landInfo.toll}。<br>您要支付過路費，還是發起攻城？<br>${defInfoHtml}<br>(若攻城失敗需支付雙倍 $${toll * 2})`,
                () => { payToll(player, owner, toll); },
                canSiege ? () => {
                    showOfficerModal(
                        `發起攻城 - ${landInfo.name}`,
                        `請選擇 1~3 名武將攻打 ${landInfo.name} (若失敗需付 $${toll * 2})`,
                        player,
                        (selectedIds, consumedBuff) => {
                            executeSiege(player, landInfo, selectedIds, consumedBuff);
                        },
                        () => { log(`我軍取消了進攻 ${landInfo.name} 的計畫，改為繳交軍費。`); payToll(player, owner, toll); },
                        true, // showCancelBtn
                        true, // isSiege
                        landInfo.defenders,
                        false, // allowZero
                        landInfo.id
                    );
                } : null,
                '繳交軍費', canSiege ? '發起攻城' : null
            );
        }
    }
}

// 買地與派駐守將處理
function executeBuyLand(player, landInfo, selectedIds) {
    try {
        let currentPrice = GAME_STATE.currentRound <= 3 ? 0 : parseInt(landInfo.price);
        updateMoney(player.id, -currentPrice);
        landInfo.owner = player.id;

        // 轉移武將
        landInfo.defenders = selectedIds;
        player.officers = player.officers.filter(id => id != null && !selectedIds.includes(id));
        updateOfficerCountUI(player.id);

        let priceDesc = currentPrice === 0 ? "免費" : `花費 $${currentPrice}`;
        log(`${player.name} ${priceDesc}佔領了 ${landInfo.name}！派駐 ${selectedIds.length} 名武將守城。`);

        // 更新 UI 標示
        const cell = document.getElementById(`cell-${landInfo.id}`);
        const ownerMarker = cell.querySelector('.owner-marker');
        if (player.id === 1) ownerMarker.classList.add('owner-p1');
        if (player.id === 2) ownerMarker.classList.add('owner-p2');
        if (player.id === 3) ownerMarker.classList.add('owner-p3');
        if (player.id === 4) ownerMarker.classList.add('owner-p4');

        endTurn();
    } catch (e) {
        log(`[系統區] executeBuyLand 崩潰: ${e.message}`);
        console.error("executeBuyLand error:", e);
        endTurn();
    }
}

// 計算 AI 最佳攻城陣容 (>50% 勝率)
function getBestSiegeTeam(attackerOfficerIds, defenderIds, cityId = -1, useBuff = false, forUI = false) {
    const landInfo = (cityId !== -1) ? MAP_DATA[cityId] : null;
    let bestTeam = null;
    let maxWins = forUI ? -1 : 2; // AI 在預估勝率 >= 50%（大於 49%，即贏得至少 3 項屬性）便會發起攻城，UI 則始終需要一組最佳陣容

    const defStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    defenderIds.forEach(id => {
        const o = getOfficer(id);
        if (o) for (let i = 1; i <= 6; i++) defStats[i] += getEffectiveStat(o, i);
    });

    // 套用防守方團隊特技 (這時攻城方的陣容還未知，因此針對依賴 enemyIds 的特技會先以空陣列傳入，
    // 不過由於 AI 試算時是輪詢攻方陣容，所以我們將這段移到 evaluateTeamWinRate 內動態計算)

    // 防守方基礎屬性總和已算出，特技與地理優勢加成移至 evaluateTeamWinRate 內動態計算。

    const evaluateTeamWinRate = (teamIds) => {
        let expectedWins = 0;
        let totalStats = 0;
        const atkStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        teamIds.forEach(id => {
            const o = getOfficer(id);
            if (o) {
                for (let i = 1; i <= 6; i++) {
                    let eff = getEffectiveStat(o, i);
                    atkStats[i] += eff;
                    totalStats += eff;
                }
            }
        });

        // 動態計算防守方的能力 (因為特技可能跟攻方有關)
        let currentDefStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        for (let i = 1; i <= 6; i++) currentDefStats[i] = defStats[i];
        applyTeamSkills(defenderIds, currentDefStats, teamIds);

        // 防守方 3% 能力加成 (套用完武將特技後再疊加地理優勢)
        for (let i = 1; i <= 6; i++) currentDefStats[i] = Math.ceil(currentDefStats[i] * 1.03);

        // Phase 66: 連續封地加成 (n%)
        const chainBonus = (landInfo) ? getCityChainLength(landInfo.owner, landInfo.id) : 0;
        if (chainBonus > 0) {
            for (let i = 1; i <= 6; i++) currentDefStats[i] = Math.ceil(currentDefStats[i] * (1 + chainBonus / 100));
        }

        // 套用攻方團隊特技
        applyTeamSkills(teamIds, atkStats, defenderIds);

        if (useBuff) {
            for (let i = 1; i <= 6; i++) {
                atkStats[i] = Math.ceil(atkStats[i] * 1.05);
            }
        }

        const hasLegend = [...teamIds, ...defenderIds].some(id => {
            const o = getOfficer(id);
            return o && getEffectiveStat(o, 1) >= 95;
        });

        for (let i = 1; i <= 6; i++) {
            if (atkStats[i] > currentDefStats[i]) {
                expectedWins += (hasLegend && i === 1) ? 2 : 1;
            }
        }
        return { wins: expectedWins, totalStats };
    };

    let minTotalStats = Infinity;

    const checkTeam = (team) => {
        let res = evaluateTeamWinRate(team);
        if (res.wins > maxWins || (res.wins === maxWins && res.totalStats < minTotalStats)) {
            maxWins = res.wins;
            minTotalStats = res.totalStats;
            bestTeam = team;
        }
    };

    const officers = attackerOfficerIds.filter(id => id != null);
    const n = Math.min(officers.length, 20);

    // 1 人組合
    for (let i = 0; i < n; i++) checkTeam([officers[i]]);
    // 2 人組合
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) checkTeam([officers[i], officers[j]]);
    }
    // 3 人組合
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            for (let k = j + 1; k < n; k++) checkTeam([officers[i], officers[j], officers[k]]);
        }
    }

    return bestTeam;
}

// 執行攻城結算
function executeSiege(attacker, landInfo, attackingIds, consumedBuff = false) {
    const defenderId = landInfo.owner;
    const defender = GAME_STATE.players[defenderId];
    const defendingIds = landInfo.defenders;

    // 攻城方必定扣除閒置武將
    attacker.officers = attacker.officers.filter(id => id != null && !attackingIds.includes(id));
    updateOfficerCountUI(attacker.id);

    // 電腦擲骰決定比拚項目 (若參戰武將武力 >= 95，武力機率翻倍)
    const hasLegend = [...attackingIds, ...defendingIds].some(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 1) >= 95;
    });
    const statPool = hasLegend ? [1, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
    const statRoll = statPool[Math.floor(Math.random() * statPool.length)];
    const statNames = { 1: '武力', 2: '智力', 3: '統率', 4: '政治', 5: '魅力', 6: '運氣' };
    const statName = statNames[statRoll];

    let attackerScore = 0;
    const atkTempStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    attackingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { for (let i = 1; i <= 6; i++) atkTempStats[i] += getEffectiveStat(o, i); }
    });
    applyTeamSkills(attackingIds, atkTempStats, defendingIds);
    attackerScore = atkTempStats[statRoll];

    // Phase 65/69: 【臨陣磨槍】 攻城 Buff (5%)
    if (attacker.siegeBuff || consumedBuff) {
        attacker.siegeBuff = false; // 無論是否成功觸發都消耗
        // 檢查防守方是否有 【無懈可擊】
        const defenderPlayer = (landInfo.owner) ? GAME_STATE.players[landInfo.owner] : null;
        const shieldIndex = defenderPlayer ? defenderPlayer.items.findIndex(it => it.id === 6) : -1;

        if (shieldIndex !== -1) {
            log(`🛡️ 【無懈可擊】！${defenderPlayer.name} 識破了敵方的臨陣磨槍，加成無效！`);
            consumeItem(defenderPlayer, shieldIndex);
        } else {
            log(`🔥 【臨陣磨槍】發動！攻城方比拚項目提升 5%！`);
            attackerScore = Math.floor(attackerScore * 1.05);
        }
    }

    let defenderScore = 0;
    const defTempStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    defendingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { for (let i = 1; i <= 6; i++) defTempStats[i] += getEffectiveStat(o, i); }
    });
    applyTeamSkills(defendingIds, defTempStats, attackingIds);
    defenderScore = defTempStats[statRoll];

    // 防守方 3% 加成 (特技加成後再算地理優勢)
    defenderScore = Math.ceil(defenderScore * 1.03);

    // Phase 66: 連續封地加成 (n%)
    const chainBonus = getCityChainLength(landInfo.owner, landInfo.id);
    if (chainBonus > 0) {
        log(`🏰 【連橫效應】此城為連續 ${chainBonus} 座領地之一，全防守屬性提升 ${chainBonus}%！`);
        defenderScore = Math.ceil(defenderScore * (1 + chainBonus / 100));
    }

    // 結算勝負與成長機制 (平局算攻方敗)
    let isAttackerWin = attackerScore > defenderScore;

    // Phase 31: 頂尖智將「絕境逆轉」隱藏被動
    let reversalProc = false;
    let reversalHtml = "";
    let losingIdsForCheck = isAttackerWin ? defendingIds : attackingIds;
    let topStrategistId = losingIdsForCheck.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 2) >= 95; // 智力 >= 95 (包含成長與受傷影響)
    });

    if (topStrategistId && Math.random() < 0.30) {
        reversalProc = true;
        isAttackerWin = !isAttackerWin; // 翻轉勝負
        playReversalAnimation(); // 播放 Phase 37 特效動畫
        const strategistName = getOfficer(topStrategistId).name;
        reversalHtml = `<div style="margin-top: 15px; padding: 10px; background: rgba(156, 39, 176, 0.2); border: 1px solid #9C27B0; border-radius: 5px;">
            <div style="color: #9C27B0; font-weight: bold; margin-bottom: 5px;">【神機妙算】絕境逆轉！</div>
            <div style="font-size: 14px; margin-top: 5px;">✨ <strong>${strategistName}</strong> 在絕境中看破敵陣，雙方兩敗俱傷，攻城瓦解！</div>
        </div>`;
        log(`✨ 【神機妙算】${strategistName} 智力超群，在絕境中看破敵陣，雙方兩敗俱傷，攻方無功而返，守方亦未得錢糧！`);
    }

    // Phase 26: 紀錄戰績
    attackingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { o.battleCount++; if (isAttackerWin) o.winCount++; }
    });
    defendingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { o.battleCount++; if (!isAttackerWin) o.winCount++; }
    });

    let winningTeamIds = isAttackerWin ? attackingIds : defendingIds;
    let losingTeamIds = isAttackerWin ? defendingIds : attackingIds; // Phase 21: 取出戰敗方
    let growthHtml = "";
    let injuryHtml = ""; // Phase 21: 受傷紀錄

    // Phase 27: 動態受傷判定
    let pointDiff = Math.abs(attackerScore - defenderScore);
    let winInjuryRate = 0.1;
    let loseInjuryRate = 0.5;

    if (statRoll === 1) { // 比較武力時，無論勝負受傷機率加倍
        winInjuryRate *= 2;
        loseInjuryRate *= 2;
    }

    if (pointDiff > 50) {
        loseInjuryRate = 1.0; // 差距>50，戰敗方必定受傷
    } else if (pointDiff < 10) {
        winInjuryRate *= 0.5; // 差距<10，雙方受傷機率減半
        loseInjuryRate *= 0.5;
    }

    // Phase 33 & 38: 頂級統帥減傷光環 (統率 >= 95)
    let winnerTopCommander = winningTeamIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 3) >= 95;
    });
    let loserTopCommander = losingTeamIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 3) >= 95;
    });
    let winnerCmdName = winnerTopCommander ? getOfficer(winnerTopCommander).name : "";
    let loserCmdName = loserTopCommander ? getOfficer(loserTopCommander).name : "";

    // Phase 63 (Bugfix): 提前捕捉「吉星高照」發動者，避免戰鬥中的受傷導致其能力下降而無法發動
    const preBattleAttackerLuckHealerId = attackingIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 6) >= 95;
    });
    const preBattleDefenderLuckHealerId = defendingIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 6) >= 95;
    });

    winningTeamIds.forEach(id => {
        const o = getOfficer(id);
        if (o) {
            // 勝方：50% 機率獲得能力提升
            if (Math.random() < 0.5) {
                const oldVal = o.stats[statRoll];
                o.stats[statRoll] += 1;
                const newVal = o.stats[statRoll];

                growthHtml += `<div style="font-size: 14px; margin-top: 5px;">⬆️ <strong>${o.name}</strong> 的【${statName}】提升了 1 點！</div>`;
                log(`✨ ${o.name} 在戰鬥中得到了成長，【${statName}】提升了 1 點！`);

                // Phase 39 & 41: 覺醒判定 (1-6 屬性各具備隱藏特技，從 <95 變為 >=95)
                if (oldVal < 95 && newVal >= 95 && [1, 2, 3, 4, 5, 6].includes(statRoll)) {
                    playAwakeningAnimation(o.name, statName);
                    log(`🎊 【覺醒】${o.name} 突破極限，領悟了新的隱藏特技！`);
                }
            }
            // 由於 Phase 31: 若為逆轉勝，勝方需全體承受 80%~99% 絕對重傷代價
            if (reversalProc) {
                let dmg = Math.floor(Math.random() * 20) + 80; // 80% ~ 99%
                if (winnerTopCommander) dmg = Math.floor(dmg / 2); // Phase 33
                o.injuryRate = Math.min(100, o.injuryRate + dmg);
                let auraStr = winnerTopCommander ? ` 🛡️(受到 ${winnerCmdName} 指揮護衛，降為 ${dmg}%)` : ``;
                injuryHtml += `<div style="font-size: 14px; margin-top: 5px;">🩸 <strong>${o.name}</strong> 因發動逆轉奇謀透支過度，重創 ${dmg}%！${auraStr}</div>`;
                log(`🩸 ${o.name} 承受逆轉代價，陷入 ${dmg}% 的絕對重傷！${auraStr}`);
            } else {
                // 一般勝方受傷判定
                if (Math.random() < winInjuryRate) {
                    let dmg = Math.floor(Math.random() * 81) + 10; // 10% ~ 90%
                    if (getEffectiveStat(o, 1) >= 95) dmg = Math.floor(dmg / 2); // 猛將減傷 (武力 >= 95)
                    if (winnerTopCommander) dmg = Math.floor(dmg / 2); // Phase 33
                    o.injuryRate = Math.min(100, o.injuryRate + dmg);
                    let auraStr = winnerTopCommander ? ` 🛡️(${winnerCmdName} 統整降低傷亡)` : ``;
                    injuryHtml += `<div style="font-size: 14px; margin-top: 5px;">⚠️ <strong>${o.name}</strong> 在激戰中掛彩，能力下降 ${dmg}%！${auraStr}</div>`;
                    log(`⚠️ ${o.name} 戰勝後掛彩，能力下降 ${dmg}%！`);
                }
            }
        }
    });

    losingTeamIds.forEach(id => {
        const o = getOfficer(id);
        if (o) {
            // Phase 27 擴充：敗方也有 20% 機率從失敗中淬鍊成長
            if (Math.random() < 0.2) {
                const oldVal = o.stats[statRoll];
                o.stats[statRoll] += 1;
                const newVal = o.stats[statRoll];

                growthHtml += `<div style="font-size: 14px; margin-top: 5px;">🔥 <strong>${o.name}</strong> 越挫越勇，【${statName}】提升了 1 點！</div>`;
                log(`🔥 ${o.name} 從敗軍中記取教訓，【${statName}】提升了 1 點！`);

                // Phase 39 & 41: 覺醒判定
                if (oldVal < 95 && newVal >= 95 && [1, 2, 3, 4, 5, 6].includes(statRoll)) {
                    playAwakeningAnimation(o.name, statName);
                    log(`🎊 【覺醒】${o.name} 突破極限，領悟了新的隱藏特技！`);
                }
            }
            // 敗方受傷判定
            if (Math.random() < loseInjuryRate) {
                let dmg = Math.floor(Math.random() * 81) + 10; // 10% ~ 90%
                if (getEffectiveStat(o, 1) >= 95) dmg = Math.floor(dmg / 2); // 猛將減傷 (武力 >= 95)
                if (loserTopCommander) dmg = Math.floor(dmg / 2); // Phase 33
                o.injuryRate = Math.min(100, o.injuryRate + dmg);
                let auraStr = loserTopCommander ? ` 🛡️(${loserCmdName} 統整降低傷亡)` : ``;
                injuryHtml += `<div style="font-size: 14px; margin-top: 5px;">💥 <strong>${o.name}</strong> 受到重創，全能力下降 ${dmg}%！${auraStr}</div>`;
                log(`💥 ${o.name} 在戰局中身受重傷，全能力下降 ${dmg}%！`);
            }
        }
    });

    let resultHtml = `系統擲出 ${statRoll} 點，決定比拚【${statName}】！<br>攻方 (${attackerScore} 點) VS 守方加成後 (${defenderScore} 點)！`;
    if (reversalHtml) {
        resultHtml += reversalHtml;
    }
    if (growthHtml) {
        resultHtml += `<div style="margin-top: 15px; padding: 10px; background: rgba(76, 175, 80, 0.2); border: 1px solid #4CAF50; border-radius: 5px;">
            <div style="color: #4CAF50; font-weight: bold; margin-bottom: 5px;">【戰鬥成長】</div>
            ${growthHtml}
        </div>`;
    }
    if (injuryHtml) {
        resultHtml += `<div style="margin-top: 15px; padding: 10px; background: rgba(244, 67, 54, 0.2); border: 1px solid #F44336; border-radius: 5px;">
            <div style="color: #F44336; font-weight: bold; margin-bottom: 5px;">【將星隕落】</div>
            ${injuryHtml}
        </div>`;
    }

    // Phase 41 & 63: 運氣 (95+)「吉星高照」- 戰後隨機治癒己方一人 100% 傷勢
    const teams = [
        { ids: attackingIds, name: attacker.name, healerId: preBattleAttackerLuckHealerId },
        { ids: defendingIds, name: defender.name, healerId: preBattleDefenderLuckHealerId }
    ];
    teams.forEach(team => {
        if (team.healerId) {
            const healer = getOfficer(team.healerId);
            let injuredAllies = team.ids.filter(id => getOfficer(id).injuryRate > 0);
            if (injuredAllies.length > 0) {
                let targetId = injuredAllies[Math.floor(Math.random() * injuredAllies.length)];
                let target = getOfficer(targetId);
                target.injuryRate = 0;
                let healMsg = `🍀 【吉星高照】${healer.name} 展現奇蹟，使 ${target.name} 的傷勢完全恢復了！`;
                log(healMsg);
                resultHtml += `<div style="margin-top: 10px; padding: 8px; background: rgba(255, 235, 59, 0.2); border: 1px solid #FBC02D; border-radius: 5px;">
                    <div style="color: #FBC02D; font-weight: bold; margin-bottom: 3px;">【幸運治療】</div>
                    <div style="font-size: 13px;">${healMsg}</div>
                </div>`;
            }
        }
    });

    GAME_STATE.isWaitingForAction = true;
    showModal(
        `攻城戰報 - 比拚【${statName}】`,
        resultHtml,
        () => {
            if (reversalProc) {
                // Phase 44: 逆轉特殊結算 - 無奪城、無過路費
                log(`🛑 雙方因【神機妙算】絕境拼鬥，兩敗俱傷！${attacker.name} 撤隊而回，幸免於過路費損失。`);

                // 攻方武將退回給攻方
                attacker.officers.push(...attackingIds);
                updateOfficerCountUI(attacker.id);
                // 守軍保持原樣

                endTurn();
            } else if (isAttackerWin) {
                // 攻佔成功
                log(`🔥 攻城勝利！${attacker.name} 奪下 ${landInfo.name}！`);

                // 守方武將退回給守方
                defender.officers.push(...defendingIds);
                updateOfficerCountUI(defender.id);

                // 城池易主，攻方武將留守
                landInfo.owner = attacker.id;
                landInfo.defenders = attackingIds;

                // 更新 UI 標示
                const cell = document.getElementById(`cell-${landInfo.id}`);
                const ownerMarker = cell.querySelector('.owner-marker');
                ownerMarker.className = 'owner-marker'; // 重置
                if (attacker.id === 1) ownerMarker.classList.add('owner-p1');
                if (attacker.id === 2) ownerMarker.classList.add('owner-p2');
                if (attacker.id === 3) ownerMarker.classList.add('owner-p3');
                if (attacker.id === 4) ownerMarker.classList.add('owner-p4');

                endTurn();
            } else {
                // 攻佔失敗
                const penalty = landInfo.toll * 2;
                log(`❌ 攻城失敗！${attacker.name} 損失慘重，支付雙倍過路費 $${penalty}！`);

                // 攻方武將退回給攻方
                attacker.officers.push(...attackingIds);
                updateOfficerCountUI(attacker.id);

                payToll(attacker, defender, penalty);
            }
        },
        null, '確認戰果', null
    );

    // 只有在雙方皆為電腦時，才自動關閉戰報 (Phase 35: 玩家參戰必等確認)
    if (attacker.isBot && defender.isBot) {
        setTimeout(() => {
            try {
                // 防呆：確認目前顯示的 Modal 仍然是這場攻城戰報，避免玩家提早按掉後，
                // 定時器在下一回合剛好命中玩家踩到敵方土地的「繳交軍費」按鈕 (btn-modal-yes)
                if (!UI.modal.classList.contains('hidden') && UI.modalTitle.textContent.includes('戰報')) {
                    const btn = document.getElementById('btn-modal-yes');
                    if (btn) btn.click();
                }
            } catch (e) {
                console.error("AI click modal error:", e);
                endTurn(); // fallback
            }
        }, 3000); // AI 對戰稍微停一下讓玩家看清日誌變化
    }
}

// 付費處理
function payToll(payer, receiver, toll) {
    try {
        let actualPaid = Math.min(payer.money, toll);
        updateMoney(payer.id, -actualPaid);
        updateMoney(receiver.id, actualPaid);

        if (payer.money <= 0) {
            handleBankrupt(payer);
        } else {
            endTurn();
        }
    } catch (e) {
        log(`[系統區] payToll 嚴重錯誤: ${e.message}`);
        console.error("payToll error:", e);
        endTurn(); // fallback
    }
}

// 破產處理
function handleBankrupt(player) {
    log(`⚠️ ${player.name} 資金枯竭，宣告破產！`);
    player.isBankrupt = true;

    // 移除玩家卡片視覺
    const card = document.getElementById(`p${player.id}-card`);
    if (card) {
        card.classList.remove('active');
        card.style.opacity = '0.3';
        card.style.filter = 'grayscale(100%)';
    }

    // 棋子消失
    updatePiecesPosition();

    let exiledCount = 0;
    // 沒收閒置武將
    if (player.officers.length > 0) {
        GAME_STATE.changanOfficers.push(...player.officers);
        exiledCount += player.officers.length;
        player.officers = [];
        updateOfficerCountUI(player.id);
    }

    // 充公土地與沒收駐守武將
    MAP_DATA.forEach(land => {
        if (land.owner === player.id) {
            land.owner = null;
            if (land.defenders && land.defenders.length > 0) {
                GAME_STATE.changanOfficers.push(...land.defenders);
                exiledCount += land.defenders.length;
                land.defenders = [];
            }
            const cell = document.getElementById(`cell-${land.id}`);
            const marker = cell.querySelector('.owner-marker');
            marker.className = 'owner-marker'; // 重置
            log(`${land.name} 成為無主之地。`);
        }
    });

    if (exiledCount > 0) {
        log(`💨 失去君主的 ${exiledCount} 名將領皆已落難流亡至長安城...（招募系統開啟）`);
    }

    // 將玩家移出進行中列表
    GAME_STATE.activePlayers = GAME_STATE.activePlayers.filter(id => id !== player.id);

    // 退還所有閒置武將 (也可不退還，讓他們消失)
    player.officers = [];
    updateOfficerCountUI(player.id);

    // 檢查是否只剩一人獲勝
    if (GAME_STATE.activePlayers.length <= 1) {
        const winner = GAME_STATE.players[GAME_STATE.activePlayers[0]];
        GAME_STATE.gameOver = true;
        log(`🎉 遊戲結束！天下歸 ${winner.name} 所有！`);
        setTimeout(() => alert(`遊戲結束！${winner.name} 獲勝！`), 500);
    } else {
        endTurn();
    }
}

// 金錢更新 (包含安全轉型防呆)
function updateMoney(playerId, amount) {
    const p = GAME_STATE.players[playerId];
    p.money = Math.max(0, parseInt(p.money, 10) + parseInt(amount, 10));

    if (playerId === 1) UI.p1Money.textContent = p.money;
    if (playerId === 2) UI.p2Money.textContent = p.money;
    if (playerId === 3) UI.p3Money.textContent = p.money;
    if (playerId === 4 && UI.p4Money) UI.p4Money.textContent = p.money;
}

// 更新閒置武將 UI
function updateOfficerCountUI(playerId) {
    const p = GAME_STATE.players[playerId];
    const el = document.getElementById(`p${playerId}-officers`);
    if (el) el.textContent = p.officers.length;
}

// 根據 ID 獲取武將資料
function getOfficer(id) {
    return OFFICERS_DATA.find(o => o.id === id);
}

// Phase 30: 政治稅收與城池通膨
function processCityTaxesAndInflation(player) {
    let totalTaxIncome = 0;
    let taxedCities = 0;
    let eliteTaxCities = 0;

    MAP_DATA.forEach(land => {
        if (land.owner === player.id) {
            // 1. 每回合該玩家名下城池過路費通膨 1%
            if (land.toll > 0) {
                land.toll = Math.ceil(land.toll * 1.01);
            }

            // 2. 政治稅收計算
            let totalPolitics = 0;
            if (land.defenders && land.defenders.length > 0) {
                let teamStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                land.defenders.forEach(id => {
                    const o = getOfficer(id);
                    if (o) {
                        for (let i = 1; i <= 6; i++) {
                            teamStats[i] += getEffectiveStat(o, i);
                        }
                    }
                });

                // 加上特技光環影響
                applyTeamSkills(land.defenders, teamStats);
                totalPolitics = teamStats[4]; // 政治為 4
            }

            // 稅收比率判定
            let taxRate = 0.01; // 基礎 1%
            if (totalPolitics > 300) {
                taxRate = 0.03;
            } else if (totalPolitics > 200) {
                taxRate = 0.02;
            }

            let cityIncome = Math.floor(land.price * taxRate);

            // Phase 41: 政治 (95+)「經世濟民」- 稅收倍增
            let elitePolitician = land.defenders.find(id => {
                const o = getOfficer(id);
                return o && getEffectiveStat(o, 4) >= 95;
            });
            if (elitePolitician) {
                cityIncome *= 2;
                eliteTaxCities++;
            }

            if (cityIncome > 0) {
                totalTaxIncome += cityIncome;
                taxedCities++;
            }
        }
    });

    if (totalTaxIncome > 0) {
        updateMoney(player.id, totalTaxIncome);
        let eliteStr = eliteTaxCities > 0 ? ` (含 ${eliteTaxCities} 座「經世濟民」加成)` : "";
        log(`💰 【政治歲入】${player.name} 從其名下的 ${taxedCities} 座城池，徵收了總計 $${totalTaxIncome} 的發展稅賦！${eliteStr}`);
    }
}

// 處理團隊特技光環加成
function applyTeamSkills(teamIds, teamStats, enemyIds = []) {
    teamIds.forEach(id => {
        if (OFFICER_SKILLS[id]) {
            OFFICER_SKILLS[id].effect(teamStats, enemyIds);
        }
    });
}
// 結束回合
function endTurn() {
    if (GAME_STATE.gameOver) return;

    // Phase 48: 統一結算破產 (處理買地、招募、事件卡扣錢導致的破產)
    const currentPlayer = GAME_STATE.players[GAME_STATE.currentPlayer];
    if (currentPlayer && currentPlayer.money <= 0 && !currentPlayer.isBankrupt) {
        // 如果這個回合的動作導致當前玩家資金歸零，直接在此宣告破產
        handleBankrupt(currentPlayer);
        return; // handleBankrupt 會自行重新呼叫 endTurn 或宣告遊戲結束
    }

    GAME_STATE.isWaitingForAction = false;
    UI.dice.classList.remove('rolling');

    let currentIndex = GAME_STATE.activePlayers.indexOf(GAME_STATE.currentPlayer);
    let nextPlayerId = GAME_STATE.currentPlayer;
    let foundNext = false;

    // 依據開局隨機洗牌後的 activePlayers 陣列順序尋找下一位非破產的玩家
    for (let i = 1; i <= GAME_STATE.activePlayers.length; i++) {
        let nextIndex = (currentIndex + i) % GAME_STATE.activePlayers.length;
        nextPlayerId = GAME_STATE.activePlayers[nextIndex];
        if (GAME_STATE.players[nextPlayerId] && !GAME_STATE.players[nextPlayerId].isBankrupt) {
            foundNext = true;
            break;
        }
    }

    try {
        if (foundNext) {
            // Phase 65: 檢查是否連續行動 (瞞天過海)
            const currentPlayerObj = GAME_STATE.players[GAME_STATE.currentPlayer];
            if (currentPlayerObj && currentPlayerObj.actTwice && !currentPlayerObj.isBankrupt) {
                currentPlayerObj.actTwice = false;
                log(`✨ 【瞞天過海】奏效！${currentPlayerObj.name} 獲得連續行動的機會！`);
            } else {
                let finalNextIndex = GAME_STATE.activePlayers.indexOf(nextPlayerId);
                if (finalNextIndex <= currentIndex) {
                    GAME_STATE.currentRound++;
                    log(`=== 第 ${GAME_STATE.currentRound} 回圈開始 ===`);
                }
                GAME_STATE.currentPlayer = nextPlayerId;
            }

            const nextPlayer = GAME_STATE.players[GAME_STATE.currentPlayer];

            // 更新 UI 顯示 (四人版)
            UI.p1Card.classList.toggle('active', GAME_STATE.currentPlayer === 1);
            UI.p2Card.classList.toggle('active', GAME_STATE.currentPlayer === 2);
            UI.p3Card.classList.toggle('active', GAME_STATE.currentPlayer === 3);
            if (UI.p4Card) UI.p4Card.classList.toggle('active', GAME_STATE.currentPlayer === 4);

            UI.currentTurnName.textContent = nextPlayer.name;
            UI.currentTurnName.className = nextPlayer.nameClass;

            log(`現在輪到 ${nextPlayer.name} 回合。`);

            // Phase 21: 執行武將復原判定
            healOfficers(nextPlayer);

            // Phase 30: 結算政治稅收與過路費通膨
            processCityTaxesAndInflation(nextPlayer);

            checkTurn();
        } else {
            // 所有玩家都破產了，遊戲結束
            GAME_STATE.gameOver = true;
            log("所有玩家都已破產，遊戲結束！");
            showModal("遊戲結束", "所有玩家都已破產！", () => { }, null, "確定");
        }
    } catch (e) {
        console.error("endTurn error:", e);
        log(`[系統區] endTurn 時發生未預期錯誤，遊戲進度可能中斷。`);
    }
}

// Phase 21: 武將自然恢復機制
function healOfficers(player) {
    let healed = [];

    const healLogic = (id) => {
        let o = getOfficer(id);
        if (o && o.injuryRate > 0) {
            o.injuryRate = Math.max(0, o.injuryRate - 10);
            if (o.injuryRate === 0) healed.push(o.name);
        }
    };

    // 檢查閒置武將
    player.officers.forEach(healLogic);

    // 檢查駐守武將
    MAP_DATA.forEach(land => {
        if (land.owner === player.id) {
            land.defenders.forEach(healLogic);
        }
    });

    if (healed.length > 0) {
        log(`⚕️ 傷勢好轉！${player.name} 麾下的 ${healed.join('、')} 已經完全康復！`);
    }
}

// UI 輔助
function enableRollButton(enable) {
    UI.btnRoll.disabled = !enable;
}

// 播放「絕境逆轉」特效動畫 (Phase 37)
function playReversalAnimation() {
    const overlay = document.createElement('div');
    overlay.className = 'reversal-overlay';

    const text = document.createElement('div');
    text.className = 'reversal-text';
    text.textContent = '神機妙算';

    overlay.appendChild(text);
    document.body.appendChild(overlay);

    // 1秒後自動移除
    setTimeout(() => {
        if (overlay.parentNode) {
            document.body.removeChild(overlay);
        }
    }, 1200); // 稍微多給一點緩衝
}

// 播放「武將覺醒」特效動畫 (Phase 39)
function playAwakeningAnimation(officerName, attrName) {
    const overlay = document.createElement('div');
    overlay.className = 'awakening-overlay';

    const title = document.createElement('div');
    title.className = 'awakening-title';
    title.textContent = '能力覺醒';

    const subtitle = document.createElement('div');
    subtitle.className = 'awakening-subtitle';
    subtitle.textContent = `${officerName} 領悟了新的特技！`;

    overlay.appendChild(title);
    overlay.appendChild(subtitle);
    document.body.appendChild(overlay);

    // 1.5秒後自動移除
    setTimeout(() => {
        if (overlay.parentNode) {
            document.body.removeChild(overlay);
        }
    }, 1500);
}

// Phase 67: AI 招募動畫
function playRecruitAnimation(officerName, playerName) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.75); z-index: 10001;
        display: flex; justify-content: center; align-items: center;
        flex-direction: column; pointer-events: none; opacity: 0; transition: opacity 0.4s;
    `;
    overlay.innerHTML = `
        <div style="color: #ffd700; font-size: 2.5vw; text-shadow: 0 0 10px #ffd700; margin-bottom: 20px; font-family: 'Noto Serif TC', serif;">✨ 賢才歸心 ✨</div>
        <div style="color: white; font-size: 4vw; text-shadow: 0 0 20px rgba(255,255,255,0.5); transform: scale(0.6); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <span style="color: #64b5f6;">${playerName}</span> 成功招募了 <span style="color: #ffb74d;">${officerName}</span>
        </div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('div:last-child').style.transform = 'scale(1)';
    });

    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
    }, 1200);
}

// Phase 68: AI 使用道具動畫
function playItemAnimation(itemName, playerName) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.75); z-index: 10001;
        display: flex; justify-content: center; align-items: center;
        flex-direction: column; pointer-events: none; opacity: 0; transition: opacity 0.4s;
    `;
    overlay.innerHTML = `
        <div style="color: #ff5252; font-size: 2.5vw; text-shadow: 0 0 10px #ff5252; margin-bottom: 20px; font-family: 'Noto Serif TC', serif;">✨ 施展奇謀 ✨</div>
        <div style="color: white; font-size: 4vw; text-shadow: 0 0 20px rgba(255,255,255,0.5); transform: scale(0.6); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <span style="color: #64b5f6;">${playerName}</span> 使用了錦囊 <span style="color: #ffeb3b;">【${itemName}】</span>
        </div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('div:last-child').style.transform = 'scale(1)';
    });

    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
    }, 1200);
}

function showModal(title, messageHtml, onConfirm, onCancel, confirmText = "確定", cancelText = "取消") {
    GAME_STATE.isWaitingForAction = true;
    UI.modalTitle.textContent = title;
    UI.modalMessage.innerHTML = messageHtml;

    UI.btnModalYes.textContent = confirmText;
    UI.btnModalNo.style.display = onCancel ? 'inline-block' : 'none';
    if (cancelText) UI.btnModalNo.textContent = cancelText;

    modalConfirmCallback = onConfirm;
    modalCancelCallback = onCancel || (() => { });

    UI.modal.classList.remove('hidden');
}

function hideModal() {
    UI.modal.classList.add('hidden');
    GAME_STATE.isWaitingForAction = false;
}

// Phase 22: 攻城選陣清單改革
let currentSiegePlayer = null;
let currentSiegeCityId = -1;
let currentSiegeSortKey = 'total';
let currentSiegeSortOrder = -1;

function showOfficerModal(title, message, player, onConfirm, onCancel, showCancelBtn = false, isSiege = false, defIds = [], allowZero = false, cityId = -1) {
    GAME_STATE.isWaitingForAction = true;
    selectedOfficers = [];
    maxSelectableOfficers = 3;
    window.allowZeroSelection = allowZero;
    currentSiegePlayer = player;
    currentSiegeCityId = cityId;

    UI.officerModalTitle.textContent = title;
    UI.officerModalMessage.textContent = message;

    let winRateEl = document.getElementById('officer-win-rate');
    let comparePanel = document.getElementById('officer-compare-panel');

    if (isSiege) {
        if (comparePanel) comparePanel.style.display = 'block';
        window.currentDefIds = defIds;

        // Phase 69: 檢查是否有臨陣磨槍
        const hasSiegeBuffItem = player.items && player.items.some(item => item.id === 5);
        if (hasSiegeBuffItem) {
            UI.siegeBuffContainer.style.display = 'block';
            UI.useSiegeBuffCheckbox.checked = false;
        } else {
            UI.siegeBuffContainer.style.display = 'none';
            UI.useSiegeBuffCheckbox.checked = false;
        }

        // Phase 22 & 69: 智能預設最佳陣容 (針對 checkbox 狀態計算)
        // 取得預設最佳陣容並自動勾選，forUI 傳入 true 確保回傳盡可能最佳的一組
        const bestTeam = getBestSiegeTeam(player.officers, defIds, cityId, UI.useSiegeBuffCheckbox.checked, true);
        if (bestTeam && bestTeam.length > 0) {
            selectedOfficers = [...bestTeam];
        } else {
            selectedOfficers = [];
        }
    } else {
        if (comparePanel) comparePanel.style.display = 'none';
        window.currentDefIds = [];
        UI.siegeBuffContainer.style.display = 'none';
        UI.useSiegeBuffCheckbox.checked = false;
    }

    renderSiegeOfficerList();

    UI.btnOfficerConfirm.disabled = !window.allowZeroSelection && selectedOfficers.length === 0;
    UI.btnOfficerCancel.style.display = showCancelBtn ? 'inline-block' : 'none';

    officerConfirmCallback = onConfirm;
    officerCancelCallback = onCancel;

    UI.officerModal.classList.remove('hidden');

    // 初始化排序事件 (避免重複綁定，可在 window.onload 處理或確保只註冊一次)
    setupSiegeSort();
}

function renderSiegeOfficerList() {
    const tbody = document.getElementById('officer-list-tbody');
    if (!tbody) {
        // Fallback for older HTML caching
        console.warn("officer-list-tbody not found! Skip rendering list.");
        return;
    }
    tbody.innerHTML = '';

    if (!currentSiegePlayer) return;

    let officers = currentSiegePlayer.officers.map(id => getOfficer(id)).filter(o => o != null);

    // 套用排序
    officers.sort((a, b) => {
        let valA, valB;
        if (currentSiegeSortKey === 'total') {
            valA = 0; valB = 0;
            for (let i = 1; i <= 6; i++) { valA += getEffectiveStat(a, i); valB += getEffectiveStat(b, i); }
        } else if (['1', '2', '3', '4', '5', '6'].includes(currentSiegeSortKey)) {
            valA = getEffectiveStat(a, currentSiegeSortKey);
            valB = getEffectiveStat(b, currentSiegeSortKey);
        } else {
            valA = a[currentSiegeSortKey];
            valB = b[currentSiegeSortKey];
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * currentSiegeSortOrder;
        }
        return (valA - valB) * currentSiegeSortOrder;
    });

    officers.forEach(o => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        const isSelected = selectedOfficers.includes(o.id);
        if (isSelected) tr.style.backgroundColor = 'rgba(76, 175, 80, 0.15)';

        // 計算折損後的總和
        let total = 0;
        for (let i = 1; i <= 6; i++) total += getEffectiveStat(o, i);

        let skillText = "-";
        if (OFFICER_SKILLS[o.id]) {
            skillText = `<strong style="color:var(--primary-color)">【${OFFICER_SKILLS[o.id].name}】</strong>`;
        }
        if (o.injuryRate > 0) {
            skillText += ` <span style="color:#e57373; font-size:0.85em;">(受傷 -${o.injuryRate}%)</span>`;
        }

        tr.innerHTML = `
            <td><input type="checkbox" ${isSelected ? 'checked' : ''} style="pointer-events: none; transform: scale(1.3);"></td>
            <td style="font-weight:bold;">${o.name}</td>
            <td>${formatStatDisplay(o.baseStats[1], o.stats[1], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[2], o.stats[2], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[3], o.stats[3], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[4], o.stats[4], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[5], o.stats[5], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[6], o.stats[6], o.injuryRate)}</td>
            <td style="color:var(--primary-color); font-weight:bold;">${total}</td>
            <td class="desc-col">${skillText}</td>
        `;

        tr.onclick = () => {
            toggleOfficerSelection(tr, o.id);
            // 同步 Checkbox 狀態與樣式
            const cb = tr.querySelector('input[type="checkbox"]');
            const nowSelected = selectedOfficers.includes(o.id);
            cb.checked = nowSelected;
            if (nowSelected) {
                tr.style.backgroundColor = 'rgba(76, 175, 80, 0.15)';
            } else {
                tr.style.backgroundColor = '';
            }
        };

        tbody.appendChild(tr);
    });

    // 每次重新渲染，更新面板
    updateWinRateDisplay();
}

function hideOfficerModal() {
    UI.officerModal.classList.add('hidden');
    GAME_STATE.isWaitingForAction = false;
}

function toggleOfficerSelection(element, officerId) {
    const idx = selectedOfficers.indexOf(officerId);
    if (idx > -1) {
        selectedOfficers.splice(idx, 1);
    } else {
        if (selectedOfficers.length >= maxSelectableOfficers) return;
        selectedOfficers.push(officerId);
    }

    UI.btnOfficerConfirm.disabled = !window.allowZeroSelection && selectedOfficers.length === 0;

    if (window.currentDefIds && window.currentDefIds.length > 0) {
        updateWinRateDisplay();
    }
}

function updateWinRateDisplay() {
    const el = document.getElementById('officer-win-rate');
    const comparePanel = document.getElementById('officer-compare-panel');
    if (!el) return;

    // 清零顯示
    const resetDisplay = () => {
        for (let i = 1; i <= 6; i++) {
            const aEl = document.getElementById(`atk-stat-${i}`);
            const dEl = document.getElementById(`def-stat-${i}`);
            if (aEl) { aEl.textContent = '-'; aEl.style.color = ''; }
            if (dEl) { dEl.textContent = '-'; dEl.style.color = ''; }
        }
    };

    if (!window.currentDefIds || window.currentDefIds.length === 0) {
        resetDisplay();
        return;
    }

    const defStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    window.currentDefIds.forEach(id => {
        const o = getOfficer(id);
        if (o) for (let i = 1; i <= 6; i++) {
            defStats[i] += getEffectiveStat(o, i);
        }
    });

    applyTeamSkills(window.currentDefIds, defStats);

    // 防守方 3% 加成
    for (let i = 1; i <= 6; i++) {
        defStats[i] = Math.ceil(defStats[i] * 1.03);
    }

    // Phase 66: 連續封地加成 (n%)
    const chainBonus = getCityChainLength(MAP_DATA[currentSiegeCityId]?.owner, currentSiegeCityId);
    console.log(`[Phase 66] currentSiegeCityId: ${currentSiegeCityId}, owner: ${MAP_DATA[currentSiegeCityId]?.owner}, bonus: ${chainBonus}%`);
    let chainHtml = "";
    if (chainBonus > 0) {
        for (let i = 1; i <= 6; i++) {
            defStats[i] = Math.ceil(defStats[i] * (1 + chainBonus / 100));
        }
        chainHtml = ` <b style="color: #2e7d32; font-size: 0.9em; background: rgba(76, 175, 80, 0.1); padding: 2px 4px; border-radius: 3px; border: 1px solid #4caf50; margin-left: 5px;">🏰 地利 +${chainBonus}%</b>`;
    }

    const atkStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    selectedOfficers.forEach(id => {
        const o = getOfficer(id);
        if (o) for (let i = 1; i <= 6; i++) {
            atkStats[i] += getEffectiveStat(o, i);
        }
    });

    applyTeamSkills(selectedOfficers, atkStats);

    // Phase 69: 臨陣磨槍加成
    let siegeBuffHtml = "";
    if (UI.useSiegeBuffCheckbox && UI.useSiegeBuffCheckbox.checked) {
        for (let i = 1; i <= 6; i++) {
            atkStats[i] = Math.ceil(atkStats[i] * 1.05);
        }
        siegeBuffHtml = ` <b style="color: #d35400; font-size: 0.9em; background: rgba(211, 84, 0, 0.1); padding: 2px 4px; border-radius: 3px; border: 1px solid #d35400; margin-left: 5px;">🔥 臨陣磨槍 +5%</b>`;
    }

    if (selectedOfficers.length === 0) {
        resetDisplay();
        el.textContent = '預估勝率：請先選擇作戰武將...';
        return;
    }

    let expectedWins = 0;
    const hasLegend = [...selectedOfficers, ...window.currentDefIds].some(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 1) >= 95;
    });
    const totalOutcomes = hasLegend ? 7 : 6;

    // 更新個別數字與顏色
    for (let i = 1; i <= 6; i++) {
        const aEl = document.getElementById(`atk-stat-${i}`);
        const dEl = document.getElementById(`def-stat-${i}`);
        if (aEl && dEl) {
            aEl.textContent = atkStats[i];
            dEl.textContent = defStats[i];

            if (atkStats[i] > defStats[i]) {
                expectedWins += (hasLegend && i === 1) ? 2 : 1;
                aEl.style.color = '#27ae60'; // 勝: 綠色
                aEl.style.fontWeight = 'bold';
                dEl.style.color = '#c0392b'; // 敗: 紅色
                dEl.style.fontWeight = 'normal';
            } else if (atkStats[i] < defStats[i]) {
                aEl.style.color = '#c0392b';
                aEl.style.fontWeight = 'normal';
                dEl.style.color = '#27ae60';
                dEl.style.fontWeight = 'bold';
            } else {
                aEl.style.color = '#555';
                aEl.style.fontWeight = 'normal';
                dEl.style.color = '#555';
                dEl.style.fontWeight = 'normal';
            }
        }
    }

    const winRate = Math.round((expectedWins / totalOutcomes) * 100);
    el.innerHTML = `預估勝率：<span style="color: ${winRate >= 50 ? '#27ae60' : '#e67e22'}; font-size: 1.2rem;">${winRate}%</span>${chainHtml}${siegeBuffHtml} (${expectedWins} / ${totalOutcomes} 預期期望值)`;
}

// 事件綁定只須執行一次
let isSiegeSortSetup = false;
function setupSiegeSort() {
    if (isSiegeSortSetup) return;
    const headers = document.querySelectorAll('.sortable-siege');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort-siege');
            if (currentSiegeSortKey === sortKey) {
                currentSiegeSortOrder *= -1;
            } else {
                currentSiegeSortKey = sortKey;
                currentSiegeSortOrder = -1;
                if (sortKey === 'name') currentSiegeSortOrder = 1;
            }
            renderSiegeOfficerList();
        });
    });
    isSiegeSortSetup = true;
}

// -----------------------------------------------------------------------------
// 【Phase 15, 29】 長安城武將招募系統
// -----------------------------------------------------------------------------
// 計算特技總加成百分點 (Phase 29)
function getSkillPowerPercentage(skill) {
    if (!skill || !skill.effect) return 0;
    let mockStats = { 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 };
    skill.effect(mockStats);
    let totalDiff = 0;
    for (let i = 1; i <= 6; i++) {
        totalDiff += (mockStats[i] - 100);
    }
    return totalDiff;
}

let changanSelectedOfficers = [];

function showChanganModal(player, offeredIds) {
    GAME_STATE.isWaitingForAction = true;
    changanSelectedOfficers = [];
    if (!UI.changanTotalCost) return;
    UI.changanTotalCost.textContent = '0';

    // 產生招募清單
    UI.changanOfficerList.innerHTML = '';
    // Phase 64: 只渲染隨機選出的武將
    offeredIds.forEach(id => {
        const o = getOfficer(id);
        if (!o) return;

        // 計算招募費用 (六維總和)
        let cost = 0;
        for (let i = 1; i <= 6; i++) cost += o.stats[i];

        // 【Phase 29 更新規則】若武將擁有特技為 1.5 倍，強力特技 (加總 > 9%) 為 2 倍
        if (OFFICER_SKILLS[id]) {
            let power = getSkillPowerPercentage(OFFICER_SKILLS[id]);
            if (power > 9) {
                cost *= 2;
            } else {
                cost = Math.floor(cost * 1.5);
            }
        }
        o._recruitCost = cost; // 暫存起來方便取用

        let skillHtml = "";
        if (OFFICER_SKILLS[id]) {
            const skill = OFFICER_SKILLS[id];
            skillHtml = `<div style="font-size: 11px; margin-top: 5px; color: #ffeb3b; background: rgba(0,0,0,0.4); padding: 2px 5px; border-radius: 4px;">
                <strong>★${skill.name}★</strong>: ${skill.desc}
            </div>`;
        }

        const div = document.createElement('div');
        div.className = 'officer-item';
        div.innerHTML = `
            <strong>${o.name}</strong> 
            <div class="officer-stats">
                <span>武:${formatStatDisplay(o.baseStats[1], o.stats[1], o.injuryRate)}</span><span>智:${formatStatDisplay(o.baseStats[2], o.stats[2], o.injuryRate)}</span>
                <span>統:${formatStatDisplay(o.baseStats[3], o.stats[3], o.injuryRate)}</span><span>政:${formatStatDisplay(o.baseStats[4], o.stats[4], o.injuryRate)}</span>
                <span>魅:${formatStatDisplay(o.baseStats[5], o.stats[5], o.injuryRate)}</span><span>運:${formatStatDisplay(o.baseStats[6], o.stats[6], o.injuryRate)}</span>
            </div>
            ${skillHtml}
            <div class="officer-cost">招募金：$${cost}</div>
        `;
        // 點擊卡片切換選取狀態
        div.onclick = () => toggleChanganOfficerSelection(div, o.id, player);
        UI.changanOfficerList.appendChild(div);
    });

    // 綁定按鈕事件
    UI.btnChanganConfirm.onclick = () => {
        const totalCost = parseInt(UI.changanTotalCost.textContent, 10);
        if (player.money < totalCost) {
            alert("資金不足以招募所選武將！");
            return;
        }

        if (changanSelectedOfficers.length > 0) {
            updateMoney(player.id, -totalCost);
            // 將選取的武將從長安移出，並加入玩家陣營
            changanSelectedOfficers.forEach(id => {
                player.officers.push(id);
                // 移除長安陣列中的該武將
                GAME_STATE.changanOfficers = GAME_STATE.changanOfficers.filter(cid => cid !== id);
            });
            updateOfficerCountUI(player.id);
            log(`🎉 招賢納士！${player.name} 花費了 $${totalCost} 重金，在長安招募到 ${changanSelectedOfficers.length} 名猛將！`);
        }

        UI.changanModal.classList.add('hidden');
        GAME_STATE.isWaitingForAction = false;
        endTurn();
    };

    UI.btnChanganCancel.onclick = () => {
        log(`${player.name} 視察了長安的在野武將，並未進行招募。`);
        UI.changanModal.classList.add('hidden');
        GAME_STATE.isWaitingForAction = false;
        endTurn();
    };

    UI.btnChanganConfirm.disabled = true; // 初次開啟無選將
    UI.changanModal.classList.remove('hidden');
}

function toggleChanganOfficerSelection(element, officerId, player) {
    const idx = changanSelectedOfficers.indexOf(officerId);
    if (idx > -1) {
        // Deselect
        changanSelectedOfficers.splice(idx, 1);
        element.classList.remove('selected');
    } else {
        // 【Phase 15 更新規則】每個玩家每次抵達長安時，最多只能點選招募 1 名武將
        if (changanSelectedOfficers.length >= 1) {
            alert("每次抵達長安，最多只能招募 1 名將領喔！");
            return;
        }
        // Select
        changanSelectedOfficers.push(officerId);
        element.classList.add('selected');
    }
    updateChanganCostDisplay(player);
}

function updateChanganCostDisplay(player) {
    let total = 0;
    changanSelectedOfficers.forEach(id => {
        const o = getOfficer(id);
        if (o && o._recruitCost) total += o._recruitCost;
    });
    UI.changanTotalCost.textContent = total;

    if (total === 0) {
        UI.changanTotalCost.style.color = 'inherit';
        UI.btnChanganConfirm.disabled = true;
    } else if (player.money < total) {
        UI.changanTotalCost.style.color = '#ff1744';
        UI.btnChanganConfirm.disabled = true;
    } else {
        UI.changanTotalCost.style.color = 'inherit';
        UI.btnChanganConfirm.disabled = false;
    }
}

// ==============================
// 舊 AI 招募邏輯 (已由 handleChanganChoiceAI 取代，不再呼叫)
// ==============================
function handleChanganRecruitAI(player, offeredIds) {
    // 預算評估，Phase 64: 只針對隨機選出的武將
    let availableList = offeredIds.map(id => {
        const o = getOfficer(id);
        let cost = 0;
        for (let i = 1; i <= 6; i++) cost += o.stats[i];

        if (OFFICER_SKILLS[id]) {
            let power = getSkillPowerPercentage(OFFICER_SKILLS[id]);
            cost = power > 9 ? cost * 2 : Math.floor(cost * 1.5);
        }

        return { id: o.id, name: o.name, cost: cost };
    });

    availableList.sort((a, b) => b.cost - a.cost);

    let recruited = false;
    // 只招募一隻最強的
    if (availableList.length > 0 && player.money >= availableList[0].cost) {
        let best = availableList[0];
        updateMoney(player.id, -best.cost);
        player.officers.push(best.id);

        GAME_STATE.changanOfficers = GAME_STATE.changanOfficers.filter(id => id !== best.id);
        updateOfficerCountUI(player.id);
        log(`[電腦] ${player.name} 在長安招募了猛將 ${best.name} (花費 $${best.cost})。`);
        recruited = true;
    }

    if (!recruited) {
        log(`[電腦] ${player.name} 衡量資金與發展後，默默離開長安。`);
    }

    setTimeout(() => {
        endTurn();
    }, 1500);
}

// ==============================
// Phase 65: 新增道具店 UI 與選項機制
// ==============================
// Phase 65: 新增道具使用介面
let selectedInventoryItem = null;

function openInventory() {
    const player = GAME_STATE.players[GAME_STATE.currentPlayer];
    if (!player.items || player.items.length === 0) {
        log(`${player.name} 目前身上沒有任何錦囊道具。`);
        return;
    }

    GAME_STATE.isWaitingForAction = true;
    selectedInventoryItem = null;
    if (UI.btnConfirmUseItem) UI.btnConfirmUseItem.disabled = true;
    renderInventory(player);
    if (UI.inventoryModal) UI.inventoryModal.classList.remove('hidden');
}

function renderInventory(player) {
    if (!UI.inventoryItemList) return;
    UI.inventoryItemList.innerHTML = '';
    player.items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'officer-item';
        div.style.textAlign = 'left';
        div.innerHTML = `<strong>${item.name}</strong><br><small>${item.desc}</small>`;
        div.onclick = () => {
            document.querySelectorAll('#inventory-item-list .officer-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            selectedInventoryItem = { ...item, index: index };
            if (UI.btnConfirmUseItem) UI.btnConfirmUseItem.disabled = false;
        };
        UI.inventoryItemList.appendChild(div);
    });
}

if (UI.btnConfirmUseItem) {
    UI.btnConfirmUseItem.onclick = () => {
        if (!selectedInventoryItem) return;
        UI.inventoryModal.classList.add('hidden');
        useItem(GAME_STATE.players[GAME_STATE.currentPlayer], selectedInventoryItem);
    };
}

if (UI.btnCancelInventory) {
    UI.btnCancelInventory.onclick = () => {
        UI.inventoryModal.classList.add('hidden');
        GAME_STATE.isWaitingForAction = false;
    };
}

// 道具發動核心邏輯 (支援 AI 呼叫)
function useItem(player, itemInfo, aiTarget = null) {
    const item = itemInfo;
    const isBot = player.isBot;
    log(`✨ ${player.name} 施展了計謀：【${item.name}】！`);
    
    if (isBot) {
        playItemAnimation(item.name, player.name);
    }

    switch (item.id) {
        case 1: // 瞞天過海: 走兩次
            player.actTwice = true;
            consumeItem(player, itemInfo.index);
            log(`步步為營！${player.name} 本回合結束後將可再次行動。`);
            GAME_STATE.isWaitingForAction = false;
            break;
        case 2: // 以逸待勞: 原地停留
            player.stayInPlace = true;
            consumeItem(player, itemInfo.index);
            log(`靜觀其變！${player.name} 下次擲骰將原地停留並直接觸發事件。`);
            GAME_STATE.isWaitingForAction = false;
            break;
        case 3: // 暗度陳倉: 傳送
            const teleportTo = (target) => {
                const targetCellId = target.id;
                log(`出其不意！${player.name} 瞬間移動到了 ${target.name}！`);
                player.position = targetCellId;
                updatePiecesPosition();
                consumeItem(player, itemInfo.index);
                setTimeout(() => {
                    GAME_STATE.isWaitingForAction = false;
                    triggerLandEvent(player, MAP_DATA[targetCellId]);
                }, 600);
            };
            if (isBot && aiTarget) teleportTo(aiTarget);
            else openTargetSelect('land', teleportTo);
            break;
        case 4: // 暗箭傷人: 隨機重傷敵方前五強
            const executeSabotage = (targetPlayer) => {
                // 檢查對手是否有無懈可擊
                const shieldIndex = targetPlayer.items.findIndex(it => it.id === 6);
                if (shieldIndex !== -1) {
                    log(`🛡️ 【無懈可擊】！${targetPlayer.name} 識破了計謀，道具抵消！`);
                    consumeItem(targetPlayer, shieldIndex);
                    consumeItem(player, itemInfo.index);
                    GAME_STATE.isWaitingForAction = false;
                    return;
                }

                // 找出能力最強前五名
                let targetOfficers = [];
                // 閒置武將
                targetPlayer.officers.forEach(id => {
                    let o = getOfficer(id);
                    let sum = 0;
                    for (let i = 1; i <= 6; i++) sum += o.stats[i];
                    targetOfficers.push({ id: o.id, name: o.name, total: sum });
                });
                // 守城武將
                MAP_DATA.forEach(land => {
                    if (land.owner === targetPlayer.id) {
                        land.defenders.forEach(id => {
                            let o = getOfficer(id);
                            let sum = 0;
                            for (let i = 1; i <= 6; i++) sum += o.stats[i];
                            targetOfficers.push({ id: o.id, name: o.name, total: sum });
                        });
                    }
                });
                let candidates = targetOfficers.sort((a, b) => b.total - a.total).slice(0, 5);
                if (candidates.length > 0) {
                    let shuffled = candidates.sort(() => 0.5 - Math.random());
                    let victims = shuffled.slice(0, 3);
                    let victimNames = [];
                    victims.forEach(v => {
                        let victim = getOfficer(v.id);
                        victim.injuryRate = 99; // 99% 傷勢
                        victimNames.push(victim.name);
                    });
                    log(`🏹 暗箭噴射！${targetPlayer.name} 麾下的 ${victimNames.join('、')} 遭到伏擊，負傷累累！(健康度僅剩 1%)`);
                } else {
                    log(`${targetPlayer.name} 帳下無將，逃過一劫。`);
                }
                consumeItem(player, itemInfo.index);
                GAME_STATE.isWaitingForAction = false;
            };
            if (isBot && aiTarget) executeSabotage(aiTarget);
            else openTargetSelect('player', executeSabotage, player.id);
            break;
        case 5: // 臨陣磨槍: 攻城 Buff
            log(`[提示] 此錦囊需在「發起攻城」時於武將選擇介面中勾選使用，無法於此處直接施放。`);
            GAME_STATE.isWaitingForAction = false;
            break;
        case 6: // 無懈可擊: 被動使用
            log(`[提示] 此為被動道具，將在敵方對您使用負面計謀時自動發動。`);
            GAME_STATE.isWaitingForAction = false;
            break;
        case 7: // 迴光返照: 治療
            const executeHeal = (targetOfficerId) => {
                let o = getOfficer(targetOfficerId);
                o.injuryRate = 0;
                log(`✨ 神醫再世！${o.name} 的傷勢已完全康復。`);
                consumeItem(player, itemInfo.index);
                GAME_STATE.isWaitingForAction = false;
            };
            if (isBot && aiTarget) executeHeal(aiTarget);
            else openTargetSelect('officer', executeHeal, player);
            break;
    }
}

function consumeItem(player, index) {
    player.items.splice(index, 1);
}

// 通用目標選擇介面
function openTargetSelect(type, callback, extra) {
    if (!UI.targetSelectList) return;
    UI.targetSelectList.innerHTML = '';
    UI.targetSelectTitle.textContent = type === 'land' ? '選擇傳送地點' : (type === 'player' ? '選擇施計對象' : '選擇治療對象');
    UI.targetSelectMessage.textContent = '請從清單中點選一個目標：';
    UI.btnTargetConfirm.disabled = true;
    let selectedTarget = null;

    if (type === 'land') {
        MAP_DATA.forEach(land => {
            const div = document.createElement('div');
            div.className = 'officer-item';
            div.innerHTML = `<strong>${land.name}</strong> (${land.id === 0 ? '起點' : land.id + '號地'})`;
            div.onclick = () => {
                document.querySelectorAll('#target-select-list .officer-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedTarget = land;
                UI.btnTargetConfirm.disabled = false;
            };
            UI.targetSelectList.appendChild(div);
        });
    } else if (type === 'player') {
        GAME_STATE.activePlayers.forEach(pid => {
            if (pid === extra) return; // 排除自己
            const p = GAME_STATE.players[pid];
            if (p.isBankrupt) return;
            const div = document.createElement('div');
            div.className = 'officer-item';
            div.innerHTML = `<strong>${p.name}</strong>`;
            div.onclick = () => {
                document.querySelectorAll('#target-select-list .officer-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedTarget = p;
                UI.btnTargetConfirm.disabled = false;
            };
            UI.targetSelectList.appendChild(div);
        });
    } else if (type === 'officer') {
        const player = extra;
        // 收集受傷的武將
        let injured = [];
        const check = (id) => {
            let o = getOfficer(id);
            if (o && o.injuryRate > 0) injured.push(o);
        };
        player.officers.forEach(check);
        MAP_DATA.forEach(land => {
            if (land.owner === player.id) land.defenders.forEach(check);
        });

        if (injured.length === 0) {
            log(`[提示] 您麾下目前沒有受傷的武將。`);
            GAME_STATE.isWaitingForAction = false;
            return;
        }

        injured.forEach(o => {
            const div = document.createElement('div');
            div.className = 'officer-item';
            div.innerHTML = `<strong>${o.name}</strong> (傷勢: ${o.injuryRate}%)`;
            div.onclick = () => {
                document.querySelectorAll('#target-select-list .officer-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedTarget = o.id;
                UI.btnTargetConfirm.disabled = false;
            };
            UI.targetSelectList.appendChild(div);
        });
    }

    UI.btnTargetConfirm.onclick = () => {
        UI.targetSelectModal.classList.add('hidden');
        callback(selectedTarget);
    };

    UI.btnTargetCancel.onclick = () => {
        UI.targetSelectModal.classList.add('hidden');
        GAME_STATE.isWaitingForAction = false;
    };

    UI.targetSelectModal.classList.remove('hidden');
}

let changanCurrentPlayer = null;
let changanOfferedIds = [];

function showChanganChoiceModal(player, offeredIds) {
    GAME_STATE.isWaitingForAction = true;
    changanCurrentPlayer = player;
    changanOfferedIds = offeredIds;

    UI.btnChanganGoRecruit.disabled = (offeredIds.length === 0);
    UI.changanChoiceModal.classList.remove('hidden');
}

// 綁定長安分歧選項按鈕
if (UI.btnChanganGoRecruit) UI.btnChanganGoRecruit.onclick = () => {
    UI.changanChoiceModal.classList.add('hidden');
    showChanganModal(changanCurrentPlayer, changanOfferedIds);
};

if (UI.btnChanganGoShop) UI.btnChanganGoShop.onclick = () => {
    UI.changanChoiceModal.classList.add('hidden');
    try {
        showChanganShopModal(changanCurrentPlayer);
    } catch(e) {
        console.error('showChanganShopModal error:', e);
        log(`[系統區] 道具店開啟失敗: ${e.message}`);
        GAME_STATE.isWaitingForAction = false;
        endTurn();
    }
};

if (UI.btnChanganLeave) UI.btnChanganLeave.onclick = () => {
    UI.changanChoiceModal.classList.add('hidden');
    log(`${changanCurrentPlayer.name} 視察了長安後，默默離開。`);
    GAME_STATE.isWaitingForAction = false;
    endTurn();
};

let shopSelectedItem = null;

function showChanganShopModal(player) {
    GAME_STATE.isWaitingForAction = true;
    changanCurrentPlayer = player;
    shopSelectedItem = null;
    UI.changanItemCost.textContent = '0';
    UI.btnChanganBuyItem.disabled = true;
    UI.changanItemList.innerHTML = '';

    if (typeof ITEMS_DATA === 'undefined') {
        log(`[系統區] 道具資料未載入，無法開啟道具店。`);
        UI.changanItemShopModal.classList.add('hidden');
        GAME_STATE.isWaitingForAction = false;
        endTurn();
        return;
    }

    Object.values(ITEMS_DATA).forEach(item => {
        const div = document.createElement('div');
        div.className = 'officer-item';
        div.style.textAlign = 'left';

        const alreadyOwned = player.items.some(it => it.id === item.id);
        if (alreadyOwned) {
            div.style.opacity = 0.5;
            div.innerHTML = `<strong>${item.name}</strong> <span style="color:#f44336;">(已擁有)</span><br><small>${item.desc}</small>`;
        } else {
            div.innerHTML = `<strong>${item.name}</strong> <span style="float:right;">$${item.price}</span><br><small>${item.desc}</small>`;
            div.onclick = () => {
                // Deselect all
                document.querySelectorAll('#changan-item-list .officer-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                shopSelectedItem = item;
                UI.changanItemCost.textContent = item.price;
                if (player.money >= item.price) {
                    UI.btnChanganBuyItem.disabled = false;
                    UI.changanItemCost.style.color = 'inherit';
                } else {
                    UI.btnChanganBuyItem.disabled = true;
                    UI.changanItemCost.style.color = '#ff1744';
                }
            };
        }
        UI.changanItemList.appendChild(div);
    });

    UI.changanItemShopModal.classList.remove('hidden');
}

if (UI.btnChanganBuyItem) UI.btnChanganBuyItem.onclick = () => {
    if (!shopSelectedItem) return;
    if (changanCurrentPlayer.money < shopSelectedItem.price) return;

    updateMoney(changanCurrentPlayer.id, -shopSelectedItem.price);
    changanCurrentPlayer.items.push({ ...shopSelectedItem });
    log(`🎁 奇珍異寶！${changanCurrentPlayer.name} 花費了 $${shopSelectedItem.price} 購買了道具【${shopSelectedItem.name}】！`);

    UI.changanItemShopModal.classList.add('hidden');
    GAME_STATE.isWaitingForAction = false;
    endTurn();
};

if (UI.btnChanganShopCancel) UI.btnChanganShopCancel.onclick = () => {
    UI.changanItemShopModal.classList.add('hidden');
    log(`${changanCurrentPlayer.name} 逛了逛市集，什麼也沒買就離開了。`);
    GAME_STATE.isWaitingForAction = false;
    endTurn();
};

// Phase 69: 城池通用 AI (招募與買道具)
function handleCityMenuAI(player, offeredIds, cityName) {
    GAME_STATE.isWaitingForAction = true;
    const reserveFund = 2000;
    
    // AI 判斷是否招募
    let canRecruit = false;
    let targetOfficer = null;
    let officerCost = 0;

    if (offeredIds.length > 0) {
        let availableList = offeredIds.map(id => {
            const o = getOfficer(id);
            let cost = 0;
            for (let i = 1; i <= 6; i++) cost += o.stats[i];
            if (OFFICER_SKILLS[id]) {
                let power = getSkillPowerPercentage(OFFICER_SKILLS[id]);
                cost = power > 9 ? cost * 2 : Math.floor(cost * 1.5);
            }
            return { id: o.id, name: o.name, cost: cost };
        });
        availableList.sort((a, b) => b.cost - a.cost);
        if (availableList.length > 0 && (player.money - availableList[0].cost) >= reserveFund) {
            canRecruit = true;
            targetOfficer = availableList[0];
            officerCost = targetOfficer.cost;
        }
    }

    // AI 判斷是否買道具
    let canBuyItem = false;
    let targetItem = null;
    let itemOptions = Object.values(ITEMS_DATA).filter(it => !player.items.some(pi => pi.id === it.id));
    if (itemOptions.length > 0 && (player.money - 1000) >= 1500) {
        canBuyItem = true;
        // 隨機挑個道具
        targetItem = itemOptions[Math.floor(Math.random() * itemOptions.length)];
    }

    setTimeout(() => {
        try {
            if (canRecruit && (!canBuyItem || Math.random() < 0.6)) {
                // 傾向招募 (60%)
                playRecruitAnimation(targetOfficer.name, player.name);

                setTimeout(() => {
                    updateMoney(player.id, -officerCost);
                    GAME_STATE.changanOfficers = GAME_STATE.changanOfficers.filter(id => id !== targetOfficer.id);
                    player.officers.push(targetOfficer.id);
                    updateOfficerCountUI(player.id);
                    log(`🎉 [電腦] ${player.name} 在${cityName}花費了 $${officerCost} 招募了在野武將【${targetOfficer.name}】！`);
                    GAME_STATE.isWaitingForAction = false;
                    endTurn();
                }, 1000);
            } else if (canBuyItem) {
                updateMoney(player.id, -targetItem.price);
                player.items.push({ ...targetItem });
                log(`🎁 奇珍異寶！[電腦] ${player.name} 在${cityName}花費 $${targetItem.price} 購買了道具【${targetItem.name}】！`);
                GAME_STATE.isWaitingForAction = false;
                endTurn();
            } else {
                log(`${player.name} 視察了${cityName}後，默默離開。`);
                GAME_STATE.isWaitingForAction = false;
                endTurn();
            }
        } catch (e) {
            console.error(e);
            endTurn();
        }
    }, 1500);
}

// 啟動點
window.onload = initGame;


// --- 武將圖鑑系統 (Phase 14) ---
let currentSortKey = 'id';
let currentSortOrder = 1; // 1 = ASC, -1 = DESC

function openEncyclopedia() {
    renderEncyclopedia();
    UI.encyclopediaModal.classList.remove('hidden');
}

function renderEncyclopedia() {
    UI.encyclopediaTbody.innerHTML = '';

    const factionMap = { 1: "蜀國", 2: "魏國", 3: "吳國", 4: "群雄" };

    // 計算動態總和與即時陣營 (Phase 23)
    let displayData = OFFICERS_DATA.map(o => {
        let total = 0;
        for (let i = 1; i <= 6; i++) total += o.stats[i]; // 使用原始成長後數值計算基底總合

        // 尋找當前所屬活體玩家
        let currentOwnerId = null;

        // 1. 先檢索玩家手中的閒置武將
        for (let pid in GAME_STATE.players) {
            let p = GAME_STATE.players[pid];
            if (p && !p.isBankrupt && p.officers.includes(o.id)) {
                currentOwnerId = parseInt(pid);
                break;
            }
        }

        // 2. 若不在閒置區，則檢索全地圖的守城武將
        if (!currentOwnerId) {
            for (let i = 0; i < MAP_DATA.length; i++) {
                let land = MAP_DATA[i];
                if (land.owner && land.defenders && land.defenders.includes(o.id)) {
                    // 若這塊地的物主尚未破產，則該守軍屬於該物主
                    let ownerPlayer = GAME_STATE.players[land.owner];
                    if (ownerPlayer && !ownerPlayer.isBankrupt) {
                        currentOwnerId = land.owner;
                        break;
                    }
                }
            }
        }

        let fname = currentOwnerId ? factionMap[currentOwnerId] : "在野";
        let fcolor = currentOwnerId ? `var(--faction-${currentOwnerId})` : "#999";

        return {
            ...o,
            dynTotal: total,
            dynFaction: fname,
            dynFactionColor: fcolor
        };
    });

    // 複製一份陣列用來排序
    let sortedOfficers = displayData.sort((a, b) => {
        let valA, valB;
        if (['1', '2', '3', '4', '5', '6'].includes(currentSortKey)) {
            valA = a.stats[currentSortKey];
            valB = b.stats[currentSortKey];
        } else if (currentSortKey === 'total') {
            valA = a.dynTotal;
            valB = b.dynTotal;
        } else if (currentSortKey === 'battle') { // Phase 26
            valA = a.battleCount;
            valB = b.battleCount;
        } else if (currentSortKey === 'winrate') { // Phase 26
            valA = a.battleCount > 0 ? a.winCount / a.battleCount : -1;
            valB = b.battleCount > 0 ? b.winCount / b.battleCount : -1;
        } else if (currentSortKey === 'faction') {
            valA = a.dynFaction;
            valB = b.dynFaction;
        } else {
            valA = a[currentSortKey];
            valB = b[currentSortKey];
        }

        // 字串比較 (姓名、陣營)
        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * currentSortOrder;
        }
        return (valA - valB) * currentSortOrder;
    });

    sortedOfficers.forEach(o => {
        const tr = document.createElement('tr');

        let skillText = "-";
        if (OFFICER_SKILLS[o.id]) {
            skillText = `<strong style="color:var(--primary-color)">【${OFFICER_SKILLS[o.id].name}】</strong> ${OFFICER_SKILLS[o.id].desc}`;
        }

        let winRateStr = o.battleCount > 0 ? Math.round((o.winCount / o.battleCount) * 100) + '%' : '-';

        tr.innerHTML = `
            <td>${o.id}</td>
            <td style="font-weight:bold;">${o.name}</td>
            <td style="color: ${o.dynFactionColor}; font-weight:bold;">${o.dynFaction}</td>
            <td>${formatStatDisplay(o.baseStats[1], o.stats[1], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[2], o.stats[2], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[3], o.stats[3], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[4], o.stats[4], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[5], o.stats[5], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[6], o.stats[6], o.injuryRate)}</td>
            <td style="font-weight:bold; color:var(--ink-dark);">${o.dynTotal}</td>
            <td style="text-align:center;">${o.battleCount}</td>
            <td style="text-align:center;">${winRateStr}</td>
            <td class="desc-col">${skillText}</td>
        `;
        UI.encyclopediaTbody.appendChild(tr);
    });
}

function setupEncyclopediaSort() {
    const headers = document.querySelectorAll('.encyclopedia-table th.sortable');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort');
            if (currentSortKey === sortKey) {
                currentSortOrder *= -1; // 反轉順序
            } else {
                currentSortKey = sortKey;
                currentSortOrder = -1;  // 預設切換時用降冪排列數字 (比較直觀看最強)
                if (sortKey === 'id' || sortKey === 'name') currentSortOrder = 1;
            }
            renderEncyclopedia();
        });
    });
}
