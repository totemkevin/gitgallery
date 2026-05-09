---
name: gen-gallery-meta
description: Use when adding a new image album to the gitgallery project — creates meta.json at the correct location and runs the build pipeline to generate cover and update gallery-index.json
---

# Generate Gallery Album Meta

## Overview

Creates `meta.json` for a new gitgallery album and runs `build_gallery.py` to produce `cover.webp` and update `gallery-index.json`.

## Steps

### 1. Create `meta.json` at the **album root** (never inside `images/`)

```
gallery/<album-name>/meta.json   ✅
gallery/<album-name>/images/meta.json   ❌ WRONG
```

### 2. Fill in all required fields

```json
{
  "title": "<Human-readable title>",
  "tags": ["<tag1>", "<tag2>"],
  "author": "<Author name>",
  "cover": "<filename.ext>",
  "createTime": "ISO"
}
```

| Field | Notes |
|-------|-------|
| `title` | Display name shown in the gallery |
| `tags` | Array of category strings |
| `author` | Creator's name |
| `cover` | Filename only (e.g. `"photo1.jpg"`), must exist in `images/` |
| `createTime` | Set to `"ISO"` — build script replaces it with the real timestamp |

**Do NOT include** an `images` field — the build script auto-discovers all image files.

### 3. Run the build script

```bash
python scripts/build_gallery.py
```

This generates `gallery/<album-name>/cover.webp` and rewrites `gallery-index.json`.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `meta.json` placed in `images/` folder | Move it to the album root directory |
| `cover` set to a path like `images/photo.jpg` | Use filename only: `"photo.jpg"` |
| `cover` filename doesn't exist in `images/` | Build script will use first image as fallback |
| Including `"images": [...]` in meta.json | Remove it — build script auto-discovers images |
| Leaving `createTime` as `"ISO"` without building | Run `build_gallery.py` to replace it |
