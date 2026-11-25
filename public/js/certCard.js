/**
 * PixelCompute Town — Shareable Retro Pixel Work Certificate & Dividend Card
 * Exports renderWorkCertificate(state) and downloadWorkCertificate(state).
 * Zero-dependency ES Module.
 */

import { drawHDWorker, drawObjectSprite } from './sprites.js';

const CARD_W = 900;
const CARD_H = 540;

const DEFAULT_ACHIEVEMENTS = [
  { id: 'first_blood', icon: '⚡', title: '首單開張' },
  { id: 'dual_track_master', icon: '⚔️', title: '雙軌大師' },
  { id: 'community_builder', icon: '🗳️', title: '立項推手' },
  { id: 'launch_founder', icon: '🚀', title: '上線創世者' },
  { id: 'dividend_earner', icon: '💸', title: '首批分紅股東' },
  { id: 'cli_pioneer', icon: '💻', title: '本機 CLI 先鋒' },
];

function stripParenSuffix(str) {
  if (!str) return '';
  return String(str).replace(/\s*[（(][^）)]*[）)]\s*$/g, '').trim();
}

function truncate(str, max) {
  if (!str) return '';
  const s = String(str);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function formatUsd(val) {
  const num = Number(val) || 0;
  return `$${num.toFixed(2)}`;
}

function hashSerial(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Defensively normalize state from either `{ user, state }` or flat `state`.
 */
function extractCertData(input) {
  const root = input && typeof input === 'object' ? input : {};
  const world = root.state && typeof root.state === 'object' ? root.state : root;
  const user = root.user || world.user || world.player || {};
  const player = world.player || user || {};

  const playerName =
    user.displayName ||
    user.name ||
    user.username ||
    user.login ||
    player.name ||
    '創始開發者';

  const handle = user.login
    ? `@${user.login}`
    : user.handle || (player.id ? `@${player.id}` : '@founder-dev');

  const reputation = Number(
    player.reputation ?? user.reputation ?? world.reputation ?? 100
  );
  const gold = Number(
    player.gold ?? player.goldBalance ?? world.gold ?? 0
  );
  const usdBalance = Number(
    player.usdBalance ??
      player.dividendUsd ??
      player.dividendsUsd ??
      player.totalUsd ??
      player.earningsUsd ??
      world.usdBalance ??
      0
  );

  const workers = Array.isArray(world.workers) ? world.workers : [];
  const projects = Array.isArray(world.projects) ? world.projects : [];
  const tasks = Array.isArray(world.tasks) ? world.tasks : [];
  const contributions = Array.isArray(world.contributions)
    ? world.contributions
    : Array.isArray(world.contributionLedger)
      ? world.contributionLedger
      : [];
  const dividends = Array.isArray(world.dividendLedger) ? world.dividendLedger : [];

  const completedTasksFromList = tasks.filter(
    (t) => t.status === 'completed' || t.status === 'accepted' || t.status === 'verified'
  ).length;

  const completedTasks = Number(
    player.completedTasks ??
      player.tasksCompleted ??
      (world.stats && world.stats.completedTasks) ??
      completedTasksFromList
  );

  const isPro = Boolean(
    player.isPro ||
      player.proMember ||
      (Array.isArray(player.ownedItems) && player.ownedItems.some((id) => String(id).includes('pro')))
  );

  const myUserIds = new Set(
    [player.id, user.id, 'founder', 'founder-demo', 'demo-user'].filter(Boolean)
  );

  // Aggregate contribution points & dividends per project
  const projPoints = new Map();
  const projTotalPoints = new Map();
  const projDividends = new Map();

  for (const c of contributions) {
    const pid = c.projectId;
    if (!pid) continue;
    const pts = Number(c.points ?? c.contributionPoints ?? 0);
    projTotalPoints.set(pid, (projTotalPoints.get(pid) || 0) + pts);

    const isMine = !c.userId || myUserIds.has(c.userId) || c.isPlayer === true;

    if (isMine) {
      projPoints.set(pid, (projPoints.get(pid) || 0) + pts);
      if (c.dividendUsd) {
        projDividends.set(pid, (projDividends.get(pid) || 0) + Number(c.dividendUsd));
      }
    }
  }

  for (const d of dividends) {
    const pid = d.projectId;
    if (!pid) continue;
    const payout = Number(d.playerPayoutUsd ?? d.payoutUsd ?? d.amountUsd ?? 0);
    if (payout > 0 && (!d.userId || myUserIds.has(d.userId))) {
      projDividends.set(pid, (projDividends.get(pid) || 0) + payout);
    }
  }

  let totalPoints = Number(
    player.contributionPoints ??
      player.totalContributionPoints ??
      player.totalContribution ??
      0
  );
  if (totalPoints === 0) {
    for (const pts of projPoints.values()) totalPoints += pts;
  }

  // Build holdings list
  const holdings = projects
    .map((p) => {
      let mapMyPts = 0;
      let mapTotalPts = 0;
      if (p.contributions && typeof p.contributions === 'object' && !Array.isArray(p.contributions)) {
        for (const [uid, val] of Object.entries(p.contributions)) {
          const v = Number(val) || 0;
          mapTotalPts += v;
          if (myUserIds.has(uid)) mapMyPts += v;
        }
      }

      const myPts = Math.max(
        projPoints.get(p.id) || 0,
        Number(p.playerContributionPoints ?? 0),
        mapMyPts
      );
      const totalPts = Math.max(
        myPts,
        projTotalPoints.get(p.id) || 0,
        Number(p.totalContributionPoints ?? 0),
        mapTotalPts
      );
      const sharePct =
        totalPts > 0
          ? Math.min(60, (myPts / totalPts) * 60)
          : p.creatorId === player.id || p.isFounderProject
            ? 30
            : 0;
      const earnedUsd = Math.max(
        projDividends.get(p.id) || 0,
        Number(p.playerDividendUsd ?? 0)
      );
      return {
        id: p.id,
        name: p.name || p.title || p.id,
        status: p.status || 'building',
        progressPct: Math.max(0, Math.min(100, Number(p.progressPct ?? 0))),
        points: myPts,
        sharePct,
        earnedUsd,
        totalRevenueUsd: Number(p.totalRevenueUsd ?? 0),
      };
    })
    .sort((a, b) => b.points - a.points || b.progressPct - a.progressPct)
    .slice(0, 4);

  // Normalize Genesis Achievements list (prefer backend state.achievements)
  const rawAch = Array.isArray(world.achievements)
    ? world.achievements
    : Array.isArray(player.achievements)
      ? player.achievements
      : [];

  let achievements;
  if (rawAch.length > 0 && typeof rawAch[0] === 'object') {
    achievements = rawAch.slice(0, 6).map((a) => ({
      id: a.id || a.key || '',
      icon: a.icon || a.emoji || '🏅',
      title: a.title || a.name || a.label || a.id || '成就',
      unlocked: Boolean(a.unlocked || a.unlockedAt),
    }));
  } else {
    const unlockedSet = new Set(rawAch.map((id) => String(id)));
    achievements = DEFAULT_ACHIEVEMENTS.map((def) => ({
      ...def,
      unlocked: unlockedSet.has(def.id),
    }));
  }

  let tier = '創世開拓者';
  if (reputation >= 120 || completedTasks >= 10) tier = '傳奇算力領主';
  else if (reputation >= 105 || completedTasks >= 4) tier = '公會資深大匠';
  else if (completedTasks >= 1) tier = '認證算力工程師';

  return {
    playerName,
    handle,
    reputation,
    gold,
    usdBalance,
    completedTasks,
    totalPoints,
    isPro,
    tier,
    workers: workers.slice(0, 4),
    holdings,
    achievements,
  };
}

function drawPixelBox(ctx, x, y, w, h, fill, border, cornerColor = null) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillRect(x, y, 2, h);
  ctx.fillRect(x + w - 2, y, 2, h);

  if (cornerColor) {
    ctx.fillStyle = cornerColor;
    ctx.fillRect(x, y, 6, 2);
    ctx.fillRect(x, y, 2, 6);
    ctx.fillRect(x + w - 6, y, 6, 2);
    ctx.fillRect(x + w - 2, y, 2, 6);
    ctx.fillRect(x, y + h - 2, 6, 2);
    ctx.fillRect(x, y + h - 6, 2, 6);
    ctx.fillRect(x + w - 6, y + h - 2, 6, 2);
    ctx.fillRect(x + w - 2, y + h - 6, 2, 6);
  }
}

/**
 * Render a retro pixel Work Certificate & Dividend Statement onto a new Canvas.
 * @param {object} state
 * @returns {HTMLCanvasElement}
 */
export function renderWorkCertificate(state) {
  const data = extractCertData(state);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // 1. Cyber-night gradient backdrop
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#090e21');
  bg.addColorStop(0.5, '#111936');
  bg.addColorStop(1, '#1a1230');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Subtle retro pixel grid + scanlines
  ctx.fillStyle = 'rgba(34, 211, 238, 0.04)';
  for (let gx = 0; gx < CARD_W; gx += 20) ctx.fillRect(gx, 0, 1, CARD_H);
  for (let gy = 0; gy < CARD_H; gy += 20) ctx.fillRect(0, gy, CARD_W, 1);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
  for (let sy = 0; sy < CARD_H; sy += 4) ctx.fillRect(0, sy, CARD_W, 1);

  // Decorative glowing corner pixels
  ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
  ctx.fillRect(0, 0, 260, 110);
  ctx.fillStyle = 'rgba(34, 211, 238, 0.10)';
  ctx.fillRect(CARD_W - 260, CARD_H - 110, 260, 110);

  // 2. Double retro pixel outer frame
  drawPixelBox(ctx, 12, 12, CARD_W - 24, CARD_H - 24, 'rgba(9, 13, 26, 0.55)', '#334155', '#fde047');
  drawPixelBox(ctx, 20, 20, CARD_W - 40, CARD_H - 40, 'rgba(15, 23, 42, 0.45)', '#22d3ee', '#f472b6');

  // 3. Header Banner
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(28, 28, CARD_W - 56, 68);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(28, 94, CARD_W - 56, 2);

  // Header Left Title
  ctx.font = 'bold 23px "Courier New", "Microsoft JhengHei", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('★ PIXELCOMPUTE TOWN · 像素算力鎮', 44, 36);

  ctx.font = 'bold 12px "Courier New", "Microsoft JhengHei", monospace';
  ctx.fillStyle = '#67e8f9';
  ctx.fillText('《算力打工證 & 透明收益分紅結算單》  PROOF OF ACCEPTED WORK', 46, 68);

  // Header Right Stamp Badge
  drawPixelBox(ctx, CARD_W - 224, 36, 180, 48, '#1e1b4b', '#fde047', '#f472b6');
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Courier New", "Microsoft JhengHei", monospace';
  ctx.fillStyle = '#fde047';
  ctx.fillText('✔ VERIFIED BUILDER', CARD_W - 134, 45);
  const dateStr = new Date().toISOString().slice(0, 10);
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`ISSUED: ${dateStr}`, CARD_W - 134, 65);

  // 4. Left Column: Player Profile & Pixel Worker Squad Showcase
  const leftX = 34;
  const leftY = 108;
  const leftW = 316;
  const leftH = 310;
  drawPixelBox(ctx, leftX, leftY, leftW, leftH, '#0d1428', '#334155', '#22d3ee');

  // Player Name & Tier
  ctx.textAlign = 'left';
  ctx.font = 'bold 19px "Courier New", "Microsoft JhengHei", monospace';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(truncate(data.playerName, 14), leftX + 18, leftY + 14);

  ctx.font = '12px "Courier New", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(truncate(data.handle, 24), leftX + 18, leftY + 38);

  // Tier Pill & Optional Pro Pill
  drawPixelBox(ctx, leftX + 18, leftY + 58, 146, 24, '#312e81', '#a855f7');
  ctx.font = 'bold 12px "Courier New", "Microsoft JhengHei", monospace';
  ctx.fillStyle = '#e9d5ff';
  ctx.textAlign = 'center';
  ctx.fillText(`✦ ${data.tier}`, leftX + 91, leftY + 64);

  if (data.isPro) {
    drawPixelBox(ctx, leftX + 172, leftY + 58, 92, 24, '#78350f', '#fde047');
    ctx.fillStyle = '#fef08a';
    ctx.fillText('👑 PRO 會員', leftX + 218, leftY + 64);
  }

  // Pixel Squad Stage Box
  const stageX = leftX + 16;
  const stageY = leftY + 92;
  const stageW = leftW - 32;
  const stageH = 158;
  drawPixelBox(ctx, stageX, stageY, stageW, stageH, '#151d36', '#475569', '#38bdf8');

  // Stage Title
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px "Courier New", "Microsoft JhengHei", monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`ACTIVE SQUAD · 旗下算力小人 (${data.workers.length})`, stageX + 10, stageY + 9);

  // Glowing platform floor inside stage
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(stageX + 10, stageY + 112, stageW - 20, 34);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(stageX + 10, stageY + 112, stageW - 20, 2);

  // Render 32x32 HD pixel worker portraits (up to 4) with subtle spotlight glow
  const squad =
    data.workers.length > 0
      ? data.workers
      : [
          { name: '閃電小吉', roleClass: 'flash_worker', skin: 'default', level: 1 },
          { name: '架構師阿瓜', roleClass: 'pro_architect', skin: 'default', level: 1 },
        ];

  const slotW = (stageW - 20) / squad.length;
  squad.forEach((w, idx) => {
    const cx = Math.round(stageX + 10 + slotW * idx + slotW / 2);
    const footY = stageY + 111;
    const anim = idx % 2 === 0 ? 'celebrate' : 'idle';
    const skinId = w.skin || w.skinId || 'default';

    // Subtle glowing pedestal aura behind each HD character
    const aura = ctx.createRadialGradient(cx, footY - 28, 6, cx, footY - 28, 34);
    aura.addColorStop(0, idx % 2 === 0 ? 'rgba(34, 211, 238, 0.20)' : 'rgba(168, 85, 247, 0.20)');
    aura.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(cx - 34, footY - 62, 68, 64);

    drawHDWorker(
      ctx,
      cx,
      footY,
      { roleClass: w.roleClass || 'flash_worker', skinId },
      anim,
      0,
      2,
      {
        shadow: true,
        crown: data.isPro && idx === 0 && skinId === 'default' ? 'gold' : null,
      }
    );
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px "Courier New", "Microsoft JhengHei", monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(truncate(stripParenSuffix(w.name || '小人'), 7), cx, footY + 8);
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`LV.${w.level || 1}`, cx, footY + 21);
  });

  // Mini Seal / Proof Note at bottom of Left Column
  drawObjectSprite(ctx, 'coin', leftX + 20, leftY + 264, 3, 0);
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px "Courier New", "Microsoft JhengHei", monospace';
  ctx.fillStyle = '#fde047';
  ctx.fillText('防刷單鐵律 · 按驗收成果記功', leftX + 54, leftY + 264);
  ctx.font = '11px "Courier New", "Microsoft JhengHei", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('BYOK 零信任金鑰 · 30/60/10 透明分紅', leftX + 54, leftY + 283);

  // 5. Right Column: 4 KPI Cards + Holdings & Dividend Table
  const rightX = 366;
  const rightY = 108;
  const rightW = CARD_W - rightX - 34; // 500px

  // 2x2 KPI Grid
  const kpiW = (rightW - 14) / 2;
  const kpiH = 68;

  const stars = '★'.repeat(Math.max(1, Math.min(5, Math.round(data.reputation / 22))));
  const kpis = [
    {
      x: rightX,
      y: rightY,
      label: '🛡️ 開發者信譽分 (REPUTATION)',
      value: `${data.reputation} pts`,
      sub: `${stars} 優良信用`,
      border: '#38bdf8',
      valColor: '#67e8f9',
    },
    {
      x: rightX + kpiW + 14,
      y: rightY,
      label: '✅ 驗收通過任務 (ACCEPTED)',
      value: `${data.completedTasks} 筆`,
      sub: `累計貢獻點 +${data.totalPoints} pts`,
      border: '#a855f7',
      valColor: '#e879f9',
    },
    {
      x: rightX,
      y: rightY + kpiH + 10,
      label: '💵 累積分紅與懸賞 (USD EARNED)',
      value: formatUsd(data.usdBalance),
      sub: '含上線分紅池 + 懸賞實得',
      border: '#22c55e',
      valColor: '#4ade80',
    },
    {
      x: rightX + kpiW + 14,
      y: rightY + kpiH + 10,
      label: '🪙 小鎮金幣資產 (GOLD)',
      value: `${data.gold.toLocaleString()} G`,
      sub: '可招募小人與兌換像素外觀',
      border: '#f59e0b',
      valColor: '#fde047',
    },
  ];

  for (const k of kpis) {
    drawPixelBox(ctx, k.x, k.y, kpiW, kpiH, '#0d1428', k.border);
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px "Courier New", "Microsoft JhengHei", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(k.label, k.x + 12, k.y + 8);

    ctx.font = 'bold 21px "Courier New", "Microsoft JhengHei", monospace';
    ctx.fillStyle = k.valColor;
    ctx.fillText(k.value, k.x + 12, k.y + 25);

    ctx.font = '10px "Courier New", "Microsoft JhengHei", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(k.sub, k.x + 12, k.y + 50);
  }

  // Holdings & Dividend Projects Table
  const tblY = rightY + (kpiH + 10) * 2;
  const tblH = 154;
  drawPixelBox(ctx, rightX, tblY, rightW, tblH, '#0d1428', '#475569', '#fde047');

  ctx.textAlign = 'left';
  ctx.font = 'bold 12px "Courier New", "Microsoft JhengHei", monospace';
  ctx.fillStyle = '#fde047';
  ctx.fillText('📊 持倉與分紅項目清單 (PROJECT HOLDINGS & DIVIDENDS)', rightX + 14, tblY + 10);

  // Table header divider
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(rightX + 12, tblY + 29, rightW - 24, 17);
  ctx.font = 'bold 10px "Courier New", "Microsoft JhengHei", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('項目名稱', rightX + 18, tblY + 32);
  ctx.fillText('狀態', rightX + 216, tblY + 32);
  ctx.fillText('進度', rightX + 292, tblY + 32);
  ctx.fillText('貢獻點 / 預估權重', rightX + 344, tblY + 32);

  if (data.holdings.length === 0) {
    ctx.textAlign = 'center';
    ctx.font = '13px "Courier New", "Microsoft JhengHei", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('尚未參與孵化項目，快派小人進工坊賺取首批分紅份額！', rightX + rightW / 2, tblY + 86);
  } else {
    data.holdings.forEach((h, idx) => {
      const ry = tblY + 52 + idx * 24;
      if (idx % 2 === 1) {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
        ctx.fillRect(rightX + 12, ry - 3, rightW - 24, 22);
      }

      ctx.textAlign = 'left';
      ctx.font = 'bold 12px "Courier New", "Microsoft JhengHei", monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(truncate(h.name, 14), rightX + 18, ry + 1);

      // Status pill
      const isLaunched = h.status === 'launched' || h.progressPct >= 100;
      const isVoting = h.status === 'voting';
      const statusLabel = isLaunched ? '🚀 已上線' : isVoting ? '🗳️ 投票中' : '🔨 建設中';
      ctx.font = 'bold 11px "Courier New", "Microsoft JhengHei", monospace';
      ctx.fillStyle = isLaunched ? '#4ade80' : isVoting ? '#f472b6' : '#38bdf8';
      ctx.fillText(statusLabel, rightX + 216, ry + 1);

      // Progress
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`${h.progressPct}%`, rightX + 292, ry + 1);

      // Points / share / earned USD
      const shareStr =
        h.earnedUsd > 0
          ? `${h.points}pt · ${formatUsd(h.earnedUsd)}`
          : h.points > 0
            ? `${h.points}pt (${h.sharePct.toFixed(1)}%)`
            : h.totalRevenueUsd > 0
              ? `營收 ${formatUsd(h.totalRevenueUsd)}`
              : '可接單參與';
      ctx.fillStyle = h.earnedUsd > 0 ? '#4ade80' : '#fde047';
      ctx.fillText(shareStr, rightX + 344, ry + 1);
    });
  }

  // 6. Full-Width Genesis Achievement Badges Strip
  const achX = 34;
  const achY = 426;
  const achW = CARD_W - 68; // 832px
  const achH = 46;
  const unlockedCount = data.achievements.filter((a) => a.unlocked).length;
  drawPixelBox(ctx, achX, achY, achW, achH, '#0d1428', '#334155', '#fde047');

  ctx.textAlign = 'left';
  ctx.font = 'bold 11px "Courier New", "Microsoft JhengHei", monospace';
  ctx.fillStyle = '#fde047';
  ctx.fillText(`🏆 創世成就徽章 (${unlockedCount}/${data.achievements.length})`, achX + 12, achY + 16);

  const badgeStartX = achX + 166;
  const badgeAreaW = achW - 178;
  const badgeGap = 6;
  const badgeCount = Math.max(1, data.achievements.length);
  const badgeW = Math.floor((badgeAreaW - badgeGap * (badgeCount - 1)) / badgeCount);

  data.achievements.forEach((ach, idx) => {
    const bx = badgeStartX + idx * (badgeW + badgeGap);
    const by = achY + 9;
    const bh = 28;
    const fill = ach.unlocked ? '#2e1065' : '#111827';
    const border = ach.unlocked ? '#fde047' : '#334155';
    drawPixelBox(ctx, bx, by, badgeW, bh, fill, border);

    ctx.textAlign = 'center';
    ctx.font = 'bold 10px "Courier New", "Microsoft JhengHei", monospace';
    ctx.fillStyle = ach.unlocked ? '#fef08a' : '#64748b';
    const label = `${ach.unlocked ? ach.icon : '🔒'} ${truncate(ach.title, 6)}`;
    ctx.fillText(label, bx + badgeW / 2, by + 9);
  });

  // 7. Footer Serial & Decorative Pixel Barcode
  const footY = 480;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(28, footY, CARD_W - 56, 2);

  const serial = hashSerial(`${data.playerName}-${data.completedTasks}-${data.totalPoints}-${unlockedCount}-${dateStr}`);
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillStyle = '#67e8f9';
  ctx.fillText(`CERT #PCT-${serial}`, 38, footY + 12);
  ctx.font = '11px "Courier New", "Microsoft JhengHei", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('像素算力鎮 · 把閒置 AI 算力變成可分享的真實產品與分紅', 180, footY + 12);

  // Crisp pixel barcode on bottom right
  const bcX = CARD_W - 144;
  const bcY = footY + 8;
  for (let i = 0; i < 28; i++) {
    const bit = ((serial.charCodeAt(i % serial.length) + i * 7) % 3) !== 0;
    if (bit) {
      ctx.fillStyle = i % 5 === 0 ? '#22d3ee' : '#e2e8f0';
      ctx.fillRect(bcX + i * 4, bcY, i % 4 === 0 ? 3 : 2, 18);
    }
  }

  return canvas;
}

/**
 * Render and trigger a browser PNG download of the Work Certificate card.
 * @param {object} state
 * @param {string} [filename]
 * @returns {{ canvas: HTMLCanvasElement, dataUrl: string, filename: string }}
 */
export function downloadWorkCertificate(state, filename = 'pixelcompute-work-cert.png') {
  const canvas = renderWorkCertificate(state);
  const dataUrl = canvas.toDataURL('image/png');

  if (typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return { canvas, dataUrl, filename };
}
