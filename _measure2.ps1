$ErrorActionPreference = 'Stop'
$f = '.\opsvision-vams\frontend\src\main.jsx'
$lines = Get-Content -LiteralPath $f
function Leading([string]$s) {
    $n = 0
    foreach ($ch in $s.ToCharArray()) { if ($ch -eq ' ') { $n++ } else { break } }
    return $n
}
function FindIdx([string]$sub) {
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i].IndexOf($sub) -ge 0) { return $i + 1 }
    }
    return -1
}
$targets = @(
    "const [showCamera",
    "const [departments, setDepartments",
    "api('/hosts').then(setHosts)",
    "api('/master/departments').then",
    "api('/master/purposes').then",
    "label className=`"form-label`">Purpose of Visit",
    "label className=`"form-label`">Department / Area",
    "select",
    "createRoot(document.getElementById"
)
foreach ($t in $targets) {
    $ln = FindIdx($t)
    if ($ln -gt 0) {
        $l = $lines[$ln - 1]
        Write-Host "L$ln indent=$(Leading($l)) :: $($l.Trim())"
    } else {
        Write-Host "NOT FOUND: $t"
    }
}
Write-Host "=== context around purpose label ==="
$pl = FindIdx("form-label`">Purpose of Visit")
if ($pl -gt 0) {
    for ($i = $pl - 3; $i -le $pl + 1; $i++) {
        if ($i -ge 1 -and $i -le $lines.Count) { Write-Host "L$i indent=$(Leading($lines[$i-1])) :: $($lines[$i-1].Trim())" }
    }
}
Write-Host "=== context around department label ==="
$dl = FindIdx("form-label`">Department / Area")
if ($dl -gt 0) {
    for ($i = $dl - 3; $i -le $dl + 1; $i++) {
        if ($i -ge 1 -and $i -le $lines.Count) { Write-Host "L$i indent=$(Leading($lines[$i-1])) :: $($lines[$i-1].Trim())" }
    }
}
