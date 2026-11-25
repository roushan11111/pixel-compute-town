// PixelCompute Town — Multi-User Auth (Email+Password scrypt, GitHub & Google OAuth, Persistent Sessions)

import crypto from 'node:crypto';
import {
  createInitialAchievements,
  createStarterWorkersForUser,
  ensureStateSchema,
  round2,
} from './seed.mjs';

export const FOUNDER_USER_ID = 'founder-demo';
const SESSION_COOKIE = 'pct_session';
const OAUTH_STATE_COOKIE = 'pct_oauth_state';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function getAdminGithubLogins() {
  const raw = process.env.ADMIN_GITHUB_LOGINS || 'roushan11111';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isFounderAdmin(req, ctx) {
  const adminSecret = (process.env.ADMIN_SECRET || '').trim();
  if (adminSecret && req?.headers) {
    const provided = String(req.headers['x-admin-key'] || '').trim();
    if (provided && provided.length === adminSecret.length) {
      const a = Buffer.from(provided);
      const b = Buffer.from(adminSecret);
      if (crypto.timingSafeEqual(a, b)) return true;
    }
  }

  const user = ctx?.user;
  if (!user) return false;

  const ghLogins = getAdminGithubLogins();
  if (user.authMode === 'github' && user.username && ghLogins.has(String(user.username).toLowerCase())) {
    return true;
  }

  const adminEmails = getAdminEmails();
  if (user.email && adminEmails.has(String(user.email).toLowerCase())) {
    return true;
  }

  // In production, unauthenticated Demo fallback does NOT grant access to sensitive founder analytics
  if (process.env.NODE_ENV === 'production') {
    return Boolean(user.role === 'founder' && !ctx?.isGuestDemo);
  }
  return user.role === 'founder';
}

export function isGitHubOAuthEnabled() {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function isGoogleOAuthEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getRequestOrigin(req) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, '');
  }
  const forwardedProto = typeof req.headers['x-forwarded-proto'] === 'string'
    ? req.headers['x-forwarded-proto'].split(',')[0].trim()
    : '';
  const proto = forwardedProto || 'http';
  const host = req.headers.host || `localhost:${process.env.PORT || 3456}`;
  return `${proto}://${host}`;
}

function getSessionSecret(state) {
  return process.env.SESSION_SECRET || state?.settings?.sessionSecret || FALLBACK_SECRET;
}

function signValue(value, secret) {
  const sig = crypto.createHmac('sha256', secret).update(value).digest('base64url');
  return `${value}.${sig}`;
}

function verifySignedValue(signed, secret) {
  if (!signed || typeof signed !== 'string') return null;
  const idx = signed.lastIndexOf('.');
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', secret).update(value).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  return value;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  try {
    const derived = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const map = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) {
      try {
        map[k] = decodeURIComponent(v);
      } catch {
        map[k] = v;
      }
    }
  }
  return map;
}

function buildCookieHeader(name, value, maxAgeSeconds = SESSION_TTL_SECONDS) {
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (process.env.NODE_ENV === 'production') {
    attrs.push('Secure');
  }
  return attrs.join('; ');
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function sanitizeDisplayName(raw, fallback = 'Town Builder') {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F-\u009F\r\n\t]/g, ' ')
    .trim()
    .slice(0, 32);
  return cleaned || fallback;
}

function makeUsernameFromEmail(email) {
  const local = String(email || 'builder').split('@')[0] || 'builder';
  const slug = local.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 18) || 'builder';
  return slug;
}

export function sanitizeUserForClient(user) {
  if (!user) return null;
  const isDemo = user.id === FOUNDER_USER_ID && user.authMode === 'demo';
  return {
    id: user.id,
    email: user.email || '',
    username: user.username || 'builder',
    displayName: user.displayName || '創始鎮長 (Demo)',
    avatarUrl: user.avatarUrl || '',
    role: user.role || 'user',
    authMode: user.authMode || 'demo',
    isAuthenticated: !isDemo,
    isDemo,
    isPro: Boolean(user.isPro),
    walletAddress: user.walletAddress || '',
    walletChain: user.walletChain || '',
  };
}

export function projectPlayerForClient(user) {
  return {
    id: user.id,
    email: user.email || '',
    username: user.username || 'builder',
    displayName: user.displayName || '創始鎮長 (Demo)',
    avatarUrl: user.avatarUrl || '',
    role: user.role || 'user',
    authMode: user.authMode || 'demo',
    gold: Number(user.gold || 0),
    usdBalance: round2(user.usdBalance || 0),
    reputation: Number(user.reputation ?? 100),
    completedTasks: Number(user.completedTasks || 0),
    totalContribution: Number(user.totalContribution || 0),
    isPro: Boolean(user.isPro),
    ownedSkins: Array.isArray(user.ownedSkins) ? user.ownedSkins : ['default'],
    ownedDecor: Array.isArray(user.ownedDecor) ? user.ownedDecor : [],
    ownedItems: Array.isArray(user.ownedItems) ? user.ownedItems : [],
    votedProjectIds: Array.isArray(user.votedProjectIds) ? user.votedProjectIds : [],
    autoPilotEnabled: Boolean(user.autoPilotEnabled),
    walletAddress: user.walletAddress || '',
    walletChain: user.walletChain || '',
  };
}

export function syncUserLeaderboard(state, user) {
  if (!state || !Array.isArray(state.leaderboard) || !user) return;
  let row = state.leaderboard.find((r) => r.userId === user.id);
  const defaultBadge = user.role === 'founder' ? '創始鎮長' : '像素鎮民';
  if (!row) {
    row = {
      userId: user.id,
      displayName: user.displayName,
      handle: `@${user.username}`,
      reputation: user.reputation,
      completedTasks: user.completedTasks,
      contributionPoints: user.totalContribution,
      earnedUsd: round2(user.usdBalance),
      badge: user.isPro ? '創世 PRO' : defaultBadge,
      isCurrentUser: false,
    };
    state.leaderboard.push(row);
  } else {
    row.displayName = user.displayName;
    row.handle = `@${user.username}`;
    row.reputation = user.reputation;
    row.completedTasks = user.completedTasks;
    row.contributionPoints = user.totalContribution;
    row.earnedUsd = round2(user.usdBalance);
    row.badge = user.isPro ? '創世 PRO' : (row.badge || defaultBadge);
  }

  state.leaderboard.sort((a, b) => {
    if (b.contributionPoints !== a.contributionPoints) {
      return b.contributionPoints - a.contributionPoints;
    }
    return b.earnedUsd - a.earnedUsd;
  });
}

export function getActiveUserContext(req, state) {
  ensureStateSchema(state);
  const secret = getSessionSecret(state);
  const cookies = parseCookies(req);
  const sessionId = verifySignedValue(cookies[SESSION_COOKIE], secret);

  if (sessionId && state.sessions && state.sessions[sessionId]) {
    const sess = state.sessions[sessionId];
    const notExpired = !sess.expiresAt || Date.parse(sess.expiresAt) > Date.now();
    const user = notExpired ? state.users[sess.userId] : null;
    if (user) {
      return {
        user,
        userId: user.id,
        sessionId,
        isGuestDemo: user.id === FOUNDER_USER_ID && user.authMode === 'demo',
      };
    }
  }

  const founder = state.users[FOUNDER_USER_ID];
  return {
    user: founder,
    userId: founder.id,
    sessionId: null,
    isGuestDemo: true,
  };
}

export function getSessionUser(req, state) {
  const ctx = getActiveUserContext(req, state);
  return sanitizeUserForClient(ctx.user);
}

export function projectStateForUser(state, userId) {
  ensureStateSchema(state);
  const user = state.users[userId] || state.users[FOUNDER_USER_ID];

  return {
    version: state.version,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    player: projectPlayerForClient(user),
    workers: user.workers,
    achievements: user.achievements,
    projects: state.projects,
    tasks: state.tasks,
    leaderboard: (state.leaderboard || []).map((row) => ({
      ...row,
      isCurrentUser: row.userId === user.id,
    })),
    contributionLedger: state.contributionLedger || [],
    dividendLedger: state.dividendLedger || [],
    founderRevenue: state.founderRevenue,
    activityFeed: state.activityFeed || [],
    payouts: (state.payouts || []).filter((p) => p.userId === user.id),
    paymentOrders: (state.paymentOrders || []).filter((o) => o.userId === user.id).slice(0, 20),
    settings: {
      strictDeviceReview: Boolean(state.settings?.strictDeviceReview),
    },
  };
}

function createPersistedSession(state, userId) {
  const sessionId = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  state.sessions = state.sessions || {};
  state.sessions[sessionId] = {
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_SECONDS * 1000).toISOString(),
  };

  // Light cleanup of expired sessions
  const keys = Object.keys(state.sessions);
  if (keys.length > 200) {
    for (const k of keys) {
      const s = state.sessions[k];
      if (!s || (s.expiresAt && Date.parse(s.expiresAt) <= now)) {
        delete state.sessions[k];
      }
    }
  }
  return sessionId;
}

function createNewUserRecord({ id, email, username, displayName, avatarUrl = '', authMode, passwordHash = null, role = 'user' }) {
  const now = new Date().toISOString();
  return {
    id,
    email: email || '',
    username,
    displayName,
    avatarUrl,
    role,
    authMode,
    passwordHash,
    gold: 300,
    usdBalance: 0,
    reputation: 100,
    completedTasks: 0,
    totalContribution: 0,
    isPro: false,
    ownedSkins: ['default'],
    ownedDecor: [],
    ownedItems: [],
    votedProjectIds: [],
    autoPilotEnabled: false,
    walletAddress: '',
    walletChain: '',
    achievements: createInitialAchievements(),
    workers: createStarterWorkersForUser(id),
    createdAt: now,
  };
}

export async function handleRegister(req, res, body, store) {
  const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const displayName = sanitizeDisplayName(body?.displayName, rawEmail.split('@')[0] || 'Town Builder');

  if (!EMAIL_REGEX.test(rawEmail)) {
    return sendJson(res, 400, { ok: false, error: '請輸入有效的電子信箱格式' });
  }
  if (password.length < 6 || password.length > 128) {
    return sendJson(res, 400, { ok: false, error: '密碼長度需為 6 至 128 個字元' });
  }

  let conflict = false;
  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const existing = Object.values(s.users).find(
      (u) => u.email && u.email.toLowerCase() === rawEmail && u.authMode === 'email',
    );
    if (existing) {
      conflict = true;
      return null;
    }

    const userId = `usr-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const baseUsername = makeUsernameFromEmail(rawEmail);
    const taken = Object.values(s.users).some((u) => u.username === baseUsername);
    const username = taken ? `${baseUsername}-${crypto.randomBytes(2).toString('hex')}` : baseUsername;

    const newUser = createNewUserRecord({
      id: userId,
      email: rawEmail,
      username,
      displayName,
      authMode: 'email',
      passwordHash: hashPassword(password),
      role: 'user',
    });

    s.users[userId] = newUser;
    syncUserLeaderboard(s, newUser);
    s.activityFeed.unshift({
      id: `act-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`,
      timestamp: new Date().toISOString(),
      type: 'auth',
      icon: '🎉',
      message: `歡迎新鎮民【${newUser.displayName}】加入像素算力鎮！`,
    });
    if (s.activityFeed.length > 60) s.activityFeed.length = 60;

    const sessionId = createPersistedSession(s, userId);
    return { user: newUser, sessionId };
  });

  if (conflict || !result) {
    return sendJson(res, 409, { ok: false, error: '此電子信箱已被註冊，請改用登入或更換信箱' });
  }

  const secret = getSessionSecret(state);
  const cookieHeader = buildCookieHeader(SESSION_COOKIE, signValue(result.sessionId, secret), SESSION_TTL_SECONDS);
  return sendJson(res, 201, {
    ok: true,
    user: sanitizeUserForClient(result.user),
    state: projectStateForUser(state, result.user.id),
  }, { 'Set-Cookie': cookieHeader });
}

export async function handleLogin(req, res, body, store) {
  const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!rawEmail || !password) {
    return sendJson(res, 400, { ok: false, error: '請輸入電子信箱與密碼' });
  }

  let authError = null;
  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const user = Object.values(s.users).find(
      (u) => u.email && u.email.toLowerCase() === rawEmail && u.passwordHash,
    );
    if (!user || !verifyPassword(password, user.passwordHash)) {
      authError = '電子信箱或密碼錯誤';
      return null;
    }

    const sessionId = createPersistedSession(s, user.id);
    return { user, sessionId };
  });

  if (authError || !result) {
    return sendJson(res, 401, { ok: false, error: authError || '登入失敗' });
  }

  const secret = getSessionSecret(state);
  const cookieHeader = buildCookieHeader(SESSION_COOKIE, signValue(result.sessionId, secret), SESSION_TTL_SECONDS);
  return sendJson(res, 200, {
    ok: true,
    user: sanitizeUserForClient(result.user),
    state: projectStateForUser(state, result.user.id),
  }, { 'Set-Cookie': cookieHeader });
}

export async function handleMe(req, res, store) {
  const state = await store.load();
  const ctx = getActiveUserContext(req, state);
  return sendJson(res, 200, {
    ok: true,
    user: sanitizeUserForClient(ctx.user),
    isGuestDemo: ctx.isGuestDemo,
    state: projectStateForUser(state, ctx.userId),
  });
}

export async function handleDemoLogin(req, res, body, store) {
  const customName = typeof body?.displayName === 'string' ? sanitizeDisplayName(body.displayName, '') : '';

  const { state } = await store.mutate((s) => {
    ensureStateSchema(s);
    const secret = getSessionSecret(s);
    const cookies = parseCookies(req);
    const existingSid = verifySignedValue(cookies[SESSION_COOKIE], secret);
    if (existingSid && s.sessions && s.sessions[existingSid]) {
      delete s.sessions[existingSid];
    }

    const founder = s.users[FOUNDER_USER_ID];
    founder.authMode = 'demo';
    if (customName) {
      founder.displayName = customName;
      syncUserLeaderboard(s, founder);
    }
  });

  const founder = state.users[FOUNDER_USER_ID];
  return sendJson(res, 200, {
    ok: true,
    user: sanitizeUserForClient(founder),
    state: projectStateForUser(state, founder.id),
  }, { 'Set-Cookie': buildCookieHeader(SESSION_COOKIE, '', 0) });
}

export async function handleLogout(req, res, store) {
  const { state } = await store.mutate((s) => {
    ensureStateSchema(s);
    const secret = getSessionSecret(s);
    const cookies = parseCookies(req);
    const existingSid = verifySignedValue(cookies[SESSION_COOKIE], secret);
    if (existingSid && s.sessions && s.sessions[existingSid]) {
      delete s.sessions[existingSid];
    }
  });

  const founder = state.users[FOUNDER_USER_ID];
  return sendJson(res, 200, {
    ok: true,
    user: sanitizeUserForClient(founder),
    state: projectStateForUser(state, founder.id),
    message: '已登出帳號，返回創始開發者 Demo 模式',
  }, { 'Set-Cookie': buildCookieHeader(SESSION_COOKIE, '', 0) });
}

export async function handleGitHubLogin(req, res, store) {
  if (!isGitHubOAuthEnabled()) {
    const wantsJson = (req.headers.accept || '').includes('application/json');
    if (wantsJson) {
      return sendJson(res, 200, {
        ok: true,
        githubOAuthEnabled: false,
        authMode: 'demo',
        message: '尚未設定 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET，已自動啟用創始開發者 Demo 模式。',
      });
    }
    res.writeHead(302, { Location: '/app?auth=github_unconfigured' });
    res.end();
    return;
  }

  const state = await store.load();
  const secret = getSessionSecret(state);
  const oauthState = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${getRequestOrigin(req)}/api/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state: oauthState,
  });

  res.writeHead(302, {
    'Set-Cookie': buildCookieHeader(OAUTH_STATE_COOKIE, signValue(oauthState, secret), 600),
    Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
  });
  res.end();
}

export async function handleGitHubCallback(req, res, url, store) {
  if (!isGitHubOAuthEnabled()) {
    res.writeHead(302, { Location: '/app?auth=github_unconfigured' });
    res.end();
    return;
  }

  const loaded = await store.load();
  const secret = getSessionSecret(loaded);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const cookies = parseCookies(req);
  const expectedState = verifySignedValue(cookies[OAUTH_STATE_COOKIE], secret);

  if (!code || !returnedState || returnedState !== expectedState) {
    return sendJson(res, 400, { ok: false, error: 'GitHub OAuth 驗證狀態無效或已過期，請重新登入' });
  }

  const redirectUri = `${getRequestOrigin(req)}/api/auth/github/callback`;
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'PixelCompute-Town',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return sendJson(res, 401, { ok: false, error: tokenData.error_description || '無法取得 GitHub Access Token' });
  }

  const profileRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'PixelCompute-Town',
    },
  });

  if (!profileRes.ok) {
    return sendJson(res, 502, { ok: false, error: '無法從 GitHub 取得用戶資料' });
  }

  const profile = await profileRes.json();
  const userId = `gh-${profile.id}`;
  const displayName = sanitizeDisplayName(profile.name || profile.login, profile.login || 'GitHub Builder');

  const { state, result: sessionId } = await store.mutate((s) => {
    ensureStateSchema(s);
    const loginLower = String(profile.login || '').toLowerCase();
    const isAdminLogin = getAdminGithubLogins().has(loginLower);
    let u = s.users[userId];
    if (!u) {
      u = createNewUserRecord({
        id: userId,
        email: profile.email || '',
        username: profile.login || userId,
        displayName,
        avatarUrl: profile.avatar_url || '',
        authMode: 'github',
        role: isAdminLogin ? 'founder' : 'user',
      });
      s.users[userId] = u;
    } else {
      u.displayName = displayName;
      u.username = profile.login || u.username;
      u.avatarUrl = profile.avatar_url || u.avatarUrl;
      u.email = profile.email || u.email;
      u.authMode = 'github';
      if (isAdminLogin) u.role = 'founder';
    }
    syncUserLeaderboard(s, u);
    return createPersistedSession(s, userId);
  });

  const finalSecret = getSessionSecret(state);
  res.writeHead(302, {
    'Set-Cookie': [
      buildCookieHeader(SESSION_COOKIE, signValue(sessionId, finalSecret), SESSION_TTL_SECONDS),
      buildCookieHeader(OAUTH_STATE_COOKIE, '', 0),
    ],
    Location: '/app?auth=github_ok',
  });
  res.end();
}

export async function handleGoogleLogin(req, res, store) {
  if (!isGoogleOAuthEnabled()) {
    const wantsJson = (req.headers.accept || '').includes('application/json');
    if (wantsJson) {
      return sendJson(res, 200, {
        ok: false,
        googleOAuthEnabled: false,
        authMode: 'demo',
        message: '尚未設定 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET，請改用信箱註冊或 Demo 模式體驗。',
      });
    }
    res.writeHead(302, { Location: '/app?auth=google_unconfigured' });
    res.end();
    return;
  }

  const state = await store.load();
  const secret = getSessionSecret(state);
  const oauthState = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${getRequestOrigin(req)}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state: oauthState,
  });

  res.writeHead(302, {
    'Set-Cookie': buildCookieHeader(OAUTH_STATE_COOKIE, signValue(oauthState, secret), 600),
    Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  });
  res.end();
}

export async function handleGoogleCallback(req, res, url, store) {
  if (!isGoogleOAuthEnabled()) {
    res.writeHead(302, { Location: '/app?auth=google_unconfigured' });
    res.end();
    return;
  }

  const loaded = await store.load();
  const secret = getSessionSecret(loaded);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const cookies = parseCookies(req);
  const expectedState = verifySignedValue(cookies[OAUTH_STATE_COOKIE], secret);

  if (!code || !returnedState || returnedState !== expectedState) {
    return sendJson(res, 400, { ok: false, error: 'Google OAuth 驗證狀態無效或已過期，請重新登入' });
  }

  const redirectUri = `${getRequestOrigin(req)}/api/auth/google/callback`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return sendJson(res, 401, { ok: false, error: tokenData.error_description || '無法取得 Google Access Token' });
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileRes.ok) {
    return sendJson(res, 502, { ok: false, error: '無法從 Google 取得用戶資料' });
  }

  const profile = await profileRes.json();
  const userId = `google-${profile.sub}`;
  const email = (profile.email || '').toLowerCase();
  const displayName = sanitizeDisplayName(profile.name || email.split('@')[0], 'Google Builder');

  const { state, result: sessionId } = await store.mutate((s) => {
    ensureStateSchema(s);
    let u = s.users[userId];
    if (!u) {
      u = createNewUserRecord({
        id: userId,
        email,
        username: makeUsernameFromEmail(email || userId),
        displayName,
        avatarUrl: profile.picture || '',
        authMode: 'google',
        role: 'user',
      });
      s.users[userId] = u;
    } else {
      u.displayName = displayName;
      u.avatarUrl = profile.picture || u.avatarUrl;
      u.email = email || u.email;
      u.authMode = 'google';
    }
    syncUserLeaderboard(s, u);
    return createPersistedSession(s, userId);
  });

  const finalSecret = getSessionSecret(state);
  res.writeHead(302, {
    'Set-Cookie': [
      buildCookieHeader(SESSION_COOKIE, signValue(sessionId, finalSecret), SESSION_TTL_SECONDS),
      buildCookieHeader(OAUTH_STATE_COOKIE, '', 0),
    ],
    Location: '/app?auth=google_ok',
  });
  res.end();
}
