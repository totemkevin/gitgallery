# GitGallery

以 Git 作為資料庫的靜態相簿系統。將圖片推送至 `gallery/` 目錄，GitHub Actions 自動產生縮圖與索引，前端直接讀取 JSON 呈現相簿。

## 功能

- 相簿搜尋、標籤篩選、卡片尺寸調整
- Lightbox 燈箱檢視（方向鍵 / 按鈕翻頁、縮圖列）
- 自動排序（依建立時間）
- 純靜態：無後端、無資料庫、可直接部署至 GitHub Pages

## 目錄結構

```
gallery/
└── 相簿名稱/
    ├── images/        # 原始圖片（PNG / JPG / GIF / WEBP）
    ├── meta.json      # 相簿元資料
    └── cover.webp     # 自動產生的封面縮圖（400×300）
gallery-index.json     # 自動產生的相簿索引
scripts/
└── build_gallery.py   # 建置腳本
```

## 新增相簿

1. 在 `gallery/` 下建立資料夾，例如 `gallery/我的旅遊/`
2. 建立 `images/` 子目錄，放入圖片
3. 在相簿根目錄建立 `meta.json`：

```json
{
  "title": "我的旅遊",
  "tags": ["風景", "旅遊"],
  "author": "Kevin",
  "cover": "pic1.jpg"
}
```

4. 推送至 `main` 分支，GitHub Actions 自動建置索引並提交

## 本機執行

```bash
pip install Pillow
python scripts/build_gallery.py
```

接著用任意 HTTP 伺服器開啟根目錄（例如 `python -m http.server`）。

## 部署

GitHub Actions 於每次推送到 `main` 且 `gallery/**` 有變更時自動觸發，執行以下步驟：

1. 掃描所有符合規格的相簿目錄
2. 裁切並產生 `cover.webp`（400×300，置中裁切）
3. 寫入 `gallery-index.json`
4. 自動 commit 並推送（`[skip ci]`）

啟用 GitHub Pages 後，將根目錄指向 `main` 分支即可公開存取。

## meta.json 欄位

| 欄位 | 必填 | 說明 |
|------|------|------|
| `title` | 是 | 相簿顯示名稱 |
| `tags` | 否 | 標籤陣列，用於篩選 |
| `author` | 否 | 作者名稱 |
| `cover` | 否 | 封面圖片檔名（預設第一張）|
| `createTime` | 否 | ISO 8601 時間戳（自動填入）|

## 技術棧

- **前端**：原生 HTML / CSS / JavaScript，無框架依賴
- **字型**：Noto Sans TC、Roboto（Google Fonts）
- **圖示**：Material Design Icons
- **建置**：Python 3 + Pillow
- **CI/CD**：GitHub Actions
