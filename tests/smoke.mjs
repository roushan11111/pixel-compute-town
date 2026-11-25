// PixelCompute Town v1.2 — Static, DOM Integrity, MIME, Trilingual i18n, Public SSR, SFX & CLI E2E Smoke Test Suite
// Zero-dependency Node.js runner (`npm run smoke` or `node tests/smoke.mjs`)

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import vm from 'node:vm';

import { createAppServer } from '../server.mjs';
import { createInitialState, generateTasksForProject, SHOP_ITEMS } from '../src/server/seed.mjs';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const CJK_RE = /[\u4e00-\u9fff]/;

let passedCount = 0;
let failedCount = 0;

async function runCheck(name, fn) {
  const start = performance.now();
  try {
    const detail = await fn();
    const ms = Math.round(performance.now() - start);
    passedCount += 1;
    console.log(`✅ [PASS] ${name} (${ms}ms)${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    failedCount += 1;
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   ${err?.stack || err}`);
  }
}

async function listFilesRecursive(dir, extensions) {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'data') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listFilesRecursive(full, extensions)));
    } else if (!extensions || extensions.includes(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

function extractExportNames(source) {
  const names = new Set();
  const patterns = [
    /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /export\s+class\s+([A-Za-z_$][\w$]*)/g,
    /export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  ];
  for (const rx of patterns) {
    let m;
    while ((m = rx.exec(source)) !== null) {
      names.add(m[1]);
    }
  }
  const listRx = /export\s*\{([^}]+)\}/g;
  let lm;
  while ((lm = listRx.exec(source)) !== null) {
    for (const part of lm[1].split(',')) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      const asParts = cleaned.split(/\s+as\s+/);
      names.add((asParts[1] || asParts[0]).trim());
    }
  }
  return names;
}

function collectCjkViolations(obj, prefix = '', violations = []) {
  if (typeof obj === 'string') {
    if (CJK_RE.test(obj)) {
      violations.push(`${prefix}: "${obj.slice(0, 80)}"`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((v, idx) => collectCjkViolations(v, `${prefix}[${idx}]`, violations));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      collectCjkViolations(v, prefix ? `${prefix}.${k}` : k, violations);
    }
  }
  return violations;
}

function resolveRelativeFrontendImport(fromFile, spec) {
  if (spec.startsWith('/')) {
    return path.resolve(ROOT_DIR, 'public', spec.slice(1));
  }
  return path.resolve(path.dirname(fromFile), spec);
}

async function main() {
  console.log('\n🔍 PixelCompute Town v1.2 — Smoke & Contract Verification Suite\n');

  // 1. Syntax check all .mjs and .js files
  await runCheck('1. All backend (.mjs) and frontend (.js) files parse with zero syntax errors', async () => {
    const files = await listFilesRecursive(ROOT_DIR, ['.mjs', '.js']);
    assert.ok(files.length >= 14, `Expected >= 14 JS/MJS files for v1.0, found ${files.length}`);

    for (const file of files) {
      await execFileAsync(process.execPath, ['--check', file]);
    }
    return `${files.length} files syntax-checked cleanly`;
  });

  // 2. Frontend ESM import/export graph integrity
  await runCheck('2. Frontend ES module imports & named exports match 100%', async () => {
    const jsDir = path.join(ROOT_DIR, 'public', 'js');
    const jsFiles = await listFilesRecursive(jsDir, ['.js']);
    const exportMap = new Map();

    for (const f of jsFiles) {
      const src = await fs.readFile(f, 'utf8');
      exportMap.set(path.resolve(f), extractExportNames(src));
    }

    let importChecks = 0;
    const namedImportRx = /import\s*\{([\s\S]*?)\}\s*from\s*['"](\.[^'"]+|\/js\/[^'"]+)['"]/g;
    const starImportRx = /import\s*\*\s*as\s+[A-Za-z_$][\w$]*\s*from\s*['"](\.[^'"]+|\/js\/[^'"]+)['"]/g;

    for (const f of jsFiles) {
      const src = await fs.readFile(f, 'utf8');
      let m;
      while ((m = namedImportRx.exec(src)) !== null) {
        const specifiers = m[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => s.split(/\s+as\s+/)[0].trim());
        const targetPath = resolveRelativeFrontendImport(f, m[2]);
        assert.ok(
          exportMap.has(targetPath),
          `Missing imported file "${m[2]}" referenced from ${path.relative(ROOT_DIR, f)}`,
        );
        const targetExports = exportMap.get(targetPath);
        for (const sym of specifiers) {
          assert.ok(
            targetExports.has(sym),
            `Symbol "${sym}" imported by ${path.relative(ROOT_DIR, f)} is NOT exported by ${m[2]}`,
          );
          importChecks += 1;
        }
      }

      let sm;
      while ((sm = starImportRx.exec(src)) !== null) {
        const targetPath = resolveRelativeFrontendImport(f, sm[1]);
        assert.ok(
          exportMap.has(targetPath),
          `Missing namespace-imported file "${sm[1]}" referenced from ${path.relative(ROOT_DIR, f)}`,
        );
        importChecks += 1;
      }
    }

    // Explicitly verify certCard.js exposes both Work & Proof-of-First-Spark Idea Certificate exports
    const certCardPath = path.resolve(jsDir, 'certCard.js');
    const certExports = exportMap.get(certCardPath);
    assert.ok(certExports, 'public/js/certCard.js must exist');
    for (const sym of [
      'renderWorkCertificate',
      'downloadWorkCertificate',
      'renderIdeaCertificate',
      'downloadIdeaCertificate',
    ]) {
      assert.ok(certExports.has(sym), `public/js/certCard.js must export ${sym}()`);
    }

    return `${importChecks} ESM imports verified across ${jsFiles.length} modules (+ certCard Idea/Work certificate exports)`;
  });

  // 3. DOM ID consistency across index.html, landing.html, and onboard.html
  await runCheck('3. HTML DOM IDs (index/landing/onboard) have zero duplicates & zero missing queries', async () => {
    const htmlIdRx = /\bid\s*=\s*["']([^"']+)["']/g;
    const idQueryPatterns = [
      /(?:^|[^\w$.])\$\(\s*['"]([A-Za-z0-9_-]+)['"]\s*\)/g,
      /document\.getElementById\(\s*['"]([A-Za-z0-9_-]+)['"]\s*\)/g,
      /\b(?:openModal|closeModal)\(\s*['"]([A-Za-z0-9_-]+)['"]\s*\)/g,
    ];

    function collectHtmlIds(htmlText, label) {
      const ids = new Set();
      const dups = [];
      let m;
      while ((m = htmlIdRx.exec(htmlText)) !== null) {
        if (ids.has(m[1])) dups.push(m[1]);
        ids.add(m[1]);
      }
      assert.deepEqual(dups, [], `Duplicate IDs found in public/${label}: ${dups.join(', ')}`);
      return ids;
    }

    function verifyJsQueriesAgainstHtml(jsText, htmlIds, jsLabel, htmlLabel) {
      const queried = new Set();
      for (const rx of idQueryPatterns) {
        rx.lastIndex = 0;
        let m;
        while ((m = rx.exec(jsText)) !== null) {
          queried.add(m[1]);
        }
      }
      const dynamicIds = new Set();
      let dm;
      while ((dm = htmlIdRx.exec(jsText)) !== null) {
        dynamicIds.add(dm[1]);
      }
      const missing = [];
      for (const id of queried) {
        if (!htmlIds.has(id) && !dynamicIds.has(id)) {
          missing.push(id);
        }
      }
      assert.deepEqual(
        missing,
        [],
        `${jsLabel} queries IDs that do not exist in public/${htmlLabel}: ${missing.join(', ')}`,
      );
      return queried.size;
    }

    // Check onboard.html + onboard.js (0 duplicates & 0 missing)
    const onboardHtml = await fs.readFile(path.join(ROOT_DIR, 'public', 'onboard.html'), 'utf8');
    const onboardJs = await fs.readFile(path.join(ROOT_DIR, 'public', 'js', 'onboard.js'), 'utf8');
    const onboardIds = collectHtmlIds(onboardHtml, 'onboard.html');
    const onboardQueriedCount = verifyJsQueriesAgainstHtml(onboardJs, onboardIds, 'onboard.js', 'onboard.html');

    // Check landing.html + landing.js (0 duplicates & 0 missing)
    const landingHtml = await fs.readFile(path.join(ROOT_DIR, 'public', 'landing.html'), 'utf8');
    const landingJs = await fs.readFile(path.join(ROOT_DIR, 'public', 'js', 'landing.js'), 'utf8');
    const landingIds = collectHtmlIds(landingHtml, 'landing.html');
    const landingQueriedCount = verifyJsQueriesAgainstHtml(landingJs, landingIds, 'landing.js', 'landing.html');

    // Check index.html + app.js (0 duplicates & 0 missing)
    const htmlPath = path.join(ROOT_DIR, 'public', 'index.html');
    const appPath = path.join(ROOT_DIR, 'public', 'js', 'app.js');
    const html = await fs.readFile(htmlPath, 'utf8');
    const appSrc = await fs.readFile(appPath, 'utf8');

    const htmlIds = collectHtmlIds(html, 'index.html');

    // Collect data-close-modal targets in HTML
    const closeModalTargets = [];
    const closeRx = /data-close-modal\s*=\s*["']([^"']+)["']/g;
    let cm;
    while ((cm = closeRx.exec(html)) !== null) {
      closeModalTargets.push(cm[1]);
    }
    for (const mid of closeModalTargets) {
      assert.ok(htmlIds.has(mid), `data-close-modal="${mid}" has no matching modal element ID in index.html`);
    }

    const appQueriedCount = verifyJsQueriesAgainstHtml(appSrc, htmlIds, 'app.js', 'index.html');

    // Explicitly verify all Anti-Dilution Governance & v1.2 Ops/Public-Share DOM IDs exist in index.html & landing.html
    const requiredGovAppIds = [
      'review-queue-panel',
      'review-queue-badge',
      'btn-refresh-reviews',
      'review-queue-list',
      'review-history-wrap',
      'review-history-list',
      'guild-submit-for-review',
      'toggle-peer-review-required',
    ];
    for (const gid of requiredGovAppIds) {
      assert.ok(htmlIds.has(gid), `Missing required Anti-Dilution Governance DOM ID #${gid} in public/index.html`);
    }
    const requiredV12AppIds = [
      'ops-metrics-section',
      'ops-metrics-grid',
      'metric-db-driver',
      'metric-memory',
      'metric-uptime',
      'metric-chain-health',
      'metric-sse-reviews',
      'ops-metrics-extra',
      'btn-refresh-metrics',
      'btn-export-backup',
      'btn-prov-public-page',
      'btn-prov-public-verify',
    ];
    for (const v12id of requiredV12AppIds) {
      assert.ok(htmlIds.has(v12id), `Missing required v1.2 DOM ID #${v12id} in public/index.html`);
    }
    const requiredBgmDocsAppIds = [
      'bgm-controls',
      'btn-bgm-toggle',
      'btn-bgm-prev',
      'btn-bgm-next',
      'bgm-track-name',
      'btn-bgm-auto',
      'bgm-volume',
      'btn-hud-docs',
      'btn-hud-whitepaper',
    ];
    for (const bid of requiredBgmDocsAppIds) {
      assert.ok(htmlIds.has(bid), `Missing required BGM/Docs DOM ID #${bid} in public/index.html`);
    }
    const requiredLandingIds = [
      'anti-dilution-moat',
      'link-landing-docs',
      'link-landing-whitepaper',
      'btn-landing-bgm',
    ];
    for (const lid of requiredLandingIds) {
      assert.ok(landingIds.has(lid), `Missing required landing DOM ID #${lid} in public/landing.html`);
    }

    return `index.html (${htmlIds.size} IDs / ${appQueriedCount} queries), landing.html (${landingIds.size} IDs / ${landingQueriedCount} queries) & onboard.html (${onboardIds.size} IDs / ${onboardQueriedCount} queries) — 0 dups, 0 missing (+ ${requiredGovAppIds.length} gov, ${requiredV12AppIds.length} v1.2, ${requiredBgmDocsAppIds.length + requiredLandingIds.length} BGM/docs IDs)`;
  });

  // Start isolated temporary server for static MIME, install script & CLI E2E checks
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pct-smoke-'));
  const server = createAppServer({ dataDir: tmpDir });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 4. Verify all public/ static files, /, /app, /onboard, and install scripts return 200 OK
    await runCheck('4. All static routes (/, /app, /onboard, public/*, /install.*) return 200 with exact MIME & block traversal', async () => {
      const publicDir = path.join(ROOT_DIR, 'public');
      const staticFiles = await listFilesRecursive(publicDir);
      const expectedMime = {
        '.html': /^text\/html/i,
        '.css': /^text\/css/i,
        '.js': /^application\/javascript/i,
        '.mjs': /^application\/javascript/i,
        '.json': /^application\/json/i,
        '.svg': /^image\/svg\+xml/i,
        '.png': /^image\/png/i,
      };

      // Key HTML routes (including online docs & whitepaper readers)
      for (const route of ['/', '/app', '/onboard', '/docs', '/guide', '/whitepaper']) {
        const res = await fetch(`${baseUrl}${route}`);
        assert.equal(res.status, 200, `GET ${route} must return 200`);
        assert.match(res.headers.get('content-type') || '', /^text\/html/i, `Wrong MIME on ${route}`);
        const html = await res.text();
        assert.ok(html.length > 300, `HTML route ${route} returned unexpectedly small body`);
      }

      // One-click install & CLI download endpoints
      for (const scriptRoute of ['/install.ps1', '/install.sh', '/download/pixel-worker.mjs']) {
        const res = await fetch(`${baseUrl}${scriptRoute}`);
        assert.equal(res.status, 200, `GET ${scriptRoute} must return 200`);
        const body = await res.text();
        assert.ok(body.length > 100, `Endpoint ${scriptRoute} returned empty body`);
      }

      for (const filePath of staticFiles) {
        const relUrl = '/' + path.relative(publicDir, filePath).split(path.sep).join('/');
        const ext = path.extname(filePath).toLowerCase();
        const res = await fetch(`${baseUrl}${relUrl}`);
        assert.equal(res.status, 200, `GET ${relUrl} returned ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (expectedMime[ext]) {
          assert.match(ct, expectedMime[ext], `Wrong MIME type for ${relUrl}: got "${ct}"`);
        }
        const body = await res.text();
        assert.ok(body.length > 0, `Static file ${relUrl} was empty`);
      }

      // Path traversal must be rejected
      const traversalRes = await fetch(`${baseUrl}/%2e%2e/package.json`);
      assert.ok(
        traversalRes.status === 403 || traversalRes.status === 404,
        `Path traversal should return 403/404, got ${traversalRes.status}`,
      );

      return `${staticFiles.length + 6} routes returned 200 with exact MIME types`;
    });

    // 5. CLI --version, --help, --list, onboard --no-open --demo, --demo, and --watch end-to-end
    await runCheck('5. bin/pixel-worker.mjs v0.4 (onboard --no-open --demo, --list, --demo, --watch) runs E2E', async () => {
      const cliPath = path.join(ROOT_DIR, 'bin', 'pixel-worker.mjs');

      // 5a. --version & --help
      const verOut = await execFileAsync(process.execPath, [cliPath, '--version'], {
        env: { ...process.env, NO_COLOR: '1' },
      });
      assert.match(verOut.stdout, /pixel-worker v0\.4\./);

      const helpOut = await execFileAsync(process.execPath, [cliPath, '--help'], {
        env: { ...process.env, NO_COLOR: '1' },
      });
      assert.match(helpOut.stdout, /onboard/);
      assert.match(helpOut.stdout, /--no-open/);
      assert.match(helpOut.stdout, /--server/);
      assert.match(helpOut.stdout, /--list/);
      assert.match(helpOut.stdout, /--demo/);
      assert.match(helpOut.stdout, /--cmd/);
      assert.match(helpOut.stdout, /--watch/);

      // 5b. onboard --no-open --demo with isolated PIXEL_CONFIG_DIR
      const isolatedConfigDir = path.join(tmpDir, 'pixel-cli-config');
      const onboardOut = await execFileAsync(
        process.execPath,
        [cliPath, 'onboard', '--server', baseUrl, '--no-open', '--demo', '--name', 'Smoke-Device', '--timeout', '15'],
        { env: { ...process.env, NO_COLOR: '1', PIXEL_CONFIG_DIR: isolatedConfigDir } },
      );
      assert.match(onboardOut.stdout, /PCT-[A-Z0-9]{4}-[A-Z0-9]{2}/);
      assert.match(onboardOut.stdout, /\/onboard\?code=PCT-/);
      assert.match(onboardOut.stdout, /裝置核准與綁定成功/);

      const savedCfgRaw = await fs.readFile(path.join(isolatedConfigDir, 'config.json'), 'utf8');
      const savedCfg = JSON.parse(savedCfgRaw);
      assert.equal(savedCfg.server, baseUrl);
      assert.equal(savedCfg.deviceName, 'Smoke-Device');
      assert.match(savedCfg.deviceCode, /^PCT-[A-Z0-9]{4}-[A-Z0-9]{2}$/);
      assert.ok(savedCfg.deviceSecret);
      assert.ok(savedCfg.workerId);

      // 5c. --list
      const listOut = await execFileAsync(process.execPath, [cliPath, '--list', '--server', baseUrl], {
        env: { ...process.env, NO_COLOR: '1' },
      });
      assert.match(listOut.stdout, /w-pro-01/);
      assert.match(listOut.stdout, /task-meta-pr|task-i18n-ast-pr/);

      // Snapshot before --demo
      const beforeBoot = await (await fetch(`${baseUrl}/api/bootstrap`)).json();
      const completedBefore = beforeBoot.state.player.completedTasks;
      const goldBefore = beforeBoot.state.player.gold;

      // 5d. --demo
      const demoOut = await execFileAsync(process.execPath, [cliPath, '--demo', '--server', baseUrl], {
        env: { ...process.env, NO_COLOR: '1' },
      });
      assert.match(demoOut.stdout, /驗收通過/);

      const afterBoot = await (await fetch(`${baseUrl}/api/bootstrap`)).json();
      assert.equal(afterBoot.state.player.completedTasks, completedBefore + 1);
      assert.ok(afterBoot.state.player.gold > goldBefore, 'Player gold should increase after CLI demo submit');
      assert.ok(
        afterBoot.state.activityFeed.some((a) => a.type === 'cli'),
        'Server activityFeed should contain CLI heartbeat entries',
      );

      // 5e. --watch --max-ticks 1
      const watchOut = await execFileAsync(
        process.execPath,
        [cliPath, '--watch', '--worker', 'w-pro-01', '--interval', '0.1', '--max-ticks', '1', '--server', baseUrl],
        { env: { ...process.env, NO_COLOR: '1' } },
      );
      assert.match(watchOut.stdout, /watch|常駐|Tick|心跳/i);
      const afterWatch = await (await fetch(`${baseUrl}/api/bootstrap`)).json();
      const proWorker = afterWatch.state.workers.find((w) => w.id === 'w-pro-01');
      assert.ok(proWorker?.lastHeartbeatAt, 'Worker lastHeartbeatAt should be populated by --watch');

      return '--version, --help, onboard --no-open --demo (config.json written), --list, --demo, --watch verified E2E';
    });

    // 6. i18n module integrity + v1.0 dynamic localization functions with zero Chinese leakage in EN
    await runCheck('6. public/js/i18n.js trilingual dictionaries & dynamic localizers have ZERO Chinese leakage in EN', async () => {
      const i18nMod = await import('../public/js/i18n.js');
      assert.ok(Array.isArray(i18nMod.SUPPORTED_LANGS) && i18nMod.SUPPORTED_LANGS.length === 3);
      assert.equal(typeof i18nMod.t, 'function');
      assert.equal(typeof i18nMod.applyI18nToDom, 'function');

      // Verify required v1.0 dynamic localization exports
      const requiredLocalizers = [
        'localizeProject',
        'localizeTask',
        'localizeWorker',
        'localizeShopItem',
        'localizeAchievement',
        'localizeLeaderboardEntry',
        'localizeReviewItem',
        'localizeUser',
        'localizeFeedMessage',
        'localizeRedeemNote',
        'localizeServerMessage',
        'getCanvasI18n',
      ];
      for (const fnName of requiredLocalizers) {
        assert.equal(typeof i18nMod[fnName], 'function', `i18n.js must export function ${fnName}()`);
      }

      const dict = i18nMod.DICTIONARY;
      const baseKeys = Object.keys(dict['zh-TW']).sort();
      assert.ok(baseKeys.length >= 100, `Expected >= 100 i18n keys in v1.0, found ${baseKeys.length}`);

      for (const lang of ['zh-TW', 'zh-CN', 'en']) {
        assert.ok(dict[lang], `Missing dictionary for locale ${lang}`);
        const keys = Object.keys(dict[lang]).sort();
        assert.deepEqual(keys, baseKeys, `Key mismatch between zh-TW and ${lang}`);
        for (const k of keys) {
          assert.ok(
            typeof dict[lang][k] === 'string' && dict[lang][k].trim().length > 0,
            `Empty translation for ${lang}.${k}`,
          );
        }
      }

      // Check zero CJK in EN dictionary
      const dictEnViolations = [];
      for (const [k, v] of Object.entries(dict.en)) {
        if (CJK_RE.test(v)) dictEnViolations.push(`en.${k}: "${v}"`);
      }
      assert.deepEqual(dictEnViolations, [], `Chinese leaked in en dictionary: ${dictEnViolations.slice(0, 8).join('; ')}`);

      // Check all data-i18n* attributes in public/index.html exist in DICTIONARY
      const html = await fs.readFile(path.join(ROOT_DIR, 'public', 'index.html'), 'utf8');
      const attrRx = /data-i18n(?:-[a-z]+)?\s*=\s*["']([^"']+)["']/g;
      const missingKeys = [];
      let totalHtmlI18n = 0;
      let am;
      while ((am = attrRx.exec(html)) !== null) {
        totalHtmlI18n += 1;
        if (!(am[1] in dict['zh-TW'])) {
          missingKeys.push(am[1]);
        }
      }
      assert.deepEqual(missingKeys, [], `Missing i18n keys referenced in index.html: ${missingKeys.join(', ')}`);

      // Verify dynamic localizers against full seeded world data in 'en' -> ZERO CJK characters!
      const seed = createInitialState();
      const dynamicViolations = [];

      for (const p of seed.projects) {
        collectCjkViolations(i18nMod.localizeProject(p, 'en'), `project(${p.id})`, dynamicViolations);
      }
      for (const task of seed.tasks) {
        collectCjkViolations(i18nMod.localizeTask(task, 'en'), `task(${task.id})`, dynamicViolations);
      }
      // Also test dynamically generated tasks from vote-unlocked project
      const genTasks = generateTasksForProject(seed.projects.find((p) => p.id === 'proj-pomo'));
      for (const gt of genTasks) {
        collectCjkViolations(i18nMod.localizeTask(gt, 'en'), `genTask(${gt.id})`, dynamicViolations);
      }
      // Also test real offline preview fallback tasks returned by POST /api/github/import-issues
      const impRes = await fetch(`${baseUrl}/api/github/import-issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: 'pixel-compute-town/smoke-i18n-demo', maxIssues: 3, skipRemote: true }),
      });
      assert.equal(impRes.status, 200);
      const impJson = await impRes.json();
      for (const ft of impJson.tasks || []) {
        collectCjkViolations(i18nMod.localizeTask(ft, 'en'), `githubFallbackTask(${ft.id})`, dynamicViolations);
      }
      for (const w of seed.workers) {
        collectCjkViolations(i18nMod.localizeWorker(w, 'en'), `worker(${w.id})`, dynamicViolations);
      }
      for (const item of SHOP_ITEMS) {
        collectCjkViolations(i18nMod.localizeShopItem(item, 'en'), `shop(${item.id})`, dynamicViolations);
      }
      for (const ach of seed.achievements) {
        collectCjkViolations(i18nMod.localizeAchievement(ach, 'en'), `ach(${ach.id})`, dynamicViolations);
      }
      for (const row of seed.leaderboard) {
        collectCjkViolations(i18nMod.localizeLeaderboardEntry(row, 'en'), `lb(${row.userId || row.displayName})`, dynamicViolations);
      }
      collectCjkViolations(i18nMod.localizeUser(seed.player, 'en'), 'user(player)', dynamicViolations);
      for (const codeItem of seed.redeemCodes || []) {
        collectCjkViolations(i18nMod.localizeRedeemNote(codeItem, 'en'), `redeemNote(${codeItem.code})`, dynamicViolations);
      }
      // Verify seeded & dynamic peer review queue items (rev-clean-01, rev-slop-01, dynamic) have ZERO CJK in EN
      assert.ok(
        Array.isArray(seed.reviewQueue) && seed.reviewQueue.some((r) => r.id === 'rev-clean-01') && seed.reviewQueue.some((r) => r.id === 'rev-slop-01'),
        'Seeded state must include rev-clean-01 and rev-slop-01 for review localization check',
      );
      for (const revItem of seed.reviewQueue) {
        collectCjkViolations(
          i18nMod.localizeReviewItem(revItem, 'en', { tasks: seed.tasks, projects: seed.projects }),
          `reviewItem(${revItem.id})`,
          dynamicViolations,
        );
      }
      const dynamicReviewSample = {
        id: 'rev-dynamic-smoke',
        projectId: 'proj-meta',
        projectName: '像素算力鎮 v1.0（創世 Meta 項目）',
        taskId: 'task-meta-pr',
        taskTitle: '為像素辦公室實作鍵盤快捷鍵導覽與任務詳情 PR',
        submittedByUserId: 'usr-alice',
        submittedByName: 'Alice Builder',
        aiReview: {
          aiScore: 34,
          riskLevel: 'high',
          bloatRatioPct: 72,
          summary: '⚠️ 疑似低效垃圾 AI 注水（注水比 72%，偵測 2 項異常），建議實幹審閱團駁回並沒收押金！',
          flags: ['DUPLICATE_LINES (65%)', '⚠️ 72% 重複註解注水'],
        },
        content: 'export function run() {\n  // 測試註解\n  return true;\n}',
      };
      const localizedDyn = i18nMod.localizeReviewItem(dynamicReviewSample, 'en', {
        tasks: seed.tasks,
        projects: seed.projects,
      });
      assert.equal(localizedDyn.submitterName, 'Alice Builder', 'Dynamic reviewItem must preserve submittedByName');
      collectCjkViolations(localizedDyn, 'reviewItem(dynamic)', dynamicViolations);
      collectCjkViolations(i18nMod.getCanvasI18n('en'), 'canvasI18n(en)', dynamicViolations);

      assert.deepEqual(
        dynamicViolations,
        [],
        `Chinese leaked in EN dynamic localizers:\n  ${dynamicViolations.slice(0, 12).join('\n  ')}`,
      );

      // Verify public/js/onboard.js trilingual I18N dictionary alignment & ZERO CJK in EN
      const onboardSrc = await fs.readFile(path.join(ROOT_DIR, 'public', 'js', 'onboard.js'), 'utf8');
      const onboardDictMatch = onboardSrc.match(/const\s+I18N\s*=\s*(\{[\s\S]*?\n\});/);
      assert.ok(onboardDictMatch, 'Could not locate `const I18N = { ... };` dictionary in public/js/onboard.js');
      const onboardDict = vm.runInNewContext(`(${onboardDictMatch[1]})`);
      const onboardBaseKeys = Object.keys(onboardDict['zh-TW']).sort();
      assert.ok(onboardBaseKeys.length >= 75, `Expected >= 75 onboard.js i18n keys, found ${onboardBaseKeys.length}`);
      for (const lang of ['zh-TW', 'zh-CN', 'en']) {
        assert.ok(onboardDict[lang], `Missing onboard.js dictionary for locale ${lang}`);
        assert.deepEqual(
          Object.keys(onboardDict[lang]).sort(),
          onboardBaseKeys,
          `onboard.js key mismatch between zh-TW and ${lang}`,
        );
        for (const k of onboardBaseKeys) {
          assert.ok(
            typeof onboardDict[lang][k] === 'string' && onboardDict[lang][k].trim().length > 0,
            `Empty onboard.js translation for ${lang}.${k}`,
          );
        }
      }
      const onboardEnViolations = [];
      for (const [k, v] of Object.entries(onboardDict.en)) {
        if (CJK_RE.test(v)) onboardEnViolations.push(`onboard.en.${k}: "${v}"`);
      }
      assert.deepEqual(
        onboardEnViolations,
        [],
        `Chinese leaked in onboard.js EN dictionary: ${onboardEnViolations.slice(0, 8).join('; ')}`,
      );
      assert.equal(onboardDict.en['step1.demoDisplayName'], 'Founding Mayor (Demo)');

      // Check all data-i18n* attributes in public/onboard.html exist in onboard.js I18N
      const onboardHtml = await fs.readFile(path.join(ROOT_DIR, 'public', 'onboard.html'), 'utf8');
      const onboardMissingKeys = [];
      const onboardAttrRx = /data-i18n(?:-[a-z]+)?\s*=\s*["']([^"']+)["']/g;
      let oam;
      while ((oam = onboardAttrRx.exec(onboardHtml)) !== null) {
        if (!(oam[1] in onboardDict['zh-TW'])) {
          onboardMissingKeys.push(oam[1]);
        }
      }
      assert.deepEqual(
        onboardMissingKeys,
        [],
        `Missing i18n keys referenced in onboard.html: ${onboardMissingKeys.join(', ')}`,
      );

      // Verify public/js/landing.js trilingual I18N dictionary alignment & ZERO CJK in EN
      const landingSrc = await fs.readFile(path.join(ROOT_DIR, 'public', 'js', 'landing.js'), 'utf8');
      const landingDictMatch = landingSrc.match(/const\s+I18N\s*=\s*(\{[\s\S]*?\n\});/);
      assert.ok(landingDictMatch, 'Could not locate `const I18N = { ... };` dictionary in public/js/landing.js');
      const landingDict = vm.runInNewContext(`(${landingDictMatch[1]})`);
      const landingBaseKeys = Object.keys(landingDict['zh-TW']).sort();
      assert.ok(landingBaseKeys.length >= 180, `Expected >= 180 landing.js i18n keys, found ${landingBaseKeys.length}`);
      for (const lang of ['zh-TW', 'zh-CN', 'en']) {
        assert.ok(landingDict[lang], `Missing landing.js dictionary for locale ${lang}`);
        assert.deepEqual(
          Object.keys(landingDict[lang]).sort(),
          landingBaseKeys,
          `landing.js key mismatch between zh-TW and ${lang}`,
        );
        for (const k of landingBaseKeys) {
          assert.ok(
            typeof landingDict[lang][k] === 'string' && landingDict[lang][k].trim().length > 0,
            `Empty landing.js translation for ${lang}.${k}`,
          );
        }
      }
      const landingEnViolations = [];
      for (const [k, v] of Object.entries(landingDict.en)) {
        if (CJK_RE.test(v)) landingEnViolations.push(`landing.en.${k}: "${v}"`);
      }
      assert.deepEqual(
        landingEnViolations,
        [],
        `Chinese leaked in landing.js EN dictionary: ${landingEnViolations.slice(0, 8).join('; ')}`,
      );

      // Check all data-i18n* attributes in public/landing.html exist in landing.js I18N
      const landingHtml = await fs.readFile(path.join(ROOT_DIR, 'public', 'landing.html'), 'utf8');
      const landingMissingKeys = [];
      const landingAttrRx = /data-i18n(?:-[a-z]+)?\s*=\s*["']([^"']+)["']/g;
      let lam;
      while ((lam = landingAttrRx.exec(landingHtml)) !== null) {
        if (!(lam[1] in landingDict['zh-TW'])) {
          landingMissingKeys.push(lam[1]);
        }
      }
      assert.deepEqual(
        landingMissingKeys,
        [],
        `Missing i18n keys referenced in landing.html: ${landingMissingKeys.join(', ')}`,
      );

      return `${baseKeys.length} app + ${onboardBaseKeys.length} onboard + ${landingBaseKeys.length} landing keys × 3 locales, ${totalHtmlI18n} HTML bindings & all ${requiredLocalizers.length} dynamic localizers verified (0 CJK in EN)`;
    });

    // 7. Deployment, CI workflow & v1.2 documentation assets check
    await runCheck('7. Deployment configs, GitHub Actions CI, .env.example & v1.2 docs verified', async () => {
      const requiredFiles = [
        '.env.example',
        'Dockerfile',
        '.dockerignore',
        'render.yaml',
        'fly.toml',
        '.github/workflows/ci.yml',
        'docs/PRD.md',
        'docs/DEPLOY_AND_PROMOTE.md',
        'docs/USER_GUIDE.md',
        'docs/WHITEPAPER.md',
        'README.md',
      ];
      for (const rel of requiredFiles) {
        const stat = await fs.stat(path.join(ROOT_DIR, rel));
        assert.ok(stat.size > 20, `${rel} is missing or unexpectedly small`);
      }

      const envExample = await fs.readFile(path.join(ROOT_DIR, '.env.example'), 'utf8');
      for (const envVar of [
        'GITHUB_CLIENT_ID',
        'GOOGLE_CLIENT_ID',
        'GITHUB_WEBHOOK_SECRET',
        'TREASURY_EVM_ADDRESS',
        'TREASURY_SOL_ADDRESS',
        'POLAR_CHECKOUT_URL',
        'STRIPE_SECRET_KEY',
      ]) {
        assert.ok(envExample.includes(envVar), `.env.example must document ${envVar}`);
      }

      const readme = await fs.readFile(path.join(ROOT_DIR, 'README.md'), 'utf8');
      assert.match(readme, /install\.ps1/);
      assert.match(readme, /install\.sh/);
      assert.match(readme, /onboard/);
      assert.match(readme, /Proof of First Spark/);
      assert.match(readme, /5%.*85%.*10%/);
      assert.match(readme, /70\/30|70%.*30%/);
      assert.match(readme, /AI 盲審/);
      assert.match(readme, /實幹審閱/);
      assert.match(readme, /押金/);
      assert.match(readme, /SQLite/i);
      assert.match(readme, /\/p\/:slug/);
      assert.match(readme, /\/verify\/:hash/);
      assert.match(readme, /GITHUB_WEBHOOK_SECRET/);

      const deployDoc = await fs.readFile(path.join(ROOT_DIR, 'docs', 'DEPLOY_AND_PROMOTE.md'), 'utf8');
      assert.match(deployDoc, /SQLite/i);
      assert.match(deployDoc, /\/p\/:slug|\/p\//);
      assert.match(deployDoc, /\/verify\/:hash|\/verify\//);
      assert.match(deployDoc, /GITHUB_WEBHOOK_SECRET/);

      const prd = await fs.readFile(path.join(ROOT_DIR, 'docs', 'PRD.md'), 'utf8');
      assert.match(prd, /Proof of First Spark/);
      assert.match(prd, /5%.*85%.*10%/);
      assert.match(prd, /70\/30|70%.*30%/);
      assert.match(prd, /AI 盲審/);
      assert.match(prd, /實幹審閱/);
      assert.match(prd, /押金/);

      // Verify docs/USER_GUIDE.md completeness (all 5 chapters + 6 role routes + BGM)
      const userGuide = await fs.readFile(path.join(ROOT_DIR, 'docs', 'USER_GUIDE.md'), 'utf8');
      assert.ok(userGuide.length >= 4000, `docs/USER_GUIDE.md unexpectedly short (${userGuide.length} chars)`);
      for (const pat of [
        /第一章/,
        /第二章/,
        /第三章/,
        /第四章/,
        /第五章/,
        /路線 A/,
        /路線 B/,
        /路線 C/,
        /路線 D/,
        /路線 E/,
        /路線 F/,
        /\/onboard/,
        /pixel-worker/,
        /5%.*95%.*0%/,
        /70\/30/,
        /USDC/,
        /SQLite/i,
        /8-bit/,
      ]) {
        assert.match(userGuide, pat, `docs/USER_GUIDE.md missing expected section/keyword: ${pat}`);
      }

      // Verify docs/WHITEPAPER.md completeness (Abstract + 8 chapters + math proof + legal boundary)
      const whitepaper = await fs.readFile(path.join(ROOT_DIR, 'docs', 'WHITEPAPER.md'), 'utf8');
      assert.ok(whitepaper.length >= 4000, `docs/WHITEPAPER.md unexpectedly short (${whitepaper.length} chars)`);
      for (const pat of [
        /Abstract/,
        /Proof of First Spark/,
        /PCT-POFS-v1/,
        /5%.*95%.*0%/,
        /70\/30/,
        /\$665\.00/,
        /\$285\.00/,
        /10,000/,
        /runAiBlindReview/,
        /USDC/,
        /Howey Test/,
        /SQLite/i,
      ]) {
        assert.match(whitepaper, pat, `docs/WHITEPAPER.md missing expected section/keyword: ${pat}`);
      }

      const ciYaml = await fs.readFile(path.join(ROOT_DIR, '.github/workflows/ci.yml'), 'utf8');
      assert.match(ciYaml, /node-version:\s*["']?24["']?/);
      assert.match(ciYaml, /npm test/);
      assert.match(ciYaml, /npm run smoke/);

      return `${requiredFiles.length} deployment, CI, .env.example (incl. GITHUB_WEBHOOK_SECRET) & v1.2 docs verified`;
    });

    // 8. src/server/provenance.mjs exports, SHA-256 chain integrity & bilingual anti-copycat engine check
    await runCheck('8. src/server/provenance.mjs exports, SHA-256 chain & bilingual similarity verified', async () => {
      const prov = await import('../src/server/provenance.mjs');
      for (const fnName of [
        'computeIdeaHash',
        'computeSimilarity',
        'findSimilarIdeas',
        'verifyProvenanceChain',
        'ensureProjectsProvenance',
      ]) {
        assert.equal(typeof prov[fnName], 'function', `provenance.mjs must export function ${fnName}()`);
      }
      assert.equal(prov.GENESIS_HASH, '0'.repeat(64));
      assert.equal(prov.COPYCAT_HIGH_THRESHOLD, 0.65);

      const seed = createInitialState();
      const chainReport = prov.verifyProvenanceChain(seed.projects);
      assert.equal(chainReport.valid, true, 'Seeded projects provenance chain must be valid');
      assert.ok(chainReport.chainLength >= 3);
      assert.match(chainReport.headHash, /^[a-f0-9]{64}$/);

      // Bilingual similarity sanity check
      const zhSim = prov.computeSimilarity('像素算力鎮開源孵化平臺', '像素算力鎮開源孵化平臺');
      assert.equal(zhSim, 1);
      const enSim = prov.computeSimilarity('Pixel Compute Town Platform', 'pixel compute town platform');
      assert.equal(enSim, 1);
      const unrelated = prov.computeSimilarity('像素番茄鐘計時器', 'Deep Ocean Sonar Mapper');
      assert.equal(unrelated, 0);

      // Tamper detection sanity check
      const tampered = seed.projects.map((p) => ({ ...p }));
      tampered[0].name = 'Tampered Name';
      const tamperedReport = prov.verifyProvenanceChain(tampered);
      assert.equal(tamperedReport.valid, false, 'Tampered project must fail provenance verification');

      return `${chainReport.chainLength} seeded records verified, tamper detection & zh/en similarity active`;
    });

    // 9. src/server/governance.mjs exports, 70/30 anti-dilution split math & AI blind review diagnostics check
    await runCheck('9. src/server/governance.mjs exports, 70/30 anti-dilution math & AI blind review verified', async () => {
      const gov = await import('../src/server/governance.mjs');
      assert.equal(gov.CORE_BUCKET_PCT, 70);
      assert.equal(gov.PERIPHERAL_BUCKET_PCT, 30);
      assert.equal(gov.REVIEWER_REWARD_GOLD, 15);
      assert.equal(gov.REVIEWER_REWARD_POINTS, 5);
      assert.equal(gov.SLOP_STRIKE_LIMIT, 2);
      assert.equal(gov.DEFAULT_COOLDOWN_SEC, 60);
      assert.equal(gov.DEFAULT_MIN_REPUTATION, 60);

      for (const fnName of [
        'getTaskBucket',
        'getTaskStakeGold',
        'getTaskMinReputation',
        'getCooldownSeconds',
        'ensureProjectBuckets',
        'computeBucketStats',
        'computeAntiDilutionMeritSplit',
        'canUserReview',
        'runAiBlindReview',
      ]) {
        assert.equal(typeof gov[fnName], 'function', `governance.mjs must export function ${fnName}()`);
      }

      // 70/30 bucket cap sanity proof: 100 core vs 10,000 peripheral on $850 merit pool -> $595 / $255
      const split = gov.computeAntiDilutionMeritSplit(
        {
          id: 'proj-smoke-gov',
          poolCaps: { coreSharePct: 70, peripheralSharePct: 30 },
          bucketPoints: { core: { 'core-dev': 100 }, peripheral: { 'spam-bot': 10000 } },
        },
        850,
      );
      assert.equal(split.corePoolUsd, 595);
      assert.equal(split.peripheralPoolUsd, 255);
      assert.equal(split.payoutsByUserId['core-dev'], 595);
      assert.equal(split.payoutsByUserId['spam-bot'], 255);

      // AI blind review distinguishes clean code vs repetitive slop
      const cleanReport = gov.runAiBlindReview(
        { title: 'Core PR' },
        'export function sum(a, b) {\n  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;\n  return a + b;\n}\n',
        'https://github.com/pixel-compute-town/demo/pull/1',
      );
      assert.equal(cleanReport.riskLevel, 'low');
      assert.ok(cleanReport.aiScore >= 80, `Clean PR should score >= 80, got ${cleanReport.aiScore}`);

      const slopContent = [
        ...Array.from({ length: 12 }, () => '// TODO: placeholder auto-generated comment'),
        'function stub1() {}',
        'function stub2() {}',
        'function stub3() {}',
      ].join('\n');
      const slopReport = gov.runAiBlindReview({ title: 'Slop PR' }, slopContent, '');
      assert.equal(slopReport.riskLevel, 'high');
      assert.ok(slopReport.aiScore < 50, `Slop PR should score < 50, got ${slopReport.aiScore}`);
      assert.ok(slopReport.bloatRatioPct >= 55, `Slop PR should have high bloat ratio, got ${slopReport.bloatRatioPct}`);

      return `9 exports + 7 constants verified; 70/30 cap ($595/$255) & AI blind review (clean ${cleanReport.aiScore} vs slop ${slopReport.aiScore}) active`;
    });

    // 10. v1.2 publicPages.mjs, sound.js new SFX methods & pixelEngine.js triggerReviewDecision contract check
    await runCheck('10. v1.2 publicPages.mjs exports, sound.js (playSlash/playApproveFanfare) & pixelEngine.js contract verified', async () => {
      // 10a. src/server/publicPages.mjs syntax & exports
      const publicPagesPath = path.join(ROOT_DIR, 'src', 'server', 'publicPages.mjs');
      await execFileAsync(process.execPath, ['--check', publicPagesPath]);
      const pagesMod = await import('../src/server/publicPages.mjs');
      const requiredPageExports = [
        'escapeHtml',
        'getProjectSlug',
        'findProjectBySlugOrId',
        'renderPublicProjectPage',
        'renderPublicVerifyPage',
        'renderPublicNotFoundPage',
        'renderMarkdownToHtml',
        'renderDocPage',
      ];
      for (const fnName of requiredPageExports) {
        assert.equal(typeof pagesMod[fnName], 'function', `publicPages.mjs must export function ${fnName}()`);
      }

      // Verify escapeHtml XSS safety
      assert.equal(
        pagesMod.escapeHtml(`<script>"'&`),
        '&lt;script&gt;&quot;&#39;&amp;',
        'escapeHtml must escape <, >, ", \', and &',
      );

      // Verify renderPublicProjectPage & renderPublicVerifyPage output & live HTTP routes
      const liveBoot = await (await fetch(`${baseUrl}/api/bootstrap`)).json();
      const projMeta = pagesMod.findProjectBySlugOrId(liveBoot.state.projects, 'meta');
      assert.ok(projMeta && projMeta.id === 'proj-meta', 'findProjectBySlugOrId("meta") must resolve proj-meta');
      const shareHtml = pagesMod.renderPublicProjectPage(projMeta, liveBoot.state, baseUrl);
      assert.match(shareHtml, /<meta\s+property="og:title"/i);
      assert.ok(shareHtml.includes(projMeta.ideaHash));

      const liveShare = await fetch(`${baseUrl}/p/meta`);
      assert.equal(liveShare.status, 200);
      assert.match(liveShare.headers.get('content-type') || '', /^text\/html/i);

      const liveVerifyOk = await fetch(`${baseUrl}/verify/${projMeta.ideaHash.slice(0, 12)}`);
      assert.equal(liveVerifyOk.status, 200);
      assert.ok((await liveVerifyOk.text()).includes('VERIFIED ON PIXELCOMPUTE PROVENANCE CHAIN'));

      const liveVerify404 = await fetch(`${baseUrl}/verify/deadbeefdeadbeef`);
      assert.equal(liveVerify404.status, 404);

      // 10b. public/js/sound.js runtime import & v1.2 new methods
      const soundMod = await import('../public/js/sound.js');
      assert.ok(soundMod.soundFX, 'sound.js must export soundFX singleton');
      const requiredSoundMethods = [
        'toggle',
        'setEnabled',
        'playClick',
        'playDispatch',
        'playCoin',
        'playVerify',
        'playReject',
        'playLaunch',
        'playSlash',
        'playApproveFanfare',
      ];
      for (const mName of requiredSoundMethods) {
        assert.equal(typeof soundMod.soundFX[mName], 'function', `soundFX must expose method ${mName}()`);
      }
      // Calling muted SFX methods in Node must be safe no-ops
      soundMod.soundFX.playSlash();
      soundMod.soundFX.playApproveFanfare();

      // 10c. public/js/pixelEngine.js exposes triggerReviewDecision()
      const pixelEngineSrc = await fs.readFile(path.join(ROOT_DIR, 'public', 'js', 'pixelEngine.js'), 'utf8');
      assert.match(pixelEngineSrc, /\btriggerReviewDecision\s*\(/, 'pixelEngine.js must define triggerReviewDecision()');

      return `publicPages.mjs (${requiredPageExports.length} exports + live /p & /verify), sound.js (${requiredSoundMethods.length} methods incl. playSlash/playApproveFanfare) & pixelEngine.triggerReviewDecision verified`;
    });

    // 11. public/js/bgm.js syntax, 4 original tracks trilingual contract, SCENE_TRACK_MAP & bgmPlayer API check
    await runCheck('11. public/js/bgm.js syntax, 4 original 8-bit tracks (0 CJK in EN), SCENE_TRACK_MAP & bgmPlayer API verified', async () => {
      const bgmPath = path.join(ROOT_DIR, 'public', 'js', 'bgm.js');
      await execFileAsync(process.execPath, ['--check', bgmPath]);

      const bgmMod = await import('../public/js/bgm.js');
      assert.ok(Array.isArray(bgmMod.BGM_TRACKS), 'bgm.js must export BGM_TRACKS array');
      assert.equal(bgmMod.BGM_TRACKS.length, 4, `Expected 4 original BGM tracks, found ${bgmMod.BGM_TRACKS.length}`);

      const expectedTrackIds = ['plaza', 'factory', 'guild', 'vault'];
      assert.deepEqual(
        bgmMod.BGM_TRACKS.map((t) => t.id),
        expectedTrackIds,
        'BGM_TRACKS must contain plaza, factory, guild, vault',
      );

      for (const track of bgmMod.BGM_TRACKS) {
        for (const field of ['nameZhTW', 'nameZhCN', 'nameEn', 'moodZhTW', 'moodZhCN', 'moodEn']) {
          assert.ok(
            typeof track[field] === 'string' && track[field].trim().length > 0,
            `Track ${track.id} missing non-empty field ${field}`,
          );
        }
        assert.ok(!CJK_RE.test(track.nameEn), `Track ${track.id}.nameEn contains CJK: "${track.nameEn}"`);
        assert.ok(!CJK_RE.test(track.moodEn), `Track ${track.id}.moodEn contains CJK: "${track.moodEn}"`);
        assert.ok(Number.isFinite(track.bpm) && track.bpm >= 80 && track.bpm <= 180, `Invalid BPM on ${track.id}`);
        assert.ok(Array.isArray(track.scenes) && track.scenes.length >= 1, `Track ${track.id} must declare scenes[]`);
      }

      // Verify SCENE_TRACK_MAP covers all 6 HD rooms
      assert.ok(bgmMod.SCENE_TRACK_MAP && typeof bgmMod.SCENE_TRACK_MAP === 'object');
      const expectedSceneMap = {
        town: 'plaza',
        launchpad: 'plaza',
        factory: 'factory',
        guild: 'guild',
        lounge: 'guild',
        vault: 'vault',
      };
      for (const [scene, expectedTrack] of Object.entries(expectedSceneMap)) {
        assert.equal(bgmMod.SCENE_TRACK_MAP[scene], expectedTrack, `SCENE_TRACK_MAP.${scene} must map to ${expectedTrack}`);
      }

      // Verify bgmPlayer singleton API contract in Node runtime
      const player = bgmMod.bgmPlayer;
      assert.ok(player, 'bgm.js must export bgmPlayer singleton');
      const requiredPlayerMethods = [
        'play',
        'pause',
        'toggle',
        'setTrack',
        'nextTrack',
        'prevTrack',
        'setVolume',
        'setAutoScene',
        'syncScene',
        'getState',
        'subscribe',
      ];
      for (const mName of requiredPlayerMethods) {
        assert.equal(typeof player[mName], 'function', `bgmPlayer must expose method ${mName}()`);
      }

      const initState = player.getState();
      assert.equal(initState.playing, false, 'bgmPlayer must default to playing=false for autoplay policy compliance');
      assert.ok(expectedTrackIds.includes(initState.trackId), 'Initial trackId must be valid');
      assert.ok(initState.volume > 0 && initState.volume <= 1, 'Initial volume must be in (0, 1]');

      let notifyCount = 0;
      const unsub = player.subscribe(() => { notifyCount += 1; });
      assert.equal(typeof unsub, 'function', 'bgmPlayer.subscribe() must return unsubscribe function');

      player.setAutoScene(true);
      player.syncScene('vault');
      assert.equal(player.getState().trackId, 'vault');
      player.nextTrack();
      assert.equal(player.getState().trackId, 'plaza');
      player.prevTrack();
      assert.equal(player.getState().trackId, 'vault');
      player.setTrack('factory');
      assert.equal(player.getState().trackId, 'factory');
      player.setVolume(0.45);
      assert.equal(player.getState().volume, 0.45);
      player.pause();
      assert.equal(player.getState().playing, false);
      assert.ok(notifyCount > 0, 'bgmPlayer.subscribe listener should receive state updates');
      unsub();

      return `4 original tracks (plaza/factory/guild/vault, 0 CJK in EN), 6-scene SCENE_TRACK_MAP & ${requiredPlayerMethods.length} bgmPlayer methods verified`;
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(tmpDir, { recursive: true, force: true });
  }

  console.log(`\n📊 Smoke Test Summary: ${passedCount} passed, ${failedCount} failed.\n`);
  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

await main();
