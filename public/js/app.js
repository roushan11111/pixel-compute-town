/**
 * PixelCompute Town v1.0 — 前端主控制器
 * 完整整合：100% 全站三語在地化、多用戶帳號註冊登入、三合一收付結帳（穩定幣 / 信用卡 / 兌換碼）、
 * 穩定幣分紅提領、鎮長裝置審核與卡密生成、SSE 即時同步、HD 像素引擎、8-bit 音效、打工證 PNG 與 BYOK 執行器。
 */

import { PixelTownEngine } from './pixelEngine.js';
import { renderWorkerPortrait } from './sprites.js';
import { soundFX } from './sound.js';
import { BGM_TRACKS, SCENE_TRACK_MAP, bgmPlayer } from './bgm.js';
import { createTutorialController } from './tutorial.js';
import {
  renderWorkCertificate,
  downloadWorkCertificate,
  renderIdeaCertificate,
  downloadIdeaCertificate,
} from './certCard.js';
import {
  applyI18n,
  getLocale,
  localizeAchievement,
  localizeFeedMessage,
  localizeLeaderboardEntry,
  localizeProject,
  localizeRedeemNote,
  localizeRevenueLabel,
  localizeReviewItem,
  localizeRoleLabel,
  localizeServerMessage,
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
    peerReviewRequired: false,
    pendingDevices: [],
    allDevices: [],
    redeemCodes: [],
    payouts: [],
  },
  metrics: null,
  metricsError: false,
  cooldownTimer: null,
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
  apiAudienceFilter: 'all',
  guildAudienceFilter: 'all',
  tutorial: null,
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
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  })(),
  adminPanelCollapsed: true,
  reviewerEligibility: null,
  openTaskGroups: new Set(),
  closedTaskGroups: new Set(),
  expandedTaskGroups: new Set(),
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
  // Provenance modal runtime state
  provModal: {
    projectId: null,
    chainInfo: null,
    verifyData: null,
  },
  // Propose anti-copycat runtime state
  proposeCheck: {
    timer: null,
    topMatch: null,
    isHighRisk: false,
    isWarning: false,
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

function fmtUtcShort(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return `${d.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
  } catch {
    return String(iso);
  }
}

function shortHash(str, head = 8, tail = 6) {
  if (!str) return '';
  const s = String(str);
  return s.length > head + tail + 3 ? `${s.slice(0, head)}...${s.slice(-tail)}` : s;
}

function fmtUptime(totalSec) {
  const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  if (mins > 0) return `${mins}m ${String(rem).padStart(2, '0')}s`;
  return `${rem}s`;
}

function getWorkerCooldownRemainingSec(worker) {
  if (!worker?.cooldownUntil) return 0;
  const untilMs =
    typeof worker.cooldownUntil === 'number'
      ? worker.cooldownUntil
      : new Date(worker.cooldownUntil).getTime();
  if (!Number.isFinite(untilMs)) return 0;
  const diff = Math.ceil((untilMs - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}

function syncWorkerCooldownTicker() {
  const workers = app.state?.workers || [];
  const hasCooldown = workers.some((w) => getWorkerCooldownRemainingSec(w) > 0);
  if (hasCooldown && !app.cooldownTimer) {
    app.cooldownTimer = setInterval(() => {
      const stillCooling = (app.state?.workers || []).some((w) => getWorkerCooldownRemainingSec(w) > 0);
      renderWorkersAndShopTab();
      renderStageStatus();
      if (!stillCooling && app.cooldownTimer) {
        clearInterval(app.cooldownTimer);
        app.cooldownTimer = null;
      }
    }, 1000);
  } else if (!hasCooldown && app.cooldownTimer) {
    clearInterval(app.cooldownTimer);
    app.cooldownTimer = null;
  }
}

function getPeerReviewRequiredFlag() {
  return Boolean(
    app.state?.settings?.peerReviewRequired ??
      app.authConfig?.peerReviewRequired ??
      app.adminData?.peerReviewRequired ??
      false,
  );
}

function getTaskBucketSafe(task) {
  if (task?.poolBucket === 'core' || task?.poolBucket === 'peripheral') {
    return task.poolBucket;
  }
  if (
    task?.track === 'guild_bounty' ||
    ['feature_pr', 'architecture', 'bugfix'].includes(task?.category)
  ) {
    return 'core';
  }
  return 'peripheral';
}

function getTaskStakeSafe(task) {
  if (typeof task?.stakeGold === 'number' && Number.isFinite(task.stakeGold)) {
    return task.stakeGold;
  }
  if (task?.track === 'guild_bounty') {
    return (task.cashBountyUsd || 0) > 0 ? 30 : 25;
  }
  return 0;
}

function getTaskMinRepSafe(task) {
  if (typeof task?.minReputation === 'number' && Number.isFinite(task.minReputation)) {
    return task.minReputation;
  }
  return task?.track === 'guild_bounty' ? 60 : 0;
}

function isLiveProductionMode() {
  return Boolean(
    app.state?.settings?.liveProductionMode ??
      app.authConfig?.liveProductionMode ??
      app.config?.liveProductionMode ??
      false,
  );
}

function shouldHideSandboxControls() {
  return isLiveProductionMode() && !app.adminData?.isAdmin;
}

function syncLiveModeSandboxControls() {
  const live = isLiveProductionMode();
  const hide = shouldHideSandboxControls();
  ['btn-pay-sim-tx', 'btn-pay-sandbox-complete', 'btn-request-payout-instant'].forEach((id) => {
    const el = $(id);
    if (el) el.style.display = hide ? 'none' : '';
  });

  // Hide public demo redeem codes in Live Production Mode
  const demoCodesWrap = $('pay-demo-codes-wrap');
  if (demoCodesWrap) {
    demoCodesWrap.style.display = live ? 'none' : '';
  }

  // Optional external Redeem Store link (Afdian / Ko-fi — supports per-product deep links)
  const storeBtn = $('btn-pay-redeem-store');
  const activeProdId = app.payModal?.productId || null;
  const storeUrl = (
    (activeProdId && app.paymentConfig?.afdianUrls?.[activeProdId])
    || app.paymentConfig?.afdianUrls?.default
    || app.paymentConfig?.redeemStoreUrl
    || ''
  ).trim();
  if (storeBtn) {
    if (storeUrl && /^https?:\/\//i.test(storeUrl)) {
      storeBtn.href = storeUrl;
      storeBtn.style.display = 'inline-flex';
    } else {
      storeBtn.style.display = 'none';
    }
  }

  // Card tab: show only configured providers in Live Mode, or honest "coming soon" notice
  const polarOn = Boolean(app.paymentConfig?.polarEnabled);
  const stripeOn = Boolean(app.paymentConfig?.stripeEnabled);
  const polarBtn = $('btn-pay-polar');
  const stripeBtn = $('btn-pay-stripe');
  const cardNotice = $('pay-card-live-notice');
  const cardDesc = $('pay-card-desc');
  if (live) {
    if (polarBtn) polarBtn.style.display = polarOn ? '' : 'none';
    if (stripeBtn) stripeBtn.style.display = stripeOn ? '' : 'none';
    const neither = !polarOn && !stripeOn;
    if (cardNotice) cardNotice.style.display = neither ? 'flex' : 'none';
    if (cardDesc) cardDesc.style.display = neither ? 'none' : '';
  } else {
    if (polarBtn) polarBtn.style.display = '';
    if (stripeBtn) stripeBtn.style.display = '';
    if (cardNotice) cardNotice.style.display = 'none';
    if (cardDesc) cardDesc.style.display = '';
  }
}

function getTaskAudienceSafe(task) {
  if (task?.audience === 'beginner' || task?.audience === 'dev') {
    return task.audience;
  }
  if (task?.id === 'task-meta-slogan' || task?.id === 'task-meta-ux') {
    return 'beginner';
  }
  if (task?.category === 'docs' && !(Number(task?.cashBountyUsd) > 0)) {
    return 'beginner';
  }
  return 'dev';
}

function renderAudienceBadge(task) {
  const aud = getTaskAudienceSafe(task);
  if (aud === 'beginner') {
    return `<span class="badge beginner-pill">${escapeHtml(t('audience.badgeBeginner'))}</span>`;
  }
  return `<span class="badge dev-pill">${escapeHtml(t('audience.badgeDev'))}</span>`;
}

function renderCashBountyBadge(grossUsd, variant = 'factory') {
  const gross = Number(grossUsd) || 0;
  if (gross <= 0) return '';
  const live = isLiveProductionMode();
  const modeLabel = live ? t('bounty.liveEscrowTag') : t('bounty.demoTag');
  const cls = live ? 'bounty-live' : 'bounty-demo';
  const net = Number((gross * 0.9).toFixed(2));
  const fee = Number((gross * 0.1).toFixed(2));

  let mainText = '';
  if (variant === 'guild') {
    mainText = t('guild.bountyNetFee', { gross, net, fee });
  } else if (variant === 'modal') {
    mainText = t('modal.guild.bountyBadge', { gross, net: net.toFixed(2) });
  } else {
    mainText = `💵 $${gross} ($${net.toFixed(2)} ${t('factory.netSuffix')})`;
  }
  return `<span class="badge ${cls}">${escapeHtml(mainText)} <span class="bounty-mode-chip">${escapeHtml(modeLabel)}</span></span>`;
}

function syncAudienceFilterButtons(containerId, activeValue) {
  const bar = $(containerId);
  if (!bar) return;
  bar.querySelectorAll('[data-audience-filter]').forEach((btn) => {
    const isActive = btn.dataset.audienceFilter === activeValue;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function setAudienceFilters(value) {
  const normalized = value === 'beginner' || value === 'dev' ? value : 'all';
  app.apiAudienceFilter = normalized;
  app.guildAudienceFilter = normalized;
  syncAudienceFilterButtons('filter-api-audience', normalized);
  syncAudienceFilterButtons('filter-guild-audience', normalized);
  if (app.state) {
    renderFactoryTab();
    renderGuildTab();
  }
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
    const rawMsg = data?.error || `HTTP ${res.status}`;
    const err = new Error(localizeServerMessage(rawMsg, getLocale()) || rawMsg);
    err.status = res.status;
    err.data = data;
    throw err;
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
  if (data.reviewerEligibility) app.reviewerEligibility = data.reviewerEligibility;
  if (app.engine && app.state) {
    app.engine.syncState(app.state);
  }
  if (app.tutorial) {
    app.tutorial.setClaimed(
      Boolean(app.state?.player?.tutorialBonusClaimed || app.user?.tutorialBonusClaimed),
    );
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
  if (app.tutorial) {
    app.tutorial.setClaimed(Boolean(app.state?.player?.tutorialBonusClaimed));
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

  if (bgmPlayer && typeof bgmPlayer.syncScene === 'function' && SCENE_TRACK_MAP[normalized]) {
    bgmPlayer.syncScene(normalized);
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
      if (tabName === 'revenue') refreshMetricsNow();
      return;
    }
  }
  if (tabName === 'revenue') refreshMetricsNow();
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

function isSignedInUser() {
  const u = app.user || app.state?.player || {};
  return Boolean(u.isAuthenticated || (u.authMode && u.authMode !== 'demo'));
}

function openAuthModal(defaultMode = 'login') {
  setAuthModalMode(defaultMode);
  renderAuthModalStatus();
  openModal('auth-modal');
}

// ============================================================================
// Personal Profile & Project History Modal (#profile-modal)
// ============================================================================
function setProfileModalTab(tab) {
  const next = ['participated', 'published', 'history'].includes(tab) ? tab : 'participated';
  app.profileActiveTab = next;
  document.querySelectorAll('#profile-modal [data-profile-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.profileTab === next);
  });
  document.querySelectorAll('#profile-modal [data-profile-pane]').forEach((pane) => {
    pane.classList.toggle('active', pane.dataset.profilePane === next);
  });
}

function fmtProfileTime(iso) {
  if (!iso) return '—';
  try {
    const loc = getLocale();
    return new Date(iso).toLocaleString(loc === 'en' ? 'en-US' : loc, { hour12: false });
  } catch {
    return String(iso);
  }
}

function renderProfileProjectCard(proj, mode = 'participated') {
  const loc = getLocale();
  const lp = localizeProject(proj, loc);
  const statusLabel =
    proj.status === 'launched'
      ? t('profile.statusLaunched')
      : proj.status === 'building'
        ? t('profile.statusBuilding')
        : t('profile.statusVoting');
  const statusCls = proj.status === 'launched' ? 'green' : proj.status === 'building' ? 'cyan' : 'amber';

  const roleKey =
    proj.myRole === 'originator'
      ? 'profile.roleOriginator'
      : proj.myRole === 'contributor'
        ? 'profile.roleContributor'
        : proj.myRole === 'co_builder'
          ? 'profile.roleCoBuilder'
          : 'profile.roleParticipant';
  const roleCls = proj.myRole === 'originator' ? 'pink' : proj.myRole === 'contributor' ? 'green' : 'cyan';

  const progressText =
    proj.status === 'voting'
      ? `${proj.votes}/${proj.votesRequired}`
      : `${proj.progressPct}%`;
  const shortHash = proj.ideaHash ? `#${String(proj.ideaHash).slice(0, 10)}` : '';

  return `
    <article class="profile-project-card">
      <div class="profile-project-head">
        <div>
          <div class="profile-project-title">${escapeHtml(lp.name || proj.name)}</div>
          ${lp.tagline ? `<div class="profile-project-tagline">${escapeHtml(lp.tagline)}</div>` : ''}
        </div>
        <div class="badge-row" style="gap: 4px;">
          <span class="badge ${statusCls}">${escapeHtml(statusLabel)} (${escapeHtml(progressText)})</span>
          <span class="badge ${roleCls}">${escapeHtml(t(roleKey))}</span>
        </div>
      </div>
      <div class="profile-project-meta mono">
        <span>${escapeHtml(t('profile.metaPoints', { pts: proj.myPoints || 0, core: proj.myCorePoints || 0, periph: proj.myPeripheralPoints || 0 }))}</span>
        <span>${escapeHtml(t('profile.metaTasks', { count: proj.myTasksCompleted || 0 }))}</span>
        <span>${escapeHtml(t('profile.metaCoBuilders', { count: proj.coBuildersCount || 1 }))}</span>
        ${proj.totalRevenueUsd > 0 ? `<span style="color: var(--accent-gold);">${escapeHtml(t('profile.metaRevenue', { usd: Number(proj.totalRevenueUsd).toFixed(2) }))}</span>` : ''}
        ${proj.myDividendUsd > 0 ? `<span style="color: var(--accent-green);">${escapeHtml(t('profile.metaDividend', { usd: Number(proj.myDividendUsd).toFixed(2) }))}</span>` : ''}
        ${mode === 'published' && shortHash ? `<span style="color: var(--accent-cyan);">POFS ${escapeHtml(shortHash)}</span>` : ''}
      </div>
      <div class="profile-project-actions">
        <button type="button" class="btn btn-sm" data-profile-jump-project="${escapeHtml(proj.id)}">${escapeHtml(t('profile.btnViewInTown'))}</button>
        <a class="btn btn-sm btn-primary" href="/p/${encodeURIComponent(proj.id)}" target="_blank" rel="noopener">${escapeHtml(t('profile.btnPublicPage'))} ↗</a>
        ${proj.ideaHash ? `<a class="btn btn-sm" href="/verify/${encodeURIComponent(proj.ideaHash)}" target="_blank" rel="noopener">${escapeHtml(t('profile.btnVerifyHash'))} ↗</a>` : ''}
      </div>
    </article>
  `;
}

function renderProfileHistoryItem(item) {
  const typeLabel =
    item.type === 'originated'
      ? t('profile.histOriginated')
      : item.type === 'task_completed'
        ? t('profile.histTaskCompleted')
        : item.type === 'dividend'
          ? t('profile.histDividend')
          : t('profile.histPayout');

  const deltas = [];
  if (item.goldDelta > 0) deltas.push(`<span style="color: var(--accent-gold);">+${item.goldDelta}G</span>`);
  if (item.pointsDelta > 0) deltas.push(`<span style="color: var(--accent-cyan);">+${item.pointsDelta} pts</span>`);
  if (item.usdDelta > 0) deltas.push(`<span style="color: var(--accent-green);">+$${Number(item.usdDelta).toFixed(2)}</span>`);
  if (item.usdDelta < 0) deltas.push(`<span style="color: var(--accent-amber);">-$${Math.abs(Number(item.usdDelta)).toFixed(2)}</span>`);

  let extraTag = '';
  if (item.type === 'payout') {
    extraTag = item.status === 'paid'
      ? `<span class="badge green">${escapeHtml(t('profile.payoutPaid'))}</span>`
      : `<span class="badge amber">${escapeHtml(t('profile.payoutPending'))}</span>`;
  } else if (item.type === 'originated' && item.ideaHash) {
    extraTag = `<a class="mono" style="font-size:10.5px;color:var(--accent-cyan);" href="/verify/${encodeURIComponent(item.ideaHash)}" target="_blank" rel="noopener">#${escapeHtml(String(item.ideaHash).slice(0, 10))} ↗</a>`;
  }

  return `
    <div class="profile-history-item type-${escapeHtml(item.type || 'info')}">
      <div class="profile-history-left">
        <div class="profile-history-title">${escapeHtml(typeLabel)} · ${escapeHtml(item.title || '')}</div>
        <div class="profile-history-sub mono">
          ${item.projectName ? `<span>${escapeHtml(item.projectName)}</span> · ` : ''}
          <span>${escapeHtml(fmtProfileTime(item.timestamp))}</span>
          ${item.txHash ? ` · Tx: ${escapeHtml(String(item.txHash).slice(0, 12))}...` : ''}
        </div>
      </div>
      <div class="profile-history-right mono">
        <div>${deltas.join(' ')}</div>
        ${extraTag}
      </div>
    </div>
  `;
}

function renderProfileModal(data) {
  if (!data || !data.profile) return;
  const p = data.profile;
  const loc = getLocale();
  const locUser = localizeUser(p, loc);

  const avatarEl = $('profile-avatar-icon');
  if (avatarEl) {
    avatarEl.textContent = p.authMode === 'github' ? '🐙' : p.authMode === 'google' ? '🌐' : p.authMode === 'email' ? '✉️' : '🧑‍💻';
  }
  const nameEl = $('profile-display-name');
  if (nameEl) nameEl.textContent = locUser.displayName || p.displayName;

  const modeKey =
    p.authMode === 'github'
      ? 'auth.modeGithub'
      : p.authMode === 'google'
        ? 'auth.modeGoogle'
        : p.authMode === 'email'
          ? 'auth.modeEmail'
          : 'auth.modeDemo';
  const authBadge = $('profile-auth-badge');
  if (authBadge) authBadge.textContent = t(modeKey);

  const roleBadge = $('profile-role-badge');
  if (roleBadge) {
    roleBadge.style.display = 'inline-flex';
    roleBadge.textContent = p.isFounderAdmin || p.role === 'founder' ? t('profile.roleFounder') : t('profile.roleCitizen');
  }

  const proBadge = $('profile-pro-badge');
  if (proBadge) proBadge.style.display = p.isPro ? 'inline-flex' : 'none';

  const titleBadge = $('profile-title-badge');
  if (titleBadge) {
    if (p.title) {
      titleBadge.style.display = 'inline-flex';
      titleBadge.textContent = p.title;
    } else {
      titleBadge.style.display = 'none';
    }
  }

  const adminBtn = $('btn-profile-admin');
  if (adminBtn) adminBtn.style.display = p.isFounderAdmin ? 'inline-flex' : 'none';

  const metaEl = $('profile-meta-line');
  if (metaEl) {
    const parts = [`@${p.username || p.id}`];
    if (p.email) parts.push(p.email);
    parts.push(t('profile.joinedAt', { date: fmtProfileTime(p.createdAt) }));
    metaEl.textContent = parts.join(' · ');
  }

  const editNameInput = $('profile-edit-name');
  if (editNameInput) editNameInput.value = p.displayName || '';
  const editTitleSelect = $('profile-edit-title');
  if (editTitleSelect) {
    const titles = Array.isArray(p.unlockedTitles) ? p.unlockedTitles : [];
    if (titles.length > 0) {
      editTitleSelect.style.display = '';
      editTitleSelect.innerHTML = [
        `<option value="">${escapeHtml(t('profile.noTitleOption'))}</option>`,
        ...titles.map((ti) => `<option value="${escapeHtml(ti.name)}" ${p.title === ti.name ? 'selected' : ''}>${escapeHtml(ti.name)}</option>`),
      ].join('');
    } else {
      editTitleSelect.style.display = 'none';
    }
  }

  const statsGrid = $('profile-stats-grid');
  if (statsGrid) {
    const walletMain = p.walletAddress
      ? `${String(p.walletChain || '').toUpperCase()} · ${t('profile.walletBound')}`
      : t('profile.walletUnbound');
    const walletSub = p.walletAddress
      ? `${p.walletAddress.slice(0, 8)}...${p.walletAddress.slice(-6)}`
      : t('profile.walletUnboundSub');
    statsGrid.innerHTML = `
      <div class="profile-stat-card">
        <div class="profile-stat-label">${escapeHtml(t('profile.statGold'))}</div>
        <div class="profile-stat-val mono" style="color: var(--accent-gold);">${Number(p.gold || 0).toLocaleString()} G</div>
        <div class="profile-stat-sub">${escapeHtml(t('profile.statWorkersAch', { workers: p.workersCount || 0, unlocked: p.achievementsUnlocked || 0, total: p.achievementsTotal || 6 }))}</div>
      </div>
      <div class="profile-stat-card">
        <div class="profile-stat-label">${escapeHtml(t('profile.statUsd'))}</div>
        <div class="profile-stat-val mono" style="color: var(--accent-green);">$${Number(p.usdBalance || 0).toFixed(2)}</div>
        <div class="profile-stat-sub">USDC / USDT</div>
      </div>
      <div class="profile-stat-card">
        <div class="profile-stat-label">${escapeHtml(t('profile.statContribution'))}</div>
        <div class="profile-stat-val mono" style="color: var(--accent-cyan);">${Number(p.totalContribution || 0).toLocaleString()} pts</div>
        <div class="profile-stat-sub">${escapeHtml(t('profile.statTasks'))}: ${Number(p.completedTasks || 0)}</div>
      </div>
      <div class="profile-stat-card">
        <div class="profile-stat-label">${escapeHtml(t('profile.statRep'))}</div>
        <div class="profile-stat-val mono">${Number(p.reputation ?? 100)}</div>
        <div class="profile-stat-sub">PoAW Verified</div>
      </div>
      <div class="profile-stat-card" style="grid-column: span 2;">
        <div class="profile-stat-label">${escapeHtml(t('profile.statWallet'))}</div>
        <div class="profile-stat-val mono" style="font-size: 13px; color: ${p.walletAddress ? 'var(--accent-green)' : 'var(--accent-amber)'};">${escapeHtml(walletMain)}</div>
        <div class="profile-stat-sub mono">${escapeHtml(walletSub)}</div>
      </div>
    `;
  }

  const participated = Array.isArray(data.participatedProjects) ? data.participatedProjects : [];
  const published = Array.isArray(data.publishedProjects) ? data.publishedProjects : [];
  const history = Array.isArray(data.projectHistory) ? data.projectHistory : [];

  const cpEl = $('profile-count-participated');
  if (cpEl) cpEl.textContent = String(participated.length);
  const cpubEl = $('profile-count-published');
  if (cpubEl) cpubEl.textContent = String(published.length);
  const chEl = $('profile-count-history');
  if (chEl) chEl.textContent = String(history.length);

  const partList = $('profile-participated-list');
  if (partList) {
    partList.innerHTML = participated.length
      ? participated.map((proj) => renderProfileProjectCard(proj, 'participated')).join('')
      : `<div class="empty-state">${escapeHtml(t('profile.emptyParticipated'))}</div>`;
  }

  const pubList = $('profile-published-list');
  if (pubList) {
    pubList.innerHTML = published.length
      ? published.map((proj) => renderProfileProjectCard(proj, 'published')).join('')
      : `
        <div class="empty-state">
          <div>${escapeHtml(t('profile.emptyPublished'))}</div>
          <button type="button" class="btn btn-sm btn-green" style="margin-top: 10px;" data-profile-jump-propose="1">${escapeHtml(t('profile.emptyPublishedCta'))}</button>
        </div>
      `;
  }

  const histList = $('profile-history-list');
  if (histList) {
    histList.innerHTML = history.length
      ? history.map((item) => renderProfileHistoryItem(item)).join('')
      : `<div class="empty-state">${escapeHtml(t('profile.emptyHistory'))}</div>`;
  }

  const logoutBtn = $('btn-profile-logout');
  if (logoutBtn) {
    logoutBtn.style.display = p.isAuthenticated || (p.authMode && p.authMode !== 'demo') ? 'inline-flex' : 'none';
  }
}

async function openProfileModal(initialTab = 'participated') {
  setProfileModalTab(initialTab);
  const editForm = $('profile-edit-form');
  if (editForm) editForm.style.display = 'none';
  const partList = $('profile-participated-list');
  if (partList && !app.profileData) {
    partList.innerHTML = `<div class="empty-state">${escapeHtml(t('profile.loading'))}</div>`;
  }
  openModal('profile-modal');
  try {
    const res = await apiFetch('/api/profile/me');
    if (res && res.ok) {
      app.profileData = res;
      renderProfileModal(res);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
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
  syncLiveModeSandboxControls();
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
  syncLiveModeSandboxControls();
  if (app.profileData && $('profile-modal')?.classList.contains('open')) {
    renderProfileModal(app.profileData);
  }
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
  const userBadgeBtn = $('hud-user-badge');
  if (userBadgeBtn) {
    userBadgeBtn.title = isSignedIn ? t('profile.hudUserTitleLoggedIn') : t('hud.userTitle');
  }
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
        const cdSec = getWorkerCooldownRemainingSec(w);
        const icon = cdSec > 0 ? '⏳' : isWorking ? '⚡' : '☕';
        const cdSuffix = cdSec > 0 ? ` · ${cdSec}s` : '';
        return `
          <button type="button" class="worker-strip-pill ${isWorking ? 'working' : ''}" data-select-strip-worker="${escapeHtml(w.id)}" title="${escapeHtml(lw.name)} · ${escapeHtml(lw.roleName)}">
            <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(w.roleClass || 'flash_worker')}" data-portrait-skin="${escapeHtml(w.skin || 'default')}" data-portrait-anim="${isWorking ? 'work' : 'idle'}"></canvas>
            <span>${icon} ${escapeHtml(lw.name)} Lv.${w.level} (${w.stamina}/${w.maxStamina})${escapeHtml(cdSuffix)}</span>
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

function formatLeaseRemaining(iso) {
  if (!iso) return '';
  const diffMs = Date.parse(iso) - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return '<1m';
  const totalMin = Math.ceil(diffMs / 60_000);
  if (totalMin < 60) return `${totalMin}m`;
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function renderGroupedTaskFolders(trackKey, tasks, projectMap, renderCardFn, loc) {
  const MAX_INITIAL_PER_GROUP = 3;
  const groups = new Map();
  for (const tk of tasks) {
    const pid = tk.projectId || 'misc';
    if (!groups.has(pid)) groups.set(pid, []);
    groups.get(pid).push(tk);
  }

  const statusOrder = { in_progress: 0, open: 1, pending_review: 2, completed: 3 };
  const entries = [...groups.entries()];

  return entries
    .map(([pid, list], idx) => {
      const sorted = [...list].sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
      const proj = projectMap.get(pid);
      const lp = proj ? localizeProject(proj, loc) : null;
      const groupName = lp?.shortName || lp?.name || pid;
      const gKey = `${trackKey}:${pid}`;

      const openCnt = sorted.filter((x) => x.status === 'open').length;
      const workingCnt = sorted.filter((x) => x.status === 'in_progress').length;
      const doneCnt = sorted.filter((x) => x.status === 'completed').length;
      const bountySum = sorted
        .filter((x) => x.status !== 'completed')
        .reduce((s, x) => s + (Number(x.cashBountyUsd) || 0), 0);

      // Default: only 1st group open (or any group with an active in-progress task), honoring user's manual toggles
      const defaultOpen = idx === 0 || workingCnt > 0;
      const isOpen = app.openTaskGroups.has(gKey)
        ? true
        : app.closedTaskGroups.has(gKey)
          ? false
          : defaultOpen;
      const isExpanded = app.expandedTaskGroups.has(gKey);
      const visibleTasks = isExpanded ? sorted : sorted.slice(0, MAX_INITIAL_PER_GROUP);
      const hiddenCount = Math.max(0, sorted.length - visibleTasks.length);

      return `
        <details class="task-group-folder" data-task-group="${escapeHtml(gKey)}" ${isOpen ? 'open' : ''}>
          <summary class="task-group-summary">
            <div class="task-group-left">
              <span class="task-group-chevron">▸</span>
              <span>📦 ${escapeHtml(groupName)}</span>
            </div>
            <div class="task-group-counts">
              ${workingCnt > 0 ? `<span class="badge cyan">${escapeHtml(t('task.groupWorkingCount', { count: workingCnt }))}</span>` : ''}
              ${openCnt > 0 ? `<span class="badge amber">${escapeHtml(t('task.groupOpenCount', { count: openCnt }))}</span>` : ''}
              ${doneCnt > 0 ? `<span class="badge green">${escapeHtml(t('task.groupDoneCount', { count: doneCnt }))}</span>` : ''}
              ${bountySum > 0 ? `<span class="badge gold">$${bountySum.toFixed(0)}</span>` : ''}
            </div>
          </summary>
          <div class="task-group-body">
            ${visibleTasks.map((tk) => renderCardFn(tk)).join('')}
            ${
              sorted.length > MAX_INITIAL_PER_GROUP
                ? `<button type="button" class="btn btn-sm btn-expand-group" data-expand-group="${escapeHtml(gKey)}">
                    ${escapeHtml(isExpanded ? t('task.collapseExtra') : t('task.expandMore', { count: hiddenCount }))}
                  </button>`
                : ''
            }
          </div>
        </details>
      `;
    })
    .join('');
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
  const selectedAud = app.apiAudienceFilter || 'all';
  syncAudienceFilterButtons('filter-api-audience', selectedAud);
  const projectMap = new Map((app.state.projects || []).map((p) => [p.id, p]));
  const workerMap = new Map((app.state.workers || []).map((w) => [w.id, w]));

  const tasks = (app.state.tasks || []).filter((tk) => {
    if (tk.track !== 'api_auto') return false;
    if (selectedProj !== 'all' && tk.projectId !== selectedProj) return false;
    if (selectedStatus === 'open' && tk.status !== 'open' && tk.status !== 'in_progress') return false;
    if (selectedStatus === 'completed' && tk.status !== 'completed') return false;
    if (selectedAud !== 'all' && getTaskAudienceSafe(tk) !== selectedAud) return false;
    return true;
  });

  const listEl = $('factory-task-list');
  if (!listEl) return;

  if (tasks.length === 0) {
    const emptyMsg = selectedAud === 'beginner' ? t('audience.emptyBeginner') : t('factory.empty');
    listEl.innerHTML = `<div class="empty-state">${escapeHtml(emptyMsg)}</div>`;
    return;
  }

  const renderFactoryCard = (task) => {
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

      const bucket = getTaskBucketSafe(task);
      const bucketBadge =
        bucket === 'core'
          ? `<span class="badge core-pool">${escapeHtml(t('gov.bucketCore'))}</span>`
          : `<span class="badge periph-pool">${escapeHtml(t('gov.bucketPeripheral'))}</span>`;
      const stakeGold = getTaskStakeSafe(task);
      const minRep = getTaskMinRepSafe(task);

      return `
        <article class="pixel-card ${isWorking ? 'in-progress' : ''}">
          <div class="card-head">
            <div>
              <h3 class="card-title">${escapeHtml(lt.title)}</h3>
              <p class="card-subtitle clamp-2">${escapeHtml(lt.description || '')}</p>
            </div>
            ${statusBadge}
          </div>
          ${workerChipHtml}
          <div class="badge-row">
            ${renderAudienceBadge(task)}
            <span class="badge">📦 ${escapeHtml(lp?.shortName || task.projectId)}</span>
            ${task.cashBountyUsd > 0 ? renderCashBountyBadge(task.cashBountyUsd, 'factory') : bucketBadge}
          </div>
          <details class="card-details">
            <summary>${escapeHtml(t('card.detailsToggle'))}</summary>
            <div class="card-details-body">
              <div class="badge-row">
                ${bucketBadge}
                <span class="badge cyan">🤖 ${escapeHtml(lt.modelSuggestion || task.modelSuggestion || 'gemini-2.5-flash')}</span>
                <span class="badge">⚡ ${(task.tokenCostEst || 0).toLocaleString()} tok / -${task.staminaCost || 12}</span>
                ${stakeGold > 0 ? `<span class="badge stake-pill">${escapeHtml(t('gov.stakeTag', { gold: stakeGold }))}</span>` : ''}
                ${minRep > 0 ? `<span class="badge">${escapeHtml(t('gov.minRepTag', { rep: minRep }))}</span>` : ''}
                <span class="badge">${escapeHtml(task.category)} ｜ +${task.progressWeight || 15}%</span>
              </div>
            </div>
          </details>
          <div class="card-footer">
            <span class="card-reward-line">
              <span style="color: var(--accent-gold);">🪙 +${task.goldReward}G</span>
              <span style="color: var(--accent-pink);">✨ +${task.contributionPoints} pt</span>
            </span>
            <div class="toolbar-group">
              ${isWorking && task.claimExpiresAt ? `<span class="lease-countdown-pill">${escapeHtml(t('task.leaseLeft', { time: formatLeaseRemaining(task.claimExpiresAt) }))}</span>` : ''}
              ${isWorking ? `<button type="button" class="btn btn-sm" data-release-task="${escapeHtml(task.id)}">${escapeHtml(t('task.releaseBtn'))}</button>` : ''}
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
  };
  listEl.innerHTML = renderGroupedTaskFolders('factory', tasks, projectMap, renderFactoryCard, loc);
  hydrateWorkerPortraits(listEl);
}

function renderReviewQueuePanel() {
  const loc = getLocale();
  const listEl = $('review-queue-list');
  const badgeEl = $('review-queue-badge');
  const histWrap = $('review-history-wrap');
  const histEl = $('review-history-list');
  if (!listEl) return;

  const rawQueue = Array.isArray(app.state?.reviewQueue) ? app.state.reviewQueue : [];
  const pendingItems = rawQueue.filter((item) => item && item.status !== 'approved' && item.status !== 'rejected');

  if (badgeEl) {
    badgeEl.textContent = t('review.pendingBadge', { count: pendingItems.length });
    badgeEl.className = `badge ${pendingItems.length > 0 ? 'red review-badge-pulse has-items' : 'green'}`;
  }

  const reviewDetailsEl = $('review-queue-details');
  if (reviewDetailsEl && !reviewDetailsEl.dataset.userToggled) {
    // Keep collapsed by default so Guild bounties are visible immediately without clutter
    reviewDetailsEl.open = false;
  }

  const elig = app.reviewerEligibility;
  const eligBarHtml = elig
    ? `<div class="reviewer-elig-bar ${elig.eligible ? '' : 'locked'}">
        <span><strong>${escapeHtml(t('review.eligPrefix'))}</strong> ${escapeHtml(elig.tierLabel || '')}</span>
        ${!elig.eligible ? `<span class="mono" style="font-size:10.5px;">${escapeHtml(t('review.eligHintLocked'))}</span>` : ''}
      </div>`
    : '';

  if (pendingItems.length === 0) {
    listEl.innerHTML = `${eligBarHtml}<div class="empty-state">${escapeHtml(t('review.empty'))}</div>`;
  } else {
    const tasks = app.state?.tasks || [];
    const projects = app.state?.projects || [];

    listEl.innerHTML = eligBarHtml + pendingItems
      .map((item) => {
        const lr = localizeReviewItem(item, loc, { tasks, projects });
        const ai = item.aiReview || item.aiReport || item.blindReview || {};
        const aiScore = Number(ai.aiScore ?? item.aiScore ?? 80);
        const riskLevel =
          ai.riskLevel || item.riskLevel || (aiScore >= 70 ? 'low' : aiScore >= 45 ? 'medium' : 'high');
        const diffAdd = Number(ai.diffLinesAdded ?? item.diffLinesAdded ?? 0);
        const diffRem = Number(ai.diffLinesRemoved ?? item.diffLinesRemoved ?? 0);
        const bloatPct = Number(ai.bloatRatioPct ?? item.bloatRatioPct ?? 0);
        const stakeGold = Number(item.stakeGold ?? item.stakedGold ?? 0);
        const bucket = item.poolBucket === 'peripheral' ? 'peripheral' : 'core';

        const cardCls = riskLevel === 'high' ? 'slop-risk' : riskLevel === 'medium' ? 'med-risk' : 'clean-pr';
        const aiBadgeText =
          riskLevel === 'high'
            ? t('review.aiScoreSlop', { score: aiScore })
            : riskLevel === 'medium'
              ? t('review.aiScoreMed', { score: aiScore })
              : t('review.aiScoreGood', { score: aiScore });

        const rejectLabel =
          stakeGold > 0
            ? t('review.rejectBtnWithStake', { stake: stakeGold })
            : t('review.rejectBtn');

        const flagsHtml = (lr.flags || []).length
          ? `<div class="review-flags-row">${lr.flags
              .map((f) => `<span class="badge ${riskLevel === 'high' ? 'red' : riskLevel === 'medium' ? 'amber' : 'green'}">${escapeHtml(f)}</span>`)
              .join('')}</div>`
          : '';

        const prLine = item.prUrl ? `\nPR: ${item.prUrl}` : '';

        return `
          <article class="review-card ${cardCls}" data-review-card="${escapeHtml(item.id)}">
            <div class="review-card-top">
              <div style="min-width: 0; flex: 1;">
                <h4 class="card-title">${escapeHtml(lr.taskTitle)}</h4>
                <div class="badge-row" style="margin-top: 5px;">
                  <span class="badge">📦 ${escapeHtml(lr.projectName)}</span>
                  <span class="badge ${bucket === 'core' ? 'core-pool' : 'periph-pool'}">${escapeHtml(bucket === 'core' ? t('gov.bucketCore') : t('gov.bucketPeripheral'))}</span>
                  <span class="badge cyan">${escapeHtml(t('review.submitterPrefix', { name: lr.submitterName }))}</span>
                  ${stakeGold > 0 ? `<span class="badge stake-pill">${escapeHtml(t('review.stakeBadge', { stake: stakeGold }))}</span>` : ''}
                </div>
              </div>
              <span class="review-ai-pill ${escapeHtml(riskLevel)}">${escapeHtml(aiBadgeText)}</span>
            </div>

            <div class="review-diff-row">
              <span class="diff-added">+${diffAdd.toLocaleString()}</span>
              <span>/</span>
              <span class="diff-removed">-${diffRem.toLocaleString()}</span>
              <span>·</span>
              <span class="diff-bloat ${bloatPct >= 40 ? 'danger' : ''}">${escapeHtml(t('review.diffBloat', { bloat: bloatPct }))}</span>
              ${item.contributionPoints ? `<span class="badge pink">✨ +${item.contributionPoints} pt</span>` : ''}
            </div>

            ${lr.summary ? `<p class="review-summary-text">${escapeHtml(lr.summary)}</p>` : ''}
            ${flagsHtml}

            <details class="review-preview-details">
              <summary>${escapeHtml(t('review.previewSummary'))}</summary>
              <pre class="review-preview-code">${escapeHtml(`${lr.contentPreview || ''}${prLine}`)}</pre>
            </details>

            <div class="review-actions-row">
              <button type="button" class="btn btn-sm btn-green" data-decide-review="${escapeHtml(item.id)}" data-review-decision="approve">
                ${escapeHtml(t('review.approveBtn'))}
              </button>
              <button type="button" class="btn btn-sm btn-danger" data-decide-review="${escapeHtml(item.id)}" data-review-decision="reject">
                ${escapeHtml(rejectLabel)}
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  // Recent review verdict history
  const history = Array.isArray(app.state?.reviewHistory) ? app.state.reviewHistory : [];
  if (histWrap && histEl) {
    if (history.length === 0) {
      histWrap.style.display = 'none';
      histEl.innerHTML = '';
    } else {
      histWrap.style.display = 'flex';
      const tasks = app.state?.tasks || [];
      const projects = app.state?.projects || [];
      histEl.innerHTML = history
        .slice(0, 6)
        .map((h) => {
          const lr = localizeReviewItem(h, loc, { tasks, projects });
          const approved = h.decision === 'approve' || h.status === 'approved';
          const stakeSlashed = Number(h.slashedStakeGold ?? h.stakeSlashedGold ?? h.stakeGold ?? 0);
          const rewardGold = Number(h.reviewerRewardGold ?? 15);
          const outcomeText = approved
            ? t('review.historyReward', { gold: rewardGold })
            : stakeSlashed > 0
              ? t('review.historySlashed', { stake: stakeSlashed })
              : '0 pt';
          return `
            <div class="ledger-row" style="flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="badge ${approved ? 'green' : 'red'}">${escapeHtml(approved ? t('review.historyApproved') : t('review.historyRejected'))}</span>
                <strong>${escapeHtml(lr.taskTitle)}</strong>
                <span class="mono" style="font-size: 11px; color: var(--text-muted);">${escapeHtml(lr.submitterName)}</span>
              </div>
              <span class="mono" style="font-size: 11px; font-weight: 800; color: ${approved ? 'var(--accent-green)' : 'var(--accent-gold)'};">${escapeHtml(outcomeText)}</span>
            </div>
          `;
        })
        .join('');
    }
  }
}

async function refreshReviewsNow({ showFeedback = false } = {}) {
  try {
    const res = await apiFetch('/api/reviews');
    if (app.state) {
      if (Array.isArray(res.reviewQueue)) app.state.reviewQueue = res.reviewQueue;
      if (Array.isArray(res.reviewHistory)) app.state.reviewHistory = res.reviewHistory;
      if (typeof res.peerReviewRequired === 'boolean') {
        app.state.settings = { ...(app.state.settings || {}), peerReviewRequired: res.peerReviewRequired };
      }
      renderReviewQueuePanel();
    }
    if (showFeedback) {
      soundFX.playClick();
      showToast(t('toast.reviewRefreshed'), 'info', 2000);
    }
  } catch (err) {
    if (showFeedback) showToast(err.message, 'error');
  }
}

async function decideReviewItem(reviewId, decision, triggerBtn = null) {
  if (!reviewId || !decision) return;
  if (triggerBtn) triggerBtn.disabled = true;
  try {
    app.lastLocalMutationAt = Date.now();
    const res = await apiFetch(`/api/reviews/${encodeURIComponent(reviewId)}/decide`, {
      method: 'POST',
      body: { decision },
    });
    if (res.state) {
      applyNewState(res.state);
    } else {
      await refreshBootstrapNow();
    }

    if (decision === 'approve') {
      const rewardGold = Number(res.reviewerRewardGold ?? res.reviewerReward?.gold ?? 15);
      const rewardPts = Number(res.reviewerRewardPoints ?? res.reviewerReward?.points ?? 5);
      if (typeof soundFX.playApproveFanfare === 'function') {
        soundFX.playApproveFanfare();
      } else {
        soundFX.playVerify();
        setTimeout(() => soundFX.playCoin(), 200);
      }
      app.engine?.triggerReviewDecision?.('approve', rewardGold);
      showToast(
        t('toast.reviewApproved', { gold: rewardGold, pts: rewardPts }),
        'success',
        5000,
      );
    } else {
      const seizedGold = Number(
        res.slashedStakeGold ?? res.stakeSlashedGold ?? res.seizedGold ?? res.reviewItem?.stakeGold ?? 0,
      );
      if (typeof soundFX.playSlash === 'function') {
        soundFX.playSlash();
      } else {
        soundFX.playCoin();
      }
      app.engine?.triggerReviewDecision?.('reject', seizedGold);
      showToast(
        seizedGold > 0
          ? t('toast.reviewRejected', { stake: seizedGold })
          : t('toast.reviewRejectedNoStake'),
        'achievement',
        5200,
      );
    }
  } catch (err) {
    soundFX.playReject();
    showToast(t('toast.reviewDecideFailed', { err: err.message }), 'error', 4500);
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }
}

function renderGuildTab() {
  renderReviewQueuePanel();
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
  const selectedAud = app.guildAudienceFilter || 'all';
  syncAudienceFilterButtons('filter-guild-audience', selectedAud);
  const projectMap = new Map((app.state.projects || []).map((p) => [p.id, p]));
  const workerMap = new Map((app.state.workers || []).map((w) => [w.id, w]));

  const tasks = (app.state.tasks || []).filter((tk) => {
    if (tk.track !== 'guild_bounty') return false;
    if (selectedProj !== 'all' && tk.projectId !== selectedProj) return false;
    if (selectedAud !== 'all' && getTaskAudienceSafe(tk) !== selectedAud) return false;
    return true;
  });

  const listEl = $('guild-task-list');
  if (!listEl) return;

  if (tasks.length === 0) {
    const emptyMsg = selectedAud === 'beginner' ? t('audience.emptyBeginner') : t('guild.empty');
    listEl.innerHTML = `<div class="empty-state">${escapeHtml(emptyMsg)}</div>`;
    return;
  }

  const renderGuildCard = (task) => {
      const lt = localizeTask(task, loc);
      const proj = projectMap.get(task.projectId);
      const lp = proj ? localizeProject(proj, loc) : null;
      const isCompleted = task.status === 'completed';
      const isPendingReview = task.status === 'pending_review';
      const isWorking = task.status === 'in_progress';
      const assignedWorker = workerMap.get(task.assignedWorkerId || task.submission?.workerId || '');
      const lw = assignedWorker ? localizeWorker(assignedWorker, loc) : null;
      const netUsd = Number((task.cashBountyUsd * 0.9).toFixed(2));
      const feeUsd = Number((task.cashBountyUsd * 0.1).toFixed(2));
      const bucket = getTaskBucketSafe(task);
      const stakeGold = getTaskStakeSafe(task);
      const minRep = getTaskMinRepSafe(task);

      const workerChipHtml =
        assignedWorker && (isWorking || isCompleted || isPendingReview)
          ? `
            <div class="task-worker-chip ${isCompleted ? 'completed' : ''}">
              <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(assignedWorker.roleClass || 'pro_architect')}" data-portrait-skin="${escapeHtml(assignedWorker.skin || 'default')}" data-portrait-anim="${isWorking ? 'work' : 'celebrate'}"></canvas>
              <span>${isWorking ? '⚔️' : isPendingReview ? '⚖️' : '✅'} ${escapeHtml(lw.name)} ${escapeHtml(isWorking ? t('guild.workerBusyTag') : isPendingReview ? t('badge.guildPendingReview') : t('guild.workerDoneTag'))}</span>
            </div>
          `
          : '';

      return `
        <article class="pixel-card ${isWorking ? 'in-progress' : ''}">
          <div class="card-head">
            <div>
              <h3 class="card-title">${escapeHtml(lt.title)}</h3>
              <p class="card-subtitle clamp-2">${escapeHtml(lt.description || '')}</p>
            </div>
            ${
              isCompleted
                ? `<span class="badge green">${escapeHtml(t('badge.guildCompleted'))}</span>`
                : isPendingReview
                  ? `<span class="badge pink">${escapeHtml(t('badge.guildPendingReview'))}</span>`
                  : isWorking
                    ? `<span class="badge cyan">${escapeHtml(t('badge.guildWorking'))}</span>`
                    : `<span class="badge amber">${escapeHtml(t('badge.guildOpen'))}</span>`
            }
          </div>
          ${workerChipHtml}
          <div class="badge-row">
            ${renderAudienceBadge(task)}
            <span class="badge">📦 ${escapeHtml(lp?.shortName || task.projectId)}</span>
            ${
              task.cashBountyUsd > 0
                ? renderCashBountyBadge(task.cashBountyUsd, 'guild')
                : `<span class="badge ${bucket === 'core' ? 'core-pool' : 'periph-pool'}">${escapeHtml(bucket === 'core' ? t('gov.bucketCore') : t('gov.bucketPeripheral'))}</span>`
            }
          </div>
          <details class="card-details">
            <summary>${escapeHtml(t('card.detailsToggle'))}</summary>
            <div class="card-details-body">
              <div class="badge-row">
                <span class="badge ${bucket === 'core' ? 'core-pool' : 'periph-pool'}">${escapeHtml(bucket === 'core' ? t('gov.bucketCore') : t('gov.bucketPeripheral'))}</span>
                <span class="badge amber">🖥️ ${escapeHtml(lt.modelSuggestion || task.modelSuggestion || 'Gemini CLI / Claude Code')}</span>
                ${stakeGold > 0 ? `<span class="badge stake-pill">${escapeHtml(t('gov.stakeTag', { gold: stakeGold }))}</span>` : ''}
                ${minRep > 0 ? `<span class="badge">${escapeHtml(t('gov.minRepTag', { rep: minRep }))}</span>` : ''}
                <span class="badge">${escapeHtml(task.category)} ｜ -${task.staminaCost || 20}⚡ ｜ +${task.progressWeight || 20}%</span>
              </div>
            </div>
          </details>
          <div class="card-footer">
            <span class="card-reward-line">
              <span style="color: var(--accent-gold);">🪙 +${task.goldReward}G</span>
              <span style="color: var(--accent-pink);">✨ +${task.contributionPoints} pt</span>
              ${stakeGold > 0 ? `<span style="color: var(--accent-amber);">🔒 ${stakeGold}G</span>` : ''}
            </span>
            <div class="toolbar-group">
              ${isWorking && task.claimExpiresAt ? `<span class="lease-countdown-pill">${escapeHtml(t('task.leaseLeft', { time: formatLeaseRemaining(task.claimExpiresAt) }))}</span>` : ''}
              ${isWorking ? `<button type="button" class="btn btn-sm" data-release-task="${escapeHtml(task.id)}">${escapeHtml(t('task.releaseBtn'))}</button>` : ''}
              ${
                isCompleted
                  ? `<button type="button" class="btn btn-sm btn-primary" data-inspect-task="${escapeHtml(task.id)}">${escapeHtml(t('factory.inspect'))} (${task.verification?.score ?? 90})</button>`
                  : isPendingReview
                    ? `<button type="button" class="btn btn-sm btn-pink" data-jump-review-queue="1">${escapeHtml(t('review.jumpToQueue'))}</button>`
                    : `<button type="button" class="btn btn-sm btn-amber" data-open-guild="${escapeHtml(task.id)}">
                        ${escapeHtml(isWorking ? t('guild.claimResume') : t('guild.claimOpen'))}
                      </button>`
              }
            </div>
          </div>
        </article>
      `;
  };
  listEl.innerHTML = renderGroupedTaskFolders('guild', tasks, projectMap, renderGuildCard, loc);
  hydrateWorkerPortraits(listEl);
}

function renderIncubatorTab() {
  const loc = getLocale();
  const listEl = $('project-list');
  if (!listEl) return;
  const projects = app.state.projects || [];
  const playerId = app.state.player?.id || app.user?.id || 'founder-demo';
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

      const sparkPct = Number(p.sparkRoyaltyPct ?? 5);
      const meritPct = Number(p.meritPoolPct ?? 85);
      const platformPct = Number(p.platformSharePct ?? 10);

      const myPts = Number(p.contributions?.[playerId] || 0);
      const totalPts = Object.values(p.contributions || {}).reduce((s, v) => s + Number(v || 0), 0);
      const isOriginator = p.originatorId === playerId || p.creatorId === playerId;
      const myMeritSharePct = totalPts > 0 ? (myPts / totalPts) * meritPct : 0;
      const myTotalSharePct = (myMeritSharePct + (isOriginator ? sparkPct : 0)).toFixed(1);

      const coBuilders = Array.isArray(p.coBuilders) ? p.coBuilders : [];
      const coBuildersCount = Math.max(1, coBuilders.length);
      const hasJoined = isOriginator || coBuilders.some((b) => b.userId === playerId);

      const ideaHashShort = p.ideaHash ? p.ideaHash.slice(0, 10) : 'GENESIS';
      const originatedStr = fmtUtcShort(p.originatedAt || p.createdAt);
      const publicPageHref = `/p/${encodeURIComponent(p.slug || p.id)}`;
      const publicVerifyHref = `/verify/${encodeURIComponent(p.ideaHash || p.id)}`;

      const coreCapPct = Number(p.poolCaps?.coreSharePct ?? 70);
      const periphCapPct = Number(p.poolCaps?.peripheralSharePct ?? 30);
      const corePts = Object.values(p.bucketPoints?.core || {}).reduce((s, v) => s + Number(v || 0), 0);
      const periphPts = Object.values(p.bucketPoints?.peripheral || {}).reduce((s, v) => s + Number(v || 0), 0);

      const votePct = Math.min(100, Math.round(((p.votes || 0) / (p.votesRequired || 10)) * 100));
      const votesLeft = Math.max(0, (p.votesRequired || 10) - (p.votes || 0));

      return `
        <article class="pixel-card ${p.sponsoredBillboard ? 'sponsored' : ''} ${isLaunched ? 'launched' : ''}" data-project-card="${escapeHtml(p.id)}">
          <div class="card-head">
            <div>
              <h3 class="card-title">
                ${escapeHtml(lp.name)}
                ${p.sponsoredBillboard ? `<span class="badge pink" style="margin-left: 6px;">${escapeHtml(t('incubator.sponsoredBadge'))}</span>` : ''}
              </h3>
              <p class="card-subtitle clamp-2">${escapeHtml(lp.tagline || lp.description || '')}</p>
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
            <span class="badge cyan">${escapeHtml(
              isOriginator
                ? t('incubator.myPointsSpark', { pts: myPts, pct: myTotalSharePct })
                : t('incubator.myPoints', { pts: myPts, pct: myMeritSharePct.toFixed(1) }),
            )}</span>
            <span class="badge green">${escapeHtml(t('incubator.coBuildersCount', { count: coBuildersCount }))}</span>
            ${
              p.bountyPoolUsd > 0
                ? `<span class="badge ${isLiveProductionMode() ? 'bounty-live' : 'bounty-demo'}">${escapeHtml(t('incubator.bountyPool', { amount: p.bountyPoolUsd }))} <span class="bounty-mode-chip">${escapeHtml(isLiveProductionMode() ? t('bounty.liveEscrowTag') : t('bounty.demoTag'))}</span></span>`
                : ''
            }
            ${p.totalRevenueUsd > 0 ? `<span class="badge gold">${escapeHtml(t('incubator.totalRev', { amount: fmtUsd(p.totalRevenueUsd) }))}</span>` : ''}
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

          <!-- 收合次要細節：5/85/10、70/30 防稀釋配額、AI 拆單、公開頁與看板 -->
          <details class="card-details">
            <summary>${escapeHtml(t('incubator.moreDetails'))}</summary>
            <div class="card-details-body">
              <div class="provenance-strip">
                <div class="prov-strip-top">
                  <div class="prov-strip-meta">
                    <span>${escapeHtml(t('incubator.originatorPrefix', { name: lp.originatorName || lp.creatorName }))}</span>
                    <span class="mono">🕒 ${escapeHtml(originatedStr)}</span>
                  </div>
                  <button
                    type="button"
                    class="prov-hash-btn"
                    data-open-provenance="${escapeHtml(p.id)}"
                    title="${escapeHtml(t('incubator.hashVerifyTitle'))}"
                  >
                    🔐 #${escapeHtml(ideaHashShort)}
                  </button>
                </div>
                <div class="split-mini-bar" title="${escapeHtml(`${sparkPct}% / ${meritPct}% / ${platformPct}%`)}">
                  <div class="split-mini-seg spark" style="width: 19%;">${escapeHtml(t('incubator.splitSpark'))}</div>
                  <div class="split-mini-seg merit" style="width: 65%;">${escapeHtml(t('incubator.splitMerit'))}</div>
                  <div class="split-mini-seg platform" style="width: 16%;">${escapeHtml(t('incubator.splitPlatform'))}</div>
                </div>
                <div class="bucket-quota-box">
                  <div class="bucket-quota-head">
                    <span>${escapeHtml(t('gov.quotaHeader'))}</span>
                    <span class="mono" style="color: var(--accent-cyan);">${escapeHtml(t('gov.quotaProofHint'))}</span>
                  </div>
                  <div class="bucket-mini-bar" title="${escapeHtml(`${coreCapPct}% Core (${corePts} pt) / <=${periphCapPct}% Peripheral (${periphPts} pt)`)}">
                    <div class="bucket-mini-seg core" style="width: ${coreCapPct}%;">${escapeHtml(t('gov.coreBarLabel', { cap: coreCapPct, pts: corePts }))}</div>
                    <div class="bucket-mini-seg peripheral" style="width: ${periphCapPct}%;">${escapeHtml(t('gov.periphBarLabel', { cap: periphCapPct, pts: periphPts }))}</div>
                  </div>
                </div>
              </div>
              ${
                isBuilding
                  ? `<div class="auto-split-box" data-auto-split-wrap="${escapeHtml(p.id)}">
                      <div class="auto-split-head">
                        <span>${escapeHtml(t('incubator.autoSplitTitle'))}</span>
                        <span class="badge cyan">${escapeHtml(t('incubator.autoSplitBadge'))}</span>
                      </div>
                      <div class="auto-split-row">
                        <input
                          type="text"
                          class="input auto-split-input"
                          data-auto-split-input="${escapeHtml(p.id)}"
                          maxlength="160"
                          placeholder="${escapeHtml(t('incubator.autoSplitPlaceholder'))}"
                        />
                        <button type="button" class="btn btn-sm btn-primary" data-auto-split-btn="${escapeHtml(p.id)}">
                          ${escapeHtml(t('incubator.autoSplitBtn'))}
                        </button>
                      </div>
                    </div>`
                  : ''
              }
              <div class="toolbar-group" style="flex-wrap: wrap;">
                <button type="button" class="btn btn-sm btn-amber" data-open-provenance="${escapeHtml(p.id)}">
                  ${escapeHtml(t('incubator.certBtn'))}
                </button>
                <a class="btn btn-sm" href="${publicPageHref}" target="_blank" rel="noopener noreferrer">
                  ${escapeHtml(t('incubator.publicPageBtn'))}
                </a>
                <a class="btn btn-sm" href="${publicVerifyHref}" target="_blank" rel="noopener noreferrer">
                  ${escapeHtml(t('incubator.publicVerifyBtn'))}
                </a>
                ${
                  !p.sponsoredBillboard
                    ? `<button type="button" class="btn btn-sm" data-billboard-project="${escapeHtml(p.id)}">${escapeHtml(t('incubator.billboardBtn', { price: billboardPrice }))}</button>`
                    : `<span class="mono" style="font-size: 11px; color: var(--accent-pink);">${escapeHtml(t('incubator.billboardActive'))}</span>`
                }
              </div>
            </div>
          </details>

          <div class="card-footer">
            <div class="toolbar-group">
              <button type="button" class="prov-hash-btn" data-open-provenance="${escapeHtml(p.id)}" title="${escapeHtml(t('incubator.hashVerifyTitle'))}">
                🔐 #${escapeHtml(ideaHashShort)}
              </button>
              ${
                !hasJoined
                  ? `<button type="button" class="btn btn-sm btn-primary" data-join-project="${escapeHtml(p.id)}">${escapeHtml(t('incubator.joinBtn'))}</button>`
                  : ''
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
                isLaunched && !shouldHideSandboxControls()
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
        const cooldownSec = getWorkerCooldownRemainingSec(w);
        const slopStrikes = Number(w.slopStrikes || 0);
        const statusBadgeHtml =
          cooldownSec > 0
            ? `<span class="badge cooldown-pill">${escapeHtml(t('workers.cooldownBadge', { sec: cooldownSec }))}</span>`
            : `<span class="badge ${w.status === 'working' ? 'cyan' : 'green'}">${escapeHtml(w.status === 'working' ? t('workers.statusWorking') : t('workers.statusIdle'))}</span>`;

        return `
          <article class="pixel-card">
            <div class="card-head">
              <div class="worker-card-lead">
                <div class="worker-portrait-frame ${w.status === 'working' ? 'working' : ''} ${skinFrameClass}">
                  <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(w.roleClass || 'flash_worker')}" data-portrait-skin="${escapeHtml(w.skin || 'default')}" data-portrait-anim="${w.status === 'working' ? 'work' : 'idle'}"></canvas>
                </div>
                <div class="worker-card-info">
                  <h3 class="card-title">
                    ${escapeHtml(lw.name)} <span class="badge cyan">Lv.${w.level}</span>
                    ${slopStrikes > 0 ? `<span class="badge amber" style="margin-left: 4px;">${escapeHtml(t('workers.strikesBadge', { strikes: slopStrikes }))}</span>` : ''}
                  </h3>
                  <p class="card-subtitle">${escapeHtml(lw.roleName)} ｜ ${escapeHtml(lw.providerLabel)}</p>
                </div>
              </div>
              ${statusBadgeHtml}
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
  syncWorkerCooldownTicker();

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

  const peerOn = getPeerReviewRequiredFlag();
  const peerToggle = $('toggle-peer-review-required');
  const peerLabel = $('peer-review-label');
  const peerBadge = $('peer-review-badge');
  if (peerToggle) peerToggle.checked = peerOn;
  if (peerLabel) peerLabel.classList.toggle('active', peerOn);
  if (peerBadge) peerBadge.textContent = peerOn ? t('admin.peerReviewOn') : t('admin.peerReviewOff');

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

  // Redeem codes list (trilingual localized notes!)
  const loc = getLocale();
  const codesEl = $('admin-codes-list');
  const codes = app.adminData?.redeemCodes || [];
  if (codesEl) {
    if (codes.length === 0) {
      codesEl.innerHTML = `<div class="empty-state">${escapeHtml(t('admin.codesEmpty'))}</div>`;
    } else {
      codesEl.innerHTML = codes
        .slice(0, 12)
        .map((c) => {
          const localizedNote = localizeRedeemNote(c, loc);
          return `
            <div class="ledger-row" style="flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="badge ${c.used ? '' : 'green'}">${escapeHtml(c.used ? t('admin.codeUsed') : t('admin.codeUnused'))}</span>
                <strong class="mono">${escapeHtml(c.code)}</strong>
                <span class="badge pink">${escapeHtml(c.rewardType)}</span>
                ${localizedNote ? `<span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(localizedNote)}</span>` : ''}
              </div>
              <button type="button" class="btn btn-sm" data-copy-redeem-code="${escapeHtml(c.code)}">${escapeHtml(t('admin.copyCodeBtn'))}</button>
            </div>
          `;
        })
        .join('');
    }
  }

  renderOpsMetricsSection();
}

function renderOpsMetricsSection() {
  const driverEl = $('metric-db-driver');
  const memEl = $('metric-memory');
  const uptimeEl = $('metric-uptime');
  const chainEl = $('metric-chain-health');
  const sseEl = $('metric-sse-reviews');
  const extraEl = $('ops-metrics-extra');
  if (!driverEl && !extraEl) return;

  const m = app.metrics;
  if (!m) {
    if (extraEl) {
      extraEl.textContent = app.metricsError ? t('ops.unavailable') : t('ops.loading');
    }
    return;
  }

  const isSqlite = String(m.dbDriver || '').toLowerCase().includes('sqlite');
  if (driverEl) {
    driverEl.className = `badge ${isSqlite ? 'green' : 'amber'}`;
    driverEl.textContent = isSqlite ? t('ops.driverSqlite') : t('ops.driverJson');
  }
  if (memEl) {
    const mb = Number(m.memoryMb ?? 0);
    memEl.textContent = `${Number.isFinite(mb) ? mb.toFixed(1) : '0.0'} MB`;
  }
  if (uptimeEl) {
    uptimeEl.textContent = fmtUptime(m.uptimeSec);
  }
  if (chainEl) {
    const valid = m.provenanceChainValid !== false;
    chainEl.className = `ops-metric-val mono ${valid ? 'healthy' : 'warn'}`;
    chainEl.textContent = valid ? t('ops.chainHealthy') : t('ops.chainInvalid');
  }
  if (sseEl) {
    sseEl.textContent = `${Number(m.sseClients ?? 0)} SSE / ${Number(m.pendingReviewsCount ?? 0)}`;
  }
  if (extraEl) {
    extraEl.textContent = t('ops.extraSummary', {
      version: String(m.version || '1.2').replace(/^v/i, ''),
      users: Number(m.usersCount ?? 0),
      projects: Number(m.projectsCount ?? 0),
      open: Number(m.tasksOpen ?? 0),
      done: Number(m.tasksCompleted ?? 0),
      blocked: Number(m.rateLimitBlockedCount ?? 0),
    });
  }
}

async function refreshMetricsNow({ showFeedback = false } = {}) {
  try {
    const data = await apiFetch('/api/metrics');
    app.metrics = data;
    app.metricsError = false;
    renderOpsMetricsSection();
    if (showFeedback) {
      soundFX.playClick();
      showToast(t('toast.metricsRefreshed'), 'info', 2200);
    }
  } catch (err) {
    app.metricsError = true;
    renderOpsMetricsSection();
    if (showFeedback) {
      showToast(err.message, 'error');
    }
  }
}

async function downloadFullBackup() {
  const btn = $('btn-export-backup');
  if (btn) {
    btn.disabled = true;
    btn.textContent = t('ops.exportingBtn');
  }
  try {
    const res = await fetch('/api/admin/export-backup', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP ${res.status}`);
    }
    const rawText = await res.text();
    let prettyJson = rawText;
    try {
      prettyJson = JSON.stringify(JSON.parse(rawText), null, 2);
    } catch {
      // keep rawText
    }
    const cd = res.headers.get('content-disposition') || '';
    const match = cd.match(/filename="?([^";\n]+)"?/i);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = (match && match[1]) || `pixelcompute-backup-${stamp}.json`;

    const blob = new Blob([prettyJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    soundFX.playCoin();
    showToast(t('toast.backupDownloaded', { filename }), 'success', 4600);
  } catch (err) {
    soundFX.playReject();
    showToast(t('toast.backupFailed', { err: err.message }), 'error', 4600);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = t('ops.exportBtn');
    }
  }
}

async function triggerAutoSplit(projectId, triggerBtn = null) {
  if (!projectId) return;
  const input = document.querySelector(`[data-auto-split-input="${CSS.escape(projectId)}"]`);
  const featureBrief = (input?.value || '').trim();
  if (!featureBrief) {
    soundFX.playReject();
    showToast(t('toast.autoSplitNeedBrief'), 'warn', 3200);
    input?.focus();
    return;
  }

  const btn = triggerBtn || document.querySelector(`[data-auto-split-btn="${CSS.escape(projectId)}"]`);
  const origLabel = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = t('incubator.autoSplitWorking');
  }

  try {
    app.lastLocalMutationAt = Date.now();
    const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/auto-split`, {
      method: 'POST',
      body: { featureBrief },
    });
    if (res.state) {
      applyNewState(res.state);
    } else {
      await refreshBootstrapNow();
    }
    if (input) input.value = '';
    const loc = getLocale();
    const proj =
      res.project || (app.state?.projects || []).find((p) => p.id === projectId);
    const lp = proj ? localizeProject(proj, loc) : null;
    const createdCount = Array.isArray(res.tasks)
      ? res.tasks.length
      : Number(res.createdCount ?? 3);
    soundFX.playVerify();
    showToast(
      t('toast.autoSplitOk', {
        name: lp?.shortName || lp?.name || projectId,
        count: createdCount,
      }),
      'success',
      5000,
    );
  } catch (err) {
    soundFX.playReject();
    showToast(t('toast.autoSplitFailed', { err: err.message }), 'error', 4600);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origLabel || t('incubator.autoSplitBtn');
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
      showToast(t('toast.antiCheatFailed', { reason: localizeServerMessage(submitRes.verification.reason, loc) }), 'error', 5000);
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

  const bucket = getTaskBucketSafe(freshTask);
  const stakeGold = getTaskStakeSafe(freshTask);
  const minRep = getTaskMinRepSafe(freshTask);

  $('guild-modal-title').textContent = t('modal.guild.titleWithTask', { title: lt.title });
  $('guild-modal-meta').innerHTML = `
    ${renderAudienceBadge(freshTask)}
    <span class="badge ${bucket === 'core' ? 'core-pool' : 'periph-pool'}">${escapeHtml(bucket === 'core' ? t('gov.bucketCore') : t('gov.bucketPeripheral'))}</span>
    ${stakeGold > 0 ? `<span class="badge stake-pill">${escapeHtml(t('gov.stakeTag', { gold: stakeGold }))}</span>` : ''}
    ${minRep > 0 ? `<span class="badge">${escapeHtml(t('gov.minRepTag', { rep: minRep }))}</span>` : ''}
    <span class="badge">📦 ${escapeHtml(lp?.shortName || freshTask.projectId)}</span>
    <span class="badge cyan">${escapeHtml(t('modal.guild.workerBadge', { name: lw?.name || 'Worker' }))}</span>
    <span class="badge gold">🪙 +${freshTask.goldReward}G</span>
    <span class="badge pink">${escapeHtml(t('modal.guild.pointsBadge', { pts: freshTask.contributionPoints }))}</span>
    ${freshTask.cashBountyUsd > 0 ? renderCashBountyBadge(freshTask.cashBountyUsd, 'modal') : ''}
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

  const reviewCheck = $('guild-submit-for-review');
  const reviewLabel = $('guild-submit-review-label');
  const peerEnforced = getPeerReviewRequiredFlag();
  if (reviewCheck) {
    reviewCheck.checked = peerEnforced;
  }
  if (reviewLabel) {
    reviewLabel.classList.toggle('active', Boolean(reviewCheck?.checked));
    const span = reviewLabel.querySelector('span');
    if (span) {
      span.textContent = peerEnforced
        ? t('modal.guild.submitForReviewEnforced')
        : t('modal.guild.submitForReview');
    }
  }

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
  const submitForReview = Boolean($('guild-submit-for-review')?.checked);

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
        submitForReview,
        executionMode: 'byot_workbench',
      },
    });
    applyNewState(res.state);

    if (res.pendingReview) {
      soundFX.playVerify();
      closeModal('modal-guild');
      const aiScore =
        res.reviewItem?.aiReview?.aiScore ??
        res.reviewItem?.aiReport?.aiScore ??
        res.reviewItem?.aiScore ??
        res.verification?.score ??
        85;
      showToast(t('toast.guildQueuedForReview', { score: aiScore }), 'info', 5200);
      const panel = $('review-queue-panel');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (res.passed) {
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
      showToast(t('toast.guildIntercepted', { reason: localizeServerMessage(res.verification.reason, getLocale()) }), 'error', 5500);
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
// Proof of First Spark: Provenance Modal, Co-Build Join & Anti-Copycat Checker
// ============================================================================
function renderProvenanceCalculator() {
  const resultsEl = $('prov-calc-results');
  const revInput = $('prov-calc-revenue');
  const workSlider = $('prov-calc-work-pct');
  const workValEl = $('prov-calc-work-val');
  const origCheck = $('prov-calc-is-originator');
  const origLabel = $('prov-calc-orig-label');
  if (!resultsEl || !revInput || !workSlider || !origCheck) return;

  const gross = Math.max(0, Number(revInput.value) || 0);
  const workPct = Math.max(0, Math.min(100, Number(workSlider.value) || 0));
  const isOrig = Boolean(origCheck.checked);
  if (workValEl) workValEl.textContent = `${workPct}%`;
  if (origLabel) origLabel.classList.toggle('active', isOrig);

  const proj = (app.state?.projects || []).find((p) => p.id === app.provModal.projectId);
  const sparkRate = Number(proj?.sparkRoyaltyPct ?? 5);
  const meritRate = Number(proj?.meritPoolPct ?? 85);
  const platformRate = Number(proj?.platformSharePct ?? 10);

  const sparkUsd = (gross * sparkRate) / 100;
  const meritPoolUsd = (gross * meritRate) / 100;
  const platformUsd = (gross * platformRate) / 100;

  const mySparkPct = isOrig ? sparkRate : 0;
  const myMeritPct = (meritRate * workPct) / 100;
  const myTotalPct = mySparkPct + myMeritPct;
  const myTotalUsd = (gross * myTotalPct) / 100;

  resultsEl.innerHTML = `
    <div class="prov-calc-row">
      <span>${escapeHtml(t('modal.provenance.calcRowSpark'))}</span>
      <span class="prov-calc-val">${fmtUsd(sparkUsd)}</span>
    </div>
    <div class="prov-calc-row">
      <span>${escapeHtml(t('modal.provenance.calcRowMerit'))}</span>
      <span class="prov-calc-val">${fmtUsd(meritPoolUsd)}</span>
    </div>
    <div class="prov-calc-row">
      <span>${escapeHtml(t('modal.provenance.calcRowPlatform'))}</span>
      <span class="prov-calc-val">${fmtUsd(platformUsd)}</span>
    </div>
    <div class="prov-calc-row highlight">
      <span><strong>${escapeHtml(t('modal.provenance.calcRowYou', { pct: myTotalPct.toFixed(1) }))}</strong></span>
      <span class="prov-calc-val">${fmtUsd(myTotalUsd)}</span>
    </div>
  `;
}

function renderProvenanceModalContent(project) {
  if (!project) return;
  const loc = getLocale();
  const lp = localizeProject(project, loc);
  const playerId = app.state?.player?.id || app.user?.id || 'founder-demo';
  const isPlayerOrig = project.originatorId === playerId || project.creatorId === playerId;

  const origNameEl = $('prov-originator-name');
  const origAtEl = $('prov-originated-at');
  const coCountEl = $('prov-cobuilders-count');
  const hashEl = $('prov-idea-hash');
  const prevEl = $('prov-prev-hash');
  const imgEl = $('prov-cert-preview-img');
  const contribListEl = $('prov-contributors-list');

  const coBuilders = Array.isArray(project.coBuilders) ? project.coBuilders : [];
  if (origNameEl) origNameEl.textContent = lp.originatorName || lp.creatorName || '-';
  if (origAtEl) origAtEl.textContent = fmtUtcShort(project.originatedAt || project.createdAt);
  if (coCountEl) coCountEl.textContent = t('incubator.coBuildersCount', { count: Math.max(1, coBuilders.length) });
  if (hashEl) hashEl.textContent = project.ideaHash || '-';
  if (prevEl) prevEl.textContent = project.prevIdeaHash || '0000000000000000000000000000000000000000000000000000000000000000';

  const pubPageBtn = $('btn-prov-public-page');
  const pubVerifyBtn = $('btn-prov-public-verify');
  if (pubPageBtn) {
    pubPageBtn.setAttribute('href', `/p/${encodeURIComponent(project.slug || project.id)}`);
  }
  if (pubVerifyBtn) {
    pubVerifyBtn.setAttribute('href', `/verify/${encodeURIComponent(project.ideaHash || project.id)}`);
  }

  const origCheck = $('prov-calc-is-originator');
  if (origCheck) origCheck.checked = isPlayerOrig;

  // Render live contributors breakdown
  const entries = Object.entries(project.contributions || {})
    .filter(([, pts]) => Number(pts) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const totalPts = entries.reduce((sum, [, pts]) => sum + Number(pts), 0);
  const meritRate = Number(project.meritPoolPct ?? 85);
  const sparkRate = Number(project.sparkRoyaltyPct ?? 5);

  if (contribListEl) {
    if (entries.length === 0) {
      contribListEl.innerHTML = `<div class="empty-state">${escapeHtml(t('modal.provenance.calcNoContributors'))}</div>`;
    } else {
      contribListEl.innerHTML = entries
        .map(([uid, pts]) => {
          const rawName = project.contributorNames?.[uid] || uid;
          const lu = localizeUser({ id: uid, displayName: rawName }, loc);
          const isOrig = uid === project.originatorId || uid === project.creatorId;
          const meritPct = totalPts > 0 ? (Number(pts) / totalPts) * meritRate : 0;
          const totalPct = meritPct + (isOrig ? sparkRate : 0);
          return `
            <div class="ledger-row">
              <div>
                <strong>${escapeHtml(lu.displayName)}</strong>
                ${isOrig ? '<span class="badge gold" style="margin-left: 6px;">💡 +5% Spark</span>' : ''}
              </div>
              <div class="mono" style="display: flex; gap: 8px; align-items: center;">
                <span style="color: var(--accent-cyan);">${Number(pts)} pts</span>
                <strong style="color: var(--accent-green);">${totalPct.toFixed(1)}%</strong>
              </div>
            </div>
          `;
        })
        .join('');
    }
  }

  renderProvenanceCalculator();

  // Render 900x520 Idea Certificate PNG preview
  if (imgEl) {
    try {
      const canvas = renderIdeaCertificate(project, app.provModal.chainInfo, loc);
      imgEl.src = canvas.toDataURL('image/png');
    } catch {
      // ignore headless canvas errors
    }
  }
}

async function openProvenanceModal(projectId) {
  const project = (app.state?.projects || []).find((p) => p.id === projectId);
  if (!project) return;
  app.provModal.projectId = projectId;
  app.provModal.verifyData = null;

  const bannerEl = $('prov-chain-banner');
  if (bannerEl) {
    bannerEl.className = 'prov-verify-banner';
    bannerEl.textContent = t('modal.provenance.chainVerifying');
  }

  renderProvenanceModalContent(project);
  openModal('provenance-modal');

  try {
    const hash = project.ideaHash;
    let verifyRes = null;
    if (hash) {
      verifyRes = await apiFetch(`/api/provenance/verify/${encodeURIComponent(hash)}`);
    } else {
      verifyRes = await apiFetch('/api/provenance/chain');
    }
    if (app.provModal.projectId !== projectId) return;

    const valid = Boolean(verifyRes?.verified ?? verifyRes?.valid ?? true);
    const chainLen = Number(verifyRes?.chainLength ?? verifyRes?.records?.length ?? (app.state?.projects || []).length);
    const blockIdx = Number(verifyRes?.record?.provenanceIndex ?? project.provenanceIndex ?? 1);
    app.provModal.chainInfo = {
      valid,
      chainLength: chainLen,
      record: verifyRes?.record || null,
    };
    app.provModal.verifyData = verifyRes;

    if (bannerEl) {
      bannerEl.className = `prov-verify-banner ${valid ? 'verified' : 'invalid'}`;
      bannerEl.textContent = valid
        ? t('modal.provenance.chainValid', { idx: blockIdx, len: chainLen })
        : t('modal.provenance.chainInvalid');
    }
    renderProvenanceModalContent(verifyRes?.project || project);
  } catch {
    if (app.provModal.projectId !== projectId) return;
    if (bannerEl) {
      bannerEl.className = 'prov-verify-banner invalid';
      bannerEl.textContent = t('modal.provenance.chainInvalid');
    }
  }
}

function triggerDownloadIdeaCert() {
  const project = (app.state?.projects || []).find((p) => p.id === app.provModal.projectId);
  if (!project) return;
  const loc = getLocale();
  const lp = localizeProject(project, loc);
  downloadIdeaCertificate(project, app.provModal.chainInfo, loc);
  soundFX.playCoin();
  showToast(t('toast.ideaCertExported', { name: lp.shortName || lp.name }), 'success');
}

async function joinProject(projectId, { scrollToCard = false } = {}) {
  const loc = getLocale();
  try {
    app.lastLocalMutationAt = Date.now();
    const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/join`, {
      method: 'POST',
    });
    if (res.state) applyNewState(res.state);
    const lp = localizeProject(res.project, loc);
    if (res.alreadyJoined) {
      soundFX.playClick();
      showToast(t('toast.alreadyJoined', { name: lp.shortName || lp.name }), 'info');
    } else {
      soundFX.playVerify();
      showToast(
        t('toast.joinedProject', {
          name: lp.shortName || lp.name,
          count: res.coBuildersCount ?? res.project?.coBuilders?.length ?? 1,
        }),
        'success',
        4200,
      );
    }

    if (scrollToCard) {
      switchTab('incubator');
      setTimeout(() => {
        const card = document.querySelector(`[data-project-card="${CSS.escape(projectId)}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('highlight-flash');
          setTimeout(() => card.classList.remove('highlight-flash'), 2400);
        }
      }, 120);
    }
    return true;
  } catch (err) {
    soundFX.playReject();
    showToast(err.message, 'error');
    return false;
  }
}

function resetProposeCopycatUi() {
  app.proposeCheck.topMatch = null;
  app.proposeCheck.isHighRisk = false;
  app.proposeCheck.isWarning = false;
  if (app.proposeCheck.timer) {
    clearTimeout(app.proposeCheck.timer);
    app.proposeCheck.timer = null;
  }
  const alertBox = $('propose-copycat-alert');
  const cleanBar = $('propose-copycat-clean');
  const derivWrap = $('propose-derivative-wrap');
  const derivAck = $('propose-derivative-ack');
  if (alertBox) alertBox.style.display = 'none';
  if (cleanBar) cleanBar.style.display = 'none';
  if (derivWrap) derivWrap.style.display = 'none';
  if (derivAck) derivAck.checked = false;
}

function renderCopycatMatchBox(match, { isHighRisk = false, isWarning = false } = {}) {
  const alertBox = $('propose-copycat-alert');
  const cleanBar = $('propose-copycat-clean');
  const titleEl = $('propose-copycat-title');
  const metaEl = $('propose-copycat-meta');
  const derivWrap = $('propose-derivative-wrap');
  if (!alertBox) return;

  if (!match || (!isHighRisk && !isWarning)) {
    alertBox.style.display = 'none';
    if (derivWrap) derivWrap.style.display = 'none';
    const hasText = ($('propose-name')?.value || '').trim().length >= 3;
    if (cleanBar) cleanBar.style.display = hasText ? 'block' : 'none';
    return;
  }

  app.proposeCheck.topMatch = match;
  app.proposeCheck.isHighRisk = isHighRisk;
  app.proposeCheck.isWarning = isWarning;

  if (cleanBar) cleanBar.style.display = 'none';
  alertBox.style.display = 'flex';
  alertBox.classList.toggle('warn', !isHighRisk);

  const pct = Math.round((Number(match.similarity) || 0) * 100);
  const loc = getLocale();
  const lu = localizeUser({ id: match.originatorId, displayName: match.originatorName }, loc);

  if (titleEl) {
    titleEl.textContent = isHighRisk
      ? t('modal.propose.copycatHighTitle', { pct })
      : t('modal.propose.copycatWarnTitle', { pct });
  }
  if (metaEl) {
    metaEl.textContent = t('modal.propose.copycatMeta', {
      originator: lu.displayName || match.originatorName || '-',
      time: fmtUtcShort(match.originatedAt),
      hash: String(match.ideaHash || '').slice(0, 14),
    });
  }
  if (derivWrap) {
    derivWrap.style.display = isHighRisk ? 'inline-flex' : 'none';
  }
}

function scheduleProposeSimilarityCheck() {
  if (app.proposeCheck.timer) {
    clearTimeout(app.proposeCheck.timer);
  }
  const name = ($('propose-name')?.value || '').trim();
  const desc = ($('propose-desc')?.value || '').trim();
  if (name.length < 3 && desc.length < 6) {
    resetProposeCopycatUi();
    return;
  }
  app.proposeCheck.timer = setTimeout(async () => {
    app.proposeCheck.timer = null;
    try {
      const res = await apiFetch('/api/projects/check-similarity', {
        method: 'POST',
        body: { name, tagline: desc, description: desc },
      });
      renderCopycatMatchBox(res.topMatch, {
        isHighRisk: Boolean(res.isHighRisk),
        isWarning: Boolean(res.isWarning),
      });
    } catch {
      // Keep UX smooth if offline
    }
  }, 320);
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
    'project_updated',
    'project_proposed',
    'review_queued',
    'review_decided',
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

  // HUD Popover Menus (🎵 Audio & ☰ More)
  const audioWrap = $('hud-audio-popover-wrap');
  const moreWrap = $('hud-more-popover-wrap');
  const audioTrigger = $('btn-hud-audio-menu');
  const moreTrigger = $('btn-hud-more-menu');
  const closeHudPopovers = () => {
    audioWrap?.classList.remove('open');
    moreWrap?.classList.remove('open');
    audioTrigger?.setAttribute('aria-expanded', 'false');
    moreTrigger?.setAttribute('aria-expanded', 'false');
  };
  audioTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const nextOpen = !audioWrap?.classList.contains('open');
    closeHudPopovers();
    if (nextOpen && audioWrap) {
      audioWrap.classList.add('open');
      audioTrigger.setAttribute('aria-expanded', 'true');
    }
    soundFX.playClick();
  });
  moreTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const nextOpen = !moreWrap?.classList.contains('open');
    closeHudPopovers();
    if (nextOpen && moreWrap) {
      moreWrap.classList.add('open');
      moreTrigger.setAttribute('aria-expanded', 'true');
    }
    soundFX.playClick();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hud-popover-wrap')) {
      closeHudPopovers();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeHudPopovers();
  });
  $('hud-more-popover')?.addEventListener('click', (e) => {
    if (e.target.closest('button:not(.lang-btn):not(#btn-day-night), a')) {
      closeHudPopovers();
    }
  });
  $('btn-menu-feedback')?.addEventListener('click', () => {
    closeHudPopovers();
    window.openFeedbackModal?.();
  });

  // Track manual toggle on review queue details
  $('review-queue-details')?.addEventListener('toggle', () => {
    const el = $('review-queue-details');
    if (el) el.dataset.userToggled = '1';
  });

  // Track collapsible project-grouped task folders & expand/cancel actions
  document.addEventListener(
    'toggle',
    (e) => {
      const folder = e.target;
      if (folder?.matches?.('details.task-group-folder')) {
        const key = folder.dataset.taskGroup;
        if (!key) return;
        if (folder.open) {
          app.openTaskGroups.add(key);
          app.closedTaskGroups.delete(key);
        } else {
          app.closedTaskGroups.add(key);
          app.openTaskGroups.delete(key);
        }
      }
    },
    true,
  );

  document.addEventListener('click', async (e) => {
    const expandBtn = e.target.closest('[data-expand-group]');
    if (expandBtn) {
      const gKey = expandBtn.dataset.expandGroup;
      if (app.expandedTaskGroups.has(gKey)) app.expandedTaskGroups.delete(gKey);
      else app.expandedTaskGroups.add(gKey);
      soundFX.playClick();
      if (gKey.startsWith('factory:')) renderFactoryTab();
      else renderGuildTab();
      return;
    }

    const releaseBtn = e.target.closest('[data-release-task]');
    if (releaseBtn) {
      const taskId = releaseBtn.dataset.releaseTask;
      if (!window.confirm(t('task.releaseConfirm'))) return;
      releaseBtn.disabled = true;
      try {
        const res = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/release`, {
          method: 'POST',
          body: { reason: 'User voluntary cancellation' },
        });
        if (res.state) applyNewState(res.state);
        soundFX.playClick();
        showToast(t('task.releasedToast'), 'info');
      } catch (err) {
        soundFX.playReject();
        showToast(err.message, 'error');
      } finally {
        releaseBtn.disabled = false;
      }
    }
  });

  // HUD controls: logged-in users open Personal Profile & Project History; Demo guests open Auth modal
  $('hud-user-badge').addEventListener('click', () => {
    soundFX.playClick();
    if (isSignedInUser()) {
      openProfileModal('participated');
    } else {
      openAuthModal('login');
    }
  });

  $('btn-hud-tutorial').addEventListener('click', () => {
    soundFX.playClick();
    app.tutorial?.open(0);
  });

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

  // 8-bit BGM Mini Player controls
  const bgmControls = $('bgm-controls');
  if (bgmControls && bgmPlayer) {
    const getLocalizedTrackName = (trackOrId) => {
      const id = typeof trackOrId === 'string' ? trackOrId : trackOrId?.id;
      const trackObj = typeof trackOrId === 'object' && trackOrId
        ? trackOrId
        : (BGM_TRACKS || []).find((tr) => tr.id === id);
      if (id) {
        const key = `bgm.track.${id}`;
        const translated = t(key);
        if (translated && translated !== key) return translated;
      }
      const loc = getLocale();
      if (trackObj) {
        if (loc === 'en') return trackObj.nameEn || trackObj.nameZhTW || id || '8-bit BGM';
        if (loc === 'zh-CN') return trackObj.nameZhCN || trackObj.nameZhTW || id || '8-bit BGM';
        return trackObj.nameZhTW || trackObj.nameEn || id || '8-bit BGM';
      }
      return id || '8-bit BGM';
    };

    const getLocalizedTrackMood = (trackObj) => {
      if (!trackObj) return '';
      const loc = getLocale();
      if (loc === 'en') return trackObj.moodEn || '';
      if (loc === 'zh-CN') return trackObj.moodZhCN || trackObj.moodZhTW || '';
      return trackObj.moodZhTW || '';
    };

    app.renderBgmControls = (bgmState = bgmPlayer.getState()) => {
      const stateObj = bgmState || bgmPlayer.getState();
      const isPlaying = Boolean(stateObj?.playing);
      const trackObj = stateObj?.track || (BGM_TRACKS || []).find((tr) => tr.id === stateObj?.trackId);
      const trackName = getLocalizedTrackName(trackObj || stateObj?.trackId);
      const mood = getLocalizedTrackMood(trackObj);
      const bpm = trackObj?.bpm ? `${trackObj.bpm} BPM` : '';
      const tooltipParts = [trackName, bpm, mood].filter(Boolean);

      bgmControls.classList.toggle('playing', isPlaying);
      $('btn-hud-audio-menu')?.classList.toggle('playing', isPlaying);

      const toggleBtn = $('btn-bgm-toggle');
      if (toggleBtn) {
        toggleBtn.textContent = isPlaying ? '⏸️' : '🎵';
        toggleBtn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
      }

      const nameEl = $('bgm-track-name');
      if (nameEl) {
        nameEl.textContent = trackName;
        nameEl.title = tooltipParts.join(' · ');
      }

      const autoBtn = $('btn-bgm-auto');
      if (autoBtn) {
        const autoOn = Boolean(stateObj?.autoScene);
        autoBtn.classList.toggle('active', autoOn);
        autoBtn.setAttribute('aria-pressed', autoOn ? 'true' : 'false');
      }

      const volSlider = $('bgm-volume');
      if (volSlider && Number.isFinite(Number(stateObj?.volume))) {
        const pct = Math.round(Math.max(0, Math.min(1, Number(stateObj.volume))) * 100);
        if (Number(volSlider.value) !== pct) {
          volSlider.value = String(pct);
        }
      }
    };

    if (typeof bgmPlayer.subscribe === 'function') {
      bgmPlayer.subscribe((nextState) => {
        app.renderBgmControls(nextState);
        app.tutorial?.setBgmPlaying(Boolean(nextState?.playing));
      });
    }

    $('btn-bgm-toggle')?.addEventListener('click', () => {
      const wasPlaying = Boolean(bgmPlayer.getState()?.playing);
      bgmPlayer.toggle();
      const next = bgmPlayer.getState();
      app.renderBgmControls(next);
      if (!wasPlaying && next?.playing) {
        showToast(t('bgm.toastPlay', { track: getLocalizedTrackName(next.track || next.trackId) }), 'info', 2200);
      } else if (wasPlaying && !next?.playing) {
        showToast(t('bgm.toastPause'), 'info', 1800);
      }
    });

    $('btn-bgm-prev')?.addEventListener('click', () => {
      bgmPlayer.prevTrack();
      app.renderBgmControls(bgmPlayer.getState());
      soundFX.playClick();
    });

    $('btn-bgm-next')?.addEventListener('click', () => {
      bgmPlayer.nextTrack();
      app.renderBgmControls(bgmPlayer.getState());
      soundFX.playClick();
    });

    $('btn-bgm-auto')?.addEventListener('click', () => {
      const curAuto = Boolean(bgmPlayer.getState()?.autoScene);
      bgmPlayer.setAutoScene(!curAuto);
      if (!curAuto) {
        bgmPlayer.syncScene(app.activeScene);
      }
      app.renderBgmControls(bgmPlayer.getState());
      soundFX.playClick();
      showToast(!curAuto ? t('bgm.toastAutoOn') : t('bgm.toastAutoOff'), 'info', 2000);
    });

    $('bgm-volume')?.addEventListener('input', (e) => {
      const raw = Number(e.target.value);
      if (Number.isFinite(raw)) {
        bgmPlayer.setVolume(Math.max(0, Math.min(1, raw / 100)));
      }
    });

    app.renderBgmControls(bgmPlayer.getState());
  }

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
      app.profileData = null;
      if (res.state) applyNewState(res.state, { silentAchievements: true });
      await refreshBootstrapNow({ silentAchievements: true });
      closeModal('auth-modal');
      closeModal('profile-modal');
      showToast(t('toast.authLogoutOk'), 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  $('btn-logout').addEventListener('click', handleLogoutClick);
  $('auth-btn-logout').addEventListener('click', handleLogoutClick);
  $('btn-profile-logout').addEventListener('click', handleLogoutClick);

  $('auth-btn-view-profile').addEventListener('click', () => {
    soundFX.playClick();
    closeModal('auth-modal');
    openProfileModal('participated');
  });

  // Personal Profile Modal (#profile-modal) events
  document.querySelectorAll('#profile-modal [data-profile-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      soundFX.playClick();
      setProfileModalTab(btn.dataset.profileTab);
    });
  });

  $('btn-profile-edit-toggle').addEventListener('click', () => {
    const form = $('profile-edit-form');
    if (!form) return;
    const isHidden = form.style.display === 'none' || !form.style.display;
    form.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) $('profile-edit-name')?.focus();
  });

  $('btn-profile-cancel-edit').addEventListener('click', () => {
    const form = $('profile-edit-form');
    if (form) form.style.display = 'none';
  });

  $('profile-edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = $('profile-edit-name').value.trim();
    const titleSel = $('profile-edit-title');
    const payload = { displayName };
    if (titleSel && titleSel.style.display !== 'none') {
      payload.title = titleSel.value;
    }
    const saveBtn = $('btn-profile-save');
    if (saveBtn) saveBtn.disabled = true;
    try {
      const res = await apiFetch('/api/profile/me', { method: 'PATCH', body: payload });
      if (res.user) app.user = { ...(app.user || {}), ...res.user };
      if (res.state) applyNewState(res.state, { silentAchievements: true });
      const freshProfile = await apiFetch('/api/profile/me');
      if (freshProfile && freshProfile.ok) {
        app.profileData = freshProfile;
        renderProfileModal(freshProfile);
      }
      const form = $('profile-edit-form');
      if (form) form.style.display = 'none';
      soundFX.playVerify();
      showToast(t('profile.savedToast'), 'success');
    } catch (err) {
      soundFX.playReject();
      showToast(err.message, 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  $('btn-profile-cert').addEventListener('click', () => {
    closeModal('profile-modal');
    openCertModal();
  });

  $('btn-profile-wallet').addEventListener('click', () => {
    closeModal('profile-modal');
    switchTab('revenue');
    setTimeout(() => {
      $('wallet-bind-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  });

  $('btn-profile-switch-account').addEventListener('click', () => {
    closeModal('profile-modal');
    openAuthModal('login');
  });

  $('profile-modal').addEventListener('click', (e) => {
    const jumpProj = e.target.closest('[data-profile-jump-project]');
    if (jumpProj) {
      closeModal('profile-modal');
      switchTab('incubator');
      return;
    }
    const jumpPropose = e.target.closest('[data-profile-jump-propose]');
    if (jumpPropose) {
      closeModal('profile-modal');
      switchTab('incubator');
      setTimeout(() => {
        openModal('modal-propose');
        $('propose-name')?.focus();
      }, 100);
    }
  });

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
      const localizedSummary = localizeServerMessage(res.rewardSummary || res.code, getLocale());
      showToast(t('toast.payRedeemOk', { detail: localizedSummary }), 'success', 4500);
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

  $('btn-refresh-metrics').addEventListener('click', () => refreshMetricsNow({ showFeedback: true }));
  $('btn-export-backup').addEventListener('click', downloadFullBackup);

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

  $('toggle-peer-review-required').addEventListener('change', async (e) => {
    const peerReviewRequired = Boolean(e.target.checked);
    try {
      const res = await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: { peerReviewRequired },
      });
      if (res.state) applyNewState(res.state);
      await refreshBootstrapNow();
      soundFX.playClick();
      showToast(
        t('toast.adminPeerReviewChanged', { state: peerReviewRequired ? t('admin.peerReviewOn') : t('admin.peerReviewOff') }),
        'info',
      );
    } catch (err) {
      e.target.checked = !peerReviewRequired;
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
  $('filter-api-audience').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-audience-filter]');
    if (!btn) return;
    soundFX.playClick();
    app.apiAudienceFilter = btn.dataset.audienceFilter || 'all';
    syncAudienceFilterButtons('filter-api-audience', app.apiAudienceFilter);
    renderFactoryTab();
  });

  // Guild filters & Workbench actions
  $('guild-project-filter').addEventListener('change', renderGuildTab);
  $('filter-guild-audience').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-audience-filter]');
    if (!btn) return;
    soundFX.playClick();
    app.guildAudienceFilter = btn.dataset.audienceFilter || 'all';
    syncAudienceFilterButtons('filter-guild-audience', app.guildAudienceFilter);
    renderGuildTab();
  });
  $('btn-refresh-reviews').addEventListener('click', () => refreshReviewsNow({ showFeedback: true }));
  $('guild-submit-for-review').addEventListener('change', (e) => {
    $('guild-submit-review-label')?.classList.toggle('active', Boolean(e.target.checked));
    soundFX.playClick();
  });
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

  // Propose Project Modal & Form (with Real-Time Anti-Copycat Detection)
  $('btn-open-propose').addEventListener('click', () => {
    resetProposeCopycatUi();
    openModal('modal-propose');
  });

  $('propose-name').addEventListener('input', scheduleProposeSimilarityCheck);
  $('propose-desc').addEventListener('input', scheduleProposeSimilarityCheck);

  $('btn-copycat-join').addEventListener('click', async () => {
    const match = app.proposeCheck.topMatch;
    if (!match?.projectId) return;
    closeModal('modal-propose');
    resetProposeCopycatUi();
    await joinProject(match.projectId, { scrollToCard: true });
  });

  $('propose-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('propose-name').value.trim();
    const desc = $('propose-desc').value.trim();
    const category = $('propose-category').value;
    const bountyPoolUsd = Number($('propose-bounty').value) || 0;
    const repoUrl = $('propose-repo').value.trim();
    const acknowledgeDerivative = Boolean($('propose-derivative-ack')?.checked);
    const inspiredByHash = acknowledgeDerivative ? app.proposeCheck.topMatch?.ideaHash || undefined : undefined;

    try {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        body: {
          name,
          tagline: desc,
          description: `[${category}] ${desc}`,
          bountyPoolUsd,
          repoUrl,
          ...(acknowledgeDerivative ? { acknowledgeDerivative: true, inspiredByHash } : {}),
        },
      });
      applyNewState(res.state);
      soundFX.playVerify();
      $('propose-form').reset();
      resetProposeCopycatUi();
      closeModal('modal-propose');
      showToast(t('toast.proposed', { name: res.project.name }), 'success');
    } catch (err) {
      soundFX.playReject();
      if (err.status === 409 && err.data?.code === 'POTENTIAL_COPYCAT' && err.data?.copycatMatch) {
        const cm = err.data.copycatMatch;
        renderCopycatMatchBox(cm, { isHighRisk: true, isWarning: true });
        showToast(
          t('toast.copycatBlocked', {
            name: cm.shortName || cm.name || 'Original Idea',
            pct: Math.round((Number(cm.similarity) || 0) * 100),
          }),
          'warn',
          5600,
        );
        return;
      }
      showToast(t('toast.proposeFailed', { err: err.message }), 'error');
    }
  });

  // Provenance Modal (#provenance-modal) Controls
  $('btn-prov-copy-hash').addEventListener('click', () => {
    const hashText = $('prov-idea-hash')?.textContent?.trim();
    if (hashText && hashText !== '-') {
      copyText(hashText, t('toast.hashCopied'));
    }
  });
  $('btn-prov-download-cert').addEventListener('click', triggerDownloadIdeaCert);
  $('prov-calc-revenue').addEventListener('input', renderProvenanceCalculator);
  $('prov-calc-work-pct').addEventListener('input', renderProvenanceCalculator);
  $('prov-calc-is-originator').addEventListener('change', renderProvenanceCalculator);

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
      if (typeof app.renderBgmControls === 'function') {
        app.renderBgmControls();
      }
      renderAll();
      app.tutorial?.refreshLocale();
      if ($('provenance-modal')?.classList.contains('open') && app.provModal.projectId) {
        const proj = (app.state?.projects || []).find((p) => p.id === app.provModal.projectId);
        if (proj) renderProvenanceModalContent(proj);
      }
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
    const details = $('guild-import-details');
    if (details) details.open = true;
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

    const decideReviewBtn = e.target.closest('[data-decide-review]');
    if (decideReviewBtn) {
      const reviewId = decideReviewBtn.dataset.decideReview;
      const decision = decideReviewBtn.dataset.reviewDecision;
      await decideReviewItem(reviewId, decision, decideReviewBtn);
      return;
    }

    const jumpReviewBtn = e.target.closest('[data-jump-review-queue]');
    if (jumpReviewBtn) {
      soundFX.playClick();
      const panel = $('review-queue-panel');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const joinBtn = e.target.closest('[data-join-project]');
    if (joinBtn) {
      const pid = joinBtn.dataset.joinProject;
      await joinProject(pid);
      return;
    }

    const provBtn = e.target.closest('[data-open-provenance]');
    if (provBtn) {
      const pid = provBtn.dataset.openProvenance;
      await openProvenanceModal(pid);
      return;
    }

    const autoSplitBtn = e.target.closest('[data-auto-split-btn]');
    if (autoSplitBtn) {
      const pid = autoSplitBtn.dataset.autoSplitBtn;
      await triggerAutoSplit(pid, autoSplitBtn);
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
            share: res.dividend.playerTotalUsd ?? res.dividend.playerShareUsd,
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
            share: res.dividend.playerTotalUsd ?? res.dividend.playerShareUsd,
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

  // Delegated Enter key handler for AI Smart Auto-Split inputs
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const splitInput = e.target.closest?.('[data-auto-split-input]');
    if (!splitInput) return;
    e.preventDefault();
    const pid = splitInput.dataset.autoSplitInput;
    if (pid) triggerAutoSplit(pid);
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

  app.tutorial = createTutorialController({
    getLocale,
    selectTab: (tabName) => switchTab(tabName),
    selectScene: (sceneId) => selectScene(sceneId, { syncTab: false, silent: true }),
    onSelectRole: (role) => {
      if (role === 'beginner') {
        setAudienceFilters('beginner');
        showToast(t('toast.tutorialRoleBeginner'), 'success', 3800);
      } else if (role === 'dev') {
        setAudienceFilters('dev');
        showToast(t('toast.tutorialRoleDev'), 'info', 3400);
      }
    },
    onClaimGraduationBonus: async () => {
      try {
        app.lastLocalMutationAt = Date.now();
        const res = await apiFetch('/api/tutorial/claim-bonus', {
          method: 'POST',
          body: {},
        });
        if (res.state) {
          applyNewState(res.state);
        } else {
          await refreshBootstrapNow();
        }
        const bonusGold = Number(res.bonusGold ?? res.goldAwarded ?? 100);
        if (typeof soundFX.playLaunch === 'function') {
          soundFX.playLaunch();
        } else {
          soundFX.playCoin();
        }
        showToast(t('toast.tutorialBonusClaimed', { gold: bonusGold }), 'achievement', 5200);
        return { ok: true, bonusGold };
      } catch (err) {
        if (err.status === 409) {
          soundFX.playCoin();
          showToast(t('toast.tutorialBonusAlready'), 'info', 3800);
          return { ok: false, alreadyClaimed: true };
        }
        soundFX.playReject();
        showToast(t('toast.tutorialBonusFailed', { err: err.message }), 'error', 4200);
        return { ok: false };
      }
    },
    onOpenBgm: () => {
      if (!bgmPlayer) return false;
      const cur = bgmPlayer.getState?.();
      if (!cur?.playing) {
        bgmPlayer.play();
      }
      const next = bgmPlayer.getState?.();
      app.renderBgmControls?.(next);
      if (next?.playing) {
        const trackId = next.track?.id || next.trackId || 'plaza';
        const trackName = t(`bgm.track.${trackId}`);
        showToast(t('bgm.toastPlay', { track: trackName }), 'info', 2400);
      }
      return Boolean(next?.playing);
    },
  });
  app.tutorial.setBgmPlaying(Boolean(bgmPlayer?.getState?.()?.playing));

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
    if (bgmPlayer && typeof bgmPlayer.syncScene === 'function') {
      bgmPlayer.syncScene(app.activeScene);
    }
    if (typeof app.renderBgmControls === 'function') {
      app.renderBgmControls();
    }
  }

  try {
    const data = await apiFetch('/api/bootstrap');
    seedSeenAchievements(data.state);
    applyBootstrapPayload(data, { silentAchievements: true });
    if (data?.state?.player?.tutorialBonusClaimed || data?.user?.tutorialBonusClaimed) {
      app.tutorial?.setClaimed(true);
    }
    connectSse();
    refreshMetricsNow();
    app.tutorial?.maybeAutoStart();

    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get('project');
    if (projectParam) {
      switchTab('incubator');
      setTimeout(() => {
        const card = document.querySelector(`[data-project-card="${CSS.escape(projectParam)}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('highlight-flash');
          setTimeout(() => card.classList.remove('highlight-flash'), 2600);
        }
      }, 150);
    }
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
