# 像素算力鎮（PixelCompute Town）產品規格書（PRD）與上線路線圖

> **一句話定位**：將開發者閒置的 **API 額度** 與 **月／週 AI 訂閱額度（BYOT）**，轉化為像素風遊戲裡的「算力小人」，共同投票立項、雙軌接單打工，把開源與獨立產品推向上線並共享真實收益分紅的協作平臺。

## 一、核心產品定位與設計原則
1. **雙軌任務市場**：
   - **自動工坊（API 任務區 / `api_auto`）**：針對正規 API Key（Gemini 一等公民 + OpenAI 相容介面 / OpenRouter / 本地 Ollama）與 GCP 贈金。提供高並行、標準化、可自動驗收微任務（i18n 多語系翻譯、單元測試生成、文件整理、像素素材規格、QA 巡檢）。嚴格實行 **BYOK 零信任原則**（Key 僅存瀏覽器 localStorage 或本機，絕不存伺服器），內建每日 Token 體力上限。
   - **懸賞工會（月／週額度任務區 / `guild_bounty`）**：針對帶官方 CLI 的月／週訂閱（Gemini CLI、Claude Code、Codex CLI）、AI IDE、網頁訂閱。採用 **BYOT（自帶工具）** 合規模式：一鍵生成標準化 Context Pack（可複製給 CLI 或 AI 助手），並提供輕量本機協作 CLI 工具 `pixel-worker`，讓玩家本機完成並人工確認提交 PR／成果，同步在像素辦公室直播小人幹活！
2. **項目生命週期**：
   - 提案上牆 (`voting`) → 社群投票達標自動立項 (`building`) → 自動生成雙軌任務（工會大單 + 工坊流水線） → 算力小人進駐幹活＋三層驗收（機器 Schema/測試校驗 + 品質評分 + 發起人確認） → 達 100% 發布上線 (`launched`) → 觸發煙火＋透明分紅結算（發起人 30% / 貢獻者 60% / 平臺 10%）。
3. **創作者（平臺方）變現閉環**：
   - 付費現金懸賞 10% 託管服務費（Stripe Connect / Polar.sh 介面預留與模擬帳本）
   - 免費孵化項目分紅池 10% 平臺分成（Platform Carry）
   - 像素廣場霓虹廣告位（付費置頂與像素看板曝光）
   - 玩家 Pro 會員與像素皮膚／機房裝潢商店（不破壞公平）
4. **防刷單鐵律**：
   - 絕不按消耗 Token 發獎，只按「驗收通過的成果」記功（Proof of Accepted Work）。
   - 內建反垃圾產出評分與信譽分（Reputation）系統，支援生成可一鍵下載分享的像素風《算力打工證 / 分紅結算單》PNG 卡片（裂變傳播利器）。
5. **Public Alpha 上線就緒目標**：
   - GitHub OAuth 登入（加上免配置 Demo 遊客/創始開發者模式以便本機開箱即玩）
   - 持久化後端（Node.js + JSON/SQLite 儲存 + 完整 REST API + SSE 即時動態推播）
   - 真實 GitHub PR / Issue 匯入與合併狀態驗證支援
   - 本機 CLI 協作器 `bin/pixel-worker.mjs`（支援把本機 Gemini CLI / Claude Code / Codex 任務狀態即時推送到像素鎮畫面）
   - 完整部署設定（Dockerfile / Render / Railway / Fly.io）與上線推廣文案包（X / Reddit / Show HN / V2EX / Product Hunt）。
