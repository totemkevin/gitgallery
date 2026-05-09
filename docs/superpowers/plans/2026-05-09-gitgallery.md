# GitGallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 GitHub Pages 靜態相簿，push 圖片後自動產生封面縮圖與索引，前端渲染 card 列表，支援搜尋、tag 篩選、大小調節與 gallery dialog。

**Architecture:** 純靜態 HTML + CSS + Vanilla JS，無 build step。GitHub Actions 執行 Python script，產生 `cover.webp` 縮圖與 `gallery-index.json` 索引。前端 fetch 索引後渲染，所有篩選在前端完成。

**Tech Stack:** HTML5, CSS3 (Grid, Custom Properties), Vanilla JS (ES2020), GitHub Actions, Python 3.12, Pillow

---

## File Map

| 檔案 | 職責 |
|------|------|
| `scripts/build_gallery.py` | 掃描 gallery/、產生 cover.webp、輸出 gallery-index.json |
| `tests/test_build_gallery.py` | build script 的 unit tests |
| `.github/workflows/build.yml` | push gallery/ 時觸發 build |
| `index.html` | HTML 骨架：header、toolbar、card grid、dialog |
| `style.css` | 全部樣式：base、card、toolbar、dialog、RWD |
| `app.js` | 全部 JS：fetch 資料、渲染 card、搜尋篩選、dialog |
| `gallery/sample-album/meta.json` | 範例相簿資料（本地測試用） |
| `.gitignore` | 排除 Python cache、OS 暫存檔 |

---

### Task 1: 專案初始化

**Files:**
- Create: `.gitignore`
- Create: `gallery/sample-album/meta.json`

- [x] **Step 1: 建立 .gitignore**

建立 `.gitignore`：

```
__pycache__/
*.pyc
.DS_Store
Thumbs.db
```

- [x] **Step 2: 建立範例 meta.json**

建立 `gallery/sample-album/meta.json`：

```json
{
  "title": "範例相簿",
  "tags": ["風景", "旅遊"],
  "author": "Kevin",
  "cover": "pic1.jpg",
  "createTime": "ISO"
}
```

- [x] **Step 3: 在 gallery/sample-album/images/ 放入至少 3 張測試圖片**

將任意 `.jpg` 或 `.png` 圖片命名為 `pic1.jpg`、`pic2.jpg`、`pic3.jpg`，放入 `gallery/sample-album/images/`。本地測試用，不需 commit（大型圖片可加入 .gitignore）。

- [x] **Step 4: 建立 GitHub repository 並初始化 git**

1. 前往 github.com → New repository，Repository name: `gitgallery`（Public）
2. 不勾選 Initialize with README

```bash
git init
git remote add origin https://github.com/<your-username>/gitgallery.git
```

- [x] **Step 5: Commit**

```bash
git add .gitignore gallery/sample-album/meta.json
git commit -m "chore: project init with sample gallery"
```

---

### Task 2: Python Build Script

**Files:**
- Create: `scripts/build_gallery.py`
- Create: `tests/test_build_gallery.py`

- [x] **Step 1: 安裝依賴並建立測試（先讓測試失敗）**

```bash
pip install Pillow pytest
```

建立 `tests/test_build_gallery.py`：

```python
import unittest
import os
import json
import shutil
import tempfile
import sys
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))


def make_test_image(path, width=800, height=600, color=(255, 0, 0)):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.new("RGB", (width, height), color).save(path)


class TestCropCenter(unittest.TestCase):
    def _fn(self):
        from build_gallery import crop_center
        return crop_center

    def test_wide_image_crops_to_target_size(self):
        result = self._fn()(Image.new("RGB", (800, 400)), 400, 300)
        self.assertEqual(result.size, (400, 300))

    def test_tall_image_crops_to_target_size(self):
        result = self._fn()(Image.new("RGB", (400, 800)), 400, 300)
        self.assertEqual(result.size, (400, 300))


class TestBuild(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.gallery_dir = os.path.join(self.tmpdir, "gallery")
        self.index_file = os.path.join(self.tmpdir, "gallery-index.json")

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def _make_set(self, name, meta, images=None):
        set_dir = os.path.join(self.gallery_dir, name)
        images_dir = os.path.join(set_dir, "images")
        os.makedirs(images_dir, exist_ok=True)
        with open(os.path.join(set_dir, "meta.json"), "w", encoding="utf-8") as f:
            json.dump(meta, f)
        for img_name in (images or []):
            make_test_image(os.path.join(images_dir, img_name))
        return set_dir

    def test_empty_gallery_returns_empty_list(self):
        from build_gallery import build
        os.makedirs(self.gallery_dir)
        self.assertEqual(build(self.gallery_dir, self.index_file), [])

    def test_single_set_appears_in_index(self):
        from build_gallery import build
        self._make_set("album1", {
            "title": "Album One", "tags": ["人物"], "author": "",
            "cover": "a.jpg", "createTime": "2026-01-01T00:00:00+00:00"
        }, ["a.jpg"])
        result = build(self.gallery_dir, self.index_file)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["id"], "album1")
        self.assertEqual(result[0]["title"], "Album One")
        self.assertEqual(result[0]["tags"], ["人物"])

    def test_cover_webp_is_400x300(self):
        from build_gallery import build
        set_dir = self._make_set("album1", {
            "title": "A", "tags": [], "author": "",
            "cover": "a.jpg", "createTime": "2026-01-01T00:00:00+00:00"
        }, ["a.jpg"])
        build(self.gallery_dir, self.index_file)
        cover = Image.open(os.path.join(set_dir, "cover.webp"))
        self.assertEqual(cover.size, (400, 300))

    def test_missing_cover_falls_back_to_first_image(self):
        from build_gallery import build
        set_dir = self._make_set("album1", {
            "title": "A", "tags": [], "author": "",
            "cover": "nonexistent.jpg", "createTime": "2026-01-01T00:00:00+00:00"
        }, ["b.jpg", "c.jpg"])
        build(self.gallery_dir, self.index_file)
        self.assertTrue(os.path.exists(os.path.join(set_dir, "cover.webp")))

    def test_create_time_iso_sentinel_is_replaced(self):
        from build_gallery import build
        set_dir = self._make_set("album1", {
            "title": "A", "tags": [], "author": "",
            "cover": "a.jpg", "createTime": "ISO"
        }, ["a.jpg"])
        build(self.gallery_dir, self.index_file)
        with open(os.path.join(set_dir, "meta.json"), encoding="utf-8") as f:
            meta = json.load(f)
        self.assertNotIn(meta["createTime"], ("ISO", ""))

    def test_index_sorted_by_create_time_descending(self):
        from build_gallery import build
        self._make_set("album_old", {
            "title": "Old", "tags": [], "author": "",
            "cover": "a.jpg", "createTime": "2025-01-01T00:00:00+00:00"
        }, ["a.jpg"])
        self._make_set("album_new", {
            "title": "New", "tags": [], "author": "",
            "cover": "b.jpg", "createTime": "2026-01-01T00:00:00+00:00"
        }, ["b.jpg"])
        result = build(self.gallery_dir, self.index_file)
        self.assertEqual(result[0]["id"], "album_new")
        self.assertEqual(result[1]["id"], "album_old")

    def test_gallery_index_json_is_written(self):
        from build_gallery import build
        self._make_set("album1", {
            "title": "A", "tags": [], "author": "",
            "cover": "a.jpg", "createTime": "2026-01-01T00:00:00+00:00"
        }, ["a.jpg"])
        build(self.gallery_dir, self.index_file)
        self.assertTrue(os.path.exists(self.index_file))
        with open(self.index_file, encoding="utf-8") as f:
            self.assertIsInstance(json.load(f), list)


if __name__ == "__main__":
    unittest.main()
```

- [x] **Step 2: 確認測試失敗**

```bash
python -m pytest tests/test_build_gallery.py -v
```

預期：`ModuleNotFoundError: No module named 'build_gallery'`

- [x] **Step 3: 建立 scripts/build_gallery.py**

```python
import os
import json
import sys
from datetime import datetime, timezone
from PIL import Image

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
COVER_SIZE = (400, 300)


def crop_center(img, target_w, target_h):
    src_w, src_h = img.size
    if src_w / src_h > target_w / target_h:
        new_w = int(src_h * target_w / target_h)
        left = (src_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, src_h))
    else:
        new_h = int(src_w * target_h / target_w)
        top = (src_h - new_h) // 2
        img = img.crop((0, top, src_w, top + new_h))
    return img.resize((target_w, target_h), Image.LANCZOS)


def get_images(images_dir):
    return sorted(
        f for f in os.listdir(images_dir)
        if os.path.splitext(f)[1].lower() in IMAGE_EXTS
    )


def process_image_set(set_dir):
    set_name = os.path.basename(set_dir)
    meta_path = os.path.join(set_dir, "meta.json")
    images_dir = os.path.join(set_dir, "images")

    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)

    if not meta.get("createTime") or meta["createTime"] == "ISO":
        meta["createTime"] = datetime.now(timezone.utc).isoformat()
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

    images = get_images(images_dir)
    cover_filename = meta.get("cover", "")
    if cover_filename not in images:
        cover_filename = images[0] if images else None

    if cover_filename:
        with Image.open(os.path.join(images_dir, cover_filename)) as img:
            cover = crop_center(img.convert("RGB"), *COVER_SIZE)
            cover.save(os.path.join(set_dir, "cover.webp"), "WEBP", quality=85)

    return {
        "id": set_name,
        "title": meta.get("title", set_name),
        "tags": meta.get("tags", []),
        "author": meta.get("author", ""),
        "cover": f"gallery/{set_name}/cover.webp",
        "images": [f"gallery/{set_name}/images/{f}" for f in images],
        "createTime": meta["createTime"],
    }


def build(gallery_dir="gallery", index_file="gallery-index.json"):
    if not os.path.isdir(gallery_dir):
        print(f"gallery directory not found: {gallery_dir}")
        with open(index_file, "w", encoding="utf-8") as f:
            json.dump([], f)
        return []

    sets = []
    for entry in sorted(os.scandir(gallery_dir), key=lambda e: e.name):
        if not entry.is_dir():
            continue
        meta_path = os.path.join(entry.path, "meta.json")
        images_dir = os.path.join(entry.path, "images")
        if not os.path.exists(meta_path) or not os.path.isdir(images_dir):
            continue
        try:
            sets.append(process_image_set(entry.path))
        except Exception as e:
            print(f"Error processing {entry.name}: {e}", file=sys.stderr)

    sets.sort(key=lambda s: s["createTime"], reverse=True)

    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(sets, f, ensure_ascii=False, indent=2)

    print(f"Built {len(sets)} image set(s) → {index_file}")
    return sets


if __name__ == "__main__":
    build()
```

- [x] **Step 4: 執行測試確認全部通過**

```bash
python -m pytest tests/test_build_gallery.py -v
```

預期（全部 PASSED）：
```
TestCropCenter::test_wide_image_crops_to_target_size PASSED
TestCropCenter::test_tall_image_crops_to_target_size PASSED
TestBuild::test_empty_gallery_returns_empty_list PASSED
TestBuild::test_single_set_appears_in_index PASSED
TestBuild::test_cover_webp_is_400x300 PASSED
TestBuild::test_missing_cover_falls_back_to_first_image PASSED
TestBuild::test_create_time_iso_sentinel_is_replaced PASSED
TestBuild::test_index_sorted_by_create_time_descending PASSED
TestBuild::test_gallery_index_json_is_written PASSED
```

- [x] **Step 5: 本地執行確認產出**

（需先在 `gallery/sample-album/images/` 放入測試圖片）

```bash
python scripts/build_gallery.py
```

確認 `gallery/sample-album/cover.webp` 存在且尺寸 400×300，`gallery-index.json` 內容正確。

- [ ] **Step 6: Commit**

```bash
git add scripts/build_gallery.py tests/test_build_gallery.py
git commit -m "feat: add Python build script with unit tests"
```

---

### Task 3: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/build.yml`

- [x] **Step 1: 建立 .github/workflows/build.yml**

```yaml
name: Build Gallery

on:
  push:
    branches: [main]
    paths:
      - 'gallery/**'

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install Pillow
        run: pip install Pillow

      - name: Build gallery index and covers
        run: python scripts/build_gallery.py

      - name: Commit generated files
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add gallery-index.json
          find gallery -name "cover.webp" -exec git add {} \;
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "chore: update gallery index [skip ci]"
            git push
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "feat: add GitHub Actions workflow for gallery build"
```

---

### Task 4: index.html

**Files:**
- Create: `index.html`

- [x] **Step 1: 建立 index.html**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitGallery</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="site-header">
    <h1>GitGallery</h1>
  </header>

  <div class="toolbar">
    <input type="search" id="search-input" placeholder="搜尋相簿名稱…" class="search-box">
    <div class="tag-filter" id="tag-filter">
      <button class="tag-btn active" data-tag="__all__">全部</button>
    </div>
    <label class="size-slider-wrap">
      <span>大小</span>
      <input type="range" id="size-slider" min="150" max="400" value="240">
    </label>
  </div>

  <main class="card-grid" id="card-grid"></main>
  <p class="empty-msg hidden" id="empty-msg">找不到符合的相簿</p>

  <div class="dialog-overlay hidden" id="dialog-overlay">
    <div class="dialog" id="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div class="dialog-header">
        <h2 class="dialog-title" id="dialog-title"></h2>
        <button class="dialog-close" id="dialog-close" aria-label="關閉">✕</button>
      </div>
      <div class="dialog-body">
        <img class="dialog-main-img" id="dialog-main-img" src="" alt="">
        <div class="dialog-nav">
          <button class="nav-btn" id="nav-prev" aria-label="上一張">&#8249;</button>
          <button class="nav-btn" id="nav-next" aria-label="下一張">&#8250;</button>
        </div>
      </div>
      <div class="thumbnail-strip" id="thumbnail-strip"></div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add HTML skeleton"
```

---

### Task 5: style.css

**Files:**
- Create: `style.css`

- [x] **Step 1: 建立 style.css**

```css
/* ---- Variables & Reset ---- */
:root {
  --card-width: 240px;
  --primary: #4f46e5;
  --surface: #ffffff;
  --bg: #f3f4f6;
  --text: #111827;
  --text-muted: #6b7280;
  --radius: 0.5rem;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-hover: 0 6px 16px rgba(0, 0, 0, 0.15);
  --transition: 0.2s ease;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

/* ---- Header ---- */
.site-header {
  background: var(--primary);
  color: #fff;
  padding: 1rem 1.5rem;
}
.site-header h1 { font-size: 1.5rem; font-weight: 700; }

/* ---- Toolbar ---- */
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: var(--surface);
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.search-box {
  padding: 0.4rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: var(--radius);
  font-size: 0.9rem;
  width: 200px;
  outline: none;
  transition: border-color var(--transition);
}
.search-box:focus { border-color: var(--primary); }

.tag-filter {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.tag-btn {
  padding: 0.25rem 0.65rem;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: var(--surface);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
}
.tag-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.tag-btn:hover:not(.active) { background: #e0e7ff; border-color: #a5b4fc; }

.size-slider-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  white-space: nowrap;
  cursor: pointer;
}
#size-slider { width: 100px; accent-color: var(--primary); }

/* ---- Card Grid ---- */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-width), 1fr));
  gap: 1rem;
  padding: 1.5rem;
}

/* ---- Card ---- */
.card {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); }

.card-cover {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
  background: #e5e7eb;
}

.card-body { padding: 0.75rem; }

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.4rem;
}

.card-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }

.card-tag {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: #e0e7ff;
  color: var(--primary);
  cursor: pointer;
  transition: background var(--transition);
}
.card-tag:hover { background: #c7d2fe; }

/* ---- Utilities ---- */
.empty-msg {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
  font-size: 1rem;
}
.hidden { display: none !important; }

/* ---- Dialog Overlay ---- */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* ---- Dialog ---- */
.dialog {
  background: var(--surface);
  border-radius: var(--radius);
  width: min(90vw, 900px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.dialog-title { font-size: 1rem; font-weight: 600; }

.dialog-close {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--text-muted);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition: color var(--transition), background var(--transition);
}
.dialog-close:hover { color: var(--text); background: #f3f4f6; }

.dialog-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  gap: 0.75rem;
  min-height: 0;
}

.dialog-main-img {
  max-width: 100%;
  max-height: 65vh;
  object-fit: contain;
  border-radius: 0.25rem;
}

.dialog-nav { display: flex; gap: 1.5rem; }

.nav-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: opacity var(--transition);
}
.nav-btn:hover:not(:disabled) { opacity: 0.85; }
.nav-btn:disabled { opacity: 0.3; cursor: default; }

/* ---- Thumbnail Strip ---- */
.thumbnail-strip {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  overflow-x: auto;
  border-top: 1px solid #e5e7eb;
  scroll-behavior: smooth;
  flex-shrink: 0;
}
.thumbnail-strip::-webkit-scrollbar { height: 4px; }
.thumbnail-strip::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }

.thumb {
  width: 64px;
  height: 48px;
  object-fit: cover;
  border-radius: 0.25rem;
  cursor: pointer;
  border: 2px solid transparent;
  flex-shrink: 0;
  opacity: 0.55;
  transition: opacity var(--transition), border-color var(--transition);
}
.thumb.active { border-color: var(--primary); opacity: 1; }
.thumb:hover:not(.active) { opacity: 0.85; }

/* ---- Responsive: Tablet (640–1024px) ---- */
@media (max-width: 1024px) {
  :root { --card-width: 200px; }
}

/* ---- Responsive: Mobile (< 640px) ---- */
@media (max-width: 639px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }
  .search-box { width: 100%; }
  .tag-filter {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    -webkit-overflow-scrolling: touch;
  }
  .tag-filter::-webkit-scrollbar { display: none; }
  .size-slider-wrap { display: none; }

  .card-grid { grid-template-columns: 1fr; padding: 0.75rem; gap: 0.75rem; }
  .card-cover { aspect-ratio: unset; height: 200px; }

  .dialog {
    width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
  }
  .dialog-main-img { max-height: calc(100dvh - 220px); }
}
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: add CSS with responsive design"
```

---

### Task 6: app.js — 資料載入與 Card 渲染

**Files:**
- Create: `app.js`

- [x] **Step 1: 建立 app.js（狀態、DOM refs、資料載入、card 渲染）**

```javascript
// ---- State ----
const state = {
  albums: [],
  filtered: [],
  searchQuery: '',
  selectedTags: new Set(),
  dialog: { album: null, imageIndex: 0 },
};

// ---- DOM refs ----
const cardGrid = document.getElementById('card-grid');
const emptyMsg = document.getElementById('empty-msg');
const searchInput = document.getElementById('search-input');
const tagFilterEl = document.getElementById('tag-filter');
const sizeSlider = document.getElementById('size-slider');
const dialogOverlay = document.getElementById('dialog-overlay');
const dialogTitle = document.getElementById('dialog-title');
const dialogMainImg = document.getElementById('dialog-main-img');
const navPrev = document.getElementById('nav-prev');
const navNext = document.getElementById('nav-next');
const dialogClose = document.getElementById('dialog-close');
const thumbnailStrip = document.getElementById('thumbnail-strip');

// ---- Data Loading ----
async function loadGallery() {
  try {
    const res = await fetch('gallery-index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.albums = await res.json();
    state.filtered = state.albums;
    buildTagFilter();
    renderCards();
  } catch (err) {
    cardGrid.innerHTML = `<p style="padding:2rem;color:#6b7280">載入失敗：${err.message}</p>`;
  }
}

// ---- Tag Filter Builder ----
function buildTagFilter() {
  const allTags = [...new Set(state.albums.flatMap(a => a.tags))].sort();
  tagFilterEl.querySelectorAll('[data-tag]:not([data-tag="__all__"])').forEach(el => el.remove());
  allTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.dataset.tag = tag;
    btn.textContent = tag;
    tagFilterEl.appendChild(btn);
  });
}

// ---- Card Rendering ----
function renderCards() {
  cardGrid.innerHTML = '';
  if (state.filtered.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');
  state.filtered.forEach(album => cardGrid.appendChild(createCard(album)));
}

function createCard(album) {
  const card = document.createElement('article');
  card.className = 'card';

  const cover = document.createElement('img');
  cover.className = 'card-cover';
  cover.src = album.cover;
  cover.alt = album.title;
  cover.loading = 'lazy';

  const body = document.createElement('div');
  body.className = 'card-body';

  const titleEl = document.createElement('h2');
  titleEl.className = 'card-title';
  titleEl.textContent = album.title;

  const tagsEl = document.createElement('div');
  tagsEl.className = 'card-tags';
  album.tags.forEach(tag => {
    const span = document.createElement('span');
    span.className = 'card-tag';
    span.dataset.tag = tag;
    span.textContent = tag;
    span.addEventListener('click', e => { e.stopPropagation(); activateSingleTag(tag); });
    tagsEl.appendChild(span);
  });

  body.appendChild(titleEl);
  body.appendChild(tagsEl);
  card.appendChild(cover);
  card.appendChild(body);
  card.addEventListener('click', () => openDialog(album));
  return card;
}

// ---- Init ----
loadGallery();
```

- [ ] **Step 2: 本地驗證**

先執行 build script（若尚未執行）：

```bash
python scripts/build_gallery.py
python -m http.server 8080
```

開啟 `http://localhost:8080`，確認：
- card 列表正常顯示，每張 card 有封面圖、標題、tag 標籤
- 控制台無錯誤

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add gallery data loading and card rendering"
```

---

### Task 7: app.js — 搜尋、篩選與大小調節

**Files:**
- Modify: `app.js`

- [x] **Step 1: 在 app.js 的 `// ---- Init ----` 行之前插入以下內容**

```javascript
// ---- Filter Logic ----
function applyFilter() {
  const q = state.searchQuery.toLowerCase();
  state.filtered = state.albums.filter(album => {
    const matchTitle = album.title.toLowerCase().includes(q);
    const matchTags = state.selectedTags.size === 0 ||
      [...state.selectedTags].every(t => album.tags.includes(t));
    return matchTitle && matchTags;
  });
  renderCards();
}

function activateSingleTag(tag) {
  state.selectedTags.clear();
  state.selectedTags.add(tag);
  tagFilterEl.querySelectorAll('.tag-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tag === tag);
  });
  applyFilter();
}

// ---- Search ----
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

searchInput.addEventListener('input', debounce(e => {
  state.searchQuery = e.target.value.trim();
  applyFilter();
}, 300));

// ---- Tag Filter Clicks ----
tagFilterEl.addEventListener('click', e => {
  const btn = e.target.closest('.tag-btn');
  if (!btn) return;
  const tag = btn.dataset.tag;
  if (tag === '__all__') {
    state.selectedTags.clear();
    tagFilterEl.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    if (state.selectedTags.has(tag)) {
      state.selectedTags.delete(tag);
      btn.classList.remove('active');
    } else {
      state.selectedTags.add(tag);
      btn.classList.add('active');
    }
    tagFilterEl.querySelector('[data-tag="__all__"]')
      .classList.toggle('active', state.selectedTags.size === 0);
  }
  applyFilter();
});

// ---- Card Size Slider ----
sizeSlider.addEventListener('input', e => {
  document.documentElement.style.setProperty('--card-width', `${e.target.value}px`);
});
```

- [ ] **Step 2: 本地驗證**

```bash
python -m http.server 8080
```

開啟 `http://localhost:8080`，逐項確認：
- 搜尋框輸入文字 → card 即時篩選（有 300ms debounce，不是打一個字立刻反應）
- 點擊 toolbar tag 按鈕 → 高亮，card 篩選更新
- 多選 tag → 只顯示同時含全部選中 tag 的 card
- 點擊「全部」→ 清除所有 tag 篩選
- 點擊 card 上的 tag 標籤 → 清除舊篩選，僅篩選該 tag
- 拖動大小滑桿 → card 寬度即時變化（150–400px）
- 搜尋 + tag 同時作用時正確交集篩選
- 無結果時顯示「找不到符合的相簿」

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add search, tag filter and card size slider"
```

---

### Task 8: app.js — Gallery Dialog

**Files:**
- Modify: `app.js`

- [x] **Step 1: 在 app.js 的 `// ---- Init ----` 行之前插入以下內容**

```javascript
// ---- Gallery Dialog ----
function openDialog(album) {
  state.dialog.album = album;
  state.dialog.imageIndex = 0;
  dialogTitle.textContent = album.title;
  renderThumbnails();
  showImage(0);
  dialogOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDialog() {
  dialogOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  state.dialog.album = null;
}

function showImage(index) {
  const { album } = state.dialog;
  if (!album || index < 0 || index >= album.images.length) return;
  state.dialog.imageIndex = index;
  dialogMainImg.src = album.images[index];
  dialogMainImg.alt = `${album.title} 第 ${index + 1} 張`;
  navPrev.disabled = index === 0;
  navNext.disabled = index === album.images.length - 1;
  updateThumbnailHighlight(index);
}

function renderThumbnails() {
  thumbnailStrip.innerHTML = '';
  state.dialog.album.images.forEach((src, i) => {
    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = src;
    img.alt = `縮圖 ${i + 1}`;
    img.loading = 'lazy';
    img.addEventListener('click', () => showImage(i));
    thumbnailStrip.appendChild(img);
  });
}

function updateThumbnailHighlight(index) {
  thumbnailStrip.querySelectorAll('.thumb').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
  const active = thumbnailStrip.children[index];
  if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// ---- Dialog Events ----
navPrev.addEventListener('click', () => showImage(state.dialog.imageIndex - 1));
navNext.addEventListener('click', () => showImage(state.dialog.imageIndex + 1));
dialogClose.addEventListener('click', closeDialog);
dialogOverlay.addEventListener('click', e => { if (e.target === dialogOverlay) closeDialog(); });

document.addEventListener('keydown', e => {
  if (dialogOverlay.classList.contains('hidden')) return;
  if (e.key === 'Escape') { closeDialog(); return; }
  if (e.key === 'ArrowLeft') showImage(state.dialog.imageIndex - 1);
  if (e.key === 'ArrowRight') showImage(state.dialog.imageIndex + 1);
});
```

- [ ] **Step 2: 本地驗證**

```bash
python -m http.server 8080
```

開啟 `http://localhost:8080`，點擊任一 card，逐項確認：
- Dialog 開啟，顯示正確標題與第一張主圖
- 點擊 `▶` 下一張，到最後一張時 `▶` disabled；點擊 `◀` 同理
- 縮圖列當前圖片有 border 高亮，點擊縮圖跳至對應圖片
- 縮圖超出寬度時橫向捲動，active 縮圖自動置中
- 鍵盤 `→` `←` 切換圖片正常
- 鍵盤 `Esc` 關閉 dialog
- 點擊背景遮罩（非 dialog 區域）關閉 dialog
- 點擊 `✕` 按鈕關閉 dialog
- 關閉後頁面可正常捲動（body overflow 恢復）
- 縮小到 < 640px 視窗：dialog 全螢幕顯示

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add gallery dialog with keyboard and thumbnail navigation"
```

---

### Task 9: GitHub Pages 部署

**Files:** 無（手動操作 + push）

- [x] **Step 1: 確認本地所有測試通過**

```bash
python -m pytest tests/test_build_gallery.py -v
```

預期：9 tests PASSED

- [ ] **Step 2: Push 全部程式碼**

```bash
git push -u origin main
```

- [ ] **Step 3: 啟用 GitHub Pages**

1. 前往 GitHub repository → Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main`，目錄: `/ (root)`
4. 點擊 Save

- [ ] **Step 4: 確認 Actions 已觸發並成功**

前往 repository → Actions tab。

- 若 push 時 `gallery/` 內有圖片，`Build Gallery` workflow 應已自動執行
- 若未觸發（因為初次 push 沒有 gallery 圖片變更），手動觸發：在 `gallery/sample-album/meta.json` 末尾加一空格後 commit push

確認 workflow 執行成功（綠色勾），並確認 `gallery-index.json` 與 `cover.webp` 已被 Actions commit 回 repo。

- [ ] **Step 5: 確認網站正常**

開啟 `https://<username>.github.io/gitgallery/`（Pages 初次部署約需 1–2 分鐘），確認：
- card 列表正常顯示範例相簿
- 搜尋、tag 篩選、大小調節均正常
- 點擊 card 開啟 gallery dialog，可切換圖片
- 手機瀏覽器下版面正常（tag 可橫向捲動，dialog 全螢幕）
