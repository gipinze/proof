# Opens the Android project in Android Studio, ready to Run.
#
#   npm run studio
#
# Studio gets the short-path mirror (F:\pb\android) because the native build
# cannot run from a deep folder on Windows. This syncs your latest source into
# the mirror and starts Metro, so pressing Run just works.
param([string]$Mirror = 'F:\pb')

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$studio = 'C:\Program Files\Android\Android Studio\bin\studio64.exe'
if (-not (Test-Path $studio)) { $studio = "$env:LOCALAPPDATA\Programs\Android Studio\bin\studio64.exe" }
if (-not (Test-Path $studio)) { throw 'Android Studio not found in the usual locations.' }

& (Join-Path $PSScriptRoot 'sync-mirror.ps1') -Mirror $Mirror

$metroUp = $false
try {
  $metroUp = (Invoke-WebRequest -Uri 'http://127.0.0.1:8081/status' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200
} catch {}
if (-not $metroUp) {
  Write-Host 'starting Metro ...'
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'set CI=1 && npx expo start --port 8081' -WorkingDirectory $Mirror -WindowStyle Minimized
}

Write-Host 'opening Android Studio ...'
Start-Process -FilePath $studio -ArgumentList (Join-Path $Mirror 'android')

Write-Host ''
Write-Host 'In Studio: wait for Gradle sync, pick the running emulator, press Run.'
Write-Host 'After editing the workspace, re-run this script (or npm run android) to push changes.'
