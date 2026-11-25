// PixelCompute Town — One-Click Install Scripts (PowerShell / Bash) + Device Flow Auth & Review Engine

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureStateSchema, WORKER_TEMPLATES } from './seed.mjs';
import {
  FOUNDER_USER_ID,
  getActiveUserContext,
  getRequestOrigin,
  projectStateForUser,
} from './auth.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_SCRIPT_PATH = path.resolve(__dirname, '..', '..', 'bin', 'pixel-worker.mjs');

const DEVICE_TTL_MS = 15 * 60_000; // 15 minutes
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function sanitizeText(value, maxLen = 80) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F-\u009F\r\n\t]+/g, ' ').trim().slice(0, maxLen);
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
}

function randomCodePart(len) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

function generateDeviceCode(existingMap) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = `PCT-${randomCodePart(4)}-${randomCodePart(2)}`;
    if (!existingMap[code]) return code;
  }
  return `PCT-${randomCodePart(4)}-${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function pushFeed(state, entry) {
  state.activityFeed.unshift({
    id: uid('act'),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (state.activityFeed.length > 60) {
    state.activityFeed.length = 60;
  }
}

export function publicDeviceView(record) {
  if (!record) return null;
  return {
    code: record.code,
    deviceName: record.deviceName,
    os: record.os,
    cliTools: Array.isArray(record.cliTools) ? record.cliTools : [],
    status: record.status,
    userId: record.userId || null,
    userName: record.userName || null,
    workerId: record.workerId || null,
    workerName: record.workerName || null,
    workerRoleClass: record.workerRoleClass || 'pro_architect',
    reviewNote: record.reviewNote || null,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    approvedAt: record.approvedAt || null,
    reviewedAt: record.reviewedAt || null,
  };
}

export function getAdminDevicesData(state) {
  const map = state?.deviceAuthorizations || {};
  const all = Object.values(map)
    .map(publicDeviceView)
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  const pendingDevices = all.filter((d) => d.status === 'pending_review');
  return { pendingDevices, allDevices: all.slice(0, 50) };
}

function isExpired(record) {
  return record && record.status === 'pending' && record.expiresAt && Date.parse(record.expiresAt) <= Date.now();
}

function finalizeDeviceApproval(state, record, user) {
  const now = new Date().toISOString();
  const roleClass = record.workerRoleClass || 'pro_architect';
  const template = WORKER_TEMPLATES.find((t) => t.roleClass === roleClass) || WORKER_TEMPLATES[1];

  let worker = null;
  if (record.bindWorkerId) {
    worker = user.workers.find((w) => w.id === record.bindWorkerId) || null;
  }

  if (worker) {
    worker.deviceCode = record.code;
    worker.deviceName = record.deviceName;
    worker.lastHeartbeatAt = now;
    worker.lastMessage = `已透過 Device Flow 綁定本機裝置【${record.deviceName}】！`;
  } else {
    const cliSummary = Array.isArray(record.cliTools) && record.cliTools.length > 0
      ? record.cliTools.slice(0, 3).join(' / ')
      : template.defaultProvider;
    const workerName = record.workerName || `${record.deviceName.slice(0, 18)} (${template.label})`;
    worker = {
      id: uid('w-dev'),
      name: sanitizeText(workerName, 32) || `${template.label} #${user.workers.length + 1}`,
      roleClass: template.roleClass,
      track: template.track,
      providerLabel: sanitizeText(cliSummary, 48) || template.defaultProvider,
      modelHint: template.defaultModelHint,
      dailyTokenCap: template.defaultCap,
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
      skin: 'default',
      autoMode: false,
      completedCount: 0,
      earnedGold: 0,
      earnedPoints: 0,
      deviceCode: record.code,
      deviceName: record.deviceName,
      lastMessage: `裝置【${record.deviceName}】已核准上線，隨時可同步本機 CLI！`,
      lastHeartbeatAt: now,
    };
    user.workers.push(worker);
  }

  record.status = 'approved';
  record.approvedAt = now;
  record.workerId = worker.id;
  record.workerName = worker.name;
  record.userId = user.id;
  record.userName = user.displayName;

  pushFeed(state, {
    type: 'device',
    icon: '💻',
    message: `${user.displayName} 核准綁定本機裝置【${record.deviceName}】→ 算力小人【${worker.name}】上線！`,
    workerId: worker.id,
  });

  return worker;
}

export function handleInstallPs1(req, res) {
  const origin = getRequestOrigin(req);
  const script = [
    '# PixelCompute Town v1.0 — Windows PowerShell One-Click Local Worker Installer',
    '# Zero-Trust BYOT Guarantee: Never reads or uploads your API keys, cookies, or CLI tokens.',
    '$ErrorActionPreference = "Stop"',
    '',
    'Write-Host ""',
    'Write-Host "============================================================" -ForegroundColor Cyan',
    'Write-Host "  PixelCompute Town (像素算力鎮) · Local Worker Installer" -ForegroundColor Yellow',
    'Write-Host "============================================================" -ForegroundColor Cyan',
    '',
    'if (-not (Get-Command node -ErrorAction SilentlyContinue)) {',
    '  Write-Host "[ERROR] Node.js (v18+ / v24 recommended) is required." -ForegroundColor Red',
    '  Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow',
    '  exit 1',
    '}',
    '',
    `$Origin = "${origin}"`,
    '$InstallDir = Join-Path $env:USERPROFILE ".pixelcompute"',
    '$WorkerScript = Join-Path $InstallDir "pixel-worker.mjs"',
    'New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null',
    '',
    'Write-Host "Downloading pixel-worker.mjs from $Origin/download/pixel-worker.mjs ..." -ForegroundColor Cyan',
    'Invoke-WebRequest -Uri "$Origin/download/pixel-worker.mjs" -OutFile $WorkerScript -UseBasicParsing',
    '',
    'Write-Host "Launching interactive Device Flow onboarding..." -ForegroundColor Green',
    '& node $WorkerScript onboard --server $Origin',
    '',
  ].join('\r\n');

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(script);
}

export function handleInstallSh(req, res) {
  const origin = getRequestOrigin(req);
  const script = [
    '#!/usr/bin/env bash',
    '# PixelCompute Town v1.0 — macOS / Linux One-Click Local Worker Installer',
    '# Zero-Trust BYOT Guarantee: Never reads or uploads your API keys, cookies, or CLI tokens.',
    'set -euo pipefail',
    '',
    'echo ""',
    'echo "============================================================"',
    'echo "  PixelCompute Town · Local Worker Installer"',
    'echo "============================================================"',
    '',
    'if ! command -v node >/dev/null 2>&1; then',
    '  echo "[ERROR] Node.js (v18+ / v24 recommended) is required." >&2',
    '  echo "Install from: https://nodejs.org/" >&2',
    '  exit 1',
    'fi',
    '',
    `ORIGIN="${origin}"`,
    'INSTALL_DIR="${HOME}/.pixelcompute"',
    'WORKER_SCRIPT="${INSTALL_DIR}/pixel-worker.mjs"',
    'mkdir -p "${INSTALL_DIR}"',
    '',
    'echo "Downloading pixel-worker.mjs from ${ORIGIN}/download/pixel-worker.mjs ..."',
    'curl -fsSL "${ORIGIN}/download/pixel-worker.mjs" -o "${WORKER_SCRIPT}"',
    'chmod +x "${WORKER_SCRIPT}"',
    '',
    'echo "Launching Device Flow onboarding..."',
    'node "${WORKER_SCRIPT}" onboard --server "${ORIGIN}"',
    '',
  ].join('\n');

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(script);
}

export async function handleDownloadWorkerCli(req, res) {
  try {
    const content = await fs.readFile(CLI_SCRIPT_PATH);
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Content-Disposition': 'attachment; filename="pixel-worker.mjs"',
      'Cache-Control': 'no-cache',
    });
    if (req.method.toUpperCase() === 'HEAD') {
      return res.end();
    }
    return res.end(content);
  } catch {
    return sendJson(res, 404, { ok: false, error: '找不到 pixel-worker.mjs 檔案' });
  }
}

export async function handleDeviceStart(req, res, body, store, sseHub) {
  const origin = getRequestOrigin(req);
  const deviceName = sanitizeText(body?.deviceName, 48) || 'Local-Workstation';
  const osName = sanitizeText(body?.os, 32) || 'unknown';
  const cliTools = Array.isArray(body?.cliTools)
    ? body.cliTools.map((t) => sanitizeText(String(t), 28)).filter(Boolean).slice(0, 10)
    : [];

  const { state, result: record } = await store.mutate((s) => {
    ensureStateSchema(s);
    const code = generateDeviceCode(s.deviceAuthorizations);
    const deviceSecret = crypto.randomBytes(24).toString('hex');
    const nowMs = Date.now();
    const rec = {
      code,
      deviceSecret,
      deviceName,
      os: osName,
      cliTools,
      status: 'pending',
      userId: null,
      userName: null,
      workerId: null,
      workerName: null,
      workerRoleClass: 'pro_architect',
      bindWorkerId: null,
      reviewNote: null,
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + DEVICE_TTL_MS).toISOString(),
      approvedAt: null,
      reviewedAt: null,
    };
    s.deviceAuthorizations[code] = rec;

    // Keep map bounded
    const keys = Object.keys(s.deviceAuthorizations);
    if (keys.length > 200) {
      keys
        .sort((a, b) => Date.parse(s.deviceAuthorizations[a]?.createdAt || 0) - Date.parse(s.deviceAuthorizations[b]?.createdAt || 0))
        .slice(0, keys.length - 150)
        .forEach((k) => delete s.deviceAuthorizations[k]);
    }
    return rec;
  });

  const verifyUrl = `${origin}/onboard?code=${encodeURIComponent(record.code)}`;
  sseHub?.broadcast('device_started', { device: publicDeviceView(record) });

  return sendJson(res, 201, {
    ok: true,
    code: record.code,
    deviceSecret: record.deviceSecret,
    verifyUrl,
    expiresAt: record.expiresAt,
    device: publicDeviceView(record),
    strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
  });
}

export async function handleDeviceStatus(req, res, url, store) {
  const code = sanitizeText(url.searchParams.get('code') || '', 32).toUpperCase();
  if (!code) {
    return sendJson(res, 400, { ok: false, error: '請提供裝置授權碼 code' });
  }

  const state = await store.load();
  ensureStateSchema(state);
  const record = state.deviceAuthorizations[code];
  if (!record) {
    return sendJson(res, 404, { ok: false, error: `找不到裝置授權碼：${code}` });
  }

  if (isExpired(record)) {
    record.status = 'expired';
  }

  return sendJson(res, 200, {
    ok: true,
    device: publicDeviceView(record),
    strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
  });
}

export async function handleDevicePoll(req, res, url, store) {
  const code = sanitizeText(url.searchParams.get('code') || '', 32).toUpperCase();
  const secret = sanitizeText(url.searchParams.get('secret') || '', 128);
  if (!code || !secret) {
    return sendJson(res, 400, { ok: false, error: '輪詢必須提供 code 與 secret 參數' });
  }

  const state = await store.load();
  ensureStateSchema(state);
  const record = state.deviceAuthorizations[code];
  if (!record) {
    return sendJson(res, 404, { ok: false, error: `找不到裝置授權碼：${code}` });
  }

  const a = Buffer.from(secret);
  const b = Buffer.from(record.deviceSecret || '');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return sendJson(res, 401, { ok: false, error: '裝置驗證金鑰 (deviceSecret) 不符' });
  }

  if (isExpired(record)) {
    record.status = 'expired';
  }

  return sendJson(res, 200, {
    ok: true,
    code: record.code,
    status: record.status,
    workerId: record.workerId || null,
    workerName: record.workerName || null,
    userId: record.userId || null,
    userName: record.userName || null,
    expiresAt: record.expiresAt,
    approvedAt: record.approvedAt || null,
    reviewedAt: record.reviewedAt || null,
    strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
  });
}

export async function handleDeviceApprove(req, res, body, store, sseHub) {
  const code = sanitizeText(body?.code, 32).toUpperCase();
  if (!code) {
    return sendJson(res, 400, { ok: false, error: '請提供裝置授權碼 code' });
  }

  const requestedRole = sanitizeText(body?.workerRoleClass || 'pro_architect', 32);
  const validTemplate = WORKER_TEMPLATES.find((t) => t.roleClass === requestedRole) || WORKER_TEMPLATES[1];
  const workerName = sanitizeText(body?.workerName, 32);
  const bindWorkerId = sanitizeText(body?.bindWorkerId, 48) || null;

  let errStatus = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    const user = ctx.user;
    const record = s.deviceAuthorizations[code];

    if (!record) {
      errStatus = 404;
      errMessage = `找不到裝置授權碼：${code}`;
      return null;
    }
    if (isExpired(record) || record.status === 'expired') {
      record.status = 'expired';
      errStatus = 410;
      errMessage = `裝置授權碼 ${code} 已過期，請在終端重新執行 onboard`;
      return null;
    }
    if (record.status === 'approved') {
      errStatus = 409;
      errMessage = `裝置授權碼 ${code} 已核准綁定`;
      return null;
    }
    if (record.status === 'rejected') {
      errStatus = 409;
      errMessage = `裝置授權碼 ${code} 已被拒絕`;
      return null;
    }

    record.userId = user.id;
    record.userName = user.displayName;
    record.workerRoleClass = validTemplate.roleClass;
    record.workerName = workerName || record.workerName || null;
    record.bindWorkerId = bindWorkerId;

    if (s.settings?.strictDeviceReview === true) {
      record.status = 'pending_review';
      pushFeed(s, {
        type: 'device',
        icon: '🛡️',
        message: `${user.displayName} 提交本機裝置【${record.deviceName}】(${record.code}) 進入鎮長人工審核佇列`,
      });
      return {
        status: 'pending_review',
        requiresAdminReview: true,
        device: publicDeviceView(record),
        worker: null,
        userId: user.id,
      };
    }

    const worker = finalizeDeviceApproval(s, record, user);
    return {
      status: 'approved',
      requiresAdminReview: false,
      device: publicDeviceView(record),
      worker,
      userId: user.id,
    };
  });

  if (errStatus) {
    return sendJson(res, errStatus, { ok: false, error: errMessage });
  }

  sseHub?.broadcast(result.status === 'approved' ? 'device_approved' : 'device_pending_review', {
    device: result.device,
    worker: result.worker,
  });
  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });

  return sendJson(res, 200, {
    ok: true,
    status: result.status,
    requiresAdminReview: result.requiresAdminReview,
    device: result.device,
    worker: result.worker,
    state: projectStateForUser(state, result.userId),
  });
}

export async function handleAdminDeviceReview(req, res, codeParam, body, store, sseHub) {
  const code = sanitizeText(codeParam, 32).toUpperCase();
  const action = String(body?.action || '').toLowerCase();
  const note = sanitizeText(body?.note, 120);

  if (action !== 'approve' && action !== 'reject') {
    return sendJson(res, 400, { ok: false, error: 'action 必須為 approve 或 reject' });
  }

  let errStatus = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    if (ctx.user.role !== 'founder') {
      errStatus = 403;
      errMessage = '僅限創始鎮長審核本機裝置綁定';
      return null;
    }

    const record = s.deviceAuthorizations[code];
    if (!record) {
      errStatus = 404;
      errMessage = `找不到裝置授權碼：${code}`;
      return null;
    }

    const now = new Date().toISOString();
    record.reviewedAt = now;
    record.reviewNote = note || null;

    if (action === 'reject') {
      record.status = 'rejected';
      pushFeed(s, {
        type: 'device',
        icon: '🚫',
        message: `鎮長已拒絕裝置【${record.deviceName}】(${record.code}) 的綁定申請`,
      });
      return {
        status: 'rejected',
        device: publicDeviceView(record),
        worker: null,
        userId: ctx.userId,
      };
    }

    const targetUser = s.users[record.userId] || s.users[FOUNDER_USER_ID];
    const worker = finalizeDeviceApproval(s, record, targetUser);
    return {
      status: 'approved',
      device: publicDeviceView(record),
      worker,
      userId: ctx.userId,
    };
  });

  if (errStatus) {
    return sendJson(res, errStatus, { ok: false, error: errMessage });
  }

  sseHub?.broadcast('device_reviewed', {
    status: result.status,
    device: result.device,
    worker: result.worker,
  });
  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });

  return sendJson(res, 200, {
    ok: true,
    status: result.status,
    device: result.device,
    worker: result.worker,
    state: projectStateForUser(state, result.userId),
  });
}

export async function handleAdminSettings(req, res, body, store, sseHub) {
  let errStatus = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    if (ctx.user.role !== 'founder') {
      errStatus = 403;
      errMessage = '僅限創始鎮長修改管理設定';
      return null;
    }

    if (typeof body?.strictDeviceReview === 'boolean') {
      s.settings.strictDeviceReview = body.strictDeviceReview;
      pushFeed(s, {
        type: 'admin',
        icon: '🛡️',
        message: s.settings.strictDeviceReview
          ? '鎮長已開啟「嚴格裝置審核模式」：新綁定本機裝置需經人工核准'
          : '鎮長已切換為「自助即時核准模式」：新本機裝置確認後立即上線',
      });
    }

    return {
      settings: { strictDeviceReview: Boolean(s.settings.strictDeviceReview) },
      userId: ctx.userId,
    };
  });

  if (errStatus) {
    return sendJson(res, errStatus, { ok: false, error: errMessage });
  }

  sseHub?.broadcast('settings_updated', result.settings);
  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });

  return sendJson(res, 200, {
    ok: true,
    settings: result.settings,
    state: projectStateForUser(state, result.userId),
  });
}
