/**
 * PixelCompute Town v1.0 — 前端主控制器
 * 完整整合：100% 全站三語在地化、多用戶帳號註冊登入、三合一收付結帳（穩定幣 / 信用卡 / 兌換碼）、
 * 穩定幣分紅提領、鎮長裝置審核與卡密生成、SSE 即時同步、HD 像素引擎、8-bit 音效、打工證 PNG 與 BYOK 執行器。
 */

import { PixelTownEngine } from './pixelEngine.js';
import { renderWorkerPortrait } from './sprites.js';
import { soundFX } from './sound.js';
import { renderWorkCertificate, downloadWorkCertificate } from './certCard.js';
import {
  applyI18n,
  getLocale,
  localizeAchievement,
  localizeFeedMessage,
  localizeLeaderboardEntry,
  localizeProject,
  localizeRevenueLabel,
  localizeRoleLabel,
  localizeShopItem,
  localizeSkinLabel,
  localizeStreamLabel,
  localizeTask,
  localizeUser,
  localizeWorker,
  setLocale,
  t,
} from './i18n.js';
import {
  PRESET_MODELS,
  buildTaskPrompt,
  clearByokKey,
  generateMockDeliverable,
  getByokConfig,
  hasLiveApiKey,
  runApiTask,
  saveByokConfig,
  testConnection,
} from './geminiRunner.js';

const ONBOARDING_STORAGE_KEY = 'pixel_compute_town_onboarding_collapsed_v1';
const SCENE_SYNC_STORAGE_KEY = 'pixel_compute_town_scene_sync_v1';

const VALID_SCENES = new Set(['factory', 'guild', 'launchpad', 'lounge', 'vault', 'town']);

const TAB_TO_SCENE = Object.freeze({
  factory: 'factory',
  api: 'factory',
  guild: 'guild',
  incubator: 'launchpad',
  launchpad: 'launchpad',
  workers: 'lounge',
  revenue: 'vault',
  founder: 'vault',
});

const SCENE_TO_TAB = Object.freeze({
  factory: 'factory',
  guild: 'guild',
  launchpad: 'incubator',
  lounge: 'workers',
  vault: 'revenue',
});

const SCENE_HINT_KEYS = Object.freeze({
  factory: 'stage.hintFactory',
  guild: 'stage.hintGuild',
  launchpad: 'stage.hintLaunchpad',
  lounge: 'stage.hintLounge',
  vault: 'stage.hintVault',
  town: 'stage.hintTown',
});

const SKIN_PREVIEW_ROLES = Object.freeze({
  'skin-cyber': 'flash_worker',
  'skin-cat': 'pixel_artist',
  'skin-gold': 'pro_architect',
});

const LEADERBOARD_AVATAR_PRESETS = Object.freeze({
  'npc-kuro': { roleClass: 'guild_artisan', skin: 'skin-gold' },
  'npc-momo': { roleClass: 'pixel_artist', skin: 'skin-cat' },
  'npc-yuna': { roleClass: 'pro_architect', skin: 'skin-cyber' },
  'npc-rin': { roleClass: 'pro_architect', skin: 'default' },
  'npc-zero': { roleClass: 'flash_worker', skin: 'skin-cyber' },
});

const FALLBACK_ROLES = ['pro_architect', 'pixel_artist', 'guild_artisan', 'flash_worker'];
const TOP_RANK_SKINS = ['skin-gold', 'skin-cyber', 'skin-cat'];
const TOP_RANK_CROWNS = ['👑', '🥈', '🥉'];

// ============================================================================
// App Runtime Store
// ============================================================================
const app = {
  user: null,
  state: null,
  shopItems: [],
  workerTemplates: [],
  config: {},
  authConfig: {},
  paymentConfig: {},
  adminData: {
    isAdmin: true,
    strictDeviceReview: false,
    pendingDevices: [],
    allDevices: [],
    redeemCodes: [],
    payouts: [],
  },
  engine: null,
  sse: null,
  sseState: 'connecting',
  activeTab: 'factory',
  activeScene: 'factory',
  autoFollowScene: (() => {
    try {
      return localStorage.getItem(SCENE_SYNC_STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  })(),
  feedFilter: 'all',
  dayNight: 'night',
  autoPilotOn: false,
  autoPilotTimer: null,
  busyWorkers: new Set(),
  activeGuildTaskId: null,
  activeReportText: '',
  syncDebounceTimer: null,
  lastLocalMutationAt: 0,
  certExported: false,
  onboardingCollapsed: (() => {
    try {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  })(),
  adminPanelCollapsed: false,
  seenUnlockedAchievements: new Set(),
  // Auth modal runtime state
  authModalMode: 'login',
  // Payment modal runtime state
  payModal: {
    productId: null,
    targetProjectId: null,
    displayName: '',
    priceUsd: 0,
    activeTab: 'stablecoin',
    activeStablecoinOrder: null,
    activeCardOrder: null,
  },
};

// ============================================================================
// DOM & Formatting Helpers
// ============================================================================
const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtUsd(val) {
  const n = Number(val) || 0;
  return `$${n.toFixed(2)}`;
}

function fmtTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const loc = getLocale() === 'en' ? 'en-US' : getLocale();
    return d.toLocaleTimeString(loc, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

function shortHash(str, head = 8, tail = 6) {
  if (!str) return '';
  const s = String(str);
  return s.length > head + tail + 3 ? `${s.slice(0, head)}...${s.slice(-tail)}` : s;
}

function showToast(message, type = 'info', durationMs = 3400) {
  const container = $('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s ease';
    setTimeout(() => el.remove(), 220);
  }, durationMs);
}

async function copyText(text, successMsg = null) {
  const msg = successMsg || t('toast.copied');
  try {
    await navigator.clipboard.writeText(text);
    showToast(msg, 'success', 2200);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast(msg, 'success', 2200);
  }
}

async function apiFetch(path, options = {}) {
  const opts = {
    method: options.method || 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  };
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

function celebrateAchievement(ach) {
  if (!ach || !ach.id || app.seenUnlockedAchievements.has(ach.id)) return;
  app.seenUnlockedAchievements.add(ach.id);
  const locAch = localizeAchievement(ach, getLocale());
  const bonus = ach.rewardGold > 0 ? ` (+${ach.rewardGold}G)` : '';
  soundFX.playVerify();
  showToast(
    t('toast.achievement', { title: `${ach.icon || '🏆'} ${locAch.name}`, bonus }),
    'achievement',
    5200,
  );
}

function seedSeenAchievements(state) {
  app.seenUnlockedAchievements.clear();
  for (const ach of state?.achievements || []) {
    if (ach.unlocked) app.seenUnlockedAchievements.add(ach.id);
  }
}

function checkNewAchievements(state) {
  for (const ach of state?.achievements || []) {
    if (ach.unlocked && !app.seenUnlockedAchievements.has(ach.id)) {
      celebrateAchievement(ach);
    }
  }
}

function resetTransientUiAfterWorldReset() {
  app.activeGuildTaskId = null;
  app.certExported = false;
  app.seenUnlockedAchievements.clear();
  if (app.autoFollowScene) {
    const mapped = TAB_TO_SCENE[app.activeTab] || 'factory';
    selectScene(mapped, { syncTab: false, silent: true });
  } else {
    updateSceneHint(app.activeScene);
  }
  const importRes = $('gh-import-result');
  if (importRes) {
    importRes.style.display = 'none';
    importRes.textContent = '';
  }
}

function hydrateWorkerPortraits(root = document) {
  if (!root || typeof renderWorkerPortrait !== 'function') return;
  root.querySelectorAll('canvas[data-portrait-role]').forEach((canvas) => {
    const roleClass = canvas.dataset.portraitRole || 'flash_worker';
    const skinId = canvas.dataset.portraitSkin || 'default';
    const opts = {};
    if (canvas.dataset.portraitAnim) opts.animState = canvas.dataset.portraitAnim;
    if (canvas.dataset.portraitCrown) opts.crown = canvas.dataset.portraitCrown;
    try {
      renderWorkerPortrait(canvas, roleClass, skinId, opts);
    } catch {
      // Keep UI resilient if canvas rendering fails in headless environments
    }
  });
}

function resolveLeaderboardPortrait(row, rank) {
  if (row?.isCurrentUser) {
    const primaryWorker = (app.state?.workers || [])[0];
    return {
      roleClass: primaryWorker?.roleClass || 'flash_worker',
      skin: primaryWorker?.skin && primaryWorker.skin !== 'default'
        ? primaryWorker.skin
        : rank === 1
          ? 'skin-gold'
          : 'default',
    };
  }
  if (row?.userId && LEADERBOARD_AVATAR_PRESETS[row.userId]) {
    return LEADERBOARD_AVATAR_PRESETS[row.userId];
  }
  const idx = Math.max(0, (rank || 1) - 1);
  return {
    roleClass: FALLBACK_ROLES[idx % FALLBACK_ROLES.length],
    skin: TOP_RANK_SKINS[idx] || 'default',
  };
}

function applyBootstrapPayload(data, { silentAchievements = false } = {}) {
  if (!data) return;
  if (data.user) app.user = data.user;
  if (data.state) app.state = data.state;
  if (Array.isArray(data.shopItems)) app.shopItems = data.shopItems;
  if (Array.isArray(data.workerTemplates)) app.workerTemplates = data.workerTemplates;
  if (data.config) app.config = data.config;
  if (data.authConfig) app.authConfig = data.authConfig;
  if (data.paymentConfig) app.paymentConfig = data.paymentConfig;
  if (data.adminData) app.adminData = data.adminData;
  if (app.engine && app.state) {
    app.engine.syncState(app.state);
  }
  if (!silentAchievements && app.state) {
    checkNewAchievements(app.state);
  }
  renderAll();
}

function applyNewState(nextState, { silentAchievements = false } = {}) {
  if (!nextState) return;
  app.state = nextState;
  app.lastLocalMutationAt = Date.now();
  if (app.engine) {
    app.engine.syncState(app.state);
  }
  if (!silentAchievements) {
    checkNewAchievements(app.state);
  }
  renderAll();
}

async function refreshBootstrapNow({ silentAchievements = false } = {}) {
  try {
    const data = await apiFetch('/api/bootstrap');
    applyBootstrapPayload(data, { silentAchievements });
    return data;
  } catch {
    return null;
  }
}

// ============================================================================
// Modal Management
// ============================================================================
function openModal(modalId) {
  const el = $(modalId);
  if (!el) return;
  el.classList.add('open');
  soundFX.playClick();
}

function closeModal(modalId) {
  const el = $(modalId);
  if (!el) return;
  el.classList.remove('open');
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop.open').forEach((m) => m.classList.remove('open'));
}

// ============================================================================
// Certificate Payload Normalization (bridges seed.mjs <-> certCard.js)
// ============================================================================
function buildCertPayload() {
  const s = app.state;
  if (!s) return { user: app.user, state: {} };
  const playerId = s.player?.id || app.user?.id || 'founder-demo';

  const divByProj = new Map();
  for (const entry of s.dividendLedger || []) {
    if (!entry?.projectId) continue;
    const share = Number(entry.playerShareUsd ?? 0);
    if (share > 0) {
      divByProj.set(entry.projectId, (divByProj.get(entry.projectId) || 0) + share);
    }
  }

  const enrichedProjects = (s.projects || []).map((p) => {
    const contribMap = p.contributions || {};
    const myPts = Number(contribMap[playerId] || 0);
    const totalPts = Object.values(contribMap).reduce((sum, v) => sum + Number(v || 0), 0);
    return {
      ...p,
      playerContributionPoints: myPts,
      totalContributionPoints: totalPts,
      playerDividendUsd: divByProj.get(p.id) || 0,
    };
  });

  return {
    user: app.user,
    state: {
      ...s,
      player: {
        ...s.player,
        contributionPoints: s.player?.totalContribution ?? 0,
      },
      projects: enrichedProjects,
      contributions: s.contributionLedger || [],
    },
  };
}

function openCertModal() {
  if (!app.state) return;
  const loc = getLocale();
  const payload = buildCertPayload();
  const canvas = renderWorkCertificate(payload, loc);
  const img = $('cert-preview-img');
  if (img && canvas) {
    img.src = canvas.toDataURL('image/png');
  }
  const p = app.state.player || {};
  const locUser = localizeUser(app.user || p, loc);
  const caption = $('cert-preview-caption');
  if (caption) {
    caption.textContent = t('modal.cert.caption', {
      name: locUser.displayName,
      rep: p.reputation ?? 100,
      tasks: p.completedTasks ?? 0,
      usd: fmtUsd(p.usdBalance),
    });
  }
  openModal('modal-cert');
}

function triggerDownloadCert() {
  if (!app.state) return;
  const loc = getLocale();
  const payload = buildCertPayload();
  const handle = (app.state.player?.username || 'founder').replace(/[^a-z0-9_-]/gi, '');
  downloadWorkCertificate(payload, `pixel-compute-town-cert-${handle}.png`, loc);
  app.certExported = true;
  renderOnboardingBar();
  soundFX.playCoin();
  showToast(t('toast.certExported'), 'success');
}

// ============================================================================
// Tab, HD Scene & Building Navigation
// ============================================================================
function syncAutoFollowUi() {
  const checkbox = $('toggle-scene-sync');
  const label = $('scene-sync-label');
  if (checkbox) checkbox.checked = app.autoFollowScene;
  if (label) label.classList.toggle('active', app.autoFollowScene);
}

function syncSceneChipsUI(sceneId) {
  document.querySelectorAll('.quick-chip[data-scene]').forEach((chip) => {
    const chipScene = chip.dataset.scene || chip.dataset.building;
    const isActive = chipScene === sceneId;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function updateSceneHint(sceneId) {
  const hint = $('stage-overlay-hint');
  if (!hint) return;
  const key = SCENE_HINT_KEYS[sceneId] || 'stage.hintDefault';
  hint.textContent = t(key);
}

function updateSseLabel() {
  const label = $('sse-label');
  if (!label) return;
  if (app.sseState === 'live') label.textContent = t('stage.sseLive');
  else if (app.sseState === 'offline') label.textContent = t('stage.sseOffline');
  else label.textContent = t('stage.sseConnecting');
}

function selectScene(sceneId, { syncTab = false, fromEngine = false, silent = false } = {}) {
  const normalized = VALID_SCENES.has(sceneId) ? sceneId : 'factory';
  app.activeScene = normalized;
  syncSceneChipsUI(normalized);
  updateSceneHint(normalized);

  if (!fromEngine && app.engine && typeof app.engine.setScene === 'function') {
    const currentEngineScene = typeof app.engine.getScene === 'function' ? app.engine.getScene() : null;
    if (currentEngineScene !== normalized) {
      app.engine.setScene(normalized);
    }
  }

  if (syncTab && SCENE_TO_TAB[normalized] && app.activeTab !== SCENE_TO_TAB[normalized]) {
    switchTab(SCENE_TO_TAB[normalized], { skipSceneSync: true });
  }

  if (!silent) {
    soundFX.playClick();
  }
}

function switchTab(tabName, { skipSceneSync = false } = {}) {
  app.activeTab = tabName;
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.dataset.pane === tabName);
  });

  if (!skipSceneSync && app.autoFollowScene) {
    const mappedScene = TAB_TO_SCENE[tabName];
    if (mappedScene) {
      selectScene(mappedScene, { syncTab: false, silent: true });
      return;
    }
  }
  syncSceneChipsUI(app.activeScene);
}

function focusBuilding(buildingId) {
  if (!buildingId) return;
  if (buildingId === 'town') {
    selectScene('town', { syncTab: false });
    return;
  }
  const targetScene = VALID_SCENES.has(buildingId) ? buildingId : TAB_TO_SCENE[buildingId] || 'factory';
  selectScene(targetScene, { syncTab: true });
}

// ============================================================================
// Auth Modal (#auth-modal)
// ============================================================================
function setAuthModalMode(mode) {
  app.authModalMode = mode === 'register' ? 'register' : 'login';
  const isReg = app.authModalMode === 'register';
  $('auth-tab-login')?.classList.toggle('active', !isReg);
  $('auth-tab-register')?.classList.toggle('active', isReg);
  const nameWrap = $('auth-display-name-wrap');
  if (nameWrap) nameWrap.style.display = isReg ? 'flex' : 'none';
  const submitBtn = $('auth-submit-btn');
  if (submitBtn) submitBtn.textContent = isReg ? t('auth.registerBtn') : t('auth.loginBtn');
  const errEl = $('auth-error-msg');
  if (errEl) {
    errEl.style.display = 'none';
    errEl.textContent = '';
  }
}

function renderAuthModalStatus() {
  const statusEl = $('auth-current-status');
  if (!statusEl) return;
  const loc = getLocale();
  const u = app.user || app.state?.player || {};
  const locUser = localizeUser(u, loc);
  const modeKey =
    u.authMode === 'github'
      ? 'auth.modeGithub'
      : u.authMode === 'google'
        ? 'auth.modeGoogle'
        : u.authMode === 'email'
          ? 'auth.modeEmail'
          : 'auth.modeDemo';
  statusEl.textContent = t('auth.currentStatus', { name: locUser.displayName, mode: t(modeKey) });

  const logoutBtn = $('auth-btn-logout');
  if (logoutBtn) {
    logoutBtn.style.display = u.isAuthenticated || (u.authMode && u.authMode !== 'demo') ? 'inline-flex' : 'none';
  }
}

function openAuthModal(defaultMode = 'login') {
  setAuthModalMode(defaultMode);
  renderAuthModalStatus();
  openModal('auth-modal');
}

// ============================================================================
// 3-in-1 Payment Modal (#payment-modal)
// ============================================================================
function setPaymentModalTab(tab) {
  app.payModal.activeTab = tab || 'stablecoin';
  document.querySelectorAll('#payment-modal [data-pay-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.payTab === app.payModal.activeTab);
  });
  document.querySelectorAll('#payment-modal [data-pay-pane]').forEach((pane) => {
    pane.classList.toggle('active', pane.dataset.payPane === app.payModal.activeTab);
  });
}

function showPaymentStatus(msg, isError = false) {
  const box = $('pay-status-msg');
  if (!box) return;
  if (!msg) {
    box.style.display = 'none';
    box.textContent = '';
    return;
  }
  box.style.display = 'block';
  box.style.borderColor = isError ? 'var(--accent-red)' : 'var(--accent-green)';
  box.textContent = msg;
}

function openPaymentModal({ productId, targetProjectId = null, displayName = '', priceUsd = 0, initialTab = 'stablecoin' }) {
  app.payModal.productId = productId;
  app.payModal.targetProjectId = targetProjectId;
  app.payModal.displayName = displayName;
  app.payModal.priceUsd = Number(priceUsd) || 0;
  app.payModal.activeStablecoinOrder = null;
  app.payModal.activeCardOrder = null;

  const summaryEl = $('pay-product-summary');
  if (summaryEl) {
    summaryEl.textContent = t('pay.productSummary', {
      name: displayName || productId,
      price: fmtUsd(app.payModal.priceUsd),
    });
  }

  const orderBox = $('pay-order-box');
  if (orderBox) orderBox.style.display = 'none';
  const cardBox = $('pay-card-sandbox-box');
  if (cardBox) cardBox.style.display = 'none';
  const txInput = $('pay-tx-hash');
  if (txInput) txInput.value = '';
  const redeemInput = $('pay-redeem-code');
  if (redeemInput) redeemInput.value = '';
  showPaymentStatus('');

  setPaymentModalTab(initialTab);
  openModal('payment-modal');
}

// ============================================================================
// Rendering Functions (100% Trilingual)
// ============================================================================
function renderAll() {
  if (!app.state) return;
  renderHud();
  renderOnboardingBar();
  renderByokIndicator();
  renderStageStatus();
  renderActivityFeed();
  renderFactoryTab();
  renderGuildTab();
  renderIncubatorTab();
  renderWorkersAndShopTab();
  renderRevenueAndLeaderboardTab();
  renderAuthModalStatus();
}

function renderOnboardingBar() {
  const bar = $('onboarding-bar');
  if (!bar || !app.state) return;
  bar.classList.toggle('collapsed', app.onboardingCollapsed);
  const toggleBtn = $('btn-toggle-onboarding');
  if (toggleBtn) {
    toggleBtn.textContent = app.onboardingCollapsed ? t('onboarding.expand') : t('onboarding.collapse');
  }

  const tasks = app.state.tasks || [];
  const projects = app.state.projects || [];
  const achievements = app.state.achievements || [];

  const step1Done =
    tasks.some((tk) => tk.status === 'completed') ||
    achievements.some((a) => a.id === 'first_blood' && a.unlocked);
  const step2Done =
    projects.some((p) => p.id === 'proj-pomo' && p.status !== 'voting') ||
    achievements.some((a) => a.id === 'community_builder' && a.unlocked);
  const step3Done =
    app.certExported ||
    projects.some((p) => p.status === 'launched') ||
    achievements.some((a) => (a.id === 'launch_founder' || a.id === 'dividend_earner') && a.unlocked);

  const states = [step1Done, step2Done, step3Done];
  const doneCount = states.filter(Boolean).length;

  states.forEach((done, idx) => {
    const n = idx + 1;
    const btn = $(`onboarding-step-${n}`);
    const icon = $(`onboarding-icon-${n}`);
    if (btn) btn.classList.toggle('done', done);
    if (icon) icon.textContent = done ? '✅' : '⬜';
  });

  const badge = $('onboarding-progress-badge');
  if (badge) {
    badge.textContent = doneCount === 3 ? t('onboarding.allDone') : `${doneCount} / 3`;
    badge.className = `badge ${doneCount === 3 ? 'green' : 'amber'}`;
  }
}

function renderHud() {
  const loc = getLocale();
  const p = app.state.player || {};
  const u = app.user || p;
  const locUser = localizeUser(u, loc);

  $('hud-gold').textContent = `${Number(p.gold || 0).toLocaleString()} G`;
  $('hud-usd').textContent = fmtUsd(p.usdBalance || 0);
  $('hud-rep').textContent = String(p.reputation ?? 100);

  const proTag = p.isPro ? ' 💎PRO' : '';
  $('hud-user-name').textContent = `${locUser.displayName}${proTag}`;

  const avatarEl = $('hud-user-avatar');
  if (u.avatarUrl) {
    avatarEl.innerHTML = `<img src="${escapeHtml(u.avatarUrl)}" alt="avatar" />`;
  } else {
    avatarEl.textContent = u.authMode === 'github' ? '🐙' : u.authMode === 'google' ? '🌐' : u.authMode === 'email' ? '✉️' : '🧑‍💻';
  }

  const ghBtn = $('btn-github-login');
  const logoutBtn = $('btn-logout');
  const isSignedIn = Boolean(u.isAuthenticated || (u.authMode && u.authMode !== 'demo'));
  if (ghBtn && logoutBtn) {
    if (isSignedIn) {
      ghBtn.style.display = 'none';
      logoutBtn.style.display = 'inline-flex';
    } else if (app.authConfig?.githubOAuthEnabled || app.config?.githubOAuthEnabled) {
      ghBtn.style.display = 'inline-flex';
      logoutBtn.style.display = 'none';
    } else {
      ghBtn.style.display = 'none';
      logoutBtn.style.display = 'none';
    }
  }
}

function renderByokIndicator() {
  const cfg = getByokConfig();
  const isLive = hasLiveApiKey(cfg);
  const dot = $('hud-byok-dot');
  const label = $('hud-byok-label');
  if (dot) dot.classList.toggle('live', isLive);
  if (label) {
    label.textContent = isLive
      ? t('hud.byokLive', { model: cfg.model.slice(0, 18) })
      : t('hud.byokDemo');
  }
}

function renderStageStatus() {
  const loc = getLocale();
  const workers = app.state.workers || [];
  const projects = app.state.projects || [];
  const workingCount = workers.filter((w) => w.status === 'working').length;
  const openTasks = (app.state.tasks || []).filter((tk) => tk.status === 'open').length;
  const latestAct = (app.state.activityFeed || [])[0];

  const marquee = $('stage-marquee');
  if (marquee) {
    const sponsored = projects.find((p) => p.sponsoredBillboard && p.billboardText);
    const sponsoredText = sponsored ? localizeProject(sponsored, loc).billboardText : '';
    const actText = latestAct?.message ? localizeFeedMessage(latestAct.message, loc) : '';
    marquee.textContent = actText || sponsoredText || t('stage.marqueeDefault');
  }

  const strip = $('stage-worker-strip');
  if (strip) {
    const pills = workers
      .map((w) => {
        const lw = localizeWorker(w, loc);
        const isWorking = w.status === 'working';
        const icon = isWorking ? '⚡' : '☕';
        return `
          <button type="button" class="worker-strip-pill ${isWorking ? 'working' : ''}" data-select-strip-worker="${escapeHtml(w.id)}" title="${escapeHtml(lw.name)} · ${escapeHtml(lw.roleName)}">
            <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(w.roleClass || 'flash_worker')}" data-portrait-skin="${escapeHtml(w.skin || 'default')}" data-portrait-anim="${isWorking ? 'work' : 'idle'}"></canvas>
            <span>${icon} ${escapeHtml(lw.name)} Lv.${w.level} (${w.stamina}/${w.maxStamina})</span>
          </button>
        `;
      })
      .join('');
    strip.innerHTML = `
      <div class="badge-row">${pills}</div>
      <span>${escapeHtml(t('stage.stripSummary', { working: workingCount, total: workers.length, open: openTasks }))}</span>
    `;
    hydrateWorkerPortraits(strip);
  }
}

function renderActivityFeed() {
  const loc = getLocale();
  const feedEl = $('activity-feed');
  if (!feedEl) return;
  const items = app.state.activityFeed || [];

  const filtered = items.filter((item) => {
    if (app.feedFilter === 'all') return true;
    if (app.feedFilter === 'deliverable') return item.type === 'complete' || item.type === 'reject';
    if (app.feedFilter === 'revenue') return ['launch', 'dividend', 'billboard', 'shop', 'payment', 'redeem', 'payout'].includes(item.type);
    if (app.feedFilter === 'cli') return item.type === 'cli' || item.type === 'device';
    return true;
  });

  if (filtered.length === 0) {
    feedEl.innerHTML = `<div class="empty-state">${escapeHtml(t('terminal.empty'))}</div>`;
    return;
  }

  feedEl.innerHTML = filtered
    .slice(0, 40)
    .map((item) => {
      const task = item.taskId ? (app.state.tasks || []).find((tk) => tk.id === item.taskId) : null;
      const canInspect = Boolean(task && (task.submission || task.lastRejectedVerification));
      const typeClass =
        item.type === 'complete'
          ? 'type-deliverable'
          : ['launch', 'dividend', 'billboard', 'payment', 'payout', 'redeem'].includes(item.type)
            ? 'type-revenue'
            : item.type === 'cli' || item.type === 'device'
              ? 'type-cli'
              : item.type === 'reject'
                ? 'type-reject'
                : '';

      const localizedMsg = localizeFeedMessage(item.message, loc);

      return `
        <div class="feed-item ${typeClass}">
          <div class="feed-row">
            <span class="feed-msg">${escapeHtml(item.icon || '📌')} ${escapeHtml(localizedMsg)}</span>
            <span class="feed-time">${fmtTime(item.timestamp)}</span>
          </div>
          ${item.preview ? `<div class="feed-preview">${escapeHtml(item.preview)}</div>` : ''}
          ${
            canInspect
              ? `<div class="feed-actions">
                  <button type="button" class="btn btn-sm" data-inspect-task="${escapeHtml(task.id)}">${escapeHtml(t('terminal.inspectBtn'))}</button>
                </div>`
              : ''
          }
        </div>
      `;
    })
    .join('');
}

function populateProjectFilterSelect(selectEl) {
  if (!selectEl) return;
  const loc = getLocale();
  const currentVal = selectEl.value || 'all';
  const projects = app.state.projects || [];
  selectEl.innerHTML =
    `<option value="all">${escapeHtml(t('factory.allProjects'))}</option>` +
    projects
      .map((p) => {
        const lp = localizeProject(p, loc);
        return `<option value="${escapeHtml(p.id)}">${escapeHtml(lp.shortName || lp.name)}</option>`;
      })
      .join('');
  if ([...selectEl.options].some((o) => o.value === currentVal)) {
    selectEl.value = currentVal;
  }
}

function populateWorkerSelect(selectEl, track) {
  if (!selectEl) return;
  const loc = getLocale();
  const currentVal = selectEl.value;
  const list = (app.state.workers || []).filter((w) => w.track === track);
  if (list.length === 0) {
    selectEl.innerHTML = `<option value="">${escapeHtml(t('factory.noTrackWorker'))}</option>`;
    return;
  }
  selectEl.innerHTML = list
    .map((w) => {
      const lw = localizeWorker(w, loc);
      const busyMark = w.status === 'working' || app.busyWorkers.has(w.id) ? t('factory.workerWorkingSuffix') : '';
      return `<option value="${escapeHtml(w.id)}">${escapeHtml(lw.name)} (${w.stamina}/${w.maxStamina})${escapeHtml(busyMark)}</option>`;
    })
    .join('');
  if ([...selectEl.options].some((o) => o.value === currentVal)) {
    selectEl.value = currentVal;
  }
}

function renderFactoryTab() {
  const loc = getLocale();
  const projFilter = $('factory-project-filter');
  const statusFilter = $('factory-status-filter');
  const workerSelect = $('factory-worker-select');
  populateProjectFilterSelect(projFilter);
  populateWorkerSelect(workerSelect, 'api');

  const selectedProj = projFilter?.value || 'all';
  const selectedStatus = statusFilter?.value || 'all';
  const projectMap = new Map((app.state.projects || []).map((p) => [p.id, p]));
  const workerMap = new Map((app.state.workers || []).map((w) => [w.id, w]));

  const tasks = (app.state.tasks || []).filter((tk) => {
    if (tk.track !== 'api_auto') return false;
    if (selectedProj !== 'all' && tk.projectId !== selectedProj) return false;
    if (selectedStatus === 'open' && tk.status !== 'open' && tk.status !== 'in_progress') return false;
    if (selectedStatus === 'completed' && tk.status !== 'completed') return false;
    return true;
  });

  const listEl = $('factory-task-list');
  if (!listEl) return;

  if (tasks.length === 0) {
    listEl.innerHTML = `<div class="empty-state">${escapeHtml(t('factory.empty'))}</div>`;
    return;
  }

  listEl.innerHTML = tasks
    .map((task) => {
      const lt = localizeTask(task, loc);
      const proj = projectMap.get(task.projectId);
      const lp = proj ? localizeProject(proj, loc) : null;
      const isCompleted = task.status === 'completed';
      const isWorking = task.status === 'in_progress';
      const assignedWorker = workerMap.get(task.assignedWorkerId || task.submission?.workerId || '');
      const lw = assignedWorker ? localizeWorker(assignedWorker, loc) : null;

      const statusBadge = isCompleted
        ? `<span class="badge green">${escapeHtml(t('badge.completed'))}</span>`
        : isWorking
          ? `<span class="badge cyan">${escapeHtml(t('badge.working'))}</span>`
          : `<span class="badge amber">${escapeHtml(t('badge.open'))}</span>`;
      const workerChipHtml =
        assignedWorker && (isWorking || isCompleted)
          ? `
            <div class="task-worker-chip ${isCompleted ? 'completed' : ''}">
              <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(assignedWorker.roleClass || 'flash_worker')}" data-portrait-skin="${escapeHtml(assignedWorker.skin || 'default')}" data-portrait-anim="${isWorking ? 'work' : 'celebrate'}"></canvas>
              <span>${isWorking ? '⚡' : '✅'} ${escapeHtml(lw.name)} ${escapeHtml(isWorking ? t('factory.workerBusyTag') : t('factory.workerDoneTag'))}</span>
            </div>
          `
          : '';

      return `
        <article class="pixel-card ${isWorking ? 'in-progress' : ''}">
          <div class="card-head">
            <div>
              <h3 class="card-title">${escapeHtml(lt.title)}</h3>
              <p class="card-subtitle">${escapeHtml(lt.description || '')}</p>
            </div>
            ${statusBadge}
          </div>
          ${workerChipHtml}
          <div class="badge-row">
            <span class="badge">📦 ${escapeHtml(lp?.shortName || task.projectId)}</span>
            <span class="badge cyan">🤖 ${escapeHtml(task.modelSuggestion || 'gemini-2.5-flash')}</span>
            <span class="badge">⚡ ${(task.tokenCostEst || 0).toLocaleString()} tok / -${task.staminaCost || 12}</span>
            <span class="badge gold">🪙 +${task.goldReward}G</span>
            <span class="badge pink">✨ +${task.contributionPoints} pt</span>
            ${task.cashBountyUsd > 0 ? `<span class="badge green">💵 $${task.cashBountyUsd} ($${(task.cashBountyUsd * 0.9).toFixed(2)} ${escapeHtml(t('factory.netSuffix'))})</span>` : ''}
          </div>
          <div class="card-footer">
            <span class="mono" style="font-size: 11px; color: var(--text-muted);">
              ${escapeHtml(task.category)} ｜ +${task.progressWeight || 15}%
            </span>
            <div class="toolbar-group">
              ${
                isCompleted
                  ? `<button type="button" class="btn btn-sm btn-primary" data-inspect-task="${escapeHtml(task.id)}">${escapeHtml(t('factory.inspect'))} (${task.verification?.score ?? 90})</button>`
                  : `<button type="button" class="btn btn-sm btn-green" data-dispatch-api="${escapeHtml(task.id)}" ${isWorking ? 'disabled' : ''}>
                      ${escapeHtml(isWorking ? t('factory.working') : t('factory.dispatch'))}
                    </button>`
              }
            </div>
          </div>
        </article>
      `;
    })
    .join('');
  hydrateWorkerPortraits(listEl);
}

function renderGuildTab() {
  const loc = getLocale();
  const projFilter = $('guild-project-filter');
  const workerSelect = $('guild-worker-select');
  populateProjectFilterSelect(projFilter);
  populateWorkerSelect(workerSelect, 'quota');

  const importProjSelect = $('gh-import-project');
  if (importProjSelect) {
    const prev = importProjSelect.value || '';
    const projects = app.state.projects || [];
    importProjSelect.innerHTML =
      `<option value="">${escapeHtml(t('guild.importAutoProj'))}</option>` +
      projects
        .map((p) => {
          const lp = localizeProject(p, loc);
          return `<option value="${escapeHtml(p.id)}">${escapeHtml(lp.shortName || lp.name)}</option>`;
        })
        .join('');
    if ([...importProjSelect.options].some((o) => o.value === prev)) {
      importProjSelect.value = prev;
    }
  }

  const selectedProj = projFilter?.value || 'all';
  const projectMap = new Map((app.state.projects || []).map((p) => [p.id, p]));
  const workerMap = new Map((app.state.workers || []).map((w) => [w.id, w]));

  const tasks = (app.state.tasks || []).filter((tk) => {
    if (tk.track !== 'guild_bounty') return false;
    if (selectedProj !== 'all' && tk.projectId !== selectedProj) return false;
    return true;
  });

  const listEl = $('guild-task-list');
  if (!listEl) return;

  if (tasks.length === 0) {
    listEl.innerHTML = `<div class="empty-state">${escapeHtml(t('guild.empty'))}</div>`;
    return;
  }

  listEl.innerHTML = tasks
    .map((task) => {
      const lt = localizeTask(task, loc);
      const proj = projectMap.get(task.projectId);
      const lp = proj ? localizeProject(proj, loc) : null;
      const isCompleted = task.status === 'completed';
      const isWorking = task.status === 'in_progress';
      const assignedWorker = workerMap.get(task.assignedWorkerId || task.submission?.workerId || '');
      const lw = assignedWorker ? localizeWorker(assignedWorker, loc) : null;
      const netUsd = Number((task.cashBountyUsd * 0.9).toFixed(2));
      const feeUsd = Number((task.cashBountyUsd * 0.1).toFixed(2));

      const workerChipHtml =
        assignedWorker && (isWorking || isCompleted)
          ? `
            <div class="task-worker-chip ${isCompleted ? 'completed' : ''}">
              <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(assignedWorker.roleClass || 'pro_architect')}" data-portrait-skin="${escapeHtml(assignedWorker.skin || 'default')}" data-portrait-anim="${isWorking ? 'work' : 'celebrate'}"></canvas>
              <span>${isWorking ? '⚔️' : '✅'} ${escapeHtml(lw.name)} ${escapeHtml(isWorking ? t('guild.workerBusyTag') : t('guild.workerDoneTag'))}</span>
            </div>
          `
          : '';

      return `
        <article class="pixel-card ${isWorking ? 'in-progress' : ''}">
          <div class="card-head">
            <div>
              <h3 class="card-title">${escapeHtml(lt.title)}</h3>
              <p class="card-subtitle">${escapeHtml(lt.description || '')}</p>
            </div>
            ${
              isCompleted
                ? `<span class="badge green">${escapeHtml(t('badge.guildCompleted'))}</span>`
                : isWorking
                  ? `<span class="badge cyan">${escapeHtml(t('badge.guildWorking'))}</span>`
                  : `<span class="badge amber">${escapeHtml(t('badge.guildOpen'))}</span>`
            }
          </div>
          ${workerChipHtml}
          <div class="badge-row">
            <span class="badge">📦 ${escapeHtml(lp?.shortName || task.projectId)}</span>
            <span class="badge amber">🖥️ ${escapeHtml(task.modelSuggestion || 'Gemini CLI / Claude Code')}</span>
            <span class="badge gold">🪙 +${task.goldReward}G</span>
            <span class="badge pink">✨ +${task.contributionPoints} pt</span>
            ${
              task.cashBountyUsd > 0
                ? `<span class="badge green">${escapeHtml(t('guild.bountyNetFee', { gross: task.cashBountyUsd, net: netUsd, fee: feeUsd }))}</span>`
                : `<span class="badge cyan">${escapeHtml(t('guild.poolBadge'))}</span>`
            }
          </div>
          <div class="card-footer">
            <span class="mono" style="font-size: 11px; color: var(--text-muted);">
              ${escapeHtml(task.category)} ｜ -${task.staminaCost || 20} ｜ +${task.progressWeight || 20}%
            </span>
            <div class="toolbar-group">
              ${
                isCompleted
                  ? `<button type="button" class="btn btn-sm btn-primary" data-inspect-task="${escapeHtml(task.id)}">${escapeHtml(t('factory.inspect'))} (${task.verification?.score ?? 90})</button>`
                  : `<button type="button" class="btn btn-sm btn-amber" data-open-guild="${escapeHtml(task.id)}">
                      ${escapeHtml(isWorking ? t('guild.claimResume') : t('guild.claimOpen'))}
                    </button>`
              }
            </div>
          </div>
        </article>
      `;
    })
    .join('');
  hydrateWorkerPortraits(listEl);
}

function renderIncubatorTab() {
  const loc = getLocale();
  const listEl = $('project-list');
  if (!listEl) return;
  const projects = app.state.projects || [];
  const playerId = app.state.player?.id || 'founder-demo';
  const billboardPrice = app.config?.billboardPriceUsd ?? 29;

  const votingCnt = projects.filter((p) => p.status === 'voting').length;
  const buildingCnt = projects.filter((p) => p.status === 'building').length;
  const launchedCnt = projects.filter((p) => p.status === 'launched').length;
  $('incubator-summary').textContent = t('incubator.summary', {
    voting: votingCnt,
    building: buildingCnt,
    launched: launchedCnt,
  });

  listEl.innerHTML = projects
    .map((p) => {
      const lp = localizeProject(p, loc);
      const isVoting = p.status === 'voting';
      const isBuilding = p.status === 'building';
      const isLaunched = p.status === 'launched';
      const canLaunch = isBuilding && (p.progressPct || 0) >= 100;

      const myPts = Number(p.contributions?.[playerId] || 0);
      const totalPts = Object.values(p.contributions || {}).reduce((s, v) => s + Number(v || 0), 0);
      const mySharePct = totalPts > 0 ? ((myPts / totalPts) * 60).toFixed(1) : '0.0';

      const votePct = Math.min(100, Math.round(((p.votes || 0) / (p.votesRequired || 10)) * 100));
      const votesLeft = Math.max(0, (p.votesRequired || 10) - (p.votes || 0));

      return `
        <article class="pixel-card ${p.sponsoredBillboard ? 'sponsored' : ''} ${isLaunched ? 'launched' : ''}">
          <div class="card-head">
            <div>
              <h3 class="card-title">
                ${escapeHtml(lp.name)}
                ${p.sponsoredBillboard ? `<span class="badge pink" style="margin-left: 6px;">${escapeHtml(t('incubator.sponsoredBadge'))}</span>` : ''}
              </h3>
              <p class="card-subtitle">${escapeHtml(lp.tagline || lp.description || '')}</p>
            </div>
            ${
              isVoting
                ? `<span class="badge amber">${escapeHtml(t('incubator.statusVoting', { votes: p.votes, req: p.votesRequired }))}</span>`
                : isLaunched
                  ? `<span class="badge green">${escapeHtml(t('incubator.statusLaunched'))}</span>`
                  : `<span class="badge cyan">${escapeHtml(t('incubator.statusBuilding', { pct: p.progressPct }))}</span>`
            }
          </div>

          <div class="badge-row">
            <span class="badge">${escapeHtml(t('incubator.creatorPrefix', { name: lp.creatorName }))}</span>
            <span class="badge pink">${escapeHtml(t('incubator.poolTag'))}</span>
            <span class="badge cyan">${escapeHtml(t('incubator.myPoints', { pts: myPts, pct: mySharePct }))}</span>
            ${p.bountyPoolUsd > 0 ? `<span class="badge gold">${escapeHtml(t('incubator.bountyPool', { amount: p.bountyPoolUsd }))}</span>` : ''}
            ${p.totalRevenueUsd > 0 ? `<span class="badge green">${escapeHtml(t('incubator.totalRev', { amount: fmtUsd(p.totalRevenueUsd) }))}</span>` : ''}
          </div>

          ${
            isVoting
              ? `<div class="progress-wrap">
                  <div class="progress-label">
                    <span>${escapeHtml(t('incubator.voteProgress', { left: votesLeft }))}</span>
                    <span>${escapeHtml(t('incubator.voteCount', { votes: p.votes, req: p.votesRequired }))}</span>
                  </div>
                  <div class="progress-track">
                    <div class="progress-fill amber" style="width: ${votePct}%;"></div>
                  </div>
                </div>`
              : `<div class="progress-wrap">
                  <div class="progress-label">
                    <span>${escapeHtml(isLaunched ? t('incubator.progressLaunched') : canLaunch ? t('incubator.progressReady') : t('incubator.progressBuilding'))}</span>
                    <span>${p.progressPct || 0}%</span>
                  </div>
                  <div class="progress-track">
                    <div class="progress-fill ${isLaunched ? 'green' : canLaunch ? 'pink' : ''}" style="width: ${Math.min(100, p.progressPct || 0)}%;"></div>
                  </div>
                </div>`
          }

          <div class="card-footer">
            <div class="toolbar-group">
              ${
                !p.sponsoredBillboard
                  ? `<button type="button" class="btn btn-sm" data-billboard-project="${escapeHtml(p.id)}">${escapeHtml(t('incubator.billboardBtn', { price: billboardPrice }))}</button>`
                  : `<span class="mono" style="font-size: 11px; color: var(--accent-pink);">${escapeHtml(t('incubator.billboardActive'))}</span>`
              }
            </div>
            <div class="toolbar-group">
              ${
                isVoting
                  ? `<button type="button" class="btn btn-sm btn-amber" data-vote-project="${escapeHtml(p.id)}">${escapeHtml(t('btn.vote'))}</button>`
                  : ''
              }
              ${
                canLaunch
                  ? `<button type="button" class="btn btn-sm btn-green" data-launch-project="${escapeHtml(p.id)}">${escapeHtml(t('btn.launch'))}</button>`
                  : ''
              }
              ${
                isLaunched
                  ? `<button type="button" class="btn btn-sm btn-green" data-sim-revenue="${escapeHtml(p.id)}">${escapeHtml(t('btn.simRevenue'))}</button>`
                  : ''
              }
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderWorkersAndShopTab() {
  const loc = getLocale();
  const workerList = $('worker-list');
  const workers = app.state.workers || [];
  const ownedSkins = app.state.player?.ownedSkins || ['default'];

  if (workerList) {
    workerList.innerHTML = workers
      .map((w) => {
        const lw = localizeWorker(w, loc);
        const staminaPct = Math.round(((w.stamina || 0) / (w.maxStamina || 100)) * 100);
        const capUnit = w.track === 'api' ? t('workers.unitTokens') : t('workers.unitQuota');
        const skinOpts = ownedSkins
          .map(
            (sid) =>
              `<option value="${escapeHtml(sid)}" ${w.skin === sid ? 'selected' : ''}>${escapeHtml(localizeSkinLabel(sid, loc))}</option>`,
          )
          .join('');
        const skinFrameClass = w.skin && w.skin !== 'default' ? escapeHtml(w.skin) : '';

        return `
          <article class="pixel-card">
            <div class="card-head">
              <div class="worker-card-lead">
                <div class="worker-portrait-frame ${w.status === 'working' ? 'working' : ''} ${skinFrameClass}">
                  <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(w.roleClass || 'flash_worker')}" data-portrait-skin="${escapeHtml(w.skin || 'default')}" data-portrait-anim="${w.status === 'working' ? 'work' : 'idle'}"></canvas>
                </div>
                <div class="worker-card-info">
                  <h3 class="card-title">${escapeHtml(lw.name)} <span class="badge cyan">Lv.${w.level}</span></h3>
                  <p class="card-subtitle">${escapeHtml(lw.roleName)} ｜ ${escapeHtml(lw.providerLabel)}</p>
                </div>
              </div>
              <span class="badge ${w.status === 'working' ? 'cyan' : 'green'}">${escapeHtml(w.status === 'working' ? t('workers.statusWorking') : t('workers.statusIdle'))}</span>
            </div>

            <div class="progress-wrap">
              <div class="progress-label">
                <span>${escapeHtml(t('workers.staminaLine', { stamina: w.stamina, maxStamina: w.maxStamina, used: Number(w.usedTokensToday || 0).toLocaleString(), cap: Number(w.dailyTokenCap || 0).toLocaleString(), unit: capUnit }))}</span>
                <span>XP ${w.xp}/${w.xpToNext}</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill ${staminaPct < 30 ? 'pink' : 'green'}" style="width: ${staminaPct}%;"></div>
              </div>
            </div>

            <div class="card-meta-grid">
              <span>${escapeHtml(t('workers.trackLine', { track: w.track === 'api' ? t('workers.trackApi') : t('workers.trackGuild') }))}</span>
              <span>${escapeHtml(t('workers.completedLine', { count: w.completedCount || 0 }))}</span>
              <span>${escapeHtml(t('workers.earnedLine', { gold: w.earnedGold || 0, pts: w.earnedPoints || 0 }))}</span>
            </div>

            <div class="card-footer">
              <div class="worker-cap-row">
                <span class="mono" style="font-size: 11px;">${escapeHtml(t('workers.dailyCapLabel'))}</span>
                <input type="number" class="input worker-cap-input" data-cap-input="${escapeHtml(w.id)}" value="${w.dailyTokenCap}" min="10" max="10000000" />
                <button type="button" class="btn btn-sm" data-save-cap="${escapeHtml(w.id)}">${escapeHtml(t('btn.saveCap'))}</button>
              </div>
              <div class="toolbar-group">
                <select class="select select-inline" data-skin-select="${escapeHtml(w.id)}" aria-label="Equip Skin">${skinOpts}</select>
                <button type="button" class="btn btn-sm btn-amber" data-rest-worker="${escapeHtml(w.id)}">${escapeHtml(t('btn.coffee'))}</button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
    hydrateWorkerPortraits(workerList);
  }

  // Genesis Achievements Wall
  const achievements = app.state.achievements || [];
  const achSummary = $('achievements-summary');
  const achList = $('achievements-list');
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  if (achSummary) {
    achSummary.textContent = `${unlockedCount} / ${achievements.length || 6}`;
  }
  if (achList) {
    if (achievements.length === 0) {
      achList.innerHTML = `<div class="empty-state">${escapeHtml(t('workers.achievementsEmpty'))}</div>`;
    } else {
      achList.innerHTML = achievements
        .map((a) => {
          const la = localizeAchievement(a, loc);
          return `
            <article class="achievement-card ${a.unlocked ? 'unlocked' : ''}">
              <div class="achievement-icon" aria-hidden="true">${escapeHtml(a.icon || '🏆')}</div>
              <div class="achievement-info">
                <div class="achievement-name">
                  <span>${escapeHtml(la.name)}</span>
                  <span class="badge ${a.unlocked ? 'gold' : ''}">${escapeHtml(a.unlocked ? t('workers.achUnlocked') : `+${a.rewardGold || 0}G`)}</span>
                </div>
                <div class="achievement-desc">${escapeHtml(la.description || '')}</div>
              </div>
            </article>
          `;
        })
        .join('');
    }
  }

  // Shop items
  const shopList = $('shop-list');
  const ownedItems = app.state.player?.ownedItems || [];
  if (shopList) {
    shopList.innerHTML = (app.shopItems || [])
      .map((item) => {
        const li = localizeShopItem(item, loc);
        const owned = ownedItems.includes(item.id) || (item.type === 'pro' && app.state.player?.isPro);
        const priceLabel = item.priceUsd > 0 ? `$${item.priceUsd} USD` : `${item.priceGold} G`;
        const previewSkinId = item.skinId || '';
        const previewRole = SKIN_PREVIEW_ROLES[previewSkinId] || workers[0]?.roleClass || 'flash_worker';
        const hasSingleSkinPreview = Boolean(previewSkinId);
        const bundleSkins = Array.isArray(item.unlockSkins) ? item.unlockSkins : [];
        const bundleStripHtml =
          bundleSkins.length > 1
            ? `
              <div class="shop-bundle-strip" title="${escapeHtml(t('workers.shopBundleTitle'))}">
                ${bundleSkins
                  .map(
                    (sid) =>
                      `<canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(SKIN_PREVIEW_ROLES[sid] || 'flash_worker')}" data-portrait-skin="${escapeHtml(sid)}"></canvas>`,
                  )
                  .join('')}
                <span class="mono" style="font-size: 11px; color: var(--accent-gold);">${escapeHtml(t('workers.shopBundleTag'))}</span>
              </div>
            `
            : '';

        return `
          <article class="pixel-card">
            <div class="card-head">
              <div class="shop-card-lead">
                ${
                  hasSingleSkinPreview
                    ? `<div class="shop-skin-preview ${escapeHtml(previewSkinId)}" title="${escapeHtml(t('workers.shopPreviewTitle'))}">
                        <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(previewRole)}" data-portrait-skin="${escapeHtml(previewSkinId)}"></canvas>
                      </div>`
                    : ''
                }
                <div style="min-width: 0; flex: 1;">
                  <h3 class="card-title">${escapeHtml(item.icon || '🛍️')} ${escapeHtml(li.name)}</h3>
                  <p class="card-subtitle">${escapeHtml(li.desc || '')}</p>
                </div>
              </div>
              <span class="badge ${item.priceUsd > 0 ? 'pink' : 'gold'}">${escapeHtml(li.tag || '')}</span>
            </div>
            ${bundleStripHtml}
            <div class="card-footer">
              <span class="mono" style="font-weight: 800; color: ${item.priceUsd > 0 ? 'var(--accent-green)' : 'var(--accent-gold)'};">${priceLabel}</span>
              ${
                owned
                  ? `<span class="badge green">${escapeHtml(t('badge.owned'))}</span>`
                  : `<button type="button" class="btn btn-sm ${item.priceUsd > 0 ? 'btn-pink' : 'btn-primary'}" data-buy-item="${escapeHtml(item.id)}">${escapeHtml(item.priceUsd > 0 ? t('btn.checkout') : t('btn.buy'))}</button>`
              }
            </div>
          </article>
        `;
      })
      .join('');
    hydrateWorkerPortraits(shopList);
  }
}

function renderRevenueAndLeaderboardTab() {
  const loc = getLocale();
  const rev = app.state.founderRevenue || {};
  $('rev-total-usd').textContent = fmtUsd(rev.totalUsd || 0);
  $('rev-bounty-fees').textContent = fmtUsd(rev.bountyFeesUsd || 0);
  $('rev-incubation-carry').textContent = fmtUsd(rev.incubationCarryUsd || 0);
  $('rev-billboard-ads').textContent = fmtUsd(rev.billboardAdsUsd || 0);
  $('rev-pro-skins').textContent = fmtUsd(rev.proSkinsUsd || 0);

  const histEl = $('rev-history-list');
  const history = rev.history || [];
  if (histEl) {
    if (history.length === 0) {
      histEl.innerHTML = `<div class="empty-state">${escapeHtml(t('revenue.historyEmpty'))}</div>`;
    } else {
      histEl.innerHTML = history
        .slice(0, 15)
        .map(
          (row) => `
          <div class="ledger-row">
            <div>
              <span class="badge cyan">${escapeHtml(localizeStreamLabel(row.stream, loc))}</span>
              <span style="margin-left: 6px;">${escapeHtml(localizeRevenueLabel(row.label, loc))}</span>
            </div>
            <div class="mono" style="display: flex; align-items: center; gap: 10px;">
              <strong style="color: var(--accent-green);">+${fmtUsd(row.amountUsd)}</strong>
              <span style="font-size: 10px; color: var(--text-muted);">${fmtTime(row.timestamp)}</span>
            </div>
          </div>
        `,
        )
        .join('');
    }
  }

  const lbEl = $('leaderboard-list');
  const lb = [...(app.state.leaderboard || [])].sort(
    (a, b) => (b.contributionPoints || 0) - (a.contributionPoints || 0),
  );
  if (lbEl) {
    lbEl.innerHTML = lb
      .map((row, idx) => {
        const lRow = localizeLeaderboardEntry(row, loc);
        const rank = idx + 1;
        const rankClass = rank <= 3 ? `top-${rank}` : '';
        const portraitMeta = rank <= 3 ? resolveLeaderboardPortrait(row, rank) : null;
        const crownTier = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const avatarHtml = portraitMeta
          ? `
            <div class="lb-avatar-badge ${rankClass}" title="Top ${rank}">
              <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(portraitMeta.roleClass)}" data-portrait-skin="${escapeHtml(portraitMeta.skin)}" data-portrait-anim="celebrate" data-portrait-crown="${crownTier}"></canvas>
              <span class="lb-crown-tag" aria-hidden="true">${TOP_RANK_CROWNS[rank - 1] || '🏅'}</span>
            </div>
          `
          : '';
        return `
          <div class="ledger-row" style="${row.isCurrentUser ? 'border-color: var(--accent-amber); background: rgba(255,183,77,0.08);' : ''}">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <span class="rank-badge ${rankClass}">#${rank}</span>
              ${avatarHtml}
              <div style="min-width: 0;">
                <strong>${escapeHtml(lRow.displayName)}</strong>
                <span class="mono" style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">${escapeHtml(row.handle || '')}</span>
                ${lRow.badge ? `<span class="badge amber" style="margin-left: 5px;">${escapeHtml(lRow.badge)}</span>` : ''}
              </div>
            </div>
            <div class="mono" style="display: flex; gap: 10px; align-items: center; font-size: 11px; flex-shrink: 0;">
              <span style="color: var(--accent-pink);">${escapeHtml(t('revenue.lbPoints', { pts: row.contributionPoints || 0 }))}</span>
              <span style="color: var(--accent-green);">${fmtUsd(row.earnedUsd || 0)}</span>
              <span style="color: var(--accent-cyan);">${escapeHtml(t('revenue.lbRep', { rep: row.reputation ?? 100 }))}</span>
            </div>
          </div>
        `;
      })
      .join('');
    hydrateWorkerPortraits(lbEl);
  }

  renderPayoutSection();
  renderMayorAdminSection();
}

function renderPayoutSection() {
  const player = app.state?.player || {};
  const balBadge = $('payout-balance-badge');
  if (balBadge) {
    balBadge.textContent = t('payout.balanceBadge', { amount: fmtUsd(player.usdBalance || 0) });
  }

  const walletStatus = $('wallet-bound-status');
  const boundAddr = player.walletAddress || app.user?.walletAddress || '';
  const boundChain = player.walletChain || app.user?.walletChain || '';
  if (walletStatus) {
    if (boundAddr && boundChain) {
      walletStatus.classList.add('bound');
      walletStatus.textContent = t('payout.boundStatus', {
        chain: boundChain.toUpperCase(),
        address: boundAddr,
      });
    } else {
      walletStatus.classList.remove('bound');
      walletStatus.textContent = t('payout.unboundStatus');
    }
  }

  const addrInput = $('wallet-address');
  const chainSelect = $('wallet-chain');
  if (addrInput && !addrInput.value && boundAddr) addrInput.value = boundAddr;
  if (chainSelect && boundChain) chainSelect.value = boundChain;

  const listEl = $('payout-history-list');
  if (!listEl) return;
  const payouts = app.adminData?.isAdmin && Array.isArray(app.adminData.payouts) && app.adminData.payouts.length > 0
    ? app.adminData.payouts
    : app.state?.payouts || [];

  if (payouts.length === 0) {
    listEl.innerHTML = `<div class="empty-state">${escapeHtml(t('payout.historyEmpty'))}</div>`;
    return;
  }

  const isFounder = Boolean(app.adminData?.isAdmin || app.user?.role === 'founder');
  listEl.innerHTML = payouts
    .slice(0, 12)
    .map((p) => {
      const isPaid = p.status === 'paid';
      return `
        <div class="ledger-row" style="flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="badge ${isPaid ? 'green' : 'amber'}">${escapeHtml(isPaid ? t('payout.statusPaid') : t('payout.statusPending'))}</span>
            <strong class="mono">${fmtUsd(p.amountUsd)} ${escapeHtml(p.token || 'USDC')}</strong>
            <span class="badge cyan">${escapeHtml((p.chain || '').toUpperCase())}</span>
            <span class="mono" style="font-size: 10px; color: var(--text-muted);">${escapeHtml(shortHash(p.address, 6, 4))}</span>
          </div>
          <div class="toolbar-group">
            ${p.txHash ? `<span class="mono" style="font-size: 10px; color: var(--accent-cyan);" title="${escapeHtml(p.txHash)}">Tx: ${escapeHtml(shortHash(p.txHash, 8, 6))}</span>` : ''}
            ${!isPaid && isFounder ? `<button type="button" class="btn btn-sm btn-green" data-mark-payout-paid="${escapeHtml(p.id)}">${escapeHtml(t('payout.markPaidBtn'))}</button>` : ''}
          </div>
        </div>
      `;
    })
    .join('');
}

function renderMayorAdminSection() {
  const section = $('mayor-admin-section');
  const body = $('mayor-admin-body');
  if (!section || !body) return;

  const isAdmin = app.adminData?.isAdmin !== false;
  section.style.display = isAdmin ? 'flex' : 'none';
  body.classList.toggle('collapsed', app.adminPanelCollapsed);

  const strictOn = Boolean(app.adminData?.strictDeviceReview ?? app.authConfig?.strictDeviceReview);
  const toggleEl = $('toggle-strict-device-review');
  const labelEl = $('strict-review-label');
  const badgeEl = $('strict-review-badge');
  if (toggleEl) toggleEl.checked = strictOn;
  if (labelEl) labelEl.classList.toggle('active', strictOn);
  if (badgeEl) badgeEl.textContent = strictOn ? t('admin.strictOn') : t('admin.strictOff');

  // Devices list
  const pending = app.adminData?.pendingDevices || [];
  const allDevices = app.adminData?.allDevices || pending;
  const countEl = $('admin-devices-count');
  if (countEl) countEl.textContent = String(pending.length);

  const devList = $('admin-devices-list');
  if (devList) {
    if (allDevices.length === 0) {
      devList.innerHTML = `<div class="empty-state">${escapeHtml(t('admin.devicesEmpty'))}</div>`;
    } else {
      devList.innerHTML = allDevices
        .slice(0, 12)
        .map((d) => {
          const isPending = d.status === 'pending_review';
          const statusText =
            d.status === 'approved'
              ? t('admin.deviceApproved')
              : d.status === 'rejected'
                ? t('admin.deviceRejected')
                : t('admin.devicePending');
          const statusCls = d.status === 'approved' ? 'green' : d.status === 'rejected' ? 'red' : 'amber';
          const toolsStr = (d.cliTools || []).join(', ');
          return `
            <div class="ledger-row" style="flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="badge ${statusCls}">${escapeHtml(statusText)}</span>
                <strong class="mono">${escapeHtml(d.code)}</strong>
                <span>${escapeHtml(d.deviceName || 'Device')} (${escapeHtml(d.os || 'OS')})</span>
                ${toolsStr ? `<span class="badge cyan">${escapeHtml(toolsStr)}</span>` : ''}
              </div>
              <div class="toolbar-group">
                ${
                  isPending
                    ? `<button type="button" class="btn btn-sm btn-green" data-review-device="${escapeHtml(d.code)}" data-review-action="approve">${escapeHtml(t('admin.approveBtn'))}</button>
                       <button type="button" class="btn btn-sm btn-danger" data-review-device="${escapeHtml(d.code)}" data-review-action="reject">${escapeHtml(t('admin.rejectBtn'))}</button>`
                    : `<span class="mono" style="font-size: 10px; color: var(--text-muted);">${escapeHtml(d.workerName || '')}</span>`
                }
              </div>
            </div>
          `;
        })
        .join('');
    }
  }

  // Redeem codes list
  const codesEl = $('admin-codes-list');
  const codes = app.adminData?.redeemCodes || [];
  if (codesEl) {
    if (codes.length === 0) {
      codesEl.innerHTML = `<div class="empty-state">${escapeHtml(t('admin.codesEmpty'))}</div>`;
    } else {
      codesEl.innerHTML = codes
        .slice(0, 12)
        .map(
          (c) => `
            <div class="ledger-row" style="flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="badge ${c.used ? '' : 'green'}">${escapeHtml(c.used ? t('admin.codeUsed') : t('admin.codeUnused'))}</span>
                <strong class="mono">${escapeHtml(c.code)}</strong>
                <span class="badge pink">${escapeHtml(c.rewardType)}</span>
                ${c.note ? `<span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(c.note)}</span>` : ''}
              </div>
              <button type="button" class="btn btn-sm" data-copy-redeem-code="${escapeHtml(c.code)}">${escapeHtml(t('admin.copyCodeBtn'))}</button>
            </div>
          `,
        )
        .join('');
    }
  }
}

// ============================================================================
// Core Interactive Flows
// ============================================================================
async function releaseClaimedTask(taskId, workerId, reason = 'BYOK aborted') {
  try {
    const relRes = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/release`, {
      method: 'POST',
      body: { workerId, reason },
    });
    if (relRes?.state) {
      applyNewState(relRes.state);
    }
  } catch {
    // Best-effort release
  }
}

async function dispatchApiTask(taskId, explicitWorkerId = null) {
  const loc = getLocale();
  const task = (app.state?.tasks || []).find((tk) => tk.id === taskId);
  if (!task) return;
  const workerId = explicitWorkerId || $('factory-worker-select')?.value;
  if (!workerId) {
    showToast(t('toast.needApiWorker'), 'warn');
    return;
  }
  if (app.busyWorkers.has(workerId)) {
    showToast(t('toast.workerBusy'), 'warn');
    return;
  }

  app.busyWorkers.add(workerId);
  let claimed = false;
  try {
    app.lastLocalMutationAt = Date.now();
    const claimRes = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/claim`, {
      method: 'POST',
      body: { workerId },
    });
    claimed = true;
    applyNewState(claimRes.state);
    soundFX.playDispatch();
    app.engine?.triggerWorkerDispatch(workerId, claimRes.task, claimRes.project);

    const cfg = getByokConfig();
    const lw = localizeWorker(claimRes.worker, loc);
    showToast(
      t('toast.dispatched', {
        worker: lw.name,
        mode: hasLiveApiKey(cfg) ? `BYOK ${cfg.model}` : t('toast.byokSimEngine'),
      }),
      'info',
    );

    const runRes = await runApiTask(claimRes.task, claimRes.worker, cfg, {
      project: claimRes.project,
      onProgress: (msg) => {
        const hint = $('stage-overlay-hint');
        if (hint) hint.textContent = `⚡ ${lw.name}: ${msg}`;
      },
    });

    if (!runRes.ok) {
      await releaseClaimedTask(taskId, workerId, runRes.error || 'BYOK failed');
      claimed = false;
      showToast(t('toast.byokFailedReleased', { err: runRes.error || 'BYOK failed' }), 'error', 5200);
      soundFX.playReject();
      return;
    }

    app.lastLocalMutationAt = Date.now();
    const submitRes = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/submit`, {
      method: 'POST',
      body: {
        workerId,
        content: runRes.content,
        tokensUsed: runRes.tokensUsed,
        executionMode: runRes.mode === 'live' ? `byok:${runRes.model}` : 'byok_simulated',
        notes: runRes.summary,
      },
    });
    claimed = false;
    applyNewState(submitRes.state);

    if (submitRes.passed) {
      soundFX.playVerify();
      setTimeout(() => soundFX.playCoin(), 220);
      app.engine?.triggerTaskComplete(workerId, submitRes.rewards);
      const r = submitRes.rewards;
      const bountyNote = r.bountyNetUsd > 0 ? t('toast.bountyNetNote', { net: r.bountyNetUsd }) : '';
      showToast(
        t('toast.taskPassed', {
          score: submitRes.verification.score,
          gold: r.gold,
          pts: r.contributionPoints,
          bounty: bountyNote,
        }),
        'success',
        4200,
      );
    } else {
      soundFX.playReject();
      showToast(t('toast.antiCheatFailed', { reason: submitRes.verification.reason }), 'error', 5000);
    }
  } catch (err) {
    if (claimed) {
      await releaseClaimedTask(taskId, workerId, err.message || 'Exception');
      claimed = false;
    }
    soundFX.playReject();
    showToast(t('toast.dispatchFailed', { err: err.message }), 'error', 4200);
  } finally {
    app.busyWorkers.delete(workerId);
    renderFactoryTab();
  }
}

// Auto-Pilot Loop for Idle API Workers
function setAutoPilot(enabled) {
  app.autoPilotOn = Boolean(enabled);
  const label = $('autopilot-label');
  if (label) label.classList.toggle('active', app.autoPilotOn);

  if (app.autoPilotTimer) {
    clearInterval(app.autoPilotTimer);
    app.autoPilotTimer = null;
  }

  if (app.autoPilotOn) {
    showToast(t('toast.autopilotOn'), 'success');
    runAutoPilotTick();
    app.autoPilotTimer = setInterval(runAutoPilotTick, 6000);
  } else {
    showToast(t('toast.autopilotOff'), 'info');
  }
}

async function runAutoPilotTick() {
  if (!app.autoPilotOn || !app.state) return;
  const idleApiWorker = (app.state.workers || []).find(
    (w) => w.track === 'api' && w.status === 'idle' && !app.busyWorkers.has(w.id) && (w.stamina || 0) >= 15,
  );
  if (!idleApiWorker) return;

  const openApiTask = (app.state.tasks || []).find(
    (tk) =>
      tk.track === 'api_auto' &&
      tk.status === 'open' &&
      idleApiWorker.stamina >= (tk.staminaCost || 12) &&
      (idleApiWorker.usedTokensToday || 0) + (tk.tokenCostEst || 0) <= (idleApiWorker.dailyTokenCap || 9999999),
  );
  if (!openApiTask) return;

  await dispatchApiTask(openApiTask.id, idleApiWorker.id);
}

// ============================================================================
// Guild Workbench (BYOT) Flow
// ============================================================================
async function openGuildWorkbench(taskId) {
  const loc = getLocale();
  const task = (app.state?.tasks || []).find((tk) => tk.id === taskId);
  if (!task) return;
  const workerId = task.assignedWorkerId || $('guild-worker-select')?.value;
  const project = (app.state?.projects || []).find((p) => p.id === task.projectId);

  if (task.status === 'open') {
    if (!workerId) {
      showToast(t('toast.needGuildWorker'), 'warn');
      return;
    }
    try {
      app.lastLocalMutationAt = Date.now();
      const claimRes = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/claim`, {
        method: 'POST',
        body: { workerId },
      });
      applyNewState(claimRes.state);
      soundFX.playDispatch();
      app.engine?.triggerWorkerDispatch(workerId, claimRes.task, claimRes.project);
      const lw = localizeWorker(claimRes.worker, loc);
      showToast(t('toast.guildClaimed', { worker: lw.name }), 'success');
    } catch (err) {
      soundFX.playReject();
      showToast(t('toast.claimFailed', { err: err.message }), 'error');
      return;
    }
  }

  const freshTask = (app.state?.tasks || []).find((tk) => tk.id === taskId) || task;
  const lt = localizeTask(freshTask, loc);
  const lp = project ? localizeProject(project, loc) : null;
  const assignedWorker = (app.state?.workers || []).find((w) => w.id === (freshTask.assignedWorkerId || workerId));
  const lw = assignedWorker ? localizeWorker(assignedWorker, loc) : null;
  app.activeGuildTaskId = freshTask.id;

  $('guild-modal-title').textContent = t('modal.guild.titleWithTask', { title: lt.title });
  $('guild-modal-meta').innerHTML = `
    <span class="badge">📦 ${escapeHtml(lp?.shortName || freshTask.projectId)}</span>
    <span class="badge cyan">${escapeHtml(t('modal.guild.workerBadge', { name: lw?.name || 'Worker' }))}</span>
    <span class="badge gold">🪙 +${freshTask.goldReward}G</span>
    <span class="badge pink">${escapeHtml(t('modal.guild.pointsBadge', { pts: freshTask.contributionPoints }))}</span>
    ${freshTask.cashBountyUsd > 0 ? `<span class="badge green">${escapeHtml(t('modal.guild.bountyBadge', { gross: freshTask.cashBountyUsd, net: (freshTask.cashBountyUsd * 0.9).toFixed(2) }))}</span>` : ''}
  `;

  const criteriaArr = Array.isArray(lt.acceptanceCriteria) ? lt.acceptanceCriteria : [];
  $('guild-modal-criteria').innerHTML = `
    <span><strong>${escapeHtml(t('modal.guild.criteriaPrefix'))}</strong>${escapeHtml(criteriaArr.join(' ｜ ') || t('modal.guild.criteriaFallback'))}</span>
  `;

  $('guild-context-pack').value = buildTaskPrompt(freshTask, project);

  const serverUrl = window.location.origin;
  const wid = assignedWorker?.id || 'w-pro-01';
  $('guild-cli-cmd').textContent = `node bin/pixel-worker.mjs --server ${serverUrl} --worker ${wid} --task ${freshTask.id}`;

  $('guild-submit-pr-url').value = '';
  $('guild-pr-verify-result').textContent = '';
  $('guild-submit-content').value = '';

  openModal('modal-guild');
}

async function simulateLocalCliDelivery() {
  const taskId = app.activeGuildTaskId;
  const task = (app.state?.tasks || []).find((tk) => tk.id === taskId);
  if (!task) return;
  const workerId = task.assignedWorkerId || $('guild-worker-select')?.value;
  const worker = (app.state?.workers || []).find((w) => w.id === workerId);
  const project = (app.state?.projects || []).find((p) => p.id === task.projectId);

  const btn = $('btn-guild-sim-cli');
  if (btn) btn.disabled = true;

  try {
    const loc = getLocale();
    const steps =
      loc === 'en'
        ? [
            { pct: 25, msg: 'Booting local Gemini CLI & loading Context Pack...' },
            { pct: 62, msg: 'Generating core implementation diff & edge-case tests...' },
            { pct: 95, msg: 'All local tests green — packaging deliverable report...' },
          ]
        : [
            { pct: 25, msg: '啟動本機 Gemini CLI 並載入 Context Pack...' },
            { pct: 62, msg: '正在生成核心實作 Diff 與邊界單元測試...' },
            { pct: 95, msg: '本機測試全數綠燈，準備打包交付報告...' },
          ];

    for (const s of steps) {
      await apiFetch('/api/cli/heartbeat', {
        method: 'POST',
        body: {
          workerId,
          taskId,
          status: 'working',
          progressPct: s.pct,
          message: s.msg,
          cliTool: 'gemini-cli-demo',
        },
      });
      await new Promise((r) => setTimeout(r, 420));
    }

    const deliverable = generateMockDeliverable(task, worker, project);
    $('guild-submit-content').value = deliverable;
    const prMatch = deliverable.match(/https:\/\/github\.com\/[^\s)]+\/pull\/\d+/i);
    if (prMatch) {
      $('guild-submit-pr-url').value = prMatch[0];
    }
    soundFX.playDispatch();
    showToast(t('toast.simCliDone'), 'success', 4500);
  } catch (err) {
    showToast(t('toast.simCliFailed', { err: err.message }), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function submitGuildTask() {
  const taskId = app.activeGuildTaskId;
  if (!taskId) return;
  const task = (app.state?.tasks || []).find((tk) => tk.id === taskId);
  const workerId = task?.assignedWorkerId || $('guild-worker-select')?.value;
  const content = $('guild-submit-content').value.trim();
  const prUrl = $('guild-submit-pr-url').value.trim();

  if (!content && !prUrl) {
    showToast(t('toast.needGuildContent'), 'warn');
    return;
  }

  const btn = $('btn-guild-submit');
  if (btn) btn.disabled = true;

  try {
    app.lastLocalMutationAt = Date.now();
    const res = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/submit`, {
      method: 'POST',
      body: {
        workerId,
        content,
        prUrl,
        executionMode: 'byot_workbench',
      },
    });
    applyNewState(res.state);

    if (res.passed) {
      soundFX.playVerify();
      setTimeout(() => soundFX.playCoin(), 220);
      app.engine?.triggerTaskComplete(workerId, res.rewards);
      closeModal('modal-guild');
      const r = res.rewards;
      const bountyNote =
        r.bountyNetUsd > 0 ? t('toast.bountyNetFeeNote', { net: r.bountyNetUsd, fee: r.platformFeeUsd }) : '';
      showToast(
        t('toast.guildPassed', {
          score: res.verification.score,
          gold: r.gold,
          pts: r.contributionPoints,
          bounty: bountyNote,
        }),
        'success',
        4800,
      );
    } else {
      soundFX.playReject();
      showToast(t('toast.guildIntercepted', { reason: res.verification.reason }), 'error', 5500);
      openTaskReportModal(taskId);
    }
  } catch (err) {
    soundFX.playReject();
    showToast(t('toast.submitFailed', { err: err.message }), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================================================
// Deliverable & Verifier Report Viewer
// ============================================================================
function openTaskReportModal(taskId) {
  const loc = getLocale();
  const task = (app.state?.tasks || []).find((tk) => tk.id === taskId);
  if (!task) return;
  const lt = localizeTask(task, loc);

  const verification = task.verification || task.lastRejectedVerification;
  const submission = task.submission;

  $('report-modal-title').textContent = t('modal.report.titleWithTask', { title: lt.title });
  $('report-summary-bar').innerHTML = `
    <span class="badge ${verification?.passed ? 'green' : 'red'}">${escapeHtml(verification?.passed ? t('modal.report.passed') : t('modal.report.rejected'))}</span>
    <span class="badge amber">${escapeHtml(t('modal.report.score', { score: verification?.score ?? 0 }))}</span>
    ${submission?.executionMode ? `<span class="badge cyan">${escapeHtml(t('modal.report.mode', { mode: submission.executionMode }))}</span>` : ''}
    ${submission?.prUrl ? `<span class="badge pink">PR: ${escapeHtml(submission.prUrl)}</span>` : ''}
  `;

  const checks = verification?.checks || [];
  $('report-checks-list').innerHTML = checks.length
    ? checks
        .map(
          (c) => `
          <div class="verifier-check-item ${c.passed ? '' : 'failed'}">
            <span><strong>${c.passed ? '✓' : '✕'} ${escapeHtml(c.name)}</strong></span>
            <span style="color: var(--text-sub);">${escapeHtml(c.detail)}</span>
          </div>
        `,
        )
        .join('')
    : `<div class="empty-state">${escapeHtml(t('modal.report.noChecks'))}</div>`;

  app.activeReportText = submission?.content || verification?.reason || t('modal.report.emptyContent');
  $('report-deliverable-code').textContent = app.activeReportText;
  openModal('modal-report');
}

// ============================================================================
// BYOK Settings Modal Logic
// ============================================================================
function syncByokModalFields() {
  const cfg = getByokConfig();
  $('byok-provider').value = cfg.provider;
  $('byok-api-key').value = cfg.apiKey;
  $('byok-model').value = cfg.model;
  $('byok-base-url').value = cfg.baseUrl;
  $('byok-max-tokens').value = cfg.maxTokensPerTask;
  $('byok-test-result').style.display = 'none';
  updateByokProviderUI(cfg.provider, cfg.model);
}

function updateByokProviderUI(provider, currentModel = '') {
  const presets = PRESET_MODELS[provider] || PRESET_MODELS.gemini;
  const presetSelect = $('byok-model-presets');
  presetSelect.innerHTML =
    `<option value="">${escapeHtml(t('modal.settings.presetsPlaceholder'))}</option>` +
    presets.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.label)}</option>`).join('');
  if (presets.some((m) => m.id === currentModel)) {
    presetSelect.value = currentModel;
  }
  $('byok-baseurl-wrap').style.display = provider === 'openai_compat' ? 'flex' : 'none';
}

function readByokFormValues() {
  return {
    provider: $('byok-provider').value,
    apiKey: $('byok-api-key').value.trim(),
    model: $('byok-model').value.trim() || 'gemini-2.5-flash',
    baseUrl: $('byok-base-url').value.trim() || 'https://openrouter.ai/api/v1',
    maxTokensPerTask: Number($('byok-max-tokens').value) || 2048,
  };
}

// ============================================================================
// SSE Real-Time Event Connection
// ============================================================================
function connectSse() {
  if (app.sse) {
    try {
      app.sse.close();
    } catch {
      // ignore
    }
  }

  const sse = new EventSource('/api/events');
  app.sse = sse;

  const setSseStatus = (state) => {
    app.sseState = state;
    const dot = $('sse-dot');
    if (dot) {
      dot.classList.remove('live', 'offline');
      if (state === 'live') dot.classList.add('live');
      if (state === 'offline') dot.classList.add('offline');
    }
    updateSseLabel();
  };

  sse.addEventListener('connected', () => {
    setSseStatus('live');
  });

  sse.addEventListener('cli_heartbeat', (evt) => {
    try {
      const data = JSON.parse(evt.data);
      app.engine?.triggerCliActivity(data.workerId, data.message || 'CLI syncing...');
      const hint = $('stage-overlay-hint');
      if (hint) {
        const pct = data.progressPct != null ? ` (${data.progressPct}%)` : '';
        hint.textContent = t('stage.cliHint', {
          name: data.workerName || 'Worker',
          msg: data.message,
          pct,
        });
      }
      scheduleBootstrapRefresh();
    } catch {
      // ignore
    }
  });

  sse.addEventListener('task_claimed', (evt) => {
    try {
      const isRecentLocal = Date.now() - app.lastLocalMutationAt < 500;
      const data = JSON.parse(evt.data);
      if (!isRecentLocal && data.worker?.id) {
        app.engine?.triggerWorkerDispatch(data.worker.id, data.task, data.project);
      }
      if (!isRecentLocal) scheduleBootstrapRefresh();
    } catch {
      // ignore
    }
  });

  sse.addEventListener('task_completed', (evt) => {
    try {
      const isRecentLocal = Date.now() - app.lastLocalMutationAt < 500;
      const data = JSON.parse(evt.data);
      if (!isRecentLocal && data.worker?.id) {
        app.engine?.triggerTaskComplete(data.worker.id, data.rewards || {});
      }
      if (!isRecentLocal) scheduleBootstrapRefresh();
    } catch {
      // ignore
    }
  });

  sse.addEventListener('project_launched', (evt) => {
    try {
      const isRecentLocal = Date.now() - app.lastLocalMutationAt < 500;
      const data = JSON.parse(evt.data);
      if (!isRecentLocal && data.project?.id) {
        app.engine?.triggerProjectLaunch(data.project.id);
      }
      if (!isRecentLocal) scheduleBootstrapRefresh();
    } catch {
      // ignore
    }
  });

  sse.addEventListener('achievement_unlocked', (evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (data?.achievement) {
        celebrateAchievement(data.achievement);
      }
      scheduleBootstrapRefresh();
    } catch {
      // ignore
    }
  });

  for (const evtName of [
    'tasks_imported',
    'payment_confirmed',
    'code_redeemed',
    'payout_requested',
    'payout_paid',
    'device_reviewed',
    'settings_updated',
    'state_sync',
  ]) {
    sse.addEventListener(evtName, () => {
      if (Date.now() - app.lastLocalMutationAt < 500) return;
      scheduleBootstrapRefresh();
    });
  }

  sse.addEventListener('world_reset', () => {
    resetTransientUiAfterWorldReset();
    scheduleBootstrapRefresh();
  });

  sse.onerror = () => {
    setSseStatus('offline');
  };
}

function scheduleBootstrapRefresh() {
  if (app.syncDebounceTimer) return;
  app.syncDebounceTimer = setTimeout(async () => {
    app.syncDebounceTimer = null;
    await refreshBootstrapNow();
  }, 240);
}

// ============================================================================
// Event Bindings
// ============================================================================
function bindEvents() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      soundFX.playClick();
      switchTab(btn.dataset.tab);
    });
  });

  // Quick HD scene nav chips (6 scenes)
  document.querySelectorAll('.quick-chip[data-scene]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const sceneId = chip.dataset.scene || chip.dataset.building;
      if (!sceneId) return;
      if (sceneId === 'town') selectScene('town', { syncTab: false });
      else selectScene(sceneId, { syncTab: true });
    });
  });

  // Auto-follow tab toggle for HD stage
  $('toggle-scene-sync').addEventListener('change', (e) => {
    app.autoFollowScene = Boolean(e.target.checked);
    try {
      localStorage.setItem(SCENE_SYNC_STORAGE_KEY, app.autoFollowScene ? '1' : '0');
    } catch {
      // ignore
    }
    syncAutoFollowUi();
    soundFX.playClick();
    if (app.autoFollowScene) {
      const mapped = TAB_TO_SCENE[app.activeTab];
      if (mapped) selectScene(mapped, { syncTab: false, silent: true });
      showToast(t('stage.syncOn'), 'success', 2600);
    } else {
      showToast(t('stage.syncOff'), 'info', 2600);
    }
  });

  // Activity feed filter chips
  document.querySelectorAll('.feed-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      soundFX.playClick();
      app.feedFilter = btn.dataset.feedFilter || 'all';
      document.querySelectorAll('.feed-filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderActivityFeed();
    });
  });

  // Modal close buttons & backdrop click
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('open');
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  // HUD controls
  $('hud-user-badge').addEventListener('click', () => openAuthModal('login'));

  $('btn-day-night').addEventListener('click', () => {
    app.dayNight = app.dayNight === 'night' ? 'day' : 'night';
    document.body.dataset.theme = app.dayNight;
    $('btn-day-night').textContent = app.dayNight === 'night' ? '🌙' : '☀️';
    app.engine?.setDayNight(app.dayNight);
    soundFX.playClick();
  });

  $('btn-sound-toggle').addEventListener('click', () => {
    const enabled = soundFX.toggle();
    $('btn-sound-toggle').textContent = enabled ? '🔊' : '🔇';
    showToast(enabled ? t('toast.soundOn') : t('toast.soundOff'), 'info', 1800);
  });

  $('btn-open-cert').addEventListener('click', openCertModal);
  $('btn-workers-preview-cert').addEventListener('click', openCertModal);
  $('btn-workers-download-cert').addEventListener('click', triggerDownloadCert);
  $('btn-modal-download-cert').addEventListener('click', triggerDownloadCert);

  $('btn-copy-share-text').addEventListener('click', () => {
    const p = app.state?.player || {};
    const text = t('modal.cert.shareText', {
      rep: p.reputation ?? 100,
      tasks: p.completedTasks ?? 0,
      usd: fmtUsd(p.usdBalance),
    });
    copyText(text, t('toast.shareCopied'));
  });

  $('btn-open-settings').addEventListener('click', () => {
    syncByokModalFields();
    openModal('modal-settings');
  });
  $('btn-byok-pill').addEventListener('click', () => {
    syncByokModalFields();
    openModal('modal-settings');
  });
  $('btn-factory-byok').addEventListener('click', () => {
    syncByokModalFields();
    openModal('modal-settings');
  });

  const handleLogoutClick = async () => {
    try {
      const res = await apiFetch('/api/auth/logout', { method: 'POST' });
      app.user = res.user;
      if (res.state) applyNewState(res.state, { silentAchievements: true });
      await refreshBootstrapNow({ silentAchievements: true });
      closeModal('auth-modal');
      showToast(t('toast.authLogoutOk'), 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  $('btn-logout').addEventListener('click', handleLogoutClick);
  $('auth-btn-logout').addEventListener('click', handleLogoutClick);

  // Auth Modal (#auth-modal) events
  document.querySelectorAll('#auth-modal [data-auth-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      soundFX.playClick();
      setAuthModalMode(btn.dataset.authMode);
    });
  });

  $('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('auth-email').value.trim();
    const password = $('auth-password').value;
    const displayName = $('auth-display-name').value.trim();
    const errEl = $('auth-error-msg');
    const submitBtn = $('auth-submit-btn');

    if (errEl) errEl.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;

    try {
      const isReg = app.authModalMode === 'register';
      const endpoint = isReg ? '/api/auth/register' : '/api/auth/login';
      const payload = isReg ? { email, password, displayName: displayName || undefined } : { email, password };
      const res = await apiFetch(endpoint, { method: 'POST', body: payload });
      app.user = res.user;
      if (res.state) {
        applyNewState(res.state, { silentAchievements: true });
        seedSeenAchievements(res.state);
      }
      await refreshBootstrapNow({ silentAchievements: true });
      $('auth-form').reset();
      closeModal('auth-modal');
      soundFX.playVerify();
      const locUser = localizeUser(res.user, getLocale());
      showToast(
        isReg ? t('toast.authRegisterOk', { name: locUser.displayName }) : t('toast.authLoginOk', { name: locUser.displayName }),
        'success',
      );
    } catch (err) {
      soundFX.playReject();
      if (errEl) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  $('auth-btn-demo').addEventListener('click', async () => {
    try {
      const res = await apiFetch('/api/auth/demo', { method: 'POST', body: {} });
      app.user = res.user;
      if (res.state) {
        applyNewState(res.state, { silentAchievements: true });
        seedSeenAchievements(res.state);
      }
      await refreshBootstrapNow({ silentAchievements: true });
      closeModal('auth-modal');
      soundFX.playClick();
      showToast(t('toast.authDemoOk'), 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Payment Modal (#payment-modal) events
  document.querySelectorAll('#payment-modal [data-pay-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      soundFX.playClick();
      setPaymentModalTab(btn.dataset.payTab);
    });
  });

  $('btn-pay-create-order').addEventListener('click', async () => {
    const chain = $('pay-chain').value;
    const token = $('pay-token').value;
    const btn = $('btn-pay-create-order');
    btn.disabled = true;
    showPaymentStatus('');
    try {
      const res = await apiFetch('/api/payments/stablecoin/create', {
        method: 'POST',
        body: {
          productId: app.payModal.productId,
          targetProjectId: app.payModal.targetProjectId || undefined,
          chain,
          token,
        },
      });
      app.payModal.activeStablecoinOrder = res.order;
      $('pay-receiver-addr').textContent = res.order.receiverAddress;
      $('pay-exact-amount').textContent = `${fmtUsd(res.order.amountUsd)} ${res.order.token} (${res.order.chain.toUpperCase()})`;
      $('pay-memo-code').textContent = res.order.memoCode;
      $('pay-order-box').style.display = 'flex';
      soundFX.playClick();
      showToast(t('toast.payOrderCreated'), 'info', 3800);
    } catch (err) {
      soundFX.playReject();
      showPaymentStatus(`❌ ${err.message}`, true);
    } finally {
      btn.disabled = false;
    }
  });

  $('btn-copy-pay-addr').addEventListener('click', () => {
    const addr = $('pay-receiver-addr').textContent.trim();
    if (addr) copyText(addr);
  });

  const confirmStablecoin = async (simulate) => {
    const order = app.payModal.activeStablecoinOrder;
    if (!order) return;
    const txHash = $('pay-tx-hash').value.trim();
    const verifyBtn = $('btn-pay-verify-tx');
    const simBtn = $('btn-pay-sim-tx');
    verifyBtn.disabled = true;
    simBtn.disabled = true;
    try {
      const res = await apiFetch('/api/payments/stablecoin/confirm', {
        method: 'POST',
        body: {
          orderId: order.id,
          txHash: simulate ? undefined : txHash,
          simulate,
        },
      });
      if (res.state) applyNewState(res.state);
      await refreshBootstrapNow();
      soundFX.playCoin();
      showToast(t('toast.payConfirmed'), 'success', 4500);
      closeModal('payment-modal');
    } catch (err) {
      soundFX.playReject();
      showPaymentStatus(`❌ ${err.message}`, true);
    } finally {
      verifyBtn.disabled = false;
      simBtn.disabled = false;
    }
  };

  $('btn-pay-verify-tx').addEventListener('click', () => confirmStablecoin(false));
  $('btn-pay-sim-tx').addEventListener('click', () => confirmStablecoin(true));

  const startCardCheckout = async (provider) => {
    showPaymentStatus('');
    try {
      const res = await apiFetch('/api/payments/checkout', {
        method: 'POST',
        body: {
          productId: app.payModal.productId,
          provider,
          targetProjectId: app.payModal.targetProjectId || undefined,
        },
      });
      if (res.checkoutUrl && !res.sandboxMode) {
        window.open(res.checkoutUrl, '_blank', 'noopener,noreferrer');
        showPaymentStatus(`🌐 ${provider.toUpperCase()} Checkout opened: ${res.checkoutUrl}`);
        return;
      }
      app.payModal.activeCardOrder = res.order;
      $('pay-card-sandbox-msg').textContent = t('pay.sandboxCardReady', {
        orderId: res.order.id,
        provider: provider.toUpperCase(),
        amount: fmtUsd(res.order.amountUsd),
      });
      $('pay-card-sandbox-box').style.display = 'flex';
      soundFX.playClick();
    } catch (err) {
      soundFX.playReject();
      showPaymentStatus(`❌ ${err.message}`, true);
    }
  };

  $('btn-pay-polar').addEventListener('click', () => startCardCheckout('polar'));
  $('btn-pay-stripe').addEventListener('click', () => startCardCheckout('stripe'));

  $('btn-pay-sandbox-complete').addEventListener('click', async () => {
    const order = app.payModal.activeCardOrder;
    if (!order) return;
    const btn = $('btn-pay-sandbox-complete');
    btn.disabled = true;
    try {
      const res = await apiFetch('/api/payments/sandbox/complete', {
        method: 'POST',
        body: { orderId: order.id },
      });
      if (res.state) applyNewState(res.state);
      await refreshBootstrapNow();
      soundFX.playCoin();
      showToast(t('toast.payConfirmed'), 'success', 4500);
      closeModal('payment-modal');
    } catch (err) {
      soundFX.playReject();
      showPaymentStatus(`❌ ${err.message}`, true);
    } finally {
      btn.disabled = false;
    }
  });

  document.querySelectorAll('[data-fill-redeem]').forEach((chip) => {
    chip.addEventListener('click', () => {
      $('pay-redeem-code').value = chip.dataset.fillRedeem;
      soundFX.playClick();
    });
  });

  $('pay-redeem-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = $('pay-redeem-code').value.trim();
    if (!code) return;
    const btn = $('btn-pay-redeem');
    btn.disabled = true;
    showPaymentStatus('');
    try {
      const res = await apiFetch('/api/payments/redeem', {
        method: 'POST',
        body: {
          code,
          targetProjectId: app.payModal.targetProjectId || undefined,
        },
      });
      if (res.state) applyNewState(res.state);
      await refreshBootstrapNow();
      soundFX.playCoin();
      showToast(t('toast.payRedeemOk', { detail: res.rewardSummary || res.code }), 'success', 4500);
      closeModal('payment-modal');
    } catch (err) {
      soundFX.playReject();
      showPaymentStatus(`❌ ${err.message}`, true);
    } finally {
      btn.disabled = false;
    }
  });

  // Stablecoin Wallet Bind & Payout forms
  $('wallet-bind-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const chain = $('wallet-chain').value;
    const address = $('wallet-address').value.trim();
    try {
      const res = await apiFetch('/api/wallet/bind', {
        method: 'POST',
        body: { chain, address },
      });
      if (res.state) applyNewState(res.state);
      await refreshBootstrapNow();
      soundFX.playVerify();
      showToast(t('toast.walletBound', { chain: chain.toUpperCase() }), 'success');
    } catch (err) {
      soundFX.playReject();
      showToast(err.message, 'error');
    }
  });

  const submitPayoutRequest = async (simulateInstant) => {
    const amountUsd = Number($('payout-amount').value);
    const token = $('payout-token').value;
    const chain = $('wallet-chain').value;
    try {
      const res = await apiFetch('/api/payouts/request', {
        method: 'POST',
        body: { amountUsd, chain, token, simulateInstant },
      });
      if (res.state) applyNewState(res.state);
      await refreshBootstrapNow();
      soundFX.playCoin();
      showToast(t('toast.payoutCreated', { amount: amountUsd.toFixed(2) }), 'success', 4200);
    } catch (err) {
      soundFX.playReject();
      showToast(err.message, 'error');
    }
  };

  $('payout-request-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitPayoutRequest(false);
  });

  $('btn-request-payout-instant').addEventListener('click', () => submitPayoutRequest(true));

  // Mayor Admin Controls
  $('btn-toggle-admin').addEventListener('click', () => {
    app.adminPanelCollapsed = !app.adminPanelCollapsed;
    renderMayorAdminSection();
    soundFX.playClick();
  });

  $('toggle-strict-device-review').addEventListener('change', async (e) => {
    const strictDeviceReview = Boolean(e.target.checked);
    try {
      const res = await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: { strictDeviceReview },
      });
      if (res.state) applyNewState(res.state);
      await refreshBootstrapNow();
      soundFX.playClick();
      showToast(
        t('toast.adminStrictChanged', { state: strictDeviceReview ? t('admin.strictOn') : t('admin.strictOff') }),
        'info',
      );
    } catch (err) {
      e.target.checked = !strictDeviceReview;
      soundFX.playReject();
      showToast(err.message, 'error');
    }
  });

  $('admin-code-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rewardType = $('admin-code-type').value;
    const count = Number($('admin-code-count').value) || 1;
    const note = $('admin-code-note').value.trim();
    try {
      const res = await apiFetch('/api/admin/codes/generate', {
        method: 'POST',
        body: { rewardType, count, note },
      });
      if (res.redeemCodes) app.adminData.redeemCodes = res.redeemCodes;
      if (res.state) applyNewState(res.state);
      await refreshBootstrapNow();
      $('admin-code-note').value = '';
      soundFX.playCoin();
      showToast(t('toast.adminCodesGenerated', { count: res.codes?.length || count }), 'success');
    } catch (err) {
      soundFX.playReject();
      showToast(err.message, 'error');
    }
  });

  // BYOK Modal interactions
  $('byok-provider').addEventListener('change', (e) => {
    const provider = e.target.value;
    const defaultModel = PRESET_MODELS[provider]?.[0]?.id || 'gemini-2.5-flash';
    $('byok-model').value = defaultModel;
    updateByokProviderUI(provider, defaultModel);
  });

  $('byok-model-presets').addEventListener('change', (e) => {
    if (e.target.value) $('byok-model').value = e.target.value;
  });

  $('btn-toggle-key-vis').addEventListener('click', () => {
    const input = $('byok-api-key');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  $('btn-test-byok').addEventListener('click', async () => {
    const resultBox = $('byok-test-result');
    resultBox.style.display = 'block';
    resultBox.textContent = t('toast.byokTesting');
    const res = await testConnection(readByokFormValues());
    resultBox.textContent = `${res.ok ? '✅' : '❌'} ${res.message}`;
    if (res.ok) soundFX.playVerify();
    else soundFX.playReject();
  });

  $('btn-save-byok').addEventListener('click', () => {
    saveByokConfig(readByokFormValues());
    renderByokIndicator();
    soundFX.playCoin();
    showToast(t('toast.byokSaved'), 'success');
    closeModal('modal-settings');
  });

  $('btn-clear-byok').addEventListener('click', () => {
    clearByokKey();
    syncByokModalFields();
    renderByokIndicator();
    showToast(t('toast.byokCleared'), 'info');
  });

  $('btn-copy-quick-cli').addEventListener('click', () => {
    copyText($('cli-quick-cmd').textContent, t('toast.cliCopied'));
  });

  // Factory filters & Auto-Pilot
  $('factory-project-filter').addEventListener('change', renderFactoryTab);
  $('factory-status-filter').addEventListener('change', renderFactoryTab);
  $('toggle-autopilot').addEventListener('change', (e) => setAutoPilot(e.target.checked));

  // Guild filters & Workbench actions
  $('guild-project-filter').addEventListener('change', renderGuildTab);
  $('btn-copy-context-pack').addEventListener('click', () => {
    copyText($('guild-context-pack').value, t('toast.contextPackCopied'));
  });
  $('btn-copy-cli-cmd').addEventListener('click', () => {
    copyText($('guild-cli-cmd').textContent, t('toast.pixelWorkerCopied'));
  });
  $('btn-guild-sim-cli').addEventListener('click', simulateLocalCliDelivery);
  $('btn-guild-submit').addEventListener('click', submitGuildTask);

  $('btn-verify-pr').addEventListener('click', async () => {
    const prUrl = $('guild-submit-pr-url').value.trim();
    const out = $('guild-pr-verify-result');
    if (!prUrl) {
      out.textContent = t('toast.prNeedUrl');
      return;
    }
    out.textContent = t('toast.prChecking');
    try {
      const res = await apiFetch('/api/github/verify-pr', {
        method: 'POST',
        body: { prUrl },
      });
      const remoteNote = res.remoteStatus?.title
        ? ` | ${res.remoteStatus.title} (${res.remoteStatus.merged ? 'merged' : res.remoteStatus.state})`
        : res.remoteStatus?.note
          ? ` | ${res.remoteStatus.note}`
          : '';
      out.textContent = t('toast.prValid', {
        owner: res.pr.owner,
        repo: res.pr.repo,
        num: res.pr.pullNumber,
        note: remoteNote,
      });
      soundFX.playVerify();
    } catch (err) {
      out.textContent = `❌ ${err.message}`;
      soundFX.playReject();
    }
  });

  // Report copy
  $('btn-copy-report').addEventListener('click', () => {
    copyText(app.activeReportText, t('toast.reportCopied'));
  });

  // Propose Project Modal & Form
  $('btn-open-propose').addEventListener('click', () => openModal('modal-propose'));
  $('propose-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('propose-name').value.trim();
    const desc = $('propose-desc').value.trim();
    const category = $('propose-category').value;
    const bountyPoolUsd = Number($('propose-bounty').value) || 0;
    const repoUrl = $('propose-repo').value.trim();

    try {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        body: {
          name,
          tagline: desc,
          description: `[${category}] ${desc}`,
          bountyPoolUsd,
          repoUrl,
        },
      });
      applyNewState(res.state);
      soundFX.playVerify();
      $('propose-form').reset();
      closeModal('modal-propose');
      showToast(t('toast.proposed', { name: res.project.name }), 'success');
    } catch (err) {
      soundFX.playReject();
      showToast(t('toast.proposeFailed', { err: err.message }), 'error');
    }
  });

  // Recruit Worker Form
  $('recruit-role').addEventListener('change', (e) => {
    const tpl = (app.workerTemplates || []).find((item) => item.roleClass === e.target.value);
    if (tpl) {
      const lw = localizeWorker({ roleClass: tpl.roleClass, providerLabel: tpl.defaultProvider }, getLocale());
      $('recruit-provider').value = lw.providerLabel || tpl.defaultProvider;
      $('recruit-cap').value = tpl.defaultCap;
    }
  });

  $('recruit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('recruit-name').value.trim();
    const roleClass = $('recruit-role').value;
    const providerLabel = $('recruit-provider').value.trim();
    const dailyTokenCap = Number($('recruit-cap').value) || 300000;

    try {
      const res = await apiFetch('/api/workers', {
        method: 'POST',
        body: { name, roleClass, providerLabel, dailyTokenCap },
      });
      applyNewState(res.state);
      soundFX.playVerify();
      $('recruit-name').value = '';
      showToast(t('toast.recruited', { name: res.worker.name }), 'success');
    } catch (err) {
      soundFX.playReject();
      showToast(t('toast.recruitFailed', { err: err.message }), 'error');
    }
  });

  // Trilingual live language switcher (100% synced across DOM + Canvas + Cert)
  document.querySelectorAll('#lang-switch [data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLocale(lang);
      document.querySelectorAll('#lang-switch [data-lang]').forEach((b) => {
        b.classList.toggle('active', b.dataset.lang === lang);
      });
      applyI18n();
      if (app.engine && typeof app.engine.setLocale === 'function') {
        app.engine.setLocale(lang);
      }
      updateSceneHint(app.activeScene);
      updateSseLabel();
      renderAll();
      soundFX.playClick();
      showToast(t('toast.langSwitched'), 'info', 2200);
    });
  });

  // Collapsible 3-step onboarding bar & step shortcuts
  $('btn-toggle-onboarding').addEventListener('click', () => {
    app.onboardingCollapsed = !app.onboardingCollapsed;
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, app.onboardingCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
    renderOnboardingBar();
    soundFX.playClick();
  });

  document.querySelectorAll('[data-onboarding-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.onboardingJump;
      soundFX.playClick();
      if (target === 'factory') switchTab('factory');
      else if (target === 'incubator') switchTab('incubator');
      else if (target === 'cert') openCertModal();
    });
  });

  // Incubator quick-jump to GitHub Issue importer
  $('btn-incubator-jump-import').addEventListener('click', () => {
    soundFX.playClick();
    switchTab('guild');
    $('gh-import-repo')?.focus();
  });

  // GitHub Public Repo Issue Importer form
  $('github-import-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const repoUrl = $('gh-import-repo').value.trim();
    const track = $('gh-import-track').value || 'guild_bounty';
    const projectId = $('gh-import-project').value || '';
    const resultEl = $('gh-import-result');
    const submitBtn = $('btn-gh-import');
    if (!repoUrl) return;

    if (submitBtn) submitBtn.disabled = true;
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.textContent = t('toast.ghImporting');
    }

    try {
      app.lastLocalMutationAt = Date.now();
      const res = await apiFetch('/api/github/import-issues', {
        method: 'POST',
        body: {
          repoUrl,
          track,
          projectId: projectId || undefined,
          maxIssues: 3,
        },
      });
      applyNewState(res.state);
      soundFX.playVerify();
      const modeTag = res.fallbackUsed
        ? t('toast.ghModeFallback', { reason: res.fallbackReason || 'rate-limit' })
        : t('toast.ghModeReal');
      const lp = res.project ? localizeProject(res.project, getLocale()) : null;
      const summary = t('toast.ghImported', {
        repo: res.repo?.fullName || repoUrl,
        count: res.importedCount,
        project: lp?.shortName || lp?.name || repoUrl,
        mode: modeTag,
      });
      if (resultEl) resultEl.textContent = summary;
      showToast(summary, 'success', 4800);
      $('gh-import-repo').value = '';
      if (track === 'api_auto') switchTab('factory');
    } catch (err) {
      soundFX.playReject();
      if (resultEl) resultEl.textContent = `❌ ${err.message}`;
      showToast(t('toast.ghImportFailed', { err: err.message }), 'error', 4200);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Reset world button
  $('btn-reset-world').addEventListener('click', async () => {
    if (!window.confirm(t('toast.resetConfirm'))) return;
    try {
      setAutoPilot(false);
      $('toggle-autopilot').checked = false;
      app.lastLocalMutationAt = Date.now();
      const res = await apiFetch('/api/reset', { method: 'POST' });
      resetTransientUiAfterWorldReset();
      applyNewState(res.state, { silentAchievements: true });
      seedSeenAchievements(res.state);
      await refreshBootstrapNow({ silentAchievements: true });
      soundFX.playClick();
      showToast(t('toast.resetDone'), 'info');
    } catch (err) {
      showToast(t('toast.resetFailed', { err: err.message }), 'error');
    }
  });

  // Delegated click handlers for dynamically rendered lists
  document.addEventListener('click', async (e) => {
    const loc = getLocale();

    const stripWorkerBtn = e.target.closest('[data-select-strip-worker]');
    if (stripWorkerBtn) {
      const wid = stripWorkerBtn.dataset.selectStripWorker;
      const w = (app.state?.workers || []).find((x) => x.id === wid);
      if (w) {
        const lw = localizeWorker(w, loc);
        soundFX.playClick();
        const hint = $('stage-overlay-hint');
        if (hint) {
          hint.textContent = t('stage.workerHint', {
            name: lw.name,
            level: w.level,
            stamina: w.stamina,
            maxStamina: w.maxStamina,
            msg: lw.lastMessage || t('stage.idleFallback'),
          });
        }
        const sel = $(w.track === 'api' ? 'factory-worker-select' : 'guild-worker-select');
        if (sel) sel.value = w.id;
      }
      return;
    }

    const inspectBtn = e.target.closest('[data-inspect-task]');
    if (inspectBtn) {
      openTaskReportModal(inspectBtn.dataset.inspectTask);
      return;
    }

    const dispatchBtn = e.target.closest('[data-dispatch-api]');
    if (dispatchBtn) {
      dispatchApiTask(dispatchBtn.dataset.dispatchApi);
      return;
    }

    const guildBtn = e.target.closest('[data-open-guild]');
    if (guildBtn) {
      openGuildWorkbench(guildBtn.dataset.openGuild);
      return;
    }

    const voteBtn = e.target.closest('[data-vote-project]');
    if (voteBtn) {
      const pid = voteBtn.dataset.voteProject;
      try {
        const res = await apiFetch(`/api/projects/${encodeURIComponent(pid)}/vote`, { method: 'POST' });
        applyNewState(res.state);
        const lp = localizeProject(res.project, loc);
        if (res.unlocked) {
          soundFX.playLaunch();
          showToast(t('toast.voteUnlocked', { name: lp.shortName }), 'success', 5000);
        } else {
          soundFX.playClick();
          showToast(t('toast.voteOk', { name: lp.shortName, votes: res.project.votes, req: res.project.votesRequired }), 'info');
        }
      } catch (err) {
        soundFX.playReject();
        showToast(err.message, 'error');
      }
      return;
    }

    // Billboard ad opens 3-in-1 Payment Modal ($29)
    const billboardBtn = e.target.closest('[data-billboard-project]');
    if (billboardBtn) {
      const pid = billboardBtn.dataset.billboardProject;
      const proj = (app.state?.projects || []).find((p) => p.id === pid);
      const lp = proj ? localizeProject(proj, loc) : null;
      const billItem = localizeShopItem({ id: 'billboard-ad' }, loc);
      const price = app.config?.billboardPriceUsd ?? 29;
      openPaymentModal({
        productId: 'billboard-ad',
        targetProjectId: pid,
        displayName: `${billItem.name}${lp ? ` · ${lp.shortName}` : ''}`,
        priceUsd: price,
      });
      return;
    }

    const launchBtn = e.target.closest('[data-launch-project]');
    if (launchBtn) {
      const pid = launchBtn.dataset.launchProject;
      try {
        app.lastLocalMutationAt = Date.now();
        const res = await apiFetch(`/api/projects/${encodeURIComponent(pid)}/launch`, {
          method: 'POST',
          body: { initialRevenueUsd: 200 },
        });
        applyNewState(res.state);
        soundFX.playLaunch();
        app.engine?.triggerProjectLaunch(pid);
        const lp = localizeProject(res.project, loc);
        showToast(
          t('toast.launchOk', {
            name: lp.shortName,
            gross: res.dividend.grossRevenueUsd,
            share: res.dividend.playerShareUsd,
            carry: res.dividend.platformCarryUsd,
          }),
          'success',
          6000,
        );
      } catch (err) {
        soundFX.playReject();
        showToast(err.message, 'error');
      }
      return;
    }

    const simRevBtn = e.target.closest('[data-sim-revenue]');
    if (simRevBtn) {
      const pid = simRevBtn.dataset.simRevenue;
      try {
        const res = await apiFetch(`/api/projects/${encodeURIComponent(pid)}/simulate-revenue`, {
          method: 'POST',
          body: { amountUsd: 100 },
        });
        applyNewState(res.state);
        soundFX.playCoin();
        const lp = localizeProject(res.project, loc);
        showToast(
          t('toast.simRevOk', {
            name: lp.shortName,
            gross: res.dividend.grossRevenueUsd,
            share: res.dividend.playerShareUsd,
            carry: res.dividend.platformCarryUsd,
          }),
          'success',
          4800,
        );
      } catch (err) {
        soundFX.playReject();
        showToast(err.message, 'error');
      }
      return;
    }

    const restBtn = e.target.closest('[data-rest-worker]');
    if (restBtn) {
      const wid = restBtn.dataset.restWorker;
      try {
        const res = await apiFetch(`/api/workers/${encodeURIComponent(wid)}`, {
          method: 'PATCH',
          body: { recoverStamina: true, resetDailyUsage: true },
        });
        applyNewState(res.state);
        soundFX.playCoin();
        const lw = localizeWorker(res.worker, loc);
        showToast(t('toast.coffeeOk', { name: lw.name }), 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    const saveCapBtn = e.target.closest('[data-save-cap]');
    if (saveCapBtn) {
      const wid = saveCapBtn.dataset.saveCap;
      const input = document.querySelector(`[data-cap-input="${CSS.escape(wid)}"]`);
      const dailyTokenCap = Number(input?.value);
      try {
        const res = await apiFetch(`/api/workers/${encodeURIComponent(wid)}`, {
          method: 'PATCH',
          body: { dailyTokenCap },
        });
        applyNewState(res.state);
        soundFX.playClick();
        const lw = localizeWorker(res.worker, loc);
        showToast(t('toast.capSaved', { name: lw.name, cap: res.worker.dailyTokenCap.toLocaleString() }), 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    // Shop buy: USD items open 3-in-1 Payment Modal; Gold items purchase directly
    const buyBtn = e.target.closest('[data-buy-item]');
    if (buyBtn) {
      const itemId = buyBtn.dataset.buyItem;
      const item = (app.shopItems || []).find((it) => it.id === itemId);
      if (item && item.priceUsd > 0) {
        const li = localizeShopItem(item, loc);
        const mappedProductId =
          item.id === 'pro-pass-monthly'
            ? 'shop-pro-pass'
            : item.id === 'founder-skin-bundle'
              ? 'shop-genesis-pack'
              : item.id;
        openPaymentModal({
          productId: mappedProductId,
          displayName: li.name,
          priceUsd: item.priceUsd,
        });
        return;
      }

      const firstWorkerId = app.state?.workers?.[0]?.id || null;
      try {
        const res = await apiFetch('/api/shop/buy', {
          method: 'POST',
          body: { itemId, workerId: firstWorkerId },
        });
        applyNewState(res.state);
        soundFX.playCoin();
        const li = localizeShopItem(res.item, loc);
        showToast(t('toast.shopBought', { name: li.name }), 'success');
      } catch (err) {
        soundFX.playReject();
        showToast(err.message, 'error');
      }
      return;
    }

    // Admin: mark payout paid (sandbox simulate)
    const markPaidBtn = e.target.closest('[data-mark-payout-paid]');
    if (markPaidBtn) {
      const pid = markPaidBtn.dataset.markPayoutPaid;
      try {
        const res = await apiFetch(`/api/admin/payouts/${encodeURIComponent(pid)}/mark-paid`, {
          method: 'POST',
          body: { simulate: true },
        });
        if (res.state) applyNewState(res.state);
        await refreshBootstrapNow();
        soundFX.playVerify();
        showToast(t('toast.payoutPaid'), 'success');
      } catch (err) {
        soundFX.playReject();
        showToast(err.message, 'error');
      }
      return;
    }

    // Admin: approve/reject device
    const reviewBtn = e.target.closest('[data-review-device]');
    if (reviewBtn) {
      const code = reviewBtn.dataset.reviewDevice;
      const action = reviewBtn.dataset.reviewAction;
      try {
        const res = await apiFetch(`/api/admin/devices/${encodeURIComponent(code)}/review`, {
          method: 'POST',
          body: { action },
        });
        if (res.state) applyNewState(res.state);
        await refreshBootstrapNow();
        soundFX.playVerify();
        showToast(
          t('toast.adminDeviceReviewed', {
            code,
            action: action === 'approve' ? t('admin.approveBtn') : t('admin.rejectBtn'),
          }),
          'success',
        );
      } catch (err) {
        soundFX.playReject();
        showToast(err.message, 'error');
      }
      return;
    }

    // Admin: copy generated redeem code
    const copyCodeBtn = e.target.closest('[data-copy-redeem-code]');
    if (copyCodeBtn) {
      copyText(copyCodeBtn.dataset.copyRedeemCode);
      return;
    }
  });

  // Delegated change handler for worker skin selector
  document.addEventListener('change', async (e) => {
    const skinSelect = e.target.closest('[data-skin-select]');
    if (!skinSelect) return;
    const loc = getLocale();
    const wid = skinSelect.dataset.skinSelect;
    const skin = skinSelect.value;
    try {
      const res = await apiFetch(`/api/workers/${encodeURIComponent(wid)}`, {
        method: 'PATCH',
        body: { skin },
      });
      applyNewState(res.state);
      soundFX.playClick();
      const lw = localizeWorker(res.worker, loc);
      showToast(t('toast.skinChanged', { worker: lw.name, skin: localizeSkinLabel(skin, loc) }), 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ============================================================================
// Bootstrap Application
// ============================================================================
async function init() {
  const initialLang = getLocale();
  setLocale(initialLang);
  document.querySelectorAll('#lang-switch [data-lang]').forEach((b) => {
    b.classList.toggle('active', b.dataset.lang === initialLang);
  });
  applyI18n();

  bindEvents();
  syncAutoFollowUi();

  const canvas = $('town-canvas');
  if (canvas) {
    app.engine = new PixelTownEngine(canvas, {
      onSelectBuilding: (buildingId) => focusBuilding(buildingId),
      onSceneChange: (sceneId) => {
        if (!sceneId || !VALID_SCENES.has(sceneId)) return;
        const shouldSyncTab = Boolean(SCENE_TO_TAB[sceneId]);
        selectScene(sceneId, { syncTab: shouldSyncTab, fromEngine: true, silent: true });
      },
      onSelectTask: (taskId) => {
        const loc = getLocale();
        const task = (app.state?.tasks || []).find((tk) => tk.id === taskId);
        if (!task) return;
        const lt = localizeTask(task, loc);
        soundFX.playClick();
        if (task.status === 'completed') {
          openTaskReportModal(task.id);
        } else if (task.track === 'guild_bounty') {
          switchTab('guild');
          openGuildWorkbench(task.id);
        } else {
          switchTab('factory');
          const hint = $('stage-overlay-hint');
          if (hint) hint.textContent = t('stage.taskSelectedHint', { title: lt.title });
        }
      },
      onSelectWorker: (workerId) => {
        const loc = getLocale();
        const w = (app.state?.workers || []).find((x) => x.id === workerId);
        if (!w) return;
        const lw = localizeWorker(w, loc);
        soundFX.playClick();
        const hint = $('stage-overlay-hint');
        if (hint) {
          hint.textContent = t('stage.workerHint', {
            name: lw.name,
            level: w.level,
            stamina: w.stamina,
            maxStamina: w.maxStamina,
            msg: lw.lastMessage || t('stage.idleFallback'),
          });
        }
        const sel = $(w.track === 'api' ? 'factory-worker-select' : 'guild-worker-select');
        if (sel) sel.value = w.id;
      },
    });
    app.engine.setDayNight(app.dayNight);
    if (typeof app.engine.setLocale === 'function') {
      app.engine.setLocale(initialLang);
    }
    if (typeof app.engine.setScene === 'function') {
      app.engine.setScene(app.activeScene);
    }
    syncSceneChipsUI(app.activeScene);
    updateSceneHint(app.activeScene);
  }

  try {
    const data = await apiFetch('/api/bootstrap');
    seedSeenAchievements(data.state);
    applyBootstrapPayload(data, { silentAchievements: true });
    connectSse();

    const params = new URLSearchParams(window.location.search);
    const authParam = params.get('auth');
    if (authParam) {
      const locUser = localizeUser(app.user, getLocale());
      if (authParam === 'github_ok') {
        showToast(t('toast.authGithubOk', { name: locUser.displayName }), 'success');
      } else if (authParam === 'google_ok') {
        showToast(t('toast.authGoogleOk', { name: locUser.displayName }), 'success');
      } else if (authParam === 'google_unconfigured') {
        showToast(t('toast.authGoogleUnconfigured'), 'warn', 5000);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  } catch (err) {
    showToast(t('toast.serverError', { err: err.message }), 'error', 6000);
  }
}

init();
