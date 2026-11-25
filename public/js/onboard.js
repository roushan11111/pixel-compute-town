/**
 * PixelCompute Town v1.0 — Device Registration & Approval Page (/onboard)
 * - Trilingual real-time switcher (zh-TW / zh-CN / en) synced via `pct_locale`
 * - Reads `?code=PCT-XXXX-XX`; auto-creates a live preview code when `?demo=1` or missing code
 * - Displays device metadata, detected local CLI tools, and Zero-Trust permission audit checklist
 * - 3-step approval:
 *     Step 1: Email/Password register & login, GitHub/Google OAuth, or Demo founder fast bind
 *     Step 2: 32x32 HD pixel worker selector with live `renderWorkerPortrait` preview + nickname
 *     Step 3: Approve device via POST /api/device/approve (supports instant approved & strict pending_review)
 */

import { renderWorkerPortrait, WORKER_ROLE_META } from '/js/sprites.js';

const LOCALE_KEY = 'pct_locale';
const LEGACY_LOCALE_KEY = 'pixel_compute_town_lang_v1';
const VALID_LOCALES = ['zh-TW', 'zh-CN', 'en'];

const ROLE_ORDER = ['pro_architect', 'flash_worker', 'guild_artisan', 'pixel_artist'];

// ============================================================================
// 1. TRILINGUAL DICTIONARY (zh-TW / zh-CN / en)
// ============================================================================

const I18N = {
  'zh-TW': {
    'meta.title': '裝置註冊與安全審核 — 像素算力鎮 PixelCompute Town',
    'brand.name': '像素算力鎮',
    'brand.sub': 'Zero-Trust 本機算力裝置註冊與審核中心',
    'nav.home': '🏠 返回官網',
    'nav.enterApp': '🚀 進入小鎮',
    'demo.banner':
      '目前為「互動預覽模式（Demo）」：系統已自動建立一筆真實可用的裝置授權碼，您可完整體驗 3 步綁定與審核流程！',
    'device.eyebrow': 'INCOMING LOCAL WORKER DEVICE',
    'device.title': '🛡️ 確認並核准本機算力小人裝置',
    'device.codeLabel': '裝置授權碼',
    'device.nameLabel': '裝置名稱',
    'device.osLabel': '作業系統',
    'device.cliLabel': '偵測到的本機官方 CLI 工具',
    'device.detecting': '偵測中...',
    'device.noCli': '未偵測到官方 CLI（仍可執行像素心跳）',
    'status.pending': '⏳ 等待核准',
    'status.pending_review': '🛡️ 待鎮長審核',
    'status.approved': '✅ 已核准上線',
    'status.rejected': '⛔ 已拒絕',
    'status.expired': '⌛ 已過期',
    'audit.title': '零信任安全權限審核清單（Zero-Trust Permission Audit）',
    'audit.item1': '✅ 僅於本機 ~/.pixelcompute/ 儲存裝置憑證與心跳設定，不修改任何專案源碼。',
    'audit.item2': '✅ 絕不讀取瀏覽器 Cookie、AI 訂閱帳密或系統環境變數內的 API Key。',
    'audit.item3': '✅ 僅傳送任務狀態心跳（任務名稱、進度百分比、工位動畫）回像素算力鎮。',
    'audit.item4': '✅ 您隨時可於 /app 控制台解除綁定或由鎮長啟用「嚴格防刷人工審核」。',
    'step1.title': '確認或建立您的小鎮帳號',
    'step1.desc': '裝置綁定後的算力貢獻點數與 60% 項目分紅將直接記入此帳號。',
    'step1.logoutBtn': '登出切換',
    'step1.tabRegister': '✨ 免費信箱註冊',
    'step1.tabLogin': '🔑 已有帳號登入',
    'step1.nameLabel': '鎮長暱稱',
    'step1.namePlaceholder': '例如：CyberBuilder',
    'step1.demoDisplayName': '創始鎮長 (Demo)',
    'step1.emailLabel': '電子信箱',
    'step1.passwordLabel': '密碼（至少 6 字元）',
    'step1.registerSubmit': '✨ 立即註冊並使用此帳號',
    'step1.loginSubmit': '🔑 登入此帳號',
    'step1.orDivider': '或使用第三方／快速模式',
    'step1.githubBtn': '🐙 GitHub 登入',
    'step1.googleBtn': '🌐 Google 登入',
    'step1.demoFastBtn': '⚡ Demo 創始帳號快速綁定',
    'step1.modeDemo': '創始 Demo 模式',
    'step1.modeLive': '正式已驗證帳號',
    'step1.subDemo': '可直接點擊下方「Demo 創始帳號快速綁定」，或註冊您的專屬信箱帳號。',
    'step1.subLive': '已登入正式帳號，裝置核准後將直接歸屬至您的個人小鎮空間。',
    'step2.title': '挑選本機裝置的 32×32 HD 像素小人化身',
    'step2.desc': '您的本機終端將化身這位像素小人進駐小鎮工位，即時敲碼直播心跳。',
    'step2.nicknameLabel': '自訂像素小人暱稱',
    'step2.nicknamePlaceholder': '例如：本機架構師 Pro-01',
    'step3.title': '最終核准與裝置綁定',
    'step3.desc': '確認上方權限清單、帳號與像素小人無誤後，點擊下方按鈕完成核准。',
    'step3.sumAccount': '綁定帳號',
    'step3.sumDevice': '本機裝置',
    'step3.sumWorker': '像素小人',
    'step3.approveBtn': '✅ 核准並綁定此裝置',
    'step3.approving': '⏳ 正在核准綁定...',
    'result.approvedTitle': '🎉 綁定核准成功！本機終端已同步上線',
    'result.approvedDesc':
      '您的本機協作器已取得安全授權憑證，32×32 HD 像素小人已經進駐小鎮工位準備接單打工！',
    'result.reviewTitle': '⏳ 已提交鎮長人工審核（嚴格防刷模式）',
    'result.reviewDesc':
      '目前小鎮已開啟嚴格防刷審核機制。您的裝置申請已排入審核佇列，鎮長在 /app「創作者收益 → 鎮長管理面板」按下核准後本機終端將自動同步上線！',
    'result.rejectedTitle': '⛔ 此裝置授權申請已被拒絕',
    'result.rejectedDesc': '如需重新綁定，請於本機重新執行 pixel-worker onboard 產生新授權碼。',
    'result.enterTownBtn': '🚀 立即進入像素算力鎮（/app）',
    'result.recheckBtn': '🔄 重新檢查鎮長審核狀態',
    'toast.authOk': '✅ 帳號登入完成！已自動套用到綁定步驟',
    'toast.demoOk': '⚡ 已切換至 Demo 創始帳號，可直接核准綁定！',
    'toast.logoutOk': '👋 已登出目前帳號',
    'toast.approved': '🎉 裝置綁定核准成功！',
    'toast.pendingReview': '🛡️ 已送出至鎮長審核佇列！',
    'toast.langSwitched': '🌐 語系已切換為：繁體中文',
    'role.flash_worker.name': '閃電機甲貓',
    'role.flash_worker.track': 'API 自動工坊 · BYOK',
    'role.flash_worker.desc': '青藍光盾耳機＋發光護目鏡，極速處理微任務流水線與自動化測試。',
    'role.pro_architect.name': '紫金貓頭鷹架構師',
    'role.pro_architect.track': 'CLI 懸賞工會 · BYOT',
    'role.pro_architect.desc': '深紫星辰披風＋金邊眼鏡＋代碼符文，坐鎮本機 CLI 高難度架構大單。',
    'role.pixel_artist.name': '櫻粉像素狐狸畫師',
    'role.pixel_artist.track': 'API 創意工坊 · BYOK',
    'role.pixel_artist.desc': '櫻粉貝雷帽＋魔法像素畫筆，專精介面視覺、i18n 與像素美學交付。',
    'role.guild_artisan.name': '琥珀工會熊匠人',
    'role.guild_artisan.track': 'CLI 懸賞工會 · BYOT',
    'role.guild_artisan.desc': '金色頭帶＋機械護腕，沉穩可靠的 GitHub Issue 現金懸賞鍛造主力。',
  },

  'zh-CN': {
    'meta.title': '设备注册与安全审核 — 像素算力镇 PixelCompute Town',
    'brand.name': '像素算力镇',
    'brand.sub': 'Zero-Trust 本机算力设备注册与审核中心',
    'nav.home': '🏠 返回官网',
    'nav.enterApp': '🚀 进入小镇',
    'demo.banner':
      '当前为「互动预览模式（Demo）」：系统已自动创建一笔真实可用的设备授权码，您可完整体验 3 步绑定与审核流程！',
    'device.eyebrow': 'INCOMING LOCAL WORKER DEVICE',
    'device.title': '🛡️ 确认并批准本机算力小人设备',
    'device.codeLabel': '设备授权码',
    'device.nameLabel': '设备名称',
    'device.osLabel': '操作系统',
    'device.cliLabel': '检测到的本机官方 CLI 工具',
    'device.detecting': '检测中...',
    'device.noCli': '未检测到官方 CLI（仍可执行像素心跳）',
    'status.pending': '⏳ 等待批准',
    'status.pending_review': '🛡️ 待镇长审核',
    'status.approved': '✅ 已批准上线',
    'status.rejected': '⛔ 已拒绝',
    'status.expired': '⌛ 已过期',
    'audit.title': '零信任安全权限审核清单（Zero-Trust Permission Audit）',
    'audit.item1': '✅ 仅于本机 ~/.pixelcompute/ 保存设备凭证与心跳配置，不修改任何项目源码。',
    'audit.item2': '✅ 绝不读取浏览器 Cookie、AI 订阅账密或系统环境变量内的 API Key。',
    'audit.item3': '✅ 仅发送任务状态心跳（任务名称、进度百分比、工位动画）回像素算力镇。',
    'audit.item4': '✅ 您随时可于 /app 控制台解除绑定或由镇长启用「严格防刷人工审核」。',
    'step1.title': '确认或创建您的小镇账号',
    'step1.desc': '设备绑定后的算力贡献点数与 60% 项目分红将直接记入此账号。',
    'step1.logoutBtn': '退出切换',
    'step1.tabRegister': '✨ 免费邮箱注册',
    'step1.tabLogin': '🔑 已有账号登录',
    'step1.nameLabel': '镇长昵称',
    'step1.namePlaceholder': '例如：CyberBuilder',
    'step1.demoDisplayName': '创始镇长 (Demo)',
    'step1.emailLabel': '电子邮箱',
    'step1.passwordLabel': '密码（至少 6 位）',
    'step1.registerSubmit': '✨ 立即注册并使用此账号',
    'step1.loginSubmit': '🔑 登录此账号',
    'step1.orDivider': '或使用第三方／快速模式',
    'step1.githubBtn': '🐙 GitHub 登录',
    'step1.googleBtn': '🌐 Google 登录',
    'step1.demoFastBtn': '⚡ Demo 创始账号快速绑定',
    'step1.modeDemo': '创始 Demo 模式',
    'step1.modeLive': '正式已验证账号',
    'step1.subDemo': '可直接点击下方「Demo 创始账号快速绑定」，或注册您的专属邮箱账号。',
    'step1.subLive': '已登录正式账号，设备批准后将直接归属至您的个人小镇空间。',
    'step2.title': '挑选本机设备的 32×32 HD 像素小人化身',
    'step2.desc': '您的本机终端将化身这位像素小人进驻小镇工位，实时敲码直播心跳。',
    'step2.nicknameLabel': '自定义像素小人昵称',
    'step2.nicknamePlaceholder': '例如：本机架构师 Pro-01',
    'step3.title': '最终批准与设备绑定',
    'step3.desc': '确认上方权限清单、账号与像素小人无误后，点击下方按钮完成批准。',
    'step3.sumAccount': '绑定账号',
    'step3.sumDevice': '本机设备',
    'step3.sumWorker': '像素小人',
    'step3.approveBtn': '✅ 批准并绑定此设备',
    'step3.approving': '⏳ 正在批准绑定...',
    'result.approvedTitle': '🎉 绑定批准成功！本机终端已同步上线',
    'result.approvedDesc':
      '您的本机协作器已取得安全授权凭证，32×32 HD 像素小人已经进驻小镇工位准备接单打工！',
    'result.reviewTitle': '⏳ 已提交镇长人工审核（严格防刷模式）',
    'result.reviewDesc':
      '当前小镇已开启严格防刷审核机制。您的设备申请已排入审核队列，镇长在 /app「创作者收益 → 镇长管理面板」点击批准后本机终端将自动同步上线！',
    'result.rejectedTitle': '⛔ 此设备授权申请已被拒绝',
    'result.rejectedDesc': '如需重新绑定，请于本机重新执行 pixel-worker onboard 生成新授权码。',
    'result.enterTownBtn': '🚀 立即进入像素算力镇（/app）',
    'result.recheckBtn': '🔄 重新检查镇长审核状态',
    'toast.authOk': '✅ 账号登录完成！已自动应用到绑定步骤',
    'toast.demoOk': '⚡ 已切换至 Demo 创始账号，可直接批准绑定！',
    'toast.logoutOk': '👋 已退出当前账号',
    'toast.approved': '🎉 设备绑定批准成功！',
    'toast.pendingReview': '🛡️ 已提交至镇长审核队列！',
    'toast.langSwitched': '🌐 语言已切换为：简体中文',
    'role.flash_worker.name': '闪电甲壳猫',
    'role.flash_worker.track': 'API 自动工坊 · BYOK',
    'role.flash_worker.desc': '青蓝光盾耳机＋发光护目镜，极速处理微任务流水线与自动化测试。',
    'role.pro_architect.name': '紫金猫头鹰架构师',
    'role.pro_architect.track': 'CLI 悬赏工会 · BYOT',
    'role.pro_architect.desc': '深紫星辰披风＋金边眼镜＋代码符文，坐镇本机 CLI 高难度架构大单。',
    'role.pixel_artist.name': '樱粉像素狐狸画师',
    'role.pixel_artist.track': 'API 创意工坊 · BYOK',
    'role.pixel_artist.desc': '樱粉贝雷帽＋魔法像素画笔，专精界面视觉、i18n 与像素美学交付。',
    'role.guild_artisan.name': '琥珀工会熊匠人',
    'role.guild_artisan.track': 'CLI 悬赏工会 · BYOT',
    'role.guild_artisan.desc': '金色头带＋机械护腕，沉稳可靠的 GitHub Issue 现金悬赏锻造主力。',
  },

  en: {
    'meta.title': 'Device Registration & Approval — PixelCompute Town',
    'brand.name': 'PixelCompute Town',
    'brand.sub': 'Zero-Trust Local Worker Device Registration & Audit',
    'nav.home': '🏠 Home',
    'nav.enterApp': '🚀 Enter Town',
    'demo.banner':
      'Interactive Preview Mode (Demo): A real pairing code was generated automatically so you can experience the entire 3-step approval flow!',
    'device.eyebrow': 'INCOMING LOCAL WORKER DEVICE',
    'device.title': '🛡️ Review & Approve Local Pixel Worker Device',
    'device.codeLabel': 'PAIRING CODE',
    'device.nameLabel': 'Device Name',
    'device.osLabel': 'Operating System',
    'device.cliLabel': 'Detected Local Official CLIs',
    'device.detecting': 'Detecting...',
    'device.noCli': 'No official CLI detected (heartbeat mode still works)',
    'status.pending': '⏳ Pending Approval',
    'status.pending_review': '🛡️ Pending Mayor Review',
    'status.approved': '✅ Approved & Online',
    'status.rejected': '⛔ Rejected',
    'status.expired': '⌛ Expired',
    'audit.title': 'Zero-Trust Security Permission Audit',
    'audit.item1': '✅ Only stores device credentials inside ~/.pixelcompute/ — never alters project files.',
    'audit.item2': '✅ Never reads browser cookies, AI subscription passwords, or system API keys.',
    'audit.item3': '✅ Only streams task heartbeats (task title, progress %, workstation animation) to the town.',
    'audit.item4': '✅ Revoke anytime in /app or enable Strict Mayor Review mode against abuse.',
    'step1.title': 'Confirm or Create Your Town Account',
    'step1.desc': 'Verified contribution points and 60% project dividends from this device credit to this account.',
    'step1.logoutBtn': 'Sign Out',
    'step1.tabRegister': '✨ Free Email Sign Up',
    'step1.tabLogin': '🔑 Sign In',
    'step1.nameLabel': 'Mayor Nickname',
    'step1.namePlaceholder': 'e.g. CyberBuilder',
    'step1.demoDisplayName': 'Founding Mayor (Demo)',
    'step1.emailLabel': 'Email Address',
    'step1.passwordLabel': 'Password (6+ characters)',
    'step1.registerSubmit': '✨ Create Account & Continue',
    'step1.loginSubmit': '🔑 Sign In & Continue',
    'step1.orDivider': 'or sign in with OAuth / Quick Demo',
    'step1.githubBtn': '🐙 GitHub Login',
    'step1.googleBtn': '🌐 Google Login',
    'step1.demoFastBtn': '⚡ Fast Bind with Founder Demo Account',
    'step1.modeDemo': 'Founder Demo Session',
    'step1.modeLive': 'Verified Account',
    'step1.subDemo': 'Bind immediately with the Founder Demo account below, or register your own email account.',
    'step1.subLive': 'Signed in! Approving this device will bind the pixel worker directly to your personal town.',
    'step2.title': 'Choose Your 32×32 HD Pixel Worker Avatar',
    'step2.desc': 'Your local CLI machine will appear as this HD pixel worker typing live inside PixelCompute Town.',
    'step2.nicknameLabel': 'Custom Worker Nickname',
    'step2.nicknamePlaceholder': 'e.g. Local Architect Pro-01',
    'step3.title': 'Final Approval & Device Binding',
    'step3.desc': 'Verify the permission checklist, account, and pixel worker above, then click approve.',
    'step3.sumAccount': 'Target Account',
    'step3.sumDevice': 'Local Device',
    'step3.sumWorker': 'Pixel Worker',
    'step3.approveBtn': '✅ Approve & Bind This Device',
    'step3.approving': '⏳ Approving device...',
    'result.approvedTitle': '🎉 Device Approved! Local Terminal Is Now Online',
    'result.approvedDesc':
      'Your local CLI worker has received its secure credential and your 32×32 HD pixel worker is seated in town!',
    'result.reviewTitle': '⏳ Submitted for Mayor Manual Review (Strict Anti-Abuse Mode)',
    'result.reviewDesc':
      'Strict Device Review is currently enabled. Approve this request in /app → Creator Revenue → Mayor Admin Panel to bring the terminal online.',
    'result.rejectedTitle': '⛔ Device Pairing Request Rejected',
    'result.rejectedDesc': 'Run `pixel-worker onboard` again locally to request a fresh pairing code.',
    'result.enterTownBtn': '🚀 Launch PixelCompute Town (/app)',
    'result.recheckBtn': '🔄 Re-check Review Status',
    'toast.authOk': '✅ Account ready! Applied to device binding.',
    'toast.demoOk': '⚡ Switched to Founder Demo account—ready to approve!',
    'toast.logoutOk': '👋 Signed out.',
    'toast.approved': '🎉 Device approved and bound!',
    'toast.pendingReview': '🛡️ Submitted to Mayor Review queue!',
    'toast.langSwitched': '🌐 Language switched to: English',
    'role.flash_worker.name': 'Volt Cyber-Cat',
    'role.flash_worker.track': 'API Auto-Factory · BYOK',
    'role.flash_worker.desc': 'Cyan shield headphones & luminous visor — blazing-fast automated API micro-task runner.',
    'role.pro_architect.name': 'Sage Owl Architect',
    'role.pro_architect.track': 'CLI Bounty Guild · BYOT',
    'role.pro_architect.desc': 'Starry purple cape & gold spectacles — master of deep local CLI architecture & PR bounties.',
    'role.pixel_artist.name': 'Sakura Pixel Fox',
    'role.pixel_artist.track': 'API Creative Studio · BYOK',
    'role.pixel_artist.desc': 'Sakura beret & magic pixel brush — crafts UI, i18n packs, and crisp pixel specifications.',
    'role.guild_artisan.name': 'Forge Bear Artisan',
    'role.guild_artisan.track': 'CLI Bounty Guild · BYOT',
    'role.guild_artisan.desc': 'Golden headband & forge gauntlets — dependable powerhouse for GitHub Issue cash bounties.',
  },
};

// ============================================================================
// 2. STATE & LOCALE HELPERS
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
    // ignore
  }
  return 'zh-TW';
}

const state = {
  locale: getStoredLocale(),
  code: '',
  isDemoPreview: false,
  device: null,
  user: null,
  authMode: 'register',
  selectedRole: 'pro_architect',
  workerNameEdited: false,
  animTick: 0,
};

function t(key) {
  return (I18N[state.locale] && I18N[state.locale][key]) || I18N['zh-TW'][key] || key;
}

function showToast(msg) {
  const host = document.getElementById('onboard-toast');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function setLocale(locale, silent = false) {
  state.locale = normalizeLocale(locale);
  try {
    localStorage.setItem(LOCALE_KEY, state.locale);
    localStorage.setItem(LEGACY_LOCALE_KEY, state.locale);
  } catch {
    // ignore
  }

  document.documentElement.lang =
    state.locale === 'en' ? 'en' : state.locale === 'zh-CN' ? 'zh-Hans' : 'zh-Hant';
  document.title = t('meta.title');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  });

  document.querySelectorAll('#onboard-lang-switch .lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === state.locale);
  });

  if (!state.workerNameEdited) {
    const nickInput = document.getElementById('onboard-worker-name');
    if (nickInput && (state.device || nickInput.value)) {
      nickInput.value = getDefaultWorkerNickname(state.selectedRole);
    }
  }

  updateAuthFormUI();
  renderAccountStatus();
  renderDeviceCard();
  renderWorkerCards();
  updateSelectedWorkerPreview();
  updateSummary();
  renderResultState();

  if (!silent) showToast(t('toast.langSwitched'));
}

// ============================================================================
// 3. API HELPERS
// ============================================================================

async function apiJson(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(opts.headers || {}),
    },
    ...opts,
  });
  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  return { ok: res.ok, status: res.status, body };
}

function detectClientOS() {
  const ua = (navigator.platform || navigator.userAgent || '').toLowerCase();
  if (ua.includes('win')) return 'Windows (win32)';
  if (ua.includes('mac')) return 'macOS (darwin)';
  if (ua.includes('linux')) return 'Linux (x64)';
  return 'Desktop OS';
}

// ============================================================================
// 4. DEVICE FLOW INITIALIZATION & RENDERING
// ============================================================================

async function initDeviceCode() {
  const params = new URLSearchParams(window.location.search);
  const queryCode = (params.get('code') || '').trim().toUpperCase();
  const demoFlag = params.get('demo') === '1' || params.get('demo') === 'true';

  if (queryCode) {
    state.code = queryCode;
    state.isDemoPreview = demoFlag;
    await fetchDeviceStatus();
    return;
  }

  // No code provided or ?demo=1 -> auto-create a live preview device pairing code!
  state.isDemoPreview = true;
  const demoRibbon = document.getElementById('demo-ribbon');
  if (demoRibbon) demoRibbon.hidden = false;

  const { ok, body } = await apiJson('/api/device/start', {
    method: 'POST',
    body: JSON.stringify({
      deviceName: 'Creator-Workstation (Demo)',
      os: detectClientOS(),
      cliTools: ['gemini', 'claude', 'codex', 'git'],
    }),
  });

  if (ok && body.code) {
    state.code = body.code;
    try {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('code', body.code);
      nextUrl.searchParams.set('demo', '1');
      window.history.replaceState({}, '', nextUrl.toString());
    } catch {
      // ignore history errors
    }
    await fetchDeviceStatus();
  } else {
    // Offline fallback preview
    state.code = 'PCT-DEMO-01';
    state.device = {
      code: 'PCT-DEMO-01',
      deviceName: 'Creator-Workstation (Demo)',
      os: detectClientOS(),
      cliTools: ['gemini', 'claude', 'codex', 'git'],
      status: 'pending',
    };
    renderDeviceCard();
    updateSummary();
  }
}

async function fetchDeviceStatus() {
  if (!state.code) return;
  const { ok, body } = await apiJson(`/api/device/status?code=${encodeURIComponent(state.code)}`);
  if (ok) {
    const dev = body.device || body;
    state.device = {
      code: dev.code || state.code,
      deviceName: dev.deviceName || dev.name || 'Local Compute Machine',
      os: dev.os || dev.platform || detectClientOS(),
      cliTools: Array.isArray(dev.cliTools) ? dev.cliTools : [],
      status: dev.status || 'pending',
      workerName: dev.workerName || null,
      workerId: dev.workerId || null,
      approvedBy: dev.approvedBy || null,
    };
  } else {
    state.device = {
      code: state.code,
      deviceName: 'Unknown / Expired Code',
      os: detectClientOS(),
      cliTools: [],
      status: 'rejected',
      error: body.error || 'Device code not found',
    };
  }

  const demoRibbon = document.getElementById('demo-ribbon');
  if (demoRibbon) demoRibbon.hidden = !state.isDemoPreview;

  renderDeviceCard();
  updateSummary();
  renderResultState();
}

function renderDeviceCard() {
  const dev = state.device;
  const codeEl = document.getElementById('device-code-value');
  const statusEl = document.getElementById('device-status-chip');
  const nameEl = document.getElementById('device-name-val');
  const osEl = document.getElementById('device-os-val');
  const cliHost = document.getElementById('device-cli-list');

  if (codeEl) codeEl.textContent = (dev && dev.code) || state.code || 'PCT-XXXX-XX';
  if (nameEl) nameEl.textContent = (dev && dev.deviceName) || '—';
  if (osEl) osEl.textContent = (dev && dev.os) || '—';

  const status = (dev && dev.status) || 'pending';
  if (statusEl) {
    statusEl.className = `status-chip ${status}`;
    statusEl.textContent = t(`status.${status}`) || status;
  }

  if (cliHost) {
    cliHost.innerHTML = '';
    const tools = (dev && Array.isArray(dev.cliTools) && dev.cliTools) || [];
    if (!tools.length) {
      const span = document.createElement('span');
      span.className = 'cli-chip muted';
      span.textContent = t('device.noCli');
      cliHost.appendChild(span);
    } else {
      tools.forEach((tool) => {
        const chip = document.createElement('span');
        chip.className = 'cli-chip';
        chip.textContent = `✓ ${tool}`;
        cliHost.appendChild(chip);
      });
    }
  }
}

// ============================================================================
// 5. STEP 1: ACCOUNT SESSION (GET /api/auth/me, register, login, demo, logout)
// ============================================================================

async function fetchCurrentUser() {
  const { ok, body } = await apiJson('/api/auth/me');
  if (ok && (body.user || body.id)) {
    state.user = body.user || body;
  } else {
    // Fallback to /api/bootstrap if /api/auth/me is absent
    const boot = await apiJson('/api/bootstrap');
    if (boot.ok && boot.body && boot.body.user) {
      state.user = boot.body.user;
    }
  }
  renderAccountStatus();
  updateSummary();
}

function isFormalUser(user) {
  if (!user) return false;
  if (user.authMode === 'demo' || user.id === 'founder-demo') return false;
  return Boolean(user.email || user.authMode === 'email' || user.authMode === 'github' || user.authMode === 'google');
}

function getLocalizedUserDisplayName(user) {
  if (!user) return t('step1.demoDisplayName');
  const raw = String(user.displayName || user.username || user.email || '').trim();
  if (
    !isFormalUser(user) ||
    user.id === 'founder-demo' ||
    raw === '創始鎮長 (Demo)' ||
    raw === '创始镇长 (Demo)' ||
    raw === 'Founder Mayor (Demo)' ||
    raw === 'Founding Mayor (Demo)'
  ) {
    return t('step1.demoDisplayName');
  }
  return raw || t('step1.demoDisplayName');
}

function renderAccountStatus() {
  const card = document.getElementById('account-status-card');
  const avatarEl = document.getElementById('account-avatar');
  const nameEl = document.getElementById('account-display-name');
  const modeEl = document.getElementById('account-mode-tag');
  const subEl = document.getElementById('account-sub-info');
  const logoutBtn = document.getElementById('btn-onboard-logout');

  const user = state.user;
  const formal = isFormalUser(user);

  if (card) card.classList.toggle('verified', formal);
  if (avatarEl) avatarEl.textContent = formal ? '🛡️' : '🧑‍💻';
  if (nameEl) {
    nameEl.textContent = getLocalizedUserDisplayName(user);
  }
  if (modeEl) {
    modeEl.className = `account-mode-tag ${formal ? 'live' : ''}`;
    modeEl.textContent = formal ? t('step1.modeLive') : t('step1.modeDemo');
  }
  if (subEl) {
    subEl.textContent = formal
      ? `${user.email || user.username || ''} · ${t('step1.subLive')}`
      : t('step1.subDemo');
  }
  if (logoutBtn) logoutBtn.hidden = !formal;
}

function updateAuthFormUI() {
  const isReg = state.authMode === 'register';
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.authMode === state.authMode);
  });
  const nameField = document.getElementById('field-display-name');
  const submitBtn = document.getElementById('btn-auth-submit');
  if (nameField) nameField.hidden = !isReg;
  if (submitBtn) {
    submitBtn.textContent = isReg ? t('step1.registerSubmit') : t('step1.loginSubmit');
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('auth-error-msg');
  if (errEl) errEl.hidden = true;

  const email = (document.getElementById('auth-email')?.value || '').trim();
  const password = document.getElementById('auth-password')?.value || '';
  const displayName = (document.getElementById('auth-display-name')?.value || '').trim();

  const endpoint = state.authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const payload =
    state.authMode === 'register' ? { email, password, displayName } : { email, password };

  const { ok, body } = await apiJson(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!ok) {
    if (errEl) {
      errEl.textContent = body.error || `Error (${body.status || 'Auth Failed'})`;
      errEl.hidden = false;
    }
    return;
  }

  state.user = body.user || state.user;
  await fetchCurrentUser();
  showToast(t('toast.authOk'));
}

async function handleDemoFastBind() {
  const { ok, body } = await apiJson('/api/auth/demo', { method: 'POST', body: '{}' });
  if (ok && body.user) {
    state.user = body.user;
  }
  await fetchCurrentUser();
  showToast(t('toast.demoOk'));
}

async function handleLogout() {
  await apiJson('/api/auth/logout', { method: 'POST', body: '{}' });
  await fetchCurrentUser();
  showToast(t('toast.logoutOk'));
}

// ============================================================================
// 6. STEP 2: 32x32 HD PIXEL WORKER SELECTOR (renderWorkerPortrait)
// ============================================================================

function fitPrefixOnWordBoundary(rawName, maxChars) {
  const clean = String(rawName || '')
    .replace(/\s*\(Demo\)\s*/gi, '')
    .trim();
  if (!clean || maxChars <= 0) return '';
  if (clean.length <= maxChars) return clean;
  const tokens = clean.split(/[\s._-]+/).filter(Boolean);
  let result = '';
  for (const tok of tokens) {
    const candidate = result ? `${result}-${tok}` : tok;
    if (candidate.length <= maxChars) {
      result = candidate;
    } else {
      break;
    }
  }
  if (result) return result;
  return maxChars >= 3 ? 'CLI' : '';
}

function getDefaultWorkerNickname(roleClass) {
  const MAX_NICK_LEN = 32;
  const roleLabel = t(`role.${roleClass}.name`);
  const sep = ' · ';
  const budget = MAX_NICK_LEN - roleLabel.length - sep.length;
  const rawDev = state.device && state.device.deviceName ? state.device.deviceName : 'CLI';
  const devPrefix = fitPrefixOnWordBoundary(rawDev, budget);
  if (!devPrefix) {
    return roleLabel.slice(0, MAX_NICK_LEN).trim();
  }
  return `${roleLabel}${sep}${devPrefix}`;
}

function renderWorkerCards() {
  const grid = document.getElementById('worker-role-grid');
  if (!grid) return;
  grid.innerHTML = '';

  ROLE_ORDER.forEach((roleClass) => {
    const meta = WORKER_ROLE_META[roleClass] || WORKER_ROLE_META.flash_worker;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `worker-role-card ${state.selectedRole === roleClass ? 'selected' : ''}`;
    btn.dataset.roleClass = roleClass;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(state.selectedRole === roleClass));

    const canvas = document.createElement('canvas');
    canvas.className = 'role-portrait-canvas';
    canvas.width = 56;
    canvas.height = 56;
    canvas.dataset.portraitRole = roleClass;

    const copy = document.createElement('div');
    copy.className = 'role-card-copy';

    const title = document.createElement('div');
    title.className = 'role-card-title';
    title.textContent = `${meta.badge || '⚡'} ${t(`role.${roleClass}.name`)}`;

    const track = document.createElement('div');
    track.className = 'role-card-track';
    track.textContent = t(`role.${roleClass}.track`);

    copy.append(title, track);
    btn.append(canvas, copy);

    btn.addEventListener('click', () => {
      state.selectedRole = roleClass;
      renderWorkerCards();
      updateSelectedWorkerPreview();
      if (!state.workerNameEdited) {
        const nameInput = document.getElementById('onboard-worker-name');
        if (nameInput) nameInput.value = getDefaultWorkerNickname(roleClass);
      }
      updateSummary();
    });

    grid.appendChild(btn);
    renderWorkerPortrait(canvas, roleClass, 'default', {
      animState: state.selectedRole === roleClass ? 'work' : 'idle',
      frame: state.animTick,
    });
  });
}

function updateSelectedWorkerPreview() {
  const canvas = document.getElementById('selected-worker-preview');
  const nameEl = document.getElementById('preview-role-name');
  const descEl = document.getElementById('preview-role-desc');

  if (canvas) {
    renderWorkerPortrait(canvas, state.selectedRole, 'default', {
      animState: 'work',
      frame: state.animTick,
    });
  }
  if (nameEl) nameEl.textContent = t(`role.${state.selectedRole}.name`);
  if (descEl) descEl.textContent = t(`role.${state.selectedRole}.desc`);
}

function startPortraitAnimationLoop() {
  setInterval(() => {
    state.animTick = (state.animTick + 1) % 4;
    const mainCanvas = document.getElementById('selected-worker-preview');
    if (mainCanvas) {
      renderWorkerPortrait(mainCanvas, state.selectedRole, 'default', {
        animState: 'work',
        frame: state.animTick,
      });
    }
    document.querySelectorAll('.role-portrait-canvas').forEach((c) => {
      const role = c.dataset.portraitRole || 'flash_worker';
      renderWorkerPortrait(c, role, 'default', {
        animState: role === state.selectedRole ? 'work' : 'idle',
        frame: state.animTick,
      });
    });
  }, 340);
}

// ============================================================================
// 7. STEP 3: APPROVE DEVICE (POST /api/device/approve) & RESULT STATES
// ============================================================================

function getChosenWorkerName() {
  const input = document.getElementById('onboard-worker-name');
  const val = (input && input.value.trim()) || '';
  return val || getDefaultWorkerNickname(state.selectedRole);
}

function updateSummary() {
  const accEl = document.getElementById('summary-account');
  const devEl = document.getElementById('summary-device');
  const wrkEl = document.getElementById('summary-worker');

  if (accEl) {
    accEl.textContent = getLocalizedUserDisplayName(state.user);
  }
  if (devEl) {
    devEl.textContent =
      (state.device && `${state.device.deviceName} (${state.device.code})`) || state.code || '—';
  }
  if (wrkEl) {
    wrkEl.textContent = getChosenWorkerName();
  }
}

function renderResultState() {
  const status = state.device && state.device.status;
  const actionsWrap = document.getElementById('approve-actions');
  const resultCard = document.getElementById('result-card');
  const iconEl = document.getElementById('result-icon');
  const titleEl = document.getElementById('result-title');
  const descEl = document.getElementById('result-desc');
  const metaEl = document.getElementById('result-meta');
  const recheckBtn = document.getElementById('btn-recheck-status');

  if (!resultCard || !actionsWrap) return;

  if (!status || status === 'pending') {
    actionsWrap.hidden = false;
    resultCard.hidden = true;
    return;
  }

  actionsWrap.hidden = true;
  resultCard.hidden = false;
  resultCard.className = 'result-card';

  if (status === 'approved') {
    if (iconEl) iconEl.textContent = '🎉';
    if (titleEl) titleEl.textContent = t('result.approvedTitle');
    if (descEl) descEl.textContent = t('result.approvedDesc');
    if (metaEl) {
      metaEl.textContent = `CODE: ${state.device.code} · WORKER: ${state.device.workerName || getChosenWorkerName()}`;
    }
    if (recheckBtn) recheckBtn.hidden = true;
  } else if (status === 'pending_review') {
    resultCard.classList.add('review');
    if (iconEl) iconEl.textContent = '⏳';
    if (titleEl) titleEl.textContent = t('result.reviewTitle');
    if (descEl) descEl.textContent = t('result.reviewDesc');
    if (metaEl) {
      metaEl.textContent = `CODE: ${state.device.code} · STATUS: pending_review`;
    }
    if (recheckBtn) recheckBtn.hidden = false;
  } else {
    resultCard.classList.add('rejected');
    if (iconEl) iconEl.textContent = '⛔';
    if (titleEl) titleEl.textContent = t('result.rejectedTitle');
    if (descEl) descEl.textContent = state.device.error || t('result.rejectedDesc');
    if (metaEl) metaEl.textContent = `CODE: ${state.device.code}`;
    if (recheckBtn) recheckBtn.hidden = true;
  }
}

async function handleApproveDevice() {
  const errEl = document.getElementById('approve-error-msg');
  const btn = document.getElementById('btn-approve-device');
  if (errEl) errEl.hidden = true;
  if (!state.code) return;

  if (btn) {
    btn.disabled = true;
    btn.textContent = t('step3.approving');
  }

  const workerName = getChosenWorkerName();
  const { ok, body } = await apiJson('/api/device/approve', {
    method: 'POST',
    body: JSON.stringify({
      code: state.code,
      workerRoleClass: state.selectedRole,
      workerName,
    }),
  });

  if (btn) {
    btn.disabled = false;
    btn.textContent = t('step3.approveBtn');
  }

  if (!ok) {
    if (errEl) {
      errEl.textContent = body.error || 'Failed to approve device.';
      errEl.hidden = false;
    }
    return;
  }

  const dev = body.device || body;
  const nextStatus = dev.status || body.status || 'approved';
  state.device = {
    ...(state.device || { code: state.code }),
    ...dev,
    status: nextStatus,
    workerName: (body.worker && body.worker.name) || dev.workerName || workerName,
  };

  renderDeviceCard();
  renderResultState();
  showToast(nextStatus === 'pending_review' ? t('toast.pendingReview') : t('toast.approved'));
}

// ============================================================================
// 8. BOOTSTRAP
// ============================================================================

async function boot() {
  // Language switcher
  document.querySelectorAll('#onboard-lang-switch .lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLocale(btn.dataset.lang));
  });

  // Auth tabs & form
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.authMode = tab.dataset.authMode || 'register';
      updateAuthFormUI();
    });
  });

  const authForm = document.getElementById('onboard-auth-form');
  if (authForm) authForm.addEventListener('submit', handleAuthSubmit);

  const demoFastBtn = document.getElementById('btn-fast-demo');
  if (demoFastBtn) demoFastBtn.addEventListener('click', handleDemoFastBind);

  const logoutBtn = document.getElementById('btn-onboard-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Worker nickname input
  const nickInput = document.getElementById('onboard-worker-name');
  if (nickInput) {
    nickInput.addEventListener('input', () => {
      state.workerNameEdited = nickInput.value.trim().length > 0;
      updateSummary();
    });
  }

  // Approve & Recheck buttons
  const approveBtn = document.getElementById('btn-approve-device');
  if (approveBtn) approveBtn.addEventListener('click', handleApproveDevice);

  const recheckBtn = document.getElementById('btn-recheck-status');
  if (recheckBtn) recheckBtn.addEventListener('click', fetchDeviceStatus);

  // Apply initial locale
  setLocale(state.locale, true);

  // Hydrate device & user in parallel
  await Promise.all([initDeviceCode(), fetchCurrentUser()]);

  // Populate default worker nickname after device info loads
  if (nickInput && !nickInput.value) {
    nickInput.value = getDefaultWorkerNickname(state.selectedRole);
    updateSummary();
  }

  // Keep HD portraits animating smoothly
  startPortraitAnimationLoop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
