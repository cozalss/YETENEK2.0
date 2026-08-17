# Stop hook: run a full TypeScript type check at session end.
#
# Reports type errors so the user sees them before the session ends.
# Exits 0 to never block the stop event.

$ErrorActionPreference = 'Continue'

$projectRoot = "c:\Users\cemmo\Desktop\codeC\yetenek"
if (-not (Test-Path $projectRoot)) { exit 0 }

Push-Location $projectRoot
try {
    $tscBin = Join-Path $projectRoot 'node_modules\.bin\tsc.cmd'
    if (-not (Test-Path $tscBin)) { exit 0 }

    $output = & $tscBin --noEmit --pretty false 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[stop-hook] TypeScript OK no errors"
    } else {
        Write-Host "[stop-hook] TypeScript errors:"
        Write-Host $output
    }
} finally {
    Pop-Location
}

exit 0
