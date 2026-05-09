---
name: import-downloads
description: Use when there are zip files in downloads/ that need to be added as albums to the gitgallery gallery/
---

# Import Downloads to Gallery

## Overview

Extracts zip files from `downloads/` into `gallery/<album>/images/`, creates `meta.json`, and runs the build pipeline. Each zip becomes one album.

## Steps

### 1. Inspect zip contents

List every zip before extracting to determine album name, zip structure, and cover candidate.

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead("path/to/file.zip")
$archive.Entries | Select-Object FullName
$archive.Dispose()
```

### 2. Determine album name from zip filename

| Zip filename pattern | Album name | Author |
|---------------------|-----------|--------|
| `Images <Name>.zip` | `<Name>` | Unknown |
| `Images.zip` | Look inside for named file (e.g. `Sphinx.jpg`) | Unknown |
| `<Name>_Renders_<Author>.zip` | `<Name>` | `<Author>` |

### 3. Extract images

Use the reusable script `extract.ps1` in this skill's directory.

**Zip structure rules:**

| Zip structure | What to do |
|--------------|-----------|
| Single top-level folder `<Folder>/img.*` | Extract from that folder only |
| Flat root (no subfolder) | Extract all files from root |
| Has `Bonus/` or other subfolders | Merge all image files into `images/` (no nested dirs) |

Always skip:
- Directory entries (empty `Name`)
- `.mp4` and other non-image files

### 4. Choose cover image

Priority order:
1. File named after the character (e.g. `Azashara.jpg`, `Sphinx.jpg`)
2. File with a descriptive name (e.g. `Meru_Front.png`, `Motoko_Kusanagi.V1.png`)
3. `Imagem.png` if present
4. First image alphabetically (fallback — build script also does this automatically)

### 5. Create meta.json and run build

Follow **gen-gallery-meta** skill for meta.json format and build script.

Ask user for author/tags when unknown rather than guessing.

### 6. Delete zip files

After `build_gallery.py` succeeds, delete all processed zip files from `downloads/`:

```powershell
Remove-Item "downloads\Images Azashara.zip"
# repeat for each zip that was successfully extracted
```

Only delete after the build script completes without error.

## Quick Reference

```
downloads/
  Images Azashara.zip   →  gallery/Azashara/images/  (cover: Azashara.jpg)
  Images.zip            →  gallery/Sphinx/images/     (cover: Sphinx.jpg, name from content)
  Meru_Renders_Saltsculpt.zip  →  gallery/Meru/images/  (author: Saltsculpt, cover: Meru_Front.png)
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Extracting zip's top-level folder as a subfolder of `images/` | Only extract files, not the folder itself |
| Keeping `Bonus/` as a nested dir inside `images/` | Flatten — merge all images into `images/` |
| Using `images/Azashara.jpg` as cover in meta.json | Use filename only: `"Azashara.jpg"` |
| Extracting `.mp4` files | Skip non-image files |
| Guessing album name from `Images.zip` | Open the zip and look for a named image file |
| Deleting zip before build script succeeds | Delete only after `build_gallery.py` exits without error |
