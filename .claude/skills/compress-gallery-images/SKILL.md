---
name: compress-gallery-images
description: Use when gallery images need to be compressed or resized for web display — converts images in gallery/*/images/ to WebP and updates meta.json cover fields
---

# Compress Gallery Images for Web

## Overview

Converts all images under `gallery/*/images/` to WebP, resizes to max 1920px on the longest side, and updates `meta.json` cover fields if the filename extension changes.

## Parameters

| Parameter | Default | Notes |
|-----------|---------|-------|
| Max dimension | 1920px | Longest side |
| Format | WebP | Best web compression ratio |
| Quality | 85 | Good visual quality / size balance |
| Scope | `gallery/*/images/` | All albums, all images |

## Run

```bash
python scripts/compress_gallery.py
```

Then rebuild covers:

```bash
python scripts/build_gallery.py
```

## What the script does

1. Finds every image in `gallery/*/images/`
2. Resizes to fit within 1920×1920 (preserves aspect ratio)
3. Converts to WebP quality 85
4. Saves as `<original-stem>.webp`, deletes original if extension changed
5. Updates `cover` field in each album's `meta.json` if the cover filename changed

## Expected result

| Before | After |
|--------|-------|
| PNG 30 MB, 3200×4000 | WebP ~300 KB, 1536×1920 |
| JPEG 8 MB, 3900×3900 | WebP ~800 KB, 1920×1920 |
| ~1 GB total | ~25 MB total |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting to run `build_gallery.py` after | Covers still reference old filenames until rebuilt |
| Running on already-compressed images | Safe — WebP→WebP just re-encodes at quality 85 |
| Changing quality/max-size in the script | Update both `MAX_SIZE` and `QUALITY` constants at top of script |
