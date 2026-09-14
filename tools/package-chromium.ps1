$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $RepoRoot "manifest.json"
$Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$Version = $Manifest.version

$Dist = Join-Path $RepoRoot "dist"
$Stage = Join-Path $Dist "stage"
$Zip = Join-Path $Dist "Furina-Clank-Chat-Atelier-$Version.zip"

if (Test-Path $Stage) { Remove-Item $Stage -Recurse -Force }
if (Test-Path $Zip) { Remove-Item $Zip -Force }
New-Item -ItemType Directory -Path $Stage -Force | Out-Null

$RuntimeItems = @(
    "manifest.json",
    "_locales",
    "icons",
    "src",
    "styles"
)

foreach ($Item in $RuntimeItems) {
    Copy-Item (Join-Path $RepoRoot $Item) $Stage -Recurse -Force
}

Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $Zip -CompressionLevel Optimal
Remove-Item $Stage -Recurse -Force

Write-Host "Created: $Zip"
