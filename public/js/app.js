/**
 * PixelCompute Town — 前端主控制器
 * 完整整合：後端 REST API、SSE 即時事件（含本機 CLI 心跳同步）、
 * PixelTownEngine 像素引擎、8-bit Web Audio、算力打工證 PNG、零信任 BYOK 執行器。
 */

import { PixelTownEngine } from './pixelEngine.js';
import { renderWorkerPortrait } from './sprites.js';
import { soundFX } from './sound.js';
import { renderWorkCertificate, downloadWorkCertificate } from './certCard.js';
import { applyI18nToDom, getLang, setLang, t } from './i18n.js';
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
  engine: null,
  sse: null,
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
  seenUnlockedAchievements: new Set(),
};

const ROLE_LABELS = {
  flash_worker: '⚡ 快閃工坊員',
  pro_architect: '🧠 工會架構師',
  pixel_artist: '🎨 像素美術工',
  guild_artisan: '🔨 懸賞匠人',
};

const SKIN_LABELS = {
  default: '經典原色',
  'skin-cyber': '⚡ 賽博霓虹',
  'skin-cat': '🐱 像素貓耳',
  'skin-gold': '👑 創世黃金',
};

const STREAM_LABELS = {
  bounty_fee: '⚔️ 懸賞 10% 抽成',
  incubation_carry: '🚀 孵化分紅 10%',
  billboard_ad: '📺 霓虹廣告位',
  pro_skin: '✨ 外觀 / Pro',
};

// ============================================================================
// DOM Helpers
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
    return d.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
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

async function copyText(text, successMsg = '已複製到剪貼簿！') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg, 'success', 2200);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast(successMsg, 'success', 2200);
  }
}

async function apiFetch(path, options = {}) {
  const opts = {
    method: options.method || 'GET',
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
  const bonus = ach.rewardGold > 0 ? ` (+${ach.rewardGold}G)` : '';
  soundFX.playVerify();
  showToast(
    t('toast.achievement', { title: `${ach.icon || '🏆'} ${ach.name}`, bonus }),
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

  // Aggregate player dividends per project from dividendLedger
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
  const payload = buildCertPayload();
  const canvas = renderWorkCertificate(payload);
  const img = $('cert-preview-img');
  if (img && canvas) {
    img.src = canvas.toDataURL('image/png');
  }
  const p = app.state.player || {};
  const caption = $('cert-preview-caption');
  if (caption) {
    caption.textContent = `${p.displayName || '創始鎮長'} · 信譽 ${p.reputation ?? 100} · 已驗收 ${p.completedTasks ?? 0} 單 · 累計分紅與懸賞 ${fmtUsd(p.usdBalance)}`;
  }
  openModal('modal-cert');
}

function triggerDownloadCert() {
  if (!app.state) return;
  const payload = buildCertPayload();
  const handle = (app.state.player?.username || 'founder').replace(/[^a-z0-9_-]/gi, '');
  downloadWorkCertificate(payload, `pixel-compute-town-cert-${handle}.png`);
  app.certExported = true;
  renderOnboardingBar();
  soundFX.playCoin();
  showToast('🪪 已匯出《像素算力打工證 PNG》，快去發推炫耀吧！', 'success');
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
  document.querySelectorAll('.quick-chip').forEach((chip) => {
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
// Rendering Functions
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
  const p = app.state.player || {};
  const u = app.user || p;

  $('hud-gold').textContent = `${Number(p.gold || 0).toLocaleString()} G`;
  $('hud-usd').textContent = fmtUsd(p.usdBalance || 0);
  $('hud-rep').textContent = String(p.reputation ?? 100);

  const proTag = p.isPro ? ' 💎PRO' : '';
  $('hud-user-name').textContent = `${u.displayName || p.displayName || '創始開發者'}${proTag}`;

  const avatarEl = $('hud-user-avatar');
  if (u.avatarUrl) {
    avatarEl.innerHTML = `<img src="${escapeHtml(u.avatarUrl)}" alt="avatar" />`;
  } else {
    avatarEl.textContent = u.authMode === 'github' ? '🐙' : '🧑‍💻';
  }

  const ghBtn = $('btn-github-login');
  const logoutBtn = $('btn-logout');
  if (u.authMode === 'github') {
    ghBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-flex';
  } else if (app.config?.githubOAuthEnabled) {
    ghBtn.style.display = 'inline-flex';
    logoutBtn.style.display = 'none';
  } else {
    ghBtn.style.display = 'none';
    logoutBtn.style.display = 'none';
  }
}

function renderByokIndicator() {
  const cfg = getByokConfig();
  const isLive = hasLiveApiKey(cfg);
  const dot = $('hud-byok-dot');
  const label = $('hud-byok-label');
  if (dot) {
    dot.classList.toggle('live', isLive);
  }
  if (label) {
    label.textContent = isLive
      ? t('hud.byokLive', { model: cfg.model.slice(0, 18) })
      : t('hud.byokDemo');
  }
}

function renderStageStatus() {
  const workers = app.state.workers || [];
  const projects = app.state.projects || [];
  const workingCount = workers.filter((w) => w.status === 'working').length;
  const openTasks = (app.state.tasks || []).filter((t) => t.status === 'open').length;
  const latestAct = (app.state.activityFeed || [])[0];

  const marquee = $('stage-marquee');
  if (marquee) {
    const sponsored = projects.find((p) => p.sponsoredBillboard && p.billboardText);
    marquee.textContent = latestAct?.message || sponsored?.billboardText || '像素算力鎮運行中！';
  }

  const strip = $('stage-worker-strip');
  if (strip) {
    const pills = workers
      .map((w) => {
        const isWorking = w.status === 'working';
        const icon = isWorking ? '⚡' : '☕';
        return `
          <button type="button" class="worker-strip-pill ${isWorking ? 'working' : ''}" data-select-strip-worker="${escapeHtml(w.id)}" title="${escapeHtml(w.name)} · ${escapeHtml(ROLE_LABELS[w.roleClass] || w.roleClass)}">
            <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(w.roleClass || 'flash_worker')}" data-portrait-skin="${escapeHtml(w.skin || 'default')}" data-portrait-anim="${isWorking ? 'work' : 'idle'}"></canvas>
            <span>${icon} ${escapeHtml(w.name)} Lv.${w.level} (${w.stamina}/${w.maxStamina})</span>
          </button>
        `;
      })
      .join('');
    strip.innerHTML = `
      <div class="badge-row">${pills}</div>
      <span>開工中 ${workingCount}/${workers.length} ｜ 可接任務 ${openTasks} 張</span>
    `;
    hydrateWorkerPortraits(strip);
  }
}

function renderActivityFeed() {
  const feedEl = $('activity-feed');
  if (!feedEl) return;
  const items = app.state.activityFeed || [];

  const filtered = items.filter((item) => {
    if (app.feedFilter === 'all') return true;
    if (app.feedFilter === 'deliverable') return item.type === 'complete' || item.type === 'reject';
    if (app.feedFilter === 'revenue') return ['launch', 'dividend', 'billboard', 'shop'].includes(item.type);
    if (app.feedFilter === 'cli') return item.type === 'cli';
    return true;
  });

  if (filtered.length === 0) {
    feedEl.innerHTML = '<div class="empty-state">此分類暫無小鎮動態，派一位小人上工試試吧！</div>';
    return;
  }

  feedEl.innerHTML = filtered
    .slice(0, 40)
    .map((item) => {
      const task = item.taskId ? (app.state.tasks || []).find((t) => t.id === item.taskId) : null;
      const canInspect = Boolean(task && (task.submission || task.lastRejectedVerification));
      const typeClass =
        item.type === 'complete'
          ? 'type-deliverable'
          : ['launch', 'dividend', 'billboard'].includes(item.type)
            ? 'type-revenue'
            : item.type === 'cli'
              ? 'type-cli'
              : item.type === 'reject'
                ? 'type-reject'
                : '';

      return `
        <div class="feed-item ${typeClass}">
          <div class="feed-row">
            <span class="feed-msg">${escapeHtml(item.icon || '📌')} ${escapeHtml(item.message)}</span>
            <span class="feed-time">${fmtTime(item.timestamp)}</span>
          </div>
          ${item.preview ? `<div class="feed-preview">${escapeHtml(item.preview)}</div>` : ''}
          ${
            canInspect
              ? `<div class="feed-actions">
                  <button type="button" class="btn btn-sm" data-inspect-task="${escapeHtml(task.id)}">🔍 查看完整交付與驗收報告</button>
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
  const currentVal = selectEl.value || 'all';
  const projects = app.state.projects || [];
  selectEl.innerHTML =
    '<option value="all">全部項目</option>' +
    projects.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.shortName || p.name)}</option>`).join('');
  if ([...selectEl.options].some((o) => o.value === currentVal)) {
    selectEl.value = currentVal;
  }
}

function populateWorkerSelect(selectEl, track) {
  if (!selectEl) return;
  const currentVal = selectEl.value;
  const list = (app.state.workers || []).filter((w) => w.track === track);
  if (list.length === 0) {
    selectEl.innerHTML = '<option value="">尚無對應軌道小人</option>';
    return;
  }
  selectEl.innerHTML = list
    .map((w) => {
      const busyMark = w.status === 'working' || app.busyWorkers.has(w.id) ? ' [工作中]' : '';
      return `<option value="${escapeHtml(w.id)}">${escapeHtml(w.name)} (${w.stamina}/${w.maxStamina})${busyMark}</option>`;
    })
    .join('');
  if ([...selectEl.options].some((o) => o.value === currentVal)) {
    selectEl.value = currentVal;
  }
}

function renderFactoryTab() {
  const projFilter = $('factory-project-filter');
  const statusFilter = $('factory-status-filter');
  const workerSelect = $('factory-worker-select');
  populateProjectFilterSelect(projFilter);
  populateWorkerSelect(workerSelect, 'api');

  const selectedProj = projFilter?.value || 'all';
  const selectedStatus = statusFilter?.value || 'all';
  const projectMap = new Map((app.state.projects || []).map((p) => [p.id, p]));
  const workerMap = new Map((app.state.workers || []).map((w) => [w.id, w]));

  const tasks = (app.state.tasks || []).filter((t) => {
    if (t.track !== 'api_auto') return false;
    if (selectedProj !== 'all' && t.projectId !== selectedProj) return false;
    if (selectedStatus === 'open' && t.status !== 'open' && t.status !== 'in_progress') return false;
    if (selectedStatus === 'completed' && t.status !== 'completed') return false;
    return true;
  });

  const listEl = $('factory-task-list');
  if (!listEl) return;

  if (tasks.length === 0) {
    listEl.innerHTML = '<div class="empty-state">目前沒有符合篩選條件的 API 任務。快去「孵化廣場」幫 PixelPomo 投票解鎖新任務吧！</div>';
    return;
  }

  listEl.innerHTML = tasks
    .map((task) => {
      const proj = projectMap.get(task.projectId);
      const isCompleted = task.status === 'completed';
      const isWorking = task.status === 'in_progress';
      const assignedWorker = workerMap.get(task.assignedWorkerId || task.submission?.workerId || '');
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
              <span>${isWorking ? '⚡' : '✅'} ${escapeHtml(assignedWorker.name)} ${isWorking ? '趕工中' : '交付'}</span>
            </div>
          `
          : '';

      return `
        <article class="pixel-card ${isWorking ? 'in-progress' : ''}">
          <div class="card-head">
            <div>
              <h3 class="card-title">${escapeHtml(task.title)}</h3>
              <p class="card-subtitle">${escapeHtml(task.description || '')}</p>
            </div>
            ${statusBadge}
          </div>
          ${workerChipHtml}
          <div class="badge-row">
            <span class="badge">📦 ${escapeHtml(proj?.shortName || task.projectId)}</span>
            <span class="badge cyan">🤖 ${escapeHtml(task.modelSuggestion || 'gemini-2.5-flash')}</span>
            <span class="badge">⚡ ${(task.tokenCostEst || 0).toLocaleString()} tok / -${task.staminaCost || 12}</span>
            <span class="badge gold">🪙 +${task.goldReward}G</span>
            <span class="badge pink">✨ +${task.contributionPoints} pt</span>
            ${task.cashBountyUsd > 0 ? `<span class="badge green">💵 $${task.cashBountyUsd} ($${(task.cashBountyUsd * 0.9).toFixed(2)} net)</span>` : ''}
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
      projects.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.shortName || p.name)}</option>`).join('');
    if ([...importProjSelect.options].some((o) => o.value === prev)) {
      importProjSelect.value = prev;
    }
  }

  const selectedProj = projFilter?.value || 'all';
  const projectMap = new Map((app.state.projects || []).map((p) => [p.id, p]));
  const workerMap = new Map((app.state.workers || []).map((w) => [w.id, w]));

  const tasks = (app.state.tasks || []).filter((t) => {
    if (t.track !== 'guild_bounty') return false;
    if (selectedProj !== 'all' && t.projectId !== selectedProj) return false;
    return true;
  });

  const listEl = $('guild-task-list');
  if (!listEl) return;

  if (tasks.length === 0) {
    listEl.innerHTML = '<div class="empty-state">暫無工會大單，前往孵化廣場投票解鎖新項目可自動生成高價值懸賞！</div>';
    return;
  }

  listEl.innerHTML = tasks
    .map((task) => {
      const proj = projectMap.get(task.projectId);
      const isCompleted = task.status === 'completed';
      const isWorking = task.status === 'in_progress';
      const assignedWorker = workerMap.get(task.assignedWorkerId || task.submission?.workerId || '');
      const netUsd = Number((task.cashBountyUsd * 0.9).toFixed(2));
      const feeUsd = Number((task.cashBountyUsd * 0.1).toFixed(2));
      const workerChipHtml =
        assignedWorker && (isWorking || isCompleted)
          ? `
            <div class="task-worker-chip ${isCompleted ? 'completed' : ''}">
              <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(assignedWorker.roleClass || 'pro_architect')}" data-portrait-skin="${escapeHtml(assignedWorker.skin || 'default')}" data-portrait-anim="${isWorking ? 'work' : 'celebrate'}"></canvas>
              <span>${isWorking ? '⚔️' : '✅'} ${escapeHtml(assignedWorker.name)} ${isWorking ? '接單處理中' : '結案'}</span>
            </div>
          `
          : '';

      return `
        <article class="pixel-card ${isWorking ? 'in-progress' : ''}">
          <div class="card-head">
            <div>
              <h3 class="card-title">${escapeHtml(task.title)}</h3>
              <p class="card-subtitle">${escapeHtml(task.description || '')}</p>
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
            <span class="badge">📦 ${escapeHtml(proj?.shortName || task.projectId)}</span>
            <span class="badge amber">🖥️ ${escapeHtml(task.modelSuggestion || 'Gemini CLI / Claude Code')}</span>
            <span class="badge gold">🪙 +${task.goldReward}G</span>
            <span class="badge pink">✨ +${task.contributionPoints} pt</span>
            ${
              task.cashBountyUsd > 0
                ? `<span class="badge green">💰 $${task.cashBountyUsd} ($${netUsd} net / $${feeUsd} fee)</span>`
                : '<span class="badge cyan">🚀 30/60/10 Pool</span>'
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
  const listEl = $('project-list');
  if (!listEl) return;
  const projects = app.state.projects || [];
  const playerId = app.state.player?.id || 'founder-demo';
  const billboardPrice = app.config?.billboardPriceUsd ?? 29;

  const votingCnt = projects.filter((p) => p.status === 'voting').length;
  const buildingCnt = projects.filter((p) => p.status === 'building').length;
  const launchedCnt = projects.filter((p) => p.status === 'launched').length;
  $('incubator-summary').textContent = `投票中 ${votingCnt} ｜ 建設中 ${buildingCnt} ｜ 已上線 ${launchedCnt} ｜ 30/60/10 透明分紅`;

  listEl.innerHTML = projects
    .map((p) => {
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
                ${escapeHtml(p.name)}
                ${p.sponsoredBillboard ? '<span class="badge pink" style="margin-left: 6px;">📺 霓虹廣告置頂</span>' : ''}
              </h3>
              <p class="card-subtitle">${escapeHtml(p.tagline || p.description || '')}</p>
            </div>
            ${
              isVoting
                ? `<span class="badge amber">🗳️ 投票中 (${p.votes}/${p.votesRequired})</span>`
                : isLaunched
                  ? '<span class="badge green">🚀 已發布上線</span>'
                  : `<span class="badge cyan">🏗️ 建設中 ${p.progressPct}%</span>`
            }
          </div>

          <div class="badge-row">
            <span class="badge">👤 發起人：${escapeHtml(p.creatorName || '社群')}</span>
            <span class="badge pink">📊 分紅池 30/60/10</span>
            <span class="badge cyan">✨ 你持有 ${myPts} 貢獻點（約佔貢獻池 ${mySharePct}%）</span>
            ${p.bountyPoolUsd > 0 ? `<span class="badge gold">💰 現金懸賞池 $${p.bountyPoolUsd}</span>` : ''}
            ${p.totalRevenueUsd > 0 ? `<span class="badge green">💵 累計產品營收 ${fmtUsd(p.totalRevenueUsd)}</span>` : ''}
          </div>

          ${
            isVoting
              ? `<div class="progress-wrap">
                  <div class="progress-label">
                    <span>立項投票進度（還差 ${votesLeft} 票自動破土並生成 5 張雙軌任務！）</span>
                    <span>${p.votes} / ${p.votesRequired} 票</span>
                  </div>
                  <div class="progress-track">
                    <div class="progress-fill amber" style="width: ${votePct}%;"></div>
                  </div>
                </div>`
              : `<div class="progress-wrap">
                  <div class="progress-label">
                    <span>${isLaunched ? '已上線營運中 · 持續分紅' : canLaunch ? '🎉 已達 100%！可立即發布上線並結算首日分紅！' : '雙軌算力開發進度'}</span>
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
                  ? `<button type="button" class="btn btn-sm" data-billboard-project="${escapeHtml(p.id)}">📺 租用像素霓虹廣告位 ($${billboardPrice})</button>`
                  : `<span class="mono" style="font-size: 11px; color: var(--accent-pink);">✨ 廣場霓虹看板曝光中</span>`
              }
            </div>
            <div class="toolbar-group">
              ${
                isVoting
                  ? `<button type="button" class="btn btn-sm btn-amber" data-vote-project="${escapeHtml(p.id)}">🗳️ 投贊成票 (+1)</button>`
                  : ''
              }
              ${
                canLaunch
                  ? `<button type="button" class="btn btn-sm btn-green" data-launch-project="${escapeHtml(p.id)}">🚀 一鍵發布上線！（觸發 $200 首日分紅）</button>`
                  : ''
              }
              ${
                isLaunched
                  ? `<button type="button" class="btn btn-sm btn-green" data-sim-revenue="${escapeHtml(p.id)}">💸 模擬產生 $100 營收並分紅</button>`
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
  const workerList = $('worker-list');
  const workers = app.state.workers || [];
  const ownedSkins = app.state.player?.ownedSkins || ['default'];

  if (workerList) {
    workerList.innerHTML = workers
      .map((w) => {
        const staminaPct = Math.round(((w.stamina || 0) / (w.maxStamina || 100)) * 100);
        const capUnit = w.track === 'api' ? 'tokens' : '次/日';
        const skinOpts = ownedSkins
          .map(
            (sid) =>
              `<option value="${escapeHtml(sid)}" ${w.skin === sid ? 'selected' : ''}>${escapeHtml(SKIN_LABELS[sid] || sid)}</option>`,
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
                  <h3 class="card-title">${escapeHtml(w.name)} <span class="badge cyan">Lv.${w.level}</span></h3>
                  <p class="card-subtitle">${escapeHtml(ROLE_LABELS[w.roleClass] || w.roleClass)} ｜ ${escapeHtml(w.providerLabel || '')}</p>
                </div>
              </div>
              <span class="badge ${w.status === 'working' ? 'cyan' : 'green'}">${w.status === 'working' ? '⚡ 趕工中' : '☕ 待命中'}</span>
            </div>

            <div class="progress-wrap">
              <div class="progress-label">
                <span>體力值 ${w.stamina} / ${w.maxStamina} ｜ 今日額度 ${Number(w.usedTokensToday || 0).toLocaleString()} / ${Number(w.dailyTokenCap || 0).toLocaleString()} ${capUnit}</span>
                <span>XP ${w.xp}/${w.xpToNext}</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill ${staminaPct < 30 ? 'pink' : 'green'}" style="width: ${staminaPct}%;"></div>
              </div>
            </div>

            <div class="card-meta-grid">
              <span>軌道：${w.track === 'api' ? '自動工坊 (API)' : '懸賞工會 (BYOT)'}</span>
              <span>完工：${w.completedCount || 0} 單</span>
              <span>累積：${w.earnedGold || 0}G / ${w.earnedPoints || 0} 貢獻</span>
            </div>

            <div class="card-footer">
              <div class="worker-cap-row">
                <span class="mono" style="font-size: 11px;">每日上限：</span>
                <input type="number" class="input worker-cap-input" data-cap-input="${escapeHtml(w.id)}" value="${w.dailyTokenCap}" min="10" max="10000000" />
                <button type="button" class="btn btn-sm" data-save-cap="${escapeHtml(w.id)}">儲存上限</button>
              </div>
              <div class="toolbar-group">
                <select class="select select-inline" data-skin-select="${escapeHtml(w.id)}" aria-label="更換皮膚">${skinOpts}</select>
                <button type="button" class="btn btn-sm btn-amber" data-rest-worker="${escapeHtml(w.id)}">☕ 喝咖啡回體力</button>
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
      achList.innerHTML = '<div class="empty-state">尚無創世成就資料。</div>';
    } else {
      achList.innerHTML = achievements
        .map(
          (a) => `
            <article class="achievement-card ${a.unlocked ? 'unlocked' : ''}">
              <div class="achievement-icon" aria-hidden="true">${escapeHtml(a.icon || '🏆')}</div>
              <div class="achievement-info">
                <div class="achievement-name">
                  <span>${escapeHtml(a.name)}</span>
                  <span class="badge ${a.unlocked ? 'gold' : ''}">${a.unlocked ? '✓ 已解鎖' : `+${a.rewardGold || 0}G`}</span>
                </div>
                <div class="achievement-desc">${escapeHtml(a.description || '')}</div>
              </div>
            </article>
          `,
        )
        .join('');
    }
  }

  // Shop items
  const shopList = $('shop-list');
  const ownedItems = app.state.player?.ownedItems || [];
  if (shopList) {
    shopList.innerHTML = (app.shopItems || [])
      .map((item) => {
        const owned = ownedItems.includes(item.id);
        const priceLabel = item.priceUsd > 0 ? `$${item.priceUsd} USD` : `${item.priceGold} G`;
        const previewSkinId = item.skinId || '';
        const previewRole = SKIN_PREVIEW_ROLES[previewSkinId] || workers[0]?.roleClass || 'flash_worker';
        const hasSingleSkinPreview = Boolean(previewSkinId);
        const bundleSkins = Array.isArray(item.unlockSkins) ? item.unlockSkins : [];
        const bundleStripHtml =
          bundleSkins.length > 1
            ? `
              <div class="shop-bundle-strip" title="內含全部限定皮膚預覽">
                ${bundleSkins
                  .map(
                    (sid) =>
                      `<canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(SKIN_PREVIEW_ROLES[sid] || 'flash_worker')}" data-portrait-skin="${escapeHtml(sid)}"></canvas>`,
                  )
                  .join('')}
                <span class="mono" style="font-size: 11px; color: var(--accent-gold);">3 款 HD 皮膚全收錄</span>
              </div>
            `
            : '';

        return `
          <article class="pixel-card">
            <div class="card-head">
              <div class="shop-card-lead">
                ${
                  hasSingleSkinPreview
                    ? `<div class="shop-skin-preview ${escapeHtml(previewSkinId)}" title="HD 皮膚試穿預覽">
                        <canvas class="hd-portrait" width="72" height="72" data-portrait-role="${escapeHtml(previewRole)}" data-portrait-skin="${escapeHtml(previewSkinId)}"></canvas>
                      </div>`
                    : ''
                }
                <div style="min-width: 0; flex: 1;">
                  <h3 class="card-title">${escapeHtml(item.icon || '🛍️')} ${escapeHtml(item.name)}</h3>
                  <p class="card-subtitle">${escapeHtml(item.description || '')}</p>
                </div>
              </div>
              <span class="badge ${item.priceUsd > 0 ? 'pink' : 'gold'}">${escapeHtml(item.badge || '')}</span>
            </div>
            ${bundleStripHtml}
            <div class="card-footer">
              <span class="mono" style="font-weight: 800; color: ${item.priceUsd > 0 ? 'var(--accent-green)' : 'var(--accent-gold)'};">${priceLabel}</span>
              ${
                owned
                  ? '<span class="badge green">✓ 已擁有</span>'
                  : `<button type="button" class="btn btn-sm ${item.priceUsd > 0 ? 'btn-pink' : 'btn-primary'}" data-buy-item="${escapeHtml(item.id)}">購買</button>`
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
      histEl.innerHTML = '<div class="empty-state">尚無營收流水紀錄。</div>';
    } else {
      histEl.innerHTML = history
        .slice(0, 15)
        .map(
          (row) => `
          <div class="ledger-row">
            <div>
              <span class="badge cyan">${escapeHtml(STREAM_LABELS[row.stream] || row.stream)}</span>
              <span style="margin-left: 6px;">${escapeHtml(row.label)}</span>
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
        const rank = idx + 1;
        const rankClass = rank <= 3 ? `top-${rank}` : '';
        const portraitMeta = rank <= 3 ? resolveLeaderboardPortrait(row, rank) : null;
        const crownTier = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const avatarHtml = portraitMeta
          ? `
            <div class="lb-avatar-badge ${rankClass}" title="Top ${rank} HD 像素徽章">
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
                <strong>${escapeHtml(row.displayName)}</strong>
                <span class="mono" style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">${escapeHtml(row.handle || '')}</span>
                ${row.badge ? `<span class="badge amber" style="margin-left: 5px;">${escapeHtml(row.badge)}</span>` : ''}
              </div>
            </div>
            <div class="mono" style="display: flex; gap: 10px; align-items: center; font-size: 11px; flex-shrink: 0;">
              <span style="color: var(--accent-pink);">${row.contributionPoints || 0} 貢獻</span>
              <span style="color: var(--accent-green);">${fmtUsd(row.earnedUsd || 0)}</span>
              <span style="color: var(--accent-cyan);">信譽 ${row.reputation ?? 100}</span>
            </div>
          </div>
        `;
      })
      .join('');
    hydrateWorkerPortraits(lbEl);
  }
}

// ============================================================================
// Core Interactive Flows
// ============================================================================
async function releaseClaimedTask(taskId, workerId, reason = 'BYOK 執行中止，自動釋放任務') {
  try {
    const relRes = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/release`, {
      method: 'POST',
      body: { workerId, reason },
    });
    if (relRes?.state) {
      applyNewState(relRes.state);
    }
  } catch {
    // Best-effort release; state_sync will reconcile if needed
  }
}

async function dispatchApiTask(taskId, explicitWorkerId = null) {
  const task = (app.state?.tasks || []).find((t) => t.id === taskId);
  if (!task) return;
  const workerId = explicitWorkerId || $('factory-worker-select')?.value;
  if (!workerId) {
    showToast('請先選擇或招募一位 API 軌道小人！', 'warn');
    return;
  }
  if (app.busyWorkers.has(workerId)) {
    showToast('該小人正在瀏覽器端執行模型呼叫中，請稍候...', 'warn');
    return;
  }

  app.busyWorkers.add(workerId);
  let claimed = false;
  try {
    // 1. Claim on server
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
    showToast(
      `🚀 【${claimRes.worker.name}】已進駐自動工坊（${hasLiveApiKey(cfg) ? `BYOK ${cfg.model}` : '免金鑰擬真引擎'}）...`,
      'info',
    );

    // 2. Execute zero-trust BYOK runner in browser
    const runRes = await runApiTask(claimRes.task, claimRes.worker, cfg, {
      project: claimRes.project,
      onProgress: (msg) => {
        const hint = $('stage-overlay-hint');
        if (hint) hint.textContent = `⚡ ${claimRes.worker.name}：${msg}`;
      },
    });

    if (!runRes.ok) {
      await releaseClaimedTask(taskId, workerId, runRes.error || 'BYOK 執行失敗');
      claimed = false;
      showToast(`${runRes.error || 'BYOK 執行失敗'}（已自動釋放任務與小人，修正後可重試）`, 'error', 5200);
      soundFX.playReject();
      return;
    }

    // 3. Submit deliverable to Proof of Accepted Work verifier
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
      const bountyNote = r.bountyNetUsd > 0 ? `、懸賞實得 $${r.bountyNetUsd}` : '';
      showToast(
        `✅ 驗收通過（${submitRes.verification.score}分）！+${r.gold}G、+${r.contributionPoints} 貢獻點${bountyNote}`,
        'success',
        4200,
      );
    } else {
      soundFX.playReject();
      showToast(`🛡️ 防作弊驗收未通過：${submitRes.verification.reason}`, 'error', 5000);
    }
  } catch (err) {
    if (claimed) {
      await releaseClaimedTask(taskId, workerId, err.message || '執行過程發生例外');
      claimed = false;
    }
    soundFX.playReject();
    showToast(`派工失敗：${err.message}`, 'error', 4200);
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
    showToast('🤖 自動掛機（Auto-Pilot）已啟動！將自動幫閒置 API 小人接單並跑完驗收。', 'success');
    runAutoPilotTick();
    app.autoPilotTimer = setInterval(runAutoPilotTick, 6000);
  } else {
    showToast('⏹️ 已暫停自動掛機模式。', 'info');
  }
}

async function runAutoPilotTick() {
  if (!app.autoPilotOn || !app.state) return;
  const idleApiWorker = (app.state.workers || []).find(
    (w) => w.track === 'api' && w.status === 'idle' && !app.busyWorkers.has(w.id) && (w.stamina || 0) >= 15,
  );
  if (!idleApiWorker) return;

  const openApiTask = (app.state.tasks || []).find(
    (t) =>
      t.track === 'api_auto' &&
      t.status === 'open' &&
      idleApiWorker.stamina >= (t.staminaCost || 12) &&
      (idleApiWorker.usedTokensToday || 0) + (t.tokenCostEst || 0) <= (idleApiWorker.dailyTokenCap || 9999999),
  );
  if (!openApiTask) return;

  await dispatchApiTask(openApiTask.id, idleApiWorker.id);
}

// ============================================================================
// Guild Workbench (BYOT) Flow
// ============================================================================
async function openGuildWorkbench(taskId) {
  const task = (app.state?.tasks || []).find((t) => t.id === taskId);
  if (!task) return;
  const workerId = task.assignedWorkerId || $('guild-worker-select')?.value;
  const project = (app.state?.projects || []).find((p) => p.id === task.projectId);

  // If task is still open, claim it first so the pixel worker walks to the Guild desk!
  if (task.status === 'open') {
    if (!workerId) {
      showToast('請先選擇或招募一位月/週額度軌道小人！', 'warn');
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
      showToast(`⚔️ 【${claimRes.worker.name}】已撕下懸賞令並就座工會工作台！`, 'success');
    } catch (err) {
      soundFX.playReject();
      showToast(`無法接單：${err.message}`, 'error');
      return;
    }
  }

  const freshTask = (app.state?.tasks || []).find((t) => t.id === taskId) || task;
  const assignedWorker = (app.state?.workers || []).find((w) => w.id === (freshTask.assignedWorkerId || workerId));
  app.activeGuildTaskId = freshTask.id;

  $('guild-modal-title').textContent = `⚔️ 工會工作台：${freshTask.title}`;
  $('guild-modal-meta').innerHTML = `
    <span class="badge">📦 ${escapeHtml(project?.shortName || freshTask.projectId)}</span>
    <span class="badge cyan">👾 小人：${escapeHtml(assignedWorker?.name || '工會小人')}</span>
    <span class="badge gold">🪙 +${freshTask.goldReward}G</span>
    <span class="badge pink">✨ +${freshTask.contributionPoints} 貢獻</span>
    ${freshTask.cashBountyUsd > 0 ? `<span class="badge green">💰 懸賞 $${freshTask.cashBountyUsd}（實得 $${(freshTask.cashBountyUsd * 0.9).toFixed(2)}）</span>` : ''}
  `;

  const criteriaArr = Array.isArray(freshTask.acceptanceCriteria) ? freshTask.acceptanceCriteria : [];
  $('guild-modal-criteria').innerHTML = `
    <span><strong>驗收條件：</strong>${escapeHtml(criteriaArr.join(' ｜ ') || '提供完整可驗證實作程式碼或合法 GitHub PR 連結')}</span>
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
  const task = (app.state?.tasks || []).find((t) => t.id === taskId);
  if (!task) return;
  const workerId = task.assignedWorkerId || $('guild-worker-select')?.value;
  const worker = (app.state?.workers || []).find((w) => w.id === workerId);
  const project = (app.state?.projects || []).find((p) => p.id === task.projectId);

  const btn = $('btn-guild-sim-cli');
  if (btn) btn.disabled = true;

  try {
    const steps = [
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
    showToast('⚡ 本機 CLI 模擬執行完成並已直播心跳至像素小鎮！請確認內容後點擊「提交成果並驗收結算」。', 'success', 4500);
  } catch (err) {
    showToast(`模擬 CLI 心跳失敗：${err.message}`, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function submitGuildTask() {
  const taskId = app.activeGuildTaskId;
  if (!taskId) return;
  const task = (app.state?.tasks || []).find((t) => t.id === taskId);
  const workerId = task?.assignedWorkerId || $('guild-worker-select')?.value;
  const content = $('guild-submit-content').value.trim();
  const prUrl = $('guild-submit-pr-url').value.trim();

  if (!content && !prUrl) {
    showToast('請先貼上交付內容或 GitHub PR 連結（或點擊「模擬本機 CLI 交付」體驗）！', 'warn');
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
      const bountyNote = r.bountyNetUsd > 0 ? `、懸賞實得 $${r.bountyNetUsd}（10% 服務費 $${r.platformFeeUsd}）` : '';
      showToast(
        `✅ 工會大單驗收通過（${res.verification.score}分）！+${r.gold}G、+${r.contributionPoints} 貢獻點${bountyNote}`,
        'success',
        4800,
      );
    } else {
      soundFX.playReject();
      showToast(`🛡️ 防作弊攔截：${res.verification.reason}`, 'error', 5500);
      openTaskReportModal(taskId);
    }
  } catch (err) {
    soundFX.playReject();
    showToast(`提交驗收失敗：${err.message}`, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================================================
// Deliverable & Verifier Report Viewer
// ============================================================================
function openTaskReportModal(taskId) {
  const task = (app.state?.tasks || []).find((t) => t.id === taskId);
  if (!task) return;

  const verification = task.verification || task.lastRejectedVerification;
  const submission = task.submission;

  $('report-modal-title').textContent = `📋 交付與驗收報告：${task.title}`;
  $('report-summary-bar').innerHTML = `
    <span class="badge ${verification?.passed ? 'green' : 'red'}">${verification?.passed ? '✅ 驗收通過' : '❌ 驗收攔截'}</span>
    <span class="badge amber">品質評分：${verification?.score ?? 0} / 100</span>
    ${submission?.executionMode ? `<span class="badge cyan">執行模式：${escapeHtml(submission.executionMode)}</span>` : ''}
    ${submission?.prUrl ? `<span class="badge pink">PR：${escapeHtml(submission.prUrl)}</span>` : ''}
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
    : '<div class="empty-state">無細項驗收紀錄</div>';

  app.activeReportText = submission?.content || verification?.reason || '（無交付內容）';
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
    '<option value="">-- 選擇推薦模型 --</option>' +
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

  const setSseStatus = (state, text) => {
    const dot = $('sse-dot');
    const label = $('sse-label');
    if (dot) {
      dot.classList.remove('live', 'offline');
      if (state === 'live') dot.classList.add('live');
      if (state === 'offline') dot.classList.add('offline');
    }
    if (label) label.textContent = text;
  };

  sse.addEventListener('connected', () => {
    setSseStatus('live', 'SSE 即時連線');
  });

  sse.addEventListener('cli_heartbeat', (evt) => {
    try {
      const data = JSON.parse(evt.data);
      app.engine?.triggerCliActivity(data.workerId, data.message || '本機 CLI 同步中...');
      const hint = $('stage-overlay-hint');
      if (hint) {
        const pct = data.progressPct != null ? ` (${data.progressPct}%)` : '';
        hint.textContent = `💻 [CLI] ${data.workerName || '小人'}：${data.message}${pct}`;
      }
      scheduleBootstrapRefresh();
    } catch {
      // ignore malformed payload
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

  sse.addEventListener('tasks_imported', () => {
    if (Date.now() - app.lastLocalMutationAt < 500) return;
    scheduleBootstrapRefresh();
  });

  sse.addEventListener('world_reset', () => {
    resetTransientUiAfterWorldReset();
    scheduleBootstrapRefresh();
  });

  sse.addEventListener('state_sync', () => {
    // Avoid redundant fetch right after our own HTTP mutation already applied the fresh state
    if (Date.now() - app.lastLocalMutationAt < 500) return;
    scheduleBootstrapRefresh();
  });

  sse.onerror = () => {
    setSseStatus('offline', 'SSE 重連中...');
  };
}

function scheduleBootstrapRefresh() {
  if (app.syncDebounceTimer) return;
  app.syncDebounceTimer = setTimeout(async () => {
    app.syncDebounceTimer = null;
    try {
      const data = await apiFetch('/api/bootstrap');
      app.user = data.user;
      app.state = data.state;
      app.shopItems = data.shopItems || app.shopItems;
      app.workerTemplates = data.workerTemplates || app.workerTemplates;
      app.config = data.config || app.config;
      app.engine?.syncState(app.state);
      renderAll();
    } catch {
      // keep existing state on transient error
    }
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
  document.querySelectorAll('.quick-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const sceneId = chip.dataset.scene || chip.dataset.building;
      if (!sceneId) return;
      if (sceneId === 'town') {
        selectScene('town', { syncTab: false });
      } else {
        selectScene(sceneId, { syncTab: true });
      }
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
    showToast(enabled ? '🔊 已開啟 8-bit 復古音效' : '🔇 已靜音', 'info', 1800);
  });

  $('btn-open-cert').addEventListener('click', openCertModal);
  $('btn-workers-preview-cert').addEventListener('click', openCertModal);
  $('btn-workers-download-cert').addEventListener('click', triggerDownloadCert);
  $('btn-modal-download-cert').addEventListener('click', triggerDownloadCert);

  $('btn-copy-share-text').addEventListener('click', () => {
    const p = app.state?.player || {};
    const text = `剛把我的閒置 Gemini 額度派去《像素算力鎮 PixelCompute Town》打工啦！👾\n目前信譽 ${p.reputation ?? 100}、已通過 ${p.completedTasks ?? 0} 張 Proof of Accepted Work 驗收、累計獲得 ${fmtUsd(p.usdBalance)}！\n#PixelComputeTown #IndieDev #GeminiAPI`;
    copyText(text, '📋 已複製炫耀貼文，快配上打工證 PNG 發推吧！');
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

  $('btn-logout').addEventListener('click', async () => {
    try {
      const res = await apiFetch('/api/auth/logout', { method: 'POST' });
      app.user = res.user;
      showToast(res.message || '已登出並切回創始開發者 Demo 模式', 'info');
      scheduleBootstrapRefresh();
    } catch (err) {
      showToast(`登出失敗：${err.message}`, 'error');
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
    resultBox.textContent = '⏳ 正在由瀏覽器直連模型端點進行測試...';
    const res = await testConnection(readByokFormValues());
    resultBox.textContent = `${res.ok ? '✅' : '❌'} ${res.message}`;
    if (res.ok) soundFX.playVerify();
    else soundFX.playReject();
  });

  $('btn-save-byok').addEventListener('click', () => {
    saveByokConfig(readByokFormValues());
    renderByokIndicator();
    soundFX.playCoin();
    showToast('💾 BYOK 設定已安全儲存於你的本機瀏覽器（絕不上傳伺服器）！', 'success');
    closeModal('modal-settings');
  });

  $('btn-clear-byok').addEventListener('click', () => {
    clearByokKey();
    syncByokModalFields();
    renderByokIndicator();
    showToast('🗑️ 已清除瀏覽器內儲存的 API Key，切換回免金鑰擬真體驗模式。', 'info');
  });

  $('btn-copy-quick-cli').addEventListener('click', () => {
    copyText($('cli-quick-cmd').textContent, '📋 已複製本機 CLI 指令！');
  });

  // Factory filters & Auto-Pilot
  $('factory-project-filter').addEventListener('change', renderFactoryTab);
  $('factory-status-filter').addEventListener('change', renderFactoryTab);
  $('toggle-autopilot').addEventListener('change', (e) => setAutoPilot(e.target.checked));

  // Guild filters & Workbench actions
  $('guild-project-filter').addEventListener('change', renderGuildTab);
  $('btn-copy-context-pack').addEventListener('click', () => {
    copyText($('guild-context-pack').value, '📋 已複製標準化 Context Pack，直接貼給 Gemini CLI / Claude Code 即可！');
  });
  $('btn-copy-cli-cmd').addEventListener('click', () => {
    copyText($('guild-cli-cmd').textContent, '📋 已複製 pixel-worker 本機同步指令！');
  });
  $('btn-guild-sim-cli').addEventListener('click', simulateLocalCliDelivery);
  $('btn-guild-submit').addEventListener('click', submitGuildTask);

  $('btn-verify-pr').addEventListener('click', async () => {
    const prUrl = $('guild-submit-pr-url').value.trim();
    const out = $('guild-pr-verify-result');
    if (!prUrl) {
      out.textContent = '請先輸入 GitHub PR 網址。';
      return;
    }
    out.textContent = '🔍 正在驗證 GitHub PR 格式與狀態...';
    try {
      const res = await apiFetch('/api/github/verify-pr', {
        method: 'POST',
        body: { prUrl },
      });
      const remoteNote = res.remoteStatus?.title
        ? `｜標題：${res.remoteStatus.title} (${res.remoteStatus.merged ? '已合併' : res.remoteStatus.state})`
        : res.remoteStatus?.note
          ? `｜${res.remoteStatus.note}`
          : '';
      out.textContent = `✅ 格式合法：${res.pr.owner}/${res.pr.repo} #${res.pr.pullNumber}${remoteNote}`;
      soundFX.playVerify();
    } catch (err) {
      out.textContent = `❌ ${err.message}`;
      soundFX.playReject();
    }
  });

  // Report copy
  $('btn-copy-report').addEventListener('click', () => {
    copyText(app.activeReportText, '📋 已複製交付成果原文！');
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
      showToast(`💡 新項目《${res.project.name}》已上牆開放社群投票！`, 'success');
    } catch (err) {
      soundFX.playReject();
      showToast(`提案失敗：${err.message}`, 'error');
    }
  });

  // Recruit Worker Form (auto-fill defaults when role changes)
  $('recruit-role').addEventListener('change', (e) => {
    const tpl = (app.workerTemplates || []).find((t) => t.roleClass === e.target.value);
    if (tpl) {
      $('recruit-provider').value = tpl.defaultProvider;
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
      showToast(`👾 成功招募新小人【${res.worker.name}】進駐小鎮！`, 'success');
    } catch (err) {
      soundFX.playReject();
      showToast(`招募失敗：${err.message}`, 'error');
    }
  });

  // Trilingual live language switcher
  document.querySelectorAll('#lang-switch [data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLang(lang);
      document.querySelectorAll('#lang-switch [data-lang]').forEach((b) => {
        b.classList.toggle('active', b.dataset.lang === lang);
      });
      applyI18nToDom();
      updateSceneHint(app.activeScene);
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
      resultEl.textContent = '⏳ 正在向 GitHub Issues API 匯入公開倉庫任務...';
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
      const modeTag = res.fallbackUsed ? `（離線預覽：${res.fallbackReason || '限流降級'}）` : '（真實 GitHub Issue）';
      const summary = `✅ 已從 ${res.repo?.fullName || repoUrl} 匯入 ${res.importedCount} 張任務卡至《${res.project?.shortName || res.project?.name}》${modeTag}`;
      if (resultEl) resultEl.textContent = summary;
      showToast(summary, 'success', 4800);
      $('gh-import-repo').value = '';
      if (track === 'api_auto') {
        switchTab('factory');
      }
    } catch (err) {
      soundFX.playReject();
      if (resultEl) resultEl.textContent = `❌ 匯入失敗：${err.message}`;
      showToast(`GitHub 匯入失敗：${err.message}`, 'error', 4200);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Reset world button
  $('btn-reset-world').addEventListener('click', async () => {
    if (!window.confirm('確定要重置像素算力鎮示範世界？所有測試任務、進度與帳本將回到初始創世狀態。')) {
      return;
    }
    try {
      setAutoPilot(false);
      $('toggle-autopilot').checked = false;
      app.lastLocalMutationAt = Date.now();
      const res = await apiFetch('/api/reset', { method: 'POST' });
      resetTransientUiAfterWorldReset();
      applyNewState(res.state, { silentAchievements: true });
      seedSeenAchievements(res.state);
      soundFX.playClick();
      showToast(t('toast.resetDone'), 'info');
    } catch (err) {
      showToast(`重置失敗：${err.message}`, 'error');
    }
  });

  // Delegated click handlers for dynamically rendered lists
  document.addEventListener('click', async (e) => {
    const stripWorkerBtn = e.target.closest('[data-select-strip-worker]');
    if (stripWorkerBtn) {
      const wid = stripWorkerBtn.dataset.selectStripWorker;
      const w = (app.state?.workers || []).find((x) => x.id === wid);
      if (w) {
        soundFX.playClick();
        const hint = $('stage-overlay-hint');
        if (hint) {
          hint.textContent = `👾 【${w.name}】Lv.${w.level} · 體力 ${w.stamina}/${w.maxStamina} · ${w.lastMessage || '待命中'}`;
        }
        if (w.track === 'api') {
          const sel = $('factory-worker-select');
          if (sel) sel.value = w.id;
        } else {
          const sel = $('guild-worker-select');
          if (sel) sel.value = w.id;
        }
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
        if (res.unlocked) {
          soundFX.playLaunch();
          showToast(`🎉 《${res.project.shortName}》票數達標破土動工！已自動生成 5 張雙軌任務！`, 'success', 5000);
        } else {
          soundFX.playClick();
          showToast(`🗳️ 投票成功！《${res.project.shortName}》目前 ${res.project.votes}/${res.project.votesRequired} 票`, 'info');
        }
      } catch (err) {
        soundFX.playReject();
        showToast(err.message, 'error');
      }
      return;
    }

    const billboardBtn = e.target.closest('[data-billboard-project]');
    if (billboardBtn) {
      const pid = billboardBtn.dataset.billboardProject;
      try {
        const res = await apiFetch(`/api/projects/${encodeURIComponent(pid)}/billboard`, { method: 'POST', body: {} });
        applyNewState(res.state);
        soundFX.playCoin();
        showToast(`📺 已為《${res.project.shortName}》點亮像素廣場霓虹廣告牌（+$${res.feeUsd} 平臺廣告收入）！`, 'success');
      } catch (err) {
        soundFX.playReject();
        showToast(err.message, 'error');
      }
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
        showToast(
          `🎆 《${res.project.shortName}》正式上線！首日營收 $${res.dividend.grossRevenueUsd} 分紅入帳：你實得 $${res.dividend.playerShareUsd}，平臺 Carry $${res.dividend.platformCarryUsd}！`,
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
        showToast(
          `💸 《${res.project.shortName}》新增 $${res.dividend.grossRevenueUsd} 營收！你分得 +$${res.dividend.playerShareUsd}，平臺 10% Carry +$${res.dividend.platformCarryUsd}！`,
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
        showToast(`☕ 【${res.worker.name}】喝完像素特調咖啡，體力與今日額度已回復！`, 'success');
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
        showToast(`🔧 已更新【${res.worker.name}】每日安全額度上限為 ${res.worker.dailyTokenCap.toLocaleString()}`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    const buyBtn = e.target.closest('[data-buy-item]');
    if (buyBtn) {
      const itemId = buyBtn.dataset.buyItem;
      const firstWorkerId = app.state?.workers?.[0]?.id || null;
      try {
        const res = await apiFetch('/api/shop/buy', {
          method: 'POST',
          body: { itemId, workerId: firstWorkerId },
        });
        applyNewState(res.state);
        soundFX.playCoin();
        showToast(`🛍️ 購買成功：「${res.item.name}」！`, 'success');
      } catch (err) {
        soundFX.playReject();
        showToast(err.message, 'error');
      }
      return;
    }
  });

  // Delegated change handler for worker skin selector
  document.addEventListener('change', async (e) => {
    const skinSelect = e.target.closest('[data-skin-select]');
    if (!skinSelect) return;
    const wid = skinSelect.dataset.skinSelect;
    const skin = skinSelect.value;
    try {
      const res = await apiFetch(`/api/workers/${encodeURIComponent(wid)}`, {
        method: 'PATCH',
        body: { skin },
      });
      applyNewState(res.state);
      soundFX.playClick();
      showToast(`✨ 【${res.worker.name}】已換上「${SKIN_LABELS[skin] || skin}」！`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ============================================================================
// Bootstrap Application
// ============================================================================
async function init() {
  // Apply saved UI language
  const initialLang = getLang();
  setLang(initialLang);
  document.querySelectorAll('#lang-switch [data-lang]').forEach((b) => {
    b.classList.toggle('active', b.dataset.lang === initialLang);
  });
  applyI18nToDom();

  bindEvents();
  syncAutoFollowUi();

  // Initialize PixelTownEngine canvas
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
        const task = (app.state?.tasks || []).find((tk) => tk.id === taskId);
        if (!task) return;
        soundFX.playClick();
        if (task.status === 'completed') {
          openTaskReportModal(task.id);
        } else if (task.track === 'guild_bounty') {
          switchTab('guild');
          openGuildWorkbench(task.id);
        } else {
          switchTab('factory');
          const hint = $('stage-overlay-hint');
          if (hint) hint.textContent = `🏭 已選取任務：${task.title}`;
        }
      },
      onSelectWorker: (workerId) => {
        const w = (app.state?.workers || []).find((x) => x.id === workerId);
        if (!w) return;
        soundFX.playClick();
        const hint = $('stage-overlay-hint');
        if (hint) {
          hint.textContent = `👾 【${w.name}】Lv.${w.level} · 體力 ${w.stamina}/${w.maxStamina} · ${w.lastMessage || '待命中'}`;
        }
        if (w.track === 'api') {
          const sel = $('factory-worker-select');
          if (sel) sel.value = w.id;
        } else {
          const sel = $('guild-worker-select');
          if (sel) sel.value = w.id;
        }
      },
    });
    app.engine.setDayNight(app.dayNight);
    if (typeof app.engine.setScene === 'function') {
      app.engine.setScene(app.activeScene);
    }
    syncSceneChipsUI(app.activeScene);
    updateSceneHint(app.activeScene);
  }

  try {
    const data = await apiFetch('/api/bootstrap');
    app.user = data.user;
    app.state = data.state;
    app.shopItems = data.shopItems || [];
    app.workerTemplates = data.workerTemplates || [];
    app.config = data.config || {};
    seedSeenAchievements(app.state);
    app.engine?.syncState(app.state);
    renderAll();
    connectSse();

    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'github_ok') {
      showToast(`🐙 GitHub 登入成功！歡迎回來，${app.user?.displayName || '開發者'}！`, 'success');
      window.history.replaceState({}, '', '/');
    }
  } catch (err) {
    showToast(`無法連線至像素算力鎮伺服器：${err.message}`, 'error', 6000);
  }
}

init();
