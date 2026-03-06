import re

with open('d:\\AntiGravity\\Rich3\\officers.js', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'(\{ id:\s*(\d+),\s*name:\s*"([^"]+)",\s*faction:\s*(\d+),\s*stats:\s*\{\s*1:\s*(\d+),\s*2:\s*(\d+),\s*3:\s*(\d+),\s*4:\s*(\d+),\s*5:\s*(\d+),\s*6:\s*(\d+)\s*\}\s*\})'
matches = re.finditer(pattern, text)

target_total = 8806
current_wu_total = 9001
deduction_needed = current_wu_total - target_total

import random
random.seed(42)  # For reproducibility

lines = text.split('\n')
new_lines = []

deducted = 0

for line in lines:
    match = re.search(pattern, line)
    if match:
        faction = int(match.group(4))
        if faction == 3 and deducted < deduction_needed:
            # How many points to deduct from this officer?
            # 21 officers. 195 points needed. about 9-10 points per officer.
            deduct_amount = min(deduction_needed - deducted, 10 if deducted < deduction_needed - 10 else deduction_needed - deducted)
            
            stats = [int(match.group(i)) for i in range(5, 11)]
            
            for _ in range(deduct_amount):
                # Pick a random stat that is > 10
                idx = random.choice([i for i, s in enumerate(stats) if s > 10])
                stats[idx] -= 1
                deducted += 1
                
            new_line = f'    {{ id: {match.group(2)}, name: "{match.group(3)}", faction: 3, stats: {{ 1: {stats[0]}, 2: {stats[1]}, 3: {stats[2]}, 4: {stats[3]}, 5: {stats[4]}, 6: {stats[5]} }} }},'
            # Check if it has a trailing comma or not
            if not line.endswith(','):
                new_line = new_line[:-1]
            new_lines.append(new_line)
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open('d:\\AntiGravity\\Rich3\\officers.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))
