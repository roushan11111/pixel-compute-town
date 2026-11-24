// PixelCompute Town — GitHub OAuth + Zero-Config Founder Demo Session Auth

import crypto from 'node:crypto';

const SESSION_COOKIE = 'pct_session';
const OAUTH_STATE_COOKIE = 'pct_oauth_state';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const sessions = new Map();

export function isGitHubOAuthEnabled() {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

function signValue(value) {
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
  return `${value}.${sig}`;
}

function verifySignedValue(signed) {
  if (!signed || typeof signed !== 'string') return null;
  const idx = signed.lastIndexOf('.');
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  return value;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const map = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) {
      map[k] = decodeURIComponent(v);
    }
  }
  return map;
}

function buildCookieHeader(name, value, maxAgeSeconds = 60 * 60 * 24 * 7) {
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

function getBaseUrl(req) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, '');
  }
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || `localhost:${process.env.PORT || 3456}`;
  return `${proto}://${host}`;
}

export function getDemoUserFromState(state) {
  const p = state?.player || {};
  return {
    id: p.id || 'founder-demo',
    username: p.username || 'founder-dev',
    displayName: p.displayName || '創始鎮長 (Demo)',
    avatarUrl: p.avatarUrl || '',
    authMode: p.authMode || 'demo',
    isAuthenticated: true,
  };
}

export function getSessionUser(req, state) {
  const cookies = parseCookies(req);
  const sessionId = verifySignedValue(cookies[SESSION_COOKIE]);
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }
  return getDemoUserFromState(state);
}

export function handleGitHubLogin(req, res) {
  if (!isGitHubOAuthEnabled()) {
    const wantsJson = (req.headers.accept || '').includes('application/json');
    if (wantsJson) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ok: true,
        githubOAuthEnabled: false,
        authMode: 'demo',
        message: '尚未設定 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET，已自動啟用創始開發者 Demo 模式。',
      }));
      return;
    }
    res.writeHead(302, { Location: '/?auth=demo' });
    res.end();
    return;
  }

  const oauthState = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${getBaseUrl(req)}/api/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state: oauthState,
  });

  res.writeHead(302, {
    'Set-Cookie': buildCookieHeader(OAUTH_STATE_COOKIE, signValue(oauthState), 600),
    Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
  });
  res.end();
}

export async function handleGitHubCallback(req, res, url, store) {
  if (!isGitHubOAuthEnabled()) {
    res.writeHead(302, { Location: '/?auth=demo' });
    res.end();
    return;
  }

  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const cookies = parseCookies(req);
  const expectedState = verifySignedValue(cookies[OAUTH_STATE_COOKIE]);

  if (!code || !returnedState || returnedState !== expectedState) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'GitHub OAuth 驗證狀態無效或已過期，請重新登入' }));
    return;
  }

  const redirectUri = `${getBaseUrl(req)}/api/auth/github/callback`;
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
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: tokenData.error_description || '無法取得 GitHub Access Token' }));
    return;
  }

  const profileRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'PixelCompute-Town',
    },
  });

  if (!profileRes.ok) {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: '無法從 GitHub 取得用戶資料' }));
    return;
  }

  const profile = await profileRes.json();
  const user = {
    id: `gh-${profile.id}`,
    username: profile.login,
    displayName: profile.name || profile.login,
    avatarUrl: profile.avatar_url || '',
    githubUrl: profile.html_url || `https://github.com/${profile.login}`,
    authMode: 'github',
    isAuthenticated: true,
  };

  const sessionId = crypto.randomBytes(24).toString('hex');
  sessions.set(sessionId, user);

  await store.mutate((state) => {
    const oldId = state.player.id;
    state.player.id = user.id;
    state.player.username = user.username;
    state.player.displayName = user.displayName;
    state.player.avatarUrl = user.avatarUrl;
    state.player.authMode = 'github';

    // Migrate current player's leaderboard & project ownership smoothly
    for (const row of state.leaderboard) {
      if (row.isCurrentUser || row.userId === oldId) {
        row.userId = user.id;
        row.displayName = user.displayName;
        row.handle = `@${user.username}`;
      }
    }
    for (const proj of state.projects) {
      if (proj.creatorId === oldId) {
        proj.creatorId = user.id;
        proj.creatorName = user.displayName;
      }
      if (proj.contributions && proj.contributions[oldId] != null && oldId !== user.id) {
        proj.contributions[user.id] = (proj.contributions[user.id] || 0) + proj.contributions[oldId];
        delete proj.contributions[oldId];
        proj.contributorNames[user.id] = user.displayName;
      }
    }
  });

  res.writeHead(302, {
    'Set-Cookie': [
      buildCookieHeader(SESSION_COOKIE, signValue(sessionId), 60 * 60 * 24 * 7),
      buildCookieHeader(OAUTH_STATE_COOKIE, '', 0),
    ],
    Location: '/?auth=github_ok',
  });
  res.end();
}

export async function handleDemoLogin(req, res, body, store) {
  const cookies = parseCookies(req);
  const existingSid = verifySignedValue(cookies[SESSION_COOKIE]);
  if (existingSid) {
    sessions.delete(existingSid);
  }

  const customName = typeof body?.displayName === 'string' ? body.displayName.trim().slice(0, 32) : '';

  const { state } = await store.mutate((s) => {
    s.player.authMode = 'demo';
    if (customName) {
      s.player.displayName = customName;
      for (const row of s.leaderboard) {
        if (row.isCurrentUser || row.userId === s.player.id) {
          row.displayName = customName;
        }
      }
    }
  });

  const user = getDemoUserFromState(state);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Set-Cookie': buildCookieHeader(SESSION_COOKIE, '', 0),
  });
  res.end(JSON.stringify({ ok: true, user, state }));
}

export async function handleLogout(req, res, store) {
  const cookies = parseCookies(req);
  const existingSid = verifySignedValue(cookies[SESSION_COOKIE]);
  if (existingSid) {
    sessions.delete(existingSid);
  }

  const { state } = await store.mutate((s) => {
    s.player.authMode = 'demo';
    if (s.player.id.startsWith('gh-')) {
      s.player.displayName = '創始鎮長 (Demo)';
      s.player.username = 'founder-dev';
      s.player.avatarUrl = '';
    }
  });

  const user = getDemoUserFromState(state);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Set-Cookie': buildCookieHeader(SESSION_COOKIE, '', 0),
  });
  res.end(JSON.stringify({ ok: true, user, message: '已登出 GitHub，返回創始開發者 Demo 模式' }));
}
