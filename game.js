/**
 * 三國大富翁 - 核心邏輯
 * 安全性注意:
 * - 狀態完全存放於記憶體變數中，不依賴 DOM 的 textContent 來計算金額
 * - 增加 parseInt() 確保運算安全，預防 XSS 及型別錯誤
 */

// 武將特技定義
const OFFICER_SKILLS = {
    // 蜀國
    100: { name: "漢室宗親", desc: "團隊全能力+3%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.03); } }, // 劉備
    101: { name: "武聖", desc: "團隊武力+5%、統率+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); stats[3] = Math.ceil(stats[3] * 1.05); } }, // 關羽
    102: { name: "萬人敵", desc: "團隊武力+10%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.10); } }, // 張飛
    106: { name: "臥龍", desc: "團隊智力+10%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.10); } }, // 諸葛亮
    // 魏國
    200: { name: "亂世奸雄", desc: "團隊全能力+3%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.03); } }, // 曹操
    203: { name: "威震逍遙", desc: "團隊統率+10%", effect: (stats) => { stats[3] = Math.ceil(stats[3] * 1.10); } }, // 張遼
    206: { name: "深謀遠慮", desc: "團隊運氣+5%、政治+5%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.05); stats[4] = Math.ceil(stats[4] * 1.05); } }, // 司馬懿
    212: { name: "古之惡來", desc: "團隊武力+10%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.10); } }, // 典韋
    // 吳國
    300: { name: "江東之主", desc: "團隊全能力+3%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.03); } }, // 孫權
    301: { name: "雅量高致", desc: "團隊智力+5%、魅力+5%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.05); stats[5] = Math.ceil(stats[5] * 1.05); } }, // 周瑜
    320: { name: "小霸王", desc: "團隊武力+5%、魅力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); stats[5] = Math.ceil(stats[5] * 1.05); } }, // 孫策
    302: { name: "宏碁大略", desc: "團隊政治+10%", effect: (stats) => { stats[4] = Math.ceil(stats[4] * 1.10); } }, // 魯肅
    // 群雄
    400: { name: "魔王", desc: "團隊武/智/統/政/運+4%，魅力-5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.04); stats[2] = Math.ceil(stats[2] * 1.04); stats[3] = Math.ceil(stats[3] * 1.04); stats[4] = Math.ceil(stats[4] * 1.04); stats[6] = Math.ceil(stats[6] * 1.04); stats[5] = Math.floor(stats[5] * 0.95); } }, // 董卓
    401: { name: "飛將", desc: "團隊武力+10%/統御+5%，智力-5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.10); stats[3] = Math.ceil(stats[3] * 1.05); stats[2] = Math.floor(stats[2] * 0.95); } }, // 呂布
    402: { name: "閉月", desc: "團隊魅力+10%", effect: (stats) => { stats[5] = Math.ceil(stats[5] * 1.10); } }, // 貂蟬
    403: { name: "名門", desc: "團隊運氣+10%/政治+5%，統御-5%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.10); stats[4] = Math.ceil(stats[4] * 1.05); stats[3] = Math.floor(stats[3] * 0.95); } } // 袁紹
};

// 遊戲資料模型
const GAME_STATE = {
    currentPlayer: 1, // 1: 劉備, 2: 曹操, 3: 孫權
    isWaitingForAction: false,
    gameOver: false,
    activePlayers: [1, 2, 3, 4], // 記錄存活玩家的 ID
    changanOfficers: [], // 流亡長安的在野武將 (Phase 15)
    players: {
        1: { id: 1, name: "劉備", money: 10000, position: 0, colorClass: 'p1', nameClass: 'p1-text', isBot: false, isBankrupt: false, officers: [] },
        2: { id: 2, name: "曹操", money: 10000, position: 0, colorClass: 'p2', nameClass: 'p2-text', isBot: false, isBankrupt: false, officers: [] },
        3: { id: 3, name: "孫權", money: 10000, position: 0, colorClass: 'p3', nameClass: 'p3-text', isBot: false, isBankrupt: false, officers: [] },
        4: { id: 4, name: "董卓", money: 10000, position: 0, colorClass: 'p4', nameClass: 'p4-text', isBot: false, isBankrupt: false, officers: [] }
    }
};

// 屬性對應: 1:武力, 2:智力, 3:統率, 4:政治, 5:魅力, 6:運氣
const OFFICERS_DATA = [
    // 蜀國 (1)
    { id: 100, name: "劉備", faction: 1, stats: { 1: 75, 2: 79, 3: 81, 4: 83, 5: 98, 6: 100 } },
    { id: 101, name: "關羽", faction: 1, stats: { 1: 96, 2: 76, 3: 96, 4: 63, 5: 93, 6: 61 } },
    { id: 102, name: "張飛", faction: 1, stats: { 1: 96, 2: 30, 3: 85, 4: 22, 5: 46, 6: 51 } },
    { id: 103, name: "趙雲", faction: 1, stats: { 1: 96, 2: 77, 3: 92, 4: 66, 5: 80, 6: 86 } },
    { id: 104, name: "馬超", faction: 1, stats: { 1: 96, 2: 44, 3: 88, 4: 27, 5: 81, 6: 41 } },
    { id: 105, name: "黃忠", faction: 1, stats: { 1: 94, 2: 60, 3: 87, 4: 52, 5: 75, 6: 55 } },
    { id: 106, name: "諸葛亮", faction: 1, stats: { 1: 38, 2: 98, 3: 96, 4: 96, 5: 93, 6: 80 } },
    { id: 107, name: "龐統", faction: 1, stats: { 1: 34, 2: 96, 3: 85, 4: 86, 5: 69, 6: 31 } },
    { id: 108, name: "徐庶", faction: 1, stats: { 1: 65, 2: 93, 3: 84, 4: 81, 5: 82, 6: 70 } },
    { id: 109, name: "魏延", faction: 1, stats: { 1: 92, 2: 70, 3: 86, 4: 46, 5: 39, 6: 46 } },
    { id: 110, name: "姜維", faction: 1, stats: { 1: 90, 2: 91, 3: 88, 4: 68, 5: 80, 6: 65 } },
    { id: 111, name: "法正", faction: 1, stats: { 1: 48, 2: 94, 3: 82, 4: 78, 5: 56, 6: 59 } },
    { id: 112, name: "馬岱", faction: 1, stats: { 1: 85, 2: 55, 3: 80, 4: 47, 5: 65, 6: 49 } },
    { id: 113, name: "王平", faction: 1, stats: { 1: 77, 2: 76, 3: 83, 4: 58, 5: 61, 6: 69 } },
    { id: 114, name: "關平", faction: 1, stats: { 1: 82, 2: 67, 3: 76, 4: 60, 5: 75, 6: 55 } },
    { id: 115, name: "周倉", faction: 1, stats: { 1: 81, 2: 42, 3: 64, 4: 33, 5: 58, 6: 44 } },
    { id: 116, name: "嚴顏", faction: 1, stats: { 1: 82, 2: 70, 3: 80, 4: 64, 5: 74, 6: 60 } },
    { id: 117, name: "孟獲", faction: 1, stats: { 1: 85, 2: 41, 3: 76, 4: 43, 5: 75, 6: 50 } },
    { id: 118, name: "祝融", faction: 1, stats: { 1: 85, 2: 29, 3: 74, 4: 24, 5: 54, 6: 60 } },
    { id: 119, name: "蔣琬", faction: 1, stats: { 1: 32, 2: 83, 3: 77, 4: 92, 5: 81, 6: 73 } },
    { id: 120, name: "董允", faction: 1, stats: { 1: 29, 2: 81, 3: 62, 4: 91, 5: 78, 6: 70 } },
    // 魏國 (2)
    { id: 200, name: "曹操", faction: 2, stats: { 1: 71, 2: 92, 3: 96, 4: 91, 5: 95, 6: 85 } },
    { id: 201, name: "夏侯惇", faction: 2, stats: { 1: 89, 2: 57, 3: 90, 4: 73, 5: 87, 6: 47 } },
    { id: 202, name: "夏侯淵", faction: 2, stats: { 1: 92, 2: 52, 3: 91, 4: 62, 5: 80, 6: 46 } },
    { id: 203, name: "張遼", faction: 2, stats: { 1: 91, 2: 76, 3: 96, 4: 58, 5: 85, 6: 81 } },
    { id: 204, name: "徐晃", faction: 2, stats: { 1: 86, 2: 77, 3: 84, 4: 49, 5: 72, 6: 67 } },
    { id: 205, name: "張郃", faction: 2, stats: { 1: 90, 2: 71, 3: 89, 4: 51, 5: 74, 6: 61 } },
    { id: 206, name: "司馬懿", faction: 2, stats: { 1: 62, 2: 99, 3: 96, 4: 94, 5: 86, 6: 86 } },
    { id: 207, name: "郭嘉", faction: 2, stats: { 1: 18, 2: 99, 3: 84, 4: 85, 5: 77, 6: 40 } },
    { id: 208, name: "荀彧", faction: 2, stats: { 1: 17, 2: 95, 3: 51, 4: 96, 5: 90, 6: 63 } },
    { id: 209, name: "荀攸", faction: 2, stats: { 1: 24, 2: 94, 3: 75, 4: 90, 5: 79, 6: 69 } },
    { id: 210, name: "賈詡", faction: 2, stats: { 1: 48, 2: 94, 3: 88, 4: 87, 5: 54, 6: 59 } },
    { id: 211, name: "許褚", faction: 2, stats: { 1: 96, 2: 32, 3: 63, 4: 21, 5: 58, 6: 53 } },
    { id: 212, name: "典韋", faction: 2, stats: { 1: 96, 2: 34, 3: 48, 4: 26, 5: 58, 6: 40 } },
    { id: 213, name: "龐德", faction: 2, stats: { 1: 94, 2: 71, 3: 79, 4: 45, 5: 67, 6: 46 } },
    { id: 214, name: "曹仁", faction: 2, stats: { 1: 85, 2: 58, 3: 88, 4: 46, 5: 75, 6: 66 } },
    { id: 215, name: "曹洪", faction: 2, stats: { 1: 77, 2: 44, 3: 79, 4: 34, 5: 62, 6: 60 } },
    { id: 216, name: "樂進", faction: 2, stats: { 1: 84, 2: 50, 3: 78, 4: 51, 5: 67, 6: 54 } },
    { id: 217, name: "李典", faction: 2, stats: { 1: 77, 2: 75, 3: 79, 4: 75, 5: 69, 6: 59 } },
    { id: 218, name: "于禁", faction: 2, stats: { 1: 79, 2: 69, 3: 83, 4: 58, 5: 55, 6: 32 } },
    { id: 219, name: "程昱", faction: 2, stats: { 1: 47, 2: 92, 3: 70, 4: 79, 5: 59, 6: 60 } },
    { id: 220, name: "滿寵", faction: 2, stats: { 1: 67, 2: 82, 3: 78, 4: 84, 5: 80, 6: 60 } },
    // 吳國 (21 人, 總計 8763 點)
    { id: 300, name: "孫權", faction: 3, stats: { 1: 64, 2: 77, 3: 72, 4: 84, 5: 92, 6: 77 } },
    { id: 301, name: "周瑜", faction: 3, stats: { 1: 66, 2: 94, 3: 93, 4: 82, 5: 90, 6: 78 } },
    { id: 302, name: "魯肅", faction: 3, stats: { 1: 52, 2: 88, 3: 65, 4: 91, 5: 94, 6: 82 } },
    { id: 303, name: "呂蒙", faction: 3, stats: { 1: 79, 2: 87, 3: 85, 4: 75, 5: 80, 6: 75 } },
    { id: 304, name: "陸遜", faction: 3, stats: { 1: 67, 2: 94, 3: 92, 4: 84, 5: 85, 6: 87 } },
    { id: 305, name: "甘寧", faction: 3, stats: { 1: 93, 2: 74, 3: 84, 4: 44, 5: 55, 6: 14 } },
    { id: 306, name: "太史慈", faction: 3, stats: { 1: 91, 2: 64, 3: 79, 4: 54, 5: 76, 6: 57 } },
    { id: 307, name: "黃蓋", faction: 3, stats: { 1: 81, 2: 68, 3: 77, 4: 63, 5: 78, 6: 62 } },
    { id: 308, name: "程普", faction: 3, stats: { 1: 77, 2: 77, 3: 83, 4: 72, 5: 84, 6: 78 } },
    { id: 309, name: "韓當", faction: 3, stats: { 1: 83, 2: 54, 3: 74, 4: 49, 5: 67, 6: 54 } },
    { id: 310, name: "周泰", faction: 3, stats: { 1: 90, 2: 42, 3: 80, 4: 36, 5: 58, 6: 41 } },
    { id: 311, name: "蔣欽", faction: 3, stats: { 1: 82, 2: 50, 3: 76, 4: 51, 5: 63, 6: 52 } },
    { id: 312, name: "徐盛", faction: 3, stats: { 1: 79, 2: 76, 3: 81, 4: 65, 5: 74, 6: 61 } },
    { id: 313, name: "丁奉", faction: 3, stats: { 1: 78, 2: 71, 3: 79, 4: 60, 5: 71, 6: 52 } },
    { id: 314, name: "凌統", faction: 3, stats: { 1: 87, 2: 54, 3: 74, 4: 42, 5: 67, 6: 58 } },
    { id: 315, name: "潘璋", faction: 3, stats: { 1: 77, 2: 49, 3: 69, 4: 39, 5: 42, 6: 39 } },
    { id: 316, name: "朱然", faction: 3, stats: { 1: 75, 2: 65, 3: 79, 4: 61, 5: 68, 6: 58 } },
    { id: 317, name: "諸葛瑾", faction: 3, stats: { 1: 33, 2: 80, 3: 71, 4: 88, 5: 90, 6: 79 } },
    { id: 318, name: "張昭", faction: 3, stats: { 1: 22, 2: 83, 3: 31, 4: 95, 5: 88, 6: 79 } },
    { id: 319, name: "張紘", faction: 3, stats: { 1: 21, 2: 85, 3: 32, 4: 93, 5: 87, 6: 80 } },
    { id: 320, name: "孫策", faction: 3, stats: { 1: 92, 2: 69, 3: 88, 4: 70, 5: 90, 6: 53 } },
    // 群雄 (4)
    { id: 400, name: "董卓", faction: 4, stats: { 1: 88, 2: 75, 3: 67, 4: 54, 5: 42, 6: 37 } },
    { id: 401, name: "呂布", faction: 4, stats: { 1: 100, 2: 27, 3: 95, 4: 18, 5: 41, 6: 26 } },
    { id: 402, name: "貂蟬", faction: 4, stats: { 1: 24, 2: 83, 3: 74, 4: 88, 5: 95, 6: 94 } },
    { id: 403, name: "袁紹", faction: 4, stats: { 1: 70, 2: 71, 3: 84, 4: 74, 5: 91, 6: 82 } },
    { id: 404, name: "顏良", faction: 4, stats: { 1: 94, 2: 28, 3: 89, 4: 33, 5: 54, 6: 44 } },
    { id: 405, name: "文醜", faction: 4, stats: { 1: 95, 2: 25, 3: 90, 4: 31, 5: 53, 6: 41 } },
    { id: 406, name: "公孫瓚", faction: 4, stats: { 1: 85, 2: 70, 3: 82, 4: 66, 5: 78, 6: 65 } },
    { id: 407, name: "馬騰", faction: 4, stats: { 1: 84, 2: 53, 3: 81, 4: 58, 5: 86, 6: 74 } },
    { id: 408, name: "張角", faction: 4, stats: { 1: 28, 2: 88, 3: 89, 4: 87, 5: 97, 6: 96 } },
    { id: 409, name: "張寶", faction: 4, stats: { 1: 71, 2: 81, 3: 84, 4: 78, 5: 91, 6: 85 } },
    { id: 410, name: "張梁", faction: 4, stats: { 1: 81, 2: 70, 3: 82, 4: 61, 5: 84, 6: 76 } },
    { id: 411, name: "皇甫嵩", faction: 4, stats: { 1: 77, 2: 84, 3: 91, 4: 86, 5: 91, 6: 86 } },
    { id: 412, name: "盧植", faction: 4, stats: { 1: 66, 2: 91, 3: 86, 4: 90, 5: 93, 6: 88 } },
    { id: 413, name: "朱儁", faction: 4, stats: { 1: 74, 2: 80, 3: 84, 4: 82, 5: 87, 6: 85 } },
    { id: 414, name: "華雄", faction: 4, stats: { 1: 92, 2: 32, 3: 87, 4: 43, 5: 57, 6: 41 } },
    { id: 415, name: "陶謙", faction: 4, stats: { 1: 30, 2: 74, 3: 43, 4: 87, 5: 90, 6: 84 } },
    { id: 416, name: "孔融", faction: 4, stats: { 1: 23, 2: 81, 3: 30, 4: 93, 5: 89, 6: 86 } },
    { id: 417, name: "袁術", faction: 4, stats: { 1: 64, 2: 61, 3: 67, 4: 44, 5: 43, 6: 20 } },
    { id: 418, name: "紀靈", faction: 4, stats: { 1: 83, 2: 47, 3: 80, 4: 50, 5: 64, 6: 55 } },
    { id: 419, name: "高順", faction: 4, stats: { 1: 86, 2: 62, 3: 87, 4: 57, 5: 80, 6: 64 } },
    { id: 420, name: "陳宮", faction: 4, stats: { 1: 37, 2: 91, 3: 73, 4: 85, 5: 72, 6: 57 } },
];

// 替每位武將註冊不可變的 baseStats (Phase 17)，作為成長計算基準
OFFICERS_DATA.forEach(o => {
    o.baseStats = { ...o.stats };
});

// Phase 17: 戰鬥成長呈現輔助函式
function formatStatDisplay(base, current) {
    if (current > base) {
        return `${base} &nbsp;<span style="color: #ff5252; font-weight: bold;">(+${current - base})</span>`;
    }
    return `${base}`;
}

// 地圖資料 (10格)
const MAP_DATA = [
    { id: 0, name: "長安", type: "START", price: 0, owner: null },
    { id: 1, name: "洛陽", type: "LAND", price: 1000, toll: 500, owner: null, defenders: [] },
    { id: 2, name: "許昌", type: "LAND", price: 1200, toll: 600, owner: null, defenders: [] },
    { id: 3, name: "鄴城", type: "LAND", price: 1500, toll: 750, owner: null, defenders: [] },
    { id: 4, name: "下邳", type: "LAND", price: 1800, toll: 900, owner: null, defenders: [] },
    { id: 5, name: "臨淄", type: "LAND", price: 1600, toll: 800, owner: null, defenders: [] },
    { id: 6, name: "建業", type: "LAND", price: 2000, toll: 1000, owner: null, defenders: [] },
    { id: 7, name: "宛城", type: "LAND", price: 1200, toll: 600, owner: null, defenders: [] },
    { id: 8, name: "襄陽", type: "LAND", price: 1500, toll: 750, owner: null, defenders: [] },
    { id: 9, name: "成都", type: "LAND", price: 1800, toll: 900, owner: null, defenders: [] },
    { id: 10, name: "江州", type: "LAND", price: 1200, toll: 600, owner: null, defenders: [] },
    { id: 11, name: "漢中", type: "LAND", price: 1500, toll: 750, owner: null, defenders: [] },
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
    officerList: document.getElementById('officer-list'),
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
    changanTotalCost: document.getElementById('changan-total-cost')
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
    // 分配初始武將
    OFFICERS_DATA.forEach(officer => {
        GAME_STATE.players[officer.faction].officers.push(officer.id);
    });

    UI.btnRoll.addEventListener('click', handleRollDice);

    UI.btnModalYes.addEventListener('click', () => {
        hideModal();
        if (modalConfirmCallback) {
            modalConfirmCallback();
            modalConfirmCallback = null;
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
        if (officerConfirmCallback) {
            officerConfirmCallback([...selectedOfficers]);
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
                        if (o) info += `\n${o.name} (武:${o.stats[1]} 智:${o.stats[2]} 統:${o.stats[3]} 政:${o.stats[4]} 魅:${o.stats[5]} 運:${o.stats[6]})`;
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
}

let selectedPlayerCount = 1;
let humanFactions = [];

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

        // 如果電腦玩家（非人類），顯示其 UI 為電腦標記
        if (GAME_STATE.players[i].isBot) {
            const card = UI[`p${i}Card`];
            const strongElement = card.querySelector('.info strong');
            if (strongElement && !strongElement.textContent.includes('(電腦)')) {
                strongElement.textContent += " (電腦)";
            }
        }
    }

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

    if (currentPlayer.isBot) {
        log(`[電腦] 輪到 ${currentPlayer.name} 回合...`);
        setTimeout(() => {
            handleRollDice();
        }, 1500); // AI 等待 1.5 秒後擲骰
    }
}

// 擲骰子
function handleRollDice() {
    if (GAME_STATE.isWaitingForAction || GAME_STATE.gameOver) return;

    enableRollButton(false);
    UI.dice.classList.add('rolling');

    // 模擬擲骰延遲
    setTimeout(() => {
        UI.dice.classList.remove('rolling');
        const rollResult = Math.floor(Math.random() * 6) + 1; // 1-6
        UI.dice.textContent = DICE_FACES[rollResult - 1];

        const player = GAME_STATE.players[GAME_STATE.currentPlayer];
        log(`${player.name} 擲出了 ${rollResult} 點。`);

        movePlayer(player, rollResult);
    }, 600);
}

// 移動玩家格子
function movePlayer(player, steps) {
    let oldPos = player.position;
    let newPos = (oldPos + steps) % 12;

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
    if (landInfo.type === "START") {
        if (GAME_STATE.changanOfficers.length > 0) {
            log(`${player.name} 抵達起點長安。發現城中有 ${GAME_STATE.changanOfficers.length} 名在野武將！`);
            if (player.isBot) {
                handleChanganRecruitAI(player);
            } else {
                showChanganModal(player);
            }
        } else {
            log(`${player.name} 停在起點長安，稍作休息。`);
            endTurn();
        }
        return;
    }

    if (landInfo.owner === null) {
        // 無人土地
        if (player.money >= landInfo.price && player.officers.length > 0) {
            if (player.isBot) {
                try {
                    // AI 自動購買邏輯
                    log(`[追蹤] 1. 準備佔領`);
                    log(`[電腦] ${player.name} 自動佔領了 ${landInfo.name}。`);
                    let sendCount = Math.floor(Math.random() * 3) + 1;
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
                    `是否花費 $${landInfo.price} 佔領 ${landInfo.name}？\n需派駐至少1名武將。`,
                    () => {
                        // 打開選將畫面
                        showOfficerModal(
                            `派駐守將 - ${landInfo.name}`,
                            `請選擇 1~3 名武將駐防 ${landInfo.name} (佔領需花費 $${landInfo.price})`,
                            player,
                            (selectedIds) => {
                                executeBuyLand(player, landInfo, selectedIds);
                            },
                            () => {
                                log(`${player.name} 放棄佔領 ${landInfo.name}。`);
                                endTurn();
                            },
                            false
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
            log(`${player.name} 停在 ${landInfo.name}，但資金不足無法佔領。`);
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
                        true // allowZero
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

        log(`${player.name} 來到 ${owner.name} 的領地 ${landInfo.name}，防守兵力：${landInfo.defenders.length}將！\n可繳交軍費 $${toll} 或 發起攻城！`);

        if (player.isBot) {
            // AI 自動抉擇：計算所有可能派出的 1~3 名武將組合
            // 如果有一組陣容能在 6 個屬性中贏過對手至少 4 項 (>50% 勝率)，則發起攻城
            const bestTeam = getBestSiegeTeam(player.officers, landInfo.defenders);
            if (bestTeam) {
                log(`[電腦] ${player.name} 評估勝算極高，決定發起攻城！`);
                setTimeout(() => { executeSiege(player, landInfo, bestTeam); }, 1500);
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
                        (selectedIds) => {
                            executeSiege(player, landInfo, selectedIds);
                        },
                        () => {
                            // 取消攻城就乖乖付錢
                            payToll(player, owner, toll);
                        },
                        true, // 顯示取消按鈕 (轉換回付費)
                        true, // isSiege
                        landInfo.defenders // defIds
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
        updateMoney(player.id, -landInfo.price);
        landInfo.owner = player.id;

        // 轉移武將
        landInfo.defenders = selectedIds;
        player.officers = player.officers.filter(id => id != null && !selectedIds.includes(id));
        updateOfficerCountUI(player.id);

        log(`${player.name} 佔領了 ${landInfo.name}！派駐 ${selectedIds.length} 名武將守城。`);

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
function getBestSiegeTeam(attackerOfficerIds, defenderIds) {
    let bestTeam = null;
    let maxWins = 2; // AI 在預估勝率 >= 50%（大於 49%，即贏得至少 3 項屬性）便會發起攻城

    const defStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    defenderIds.forEach(id => {
        const o = getOfficer(id);
        if (o) for (let i = 1; i <= 6; i++) defStats[i] += o.stats[i];
    });

    // 套用防守方團隊特技
    applyTeamSkills(defenderIds, defStats);

    // 防守方 3% 能力加成 (套用完武將特技後再疊加地理優勢)
    for (let i = 1; i <= 6; i++) defStats[i] = Math.ceil(defStats[i] * 1.03);

    const evaluateTeamWinRate = (teamIds) => {
        let wins = 0;
        const atkStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        teamIds.forEach(id => {
            const o = getOfficer(id);
            if (o) for (let i = 1; i <= 6; i++) atkStats[i] += o.stats[i];
        });

        // 套用攻方團隊特技
        applyTeamSkills(teamIds, atkStats);

        for (let i = 1; i <= 6; i++) {
            if (atkStats[i] > defStats[i]) wins++;
        }
        return wins;
    };

    const officers = attackerOfficerIds.filter(id => id != null);
    const n = Math.min(officers.length, 20);

    // 1 人組合
    for (let i = 0; i < n; i++) {
        let team = [officers[i]];
        let wins = evaluateTeamWinRate(team);
        if (wins > maxWins) { maxWins = wins; bestTeam = team; }
    }
    // 2 人組合
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            let team = [officers[i], officers[j]];
            let wins = evaluateTeamWinRate(team);
            if (wins > maxWins) { maxWins = wins; bestTeam = team; }
        }
    }
    // 3 人組合
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            for (let k = j + 1; k < n; k++) {
                let team = [officers[i], officers[j], officers[k]];
                let wins = evaluateTeamWinRate(team);
                if (wins > maxWins) { maxWins = wins; bestTeam = team; }
            }
        }
    }

    return bestTeam;
}

// 執行攻城結算
function executeSiege(attacker, landInfo, attackingIds) {
    const defenderId = landInfo.owner;
    const defender = GAME_STATE.players[defenderId];
    const defendingIds = landInfo.defenders;

    // 攻城方必定扣除閒置武將
    attacker.officers = attacker.officers.filter(id => id != null && !attackingIds.includes(id));
    updateOfficerCountUI(attacker.id);

    // 電腦擲骰決定比拚項目
    const statRoll = Math.floor(Math.random() * 6) + 1;
    const statNames = { 1: '武力', 2: '智力', 3: '統率', 4: '政治', 5: '魅力', 6: '運氣' };
    const statName = statNames[statRoll];

    let attackerScore = 0;
    const atkTempStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    attackingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { for (let i = 1; i <= 6; i++) atkTempStats[i] += o.stats[i]; }
    });
    applyTeamSkills(attackingIds, atkTempStats);
    attackerScore = atkTempStats[statRoll];

    let defenderScore = 0;
    const defTempStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    defendingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { for (let i = 1; i <= 6; i++) defTempStats[i] += o.stats[i]; }
    });
    applyTeamSkills(defendingIds, defTempStats);
    defenderScore = defTempStats[statRoll];

    // 防守方 3% 加成 (特技加成後再算地理優勢)
    defenderScore = Math.ceil(defenderScore * 1.03);

    // 結算勝負與成長機制 (平局算攻方敗)
    let isAttackerWin = attackerScore > defenderScore;
    let winningTeamIds = isAttackerWin ? attackingIds : defendingIds;
    let growthHtml = "";

    winningTeamIds.forEach(id => {
        if (Math.random() < 0.5) {
            const o = getOfficer(id);
            if (o) {
                o.stats[statRoll] += 1;
                growthHtml += `<div style="font-size: 14px; margin-top: 5px;">⬆️ <strong>${o.name}</strong> 的【${statName}】提升了 1 點！</div>`;
                log(`✨ ${o.name} 在戰鬥中得到了成長，【${statName}】提升了 1 點！`);
            }
        }
    });

    let resultHtml = `系統擲出 ${statRoll} 點，決定比拚【${statName}】！<br>攻方 (${attackerScore} 點) VS 守方加成後 (${defenderScore} 點)！`;
    if (growthHtml) {
        resultHtml += `<div style="margin-top: 15px; padding: 10px; background: rgba(76, 175, 80, 0.2); border: 1px solid #4CAF50; border-radius: 5px;">
            <div style="color: #4CAF50; font-weight: bold; margin-bottom: 5px;">【戰鬥成長】</div>
            ${growthHtml}
        </div>`;
    }

    GAME_STATE.isWaitingForAction = true;
    showModal(
        `攻城戰報 - 比拚【${statName}】`,
        resultHtml,
        () => {
            if (isAttackerWin) {
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

    if (attacker.isBot) {
        setTimeout(() => {
            try {
                const btn = document.getElementById('btn-modal-yes');
                if (btn) btn.click();
            } catch (e) {
                console.error("AI click modal error:", e);
                endTurn(); // fallback
            }
        }, 1500);
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

// 處理團隊特技光環加成
function applyTeamSkills(teamIds, teamStats) {
    teamIds.forEach(id => {
        if (OFFICER_SKILLS[id]) {
            OFFICER_SKILLS[id].effect(teamStats);
        }
    });
}

function endTurn() {
    if (GAME_STATE.gameOver) return;

    try {
        // 尋找下一個未破產的玩家
        let currentIdx = GAME_STATE.activePlayers.indexOf(GAME_STATE.currentPlayer);
        let nextIdx = (currentIdx + 1) % GAME_STATE.activePlayers.length;
        GAME_STATE.currentPlayer = GAME_STATE.activePlayers[nextIdx];

        const nextPlayer = GAME_STATE.players[GAME_STATE.currentPlayer];

        // 更新 UI 顯示 (四人版)
        UI.p1Card.classList.toggle('active', GAME_STATE.currentPlayer === 1);
        UI.p2Card.classList.toggle('active', GAME_STATE.currentPlayer === 2);
        UI.p3Card.classList.toggle('active', GAME_STATE.currentPlayer === 3);
        if (UI.p4Card) UI.p4Card.classList.toggle('active', GAME_STATE.currentPlayer === 4);

        UI.currentTurnName.textContent = nextPlayer.name;
        UI.currentTurnName.className = nextPlayer.nameClass;

        log(`現在輪到 ${nextPlayer.name} 回合。`);

        checkTurn();
    } catch (e) {
        console.error("endTurn error:", e);
        log(`[系統區] endTurn 時發生未預期錯誤，遊戲進度可能中斷。`);
    }
}

// UI 輔助
function enableRollButton(enable) {
    UI.btnRoll.disabled = !enable;
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

function showOfficerModal(title, message, player, onConfirm, onCancel, showCancelBtn = false, isSiege = false, defIds = [], allowZero = false) {
    GAME_STATE.isWaitingForAction = true;
    selectedOfficers = [];
    maxSelectableOfficers = 3;
    window.allowZeroSelection = allowZero;

    UI.officerModalTitle.textContent = title;
    UI.officerModalMessage.textContent = message;

    // 如果是攻城模式，準備勝率顯示 UI
    let winRateEl = document.getElementById('officer-win-rate');
    if (!winRateEl) {
        winRateEl = document.createElement('p');
        winRateEl.id = 'officer-win-rate';
        winRateEl.style.fontWeight = 'bold';
        winRateEl.style.color = '#c0392b';
        winRateEl.style.marginTop = '10px';
        UI.officerList.parentNode.insertBefore(winRateEl, UI.officerList);
    }

    if (isSiege) {
        winRateEl.style.display = 'block';
        winRateEl.textContent = '預估勝率：請先選擇武將...';
        window.currentDefIds = defIds;
    } else {
        winRateEl.style.display = 'none';
        window.currentDefIds = [];
    }

    // 生成武將清單 UI
    UI.officerList.innerHTML = '';
    player.officers.forEach(id => {
        const o = getOfficer(id);
        if (!o) return;

        let skillHtml = "";
        if (OFFICER_SKILLS[id]) {
            const skill = OFFICER_SKILLS[id];
            skillHtml = `<div style="font-size: 11px; margin-top: 5px; color: #ffeb3b; background: rgba(0,0,0,0.4); padding: 2px 5px; border-radius: 4px;">
                <strong>★${skill.name}★</strong>: ${skill.desc}
            </div>`;
        }

        const div = document.createElement('div');
        div.className = 'officer-item'; // Keep original class name
        div.innerHTML = `
            <strong>${o.name}</strong> 
            <div class="officer-stats">
                <span>武:${formatStatDisplay(o.baseStats[1], o.stats[1])}</span><span>智:${formatStatDisplay(o.baseStats[2], o.stats[2])}</span>
                <span>統:${formatStatDisplay(o.baseStats[3], o.stats[3])}</span><span>政:${formatStatDisplay(o.baseStats[4], o.stats[4])}</span>
                <span>魅:${formatStatDisplay(o.baseStats[5], o.stats[5])}</span><span>運:${formatStatDisplay(o.baseStats[6], o.stats[6])}</span>
            </div>
            ${skillHtml}
        `;
        div.onclick = () => toggleOfficerSelection(div, o.id);
        UI.officerList.appendChild(div);
    });

    UI.btnOfficerConfirm.disabled = !window.allowZeroSelection;
    UI.btnOfficerCancel.style.display = showCancelBtn ? 'inline-block' : 'none';

    officerConfirmCallback = onConfirm;
    officerCancelCallback = onCancel;

    UI.officerModal.classList.remove('hidden');
}

function hideOfficerModal() {
    UI.officerModal.classList.add('hidden');
    GAME_STATE.isWaitingForAction = false;
}

function toggleOfficerSelection(element, officerId) {
    const idx = selectedOfficers.indexOf(officerId);
    if (idx > -1) {
        // Deselect
        selectedOfficers.splice(idx, 1);
        element.classList.remove('selected');
    } else {
        // Select
        if (selectedOfficers.length >= maxSelectableOfficers) {
            return; // 達上限
        }
        selectedOfficers.push(officerId);
        element.classList.add('selected');
    }

    // 只要有選 1 人即可確認 (若 allowZeroSelection 為 true 則可為 0)
    UI.btnOfficerConfirm.disabled = !window.allowZeroSelection && selectedOfficers.length === 0;

    // 更新勝率顯示
    if (window.currentDefIds && window.currentDefIds.length > 0) {
        updateWinRateDisplay();
    }
}

function updateWinRateDisplay() {
    const el = document.getElementById('officer-win-rate');
    if (!el) return;

    if (selectedOfficers.length === 0) {
        el.textContent = '預估勝率：請先選擇武將...';
        return;
    }

    const defStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    window.currentDefIds.forEach(id => {
        const o = getOfficer(id);
        if (o) for (let i = 1; i <= 6; i++) defStats[i] += o.stats[i];
    });

    // 套用防守方團隊特技
    applyTeamSkills(window.currentDefIds, defStats);

    // 防守方 3% 能力加成 (套用完武將特技後再疊加地理優勢)
    for (let i = 1; i <= 6; i++) defStats[i] = Math.ceil(defStats[i] * 1.03);

    const atkStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    selectedOfficers.forEach(id => {
        const o = getOfficer(id);
        if (o) for (let i = 1; i <= 6; i++) atkStats[i] += o.stats[i];
    });

    // 套用攻方團隊特技
    applyTeamSkills(selectedOfficers, atkStats);

    let wins = 0;
    for (let i = 1; i <= 6; i++) {
        if (atkStats[i] > defStats[i]) wins++;
    }

    const rate = Math.round((wins / 6) * 100);
    el.textContent = `預估勝率：${rate}% (${wins} / 6 屬性佔優)`;
}

// -----------------------------------------------------------------------------
// 【Phase 15】 長安城武將招募系統
// -----------------------------------------------------------------------------
let changanSelectedOfficers = [];

function showChanganModal(player) {
    GAME_STATE.isWaitingForAction = true;
    changanSelectedOfficers = [];
    if (!UI.changanTotalCost) return;
    UI.changanTotalCost.textContent = '0';

    // 產生招募清單
    UI.changanOfficerList.innerHTML = '';
    GAME_STATE.changanOfficers.forEach(id => {
        const o = getOfficer(id);
        if (!o) return;

        // 計算招募費用 (六維總和)
        let cost = 0;
        for (let i = 1; i <= 6; i++) cost += o.stats[i];

        // 【Phase 15 更新規則】若武將擁有特技，招募金額需兩倍
        if (OFFICER_SKILLS[id]) {
            cost *= 2;
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
                <span>武:${formatStatDisplay(o.baseStats[1], o.stats[1])}</span><span>智:${formatStatDisplay(o.baseStats[2], o.stats[2])}</span>
                <span>統:${formatStatDisplay(o.baseStats[3], o.stats[3])}</span><span>政:${formatStatDisplay(o.baseStats[4], o.stats[4])}</span>
                <span>魅:${formatStatDisplay(o.baseStats[5], o.stats[5])}</span><span>運:${formatStatDisplay(o.baseStats[6], o.stats[6])}</span>
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

// 電腦玩長安招募
function handleChanganRecruitAI(player) {
    // 預算評估
    let availableList = GAME_STATE.changanOfficers.map(id => {
        const o = getOfficer(id);
        let cost = 0;
        for (let i = 1; i <= 6; i++) cost += o.stats[i];

        // 【Phase 15 更新規則】AI 同樣遵循特技將領招募金額兩倍的規則
        if (OFFICER_SKILLS[id]) {
            cost *= 2;
        }

        return { id: o.id, name: o.name, cost: cost };
    });

    // 由貴至賤排序 (AI 傾向招攬神將)
    availableList.sort((a, b) => b.cost - a.cost);

    let recruitedIds = [];
    let spent = 0;
    let currentMoney = player.money;

    // AI 保留 $2000 救命金
    const reserveFund = 2000;

    for (const item of availableList) {
        // 【Phase 15 更新規則】AI 每次抵達長安時，最多只能點選招募 1 名武將
        if (recruitedIds.length >= 1) break;

        if (currentMoney - item.cost >= reserveFund) {
            recruitedIds.push(item.id);
            spent += item.cost;
            currentMoney -= item.cost;
        }
    }

    if (recruitedIds.length > 0) {
        setTimeout(() => {
            updateMoney(player.id, -spent);
            recruitedIds.forEach(id => {
                player.officers.push(id);
                GAME_STATE.changanOfficers = GAME_STATE.changanOfficers.filter(cid => cid !== id);
            });
            updateOfficerCountUI(player.id);
            log(`[電腦] ${player.name} 財大氣粗，在長安城中一舉花費 $${spent} 招募了 ${recruitedIds.length} 名流亡武將！`);
            endTurn();
        }, 1500);
    } else {
        setTimeout(() => {
            log(`[電腦] ${player.name} 衡量資金與發展後，放棄在長安招募將領。`);
            endTurn();
        }, 1500);
    }
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

    // 複製一份陣列用來排序
    let sortedOfficers = [...OFFICERS_DATA].sort((a, b) => {
        let valA, valB;
        if (['1', '2', '3', '4', '5', '6'].includes(currentSortKey)) {
            valA = a.stats[currentSortKey];
            valB = b.stats[currentSortKey];
        } else {
            valA = a[currentSortKey];
            valB = b[currentSortKey];
        }

        // 字串比較 (姓名)
        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * currentSortOrder;
        }
        return (valA - valB) * currentSortOrder;
    });

    const factionNames = { 1: "蜀國", 2: "魏國", 3: "吳國", 4: "群雄" };
    const factionColors = { 1: "var(--faction-1)", 2: "var(--faction-2)", 3: "var(--faction-3)", 4: "var(--faction-4)" };

    sortedOfficers.forEach(o => {
        const tr = document.createElement('tr');

        let skillText = "-";
        if (OFFICER_SKILLS[o.id]) {
            skillText = `<strong style="color:var(--primary-color)">【${OFFICER_SKILLS[o.id].name}】</strong> ${OFFICER_SKILLS[o.id].desc}`;
        }

        tr.innerHTML = `
            <td>${o.id}</td>
            <td style="font-weight:bold;">${o.name}</td>
            <td style="color: ${factionColors[o.faction]}; font-weight:bold;">${factionNames[o.faction]}</td>
            <td>${formatStatDisplay(o.baseStats[1], o.stats[1])}</td>
            <td>${formatStatDisplay(o.baseStats[2], o.stats[2])}</td>
            <td>${formatStatDisplay(o.baseStats[3], o.stats[3])}</td>
            <td>${formatStatDisplay(o.baseStats[4], o.stats[4])}</td>
            <td>${formatStatDisplay(o.baseStats[5], o.stats[5])}</td>
            <td>${formatStatDisplay(o.baseStats[6], o.stats[6])}</td>
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