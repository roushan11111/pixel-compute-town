/**
 * PixelCompute Town — 零依賴三語即時切換模組（繁體中文 / 简体中文 / English）
 * 語系設定儲存在 localStorage，不影響後端狀態。
 */

const LANG_STORAGE_KEY = 'pixel_compute_town_lang_v1';

export const SUPPORTED_LANGS = Object.freeze([
  { code: 'zh-TW', label: '繁中' },
  { code: 'zh-CN', label: '简中' },
  { code: 'en', label: 'EN' },
]);

export const DICTIONARY = Object.freeze({
  'zh-TW': {
    'brand.name': '像素算力鎮',
    'brand.sub': 'PixelCompute Town · BYOK + BYOT 雙軌孵化',
    'hud.repPrefix': '信譽',
    'hud.byokDemo': 'BYOK：擬真體驗',
    'hud.byokLive': 'BYOK：{model}',
    'hud.githubLogin': 'GitHub 登入',
    'hud.logout': '登出',
    'hud.certBtn': '🪪 打工證',
    'hud.settingsBtn': '⚙️ 設定',
    'stage.quickNav': '快捷視角：',
    'stage.navFactory': '🏭 自動工坊',
    'stage.navGuild': '⚔️ 懸賞工會',
    'stage.navLaunchpad': '🚀 孵化廣場',
    'stage.navLounge': '☕ 算力宿舍',
    'stage.hintDefault': '點擊建築或像素小人可快速切換對應控制台',
    'stage.sseConnecting': 'SSE 連線中',
    'stage.sseLive': 'SSE 即時連線',
    'stage.sseOffline': 'SSE 重連中...',
    'terminal.title': '小鎮即時動態終端（含 AI 交付與本機 CLI 心跳）',
    'terminal.filterAll': '全部',
    'terminal.filterDeliverable': '交付',
    'terminal.filterRevenue': '分紅',
    'terminal.filterCli': 'CLI',
    'tab.factory': '自動工坊',
    'tab.guild': '懸賞工會',
    'tab.incubator': '孵化廣場',
    'tab.workers': '小人商店',
    'tab.revenue': '創作者收益',
    'onboarding.title': '🧭 創世鎮長 3 步快速體驗',
    'onboarding.step1': '1. 派小人完成首單並通過驗收',
    'onboarding.step2': '2. 幫 PixelPomo 投滿票破土立項',
    'onboarding.step3': '3. 項目上線分紅或匯出打工證',
    'onboarding.collapse': '收合導引',
    'onboarding.expand': '展開 3 步導引',
    'onboarding.allDone': '🎉 全部完成！你已掌握雙軌協作與透明分紅閉環',
    'factory.banner': '⚡ <strong>API 軌道（BYOK 零信任）</strong>：支援瀏覽器直連 Gemini API / OpenAI 相容端點，未填 Key 亦可免門檻擬真體驗！',
    'factory.keyBtn': '🔑 設定 API Key',
    'factory.allProjects': '全部項目',
    'factory.allStatus': '全部狀態',
    'factory.statusOpen': '可接單',
    'factory.statusCompleted': '已驗收',
    'factory.autopilot': '🤖 自動掛機',
    'factory.dispatch': '🚀 一鍵派工執行',
    'factory.working': '⚡ 小人趕工中...',
    'factory.inspect': '📋 查看 AI 交卷與驗收報告',
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
    'incubator.proposeBtn': '＋ 我要提案新項目',
    'incubator.jumpImport': '🔗 匯入 GitHub Issue',
    'workers.myWorkers': '🤖 我的算力小人（管理體力上限與裝扮）',
    'workers.achievements': '🏆 創世成就牆（自動解鎖領金幣＋印上打工證）',
    'workers.recruitTitle': '✨ 招募新算力小人（4 大職業任選）',
    'workers.recruitBtn': '＋ 招募並進駐小鎮',
    'workers.shopTitle': '🛍️ 像素外觀、機房裝潢與 Pro 會員商店',
    'workers.certTitle': '🪪 像素風《算力打工證 PNG》分享卡',
    'workers.certDesc': '一鍵生成專屬復古像素證件，展示你的信譽分、完工數、成就徽章與項目持倉分紅，發推炫耀超吸睛！',
    'workers.previewCert': '👁️ 預覽打工證 PNG',
    'workers.downloadCert': '⬇️ 直接下載 PNG',
    'revenue.totalLabel': '創作者平臺累計總變現（USD）',
    'revenue.resetBtn': '🔄 重置示範世界',
    'revenue.kpiBounty': '⚔️ 現金懸賞 10% 託管抽成',
    'revenue.kpiCarry': '🚀 孵化分紅池 10% Carry',
    'revenue.kpiAds': '📺 像素廣場霓虹廣告位',
    'revenue.kpiPro': '✨ 像素皮膚與 Pro 會員',
    'revenue.historyTitle': '📒 平臺營收流水紀錄',
    'revenue.leaderboardTitle': '🏆 全鎮創世貢獻排行榜',
    'badge.open': '🟡 可派工',
    'badge.working': '⚡ 執行中',
    'badge.completed': '✅ 已驗收',
    'badge.guildOpen': '📜 懸賞開放',
    'badge.guildWorking': '⚔️ 接單進行中',
    'badge.guildCompleted': '✅ 已結案',
    'badge.owned': '✓ 已擁有',
    'btn.buy': '購買',
    'btn.vote': '🗳️ 投贊成票 (+1)',
    'btn.billboard': '📺 租用像素霓虹廣告位 ($29)',
    'btn.launch': '🚀 一鍵發布上線！（觸發 $200 首日分紅）',
    'btn.simRevenue': '💸 模擬產生 $100 營收並分紅',
    'btn.coffee': '☕ 喝咖啡回體力',
    'btn.saveCap': '儲存上限',
    'toast.resetDone': '🔄 示範世界已重置回創世初始狀態！',
    'toast.langSwitched': '🌐 已切換介面語系為：繁體中文',
    'toast.achievement': '🏆 成就解鎖：【{title}】{bonus}',
  },

  'zh-CN': {
    'brand.name': '像素算力镇',
    'brand.sub': 'PixelCompute Town · BYOK + BYOT 双轨孵化',
    'hud.repPrefix': '信誉',
    'hud.byokDemo': 'BYOK：拟真体验',
    'hud.byokLive': 'BYOK：{model}',
    'hud.githubLogin': 'GitHub 登录',
    'hud.logout': '退出登录',
    'hud.certBtn': '🪪 打工证',
    'hud.settingsBtn': '⚙️ 设置',
    'stage.quickNav': '快捷视角：',
    'stage.navFactory': '🏭 自动工坊',
    'stage.navGuild': '⚔️ 悬赏工会',
    'stage.navLaunchpad': '🚀 孵化广场',
    'stage.navLounge': '☕ 算力宿舍',
    'stage.hintDefault': '点击建筑或像素小人可快速切换对应控制台',
    'stage.sseConnecting': 'SSE 连接中',
    'stage.sseLive': 'SSE 实时在线',
    'stage.sseOffline': 'SSE 重连中...',
    'terminal.title': '小镇实时动态终端（含 AI 交付与本机 CLI 心跳）',
    'terminal.filterAll': '全部',
    'terminal.filterDeliverable': '交付',
    'terminal.filterRevenue': '分红',
    'terminal.filterCli': 'CLI',
    'tab.factory': '自动工坊',
    'tab.guild': '悬赏工会',
    'tab.incubator': '孵化广场',
    'tab.workers': '小人商店',
    'tab.revenue': '创作者收益',
    'onboarding.title': '🧭 创始镇长 3 步快速体验',
    'onboarding.step1': '1. 派小人完成首单并通过验收',
    'onboarding.step2': '2. 帮 PixelPomo 投满票破土立项',
    'onboarding.step3': '3. 项目上线分红或导出打工证',
    'onboarding.collapse': '收起引导',
    'onboarding.expand': '展开 3 步引导',
    'onboarding.allDone': '🎉 全部完成！你已掌握双轨协作与透明分红闭环',
    'factory.banner': '⚡ <strong>API 轨道（BYOK 零信任）</strong>：支持浏览器直连 Gemini API / OpenAI 兼容端点，未填 Key 亦可免门槛拟真体验！',
    'factory.keyBtn': '🔑 设置 API Key',
    'factory.allProjects': '全部项目',
    'factory.allStatus': '全部状态',
    'factory.statusOpen': '可接单',
    'factory.statusCompleted': '已验收',
    'factory.autopilot': '🤖 自动挂机',
    'factory.dispatch': '🚀 一键派工执行',
    'factory.working': '⚡ 小人赶工中...',
    'factory.inspect': '📋 查看 AI 交卷与验收报告',
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
    'incubator.proposeBtn': '＋ 我要提案新项目',
    'incubator.jumpImport': '🔗 导入 GitHub Issue',
    'workers.myWorkers': '🤖 我的算力小人（管理体力上限与装扮）',
    'workers.achievements': '🏆 创始成就墙（自动解锁领金币＋印上打工证）',
    'workers.recruitTitle': '✨ 招募新算力小人（4 大职业任选）',
    'workers.recruitBtn': '＋ 招募并进驻小镇',
    'workers.shopTitle': '🛍️ 像素外观、机房装潢与 Pro 会员商店',
    'workers.certTitle': '🪪 像素风《算力打工证 PNG》分享卡',
    'workers.certDesc': '一键生成专属复古像素证件，展示你的信誉分、完工数、成就徽章与项目持仓分红，发帖炫耀超吸睛！',
    'workers.previewCert': '👁️ 预览打工证 PNG',
    'workers.downloadCert': '⬇️ 直接下载 PNG',
    'revenue.totalLabel': '创作者平台累计总变现（USD）',
    'revenue.resetBtn': '🔄 重置示范世界',
    'revenue.kpiBounty': '⚔️ 现金悬赏 10% 托管抽成',
    'revenue.kpiCarry': '🚀 孵化分红池 10% Carry',
    'revenue.kpiAds': '📺 像素广场霓虹广告位',
    'revenue.kpiPro': '✨ 像素皮肤与 Pro 会员',
    'revenue.historyTitle': '📒 平台营收流水记录',
    'revenue.leaderboardTitle': '🏆 全镇创始贡献排行榜',
    'badge.open': '🟡 可派工',
    'badge.working': '⚡ 执行中',
    'badge.completed': '✅ 已验收',
    'badge.guildOpen': '📜 悬赏开放',
    'badge.guildWorking': '⚔️ 接单进行中',
    'badge.guildCompleted': '✅ 已结案',
    'badge.owned': '✓ 已拥有',
    'btn.buy': '购买',
    'btn.vote': '🗳️ 投赞成票 (+1)',
    'btn.billboard': '📺 租用像素霓虹广告位 ($29)',
    'btn.launch': '🚀 一键发布上线！（触发 $200 首日分红）',
    'btn.simRevenue': '💸 模拟产生 $100 营收并分红',
    'btn.coffee': '☕ 喝咖啡回体力',
    'btn.saveCap': '保存上限',
    'toast.resetDone': '🔄 示范世界已重置回创始初始状态！',
    'toast.langSwitched': '🌐 已切换界面语言为：简体中文',
    'toast.achievement': '🏆 成就解锁：【{title}】{bonus}',
  },

  en: {
    'brand.name': 'PixelCompute Town',
    'brand.sub': 'Dual-Track Idle Compute Incubator · BYOK + BYOT',
    'hud.repPrefix': 'Rep',
    'hud.byokDemo': 'BYOK: Sim Mode',
    'hud.byokLive': 'BYOK: {model}',
    'hud.githubLogin': 'GitHub Login',
    'hud.logout': 'Logout',
    'hud.certBtn': '🪪 Work Cert',
    'hud.settingsBtn': '⚙️ Settings',
    'stage.quickNav': 'Quick Focus:',
    'stage.navFactory': '🏭 Auto Factory',
    'stage.navGuild': '⚔️ Bounty Guild',
    'stage.navLaunchpad': '🚀 Launchpad',
    'stage.navLounge': '☕ Lounge',
    'stage.hintDefault': 'Click any building or pixel worker to jump straight to its console',
    'stage.sseConnecting': 'SSE Connecting',
    'stage.sseLive': 'SSE Live',
    'stage.sseOffline': 'SSE Reconnecting...',
    'terminal.title': 'Live Town Terminal Feed (AI Deliverables & Local CLI Heartbeats)',
    'terminal.filterAll': 'All',
    'terminal.filterDeliverable': 'Outputs',
    'terminal.filterRevenue': 'Revenue',
    'terminal.filterCli': 'CLI',
    'tab.factory': 'Factory',
    'tab.guild': 'Guild',
    'tab.incubator': 'Launchpad',
    'tab.workers': 'Workers',
    'tab.revenue': 'Revenue',
    'onboarding.title': '🧭 3-Step Founder Quickstart',
    'onboarding.step1': '1. Dispatch a worker & pass verification',
    'onboarding.step2': '2. Vote PixelPomo to 10/10 to break ground',
    'onboarding.step3': '3. Launch a project or export Work Cert',
    'onboarding.collapse': 'Hide',
    'onboarding.expand': 'Show 3-Step Guide',
    'onboarding.allDone': '🎉 All done! Dual-track workflow & transparent revenue loop complete',
    'factory.banner': '⚡ <strong>API Track (Zero-Trust BYOK)</strong>: Direct browser calls to Gemini API / OpenAI-compatible endpoints, or enjoy zero-key simulation!',
    'factory.keyBtn': '🔑 API Key',
    'factory.allProjects': 'All Projects',
    'factory.allStatus': 'All Status',
    'factory.statusOpen': 'Open',
    'factory.statusCompleted': 'Verified',
    'factory.autopilot': '🤖 Auto-Pilot',
    'factory.dispatch': '🚀 Dispatch Now',
    'factory.working': '⚡ Working...',
    'factory.inspect': '📋 View AI Output & Report',
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
    'incubator.proposeBtn': '+ Propose Project',
    'incubator.jumpImport': '🔗 Import GitHub Issues',
    'workers.myWorkers': '🤖 My Compute Workers (Token Caps & Skins)',
    'workers.achievements': '🏆 Genesis Achievements (Unlock Gold + Cert Badges)',
    'workers.recruitTitle': '✨ Recruit New Worker (4 Classes)',
    'workers.recruitBtn': '+ Recruit to Town',
    'workers.shopTitle': '🛍️ Pixel Cosmetics, Room Decor & Pro Pass',
    'workers.certTitle': '🪪 Shareable Pixel Work Certificate PNG',
    'workers.certDesc': 'Generate a crisp retro pixel certificate with your reputation, verified tasks, unlocked badges, and dividend holdings!',
    'workers.previewCert': '👁️ Preview Cert PNG',
    'workers.downloadCert': '⬇️ Download PNG',
    'revenue.totalLabel': 'Total Creator Platform Revenue (USD)',
    'revenue.resetBtn': '🔄 Reset Demo World',
    'revenue.kpiBounty': '⚔️ 10% Bounty Escrow Fees',
    'revenue.kpiCarry': '🚀 10% Incubation Carry',
    'revenue.kpiAds': '📺 Plaza Neon Billboards',
    'revenue.kpiPro': '✨ Skins & Pro Pass',
    'revenue.historyTitle': '📒 Platform Revenue Ledger',
    'revenue.leaderboardTitle': '🏆 Genesis Contributor Leaderboard',
    'badge.open': '🟡 Open',
    'badge.working': '⚡ Running',
    'badge.completed': '✅ Verified',
    'badge.guildOpen': '📜 Open Bounty',
    'badge.guildWorking': '⚔️ In Progress',
    'badge.guildCompleted': '✅ Settled',
    'badge.owned': '✓ Owned',
    'btn.buy': 'Buy',
    'btn.vote': '🗳️ Vote (+1)',
    'btn.billboard': '📺 Rent Neon Billboard ($29)',
    'btn.launch': '🚀 Launch Now! ($200 Day-1 Split)',
    'btn.simRevenue': '💸 Simulate $100 Revenue & Split',
    'btn.coffee': '☕ Drink Coffee',
    'btn.saveCap': 'Save Cap',
    'toast.resetDone': '🔄 Demo world reset to initial genesis state!',
    'toast.langSwitched': '🌐 Switched UI language to: English',
    'toast.achievement': '🏆 Achievement Unlocked: [{title}] {bonus}',
  },
});

let currentLang = loadInitialLang();

function loadInitialLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && DICTIONARY[saved]) return saved;
  } catch {
    // ignore storage errors
  }
  return 'zh-TW';
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!DICTIONARY[lang]) return currentLang;
  currentLang = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'zh-CN' ? 'zh-Hans' : 'zh-Hant';
  }
  return currentLang;
}

export function t(key, vars = null) {
  const table = DICTIONARY[currentLang] || DICTIONARY['zh-TW'];
  let text = table[key] ?? DICTIONARY['zh-TW'][key] ?? key;
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v ?? ''));
    }
  }
  return text;
}

export function applyI18nToDom(root = typeof document !== 'undefined' ? document : null) {
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
}
