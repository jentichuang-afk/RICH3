// 武將特技定義
const OFFICER_SKILLS = {
    // 蜀國
    100: { name: "漢室宗親", desc: "團隊全能力+3%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.03); } }, // 劉備
    101: { name: "武聖", desc: "團隊武力+5%、統率+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); stats[3] = Math.ceil(stats[3] * 1.05); } }, // 關羽
    102: { name: "萬人敵", desc: "團隊武力+10%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.10); } }, // 張飛
    103: { name: "單騎救主", desc: "團隊運氣+5%、武力+5%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.05); stats[1] = Math.ceil(stats[1] * 1.05); } }, // 趙雲
    104: { name: "神威天將", desc: "團隊武力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); } }, // 馬超
    106: { name: "臥龍", desc: "團隊智力+10%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.10); } }, // 諸葛亮
    107: { name: "鳳雛", desc: "團隊智力+5%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.05); } }, // 龐統
    110: { name: "天水麒麟", desc: "團隊智力+3%、統率+2%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.03); stats[3] = Math.ceil(stats[3] * 1.02); } }, // 姜維
    // 魏國
    200: { name: "亂世奸雄", desc: "團隊全能力+3%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.03); } }, // 曹操
    201: { name: "盲夏侯", desc: "團隊統御+5%、運氣+5%", effect: (stats) => { stats[3] = Math.ceil(stats[3] * 1.05); stats[6] = Math.ceil(stats[6] * 1.05); } }, // 夏侯惇
    203: { name: "威震逍遙", desc: "團隊統率+10%", effect: (stats) => { stats[3] = Math.ceil(stats[3] * 1.10); } }, // 張遼
    206: { name: "深謀遠慮", desc: "團隊運氣+5%、政治+5%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.05); stats[4] = Math.ceil(stats[4] * 1.05); } }, // 司馬懿
    207: { name: "鬼才", desc: "團隊智力+5%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.05); } }, // 郭嘉
    211: { name: "虎痴", desc: "團隊武力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); } }, // 許褚
    212: { name: "古之惡來", desc: "團隊武力+10%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.10); } }, // 典韋
    214: { name: "鐵壁", desc: "團隊統御+5%", effect: (stats) => { stats[3] = Math.ceil(stats[3] * 1.05); } }, // 曹仁
    // 吳國
    300: { name: "江東之主", desc: "團隊全能力+3%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.03); } }, // 孫權
    301: { name: "雅量高致", desc: "團隊智力+5%、魅力+5%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.05); stats[5] = Math.ceil(stats[5] * 1.05); } }, // 周瑜
    302: { name: "宏碁大略", desc: "團隊政治+10%", effect: (stats) => { stats[4] = Math.ceil(stats[4] * 1.10); } }, // 魯肅
    303: { name: "白衣渡江", desc: "團隊運氣+5%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.05); } }, // 呂蒙
    304: { name: "連營", desc: "團隊統御+5%、智力+5%", effect: (stats) => { stats[3] = Math.ceil(stats[3] * 1.05); stats[2] = Math.ceil(stats[2] * 1.05); } }, // 陸遜
    305: { name: "錦帆賊", desc: "團隊武力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); } }, // 甘寧
    306: { name: "篤烈", desc: "團隊武力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); } }, // 太史慈
    320: { name: "小霸王", desc: "團隊武力+5%、魅力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); stats[5] = Math.ceil(stats[5] * 1.05); } }, // 孫策
    // 群雄
    400: { name: "魔王", desc: "團隊武/智/統/政/運+4%，魅力-5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.04); stats[2] = Math.ceil(stats[2] * 1.04); stats[3] = Math.ceil(stats[3] * 1.04); stats[4] = Math.ceil(stats[4] * 1.04); stats[6] = Math.ceil(stats[6] * 1.04); stats[5] = Math.floor(stats[5] * 0.95); } }, // 董卓
    401: { name: "飛將", desc: "團隊武力+10%/統御+5%，智力-5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.10); stats[3] = Math.ceil(stats[3] * 1.05); stats[2] = Math.floor(stats[2] * 0.95); } }, // 呂布
    402: { name: "閉月", desc: "團隊魅力+10%", effect: (stats) => { stats[5] = Math.ceil(stats[5] * 1.10); } }, // 貂蟬
    403: { name: "名門", desc: "團隊運氣+10%/政治+5%，統御-5%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.10); stats[4] = Math.ceil(stats[4] * 1.05); stats[3] = Math.floor(stats[3] * 0.95); } }, // 袁紹
    406: { name: "白馬將軍", desc: "團隊統率+5%", effect: (stats) => { stats[3] = Math.ceil(stats[3] * 1.05); } }, // 公孫瓚
    408: { name: "黃天當立", desc: "團隊運氣+5%、魅力+5%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.05); stats[5] = Math.ceil(stats[5] * 1.05); } }, // 張角
    411: { name: "平黃巾", desc: "團隊全能力+1%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.01); } }, // 皇甫嵩
    412: { name: "海內人望", desc: "團隊全能力+1%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.01); } } // 盧植
};

// Phase 25 隱藏被動定義：這十位超一線猛將出場時，骰出武力的機率自帶翻倍
const LEGENDARY_WARRIORS = [101, 102, 103, 104, 211, 212, 320, 401, 404, 405];


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
    { id: 208, name: "荀彧", faction: 2, stats: { 1: 17, 2: 93, 3: 51, 4: 96, 5: 90, 6: 63 } },
    { id: 209, name: "荀攸", faction: 2, stats: { 1: 24, 2: 93, 3: 75, 4: 90, 5: 79, 6: 69 } },
    { id: 210, name: "賈詡", faction: 2, stats: { 1: 48, 2: 97, 3: 88, 4: 87, 5: 54, 6: 59 } },
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
    { id: 301, name: "周瑜", faction: 3, stats: { 1: 66, 2: 95, 3: 93, 4: 82, 5: 90, 6: 78 } },
    { id: 302, name: "魯肅", faction: 3, stats: { 1: 52, 2: 88, 3: 65, 4: 91, 5: 94, 6: 82 } },
    { id: 303, name: "呂蒙", faction: 3, stats: { 1: 79, 2: 87, 3: 85, 4: 75, 5: 80, 6: 75 } },
    { id: 304, name: "陸遜", faction: 3, stats: { 1: 67, 2: 95, 3: 92, 4: 84, 5: 85, 6: 87 } },
    { id: 305, name: "甘寧", faction: 3, stats: { 1: 93, 2: 74, 3: 84, 4: 44, 5: 55, 6: 14 } },
    { id: 306, name: "太史慈", faction: 3, stats: { 1: 91, 2: 64, 3: 79, 4: 54, 5: 76, 6: 57 } },
    { id: 307, name: "黃蓋", faction: 3, stats: { 1: 81, 2: 68, 3: 77, 4: 63, 5: 78, 6: 62 } },
    { id: 308, name: "程普", faction: 3, stats: { 1: 77, 2: 77, 3: 83, 4: 72, 5: 84, 6: 78 } },
    { id: 309, name: "韓當", faction: 3, stats: { 1: 83, 2: 54, 3: 74, 4: 49, 5: 67, 6: 54 } },
    { id: 310, name: "周泰", faction: 3, stats: { 1: 90, 2: 40, 3: 80, 4: 36, 5: 58, 6: 41 } },
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
    o.injuryRate = 0; // Phase 21: 初始化受傷程度為 0 (健康)
    o.battleCount = 0; // Phase 26: 出戰次數
    o.winCount = 0;    // Phase 26: 勝利次數
});
