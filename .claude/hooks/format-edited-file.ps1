# PostToolUse hook: format + lint the edited file.
#
# Receives Claude Code tool-call JSON via stdin, extracts the file path from
# tool_input.file_path, and runs prettier + eslint --fix on TS/JS/JSX/TSX/JSON/CSS/MD files.
#
# Failures are logged to stderr but never block the tool call (exit 0 always),
# because formatting issues should not interrupt the developer flow.

param()

$ErrorActionPreference = 'Continue'

$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) {
    exit 0
}

try {
    $payload = $raw | ConvertFrom-Json
} catch {
    Write-Host "[hook] stdin JSON parse failed; skipping"
    exit 0
}

$filePath = $payload.tool_input.file_path
if (-not $filePath) { exit 0 }

$projectRoot = "c:\Users\cemmo\Desktop\codeC\yetenek"
if (-not $filePath.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    exit 0
}

$ext = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
$supported = @('.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md', '.mjs', '.cjs')
if ($supported -notcontains $ext) {
    exit 0
}

Push-Location $projectRoot
try {
    $prettierBin = Join-Path $projectRoot 'node_modules\.bin\prettier.cmd'
    if (Test-Path $prettierBin) {
        & $prettierBin --write --log-level warn $filePath 2>&1 | Out-Null
        $exitCode = $LASTEXITCODE
        $name = [System.IO.Path]::GetFileName($filePath)
        if ($exitCode -eq 0) {
            Write-Host "[hook] prettier OK $name"
        } else {
            Write-Host "[hook] prettier FAIL exit $exitCode on $filePath"
        }
    }

    if ($ext -in @('.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs')) {
        $eslintBin = Join-Path $projectRoot 'node_modules\.bin\eslint.cmd'
        if (Test-Path $eslintBin) {
            & $eslintBin --fix --no-warn-ignored $filePath 2>&1 | Out-Null
        }
    }
} catch {
    $msg = $_.ToString()
    Write-Host "[hook] error: $msg"
} finally {
    Pop-Location
}

exit 0
