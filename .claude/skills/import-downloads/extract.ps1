# extract.ps1 - Extract zip to gallery/<Album>/images/
# Usage: .\extract.ps1 -ZipPath "downloads\foo.zip" -AlbumName "Foo" [-ZipFolder "Images Foo"]
# ZipFolder: top-level folder inside the zip; omit if zip has flat structure

param(
    [Parameter(Mandatory)][string]$ZipPath,
    [Parameter(Mandatory)][string]$AlbumName,
    [string]$ZipFolder = ""
)

$galleryRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$dest = Join-Path $galleryRoot "gallery\$AlbumName\images"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)

$skipExts = @('.mp4', '.mov', '.avi')

foreach ($entry in $archive.Entries) {
    if ($entry.Name -eq "") { continue }

    $ext = [System.IO.Path]::GetExtension($entry.Name).ToLower()
    if ($skipExts -contains $ext) { continue }

    if ($ZipFolder -ne "" -and -not $entry.FullName.StartsWith("$ZipFolder/")) { continue }

    $targetPath = Join-Path $dest $entry.Name
    $stream = $entry.Open()
    $fileStream = [System.IO.File]::Create($targetPath)
    $stream.CopyTo($fileStream)
    $fileStream.Dispose()
    $stream.Dispose()
    Write-Host "Extracted: $AlbumName/images/$($entry.Name)"
}

$archive.Dispose()
Write-Host "Done: $dest"
