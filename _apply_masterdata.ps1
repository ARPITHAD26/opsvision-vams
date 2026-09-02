$ErrorActionPreference = 'Stop'
$f = '.\opsvision-vams\frontend\src\main.jsx'
$lines = Get-Content -LiteralPath $f
$count = $lines.Count

function Leading([string]$s) {
    $n = 0
    foreach ($c in $s.ToCharArray()) { if ($c -eq ' ') { $n++ } else { break } }
    return $n
}
function SetIndent([int]$idx, [int]$spaces) {
    $lines[$idx] = (' ' * $spaces) + $lines[$idx].TrimStart()
}

$fixed = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    $t = $lines[$i]
    if ($t.IndexOf("{ id: 'audit', label: 'Digital Audit Trail'") -ge 0) { SetIndent $i 4; $fixed++ }
    elseif ($t.IndexOf("{tab === 'audit' && <Audit />}") -ge 0) { SetIndent $i 10; $fixed++ }
    elseif ($t.IndexOf("const [showCamera, setShowCamera") -ge 0) { SetIndent $i 2; $fixed++ }
    elseif ($t.IndexOf("useEffect(() => {") -ge 0 -and $i + 1 -lt $lines.Count -and $lines[$i+1].IndexOf("api('/hosts')") -ge 0) { SetIndent $i 2; $fixed++ }
    elseif ($t.IndexOf("<div className=""form-group"">") -ge 0 -and $i + 1 -lt $lines.Count -and $lines[$i+1].IndexOf("Purpose of Visit") -ge 0) { SetIndent $i 10; $fixed++ }
    elseif ($t.IndexOf("<div className=""form-group"">") -ge 0 -and $i + 1 -lt $lines.Count -and $lines[$i+1].IndexOf("Department / Area") -ge 0) { SetIndent $i 10; $fixed++ }
}
Write-Host "Indentation fixes applied: $fixed"

# Insert MasterData component before createRoot(...)
$p1 = Get-Content -LiteralPath '.\opsvision-vams\_masterdata_1.txt'
$p2 = Get-Content -LiteralPath '.\opsvision-vams\_masterdata_2.txt'
$block = $p1 + $p2 + @('')

$rootIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].IndexOf("createRoot(document.getElementById('root'))") -ge 0) { $rootIdx = $i; break }
}
if ($rootIdx -lt 0) { throw "createRoot line not found" }

$joined = $lines -join "`n"
$hasMD = $joined.IndexOf('function MasterData') -ge 0
if (-not $hasMD) {
    $lines = $lines[0..($rootIdx-1)] + $block + $lines[$rootIdx..($count-1)]
    Write-Host "MasterData component inserted before createRoot."
} else {
    Write-Host "MasterData already present; skipping insert."
}

# Write with retry to tolerate the Vite watcher brief lock
$ok = $false
for ($attempt = 1; $attempt -le 5; $attempt++) {
    try {
        [System.IO.File]::WriteAllText($f, ($lines -join "`n"), [System.Text.Encoding]::UTF8)
        $ok = $true
        break
    } catch {
        Start-Sleep -Milliseconds 600
    }
}
if (-not $ok) { throw "Failed to write main.jsx after 5 attempts (file locked)" }
Write-Host "File written successfully."

# Verification (line numbers before insertion point are unchanged)
$nl = Get-Content -LiteralPath $f
Write-Host "=== VERIFICATION ==="
Write-Host "Total lines: $($nl.Count) (was $count)"
Write-Host "audit nav indent: $(Leading($nl[322]))"
Write-Host "audit tab-render indent: $(Leading($nl[413]))"
Write-Host "showCamera indent: $(Leading($nl[702]))"
Write-Host "useEffect/hosts indent: $(Leading($nl[709]))"
Write-Host "MasterData function present: YES if above wrote"


