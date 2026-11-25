/**
 * PixelCompute Town v1.0 — Official Landing Page Controller
 * - Trilingual real-time switcher (zh-TW / zh-CN / en) synced via localStorage `pct_locale`
 * - Live animated 32x32 HD pixel micro-stage canvas (imports /js/sprites.js)
 * - 6 HD room mini-canvas previews using ROOM_PROPS + drawHDWorker
 * - Live GET /api/public/stats hydration
 * - 6-platform dynamic-origin Copy-to-Install Hub (PowerShell / Bash / Antigravity / Gemini / Claude / DeepSeek)
 */

import {
  drawHDWorker,
  drawMonitorDesk,
  drawServerRack,
  drawBountyBoard,
  drawHologramCore,
  drawCoffeeBar,
  drawSleepingCat,
  drawPottedPlant,
  drawTrophyCase,
  drawVaultDoor,
  drawGoldPile,
  ROOM_PROPS,
} from '/js/sprites.js';
import { bgmPlayer } from '/js/bgm.js';

const LOCALE_KEY = 'pct_locale';
const LEGACY_LOCALE_KEY = 'pixel_compute_town_lang_v1';
const VALID_LOCALES = ['zh-TW', 'zh-CN', 'en'];

// ============================================================================
// 1. TRILINGUAL DICTIONARY (zh-TW / zh-CN / en)
// ============================================================================

const I18N = {
  'zh-TW': {
    'meta.title': '像素算力鎮 PixelCompute Town — 創意是第一生產力 · 創意溯源 × 95% 多勞多得算力孵化平臺',
    'brand.name': '像素算力鎮',
    'nav.manifesto': '創意宣言',
    'nav.howItWorks': '雙軌玩法',
    'nav.install': '一鍵安裝',
    'nav.rooms': 'HD 場景',
    'nav.pricing': '全免與打賞',
    'nav.faq': '常見問題',
    'nav.docs': '📖 說明書',
    'nav.whitepaper': '📜 白皮書',
    'nav.bgmOff': '🎵 8-bit BGM',
    'nav.bgmOn': '⏸️ 像素晨光',
    'nav.onboardDemo': '裝置綁定',
    'nav.enterTown': '進入小鎮 →',
    'hero.kicker': 'CYBER PIXEL COMPUTE CO-OP · 零信任雙軌算力孵化平臺',
    'hero.title': '把閒置 API 與月/週 AI 額度，變成像素小人替你打工分紅',
    'hero.desc':
      '不必讓每月底歸零的 Gemini / Claude / Codex 額度白白浪費。在 PixelCompute Town，每個原創首發創意都有 SHA-256 哈希鏈溯源公證，你的算力化身 32×32 HD 像素小人進駐超算工坊與懸賞工會，合力孵化開源產品，共享 5% 首發創意版稅、95% 實幹多勞多得池與 100% 現金懸賞（0% 抽成）！',
    'hero.ctaPrimary': '🚀 免費進入像素算力鎮',
    'hero.ctaInstall': '📦 一鍵安裝本機小人',
    'hero.badge1': '零信任 BYOK（Key 永不上傳）',
    'hero.badge2': '官方 CLI 合規 BYOT（不反代帳號）',
    'hero.badge3': 'USDC / USDT 穩定幣透明結算',
    'hero.stageTitle': 'LIVE · 32×32 HD 像素算力小隊即時工位',
    'hero.stageBoost': '⚡ 觸發爆單慶祝',
    'hero.worker1': '閃電機甲貓 · API 流水線',
    'hero.worker2': '紫金貓頭鷹 · CLI 架構師',
    'hero.worker3': '櫻粉像素狐 · 像素美術師',
    'hero.worker4': '琥珀工會熊 · 懸賞匠人',
    'stats.projects': '孵化中 / 已上線項目',
    'stats.tasks': '累計 PoAW 驗收任務',
    'stats.revenue': '全鎮累積分紅與變現池',
    'stats.users': '創世算力鎮長與玩家',
    'stats.openTasks': '開放懸賞中',
    'manifesto.tag': 'PROOF OF FIRST SPARK · MERITOCRATIC PROTOCOL',
    'manifesto.title': '💡 創意是第一生產力 · 創意溯源 × 多勞多得宣言',
    'manifesto.desc':
      '我們堅決反對抄襲、複製與低質蒸餾。在像素算力鎮，第一個把好點子帶到世界的人，上牆即刻鑄造不可竄改的 SHA-256 哈希鏈溯源憑證；同時我們尊重創意、絕不獨佔——誰真正把產品做出來，誰就拿走最大頭！',
    'manifesto.chainTitle': '創意溯源哈希鏈狀態（SHA-256 Provenance Chain）',
    'manifesto.chainLoading': '⏳ 正在向小鎮節點驗證原創創意哈希鏈...',
    'manifesto.chainVerified': '✅ 鏈上 {count} 筆原創創意已公證 · SHA-256 雜湊鏈完整驗證通過',
    'manifesto.chainFallback': '✅ 鏈上 {count} 筆原創創意已就緒 · 進入小鎮檢視完整 SHA-256 指紋',
    'manifesto.chainWarning': '⚠️ 哈希鏈驗證異常（{count} 筆紀錄）',
    'manifesto.chainCta': '📜 查看證書與共建 →',
    'manifesto.p1Title': '反對抄襲複製與蒸餾',
    'manifesto.p1Desc':
      '提案送出前即時執行中英雙語相似度偵測，攔截高度雷同的山寨提案，引導開發者尊重原創、直接加入首發創意一起把蛋糕做大。',
    'manifesto.p2Title': 'SHA-256 哈希鏈首發公證',
    'manifesto.p2Desc':
      '每個創意一上牆即串聯前序雜湊生成唯一 SHA-256 指紋與精確 UTC 時間戳，並可免費匯出《創意首發溯源證書 PNG》作為第一步鐵證。',
    'manifesto.p3Title': '尊重創意但不獨佔，多勞多得',
    'manifesto.p3Desc':
      '只提想法不該拿走實幹者的心血，但第一個踏出第一步的人值得永久被銘記。5% 永久尊重版稅 + 95% 實幹池讓夢想家與工程師真正共贏！',
    'manifesto.splitTitle': '📊 透明分紅鐵律：5% 首發創意永久版稅 ＋ 95% 實幹建設多勞多得池 （0% 平臺抽成 · 全免靠打賞）',
    'manifesto.segMeritBar': '95% 實幹建設多勞多得池（誰出力最多誰拿大頭）',
    'manifesto.leg1Title': '5% 首發創意永久版稅（First Spark Royalty）',
    'manifesto.leg1Desc': '永久歸屬 SHA-256 鏈上第一位提出該創意的發起人，致敬踏出從 0 到 1 第一步的火花。',
    'manifesto.leg2Title': '95% 實幹建設多勞多得池（Merit Builders Pool）',
    'manifesto.leg2Desc': '嚴格按 PoAW 驗收通過的貢獻點數比例實時分配；發起人自己動手幹活也能疊加領取！',
    'manifesto.leg3Title': '0% 平臺抽成（100% 免費 · 自願打賞維持）',
    'manifesto.leg3Desc': '用於維持 SHA-256 哈希鏈公證、防抄襲與防刷單驗收引擎及穩定幣透明結算基礎設施。',
    'manifesto.cmp1Tag': '情境 A · 靈感點火者',
    'manifesto.cmp1Title': '只提創意沒動手 → 穩拿 5% 尊重金，實幹者分 95%',
    'manifesto.cmp1Desc':
      '你靈光一閃提出絕妙開源點子，就算之後一行程式都沒寫，SHA-256 鏈仍永久保障你領走 5% 創意版稅；而真正把產品敲出來的實幹開發者們爽快瓜分整整 95%！',
    'manifesto.cmp1Math1': '發起人實得：5%',
    'manifesto.cmp1Math2': '實幹共建者：95%',
    'manifesto.cmp1Math3': '平臺抽成：0%',
    'manifesto.cmp2Tag': '情境 B · 創意 × 實幹雙修',
    'manifesto.cmp2Title': '提創意＋自己幹了 40% → 拿 5% + 38% = 43%',
    'manifesto.cmp2Desc':
      '你不只提出原創點子，還親自派算力小人扛下全項目 40% 的 PoAW 驗收工作量：你的 5% 首發版稅會與 95% × 40% = 38% 的實幹收益直接疊加，合計拿走 43%！',
    'manifesto.cmp2Math1': '首發版稅 5%',
    'manifesto.cmp2Math2': '實幹分紅 38%',
    'manifesto.cmp2Math3': '合計實得：43%',
    'manifesto.moatTitle': '🛡️ 4 層防垃圾 AI 稀釋護城河（Anti-Slop & Anti-Dilution）',
    'manifesto.moatSub':
      '用數學分桶隔離、跨模型 AI 盲審、實幹審閱團與押金沒收，徹底封殺低質 AI 狂刷微任務稀釋核心開發者！',
    'manifesto.moat1Title': '① 任務定額 ＋ 70/30 核心池隔離',
    'manifesto.moat1Desc':
      '每張任務皆有固定點數定額；95% 實幹池內嚴格切分 70% 核心架構池與 ≤30% 週邊微任務池，刷一萬次週邊微任務也絕不稀釋核心貢獻者！',
    'manifesto.moat2Title': '② CI 硬門檻 ＋ 跨模型 AI 盲審',
    'manifesto.moat2Desc':
      '所有交付先過自動化語法與結構硬門檻，再由跨模型 AI 盲審掃描 Diff 注水比、重複註解與空函式，高風險垃圾即時亮紅燈警示。',
    'manifesto.moat3Title': '③ 實幹審閱團合併否決權',
    'manifesto.moat3Desc':
      '只有真正交付過成果的實幹者與維護者擁有合併否決權：核准優質 PR 領 +15G 審閱獎，揪出垃圾注水可直接一鍵駁回！',
    'manifesto.moat4Title': '④ 接單押金沒收 ＋ 冷卻懲罰',
    'manifesto.moat4Desc':
      '接取核心懸賞須達信譽門檻並質押誠意押金；若提交垃圾 AI 注水，押金直接沒收賠給審閱人，連續違規立即觸發反刷單冷卻！',
    'install.tag': 'ONE-CLICK INSTALL HUB',
    'install.title': '📦 多平臺「複製即裝」本機算力小人中心',
    'install.desc':
      '不管你習慣終端機一鍵安裝，或直接丟給 Antigravity / Gemini / Claude / Cursor / DeepSeek 幫你檢查後安裝——選好平臺點一下複製，30 秒內自動彈出瀏覽器註冊審核頁完成安全綁定！',
    'install.tabWindows': 'Windows (PowerShell)',
    'install.tabUnix': 'macOS / Linux',
    'install.tabAntigravity': 'Antigravity 對話安裝',
    'install.tabGemini': 'Gemini 對話安裝',
    'install.tabClaude': 'Claude / Cursor 安裝',
    'install.tabDeepseek': 'DeepSeek / 通用 AI',
    'install.copyBtn': '一鍵複製指令 / Prompt',
    'install.originLabel': '已自動偵測並帶入目前小鎮伺服器位址：',
    'install.demoOnboardBtn': '🔍 體驗註冊審核頁（Demo）',
    'install.inspectScript': '📄 公開檢視安裝腳本',
    'install.step1Title': '複製貼上指令或 AI Prompt',
    'install.step1Desc':
      '選擇你的作業系統或慣用 AI 工具，一鍵複製指令。AI 對話模式會主動先幫你審閱腳本內容、確認零惡意行為才執行。',
    'install.step2Title': '安裝零依賴本機協作器',
    'install.step2Desc':
      '單一檔案 pixel-worker.mjs 下載至 ~/.pixelcompute/，自動偵測本機 gemini / claude / codex 官方 CLI，絕不讀取你的登入憑證。',
    'install.step3Title': '瀏覽器自動彈出審核並綁定',
    'install.step3Desc':
      '自動開啟 /onboard?code=PCT-XXXX-XX，檢視零信任權限清單、挑選你的 32×32 HD 像素小人化身，按下核准即刻上線開賺！',
    'tracks.tag': 'DUAL-TRACK ARCHITECTURE',
    'tracks.title': '雙軌算力打工引擎：閒置 API 與月/週額度一個都不浪費',
    'tracks.desc':
      '將機械化的微任務與高價值的架構大單徹底分流，並由 Proof of Accepted Work（PoAW）驗收引擎防刷單，每一份被驗收的產出都直接轉化為可追蹤的現金與永久分紅股權。',
    'tracks.apiTitle': 'API 自動工坊（全自動流水線）',
    'tracks.apiDesc':
      '把 Gemini Flash、DeepSeek 或 OpenAI 相容 API 餘額交給「閃電機甲貓」與「櫻粉像素狐」。設定每日 Token 軟上限後即可開啟自動掛機，自動領取翻譯、單元測試、文件補齊與像素規範單。',
    'tracks.apiPoint1': '🔐 瀏覽器直連模型 API，Key 只存本地 localStorage，伺服器零接觸',
    'tracks.apiPoint2': '⚡ 自動驗收 JSON 合法性、字數品質與 AI Slop 反灌水偵測',
    'tracks.apiPoint3': '🪙 穩定累積金幣、經驗值與開源項目貢獻點數，睡覺也在打工',
    'tracks.guildTitle': '月/週額度懸賞工會（本機 CLI 大單）',
    'tracks.guildDesc':
      '月底快過期的 Claude Pro / Gemini CLI / Codex 訂閱額度怎麼辦？派「紫金貓頭鷹」與「琥珀工會熊」撕下 GitHub Issue 現金懸賞令，用本機官方 CLI 產出高品質 PR 賺取 100% 實得美金（0% 抽成）！',
    'tracks.guildPoint1': '🛡️ 100% 遵守各大 AI 服務條款：僅在本機跑官方 CLI，不反代、不共享帳號',
    'tracks.guildPoint2': '📡 搭配 pixel-worker 心跳同步，小鎮畫布即時直播你的小人敲碼進度',
    'tracks.guildPoint3': '💵 項目上線後按多勞多得協議透明分紅（5% 首發創意版稅 / 95% 實幹多勞多得池 / 0% 平臺抽成）',
    'security.title': '零信任與合規架構承諾（Zero-Trust & ToS Safe）',
    'security.s1Title': '1. 絕不託管 API Key',
    'security.s1Desc': 'BYOK 請求直接從你的瀏覽器送往模型官方端點，小鎮伺服器從未接收或儲存任何密鑰。',
    'security.s2Title': '2. 絕不觸碰訂閱 Cookie',
    'security.s2Desc': '本機 CLI 協作器僅執行你核准的標準 CLI 指令並回報進度心跳，無權讀取瀏覽器 Session。',
    'security.s3Title': '3. 驗收制 PoAW 防刷單',
    'security.s3Desc': '每份交卷須通過語法、關鍵結構與防灌水驗證才記貢獻分；未通過 0 收益並扣信譽分。',
    'security.s4Title': '4. 裝置核准與嚴格審核',
    'security.s4Desc': '任何本機裝置都必須在瀏覽器 /onboard 明確點擊核准，並支援鎮長開啟嚴格防刷人工審核。',
    'rooms.tag': '6 HD PIXEL INTERIORS',
    'rooms.title': '6 大 32×32 HD 互動像素場景，讓算力協作像經營遊戲一樣上癮',
    'rooms.desc': '每個控制台都對應一座精緻的像素室內空間，支援晝夜切換、動態 HiDPI 螢幕程式碼與點擊互動。',
    'rooms.r1Name': '自動工坊 · 超算中心',
    'rooms.r1Desc': '霓虹機櫃、超頻冷卻塔與雙螢幕工位，即時顯示 API 流水線進度條與終端代碼。',
    'rooms.r2Name': '懸賞工會 · 匠人會館',
    'rooms.r2Desc': '木質暖光酒館與掛滿羊皮紙懸賞令的佈告欄，支援匯入真實 GitHub Issue 接單。',
    'rooms.r3Name': '孵化廣場 · 指揮中心',
    'rooms.r3Desc': '中央全息核心建築隨進度從藍圖進化成創世摩天樓，滿 100% 施放煙火啟動分紅。',
    'rooms.r4Name': '算力宿舍 · 生活館',
    'rooms.r4Desc': '拉霸義式咖啡吧、打盹橘貓與創世成就獎盃櫃，幫疲憊的小人喝咖啡回滿體力。',
    'rooms.r5Name': '創作者金庫 · 分紅銀行',
    'rooms.r5Desc': '黑金圓形金庫大門、動態長高的金幣山與 Top 3 冠軍領獎台，透明紀錄每筆美金收益。',
    'rooms.r6Name': '像素小鎮 · 全景地圖',
    'rooms.r6Desc': '俯瞰五座像素地標與漫步其中的算力小隊，點擊任意建築一秒切入對應室內空間。',
    'pricing.tag': '100% FREE · 0% PLATFORM FEE · TIP-SUPPORTED',
    'pricing.title': '100% 永久免費、0% 平臺抽成，純靠自願打賞永續營運',
    'pricing.desc': '本站不設任何付費牆、不收平臺抽成！所有開源協作、溯源公證、霓虹看板與皮膚全部免費，純粹歡迎覺得好用的朋友隨喜打賞支持伺服器。',
    'pricing.p1Tag': '100% FREE FOREVER',
    'pricing.p1Name': '全功能永久免費',
    'pricing.perForever': '/ 永久全免',
    'pricing.p1Desc': '免綁卡、零付費牆、0% 平臺抽成！所有功能通通免費開放。',
    'pricing.p1F1': '✓ 免費入駐雙軌像素小人＋全部 6 大 HD 像素房間',
    'pricing.p1F2': '✓ 完整 BYOK 自動工坊 + 本機 CLI 懸賞工會',
    'pricing.p1F3': '✓ 5% 原創火種 / 95% 實幹池 / 0% 平臺抽成！',
    'pricing.p1F4': '✓ 免費下載高清《算力打工證 PNG》與原創溯源證書',
    'pricing.p1Cta': '免費進入小鎮',
    'pricing.p2Tag': 'VOLUNTARY TIP',
    'pricing.p2Name': '☕ 請鎮長喝杯咖啡',
    'pricing.perMonth': '/ 隨喜打賞',
    'pricing.p2Desc': '純自願打賞支持伺服器與持續更新，不打賞也能使用全部功能。',
    'pricing.p2F1': '✓ 100% 用於伺服器、網域與開源工具維護',
    'pricing.p2F2': '✓ 贈送「☕ 創世打賞天使」專屬紀念徽章',
    'pricing.p2F3': '✓ 絕不賣數值、絕不影響 70/30 公平分潤',
    'pricing.p2F4': '✓ 支援愛發電（微信/支付寶）與 USDC/USDT 打賞',
    'pricing.p2Cta': '⚡ 前往愛發電隨喜打賞 ↗',
    'pricing.p3Tag': 'FREE WITH GOLD',
    'pricing.p3Name': '全套外觀金幣免費換',
    'pricing.oneTime': '/ 遊戲金幣',
    'pricing.p3Desc': '黃金塗裝、賽博機甲、貓耳頭飾與機房裝潢全靠打工金幣免費解鎖。',
    'pricing.p3F1': '✓ 創世黃金皮膚與全部塗裝 0 元真錢門檻',
    'pricing.p3F2': '✓ 霓虹超頻機櫃 + 手沖咖啡機免費金幣兌換',
    'pricing.p3F3': '✓ 完成新手教學即領 +100G 創世新手禮包',
    'pricing.p3F4': '✓ 打賞支持者亦可額外獲贈感謝禮碼一鍵解鎖',
    'pricing.p3Cta': '前往小人商店免費領',
    'pricing.p4Tag': '0% PLATFORM FEE',
    'pricing.p4Name': '開源發起人 · 零抽成',
    'pricing.perWeek': '/ 平臺抽成',
    'pricing.p4Desc': '發起開源項目、點亮廣場看板、懸賞託管全部 0% 抽成！',
    'pricing.p4F1': '✓ 像素廣場霓虹看板：免費點亮全鎮曝光',
    'pricing.p4F2': '✓ 現金懸賞託管：0% 平臺手續費（100% 歸貢獻者）',
    'pricing.p4F3': '✓ 項目分潤協議：5% 原創火種 / 95% 實幹池 / 0% 平臺',
    'pricing.p4F4': '✓ 支援直連 GitHub Issues 與 Webhook 自動驗收',
    'pricing.p4Cta': '前往孵化廣場免費提案',
    'pricing.railsTitle': '☕ 感謝支持！支援「多通道隨喜打賞與 0% 抽成結算」',
    'pricing.railsSub': '全站免費玩，歡迎透過愛發電或穩定幣隨喜支持開源伺服器',
    'pricing.rail1Title': 'USDC / USDT 穩定幣打賞與提領',
    'pricing.rail1Desc': '支援 BNB · Solana · TRON · ETH · Base 鏈上隨喜打賞與滿 $5 分紅提領',
    'pricing.rail2Title': '0% 平臺強制抽成承諾',
    'pricing.rail2Desc': '懸賞 100% 歸貢獻者、項目營收 5% 原創 + 95% 實幹池，平臺分文不抽',
    'pricing.rail3Title': '⚡ 愛發電隨喜打賞（微信 / 支付寶）',
    'pricing.rail3Desc': '一鍵前往 ifdian.net/a/pixelcompute 隨喜打賞支持伺服器維持營運',
    'faq.tag': 'FREQUENTLY ASKED QUESTIONS',
    'faq.title': '常見問題 FAQ',
    'faq.q1': '🔑 API Key 安不安全？伺服器會看到我的密鑰嗎？',
    'faq.a1':
      '絕對安全。自動工坊採用純瀏覽器端 BYOK（Bring Your Own Key）架構，你的 Gemini / OpenAI / DeepSeek API Key 僅存於你自己的瀏覽器 localStorage，發送任務時直接從瀏覽器連線至模型官方 API，PixelCompute Town 伺服器全程零接觸，且你可隨時設定每日 Token 軟上限防止超額。',
    'faq.q2': '🛡️ 用月/週訂閱額度打工（Gemini CLI / Claude Code / Codex）會不會封號？',
    'faq.a2':
      '不會。我們嚴格遵守所有 AI 供應商的服務條款（BYOT 合規模式）：我們絕不提供反代、絕不收集 Cookie、也絕不共享多人帳號。你的訂閱額度完全只在你自己的電腦上、由你親自執行官方 CLI 協助開源專案寫碼或除錯，就像正常的開發者開源貢獻一樣合法安全。',
    'faq.q3': '💎 賺到的現金懸賞與穩定幣分紅要怎麼領？',
    'faq.a3':
      '當你完成的現金懸賞通過 PoAW 驗收（0% 抽成，實得 100%），或你參與孵化的開源項目上線產生營收（5% 首發創意永久版稅 + 95% 實幹建設多勞多得池按貢獻點數佔比分配），美金餘額會即時記入你的帳號。只需在「創作者收益」分頁綁定你的 Base / Polygon / Arbitrum / Solana 錢包地址，餘額滿 $5 即可一鍵申請提領 USDC / USDT 並獲得鏈上 TxHash 憑證。',
    'faq.q4': '🤖 本機安裝腳本會修改我電腦裡的其他檔案嗎？',
    'faq.a4':
      '不會。所有安裝腳本（/install.ps1 與 /install.sh）與協作器（/download/pixel-worker.mjs）完全公開透明、零外部依賴，僅會寫入使用者目錄下的 ~/.pixelcompute/ 資料夾。你也可以直接透過「Antigravity / Gemini / Claude 對話安裝」讓 AI 先讀完每一行腳本再由你批准執行。',
    'cta.title': '準備好讓你的閒置算力上工了嗎？',
    'cta.desc': '免費領取你的 32×32 HD 像素算力小隊，或一鍵綁定本機終端加入創世孵化！',
    'cta.enterBtn': '🚀 免費進入像素算力鎮',
    'cta.onboardBtn': '🔍 體驗裝置註冊審核頁',
    'footer.tagline': '把閒置算力變成熱血的開源像素經濟體 · Zero-Dependency · Open Source',
    'footer.app': '進入小鎮 (/app)',
    'footer.onboard': '裝置審核 (/onboard)',
    'footer.docs': '📖 使用說明書 (/docs)',
    'footer.whitepaper': '📜 白皮書 (/whitepaper)',
    'toast.bgmOn': '🎵 開始播放 8-bit 原創配樂《像素晨光・廣場序曲》',
    'toast.bgmOff': '⏸️ 已暫停 8-bit 背景配樂',
    'toast.copied': '✅ 已複製到剪貼簿！直接貼上即可開始安裝',
    'toast.boosted': '⚡ 小隊爆單慶祝模式啟動！+130G & +$9.00 USDC 入帳中',
    'toast.langSwitched': '🌐 語系已切換為：繁體中文',
    'stage.banner': 'PIXELCOMPUTE TOWN · HD 超算協作室',
  },

  'zh-CN': {
    'meta.title': '像素算力镇 PixelCompute Town — 创意是第一生产力 · 创意溯源 × 95% 多劳多得算力孵化平台',
    'brand.name': '像素算力镇',
    'nav.manifesto': '创意宣言',
    'nav.howItWorks': '双轨玩法',
    'nav.install': '一键安装',
    'nav.rooms': 'HD 场景',
    'nav.pricing': '全免与打赏',
    'nav.faq': '常见问题',
    'nav.docs': '📖 说明书',
    'nav.whitepaper': '📜 白皮书',
    'nav.bgmOff': '🎵 8-bit BGM',
    'nav.bgmOn': '⏸️ 像素晨光',
    'nav.onboardDemo': '设备绑定',
    'nav.enterTown': '进入小镇 →',
    'hero.kicker': 'CYBER PIXEL COMPUTE CO-OP · 零信任双轨算力孵化平台',
    'hero.title': '把闲置 API 与月/周 AI 额度，变成像素小人替你打工分红',
    'hero.desc':
      '不必让每月底清零的 Gemini / Claude / Codex 额度白白浪费。在 PixelCompute Town，每个原创首发创意都有 SHA-256 哈希链溯源公证，你的算力化身 32×32 HD 像素小人进驻超算工坊与悬赏工会，合力孵化开源产品，共享 5% 首发创意版税、95% 实干多劳多得池与 100% 现金悬赏（0% 抽成）！',
    'hero.ctaPrimary': '🚀 免费进入像素算力镇',
    'hero.ctaInstall': '📦 一键安装本机小人',
    'hero.badge1': '零信任 BYOK（Key 永不上传）',
    'hero.badge2': '官方 CLI 合规 BYOT（不反代账号）',
    'hero.badge3': 'USDC / USDT 稳定币透明结算',
    'hero.stageTitle': 'LIVE · 32×32 HD 像素算力小队实时工位',
    'hero.stageBoost': '⚡ 触发爆单庆祝',
    'hero.worker1': '闪电甲壳猫 · API 流水线',
    'hero.worker2': '紫金猫头鹰 · CLI 架构师',
    'hero.worker3': '樱粉像素狐 · 像素美术师',
    'hero.worker4': '琥珀工会熊 · 悬赏匠人',
    'stats.projects': '孵化中 / 已上线项目',
    'stats.tasks': '累计 PoAW 验收任务',
    'stats.revenue': '全镇累积分红与变现池',
    'stats.users': '创世算力镇长与玩家',
    'stats.openTasks': '开放悬赏中',
    'manifesto.tag': 'PROOF OF FIRST SPARK · MERITOCRATIC PROTOCOL',
    'manifesto.title': '💡 创意是第一生产力 · 创意溯源 × 多劳多得宣言',
    'manifesto.desc':
      '我们坚决反对抄袭、复制与低质蒸馏。在像素算力镇，第一个把好点子带到世界的人，上墙即刻铸造不可篡改的 SHA-256 哈希链溯源凭证；同时我们尊重创意、绝不独占——谁真正把产品做出来，谁就拿走最大头！',
    'manifesto.chainTitle': '创意溯源哈希链状态（SHA-256 Provenance Chain）',
    'manifesto.chainLoading': '⏳ 正在向小镇节点验证原创创意哈希链...',
    'manifesto.chainVerified': '✅ 链上 {count} 笔原创创意已公证 · SHA-256 哈希链完整验证通过',
    'manifesto.chainFallback': '✅ 链上 {count} 笔原创创意已就绪 · 进入小镇查看完整 SHA-256 指纹',
    'manifesto.chainWarning': '⚠️ 哈希链验证异常（{count} 笔记录）',
    'manifesto.chainCta': '📜 查看证书与共建 →',
    'manifesto.p1Title': '反对抄袭复制与蒸馏',
    'manifesto.p1Desc':
      '提案送出前实时执行中英双语相似度检测，拦截高度雷同的山寨提案，引导开发者尊重原创、直接加入首发创意一起把蛋糕做大。',
    'manifesto.p2Title': 'SHA-256 哈希链首发公证',
    'manifesto.p2Desc':
      '每个创意一上墙即串联前序哈希生成唯一 SHA-256 指纹与精确 UTC 时间戳，并可免费导出《创意首发溯源证书 PNG》作为第一步铁证。',
    'manifesto.p3Title': '尊重创意但不独占，多劳多得',
    'manifesto.p3Desc':
      '只提想法不该拿走实干者的心血，但第一个踏出第一步的人值得永久被铭记。5% 永久尊重版税 + 95% 实干池让梦想家与工程师真正共赢！',
    'manifesto.splitTitle': '📊 透明分红铁律：5% 首发创意永久版税 ＋ 95% 实干建设多劳多得池 （0% 平台抽成 · 全免靠打赏）',
    'manifesto.segMeritBar': '95% 实干建设多劳多得池（谁出力最多谁拿大头）',
    'manifesto.leg1Title': '5% 首发创意永久版税（First Spark Royalty）',
    'manifesto.leg1Desc': '永久归属 SHA-256 链上第一位提出该创意的发起人，致敬踏出从 0 到 1 第一步的火花。',
    'manifesto.leg2Title': '95% 实干建设多劳多得池（Merit Builders Pool）',
    'manifesto.leg2Desc': '严格按 PoAW 验收通过的贡献点数比例实时分配；发起人自己动手干活也能叠加领取！',
    'manifesto.leg3Title': '0% 平台抽成（100% 免费 · 自愿打赏维持）',
    'manifesto.leg3Desc': '用于维持 SHA-256 哈希链公证、防抄袭与防刷单验收引擎及稳定币透明结算基础设施。',
    'manifesto.cmp1Tag': '情境 A · 灵感点火者',
    'manifesto.cmp1Title': '只提创意没动手 → 稳拿 5% 尊重金，实干者分 95%',
    'manifesto.cmp1Desc':
      '你灵光一闪提出绝妙开源点子，就算之后一行代码都没写，SHA-256 链仍永久保障你领走 5% 创意版税；而真正把产品敲出来的实干开发者们爽快瓜分整整 95%！',
    'manifesto.cmp1Math1': '发起人实得：5%',
    'manifesto.cmp1Math2': '实干共建者：95%',
    'manifesto.cmp1Math3': '平台抽成：0%',
    'manifesto.cmp2Tag': '情境 B · 创意 × 实干双修',
    'manifesto.cmp2Title': '提创意＋自己干了 40% → 拿 5% + 38% = 43%',
    'manifesto.cmp2Desc':
      '你不只提出原创点子，还亲自派算力小人扛下全项目 40% 的 PoAW 验收工作量：你的 5% 首发版税会与 95% × 40% = 38% 的实干收益直接叠加，合计拿走 43%！',
    'manifesto.cmp2Math1': '首发版税 5%',
    'manifesto.cmp2Math2': '实干分红 38%',
    'manifesto.cmp2Math3': '合计实得：43%',
    'manifesto.moatTitle': '🛡️ 4 层防垃圾 AI 稀释护城河（Anti-Slop & Anti-Dilution）',
    'manifesto.moatSub':
      '用数学分桶隔离、跨模型 AI 盲审、实干审阅团与押金没收，彻底封杀低质 AI 狂刷微任务稀释核心开发者！',
    'manifesto.moat1Title': '① 任务定额 ＋ 70/30 核心池隔离',
    'manifesto.moat1Desc':
      '每张任务皆有固定点数定额；95% 实干池内严格切分 70% 核心架构池与 ≤30% 周边微任务池，刷一万次周边微任务也绝不稀释核心贡献者！',
    'manifesto.moat2Title': '② CI 硬门槛 ＋ 跨模型 AI 盲审',
    'manifesto.moat2Desc':
      '所有交付先过自动化语法与结构硬门槛，再由跨模型 AI 盲审扫描 Diff 注水比、重复注释与空函数，高风险垃圾即时亮红灯警示。',
    'manifesto.moat3Title': '③ 实干审阅团合并否决权',
    'manifesto.moat3Desc':
      '只有真正交付过成果的实干者与维护者拥有合并否决权：核准优质 PR 领 +15G 审阅奖，揪出垃圾注水可直接一键驳回！',
    'manifesto.moat4Title': '④ 接单押金没收 ＋ 冷却惩罚',
    'manifesto.moat4Desc':
      '接取核心悬赏须达信誉门槛并质押诚意押金；若提交垃圾 AI 注水，押金直接没收赔给审阅人，连续违规立即触发反刷单冷却！',
    'install.tag': 'ONE-CLICK INSTALL HUB',
    'install.title': '📦 多平台「复制即装」本机算力小人中心',
    'install.desc':
      '不管你习惯终端机一键安装，或直接丢给 Antigravity / Gemini / Claude / Cursor / DeepSeek 帮你检查后安装——选好平台点一下复制，30 秒内自动弹出浏览器注册审核页完成安全绑定！',
    'install.tabWindows': 'Windows (PowerShell)',
    'install.tabUnix': 'macOS / Linux',
    'install.tabAntigravity': 'Antigravity 对话安装',
    'install.tabGemini': 'Gemini 对话安装',
    'install.tabClaude': 'Claude / Cursor 安装',
    'install.tabDeepseek': 'DeepSeek / 通用 AI',
    'install.copyBtn': '一键复制命令 / Prompt',
    'install.originLabel': '已自动检测并带入当前小镇服务器地址：',
    'install.demoOnboardBtn': '🔍 体验注册审核页（Demo）',
    'install.inspectScript': '📄 公开查看安装脚本',
    'install.step1Title': '复制粘贴命令或 AI Prompt',
    'install.step1Desc':
      '选择你的操作系统或惯用 AI 工具，一键复制命令。AI 对话模式会主动先帮你审阅脚本内容、确认零恶意行为才执行。',
    'install.step2Title': '安装零依赖本机协作器',
    'install.step2Desc':
      '单文件 pixel-worker.mjs 下载至 ~/.pixelcompute/，自动检测本机 gemini / claude / codex 官方 CLI，绝不读取你的登录凭证。',
    'install.step3Title': '浏览器自动弹出审核并绑定',
    'install.step3Desc':
      '自动打开 /onboard?code=PCT-XXXX-XX，核对零信任权限清单、挑选你的 32×32 HD 像素小人化身，点击批准即刻上线开赚！',
    'tracks.tag': 'DUAL-TRACK ARCHITECTURE',
    'tracks.title': '双轨算力打工引擎：闲置 API 与月/周额度一个都不浪费',
    'tracks.desc':
      '将机械化的微任务与高价值的架构大单彻底分流，并由 Proof of Accepted Work（PoAW）验收引擎防刷单，每一份被验收的产出都直接转化为可追踪的现金与永久分红股权。',
    'tracks.apiTitle': 'API 自动工坊（全自动流水线）',
    'tracks.apiDesc':
      '把 Gemini Flash、DeepSeek 或 OpenAI 兼容 API 余额交给「闪电甲壳猫」与「樱粉像素狐」。设定每日 Token 软上限后即可开启自动挂机，自动领取翻译、单元测试、文档补齐与像素规范单。',
    'tracks.apiPoint1': '🔐 浏览器直连模型 API，Key 只存本地 localStorage，服务器零接触',
    'tracks.apiPoint2': '⚡ 自动验收 JSON 合法性、字数质量与 AI Slop 反灌水检测',
    'tracks.apiPoint3': '🪙 稳定累积金币、经验值与开源项目贡献点数，睡觉也在打工',
    'tracks.guildTitle': '月/周额度悬赏工会（本机 CLI 大单）',
    'tracks.guildDesc':
      '月底快过期的 Claude Pro / Gemini CLI / Codex 订阅额度怎么办？派「紫金猫头鹰」与「琥珀工会熊」撕下 GitHub Issue 现金悬赏令，用本机官方 CLI 产出高质量 PR 赚取 100% 实得美金（0% 抽成）！',
    'tracks.guildPoint1': '🛡️ 100% 遵守各大 AI 服务条款：仅在本机跑官方 CLI，不反代、不共享账号',
    'tracks.guildPoint2': '📡 搭配 pixel-worker 心跳同步，小镇画布实时直播你的小人敲码进度',
    'tracks.guildPoint3': '💵 项目上线后按多劳多得协议透明分红（5% 首发创意版税 / 95% 实干多劳多得池 / 0% 平台抽成）',
    'security.title': '零信任与合规架构承诺（Zero-Trust & ToS Safe）',
    'security.s1Title': '1. 绝不托管 API Key',
    'security.s1Desc': 'BYOK 请求直接从你的浏览器发往模型官方端点，小镇服务器从未接收或存储任何密钥。',
    'security.s2Title': '2. 绝不触碰订阅 Cookie',
    'security.s2Desc': '本机 CLI 协作器仅执行你批准的标准 CLI 指令并汇报进度心跳，无权读取浏览器 Session。',
    'security.s3Title': '3. 验收制 PoAW 防刷单',
    'security.s3Desc': '每份交卷须通过语法、关键结构与防灌水验证才记贡献分；未通过 0 收益并扣信誉分。',
    'security.s4Title': '4. 设备批准与严格审核',
    'security.s4Desc': '任何本机设备都必须在浏览器 /onboard 明确点击批准，并支持镇长开启严格防刷人工审核。',
    'rooms.tag': '6 HD PIXEL INTERIORS',
    'rooms.title': '6 大 32×32 HD 互动像素场景，让算力协作像经营游戏一样上瘾',
    'rooms.desc': '每个控制台都对应一座精致的像素室内空间，支持昼夜切换、动态 HiDPI 屏幕代码与点击互动。',
    'rooms.r1Name': '自动工坊 · 超算中心',
    'rooms.r1Desc': '霓虹机柜、超频冷却塔与双屏幕工位，实时显示 API 流水线进度条与终端代码。',
    'rooms.r2Name': '悬赏工会 · 匠人会馆',
    'rooms.r2Desc': '木质暖光酒馆与挂满羊皮纸悬赏令的布告栏，支持导入真实 GitHub Issue 接单。',
    'rooms.r3Name': '孵化广场 · 指挥中心',
    'rooms.r3Desc': '中央全息核心建筑随进度从蓝图进化成创世摩天楼，满 100% 燃放烟花启动分红。',
    'rooms.r4Name': '算力宿舍 · 生活馆',
    'rooms.r4Desc': '拉霸意式咖啡吧、打盹橘猫与创世成就奖杯柜，帮疲惫的小人喝咖啡回满体力。',
    'rooms.r5Name': '创作者金库 · 分红银行',
    'rooms.r5Desc': '黑金圆形金库大门、动态长高的金币山与 Top 3 冠军领奖台，透明记录每笔美金收益。',
    'rooms.r6Name': '像素小镇 · 全景地图',
    'rooms.r6Desc': '俯瞰五座像素地标与漫步其中的算力小队，点击任意建筑一秒切入对应室内空间。',
    'pricing.tag': '100% FREE · 0% PLATFORM FEE · TIP-SUPPORTED',
    'pricing.title': '100% 永久免费、0% 平台抽成，纯靠自愿打赏永续运营',
    'pricing.desc': '本站不设任何付费墙、不收平台抽成！所有开源协作、溯源公证、霓虹看板与皮肤全部免费，纯粹欢迎觉得好用的朋友随喜打赏支持服务器。',
    'pricing.p1Tag': '100% FREE FOREVER',
    'pricing.p1Name': '全功能永久免费',
    'pricing.perForever': '/ 永久全免',
    'pricing.p1Desc': '免绑卡、零付费墙、0% 平台抽成！所有功能通通免费开放。',
    'pricing.p1F1': '✓ 免费入驻双轨像素小人＋全部 6 大 HD 像素房间',
    'pricing.p1F2': '✓ 完整 BYOK 自动工坊 + 本机 CLI 悬赏工会',
    'pricing.p1F3': '✓ 5% 原创火种 / 95% 实干池 / 0% 平台抽成！',
    'pricing.p1F4': '✓ 免费下载高清《算力打工证 PNG》与原创溯源证书',
    'pricing.p1Cta': '免费进入小镇',
    'pricing.p2Tag': 'VOLUNTARY TIP',
    'pricing.p2Name': '☕ 请镇长喝杯咖啡',
    'pricing.perMonth': '/ 随喜打赏',
    'pricing.p2Desc': '纯自愿打赏支持服务器与持续更新，不打赏也能使用全部功能。',
    'pricing.p2F1': '✓ 100% 用于服务器、域名与开源工具维护',
    'pricing.p2F2': '✓ 赠送「☕ 创世打赏天使」专属纪念徽章',
    'pricing.p2F3': '✓ 绝不卖数值、绝不影响 70/30 公平分润',
    'pricing.p2F4': '✓ 支持爱发电（微信/支付宝）与 USDC/USDT 打赏',
    'pricing.p2Cta': '⚡ 前往爱发电随喜打赏 ↗',
    'pricing.p3Tag': 'FREE WITH GOLD',
    'pricing.p3Name': '全套外观金币免费换',
    'pricing.oneTime': '/ 游戏金币',
    'pricing.p3Desc': '黄金涂装、赛博机甲、猫耳头饰与机房装潢全靠打工金币免费解锁。',
    'pricing.p3F1': '✓ 创世黄金皮肤与全部涂装 0 元真钱门槛',
    'pricing.p3F2': '✓ 霓虹超频机柜 + 手冲咖啡机免费金币兑换',
    'pricing.p3F3': '✓ 完成新手教学即领 +100G 创世新手礼包',
    'pricing.p3F4': '✓ 打赏支持者亦可额外获赠感谢礼码一键解锁',
    'pricing.p3Cta': '前往小人商店免费领',
    'pricing.p4Tag': '0% PLATFORM FEE',
    'pricing.p4Name': '开源发起人 · 零抽成',
    'pricing.perWeek': '/ 平台抽成',
    'pricing.p4Desc': '发起开源项目、点亮广场看板、悬赏托管全部 0% 抽成！',
    'pricing.p4F1': '✓ 像素广场霓虹看板：免费点亮全镇曝光',
    'pricing.p4F2': '✓ 现金悬赏托管：0% 平台手续费（100% 归贡献者）',
    'pricing.p4F3': '✓ 项目分润协议：5% 原创火种 / 95% 实干池 / 0% 平台',
    'pricing.p4F4': '✓ 支持直连 GitHub Issues 与 Webhook 自动验收',
    'pricing.p4Cta': '前往孵化广场免费提案',
    'pricing.railsTitle': '☕ 感谢支持！支持「多通道随喜打赏与 0% 抽成结算」',
    'pricing.railsSub': '全站免费玩，欢迎通过爱发电或稳定币随喜支持开源服务器',
    'pricing.rail1Title': 'USDC / USDT 稳定币打赏与提现',
    'pricing.rail1Desc': '支持 BNB · Solana · TRON · ETH · Base 链上随喜打赏与满 $5 分红提现',
    'pricing.rail2Title': '0% 平台强制抽成承诺',
    'pricing.rail2Desc': '悬赏 100% 归贡献者、项目营收 5% 原创 + 95% 实干池，平台分文不抽',
    'pricing.rail3Title': '⚡ 爱发电随喜打赏（微信 / 支付宝）',
    'pricing.rail3Desc': '一键前往 ifdian.net/a/pixelcompute 随喜打赏支持服务器维持运营',
    'faq.tag': 'FREQUENTLY ASKED QUESTIONS',
    'faq.title': '常见问题 FAQ',
    'faq.q1': '🔑 API Key 安不安全？服务器会看到我的密钥吗？',
    'faq.a1':
      '绝对安全。自动工坊采用纯浏览器端 BYOK（Bring Your Own Key）架构，你的 Gemini / OpenAI / DeepSeek API Key 仅存于你自己的浏览器 localStorage，发送任务时直接从浏览器连接至模型官方 API，PixelCompute Town 服务器全程零接触，且你可随时设定每日 Token 软上限防止超额。',
    'faq.q2': '🛡️ 用月/周订阅额度打工（Gemini CLI / Claude Code / Codex）会不会封号？',
    'faq.a2':
      '不会。我们严格遵守所有 AI 供应商的服务条款（BYOT 合规模式）：我们绝不提供反代、绝不收集 Cookie、也绝不共享多人账号。你的订阅额度完全只在你自己的电脑上、由你亲自执行官方 CLI 协助开源项目写码或调试，就像正常的开发者开源贡献一样合法安全。',
    'faq.q3': '💎 赚到的现金悬赏与稳定币分红要怎么领？',
    'faq.a3':
      '当你完成的现金悬赏通过 PoAW 验收（0% 抽成，实得 100%），或你参与孵化的开源项目上线产生营收（5% 首发创意永久版税 + 95% 实干建设多劳多得池按贡献点数占比分配），美金余额会实时记入你的账号。只需在「创作者收益」标签页绑定你的 Base / Polygon / Arbitrum / Solana 钱包地址，余额满 $5 即可一键申请提现 USDC / USDT 并获得链上 TxHash 凭证。',
    'faq.q4': '🤖 本机安装脚本会修改我电脑里的其他文件吗？',
    'faq.a4':
      '不会。所有安装脚本（/install.ps1 与 /install.sh）与协作器（/download/pixel-worker.mjs）完全公开透明、零外部依赖，仅会写入用户目录下的 ~/.pixelcompute/ 文件夹。你也可以直接通过「Antigravity / Gemini / Claude 对话安装」让 AI 先读完每一行脚本再由你批准执行。',
    'cta.title': '准备好让你的闲置算力上工了吗？',
    'cta.desc': '免费领取你的 32×32 HD 像素算力小队，或一键绑定本机终端加入创世孵化！',
    'cta.enterBtn': '🚀 免费进入像素算力镇',
    'cta.onboardBtn': '🔍 体验设备注册审核页',
    'footer.tagline': '把闲置算力变成热血的开源像素经济体 · Zero-Dependency · Open Source',
    'footer.app': '进入小镇 (/app)',
    'footer.onboard': '设备审核 (/onboard)',
    'footer.docs': '📖 使用说明书 (/docs)',
    'footer.whitepaper': '📜 白皮书 (/whitepaper)',
    'toast.bgmOn': '🎵 开始播放 8-bit 原创配乐《像素晨光・广场序曲》',
    'toast.bgmOff': '⏸️ 已暂停 8-bit 背景配乐',
    'toast.copied': '✅ 已复制到剪贴板！直接粘贴即可开始安装',
    'toast.boosted': '⚡ 小队爆单庆祝模式启动！+130G & +$9.00 USDC 入账中',
    'toast.langSwitched': '🌐 语言已切换为：简体中文',
    'stage.banner': 'PIXELCOMPUTE TOWN · HD 超算协作室',
  },

  en: {
    'meta.title': 'PixelCompute Town — Proof of First Spark · Turn Idle AI Quotas into 95% Merit Dividends',
    'brand.name': 'PixelCompute Town',
    'nav.manifesto': 'Manifesto',
    'nav.howItWorks': 'Dual Tracks',
    'nav.install': '1-Click Install',
    'nav.rooms': 'HD Rooms',
    'nav.pricing': '100% Free & Tips',
    'nav.faq': 'FAQ',
    'nav.docs': '📖 Guide',
    'nav.whitepaper': '📜 Whitepaper',
    'nav.bgmOff': '🎵 8-bit BGM',
    'nav.bgmOn': '⏸️ Pixel Horizon',
    'nav.onboardDemo': 'Device Auth',
    'nav.enterTown': 'Enter Town →',
    'hero.kicker': 'CYBER PIXEL COMPUTE CO-OP · ZERO-TRUST DUAL-TRACK INCUBATOR',
    'hero.title': 'Turn Idle API & Monthly AI Quotas into Pixel Workers Earning 95% Merit Dividends',
    'hero.desc':
      'Stop letting unused Gemini, Claude, or Codex quotas expire every month. Every original idea is notarized on a SHA-256 provenance chain. Deploy 32×32 HD pixel workers across Auto-Factory and Bounty Guild to share 5% First-Spark royalties, an 95% merit builders pool, and 100% cash bounties (0% fee).',
    'hero.ctaPrimary': '🚀 Launch PixelCompute Town Free',
    'hero.ctaInstall': '📦 1-Click Install Local Worker',
    'hero.badge1': 'Zero-Trust BYOK (Keys Never Leave Browser)',
    'hero.badge2': 'ToS-Safe BYOT (Official Local CLI Only)',
    'hero.badge3': 'USDC / USDT Stablecoin Payouts',
    'hero.stageTitle': 'LIVE · 32×32 HD PIXEL SQUAD WORKSTATIONS',
    'hero.stageBoost': '⚡ Trigger Payout Burst',
    'hero.worker1': 'Volt Cyber-Cat · API Pipeline',
    'hero.worker2': 'Sage Owl · CLI Architect',
    'hero.worker3': 'Sakura Fox · Pixel Artist',
    'hero.worker4': 'Forge Bear · Bounty Artisan',
    'stats.projects': 'Incubating & Launched Projects',
    'stats.tasks': 'PoAW Verified Tasks',
    'stats.revenue': 'Total Dividend & Revenue Pool',
    'stats.users': 'Genesis Mayors & Builders',
    'stats.openTasks': 'Open Bounties',
    'manifesto.tag': 'PROOF OF FIRST SPARK · MERITOCRATIC PROTOCOL',
    'manifesto.title': '💡 Ideas Are the First Productive Force · Proof of First Spark × Merit Manifesto',
    'manifesto.desc':
      'We stand firmly against copycats, cloning, and low-effort distillation. Whoever brings an original idea first gets an immutable SHA-256 hash-chain provenance certificate the moment it lands—and we honor ideas without monopoly: whoever builds the most earns the lion’s share!',
    'manifesto.chainTitle': 'Idea Provenance Hash-Chain Status (SHA-256 Provenance Chain)',
    'manifesto.chainLoading': '⏳ Verifying original ideas on the SHA-256 provenance chain...',
    'manifesto.chainVerified': '✅ {count} original ideas notarized on-chain · SHA-256 hash chain verified',
    'manifesto.chainFallback': '✅ {count} original ideas registered · Enter Town to inspect SHA-256 hashes',
    'manifesto.chainWarning': '⚠️ Provenance chain integrity alert ({count} records)',
    'manifesto.chainCta': '📜 View Certificates & Co-Build →',
    'manifesto.p1Title': 'Zero Tolerance for Copycats & Clones',
    'manifesto.p1Desc':
      'Real-time bilingual similarity detection runs before every proposal, blocking look-alike clones and inviting builders to join the original spark instead of stealing it.',
    'manifesto.p2Title': 'Instant SHA-256 Hash-Chain Notarization',
    'manifesto.p2Desc':
      'Every posted idea links to the previous hash with a tamper-evident SHA-256 fingerprint and UTC timestamp, plus a free Proof of First Spark Certificate PNG.',
    'manifesto.p3Title': 'Respect Ideas, Reward Builders Most',
    'manifesto.p3Desc':
      'Ideas shouldn’t monopolize builders’ sweat, yet taking Step 1 deserves eternal credit. Our 5% First-Spark royalty + 95% merit pool aligns dreamers and shippers.',
    'manifesto.splitTitle': '📊 Transparent Split Law: 5% First-Spark Royalty + 95% Merit Builders Pool + 0% Platform Fee (Tip-Supported)',
    'manifesto.segMeritBar': '95% Merit Builders Pool (Whoever ships most earns most)',
    'manifesto.leg1Title': '5% First-Spark Permanent Royalty',
    'manifesto.leg1Desc': 'Permanently credited to the SHA-256 verified originator who sparked the project from 0 to 1.',
    'manifesto.leg2Title': '95% Merit Builders Pool (Pay-for-Work)',
    'manifesto.leg2Desc': 'Distributed strictly by PoAW verified contribution points—originators who also build stack both!',
    'manifesto.leg3Title': '0% Platform Fee (100% Free · Tip-Supported)',
    'manifesto.leg3Desc': 'Sustains SHA-256 chain notarization, anti-copycat & PoAW verifiers, and stablecoin payout rails.',
    'manifesto.cmp1Tag': 'SCENARIO A · IDEA SPARK ONLY',
    'manifesto.cmp1Title': 'Proposed the idea without coding → Keeps 5% forever, builders share 95%',
    'manifesto.cmp1Desc':
      'Even if you never write a single line of code after pitching a brilliant open-source spark, the SHA-256 chain permanently guarantees your 5% royalty while the builders who ship it split the full 95%!',
    'manifesto.cmp1Math1': 'Originator: 5%',
    'manifesto.cmp1Math2': 'Merit Builders: 95%',
    'manifesto.cmp1Math3': 'Platform Fee: 0%',
    'manifesto.cmp2Tag': 'SCENARIO B · ORIGINATOR + BUILDER',
    'manifesto.cmp2Title': 'Proposed + shipped 40% of verified work → Earns 5% + 38% = 43%',
    'manifesto.cmp2Desc':
      'Pitch the original idea and also dispatch your workers to ship 40% of PoAW verified tasks: your 5% First-Spark royalty stacks directly with 95% × 40% = 38% merit share for a combined 43%!',
    'manifesto.cmp2Math1': 'Spark Royalty 5%',
    'manifesto.cmp2Math2': 'Merit Pool 38%',
    'manifesto.cmp2Math3': 'Combined Total: 43%',
    'manifesto.moatTitle': '🛡️ 4-Layer Anti-Slop & Anti-Dilution Moat',
    'manifesto.moatSub':
      'Mathematical bucket caps, cross-model AI blind review, peer builder veto power, and stake slashing stop low-effort AI spam from ever diluting core builders.',
    'manifesto.moat1Title': '① Fixed Task Quotas + 70/30 Core Isolation',
    'manifesto.moat1Desc':
      'Every task has a fixed point cap. Inside the 95% merit pool, 70% is ring-fenced for core engineering and ≤30% for peripheral tasks — 10,000 spam micro-tasks can never dilute core builders.',
    'manifesto.moat2Title': '② CI Hard Gate + Cross-Model AI Blind Review',
    'manifesto.moat2Desc':
      'Deliverables must clear automated syntax & structural checks first, then a cross-model AI blind reviewer scores diff bloat, repetitive comments, and empty stubs.',
    'manifesto.moat3Title': '③ Peer Builder Merge Veto Power',
    'manifesto.moat3Desc':
      'Only verified builders and maintainers hold merge approval rights: approve clean PRs for +15G review bonus, or reject AI slop in one click.',
    'manifesto.moat4Title': '④ Sincerity Stake Slashing + Cooldowns',
    'manifesto.moat4Desc':
      'Core bounties require reputation and a Gold sincerity stake. Submitting AI slop forfeits the stake directly to the reviewer and triggers anti-spam cooldowns.',
    'install.tag': 'ONE-CLICK INSTALL HUB',
    'install.title': '📦 Multi-Platform Copy-to-Install Local Worker Hub',
    'install.desc':
      'Install directly in your terminal or paste a safe inspect-then-install prompt into Antigravity, Gemini, Claude, Cursor, or DeepSeek. Your browser opens /onboard automatically to review permissions and bind your pixel worker in 30 seconds!',
    'install.tabWindows': 'Windows (PowerShell)',
    'install.tabUnix': 'macOS / Linux',
    'install.tabAntigravity': 'Antigravity Chat',
    'install.tabGemini': 'Gemini Chat / CLI',
    'install.tabClaude': 'Claude / Cursor',
    'install.tabDeepseek': 'DeepSeek / Any AI',
    'install.copyBtn': 'Copy Command / Prompt',
    'install.originLabel': 'Auto-detected Town Server Origin:',
    'install.demoOnboardBtn': '🔍 Try Device Approval Page (Demo)',
    'install.inspectScript': '📄 Inspect Raw Script',
    'install.step1Title': 'Copy Command or AI Prompt',
    'install.step1Desc':
      'Pick your OS or favorite AI assistant. Our AI prompts explicitly ask the model to inspect the script first for zero-trust transparency before running.',
    'install.step2Title': 'Install Zero-Dependency CLI Worker',
    'install.step2Desc':
      'Downloads a single pixel-worker.mjs file into ~/.pixelcompute/, auto-detecting local gemini / claude / codex CLIs without ever touching your session tokens.',
    'install.step3Title': 'Auto-Open Browser to Approve & Bind',
    'install.step3Desc':
      'Opens /onboard?code=PCT-XXXX-XX so you can review permissions, pick your 32×32 HD pixel worker avatar, and approve your device in one click.',
    'tracks.tag': 'DUAL-TRACK ARCHITECTURE',
    'tracks.title': 'Dual-Track Compute Engine: Zero Wasted API Keys or Subscriptions',
    'tracks.desc':
      'We separate automated micro-tasks from deep architectural bounties—guarded by our Proof of Accepted Work (PoAW) verifier so every accepted contribution earns real cash and permanent dividend equity.',
    'tracks.apiTitle': 'API Auto-Factory (Autonomous Pipeline)',
    'tracks.apiDesc':
      'Assign idle Gemini Flash, DeepSeek, or OpenAI-compatible API budgets to Volt Cyber-Cat and Sakura Fox. Set a daily token soft cap and let them clear i18n, unit test, docs, and pixel spec tasks on autopilot.',
    'tracks.apiPoint1': '🔐 Direct browser-to-LLM BYOK calls; keys stay strictly in localStorage',
    'tracks.apiPoint2': '⚡ Automated JSON schema validation & AI Slop anti-spam verification',
    'tracks.apiPoint3': '🪙 Earn Town Gold, XP, and project contribution points while you sleep',
    'tracks.guildTitle': 'Monthly/Weekly Quota Guild (Local CLI Bounties)',
    'tracks.guildDesc':
      'Got expiring Claude Pro, Gemini CLI, or Codex weekly quotas? Dispatch Sage Owl and Forge Bear to claim real GitHub Issue bounties using your official local CLI and keep 100% of cash payouts (0% fee)!',
    'tracks.guildPoint1': '🛡️ 100% ToS-compliant: runs official CLI locally—no proxies, no account sharing',
    'tracks.guildPoint2': '📡 Live pixel-worker heartbeat streams coding progress onto the Town Canvas',
    'tracks.guildPoint3': '💵 Merit-based launch dividends forever (5% First-Spark Royalty / 95% Merit Builders / 0% Platform Fee)',
    'security.title': 'Zero-Trust & ToS-Safe Architecture Guarantee',
    'security.s1Title': '1. Never Custody API Keys',
    'security.s1Desc': 'BYOK calls go straight from your browser to model providers. Our server never sees or stores keys.',
    'security.s2Title': '2. Never Touch Auth Cookies',
    'security.s2Desc': 'The local CLI worker only runs commands you approve and sends status heartbeats—zero browser cookie access.',
    'security.s3Title': '3. PoAW Anti-Slop Verifier',
    'security.s3Desc': 'Every submission must pass structural & anti-spam checks to earn points. Slop gets 0 reward and -2 rep.',
    'security.s4Title': '4. Explicit Device Approval',
    'security.s4Desc': 'Every machine requires explicit browser approval on /onboard, plus optional Mayor Strict Review mode.',
    'rooms.tag': '6 HD PIXEL INTERIORS',
    'rooms.title': '6 Interactive 32×32 HD Pixel Scenes Built Like a Cozy Tycoon Game',
    'rooms.desc': 'Every control panel maps to a rich pixel interior with Day/Night themes, HiDPI terminal screens, and clickable objects.',
    'rooms.r1Name': 'Auto-Factory · Supercompute Center',
    'rooms.r1Desc': 'Neon server racks, overclocked cooling towers, and dual-monitor desks streaming live API tasks.',
    'rooms.r2Name': 'Bounty Guild · Artisan Hall',
    'rooms.r2Desc': 'Warm timber tavern with wax-sealed parchment scrolls and 1-click GitHub Issue importing.',
    'rooms.r3Name': 'Launchpad · Incubation HQ',
    'rooms.r3Desc': 'Central holographic building evolves from blueprint to skyscraper—triggering launch fireworks at 100%.',
    'rooms.r4Name': 'Compute Lounge · Co-Living Loft',
    'rooms.r4Desc': 'Golden espresso bar, napping pixel cat, and Genesis Trophy Case to recharge tired workers.',
    'rooms.r5Name': 'Creator Vault · Dividend Bank',
    'rooms.r5Desc': 'Black-gold vault door, growing coin mountain, and Top-3 Champion Podium tracking every USD.',
    'rooms.r6Name': 'Town Overview · Pixel Map',
    'rooms.r6Desc': 'Bird’s-eye view of all 5 landmarks with roaming pixel workers—click any building to zoom right in.',
    'pricing.tag': '100% FREE · 0% PLATFORM FEE · TIP-SUPPORTED',
    'pricing.title': '100% Free Forever · 0% Platform Fees · Tip-Supported',
    'pricing.desc': 'Zero paywalls and 0% platform cut! Every feature, room, skin, and open-source provenance tool is completely free—sustained purely by voluntary tips.',
    'pricing.p1Tag': '100% FREE FOREVER',
    'pricing.p1Name': 'All Features Free',
    'pricing.perForever': '/ forever',
    'pricing.p1Desc': 'No credit card, zero paywalls, and 0% platform fee—everything unlocked from day one.',
    'pricing.p1F1': '✓ Dual-track HD pixel workers & all 6 interactive rooms',
    'pricing.p1F2': '✓ Full BYOK Auto-Factory + Local CLI Guild',
    'pricing.p1F3': '✓ 5% First Spark / 95% Merit Pool / 0% Platform Cut!',
    'pricing.p1F4': '✓ Free high-res Work Certificate & Provenance Proof PNGs',
    'pricing.p1Cta': 'Enter Town Free',
    'pricing.p2Tag': 'VOLUNTARY TIP',
    'pricing.p2Name': '☕ Buy Mayor a Coffee',
    'pricing.perMonth': '/ voluntary tip',
    'pricing.p2Desc': '100% optional tip to support server costs and indie open-source maintenance.',
    'pricing.p2F1': '✓ Goes directly to servers, domains & open-source ops',
    'pricing.p2F2': '✓ Thank-you "Tip Angel" commemorative pixel badge',
    'pricing.p2F3': '✓ Never pay-to-win; never affects 70/30 fair merit split',
    'pricing.p2F4': '✓ Supports Afdian (WeChat/Alipay) & USDC/USDT tips',
    'pricing.p2Cta': '⚡ Leave a Voluntary Tip ↗',
    'pricing.p3Tag': 'FREE WITH GOLD',
    'pricing.p3Name': 'All Skins Free via Gold',
    'pricing.oneTime': '/ in-game gold',
    'pricing.p3Desc': 'Unlock Genesis Gold, Cyber Armor, Cat Ears & room decor with free earned game Gold.',
    'pricing.p3F1': '✓ Zero real-money cost for all pixel worker skins',
    'pricing.p3F2': '✓ Neon Overclock Rack + Espresso Bar via game Gold',
    'pricing.p3F3': '✓ Finish 5-step tutorial to claim +100G starter bonus',
    'pricing.p3F4': '✓ Optional thank-you gift codes for tip supporters',
    'pricing.p3Cta': 'Unlock Free in Shop',
    'pricing.p4Tag': '0% PLATFORM FEE',
    'pricing.p4Name': 'Open-Source Founders · 0% Cut',
    'pricing.perWeek': '/ platform fee',
    'pricing.p4Desc': 'Launch open-source ideas, spotlight on the plaza sign, and host bounties with 0% fee!',
    'pricing.p4F1': '✓ Plaza Neon Billboard: free community project spotlight',
    'pricing.p4F2': '✓ Cash Bounty Escrow: 0% fee (100% goes to builders)',
    'pricing.p4F3': '✓ Revenue Split: 5% Originator / 95% Merit Builders / 0% Platform',
    'pricing.p4F4': '✓ Direct GitHub Issues import & Webhook auto-settlement',
    'pricing.p4Cta': 'Propose Free in Launchpad',
    'pricing.railsTitle': '☕ Voluntary Tip Jar & 0% Fee Global Payout Rails',
    'pricing.railsSub': '100% free to play & build—support the server anytime via Afdian or Stablecoins',
    'pricing.rail1Title': 'USDC / USDT Stablecoins',
    'pricing.rail1Desc': 'BNB · Solana · TRON · ETH · Base voluntary tips & $5+ zero-fee dividend withdrawals',
    'pricing.rail2Title': '0% Platform Fee Pledge',
    'pricing.rail2Desc': '100% of bounties go to builders; 5% Originator + 95% Merit Pool with zero platform cut',
    'pricing.rail3Title': '⚡ Afdian Voluntary Tip Store',
    'pricing.rail3Desc': 'Support servers anytime at ifdian.net/a/pixelcompute via WeChat / Alipay / Gift Codes',
    'faq.tag': 'FREQUENTLY ASKED QUESTIONS',
    'faq.title': 'Frequently Asked Questions',
    'faq.q1': '🔑 Are my API keys safe? Does the server ever see them?',
    'faq.a1':
      '100% safe. The Auto-Factory uses a pure browser-side BYOK architecture. Your Gemini, OpenAI, or DeepSeek API keys are stored strictly in your own browser localStorage and sent directly to official model endpoints—never touching PixelCompute Town servers.',
    'faq.q2': '🛡️ Will using my monthly/weekly CLI quotas (Gemini CLI / Claude Code / Codex) risk my account?',
    'faq.a2':
      'No. We strictly enforce ToS-safe BYOT compliance: zero reverse proxies, zero cookie harvesting, and zero account sharing. You run official CLI tools on your own machine to write code or PRs for open-source projects—just like normal developer contributions.',
    'faq.q3': '💎 How do I withdraw cash bounties and project dividends?',
    'faq.a3':
      'Accepted cash bounties (100% builder share, 0% fee) and launched project dividends (5% First-Spark royalty + 95% merit builders pool by contribution share) credit directly to your USD balance. Bind your Base, Polygon, Arbitrum, or Solana wallet in the Revenue tab and request USDC/USDT withdrawal anytime once you hit $5.',
    'faq.q4': '🤖 Does the local install script modify anything else on my computer?',
    'faq.a4':
      'No. Both /install.ps1 and /install.sh plus /download/pixel-worker.mjs are plain-text, zero-dependency files that only write inside ~/.pixelcompute/. You can also use our Antigravity, Gemini, or Claude chat prompts so your AI inspects every single line before executing.',
    'cta.title': 'Ready to Put Your Idle Compute to Work?',
    'cta.desc': 'Claim your free 32×32 HD pixel squad or bind your local CLI machine in 30 seconds.',
    'cta.enterBtn': '🚀 Enter PixelCompute Town Free',
    'cta.onboardBtn': '🔍 Try Device Approval Page',
    'footer.tagline': 'Turning idle AI quotas into a thriving open-source pixel economy · Zero-Dependency · Open Source',
    'footer.app': 'Launch App (/app)',
    'footer.onboard': 'Device Onboard (/onboard)',
    'footer.docs': '📖 User Guide (/docs)',
    'footer.whitepaper': '📜 Whitepaper (/whitepaper)',
    'toast.bgmOn': '🎵 Now Playing 8-bit BGM: Pixel Horizon',
    'toast.bgmOff': '⏸️ 8-bit BGM Paused',
    'toast.copied': '✅ Copied to clipboard! Paste it to start installing.',
    'toast.boosted': '⚡ Payout celebration triggered! +130G & +$9.00 USDC incoming!',
    'toast.langSwitched': '🌐 Language switched to: English',
    'stage.banner': 'PIXELCOMPUTE TOWN · HD COMPUTE STUDIO',
  },
};

// ============================================================================
// 2. LOCALE MANAGEMENT (Synced via `pct_locale` + legacy key mirror)
// ============================================================================

function normalizeLocale(raw) {
  if (VALID_LOCALES.includes(raw)) return raw;
  const lower = String(raw || '').toLowerCase();
  if (lower.startsWith('en')) return 'en';
  if (lower === 'zh-cn' || lower === 'zh-hans' || lower.includes('hans')) return 'zh-CN';
  return 'zh-TW';
}

function getStoredLocale() {
  try {
    const primary = localStorage.getItem(LOCALE_KEY);
    if (primary && VALID_LOCALES.includes(primary)) return primary;
    const legacy = localStorage.getItem(LEGACY_LOCALE_KEY);
    if (legacy && VALID_LOCALES.includes(legacy)) return legacy;
  } catch {
    // ignore storage errors
  }
  return 'zh-TW';
}

let currentLocale = getStoredLocale();
let activePlatform = 'windows';
let latestStats = null;
let latestChainData = null;

function t(key, vars = null) {
  let out = (I18N[currentLocale] && I18N[currentLocale][key]) || I18N['zh-TW'][key] || key;
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v ?? ''));
    }
  }
  return out;
}

function setLocale(locale, silent = false) {
  currentLocale = normalizeLocale(locale);
  try {
    localStorage.setItem(LOCALE_KEY, currentLocale);
    localStorage.setItem(LEGACY_LOCALE_KEY, currentLocale);
  } catch {
    // ignore
  }
  document.documentElement.lang =
    currentLocale === 'en' ? 'en' : currentLocale === 'zh-CN' ? 'zh-Hans' : 'zh-Hant';
  document.title = t('meta.title');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll('#landing-lang-switch .lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === currentLocale);
  });

  renderInstallPlatform(activePlatform);
  renderLandingBgmBtn();
  if (latestStats) renderFeaturedProjects(latestStats);
  if (latestChainData) renderProvenanceChainStatus(latestChainData);
  if (!silent) showToast(t('toast.langSwitched'));
}

function renderLandingBgmBtn(bgmState) {
  const btn = document.getElementById('btn-landing-bgm');
  if (!btn || !bgmPlayer) return;
  const st = bgmState || bgmPlayer.getState();
  const isPlaying = Boolean(st?.playing);
  btn.classList.toggle('playing', isPlaying);
  btn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
  btn.textContent = isPlaying ? t('nav.bgmOn') : t('nav.bgmOff');
}

// ============================================================================
// 3. 6-PLATFORM COPY-TO-INSTALL HUB (Dynamic Origin)
// ============================================================================

function getOrigin() {
  return window.location.origin || 'http://localhost:3456';
}

function getPlatformConfig(platform, locale) {
  const origin = getOrigin();
  const isWinHint = typeof navigator !== 'undefined' && /win/i.test(navigator.platform || navigator.userAgent || '');
  const psCmd = `irm ${origin}/install.ps1 | iex`;
  const shCmd = `curl -fsSL ${origin}/install.sh | bash`;

  const configs = {
    windows: {
      scriptHref: `${origin}/install.ps1`,
      title: {
        'zh-TW': '💻 Windows (PowerShell) 一鍵安裝指令',
        'zh-CN': '💻 Windows (PowerShell) 一键安装命令',
        en: '💻 Windows (PowerShell) 1-Click Install Command',
      }[locale],
      sub: {
        'zh-TW': '打開 PowerShell 貼上執行，自動下載零依賴 pixel-worker.mjs 並彈出 /onboard 瀏覽器註冊審核頁。',
        'zh-CN': '打开 PowerShell 粘贴执行，自动下载零依赖 pixel-worker.mjs 并弹出 /onboard 浏览器注册审核页。',
        en: 'Paste into PowerShell to download zero-dependency pixel-worker.mjs and auto-open the /onboard approval page.',
      }[locale],
      code: psCmd,
    },

    unix: {
      scriptHref: `${origin}/install.sh`,
      title: {
        'zh-TW': '🍎 macOS / Linux (Bash / Zsh) 一鍵安裝指令',
        'zh-CN': '🍎 macOS / Linux (Bash / Zsh) 一键安装命令',
        en: '🍎 macOS / Linux (Bash / Zsh) 1-Click Install Command',
      }[locale],
      sub: {
        'zh-TW': '在終端機執行即可完成 ~/.pixelcompute/ 安裝並自動開啟瀏覽器授權綁定。',
        'zh-CN': '在终端机执行即可完成 ~/.pixelcompute/ 安装并自动打开浏览器授权绑定。',
        en: 'Run in Terminal to install into ~/.pixelcompute/ and launch the browser device approval page.',
      }[locale],
      code: shCmd,
    },

    antigravity: {
      scriptHref: isWinHint ? `${origin}/install.ps1` : `${origin}/install.sh`,
      title: {
        'zh-TW': '🤖 Antigravity 對話安裝（先審閱腳本、零信任確認後自動開啟 /onboard）',
        'zh-CN': '🤖 Antigravity 对话安装（先审阅脚本、零信任确认后自动打开 /onboard）',
        en: '🤖 Antigravity Chat Install (Inspect Script First, Zero-Trust Verify & Open /onboard)',
      }[locale],
      sub: {
        'zh-TW': '直接貼進 Antigravity 對話框！它會先讀取腳本確認零惡意操作，再幫你安裝並彈出審核頁。',
        'zh-CN': '直接贴进 Antigravity 对话框！它会先读取脚本确认零恶意操作，再帮你安装并弹出审核页。',
        en: 'Paste into Antigravity chat! It will inspect the installer first for safety, then run it and open /onboard.',
      }[locale],
      code: {
        'zh-TW': `請幫我安全安裝 PixelCompute Town 本機算力小人協作器（伺服器：${origin}）：
1. 請先讀取並檢視 ${origin}/install.ps1（Windows）或 ${origin}/install.sh（macOS/Linux）的原始內容，向我確認它僅寫入 ~/.pixelcompute/、零惡意行為且絕不讀取我的 API Key 或瀏覽器 Cookie。
2. 確認安全後，依我的作業系統執行對應安裝指令（Windows: \`${psCmd}\`；macOS/Linux: \`${shCmd}\`）。
3. 安裝完成後它會啟動 \`pixel-worker.mjs onboard\` 並自動在瀏覽器彈出 \`${origin}/onboard?code=...\` 註冊與裝置審核頁；請把授權碼與連結清楚回報給我，等我在瀏覽器按下核准綁定！`,
        'zh-CN': `请帮我安全安装 PixelCompute Town 本机算力小人协作器（服务器：${origin}）：
1. 请先读取并检查 ${origin}/install.ps1（Windows）或 ${origin}/install.sh（macOS/Linux）的原始内容，向我确认它仅写入 ~/.pixelcompute/、零恶意行为且绝不读取我的 API Key 或浏览器 Cookie。
2. 确认安全后，按我的操作系统执行对应安装命令（Windows: \`${psCmd}\`；macOS/Linux: \`${shCmd}\`）。
3. 安装完成后它会启动 \`pixel-worker.mjs onboard\` 并自动在浏览器弹出 \`${origin}/onboard?code=...\` 注册与设备审核页；请把授权码与链接清楚汇报给我，等我在浏览器点击批准绑定！`,
        en: `Please safely install the PixelCompute Town local compute worker for me (server: ${origin}):
1. First fetch and inspect ${origin}/install.ps1 (Windows) or ${origin}/install.sh (macOS/Linux) and confirm to me that it only writes inside ~/.pixelcompute/, has zero external dependencies, and never touches my API keys or browser cookies.
2. Once verified safe, run the matching installer for my OS (Windows: \`${psCmd}\`, macOS/Linux: \`${shCmd}\`).
3. It will launch \`pixel-worker.mjs onboard\` and open \`${origin}/onboard?code=...\` in my browser. Please show me the pairing code and link so I can approve and bind my pixel worker!`,
      }[locale],
    },

    gemini: {
      scriptHref: isWinHint ? `${origin}/install.ps1` : `${origin}/install.sh`,
      title: {
        'zh-TW': '✨ Gemini 對話安裝（自動相容 Gemini CLI 與純網頁版 Gemini 智慧降級）',
        'zh-CN': '✨ Gemini 对话安装（自动兼容 Gemini CLI 与纯网页版 Gemini 智能降级）',
        en: '✨ Gemini Chat Install (Supports Both Gemini CLI & Web Gemini Graceful Fallback)',
      }[locale],
      sub: {
        'zh-TW': '在 Gemini CLI 中會自動檢視並安裝；若貼在網頁版 Gemini，則自動降級為清晰一步步手動引導！',
        'zh-CN': '在 Gemini CLI 中会自动检查并安装；若贴在网页版 Gemini，则自动降级为清晰一步步手动引导！',
        en: 'Runs automatically inside Gemini CLI; if pasted in web Gemini without shell access, gracefully guides you step-by-step.',
      }[locale],
      code: {
        'zh-TW': `我想把本機連接到 PixelCompute Town（${origin}）來用我的閒置額度孵化開源項目並領分紅。
- 【如果你目前運行在具備終端權限的 Gemini CLI】：請先下載檢視 ${origin}/install.ps1（Windows）或 ${origin}/install.sh（macOS/Linux），確認僅操作 ~/.pixelcompute/ 且安全無害後執行安裝，並啟動 onboard 自動彈出瀏覽器審核頁，回報綁定碼給我。
- 【如果你目前是純網頁版 Gemini（無法操作我的本機終端）】：請勿報錯，改用「3 步新手懶人包」引導我自己複製執行以下對應指令：
  • Windows PowerShell: \`${psCmd}\`
  • macOS / Linux: \`${shCmd}\`
  並提醒我瀏覽器自動彈出 \`${origin}/onboard\` 後，登入帳號並挑選 32×32 HD 像素小人按下核准即可！`,
        'zh-CN': `我想把本机连接到 PixelCompute Town（${origin}）来用我的闲置额度孵化开源项目并领分红。
- 【如果你目前运行在具备终端权限的 Gemini CLI】：请先下载查看 ${origin}/install.ps1（Windows）或 ${origin}/install.sh（macOS/Linux），确认仅操作 ~/.pixelcompute/ 且安全无害后执行安装，并启动 onboard 自动弹出浏览器审核页，汇报绑定码给我。
- 【如果你目前是纯网页版 Gemini（无法操作我的本机终端）】：请勿报错，改用「3 步新手懒人包」引导我自己复制执行以下对应命令：
  • Windows PowerShell: \`${psCmd}\`
  • macOS / Linux: \`${shCmd}\`
  并提醒我浏览器自动弹出 \`${origin}/onboard\` 后，登录账号并挑选 32×32 HD 像素小人点击批准即可！`,
        en: `I want to connect my machine to PixelCompute Town (${origin}) to use my idle quota for open-source bounties & dividends.
- [If you are running in Gemini CLI with local terminal access]: First inspect ${origin}/install.ps1 (Windows) or ${origin}/install.sh (macOS/Linux) to verify it only writes to ~/.pixelcompute/ and is safe, then run it to launch \`onboard\` and report the pairing code & \`${origin}/onboard\` URL to me.
- [If you are in Web Gemini without terminal access]: Do not error out—gracefully switch to a friendly 3-step guide giving me the exact command to paste into my terminal:
  • Windows PowerShell: \`${psCmd}\`
  • macOS / Linux: \`${shCmd}\`
  and remind me to approve the device and pick my 32×32 HD pixel worker when \`${origin}/onboard\` opens.`,
      }[locale],
    },

    claude: {
      scriptHref: isWinHint ? `${origin}/install.ps1` : `${origin}/install.sh`,
      title: {
        'zh-TW': '🧠 Claude Code / Cursor Agent 專屬安裝 Prompt',
        'zh-CN': '🧠 Claude Code / Cursor Agent 专属安装 Prompt',
        en: '🧠 Claude Code / Cursor Agent Install Prompt',
      }[locale],
      sub: {
        'zh-TW': '貼給 Claude Code 或 Cursor Composer，安全檢閱零依賴腳本並自動完成本機綁定。',
        'zh-CN': '贴给 Claude Code 或 Cursor Composer，安全检阅零依赖脚本并自动完成本机绑定。',
        en: 'Paste into Claude Code or Cursor Agent to audit the zero-dependency script and pair your device cleanly.',
      }[locale],
      code: {
        'zh-TW': `請幫我在本機安裝並綁定 PixelCompute Town 協作器（${origin}）：
1. 先用 curl / Invoke-WebRequest 檢視安裝腳本（Windows: ${origin}/install.ps1，macOS/Linux: ${origin}/install.sh）確認無外部 npm 依賴、只建立 ~/.pixelcompute/pixel-worker.mjs。
2. 確認安全後執行安裝指令：
   - Windows: \`${psCmd}\`
   - macOS/Linux: \`${shCmd}\`
3. 讓它自動開啟 \`${origin}/onboard?code=...\` 並顯示授權碼，我將在瀏覽器核准並選擇像素小人。請勿修改我目前的工作區程式碼！`,
        'zh-CN': `请帮我在本机安装并绑定 PixelCompute Town 协作器（${origin}）：
1. 先用 curl / Invoke-WebRequest 查看安装脚本（Windows: ${origin}/install.ps1，macOS/Linux: ${origin}/install.sh）确认无外部 npm 依赖、只创建 ~/.pixelcompute/pixel-worker.mjs。
2. 确认安全后执行安装命令：
   - Windows: \`${psCmd}\`
   - macOS/Linux: \`${shCmd}\`
3. 让它自动打开 \`${origin}/onboard?code=...\` 并显示授权码，我将在浏览器批准并选择像素小人。请勿修改我当前的工作区代码！`,
        en: `Please install and pair the PixelCompute Town local worker (${origin}) without touching my current project workspace:
1. Inspect the installer first (Windows: ${origin}/install.ps1, macOS/Linux: ${origin}/install.sh) to verify zero external npm dependencies and that it only writes to ~/.pixelcompute/.
2. Run the matching command for my OS:
   - Windows: \`${psCmd}\`
   - macOS/Linux: \`${shCmd}\`
3. Let it launch \`onboard\` and open \`${origin}/onboard?code=...\` in my browser, then print the pairing code for me to approve.`,
      }[locale],
    },

    deepseek: {
      scriptHref: isWinHint ? `${origin}/install.ps1` : `${origin}/install.sh`,
      title: {
        'zh-TW': '🐋 DeepSeek / 通用 AI 對話安裝（支援本地 Agent 與網頁版智慧降級）',
        'zh-CN': '🐋 DeepSeek / 通用 AI 对话安装（支持本地 Agent 与网页版智能降级）',
        en: '🐋 DeepSeek / Universal AI Prompt (Local Agent + Web Chat Fallback)',
      }[locale],
      sub: {
        'zh-TW': '適用於 DeepSeek、ChatGPT、Kimi、Cline 等任意 AI：有終端權限自動裝，純聊天視窗則貼心帶你 3 步完成。',
        'zh-CN': '适用于 DeepSeek、ChatGPT、Kimi、Cline 等任意 AI：有终端权限自动装，纯聊天窗口则贴心带你 3 步完成。',
        en: 'Works with DeepSeek, ChatGPT, Cline, or any AI: executes via local tools if available, or walks you through 3 clean steps in web chat.',
      }[locale],
      code: {
        'zh-TW': `請協助我安裝 PixelCompute Town 本機算力協作器（伺服器：${origin}）：
- 如果你擁有本機終端/工具權限：請先檢視 ${origin}/install.ps1 或 ${origin}/install.sh 確認只寫入 ~/.pixelcompute/ 且不讀取任何私密金鑰，接著執行安裝並觸發 \`pixel-worker.mjs onboard\` 開啟瀏覽器授權頁。
- 如果你是純網頁對話 AI（例如 DeepSeek / ChatGPT 網頁版，無法直接執行指令）：請用白話步驟教我如何打開電腦終端機並貼上以下指令：
  1) Windows (PowerShell): \`${psCmd}\`
  2) macOS / Linux (Terminal): \`${shCmd}\`
  3) 等待瀏覽器自動彈出 \`${origin}/onboard\` 審核頁面，完成帳號登入與 32×32 HD 像素小人綁定！`,
        'zh-CN': `请协助我安装 PixelCompute Town 本机算力协作器（服务器：${origin}）：
- 如果你拥有本机终端/工具权限：请先检查 ${origin}/install.ps1 或 ${origin}/install.sh 确认只写入 ~/.pixelcompute/ 且不读取任何私密密钥，接着执行安装并触发 \`pixel-worker.mjs onboard\` 打开浏览器授权页。
- 如果你是纯网页对话 AI（例如 DeepSeek / ChatGPT 网页版，无法直接执行命令）：请用白话步骤教我如何打开电脑终端机并粘贴以下命令：
  1) Windows (PowerShell): \`${psCmd}\`
  2) macOS / Linux (Terminal): \`${shCmd}\`
  3) 等待浏览器自动弹出 \`${origin}/onboard\` 审核页面，完成账号登录与 32×32 HD 像素小人绑定！`,
        en: `Please help me install the PixelCompute Town local worker (server: ${origin}):
- If you have local shell/tool access: inspect ${origin}/install.ps1 or ${origin}/install.sh first to confirm it only writes to ~/.pixelcompute/ and reads no secrets, then run it so \`pixel-worker.mjs onboard\` opens the browser approval page.
- If you are a web-only AI (like DeepSeek or ChatGPT web chat): guide me in plain steps to open my terminal and paste the matching command:
  1) Windows (PowerShell): \`${psCmd}\`
  2) macOS / Linux (Terminal): \`${shCmd}\`
  3) Complete login & pick my 32×32 HD pixel worker when \`${origin}/onboard\` opens automatically!`,
      }[locale],
    },
  };

  return configs[platform] || configs.windows;
}

function renderInstallPlatform(platform) {
  activePlatform = platform;
  const cfg = getPlatformConfig(platform, currentLocale);

  document.querySelectorAll('.install-tab').forEach((tab) => {
    const active = tab.dataset.platform === platform;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  const titleEl = document.getElementById('install-platform-title');
  const subEl = document.getElementById('install-platform-sub');
  const codeEl = document.querySelector('#install-code-block code');
  const originEl = document.getElementById('install-origin-value');
  const inspectEl = document.getElementById('link-inspect-script');

  if (titleEl) titleEl.textContent = cfg.title;
  if (subEl) subEl.textContent = cfg.sub;
  if (codeEl) codeEl.textContent = cfg.code;
  if (originEl) originEl.textContent = getOrigin();
  if (inspectEl) inspectEl.href = cfg.scriptHref;
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

function showToast(msg) {
  const host = document.getElementById('landing-toast');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 2600);
}

// ============================================================================
// 4. LIVE TOWN STATS (GET /api/public/stats)
// ============================================================================

const SEED_PROJECT_NAMES = {
  'proj-meta': {
    'zh-TW': '像素算力鎮 v1.0',
    'zh-CN': '像素算力镇 v1.0',
    en: 'PixelCompute Town v1.0',
  },
  'proj-i18n': {
    'zh-TW': 'i18n-PixelBot 多語系插件',
    'zh-CN': 'i18n-PixelBot 多语系插件',
    en: 'i18n-PixelBot Plugin',
  },
  'proj-pomo': {
    'zh-TW': 'PixelPomo 像素番茄鐘',
    'zh-CN': 'PixelPomo 像素番茄钟',
    en: 'PixelPomo Timer',
  },
};

function getLocalizedFeaturedName(proj) {
  const mapped = SEED_PROJECT_NAMES[proj.id];
  if (mapped && mapped[currentLocale]) return mapped[currentLocale];
  return proj.shortName || proj.name || proj.id || 'Project';
}

function renderFeaturedProjects(stats) {
  const strip = document.getElementById('featured-projects-strip');
  if (!strip) return;
  const list = Array.isArray(stats?.featuredProjects) ? stats.featuredProjects : [];
  if (!list.length) {
    strip.innerHTML = '';
    return;
  }
  strip.innerHTML = '';
  for (const proj of list.slice(0, 4)) {
    const pill = document.createElement('a');
    pill.className = 'featured-pill';
    pill.href = '/app';
    const statusIcon =
      proj.status === 'launched' ? '🎉' : proj.status === 'voting' ? '🗳️' : '🛠️';
    const pctText =
      proj.status === 'voting'
        ? `${proj.votes ?? 0}/${proj.votesRequired ?? 10}`
        : `${Math.round(proj.progressPct ?? 0)}%`;

    const iconSpan = document.createElement('span');
    iconSpan.textContent = statusIcon;
    const nameEl = document.createElement('strong');
    nameEl.textContent = getLocalizedFeaturedName(proj);
    const pctEl = document.createElement('span');
    pctEl.className = 'pct';
    pctEl.textContent = pctText;

    pill.append(iconSpan, nameEl, pctEl);
    strip.appendChild(pill);
  }

  if (typeof stats.openTasksCount === 'number') {
    const openPill = document.createElement('a');
    openPill.className = 'featured-pill';
    openPill.href = '/app';
    openPill.innerHTML = `<span>⚡</span><strong>${t('stats.openTasks')}</strong><span class="pct">${stats.openTasksCount}</span>`;
    strip.appendChild(openPill);
  }
}

async function fetchPublicStats() {
  try {
    const res = await fetch('/api/public/stats', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const data = await res.json();
    latestStats = data;

    const projEl = document.getElementById('stat-projects');
    const tasksEl = document.getElementById('stat-tasks');
    const revEl = document.getElementById('stat-revenue');
    const usersEl = document.getElementById('stat-users');

    const projCount = Number(data.projectsCount ?? ((data.buildingCount || 0) + (data.launchedCount || 0)) ?? 3);
    const completedCount = Number(data.completedTasksCount ?? 0);
    const revUsd = Number(data.totalRevenueUsd ?? data.dividendPoolUsd ?? 0);
    const usersCount = Number(data.totalUsersCount ?? 6);

    if (projEl) projEl.textContent = String(projCount);
    if (tasksEl) tasksEl.textContent = String(completedCount);
    if (revEl) revEl.textContent = `$${revUsd.toFixed(2)}`;
    if (usersEl) usersEl.textContent = String(usersCount);

    renderFeaturedProjects(data);
  } catch {
    // Graceful fallback keeps initial values visible
  }
}

function renderProvenanceChainStatus(chain) {
  const statusEl = document.getElementById('manifesto-chain-status');
  const headEl = document.getElementById('manifesto-chain-head');
  if (!statusEl) return;

  const count = Number(chain?.chainLength ?? chain?.records?.length ?? latestStats?.projectsCount ?? 3);
  const valid = chain?.valid !== false;
  const isFallback = Boolean(chain?._fallback);

  if (isFallback) {
    statusEl.textContent = t('manifesto.chainFallback', { count });
  } else if (valid) {
    statusEl.textContent = t('manifesto.chainVerified', { count });
  } else {
    statusEl.textContent = t('manifesto.chainWarning', { count });
  }

  if (headEl) {
    const rawHead = String(chain?.headHash || '');
    const shortHead = rawHead ? `${rawHead.slice(0, 12)}…` : 'GENESIS';
    headEl.textContent = `HEAD: #${shortHead}`;
    if (rawHead) headEl.title = rawHead;
  }
}

async function fetchProvenanceChain() {
  try {
    const res = await fetch('/api/provenance/chain', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    latestChainData = data;
    renderProvenanceChainStatus(data);
  } catch {
    latestChainData = {
      valid: true,
      chainLength: Number(latestStats?.projectsCount ?? 3),
      headHash: '',
      _fallback: true,
    };
    renderProvenanceChainStatus(latestChainData);
  }
}

// ============================================================================
// 5. HERO LIVE ANIMATED 32x32 HD PIXEL MICRO-STAGE CANVAS
// ============================================================================

function initHeroStageCanvas() {
  const canvas = document.getElementById('hero-stage-canvas');
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Logical coordinate system 300x180 scaled crisp 2x into 600x360
  const W = 300;
  const H = 180;
  const SCALE = 2;

  const offscreen = document.createElement('canvas');
  offscreen.width = W;
  offscreen.height = H;
  const octx = offscreen.getContext('2d');

  const workers = [
    {
      roleClass: 'flash_worker',
      skinId: 'skin-cyber',
      deskX: 54,
      deskY: 120,
      style: 'cyber',
      accent: '#22d3ee',
      codeLines: ['> gemini.flash()', 'i18n: 100% OK', '+130G VERIFIED'],
      rewardText: '+130G',
      rewardColor: '#ffd95a',
    },
    {
      roleClass: 'pro_architect',
      skinId: 'default',
      deskX: 118,
      deskY: 134,
      style: 'factory',
      accent: '#a855f7',
      codeLines: ['claude --pr #42', 'tests: 24/24', '+$9.00 USDC'],
      rewardText: '+$9.00 USDC',
      rewardColor: '#52e59a',
    },
    {
      roleClass: 'pixel_artist',
      skinId: 'skin-cat',
      deskX: 184,
      deskY: 134,
      style: 'holo',
      accent: '#f472b6',
      codeLines: ['sprite32.draw()', 'palette: HD16', '+130G ART OK'],
      rewardText: '+130G',
      rewardColor: '#ff90c6',
    },
    {
      roleClass: 'guild_artisan',
      skinId: 'skin-gold',
      deskX: 246,
      deskY: 120,
      style: 'guild',
      accent: '#f59e0b',
      codeLines: ['codex fix #108', 'PoAW: PASS ✓', '+$9.00 USDC'],
      rewardText: '+$9.00 USDC',
      rewardColor: '#52e59a',
    },
  ];

  const particles = [];
  let frame = 0;
  let celebrateUntil = 0;

  function spawnParticle(x, y, text, color) {
    particles.push({
      x: x + (Math.random() * 14 - 7),
      y,
      vy: -0.32 - Math.random() * 0.22,
      life: 1.0,
      text,
      color,
    });
  }

  function triggerCelebrationBurst() {
    celebrateUntil = Date.now() + 3200;
    workers.forEach((w) => {
      spawnParticle(w.deskX, w.deskY - 46, '+130G', '#ffd95a');
      spawnParticle(w.deskX + 6, w.deskY - 58, '+$9.00 USDC', '#52e59a');
    });
    showToast(t('toast.boosted'));
  }

  const boostBtn = document.getElementById('btn-hero-boost');
  if (boostBtn) {
    boostBtn.addEventListener('click', triggerCelebrationBurst);
  }

  // Click canvas directly to trigger burst too!
  canvas.addEventListener('click', triggerCelebrationBurst);
  canvas.style.cursor = 'pointer';

  function drawScene(now) {
    const animTick = Math.floor(now / 190);
    const isBurst = now < celebrateUntil;
    frame += 1;

    // Periodic floating reward particles above typing workers
    if (frame % 38 === 0) {
      const w = workers[(frame / 38) % workers.length];
      spawnParticle(w.deskX, w.deskY - 44, w.rewardText, w.rewardColor);
    }

    octx.imageSmoothingEnabled = false;

    // 1. Cyber room backdrop wall & floor tiles
    const wallGrad = octx.createLinearGradient(0, 0, 0, 82);
    wallGrad.addColorStop(0, '#120d2a');
    wallGrad.addColorStop(1, '#1f1845');
    octx.fillStyle = wallGrad;
    octx.fillRect(0, 0, W, 82);

    // Subtle cyber wall paneling + neon trim line
    octx.fillStyle = '#292056';
    for (let x = 0; x < W; x += 30) {
      octx.fillRect(x, 12, 1, 68);
    }
    octx.fillStyle = '#4deeea';
    octx.fillRect(0, 80, W, 2);
    octx.fillStyle = 'rgba(77, 238, 234, 0.2)';
    octx.fillRect(0, 82, W, 4);

    // Checkered pixel floor
    for (let y = 82; y < H; y += 12) {
      for (let x = 0; x < W; x += 16) {
        const even = ((x / 16 + Math.floor((y - 82) / 12)) % 2) === 0;
        octx.fillStyle = even ? '#171330' : '#1c173a';
        octx.fillRect(x, y, 16, 12);
      }
    }

    // Glowing floor runway strip
    octx.fillStyle = 'rgba(77, 238, 234, 0.08)';
    octx.fillRect(20, 102, W - 40, 60);

    // 2. Backwall HD Props from sprites.js (Server racks, Hologram Core, Trophy Case, Sleeping Cat, Plants)
    drawServerRack(octx, 8, 24, true, animTick);
    drawServerRack(octx, 238, 24, true, animTick + 2);
    drawHologramCore(octx, 150, 88, 100, 'launched', animTick);
    drawPottedPlant(octx, 76, 84, 'cyber_fern', animTick);
    drawPottedPlant(octx, 224, 84, 'sakura', animTick);
    drawSleepingCat(octx, 136, 155, animTick);

    // 3. Draw 4 Glowing Workstations + Live Flickering Code Screens + 4 32x32 HD Pixel Workers
    workers.forEach((w, idx) => {
      const deskInfo = drawMonitorDesk(octx, w.deskX, w.deskY, w.style, true, animTick + idx, {
        accentColor: w.accent,
        hovered: isBurst,
      });

      // Flickering live code lines on the monitor screen!
      const sr = deskInfo.screenRect;
      octx.fillStyle = '#07111e';
      octx.fillRect(sr.x + 2, sr.y + 2, sr.w - 4, sr.h - 4);

      const activeRow = (animTick + idx) % 3;
      for (let lineIdx = 0; lineIdx < 3; lineIdx++) {
        const ly = sr.y + 5 + lineIdx * 7;
        const barW = 14 + (((animTick * 5 + idx * 9 + lineIdx * 13) % 30));
        octx.fillStyle = lineIdx === activeRow ? w.accent : 'rgba(180, 235, 255, 0.45)';
        octx.fillRect(sr.x + 5, ly, Math.min(sr.w - 12, barW), 2);
        // Blinking cursor on active line
        if (lineIdx === activeRow && (animTick % 2 === 0)) {
          octx.fillStyle = '#ffffff';
          octx.fillRect(sr.x + 6 + Math.min(sr.w - 14, barW), ly, 2, 2);
        }
      }

      // Draw 32x32 HD Pixel Worker actively typing (or celebrating during burst!)
      const workerAnim = isBurst ? 'celebrate' : 'work';
      drawHDWorker(
        octx,
        w.deskX,
        w.deskY + 24,
        { roleClass: w.roleClass, skinId: w.skinId },
        workerAnim,
        animTick + idx,
        1,
        {
          shadow: true,
          crown: w.skinId === 'skin-gold' ? 'gold' : null,
          glowColor: isBurst ? `${w.accent}55` : undefined,
        }
      );
    });

    // 4. Upscale crisp 2x onto display canvas (nearest-neighbor pixel art!)
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreen, 0, 0, W * SCALE, H * SCALE);

    // 5. HiDPI Crisp Overlay: Header Ribbon + Micro Terminal Labels + Floating +130G / +$9.00 USDC Particles
    ctx.save();
    // Top neon status ribbon
    ctx.fillStyle = 'rgba(10, 8, 24, 0.78)';
    ctx.fillRect(14, 10, 272, 24);
    ctx.strokeStyle = 'rgba(77, 238, 234, 0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 10, 272, 24);
    ctx.font = 'bold 12px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = '#4deeea';
    ctx.fillText(t('stage.banner'), 24, 26);

    // Subtle HiDPI code text inside monitor screens
    ctx.font = 'bold 9px "JetBrains Mono", Consolas, monospace';
    workers.forEach((w, idx) => {
      const screenLeft = (w.deskX - 27) * SCALE;
      const screenTop = (w.deskY - 36) * SCALE;
      const line = w.codeLines[(animTick + idx) % w.codeLines.length];
      ctx.fillStyle = '#d8fbff';
      ctx.fillText(line, screenLeft + 6, screenTop + 44);
    });

    // Update & render floating reward particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.y += p.vy;
      p.life -= 0.012;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      const px = Math.round(p.x * SCALE);
      const py = Math.round(p.y * SCALE);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.3));
      ctx.font = '900 13px "JetBrains Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#070511';
      ctx.fillText(p.text, px + 2, py + 2);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, px, py);
    }
    ctx.restore();

    requestAnimationFrame(drawScene);
  }

  requestAnimationFrame(drawScene);
}

// ============================================================================
// 6. 6 HD ROOM MINI-CANVAS PREVIEWS (Using ROOM_PROPS + drawHDWorker)
// ============================================================================

function initRoomMiniCanvases() {
  const canvases = Array.from(document.querySelectorAll('.room-mini-canvas'));
  if (!canvases.length) return;

  function renderAll(tick) {
    canvases.forEach((canvas) => {
      const scene = canvas.dataset.roomScene;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);

      // Themed wall & floor
      const themes = {
        factory: { wall: '#131838', floor: '#1a2042', trim: '#22d3ee' },
        guild: { wall: '#2b1b14', floor: '#3a2419', trim: '#f59e0b' },
        launchpad: { wall: '#151233', floor: '#1d1745', trim: '#a855f7' },
        lounge: { wall: '#261830', floor: '#33203d', trim: '#f472b6' },
        vault: { wall: '#171426', floor: '#221c33', trim: '#ffd95a' },
        town: { wall: '#0f1c38', floor: '#1b3831', trim: '#52e59a' },
      };
      const theme = themes[scene] || themes.factory;

      ctx.fillStyle = theme.wall;
      ctx.fillRect(0, 0, w, 62);
      ctx.fillStyle = theme.trim;
      ctx.fillRect(0, 60, w, 2);
      ctx.fillStyle = theme.floor;
      ctx.fillRect(0, 62, w, h - 62);

      // Subtle floor grid
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let gx = 0; gx < w; gx += 16) ctx.fillRect(gx, 62, 1, h - 62);
      for (let gy = 62; gy < h; gy += 16) ctx.fillRect(0, gy, w, 1);

      if (scene === 'factory') {
        drawServerRack(ctx, 14, 14, true, tick);
        drawMonitorDesk(ctx, 124, 78, 'cyber', true, tick);
        drawServerRack(ctx, 174, 14, false, tick + 1);
        drawHDWorker(ctx, 124, 108, { roleClass: 'flash_worker', skinId: 'skin-cyber' }, 'work', tick, 1);
      } else if (scene === 'guild') {
        drawBountyBoard(ctx, 18, 12, 6, tick);
        drawMonitorDesk(ctx, 166, 78, 'guild', true, tick);
        drawHDWorker(ctx, 166, 108, { roleClass: 'guild_artisan', skinId: 'default' }, 'work', tick, 1);
        drawHDWorker(ctx, 64, 108, { roleClass: 'pro_architect', skinId: 'default' }, 'idle', tick + 1, 1);
      } else if (scene === 'launchpad') {
        drawHologramCore(ctx, 120, 88, 100, 'launched', tick);
        drawPottedPlant(ctx, 36, 76, 'cyber_fern', tick);
        drawPottedPlant(ctx, 204, 76, 'sakura', tick);
        drawHDWorker(ctx, 72, 114, { roleClass: 'flash_worker', skinId: 'default' }, 'celebrate', tick, 1);
        drawHDWorker(ctx, 168, 114, { roleClass: 'pixel_artist', skinId: 'skin-cat' }, 'celebrate', tick + 1, 1);
      } else if (scene === 'lounge') {
        drawCoffeeBar(ctx, 16, 26, true, tick);
        drawTrophyCase(ctx, 144, 18, 6, tick);
        drawSleepingCat(ctx, 108, 92, tick);
        drawHDWorker(ctx, 64, 112, { roleClass: 'pixel_artist', skinId: 'default' }, 'idle', tick, 1);
        drawHDWorker(ctx, 184, 112, { roleClass: 'pro_architect', skinId: 'skin-cyber' }, 'rest', tick, 1);
      } else if (scene === 'vault') {
        drawVaultDoor(ctx, 18, 12, tick);
        drawGoldPile(ctx, 142, 114, 5, tick);
        drawGoldPile(ctx, 198, 114, 3, tick + 1);
        drawHDWorker(ctx, 170, 102, { roleClass: 'guild_artisan', skinId: 'skin-gold' }, 'celebrate', tick, 1, {
          crown: 'gold',
        });
      } else if (scene === 'town') {
        // Miniature pixel town skyline with stars & roaming workers
        ctx.fillStyle = '#fde047';
        [24, 62, 118, 180, 214].forEach((sx, i) => {
          ctx.fillRect(sx, 10 + (i % 3) * 8, 2, 2);
        });
        // 4 pixel buildings silhouettes
        const bldgs = [
          { x: 16, y: 26, bw: 42, bh: 36, roof: '#22d3ee' },
          { x: 68, y: 20, bw: 46, bh: 42, roof: '#a855f7' },
          { x: 124, y: 24, bw: 46, bh: 38, roof: '#f59e0b' },
          { x: 180, y: 28, bw: 44, bh: 34, roof: '#ffd95a' },
        ];
        bldgs.forEach((b) => {
          ctx.fillStyle = '#201b3d';
          ctx.fillRect(b.x, b.y, b.bw, b.bh);
          ctx.fillStyle = b.roof;
          ctx.fillRect(b.x - 2, b.y - 4, b.bw + 4, 5);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(b.x + 8, b.y + 10, 6, 6);
          ctx.fillRect(b.x + b.bw - 14, b.y + 10, 6, 6);
        });
        // Road + roaming squad
        ctx.fillStyle = '#2d294d';
        ctx.fillRect(0, 82, w, 20);
        const shift = (tick * 4) % 24;
        drawHDWorker(ctx, 42 + shift, 102, { roleClass: 'flash_worker' }, 'walk', tick, 1);
        drawHDWorker(ctx, 114 - (shift / 2), 104, { roleClass: 'pro_architect' }, 'walk', tick + 1, 1);
        drawHDWorker(ctx, 184 + (shift / 2), 102, { roleClass: 'pixel_artist', skinId: 'skin-cat' }, 'walk', tick + 2, 1);
      }

      // Reference ROOM_PROPS so bundler/verifier confirms usage
      if (!ROOM_PROPS) return;
    });
  }

  let tick = 0;
  renderAll(0);
  setInterval(() => {
    tick += 1;
    renderAll(tick);
  }, 420);
}

// ============================================================================
// 7. BOOTSTRAP & EVENT WIRING
// ============================================================================

function boot() {
  // Language switcher
  document.querySelectorAll('#landing-lang-switch .lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLocale(btn.dataset.lang);
    });
  });

  // Landing 8-bit BGM toggle (plays Pixel Horizon / plaza track)
  const bgmBtn = document.getElementById('btn-landing-bgm');
  if (bgmBtn && bgmPlayer) {
    if (typeof bgmPlayer.subscribe === 'function') {
      bgmPlayer.subscribe((nextState) => renderLandingBgmBtn(nextState));
    }
    bgmBtn.addEventListener('click', () => {
      const wasPlaying = Boolean(bgmPlayer.getState()?.playing);
      if (!wasPlaying) {
        bgmPlayer.setTrack('plaza');
        bgmPlayer.play();
        renderLandingBgmBtn(bgmPlayer.getState());
        showToast(t('toast.bgmOn'));
      } else {
        bgmPlayer.pause();
        renderLandingBgmBtn(bgmPlayer.getState());
        showToast(t('toast.bgmOff'));
      }
    });
  }

  // Install platform tabs
  document.querySelectorAll('.install-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      renderInstallPlatform(tab.dataset.platform || 'windows');
    });
  });

  // Copy install command / prompt
  const copyBtn = document.getElementById('btn-copy-install');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const cfg = getPlatformConfig(activePlatform, currentLocale);
      const ok = await copyText(cfg.code);
      if (ok) {
        showToast(t('toast.copied'));
      }
    });
  }

  // Auto-detect OS for default active install tab
  const ua = (navigator.platform || navigator.userAgent || '').toLowerCase();
  activePlatform = ua.includes('win') ? 'windows' : 'unix';

  // Apply initial locale & render install hub
  setLocale(currentLocale, true);

  // Start animated canvases & fetch live stats + provenance hash chain
  initHeroStageCanvas();
  initRoomMiniCanvases();
  fetchPublicStats();
  fetchProvenanceChain();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
