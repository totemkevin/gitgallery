# 需求
- 利用 GitHub Pages 直接建立一個相簿
- 上傳圖片到 Repository 後，自動觸發構建程序並更新相簿網頁
- 畫面顯示 card 
  - cover
  - title
  - tags 
- 提供 title 模糊查詢
- 提供 tag 篩選
- 可調節 card 大小
- 點擊 card 跳出 dialog 以 gallery 展示 images
# 資料結構
- /gallery
  - /{imageSetName}
    - cover.* // 自動產生
    - images
      - pic1.png
      - pic2.jpg
    - meta.json
- meta.json
```
{
    title:"{imageSetName}",
    tags:["人物"],
    author:"",
    cover:"pic1.png",
    createTime:"ISO"  // 自動產生
}
```
# 執行步驟
- 產生 claude design 輸入用需求
- 等待 claude design 生成結果輸入
- 產生本地程式碼