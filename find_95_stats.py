import re

stat_names = {1: "武力", 2: "智力", 3: "統御", 4: "政治", 5: "魅力", 6: "運氣"}
faction_names = {1: "劉備 (蜀漢)", 2: "曹操 (曹魏)", 3: "孫權 (東吳)", 4: "董卓 (群雄)"}

with open('d:\\AntiGravity\\Rich3\\officers.js', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'\{ id:\s*\d+,\s*name:\s*"([^"]+)",\s*faction:\s*(\d+),\s*stats:\s*\{\s*1:\s*(\d+),\s*2:\s*(\d+),\s*3:\s*(\d+),\s*4:\s*(\d+),\s*5:\s*(\d+),\s*6:\s*(\d+)\s*\}\s*\}'
matches = re.finditer(pattern, text)

results = {1: [], 2: [], 3: [], 4: []}

for match in matches:
    name = match.group(1)
    faction = int(match.group(2))
    
    high_stats = []
    for i in range(1, 7):
        stat_val = int(match.group(i+2))
        if stat_val >= 95:
            high_stats.append(f"{stat_names[i]}: {stat_val}")
            
    if high_stats:
        results[faction].append(f"{name} ({', '.join(high_stats)})")

with open('d:\\AntiGravity\\Rich3\\95_stats.txt', 'w', encoding='utf-8') as out:
    for faction_id in range(1, 5):
        out.write(f"=== {faction_names[faction_id]} ===\n")
        if results[faction_id]:
            for officer in results[faction_id]:
                out.write(f"- {officer}\n")
        else:
            out.write("- 無\n")
        out.write("\n")
