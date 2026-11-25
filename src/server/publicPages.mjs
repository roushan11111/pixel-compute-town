// PixelCompute Town — Cyber-Pixel SSR Public Share Pages & Cryptographic Verification Pages
// Zero external npm dependencies · Strict HTML Entity Escaping (XSS-safe)

import { verifyProvenanceChain, GENESIS_HASH } from './provenance.mjs';
import {
  CORE_BUCKET_PCT,
  PERIPHERAL_BUCKET_PCT,
  computeBucketStats,
  ensureProjectBuckets,
  getTaskBucket,
} from './governance.mjs';

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeExternalUrl(raw) {
  const str = String(raw || '').trim();
  if (!str) return '';
  try {
    const u = new URL(str);
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      return u.toString();
    }
  } catch {
    return '';
  }
  return '';
}

function normalizeOrigin(origin) {
  const str = String(origin || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\/[a-z0-9.:-]+$/i.test(str)) {
    return str;
  }
  return 'http://localhost:3456';
}

export function getProjectSlug(project) {
  if (!project || typeof project !== 'object') return '';
  if (typeof project.slug === 'string' && project.slug.trim()) {
    return project.slug.trim();
  }
  return String(project.id || '').trim();
}

function slugifyLoose(str) {
  return String(str || '')
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findProjectBySlugOrId(projects = [], rawSlug = '') {
  const target = String(rawSlug || '').trim();
  if (!target || !Array.isArray(projects)) return null;
  const lower = target.toLowerCase();

  // 1. Exact ID or explicit slug
  const exact = projects.find(
    (p) => p && (p.id === target || p.slug === target || String(p.id || '').toLowerCase() === lower),
  );
  if (exact) return exact;

  // 2. Shorthand without `proj-` prefix (e.g. /p/meta -> proj-meta)
  const withPrefix = projects.find(
    (p) => p && String(p.id || '').toLowerCase() === `proj-${lower}`,
  );
  if (withPrefix) return withPrefix;

  // 3. Slugified shortName or name match
  const targetSlug = slugifyLoose(target);
  if (!targetSlug) return null;
  return projects.find(
    (p) => p && (
      slugifyLoose(p.slug) === targetSlug
      || slugifyLoose(p.shortName) === targetSlug
      || slugifyLoose(p.name) === targetSlug
    ),
  ) || null;
}

function formatUtcTimestamp(iso) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function getStatusMeta(status) {
  if (status === 'launched') {
    return { label: '🚀 已上線分紅中 LAUNCHED', cls: 'status-launched' };
  }
  if (status === 'building') {
    return { label: '🏗️ 算力建設中 BUILDING', cls: 'status-building' };
  }
  return { label: '🗳️ 社群投票中 VOTING', cls: 'status-voting' };
}

const SHARED_CSS = `
  :root {
    --bg: #080c18;
    --bg-grid: rgba(56, 189, 248, 0.06);
    --panel: #10172b;
    --panel-2: #16203b;
    --border: #283a66;
    --border-bright: #38bdf8;
    --text: #eef4ff;
    --muted: #93a6cc;
    --cyan: #38bdf8;
    --gold: #facc15;
    --emerald: #34d399;
    --violet: #a78bfa;
    --pink: #f472b6;
    --danger: #fb7185;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background-color: var(--bg);
    background-image:
      linear-gradient(var(--bg-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--bg-grid) 1px, transparent 1px);
    background-size: 24px 24px;
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
    line-height: 1.6;
    min-height: 100vh;
  }
  a { color: var(--cyan); text-decoration: none; }
  a:hover { text-decoration: underline; }
  code, .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  }
  .topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    background: rgba(8, 12, 24, 0.92);
    backdrop-filter: blur(8px);
    border-bottom: 2px solid var(--border);
  }
  .topbar-inner {
    max-width: 1040px;
    margin: 0 auto;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    font-size: 16px;
    color: var(--text);
    letter-spacing: 0.4px;
  }
  .brand-badge {
    font-size: 11px;
    padding: 2px 8px;
    border: 1px solid var(--cyan);
    color: var(--cyan);
    background: rgba(56, 189, 248, 0.12);
    border-radius: 4px;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 14px;
    border: 2px solid var(--border);
    background: var(--panel-2);
    color: var(--text);
    cursor: pointer;
    transition: transform 0.12s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    text-decoration: none !important;
  }
  .btn:hover {
    transform: translateY(-1px);
    border-color: var(--cyan);
  }
  .btn-primary {
    background: linear-gradient(135deg, #0284c7, #2563eb);
    border-color: #38bdf8;
    color: #fff;
    box-shadow: 0 4px 16px rgba(56, 189, 248, 0.28);
  }
  .btn-emerald {
    background: linear-gradient(135deg, #059669, #10b981);
    border-color: #34d399;
    color: #031b13;
  }
  .btn-gold {
    background: linear-gradient(135deg, #ca8a04, #eab308);
    border-color: #fde047;
    color: #1c1402;
  }
  .btn-sm {
    padding: 6px 12px;
    font-size: 13px;
  }
  .container {
    max-width: 1040px;
    margin: 0 auto;
    padding: 28px 20px 64px;
  }
  .card {
    background: var(--panel);
    border: 2px solid var(--border);
    border-radius: 10px;
    padding: 22px;
    margin-bottom: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  }
  .card-glow-cyan { border-color: rgba(56, 189, 248, 0.55); }
  .card-glow-emerald {
    border-color: rgba(52, 211, 153, 0.7);
    box-shadow: 0 0 28px rgba(52, 211, 153, 0.14);
  }
  .card-glow-danger {
    border-color: rgba(251, 113, 133, 0.75);
    box-shadow: 0 0 28px rgba(251, 113, 133, 0.16);
  }
  .hero-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
  }
  h1 {
    margin: 8px 0 8px;
    font-size: clamp(24px, 4vw, 34px);
    line-height: 1.25;
    color: #fff;
  }
  h2 {
    margin: 0 0 14px;
    font-size: 18px;
    color: var(--cyan);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .tagline {
    margin: 0 0 12px;
    font-size: 16px;
    color: #cbd8f4;
  }
  .desc {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
    white-space: pre-wrap;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid var(--border);
    background: var(--panel-2);
  }
  .status-launched { color: var(--emerald); border-color: rgba(52, 211, 153, 0.6); background: rgba(16, 185, 129, 0.14); }
  .status-building { color: var(--cyan); border-color: rgba(56, 189, 248, 0.6); background: rgba(56, 189, 248, 0.14); }
  .status-voting { color: var(--gold); border-color: rgba(250, 204, 21, 0.6); background: rgba(250, 204, 21, 0.14); }
  .badge-verified {
    color: #052e1e;
    background: linear-gradient(90deg, #34d399, #6ee7b7);
    border: 1px solid #a7f3d0;
    padding: 5px 12px;
    border-radius: 6px;
    font-weight: 800;
    font-size: 12px;
    letter-spacing: 0.5px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .badge-danger {
    color: #fff;
    background: linear-gradient(90deg, #e11d48, #fb7185);
    border: 1px solid #fda4af;
    padding: 6px 14px;
    border-radius: 6px;
    font-weight: 800;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .billboard {
    margin: 14px 0 0;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px dashed var(--pink);
    background: rgba(244, 114, 182, 0.12);
    color: #fbcfe8;
    font-weight: 700;
    font-size: 14px;
  }
  .cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 20px;
  }
  .progress-wrap {
    margin-top: 18px;
  }
  .progress-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .progress-track {
    height: 14px;
    background: #0b1122;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #38bdf8, #34d399);
  }
  .grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 18px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 12px;
  }
  .stat-box {
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 14px;
  }
  .stat-label {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .stat-val {
    font-size: 20px;
    font-weight: 800;
    color: #fff;
  }
  .hash-box {
    background: #070b15;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 13px;
    color: var(--emerald);
    word-break: break-all;
    margin-top: 6px;
  }
  .split-bar {
    display: flex;
    height: 16px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--border);
    margin: 12px 0;
  }
  .split-spark { background: var(--gold); }
  .split-merit { background: var(--emerald); }
  .split-platform { background: var(--violet); }
  .split-core { background: #f97316; }
  .split-periph { background: #38bdf8; }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 13px;
    color: #d6e2ff;
  }
  .dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin-right: 6px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  th, td {
    text-align: left;
    padding: 10px 10px;
    border-bottom: 1px solid rgba(40, 58, 102, 0.6);
  }
  th {
    color: var(--muted);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .task-item {
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .task-title {
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
  }
  .task-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    color: var(--muted);
  }
  .tag-core { color: #fdba74; border-color: rgba(249, 115, 22, 0.55); background: rgba(249, 115, 22, 0.14); }
  .tag-periph { color: #7dd3fc; border-color: rgba(56, 189, 248, 0.55); background: rgba(56, 189, 248, 0.14); }
  .tag-bounty { color: #fde047; border-color: rgba(250, 204, 21, 0.6); background: rgba(250, 204, 21, 0.15); }
  .stamp-banner {
    padding: 18px 20px;
    border-radius: 10px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }
  .stamp-valid {
    background: linear-gradient(135deg, rgba(6, 78, 59, 0.85), rgba(16, 185, 129, 0.22));
    border: 2px solid var(--emerald);
  }
  .stamp-invalid {
    background: linear-gradient(135deg, rgba(136, 19, 55, 0.85), rgba(251, 113, 133, 0.2));
    border: 2px solid var(--danger);
  }
  .stamp-title {
    font-size: clamp(16px, 3vw, 22px);
    font-weight: 900;
    letter-spacing: 0.6px;
    color: #fff;
  }
  .kv-list {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 10px 16px;
    font-size: 14px;
  }
  @media (max-width: 640px) {
    .kv-list { grid-template-columns: 1fr; gap: 4px; }
  }
  .kv-key { color: var(--muted); font-weight: 600; }
  .kv-val { color: #fff; word-break: break-word; }
  footer {
    text-align: center;
    color: var(--muted);
    font-size: 12px;
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid rgba(40, 58, 102, 0.5);
  }
`;

function renderLayout({ title, description, canonicalUrl, ogType = 'website', bodyHtml }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeUrl = escapeHtml(canonicalUrl);

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <meta property="og:type" content="${escapeHtml(ogType)}" />
  <meta property="og:site_name" content="PixelCompute Town 像素算力鎮" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <style>${SHARED_CSS}</style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="/">
        <span>🏮 PixelCompute Town 像素算力鎮</span>
        <span class="brand-badge">Proof of First Spark</span>
      </a>
      <nav class="nav-links">
        <a class="btn btn-sm" href="/">🏠 官方首頁</a>
        <a class="btn btn-sm" href="/docs">📖 說明書</a>
        <a class="btn btn-sm" href="/whitepaper">📜 白皮書</a>
        <a class="btn btn-sm btn-primary" href="/app">🎮 進入像素小鎮</a>
      </nav>
    </div>
  </header>
  <main class="container">
    ${bodyHtml}
    <footer>
      PixelCompute Town · 5% 首發創意版稅 / 85% 實幹池 (70% 核心 · ≤30% 週邊防稀釋) / 10% 平臺 · SHA-256 不可竄改創意溯源鏈
    </footer>
  </main>
  <script>
    (function () {
      var btns = document.querySelectorAll('[data-copy-text]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (ev) {
          var btn = ev.currentTarget;
          var text = btn.getAttribute('data-copy-text') || window.location.href;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              var orig = btn.textContent;
              btn.textContent = '✅ 已複製連結';
              setTimeout(function () { btn.textContent = orig; }, 1800);
            });
          }
        });
      }
    })();
  </script>
</body>
</html>`;
}

export function renderPublicProjectPage(project, state, origin = 'http://localhost:3456') {
  ensureProjectBuckets(project);
  const safeOrigin = normalizeOrigin(origin);
  const slug = getProjectSlug(project);
  const canonicalUrl = `${safeOrigin}/p/${encodeURIComponent(slug)}`;
  const appJoinUrl = `/app?project=${encodeURIComponent(project.id)}`;
  const verifyUrl = `/verify/${encodeURIComponent(project.ideaHash || '')}`;

  const chain = verifyProvenanceChain(state?.projects || []);
  const provRecord = chain.records.find((r) => r.projectId === project.id) || null;
  const isVerified = Boolean(provRecord && provRecord.verified);

  const bucketStats = computeBucketStats(project);
  const coreCap = bucketStats.coreCapPct || CORE_BUCKET_PCT;
  const periphCap = bucketStats.peripheralCapPct || PERIPHERAL_BUCKET_PCT;

  const sparkPct = Number.isFinite(Number(project.sparkRoyaltyPct)) ? Number(project.sparkRoyaltyPct) : 5;
  const meritPct = Number.isFinite(Number(project.meritPoolPct)) ? Number(project.meritPoolPct) : 85;
  const platformPct = Number.isFinite(Number(project.platformSharePct)) ? Number(project.platformSharePct) : 10;

  const statusMeta = getStatusMeta(project.status);
  const progressPct = Math.max(0, Math.min(100, Math.round(Number(project.progressPct) || 0)));
  const originatorName = project.originatorName || project.creatorName || '創始鎮民';
  const originatedAtUtc = formatUtcTimestamp(project.originatedAt || project.createdAt);
  const coBuildersCount = Array.isArray(project.coBuilders) ? project.coBuilders.length : 1;

  // Build merit contributors leaderboard
  const userIds = new Set([
    ...Object.keys(project.contributions || {}),
    ...Object.keys(project.bucketPoints?.core || {}),
    ...Object.keys(project.bucketPoints?.peripheral || {}),
  ]);
  const contributors = [...userIds]
    .map((uid) => {
      const corePts = Number(project.bucketPoints?.core?.[uid] || 0);
      const periphPts = Number(project.bucketPoints?.peripheral?.[uid] || 0);
      const totalPts = corePts + periphPts || Number(project.contributions?.[uid] || 0);
      const name = project.contributorNames?.[uid]
        || state?.users?.[uid]?.displayName
        || uid;
      return { uid, name, corePts, periphPts, totalPts };
    })
    .filter((c) => c.totalPts > 0)
    .sort((a, b) => (b.corePts !== a.corePts ? b.corePts - a.corePts : b.totalPts - a.totalPts));

  const projectTasks = (state?.tasks || []).filter((t) => t && t.projectId === project.id);
  const openTasks = projectTasks.filter((t) => t.status === 'open');
  const completedCount = projectTasks.filter((t) => t.status === 'completed').length;

  const repoHref = safeExternalUrl(project.repoUrl);
  const hashPrefix = (project.ideaHash || '').slice(0, 12);

  const pageTitle = `${project.name} (${progressPct}%) — PixelCompute Town 公開共建項目`;
  const pageDesc = `${project.tagline || ''}｜首發：${originatorName}｜指紋 #${hashPrefix}｜${sparkPct}% 首發版稅 / ${meritPct}% 實幹池 (${coreCap}% 核心 · ≤${periphCap}% 週邊) / ${platformPct}% 平臺｜開放任務 ${openTasks.length} 張`;

  const contributorsHtml = contributors.length > 0
    ? `<table>
        <thead>
          <tr>
            <th>#</th>
            <th>實幹貢獻者</th>
            <th>🔥 核心點 (${coreCap}%)</th>
            <th>⚙️ 週邊點 (≤${periphCap}%)</th>
            <th>總計</th>
          </tr>
        </thead>
        <tbody>
          ${contributors.map((c, idx) => `
            <tr>
              <td class="mono">#${idx + 1}</td>
              <td><strong>${escapeHtml(c.name)}</strong>${c.uid === (project.originatorId || project.creatorId) ? ' <span class="pill" style="font-size:11px;padding:1px 6px;color:#facc15;border-color:rgba(250,204,21,0.5);">⚡ 首發</span>' : ''}</td>
              <td class="mono" style="color:#fdba74;font-weight:700;">${c.corePts}</td>
              <td class="mono" style="color:#7dd3fc;">${c.periphPts}</td>
              <td class="mono" style="color:#34d399;font-weight:800;">${c.totalPts} pts</td>
            </tr>`).join('')}
        </tbody>
      </table>`
    : `<p class="desc">目前尚無實幹貢獻紀錄 — 成為第一位領取任務並拿下實幹池份額的開拓者！</p>`;

  const openTasksHtml = openTasks.length > 0
    ? openTasks.map((t) => {
      const bucket = getTaskBucket(t);
      const isCore = bucket === 'core';
      const bountyUsd = Number(t.cashBountyUsd || 0);
      return `
        <div class="task-item">
          <div>
            <div class="task-title">${escapeHtml(t.title)}</div>
            <div class="task-meta">
              <span class="pill ${isCore ? 'tag-core' : 'tag-periph'}">${isCore ? `🔥 核心池 ${coreCap}%` : `⚙️ 週邊池 ≤${periphCap}%`}</span>
              <span>軌道：${t.track === 'guild_bounty' ? '⚔️ 懸賞工會 (CLI)' : '🏭 自動工坊 (API)'}</span>
              <span>+${Number(t.contributionPoints || 0)} 貢獻點</span>
              <span>+${Number(t.goldReward || 0)}G</span>
              ${Number(t.stakeGold || 0) > 0 ? `<span>🔒 押金 ${Number(t.stakeGold)}G</span>` : ''}
              ${bountyUsd > 0 ? `<span class="pill tag-bounty">💵 $${escapeHtml(bountyUsd)} 現金懸賞</span>` : ''}
            </div>
          </div>
          <a class="btn btn-sm btn-primary" href="${escapeHtml(appJoinUrl)}">派小人領單 →</a>
        </div>`;
    }).join('')
    : `<p class="desc">目前此項目暫無開放任務（已完成 ${completedCount} 張任務）。歡迎進入小鎮使用 AI 智慧拆單或投票推進！</p>`;

  const bodyHtml = `
    <section class="card card-glow-cyan">
      <div class="hero-header">
        <div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <span class="pill ${statusMeta.cls}">${statusMeta.label}</span>
            ${isVerified
              ? `<span class="badge-verified">✅ 鏈上公證已驗證 · Block #${Number(provRecord.provenanceIndex)}</span>`
              : `<span class="badge-danger">⚠️ 溯源鏈待核驗</span>`}
          </div>
          <h1>${escapeHtml(project.name)}</h1>
          <p class="tagline">${escapeHtml(project.tagline || '')}</p>
        </div>
        <button type="button" class="btn btn-sm" data-copy-text="${escapeHtml(canonicalUrl)}">🔗 複製分享頁連結</button>
      </div>

      <p class="desc">${escapeHtml(project.description || '')}</p>
      ${repoHref ? `<p style="margin:12px 0 0;font-size:13px;">GitHub 倉庫：<a href="${escapeHtml(repoHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(repoHref)}</a></p>` : ''}
      ${project.sponsoredBillboard && project.billboardText
        ? `<div class="billboard">📺 廣場霓虹公告：${escapeHtml(project.billboardText)}</div>`
        : ''}

      <div class="progress-wrap">
        <div class="progress-meta">
          <span>項目建設進度</span>
          <strong class="mono">${progressPct}%（開放任務 ${openTasks.length} · 已完成 ${completedCount} · 共建者 ${coBuildersCount} 人）</strong>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${progressPct}%;"></div>
        </div>
      </div>

      <div class="grid-3" style="margin-top:16px;">
        <div class="stat-box">
          <div class="stat-label">累積分紅營收</div>
          <div class="stat-val mono" style="color:var(--emerald);">$${Number(project.totalRevenueUsd || 0).toFixed(2)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">懸賞獎池</div>
          <div class="stat-val mono" style="color:var(--gold);">$${Number(project.bountyPoolUsd || 0).toFixed(2)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">社群支持票數</div>
          <div class="stat-val mono" style="color:var(--cyan);">${Number(project.votes || 0)} / ${Number(project.votesRequired || 10)}</div>
        </div>
      </div>

      <div class="cta-row">
        <a class="btn btn-primary" href="${escapeHtml(appJoinUrl)}">🚀 加入共建 / 派算力小人打工</a>
        <a class="btn btn-emerald" href="${escapeHtml(verifyUrl)}">🔍 查驗完整溯源證書</a>
      </div>
    </section>

    <section class="card card-glow-emerald">
      <h2>🔐 Proof of First Spark · 原創首發密碼學公證</h2>
      <div class="kv-list">
        <div class="kv-key">創意首發者</div>
        <div class="kv-val"><strong>${escapeHtml(originatorName)}</strong> <span class="mono" style="color:var(--muted);">(${escapeHtml(project.originatorId || project.creatorId || '')})</span></div>
        <div class="kv-key">首發時間戳 (UTC)</div>
        <div class="kv-val mono">${escapeHtml(originatedAtUtc)}</div>
        <div class="kv-key">區塊編號 / 鏈狀態</div>
        <div class="kv-val mono">Block #${Number(project.provenanceIndex ?? 0)} · ${isVerified ? '✅ VERIFIED ON PIXELCOMPUTE PROVENANCE CHAIN' : '⚠️ UNVERIFIED'}</div>
      </div>
      <div style="margin-top:12px;">
        <div class="kv-key" style="font-size:12px;">完整 SHA-256 原創指紋</div>
        <div class="hash-box mono">${escapeHtml(project.ideaHash || 'N/A')}</div>
      </div>
    </section>

    <div class="grid-2">
      <section class="card">
        <h2>💸 5% / 85% / 10% 透明收益分配協議</h2>
        <div class="split-bar" aria-label="Revenue Split">
          <div class="split-spark" style="width:${sparkPct}%;" title="首發版稅 ${sparkPct}%"></div>
          <div class="split-merit" style="width:${meritPct}%;" title="實幹池 ${meritPct}%"></div>
          <div class="split-platform" style="width:${platformPct}%;" title="平臺 ${platformPct}%"></div>
        </div>
        <div class="legend">
          <span><i class="dot split-spark"></i><strong>${sparkPct}% 首發版稅</strong>（永久歸屬原創發起人）</span>
          <span><i class="dot split-merit"></i><strong>${meritPct}% 實幹池</strong>（按驗收貢獻點自動結算）</span>
          <span><i class="dot split-platform"></i><strong>${platformPct}% 平臺</strong>（伺服器與開源託管）</span>
        </div>
      </section>

      <section class="card">
        <h2>🛡️ 70% 核心 / ≤30% 週邊防稀釋配額條</h2>
        <div class="split-bar" aria-label="Anti-Dilution Quota">
          <div class="split-core" style="width:${coreCap}%;" title="核心實幹池 ${coreCap}%"></div>
          <div class="split-periph" style="width:${periphCap}%;" title="週邊微任務池 ≤${periphCap}%"></div>
        </div>
        <div class="legend">
          <span><i class="dot split-core"></i><strong>核心實幹池 ${coreCap}%</strong>：已累積 <code class="mono">${bucketStats.coreTotalPoints}</code> pts</span>
          <span><i class="dot split-periph"></i><strong>週邊微任務池 ≤${periphCap}%</strong>：已累積 <code class="mono">${bucketStats.peripheralTotalPoints}</code> pts</span>
        </div>
        <p class="desc" style="margin-top:10px;font-size:12px;">
          無論週邊翻譯／測試刷出多少點數，最多僅分配實幹池的 ${periphCap}%，數學保證核心 PR 實幹者永不被 AI 垃圾注水稀釋！
        </p>
      </section>
    </div>

    <section class="card">
      <h2>🏆 實幹貢獻榜（Merit Contributors）</h2>
      ${contributorsHtml}
    </section>

    <section class="card">
      <h2>📋 目前開放任務列表（${openTasks.length} 張待領取）</h2>
      ${openTasksHtml}
    </section>
  `;

  return renderLayout({
    title: pageTitle,
    description: pageDesc,
    canonicalUrl,
    bodyHtml,
  });
}

export function renderPublicVerifyPage(verifyResult, origin = 'http://localhost:3456') {
  const safeOrigin = normalizeOrigin(origin);
  const queriedHash = String(verifyResult?.queriedHash || verifyResult?.record?.ideaHash || '').trim();
  const canonicalUrl = `${safeOrigin}/verify/${encodeURIComponent(queriedHash)}`;
  const verified = Boolean(verifyResult?.verified && verifyResult?.record);
  const record = verifyResult?.record || null;
  const project = verifyResult?.project || null;
  const chainValid = Boolean(verifyResult?.chainValid);
  const chainLength = Number(verifyResult?.chainLength || 0);

  if (!verified) {
    const reason = verifyResult?.error || '查無對應此指紋的原創創意公證紀錄，或該區塊雜湊鏈驗證失敗。';
    const bodyHtml = `
      <div class="stamp-banner stamp-invalid">
        <div>
          <div class="stamp-title">❌ 未找到或雜湊鏈不符</div>
          <div style="font-size:13px;color:#fecdd3;margin-top:4px;">VERIFICATION FAILED — RECORD NOT FOUND OR PROVENANCE HASH MISMATCH</div>
        </div>
        <span class="badge-danger">HTTP 404 · UNVERIFIED</span>
      </div>

      <section class="card card-glow-danger">
        <h2>🔍 密碼學驗真結果</h2>
        <p class="tagline">${escapeHtml(reason)}</p>
        <div class="kv-list" style="margin-top:14px;">
          <div class="kv-key">查詢指紋</div>
          <div class="kv-val mono">${escapeHtml(queriedHash || '(空白)')}</div>
          <div class="kv-key">全鏈長度</div>
          <div class="kv-val mono">${chainLength} 個已公證創意區塊</div>
          <div class="kv-key">全鏈完整性</div>
          <div class="kv-val mono">${chainValid ? '✅ 全鏈完整（此指紋不在鏈上）' : '⚠️ 偵測到鏈異常'}</div>
        </div>
        <div class="cta-row">
          <a class="btn btn-primary" href="/app">🎮 前往像素算力鎮查看合法項目</a>
          <a class="btn" href="/">🏠 返回官方首頁</a>
        </div>
      </section>
    `;

    return renderLayout({
      title: `驗證失敗 ❌ 未找到或雜湊鏈不符 — PixelCompute Town`,
      description: `SHA-256 指紋 ${queriedHash.slice(0, 16)} 未通過 PixelCompute Town 原創創意溯源鏈驗證。`,
      canonicalUrl,
      bodyHtml,
    });
  }

  const projectSlug = project ? getProjectSlug(project) : record.projectId;
  const projectUrl = `/p/${encodeURIComponent(projectSlug)}`;
  const appJoinUrl = `/app?project=${encodeURIComponent(record.projectId)}`;
  const originatedAtUtc = formatUtcTimestamp(record.originatedAt);
  const isGenesis = record.prevIdeaHash === GENESIS_HASH;

  const pageTitle = `✅ 已驗證原創證書：${record.name} — PixelCompute Town`;
  const pageDesc = `VERIFIED ON PIXELCOMPUTE PROVENANCE CHAIN｜首發者：${record.originatorName}｜UTC：${originatedAtUtc}｜Block #${record.provenanceIndex}｜SHA-256：${record.ideaHash}`;

  const bodyHtml = `
    <div class="stamp-banner stamp-valid">
      <div>
        <div class="stamp-title">✅ VERIFIED ON PIXELCOMPUTE PROVENANCE CHAIN</div>
        <div style="font-size:13px;color:#a7f3d0;margin-top:4px;">密碼學原創首發公證驗真通過 · SHA-256 哈希鏈完整不可竄改</div>
      </div>
      <button type="button" class="btn btn-sm btn-emerald" data-copy-text="${escapeHtml(canonicalUrl)}">🔗 複製驗真證書連結</button>
    </div>

    <section class="card card-glow-emerald">
      <h2>📜 原創創意溯源證書（Proof of First Spark）</h2>
      <h1 style="margin-top:4px;">${escapeHtml(record.name)}</h1>
      ${project?.tagline ? `<p class="tagline">${escapeHtml(project.tagline)}</p>` : ''}

      <div class="kv-list" style="margin-top:18px;">
        <div class="kv-key">驗證狀態</div>
        <div class="kv-val"><span class="badge-verified">✅ VERIFIED · 簽章與哈希一致</span></div>

        <div class="kv-key">首發創意人</div>
        <div class="kv-val"><strong>${escapeHtml(record.originatorName)}</strong> <span class="mono" style="color:var(--muted);">(${escapeHtml(record.originatorId)})</span></div>

        <div class="kv-key">精確 UTC 時間戳</div>
        <div class="kv-val mono">${escapeHtml(originatedAtUtc)}</div>

        <div class="kv-key">區塊編號</div>
        <div class="kv-val mono"><strong>Block #${Number(record.provenanceIndex)}</strong>（共 ${chainLength} 個區塊）</div>

        <div class="kv-key">全鏈完整性狀態</div>
        <div class="kv-val mono" style="color:${chainValid ? 'var(--emerald)' : 'var(--gold)'};">
          ${chainValid ? `✅ FULL CHAIN VALID (${chainLength}/${chainLength} 區塊連續驗真)` : '⚠️ 單一區塊已驗真，但全鏈存在待排查區塊'}
        </div>

        <div class="kv-key">收益保障協議</div>
        <div class="kv-val">5% 首發創意永久版稅 · 85% 實幹池 (70% 核心 / ≤30% 週邊) · 10% 平臺</div>
      </div>

      <div style="margin-top:18px;">
        <div class="kv-key" style="font-size:12px;">完整 64 碼 SHA-256 創意指紋 (ideaHash)</div>
        <div class="hash-box mono">${escapeHtml(record.ideaHash)}</div>
      </div>

      <div style="margin-top:14px;">
        <div class="kv-key" style="font-size:12px;">前序區塊指紋 (prevIdeaHash)${isGenesis ? ' · GENESIS BLOCK' : ''}</div>
        <div class="hash-box mono" style="color:var(--cyan);">${escapeHtml(record.prevIdeaHash || GENESIS_HASH)}</div>
      </div>

      <div class="cta-row">
        <a class="btn btn-primary" href="${escapeHtml(projectUrl)}">📄 查看公開項目分享頁 (/p/${escapeHtml(projectSlug)})</a>
        <a class="btn btn-gold" href="${escapeHtml(appJoinUrl)}">🚀 進入小鎮加入共建</a>
        <a class="btn" href="/">🏠 返回官方首頁</a>
      </div>
    </section>
  `;

  return renderLayout({
    title: pageTitle,
    description: pageDesc,
    canonicalUrl,
    bodyHtml,
  });
}

export function renderPublicNotFoundPage(title = '找不到頁面', message = '你存取的公開項目不存在或已被移除。', origin = 'http://localhost:3456') {
  const safeOrigin = normalizeOrigin(origin);
  const bodyHtml = `
    <section class="card card-glow-danger" style="text-align:center;padding:38px 24px;">
      <div style="font-size:46px;margin-bottom:8px;">👾 404</div>
      <h1>${escapeHtml(title)}</h1>
      <p class="tagline">${escapeHtml(message)}</p>
      <div class="cta-row" style="justify-content:center;">
        <a class="btn btn-primary" href="/app">🎮 進入像素算力鎮</a>
        <a class="btn" href="/">🏠 返回官方首頁</a>
      </div>
    </section>
  `;

  return renderLayout({
    title: `${title} — PixelCompute Town`,
    description: message,
    canonicalUrl: `${safeOrigin}/`,
    bodyHtml,
  });
}

// ============================================================================
// Cyber-Pixel Zero-Dependency Markdown -> HTML Reader (Docs & Whitepaper)
// Strict HTML Entity Escaping (XSS-Safe) + Auto TOC + Print/PDF Styles
// ============================================================================

function safeDocHref(rawUrl) {
  const cleaned = String(rawUrl || '').trim();
  if (!cleaned) return '';
  if (cleaned.startsWith('/') || cleaned.startsWith('#') || cleaned.startsWith('./') || cleaned.startsWith('../')) {
    return cleaned;
  }
  try {
    const u = new URL(cleaned);
    if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:') {
      return u.toString();
    }
  } catch {
    return '';
  }
  return '';
}

function makeHeadingId(rawText, usedIds) {
  const plain = String(rawText || '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
  let base = slugifyLoose(plain);
  if (!base) base = 'section';
  let id = `sec-${base}`;
  let n = 2;
  while (usedIds.has(id)) {
    id = `sec-${base}-${n}`;
    n += 1;
  }
  usedIds.add(id);
  return { id, plain };
}

function renderInlineMarkdown(rawLine) {
  const codeTokens = [];
  // Extract inline code first so markdown chars inside backticks are preserved verbatim & escaped
  let text = String(rawLine || '').replace(/`([^`\n]+)`/g, (_, code) => {
    const idx = codeTokens.length;
    codeTokens.push(`<code class="doc-inline-code">${escapeHtml(code)}</code>`);
    return `\u0000CODE${idx}\u0000`;
  });

  // Escape all raw HTML strictly before applying safe inline formatting
  text = escapeHtml(text);

  // Markdown links: [label](url)
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+(?:\s+&quot;[^&]*&quot;)?)\)/g, (_, label, rawHrefPart) => {
    const rawHref = rawHrefPart.split(/\s+/)[0]
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    const safeHref = safeDocHref(rawHref);
    if (!safeHref) return label;
    const isExternal = /^https?:\/\//i.test(safeHref);
    const extra = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(safeHref)}"${extra}>${label}</a>`;
  });

  // Bold + italic
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // Strikethrough
  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  // Italic (avoid matching snake_case identifiers)
  text = text.replace(/(^|[\s(「『（])\*([^*\n]+)\*(?=$|[\s.,;:!?」』）)])/g, '$1<em>$2</em>');

  // Restore inline code tokens
  text = text.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => codeTokens[Number(i)] || '');
  return text;
}

function splitTableCells(line) {
  let trimmed = String(line || '').trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  const cells = [];
  let cur = '';
  let inCode = false;
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (ch === '\\' && i + 1 < trimmed.length && trimmed[i + 1] === '|') {
      cur += '|';
      i += 1;
      continue;
    }
    if (ch === '`') {
      inCode = !inCode;
      cur += ch;
      continue;
    }
    if (ch === '|' && !inCode) {
      cells.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function isTableSeparatorLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.includes('|') && !trimmed.includes('-')) return false;
  const cells = splitTableCells(trimmed);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function getTableAlignments(sepLine) {
  return splitTableCells(sepLine).map((c) => {
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });
}

export function renderMarkdownToHtml(markdown = '', options = {}) {
  const copyCodeLabel = escapeHtml(options?.copyCodeLabel || '📋 複製');
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  const htmlParts = [];
  const toc = [];
  const usedIds = new Set();

  let i = 0;
  const len = lines.length;

  while (i < len) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code block: ```lang
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})\s*([A-Za-z0-9_+.-]*)\s*$/);
    if (fenceMatch) {
      const fenceChar = fenceMatch[1][0];
      const fenceLen = fenceMatch[1].length;
      const lang = fenceMatch[2] || '';
      const codeLines = [];
      i += 1;
      while (i < len) {
        const curTrim = lines[i].trim();
        if (curTrim.startsWith(fenceChar.repeat(fenceLen)) && curTrim.replaceAll(fenceChar, '').trim() === '') {
          i += 1;
          break;
        }
        codeLines.push(lines[i]);
        i += 1;
      }
      const escapedCode = escapeHtml(codeLines.join('\n'));
      const langBadge = lang ? `<span class="doc-code-lang">${escapeHtml(lang)}</span>` : '<span class="doc-code-lang">CODE</span>';
      htmlParts.push(
        `<div class="doc-code-block"><div class="doc-code-head">${langBadge}<button type="button" class="doc-code-copy" data-copy-code="1">${copyCodeLabel}</button></div><pre><code>${escapedCode}</code></pre></div>`,
      );
      continue;
    }

    // ATX Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+?)\s*#*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const rawHeading = headingMatch[2].trim();
      const { id, plain } = makeHeadingId(rawHeading, usedIds);
      if (level <= 3) {
        toc.push({ level, id, text: plain });
      }
      htmlParts.push(
        `<h${level} id="${escapeHtml(id)}" class="doc-h${level}"><a class="doc-anchor" href="#${escapeHtml(id)}" aria-label="Section link">#</a>${renderInlineMarkdown(rawHeading)}</h${level}>`,
      );
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^(?:[-*_]\s*){3,}$/.test(trimmed)) {
      htmlParts.push('<hr class="doc-hr" />');
      i += 1;
      continue;
    }

    // Blockquote / Callout
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < len && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      let variant = 'note';
      let calloutLabel = '';
      if (quoteLines.length > 0) {
        const alertMatch = quoteLines[0].match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
        if (alertMatch) {
          variant = alertMatch[1].toLowerCase();
          calloutLabel = alertMatch[1].toUpperCase();
          quoteLines[0] = alertMatch[2] || '';
          if (!quoteLines[0]) quoteLines.shift();
        } else if (/^(?:⚠️|🚨|❌)/.test(quoteLines[0])) {
          variant = 'warning';
        } else if (/^(?:💡|✨|🚀|✅)/.test(quoteLines[0])) {
          variant = 'tip';
        } else if (/^(?:🔐|🛡️|🔒|📜)/.test(quoteLines[0])) {
          variant = 'important';
        }
      }
      const innerHtml = quoteLines
        .map((ql) => (ql.trim() ? `<p>${renderInlineMarkdown(ql)}</p>` : ''))
        .join('');
      const badgeHtml = calloutLabel ? `<div class="doc-callout-label">${escapeHtml(calloutLabel)}</div>` : '';
      htmlParts.push(`<blockquote class="doc-callout doc-callout-${escapeHtml(variant)}">${badgeHtml}${innerHtml}</blockquote>`);
      continue;
    }

    // Markdown Table
    if (trimmed.includes('|') && i + 1 < len && isTableSeparatorLine(lines[i + 1])) {
      const headerCells = splitTableCells(trimmed);
      const alignments = getTableAlignments(lines[i + 1]);
      const bodyRows = [];
      i += 2;
      while (i < len) {
        const rowLine = lines[i].trim();
        if (!rowLine || !rowLine.includes('|')) break;
        bodyRows.push(splitTableCells(rowLine));
        i += 1;
      }
      const theadHtml = headerCells
        .map((cell, idx) => `<th style="text-align:${alignments[idx] || 'left'};">${renderInlineMarkdown(cell)}</th>`)
        .join('');
      const tbodyHtml = bodyRows
        .map((row) => {
          const cols = headerCells.map((_, idx) => {
            const val = row[idx] !== undefined ? row[idx] : '';
            return `<td style="text-align:${alignments[idx] || 'left'};">${renderInlineMarkdown(val)}</td>`;
          }).join('');
          return `<tr>${cols}</tr>`;
        })
        .join('');
      htmlParts.push(
        `<div class="doc-table-wrap"><table class="doc-table"><thead><tr>${theadHtml}</tr></thead><tbody>${tbodyHtml}</tbody></table></div>`,
      );
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const items = [];
      while (i < len) {
        const cur = lines[i];
        const m = cur.match(/^(\s*)[-*+]\s+(.*)$/);
        if (!m) break;
        const indent = m[1].length;
        const itemLines = [m[2]];
        i += 1;
        while (i < len && /^\s{2,}[^\s-*+]/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) {
          itemLines.push(lines[i].trim());
          i += 1;
        }
        const subCls = indent >= 2 ? ' class="doc-li-nested"' : '';
        items.push(`<li${subCls}>${renderInlineMarkdown(itemLines.join(' '))}</li>`);
      }
      htmlParts.push(`<ul class="doc-list">${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < len) {
        const cur = lines[i];
        const m = cur.match(/^(\s*)\d+\.\s+(.*)$/);
        if (!m) break;
        const indent = m[1].length;
        const itemLines = [m[2]];
        i += 1;
        while (i < len && /^\s{2,}[^\s]/.test(lines[i]) && !/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])) {
          itemLines.push(lines[i].trim());
          i += 1;
        }
        const subCls = indent >= 2 ? ' class="doc-li-nested"' : '';
        items.push(`<li${subCls}>${renderInlineMarkdown(itemLines.join(' '))}</li>`);
      }
      htmlParts.push(`<ol class="doc-list doc-ol">${items.join('')}</ol>`);
      continue;
    }

    // Regular paragraph
    const paraLines = [];
    while (i < len) {
      const cur = lines[i];
      const curTrim = cur.trim();
      if (
        !curTrim
        || /^#{1,4}\s+/.test(curTrim)
        || /^(`{3,}|~{3,})/.test(curTrim)
        || curTrim.startsWith('>')
        || /^(?:[-*_]\s*){3,}$/.test(curTrim)
        || /^[-*+]\s+/.test(curTrim)
        || /^\d+\.\s+/.test(curTrim)
        || (curTrim.includes('|') && i + 1 < len && isTableSeparatorLine(lines[i + 1]))
      ) {
        break;
      }
      paraLines.push(curTrim);
      i += 1;
    }
    if (paraLines.length > 0) {
      htmlParts.push(`<p class="doc-p">${renderInlineMarkdown(paraLines.join(' '))}</p>`);
    } else {
      i += 1;
    }
  }

  return {
    html: htmlParts.join('\n'),
    toc,
  };
}

const DOC_READER_CSS = `
  .doc-nav-active {
    border-color: var(--cyan) !important;
    background: rgba(56, 189, 248, 0.2) !important;
    color: #fff !important;
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
  }
  .doc-shell {
    max-width: 1240px;
    margin: 0 auto;
    padding: 24px 20px 64px;
    display: grid;
    grid-template-columns: 270px minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }
  .doc-toc-sidebar {
    position: sticky;
    top: 74px;
    max-height: calc(100vh - 96px);
    overflow-y: auto;
    background: var(--panel);
    border: 2px solid var(--border);
    border-radius: 10px;
    padding: 16px 14px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  }
  .doc-toc-title {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--cyan);
    padding-bottom: 10px;
    margin-bottom: 10px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .doc-toc-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .doc-toc-item a {
    display: block;
    padding: 5px 8px;
    border-radius: 5px;
    font-size: 13px;
    line-height: 1.38;
    color: var(--muted);
    border-left: 2px solid transparent;
    transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
    text-decoration: none;
  }
  .doc-toc-item a:hover,
  .doc-toc-item a.active {
    color: #fff;
    background: rgba(56, 189, 248, 0.12);
    border-left-color: var(--cyan);
  }
  .doc-toc-lvl-1 a {
    font-weight: 800;
    color: #e2ecff;
  }
  .doc-toc-lvl-2 a {
    font-weight: 700;
    color: #c7d6f5;
    padding-left: 10px;
  }
  .doc-toc-lvl-3 a {
    font-size: 12px;
    padding-left: 22px;
  }
  .doc-main-col {
    min-width: 0;
  }
  .doc-hero {
    background: linear-gradient(135deg, rgba(16, 23, 43, 0.96), rgba(24, 34, 68, 0.92));
    border: 2px solid rgba(56, 189, 248, 0.55);
    border-radius: 12px;
    padding: 24px 26px;
    margin-bottom: 20px;
    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.38);
  }
  .doc-hero-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }
  .doc-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.6px;
    color: var(--gold);
    border: 1px solid rgba(250, 204, 21, 0.55);
    background: rgba(250, 204, 21, 0.12);
  }
  .doc-hero-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .doc-meta-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 12px;
    font-size: 12px;
    color: var(--muted);
  }
  .doc-article {
    background: var(--panel);
    border: 2px solid var(--border);
    border-radius: 12px;
    padding: 28px 32px 36px;
    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.35);
    overflow-wrap: break-word;
  }
  .doc-h1 {
    font-size: clamp(24px, 3.2vw, 30px);
    color: #fff;
    margin: 0 0 18px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--border);
    scroll-margin-top: 84px;
  }
  .doc-h2 {
    font-size: 21px;
    color: var(--cyan);
    margin: 34px 0 14px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(56, 189, 248, 0.3);
    scroll-margin-top: 84px;
    display: block;
  }
  .doc-h3 {
    font-size: 17px;
    color: var(--gold);
    margin: 24px 0 10px;
    scroll-margin-top: 84px;
  }
  .doc-h4 {
    font-size: 15px;
    color: var(--emerald);
    margin: 18px 0 8px;
    scroll-margin-top: 84px;
  }
  .doc-anchor {
    color: rgba(147, 166, 204, 0.45);
    margin-right: 8px;
    font-weight: 700;
    text-decoration: none !important;
  }
  .doc-h1:hover .doc-anchor,
  .doc-h2:hover .doc-anchor,
  .doc-h3:hover .doc-anchor,
  .doc-h4:hover .doc-anchor {
    color: var(--cyan);
  }
  .doc-p {
    margin: 0 0 14px;
    color: #dbe6ff;
    font-size: 15px;
    line-height: 1.78;
  }
  .doc-list {
    margin: 0 0 16px;
    padding-left: 22px;
    color: #dbe6ff;
    font-size: 15px;
    line-height: 1.75;
  }
  .doc-list li {
    margin-bottom: 6px;
  }
  .doc-li-nested {
    margin-left: 18px;
    list-style-type: circle;
  }
  .doc-inline-code {
    background: rgba(56, 189, 248, 0.12);
    color: #7dd3fc;
    border: 1px solid rgba(56, 189, 248, 0.28);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.88em;
  }
  .doc-code-block {
    margin: 16px 0 20px;
    background: #070b15;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  .doc-code-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: rgba(22, 32, 59, 0.9);
    border-bottom: 1px solid var(--border);
  }
  .doc-code-lang {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--cyan);
  }
  .doc-code-copy {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: var(--panel);
    color: var(--text);
    cursor: pointer;
  }
  .doc-code-copy:hover {
    border-color: var(--cyan);
    color: #fff;
  }
  .doc-code-block pre {
    margin: 0;
    padding: 14px 16px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.6;
    color: #c5f7ff;
  }
  .doc-callout {
    margin: 16px 0 18px;
    padding: 14px 16px;
    border-radius: 8px;
    border-left: 4px solid var(--cyan);
    background: rgba(56, 189, 248, 0.08);
    color: #d8e7ff;
  }
  .doc-callout p {
    margin: 0 0 6px;
    font-size: 14px;
    line-height: 1.7;
  }
  .doc-callout p:last-child {
    margin-bottom: 0;
  }
  .doc-callout-label {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.8px;
    margin-bottom: 6px;
    color: var(--cyan);
  }
  .doc-callout-tip {
    border-left-color: var(--emerald);
    background: rgba(52, 211, 153, 0.09);
  }
  .doc-callout-tip .doc-callout-label { color: var(--emerald); }
  .doc-callout-important {
    border-left-color: var(--violet);
    background: rgba(167, 139, 250, 0.1);
  }
  .doc-callout-important .doc-callout-label { color: var(--violet); }
  .doc-callout-warning,
  .doc-callout-caution {
    border-left-color: var(--gold);
    background: rgba(250, 204, 21, 0.1);
  }
  .doc-callout-warning .doc-callout-label,
  .doc-callout-caution .doc-callout-label { color: var(--gold); }
  .doc-table-wrap {
    width: 100%;
    overflow-x: auto;
    margin: 16px 0 20px;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  .doc-table thead th {
    background: var(--panel-2);
    color: var(--cyan);
    font-weight: 800;
    font-size: 12px;
    padding: 10px 12px;
    border-bottom: 2px solid var(--border);
    white-space: nowrap;
  }
  .doc-table tbody td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(40, 58, 102, 0.55);
    color: #dbe6ff;
    vertical-align: top;
  }
  .doc-table tbody tr:nth-child(even) {
    background: rgba(22, 32, 59, 0.35);
  }
  .doc-hr {
    border: 0;
    border-top: 1px dashed var(--border);
    margin: 26px 0;
  }
  .doc-mobile-toc {
    display: none;
    margin-bottom: 16px;
    background: var(--panel);
    border: 2px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
  }
  .doc-mobile-toc summary {
    cursor: pointer;
    font-weight: 800;
    color: var(--cyan);
    font-size: 14px;
  }
  @media (max-width: 960px) {
    .doc-shell {
      grid-template-columns: 1fr;
    }
    .doc-toc-sidebar {
      display: none;
    }
    .doc-mobile-toc {
      display: block;
    }
    .doc-article {
      padding: 20px 18px 28px;
    }
  }
  @media print {
    html, body {
      background: #fff !important;
      color: #111827 !important;
    }
    .topbar, .doc-toc-sidebar, .doc-mobile-toc, .doc-hero-actions, .doc-code-copy, .doc-anchor {
      display: none !important;
    }
    .doc-shell {
      display: block !important;
      max-width: 100% !important;
      padding: 0 !important;
    }
    .doc-hero, .doc-article {
      background: #fff !important;
      color: #111827 !important;
      border: 1px solid #d1d5db !important;
      box-shadow: none !important;
    }
    .doc-h1, .doc-h2, .doc-h3, .doc-h4, .doc-p, .doc-list, .doc-table tbody td {
      color: #111827 !important;
    }
    .doc-code-block {
      background: #f8fafc !important;
      border-color: #cbd5e1 !important;
    }
    .doc-code-block pre {
      color: #0f172a !important;
      white-space: pre-wrap;
    }
    .doc-callout {
      background: #f8fafc !important;
      color: #111827 !important;
    }
  }
`;

export function renderDocPage({
  title = 'PixelCompute Town 文件中心',
  subtitle = '',
  badge = 'DOCUMENTATION',
  markdown = '',
  activePath = '/docs',
  origin = 'http://localhost:3456',
  lang = 'zh-TW',
  langOptions = null,
} = {}) {
  const safeOrigin = normalizeOrigin(origin);
  const safeActive = String(activePath || '/docs').trim() || '/docs';
  const normalizedLang = ['zh-TW', 'zh-CN', 'en', 'ja'].includes(lang) ? lang : 'zh-TW';
  const langQuery = normalizedLang !== 'zh-TW' && Array.isArray(langOptions) && langOptions.length > 0
    ? `?lang=${encodeURIComponent(normalizedLang)}`
    : '';
  const canonicalUrl = `${safeOrigin}${safeActive.startsWith('/') ? safeActive : `/${safeActive}`}${langQuery}`;
  const copyCodeLabels = { 'zh-TW': '📋 複製', 'zh-CN': '📋 复制', en: '📋 Copy', ja: '📋 コピー' };
  const { html: articleHtml, toc } = renderMarkdownToHtml(markdown, {
    copyCodeLabel: copyCodeLabels[normalizedLang] || '📋 複製',
  });

  const DOC_CHROME = {
    'zh-TW': {
      htmlLang: 'zh-Hant',
      brandTitle: '🏮 PixelCompute Town 像素算力鎮',
      navHome: '🏠 官方首頁',
      navDocs: '📖 使用說明書',
      navWp: '📜 白皮書',
      navApp: '🎮 算力小鎮',
      tocTitle: '📑 章節目錄 TOC',
      tocCount: (n) => `${n} 節`,
      tocTop: '文件頂端',
      tocMobile: (n) => `📑 展開章節目錄（${n} 節）`,
      printBtn: '🖨️ 列印 / 另存 PDF',
      copyBtn: '🔗 複製連結',
      copiedText: '✅ 已複製',
      charsLabel: (n) => `📄 約 ${n.toLocaleString('en-US')} 字`,
      readLabel: (m) => `⏱️ 預計閱讀 ${m} 分鐘`,
      footerPrefix: 'PixelCompute Town · 5% 首發創意版稅 / 85% 實幹池 (70% 核心 · ≤30% 週邊防稀釋) / 10% 平臺 ·',
      footerHome: '官網',
      footerDocs: '使用說明書',
      footerWp: '白皮書',
      footerApp: '進入算力小鎮',
    },
    'zh-CN': {
      htmlLang: 'zh-Hans',
      brandTitle: '🏮 PixelCompute Town 像素算力镇',
      navHome: '🏠 官方首页',
      navDocs: '📖 使用说明书',
      navWp: '📜 白皮书',
      navApp: '🎮 算力小镇',
      tocTitle: '📑 章节目录 TOC',
      tocCount: (n) => `${n} 节`,
      tocTop: '文档顶端',
      tocMobile: (n) => `📑 展开章节目录（${n} 节）`,
      printBtn: '🖨️ 打印 / 另存 PDF',
      copyBtn: '🔗 复制链接',
      copiedText: '✅ 已复制',
      charsLabel: (n) => `📄 约 ${n.toLocaleString('en-US')} 字`,
      readLabel: (m) => `⏱️ 预计阅读 ${m} 分钟`,
      footerPrefix: 'PixelCompute Town · 5% 首发创意版税 / 85% 实干池 (70% 核心 · ≤30% 周边防稀释) / 10% 平台 ·',
      footerHome: '官网',
      footerDocs: '使用说明书',
      footerWp: '白皮书',
      footerApp: '进入算力小镇',
    },
    en: {
      htmlLang: 'en',
      brandTitle: '🏮 PixelCompute Town',
      navHome: '🏠 Home',
      navDocs: '📖 User Guide',
      navWp: '📜 Whitepaper',
      navApp: '🎮 Enter Town',
      tocTitle: '📑 Table of Contents',
      tocCount: (n) => `${n} sections`,
      tocTop: 'Top of document',
      tocMobile: (n) => `📑 Expand Table of Contents (${n} sections)`,
      printBtn: '🖨️ Print / Save PDF',
      copyBtn: '🔗 Copy Link',
      copiedText: '✅ Copied',
      charsLabel: (n) => `📄 ~${n.toLocaleString('en-US')} words`,
      readLabel: (m) => `⏱️ ~${m} min read`,
      footerPrefix: 'PixelCompute Town · 5% Originator Spark / 85% Merit Pool (70% Core · <=30% Peripheral) / 10% Platform ·',
      footerHome: 'Home',
      footerDocs: 'User Guide',
      footerWp: 'Whitepaper',
      footerApp: 'Enter Town',
    },
    ja: {
      htmlLang: 'ja',
      brandTitle: '🏮 PixelCompute Town',
      navHome: '🏠 ホーム',
      navDocs: '📖 ユーザーガイド',
      navWp: '📜 ホワイトペーパー',
      navApp: '🎮 タウンへ',
      tocTitle: '📑 目次 TOC',
      tocCount: (n) => `${n} セクション`,
      tocTop: '先頭へ',
      tocMobile: (n) => `📑 目次を開く（${n} セクション）`,
      printBtn: '🖨️ 印刷 / PDF保存',
      copyBtn: '🔗 リンクをコピー',
      copiedText: '✅ コピー済み',
      charsLabel: (n) => `📄 約 ${n.toLocaleString('en-US')} 文字`,
      readLabel: (m) => `⏱️ 読了目安 ${m} 分`,
      footerPrefix: 'PixelCompute Town · 5% 初出ロイヤリティ / 85% 成果プール (70% コア・≤30% 周辺) / 10% プラットフォーム ·',
      footerHome: 'ホーム',
      footerDocs: 'ガイド',
      footerWp: 'ホワイトペーパー',
      footerApp: 'タウンを開く',
    },
  };
  const chrome = DOC_CHROME[normalizedLang] || DOC_CHROME['zh-TW'];

  const isWordCountLang = normalizedLang === 'en';
  const metricCount = isWordCountLang
    ? String(markdown || '').trim().split(/\s+/).filter(Boolean).length
    : String(markdown || '').replace(/\s+/g, '').length;
  const estMinutes = Math.max(1, Math.round(metricCount / (isWordCountLang ? 220 : 420)));

  const tocItemsHtml = toc.length > 0
    ? toc.map((item) => (
      `<li class="doc-toc-item doc-toc-lvl-${item.level}"><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a></li>`
    )).join('')
    : `<li class="doc-toc-item"><a href="#top">${escapeHtml(chrome.tocTop)}</a></li>`;

  const navLinks = [
    { href: '/', label: chrome.navHome, active: safeActive === '/' },
    { href: '/docs', label: chrome.navDocs, active: safeActive === '/docs' || safeActive === '/guide' },
    { href: `/whitepaper${langQuery}`, label: chrome.navWp, active: safeActive === '/whitepaper' },
    { href: '/app', label: chrome.navApp, active: safeActive === '/app', primary: true },
  ];

  const navHtml = navLinks.map((item) => {
    const classes = ['btn', 'btn-sm'];
    if (item.primary) classes.push('btn-primary');
    if (item.active) classes.push('doc-nav-active');
    return `<a class="${classes.join(' ')}" href="${escapeHtml(item.href)}"${item.active ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`;
  }).join('');

  const langSwitcherHtml = Array.isArray(langOptions) && langOptions.length > 0
    ? `<div class="doc-lang-switcher" role="group" aria-label="Language Switcher" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        ${langOptions.map((opt) => {
          const isActive = opt.code === normalizedLang || Boolean(opt.active);
          return `<a class="btn btn-sm${isActive ? ' doc-nav-active' : ''}" data-doc-lang="${escapeHtml(opt.code)}" href="${escapeHtml(opt.href)}"${isActive ? ' aria-current="true"' : ''}>${escapeHtml(opt.label)}</a>`;
        }).join('')}
      </div>`
    : '';

  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const safeBadge = escapeHtml(badge);
  const fullPageTitle = `${title} — PixelCompute Town`;

  return `<!DOCTYPE html>
<html lang="${escapeHtml(chrome.htmlLang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(fullPageTitle)}</title>
  <meta name="description" content="${safeSubtitle || safeTitle}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="PixelCompute Town" />
  <meta property="og:title" content="${escapeHtml(fullPageTitle)}" />
  <meta property="og:description" content="${safeSubtitle || safeTitle}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <style>${SHARED_CSS}${DOC_READER_CSS}</style>
</head>
<body id="top">
  <header class="topbar">
    <div class="topbar-inner" style="max-width:1240px;">
      <a class="brand" href="/">
        <span>${escapeHtml(chrome.brandTitle)}</span>
        <span class="brand-badge">${safeBadge}</span>
      </a>
      <nav class="nav-links" aria-label="Documentation Navigation">
        ${navHtml}
      </nav>
    </div>
  </header>

  <div class="doc-shell">
    <aside class="doc-toc-sidebar" aria-label="Table of Contents">
      <div class="doc-toc-title">
        <span>${escapeHtml(chrome.tocTitle)}</span>
        <span class="mono" style="font-size:11px;color:var(--muted);">${escapeHtml(chrome.tocCount(toc.length))}</span>
      </div>
      <ul class="doc-toc-list" id="doc-toc-list">
        ${tocItemsHtml}
      </ul>
    </aside>

    <main class="doc-main-col">
      <details class="doc-mobile-toc">
        <summary>${escapeHtml(chrome.tocMobile(toc.length))}</summary>
        <ul class="doc-toc-list" style="margin-top:10px;">
          ${tocItemsHtml}
        </ul>
      </details>

      <section class="doc-hero">
        <div class="doc-hero-top">
          <div>
            <span class="doc-badge">${safeBadge}</span>
            <h1>${safeTitle}</h1>
            ${subtitle ? `<p class="tagline" style="margin-bottom:0;">${safeSubtitle}</p>` : ''}
          </div>
          <div class="doc-hero-actions">
            ${langSwitcherHtml}
            <button type="button" class="btn btn-sm btn-gold" id="btn-doc-print">${escapeHtml(chrome.printBtn)}</button>
            <button type="button" class="btn btn-sm" data-copy-text="${escapeHtml(canonicalUrl)}">${escapeHtml(chrome.copyBtn)}</button>
          </div>
        </div>
        <div class="doc-meta-strip mono">
          <span>${escapeHtml(chrome.charsLabel(metricCount))}</span>
          <span>${escapeHtml(chrome.readLabel(estMinutes))}</span>
          <span>🛡️ Zero-Trust BYOK + BYOT · 5% / 85% / 10%</span>
        </div>
      </section>

      <article class="doc-article" id="doc-article">
        ${articleHtml}
      </article>

      <footer>
        ${escapeHtml(chrome.footerPrefix)}
        <a href="/">${escapeHtml(chrome.footerHome)}</a> · <a href="/docs">${escapeHtml(chrome.footerDocs)}</a> · <a href="/whitepaper${escapeHtml(langQuery)}">${escapeHtml(chrome.footerWp)}</a> · <a href="/app">${escapeHtml(chrome.footerApp)}</a>
      </footer>
    </main>
  </div>

  <script>
    (function () {
      var copiedLabel = ${JSON.stringify(chrome.copiedText)};
      var hasLangSwitcher = ${JSON.stringify(Boolean(Array.isArray(langOptions) && langOptions.length > 0))};
      if (hasLangSwitcher) {
        try {
          var params = new URLSearchParams(window.location.search);
          if (!params.get('lang') && window.location.pathname === '/whitepaper') {
            var saved = localStorage.getItem('pct_locale') || localStorage.getItem('pixel_compute_town_lang_v1');
            if (saved === 'en' || saved === 'zh-CN') {
              window.location.replace('/whitepaper?lang=' + encodeURIComponent(saved) + (window.location.hash || ''));
              return;
            }
          }
          var langBtns = document.querySelectorAll('[data-doc-lang]');
          for (var k = 0; k < langBtns.length; k++) {
            langBtns[k].addEventListener('click', function (ev) {
              var code = ev.currentTarget.getAttribute('data-doc-lang');
              if (code === 'zh-TW' || code === 'zh-CN' || code === 'en') {
                localStorage.setItem('pct_locale', code);
                localStorage.setItem('pixel_compute_town_lang_v1', code);
              }
            });
          }
        } catch (e) {}
      }
      var printBtn = document.getElementById('btn-doc-print');
      if (printBtn) {
        printBtn.addEventListener('click', function () { window.print(); });
      }
      var copyBtns = document.querySelectorAll('[data-copy-text]');
      for (var i = 0; i < copyBtns.length; i++) {
        copyBtns[i].addEventListener('click', function (ev) {
          var btn = ev.currentTarget;
          var text = btn.getAttribute('data-copy-text') || window.location.href;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              var orig = btn.textContent;
              btn.textContent = copiedLabel;
              setTimeout(function () { btn.textContent = orig; }, 1600);
            });
          }
        });
      }
      var codeCopies = document.querySelectorAll('[data-copy-code]');
      for (var j = 0; j < codeCopies.length; j++) {
        codeCopies[j].addEventListener('click', function (ev) {
          var btn = ev.currentTarget;
          var block = btn.closest('.doc-code-block');
          var codeEl = block ? block.querySelector('code') : null;
          if (codeEl && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(codeEl.textContent || '').then(function () {
              var orig = btn.textContent;
              btn.textContent = copiedLabel;
              setTimeout(function () { btn.textContent = orig; }, 1500);
            });
          }
        });
      }
      var tocLinks = Array.prototype.slice.call(document.querySelectorAll('#doc-toc-list a'));
      if (tocLinks.length > 0 && typeof IntersectionObserver === 'function') {
        var map = {};
        var headings = [];
        tocLinks.forEach(function (a) {
          var id = (a.getAttribute('href') || '').slice(1);
          var el = id ? document.getElementById(id) : null;
          if (el) {
            map[id] = a;
            headings.push(el);
          }
        });
        var setActive = function (id) {
          tocLinks.forEach(function (a) { a.classList.remove('active'); });
          if (map[id]) map[id].classList.add('active');
        };
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) setActive(entry.target.id);
          });
        }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });
        headings.forEach(function (h) { obs.observe(h); });
      }
    })();
  </script>
</body>
</html>`;
}
