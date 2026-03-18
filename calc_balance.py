
import re

# Use absolute path for Windows
filepath = r'd:\AntiGravity\Rich3\officers.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract OFFICERS_DATA content
match = re.search(r'const OFFICERS_DATA = \s*\[([\s\S]*?)\];', content)
if not match:
    print("Could not find OFFICERS_DATA")
    exit(1)

officers_raw = match.group(1)
# Regex to match each officer entry - allow for potential variations in spacing
officer_pattern = re.compile(r'\{ id: (\d+), name: ".*?", faction: (\d+), stats: \{ 1: (\d+), 2: (\d+), 3: (\d+), 4: (\d+), 5: (\d+), 6: (\d+) \} \}')

faction_totals = {}
faction_counts = {}

for m in officer_pattern.finditer(officers_raw):
    faction = int(m.group(2))
    # Sum of 6 stats
    total = sum(int(m.group(i)) for i in range(3, 9))
    
    if faction not in faction_totals:
        faction_totals[faction] = 0
        faction_counts[faction] = 0
    faction_totals[faction] += total
    faction_counts[faction] += 1

print("Faction Stat Totals:")
for f in sorted(faction_totals.keys()):
    if faction_counts[f] > 0:
        avg = faction_totals[f] / faction_counts[f]
        print(f"Faction {f}: Total = {faction_totals[f]}, Count = {faction_counts[f]}, Avg = {avg:.2f}")
