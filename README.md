<div align="center">

# 👾 PixelCompute Town（像素算力鎮）v1.2

**將開發者閒置的 AI API 額度與月／週 CLI 訂閱額度（BYOT），轉化為賽博像素小鎮裡的 32×32 HD 算力小人**<br>
**原生 SQLite WAL 持久化 · 公開分享頁 `/p/:slug` & `/verify/:hash` · GitHub Webhook PR 合併自動結算 · 5% / 85% / 10% 多勞多得與 70/30 防稀釋治理**

*Turn idle AI API credits & monthly CLI quotas into HD pixel workers with native SQLite WAL persistence, public OG share & SHA-256 verification pages, GitHub PR merge auto-settlement, and 5% / 85% / 10% anti-dilution revenue sharing.*

[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-34d399?style=for-the-badge)](./package.json)
[![Node.js](https://img.shields.io/badge/Node.js-24%20Native%20SQLite-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![CI](https://img.shields.io/badge/GitHub%20Actions-CI%20Ready-2563eb?style=for-the-badge&logo=githubactions&logoColor=white)](./.github/workflows/ci.yml)
[![Proof of First Spark](https://img.shields.io/badge/Protocol-5%25%20Spark%20%7C%2085%25%20Merit%20%7C%2010%25%20Platform-f43f5e?style=for-the-badge)](#-創意是第一生產力創意溯源--反抄襲--58510-多勞多得協議)
[![Zero-Trust BYOK](https://img.shields.io/badge/Security-Zero--Trust%20BYOK%20%2F%20BYOT-22d3ee?style=for-the-badge)](#零信任與合規安全架構)
[![i18n](https://img.shields.io/badge/i18n-100%25%20繁中%20%7C%20简中%20%7C%20EN-f59e0b?style=for-the-badge)](#-核心特色一覽)
[![Payments](https://img.shields.io/badge/Pay-USDC%20%7C%20Afdian%20%7C%20Polar%20%7C%20Stripe-a855f7?style=for-the-badge)](#-三合一收付與穩定幣分紅提領)
[![Afdian](https://img.shields.io/badge/%E2%9A%A1%20%E6%84%9B%E7%99%BC%E9%9B%BB-ifdian.net%2Fa%2Fpixelcompute-946ce6?style=for-the-badge)](https://ifdian.net/a/pixelcompute)

🌐 **線上官方站**：[https://pixel-compute-town.onrender.com](https://pixel-compute-town.onrender.com) · ⚡ **官方愛發電創作者主頁（贊助與卡密小舖）**：[https://ifdian.net/a/pixelcompute](https://ifdian.net/a/pixelcompute)

[💡 創意溯源與 5/85/10 協議](#-創意是第一生產力創意溯源--反抄襲--58510-多勞多得協議) ·
[🛡️ 4 層防垃圾 AI 稀釋協議](#️-防垃圾-ai-稀釋-4-層治理協議7030-分桶隔離--ai-盲審--實幹審閱團--押金沒收) ·
[🔥 v1.2 生產級引擎與病毒分享](#-v12-生產強化原生-sqlite-wal--公開分享頁--github-webhook-自動結算--ai-智慧拆單) ·
[🚀 3 秒快速啟動](#-3-秒快速啟動零依賴開箱即玩) ·
[📦 一鍵安裝與 AI 對話安裝](#-一鍵安裝本機算力小人終端與-ai-對話) ·
[💎 三合一支付與提現](#-三合一收付與穩定幣分紅提領) ·
[☁️ 一鍵公開部署](#️-一鍵公開上線部署) ·
[📣 48 小時上線推廣手冊](./docs/DEPLOY_AND_PROMOTE.md)

</div>

---

## ✨ 為什麼會有像素算力鎮？

幾乎每位開發者每個月都有兩筆「過期就歸零」的閒置算力：
1. **用不完的免費／贈金 API 額度**（Gemini API、OpenRouter、本地 Ollama 等）
2. **月底還沒刷完的官方 CLI 月／週訂閱額度**（Gemini CLI、Claude Code、Codex CLI 等）

**PixelCompute Town v1.0** 把這些閒置算力變成一座 **6 大 HD 32×32 室內場景**的「賽博暖夜像素小鎮」：從官方首頁（`/`）一鍵安裝本機小人、透過自動彈出的註冊審核頁（`/onboard`）完成零信任綁定，進入小鎮工作臺（`/app`）招募算力小人、發起帶有 **SHA-256 不可竄改溯源鏈** 的原創提案、雙軌派工並通過 **Proof of Accepted Work（成果驗收制）**，推到 100% 綻放全鎮像素煙火發布上線，並按 **5% 首發創意永久版稅 / 85% 實幹建設多勞多得池 / 10% 平臺公證運營** 的透明協議透過 **USDC/USDT 穩定幣**共享真實分紅！

---

## 💡 創意是第一生產力：創意溯源 × 反抄襲 × 5%/85%/10% 多勞多得協議

在 AI 時代，**「好創意是點燃一切的火種，實幹交付是決定價值的力量」**。PixelCompute Town 內建零依賴 **Proof of First Spark（首發創意溯源協議）**，用密碼學與透明帳本同時守護原創者與實幹者：

1. **🔗 SHA-256 不可竄改創意溯源哈希鏈（`src/server/provenance.mjs`）**
   - 每個新提案上牆瞬間即自動記錄首發者（`originatorId` / `originatorName`）、UTC 時間戳（`originatedAt`）與前序創意雜湊（`prevIdeaHash`），以 Node.js 原生 `node:crypto` 計算 64 碼 SHA-256 指紋（`ideaHash`）。
   - 開放無門檻公證 API：`GET /api/provenance/chain`（逐筆重算驗證整條鏈 `valid === true`）與 `GET /api/provenance/verify/:hash`（支援完整 64 碼或前綴驗證），並可在孵化廣場一鍵下載像素風 **《創意首發溯源證書 PNG》**。
2. **🛡️ 即時反抄襲偵測 × 一鍵尊重原創加入共建**
   - 內建中英文雙語相似度引擎（中文 2-gram + 英文單詞正規化 Jaccard 相似度），前端提案視窗透過 `POST /api/projects/check-similarity` 即時預警。
   - 若送出與既有原創高度相似的提案（相似度 `>= 0.65`），伺服器直接攔截並回傳 HTTP **`409 POTENTIAL_COPYCAT`**，清楚列出原創首發者與 SHA-256 指紋，引導開發者呼叫 `POST /api/projects/:id/join` 直接加入原創意共建，徹底終結低質抄襲複製！
3. **⚖️ 尊重創意但不獨佔：5% / 85% / 10% 多勞多得動態分紅公式**

| 分紅池 | 比例 | 分配規則與公平保障 |
| :--- | :---: | :--- |
| **💡 首發創意永久版稅** (`sparkRoyaltyPct`) | **5%** | 永久歸屬首發原創者（`originatorId`）。**即使發起人一行代碼都沒寫**，依然穩拿 5% 尊重版稅，致敬他踏出的第一步！ |
| **🔥 實幹建設多勞多得池** (`meritPoolPct`) | **85%** | 嚴格依所有貢獻者通過驗收的實幹點數（`contributions`）佔比動態分配——**誰出力最多誰拿大頭**！ |
| **🏛️ 平臺公證運營分成** (`platformSharePct`) | **10%** | 用於維護 SHA-256 溯源公證、驗收基礎設施、三合一收付與穩定幣分紅結算。 |

> **兩種實戰場景試算（以項目總營收 `$100` 為例）：**
> - **場景 A（發起人只出點子、未動手實作）**：發起人穩拿 **`$5`（5%）** 創意版稅；真正把產品做出來的實幹貢獻者們獨拿 **`$85`（85%）**，平臺拿 `$10`（10%）。
> - **場景 B（發起人提出創意＋自己也完成 40% 實幹貢獻）**：發起人拿 **`$5`（5% 版稅）+ `$34`（85% × 40%）= `$39`（39%）**；其餘實幹共建者分 `$51`（85% × 60%），平臺拿 `$10`（10%）。

---

## 🛡️ 防垃圾 AI 稀釋 4 層治理協議（70/30 分桶隔離 × AI 盲審 × 實幹審閱團 × 押金沒收）

為杜絕低效垃圾 AI 狂刷週邊微任務或批量灌水 PR 來稀釋真正核心實幹者的分紅，PixelCompute Town 內建零依賴 **4 層防稀釋治理護城河（`src/server/governance.mjs`）**：

| 治理防線 | 核心機制 | 反刷單與防稀釋保障 |
| :--- | :--- | :--- |
| **① 70/30 分桶隔離** | 在 85% 實幹池內嚴格區分 **🔥 核心實幹池（`core`，鎖定 70%）** 與 **⚙️ 週邊微任務池（`peripheral`，封頂 ≤30%）** | 以 `$1,000` 營收（實幹池 `$850`）為例：核心貢獻者僅需 100 點即**精確穩拿 `$595`（59.5%）**；即便有人狂刷 **10,000 點**週邊翻譯，總額也嚴格封頂在 **`$255`（25.5%）**，數學保證核心開發者零稀釋！ |
| **② CI 硬門檻 + 跨模型 AI 盲審** | `verifier.mjs` 結構硬校驗 ＋ `runAiBlindReview()` 盲審體檢 | 自動掃描 Diff 增刪行數、重複註解與空函式佔位符，產出 `0–100` 評分、風險燈號（綠／黃／紅）與注水比（`bloatRatioPct`），一秒標記垃圾灌水 PR |
| **③ 雙階段實幹審閱團** | `GET /api/reviews` ＋ `POST /api/reviews/:id/decide`（懸賞工會內建預置 `rev-clean-01` 與 `rev-slop-01` 開箱即審） | 僅創始鎮長／發起人／項目既有貢獻者可審閱（無關新號攔截 `403`）；**批准優質 PR 獎 `+15G` ＋ `+5` 核心點**，**駁回垃圾 AI 注水直接沒收對方押金歸審閱人**（垃圾提交者 0 貢獻、信譽 `-5`）！ |
| **④ 接單押金沒收 + 冷卻懲罰** | 工會大單需信譽 `≥ 60` 並凍結 `25G–30G` 誠意押金（`claim` 凍結、`release`/過審全額退還） | 提交垃圾直接沒收押金入防刷金庫；小人連續 2 次垃圾提交立即觸發反刷單冷卻期（期間接單回 HTTP **`429 WORKER_COOLDOWN`**），鎮長亦可一鍵開啟全局強制雙階段審閱（`peerReviewRequired`） |

---

## 🔥 v1.2 生產強化：原生 SQLite WAL × 公開分享頁 × GitHub Webhook 自動結算 × AI 智慧拆單

v1.2 持續堅持 **0 外部 npm 依賴**，直接以 Node.js 24 原生模組補齊商業級持久層、病毒式社群傳播與真實 GitHub 雙向閉環：

1. **🗄️ 原生 SQLite (`node:sqlite`) WAL 持久化、稽核紀錄與一鍵備份（`src/server/store.mjs`）**
   - 採用 Node 24 原生 `DatabaseSync` 於 `data/pixelcompute.db` 啟用 **WAL 模式**（`PRAGMA journal_mode = WAL`），內建 `kv_state` 原子狀態表與 `audit_log` 稽核日誌表（自動保留最近 500 筆關鍵事件）；若從舊版 `data/state.json` 升級會自動無縫遷移入庫，舊版 Node 環境則優雅降級回原子 JSON。
   - 內建運維遙測端點 **`GET /api/metrics`**（回報 `dbDriver: 'sqlite'`、記憶體占用、運行時長、SSE 連線數、待審佇列與溯源哈希鏈健康狀態），並在鎮長管理面板提供 **`📦 一鍵下載完整備份 (JSON)`**（`GET /api/admin/export-backup`，含完整 `state` 與 `recentAudit`）。
2. **🌐 公開分享頁 `/p/:slug` 與密碼學查驗頁 `/verify/:hash`（`src/server/publicPages.mjs`）**
   - **`GET /p/:slug`**（支援項目 `id` 或簡寫如 `/p/meta`）：自包含賽博像素 SSR 公開頁，內建完整 **Open Graph (`og:title` / `og:description` / `twitter:card`)**，貼到 X / Reddit / Discord / 微信立刻出現高顏值預覽卡！展示項目進度、首發者＋UTC 時間戳＋SHA-256 指紋、5/85/10 與 70/30 防稀釋配額條、貢獻榜與開放任務，並附一鍵直達 `/app?project=<id>` 加入共建。
   - **`GET /verify/:hash`**（支援完整 64 碼或 8+ 碼前綴）：任何人免登入即可公開驗證原創首發紀錄，通過即亮出 **`✅ VERIFIED ON PIXELCOMPUTE PROVENANCE CHAIN`** 印章（偽造或竄改回 `404` 紅牌警示），全動態輸出皆經嚴格 HTML Entity 跳脫杜絕 XSS。
3. **🔀 GitHub Webhook (`POST /api/webhooks/github`) PR 合併自動雙向結算**
   - 在 `.env` 設定 **`GITHUB_WEBHOOK_SECRET`** 後，伺服器以原生 `node:crypto` 對每個請求驗證 **`X-Hub-Signature-256`** HMAC-SHA256 簽名（錯簽一律攔截 `401`）。
   - 於 GitHub Repo Settings → Webhooks 指向 `https://<YOUR_DOMAIN>/api/webhooks/github`（事件勾選 `Pull requests`）；開發者在 PR 標題或內文寫上 **`Fixes #task-<id>`**（或提交過該 PR 連結），當 PR 被 Maintainer 合併（`action: closed` 且 `merged: true`）時，小鎮**自動將任務標記完成、發放 `core` 核心點數、全額退還押金、計入 10% 現金懸賞平臺費、推進項目進度、寫入 SQLite `audit_log` 並透過 SSE 在像素辦公室即時慶祝**！
4. **⚡ AI 智慧拆單（`POST /api/projects/:id/auto-split`）70/30 防稀釋均衡生成器**
   - 孵化廣場建設中項目新增「AI 智慧拆單」快捷輸入框：輸入一句功能需求，系統自動按 70/30 防稀釋結構生成 **1 張高價值 `core` 核心池工會大單（帶 25G 押金）＋ 2 張 `peripheral` 週邊池 API 微任務（測試＋多語系／文件）**，並同步廣播全鎮。

---

## 🚀 3 秒快速啟動（零依賴，開箱即玩）

本專案堅持 **0 個外部 npm 依賴**（純 Node.js 22+/24 原生模組 + 原生 HTML5 Canvas + Web Audio API 8-bit 合成音效），無需 `npm install` 即可啟動：

```bash
git clone https://github.com/<your-username>/pixel-compute-town.git
cd pixel-compute-town
npm run dev
```

啟動後即可訪問三大核心頁面：
- **🏠 官方首頁與多平臺一鍵安裝中心**：`http://localhost:3456/`
- **👾 像素算力鎮主應用（6 大 HD 場景工作臺）**：`http://localhost:3456/app`
- **🔐 裝置綁定與註冊審核頁（Device Flow）**：`http://localhost:3456/onboard?demo=1`

> 💡 **免配置開箱體驗**：未設定 OAuth 或 API Key 時，系統會自動啟用「創始開發者 Demo 模式」與高品質擬真模擬交付，同時完整支援信箱＋密碼多用戶註冊與資料隔離！

---

## 📦 一鍵安裝本機算力小人（終端與 AI 對話）

伺服器內建動態安裝腳本端點（`/install.ps1`、`/install.sh`、`/download/pixel-worker.mjs`）與 Device Flow 授權流程：

### 1. 終端機一鍵安裝（自動下載並彈出 `/onboard` 註冊審核頁）

**Windows (PowerShell)：**
```powershell
irm http://localhost:3456/install.ps1 | iex
```

**macOS / Linux (Bash)：**
```bash
curl -fsSL http://localhost:3456/install.sh | bash
```

> 公開部署上線後，只需將 `http://localhost:3456` 替換為你的正式網域（官網 `/` 的「複製即裝中心」會自動帶入目前網域！）。

### 2. 直接貼給你的 AI 助手對話安裝（Antigravity / Gemini / Claude / Cursor / DeepSeek）

不習慣自己敲終端指令？將以下透明安全指令直接貼到 **Antigravity / Claude Code / Cursor / Gemini CLI** 對話框：

> 請幫我安全接入 PixelCompute Town（`https://<YOUR_DOMAIN>`）：
> 1. 先檢視 `<YOUR_DOMAIN>/install.sh`（Windows 為 `/install.ps1`）確認它只下載單一零依賴腳本 `pixel-worker.mjs`，絕不讀取任何本地 AI 憑證或 API Key。
> 2. 執行安裝並啟動 `node ~/.pixelcompute/pixel-worker.mjs onboard --server https://<YOUR_DOMAIN>`。
> 3. 自動開啟瀏覽器 `/onboard` 審核頁，讓我親自確認權限並綁定我的 32×32 HD 像素小人。

（若使用純網頁版 Gemini / DeepSeek，AI 會智慧降級並一步步引導你複製上方對應 OS 的單行指令執行！）

---

## 🎮 核心特色一覽

| 模組 | v1.0 商業上線完全體亮點 |
| :--- | :--- |
| **💡 創意溯源鏈 × 反抄襲 × 5/85/10 分紅** | 每筆創意上牆即刻生成不可竄改 **SHA-256 哈希鏈（Proof of First Spark）** 與可下載《創意首發溯源證書 PNG》；即時反抄襲查重攔截重複提案（HTTP `409`）並引導加入共建；上線依 **5% 創意版稅 / 85% 實幹多勞多得 / 10% 平臺** 精準分紅 |
| **🏠 高顏值像素官網與 `/onboard` 審核頁** | `/` 具備即時動畫 HD 像素微舞台、實時數據條（`/api/public/stats`）、創意溯源實時哈希鏈公證宣言、6 大平臺複製即裝中心與透明定價；`/onboard` 提供三步零信任裝置核准、32×32 小人預覽挑選與鎮長嚴格審核模式 |
| **🏙️ 6 大 HD 32×32 室內場景畫布** | 自動工坊、懸賞工會、孵化中心、算力宿舍、創作者金庫、小鎮總覽 6 場景無縫切換＋自動跟隨分頁；全站注入銳利 HD 像素頭像、日夜霓虹切換、商店裝潢實景、上線煙火與 8-bit 音效 |
| **🌐 100% 全站三語即時切換（繁中／简中／EN）** | 不僅翻譯按鈕，連項目名、任務卡、小人、商店、成就、排行榜、動態日誌、Canvas 室內看板、《算力打工證 PNG》與《創意首發溯源證書 PNG》全部 100% 即時三語化，切到 EN 零中文殘留 |
| **🔐 多用戶帳號系統（隔離帳本）** | 內建 `scrypt` 加密信箱＋密碼註冊登入、GitHub OAuth、Google OAuth 與遊客 Demo 模式；各用戶金幣、小人、成就與提領餘額完全隔離，同時共享項目池、任務市場與排行榜 |
| **⚡ 雙軌任務市場 & GitHub Issue 匯入** | **自動工坊（`api_auto`）** 支援瀏覽器端零信任 Gemini / OpenRouter / Ollama BYOK；**懸賞工會（`guild_bounty`）** 支援 Context Pack、PR 連結驗證、GitHub 公開倉庫 Issue 一鍵匯入與本機 CLI 即時直播 |
| **💎 三合一收付與穩定幣分紅提領** | 支援 **USDC / USDT（Base / Polygon / Arbitrum / Solana）** 鏈上付款與滿 `$5` 分紅提現、**Polar.sh / Stripe** 信用卡結帳＋Webhook 驗簽、以及 **愛發電 / Ko-fi 卡密兌換碼** 零門檻收款 |
| **🛡️ 防垃圾 AI 稀釋治理 & 鎮長後臺** | 內建 **4 層防稀釋治理協議**（70/30 核心／週邊分桶隔離、CI＋AI 盲審體檢、懸賞工會雙階段實幹審閱佇列＋沒收押金、連續垃圾 `429` 冷卻懲罰）；鎮長後臺可一鍵切換「嚴格裝置審核」與「全局強制實幹審閱」、審批裝置、標記提現 TxHash 與批次生成兌換碼 |

---

## 💎 三合一收付與穩定幣分紅提領

PixelCompute Town v1.0 內建三軌商業變現與結算系統（未填入正式憑證時皆支援沙盒模式即時體驗）：

1. **💎 軌道 1：穩定幣直收與提現（USDC / USDT）**
   - 支援 **Base（推薦低 Gas）**、**Polygon**、**Arbitrum** 與 **Solana**。
   - 在 `.env` 設定 `TREASURY_EVM_ADDRESS` 與 `TREASURY_SOL_ADDRESS` 即可收取 Pro 會員（`$9`）、創世大禮包（`$15`）、霓虹廣告位（`$29`）與項目懸賞充值。
   - 貢獻者於「創作者收益」分頁綁定個人錢包後，分紅餘額達 **`$5` 以上** 即可一鍵發起穩定幣提領申請，由鎮長發放並回填鏈上 TxHash。
2. **💳 軌道 2：法幣結帳（Polar.sh / Stripe）**
   - 支援 `POLAR_CHECKOUT_URL` / `STRIPE_SECRET_KEY` 跳轉結帳與 `POST /api/webhooks/polar`、`POST /api/webhooks/stripe` HMAC-SHA256 驗簽。
3. **🎟️ 軌道 3：卡密／兌換碼系統（愛發電 / Ko-fi / Gumroad）**
   - 內建開箱測試碼：`PIXEL-PRO-2026`（開通 Pro）、`PIXEL-PACK-2026`（創世大禮包）、`PIXEL-GOLD-500`（+500 金幣）。
   - 鎮長可在管理面板或呼叫 `POST /api/admin/codes/generate` 批次產生新兌換碼上架販售。

---

## 🏗️ 雙軌算力市場與零信任安全架構

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                   PixelCompute Town v1.0 (Node.js Server)               │
│  REST API · Multi-User Store · 3-in-1 Payments · Device Flow · SSE Feed │
└───────────────▲───────────────────────────────────────▲─────────────────┘
                │ 僅傳送任務狀態與驗收成果                  │ 僅傳送進度心跳 + 確認後成果
                │ （伺服器絕不接觸任何 Key/Token）          │ （絕不讀取本機憑證）
┌───────────────┴───────────────┐       ┌───────────────┴─────────────────┐
│  🏭 Track 1: 自動工坊 (BYOK)   │       │  ⚔️ Track 2: 懸賞工會 (BYOT)     │
│  Browser localStorage Only    │       │  Local CLI: pixel-worker v0.4   │
│  • Gemini 2.5 Flash / Pro     │       │  • onboard (Device Flow 核准)    │
│  • OpenRouter / Local Ollama  │       │  • Gemini CLI / Claude / Codex  │
│  • 每日 Token 體力上限保護      │       │  • 本機執行 → 人工確認 → 提交驗收   │
└───────────────────────────────┘       └─────────────────────────────────┘
```

### 零信任與合規安全架構
- **BYOK（Bring Your Own Key）**：API Key 僅儲存在你自己的瀏覽器 `localStorage`，請求直接由瀏覽器發送至模型端點，絕不經過或儲存在後端伺服器。
- **BYOT（Bring Your Own Tool）**：針對月／週訂閱工具，絕不提供帳號代管、不碰 `~/.gemini` / `~/.claude` / `~/.codex` 憑證、不建共享反代池；所有推論皆在開發者本機透過官方 CLI 合法完成並由本人確認提交。

---

## 💻 本機 BYOT CLI 協作器（`pixel-worker` v0.4）

`bin/pixel-worker.mjs` 是零依賴本機橋接器，現已升級支援 `onboard` 裝置自動註冊審核流程：

```bash
# 查看完整說明與安全保證
node bin/pixel-worker.mjs --help

# 一鍵啟動 Device Flow 裝置註冊與瀏覽器審核（自動偵測 OS 與本機 CLI 工具並寫入 ~/.pixelcompute/config.json）
node bin/pixel-worker.mjs onboard --server http://localhost:3456

# 端對端示範裝置綁定（不開啟瀏覽器，適合自動化與快速體驗）
node bin/pixel-worker.mjs onboard --server http://localhost:3456 --no-open --demo

# 列出小鎮中開放的工會懸賞單與算力小人 ID
node bin/pixel-worker.mjs --list

# 執行完整模擬流程（接單 → 即時 SSE 心跳直播 → 驗收交卷）
node bin/pixel-worker.mjs --demo --server http://localhost:3456

# 啟動常駐 Watch 模式（定時輪詢該小人的待辦任務並穩定發送心跳）
node bin/pixel-worker.mjs --watch --worker w-pro-01 --interval 5

# 串接你本機的官方 CLI（如 Gemini CLI / Claude Code / Codex）
node bin/pixel-worker.mjs \
  --worker w-pro-01 \
  --task task-meta-pr \
  --cmd "gemini -p '請依 {{CONTEXT_FILE}} 的規格完成實作'"
```

---

## ☁️ 一鍵公開上線部署

專案已內建完整容器與雲端平台設定檔，支援 3 分鐘免費公開上線：

### 1. Render（推薦，免費 Blueprint 一鍵上線）
直接連接 GitHub Repo 並套用 [`render.yaml`](./render.yaml)，依 [`.env.example`](./.env.example) 設定 `APP_BASE_URL`、可選的 GitHub / Google OAuth、穩定幣收款地址（`TREASURY_EVM_ADDRESS` / `TREASURY_SOL_ADDRESS`）與 Polar/Stripe 憑證即可自動建置並通過 `/api/health` 健康檢查。

### 2. Fly.io（全球低延遲＋持久化 Volume）
使用內建 [`fly.toml`](./fly.toml)：
```bash
fly launch --no-deploy --copy-config
fly volumes create pixel_town_data --region sin --size 1
fly secrets set \
  APP_BASE_URL="https://pixel-compute-town.fly.dev" \
  TREASURY_EVM_ADDRESS="0x你的Base或Polygon收款地址" \
  TREASURY_SOL_ADDRESS="你的Solana收款地址"
fly deploy
```

### 3. Docker 自建部署
```bash
cp .env.example .env
docker build -t pixel-compute-town .
docker run -d --name pixel-compute-town -p 3456:3456 -v $(pwd)/data:/app/data --env-file .env pixel-compute-town
```

> 📖 完整的 **GitHub & Google OAuth 申請、穩定幣收款與 Polar/Stripe 設定、30 秒 Demo 分鏡腳本、多平臺 AI 對話安裝推廣話術與三語爆款文案包**，請見：[docs/DEPLOY_AND_PROMOTE.md](./docs/DEPLOY_AND_PROMOTE.md)

---

## 🗂️ 專案目錄結構

```text
pixel-compute-town/
├── .github/workflows/ci.yml    # GitHub Actions 自動化 CI（Node 24 零依賴自動執行 test + smoke）
├── server.mjs                  # 零依賴 HTTP 伺服器、SSR 公開頁（/p/:slug、/verify/:hash）、REST API、GitHub Webhook 與 SSE
├── src/server/                 # 後端核心模組（store SQLite WAL 引擎、publicPages SSR 分享頁、governance 防稀釋協議、provenance 創意溯源與反抄襲、auth、payments、deviceFlow、seed、verifier、sse）
├── public/
│   ├── landing.{html,css}      # 官方首頁（/）＋創意溯源宣言＋多平臺複製即裝中心＋即時 HD 像素微舞台
│   ├── onboard.{html,css}      # 裝置註冊與權限審核頁（/onboard）
│   ├── index.html & styles.css # 像素算力鎮主應用（/app）含 AI 智慧拆單與 SQLite 運維備份面板
│   └── js/                     # 100% 三語 i18n、32×32 HD 精靈與 6 場景像素引擎（含獎盃櫃/營收柱互動與螢火蟲夜景）、打工證與創意溯源證書、8-bit 音效（含 playSlash/playApproveFanfare）、BYOK
├── bin/pixel-worker.mjs        # 本機 BYOT CLI v0.4（onboard / --demo / --watch / --cmd）
├── tests/                      # Node.js 原生 node:test 28 項 API 全鏈路測試與 10 項靜態/三語/SSR/CLI 煙霧測試
├── docs/
│   ├── PRD.md                  # 產品規格書與經濟模型設計
│   └── DEPLOY_AND_PROMOTE.md   # 48 小時極速上線指南（含 SQLite WAL、GitHub Webhook 設定與 /p/:slug 病毒傳播技巧）
├── Dockerfile / render.yaml / fly.toml
└── .env.example                # 完整環境變數範本（GitHub/Google OAuth、GITHUB_WEBHOOK_SECRET、穩定幣收款、Polar/Stripe）
```

---

## 🧪 執行測試與自動化 CI

```bash
# 執行全鏈路 API 測試（28 項 E2E：原生 SQLite WAL 持久化/稽核/備份/指標、/p/:slug 與 /verify/:hash SSR 公開頁與 XSS 防護、GitHub Webhook HMAC-SHA256 驗簽與 PR 合併自動結算、AI 智慧拆單 70/30 均衡、防稀釋治理、5/85/10 分紅、SHA-256 創意溯源鏈、多用戶隔離、三合一支付與 Device Flow）
npm test

# 執行 10 項全面煙霧驗收（全站語法、publicPages.mjs & sound.js 契約、DOM ID 0 重複 0 遺漏、i18n.js + onboard.js 三語對齊與 EN 0 中文字殘留、governance/provenance 模組與 pixel-worker onboard --demo E2E）
npm run smoke
```

---

## 🗺️ Roadmap

- [x] **Alpha-Plus v0.3**：互動像素小鎮、雙軌市場、GitHub Issue 匯入、6 枚創世成就、打工證 PNG、本機 CLI `--demo` / `--watch`、安全加固與 CI
- [x] **Commercial Launch v1.0**：6 大 HD 32×32 室內場景、100% 全站與畫布三語化、官方首頁（`/`）與複製即裝中心、Device Flow（`/onboard`＋`install.ps1` / `install.sh`＋`pixel-worker onboard`）、多用戶隔離帳號（信箱／GitHub／Google）、三合一支付（USDC/USDT＋Polar/Stripe＋卡密兌換碼）與穩定幣分紅提現、鎮長管理面板
- [x] **Governance & Provenance v1.1**：SHA-256 創意溯源鏈（Proof of First Spark）、反抄襲 409 攔截、5%/85%/10% 多勞多得分紅、70/30 防稀釋 4 層治理協議（AI 盲審＋實幹審閱團＋押金沒收＋冷卻懲罰）
- [x] **Production & Viral Growth v1.2**：Node 24 原生 `node:sqlite` WAL 持久化與 500 筆稽核備份、`GET /api/metrics` 運維看板、SSR 公開項目分享頁 `/p/:slug` & 密碼學驗真頁 `/verify/:hash`（OG 卡片＋XSS 防護）、GitHub Webhook HMAC-SHA256 PR 合併自動結算、AI 智慧拆單（70/30 均衡）、8-bit 斬擊／號角音效與畫布特效
- [ ] **v1.3**：鏈上 RPC 自動掃塊驗核、多小鎮聯邦（Multi-Town Federation）與開源孵化基金自動分配

---

<div align="center">

喜歡這個把閒置 AI 算力變成像素小鎮的想法？歡迎點一顆 ⭐ **Star**，或開啟 Issue 提案你的第一個創世項目！

</div>
