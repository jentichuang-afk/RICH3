const fs = require('fs');

const code = fs.readFileSync('d:\\AntiGravity\\Rich3\\officers.js', 'utf8');

const regex = /\{ id: \d+, name: "([^"]+)", faction: (\d+), stats: \{ 1: (\d+), 2: (\d+), 3: (\d+), 4: (\d+), 5: (\d+), 6: (\d+) \} \}/g;

let match;
const factions = { 1: [], 2: [], 3: [], 4: [] };

while ((match = regex.exec(code)) !== null) {
    const faction = parseInt(match[2]);
    const total = parseInt(match[3]) + parseInt(match[4]) + parseInt(match[5]) + parseInt(match[6]) + parseInt(match[7]) + parseInt(match[8]);
    factions[faction].push(total);
}

for (let i = 1; i <= 4; i++) {
    const sum = factions[i].reduce((a, b) => a + b, 0);
    const avg = sum / factions[i].length;
    console.log(`Faction ${i} (${factions[i].length} officers): Total = ${sum}, Average = ${avg.toFixed(2)}`);
}
