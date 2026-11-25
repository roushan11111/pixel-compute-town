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
