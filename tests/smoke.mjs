// PixelCompute Town — Static, DOM Integrity, MIME & CLI E2E Smoke Test Suite
// Zero-dependency Node.js runner (`npm run smoke` or `node tests/smoke.mjs`)

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { createAppServer } from '../server.mjs';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

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

async function main() {
  console.log('\n🔍 PixelCompute Town — Smoke & Integration Verification Suite\n');

  // 1. Syntax check all .mjs and .js files
  await runCheck('1. All backend (.mjs) and frontend (.js) files parse with zero syntax errors', async () => {
    const files = await listFilesRecursive(ROOT_DIR, ['.mjs', '.js']);
    assert.ok(files.length >= 10, `Expected >= 10 JS/MJS files, found ${files.length}`);

    for (const file of files) {
      await execFileAsync(process.execPath, ['--check', file]);
    }
    return `${files.length} files syntax-checked cleanly`;
  });

  // 2. Frontend ESM import/export graph integrity
  await runCheck('2. Frontend ES module relative imports & named exports match 100%', async () => {
    const jsDir = path.join(ROOT_DIR, 'public', 'js');
    const jsFiles = await listFilesRecursive(jsDir, ['.js']);
    const exportMap = new Map();

    for (const f of jsFiles) {
      const src = await fs.readFile(f, 'utf8');
      exportMap.set(path.resolve(f), extractExportNames(src));
    }

    let importChecks = 0;
    const importRx = /import\s*\{([\s\S]*?)\}\s*from\s*['"](\.[^'"]+)['"]/g;
    for (const f of jsFiles) {
      const src = await fs.readFile(f, 'utf8');
      let m;
      while ((m = importRx.exec(src)) !== null) {
        const specifiers = m[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => s.split(/\s+as\s+/)[0].trim());
        const targetPath = path.resolve(path.dirname(f), m[2]);
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
    }
    return `${importChecks} named ESM imports verified across ${jsFiles.length} modules`;
  });

  // 3. DOM ID consistency between public/index.html and public/js/app.js
  await runCheck('3. public/index.html DOM IDs match all IDs queried by public/js/app.js', async () => {
    const htmlPath = path.join(ROOT_DIR, 'public', 'index.html');
    const appPath = path.join(ROOT_DIR, 'public', 'js', 'app.js');
    const html = await fs.readFile(htmlPath, 'utf8');
    const appSrc = await fs.readFile(appPath, 'utf8');

    // Collect HTML IDs and detect duplicates
    const htmlIds = new Set();
    const duplicateIds = [];
    const htmlIdRx = /\bid\s*=\s*["']([^"']+)["']/g;
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

    // Collect all queried IDs in app.js: $('id'), document.getElementById('id'), openModal('id'), closeModal('id')
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

    // Also collect any dynamically rendered id="..." inside app.js template strings
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

    return `${htmlIds.size} HTML IDs (0 duplicates), ${queriedIds.size} queried IDs in app.js (0 missing)`;
  });

  // Start isolated temporary server for static MIME & CLI E2E checks
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pct-smoke-'));
  const server = createAppServer({ dataDir: tmpDir });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 4. Verify all public/ static files return HTTP 200 and accurate MIME types
    await runCheck('4. All public/ static files serve HTTP 200 with exact MIME types & block traversal', async () => {
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

      // Root `/` must return HTML
      const rootRes = await fetch(`${baseUrl}/`);
      assert.equal(rootRes.status, 200, 'GET / must return 200');
      assert.match(rootRes.headers.get('content-type') || '', /^text\/html/i);

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

      return `${staticFiles.length + 1} routes returned 200 with exact MIME types`;
    });

    // 5. CLI --help, --list, --demo, and --watch end-to-end execution against temp server
    await runCheck('5. bin/pixel-worker.mjs --help, --list, --demo, and --watch run E2E against server', async () => {
      const cliPath = path.join(ROOT_DIR, 'bin', 'pixel-worker.mjs');

      // 5a. --help
      const helpOut = await execFileAsync(process.execPath, [cliPath, '--help'], {
        env: { ...process.env, NO_COLOR: '1' },
      });
      assert.match(helpOut.stdout, /--server/);
      assert.match(helpOut.stdout, /--list/);
      assert.match(helpOut.stdout, /--demo/);
      assert.match(helpOut.stdout, /--cmd/);
      assert.match(helpOut.stdout, /--watch/);

      // 5b. --list
      const listOut = await execFileAsync(process.execPath, [cliPath, '--list', '--server', baseUrl], {
        env: { ...process.env, NO_COLOR: '1' },
      });
      assert.match(listOut.stdout, /w-pro-01/);
      assert.match(listOut.stdout, /task-meta-pr|task-i18n-ast-pr/);

      // Snapshot before --demo
      const beforeBoot = await (await fetch(`${baseUrl}/api/bootstrap`)).json();
      const completedBefore = beforeBoot.state.player.completedTasks;
      const goldBefore = beforeBoot.state.player.gold;

      // 5c. --demo
      const demoOut = await execFileAsync(process.execPath, [cliPath, '--demo', '--server', baseUrl], {
        env: { ...process.env, NO_COLOR: '1' },
      });
      assert.match(demoOut.stdout, /驗收通過/);

      // Verify server state actually reflects CLI heartbeat + accepted submission
      const afterBoot = await (await fetch(`${baseUrl}/api/bootstrap`)).json();
      assert.equal(afterBoot.state.player.completedTasks, completedBefore + 1);
      assert.ok(afterBoot.state.player.gold > goldBefore, 'Player gold should increase after CLI demo submit');
      assert.ok(
        afterBoot.state.activityFeed.some((a) => a.type === 'cli'),
        'Server activityFeed should contain CLI heartbeat entries',
      );

      // 5d. --watch --max-ticks 1
      const watchOut = await execFileAsync(
        process.execPath,
        [cliPath, '--watch', '--worker', 'w-pro-01', '--interval', '0.1', '--max-ticks', '1', '--server', baseUrl],
        { env: { ...process.env, NO_COLOR: '1' } },
      );
      assert.match(watchOut.stdout, /watch|常駐|Tick|心跳/i);
      const afterWatch = await (await fetch(`${baseUrl}/api/bootstrap`)).json();
      const proWorker = afterWatch.state.workers.find((w) => w.id === 'w-pro-01');
      assert.ok(proWorker?.lastHeartbeatAt, 'Worker lastHeartbeatAt should be populated by --watch');

      return '--help, --list, --demo, and --watch --max-ticks 1 verified E2E';
    });

    // 6. i18n module integrity (zh-TW / zh-CN / en key parity + HTML data-i18n validation)
    await runCheck('6. public/js/i18n.js trilingual dictionaries (zh-TW/zh-CN/en) & HTML data-i18n keys match', async () => {
      const i18nMod = await import('../public/js/i18n.js');
      assert.ok(Array.isArray(i18nMod.SUPPORTED_LANGS) && i18nMod.SUPPORTED_LANGS.length === 3);
      assert.equal(typeof i18nMod.t, 'function');
      assert.equal(typeof i18nMod.getLang, 'function');
      assert.equal(typeof i18nMod.setLang, 'function');
      assert.equal(typeof i18nMod.applyI18nToDom, 'function');

      const dict = i18nMod.DICTIONARY;
      const baseKeys = Object.keys(dict['zh-TW']).sort();
      assert.ok(baseKeys.length >= 40, `Expected >= 40 i18n keys, found ${baseKeys.length}`);

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

      return `${baseKeys.length} keys × 3 locales verified, ${totalHtmlI18n} HTML data-i18n bindings valid`;
    });

    // 7. Deployment, CI workflow & documentation assets check
    await runCheck('7. Deployment configs, GitHub Actions CI (.github/workflows/ci.yml) & docs verified', async () => {
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

      const ciYaml = await fs.readFile(path.join(ROOT_DIR, '.github', 'workflows', 'ci.yml'), 'utf8');
      assert.match(ciYaml, /node-version:\s*["']?24["']?/);
      assert.match(ciYaml, /npm test/);
      assert.match(ciYaml, /npm run smoke/);

      return `${requiredFiles.length} deployment, CI & documentation files verified`;
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
