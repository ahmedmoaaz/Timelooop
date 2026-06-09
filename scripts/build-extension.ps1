$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "extension"
$outDir = Join-Path $root "public\extension"
$zip = Join-Path $outDir "timeloop-extension.zip"
$versionedZip = Join-Path $outDir ("timeloop-extension-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".zip")

if (!(Test-Path $source)) {
  throw "Extension folder not found: $source"
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $zip) {
  try {
    Remove-Item -LiteralPath $zip -Force
  } catch {
    $zip = $versionedZip
  }
}

Compress-Archive -Path (Join-Path $source "*") -DestinationPath $zip -Force
Write-Host "Created $zip"
