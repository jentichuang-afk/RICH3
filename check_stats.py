import re
import json

with open('d:\\AntiGravity\\Rich3\\officers.js', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'\{ id:\s*\d+,\s*name:\s*"([^"]+)",\s*faction:\s*(\d+),\s*stats:\s*\{\s*1:\s*(\d+),\s*2:\s*(\d+),\s*3:\s*(\d+),\s*4:\s*(\d+),\s*5:\s*(\d+),\s*6:\s*(\d+)\s*\}\s*\}'
matches = re.findall(pattern, text)

factions = {1: [], 2: [], 3: [], 4: []}

for match in matches:
    name = match[0]
    faction = int(match[1])
    total = sum(int(x) for x in match[2:])
    if faction in factions:
        factions[faction].append(total)

for i in range(1, 5):
    if factions[i]:
        total_sum = sum(factions[i])
        avg = total_sum / len(factions[i])
        print(f"Faction {i} ({len(factions[i])} officers): Total = {total_sum}, Average = {avg:.2f}")
