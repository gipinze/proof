# Runs Proof on a connected device/emulator in one step.
#
#   npm run android                    # debug build + Metro + install + launch
#   npm run android:release            # standalone release build (no Metro)
#   pwsh scripts/run-android.ps1 -Archs arm64-v8a
#
# The build happens in a short-path mirror (see scripts/sync-mirror.ps1 for why).
param(
  [string]$Mirror = 'F:\pb',
  [string]$Archs = '',
  [switch]$Release,
  [switch]$NoMetro,
  [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

$devices = (& $adb devices) -split "`n" | Where-Object { $_ -match '\sdevice$' }
if (-not $devices) {
  Write-Host ''
  Write-Host 'No device or emulator connected.' -ForegroundColor Yellow
  Write-Host 'Start one first, e.g.:'
  Write-Host '  & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Pixel_10_Pro_XL'
  exit 1
}

& (Join-Path $PSScriptRoot 'sync-mirror.ps1') -Mirror $Mirror

Push-Location "$Mirror\android"
try {
  $variant = if ($Release) { 'assembleRelease' } else { 'assembleDebug' }
  $gradleArgs = @($variant, '--console=plain')
  if ($Archs) { $gradleArgs += "-PreactNativeArchitectures=$Archs" }
  $log = "$Mirror\build.log"
  Write-Host "building $variant ..."
  # run through cmd so javac/kotlin warnings on stderr don't look like failures
  cmd /c ".\gradlew.bat $($gradleArgs -join ' ') > `"$log`" 2>&1"
  if ($LASTEXITCODE -ne 0) {
    Get-Content $log -Tail 30
    throw "gradle $variant failed ($LASTEXITCODE). Full log: $log"
  }
  Write-Host 'build ok'
} finally {
  Pop-Location
}

$apk = if ($Release) {
  "$Mirror\android\app\build\outputs\apk\release\app-release.apk"
} else {
  "$Mirror\android\app\build\outputs\apk\debug\app-debug.apk"
}

Write-Host "installing $apk"
& $adb install -r $apk | Select-Object -Last 1

if (-not $Release -and -not $NoMetro) {
  $metroUp = $false
  try {
    $metroUp = (Invoke-WebRequest -Uri 'http://127.0.0.1:8081/status' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200
  } catch {}

  if (-not $metroUp) {
    Write-Host 'starting Metro ...'
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'set CI=1 && npx expo start --port 8081' -WorkingDirectory $Mirror -WindowStyle Minimized
    for ($i = 0; $i -lt 30; $i++) {
      Start-Sleep -Seconds 2
      try {
        if ((Invoke-WebRequest -Uri 'http://127.0.0.1:8081/status' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { break }
      } catch {}
    }
  }
  & $adb reverse tcp:8081 tcp:8081 | Out-Null
}

if (-not $NoLaunch) {
  & $adb shell am force-stop com.proofofgains.app | Out-Null
  & $adb shell am start -n com.proofofgains.app/.MainActivity | Out-Null
  Write-Host 'launched.'
}
