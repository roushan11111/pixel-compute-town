// PixelCompute Town — Zero-Dependency Node.js v1.0 HTTP + REST + SSE Server

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BILLBOARD_PRICE_USD,
  PLATFORM_BOUNTY_FEE_PCT,
  REVENUE_SPLIT,
  SHOP_ITEMS,
  WORKER_TEMPLATES,
  createInitialAchievements,
  ensureStateSchema,
  generateTasksForProject,
  round2,
} from './src/server/seed.mjs';
import { createStore } from './src/server/store.mjs';
import {
  COPYCAT_HIGH_THRESHOLD,
  COPYCAT_WARN_THRESHOLD,
  GENESIS_HASH,
  computeIdeaHash,
  ensureProjectsProvenance,
  findSimilarIdeas,
  verifyProvenanceChain,
} from './src/server/provenance.mjs';
import { verifySubmission, validateGitHubPrUrl } from './src/server/verifier.mjs';
import {
  FOUNDER_USER_ID,
  getActiveUserContext,
  handleDemoLogin,
  handleGitHubCallback,
  handleGitHubLogin,
  handleGoogleCallback,
  handleGoogleLogin,
  handleLogin,
  handleLogout,
  handleMe,
  handleRegister,
  isGitHubOAuthEnabled,
  isGoogleOAuthEnabled,
  projectStateForUser,
  sanitizeUserForClient,
  syncUserLeaderboard,
} from './src/server/auth.mjs';
import {
  PAYMENT_PRODUCTS,
  getPaymentConfig,
  handleAdminGenerateCodes,
  handleAdminMarkPayoutPaid,
  handleFiatCheckout,
  handlePaymentWebhook,
  handlePayoutRequest,
  handleRedeemCode,
  handleSandboxComplete,
  handleStablecoinConfirm,
  handleStablecoinCreate,
  handleWalletBind,
} from './src/server/payments.mjs';
import {
  getAdminDevicesData,
  handleAdminDeviceReview,
  handleAdminSettings,
  handleDeviceApprove,
  handleDevicePoll,
  handleDeviceStart,
  handleDeviceStatus,
  handleDownloadWorkerCli,
  handleInstallPs1,
  handleInstallSh,
} from './src/server/deviceFlow.mjs';
import { createSseHub } from './src/server/sse.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PUBLIC_DIR = path.join(__dirname, 'public');
const VERSION = '1.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function sanitizeText(value, maxLen = 120, { multiline = false } = {}) {
  if (typeof value !== 'string') return '';
  let cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  if (!multiline) {
    cleaned = cleaned.replace(/[\r\n\t]+/g, ' ');
  }
  return cleaned.trim().slice(0, maxLen);
}

const GITHUB_REPO_REGEX = /^(?:https?:\/\/github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git|\/issues(?:\/.*)?|\/)?$/i;

function parseGitHubRepoUrl(raw) {
  const cleaned = sanitizeText(raw, 200);
  const match = cleaned.match(GITHUB_REPO_REGEX);
  if (!match) {
    return {
      valid: false,
      error: '無效的 GitHub 倉庫格式，請輸入 owner/repo 或 https://github.com/owner/repo',
    };
  }
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, '');
  return {
    valid: true,
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    url: `https://github.com/${owner}/${repo}`,
  };
}

function inferIssueCategoryAndTrack(title = '', labels = [], requestedTrack = 'auto') {
  const lower = `${title} ${labels.join(' ')}`.toLowerCase();
  let category = 'feature_pr';
  if (/i18n|l10n|translat|locale|多語|翻譯/.test(lower)) {
    category = 'i18n';
  } else if (/test|coverage|unit|spec|測試/.test(lower)) {
    category = 'unit_test';
  } else if (/doc|readme|guide|typo|文件/.test(lower)) {
    category = 'docs';
  } else if (/pixel|sprite|theme|palette|ui|css|design|視覺/.test(lower)) {
    category = 'pixel_spec';
  } else if (/bug|fix|error|crash|race|修復|異常/.test(lower)) {
    category = 'bugfix';
  }

  let track = requestedTrack;
  if (track !== 'api_auto' && track !== 'guild_bounty') {
    track = (category === 'i18n' || category === 'unit_test' || category === 'docs' || category === 'pixel_spec')
      ? 'api_auto'
      : 'guild_bounty';
  }
  return { category, track };
}

function buildTaskFromGitHubIssue(issue, project, repoInfo, requestedTrack, { isFallback = false } = {}) {
  const labels = Array.isArray(issue.labels)
    ? issue.labels.map((l) => (typeof l === 'string' ? l : l?.name || '')).filter(Boolean)
    : [];
  const rawTitle = sanitizeText(issue.title || `Issue #${issue.number}`, 100);
  const { category, track } = inferIssueCategoryAndTrack(rawTitle, labels, requestedTrack);
  const isApi = track === 'api_auto';
  const issueNum = Number(issue.number) || Math.floor(10 + Math.random() * 90);
  const issueUrl = sanitizeText(issue.html_url || `${repoInfo.url}/issues/${issueNum}`, 220);
  const bodySnippet = sanitizeText(issue.body || '', 600, { multiline: true });
  const prefix = isFallback ? '[離線預覽] ' : `[GH #${issueNum}] `;

  return {
    id: uid('task-gh'),
    projectId: project.id,
    track,
    category,
    source: 'github_issue',
    isOfflineFallback: isFallback,
    issueNumber: issueNum,
    issueUrl,
    title: `${prefix}${rawTitle}`.slice(0, 120),
    description: bodySnippet || `自 GitHub 倉庫 ${repoInfo.fullName} 匯入的開放 Issue #${issueNum}。`,
    modelSuggestion: isApi ? 'gemini-2.5-flash' : 'Gemini CLI / Claude Code',
    promptTemplate: isApi
      ? `你是協助開源倉庫 ${repoInfo.fullName} 的 AI 工程師。請針對 Issue #${issueNum}「${rawTitle}」產出符合 ${category} 驗收標準的結構化交付成果。`
      : `請在本機使用官方 CLI（Gemini CLI / Claude Code / Codex）處理 ${repoInfo.fullName} 的 Issue #${issueNum}「${rawTitle}」，提交完整程式碼實作或 GitHub PR 連結。`,
    sampleInput: `Repository: ${repoInfo.url}\nIssue: ${issueUrl}\nLabels: ${labels.join(', ') || 'none'}\n${bodySnippet ? `\n摘要：\n${bodySnippet.slice(0, 320)}` : ''}`,
    acceptanceCriteria: isApi
      ? [
        `符合 ${category} 類別的結構化輸出格式（如 JSON / Markdown / 單元測試）`,
        `明確回應 ${repoInfo.fullName} Issue #${issueNum} 的需求重點`,
      ]
      : [
        '提供可審查之核心程式碼實作或合法 GitHub PR 連結',
        `解決 ${repoInfo.fullName} Issue #${issueNum} 描述的問題並附驗證說明`,
      ],
    cashBountyUsd: 0,
    contributionPoints: isApi ? 30 : 60,
    goldReward: isApi ? 125 : 240,
    xpReward: isApi ? 40 : 80,
    progressWeight: isApi ? 15 : 20,
    tokenCostEst: isApi ? 18000 : 15,
    staminaCost: isApi ? 14 : 22,
    status: 'open',
    assignedWorkerId: null,
    claimedBy: null,
    claimedAt: null,
    submittedAt: null,
    submission: null,
    verification: null,
  };
}

function generateFallbackIssues(repoInfo, maxIssues = 3) {
  const templates = [
    {
      number: 101,
      title: `為 ${repoInfo.repo} 補齊繁中／英文 README 與快速上手文件`,
      labels: ['documentation', 'good first issue'],
      body: `為開源倉庫 ${repoInfo.fullName} 整理安裝步驟、環境變數說明與常見問題 FAQ，降低新貢獻者門檻。`,
    },
    {
      number: 102,
      title: `為 ${repoInfo.repo} 補齊核心模組邊界條件單元測試`,
      labels: ['testing', 'good first issue'],
      body: `針對 ${repoInfo.fullName} 的核心邏輯補充 node:test 單元測試與異常輸入保護。`,
    },
    {
      number: 103,
      title: `修復 ${repoInfo.repo} 異常重試與設定檔解析邊界問題`,
      labels: ['bug', 'help wanted'],
      body: `檢視 ${repoInfo.fullName} 在缺少可選欄位或網路超時情境下的錯誤處理，提供可合併 PR 或修補程式碼。`,
    },
  ];
  return templates.slice(0, Math.min(Math.max(1, maxIssues), 3));
}

function unlockAchievements(state, user, candidateIds) {
  if (!Array.isArray(user.achievements) || user.achievements.length === 0) {
    user.achievements = createInitialAchievements();
  }
  const now = new Date().toISOString();
  const newlyUnlocked = [];

  for (const id of candidateIds) {
    const ach = user.achievements.find((a) => a.id === id);
    if (!ach || ach.unlocked) continue;
    ach.unlocked = true;
    ach.unlockedAt = now;
    if (ach.rewardGold > 0) {
      user.gold += ach.rewardGold;
    }
    newlyUnlocked.push({ ...ach });
    pushActivity(state, {
      type: 'achievement',
      icon: '🏆',
      message: `${user.displayName} 解鎖創世成就【${ach.icon} ${ach.name}】！額外獲得 +${ach.rewardGold}G 獎勵！`,
    });
  }
  return newlyUnlocked;
}

function broadcastAchievements(sseHub, newlyUnlocked, user) {
  for (const achievement of newlyUnlocked) {
    sseHub.broadcast('achievement_unlocked', {
      achievement,
      userId: user.id,
      playerGold: user.gold,
    });
  }
}

class HttpError extends Error {
  constructor(statusCode, message, extra = null) {
    super(message);
    this.statusCode = statusCode;
    this.extra = extra;
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw new HttpError(413, '請求內容超過 2MB 大小限制');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function parseJsonBody(req) {
  const raw = (await readRawBody(req)).trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, '無效的 JSON 請求格式');
  }
}

function recalcFounderRevenue(founderRevenue) {
  founderRevenue.bountyFeesUsd = round2(founderRevenue.bountyFeesUsd || 0);
  founderRevenue.incubationCarryUsd = round2(founderRevenue.incubationCarryUsd || 0);
  founderRevenue.billboardAdsUsd = round2(founderRevenue.billboardAdsUsd || 0);
  founderRevenue.proSkinsUsd = round2(founderRevenue.proSkinsUsd || 0);
  founderRevenue.totalUsd = round2(
    founderRevenue.bountyFeesUsd
    + founderRevenue.incubationCarryUsd
    + founderRevenue.billboardAdsUsd
    + founderRevenue.proSkinsUsd,
  );
}

function addFounderRevenueEntry(state, { stream, label, amountUsd, projectId = null, taskId = null }) {
  const amt = round2(amountUsd);
  if (amt <= 0) return;

  if (stream === 'bounty_fee') {
    state.founderRevenue.bountyFeesUsd = round2(state.founderRevenue.bountyFeesUsd + amt);
  } else if (stream === 'incubation_carry') {
    state.founderRevenue.incubationCarryUsd = round2(state.founderRevenue.incubationCarryUsd + amt);
  } else if (stream === 'billboard_ad') {
    state.founderRevenue.billboardAdsUsd = round2(state.founderRevenue.billboardAdsUsd + amt);
  } else if (stream === 'pro_skin') {
    state.founderRevenue.proSkinsUsd = round2(state.founderRevenue.proSkinsUsd + amt);
  }

  recalcFounderRevenue(state.founderRevenue);
  state.founderRevenue.history.unshift({
    id: uid('rev'),
    timestamp: new Date().toISOString(),
    stream,
    label,
    amountUsd: amt,
    projectId,
    taskId,
  });
  if (state.founderRevenue.history.length > 80) {
    state.founderRevenue.history.length = 80;
  }
}

function pushActivity(state, entry) {
  state.activityFeed.unshift({
    id: uid('act'),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (state.activityFeed.length > 60) {
    state.activityFeed.length = 60;
  }
}

function creditUserOrNpcUsd(state, userId, amountUsd) {
  const amt = round2(amountUsd);
  if (amt <= 0) return;
  if (state.users && state.users[userId]) {
    const u = state.users[userId];
    u.usdBalance = round2((u.usdBalance || 0) + amt);
    syncUserLeaderboard(state, u);
  } else {
    const npcRow = state.leaderboard.find((r) => r.userId === userId);
    if (npcRow) {
      npcRow.earnedUsd = round2((npcRow.earnedUsd || 0) + amt);
    }
  }
}

function buildChainedProject(state, user, fields) {
  ensureProjectsProvenance(state.projects, state.users);
  const ordered = [...(state.projects || [])].sort(
    (a, b) => (Number.isInteger(a.provenanceIndex) ? a.provenanceIndex : 0) - (Number.isInteger(b.provenanceIndex) ? b.provenanceIndex : 0),
  );
  const lastProj = ordered.length > 0 ? ordered[ordered.length - 1] : null;
  const provenanceIndex = lastProj && Number.isInteger(lastProj.provenanceIndex)
    ? lastProj.provenanceIndex + 1
    : ordered.length;
  const prevIdeaHash = lastProj?.ideaHash || GENESIS_HASH;
  const originatedAt = new Date().toISOString();

  const ideaHash = computeIdeaHash({
    name: fields.name,
    tagline: fields.tagline,
    description: fields.description,
    originatorId: user.id,
    originatedAt,
    prevIdeaHash,
  });

  return {
    ...fields,
    creatorId: user.id,
    creatorName: user.displayName,
    originatorId: user.id,
    originatorName: user.displayName,
    originatedAt,
    provenanceIndex,
    prevIdeaHash,
    ideaHash,
    coBuilders: [
      {
        userId: user.id,
        username: user.username || user.id,
        displayName: user.displayName,
        joinedAt: originatedAt,
      },
    ],
    sparkRoyaltyPct: REVENUE_SPLIT.originatorSparkPct,
    meritPoolPct: REVENUE_SPLIT.meritPoolPct,
    platformSharePct: REVENUE_SPLIT.platformPct,
    creatorSharePct: REVENUE_SPLIT.originatorSparkPct,
    contributorsSharePct: REVENUE_SPLIT.meritPoolPct,
    inspiredByHash: fields.inspiredByHash || null,
    revenueSplit: { ...REVENUE_SPLIT },
    createdAt: originatedAt,
    contributions: fields.contributions || {},
    contributorNames: fields.contributorNames || {},
  };
}

function distributeProjectRevenue(state, activeUser, project, grossRevenueUsd, label) {
  const gross = round2(grossRevenueUsd);
  const sparkPct = Number.isFinite(Number(project.sparkRoyaltyPct))
    ? Number(project.sparkRoyaltyPct)
    : REVENUE_SPLIT.originatorSparkPct;
  const platformPct = Number.isFinite(Number(project.platformSharePct))
    ? Number(project.platformSharePct)
    : REVENUE_SPLIT.platformPct;
  const meritPct = Number.isFinite(Number(project.meritPoolPct))
    ? Number(project.meritPoolPct)
    : REVENUE_SPLIT.meritPoolPct;

  const sparkRoyaltyUsd = round2(gross * (sparkPct / 100));
  const platformCarryUsd = round2(gross * (platformPct / 100));
  const meritPoolUsd = round2(gross - sparkRoyaltyUsd - platformCarryUsd);

  const originatorId = project.originatorId || project.creatorId;
  const originatorName = project.originatorName || project.creatorName || originatorId;

  const payouts = [];
  const payoutsByUser = {};

  const ensureUserBucket = (userId, userName) => {
    if (!payoutsByUser[userId]) {
      payoutsByUser[userId] = {
        userId,
        userName: userName || userId,
        sparkUsd: 0,
        meritUsd: 0,
        totalUsd: 0,
        points: 0,
        meritRatioPct: 0,
        totalSharePct: 0,
        isOriginator: userId === originatorId,
      };
    }
    return payoutsByUser[userId];
  };

  // 1) 5% Proof of First Spark permanent royalty to originator
  payouts.push({
    userId: originatorId,
    userName: originatorName,
    role: 'originator_spark',
    sharePct: sparkPct,
    amountUsd: sparkRoyaltyUsd,
  });
  const origBucket = ensureUserBucket(originatorId, originatorName);
  origBucket.sparkUsd = round2(origBucket.sparkUsd + sparkRoyaltyUsd);

  // 2) 85% Merit Pool strictly proportional to accepted contribution points
  const entries = Object.entries(project.contributions || {})
    .filter(([, pts]) => Number(pts) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  const totalPoints = entries.reduce((sum, [, pts]) => sum + Number(pts), 0);

  if (totalPoints > 0 && entries.length > 0) {
    let allocated = 0;
    const contribPayouts = entries.map(([userId, pts]) => {
      const numericPts = Number(pts);
      const ratio = numericPts / totalPoints;
      const amt = round2(meritPoolUsd * ratio);
      allocated = round2(allocated + amt);
      const userName = (project.contributorNames && project.contributorNames[userId])
        || state.users?.[userId]?.displayName
        || userId;
      return {
        userId,
        userName,
        role: 'contributor',
        points: numericPts,
        meritRatioPct: round2(ratio * 100),
        sharePct: round2(ratio * meritPct),
        amountUsd: amt,
      };
    });

    // Fix any 0.01 rounding remainder on top contributor so total equals meritPoolUsd exactly
    const diff = round2(meritPoolUsd - allocated);
    if (diff !== 0 && contribPayouts.length > 0) {
      contribPayouts[0].amountUsd = round2(contribPayouts[0].amountUsd + diff);
    }

    for (const cp of contribPayouts) {
      payouts.push(cp);
      const bucket = ensureUserBucket(cp.userId, cp.userName);
      bucket.meritUsd = round2(bucket.meritUsd + cp.amountUsd);
      bucket.points = cp.points;
      bucket.meritRatioPct = cp.meritRatioPct;
    }
  } else {
    // Fallback if zero contributions recorded anywhere: goes to originator so total equals gross
    payouts[0].amountUsd = round2(payouts[0].amountUsd + meritPoolUsd);
    origBucket.meritUsd = round2(origBucket.meritUsd + meritPoolUsd);
  }

  for (const bucket of Object.values(payoutsByUser)) {
    bucket.totalUsd = round2(bucket.sparkUsd + bucket.meritUsd);
    bucket.totalSharePct = gross > 0 ? round2((bucket.totalUsd / gross) * 100) : 0;
    creditUserOrNpcUsd(state, bucket.userId, bucket.totalUsd);
  }

  // 3) 10% Platform Carry
  payouts.push({
    userId: 'platform',
    userName: '像素算力鎮平臺 (Carry)',
    role: 'platform',
    sharePct: platformPct,
    amountUsd: platformCarryUsd,
  });

  const originatorTotalUsd = round2(payoutsByUser[originatorId]?.totalUsd || 0);
  const playerBucket = payoutsByUser[activeUser.id] || { sparkUsd: 0, meritUsd: 0, totalUsd: 0 };
  const playerSparkUsd = round2(playerBucket.sparkUsd);
  const playerMeritUsd = round2(playerBucket.meritUsd);
  const playerTotalUsd = round2(playerBucket.totalUsd);

  project.totalRevenueUsd = round2((project.totalRevenueUsd || 0) + gross);
  project.distributedRevenueUsd = round2((project.distributedRevenueUsd || 0) + gross);

  addFounderRevenueEntry(state, {
    stream: 'incubation_carry',
    label: `《${project.shortName || project.name}》${label} ${platformPct}% 平臺分成`,
    amountUsd: platformCarryUsd,
    projectId: project.id,
  });

  const dividend = {
    id: uid('div'),
    timestamp: new Date().toISOString(),
    projectId: project.id,
    projectName: project.name,
    originatorId,
    originatorName,
    label,
    grossRevenueUsd: gross,
    sparkRoyaltyUsd,
    meritPoolUsd,
    platformCarryUsd,
    originatorTotalUsd,
    playerSparkUsd,
    playerMeritUsd,
    playerTotalUsd,
    payoutsByUser,
    // Legacy compatibility aliases
    creatorShareUsd: sparkRoyaltyUsd,
    contributorsPoolUsd: meritPoolUsd,
    playerShareUsd: playerTotalUsd,
    payouts,
  };

  state.dividendLedger.unshift(dividend);
  if (state.dividendLedger.length > 60) {
    state.dividendLedger.length = 60;
  }

  syncUserLeaderboard(state, activeUser);
  return dividend;
}

function findWorkerAcrossUsers(state, workerId) {
  if (!workerId || !state?.users) return null;
  for (const user of Object.values(state.users)) {
    const w = (user.workers || []).find((item) => item.id === workerId);
    if (w) return { user, worker: w };
  }
  return null;
}

export function createAppServer(options = {}) {
  const publicDir = path.resolve(options.publicDir || DEFAULT_PUBLIC_DIR);
  const store = options.store || createStore({
    dataDir: options.dataDir,
    stateFile: options.stateFile,
  });
  const sseHub = options.sseHub || createSseHub();
  const startedAt = Date.now();

  const rawRateLimit = options.rateLimitMax !== undefined
    ? Number(options.rateLimitMax)
    : (process.env.RATE_LIMIT_MAX !== undefined ? Number(process.env.RATE_LIMIT_MAX) : 120);
  const rateLimitMax = Number.isFinite(rawRateLimit) ? rawRateLimit : 120;
  const rateLimitWindowMs = Number(options.rateLimitWindowMs) > 0
    ? Number(options.rateLimitWindowMs)
    : 60_000;
  const rateBuckets = new Map();

  function checkWriteRateLimit(req, res) {
    if (rateLimitMax <= 0) return true;
    const forwarded = typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : '';
    const clientKey = forwarded || req.socket?.remoteAddress || 'local';
    const now = Date.now();
    let bucket = rateBuckets.get(clientKey);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + rateLimitWindowMs };
      rateBuckets.set(clientKey, bucket);
    }
    bucket.count += 1;
    const remaining = Math.max(0, rateLimitMax - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(rateLimitMax));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > rateLimitMax) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      sendJson(res, 429, {
        ok: false,
        error: `請求過於頻繁，已觸發每分鐘 ${rateLimitMax} 次寫入速率限制，請於 ${retryAfterSec} 秒後再試`,
        retryAfterSec,
      });
      return false;
    }

    if (rateBuckets.size > 500) {
      for (const [k, b] of rateBuckets.entries()) {
        if (now >= b.resetAt) rateBuckets.delete(k);
      }
    }
    return true;
  }

  async function serveStaticFile(res, method, relPath, fallbackRelPath = null) {
    const targetPath = path.resolve(publicDir, relPath);
    if (targetPath !== publicDir && !targetPath.startsWith(`${publicDir}${path.sep}`)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Forbidden');
    }

    try {
      const fileData = await fs.readFile(targetPath);
      const ext = path.extname(targetPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      if (method === 'HEAD') return res.end();
      return res.end(fileData);
    } catch {
      if (fallbackRelPath) {
        return serveStaticFile(res, method, fallbackRelPath, null);
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }
  }

  const server = http.createServer(async (req, res) => {
    // Production security headers applied to every response
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;
      const method = req.method.toUpperCase();

      // Apply lightweight rate limiting on API write operations
      if (pathname.startsWith('/api/') && (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE')) {
        if (!checkWriteRateLimit(req, res)) {
          return;
        }
      }

      // One-click Install & CLI Download routes
      if (pathname === '/install.ps1' && (method === 'GET' || method === 'HEAD')) {
        return handleInstallPs1(req, res);
      }
      if (pathname === '/install.sh' && (method === 'GET' || method === 'HEAD')) {
        return handleInstallSh(req, res);
      }
      if (pathname === '/download/pixel-worker.mjs' && (method === 'GET' || method === 'HEAD')) {
        return await handleDownloadWorkerCli(req, res);
      }

      // Health check
      if (pathname === '/api/health' && method === 'GET') {
        return sendJson(res, 200, {
          ok: true,
          service: 'pixel-compute-town',
          version: VERSION,
          uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
          sseClients: sseHub.getClientCount(),
          githubOAuthEnabled: isGitHubOAuthEnabled(),
          googleOAuthEnabled: isGoogleOAuthEnabled(),
          timestamp: new Date().toISOString(),
        });
      }

      // Public landing page stats
      if (pathname === '/api/public/stats' && method === 'GET') {
        const state = await store.load();
        ensureStateSchema(state);
        const projects = state.projects || [];
        const tasks = state.tasks || [];
        const users = Object.values(state.users || {});
        const buildingCount = projects.filter((p) => p.status === 'building').length;
        const launchedCount = projects.filter((p) => p.status === 'launched').length;
        const votingCount = projects.filter((p) => p.status === 'voting').length;
        const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
        const openTasksCount = tasks.filter((t) => t.status === 'open').length;
        const communityCompletedTasksCount = (state.leaderboard || []).reduce(
          (sum, row) => sum + (Number(row.completedTasks) || 0),
          0,
        );
        const totalRevenueUsd = round2(state.founderRevenue?.totalUsd || 0);
        const totalUsersCount = Math.max(users.length, (state.leaderboard || []).length);
        const totalWorkersCount = users.reduce(
          (sum, u) => sum + (Array.isArray(u.workers) ? u.workers.length : 0),
          0,
        );
        const provenance = verifyProvenanceChain(projects);
        const featuredProjects = projects.slice(0, 6).map((p) => ({
          id: p.id,
          name: p.name,
          shortName: p.shortName,
          tagline: p.tagline,
          status: p.status,
          votes: p.votes,
          votesRequired: p.votesRequired,
          progressPct: p.progressPct,
          bountyPoolUsd: p.bountyPoolUsd,
          totalRevenueUsd: p.totalRevenueUsd,
          sponsoredBillboard: Boolean(p.sponsoredBillboard),
          billboardText: p.billboardText || '',
          originatorName: p.originatorName || p.creatorName || '',
          originatedAt: p.originatedAt || p.createdAt || '',
          ideaHash: p.ideaHash || '',
          coBuildersCount: Array.isArray(p.coBuilders) ? p.coBuilders.length : 1,
        }));

        return sendJson(res, 200, {
          ok: true,
          projectsCount: projects.length,
          buildingCount,
          launchedCount,
          votingCount,
          completedTasksCount,
          communityCompletedTasksCount,
          openTasksCount,
          totalRevenueUsd,
          totalUsersCount,
          totalWorkersCount,
          provenanceValid: provenance.valid,
          provenanceChainLength: provenance.chainLength,
          featuredProjects,
        });
      }

      // Proof of First Spark: GET /api/provenance/chain
      if (pathname === '/api/provenance/chain' && method === 'GET') {
        const state = await store.load();
        ensureStateSchema(state);
        const report = verifyProvenanceChain(state.projects);
        return sendJson(res, 200, {
          ok: true,
          ...report,
        });
      }

      // Proof of First Spark: GET /api/provenance/verify/:hash (supports full 64-char or 8+ char prefix)
      const verifyHashMatch = pathname.match(/^\/api\/provenance\/verify\/([^/]+)$/);
      if (verifyHashMatch && method === 'GET') {
        const rawHash = decodeURIComponent(verifyHashMatch[1]).trim().toLowerCase();
        if (!/^[a-f0-9]{8,64}$/.test(rawHash)) {
          return sendJson(res, 404, {
            ok: false,
            verified: false,
            error: '無效或查無此創意溯源指紋（需提供至少 8 碼十六進位 SHA-256 指紋）',
          });
        }
        const state = await store.load();
        ensureStateSchema(state);
        const chain = verifyProvenanceChain(state.projects);
        const exact = chain.records.find((r) => r.ideaHash === rawHash);
        const matched = exact || chain.records.find((r) => r.ideaHash && r.ideaHash.startsWith(rawHash));
        if (!matched || !matched.verified) {
          return sendJson(res, 404, {
            ok: false,
            verified: false,
            error: matched
              ? '該創意溯源紀錄驗證失敗（資料可能已遭竄改）'
              : '找不到對應此溯源指紋的原創創意紀錄',
          });
        }
        const project = (state.projects || []).find((p) => p.id === matched.projectId) || null;
        return sendJson(res, 200, {
          ok: true,
          verified: true,
          chainValid: chain.valid,
          chainLength: chain.chainLength,
          record: matched,
          project,
        });
      }

      // SSE event stream
      if (pathname === '/api/events' && method === 'GET') {
        return sseHub.handleConnection(req, res);
      }

      // Bootstrap payload (multi-user projected + v1.0 configs + adminData)
      if (pathname === '/api/bootstrap' && method === 'GET') {
        const state = await store.load();
        const ctx = getActiveUserContext(req, state);
        const user = sanitizeUserForClient(ctx.user);
        const projected = projectStateForUser(state, ctx.userId);
        const isAdmin = ctx.user.role === 'founder';
        const { pendingDevices, allDevices } = getAdminDevicesData(state);

        return sendJson(res, 200, {
          ok: true,
          user,
          state: projected,
          shopItems: SHOP_ITEMS,
          workerTemplates: WORKER_TEMPLATES,
          paymentProducts: Object.values(PAYMENT_PRODUCTS),
          config: {
            githubOAuthEnabled: isGitHubOAuthEnabled(),
            googleOAuthEnabled: isGoogleOAuthEnabled(),
            strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
            version: VERSION,
            platformFeePct: PLATFORM_BOUNTY_FEE_PCT,
            billboardPriceUsd: BILLBOARD_PRICE_USD,
            revenueSplit: REVENUE_SPLIT,
          },
          authConfig: {
            githubOAuthEnabled: isGitHubOAuthEnabled(),
            googleOAuthEnabled: isGoogleOAuthEnabled(),
            strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
          },
          paymentConfig: getPaymentConfig(),
          adminData: isAdmin
            ? {
              isAdmin: true,
              strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
              pendingDevices,
              allDevices,
              redeemCodes: state.redeemCodes || [],
              payouts: state.payouts || [],
            }
            : {
              isAdmin: false,
              strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
              pendingDevices: [],
              allDevices: [],
              redeemCodes: [],
              payouts: [],
            },
        });
      }

      // Legacy compatibility endpoint
      if (pathname === '/api/state' && method === 'GET') {
        const state = await store.load();
        const ctx = getActiveUserContext(req, state);
        return sendJson(res, 200, { ok: true, state: projectStateForUser(state, ctx.userId) });
      }

      // Auth routes
      if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleRegister(req, res, body, store);
      }
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleLogin(req, res, body, store);
      }
      if (pathname === '/api/auth/me' && method === 'GET') {
        return await handleMe(req, res, store);
      }
      if (pathname === '/api/auth/github' && method === 'GET') {
        return await handleGitHubLogin(req, res, store);
      }
      if (pathname === '/api/auth/github/callback' && method === 'GET') {
        return await handleGitHubCallback(req, res, url, store);
      }
      if (pathname === '/api/auth/google' && method === 'GET') {
        return await handleGoogleLogin(req, res, store);
      }
      if (pathname === '/api/auth/google/callback' && method === 'GET') {
        return await handleGoogleCallback(req, res, url, store);
      }
      if (pathname === '/api/auth/demo' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (typeof body.displayName === 'string') {
          body.displayName = sanitizeText(body.displayName, 32);
        }
        return await handleDemoLogin(req, res, body, store);
      }
      if (pathname === '/api/auth/logout' && method === 'POST') {
        return await handleLogout(req, res, store);
      }

      // Three-in-One Payment & Stablecoin Payout routes
      if (pathname === '/api/payments/stablecoin/create' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleStablecoinCreate(req, res, body, store, sseHub);
      }
      if (pathname === '/api/payments/stablecoin/confirm' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleStablecoinConfirm(req, res, body, store, sseHub);
      }
      if (pathname === '/api/payments/checkout' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleFiatCheckout(req, res, body, store, sseHub);
      }
      if (pathname === '/api/payments/sandbox/complete' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleSandboxComplete(req, res, body, store, sseHub);
      }
      if (pathname === '/api/payments/redeem' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleRedeemCode(req, res, body, store, sseHub);
      }
      if (pathname === '/api/webhooks/polar' && method === 'POST') {
        const rawBody = await readRawBody(req);
        return await handlePaymentWebhook(req, res, 'polar', rawBody, store, sseHub);
      }
      if (pathname === '/api/webhooks/stripe' && method === 'POST') {
        const rawBody = await readRawBody(req);
        return await handlePaymentWebhook(req, res, 'stripe', rawBody, store, sseHub);
      }
      if (pathname === '/api/wallet/bind' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleWalletBind(req, res, body, store, sseHub);
      }
      if (pathname === '/api/payouts/request' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handlePayoutRequest(req, res, body, store, sseHub);
      }
      const adminPayoutPaidMatch = pathname.match(/^\/api\/admin\/payouts\/([^/]+)\/mark-paid$/);
      if (adminPayoutPaidMatch && method === 'POST') {
        const payoutId = decodeURIComponent(adminPayoutPaidMatch[1]);
        const body = await parseJsonBody(req);
        return await handleAdminMarkPayoutPaid(req, res, payoutId, body, store, sseHub);
      }
      if (pathname === '/api/admin/codes/generate' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleAdminGenerateCodes(req, res, body, store, sseHub);
      }

      // Device Flow & Admin Review routes
      if (pathname === '/api/device/start' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleDeviceStart(req, res, body, store, sseHub);
      }
      if (pathname === '/api/device/status' && method === 'GET') {
        return await handleDeviceStatus(req, res, url, store);
      }
      if (pathname === '/api/device/poll' && method === 'GET') {
        return await handleDevicePoll(req, res, url, store);
      }
      if (pathname === '/api/device/approve' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleDeviceApprove(req, res, body, store, sseHub);
      }
      const adminDeviceReviewMatch = pathname.match(/^\/api\/admin\/devices\/([^/]+)\/review$/);
      if (adminDeviceReviewMatch && method === 'POST') {
        const codeParam = decodeURIComponent(adminDeviceReviewMatch[1]);
        const body = await parseJsonBody(req);
        return await handleAdminDeviceReview(req, res, codeParam, body, store, sseHub);
      }
      if (pathname === '/api/admin/settings' && method === 'PATCH') {
        const body = await parseJsonBody(req);
        return await handleAdminSettings(req, res, body, store, sseHub);
      }

      // Workers: POST /api/workers (recruit new worker for active user)
      if (pathname === '/api/workers' && method === 'POST') {
        const body = await parseJsonBody(req);
        const roleClass = body.roleClass || 'flash_worker';
        const template = WORKER_TEMPLATES.find((t) => t.roleClass === roleClass);
        if (!template) {
          throw new HttpError(400, `不支援的職業類型：${roleClass}`);
        }

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          const cost = template.recruitCostGold;
          if (user.gold < cost) {
            throw new HttpError(400, `金幣不足！招募 ${template.label} 需要 ${cost}G，目前僅有 ${user.gold}G`);
          }
          user.gold -= cost;

          const idx = user.workers.length + 1;
          const cleanName = sanitizeText(body.name, 32) || `${template.label} #${idx}`;
          const track = body.track === 'api' || body.track === 'quota' ? body.track : template.track;
          const dailyTokenCap = Number(body.dailyTokenCap) > 0
            ? Math.round(Number(body.dailyTokenCap))
            : template.defaultCap;

          const newWorker = {
            id: uid('w'),
            name: cleanName,
            roleClass: template.roleClass,
            track,
            providerLabel: sanitizeText(body.providerLabel, 48) || template.defaultProvider,
            modelHint: sanitizeText(body.modelHint, 48) || template.defaultModelHint,
            dailyTokenCap,
            usedTokensToday: 0,
            stamina: 100,
            maxStamina: 100,
            level: 1,
            xp: 0,
            xpToNext: 100,
            status: 'idle',
            currentTaskId: null,
            currentProjectId: null,
            currentZone: 'lounge',
            skin: (body.skin && user.ownedSkins.includes(body.skin)) ? body.skin : 'default',
            autoMode: Boolean(body.autoMode),
            completedCount: 0,
            earnedGold: 0,
            earnedPoints: 0,
            lastMessage: `新報到的 ${template.label}，已準備好上工！`,
            lastHeartbeatAt: null,
          };

          user.workers.push(newWorker);
          pushActivity(s, {
            type: 'worker',
            icon: '👾',
            message: `${user.displayName} 招募了新算力小人【${newWorker.name}】（${template.label} / -${cost}G）`,
            workerId: newWorker.id,
          });
          return { worker: newWorker, userId: user.id };
        });

        sseHub.broadcast('worker_updated', { action: 'created', worker: result.worker });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 201, {
          ok: true,
          worker: result.worker,
          state: projectStateForUser(state, result.userId),
        });
      }

      // Workers: PATCH /api/workers/:id
      const workerPatchMatch = pathname.match(/^\/api\/workers\/([^/]+)$/);
      if (workerPatchMatch && method === 'PATCH') {
        const workerId = decodeURIComponent(workerPatchMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          const w = user.workers.find((item) => item.id === workerId);
          if (!w) {
            throw new HttpError(404, `找不到算力小人：${workerId}`);
          }

          if (typeof body.name === 'string') {
            const cleaned = sanitizeText(body.name, 32);
            if (cleaned) w.name = cleaned;
          }
          if (typeof body.providerLabel === 'string') {
            const cleaned = sanitizeText(body.providerLabel, 48);
            if (cleaned) w.providerLabel = cleaned;
          }
          if (typeof body.modelHint === 'string') {
            const cleaned = sanitizeText(body.modelHint, 48);
            if (cleaned) w.modelHint = cleaned;
          }
          if (body.dailyTokenCap !== undefined) {
            const cap = Number(body.dailyTokenCap);
            if (!Number.isFinite(cap) || cap < 10) {
              throw new HttpError(400, '每日額度上限必須為大於等於 10 的數字');
            }
            w.dailyTokenCap = Math.round(cap);
          }
          if (typeof body.autoMode === 'boolean') {
            w.autoMode = body.autoMode;
          }
          if (typeof body.skin === 'string') {
            if (body.skin !== 'default' && !user.ownedSkins.includes(body.skin)) {
              throw new HttpError(400, `尚未解鎖該皮膚：${body.skin}`);
            }
            w.skin = body.skin;
          }
          if (body.recoverStamina || body.action === 'rest' || body.action === 'coffee') {
            w.stamina = w.maxStamina;
            if (body.resetDailyUsage) {
              w.usedTokensToday = 0;
            }
            w.lastMessage = '在宿舍喝了一杯熱騰騰的像素咖啡，體力全滿！';
            pushActivity(s, {
              type: 'rest',
              icon: '☕',
              message: `【${w.name}】在算力宿舍喝咖啡回滿體力（${w.stamina}/${w.maxStamina}）`,
              workerId: w.id,
            });
          }

          return { worker: w, userId: user.id };
        });

        sseHub.broadcast('worker_updated', { action: 'updated', worker: result.worker });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          worker: result.worker,
          state: projectStateForUser(state, result.userId),
        });
      }

      // Projects: POST /api/projects/check-similarity (Real-time anti-copycat similarity check)
      if (pathname === '/api/projects/check-similarity' && method === 'POST') {
        const body = await parseJsonBody(req);
        const candidate = {
          name: sanitizeText(body.name, 120),
          tagline: sanitizeText(body.tagline, 200),
          description: sanitizeText(body.description, 600, { multiline: true }),
        };
        const state = await store.load();
        ensureStateSchema(state);
        const matches = findSimilarIdeas(candidate, state.projects);
        const topMatch = matches[0] || null;
        const topSim = topMatch ? topMatch.similarity : 0;
        const isHighRisk = topSim >= COPYCAT_HIGH_THRESHOLD;
        const isWarning = topSim >= COPYCAT_WARN_THRESHOLD;

        return sendJson(res, 200, {
          ok: true,
          isHighRisk,
          isWarning,
          thresholds: {
            warning: COPYCAT_WARN_THRESHOLD,
            highRisk: COPYCAT_HIGH_THRESHOLD,
          },
          topMatch,
          matches,
        });
      }

      // Projects: POST /api/projects (propose new project with anti-copycat check & SHA-256 hash chain)
      if (pathname === '/api/projects' && method === 'POST') {
        const body = await parseJsonBody(req);
        const name = sanitizeText(body.name, 64);
        const tagline = sanitizeText(body.tagline, 140);
        const rawDescription = sanitizeText(body.description, 500, { multiline: true });
        if (name.length < 2) {
          throw new HttpError(400, '請輸入至少 2 個字的項目名稱');
        }

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;

          // Anti-copycat similarity check against existing ideas
          const matches = findSimilarIdeas(
            { name, tagline, description: rawDescription },
            s.projects,
          );
          const copycatMatch = matches[0] || null;
          if (
            copycatMatch
            && copycatMatch.similarity >= COPYCAT_HIGH_THRESHOLD
            && body.acknowledgeDerivative !== true
          ) {
            throw new HttpError(
              409,
              '偵測到與既有原創創意高度相似，平臺反對抄襲複製，建議直接加入原創意共建！',
              {
                code: 'POTENTIAL_COPYCAT',
                copycatMatch,
                matches,
              },
            );
          }

          const votesRequired = Number(body.votesRequired) >= 2 && Number(body.votesRequired) <= 100
            ? Math.round(Number(body.votesRequired))
            : 10;
          const bountyPoolUsd = Math.max(0, round2(Number(body.bountyPoolUsd) || 0));
          const shortName = name.length > 22 ? `${name.slice(0, 22)}` : name;
          const finalTagline = tagline || '社群共創獨立開源產品，共享 5% 創意版稅 / 85% 實幹多勞多得 / 10% 平臺分紅！';
          const finalDescription = rawDescription
            || tagline
            || '由鎮民發起的孵化提案，投票達標後將自動生成雙軌算力任務。';
          const inspiredByHash = sanitizeText(body.inspiredByHash, 64)
            || (body.acknowledgeDerivative === true && copycatMatch?.ideaHash ? copycatMatch.ideaHash : null);

          const newProj = buildChainedProject(s, user, {
            id: uid('proj'),
            name,
            shortName,
            tagline: finalTagline,
            description: finalDescription,
            status: 'voting',
            votes: 1,
            votesRequired,
            progressPct: 0,
            repoUrl: sanitizeText(body.repoUrl, 200),
            bountyPoolUsd,
            inspiredByHash,
            totalRevenueUsd: 0,
            distributedRevenueUsd: 0,
            sponsoredBillboard: false,
            billboardText: '',
            launchedAt: null,
            contributions: {},
            contributorNames: {},
          });

          s.projects.push(newProj);
          pushActivity(s, {
            type: 'proposal',
            icon: '💡',
            message: `${user.displayName} 首發原創創意提案《${newProj.name}》（#${newProj.ideaHash.slice(0, 8)} ｜ 1/${newProj.votesRequired} 票）`,
            projectId: newProj.id,
          });
          return { project: newProj, userId: user.id };
        });

        sseHub.broadcast('project_updated', { action: 'proposed', project: result.project });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 201, {
          ok: true,
          project: result.project,
          state: projectStateForUser(state, result.userId),
        });
      }

      // Projects: POST /api/projects/:id/join (One-click join as co-builder, idempotent)
      const joinMatch = pathname.match(/^\/api\/projects\/([^/]+)\/join$/);
      if (joinMatch && method === 'POST') {
        const projectId = decodeURIComponent(joinMatch[1]);

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          const proj = s.projects.find((p) => p.id === projectId);
          if (!proj) {
            throw new HttpError(404, `找不到項目：${projectId}`);
          }
          if (!Array.isArray(proj.coBuilders)) {
            proj.coBuilders = [];
          }

          const existing = proj.coBuilders.find((b) => b.userId === user.id);
          let alreadyJoined = false;
          if (existing) {
            alreadyJoined = true;
          } else {
            proj.coBuilders.push({
              userId: user.id,
              username: user.username || user.id,
              displayName: user.displayName,
              joinedAt: new Date().toISOString(),
            });
            pushActivity(s, {
              type: 'co_build_join',
              icon: '🤝',
              message: `${user.displayName} 加入原創項目《${proj.shortName || proj.name}》成為共建者！（共 ${proj.coBuilders.length} 位共建者，按 85% 實幹池多勞多得）`,
              projectId: proj.id,
            });
          }

          return {
            project: proj,
            alreadyJoined,
            coBuildersCount: proj.coBuilders.length,
            userId: user.id,
          };
        });

        if (!result.alreadyJoined) {
          sseHub.broadcast('project_updated', {
            action: 'co_builder_joined',
            project: result.project,
            userId: result.userId,
          });
          sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        }
        return sendJson(res, 200, {
          ok: true,
          alreadyJoined: result.alreadyJoined,
          coBuildersCount: result.coBuildersCount,
          project: result.project,
          state: projectStateForUser(state, result.userId),
        });
      }

      // Projects: POST /api/projects/:id/vote
      const voteMatch = pathname.match(/^\/api\/projects\/([^/]+)\/vote$/);
      if (voteMatch && method === 'POST') {
        const projectId = decodeURIComponent(voteMatch[1]);

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          const proj = s.projects.find((p) => p.id === projectId);
          if (!proj) {
            throw new HttpError(404, `找不到項目：${projectId}`);
          }
          if (proj.status !== 'voting') {
            throw new HttpError(400, `項目《${proj.shortName}》已進入建設或上線階段，無需再投票`);
          }

          proj.votes += 1;
          if (!user.votedProjectIds.includes(proj.id)) {
            user.votedProjectIds.push(proj.id);
          }

          let unlocked = false;
          let generatedTasks = [];
          let unlockedAchievements = [];

          if (proj.votes >= proj.votesRequired) {
            unlocked = true;
            proj.status = 'building';
            proj.progressPct = Math.max(proj.progressPct || 0, 5);
            proj.unlockedAt = new Date().toISOString();
            generatedTasks = generateTasksForProject(proj);
            s.tasks.push(...generatedTasks);

            pushActivity(s, {
              type: 'unlock',
              icon: '🎉',
              message: `《${proj.name}》投票達標（${proj.votes}/${proj.votesRequired}）正式破土立項！已自動生成 3 張自動工坊 + 2 張懸賞工會任務！`,
              projectId: proj.id,
            });
            unlockedAchievements = unlockAchievements(s, user, ['community_builder']);
          } else {
            pushActivity(s, {
              type: 'vote',
              icon: '🗳️',
              message: `${user.displayName} 投給《${proj.shortName}》一票（目前 ${proj.votes}/${proj.votesRequired} 票）`,
              projectId: proj.id,
            });
          }

          return { project: proj, unlocked, generatedTasks, unlockedAchievements, user };
        });

        sseHub.broadcast(result.unlocked ? 'project_unlocked' : 'project_updated', {
          project: result.project,
          unlocked: result.unlocked,
          generatedTaskCount: result.generatedTasks.length,
        });
        broadcastAchievements(sseHub, result.unlockedAchievements, result.user);
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          project: result.project,
          unlocked: result.unlocked,
          generatedTasks: result.generatedTasks,
          unlockedAchievements: result.unlockedAchievements,
          state: projectStateForUser(state, result.user.id),
        });
      }

      // Projects: POST /api/projects/:id/billboard
      const billboardMatch = pathname.match(/^\/api\/projects\/([^/]+)\/billboard$/);
      if (billboardMatch && method === 'POST') {
        const projectId = decodeURIComponent(billboardMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const proj = s.projects.find((p) => p.id === projectId);
          if (!proj) {
            throw new HttpError(404, `找不到項目：${projectId}`);
          }

          const customText = sanitizeText(body.text, 64)
            || `🔥 ${proj.shortName || proj.name} 像素廣場霓虹精選！`;

          proj.sponsoredBillboard = true;
          proj.billboardText = customText;
          proj.billboardUpdatedAt = new Date().toISOString();

          addFounderRevenueEntry(s, {
            stream: 'billboard_ad',
            label: `《${proj.shortName || proj.name}》租用像素廣場霓虹廣告位`,
            amountUsd: BILLBOARD_PRICE_USD,
            projectId: proj.id,
          });

          pushActivity(s, {
            type: 'billboard',
            icon: '📺',
            message: `《${proj.shortName}》點亮像素廣場霓虹廣告牌（+$${BILLBOARD_PRICE_USD} 創作者廣告收入）`,
            projectId: proj.id,
          });

          return { project: proj, userId: ctx.userId };
        });

        sseHub.broadcast('billboard_updated', { project: result.project, feeUsd: BILLBOARD_PRICE_USD });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          project: result.project,
          feeUsd: BILLBOARD_PRICE_USD,
          founderRevenue: state.founderRevenue,
          state: projectStateForUser(state, result.userId),
        });
      }

      // Projects: POST /api/projects/:id/launch
      const launchMatch = pathname.match(/^\/api\/projects\/([^/]+)\/launch$/);
      if (launchMatch && method === 'POST') {
        const projectId = decodeURIComponent(launchMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          const proj = s.projects.find((p) => p.id === projectId);
          if (!proj) {
            throw new HttpError(404, `找不到項目：${projectId}`);
          }
          if (proj.status === 'launched') {
            throw new HttpError(400, `項目《${proj.shortName}》已經發布上線`);
          }
          if ((proj.progressPct || 0) < 100) {
            throw new HttpError(400, `項目進度目前為 ${proj.progressPct}%，需達到 100% 才能發布上線`);
          }

          proj.status = 'launched';
          proj.launchedAt = new Date().toISOString();

          const initialRevenueUsd = Number(body.initialRevenueUsd) > 0
            ? round2(Number(body.initialRevenueUsd))
            : 200;

          const dividend = distributeProjectRevenue(s, user, proj, initialRevenueUsd, '首日上線營收');

          pushActivity(s, {
            type: 'launch',
            icon: '🚀',
            message: `🎆 《${proj.name}》正式發布上線！首筆營收 $${dividend.grossRevenueUsd} 已按 5/85/10 結算分紅（首發創意 $${dividend.sparkRoyaltyUsd}、實幹池 $${dividend.meritPoolUsd}、你實得 $${dividend.playerTotalUsd}、平臺 $${dividend.platformCarryUsd}）`,
            projectId: proj.id,
          });

          const achIds = ['launch_founder'];
          if (dividend.playerTotalUsd > 0) achIds.push('dividend_earner');
          const unlockedAchievements = unlockAchievements(s, user, achIds);

          return { project: proj, dividend, unlockedAchievements, user };
        });

        sseHub.broadcast('project_launched', {
          project: result.project,
          dividend: result.dividend,
        });
        broadcastAchievements(sseHub, result.unlockedAchievements, result.user);
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          project: result.project,
          dividend: result.dividend,
          founderRevenue: state.founderRevenue,
          unlockedAchievements: result.unlockedAchievements,
          state: projectStateForUser(state, result.user.id),
        });
      }

      // Projects: POST /api/projects/:id/simulate-revenue
      const simRevMatch = pathname.match(/^\/api\/projects\/([^/]+)\/simulate-revenue$/);
      if (simRevMatch && method === 'POST') {
        const projectId = decodeURIComponent(simRevMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          const proj = s.projects.find((p) => p.id === projectId);
          if (!proj) {
            throw new HttpError(404, `找不到項目：${projectId}`);
          }
          if (proj.status !== 'launched') {
            throw new HttpError(400, `項目《${proj.shortName}》尚未發布上線，無法結算產品營收`);
          }

          const amountUsd = Number(body.amountUsd) > 0 ? round2(Number(body.amountUsd)) : 100;
          const dividend = distributeProjectRevenue(s, user, proj, amountUsd, '新進產品營收');

          pushActivity(s, {
            type: 'dividend',
            icon: '💸',
            message: `《${proj.shortName}》新增產品營收 $${dividend.grossRevenueUsd}！已按 5/85/10 即時分紅：你實得 +$${dividend.playerTotalUsd}（創意 $${dividend.playerSparkUsd} + 實幹 $${dividend.playerMeritUsd}），平臺 +$${dividend.platformCarryUsd}`,
            projectId: proj.id,
          });

          const unlockedAchievements = dividend.playerTotalUsd > 0
            ? unlockAchievements(s, user, ['dividend_earner'])
            : [];

          return { project: proj, dividend, unlockedAchievements, user };
        });

        sseHub.broadcast('revenue_distributed', {
          project: result.project,
          dividend: result.dividend,
        });
        broadcastAchievements(sseHub, result.unlockedAchievements, result.user);
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          project: result.project,
          dividend: result.dividend,
          founderRevenue: state.founderRevenue,
          unlockedAchievements: result.unlockedAchievements,
          state: projectStateForUser(state, result.user.id),
        });
      }

      // Tasks: POST /api/tasks/:id/claim
      const claimMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/claim$/);
      if (claimMatch && method === 'POST') {
        const taskId = decodeURIComponent(claimMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          const task = s.tasks.find((t) => t.id === taskId);
          if (!task) {
            throw new HttpError(404, `找不到任務：${taskId}`);
          }
          if (task.status === 'completed') {
            throw new HttpError(409, '此任務已完成驗收');
          }
          if (task.status === 'in_progress' && task.assignedWorkerId && task.assignedWorkerId !== body.workerId) {
            throw new HttpError(409, '此任務正由其他算力小人執行中');
          }

          const expectedTrack = task.track === 'api_auto' ? 'api' : 'quota';
          let worker = body.workerId
            ? user.workers.find((w) => w.id === body.workerId)
            : user.workers.find((w) => w.track === expectedTrack && w.status === 'idle');

          if (!worker) {
            throw new HttpError(400, body.workerId
              ? `找不到指定的算力小人：${body.workerId}`
              : `沒有閒置的 ${expectedTrack === 'api' ? 'API 軌道' : '月/週額度軌道'} 小人可接單`);
          }

          if (worker.track !== expectedTrack) {
            throw new HttpError(400, `軌道不匹配：${task.track === 'api_auto' ? '自動工坊任務僅限 API 小人' : '懸賞工會任務僅限月/週額度小人'}`);
          }
          if (worker.status === 'working' && worker.currentTaskId !== task.id) {
            throw new HttpError(409, `小人【${worker.name}】正在執行其他任務`);
          }
          if (worker.stamina < task.staminaCost) {
            throw new HttpError(400, `小人【${worker.name}】體力不足（剩餘 ${worker.stamina}，需要 ${task.staminaCost}），請先到宿舍喝咖啡回復體力`);
          }
          if (worker.track === 'api' && worker.usedTokensToday + task.tokenCostEst > worker.dailyTokenCap) {
            throw new HttpError(400, `小人【${worker.name}】即將超過今日 Token 安全上限（${worker.dailyTokenCap}），請調高上限或明日再戰`);
          }

          const now = new Date().toISOString();
          task.status = 'in_progress';
          task.assignedWorkerId = worker.id;
          task.claimedBy = user.id;
          task.claimedAt = now;

          worker.status = 'working';
          worker.currentTaskId = task.id;
          worker.currentProjectId = task.projectId;
          worker.currentZone = task.track === 'api_auto' ? 'factory' : 'guild';
          worker.lastMessage = `已接單：${task.title.slice(0, 22)}...`;

          const proj = s.projects.find((p) => p.id === task.projectId);
          pushActivity(s, {
            type: 'claim',
            icon: task.track === 'api_auto' ? '🏭' : '⚔️',
            message: `【${worker.name}】接下《${proj?.shortName || task.projectId}》任務：${task.title}`,
            workerId: worker.id,
            projectId: task.projectId,
            taskId: task.id,
          });

          return { task, worker, project: proj || null, userId: user.id };
        });

        sseHub.broadcast('task_claimed', {
          task: result.task,
          worker: result.worker,
          project: result.project,
        });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          task: result.task,
          worker: result.worker,
          project: result.project,
          state: projectStateForUser(state, result.userId),
        });
      }

      // Tasks: POST /api/tasks/:id/release
      const releaseMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/release$/);
      if (releaseMatch && method === 'POST') {
        const taskId = decodeURIComponent(releaseMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          const task = s.tasks.find((t) => t.id === taskId);
          if (!task) {
            throw new HttpError(404, `找不到任務：${taskId}`);
          }
          if (task.status === 'completed') {
            throw new HttpError(409, '此任務已完成驗收，無法釋放');
          }

          const targetWorkerId = body.workerId || task.assignedWorkerId;
          let worker = targetWorkerId
            ? user.workers.find((w) => w.id === targetWorkerId)
            : null;
          if (!worker && targetWorkerId) {
            const cross = findWorkerAcrossUsers(s, targetWorkerId);
            if (cross) worker = cross.worker;
          }

          const wasInProgress = task.status === 'in_progress';
          task.status = 'open';
          task.assignedWorkerId = null;
          task.claimedBy = null;
          task.claimedAt = null;

          const reasonText = sanitizeText(body.reason, 120);

          if (worker && (worker.currentTaskId === task.id || body.workerId === worker.id)) {
            worker.status = 'idle';
            worker.currentTaskId = null;
            worker.currentProjectId = null;
            worker.currentZone = 'lounge';
            worker.lastMessage = reasonText
              ? `已安全退回任務：${reasonText.slice(0, 32)}`
              : '已安全釋放任務回任務板，隨時可重新派工！';
          }

          if (wasInProgress) {
            pushActivity(s, {
              type: 'release',
              icon: '↩️',
              message: `【${worker?.name || '系統'}】無懲罰釋放任務《${task.title}》回待接狀態${reasonText ? `（${reasonText}）` : ''}`,
              workerId: worker?.id || null,
              projectId: task.projectId,
              taskId: task.id,
            });
          }

          return { task, worker: worker || null, userId: user.id };
        });

        sseHub.broadcast('task_released', {
          task: result.task,
          worker: result.worker,
        });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          task: result.task,
          worker: result.worker,
          state: projectStateForUser(state, result.userId),
        });
      }

      // Tasks: POST /api/tasks/:id/submit
      const submitMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/submit$/);
      if (submitMatch && method === 'POST') {
        const taskId = decodeURIComponent(submitMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          let user = ctx.user;
          const task = s.tasks.find((t) => t.id === taskId);
          if (!task) {
            throw new HttpError(404, `找不到任務：${taskId}`);
          }
          if (task.status === 'completed') {
            throw new HttpError(409, '此任務已完成驗收，無法重複提交');
          }

          const expectedTrack = task.track === 'api_auto' ? 'api' : 'quota';
          const workerId = body.workerId || task.assignedWorkerId;
          let worker = workerId
            ? user.workers.find((w) => w.id === workerId)
            : user.workers.find((w) => w.track === expectedTrack);

          // If submitted by a CLI worker belonging to another user, resolve owner cleanly
          if (!worker && workerId) {
            const cross = findWorkerAcrossUsers(s, workerId);
            if (cross) {
              user = cross.user;
              worker = cross.worker;
            }
          }

          const verification = verifySubmission(task, {
            content: body.content,
            prUrl: body.prUrl,
            notes: body.notes,
            executionMode: body.executionMode,
          });

          const proj = s.projects.find((p) => p.id === task.projectId);
          const now = new Date().toISOString();

          if (!verification.passed) {
            user.reputation = Math.max(0, user.reputation - 2);
            task.status = 'open';
            task.assignedWorkerId = null;
            task.lastRejectedVerification = verification;
            task.lastRejectedAt = now;

            if (worker) {
              worker.status = 'idle';
              worker.currentTaskId = null;
              worker.currentProjectId = null;
              worker.currentZone = 'lounge';
              worker.lastMessage = '交卷未通過驗收，需要修正後重交！';
            }

            syncUserLeaderboard(s, user);
            pushActivity(s, {
              type: 'reject',
              icon: '🛡️',
              message: `防作弊驗收攔截：【${task.title}】未通過檢查（0 貢獻值，信譽分 -2）— ${verification.reason}`,
              workerId: worker?.id || null,
              projectId: task.projectId,
              taskId: task.id,
            });

            return {
              passed: false,
              verification,
              rewards: {
                gold: 0,
                contributionPoints: 0,
                xp: 0,
                bountyGrossUsd: 0,
                bountyNetUsd: 0,
                platformFeeUsd: 0,
                reputationDelta: -2,
                leveledUp: false,
              },
              task,
              worker: worker || null,
              project: proj || null,
              unlockedAchievements: [],
              user,
            };
          }

          // Passed Proof of Accepted Work!
          const gold = task.goldReward;
          const contributionPoints = task.contributionPoints;
          const xp = task.xpReward || 40;
          const bountyGrossUsd = round2(task.cashBountyUsd || 0);
          const platformFeeUsd = round2(bountyGrossUsd * (PLATFORM_BOUNTY_FEE_PCT / 100));
          const bountyNetUsd = round2(bountyGrossUsd - platformFeeUsd);
          const reputationDelta = verification.score >= 85 ? 2 : 1;
          const tokensUsed = Number(body.tokensUsed) > 0 ? Math.round(Number(body.tokensUsed)) : task.tokenCostEst;

          const contentStr = sanitizeText(
            typeof body.content === 'string'
              ? body.content
              : JSON.stringify(body.content ?? '', null, 2),
            50_000,
            { multiline: true },
          );

          task.status = 'completed';
          task.submittedAt = now;
          task.assignedWorkerId = worker?.id || task.assignedWorkerId || null;
          task.verification = verification;
          task.submission = {
            content: contentStr,
            prUrl: sanitizeText(body.prUrl, 240) || null,
            notes: sanitizeText(body.notes, 500, { multiline: true }),
            executionMode: sanitizeText(body.executionMode, 32) || (task.track === 'api_auto' ? 'byok' : 'byot_cli'),
            tokensUsed,
            submittedBy: user.displayName,
            submittedByUserId: user.id,
            submittedAt: now,
          };

          // Update user stats
          user.gold += gold;
          user.usdBalance = round2((user.usdBalance || 0) + bountyNetUsd);
          user.completedTasks += 1;
          user.totalContribution += contributionPoints;
          user.reputation += reputationDelta;

          if (platformFeeUsd > 0) {
            addFounderRevenueEntry(s, {
              stream: 'bounty_fee',
              label: `現金懸賞《${task.title.slice(0, 26)}》10% 託管服務費`,
              amountUsd: platformFeeUsd,
              projectId: task.projectId,
              taskId: task.id,
            });
          }

          // Update worker stats & level up
          let leveledUp = false;
          if (worker) {
            worker.stamina = Math.max(0, worker.stamina - task.staminaCost);
            worker.usedTokensToday += tokensUsed;
            worker.xp += xp;
            while (worker.xp >= worker.xpToNext) {
              worker.xp -= worker.xpToNext;
              worker.level += 1;
              worker.xpToNext = Math.round(worker.xpToNext * 1.35);
              worker.maxStamina = Math.min(150, worker.maxStamina + 5);
              leveledUp = true;
            }
            worker.completedCount += 1;
            worker.earnedGold += gold;
            worker.earnedPoints += contributionPoints;
            worker.status = 'idle';
            worker.currentTaskId = null;
            worker.currentProjectId = null;
            worker.currentZone = 'lounge';
            worker.lastMessage = leveledUp
              ? `升到 Lv.${worker.level}！獲得 +${gold}G / +${contributionPoints} 貢獻點！`
              : `驗收通過（${verification.score}分）！獲得 +${gold}G！`;
          }

          // Update project progress, contributions & coBuilders
          if (proj) {
            proj.progressPct = Math.min(100, (proj.progressPct || 0) + (task.progressWeight || 15));
            proj.contributions = proj.contributions || {};
            proj.contributorNames = proj.contributorNames || {};
            proj.contributions[user.id] = (proj.contributions[user.id] || 0) + contributionPoints;
            proj.contributorNames[user.id] = user.displayName;
            if (!Array.isArray(proj.coBuilders)) {
              proj.coBuilders = [];
            }
            if (!proj.coBuilders.some((b) => b.userId === user.id)) {
              proj.coBuilders.push({
                userId: user.id,
                username: user.username || user.id,
                displayName: user.displayName,
                joinedAt: now,
              });
            }
          }

          // Contribution ledger
          s.contributionLedger.unshift({
            id: uid('contrib'),
            timestamp: now,
            projectId: task.projectId,
            projectName: proj?.name || task.projectId,
            taskId: task.id,
            taskTitle: task.title,
            userId: user.id,
            userName: user.displayName,
            workerId: worker?.id || null,
            workerName: worker?.name || '手動提交',
            points: contributionPoints,
            gold,
            bountyGrossUsd,
            bountyNetUsd,
            platformFeeUsd,
            verificationScore: verification.score,
          });
          if (s.contributionLedger.length > 100) {
            s.contributionLedger.length = 100;
          }

          syncUserLeaderboard(s, user);

          const bountyText = bountyGrossUsd > 0
            ? `、實得懸賞 $${bountyNetUsd}（平臺服務費 $${platformFeeUsd}）`
            : '';
          const preview = contentStr.replace(/\s+/g, ' ').slice(0, 140);

          pushActivity(s, {
            type: 'complete',
            icon: '✅',
            message: `【${worker?.name || user.displayName}】完成《${task.title}》（評分 ${verification.score}）：+${gold}G、+${contributionPoints} 貢獻點${bountyText}`,
            workerId: worker?.id || null,
            projectId: task.projectId,
            taskId: task.id,
            preview,
          });

          const achCandidates = ['first_blood'];
          const completedTracks = new Set(
            s.tasks
              .filter((t) => t.status === 'completed' && (!t.submission?.submittedByUserId || t.submission.submittedByUserId === user.id))
              .map((t) => t.track),
          );
          if (completedTracks.has('api_auto') && completedTracks.has('guild_bounty')) {
            achCandidates.push('dual_track_master');
          }
          const unlockedAchievements = unlockAchievements(s, user, achCandidates);

          return {
            passed: true,
            verification,
            rewards: {
              gold,
              contributionPoints,
              xp,
              bountyGrossUsd,
              bountyNetUsd,
              platformFeeUsd,
              reputationDelta,
              leveledUp,
            },
            task,
            worker: worker || null,
            project: proj || null,
            unlockedAchievements,
            user,
          };
        });

        sseHub.broadcast(result.passed ? 'task_completed' : 'task_rejected', {
          task: result.task,
          worker: result.worker,
          project: result.project,
          verification: result.verification,
          rewards: result.rewards,
        });
        broadcastAchievements(sseHub, result.unlockedAchievements || [], result.user);
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });

        return sendJson(res, 200, {
          ok: result.passed,
          passed: result.passed,
          verification: result.verification,
          rewards: result.rewards,
          task: result.task,
          worker: result.worker,
          project: result.project,
          unlockedAchievements: result.unlockedAchievements || [],
          state: projectStateForUser(state, result.user.id),
        });
      }

      // Shop: POST /api/shop/buy
      if (pathname === '/api/shop/buy' && method === 'POST') {
        const body = await parseJsonBody(req);
        const item = SHOP_ITEMS.find((i) => i.id === body.itemId);
        if (!item) {
          throw new HttpError(404, `找不到商店商品：${body.itemId}`);
        }

        const { state, result: userId } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          if (user.ownedItems.includes(item.id)) {
            throw new HttpError(409, `你已經擁有「${item.name}」了`);
          }

          if (item.priceGold > 0) {
            if (user.gold < item.priceGold) {
              throw new HttpError(400, `金幣不足！購買「${item.name}」需要 ${item.priceGold}G，目前僅有 ${user.gold}G`);
            }
            user.gold -= item.priceGold;
          }

          if (item.priceUsd > 0) {
            addFounderRevenueEntry(s, {
              stream: 'pro_skin',
              label: `玩家購買「${item.name}」`,
              amountUsd: item.priceUsd,
            });
          }

          user.ownedItems.push(item.id);

          if (item.type === 'skin' && item.skinId) {
            if (!user.ownedSkins.includes(item.skinId)) {
              user.ownedSkins.push(item.skinId);
            }
            if (body.workerId) {
              const target = user.workers.find((w) => w.id === body.workerId);
              if (target) target.skin = item.skinId;
            }
          } else if (item.type === 'skin_bundle') {
            for (const sid of item.unlockSkins || []) {
              if (!user.ownedSkins.includes(sid)) {
                user.ownedSkins.push(sid);
              }
            }
            if (body.workerId && item.skinId) {
              const target = user.workers.find((w) => w.id === body.workerId);
              if (target) target.skin = item.skinId;
            }
          } else if (item.type === 'decor' && item.decorId) {
            if (!user.ownedDecor.includes(item.decorId)) {
              user.ownedDecor.push(item.decorId);
            }
          } else if (item.type === 'pro') {
            user.isPro = true;
            syncUserLeaderboard(s, user);
          }

          pushActivity(s, {
            type: 'shop',
            icon: item.icon || '🛍️',
            message: `${user.displayName} 購買了「${item.name}」（${item.priceUsd > 0 ? `$${item.priceUsd} USD` : `${item.priceGold}G`}）`,
          });
          return user.id;
        });

        sseHub.broadcast('shop_purchased', { item });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          item,
          founderRevenue: state.founderRevenue,
          state: projectStateForUser(state, userId),
        });
      }

      // Local CLI Heartbeat: POST /api/cli/heartbeat
      if (pathname === '/api/cli/heartbeat' && method === 'POST') {
        const body = await parseJsonBody(req);
        const now = new Date().toISOString();

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          let ownerUser = ctx.user;
          let worker = body.workerId
            ? ownerUser.workers.find((w) => w.id === body.workerId)
            : ownerUser.workers.find((w) => w.track === 'quota') || ownerUser.workers[0];

          if (!worker && body.workerId) {
            const cross = findWorkerAcrossUsers(s, body.workerId);
            if (cross) {
              ownerUser = cross.user;
              worker = cross.worker;
            }
          }

          const message = sanitizeText(body.message, 120) || '本機 CLI 同步運行中...';
          const progressPct = body.progressPct !== undefined
            ? Math.max(0, Math.min(100, Math.round(Number(body.progressPct) || 0)))
            : null;
          const cliTool = sanitizeText(body.cliTool, 40) || 'pixel-worker';

          if (worker) {
            worker.lastMessage = message;
            worker.lastHeartbeatAt = now;
            if (body.status === 'working' || body.status === 'running') {
              worker.status = 'working';
              worker.currentZone = worker.track === 'api' ? 'factory' : 'guild';
              if (body.taskId) worker.currentTaskId = body.taskId;
            } else if (body.status === 'idle') {
              worker.status = 'idle';
              worker.currentZone = 'lounge';
            }
          }

          const heartbeat = {
            workerId: worker?.id || body.workerId || null,
            workerName: worker?.name || '本機 CLI 助手',
            taskId: body.taskId || worker?.currentTaskId || null,
            status: body.status || 'working',
            progressPct,
            message,
            cliTool,
            timestamp: now,
          };

          if (body.logToFeed !== false) {
            pushActivity(s, {
              type: 'cli',
              icon: '💻',
              message: `[CLI:${cliTool}] ${heartbeat.workerName}：${message}${progressPct !== null ? ` (${progressPct}%)` : ''}`,
              workerId: heartbeat.workerId,
              taskId: heartbeat.taskId,
            });
          }

          const unlockedAchievements = unlockAchievements(s, ownerUser, ['cli_pioneer']);
          return { heartbeat, worker: worker || null, unlockedAchievements, user: ownerUser };
        });

        sseHub.broadcast('cli_heartbeat', result.heartbeat);
        broadcastAchievements(sseHub, result.unlockedAchievements, result.user);
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          heartbeat: result.heartbeat,
          worker: result.worker,
          unlockedAchievements: result.unlockedAchievements,
          state: projectStateForUser(state, result.user.id),
        });
      }

      // GitHub Public Issues Import: POST /api/github/import-issues
      if (pathname === '/api/github/import-issues' && method === 'POST') {
        const body = await parseJsonBody(req);
        const parsedRepo = parseGitHubRepoUrl(body.repoUrl);
        if (!parsedRepo.valid) {
          return sendJson(res, 400, {
            ok: false,
            error: parsedRepo.error,
          });
        }

        const maxIssues = Math.max(1, Math.min(10, Math.round(Number(body.maxIssues) || 5)));
        const requestedTrack = (body.track === 'api_auto' || body.track === 'guild_bounty')
          ? body.track
          : 'auto';

        let rawIssues = [];
        let fallbackUsed = false;
        let fallbackReason = null;

        if (body.skipRemote || process.env.DISABLE_REMOTE_GITHUB_CHECK === '1') {
          fallbackUsed = true;
          fallbackReason = '已啟用離線預覽模式';
          rawIssues = generateFallbackIssues(parsedRepo, maxIssues);
        } else {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const perPage = Math.min(maxIssues * 2, 20);
            const ghRes = await fetch(
              `https://api.github.com/repos/${parsedRepo.owner}/${parsedRepo.repo}/issues?state=open&per_page=${perPage}`,
              {
                headers: {
                  Accept: 'application/vnd.github+json',
                  'User-Agent': 'PixelCompute-Town',
                },
                signal: controller.signal,
              },
            );
            clearTimeout(timer);

            if (ghRes.ok) {
              const data = await ghRes.json();
              const realIssues = Array.isArray(data)
                ? data.filter((item) => item && !item.pull_request).slice(0, maxIssues)
                : [];
              if (realIssues.length > 0) {
                rawIssues = realIssues;
              } else {
                fallbackUsed = true;
                fallbackReason = '該倉庫目前無公開 Open Issues，已改用離線預覽範例';
                rawIssues = generateFallbackIssues(parsedRepo, maxIssues);
              }
            } else {
              fallbackUsed = true;
              fallbackReason = ghRes.status === 403
                ? 'GitHub API 匿名限流，已降級為離線預覽'
                : `GitHub API 回應 HTTP ${ghRes.status}，已降級為離線預覽`;
              rawIssues = generateFallbackIssues(parsedRepo, maxIssues);
            }
          } catch {
            fallbackUsed = true;
            fallbackReason = '無法連線 GitHub API（離線或逾時），已降級為離線預覽';
            rawIssues = generateFallbackIssues(parsedRepo, maxIssues);
          }
        }

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          let project = null;
          let createdProject = false;

          if (body.projectId) {
            project = s.projects.find((p) => p.id === body.projectId);
            if (!project) {
              throw new HttpError(404, `找不到目標項目：${body.projectId}`);
            }
          } else {
            const lowerUrl = parsedRepo.url.toLowerCase();
            project = s.projects.find((p) => (p.repoUrl || '').toLowerCase().replace(/\/+$/, '') === lowerUrl);
            if (!project) {
              createdProject = true;
              const shortName = parsedRepo.repo.slice(0, 22);
              project = buildChainedProject(s, user, {
                id: uid('proj-gh'),
                name: `${parsedRepo.fullName}（GitHub 匯入）`.slice(0, 64),
                shortName,
                tagline: `自 GitHub 倉庫 ${parsedRepo.fullName} 匯入的開源協作項目，共享 5/85/10 創意溯源與多勞多得分紅池！`,
                description: `已連結公開倉庫 ${parsedRepo.url}，社群算力小人可直接領取匯入的 Issue 任務開工！`,
                status: 'building',
                votes: 10,
                votesRequired: 10,
                progressPct: 10,
                repoUrl: parsedRepo.url,
                bountyPoolUsd: 0,
                totalRevenueUsd: 0,
                distributedRevenueUsd: 0,
                sponsoredBillboard: false,
                billboardText: '',
                launchedAt: null,
                contributions: {},
                contributorNames: {},
              });
              s.projects.push(project);
            }
          }

          const importedTasks = rawIssues.map((issue) => buildTaskFromGitHubIssue(
            issue,
            project,
            parsedRepo,
            requestedTrack,
            { isFallback: fallbackUsed },
          ));

          s.tasks.push(...importedTasks);

          pushActivity(s, {
            type: 'github_import',
            icon: '🔗',
            message: `自 GitHub 倉庫【${parsedRepo.fullName}】匯入 ${importedTasks.length} 張任務卡至《${project.shortName}》${fallbackUsed ? '（離線預覽）' : ''}`,
            projectId: project.id,
          });

          return { project, createdProject, tasks: importedTasks, userId: user.id };
        });

        sseHub.broadcast('tasks_imported', {
          repo: parsedRepo,
          project: result.project,
          createdProject: result.createdProject,
          tasks: result.tasks,
          fallbackUsed,
        });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });

        return sendJson(res, 200, {
          ok: true,
          repo: parsedRepo,
          project: result.project,
          createdProject: result.createdProject,
          tasks: result.tasks,
          importedCount: result.tasks.length,
          fallbackUsed,
          fallbackReason,
          state: projectStateForUser(state, result.userId),
        });
      }

      // GitHub PR Verification: POST /api/github/verify-pr
      if (pathname === '/api/github/verify-pr' && method === 'POST') {
        const body = await parseJsonBody(req);
        const parsed = validateGitHubPrUrl(body.prUrl);
        if (!parsed.valid) {
          return sendJson(res, 400, {
            ok: false,
            valid: false,
            error: parsed.reason,
          });
        }

        const prInfo = {
          owner: parsed.owner,
          repo: parsed.repo,
          pullNumber: parsed.pullNumber,
          url: parsed.url,
        };

        let remoteChecked = false;
        let remoteStatus = null;

        if (!body.skipRemote && process.env.DISABLE_REMOTE_GITHUB_CHECK !== '1') {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3000);
            const ghRes = await fetch(
              `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pullNumber}`,
              {
                headers: {
                  Accept: 'application/vnd.github+json',
                  'User-Agent': 'PixelCompute-Town',
                },
                signal: controller.signal,
              },
            );
            clearTimeout(timer);

            if (ghRes.ok) {
              const ghData = await ghRes.json();
              remoteChecked = true;
              remoteStatus = {
                state: ghData.state,
                merged: Boolean(ghData.merged),
                title: ghData.title,
                author: ghData.user?.login || null,
              };
            } else {
              remoteChecked = true;
              remoteStatus = {
                httpStatus: ghRes.status,
                note: ghRes.status === 404 ? '公開 API 未找到此 PR（可能為私人 Repo 或測試連結）' : 'GitHub API 限流或無法存取',
              };
            }
          } catch {
            remoteChecked = false;
          }
        }

        return sendJson(res, 200, {
          ok: true,
          valid: true,
          remoteChecked,
          pr: prInfo,
          remoteStatus,
        });
      }

      // Reset world: POST /api/reset
      if (pathname === '/api/reset' && method === 'POST') {
        const state = await store.reset();
        sseHub.broadcast('world_reset', { timestamp: state.updatedAt });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          state: projectStateForUser(state, FOUNDER_USER_ID),
        });
      }

      // Unknown API route
      if (pathname.startsWith('/api/')) {
        return sendJson(res, 404, { ok: false, error: `未知的 API 路徑：${method} ${pathname}` });
      }

      // Serve static pages & assets from public/
      if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Method Not Allowed');
      }

      const decodedPath = decodeURIComponent(pathname);
      if (decodedPath === '/') {
        return await serveStaticFile(res, method, 'landing.html', 'index.html');
      }
      if (decodedPath === '/app' || decodedPath === '/app/') {
        return await serveStaticFile(res, method, 'index.html');
      }
      if (decodedPath === '/onboard' || decodedPath === '/onboard/') {
        return await serveStaticFile(res, method, 'onboard.html');
      }

      const safeRelPath = decodedPath.replace(/^\/+/, '');
      return await serveStaticFile(res, method, safeRelPath);
    } catch (err) {
      if (err instanceof HttpError) {
        return sendJson(res, err.statusCode, {
          ok: false,
          error: err.message,
          ...(err.extra || {}),
        });
      }
      console.error('[PixelCompute Town Server Error]', err);
      return sendJson(res, 500, {
        ok: false,
        error: err.message || 'Internal Server Error',
      });
    }
  });

  server.sseHub = sseHub;
  server.store = store;

  const originalClose = server.close.bind(server);
  server.close = (cb) => {
    sseHub.closeAll();
    return originalClose(cb);
  };

  return server;
}

// Start server when run directly via `node server.mjs`
const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMainModule) {
  const PORT = Number(process.env.PORT || 3456);
  const HOST = process.env.HOST || '0.0.0.0';
  const server = createAppServer();

  server.listen(PORT, HOST, () => {
    console.log(`🏮 PixelCompute Town v${VERSION} running at http://localhost:${PORT} (bind ${HOST})`);
  });

  let shuttingDown = false;
  const gracefulShutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n🏮 Received ${signal}, shutting down PixelCompute Town gracefully...`);
    const forceTimer = setTimeout(() => {
      process.exit(0);
    }, 5000);
    if (typeof forceTimer.unref === 'function') {
      forceTimer.unref();
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
