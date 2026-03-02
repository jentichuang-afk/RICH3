$content = Get-Content 'd:\AntiGravity\Rich3\game.js' -Raw -Encoding UTF8
$pattern = '\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",\s*faction:\s*(\d+),\s*stats:\s*\{\s*1:\s*(\d+),\s*2:\s*(\d+),\s*3:\s*(\d+),\s*4:\s*(\d+),\s*5:\s*(\d+),\s*6:\s*(\d+)\s*\}\s*\}'
$matches = [regex]::Matches($content, $pattern)

$out = "# Officer Stats List`n`n| Faction | ID | Name | STR(1) | INT(2) | LDR(3) | POL(4) | CHA(5) | LUK(6) | SUM |`n|---|---|---|---|---|---|---|---|---|---|`n"

foreach ($match in $matches) {
    [int]$faction = $match.Groups[3].Value
    $fname = if ($faction -eq 1) { "Shu" } elseif ($faction -eq 2) { "Wei" } else { "Wu" }
    $id = $match.Groups[1].Value
    $name = $match.Groups[2].Value
    [int]$s1 = $match.Groups[4].Value
    [int]$s2 = $match.Groups[5].Value
    [int]$s3 = $match.Groups[6].Value
    [int]$s4 = $match.Groups[7].Value
    [int]$s5 = $match.Groups[8].Value
    [int]$s6 = $match.Groups[9].Value
    $sum = $s1 + $s2 + $s3 + $s4 + $s5 + $s6
    $out += "| $fname | $id | $name | $s1 | $s2 | $s3 | $s4 | $s5 | $s6 | $sum |`n"
}

[System.IO.File]::WriteAllText('C:\Users\jenti\.gemini\antigravity\brain\c99a4903-abf5-4d5c-84a9-3a5b59e632cd\officers_list.md', $out, [System.Text.Encoding]::UTF8)
