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

async function apiJson(baseUrl, method, route, body) {
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, headers: res.headers, json };
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
    assert.equal(passSubmit.json.state.player.gold, goldBefore + 130);
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
});
