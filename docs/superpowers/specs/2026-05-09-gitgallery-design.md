# GitGallery 設計文件

**日期：** 2026-05-09  
**專案：** GitHub Pages 靜態相簿

---

## 概覽

利用 GitHub Pages 建立一個純靜態相簿網站。使用者將圖片 push 至 repository 後，GitHub Actions 自動產生封面縮圖與索引檔，網頁即時反映最新相簿內容。

**技術選擇：**
- 前端：純 HTML + CSS + Vanilla JS（無 build step、零依賴）
- 自動化：GitHub Actions + Python Pillow
- 部署：GitHub Pages

**實作狀態（2026-05-09）：** `index.html` / `style.css` / `app.js` 已完成，本地預覽正常。待完成：Python build script、GitHub Actions workflow、部署。

---

## §1 整體架構

### 目錄結構

```
gitgallery/
├── .github/
│   └── workflows/
│       └── build.yml          # 掃描 gallery、產生縮圖、輸出索引
├── gallery/
│   └── {imageSetName}/
│       ├── cover.webp         # Actions 自動產生（400×300，裁切置中）
│       ├── images/
│       │   ├── pic1.png
│       │   └── pic2.jpg
│       └── meta.json
├── gallery-index.json         # Actions 自動產生，前端唯一資料來源
├── index.html
├── style.css
└── app.js
```

### 資料流

1. 使用者 push 圖片至 `main` 分支 → 觸發 GitHub Actions
2. Actions 讀取所有 `meta.json`，用 Pillow 產生 `cover.webp`，彙整輸出 `gallery-index.json`
3. Actions commit 並 push 產生的檔案（帶 `[skip ci]` 避免迴圈觸發）
4. GitHub Pages 自動部署
5. 使用者開啟網頁 → `app.js` fetch `gallery-index.json` → 渲染 card 列表

### gallery-index.json 結構

```json
[
  {
    "id": "imageSetName",
    "title": "標題",
    "tags": ["人物"],
    "author": "",
    "cover": "gallery/imageSetName/cover.webp",
    "images": [
      "gallery/imageSetName/images/pic1.png",
      "gallery/imageSetName/images/pic2.jpg"
    ],
    "createTime": "2026-05-09T00:00:00Z"
  }
]
```

### meta.json 結構（使用者維護）

```json
{
  "title": "{imageSetName}",
  "tags": ["人物"],
  "author": "",
  "cover": "pic1.png",
  "createTime": "ISO"
}
```

---

## §2 GitHub Actions Pipeline

**觸發條件：** push 到 `main` 分支，變更路徑包含 `gallery/**`

### 執行步驟

1. Checkout repo（含完整 git history）
2. Setup Python 3.x，安裝 Pillow
3. 掃描 `gallery/` 下每個 imageSet 目錄：
   - 讀取 `meta.json`
   - 若 `createTime` 欄位為空或 `"ISO"`，填入當前 UTC 時間並寫回
   - 讀取 `cover` 欄位，找到 `images/{cover}` 對應圖片
   - 若對應圖片不存在，改用 `images/` 第一張
   - 每次都重新產生 `cover.webp`（400×300，裁切置中），確保封面與 meta.json 設定保持同步
   - 收集 `images/` 目錄下所有圖片檔名（副檔名：png、jpg、jpeg、gif、webp）
4. 彙整所有 imageSet 資料 → 寫出 `gallery-index.json`（依 `createTime` 倒序排列）
5. `git add gallery-index.json gallery/**/cover.webp`
6. `git commit -m "chore: update gallery index [skip ci]"`（若有變更才 commit）
7. `git push`
8. GitHub Pages 自動從 `main` 部署

---

## §2.5 設計系統

前端實作採用 **TuringText Central (TT Central)** 設計系統，而非原計劃的通用 system-ui 樣式。

### 色彩與風格

| Token | 值 | 用途 |
|-------|-----|------|
| `--tt-primary` | `#536dfe` | 主色（靛藍），accent、chip active、slider thumb |
| `--tt-fg-1` | `#4a4a4a` | 主要文字 |
| `--tt-fg-2` | `#6e6e6e` | 次要文字 |
| `--tt-fg-3` | `#b9b9b9` | 輔助/placeholder |
| `--tt-bg` | `#f6f7ff` | 頁面背景 |
| `--tt-surface` | `#ffffff` | card、header 底色 |
| `--tt-shadow-card` | 冷藍多層陰影 | card 靜止陰影（`#e8eafc` 作為頂層） |
| `--tt-shadow-hover` | 靛藍擴散 | card hover 陰影 |

### 字型

| 字型 | 用途 |
|------|------|
| Noto Serif TC 300 | `GitGallery.` wordmark 顯示字 |
| Roboto + Noto Sans TC | UI 本文（按鈕、標籤、card body） |
| Roboto Mono | dialog 索引數字、code 片段 |

### 圖示

使用 [Material Design Icons（MDI）](https://materialdesignicons.com/) CDN，class 前綴 `mdi mdi-*`。

### 關鍵視覺規格

- Header sticky，wordmark `font-size: 44px / weight: 300`，`GitGallery.` 句點以 accent 色染色
- Toolbar 三欄 grid：搜尋框（底線樣式）/ chip 標籤列（`border-radius: 999px`）/ 大小滑桿
- Card `border-radius: 8px`，hover `translateY(-6px)` + 陰影擴散
- Lightbox 背景 `rgba(20,22,40,.82)` + `backdrop-filter: blur(8px)`
- 響應式斷點：`880px`（單欄 + 隱藏滑桿）

---

## §3 前端 UI 元件

### 版面結構

```
┌─────────────────────────────────────────────────┐
│  HEADER：網站標題                                 │
├─────────────────────────────────────────────────┤
│  TOOLBAR：[搜尋框] [tag 篩選按鈕群] [大小滑桿]    │
├─────────────────────────────────────────────────┤
│  CARD GRID（CSS Grid，auto-fill）                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │cover │ │cover │ │cover │ │cover │           │
│  │title │ │title │ │title │ │title │           │
│  │tags  │ │tags  │ │tags  │ │tags  │           │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
└─────────────────────────────────────────────────┘
```

### Card 元件

- 封面圖：固定比例 4:3，`object-fit: cover`
- 標題：單行截斷（`text-overflow: ellipsis`）
- Tags：彩色小標籤，點擊直接啟動該 tag 篩選
- Hover：輕微上浮 + 陰影效果（CSS transition）

### Toolbar

- **搜尋框：** 即時模糊比對 title，debounce 300ms
- **Tag 篩選：** 所有出現過的 tag 以按鈕呈現，可多選，選中高亮；「全部」按鈕重設篩選
- **大小滑桿：** 調整 `--card-width` CSS 變數，範圍 150px–400px，預設 240px

### Card Grid CSS

```css
--card-width: 240px;
grid-template-columns: repeat(auto-fill, minmax(var(--card-width), 1fr));
gap: 1rem;
```

---

## §4 互動行為與 Gallery Dialog

### 篩選邏輯

- 搜尋與 tag 篩選同時作用（AND 邏輯）
- 模糊搜尋：`title.toLowerCase().includes(keyword.toLowerCase())`
- Tag 多選：card 必須包含**所有**已選 tag
- 無結果顯示「找不到符合的相簿」提示文字

### Gallery Dialog 結構

```
┌────────────────────────────────────────────────┐
│  標題                                  [✕ 關閉] │
├────────────────────────────────────────────────┤
│                                                │
│          ┌─────────────────────┐              │
│          │     主圖顯示區       │              │
│          │   (max-height: 70vh)│              │
│          └─────────────────────┘              │
│                [◀]    [▶]                      │
├────────────────────────────────────────────────┤
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐  (橫向捲動)   │
│  │ 1 │ │2* │ │ 3 │ │ 4 │ │ 5 │               │
│  └───┘ └───┘ └───┘ └───┘ └───┘               │
└────────────────────────────────────────────────┘
* 當前圖片高亮
```

### 操作支援

| 操作 | 行為 |
|------|------|
| 鍵盤 `←` / `→` | 切換圖片 |
| 鍵盤 `Esc` | 關閉 dialog |
| 點擊縮圖 | 跳至對應圖片，縮圖列自動捲動置中 |
| 點擊背景遮罩 | 關閉 dialog |
| 點擊 `✕` 按鈕 | 關閉 dialog |

---

## §5 響應式設計

### 斷點策略

| 裝置 | 寬度 | Card 預設寬度 | Toolbar 版面 |
|------|------|-------------|-------------|
| 手機 | < 640px | 全寬（1欄） | 搜尋框獨行，tag 橫向捲動，隱藏大小滑桿 |
| 平板 | 640–1024px | 200px | 搜尋框 + tag 同行，滑桿顯示 |
| 桌機 | > 1024px | 240px | 全部同行展開 |

### 手機版調整

- Card：全寬顯示，封面圖固定高度 200px
- Tag 篩選：`overflow-x: auto` 橫向捲動按鈕列
- 大小滑桿：隱藏（`display: none`）
- Dialog：全螢幕（`width: 100vw; height: 100dvh`）

### Dialog 手機版

```
┌──────────────────┐
│ 標題        [✕]  │
│                  │
│   主圖顯示區      │
│  (flex-grow: 1)  │
│                  │
│   [◀]    [▶]    │
├──────────────────┤
│ 縮圖列（底部固定）│
└──────────────────┘
```
