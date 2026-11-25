/**
 * PixelCompute Town — 6-Scene HD Pixel Studio & Town Engine (HTML5 Canvas)
 * Dual-Layer Crisp Architecture:
 *   Layer 1: 480x300 integer/crisp offscreen pixel buffer (imageSmoothingEnabled = false)
 *            with 32x32 HD characters, handcrafted props, dynamic lighting & particles.
 *   Layer 2: HiDPI sharp overlay directly on display canvas for live readable computer
 *            monitors, CLI terminals, model badges, nameplates, HUD dashboards & tooltips.
 *
 * 6 Dedicated HD Scenes:
 *   - 'factory'   : 自動工坊室內 — API 流水線超算中心 (6 HD desks, dual server racks, API core)
 *   - 'guild'     : 懸賞工會大廳 — 月/週額度匠人會館 (4 wood desks, interactive bounty board, weapons rack)
 *   - 'launchpad' : 孵化廣場指揮中心 — 投票立項與全息發射台 (3D hologram pad, vote pillars, kanban, billboard)
 *   - 'lounge'    : 算力宿舍生活館 — 小人管理與商店展示廳 (coffee bar, sofa, sleeping cat, 6-slot trophy case)
 *   - 'vault'     : 創作者金庫大廳 — 黑金分紅銀行與榮耀領獎台 (vault door, coin mountain, 4 rev pillars, Top 3 podium)
 *   - 'town'      : HD 像素小鎮全景地圖 (upgraded top-down overview, click any building to enter indoor HD scene)
 *
 * Zero-dependency ES Module.
 */

import * as I18N from './i18n.js';
import {
  WORKER_ROLE_META,
  drawHDWorker,
  drawWorkerSprite,
  drawObjectSprite,
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
} from './sprites.js';

export const WORLD_W = 480;
export const WORLD_H = 300;
export const LOGICAL_W = WORLD_W;
export const LOGICAL_H = WORLD_H;

const PRIMARY_LANG_STORAGE_KEY = 'pct_locale';
const LANG_STORAGE_KEY = 'pixel_compute_town_lang_v1';

export const SCENES = Object.freeze([
  'factory',
  'guild',
  'launchpad',
  'lounge',
  'vault',
  'town',
]);

// ============================================================================
// Built-in 3-Locale Canvas & Entity Fallbacks (Aligned with public/js/i18n.js)
// ============================================================================

function fmtTpl(tpl, vars) {
  let out = String(tpl ?? '');
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v ?? ''));
    }
  }
  return out;
}

function normalizeLocale(locale) {
  if (locale === 'zh-TW' || locale === 'zh-CN' || locale === 'en') return locale;
  const s = String(locale || '').toLowerCase();
  if (s.startsWith('en')) return 'en';
  if (s === 'zh-cn' || s === 'zh-hans' || s === 'zh-sg') return 'zh-CN';
  if (s.startsWith('zh')) return 'zh-TW';
  return 'zh-TW';
}

function readInitialLocale() {
  try {
    if (typeof I18N.getLocale === 'function') {
      const l = I18N.getLocale();
      if (l) return normalizeLocale(l);
    }
    if (typeof I18N.getLang === 'function') {
      const l = I18N.getLang();
      if (l) return normalizeLocale(l);
    }
    if (typeof localStorage !== 'undefined') {
      const primary = localStorage.getItem(PRIMARY_LANG_STORAGE_KEY);
      if (primary) return normalizeLocale(primary);
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved) return normalizeLocale(saved);
    }
  } catch {
    // ignore storage errors in non-browser runtimes
  }
  return 'zh-TW';
}

const FALLBACK_CANVAS_I18N = Object.freeze({
  'zh-TW': {
    factoryTitle: '🏭 自動工坊 · 超算中心',
    factoryThroughput: 'API 吞吐儀表板',
    factoryQueueOpen: '待接',
    factoryQueueDone: '完成',
    factoryAutoOn: '● AUTO-PILOT 運行中',
    factoryByokReady: '● BYOK 零信任就緒',
    factoryCoreLoad: '⚡ 核心負載',
    factoryIdleDesk: '待機工位',
    guildTitle: '⚔️ 懸賞工會 · 匠人會館',
    guildBoardTitle: '📜 懸賞佈告欄',
    guildPool: '懸賞池',
    guildOpenUnit: '單開放',
    guildClickClaim: '點擊接單',
    guildIdleDesk: '待命工位',
    launchpadTitle: '🚀 孵化廣場 · 指揮中心',
    launchpadSponsored: '★ 像素霓虹贊助廣告 ★',
    launchpadKanban: '📋 項目看板',
    launchpadVoteTitle: '🗳️ 社群投票',
    launchpadProgress: '🏗️ 項目進度',
    launchpadLaunched: '🎆 已上線',
    launchpadCmdFallback: '孵化總控',
    launchpadIdleDesk: '待機工位',
    loungeTitle: '☕ 算力宿舍 · 生活館',
    loungeCoffeeBar: '☕ 咖啡吧台',
    loungeGoldCoffeeBar: '✨ 黃金手沖吧',
    loungeTrophyCase: '🏆 創世成就櫃',
    vaultTitle: '💰 創作者金庫 · 分紅銀行',
    vaultTotalRevenue: '💰 總累積變現',
    vaultPodiumTitle: '🏆 榮耀領獎台',
    vaultStreamBounty: '懸賞 10%',
    vaultStreamCarry: '孵化 10%',
    vaultStreamAds: '霓虹廣告',
    vaultStreamPro: '皮膚 Pro',
    townSponsored: '★ 霓虹贊助 ★',
    townPlaza: '⚡ 像素算力廣場 ⚡',
    buildings: {
      factory: { label: '🏭 自動工坊', subtitle: 'API 超算中心' },
      guild: { label: '⚔️ 懸賞工會', subtitle: '匠人 CLI 會館' },
      vault: { label: '💰 創作者金庫', subtitle: '黑金分紅銀行' },
      lounge: { label: '☕ 算力宿舍', subtitle: '咖啡與獎盃館' },
      launchpad: { label: '🚀 孵化中心', subtitle: '全息發射廣場' },
    },
    monitorIdle: '待機',
    monitorStandbyReady: '● 待命就緒',
    statusCli: '💻 CLI 即時同步',
    statusWorking: '⚡ 執行任務中',
    statusCelebrating: '🎉 驗收歡呼',
    statusIdle: '☕ 待命中',
    staminaLabel: '體力',
    workerFallback: '算力小人',
    dispatchGuildFallback: '工會懸賞任務',
    dispatchApiFallback: 'API 流水線微任務',
    bubbleVerified: '🎉 驗收通過！',
    floatingPtsSuffix: '貢獻點',
    floatingVerified: '✔ 驗收通過!',
    launchFallbackTitle: '新創世項目',
    launchBannerPrefix: '🚀 《',
    launchBannerSuffix: '》正式上線！30/60/10 分紅結算中！',
    bubbleLaunched: '🎆 上線啦！領分紅！',
    cliDefaultMsg: '本機 CLI 同步中...',
    tickerSponsoredSuffix: ' 贊助徵求算力貢獻者！',
    tickerLaunchedSuffix: ' 已正式上線分紅中！',
    tickerBrand: '像素算力鎮',
    tickerProgressWord: '進度',
    tickerSplitTail: '雙軌算力 30/60/10 透明分紅',
    cliTerminalPrLine: 'PR 檢核中 · 0 warnings',
    roles: {
      flash_worker: '閃電機甲貓',
      pro_architect: '紫金貓頭鷹架構師',
      pixel_artist: '櫻粉像素狐狸畫師',
      guild_artisan: '琥珀工會熊匠人',
    },
  },
  'zh-CN': {
    factoryTitle: '🏭 自动工坊 · 超算中心',
    factoryThroughput: 'API 吞吐仪表板',
    factoryQueueOpen: '待接',
    factoryQueueDone: '完成',
    factoryAutoOn: '● AUTO-PILOT 运行中',
    factoryByokReady: '● BYOK 零信任就绪',
    factoryCoreLoad: '⚡ 核心负载',
    factoryIdleDesk: '待机工位',
    guildTitle: '⚔️ 悬赏工会 · 匠人会馆',
    guildBoardTitle: '📜 悬赏布告栏',
    guildPool: '悬赏池',
    guildOpenUnit: '单开放',
    guildClickClaim: '点击接单',
    guildIdleDesk: '待命工位',
    launchpadTitle: '🚀 孵化广场 · 指挥中心',
    launchpadSponsored: '★ 像素霓虹赞助广告 ★',
    launchpadKanban: '📋 项目看板',
    launchpadVoteTitle: '🗳️ 社区投票',
    launchpadProgress: '🏗️ 项目进度',
    launchpadLaunched: '🎆 已上线',
    launchpadCmdFallback: '孵化总控',
    launchpadIdleDesk: '待机工位',
    loungeTitle: '☕ 算力宿舍 · 生活馆',
    loungeCoffeeBar: '☕ 咖啡吧台',
    loungeGoldCoffeeBar: '✨ 黄金手冲吧',
    loungeTrophyCase: '🏆 创始成就柜',
    vaultTitle: '💰 创作者金库 · 分红银行',
    vaultTotalRevenue: '💰 总累计变现',
    vaultPodiumTitle: '🏆 荣耀领奖台',
    vaultStreamBounty: '悬赏 10%',
    vaultStreamCarry: '孵化 10%',
    vaultStreamAds: '霓虹广告',
    vaultStreamPro: '皮肤 Pro',
    townSponsored: '★ 霓虹赞助 ★',
    townPlaza: '⚡ 像素算力广场 ⚡',
    buildings: {
      factory: { label: '🏭 自动工坊', subtitle: 'API 超算中心' },
      guild: { label: '⚔️ 悬赏工会', subtitle: '匠人 CLI 会馆' },
      vault: { label: '💰 创作者金库', subtitle: '黑金分红银行' },
      lounge: { label: '☕ 算力宿舍', subtitle: '咖啡与奖杯馆' },
      launchpad: { label: '🚀 孵化中心', subtitle: '全息发射广场' },
    },
    monitorIdle: '待机',
    monitorStandbyReady: '● 待命就绪',
    statusCli: '💻 CLI 实时同步',
    statusWorking: '⚡ 执行任务中',
    statusCelebrating: '🎉 验收欢呼',
    statusIdle: '☕ 待命中',
    staminaLabel: '体力',
    workerFallback: '算力小人',
    dispatchGuildFallback: '工会悬赏任务',
    dispatchApiFallback: 'API 流水线微任务',
    bubbleVerified: '🎉 验收通过！',
    floatingPtsSuffix: '贡献点',
    floatingVerified: '✔ 验收通过!',
    launchFallbackTitle: '新创始项目',
    launchBannerPrefix: '🚀 《',
    launchBannerSuffix: '》正式上线！30/60/10 分红结算中！',
    bubbleLaunched: '🎆 上线啦！领分红！',
    cliDefaultMsg: '本机 CLI 同步中...',
    tickerSponsoredSuffix: ' 赞助征求算力贡献者！',
    tickerLaunchedSuffix: ' 已正式上线分红中！',
    tickerBrand: '像素算力镇',
    tickerProgressWord: '进度',
    tickerSplitTail: '双轨算力 30/60/10 透明分红',
    cliTerminalPrLine: 'PR 检核中 · 0 warnings',
    roles: {
      flash_worker: '闪电机械猫',
      pro_architect: '紫金猫头鹰架构师',
      pixel_artist: '樱粉像素狐狸画师',
      guild_artisan: '琥珀工会熊匠人',
    },
  },
  en: {
    factoryTitle: '🏭 Auto Factory · HQ',
    factoryThroughput: 'API Throughput',
    factoryQueueOpen: 'Open',
    factoryQueueDone: 'Done',
    factoryAutoOn: '● AUTO-PILOT LIVE',
    factoryByokReady: '● BYOK ZERO-TRUST',
    factoryCoreLoad: '⚡ Core Load',
    factoryIdleDesk: 'Idle Desk',
    guildTitle: '⚔️ Bounty Guild · Hall',
    guildBoardTitle: '📜 Bounty Board',
    guildPool: 'Pool',
    guildOpenUnit: 'Open',
    guildClickClaim: 'Click to Claim',
    guildIdleDesk: 'Standby Desk',
    launchpadTitle: '🚀 Launchpad · Command',
    launchpadSponsored: '★ PIXEL NEON SPONSORED ★',
    launchpadKanban: '📋 Project Kanban',
    launchpadVoteTitle: '🗳️ Community Vote',
    launchpadProgress: '🏗️ Progress',
    launchpadLaunched: '🎆 Launched',
    launchpadCmdFallback: 'Launch Cmd',
    launchpadIdleDesk: 'Idle Desk',
    loungeTitle: '☕ Compute Lounge',
    loungeCoffeeBar: '☕ Coffee Bar',
    loungeGoldCoffeeBar: '✨ Gold Espresso',
    loungeTrophyCase: '🏆 Trophy Case',
    vaultTitle: '💰 Creator Vault · Bank',
    vaultTotalRevenue: '💰 Total Revenue',
    vaultPodiumTitle: '🏆 Honor Podium',
    vaultStreamBounty: 'Bounty 10%',
    vaultStreamCarry: 'Carry 10%',
    vaultStreamAds: 'Neon Ads',
    vaultStreamPro: 'Skins Pro',
    townSponsored: '★ SPONSORED ★',
    townPlaza: '⚡ TOWN PLAZA ⚡',
    buildings: {
      factory: { label: '🏭 Auto Factory', subtitle: 'API Compute HQ' },
      guild: { label: '⚔️ Bounty Guild', subtitle: 'Artisan CLI Hall' },
      vault: { label: '💰 Creator Vault', subtitle: 'Dividend Bank' },
      lounge: { label: '☕ Compute Lounge', subtitle: 'Cafe & Trophies' },
      launchpad: { label: '🚀 Launchpad', subtitle: 'Holo Launch Plaza' },
    },
    monitorIdle: 'IDLE',
    monitorStandbyReady: '● STANDBY READY',
    statusCli: '💻 CLI Live Sync',
    statusWorking: '⚡ Working',
    statusCelebrating: '🎉 Verified!',
    statusIdle: '☕ Standby',
    staminaLabel: 'Stamina',
    workerFallback: 'Worker',
    dispatchGuildFallback: 'Guild Bounty Task',
    dispatchApiFallback: 'API Pipeline Task',
    bubbleVerified: '🎉 Verified!',
    floatingPtsSuffix: 'pts',
    floatingVerified: '✔ Verified!',
    launchFallbackTitle: 'Genesis Project',
    launchBannerPrefix: '🚀 "',
    launchBannerSuffix: '" Launched! 30/60/10 Split Live!',
    bubbleLaunched: '🎆 Launched! Dividends!',
    cliDefaultMsg: 'Local CLI syncing...',
    tickerSponsoredSuffix: ' Sponsored · Seeking Contributors!',
    tickerLaunchedSuffix: ' is LIVE & Sharing Dividends!',
    tickerBrand: 'PixelCompute Town',
    tickerProgressWord: 'Progress',
    tickerSplitTail: 'Dual-Track 30/60/10 Revenue Split',
    cliTerminalPrLine: 'PR review · 0 warnings',
    roles: {
      flash_worker: 'Cyber Volt-Bot',
      pro_architect: 'Sage Architect',
      pixel_artist: 'Pixel Fox Artist',
      guild_artisan: 'Forge Artisan',
    },
  },
});

const FALLBACK_WORKERS = Object.freeze({
  'w-flash-01': {
    'zh-TW': { name: '閃電小吉 (Flash-01)', providerLabel: 'Gemini 2.5 Flash' },
    'zh-CN': { name: '闪电小吉 (Flash-01)', providerLabel: 'Gemini 2.5 Flash' },
    en: { name: 'Volt Flash (Flash-01)', providerLabel: 'Gemini 2.5 Flash' },
  },
  'w-pro-01': {
    'zh-TW': { name: '架構師阿瓜 (Pro-01)', providerLabel: 'Gemini CLI / 週額度' },
    'zh-CN': { name: '架构师阿瓜 (Pro-01)', providerLabel: 'Gemini CLI / 周额度' },
    en: { name: 'Sage Owl (Pro-01)', providerLabel: 'Gemini CLI / Weekly' },
  },
});

const FALLBACK_PROJECTS = Object.freeze({
  'proj-meta': {
    'zh-TW': { name: '像素算力鎮 v1.0', shortName: '像素算力鎮 v1.0', billboardText: '' },
    'zh-CN': { name: '像素算力镇 v1.0', shortName: '像素算力镇 v1.0', billboardText: '' },
    en: { name: 'PixelCompute Town v1.0', shortName: 'PixelCompute v1.0', billboardText: '' },
  },
  'proj-i18n': {
    'zh-TW': {
      name: 'i18n-PixelBot（開源多語系插件）',
      shortName: 'i18n-PixelBot',
      billboardText: '🔥 i18n-PixelBot $40/$25 現金懸賞徵求高手！',
    },
    'zh-CN': {
      name: 'i18n-PixelBot（开源多语系插件）',
      shortName: 'i18n-PixelBot',
      billboardText: '🔥 i18n-PixelBot $40/$25 现金悬赏征求高手！',
    },
    en: {
      name: 'i18n-PixelBot (Open-Source i18n Plugin)',
      shortName: 'i18n-PixelBot',
      billboardText: '🔥 i18n-PixelBot $40/$25 Cash Bounties Open Now!',
    },
  },
  'proj-pomo': {
    'zh-TW': { name: 'PixelPomo（像素番茄鐘獨立工具）', shortName: 'PixelPomo', billboardText: '' },
    'zh-CN': { name: 'PixelPomo（像素番茄钟独立工具）', shortName: 'PixelPomo', billboardText: '' },
    en: { name: 'PixelPomo (Retro Focus Timer)', shortName: 'PixelPomo', billboardText: '' },
  },
});

const FALLBACK_TASKS = Object.freeze({
  'task-meta-i18n': {
    'zh-TW': '翻譯小鎮商店與公告介面為 en / ja 多語系 JSON',
    'zh-CN': '翻译小镇商店与公告界面为 en / ja 多语系 JSON',
    en: 'Translate Town Shop & Feed to en/ja JSON',
  },
  'task-meta-spec': {
    'zh-TW': '制定夜市限定像素精靈與霓虹看板配色表 JSON',
    'zh-CN': '制定夜市限定像素精灵与霓虹看板配色表 JSON',
    en: 'Design Cyber Night Market Palette Spec JSON',
  },
  'task-meta-docs': {
    'zh-TW': '整理 BYOK 零信任安全架構與防刷單白皮書摘要',
    'zh-CN': '整理 BYOK 零信任安全架构与防刷单白皮书摘要',
    en: 'Write BYOK Zero-Trust & PoAW Whitepaper',
  },
  'task-meta-pr': {
    'zh-TW': '實作小鎮鍵盤快捷鍵導覽與快速切換建築視角 PR',
    'zh-CN': '实现小镇键盘快捷键导航与快速切换建筑视角 PR',
    en: 'Add Keyboard Shortcuts & Scene Switch PR',
  },
  'task-meta-bugfix': {
    'zh-TW': '修復 SSE 斷線重連後小人動畫狀態閃爍問題',
    'zh-CN': '修复 SSE 断线重连后小人动画状态闪烁问题',
    en: 'Fix SSE Reconnect Worker Flicker Bug',
  },
  'task-i18n-locales': {
    'zh-TW': '[$10 懸賞] 批次翻譯 CLI 錯誤碼表（zh-TW / en / ja / ko）',
    'zh-CN': '[$10 悬赏] 批量翻译 CLI 错误码表（zh-TW / en / ja / ko）',
    en: '[$10 Bounty] Batch Translate CLI Error Codes',
  },
  'task-i18n-tests': {
    'zh-TW': '為 ICU 複數語法解析器撰寫邊界單元測試',
    'zh-CN': '为 ICU 复数语法解析器撰写边界单元测试',
    en: 'Write ICU Plural Parser Edge Unit Tests',
  },
  'task-i18n-qa': {
    'zh-TW': '巡檢開源範本語系檔佔位符一致性與缺漏報告',
    'zh-CN': '巡检开源模板语系档占位符一致性与缺漏报告',
    en: 'Audit Locale Placeholder Consistency QA',
  },
  'task-i18n-ast-pr': {
    'zh-TW': '[$40 現金懸賞] 支援 TypeScript JSX AST 自動抽取翻譯鍵值',
    'zh-CN': '[$40 现金悬赏] 支持 TypeScript JSX AST 自动抽取翻译键值',
    en: '[$40 Bounty] TS/JSX AST i18n Key Extractor',
  },
  'task-i18n-gh-action': {
    'zh-TW': '[$25 現金懸賞] 修復 GitHub Action PR Comment 權限與重試邏輯',
    'zh-CN': '[$25 现金悬赏] 修复 GitHub Action PR Comment 权限与重试逻辑',
    en: '[$25 Bounty] Fix GitHub Action PR Retry',
  },
});

const FALLBACK_LEADERBOARD = Object.freeze({
  'npc-kuro': { 'zh-TW': '算力武士 Kuro', 'zh-CN': '算力武士 Kuro', en: 'Kuro Samurai' },
  'npc-momo': { 'zh-TW': '像素貓 Momo', 'zh-CN': '像素猫 Momo', en: 'Momo Pixel' },
  'npc-yuna': { 'zh-TW': '星雲織女 Yuna', 'zh-CN': '星云织女 Yuna', en: 'Yuna Nebula' },
  'npc-rin': { 'zh-TW': '架構師 Rin', 'zh-CN': '架构师 Rin', en: 'Architect Rin' },
  'founder-demo': { 'zh-TW': '創始鎮長', 'zh-CN': '创始镇长', en: 'Founder Mayor' },
  'npc-zero': { 'zh-TW': '夜貓工程師 Zero', 'zh-CN': '夜猫工程师 Zero', en: 'Zero Byte' },
});

// ============================================================================
// Scene Layouts (Tuned for 480x300 with ZERO overlap for 32x32 HD Workers + 58x28 Monitors)
// ============================================================================

const FACTORY_DESKS = [
  { id: 0, x: 66, y: 116, label: 'API-01' },
  { id: 1, x: 164, y: 116, label: 'API-02' },
  { id: 2, x: 316, y: 116, label: 'API-03' },
  { id: 3, x: 414, y: 116, label: 'API-04' },
  { id: 4, x: 76, y: 232, label: 'API-05' },
  { id: 5, x: 404, y: 232, label: 'API-06' },
];

const GUILD_DESKS = [
  { id: 0, x: 108, y: 122, label: 'CLI-01' },
  { id: 1, x: 372, y: 122, label: 'CLI-02' },
  { id: 2, x: 108, y: 234, label: 'CLI-03' },
  { id: 3, x: 372, y: 234, label: 'CLI-04' },
];

const LAUNCHPAD_DESKS = [
  { id: 0, x: 68, y: 242, label: 'CMD-01' },
  { id: 1, x: 412, y: 242, label: 'CMD-02' },
];

const LOUNGE_SPOTS = [
  { x: 112, y: 146, kind: 'coffee' },
  { x: 174, y: 214, kind: 'rug' },
  { x: 298, y: 214, kind: 'rug' },
  { x: 368, y: 164, kind: 'sofa' },
  { x: 118, y: 258, kind: 'pad' },
  { x: 240, y: 262, kind: 'pad' },
  { x: 362, y: 258, kind: 'pad' },
  { x: 422, y: 218, kind: 'sofa' },
];

// Town Overview Buildings (480x300)
const TOWN_BUILDINGS = {
  factory: {
    id: 'factory',
    label: '🏭 自動工坊',
    subtitle: 'API 超算中心',
    x: 12,
    y: 26,
    w: 152,
    h: 108,
    accent: '#22d3ee',
    doorX: 142,
    doorY: 136,
    spotX: 88,
    spotY: 106,
  },
  guild: {
    id: 'guild',
    label: '⚔️ 懸賞工會',
    subtitle: '匠人 CLI 會館',
    x: 316,
    y: 26,
    w: 152,
    h: 108,
    accent: '#f59e0b',
    doorX: 338,
    doorY: 136,
    spotX: 392,
    spotY: 106,
  },
  vault: {
    id: 'vault',
    label: '💰 創作者金庫',
    subtitle: '黑金分紅銀行',
    x: 186,
    y: 24,
    w: 108,
    h: 62,
    accent: '#fbbf24',
    doorX: 240,
    doorY: 88,
    spotX: 240,
    spotY: 74,
  },
  lounge: {
    id: 'lounge',
    label: '☕ 算力宿舍',
    subtitle: '咖啡與獎盃館',
    x: 12,
    y: 178,
    w: 152,
    h: 108,
    accent: '#f472b6',
    doorX: 142,
    doorY: 176,
    spotX: 88,
    spotY: 254,
  },
  launchpad: {
    id: 'launchpad',
    label: '🚀 孵化中心',
    subtitle: '全息發射廣場',
    x: 316,
    y: 178,
    w: 152,
    h: 108,
    accent: '#a855f7',
    doorX: 338,
    doorY: 176,
    spotX: 392,
    spotY: 254,
  },
};

const API_TERMINAL_LINES = [
  ['$ gemini-2.5-flash --json', '> streaming i18n keys...', '[OK] PoAW schema valid'],
  ['$ node --test ./spec.mjs', '> 14/14 assertions pass', '[PASS] token cap safe'],
  ['$ api-worker --dispatch', '> building pixel palette', '> verifying digest 98%'],
  ['$ byok-runner --zero-trust', '> diff clean · 0 leaks', '[OK] ready to submit'],
];

const CLI_TERMINAL_LINES = [
  ['$ gemini-cli --watch', '> syncing PR diff +142', 'PR check · 0 warnings'],
  ['$ claude-code --bounty', '> AST refactor complete', '[OK] tests 100% green'],
  ['$ codex-cli --heartbeat', '> fixing SSE backoff', '> pushing patch branch'],
  ['$ pixel-worker --sync', '> BYOT local quota ok', '[PASS] ready for review'],
];

const MODEL_STYLES = {
  api: { short: 'Gemini Flash', bg: '#083344', border: '#22d3ee', text: '#a5f3fc' },
  pixel: { short: 'Pixel Flash', bg: '#4a044e', border: '#f472b6', text: '#fbcfe8' },
  pro: { short: 'Gemini CLI', bg: '#2e1065', border: '#a855f7', text: '#e9d5ff' },
  artisan: { short: 'Claude/Codex', bg: '#451a03', border: '#f59e0b', text: '#fde68a' },
};

// ============================================================================
// Pure Utility Helpers
// ============================================================================

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function truncateText(text, maxChars) {
  if (!text) return '';
  const str = String(text);
  return str.length > maxChars ? `${str.slice(0, maxChars - 1)}…` : str;
}

function formatWorkerNameplate(name, locale = 'zh-TW', fallback = '小人', maxOverride = null) {
  const safeName = name ? String(name) : fallback;
  const cleaned = safeName
    .replace(/\s*[（(][^）)]*[）)]\s*$/g, '')
    .trim();
  const limit = maxOverride ?? (locale === 'en' ? 12 : 9);
  return truncateText(cleaned || safeName.trim(), limit);
}

function formatUsd(val) {
  const n = Number(val) || 0;
  return `$${n.toFixed(n >= 100 ? 0 : 2)}`;
}

function getWorkerModelStyle(worker, providerOverride = null) {
  if (!worker) return MODEL_STYLES.api;
  const rawProv = providerOverride || worker.providerLabel || '';
  const prov = String(rawProv).toLowerCase();
  if (worker.roleClass === 'pixel_artist') {
    return { ...MODEL_STYLES.pixel, short: truncateText(rawProv || 'Pixel Flash', 14) };
  }
  if (worker.roleClass === 'pro_architect' || prov.includes('gemini cli')) {
    return { ...MODEL_STYLES.pro, short: truncateText(rawProv || 'Gemini CLI', 14) };
  }
  if (worker.roleClass === 'guild_artisan' || prov.includes('claude') || prov.includes('codex')) {
    return { ...MODEL_STYLES.artisan, short: truncateText(rawProv || 'Claude CLI', 14) };
  }
  return { ...MODEL_STYLES.api, short: truncateText(rawProv || 'Gemini Flash', 14) };
}

function normalizeSceneId(id) {
  const map = {
    factory: 'factory',
    api: 'factory',
    guild: 'guild',
    bounty: 'guild',
    launchpad: 'launchpad',
    incubator: 'launchpad',
    lounge: 'lounge',
    workers: 'lounge',
    dorm: 'lounge',
    vault: 'vault',
    founder: 'vault',
    bank: 'vault',
    town: 'town',
    overview: 'town',
    map: 'town',
  };
  return map[String(id || '').toLowerCase()] || 'factory';
}

// ============================================================================
// Main 6-Scene HD Pixel Engine Class
// ============================================================================

export class PixelTownEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{
   *   onSelectBuilding?: (id: string) => void,
   *   onSelectWorker?: (id: string) => void,
   *   onSceneChange?: (sceneId: string) => void,
   *   onSelectTask?: (taskId: string) => void,
   *   locale?: 'zh-TW' | 'zh-CN' | 'en',
   * }} callbacks
   */
  constructor(canvas, callbacks = {}) {
    if (!canvas) {
      throw new Error('PixelTownEngine requires a valid <canvas> element');
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.callbacks = callbacks || {};

    this.scene = 'factory';
    this.prevScene = null;
    this.transitionProgress = 1; // 0 -> 1 smooth wipe
    this.dayNight = 'night';
    this.locale = this.callbacks.locale ? normalizeLocale(this.callbacks.locale) : readInitialLocale();
    this.destroyed = false;
    this.time = 0;
    this.lastFrameTs = 0;
    this.rafId = null;

    // Offscreen crisp 480x300 pixel buffer
    this.buffer = document.createElement('canvas');
    this.buffer.width = WORLD_W;
    this.buffer.height = WORLD_H;
    this.bctx = this.buffer.getContext('2d', { alpha: false });
    this.bctx.imageSmoothingEnabled = false;

    // Viewport transform cache for HiDPI overlays & pointer hit-testing
    this.scale = 2;
    this.offsetX = 0;
    this.offsetY = 0;
    this.dpr = 1;
    this.viewRect = { x: 0, y: 0, w: WORLD_W, h: WORLD_H, scale: 1 };

    // Full synced world state
    this.state = {
      player: {},
      workers: [],
      projects: [],
      tasks: [],
      leaderboard: [],
      founderRevenue: {
        bountyFeesUsd: 0,
        incubationCarryUsd: 0,
        billboardAdsUsd: 0,
        proSkinsUsd: 0,
        totalUsd: 0,
      },
      achievements: [],
    };
    this.ownedDecor = new Set();
    this.playerIsPro = false;
    this.unlockedAchievements = 0;

    // Animated worker agents (persisted across scenes, each holds per-scene coords)
    this.agents = new Map();
    this.selectedWorkerId = null;
    this.hoveredWorkerId = null;
    this.selectedBuildingId = null;
    this.hoveredBuildingId = null;
    this.hoveredBountyTaskId = null;
    this.hoveredPropId = null;

    // Per-frame interactive hitboxes populated during render
    this._frameMonitors = []; // { worker, screenRect, desk, isActive, style }
    this._frameWorkers = []; // { agent, x, y, scale, hideBadge }
    this._frameBountyRects = []; // { task, x, y, w, h }
    this._frameVotePillars = []; // { project, x, y, w, h }

    // Visual effects
    this.floatingTexts = [];
    this.coinParticles = [];
    this.fireworkRockets = [];
    this.fireworkSparks = [];
    this.dataParticles = [];
    this.steamParticles = [];
    this.meteors = [];
    this.nextMeteorIn = 2.8;
    this.launchBannerTimer = 0;
    this.launchBannerText = '';
    this.launchBannerProjectId = null;
    this.ambientFlash = 0;
    this.marqueeOffset = 0;

    // Deterministic ambient environment arrays
    this.stars = Array.from({ length: 56 }, (_, i) => ({
      x: (i * 43 + 11) % WORLD_W,
      y: (i * 19 + 4) % 58,
      phase: i * 0.67,
      size: i % 7 === 0 ? 2 : 1,
      tint: i % 5 === 0 ? '#67e8f9' : i % 6 === 0 ? '#fde68a' : i % 9 === 0 ? '#f9a8d4' : '#e2e8f0',
    }));
    this.clouds = [
      { x: 22, y: 6, w: 28, speed: 4.0 },
      { x: 158, y: 12, w: 36, speed: 2.9 },
      { x: 302, y: 7, w: 26, speed: 4.5 },
      { x: 420, y: 11, w: 32, speed: 3.3 },
    ];
    this.fireflies = Array.from({ length: 14 }, (_, i) => ({
      baseX: 165 + ((i * 37) % 150),
      baseY: 96 + ((i * 29) % 116),
      phase: i * 1.07,
      speed: 0.75 + (i % 4) * 0.22,
    }));

    // Bind pointer & resize events
    this._onResize = this._resize.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerLeave = this._handlePointerLeave.bind(this);
    this._onClick = this._handleClick.bind(this);

    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerleave', this._onPointerLeave);
    this.canvas.addEventListener('click', this._onClick);

    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this._resizeObserver = new ResizeObserver(() => this._resize());
      this._resizeObserver.observe(this.canvas.parentElement);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._onResize);
    }

    this._resize();
    this._startLoop();
  }

  // ==========================================================================
  // Public Contract API (100% Backward Compatible + 6-Scene + 3-Locale APIs)
  // ==========================================================================

  setLocale(locale) {
    const next = normalizeLocale(locale);
    this.locale = next;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PRIMARY_LANG_STORAGE_KEY, next);
        localStorage.setItem(LANG_STORAGE_KEY, next);
      }
    } catch {
      // ignore storage errors
    }
    const c = this._getCanvasI18n();
    // Re-localize active launch banner if showing
    if (this.launchBannerTimer > 0 && this.launchBannerProjectId) {
      const proj = this.state.projects.find((p) => p.id === this.launchBannerProjectId);
      const lp = proj ? this._localizeProject(proj) : null;
      const title = lp ? truncateText(lp.shortName || lp.name, this.locale === 'en' ? 20 : 16) : c.launchFallbackTitle;
      this.launchBannerText = c.launchBannerTpl
        ? fmtTpl(c.launchBannerTpl, { name: title })
        : `${c.launchBannerPrefix}${title}${c.launchBannerSuffix}`;
    }
    // Re-localize active floating reward texts
    for (const ft of this.floatingTexts) {
      if (ft.kind === 'pts') {
        ft.text = c.floatPointsTpl ? fmtTpl(c.floatPointsTpl, { pts: ft.val }) : `+${ft.val} ${c.floatingPtsSuffix}`;
      } else if (ft.kind === 'verified') {
        ft.text = c.floatingVerified;
      }
    }
    // Re-localize active system speech bubbles
    for (const agent of this.agents.values()) {
      if (agent.bubbleTimer <= 0) continue;
      if (agent.bubbleKey === 'verified') agent.bubbleText = c.bubbleVerified;
      else if (agent.bubbleKey === 'launched') agent.bubbleText = c.bubbleLaunched;
      else if (agent.bubbleKey === 'cli_default') agent.bubbleText = `> ${truncateText(c.cliDefaultMsg, 18)}`;
    }
    return this.locale;
  }

  getLocale() {
    return this.locale;
  }

  setScene(sceneId) {
    const next = normalizeSceneId(sceneId);
    if (next === this.scene) return this.scene;
    this.prevScene = this.scene;
    this.scene = next;
    this.transitionProgress = 0;
    this.hoveredBuildingId = null;
    this.hoveredBountyTaskId = null;
    this.hoveredPropId = null;
    this._syncSceneTargets(true);
    this.callbacks.onSceneChange?.(this.scene);
    return this.scene;
  }

  getScene() {
    return this.scene;
  }

  setDayNight(mode) {
    this.dayNight = mode === 'day' ? 'day' : 'night';
  }

  // ==========================================================================
  // Dynamic 3-Locale Resolution Helpers (Aligned with public/js/i18n.js)
  // ==========================================================================

  _getCanvasI18n() {
    const loc = this.locale || 'zh-TW';
    const fb = FALLBACK_CANVAS_I18N[loc] || FALLBACK_CANVAS_I18N['zh-TW'];
    let ext = null;
    try {
      if (typeof I18N.getCanvasI18n === 'function') {
        ext = I18N.getCanvasI18n(loc);
      }
    } catch {
      ext = null;
    }
    if (!ext || typeof ext !== 'object') return fb;
    const sc = ext.scenes || {};
    const wk = ext.worker || {};
    const tk = ext.ticker || {};
    return {
      ...fb,
      factoryTitle: sc.factory?.title || fb.factoryTitle,
      factoryThroughput: sc.factory?.dashboard || fb.factoryThroughput,
      factoryOpenDoneTpl: sc.factory?.openDone || null,
      factoryAutoOn: sc.factory?.autoOn || fb.factoryAutoOn,
      factoryByokReady: sc.factory?.byokReady || fb.factoryByokReady,
      factoryCoreLoad: sc.factory?.coreLoad || fb.factoryCoreLoad,
      factoryIdleDesk: sc.factory?.idleDesk || fb.factoryIdleDesk,
      guildTitle: sc.guild?.title || fb.guildTitle,
      guildBoardTitle: sc.guild?.boardTitle ? `📜 ${sc.guild.boardTitle.replace(/^📜\s*/, '')}` : fb.guildBoardTitle,
      guildPoolSummaryTpl: sc.guild?.poolSummary || null,
      guildClickClaim: sc.guild?.clickClaim || fb.guildClickClaim,
      guildIdleDesk: sc.guild?.idleDesk || fb.guildIdleDesk,
      launchpadTitle: sc.launchpad?.liveHeader || sc.launchpad?.title || fb.launchpadTitle,
      launchpadSponsored: sc.launchpad?.sponsoredHeader || fb.launchpadSponsored,
      launchpadKanban: sc.launchpad?.kanbanTitle ? `📋 ${sc.launchpad.kanbanTitle.replace(/^📋\s*/, '')}` : fb.launchpadKanban,
      launchpadVoteTitle: sc.launchpad?.voteLabel ? `🗳️ ${sc.launchpad.voteLabel.replace(/^🗳️\s*/, '')}` : fb.launchpadVoteTitle,
      launchpadProgress: sc.launchpad?.buildingTag || fb.launchpadProgress,
      launchpadLaunched: sc.launchpad?.launchedTag || fb.launchpadLaunched,
      launchpadCmdFallback: sc.launchpad?.fallbackTitle || fb.launchpadCmdFallback,
      loungeTitle: sc.lounge?.title || fb.loungeTitle,
      loungeCoffeeBar: sc.lounge?.coffeeBar || fb.loungeCoffeeBar,
      loungeGoldCoffeeBar: sc.lounge?.goldCoffeeBar || fb.loungeGoldCoffeeBar,
      loungeTrophyCaseTpl: sc.lounge?.trophyCase || null,
      vaultTitle: sc.vault?.title || fb.vaultTitle,
      vaultTotalRevTpl: sc.vault?.totalRev || null,
      vaultPodiumTitle: sc.vault?.podiumTitle ? `🏆 ${sc.vault.podiumTitle.replace(/^🏆\s*/, '')}` : fb.vaultPodiumTitle,
      vaultStreamBounty: sc.vault?.pillarBounty || fb.vaultStreamBounty,
      vaultStreamCarry: sc.vault?.pillarCarry || fb.vaultStreamCarry,
      vaultStreamAds: sc.vault?.pillarAds || fb.vaultStreamAds,
      vaultStreamPro: sc.vault?.pillarPro || fb.vaultStreamPro,
      statusCli: wk.statusCli || fb.statusCli,
      statusWorking: wk.statusWorking || fb.statusWorking,
      statusCelebrating: wk.statusCelebrate || fb.statusCelebrating,
      statusIdle: wk.statusIdle || fb.statusIdle,
      staminaTpl: wk.stamina || null,
      workerFallback: wk.defaultName || fb.workerFallback,
      dispatchApiFallback: wk.defaultApiTask || fb.dispatchApiFallback,
      dispatchGuildFallback: wk.defaultGuildTask || fb.dispatchGuildFallback,
      bubbleVerified: wk.bubblePassed || fb.bubbleVerified,
      bubbleLaunched: wk.bubbleLaunched || fb.bubbleLaunched,
      floatPointsTpl: wk.floatPoints || null,
      floatingVerified: wk.floatPassed || fb.floatingVerified,
      cliDefaultMsg: wk.cliSyncing || fb.cliDefaultMsg,
      cliTerminalPrLine: wk.prChecking || fb.cliTerminalPrLine,
      launchFallbackTitle: tk.newProjectFallback || fb.launchFallbackTitle,
      launchBannerTpl: tk.launchBanner || null,
      tickerSponsoredTpl: tk.sponsorFallback || null,
      tickerLaunchedTpl: tk.launchedMsg || null,
      tickerDefaultMetaTpl: tk.defaultMeta || null,
      buildings: {
        factory: { ...fb.buildings.factory, ...(ext.buildings?.factory || {}) },
        guild: { ...fb.buildings.guild, ...(ext.buildings?.guild || {}) },
        vault: { ...fb.buildings.vault, ...(ext.buildings?.vault || {}) },
        lounge: { ...fb.buildings.lounge, ...(ext.buildings?.lounge || {}) },
        launchpad: { ...fb.buildings.launchpad, ...(ext.buildings?.launchpad || {}) },
      },
      roles: {
        ...fb.roles,
        ...(ext.roles || {}),
      },
    };
  }

  _localizeWorker(worker) {
    const loc = this.locale || 'zh-TW';
    const c = this._getCanvasI18n();
    const src = worker?.rawWorker || worker || {};
    const fbEntry = FALLBACK_WORKERS[src.id]?.[loc] || null;
    let ext = null;
    try {
      if (typeof I18N.localizeWorker === 'function') {
        ext = I18N.localizeWorker(src, loc);
      }
    } catch {
      ext = null;
    }
    const meta = WORKER_ROLE_META[src.roleClass] || WORKER_ROLE_META.flash_worker;
    const rawProv = ext?.providerLabel || fbEntry?.providerLabel || src.providerLabel || '';
    let providerLabel = rawProv;
    if (loc === 'en' && /週額度|周额度/.test(providerLabel)) {
      providerLabel = providerLabel.replace(/週額度|周额度/g, 'Weekly');
    } else if (loc === 'zh-CN' && /週額度/.test(providerLabel)) {
      providerLabel = providerLabel.replace(/週額度/g, '周额度');
    }
    return {
      name: ext?.name || fbEntry?.name || src.name || src.id || c.workerFallback,
      roleName: ext?.roleName || c.roles[src.roleClass] || meta.speciesName || meta.name,
      providerLabel,
      lastMessage: ext?.lastMessage || src.lastMessage || '',
    };
  }

  _localizeProject(project) {
    const loc = this.locale || 'zh-TW';
    if (!project) return { name: '', shortName: '', billboardText: '' };
    const fb = FALLBACK_PROJECTS[project.id]?.[loc] || null;
    let ext = null;
    try {
      if (typeof I18N.localizeProject === 'function') {
        ext = I18N.localizeProject(project, loc);
      }
    } catch {
      ext = null;
    }
    const name = ext?.name || fb?.name || project.name || project.id || '';
    const shortName =
      ext?.shortName ||
      fb?.shortName ||
      (ext?.name ? ext.name.replace(/\s*[（(][^）)]*[）)]\s*$/g, '').trim() : null) ||
      project.shortName ||
      name;
    const billboardText =
      (project.billboardText && ext?.billboardText) ||
      (project.billboardText && fb?.billboardText) ||
      project.billboardText ||
      '';
    return { name, shortName, billboardText };
  }

  _localizeTask(task) {
    const loc = this.locale || 'zh-TW';
    if (!task) return { title: '' };
    let ext = null;
    try {
      if (typeof I18N.localizeTask === 'function') {
        ext = I18N.localizeTask(task, loc);
      }
    } catch {
      ext = null;
    }
    const fbTitle = FALLBACK_TASKS[task.id]?.[loc] || null;
    let title = ext?.title || fbTitle || task.title || '';
    if (!ext?.title && !fbTitle && loc === 'en' && title) {
      // Translate dynamically generated project tasks cleanly in fallback mode
      const m = title.match(/《([^》]+)》/);
      const proj = m ? m[1] : '';
      if (task.category === 'i18n' && proj) title = `Generate i18n JSON for ${proj}`;
      else if (task.category === 'pixel_spec' && proj) title = `Pixel Palette Spec for ${proj}`;
      else if (task.category === 'unit_test' && proj) title = `Core Unit Tests for ${proj}`;
      else if (task.category === 'feature_pr' && proj) title = `Core Feature & Shortcuts PR (${proj})`;
      else if (task.category === 'bugfix' && proj) title = `Stability & Launch Script (${proj})`;
    }
    return { title };
  }

  _localizeLeaderboardEntry(entry) {
    const loc = this.locale || 'zh-TW';
    if (!entry) return { displayName: '', badge: '' };
    let ext = null;
    try {
      if (typeof I18N.localizeLeaderboardEntry === 'function') {
        ext = I18N.localizeLeaderboardEntry(entry, loc);
      }
    } catch {
      ext = null;
    }
    const fbName = FALLBACK_LEADERBOARD[entry.userId]?.[loc] || null;
    return {
      displayName: ext?.displayName || fbName || entry.displayName || entry.userId || '',
      badge: ext?.badge || entry.badge || '',
    };
  }

  syncState(state) {
    if (!state || typeof state !== 'object') return;
    const raw = state.state && Array.isArray(state.state.workers) ? state.state : state;

    this.state = {
      player: raw.player || {},
      workers: Array.isArray(raw.workers) ? raw.workers : [],
      projects: Array.isArray(raw.projects) ? raw.projects : [],
      tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
      leaderboard: Array.isArray(raw.leaderboard) ? raw.leaderboard : [],
      founderRevenue: raw.founderRevenue || {
        bountyFeesUsd: 0,
        incubationCarryUsd: 0,
        billboardAdsUsd: 0,
        proSkinsUsd: 0,
        totalUsd: 0,
      },
      achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    };

    // Sync owned decor / skins / Pro / achievements
    const player = this.state.player || {};
    const decorSet = new Set();
    for (const arr of [player.ownedDecor, player.ownedItems, player.ownedSkins]) {
      if (Array.isArray(arr)) {
        for (const id of arr) decorSet.add(String(id));
      }
    }
    this.ownedDecor = decorSet;
    this.playerIsPro = Boolean(player.isPro || decorSet.has('pro-pass-monthly'));
    this.unlockedAchievements = this.state.achievements.filter((a) => a && a.unlocked).length;

    const activeIds = new Set();
    for (const w of this.state.workers) activeIds.add(w.id);

    for (const id of Array.from(this.agents.keys())) {
      if (!activeIds.has(id)) this.agents.delete(id);
    }

    this.state.workers.forEach((w, idx) => {
      const busy = this._isWorkerBusy(w);
      const task = this._findWorkerTask(w);
      const workTrack = this._getWorkBuildingForWorker(w);
      let agent = this.agents.get(w.id);

      if (!agent) {
        agent = {
          id: w.id,
          index: idx,
          rawWorker: w,
          rawTask: task,
          name: w.name || w.id,
          roleClass: w.roleClass || 'flash_worker',
          skinId: w.skin || w.skinId || 'default',
          track: w.track || 'api',
          providerLabel: w.providerLabel || '',
          dailyTokenCap: Number(w.dailyTokenCap ?? 500000),
          usedTokensToday: Number(w.usedTokensToday ?? 0),
          level: Number(w.level ?? 1),
          stamina: Number(w.stamina ?? 100),
          maxStamina: Math.max(1, Number(w.maxStamina ?? 100)),
          completedCount: Number(w.completedCount ?? 0),
          autoMode: Boolean(w.autoMode),
          lastMessage: w.lastMessage || '',
          busy,
          workTrack,
          taskId: task ? task.id : null,
          taskTitle: task ? task.title : '',
          taskProgress: busy ? 25 + ((idx * 19) % 55) : 0,
          cliMessage: '',
          cliTimer: 0,
          celebrateTimer: 0,
          bubbleText: '',
          bubbleTimer: 0,
          bubbleStyle: 'normal',
          animSeed: (idx * 17 + 5) % 97,
          // Live smooth coordinates per active scene
          x: 240,
          y: 180,
          tx: 240,
          ty: 180,
          flipX: false,
          walking: false,
          loungeWanderTimer: 2.5 + (idx * 1.9) % 5,
          townWanderTimer: 2.0 + (idx * 1.5) % 4,
          seatSlot: idx,
        };
        this.agents.set(w.id, agent);
      } else {
        agent.index = idx;
        agent.rawWorker = w;
        agent.rawTask = task;
        agent.name = w.name || agent.name;
        agent.roleClass = w.roleClass || agent.roleClass;
        agent.skinId = w.skin || w.skinId || 'default';
        agent.track = w.track || agent.track;
        agent.providerLabel = w.providerLabel || agent.providerLabel;
        agent.dailyTokenCap = Number(w.dailyTokenCap ?? agent.dailyTokenCap);
        agent.usedTokensToday = Number(w.usedTokensToday ?? agent.usedTokensToday);
        agent.level = Number(w.level ?? agent.level);
        agent.stamina = Number(w.stamina ?? agent.stamina);
        agent.maxStamina = Math.max(1, Number(w.maxStamina ?? agent.maxStamina));
        agent.completedCount = Number(w.completedCount ?? agent.completedCount);
        agent.autoMode = Boolean(w.autoMode);
        agent.lastMessage = w.lastMessage || agent.lastMessage;
        agent.busy = busy;
        agent.workTrack = workTrack;
        agent.taskId = task ? task.id : null;
        agent.taskTitle = task ? task.title : '';
        if (busy && agent.taskProgress < 10) agent.taskProgress = 18;
        if (!busy && agent.cliTimer <= 0) agent.taskProgress = 0;
      }
    });

    this._syncSceneTargets(false);
  }

  triggerWorkerDispatch(workerId, task = null, project = null) {
    const agent = this.agents.get(workerId);
    if (!agent) return;
    const c = this._getCanvasI18n();

    const isGuild =
      (task && (task.track === 'guild_bounty' || task.track === 'quota')) ||
      agent.track === 'quota' ||
      agent.roleClass === 'pro_architect' ||
      agent.roleClass === 'guild_artisan';

    const locTask = task ? this._localizeTask(task) : null;
    const locProj = project ? this._localizeProject(project) : null;

    agent.busy = true;
    agent.workTrack = isGuild ? 'guild' : 'factory';
    agent.rawTask = task || agent.rawTask;
    agent.taskId = task?.id || agent.taskId;
    agent.taskTitle = locTask?.title || agent.taskTitle || (isGuild ? c.dispatchGuildFallback : c.dispatchApiFallback);
    agent.taskProgress = 12;
    agent.celebrateTimer = 0;

    this._syncSceneTargets(false);

    const shortTitle = truncateText(agent.taskTitle, this.locale === 'en' ? 18 : 14);
    const projName = locProj?.shortName || locProj?.name || '';
    const projHint = projName ? ` [${truncateText(projName, this.locale === 'en' ? 12 : 8)}]` : '';
    this._setBubble(agent, `🚀 ${shortTitle}${projHint}`, 4.5, 'dispatch');
    this._spawnDataBurst(agent.x, agent.y - 18, isGuild ? '#f59e0b' : '#22d3ee', 10);
  }

  triggerTaskComplete(workerId, rewards = {}) {
    const c = this._getCanvasI18n();
    const agent = this.agents.get(workerId);
    const originX = agent ? agent.x : 240;
    const originY = agent ? agent.y - 24 : 150;

    if (agent) {
      agent.celebrateTimer = 3.2;
      agent.cliTimer = 0;
      agent.taskProgress = 100;
      this._setBubble(agent, c.bubbleVerified, 3.2, 'success', 'verified');
    }

    const gold = Number(rewards.gold ?? rewards.goldReward ?? 0);
    const pts = Number(rewards.contributionPoints ?? rewards.points ?? 0);
    const usd = Number(
      rewards.bountyNetUsd ??
        rewards.usd ??
        rewards.cashUsd ??
        rewards.bountyUsd ??
        rewards.netBountyUsd ??
        0
    );

    let oy = 0;
    if (gold > 0) {
      this._spawnFloatingText(originX, originY - oy, `+${gold}G`, '#fde047');
      oy += 13;
    }
    if (pts > 0) {
      const ptsText = c.floatPointsTpl ? fmtTpl(c.floatPointsTpl, { pts }) : `+${pts} ${c.floatingPtsSuffix}`;
      this._spawnFloatingText(originX, originY - oy, ptsText, '#38bdf8', {
        kind: 'pts',
        val: pts,
      });
      oy += 13;
    }
    if (usd > 0) {
      this._spawnFloatingText(originX, originY - oy, `+$${usd.toFixed(2)}`, '#4ade80');
      oy += 13;
    }
    if (oy === 0) {
      this._spawnFloatingText(originX, originY, c.floatingVerified, '#4ade80', { kind: 'verified' });
    }

    this._spawnCoins(originX, originY + 4, 10);
  }

  triggerProjectLaunch(projectId) {
    const c = this._getCanvasI18n();
    const proj = this.state.projects.find((p) => p.id === projectId);
    const locProj = proj ? this._localizeProject(proj) : null;
    const title = locProj ? truncateText(locProj.shortName || locProj.name, this.locale === 'en' ? 20 : 16) : c.launchFallbackTitle;
    this.launchBannerProjectId = projectId || null;
    this.launchBannerText = c.launchBannerTpl
      ? fmtTpl(c.launchBannerTpl, { name: title })
      : `${c.launchBannerPrefix}${title}${c.launchBannerSuffix}`;
    this.launchBannerTimer = 6.0;
    this.ambientFlash = 0.72;

    for (const agent of this.agents.values()) {
      agent.celebrateTimer = 4.0;
      this._setBubble(agent, c.bubbleLaunched, 3.8, 'success', 'launched');
    }

    // Multi-layered pixel fireworks + gold coin rain!
    const palettes = [
      ['#22d3ee', '#67e8f9', '#ffffff'],
      ['#f472b6', '#fbcfe8', '#fde047'],
      ['#a855f7', '#e879f9', '#38bdf8'],
      ['#fbbf24', '#fef08a', '#fb7185'],
      ['#4ade80', '#22d3ee', '#ffffff'],
    ];
    for (let i = 0; i < 18; i++) {
      this.fireworkRockets.push({
        delay: i * 0.22 + Math.random() * 0.1,
        x: 42 + Math.random() * (WORLD_W - 84),
        y: WORLD_H - 12,
        vx: (Math.random() - 0.5) * 26,
        vy: -(165 + Math.random() * 65),
        targetY: 26 + Math.random() * 110,
        colors: palettes[i % palettes.length],
      });
    }
    for (let i = 0; i < 24; i++) {
      this.coinParticles.push({
        x: 36 + Math.random() * (WORLD_W - 72),
        y: -8 - Math.random() * 48,
        vx: (Math.random() - 0.5) * 22,
        vy: 12 + Math.random() * 24,
        life: 2.2 + Math.random() * 1.2,
        maxLife: 3.4,
        frame: i % 4,
      });
    }
  }

  triggerCliActivity(workerId, message = null) {
    const c = this._getCanvasI18n();
    const resolvedMsg = message || c.cliDefaultMsg;
    let agent = this.agents.get(workerId);
    if (!agent && this.agents.size > 0) {
      for (const a of this.agents.values()) {
        if (a.track === 'quota' || a.roleClass === 'pro_architect' || a.roleClass === 'guild_artisan') {
          agent = a;
          break;
        }
      }
      if (!agent) agent = this.agents.values().next().value;
    }
    if (!agent) return;

    agent.cliTimer = 9.0;
    agent.cliMessage = truncateText(resolvedMsg || '$ gemini-cli --heartbeat', 22);
    agent.workTrack = 'guild';
    agent.taskProgress = clamp((agent.taskProgress || 25) + 14, 15, 96);

    this._syncSceneTargets(false);
    this._setBubble(agent, `> ${truncateText(resolvedMsg, 18)}`, 4.8, 'cli', message ? null : 'cli_default');
    this._spawnDataBurst(agent.x, agent.y - 20, '#4ade80', 10);
  }

  destroy() {
    this.destroyed = true;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerleave', this._onPointerLeave);
    this.canvas.removeEventListener('click', this._onClick);
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    } else if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._onResize);
    }
  }

  // ==========================================================================
  // Internal State & Scene Assignment Helpers
  // ==========================================================================

  _isWorkerBusy(w) {
    if (!w) return false;
    return w.status === 'working' || w.status === 'busy' || Boolean(w.currentTaskId);
  }

  _findWorkerTask(w) {
    if (!w || !w.currentTaskId) return null;
    return this.state.tasks.find((t) => t.id === w.currentTaskId) || null;
  }

  _getWorkBuildingForWorker(w) {
    if (!w) return 'factory';
    const task = this._findWorkerTask(w);
    if (task) {
      if (task.track === 'guild_bounty' || task.track === 'quota') return 'guild';
      if (task.track === 'api_auto' || task.track === 'api') return 'factory';
    }
    if (w.track === 'quota' || w.roleClass === 'pro_architect' || w.roleClass === 'guild_artisan') {
      return 'guild';
    }
    return 'factory';
  }

  _hasDecor(...keywords) {
    if (!this.ownedDecor || this.ownedDecor.size === 0) return false;
    for (const id of this.ownedDecor) {
      const lower = id.toLowerCase();
      for (const kw of keywords) {
        if (lower === kw || lower.includes(kw)) return true;
      }
    }
    return false;
  }

  _getFeaturedProject() {
    const projects = this.state.projects || [];
    if (!projects.length) {
      return { id: 'proj-meta', name: '像素算力鎮 v1.0', shortName: '像素算力鎮 v1.0', status: 'building', progressPct: 60 };
    }
    const launched = projects.find((p) => p.status === 'launched' || (p.progressPct ?? 0) >= 100);
    if (launched) return launched;
    const building = projects
      .filter((p) => p.status === 'building')
      .sort((a, b) => (b.progressPct ?? 0) - (a.progressPct ?? 0));
    if (building.length) return building[0];
    return projects[0];
  }

  _getVotingProjects() {
    const voting = (this.state.projects || []).filter((p) => p.status === 'voting');
    if (voting.length >= 2) return voting.slice(0, 2);
    const others = (this.state.projects || []).filter((p) => p.status !== 'voting');
    return [...voting, ...others].slice(0, 2);
  }

  _getBillboardTicker() {
    const c = this._getCanvasI18n();
    const projects = this.state.projects || [];
    const sponsored = projects.filter((p) => p.sponsoredBillboard);
    const launched = projects.filter((p) => p.status === 'launched');
    if (sponsored.length > 0) {
      const msg = sponsored
        .map((p) => {
          const lp = this._localizeProject(p);
          const nm = lp.shortName || lp.name;
          return (
            lp.billboardText ||
            (c.tickerSponsoredTpl ? fmtTpl(c.tickerSponsoredTpl, { name: nm }) : `★ ${nm}${c.tickerSponsoredSuffix}`)
          );
        })
        .join('  ✦  ');
      return { text: `${msg}   ✦   `, isSponsored: true, isLaunched: false };
    }
    if (launched.length > 0) {
      const msg = launched
        .map((p) => {
          const lp = this._localizeProject(p);
          const nm = lp.shortName || lp.name;
          return c.tickerLaunchedTpl ? fmtTpl(c.tickerLaunchedTpl, { name: nm }) : `🚀 ${nm}${c.tickerLaunchedSuffix}`;
        })
        .join('  ★  ');
      return { text: `${msg}   ★   `, isSponsored: false, isLaunched: true };
    }
    const featured = this._getFeaturedProject();
    const lf = this._localizeProject(featured);
    const fName = lf.shortName || lf.name;
    const pct = featured.progressPct ?? 0;
    if (c.tickerDefaultMetaTpl) {
      return {
        text: `${fmtTpl(c.tickerDefaultMetaTpl, { name: fName, pct })}   ✦   `,
        isSponsored: false,
        isLaunched: false,
      };
    }
    const wrappedName = this.locale === 'en' ? fName : `《${fName}》`;
    return {
      text: `⚡ ${c.tickerBrand} · ${wrappedName} ${c.tickerProgressWord} ${pct}% · ${c.tickerSplitTail}   ✦   `,
      isSponsored: false,
      isLaunched: false,
    };
  }

  _getApiWorkers() {
    const all = Array.from(this.agents.values());
    const api = all.filter((a) => a.workTrack === 'factory' || a.track === 'api');
    return api.length ? api : all.slice(0, 2);
  }

  _getGuildWorkers() {
    const all = Array.from(this.agents.values());
    const guild = all.filter((a) => a.workTrack === 'guild' || a.track === 'quota');
    return guild.length ? guild : all.slice(0, 2);
  }

  _syncSceneTargets(snapImmediately = false) {
    const all = Array.from(this.agents.values());

    if (this.scene === 'factory') {
      const apiWorkers = this._getApiWorkers();
      apiWorkers.forEach((a, idx) => {
        const desk = FACTORY_DESKS[idx % FACTORY_DESKS.length];
        a.seatSlot = desk.id;
        a.tx = desk.x;
        a.ty = desk.y + 25;
        if (snapImmediately) {
          a.x = a.tx;
          a.y = a.ty;
          a.walking = false;
        }
      });
    } else if (this.scene === 'guild') {
      const guildWorkers = this._getGuildWorkers();
      guildWorkers.forEach((a, idx) => {
        const desk = GUILD_DESKS[idx % GUILD_DESKS.length];
        a.seatSlot = desk.id;
        a.tx = desk.x;
        a.ty = desk.y + 25;
        if (snapImmediately) {
          a.x = a.tx;
          a.y = a.ty;
          a.walking = false;
        }
      });
    } else if (this.scene === 'launchpad') {
      all.forEach((a, idx) => {
        if (idx < LAUNCHPAD_DESKS.length) {
          const desk = LAUNCHPAD_DESKS[idx];
          a.seatSlot = desk.id;
          a.tx = desk.x;
          a.ty = desk.y + 25;
        } else {
          // Spectators admiring the hologram core
          const offset = idx - LAUNCHPAD_DESKS.length;
          a.tx = offset % 2 === 0 ? 174 - Math.floor(offset / 2) * 26 : 306 + Math.floor(offset / 2) * 26;
          a.ty = 238 + (offset % 2) * 14;
        }
        if (snapImmediately) {
          a.x = a.tx;
          a.y = a.ty;
          a.walking = false;
        }
      });
    } else if (this.scene === 'lounge') {
      all.forEach((a, idx) => {
        const spot = LOUNGE_SPOTS[idx % LOUNGE_SPOTS.length];
        a.tx = spot.x;
        a.ty = spot.y;
        if (snapImmediately) {
          a.x = a.tx;
          a.y = a.ty;
          a.walking = false;
        }
      });
    } else if (this.scene === 'town') {
      all.forEach((a, idx) => {
        if (a.busy || a.cliTimer > 0) {
          const b = TOWN_BUILDINGS[a.workTrack] || TOWN_BUILDINGS.factory;
          a.tx = b.spotX + ((idx % 3) - 1) * 26;
          a.ty = b.spotY;
        } else {
          const b = TOWN_BUILDINGS.lounge;
          a.tx = b.spotX + ((idx % 3) - 1) * 28;
          a.ty = b.spotY;
        }
        if (snapImmediately) {
          a.x = a.tx;
          a.y = a.ty;
          a.walking = false;
        }
      });
    }
  }

  _setBubble(agent, text, duration = 3.6, style = 'normal', bubbleKey = null) {
    agent.bubbleText = text;
    agent.bubbleTimer = duration;
    agent.bubbleStyle = style;
    agent.bubbleKey = bubbleKey;
  }

  _spawnFloatingText(x, y, text, color, meta = null) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      kind: meta?.kind || null,
      val: meta?.val ?? null,
      vy: -20,
      life: 2.0,
      maxLife: 2.0,
    });
  }

  _spawnCoins(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const spd = 28 + Math.random() * 44;
      this.coinParticles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 18,
        life: 1.1 + Math.random() * 0.5,
        maxLife: 1.6,
        frame: i % 4,
      });
    }
  }

  _spawnDataBurst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 14 + Math.random() * 24;
      this.dataParticles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 12,
        color,
        life: 0.75 + Math.random() * 0.45,
        maxLife: 1.2,
      });
    }
  }

  // ==========================================================================
  // Resize & Pointer Hit-Testing
  // ==========================================================================

  _resize() {
    if (this.destroyed) return;
    const parent = this.canvas.parentElement;
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    this.dpr = dpr;

    const cssW = parent ? Math.max(320, parent.clientWidth) : Math.max(320, this.canvas.clientWidth || WORLD_W);
    const cssH = parent ? Math.max(200, parent.clientHeight) : Math.max(200, this.canvas.clientHeight || WORLD_H);

    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);

    const rawScale = Math.min(this.canvas.width / WORLD_W, this.canvas.height / WORLD_H);
    this.scale = rawScale >= 1.5 ? Math.floor(rawScale * 4) / 4 : Math.max(0.5, rawScale);
    const drawW = Math.round(WORLD_W * this.scale);
    const drawH = Math.round(WORLD_H * this.scale);
    this.offsetX = Math.floor((this.canvas.width - drawW) / 2);
    this.offsetY = Math.floor((this.canvas.height - drawH) / 2);
    this.viewRect = { x: this.offsetX, y: this.offsetY, w: drawW, h: drawH, scale: this.scale };
  }

  _screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: -999, y: -999 };
    const sx = (clientX - rect.left) * (this.canvas.width / rect.width);
    const sy = (clientY - rect.top) * (this.canvas.height / rect.height);
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }

  _hitTestWorker(wx, wy) {
    const sorted = [...this._frameWorkers].sort((a, b) => b.y - a.y);
    for (const fw of sorted) {
      const halfW = 16 * fw.scale;
      const h = 32 * fw.scale;
      if (Math.abs(wx - fw.x) <= halfW && wy >= fw.y - h && wy <= fw.y + 6) {
        return fw.agent;
      }
    }
    // Also check monitor clicks in desk scenes
    for (const fm of this._frameMonitors) {
      if (fm.worker && pointInRect(wx, wy, fm.screenRect)) {
        return fm.worker;
      }
    }
    return null;
  }

  _handlePointerMove(e) {
    const pt = this._screenToWorld(e.clientX, e.clientY);

    const hitW = this._hitTestWorker(pt.x, pt.y);
    this.hoveredWorkerId = hitW ? hitW.id : null;

    // Guild Bounty Board scroll hover
    this.hoveredBountyTaskId = null;
    if (this.scene === 'guild') {
      for (const br of this._frameBountyRects) {
        if (pointInRect(pt.x, pt.y, br)) {
          this.hoveredBountyTaskId = br.task.id;
          break;
        }
      }
    }

    // Town overview buildings hover
    this.hoveredBuildingId = null;
    if (this.scene === 'town') {
      for (const b of Object.values(TOWN_BUILDINGS)) {
        if (pointInRect(pt.x, pt.y, b)) {
          this.hoveredBuildingId = b.id;
          break;
        }
      }
    }

    // Scene interactive props hover
    this.hoveredPropId = null;
    if (this.scene === 'factory') {
      if (Math.hypot(pt.x - 240, pt.y - 186) < 30) this.hoveredPropId = 'api_core';
      else if (pt.x >= 364 && pt.x <= 476 && pt.y >= 4 && pt.y <= 56) this.hoveredPropId = 'server_rack';
    } else if (this.scene === 'launchpad') {
      if (Math.hypot(pt.x - 240, pt.y - 178) < 42) this.hoveredPropId = 'hologram';
      for (const vp of this._frameVotePillars) {
        if (pointInRect(pt.x, pt.y, vp)) this.hoveredPropId = `vote:${vp.project.id}`;
      }
    } else if (this.scene === 'lounge') {
      if (pt.x >= 194 && pt.x <= 278 && pt.y >= 8 && pt.y <= 44) this.hoveredPropId = 'trophy_case';
      else if (pt.x >= 20 && pt.x <= 90 && pt.y >= 80 && pt.y <= 122) this.hoveredPropId = 'coffee_bar';
    } else if (this.scene === 'vault') {
      if (pt.x >= 200 && pt.x <= 280 && pt.y >= 4 && pt.y <= 76) this.hoveredPropId = 'vault_door';
    }

    const interactive = Boolean(
      this.hoveredWorkerId || this.hoveredBountyTaskId || this.hoveredBuildingId || this.hoveredPropId
    );
    this.canvas.style.cursor = interactive ? 'pointer' : 'default';
  }

  _handlePointerLeave() {
    this.hoveredWorkerId = null;
    this.hoveredBuildingId = null;
    this.hoveredBountyTaskId = null;
    this.hoveredPropId = null;
    this.canvas.style.cursor = 'default';
  }

  _handleClick(e) {
    const pt = this._screenToWorld(e.clientX, e.clientY);

    // 1. Guild Bounty Board Scroll Click
    if (this.scene === 'guild') {
      for (const br of this._frameBountyRects) {
        if (pointInRect(pt.x, pt.y, br)) {
          this._spawnDataBurst(br.x + br.w / 2, br.y + br.h / 2, '#fde047', 10);
          this.callbacks.onSelectTask?.(br.task.id);
          this.callbacks.onSelectBuilding?.('guild');
          return;
        }
      }
    }

    // 2. Worker (or occupied monitor) Click
    const hitW = this._hitTestWorker(pt.x, pt.y);
    if (hitW) {
      this.selectedWorkerId = hitW.id;
      this._spawnDataBurst(hitW.x, hitW.y - 18, '#fde047', 8);
      this.callbacks.onSelectWorker?.(hitW.id);
      return;
    }

    // 3. Town Overview Building Click -> Enter that building's HD indoor scene!
    if (this.scene === 'town') {
      for (const b of Object.values(TOWN_BUILDINGS)) {
        if (pointInRect(pt.x, pt.y, b)) {
          this.selectedBuildingId = b.id;
          this.setScene(b.id);
          this.callbacks.onSelectBuilding?.(b.id);
          return;
        }
      }
    }

    // 4. Special Interactive Props Click
    if (this.scene === 'factory' && Math.hypot(pt.x - 240, pt.y - 186) < 30) {
      this._spawnDataBurst(240, 178, '#22d3ee', 14);
      this.callbacks.onSelectBuilding?.('factory');
      return;
    }
    if (this.scene === 'launchpad') {
      if (Math.hypot(pt.x - 240, pt.y - 178) < 42) {
        this._spawnDataBurst(240, 174, '#a855f7', 16);
        this.callbacks.onSelectBuilding?.('launchpad');
        return;
      }
      for (const vp of this._frameVotePillars) {
        if (pointInRect(pt.x, pt.y, vp)) {
          this._spawnDataBurst(vp.x + vp.w / 2, vp.y + 18, '#f472b6', 12);
          this.callbacks.onSelectBuilding?.('launchpad');
          return;
        }
      }
    }
  }

  // ==========================================================================
  // Main Loop & Physics Update
  // ==========================================================================

  _startLoop() {
    this.lastFrameTs = performance.now();
    const tick = (now) => {
      if (this.destroyed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTs) / 1000));
      this.lastFrameTs = now;
      this._update(dt);
      this._render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  _update(dt) {
    this.time += dt;
    this.marqueeOffset += dt * 32;

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt * 4.5);
    }
    if (this.launchBannerTimer > 0) this.launchBannerTimer = Math.max(0, this.launchBannerTimer - dt);
    if (this.ambientFlash > 0) this.ambientFlash = Math.max(0, this.ambientFlash - dt * 1.1);

    // Occasional night shooting star
    if (this.dayNight === 'night') {
      this.nextMeteorIn -= dt;
      if (this.nextMeteorIn <= 0) {
        this.nextMeteorIn = 4.2 + Math.random() * 5.5;
        this.meteors.push({
          x: 20 + Math.random() * 280,
          y: 4 + Math.random() * 14,
          vx: 110 + Math.random() * 50,
          vy: 26 + Math.random() * 16,
          life: 0.7,
          maxLife: 0.7,
          color: Math.random() > 0.5 ? '#67e8f9' : '#fef08a',
        });
      }
    }
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt;
      if (m.life <= 0) this.meteors.splice(i, 1);
    }

    // Update worker agents
    for (const a of this.agents.values()) {
      if (a.celebrateTimer > 0) a.celebrateTimer = Math.max(0, a.celebrateTimer - dt);
      if (a.cliTimer > 0) a.cliTimer = Math.max(0, a.cliTimer - dt);
      if (a.bubbleTimer > 0) a.bubbleTimer = Math.max(0, a.bubbleTimer - dt);

      // Gentle animated progress creep while busy
      if (a.busy || a.cliTimer > 0) {
        a.taskProgress = clamp(a.taskProgress + dt * 2.2, 8, 97);
      }

      // Lounge idle strolling
      if (this.scene === 'lounge' && a.celebrateTimer <= 0) {
        a.loungeWanderTimer -= dt;
        if (a.loungeWanderTimer <= 0) {
          a.loungeWanderTimer = 4.5 + Math.random() * 4.5;
          const nextSpot = LOUNGE_SPOTS[Math.floor(Math.random() * LOUNGE_SPOTS.length)];
          a.tx = nextSpot.x + (Math.random() * 18 - 9);
          a.ty = nextSpot.y + (Math.random() * 10 - 5);
        }
      }

      // Town overview gentle plaza wandering for idle workers
      if (this.scene === 'town' && !a.busy && a.cliTimer <= 0) {
        a.townWanderTimer -= dt;
        if (a.townWanderTimer <= 0) {
          a.townWanderTimer = 4.0 + Math.random() * 4.0;
          if (Math.random() < 0.45) {
            a.tx = 195 + Math.random() * 90;
            a.ty = 135 + Math.random() * 52;
          } else {
            const b = TOWN_BUILDINGS.lounge;
            a.tx = b.spotX + (Math.random() * 54 - 27);
            a.ty = b.spotY + (Math.random() * 12 - 6);
          }
        }
      }

      // Smooth steering
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1.0) {
        const step = Math.min(dist, 56 * dt);
        a.x += (dx / dist) * step;
        a.y += (dy / dist) * step;
        a.walking = true;
        if (Math.abs(dx) > 0.6) a.flipX = dx < 0;
      } else {
        a.x = a.tx;
        a.y = a.ty;
        a.walking = false;
      }

      // Ambient typing sparks when working at desk
      if (!a.walking && (a.busy || a.cliTimer > 0) && Math.random() < dt * 2.2) {
        this.dataParticles.push({
          x: a.x + (Math.random() * 24 - 12),
          y: a.y - 26,
          vx: (Math.random() - 0.5) * 10,
          vy: -(12 + Math.random() * 10),
          color: a.cliTimer > 0 ? '#4ade80' : a.workTrack === 'guild' ? '#f59e0b' : '#22d3ee',
          life: 0.65,
          maxLife: 0.65,
        });
      }
    }

    // Coffee steam particles in Guild & Lounge
    if ((this.scene === 'lounge' || this.scene === 'guild') && Math.random() < dt * 3.5) {
      const sx = this.scene === 'lounge' ? 46 + Math.random() * 26 : 230 + Math.random() * 20;
      const sy = this.scene === 'lounge' ? 88 : 164;
      this.steamParticles.push({
        x: sx,
        y: sy,
        vx: (Math.random() - 0.5) * 5,
        vy: -(10 + Math.random() * 6),
        life: 1.1,
        maxLife: 1.1,
      });
    }

    // Update particles
    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      const p = this.steamParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.steamParticles.splice(i, 1);
    }

    for (let i = this.dataParticles.length - 1; i >= 0; i--) {
      const p = this.dataParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.dataParticles.splice(i, 1);
    }

    for (let i = this.coinParticles.length - 1; i >= 0; i--) {
      const c = this.coinParticles[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 90 * dt;
      c.life -= dt;
      if (c.life <= 0) this.coinParticles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Fireworks rockets & bursts
    for (let i = this.fireworkRockets.length - 1; i >= 0; i--) {
      const r = this.fireworkRockets[i];
      if (r.delay > 0) {
        r.delay -= dt;
        continue;
      }
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      if (r.y <= r.targetY) {
        this._explodeFirework(r.x, r.y, r.colors);
        this.fireworkRockets.splice(i, 1);
      }
    }

    for (let i = this.fireworkSparks.length - 1; i >= 0; i--) {
      const s = this.fireworkSparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.96;
      s.vy = s.vy * 0.96 + 44 * dt;
      s.life -= dt;
      if (s.life <= 0) this.fireworkSparks.splice(i, 1);
    }
  }

  _explodeFirework(x, y, colors) {
    this.ambientFlash = Math.min(0.45, this.ambientFlash + 0.14);
    const count = 28;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.22;
      const spd = 28 + Math.random() * 68;
      this.fireworkSparks.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: colors[i % colors.length],
        size: i % 3 === 0 ? 2 : 1,
        life: 0.75 + Math.random() * 0.55,
        maxLife: 1.3,
      });
    }
  }

  // ==========================================================================
  // Master Dual-Layer Render Pipeline
  // ==========================================================================

  _render() {
    const b = this.bctx;
    const isNight = this.dayNight === 'night';
    b.imageSmoothingEnabled = false;

    this._frameMonitors = [];
    this._frameWorkers = [];
    this._frameBountyRects = [];
    this._frameVotePillars = [];

    // LAYER 1: 480x300 Crisp Pixel Buffer Scene Render
    switch (this.scene) {
      case 'factory':
        this._renderFactoryBuffer(b, isNight);
        break;
      case 'guild':
        this._renderGuildBuffer(b, isNight);
        break;
      case 'launchpad':
        this._renderLaunchpadBuffer(b, isNight);
        break;
      case 'lounge':
        this._renderLoungeBuffer(b, isNight);
        break;
      case 'vault':
        this._renderVaultBuffer(b, isNight);
        break;
      case 'town':
      default:
        this._renderTownBuffer(b, isNight);
        break;
    }

    // Shared pixel particles, coins, fireworks & outer retro bezel on buffer
    this._drawBufferParticlesAndFX(b);
    this._drawOuterPixelFrame(b, isNight);

    // Blit crisp 480x300 pixel buffer to full display canvas
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = isNight ? '#070b17' : '#dbeafe';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.drawImage(
      this.buffer,
      0,
      0,
      WORLD_W,
      WORLD_H,
      this.offsetX,
      this.offsetY,
      this.viewRect.w,
      this.viewRect.h
    );

    // LAYER 2: HiDPI Razor-Sharp Text, Live Computer Monitors, Badges & HUDs
    this._renderCrispMonitorScreens(ctx, isNight);
    this._renderSceneCrispHUD(ctx, isNight);
    this._renderCrispWorkerNameplates(ctx, isNight);
    this._renderCrispFloatingTextsAndBanner(ctx);
    this._renderHoverInspectorCard(ctx, isNight);

    // Smooth scene transition scanline veil
    if (this.transitionProgress < 1) {
      const alpha = (1 - this.transitionProgress) * 0.55;
      ctx.save();
      ctx.fillStyle = isNight
        ? `rgba(11, 18, 36, ${alpha.toFixed(3)})`
        : `rgba(241, 245, 249, ${alpha.toFixed(3)})`;
      ctx.fillRect(this.offsetX, this.offsetY, this.viewRect.w, this.viewRect.h);
      const scanY = this.offsetY + this.viewRect.h * this.transitionProgress;
      ctx.fillStyle = `rgba(34, 211, 238, ${((1 - this.transitionProgress) * 0.7).toFixed(3)})`;
      ctx.fillRect(this.offsetX, scanY - 2, this.viewRect.w, 4);
      ctx.restore();
    }
  }

  // ==========================================================================
  // Shared Architectural & Sky Helpers (Layer 1 Buffer)
  // ==========================================================================

  _drawOuterPixelFrame(g, isNight) {
    g.fillStyle = isNight ? '#070b17' : '#334155';
    g.fillRect(0, 0, WORLD_W, 2);
    g.fillRect(0, 0, 2, WORLD_H);
    g.fillRect(WORLD_W - 2, 0, 2, WORLD_H);
    g.fillRect(0, WORLD_H - 2, WORLD_W, 2);
  }

  _drawSkyWindow(g, x, y, w, h, isNight, frameColor = '#1e293b', sillColor = '#64748b') {
    g.fillStyle = '#090d1a';
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle = isNight ? '#0a1228' : '#58b4e8';
    g.fillRect(x, y, w, h);

    if (isNight) {
      // Subtle night gradient band
      g.fillStyle = '#132044';
      g.fillRect(x, y + Math.floor(h * 0.55), w, Math.ceil(h * 0.45));
      // Crescent moon
      g.fillStyle = '#fef08a';
      g.fillRect(x + w - 16, y + 4, 7, 7);
      g.fillStyle = '#0a1228';
      g.fillRect(x + w - 13, y + 4, 4, 6);
      // Twinkling stars
      for (let i = 0; i < 12; i++) {
        const sx = x + ((i * 23 + 7) % (w - 6)) + 3;
        const sy = y + ((i * 11 + 4) % Math.max(8, h - 14)) + 2;
        g.fillStyle = Math.sin(this.time * 3.1 + i * 1.7) > 0.1 ? '#ffffff' : '#64748b';
        g.fillRect(sx, sy, 1, 1);
      }
      // Shooting star inside window
      for (const m of this.meteors) {
        if (m.x >= x && m.x <= x + w && m.y <= h) {
          g.fillStyle = '#ffffff';
          g.fillRect(Math.round(m.x), y + Math.round(m.y * 0.5), 2, 1);
        }
      }
      // Distant lit cyber skyline
      g.fillStyle = '#1e293b';
      for (let bx = 0; bx < w; bx += 14) {
        const bh = 8 + ((bx * 7) % 10);
        g.fillRect(x + bx, y + h - bh, 11, bh);
        g.fillStyle = bx % 28 === 0 ? '#22d3ee' : '#fde047';
        g.fillRect(x + bx + 3, y + h - bh + 3, 2, 2);
        g.fillStyle = '#1e293b';
      }
    } else {
      // Bright daytime sky + drifting clouds + sun
      g.fillStyle = '#bae6fd';
      g.fillRect(x, y + Math.floor(h * 0.6), w, Math.ceil(h * 0.4));
      g.fillStyle = '#fef08a';
      g.fillRect(x + w - 15, y + 4, 7, 7);
      const drift = Math.floor(this.time * 5) % (w + 16);
      g.fillStyle = '#ffffff';
      g.fillRect(x + ((drift) % Math.max(12, w - 14)), y + 6, 14, 4);
      g.fillRect(x + ((drift + Math.floor(w / 2)) % Math.max(12, w - 16)), y + 13, 16, 4);
      // Distant sunlit blue hills/skyline
      g.fillStyle = '#3876a8';
      for (let bx = 0; bx < w; bx += 16) {
        const bh = 6 + ((bx * 5) % 8);
        g.fillRect(x + bx, y + h - bh, 14, bh);
      }
    }

    // Mullions & window sill
    g.fillStyle = frameColor;
    g.fillRect(x + Math.floor(w / 2) - 1, y, 2, h);
    g.fillRect(x, y + Math.floor(h / 2), w, 2);
    g.fillStyle = sillColor;
    g.fillRect(x - 3, y + h, w + 6, 3);
  }

  _drawWorkerIntoScene(g, agent, x, y, animState, scale = 1, opts = {}) {
    const isSelected = this.selectedWorkerId === agent.id;
    const isHovered = this.hoveredWorkerId === agent.id;
    const meta = WORKER_ROLE_META[agent.roleClass] || WORKER_ROLE_META.flash_worker;

    if (isSelected || isHovered) {
      g.fillStyle = isSelected ? '#fde047' : meta.accent;
      g.fillRect(Math.round(x - 16 * scale), Math.round(y - 3 * scale), Math.round(32 * scale), Math.round(6 * scale));
      g.fillStyle = '#090d1a';
      g.fillRect(Math.round(x - 14 * scale), Math.round(y - 2 * scale), Math.round(28 * scale), Math.round(4 * scale));
    }

    const fps =
      animState === 'work' ? 7 : animState === 'walk' ? 7 : animState === 'celebrate' ? 6 : 2.2;
    const frame = Math.floor(this.time * fps + (agent.animSeed || 0));

    drawHDWorker(g, Math.round(x), Math.round(y), agent, animState, frame, scale, {
      flipX: agent.flipX,
      shadow: true,
      ...opts,
    });

    // Crisp status LED dot near upper-right of head
    if (!opts.hideStatusDot) {
      const dotColor =
        agent.celebrateTimer > 0
          ? '#fde047'
          : agent.cliTimer > 0
            ? '#4ade80'
            : agent.busy
              ? meta.accent
              : '#94a3b8';
      const dx = Math.round(x + 12 * scale);
      const dy = Math.round(y - 29 * scale);
      g.fillStyle = '#090d1a';
      g.fillRect(dx, dy, 5, 5);
      g.fillStyle = dotColor;
      g.fillRect(dx + 1, dy + 1, 3, 3);
    }

    this._frameWorkers.push({
      agent,
      x: Math.round(x),
      y: Math.round(y),
      scale,
      hideBadge: Boolean(opts.hideBadge),
    });
  }

  // ==========================================================================
  // SCENE 1: 'factory' — 自動工坊室內 (API 流水線超算中心)
  // ==========================================================================

  _renderFactoryBuffer(g, isNight) {
    // 1. Cyber steel wall
    g.fillStyle = isNight ? '#111a2e' : '#cbd5e1';
    g.fillRect(0, 0, WORLD_W, 62);
    g.fillStyle = isNight ? '#182640' : '#e2e8f0';
    for (let x = 4; x < WORLD_W; x += 36) {
      g.fillRect(x, 4, 32, 48);
      g.fillStyle = isNight ? '#0c1324' : '#94a3b8';
      g.fillRect(x + 2, 6, 2, 2);
      g.fillRect(x + 28, 6, 2, 2);
      g.fillStyle = isNight ? '#182640' : '#e2e8f0';
    }
    // Glowing cyan architectural molding strip
    g.fillStyle = isNight ? '#0e7490' : '#0284c7';
    g.fillRect(0, 56, WORLD_W, 3);
    g.fillStyle = '#22d3ee';
    g.fillRect(0, 59, WORLD_W, 2);
    g.fillStyle = isNight ? '#091020' : '#64748b';
    g.fillRect(0, 61, WORLD_W, 2);

    // 2. Cyber Deep-Blue Steel Plate Floor (Day: Brushed Lab Ceramic-Steel)
    g.fillStyle = isNight ? '#0e1729' : '#dce6f2';
    g.fillRect(0, 63, WORLD_W, WORLD_H - 63);
    for (let y = 63; y < WORLD_H; y += 16) {
      for (let x = 0; x < WORLD_W; x += 24) {
        const alt = ((x / 24 + Math.floor((y - 63) / 16)) % 2) === 0;
        g.fillStyle = isNight
          ? alt
            ? '#132038'
            : '#101a2e'
          : alt
            ? '#e2ecf7'
            : '#d2dfee';
        g.fillRect(x, y, 23, 15);
        // Subtle bevel rivet
        g.fillStyle = isNight ? 'rgba(34,211,238,0.06)' : 'rgba(255,255,255,0.45)';
        g.fillRect(x + 1, y + 1, 21, 1);
      }
    }

    // 3. Glowing Cyan Fiber-Optic Floor Channels connecting Racks & Energy Core to all 6 Desks
    const drawFiber = (x, y, w, h) => {
      g.fillStyle = isNight ? '#082f49' : '#bae6fd';
      g.fillRect(x, y, w, h);
      g.fillStyle = isNight ? '#0ea5e9' : '#0284c7';
      if (w > h) g.fillRect(x, y + 1, w, 1);
      else g.fillRect(x + 1, y, 1, h);
    };
    drawFiber(66, 74, 348, 3);
    drawFiber(239, 74, 3, 160);
    drawFiber(76, 186, 328, 3);
    // Animated light packets traveling along fiber channels
    const p1 = 66 + (Math.floor(this.time * 72) % 340);
    const p2 = 404 - (Math.floor(this.time * 60) % 320);
    g.fillStyle = '#67e8f9';
    g.fillRect(p1, 74, 10, 3);
    g.fillRect(p2, 186, 10, 3);
    g.fillStyle = '#ffffff';
    g.fillRect(p1 + 3, 75, 4, 1);
    g.fillRect(p2 + 3, 187, 4, 1);

    // 4. Top Wall: Starry/Sunny Panoramic Window + API Throughput Dashboard + Marquee + Dual Server Racks
    this._drawSkyWindow(g, 14, 8, 84, 42, isNight, '#334155', '#475569');

    // Large Wall API Throughput Dashboard (x=110..226, y=8..50)
    g.fillStyle = '#090d1a';
    g.fillRect(110, 8, 116, 42);
    g.fillStyle = '#22d3ee';
    g.fillRect(110, 8, 116, 1);
    g.fillRect(110, 49, 116, 1);
    g.fillRect(110, 8, 1, 42);
    g.fillRect(225, 8, 1, 42);
    g.fillStyle = '#0f172a';
    g.fillRect(112, 10, 112, 38);
    // Animated throughput sparkline bars inside bottom half of dashboard
    for (let i = 0; i < 16; i++) {
      const h = 4 + Math.floor((Math.sin(this.time * 3.8 + i * 0.7) + 1) * 6);
      g.fillStyle = i % 4 === 0 ? '#4ade80' : '#22d3ee';
      g.fillRect(116 + i * 6, 46 - h, 4, h);
    }

    // Center Marquee Box (x=236..352, y=10..46)
    g.fillStyle = '#090d1a';
    g.fillRect(236, 10, 116, 36);
    g.fillStyle = '#1e293b';
    g.fillRect(238, 12, 112, 32);
    g.fillStyle = '#22d3ee';
    g.fillRect(236, 10, 116, 2);
    g.fillRect(236, 44, 116, 2);

    // Dual Large Server Racks (upgrade to Overclocked Neon Cooling Towers with decor-neon-rack!)
    const isOverclocked = this._hasDecor('decor-neon-rack', 'neon-rack', 'server');
    const rackFrame = Math.floor(this.time * 4);
    drawServerRack(g, 364, 6, isOverclocked, rackFrame);
    drawServerRack(g, 420, 6, isOverclocked, rackFrame + 2);

    // 5. Central Glowing API Energy Core (x=240, y=186)
    this._drawApiEnergyCore(g, 240, 186, isNight);

    // 6. Depth-sorted Desks, Potted Plants & 32x32 HD Workers
    const apiWorkers = this._getApiWorkers();
    const deskWorkerMap = new Map();
    apiWorkers.forEach((w, idx) => {
      deskWorkerMap.set(idx % FACTORY_DESKS.length, w);
    });

    const drawList = [
      { y: 76, draw: () => drawPottedPlant(g, 18, 76, 'cyber_fern', Math.floor(this.time * 2)) },
      { y: 76, draw: () => drawPottedPlant(g, 462, 76, 'cyber_fern', Math.floor(this.time * 2) + 1) },
      { y: 288, draw: () => drawPottedPlant(g, 20, 288, 'monstera', Math.floor(this.time * 2)) },
      { y: 288, draw: () => drawPottedPlant(g, 460, 288, 'monstera', Math.floor(this.time * 2)) },
    ];

    const deskFrame = Math.floor(this.time * 4);
    for (const desk of FACTORY_DESKS) {
      const worker = deskWorkerMap.get(desk.id) || null;
      const active = Boolean(worker && (worker.busy || worker.autoMode || this.state.player?.autoPilotEnabled));
      drawList.push({
        y: desk.y,
        draw: () => {
          const info = drawMonitorDesk(g, desk.x, desk.y, 'factory', active, deskFrame, {
            selected: worker && this.selectedWorkerId === worker.id,
            hovered: worker && this.hoveredWorkerId === worker.id,
            accentColor: worker ? getWorkerModelStyle(worker).border : '#22d3ee',
          });
          this._frameMonitors.push({
            worker,
            desk,
            screenRect: info.screenRect,
            isActive: active,
            sceneStyle: 'factory',
          });
        },
      });
    }

    for (const w of apiWorkers) {
      const anim = w.celebrateTimer > 0 ? 'celebrate' : w.walking ? 'walk' : w.busy ? 'work' : 'idle';
      drawList.push({
        y: w.y,
        draw: () => this._drawWorkerIntoScene(g, w, w.x, w.y, anim, 1),
      });
    }

    drawList.sort((a, b) => a.y - b.y);
    for (const item of drawList) item.draw();

    // 7. Dynamic Night Cyber Glows (or crisp day sunbeams)
    if (isNight) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      // API Energy Core cyan aura
      const coreGrad = g.createRadialGradient(240, 178, 6, 240, 178, 56);
      coreGrad.addColorStop(0, 'rgba(34, 211, 238, 0.34)');
      coreGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
      g.fillStyle = coreGrad;
      g.fillRect(184, 122, 112, 112);

      // Overclocked server rack neon glow
      if (isOverclocked) {
        const rackGrad = g.createRadialGradient(418, 34, 8, 418, 34, 72);
        rackGrad.addColorStop(0, 'rgba(244, 114, 182, 0.28)');
        rackGrad.addColorStop(0.6, 'rgba(34, 211, 238, 0.14)');
        rackGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
        g.fillStyle = rackGrad;
        g.fillRect(344, 0, 136, 108);
      }

      // Active monitor floor/face glow
      for (const fm of this._frameMonitors) {
        if (!fm.isActive) continue;
        g.fillStyle = 'rgba(34, 211, 238, 0.11)';
        g.fillRect(fm.screenRect.x - 2, fm.screenRect.y - 2, fm.screenRect.w + 4, fm.screenRect.h + 4);
      }
      g.restore();
    } else {
      // Soft diagonal sunbeam from left window
      g.save();
      g.fillStyle = 'rgba(254, 249, 195, 0.14)';
      g.beginPath();
      g.moveTo(16, 52);
      g.lineTo(98, 52);
      g.lineTo(138, 126);
      g.lineTo(44, 126);
      g.closePath();
      g.fill();
      g.restore();
    }
  }

  _drawApiEnergyCore(g, cx, cy, isNight) {
    const hover = this.hoveredPropId === 'api_core';
    const autoOn = Boolean(this.state.player?.autoPilotEnabled);
    // Hexagonal cyber pedestal
    g.fillStyle = 'rgba(0,0,0,0.38)';
    g.fillRect(cx - 26, cy + 4, 52, 14);
    g.fillStyle = hover ? '#fde047' : '#0f172a';
    g.fillRect(cx - 24, cy - 2, 48, 16);
    g.fillStyle = isNight ? '#1e293b' : '#475569';
    g.fillRect(cx - 22, cy, 44, 12);
    g.fillStyle = autoOn ? '#4ade80' : '#22d3ee';
    g.fillRect(cx - 18, cy + 2, 36, 3);

    // Glass containment cylinder
    g.fillStyle = 'rgba(14, 116, 144, 0.35)';
    g.fillRect(cx - 14, cy - 38, 28, 38);
    g.fillStyle = '#38bdf8';
    g.fillRect(cx - 14, cy - 38, 2, 38);
    g.fillRect(cx + 12, cy - 38, 2, 38);
    g.fillStyle = '#0f172a';
    g.fillRect(cx - 16, cy - 42, 32, 5);
    g.fillStyle = autoOn ? '#4ade80' : '#22d3ee';
    g.fillRect(cx - 12, cy - 40, 24, 2);

    // Pulsing plasma energy column inside based on remaining API token quota
    const apiWorkers = this._getApiWorkers();
    const totalCap = Math.max(1, apiWorkers.reduce((s, w) => s + (w.dailyTokenCap || 500000), 0));
    const totalUsed = apiWorkers.reduce((s, w) => s + (w.usedTokensToday || 0), 0);
    const remainRatio = clamp(1 - totalUsed / totalCap, 0.12, 1);
    const fillH = Math.round(32 * remainRatio);
    const bob = Math.round(Math.sin(this.time * 4) * 2);

    g.fillStyle = autoOn ? '#22c55e' : '#06b6d4';
    g.fillRect(cx - 9, cy - 2 - fillH, 18, fillH);
    g.fillStyle = autoOn ? '#86efac' : '#a5f3fc';
    g.fillRect(cx - 5, cy - 2 - fillH, 6, fillH);

    // Floating lightning diamond core
    const ky = cy - 24 + bob;
    g.fillStyle = '#ffffff';
    g.fillRect(cx - 3, ky, 6, 2);
    g.fillRect(cx - 5, ky + 2, 10, 4);
    g.fillRect(cx - 3, ky + 6, 6, 2);
    g.fillRect(cx - 1, ky + 8, 2, 2);
  }

  // ==========================================================================
  // SCENE 2: 'guild' — 懸賞工會大廳 (月/週額度匠人會館)
  // ==========================================================================

  _renderGuildBuffer(g, isNight) {
    // 1. Medieval-Cyber Stone & Cedar Wall
    g.fillStyle = isNight ? '#241a15' : '#dfd2be';
    g.fillRect(0, 0, WORLD_W, 64);
    // Brick pattern
    g.fillStyle = isNight ? '#2d211a' : '#d2c2aa';
    for (let y = 4; y < 44; y += 8) {
      const sh = ((y / 8) % 2) * 10;
      for (let x = sh; x < WORLD_W; x += 20) {
        g.fillRect(x, y, 18, 6);
      }
    }
    // Warm cedar wainscoting
    g.fillStyle = isNight ? '#4a2e1b' : '#9a6b43';
    g.fillRect(0, 46, WORLD_W, 16);
    g.fillStyle = isNight ? '#6e472a' : '#b88557';
    g.fillRect(0, 45, WORLD_W, 2);
    g.fillStyle = '#1c120b';
    g.fillRect(0, 62, WORLD_W, 2);

    // 2. Warm Staggered Hardwood Planks Floor
    g.fillStyle = isNight ? '#3d281a' : '#c99f72';
    g.fillRect(0, 64, WORLD_W, WORLD_H - 64);
    for (let y = 64; y < WORLD_H; y += 10) {
      const alt = ((y - 64) / 10) % 2 === 0;
      g.fillStyle = isNight
        ? alt
          ? '#462f1f'
          : '#3b2618'
        : alt
          ? '#d2aa7d'
          : '#c4996a';
      g.fillRect(0, y, WORLD_W, 9);
      g.fillStyle = isNight ? '#2b1b11' : '#a87d52';
      g.fillRect(0, y + 9, WORLD_W, 1);
      const off = alt ? 0 : 24;
      for (let x = off; x < WORLD_W; x += 48) {
        g.fillRect(x, y, 1, 9);
        g.fillStyle = isNight ? '#563a26' : '#deb88c';
        g.fillRect(x + 8, y + 3, 12, 1);
        g.fillStyle = isNight ? '#2b1b11' : '#a87d52';
      }
    }

    // Woven Crimson & Gold Guild Runner Carpet down center
    g.fillStyle = '#7f1d1d';
    g.fillRect(198, 70, 84, 218);
    g.fillStyle = '#b91c1c';
    g.fillRect(202, 74, 76, 210);
    g.fillStyle = '#f59e0b';
    g.fillRect(201, 73, 78, 2);
    g.fillRect(201, 283, 78, 2);
    g.fillRect(201, 73, 2, 212);
    g.fillRect(277, 73, 2, 212);

    // 3. Top Wall Elements
    // Wood-framed starry/sunny window
    this._drawSkyWindow(g, 14, 8, 76, 38, isNight, '#78350f', '#b45309');

    // Warm Wall Sconces (at x=116 and x=364)
    for (const sx of [116, 364]) {
      g.fillStyle = '#78350f';
      g.fillRect(sx - 2, 26, 4, 8);
      g.fillStyle = '#f59e0b';
      g.fillRect(sx - 4, 20, 8, 6);
      g.fillStyle = Math.sin(this.time * 8 + sx) > 0 ? '#fef08a' : '#fde047';
      g.fillRect(sx - 2, 18, 4, 5);
    }

    // Giant Wooden Bounty Bulletin Board (Interactive!)
    const openGuildTasks = (this.state.tasks || []).filter(
      (t) => (t.track === 'guild_bounty' || t.track === 'quota') && t.status !== 'completed' && t.status !== 'accepted'
    );
    const boardInfo = drawBountyBoard(g, 144, 8, Math.max(1, openGuildTasks.length), Math.floor(this.time * 3));
    // Map scroll rects to actual guild bounty tasks
    const rects = boardInfo?.scrollRects || [];
    rects.forEach((sr, idx) => {
      const task = openGuildTasks[idx];
      if (!task) return;
      this._frameBountyRects.push({ task, x: sr.x, y: sr.y, w: sr.w, h: sr.h });
      if (this.hoveredBountyTaskId === task.id) {
        g.strokeStyle = '#fde047';
        g.lineWidth = 1;
        g.strokeRect(sr.x - 1.5, sr.y - 1.5, sr.w + 3, sr.h + 3);
      }
    });

    // Guild Hall Plaque (x=246..348, y=10..44)
    g.fillStyle = '#1c120b';
    g.fillRect(246, 10, 102, 34);
    g.fillStyle = '#78350f';
    g.fillRect(248, 12, 98, 30);
    g.fillStyle = '#2b190d';
    g.fillRect(250, 14, 94, 26);
    g.fillStyle = '#f59e0b';
    g.fillRect(248, 12, 98, 1);
    g.fillRect(248, 41, 98, 1);

    // Trophy & Weapon Display Rack on Right Wall (x=382..466, y=8..54)
    this._drawGuildWeaponRack(g, 382, 8);

    // 4. Center Guild Round Coffee & Blueprint Table (x=240, y=176)
    g.fillStyle = 'rgba(0,0,0,0.34)';
    g.fillRect(216, 178, 48, 14);
    g.fillStyle = '#5c341a';
    g.fillRect(218, 166, 44, 18);
    g.fillStyle = '#8c532c';
    g.fillRect(220, 162, 40, 14);
    g.fillStyle = '#b07042';
    g.fillRect(222, 163, 36, 4);
    // Rolled cyan blueprint + steaming mugs on table
    g.fillStyle = '#0284c7';
    g.fillRect(226, 166, 16, 6);
    g.fillStyle = '#bae6fd';
    g.fillRect(228, 168, 12, 2);
    g.fillStyle = '#f8fafc';
    g.fillRect(246, 165, 5, 6);
    g.fillStyle = '#78350f';
    g.fillRect(247, 166, 3, 2);

    // 5. 4 Spacious Solid-Wood Artisan Workstations + 32x32 HD Workers
    const guildWorkers = this._getGuildWorkers();
    const deskWorkerMap = new Map();
    guildWorkers.forEach((w, idx) => {
      deskWorkerMap.set(idx % GUILD_DESKS.length, w);
    });

    const drawList = [
      { y: 78, draw: () => drawPottedPlant(g, 18, 78, 'monstera', Math.floor(this.time * 2)) },
      { y: 288, draw: () => drawPottedPlant(g, 20, 288, 'monstera', Math.floor(this.time * 2) + 1) },
      { y: 288, draw: () => drawPottedPlant(g, 460, 288, 'monstera', Math.floor(this.time * 2)) },
    ];

    const deskFrame = Math.floor(this.time * 4);
    for (const desk of GUILD_DESKS) {
      const worker = deskWorkerMap.get(desk.id) || null;
      const active = Boolean(worker && (worker.busy || worker.cliTimer > 0));
      drawList.push({
        y: desk.y,
        draw: () => {
          const info = drawMonitorDesk(g, desk.x, desk.y, 'guild', active, deskFrame, {
            selected: worker && this.selectedWorkerId === worker.id,
            hovered: worker && this.hoveredWorkerId === worker.id,
            accentColor: worker ? getWorkerModelStyle(worker).border : '#f59e0b',
          });
          this._frameMonitors.push({
            worker,
            desk,
            screenRect: info.screenRect,
            isActive: active,
            sceneStyle: 'guild',
          });
        },
      });
    }

    for (const w of guildWorkers) {
      const anim =
        w.celebrateTimer > 0
          ? 'celebrate'
          : w.walking
            ? 'walk'
            : w.busy || w.cliTimer > 0
              ? 'work'
              : 'idle';
      drawList.push({
        y: w.y,
        draw: () => this._drawWorkerIntoScene(g, w, w.x, w.y, anim, 1),
      });
    }

    drawList.sort((a, b) => a.y - b.y);
    for (const item of drawList) item.draw();

    // 6. Warm Guild Lighting Cones at Night
    if (isNight) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const [lx, ly, r] of [
        [116, 24, 52],
        [364, 24, 52],
        [188, 30, 56],
      ]) {
        const grad = g.createRadialGradient(lx, ly, 4, lx, ly, r);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        g.fillStyle = grad;
        g.fillRect(lx - r, ly - r, r * 2, r * 2);
      }
      g.restore();
    }
  }

  _drawGuildWeaponRack(g, x, y) {
    // Timber showcase frame
    g.fillStyle = '#1c120b';
    g.fillRect(x, y, 84, 46);
    g.fillStyle = '#5c341a';
    g.fillRect(x + 2, y + 2, 80, 42);
    g.fillStyle = '#29180d';
    g.fillRect(x + 4, y + 4, 76, 38);

    // Heraldic Shield in center
    g.fillStyle = '#b91c1c';
    g.fillRect(x + 34, y + 12, 16, 16);
    g.fillRect(x + 36, y + 28, 12, 4);
    g.fillRect(x + 39, y + 32, 6, 3);
    g.fillStyle = '#fbbf24';
    g.fillRect(x + 34, y + 12, 16, 2);
    g.fillRect(x + 41, y + 14, 2, 18);
    g.fillRect(x + 36, y + 20, 12, 2);

    // Crossed Pixel Greatsword (left)
    g.fillStyle = '#cbd5e1';
    g.fillRect(x + 14, y + 10, 3, 22);
    g.fillStyle = '#f8fafc';
    g.fillRect(x + 15, y + 10, 1, 20);
    g.fillStyle = '#f59e0b';
    g.fillRect(x + 10, y + 30, 11, 2);
    g.fillStyle = '#78350f';
    g.fillRect(x + 14, y + 32, 3, 6);

    // Golden Artisan Hammer / Battle Axe (right)
    g.fillStyle = '#78350f';
    g.fillRect(x + 65, y + 12, 3, 26);
    g.fillStyle = '#f59e0b';
    g.fillRect(x + 59, y + 12, 15, 7);
    g.fillStyle = '#fef08a';
    g.fillRect(x + 60, y + 13, 13, 2);

    // Mini glowing guild trophy cup on shelf
    g.fillStyle = '#fde047';
    g.fillRect(x + 24, y + 32, 6, 5);
    g.fillRect(x + 26, y + 37, 2, 3);
    g.fillRect(x + 24, y + 39, 6, 2);
  }

  // ==========================================================================
  // SCENE 3: 'launchpad' — 孵化廣場指揮中心 (投票立項與全息發射台)
  // ==========================================================================

  _renderLaunchpadBuffer(g, isNight) {
    // 1. Sci-fi Obsidian Glass & Titanium Wall
    g.fillStyle = isNight ? '#0c0b1e' : '#cbd5e1';
    g.fillRect(0, 0, WORLD_W, 66);

    // Panoramic Starry Sky Curtain Windows (Left & Right)
    this._drawSkyWindow(g, 12, 6, 124, 50, isNight, '#312e81', '#6366f1');
    this._drawSkyWindow(g, 344, 6, 124, 50, isNight, '#312e81', '#6366f1');

    // Top-Center Pixel Neon Sponsor Billboard Frame (x=144..336, y=6..46)
    const ticker = this._getBillboardTicker();
    g.fillStyle = '#070614';
    g.fillRect(144, 6, 192, 42);
    g.fillStyle = '#14112e';
    g.fillRect(147, 9, 186, 36);
    // Chase neon bulbs
    const step = Math.floor(this.time * 6);
    const colA = ticker.isSponsored ? '#f472b6' : '#22d3ee';
    const colB = ticker.isSponsored ? '#fde047' : '#a855f7';
    for (let bx = 146; bx < 334; bx += 8) {
      g.fillStyle = ((bx / 8 + step) % 2) === 0 ? colA : colB;
      g.fillRect(bx, 7, 3, 2);
      g.fillRect(bx, 45, 3, 2);
    }

    // Wall trim divider
    g.fillStyle = '#a855f7';
    g.fillRect(0, 62, WORLD_W, 2);
    g.fillStyle = '#22d3ee';
    g.fillRect(0, 64, WORLD_W, 2);

    // 2. Obsidian + Amethyst Crystal Tech Floor
    g.fillStyle = isNight ? '#110d24' : '#e2e8f0';
    g.fillRect(0, 66, WORLD_W, WORLD_H - 66);
    for (let y = 66; y < WORLD_H; y += 16) {
      for (let x = 0; x < WORLD_W; x += 24) {
        const alt = ((x / 24 + Math.floor((y - 66) / 16)) % 2) === 0;
        g.fillStyle = isNight
          ? alt
            ? '#161130'
            : '#120e28'
          : alt
            ? '#ede9fe'
            : '#e2e8f0';
        g.fillRect(x, y, 23, 15);
      }
    }

    // Radiating Cyan-Violet Energy Conduits toward Central Hologram Pad (240, 210)
    g.fillStyle = isNight ? '#3b0764' : '#c4b5fd';
    g.fillRect(120, 206, 240, 4);
    g.fillRect(238, 68, 4, 210);
    const pulse = Math.floor(this.time * 55) % 90;
    g.fillStyle = '#22d3ee';
    g.fillRect(124 + pulse, 207, 8, 2);
    g.fillRect(352 - pulse, 207, 8, 2);

    // 3. Project Kanban Sticky-Note Whiteboard (Left-Upper Floor Stand, x=14..108, y=72..134)
    this._drawLaunchpadKanban(g, 14, 72);

    // 4. Two Flanking Community Vote Energy Pillars
    const voteProjects = this._getVotingProjects();
    const pillarPositions = [
      { x: 122, y: 124 },
      { x: 326, y: 124 },
    ];
    pillarPositions.forEach((pos, idx) => {
      const vp = voteProjects[idx];
      if (!vp) return;
      this._drawVoteEnergyPillar(g, pos.x, pos.y, vp, idx);
      this._frameVotePillars.push({ project: vp, x: pos.x, y: pos.y, w: 32, h: 68 });
    });

    // 5. Giant Central 3D Floating Hologram Project Projection Pad (x=240, y=214)
    const featured = this._getFeaturedProject();
    const pct = clamp(Number(featured.progressPct ?? 0), 0, 100);
    // Floor holographic ring under pad
    g.fillStyle = isNight ? 'rgba(34, 211, 238, 0.16)' : 'rgba(139, 92, 246, 0.16)';
    g.fillRect(194, 198, 92, 24);
    g.fillStyle = isNight ? 'rgba(168, 85, 247, 0.22)' : 'rgba(56, 189, 248, 0.22)';
    g.fillRect(202, 202, 76, 16);

    drawHologramCore(g, 240, 214, pct, featured.status || 'building', Math.floor(this.time * 4));

    // 6. Command Consoles + 32x32 HD Workers
    const allWorkers = Array.from(this.agents.values());
    const drawList = [
      { y: 288, draw: () => drawPottedPlant(g, 16, 288, 'cyber_fern', Math.floor(this.time * 2)) },
      { y: 288, draw: () => drawPottedPlant(g, 464, 288, 'cyber_fern', Math.floor(this.time * 2) + 1) },
    ];

    const deskFrame = Math.floor(this.time * 4);
    LAUNCHPAD_DESKS.forEach((desk, idx) => {
      const w = allWorkers[idx] || null;
      const active = Boolean(w);
      drawList.push({
        y: desk.y,
        draw: () => {
          const info = drawMonitorDesk(g, desk.x, desk.y, 'launchpad', active, deskFrame, {
            selected: w && this.selectedWorkerId === w.id,
            hovered: w && this.hoveredWorkerId === w.id,
            accentColor: '#a855f7',
          });
          this._frameMonitors.push({
            worker: w,
            desk,
            screenRect: info.screenRect,
            isActive: active,
            sceneStyle: 'launchpad',
          });
        },
      });
    });

    for (const w of allWorkers) {
      const anim =
        w.celebrateTimer > 0 || featured.status === 'launched'
          ? 'celebrate'
          : w.walking
            ? 'walk'
            : w.busy
              ? 'work'
              : 'idle';
      drawList.push({
        y: w.y,
        draw: () => this._drawWorkerIntoScene(g, w, w.x, w.y, anim, 1),
      });
    }

    drawList.sort((a, b) => a.y - b.y);
    for (const item of drawList) item.draw();

    // 7. Intense Cyan-Violet Hologram Floor Glow!
    g.save();
    g.globalCompositeOperation = 'lighter';
    const holoGrad = g.createRadialGradient(240, 178, 8, 240, 178, 84);
    holoGrad.addColorStop(0, isNight ? 'rgba(34, 211, 238, 0.34)' : 'rgba(56, 189, 248, 0.20)');
    holoGrad.addColorStop(0.55, isNight ? 'rgba(168, 85, 247, 0.22)' : 'rgba(168, 85, 247, 0.10)');
    holoGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    g.fillStyle = holoGrad;
    g.fillRect(156, 94, 168, 168);
    g.restore();
  }

  _drawLaunchpadKanban(g, x, y) {
    const w = 96;
    const h = 56;
    g.fillStyle = '#0f172a';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#a855f7';
    g.fillRect(x, y, w, 2);
    g.fillStyle = '#f1f5f9';
    g.fillRect(x + 3, y + 4, w - 6, h - 8);
    // 3 Kanban columns
    g.fillStyle = '#cbd5e1';
    g.fillRect(x + 33, y + 6, 1, h - 14);
    g.fillRect(x + 63, y + 6, 1, h - 14);

    // Real sticky notes from tasks!
    const tasks = this.state.tasks || [];
    const cols = [[], [], []];
    for (const t of tasks) {
      if (t.status === 'completed' || t.status === 'accepted') cols[2].push(t);
      else if (t.status === 'in_progress' || t.status === 'claimed') cols[1].push(t);
      else cols[0].push(t);
    }
    const noteColors = ['#fde047', '#38bdf8', '#4ade80'];
    cols.forEach((list, ci) => {
      list.slice(0, 8).forEach((_, ti) => {
        const nx = x + 6 + ci * 30 + (ti % 2) * 12;
        const ny = y + 8 + Math.floor(ti / 2) * 9;
        g.fillStyle = 'rgba(0,0,0,0.16)';
        g.fillRect(nx + 1, ny + 1, 9, 6);
        g.fillStyle = noteColors[ci];
        g.fillRect(nx, ny, 9, 6);
      });
    });

    // Stand legs
    g.fillStyle = '#334155';
    g.fillRect(x + 12, y + h, 4, 8);
    g.fillRect(x + w - 16, y + h, 4, 8);
  }

  _drawVoteEnergyPillar(g, x, y, project, idx) {
    const votes = Number(project.votes ?? 0);
    const req = Math.max(1, Number(project.votesRequired ?? 10));
    const ratio = clamp(votes / req, 0.1, 1);
    const isVoting = project.status === 'voting';
    const accent = isVoting ? '#f472b6' : '#22d3ee';
    const isHover = this.hoveredPropId === `vote:${project.id}`;

    // Base & Cap
    g.fillStyle = isHover ? '#fde047' : '#0f172a';
    g.fillRect(x, y + 54, 32, 14);
    g.fillStyle = '#334155';
    g.fillRect(x + 2, y + 56, 28, 10);
    g.fillStyle = '#0f172a';
    g.fillRect(x + 2, y, 28, 8);
    g.fillStyle = accent;
    g.fillRect(x + 4, y + 2, 24, 3);

    // Glass tube
    g.fillStyle = '#1e1b4b';
    g.fillRect(x + 5, y + 8, 22, 46);
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(x + 7, y + 10, 3, 42);

    // Rising energy fill
    const fillH = Math.round(42 * ratio);
    g.fillStyle = accent;
    g.fillRect(x + 7, y + 52 - fillH, 18, fillH);
    g.fillStyle = '#ffffff';
    const bubbleY = y + 50 - ((Math.floor(this.time * 18 + idx * 17)) % Math.max(4, fillH));
    g.fillRect(x + 12, bubbleY, 2, 2);
    g.fillRect(x + 18, Math.min(y + 49, bubbleY + 5), 2, 2);
  }

  // ==========================================================================
  // SCENE 4: 'lounge' — 算力宿舍生活館 (小人管理與商店展示廳)
  // ==========================================================================

  _renderLoungeBuffer(g, isNight) {
    // 1. Cozy Cedar & Warm Cream Wall
    g.fillStyle = isNight ? '#261e30' : '#f1e7d8';
    g.fillRect(0, 0, WORLD_W, 64);
    g.fillStyle = isNight ? '#3b2b47' : '#d8c3a5';
    g.fillRect(0, 44, WORLD_W, 18);
    g.fillStyle = isNight ? '#5c3f6e' : '#c4a47c';
    g.fillRect(0, 43, WORLD_W, 2);
    g.fillStyle = isNight ? '#191221' : '#8d6e53';
    g.fillRect(0, 62, WORLD_W, 2);

    // 2. Warm Cedar Floorboards
    g.fillStyle = isNight ? '#3d2c22' : '#d9b991';
    g.fillRect(0, 64, WORLD_W, WORLD_H - 64);
    for (let y = 64; y < WORLD_H; y += 10) {
      const alt = ((y - 64) / 10) % 2 === 0;
      g.fillStyle = isNight
        ? alt
          ? '#473428'
          : '#3d2c22'
        : alt
          ? '#e2c59f'
          : '#d6b489';
      g.fillRect(0, y, WORLD_W, 9);
      g.fillStyle = isNight ? '#2b1e16' : '#ba9569';
      g.fillRect(0, y + 9, WORLD_W, 1);
      const off = alt ? 0 : 28;
      for (let x = off; x < WORLD_W; x += 56) {
        g.fillRect(x, y, 1, 9);
      }
    }

    // 3. Large Woven Pixel Area Rug in Center (x=136..344, y=130..240)
    g.fillStyle = isNight ? '#4c1d57' : '#c084fc';
    g.fillRect(136, 130, 208, 110);
    g.fillStyle = isNight ? '#702963' : '#e9d5ff';
    g.fillRect(142, 136, 196, 98);
    g.fillStyle = isNight ? '#f472b6' : '#a855f7';
    g.fillRect(146, 140, 188, 2);
    g.fillRect(146, 228, 188, 2);
    g.fillRect(146, 140, 2, 90);
    g.fillRect(332, 140, 2, 90);
    // Geometric woven diamond motifs
    g.fillStyle = isNight ? 'rgba(253, 224, 71, 0.25)' : 'rgba(126, 34, 206, 0.18)';
    for (let rx = 160; rx < 320; rx += 24) {
      g.fillRect(rx, 152, 8, 8);
      g.fillRect(rx, 210, 8, 8);
    }

    // 4. Top Wall: Moonlit/Sunlit Window + 6-Slot Achievement Trophy Glass Case + Bookshelf
    this._drawSkyWindow(g, 16, 8, 108, 44, isNight, '#6b4c35', '#9c6e4e');

    // 6-Slot Genesis Achievement Trophy Glass Case (x=196, y=10, 80x32)
    drawTrophyCase(g, 196, 10, this.state.achievements, Math.floor(this.time * 3));

    // Cozy Bookshelf & Lounge Sign on Right Wall (x=344..464, y=8..52)
    g.fillStyle = '#3b2416';
    g.fillRect(348, 10, 114, 40);
    g.fillStyle = '#5c3822';
    g.fillRect(350, 12, 110, 36);
    // Pixel colorful books on 2 shelves
    const bookColors = ['#ef4444', '#38bdf8', '#fde047', '#4ade80', '#f472b6', '#a855f7'];
    for (let row = 0; row < 2; row++) {
      g.fillStyle = '#26170e';
      g.fillRect(354, 16 + row * 16, 102, 12);
      for (let bx = 0; bx < 16; bx++) {
        g.fillStyle = bookColors[(bx + row * 3) % bookColors.length];
        const bh = 8 + ((bx * 3 + row) % 4);
        g.fillRect(356 + bx * 6, 28 + row * 16 - bh, 4, bh);
      }
    }

    // 5. Left: Hand-Pour Coffee Bar (Upgrades to Golden Lever Espresso when owned!)
    const hasGoldCoffee = this._hasDecor('decor-gold-coffee', 'decor-espresso', 'espresso', 'coffee');
    drawCoffeeBar(g, 20, 82, hasGoldCoffee, Math.floor(this.time * 3));

    // 6. Right: Plush Wireless-Charging Sofa Lounge (x=352..458, y=94..148)
    this._drawLoungeSofaArea(g, 354, 96, isNight);

    // 3 Glowing Wireless Charging Pads along bottom
    const padFrame = Math.floor(this.time * 3) % 2;
    for (const px of [104, 226, 348]) {
      drawObjectSprite(g, 'charge_pad', px, 256, 2, padFrame);
    }

    // 7. Sleeping Orange Pixel Cat on Center Rug (appears when decor-cat-bed / skin-cat / decor-espresso owned!)
    const hasCat = this._hasDecor('decor-cat-bed', 'cat-bed', 'decor-cat', 'skin-cat', 'decor-espresso');
    if (hasCat) {
      drawSleepingCat(g, 226, 166, Math.floor(this.time * 2));
    } else {
      // Cozy waiting cat cushion placeholder
      g.fillStyle = '#3b2442';
      g.fillRect(226, 174, 28, 12);
      g.fillStyle = '#f472b6';
      g.fillRect(228, 176, 24, 8);
    }

    // 8. Potted Plants + All 32x32 HD Workers strolling, sipping coffee & flexing limited skins!
    const drawList = [
      { y: 78, draw: () => drawPottedPlant(g, 146, 78, 'sakura', Math.floor(this.time * 2)) },
      { y: 78, draw: () => drawPottedPlant(g, 326, 78, 'monstera', Math.floor(this.time * 2) + 1) },
      { y: 288, draw: () => drawPottedPlant(g, 24, 288, 'sakura', Math.floor(this.time * 2)) },
      { y: 288, draw: () => drawPottedPlant(g, 456, 288, 'monstera', Math.floor(this.time * 2)) },
    ];

    for (const w of this.agents.values()) {
      const anim = w.celebrateTimer > 0 ? 'celebrate' : w.walking ? 'walk' : 'idle';
      drawList.push({
        y: w.y,
        draw: () => this._drawWorkerIntoScene(g, w, w.x, w.y, anim, 1),
      });
    }

    drawList.sort((a, b) => a.y - b.y);
    for (const item of drawList) item.draw();

    // 9. Moonbeam / Sunbeam from Starry Window + Warm Floor Lamp Glow
    g.save();
    g.fillStyle = isNight ? 'rgba(186, 230, 253, 0.09)' : 'rgba(254, 249, 195, 0.16)';
    g.beginPath();
    g.moveTo(18, 54);
    g.lineTo(122, 54);
    g.lineTo(164, 152);
    g.lineTo(44, 152);
    g.closePath();
    g.fill();

    if (isNight) {
      g.globalCompositeOperation = 'lighter';
      const lampGrad = g.createRadialGradient(448, 102, 4, 448, 102, 58);
      lampGrad.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
      lampGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      g.fillStyle = lampGrad;
      g.fillRect(390, 44, 90, 116);

      if (hasGoldCoffee) {
        const coffeeGrad = g.createRadialGradient(54, 98, 4, 54, 98, 42);
        coffeeGrad.addColorStop(0, 'rgba(253, 224, 71, 0.26)');
        coffeeGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        g.fillStyle = coffeeGrad;
        g.fillRect(12, 56, 84, 84);
      }
    }
    g.restore();
  }

  _drawLoungeSofaArea(g, x, y, isNight) {
    // Plush wide pixel sofa
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(x + 2, y + 26, 78, 6);
    g.fillStyle = '#1e1b4b';
    g.fillRect(x, y, 80, 28);
    g.fillStyle = isNight ? '#4f46e5' : '#6366f1';
    g.fillRect(x + 3, y + 3, 74, 12);
    g.fillStyle = isNight ? '#6366f1' : '#818cf8';
    g.fillRect(x + 6, y + 13, 68, 12);
    // Throw cushions
    g.fillStyle = '#f472b6';
    g.fillRect(x + 10, y + 6, 12, 8);
    g.fillStyle = '#fde047';
    g.fillRect(x + 58, y + 6, 12, 8);
    // Side warm floor lamp
    g.fillStyle = '#78350f';
    g.fillRect(x + 92, y + 6, 3, 26);
    g.fillRect(x + 88, y + 30, 11, 3);
    g.fillStyle = '#f59e0b';
    g.fillRect(x + 87, y - 4, 13, 10);
    g.fillStyle = '#fef08a';
    g.fillRect(x + 89, y - 1, 9, 5);
  }

  // ==========================================================================
  // SCENE 5: 'vault' — 創作者金庫大廳 (黑金分紅銀行與榮耀領獎台)
  // ==========================================================================

  _renderVaultBuffer(g, isNight) {
    // 1. Black-Gold Cyber Marble Bank Wall (Day: Ivory-Gold Marble Vault)
    g.fillStyle = isNight ? '#0e0c12' : '#efe7d6';
    g.fillRect(0, 0, WORLD_W, 78);

    // Marble pilasters with gold capitals
    for (const px of [12, 166, 294, 448]) {
      g.fillStyle = isNight ? '#1b1721' : '#dfd2b8';
      g.fillRect(px, 4, 20, 72);
      g.fillStyle = isNight ? '#2b2434' : '#f7f1e3';
      g.fillRect(px + 3, 6, 6, 68);
      // Gold capital & base
      g.fillStyle = '#d97706';
      g.fillRect(px - 2, 4, 24, 5);
      g.fillRect(px - 2, 71, 24, 5);
      g.fillStyle = '#fde047';
      g.fillRect(px - 1, 5, 22, 2);
    }

    // Gold cornice trim
    g.fillStyle = '#b45309';
    g.fillRect(0, 74, WORLD_W, 3);
    g.fillStyle = '#fde047';
    g.fillRect(0, 77, WORLD_W, 2);

    // 2. Polished Black-Gold Checkerboard Marble Floor
    g.fillStyle = isNight ? '#121017' : '#e7ddc9';
    g.fillRect(0, 79, WORLD_W, WORLD_H - 79);
    for (let y = 79; y < WORLD_H; y += 20) {
      for (let x = 0; x < WORLD_W; x += 24) {
        const alt = ((x / 24 + Math.floor((y - 79) / 20)) % 2) === 0;
        g.fillStyle = isNight
          ? alt
            ? '#191520'
            : '#110e16'
          : alt
            ? '#f5efe2'
            : '#e2d5bc';
        g.fillRect(x, y, 24, 20);
        // Subtle gold marble vein
        if ((x + y) % 48 === 0) {
          g.fillStyle = isNight ? 'rgba(251, 191, 36, 0.08)' : 'rgba(180, 83, 9, 0.10)';
          g.fillRect(x + 4, y + 6, 12, 1);
          g.fillRect(x + 12, y + 7, 8, 1);
        }
      }
    }

    // Royal Red-Gold Velvet Carpet to Vault Door
    g.fillStyle = '#7f1d1d';
    g.fillRect(204, 80, 72, 210);
    g.fillStyle = '#d97706';
    g.fillRect(204, 80, 3, 210);
    g.fillRect(273, 80, 3, 210);

    // 3. Giant Circular Cyber Bank Vault Door (Top Center: x=202, y=6, 76x68)
    drawVaultDoor(g, 202, 6, Math.floor(this.time * 3));

    // 4. Center Sparkling Gold Coin Mountain (scaled by founderRevenue.totalUsd!)
    const rev = this.state.founderRevenue || {};
    const totalUsd = Number(rev.totalUsd ?? 0);
    const goldLevel = totalUsd >= 200 ? 5 : totalUsd >= 120 ? 4 : totalUsd >= 60 ? 3 : totalUsd >= 25 ? 2 : 1;
    drawGoldPile(g, 240, 178, goldLevel, Math.floor(this.time * 4));

    // 5. Left Wing: 4 Dynamic Glowing Electronic Revenue Pillars (x=22..182, y=104..262)
    this._drawVaultRevenuePillars(g, rev, isNight);

    // 6. Right Wing: Gold / Silver / Bronze Top 3 Leaderboard Podium (x=296..464, y=148..268)
    this._drawVaultTop3Podium(g, isNight);

    // 7. Dramatic Golden Vault Spotlights
    if (isNight) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const coinGlow = g.createRadialGradient(240, 162, 6, 240, 162, 68);
      coinGlow.addColorStop(0, 'rgba(253, 224, 71, 0.30)');
      coinGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      g.fillStyle = coinGlow;
      g.fillRect(172, 94, 136, 136);

      const podGlow = g.createRadialGradient(382, 194, 6, 382, 194, 72);
      podGlow.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
      podGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      g.fillStyle = podGlow;
      g.fillRect(310, 122, 144, 144);
      g.restore();
    }
  }

  _drawVaultRevenuePillars(g, rev, isNight) {
    const streams = [
      { key: 'bounty', val: Number(rev.bountyFeesUsd ?? 0), color: '#f59e0b', hi: '#fde047' },
      { key: 'carry', val: Number(rev.incubationCarryUsd ?? 0), color: '#a855f7', hi: '#e9d5ff' },
      { key: 'ads', val: Number(rev.billboardAdsUsd ?? 0), color: '#f472b6', hi: '#fbcfe8' },
      { key: 'pro', val: Number(rev.proSkinsUsd ?? 0), color: '#22d3ee', hi: '#a5f3fc' },
    ];
    const maxVal = Math.max(10, ...streams.map((s) => s.val));

    // Console platform base
    g.fillStyle = isNight ? '#09090b' : '#334155';
    g.fillRect(16, 246, 166, 22);
    g.fillStyle = '#d97706';
    g.fillRect(16, 246, 166, 2);

    streams.forEach((st, idx) => {
      const cx = 36 + idx * 40;
      const colW = 24;
      const maxH = 104;
      const ratio = clamp(st.val / maxVal, 0.08, 1);
      const fillH = Math.max(8, Math.round(maxH * ratio));
      const topY = 244 - maxH;

      // Glass housing
      g.fillStyle = isNight ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.72)';
      g.fillRect(cx - colW / 2, topY, colW, maxH);
      g.fillStyle = '#475569';
      g.fillRect(cx - colW / 2, topY, colW, 2);
      g.fillRect(cx - colW / 2, topY, 1, maxH);
      g.fillRect(cx + colW / 2 - 1, topY, 1, maxH);

      // Glowing dynamic bar
      const barY = 244 - fillH;
      g.fillStyle = st.color;
      g.fillRect(cx - colW / 2 + 2, barY, colW - 4, fillH);
      g.fillStyle = st.hi;
      g.fillRect(cx - colW / 2 + 4, barY, 4, fillH);
      // Animated energy scanline inside bar
      const scanY = 242 - ((Math.floor(this.time * 28 + idx * 19)) % Math.max(4, fillH));
      g.fillStyle = '#ffffff';
      g.fillRect(cx - colW / 2 + 2, scanY, colW - 4, 2);
    });
  }

  _drawVaultTop3Podium(g, isNight) {
    const lb = [...(this.state.leaderboard || [])]
      .sort((a, b) => Number(b.contributionPoints ?? 0) - Number(a.contributionPoints ?? 0))
      .slice(0, 3);

    // Pedestals: #2 Silver (Left), #1 Gold (Center), #3 Bronze (Right)
    const slots = [
      {
        rank: 2,
        entry: lb[1],
        x: 326,
        pedY: 224,
        pedH: 42,
        w: 44,
        main: '#94a3b8',
        hi: '#e2e8f0',
        dark: '#475569',
        crown: 'silver',
        role: 'flash_worker',
        skin: 'skin-cyber',
      },
      {
        rank: 1,
        entry: lb[0],
        x: 382,
        pedY: 204,
        pedH: 62,
        w: 50,
        main: '#d97706',
        hi: '#fde047',
        dark: '#78350f',
        crown: 'gold',
        role: 'pro_architect',
        skin: 'skin-gold',
      },
      {
        rank: 3,
        entry: lb[2],
        x: 438,
        pedY: 234,
        pedH: 32,
        w: 44,
        main: '#b45309',
        hi: '#fbbf24',
        dark: '#451a03',
        crown: 'bronze',
        role: 'pixel_artist',
        skin: 'skin-cat',
      },
    ];

    // Base shadow platform
    g.fillStyle = isNight ? '#09090b' : '#475569';
    g.fillRect(298, 264, 168, 8);

    const frame = Math.floor(this.time * 5);
    for (const s of slots) {
      const px = Math.round(s.x - s.w / 2);
      g.fillStyle = s.dark;
      g.fillRect(px, s.pedY, s.w, s.pedH);
      g.fillStyle = s.main;
      g.fillRect(px + 2, s.pedY + 2, s.w - 4, s.pedH - 4);
      g.fillStyle = s.hi;
      g.fillRect(px, s.pedY, s.w, 4);

      // Draw 32x32 HD Champion wearing Crown!
      const champWorker = {
        id: s.entry?.userId || `top-${s.rank}`,
        name: s.entry?.displayName || `Top #${s.rank}`,
        roleClass: s.role,
        skinId: s.skin,
        flipX: false,
      };
      const anim = s.rank === 1 ? 'celebrate' : 'idle';
      drawHDWorker(g, s.x, s.pedY + 1, champWorker, anim, frame + s.rank, 1, {
        crown: s.crown,
        shadow: true,
      });
    }
  }

  // ==========================================================================
  // SCENE 6: 'town' — HD 像素小鎮全景地圖 (Click any building -> Indoor HD!)
  // ==========================================================================

  _renderTownBuffer(g, isNight) {
    // 1. Sky Strip (y=0..22)
    g.fillStyle = isNight ? '#090e21' : '#38bdf8';
    g.fillRect(0, 0, WORLD_W, 13);
    g.fillStyle = isNight ? '#141d3b' : '#bae6fd';
    g.fillRect(0, 13, WORLD_W, 10);

    if (isNight) {
      for (const s of this.stars) {
        if (s.y > 21) continue;
        const a = 0.3 + 0.7 * Math.abs(Math.sin(this.time * 2 + s.phase));
        g.globalAlpha = Number(a.toFixed(2));
        g.fillStyle = s.tint;
        g.fillRect(s.x, s.y, s.size, s.size);
      }
      g.globalAlpha = 1;
      for (const m of this.meteors) {
        for (let t = 0; t < 6; t++) {
          g.globalAlpha = Math.max(0, (m.life / m.maxLife) * (1 - t / 6));
          g.fillStyle = t === 0 ? '#ffffff' : m.color;
          g.fillRect(Math.round(m.x - t * 3), Math.round(m.y - t * 0.7), t === 0 ? 2 : 1, 1);
        }
      }
      g.globalAlpha = 1;
    } else {
      for (const cl of this.clouds) {
        const cx = Math.floor((cl.x + this.time * cl.speed) % (WORLD_W + 60)) - 30;
        g.fillStyle = '#ffffff';
        g.fillRect(cx, cl.y, cl.w, 4);
        g.fillRect(cx + 4, cl.y - 2, cl.w - 8, 3);
      }
    }

    // 2. Town Ground & Textured Grass/Slate
    g.fillStyle = isNight ? '#131b2e' : '#5e965b';
    g.fillRect(0, 23, WORLD_W, WORLD_H - 23);
    g.fillStyle = isNight ? '#18233a' : '#6ca868';
    for (let y = 28; y < WORLD_H; y += 14) {
      for (let x = (y % 28 === 0 ? 0 : 7); x < WORLD_W; x += 14) {
        g.fillRect(x, y, 4, 2);
      }
    }

    // 3. Stone Roads & Central Cobblestone Plaza
    g.fillStyle = isNight ? '#2e3b5c' : '#b2a384';
    g.fillRect(222, 23, 36, WORLD_H - 23);
    g.fillRect(10, 140, WORLD_W - 20, 32);
    g.fillStyle = isNight ? '#212b45' : '#cfc4ab';
    g.fillRect(224, 23, 32, WORLD_H - 23);
    g.fillRect(10, 142, WORLD_W - 20, 28);

    // Central Plaza Cobblestones (x=172..308, y=96..218)
    const px = 172;
    const py = 96;
    const pw = 136;
    const ph = 122;
    g.fillStyle = isNight ? '#475985' : '#a89b82';
    g.fillRect(px - 2, py - 2, pw + 4, ph + 4);
    for (let ty = 0; ty < ph; ty += 12) {
      for (let tx = 0; tx < pw; tx += 12) {
        const even = ((tx / 12 + ty / 12) % 2) === 0;
        g.fillStyle = isNight
          ? even
            ? '#25314f'
            : '#2c3a5c'
          : even
            ? '#e7dec8'
            : '#dcd0b4';
        g.fillRect(px + tx, py + ty, Math.min(12, pw - tx), Math.min(12, ph - ty));
        g.fillStyle = isNight ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.22)';
        g.fillRect(px + tx + 1, py + ty + 1, Math.min(10, pw - tx - 1), 1);
      }
    }

    // Animated Central Plaza Fountain (x=240, y=184)
    g.fillStyle = '#475569';
    g.fillRect(218, 174, 44, 22);
    g.fillStyle = '#0284c7';
    g.fillRect(221, 177, 38, 16);
    g.fillStyle = '#38bdf8';
    const fWave = Math.floor(this.time * 5) % 4;
    g.fillRect(225 + fWave, 181, 12, 2);
    g.fillRect(243 - fWave, 187, 10, 2);
    // Fountain center jet
    g.fillStyle = '#94a3b8';
    g.fillRect(236, 168, 8, 14);
    g.fillStyle = '#bae6fd';
    g.fillRect(238, 160 + (fWave % 2), 4, 8);
    g.fillStyle = '#ffffff';
    g.fillRect(234, 162 + (fWave % 2), 3, 2);
    g.fillRect(243, 162 + ((fWave + 1) % 2), 3, 2);

    // Central Plaza Neon Billboard (x=184..296, y=102..136)
    const ticker = this._getBillboardTicker();
    g.fillStyle = '#090d1a';
    g.fillRect(184, 102, 112, 34);
    g.fillStyle = '#111827';
    g.fillRect(187, 105, 106, 28);
    const step = Math.floor(this.time * 6);
    for (let bx = 186; bx < 294; bx += 6) {
      g.fillStyle = ((bx / 6 + step) % 2) === 0 ? (ticker.isSponsored ? '#f472b6' : '#22d3ee') : '#fde047';
      g.fillRect(bx, 103, 2, 2);
      g.fillRect(bx, 133, 2, 2);
    }

    // 4. Five Detailed Shingle-Roof Buildings (Factory, Guild, Vault, Lounge, Launchpad)
    const roofStyles = {
      factory: { roof: '#9a4d22', light: '#d97706', floor: isNight ? '#152236' : '#cbd5e1' },
      guild: { roof: '#881c1c', light: '#dc2626', floor: isNight ? '#2b1d15' : '#d6bc99' },
      vault: { roof: '#1c1917', light: '#f59e0b', floor: isNight ? '#17131e' : '#efe7d6' },
      lounge: { roof: '#0f766e', light: '#14b8a6', floor: isNight ? '#241b2e' : '#eadbc8' },
      launchpad: { roof: '#4c1d95', light: '#9333ea', floor: isNight ? '#171530' : '#ddd6fe' },
    };

    for (const b of Object.values(TOWN_BUILDINGS)) {
      const st = roofStyles[b.id];
      const isHover = this.hoveredBuildingId === b.id;
      const isSel = this.selectedBuildingId === b.id;

      // Drop shadow
      g.fillStyle = 'rgba(0,0,0,0.34)';
      g.fillRect(b.x + 3, b.y + 4, b.w, b.h);
      // Shell
      g.fillStyle = '#090d1a';
      g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = st.floor;
      g.fillRect(b.x + 3, b.y + 20, b.w - 6, b.h - 23);
      // Detailed shingled roof
      g.fillStyle = st.roof;
      g.fillRect(b.x + 2, b.y + 2, b.w - 4, 18);
      g.fillStyle = st.light;
      g.fillRect(b.x + 2, b.y + 2, b.w - 4, 4);
      for (let rx = b.x + 8; rx < b.x + b.w - 8; rx += 10) {
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillRect(rx, b.y + 6, 2, 13);
      }

      // Mini iconic interior props inside each overview building
      const f = Math.floor(this.time * 3);
      if (b.id === 'factory') {
        const rackSp = this._hasDecor('decor-neon-rack', 'neon-rack') ? 'neon_server_rack' : 'server_rack';
        drawObjectSprite(g, rackSp, b.x + 8, b.y + 26, 1, f);
        drawObjectSprite(g, rackSp, b.x + 22, b.y + 26, 1, f + 1);
        drawObjectSprite(g, 'desk_pc_active', b.x + 56, b.y + 38, 1, f);
        drawObjectSprite(g, 'desk_pc_active', b.x + 104, b.y + 38, 1, f + 1);
        drawObjectSprite(g, 'gear', b.x + 4, b.y - 3, 1, f);
      } else if (b.id === 'guild') {
        drawObjectSprite(g, 'trophy_banner', b.x + 8, b.y + 24, 1, f);
        drawObjectSprite(g, 'bounty_board', b.x + 62, b.y + 24, 1, f);
        drawObjectSprite(g, 'trophy_banner', b.x + b.w - 18, b.y + 24, 1, f + 1);
        drawObjectSprite(g, 'desk_pc_active', b.x + 34, b.y + 52, 1, f);
        drawObjectSprite(g, 'desk_pc', b.x + 98, b.y + 52, 1, f);
      } else if (b.id === 'vault') {
        drawObjectSprite(g, 'genesis_trophy', b.x + 12, b.y + 30, 1, f);
        drawObjectSprite(g, 'coin', b.x + 48, b.y + 34, 2, f);
        drawObjectSprite(g, 'genesis_trophy', b.x + b.w - 24, b.y + 30, 1, f + 1);
      } else if (b.id === 'lounge') {
        const coffeeSp = this._hasDecor('decor-gold-coffee', 'decor-espresso') ? 'gold_espresso' : 'coffee_machine';
        drawObjectSprite(g, coffeeSp, b.x + 12, b.y + 28, 1, f);
        drawObjectSprite(g, 'sofa', b.x + 64, b.y + 30, 1, 0);
        if (this._hasDecor('decor-cat-bed', 'skin-cat', 'decor-espresso')) {
          drawObjectSprite(g, 'sleeping_cat', b.x + 68, b.y + 54, 1, f);
        }
        drawObjectSprite(g, 'charge_pad', b.x + 26, b.y + 82, 1, f);
        drawObjectSprite(g, 'charge_pad', b.x + 96, b.y + 82, 1, f + 1);
      } else if (b.id === 'launchpad') {
        const feat = this._getFeaturedProject();
        drawHologramCore(g, b.x + 76, b.y + 92, feat.progressPct ?? 60, feat.status || 'building', f);
      }

      if (isHover || isSel) {
        g.strokeStyle = isSel ? '#fde047' : b.accent;
        g.lineWidth = 2;
        g.strokeRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      }
    }

    // 5. Street Lamps & Potted Trees
    const sway = Math.floor(this.time * 1.5) % 2;
    drawObjectSprite(g, 'potted_tree', 170, 224, 1, sway);
    drawObjectSprite(g, 'potted_tree', 298, 224, 1, sway + 1);
    const lamps = [
      [174, 96],
      [304, 96],
      [174, 214],
      [304, 214],
    ];
    for (const [lx, ly] of lamps) {
      g.fillStyle = '#1e293b';
      g.fillRect(lx, ly, 2, 10);
      g.fillStyle = '#fde047';
      g.fillRect(lx - 1, ly - 3, 4, 3);
    }

    // 6. Workers in Town Map (compact sprite scale for overview clarity)
    const sorted = Array.from(this.agents.values()).sort((a, b) => a.y - b.y);
    for (const w of sorted) {
      const anim = w.celebrateTimer > 0 ? 'celebrate' : w.walking ? 'walk' : w.busy ? 'work' : 'idle';
      const frame = Math.floor(this.time * (anim === 'work' ? 8 : 5) + w.animSeed);
      drawWorkerSprite(g, w.roleClass, w.skinId, anim, frame, w.x, w.y, 1, w.flipX);
      this._frameWorkers.push({ agent: w, x: Math.round(w.x), y: Math.round(w.y), scale: 0.55, hideBadge: true });
    }

    // 7. Night Lamp Cones & Fireflies
    if (isNight) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const [lx, ly] of lamps) {
        const grad = g.createRadialGradient(lx, ly, 2, lx, ly, 24);
        grad.addColorStop(0, 'rgba(253, 224, 71, 0.28)');
        grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        g.fillStyle = grad;
        g.fillRect(lx - 24, ly - 24, 48, 48);
      }
      g.restore();

      for (const f of this.fireflies) {
        const fx = Math.round(f.baseX + Math.sin(this.time * f.speed + f.phase) * 8);
        const fy = Math.round(f.baseY + Math.cos(this.time * f.speed * 0.8 + f.phase) * 5);
        g.fillStyle = f.phase % 2 > 1 ? '#67e8f9' : '#fde047';
        g.fillRect(fx, fy, 1, 1);
      }
    }
  }

  // ==========================================================================
  // Buffer Particles & Fireworks (Layer 1)
  // ==========================================================================

  _drawBufferParticlesAndFX(g) {
    // Coffee steam
    for (const p of this.steamParticles) {
      g.globalAlpha = clamp((p.life / p.maxLife) * 0.55, 0, 0.6);
      g.fillStyle = '#f8fafc';
      g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    g.globalAlpha = 1;

    // Data / typing sparks
    for (const p of this.dataParticles) {
      g.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    g.globalAlpha = 1;

    // Spinning pixel coins
    const coinTick = Math.floor(this.time * 12);
    for (const c of this.coinParticles) {
      g.globalAlpha = clamp(c.life / 0.5, 0, 1);
      drawObjectSprite(g, 'coin', c.x - 4, c.y - 4, 1, c.frame + coinTick);
    }
    g.globalAlpha = 1;

    // Firework rockets & starbursts
    for (const r of this.fireworkRockets) {
      if (r.delay > 0) continue;
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(r.x), Math.round(r.y), 2, 4);
      g.fillStyle = r.colors[0];
      g.fillRect(Math.round(r.x), Math.round(r.y + 4), 2, 3);
    }
    for (const s of this.fireworkSparks) {
      g.globalAlpha = clamp(s.life / s.maxLife, 0, 1);
      g.fillStyle = s.color;
      g.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
    }
    g.globalAlpha = 1;

    if (this.ambientFlash > 0.01) {
      g.fillStyle = `rgba(168, 85, 247, ${(this.ambientFlash * 0.24).toFixed(3)})`;
      g.fillRect(0, 0, WORLD_W, WORLD_H);
    }
  }

  // ==========================================================================
  // LAYER 2: HiDPI Razor-Sharp Live Computer Monitors & Terminals
  // ==========================================================================

  _renderCrispMonitorScreens(ctx, isNight) {
    const s = this.scale;
    const c = this._getCanvasI18n();
    const isEn = this.locale === 'en';
    const blinkCursor = Math.floor(this.time * 2.8) % 2 === 0;

    for (const fm of this._frameMonitors) {
      const { worker, desk, screenRect, isActive, sceneStyle } = fm;
      const sx = this.offsetX + screenRect.x * s;
      const sy = this.offsetY + screenRect.y * s;
      const sw = screenRect.w * s;
      const sh = screenRect.h * s;

      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();

      if (!worker) {
        // Empty desk standby prompt
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.font = `700 ${Math.max(8, Math.round(4.6 * s))}px Consolas, "Microsoft JhengHei", monospace`;
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(desk.label, sx + sw / 2, sy + sh * 0.36);
        ctx.font = `600 ${Math.max(7, Math.round(4.0 * s))}px Consolas, "Microsoft JhengHei", monospace`;
        ctx.fillStyle = '#38bdf8';
        const idleDeskText =
          sceneStyle === 'guild'
            ? c.guildIdleDesk
            : sceneStyle === 'launchpad'
              ? c.launchpadIdleDesk
              : c.factoryIdleDesk;
        ctx.fillText(idleDeskText, sx + sw / 2, sy + sh * 0.68, sw - 4 * s);
        ctx.restore();
        continue;
      }

      const locW = this._localizeWorker(worker);
      const ms = getWorkerModelStyle(worker, locW.providerLabel);
      const isCli = sceneStyle === 'guild' || worker.cliTimer > 0;
      const pct = Math.round(worker.busy || worker.cliTimer > 0 ? worker.taskProgress || 42 : 0);

      // Dark glass terminal background
      ctx.fillStyle = isActive ? '#061114' : '#0b1220';
      ctx.fillRect(sx, sy, sw, sh);

      // Header bar inside monitor (Model Badge + %)
      ctx.fillStyle = ms.bg;
      ctx.fillRect(sx, sy, sw, 6.2 * s);
      ctx.fillStyle = ms.border;
      ctx.fillRect(sx, sy + 6.2 * s, sw, Math.max(1, 0.7 * s));

      const hdrFont = Math.max(7, Math.round(4.3 * s));
      ctx.font = `700 ${hdrFont}px Consolas, "Noto Sans TC", monospace`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillStyle = ms.text;
      ctx.fillText(truncateText(ms.short, 11), sx + 1.8 * s, sy + 0.9 * s, sw * 0.68);

      ctx.textAlign = 'right';
      ctx.fillStyle = isActive ? '#4ade80' : '#94a3b8';
      ctx.fillText(isActive ? `${pct}%` : c.monitorIdle, sx + sw - 1.5 * s, sy + 0.9 * s);

      // Live Terminal Lines
      const bodyFont = Math.max(7, Math.round(4.3 * s));
      ctx.font = `600 ${bodyFont}px Consolas, "Microsoft JhengHei", monospace`;
      ctx.textAlign = 'left';

      if (isActive) {
        const linePool = isCli ? CLI_TERMINAL_LINES : API_TERMINAL_LINES;
        const set = linePool[(desk.id + Math.floor(this.time * 0.45)) % linePool.length];
        const liveTask =
          worker.rawTask ||
          (worker.taskId ? (this.state.tasks || []).find((t) => t.id === worker.taskId) : null);
        const locTaskTitle = liveTask ? this._localizeTask(liveTask).title : worker.taskTitle;
        const featuredLoc = this._localizeProject(this._getFeaturedProject());
        const titleLine = locTaskTitle
          ? truncateText(locTaskTitle, isEn ? 17 : 13)
          : sceneStyle === 'launchpad'
            ? truncateText(featuredLoc.shortName || featuredLoc.name || c.launchpadCmdFallback, isEn ? 17 : 13)
            : set[0];
        const cmdLine = worker.cliTimer > 0 && worker.cliMessage ? worker.cliMessage : set[1];

        ctx.fillStyle = '#fef08a';
        ctx.fillText(truncateText(titleLine, isEn ? 18 : 14), sx + 1.8 * s, sy + 8.0 * s, sw - 3.6 * s);

        ctx.fillStyle = isCli ? '#86efac' : '#a5f3fc';
        ctx.fillText(
          truncateText(cmdLine, 17) + (blinkCursor ? '_' : ''),
          sx + 1.8 * s,
          sy + 14.2 * s,
          sw - 3.6 * s
        );

        // Crisp Live Green/Cyan Progress Bar at bottom of screen
        const barX = sx + 2 * s;
        const barY = sy + 21.6 * s;
        const barW = sw - 4 * s;
        const barH = 3.8 * s;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = isCli ? '#f59e0b' : '#22c55e';
        ctx.fillRect(barX, barY, Math.round((barW * clamp(pct, 10, 100)) / 100), barH);
      } else {
        // Standby readable screen
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(c.monitorStandbyReady, sx + 2 * s, sy + 8.8 * s, sw - 4 * s);
        ctx.fillStyle = '#38bdf8';
        const quotaTxt =
          worker.track === 'api'
            ? `CAP ${Math.round((worker.dailyTokenCap || 500000) / 1000)}K`
            : `LV.${worker.level} · BYOT`;
        ctx.fillText(quotaTxt + (blinkCursor ? '_' : ''), sx + 2 * s, sy + 15.6 * s, sw - 4 * s);
      }

      ctx.restore();
    }
  }

  // ==========================================================================
  // LAYER 2: Scene-Specific HiDPI HUDs, Dashboards & Labels
  // ==========================================================================

  _renderSceneCrispHUD(ctx, isNight) {
    const s = this.scale;
    const dpr = this.dpr;
    const c = this._getCanvasI18n();
    const isEn = this.locale === 'en';
    const wx = (x) => this.offsetX + x * s;
    const wy = (y) => this.offsetY + y * s;

    if (this.scene === 'factory') {
      // Wall API Throughput Dashboard text
      const openApi = (this.state.tasks || []).filter((t) => t.track === 'api_auto' && t.status === 'open').length;
      const doneApi = (this.state.tasks || []).filter(
        (t) => t.track === 'api_auto' && (t.status === 'completed' || t.status === 'accepted')
      ).length;
      ctx.save();
      ctx.font = `700 ${Math.max(8, Math.round(4.8 * s))}px Consolas, "Microsoft JhengHei", monospace`;
      ctx.fillStyle = '#67e8f9';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(c.factoryThroughput, wx(115), wy(11), 106 * s);
      ctx.font = `700 ${Math.max(7.5, Math.round(4.4 * s))}px Consolas, "Microsoft JhengHei", monospace`;
      ctx.fillStyle = '#4ade80';
      const queueText = c.factoryOpenDoneTpl
        ? fmtTpl(c.factoryOpenDoneTpl, { open: openApi, done: doneApi })
        : `${c.factoryQueueOpen} ${openApi} · ${c.factoryQueueDone} ${doneApi}`;
      ctx.fillText(queueText, wx(115), wy(19.5), 106 * s);

      // Center Marquee Sign
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.max(9, Math.round(5.4 * s))}px "Microsoft JhengHei", Consolas, monospace`;
      ctx.fillStyle = '#a5f3fc';
      ctx.fillText(c.factoryTitle, wx(294), wy(22), 108 * s);
      const autoOn = Boolean(this.state.player?.autoPilotEnabled);
      ctx.font = `700 ${Math.max(7.5, Math.round(4.2 * s))}px Consolas, "Microsoft JhengHei", monospace`;
      ctx.fillStyle = autoOn ? '#4ade80' : '#fde047';
      ctx.fillText(autoOn ? c.factoryAutoOn : c.factoryByokReady, wx(294), wy(34), 108 * s);
      ctx.restore();

      // API Energy Core badge below pedestal
      const apiW = this._getApiWorkers();
      const totalUsedK = Math.round(apiW.reduce((sum, w) => sum + (w.usedTokensToday || 0), 0) / 1000);
      const totalCapK = Math.max(1, Math.round(apiW.reduce((sum, w) => sum + (w.dailyTokenCap || 500000), 0) / 1000));
      this._drawPill(
        ctx,
        wx(240),
        wy(214),
        `${c.factoryCoreLoad} ${totalUsedK}K/${totalCapK}K`,
        'rgba(8, 20, 38, 0.92)',
        '#22d3ee',
        8.6 * dpr,
        '#a5f3fc'
      );
    } else if (this.scene === 'guild') {
      // Guild Hall Plaque
      const openGuild = (this.state.tasks || []).filter(
        (t) => (t.track === 'guild_bounty' || t.track === 'quota') && t.status !== 'completed' && t.status !== 'accepted'
      );
      const bountyPool = openGuild.reduce((sum, t) => sum + Number(t.cashBountyUsd ?? 0), 0);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.max(8.5, Math.round(4.9 * s))}px "Microsoft JhengHei", Consolas, monospace`;
      ctx.fillStyle = '#fde68a';
      ctx.fillText(c.guildTitle, wx(297), wy(22), 90 * s);
      ctx.font = `700 ${Math.max(7.5, Math.round(4.1 * s))}px Consolas, "Microsoft JhengHei", monospace`;
      ctx.fillStyle = '#4ade80';
      const poolText = c.guildPoolSummaryTpl
        ? fmtTpl(c.guildPoolSummaryTpl, { pool: bountyPool, open: openGuild.length })
        : `${c.guildPool} $${bountyPool} · ${openGuild.length} ${c.guildOpenUnit}`;
      ctx.fillText(poolText, wx(297), wy(33), 90 * s);
      ctx.restore();

      // Bounty Board Caption or Hovered Bounty Scroll Tooltip
      if (this.hoveredBountyTaskId) {
        const hit = this._frameBountyRects.find((r) => r.task.id === this.hoveredBountyTaskId);
        if (hit) {
          const rewardTag = hit.task.cashBountyUsd > 0 ? `$${hit.task.cashBountyUsd} · ` : '';
          const locTask = this._localizeTask(hit.task);
          this._drawPill(
            ctx,
            wx(188),
            wy(62),
            `📜 ${rewardTag}${truncateText(locTask.title, isEn ? 24 : 18)} (${c.guildClickClaim})`,
            '#1c120b',
            '#fde047',
            8.6 * dpr,
            '#fef08a'
          );
        }
      } else {
        this._drawPill(
          ctx,
          wx(188),
          wy(58),
          c.guildBoardTitle,
          'rgba(28, 18, 11, 0.90)',
          '#f59e0b',
          7.6 * dpr,
          '#fde68a'
        );
      }
    } else if (this.scene === 'launchpad') {
      // Scrolling Pixel Neon Billboard Text
      const ticker = this._getBillboardTicker();
      ctx.save();
      ctx.beginPath();
      ctx.rect(wx(148), wy(10), 184 * s, 34 * s);
      ctx.clip();

      ctx.font = `700 ${Math.max(7.5, Math.round(4.2 * s))}px Consolas, "Microsoft JhengHei", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = ticker.isSponsored ? '#f472b6' : '#38bdf8';
      ctx.fillText(
        ticker.isSponsored ? c.launchpadSponsored : c.launchpadTitle,
        wx(240),
        wy(12),
        180 * s
      );

      ctx.font = `700 ${Math.max(8.5, Math.round(5.0 * s))}px "Microsoft JhengHei", Consolas, monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const tw = Math.max(160 * s, ctx.measureText(ticker.text).width);
      const offsetPx = ((this.marqueeOffset * s) % tw);
      const scrollX = wx(150) - offsetPx;
      ctx.fillStyle = ticker.isSponsored ? '#fef08a' : '#a5f3fc';
      ctx.fillText(ticker.text, scrollX, wy(31));
      ctx.fillText(ticker.text, scrollX + tw, wy(31));
      ctx.restore();

      // Kanban Board Label
      this._drawPill(
        ctx,
        wx(62),
        wy(68),
        c.launchpadKanban,
        'rgba(15, 10, 36, 0.92)',
        '#a855f7',
        7.5 * dpr,
        '#e9d5ff'
      );

      // Featured Hologram Project Nameplate & LED Progress Bar
      const featured = this._getFeaturedProject();
      const locFeatured = this._localizeProject(featured);
      const pct = clamp(Number(featured.progressPct ?? 0), 0, 100);
      const isLaunched = featured.status === 'launched' || pct >= 100;
      this._drawPill(
        ctx,
        wx(240),
        wy(234),
        `${isLaunched ? c.launchpadLaunched : c.launchpadProgress} · ${truncateText(locFeatured.shortName || locFeatured.name, isEn ? 18 : 14)} ${pct}%`,
        'rgba(15, 10, 36, 0.94)',
        isLaunched ? '#4ade80' : '#a855f7',
        9.0 * dpr,
        isLaunched ? '#86efac' : '#e9d5ff'
      );

      // Community Vote Pillar Labels
      for (const vp of this._frameVotePillars) {
        const p = vp.project;
        const lp = this._localizeProject(p);
        const pShort = truncateText(lp.shortName || lp.name, isEn ? 13 : 9);
        const label =
          p.status === 'voting'
            ? `🗳️ ${pShort} ${p.votes}/${p.votesRequired}`
            : `✅ ${pShort} ${p.progressPct ?? 0}%`;
        this._drawPill(
          ctx,
          wx(vp.x + vp.w / 2),
          wy(vp.y - 10),
          label,
          'rgba(17, 12, 34, 0.90)',
          p.status === 'voting' ? '#f472b6' : '#22d3ee',
          8.0 * dpr,
          '#f8fafc'
        );
      }
      if (this._frameVotePillars.some((vp) => vp.project.status === 'voting')) {
        this._drawPill(
          ctx,
          wx(240),
          wy(78),
          c.launchpadVoteTitle,
          'rgba(24, 12, 42, 0.88)',
          '#f472b6',
          7.4 * dpr,
          '#fbcfe8'
        );
      }
    } else if (this.scene === 'lounge') {
      // Lounge Room Banner on Bookshelf Wall
      this._drawPill(
        ctx,
        wx(405),
        wy(56),
        c.loungeTitle,
        'rgba(24, 16, 36, 0.92)',
        '#a855f7',
        7.8 * dpr,
        '#e9d5ff'
      );
      // Achievement Trophy Case Caption
      const trophyText = c.loungeTrophyCaseTpl
        ? fmtTpl(c.loungeTrophyCaseTpl, { unlocked: this.unlockedAchievements })
        : `${c.loungeTrophyCase} ${this.unlockedAchievements}/6`;
      this._drawPill(
        ctx,
        wx(236),
        wy(50),
        trophyText,
        'rgba(24, 16, 36, 0.92)',
        '#fde047',
        8.2 * dpr,
        '#fef08a'
      );
      const hasGoldCoffee = this._hasDecor('decor-gold-coffee', 'decor-espresso', 'espresso', 'coffee');
      this._drawPill(
        ctx,
        wx(54),
        wy(72),
        hasGoldCoffee ? c.loungeGoldCoffeeBar : c.loungeCoffeeBar,
        'rgba(24, 16, 36, 0.88)',
        hasGoldCoffee ? '#fde047' : '#f472b6',
        7.8 * dpr,
        hasGoldCoffee ? '#fef08a' : '#fbcfe8'
      );
    } else if (this.scene === 'vault') {
      // Vault Wing Signs on Marble Wall
      this._drawPill(
        ctx,
        wx(98),
        wy(38),
        c.vaultTitle,
        'rgba(14, 10, 20, 0.92)',
        '#f59e0b',
        8.0 * dpr,
        '#fde68a'
      );
      this._drawPill(
        ctx,
        wx(382),
        wy(38),
        c.vaultPodiumTitle,
        'rgba(14, 10, 20, 0.92)',
        '#fde047',
        8.0 * dpr,
        '#fef08a'
      );

      // Total Revenue LED Display above/below Gold Mountain
      const rev = this.state.founderRevenue || {};
      const totalUsd = Number(rev.totalUsd ?? 0);
      const totalRevText = c.vaultTotalRevTpl
        ? fmtTpl(c.vaultTotalRevTpl, { amount: formatUsd(totalUsd) })
        : `${c.vaultTotalRevenue} ${formatUsd(totalUsd)}`;
      this._drawPill(
        ctx,
        wx(240),
        wy(94),
        totalRevText,
        'rgba(14, 10, 20, 0.95)',
        '#fde047',
        9.4 * dpr,
        '#fef08a'
      );

      // 4 Dynamic Revenue Pillar Labels & Live USD Values
      const streams = [
        { label: c.vaultStreamBounty, val: Number(rev.bountyFeesUsd ?? 0), color: '#fde047' },
        { label: c.vaultStreamCarry, val: Number(rev.incubationCarryUsd ?? 0), color: '#e9d5ff' },
        { label: c.vaultStreamAds, val: Number(rev.billboardAdsUsd ?? 0), color: '#fbcfe8' },
        { label: c.vaultStreamPro, val: Number(rev.proSkinsUsd ?? 0), color: '#a5f3fc' },
      ];
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      streams.forEach((st, idx) => {
        const cx = 36 + idx * 40;
        ctx.font = `700 ${Math.max(8, Math.round(4.8 * s))}px Consolas, monospace`;
        ctx.fillStyle = st.color;
        ctx.fillText(formatUsd(st.val), wx(cx), wy(130));
        ctx.font = `700 ${Math.max(7.2, Math.round(4.1 * s))}px "Microsoft JhengHei", Consolas, monospace`;
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(st.label, wx(cx), wy(258), 38 * s);
      });
      ctx.restore();

      // Top 3 Leaderboard Podium Champion Nameplates & Points
      const lb = [...(this.state.leaderboard || [])]
        .sort((a, b) => Number(b.contributionPoints ?? 0) - Number(a.contributionPoints ?? 0))
        .slice(0, 3);
      const podMeta = [
        { rank: 2, entry: lb[1], x: 326, y: 242, border: '#cbd5e1', tag: '🥈' },
        { rank: 1, entry: lb[0], x: 382, y: 224, border: '#fde047', tag: '👑' },
        { rank: 3, entry: lb[2], x: 438, y: 250, border: '#fbbf24', tag: '🥉' },
      ];
      for (const pm of podMeta) {
        if (!pm.entry) continue;
        const locEntry = this._localizeLeaderboardEntry(pm.entry);
        const nm = formatWorkerNameplate(locEntry.displayName, this.locale, c.workerFallback, isEn ? 8 : 6);
        this._drawPill(
          ctx,
          wx(pm.x),
          wy(pm.y),
          `${pm.tag}${nm}`,
          'rgba(12, 10, 20, 0.92)',
          pm.border,
          7.6 * dpr,
          '#f8fafc'
        );
        ctx.save();
        ctx.font = `700 ${Math.max(7, Math.round(4.2 * s))}px Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = pm.border;
        ctx.fillText(`${pm.entry.contributionPoints ?? 0}pt`, wx(pm.x), wy(pm.y + 13));
        ctx.restore();
      }
    } else if (this.scene === 'town') {
      // Crisp Building Plaques & Subtitles on Town Overview
      for (const b of Object.values(TOWN_BUILDINGS)) {
        const isHover = this.hoveredBuildingId === b.id;
        const bText = c.buildings[b.id] || { label: b.label, subtitle: b.subtitle };
        this._drawPill(
          ctx,
          wx(b.x + b.w / 2),
          wy(b.y + 11),
          bText.label,
          isHover ? '#1e1b4b' : 'rgba(9, 13, 26, 0.92)',
          isHover ? '#fde047' : b.accent,
          8.4 * dpr,
          isHover ? '#fef08a' : '#f8fafc'
        );
        if (bText.subtitle) {
          this._drawPill(
            ctx,
            wx(b.x + b.w / 2),
            wy(b.y + b.h - 6),
            bText.subtitle,
            'rgba(9, 13, 26, 0.84)',
            isHover ? '#fde047' : 'rgba(148, 163, 184, 0.45)',
            6.5 * dpr,
            isHover ? '#fef08a' : '#cbd5e1'
          );
        }
      }

      // Crisp Billboard Ticker on Central Plaza
      const ticker = this._getBillboardTicker();
      ctx.save();
      ctx.beginPath();
      ctx.rect(wx(188), wy(106), 104 * s, 26 * s);
      ctx.clip();
      ctx.font = `700 ${Math.max(7, Math.round(4.0 * s))}px Consolas, "Microsoft JhengHei", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = ticker.isSponsored ? '#f472b6' : '#38bdf8';
      ctx.fillText(ticker.isSponsored ? c.townSponsored : c.townPlaza, wx(240), wy(108), 100 * s);

      ctx.font = `700 ${Math.max(7.5, Math.round(4.4 * s))}px "Microsoft JhengHei", Consolas, monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const tw = Math.max(110 * s, ctx.measureText(ticker.text).width);
      const sx = wx(190) - ((this.marqueeOffset * s) % tw);
      ctx.fillStyle = ticker.isSponsored ? '#fef08a' : '#67e8f9';
      ctx.fillText(ticker.text, sx, wy(124));
      ctx.fillText(ticker.text, sx + tw, wy(124));
      ctx.restore();
    }
  }

  // ==========================================================================
  // LAYER 2: Crisp Worker Nameplates, Model Badges & Speech Bubbles
  // ==========================================================================

  _renderCrispWorkerNameplates(ctx, isNight) {
    const s = this.scale;
    const dpr = this.dpr;
    const c = this._getCanvasI18n();
    const sorted = [...this._frameWorkers].sort((a, b) => a.y - b.y);

    for (const fw of sorted) {
      const a = fw.agent;
      const meta = WORKER_ROLE_META[a.roleClass] || WORKER_ROLE_META.flash_worker;
      const locW = this._localizeWorker(a);
      const ms = getWorkerModelStyle(a, locW.providerLabel);
      const isFocus = a.id === this.selectedWorkerId || a.id === this.hoveredWorkerId;
      const sx = this.offsetX + fw.x * s;
      const sy = this.offsetY + fw.y * s;

      // 1. Crisp Name Pill below feet
      const shortName = formatWorkerNameplate(locW.name, this.locale, c.workerFallback);
      this._drawPill(
        ctx,
        sx,
        sy + 6.5 * s,
        shortName,
        isFocus ? '#1e1b4b' : isNight ? 'rgba(9, 13, 26, 0.90)' : 'rgba(15, 23, 42, 0.88)',
        isFocus ? '#fde047' : a.busy || a.cliTimer > 0 ? meta.accent : '#475569',
        8.6 * dpr,
        isFocus ? '#fef08a' : '#f8fafc'
      );

      // 2. Color-Coded Model Badge below Nameplate (in indoor HD scenes)
      if (!fw.hideBadge) {
        this._drawPill(
          ctx,
          sx,
          sy + 15.8 * s,
          ms.short,
          ms.bg,
          ms.border,
          7.4 * dpr,
          ms.text
        );
      }

      // 3. Crisp Speech Bubble when active
      if (a.bubbleTimer > 0 && a.bubbleText) {
        this._drawSpeechBubbleHiDPI(ctx, sx, sy - 35 * fw.scale * s, a.bubbleText, a.bubbleStyle, 8.6 * dpr);
      }
    }
  }

  _renderCrispFloatingTextsAndBanner(ctx) {
    const s = this.scale;
    const dpr = this.dpr;

    // Floating reward texts (+120G, +35 pts, +$36.00)
    ctx.save();
    ctx.font = `900 ${Math.round(11 * dpr)}px "Microsoft JhengHei", Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = clamp(ft.life / 0.7, 0, 1);
      const fx = this.offsetX + ft.x * s;
      const fy = this.offsetY + ft.y * s;
      ctx.lineWidth = Math.max(2, 2.5 * dpr);
      ctx.strokeStyle = '#090d1a';
      ctx.strokeText(ft.text, fx, fy);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, fx, fy);
    }
    ctx.restore();

    // Launch Celebration Banner
    if (this.launchBannerTimer > 0 && this.launchBannerText) {
      ctx.save();
      ctx.globalAlpha = clamp(this.launchBannerTimer, 0, 1);
      const borderCol = Math.floor(this.time * 6) % 2 === 0 ? '#fde047' : '#f472b6';
      this._drawPill(
        ctx,
        this.offsetX + (WORLD_W / 2) * s,
        this.offsetY + 26 * s,
        this.launchBannerText,
        'rgba(15, 23, 42, 0.96)',
        borderCol,
        11 * dpr,
        '#fef08a'
      );
      ctx.restore();
    }
  }

  _renderHoverInspectorCard(ctx, isNight) {
    if (!this.hoveredWorkerId) return;
    const a = this.agents.get(this.hoveredWorkerId);
    if (!a) return;

    const s = this.scale;
    const dpr = this.dpr;
    const c = this._getCanvasI18n();
    const meta = WORKER_ROLE_META[a.roleClass] || WORKER_ROLE_META.flash_worker;
    const locW = this._localizeWorker(a);
    const staminaPct = clamp(Math.round((a.stamina / Math.max(1, a.maxStamina)) * 100), 0, 100);
    const statusText =
      a.cliTimer > 0
        ? c.statusCli
        : a.busy
          ? c.statusWorking
          : a.celebrateTimer > 0
            ? c.statusCelebrating
            : c.statusIdle;

    const cardW = Math.min(this.viewRect.w - 20, Math.round(256 * s));
    const cardH = Math.round(32 * s);
    const cx = this.offsetX + Math.round((this.viewRect.w - cardW) / 2);
    const cy = this.offsetY + Math.round(5 * s);

    ctx.save();
    ctx.fillStyle = isNight ? 'rgba(9, 13, 26, 0.94)' : 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(cx, cy, cardW, cardH);
    ctx.strokeStyle = meta.accent;
    ctx.lineWidth = Math.max(1.5, 1.2 * dpr);
    ctx.strokeRect(cx, cy, cardW, cardH);

    // Line 1
    ctx.font = `700 ${Math.round(9.5 * dpr)}px "Microsoft JhengHei", Consolas, monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#f8fafc';
    const workerLabel = formatWorkerNameplate(locW.name, this.locale, c.workerFallback);
    const cleanRole = String(locW.roleName || '').replace(/^[^\p{L}\p{N}]+\s*/u, '');
    ctx.fillText(
      `${meta.badge} ${workerLabel} · ${cleanRole || locW.roleName}`,
      cx + 8 * dpr,
      cy + 4 * dpr,
      cardW - 52 * dpr
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`LV.${a.level}`, cx + cardW - 8 * dpr, cy + 4 * dpr);

    // Line 2
    ctx.font = `600 ${Math.round(8.2 * dpr)}px "Microsoft JhengHei", Consolas, monospace`;
    ctx.textAlign = 'left';
    ctx.fillStyle = a.busy || a.cliTimer > 0 ? '#4ade80' : '#94a3b8';
    ctx.fillText(statusText, cx + 8 * dpr, cy + 17 * dpr);

    // Stamina Bar
    const barW = Math.round(58 * dpr);
    const barH = Math.round(6 * dpr);
    const barX = cx + cardW - barW - 8 * dpr;
    const barY = cy + 18 * dpr;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#cbd5e1';
    const staText = c.staminaTpl ? fmtTpl(c.staminaTpl, { pct: staminaPct }) : `${c.staminaLabel} ${staminaPct}%`;
    ctx.fillText(staText, barX - 5 * dpr, cy + 17 * dpr);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = staminaPct >= 50 ? '#22c55e' : staminaPct >= 25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(barX + 1, barY + 1, Math.round(((barW - 2) * staminaPct) / 100), barH - 2);
    ctx.restore();
  }

  _drawPill(ctx, cx, cy, text, bg, border, fontSize, textColor = '#f8fafc') {
    ctx.save();
    const fs = Math.max(8, Math.round(fontSize));
    ctx.font = `700 ${fs}px "Microsoft JhengHei", Consolas, monospace`;
    const m = ctx.measureText(text);
    const padX = Math.round(fs * 0.52);
    const h = Math.round(fs * 1.48);
    const w = Math.ceil(m.width) + padX * 2;
    const x = Math.round(clamp(cx - w / 2, this.offsetX + 2, this.offsetX + this.viewRect.w - w - 2));
    const y = Math.round(clamp(cy - h / 2, this.offsetY + 2, this.offsetY + this.viewRect.h - h - 2));

    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(1.2, fs / 7.5);
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
    ctx.restore();
  }

  _drawSpeechBubbleHiDPI(ctx, cx, cy, text, style, fontSize) {
    ctx.save();
    const fs = Math.max(8.5, Math.round(fontSize));
    ctx.font = `700 ${fs}px "Microsoft JhengHei", Consolas, monospace`;
    const m = ctx.measureText(text);
    const padX = Math.round(fs * 0.6);
    const h = Math.round(fs * 1.65);
    const w = Math.min(Math.round(this.viewRect.w * 0.45), Math.ceil(m.width) + padX * 2);
    const x = Math.round(clamp(cx - w / 2, this.offsetX + 4, this.offsetX + this.viewRect.w - w - 4));
    const y = Math.round(clamp(cy - h, this.offsetY + 4, this.offsetY + this.viewRect.h - h - 4));

    let bg = '#0f172a';
    let border = '#38bdf8';
    let fg = '#f8fafc';
    if (style === 'cli') {
      bg = '#052e16';
      border = '#4ade80';
      fg = '#86efac';
    } else if (style === 'success') {
      bg = '#1e1b4b';
      border = '#fde047';
      fg = '#fef08a';
    } else if (style === 'dispatch') {
      bg = '#172554';
      border = '#22d3ee';
      fg = '#a5f3fc';
    }

    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(1.4, fs / 6.5);
    ctx.strokeRect(x, y, w, h);

    // Little pointer tail
    const tx = clamp(Math.round(cx), x + 8, x + w - 8);
    ctx.fillStyle = bg;
    ctx.fillRect(tx - 3, y + h, 6, 4);
    ctx.fillStyle = border;
    ctx.fillRect(tx - 3, y + h + 3, 6, 1.5);

    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + 0.5, w - padX);
    ctx.restore();
  }
}
