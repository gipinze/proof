# Grab a screenshot from the connected emulator/device into preview/out/screen.png
$ErrorActionPreference = 'Stop'
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'preview\out'
New-Item -ItemType Directory -Force -Path $out | Out-Null

$name = if ($args.Count -ge 1) { $args[0] } else { 'screen' }
& $adb shell screencap -p /sdcard/_shot.png | Out-Null
& $adb pull /sdcard/_shot.png (Join-Path $out "$name.png") | Out-Null
Write-Output (Join-Path $out "$name.png")
