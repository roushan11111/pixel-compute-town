# 像素算力鎮（PixelCompute Town）產品規格書（PRD）與上線路線圖

> **一句話定位**：將開發者閒置的 **API 額度** 與 **月／週 AI 訂閱額度（BYOT）**，轉化為像素風遊戲裡的「算力小人」，共同投票立項、雙軌接單打工，把開源與獨立產品推向上線並共享真實收益分紅的協作平臺。

## 一、核心產品定位與設計原則
1. **創意是第一生產力 · 創意溯源哈希鏈（Proof of First Spark）× 反抄襲 × 5%/85%/10% 多勞多得協議**：
   - **不可竄改首發溯源鏈（Proof of First Spark）**：每一筆上牆提案在建立瞬間自動記錄 `originatorId`、`originatorName`、`originatedAt` 與 `provenanceIndex`，並以前一筆創意的 `prevIdeaHash` 串接標準 **SHA-256** 計算不可竄改的 64 碼 `ideaHash` 雜湊鏈。任何人皆可透過 `GET /api/provenance/chain` 與 `GET /api/provenance/verify/:hash` 公開查驗首發原創性，並下載像素風《創意首發溯源證書 PNG》。
   - **即時反抄襲與尊重原創共建**：平臺旗幟鮮明反對抄襲、複製與低質蒸餾提案。內建支援中文 2-gram 與英文單詞正規化的 Jaccard 相似度引擎（`POST /api/projects/check-similarity`）；當新提案與既有原創創意高度重複（相似度 `>= 0.65`）時，系統攔截並回傳 HTTP `409 POTENTIAL_COPYCAT`（附上原創首發者、時間戳與 SHA-256 指紋），引導開發者透過 `POST /api/projects/:id/join` 直接加入原創意共建而非另起爐灶抄襲。
   - **尊重創意但不獨佔 · 5% / 85% / 10% 多勞多得動態分紅公式**：
     - **5% 首發創意永久版稅（`sparkRoyaltyPct`）**：永久歸屬首位提出該創意的原創發起人（`originatorId`），哪怕發起人完全沒寫一行代碼，平臺也永遠尊重他踏出第一步的火花。
     - **85% 實幹建設多勞多得池（`meritPoolPct`）**：嚴格依據所有實幹貢獻者通過驗收的貢獻點數（`contributions`）佔比動態分配——**誰出力最多誰拿大頭**。若發起人自己也動手建設，其 5% 首發版稅與實幹池佔比疊加計算；若發起人完全未參與實作，僅拿 5%，其餘 85% 全數歸真正把產品做出來的實幹者們！
     - **10% 平臺公證與基礎設施分成（`platformSharePct`）**：歸入平臺孵化分成（Platform Carry），用於維護溯源公證、驗收基礎設施與分紅結算。
2. **雙軌任務市場**：
   - **自動工坊（API 任務區 / `api_auto`）**：針對正規 API Key（Gemini 一等公民 + OpenAI 相容介面 / OpenRouter / 本地 Ollama）與 GCP 贈金。提供高並行、標準化、可自動驗收微任務（i18n 多語系翻譯、單元測試生成、文件整理、像素素材規格、QA 巡檢）。嚴格實行 **BYOK 零信任原則**（Key 僅存瀏覽器 localStorage 或本機，絕不存伺服器），內建每日 Token 體力上限。
   - **懸賞工會（月／週額度任務區 / `guild_bounty`）**：針對帶官方 CLI 的月／週訂閱（Gemini CLI、Claude Code、Codex CLI）、AI IDE、網頁訂閱。採用 **BYOT（自帶工具）** 合規模式：一鍵生成標準化 Context Pack（可複製給 CLI 或 AI 助手），並提供輕量本機協作 CLI 工具 `pixel-worker`，讓玩家本機完成並人工確認提交 PR／成果，同步在像素辦公室直播小人幹活！
3. **項目生命週期**：
   - 提案上牆 (`voting` + 反抄襲查重 + SHA-256 串鏈存證) → 社群投票達標與開發者加入共建 (`POST /api/projects/:id/join`) 自動立項 (`building`) → 自動生成雙軌任務（工會大單 + 工坊流水線） → 算力小人進駐幹活＋三層驗收（機器 Schema/測試校驗 + 品質評分 + 發起人確認） → 達 100% 發布上線 (`launched`) → 觸發煙火＋透明分紅結算（**首發創意版稅 5% / 實幹多勞多得池 85% / 平臺公證運營 10%**）。
4. **創作者（平臺方）變現閉環**：
   - 付費現金懸賞 10% 託管服務費（Stripe / Polar.sh / 穩定幣三合一收付）
   - 免費孵化項目分紅池 10% 平臺公證運營分成（Platform Carry，5% / 85% / 10% 協議）
   - 像素廣場霓虹廣告位（付費置頂與像素看板曝光）
   - 玩家 Pro 會員與像素皮膚／機房裝潢商店（不破壞公平）
5. **防刷單鐵律**：
   - 絕不按消耗 Token 發獎，只按「驗收通過的成果」記功（Proof of Accepted Work）。
   - 內建反垃圾產出評分與信譽分（Reputation）系統，支援生成可一鍵下載分享的像素風《算力打工證 PNG》與《創意首發溯源證書 PNG》（裂變傳播與原創公證利器）。
6. **v1.0 商業上線就緒目標**：
   - 多用戶隔離帳號（信箱＋密碼 `scrypt` 雜湊、GitHub OAuth、Google OAuth 與免配置 Demo 模式）
   - 持久化後端（Node.js 零依賴 + JSON 持久化 + 完整 REST API + SSE 即時動態推播 + 創意溯源 SHA-256 雜湊鏈）
   - 真實 GitHub PR / Issue 匯入與合併狀態驗證支援
   - 三合一收付與穩定幣（USDC/USDT）滿 `$5` 提現結算系統
   - 本機 CLI 協作器 `bin/pixel-worker.mjs` v0.4（Device Flow `onboard`＋即時心跳推送）
   - 完整部署設定（Dockerfile / Render / Fly.io）與上線推廣文案包（X / Reddit / Show HN / V2EX / Product Hunt）。
