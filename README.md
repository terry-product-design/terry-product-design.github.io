# Terry Wu — Portfolio

Astro + GSAP + Lenis 製作的作品集首頁，主題是「Complexity → Clarity」：Hero 裡纏繞的節點會隨捲動與游標被整理成乾淨的流程圖。

## 本機開發

需要 Node.js 20 以上。

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # 輸出到 dist/
npm run preview    # 預覽正式版
```

## 修改內容

所有文案、連結、數據都在 **`src/data/content.ts`**，不用碰版面程式。

| 想改的東西 | 位置 |
| --- | --- |
| Hero 標語、Hero 裡的模組標籤 | `hero` |
| 自我介紹、數據、三個專長 | `about` |
| 跑馬燈的領域與公司 | `marquee` |
| 主要作品（標題、數據、代表色、連結） | `works` |
| 經歷 | `experience` |
| 其他作品 | `otherWorks` |
| Explorations | `explorations` |
| 結尾 CTA | `closing` |
| LinkedIn、履歷連結 | `site` |

圖片放在 `src/assets/img/`，建置時會自動轉成 AVIF / WebP 和多種尺寸。換圖時保持相同檔名即可。

## 作品頁（Case study）

| 作品 | 頁面 |
| --- | --- |
| IDEKU Sidebar Revamp | `src/pages/work/ideku-sidebar.astro` → `/work/ideku-sidebar/`（素材來自 Figma 檔 kM9Ex6WyrobVs321TZAa3J） |
| IMSLP App | `src/pages/work/imslp-app.astro` → `/work/imslp-app/` |
| Cathay Life | `src/pages/work/cathay-life.astro` → `/work/cathay-life/` |
| IMSLP Search | `src/pages/work/imslp-web.astro` → `/work/imslp-web/` |
| MyReward | `src/pages/work/myreward.astro` → `/work/myreward/` |

所有作品頁都已搬離 Framer，網站不再依賴 Framer，可以退訂。

作品頁由 `src/components/case/` 的共用元件組成，新增一頁時複製 `imslp-app.astro` 改內容即可：

- `CaseHero` 頁首（標題、角色、封面、關鍵數據）
- `Chapter` 章節（左側固定章節編號，底部膠囊會自動列出章節）
- `Figure` 圖片（`zoom` 點擊放大、`ratio` 裁切比例、`parallax` 視差、`class="bleed"` 滿版）
- `DeviceVideo` 裝置錄影（MP4 + WebP 封面放在 `public/case/<slug>/`；`mask` 可傳入去背遮罩，`width`/`height` 設定尺寸）
- `Feature` 情境 + 功能說明（或用 `rows` 呈現「痛點／商業需求／設計解法」）、`PathExplorer` 新舊導航路徑對照、`BeforeAfter` 前後畫面切換、`Pan` 可拖曳的超寬圖、`Personas` 人物誌、`NextProject` 下一個作品

圖片放 `src/assets/case/<slug>/`。GIF 請先轉成 MP4（體積約小 15 倍），例如：

```bash
ffmpeg -i in.gif -vf "scale=760:-2,format=yuv420p" -c:v libx264 -crf 26 -movflags +faststart -an out.mp4
```

## 部署到 GitHub Pages

1. 在 GitHub 建一個 repository。
   - 叫 `你的帳號.github.io` → 網址是 `https://你的帳號.github.io/`
   - 叫其他名字（例如 `portfolio`）→ 網址是 `https://你的帳號.github.io/portfolio/`
2. 把這個資料夾推上去（`main` 分支）：
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/你的帳號/repo名稱.git
   git push -u origin main
   ```
3. 到 repository 的 **Settings → Pages → Build and deployment → Source**，選 **GitHub Actions**。
4. 之後每次 push 到 `main`，`.github/workflows/deploy.yml` 會自動建置並部署（約 1–2 分鐘）。網址路徑會自動判斷，不用手動設定。

### 自訂網域（選用）

在 Settings → Pages → Custom domain 填入網域，並依 GitHub 指示設定 DNS。

## 結構

```
src/
  data/content.ts        所有文案
  components/            各區塊（Hero、About、Work…）
  scripts/main.ts        捲動、動畫、游標等互動
  scripts/hero-field.ts  Hero 的 Complexity → Clarity 畫布
  styles/global.css      色彩、字體、共用樣式
public/                  favicon、分享預覽圖 og.jpg
```

## 效能與無障礙

- 只有 Hero 用 Canvas，捲出畫面或切換分頁時會自動暫停
- 圖片延遲載入，並依裝置尺寸提供 AVIF / WebP
- 字體自架，只載入用得到的字元子集
- 支援 `prefers-reduced-motion`：關閉平滑捲動與動畫，直接顯示整理好的狀態
