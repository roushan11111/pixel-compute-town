// PixelCompute Town — Automated Full-Lifecycle API & Economics Test Suite
// Zero-dependency test suite using Node.js built-in node:test and node:assert/strict

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

import { createAppServer } from '../server.mjs';

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

async function startServer(dataDir) {
  const server = createAppServer({ dataDir });
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
      creatorPct: 30,
      contributorsPct: 60,
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

  it('6. Project launch at 100% and exact 30%/60%/10% dividend math (initial $200 + simulated $100)', async () => {
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
    const usdBefore = preLaunch.json.state.player.usdBalance;
    const carryBefore = preLaunch.json.state.founderRevenue.incubationCarryUsd;
    const totalPoints = Object.values(projMeta.contributions).reduce((a, b) => a + b, 0);
    const playerPoints = projMeta.contributions[preLaunch.json.state.player.id];

    // Launch with default $200 initial revenue
    const launchRes = await apiJson(baseUrl, 'POST', '/api/projects/proj-meta/launch', {
      initialRevenueUsd: 200,
    });
    assert.equal(launchRes.status, 200);
    assert.equal(launchRes.json.project.status, 'launched');

    const div = launchRes.json.dividend;
    assert.equal(div.grossRevenueUsd, 200);
    assert.equal(div.creatorShareUsd, 60, 'Creator share must be 30% of $200 = $60');
    assert.equal(div.contributorsPoolUsd, 120, 'Contributors pool must be 60% of $200 = $120');
    assert.equal(div.platformCarryUsd, 20, 'Platform carry must be 10% of $200 = $20');

    // Sum of all contributor payouts must equal contributorsPoolUsd exactly (no cent drift)
    const contribPayoutSum = round2(
      div.payouts.filter((p) => p.role === 'contributor').reduce((sum, p) => sum + p.amountUsd, 0),
    );
    assert.equal(contribPayoutSum, 120);

    const grandPayoutSum = round2(div.payouts.reduce((sum, p) => sum + p.amountUsd, 0));
    assert.equal(grandPayoutSum, 200);

    // Check player's exact payout (creator $60 + proportional contributor share)
    const playerContribPayout = div.payouts.find(
      (p) => p.role === 'contributor' && p.userId === preLaunch.json.state.player.id,
    );
    assert.ok(playerContribPayout);
    const approxExpectedContrib = round2(120 * (playerPoints / totalPoints));
    assert.ok(Math.abs(playerContribPayout.amountUsd - approxExpectedContrib) <= 0.02);
    assert.equal(div.playerShareUsd, round2(60 + playerContribPayout.amountUsd));
    assert.equal(launchRes.json.state.player.usdBalance, round2(usdBefore + div.playerShareUsd));
    assert.equal(launchRes.json.founderRevenue.incubationCarryUsd, round2(carryBefore + 20));

    // Re-launching an already launched project must fail
    const reLaunch = await apiJson(baseUrl, 'POST', '/api/projects/proj-meta/launch', {});
    assert.equal(reLaunch.status, 400);

    // Simulate subsequent $100 revenue -> 30 / 60 / 10
    const usdBeforeSim = launchRes.json.state.player.usdBalance;
    const carryBeforeSim = launchRes.json.founderRevenue.incubationCarryUsd;
    const simRes = await apiJson(baseUrl, 'POST', '/api/projects/proj-meta/simulate-revenue', {
      amountUsd: 100,
    });
    assert.equal(simRes.status, 200);
    assert.equal(simRes.json.dividend.grossRevenueUsd, 100);
    assert.equal(simRes.json.dividend.creatorShareUsd, 30);
    assert.equal(simRes.json.dividend.contributorsPoolUsd, 60);
    assert.equal(simRes.json.dividend.platformCarryUsd, 10);
    const simTotal = round2(simRes.json.dividend.payouts.reduce((s, p) => s + p.amountUsd, 0));
    assert.equal(simTotal, 100);
    assert.equal(simRes.json.founderRevenue.incubationCarryUsd, round2(carryBeforeSim + 10));
    assert.equal(
      simRes.json.state.player.usdBalance,
      round2(usdBeforeSim + simRes.json.dividend.playerShareUsd),
    );
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
});
