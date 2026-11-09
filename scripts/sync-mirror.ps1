# Mirrors the workspace into a short build folder.
#
# Windows caps most toolchain paths at 260 characters and the Android C++ codegen
# derives paths from the project directory; this project sits 61 characters
# before `node_modules`, which overruns it. Building from a short mirror is the
# workaround. Source of truth stays the workspace — this only copies.
param(
  [string]$Mirror = 'F:\pb',
  [switch]$Full
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if ($Full -or -not (Test-Path $Mirror)) {
  Write-Host "creating build mirror $Mirror ..."
  robocopy $root $Mirror /E /NFL /NDL /NJH /NJS `
    /XD "$root\.cache" "$root\preview" "$root\.git" "$root\android" "$root\dist" | Out-Null
} else {
  robocopy "$root\src" "$Mirror\src" /MIR /NFL /NDL /NJH /NJS | Out-Null
  robocopy "$root\assets" "$Mirror\assets" /MIR /NFL /NDL /NJH /NJS | Out-Null
  robocopy "$root\plugins" "$Mirror\plugins" /MIR /NFL /NDL /NJH /NJS | Out-Null
  foreach ($f in 'App.tsx', 'index.ts', 'app.json', 'package.json', 'tsconfig.json') {
    Copy-Item (Join-Path $root $f) (Join-Path $Mirror $f) -Force
  }
}

# regenerate the native project so app.json / plugin changes take effect
# (prebuild without --clean is idempotent and re-applies config plugins).
# Run it through cmd: npm prints notices on stderr, which PowerShell would
# otherwise treat as a failure.
Push-Location $Mirror
try {
  cmd /c "npx expo prebuild --platform android --no-install > `"$Mirror\prebuild.log`" 2>&1"
  if ($LASTEXITCODE -ne 0) {
    Get-Content "$Mirror\prebuild.log" -Tail 20
    throw "expo prebuild failed ($LASTEXITCODE). Full log: $Mirror\prebuild.log"
  }
} finally {
  Pop-Location
}

Write-Host "synced -> $Mirror"
