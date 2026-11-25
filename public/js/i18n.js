/**
 * PixelCompute Town — 100% 全站三語即時切換與實體在地化引擎（繁體中文 / 简体中文 / English）
 * 語系設定同步儲存在 localStorage（pct_locale + pixel_compute_town_lang_v1），不影響後端狀態。
 */

const PRIMARY_STORAGE_KEY = 'pct_locale';
const LEGACY_STORAGE_KEY = 'pixel_compute_town_lang_v1';

export const SUPPORTED_LANGS = Object.freeze([
  { code: 'zh-TW', label: '繁中' },
  { code: 'zh-CN', label: '简中' },
  { code: 'en', label: 'EN' },
]);

export const SUPPORTED_LOCALES = SUPPORTED_LANGS;

function normalizeLocale(locale) {
  if (!locale) return currentLocale;
  const raw = String(locale).trim();
  if (raw === 'zh-TW' || raw === 'zh-Hant' || raw === 'zh-HK') return 'zh-TW';
  if (raw === 'zh-CN' || raw === 'zh-Hans' || raw === 'zh') return 'zh-CN';
  if (raw.toLowerCase().startsWith('en')) return 'en';
  return 'zh-TW';
}

export const DICTIONARY = Object.freeze({
  'zh-TW': {
    // Page & Brand
    'page.title': '像素算力鎮 PixelCompute Town — 閒置算力雙軌打工與開源孵化平臺',
    'brand.name': '像素算力鎮',
    'brand.sub': 'PixelCompute Town · BYOK + BYOT 雙軌孵化',

    // HUD
    'hud.goldTitle': '小鎮金幣餘額（可用於商店裝扮與小人咖啡）',
    'hud.usdTitle': '累計懸賞實得與項目分紅收益（USD）',
    'hud.repTitle': '驗收信譽分（防刷單 Proof of Accepted Work）',
    'hud.byokTitle': '點擊設定瀏覽器端 BYOK 金鑰（絕不傳給伺服器）',
    'hud.repPrefix': '信譽',
    'hud.byokDemo': 'BYOK：擬真體驗',
    'hud.byokLive': 'BYOK：{model}',
    'hud.homeBtn': '🏠 官網',
    'hud.installBtn': '📦 安裝小人',
    'hud.userTitle': '點擊開啟帳號登入、註冊與切換',
    'hud.githubLogin': 'GitHub 登入',
    'hud.logout': '登出',
    'hud.certBtn': '🪪 打工證',
    'hud.settingsBtn': '⚙️ 設定',
    'hud.dayNightTitle': '切換賽博暖夜 / 清晨白天模式',
    'hud.soundTitle': '切換 8-bit 復古音效',

    // Stage & Scenes
    'stage.quickNav': 'HD 場景：',
    'stage.navFactory': '🏭 自動工坊',
    'stage.navGuild': '⚔️ 懸賞工會',
    'stage.navLaunchpad': '🚀 孵化中心',
    'stage.navLounge': '☕ 算力宿舍',
    'stage.navVault': '💰 創作者金庫',
    'stage.navTown': '🗺️ 小鎮總覽',
    'stage.autoFollow': '🔗 自動跟隨分頁',
    'stage.autoFollowTitle': '切換右側 5 大分頁時，左側畫布自動無縫切進專屬 HD 室內場景',
    'stage.hintDefault': '點擊建築或像素小人可快速切換對應控制台',
    'stage.hintFactory': '🏭 自動工坊超算中心：即時觀看 API 軌道小人雙螢幕敲碼與進度條',
    'stage.hintGuild': '⚔️ 懸賞工會大廳：點選佈告欄卷軸或觀看本機 CLI 匠人即時心跳',
    'stage.hintLaunchpad': '🚀 孵化指揮中心：觀察全息建築隨進度進化，100% 上線點燃煙火！',
    'stage.hintLounge': '☕ 算力宿舍生活館：小人喝咖啡回體力、換穿皮膚與點亮成就獎盃櫃',
    'stage.hintVault': '💰 創作者金庫大廳：即時分紅營收柱、閃耀金幣山與 Top 3 冠軍領獎台',
    'stage.hintTown': '🗺️ 小鎮全景地圖：點擊任意建築直接切入該建築專屬 HD 室內場景',
    'stage.syncOn': '🔗 已開啟「自動跟隨分頁」：切換右側分頁將同步切換左側 HD 場景',
    'stage.syncOff': '📌 已鎖定目前場景：切換右側分頁將保留目前 HD 畫布視角',
    'stage.sseConnecting': 'SSE 連線中',
    'stage.sseLive': 'SSE 即時連線',
    'stage.sseOffline': 'SSE 重連中...',
    'stage.marqueeDefault': '像素算力鎮運行中！歡迎把閒置算力派上場！',
    'stage.loadingWorkers': '正在同步算力小人狀態...',
    'stage.stripSummary': '開工中 {working}/{total} ｜ 可接任務 {open} 張',
    'stage.workerHint': '👾 【{name}】Lv.{level} · 體力 {stamina}/{maxStamina} · {msg}',
    'stage.taskSelectedHint': '🏭 已選取任務：{title}',
    'stage.cliHint': '💻 [CLI] {name}：{msg}{pct}',
    'stage.idleFallback': '待命中',

    // Terminal Feed
    'terminal.title': '小鎮即時動態終端（含 AI 交付與本機 CLI 心跳）',
    'terminal.filterAll': '全部',
    'terminal.filterDeliverable': '交付',
    'terminal.filterRevenue': '分紅',
    'terminal.filterCli': 'CLI',
    'terminal.waiting': '等待小鎮事件寫入...',
    'terminal.empty': '此分類暫無小鎮動態，派一位小人上工試試吧！',
    'terminal.inspectBtn': '🔍 查看完整交付與驗收報告',

    // Tabs
    'tab.factory': '自動工坊',
    'tab.guild': '懸賞工會',
    'tab.incubator': '孵化廣場',
    'tab.workers': '小人商店',
    'tab.revenue': '創作者收益',

    // Onboarding
    'onboarding.title': '🧭 創世鎮長 3 步快速體驗',
    'onboarding.step1': '1. 派小人完成首單並通過驗收',
    'onboarding.step2': '2. 幫 PixelPomo 投滿票破土立項',
    'onboarding.step3': '3. 項目上線分紅或匯出打工證',
    'onboarding.collapse': '收合導引',
    'onboarding.expand': '展開 3 步導引',
    'onboarding.allDone': '🎉 全部完成！你已掌握雙軌協作與透明分紅閉環',

    // Factory Tab
    'factory.banner': '⚡ <strong>API 軌道（BYOK 零信任）</strong>：支援瀏覽器直連 Gemini API / OpenAI 相容端點，未填 Key 亦可免門檻擬真體驗！',
    'factory.keyBtn': '🔑 設定 API Key',
    'factory.allProjects': '全部項目',
    'factory.allStatus': '全部狀態',
    'factory.statusOpen': '可接單',
    'factory.statusCompleted': '已驗收',
    'factory.autopilot': '🤖 自動掛機',
    'factory.autopilotTitle': '每 6 秒自動為閒置 API 小人接單並執行驗收',
    'factory.dispatch': '🚀 一鍵派工執行',
    'factory.working': '⚡ 小人趕工中...',
    'factory.inspect': '📋 查看 AI 交卷與驗收報告',
    'factory.loading': '載入工坊任務中...',
    'factory.empty': '目前沒有符合篩選條件的 API 任務。快去「孵化廣場」幫 PixelPomo 投票解鎖新任務吧！',
    'factory.workerBusyTag': '趕工中',
    'factory.workerDoneTag': '交付',
    'factory.netSuffix': '實得',
    'factory.noTrackWorker': '尚無對應軌道小人',
    'factory.workerWorkingSuffix': ' [工作中]',

    // Guild Tab
    'guild.banner': '⚔️ <strong>月／週訂閱額度軌道（BYOT 合規）</strong>：接單後複製標準化 Context Pack 給本機 Gemini CLI / Claude Code / Codex，或跑 <code class="mono">pixel-worker</code> 即時直播小人幹活！',
    'guild.workerLabel': '派駐工會小人：',
    'guild.importTitle': '🔗 從 GitHub 公開倉庫匯入真實 Issue 為懸賞任務',
    'guild.importPlaceholder': '輸入 owner/repo 或完整 GitHub 網址（例：vercel/next.js）',
    'guild.importBtn': '📥 匯入 Issue',
    'guild.importTrackGuild': '懸賞工會 (BYOT)',
    'guild.importTrackApi': '自動工坊 (API)',
    'guild.importAutoProj': '自動建立對應項目',
    'guild.claimOpen': '⚔️ 撕下懸賞令 / 開啟工作台',
    'guild.claimResume': '🛠️ 開啟工作台提交成果',
    'guild.loading': '載入工會懸賞中...',
    'guild.empty': '暫無工會大單，前往孵化廣場投票解鎖新項目可自動生成高價值懸賞！',
    'guild.workerBusyTag': '接單處理中',
    'guild.workerDoneTag': '結案',
    'guild.poolBadge': '🚀 5/85/10 多勞多得分紅池',
    'guild.bountyNetFee': '💰 ${gross} (實得 ${net} / 服務費 ${fee})',

    // Incubator Tab
    'incubator.summaryDefault': 'SHA-256 創意溯源 → 雙軌共建 → 透明多勞多得（5% 首發創意版稅 / 85% 實幹多勞多得 / 10% 平臺）',
    'incubator.summary': '投票中 {voting} ｜ 建設中 {building} ｜ 已上線 {launched} ｜ 5/85/10 多勞多得協議',
    'incubator.proposeBtn': '＋ 我要提案新項目',
    'incubator.jumpImport': '🔗 匯入 GitHub Issue',
    'incubator.loading': '載入孵化項目中...',
    'incubator.sponsoredBadge': '📺 霓虹廣告置頂',
    'incubator.statusVoting': '🗳️ 投票中 ({votes}/{req})',
    'incubator.statusLaunched': '🚀 已發布上線',
    'incubator.statusBuilding': '🏗️ 建設中 {pct}%',
    'incubator.creatorPrefix': '👤 發起人：{name}',
    'incubator.originatorPrefix': '💡 首發創意人：{name}',
    'incubator.coBuildersCount': '🤝 {count} 人共建',
    'incubator.hashVerifyTitle': '點擊驗證完整 SHA-256 溯源鏈與下載首發證書',
    'incubator.splitSpark': '5% 創意版稅',
    'incubator.splitMerit': '85% 實幹多勞多得',
    'incubator.splitPlatform': '10% 平臺',
    'incubator.joinBtn': '🤝 加入共建',
    'incubator.joinedBtn': '✓ 已加入共建',
    'incubator.certBtn': '📜 溯源證書',
    'incubator.poolTag': '📊 分紅協議 5/85/10',
    'incubator.myPoints': '✨ 你持有 {pts} 貢獻點（約佔 85% 實幹池 {pct}%）',
    'incubator.myPointsSpark': '✨ 你持有 {pts} 貢獻點（估總份額 {pct}%｜含 5% 首發版稅）',
    'incubator.bountyPool': '💰 現金懸賞池 ${amount}',
    'incubator.totalRev': '💵 累計產品營收 {amount}',
    'incubator.voteProgress': '立項投票進度（還差 {left} 票自動破土並生成 5 張雙軌任務！）',
    'incubator.voteCount': '{votes} / {req} 票',
    'incubator.progressLaunched': '已上線營運中 · 持續分紅',
    'incubator.progressReady': '🎉 已達 100%！可立即發布上線並結算首日分紅！',
    'incubator.progressBuilding': '雙軌算力開發進度',
    'incubator.billboardActive': '✨ 廣場霓虹看板曝光中',
    'incubator.billboardBtn': '📺 租用像素霓虹廣告位 (${price})',

    // Workers & Shop Tab
    'workers.myWorkers': '🤖 我的算力小人（管理體力上限與裝扮）',
    'workers.loading': '載入算力小人中...',
    'workers.achievements': '🏆 創世成就牆（自動解鎖領金幣＋印上打工證）',
    'workers.achievementsLoading': '載入創世成就中...',
    'workers.achievementsEmpty': '尚無創世成就資料。',
    'workers.achUnlocked': '✓ 已解鎖',
    'workers.recruitTitle': '✨ 招募新算力小人（4 大職業任選）',
    'workers.recruitNameLabel': '小人代號 / 名稱',
    'workers.recruitNamePlaceholder': '例如：霓虹畫師阿咪',
    'workers.recruitRoleLabel': '職業與軌道',
    'workers.roleOptFlash': '⚡ 閃電工程師（API 軌道）',
    'workers.roleOptArtist': '🎨 像素美術師（API 軌道）',
    'workers.roleOptPro': '🧠 首席架構師（月/週額度工會）',
    'workers.roleOptArtisan': '🔨 工會匠人（月/週額度工會）',
    'workers.recruitProviderLabel': '算力來源標籤',
    'workers.recruitCapLabel': '每日體力上限（Token / 次數）',
    'workers.recruitBtn': '＋ 招募並進駐小鎮',
    'workers.shopTitle': '🛍️ 像素外觀、機房裝潢與 Pro 會員商店',
    'workers.shopLoading': '載入商店品項中...',
    'workers.shopBundleTag': '3 款 HD 皮膚全收錄',
    'workers.shopPreviewTitle': 'HD 皮膚試穿預覽',
    'workers.shopBundleTitle': '內含全部限定皮膚預覽',
    'workers.certTitle': '🪪 像素風《算力打工證 PNG》分享卡',
    'workers.certDesc': '一鍵生成專屬復古像素證件，展示你的信譽分、完工數、成就徽章與項目持倉分紅，發推炫耀超吸睛！',
    'workers.previewCert': '👁️ 預覽打工證 PNG',
    'workers.downloadCert': '⬇️ 直接下載 PNG',
    'workers.statusWorking': '⚡ 趕工中',
    'workers.statusIdle': '☕ 待命中',
    'workers.staminaLine': '體力值 {stamina} / {maxStamina} ｜ 今日額度 {used} / {cap} {unit}',
    'workers.unitTokens': 'tokens',
    'workers.unitQuota': '次/日',
    'workers.trackLine': '軌道：{track}',
    'workers.trackApi': '自動工坊 (API)',
    'workers.trackGuild': '懸賞工會 (BYOT)',
    'workers.completedLine': '完工：{count} 單',
    'workers.earnedLine': '累積：{gold}G / {pts} 貢獻',
    'workers.dailyCapLabel': '每日上限：',

    // Revenue, Payouts & Mayor Admin Tab
    'revenue.totalLabel': '創作者平臺累計總變現（USD）',
    'revenue.transparentBadge': '透明帳本即時結算',
    'revenue.resetBtn': '🔄 重置示範世界',
    'revenue.kpiBounty': '⚔️ 現金懸賞 10% 託管抽成',
    'revenue.kpiBountySub': '每筆現金懸賞驗收自動結算',
    'revenue.kpiCarry': '🚀 孵化分紅池 10% Carry',
    'revenue.kpiCarrySub': '項目上線與後續營收自動入帳',
    'revenue.kpiAds': '📺 像素廣場霓虹廣告位',
    'revenue.kpiAdsSub': '$29/位 · 同步點亮小鎮霓虹招牌',
    'revenue.kpiPro': '✨ 像素皮膚與 Pro 會員',
    'revenue.kpiProSub': '純外觀與效率加成，絕不賣戰力',
    'revenue.historyTitle': '📒 平臺營收流水紀錄',
    'revenue.historyEmpty': '尚無營收流水，快去驗收懸賞、租用廣告位或發布項目吧！',
    'revenue.leaderboardTitle': '🏆 全鎮創世貢獻排行榜',
    'revenue.leaderboardLoading': '載入排行榜中...',
    'revenue.lbPoints': '{pts} 貢獻',
    'revenue.lbRep': '信譽 {rep}',

    // Stablecoin Payout Section
    'payout.sectionTitle': '💸 穩定幣分紅提領（USDC / USDT）',
    'payout.balanceBadge': '可提領餘額：{amount}',
    'payout.walletChainLabel': '收款公鏈',
    'payout.walletAddressLabel': '個人收款錢包地址（EVM 0x... 或 Solana）',
    'payout.walletPlaceholder': '0x... 或 Solana 錢包地址',
    'payout.bindBtn': '🔗 綁定收款錢包',
    'payout.boundStatus': '已綁定錢包（{chain}）：{address}',
    'payout.unboundStatus': '尚未綁定穩定幣收款錢包，綁定後滿 $5 即可提領分紅與懸賞收益。',
    'payout.amountLabel': '提領金額（USD，最低 $5）',
    'payout.tokenLabel': '提領幣種',
    'payout.requestBtn': '💸 申請穩定幣提領',
    'payout.instantBtn': '⚡ 沙盒即時出款',
    'payout.historyTitle': '提領紀錄',
    'payout.historyEmpty': '尚無穩定幣提領紀錄。',
    'payout.statusPaid': '✅ 已發放',
    'payout.statusPending': '⏳ 待出款',
    'payout.markPaidBtn': '✅ 標記已出款',

    // Mayor Admin Section
    'admin.sectionTitle': '🛡️ 鎮長管理面板（裝置審核與卡密生成）',
    'admin.toggleLabel': '顯示 / 收合管理區',
    'admin.strictTitle': '嚴格裝置審核模式（防刷保護）',
    'admin.strictDesc': '開啟後，新裝置透過 /onboard 核准將進入待審核清單，需鎮長手動放行。',
    'admin.strictOn': '🔒 嚴格審核 ON',
    'admin.strictOff': '🔓 自動放行',
    'admin.devicesTitle': '待審核與已綁定裝置清單',
    'admin.devicesEmpty': '目前沒有待審核裝置。',
    'admin.approveBtn': '✅ 核准',
    'admin.rejectBtn': '✕ 拒絕',
    'admin.devicePending': '⏳ 待審核',
    'admin.deviceApproved': '✅ 已核准',
    'admin.deviceRejected': '✕ 已拒絕',
    'admin.codesTitle': '🎟️ 卡密兌換碼生成器（愛發電 / Ko-fi / Gumroad 販售用）',
    'admin.codeRewardLabel': '獎勵類型',
    'admin.codeRewardPro': '💎 Pro 通行證（$9）',
    'admin.codeRewardPack': '🎁 創世限定外觀大禮包（$15）',
    'admin.codeRewardGold': '🪙 500 金幣禮包',
    'admin.codeRewardBillboard': '📺 霓虹廣告兌換券',
    'admin.codeCountLabel': '數量',
    'admin.codeNoteLabel': '備註（選填）',
    'admin.codeNotePlaceholder': '例如：愛發電 11 月贊助批次',
    'admin.generateCodeBtn': '⚡ 一鍵生成卡密',
    'admin.codesEmpty': '尚未生成卡密。',
    'admin.codeUsed': '已兌換',
    'admin.codeUnused': '可使用',
    'admin.copyCodeBtn': '📋 複製',

    // Badges & Common Buttons
    'badge.open': '🟡 可派工',
    'badge.working': '⚡ 執行中',
    'badge.completed': '✅ 已驗收',
    'badge.guildOpen': '📜 懸賞開放',
    'badge.guildWorking': '⚔️ 接單進行中',
    'badge.guildCompleted': '✅ 已結案',
    'badge.owned': '✓ 已擁有',
    'btn.buy': '購買',
    'btn.checkout': '💎 結帳購買',
    'btn.close': '✕ 關閉',
    'btn.closeSimple': '關閉',
    'btn.cancel': '取消',
    'btn.copy': '📋 複製',
    'btn.vote': '🗳️ 投贊成票 (+1)',
    'btn.billboard': '📺 租用像素霓虹廣告位 ($29)',
    'btn.launch': '🚀 一鍵發布上線！（觸發 $200 首日分紅）',
    'btn.simRevenue': '💸 模擬產生 $100 營收並分紅',
    'btn.coffee': '☕ 喝咖啡回體力',
    'btn.saveCap': '儲存上限',

    // Modal 1: BYOK Settings
    'modal.settings.title': '⚙️ BYOK 零信任金鑰與本機 CLI 設定',
    'modal.settings.callout': '🔒 <strong>零信任安全承諾</strong>：你的 API Key <strong>只儲存在你本機瀏覽器的 localStorage</strong>，並由瀏覽器直接呼叫 Gemini / OpenAI 相容端點，<strong>絕不傳送到像素算力鎮伺服器</strong>。未填 Key 時可免門檻使用高品質擬真體驗模式。',
    'modal.settings.providerLabel': '模型介面協議',
    'modal.settings.providerGemini': 'Google Gemini API（一等公民 · 瀏覽器直連）',
    'modal.settings.providerOpenai': 'OpenAI 相容 Endpoint（OpenRouter / DeepSeek / Ollama）',
    'modal.settings.presetsLabel': '快速選擇預設模型',
    'modal.settings.presetsPlaceholder': '-- 選擇推薦模型 --',
    'modal.settings.modelLabel': '模型名稱（可自訂輸入）',
    'modal.settings.baseUrlLabel': 'OpenAI 相容 Base URL',
    'modal.settings.baseUrlPlaceholder': 'https://openrouter.ai/api/v1 或 http://localhost:11434/v1',
    'modal.settings.apiKeyLabel': 'API Key（留空即使用免金鑰擬真體驗模式）',
    'modal.settings.apiKeyPlaceholder': 'AIzaSy... 或 sk-...',
    'modal.settings.maxTokensLabel': '單次任務最大輸出 Token 上限（成本保護防爆倉）',
    'modal.settings.cliTitle': '🖥️ 本機月／週額度 CLI 橋接器（BYOT）',
    'modal.settings.cliDesc': '擁有 Gemini CLI / Claude Code / Codex 訂閱？在終端機執行下方指令即可把本機真實幹活進度直播同步到像素小鎮：',
    'modal.settings.clearBtn': '🗑️ 清除金鑰',
    'modal.settings.testBtn': '🔌 測試連線',
    'modal.settings.saveBtn': '💾 儲存於瀏覽器',

    // Modal 2: Guild Workbench
    'modal.guild.title': '⚔️ 工會懸賞接單工作台（BYOT）',
    'modal.guild.titleWithTask': '⚔️ 工會工作台：{title}',
    'modal.guild.step1': '步驟 1：複製標準化 CLI / Prompt Context Pack',
    'modal.guild.copyPack': '📋 一鍵複製 Context Pack',
    'modal.guild.step2': '步驟 2（可選）：在本機執行 pixel-worker 即時同步動畫',
    'modal.guild.copyCmd': '📋 複製指令',
    'modal.guild.step3': '步驟 3（可選）：貼上 GitHub PR 連結並驗證',
    'modal.guild.verifyPr': '🔍 驗證 PR',
    'modal.guild.step4': '步驟 4：貼上本機 AI 產出成果送交 Proof of Accepted Work 驗收',
    'modal.guild.simCli': '⚡ 模擬本機 CLI 交付（一鍵體驗）',
    'modal.guild.contentPlaceholder': '貼上程式碼、Diff 說明、測試輸出或結構化交付報告（空白或灌水將被防作弊系統攔截並扣信譽分）...',
    'modal.guild.laterBtn': '稍後提交',
    'modal.guild.submitBtn': '📤 提交成果並驗收結算',
    'modal.guild.criteriaPrefix': '驗收條件：',
    'modal.guild.criteriaFallback': '提供完整可驗證實作程式碼或合法 GitHub PR 連結',
    'modal.guild.workerBadge': '👾 小人：{name}',
    'modal.guild.pointsBadge': '✨ +{pts} 貢獻',
    'modal.guild.bountyBadge': '💰 懸賞 ${gross}（實得 ${net}）',

    // Modal 3: Propose Project
    'modal.propose.title': '🚀 提案新孵化項目（SHA-256 創意首發公證）',
    'modal.propose.banner': '提案上牆即刻生成 <strong>SHA-256 創意首發哈希鏈憑證</strong>！達標後自動破土生成雙軌任務，上線營收按 <strong>5% 首發創意版稅 / 85% 實幹多勞多得 / 10% 平臺</strong> 透明分紅。',
    'modal.propose.nameLabel': '項目名稱 *',
    'modal.propose.namePlaceholder': '例如：PixelMetrics（開源輕量統計看板）',
    'modal.propose.descLabel': '項目簡介與願景 *',
    'modal.propose.descPlaceholder': '用 1-2 句話說明這套產品要解決什麼痛點、目標用戶是誰...',
    'modal.propose.catLabel': '產品類型',
    'modal.propose.catDevtools': '開發者工具',
    'modal.propose.catSaas': '獨立 SaaS',
    'modal.propose.catPlugin': '開源插件',
    'modal.propose.catGame': '像素互動工具',
    'modal.propose.bountyLabel': '初期現金懸賞預算（USD，可填 0）',
    'modal.propose.repoLabel': 'GitHub 倉庫連結（選填）',
    'modal.propose.submitBtn': '🚀 送出提案並鑄造首發指紋',
    'modal.propose.copycatHighTitle': '🛡️ 反抄襲偵測警告：發現高度雷同的原創創意（相似度 {pct}%）！',
    'modal.propose.copycatWarnTitle': '⚠️ 靈感查重提示：已有相似原創創意（相似度 {pct}%）',
    'modal.propose.copycatMeta': '原創首發者：{originator} ｜ 公證時間：{time} ｜ 指紋：#{hash}',
    'modal.propose.copycatDesc': '像素算力鎮反對抄襲複製蒸餾——與其重複造輪子，不如直接加入原創意共建，靠實幹拿走 85% 多勞多得分紅池大頭！',
    'modal.propose.copycatJoinBtn': '🤝 尊重原創：直接加入該創意共建',
    'modal.propose.copycatClean': '✅ 即時反抄襲查重通過：未發現高度雷同提案，送出即鑄造首發 SHA-256 證書！',
    'modal.propose.derivativeAck': '我確認此為差異化延伸靈感，並願標記致敬來源指紋',

    // Modal 8: Provenance & Merit Calculator (#provenance-modal)
    'modal.provenance.title': '📜 創意首發溯源憑證 & 多勞多得分紅試算',
    'modal.provenance.chainVerifying': '⏳ 正在向小鎮節點驗證 SHA-256 雜湊鏈...',
    'modal.provenance.chainValid': '✅ SHA-256 哈希鏈驗證通過（區塊 #{idx} · 全鏈 {len} 筆原創公證無竄改）',
    'modal.provenance.chainInvalid': '⚠️ 哈希鏈驗證異常，請檢查紀錄完整性',
    'modal.provenance.originatorLabel': '首發創意人',
    'modal.provenance.timestampLabel': '公證時間 (UTC)',
    'modal.provenance.coBuildersLabel': '共建開發者',
    'modal.provenance.ideaHashLabel': 'SHA-256 創意首發指紋 (ideaHash)',
    'modal.provenance.prevHashLabel': '前序鏈雜湊 (prevIdeaHash)',
    'modal.provenance.copyHashBtn': '📋 複製指紋',
    'modal.provenance.calcTitle': '⚖️ 實時多勞多得分紅試算表（5% 首發版稅 / 85% 實幹池 / 10% 平臺）',
    'modal.provenance.calcRevLabel': '假設項目總營收（USD）：',
    'modal.provenance.calcWorkLabel': '假設你的實幹貢獻佔比：',
    'modal.provenance.calcOriginatorCheck': '我是首發創意人（疊加 5% 永久版稅）',
    'modal.provenance.calcRowSpark': '💡 首發創意永久版稅 (5%)',
    'modal.provenance.calcRowMerit': '⚡ 實幹建設多勞多得池 (85%)',
    'modal.provenance.calcRowPlatform': '🛡️ 平臺公證運營 (10%)',
    'modal.provenance.calcRowYou': '🎯 你的預估實得（合計 {pct}%）',
    'modal.provenance.calcContributorsTitle': '👥 目前鏈上實幹貢獻者與預估權重',
    'modal.provenance.calcNoContributors': '尚無完工驗收紀錄，現在接單即可搶先瓜分 85% 實幹池！',
    'modal.provenance.certPreviewTitle': '🖼️ 《創意首發溯源證書 PNG》即時預覽（900×520）',
    'modal.provenance.downloadCertBtn': '⬇️ 下載創意首發證書 PNG',

    // Modal 4: Report
    'modal.report.title': '📋 AI 交付物與 Proof of Accepted Work 驗收報告',
    'modal.report.titleWithTask': '📋 交付與驗收報告：{title}',
    'modal.report.checksTitle': '🔍 三層自動化防作弊驗收結果',
    'modal.report.deliverableTitle': '📦 交付成果原文',
    'modal.report.copyBtn': '📋 複製成果',
    'modal.report.passed': '✅ 驗收通過',
    'modal.report.rejected': '❌ 驗收攔截',
    'modal.report.score': '品質評分：{score} / 100',
    'modal.report.mode': '執行模式：{mode}',
    'modal.report.noChecks': '無細項驗收紀錄',
    'modal.report.emptyContent': '（無交付內容）',

    // Modal 5: Work Certificate
    'modal.cert.title': '🪪 像素算力鎮 · 算力打工證與分紅結算單',
    'modal.cert.captionDefault': '點擊下方按鈕下載高清復古像素 PNG，附帶社群貼文文案直接發推炫耀！',
    'modal.cert.caption': '{name} · 信譽 {rep} · 已驗收 {tasks} 單 · 累計分紅與懸賞 {usd}',
    'modal.cert.copyShareBtn': '📋 複製發推炫耀文案',
    'modal.cert.downloadBtn': '⬇️ 下載打工證 PNG',
    'modal.cert.shareText': '剛把我的閒置 Gemini 額度派去《像素算力鎮 PixelCompute Town》打工啦！👾\n目前信譽 {rep}、已通過 {tasks} 張 Proof of Accepted Work 驗收、累計獲得 {usd}！\n#PixelComputeTown #IndieDev #GeminiAPI',

    // Modal 6: Auth Modal (#auth-modal)
    'auth.title': '🔐 帳號註冊與登入',
    'auth.currentStatus': '目前身份：{name}（{mode}）',
    'auth.tabLogin': '🔑 登入帳號',
    'auth.tabRegister': '✨ 免費註冊',
    'auth.emailLabel': '電子信箱',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.passwordLabel': '密碼（至少 6 字元）',
    'auth.passwordPlaceholder': '請輸入密碼',
    'auth.displayNameLabel': '顯示暱稱（選填）',
    'auth.displayNamePlaceholder': '例如：像素工程師 Alex',
    'auth.loginBtn': '🚀 立即登入',
    'auth.registerBtn': '✨ 建立獨立多用戶帳號',
    'auth.divider': '或使用快速登入方式',
    'auth.githubBtn': '🐙 GitHub 一鍵登入',
    'auth.googleBtn': '🌐 Google 一鍵登入',
    'auth.demoBtn': '🎮 遊客 Demo 模式',
    'auth.logoutBtn': '🚪 登出目前帳號',
    'auth.multiUserTip': '💡 註冊獨立帳號可保存專屬金幣、像素小人與收款錢包，同時與全鎮共享開源孵化池與排行榜！',
    'auth.modeDemo': '創始 Demo 模式',
    'auth.modeEmail': '信箱帳號',
    'auth.modeGithub': 'GitHub OAuth',
    'auth.modeGoogle': 'Google OAuth',

    // Modal 7: 3-in-1 Payment Modal (#payment-modal)
    'pay.title': '💎 三合一透明結帳中心',
    'pay.productSummary': '結帳商品：{name} · {price}',
    'pay.tabStablecoin': '💎 穩定幣 (USDC/USDT)',
    'pay.tabCard': '💳 信用卡 (Polar/Stripe)',
    'pay.tabRedeem': '🎟️ 兌換碼 (愛發電/Ko-fi)',
    'pay.chainLabel': '選擇公鏈網路',
    'pay.tokenLabel': '選擇穩定幣種',
    'pay.createOrderBtn': '🧾 產生專屬穩定幣收款訂單',
    'pay.receiverLabel': '官方金庫收款地址',
    'pay.copyAddrBtn': '📋 複製地址',
    'pay.amountLabel': '精準應付金額',
    'pay.memoLabel': '訂單備註碼',
    'pay.txHashLabel': '貼上鏈上交易雜湊（TxHash）驗證到帳',
    'pay.txHashPlaceholder': '0x...（EVM 64位 Hex）或 Solana Signature',
    'pay.verifyTxBtn': '✅ 驗證上鏈到帳',
    'pay.simTxBtn': '⚡ 沙盒模擬上鏈支付',
    'pay.cardDesc': '支援 Polar.sh 與 Stripe 國際信用卡／Apple Pay 安全結帳；本機未設定真實金鑰時提供一鍵沙盒刷卡體驗。',
    'pay.polarBtn': '❄️ 使用 Polar.sh 結帳',
    'pay.stripeBtn': '💳 使用 Stripe 結帳',
    'pay.sandboxCardReady': '已建立沙盒信用卡訂單 {orderId}（{provider} · {amount}），點擊下方按鈕即可模擬刷卡入帳：',
    'pay.sandboxCompleteBtn': '⚡ 模擬刷卡完成結帳',
    'pay.redeemDesc': '在愛發電 / Ko-fi / Gumroad 贊助取得的卡密兌換碼，可於此一鍵兌換入帳！',
    'pay.redeemHint': '🎁 內建測試體驗碼：PIXEL-PRO-2026（Pro 會員）｜PIXEL-PACK-2026（創世禮包）｜PIXEL-GOLD-500（500 金幣）',
    'pay.redeemCodeLabel': '輸入卡密兌換碼',
    'pay.redeemCodePlaceholder': '例如：PIXEL-PRO-2026',
    'pay.redeemBtn': '🎟️ 立即兌換',

    // Toasts & Confirmations
    'toast.copied': '已複製到剪貼簿！',
    'toast.resetConfirm': '確定要重置像素算力鎮示範世界？所有測試任務、進度與帳本將回到初始創世狀態。',
    'toast.resetDone': '🔄 示範世界已重置回創世初始狀態！',
    'toast.resetFailed': '重置失敗：{err}',
    'toast.langSwitched': '🌐 已切換介面語系為：繁體中文',
    'toast.achievement': '🏆 成就解鎖：【{title}】{bonus}',
    'toast.certExported': '🪪 已匯出《像素算力打工證 PNG》，快去發推炫耀吧！',
    'toast.shareCopied': '📋 已複製炫耀貼文，快配上打工證 PNG 發推吧！',
    'toast.soundOn': '🔊 已開啟 8-bit 復古音效',
    'toast.soundOff': '🔇 已靜音',
    'toast.needApiWorker': '請先選擇或招募一位 API 軌道小人！',
    'toast.workerBusy': '該小人正在瀏覽器端執行模型呼叫中，請稍候...',
    'toast.dispatched': '🚀 【{worker}】已進駐自動工坊（{mode}）...',
    'toast.byokSimEngine': '免金鑰擬真引擎',
    'toast.byokFailedReleased': '{err}（已自動釋放任務與小人，修正後可重試）',
    'toast.taskPassed': '✅ 驗收通過（{score}分）！+{gold}G、+{pts} 貢獻點{bounty}',
    'toast.bountyNetNote': '、懸賞實得 ${net}',
    'toast.bountyNetFeeNote': '、懸賞實得 ${net}（10% 服務費 ${fee}）',
    'toast.antiCheatFailed': '🛡️ 防作弊驗收未通過：{reason}',
    'toast.dispatchFailed': '派工失敗：{err}',
    'toast.autopilotOn': '🤖 自動掛機（Auto-Pilot）已啟動！將自動幫閒置 API 小人接單並跑完驗收。',
    'toast.autopilotOff': '⏹️ 已暫停自動掛機模式。',
    'toast.needGuildWorker': '請先選擇或招募一位月/週額度軌道小人！',
    'toast.guildClaimed': '⚔️ 【{worker}】已撕下懸賞令並就座工會工作台！',
    'toast.claimFailed': '無法接單：{err}',
    'toast.simCliDone': '⚡ 本機 CLI 模擬執行完成並已直播心跳至像素小鎮！請確認內容後點擊「提交成果並驗收結算」。',
    'toast.simCliFailed': '模擬 CLI 心跳失敗：{err}',
    'toast.needGuildContent': '請先貼上交付內容或 GitHub PR 連結（或點擊「模擬本機 CLI 交付」體驗）！',
    'toast.guildPassed': '✅ 工會大單驗收通過（{score}分）！+{gold}G、+{pts} 貢獻點{bounty}',
    'toast.guildIntercepted': '🛡️ 防作弊攔截：{reason}',
    'toast.submitFailed': '提交驗收失敗：{err}',
    'toast.byokTesting': '⏳ 正在由瀏覽器直連模型端點進行測試...',
    'toast.byokSaved': '💾 BYOK 設定已安全儲存於你的本機瀏覽器（絕不上傳伺服器）！',
    'toast.byokCleared': '🗑️ 已清除瀏覽器內儲存的 API Key，切換回免金鑰擬真體驗模式。',
    'toast.cliCopied': '📋 已複製本機 CLI 指令！',
    'toast.contextPackCopied': '📋 已複製標準化 Context Pack，直接貼給 Gemini CLI / Claude Code 即可！',
    'toast.pixelWorkerCopied': '📋 已複製 pixel-worker 本機同步指令！',
    'toast.prNeedUrl': '請先輸入 GitHub PR 網址。',
    'toast.prChecking': '🔍 正在驗證 GitHub PR 格式與狀態...',
    'toast.prValid': '✅ 格式合法：{owner}/{repo} #{num}{note}',
    'toast.reportCopied': '📋 已複製交付成果原文！',
    'toast.proposed': '💡 新項目《{name}》已上牆開放社群投票！',
    'toast.proposeFailed': '提案失敗：{err}',
    'toast.recruited': '👾 成功招募新小人【{name}】進駐小鎮！',
    'toast.recruitFailed': '招募失敗：{err}',
    'toast.ghImporting': '⏳ 正在向 GitHub Issues API 匯入公開倉庫任務...',
    'toast.ghImported': '✅ 已從 {repo} 匯入 {count} 張任務卡至《{project}》{mode}',
    'toast.ghModeReal': '（真實 GitHub Issue）',
    'toast.ghModeFallback': '（離線預覽：{reason}）',
    'toast.ghImportFailed': 'GitHub 匯入失敗：{err}',
    'toast.voteUnlocked': '🎉 《{name}》票數達標破土動工！已自動生成 5 張雙軌任務！',
    'toast.voteOk': '🗳️ 投票成功！《{name}》目前 {votes}/{req} 票',
    'toast.billboardOk': '📺 已為《{name}》點亮像素廣場霓虹廣告牌（+${fee} 平臺廣告收入）！',
    'toast.launchOk': '🎆 《{name}》正式上線！首日營收 ${gross} 分紅入帳：你實得 ${share}，平臺 Carry ${carry}！',
    'toast.simRevOk': '💸 《{name}》新增 ${gross} 營收！你分得 +${share}，平臺 10% Carry +${carry}！',
    'toast.coffeeOk': '☕ 【{name}】喝完像素特調咖啡，體力與今日額度已回復！',
    'toast.capSaved': '🔧 已更新【{name}】每日安全額度上限為 {cap}',
    'toast.shopBought': '🛍️ 購買成功：「{name}」！',
    'toast.skinChanged': '✨ 【{worker}】已換上「{skin}」！',
    'toast.serverError': '無法連線至像素算力鎮伺服器：{err}',
    'toast.authLoginOk': '🔑 登入成功！歡迎回來，{name}！',
    'toast.authRegisterOk': '🎉 帳號註冊成功！歡迎加入像素算力鎮，{name}！',
    'toast.authDemoOk': '🎮 已切換為創始鎮長 Demo 模式！',
    'toast.authLogoutOk': '🚪 已登出並切回創始鎮長 Demo 模式',
    'toast.authGoogleUnconfigured': 'ℹ️ 本機尚未設定 Google OAuth 金鑰，請先使用信箱註冊或 Demo 模式。',
    'toast.authGithubOk': '🐙 GitHub 登入成功！歡迎回來，{name}！',
    'toast.authGoogleOk': '🌐 Google 登入成功！歡迎回來，{name}！',
    'toast.payOrderCreated': '🧾 穩定幣收款訂單已建立，請轉帳後貼上 TxHash 或點沙盒模擬！',
    'toast.payConfirmed': '🎉 付款確認成功！商品已自動開通入帳！',
    'toast.payRedeemOk': '🎟️ 兌換碼成功入帳！{detail}',
    'toast.walletBound': '🔗 穩定幣收款錢包已綁定（{chain}）！',
    'toast.payoutCreated': '💸 已提交 ${amount} 穩定幣提領申請！',
    'toast.payoutPaid': '✅ 提領單已標記出款（TxHash 已記錄）！',
    'toast.adminStrictChanged': '🛡️ 嚴格裝置審核模式已切換為：{state}',
    'toast.adminDeviceReviewed': '🛡️ 裝置 {code} 已{action}！',
    'toast.adminCodesGenerated': '🎟️ 已成功生成 {count} 組全新卡密兌換碼！',
    'toast.joinedProject': '🤝 已加入《{name}》共建行列！目前共 {count} 位共建者',
    'toast.alreadyJoined': '✓ 你已經是《{name}》的共建開發者了！',
    'toast.ideaCertExported': '📜 已匯出《{name}》創意首發溯源證書 PNG！',
    'toast.copycatBlocked': '🛡️ 偵測到與既有原創創意《{name}》高度相似（{pct}%），建議直接加入原創意共建！',
    'toast.hashCopied': '🔐 已複製完整 SHA-256 創意溯源指紋！',

    // Anti-Dilution Governance & Peer Review Queue
    'review.panelTitle': '⚖️ 實幹審閱佇列（防垃圾 AI 過濾站）',
    'review.pendingBadge': '{count} 筆待審',
    'review.refreshBtn': '🔄 刷新佇列',
    'review.panelDesc': '實幹者與維護者擁有合併否決權：核准優質 PR 領 <strong>+15G</strong> 審閱獎，揪出並駁回垃圾 AI 注水可直接<strong>沒收對方押金歸自己</strong>！',
    'review.empty': '目前沒有待審閱的提交，所有佇列均已清空！',
    'review.historyTitle': '📜 近期審閱裁決紀錄',
    'review.submitterPrefix': '👤 提交者：{name}',
    'review.stakeBadge': '🔒 {stake} G 押金',
    'review.aiScoreGood': '🤖 AI 盲審 {score}/100 優質',
    'review.aiScoreMed': '🤖 AI 盲審 {score}/100 需複查',
    'review.aiScoreSlop': '🤖 AI 盲審 {score}/100 ⚠️ 垃圾 AI 注水警告',
    'review.diffBloat': '{bloat}% 注水',
    'review.previewSummary': '🔍 展開檢視提交內容預覽',
    'review.approveBtn': '✅ 批准合併 (+15G)',
    'review.rejectBtn': '🚫 駁回垃圾 (沒收押金)',
    'review.rejectBtnWithStake': '🚫 駁回垃圾 (沒收 {stake}G 押金)',
    'review.historyApproved': '✅ 已核准合併',
    'review.historyRejected': '🚫 已駁回垃圾',
    'review.historyReward': '+{gold}G 審閱獎',
    'review.historySlashed': '沒收 +{stake}G 押金',
    'review.jumpToQueue': '⚖️ 前往審閱佇列',
    'gov.bucketCore': '🔥 核心池 70%',
    'gov.bucketPeripheral': '⚙️ 週邊池 ≤30%',
    'gov.stakeTag': '🔒 押金 {gold}G',
    'gov.minRepTag': '🛡️ 信譽 ≥ {rep}',
    'gov.quotaHeader': '🛡️ 防稀釋配額條（85% 實幹池內強制分桶隔離）',
    'gov.quotaProofHint': '週邊刷單封頂 ≤30%，絕不稀釋核心實幹',
    'gov.coreBarLabel': '🔥 核心實幹池 {cap}% ({pts} pt)',
    'gov.periphBarLabel': '⚙️ 週邊微任務池 ≤{cap}% ({pts} pt)',
    'badge.guildPendingReview': '⚖️ 待實幹審閱',
    'modal.guild.submitForReview': '⚖️ 提交至雙階段實幹審閱佇列（標準防刷流程）',
    'modal.guild.submitForReviewEnforced': '⚖️ 全局強制雙階段實幹審閱已啟用（送出後自動進入佇列）',
    'workers.cooldownBadge': '⏳ 反刷單冷卻中 ({sec}s)',
    'workers.strikesBadge': '⚠️ 垃圾警示 {strikes}/2',
    'admin.peerReviewTitle': '⚖️ 全局強制雙階段實幹審閱（Peer Review Required）',
    'admin.peerReviewDesc': '開啟後，所有工會大單通過機器硬門檻後將自動進入實幹審閱佇列，須由實幹者或維護者核准才合併結算。',
    'admin.peerReviewOn': '⚖️ 強制審閱 ON',
    'admin.peerReviewOff': '⚡ 自選審閱',
    'toast.reviewApproved': '✅ 已批准合併優質 PR！獲得 +{gold}G 審閱獎勵與 +{pts} 貢獻點！',
    'toast.reviewRejected': '🚫 已攔截垃圾 AI 刷單！沒收 {stake}G 押金入帳！',
    'toast.reviewRejectedNoStake': '🚫 已攔截並駁回垃圾 AI 提交！對方 0 貢獻並扣信譽分！',
    'toast.reviewDecideFailed': '審閱操作失敗：{err}',
    'toast.reviewRefreshed': '🔄 已同步最新實幹審閱佇列',
    'toast.guildQueuedForReview': '⚖️ 已過機器硬門檻！進入實幹審閱佇列（AI 盲審 {score}/100），可立即在上方審閱合併！',
    'toast.adminPeerReviewChanged': '⚖️ 全局強制實幹審閱已切換為：{state}',
  },

  'zh-CN': {
    // Page & Brand
    'page.title': '像素算力镇 PixelCompute Town — 闲置算力双轨打工与开源孵化平台',
    'brand.name': '像素算力镇',
    'brand.sub': 'PixelCompute Town · BYOK + BYOT 双轨孵化',

    // HUD
    'hud.goldTitle': '小镇金币余额（可用于商店装扮与小人咖啡）',
    'hud.usdTitle': '累计悬赏实得与项目分红收益（USD）',
    'hud.repTitle': '验收信誉分（防刷单 Proof of Accepted Work）',
    'hud.byokTitle': '点击设置浏览器端 BYOK 密钥（绝不传给服务器）',
    'hud.repPrefix': '信誉',
    'hud.byokDemo': 'BYOK：拟真体验',
    'hud.byokLive': 'BYOK：{model}',
    'hud.homeBtn': '🏠 官网',
    'hud.installBtn': '📦 安装小人',
    'hud.userTitle': '点击打开账号登录、注册与切换',
    'hud.githubLogin': 'GitHub 登录',
    'hud.logout': '退出登录',
    'hud.certBtn': '🪪 打工证',
    'hud.settingsBtn': '⚙️ 设置',
    'hud.dayNightTitle': '切换赛博暖夜 / 清晨白天模式',
    'hud.soundTitle': '切换 8-bit 复古音效',

    // Stage & Scenes
    'stage.quickNav': 'HD 场景：',
    'stage.navFactory': '🏭 自动工坊',
    'stage.navGuild': '⚔️ 悬赏工会',
    'stage.navLaunchpad': '🚀 孵化中心',
    'stage.navLounge': '☕ 算力宿舍',
    'stage.navVault': '💰 创作者金库',
    'stage.navTown': '🗺️ 小镇总览',
    'stage.autoFollow': '🔗 自动跟随分页',
    'stage.autoFollowTitle': '切换右侧 5 大分页时，左侧画布自动无缝切进专属 HD 室内场景',
    'stage.hintDefault': '点击建筑或像素小人可快速切换对应控制台',
    'stage.hintFactory': '🏭 自动工坊超算中心：实时观看 API 轨道小人双屏幕敲码与进度条',
    'stage.hintGuild': '⚔️ 悬赏工会大厅：点击布告栏卷轴或观看本机 CLI 匠人实时心跳',
    'stage.hintLaunchpad': '🚀 孵化指挥中心：观察全息建筑随进度进化，100% 上线点燃烟火！',
    'stage.hintLounge': '☕ 算力宿舍生活馆：小人喝咖啡回体力、换穿皮肤与点亮成就奖杯柜',
    'stage.hintVault': '💰 创作者金库大厅：实时分红营收柱、闪耀金币山与 Top 3 冠军领奖台',
    'stage.hintTown': '🗺️ 小镇全景地图：点击任意建筑直接切入该建筑专属 HD 室内场景',
    'stage.syncOn': '🔗 已开启「自动跟随分页」：切换右侧分页将同步切换左侧 HD 场景',
    'stage.syncOff': '📌 已锁定当前场景：切换右侧分页将保留当前 HD 画布视角',
    'stage.sseConnecting': 'SSE 连接中',
    'stage.sseLive': 'SSE 实时在线',
    'stage.sseOffline': 'SSE 重连中...',
    'stage.marqueeDefault': '像素算力镇运行中！欢迎把闲置算力派上场！',
    'stage.loadingWorkers': '正在同步算力小人状态...',
    'stage.stripSummary': '开工中 {working}/{total} ｜ 可接任务 {open} 张',
    'stage.workerHint': '👾 【{name}】Lv.{level} · 体力 {stamina}/{maxStamina} · {msg}',
    'stage.taskSelectedHint': '🏭 已选取任务：{title}',
    'stage.cliHint': '💻 [CLI] {name}：{msg}{pct}',
    'stage.idleFallback': '待命中',

    // Terminal Feed
    'terminal.title': '小镇实时动态终端（含 AI 交付与本机 CLI 心跳）',
    'terminal.filterAll': '全部',
    'terminal.filterDeliverable': '交付',
    'terminal.filterRevenue': '分红',
    'terminal.filterCli': 'CLI',
    'terminal.waiting': '等待小镇事件写入...',
    'terminal.empty': '此分类暂无小镇动态，派一位小人上工试试吧！',
    'terminal.inspectBtn': '🔍 查看完整交付与验收报告',

    // Tabs
    'tab.factory': '自动工坊',
    'tab.guild': '悬赏工会',
    'tab.incubator': '孵化广场',
    'tab.workers': '小人商店',
    'tab.revenue': '创作者收益',

    // Onboarding
    'onboarding.title': '🧭 创始镇长 3 步快速体验',
    'onboarding.step1': '1. 派小人完成首单并通过验收',
    'onboarding.step2': '2. 帮 PixelPomo 投满票破土立项',
    'onboarding.step3': '3. 项目上线分红或导出打工证',
    'onboarding.collapse': '收起引导',
    'onboarding.expand': '展开 3 步引导',
    'onboarding.allDone': '🎉 全部完成！你已掌握双轨协作与透明分红闭环',

    // Factory Tab
    'factory.banner': '⚡ <strong>API 轨道（BYOK 零信任）</strong>：支持浏览器直连 Gemini API / OpenAI 兼容端点，未填 Key 亦可免门槛拟真体验！',
    'factory.keyBtn': '🔑 设置 API Key',
    'factory.allProjects': '全部项目',
    'factory.allStatus': '全部状态',
    'factory.statusOpen': '可接单',
    'factory.statusCompleted': '已验收',
    'factory.autopilot': '🤖 自动挂机',
    'factory.autopilotTitle': '每 6 秒自动为闲置 API 小人接单并执行验收',
    'factory.dispatch': '🚀 一键派工执行',
    'factory.working': '⚡ 小人赶工中...',
    'factory.inspect': '📋 查看 AI 交卷与验收报告',
    'factory.loading': '加载工坊任务中...',
    'factory.empty': '当前没有符合筛选条件的 API 任务。快去「孵化广场」帮 PixelPomo 投票解锁新任务吧！',
    'factory.workerBusyTag': '赶工中',
    'factory.workerDoneTag': '交付',
    'factory.netSuffix': '实得',
    'factory.noTrackWorker': '暂无对应轨道小人',
    'factory.workerWorkingSuffix': ' [工作中]',

    // Guild Tab
    'guild.banner': '⚔️ <strong>月／周订阅额度轨道（BYOT 合规）</strong>：接单后复制标准化 Context Pack 给本机 Gemini CLI / Claude Code / Codex，或运行 <code class="mono">pixel-worker</code> 实时直播小人干活！',
    'guild.workerLabel': '派驻工会小人：',
    'guild.importTitle': '🔗 从 GitHub 公开仓库导入真实 Issue 为悬赏任务',
    'guild.importPlaceholder': '输入 owner/repo 或完整 GitHub 网址（例：vercel/next.js）',
    'guild.importBtn': '📥 导入 Issue',
    'guild.importTrackGuild': '悬赏工会 (BYOT)',
    'guild.importTrackApi': '自动工坊 (API)',
    'guild.importAutoProj': '自动创建对应项目',
    'guild.claimOpen': '⚔️ 撕下悬赏令 / 打开工作台',
    'guild.claimResume': '🛠️ 打开工作台提交成果',
    'guild.loading': '加载工会悬赏中...',
    'guild.empty': '暂无工会大单，前往孵化广场投票解锁新项目可自动生成高价值悬赏！',
    'guild.workerBusyTag': '接单处理中',
    'guild.workerDoneTag': '结案',
    'guild.poolBadge': '🚀 5/85/10 多劳多得分红池',
    'guild.bountyNetFee': '💰 ${gross} (实得 ${net} / 服务费 ${fee})',

    // Incubator Tab
    'incubator.summaryDefault': 'SHA-256 创意溯源 → 双轨共建 → 透明多劳多得（5% 首发创意版税 / 85% 实干多劳多得 / 10% 平台）',
    'incubator.summary': '投票中 {voting} ｜ 建设中 {building} ｜ 已上线 {launched} ｜ 5/85/10 多劳多得协议',
    'incubator.proposeBtn': '＋ 我要提案新项目',
    'incubator.jumpImport': '🔗 导入 GitHub Issue',
    'incubator.loading': '加载孵化项目中...',
    'incubator.sponsoredBadge': '📺 霓虹广告置顶',
    'incubator.statusVoting': '🗳️ 投票中 ({votes}/{req})',
    'incubator.statusLaunched': '🚀 已发布上线',
    'incubator.statusBuilding': '🏗️ 建设中 {pct}%',
    'incubator.creatorPrefix': '👤 发起人：{name}',
    'incubator.originatorPrefix': '💡 首发创意人：{name}',
    'incubator.coBuildersCount': '🤝 {count} 人共建',
    'incubator.hashVerifyTitle': '点击验证完整 SHA-256 溯源链与下载首发证书',
    'incubator.splitSpark': '5% 创意版税',
    'incubator.splitMerit': '85% 实干多劳多得',
    'incubator.splitPlatform': '10% 平台',
    'incubator.joinBtn': '🤝 加入共建',
    'incubator.joinedBtn': '✓ 已加入共建',
    'incubator.certBtn': '📜 溯源证书',
    'incubator.poolTag': '📊 分红协议 5/85/10',
    'incubator.myPoints': '✨ 你持有 {pts} 贡献点（约占 85% 实干池 {pct}%）',
    'incubator.myPointsSpark': '✨ 你持有 {pts} 贡献点（估总份额 {pct}%｜含 5% 首发版税）',
    'incubator.bountyPool': '💰 现金悬赏池 ${amount}',
    'incubator.totalRev': '💵 累计产品营收 {amount}',
    'incubator.voteProgress': '立项投票进度（还差 {left} 票自动破土并生成 5 张双轨任务！）',
    'incubator.voteCount': '{votes} / {req} 票',
    'incubator.progressLaunched': '已上线运营中 · 持续分红',
    'incubator.progressReady': '🎉 已达 100%！可立即发布上线并结算首日分红！',
    'incubator.progressBuilding': '双轨算力开发进度',
    'incubator.billboardActive': '✨ 广场霓虹看板曝光中',
    'incubator.billboardBtn': '📺 租用像素霓虹广告位 (${price})',

    // Workers & Shop Tab
    'workers.myWorkers': '🤖 我的算力小人（管理体力上限与装扮）',
    'workers.loading': '加载算力小人中...',
    'workers.achievements': '🏆 创始成就墙（自动解锁领金币＋印上打工证）',
    'workers.achievementsLoading': '加载创始成就中...',
    'workers.achievementsEmpty': '暂无创始成就数据。',
    'workers.achUnlocked': '✓ 已解锁',
    'workers.recruitTitle': '✨ 招募新算力小人（4 大职业任选）',
    'workers.recruitNameLabel': '小人代号 / 名称',
    'workers.recruitNamePlaceholder': '例如：霓虹画师阿咪',
    'workers.recruitRoleLabel': '职业与轨道',
    'workers.roleOptFlash': '⚡ 闪电工程师（API 轨道）',
    'workers.roleOptArtist': '🎨 像素美术师（API 轨道）',
    'workers.roleOptPro': '🧠 首席架构师（月/周额度工会）',
    'workers.roleOptArtisan': '🔨 工会匠人（月/周额度工会）',
    'workers.recruitProviderLabel': '算力来源标签',
    'workers.recruitCapLabel': '每日体力上限（Token / 次数）',
    'workers.recruitBtn': '＋ 招募并进驻小镇',
    'workers.shopTitle': '🛍️ 像素外观、机房装潢与 Pro 会员商店',
    'workers.shopLoading': '加载商店品项中...',
    'workers.shopBundleTag': '3 款 HD 皮肤全收录',
    'workers.shopPreviewTitle': 'HD 皮肤试穿预览',
    'workers.shopBundleTitle': '内含全部限定皮肤预览',
    'workers.certTitle': '🪪 像素风《算力打工证 PNG》分享卡',
    'workers.certDesc': '一键生成专属复古像素证件，展示你的信誉分、完工数、成就徽章与项目持仓分红，发帖炫耀超吸睛！',
    'workers.previewCert': '👁️ 预览打工证 PNG',
    'workers.downloadCert': '⬇️ 直接下载 PNG',
    'workers.statusWorking': '⚡ 赶工中',
    'workers.statusIdle': '☕ 待命中',
    'workers.staminaLine': '体力值 {stamina} / {maxStamina} ｜ 今日额度 {used} / {cap} {unit}',
    'workers.unitTokens': 'tokens',
    'workers.unitQuota': '次/日',
    'workers.trackLine': '轨道：{track}',
    'workers.trackApi': '自动工坊 (API)',
    'workers.trackGuild': '悬赏工会 (BYOT)',
    'workers.completedLine': '完工：{count} 单',
    'workers.earnedLine': '累积：{gold}G / {pts} 贡献',
    'workers.dailyCapLabel': '每日上限：',

    // Revenue, Payouts & Mayor Admin Tab
    'revenue.totalLabel': '创作者平台累计总变现（USD）',
    'revenue.transparentBadge': '透明账本实时结算',
    'revenue.resetBtn': '🔄 重置示范世界',
    'revenue.kpiBounty': '⚔️ 现金悬赏 10% 托管抽成',
    'revenue.kpiBountySub': '每笔现金悬赏验收自动结算',
    'revenue.kpiCarry': '🚀 孵化分红池 10% Carry',
    'revenue.kpiCarrySub': '项目上线与后续营收自动入账',
    'revenue.kpiAds': '📺 像素广场霓虹广告位',
    'revenue.kpiAdsSub': '$29/位 · 同步点亮小镇霓虹招牌',
    'revenue.kpiPro': '✨ 像素皮肤与 Pro 会员',
    'revenue.kpiProSub': '纯外观与效率加成，绝不卖战力',
    'revenue.historyTitle': '📒 平台营收流水记录',
    'revenue.historyEmpty': '暂无营收流水，快去验收悬赏、租用广告位或发布项目吧！',
    'revenue.leaderboardTitle': '🏆 全镇创始贡献排行榜',
    'revenue.leaderboardLoading': '加载排行榜中...',
    'revenue.lbPoints': '{pts} 贡献',
    'revenue.lbRep': '信誉 {rep}',

    // Stablecoin Payout Section
    'payout.sectionTitle': '💸 稳定币分红提现（USDC / USDT）',
    'payout.balanceBadge': '可提现余额：{amount}',
    'payout.walletChainLabel': '收款公链',
    'payout.walletAddressLabel': '个人收款钱包地址（EVM 0x... 或 Solana）',
    'payout.walletPlaceholder': '0x... 或 Solana 钱包地址',
    'payout.bindBtn': '🔗 绑定收款钱包',
    'payout.boundStatus': '已绑定钱包（{chain}）：{address}',
    'payout.unboundStatus': '尚未绑定稳定币收款钱包，绑定后满 $5 即可提现分红与悬赏收益。',
    'payout.amountLabel': '提现金额（USD，最低 $5）',
    'payout.tokenLabel': '提现币种',
    'payout.requestBtn': '💸 申请稳定币提现',
    'payout.instantBtn': '⚡ 沙盒即时出款',
    'payout.historyTitle': '提现记录',
    'payout.historyEmpty': '暂无稳定币提现记录。',
    'payout.statusPaid': '✅ 已发放',
    'payout.statusPending': '⏳ 待出款',
    'payout.markPaidBtn': '✅ 标记已出款',

    // Mayor Admin Section
    'admin.sectionTitle': '🛡️ 镇长管理面板（设备审核与卡密生成）',
    'admin.toggleLabel': '显示 / 收起管理区',
    'admin.strictTitle': '严格设备审核模式（防刷保护）',
    'admin.strictDesc': '开启后，新设备通过 /onboard 核准将进入待审核列表，需镇长手动放行。',
    'admin.strictOn': '🔒 严格审核 ON',
    'admin.strictOff': '🔓 自动放行',
    'admin.devicesTitle': '待审核与已绑定设备列表',
    'admin.devicesEmpty': '当前没有待审核设备。',
    'admin.approveBtn': '✅ 核准',
    'admin.rejectBtn': '✕ 拒绝',
    'admin.devicePending': '⏳ 待审核',
    'admin.deviceApproved': '✅ 已核准',
    'admin.deviceRejected': '✕ 已拒绝',
    'admin.codesTitle': '🎟️ 卡密兑换码生成器（爱发电 / Ko-fi / Gumroad 售卖用）',
    'admin.codeRewardLabel': '奖励类型',
    'admin.codeRewardPro': '💎 Pro 通行证（$9）',
    'admin.codeRewardPack': '🎁 创始限定外观大礼包（$15）',
    'admin.codeRewardGold': '🪙 500 金币礼包',
    'admin.codeRewardBillboard': '📺 霓虹广告兑换券',
    'admin.codeCountLabel': '数量',
    'admin.codeNoteLabel': '备注（选填）',
    'admin.codeNotePlaceholder': '例如：爱发电 11 月赞助批次',
    'admin.generateCodeBtn': '⚡ 一键生成卡密',
    'admin.codesEmpty': '尚未生成卡密。',
    'admin.codeUsed': '已兑换',
    'admin.codeUnused': '可使用',
    'admin.copyCodeBtn': '📋 复制',

    // Badges & Common Buttons
    'badge.open': '🟡 可派工',
    'badge.working': '⚡ 执行中',
    'badge.completed': '✅ 已验收',
    'badge.guildOpen': '📜 悬赏开放',
    'badge.guildWorking': '⚔️ 接单进行中',
    'badge.guildCompleted': '✅ 已结案',
    'badge.owned': '✓ 已拥有',
    'btn.buy': '购买',
    'btn.checkout': '💎 结账购买',
    'btn.close': '✕ 关闭',
    'btn.closeSimple': '关闭',
    'btn.cancel': '取消',
    'btn.copy': '📋 复制',
    'btn.vote': '🗳️ 投赞成票 (+1)',
    'btn.billboard': '📺 租用像素霓虹广告位 ($29)',
    'btn.launch': '🚀 一键发布上线！（触发 $200 首日分红）',
    'btn.simRevenue': '💸 模拟产生 $100 营收并分红',
    'btn.coffee': '☕ 喝咖啡回体力',
    'btn.saveCap': '保存上限',

    // Modal 1: BYOK Settings
    'modal.settings.title': '⚙️ BYOK 零信任密钥与本机 CLI 设置',
    'modal.settings.callout': '🔒 <strong>零信任安全承诺</strong>：你的 API Key <strong>只存储在你本机浏览器的 localStorage</strong>，并由浏览器直接调用 Gemini / OpenAI 兼容端点，<strong>绝不传送到像素算力镇服务器</strong>。未填 Key 时可免门槛使用高品质拟真体验模式。',
    'modal.settings.providerLabel': '模型接口协议',
    'modal.settings.providerGemini': 'Google Gemini API（一等公民 · 浏览器直连）',
    'modal.settings.providerOpenai': 'OpenAI 兼容 Endpoint（OpenRouter / DeepSeek / Ollama）',
    'modal.settings.presetsLabel': '快速选择预设模型',
    'modal.settings.presetsPlaceholder': '-- 选择推荐模型 --',
    'modal.settings.modelLabel': '模型名称（可自定义输入）',
    'modal.settings.baseUrlLabel': 'OpenAI 兼容 Base URL',
    'modal.settings.baseUrlPlaceholder': 'https://openrouter.ai/api/v1 或 http://localhost:11434/v1',
    'modal.settings.apiKeyLabel': 'API Key（留空即使用免密钥拟真体验模式）',
    'modal.settings.apiKeyPlaceholder': 'AIzaSy... 或 sk-...',
    'modal.settings.maxTokensLabel': '单次任务最大输出 Token 上限（成本保护防爆仓）',
    'modal.settings.cliTitle': '🖥️ 本机月／周额度 CLI 桥接器（BYOT）',
    'modal.settings.cliDesc': '拥有 Gemini CLI / Claude Code / Codex 订阅？在终端执行下方指令即可把本机真实干活进度直播同步到像素小镇：',
    'modal.settings.clearBtn': '🗑️ 清除密钥',
    'modal.settings.testBtn': '🔌 测试连接',
    'modal.settings.saveBtn': '💾 保存于浏览器',

    // Modal 2: Guild Workbench
    'modal.guild.title': '⚔️ 工会悬赏接单工作台（BYOT）',
    'modal.guild.titleWithTask': '⚔️ 工会工作台：{title}',
    'modal.guild.step1': '步骤 1：复制标准化 CLI / Prompt Context Pack',
    'modal.guild.copyPack': '📋 一键复制 Context Pack',
    'modal.guild.step2': '步骤 2（可选）：在本机运行 pixel-worker 实时同步动画',
    'modal.guild.copyCmd': '📋 复制指令',
    'modal.guild.step3': '步骤 3（可选）：贴上 GitHub PR 链接并验证',
    'modal.guild.verifyPr': '🔍 验证 PR',
    'modal.guild.step4': '步骤 4：贴上本机 AI 产出成果送交 Proof of Accepted Work 验收',
    'modal.guild.simCli': '⚡ 模拟本机 CLI 交付（一键体验）',
    'modal.guild.contentPlaceholder': '贴上代码、Diff 说明、测试输出或结构化交付报告（空白或灌水将被防作弊系统拦截并扣信誉分）...',
    'modal.guild.laterBtn': '稍后提交',
    'modal.guild.submitBtn': '📤 提交成果并验收结算',
    'modal.guild.criteriaPrefix': '验收条件：',
    'modal.guild.criteriaFallback': '提供完整可验证实现代码或合法 GitHub PR 链接',
    'modal.guild.workerBadge': '👾 小人：{name}',
    'modal.guild.pointsBadge': '✨ +{pts} 贡献',
    'modal.guild.bountyBadge': '💰 悬赏 ${gross}（实得 ${net}）',

    // Modal 3: Propose Project
    'modal.propose.title': '🚀 提案新孵化项目（SHA-256 创意首发公证）',
    'modal.propose.banner': '提案上墙即刻生成 <strong>SHA-256 创意首发哈希链凭证</strong>！达标后自动破土生成双轨任务，上线营收按 <strong>5% 首发创意版税 / 85% 实干多劳多得 / 10% 平台</strong> 透明分红。',
    'modal.propose.nameLabel': '项目名称 *',
    'modal.propose.namePlaceholder': '例如：PixelMetrics（开源轻量统计看板）',
    'modal.propose.descLabel': '项目简介与愿景 *',
    'modal.propose.descPlaceholder': '用 1-2 句话说明这套产品要解决什么痛点、目标用户是谁...',
    'modal.propose.catLabel': '产品类型',
    'modal.propose.catDevtools': '开发者工具',
    'modal.propose.catSaas': '独立 SaaS',
    'modal.propose.catPlugin': '开源插件',
    'modal.propose.catGame': '像素互动工具',
    'modal.propose.bountyLabel': '初期现金悬赏预算（USD，可填 0）',
    'modal.propose.repoLabel': 'GitHub 仓库链接（选填）',
    'modal.propose.submitBtn': '🚀 送出提案并铸造首发指纹',
    'modal.propose.copycatHighTitle': '🛡️ 反抄袭检测警告：发现高度雷同的原创创意（相似度 {pct}%）！',
    'modal.propose.copycatWarnTitle': '⚠️ 灵感查重提示：已有相似原创创意（相似度 {pct}%）',
    'modal.propose.copycatMeta': '原创首发者：{originator} ｜ 公证时间：{time} ｜ 指纹：#{hash}',
    'modal.propose.copycatDesc': '像素算力镇反对抄袭复制蒸馏——与其重复造轮子，不如直接加入原创意共建，靠实干拿走 85% 多劳多得分红池大头！',
    'modal.propose.copycatJoinBtn': '🤝 尊重原创：直接加入该创意共建',
    'modal.propose.copycatClean': '✅ 实时反抄袭查重通过：未发现高度雷同提案，送出即铸造首发 SHA-256 证书！',
    'modal.propose.derivativeAck': '我确认此为差异化延伸灵感，并愿标记致敬来源指纹',

    // Modal 8: Provenance & Merit Calculator (#provenance-modal)
    'modal.provenance.title': '📜 创意首发溯源凭证 & 多劳多得分红试算',
    'modal.provenance.chainVerifying': '⏳ 正在向小镇节点验证 SHA-256 哈希链...',
    'modal.provenance.chainValid': '✅ SHA-256 哈希链验证通过（区块 #{idx} · 全链 {len} 笔原创公证无篡改）',
    'modal.provenance.chainInvalid': '⚠️ 哈希链验证异常，请检查记录完整性',
    'modal.provenance.originatorLabel': '首发创意人',
    'modal.provenance.timestampLabel': '公证时间 (UTC)',
    'modal.provenance.coBuildersLabel': '共建开发者',
    'modal.provenance.ideaHashLabel': 'SHA-256 创意首发指纹 (ideaHash)',
    'modal.provenance.prevHashLabel': '前序链哈希 (prevIdeaHash)',
    'modal.provenance.copyHashBtn': '📋 复制指纹',
    'modal.provenance.calcTitle': '⚖️ 实时多劳多得分红试算表（5% 首发版税 / 85% 实干池 / 10% 平台）',
    'modal.provenance.calcRevLabel': '假设项目总营收（USD）：',
    'modal.provenance.calcWorkLabel': '假设你的实干贡献占比：',
    'modal.provenance.calcOriginatorCheck': '我是首发创意人（叠加 5% 永久版税）',
    'modal.provenance.calcRowSpark': '💡 首发创意永久版税 (5%)',
    'modal.provenance.calcRowMerit': '⚡ 实干建设多劳多得池 (85%)',
    'modal.provenance.calcRowPlatform': '🛡️ 平台公证运营 (10%)',
    'modal.provenance.calcRowYou': '🎯 你的预估实得（合计 {pct}%）',
    'modal.provenance.calcContributorsTitle': '👥 当前链上实干贡献者与预估权重',
    'modal.provenance.calcNoContributors': '暂无完工验收记录，现在接单即可抢先瓜分 85% 实干池！',
    'modal.provenance.certPreviewTitle': '🖼️ 《创意首发溯源证书 PNG》实时预览（900×520）',
    'modal.provenance.downloadCertBtn': '⬇️ 下载创意首发证书 PNG',

    // Modal 4: Report
    'modal.report.title': '📋 AI 交付物与 Proof of Accepted Work 验收报告',
    'modal.report.titleWithTask': '📋 交付与验收报告：{title}',
    'modal.report.checksTitle': '🔍 三层自动化防作弊验收结果',
    'modal.report.deliverableTitle': '📦 交付成果原文',
    'modal.report.copyBtn': '📋 复制成果',
    'modal.report.passed': '✅ 验收通过',
    'modal.report.rejected': '❌ 验收拦截',
    'modal.report.score': '质量评分：{score} / 100',
    'modal.report.mode': '执行模式：{mode}',
    'modal.report.noChecks': '无细项验收记录',
    'modal.report.emptyContent': '（无交付内容）',

    // Modal 5: Work Certificate
    'modal.cert.title': '🪪 像素算力镇 · 算力打工证与分红结算单',
    'modal.cert.captionDefault': '点击下方按钮下载高清复古像素 PNG，附带社区贴文文案直接发帖炫耀！',
    'modal.cert.caption': '{name} · 信誉 {rep} · 已验收 {tasks} 单 · 累计分红与悬赏 {usd}',
    'modal.cert.copyShareBtn': '📋 复制发帖炫耀文案',
    'modal.cert.downloadBtn': '⬇️ 下载打工证 PNG',
    'modal.cert.shareText': '刚把我的闲置 Gemini 额度派去《像素算力镇 PixelCompute Town》打工啦！👾\n目前信誉 {rep}、已通过 {tasks} 张 Proof of Accepted Work 验收、累计获得 {usd}！\n#PixelComputeTown #IndieDev #GeminiAPI',

    // Modal 6: Auth Modal (#auth-modal)
    'auth.title': '🔐 账号注册与登录',
    'auth.currentStatus': '当前身份：{name}（{mode}）',
    'auth.tabLogin': '🔑 登录账号',
    'auth.tabRegister': '✨ 免费注册',
    'auth.emailLabel': '电子邮箱',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.passwordLabel': '密码（至少 6 字符）',
    'auth.passwordPlaceholder': '请输入密码',
    'auth.displayNameLabel': '显示昵称（选填）',
    'auth.displayNamePlaceholder': '例如：像素工程师 Alex',
    'auth.loginBtn': '🚀 立即登录',
    'auth.registerBtn': '✨ 创建独立多用户账号',
    'auth.divider': '或使用快捷登录方式',
    'auth.githubBtn': '🐙 GitHub 一键登录',
    'auth.googleBtn': '🌐 Google 一键登录',
    'auth.demoBtn': '🎮 游客 Demo 模式',
    'auth.logoutBtn': '🚪 退出当前账号',
    'auth.multiUserTip': '💡 注册独立账号可保存专属金币、像素小人与收款钱包，同时与全镇共享开源孵化池与排行榜！',
    'auth.modeDemo': '创始 Demo 模式',
    'auth.modeEmail': '邮箱账号',
    'auth.modeGithub': 'GitHub OAuth',
    'auth.modeGoogle': 'Google OAuth',

    // Modal 7: 3-in-1 Payment Modal (#payment-modal)
    'pay.title': '💎 三合一透明结账中心',
    'pay.productSummary': '结账商品：{name} · {price}',
    'pay.tabStablecoin': '💎 稳定币 (USDC/USDT)',
    'pay.tabCard': '💳 信用卡 (Polar/Stripe)',
    'pay.tabRedeem': '🎟️ 兑换码 (爱发电/Ko-fi)',
    'pay.chainLabel': '选择公链网络',
    'pay.tokenLabel': '选择稳定币种',
    'pay.createOrderBtn': '🧾 生成专属稳定币收款订单',
    'pay.receiverLabel': '官方金库收款地址',
    'pay.copyAddrBtn': '📋 复制地址',
    'pay.amountLabel': '精准应付金额',
    'pay.memoLabel': '订单备注码',
    'pay.txHashLabel': '贴上链上交易哈希（TxHash）验证到账',
    'pay.txHashPlaceholder': '0x...（EVM 64位 Hex）或 Solana Signature',
    'pay.verifyTxBtn': '✅ 验证上链到账',
    'pay.simTxBtn': '⚡ 沙盒模拟上链支付',
    'pay.cardDesc': '支持 Polar.sh 与 Stripe 国际信用卡／Apple Pay 安全结账；本机未配置真实密钥时提供一键沙盒刷卡体验。',
    'pay.polarBtn': '❄️ 使用 Polar.sh 结账',
    'pay.stripeBtn': '💳 使用 Stripe 结账',
    'pay.sandboxCardReady': '已创建沙盒信用卡订单 {orderId}（{provider} · {amount}），点击下方按钮即可模拟刷卡入账：',
    'pay.sandboxCompleteBtn': '⚡ 模拟刷卡完成结账',
    'pay.redeemDesc': '在爱发电 / Ko-fi / Gumroad 赞助获取的卡密兑换码，可在此一键兑换入账！',
    'pay.redeemHint': '🎁 内置测试体验码：PIXEL-PRO-2026（Pro 会员）｜PIXEL-PACK-2026（创始礼包）｜PIXEL-GOLD-500（500 金币）',
    'pay.redeemCodeLabel': '输入卡密兑换码',
    'pay.redeemCodePlaceholder': '例如：PIXEL-PRO-2026',
    'pay.redeemBtn': '🎟️ 立即兑换',

    // Toasts & Confirmations
    'toast.copied': '已复制到剪贴板！',
    'toast.resetConfirm': '确定要重置像素算力镇示范世界？所有测试任务、进度与账本将回到初始创始状态。',
    'toast.resetDone': '🔄 示范世界已重置回创始初始状态！',
    'toast.resetFailed': '重置失败：{err}',
    'toast.langSwitched': '🌐 已切换界面语言为：简体中文',
    'toast.achievement': '🏆 成就解锁：【{title}】{bonus}',
    'toast.certExported': '🪪 已导出《像素算力打工证 PNG》，快去发帖炫耀吧！',
    'toast.shareCopied': '📋 已复制炫耀贴文，快配上打工证 PNG 发帖吧！',
    'toast.soundOn': '🔊 已开启 8-bit 复古音效',
    'toast.soundOff': '🔇 已静音',
    'toast.needApiWorker': '请先选择或招募一位 API 轨道小人！',
    'toast.workerBusy': '该小人正在浏览器端执行模型调用中，请稍候...',
    'toast.dispatched': '🚀 【{worker}】已进驻自动工坊（{mode}）...',
    'toast.byokSimEngine': '免密钥拟真引擎',
    'toast.byokFailedReleased': '{err}（已自动释放任务与小人，修正后可重试）',
    'toast.taskPassed': '✅ 验收通过（{score}分）！+{gold}G、+{pts} 贡献点{bounty}',
    'toast.bountyNetNote': '、悬赏实得 ${net}',
    'toast.bountyNetFeeNote': '、悬赏实得 ${net}（10% 服务费 ${fee}）',
    'toast.antiCheatFailed': '🛡️ 防作弊验收未通过：{reason}',
    'toast.dispatchFailed': '派工失败：{err}',
    'toast.autopilotOn': '🤖 自动挂机（Auto-Pilot）已启动！将自动帮闲置 API 小人接单并跑完验收。',
    'toast.autopilotOff': '⏹️ 已暂停自动挂机模式。',
    'toast.needGuildWorker': '请先选择或招募一位月/周额度轨道小人！',
    'toast.guildClaimed': '⚔️ 【{worker}】已撕下悬赏令并就座工会工作台！',
    'toast.claimFailed': '无法接单：{err}',
    'toast.simCliDone': '⚡ 本机 CLI 模拟执行完成并已直播心跳至像素小镇！请确认内容后点击「提交成果并验收结算」。',
    'toast.simCliFailed': '模拟 CLI 心跳失败：{err}',
    'toast.needGuildContent': '请先贴上交付内容或 GitHub PR 链接（或点击「模拟本机 CLI 交付」体验）！',
    'toast.guildPassed': '✅ 工会大单验收通过（{score}分）！+{gold}G、+{pts} 贡献点{bounty}',
    'toast.guildIntercepted': '🛡️ 防作弊拦截：{reason}',
    'toast.submitFailed': '提交验收失败：{err}',
    'toast.byokTesting': '⏳ 正在由浏览器直连模型端点进行测试...',
    'toast.byokSaved': '💾 BYOK 设置已安全保存于你的本机浏览器（绝不上传服务器）！',
    'toast.byokCleared': '🗑️ 已清除浏览器内保存的 API Key，切换回免密钥拟真体验模式。',
    'toast.cliCopied': '📋 已复制本机 CLI 指令！',
    'toast.contextPackCopied': '📋 已复制标准化 Context Pack，直接贴给 Gemini CLI / Claude Code 即可！',
    'toast.pixelWorkerCopied': '📋 已复制 pixel-worker 本机同步指令！',
    'toast.prNeedUrl': '请先输入 GitHub PR 网址。',
    'toast.prChecking': '🔍 正在验证 GitHub PR 格式与状态...',
    'toast.prValid': '✅ 格式合法：{owner}/{repo} #{num}{note}',
    'toast.reportCopied': '📋 已复制交付成果原文！',
    'toast.proposed': '💡 新项目《{name}》已上墙开放社区投票！',
    'toast.proposeFailed': '提案失败：{err}',
    'toast.recruited': '👾 成功招募新小人【{name}】进驻小镇！',
    'toast.recruitFailed': '招募失败：{err}',
    'toast.ghImporting': '⏳ 正在向 GitHub Issues API 导入公开仓库任务...',
    'toast.ghImported': '✅ 已从 {repo} 导入 {count} 张任务卡至《{project}》{mode}',
    'toast.ghModeReal': '（真实 GitHub Issue）',
    'toast.ghModeFallback': '（离线预览：{reason}）',
    'toast.ghImportFailed': 'GitHub 导入失败：{err}',
    'toast.voteUnlocked': '🎉 《{name}》票数达标破土动工！已自动生成 5 张双轨任务！',
    'toast.voteOk': '🗳️ 投票成功！《{name}》目前 {votes}/{req} 票',
    'toast.billboardOk': '📺 已为《{name}》点亮像素广场霓虹广告牌（+${fee} 平台广告收入）！',
    'toast.launchOk': '🎆 《{name}》正式上线！首日营收 ${gross} 分红入账：你实得 ${share}，平台 Carry ${carry}！',
    'toast.simRevOk': '💸 《{name}》新增 ${gross} 营收！你分得 +${share}，平台 10% Carry +${carry}！',
    'toast.coffeeOk': '☕ 【{name}】喝完像素特调咖啡，体力与今日额度已恢复！',
    'toast.capSaved': '🔧 已更新【{name}】每日安全额度上限为 {cap}',
    'toast.shopBought': '🛍️ 购买成功：「{name}」！',
    'toast.skinChanged': '✨ 【{worker}】已换上「{skin}」！',
    'toast.serverError': '无法连接至像素算力镇服务器：{err}',
    'toast.authLoginOk': '🔑 登录成功！欢迎回来，{name}！',
    'toast.authRegisterOk': '🎉 账号注册成功！欢迎加入像素算力镇，{name}！',
    'toast.authDemoOk': '🎮 已切换为创始镇长 Demo 模式！',
    'toast.authLogoutOk': '🚪 已退出并切回创始镇长 Demo 模式',
    'toast.authGoogleUnconfigured': 'ℹ️ 本机尚未配置 Google OAuth 密钥，请先使用邮箱注册或 Demo 模式。',
    'toast.authGithubOk': '🐙 GitHub 登录成功！欢迎回来，{name}！',
    'toast.authGoogleOk': '🌐 Google 登录成功！欢迎回来，{name}！',
    'toast.payOrderCreated': '🧾 稳定币收款订单已创建，请转账后贴上 TxHash 或点沙盒模拟！',
    'toast.payConfirmed': '🎉 付款确认成功！商品已自动开通入账！',
    'toast.payRedeemOk': '🎟️ 兑换码成功入账！{detail}',
    'toast.walletBound': '🔗 稳定币收款钱包已绑定（{chain}）！',
    'toast.payoutCreated': '💸 已提交 ${amount} 稳定币提现申请！',
    'toast.payoutPaid': '✅ 提现单已标记出款（TxHash 已记录）！',
    'toast.adminStrictChanged': '🛡️ 严格设备审核模式已切换为：{state}',
    'toast.adminDeviceReviewed': '🛡️ 设备 {code} 已{action}！',
    'toast.adminCodesGenerated': '🎟️ 已成功生成 {count} 组全新卡密兑换码！',
    'toast.joinedProject': '🤝 已加入《{name}》共建行列！当前共 {count} 位共建者',
    'toast.alreadyJoined': '✓ 你已经是《{name}》的共建开发者了！',
    'toast.ideaCertExported': '📜 已导出《{name}》创意首发溯源证书 PNG！',
    'toast.copycatBlocked': '🛡️ 检测到与既有原创创意《{name}》高度相似（{pct}%），建议直接加入原创意共建！',
    'toast.hashCopied': '🔐 已复制完整 SHA-256 创意溯源指纹！',

    // Anti-Dilution Governance & Peer Review Queue
    'review.panelTitle': '⚖️ 实干审阅队列（防垃圾 AI 过滤站）',
    'review.pendingBadge': '{count} 笔待审',
    'review.refreshBtn': '🔄 刷新队列',
    'review.panelDesc': '实干者与维护者拥有合并否决权：核准优质 PR 领 <strong>+15G</strong> 审阅奖，揪出并驳回垃圾 AI 注水可直接<strong>没收对方押金归自己</strong>！',
    'review.empty': '当前没有待审阅的提交，所有队列均已清空！',
    'review.historyTitle': '📜 近期审阅裁决记录',
    'review.submitterPrefix': '👤 提交者：{name}',
    'review.stakeBadge': '🔒 {stake} G 押金',
    'review.aiScoreGood': '🤖 AI 盲审 {score}/100 优质',
    'review.aiScoreMed': '🤖 AI 盲审 {score}/100 需复查',
    'review.aiScoreSlop': '🤖 AI 盲审 {score}/100 ⚠️ 垃圾 AI 注水警告',
    'review.diffBloat': '{bloat}% 注水',
    'review.previewSummary': '🔍 展开查看提交内容预览',
    'review.approveBtn': '✅ 批准合并 (+15G)',
    'review.rejectBtn': '🚫 驳回垃圾 (没收押金)',
    'review.rejectBtnWithStake': '🚫 驳回垃圾 (没收 {stake}G 押金)',
    'review.historyApproved': '✅ 已核准合并',
    'review.historyRejected': '🚫 已驳回垃圾',
    'review.historyReward': '+{gold}G 审阅奖',
    'review.historySlashed': '没收 +{stake}G 押金',
    'review.jumpToQueue': '⚖️ 前往审阅队列',
    'gov.bucketCore': '🔥 核心池 70%',
    'gov.bucketPeripheral': '⚙️ 周边池 ≤30%',
    'gov.stakeTag': '🔒 押金 {gold}G',
    'gov.minRepTag': '🛡️ 信誉 ≥ {rep}',
    'gov.quotaHeader': '🛡️ 防稀释配额条（85% 实干池内强制分桶隔离）',
    'gov.quotaProofHint': '周边刷单封顶 ≤30%，绝不稀释核心实干',
    'gov.coreBarLabel': '🔥 核心实干池 {cap}% ({pts} pt)',
    'gov.periphBarLabel': '⚙️ 周边微任务池 ≤{cap}% ({pts} pt)',
    'badge.guildPendingReview': '⚖️ 待实干审阅',
    'modal.guild.submitForReview': '⚖️ 提交至双阶段实干审阅队列（标准防刷流程）',
    'modal.guild.submitForReviewEnforced': '⚖️ 全局强制双阶段实干审阅已启用（送出后自动进入队列）',
    'workers.cooldownBadge': '⏳ 反刷单冷却中 ({sec}s)',
    'workers.strikesBadge': '⚠️ 垃圾警示 {strikes}/2',
    'admin.peerReviewTitle': '⚖️ 全局强制双阶段实干审阅（Peer Review Required）',
    'admin.peerReviewDesc': '开启后，所有工会大单通过机器硬门槛后将自动进入实干审阅队列，须由实干者或维护者核准才合并结算。',
    'admin.peerReviewOn': '⚖️ 强制审阅 ON',
    'admin.peerReviewOff': '⚡ 自选审阅',
    'toast.reviewApproved': '✅ 已批准合并优质 PR！获得 +{gold}G 审阅奖励与 +{pts} 贡献点！',
    'toast.reviewRejected': '🚫 已拦截垃圾 AI 刷单！没收 {stake}G 押金入账！',
    'toast.reviewRejectedNoStake': '🚫 已拦截并驳回垃圾 AI 提交！对方 0 贡献并扣信誉分！',
    'toast.reviewDecideFailed': '审阅操作失败：{err}',
    'toast.reviewRefreshed': '🔄 已同步最新实干审阅队列',
    'toast.guildQueuedForReview': '⚖️ 已过机器硬门槛！进入实干审阅队列（AI 盲审 {score}/100），可立即在上方审阅合并！',
    'toast.adminPeerReviewChanged': '⚖️ 全局强制实干审阅已切换为：{state}',
  },

  en: {
    // Page & Brand
    'page.title': 'PixelCompute Town — Dual-Track Idle Compute & Open-Source Incubator',
    'brand.name': 'PixelCompute Town',
    'brand.sub': 'Dual-Track Idle Compute Incubator · BYOK + BYOT',

    // HUD
    'hud.goldTitle': 'Town Gold Balance (for skins, decor & coffee)',
    'hud.usdTitle': 'Total Verified Bounty & Project Dividend Earnings (USD)',
    'hud.repTitle': 'Proof of Accepted Work Reputation Score',
    'hud.byokTitle': 'Configure browser-only BYOK API Key (never sent to server)',
    'hud.repPrefix': 'Rep',
    'hud.byokDemo': 'BYOK: Sim Mode',
    'hud.byokLive': 'BYOK: {model}',
    'hud.homeBtn': '🏠 Home',
    'hud.installBtn': '📦 Install CLI',
    'hud.userTitle': 'Click to Sign In, Register, or Switch Account',
    'hud.githubLogin': 'GitHub Login',
    'hud.logout': 'Logout',
    'hud.certBtn': '🪪 Work Cert',
    'hud.settingsBtn': '⚙️ Settings',
    'hud.dayNightTitle': 'Toggle Cyber Night / Crisp Day Theme',
    'hud.soundTitle': 'Toggle 8-bit Retro Sound FX',

    // Stage & Scenes
    'stage.quickNav': 'HD Scene:',
    'stage.navFactory': '🏭 Auto Factory',
    'stage.navGuild': '⚔️ Bounty Guild',
    'stage.navLaunchpad': '🚀 Launchpad',
    'stage.navLounge': '☕ Lounge',
    'stage.navVault': '💰 Creator Vault',
    'stage.navTown': '🗺️ Town Map',
    'stage.autoFollow': '🔗 Auto-Follow Tab',
    'stage.autoFollowTitle': 'Automatically sync the left HD indoor room when switching console tabs',
    'stage.hintDefault': 'Click any building or pixel worker to jump straight to its console',
    'stage.hintFactory': '🏭 Auto Factory HQ: Watch API workers code live on dual HD monitors',
    'stage.hintGuild': '⚔️ Bounty Guild Hall: Click bounty scrolls or watch live local CLI heartbeats',
    'stage.hintLaunchpad': '🚀 Launchpad Command: Watch the hologram evolve to 100% & trigger launch fireworks!',
    'stage.hintLounge': '☕ Compute Lounge: Recharge workers, show off skins & light up 6 achievement trophies',
    'stage.hintVault': '💰 Creator Vault: Live revenue pillars, gleaming gold pile & Top 3 podium',
    'stage.hintTown': '🗺️ Town Overview: Click any building to step inside its HD pixel interior',
    'stage.syncOn': '🔗 Auto-Follow ON: Switching console tabs syncs the HD stage scene',
    'stage.syncOff': '📌 Scene Pinned: Switching console tabs keeps your current HD scene',
    'stage.sseConnecting': 'SSE Connecting',
    'stage.sseLive': 'SSE Live',
    'stage.sseOffline': 'SSE Reconnecting...',
    'stage.marqueeDefault': 'PixelCompute Town is live! Put your idle AI compute to work!',
    'stage.loadingWorkers': 'Syncing pixel worker squad...',
    'stage.stripSummary': 'Active {working}/{total} | {open} Open Tasks',
    'stage.workerHint': '👾 [{name}] Lv.{level} · Stamina {stamina}/{maxStamina} · {msg}',
    'stage.taskSelectedHint': '🏭 Selected task: {title}',
    'stage.cliHint': '💻 [CLI] {name}: {msg}{pct}',
    'stage.idleFallback': 'Standing by',

    // Terminal Feed
    'terminal.title': 'Live Town Terminal Feed (AI Deliverables & Local CLI Heartbeats)',
    'terminal.filterAll': 'All',
    'terminal.filterDeliverable': 'Outputs',
    'terminal.filterRevenue': 'Revenue',
    'terminal.filterCli': 'CLI',
    'terminal.waiting': 'Waiting for town events...',
    'terminal.empty': 'No town events in this filter yet. Dispatch a worker to get started!',
    'terminal.inspectBtn': '🔍 Inspect Deliverable & Verification Report',

    // Tabs
    'tab.factory': 'Factory',
    'tab.guild': 'Guild',
    'tab.incubator': 'Launchpad',
    'tab.workers': 'Workers',
    'tab.revenue': 'Revenue',

    // Onboarding
    'onboarding.title': '🧭 3-Step Founder Quickstart',
    'onboarding.step1': '1. Dispatch a worker & pass verification',
    'onboarding.step2': '2. Vote PixelPomo to 10/10 to break ground',
    'onboarding.step3': '3. Launch a project or export Work Cert',
    'onboarding.collapse': 'Hide',
    'onboarding.expand': 'Show 3-Step Guide',
    'onboarding.allDone': '🎉 All done! Dual-track workflow & transparent revenue loop complete',

    // Factory Tab
    'factory.banner': '⚡ <strong>API Track (Zero-Trust BYOK)</strong>: Direct browser calls to Gemini API / OpenAI-compatible endpoints, or enjoy zero-key simulation!',
    'factory.keyBtn': '🔑 API Key',
    'factory.allProjects': 'All Projects',
    'factory.allStatus': 'All Status',
    'factory.statusOpen': 'Open',
    'factory.statusCompleted': 'Verified',
    'factory.autopilot': '🤖 Auto-Pilot',
    'factory.autopilotTitle': 'Automatically dispatch idle API workers every 6 seconds',
    'factory.dispatch': '🚀 Dispatch Now',
    'factory.working': '⚡ Working...',
    'factory.inspect': '📋 View AI Output & Report',
    'factory.loading': 'Loading factory tasks...',
    'factory.empty': 'No matching API tasks. Head to Launchpad and vote PixelPomo to unlock 5 new dual-track tasks!',
    'factory.workerBusyTag': 'Working',
    'factory.workerDoneTag': 'Delivered',
    'factory.netSuffix': 'net',
    'factory.noTrackWorker': 'No worker for this track',
    'factory.workerWorkingSuffix': ' [Working]',

    // Guild Tab
    'guild.banner': '⚔️ <strong>Monthly/Weekly Quota Track (BYOT)</strong>: Copy standardized Context Pack for Gemini CLI / Claude Code / Codex, or stream live via <code class="mono">pixel-worker</code>!',
    'guild.workerLabel': 'Guild Worker:',
    'guild.importTitle': '🔗 Import Real GitHub Public Repo Issues as Bounties',
    'guild.importPlaceholder': 'Enter owner/repo or GitHub URL (e.g. vercel/next.js)',
    'guild.importBtn': '📥 Import Issues',
    'guild.importTrackGuild': 'Bounty Guild (BYOT)',
    'guild.importTrackApi': 'Auto Factory (API)',
    'guild.importAutoProj': 'Auto-create project',
    'guild.claimOpen': '⚔️ Claim Bounty / Workbench',
    'guild.claimResume': '🛠️ Open Workbench & Submit',
    'guild.loading': 'Loading guild bounties...',
    'guild.empty': 'No guild bounties yet. Vote on a project in Launchpad to unlock high-value bounties!',
    'guild.workerBusyTag': 'In Progress',
    'guild.workerDoneTag': 'Settled',
    'guild.poolBadge': '🚀 5/85/10 Merit Pool',
    'guild.bountyNetFee': '💰 ${gross} (${net} net / ${fee} fee)',

    // Incubator Tab
    'incubator.summaryDefault': 'SHA-256 Provenance -> Dual-Track Co-Build -> Merit Split (5% First Spark / 85% Merit Builders / 10% Platform)',
    'incubator.summary': 'Voting {voting} | Building {building} | Launched {launched} | 5/85/10 Merit Split',
    'incubator.proposeBtn': '+ Propose Project',
    'incubator.jumpImport': '🔗 Import GitHub Issues',
    'incubator.loading': 'Loading incubated projects...',
    'incubator.sponsoredBadge': '📺 Neon Sponsored',
    'incubator.statusVoting': '🗳️ Voting ({votes}/{req})',
    'incubator.statusLaunched': '🚀 Launched',
    'incubator.statusBuilding': '🏗️ Building {pct}%',
    'incubator.creatorPrefix': '👤 Creator: {name}',
    'incubator.originatorPrefix': '💡 First Spark: {name}',
    'incubator.coBuildersCount': '🤝 {count} Co-Builders',
    'incubator.hashVerifyTitle': 'Click to verify full SHA-256 chain & download First-Spark Certificate',
    'incubator.splitSpark': '5% Spark Royalty',
    'incubator.splitMerit': '85% Merit Builders',
    'incubator.splitPlatform': '10% Platform',
    'incubator.joinBtn': '🤝 Co-Build',
    'incubator.joinedBtn': '✓ Joined',
    'incubator.certBtn': '📜 Provenance Cert',
    'incubator.poolTag': '📊 5/85/10 Merit Split',
    'incubator.myPoints': '✨ Your {pts} pts (~{pct}% of 85% merit pool)',
    'incubator.myPointsSpark': '✨ Your {pts} pts (~{pct}% total incl. 5% Spark)',
    'incubator.bountyPool': '💰 Cash Bounty Pool ${amount}',
    'incubator.totalRev': '💵 Total Product Revenue {amount}',
    'incubator.voteProgress': 'Voting progress ({left} more votes to break ground & spawn 5 dual-track tasks!)',
    'incubator.voteCount': '{votes} / {req} votes',
    'incubator.progressLaunched': 'Live in production · Streaming dividends',
    'incubator.progressReady': '🎉 100% Ready! Launch now to trigger Day-1 revenue split!',
    'incubator.progressBuilding': 'Dual-track build progress',
    'incubator.billboardActive': '✨ Neon Billboard Live in Plaza',
    'incubator.billboardBtn': '📺 Rent Neon Billboard (${price})',

    // Workers & Shop Tab
    'workers.myWorkers': '🤖 My Compute Workers (Token Caps & Skins)',
    'workers.loading': 'Loading compute workers...',
    'workers.achievements': '🏆 Genesis Achievements (Unlock Gold + Cert Badges)',
    'workers.achievementsLoading': 'Loading achievements...',
    'workers.achievementsEmpty': 'No achievement records yet.',
    'workers.achUnlocked': '✓ Unlocked',
    'workers.recruitTitle': '✨ Recruit New Worker (4 Classes)',
    'workers.recruitNameLabel': 'Worker Codename / Name',
    'workers.recruitNamePlaceholder': 'e.g. Neon Pixel Ami',
    'workers.recruitRoleLabel': 'Class & Track',
    'workers.roleOptFlash': '⚡ Flash Engineer (API Track)',
    'workers.roleOptArtist': '🎨 Pixel Artist (API Track)',
    'workers.roleOptPro': '🧠 Chief Architect (BYOT Guild)',
    'workers.roleOptArtisan': '🔨 Guild Artisan (BYOT Guild)',
    'workers.recruitProviderLabel': 'Compute Provider Label',
    'workers.recruitCapLabel': 'Daily Cap (Tokens / Runs)',
    'workers.recruitBtn': '+ Recruit to Town',
    'workers.shopTitle': '🛍️ Pixel Cosmetics, Room Decor & Pro Pass',
    'workers.shopLoading': 'Loading shop items...',
    'workers.shopBundleTag': 'All 3 HD Skins Included',
    'workers.shopPreviewTitle': 'HD Skin Try-On Preview',
    'workers.shopBundleTitle': 'Preview all included exclusive skins',
    'workers.certTitle': '🪪 Shareable Pixel Work Certificate PNG',
    'workers.certDesc': 'Generate a crisp retro pixel certificate with your reputation, verified tasks, unlocked badges, and dividend holdings!',
    'workers.previewCert': '👁️ Preview Cert PNG',
    'workers.downloadCert': '⬇️ Download PNG',
    'workers.statusWorking': '⚡ Working',
    'workers.statusIdle': '☕ Idle',
    'workers.staminaLine': 'Stamina {stamina}/{maxStamina} | Daily Cap {used}/{cap} {unit}',
    'workers.unitTokens': 'tokens',
    'workers.unitQuota': 'runs/day',
    'workers.trackLine': 'Track: {track}',
    'workers.trackApi': 'Auto Factory (API)',
    'workers.trackGuild': 'Bounty Guild (BYOT)',
    'workers.completedLine': 'Done: {count} tasks',
    'workers.earnedLine': 'Earned: {gold}G / {pts} pts',
    'workers.dailyCapLabel': 'Daily Cap:',

    // Revenue, Payouts & Mayor Admin Tab
    'revenue.totalLabel': 'Total Creator Platform Revenue (USD)',
    'revenue.transparentBadge': 'Real-Time Transparent Ledger',
    'revenue.resetBtn': '🔄 Reset Demo World',
    'revenue.kpiBounty': '⚔️ 10% Bounty Escrow Fees',
    'revenue.kpiBountySub': 'Auto-settled on every verified cash bounty',
    'revenue.kpiCarry': '🚀 10% Incubation Carry',
    'revenue.kpiCarrySub': 'Auto-credited on launches & product revenue',
    'revenue.kpiAds': '📺 Plaza Neon Billboards',
    'revenue.kpiAdsSub': '$29/slot · Lights up the town neon sign',
    'revenue.kpiPro': '✨ Skins & Pro Pass',
    'revenue.kpiProSub': 'Cosmetics & perks only, never pay-to-win',
    'revenue.historyTitle': '📒 Platform Revenue Ledger',
    'revenue.historyEmpty': 'No revenue entries yet. Verify a bounty, rent a billboard, or launch a project!',
    'revenue.leaderboardTitle': '🏆 Genesis Contributor Leaderboard',
    'revenue.leaderboardLoading': 'Loading leaderboard...',
    'revenue.lbPoints': '{pts} pts',
    'revenue.lbRep': 'Rep {rep}',

    // Stablecoin Payout Section
    'payout.sectionTitle': '💸 Stablecoin Dividend Payouts (USDC / USDT)',
    'payout.balanceBadge': 'Withdrawable: {amount}',
    'payout.walletChainLabel': 'Payout Chain',
    'payout.walletAddressLabel': 'Personal Wallet Address (EVM 0x... or Solana)',
    'payout.walletPlaceholder': '0x... or Solana wallet address',
    'payout.bindBtn': '🔗 Bind Wallet',
    'payout.boundStatus': 'Bound Wallet ({chain}): {address}',
    'payout.unboundStatus': 'No stablecoin wallet bound yet. Bind a wallet to withdraw earnings ($5 min).',
    'payout.amountLabel': 'Withdraw Amount (USD, min $5)',
    'payout.tokenLabel': 'Payout Token',
    'payout.requestBtn': '💸 Request Payout',
    'payout.instantBtn': '⚡ Sandbox Instant Payout',
    'payout.historyTitle': 'Payout History',
    'payout.historyEmpty': 'No stablecoin payouts yet.',
    'payout.statusPaid': '✅ Paid',
    'payout.statusPending': '⏳ Pending',
    'payout.markPaidBtn': '✅ Mark Paid',

    // Mayor Admin Section
    'admin.sectionTitle': '🛡️ Mayor Admin Panel (Device Review & Redeem Codes)',
    'admin.toggleLabel': 'Toggle Admin Panel',
    'admin.strictTitle': 'Strict Device Review Mode (Anti-Sybil)',
    'admin.strictDesc': 'When enabled, new CLI devices from /onboard wait in queue for manual Mayor approval.',
    'admin.strictOn': '🔒 Strict Review ON',
    'admin.strictOff': '🔓 Auto-Approve',
    'admin.devicesTitle': 'Pending & Bound Devices',
    'admin.devicesEmpty': 'No pending devices in review queue.',
    'admin.approveBtn': '✅ Approve',
    'admin.rejectBtn': '✕ Reject',
    'admin.devicePending': '⏳ Pending Review',
    'admin.deviceApproved': '✅ Approved',
    'admin.deviceRejected': '✕ Rejected',
    'admin.codesTitle': '🎟️ Redeem Code Generator (Afdian / Ko-fi / Gumroad)',
    'admin.codeRewardLabel': 'Reward Type',
    'admin.codeRewardPro': '💎 Pro Pass ($9)',
    'admin.codeRewardPack': '🎁 Genesis Skin Bundle ($15)',
    'admin.codeRewardGold': '🪙 500 Gold Pack',
    'admin.codeRewardBillboard': '📺 Neon Billboard Pass',
    'admin.codeCountLabel': 'Qty',
    'admin.codeNoteLabel': 'Note (optional)',
    'admin.codeNotePlaceholder': 'e.g. Ko-fi November supporter batch',
    'admin.generateCodeBtn': '⚡ Generate Codes',
    'admin.codesEmpty': 'No redeem codes generated yet.',
    'admin.codeUsed': 'Used',
    'admin.codeUnused': 'Available',
    'admin.copyCodeBtn': '📋 Copy',

    // Badges & Common Buttons
    'badge.open': '🟡 Open',
    'badge.working': '⚡ Running',
    'badge.completed': '✅ Verified',
    'badge.guildOpen': '📜 Open Bounty',
    'badge.guildWorking': '⚔️ In Progress',
    'badge.guildCompleted': '✅ Settled',
    'badge.owned': '✓ Owned',
    'btn.buy': 'Buy',
    'btn.checkout': '💎 Checkout',
    'btn.close': '✕ Close',
    'btn.closeSimple': 'Close',
    'btn.cancel': 'Cancel',
    'btn.copy': '📋 Copy',
    'btn.vote': '🗳️ Vote (+1)',
    'btn.billboard': '📺 Rent Neon Billboard ($29)',
    'btn.launch': '🚀 Launch Now! ($200 Day-1 Split)',
    'btn.simRevenue': '💸 Simulate $100 Revenue & Split',
    'btn.coffee': '☕ Drink Coffee',
    'btn.saveCap': 'Save Cap',

    // Modal 1: BYOK Settings
    'modal.settings.title': '⚙️ Zero-Trust BYOK Keys & Local CLI Bridge',
    'modal.settings.callout': '🔒 <strong>Zero-Trust Guarantee</strong>: Your API Key stays <strong>exclusively in your browser localStorage</strong> and calls Gemini / OpenAI-compatible endpoints directly. It is <strong>never sent to our server</strong>. Leave blank to enjoy full Simulation Mode.',
    'modal.settings.providerLabel': 'Model Protocol',
    'modal.settings.providerGemini': 'Google Gemini API (First-Class · Direct Browser)',
    'modal.settings.providerOpenai': 'OpenAI-Compatible Endpoint (OpenRouter / DeepSeek / Ollama)',
    'modal.settings.presetsLabel': 'Quick Model Presets',
    'modal.settings.presetsPlaceholder': '-- Select Recommended Model --',
    'modal.settings.modelLabel': 'Model Name (customizable)',
    'modal.settings.baseUrlLabel': 'OpenAI-Compatible Base URL',
    'modal.settings.baseUrlPlaceholder': 'https://openrouter.ai/api/v1 or http://localhost:11434/v1',
    'modal.settings.apiKeyLabel': 'API Key (leave blank for keyless Simulation Mode)',
    'modal.settings.apiKeyPlaceholder': 'AIzaSy... or sk-...',
    'modal.settings.maxTokensLabel': 'Max Output Tokens per Task (Cost Guard)',
    'modal.settings.cliTitle': '🖥️ Local Monthly/Weekly Quota CLI Bridge (BYOT)',
    'modal.settings.cliDesc': 'Have Gemini CLI / Claude Code / Codex? Run the command below in your terminal to stream live work directly to your pixel worker:',
    'modal.settings.clearBtn': '🗑️ Clear Key',
    'modal.settings.testBtn': '🔌 Test Connection',
    'modal.settings.saveBtn': '💾 Save in Browser',

    // Modal 2: Guild Workbench
    'modal.guild.title': '⚔️ Bounty Guild Workbench (BYOT)',
    'modal.guild.titleWithTask': '⚔️ Guild Workbench: {title}',
    'modal.guild.step1': 'Step 1: Copy Standardized CLI / Prompt Context Pack',
    'modal.guild.copyPack': '📋 Copy Context Pack',
    'modal.guild.step2': 'Step 2 (Optional): Run pixel-worker locally for live animation sync',
    'modal.guild.copyCmd': '📋 Copy Command',
    'modal.guild.step3': 'Step 3 (Optional): Paste GitHub PR URL & Verify',
    'modal.guild.verifyPr': '🔍 Verify PR',
    'modal.guild.step4': 'Step 4: Paste local AI output for Proof of Accepted Work verification',
    'modal.guild.simCli': '⚡ Simulate Local CLI Delivery (1-Click)',
    'modal.guild.contentPlaceholder': 'Paste code, diff summary, test output, or structured deliverable (empty/spam submissions will be blocked and penalized)...',
    'modal.guild.laterBtn': 'Submit Later',
    'modal.guild.submitBtn': '📤 Submit & Verify Payout',
    'modal.guild.criteriaPrefix': 'Acceptance Criteria: ',
    'modal.guild.criteriaFallback': 'Provide verifiable code implementation or a valid GitHub PR URL',
    'modal.guild.workerBadge': '👾 Worker: {name}',
    'modal.guild.pointsBadge': '✨ +{pts} pts',
    'modal.guild.bountyBadge': '💰 Bounty ${gross} (${net} net)',

    // Modal 3: Propose Project
    'modal.propose.title': '🚀 Propose Project (SHA-256 First-Spark Notary)',
    'modal.propose.banner': 'Submitting mints an immutable <strong>SHA-256 Proof of First Spark hash</strong>! Once voted in, it spawns 5 dual-track tasks and splits launch revenue transparently: <strong>5% First-Spark Royalty / 85% Merit Builders / 10% Platform</strong>.',
    'modal.propose.nameLabel': 'Project Name *',
    'modal.propose.namePlaceholder': 'e.g. PixelMetrics (Lightweight Open-Source Analytics)',
    'modal.propose.descLabel': 'Tagline & Vision *',
    'modal.propose.descPlaceholder': 'In 1-2 sentences, describe the problem this product solves and who it is for...',
    'modal.propose.catLabel': 'Category',
    'modal.propose.catDevtools': 'Developer Tools',
    'modal.propose.catSaas': 'Indie SaaS',
    'modal.propose.catPlugin': 'Open-Source Plugin',
    'modal.propose.catGame': 'Pixel Interactive Tool',
    'modal.propose.bountyLabel': 'Initial Cash Bounty Pool (USD, 0 allowed)',
    'modal.propose.repoLabel': 'GitHub Repo URL (optional)',
    'modal.propose.submitBtn': '🚀 Post Proposal & Mint First-Spark Hash',
    'modal.propose.copycatHighTitle': '🛡️ Anti-Copycat Warning: Highly Similar Original Idea Found ({pct}% match)!',
    'modal.propose.copycatWarnTitle': '⚠️ Similarity Notice: Related Original Idea Exists ({pct}% match)',
    'modal.propose.copycatMeta': 'Originator: {originator} | Notarized: {time} | Hash: #{hash}',
    'modal.propose.copycatDesc': 'PixelCompute Town rejects copycats & clones. Join the original idea instead and earn the lion’s share from the 85% merit builders pool!',
    'modal.propose.copycatJoinBtn': '🤝 Respect Original: Join & Co-Build',
    'modal.propose.copycatClean': '✅ Anti-copycat check clear: unique idea! Submitting mints your SHA-256 First-Spark cert.',
    'modal.propose.derivativeAck': 'I confirm this is a distinct derivative idea and attribute the source hash',

    // Modal 8: Provenance & Merit Calculator (#provenance-modal)
    'modal.provenance.title': '📜 Proof of First Spark & Merit Split Calculator',
    'modal.provenance.chainVerifying': '⏳ Verifying SHA-256 provenance hash chain...',
    'modal.provenance.chainValid': '✅ SHA-256 Chain Verified (Block #{idx} · {len} notarized original ideas intact)',
    'modal.provenance.chainInvalid': '⚠️ Hash chain integrity alert — please check records',
    'modal.provenance.originatorLabel': 'First-Spark Originator',
    'modal.provenance.timestampLabel': 'Notarized (UTC)',
    'modal.provenance.coBuildersLabel': 'Co-Builders',
    'modal.provenance.ideaHashLabel': 'SHA-256 Idea Fingerprint (ideaHash)',
    'modal.provenance.prevHashLabel': 'Previous Chain Hash (prevIdeaHash)',
    'modal.provenance.copyHashBtn': '📋 Copy Hash',
    'modal.provenance.calcTitle': '⚖️ Live Merit Split Calculator (5% Spark / 85% Merit / 10% Platform)',
    'modal.provenance.calcRevLabel': 'Simulated Project Revenue (USD):',
    'modal.provenance.calcWorkLabel': 'Your Verified Work Share:',
    'modal.provenance.calcOriginatorCheck': 'I am the First-Spark Originator (+5% Royalty)',
    'modal.provenance.calcRowSpark': '💡 First-Spark Permanent Royalty (5%)',
    'modal.provenance.calcRowMerit': '⚡ Merit Builders Pool (85%)',
    'modal.provenance.calcRowPlatform': '🛡️ Platform Notary & Infra (10%)',
    'modal.provenance.calcRowYou': '🎯 Your Estimated Payout ({pct}% total)',
    'modal.provenance.calcContributorsTitle': '👥 Current Verified Builders & Weight Breakdown',
    'modal.provenance.calcNoContributors': 'No verified contributions yet — claim a task now to lead the 85% merit pool!',
    'modal.provenance.certPreviewTitle': '🖼️ Proof of First Spark Certificate PNG Preview (900×520)',
    'modal.provenance.downloadCertBtn': '⬇️ Download First-Spark Cert PNG',

    // Modal 4: Report
    'modal.report.title': '📋 AI Deliverable & Proof of Accepted Work Report',
    'modal.report.titleWithTask': '📋 Deliverable & Verification: {title}',
    'modal.report.checksTitle': '🔍 3-Layer Automated Anti-Cheat Checks',
    'modal.report.deliverableTitle': '📦 Submitted Deliverable',
    'modal.report.copyBtn': '📋 Copy Output',
    'modal.report.passed': '✅ Verified Pass',
    'modal.report.rejected': '❌ Rejected',
    'modal.report.score': 'Quality Score: {score} / 100',
    'modal.report.mode': 'Mode: {mode}',
    'modal.report.noChecks': 'No detailed check records.',
    'modal.report.emptyContent': '(No deliverable content)',

    // Modal 5: Work Certificate
    'modal.cert.title': '🪪 PixelCompute Town · Work Certificate & Dividend Card',
    'modal.cert.captionDefault': 'Download your crisp retro pixel PNG certificate and share your build stats!',
    'modal.cert.caption': '{name} · Rep {rep} · {tasks} Verified Tasks · Total Earned {usd}',
    'modal.cert.copyShareBtn': '📋 Copy Social Share Post',
    'modal.cert.downloadBtn': '⬇️ Download Cert PNG',
    'modal.cert.shareText': 'Just put my idle AI compute to work in PixelCompute Town! 👾\nReputation {rep} · {tasks} Proof-of-Accepted-Work tasks verified · {usd} earned!\n#PixelComputeTown #IndieDev #GeminiAPI',

    // Modal 6: Auth Modal (#auth-modal)
    'auth.title': '🔐 Account Sign In & Registration',
    'auth.currentStatus': 'Signed in as: {name} ({mode})',
    'auth.tabLogin': '🔑 Sign In',
    'auth.tabRegister': '✨ Free Sign Up',
    'auth.emailLabel': 'Email Address',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.passwordLabel': 'Password (min 6 chars)',
    'auth.passwordPlaceholder': 'Enter password',
    'auth.displayNameLabel': 'Display Name (optional)',
    'auth.displayNamePlaceholder': 'e.g. Pixel Dev Alex',
    'auth.loginBtn': '🚀 Sign In',
    'auth.registerBtn': '✨ Create Multi-User Account',
    'auth.divider': 'Or continue with',
    'auth.githubBtn': '🐙 Continue with GitHub',
    'auth.googleBtn': '🌐 Continue with Google',
    'auth.demoBtn': '🎮 Guest Demo Mode',
    'auth.logoutBtn': '🚪 Sign Out',
    'auth.multiUserTip': '💡 Register an account to isolate your own Gold, Pixel Workers & Payout Wallet while sharing the global Incubator & Leaderboard!',
    'auth.modeDemo': 'Founder Demo',
    'auth.modeEmail': 'Email Account',
    'auth.modeGithub': 'GitHub OAuth',
    'auth.modeGoogle': 'Google OAuth',

    // Modal 7: 3-in-1 Payment Modal (#payment-modal)
    'pay.title': '💎 3-in-1 Transparent Checkout',
    'pay.productSummary': 'Item: {name} · {price}',
    'pay.tabStablecoin': '💎 Stablecoin (USDC/USDT)',
    'pay.tabCard': '💳 Card (Polar/Stripe)',
    'pay.tabRedeem': '🎟️ Redeem Code (Ko-fi/Afdian)',
    'pay.chainLabel': 'Select Network',
    'pay.tokenLabel': 'Select Stablecoin',
    'pay.createOrderBtn': '🧾 Generate Stablecoin Deposit Order',
    'pay.receiverLabel': 'Treasury Receiver Address',
    'pay.copyAddrBtn': '📋 Copy Address',
    'pay.amountLabel': 'Exact Amount Due',
    'pay.memoLabel': 'Order Memo Code',
    'pay.txHashLabel': 'Paste On-Chain TxHash to Verify',
    'pay.txHashPlaceholder': '0x... (64-hex EVM) or Solana Signature',
    'pay.verifyTxBtn': '✅ Verify On-Chain Payment',
    'pay.simTxBtn': '⚡ Sandbox Simulate Tx',
    'pay.cardDesc': 'Supports Polar.sh & Stripe card / Apple Pay checkout. In local sandbox mode, click below to simulate instant card settlement.',
    'pay.polarBtn': '❄️ Checkout with Polar.sh',
    'pay.stripeBtn': '💳 Checkout with Stripe',
    'pay.sandboxCardReady': 'Sandbox order {orderId} created ({provider} · {amount}). Click below to simulate instant card approval:',
    'pay.sandboxCompleteBtn': '⚡ Complete Sandbox Card Payment',
    'pay.redeemDesc': 'Redeem codes purchased via Afdian, Ko-fi, or Gumroad to unlock perks instantly!',
    'pay.redeemHint': '🎁 Built-in demo codes: PIXEL-PRO-2026 (Pro Pass) | PIXEL-PACK-2026 (Genesis Bundle) | PIXEL-GOLD-500 (500 Gold)',
    'pay.redeemCodeLabel': 'Enter Redeem Code',
    'pay.redeemCodePlaceholder': 'e.g. PIXEL-PRO-2026',
    'pay.redeemBtn': '🎟️ Redeem Now',

    // Toasts & Confirmations
    'toast.copied': 'Copied to clipboard!',
    'toast.resetConfirm': 'Reset the PixelCompute Town demo world? All tasks, progress, and ledgers will return to Genesis state.',
    'toast.resetDone': '🔄 Demo world reset to initial genesis state!',
    'toast.resetFailed': 'Reset failed: {err}',
    'toast.langSwitched': '🌐 Switched UI language to: English',
    'toast.achievement': '🏆 Achievement Unlocked: [{title}] {bonus}',
    'toast.certExported': '🪪 Exported Pixel Work Certificate PNG! Ready to share!',
    'toast.shareCopied': '📋 Share post copied! Attach your Work Certificate PNG and post!',
    'toast.soundOn': '🔊 8-bit Retro Sound FX enabled',
    'toast.soundOff': '🔇 Sound FX muted',
    'toast.needApiWorker': 'Please select or recruit an API-track worker first!',
    'toast.workerBusy': 'This worker is already running an in-browser API call...',
    'toast.dispatched': '🚀 [{worker}] entered Auto Factory ({mode})...',
    'toast.byokSimEngine': 'Keyless Simulation Engine',
    'toast.byokFailedReleased': '{err} (Task & worker auto-released safely)',
    'toast.taskPassed': '✅ Verified ({score}/100)! +{gold}G, +{pts} pts{bounty}',
    'toast.bountyNetNote': ', +${net} net bounty',
    'toast.bountyNetFeeNote': ', +${net} net bounty (${fee} 10% fee)',
    'toast.antiCheatFailed': '🛡️ Anti-cheat verification failed: {reason}',
    'toast.dispatchFailed': 'Dispatch failed: {err}',
    'toast.autopilotOn': '🤖 Auto-Pilot enabled! Idle API workers will auto-claim & verify open tasks.',
    'toast.autopilotOff': '⏹️ Auto-Pilot paused.',
    'toast.needGuildWorker': 'Please select or recruit a Quota-track (BYOT) worker first!',
    'toast.guildClaimed': '⚔️ [{worker}] claimed the bounty & took a seat at the Guild desk!',
    'toast.claimFailed': 'Could not claim task: {err}',
    'toast.simCliDone': '⚡ Local CLI simulation finished & streamed heartbeats! Review output and click Submit.',
    'toast.simCliFailed': 'CLI heartbeat simulation failed: {err}',
    'toast.needGuildContent': 'Paste deliverable content or a GitHub PR URL (or click Simulate Local CLI Delivery)!',
    'toast.guildPassed': '✅ Guild bounty verified ({score}/100)! +{gold}G, +{pts} pts{bounty}',
    'toast.guildIntercepted': '🛡️ Anti-cheat blocked: {reason}',
    'toast.submitFailed': 'Submission failed: {err}',
    'toast.byokTesting': '⏳ Testing direct browser connection to model endpoint...',
    'toast.byokSaved': '💾 BYOK config saved locally in your browser (never uploaded)!',
    'toast.byokCleared': '🗑️ API Key cleared. Back to keyless Simulation Mode.',
    'toast.cliCopied': '📋 Local CLI command copied!',
    'toast.contextPackCopied': '📋 Context Pack copied! Paste directly into Gemini CLI / Claude Code.',
    'toast.pixelWorkerCopied': '📋 pixel-worker sync command copied!',
    'toast.prNeedUrl': 'Please enter a GitHub PR URL first.',
    'toast.prChecking': '🔍 Verifying GitHub PR format & status...',
    'toast.prValid': '✅ Valid PR: {owner}/{repo} #{num}{note}',
    'toast.reportCopied': '📋 Deliverable output copied!',
    'toast.proposed': '💡 Project "{name}" posted for community voting!',
    'toast.proposeFailed': 'Proposal failed: {err}',
    'toast.recruited': '👾 Recruited new worker [{name}] to town!',
    'toast.recruitFailed': 'Recruit failed: {err}',
    'toast.ghImporting': '⏳ Importing open issues from GitHub Issues API...',
    'toast.ghImported': '✅ Imported {count} tasks from {repo} into "{project}" {mode}',
    'toast.ghModeReal': '(Live GitHub Issues)',
    'toast.ghModeFallback': '(Offline Preview: {reason})',
    'toast.ghImportFailed': 'GitHub import failed: {err}',
    'toast.voteUnlocked': '🎉 "{name}" reached vote goal & broke ground! 5 dual-track tasks spawned!',
    'toast.voteOk': '🗳️ Vote recorded! "{name}" is now at {votes}/{req} votes',
    'toast.billboardOk': '📺 Neon billboard lit up for "{name}" (+${fee} platform ad revenue)!',
    'toast.launchOk': '🎆 "{name}" launched! Day-1 revenue ${gross} split: +${share} to you, +${carry} platform carry!',
    'toast.simRevOk': '💸 "{name}" earned ${gross}! Split: +${share} to you, +${carry} 10% platform carry!',
    'toast.coffeeOk': '☕ [{name}] enjoyed pixel espresso — stamina & daily cap restored!',
    'toast.capSaved': '🔧 Updated [{name}] daily safety cap to {cap}',
    'toast.shopBought': '🛍️ Purchased "{name}"!',
    'toast.skinChanged': '✨ [{worker}] equipped "{skin}"!',
    'toast.serverError': 'Unable to reach PixelCompute Town server: {err}',
    'toast.authLoginOk': '🔑 Signed in! Welcome back, {name}!',
    'toast.authRegisterOk': '🎉 Account created! Welcome to PixelCompute Town, {name}!',
    'toast.authDemoOk': '🎮 Switched to Founding Mayor Demo Mode!',
    'toast.authLogoutOk': '🚪 Signed out & returned to Founder Demo Mode',
    'toast.authGoogleUnconfigured': 'ℹ️ Google OAuth is not configured on this server. Use Email Sign Up or Demo Mode.',
    'toast.authGithubOk': '🐙 GitHub sign-in successful! Welcome back, {name}!',
    'toast.authGoogleOk': '🌐 Google sign-in successful! Welcome back, {name}!',
    'toast.payOrderCreated': '🧾 Stablecoin order created! Transfer & submit TxHash, or use Sandbox Simulate.',
    'toast.payConfirmed': '🎉 Payment confirmed! Your perk is now active!',
    'toast.payRedeemOk': '🎟️ Code redeemed successfully! {detail}',
    'toast.walletBound': '🔗 Stablecoin payout wallet bound ({chain})!',
    'toast.payoutCreated': '💸 Requested ${amount} stablecoin payout!',
    'toast.payoutPaid': '✅ Payout marked as paid (TxHash recorded)!',
    'toast.adminStrictChanged': '🛡️ Strict Device Review mode set to: {state}',
    'toast.adminDeviceReviewed': '🛡️ Device {code} {action}!',
    'toast.adminCodesGenerated': '🎟️ Generated {count} new redeem code(s)!',
    'toast.joinedProject': '🤝 Joined "{name}" as a co-builder! ({count} co-builders total)',
    'toast.alreadyJoined': '✓ You are already a co-builder on "{name}"!',
    'toast.ideaCertExported': '📜 Exported Proof of First Spark Certificate PNG for "{name}"!',
    'toast.copycatBlocked': '🛡️ Blocked potential copycat of "{name}" ({pct}% match) — join the original idea instead!',
    'toast.hashCopied': '🔐 Full SHA-256 idea provenance hash copied!',

    // Anti-Dilution Governance & Peer Review Queue
    'review.panelTitle': '⚖️ Peer Review Queue (Anti-Slop Filter Station)',
    'review.pendingBadge': '{count} Pending',
    'review.refreshBtn': '🔄 Refresh Queue',
    'review.panelDesc': 'Core builders & maintainers hold merge veto power: approve clean PRs for <strong>+15G</strong> review reward, or reject AI slop to <strong>slash & claim their stake directly</strong>!',
    'review.empty': 'No submissions pending peer review — the queue is spotless!',
    'review.historyTitle': '📜 Recent Review Verdicts',
    'review.submitterPrefix': '👤 Submitter: {name}',
    'review.stakeBadge': '🔒 {stake} G Stake',
    'review.aiScoreGood': '🤖 AI Blind Review {score}/100 Clean',
    'review.aiScoreMed': '🤖 AI Blind Review {score}/100 Needs Check',
    'review.aiScoreSlop': '🤖 AI Blind Review {score}/100 ⚠️ AI Slop Bloat Alert',
    'review.diffBloat': '{bloat}% bloat',
    'review.previewSummary': '🔍 Expand Submission Preview',
    'review.approveBtn': '✅ Approve Merge (+15G)',
    'review.rejectBtn': '🚫 Reject Slop (Slash Stake)',
    'review.rejectBtnWithStake': '🚫 Reject Slop (Slash {stake}G)',
    'review.historyApproved': '✅ Approved Merge',
    'review.historyRejected': '🚫 Rejected Slop',
    'review.historyReward': '+{gold}G Review Bonus',
    'review.historySlashed': 'Slashed +{stake}G Stake',
    'review.jumpToQueue': '⚖️ Go to Review Queue',
    'gov.bucketCore': '🔥 Core Pool 70%',
    'gov.bucketPeripheral': '⚙️ Peripheral Pool ≤30%',
    'gov.stakeTag': '🔒 Stake {gold}G',
    'gov.minRepTag': '🛡️ Rep ≥ {rep}',
    'gov.quotaHeader': '🛡️ Anti-Dilution Bucket Cap (Inside 85% Merit Pool)',
    'gov.quotaProofHint': 'Peripheral farming capped ≤30% — zero core dilution',
    'gov.coreBarLabel': '🔥 Core Builders {cap}% ({pts} pt)',
    'gov.periphBarLabel': '⚙️ Peripheral ≤{cap}% ({pts} pt)',
    'badge.guildPendingReview': '⚖️ Pending Review',
    'modal.guild.submitForReview': '⚖️ Submit to 2-Stage Peer Review Queue (Standard Anti-Slop Flow)',
    'modal.guild.submitForReviewEnforced': '⚖️ Global Peer Review Required is ON (auto-queued after CI checks)',
    'workers.cooldownBadge': '⏳ Anti-Slop Cooldown ({sec}s)',
    'workers.strikesBadge': '⚠️ Slop Strikes {strikes}/2',
    'admin.peerReviewTitle': '⚖️ Global 2-Stage Peer Review Required',
    'admin.peerReviewDesc': 'When enabled, all Guild bounties passing automated checks enter the Peer Review Queue for maintainer/builder merge approval.',
    'admin.peerReviewOn': '⚖️ Peer Review ON',
    'admin.peerReviewOff': '⚡ Optional Review',
    'toast.reviewApproved': '✅ Approved clean PR merge! Earned +{gold}G review bonus & +{pts} pts!',
    'toast.reviewRejected': '🚫 Blocked AI slop farm! Slashed & claimed +{stake}G stake!',
    'toast.reviewRejectedNoStake': '🚫 Blocked & rejected AI slop submission! 0 pts awarded & rep penalized!',
    'toast.reviewDecideFailed': 'Review decision failed: {err}',
    'toast.reviewRefreshed': '🔄 Peer review queue synced',
    'toast.guildQueuedForReview': '⚖️ Passed CI hard gate! Queued for Peer Review (AI Blind Review {score}/100) — review it above!',
    'toast.adminPeerReviewChanged': '⚖️ Global Peer Review Required set to: {state}',
  },
});

// ============================================================================
// Entity Localization Catalogs (100% Zero-Leak Trilingual Coverage)
// ============================================================================

const PROJECT_I18N = Object.freeze({
  'proj-meta': {
    'zh-TW': {
      name: '像素算力鎮 v1.0（創世 Meta 項目）',
      shortName: '像素算力鎮 v1.0',
      tagline: '用社群閒置算力一起把像素算力鎮推向公開上線，共享創世 5/85/10 多勞多得分紅池！',
      description: '這就是你正在體驗的創世 Meta 項目！零現金懸賞純靠熱血與分紅池驅動，完成 2~3 張雙軌任務即可衝到 100% 發布上線並即時分紅。',
      billboardText: '',
    },
    'zh-CN': {
      name: '像素算力镇 v1.0（创始 Meta 项目）',
      shortName: '像素算力镇 v1.0',
      tagline: '用社区闲置算力一起把像素算力镇推向公开上线，共享创始 5/85/10 多劳多得分红池！',
      description: '这就是你正在体验的创始 Meta 项目！零现金悬赏纯靠热血与分红池驱动，完成 2~3 张双轨任务即可冲到 100% 发布上线并实时分红。',
      billboardText: '',
    },
    en: {
      name: 'PixelCompute Town v1.0 (Genesis Meta Project)',
      shortName: 'PixelCompute v1.0',
      tagline: 'Pool idle community AI compute to launch PixelCompute Town and share the 5/85/10 merit revenue pool!',
      description: 'This is the live Genesis Meta Project you are playing right now! Zero cash bounty, pure co-op merit pool — complete 2-3 tasks to reach 100% and launch.',
      billboardText: '',
    },
  },
  'proj-i18n': {
    'zh-TW': {
      name: 'i18n-PixelBot（開源多語系插件）',
      shortName: 'i18n-PixelBot',
      tagline: '自動掃描 Repo 並以 Gemini Flash 開出精準多語系 PR 的開源插件，含真實現金懸賞！',
      description: '專為獨立開發者與開源維護者打造的多語系自動化工具。內含社群企業贊助的 $40 / $25 / $10 現金懸賞任務，加上 5/85/10 商業授權收益多勞多得分紅池。',
      billboardText: '🔥 i18n-PixelBot $40/$25 現金懸賞徵求高手！',
    },
    'zh-CN': {
      name: 'i18n-PixelBot（开源多语言插件）',
      shortName: 'i18n-PixelBot',
      tagline: '自动扫描 Repo 并以 Gemini Flash 开出精准多语言 PR 的开源插件，含真实现金悬赏！',
      description: '专为独立开发者与开源维护者打造的多语言自动化工具。内含社区企业赞助的 $40 / $25 / $10 现金悬赏任务，加上 5/85/10 商业授权收益多劳多得分红池。',
      billboardText: '🔥 i18n-PixelBot $40/$25 现金悬赏征求高手！',
    },
    en: {
      name: 'i18n-PixelBot (Open-Source Localization Plugin)',
      shortName: 'i18n-PixelBot',
      tagline: 'Open-source plugin that scans repos and opens crisp i18n PRs with Gemini Flash — with live cash bounties!',
      description: 'Automated localization CLI & GitHub Action for indie devs. Includes sponsored $40 / $25 / $10 cash bounties plus a 5/85/10 merit commercial license revenue pool.',
      billboardText: '🔥 i18n-PixelBot $40/$25 Cash Bounties Open Now!',
    },
  },
  'proj-pomo': {
    'zh-TW': {
      name: 'PixelPomo（像素番茄鐘獨立工具）',
      shortName: 'PixelPomo',
      tagline: '結合 8-bit 咖啡館白噪音與 GitHub Commit 連擊統計的療癒像素番茄鐘。',
      description: '目前在孵化廣場獲得 8 / 10 票，只差最後 2 票就會自動破土動工轉為建設中，並立刻生成 5 張雙軌算力任務！',
      billboardText: '',
    },
    'zh-CN': {
      name: 'PixelPomo（像素番茄钟独立工具）',
      shortName: 'PixelPomo',
      tagline: '结合 8-bit 咖啡馆白噪音与 GitHub Commit 连击统计的治愈像素番茄钟。',
      description: '目前在孵化广场获得 8 / 10 票，只差最后 2 票就会自动破土动工转为建设中，并立刻生成 5 张双轨算力任务！',
      billboardText: '',
    },
    en: {
      name: 'PixelPomo (Indie Pixel Pomodoro App)',
      shortName: 'PixelPomo',
      tagline: 'Cozy pixel Pomodoro timer combining 8-bit cafe lo-fi ambience with GitHub commit streak stats.',
      description: 'Needs just 2 more community votes to break ground automatically and spawn 5 dual-track compute tasks!',
      billboardText: '',
    },
  },
});

const TASK_I18N = Object.freeze({
  'task-meta-i18n': {
    'zh-TW': {
      title: '翻譯小鎮商店與公告介面為 en / ja 多語系 JSON',
      description: '將像素算力鎮核心 HUD 與商店按鈕文案翻譯為自然流暢的英文與日文，供全球開源社群遊玩。',
      acceptanceCriteria: ['輸出必須為可解析的合法 JSON', '必須包含 en 與 ja 兩個頂層語系物件且所有欄位皆已完成翻譯'],
    },
    'zh-CN': {
      title: '翻译小镇商店与公告界面为 en / ja 多语言 JSON',
      description: '将像素算力镇核心 HUD 与商店按钮文案翻译为自然流畅的英文与日文，供全球开源社区游玩。',
      acceptanceCriteria: ['输出必须为可解析的合法 JSON', '必须包含 en 与 ja 两个顶层语言对象且所有字段皆已完成翻译'],
    },
    en: {
      title: 'Translate Town Shop & Announcement UI into en / ja JSON',
      description: 'Localize core HUD and shop button copy into natural English and Japanese JSON for the global open-source community.',
      acceptanceCriteria: ['Output must be valid parseable JSON', 'Must include both en and ja top-level locale objects with all fields translated'],
    },
  },
  'task-meta-spec': {
    'zh-TW': {
      title: '制定夜市限定像素精靈與霓虹看板配色表 JSON',
      description: '設計「賽博夜市」活動主題色盤與 3 組霓虹招牌像素動畫規格，讓小鎮夜晚更吸睛。',
      acceptanceCriteria: ['必須為合法 JSON 物件，含 palette 與 billboardFrames 欄位', '所有色碼需為合理十六進位格式，內容不可重複敷衍'],
    },
    'zh-CN': {
      title: '制定夜市限定像素精灵与霓虹看板配色表 JSON',
      description: '设计「赛博夜市」活动主题色盘与 3 组霓虹招牌像素动画规格，让小镇夜晚更吸睛。',
      acceptanceCriteria: ['必须为合法 JSON 对象，含 palette 与 billboardFrames 字段', '所有色码需为合理十六进制格式，内容不可重复敷衍'],
    },
    en: {
      title: 'Design Cyber Night Market Sprite & Neon Billboard Palette JSON',
      description: 'Create a Cyber Night Market color palette and 3 animated neon signage specs to light up the town at night.',
      acceptanceCriteria: ['Valid JSON object containing palette and billboardFrames fields', 'Valid hex colors with concrete, non-repetitive definitions'],
    },
  },
  'task-meta-docs': {
    'zh-TW': {
      title: '整理 BYOK 零信任安全架構與防刷單白皮書摘要',
      description: '為準備在 Show HN 與 Product Hunt 發布的創世版本撰寫精煉的安全與公平機制說明。',
      acceptanceCriteria: ['使用清晰的 Markdown 標題或條列結構', '明確涵蓋 BYOK、BYOT 與驗收防作弊要點'],
    },
    'zh-CN': {
      title: '整理 BYOK 零信任安全架构与防刷单白皮书摘要',
      description: '为准备在 Show HN 与 Product Hunt 发布的创始版本撰写精炼的安全与公平机制说明。',
      acceptanceCriteria: ['使用清晰的 Markdown 标题或条列结构', '明确涵盖 BYOK、BYOT 与验收防作弊要点'],
    },
    en: {
      title: 'Draft Zero-Trust BYOK Security & Anti-Cheat Whitepaper Summary',
      description: 'Write a concise security and fairness explainer for the Show HN and Product Hunt launch.',
      acceptanceCriteria: ['Well-structured Markdown headings or bullet points', 'Clearly covers BYOK zero-trust, BYOT compliance, and Proof of Accepted Work'],
    },
  },
  'task-meta-pr': {
    'zh-TW': {
      title: '實作小鎮鍵盤快捷鍵導覽與快速切換建築視角 PR',
      description: '使用本機 Gemini CLI 或 Claude Code 實作 1~5 分頁快捷鍵與建築高亮焦點切換，提升桌面端操作爽感。',
      acceptanceCriteria: ['提供完整程式碼實作或合法 GitHub PR 連結', '正確處理 input / textarea 焦點保護邏輯'],
    },
    'zh-CN': {
      title: '实现小镇键盘快捷键导航与快速切换建筑视角 PR',
      description: '使用本机 Gemini CLI 或 Claude Code 实现 1~5 分页快捷键与建筑高亮焦点切换，提升桌面端操作手感。',
      acceptanceCriteria: ['提供完整代码实现或合法 GitHub PR 链接', '正确处理 input / textarea 焦点保护逻辑'],
    },
    en: {
      title: 'Implement Keyboard Shortcuts & Quick Building Focus PR',
      description: 'Use local Gemini CLI or Claude Code to add 1-5 tab hotkeys and instant building focus navigation for desktop users.',
      acceptanceCriteria: ['Complete ES module code or valid GitHub PR URL', 'Safely ignores keystrokes while typing inside input/textarea elements'],
    },
  },
  'task-meta-bugfix': {
    'zh-TW': {
      title: '修復 SSE 斷線重連後小人動畫狀態閃爍問題',
      description: '針對瀏覽器休眠喚醒後 EventSource 重連的邊界狀況，加入退避重試與狀態版本號去重。',
      acceptanceCriteria: ['提供明確的指數退避重連邏輯程式碼或 GitHub PR URL', '避免重複註冊事件監聽器造成記憶體洩漏'],
    },
    'zh-CN': {
      title: '修复 SSE 断线重连后小人动画状态闪烁问题',
      description: '针对浏览器休眠唤醒后 EventSource 重连的边界状况，加入退避重试与状态版本号去重。',
      acceptanceCriteria: ['提供明确的指数退避重连逻辑代码或 GitHub PR URL', '避免重复注册事件监听器造成内存泄漏'],
    },
    en: {
      title: 'Fix Pixel Worker Animation Flicker After SSE Reconnect',
      description: 'Handle browser sleep/wake EventSource reconnects cleanly using exponential backoff and timestamp deduplication.',
      acceptanceCriteria: ['Clear exponential backoff reconnect code or valid GitHub PR URL', 'Prevents duplicate event listener leaks'],
    },
  },
  'task-i18n-locales': {
    'zh-TW': {
      title: '[$10 懸賞] 批次翻譯 CLI 錯誤碼表（zh-TW / en / ja / ko）',
      description: '為 i18n-PixelBot 補齊 4 語系 CLI 診斷錯誤訊息，驗收通過直接入帳 $9（含 10% 平臺託管費）。',
      acceptanceCriteria: ['合法 JSON 格式，包含 4 個語系物件與對應錯誤碼', '保留變數佔位符語意且不可缺漏鍵值'],
    },
    'zh-CN': {
      title: '[$10 悬赏] 批量翻译 CLI 错误码表（zh-TW / en / ja / ko）',
      description: '为 i18n-PixelBot 补齐 4 语系 CLI 诊断错误消息，验收通过直接入账 $9（含 10% 平台托管费）。',
      acceptanceCriteria: ['合法 JSON 格式，包含 4 个语系对象与对应错误码', '保留变量占位符语义且不可缺漏键值'],
    },
    en: {
      title: '[$10 Bounty] Batch-Translate CLI Error Codes (zh-TW / en / ja / ko)',
      description: 'Complete 4-locale CLI diagnostic messages for i18n-PixelBot. Earns $9 net upon verification (10% platform escrow fee).',
      acceptanceCriteria: ['Valid JSON with 4 locale objects and all error codes', 'Preserves variable placeholders with zero missing keys'],
    },
  },
  'task-i18n-tests': {
    'zh-TW': {
      title: '為 ICU 複數語法解析器撰寫邊界單元測試',
      description: '補足英文單複數、巢狀佔位符與跳脫字元的 node:test 測試組，提高開源插件可靠度。',
      acceptanceCriteria: ['包含 node:test 與 assert 斷言程式碼', '測試至少覆蓋 3 種邊界情境'],
    },
    'zh-CN': {
      title: '为 ICU 复数语法解析器撰写边界单元测试',
      description: '补足英文单复数、嵌套占位符与转义字符的 node:test 测试组，提高开源插件可靠度。',
      acceptanceCriteria: ['包含 node:test 与 assert 断言代码', '测试至少覆盖 3 种边界情境'],
    },
    en: {
      title: 'Write Edge-Case Unit Tests for ICU Plural Parser',
      description: 'Add node:test suites covering English plurals, nested placeholders, and escaped characters to harden the plugin.',
      acceptanceCriteria: ['Includes node:test and assert test code', 'Covers at least 3 distinct edge cases'],
    },
  },
  'task-i18n-qa': {
    'zh-TW': {
      title: '巡檢開源範本語系檔佔位符一致性與缺漏報告',
      description: '自動比對基準語系與目標語系中的 `{name}`、`{count}` 佔位符是否遭誤翻或遺漏。',
      acceptanceCriteria: ['精準指出 {user} 與 {name} 不一致問題', '以條列或表格輸出明確修復方案'],
    },
    'zh-CN': {
      title: '巡检开源模板语系档占位符一致性与缺漏报告',
      description: '自动比对基准语系与目标语系中的 `{name}`、`{count}` 占位符是否遭误翻或遗漏。',
      acceptanceCriteria: ['精准指出 {user} 与 {name} 不一致问题', '以条列或表格输出明确修复方案'],
    },
    en: {
      title: 'Audit Open-Source Locale Placeholder Consistency & Missing Keys',
      description: 'Diff base and target locale templates to catch mistyped or missing `{name}` / `{count}` placeholders.',
      acceptanceCriteria: ['Pinpoints the {user} vs {name} placeholder mismatch', 'Provides an actionable Markdown list or table of fixes'],
    },
  },
  'task-i18n-ast-pr': {
    'zh-TW': {
      title: '[$40 現金懸賞] 支援 TypeScript JSX AST 自動抽取翻譯鍵值',
      description: '高價值工會懸賞！為 i18n-PixelBot 加入靜態語法分析器，精準抽取 t("key") 與 <Trans> 節點並產出差異報表。',
      acceptanceCriteria: ['提供完整實作程式碼或有效 GitHub PR 連結', '處理單引號、雙引號與 JSX 屬性萃取並附測試範例'],
    },
    'zh-CN': {
      title: '[$40 现金悬赏] 支持 TypeScript JSX AST 自动抽取翻译键值',
      description: '高价值工会悬赏！为 i18n-PixelBot 加入静态语法分析器，精准抽取 t("key") 与 <Trans> 节点并产出差异报表。',
      acceptanceCriteria: ['提供完整实现代码或有效 GitHub PR 链接', '处理单引号、双引号与 JSX 属性萃取并附测试示例'],
    },
    en: {
      title: '[$40 Cash Bounty] TypeScript JSX AST Translation Key Extractor',
      description: 'High-value Guild bounty! Build a static analyzer for i18n-PixelBot to extract t("key") and <Trans> nodes with diff reports.',
      acceptanceCriteria: ['Complete implementation code or valid GitHub PR URL', 'Handles single/double quotes and JSX attributes with test examples'],
    },
  },
  'task-i18n-gh-action': {
    'zh-TW': {
      title: '[$25 現金懸賞] 修復 GitHub Action PR Comment 權限與重試邏輯',
      description: '解決外部 Fork PR 觸發 Action 時因權限不足導致翻譯報表留言失敗的問題，補上 429 限流退避重試。',
      acceptanceCriteria: ['提供正確權限設定與重試邏輯程式碼或 GitHub PR URL', '確保不暴露任何 repository secret 給不受信任 fork'],
    },
    'zh-CN': {
      title: '[$25 现金悬赏] 修复 GitHub Action PR Comment 权限与重试逻辑',
      description: '解决外部 Fork PR 触发 Action 时因权限不足导致翻译报表留言失败的问题，补上 429 限流退避重试。',
      acceptanceCriteria: ['提供正确权限设置与重试逻辑代码或 GitHub PR URL', '确保不暴露任何 repository secret 给不受信任 fork'],
    },
    en: {
      title: '[$25 Cash Bounty] Fix GitHub Action Fork PR Comment Permissions & Retry',
      description: 'Resolve permission errors when posting i18n reports on external fork PRs and add 429 exponential backoff retries.',
      acceptanceCriteria: ['Safe workflow permissions + retry code or valid GitHub PR URL', 'Never exposes repository secrets to untrusted forks'],
    },
  },
});

const WORKER_NAME_I18N = Object.freeze({
  'w-flash-01': {
    'zh-TW': '閃電小吉 (Flash-01)',
    'zh-CN': '闪电小吉 (Flash-01)',
    en: 'Volt Kitty (Flash-01)',
  },
  'w-pro-01': {
    'zh-TW': '架構師阿瓜 (Pro-01)',
    'zh-CN': '架构师阿瓜 (Pro-01)',
    en: 'Architect Owl (Pro-01)',
  },
});

const WORKER_ROLE_I18N = Object.freeze({
  flash_worker: {
    'zh-TW': '⚡ 快閃工坊員',
    'zh-CN': '⚡ 快闪工坊员',
    en: '⚡ Flash Engineer',
  },
  pro_architect: {
    'zh-TW': '🧠 工會架構師',
    'zh-CN': '🧠 工会架构师',
    en: '🧠 Guild Architect',
  },
  pixel_artist: {
    'zh-TW': '🎨 像素美術工',
    'zh-CN': '🎨 像素美术工',
    en: '🎨 Pixel Artist',
  },
  guild_artisan: {
    'zh-TW': '🔨 懸賞匠人',
    'zh-CN': '🔨 悬赏匠人',
    en: '🔨 Guild Artisan',
  },
});

const SKIN_I18N = Object.freeze({
  default: { 'zh-TW': '經典原色', 'zh-CN': '经典原色', en: 'Classic Original' },
  'skin-cyber': { 'zh-TW': '⚡ 賽博霓虹', 'zh-CN': '⚡ 赛博霓虹', en: '⚡ Cyber Neon' },
  'skin-cat': { 'zh-TW': '🐱 像素貓耳', 'zh-CN': '🐱 像素猫耳', en: '🐱 Pixel Cat Ears' },
  'skin-gold': { 'zh-TW': '👑 創世黃金', 'zh-CN': '👑 创始黄金', en: '👑 Genesis Gold' },
});

const STREAM_I18N = Object.freeze({
  bounty_fee: { 'zh-TW': '⚔️ 懸賞 10% 抽成', 'zh-CN': '⚔️ 悬赏 10% 抽成', en: '⚔️ 10% Bounty Fee' },
  incubation_carry: { 'zh-TW': '🚀 孵化分紅 10%', 'zh-CN': '🚀 孵化分红 10%', en: '🚀 10% Carry' },
  billboard_ad: { 'zh-TW': '📺 霓虹廣告位', 'zh-CN': '📺 霓虹广告位', en: '📺 Neon Billboard' },
  pro_skin: { 'zh-TW': '✨ 外觀 / Pro', 'zh-CN': '✨ 外观 / Pro', en: '✨ Skins / Pro' },
});

const SHOP_ITEM_I18N = Object.freeze({
  'skin-cyber': {
    'zh-TW': { name: '賽博霓虹塗裝', desc: '為算力小人換上青紫霓虹流光機甲外框，敲鍵盤自帶賽博氣場。', tag: '像素皮膚' },
    'zh-CN': { name: '赛博霓虹涂装', desc: '为算力小人换上青紫霓虹流光机甲外框，敲键盘自带赛博气场。', tag: '像素皮肤' },
    en: { name: 'Cyber Neon Armor', desc: 'Equips your worker with a glowing cyan-violet cyber visor and mech aura.', tag: 'Pixel Skin' },
  },
  'skin-cat': {
    'zh-TW': { name: '像素貓耳頭飾', desc: '可愛像素貓耳與暖粉耳機套裝，宿舍喝咖啡回血更有療癒感。', tag: '像素皮膚' },
    'zh-CN': { name: '像素猫耳头饰', desc: '可爱像素猫耳与暖粉耳机套装，宿舍喝咖啡回血更有治愈感。', tag: '像素皮肤' },
    en: { name: 'Pixel Cat-Ear Headset', desc: 'Cozy sakura-pink cat ears & headphones for maximum Lounge coffee vibes.', tag: 'Pixel Skin' },
  },
  'skin-gold': {
    'zh-TW': { name: '創世黃金塗裝', desc: '創世元老專屬黃金光暈皮膚，站在廣場一眼就能被認出來。', tag: '限定皮膚' },
    'zh-CN': { name: '创始黄金涂装', desc: '创始元老专属黄金光晕皮肤，站在广场一眼就能被认出来。', tag: '限定皮肤' },
    en: { name: 'Genesis Gold Aura', desc: 'Exclusive golden halo skin for founding builders — shines across every room.', tag: 'Limited Skin' },
  },
  'decor-neon-rack': {
    'zh-TW': { name: '霓虹超頻機櫃', desc: '升級自動工坊伺服器機櫃燈效，增添像素機房硬核氛圍。', tag: '機房裝潢' },
    'zh-CN': { name: '霓虹超频机柜', desc: '升级自动工坊服务器机柜灯效，增添像素机房硬核氛围。', tag: '机房装潢' },
    en: { name: 'Neon Overclock Rack', desc: 'Upgrades Auto Factory server racks with pulsing neon overclock LEDs.', tag: 'Room Decor' },
  },
  'decor-espresso': {
    'zh-TW': { name: '手沖像素咖啡機', desc: '讓算力宿舍飄出雙倍像素咖啡蒸氣，提升小鎮溫馨值。', tag: '宿舍裝潢' },
    'zh-CN': { name: '手冲像素咖啡机', desc: '让算力宿舍飘出双倍像素咖啡蒸汽，提升小镇温馨值。', tag: '宿舍装潢' },
    en: { name: 'Artisan Pixel Espresso', desc: 'Upgrades the Compute Lounge bar with golden espresso steam.', tag: 'Lounge Decor' },
  },
  'pro-pass-monthly': {
    'zh-TW': { name: '像素鎮 Pro 通行證（月）', desc: '解鎖專屬金框《算力打工證》、創世 Pro 徽章與平臺開發贊助支持（不影響公平性）。', tag: 'PRO 會員' },
    'zh-CN': { name: '像素镇 Pro 通行证（月）', desc: '解锁专属金框《算力打工证》、创始 Pro 徽章与平台开发赞助支持（不影响公平性）。', tag: 'PRO 会员' },
    en: { name: 'Pixel Town Pro Pass (Monthly)', desc: 'Unlocks gold-framed Work Certificate, Pro Founder badge & supports server hosting (zero pay-to-win).', tag: 'PRO PASS' },
  },
  'founder-skin-bundle': {
    'zh-TW': { name: '創世限定外觀大禮包', desc: '一次收藏全部 3 款像素小人限定塗裝，100% 計入小鎮伺服器維護與創作者收入。', tag: '創世贊助' },
    'zh-CN': { name: '创始限定外观大礼包', desc: '一次收藏全部 3 款像素小人限定涂装，100% 计入小镇服务器维护与创作者收入。', tag: '创始赞助' },
    en: { name: 'Genesis Founder Skin Bundle', desc: 'Collect all 3 exclusive HD pixel skins at once. 100% supports server upkeep & indie creator.', tag: 'Founder Pack' },
  },
  'shop-pro-pass': {
    'zh-TW': { name: '像素鎮 Pro 通行證（月）', desc: '解鎖專屬金框《算力打工證》與創世 Pro 徽章。', tag: 'PRO 會員' },
    'zh-CN': { name: '像素镇 Pro 通行证（月）', desc: '解锁专属金框《算力打工证》与创始 Pro 徽章。', tag: 'PRO 会员' },
    en: { name: 'Pixel Town Pro Pass (Monthly)', desc: 'Unlocks gold-framed Work Certificate & Pro Founder badge.', tag: 'PRO PASS' },
  },
  'shop-genesis-pack': {
    'zh-TW': { name: '創世限定外觀大禮包', desc: '一次收藏全部 3 款像素小人限定塗裝。', tag: '創世贊助' },
    'zh-CN': { name: '创始限定外观大礼包', desc: '一次收藏全部 3 款像素小人限定涂装。', tag: '创始赞助' },
    en: { name: 'Genesis Founder Skin Bundle', desc: 'Collect all 3 exclusive HD pixel skins at once.', tag: 'Founder Pack' },
  },
  'billboard-ad': {
    'zh-TW': { name: '像素廣場霓虹廣告位', desc: '點亮小鎮孵化廣場霓虹大招牌並置頂曝光 7 天。', tag: '霓虹廣告' },
    'zh-CN': { name: '像素广场霓虹广告位', desc: '点亮小镇孵化广场霓虹大招牌并置顶曝光 7 天。', tag: '霓虹广告' },
    en: { name: 'Plaza Neon Billboard Ad', desc: 'Light up the Launchpad neon billboard & pin your project for 7 days.', tag: 'Neon Ad' },
  },
});

const ACHIEVEMENT_I18N = Object.freeze({
  first_blood: {
    'zh-TW': { name: '首單開張', description: '完成並通過 Proof of Accepted Work 驗收你的第 1 張算力任務。' },
    'zh-CN': { name: '首单开张', description: '完成并通过 Proof of Accepted Work 验收你的第 1 张算力任务。' },
    en: { name: 'First Blood', description: 'Complete and verify your very first compute task via Proof of Accepted Work.' },
  },
  dual_track_master: {
    'zh-TW': { name: '雙軌大師', description: '同時在「自動工坊 (API)」與「懸賞工會 (額度)」兩條軌道各完成至少 1 張任務。' },
    'zh-CN': { name: '双轨大师', description: '同时在「自动工坊 (API)」与「悬赏工会 (额度)」两条轨道各完成至少 1 张任务。' },
    en: { name: 'Dual-Track Master', description: 'Verify at least 1 task on both Auto Factory (API) and Bounty Guild (Quota).' },
  },
  community_builder: {
    'zh-TW': { name: '立項推手', description: '參與社群投票，親手讓一個孵化提案達標並自動生成雙軌任務。' },
    'zh-CN': { name: '立项推手', description: '参与社区投票，亲手让一个孵化提案达标并自动生成双轨任务。' },
    en: { name: 'Community Builder', description: 'Vote a project proposal over the threshold to break ground & spawn tasks.' },
  },
  launch_founder: {
    'zh-TW': { name: '上線創世者', description: '將一個孵化項目推進至 100% 並成功發布上線點燃煙火。' },
    'zh-CN': { name: '上线创世者', description: '将一个孵化项目推进至 100% 并成功发布上线点燃烟火。' },
    en: { name: 'Launch Founder', description: 'Push an incubated project to 100% and launch it with town fireworks.' },
  },
  dividend_earner: {
    'zh-TW': { name: '首批分紅股東', description: '從已上線項目的 5/85/10 多勞多得透明分紅池中領取到真實美金分紅。' },
    'zh-CN': { name: '首批分红股东', description: '从已上线项目的 5/85/10 多劳多得透明分红池中领取到真实美金分红。' },
    en: { name: 'Dividend Earner', description: 'Receive USD dividends from a launched project’s 5/85/10 merit revenue pool.' },
  },
  cli_pioneer: {
    'zh-TW': { name: '本機 CLI 先鋒', description: '透過本機 pixel-worker CLI 橋接器發送即時心跳同步像素小人狀態。' },
    'zh-CN': { name: '本机 CLI 先锋', description: '通过本机 pixel-worker CLI 桥接器发送实时心跳同步像素小人状态。' },
    en: { name: 'Local CLI Pioneer', description: 'Stream a live local heartbeat via the pixel-worker CLI bridge.' },
  },
});

const NPC_USER_I18N = Object.freeze({
  'npc-kuro': { 'zh-TW': '算力武士 Kuro', 'zh-CN': '算力武士 Kuro', en: 'Compute Ronin Kuro' },
  'npc-momo': { 'zh-TW': '像素貓 Momo', 'zh-CN': '像素猫 Momo', en: 'Pixel Cat Momo' },
  'npc-yuna': { 'zh-TW': '星雲織女 Yuna', 'zh-CN': '星云织女 Yuna', en: 'Nebula Weaver Yuna' },
  'npc-rin': { 'zh-TW': '架構師 Rin', 'zh-CN': '架构师 Rin', en: 'Architect Rin' },
  'npc-zero': { 'zh-TW': '夜貓工程師 Zero', 'zh-CN': '夜猫工程师 Zero', en: 'Night Owl Zero' },
  'npc-slopbot': { 'zh-TW': '刷單機器人 SlopBot-99', 'zh-CN': '刷单机器人 SlopBot-99', en: 'Spam Bot SlopBot-99' },
  'founder-demo': { 'zh-TW': '創始鎮長 (Demo)', 'zh-CN': '创始镇长 (Demo)', en: 'Founding Mayor (Demo)' },
});

const REVIEW_ITEM_I18N = Object.freeze({
  'rev-clean-01': {
    'zh-TW': {
      taskTitle: '實作小鎮鍵盤快捷鍵導覽與快速切換建築視角 PR',
      projectName: '像素算力鎮 v1.0',
      submitterName: '架構師 Rin',
      summary: '跨模型 AI 盲審評分 94/100：結構精煉、焦點保護完備、CI 單元測試全綠，極低注水風險。',
      flags: ['✅ CI 測試全綠', '✅ 零冗餘注水', '✅ 符合核心架構規範'],
      contentPreview:
        'export function bindTownHotkeys(onTabSwitch) {\n  window.addEventListener("keydown", (e) => {\n    if (/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)) return;\n    const map = { "1": "factory", "2": "guild", "3": "incubator", "4": "workers", "5": "revenue" };\n    if (map[e.key]) onTabSwitch(map[e.key]);\n  });\n}\n// 6/6 unit tests passed (0 warnings)',
    },
    'zh-CN': {
      taskTitle: '实现小镇键盘快捷键导航与快速切换建筑视角 PR',
      projectName: '像素算力镇 v1.0',
      submitterName: '架构师 Rin',
      summary: '跨模型 AI 盲审评分 94/100：结构精炼、焦点保护完备、CI 单元测试全绿，极低注水风险。',
      flags: ['✅ CI 测试全绿', '✅ 零冗余注水', '✅ 符合核心架构规范'],
      contentPreview:
        'export function bindTownHotkeys(onTabSwitch) {\n  window.addEventListener("keydown", (e) => {\n    if (/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)) return;\n    const map = { "1": "factory", "2": "guild", "3": "incubator", "4": "workers", "5": "revenue" };\n    if (map[e.key]) onTabSwitch(map[e.key]);\n  });\n}\n// 6/6 unit tests passed (0 warnings)',
    },
    en: {
      taskTitle: 'Implement Keyboard Shortcuts & Quick Building Focus PR',
      projectName: 'PixelCompute v1.0',
      submitterName: 'Architect Rin',
      summary: 'Cross-model AI blind review 94/100: concise diff, safe input focus guard, all CI unit tests green, minimal bloat.',
      flags: ['✅ CI Tests Green', '✅ Zero Bloat', '✅ Core Architecture Compliant'],
      contentPreview:
        'export function bindTownHotkeys(onTabSwitch) {\n  window.addEventListener("keydown", (e) => {\n    if (/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)) return;\n    const map = { "1": "factory", "2": "guild", "3": "incubator", "4": "workers", "5": "revenue" };\n    if (map[e.key]) onTabSwitch(map[e.key]);\n  });\n}\n// 6/6 unit tests passed (0 warnings)',
    },
  },
  'rev-slop-01': {
    'zh-TW': {
      taskTitle: '[$40 現金懸賞] 支援 TypeScript JSX AST 自動抽取翻譯鍵值',
      projectName: 'i18n-PixelBot',
      submitterName: '刷單機器人 SlopBot-99',
      summary: '⚠️ 疑似低效垃圾 AI 瘋狂注水！Diff 暴增 +4,820 行（87% 重複無意義註解與空函式），建議立即駁回並沒收押金！',
      flags: ['⚠️ 87% 重複註解注水', '🚫 含大量空函式佔位符', '⚠️ Diff 異常暴增 (+4,820)'],
      contentPreview:
        '// Auto-generated helper wrapper #1 ... (repeated 1,240 times)\n// TODO: implement AST parser later\nexport function parseAstStub1() { return null; }\nexport function parseAstStub2() { return null; }\n// ... +4,800 lines of padded boilerplate comments ...',
    },
    'zh-CN': {
      taskTitle: '[$40 现金悬赏] 支持 TypeScript JSX AST 自动抽取翻译键值',
      projectName: 'i18n-PixelBot',
      submitterName: '刷单机器人 SlopBot-99',
      summary: '⚠️ 疑似低效垃圾 AI 疯狂注水！Diff 暴增 +4,820 行（87% 重复无意义注释与空函数），建议立即驳回并没收押金！',
      flags: ['⚠️ 87% 重复注释注水', '🚫 含大量空函数占位符', '⚠️ Diff 异常暴增 (+4,820)'],
      contentPreview:
        '// Auto-generated helper wrapper #1 ... (repeated 1,240 times)\n// TODO: implement AST parser later\nexport function parseAstStub1() { return null; }\nexport function parseAstStub2() { return null; }\n// ... +4,800 lines of padded boilerplate comments ...',
    },
    en: {
      taskTitle: '[$40 Cash Bounty] TypeScript JSX AST Translation Key Extractor',
      projectName: 'i18n-PixelBot',
      submitterName: 'Spam Bot SlopBot-99',
      summary: '⚠️ High-risk AI slop bloat detected! Diff ballooned +4,820 lines (87% repetitive comments & empty stubs) — reject to slash stake!',
      flags: ['⚠️ 87% Repetitive Comment Bloat', '🚫 Empty Stub Functions', '⚠️ Abnormal Diff Spike (+4,820)'],
      contentPreview:
        '// Auto-generated helper wrapper #1 ... (repeated 1,240 times)\n// TODO: implement AST parser later\nexport function parseAstStub1() { return null; }\nexport function parseAstStub2() { return null; }\n// ... +4,800 lines of padded boilerplate comments ...',
    },
  },
});

const BADGE_I18N = Object.freeze({
  '創世先鋒': { 'zh-TW': '創世先鋒', 'zh-CN': '创始先锋', en: 'Genesis Pioneer' },
  '工坊達人': { 'zh-TW': '工坊達人', 'zh-CN': '工坊达人', en: 'Factory Ace' },
  '提案之星': { 'zh-TW': '提案之星', 'zh-CN': '提案之星', en: 'Proposal Star' },
  'CLI 匠人': { 'zh-TW': 'CLI 匠人', 'zh-CN': 'CLI 匠人', en: 'CLI Artisan' },
  '創始鎮長': { 'zh-TW': '創始鎮長', 'zh-CN': '创始镇长', en: 'Founding Mayor' },
  '除蟲獵手': { 'zh-TW': '除蟲獵手', 'zh-CN': '除虫猎手', en: 'Bug Hunter' },
  '新進開發者': { 'zh-TW': '新進開發者', 'zh-CN': '新进开发者', en: 'New Builder' },
  '社群開發者': { 'zh-TW': '社群開發者', 'zh-CN': '社区开发者', en: 'Community Dev' },
  'PRO 鎮長': { 'zh-TW': 'PRO 鎮長', 'zh-CN': 'PRO 镇长', en: 'PRO Mayor' },
});

const NAME_TEXT_MAP = Object.freeze({
  '創始鎮長 (Demo)': { 'zh-TW': '創始鎮長 (Demo)', 'zh-CN': '创始镇长 (Demo)', en: 'Founding Mayor (Demo)' },
  '創始開發者': { 'zh-TW': '創始開發者', 'zh-CN': '创始开发者', en: 'Founder Dev' },
  '創始鎮長': { 'zh-TW': '創始鎮長', 'zh-CN': '创始镇长', en: 'Founding Mayor' },
  '算力武士 Kuro': NPC_USER_I18N['npc-kuro'],
  '像素貓 Momo': NPC_USER_I18N['npc-momo'],
  '星雲織女 Yuna': NPC_USER_I18N['npc-yuna'],
  '架構師 Rin': NPC_USER_I18N['npc-rin'],
  '夜貓工程師 Zero': NPC_USER_I18N['npc-zero'],
  '刷單機器人 SlopBot-99': NPC_USER_I18N['npc-slopbot'],
  '刷单机器人 SlopBot-99': NPC_USER_I18N['npc-slopbot'],
  '社群': { 'zh-TW': '社群', 'zh-CN': '社区', en: 'Community' },
  '閃電小吉 (Flash-01)': WORKER_NAME_I18N['w-flash-01'],
  '架構師阿瓜 (Pro-01)': WORKER_NAME_I18N['w-pro-01'],
  '閃電小吉': { 'zh-TW': '閃電小吉', 'zh-CN': '闪电小吉', en: 'Volt Kitty' },
  '架構師阿瓜': { 'zh-TW': '架構師阿瓜', 'zh-CN': '架构师阿瓜', en: 'Architect Owl' },
});

function translateKnownName(raw, loc) {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (NAME_TEXT_MAP[trimmed]) return NAME_TEXT_MAP[trimmed][loc] || trimmed;
  return trimmed;
}

// ============================================================================
// Dynamic Entity Localizer Exports
// ============================================================================

export function localizeUser(user, locale) {
  const loc = normalizeLocale(locale);
  if (!user || typeof user !== 'object') {
    return {
      displayName: loc === 'en' ? 'Founding Mayor (Demo)' : loc === 'zh-CN' ? '创始镇长 (Demo)' : '創始鎮長 (Demo)',
    };
  }
  const byId = user.id && NPC_USER_I18N[user.id];
  if (byId && (!user.displayName || NAME_TEXT_MAP[user.displayName] || user.id === 'founder-demo')) {
    return { displayName: byId[loc] };
  }
  const rawName = user.displayName || user.username || user.name || '創始鎮長 (Demo)';
  return {
    displayName: translateKnownName(rawName, loc),
  };
}

export function localizeProject(project, locale) {
  const loc = normalizeLocale(locale);
  if (!project || typeof project !== 'object') {
    return { name: '', shortName: '', tagline: '', description: '', billboardText: '', creatorName: '', originatorName: '' };
  }
  const known = project.id && PROJECT_I18N[project.id]?.[loc];
  const creatorName = translateKnownName(project.creatorName || (project.creatorId && NPC_USER_I18N[project.creatorId]?.[loc]) || '社群', loc);
  const originatorName = translateKnownName(
    project.originatorName || (project.originatorId && NPC_USER_I18N[project.originatorId]?.[loc]) || creatorName,
    loc,
  );
  if (known) {
    let billboardText = project.billboardText || '';
    if (billboardText && known.billboardText && billboardText === PROJECT_I18N[project.id]['zh-TW'].billboardText) {
      billboardText = known.billboardText;
    } else if (billboardText && loc !== 'zh-TW') {
      billboardText = localizeBillboardText(billboardText, known.shortName, loc);
    }
    return {
      name: known.name,
      shortName: known.shortName,
      tagline: known.tagline,
      description: known.description,
      billboardText,
      creatorName,
      originatorName,
    };
  }

  // Dynamic project (e.g., GitHub imported or user-proposed)
  let name = project.name || project.shortName || project.id || '';
  let shortName = project.shortName || name;
  let tagline = project.tagline || '';
  let description = project.description || '';
  let billboardText = project.billboardText || '';

  // Handle GitHub auto-created project tagline/description
  const ghTagMatch = tagline.match(/^自 GitHub 公開倉庫 (.+) 匯入之開源協作項目$/);
  if (ghTagMatch) {
    if (loc === 'zh-CN') tagline = `自 GitHub 公开仓库 ${ghTagMatch[1]} 导入之开源协作项目`;
    else if (loc === 'en') tagline = `Open-source collaboration project imported from GitHub repo ${ghTagMatch[1]}`;
  }
  const ghDescMatch = description.match(/^透過 GitHub Issues API 自動建立的社群孵化項目（(.+)）。$/);
  if (ghDescMatch) {
    if (loc === 'zh-CN') description = `通过 GitHub Issues API 自动创建的社区孵化项目（${ghDescMatch[1]}）。`;
    else if (loc === 'en') description = `Community incubator project auto-created via GitHub Issues API (${ghDescMatch[1]}).`;
  }

  if (billboardText) {
    billboardText = localizeBillboardText(billboardText, shortName, loc);
  }

  return { name, shortName, tagline, description, billboardText, creatorName, originatorName };
}

function localizeBillboardText(raw, shortName, loc) {
  if (!raw) return '';
  if (loc === 'zh-TW') return raw;
  const sponsorMatch = raw.match(/★\s*(.+?)\s*贊助徵求算力貢獻者！?/);
  if (sponsorMatch) {
    return loc === 'zh-CN'
      ? `★ ${shortName || sponsorMatch[1]} 赞助征求算力贡献者！`
      : `★ ${shortName || sponsorMatch[1]} Sponsored — Seeking Compute Builders!`;
  }
  const hotMatch = raw.match(/🔥\s*(.+?)\s*誠徵算力貢獻者！?/);
  if (hotMatch) {
    return loc === 'zh-CN'
      ? `🔥 ${shortName || hotMatch[1]} 诚征算力贡献者！`
      : `🔥 ${shortName || hotMatch[1]} Seeking Compute Contributors!`;
  }
  if (loc === 'zh-CN') {
    return raw.replaceAll('現金懸賞徵求高手', '现金悬赏征求高手').replaceAll('贊助徵求算力貢獻者', '赞助征求算力贡献者');
  }
  return raw;
}

export function localizeTask(task, locale) {
  const loc = normalizeLocale(locale);
  if (!task || typeof task !== 'object') {
    return { title: '', description: '', acceptanceCriteria: [], modelSuggestion: '' };
  }

  const known = task.id && TASK_I18N[task.id]?.[loc];
  if (known) {
    return {
      title: known.title,
      description: known.description,
      acceptanceCriteria: [...known.acceptanceCriteria],
      modelSuggestion: task.modelSuggestion || '',
    };
  }

  let title = String(task.title || '');
  let description = String(task.description || '');
  let criteria = Array.isArray(task.acceptanceCriteria) ? [...task.acceptanceCriteria] : [];

  // 1. Replace [離線預覽] prefix tag cleanly
  if (loc === 'zh-CN') {
    title = title.replace(/^\[離線預覽\]\s*/, '[离线预览] ');
  } else if (loc === 'en') {
    title = title.replace(/^\[(?:離線預覽|离线预览)\]\s*/, '[Offline Preview] ');
  }

  // 2. Match the 5 auto-generated task templates from generateTasksForProject(project)
  const mI18n = title.match(/^為《(.+?)》生成多語系介面文案 JSON（繁中／英文／日文）$/);
  if (mI18n) {
    const pName = mI18n[1];
    if (loc === 'zh-CN') {
      return {
        title: `为《${pName}》生成多语言界面文案 JSON（繁中／英文／日文）`,
        description: `将《${pName}》核心界面按钮、提示与欢迎语翻译为结构化多语言 JSON，供前端直接加载。`,
        acceptanceCriteria: ['必须为合法 JSON 对象，包含至少 2 个语言键值', '翻译需符合开源软件与独立产品自然语气，不可留白或占位符'],
        modelSuggestion: task.modelSuggestion || 'gemini-2.5-flash',
      };
    }
    if (loc === 'en') {
      return {
        title: `Generate Multilingual UI Copy JSON (zh-TW / en / ja) for ${pName}`,
        description: `Translate core UI buttons, tooltips, and welcome messages for ${pName} into clean frontend-ready JSON.`,
        acceptanceCriteria: ['Valid JSON object containing at least 2 locale keys', 'Natural indie/OSS phrasing with no empty strings or placeholders'],
        modelSuggestion: task.modelSuggestion || 'gemini-2.5-flash',
      };
    }
  }

  const mSpec = title.match(/^設計《(.+?)》像素視覺配色表與狀態圖示規格 JSON$/);
  if (mSpec) {
    const pName = mSpec[1];
    if (loc === 'zh-CN') {
      return {
        title: `设计《${pName}》像素视觉配色表与状态图标规格 JSON`,
        description: `产出《${pName}》的主题色盘、按钮状态色与像素图标规格 JSON，方便美术与前端快速套用。`,
        acceptanceCriteria: ['必须为合法 JSON 结构，包含 palette 与 icons 字段', '色码与图标描述需具体可用，不得为重复废话'],
        modelSuggestion: task.modelSuggestion || 'gemini-2.5-flash',
      };
    }
    if (loc === 'en') {
      return {
        title: `Design Pixel Palette & Status Icon Spec JSON for ${pName}`,
        description: `Produce theme color tokens, button states, and pixel icon specs in JSON for ${pName}.`,
        acceptanceCriteria: ['Valid JSON containing palette and icons fields', 'Concrete, usable hex codes and icon descriptions'],
        modelSuggestion: task.modelSuggestion || 'gemini-2.5-flash',
      };
    }
  }

  const mTest = title.match(/^撰寫《(.+?)》核心狀態機單元測試案例$/);
  if (mTest) {
    const pName = mTest[1];
    if (loc === 'zh-CN') {
      return {
        title: `撰写《${pName}》核心状态机单元测试用例`,
        description: `使用 Node.js 原生 node:test 与 assert 撰写《${pName}》核心功能与边界条件测试。`,
        acceptanceCriteria: ['包含标准 test() / assert 结构与断言逻辑', '涵盖正常路径与错误输入处理'],
        modelSuggestion: task.modelSuggestion || 'gemini-2.5-flash',
      };
    }
    if (loc === 'en') {
      return {
        title: `Write Core State-Machine Unit Tests for ${pName}`,
        description: `Create zero-dependency node:test & assert unit tests covering core logic and edge cases of ${pName}.`,
        acceptanceCriteria: ['Standard test() and assert assertions', 'Covers both happy paths and invalid input handling'],
        modelSuggestion: task.modelSuggestion || 'gemini-2.5-flash',
      };
    }
  }

  const mCorePr = title.match(/^實作《(.+?)》核心互動模組與鍵盤操作支援 PR$/);
  if (mCorePr) {
    const pName = mCorePr[1];
    if (loc === 'zh-CN') {
      return {
        title: `实现《${pName}》核心交互模块与键盘操作支持 PR`,
        description: `适合使用 Gemini CLI / Claude Code / Codex CLI 在本机完成核心功能骨架、状态持久化与键盘快捷键 PR。`,
        acceptanceCriteria: ['需提供可审阅之实现代码（含函数与模块导出）或合法 GitHub PR 链接', '说明主要设计决策与测试方式'],
        modelSuggestion: task.modelSuggestion || 'Gemini CLI / Claude Code',
      };
    }
    if (loc === 'en') {
      return {
        title: `Implement Core Interactive Module & Keyboard Support PR for ${pName}`,
        description: `Ideal for Gemini CLI / Claude Code / Codex CLI: build the core module, state persistence, and keyboard shortcuts PR.`,
        acceptanceCriteria: ['Reviewable module code (functions & exports) or valid GitHub PR URL', 'Explains key design choices and test steps'],
        modelSuggestion: task.modelSuggestion || 'Gemini CLI / Claude Code',
      };
    }
  }

  const mQaPr = title.match(/^完善《(.+?)》異常恢復機制與上線發佈腳本$/);
  if (mQaPr) {
    const pName = mQaPr[1];
    if (loc === 'zh-CN') {
      return {
        title: `完善《${pName}》异常恢复机制与上线发布脚本`,
        description: `检查边界状态、修补潜在竞态问题，并提供开箱即用的打包或一键启动脚本。`,
        acceptanceCriteria: ['包含具体修补代码或合法 GitHub PR URL', '列出至少两项已验证的边界情境'],
        modelSuggestion: task.modelSuggestion || 'Codex CLI / Claude Code',
      };
    }
    if (loc === 'en') {
      return {
        title: `Harden Error Recovery & Launch Scripts for ${pName}`,
        description: `Audit edge states, fix race conditions, and ship an out-of-the-box startup/release script for ${pName}.`,
        acceptanceCriteria: ['Concrete patch code or valid GitHub PR URL', 'Lists at least two verified edge-case scenarios'],
        modelSuggestion: task.modelSuggestion || 'Codex CLI / Claude Code',
      };
    }
  }

  // 3. Match GitHub offline-preview fallback issue templates
  const ghFallback1 = title.match(/^(\[[^\]]+\]\s*)?為 (.+?) 補齊繁中／英文 README 與快速上手文件$/);
  if (ghFallback1) {
    const pref = ghFallback1[1] || '';
    const repo = ghFallback1[2];
    if (loc === 'zh-CN') {
      title = `${pref}为 ${repo} 补齐繁中／英文 README 与快速上手文档`;
      description = `为开源仓库 ${repo} 整理安装步骤、环境变量说明与常见问题 FAQ，降低新贡献者门槛。`;
    } else if (loc === 'en') {
      title = `${pref}Complete Bilingual README & Quickstart Docs for ${repo}`;
      description = `Organize setup steps, environment variables, and FAQ for ${repo} to welcome new open-source contributors.`;
    }
  }

  const ghFallback2 = title.match(/^(\[[^\]]+\]\s*)?為 (.+?) 補齊核心模組邊界條件單元測試$/);
  if (ghFallback2) {
    const pref = ghFallback2[1] || '';
    const repo = ghFallback2[2];
    if (loc === 'zh-CN') {
      title = `${pref}为 ${repo} 补齐核心模块边界条件单元测试`;
      description = `针对 ${repo} 的核心逻辑补充 node:test 单元测试与异常输入保护。`;
    } else if (loc === 'en') {
      title = `${pref}Add Edge-Case Unit Tests for ${repo} Core Modules`;
      description = `Add node:test unit tests and invalid-input guards for ${repo}'s core logic.`;
    }
  }

  const ghFallback3 = title.match(/^(\[[^\]]+\]\s*)?修復 (.+?) 異常重試與設定檔解析邊界問題$/);
  if (ghFallback3) {
    const pref = ghFallback3[1] || '';
    const repo = ghFallback3[2];
    if (loc === 'zh-CN') {
      title = `${pref}修复 ${repo} 异常重试与配置文件解析边界问题`;
      description = `检视 ${repo} 在缺少可选字段或网络超时情境下的错误处理，提供可合并 PR 或修补代码。`;
    } else if (loc === 'en') {
      title = `${pref}Fix Retry Backoff & Config Parsing Edge Cases in ${repo}`;
      description = `Audit error handling for missing config fields and network timeouts in ${repo} with a mergeable PR or patch.`;
    }
  }

  // Generic GitHub imported description & criteria
  const ghDesc = description.match(/^自 GitHub 倉庫 (.+) 匯入的開放 Issue #(\d+)。$/);
  if (ghDesc) {
    if (loc === 'zh-CN') description = `自 GitHub 仓库 ${ghDesc[1]} 导入的开放 Issue #${ghDesc[2]}。`;
    else if (loc === 'en') description = `Open GitHub Issue #${ghDesc[2]} imported from ${ghDesc[1]}.`;
  }

  criteria = criteria.map((c) => {
    if (loc === 'zh-TW') return c;
    const c1 = c.match(/^符合 (.+) 類別的結構化輸出格式（如 JSON \/ Markdown \/ 單元測試）$/);
    if (c1) {
      return loc === 'zh-CN'
        ? `符合 ${c1[1]} 类别的结构化输出格式（如 JSON / Markdown / 单元测试）`
        : `Matches structured output format for ${c1[1]} (JSON / Markdown / unit tests)`;
    }
    const c2 = c.match(/^明確回應 (.+) Issue #(\d+) 的需求重點$/);
    if (c2) {
      return loc === 'zh-CN'
        ? `明确回应 ${c2[1]} Issue #${c2[2]} 的需求重点`
        : `Directly addresses the core requirements of ${c2[1]} Issue #${c2[2]}`;
    }
    if (c === '提供可審查之核心程式碼實作或合法 GitHub PR 連結') {
      return loc === 'zh-CN' ? '提供可审查之核心代码实现或合法 GitHub PR 链接' : 'Provide reviewable core code or a valid GitHub PR URL';
    }
    const c3 = c.match(/^解決 (.+) Issue #(\d+) 描述的問題並附驗證說明$/);
    if (c3) {
      return loc === 'zh-CN'
        ? `解决 ${c3[1]} Issue #${c3[2]} 描述的问题并附验证说明`
        : `Resolves ${c3[1]} Issue #${c3[2]} with clear verification steps`;
    }
    return c;
  });

  return {
    title,
    description,
    acceptanceCriteria: criteria,
    modelSuggestion: task.modelSuggestion || '',
  };
}

export function localizeRoleLabel(roleClass, locale) {
  const loc = normalizeLocale(locale);
  return WORKER_ROLE_I18N[roleClass]?.[loc] || roleClass || '';
}

export function localizeSkinLabel(skinId, locale) {
  const loc = normalizeLocale(locale);
  return SKIN_I18N[skinId]?.[loc] || skinId || '';
}

export function localizeStreamLabel(stream, locale) {
  const loc = normalizeLocale(locale);
  return STREAM_I18N[stream]?.[loc] || stream || '';
}

export function localizeWorker(worker, locale) {
  const loc = normalizeLocale(locale);
  if (!worker || typeof worker !== 'object') {
    return { name: '', roleName: '', providerLabel: '', lastMessage: '' };
  }

  let name = worker.name || '';
  if (worker.id && WORKER_NAME_I18N[worker.id] && (!name || NAME_TEXT_MAP[name])) {
    name = WORKER_NAME_I18N[worker.id][loc];
  } else {
    name = translateKnownName(name, loc);
  }

  const roleName = localizeRoleLabel(worker.roleClass, loc);

  let providerLabel = worker.providerLabel || '';
  if (providerLabel === 'Gemini CLI / 週額度') {
    providerLabel = loc === 'en' ? 'Gemini CLI / Weekly Quota' : loc === 'zh-CN' ? 'Gemini CLI / 周额度' : providerLabel;
  } else if (loc === 'en') {
    providerLabel = providerLabel
      .replaceAll('週額度', 'Weekly Quota')
      .replaceAll('周额度', 'Weekly Quota')
      .replaceAll('月額度', 'Monthly Quota')
      .replaceAll('本機 CLI', 'Local CLI');
  } else if (loc === 'zh-CN') {
    providerLabel = providerLabel.replaceAll('週額度', '周额度').replaceAll('本機', '本机');
  }

  let lastMessage = worker.lastMessage || '';
  if (lastMessage === '剛充完電，隨時可接自動工坊 Gemini Flash 任務！') {
    lastMessage = loc === 'en'
      ? 'Fully charged and ready for Auto Factory Gemini Flash tasks!'
      : loc === 'zh-CN'
        ? '刚充完电，随时可接自动工坊 Gemini Flash 任务！'
        : lastMessage;
  } else if (lastMessage === '本機 CLI 橋接器待命中，來張懸賞大單吧！') {
    lastMessage = loc === 'en'
      ? 'Local CLI bridge standing by — bring on a big bounty!'
      : loc === 'zh-CN'
        ? '本机 CLI 桥接器待命中，来张悬赏大单吧！'
        : lastMessage;
  } else if (lastMessage.startsWith('新報到的 ')) {
    const roleText = roleName.replace(/^[^\s]+\s+/, '');
    lastMessage = loc === 'en'
      ? `Newly recruited ${roleText}, ready to ship!`
      : loc === 'zh-CN'
        ? `新报到的 ${roleText}，已准备好上工！`
        : lastMessage;
  } else if (lastMessage.includes('喝完咖啡') || lastMessage.includes('回復體力')) {
    lastMessage = loc === 'en'
      ? 'Refreshed with pixel espresso, full stamina!'
      : loc === 'zh-CN'
        ? '喝完像素咖啡，满血复活准备上工！'
        : lastMessage;
  } else if (lastMessage.includes('已連線') || lastMessage.includes('已綁定')) {
    lastMessage = loc === 'en'
      ? 'Local device paired and synced with PixelCompute Town!'
      : loc === 'zh-CN'
        ? '本机设备已绑定并同步至像素算力镇！'
        : lastMessage;
  }

  return { name, roleName, providerLabel, lastMessage };
}

export function localizeShopItem(item, locale) {
  const loc = normalizeLocale(locale);
  if (!item || typeof item !== 'object') {
    return { name: '', desc: '', description: '', tag: '', badge: '' };
  }
  const known = item.id && SHOP_ITEM_I18N[item.id]?.[loc];
  if (known) {
    return {
      name: known.name,
      desc: known.desc,
      description: known.desc,
      tag: known.tag,
      badge: known.tag,
    };
  }
  const desc = item.description || item.desc || '';
  const tag = item.badge || item.tag || '';
  return {
    name: item.name || '',
    desc,
    description: desc,
    tag,
    badge: tag,
  };
}

export function localizeAchievement(ach, locale) {
  const loc = normalizeLocale(locale);
  if (!ach || typeof ach !== 'object') {
    return { name: '', title: '', description: '' };
  }
  const known = ach.id && ACHIEVEMENT_I18N[ach.id]?.[loc];
  if (known) {
    return {
      name: known.name,
      title: known.name,
      description: known.description,
    };
  }
  const name = ach.name || ach.title || '';
  return {
    name,
    title: name,
    description: ach.description || '',
  };
}

export function localizeLeaderboardEntry(row, locale) {
  const loc = normalizeLocale(locale);
  if (!row || typeof row !== 'object') {
    return { displayName: '', badge: '' };
  }
  let displayName = row.displayName || '';
  if (row.userId && NPC_USER_I18N[row.userId] && (!displayName || NAME_TEXT_MAP[displayName])) {
    displayName = NPC_USER_I18N[row.userId][loc];
  } else {
    displayName = translateKnownName(displayName, loc);
  }
  const rawBadge = row.badge || '';
  const badge = BADGE_I18N[rawBadge]?.[loc] || rawBadge;
  return { displayName, badge };
}

function translateReviewFlag(flag, loc) {
  const s = String(flag || '');
  if (!s || loc === 'zh-TW') return s;
  if (loc === 'zh-CN') {
    return s
      .replaceAll('測試', '测试')
      .replaceAll('全綠', '全绿')
      .replaceAll('冗餘', '冗余')
      .replaceAll('重複', '重复')
      .replaceAll('註解', '注释')
      .replaceAll('無意義', '无意义')
      .replaceAll('空函式', '空函数')
      .replaceAll('佔位符', '占位符')
      .replaceAll('異常', '异常')
      .replaceAll('規範', '规范')
      .replaceAll('高風險', '高风险')
      .replaceAll('低風險', '低风险')
      .replaceAll('結構', '结构');
  }
  // English translation for known & dynamic AI blind review flags (0 CJK leakage)
  if (/CI.*(綠|绿|pass|green)/i.test(s)) return '✅ CI Checks Green';
  if (/注水|重複註解|重复注释|bloat/i.test(s)) {
    const pct = s.match(/(\d+)%/);
    return pct ? `⚠️ ${pct[1]}% Repetitive Comment Bloat` : '⚠️ High Comment/Boilerplate Bloat';
  }
  if (/空函式|空函数|stub|佔位|占位/i.test(s)) return '🚫 Empty Stub / Placeholder Functions';
  if (/Diff.*暴增|行數過多|行数过多|oversized/i.test(s)) return '⚠️ Oversized Diff Spike';
  if (/重複行|重复行|duplicate/i.test(s)) return '⚠️ Excessive Duplicate Lines';
  if (/TODO|FIXME/i.test(s)) return '⚠️ Unfinished TODO / FIXME Stubs';
  if (/精煉|精炼|乾淨|干净|clean|零冗餘|零冗余/i.test(s)) return '✅ Clean & Concise Diff';
  if (/PR|GitHub/i.test(s)) return '🔗 GitHub PR Attached';
  if (/[\u4e00-\u9fff]/.test(s)) return '🤖 Automated AI Blind-Review Signal';
  return s;
}

function translateReviewSummary(summary, aiScore, riskLevel, bloatRatioPct, loc) {
  const s = String(summary || '');
  if (!s) {
    if (loc === 'en') {
      return riskLevel === 'high'
        ? `High-risk AI slop detected (${aiScore}/100, ${bloatRatioPct}% bloat) — reject to slash stake.`
        : `Cross-model AI blind review scored ${aiScore}/100 (${bloatRatioPct}% bloat).`;
    }
    return '';
  }
  if (loc === 'zh-TW') return s;
  if (loc === 'zh-CN') {
    return s
      .replaceAll('評分', '评分')
      .replaceAll('結構', '结构')
      .replaceAll('精煉', '精炼')
      .replaceAll('焦點', '焦点')
      .replaceAll('完備', '完备')
      .replaceAll('單元測試', '单元测试')
      .replaceAll('全綠', '全绿')
      .replaceAll('風險', '风险')
      .replaceAll('瘋狂', '疯狂')
      .replaceAll('重複', '重复')
      .replaceAll('無意義', '无意义')
      .replaceAll('註解', '注释')
      .replaceAll('空函式', '空函数')
      .replaceAll('建議', '建议')
      .replaceAll('駁回', '驳回')
      .replaceAll('沒收', '没收')
      .replaceAll('過高', '过高')
      .replaceAll('體檢', '体检');
  }
  if (!/[\u4e00-\u9fff]/.test(s)) return s;
  if (riskLevel === 'high' || Number(aiScore) < 45) {
    return `⚠️ High-risk AI slop alert (${aiScore}/100, ${bloatRatioPct}% bloat): repetitive boilerplate & low signal-to-noise ratio. Recommend rejecting to slash stake.`;
  }
  if (riskLevel === 'medium' || Number(aiScore) < 70) {
    return `🤖 Cross-model AI blind review (${aiScore}/100, ${bloatRatioPct}% bloat): moderate code signal — human builder inspection recommended.`;
  }
  return `✅ Cross-model AI blind review (${aiScore}/100, ${bloatRatioPct}% bloat): clean, focused implementation ready for peer merge approval.`;
}

export function localizeReviewItem(item, locale, { tasks = [], projects = [] } = {}) {
  const loc = normalizeLocale(locale);
  if (!item || typeof item !== 'object') {
    return {
      taskTitle: '',
      projectName: '',
      submitterName: '',
      summary: '',
      flags: [],
      contentPreview: '',
    };
  }

  const ai = item.aiReview || item.aiReport || item.blindReview || {};
  const aiScore = Number(ai.aiScore ?? item.aiScore ?? 80);
  const riskLevel = ai.riskLevel || item.riskLevel || (aiScore >= 70 ? 'low' : aiScore >= 45 ? 'medium' : 'high');
  const bloatRatioPct = Number(ai.bloatRatioPct ?? item.bloatRatioPct ?? 0);

  const preset = item.id && REVIEW_ITEM_I18N[item.id]?.[loc];
  if (preset) {
    return {
      taskTitle: preset.taskTitle,
      projectName: preset.projectName,
      submitterName: preset.submitterName,
      summary: preset.summary,
      flags: [...preset.flags],
      contentPreview:
        loc === 'en' && /[\u4e00-\u9fff]/.test(String(item.content || item.contentPreview || ''))
          ? preset.contentPreview
          : item.content || item.contentPreview || preset.contentPreview,
    };
  }

  const matchedTask = tasks.find((tk) => tk.id === item.taskId);
  const matchedProject = projects.find((p) => p.id === item.projectId);

  let taskTitle = matchedTask
    ? localizeTask(matchedTask, loc).title
    : item.taskId && TASK_I18N[item.taskId]?.[loc]?.title
      ? TASK_I18N[item.taskId][loc].title
      : localizeTask({ id: item.taskId, title: item.taskTitle || item.title || item.taskId || '' }, loc).title;

  let projectName = matchedProject
    ? localizeProject(matchedProject, loc).shortName || localizeProject(matchedProject, loc).name
    : item.projectId && PROJECT_I18N[item.projectId]?.[loc]?.shortName
      ? PROJECT_I18N[item.projectId][loc].shortName
      : item.projectName || item.projectId || '';

  const submitterName = localizeUser(
    {
      id: item.submittedByUserId || item.submitterId || item.submittedBy || item.userId,
      displayName: item.submittedByName || item.submitterName || item.authorName || '',
    },
    loc,
  ).displayName;

  if (loc === 'en' && /[\u4e00-\u9fff]/.test(taskTitle)) {
    taskTitle = `Guild Bounty Deliverable (${item.taskId || item.id})`;
  }
  if (loc === 'en' && /[\u4e00-\u9fff]/.test(projectName)) {
    projectName = item.projectId || 'Incubator Project';
  }

  const rawSummary = ai.summary || item.aiSummary || item.summary || '';
  const summary = translateReviewSummary(rawSummary, aiScore, riskLevel, bloatRatioPct, loc);

  const rawFlags = Array.isArray(ai.flags) ? ai.flags : Array.isArray(item.flags) ? item.flags : [];
  const flags = rawFlags.map((f) => translateReviewFlag(f, loc));

  let contentPreview = String(item.content || item.contentPreview || '');
  if (loc === 'en' && /[\u4e00-\u9fff]/.test(contentPreview)) {
    contentPreview = contentPreview.replace(/[\u4e00-\u9fff]+/g, '[localized-note]');
  }

  return {
    taskTitle,
    projectName,
    submitterName,
    summary,
    flags,
    contentPreview,
  };
}

export function localizeRevenueLabel(label, locale) {
  const loc = normalizeLocale(locale);
  if (!label) return '';
  if (loc === 'zh-TW') return label;

  const s = String(label);
  if (s === 'i18n-PixelBot 租用像素廣場霓虹廣告位') {
    return loc === 'zh-CN' ? 'i18n-PixelBot 租用像素广场霓虹广告位' : 'i18n-PixelBot rented Plaza Neon Billboard';
  }
  if (s === '社群創世元老購買 Pro 通行證 x2') {
    return loc === 'zh-CN' ? '社区创始元老购买 Pro 通行证 x2' : 'Genesis founders purchased Pro Pass x2';
  }
  if (s === '創世測試孵化池 10% 平臺分紅結算') {
    return loc === 'zh-CN' ? '创始测试孵化池 10% 平台分红结算' : 'Genesis incubator pool 10% platform carry';
  }
  if (s === '懸賞工會早期現金單 10% 託管服務費') {
    return loc === 'zh-CN' ? '悬赏工会早期现金单 10% 托管服务费' : 'Early Guild cash bounty 10% escrow fee';
  }

  let m = s.match(/^《(.+?)》租用像素廣場霓虹廣告位$/);
  if (m) {
    return loc === 'zh-CN' ? `《${m[1]}》租用像素广场霓虹广告位` : `"${m[1]}" rented Plaza Neon Billboard`;
  }
  m = s.match(/^《(.+?)》(.+?) 10% 平臺分成$/);
  if (m) {
    return loc === 'zh-CN' ? `《${m[1]}》${m[2]} 10% 平台分成` : `"${m[1]}" 10% platform revenue carry`;
  }
  m = s.match(/^現金懸賞《(.+?)》10% 託管服務費$/);
  if (m) {
    return loc === 'zh-CN' ? `现金悬赏《${m[1]}》10% 托管服务费` : `Cash bounty "${m[1]}" 10% escrow fee`;
  }
  m = s.match(/^玩家購買「(.+?)」$/);
  if (m) {
    return loc === 'zh-CN' ? `玩家购买「${m[1]}」` : `Player purchased "${m[1]}"`;
  }
  if (loc === 'zh-CN') {
    return s
      .replaceAll('平臺', '平台')
      .replaceAll('廣場', '广场')
      .replaceAll('廣告位', '广告位')
      .replaceAll('懸賞', '悬赏')
      .replaceAll('託管', '托管')
      .replaceAll('服務費', '服务费')
      .replaceAll('購買', '购买')
      .replaceAll('穩定幣', '稳定币');
  }
  return s;
}

export function localizeFeedMessage(msg, locale) {
  const loc = normalizeLocale(locale);
  if (!msg) return '';
  if (loc === 'zh-TW') return String(msg);

  const s = String(msg);

  // Initial 3 seed activity feed messages
  if (s === '歡迎來到像素算力鎮！目前有 10 張雙軌任務開放接單，PixelPomo 差 2 票即將解鎖！') {
    return loc === 'zh-CN'
      ? '欢迎来到像素算力镇！目前有 10 张双轨任务开放接单，PixelPomo 差 2 票即将解锁！'
      : 'Welcome to PixelCompute Town! 10 dual-track tasks are open, and PixelPomo is 2 votes away from breaking ground!';
  }
  if (s === '算力武士 Kuro 為《i18n-PixelBot》點亮了像素廣場霓虹廣告牌（+$29 平臺收入）') {
    return loc === 'zh-CN'
      ? '算力武士 Kuro 为《i18n-PixelBot》点亮了像素广场霓虹广告牌（+$29 平台收入）'
      : 'Compute Ronin Kuro lit up the Plaza Neon Billboard for i18n-PixelBot (+$29 platform revenue)';
  }
  if (s === '架構師阿瓜 (Pro-01) 完成《i18n-PixelBot》創世規格單，獲得 +40 貢獻點與 +240G！') {
    return loc === 'zh-CN'
      ? '架构师阿瓜 (Pro-01) 完成《i18n-PixelBot》创始规格单，获得 +40 贡献点与 +240G！'
      : 'Architect Owl (Pro-01) completed the i18n-PixelBot genesis spec task (+40 pts, +240G)!';
  }

  // Pattern 1: Achievement unlocked
  let m = s.match(/^解鎖創世成就【(.+?)】！額外獲得 \+(\d+)G 獎勵！$/);
  if (m) {
    let achLabel = m[1];
    for (const def of Object.values(ACHIEVEMENT_I18N)) {
      if (achLabel.includes(def['zh-TW'].name)) {
        achLabel = achLabel.replace(def['zh-TW'].name, def[loc].name);
      }
    }
    return loc === 'zh-CN'
      ? `解锁创始成就【${achLabel}】！额外获得 +${m[2]}G 奖励！`
      : `Genesis Achievement Unlocked: [${achLabel}]! Bonus +${m[2]}G!`;
  }

  // Pattern 2: Worker recruited
  m = s.match(/^招募了新算力小人【(.+?)】（(.+?) \/ -(\d+)G）$/);
  if (m) {
    return loc === 'zh-CN'
      ? `招募了新算力小人【${m[1]}】（${m[2]} / -${m[3]}G）`
      : `Recruited new compute worker [${translateKnownName(m[1], loc)}] (-${m[3]}G)`;
  }

  // Pattern 3: Coffee stamina recovery
  m = s.match(/^【(.+?)】在算力宿舍喝咖啡回滿體力（(\d+)\/(\d+)）$/);
  if (m) {
    const wName = translateKnownName(m[1], loc);
    return loc === 'zh-CN'
      ? `【${wName}】在算力宿舍喝咖啡回满体力（${m[2]}/${m[3]}）`
      : `[${wName}] recharged full stamina with coffee in the Lounge (${m[2]}/${m[3]})`;
  }

  // Pattern 4: Project proposed
  m = s.match(/^(.+?) 發起新項目提案《(.+?)》（(\d+)\/(\d+) 票）$/);
  if (m) {
    const uName = translateKnownName(m[1], loc);
    return loc === 'zh-CN'
      ? `${uName} 发起新项目提案《${m[2]}》（${m[3]}/${m[4]} 票）`
      : `${uName} proposed new project "${m[2]}" (${m[3]}/${m[4]} votes)`;
  }

  // Pattern 5: Project unlocked by votes
  m = s.match(/^《(.+?)》投票達標（(\d+)\/(\d+)）正式破土立項！/);
  if (m) {
    return loc === 'zh-CN'
      ? `《${m[1]}》投票达标（${m[2]}/${m[3]}）正式破土立项！已自动生成 3 张自动工坊 + 2 张悬赏工会任务！`
      : `"${m[1]}" hit ${m[2]}/${m[3]} votes & broke ground! Spawned 3 Factory + 2 Guild tasks!`;
  }

  // Pattern 6: Project voted
  m = s.match(/^(.+?) 投給《(.+?)》一票（目前 (\d+)\/(\d+) 票）$/);
  if (m) {
    const uName = translateKnownName(m[1], loc);
    return loc === 'zh-CN'
      ? `${uName} 投给《${m[2]}》一票（目前 ${m[3]}/${m[4]} 票）`
      : `${uName} voted for "${m[2]}" (${m[3]}/${m[4]} votes)`;
  }

  // Pattern 7: Billboard rented
  m = s.match(/^《(.+?)》點亮像素廣場霓虹廣告牌（\+\$(\d+(?:\.\d+)?) 創作者廣告收入）$/);
  if (m) {
    return loc === 'zh-CN'
      ? `《${m[1]}》点亮像素广场霓虹广告牌（+$${m[2]} 创作者广告收入）`
      : `"${m[1]}" lit up the Plaza Neon Billboard (+$${m[2]} ad revenue)`;
  }

  // Pattern 8: Project launched (supports both 5/85/10 and legacy 30/60/10 messages)
  m = s.match(/^🎆 《(.+?)》正式發布上線！首筆營收 \$(\d+(?:\.\d+)?) 已按 (?:5\/85\/10|30\/60\/10)/);
  if (m) {
    return loc === 'zh-CN'
      ? `🎆 《${m[1]}》正式发布上线！首笔营收 $${m[2]} 已按 5/85/10 多劳多得协议结算分红！`
      : `🎆 "${m[1]}" launched! Day-1 revenue $${m[2]} settled via 5/85/10 merit split!`;
  }

  // Pattern 8b: Co-builder joined a project
  m = s.match(/^(.+?) 加入原創項目《(.+?)》共建（(?:目前|現共)\s*(\d+)\s*位共建者）/);
  if (m) {
    const uName = translateKnownName(m[1], loc);
    return loc === 'zh-CN'
      ? `${uName} 加入原创项目《${m[2]}》共建（共 ${m[3]} 位共建者）`
      : `${uName} joined original project "${m[2]}" as a co-builder (${m[3]} co-builders)`;
  }

  // Pattern 8c: Provenance idea minted
  m = s.match(/^(.+?) 首發提案《(.+?)》並鑄造 SHA-256 溯源指紋 #([a-f0-9]+)/i);
  if (m) {
    const uName = translateKnownName(m[1], loc);
    return loc === 'zh-CN'
      ? `${uName} 首发提案《${m[2]}》并铸造 SHA-256 溯源指纹 #${m[3]}`
      : `${uName} sparked original idea "${m[2]}" & minted SHA-256 hash #${m[3]}`;
  }

  // Pattern 9: Simulated revenue
  m = s.match(/^《(.+?)》新增產品營收 \$(\d+(?:\.\d+)?)！/);
  if (m) {
    return loc === 'zh-CN'
      ? `《${m[1]}》新增产品营收 $${m[2]}！已实时分红！`
      : `"${m[1]}" generated +$${m[2]} revenue! Dividends distributed!`;
  }

  // Pattern 10: Task claimed
  m = s.match(/^【(.+?)】接下《(.+?)》任務：(.+)$/);
  if (m) {
    const wName = translateKnownName(m[1], loc);
    return loc === 'zh-CN'
      ? `【${wName}】接下《${m[2]}》任务：${m[3]}`
      : `[${wName}] claimed "${m[2]}" task: ${m[3]}`;
  }

  // Pattern 11: Task released
  m = s.match(/^【(.+?)】無懲罰釋放任務《(.+?)》回待接狀態(.*)$/);
  if (m) {
    const wName = translateKnownName(m[1], loc);
    return loc === 'zh-CN'
      ? `【${wName}】无惩罚释放任务《${m[2]}》回待接状态`
      : `[${wName}] safely released task "${m[2]}" back to open queue`;
  }

  // Pattern 12: Anti-cheat rejected
  m = s.match(/^防作弊驗收攔截：【(.+?)】未通過檢查（0 貢獻值，信譽分 -2）— (.+)$/);
  if (m) {
    return loc === 'zh-CN'
      ? `防作弊验收拦截：【${m[1]}】未通过检查（0 贡献值，信誉分 -2）— ${m[2]}`
      : `Anti-cheat blocked [${m[1]}]: failed verification (0 pts, -2 Rep) — ${m[2]}`;
  }

  // Pattern 13: Task completed
  m = s.match(/^【(.+?)】完成《(.+?)》（評分 (\d+)[^）]*）/);
  if (m) {
    const wName = translateKnownName(m[1], loc);
    return loc === 'zh-CN'
      ? `【${wName}】完成《${m[2]}》（评分 ${m[3]}）并入账奖励！`
      : `[${wName}] verified "${m[2]}" (score ${m[3]}/100) & earned rewards!`;
  }

  // Pattern 14: Shop purchase
  m = s.match(/^(.+?) 購買了「(.+?)」（(.+?)）$/);
  if (m) {
    const uName = translateKnownName(m[1], loc);
    return loc === 'zh-CN'
      ? `${uName} 购买了「${m[2]}」（${m[3]}）`
      : `${uName} purchased "${m[2]}" (${m[3]})`;
  }

  // Pattern 15: GitHub import
  m = s.match(/^自 GitHub 倉庫【(.+?)】匯入 (\d+) 張任務卡至《(.+?)》/);
  if (m) {
    return loc === 'zh-CN'
      ? `自 GitHub 仓库【${m[1]}】导入 ${m[2]} 张任务卡至《${m[3]}》`
      : `Imported ${m[2]} tasks from GitHub repo [${m[1]}] into "${m[3]}"`;
  }

  // Pattern 16: CLI heartbeat
  m = s.match(/^\[CLI:([^\]]+)\]\s*(.+?)：(.+)$/);
  if (m) {
    const wName = translateKnownName(m[2], loc);
    return `[CLI:${m[1]}] ${wName}: ${m[3]}`;
  }

  // Pattern 17: Governance peer review queued / approved / rejected
  if (loc === 'en') {
    if (s.includes('實幹審閱佇列') || s.includes('实干审阅队列')) {
      return '⚖️ Deliverable passed CI hard gate and entered the Peer Review Queue.';
    }
    if ((s.includes('沒收') || s.includes('没收')) && (s.includes('押金') || s.includes('垃圾'))) {
      const stakeMatch = s.match(/(\d+)\s*G/);
      return stakeMatch
        ? `🚫 Rejected AI slop submission & slashed +${stakeMatch[1]}G stake to reviewer!`
        : '🚫 Rejected AI slop submission & slashed submitter stake!';
    }
    if ((s.includes('批准合併') || s.includes('核准合併') || s.includes('審閱通過')) && s.includes('G')) {
      return '✅ Peer reviewer approved clean PR merge (+15G review bonus)!';
    }
    if (s.includes('反刷單冷卻') || s.includes('冷卻')) {
      return '⏳ Worker entered anti-slop cooldown after repeated rejected submissions.';
    }
  }

  if (loc === 'zh-CN') {
    return s
      .replaceAll('像素算力鎮', '像素算力镇')
      .replaceAll('平臺', '平台')
      .replaceAll('項目', '项目')
      .replaceAll('懸賞', '悬赏')
      .replaceAll('驗收', '验收')
      .replaceAll('體力', '体力')
      .replaceAll('獎勵', '奖励')
      .replaceAll('貢獻點', '贡献点')
      .replaceAll('穩定幣', '稳定币')
      .replaceAll('兌換碼', '兑换码')
      .replaceAll('裝置', '设备')
      .replaceAll('審核', '审核')
      .replaceAll('審閱', '审阅')
      .replaceAll('佇列', '队列')
      .replaceAll('沒收', '没收')
      .replaceAll('駁回', '驳回')
      .replaceAll('冷卻', '冷却');
  }

  return s;
}

const PRESET_REDEEM_NOTE_I18N = Object.freeze({
  'PIXEL-PRO-2026': {
    'zh-TW': '創世開通 Pro 會員測試碼（愛發電 / Ko-fi 範例）',
    'zh-CN': '创始开通 Pro 会员测试码（爱发电 / Ko-fi 示例）',
    en: 'Genesis Pro Pass sandbox code (Afdian / Ko-fi sample)',
  },
  'PIXEL-PACK-2026': {
    'zh-TW': '解鎖全部 3 款創世限定塗裝大禮包測試碼',
    'zh-CN': '解锁全部 3 款创始限定涂装大礼包测试码',
    en: 'Genesis 3-Skin Collector Bundle sandbox code',
  },
  'PIXEL-GOLD-500': {
    'zh-TW': '創世 500 金幣啟動紅包測試碼',
    'zh-CN': '创始 500 金币启动红包测试码',
    en: 'Genesis 500 Gold starter bonus sandbox code',
  },
});

export function localizeRedeemNote(codeObj, locale) {
  const loc = normalizeLocale(locale);
  if (!codeObj || typeof codeObj !== 'object') return '';
  const codeKey = String(codeObj.code || '').toUpperCase();
  if (PRESET_REDEEM_NOTE_I18N[codeKey]) {
    return PRESET_REDEEM_NOTE_I18N[codeKey][loc] || codeObj.note || '';
  }
  const raw = String(codeObj.note || '');
  if (!raw || loc === 'zh-TW') return raw;
  if (loc === 'zh-CN') {
    return raw
      .replaceAll('創世', '创始')
      .replaceAll('開通', '开通')
      .replaceAll('會員', '会员')
      .replaceAll('測試碼', '测试码')
      .replaceAll('愛發電', '爱发电')
      .replaceAll('範例', '示例')
      .replaceAll('塗裝', '涂装')
      .replaceAll('禮包', '礼包')
      .replaceAll('金幣', '金币')
      .replaceAll('紅包', '红包');
  }
  if (/創世開通|创始开通/.test(raw)) return 'Genesis Pro Pass sandbox code';
  if (/塗裝大禮包|涂装大礼包/.test(raw)) return 'Genesis 3-Skin Collector Bundle code';
  if (/500 金幣|500 金币/.test(raw)) return '500 Town Gold starter bonus code';
  if (/鎮長生成|镇长生成/.test(raw)) return 'Mayor-generated redeem code';
  return raw;
}

export function localizeServerMessage(msg, locale) {
  const loc = normalizeLocale(locale);
  if (!msg) return '';
  const s = String(msg).trim();
  if (loc === 'zh-TW') return s;

  // Common redeem reward summaries & server feedback
  const exactMap = {
    '已開通 Pro 會員通行證': { 'zh-CN': '已开通 Pro 会员通行证', en: 'Pro Pass activated' },
    '已解鎖創世限定外觀大禮包（全 3 款 HD 皮膚）': {
      'zh-CN': '已解锁创始限定外观大礼包（全 3 款 HD 皮肤）',
      en: 'Unlocked Genesis Skin Bundle (all 3 HD skins)',
    },
    '已入帳 +500 小鎮金幣': { 'zh-CN': '已入账 +500 小镇金币', en: 'Credited +500 Town Gold' },
    '已獲得霓虹廣告位兌換資格': { 'zh-CN': '已获得霓虹广告位兑换资格', en: 'Neon Billboard voucher credited' },
    '偵測到與既有原創創意高度相似，平臺反對抄襲複製，建議直接加入原創意共建！': {
      'zh-CN': '检测到与既有原创创意高度相似，平台反对抄袭复制，建议直接加入原创意共建！',
      en: 'Highly similar to an existing original idea — PixelCompute Town opposes copycats. Join the original idea to co-build instead!',
    },
    '此兌換碼已被使用': { 'zh-CN': '此兑换码已被使用', en: 'This redeem code has already been used' },
    '找不到此兌換碼，請檢查拼寫': { 'zh-CN': '找不到此兑换码，请检查拼写', en: 'Redeem code not found — please check spelling' },
    '請先綁定穩定幣收款錢包地址': { 'zh-CN': '请先绑定稳定币收款钱包地址', en: 'Please bind a stablecoin payout wallet address first' },
    '餘額不足': { 'zh-CN': '余额不足', en: 'Insufficient balance' },
    '提領金額不可低於 $5': { 'zh-CN': '提现金额不可低于 $5', en: 'Minimum payout amount is $5' },
    '小鎮金幣不足': { 'zh-CN': '小镇金币不足', en: 'Insufficient Town Gold' },
    '你已經擁有此商品': { 'zh-CN': '你已经拥有此商品', en: 'You already own this item' },
    '你已經是該創意的共建者': { 'zh-CN': '你已经是该创意的共建者', en: 'You are already a co-builder of this idea' },
    '項目尚未達到 100% 開發進度': { 'zh-CN': '项目尚未达到 100% 开发进度', en: 'Project has not reached 100% build progress yet' },
  };
  if (exactMap[s]) return exactMap[s][loc] || s;

  if (loc === 'en') {
    if (s.includes('Pro') && (s.includes('開通') || s.includes('开通'))) return 'Pro Pass activated!';
    if (s.includes('500') && (s.includes('金幣') || s.includes('金币'))) return '+500 Town Gold credited!';
    if (s.includes('大禮包') || s.includes('大礼包')) return 'Genesis Skin Bundle unlocked!';
    if (s.includes('霓虹廣告') || s.includes('霓虹广告')) return 'Neon Billboard activated!';
    if (s.includes('高度相似') || s.includes('抄襲') || s.includes('抄袭')) {
      return 'Highly similar to an existing original idea — join the original idea to co-build instead!';
    }
    if (s.includes('已被使用')) return 'This redeem code has already been used.';
    if (s.includes('找不到') && s.includes('兌換碼')) return 'Redeem code not found.';
    if (s.includes('最低') && s.includes('$5')) return 'Minimum withdrawal amount is $5.00.';
    if (s.includes('餘額不足') || s.includes('余额不足')) return 'Insufficient balance.';
    if (s.includes('金幣不足') || s.includes('金币不足')) return 'Not enough Town Gold.';
    if (s.includes('體力不足') || s.includes('体力不足')) return 'Worker stamina too low — grab a coffee in the Lounge!';
    if (s.includes('尚未達到 100%')) return 'Project has not reached 100% progress yet.';
    if (s.includes('信箱已被註冊') || s.includes('邮箱已被注册')) return 'This email is already registered.';
    if (s.includes('帳號或密碼錯誤') || s.includes('账号或密码错误')) return 'Invalid email or password.';
    if (s.includes('請先綁定') && s.includes('錢包')) return 'Please bind a stablecoin payout wallet first.';
    if (s.includes('冷卻') || s.includes('冷却') || s.includes('COOLDOWN')) {
      const secMatch = s.match(/(\d+)\s*[秒s]/i);
      return secMatch
        ? `Worker is in anti-slop cooldown (${secMatch[1]}s remaining).`
        : 'Worker is currently in anti-slop cooldown.';
    }
    if ((s.includes('信譽') || s.includes('信誉')) && (s.includes('不足') || s.includes('門檻') || s.includes('门槛'))) {
      return 'Reputation score too low for this core Guild bounty.';
    }
    if (s.includes('押金') && (s.includes('不足') || s.includes('金幣') || s.includes('金币'))) {
      return 'Insufficient Town Gold to cover the bounty sincerity stake.';
    }
    if ((s.includes('審閱') || s.includes('审阅')) && (s.includes('權限') || s.includes('权限'))) {
      return 'Only core builders, project originators, or mayors may review this submission.';
    }
    if ((s.includes('找不到') || s.includes('已處理') || s.includes('已处理')) && (s.includes('審閱') || s.includes('审阅'))) {
      return 'Review item not found or already decided.';
    }
  }

  if (loc === 'zh-CN') {
    return s
      .replaceAll('平臺', '平台')
      .replaceAll('項目', '项目')
      .replaceAll('開通', '开通')
      .replaceAll('會員', '会员')
      .replaceAll('兌換碼', '兑换码')
      .replaceAll('金幣', '金币')
      .replaceAll('餘額', '余额')
      .replaceAll('錢包', '钱包')
      .replaceAll('提領', '提现')
      .replaceAll('綁定', '绑定')
      .replaceAll('抄襲', '抄袭')
      .replaceAll('複製', '复制')
      .replaceAll('創意', '创意')
      .replaceAll('體力', '体力');
  }
  return s;
}

// ============================================================================
// Canvas & Work Certificate Complete Trilingual Dictionary (for pixelEngine.js & certCard.js)
// ============================================================================

const CANVAS_I18N = Object.freeze({
  'zh-TW': {
    // 6 Scenes & Headers
    scenes: {
      factory: { title: '🏭 自動工坊 · 超算中心', dashboard: 'API 吞吐儀表板', autoOn: '● AUTO-PILOT 運行中', byokReady: '● BYOK 零信任就緒', coreLoad: '⚡ 核心額度', openDone: '待接 {open} · 完成 {done}', idleDesk: '待招募工位' },
      guild: { title: '⚔️ 懸賞工會 · 匠人會館', boardTitle: '懸賞佈告欄', poolSummary: '懸賞池 ${pool} · {open} 單開放', clickClaim: '點擊接單', idleDesk: '待命工位' },
      launchpad: { title: '🚀 孵化廣場 · 指揮中心', liveHeader: '🚀 孵化廣場指揮中心 · LIVE', sponsoredHeader: '★ PIXEL NEON SPONSORED ★', kanbanTitle: '項目看板', voteLabel: '社群投票', progressLabel: '項目進度', launchedTag: '🎆 已上線', buildingTag: '🏗️ 孵化中', defaultProject: '像素算力鎮 v1.0', fallbackTitle: '孵化總控' },
      lounge: { title: '☕ 算力宿舍 · 生活館', coffeeBar: '☕ 咖啡吧台', goldCoffeeBar: '✨ 黃金手沖吧', trophyCase: '🏆 創世成就櫃 {unlocked}/6' },
      vault: { title: '💰 創作者金庫 · 分紅銀行', totalRev: '💰 創作者金庫總營收 {amount}', pillarBounty: '懸賞 10%', pillarCarry: '孵化 10%', pillarAds: '霓虹廣告', pillarPro: '皮膚 Pro', podiumTitle: '榮耀領獎台' },
      town: { title: '🗺️ 像素算力鎮全景' },
    },
    buildings: {
      factory: { label: '🏭 自動工坊', subtitle: 'API 超算中心' },
      guild: { label: '⚔️ 懸賞工會', subtitle: '匠人 CLI 會館' },
      vault: { label: '💰 創作者金庫', subtitle: '黑金分紅銀行' },
      lounge: { label: '☕ 算力宿舍', subtitle: '咖啡與獎盃館' },
      launchpad: { label: '🚀 孵化中心', subtitle: '全息發射廣場' },
    },
    worker: {
      defaultName: '小人',
      statusCli: '💻 CLI 即時同步',
      statusWorking: '⚡ 執行任務中',
      statusCelebrate: '🎉 驗收歡呼',
      statusIdle: '☕ 待命中',
      stamina: '體力 {pct}%',
      defaultApiTask: 'API 流水線微任務',
      defaultGuildTask: '工會懸賞任務',
      bubblePassed: '🎉 驗收通過！',
      bubbleLaunched: '🎆 上線啦！領分紅！',
      floatPoints: '+{pts} 貢獻點',
      floatPassed: '✔ 驗收通過!',
      cliSyncing: '本機 CLI 同步中...',
      prChecking: 'PR 檢核中 · 0 warnings',
    },
    ticker: {
      sponsorFallback: '★ {name} 贊助徵求算力貢獻者！',
      launchedMsg: '🚀 {name} 已正式上線分紅中！',
      launchBanner: '🚀 《{name}》正式上線！5/85/10 多勞多得分紅結算中！',
      defaultMeta: '⚡ 像素算力鎮 · 《{name}》進度 {pct}% · 5/85/10 創意溯源 × 多勞多得',
      newProjectFallback: '新創世項目',
    },
    cert: {
      headerTitle: '★ PIXELCOMPUTE TOWN · 像素算力鎮',
      headerSub: '《算力打工證 & 透明收益分紅結算單》  PROOF OF ACCEPTED WORK',
      verifiedStamp: '✔ VERIFIED BUILDER',
      issuedPrefix: 'ISSUED: ',
      proBadge: '👑 PRO 會員',
      squadTitle: 'ACTIVE SQUAD · 旗下算力小人 ({count})',
      sealLine1: '防刷單鐵律 · 按驗收成果記功',
      sealLine2: 'BYOK 零信任金鑰 · 5/85/10 多勞多得透明分紅',
      tierGenesis: '創世開拓者',
      tierCertified: '認證算力工程師',
      tierMaster: '公會資深大匠',
      tierLegend: '傳奇算力領主',
      kpiRepLabel: '🛡️ 開發者信譽分 (REPUTATION)',
      kpiRepSub: '{stars} 優良信用',
      kpiTasksLabel: '✅ 驗收通過任務 (ACCEPTED)',
      kpiTasksVal: '{count} 筆',
      kpiTasksSub: '累計貢獻點 +{pts} pts',
      kpiUsdLabel: '💵 累積分紅與懸賞 (USD EARNED)',
      kpiUsdSub: '含上線分紅池 + 懸賞實得',
      kpiGoldLabel: '🪙 小鎮金幣資產 (GOLD)',
      kpiGoldSub: '可招募小人與兌換像素外觀',
      holdingsTitle: '📊 持倉與分紅項目清單 (PROJECT HOLDINGS & DIVIDENDS)',
      colProject: '項目名稱',
      colStatus: '狀態',
      colProgress: '進度',
      colShare: '貢獻點 / 預估權重',
      holdingsEmpty: '尚未參與孵化項目，快派小人進工坊賺取首批分紅份額！',
      statusLaunched: '🚀 已上線',
      statusVoting: '🗳️ 投票中',
      statusBuilding: '🔨 建設中',
      revenuePrefix: '營收 ',
      canJoin: '可接單參與',
      achievementsTitle: '🏆 創世成就徽章 ({unlocked}/{total})',
      footerSlogan: '像素算力鎮 · 把閒置 AI 算力變成可分享的真實產品與分紅',
    },
  },

  'zh-CN': {
    scenes: {
      factory: { title: '🏭 自动工坊 · 超算中心', dashboard: 'API 吞吐仪表板', autoOn: '● AUTO-PILOT 运行中', byokReady: '● BYOK 零信任就绪', coreLoad: '⚡ 核心额度', openDone: '待接 {open} · 完成 {done}', idleDesk: '待招募工位' },
      guild: { title: '⚔️ 悬赏工会 · 匠人会馆', boardTitle: '悬赏布告栏', poolSummary: '悬赏池 ${pool} · {open} 单开放', clickClaim: '点击接单', idleDesk: '待命工位' },
      launchpad: { title: '🚀 孵化广场 · 指挥中心', liveHeader: '🚀 孵化广场指挥中心 · LIVE', sponsoredHeader: '★ PIXEL NEON SPONSORED ★', kanbanTitle: '项目看板', voteLabel: '社区投票', progressLabel: '项目进度', launchedTag: '🎆 已上线', buildingTag: '🏗️ 孵化中', defaultProject: '像素算力镇 v1.0', fallbackTitle: '孵化总控' },
      lounge: { title: '☕ 算力宿舍 · 生活馆', coffeeBar: '☕ 咖啡吧台', goldCoffeeBar: '✨ 黄金手冲吧', trophyCase: '🏆 创始成就柜 {unlocked}/6' },
      vault: { title: '💰 创作者金库 · 分红银行', totalRev: '💰 创作者金库总营收 {amount}', pillarBounty: '悬赏 10%', pillarCarry: '孵化 10%', pillarAds: '霓虹广告', pillarPro: '皮肤 Pro', podiumTitle: '荣耀领奖台' },
      town: { title: '🗺️ 像素算力镇全景' },
    },
    buildings: {
      factory: { label: '🏭 自动工坊', subtitle: 'API 超算中心' },
      guild: { label: '⚔️ 悬赏工会', subtitle: '匠人 CLI 会馆' },
      vault: { label: '💰 创作者金库', subtitle: '黑金分红银行' },
      lounge: { label: '☕ 算力宿舍', subtitle: '咖啡与奖杯馆' },
      launchpad: { label: '🚀 孵化中心', subtitle: '全息发射广场' },
    },
    worker: {
      defaultName: '小人',
      statusCli: '💻 CLI 实时同步',
      statusWorking: '⚡ 执行任务中',
      statusCelebrate: '🎉 验收欢呼',
      statusIdle: '☕ 待命中',
      stamina: '体力 {pct}%',
      defaultApiTask: 'API 流水线微任务',
      defaultGuildTask: '工会悬赏任务',
      bubblePassed: '🎉 验收通过！',
      bubbleLaunched: '🎆 上线啦！领分红！',
      floatPoints: '+{pts} 贡献点',
      floatPassed: '✔ 验收通过!',
      cliSyncing: '本机 CLI 同步中...',
      prChecking: 'PR 检核中 · 0 warnings',
    },
    ticker: {
      sponsorFallback: '★ {name} 赞助征求算力贡献者！',
      launchedMsg: '🚀 {name} 已正式上线分红中！',
      launchBanner: '🚀 《{name}》正式上线！5/85/10 多劳多得分红结算中！',
      defaultMeta: '⚡ 像素算力镇 · 《{name}》进度 {pct}% · 5/85/10 创意溯源 × 多劳多得',
      newProjectFallback: '新创始项目',
    },
    cert: {
      headerTitle: '★ PIXELCOMPUTE TOWN · 像素算力镇',
      headerSub: '《算力打工证 & 透明收益分红结算单》  PROOF OF ACCEPTED WORK',
      verifiedStamp: '✔ VERIFIED BUILDER',
      issuedPrefix: 'ISSUED: ',
      proBadge: '👑 PRO 会员',
      squadTitle: 'ACTIVE SQUAD · 旗下算力小人 ({count})',
      sealLine1: '防刷单铁律 · 按验收成果记功',
      sealLine2: 'BYOK 零信任密钥 · 5/85/10 多劳多得透明分红',
      tierGenesis: '创始开拓者',
      tierCertified: '认证算力工程师',
      tierMaster: '公会资深大匠',
      tierLegend: '传奇算力领主',
      kpiRepLabel: '🛡️ 开发者信誉分 (REPUTATION)',
      kpiRepSub: '{stars} 优良信用',
      kpiTasksLabel: '✅ 验收通过任务 (ACCEPTED)',
      kpiTasksVal: '{count} 笔',
      kpiTasksSub: '累计贡献点 +{pts} pts',
      kpiUsdLabel: '💵 累积分红与悬赏 (USD EARNED)',
      kpiUsdSub: '含上线分红池 + 悬赏实得',
      kpiGoldLabel: '🪙 小镇金币资产 (GOLD)',
      kpiGoldSub: '可招募小人与兑换像素外观',
      holdingsTitle: '📊 持仓与分红项目清单 (PROJECT HOLDINGS & DIVIDENDS)',
      colProject: '项目名称',
      colStatus: '状态',
      colProgress: '进度',
      colShare: '贡献点 / 预估权重',
      holdingsEmpty: '尚未参与孵化项目，快派小人进工坊赚取首批分红份额！',
      statusLaunched: '🚀 已上线',
      statusVoting: '🗳️ 投票中',
      statusBuilding: '🔨 建设中',
      revenuePrefix: '营收 ',
      canJoin: '可接单参与',
      achievementsTitle: '🏆 创始成就徽章 ({unlocked}/{total})',
      footerSlogan: '像素算力镇 · 把闲置 AI 算力变成可分享的真实产品与分红',
    },
  },

  en: {
    scenes: {
      factory: { title: '🏭 AUTO FACTORY · COMPUTE HQ', dashboard: 'API THROUGHPUT', autoOn: '● AUTO-PILOT ACTIVE', byokReady: '● BYOK ZERO-TRUST READY', coreLoad: '⚡ CORE QUOTA', openDone: 'Open {open} · Done {done}', idleDesk: 'OPEN DESK' },
      guild: { title: '⚔️ BOUNTY GUILD · ARTISAN HALL', boardTitle: 'BOUNTY BOARD', poolSummary: 'Pool ${pool} · {open} Open', clickClaim: 'Click to Claim', idleDesk: 'STANDBY DESK' },
      launchpad: { title: '🚀 LAUNCHPAD · COMMAND HQ', liveHeader: '🚀 LAUNCHPAD COMMAND · LIVE', sponsoredHeader: '★ PIXEL NEON SPONSORED ★', kanbanTitle: 'PROJECT BOARD', voteLabel: 'VOTES', progressLabel: 'PROGRESS', launchedTag: '🎆 LIVE', buildingTag: '🏗️ BUILDING', defaultProject: 'PixelCompute v1.0', fallbackTitle: 'LAUNCHPAD' },
      lounge: { title: '☕ COMPUTE LOUNGE · STUDIO', coffeeBar: '☕ COFFEE BAR', goldCoffeeBar: '✨ GOLD ESPRESSO', trophyCase: '🏆 TROPHY CASE {unlocked}/6' },
      vault: { title: '💰 CREATOR VAULT · DIVIDEND BANK', totalRev: '💰 VAULT REVENUE {amount}', pillarBounty: 'Bounty 10%', pillarCarry: 'Carry 10%', pillarAds: 'Neon Ads', pillarPro: 'Pro Skins', podiumTitle: 'HALL OF FAME' },
      town: { title: '🗺️ PIXELCOMPUTE TOWN MAP' },
    },
    buildings: {
      factory: { label: '🏭 Auto Factory', subtitle: 'API Compute HQ' },
      guild: { label: '⚔️ Bounty Guild', subtitle: 'Local CLI Hall' },
      vault: { label: '💰 Creator Vault', subtitle: 'Dividend Bank' },
      lounge: { label: '☕ Compute Lounge', subtitle: 'Cafe & Trophies' },
      launchpad: { label: '🚀 Launchpad', subtitle: 'Holo Incubator' },
    },
    worker: {
      defaultName: 'Worker',
      statusCli: '💻 CLI Live Sync',
      statusWorking: '⚡ Coding Live',
      statusCelebrate: '🎉 Verified!',
      statusIdle: '☕ Idle',
      stamina: 'STA {pct}%',
      defaultApiTask: 'API Pipeline Task',
      defaultGuildTask: 'Guild Bounty Task',
      bubblePassed: '🎉 Verified!',
      bubbleLaunched: '🎆 Launched! Split!',
      floatPoints: '+{pts} pts',
      floatPassed: '✔ Verified!',
      cliSyncing: 'Local CLI syncing...',
      prChecking: 'PR Check · 0 warnings',
    },
    ticker: {
      sponsorFallback: '★ {name} Sponsored — Seeking Compute Builders!',
      launchedMsg: '🚀 {name} is LIVE & streaming dividends!',
      launchBanner: '🚀 "{name}" LAUNCHED! 5/85/10 Merit Dividends Settling!',
      defaultMeta: '⚡ PixelCompute Town · {name} {pct}% · 5/85/10 Proof of First Spark',
      newProjectFallback: 'Genesis Project',
    },
    cert: {
      headerTitle: '★ PIXELCOMPUTE TOWN · WORK CERT',
      headerSub: 'COMPUTE WORK CERTIFICATE & DIVIDEND STATEMENT  ·  PROOF OF ACCEPTED WORK',
      verifiedStamp: '✔ VERIFIED BUILDER',
      issuedPrefix: 'ISSUED: ',
      proBadge: '👑 PRO PASS',
      squadTitle: 'ACTIVE SQUAD · PIXEL WORKERS ({count})',
      sealLine1: 'Anti-Cheat Proof of Accepted Work',
      sealLine2: 'Zero-Trust BYOK · 5/85/10 Merit Revenue Split',
      tierGenesis: 'Genesis Pioneer',
      tierCertified: 'Verified Engineer',
      tierMaster: 'Senior Guild Artisan',
      tierLegend: 'Legendary Compute Lord',
      kpiRepLabel: '🛡️ BUILDER REPUTATION',
      kpiRepSub: '{stars} Trusted Standing',
      kpiTasksLabel: '✅ ACCEPTED TASKS',
      kpiTasksVal: '{count} tasks',
      kpiTasksSub: 'Total Points +{pts} pts',
      kpiUsdLabel: '💵 USD EARNED (BOUNTY + SPLIT)',
      kpiUsdSub: 'Launch Dividends + Net Bounties',
      kpiGoldLabel: '🪙 TOWN GOLD BALANCE',
      kpiGoldSub: 'For Recruiting & Pixel Cosmetics',
      holdingsTitle: '📊 PROJECT HOLDINGS & DIVIDENDS',
      colProject: 'PROJECT',
      colStatus: 'STATUS',
      colProgress: 'PROG',
      colShare: 'POINTS / SHARE',
      holdingsEmpty: 'No holdings yet — dispatch a worker to earn your first dividend share!',
      statusLaunched: '🚀 Live',
      statusVoting: '🗳️ Voting',
      statusBuilding: '🔨 Building',
      revenuePrefix: 'Rev ',
      canJoin: 'Open to Join',
      achievementsTitle: '🏆 GENESIS BADGES ({unlocked}/{total})',
      footerSlogan: 'PixelCompute Town · Turn Idle AI Compute into Shipped Products & Dividends',
    },
  },
});

export function getCanvasI18n(locale) {
  const loc = normalizeLocale(locale);
  return CANVAS_I18N[loc] || CANVAS_I18N['zh-TW'];
}

// ============================================================================
// Core State & Public API
// ============================================================================

function loadInitialLocale() {
  try {
    const primary = localStorage.getItem(PRIMARY_STORAGE_KEY);
    if (primary && DICTIONARY[primary]) return primary;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy && DICTIONARY[legacy]) return legacy;
  } catch {
    // ignore storage errors
  }
  return 'zh-TW';
}

let currentLocale = loadInitialLocale();

export function getLocale() {
  return currentLocale;
}

export function getAllLocales() {
  return SUPPORTED_LANGS;
}

export function setLocale(locale) {
  const next = normalizeLocale(locale);
  if (!DICTIONARY[next]) return currentLocale;
  currentLocale = next;
  try {
    localStorage.setItem(PRIMARY_STORAGE_KEY, next);
    localStorage.setItem(LEGACY_STORAGE_KEY, next);
  } catch {
    // ignore storage errors
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next === 'en' ? 'en' : next === 'zh-CN' ? 'zh-Hans' : 'zh-Hant';
    const titleText = DICTIONARY[next]['page.title'];
    if (titleText) document.title = titleText;
  }
  return currentLocale;
}

export function t(key, vars = null, locale = null) {
  const loc = locale ? normalizeLocale(locale) : currentLocale;
  const table = DICTIONARY[loc] || DICTIONARY['zh-TW'];
  let text = table[key] ?? DICTIONARY['zh-TW'][key] ?? key;
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v ?? ''));
    }
  }
  return text;
}

export function applyI18n(root = typeof document !== 'undefined' ? document : null) {
  if (!root) return;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.dataset.i18nHtml;
    if (key) el.innerHTML = t(key);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key) el.setAttribute('placeholder', t(key));
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (key) el.setAttribute('title', t(key));
  });
  if (typeof document !== 'undefined' && root === document) {
    const titleText = t('page.title');
    if (titleText) document.title = titleText;
  }
}

// Backwards-compatible aliases
export const getLang = getLocale;
export const setLang = setLocale;
export const applyI18nToDom = applyI18n;
