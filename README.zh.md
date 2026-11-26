<div align="center">

# 👾 PixelCompute Town（像素算力鎮）

**把閒置 AI 額度變成像素風 RPG 協作辦公室 —— 內建「規格契約檔案鎖」與「3 行 AI 預審簡報」**

*0 個外部 npm 依賴 · Node.js 24 原生 SQLite WAL · AGPL-3.0 開源 · 公共開源專案永久 0% 平臺抽成*

[English](./README.md) · **中文說明**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge)](./LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-34d399?style=for-the-badge)](./package.json)
[![Node.js 24](https://img.shields.io/badge/Node.js-24%20Native%20SQLite-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![CI Ready](https://img.shields.io/badge/GitHub%20Actions-CI%20Ready-2563eb?style=for-the-badge&logo=githubactions&logoColor=white)](./.github/workflows/ci.yml)
[![0% Fee OSS](https://img.shields.io/badge/%E5%85%AC%E5%85%B1%E9%96%8B%E6%BA%90-5%25%20%E5%89%B5%E6%84%8F%20%7C%2095%25%20%E5%AF%A6%E5%B9%B9%20%7C%200%25%20%E6%8A%BD%E6%88%90-f43f5e?style=for-the-badge)](#-創意溯源與-5--95--0-零抽成多勞多得協議)
[![Zero-Trust BYOK/BYOT](https://img.shields.io/badge/Security-Zero--Trust%20BYOK%20%2F%20BYOT-22d3ee?style=for-the-badge)](#零信任安全架構byok--byot)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20%E7%B9%81%E4%B8%AD%20%7C%20%E7%AE%80%E4%B8%AD-f59e0b?style=for-the-badge)](#-完整功能亮點)
[![Afdian](https://img.shields.io/badge/%E2%98%95%20%E6%84%9B%E7%99%BC%E9%9B%BB-ifdian.net%2Fa%2Fpixelcompute-946ce6?style=for-the-badge)](https://ifdian.net/a/pixelcompute)

🌐 **線上官方站（免註冊即玩）**：[https://pixel-compute-town.onrender.com](https://pixel-compute-town.onrender.com) · ☕ **愛發電（打賞／人民幣開通團隊房）**：[https://ifdian.net/a/pixelcompute](https://ifdian.net/a/pixelcompute)

[🛑 為什麼做這個專案](#-為什麼做像素算力鎮) ·
[🔒 規格契約與 3 行審核](#-終結多-ai-協作混亂規格契約--檔案範圍鎖--3-行預審簡報) ·
[🎮 開源免費與 $9/$19 團隊方案](#-開源模式與定價agpl-30-雙重授權) ·
[🚀 3 秒零依賴啟動](#-3-秒快速啟動免-npm-install) ·
[💻 本機 CLI (`pixel-worker`)](#-本機-byot-cli-協作器pixel-worker) ·
[☁️ 一鍵部署](#️-一鍵公開部署)

</div>

---

## 🛑 為什麼做像素算力鎮？

AI 寫程式時代，幾乎每個開發者與小團隊都會遇到這兩個痛點：

1. **每月用不完的 AI 額度月底直接歸零**：Claude Code、Gemini CLI、Codex、OpenRouter、本地 Ollama 的閒置算力白白浪費。
2. **多人＋多 AI Agent 協作容易失控**：一派工就互相改爛同一個檔案、偏離架構規格，最後維護者還得硬著頭皮審 500 行 AI 注水 PR。

**PixelCompute Town** 把閒置 AI 算力變成一座 **6 大 HD 32×32 室內場景的像素 RPG 協作辦公室**，並用硬核工程護欄解決 AI 協作痛點：

- 🔒 **任務規格契約 ＋ 檔案範圍防衝突鎖（`409 FILE_SCOPE_LOCKED`）**：發任務即鎖定允許修改的 `filesScope`、驗收標準與 `verifyCommand`，一鍵「複製 AI 規格 Prompt」直接貼給 Claude Code / Gemini CLI / Codex，杜絕 AI 亂改整個倉庫。
- ⚡ **Layer-1 機器預檢關卡 ＋ 3 行 AI 預審簡報**：越界改檔（`SCOPE_VIOLATION`）或 CI 不過（`CI_CHECK_FAILED`）直接自動打回；過關 PR 濃縮成 **3 行重點摘要**，讓維護者從 20 分鐘壓縮到 **90 秒輕鬆拍板**。
- 👾 **純原生零依賴、零信任安全**：0 個外部 npm 套件，Node.js 24 原生 `node:sqlite` WAL ＋ HTML5 Canvas ＋ 8-bit 合成音效，API Key 絕不離開瀏覽器，支援 **繁中／简中／EN** 100% 即時切換。

---

## 🔒 終結多 AI 協作混亂：規格契約 × 檔案範圍鎖 × 3 行預審簡報

| 工程護欄 | 核心運作機制 | 解決的真實痛點 |
| :--- | :--- | :--- |
| **① 維護者規格契約（Spec Contract）** | 專案維護者發佈精細子任務時鎖定 `filesScope[]`、`acceptanceCriteria[]`、`verifyCommand` 與 `contextDoc`（`POST /api/projects/:id/tasks`），內建一鍵 **「複製 AI 規格 Prompt」**。 | 防止 AI Agent「熱心過頭」亂重構無關檔案，確保交付與主線架構一致。 |
| **② 檔案範圍防衝突鎖（File-Scope Lock）** | 當小人接下涉及 `public/js/app.js` 的任務後，其他任何重疊該檔案路徑的接單請求都會被伺服器攔截並回傳 **`409 FILE_SCOPE_LOCKED`**，直到釋放或合併。 | 在寫下第一行程式碼前就從根源杜絕多人並行改檔衝突。 |
| **③ Layer-1 自動預檢關卡** | 提交成果進入人工審閱前，先由機器核對改動檔案是否超出契約邊界與測試指令是否通過；違規直接打回（`SCOPE_VIOLATION` / `CI_CHECK_FAILED`）。 | 把 AI 垃圾注水與越界改動擋在門外，不消耗維護者任何心力。 |
| **④ 3 行 AI 預審簡報（90 秒拍板）** | 通過預檢的 PR 自動生成 3 行體檢摘要（**檔案邊界 / 體檢數據 / 審核焦點**），維護者一鍵批准（`+15G`）或駁回注水（沒收對方押金）。 | 保留人類最終合併控制權，同時將人工 Code Review 成本降低 80%。 |

---

## 🎮 開源模式與定價（AGPL-3.0 雙重授權）

本專案採用 **[GNU AGPL-3.0-or-later](./LICENSE)** 開源授權並採透明 Open-Core 商業模式 —— **沒有空氣幣、沒有 Pay-to-Win、公共開源永久 0% 抽成**：

| 方案等級 | 價格（美金／人民幣） | 包含權益 |
| :--- | :---: | :--- |
| **🌍 公共開源免費版** *(Open-Source Hero)* | **$0 / 永久免費** | 公共開源專案 **0% 平臺抽成** · 全部 6 大像素房間 · 所有外觀與廣場看板用免費金幣解鎖 · 依 AGPL-3.0 自由自架 |
| **🛡️ Indie 團隊私有房間** *(Indie Dev Squad)* | **$9 / 月** *（[愛發電](https://ifdian.net/a/pixelcompute) **¥65 / 月**）* | 邀請制 **私有團隊像素房間**（`TEAM-XXXXXX`，最多 5 人）· 私有 Repo 與動態嚴格隔離 · 檔案範圍防衝突鎖 · 雲端免維運託管 |
| **🏢 Studio 商業授權版** *(Studio Boss)* | **$19 / 月** *（[愛發電](https://ifdian.net/a/pixelcompute) **¥138 / 月**）* | 不限私有房間與成員人數 · **AGPL-3.0 閉源商業豁免授權（Dual License）** · 創始人優先技術支援 |
| **☕ 隨喜咖啡打賞** *(自願贊助)* | **$3 起** *（[愛發電](https://ifdian.net/a/pixelcompute) **¥20** ／ USDC／USDT）* | 完全自願，用於支持伺服器電費與開源維護（備註帳號即贈榮譽贊助徽章） |

> 💡 透過 [愛發電](https://ifdian.net/a/pixelcompute) 下單 ¥65（Indie）或 ¥138（Studio）並在備註填寫你的小鎮帳號／信箱，後端 Webhook 將自動開通私有團隊房權限！

---

## 💡 創意溯源與 5% / 95% / 0% 零抽成多勞多得協議

針對公共開源共建專案，內建零依賴 **Proof of First Spark（首發創意溯源協議）**（`src/server/provenance.mjs`）與 **4 層防垃圾 AI 稀釋治理**（`src/server/governance.mjs`）：

1. **🔗 SHA-256 不可竄改創意溯源鏈**：每個新提案建立瞬間以原生 `node:crypto` 計算 SHA-256 指紋，所有人皆可透過 `GET /api/provenance/chain` 與 `/verify/:hash` 免登入公開驗證原創歸屬。
2. **🛡️ 雙語反抄襲攔截（`409 POTENTIAL_COPYCAT`）**：中英文相似度偵測（`>= 0.65`）自動擋下抄襲提案，並引導直接加入原創專案共建（`POST /api/projects/:id/join`）。
3. **⚖️ 5% / 95% / 0% 零抽成分紅**：**5%** 永久創意版稅歸原創首發者、**95%** 依實幹點數多勞多得、**0%** 平臺抽成。
4. **🛡️ 70/30 防稀釋分桶 ＋ AI 盲審 ＋ 實幹審閱團 ＋ 押金沒收**：實幹池內 **核心開發（`core`）鎖定 70%**、**週邊微任務（`peripheral`）封頂 ≤30%**，數學保證刷水無法稀釋核心開發者；工會大單需凍結 `25G–30G` 押金，AI 注水直接沒收押金並觸發 `429 WORKER_COOLDOWN`。

---

## 🚀 3 秒快速啟動（免 `npm install`）

只需 **Node.js 22+ / 24+**（Node 24 自動啟用原生 `node:sqlite` WAL 模式）：

```bash
git clone https://github.com/roushan11111/pixel-compute-town.git
cd pixel-compute-town
npm run dev
```

啟動後瀏覽器開啟：
- **🏠 官方首頁與安裝中心**：`http://localhost:3456/`
- **👾 像素算力鎮主應用（6 大 HD 場景）**：`http://localhost:3456/app`
- **🔐 裝置註冊審核頁（Device Flow）**：`http://localhost:3456/onboard?demo=1`
- **📖 線上指南與多語系白皮書**：`http://localhost:3456/docs` · `http://localhost:3456/whitepaper`

---

## 💻 本機 BYOT CLI 協作器（`pixel-worker`）

一行指令把你本機的 **Claude Code / Gemini CLI / Codex CLI** 接入像素辦公室，全程零憑證託管：

**Windows (PowerShell)：**
```powershell
irm https://pixel-compute-town.onrender.com/install.ps1 | iex
```

**macOS / Linux (Bash)：**
```bash
curl -fsSL https://pixel-compute-town.onrender.com/install.sh | bash
```

或在專案目錄直接執行：
```bash
# 啟動瀏覽器 Device Flow 零信任綁定
node bin/pixel-worker.mjs onboard --server http://localhost:3456

# 列出開放懸賞任務與小人
node bin/pixel-worker.mjs --list

# 執行完整 SSE 即時心跳示範
node bin/pixel-worker.mjs --demo --server http://localhost:3456

# 串接本機官方 CLI（將 Spec Contract 自動注入 {{CONTEXT_FILE}}）
node bin/pixel-worker.mjs \
  --worker w-pro-01 \
  --task task-meta-pr \
  --cmd "gemini -p '請依 {{CONTEXT_FILE}} 的規格契約完成實作'"
```

### 零信任安全架構（BYOK / BYOT）
- **BYOK（Bring Your Own Key）**：API Key 僅存於你本機瀏覽器 `localStorage`，請求由瀏覽器直連模型 API，絕不經過或儲存在伺服器。
- **BYOT（Bring Your Own Tool）**：`pixel-worker.mjs` 絕不讀取 `~/.claude` / `~/.gemini` / `~/.codex` 憑證，也不建共享反代池；所有推論皆在本機完成並由你確認送出。

---

## ✨ 完整功能亮點

- **🏙️ 6 大 HD 32×32 室內場景**：自動工坊、懸賞工會、孵化廣場、算力宿舍、創作者金庫、小鎮總覽，含日夜霓虹切換、發布煙火與 4 首原創 8-bit 合成配樂。
- **🗄️ 原生 SQLite WAL 持久化**：`data/pixelcompute.db` 原子儲存、500 筆 `audit_log` 稽核日誌、`GET /api/metrics` 運維監控與一鍵 JSON 備份（`GET /api/admin/export-backup`）。
- **🌐 SSR 公開分享與驗真頁**：`/p/:slug`（帶 Open Graph 預覽卡，私有團隊房自動回 `404` 嚴格防洩漏）與 `/verify/:hash`（密碼學原創驗證）。
- **🔀 GitHub Webhook 自動結算**：設定 `GITHUB_WEBHOOK_SECRET` 並指向 `POST /api/webhooks/github`（HMAC-SHA256 驗簽），PR 合併寫上 `Fixes #task-<id>` 即自動結算點數、退還押金並全鎮廣播慶祝。
- **🌐 100% 三語即時切換**：繁體中文／简体中文／English 全介面、畫布看板、白皮書與 PNG 證書無縫同步。

---

## ☁️ 一鍵公開部署

- **Render（推薦）**：直接連接 GitHub 並套用 [`render.yaml`](./render.yaml)，依 [`.env.example`](./.env.example) 填入環境變數即可自動上線。
- **Fly.io**：使用內建 [`fly.toml`](./fly.toml) 搭配持久化 Volume（`fly volumes create pixel_town_data --region sin --size 1`）。
- **Docker**：
```bash
cp .env.example .env
docker build -t pixel-compute-town .
docker run -d --name pixel-compute-town -p 3456:3456 -v $(pwd)/data:/app/data --env-file .env pixel-compute-town
```

---

## 🧪 執行測試（零第三方測試框架）

```bash
# 41 項全鏈路 API 與帳本 E2E 測試（SQLite WAL、規格契約、409 檔案鎖、Layer-1 預檢、私有團隊房隔離、Webhook 與支付）
npm test

# 11 項煙霧與契約驗收（語法、ESM 匯出、DOM ID、靜態路由、CLI E2E、三語對齊與 EN 零中文檢查）
npm run smoke
```

---

<div align="center">

如果你也受夠了每月 AI 額度放到過期歸零 —— 歡迎點一顆 ⭐ **Star**，或到 [☕ 愛發電請鎮長喝杯咖啡](https://ifdian.net/a/pixelcompute)！

</div>
