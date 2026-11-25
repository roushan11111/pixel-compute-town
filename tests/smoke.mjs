// PixelCompute Town v1.0 — Static, DOM Integrity, MIME, Trilingual i18n & CLI E2E Smoke Test Suite
// Zero-dependency Node.js runner (`npm run smoke` or `node tests/smoke.mjs`)

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

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
  console.log('\n🔍 PixelCompute Town v1.0 — Smoke & Contract Verification Suite\n');

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
    return `${importChecks} ESM imports verified across ${jsFiles.length} modules`;
  });

  // 3. DOM ID consistency across index.html, landing.html, and onboard.html
  await runCheck('3. HTML DOM IDs (index/landing/onboard) have zero duplicates & match app.js queries', async () => {
    const htmlIdRx = /\bid\s*=\s*["']([^"']+)["']/g;

    // Check landing.html & onboard.html for duplicate IDs
    for (const extraHtml of ['landing.html', 'onboard.html']) {
      const content = await fs.readFile(path.join(ROOT_DIR, 'public', extraHtml), 'utf8');
      const seen = new Set();
      const dups = [];
      let m;
      while ((m = htmlIdRx.exec(content)) !== null) {
        if (seen.has(m[1])) dups.push(m[1]);
        seen.add(m[1]);
      }
      assert.deepEqual(dups, [], `Duplicate IDs found in public/${extraHtml}: ${dups.join(', ')}`);
    }

    const htmlPath = path.join(ROOT_DIR, 'public', 'index.html');
    const appPath = path.join(ROOT_DIR, 'public', 'js', 'app.js');
    const html = await fs.readFile(htmlPath, 'utf8');
    const appSrc = await fs.readFile(appPath, 'utf8');

    const htmlIds = new Set();
    const duplicateIds = [];
    let hm;
    while ((hm = htmlIdRx.exec(html)) !== null) {
      if (htmlIds.has(hm[1])) {
        duplicateIds.push(hm[1]);
      }
      htmlIds.add(hm[1]);
    }
    assert.deepEqual(duplicateIds, [], `Duplicate IDs found in public/index.html: ${duplicateIds.join(', ')}`);

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

    // Collect all queried IDs in app.js
    const queriedIds = new Set();
    const appIdPatterns = [
      /(?:^|[^\w$.])\$\(\s*['"]([A-Za-z0-9_-]+)['"]\s*\)/g,
      /document\.getElementById\(\s*['"]([A-Za-z0-9_-]+)['"]\s*\)/g,
      /\b(?:openModal|closeModal)\(\s*['"]([A-Za-z0-9_-]+)['"]\s*\)/g,
    ];
    for (const rx of appIdPatterns) {
      let am;
      while ((am = rx.exec(appSrc)) !== null) {
        queriedIds.add(am[1]);
      }
    }

    const dynamicIds = new Set();
    let dm;
    while ((dm = htmlIdRx.exec(appSrc)) !== null) {
      dynamicIds.add(dm[1]);
    }

    const missing = [];
    for (const id of queriedIds) {
      if (!htmlIds.has(id) && !dynamicIds.has(id)) {
        missing.push(id);
      }
    }

    assert.deepEqual(
      missing,
      [],
      `app.js queries IDs that do not exist in public/index.html: ${missing.join(', ')}`,
    );

    return `${htmlIds.size} index.html IDs (0 dups), ${queriedIds.size} queried IDs in app.js (0 missing) + landing/onboard clean`;
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

      // Key v1.0 HTML routes
      for (const route of ['/', '/app', '/onboard']) {
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
        'localizeUser',
        'localizeFeedMessage',
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
      collectCjkViolations(i18nMod.getCanvasI18n('en'), 'canvasI18n(en)', dynamicViolations);

      assert.deepEqual(
        dynamicViolations,
        [],
        `Chinese leaked in EN dynamic localizers:\n  ${dynamicViolations.slice(0, 12).join('\n  ')}`,
      );

      return `${baseKeys.length} keys × 3 locales, ${totalHtmlI18n} HTML bindings & all 9 dynamic localizers verified (0 CJK in EN)`;
    });

    // 7. Deployment, CI workflow & v1.0 documentation assets check
    await runCheck('7. Deployment configs, GitHub Actions CI, .env.example & v1.0 docs verified', async () => {
      const requiredFiles = [
        '.env.example',
        'Dockerfile',
        '.dockerignore',
        'render.yaml',
        'fly.toml',
        '.github/workflows/ci.yml',
        'docs/PRD.md',
        'docs/DEPLOY_AND_PROMOTE.md',
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

      const ciYaml = await fs.readFile(path.join(ROOT_DIR, '.github/workflows/ci.yml'), 'utf8');
      assert.match(ciYaml, /node-version:\s*["']?24["']?/);
      assert.match(ciYaml, /npm test/);
      assert.match(ciYaml, /npm run smoke/);

      return `${requiredFiles.length} deployment, CI, .env.example & v1.0 docs verified`;
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
