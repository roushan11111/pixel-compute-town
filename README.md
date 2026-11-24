<div align="center">

# 👾 PixelCompute Town（像素算力鎮）

**將開發者閒置的 AI API 額度與月／週 CLI 訂閱額度（BYOT），轉化為賽博像素小鎮裡的算力小人**<br>
**共同投票立項 · 雙軌接單打工 · 防作弊驗收上線 · 30/60/10 透明分紅**

*Turn idle AI API credits & monthly CLI quotas into pixel workers that vote, build, ship, and share revenue together.*

[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-34d399?style=for-the-badge)](./package.json)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B%20%2F%2024-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![CI](https://img.shields.io/badge/GitHub%20Actions-CI%20Ready-2563eb?style=for-the-badge&logo=githubactions&logoColor=white)](./.github/workflows/ci.yml)
[![Zero-Trust BYOK](https://img.shields.io/badge/Security-Zero--Trust%20BYOK%20%2F%20BYOT-22d3ee?style=for-the-badge)](#零信任與合規安全架構)
[![i18n](https://img.shields.io/badge/i18n-繁中%20%7C%20简中%20%7C%20EN-f59e0b?style=for-the-badge)](#-核心特色一覽)
[![Deploy to Render](https://img.shields.io/badge/Deploy-Render%20%2F%20Fly.io%20%2F%20Docker-a855f7?style=for-the-badge)](#一鍵公開上線部署)

[🚀 3 秒快速啟動](#-3-秒快速啟動零依賴開箱即玩) ·
[🏗️ 雙軌算力架構](#️-雙軌算力市場與零信任安全架構) ·
[💻 本機 CLI 協作器](#-本機-byot-cli-協作器pixel-worker) ·
[☁️ 一鍵公開部署](#️-一鍵公開上線部署) ·
[📣 48 小時上線推廣手冊](./docs/DEPLOY_AND_PROMOTE.md)

</div>

---

## ✨ 為什麼會有像素算力鎮？

幾乎每位開發者每個月都有兩筆「過期就歸零」的閒置算力：
1. **用不完的免費／贈金 API 額度**（Gemini API、OpenRouter、本地 Ollama 等）
2. **月底還沒刷完的官方 CLI 月／週訂閱額度**（Gemini CLI、Claude Code、Codex CLI 等）

**PixelCompute Town** 把這些閒置算力變成一座充滿生命力的「賽博暖夜像素小鎮」：招募 4 種職業像素小人、投票選出想孵化的開源與獨立小工具、雙軌派工並通過 **Proof of Accepted Work（成果驗收制）**，推到 100% 綻放全鎮像素煙火發布上線，並按透明公式共享真實分紅！

---

## 🚀 3 秒快速啟動（零依賴，開箱即玩）

本專案堅持 **0 個外部 npm 依賴**（純 Node.js 原生模組 + 原生 HTML5 Canvas + Web Audio API 8-bit 合成音效），無需 `npm install` 即可啟動：

```bash
git clone https://github.com/<your-username>/pixel-compute-town.git
cd pixel-compute-town
npm run dev
```

開啟瀏覽器訪問：**`http://localhost:3456`**

> 💡 **免配置開箱體驗**：未設定 GitHub OAuth 或 Gemini API Key 時，系統會自動啟用「創始開發者 Demo 模式」與高品質擬真模擬交付，讓你 30 秒內體驗從投票立項、派工、驗收、上線煙火、30/60/10 分紅到下載《像素算力打工證 PNG》的完整閉環！

### 在終端機直播你的算力小人（BYOT Demo）

另開一個終端機視窗，執行：

```bash
npm run worker:demo
```

回到瀏覽器像素小鎮畫布，即可親眼看到你的小人即時接收本機 CLI 心跳（SSE）、走到懸賞工會工位敲鍵盤、冒出進度氣泡，並在驗收通過後噴出金幣與貢獻點！

---

## 🎮 核心特色一覽

| 模組 | 亮點功能 |
| :--- | :--- |
| **🏙️ 互動像素小鎮畫布** | 手工繪製像素矩陣精靈、4 種職業小人與多款皮膚、日夜賽博霓虹切換（夜晚閃爍星光＋偶發流星、白天漂浮像素白雲）、商店裝潢實景擺放、滑鼠懸停小人資訊卡、4 座可點擊建築與全屏上線煙火＋8-bit 音效 |
| **⚡ 雙軌任務市場** | **自動工坊（`api_auto`）** 支援瀏覽器端真實 Gemini / OpenRouter / Ollama BYOK 執行與自動掛機；**懸賞工會（`guild_bounty`）** 支援一鍵複製 Context Pack、GitHub PR 連結驗證與本機 CLI `--demo` / `--watch` 即時直播 |
| **🔗 GitHub Issue 一鍵匯入** | 直接貼上任意公開 GitHub Repo（`owner/repo` 或完整網址）自動匯入真實 Open Issues 成為小鎮懸賞任務，離線／限流時優雅降級生成預覽任務卡 |
| **🌐 三語即時切換（繁中／简中／EN）** | 頂部 HUD 一鍵即時切換繁體中文、簡體中文與英文介面，並附 3 步互動新手導引條，一鍵向全球社群展示 |
| **🏅 創世成就系統與打工證 PNG** | 6 枚自動解鎖創世成就（首單開張、雙軌大師、立項推手、上線創世者、首批分紅股東、本機 CLI 先鋒），自動贈送金幣並刻印在可一鍵匯出的《像素算力打工證 PNG》底部 |
| **🛡️ Proof of Accepted Work & 生產加固** | 絕不按消耗 Token 灌水發獎！內建防作弊驗收引擎（JSON Schema、代碼/PR 特徵、AI Slop 攔截），並配備 HTTP 安全標頭、寫入速率限制（`RATE_LIMIT_MAX`）與優雅關機 |
| **🗳️ 投票立項與 30/60/10 分紅** | 社群自由提案，投滿門檻自動從 `voting` 解鎖為 `building` 並自動生成雙軌任務；達 100% 發布上線並透明結算 **發起人 30% / 貢獻者 60% / 平臺 10%** |
| **💰 創作者收益看板** | 完整呈現 4 條平臺變現現金流：現金懸賞 10% 服務費、孵化分紅池 10% Carry、像素廣場霓虹廣告位、皮膚與 Pro 會員 |

---

## 🏗️ 雙軌算力市場與零信任安全架構

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     PixelCompute Town (Node.js Server)                  │
│  REST API · Atomic JSON Store (data/state.json) · Verifier · SSE Feed  │
└───────────────▲───────────────────────────────────────▲─────────────────┘
                │ 僅傳送任務狀態與驗收成果                  │ 僅傳送進度心跳 + 確認後成果
                │ （伺服器絕不接觸任何 Key/Token）          │ （絕不讀取本機憑證）
┌───────────────┴───────────────┐       ┌───────────────┴─────────────────┐
│  🏭 Track 1: 自動工坊 (BYOK)   │       │  ⚔️ Track 2: 懸賞工會 (BYOT)     │
│  Browser localStorage Only    │       │  Local CLI: bin/pixel-worker.mjs │
│  • Gemini 2.5 Flash / Pro     │       │  • Gemini CLI / Claude Code     │
│  • OpenRouter / Local Ollama  │       │  • Codex CLI / Local Scripts    │
│  • 每日 Token 體力上限保護      │       │  • 本機執行 → 人工確認 → 提交驗收   │
└───────────────────────────────┘       └─────────────────────────────────┘
```

### 零信任與合規安全架構
- **BYOK（Bring Your Own Key）**：API Key 僅儲存在你自己的瀏覽器 `localStorage`，請求直接由瀏覽器發送至模型端點，絕不經過或儲存在後端伺服器。
- **BYOT（Bring Your Own Tool）**：針對月／週訂閱工具，絕不提供帳號代管、不碰 `~/.gemini` / `~/.claude` / `~/.codex` 憑證、不建共享反代池；所有推論皆在開發者本機透過官方 CLI 合法完成並由本人確認提交。

---

## 💻 本機 BYOT CLI 協作器（`pixel-worker`）

`bin/pixel-worker.mjs` 是零依賴本機橋接器，讓你在終端機幹活的同時，把小人的工作狀態即時同步到像素小鎮畫面：

```bash
# 查看完整說明與安全保證
node bin/pixel-worker.mjs --help

# 列出小鎮中開放的工會懸賞單與算力小人 ID
node bin/pixel-worker.mjs --list

# 執行完整模擬流程（接單 → 即時 SSE 心跳直播 → 驗收交卷）
node bin/pixel-worker.mjs --demo --server http://localhost:3456

# 啟動常駐 Watch 模式（定時輪詢該小人的待辦任務並穩定發送心跳，支援 --interval 與 --max-ticks）
node bin/pixel-worker.mjs --watch --worker w-pro-01 --interval 5
# 或直接執行：npm run worker:watch

# 串接你本機的官方 CLI（如 Gemini CLI / Claude Code / Codex）
node bin/pixel-worker.mjs \
  --worker w-pro-01 \
  --task task-meta-pr \
  --cmd "gemini -p '請依 {{CONTEXT_FILE}} 的規格完成實作'"

# 提交本機已完成的檔案並附上 GitHub PR 連結
node bin/pixel-worker.mjs \
  --task task-i18n-ast-pr \
  --output ./deliverable.md \
  --pr https://github.com/pixel-compute-town/i18n-pixelbot/pull/42
```

---

## ☁️ 一鍵公開上線部署

專案已內建完整容器與雲端平台設定檔，支援 3 分鐘免費公開上線 Public Alpha：

### 1. Render（推薦，免費 Blueprint 一鍵上線）
直接連接 GitHub Repo 並套用 [`render.yaml`](./render.yaml)，填入 `.env.example` 中的 `APP_BASE_URL` 與可選的 GitHub OAuth 憑證即可自動建置並通過 `/api/health` 健康檢查。

### 2. Fly.io（全球低延遲＋持久化 Volume）
使用內建 [`fly.toml`](./fly.toml)：
```bash
fly launch --no-deploy --copy-config
fly volumes create pixel_town_data --region sin --size 1
fly secrets set APP_BASE_URL="https://pixel-compute-town.fly.dev"
fly deploy
```

### 3. Docker 自建部署
使用內建 [`Dockerfile`](./Dockerfile)（基於 `node:22-alpine`，內建 `/api/health` HEALTHCHECK）：
```bash
cp .env.example .env
docker build -t pixel-compute-town .
docker run -d --name pixel-compute-town -p 3456:3456 -v $(pwd)/data:/app/data --env-file .env pixel-compute-town
```

> 📖 需要完整的 **GitHub OAuth 申請教學、自訂網域設定、30 秒 Demo 錄影腳本與三語（繁中／簡中／英文）X・Reddit・Show HN・V2EX・即刻・Product Hunt 推廣文案包**？
> 請直接閱讀：[docs/DEPLOY_AND_PROMOTE.md](./docs/DEPLOY_AND_PROMOTE.md)

---

## 🗂️ 專案目錄結構

```text
pixel-compute-town/
├── .github/workflows/ci.yml    # GitHub Actions 自動化 CI（Node 24 零依賴自動執行 test + smoke）
├── server.mjs                  # 零依賴 HTTP 伺服器、REST API、安全標頭、速率限制與 SSE
├── src/server/                 # 後端核心模組（種子世界、原子儲存、防作弊驗收、GitHub OAuth、SSE）
├── public/                     # 前端 UI、三語 i18n、互動像素小鎮引擎、精靈矩陣、8-bit 音效、BYOK 與打工證
├── bin/pixel-worker.mjs        # 本機 BYOT CLI 協作器（--demo / --watch 常駐監聽 / --cmd 本機整合）
├── tests/                      # Node.js 原生 node:test API 全鏈路測試與靜態煙霧測試
├── docs/
│   ├── PRD.md                  # 產品規格書與經濟模型設計
│   └── DEPLOY_AND_PROMOTE.md   # 48 小時極速上線指南＋三語爆款推廣文案包
├── Dockerfile                  # node:22-alpine 零依賴生產鏡像（含 /api/health 檢查）
├── render.yaml                 # Render Blueprint 一鍵部署設定
├── fly.toml                    # Fly.io 部署與持久 Volume 設定
└── .env.example                # 環境變數範本（GitHub OAuth / 速率限制 / Polar Webhook）
```

---

## 🧪 執行測試與自動化 CI

專案內建 [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)，每次 `push` 與 `pull_request` 都會在 **Node.js 24** 環境下自動驗證零外部依賴並執行完整測試套件：

```bash
# 執行後端 API、防作弊、成就、速率限制與分紅帳本測試（Node.js 原生 node:test）
npm test

# 執行靜態一致性、三語 i18n、部署檔與 CLI (--help / --list / --demo / --watch) 煙霧測試
npm run smoke
```

---

## 🗺️ Roadmap

- [x] **Alpha-Plus v0.3**：互動賽博暖夜像素小鎮（星空流星／白雲／商店裝潢實景／小人懸停卡）、三語即時切換（繁中／簡中／EN）、GitHub 公開倉庫 Issue 一鍵匯入、6 枚創世成就與打工證徽章、本機 BYOT `pixel-worker` `--demo` & `--watch` 常駐模式、生產安全標頭與速率限制、GitHub Actions CI、一鍵雲端部署
- [ ] **Beta v0.4**：Polar.sh / Stripe Connect 真實現金懸賞託管結算與 Webhook 驗簽
- [ ] **Beta v0.5**：GitHub App 雙向自動同步（PR Merge 自動觸發分紅記功與審核流）
- [ ] **v1.0**：多小鎮聯邦（Multi-Town Federation）與開源孵化基金自動分配

---

<div align="center">

喜歡這個把閒置 AI 算力變成像素小鎮的想法？歡迎點一顆 ⭐ **Star**，或開啟 Issue 提案你的第一個創世項目！

</div>
