// PixelCompute Town — Zero-Dependency Node.js v1.2 HTTP + REST + SSE + SQLite WAL Server

import crypto from 'node:crypto';
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
import {
  CORE_BUCKET_PCT,
  DEFAULT_COOLDOWN_SEC,
  DEFAULT_MIN_REPUTATION,
  EXPIRED_CLAIM_REPUTATION_PENALTY,
  PERIPHERAL_BUCKET_PCT,
  REVIEWER_MIN_CORE_POINTS,
  REVIEWER_MIN_REPUTATION,
  REVIEWER_REWARD_GOLD,
  REVIEWER_REWARD_POINTS,
  REVIEW_REJECT_REPUTATION_PENALTY,
  SLOP_STRIKE_LIMIT,
  canUserReview,
  computeAntiDilutionMeritSplit,
  computeBucketStats,
  ensureProjectBuckets,
  evaluateReviewerEligibility,
  getClaimLeaseMs,
  getCooldownSeconds,
  getTaskBucket,
  getTaskMinReputation,
  getTaskStakeGold,
  runAiBlindReview,
} from './src/server/governance.mjs';
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
  isFounderAdmin,
  isGitHubOAuthEnabled,
  isGoogleOAuthEnabled,
  projectStateForUser,
  sanitizeUserForClient,
  syncUserLeaderboard,
} from './src/server/auth.mjs';
import {
  DEMO_REDEEM_CODES,
  PAYMENT_PRODUCTS,
  getPaymentConfig,
  handleAdminBatchMarkPaid,
  handleAdminConfirmOrder,
  handleAdminGenerateCodes,
  handleAdminMarkPayoutPaid,
  handleAdminPayoutBatch,
  handleAfdianWebhook,
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
import {
  findProjectBySlugOrId,
  renderDocPage,
  renderPublicNotFoundPage,
  renderPublicProjectPage,
  renderPublicVerifyPage,
} from './src/server/publicPages.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PUBLIC_DIR = path.join(__dirname, 'public');
const VERSION = '1.2.0';

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
    audience: category === 'docs' ? 'beginner' : 'dev',
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
    poolBucket: isApi ? 'peripheral' : 'core',
    stakeGold: isApi ? 0 : 25,
    stakedGold: 0,
    stakedByUserId: null,
    minReputation: isApi ? 0 : DEFAULT_MIN_REPUTATION,
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

function sendHtml(res, statusCode, html, method = 'GET', cacheControl = 'no-cache') {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': cacheControl,
  });
  if (method === 'HEAD') return res.end();
  return res.end(html);
}

function getRequestOrigin(req) {
  const rawProto = typeof req.headers['x-forwarded-proto'] === 'string'
    ? req.headers['x-forwarded-proto'].split(',')[0].trim().toLowerCase()
    : 'http';
  const proto = rawProto === 'https' ? 'https' : 'http';
  const rawHost = typeof req.headers['x-forwarded-host'] === 'string'
    ? req.headers['x-forwarded-host'].split(',')[0].trim()
    : String(req.headers.host || 'localhost:3456').trim();
  const safeHost = /^[a-z0-9.:-]+$/i.test(rawHost) ? rawHost : 'localhost:3456';
  return `${proto}://${safeHost}`;
}

function verifyGitHubWebhookSignature(rawBody, signatureHeader, secret) {
  if (!secret) return true;
  if (typeof signatureHeader !== 'string' || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;
  const sigBuf = Buffer.from(signatureHeader.trim(), 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function normalizeUrlForMatch(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\/+$/, '');
}

function buildAutoSplitTasks(project, featureBrief, requestedCount = 3) {
  const short = project.shortName || project.name;
  const briefShort = featureBrief.length > 48 ? `${featureBrief.slice(0, 48)}…` : featureBrief;
  const slug = String(project.id || 'proj').replace(/[^a-z0-9-]/gi, '').slice(0, 16) || 'proj';
  const suffix = `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 4)}`;
  const targetCount = Math.max(3, Math.min(6, Math.round(Number(requestedCount) || 3)));

  const baseTasks = [
    {
      id: `task-${slug}-core-${suffix}`,
      projectId: project.id,
      track: 'guild_bounty',
      audience: 'dev',
      category: 'feature_pr',
      source: 'auto_split',
      title: `[核心架構] 實作《${short}》功能：${briefShort}`.slice(0, 120),
      description: `針對需求「${featureBrief}」設計並實作核心模組、資料流與異常保護，提交可合併 PR 或完整程式碼。`,
      modelSuggestion: 'Gemini CLI / Claude Code / Codex',
      promptTemplate: `你是《${project.name}》的核心架構工程師。請針對功能需求「${featureBrief}」在本機工作區實作完整核心邏輯、狀態持久化與邊界處理，並提交可審查程式碼或 GitHub PR（請在 PR 標題/內文加上 Fixes #task-${slug}-core-${suffix} 即可合併自動結算）。`,
      sampleInput: `Project: ${project.name}\nFeature Brief: ${featureBrief}\nPool: Core (70% anti-dilution protected)`,
      acceptanceCriteria: [
        '提供核心模組實作程式碼（含匯出函式與異常處理）或合法 GitHub PR 連結',
        `完整落地功能需求：${briefShort}`,
      ],
      cashBountyUsd: 0,
      poolBucket: 'core',
      stakeGold: 25,
      stakedGold: 0,
      stakedByUserId: null,
      minReputation: DEFAULT_MIN_REPUTATION,
      contributionPoints: 70,
      goldReward: 280,
      xpReward: 90,
      progressWeight: 20,
      tokenCostEst: 18,
      staminaCost: 22,
      status: 'open',
      assignedWorkerId: null,
      claimedBy: null,
      claimedAt: null,
      submittedAt: null,
      submission: null,
      verification: null,
    },
    {
      id: `task-${slug}-test-${suffix}`,
      projectId: project.id,
      track: 'api_auto',
      audience: 'dev',
      category: 'unit_test',
      source: 'auto_split',
      title: `[自動測試] 為「${briefShort}」補齊單元測試與邊界斷言`.slice(0, 120),
      description: `針對《${short}》新功能「${featureBrief}」使用 Node.js 原生 node:test 補齊正常路徑與錯誤輸入測試。`,
      modelSuggestion: 'gemini-2.5-flash',
      promptTemplate: `請使用 Node.js 原生 node:test 與 node:assert/strict，為《${project.name}》新功能「${featureBrief}」撰寫至少 3 個單元測試案例（涵蓋正常行為、空值與異常邊界）。`,
      sampleInput: `Project: ${project.name}\nFeature: ${featureBrief}\nFramework: node:test + node:assert/strict`,
      acceptanceCriteria: [
        '包含標準 test() 與 assert 斷言程式碼',
        '覆蓋正常流程與異常邊界條件',
      ],
      cashBountyUsd: 0,
      poolBucket: 'peripheral',
      stakeGold: 0,
      stakedGold: 0,
      stakedByUserId: null,
      minReputation: 0,
      contributionPoints: 15,
      goldReward: 110,
      xpReward: 35,
      progressWeight: 10,
      tokenCostEst: 18000,
      staminaCost: 12,
      status: 'open',
      assignedWorkerId: null,
      claimedBy: null,
      claimedAt: null,
      submittedAt: null,
      submission: null,
      verification: null,
    },
    {
      id: `task-${slug}-i18n-${suffix}`,
      projectId: project.id,
      track: 'api_auto',
      audience: 'dev',
      category: 'i18n',
      source: 'auto_split',
      title: `[多語系/文件] 為「${briefShort}」產出三語 UI 文案與使用指南`.slice(0, 120),
      description: `為《${short}》新功能「${featureBrief}」產出繁中／簡中／英文結構化 JSON 文案與簡明操作說明。`,
      modelSuggestion: 'gemini-2.5-flash',
      promptTemplate: `你是開源產品在地化與技術文件工程師。請為《${project.name}》的新功能「${featureBrief}」輸出合法 JSON 多語系文案，包含 zh-TW、zh-CN、en 三個語系物件，每個物件至少包含 title、description、ctaBtn、helpTip 四個鍵值。只輸出合法 JSON。`,
      sampleInput: JSON.stringify({
        project: project.name,
        featureBrief,
        locales: ['zh-TW', 'zh-CN', 'en'],
        keys: ['title', 'description', 'ctaBtn', 'helpTip'],
      }, null, 2),
      acceptanceCriteria: [
        '必須為合法 JSON 格式，包含至少 2 個語系鍵值',
        '文案自然準確且涵蓋功能操作提示',
      ],
      cashBountyUsd: 0,
      poolBucket: 'peripheral',
      stakeGold: 0,
      stakedGold: 0,
      stakedByUserId: null,
      minReputation: 0,
      contributionPoints: 15,
      goldReward: 100,
      xpReward: 35,
      progressWeight: 10,
      tokenCostEst: 16000,
      staminaCost: 12,
      status: 'open',
      assignedWorkerId: null,
      claimedBy: null,
      claimedAt: null,
      submittedAt: null,
      submission: null,
      verification: null,
    },
  ];

  if (targetCount > 3) {
    const extras = [
      {
        id: `task-${slug}-hardening-${suffix}`,
        projectId: project.id,
        track: 'guild_bounty',
        category: 'bugfix',
        source: 'auto_split',
        title: `[核心加固] 審查「${briefShort}」併發競態與安全防護 PR`.slice(0, 120),
        description: `檢視「${featureBrief}」的輸入消毒、權限邊界與失敗重試邏輯，提交加固修補 PR。`,
        modelSuggestion: 'Claude Code / Codex CLI',
        promptTemplate: `請針對《${project.name}》功能「${featureBrief}」進行安全性與併發健壯性加固，輸出修補程式碼或 GitHub PR 連結。`,
        sampleInput: `Project: ${project.name}\nFeature: ${featureBrief}\nFocus: Security & Edge Cases`,
        acceptanceCriteria: ['提供具體修補程式碼或合法 GitHub PR 連結', '涵蓋至少兩項邊界防護'],
        cashBountyUsd: 0,
        poolBucket: 'core',
        stakeGold: 25,
        stakedGold: 0,
        stakedByUserId: null,
        minReputation: DEFAULT_MIN_REPUTATION,
        contributionPoints: 55,
        goldReward: 220,
        xpReward: 75,
        progressWeight: 15,
        tokenCostEst: 15,
        staminaCost: 20,
        status: 'open',
        assignedWorkerId: null,
        claimedBy: null,
        claimedAt: null,
        submittedAt: null,
        submission: null,
        verification: null,
      },
      {
        id: `task-${slug}-docs-${suffix}`,
        projectId: project.id,
        track: 'api_auto',
        audience: 'beginner',
        category: 'docs',
        source: 'auto_split',
        title: `[文件補齊] 撰寫「${briefShort}」README 範例與 API 規格`.slice(0, 120),
        description: `補充「${featureBrief}」的 Markdown 快速上手範例與參數對照表。`,
        modelSuggestion: 'gemini-2.5-flash',
        promptTemplate: `請以 Markdown 為《${project.name}》功能「${featureBrief}」撰寫簡潔清晰的 API 規格與使用範例。`,
        sampleInput: `Project: ${project.name}\nFeature: ${featureBrief}`,
        acceptanceCriteria: ['包含結構化 Markdown 標題與範例程式碼', '無重複佔位符'],
        cashBountyUsd: 0,
        poolBucket: 'peripheral',
        stakeGold: 0,
        stakedGold: 0,
        stakedByUserId: null,
        minReputation: 0,
        contributionPoints: 15,
        goldReward: 95,
        xpReward: 30,
        progressWeight: 8,
        tokenCostEst: 14000,
        staminaCost: 10,
        status: 'open',
        assignedWorkerId: null,
        claimedBy: null,
        claimedAt: null,
        submittedAt: null,
        submission: null,
        verification: null,
      },
      {
        id: `task-${slug}-spec-${suffix}`,
        projectId: project.id,
        track: 'api_auto',
        category: 'pixel_spec',
        source: 'auto_split',
        title: `[像素視覺] 設計「${briefShort}」像素狀態圖示與配色 JSON`.slice(0, 120),
        description: `為「${featureBrief}」輸出復古像素介面配色與狀態圖示規格 JSON。`,
        modelSuggestion: 'gemini-2.5-flash',
        promptTemplate: `請為《${project.name}》功能「${featureBrief}」輸出包含 palette、icons、badges 的標準 JSON 視覺規格。`,
        sampleInput: `Project: ${project.name}\nFeature: ${featureBrief}`,
        acceptanceCriteria: ['必須為合法 JSON 結構', '包含具體色碼與狀態圖示定義'],
        cashBountyUsd: 0,
        poolBucket: 'peripheral',
        stakeGold: 0,
        stakedGold: 0,
        stakedByUserId: null,
        minReputation: 0,
        contributionPoints: 15,
        goldReward: 95,
        xpReward: 30,
        progressWeight: 8,
        tokenCostEst: 14000,
        staminaCost: 10,
        status: 'open',
        assignedWorkerId: null,
        claimedBy: null,
        claimedAt: null,
        submittedAt: null,
        submission: null,
        verification: null,
      },
    ];
    baseTasks.push(...extras.slice(0, targetCount - 3));
  }

  return baseTasks;
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
    poolCaps: {
      coreSharePct: CORE_BUCKET_PCT,
      peripheralSharePct: PERIPHERAL_BUCKET_PCT,
    },
    bucketPoints: fields.bucketPoints || { core: {}, peripheral: {} },
    createdAt: originatedAt,
    contributions: fields.contributions || {},
    contributorNames: fields.contributorNames || {},
  };
}

function buildProjectBucketsMap(state) {
  const map = {};
  for (const proj of state?.projects || []) {
    ensureProjectBuckets(proj);
    map[proj.id] = computeBucketStats(proj);
  }
  return map;
}

function projectClientState(state, userId) {
  const projected = projectStateForUser(state, userId);
  const activeUser = state.users?.[userId] || state.users?.[FOUNDER_USER_ID];
  if (activeUser && projected.player) {
    projected.player.tutorialBonusClaimed = Boolean(activeUser.tutorialBonusClaimed);
    projected.player.title = activeUser.title || '';
    projected.player.unlockedTitles = Array.isArray(activeUser.unlockedTitles) ? activeUser.unlockedTitles : [];
  }
  projected.reviewQueue = Array.isArray(state.reviewQueue) ? state.reviewQueue : [];
  projected.reviewHistory = Array.isArray(state.reviewHistory) ? state.reviewHistory : [];
  projected.antiSlopTreasuryGold = Number(state.antiSlopTreasuryGold || 0);
  projected.projectBuckets = buildProjectBucketsMap(state);
  projected.settings = {
    ...(projected.settings || {}),
    strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
    peerReviewRequired: Boolean(state.settings?.peerReviewRequired),
    liveProductionMode: Boolean(state.settings?.liveProductionMode),
  };
  return projected;
}

function distributeProjectRevenue(state, activeUser, project, grossRevenueUsd, label) {
  ensureProjectBuckets(project);
  const gross = round2(grossRevenueUsd);
  const sparkPct = Number.isFinite(Number(project.sparkRoyaltyPct))
    ? Number(project.sparkRoyaltyPct)
    : REVENUE_SPLIT.originatorSparkPct;
  const platformPct = Number.isFinite(Number(project.platformSharePct))
    ? Number(project.platformSharePct)
    : REVENUE_SPLIT.platformPct;

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
        coreUsd: 0,
        peripheralUsd: 0,
        totalUsd: 0,
        points: 0,
        corePoints: 0,
        peripheralPoints: 0,
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

  // 2) 85% Merit Pool with Anti-Dilution 70/30 Core vs Peripheral Bucket Caps
  const meritSplit = computeAntiDilutionMeritSplit(project, meritPoolUsd);
  const splitUsers = Object.values(meritSplit.detailsByUserId || {})
    .filter((d) => d.points > 0)
    .sort((a, b) => (b.totalUsd !== a.totalUsd ? b.totalUsd - a.totalUsd : b.points - a.points));

  if (splitUsers.length > 0) {
    for (const detail of splitUsers) {
      const userId = detail.userId;
      const amt = round2(meritSplit.payoutsByUserId[userId] || 0);
      const userName = (project.contributorNames && project.contributorNames[userId])
        || state.users?.[userId]?.displayName
        || userId;
      const meritRatioPct = meritPoolUsd > 0 ? round2((amt / meritPoolUsd) * 100) : 0;
      const sharePct = gross > 0 ? round2((amt / gross) * 100) : 0;

      const cp = {
        userId,
        userName,
        role: 'contributor',
        points: detail.points,
        corePoints: detail.corePoints,
        peripheralPoints: detail.peripheralPoints,
        coreUsd: detail.coreUsd,
        peripheralUsd: detail.peripheralUsd,
        meritRatioPct,
        sharePct,
        amountUsd: amt,
      };
      payouts.push(cp);

      const bucket = ensureUserBucket(userId, userName);
      bucket.meritUsd = round2(bucket.meritUsd + amt);
      bucket.coreUsd = round2(bucket.coreUsd + detail.coreUsd);
      bucket.peripheralUsd = round2(bucket.peripheralUsd + detail.peripheralUsd);
      bucket.points = detail.points;
      bucket.corePoints = detail.corePoints;
      bucket.peripheralPoints = detail.peripheralPoints;
      bucket.meritRatioPct = meritRatioPct;
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
    corePoolUsd: meritSplit.corePoolUsd,
    peripheralPoolUsd: meritSplit.peripheralPoolUsd,
    bucketCaps: {
      core: meritSplit.bucketCaps.core,
      peripheral: meritSplit.bucketCaps.peripheral,
    },
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

  function reapExpiredTaskClaimsInState(s, nowMs = Date.now()) {
    const expired = [];
    for (const task of s.tasks || []) {
      if (!task || task.status !== 'in_progress' || !task.claimExpiresAt) continue;
      const expMs = Date.parse(task.claimExpiresAt);
      if (!Number.isFinite(expMs) || nowMs < expMs) continue;

      const prevClaimerId = task.claimedBy || task.stakedByUserId || null;
      const prevWorkerId = task.assignedWorkerId || null;
      const staked = Number(task.stakedGold || 0);
      const forfeitedStakeGold = staked > 0 ? Math.floor(staked / 2) : 0;
      const refundedStakeGold = staked - forfeitedStakeGold;

      if (forfeitedStakeGold > 0) {
        s.antiSlopTreasuryGold = Number(s.antiSlopTreasuryGold || 0) + forfeitedStakeGold;
      }
      const claimer = prevClaimerId ? s.users?.[prevClaimerId] : null;
      if (claimer) {
        if (refundedStakeGold > 0) claimer.gold = Number(claimer.gold || 0) + refundedStakeGold;
        claimer.reputation = Math.max(0, Number(claimer.reputation ?? 100) - EXPIRED_CLAIM_REPUTATION_PENALTY);
        syncUserLeaderboard(s, claimer);
      }

      if (prevWorkerId) {
        const cross = findWorkerAcrossUsers(s, prevWorkerId);
        if (cross?.worker && cross.worker.currentTaskId === task.id) {
          cross.worker.status = 'idle';
          cross.worker.currentTaskId = null;
          cross.worker.currentProjectId = null;
          cross.worker.currentZone = 'lounge';
          cross.worker.lastMessage = '認領超時已自動釋放任務，請記得及時交卷或主動放棄！';
        }
      }

      task.status = 'open';
      task.assignedWorkerId = null;
      task.claimedBy = null;
      task.claimedAt = null;
      task.claimExpiresAt = null;
      task.stakedGold = 0;
      task.stakedByUserId = null;

      pushActivity(s, {
        type: 'release',
        icon: '⏰',
        message: `任務《${task.title}》認領逾時未交付，系統已自動釋放回任務板（${forfeitedStakeGold > 0 ? `扣除 50% 押金 ${forfeitedStakeGold}G、退還 ${refundedStakeGold}G，` : ''}信譽 -${EXPIRED_CLAIM_REPUTATION_PENALTY}）`,
        projectId: task.projectId,
        taskId: task.id,
      });

      expired.push({
        taskId: task.id,
        title: task.title,
        claimerId: prevClaimerId,
        forfeitedStakeGold,
        refundedStakeGold,
      });
    }
    return expired;
  }

  async function ensureFreshTaskLeases() {
    const snap = await store.load();
    const nowMs = Date.now();
    const hasExpired = (snap.tasks || []).some(
      (t) => t && t.status === 'in_progress' && t.claimExpiresAt && nowMs >= Date.parse(t.claimExpiresAt),
    );
    if (!hasExpired) return [];
    const { state, result } = await store.mutate((s) => {
      ensureStateSchema(s);
      return reapExpiredTaskClaimsInState(s, Date.now());
    });
    if (result && result.length > 0) {
      for (const exp of result) {
        store.appendAudit(
          'task_claim_expired',
          `Auto-released expired claim on ${exp.taskId} (claimer=${exp.claimerId || 'unknown'}, forfeited=${exp.forfeitedStakeGold}G)`,
        );
      }
      sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
    }
    return result || [];
  }
  const feedbackRateBuckets = new Map();
  const feedbackRateMax = options.feedbackRateLimitMax !== undefined
    ? Number(options.feedbackRateLimitMax)
    : 8;
  const feedbackRateWindowMs = Number(options.feedbackRateWindowMs) > 0
    ? Number(options.feedbackRateWindowMs)
    : 10 * 60_000;
  let rateLimitBlockedCount = 0;

  function checkFeedbackRateLimit(req, res) {
    if (!Number.isFinite(feedbackRateMax) || feedbackRateMax <= 0) return true;
    const forwarded = typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : '';
    const clientKey = forwarded || req.socket?.remoteAddress || 'local';
    const now = Date.now();
    let bucket = feedbackRateBuckets.get(clientKey);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + feedbackRateWindowMs };
      feedbackRateBuckets.set(clientKey, bucket);
    }
    bucket.count += 1;
    if (bucket.count > feedbackRateMax) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      sendJson(res, 429, {
        ok: false,
        code: 'FEEDBACK_RATE_LIMITED',
        error: `意見提交過於頻繁，請於 ${retryAfterSec} 秒後再試`,
        retryAfterSec,
      });
      return false;
    }
    if (feedbackRateBuckets.size > 500) {
      for (const [k, b] of feedbackRateBuckets.entries()) {
        if (now >= b.resetAt) feedbackRateBuckets.delete(k);
      }
    }
    return true;
  }

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
      rateLimitBlockedCount += 1;
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
          dbDriver: store.driver,
          uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
          sseClients: sseHub.getClientCount(),
          githubOAuthEnabled: isGitHubOAuthEnabled(),
          googleOAuthEnabled: isGoogleOAuthEnabled(),
          timestamp: new Date().toISOString(),
        });
      }

      // Production Ops Metrics: GET /api/metrics
      if (pathname === '/api/metrics' && method === 'GET') {
        const state = await store.load();
        ensureStateSchema(state);
        const projects = state.projects || [];
        const tasks = state.tasks || [];
        const provenance = verifyProvenanceChain(projects);
        const memoryMb = round2(process.memoryUsage().rss / (1024 * 1024));

        return sendJson(res, 200, {
          ok: true,
          version: VERSION,
          dbDriver: store.driver,
          uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
          memoryMb,
          sseClients: sseHub.getClientCount(),
          usersCount: Object.keys(state.users || {}).length,
          projectsCount: projects.length,
          tasksOpen: tasks.filter((t) => t.status === 'open').length,
          tasksCompleted: tasks.filter((t) => t.status === 'completed').length,
          pendingReviewsCount: (state.reviewQueue || []).length,
          provenanceChainValid: provenance.valid,
          rateLimitBlockedCount,
          auditCount: store.getAuditCount(),
          timestamp: new Date().toISOString(),
        });
      }

      // Founder Admin Dashboard Data Overview: GET /api/admin/overview
      if (pathname === '/api/admin/overview' && method === 'GET') {
        const state = await store.load();
        ensureStateSchema(state);
        const ctx = getActiveUserContext(req, state);
        if (!isFounderAdmin(req, ctx)) {
          throw new HttpError(403, '僅限創始鎮長存取數據後臺（請使用鎮長 GitHub 帳號 roushan11111 登入）', {
            code: 'ADMIN_ONLY',
          });
        }

        const allUsers = Object.values(state.users || {});
        const nowMs = Date.now();
        const dayAgoMs = nowMs - 24 * 60 * 60 * 1000;

        const realUsers = allUsers.filter((u) => u.id !== FOUNDER_USER_ID && u.authMode !== 'demo');
        const githubUsers = allUsers.filter((u) => u.authMode === 'github').length;
        const emailUsers = allUsers.filter((u) => u.authMode === 'email').length;
        const googleUsers = allUsers.filter((u) => u.authMode === 'google').length;
        const proUsers = allUsers.filter((u) => Boolean(u.isPro)).length;
        const newUsers24h = realUsers.filter((u) => u.createdAt && Date.parse(u.createdAt) >= dayAgoMs).length;

        const allWorkers = allUsers.flatMap((u) => Array.isArray(u.workers) ? u.workers : []);
        const workingWorkers = allWorkers.filter((w) => w.status === 'working').length;
        const cooldownWorkers = allWorkers.filter((w) => w.cooldownUntil && Date.parse(w.cooldownUntil) > nowMs).length;

        const projects = state.projects || [];
        const tasks = state.tasks || [];
        const devices = Object.values(state.deviceAuthorizations || {});
        const pendingDevices = devices.filter((d) => d.status === 'pending_review');
        const payouts = state.payouts || [];
        const pendingPayouts = payouts.filter((p) => p.status === 'pending');
        const pendingPayoutsUsd = round2(pendingPayouts.reduce((s, p) => s + (Number(p.amountUsd) || 0), 0));
        const feedbacks = state.feedbacks || [];
        const todayDateStr = new Date().toISOString().slice(0, 10);
        const unreadFeedbackCount = feedbacks.filter((f) => f.status === 'unread').length;
        const todayFeedbackCount = feedbacks.filter((f) => String(f.createdAt || '').slice(0, 10) === todayDateStr).length;
        const totalFeedbackCount = feedbacks.length;
        const reviewQueue = state.reviewQueue || [];
        const provenance = verifyProvenanceChain(projects);
        const backupMeta = await store.exportBackup();
        const memoryMb = round2(process.memoryUsage().rss / (1024 * 1024));

        const usersTable = allUsers
          .map((u) => ({
            id: u.id,
            username: u.username || u.id,
            displayName: u.displayName || u.username || u.id,
            email: u.email || '',
            authMode: u.authMode || 'demo',
            role: u.role || 'user',
            isDemo: u.id === FOUNDER_USER_ID && u.authMode === 'demo',
            isPro: Boolean(u.isPro),
            isVerifiedReviewer: Boolean(u.isVerifiedReviewer),
            gold: Number(u.gold || 0),
            usdBalance: round2(u.usdBalance || 0),
            reputation: Number(u.reputation ?? 100),
            completedTasks: Number(u.completedTasks || 0),
            totalContribution: Number(u.totalContribution || 0),
            workersCount: Array.isArray(u.workers) ? u.workers.length : 0,
            walletChain: u.walletChain || '',
            walletAddress: u.walletAddress || '',
            achievementsUnlocked: Array.isArray(u.achievements) ? u.achievements.filter((a) => a.unlocked).length : 0,
            createdAt: u.createdAt || state.createdAt,
          }))
          .sort((a, b) => {
            if (a.isDemo !== b.isDemo) return a.isDemo ? 1 : -1;
            return Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0);
          });

        return sendJson(res, 200, {
          ok: true,
          generatedAt: new Date().toISOString(),
          currentAdmin: {
            id: ctx.user.id,
            username: ctx.user.username,
            displayName: ctx.user.displayName,
            authMode: ctx.user.authMode,
          },
          summary: {
            totalUsers: allUsers.length,
            realRegisteredUsers: realUsers.length,
            githubUsers,
            emailUsers,
            googleUsers,
            proUsers,
            newUsers24h,
            totalWorkers: allWorkers.length,
            workingWorkers,
            cooldownWorkers,
            totalProjects: projects.length,
            votingProjects: projects.filter((p) => p.status === 'voting').length,
            buildingProjects: projects.filter((p) => p.status === 'building').length,
            launchedProjects: projects.filter((p) => p.status === 'launched').length,
            totalTasks: tasks.length,
            openTasks: tasks.filter((t) => t.status === 'open').length,
            inProgressTasks: tasks.filter((t) => t.status === 'in_progress').length,
            pendingReviewTasks: tasks.filter((t) => t.status === 'pending_review').length,
            completedTasks: tasks.filter((t) => t.status === 'completed').length,
            pendingDevicesCount: pendingDevices.length,
            totalDevicesCount: devices.length,
            pendingReviewsCount: reviewQueue.length,
            pendingPayoutsCount: pendingPayouts.length,
            pendingPayoutsUsd,
            unreadFeedbackCount,
            todayFeedbackCount,
            totalFeedbackCount,
            founderRevenue: state.founderRevenue,
            provenanceValid: provenance.valid,
            provenanceChainLength: provenance.chainLength,
            dbDriver: store.driver,
            memoryMb,
            uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
            sseClients: sseHub.getClientCount(),
            rateLimitBlockedCount,
          },
          users: usersTable,
          projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            shortName: p.shortName || p.name,
            status: p.status,
            progressPct: Number(p.progressPct || 0),
            totalRevenueUsd: round2(p.totalRevenueUsd || 0),
            bountyPoolUsd: round2(p.bountyPoolUsd || 0),
          })),
          paymentOrders: (state.paymentOrders || []).slice(0, 60),
          payouts: payouts.slice(0, 60),
          devices: devices.slice(0, 60).map((d) => ({
            code: d.code,
            deviceName: d.deviceName,
            os: d.os,
            cliTools: d.cliTools || [],
            status: d.status,
            userId: d.userId || null,
            userName: d.userName || '',
            workerName: d.workerName || '',
            createdAt: d.createdAt,
            approvedAt: d.approvedAt || null,
          })),
          redeemCodes: (state.redeemCodes || []).slice(0, 80),
          reviewQueue,
          auditLog: (backupMeta.recentAudit || []).slice(0, 80),
          settings: {
            strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
            peerReviewRequired: Boolean(state.settings?.peerReviewRequired),
            liveProductionMode: Boolean(state.settings?.liveProductionMode),
          },
        });
      }

      // Founder Admin One-Click Launch Clean Mode: POST /api/admin/launch-clean-mode
      if (pathname === '/api/admin/launch-clean-mode' && method === 'POST') {
        const { state, result } = await store.mutate((s) => {
          ensureStateSchema(s);
          const ctx = getActiveUserContext(req, s);
          if (!isFounderAdmin(req, ctx)) {
            throw new HttpError(403, '僅限創始鎮長切換正式營運模式（請使用鎮長 GitHub 帳號 roushan11111 登入）', {
              code: 'ADMIN_ONLY',
            });
          }

          s.settings.liveProductionMode = true;

          // 1. Clear all un-escrowed demo fake cash bounties on tasks
          let clearedBountiesCount = 0;
          for (const task of s.tasks || []) {
            if (!task || typeof task !== 'object') continue;
            if (Number(task.cashBountyUsd || 0) > 0 && !task.escrowFunded) {
              task.cashBountyUsd = 0;
              if (typeof task.title === 'string') {
                task.title = task.title.replace(/^\[\$\d+(?:\.\d+)?\s*(?:現金)?懸賞\]\s*/, '').trim();
              }
              clearedBountiesCount += 1;
            }
          }

          // 2. Clear un-escrowed demo project bounty pools & demo revenues
          for (const proj of s.projects || []) {
            if (!proj || typeof proj !== 'object') continue;
            if (!proj.escrowFunded) {
              proj.bountyPoolUsd = 0;
            }
            proj.totalRevenueUsd = 0;
            proj.distributedRevenueUsd = 0;
            if (proj.id === 'proj-i18n' && typeof proj.billboardText === 'string' && proj.billboardText.includes('$40/$25')) {
              proj.sponsoredBillboard = false;
              proj.billboardText = '';
            }
          }

          // 3. Reset demo platform revenue (all 4 streams + history) & dividend ledger
          s.founderRevenue = {
            bountyFeesUsd: 0,
            incubationCarryUsd: 0,
            billboardAdsUsd: 0,
            proSkinsUsd: 0,
            totalUsd: 0,
            history: [],
          };
          s.dividendLedger = [];

          // 4. Clear preset demo review queue items while preserving any real player submissions
          const DEMO_REVIEW_IDS = new Set(['rev-clean-01', 'rev-slop-01']);
          s.reviewQueue = (s.reviewQueue || []).filter((item) => item && !DEMO_REVIEW_IDS.has(item.id));

          // 5. Auto-revoke public demo redeem codes so strangers cannot claim free Pro in Live Mode
          let revokedDemoCodesCount = 0;
          const revokeTime = new Date().toISOString();
          for (const rc of s.redeemCodes || []) {
            if (rc && DEMO_REDEEM_CODES.has(String(rc.code || '').toUpperCase()) && !rc.used) {
              rc.used = true;
              rc.disabledByLiveMode = true;
              rc.usedByName = '正式營運模式自動停用';
              rc.usedAt = revokeTime;
              revokedDemoCodesCount += 1;
            }
          }

          // All registered real users in s.users (GitHub / Email / Google) are 100% preserved!
          pushActivity(s, {
            type: 'admin',
            icon: '🟢',
            message: `鎮長已啟動【正式營運模式】！已清空 ${clearedBountiesCount} 筆示範假現金懸賞、停用 ${revokedDemoCodesCount} 組公開測試卡密，完整保留全部真實註冊鎮民資料！`,
          });

          return {
            clearedBountiesCount,
            revokedDemoCodesCount,
            userId: ctx.userId,
            adminName: ctx.user.displayName || ctx.user.username || 'Founder',
          };
        });

        store.appendAudit(
          'launch_clean_mode',
          `Founder ${result.adminName} enabled liveProductionMode: cleared ${result.clearedBountiesCount} un-escrowed demo bounties, reset demo revenue/dividends & demo reviews`,
        );

        sseHub.broadcast('settings_updated', {
          strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
          peerReviewRequired: Boolean(state.settings?.peerReviewRequired),
          liveProductionMode: true,
        });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });

        return sendJson(res, 200, {
          ok: true,
          liveProductionMode: true,
          clearedBountiesCount: result.clearedBountiesCount,
          revokedDemoCodesCount: result.revokedDemoCodesCount,
          state: projectClientState(state, result.userId),
        });
      }

      // Tutorial Graduation Bonus: POST /api/tutorial/claim-bonus (one-time +100G + title per user)
      if (pathname === '/api/tutorial/claim-bonus' && method === 'POST') {
        const TUTORIAL_BONUS_GOLD = 100;
        const TUTORIAL_GRADUATE_TITLE = '🎓 創世見習鎮民';

        const { state, result } = await store.mutate((s) => {
          ensureStateSchema(s);
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;

          if (user.tutorialBonusClaimed) {
            throw new HttpError(409, '你已經領取過新手畢業禮包（+100G）囉！每個帳號限領一次。', {
              code: 'ALREADY_CLAIMED',
              alreadyClaimed: true,
            });
          }

          const claimedAt = new Date().toISOString();
          user.tutorialBonusClaimed = true;
          user.tutorialBonusClaimedAt = claimedAt;
          user.gold = Number(user.gold || 0) + TUTORIAL_BONUS_GOLD;
          if (!user.title) {
            user.title = TUTORIAL_GRADUATE_TITLE;
          }
          if (!Array.isArray(user.unlockedTitles)) {
            user.unlockedTitles = [];
          }
          if (!user.unlockedTitles.some((t) => t && t.id === 'town_graduate')) {
            user.unlockedTitles.push({
              id: 'town_graduate',
              name: TUTORIAL_GRADUATE_TITLE,
              unlockedAt: claimedAt,
            });
          }

          syncUserLeaderboard(s, user);
          pushActivity(s, {
            type: 'tutorial_bonus',
            icon: '🎓',
            message: `${user.displayName} 完成像素算力鎮新手教學，領取 +${TUTORIAL_BONUS_GOLD}G 創世新手禮包並解鎖稱號【${TUTORIAL_GRADUATE_TITLE}】！`,
          });

          return {
            user,
            bonusGold: TUTORIAL_BONUS_GOLD,
            unlockedTitle: TUTORIAL_GRADUATE_TITLE,
          };
        });

        store.appendAudit(
          'tutorial_bonus_claimed',
          `User ${result.user.displayName} (${result.user.id}) claimed +${result.bonusGold}G tutorial graduation bonus (${result.unlockedTitle})`,
        );

        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          bonusGold: result.bonusGold,
          goldAwarded: result.bonusGold,
          unlockedTitle: result.unlockedTitle,
          title: result.unlockedTitle,
          alreadyClaimed: false,
          playerGold: result.user.gold,
          state: projectClientState(state, result.user.id),
        });
      }

      // Founder Appoint / Revoke Verified Senior Reviewer: PATCH /api/admin/users/:id/reviewer
      const adminReviewerMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/reviewer$/);
      if (adminReviewerMatch && method === 'PATCH') {
        const targetUserId = decodeURIComponent(adminReviewerMatch[1]);
        const body = await parseJsonBody(req);
        const nextVal = Boolean(body?.isVerifiedReviewer);

        const { state, result } = await store.mutate((s) => {
          ensureStateSchema(s);
          const ctx = getActiveUserContext(req, s);
          if (!isFounderAdmin(req, ctx)) {
            throw new HttpError(403, '僅限創始鎮長授予或撤銷資深審閱官資格', { code: 'ADMIN_ONLY' });
          }
          const target = s.users?.[targetUserId];
          if (!target) {
            throw new HttpError(404, `找不到用戶：${targetUserId}`);
          }
          target.isVerifiedReviewer = nextVal;
          pushActivity(s, {
            type: 'admin',
            icon: nextVal ? '🎓' : '🔒',
            message: nextVal
              ? `鎮長已授予 ${target.displayName}【🎓 認證資深審閱官】資格！`
              : `鎮長已撤銷 ${target.displayName} 的認證審閱官資格。`,
          });
          return {
            targetId: target.id,
            targetName: target.displayName,
            isVerifiedReviewer: nextVal,
            adminName: ctx.user.displayName || ctx.user.username || 'Founder',
          };
        });

        store.appendAudit(
          'reviewer_badge_updated',
          `Founder ${result.adminName} set isVerifiedReviewer=${result.isVerifiedReviewer} for ${result.targetName} (${result.targetId})`,
        );
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, { ok: true, ...result });
      }

      // Admin SQLite Backup Export: GET /api/admin/export-backup
      if (pathname === '/api/admin/export-backup' && method === 'GET') {
        const state = await store.load();
        ensureStateSchema(state);
        const ctx = getActiveUserContext(req, state);
        if (!isFounderAdmin(req, ctx)) {
          throw new HttpError(403, '僅限創始鎮長匯出完整系統備份');
        }
        store.appendAudit('backup_export', `Founder ${ctx.user.displayName} exported full system backup`);
        const backup = await store.exportBackup();
        const dateTag = new Date().toISOString().slice(0, 10);
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="pixelcompute-backup-${dateTag}.json"`,
          'Cache-Control': 'no-store',
        });
        return res.end(JSON.stringify({ ok: true, ...backup }, null, 2));
      }

      // Public Daily Feedback / Suggestion Box: POST /api/feedback
      if (pathname === '/api/feedback' && method === 'POST') {
        if (!checkFeedbackRateLimit(req, res)) {
          return;
        }
        const body = await parseJsonBody(req);
        const VALID_CATS = new Set(['suggestion', 'bug', 'ui', 'other']);
        const rawCategory = String(body?.category || 'suggestion').trim().toLowerCase();
        const category = VALID_CATS.has(rawCategory) ? rawCategory : 'suggestion';

        const rawRating = body?.rating === undefined || body?.rating === null ? 5 : Number(body.rating);
        if (!Number.isInteger(rawRating) || rawRating < 1 || rawRating > 5) {
          throw new HttpError(400, '評分必須為 1 到 5 顆星的整數');
        }

        const message = sanitizeText(body?.message, 1000, { multiline: true });
        if (message.length < 2) {
          throw new HttpError(400, '請輸入至少 2 個字的建議或意見內容');
        }
        const contact = sanitizeText(body?.contact, 120);
        let pagePath = sanitizeText(body?.page, 120);
        if (!pagePath && typeof req.headers.referer === 'string') {
          try {
            pagePath = sanitizeText(new URL(req.headers.referer).pathname, 120);
          } catch {
            pagePath = '/';
          }
        }
        if (!pagePath) pagePath = '/app';

        const { result } = await store.mutate((s) => {
          ensureStateSchema(s);
          const ctx = getActiveUserContext(req, s);
          const isRealAuthed = Boolean(ctx.sessionId && !ctx.isGuestDemo);
          const now = new Date().toISOString();
          const guestName = sanitizeText(body?.userName, 32);

          const item = {
            id: uid('fb'),
            category,
            rating: rawRating,
            message,
            contact,
            page: pagePath,
            userId: isRealAuthed ? ctx.user.id : (ctx.sessionId ? ctx.user.id : null),
            userName: isRealAuthed
              ? (ctx.user.displayName || ctx.user.username)
              : (guestName || '訪客鎮民 (Guest)'),
            authMode: isRealAuthed ? (ctx.user.authMode || 'email') : (ctx.sessionId ? 'demo' : 'guest'),
            status: 'unread',
            founderNote: '',
            createdAt: now,
            updatedAt: now,
          };

          s.feedbacks.unshift(item);
          if (s.feedbacks.length > 500) {
            s.feedbacks.length = 500;
          }

          const todayStr = now.slice(0, 10);
          const unreadCount = s.feedbacks.filter((f) => f.status === 'unread').length;
          const todayCount = s.feedbacks.filter((f) => String(f.createdAt || '').slice(0, 10) === todayStr).length;
          return { item, unreadCount, todayCount };
        });

        store.appendAudit(
          'feedback_submitted',
          `[${result.item.category} ★${result.item.rating}] ${result.item.userName} (${result.item.page}): ${result.item.message.slice(0, 80)}`,
        );

        // Broadcast public preview via SSE (strictly omit private contact field)
        sseHub.broadcast('feedback_received', {
          id: result.item.id,
          category: result.item.category,
          rating: result.item.rating,
          userName: result.item.userName,
          authMode: result.item.authMode,
          page: result.item.page,
          preview: result.item.message.slice(0, 80),
          createdAt: result.item.createdAt,
          unreadCount: result.unreadCount,
          todayCount: result.todayCount,
        });

        return sendJson(res, 201, {
          ok: true,
          feedback: {
            id: result.item.id,
            category: result.item.category,
            rating: result.item.rating,
            status: result.item.status,
            createdAt: result.item.createdAt,
          },
        });
      }

      // Founder Daily Feedback Inbox: GET /api/admin/feedback
      if (pathname === '/api/admin/feedback' && method === 'GET') {
        const state = await store.load();
        ensureStateSchema(state);
        const ctx = getActiveUserContext(req, state);
        if (!isFounderAdmin(req, ctx)) {
          throw new HttpError(403, '僅限創始鎮長閱讀每日意見箱', { code: 'ADMIN_ONLY' });
        }

        const all = state.feedbacks || [];
        const todayDate = new Date().toISOString().slice(0, 10);
        const statusFilter = String(url.searchParams.get('status') || '').trim().toLowerCase();
        const dateFilter = String(url.searchParams.get('date') || '').trim();
        const categoryFilter = String(url.searchParams.get('category') || '').trim().toLowerCase();

        const filtered = all.filter((f) => {
          if (statusFilter && statusFilter !== 'all' && f.status !== statusFilter) return false;
          if (dateFilter && String(f.createdAt || '').slice(0, 10) !== dateFilter) return false;
          if (categoryFilter && categoryFilter !== 'all' && f.category !== categoryFilter) return false;
          return true;
        });

        return sendJson(res, 200, {
          ok: true,
          todayDate,
          todayCount: all.filter((f) => String(f.createdAt || '').slice(0, 10) === todayDate).length,
          unreadCount: all.filter((f) => f.status === 'unread').length,
          totalCount: all.length,
          feedbacks: filtered.slice(0, 200),
        });
      }

      // Founder Update Feedback Status / Note: PATCH /api/admin/feedback/:id
      const adminFeedbackMatch = pathname.match(/^\/api\/admin\/feedback\/([^/]+)$/);
      if (adminFeedbackMatch && method === 'PATCH') {
        const feedbackId = decodeURIComponent(adminFeedbackMatch[1]);
        const body = await parseJsonBody(req);
        const VALID_STATUS = new Set(['unread', 'read', 'planned', 'resolved']);
        if (body?.status !== undefined && !VALID_STATUS.has(String(body.status))) {
          throw new HttpError(400, '無效的意見狀態（僅支援 unread / read / planned / resolved）');
        }

        const { result } = await store.mutate((s) => {
          ensureStateSchema(s);
          const ctx = getActiveUserContext(req, s);
          if (!isFounderAdmin(req, ctx)) {
            throw new HttpError(403, '僅限創始鎮長更新意見狀態', { code: 'ADMIN_ONLY' });
          }

          const item = (s.feedbacks || []).find((f) => f.id === feedbackId);
          if (!item) {
            throw new HttpError(404, `找不到意見紀錄：${feedbackId}`);
          }

          if (body?.status !== undefined) {
            item.status = String(body.status);
          }
          if (typeof body?.founderNote === 'string') {
            item.founderNote = sanitizeText(body.founderNote, 500, { multiline: true });
          }
          item.updatedAt = new Date().toISOString();

          const todayStr = item.updatedAt.slice(0, 10);
          return {
            item,
            adminName: ctx.user.displayName || ctx.user.username || 'Founder',
            unreadCount: s.feedbacks.filter((f) => f.status === 'unread').length,
            todayCount: s.feedbacks.filter((f) => String(f.createdAt || '').slice(0, 10) === todayStr).length,
            totalCount: s.feedbacks.length,
          };
        });

        store.appendAudit(
          'feedback_updated',
          `Founder ${result.adminName} marked feedback ${result.item.id} as ${result.item.status}`,
        );
        sseHub.broadcast('feedback_updated', {
          id: result.item.id,
          status: result.item.status,
          updatedAt: result.item.updatedAt,
          unreadCount: result.unreadCount,
        });

        return sendJson(res, 200, {
          ok: true,
          feedback: result.item,
          unreadCount: result.unreadCount,
          todayCount: result.todayCount,
          totalCount: result.totalCount,
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
        await ensureFreshTaskLeases();
        const state = await store.load();
        const ctx = getActiveUserContext(req, state);
        const user = sanitizeUserForClient(ctx.user);
        const projected = projectClientState(state, ctx.userId);
        const isAdmin = isFounderAdmin(req, ctx);
        const reviewerEligibility = isAdmin
          ? {
            eligible: true,
            code: null,
            tier: 'founder',
            tierLabel: '👑 創始鎮長審閱權',
            reason: '創始鎮長擁有全域最高審閱權限',
            requirements: { minReputation: REVIEWER_MIN_REPUTATION, minCorePoints: REVIEWER_MIN_CORE_POINTS },
          }
          : evaluateReviewerEligibility(ctx.user, null, null, state.projects);
        const { pendingDevices, allDevices } = getAdminDevicesData(state);
        const peerReviewRequired = Boolean(state.settings?.peerReviewRequired);
        const liveProductionMode = Boolean(state.settings?.liveProductionMode);

        return sendJson(res, 200, {
          ok: true,
          user,
          reviewerEligibility,
          state: projected,
          settings: {
            strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
            peerReviewRequired,
            liveProductionMode,
          },
          shopItems: SHOP_ITEMS,
          workerTemplates: WORKER_TEMPLATES,
          paymentProducts: Object.values(PAYMENT_PRODUCTS),
          config: {
            githubOAuthEnabled: isGitHubOAuthEnabled(),
            googleOAuthEnabled: isGoogleOAuthEnabled(),
            strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
            peerReviewRequired,
            liveProductionMode,
            version: VERSION,
            platformFeePct: PLATFORM_BOUNTY_FEE_PCT,
            billboardPriceUsd: BILLBOARD_PRICE_USD,
            revenueSplit: REVENUE_SPLIT,
            governance: {
              coreBucketPct: CORE_BUCKET_PCT,
              peripheralBucketPct: PERIPHERAL_BUCKET_PCT,
              reviewerRewardGold: REVIEWER_REWARD_GOLD,
              reviewerRewardPoints: REVIEWER_REWARD_POINTS,
              slopStrikeLimit: SLOP_STRIKE_LIMIT,
              defaultCooldownSec: DEFAULT_COOLDOWN_SEC,
              defaultMinReputation: DEFAULT_MIN_REPUTATION,
            },
          },
          authConfig: {
            githubOAuthEnabled: isGitHubOAuthEnabled(),
            googleOAuthEnabled: isGoogleOAuthEnabled(),
            strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
            peerReviewRequired,
            liveProductionMode,
          },
          paymentConfig: getPaymentConfig(),
          adminData: isAdmin
            ? {
              isAdmin: true,
              strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
              peerReviewRequired,
              liveProductionMode,
              pendingDevices,
              allDevices,
              redeemCodes: state.redeemCodes || [],
              payouts: state.payouts || [],
            }
            : {
              isAdmin: false,
              strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
              peerReviewRequired,
              liveProductionMode,
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
        return sendJson(res, 200, { ok: true, state: projectClientState(state, ctx.userId) });
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

      // Personal Profile & Project History Center: GET /api/profile/me
      if (pathname === '/api/profile/me' && method === 'GET') {
        const state = await store.load();
        ensureStateSchema(state);
        const ctx = getActiveUserContext(req, state);
        const user = ctx.user;
        const userId = user.id;
        const projects = state.projects || [];
        const tasks = state.tasks || [];
        const projectMap = new Map(projects.map((p) => [p.id, p]));

        // Compute per-project task counts & earnings for this user
        const tasksByProject = new Map();
        for (const tk of tasks) {
          const isMine = tk.claimedBy === userId
            || tk.submission?.submittedByUserId === userId
            || tk.stakedByUserId === userId;
          if (!isMine) continue;
          if (!tasksByProject.has(tk.projectId)) {
            tasksByProject.set(tk.projectId, { claimed: 0, completed: 0, pendingReview: 0 });
          }
          const stat = tasksByProject.get(tk.projectId);
          stat.claimed += 1;
          if (tk.status === 'completed') stat.completed += 1;
          else if (tk.status === 'pending_review') stat.pendingReview += 1;
        }

        // Compute per-project dividend earnings for this user
        const dividendByProject = new Map();
        for (const d of state.dividendLedger || []) {
          const mine = (d.payoutsByUser && d.payoutsByUser[userId])
            || (Array.isArray(d.payouts)
              ? d.payouts
                .filter((p) => p.userId === userId)
                .reduce((acc, p) => {
                  acc.totalUsd = round2(acc.totalUsd + (Number(p.amountUsd) || 0));
                  return acc;
                }, { totalUsd: 0 })
              : null);
          if (mine && Number(mine.totalUsd) > 0) {
            dividendByProject.set(
              d.projectId,
              round2((dividendByProject.get(d.projectId) || 0) + Number(mine.totalUsd)),
            );
          }
        }

        const buildProjectSummary = (proj) => {
          ensureProjectBuckets(proj);
          const isOriginator = proj.originatorId === userId || proj.creatorId === userId;
          const isCoBuilder = Array.isArray(proj.coBuilders) && proj.coBuilders.some((b) => b.userId === userId);
          const myCorePoints = Number(proj.bucketPoints?.core?.[userId] || 0);
          const myPeripheralPoints = Number(proj.bucketPoints?.peripheral?.[userId] || 0);
          const myPoints = Math.max(
            Number(proj.contributions?.[userId] || 0),
            myCorePoints + myPeripheralPoints,
          );
          const taskStats = tasksByProject.get(proj.id) || { claimed: 0, completed: 0, pendingReview: 0 };
          const myRole = isOriginator
            ? 'originator'
            : (myPoints > 0 || taskStats.completed > 0)
              ? 'contributor'
              : isCoBuilder
                ? 'co_builder'
                : 'participant';
          return {
            id: proj.id,
            name: proj.name,
            shortName: proj.shortName || proj.name,
            tagline: proj.tagline || '',
            status: proj.status,
            votes: Number(proj.votes || 0),
            votesRequired: Number(proj.votesRequired || 5),
            progressPct: Number(proj.progressPct || 0),
            totalRevenueUsd: round2(proj.totalRevenueUsd || 0),
            bountyPoolUsd: round2(proj.bountyPoolUsd || 0),
            ideaHash: proj.ideaHash || '',
            originatedAt: proj.originatedAt || proj.createdAt || '',
            originatorId: proj.originatorId || proj.creatorId || '',
            originatorName: proj.originatorName || proj.creatorName || '',
            coBuildersCount: Array.isArray(proj.coBuilders) ? proj.coBuilders.length : 1,
            myRole,
            isOriginator,
            isCoBuilder,
            myPoints,
            myCorePoints,
            myPeripheralPoints,
            myTasksCompleted: taskStats.completed,
            myTasksClaimed: taskStats.claimed,
            myDividendUsd: round2(dividendByProject.get(proj.id) || 0),
          };
        };

        const publishedProjects = projects
          .filter((p) => p.originatorId === userId || p.creatorId === userId)
          .map(buildProjectSummary)
          .sort((a, b) => Date.parse(b.originatedAt || 0) - Date.parse(a.originatedAt || 0));

        const participatedProjects = projects
          .filter((p) => {
            ensureProjectBuckets(p);
            const isOrig = p.originatorId === userId || p.creatorId === userId;
            const isCo = Array.isArray(p.coBuilders) && p.coBuilders.some((b) => b.userId === userId);
            const hasPts = Number(p.contributions?.[userId] || 0) > 0
              || Number(p.bucketPoints?.core?.[userId] || 0) > 0
              || Number(p.bucketPoints?.peripheral?.[userId] || 0) > 0;
            const hasTasks = tasksByProject.has(p.id);
            return isOrig || isCo || hasPts || hasTasks;
          })
          .map(buildProjectSummary)
          .sort((a, b) => (b.myPoints - a.myPoints) || (Date.parse(b.originatedAt || 0) - Date.parse(a.originatedAt || 0)));

        // Build chronological project history timeline for this user
        const history = [];

        for (const p of publishedProjects) {
          history.push({
            id: `hist-orig-${p.id}`,
            type: 'originated',
            timestamp: p.originatedAt || state.createdAt,
            projectId: p.id,
            projectName: p.shortName || p.name,
            title: p.name,
            status: p.status,
            ideaHash: p.ideaHash,
            goldDelta: 0,
            pointsDelta: 0,
            usdDelta: 0,
          });
        }

        for (const c of state.contributionLedger || []) {
          if (c.userId !== userId) continue;
          const proj = projectMap.get(c.projectId);
          history.push({
            id: c.id || `hist-contrib-${c.taskId}-${c.timestamp}`,
            type: 'task_completed',
            timestamp: c.timestamp || state.updatedAt,
            projectId: c.projectId,
            projectName: proj?.shortName || c.projectName || c.projectId,
            taskId: c.taskId,
            title: c.taskTitle || c.taskId,
            poolBucket: c.poolBucket || 'peripheral',
            verificationScore: Number(c.verificationScore || 0),
            goldDelta: Number(c.gold || 0),
            pointsDelta: Number(c.points || 0),
            usdDelta: round2(c.bountyNetUsd || 0),
          });
        }

        for (const d of state.dividendLedger || []) {
          const userPayout = d.payoutsByUser?.[userId];
          const amt = userPayout
            ? round2(userPayout.totalUsd || 0)
            : round2(
              (Array.isArray(d.payouts) ? d.payouts : [])
                .filter((p) => p.userId === userId)
                .reduce((sum, p) => sum + (Number(p.amountUsd) || 0), 0),
            );
          if (amt <= 0) continue;
          const proj = projectMap.get(d.projectId);
          history.push({
            id: d.id || `hist-div-${d.projectId}-${d.timestamp}`,
            type: 'dividend',
            timestamp: d.timestamp || state.updatedAt,
            projectId: d.projectId,
            projectName: proj?.shortName || d.projectName || d.projectId,
            title: d.label || '項目營收分紅',
            sparkUsd: round2(userPayout?.sparkUsd || 0),
            meritUsd: round2(userPayout?.meritUsd || 0),
            goldDelta: 0,
            pointsDelta: 0,
            usdDelta: amt,
          });
        }

        for (const pay of state.payouts || []) {
          if (pay.userId !== userId) continue;
          history.push({
            id: pay.id,
            type: 'payout',
            timestamp: pay.paidAt || pay.createdAt || state.updatedAt,
            projectId: null,
            projectName: `${String(pay.chain || '').toUpperCase()} · ${pay.token || 'USDC'}`,
            title: `${pay.token || 'USDC'} (${String(pay.chain || '').toUpperCase()})`,
            status: pay.status,
            txHash: pay.txHash || null,
            goldDelta: 0,
            pointsDelta: 0,
            usdDelta: -round2(pay.amountUsd || 0),
          });
        }

        history.sort((a, b) => Date.parse(b.timestamp || 0) - Date.parse(a.timestamp || 0));

        const achievements = Array.isArray(user.achievements) ? user.achievements : [];
        return sendJson(res, 200, {
          ok: true,
          profile: {
            id: user.id,
            username: user.username || user.id,
            displayName: user.displayName || user.username || user.id,
            email: user.email || '',
            authMode: user.authMode || 'demo',
            isAuthenticated: Boolean(ctx.isAuthenticated),
            role: user.role || 'user',
            isFounderAdmin: isFounderAdmin(req, ctx),
            isPro: Boolean(user.isPro),
            title: user.title || '',
            unlockedTitles: Array.isArray(user.unlockedTitles) ? user.unlockedTitles : [],
            gold: Number(user.gold || 0),
            usdBalance: round2(user.usdBalance || 0),
            reputation: Number(user.reputation ?? 100),
            completedTasks: Number(user.completedTasks || 0),
            totalContribution: Number(user.totalContribution || 0),
            workersCount: Array.isArray(user.workers) ? user.workers.length : 0,
            walletChain: user.walletChain || '',
            walletAddress: user.walletAddress || '',
            achievementsUnlocked: achievements.filter((a) => a.unlocked).length,
            achievementsTotal: achievements.length,
            createdAt: user.createdAt || state.createdAt,
          },
          publishedProjects,
          participatedProjects,
          projectHistory: history.slice(0, 50),
        });
      }

      // Personal Profile Update: PATCH /api/profile/me
      if (pathname === '/api/profile/me' && method === 'PATCH') {
        const body = await parseJsonBody(req);
        const { state, result } = await store.mutate((s) => {
          ensureStateSchema(s);
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;

          if (typeof body?.displayName === 'string') {
            const cleanName = sanitizeText(body.displayName, 32);
            if (cleanName.length < 2) {
              throw new HttpError(400, '顯示暱稱至少需要 2 個字元');
            }
            user.displayName = cleanName;
            // Sync name on projects originated/co-built by this user
            for (const p of s.projects || []) {
              if (p.originatorId === user.id) p.originatorName = cleanName;
              if (p.creatorId === user.id) p.creatorName = cleanName;
              if (p.contributorNames && p.contributorNames[user.id]) {
                p.contributorNames[user.id] = cleanName;
              }
              if (Array.isArray(p.coBuilders)) {
                for (const b of p.coBuilders) {
                  if (b.userId === user.id) b.displayName = cleanName;
                }
              }
            }
          }

          if (typeof body?.title === 'string') {
            const requestedTitle = sanitizeText(body.title, 32);
            const allowedTitles = new Set((user.unlockedTitles || []).map((t) => t?.name).filter(Boolean));
            if (requestedTitle === '' || allowedTitles.has(requestedTitle)) {
              user.title = requestedTitle;
            } else {
              throw new HttpError(400, '尚未解鎖此稱號');
            }
          }

          syncUserLeaderboard(s, user);
          return { user };
        });

        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          user: sanitizeUserForClient(result.user),
          state: projectClientState(state, result.user.id),
        });
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
      if (pathname === '/api/webhooks/afdian' && method === 'POST') {
        const rawBody = await readRawBody(req);
        return await handleAfdianWebhook(req, res, rawBody, store, sseHub);
      }

      // GitHub Webhook Auto-Settlement: POST /api/webhooks/github
      if (pathname === '/api/webhooks/github' && method === 'POST') {
        const rawBody = await readRawBody(req);
        const webhookSecret = options.githubWebhookSecret !== undefined
          ? String(options.githubWebhookSecret || '')
          : String(process.env.GITHUB_WEBHOOK_SECRET || '');

        if (webhookSecret) {
          const sigHeader = req.headers['x-hub-signature-256'];
          if (!verifyGitHubWebhookSignature(rawBody, sigHeader, webhookSecret)) {
            store.appendAudit('github_webhook_rejected', 'Rejected GitHub webhook with invalid X-Hub-Signature-256');
            return sendJson(res, 401, {
              ok: false,
              error: 'GitHub Webhook 簽名驗證失敗（無效的 X-Hub-Signature-256）',
            });
          }
        }

        let payload;
        try {
          payload = rawBody.trim() ? JSON.parse(rawBody) : {};
        } catch {
          throw new HttpError(400, '無效的 GitHub Webhook JSON 內容');
        }

        const ghEvent = String(req.headers['x-github-event'] || (payload.pull_request ? 'pull_request' : '')).toLowerCase();
        if (ghEvent === 'ping') {
          store.appendAudit('github_webhook_ping', `GitHub webhook ping received (zen: ${sanitizeText(payload.zen || '', 60)})`);
          return sendJson(res, 200, { ok: true, event: 'ping', pong: true });
        }

        if (ghEvent !== 'pull_request') {
          return sendJson(res, 200, {
            ok: true,
            settled: false,
            ignored: true,
            event: ghEvent || 'unknown',
            reason: '僅處理 pull_request merged 事件',
          });
        }

        const pr = payload.pull_request || {};
        if (payload.action !== 'closed' || pr.merged !== true) {
          return sendJson(res, 200, {
            ok: true,
            settled: false,
            ignored: true,
            action: payload.action || null,
            merged: Boolean(pr.merged),
            reason: 'PR 尚未合併（需 action=closed 且 merged=true）',
          });
        }

        const prTitle = sanitizeText(pr.title || '', 200);
        const prBody = sanitizeText(pr.body || '', 4000, { multiline: true });
        const prUrl = sanitizeText(pr.html_url || '', 240);
        const prNumber = Number(pr.number) || null;
        const prAuthor = sanitizeText(pr.user?.login || payload.sender?.login || 'github-contributor', 64);

        const { state, result } = await store.mutate((s) => {
          ensureStateSchema(s);

          // 1) Match task by explicit `task-<id>` reference in PR title or body (e.g. "Fixes #task-meta-pr")
          const searchText = `${prTitle}\n${prBody}`;
          const taskIdMatches = [...searchText.matchAll(/\b(task-[a-z0-9][a-z0-9_-]*)/gi)].map((m) => m[1].toLowerCase());
          let task = null;
          for (const candidateId of taskIdMatches) {
            const found = (s.tasks || []).find((t) => String(t.id || '').toLowerCase() === candidateId);
            if (found) {
              task = found;
              break;
            }
          }

          // 2) Fallback: match by claimed/submitted PR URL on tasks or reviewQueue
          const normPrUrl = normalizeUrlForMatch(prUrl);
          if (!task && normPrUrl) {
            task = (s.tasks || []).find((t) => (
              normalizeUrlForMatch(t.submission?.prUrl) === normPrUrl
              || normalizeUrlForMatch(t.prUrl) === normPrUrl
              || normalizeUrlForMatch(t.claimedPrUrl) === normPrUrl
            )) || null;
          }
          if (!task && normPrUrl) {
            const matchedReview = (s.reviewQueue || []).find(
              (item) => normalizeUrlForMatch(item.prUrl) === normPrUrl,
            );
            if (matchedReview) {
              task = (s.tasks || []).find((t) => t.id === matchedReview.taskId) || null;
            }
          }

          if (!task) {
            return { settled: false, matched: false };
          }
          if (task.status === 'completed') {
            return { settled: false, matched: true, alreadyCompleted: true, task };
          }

          // Remove any pending peer-review queue item for this task since PR is merged on GitHub
          const pendingIdx = (s.reviewQueue || []).findIndex((item) => item.taskId === task.id);
          let pendingReviewItem = null;
          if (pendingIdx !== -1) {
            pendingReviewItem = s.reviewQueue.splice(pendingIdx, 1)[0];
          }

          // Resolve contributor user: staker/claimer/submitter -> GitHub username match -> founder fallback
          let targetUser = null;
          const preferredUserIds = [
            task.stakedByUserId,
            task.claimedBy,
            task.submission?.submittedByUserId,
            pendingReviewItem?.submittedByUserId,
          ].filter(Boolean);
          for (const uidCandidate of preferredUserIds) {
            if (s.users[uidCandidate]) {
              targetUser = s.users[uidCandidate];
              break;
            }
          }
          if (!targetUser && prAuthor) {
            const lowerAuthor = prAuthor.toLowerCase();
            targetUser = Object.values(s.users).find(
              (u) => u && (
                String(u.username || '').toLowerCase() === lowerAuthor
                || String(u.displayName || '').toLowerCase() === lowerAuthor
              ),
            ) || null;
          }
          if (!targetUser) {
            targetUser = s.users[FOUNDER_USER_ID];
          }

          let worker = null;
          if (task.assignedWorkerId) {
            const foundWorker = findWorkerAcrossUsers(s, task.assignedWorkerId);
            if (foundWorker) {
              worker = foundWorker.worker;
            }
          }

          const now = new Date().toISOString();
          const poolBucket = 'core';
          const contributionPoints = Number(task.contributionPoints || 60);
          const gold = Number(task.goldReward || 240);
          const xp = Number(task.xpReward || 80);
          const bountyGrossUsd = round2(task.cashBountyUsd || 0);
          const platformFeeUsd = round2(bountyGrossUsd * (PLATFORM_BOUNTY_FEE_PCT / 100));
          const bountyNetUsd = round2(bountyGrossUsd - platformFeeUsd);

          // Refund frozen stake gold in full
          let refundedStakeGold = 0;
          const stakeAmt = Number(task.stakedGold || pendingReviewItem?.stakeGold || 0);
          if (stakeAmt > 0) {
            refundedStakeGold = stakeAmt;
            const staker = (task.stakedByUserId && s.users[task.stakedByUserId]) || targetUser;
            if (staker) {
              staker.gold += refundedStakeGold;
            }
          }

          const verification = {
            passed: true,
            score: 100,
            reason: `GitHub PR #${prNumber || '?'} 合併事件自動驗收通過`,
            checks: ['github_pr_merged', webhookSecret ? 'hmac_sha256_verified' : 'webhook_unauthenticated_dev'],
          };

          task.status = 'completed';
          task.poolBucket = poolBucket;
          task.submittedAt = now;
          task.stakedGold = 0;
          task.stakedByUserId = null;
          task.verification = verification;
          task.submission = {
            content: prBody || prTitle || `Merged GitHub PR #${prNumber || '?'}`,
            prUrl: prUrl || task.submission?.prUrl || null,
            notes: `由 GitHub Webhook PR #${prNumber || '?'} (${prAuthor}) 合併自動結算`,
            executionMode: 'github_webhook',
            tokensUsed: task.tokenCostEst || 0,
            submittedBy: targetUser.displayName,
            submittedByUserId: targetUser.id,
            submittedAt: now,
            githubAuthor: prAuthor,
            githubPrNumber: prNumber,
          };

          targetUser.gold += gold;
          targetUser.usdBalance = round2((targetUser.usdBalance || 0) + bountyNetUsd);
          targetUser.completedTasks += 1;
          targetUser.totalContribution += contributionPoints;
          targetUser.reputation += 2;

          if (platformFeeUsd > 0) {
            addFounderRevenueEntry(s, {
              stream: 'bounty_fee',
              label: `GitHub PR 合併自動結算懸賞《${task.title.slice(0, 22)}》10% 平臺費`,
              amountUsd: platformFeeUsd,
              projectId: task.projectId,
              taskId: task.id,
            });
          }

          let leveledUp = false;
          if (worker) {
            worker.slopStrikes = 0;
            worker.cooldownUntil = null;
            worker.stamina = Math.max(0, worker.stamina - (task.staminaCost || 0));
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
            worker.lastMessage = `GitHub PR #${prNumber || '?'} 已合併！自動結算 +${gold}G / +${contributionPoints} 核心點！`;
          }

          const proj = (s.projects || []).find((p) => p.id === task.projectId) || null;
          if (proj) {
            ensureProjectBuckets(proj);
            proj.progressPct = Math.min(100, (proj.progressPct || 0) + (task.progressWeight || 20));
            proj.contributions = proj.contributions || {};
            proj.contributorNames = proj.contributorNames || {};
            proj.contributions[targetUser.id] = (proj.contributions[targetUser.id] || 0) + contributionPoints;
            proj.bucketPoints.core[targetUser.id] = (proj.bucketPoints.core[targetUser.id] || 0) + contributionPoints;
            proj.contributorNames[targetUser.id] = targetUser.displayName;
            if (!Array.isArray(proj.coBuilders)) proj.coBuilders = [];
            if (!proj.coBuilders.some((b) => b.userId === targetUser.id)) {
              proj.coBuilders.push({
                userId: targetUser.id,
                username: targetUser.username || targetUser.id,
                displayName: targetUser.displayName,
                joinedAt: now,
              });
            }
          }

          s.contributionLedger.unshift({
            id: uid('contrib'),
            timestamp: now,
            projectId: task.projectId,
            projectName: proj?.name || task.projectId,
            taskId: task.id,
            taskTitle: task.title,
            userId: targetUser.id,
            userName: targetUser.displayName,
            workerId: worker?.id || null,
            workerName: worker?.name || `GitHub PR #${prNumber || '?'}`,
            poolBucket,
            points: contributionPoints,
            gold,
            bountyGrossUsd,
            bountyNetUsd,
            platformFeeUsd,
            verificationScore: 100,
          });
          if (s.contributionLedger.length > 100) {
            s.contributionLedger.length = 100;
          }

          syncUserLeaderboard(s, targetUser);

          const bountyText = bountyGrossUsd > 0
            ? `、實得懸賞 $${bountyNetUsd}（平臺費 $${platformFeeUsd}）`
            : '';
          pushActivity(s, {
            type: 'github_webhook_settled',
            icon: '🔀',
            message: `GitHub PR #${prNumber || '?'} 合併觸發自動結算：《${task.title}》→ ${targetUser.displayName} 獲得 +${gold}G、+${contributionPoints} 核心點${refundedStakeGold > 0 ? `、退還押金 ${refundedStakeGold}G` : ''}${bountyText}`,
            workerId: worker?.id || null,
            projectId: task.projectId,
            taskId: task.id,
          });

          const achCandidates = ['first_blood'];
          const completedTracks = new Set(
            s.tasks
              .filter((t) => t.status === 'completed' && (!t.submission?.submittedByUserId || t.submission.submittedByUserId === targetUser.id))
              .map((t) => t.track),
          );
          if (completedTracks.has('api_auto') && completedTracks.has('guild_bounty')) {
            achCandidates.push('dual_track_master');
          }
          const unlockedAchievements = unlockAchievements(s, targetUser, achCandidates);

          return {
            settled: true,
            matched: true,
            task,
            worker,
            project: proj,
            verification,
            rewards: {
              gold,
              contributionPoints,
              poolBucket,
              refundedStakeGold,
              xp,
              bountyGrossUsd,
              bountyNetUsd,
              platformFeeUsd,
              reputationDelta: 2,
              leveledUp,
            },
            unlockedAchievements,
            user: targetUser,
          };
        });

        if (!result.matched) {
          return sendJson(res, 200, {
            ok: true,
            settled: false,
            reason: 'PR 標題、內文或連結中未匹配到對應的 PixelCompute Town 任務 ID',
          });
        }
        if (result.alreadyCompleted) {
          return sendJson(res, 200, {
            ok: true,
            settled: false,
            alreadyCompleted: true,
            taskId: result.task.id,
            task: result.task,
          });
        }

        store.appendAudit(
          'github_webhook_settled',
          `PR #${prNumber || '?'} (${prAuthor}) auto-settled ${result.task.id}: +${result.rewards.contributionPoints} core pts, +${result.rewards.gold}G, refunded ${result.rewards.refundedStakeGold}G, fee $${result.rewards.platformFeeUsd}`,
        );

        sseHub.broadcast('task_completed', {
          source: 'github_webhook',
          task: result.task,
          worker: result.worker,
          project: result.project,
          verification: result.verification,
          rewards: result.rewards,
        });
        broadcastAchievements(sseHub, result.unlockedAchievements || [], result.user);
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });

        return sendJson(res, 200, {
          ok: true,
          settled: true,
          taskId: result.task.id,
          task: result.task,
          project: result.project,
          worker: result.worker,
          rewards: result.rewards,
          pr: {
            number: prNumber,
            url: prUrl || null,
            title: prTitle,
            author: prAuthor,
          },
          unlockedAchievements: result.unlockedAchievements || [],
        });
      }
      if (pathname === '/api/wallet/bind' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleWalletBind(req, res, body, store, sseHub);
      }
      if (pathname === '/api/payouts/request' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handlePayoutRequest(req, res, body, store, sseHub);
      }
      if (pathname === '/api/admin/payouts/batch' && method === 'GET') {
        return await handleAdminPayoutBatch(req, res, url, store);
      }
      if (pathname === '/api/admin/payouts/batch-mark-paid' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleAdminBatchMarkPaid(req, res, body, store, sseHub);
      }
      const adminOrderConfirmMatch = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/confirm$/);
      if (adminOrderConfirmMatch && method === 'POST') {
        const orderId = decodeURIComponent(adminOrderConfirmMatch[1]);
        const body = await parseJsonBody(req);
        return await handleAdminConfirmOrder(req, res, orderId, body, store, sseHub);
      }
      const adminRecordRevMatch = pathname.match(/^\/api\/admin\/projects\/([^/]+)\/record-revenue$/);
      if (adminRecordRevMatch && method === 'POST') {
        const projectId = decodeURIComponent(adminRecordRevMatch[1]);
        const body = await parseJsonBody(req);
        const amountUsd = round2(Number(body?.amountUsd));
        if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
          throw new HttpError(400, '請輸入大於 0 的真實入帳營收金額（USD）');
        }
        const note = sanitizeText(body?.note || body?.txHash || '鎮長核實真實產品營收', 80);

        const { state, result } = await store.mutate((s) => {
          ensureStateSchema(s);
          const ctx = getActiveUserContext(req, s);
          if (!isFounderAdmin(req, ctx)) {
            throw new HttpError(403, '僅限創始鎮長錄入項目真實營收並觸發分紅', { code: 'ADMIN_ONLY' });
          }
          const proj = (s.projects || []).find((p) => p.id === projectId);
          if (!proj) {
            throw new HttpError(404, `找不到項目：${projectId}`);
          }
          const dividend = distributeProjectRevenue(s, ctx.user, proj, amountUsd, note);
          pushActivity(s, {
            type: 'dividend',
            icon: '💰',
            message: `鎮長錄入《${proj.shortName || proj.name}》真實入帳營收 $${dividend.grossRevenueUsd}（${note}）！系統已自動按 5/95/0（核心70%/週邊≤30% · 平臺0抽成）發放分紅到各貢獻者帳戶！`,
            projectId: proj.id,
          });
          return { project: proj, dividend, user: ctx.user, note };
        });

        store.appendAudit(
          'real_revenue_recorded',
          `Founder ${result.user.displayName} recorded real revenue $${result.dividend.grossRevenueUsd} on ${result.project.id} (${result.note})`,
        );
        sseHub.broadcast('revenue_distributed', {
          project: result.project,
          dividend: result.dividend,
        });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          project: result.project,
          dividend: result.dividend,
          founderRevenue: state.founderRevenue,
          state: projectClientState(state, result.user.id),
        });
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
        const { state, result } = await store.mutate((s) => {
          ensureStateSchema(s);
          const ctx = getActiveUserContext(req, s);
          if (!isFounderAdmin(req, ctx)) {
            throw new HttpError(403, '僅限創始鎮長修改管理設定');
          }

          if (typeof body?.strictDeviceReview === 'boolean') {
            s.settings.strictDeviceReview = body.strictDeviceReview;
            pushActivity(s, {
              type: 'admin',
              icon: '🛡️',
              message: s.settings.strictDeviceReview
                ? '鎮長已開啟「嚴格裝置審核模式」：新綁定本機裝置需經人工核准'
                : '鎮長已切換為「自助即時核准模式」：新本機裝置確認後立即上線',
            });
          }

          if (typeof body?.peerReviewRequired === 'boolean') {
            s.settings.peerReviewRequired = body.peerReviewRequired;
            pushActivity(s, {
              type: 'admin',
              icon: '⚖️',
              message: s.settings.peerReviewRequired
                ? '鎮長已開啟「全局強制雙階段實幹審閱」：工會核心大單須經實幹審閱團核准方可合併記功'
                : '鎮長已關閉「全局強制雙階段審閱」：工會任務改為自由選擇是否進入審閱佇列',
            });
          }

          return {
            settings: {
              strictDeviceReview: Boolean(s.settings.strictDeviceReview),
              peerReviewRequired: Boolean(s.settings.peerReviewRequired),
              liveProductionMode: Boolean(s.settings.liveProductionMode),
            },
            userId: ctx.userId,
          };
        });

        sseHub.broadcast('settings_updated', result.settings);
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          settings: result.settings,
          state: projectClientState(state, result.userId),
        });
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
            slopStrikes: 0,
            cooldownUntil: null,
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
          state: projectClientState(state, result.userId),
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
          state: projectClientState(state, result.userId),
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
          const finalTagline = tagline || '社群共創獨立開源產品，共享 5% 創意版稅 / 95% 實幹多勞多得（平臺 0% 抽成）！';
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

        store.appendAudit(
          'project_proposed',
          `Proposed project ${result.project.id} "${result.project.name}" (#${result.project.ideaHash.slice(0, 12)})`,
        );
        sseHub.broadcast('project_updated', { action: 'proposed', project: result.project });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 201, {
          ok: true,
          project: result.project,
          state: projectClientState(state, result.userId),
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
              message: `${user.displayName} 加入原創項目《${proj.shortName || proj.name}》成為共建者！（共 ${proj.coBuilders.length} 位共建者，按 95% 實幹池多勞多得）`,
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
          state: projectClientState(state, result.userId),
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
          state: projectClientState(state, result.user.id),
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

          if (BILLBOARD_PRICE_USD > 0) {
            addFounderRevenueEntry(s, {
              stream: 'billboard_ad',
              label: `《${proj.shortName || proj.name}》租用像素廣場霓虹廣告位`,
              amountUsd: BILLBOARD_PRICE_USD,
              projectId: proj.id,
            });
          }

          pushActivity(s, {
            type: 'billboard',
            icon: '📺',
            message: BILLBOARD_PRICE_USD > 0
              ? `《${proj.shortName}》點亮像素廣場霓虹廣告牌（+$${BILLBOARD_PRICE_USD}）`
              : `《${proj.shortName}》免費點亮像素廣場霓虹看板！`,
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
          state: projectClientState(state, result.userId),
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
            message: `🎆 《${proj.name}》正式發布上線！首筆營收 $${dividend.grossRevenueUsd} 已按 5/95/0（平臺 0% 抽成）結算分紅（首發創意 $${dividend.sparkRoyaltyUsd}、實幹池 $${dividend.meritPoolUsd}、你實得 $${dividend.playerTotalUsd}）`,
            projectId: proj.id,
          });

          const achIds = ['launch_founder'];
          if (dividend.playerTotalUsd > 0) achIds.push('dividend_earner');
          const unlockedAchievements = unlockAchievements(s, user, achIds);

          return { project: proj, dividend, unlockedAchievements, user };
        });

        store.appendAudit(
          'project_launched',
          `Launched ${result.project.id} "${result.project.shortName}" with $${result.dividend.grossRevenueUsd} revenue`,
        );
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
          state: projectClientState(state, result.user.id),
        });
      }

      // Projects: POST /api/projects/:id/auto-split (70/30 Anti-Dilution Smart Task Split)
      const autoSplitMatch = pathname.match(/^\/api\/projects\/([^/]+)\/auto-split$/);
      if (autoSplitMatch && method === 'POST') {
        const projectId = decodeURIComponent(autoSplitMatch[1]);
        const body = await parseJsonBody(req);
        const featureBrief = sanitizeText(body.featureBrief || body.brief || body.description || '', 280);
        if (featureBrief.length < 2) {
          throw new HttpError(400, '請輸入至少 2 個字的功能需求描述（featureBrief）');
        }
        const count = body.count !== undefined ? Number(body.count) : 3;

        const { state, result } = await store.mutate((s) => {
          ensureStateSchema(s);
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          const proj = s.projects.find((p) => p.id === projectId);
          if (!proj) {
            throw new HttpError(404, `找不到項目：${projectId}`);
          }

          const generatedTasks = buildAutoSplitTasks(proj, featureBrief, count);
          s.tasks.push(...generatedTasks);

          const coreCount = generatedTasks.filter((t) => t.poolBucket === 'core').length;
          const peripheralCount = generatedTasks.filter((t) => t.poolBucket === 'peripheral').length;

          pushActivity(s, {
            type: 'auto_split',
            icon: '⚡',
            message: `${user.displayName} 為《${proj.shortName || proj.name}》智慧拆單「${featureBrief.slice(0, 36)}」：生成 ${coreCount} 張核心池工會大單 (70%) ＋ ${peripheralCount} 張週邊池 API 微任務 (≤30%)！`,
            projectId: proj.id,
          });

          return {
            project: proj,
            tasks: generatedTasks,
            breakdown: { core: coreCount, peripheral: peripheralCount },
            userId: user.id,
          };
        });

        store.appendAudit(
          'project_auto_split',
          `Auto-split "${featureBrief.slice(0, 80)}" on ${result.project.id}: ${result.breakdown.core} core + ${result.breakdown.peripheral} peripheral tasks`,
        );

        sseHub.broadcast('tasks_imported', {
          source: 'auto_split',
          project: result.project,
          featureBrief,
          tasks: result.tasks,
          breakdown: result.breakdown,
        });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });

        return sendJson(res, 200, {
          ok: true,
          project: result.project,
          featureBrief,
          tasks: result.tasks,
          createdCount: result.tasks.length,
          breakdown: result.breakdown,
          state: projectClientState(state, result.userId),
        });
      }

      // Projects: POST /api/projects/:id/simulate-revenue
      const simRevMatch = pathname.match(/^\/api\/projects\/([^/]+)\/simulate-revenue$/);
      if (simRevMatch && method === 'POST') {
        const projectId = decodeURIComponent(simRevMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
          const ctx = getActiveUserContext(req, s);
          if (s.settings?.liveProductionMode && !isFounderAdmin(req, ctx)) {
            throw new HttpError(403, '正式營運模式已停用模擬營收，請由鎮長在 /admin 後臺錄入真實入帳營收', {
              code: 'LIVE_MODE_LOCKED',
            });
          }
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
            message: `《${proj.shortName}》新增產品營收 $${dividend.grossRevenueUsd}！已按 5/95/0（平臺 0% 抽成）即時分紅：你實得 +$${dividend.playerTotalUsd}（創意 $${dividend.playerSparkUsd} + 實幹 $${dividend.playerMeritUsd}）`,
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
          state: projectClientState(state, result.user.id),
        });
      }

      // Tasks: POST /api/tasks/:id/claim
      const claimMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/claim$/);
      if (claimMatch && method === 'POST') {
        const taskId = decodeURIComponent(claimMatch[1]);
        const body = await parseJsonBody(req);
        await ensureFreshTaskLeases();

        const { state, result } = await store.mutate((s) => {
          reapExpiredTaskClaimsInState(s, Date.now());
          const ctx = getActiveUserContext(req, s);
          const user = ctx.user;
          const task = s.tasks.find((t) => t.id === taskId);
          if (!task) {
            throw new HttpError(404, `找不到任務：${taskId}`);
          }
          if (task.status === 'completed') {
            throw new HttpError(409, '此任務已完成驗收');
          }
          if (task.status === 'pending_review') {
            throw new HttpError(409, '此任務已提交至實幹審閱佇列，正在等待同行審閱');
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

          // Anti-slop Layer 4a: Worker cooldown check
          if (worker.cooldownUntil) {
            const remainingMs = Date.parse(worker.cooldownUntil) - Date.now();
            if (remainingMs > 0) {
              const cooldownRemainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
              throw new HttpError(
                429,
                `小人【${worker.name}】因連續提交垃圾產出正在反刷單冷卻中，請於 ${cooldownRemainingSec} 秒後再接單`,
                {
                  code: 'WORKER_COOLDOWN',
                  cooldownRemainingSec,
                  cooldownUntil: worker.cooldownUntil,
                },
              );
            }
            worker.cooldownUntil = null;
            worker.slopStrikes = 0;
          }

          // Anti-slop Layer 4b: Player reputation threshold check
          const minReputation = getTaskMinReputation(task);
          if ((user.reputation ?? 0) < minReputation) {
            throw new HttpError(
              403,
              `信譽分不足！領取此工會核心任務需信譽 ≥ ${minReputation}，你目前信譽分為 ${user.reputation}`,
              {
                code: 'REPUTATION_TOO_LOW',
                requiredReputation: minReputation,
                currentReputation: user.reputation,
              },
            );
          }

          if (worker.stamina < task.staminaCost) {
            throw new HttpError(400, `小人【${worker.name}】體力不足（剩餘 ${worker.stamina}，需要 ${task.staminaCost}），請先到宿舍喝咖啡回復體力`);
          }
          if (worker.track === 'api' && worker.usedTokensToday + task.tokenCostEst > worker.dailyTokenCap) {
            throw new HttpError(400, `小人【${worker.name}】即將超過今日 Token 安全上限（${worker.dailyTokenCap}），請調高上限或明日再戰`);
          }

          // Anti-slop Layer 4c: Stake Gold deposit freeze
          const stakeGold = getTaskStakeGold(task);
          const alreadyStakedSameClaim = task.status === 'in_progress'
            && task.assignedWorkerId === worker.id
            && Number(task.stakedGold || 0) > 0;
          if (!alreadyStakedSameClaim) {
            if (stakeGold > 0) {
              if (user.gold < stakeGold) {
                throw new HttpError(
                  400,
                  `金幣不足以支付接單誠意押金！此任務需暫時質押 ${stakeGold}G（驗收通過或釋放將全額退還），目前僅有 ${user.gold}G`,
                  {
                    code: 'INSUFFICIENT_STAKE_GOLD',
                    requiredStakeGold: stakeGold,
                    currentGold: user.gold,
                  },
                );
              }
              user.gold -= stakeGold;
              task.stakedGold = stakeGold;
              task.stakedByUserId = user.id;
            } else {
              task.stakedGold = 0;
              task.stakedByUserId = null;
            }
          }

          const nowMs = Date.now();
          const now = new Date(nowMs).toISOString();
          const leaseMs = getClaimLeaseMs(task.track, options);
          task.status = 'in_progress';
          task.assignedWorkerId = worker.id;
          task.claimedBy = user.id;
          task.claimedAt = now;
          task.claimExpiresAt = new Date(nowMs + leaseMs).toISOString();

          worker.status = 'working';
          worker.currentTaskId = task.id;
          worker.currentProjectId = task.projectId;
          worker.currentZone = task.track === 'api_auto' ? 'factory' : 'guild';
          worker.lastMessage = task.stakedGold > 0
            ? `已接單（質押 ${task.stakedGold}G）：${task.title.slice(0, 18)}...`
            : `已接單：${task.title.slice(0, 22)}...`;

          const proj = s.projects.find((p) => p.id === task.projectId);
          pushActivity(s, {
            type: 'claim',
            icon: task.track === 'api_auto' ? '🏭' : '⚔️',
            message: `【${worker.name}】接下《${proj?.shortName || task.projectId}》任務：${task.title}${task.stakedGold > 0 ? `（已凍結誠意押金 ${task.stakedGold}G）` : ''}`,
            workerId: worker.id,
            projectId: task.projectId,
            taskId: task.id,
          });

          return { task, worker, project: proj || null, stakedGold: task.stakedGold || 0, userId: user.id };
        });

        sseHub.broadcast('task_claimed', {
          task: result.task,
          worker: result.worker,
          project: result.project,
          stakedGold: result.stakedGold,
        });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          task: result.task,
          worker: result.worker,
          project: result.project,
          stakedGold: result.stakedGold,
          state: projectClientState(state, result.userId),
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
          if (task.status === 'pending_review') {
            throw new HttpError(409, '此任務正在實幹審閱佇列中，無法直接釋放');
          }
          const proj = s.projects.find((p) => p.id === task.projectId) || null;
          const isMaintainer = Boolean(proj && (proj.originatorId === user.id || proj.creatorId === user.id));
          if (
            task.status === 'in_progress'
            && task.claimedBy
            && task.claimedBy !== user.id
            && !isMaintainer
            && !isFounderAdmin(req, ctx)
          ) {
            throw new HttpError(403, '僅限認領者本人、項目維護者或創始鎮長可取消此任務', { code: 'RELEASE_FORBIDDEN' });
          }

          const targetWorkerId = body.workerId || task.assignedWorkerId;
          let worker = targetWorkerId
            ? user.workers.find((w) => w.id === targetWorkerId)
            : null;
          if (!worker && targetWorkerId) {
            const cross = findWorkerAcrossUsers(s, targetWorkerId);
            if (cross) worker = cross.worker;
          }

          // Refund frozen stake gold in full upon clean release
          let refundedStakeGold = 0;
          if (Number(task.stakedGold || 0) > 0) {
            refundedStakeGold = Number(task.stakedGold);
            const staker = (task.stakedByUserId && s.users[task.stakedByUserId]) || user;
            if (staker) {
              staker.gold += refundedStakeGold;
            }
          }

          const wasInProgress = task.status === 'in_progress';
          task.status = 'open';
          task.assignedWorkerId = null;
          task.claimedBy = null;
          task.claimedAt = null;
          task.claimExpiresAt = null;
          task.stakedGold = 0;
          task.stakedByUserId = null;

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
              message: `【${worker?.name || '系統'}】無懲罰釋放任務《${task.title}》回待接狀態${refundedStakeGold > 0 ? `（已全額退還 ${refundedStakeGold}G 押金）` : ''}${reasonText ? `（${reasonText}）` : ''}`,
              workerId: worker?.id || null,
              projectId: task.projectId,
              taskId: task.id,
            });
          }

          return { task, worker: worker || null, refundedStakeGold, userId: user.id };
        });

        sseHub.broadcast('task_released', {
          task: result.task,
          worker: result.worker,
          refundedStakeGold: result.refundedStakeGold,
        });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          refundedStakeGold: result.refundedStakeGold,
          task: result.task,
          worker: result.worker,
          state: projectClientState(state, result.userId),
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
          if (task.status === 'pending_review') {
            throw new HttpError(409, '此任務已進入實幹審閱佇列，請等待審閱結果');
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

            // Forfeit any frozen stake gold into anti-slop treasury
            const forfeitedStakeGold = Number(task.stakedGold || 0);
            if (forfeitedStakeGold > 0) {
              s.antiSlopTreasuryGold = Number(s.antiSlopTreasuryGold || 0) + forfeitedStakeGold;
            }
            task.status = 'open';
            task.assignedWorkerId = null;
            task.claimedBy = null;
            task.claimedAt = null;
            task.stakedGold = 0;
            task.stakedByUserId = null;
            task.lastRejectedVerification = verification;
            task.lastRejectedAt = now;

            let cooldownTriggered = false;
            let cooldownSec = 0;
            if (worker) {
              worker.slopStrikes = (Number(worker.slopStrikes) || 0) + 1;
              if (worker.slopStrikes >= SLOP_STRIKE_LIMIT) {
                cooldownSec = getCooldownSeconds();
                worker.cooldownUntil = new Date(Date.now() + cooldownSec * 1000).toISOString();
                cooldownTriggered = true;
                worker.lastMessage = `連續垃圾提交達 ${worker.slopStrikes} 次，已觸發 ${cooldownSec} 秒反刷單冷卻！`;
              } else {
                worker.lastMessage = `交卷未通過驗收（違規 ${worker.slopStrikes}/${SLOP_STRIKE_LIMIT}），需要修正後重交！`;
              }
              worker.status = 'idle';
              worker.currentTaskId = null;
              worker.currentProjectId = null;
              worker.currentZone = 'lounge';
            }

            syncUserLeaderboard(s, user);
            pushActivity(s, {
              type: 'reject',
              icon: '🛡️',
              message: `防作弊驗收攔截：【${task.title}】未通過檢查（0 貢獻值，信譽分 -2${forfeitedStakeGold > 0 ? `，沒收押金 ${forfeitedStakeGold}G` : ''}${cooldownTriggered ? `，觸發 ${cooldownSec}s 冷卻` : ''}）— ${verification.reason}`,
              workerId: worker?.id || null,
              projectId: task.projectId,
              taskId: task.id,
            });

            return {
              passed: false,
              pendingReview: false,
              verification,
              cooldownTriggered,
              cooldownUntil: worker?.cooldownUntil || null,
              slopStrikes: worker?.slopStrikes || 0,
              rewards: {
                gold: 0,
                contributionPoints: 0,
                xp: 0,
                bountyGrossUsd: 0,
                bountyNetUsd: 0,
                platformFeeUsd: 0,
                reputationDelta: -2,
                forfeitedStakeGold,
                leveledUp: false,
              },
              task,
              worker: worker || null,
              project: proj || null,
              unlockedAchievements: [],
              user,
            };
          }

          const contentStr = sanitizeText(
            typeof body.content === 'string'
              ? body.content
              : JSON.stringify(body.content ?? '', null, 2),
            50_000,
            { multiline: true },
          );
          const cleanPrUrl = sanitizeText(body.prUrl, 240) || null;
          const cleanNotes = sanitizeText(body.notes, 500, { multiline: true });
          const executionMode = sanitizeText(body.executionMode, 32) || (task.track === 'api_auto' ? 'byok' : 'byot_cli');
          const tokensUsed = Number(body.tokensUsed) > 0 ? Math.round(Number(body.tokensUsed)) : task.tokenCostEst;
          const poolBucket = getTaskBucket(task);

          // Anti-slop Layer 2 & 3: Route guild_bounty to Two-Stage Peer Review Queue when requested or globally required
          const needsPeerReview = task.track === 'guild_bounty'
            && (body.submitForReview === true || s.settings?.peerReviewRequired === true);

          if (needsPeerReview) {
            const aiReview = runAiBlindReview(task, contentStr, cleanPrUrl || '');
            task.status = 'pending_review';
            task.submittedAt = now;
            task.assignedWorkerId = worker?.id || task.assignedWorkerId || null;
            task.verification = verification;
            task.submission = {
              content: contentStr,
              prUrl: cleanPrUrl,
              notes: cleanNotes,
              executionMode,
              tokensUsed,
              submittedBy: user.displayName,
              submittedByUserId: user.id,
              submittedAt: now,
            };

            if (worker) {
              worker.status = 'idle';
              worker.currentTaskId = null;
              worker.currentProjectId = null;
              worker.currentZone = 'lounge';
              worker.lastMessage = `已送交實幹審閱團（AI 盲審 ${aiReview.aiScore}/100），等待批准合併！`;
            }

            const reviewItem = {
              id: uid('rev'),
              status: 'pending',
              projectId: task.projectId,
              projectName: proj?.name || task.projectId,
              projectShortName: proj?.shortName || proj?.name || task.projectId,
              taskId: task.id,
              taskTitle: task.title,
              track: task.track,
              category: task.category,
              poolBucket,
              submittedByUserId: user.id,
              submittedByName: user.displayName,
              workerId: worker?.id || task.assignedWorkerId || null,
              workerName: worker?.name || '手動提交',
              stakeGold: Number(task.stakedGold || 0),
              contributionPoints: task.contributionPoints,
              goldReward: task.goldReward,
              xpReward: task.xpReward || 40,
              progressWeight: task.progressWeight || 15,
              cashBountyUsd: round2(task.cashBountyUsd || 0),
              tokensUsed,
              staminaCost: task.staminaCost || 0,
              prUrl: cleanPrUrl,
              content: contentStr,
              notes: cleanNotes,
              executionMode,
              ciStatus: 'passed',
              verificationScore: verification.score,
              aiReview,
              submittedAt: now,
            };

            s.reviewQueue.unshift(reviewItem);
            if (s.reviewQueue.length > 60) {
              s.reviewQueue.length = 60;
            }

            pushActivity(s, {
              type: 'review_queued',
              icon: '⚖️',
              message: `${user.displayName} 提交《${task.title}》進入雙階段實幹審閱佇列（AI 盲審 ${aiReview.aiScore}/100 · ${aiReview.riskLevel} risk${reviewItem.stakeGold > 0 ? ` · 質押 ${reviewItem.stakeGold}G` : ''}）`,
              workerId: worker?.id || null,
              projectId: task.projectId,
              taskId: task.id,
            });

            return {
              passed: true,
              pendingReview: true,
              reviewItem,
              verification,
              task,
              worker: worker || null,
              project: proj || null,
              unlockedAchievements: [],
              user,
            };
          }

          // Passed Proof of Accepted Work — Direct Settlement!
          const gold = task.goldReward;
          const contributionPoints = task.contributionPoints;
          const xp = task.xpReward || 40;
          const bountyGrossUsd = round2(task.cashBountyUsd || 0);
          const platformFeeUsd = round2(bountyGrossUsd * (PLATFORM_BOUNTY_FEE_PCT / 100));
          const bountyNetUsd = round2(bountyGrossUsd - platformFeeUsd);
          const reputationDelta = verification.score >= 85 ? 2 : 1;

          // Refund frozen stake gold in full upon accepted submission
          let refundedStakeGold = 0;
          if (Number(task.stakedGold || 0) > 0) {
            refundedStakeGold = Number(task.stakedGold);
            const staker = (task.stakedByUserId && s.users[task.stakedByUserId]) || user;
            if (staker) {
              staker.gold += refundedStakeGold;
            }
          }

          task.status = 'completed';
          task.submittedAt = now;
          task.assignedWorkerId = worker?.id || task.assignedWorkerId || null;
          task.stakedGold = 0;
          task.stakedByUserId = null;
          task.verification = verification;
          task.submission = {
            content: contentStr,
            prUrl: cleanPrUrl,
            notes: cleanNotes,
            executionMode,
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

          // Update worker stats & level up + clear slop strikes/cooldown
          let leveledUp = false;
          if (worker) {
            worker.slopStrikes = 0;
            worker.cooldownUntil = null;
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

          // Update project progress, contributions, anti-dilution bucketPoints & coBuilders
          if (proj) {
            ensureProjectBuckets(proj);
            proj.progressPct = Math.min(100, (proj.progressPct || 0) + (task.progressWeight || 15));
            proj.contributions = proj.contributions || {};
            proj.contributorNames = proj.contributorNames || {};
            proj.contributions[user.id] = (proj.contributions[user.id] || 0) + contributionPoints;
            proj.bucketPoints[poolBucket][user.id] = (proj.bucketPoints[poolBucket][user.id] || 0) + contributionPoints;
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
            poolBucket,
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
            message: `【${worker?.name || user.displayName}】完成《${task.title}》（評分 ${verification.score}）：+${gold}G、+${contributionPoints} 貢獻點 [${poolBucket === 'core' ? '核心池' : '週邊池'}]${refundedStakeGold > 0 ? `、退還押金 ${refundedStakeGold}G` : ''}${bountyText}`,
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
            pendingReview: false,
            verification,
            rewards: {
              gold,
              contributionPoints,
              poolBucket,
              refundedStakeGold,
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

        if (result.pendingReview) {
          sseHub.broadcast('review_queued', {
            reviewItem: result.reviewItem,
            task: result.task,
            project: result.project,
          });
          sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
          return sendJson(res, 200, {
            ok: true,
            passed: true,
            pendingReview: true,
            reviewItem: result.reviewItem,
            verification: result.verification,
            task: result.task,
            worker: result.worker,
            project: result.project,
            state: projectClientState(state, result.user.id),
          });
        }

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
          pendingReview: false,
          verification: result.verification,
          rewards: result.rewards,
          cooldownTriggered: Boolean(result.cooldownTriggered),
          cooldownUntil: result.cooldownUntil || null,
          slopStrikes: result.slopStrikes || 0,
          task: result.task,
          worker: result.worker,
          project: result.project,
          unlockedAchievements: result.unlockedAchievements || [],
          state: projectClientState(state, result.user.id),
        });
      }

      // Governance Peer Review: GET /api/reviews
      if (pathname === '/api/reviews' && method === 'GET') {
        const state = await store.load();
        ensureStateSchema(state);
        const ctx = getActiveUserContext(req, state);
        const isAdmin = isFounderAdmin(req, ctx);
        const reviewerEligibility = isAdmin
          ? {
            eligible: true,
            code: null,
            tier: 'founder',
            tierLabel: '👑 創始鎮長審閱權',
            reason: '創始鎮長擁有全域最高審閱權限',
            requirements: { minReputation: REVIEWER_MIN_REPUTATION, minCorePoints: REVIEWER_MIN_CORE_POINTS },
          }
          : evaluateReviewerEligibility(ctx.user, null, null, state.projects);
        return sendJson(res, 200, {
          ok: true,
          reviewQueue: state.reviewQueue || [],
          reviewHistory: state.reviewHistory || [],
          peerReviewRequired: Boolean(state.settings?.peerReviewRequired),
          projectBuckets: buildProjectBucketsMap(state),
          reviewerEligibility,
          reviewerRewards: {
            approveGold: REVIEWER_REWARD_GOLD,
            approvePoints: REVIEWER_REWARD_POINTS,
          },
        });
      }

      // Governance Peer Review: POST /api/reviews/:id/decide
      const reviewDecideMatch = pathname.match(/^\/api\/reviews\/([^/]+)\/decide$/);
      if (reviewDecideMatch && method === 'POST') {
        const reviewId = decodeURIComponent(reviewDecideMatch[1]);
        const body = await parseJsonBody(req);
        const decision = String(body.decision || '').toLowerCase();
        const reason = sanitizeText(body.reason, 200);

        if (decision !== 'approve' && decision !== 'reject') {
          throw new HttpError(400, 'decision 必須為 approve 或 reject');
        }

        const { state, result } = await store.mutate((s) => {
          ensureStateSchema(s);
          const ctx = getActiveUserContext(req, s);
          const reviewer = ctx.user;

          const idx = s.reviewQueue.findIndex((item) => item.id === reviewId);
          if (idx === -1) {
            throw new HttpError(404, `找不到待審項目：${reviewId}`);
          }
          const item = s.reviewQueue[idx];
          const proj = s.projects.find((p) => p.id === item.projectId) || null;

          const elig = isFounderAdmin(req, ctx)
            ? { eligible: true, tier: 'founder', tierLabel: '👑 創始鎮長審閱權' }
            : evaluateReviewerEligibility(reviewer, proj, item, s.projects);
          if (!elig.eligible) {
            throw new HttpError(
              403,
              elig.reason || '審閱權限不足：僅限資深核心工程師、項目維護者或鎮長認證審閱官可參與審閱',
              { code: elig.code || 'REVIEWER_NOT_ELIGIBLE', eligibility: elig },
            );
          }

          s.reviewQueue.splice(idx, 1);

          const now = new Date().toISOString();
          const task = s.tasks.find((t) => t.id === item.taskId) || null;
          const submitterUser = (item.submittedByUserId && s.users[item.submittedByUserId]) || null;
          const crossWorker = item.workerId ? findWorkerAcrossUsers(s, item.workerId) : null;
          const submitterWorker = crossWorker?.worker || null;
          const poolBucket = item.poolBucket === 'peripheral' ? 'peripheral' : getTaskBucket(item);

          let unlockedAchievements = [];
          let reviewerRewardGold = 0;
          let reviewerRewardPoints = 0;
          let seizedStakeGold = 0;
          let submitterPointsAwarded = 0;

          if (decision === 'approve') {
            const contributionPoints = Number(item.contributionPoints || 50);
            const gold = Number(item.goldReward || 200);
            const xp = Number(item.xpReward || 60);
            const refundedStakeGold = Number(item.stakeGold || 0);
            const bountyGrossUsd = round2(item.cashBountyUsd || 0);
            const platformFeeUsd = round2(bountyGrossUsd * (PLATFORM_BOUNTY_FEE_PCT / 100));
            const bountyNetUsd = round2(bountyGrossUsd - platformFeeUsd);
            submitterPointsAwarded = contributionPoints;

            if (submitterUser) {
              submitterUser.gold += gold + refundedStakeGold;
              submitterUser.usdBalance = round2((submitterUser.usdBalance || 0) + bountyNetUsd);
              submitterUser.completedTasks += 1;
              submitterUser.totalContribution += contributionPoints;
              submitterUser.reputation += 2;
              syncUserLeaderboard(s, submitterUser);
            } else {
              const npcRow = s.leaderboard.find((r) => r.userId === item.submittedByUserId);
              if (npcRow) {
                npcRow.completedTasks = (Number(npcRow.completedTasks) || 0) + 1;
                npcRow.contributionPoints = (Number(npcRow.contributionPoints) || 0) + contributionPoints;
                npcRow.earnedUsd = round2((Number(npcRow.earnedUsd) || 0) + bountyNetUsd);
              }
            }

            if (platformFeeUsd > 0) {
              addFounderRevenueEntry(s, {
                stream: 'bounty_fee',
                label: `實幹審閱核准現金懸賞《${item.taskTitle.slice(0, 24)}》10% 託管費`,
                amountUsd: platformFeeUsd,
                projectId: item.projectId,
                taskId: item.taskId,
              });
            }

            if (submitterWorker) {
              submitterWorker.slopStrikes = 0;
              submitterWorker.cooldownUntil = null;
              submitterWorker.stamina = Math.max(0, submitterWorker.stamina - (item.staminaCost || 0));
              submitterWorker.usedTokensToday += Number(item.tokensUsed || 0);
              submitterWorker.xp += xp;
              while (submitterWorker.xp >= submitterWorker.xpToNext) {
                submitterWorker.xp -= submitterWorker.xpToNext;
                submitterWorker.level += 1;
                submitterWorker.xpToNext = Math.round(submitterWorker.xpToNext * 1.35);
                submitterWorker.maxStamina = Math.min(150, submitterWorker.maxStamina + 5);
              }
              submitterWorker.completedCount += 1;
              submitterWorker.earnedGold += gold;
              submitterWorker.earnedPoints += contributionPoints;
              submitterWorker.status = 'idle';
              submitterWorker.currentTaskId = null;
              submitterWorker.currentProjectId = null;
              submitterWorker.currentZone = 'lounge';
              submitterWorker.lastMessage = `實幹審閱批准合併！獲得 +${gold}G / +${contributionPoints} 核心點！`;
            }

            if (proj) {
              ensureProjectBuckets(proj);
              proj.progressPct = Math.min(100, (proj.progressPct || 0) + (item.progressWeight || 15));
              proj.contributions = proj.contributions || {};
              proj.contributorNames = proj.contributorNames || {};
              proj.contributions[item.submittedByUserId] = (proj.contributions[item.submittedByUserId] || 0) + contributionPoints;
              proj.bucketPoints[poolBucket][item.submittedByUserId] = (proj.bucketPoints[poolBucket][item.submittedByUserId] || 0) + contributionPoints;
              proj.contributorNames[item.submittedByUserId] = item.submittedByName;
              if (!Array.isArray(proj.coBuilders)) proj.coBuilders = [];
              if (!proj.coBuilders.some((b) => b.userId === item.submittedByUserId)) {
                proj.coBuilders.push({
                  userId: item.submittedByUserId,
                  username: submitterUser?.username || item.submittedByUserId,
                  displayName: item.submittedByName,
                  joinedAt: now,
                });
              }
            }

            if (task) {
              task.status = 'completed';
              task.stakedGold = 0;
              task.stakedByUserId = null;
              task.reviewedAt = now;
              task.reviewedBy = reviewer.id;
            }

            s.contributionLedger.unshift({
              id: uid('contrib'),
              timestamp: now,
              projectId: item.projectId,
              projectName: proj?.name || item.projectName,
              taskId: item.taskId,
              taskTitle: item.taskTitle,
              userId: item.submittedByUserId,
              userName: item.submittedByName,
              workerId: item.workerId || null,
              workerName: item.workerName || '審閱核准',
              poolBucket,
              points: contributionPoints,
              gold,
              bountyGrossUsd,
              bountyNetUsd,
              platformFeeUsd,
              verificationScore: item.aiReview?.aiScore || item.verificationScore || 90,
            });
            if (s.contributionLedger.length > 100) {
              s.contributionLedger.length = 100;
            }

            // Reviewer incentive: +15G & +5 contribution points
            reviewerRewardGold = REVIEWER_REWARD_GOLD;
            reviewerRewardPoints = REVIEWER_REWARD_POINTS;
            reviewer.gold += reviewerRewardGold;
            reviewer.totalContribution += reviewerRewardPoints;
            reviewer.reputation += 1;
            if (proj) {
              ensureProjectBuckets(proj);
              proj.contributions[reviewer.id] = (proj.contributions[reviewer.id] || 0) + reviewerRewardPoints;
              proj.bucketPoints.core[reviewer.id] = (proj.bucketPoints.core[reviewer.id] || 0) + reviewerRewardPoints;
              proj.contributorNames[reviewer.id] = reviewer.displayName;
            }
            syncUserLeaderboard(s, reviewer);

            if (submitterUser) {
              const achCandidates = ['first_blood'];
              const completedTracks = new Set(
                s.tasks
                  .filter((t) => t.status === 'completed' && (!t.submission?.submittedByUserId || t.submission.submittedByUserId === submitterUser.id))
                  .map((t) => t.track),
              );
              if (completedTracks.has('api_auto') && completedTracks.has('guild_bounty')) {
                achCandidates.push('dual_track_master');
              }
              unlockedAchievements = unlockAchievements(s, submitterUser, achCandidates);
            }

            pushActivity(s, {
              type: 'review_approved',
              icon: '✅',
              message: `⚖️ 實幹審閱核准：${reviewer.displayName} 批准合併 ${item.submittedByName} 的《${item.taskTitle}》（提交者 +${contributionPoints} ${poolBucket === 'core' ? '核心' : '週邊'}點；審閱獎勵 +${reviewerRewardGold}G / +${reviewerRewardPoints} 點）`,
              projectId: item.projectId,
              taskId: item.taskId,
            });
          } else {
            // REJECT: 0 contribution to submitter, -5 reputation, slop strike + cooldown, seize stake gold to reviewer!
            seizedStakeGold = Number(item.stakeGold || 0);
            reviewerRewardGold = seizedStakeGold;
            reviewerRewardPoints = 0;

            if (submitterUser) {
              submitterUser.reputation = Math.max(0, submitterUser.reputation - REVIEW_REJECT_REPUTATION_PENALTY);
              syncUserLeaderboard(s, submitterUser);
            } else {
              const npcRow = s.leaderboard.find((r) => r.userId === item.submittedByUserId);
              if (npcRow) {
                npcRow.reputation = Math.max(0, (Number(npcRow.reputation) || 0) - REVIEW_REJECT_REPUTATION_PENALTY);
              }
            }

            if (submitterWorker) {
              submitterWorker.slopStrikes = (Number(submitterWorker.slopStrikes) || 0) + 1;
              if (submitterWorker.slopStrikes >= SLOP_STRIKE_LIMIT) {
                const cooldownSec = getCooldownSeconds();
                submitterWorker.cooldownUntil = new Date(Date.now() + cooldownSec * 1000).toISOString();
              }
              submitterWorker.status = 'idle';
              submitterWorker.currentTaskId = null;
              submitterWorker.currentProjectId = null;
              submitterWorker.currentZone = 'lounge';
              submitterWorker.lastMessage = '提交遭實幹審閱團駁回，押金已被沒收！';
            }

            // Reviewer pockets the seized stake gold as anti-slop bounty!
            reviewer.gold += seizedStakeGold;
            reviewer.reputation += 1;
            syncUserLeaderboard(s, reviewer);

            if (task) {
              task.status = 'open';
              task.assignedWorkerId = null;
              task.claimedBy = null;
              task.claimedAt = null;
              task.stakedGold = 0;
              task.stakedByUserId = null;
              task.lastRejectedAt = now;
            }

            pushActivity(s, {
              type: 'review_rejected',
              icon: '🚫',
              message: `🚫 實幹審閱駁回垃圾提交：${reviewer.displayName} 攔截 ${item.submittedByName} 的《${item.taskTitle}》（提交者 0 貢獻、信譽 -${REVIEW_REJECT_REPUTATION_PENALTY}；沒收押金 +${seizedStakeGold}G 歸審閱人！）${reason ? ` — ${reason}` : ''}`,
              projectId: item.projectId,
              taskId: item.taskId,
            });
          }

          const decidedRecord = {
            ...item,
            status: decision === 'approve' ? 'approved' : 'rejected',
            decision,
            decisionReason: reason || null,
            decidedBy: reviewer.id,
            decidedByName: reviewer.displayName,
            decidedAt: now,
            reviewerRewardGold,
            reviewerRewardPoints,
            seizedStakeGold,
            slashedStakeGold: seizedStakeGold,
            submitterPointsAwarded,
          };

          s.reviewHistory.unshift(decidedRecord);
          if (s.reviewHistory.length > 60) {
            s.reviewHistory.length = 60;
          }

          return {
            decision,
            review: decidedRecord,
            reviewerReward: {
              gold: reviewerRewardGold,
              points: reviewerRewardPoints,
              seizedStakeGold,
              slashedStakeGold: seizedStakeGold,
            },
            project: proj,
            task,
            unlockedAchievements,
            submitterUser,
            reviewer,
          };
        });

        store.appendAudit(
          `review_${result.decision}`,
          `Reviewer ${result.reviewer.displayName} ${result.decision}d ${result.review.id} (${result.review.taskId})`,
        );
        sseHub.broadcast('review_decided', {
          decision: result.decision,
          review: result.review,
          reviewItem: result.review,
          reviewerReward: result.reviewerReward,
          slashedStakeGold: result.reviewerReward.slashedStakeGold,
          project: result.project,
          task: result.task,
        });
        if (result.submitterUser && result.unlockedAchievements?.length) {
          broadcastAchievements(sseHub, result.unlockedAchievements, result.submitterUser);
        }
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });

        return sendJson(res, 200, {
          ok: true,
          decision: result.decision,
          review: result.review,
          reviewItem: result.review,
          reviewerReward: result.reviewerReward,
          reviewerRewardGold: result.reviewerReward.gold,
          reviewerRewardPoints: result.reviewerReward.points,
          seizedGold: result.reviewerReward.seizedStakeGold,
          slashedStakeGold: result.reviewerReward.slashedStakeGold,
          project: result.project,
          task: result.task,
          projectBuckets: buildProjectBucketsMap(state),
          state: projectClientState(state, result.reviewer.id),
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
          state: projectClientState(state, userId),
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
          state: projectClientState(state, result.user.id),
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
                tagline: `自 GitHub 倉庫 ${parsedRepo.fullName} 匯入的開源協作項目，共享 5/95/0（平臺 0% 抽成）創意溯源與多勞多得分紅池！`,
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
          state: projectClientState(state, result.userId),
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
          state: projectClientState(state, FOUNDER_USER_ID),
        });
      }

      // Unknown API route
      if (pathname.startsWith('/api/')) {
        return sendJson(res, 404, { ok: false, error: `未知的 API 路徑：${method} ${pathname}` });
      }

      // Serve public SSR pages & static assets from public/
      if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Method Not Allowed');
      }

      const decodedPath = decodeURIComponent(pathname);
      const requestOrigin = getRequestOrigin(req);

      // Public Project Share Page: GET /p/:slug (also matches project.id)
      const publicProjMatch = decodedPath.match(/^\/p\/([^/]+)\/?$/);
      if (publicProjMatch) {
        const slugParam = publicProjMatch[1].trim();
        const state = await store.load();
        ensureStateSchema(state);
        const proj = findProjectBySlugOrId(state.projects, slugParam);
        if (!proj) {
          const notFoundHtml = renderPublicNotFoundPage(
            '找不到該公開項目',
            `查無對應「${slugParam}」的公開共建項目，請確認連結是否正確。`,
            requestOrigin,
          );
          return sendHtml(res, 404, notFoundHtml, method, 'no-store');
        }
        const html = renderPublicProjectPage(proj, state, requestOrigin);
        return sendHtml(res, 200, html, method, 'public, max-age=30');
      }

      // Public Cryptographic Provenance Verification Page: GET /verify/:hash
      const publicVerifyMatch = decodedPath.match(/^\/verify\/([^/]+)\/?$/);
      if (publicVerifyMatch) {
        const rawHash = publicVerifyMatch[1].trim().toLowerCase();
        const state = await store.load();
        ensureStateSchema(state);
        const chain = verifyProvenanceChain(state.projects);
        const validFormat = /^[a-f0-9]{8,64}$/.test(rawHash);
        const exact = validFormat ? chain.records.find((r) => r.ideaHash === rawHash) : null;
        const matched = exact || (validFormat
          ? chain.records.find((r) => r.ideaHash && r.ideaHash.startsWith(rawHash))
          : null);
        const project = matched
          ? (state.projects || []).find((p) => p.id === matched.projectId) || null
          : null;

        if (!matched || !matched.verified) {
          const failHtml = renderPublicVerifyPage(
            {
              verified: false,
              found: Boolean(matched),
              queriedHash: rawHash,
              chainValid: chain.valid,
              chainLength: chain.chainLength,
              record: matched || null,
              project,
              error: matched
                ? '該創意溯源區塊驗證失敗：雜湊指紋與內容不符（資料可能已遭竄改）。'
                : '未在 PixelCompute 原創創意溯源鏈上找到對應此指紋的紀錄。',
            },
            requestOrigin,
          );
          return sendHtml(res, 404, failHtml, method, 'no-store');
        }

        const okHtml = renderPublicVerifyPage(
          {
            verified: true,
            found: true,
            queriedHash: rawHash,
            chainValid: chain.valid,
            chainLength: chain.chainLength,
            record: matched,
            project,
          },
          requestOrigin,
        );
        return sendHtml(res, 200, okHtml, method, 'public, max-age=60');
      }

      if (decodedPath === '/docs' || decodedPath === '/docs/' || decodedPath === '/guide' || decodedPath === '/guide/') {
        try {
          const guidePath = path.join(__dirname, 'docs', 'USER_GUIDE.md');
          const markdown = await fs.readFile(guidePath, 'utf8');
          const html = renderDocPage({
            title: '📖 PixelCompute Town 完整使用說明書',
            subtitle: '從 30 秒遊客試玩、帳號註冊與本機一鍵安裝，到 BYOK 自動工坊、BYOT 懸賞工會、創意溯源與穩定幣提領全攻略',
            badge: 'USER GUIDE · v1.2',
            markdown,
            activePath: '/docs',
            origin: requestOrigin,
          });
          return sendHtml(res, 200, html, method, 'public, max-age=60');
        } catch {
          const notFoundHtml = renderPublicNotFoundPage(
            '找不到使用說明書',
            '系統目前無法讀取 docs/USER_GUIDE.md，請稍後再試。',
            requestOrigin,
          );
          return sendHtml(res, 404, notFoundHtml, method, 'no-store');
        }
      }

      if (
        decodedPath === '/whitepaper'
        || decodedPath === '/whitepaper/'
        || /^\/whitepaper\/(zh-TW|zh-CN|en|ja)\/?$/i.test(decodedPath)
      ) {
        const WHITEPAPER_LOCALES = {
          'zh-TW': {
            file: 'WHITEPAPER.md',
            title: '📜 PixelCompute Town 白皮書 v1.1',
            subtitle: '100% 免費 · 0% 抽成 · 自願打賞支持｜AI 閒置算力協作、Proof of First Spark 創意溯源、70/30 防稀釋與 5/95/0 多勞多得協議',
            badge: 'WHITEPAPER · v1.1 · 繁中',
          },
          'zh-CN': {
            file: 'WHITEPAPER.zh-CN.md',
            title: '📜 PixelCompute Town 白皮书 v1.1',
            subtitle: '100% 免费 · 0% 抽成 · 自愿打赏支持｜AI 闲置算力协作、Proof of First Spark 创意溯源、70/30 防稀释与 5/95/0 多劳多得协议',
            badge: 'WHITEPAPER · v1.1 · 简中',
          },
          en: {
            file: 'WHITEPAPER.en.md',
            title: '📜 PixelCompute Town Whitepaper v1.1',
            subtitle: '100% Free Forever · 0% Platform Fee · Tip-Supported | Idle AI Compute, Proof of First Spark, 70/30 Anti-Dilution & 5/95/0 Merit Protocol',
            badge: 'WHITEPAPER · v1.1 · EN',
          },
          ja: {
            file: 'WHITEPAPER.ja.md',
            title: '📜 PixelCompute Town ホワイトペーパー v1.1',
            subtitle: '完全無料・手数料0%・任意チップ支援｜AI余剰計算資源コラボ・Proof of First Spark・70/30希薄化防止・5/95/0成果分配プロトコル',
            badge: 'WHITEPAPER · v1.1 · 日本語',
          },
        };
        const pathLangMatch = decodedPath.match(/^\/whitepaper\/(zh-TW|zh-CN|en|ja)\/?$/i);
        const rawLang = (pathLangMatch ? pathLangMatch[1] : (url.searchParams.get('lang') || 'zh-TW')).trim();
        const langKey = Object.keys(WHITEPAPER_LOCALES).find((k) => k.toLowerCase() === rawLang.toLowerCase()) || 'zh-TW';
        const wpMeta = WHITEPAPER_LOCALES[langKey];
        const langOptions = [
          { code: 'zh-TW', label: '繁中', href: '/whitepaper?lang=zh-TW', active: langKey === 'zh-TW' },
          { code: 'zh-CN', label: '简中', href: '/whitepaper?lang=zh-CN', active: langKey === 'zh-CN' },
          { code: 'en', label: 'EN', href: '/whitepaper?lang=en', active: langKey === 'en' },
          { code: 'ja', label: '日本語', href: '/whitepaper?lang=ja', active: langKey === 'ja' },
        ];
        try {
          const wpPath = path.join(__dirname, 'docs', wpMeta.file);
          const markdown = await fs.readFile(wpPath, 'utf8');
          const html = renderDocPage({
            title: wpMeta.title,
            subtitle: wpMeta.subtitle,
            badge: wpMeta.badge,
            markdown,
            activePath: '/whitepaper',
            origin: requestOrigin,
            lang: langKey,
            langOptions,
          });
          return sendHtml(res, 200, html, method, 'public, max-age=60');
        } catch {
          const notFoundHtml = renderPublicNotFoundPage(
            '找不到白皮書文件',
            `系統目前無法讀取 docs/${wpMeta.file}，請稍後再試。`,
            requestOrigin,
          );
          return sendHtml(res, 404, notFoundHtml, method, 'no-store');
        }
      }

      if (decodedPath === '/') {
        return await serveStaticFile(res, method, 'landing.html', 'index.html');
      }
      if (decodedPath === '/app' || decodedPath === '/app/') {
        return await serveStaticFile(res, method, 'index.html');
      }
      if (decodedPath === '/onboard' || decodedPath === '/onboard/') {
        return await serveStaticFile(res, method, 'onboard.html');
      }
      if (decodedPath === '/admin' || decodedPath === '/admin/') {
        return await serveStaticFile(res, method, 'admin.html');
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

  const leaseReaperTimer = setInterval(() => {
    ensureFreshTaskLeases().catch(() => {});
  }, 60_000);
  if (typeof leaseReaperTimer.unref === 'function') {
    leaseReaperTimer.unref();
  }

  const originalClose = server.close.bind(server);
  server.close = (cb) => {
    clearInterval(leaseReaperTimer);
    sseHub.closeAll();
    return originalClose((err) => {
      try {
        if (typeof store.close === 'function') {
          store.close();
        }
      } catch {
        // ignore sqlite close error during shutdown
      }
      if (typeof cb === 'function') {
        cb(err);
      }
    });
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
