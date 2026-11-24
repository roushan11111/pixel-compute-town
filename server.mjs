// PixelCompute Town — Zero-Dependency Node.js HTTP + REST + SSE Server

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
  generateTasksForProject,
  round2,
} from './src/server/seed.mjs';
import { createStore } from './src/server/store.mjs';
import { verifySubmission, validateGitHubPrUrl } from './src/server/verifier.mjs';
import {
  getSessionUser,
  handleDemoLogin,
  handleGitHubCallback,
  handleGitHubLogin,
  handleLogout,
  isGitHubOAuthEnabled,
} from './src/server/auth.mjs';
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

async function parseJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw new HttpError(413, '請求內容超過 2MB 大小限制');
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
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

function syncPlayerLeaderboard(state) {
  const p = state.player;
  let row = state.leaderboard.find((r) => r.isCurrentUser || r.userId === p.id);
  if (!row) {
    row = {
      userId: p.id,
      displayName: p.displayName,
      handle: `@${p.username}`,
      reputation: p.reputation,
      completedTasks: p.completedTasks,
      contributionPoints: p.totalContribution,
      earnedUsd: p.usdBalance,
      badge: p.isPro ? '創世 PRO' : '創始鎮長',
      isCurrentUser: true,
    };
    state.leaderboard.push(row);
  } else {
    row.userId = p.id;
    row.displayName = p.displayName;
    row.handle = `@${p.username}`;
    row.reputation = p.reputation;
    row.completedTasks = p.completedTasks;
    row.contributionPoints = p.totalContribution;
    row.earnedUsd = round2(p.usdBalance);
    row.badge = p.isPro ? '創世 PRO' : (row.badge || '創始鎮長');
    row.isCurrentUser = true;
  }

  state.leaderboard.sort((a, b) => {
    if (b.contributionPoints !== a.contributionPoints) {
      return b.contributionPoints - a.contributionPoints;
    }
    return b.earnedUsd - a.earnedUsd;
  });
}

function distributeProjectRevenue(state, project, grossRevenueUsd, label) {
  const gross = round2(grossRevenueUsd);
  const creatorShareUsd = round2(gross * (REVENUE_SPLIT.creatorPct / 100));
  const platformCarryUsd = round2(gross * (REVENUE_SPLIT.platformPct / 100));
  const contributorsPoolUsd = round2(gross - creatorShareUsd - platformCarryUsd);

  const payouts = [];
  let playerShareUsd = 0;

  // 1) Creator 30%
  payouts.push({
    userId: project.creatorId,
    userName: project.creatorName,
    role: 'creator',
    sharePct: REVENUE_SPLIT.creatorPct,
    amountUsd: creatorShareUsd,
  });

  if (project.creatorId === state.player.id) {
    playerShareUsd = round2(playerShareUsd + creatorShareUsd);
  } else {
    const npcRow = state.leaderboard.find((r) => r.userId === project.creatorId);
    if (npcRow) {
      npcRow.earnedUsd = round2(npcRow.earnedUsd + creatorShareUsd);
    }
  }

  // 2) Contributors 60% proportional to contribution points
  const entries = Object.entries(project.contributions || {})
    .filter(([, pts]) => Number(pts) > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalPoints = entries.reduce((sum, [, pts]) => sum + Number(pts), 0);

  if (totalPoints > 0 && entries.length > 0) {
    let allocated = 0;
    const contribPayouts = entries.map(([userId, pts]) => {
      const ratio = Number(pts) / totalPoints;
      const amt = round2(contributorsPoolUsd * ratio);
      allocated = round2(allocated + amt);
      return {
        userId,
        userName: (project.contributorNames && project.contributorNames[userId]) || userId,
        role: 'contributor',
        points: Number(pts),
        sharePct: round2(ratio * REVENUE_SPLIT.contributorsPct),
        amountUsd: amt,
      };
    });

    // Fix any 0.01 rounding remainder on top contributor so total equals contributorsPoolUsd exactly
    const diff = round2(contributorsPoolUsd - allocated);
    if (diff !== 0 && contribPayouts.length > 0) {
      contribPayouts[0].amountUsd = round2(contribPayouts[0].amountUsd + diff);
    }

    for (const cp of contribPayouts) {
      payouts.push(cp);
      if (cp.userId === state.player.id) {
        playerShareUsd = round2(playerShareUsd + cp.amountUsd);
      } else {
        const npcRow = state.leaderboard.find((r) => r.userId === cp.userId);
        if (npcRow) {
          npcRow.earnedUsd = round2(npcRow.earnedUsd + cp.amountUsd);
        }
      }
    }
  } else {
    // Fallback if zero contributions recorded: goes to creator
    payouts[0].amountUsd = round2(payouts[0].amountUsd + contributorsPoolUsd);
    if (project.creatorId === state.player.id) {
      playerShareUsd = round2(playerShareUsd + contributorsPoolUsd);
    }
  }

  // 3) Platform 10% incubation carry
  payouts.push({
    userId: 'platform',
    userName: '像素算力鎮平臺 (Carry)',
    role: 'platform',
    sharePct: REVENUE_SPLIT.platformPct,
    amountUsd: platformCarryUsd,
  });

  if (playerShareUsd > 0) {
    state.player.usdBalance = round2(state.player.usdBalance + playerShareUsd);
  }

  project.totalRevenueUsd = round2((project.totalRevenueUsd || 0) + gross);
  project.distributedRevenueUsd = round2((project.distributedRevenueUsd || 0) + gross);

  addFounderRevenueEntry(state, {
    stream: 'incubation_carry',
    label: `《${project.shortName || project.name}》${label} 10% 平臺分成`,
    amountUsd: platformCarryUsd,
    projectId: project.id,
  });

  const dividend = {
    id: uid('div'),
    timestamp: new Date().toISOString(),
    projectId: project.id,
    projectName: project.name,
    label,
    grossRevenueUsd: gross,
    creatorShareUsd,
    contributorsPoolUsd,
    platformCarryUsd,
    playerShareUsd,
    payouts,
  };

  state.dividendLedger.unshift(dividend);
  if (state.dividendLedger.length > 60) {
    state.dividendLedger.length = 60;
  }

  syncPlayerLeaderboard(state);
  return dividend;
}

export function createAppServer(options = {}) {
  const publicDir = path.resolve(options.publicDir || DEFAULT_PUBLIC_DIR);
  const store = options.store || createStore({
    dataDir: options.dataDir,
    stateFile: options.stateFile,
  });
  const sseHub = options.sseHub || createSseHub();
  const startedAt = Date.now();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;
      const method = req.method.toUpperCase();

      // Health check
      if (pathname === '/api/health' && method === 'GET') {
        return sendJson(res, 200, {
          ok: true,
          service: 'pixel-compute-town',
          version: VERSION,
          uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
          sseClients: sseHub.getClientCount(),
          githubOAuthEnabled: isGitHubOAuthEnabled(),
          timestamp: new Date().toISOString(),
        });
      }

      // SSE event stream
      if (pathname === '/api/events' && method === 'GET') {
        return sseHub.handleConnection(req, res);
      }

      // Bootstrap payload
      if (pathname === '/api/bootstrap' && method === 'GET') {
        const state = await store.load();
        const user = getSessionUser(req, state);
        return sendJson(res, 200, {
          ok: true,
          user,
          state,
          shopItems: SHOP_ITEMS,
          workerTemplates: WORKER_TEMPLATES,
          config: {
            githubOAuthEnabled: isGitHubOAuthEnabled(),
            version: VERSION,
            platformFeePct: PLATFORM_BOUNTY_FEE_PCT,
            billboardPriceUsd: BILLBOARD_PRICE_USD,
            revenueSplit: REVENUE_SPLIT,
          },
        });
      }

      // Legacy compatibility endpoint
      if (pathname === '/api/state' && method === 'GET') {
        const state = await store.load();
        return sendJson(res, 200, { ok: true, state });
      }

      // Auth routes
      if (pathname === '/api/auth/github' && method === 'GET') {
        return handleGitHubLogin(req, res);
      }
      if (pathname === '/api/auth/github/callback' && method === 'GET') {
        return await handleGitHubCallback(req, res, url, store);
      }
      if (pathname === '/api/auth/demo' && method === 'POST') {
        const body = await parseJsonBody(req);
        return await handleDemoLogin(req, res, body, store);
      }
      if (pathname === '/api/auth/logout' && method === 'POST') {
        return await handleLogout(req, res, store);
      }

      // Workers: POST /api/workers (recruit new worker)
      if (pathname === '/api/workers' && method === 'POST') {
        const body = await parseJsonBody(req);
        const roleClass = body.roleClass || 'flash_worker';
        const template = WORKER_TEMPLATES.find((t) => t.roleClass === roleClass);
        if (!template) {
          throw new HttpError(400, `不支援的職業類型：${roleClass}`);
        }

        const { state, result: worker } = await store.mutate((s) => {
          const cost = template.recruitCostGold;
          if (s.player.gold < cost) {
            throw new HttpError(400, `金幣不足！招募 ${template.label} 需要 ${cost}G，目前僅有 ${s.player.gold}G`);
          }
          s.player.gold -= cost;

          const idx = s.workers.length + 1;
          const cleanName = (typeof body.name === 'string' && body.name.trim())
            ? body.name.trim().slice(0, 32)
            : `${template.label} #${idx}`;
          const track = body.track === 'api' || body.track === 'quota' ? body.track : template.track;
          const dailyTokenCap = Number(body.dailyTokenCap) > 0
            ? Math.round(Number(body.dailyTokenCap))
            : template.defaultCap;

          const newWorker = {
            id: uid('w'),
            name: cleanName,
            roleClass: template.roleClass,
            track,
            providerLabel: (typeof body.providerLabel === 'string' && body.providerLabel.trim())
              ? body.providerLabel.trim().slice(0, 48)
              : template.defaultProvider,
            modelHint: (typeof body.modelHint === 'string' && body.modelHint.trim())
              ? body.modelHint.trim().slice(0, 48)
              : template.defaultModelHint,
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
            skin: (body.skin && s.player.ownedSkins.includes(body.skin)) ? body.skin : 'default',
            autoMode: Boolean(body.autoMode),
            completedCount: 0,
            earnedGold: 0,
            earnedPoints: 0,
            lastMessage: `新報到的 ${template.label}，已準備好上工！`,
            lastHeartbeatAt: null,
          };

          s.workers.push(newWorker);
          pushActivity(s, {
            type: 'worker',
            icon: '👾',
            message: `招募了新算力小人【${newWorker.name}】（${template.label} / -${cost}G）`,
            workerId: newWorker.id,
          });
          return newWorker;
        });

        sseHub.broadcast('worker_updated', { action: 'created', worker });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 201, { ok: true, worker, state });
      }

      // Workers: PATCH /api/workers/:id
      const workerPatchMatch = pathname.match(/^\/api\/workers\/([^/]+)$/);
      if (workerPatchMatch && method === 'PATCH') {
        const workerId = decodeURIComponent(workerPatchMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result: worker } = await store.mutate((s) => {
          const w = s.workers.find((item) => item.id === workerId);
          if (!w) {
            throw new HttpError(404, `找不到算力小人：${workerId}`);
          }

          if (typeof body.name === 'string' && body.name.trim()) {
            w.name = body.name.trim().slice(0, 32);
          }
          if (typeof body.providerLabel === 'string' && body.providerLabel.trim()) {
            w.providerLabel = body.providerLabel.trim().slice(0, 48);
          }
          if (typeof body.modelHint === 'string' && body.modelHint.trim()) {
            w.modelHint = body.modelHint.trim().slice(0, 48);
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
            if (body.skin !== 'default' && !s.player.ownedSkins.includes(body.skin)) {
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

          return w;
        });

        sseHub.broadcast('worker_updated', { action: 'updated', worker });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, { ok: true, worker, state });
      }

      // Projects: POST /api/projects (propose new project)
      if (pathname === '/api/projects' && method === 'POST') {
        const body = await parseJsonBody(req);
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const tagline = typeof body.tagline === 'string' ? body.tagline.trim() : '';
        if (name.length < 2) {
          throw new HttpError(400, '請輸入至少 2 個字的項目名稱');
        }

        const { state, result: project } = await store.mutate((s) => {
          const votesRequired = Number(body.votesRequired) >= 2 && Number(body.votesRequired) <= 100
            ? Math.round(Number(body.votesRequired))
            : 10;
          const bountyPoolUsd = Math.max(0, round2(Number(body.bountyPoolUsd) || 0));
          const shortName = name.length > 22 ? `${name.slice(0, 22)}` : name;

          const newProj = {
            id: uid('proj'),
            name: name.slice(0, 64),
            shortName,
            tagline: (tagline || '社群共創獨立開源產品，共享 30/60/10 透明收益分紅！').slice(0, 140),
            description: (typeof body.description === 'string' && body.description.trim())
              ? body.description.trim().slice(0, 500)
              : (tagline || '由鎮民發起的孵化提案，投票達標後將自動生成雙軌算力任務。'),
            status: 'voting',
            votes: 1,
            votesRequired,
            progressPct: 0,
            creatorId: s.player.id,
            creatorName: s.player.displayName,
            repoUrl: (typeof body.repoUrl === 'string' && body.repoUrl.trim())
              ? body.repoUrl.trim().slice(0, 200)
              : '',
            bountyPoolUsd,
            revenueSplit: { ...REVENUE_SPLIT },
            totalRevenueUsd: 0,
            distributedRevenueUsd: 0,
            sponsoredBillboard: false,
            billboardText: '',
            launchedAt: null,
            createdAt: new Date().toISOString(),
            contributions: {
              [s.player.id]: 15,
            },
            contributorNames: {
              [s.player.id]: s.player.displayName,
            },
          };

          s.projects.push(newProj);
          pushActivity(s, {
            type: 'proposal',
            icon: '💡',
            message: `${s.player.displayName} 發起新項目提案《${newProj.name}》（1/${newProj.votesRequired} 票）`,
            projectId: newProj.id,
          });
          return newProj;
        });

        sseHub.broadcast('project_updated', { action: 'proposed', project });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 201, { ok: true, project, state });
      }

      // Projects: POST /api/projects/:id/vote
      const voteMatch = pathname.match(/^\/api\/projects\/([^/]+)\/vote$/);
      if (voteMatch && method === 'POST') {
        const projectId = decodeURIComponent(voteMatch[1]);

        const { state, result } = await store.mutate((s) => {
          const proj = s.projects.find((p) => p.id === projectId);
          if (!proj) {
            throw new HttpError(404, `找不到項目：${projectId}`);
          }
          if (proj.status !== 'voting') {
            throw new HttpError(400, `項目《${proj.shortName}》已進入建設或上線階段，無需再投票`);
          }

          proj.votes += 1;
          if (!s.player.votedProjectIds.includes(proj.id)) {
            s.player.votedProjectIds.push(proj.id);
          }

          let unlocked = false;
          let generatedTasks = [];

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
          } else {
            pushActivity(s, {
              type: 'vote',
              icon: '🗳️',
              message: `${s.player.displayName} 投給《${proj.shortName}》一票（目前 ${proj.votes}/${proj.votesRequired} 票）`,
              projectId: proj.id,
            });
          }

          return { project: proj, unlocked, generatedTasks };
        });

        sseHub.broadcast(result.unlocked ? 'project_unlocked' : 'project_updated', {
          project: result.project,
          unlocked: result.unlocked,
          generatedTaskCount: result.generatedTasks.length,
        });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          project: result.project,
          unlocked: result.unlocked,
          generatedTasks: result.generatedTasks,
          state,
        });
      }

      // Projects: POST /api/projects/:id/billboard
      const billboardMatch = pathname.match(/^\/api\/projects\/([^/]+)\/billboard$/);
      if (billboardMatch && method === 'POST') {
        const projectId = decodeURIComponent(billboardMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result: project } = await store.mutate((s) => {
          const proj = s.projects.find((p) => p.id === projectId);
          if (!proj) {
            throw new HttpError(404, `找不到項目：${projectId}`);
          }

          const customText = typeof body.text === 'string' && body.text.trim()
            ? body.text.trim().slice(0, 64)
            : `🔥 ${proj.shortName || proj.name} 像素廣場霓虹精選！`;

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

          return proj;
        });

        sseHub.broadcast('billboard_updated', { project, feeUsd: BILLBOARD_PRICE_USD });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          project,
          feeUsd: BILLBOARD_PRICE_USD,
          founderRevenue: state.founderRevenue,
          state,
        });
      }

      // Projects: POST /api/projects/:id/launch
      const launchMatch = pathname.match(/^\/api\/projects\/([^/]+)\/launch$/);
      if (launchMatch && method === 'POST') {
        const projectId = decodeURIComponent(launchMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
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

          const dividend = distributeProjectRevenue(s, proj, initialRevenueUsd, '首日上線營收');

          pushActivity(s, {
            type: 'launch',
            icon: '🚀',
            message: `🎆 《${proj.name}》正式發布上線！首筆營收 $${dividend.grossRevenueUsd} 已按 30/60/10 結算分紅（你實得 $${dividend.playerShareUsd}，平臺 Carry $${dividend.platformCarryUsd}）`,
            projectId: proj.id,
          });

          return { project: proj, dividend };
        });

        sseHub.broadcast('project_launched', {
          project: result.project,
          dividend: result.dividend,
        });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          project: result.project,
          dividend: result.dividend,
          founderRevenue: state.founderRevenue,
          state,
        });
      }

      // Projects: POST /api/projects/:id/simulate-revenue
      const simRevMatch = pathname.match(/^\/api\/projects\/([^/]+)\/simulate-revenue$/);
      if (simRevMatch && method === 'POST') {
        const projectId = decodeURIComponent(simRevMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
          const proj = s.projects.find((p) => p.id === projectId);
          if (!proj) {
            throw new HttpError(404, `找不到項目：${projectId}`);
          }
          if (proj.status !== 'launched') {
            throw new HttpError(400, `項目《${proj.shortName}》尚未發布上線，無法結算產品營收`);
          }

          const amountUsd = Number(body.amountUsd) > 0 ? round2(Number(body.amountUsd)) : 100;
          const dividend = distributeProjectRevenue(s, proj, amountUsd, '新進產品營收');

          pushActivity(s, {
            type: 'dividend',
            icon: '💸',
            message: `《${proj.shortName}》新增產品營收 $${dividend.grossRevenueUsd}！已即時分紅：你實得 +$${dividend.playerShareUsd}，平臺 Carry +$${dividend.platformCarryUsd}`,
            projectId: proj.id,
          });

          return { project: proj, dividend };
        });

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
          state,
        });
      }

      // Tasks: POST /api/tasks/:id/claim
      const claimMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/claim$/);
      if (claimMatch && method === 'POST') {
        const taskId = decodeURIComponent(claimMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
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
            ? s.workers.find((w) => w.id === body.workerId)
            : s.workers.find((w) => w.track === expectedTrack && w.status === 'idle');

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
          task.claimedBy = s.player.id;
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

          return { task, worker, project: proj || null };
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
          state,
        });
      }

      // Tasks: POST /api/tasks/:id/release (safe no-penalty release on BYOK/CLI abort)
      const releaseMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/release$/);
      if (releaseMatch && method === 'POST') {
        const taskId = decodeURIComponent(releaseMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (!task) {
            throw new HttpError(404, `找不到任務：${taskId}`);
          }
          if (task.status === 'completed') {
            throw new HttpError(409, '此任務已完成驗收，無法釋放');
          }

          const targetWorkerId = body.workerId || task.assignedWorkerId;
          const worker = targetWorkerId
            ? s.workers.find((w) => w.id === targetWorkerId)
            : null;

          const wasInProgress = task.status === 'in_progress';
          task.status = 'open';
          task.assignedWorkerId = null;
          task.claimedBy = null;
          task.claimedAt = null;

          const reasonText = typeof body.reason === 'string' && body.reason.trim()
            ? body.reason.trim().slice(0, 120)
            : '';

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

          return { task, worker: worker || null };
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
          state,
        });
      }

      // Tasks: POST /api/tasks/:id/submit
      const submitMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/submit$/);
      if (submitMatch && method === 'POST') {
        const taskId = decodeURIComponent(submitMatch[1]);
        const body = await parseJsonBody(req);

        const { state, result } = await store.mutate((s) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (!task) {
            throw new HttpError(404, `找不到任務：${taskId}`);
          }
          if (task.status === 'completed') {
            throw new HttpError(409, '此任務已完成驗收，無法重複提交');
          }

          const expectedTrack = task.track === 'api_auto' ? 'api' : 'quota';
          const workerId = body.workerId || task.assignedWorkerId;
          const worker = workerId
            ? s.workers.find((w) => w.id === workerId)
            : s.workers.find((w) => w.track === expectedTrack);

          const verification = verifySubmission(task, {
            content: body.content,
            prUrl: body.prUrl,
            notes: body.notes,
            executionMode: body.executionMode,
          });

          const proj = s.projects.find((p) => p.id === task.projectId);
          const now = new Date().toISOString();

          if (!verification.passed) {
            s.player.reputation = Math.max(0, s.player.reputation - 2);
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

            syncPlayerLeaderboard(s);
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

          const contentStr = typeof body.content === 'string'
            ? body.content
            : JSON.stringify(body.content ?? '', null, 2);

          task.status = 'completed';
          task.submittedAt = now;
          task.assignedWorkerId = worker?.id || task.assignedWorkerId || null;
          task.verification = verification;
          task.submission = {
            content: contentStr,
            prUrl: typeof body.prUrl === 'string' && body.prUrl.trim() ? body.prUrl.trim() : null,
            notes: typeof body.notes === 'string' ? body.notes.trim() : '',
            executionMode: body.executionMode || (task.track === 'api_auto' ? 'byok' : 'byot_cli'),
            tokensUsed,
            submittedBy: s.player.displayName,
            submittedAt: now,
          };

          // Update player stats
          s.player.gold += gold;
          s.player.usdBalance = round2(s.player.usdBalance + bountyNetUsd);
          s.player.completedTasks += 1;
          s.player.totalContribution += contributionPoints;
          s.player.reputation += reputationDelta;

          // Record 10% platform bounty fee
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

          // Update project progress & contributions
          if (proj) {
            proj.progressPct = Math.min(100, (proj.progressPct || 0) + (task.progressWeight || 15));
            proj.contributions = proj.contributions || {};
            proj.contributorNames = proj.contributorNames || {};
            proj.contributions[s.player.id] = (proj.contributions[s.player.id] || 0) + contributionPoints;
            proj.contributorNames[s.player.id] = s.player.displayName;
          }

          // Contribution ledger
          s.contributionLedger.unshift({
            id: uid('contrib'),
            timestamp: now,
            projectId: task.projectId,
            projectName: proj?.name || task.projectId,
            taskId: task.id,
            taskTitle: task.title,
            userId: s.player.id,
            userName: s.player.displayName,
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

          syncPlayerLeaderboard(s);

          const bountyText = bountyGrossUsd > 0
            ? `、實得懸賞 $${bountyNetUsd}（平臺服務費 $${platformFeeUsd}）`
            : '';
          const preview = contentStr.replace(/\s+/g, ' ').slice(0, 140);

          pushActivity(s, {
            type: 'complete',
            icon: '✅',
            message: `【${worker?.name || s.player.displayName}】完成《${task.title}》（評分 ${verification.score}）：+${gold}G、+${contributionPoints} 貢獻點${bountyText}`,
            workerId: worker?.id || null,
            projectId: task.projectId,
            taskId: task.id,
            preview,
          });

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
          };
        });

        sseHub.broadcast(result.passed ? 'task_completed' : 'task_rejected', {
          task: result.task,
          worker: result.worker,
          project: result.project,
          verification: result.verification,
          rewards: result.rewards,
        });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });

        return sendJson(res, 200, {
          ok: result.passed,
          passed: result.passed,
          verification: result.verification,
          rewards: result.rewards,
          task: result.task,
          worker: result.worker,
          project: result.project,
          state,
        });
      }

      // Shop: POST /api/shop/buy
      if (pathname === '/api/shop/buy' && method === 'POST') {
        const body = await parseJsonBody(req);
        const item = SHOP_ITEMS.find((i) => i.id === body.itemId);
        if (!item) {
          throw new HttpError(404, `找不到商店商品：${body.itemId}`);
        }

        const { state } = await store.mutate((s) => {
          if (s.player.ownedItems.includes(item.id)) {
            throw new HttpError(409, `你已經擁有「${item.name}」了`);
          }

          if (item.priceGold > 0) {
            if (s.player.gold < item.priceGold) {
              throw new HttpError(400, `金幣不足！購買「${item.name}」需要 ${item.priceGold}G，目前僅有 ${s.player.gold}G`);
            }
            s.player.gold -= item.priceGold;
          }

          if (item.priceUsd > 0) {
            addFounderRevenueEntry(s, {
              stream: 'pro_skin',
              label: `玩家購買「${item.name}」`,
              amountUsd: item.priceUsd,
            });
          }

          s.player.ownedItems.push(item.id);

          if (item.type === 'skin' && item.skinId) {
            if (!s.player.ownedSkins.includes(item.skinId)) {
              s.player.ownedSkins.push(item.skinId);
            }
            if (body.workerId) {
              const target = s.workers.find((w) => w.id === body.workerId);
              if (target) target.skin = item.skinId;
            }
          } else if (item.type === 'skin_bundle') {
            for (const sid of item.unlockSkins || []) {
              if (!s.player.ownedSkins.includes(sid)) {
                s.player.ownedSkins.push(sid);
              }
            }
            if (body.workerId && item.skinId) {
              const target = s.workers.find((w) => w.id === body.workerId);
              if (target) target.skin = item.skinId;
            }
          } else if (item.type === 'decor' && item.decorId) {
            if (!s.player.ownedDecor.includes(item.decorId)) {
              s.player.ownedDecor.push(item.decorId);
            }
          } else if (item.type === 'pro') {
            s.player.isPro = true;
            syncPlayerLeaderboard(s);
          }

          pushActivity(s, {
            type: 'shop',
            icon: item.icon || '🛍️',
            message: `${s.player.displayName} 購買了「${item.name}」（${item.priceUsd > 0 ? `$${item.priceUsd} USD` : `${item.priceGold}G`}）`,
          });
        });

        sseHub.broadcast('shop_purchased', { item });
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          item,
          founderRevenue: state.founderRevenue,
          state,
        });
      }

      // Local CLI Heartbeat: POST /api/cli/heartbeat
      if (pathname === '/api/cli/heartbeat' && method === 'POST') {
        const body = await parseJsonBody(req);
        const now = new Date().toISOString();

        const { state, result } = await store.mutate((s) => {
          const worker = body.workerId
            ? s.workers.find((w) => w.id === body.workerId)
            : s.workers.find((w) => w.track === 'quota') || s.workers[0];

          const message = (typeof body.message === 'string' && body.message.trim())
            ? body.message.trim().slice(0, 120)
            : '本機 CLI 同步運行中...';
          const progressPct = body.progressPct !== undefined
            ? Math.max(0, Math.min(100, Math.round(Number(body.progressPct) || 0)))
            : null;
          const cliTool = typeof body.cliTool === 'string' && body.cliTool.trim()
            ? body.cliTool.trim().slice(0, 40)
            : 'pixel-worker';

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

          return { heartbeat, worker: worker || null };
        });

        sseHub.broadcast('cli_heartbeat', result.heartbeat);
        sseHub.broadcast('state_sync', { updatedAt: state.updatedAt });
        return sendJson(res, 200, {
          ok: true,
          heartbeat: result.heartbeat,
          worker: result.worker,
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
        return sendJson(res, 200, { ok: true, state });
      }

      // Unknown API route
      if (pathname.startsWith('/api/')) {
        return sendJson(res, 404, { ok: false, error: `未知的 API 路徑：${method} ${pathname}` });
      }

      // Serve static files from public/
      if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Method Not Allowed');
      }

      const decodedPath = decodeURIComponent(pathname);
      const safeRelPath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
      const targetPath = path.resolve(publicDir, safeRelPath);
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
        if (method === 'HEAD') {
          return res.end();
        }
        return res.end(fileData);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Not Found');
      }
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
}
