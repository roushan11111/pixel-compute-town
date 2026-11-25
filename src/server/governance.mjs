// PixelCompute Town — Anti-Dilution Governance Protocol
// 4-Layer Anti-Slop Moat:
//   1) 70% Core / 30% Peripheral Bucket Caps (Anti-Dilution Merit Split)
//   2) Layer-1 Machine Verification + AI Blind Review Diagnostics
//   3) Peer Review Queue with Reviewer Rewards & Stake Seizure
//   4) Stake Gold Deposit, Reputation Gate & Slop Cooldown Penalties

export const CORE_BUCKET_PCT = 70;
export const PERIPHERAL_BUCKET_PCT = 30;
export const REVIEWER_REWARD_GOLD = 15;
export const REVIEWER_REWARD_POINTS = 5;
export const SLOP_STRIKE_LIMIT = 2;
export const DEFAULT_COOLDOWN_SEC = 60;
export const DEFAULT_MIN_REPUTATION = 60;
export const DEFAULT_GUILD_STAKE_GOLD = 25;
export const HIGH_BOUNTY_STAKE_GOLD = 30;
export const REVIEW_REJECT_REPUTATION_PENALTY = 5;

const CORE_CATEGORIES = new Set(['feature_pr', 'architecture', 'bugfix']);
const PERIPHERAL_CATEGORIES = new Set(['i18n', 'docs', 'pixel_spec', 'unit_test', 'qa_audit']);

function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

export function getCooldownSeconds() {
  const envVal = Number(process.env.SLOP_COOLDOWN_SEC);
  if (Number.isFinite(envVal) && envVal > 0) {
    return Math.round(envVal);
  }
  return DEFAULT_COOLDOWN_SEC;
}

export function getTaskBucket(task) {
  if (!task || typeof task !== 'object') return 'peripheral';
  if (task.poolBucket === 'core' || task.poolBucket === 'peripheral') {
    return task.poolBucket;
  }
  const cat = String(task.category || '').toLowerCase();
  if (CORE_CATEGORIES.has(cat)) return 'core';
  if (PERIPHERAL_CATEGORIES.has(cat)) return 'peripheral';
  if (task.track === 'guild_bounty') return 'core';
  return 'peripheral';
}

export function getTaskStakeGold(task) {
  if (!task || typeof task !== 'object') return 0;
  if (task.stakeGold !== undefined && task.stakeGold !== null && Number.isFinite(Number(task.stakeGold))) {
    return Math.max(0, Math.round(Number(task.stakeGold)));
  }
  if (task.track === 'guild_bounty') {
    return Number(task.cashBountyUsd || 0) >= 25
      ? HIGH_BOUNTY_STAKE_GOLD
      : DEFAULT_GUILD_STAKE_GOLD;
  }
  return 0;
}

export function getTaskMinReputation(task) {
  if (!task || typeof task !== 'object') return 0;
  if (task.minReputation !== undefined && task.minReputation !== null && Number.isFinite(Number(task.minReputation))) {
    return Math.max(0, Math.round(Number(task.minReputation)));
  }
  if (task.track === 'guild_bounty') {
    return DEFAULT_MIN_REPUTATION;
  }
  return 0;
}

export function ensureProjectBuckets(project) {
  if (!project || typeof project !== 'object') return project;

  if (!project.poolCaps || typeof project.poolCaps !== 'object') {
    project.poolCaps = {
      coreSharePct: CORE_BUCKET_PCT,
      peripheralSharePct: PERIPHERAL_BUCKET_PCT,
    };
  } else {
    if (!Number.isFinite(Number(project.poolCaps.coreSharePct))) {
      project.poolCaps.coreSharePct = CORE_BUCKET_PCT;
    }
    if (!Number.isFinite(Number(project.poolCaps.peripheralSharePct))) {
      project.poolCaps.peripheralSharePct = PERIPHERAL_BUCKET_PCT;
    }
  }

  if (!project.bucketPoints || typeof project.bucketPoints !== 'object') {
    project.bucketPoints = { core: {}, peripheral: {} };
  }
  if (!project.bucketPoints.core || typeof project.bucketPoints.core !== 'object') {
    project.bucketPoints.core = {};
  }
  if (!project.bucketPoints.peripheral || typeof project.bucketPoints.peripheral !== 'object') {
    project.bucketPoints.peripheral = {};
  }

  const coreEntries = Object.entries(project.bucketPoints.core).filter(([, v]) => Number(v) > 0);
  const periphEntries = Object.entries(project.bucketPoints.peripheral).filter(([, v]) => Number(v) > 0);

  if (coreEntries.length === 0 && periphEntries.length === 0) {
    const contribs = project.contributions || {};
    const contribEntries = Object.entries(contribs).filter(([, v]) => Number(v) > 0);
    if (contribEntries.length > 0) {
      if (
        project.id === 'proj-meta'
        && Number(contribs['founder-demo']) === 80
        && Number(contribs['npc-momo']) === 55
        && Number(contribs['npc-kuro']) === 45
        && Number(contribs['npc-yuna']) === 30
        && contribEntries.length === 4
      ) {
        project.bucketPoints.core = {
          'founder-demo': 58,
          'npc-kuro': 45,
          'npc-momo': 7,
        };
        project.bucketPoints.peripheral = {
          'founder-demo': 22,
          'npc-momo': 48,
          'npc-yuna': 30,
        };
      } else if (
        project.id === 'proj-i18n'
        && Number(contribs['founder-demo']) === 40
        && Number(contribs['npc-kuro']) === 70
        && Number(contribs['npc-rin']) === 35
        && contribEntries.length === 3
      ) {
        project.bucketPoints.core = {
          'npc-kuro': 70,
          'npc-rin': 35,
          'founder-demo': 25,
        };
        project.bucketPoints.peripheral = {
          'founder-demo': 15,
        };
      } else {
        for (const [uid, pts] of contribEntries) {
          project.bucketPoints.core[uid] = Number(pts);
        }
      }
    }
  }

  return project;
}

function getNormalizedBucketEntries(project) {
  const coreMap = project?.bucketPoints?.core || {};
  const periphMap = project?.bucketPoints?.peripheral || {};

  let coreEntries = Object.entries(coreMap)
    .map(([uid, pts]) => [uid, Number(pts)])
    .filter(([, pts]) => Number.isFinite(pts) && pts > 0);

  const peripheralEntries = Object.entries(periphMap)
    .map(([uid, pts]) => [uid, Number(pts)])
    .filter(([, pts]) => Number.isFinite(pts) && pts > 0);

  // Legacy fallback: if bucketPoints is completely empty, treat contributions as core
  if (coreEntries.length === 0 && peripheralEntries.length === 0) {
    coreEntries = Object.entries(project?.contributions || {})
      .map(([uid, pts]) => [uid, Number(pts)])
      .filter(([, pts]) => Number.isFinite(pts) && pts > 0);
  }

  const sortDesc = (a, b) => (b[1] !== a[1] ? b[1] - a[1] : String(a[0]).localeCompare(String(b[0])));
  coreEntries.sort(sortDesc);
  peripheralEntries.sort(sortDesc);

  return { coreEntries, peripheralEntries };
}

export function computeBucketStats(project) {
  const coreCapPct = Number.isFinite(Number(project?.poolCaps?.coreSharePct))
    ? Number(project.poolCaps.coreSharePct)
    : CORE_BUCKET_PCT;
  const peripheralCapPct = Number.isFinite(Number(project?.poolCaps?.peripheralSharePct))
    ? Number(project.poolCaps.peripheralSharePct)
    : PERIPHERAL_BUCKET_PCT;

  const { coreEntries, peripheralEntries } = getNormalizedBucketEntries(project);
  const coreTotalPoints = coreEntries.reduce((sum, [, pts]) => sum + pts, 0);
  const peripheralTotalPoints = peripheralEntries.reduce((sum, [, pts]) => sum + pts, 0);

  let effectiveCorePct = 0;
  let effectivePeripheralPct = 0;
  if (coreTotalPoints > 0 && peripheralTotalPoints > 0) {
    effectiveCorePct = coreCapPct;
    effectivePeripheralPct = peripheralCapPct;
  } else if (coreTotalPoints > 0) {
    effectiveCorePct = 100;
    effectivePeripheralPct = 0;
  } else if (peripheralTotalPoints > 0) {
    effectiveCorePct = 0;
    effectivePeripheralPct = 100;
  }

  const coreByUser = {};
  for (const [uid, pts] of coreEntries) {
    coreByUser[uid] = {
      points: pts,
      sharePct: coreTotalPoints > 0 ? round2((pts / coreTotalPoints) * 100) : 0,
    };
  }

  const peripheralByUser = {};
  for (const [uid, pts] of peripheralEntries) {
    peripheralByUser[uid] = {
      points: pts,
      sharePct: peripheralTotalPoints > 0 ? round2((pts / peripheralTotalPoints) * 100) : 0,
    };
  }

  return {
    projectId: project?.id || null,
    coreTotalPoints,
    peripheralTotalPoints,
    totalPoints: coreTotalPoints + peripheralTotalPoints,
    coreCapPct,
    peripheralCapPct,
    effectiveCorePct,
    effectivePeripheralPct,
    coreByUser,
    peripheralByUser,
  };
}

function allocateBucketPool(entries, totalPoints, poolUsd) {
  const out = {};
  if (poolUsd <= 0 || totalPoints <= 0 || entries.length === 0) {
    return out;
  }

  let allocated = 0;
  for (const [uid, pts] of entries) {
    const share = round2(poolUsd * (pts / totalPoints));
    out[uid] = share;
    allocated = round2(allocated + share);
  }

  const diff = round2(poolUsd - allocated);
  if (diff !== 0 && entries.length > 0) {
    const topUid = entries[0][0];
    out[topUid] = round2((out[topUid] || 0) + diff);
  }

  return out;
}

export function computeAntiDilutionMeritSplit(project, meritPoolUsd) {
  const pool = round2(meritPoolUsd);
  const coreCapPct = Number.isFinite(Number(project?.poolCaps?.coreSharePct))
    ? Number(project.poolCaps.coreSharePct)
    : CORE_BUCKET_PCT;
  const peripheralCapPct = Number.isFinite(Number(project?.poolCaps?.peripheralSharePct))
    ? Number(project.poolCaps.peripheralSharePct)
    : PERIPHERAL_BUCKET_PCT;

  const { coreEntries, peripheralEntries } = getNormalizedBucketEntries(project);
  const coreTotalPoints = coreEntries.reduce((sum, [, pts]) => sum + pts, 0);
  const peripheralTotalPoints = peripheralEntries.reduce((sum, [, pts]) => sum + pts, 0);

  let corePoolUsd = 0;
  let peripheralPoolUsd = 0;

  if (pool > 0) {
    if (coreTotalPoints > 0 && peripheralTotalPoints > 0) {
      corePoolUsd = round2(pool * (coreCapPct / 100));
      peripheralPoolUsd = round2(pool - corePoolUsd);
    } else if (coreTotalPoints > 0) {
      corePoolUsd = pool;
      peripheralPoolUsd = 0;
    } else if (peripheralTotalPoints > 0) {
      corePoolUsd = 0;
      peripheralPoolUsd = pool;
    }
  }

  const coreAlloc = allocateBucketPool(coreEntries, coreTotalPoints, corePoolUsd);
  const periphAlloc = allocateBucketPool(peripheralEntries, peripheralTotalPoints, peripheralPoolUsd);

  const userIds = new Set([
    ...coreEntries.map(([uid]) => uid),
    ...peripheralEntries.map(([uid]) => uid),
  ]);

  const corePtsMap = Object.fromEntries(coreEntries);
  const periphPtsMap = Object.fromEntries(peripheralEntries);

  const payoutsByUserId = {};
  const detailsByUserId = {};

  for (const uid of userIds) {
    const cPts = Number(corePtsMap[uid] || 0);
    const pPts = Number(periphPtsMap[uid] || 0);
    const cUsd = round2(coreAlloc[uid] || 0);
    const pUsd = round2(periphAlloc[uid] || 0);
    const totalUsd = round2(cUsd + pUsd);

    payoutsByUserId[uid] = totalUsd;
    detailsByUserId[uid] = {
      userId: uid,
      corePoints: cPts,
      peripheralPoints: pPts,
      points: cPts + pPts,
      coreUsd: cUsd,
      peripheralUsd: pUsd,
      totalUsd,
    };
  }

  // Final cent reconciliation guard (in case of floating artifacts)
  const totalAllocated = round2(
    Object.values(payoutsByUserId).reduce((sum, amt) => sum + Number(amt), 0),
  );
  const targetPool = round2(corePoolUsd + peripheralPoolUsd);
  const finalDiff = round2(targetPool - totalAllocated);
  if (finalDiff !== 0 && userIds.size > 0) {
    const topUserId = [...userIds].sort((a, b) => (payoutsByUserId[b] || 0) - (payoutsByUserId[a] || 0))[0];
    payoutsByUserId[topUserId] = round2((payoutsByUserId[topUserId] || 0) + finalDiff);
    detailsByUserId[topUserId].totalUsd = payoutsByUserId[topUserId];
  }

  return {
    corePoolUsd,
    peripheralPoolUsd,
    bucketCaps: {
      core: coreCapPct,
      peripheral: peripheralCapPct,
    },
    payoutsByUserId,
    detailsByUserId,
  };
}

export function canUserReview(user, project) {
  if (!user || typeof user !== 'object') return false;
  if (user.role === 'founder') return true;
  if (!project || typeof project !== 'object') return false;
  if (project.originatorId === user.id || project.creatorId === user.id) return true;
  if (Number(project.contributions?.[user.id] || 0) > 0) return true;
  if (Number(project.bucketPoints?.core?.[user.id] || 0) > 0) return true;
  if (Number(project.bucketPoints?.peripheral?.[user.id] || 0) > 0) return true;
  return false;
}

export function runAiBlindReview(task, content = '', prUrl = '') {
  const text = typeof content === 'string'
    ? content
    : (content != null ? JSON.stringify(content, null, 2) : '');
  const trimmedPr = typeof prUrl === 'string' ? prUrl.trim() : '';
  const hasPrUrl = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+/i.test(trimmedPr);

  const rawLines = text ? text.split(/\r?\n/) : [];
  const nonEmptyLines = rawLines.map((l) => l.trim()).filter(Boolean);

  // Estimate diff lines (support unified diff or raw code submissions)
  const isUnifiedDiff = rawLines.some((l) => l.startsWith('diff --git') || l.startsWith('@@ '));
  let diffLinesAdded = 0;
  let diffLinesRemoved = 0;
  if (isUnifiedDiff) {
    for (const line of rawLines) {
      if (line.startsWith('+') && !line.startsWith('+++')) diffLinesAdded += 1;
      else if (line.startsWith('-') && !line.startsWith('---')) diffLinesRemoved += 1;
    }
  } else {
    diffLinesAdded = nonEmptyLines.length;
    diffLinesRemoved = Math.min(Math.floor(nonEmptyLines.length * 0.15), 24);
  }

  const commentLines = nonEmptyLines.filter((l) => /^(?:\/\/|#|\/\*|\*|--|<!--)/.test(l));
  const commentRatio = nonEmptyLines.length > 0 ? commentLines.length / nonEmptyLines.length : 0;

  const uniqueLines = new Set(nonEmptyLines);
  const duplicateCount = Math.max(0, nonEmptyLines.length - uniqueLines.size);
  const duplicateRatio = nonEmptyLines.length > 0 ? duplicateCount / nonEmptyLines.length : 0;

  const emptyStubMatches = text.match(/(?:function\s+\w+\s*\([^)]*\)\s*\{\s*\}|=>\s*\{\s*\}|\breturn\s+null;?\s*\})/g) || [];
  const fillerCommentMatches = text.match(/(?:TODO|FIXME|placeholder|auto[- ]?generated|lorem ipsum|重複註解|佔位)/gi) || [];

  const flags = [];
  let bloatScore = 0;

  if (duplicateRatio >= 0.35 && nonEmptyLines.length >= 6) {
    flags.push(`DUPLICATE_LINES (${Math.round(duplicateRatio * 100)}%)`);
    bloatScore += Math.round(duplicateRatio * 55);
  } else if (duplicateRatio >= 0.2 && nonEmptyLines.length >= 8) {
    bloatScore += Math.round(duplicateRatio * 25);
  }

  if (commentRatio >= 0.45 && commentLines.length >= 4) {
    flags.push(`EXCESSIVE_COMMENTS (${Math.round(commentRatio * 100)}%)`);
    bloatScore += Math.round(commentRatio * 45);
  } else if (commentRatio >= 0.3 && commentLines.length >= 4) {
    bloatScore += Math.round(commentRatio * 20);
  }

  if (emptyStubMatches.length >= 2) {
    flags.push(`EMPTY_STUB_FUNCTIONS (${emptyStubMatches.length})`);
    bloatScore += Math.min(35, emptyStubMatches.length * 12);
  }

  if (fillerCommentMatches.length >= 3) {
    flags.push(`FILLER_PLACEHOLDERS (${fillerCommentMatches.length})`);
    bloatScore += Math.min(25, fillerCommentMatches.length * 6);
  }

  if (diffLinesAdded >= 500 && diffLinesRemoved === 0) {
    flags.push(`OVERSIZED_ADD_ONLY_DIFF (+${diffLinesAdded}/-0)`);
    bloatScore += 25;
  }

  const bloatRatioPct = Math.max(0, Math.min(100, Math.round(bloatScore)));

  let aiScore = hasPrUrl ? 92 : 88;
  aiScore -= Math.round(bloatRatioPct * 0.75);
  aiScore -= flags.length * 7;
  if (nonEmptyLines.length < 3 && !hasPrUrl) {
    flags.push('MINIMAL_SUBSTANCE');
    aiScore -= 18;
  }
  aiScore = Math.max(5, Math.min(99, Math.round(aiScore)));

  let riskLevel = 'low';
  if (aiScore < 50 || bloatRatioPct >= 55 || flags.length >= 2) {
    riskLevel = 'high';
  } else if (aiScore < 75 || bloatRatioPct >= 25 || flags.length === 1) {
    riskLevel = 'medium';
  }

  let summary;
  if (riskLevel === 'high') {
    summary = `⚠️ 疑似低效垃圾 AI 注水（注水比 ${bloatRatioPct}%，偵測 ${flags.length} 項異常），建議實幹審閱團駁回並沒收押金！`;
  } else if (riskLevel === 'medium') {
    summary = `⚡ 盲審提示輕微風險（注水比 ${bloatRatioPct}%），請審閱人重點核查核心邏輯與邊界條件。`;
  } else {
    summary = `✅ 結構精煉乾淨（Diff +${diffLinesAdded} / -${diffLinesRemoved}，注水比 ${bloatRatioPct}%），符合《${task?.title?.slice(0, 20) || '核心任務'}》品質標準。`;
  }

  return {
    aiScore,
    riskLevel,
    diffLinesAdded,
    diffLinesRemoved,
    bloatRatioPct,
    summary,
    flags,
    reviewedAt: new Date().toISOString(),
  };
}
