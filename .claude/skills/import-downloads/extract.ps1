# extract.ps1 — 將 zip 提取到 gallery/<Album>/images/
# 用法: .\extract.ps1 -ZipPath "downloads\foo.zip" -AlbumName "Foo" [-ZipFolder "Images Foo"]
# ZipFolder: zip 內的頂層目錄名稱，若 zip 是平坦結構則省略

param(
    [Parameter(Mandatory)][string]$ZipPath,
    [Parameter(Mandatory)][string]$AlbumName,
    [string]$ZipFolder = ""  # 若空字串則提取所有根層檔案
)

$galleryRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$dest = Join-Path $galleryRoot "gallery\$AlbumName\images"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)

$skipExts = @('.mp4', '.mov', '.avi')

foreach ($entry in $archive.Entries) {
    # 跳過目錄項目
    if ($entry.Name -eq "") { continue }

    # 跳過非圖片
    $ext = [System.IO.Path]::GetExtension($entry.Name).ToLower()
    if ($skipExts -contains $ext) { continue }

    # 若指定 ZipFolder，只提取該目錄下的檔案
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
