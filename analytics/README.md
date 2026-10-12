# 作品集流量後台

自架的輕量流量分析：Cloudflare Worker + D1 資料庫（免費方案即可）。

- 網站每次被瀏覽，會送一筆匿名紀錄到 `/e`：哪一頁、從哪裡來、國家、裝置，離開時再補上頁面停留時間。
- 頁面開著且在畫面上時，每 30 秒送一次「還在看」；切走或關掉就停止。後台最上方據此顯示「現在有誰在看、在看哪一頁」（每 15 秒更新）。
- 後台 `/` 有密碼保護，顯示每日流量、來源、各頁瀏覽次數與平均停留時間。
- 不使用 cookie、不存 IP。訪客以「每日更換的單向雜湊」計算，同一人每天算一位，無法回推或跨日追蹤。

## 本機預覽（示範資料）

```bash
cd analytics
npm install
mkdir -p .wrangler
npm run db:init:local
npm run db:seed:local
npm run dev:demo       # http://localhost:8787，附帶幾位模擬訪客，方便看「正在看」的效果
```

本機設定在 `.dev.vars`（不會上傳）：`DEMO="1"` 顯示示範資料提示，`DEV_NO_AUTH="1"` 本機免登入。

## 部署（只需一次）

1. 註冊免費的 Cloudflare 帳號（https://dash.cloudflare.com/sign-up）。
2. 在 `analytics/` 執行 `npx wrangler login`，瀏覽器會開啟授權頁，按允許。
3. 建立資料庫：`npx wrangler d1 create portfolio-analytics`，把回傳的 `database_id` 填進 `wrangler.toml`。
4. 建立資料表：`npm run db:init:remote`
5. 設定兩個秘密值（輸入時不會顯示，也不要貼到聊天室）：
   - `npx wrangler secret put DASHBOARD_PASSWORD` → 後台登入密碼
   - `npx wrangler secret put SECRET` → 一串隨機長字串（可用 `openssl rand -hex 32` 產生）
6. 部署：`npm run deploy`，會得到網址，例如 `https://terry-portfolio-analytics.<你的帳號>.workers.dev`
7. 把這個網址填到網站的 `src/data/content.ts` → `site.analytics`，再 `/release` 上線，網站就開始送資料。

## 日常使用

- 後台：打開部署網址，輸入密碼（登入狀態保留 30 天）。
- 排除自己的瀏覽：在自己的瀏覽器打開一次 `https://terry-product-design.github.io/?notrack`；要恢復計算就打開 `?track`。
- 想知道某個連結帶來多少人：分享時在網址後面加 `?utm_source=名稱`（例如 `?utm_source=resume`），來源欄就會顯示這個名稱。

## 數字怎麼算

| 指標 | 算法 |
|---|---|
| 瀏覽次數 | 每載入一個頁面算一次 |
| 訪客 | 每天不重複的人數，期間內加總（同一人兩天各算一次） |
| 平均停留時間 | 頁面在畫面上「可見」的時間平均；切到別的分頁不算；超過 30 分鐘以 30 分鐘計 |
| 流量來源 | 進站時的上一個網站；直接輸入網址或書籤算 Direct；站內點擊不算 |
| 國家／地區 | Cloudflare 依連線判斷 |
