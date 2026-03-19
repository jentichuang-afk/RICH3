import random
import math

# --- Data from game.js and officers.js ---
OFFICERS_DATA = [
    {"id": 100, "faction": 1, "stats": {1: 75, 2: 79, 3: 81, 4: 83, 5: 98, 6: 100}},
    {"id": 101, "faction": 1, "stats": {1: 96, 2: 76, 3: 96, 4: 63, 5: 93, 6: 61}},
    {"id": 102, "faction": 1, "stats": {1: 96, 2: 30, 3: 85, 4: 22, 5: 46, 6: 51}},
    {"id": 103, "faction": 1, "stats": {1: 96, 2: 77, 3: 92, 4: 66, 5: 80, 6: 86}},
    {"id": 104, "faction": 1, "stats": {1: 96, 2: 44, 3: 88, 4: 27, 5: 81, 6: 41}},
    {"id": 105, "faction": 1, "stats": {1: 94, 2: 60, 3: 87, 4: 52, 5: 75, 6: 55}},
    {"id": 106, "faction": 1, "stats": {1: 38, 2: 100, 3: 96, 4: 96, 5: 93, 6: 80}},
    {"id": 107, "faction": 1, "stats": {1: 34, 2: 96, 3: 85, 4: 86, 5: 69, 6: 31}},
    {"id": 108, "faction": 1, "stats": {1: 65, 2: 93, 3: 84, 4: 81, 5: 82, 6: 70}},
    {"id": 109, "faction": 1, "stats": {1: 92, 2: 70, 3: 86, 4: 46, 5: 39, 6: 46}},
    {"id": 110, "faction": 1, "stats": {1: 90, 2: 91, 3: 88, 4: 68, 5: 80, 6: 65}},
    {"id": 111, "faction": 1, "stats": {1: 48, 2: 94, 3: 82, 4: 78, 5: 56, 6: 59}},
    {"id": 112, "faction": 1, "stats": {1: 85, 2: 55, 3: 80, 4: 47, 5: 65, 6: 49}},
    {"id": 113, "faction": 1, "stats": {1: 77, 2: 76, 3: 83, 4: 58, 5: 61, 6: 69}},
    {"id": 114, "faction": 1, "stats": {1: 82, 2: 67, 3: 76, 4: 60, 5: 75, 6: 55}},
    {"id": 115, "faction": 1, "stats": {1: 20, 2: 93, 3: 52, 4: 80, 5: 65, 6: 10}},
    {"id": 116, "faction": 1, "stats": {1: 82, 2: 70, 3: 80, 4: 64, 5: 74, 6: 60}},
    {"id": 117, "faction": 1, "stats": {1: 86, 2: 55, 3: 72, 4: 45, 5: 60, 6: 30}},
    {"id": 118, "faction": 1, "stats": {1: 88, 2: 45, 3: 70, 4: 35, 5: 55, 6: 55}},
    {"id": 119, "faction": 1, "stats": {1: 32, 2: 83, 3: 77, 4: 92, 5: 81, 6: 73}},
    {"id": 120, "faction": 1, "stats": {1: 29, 2: 81, 3: 62, 4: 91, 5: 78, 6: 70}},
    {"id": 200, "faction": 2, "stats": {1: 71, 2: 92, 3: 100, 4: 91, 5: 95, 6: 85}},
    {"id": 201, "faction": 2, "stats": {1: 89, 2: 57, 3: 90, 4: 73, 5: 87, 6: 47}},
    {"id": 202, "faction": 2, "stats": {1: 92, 2: 52, 3: 91, 4: 62, 5: 80, 6: 46}},
    {"id": 203, "faction": 2, "stats": {1: 91, 2: 76, 3: 96, 4: 58, 5: 85, 6: 81}},
    {"id": 204, "faction": 2, "stats": {1: 86, 2: 77, 3: 84, 4: 49, 5: 72, 6: 67}},
    {"id": 205, "faction": 2, "stats": {1: 90, 2: 71, 3: 89, 4: 51, 5: 74, 6: 61}},
    {"id": 206, "faction": 2, "stats": {1: 62, 2: 99, 3: 96, 4: 94, 5: 86, 6: 86}},
    {"id": 207, "faction": 2, "stats": {1: 18, 2: 99, 3: 84, 4: 85, 5: 77, 6: 40}},
    {"id": 208, "faction": 2, "stats": {1: 17, 2: 93, 3: 51, 4: 96, 5: 90, 6: 63}},
    {"id": 209, "faction": 2, "stats": {1: 24, 2: 93, 3: 75, 4: 90, 5: 79, 6: 69}},
    {"id": 210, "faction": 2, "stats": {1: 48, 2: 97, 3: 88, 4: 87, 5: 54, 6: 59}},
    {"id": 211, "faction": 2, "stats": {1: 96, 2: 32, 3: 63, 4: 21, 5: 58, 6: 53}},
    {"id": 212, "faction": 2, "stats": {1: 96, 2: 34, 3: 48, 4: 26, 5: 58, 6: 40}},
    {"id": 213, "faction": 2, "stats": {1: 94, 2: 71, 3: 79, 4: 45, 5: 67, 6: 46}},
    {"id": 214, "faction": 2, "stats": {1: 85, 2: 58, 3: 88, 4: 46, 5: 75, 6: 66}},
    {"id": 215, "faction": 2, "stats": {1: 15, 2: 80, 3: 30, 4: 75, 5: 96, 6: 85}},
    {"id": 216, "faction": 2, "stats": {1: 84, 2: 50, 3: 78, 4: 51, 5: 67, 6: 54}},
    {"id": 217, "faction": 2, "stats": {1: 77, 2: 71, 3: 79, 4: 75, 5: 69, 6: 59}},
    {"id": 218, "faction": 2, "stats": {1: 79, 2: 69, 3: 83, 4: 58, 5: 55, 6: 32}},
    {"id": 219, "faction": 2, "stats": {1: 65, 2: 85, 3: 88, 4: 60, 5: 60, 6: 24}},
    {"id": 220, "faction": 2, "stats": {1: 67, 2: 82, 3: 78, 4: 84, 5: 80, 6: 60}},
    {"id": 300, "faction": 3, "stats": {1: 69, 2: 80, 3: 76, 4: 84, 5: 74, 6: 95}},
    {"id": 301, "faction": 3, "stats": {1: 67, 2: 96, 3: 98, 4: 81, 5: 91, 6: 80}},
    {"id": 302, "faction": 3, "stats": {1: 51, 2: 89, 3: 75, 4: 95, 5: 90, 6: 79}},
    {"id": 303, "faction": 3, "stats": {1: 81, 2: 88, 3: 90, 4: 72, 5: 79, 6: 74}},
    {"id": 304, "faction": 3, "stats": {1: 64, 2: 94, 3: 93, 4: 83, 5: 88, 6: 87}},
    {"id": 305, "faction": 3, "stats": {1: 93, 2: 74, 3: 87, 4: 42, 5: 52, 6: 13}},
    {"id": 306, "faction": 3, "stats": {1: 92, 2: 67, 3: 84, 4: 54, 5: 74, 6: 54}},
    {"id": 307, "faction": 3, "stats": {1: 83, 2: 70, 3: 79, 4: 61, 5: 78, 6: 61}},
    {"id": 308, "faction": 3, "stats": {1: 80, 2: 78, 3: 83, 4: 72, 5: 84, 6: 74}},
    {"id": 309, "faction": 3, "stats": {1: 86, 2: 51, 3: 78, 4: 47, 5: 65, 6: 52}},
    {"id": 310, "faction": 3, "stats": {1: 88, 2: 38, 3: 78, 4: 36, 5: 57, 6: 38}},
    {"id": 311, "faction": 3, "stats": {1: 15, 2: 75, 3: 20, 4: 70, 5: 96, 6: 74}},
    {"id": 312, "faction": 3, "stats": {1: 79, 2: 73, 3: 80, 4: 63, 5: 72, 6: 59}},
    {"id": 313, "faction": 3, "stats": {1: 78, 2: 69, 3: 77, 4: 58, 5: 68, 6: 51}},
    {"id": 314, "faction": 3, "stats": {1: 84, 2: 52, 3: 74, 4: 40, 5: 66, 6: 56}},
    {"id": 315, "faction": 3, "stats": {1: 14, 2: 77, 3: 18, 4: 68, 5: 97, 6: 76}},
    {"id": 316, "faction": 3, "stats": {1: 85, 2: 65, 3: 75, 4: 42, 5: 86, 6: 10}},
    {"id": 317, "faction": 3, "stats": {1: 31, 2: 78, 3: 70, 4: 87, 5: 88, 6: 77}},
    {"id": 318, "faction": 3, "stats": {1: 22, 2: 80, 3: 29, 4: 100, 5: 85, 6: 77}},
    {"id": 319, "faction": 3, "stats": {1: 20, 2: 85, 3: 31, 4: 92, 5: 85, 6: 80}},
    {"id": 320, "faction": 3, "stats": {1: 92, 2: 69, 3: 88, 4: 70, 5: 90, 6: 53}},
    {"id": 400, "faction": 4, "stats": {1: 88, 2: 75, 3: 67, 4: 54, 5: 42, 6: 37}},
    {"id": 401, "faction": 4, "stats": {1: 100, 2: 27, 3: 95, 4: 18, 5: 41, 6: 26}},
    {"id": 402, "faction": 4, "stats": {1: 24, 2: 83, 3: 74, 4: 88, 5: 100, 6: 89}},
    {"id": 403, "faction": 4, "stats": {1: 70, 2: 71, 3: 84, 4: 74, 5: 91, 6: 82}},
    {"id": 404, "faction": 4, "stats": {1: 94, 2: 28, 3: 89, 4: 33, 5: 54, 6: 44}},
    {"id": 405, "faction": 4, "stats": {1: 95, 2: 25, 3: 90, 4: 31, 5: 53, 6: 41}},
    {"id": 406, "faction": 4, "stats": {1: 85, 2: 70, 3: 82, 4: 66, 5: 78, 6: 65}},
    {"id": 407, "faction": 4, "stats": {1: 84, 2: 53, 3: 81, 4: 58, 5: 86, 6: 74}},
    {"id": 408, "faction": 4, "stats": {1: 28, 2: 88, 3: 89, 4: 87, 5: 97, 6: 96}},
    {"id": 409, "faction": 4, "stats": {1: 71, 2: 81, 3: 84, 4: 78, 5: 91, 6: 85}},
    {"id": 410, "faction": 4, "stats": {1: 81, 2: 70, 3: 82, 4: 61, 5: 84, 6: 76}},
    {"id": 411, "faction": 4, "stats": {1: 77, 2: 84, 3: 91, 4: 86, 5: 91, 6: 86}},
    {"id": 412, "faction": 4, "stats": {1: 66, 2: 91, 3: 86, 4: 90, 5: 93, 6: 88}},
    {"id": 413, "faction": 4, "stats": {1: 74, 2: 80, 3: 84, 4: 82, 5: 87, 6: 85}},
    {"id": 414, "faction": 4, "stats": {1: 92, 2: 32, 3: 87, 4: 43, 5: 57, 6: 41}},
    {"id": 415, "faction": 4, "stats": {1: 30, 2: 74, 3: 43, 4: 87, 5: 90, 6: 84}},
    {"id": 416, "faction": 4, "stats": {1: 12, 2: 86, 3: 35, 4: 85, 5: 96, 6: 88}},
    {"id": 417, "faction": 4, "stats": {1: 64, 2: 61, 3: 67, 4: 44, 5: 43, 6: 20}},
    {"id": 418, "faction": 4, "stats": {1: 93, 2: 40, 3: 82, 4: 28, 5: 76, 6: 60}},
    {"id": 419, "faction": 4, "stats": {1: 86, 2: 62, 3: 87, 4: 57, 5: 80, 6: 64}},
    {"id": 420, "faction": 4, "stats": {1: 37, 2: 91, 3: 73, 4: 85, 5: 72, 6: 57}},
    {"id": 500, "faction": 5, "stats": {1: 72, 2: 88, 3: 93, 4: 91, 5: 95, 6: 45}},
    {"id": 501, "faction": 5, "stats": {1: 55, 2: 84, 3: 78, 4: 93, 5: 87, 6: 91}},
    {"id": 502, "faction": 5, "stats": {1: 62, 2: 82, 3: 84, 4: 95, 5: 80, 6: 96}},
    {"id": 503, "faction": 5, "stats": {1: 83, 2: 91, 3: 96, 4: 75, 5: 87, 6: 40}},
    {"id": 504, "faction": 5, "stats": {1: 94, 2: 80, 3: 95, 4: 55, 5: 91, 6: 49}},
    {"id": 505, "faction": 5, "stats": {1: 81, 2: 83, 3: 85, 4: 72, 5: 86, 6: 65}},
    {"id": 506, "faction": 5, "stats": {1: 95, 2: 75, 3: 90, 4: 35, 5: 91, 6: 25}},
    {"id": 507, "faction": 5, "stats": {1: 52, 2: 96, 3: 86, 4: 89, 5: 83, 6: 70}},
    {"id": 508, "faction": 5, "stats": {1: 68, 2: 87, 3: 84, 4: 83, 5: 80, 6: 15}},
    {"id": 509, "faction": 5, "stats": {1: 96, 2: 35, 3: 87, 4: 30, 5: 77, 6: 86}},
    {"id": 510, "faction": 5, "stats": {1: 87, 2: 60, 3: 80, 4: 50, 5: 83, 6: 60}},
    {"id": 511, "faction": 5, "stats": {1: 30, 2: 84, 3: 65, 4: 91, 5: 55, 6: 30}},
    {"id": 512, "faction": 5, "stats": {1: 35, 2: 94, 3: 83, 4: 80, 5: 65, 6: 57}},
    {"id": 513, "faction": 5, "stats": {1: 25, 2: 96, 3: 77, 4: 75, 5: 70, 6: 27}},
    {"id": 514, "faction": 5, "stats": {1: 77, 2: 55, 3: 75, 4: 70, 5: 80, 6: 65}},
    {"id": 515, "faction": 5, "stats": {1: 86, 2: 45, 3: 83, 4: 40, 5: 73, 6: 40}},
    {"id": 516, "faction": 5, "stats": {1: 89, 2: 67, 3: 81, 4: 45, 5: 67, 6: 43}},
    {"id": 517, "faction": 5, "stats": {1: 75, 2: 73, 3: 79, 4: 67, 5: 76, 6: 55}},
    {"id": 518, "faction": 5, "stats": {1: 65, 2: 83, 3: 86, 4: 87, 5: 80, 6: 73}},
    {"id": 519, "faction": 5, "stats": {1: 60, 2: 86, 3: 80, 4: 83, 5: 88, 6: 61}},
    {"id": 520, "faction": 5, "stats": {1: 15, 2: 75, 3: 45, 4: 65, 5: 96, 6: 37}},
]

MAP_DATA_TEMPLATE = [
    {"id": 0, "name": "長安", "type": "START", "price": 0},
    {"id": 1, "name": "洛陽", "type": "LAND", "price": 2500},
    {"id": 2, "name": "許昌", "type": "LAND", "price": 1800},
    {"id": 3, "name": "宛城", "type": "LAND", "price": 1300},
    {"id": 4, "name": "鄴城", "type": "LAND", "price": 1600},
    {"id": 5, "name": "下邳", "type": "LAND", "price": 1500},
    {"id": 6, "name": "臨淄", "type": "LAND", "price": 1500},
    {"id": 7, "name": "徐州", "type": "LAND", "price": 1500},
    {"id": 8, "name": "建業", "type": "LAND", "price": 2000},
    {"id": 9, "name": "廬江", "type": "LAND", "price": 1500},
    {"id": 10, "name": "江夏", "type": "ITEM_SHOP", "price": 0},
    {"id": 11, "name": "襄陽", "type": "LAND", "price": 1800},
    {"id": 12, "name": "成都", "type": "LAND", "price": 2000},
    {"id": 13, "name": "江州", "type": "LAND", "price": 1200},
    {"id": 14, "name": "梓潼", "type": "LAND", "price": 1200},
    {"id": 15, "name": "漢中", "type": "LAND", "price": 1100},
    {"id": 16, "name": "京都", "type": "LAND", "price": 2200},
    {"id": 17, "name": "大阪", "type": "LAND", "price": 1800},
    {"id": 18, "name": "江戶", "type": "LAND", "price": 2000},
    {"id": 19, "name": "名古屋", "type": "LAND", "price": 1500},
]

def get_officer(oid):
    for o in OFFICERS_DATA:
        if o["id"] == oid: return o
    return None

class Simulation:
    def __init__(self):
        self.players = {}
        for i in range(1, 6):
            # Explicitly initialize lists for officers and items
            self.players[i] = {
                "money": 10000, 
                "pos": 0, 
                "officers": [], # This must be a list
                "bankrupt": False
            }
        
        self.map_data_list = []
        for m in MAP_DATA_TEMPLATE:
            nm = dict(m)
            nm["owner"] = None
            nm["defenders"] = []
            nm["level"] = 0
            self.map_data_list.append(nm)
            
        for off in OFFICERS_DATA:
            fac = off["faction"]
            # To satisfy linter, ensure we are treating this as a list
            self.players[fac]["officers"].append(off["id"])
            
        self.changan_pool = []
        self.active_players = [1, 2, 3, 4, 5]
        self.round = 1

    def get_team_power(self, officer_ids, faction_id):
        total = 0
        p_officers = self.players[faction_id]["officers"]
        
        # Leader IDs check (satisfied linter by using simple 'if' instead of bool checks)
        has_100 = 100 in p_officers
        has_200 = 200 in p_officers
        has_300 = 300 in p_officers
        has_400 = 400 in p_officers
        has_500 = 500 in p_officers

        for oid in officer_ids:
            off = get_officer(oid)
            if not off: continue
            
            m = 1.0
            if faction_id == 1 and has_100: m *= 1.03
            if faction_id == 2 and has_200: m *= 1.03
            if faction_id == 3 and has_300: m *= 1.03
            if faction_id == 4 and has_400: m *= 1.04
            if faction_id == 5 and has_500: m *= 1.03
            
            stats_sum = 0
            for k in off["stats"]:
                val = off["stats"][k]
                stats_sum += math.ceil(val * m)
            
            total += stats_sum
        return total

    def get_city_chain(self, pid, city_id):
        count = 1
        curr = city_id
        while True:
            curr = (curr - 1 + 20) % 20
            if curr in [0, 10]: continue
            if self.map_data_list[curr]["owner"] == pid: count += 1
            else: break
        curr = city_id
        while True:
            curr = (curr + 1) % 20
            if curr in [0, 10]: continue
            if self.map_data_list[curr]["owner"] == pid: count += 1
            else: break
        return count if count > 1 else 0

    def get_toll(self, land):
        if not land["owner"]: return 0
        base = land["price"] * 0.1
        chain = self.get_city_chain(land["owner"], land["id"])
        toll = base * (1 + 0.5 * land["level"]) * (1 + 0.1 * chain)
        return int(toll)

    def run_game(self):
        while len(self.active_players) > 1 and self.round < 2000:
            random.shuffle(self.active_players)
            for pid in list(self.active_players):
                if pid not in self.active_players: continue
                p = self.players[pid]
                
                roll = random.randint(1, 6)
                p["pos"] = (p["pos"] + roll) % 20
                land = self.map_data_list[p["pos"]]
                
                if land["type"] in ["START", "ITEM_SHOP"]:
                    if self.changan_pool and p["money"] > 2000:
                        off_id = self.changan_pool.pop(0)
                        p["officers"].append(off_id)
                        p["money"] -= 500
                else:
                    if land["owner"] is None:
                        if p["money"] > land["price"] + 1000 and len(p["officers"]) > 0:
                            p["money"] -= land["price"]
                            land["owner"] = pid
                            land["defenders"] = [p["officers"].pop()]
                    elif land["owner"] == pid:
                        if p["money"] > 2000 and land["level"] < 10:
                            p["money"] -= 500
                            land["level"] += 1
                    else:
                        owner_id = land["owner"]
                        owner = self.players[owner_id]
                        toll = self.get_toll(land)
                        
                        my_best = sorted(p["officers"], key=lambda oid: sum(get_officer(oid)["stats"].values()), reverse=True)[:3]
                        if len(my_best) >= 3:
                            my_pow = self.get_team_power(my_best, pid)
                            def_pow = self.get_team_power(land["defenders"], owner_id)
                            win_prob = my_pow / (my_pow + def_pow + 1)
                            
                            if win_prob > 0.8:
                                self.players[owner_id]["officers"].extend(land["defenders"])
                                land["owner"] = pid
                                siege_team = []
                                for _ in range(min(3, len(p["officers"]))):
                                    siege_team.append(p["officers"].pop())
                                land["defenders"] = siege_team
                                if random.random() < 0.5: land["level"] = max(0, land["level"]-1)
                            else:
                                p["money"] -= toll
                                owner["money"] += toll
                        else:
                            p["money"] -= toll
                            owner["money"] += toll
                
                if p["money"] <= 0:
                    p["bankrupt"] = True
                    self.active_players.remove(pid)
                    for m in self.map_data_list:
                        if m["owner"] == pid:
                            m["owner"] = None
                            self.changan_pool.extend(m["defenders"])
                            m["defenders"] = []
                            m["level"] = 0
            self.round += 1
        return self.active_players[0] if self.active_players else None

if __name__ == "__main__":
    winners = {1:0, 2:0, 3:0, 4:0, 5:0}
    names = {1:"蜀國(劉備)", 2:"魏國(曹操)", 3:"吳國(孫權)", 4:"群雄(董卓)", 5:"戰國(信長)"}
    for i in range(30):
        sim = Simulation()
        winner = sim.run_game()
        if winner: winners[winner] += 1
    
    print("--- 30場模型模擬勝率分配 ---")
    for pid, count in winners.items():
        print(f"{names[pid]}: {count} 勝 ({count/30*100:.1f}%)")
