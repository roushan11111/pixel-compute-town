// PixelCompute Town — Automated Full-Lifecycle API & Economics Test Suite
// Zero-dependency test suite using Node.js built-in node:test and node:assert/strict

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

import { createAppServer } from '../server.mjs';
import { computeAntiDilutionMeritSplit } from '../src/server/governance.mjs';
import { renderDocPage, renderMarkdownToHtml } from '../src/server/publicPages.mjs';

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

async function startServer(dataDir, extraOptions = {}) {
  const server = createAppServer({ dataDir, ...extraOptions });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  return { server, port, baseUrl };
}

async function stopServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

function extractCookieHeader(headers) {
  const rawList = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : (headers.get('set-cookie') ? [headers.get('set-cookie')] : []);
  const pairs = rawList
    .map((line) => String(line).split(';')[0].trim())
    .filter(Boolean);
  return pairs.join('; ');
}

async function apiJson(baseUrl, method, route, body, cookie = '') {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (cookie) {
    headers.Cookie = cookie;
  }
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return {
    status: res.status,
    headers: res.headers,
    cookie: extractCookieHeader(res.headers),
    json,
  };
}

/**
 * Opens an SSE connection and returns a helper to await specific event types.
 */
function openSseClient(port, pathname = '/api/events') {
  const received = [];
  const waiters = [];
  let buffer = '';

  const req = http.request({
    hostname: '127.0.0.1',
    port,
    path: pathname,
    method: 'GET',
    headers: { Accept: 'text/event-stream' },
  });

  let responseObj = null;

  const connectedPromise = new Promise((resolve, reject) => {
    req.on('error', reject);
    req.on('response', (res) => {
      responseObj = res;
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (!frame.trim() || frame.trim().startsWith(':')) continue;

          let eventName = 'message';
          const dataLines = [];
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trim());
            }
          }
          const rawData = dataLines.join('\n');
          let parsed = rawData;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            // keep raw string
          }
          const evt = { event: eventName, data: parsed };
          received.push(evt);

          for (let i = waiters.length - 1; i >= 0; i -= 1) {
            if (waiters[i].predicate(evt)) {
              const w = waiters.splice(i, 1)[0];
              clearTimeout(w.timer);
              w.resolve(evt);
            }
          }
        }
      });
      resolve(res);
    });
  });

  req.end();

  function waitForEvent(eventName, timeoutMs = 4000, predicate = null) {
    const matchFn = (evt) => evt.event === eventName && (!predicate || predicate(evt.data));
    const existing = received.find(matchFn);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = waiters.findIndex((w) => w.resolve === resolve);
        if (idx !== -1) waiters.splice(idx, 1);
        reject(new Error(`Timed out waiting for SSE event "${eventName}" (received: ${received.map((e) => e.event).join(', ')})`));
      }, timeoutMs);
      waiters.push({ predicate: matchFn, resolve, timer });
    });
  }

  function close() {
    req.destroy();
    if (responseObj) responseObj.destroy();
  }

  return { connectedPromise, waitForEvent, received, close };
}

describe('PixelCompute Town API & Economic Ledger E2E Suite', () => {
  let tmpDir;
  let server;
  let port;
  let baseUrl;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pct-api-test-'));
    const started = await startServer(tmpDir);
    server = started.server;
    port = started.port;
    baseUrl = started.baseUrl;
  });

  after(async () => {
    await stopServer(server);
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('1. GET /api/health and GET /api/bootstrap return valid initial world state', async () => {
    const health = await apiJson(baseUrl, 'GET', '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.json.ok, true);
    assert.equal(health.json.service, 'pixel-compute-town');
    assert.equal(typeof health.json.uptimeSec, 'number');

    const boot = await apiJson(baseUrl, 'GET', '/api/bootstrap');
    assert.equal(boot.status, 200);
    assert.equal(boot.json.ok, true);
    assert.ok(boot.json.user);
    assert.ok(boot.json.state);
    assert.ok(Array.isArray(boot.json.shopItems) && boot.json.shopItems.length >= 5);
    assert.ok(Array.isArray(boot.json.workerTemplates) && boot.json.workerTemplates.length === 4);
    assert.equal(boot.json.config.platformFeePct, 10);
    assert.equal(boot.json.config.billboardPriceUsd, 29);
    assert.deepEqual(boot.json.config.revenueSplit, {
      originatorSparkPct: 5,
      meritPoolPct: 85,
      platformPct: 10,
    });

    const { state } = boot.json;
    assert.equal(state.workers.length, 2);
    assert.equal(state.projects.length, 3);
    assert.ok(state.tasks.length >= 8, 'Should seed at least 8 dual-track tasks');
    assert.ok(state.tasks.some((t) => t.track === 'api_auto'));
    assert.ok(state.tasks.some((t) => t.track === 'guild_bounty'));
    assert.ok(state.leaderboard.length >= 5);

    const pomo = state.projects.find((p) => p.id === 'proj-pomo');
    assert.equal(pomo.status, 'voting');
    assert.equal(pomo.votes, 8);
    assert.equal(pomo.votesRequired, 10);
  });

  it('2. Recruit new worker and update daily token cap & stamina recovery', async () => {
    const bootBefore = await apiJson(baseUrl, 'GET', '/api/bootstrap');
    const goldBefore = bootBefore.json.state.player.gold;
    const countBefore = bootBefore.json.state.workers.length;

    const createRes = await apiJson(baseUrl, 'POST', '/api/workers', {
      name: '測試工坊喵 (QA-Bot)',
      roleClass: 'flash_worker',
      providerLabel: 'Gemini 2.5 Flash',
      dailyTokenCap: 600000,
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.json.ok, true);
    assert.equal(createRes.json.worker.name, '測試工坊喵 (QA-Bot)');
    assert.equal(createRes.json.worker.track, 'api');
    assert.equal(createRes.json.worker.dailyTokenCap, 600000);
    assert.equal(createRes.json.state.workers.length, countBefore + 1);
    assert.equal(createRes.json.state.player.gold, goldBefore - 120);

    const workerId = createRes.json.worker.id;

    // Invalid token cap rejected
    const badCap = await apiJson(baseUrl, 'PATCH', `/api/workers/${workerId}`, {
      dailyTokenCap: 5,
    });
    assert.equal(badCap.status, 400);

    // Locked skin rejected
    const badSkin = await apiJson(baseUrl, 'PATCH', `/api/workers/${workerId}`, {
      skin: 'skin-gold',
    });
    assert.equal(badSkin.status, 400);

    // Valid cap update + autoMode + stamina recovery
    const patchRes = await apiJson(baseUrl, 'PATCH', `/api/workers/${workerId}`, {
      dailyTokenCap: 850000,
      autoMode: true,
      recoverStamina: true,
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.json.worker.dailyTokenCap, 850000);
    assert.equal(patchRes.json.worker.autoMode, true);
    assert.equal(patchRes.json.worker.stamina, patchRes.json.worker.maxStamina);
  });

  it('3. Project proposal & voting unlock (voting -> building + auto-generated dual-track tasks)', async () => {
    // Propose a new project
    const proposeRes = await apiJson(baseUrl, 'POST', '/api/projects', {
      name: 'PixelGit（像素版本樹）',
      tagline: '將 Git 提交紀錄變成會長葉子的像素小樹',
      votesRequired: 3,
      bountyPoolUsd: 20,
    });
    assert.equal(proposeRes.status, 201);
    assert.equal(proposeRes.json.project.status, 'voting');
    assert.equal(proposeRes.json.project.votes, 1);
    assert.equal(proposeRes.json.project.votesRequired, 3);

    // Vote on seeded proj-pomo (8/10 -> 9/10, still voting)
    const vote1 = await apiJson(baseUrl, 'POST', '/api/projects/proj-pomo/vote');
    assert.equal(vote1.status, 200);
    assert.equal(vote1.json.unlocked, false);
    assert.equal(vote1.json.project.status, 'voting');
    assert.equal(vote1.json.project.votes, 9);
    assert.equal(vote1.json.generatedTasks.length, 0);

    // Second vote (9/10 -> 10/10, auto-unlock -> building + 3 api_auto + 2 guild_bounty tasks)
    const vote2 = await apiJson(baseUrl, 'POST', '/api/projects/proj-pomo/vote');
    assert.equal(vote2.status, 200);
    assert.equal(vote2.json.unlocked, true);
    assert.equal(vote2.json.project.status, 'building');
    assert.equal(vote2.json.project.votes, 10);
    assert.equal(vote2.json.generatedTasks.length, 5);

    const genApi = vote2.json.generatedTasks.filter((t) => t.track === 'api_auto');
    const genGuild = vote2.json.generatedTasks.filter((t) => t.track === 'guild_bounty');
    assert.equal(genApi.length, 3, 'Should auto-generate 3 api_auto tasks');
    assert.equal(genGuild.length, 2, 'Should auto-generate 2 guild_bounty tasks');

    // Voting again on an already-building project must fail with 400
    const vote3 = await apiJson(baseUrl, 'POST', '/api/projects/proj-pomo/vote');
    assert.equal(vote3.status, 400);
  });

  it('4. Anti-cheat verification rejects slop/garbage (0 contribution, -2 reputation) and rewards valid work', async () => {
    const before = await apiJson(baseUrl, 'GET', '/api/bootstrap');
    const repBefore = before.json.state.player.reputation;
    const goldBefore = before.json.state.player.gold;
    const contribBefore = before.json.state.player.totalContribution;

    // Track mismatch check: quota worker cannot claim api_auto task
    const mismatchClaim = await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-i18n/claim', {
      workerId: 'w-pro-01',
    });
    assert.equal(mismatchClaim.status, 400);

    // Valid claim by API worker
    const claimRes = await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-i18n/claim', {
      workerId: 'w-flash-01',
    });
    assert.equal(claimRes.status, 200);
    assert.equal(claimRes.json.task.status, 'in_progress');
    assert.equal(claimRes.json.worker.status, 'working');

    // Submit garbage / AI slop content -> must be rejected with 0 rewards and -2 reputation
    const slopSubmit = await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-i18n/submit', {
      workerId: 'w-flash-01',
      content: '隨便寫 lorem ipsum aaaaaaaaaaaa',
    });
    assert.equal(slopSubmit.status, 200);
    assert.equal(slopSubmit.json.passed, false);
    assert.equal(slopSubmit.json.verification.passed, false);
    assert.equal(slopSubmit.json.rewards.gold, 0);
    assert.equal(slopSubmit.json.rewards.contributionPoints, 0);
    assert.equal(slopSubmit.json.rewards.reputationDelta, -2);
    assert.equal(slopSubmit.json.state.player.reputation, repBefore - 2);
    assert.equal(slopSubmit.json.state.player.gold, goldBefore);
    assert.equal(slopSubmit.json.state.player.totalContribution, contribBefore);
    assert.equal(slopSubmit.json.task.status, 'open', 'Rejected task should reopen');

    // Submit non-JSON for i18n task -> also rejected (-2 more reputation)
    const badJsonSubmit = await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-i18n/submit', {
      workerId: 'w-flash-01',
      content: '這是一段超過四十個字元但根本不是合法 JSON 格式的純文字回覆，用來確認專項結構驗收能攔截不合格的 i18n 任務提交。',
    });
    assert.equal(badJsonSubmit.status, 200);
    assert.equal(badJsonSubmit.json.passed, false);
    assert.equal(badJsonSubmit.json.state.player.reputation, repBefore - 4);

    // Re-claim and submit valid structured JSON -> must pass and grant rewards
    await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-i18n/claim', { workerId: 'w-flash-01' });
    const validI18nJson = JSON.stringify({
      en: {
        townTitle: 'PixelCompute Town',
        factoryTab: 'Auto Factory',
        guildTab: 'Bounty Guild',
        launchBtn: 'Launch & Share Dividends',
        zeroTrustTip: 'API keys stay strictly in your browser localStorage',
      },
      ja: {
        townTitle: 'ピクセル計算タウン',
        factoryTab: '自動工房',
        guildTab: '懸賞ギルド',
        launchBtn: '公開して配当を受け取る',
        zeroTrustTip: 'APIキーはブラウザのローカルにのみ保存されます',
      },
    }, null, 2);

    const passSubmit = await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-i18n/submit', {
      workerId: 'w-flash-01',
      content: validI18nJson,
      tokensUsed: 16500,
      executionMode: 'byok',
    });
    assert.equal(passSubmit.status, 200);
    assert.equal(passSubmit.json.passed, true);
    assert.equal(passSubmit.json.task.status, 'completed');
    assert.equal(passSubmit.json.rewards.gold, 130);
    assert.equal(passSubmit.json.rewards.contributionPoints, 35);
    const achGold = (passSubmit.json.unlockedAchievements || []).reduce((s, a) => s + (a.rewardGold || 0), 0);
    assert.ok(
      (passSubmit.json.unlockedAchievements || []).some((a) => a.id === 'first_blood'),
      'First accepted task should unlock first_blood achievement',
    );
    assert.equal(passSubmit.json.state.player.gold, goldBefore + 130 + achGold);
    assert.equal(passSubmit.json.state.player.totalContribution, contribBefore + 35);
    assert.ok(passSubmit.json.state.player.reputation > repBefore - 4);
  });

  it('5. Cash bounty 10% platform fee math precision ($40 -> $4 fee / $36 net, $25 -> $2.50 fee / $22.50 net)', async () => {
    const before = await apiJson(baseUrl, 'GET', '/api/bootstrap');
    const usdBefore = before.json.state.player.usdBalance;
    const feeBefore = before.json.state.founderRevenue.bountyFeesUsd;
    const totalRevBefore = before.json.state.founderRevenue.totalUsd;

    // Claim & submit $40 guild bounty (task-i18n-ast-pr)
    const claim40 = await apiJson(baseUrl, 'POST', '/api/tasks/task-i18n-ast-pr/claim', {
      workerId: 'w-pro-01',
    });
    assert.equal(claim40.status, 200);

    const submit40 = await apiJson(baseUrl, 'POST', '/api/tasks/task-i18n-ast-pr/submit', {
      workerId: 'w-pro-01',
      prUrl: 'https://github.com/pixel-compute-town/i18n-pixelbot/pull/42',
      content: [
        'export function extractI18nKeys(sourceCode) {',
        '  const keys = new Set();',
        '  const callRe = /\\bt\\(\\s*[\'"]([^\'"]+)[\'"]\\s*\\)/g;',
        '  const jsxRe = /<Trans[^>]*\\bi18nKey=[\'"]([^\'"]+)[\'"]/g;',
        '  for (const re of [callRe, jsxRe]) {',
        '    let m; while ((m = re.exec(sourceCode)) !== null) keys.add(m[1]);',
        '  }',
        '  return [...keys];',
        '}',
      ].join('\n'),
      executionMode: 'byot_cli',
    });
    assert.equal(submit40.status, 200);
    assert.equal(submit40.json.passed, true);
    assert.equal(submit40.json.rewards.bountyGrossUsd, 40);
    assert.equal(submit40.json.rewards.platformFeeUsd, 4);
    assert.equal(submit40.json.rewards.bountyNetUsd, 36);
    assert.equal(submit40.json.state.player.usdBalance, round2(usdBefore + 36));
    assert.equal(submit40.json.state.founderRevenue.bountyFeesUsd, round2(feeBefore + 4));
    assert.equal(submit40.json.state.founderRevenue.totalUsd, round2(totalRevBefore + 4));

    // Recover stamina if needed and submit $25 guild bounty (task-i18n-gh-action)
    await apiJson(baseUrl, 'PATCH', '/api/workers/w-pro-01', { recoverStamina: true });
    const claim25 = await apiJson(baseUrl, 'POST', '/api/tasks/task-i18n-gh-action/claim', {
      workerId: 'w-pro-01',
    });
    assert.equal(claim25.status, 200);

    const submit25 = await apiJson(baseUrl, 'POST', '/api/tasks/task-i18n-gh-action/submit', {
      workerId: 'w-pro-01',
      prUrl: 'https://github.com/pixel-compute-town/i18n-pixelbot/pull/43',
      content: [
        'export async function postPrCommentWithRetry(url, token, body, maxAttempts = 4) {',
        '  for (let i = 0; i < maxAttempts; i += 1) {',
        '    const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ body }) });',
        '    if (res.status !== 429) return res;',
        '    await new Promise((r) => setTimeout(r, 500 * (2 ** i)));',
        '  }',
        '  throw new Error("GitHub API rate limit exceeded after retries");',
        '}',
      ].join('\n'),
    });
    assert.equal(submit25.status, 200);
    assert.equal(submit25.json.passed, true);
    assert.equal(submit25.json.rewards.bountyGrossUsd, 25);
    assert.equal(submit25.json.rewards.platformFeeUsd, 2.5);
    assert.equal(submit25.json.rewards.bountyNetUsd, 22.5);
    assert.equal(submit25.json.state.player.usdBalance, round2(usdBefore + 36 + 22.5));
    assert.equal(submit25.json.state.founderRevenue.bountyFeesUsd, round2(feeBefore + 4 + 2.5));
  });

  it('6. Project launch at 100% & exact 5%/85%/10% Proof-of-First-Spark + Merit Split math (active & hands-off originator)', async () => {
    // ── Scenario A: Originator ALSO contributes hands-on work (5% spark + proportional share of 85% merit pool) ──
    // proj-meta started at 60%, task-meta-i18n (+20%) pushed it to 80% -> launch must fail before 100%
    const earlyLaunch = await apiJson(baseUrl, 'POST', '/api/projects/proj-meta/launch', {});
    assert.equal(earlyLaunch.status, 400);

    // Complete task-meta-spec (+20% -> 100%)
    await apiJson(baseUrl, 'PATCH', '/api/workers/w-flash-01', { recoverStamina: true });
    await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-spec/claim', { workerId: 'w-flash-01' });
    const specSubmit = await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-spec/submit', {
      workerId: 'w-flash-01',
      content: JSON.stringify({
        palette: ['#0f172a', '#1e293b', '#38bdf8', '#f472b6', '#facc15'],
        billboardFrames: ['像素算力鎮 v1.0 上線！', '閒置算力變現分紅！'],
        particleColors: ['#facc15', '#38bdf8', '#fb7185'],
      }, null, 2),
    });
    assert.equal(specSubmit.status, 200);
    assert.equal(specSubmit.json.passed, true);
    assert.equal(specSubmit.json.project.progressPct, 100);

    const preLaunch = await apiJson(baseUrl, 'GET', '/api/bootstrap');
    const projMeta = preLaunch.json.state.projects.find((p) => p.id === 'proj-meta');
    const playerId = preLaunch.json.state.player.id;
    const usdBefore = preLaunch.json.state.player.usdBalance;
    const carryBefore = preLaunch.json.state.founderRevenue.incubationCarryUsd;
    const totalPoints = Object.values(projMeta.contributions).reduce((a, b) => a + b, 0);
    const playerPoints = projMeta.contributions[playerId];
    assert.ok(playerPoints > 0, 'Originator must have hands-on contribution points in Scenario A');

    // Launch with $200 initial revenue -> 5% ($10) spark + 85% ($170) merit pool + 10% ($20) platform
    const launchRes = await apiJson(baseUrl, 'POST', '/api/projects/proj-meta/launch', {
      initialRevenueUsd: 200,
    });
    assert.equal(launchRes.status, 200);
    assert.equal(launchRes.json.project.status, 'launched');

    const div = launchRes.json.dividend;
    assert.equal(div.grossRevenueUsd, 200);
    assert.equal(div.sparkRoyaltyUsd, 10, 'Spark royalty must be 5% of $200 = $10');
    assert.equal(div.meritPoolUsd, 170, 'Merit pool must be 85% of $200 = $170');
    assert.equal(div.platformCarryUsd, 20, 'Platform carry must be 10% of $200 = $20');
    assert.equal(div.creatorShareUsd, 10, 'Legacy creatorShareUsd alias should match 5% = $10');
    assert.equal(div.contributorsPoolUsd, 170, 'Legacy contributorsPoolUsd alias should match 85% = $170');

    // Sum of all contributor payouts must equal meritPoolUsd ($170) exactly (no cent drift)
    const contribPayoutSum = round2(
      div.payouts.filter((p) => p.role === 'contributor').reduce((sum, p) => sum + p.amountUsd, 0),
    );
    assert.equal(contribPayoutSum, 170);

    const grandPayoutSum = round2(div.payouts.reduce((sum, p) => sum + p.amountUsd, 0));
    assert.equal(grandPayoutSum, 200);

    // Check active originator's exact stacked payout (5% spark $10 + proportional share of 85% merit pool)
    const playerContribPayout = div.payouts.find(
      (p) => p.role === 'contributor' && p.userId === playerId,
    );
    assert.ok(playerContribPayout);
    const approxExpectedMerit = round2(170 * (playerPoints / totalPoints));
    assert.ok(Math.abs(playerContribPayout.amountUsd - approxExpectedMerit) <= 0.02);
    assert.equal(div.playerSparkUsd, 10);
    assert.equal(div.playerMeritUsd, playerContribPayout.amountUsd);
    assert.equal(div.playerTotalUsd, round2(10 + playerContribPayout.amountUsd));
    assert.equal(div.originatorTotalUsd, div.playerTotalUsd);
    assert.equal(div.playerShareUsd, div.playerTotalUsd);
    assert.equal(div.payoutsByUser[playerId].sparkUsd, 10);
    assert.equal(div.payoutsByUser[playerId].meritUsd, playerContribPayout.amountUsd);
    assert.equal(div.payoutsByUser[playerId].totalUsd, div.playerTotalUsd);
    assert.equal(div.payoutsByUser[playerId].isOriginator, true);
    assert.equal(launchRes.json.state.player.usdBalance, round2(usdBefore + div.playerTotalUsd));
    assert.equal(launchRes.json.founderRevenue.incubationCarryUsd, round2(carryBefore + 20));

    // Re-launching an already launched project must fail
    const reLaunch = await apiJson(baseUrl, 'POST', '/api/projects/proj-meta/launch', {});
    assert.equal(reLaunch.status, 400);

    // Simulate subsequent $100 revenue -> 5 ($5) / 85 ($85) / 10 ($10)
    const usdBeforeSim = launchRes.json.state.player.usdBalance;
    const carryBeforeSim = launchRes.json.founderRevenue.incubationCarryUsd;
    const simRes = await apiJson(baseUrl, 'POST', '/api/projects/proj-meta/simulate-revenue', {
      amountUsd: 100,
    });
    assert.equal(simRes.status, 200);
    assert.equal(simRes.json.dividend.grossRevenueUsd, 100);
    assert.equal(simRes.json.dividend.sparkRoyaltyUsd, 5);
    assert.equal(simRes.json.dividend.meritPoolUsd, 85);
    assert.equal(simRes.json.dividend.platformCarryUsd, 10);
    const simTotal = round2(simRes.json.dividend.payouts.reduce((s, p) => s + p.amountUsd, 0));
    assert.equal(simTotal, 100);
    assert.equal(simRes.json.founderRevenue.incubationCarryUsd, round2(carryBeforeSim + 10));
    assert.equal(
      simRes.json.state.player.usdBalance,
      round2(usdBeforeSim + simRes.json.dividend.playerTotalUsd),
    );

    // ── Scenario B: Originator does ZERO hands-on work -> gets ONLY 5% spark royalty; hands-on builder gets 100% of 85% merit pool ──
    const isoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pct-merit-split-'));
    const isoStarted = await startServer(isoDir);
    const isoUrl = isoStarted.baseUrl;
    try {
      // Register Originator (idea spark only) & Builder (100% hands-on implementation)
      const regOrig = await apiJson(isoUrl, 'POST', '/api/auth/register', {
        email: 'spark-originator@pixelcompute.test',
        password: 'originator-pass-123',
        displayName: 'Idea Sparker',
      });
      assert.equal(regOrig.status, 201);
      const origCookie = regOrig.cookie;
      const origId = regOrig.json.user.id;

      const regBuilder = await apiJson(isoUrl, 'POST', '/api/auth/register', {
        email: 'merit-builder@pixelcompute.test',
        password: 'builder-pass-123',
        displayName: 'HandsOn Builder',
      });
      assert.equal(regBuilder.status, 201);
      const builderCookie = regBuilder.cookie;
      const builderId = regBuilder.json.user.id;

      // Originator proposes a unique project (contributions starts empty {})
      const propRes = await apiJson(
        isoUrl,
        'POST',
        '/api/projects',
        {
          name: 'QuantumLoom（量子編織排程器）',
          tagline: '用極簡像素甘特圖編排離線批次算力管線',
          votesRequired: 2,
        },
        origCookie,
      );
      assert.equal(propRes.status, 201);
      const newProjId = propRes.json.project.id;
      assert.deepEqual(propRes.json.project.contributions, {}, 'New proposal must NOT grant free contribution points');

      // Builder votes to unlock project (1/2 -> 2/2 -> building + 5 tasks totaling 100% progressWeight)
      const unlockRes = await apiJson(isoUrl, 'POST', `/api/projects/${newProjId}/vote`, {}, builderCookie);
      assert.equal(unlockRes.status, 200);
      assert.equal(unlockRes.json.unlocked, true);
      const genTasks = unlockRes.json.generatedTasks;
      assert.equal(genTasks.length, 5);

      const builderBoot = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, builderCookie);
      const apiWorker = builderBoot.json.state.workers.find((w) => w.track === 'api');
      const quotaWorker = builderBoot.json.state.workers.find((w) => w.track === 'quota');
      assert.ok(apiWorker && quotaWorker);

      // Builder completes all 5 tasks; Originator touches NOTHING
      for (const task of genTasks) {
        const w = task.track === 'api_auto' ? apiWorker : quotaWorker;
        await apiJson(isoUrl, 'PATCH', `/api/workers/${w.id}`, { recoverStamina: true }, builderCookie);
        const cRes = await apiJson(isoUrl, 'POST', `/api/tasks/${task.id}/claim`, { workerId: w.id }, builderCookie);
        assert.equal(cRes.status, 200, `Builder should claim ${task.id}`);

        let payload;
        if (task.category === 'i18n') {
          payload = {
            workerId: w.id,
            content: JSON.stringify({
              'zh-TW': { title: '量子編織排程器', startBtn: '開始排程', statusReady: '就緒', shareText: '分享進度' },
              en: { title: 'QuantumLoom Scheduler', startBtn: 'Start Pipeline', statusReady: 'Ready', shareText: 'Share Run' },
            }, null, 2),
          };
        } else if (task.category === 'pixel_spec') {
          payload = {
            workerId: w.id,
            content: JSON.stringify({
              palette: ['#0b1020', '#1e293b', '#38bdf8', '#facc15'],
              icons: ['loom_idle', 'loom_running', 'loom_done'],
              typography: { heading: 'Press Start 2P', body: 'Inter' },
            }, null, 2),
          };
        } else if (task.category === 'unit_test') {
          payload = {
            workerId: w.id,
            content: [
              'import test from "node:test";',
              'import assert from "node:assert/strict";',
              'test("QuantumLoom schedules valid DAG jobs", () => {',
              '  const jobs = [{ id: "a", deps: [] }, { id: "b", deps: ["a"] }];',
              '  assert.equal(jobs.length, 2);',
              '  assert.deepEqual(jobs[1].deps, ["a"]);',
              '});',
            ].join('\n'),
          };
        } else {
          payload = {
            workerId: w.id,
            prUrl: `https://github.com/pixel-compute-town/quantum-loom/pull/${task.category === 'feature_pr' ? 11 : 12}`,
            content: [
              'export function runQuantumLoomPipeline(jobs = []) {',
              '  if (!Array.isArray(jobs)) throw new TypeError("jobs must be an array");',
              '  const completed = new Set();',
              '  for (const job of jobs) { completed.add(job.id); }',
              '  return { ok: true, count: completed.size };',
              '}',
            ].join('\n'),
          };
        }

        const sRes = await apiJson(isoUrl, 'POST', `/api/tasks/${task.id}/submit`, payload, builderCookie);
        assert.equal(sRes.status, 200);
        assert.equal(sRes.json.passed, true, `Task ${task.id} (${task.category}) must pass verification`);
      }

      // Check pre-launch balances
      const origPre = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, origCookie);
      const builderPre = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, builderCookie);
      const origUsdBefore = origPre.json.state.player.usdBalance;
      const builderUsdBefore = builderPre.json.state.player.usdBalance;
      const isoCarryBefore = builderPre.json.state.founderRevenue.incubationCarryUsd;
      const readyProj = builderPre.json.state.projects.find((p) => p.id === newProjId);
      assert.equal(readyProj.progressPct, 100);
      assert.equal(readyProj.contributions[origId] || 0, 0, 'Originator must have 0 hands-on points');
      assert.ok(readyProj.contributions[builderId] > 0, 'Builder must hold 100% of hands-on points');

      // Launch with $200 initial revenue -> Originator: $10 (5%), Builder: $170 (85%), Platform: $20 (10%)
      const isoLaunch = await apiJson(
        isoUrl,
        'POST',
        `/api/projects/${newProjId}/launch`,
        { initialRevenueUsd: 200 },
        builderCookie,
      );
      assert.equal(isoLaunch.status, 200);
      const isoDiv = isoLaunch.json.dividend;
      assert.equal(isoDiv.grossRevenueUsd, 200);
      assert.equal(isoDiv.sparkRoyaltyUsd, 10);
      assert.equal(isoDiv.meritPoolUsd, 170);
      assert.equal(isoDiv.platformCarryUsd, 20);
      assert.equal(isoDiv.originatorTotalUsd, 10, 'Hands-off originator must receive EXACTLY 5% ($10)');
      assert.equal(isoDiv.payoutsByUser[origId].sparkUsd, 10);
      assert.equal(isoDiv.payoutsByUser[origId].meritUsd, 0);
      assert.equal(isoDiv.payoutsByUser[origId].totalUsd, 10);
      assert.equal(isoDiv.payoutsByUser[origId].totalSharePct, 5);
      assert.equal(isoDiv.payoutsByUser[builderId].sparkUsd, 0);
      assert.equal(isoDiv.payoutsByUser[builderId].meritUsd, 170);
      assert.equal(isoDiv.payoutsByUser[builderId].totalUsd, 170, 'Sole hands-on builder must receive EXACTLY 85% ($170)');
      assert.equal(isoDiv.payoutsByUser[builderId].meritRatioPct, 100);
      assert.equal(isoDiv.payoutsByUser[builderId].totalSharePct, 85);
      assert.equal(isoDiv.playerSparkUsd, 0);
      assert.equal(isoDiv.playerMeritUsd, 170);
      assert.equal(isoDiv.playerTotalUsd, 170);
      assert.equal(round2(isoDiv.payouts.reduce((s, p) => s + p.amountUsd, 0)), 200);
      assert.equal(isoLaunch.json.founderRevenue.incubationCarryUsd, round2(isoCarryBefore + 20));

      // Verify persisted balances of both users down to the exact cent
      const origPost = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, origCookie);
      const builderPost = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, builderCookie);
      assert.equal(origPost.json.state.player.usdBalance, round2(origUsdBefore + 10));
      assert.equal(builderPost.json.state.player.usdBalance, round2(builderUsdBefore + 170));

      // Simulate subsequent $100 revenue -> Originator +$5.00, Builder +$85.00, Platform +$10.00
      const isoSim = await apiJson(
        isoUrl,
        'POST',
        `/api/projects/${newProjId}/simulate-revenue`,
        { amountUsd: 100 },
        origCookie,
      );
      assert.equal(isoSim.status, 200);
      assert.equal(isoSim.json.dividend.sparkRoyaltyUsd, 5);
      assert.equal(isoSim.json.dividend.meritPoolUsd, 85);
      assert.equal(isoSim.json.dividend.platformCarryUsd, 10);
      assert.equal(isoSim.json.dividend.playerSparkUsd, 5);
      assert.equal(isoSim.json.dividend.playerMeritUsd, 0);
      assert.equal(isoSim.json.dividend.playerTotalUsd, 5);
      assert.equal(isoSim.json.dividend.payoutsByUser[builderId].totalUsd, 85);
      assert.equal(isoSim.json.state.player.usdBalance, round2(origUsdBefore + 10 + 5));
    } finally {
      await stopServer(isoStarted.server);
      await fs.rm(isoDir, { recursive: true, force: true });
    }
  });

  it('7. Neon billboard ad ($29) and shop purchases accurately update founderRevenue & inventory', async () => {
    const before = await apiJson(baseUrl, 'GET', '/api/bootstrap');
    const revBefore = before.json.state.founderRevenue;
    const goldBefore = before.json.state.player.gold;

    // Rent neon billboard ($29)
    const bbRes = await apiJson(baseUrl, 'POST', '/api/projects/proj-meta/billboard', {
      text: '🚀 像素算力鎮 v1.0 創世上線狂歡中！',
    });
    assert.equal(bbRes.status, 200);
    assert.equal(bbRes.json.project.sponsoredBillboard, true);
    assert.equal(bbRes.json.project.billboardText, '🚀 像素算力鎮 v1.0 創世上線狂歡中！');
    assert.equal(bbRes.json.founderRevenue.billboardAdsUsd, round2(revBefore.billboardAdsUsd + 29));
    assert.equal(bbRes.json.founderRevenue.totalUsd, round2(revBefore.totalUsd + 29));

    // Buy gold-priced skin (skin-cyber: 220G, $0 USD)
    const buySkin = await apiJson(baseUrl, 'POST', '/api/shop/buy', {
      itemId: 'skin-cyber',
      workerId: 'w-flash-01',
    });
    assert.equal(buySkin.status, 200);
    assert.equal(buySkin.json.state.player.gold, goldBefore - 220);
    assert.ok(buySkin.json.state.player.ownedSkins.includes('skin-cyber'));
    assert.equal(buySkin.json.state.workers.find((w) => w.id === 'w-flash-01').skin, 'skin-cyber');
    assert.equal(buySkin.json.founderRevenue.proSkinsUsd, revBefore.proSkinsUsd);

    // Duplicate purchase returns 409
    const dupSkin = await apiJson(baseUrl, 'POST', '/api/shop/buy', { itemId: 'skin-cyber' });
    assert.equal(dupSkin.status, 409);

    // Buy USD-priced Pro Pass ($9 USD)
    const buyPro = await apiJson(baseUrl, 'POST', '/api/shop/buy', {
      itemId: 'pro-pass-monthly',
    });
    assert.equal(buyPro.status, 200);
    assert.equal(buyPro.json.state.player.isPro, true);
    assert.equal(buyPro.json.founderRevenue.proSkinsUsd, round2(revBefore.proSkinsUsd + 9));
    assert.equal(buyPro.json.founderRevenue.totalUsd, round2(revBefore.totalUsd + 29 + 9));

    // Buy USD-priced Founder Skin Bundle ($15 USD)
    const buyBundle = await apiJson(baseUrl, 'POST', '/api/shop/buy', {
      itemId: 'founder-skin-bundle',
    });
    assert.equal(buyBundle.status, 200);
    assert.ok(buyBundle.json.state.player.ownedSkins.includes('skin-gold'));
    assert.ok(buyBundle.json.state.player.ownedSkins.includes('skin-cat'));
    assert.equal(buyBundle.json.founderRevenue.proSkinsUsd, round2(revBefore.proSkinsUsd + 9 + 15));
    assert.equal(buyBundle.json.founderRevenue.totalUsd, round2(revBefore.totalUsd + 29 + 9 + 15));
  });

  it('8. POST /api/cli/heartbeat and GET /api/events SSE real-time push', async () => {
    const sse = openSseClient(port);
    try {
      const res = await sse.connectedPromise;
      assert.equal(res.statusCode, 200);
      assert.match(res.headers['content-type'] || '', /text\/event-stream/i);

      const connectedEvt = await sse.waitForEvent('connected');
      assert.equal(connectedEvt.data.ok, true);

      const hbRes = await apiJson(baseUrl, 'POST', '/api/cli/heartbeat', {
        workerId: 'w-pro-01',
        taskId: 'task-meta-pr',
        status: 'working',
        progressPct: 68,
        cliTool: 'gemini-cli',
        message: '正在透過本機 Gemini CLI 撰寫快捷鍵模組...',
      });
      assert.equal(hbRes.status, 200);
      assert.equal(hbRes.json.ok, true);
      assert.equal(hbRes.json.heartbeat.progressPct, 68);
      assert.equal(hbRes.json.heartbeat.cliTool, 'gemini-cli');

      const cliEvt = await sse.waitForEvent('cli_heartbeat');
      assert.equal(cliEvt.data.workerId, 'w-pro-01');
      assert.equal(cliEvt.data.progressPct, 68);
      assert.equal(cliEvt.data.cliTool, 'gemini-cli');
      assert.match(cliEvt.data.message, /Gemini CLI/);
    } finally {
      sse.close();
    }
  });

  it('9. GitHub PR URL validator endpoint handles valid and invalid URLs', async () => {
    const valid = await apiJson(baseUrl, 'POST', '/api/github/verify-pr', {
      prUrl: 'https://github.com/pixel-compute-town/i18n-pixelbot/pull/101',
      skipRemote: true,
    });
    assert.equal(valid.status, 200);
    assert.equal(valid.json.ok, true);
    assert.equal(valid.json.valid, true);
    assert.equal(valid.json.pr.owner, 'pixel-compute-town');
    assert.equal(valid.json.pr.pullNumber, 101);

    const invalid = await apiJson(baseUrl, 'POST', '/api/github/verify-pr', {
      prUrl: 'https://example.com/not-a-pr',
      skipRemote: true,
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.json.valid, false);
  });

  it('10. POST /api/tasks/:id/release cleanly unlocks failed BYOK claims with zero reputation penalty', async () => {
    const bootBefore = await apiJson(baseUrl, 'GET', '/api/bootstrap');
    const repBefore = bootBefore.json.state.player.reputation;

    // Claim an open API task
    const claimRes = await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-docs/claim', {
      workerId: 'w-flash-01',
    });
    assert.equal(claimRes.status, 200);
    assert.equal(claimRes.json.task.status, 'in_progress');
    assert.equal(claimRes.json.worker.status, 'working');

    // Release it as if BYOK failed -> must reopen without reputation penalty
    const relRes = await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-docs/release', {
      workerId: 'w-flash-01',
      reason: 'Simulated BYOK 429 rate limit',
    });
    assert.equal(relRes.status, 200);
    assert.equal(relRes.json.ok, true);
    assert.equal(relRes.json.task.status, 'open');
    assert.equal(relRes.json.task.assignedWorkerId, null);
    assert.equal(relRes.json.worker.status, 'idle');
    assert.equal(relRes.json.worker.currentZone, 'lounge');
    assert.equal(relRes.json.state.player.reputation, repBefore, 'Release must not deduct reputation');

    // Must be re-claimable immediately
    const reClaim = await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-docs/claim', {
      workerId: 'w-flash-01',
    });
    assert.equal(reClaim.status, 200);
    assert.equal(reClaim.json.task.status, 'in_progress');
    // Release again to leave worker idle
    await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-docs/release', { workerId: 'w-flash-01' });

    // Releasing an already completed task must fail with 409
    const relCompleted = await apiJson(baseUrl, 'POST', '/api/tasks/task-meta-i18n/release', {});
    assert.equal(relCompleted.status, 409);
  });

  it('11. Persistence across server restart (data/state.json survives stop + fresh start)', async () => {
    const preRestart = await apiJson(baseUrl, 'GET', '/api/bootstrap');
    const snapshot = preRestart.json.state;

    // Verify state.json exists on disk in tmpDir
    const stateFilePath = path.join(tmpDir, 'state.json');
    const diskRaw = await fs.readFile(stateFilePath, 'utf8');
    const diskParsed = JSON.parse(diskRaw);
    assert.equal(diskParsed.player.gold, snapshot.player.gold);
    assert.equal(diskParsed.founderRevenue.totalUsd, snapshot.founderRevenue.totalUsd);

    // Stop server #1 and boot a brand-new server #2 on the same dataDir
    await stopServer(server);
    server = null;

    const restarted = await startServer(tmpDir);
    server = restarted.server;
    port = restarted.port;
    baseUrl = restarted.baseUrl;

    const postRestart = await apiJson(baseUrl, 'GET', '/api/bootstrap');
    assert.equal(postRestart.status, 200);
    const restored = postRestart.json.state;

    assert.equal(restored.player.gold, snapshot.player.gold);
    assert.equal(restored.player.usdBalance, snapshot.player.usdBalance);
    assert.equal(restored.player.isPro, true);
    assert.equal(restored.workers.length, snapshot.workers.length);
    assert.ok(restored.workers.some((w) => w.name === '測試工坊喵 (QA-Bot)'));
    assert.equal(restored.projects.find((p) => p.id === 'proj-meta').status, 'launched');
    assert.equal(restored.projects.find((p) => p.id === 'proj-pomo').status, 'building');
    assert.equal(restored.founderRevenue.bountyFeesUsd, snapshot.founderRevenue.bountyFeesUsd);
    assert.equal(restored.founderRevenue.incubationCarryUsd, snapshot.founderRevenue.incubationCarryUsd);
    assert.equal(restored.founderRevenue.billboardAdsUsd, snapshot.founderRevenue.billboardAdsUsd);
    assert.equal(restored.founderRevenue.proSkinsUsd, snapshot.founderRevenue.proSkinsUsd);
    assert.equal(restored.founderRevenue.totalUsd, snapshot.founderRevenue.totalUsd);
  });

  it('12. POST /api/github/import-issues validates repo format, auto-creates project, and handles offline fallback', async () => {
    // Invalid repo URL rejected with 400
    const badRepo = await apiJson(baseUrl, 'POST', '/api/github/import-issues', {
      repoUrl: 'not-a-valid-repo',
      skipRemote: true,
    });
    assert.equal(badRepo.status, 400);
    assert.equal(badRepo.json.ok, false);

    // Valid owner/repo with skipRemote: true -> auto-creates building project & 3 fallback tasks
    const imp1 = await apiJson(baseUrl, 'POST', '/api/github/import-issues', {
      repoUrl: 'pixel-compute-town/awesome-demo',
      maxIssues: 3,
      skipRemote: true,
    });
    assert.equal(imp1.status, 200);
    assert.equal(imp1.json.ok, true);
    assert.equal(imp1.json.createdProject, true);
    assert.equal(imp1.json.fallbackUsed, true);
    assert.equal(imp1.json.project.status, 'building');
    assert.equal(imp1.json.importedCount, 3);
    assert.equal(imp1.json.tasks.length, 3);
    assert.ok(imp1.json.tasks.every((t) => t.title.includes('[離線預覽]')));
    assert.ok(imp1.json.tasks.every((t) => t.projectId === imp1.json.project.id));

    // Importing again for the same repo URL reuses the existing project instead of duplicating it
    const imp2 = await apiJson(baseUrl, 'POST', '/api/github/import-issues', {
      repoUrl: 'https://github.com/pixel-compute-town/awesome-demo',
      maxIssues: 2,
      skipRemote: true,
    });
    assert.equal(imp2.status, 200);
    assert.equal(imp2.json.createdProject, false);
    assert.equal(imp2.json.project.id, imp1.json.project.id);
    assert.equal(imp2.json.importedCount, 2);
  });

  it('13. All 6 Genesis Achievements unlock across gameplay, broadcast via SSE, and reset cleanly', async () => {
    const boot = await apiJson(baseUrl, 'GET', '/api/bootstrap');
    const achievements = boot.json.state.achievements;
    assert.ok(Array.isArray(achievements) && achievements.length >= 6);

    const expectedIds = [
      'first_blood',
      'dual_track_master',
      'community_builder',
      'launch_founder',
      'dividend_earner',
      'cli_pioneer',
    ];
    for (const id of expectedIds) {
      const ach = achievements.find((a) => a.id === id);
      assert.ok(ach, `Achievement "${id}" must exist in state.achievements`);
      assert.equal(ach.unlocked, true, `Achievement "${id}" should be unlocked after full lifecycle`);
      assert.ok(ach.unlockedAt, `Achievement "${id}" should record unlockedAt timestamp`);
    }

    // Reset world -> all 6 achievements must reset back to locked
    const resetRes = await apiJson(baseUrl, 'POST', '/api/reset', {});
    assert.equal(resetRes.status, 200);
    assert.ok(resetRes.json.state.achievements.every((a) => a.unlocked === false && a.unlockedAt === null));

    // Verify achievement_unlocked SSE event fires on cli_pioneer unlock after reset
    const sse = openSseClient(port);
    try {
      await sse.connectedPromise;
      await sse.waitForEvent('connected');
      await apiJson(baseUrl, 'POST', '/api/cli/heartbeat', {
        workerId: 'w-pro-01',
        message: 'Testing achievement SSE broadcast',
      });
      const achEvt = await sse.waitForEvent('achievement_unlocked');
      assert.equal(achEvt.data.achievement.id, 'cli_pioneer');
      assert.equal(achEvt.data.achievement.unlocked, true);
    } finally {
      sse.close();
    }
  });

  it('14. Production security headers & HTTP 429 write rate limiting (reads remain unaffected)', async () => {
    const rlTmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pct-ratelimit-'));
    const rlServer = createAppServer({ dataDir: rlTmpDir, rateLimitMax: 3 });
    await new Promise((resolve) => rlServer.listen(0, '127.0.0.1', resolve));
    const rlUrl = `http://127.0.0.1:${rlServer.address().port}`;

    try {
      // Check security headers on GET /api/health and GET /
      const healthRes = await fetch(`${rlUrl}/api/health`);
      assert.equal(healthRes.status, 200);
      assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(healthRes.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.equal(healthRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');

      const htmlRes = await fetch(`${rlUrl}/`);
      assert.equal(htmlRes.status, 200);
      assert.equal(htmlRes.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(htmlRes.headers.get('x-frame-options'), 'SAMEORIGIN');

      // Execute 3 allowed write requests (limit = 3)
      for (let i = 1; i <= 3; i += 1) {
        const res = await apiJson(rlUrl, 'POST', '/api/cli/heartbeat', {
          workerId: 'w-pro-01',
          message: `Write #${i}`,
          logToFeed: false,
        });
        assert.equal(res.status, 200, `Write #${i} should succeed under limit`);
        assert.equal(res.headers.get('x-ratelimit-limit'), '3');
      }

      // 4th write request within the same window must return HTTP 429 + Retry-After
      const blocked = await apiJson(rlUrl, 'POST', '/api/cli/heartbeat', {
        workerId: 'w-pro-01',
        message: 'Write #4 should be rate-limited',
        logToFeed: false,
      });
      assert.equal(blocked.status, 429);
      assert.equal(blocked.json.ok, false);
      assert.ok(blocked.headers.get('retry-after'), '429 response should include Retry-After header');

      // Read endpoints (GET) must NOT be blocked by write rate limit
      const readAfter429 = await apiJson(rlUrl, 'GET', '/api/health');
      assert.equal(readAfter429.status, 200);
    } finally {
      await stopServer(rlServer);
      await fs.rm(rlTmpDir, { recursive: true, force: true });
    }
  });

  it('15. Multi-user email register, login, logout, error codes (401/409) & user state isolation', async () => {
    // Reset world cleanly before v1.0 multi-user tests
    const resetRes = await apiJson(baseUrl, 'POST', '/api/reset', {});
    assert.equal(resetRes.status, 200);

    // Register User A
    const regA = await apiJson(baseUrl, 'POST', '/api/auth/register', {
      email: 'alice@pixelcompute.test',
      password: 'alice-password-123',
      displayName: 'Alice Builder',
    });
    assert.equal(regA.status, 201);
    assert.equal(regA.json.ok, true);
    assert.equal(regA.json.user.email, 'alice@pixelcompute.test');
    assert.ok(regA.cookie.includes('pct_session='), 'Registration must issue pct_session cookie');
    const cookieA = regA.cookie;

    // Duplicate email rejected with 409
    const dupReg = await apiJson(baseUrl, 'POST', '/api/auth/register', {
      email: 'ALICE@pixelcompute.test',
      password: 'another-password-123',
    });
    assert.equal(dupReg.status, 409);

    // Wrong password rejected with 401
    const badLogin = await apiJson(baseUrl, 'POST', '/api/auth/login', {
      email: 'alice@pixelcompute.test',
      password: 'wrong-password',
    });
    assert.equal(badLogin.status, 401);

    // Register User B
    const regB = await apiJson(baseUrl, 'POST', '/api/auth/register', {
      email: 'bob@pixelcompute.test',
      password: 'bob-password-456',
      displayName: 'Bob Architect',
    });
    assert.equal(regB.status, 201);
    assert.ok(regB.cookie.includes('pct_session='));
    const cookieB = regB.cookie;

    // Verify GET /api/auth/me reflects each isolated session
    const meA = await apiJson(baseUrl, 'GET', '/api/auth/me', undefined, cookieA);
    assert.equal(meA.status, 200);
    assert.equal(meA.json.user.email, 'alice@pixelcompute.test');
    assert.equal(meA.json.isGuestDemo, false);

    const meB = await apiJson(baseUrl, 'GET', '/api/auth/me', undefined, cookieB);
    assert.equal(meB.status, 200);
    assert.equal(meB.json.user.email, 'bob@pixelcompute.test');

    // User A recruits a worker -> only User A's gold & workers change; User B stays isolated
    const bootABefore = await apiJson(baseUrl, 'GET', '/api/bootstrap', undefined, cookieA);
    const bootBBefore = await apiJson(baseUrl, 'GET', '/api/bootstrap', undefined, cookieB);
    const goldABefore = bootABefore.json.state.player.gold;
    const goldBBefore = bootBBefore.json.state.player.gold;

    const recruitA = await apiJson(
      baseUrl,
      'POST',
      '/api/workers',
      {
        name: 'Alice-Isolated-Bot',
        roleClass: 'flash_worker',
        providerLabel: 'Gemini 2.5 Flash',
        dailyTokenCap: 500000,
      },
      cookieA,
    );
    assert.equal(recruitA.status, 201);
    assert.equal(recruitA.json.state.player.gold, goldABefore - 120);
    assert.ok(recruitA.json.state.workers.some((w) => w.name === 'Alice-Isolated-Bot'));

    const bootBAfter = await apiJson(baseUrl, 'GET', '/api/bootstrap', undefined, cookieB);
    assert.equal(bootBAfter.json.state.player.gold, goldBBefore, 'User B gold must stay isolated from User A');
    assert.ok(
      !bootBAfter.json.state.workers.some((w) => w.name === 'Alice-Isolated-Bot'),
      'User B must NOT see User A private workers',
    );

    // Shared project pool & leaderboard: User A proposes a project -> User B sees it
    const propA = await apiJson(
      baseUrl,
      'POST',
      '/api/projects',
      {
        name: 'SharedPixelCLI',
        tagline: 'Cross-user shared project test',
        votesRequired: 4,
      },
      cookieA,
    );
    assert.equal(propA.status, 201);
    const bootBShared = await apiJson(baseUrl, 'GET', '/api/bootstrap', undefined, cookieB);
    assert.ok(
      bootBShared.json.state.projects.some((p) => p.id === propA.json.project.id),
      'Projects pool must be shared across users',
    );
    assert.ok(Array.isArray(bootBShared.json.state.leaderboard) && bootBShared.json.state.leaderboard.length >= 5);

    // Logout User A -> reverts to guest demo context
    const logoutA = await apiJson(baseUrl, 'POST', '/api/auth/logout', {}, cookieA);
    assert.equal(logoutA.status, 200);
    const meAfterLogout = await apiJson(baseUrl, 'GET', '/api/auth/me', undefined, cookieA);
    assert.equal(meAfterLogout.status, 200);
    assert.equal(meAfterLogout.json.isGuestDemo, true);

    // Log back in as User A -> isolated worker & gold restored
    const loginA = await apiJson(baseUrl, 'POST', '/api/auth/login', {
      email: 'alice@pixelcompute.test',
      password: 'alice-password-123',
    });
    assert.equal(loginA.status, 200);
    assert.ok(loginA.cookie.includes('pct_session='));
    assert.ok(loginA.json.state.workers.some((w) => w.name === 'Alice-Isolated-Bot'));
    assert.equal(loginA.json.state.player.gold, goldABefore - 120);

    // Google OAuth unconfigured fallback returns clean JSON when Accept: application/json
    const googleAuth = await apiJson(baseUrl, 'GET', '/api/auth/google');
    assert.equal(googleAuth.status, 200);
    assert.equal(googleAuth.json.googleOAuthEnabled, false);
  });

  it('16. Stablecoin USDC/USDT payment lifecycle (create -> reject invalid TxHash 400 -> confirm -> founderRevenue)', async () => {
    const loginA = await apiJson(baseUrl, 'POST', '/api/auth/login', {
      email: 'alice@pixelcompute.test',
      password: 'alice-password-123',
    });
    const cookieA = loginA.cookie;
    const revBefore = loginA.json.state.founderRevenue;

    // Create Base USDC order for Pro Pass ($9)
    const createOrder = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/stablecoin/create',
      {
        productId: 'shop-pro-pass',
        chain: 'base',
        token: 'USDC',
      },
      cookieA,
    );
    assert.equal(createOrder.status, 201);
    assert.equal(createOrder.json.ok, true);
    const order = createOrder.json.order;
    assert.equal(order.productId, 'shop-pro-pass');
    assert.equal(order.amountUsd, 9);
    assert.equal(order.chain, 'base');
    assert.equal(order.token, 'USDC');
    assert.equal(order.status, 'pending');
    assert.ok(order.receiverAddress && order.receiverAddress.startsWith('0x'));
    assert.ok(order.memoCode);

    // Invalid TxHash rejected with 400
    const badTx = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/stablecoin/confirm',
      {
        orderId: order.id,
        txHash: '0x1234-invalid-hash',
      },
      cookieA,
    );
    assert.equal(badTx.status, 400);

    // Valid EVM TxHash confirms order, grants Pro Pass, and updates founderRevenue
    const validEvmTx = `0x${'ab'.repeat(32)}`;
    const confirmPro = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/stablecoin/confirm',
      {
        orderId: order.id,
        txHash: validEvmTx,
      },
      cookieA,
    );
    assert.equal(confirmPro.status, 200);
    assert.equal(confirmPro.json.ok, true);
    assert.equal(confirmPro.json.order.status, 'confirmed');
    assert.equal(confirmPro.json.order.txHash, validEvmTx);
    assert.equal(confirmPro.json.state.player.isPro, true);
    assert.equal(confirmPro.json.founderRevenue.proSkinsUsd, round2(revBefore.proSkinsUsd + 9));
    assert.equal(confirmPro.json.founderRevenue.totalUsd, round2(revBefore.totalUsd + 9));

    // Confirming the same order twice returns 409
    const dupConfirm = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/stablecoin/confirm',
      { orderId: order.id, txHash: validEvmTx },
      cookieA,
    );
    assert.equal(dupConfirm.status, 409);

    // Solana USDT billboard-ad ($29) with simulate: true
    const createAd = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/stablecoin/create',
      {
        productId: 'billboard-ad',
        targetProjectId: 'proj-meta',
        billboardText: '💎 Base & Solana USDC Live!',
        chain: 'solana',
        token: 'USDT',
      },
      cookieA,
    );
    assert.equal(createAd.status, 201);
    assert.equal(createAd.json.order.amountUsd, 29);

    const confirmAd = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/stablecoin/confirm',
      { orderId: createAd.json.order.id, simulate: true },
      cookieA,
    );
    assert.equal(confirmAd.status, 200);
    assert.equal(confirmAd.json.order.status, 'confirmed');
    assert.equal(confirmAd.json.founderRevenue.billboardAdsUsd, round2(revBefore.billboardAdsUsd + 29));
    assert.equal(confirmAd.json.founderRevenue.totalUsd, round2(revBefore.totalUsd + 9 + 29));
    const metaProj = confirmAd.json.state.projects.find((p) => p.id === 'proj-meta');
    assert.equal(metaProj.sponsoredBillboard, true);
  });

  it('17. Stablecoin wallet binding & dividend withdrawal (<$5 rejected -> valid payout -> admin mark-paid TxHash)', async () => {
    // Use founder-demo (has default balance or earn $36 net bounty to guarantee >= $10 USD balance)
    const claim = await apiJson(baseUrl, 'POST', '/api/tasks/task-i18n-ast-pr/claim', { workerId: 'w-pro-01' });
    assert.equal(claim.status, 200);
    const submit = await apiJson(baseUrl, 'POST', '/api/tasks/task-i18n-ast-pr/submit', {
      workerId: 'w-pro-01',
      prUrl: 'https://github.com/pixel-compute-town/i18n-pixelbot/pull/200',
      content: [
        'export function parseAstKeys(code) {',
        '  const found = [];',
        '  const rx = /t\\([\'"]([^\'"]+)[\'"]\\)/g;',
        '  let m; while ((m = rx.exec(code)) !== null) found.push(m[1]);',
        '  return found;',
        '}',
      ].join('\n'),
    });
    assert.equal(submit.status, 200);
    assert.equal(submit.json.passed, true);

    const balanceBefore = submit.json.state.player.usdBalance;
    assert.ok(balanceBefore >= 36, `Expected founder balance >= $36, got $${balanceBefore}`);

    // Requesting payout before binding wallet must fail with 400
    const noWalletPayout = await apiJson(baseUrl, 'POST', '/api/payouts/request', { amountUsd: 10 });
    assert.equal(noWalletPayout.status, 400);

    // Invalid EVM wallet address rejected with 400
    const badWallet = await apiJson(baseUrl, 'POST', '/api/wallet/bind', {
      chain: 'base',
      address: 'not-an-evm-wallet',
    });
    assert.equal(badWallet.status, 400);

    // Bind valid Base wallet
    const validWallet = '0x111122223333444455556666777788889999AaBb';
    const bindRes = await apiJson(baseUrl, 'POST', '/api/wallet/bind', {
      chain: 'base',
      address: validWallet,
    });
    assert.equal(bindRes.status, 200);
    assert.equal(bindRes.json.ok, true);
    assert.equal(bindRes.json.wallet.chain, 'base');
    assert.equal(bindRes.json.wallet.address, validWallet);

    // Below $5 minimum rejected with 400
    const tooSmall = await apiJson(baseUrl, 'POST', '/api/payouts/request', {
      amountUsd: 4.5,
      chain: 'base',
      token: 'USDC',
    });
    assert.equal(tooSmall.status, 400);

    // Valid $12 payout request deducts balance & creates pending payout
    const payoutReq = await apiJson(baseUrl, 'POST', '/api/payouts/request', {
      amountUsd: 12,
      chain: 'base',
      token: 'USDC',
    });
    assert.equal(payoutReq.status, 201);
    assert.equal(payoutReq.json.ok, true);
    assert.equal(payoutReq.json.payout.amountUsd, 12);
    assert.equal(payoutReq.json.payout.status, 'pending');
    assert.equal(payoutReq.json.state.player.usdBalance, round2(balanceBefore - 12));

    // Mayor marks payout paid with real EVM TxHash
    const payoutTxHash = `0x${'cd'.repeat(32)}`;
    const markPaid = await apiJson(
      baseUrl,
      'POST',
      `/api/admin/payouts/${encodeURIComponent(payoutReq.json.payout.id)}/mark-paid`,
      { txHash: payoutTxHash },
    );
    assert.equal(markPaid.status, 200);
    assert.equal(markPaid.json.ok, true);
    assert.equal(markPaid.json.payout.status, 'paid');
    assert.equal(markPaid.json.payout.txHash, payoutTxHash);
  });

  it('18. Fiat Polar/Stripe sandbox checkout & Redeem Code system (PIXEL-PRO-2026, 409 duplicate, admin generate)', async () => {
    const loginB = await apiJson(baseUrl, 'POST', '/api/auth/login', {
      email: 'bob@pixelcompute.test',
      password: 'bob-password-456',
    });
    const cookieB = loginB.cookie;
    const revBefore = loginB.json.state.founderRevenue;

    // Polar sandbox checkout for Genesis Skin Pack ($15)
    const polarOrder = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/checkout',
      { productId: 'shop-genesis-pack', provider: 'polar' },
      cookieB,
    );
    assert.equal(polarOrder.status, 201);
    assert.equal(polarOrder.json.provider, 'polar');
    assert.equal(polarOrder.json.sandboxMode, true);
    assert.equal(polarOrder.json.order.amountUsd, 15);

    const completePolar = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/sandbox/complete',
      { orderId: polarOrder.json.order.id },
      cookieB,
    );
    assert.equal(completePolar.status, 200);
    assert.equal(completePolar.json.order.status, 'confirmed');
    assert.ok(completePolar.json.state.player.ownedSkins.includes('skin-gold'));
    assert.ok(completePolar.json.state.player.ownedSkins.includes('skin-cat'));
    assert.equal(completePolar.json.founderRevenue.proSkinsUsd, round2(revBefore.proSkinsUsd + 15));

    // Redeem pre-seeded PIXEL-PRO-2026 -> activates Pro Pass for Bob
    const redeemPro = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/redeem',
      { code: 'PIXEL-PRO-2026' },
      cookieB,
    );
    assert.equal(redeemPro.status, 200);
    assert.equal(redeemPro.json.ok, true);
    assert.equal(redeemPro.json.state.player.isPro, true);

    // Redeeming the same code again returns 409
    const dupRedeem = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/redeem',
      { code: 'PIXEL-PRO-2026' },
      cookieB,
    );
    assert.equal(dupRedeem.status, 409);

    // Unknown redeem code returns 404
    const badRedeem = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/redeem',
      { code: 'NON-EXISTENT-CODE-999' },
      cookieB,
    );
    assert.equal(badRedeem.status, 404);

    // Founder admin generates a new gold_500 code and Bob redeems it
    const genRes = await apiJson(baseUrl, 'POST', '/api/admin/codes/generate', {
      rewardType: 'gold_500',
      count: 1,
      note: 'QA Automated Promo Batch',
    });
    assert.equal(genRes.status, 201);
    assert.equal(genRes.json.ok, true);
    assert.equal(genRes.json.codes.length, 1);
    const newCode = typeof genRes.json.codes[0] === 'string' ? genRes.json.codes[0] : genRes.json.codes[0].code;
    assert.ok(newCode && newCode.length >= 6);

    const goldBeforeRedeem = redeemPro.json.state.player.gold;
    const redeemGen = await apiJson(
      baseUrl,
      'POST',
      '/api/payments/redeem',
      { code: newCode },
      cookieB,
    );
    assert.equal(redeemGen.status, 200);
    assert.equal(redeemGen.json.state.player.gold, goldBeforeRedeem + 500);
  });

  it('19. One-click install scripts (/install.ps1, /install.sh, /download/pixel-worker.mjs) & Device Flow + strictDeviceReview', async () => {
    // Verify one-click install endpoints return 200 with expected content
    const ps1Res = await fetch(`${baseUrl}/install.ps1`);
    assert.equal(ps1Res.status, 200);
    const ps1Text = await ps1Res.text();
    assert.match(ps1Text, /download\/pixel-worker\.mjs/i);
    assert.match(ps1Text, /onboard/i);

    const shRes = await fetch(`${baseUrl}/install.sh`);
    assert.equal(shRes.status, 200);
    const shText = await shRes.text();
    assert.match(shText, /download\/pixel-worker\.mjs/i);
    assert.match(shText, /onboard/i);

    const dlRes = await fetch(`${baseUrl}/download/pixel-worker.mjs`);
    assert.equal(dlRes.status, 200);
    const dlText = await dlRes.text();
    assert.match(dlText, /pixel-worker/i);
    assert.match(dlText, /runOnboard/);

    // Standard Device Flow (strictDeviceReview = false)
    const start1 = await apiJson(baseUrl, 'POST', '/api/device/start', {
      deviceName: 'QA-Laptop-01',
      os: 'Windows (win32 x64)',
      cliTools: ['gemini', 'git'],
    });
    assert.equal(start1.status, 201);
    assert.equal(start1.json.ok, true);
    assert.match(start1.json.code, /^PCT-[A-Z0-9]{4}-[A-Z0-9]{2}$/);
    assert.ok(start1.json.deviceSecret);
    assert.match(start1.json.verifyUrl, /\/onboard\?code=PCT-/);

    // Public status omits deviceSecret
    const status1 = await apiJson(baseUrl, 'GET', `/api/device/status?code=${encodeURIComponent(start1.json.code)}`);
    assert.equal(status1.status, 200);
    assert.equal(status1.json.device.deviceName, 'QA-Laptop-01');
    assert.equal(status1.json.device.status, 'pending');
    assert.equal(status1.json.device.deviceSecret, undefined);

    // Poll before approval -> pending
    const poll1Before = await apiJson(
      baseUrl,
      'GET',
      `/api/device/poll?code=${encodeURIComponent(start1.json.code)}&secret=${encodeURIComponent(start1.json.deviceSecret)}`,
    );
    assert.equal(poll1Before.status, 200);
    assert.equal(poll1Before.json.status, 'pending');

    // Approve -> immediately approved
    const approve1 = await apiJson(baseUrl, 'POST', '/api/device/approve', {
      code: start1.json.code,
      workerRoleClass: 'pro_architect',
      workerName: 'QA-Laptop 小人',
    });
    assert.equal(approve1.status, 200);
    assert.equal(approve1.json.status, 'approved');
    assert.equal(approve1.json.requiresAdminReview, false);

    // Poll after approval -> approved + workerId
    const poll1After = await apiJson(
      baseUrl,
      'GET',
      `/api/device/poll?code=${encodeURIComponent(start1.json.code)}&secret=${encodeURIComponent(start1.json.deviceSecret)}`,
    );
    assert.equal(poll1After.status, 200);
    assert.equal(poll1After.json.status, 'approved');
    assert.ok(poll1After.json.workerId);

    // Enable strictDeviceReview mode -> device enters pending_review until mayor approves
    const enableStrict = await apiJson(baseUrl, 'PATCH', '/api/admin/settings', {
      strictDeviceReview: true,
    });
    assert.equal(enableStrict.status, 200);
    assert.equal(enableStrict.json.settings.strictDeviceReview, true);

    const start2 = await apiJson(baseUrl, 'POST', '/api/device/start', {
      deviceName: 'Strict-Workstation-02',
      os: 'macOS (darwin arm64)',
      cliTools: ['claude', 'codex', 'git'],
    });
    assert.equal(start2.status, 201);

    const approve2 = await apiJson(baseUrl, 'POST', '/api/device/approve', {
      code: start2.json.code,
      workerRoleClass: 'guild_hunter',
      workerName: '嚴格審核小人',
    });
    assert.equal(approve2.status, 200);
    assert.equal(approve2.json.status, 'pending_review');
    assert.equal(approve2.json.requiresAdminReview, true);

    const poll2Pending = await apiJson(
      baseUrl,
      'GET',
      `/api/device/poll?code=${encodeURIComponent(start2.json.code)}&secret=${encodeURIComponent(start2.json.deviceSecret)}`,
    );
    assert.equal(poll2Pending.status, 200);
    assert.equal(poll2Pending.json.status, 'pending_review');

    // Mayor reviews & approves
    const review2 = await apiJson(
      baseUrl,
      'POST',
      `/api/admin/devices/${encodeURIComponent(start2.json.code)}/review`,
      { action: 'approve', note: 'Verified trusted developer machine' },
    );
    assert.equal(review2.status, 200);
    assert.equal(review2.json.status, 'approved');

    const poll2Approved = await apiJson(
      baseUrl,
      'GET',
      `/api/device/poll?code=${encodeURIComponent(start2.json.code)}&secret=${encodeURIComponent(start2.json.deviceSecret)}`,
    );
    assert.equal(poll2Approved.status, 200);
    assert.equal(poll2Approved.json.status, 'approved');
    assert.ok(poll2Approved.json.workerId);

    // Turn strictDeviceReview back off cleanly
    await apiJson(baseUrl, 'PATCH', '/api/admin/settings', { strictDeviceReview: false });
  });

  it('20. Official Landing (/), Town App (/app), Onboard (/onboard) HTML routes & GET /api/public/stats', async () => {
    const landingRes = await fetch(`${baseUrl}/`);
    assert.equal(landingRes.status, 200);
    assert.match(landingRes.headers.get('content-type') || '', /^text\/html/i);
    const landingHtml = await landingRes.text();
    assert.match(landingHtml, /landing\.js|landing\.css/, 'GET / must serve public/landing.html');

    const appRes = await fetch(`${baseUrl}/app`);
    assert.equal(appRes.status, 200);
    assert.match(appRes.headers.get('content-type') || '', /^text\/html/i);
    const appHtml = await appRes.text();
    assert.match(appHtml, /town-canvas/, 'GET /app must serve public/index.html');

    const onboardRes = await fetch(`${baseUrl}/onboard`);
    assert.equal(onboardRes.status, 200);
    assert.match(onboardRes.headers.get('content-type') || '', /^text\/html/i);
    const onboardHtml = await onboardRes.text();
    assert.match(onboardHtml, /onboard\.js|onboard\.css/, 'GET /onboard must serve public/onboard.html');

    const statsRes = await apiJson(baseUrl, 'GET', '/api/public/stats');
    assert.equal(statsRes.status, 200);
    assert.equal(statsRes.json.ok, true);
    assert.equal(typeof statsRes.json.projectsCount, 'number');
    assert.ok(statsRes.json.projectsCount >= 3);
    assert.equal(typeof statsRes.json.buildingCount, 'number');
    assert.equal(typeof statsRes.json.launchedCount, 'number');
    assert.equal(typeof statsRes.json.completedTasksCount, 'number');
    assert.equal(typeof statsRes.json.openTasksCount, 'number');
    assert.equal(typeof statsRes.json.totalRevenueUsd, 'number');
    assert.equal(typeof statsRes.json.totalUsersCount, 'number');
    assert.ok(statsRes.json.totalUsersCount >= 3, 'Should count founder + registered test users');
    assert.ok(Array.isArray(statsRes.json.featuredProjects) && statsRes.json.featuredProjects.length >= 1);
  });

  it('21. Idea Provenance SHA-256 hash chain & public verification API (full hash, prefix, 404 fake hash)', async () => {
    const chainBefore = await apiJson(baseUrl, 'GET', '/api/provenance/chain');
    assert.equal(chainBefore.status, 200);
    assert.equal(chainBefore.json.ok, true);
    assert.equal(chainBefore.json.valid, true, 'Initial provenance chain must be cryptographically valid');
    assert.ok(chainBefore.json.chainLength >= 3);
    assert.equal(chainBefore.json.genesisHash, '0'.repeat(64));
    assert.match(chainBefore.json.headHash, /^[a-f0-9]{64}$/);
    assert.equal(chainBefore.json.records.length, chainBefore.json.chainLength);
    assert.equal(chainBefore.json.records[0].prevIdeaHash, chainBefore.json.genesisHash);
    for (let i = 0; i < chainBefore.json.records.length; i += 1) {
      const rec = chainBefore.json.records[i];
      assert.equal(rec.verified, true, `Record #${i} (${rec.projectId}) must be verified`);
      assert.match(rec.ideaHash, /^[a-f0-9]{64}$/);
      if (i > 0) {
        assert.equal(rec.prevIdeaHash, chainBefore.json.records[i - 1].ideaHash);
      }
    }

    // Propose a brand-new original project -> must auto-link to previous headHash
    const propRes = await apiJson(baseUrl, 'POST', '/api/projects', {
      name: 'RetroSynth DAW（像素晶片合成器）',
      tagline: '在瀏覽器用 8-bit 波形積木共創開源遊戲配樂',
      description: '支援 WebAudio 即時混音、MIDI 匯出與創作者分軌協作的像素音樂工作站',
      votesRequired: 5,
    });
    assert.equal(propRes.status, 201);
    const createdProj = propRes.json.project;
    assert.match(createdProj.ideaHash, /^[a-f0-9]{64}$/);
    assert.equal(createdProj.prevIdeaHash, chainBefore.json.headHash, 'New proposal must link to previous headHash');
    assert.equal(createdProj.provenanceIndex, chainBefore.json.chainLength);
    assert.equal(createdProj.sparkRoyaltyPct, 5);
    assert.equal(createdProj.meritPoolPct, 85);
    assert.equal(createdProj.platformSharePct, 10);
    assert.ok(Array.isArray(createdProj.coBuilders) && createdProj.coBuilders.length === 1);

    // Chain length increments by 1 and remains valid === true
    const chainAfter = await apiJson(baseUrl, 'GET', '/api/provenance/chain');
    assert.equal(chainAfter.status, 200);
    assert.equal(chainAfter.json.valid, true);
    assert.equal(chainAfter.json.chainLength, chainBefore.json.chainLength + 1);
    assert.equal(chainAfter.json.headHash, createdProj.ideaHash);

    // Public verify by full 64-char SHA-256 hash
    const verifyFull = await apiJson(baseUrl, 'GET', `/api/provenance/verify/${createdProj.ideaHash}`);
    assert.equal(verifyFull.status, 200);
    assert.equal(verifyFull.json.ok, true);
    assert.equal(verifyFull.json.verified, true);
    assert.equal(verifyFull.json.chainValid, true);
    assert.equal(verifyFull.json.record.projectId, createdProj.id);
    assert.equal(verifyFull.json.record.ideaHash, createdProj.ideaHash);
    assert.equal(verifyFull.json.project.id, createdProj.id);

    // Public verify by 10-char prefix
    const prefix = createdProj.ideaHash.slice(0, 10);
    const verifyPrefix = await apiJson(baseUrl, 'GET', `/api/provenance/verify/${prefix}`);
    assert.equal(verifyPrefix.status, 200);
    assert.equal(verifyPrefix.json.ok, true);
    assert.equal(verifyPrefix.json.verified, true);
    assert.equal(verifyPrefix.json.record.projectId, createdProj.id);
    assert.equal(verifyPrefix.json.record.ideaHash, createdProj.ideaHash);

    // Fake 64-char hash returns 404
    const verifyFake = await apiJson(baseUrl, 'GET', `/api/provenance/verify/${'f'.repeat(64)}`);
    assert.equal(verifyFake.status, 404);
    assert.equal(verifyFake.json.ok, false);
    assert.equal(verifyFake.json.verified, false);

    // Too-short / malformed hash returns 404
    const verifyShort = await apiJson(baseUrl, 'GET', '/api/provenance/verify/abc123');
    assert.equal(verifyShort.status, 404);
    assert.equal(verifyShort.json.verified, false);
  });

  it('22. Anti-copycat similarity detection, HTTP 409 POTENTIAL_COPYCAT blocking & idempotent co-builder join', async () => {
    // Retrieve the original RetroSynth DAW project created in #21
    const boot = await apiJson(baseUrl, 'GET', '/api/bootstrap');
    const originalProj = boot.json.state.projects.find((p) => p.name.includes('RetroSynth DAW'));
    assert.ok(originalProj, 'Original RetroSynth DAW project must exist');

    // 1. Check similarity on a highly similar / near-copycat proposal -> isHighRisk === true
    const simHigh = await apiJson(baseUrl, 'POST', '/api/projects/check-similarity', {
      name: 'RetroSynth DAW（像素晶片合成器）',
      tagline: '在瀏覽器用 8-bit 波形積木共創開源遊戲配樂',
    });
    assert.equal(simHigh.status, 200);
    assert.equal(simHigh.json.ok, true);
    assert.equal(simHigh.json.isHighRisk, true);
    assert.equal(simHigh.json.isWarning, true);
    assert.ok(simHigh.json.topMatch);
    assert.equal(simHigh.json.topMatch.projectId, originalProj.id);
    assert.equal(simHigh.json.topMatch.originatorName, originalProj.originatorName);
    assert.equal(simHigh.json.topMatch.ideaHash, originalProj.ideaHash);
    assert.ok(simHigh.json.topMatch.similarity >= 0.65);

    // 2. Check similarity on a completely unrelated original idea -> isHighRisk === false
    const simLow = await apiJson(baseUrl, 'POST', '/api/projects/check-similarity', {
      name: 'DeepSea Sonar Atlas',
      tagline: 'Interactive bathymetric ocean floor mapping toolkit',
    });
    assert.equal(simLow.status, 200);
    assert.equal(simLow.json.ok, true);
    assert.equal(simLow.json.isHighRisk, false);
    assert.equal(simLow.json.isWarning, false);

    // 3. Submitting a highly duplicate proposal without acknowledgeDerivative must be blocked with HTTP 409 POTENTIAL_COPYCAT
    const copycatAttempt = await apiJson(baseUrl, 'POST', '/api/projects', {
      name: 'RetroSynth DAW（像素晶片合成器）',
      tagline: '在瀏覽器用 8-bit 波形積木共創開源遊戲配樂',
      votesRequired: 4,
    });
    assert.equal(copycatAttempt.status, 409);
    assert.equal(copycatAttempt.json.ok, false);
    assert.equal(copycatAttempt.json.code, 'POTENTIAL_COPYCAT');
    assert.ok(copycatAttempt.json.copycatMatch);
    assert.equal(copycatAttempt.json.copycatMatch.projectId, originalProj.id);
    assert.equal(copycatAttempt.json.copycatMatch.originatorName, originalProj.originatorName);
    assert.equal(copycatAttempt.json.copycatMatch.ideaHash, originalProj.ideaHash);
    assert.ok(copycatAttempt.json.copycatMatch.similarity >= 0.65);

    // 4. Explicitly acknowledging derivative creation links inspiredByHash cleanly
    const derivativeOk = await apiJson(baseUrl, 'POST', '/api/projects', {
      name: 'RetroSynth DAW（像素晶片合成器）Mobile Edition',
      tagline: '在瀏覽器用 8-bit 波形積木共創開源遊戲配樂（行動端延伸版）',
      acknowledgeDerivative: true,
    });
    assert.equal(derivativeOk.status, 201);
    assert.equal(derivativeOk.json.project.inspiredByHash, originalProj.ideaHash);

    // 5. Another developer joins the original project as a co-builder (idempotent)
    const loginBob = await apiJson(baseUrl, 'POST', '/api/auth/login', {
      email: 'bob@pixelcompute.test',
      password: 'bob-password-456',
    });
    assert.equal(loginBob.status, 200);
    const bobCookie = loginBob.cookie;
    const bobId = loginBob.json.user.id;
    const countBefore = originalProj.coBuilders.length;

    const joinFirst = await apiJson(
      baseUrl,
      'POST',
      `/api/projects/${originalProj.id}/join`,
      {},
      bobCookie,
    );
    assert.equal(joinFirst.status, 200);
    assert.equal(joinFirst.json.ok, true);
    assert.equal(joinFirst.json.alreadyJoined, false);
    assert.equal(joinFirst.json.coBuildersCount, countBefore + 1);
    assert.ok(joinFirst.json.project.coBuilders.some((b) => b.userId === bobId));

    // Joining a second time must be idempotent (alreadyJoined: true, count unchanged, no duplicate)
    const joinSecond = await apiJson(
      baseUrl,
      'POST',
      `/api/projects/${originalProj.id}/join`,
      {},
      bobCookie,
    );
    assert.equal(joinSecond.status, 200);
    assert.equal(joinSecond.json.ok, true);
    assert.equal(joinSecond.json.alreadyJoined, true);
    assert.equal(joinSecond.json.coBuildersCount, countBefore + 1);
    const bobEntries = joinSecond.json.project.coBuilders.filter((b) => b.userId === bobId);
    assert.equal(bobEntries.length, 1, 'Co-builder list must remain deduplicated');

    // Joining a non-existent project returns 404
    const joinMissing = await apiJson(baseUrl, 'POST', '/api/projects/proj-does-not-exist/join', {}, bobCookie);
    assert.equal(joinMissing.status, 404);
  });

  it('23. Anti-dilution 70/30 bucket cap dividend math (100 core -> $595, 10,000 peripheral -> strictly capped at $255 on $1,000 revenue)', async () => {
    // 1. Direct unit math proof on computeAntiDilutionMeritSplit ($850 merit pool)
    const pureSplit = computeAntiDilutionMeritSplit(
      {
        id: 'proj-math-proof',
        poolCaps: { coreSharePct: 70, peripheralSharePct: 30 },
        bucketPoints: {
          core: { 'core-dev': 100 },
          peripheral: { 'spam-farmer': 10000 },
        },
      },
      850,
    );
    assert.equal(pureSplit.corePoolUsd, 595, 'Core pool must be exactly 70% of $850 = $595');
    assert.equal(pureSplit.peripheralPoolUsd, 255, 'Peripheral pool must be strictly capped at 30% of $850 = $255');
    assert.deepEqual(pureSplit.bucketCaps, { core: 70, peripheral: 30 });
    assert.equal(pureSplit.payoutsByUserId['core-dev'], 595);
    assert.equal(pureSplit.payoutsByUserId['spam-farmer'], 255);

    // Single-bucket non-waste rule: core-only or peripheral-only receives 100% of $850 merit pool
    const coreOnlySplit = computeAntiDilutionMeritSplit(
      { bucketPoints: { core: { 'core-dev': 100 }, peripheral: {} } },
      850,
    );
    assert.equal(coreOnlySplit.corePoolUsd, 850);
    assert.equal(coreOnlySplit.peripheralPoolUsd, 0);
    assert.equal(coreOnlySplit.payoutsByUserId['core-dev'], 850);

    const periphOnlySplit = computeAntiDilutionMeritSplit(
      { bucketPoints: { core: {}, peripheral: { 'docs-dev': 500 } } },
      850,
    );
    assert.equal(periphOnlySplit.corePoolUsd, 0);
    assert.equal(periphOnlySplit.peripheralPoolUsd, 850);
    assert.equal(periphOnlySplit.payoutsByUserId['docs-dev'], 850);

    // 2. Full end-to-end HTTP server lifecycle with $1,000 launch revenue & persisted user balances
    const isoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pct-anti-dilution-'));
    let isoServer = null;
    try {
      let started = await startServer(isoDir);
      isoServer = started.server;
      let isoUrl = started.baseUrl;

      // Register 3 distinct users: Originator (5% spark), Core Builder (100 core pts), Peripheral Spammer (10,000 peripheral pts)
      const regOrig = await apiJson(isoUrl, 'POST', '/api/auth/register', {
        email: 'orig-7030@pixelcompute.test',
        password: 'orig-password-123',
        displayName: 'Spark Originator',
      });
      assert.equal(regOrig.status, 201);
      const origCookie = regOrig.cookie;
      const origId = regOrig.json.user.id;

      const regCore = await apiJson(isoUrl, 'POST', '/api/auth/register', {
        email: 'core-7030@pixelcompute.test',
        password: 'core-password-123',
        displayName: 'Core Architect',
      });
      assert.equal(regCore.status, 201);
      const coreCookie = regCore.cookie;
      const coreId = regCore.json.user.id;

      const regSpammer = await apiJson(isoUrl, 'POST', '/api/auth/register', {
        email: 'spam-7030@pixelcompute.test',
        password: 'spam-password-123',
        displayName: 'Peripheral Farmer',
      });
      assert.equal(regSpammer.status, 201);
      const spamCookie = regSpammer.cookie;
      const spamId = regSpammer.json.user.id;

      // Originator proposes a unique project and Core Builder unlocks it
      const propRes = await apiJson(
        isoUrl,
        'POST',
        '/api/projects',
        {
          name: 'AntiDilution Vault Protocol',
          tagline: 'Mathematically isolated 70/30 core-vs-peripheral contributor dividend engine',
          votesRequired: 2,
        },
        origCookie,
      );
      assert.equal(propRes.status, 201);
      const projId = propRes.json.project.id;

      const unlockRes = await apiJson(isoUrl, 'POST', `/api/projects/${projId}/vote`, {}, coreCookie);
      assert.equal(unlockRes.status, 200);
      assert.equal(unlockRes.json.unlocked, true);

      // Verify generated tasks carry accurate poolBucket tags (core vs peripheral)
      const genTasks = unlockRes.json.generatedTasks;
      const coreTask = genTasks.find((t) => t.track === 'guild_bounty');
      const periphTask = genTasks.find((t) => t.track === 'api_auto' && t.category === 'i18n');
      assert.equal(coreTask.poolBucket, 'core');
      assert.equal(periphTask.poolBucket, 'peripheral');

      // Core Builder completes a real core task -> recorded in bucketPoints.core
      const coreBoot = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, coreCookie);
      const coreWorker = coreBoot.json.state.workers.find((w) => w.track === 'quota');
      const coreClaim = await apiJson(isoUrl, 'POST', `/api/tasks/${coreTask.id}/claim`, { workerId: coreWorker.id }, coreCookie);
      assert.equal(coreClaim.status, 200);
      const coreSubmit = await apiJson(
        isoUrl,
        'POST',
        `/api/tasks/${coreTask.id}/submit`,
        {
          workerId: coreWorker.id,
          prUrl: 'https://github.com/pixel-compute-town/anti-dilution/pull/1',
          content: [
            'export function enforceCoreBucketFloor(corePts, periphPts, poolUsd) {',
            '  if (corePts > 0 && periphPts > 0) return { core: poolUsd * 0.7, peripheral: poolUsd * 0.3 };',
            '  return { core: corePts > 0 ? poolUsd : 0, peripheral: periphPts > 0 ? poolUsd : 0 };',
            '}',
          ].join('\n'),
        },
        coreCookie,
      );
      assert.equal(coreSubmit.status, 200);
      assert.equal(coreSubmit.json.passed, true);
      assert.equal(coreSubmit.json.rewards.poolBucket, 'core');
      assert.ok(coreSubmit.json.project.bucketPoints.core[coreId] > 0);

      // Peripheral Farmer completes a real peripheral task -> recorded in bucketPoints.peripheral
      const spamBoot = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, spamCookie);
      const spamWorker = spamBoot.json.state.workers.find((w) => w.track === 'api');
      const spamClaim = await apiJson(isoUrl, 'POST', `/api/tasks/${periphTask.id}/claim`, { workerId: spamWorker.id }, spamCookie);
      assert.equal(spamClaim.status, 200);
      const spamSubmit = await apiJson(
        isoUrl,
        'POST',
        `/api/tasks/${periphTask.id}/submit`,
        {
          workerId: spamWorker.id,
          content: JSON.stringify({
            en: { title: 'AntiDilution Vault', button: 'Verify Split', badge: '70/30 Cap' },
            'zh-TW': { title: '防稀釋金庫', button: '驗證分紅', badge: '70/30 隔離' },
          }, null, 2),
        },
        spamCookie,
      );
      assert.equal(spamSubmit.status, 200);
      assert.equal(spamSubmit.json.passed, true);
      assert.equal(spamSubmit.json.rewards.poolBucket, 'peripheral');
      assert.ok(spamSubmit.json.project.bucketPoints.peripheral[spamId] > 0);

      // Simulate extreme peripheral farming (100 core vs 10,000 peripheral) & 100% progress via persisted state.json
      await stopServer(isoServer);
      isoServer = null;

      const statePath = path.join(isoDir, 'state.json');
      const persisted = JSON.parse(await fs.readFile(statePath, 'utf8'));
      const targetProj = persisted.projects.find((p) => p.id === projId);
      assert.ok(targetProj);
      targetProj.progressPct = 100;
      targetProj.poolCaps = { coreSharePct: 70, peripheralSharePct: 30 };
      targetProj.bucketPoints = {
        core: { [coreId]: 100 },
        peripheral: { [spamId]: 10000 },
      };
      targetProj.contributions = {
        [coreId]: 100,
        [spamId]: 10000,
      };
      await fs.writeFile(statePath, JSON.stringify(persisted, null, 2), 'utf8');

      started = await startServer(isoDir);
      isoServer = started.server;
      isoUrl = started.baseUrl;

      // Snapshot pre-launch balances
      const origPre = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, origCookie);
      const corePre = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, coreCookie);
      const spamPre = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, spamCookie);
      const origUsdBefore = origPre.json.state.player.usdBalance;
      const coreUsdBefore = corePre.json.state.player.usdBalance;
      const spamUsdBefore = spamPre.json.state.player.usdBalance;
      const carryBefore = corePre.json.state.founderRevenue.incubationCarryUsd;

      // Launch with $1,000 initial revenue -> $50 spark (5%), $100 platform (10%), $850 merit pool (85%)
      // Inside $850 merit pool: Core gets EXACTLY $595 (85% x 70% = 59.5%), Peripheral Farmer capped at $255 (85% x 30% = 25.5%)
      const launchRes = await apiJson(
        isoUrl,
        'POST',
        `/api/projects/${projId}/launch`,
        { initialRevenueUsd: 1000 },
        coreCookie,
      );
      assert.equal(launchRes.status, 200);
      const div = launchRes.json.dividend;
      assert.equal(div.grossRevenueUsd, 1000);
      assert.equal(div.sparkRoyaltyUsd, 50, '5% First Spark royalty on $1,000 must be $50');
      assert.equal(div.platformCarryUsd, 100, '10% Platform carry on $1,000 must be $100');
      assert.equal(div.meritPoolUsd, 850, '85% Merit pool on $1,000 must be $850');
      assert.equal(div.corePoolUsd, 595, 'Core pool (85% x 70%) must be EXACTLY $595');
      assert.equal(div.peripheralPoolUsd, 255, 'Peripheral pool (85% x 30%) must be STRICTLY capped at $255');
      assert.deepEqual(div.bucketCaps, { core: 70, peripheral: 30 });

      assert.equal(div.payoutsByUser[origId].sparkUsd, 50);
      assert.equal(div.payoutsByUser[origId].totalUsd, 50);
      assert.equal(div.payoutsByUser[coreId].corePoints, 100);
      assert.equal(div.payoutsByUser[coreId].coreUsd, 595);
      assert.equal(div.payoutsByUser[coreId].peripheralUsd, 0);
      assert.equal(div.payoutsByUser[coreId].totalUsd, 595, 'Core contributor must receive EXACTLY $595 (59.5%) with zero dilution');
      assert.equal(div.payoutsByUser[spamId].peripheralPoints, 10000);
      assert.equal(div.payoutsByUser[spamId].coreUsd, 0);
      assert.equal(div.payoutsByUser[spamId].peripheralUsd, 255);
      assert.equal(div.payoutsByUser[spamId].totalUsd, 255, '10,000-point peripheral spammer must be capped at $255 (25.5%)');
      assert.equal(round2(div.payouts.reduce((sum, p) => sum + p.amountUsd, 0)), 1000);

      // Confirm persisted USD balances & founderRevenue
      const origPost = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, origCookie);
      const corePost = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, coreCookie);
      const spamPost = await apiJson(isoUrl, 'GET', '/api/bootstrap', undefined, spamCookie);
      assert.equal(origPost.json.state.player.usdBalance, round2(origUsdBefore + 50));
      assert.equal(corePost.json.state.player.usdBalance, round2(coreUsdBefore + 595));
      assert.equal(spamPost.json.state.player.usdBalance, round2(spamUsdBefore + 255));
      assert.equal(launchRes.json.founderRevenue.incubationCarryUsd, round2(carryBefore + 100));

      // Verify subsequent simulate-revenue ($1,000) enforces the exact same $50 / $595 / $255 / $100 split
      const simRes = await apiJson(
        isoUrl,
        'POST',
        `/api/projects/${projId}/simulate-revenue`,
        { amountUsd: 1000 },
        coreCookie,
      );
      assert.equal(simRes.status, 200);
      assert.equal(simRes.json.dividend.corePoolUsd, 595);
      assert.equal(simRes.json.dividend.peripheralPoolUsd, 255);
      assert.equal(simRes.json.dividend.payoutsByUser[coreId].totalUsd, 595);
      assert.equal(simRes.json.dividend.payoutsByUser[spamId].totalUsd, 255);
    } finally {
      await stopServer(isoServer);
      await fs.rm(isoDir, { recursive: true, force: true });
    }
  });

  it('24. Stake gold deposit/refund, two-stage peer review queue (rev-slop-01 slash 30G, rev-clean-01 +15G), submitForReview & WORKER_COOLDOWN (429)', async () => {
    const isoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pct-gov-review-'));
    const started = await startServer(isoDir);
    const isoUrl = started.baseUrl;

    try {
      // 1. GET /api/reviews must include pre-seeded rev-clean-01 and rev-slop-01
      const revList = await apiJson(isoUrl, 'GET', '/api/reviews');
      assert.equal(revList.status, 200);
      assert.equal(revList.json.ok, true);
      assert.ok(Array.isArray(revList.json.reviewQueue));

      const cleanItem = revList.json.reviewQueue.find((r) => r.id === 'rev-clean-01');
      const slopItem = revList.json.reviewQueue.find((r) => r.id === 'rev-slop-01');
      assert.ok(cleanItem, 'Seeded reviewQueue must include rev-clean-01');
      assert.ok(slopItem, 'Seeded reviewQueue must include rev-slop-01');
      assert.equal(cleanItem.stakeGold, 25);
      assert.equal(cleanItem.aiReview.aiScore, 94);
      assert.equal(cleanItem.aiReview.riskLevel, 'low');
      assert.equal(slopItem.stakeGold, 30);
      assert.equal(slopItem.aiReview.aiScore, 21);
      assert.equal(slopItem.aiReview.riskLevel, 'high');
      assert.equal(slopItem.aiReview.bloatRatioPct, 87);

      // 2. Unrelated brand-new user with 0 contributions cannot decide reviews (HTTP 403 REVIEWER_NOT_ELIGIBLE)
      const regOutsider = await apiJson(isoUrl, 'POST', '/api/auth/register', {
        email: 'outsider-rev@pixelcompute.test',
        password: 'outsider-pass-123',
        displayName: 'Unrelated Newbie',
      });
      assert.equal(regOutsider.status, 201);
      const outsiderDecide = await apiJson(
        isoUrl,
        'POST',
        '/api/reviews/rev-slop-01/decide',
        { decision: 'reject', reason: 'Unauthorized attempt' },
        regOutsider.cookie,
      );
      assert.equal(outsiderDecide.status, 403);
      assert.equal(outsiderDecide.json.ok, false);
      assert.equal(outsiderDecide.json.code, 'REVIEWER_NOT_ELIGIBLE');

      // 3. Reject rev-slop-01 as eligible reviewer (founding mayor): reviewer seizes 30G stake, slop submitter gets 0 contribution
      const bootBeforeSlop = await apiJson(isoUrl, 'GET', '/api/bootstrap');
      const mayorGoldBeforeSlop = bootBeforeSlop.json.state.player.gold;
      const projI18nBefore = bootBeforeSlop.json.state.projects.find((p) => p.id === 'proj-i18n');
      assert.equal(projI18nBefore.contributions['npc-slopbot'] || 0, 0);

      const rejectSlop = await apiJson(isoUrl, 'POST', '/api/reviews/rev-slop-01/decide', {
        decision: 'reject',
        reason: 'Detected 87% repetitive AI slop boilerplate',
      });
      assert.equal(rejectSlop.status, 200);
      assert.equal(rejectSlop.json.ok, true);
      assert.equal(rejectSlop.json.decision, 'reject');
      assert.equal(rejectSlop.json.slashedStakeGold, 30, 'Reviewer must seize 30G stake from SlopBot');
      assert.equal(rejectSlop.json.seizedGold, 30);
      assert.equal(rejectSlop.json.state.player.gold, mayorGoldBeforeSlop + 30, 'Mayor gold must increase by seized 30G');
      const projI18nAfter = rejectSlop.json.state.projects.find((p) => p.id === 'proj-i18n');
      assert.equal(projI18nAfter.contributions['npc-slopbot'] || 0, 0, 'Slop submitter must receive 0 contribution');
      assert.equal(projI18nAfter.bucketPoints.core['npc-slopbot'] || 0, 0);
      assert.ok(!rejectSlop.json.state.reviewQueue.some((r) => r.id === 'rev-slop-01'));
      assert.ok(rejectSlop.json.state.reviewHistory.some((r) => r.id === 'rev-slop-01' && r.decision === 'reject'));

      // 4. Approve rev-clean-01: reviewer earns +15G & +5 pts, contributor npc-rin receives +60 core points
      const mayorGoldBeforeClean = rejectSlop.json.state.player.gold;
      const projMetaBefore = rejectSlop.json.state.projects.find((p) => p.id === 'proj-meta');
      const rinCoreBefore = projMetaBefore.bucketPoints?.core?.['npc-rin'] || 0;
      const rinTotalBefore = projMetaBefore.contributions?.['npc-rin'] || 0;

      const approveClean = await apiJson(isoUrl, 'POST', '/api/reviews/rev-clean-01/decide', {
        decision: 'approve',
        reason: 'Clean keyboard shortcut implementation with focus guards',
      });
      assert.equal(approveClean.status, 200);
      assert.equal(approveClean.json.ok, true);
      assert.equal(approveClean.json.decision, 'approve');
      assert.equal(approveClean.json.reviewerRewardGold, 15, 'Approving reviewer must receive +15G');
      assert.equal(approveClean.json.reviewerRewardPoints, 5, 'Approving reviewer must receive +5 contribution points');
      assert.equal(approveClean.json.state.player.gold, mayorGoldBeforeClean + 15);
      const projMetaAfter = approveClean.json.state.projects.find((p) => p.id === 'proj-meta');
      assert.equal(projMetaAfter.bucketPoints.core['npc-rin'], rinCoreBefore + cleanItem.contributionPoints);
      assert.equal(projMetaAfter.contributions['npc-rin'], rinTotalBefore + cleanItem.contributionPoints);
      assert.ok(!approveClean.json.state.reviewQueue.some((r) => r.id === 'rev-clean-01'));
      assert.ok(approveClean.json.state.reviewHistory.some((r) => r.id === 'rev-clean-01' && r.decision === 'approve'));

      // 5. Claim guild task freezes stake gold -> release refunds full stake gold
      const goldBeforeStake = approveClean.json.state.player.gold;
      const claimBounty = await apiJson(isoUrl, 'POST', '/api/tasks/task-i18n-ast-pr/claim', {
        workerId: 'w-pro-01',
      });
      assert.equal(claimBounty.status, 200);
      assert.equal(claimBounty.json.stakedGold, 30, 'High-value $40 cash bounty should freeze 30G stake');
      assert.equal(claimBounty.json.task.stakedGold, 30);
      assert.equal(claimBounty.json.state.player.gold, goldBeforeStake - 30);

      const releaseBounty = await apiJson(isoUrl, 'POST', '/api/tasks/task-i18n-ast-pr/release', {
        workerId: 'w-pro-01',
        reason: 'Testing full stake refund on clean release',
      });
      assert.equal(releaseBounty.status, 200);
      assert.equal(releaseBounty.json.refundedStakeGold, 30);
      assert.equal(releaseBounty.json.task.status, 'open');
      assert.equal(releaseBounty.json.task.stakedGold, 0);
      assert.equal(releaseBounty.json.state.player.gold, goldBeforeStake, 'Release must refund 100% of frozen stake gold');

      // 6. Re-claim & submit with submitForReview: true -> enters pending_review -> peer approve completes task
      const reClaimBounty = await apiJson(isoUrl, 'POST', '/api/tasks/task-i18n-ast-pr/claim', {
        workerId: 'w-pro-01',
      });
      assert.equal(reClaimBounty.status, 200);
      assert.equal(reClaimBounty.json.state.player.gold, goldBeforeStake - 30);

      const submitQueued = await apiJson(isoUrl, 'POST', '/api/tasks/task-i18n-ast-pr/submit', {
        workerId: 'w-pro-01',
        prUrl: 'https://github.com/pixel-compute-town/i18n-pixelbot/pull/512',
        submitForReview: true,
        content: [
          'export function extractJsxTranslationKeys(source) {',
          '  const keys = new Set();',
          '  const re = /\\bt\\(\\s*[\'"]([a-z0-9_.-]+)[\'"]\\s*\\)/gi;',
          '  let match;',
          '  while ((match = re.exec(source)) !== null) keys.add(match[1]);',
          '  return Array.from(keys);',
          '}',
        ].join('\n'),
      });
      assert.equal(submitQueued.status, 200);
      assert.equal(submitQueued.json.ok, true);
      assert.equal(submitQueued.json.passed, true);
      assert.equal(submitQueued.json.pendingReview, true);
      assert.equal(submitQueued.json.task.status, 'pending_review');
      assert.ok(submitQueued.json.reviewItem?.id);
      assert.equal(submitQueued.json.reviewItem.stakeGold, 30);
      assert.equal(submitQueued.json.reviewItem.poolBucket, 'core');
      assert.equal(typeof submitQueued.json.reviewItem.aiReview?.aiScore, 'number');

      const reviewsWithQueued = await apiJson(isoUrl, 'GET', '/api/reviews');
      assert.ok(
        reviewsWithQueued.json.reviewQueue.some((r) => r.id === submitQueued.json.reviewItem.id),
        'Submitted PR must appear in GET /api/reviews queue',
      );

      const usdBeforeDynamicApprove = submitQueued.json.state.player.usdBalance;
      const approveQueued = await apiJson(
        isoUrl,
        'POST',
        `/api/reviews/${encodeURIComponent(submitQueued.json.reviewItem.id)}/decide`,
        { decision: 'approve', reason: 'Peer-approved after blind review' },
      );
      assert.equal(approveQueued.status, 200);
      assert.equal(approveQueued.json.decision, 'approve');
      assert.equal(approveQueued.json.task.status, 'completed');
      assert.equal(approveQueued.json.reviewerRewardGold, 15);
      // Founder gets $36 net bounty ($40 - 10% platform fee $4)
      assert.equal(approveQueued.json.state.player.usdBalance, round2(usdBeforeDynamicApprove + 36));

      // Verify PATCH /api/admin/settings supports peerReviewRequired toggle
      const toggleOn = await apiJson(isoUrl, 'PATCH', '/api/admin/settings', { peerReviewRequired: true });
      assert.equal(toggleOn.status, 200);
      assert.equal(toggleOn.json.settings.peerReviewRequired, true);
      const revAfterToggle = await apiJson(isoUrl, 'GET', '/api/reviews');
      assert.equal(revAfterToggle.json.peerReviewRequired, true);
      await apiJson(isoUrl, 'PATCH', '/api/admin/settings', { peerReviewRequired: false });

      // 7. Two consecutive slop submissions forfeit stakes & trigger WORKER_COOLDOWN (HTTP 429 on next claim)
      await apiJson(isoUrl, 'PATCH', '/api/workers/w-pro-01', { recoverStamina: true });
      const claimSlop1 = await apiJson(isoUrl, 'POST', '/api/tasks/task-meta-pr/claim', { workerId: 'w-pro-01' });
      assert.equal(claimSlop1.status, 200);
      assert.equal(claimSlop1.json.stakedGold, 25);

      const slop1 = await apiJson(isoUrl, 'POST', '/api/tasks/task-meta-pr/submit', {
        workerId: 'w-pro-01',
        content: 'lorem ipsum garbage aaaaaaaaaa',
      });
      assert.equal(slop1.status, 200);
      assert.equal(slop1.json.passed, false);
      assert.equal(slop1.json.slopStrikes, 1);
      assert.equal(slop1.json.cooldownTriggered, false);
      assert.equal(slop1.json.rewards.forfeitedStakeGold, 25);

      // Second consecutive slop submission -> triggers cooldown!
      const claimSlop2 = await apiJson(isoUrl, 'POST', '/api/tasks/task-meta-pr/claim', { workerId: 'w-pro-01' });
      assert.equal(claimSlop2.status, 200);
      assert.equal(claimSlop2.json.stakedGold, 25);

      const slop2 = await apiJson(isoUrl, 'POST', '/api/tasks/task-meta-pr/submit', {
        workerId: 'w-pro-01',
        content: '隨便寫佔位符 lorem ipsum aaaaaaaa',
      });
      assert.equal(slop2.status, 200);
      assert.equal(slop2.json.passed, false);
      assert.equal(slop2.json.slopStrikes, 2);
      assert.equal(slop2.json.cooldownTriggered, true);
      assert.ok(slop2.json.cooldownUntil && Date.parse(slop2.json.cooldownUntil) > Date.now());
      assert.equal(slop2.json.rewards.forfeitedStakeGold, 25);

      // Attempting to claim again while cooling down MUST return HTTP 429 WORKER_COOLDOWN
      const blockedClaim = await apiJson(isoUrl, 'POST', '/api/tasks/task-meta-pr/claim', { workerId: 'w-pro-01' });
      assert.equal(blockedClaim.status, 429, 'Cooling-down worker must be blocked with HTTP 429');
      assert.equal(blockedClaim.json.ok, false);
      assert.equal(blockedClaim.json.code, 'WORKER_COOLDOWN');
      assert.ok(blockedClaim.json.cooldownRemainingSec >= 1);
    } finally {
      await stopServer(started.server);
      await fs.rm(isoDir, { recursive: true, force: true });
    }
  });

  it('25. Native SQLite (node:sqlite) WAL persistence across restart, audit_log, GET /api/admin/export-backup & GET /api/metrics', async () => {
    const isoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pct-sqlite-ops-'));
    let isoServer = null;
    try {
      let started = await startServer(isoDir);
      isoServer = started.server;
      let isoUrl = started.baseUrl;

      // 1. /api/health must report dbDriver === 'sqlite' & version 1.2.x
      const health = await apiJson(isoUrl, 'GET', '/api/health');
      assert.equal(health.status, 200);
      assert.equal(health.json.ok, true);
      assert.equal(health.json.dbDriver, 'sqlite', 'Node 24 native SQLite driver must be active');
      assert.match(String(health.json.version || ''), /^1\.2\./);

      // Trigger mutations that persist state & append audit_log rows
      const propRes = await apiJson(isoUrl, 'POST', '/api/projects', {
        name: 'SQLite WAL Ledger Probe',
        tagline: 'Verifies zero-dependency node:sqlite persistence across full server restarts',
        votesRequired: 4,
      });
      assert.equal(propRes.status, 201);
      const createdProjId = propRes.json.project.id;

      const recruitRes = await apiJson(isoUrl, 'POST', '/api/workers', {
        name: 'SQLite-Keeper-Bot',
        roleClass: 'flash_worker',
        providerLabel: 'Gemini 2.5 Flash',
        dailyTokenCap: 550000,
      });
      assert.equal(recruitRes.status, 201);
      const goldBeforeRestart = recruitRes.json.state.player.gold;

      // Verify pixelcompute.db exists on disk
      const dbStat = await fs.stat(path.join(isoDir, 'pixelcompute.db'));
      assert.ok(dbStat.size > 0, 'data/pixelcompute.db must exist and be non-empty');

      // 2. Non-founder user MUST be denied GET /api/admin/export-backup (HTTP 403)
      const regMember = await apiJson(isoUrl, 'POST', '/api/auth/register', {
        email: 'member-backup@pixelcompute.test',
        password: 'member-password-123',
        displayName: 'Regular Citizen',
      });
      assert.equal(regMember.status, 201);
      const forbiddenBackup = await apiJson(isoUrl, 'GET', '/api/admin/export-backup', undefined, regMember.cookie);
      assert.equal(forbiddenBackup.status, 403);
      assert.equal(forbiddenBackup.json.ok, false);

      // 3. Stop server, remove mirror state.json to prove pure SQLite recovery, and restart
      await stopServer(isoServer);
      isoServer = null;
      await fs.rm(path.join(isoDir, 'state.json'), { force: true });

      started = await startServer(isoDir);
      isoServer = started.server;
      isoUrl = started.baseUrl;

      const afterRestart = await apiJson(isoUrl, 'GET', '/api/bootstrap');
      assert.equal(afterRestart.status, 200);
      assert.equal(afterRestart.json.state.player.gold, goldBeforeRestart, 'Player gold must survive restart from SQLite');
      assert.ok(
        afterRestart.json.state.projects.some((p) => p.id === createdProjId),
        'Proposed project must survive restart from SQLite even without state.json',
      );
      assert.ok(
        afterRestart.json.state.workers.some((w) => w.name === 'SQLite-Keeper-Bot'),
        'Recruited worker must survive restart from SQLite',
      );

      // 4. GET /api/admin/export-backup (founder) returns downloadable valid backup with recentAudit & state
      const backupRes = await apiJson(isoUrl, 'GET', '/api/admin/export-backup');
      assert.equal(backupRes.status, 200);
      assert.match(backupRes.headers.get('content-disposition') || '', /attachment; filename="pixelcompute-backup-/i);
      assert.equal(backupRes.json.ok, true);
      assert.equal(backupRes.json.driver, 'sqlite');
      assert.ok(backupRes.json.exportedAt && !Number.isNaN(Date.parse(backupRes.json.exportedAt)));
      assert.ok(backupRes.json.auditCount >= 2, `Expected auditCount >= 2, got ${backupRes.json.auditCount}`);
      assert.ok(Array.isArray(backupRes.json.recentAudit) && backupRes.json.recentAudit.length >= 2);
      assert.ok(
        backupRes.json.recentAudit.some((a) => a.eventType === 'project_proposed'),
        'recentAudit must record project_proposed event',
      );
      assert.ok(
        backupRes.json.recentAudit.some((a) => a.eventType === 'backup_export'),
        'recentAudit must record backup_export event',
      );
      assert.ok(backupRes.json.state && Array.isArray(backupRes.json.state.projects));
      assert.ok(backupRes.json.state.projects.some((p) => p.id === createdProjId));

      // 5. GET /api/metrics returns full production ops telemetry
      const metricsRes = await apiJson(isoUrl, 'GET', '/api/metrics');
      assert.equal(metricsRes.status, 200);
      const m = metricsRes.json;
      assert.equal(m.ok, true);
      assert.match(String(m.version || ''), /^1\.2\./);
      assert.equal(m.dbDriver, 'sqlite');
      assert.equal(typeof m.uptimeSec, 'number');
      assert.ok(typeof m.memoryMb === 'number' && m.memoryMb > 0);
      assert.equal(typeof m.sseClients, 'number');
      assert.ok(typeof m.usersCount === 'number' && m.usersCount >= 2);
      assert.ok(typeof m.projectsCount === 'number' && m.projectsCount >= 4);
      assert.equal(typeof m.tasksOpen, 'number');
      assert.equal(typeof m.tasksCompleted, 'number');
      assert.equal(typeof m.pendingReviewsCount, 'number');
      assert.equal(m.provenanceChainValid, true);
      assert.equal(typeof m.rateLimitBlockedCount, 'number');
      assert.ok(typeof m.auditCount === 'number' && m.auditCount >= 2);
      assert.ok(m.timestamp && !Number.isNaN(Date.parse(m.timestamp)));
    } finally {
      await stopServer(isoServer);
      await fs.rm(isoDir, { recursive: true, force: true });
    }
  });

  it('26. Public SSR share page /p/:slug & cryptographic verify page /verify/:hash (Open Graph tags & XSS escaping)', async () => {
    const isoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pct-public-pages-'));
    const started = await startServer(isoDir);
    const isoUrl = started.baseUrl;

    try {
      // Fetch seeded project ideaHash
      const boot = await apiJson(isoUrl, 'GET', '/api/bootstrap');
      const projMeta = boot.json.state.projects.find((p) => p.id === 'proj-meta');
      assert.ok(projMeta && /^[a-f0-9]{64}$/.test(projMeta.ideaHash));

      // 1. Valid project share page via exact ID (/p/proj-meta) and shorthand slug (/p/meta)
      for (const slugRoute of ['/p/proj-meta', '/p/meta']) {
        const res = await fetch(`${isoUrl}${slugRoute}`);
        assert.equal(res.status, 200, `GET ${slugRoute} must return 200`);
        assert.match(res.headers.get('content-type') || '', /^text\/html/i);
        const html = await res.text();
        assert.match(html, /<meta\s+property="og:title"/i, `${slugRoute} must contain og:title`);
        assert.match(html, /<meta\s+property="og:description"/i, `${slugRoute} must contain og:description`);
        assert.match(html, /<meta\s+name="twitter:card"/i, `${slugRoute} must contain twitter:card`);
        assert.ok(html.includes(projMeta.ideaHash), `${slugRoute} must include full 64-char SHA-256 ideaHash`);
        assert.ok(html.includes(`/verify/${projMeta.ideaHash}`), `${slugRoute} must link to /verify/<hash>`);
        assert.ok(html.includes('/app?project=proj-meta'), `${slugRoute} must link to /app?project=proj-meta`);
      }

      // 2. Non-existent project slug returns 404 friendly HTML page
      const missingProjRes = await fetch(`${isoUrl}/p/non-existent-project-slug-404`);
      assert.equal(missingProjRes.status, 404);
      assert.match(missingProjRes.headers.get('content-type') || '', /^text\/html/i);

      // 3. XSS safety check: propose project with malicious HTML/script payloads and verify strict entity escaping
      const xssProp = await apiJson(isoUrl, 'POST', '/api/projects', {
        name: 'CyberXSS <script>alert("pwn")</script>',
        tagline: 'Tagline with "><img src=x onerror=alert(1)> payload',
        description: 'Desc with <svg onload=alert(2)> & "quotes"',
      });
      assert.equal(xssProp.status, 201);
      const xssProj = xssProp.json.project;

      const xssPageRes = await fetch(`${isoUrl}/p/${encodeURIComponent(xssProj.id)}`);
      assert.equal(xssPageRes.status, 200);
      const xssHtml = await xssPageRes.text();
      assert.ok(!xssHtml.includes('<script>alert("pwn")</script>'), 'Raw <script> tag MUST be escaped in /p/:slug');
      assert.ok(!xssHtml.includes('<img src=x onerror=alert(1)>'), 'Raw <img> onerror payload MUST be escaped in /p/:slug');
      assert.ok(!xssHtml.includes('<svg onload=alert(2)>'), 'Raw <svg onload> payload MUST be escaped in /p/:slug');
      assert.ok(xssHtml.includes('&lt;script&gt;alert(&quot;pwn&quot;)&lt;/script&gt;'), 'Escaped script entity should render safely');

      // 4. Cryptographic verify page /verify/:hash — full 64-char hash returns 200 with VERIFIED stamp
      const verifyFullRes = await fetch(`${isoUrl}/verify/${projMeta.ideaHash}`);
      assert.equal(verifyFullRes.status, 200);
      assert.match(verifyFullRes.headers.get('content-type') || '', /^text\/html/i);
      const verifyFullHtml = await verifyFullRes.text();
      assert.ok(verifyFullHtml.includes('VERIFIED ON PIXELCOMPUTE PROVENANCE CHAIN'), 'Valid full hash must render VERIFIED stamp');
      assert.ok(verifyFullHtml.includes(projMeta.ideaHash), 'Verify page must display full 64-char SHA-256 fingerprint');
      assert.match(verifyFullHtml, /<meta\s+property="og:title"/i, 'Verify page must include OG title');

      // 5. Prefix lookup (first 12 hex chars) also returns 200 with VERIFIED stamp
      const verifyPrefixRes = await fetch(`${isoUrl}/verify/${projMeta.ideaHash.slice(0, 12)}`);
      assert.equal(verifyPrefixRes.status, 200);
      const verifyPrefixHtml = await verifyPrefixRes.text();
      assert.ok(verifyPrefixHtml.includes('VERIFIED'), 'Valid hash prefix must render VERIFIED stamp');
      assert.ok(verifyPrefixHtml.includes(projMeta.ideaHash));

      // 6. Verify page escapes XSS project fields too
      const verifyXssRes = await fetch(`${isoUrl}/verify/${xssProj.ideaHash}`);
      assert.equal(verifyXssRes.status, 200);
      const verifyXssHtml = await verifyXssRes.text();
      assert.ok(!verifyXssHtml.includes('<script>alert("pwn")</script>'), 'Raw <script> tag MUST be escaped in /verify/:hash');

      // 7. Forged 64-char hex hash and malformed hash MUST return 404 without VERIFIED stamp
      const fakeHash = 'deadbeef'.repeat(8);
      const forgedRes = await fetch(`${isoUrl}/verify/${fakeHash}`);
      assert.equal(forgedRes.status, 404, 'Forged hash must return HTTP 404');
      const forgedHtml = await forgedRes.text();
      assert.ok(!forgedHtml.includes('VERIFIED ON PIXELCOMPUTE PROVENANCE CHAIN'), 'Forged hash page must NOT claim verified');

      const badFormatRes = await fetch(`${isoUrl}/verify/${encodeURIComponent('not-a-valid-hash<img src=x onerror=alert(9)>')}`);
      assert.equal(badFormatRes.status, 404);
      const badFormatHtml = await badFormatRes.text();
      assert.ok(!badFormatHtml.includes('<img src=x onerror=alert(9)>'), 'Malformed queriedHash in 404 verify page must be escaped');
      assert.ok(badFormatHtml.includes('&lt;img src=x onerror=alert(9)&gt;'), 'Escaped queriedHash must appear safely');
    } finally {
      await stopServer(started.server);
      await fs.rm(isoDir, { recursive: true, force: true });
    }
  });

  it('27. GitHub Webhook (POST /api/webhooks/github) HMAC-SHA256 verification & merged PR auto-settlement', async () => {
    const webhookSecret = 'pct-v12-super-secret-hmac-key';
    const isoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pct-gh-webhook-'));
    const started = await startServer(isoDir, { githubWebhookSecret: webhookSecret });
    const isoUrl = started.baseUrl;

    function signGitHubBody(rawBody, secret = webhookSecret) {
      const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
      return `sha256=${digest}`;
    }

    async function postWebhook(payloadObj, { event = 'pull_request', signature = undefined } = {}) {
      const rawBody = JSON.stringify(payloadObj);
      const headers = {
        'Content-Type': 'application/json',
        'X-GitHub-Event': event,
      };
      if (signature !== null) {
        headers['X-Hub-Signature-256'] = signature === undefined ? signGitHubBody(rawBody) : signature;
      }
      const res = await fetch(`${isoUrl}/api/webhooks/github`, {
        method: 'POST',
        headers,
        body: rawBody,
      });
      return { status: res.status, json: await res.json() };
    }

    const sse = openSseClient(started.port);
    try {
      await sse.connectedPromise;
      await sse.waitForEvent('connected');

      // 1. Wrong HMAC signature and missing signature MUST return HTTP 401
      const wrongSig = await postWebhook(
        { action: 'closed', pull_request: { merged: true, number: 99, title: 'Fixes #task-i18n-ast-pr' } },
        { signature: 'sha256=' + '0'.repeat(64) },
      );
      assert.equal(wrongSig.status, 401, 'Invalid HMAC-SHA256 signature must be rejected with 401');
      assert.equal(wrongSig.json.ok, false);

      const missingSig = await postWebhook(
        { action: 'closed', pull_request: { merged: true, number: 99 } },
        { signature: null },
      );
      assert.equal(missingSig.status, 401, 'Missing X-Hub-Signature-256 must be rejected with 401');

      // 2. Valid signed ping event returns 200 pong
      const pingRes = await postWebhook({ zen: 'Keep it logically awesome.' }, { event: 'ping' });
      assert.equal(pingRes.status, 200);
      assert.equal(pingRes.json.ok, true);
      assert.equal(pingRes.json.pong, true);

      // 3. Claim task-i18n-ast-pr ($40 cash bounty, 30G stake) so we verify stake refund + core points + progress + 10% fee
      const bootBefore = await apiJson(isoUrl, 'GET', '/api/bootstrap');
      const playerId = bootBefore.json.state.player.id;
      const goldBeforeClaim = bootBefore.json.state.player.gold;
      const usdBefore = bootBefore.json.state.player.usdBalance;
      const bountyFeesBefore = bootBefore.json.state.founderRevenue.bountyFeesUsd;
      const projBefore = bootBefore.json.state.projects.find((p) => p.id === 'proj-i18n');
      const taskTarget = bootBefore.json.state.tasks.find((t) => t.id === 'task-i18n-ast-pr');
      const corePtsBefore = projBefore.bucketPoints?.core?.[playerId] || 0;
      const progressBefore = projBefore.progressPct;

      const claimRes = await apiJson(isoUrl, 'POST', '/api/tasks/task-i18n-ast-pr/claim', { workerId: 'w-pro-01' });
      assert.equal(claimRes.status, 200);
      assert.equal(claimRes.json.stakedGold, 30);
      assert.equal(claimRes.json.state.player.gold, goldBeforeClaim - 30);

      // Unmerged PR closed event should be ignored safely (settled: false)
      const unmergedRes = await postWebhook({
        action: 'closed',
        pull_request: {
          number: 77,
          merged: false,
          title: 'WIP Fixes #task-i18n-ast-pr',
          body: 'Closed without merging',
          html_url: 'https://github.com/pixel-compute-town/i18n-pixelbot/pull/77',
          user: { login: 'founder-dev' },
        },
      });
      assert.equal(unmergedRes.status, 200);
      assert.equal(unmergedRes.json.settled, false);
      assert.equal(unmergedRes.json.ignored, true);

      // 4. Valid HMAC-SHA256 signed merged pull_request with "Fixes #task-i18n-ast-pr" auto-settles everything!
      const mergedRes = await postWebhook({
        action: 'closed',
        pull_request: {
          number: 88,
          merged: true,
          title: 'feat(ast): extract TSX i18n keys',
          body: 'Completed AST scanner with unit tests.\n\nFixes #task-i18n-ast-pr',
          html_url: 'https://github.com/pixel-compute-town/i18n-pixelbot/pull/88',
          user: { login: 'founder-dev' },
        },
      });
      assert.equal(mergedRes.status, 200);
      assert.equal(mergedRes.json.ok, true);
      assert.equal(mergedRes.json.settled, true);
      assert.equal(mergedRes.json.taskId, 'task-i18n-ast-pr');
      assert.equal(mergedRes.json.task.status, 'completed');
      assert.equal(mergedRes.json.rewards.poolBucket, 'core');
      assert.equal(mergedRes.json.rewards.contributionPoints, taskTarget.contributionPoints);
      assert.equal(mergedRes.json.rewards.refundedStakeGold, 30, 'Frozen 30G stake must be refunded in full');
      assert.equal(mergedRes.json.rewards.bountyGrossUsd, 40);
      assert.equal(mergedRes.json.rewards.platformFeeUsd, 4);
      assert.equal(mergedRes.json.rewards.bountyNetUsd, 36);

      // Verify SSE broadcast fired for pixel office celebration
      const sseEvt = await sse.waitForEvent('task_completed', 4000, (d) => d?.source === 'github_webhook' && d?.task?.id === 'task-i18n-ast-pr');
      assert.equal(sseEvt.data.rewards.poolBucket, 'core');

      // Verify persisted state: gold (stake refunded + task gold + achievements), USD net bounty, core points, project progress
      const achGold = (mergedRes.json.unlockedAchievements || []).reduce((s, a) => s + (a.rewardGold || 0), 0);
      const bootAfter = await apiJson(isoUrl, 'GET', '/api/bootstrap');
      const projAfter = bootAfter.json.state.projects.find((p) => p.id === 'proj-i18n');
      assert.equal(
        bootAfter.json.state.player.gold,
        goldBeforeClaim + taskTarget.goldReward + achGold,
        'Stake gold (30G) must be refunded alongside task gold reward',
      );
      assert.equal(bootAfter.json.state.player.usdBalance, round2(usdBefore + 36));
      assert.equal(bootAfter.json.state.founderRevenue.bountyFeesUsd, round2(bountyFeesBefore + 4));
      assert.equal(
        projAfter.bucketPoints.core[playerId],
        corePtsBefore + taskTarget.contributionPoints,
        'Core bucket points must increase by task contributionPoints',
      );
      assert.ok(projAfter.progressPct > progressBefore, 'Project progressPct must advance after PR merge');

      // Verify SQLite audit_log recorded github_webhook_settled
      const backupAfter = await apiJson(isoUrl, 'GET', '/api/admin/export-backup');
      assert.ok(
        backupAfter.json.recentAudit.some((a) => a.eventType === 'github_webhook_settled' && a.summary.includes('task-i18n-ast-pr')),
        'SQLite audit_log must record github_webhook_settled',
      );

      // 5. Re-delivering the same merged webhook is idempotent (alreadyCompleted: true, no double payout)
      const duplicateRes = await postWebhook({
        action: 'closed',
        pull_request: {
          number: 88,
          merged: true,
          title: 'feat(ast): extract TSX i18n keys',
          body: 'Fixes #task-i18n-ast-pr',
          html_url: 'https://github.com/pixel-compute-town/i18n-pixelbot/pull/88',
          user: { login: 'founder-dev' },
        },
      });
      assert.equal(duplicateRes.status, 200);
      assert.equal(duplicateRes.json.settled, false);
      assert.equal(duplicateRes.json.alreadyCompleted, true);
    } finally {
      sse.close();
      await stopServer(started.server);
      await fs.rm(isoDir, { recursive: true, force: true });
    }
  });

  it('28. Smart Auto-Split (POST /api/projects/:id/auto-split) generates balanced 70/30 core guild bounty + 2 peripheral API tasks', async () => {
    const isoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pct-auto-split-'));
    const started = await startServer(isoDir);
    const isoUrl = started.baseUrl;

    try {
      // 1. Validation: missing/short featureBrief returns 400; unknown project returns 404
      const badBrief = await apiJson(isoUrl, 'POST', '/api/projects/proj-i18n/auto-split', { featureBrief: 'x' });
      assert.equal(badBrief.status, 400);

      const missingProj = await apiJson(isoUrl, 'POST', '/api/projects/proj-does-not-exist/auto-split', {
        featureBrief: 'Add dark mode keyboard command palette',
      });
      assert.equal(missingProj.status, 404);

      // 2. Valid auto-split request on proj-i18n
      const bootBefore = await apiJson(isoUrl, 'GET', '/api/bootstrap');
      const taskCountBefore = bootBefore.json.state.tasks.length;
      const featureBrief = 'Add real-time Markdown diff viewer with keyboard navigation';

      const splitRes = await apiJson(isoUrl, 'POST', '/api/projects/proj-i18n/auto-split', { featureBrief });
      assert.equal(splitRes.status, 200);
      assert.equal(splitRes.json.ok, true);
      assert.equal(splitRes.json.featureBrief, featureBrief);
      assert.equal(splitRes.json.createdCount, 3);
      assert.deepEqual(splitRes.json.breakdown, { core: 1, peripheral: 2 });
      assert.equal(splitRes.json.tasks.length, 3);

      const coreTasks = splitRes.json.tasks.filter((t) => t.poolBucket === 'core');
      const peripheralTasks = splitRes.json.tasks.filter((t) => t.poolBucket === 'peripheral');
      assert.equal(coreTasks.length, 1, 'Must generate exactly 1 core pool guild task');
      assert.equal(peripheralTasks.length, 2, 'Must generate exactly 2 peripheral pool API tasks');

      const [coreTask] = coreTasks;
      assert.equal(coreTask.track, 'guild_bounty');
      assert.equal(coreTask.projectId, 'proj-i18n');
      assert.ok(coreTask.stakeGold >= 25, `Core auto-split task must require stakeGold >= 25, got ${coreTask.stakeGold}`);
      assert.ok(coreTask.contributionPoints >= 60, 'Core task must hold majority contribution weight');

      for (const pt of peripheralTasks) {
        assert.equal(pt.track, 'api_auto');
        assert.equal(pt.projectId, 'proj-i18n');
        assert.equal(pt.poolBucket, 'peripheral');
      }

      // 70/30 anti-dilution weighting check across generated points (70 vs 15+15 = 30)
      const totalCorePts = coreTasks.reduce((s, t) => s + (t.contributionPoints || 0), 0);
      const totalPeriphPts = peripheralTasks.reduce((s, t) => s + (t.contributionPoints || 0), 0);
      assert.ok(totalCorePts > totalPeriphPts, `Core points (${totalCorePts}) should outweigh peripheral points (${totalPeriphPts})`);

      // 3. Confirm all 3 tasks are persisted in live state
      const bootAfter = await apiJson(isoUrl, 'GET', '/api/bootstrap');
      assert.equal(bootAfter.json.state.tasks.length, taskCountBefore + 3);
      for (const genTask of splitRes.json.tasks) {
        const persistedTask = bootAfter.json.state.tasks.find((t) => t.id === genTask.id);
        assert.ok(persistedTask, `Generated task ${genTask.id} must be persisted in state.tasks`);
        assert.equal(persistedTask.poolBucket, genTask.poolBucket);
      }
    } finally {
      await stopServer(started.server);
      await fs.rm(isoDir, { recursive: true, force: true });
    }
  });

  it('29. Online User Guide (/docs, /guide) & Whitepaper (/whitepaper) reader endpoints return 200 HTML with TOC, full chapters & XSS safety', async () => {
    // 1. GET /docs returns 200 HTML with full User Guide chapters, TOC & top navigation
    const docsRes = await fetch(`${baseUrl}/docs`);
    assert.equal(docsRes.status, 200, 'GET /docs must return 200');
    assert.match(docsRes.headers.get('content-type') || '', /^text\/html/i);
    const docsHtml = await docsRes.text();
    assert.ok(docsHtml.length > 8000, `GET /docs HTML unexpectedly short (${docsHtml.length} chars)`);

    for (const marker of [
      'id="doc-toc-list"',
      'id="btn-doc-print"',
      'href="/"',
      'href="/docs"',
      'href="/whitepaper"',
      'href="/app"',
      '第一章',
      '第二章',
      '第三章',
      '第四章',
      '第五章',
      'BYOK',
      'BYOT',
      'pixel-worker',
      '/onboard',
      '70/30',
      'USDC',
      'doc-table',
      'doc-code-block',
    ]) {
      assert.ok(docsHtml.includes(marker), `GET /docs HTML must contain "${marker}"`);
    }

    // 2. GET /guide alias returns equivalent 200 HTML
    const guideRes = await fetch(`${baseUrl}/guide`);
    assert.equal(guideRes.status, 200, 'GET /guide alias must return 200');
    assert.match(guideRes.headers.get('content-type') || '', /^text\/html/i);
    const guideHtml = await guideRes.text();
    assert.ok(guideHtml.includes('第一章') && guideHtml.includes('id="doc-toc-list"'), 'GET /guide must render User Guide with TOC');

    // 3. GET /whitepaper returns 200 HTML with full Whitepaper chapters, math tables & TOC
    const wpRes = await fetch(`${baseUrl}/whitepaper`);
    assert.equal(wpRes.status, 200, 'GET /whitepaper must return 200');
    assert.match(wpRes.headers.get('content-type') || '', /^text\/html/i);
    const wpHtml = await wpRes.text();
    assert.ok(wpHtml.length > 8000, `GET /whitepaper HTML unexpectedly short (${wpHtml.length} chars)`);

    for (const marker of [
      'id="doc-toc-list"',
      'id="btn-doc-print"',
      'href="/"',
      'href="/docs"',
      'href="/whitepaper"',
      'href="/app"',
      'Abstract',
      'Proof of First Spark',
      'PCT-POFS-v1',
      '70/30',
      '$595.00',
      '$255.00',
      'Howey Test',
      'doc-table',
      'doc-code-block',
    ]) {
      assert.ok(wpHtml.includes(marker), `GET /whitepaper HTML must contain "${marker}"`);
    }

    // 4. HEAD requests on /docs, /guide, /whitepaper return 200 with empty body
    for (const route of ['/docs', '/guide', '/whitepaper']) {
      const headRes = await fetch(`${baseUrl}${route}`, { method: 'HEAD' });
      assert.equal(headRes.status, 200, `HEAD ${route} must return 200`);
      assert.equal(await headRes.text(), '', `HEAD ${route} must return empty body`);
    }

    // 5. XSS safety verification on renderMarkdownToHtml() & renderDocPage()
    const maliciousMd = [
      '# Title <script>alert(1)</script>',
      '## Section <img src=x onerror=alert(2)>',
      'Dangerous link: [click me](javascript:alert(3)) and [ok](https://example.com)',
      '',
      '> <svg onload=alert(4)> quote',
      '',
      '| Col <script>x</script> | Val |',
      '| --- | --- |',
      '| <img src=x onerror=alert(5)> | safe |',
    ].join('\n');

    const mdRendered = renderMarkdownToHtml(maliciousMd);
    assert.ok(Array.isArray(mdRendered.toc) && mdRendered.toc.length >= 2, 'Markdown renderer must extract TOC entries');
    assert.ok(!mdRendered.html.includes('<script>alert(1)</script>'), 'Raw <script> tag must be escaped');
    assert.ok(!mdRendered.html.includes('<img src=x onerror=alert(2)>'), 'Raw <img> onerror must be escaped');
    assert.ok(!mdRendered.html.includes('<svg onload=alert(4)>'), 'Raw <svg> onload must be escaped');
    assert.ok(!mdRendered.html.includes('<img src=x onerror=alert(5)>'), 'Raw table <img> XSS must be escaped');
    assert.ok(!/href\s*=\s*["']\s*javascript:/i.test(mdRendered.html), 'javascript: href must be blocked');
    assert.ok(mdRendered.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'Escaped <script> text must render safely');

    const fullDocHtml = renderDocPage({
      title: 'Doc <script>alert(6)</script>',
      subtitle: 'Sub <img src=x onerror=alert(7)>',
      badge: '<b>BADGE</b>',
      markdown: maliciousMd,
      activePath: '/docs',
      origin: baseUrl,
    });
    assert.ok(!fullDocHtml.includes('<script>alert(6)</script>'), 'Doc title XSS must be escaped');
    assert.ok(!fullDocHtml.includes('<img src=x onerror=alert(7)>'), 'Doc subtitle XSS must be escaped');
    assert.ok(!fullDocHtml.includes('<b>BADGE</b>'), 'Doc badge XSS must be escaped');
    assert.ok(!/href\s*=\s*["']\s*javascript:/i.test(fullDocHtml), 'Full doc page must never emit javascript: href');
  });

  it('30. Multilingual Whitepaper editions (/whitepaper?lang=zh-TW|zh-CN|en|ja & /whitepaper/en) render cleanly with 0 CJK in EN', async () => {
    const cases = [
      { url: '/whitepaper?lang=zh-TW', htmlLang: 'zh-Hant', mustInclude: ['白皮書 v1.0', '創意溯源', 'data-doc-lang="en"'] },
      { url: '/whitepaper?lang=zh-CN', htmlLang: 'zh-Hans', mustInclude: ['白皮书 v1.0', '创意溯源', '$595.00', 'data-doc-lang="zh-CN"'] },
      { url: '/whitepaper?lang=en', htmlLang: 'en', mustInclude: ['Whitepaper v1.0', 'Proof of First Spark', 'Anti-Dilution', '$595.00', 'Table of Contents'] },
      { url: '/whitepaper/en', htmlLang: 'en', mustInclude: ['Whitepaper v1.0', 'Zero Native Token Policy', '$255.00'] },
      { url: '/whitepaper?lang=ja', htmlLang: 'ja', mustInclude: ['ホワイトペーパー v1.0', '希薄化防止', '$595.00'] },
    ];

    for (const c of cases) {
      const res = await fetch(`${baseUrl}${c.url}`);
      assert.equal(res.status, 200, `GET ${c.url} must return 200`);
      assert.match(res.headers.get('content-type') || '', /^text\/html/i);
      const html = await res.text();
      assert.ok(html.includes(`<html lang="${c.htmlLang}">`), `GET ${c.url} must set html lang="${c.htmlLang}"`);
      for (const token of c.mustInclude) {
        assert.ok(html.includes(token), `GET ${c.url} must include "${token}"`);
      }

      if (c.htmlLang === 'en') {
        const articleMatch = html.match(/<article[^>]*id="doc-article"[^>]*>([\s\S]*?)<\/article>/i);
        assert.ok(articleMatch && articleMatch[1].length > 5000, 'English Whitepaper article body must be non-empty');
        assert.ok(!/[\u4e00-\u9fff]/.test(articleMatch[1]), 'English Whitepaper article body must contain 0 Chinese characters');
      }
    }
  });

  it('31. Founder Admin Console (/admin & /api/admin/overview) enforces Founder-only access and returns full registered user & ops analytics', async () => {
    // 1. /admin page loads cleanly with HTTP 200 HTML
    const pageRes = await fetch(`${baseUrl}/admin`);
    assert.equal(pageRes.status, 200);
    assert.match(pageRes.headers.get('content-type') || '', /^text\/html/i);
    const pageHtml = await pageRes.text();
    assert.ok(pageHtml.includes('鎮長數據後臺') && pageHtml.includes('/api/admin/overview'));

    // 2. Non-founder regular registered user MUST be blocked with HTTP 403 ADMIN_ONLY
    const loginBob = await apiJson(baseUrl, 'POST', '/api/auth/login', {
      email: 'bob@pixelcompute.test',
      password: 'bob-password-456',
    });
    assert.equal(loginBob.status, 200);
    const blockedRes = await apiJson(baseUrl, 'GET', '/api/admin/overview', undefined, loginBob.cookie);
    assert.equal(blockedRes.status, 403);
    assert.equal(blockedRes.json.code, 'ADMIN_ONLY');

    // 3. Founder accesses /api/admin/overview and gets exact user counts, users table, revenue, orders, payouts, devices, redeemCodes & auditLog
    const adminRes = await apiJson(baseUrl, 'GET', '/api/admin/overview');
    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.json.ok, true);
    assert.ok(adminRes.json.summary.totalUsers >= 3, 'Must count founder + registered users');
    assert.ok(adminRes.json.summary.realRegisteredUsers >= 2, 'Must separately count real non-demo registered users');
    assert.ok(Array.isArray(adminRes.json.users) && adminRes.json.users.length === adminRes.json.summary.totalUsers);
    assert.ok(adminRes.json.users.some((u) => u.email === 'bob@pixelcompute.test'));
    assert.ok(Array.isArray(adminRes.json.redeemCodes));
    assert.ok(Array.isArray(adminRes.json.auditLog));
    assert.equal(adminRes.json.summary.dbDriver, 'sqlite');
  });
});
