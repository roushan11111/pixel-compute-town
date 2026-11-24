# 🚀 PixelCompute Town（像素算力鎮）48 小時極速上線與搶先推廣作戰手冊

> **給創作者的睡醒即戰指南**：本手冊幫你在 **48 小時內** 完成 Public Alpha 公開上線、錄製 30 秒高轉化像素 Demo、並用三語爆款文案包在 X / Reddit / Show HN / V2EX / 即刻 / Product Hunt 搶佔「閒置 AI 算力協作小鎮」的第一心智！

---

## 📅 48 小時極速作戰時間表

| 時段 | 目標里程碑 | 核心動作 |
| :--- | :--- | :--- |
| **H0 – H2** | 公開網址上線 | 推送 GitHub Repo → 申請 GitHub OAuth App → Render 或 Fly.io 一鍵上線 → 驗證 `/api/health` 與 HTTPS |
| **H2 – H4** | 錄製 30 秒王牌 Demo | 依下方分鏡腳本錄製 1080p 60fps 像素小鎮實機影片（含煙火、打工證 PNG 與本機 CLI 即時跳動） |
| **H4 – H12** | 第一波種子引爆（中文＋X） | 發佈 X (Twitter) 爆款推文串（配 30 秒影片）＋ V2EX「分享創造」＋ 即刻招募首批 50 位「創世元老」 |
| **H12 – H24** | 歐美開發者破圈 | 黃金時段（美東上午 9:00 / UTC 13:00）發佈 `Show HN` + `r/SideProject` + `r/vibecoding` |
| **H24 – H36** | 蒐集回饋＋熱修 | 收集前 20 位創世元老的提案與 GitHub PR，把真實貢獻者截圖貼回評論區製造滾雪球效應 |
| **H36 – H48** | Product Hunt 預約衝榜 | 依本手冊 PH 上架清單建立 Launch Page（Upcoming），引導首批社群點 Notify Me |

---

## 🛠️ 第一部分：一步步零痛點公開上線指南

本專案採用 **零外部 npm 依賴（Node.js 22+ 原生模組）**，啟動時間低於 1 秒、記憶體占用極低，非常適合免費或極低成本部署 Public Alpha。

### Step 1：把專案推上 GitHub（自動觸發 CI 綠燈保護）

專案已內建 [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)，推送至 `main` 後會自動於 Node.js 24 環境執行零依賴檢查、`npm test`（含安全標頭、速率限制、GitHub Issue 匯入、6 枚創世成就與 30/60/10 分紅精確度測試）與 `npm run smoke`（含 `pixel-worker --watch` 端對端檢查）。

```bash
git init
git add .
git commit -m "feat: launch PixelCompute Town Alpha-Plus"
git branch -M main
git remote add origin https://github.com/<你的帳號>/pixel-compute-town.git
git push -u origin main
```

> 🛡️ **生產環境安全提示**：伺服器已內建安全標頭（`X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy`）、寫入速率限制（可透過 `RATE_LIMIT_MAX` 環境變數調整，預設每分鐘 120 次）與 `SIGTERM`/`SIGINT` 優雅關機。

---

### Step 2：申請 GitHub OAuth App（約 2 分鐘）

> 💡 若你只想先用「免登入 Demo 創始開發者模式」快速測試，可先跳過此步，待上線網址確定後再補填環境變數即可！

1. 前往 [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers)，點擊 **New OAuth App**。
2. 填寫表單：
   - **Application name**：`PixelCompute Town`
   - **Homepage URL**：`https://<你的公開網域>`（例如 `https://pixel-compute-town.onrender.com` 或 `https://town.pixelcompute.dev`）
   - **Application description**：`Turn idle API keys & CLI quotas into pixel workers that ship open-source projects together.`
   - **Authorization callback URL**：`https://<你的公開網域>/api/auth/github/callback`
3. 點擊 **Register application**，記下 **Client ID**，並點擊 **Generate a new client secret** 複製 **Client Secret**。

---

### Step 3A：方案一 — Render 一鍵免費上線（最推薦，3 分鐘上線）

本專案已內建 [`render.yaml`](../render.yaml) 與 [`Dockerfile`](../Dockerfile)：

1. 登入 [Render Dashboard](https://dashboard.render.com/)，點擊 **New + → Blueprint**。
2. 選擇你的 `pixel-compute-town` GitHub Repo，Render 會自動偵測 `render.yaml`。
3. 填入以下環境變數：
   - `APP_BASE_URL`：`https://<Render 分配的網址>`（部署後確認精確 URL 再微調）
   - `GITHUB_CLIENT_ID`：剛剛取得的 Client ID（可選）
   - `GITHUB_CLIENT_SECRET`：剛剛取得的 Client Secret（可選）
   - `POLAR_WEBHOOK_SECRET`：初期 Alpha 可留空
4. 點擊 **Apply**，等待約 1–2 分鐘建置完成。
5. 開啟 `https://<你的網址>/api/health`，看到 `{"ok":true,...}` 即代表上線成功！

> ⚠️ **資料持久化提醒**：Render 免費方案（`plan: free`）在休眠重啟後會重置容器檔案系統。一旦迎來真實註冊玩家，只需升級至 Starter 方案（$7/月）並取消註解 `render.yaml` 底部的 `disk:` 區塊（掛載至 `/app/data`），即可永久保存 `data/state.json`。

---

### Step 3B：方案二 — Fly.io 全球低延遲＋免費持久硬碟（進階首選）

本專案已內建 [`fly.toml`](../fly.toml)，直接掛載 1GB 持久化 Volume 到 `/app/data`，重啟資料不遺失：

```bash
# 1. 安裝並登入 Fly CLI
fly auth login

# 2. 初始化應用（套用現有 fly.toml，先不部署）
fly launch --no-deploy --copy-config

# 3. 建立 1GB 持久化硬碟（新加坡節點 sin，也可改 nrt 東京 / sjc 矽谷）
fly volumes create pixel_town_data --region sin --size 1

# 4. 設定敏感環境變數（將網址改為你的 app 名稱）
fly secrets set \
  APP_BASE_URL="https://pixel-compute-town.fly.dev" \
  GITHUB_CLIENT_ID="你的_CLIENT_ID" \
  GITHUB_CLIENT_SECRET="你的_CLIENT_SECRET" \
  SESSION_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"

# 5. 一鍵建置並部署
fly deploy

# 6. 檢查健康狀態與即時日誌
fly status
fly logs
```

---

### Step 3C：方案三 — Docker / 自建 VPS 一鍵啟動

```bash
docker build -t pixel-compute-town .
docker run -d \
  --name pixel-compute-town \
  --restart unless-stopped \
  -p 3456:3456 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  pixel-compute-town
```

---

### Step 4：綁定自訂網域與開啟 HTTPS

1. 建議購買簡短有記憶點的網域（例如 `pixelcompute.town`、`pixelcompute.dev`、`computetown.io`）。
2. **Render**：進入 Service → **Settings → Custom Domains** → 新增網域 → 依指示在 Cloudflare / Namecheap 新增 `CNAME` 指向 Render 網址（自動簽發 Let's Encrypt SSL）。
3. **Fly.io**：執行 `fly certs add town.yourdomain.com`，按輸出結果設定 `A / AAAA` 或 `CNAME` 紀錄即可自動開啟 HTTPS。
4. **最後別忘了兩處同步更新**：
   - 更新環境變數 `APP_BASE_URL=https://你的自訂網域`
   - 更新 GitHub OAuth App 的 **Homepage URL** 與 **Authorization callback URL** 為新網域！

---

## 🎬 第二部分：30 秒吸睛像素 Demo 錄影分鏡腳本

> **錄影秘訣**：不用剪輯特效，直接用 **OBS / Screen Studio / CleanShot X** 錄製瀏覽器（16:9，1920×1080，60fps，縮放 100%）。錄影前先點開 **賽博暖夜模式** 並開啟 **8-bit 音效**（錄進系統音訊更帶感！）。發佈海外平台（X 英文串 / Reddit / Show HN / Product Hunt）前，只需點一下頂部 HUD 的 **`繁中 / 简中 / EN` 三語切換鈕** 切到 `EN`，即可 1 秒錄出全英文介面 Demo！
>
> 💡 **加分鏡頭**：別忘了順手展示 **「🔗 從 GitHub 匯入真實 Issue」** 一鍵變出任務卡，以及解鎖 **創世成就徽章** 後刻印在《算力打工證 PNG》底部的炫酷畫面！

| 秒數 | 畫面鏡頭（實機操作） | 螢幕大字字幕（中 / EN） | 節奏與音效 |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:04** | 全景定格賽博霓虹像素小鎮：齒輪轉動、咖啡機冒熱氣、小人走動，滑鼠滑過 4 座建築亮起霓虹邊框 | **你的 AI 額度月底又過期了？** <br> *Idle AI quotas expiring again?* | 清脆 8-bit 開場音 |
| **0:04 – 0:10** | 在右側「自動工坊」點選一張任務派給 `閃電小吉` → 小人立刻沿石板路跑進工坊敲鍵盤、頭頂冒氣泡「呼叫 Gemini Flash...」 | **把閒置 API 與月費額度，變成會幫你打工的像素小人** <br> *Turn idle API & CLI quotas into pixel workers* | 派工音效＋鍵盤像素氣泡 |
| **0:10 – 0:16** | 畫面切半顯示終端機跑 `node bin/pixel-worker.mjs --demo`，左側像素小鎮中的 `架構師阿瓜` 即時同步走進懸賞工會、冒出「本機 CLI 同步中...」並通過驗收噴出 `+150G` | **BYOK 零信任 × 本機 CLI 即時直播（不偷 Key、不抓 Token）** <br> *Zero-trust BYOK + local BYOT CLI live sync* | 金幣彈跳音效 |
| **0:16 – 0:23** | 切到「孵化廣場」點擊投票把 `PixelPomo` 從 8/10 投到 10/10 破土動工，再點已達 100% 項目「一鍵發布上線」→ **全屏綻放像素煙火**＋30/60/10 分紅入帳！ | **社群投票立項 → 達標上線 → 30/60/10 透明分紅** <br> *Vote to build → Ship with fireworks → Share 60% revenue* | 煙火連發音效（高潮點！） |
| **0:23 – 0:27** | 點擊「下載算力打工證 PNG」彈出復古像素證書卡片，順手切到「創作者收益」看板閃過 4 條現金流 | **不按 Token 灌水，只按驗收成果記功（Proof of Accepted Work）** <br> *Proof of Accepted Work. Zero AI slop.* | 驗收通過提示音 |
| **0:27 – 0:30** | 回到小鎮全景＋霓虹廣告牌特寫，疊加 Repo 網址與開箱指令 `npm run dev` | **開源零依賴 · 立即成為像素算力鎮創世居民！** <br> *Open-source · Zero deps · `pixelcompute.town`* | 收尾和弦 |

---

## 📣 第三部分：三語爆款推廣文案包（直接複製發佈）

> 使用前請將文中的 `[YOUR_LIVE_URL]` 與 `[YOUR_GITHUB_URL]` 替換為你的真實上線連結。

---

### 🐦 1. X (Twitter) 爆款推文串（6 則 Thread）

#### 【繁體中文版】

**Tweet 1（主推文 — 必配 30 秒像素 Demo 影片！）**
> 我做了一個把「閒置 AI 額度」變成像素遊戲小人的開源小鎮 —— **PixelCompute Town（像素算力鎮）** 👾⚡
>
> 很多開發者每個月都買了 Gemini / Claude / Codex 訂閱，還有一堆用不完的 API 贈金，月底直接浪費掉。
>
> 所以我把閒置算力做成一間賽博像素小鎮：
> 投票立項 → 派算力小人接單打工 → 驗收上線放煙火 → 透明分享真實分紅 💸
>
> 30 秒實機看小人怎麼幫開源專案打工 👇🧵

**Tweet 2（痛點與雙軌解法）**
> 為什麼叫「雙軌任務市場」？因為兩種算力的合規邊界完全不同：
>
> 🏭 **自動工坊（API 軌道）**：BYOK 零信任！你的 Gemini / OpenRouter / Ollama Key 只存在自己瀏覽器 localStorage，絕不經伺服器，專跑翻譯、測試、文件微任務。
> ⚔️ **懸賞工會（月/週額度 BYOT）**：絕不碰你的訂閱 Token！用開源本機 CLI `pixel-worker` 呼叫你自己的 Gemini CLI / Claude Code / Codex，本機跑完人工確認再交卷，小鎮畫面同步直播小人敲鍵盤！

**Tweet 3（防 AI Slop 鐵律）**
> 很多人第一反應：「會不會被腳本刷爛垃圾 PR？」
>
> 我們定了一條鐵律：**Proof of Accepted Work（只按驗收成果記功，絕不按消耗 Token 發獎）**。
>
> 內建驗收引擎自動攔截空泛灌水與格式錯誤，亂交卷 0 貢獻還倒扣信譽分；高品質交卷則累積貢獻點數、升級小人，還能下載超復古的《像素算力打工證 PNG》炫耀 🏆

**Tweet 4（30/60/10 經濟閉環）**
> 項目不是做完就算了：
> 1️⃣ 社群提案投票，滿票自動解鎖工地＋自動生成雙軌任務
> 2️⃣ 進度條推到 100%，全鎮放像素煙火發布上線 🚀
> 3️⃣ 上線後產生的營收按 **30% 發起人 / 60% 貢獻者按點數分紅 / 10% 平臺孵化費** 透明結算！

**Tweet 5（極客賣點：零依賴）**
> 技術控應該會喜歡這點：
> 整個伺服器＋像素遊戲引擎＋8-bit 合成音效＋即時 SSE 廣播＋本機 CLI，**0 個外部 npm 依賴**（純 Node.js 原生模組 + HTML5 Canvas）！
>
> Clone 下來一行 `npm run dev`，3 秒在本機開玩（支援免 Key 模擬體驗，也支援直連真實 Gemini API）。

**Tweet 6（CTA 號召）**
> Public Alpha 現已上線，正在招募首批 **100 位創世居民（Founding Citizens）** 🎉
>
> 🌐 線上搶先試玩：[YOUR_LIVE_URL]
> ⭐ GitHub 開源求 Star：[YOUR_GITHUB_URL]
>
> 留言丟出你最想讓全鎮算力小人一起幫你孵化的小工具點子，我幫你直接上牆投票！👇
> #buildinpublic #indiehackers #pixelart #AI #opensource

---

#### 【簡體中文版】

**Tweet 1（主推文 — 必配 30 秒像素 Demo 视频）**
> 我做了一个把“闲置 AI 额度”变成像素游戏小人的开源小镇 —— **PixelCompute Town（像素算力镇）** 👾⚡
>
> 很多开发者每个月都买了 Gemini / Claude / Codex 订阅，还有一堆用不完的 API 赠金，月底直接清零浪费。
>
> 于是我把闲置算力做成了一座赛博像素小镇：
> 投票立项 → 派算力小人双轨打工 → 验收上线放烟花 → 透明瓜分真实分红 💸
>
> 30 秒实机演示看看小人怎么帮开源项目干活 👇🧵

**Tweet 2（双轨与合规设计）**
> 为什么坚持“双轨市场”？因为 API 和订阅额度的合规边界完全不同：
>
> 🏭 **自动工坊（API 轨）**：BYOK 零信任，你的 Gemini / OpenRouter / Ollama Key 只留在自己浏览器 localStorage，绝不上服务器，自动跑翻译、单测、文档微任务。
> ⚔️ **悬赏工会（月/周额度 BYOT）**：绝不碰账号 Token！通过本地开源 CLI `pixel-worker` 调用你本机的 Gemini CLI / Claude Code / Codex，人工确认提交成果，像素小镇实时同步小人敲键盘直播！

**Tweet 3（反刷单机制）**
> 怎么防止 AI 垃圾代码刷屏？
>
> 核心铁律：**Proof of Accepted Work（只按验收通过的成果记功，绝不按消耗 Token 发奖）**。
>
> 内置防作弊验收引擎自动拦截灌水与非法格式，提交废话直接 0 贡献并扣信誉分；通过验收即可积累贡献点，还能一键导出像素风《算力打工证 PNG》发圈炫耀 🏆

**Tweet 4（30/60/10 透明分红）**
> 项目完整闭环：
> 1️⃣ 社区提案投票，满票自动破土动工＋生成双轨任务
> 2️⃣ 进度推到 100%，全镇放像素烟花发布上线 🚀
> 3️⃣ 上线后收益按 **30% 发起人 / 60% 贡献者按贡献占比分红 / 10% 平台孵化池** 公开结算！

**Tweet 5（零依赖极客美学）**
> 整个项目从后端 REST API + SSE 实时广播，到 HTML5 Canvas 像素游戏引擎、8-bit 合成音效、本地 CLI 桥接器，**零外部 npm 依赖**（纯 Node.js 原生模块）！
>
> `git clone` 后一行 `npm run dev` 直接开跑，支持免 Key 体验和真实 Gemini API 接入。

**Tweet 6（行动号召）**
> Public Alpha 已开放，招募首批 **100 位创世居民** 🎉
>
> 🌐 在线试玩：[YOUR_LIVE_URL]
> ⭐ GitHub 源码（求 Star）：[YOUR_GITHUB_URL]
>
> 评论区留下你最想让小镇算力小人一起孵化的开源/独立小工具，我帮你直接上墙投票！👇

---

#### 【English Version】

**Tweet 1 (Hook — Attach the 30s Pixel Demo Video!)**
> I built an open-source pixel town where developers turn idle AI quotas into little pixel workers that ship projects together — **PixelCompute Town** 👾⚡
>
> Every month, millions of API free-tier credits & CLI subscription quotas (Gemini CLI, Claude Code, Codex) expire unused.
>
> So I gamified them:
> Vote on ideas → Dispatch pixel workers → Pass anti-slop verification → Launch with fireworks & share real revenue 💸
>
> Watch it live in 30s 👇🧵

**Tweet 2 (Dual-Track Zero-Trust Architecture)**
> Why a **dual-track** market? Because API keys and monthly subscriptions shouldn't be mixed:
>
> 🏭 **Auto Factory (API Track)**: Zero-trust BYOK. Your Gemini / OpenRouter / Ollama key stays strictly in browser `localStorage` — never hits our server. Great for i18n, unit tests & docs.
> ⚔️ **Bounty Guild (BYOT Track)**: Zero credential harvesting. Run our tiny local CLI `pixel-worker` with your own official Gemini CLI / Claude Code / Codex, confirm locally, and stream live pixel-worker progress to the town canvas!

**Tweet 3 (Anti-Slop Rule)**
> "Won't people just spam AI slop for points?"
>
> Hard rule #1: **Proof of Accepted Work** — we NEVER reward tokens burned, only verified deliverables.
>
> Our built-in verifier checks structure, rejects fluff/slop, and penalizes reputation on bad submissions. Passing work earns contribution shares + a downloadable retro Pixel Work Certificate PNG 🏆

**Tweet 4 (30/60/10 Revenue Split)**
> Full open-source incubation loop:
> 1️⃣ Propose & vote on projects — hitting the vote threshold automatically breaks ground & generates dual-track tasks
> 2️⃣ Hit 100% progress → Launch with full-town pixel fireworks 🚀
> 3️⃣ Revenue splits transparently: **30% Founder / 60% Contributors (pro-rata) / 10% Platform Carry**

**Tweet 5 (Zero Dependencies)**
> Pure hacker joy:
> Backend REST API + SSE live broadcast + custom HTML5 Canvas pixel engine + Web Audio 8-bit synth + local BYOT CLI — **ZERO external npm dependencies** (pure Node.js native modules).
>
> Clone it, run `npm run dev`, and play in 3 seconds (works out-of-the-box in Demo mode or with your real Gemini API key).

**Tweet 6 (CTA)**
> Public Alpha is live! Recruiting the first **100 Founding Citizens** 🎉
>
> 🌐 Play live: [YOUR_LIVE_URL]
> ⭐ Star on GitHub: [YOUR_GITHUB_URL]
>
> Drop an open-source or micro-SaaS idea below — I'll put the top ones on the town voting board today! 👇
> #buildinpublic #indiehackers #pixelart #opensource #vibecoding

---

### 🤖 2. Reddit 發文模板（`r/SideProject` & `r/vibecoding`）

#### A. `r/SideProject`（English — Copy & Paste）

**Title:**
> I built a zero-dependency pixel town where devs turn idle AI API credits & CLI quotas into pixel workers that ship open-source tools together

**Body:**
> Hey r/SideProject!
>
> Like a lot of builders here, I keep ending up with leftover monthly quotas across Gemini CLI / Claude Code / Codex and unused free-tier API credits that vanish at the end of the billing cycle.
>
> So I built **PixelCompute Town** — an interactive retro pixel-art collaboration town where idle compute becomes little pixel workers that vote on community projects, pick up tasks, and push them to launch.
>
> **How it works (Dual-Track & Zero-Trust):**
> 1. **Auto Factory (API Track — BYOK):** Connect your own Gemini / OpenRouter / local Ollama key *strictly in browser `localStorage`* (it never touches the server) to tackle structured micro-tasks like i18n JSON, unit tests, and docs. Includes a daily token stamina cap.
> 2. **Bounty Guild (Subscription Track — BYOT):** No token-sharing or ToS violations. Use our tiny local bridge CLI (`node bin/pixel-worker.mjs`) to run tasks locally with your own official CLI tool, review the output yourself, and stream live heartbeat animations to your pixel worker in the town!
> 3. **Proof of Accepted Work (Anti-Slop):** Nobody earns points for burning tokens. Every submission goes through automated verification (JSON schema, code/PR checks, anti-slop heuristics). Bad submissions earn 0 points and lose reputation.
> 4. **Vote → Build → Launch → 30/60/10 Split:** Projects move from voting to active construction automatically once they hit the vote goal, and share launch revenue transparently (30% proposer / 60% contributors / 10% platform carry).
>
> **Fun tech detail:** The entire stack (Node.js server, SSE live feed, Canvas pixel engine, 8-bit Web Audio synth, and local CLI) has **zero external npm dependencies**.
>
> - Live Alpha Demo (works with zero setup!): [YOUR_LIVE_URL]
> - GitHub Repo: [YOUR_GITHUB_URL]
>
> Would love brutal feedback on the anti-slop verifier, the pixel UI, and what open-source micro-projects you'd want to incubate first!

#### B. `r/vibecoding`（English — Copy & Paste）

**Title:**
> Turning leftover Gemini CLI / Claude Code / Codex weekly quotas into a cozy cyber-pixel town that ships side projects together (open-source, zero deps)

**Body:**
> Anyone else stare at 40% unused weekly/monthly coding-agent quota on Sunday night wishing you could point it at something fun?
>
> I built **PixelCompute Town** so you can channel those spare vibes into a live pixel-art village:
> - Grab a structured Context Pack from the **Bounty Guild**
> - Run it locally with `node bin/pixel-worker.mjs --cmd "gemini ..."` (or Claude Code / Codex — zero credentials ever leave your machine)
> - Watch your little pixel architect walk to a desk, hammer the keyboard live via SSE heartbeats, pass verification, and launch community tools with pixel fireworks!
> - Export a retro **Pixel Work Certificate PNG** when you finish a bounty.
>
> Try it right in the browser (Demo mode needs zero keys, or plug in a Gemini API key locally in `localStorage`):
> - Live Demo: [YOUR_LIVE_URL]
> - Code (MIT / zero npm dependencies): [YOUR_GITHUB_URL]
>
> What kind of vibe-coded micro-tools would you vote to build in the town?

---

### 🟧 3. Hacker News（`Show HN`）

> 💡 **HN 發帖守則**：語氣務必克制、工程導向、不浮誇、不放行銷感嘆號，直接講清楚架構取捨與防作弊設計。

**Title:**
> Show HN: PixelCompute Town – Turn idle API keys and local AI CLIs into pixel workers

**Text:**
> Hi HN,
>
> I built PixelCompute Town, a lightweight, zero-dependency Node.js web app and local CLI bridge that gamifies contributing spare AI API credits and local CLI subscription quotas toward small open-source projects.
>
> Live Alpha: [YOUR_LIVE_URL]
> Source: [YOUR_GITHUB_URL]
>
> The core design constraints I wanted to solve:
>
> 1. **Strict BYOK / BYOT separation**:
>    - For API-track micro-tasks (i18n JSON, unit tests, doc cleanup), API keys (Gemini / OpenAI-compatible / local Ollama) stay exclusively in the browser's `localStorage` and calls go directly from the client. The server never sees a key.
>    - For subscription-based CLI tools (Gemini CLI, Claude Code, Codex), there is no credential sharing or proxy pooling. A small local script (`bin/pixel-worker.mjs`) lets a developer run their own local CLI, review the output before submitting, and send lightweight progress heartbeats (`POST /api/cli/heartbeat`) over HTTP/SSE to animate their avatar in the town.
>
> 2. **Proof of Accepted Work instead of token mining**:
>    - Rewarding raw token spend invites spam. Contributions are only credited after passing an automated verifier (schema validation, anti-slop heuristics, PR/code structure checks) and reputation drops on rejected submissions.
>
> 3. **Zero external npm dependencies**:
>    - Everything—HTTP server, atomic JSON persistence, GitHub OAuth, SSE event stream, custom HTML5 Canvas pixel renderer, Web Audio 8-bit synth, and the local CLI—runs on Node.js native modules alone (`npm run dev` starts immediately).
>
> Currently in Public Alpha with a built-in demo session (no login required to inspect the full loop) plus optional GitHub OAuth. I'd especially appreciate feedback on hardening the automated verifier against subtle AI slop and designing fairer contribution weighting across small API tasks vs. larger PR bounties.

---

### 💬 4. V2EX（分享創造）＆ 即刻（獨立開發者圈子）招募「創世元老」

#### A. V2EX — 繁體中文版（節點：`分享創造`）

**標題：**
> 做了一個零依賴開源像素小鎮「像素算力鎮」：把閒置 AI API 與月費 CLI 額度變成像素小人，組隊孵化開源項目並分享分紅

**正文：**
> 各位 V 友大家好，
>
> 相信不少人手邊都有用不完的 Gemini / OpenRouter 贈金，或是月底還沒刷完的 Claude Code / Gemini CLI / Codex 週額度。與其讓額度過期，我做了一個叫 **PixelCompute Town（像素算力鎮）** 的開源實驗平臺，把閒置算力變成像素小鎮裡會走路、喝咖啡、敲鍵盤打工的小人。
>
> **幾個比較硬核的設計堅持：**
> 1. **零信任雙軌制**：
>    - **自動工坊（API 軌道）**：純前端 BYOK，API Key 只存在你自己的瀏覽器 `localStorage`，絕不經過伺服器；內建每日 Token 體力上限。
>    - **懸賞工會（月/週額度 BYOT）**：絕不收集任何帳號 Cookie/Token。提供零依賴本機腳本 `bin/pixel-worker.mjs`，呼叫你本機的官方 CLI 幹活並人工確認交卷，同時把進度心跳即時推送到像素小鎮直播！
> 2. **拒絕 AI 垃圾灌水（Proof of Accepted Work）**：
>    - 絕不按消耗 Token 發獎，只按驗收通過的成果記功。亂交廢話 0 貢獻還會倒扣信譽分。
> 3. **投票立項 → 上線煙火 → 30/60/10 分紅**：
>    - 項目投票達標自動破土動工並產生雙軌任務，進度達 100% 放煙火上線，營收按「發起人 30% / 貢獻者 60% / 平臺 10%」透明結算。
> 4. **全站零外部 npm 依賴**：
>    - 純 Node.js 原生模組 + HTML5 Canvas 手繪像素矩陣 + Web Audio 8-bit 音效，`npm run dev` 開箱即跑。
>
> **正在招募首批 50 位「創世元老」：**
> - 線上體驗（免登入開箱即玩，支援真實 Gemini Key 或模擬模式）：[YOUR_LIVE_URL]
> - GitHub 開源倉庫：[YOUR_GITHUB_URL]
>
> 歡迎大家試玩拍磚！也歡迎直接在樓下丟出你想讓全鎮算力小人一起孵化的開源小工具點子，我幫你掛上創世提案牆。

---

#### B. V2EX / 即刻 — 簡體中文版

**V2EX 標題：**
> 开源了一个零依赖像素小镇「像素算力镇」：把闲置 AI API 和月费 CLI 额度变成像素小人，组队打工孵化项目并共享分红

**即刻短帖（直接配 30 秒视频或《算力打工证 PNG》截图）：**
> 月底看着用不完的 Gemini / Claude Code / Codex 额度和 API 赠金过期，总觉得好可惜。
>
> 于是连夜搓了一座开源像素小镇 —— **PixelCompute Town（像素算力镇）** 👾⚡
>
> ✨ 你可以在里面：
> 1️⃣ 把闲置 API（BYOK 仅存本地浏览器）变成「自动工坊」里的打工小人
> 2️⃣ 用本地开源 CLI `pixel-worker` 把 Gemini CLI / Claude Code 的活实时直播到像素办公室（不碰账号 Token）
> 3️⃣ 大家一起投票立项、通过防作弊验收推到 100%，全镇放像素烟花上线，按 30/60/10 透明分红
> 4️⃣ 完单还能生成一张超复古的《像素算力打工证 PNG》拿去晒图 🏆
>
> 整个项目 0 外部 npm 依赖，打开就能直接免 Key 体验！
> 正在招募首批「创世元老」，来领你的第一个像素算力小人 👇
> 🔗 在线试玩：[YOUR_LIVE_URL]
> ⭐ GitHub：[YOUR_GITHUB_URL]

---

### 🏆 5. Product Hunt 上架完整清單

#### 基本資訊（Copy & Paste）
- **Product Name:** `PixelCompute Town`
- **Tagline (59 chars):** `Turn idle AI APIs & CLI quotas into pixel workers that ship`
- **Short Description (258 chars):**
  > PixelCompute Town is an open-source, zero-dependency pixel village where developers turn spare AI API credits (zero-trust BYOK) and local CLI quotas (BYOT) into pixel workers that vote on ideas, pass anti-slop verification, launch tools, and share revenue.
- **Topics:** `Developer Tools`, `Open Source`, `Artificial Intelligence`, `Indie Games`, `Productivity`
- **Pricing:** `Free` / `Open Source`

#### First Maker Comment（發佈後第 1 分鐘必貼！）
> Hey Product Hunt! 👋
>
> I'm the maker of **PixelCompute Town**.
>
> **Why I built this:**
> Every developer I know has two kinds of stranded compute: unused API free-tier credits and leftover weekly/monthly quotas in tools like Gemini CLI, Claude Code, and Codex. Most of it simply expires at the end of the month.
>
> I asked myself: *what if pooling spare compute toward open-source and indie micro-tools felt like playing a cozy cyber-pixel sim game—while staying 100% compliant and zero-trust?*
>
> **What makes PixelCompute Town different:**
> - **Dual-track by design:** Browser-only BYOK for API micro-tasks (your key never leaves `localStorage`) + a local open-source CLI bridge (`pixel-worker`) for subscription CLIs so zero credentials ever touch our servers.
> - **Proof of Accepted Work:** We never reward tokens burned. Built-in verification rejects AI slop and protects contribution quality.
> - **Transparent 30/60/10 launch splits:** Projects unlock via community votes, launch with pixel fireworks at 100%, and share revenue across founders (30%), contributors (60%), and platform carry (10%).
> - **Zero external npm dependencies:** Clone and run `npm run dev` in 3 seconds, or try the live Alpha right in your browser with zero signup.
>
> I'd love to hear what micro-SaaS or open-source plugins you'd propose on the town board today—and happy to answer any technical questions below! 🚀👾

#### Gallery 5 張必備展示圖規劃
1. **圖 1（主視覺封面）**：賽博暖夜像素小鎮全屏截圖＋標題大字 `Turn Idle AI Quotas into Pixel Workers`
2. **圖 2（雙軌架構圖）**：左右對比 `🏭 Auto Factory (Zero-Trust BYOK)` vs `⚔️ Bounty Guild (Local BYOT CLI Live Sync)`
3. **圖 3（即時實戰圖）**：終端機執行 `pixel-worker` 與小鎮小人敲鍵盤氣泡同框對照
4. **圖 4（上線高潮圖）**：孵化廣場 100% 煙火綻放＋30/60/10 分紅結算看板
5. **圖 5（社交裂變圖）**：匯出的《像素算力打工證 PNG》復古證書卡片特寫

---

## 🛡️ 第四部分：上線評論區高頻質疑 FAQ 應對話術

| 評論區常見質疑 | 黃金回應重點（可直接改寫回覆） |
| :--- | :--- |
| **「你們會拿我的 API Key 去偷跑嗎？」** | 完全零信任 BYOK：API Key 僅儲存在你自己的瀏覽器 `localStorage`，請求直接由你的瀏覽器送往 Gemini / OpenRouter / 本地 Ollama，後端伺服器完全收不到也絕不儲存任何 Key（開源原始碼可查 `public/js/geminiRunner.js`）。 |
| **「用月費訂閱接單會違反官方 ToS 嗎？」** | 我們嚴格採用 **BYOT（Bring Your Own Tool）** 模式：絕不代管帳號、不抓 Cookie、不建反代池。開發者完全在自己電腦上用自己付費的官方 CLI 協助開源專案寫碼並親自 Review 提交，本機腳本只送輕量進度心跳來更新像素動畫。 |
| **「會不會充滿 AI Slop 垃圾程式碼？」** | 絕不按 Token 消耗發獎！採用 Proof of Accepted Work 驗收制：自動檢查格式、反灌水特徵與 GitHub PR 結構，不合格 0 貢獻且扣信譽分；高價值懸賞仍需發起人最終確認。 |
| **「Alpha 階段的分紅是真錢嗎？」** | Public Alpha 預設開啟透明模擬帳本方便零門檻體驗完整 30/60/10 經濟閉環，並已預留 Polar.sh Webhook 與真實現金懸賞 10% 託管抽成介面，待首批創世項目上線產生真實收入即可無縫啟用真實結算。 |
