---
name: set-gallery-cover
description: Use when the user wants to change or replace the cover image of a gallery album
---

# Set Gallery Album Cover

## Overview

Updates the `cover` field in `gallery/<album>/meta.json` and rebuilds to regenerate `cover.webp`.

## Steps

### 1. Edit meta.json

```json
// gallery/<album>/meta.json
{
  "cover": "<new-filename.webp>"
}
```

- Filename only — no path prefix (e.g. `0.webp`, not `images/0.webp`)
- File must exist in `gallery/<album>/images/`

### 2. Run build

```bash
python scripts/build_gallery.py
```

Regenerates `gallery/<album>/cover.webp` and updates `gallery-index.json`.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using a path like `images/0.webp` | Use filename only: `"0.webp"` |
| Cover file doesn't exist in `images/` | Build script uses first image as fallback |
| Forgetting to run build after editing | cover.webp stays outdated until rebuilt |
