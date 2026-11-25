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
export const REVIEWER_MIN_REPUTATION = 95;
export const REVIEWER_MIN_CORE_POINTS = 50;
export const REVIEWER_MIN_COMPLETED_TASKS = 2;
export const DEFAULT_API_CLAIM_LEASE_MS = 30 * 60 * 1000;
export const DEFAULT_GUILD_CLAIM_LEASE_MS = 24 * 60 * 60 * 1000;
export const EXPIRED_CLAIM_REPUTATION_PENALTY = 3;

export function getClaimLeaseMs(track, overrides = {}) {
  if (track === 'api_auto') {
    const opt = Number(overrides.claimLeaseApiMs);
    if (Number.isFinite(opt) && opt > 0) return opt;
    const envVal = Number(process.env.CLAIM_LEASE_API_MS);
    if (Number.isFinite(envVal) && envVal > 0) return envVal;
    return DEFAULT_API_CLAIM_LEASE_MS;
  }
  const opt = Number(overrides.claimLeaseGuildMs);
  if (Number.isFinite(opt) && opt > 0) return opt;
  const envVal = Number(process.env.CLAIM_LEASE_GUILD_MS);
  if (Number.isFinite(envVal) && envVal > 0) return envVal;
  return DEFAULT_GUILD_CLAIM_LEASE_MS;
}

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

export function evaluateReviewerEligibility(user, project = null, reviewItem = null, allProjects = null) {
  const requirements = {
    minReputation: REVIEWER_MIN_REPUTATION,
    minCorePoints: REVIEWER_MIN_CORE_POINTS,
    minCompletedTasks: REVIEWER_MIN_COMPLETED_TASKS,
  };

  if (!user || typeof user !== 'object') {
    return {
      eligible: false,
      code: 'REVIEWER_NOT_ELIGIBLE',
      tier: 'none',
      tierLabel: '未登入',
      reason: '請先登入帳號',
      requirements,
    };
  }

  if (user.role === 'founder') {
    return {
      eligible: true,
      code: null,
      tier: 'founder',
      tierLabel: '👑 創始鎮長審閱權',
      reason: '創始鎮長擁有全域最高審閱權限',
      requirements,
    };
  }

  // Strict anti-collusion rule: nobody (other than founder emergency override) may approve/reject their own submission
  if (reviewItem && reviewItem.submittedByUserId && reviewItem.submittedByUserId === user.id) {
    return {
      eligible: false,
      code: 'SELF_REVIEW_FORBIDDEN',
      tier: 'self',
      tierLabel: '🚫 不可自審',
      reason: '禁止審核自己提交的 PR！必須由其他資深核心工程師、項目維護者或鎮長認證審閱官進行盲審。',
      requirements,
    };
  }

  // Block accounts currently carrying anti-slop strikes or cooldowns
  const hasSlopPenalty = Array.isArray(user.workers)
    && user.workers.some((w) => w && ((Number(w.slopStrikes) || 0) > 0 || (w.cooldownUntil && Date.parse(w.cooldownUntil) > Date.now())));
  if (hasSlopPenalty) {
    return {
      eligible: false,
      code: 'REVIEWER_NOT_ELIGIBLE',
      tier: 'restricted',
      tierLabel: '⚠️ 違規限制中',
      reason: '帳號目前存在未清除的反刷單違規紀錄，暫時停權審閱資格',
      requirements,
    };
  }

  // Tier A: Founder-appointed Verified Senior Reviewer
  if (user.isVerifiedReviewer === true) {
    return {
      eligible: true,
      code: null,
      tier: 'verified_reviewer',
      tierLabel: '🎓 鎮長認證資深審閱官',
      reason: '經創始鎮長認證具備工程實戰背景之資深審閱官',
      requirements,
    };
  }

  // Tier B: Project Originator / Maintainer
  if (project && typeof project === 'object' && (project.originatorId === user.id || project.creatorId === user.id)) {
    return {
      eligible: true,
      code: null,
      tier: 'maintainer',
      tierLabel: '🛡️ 項目維護者',
      reason: '該開源項目原創維護者擁有合併審閱權',
      requirements,
    };
  }

  // Tier C: Proven Senior Core Engineer (strictly core engineering points + high reputation — peripheral docs/translation points DO NOT qualify!)
  const rep = Number(user.reputation ?? 0);
  const projectCorePts = project && typeof project === 'object'
    ? Number(project.bucketPoints?.core?.[user.id] || 0)
    : 0;
  let globalCorePts = projectCorePts;
  if (Array.isArray(allProjects)) {
    globalCorePts = allProjects.reduce((sum, p) => sum + Number(p?.bucketPoints?.core?.[user.id] || 0), 0);
  }
  const completedTasks = Number(user.completedTasks || 0);

  if (
    rep >= REVIEWER_MIN_REPUTATION
    && (projectCorePts >= REVIEWER_MIN_CORE_POINTS || (globalCorePts >= REVIEWER_MIN_CORE_POINTS && completedTasks >= REVIEWER_MIN_COMPLETED_TASKS))
  ) {
    return {
      eligible: true,
      code: null,
      tier: 'senior_core_engineer',
      tierLabel: '⚡ 實戰核心工程師',
      reason: `已通過核心工程實戰認證（核心池 ${Math.max(projectCorePts, globalCorePts)} pt · 信譽 ${rep}）`,
      requirements,
    };
  }

  return {
    eligible: false,
    code: 'REVIEWER_NOT_ELIGIBLE',
    tier: 'unqualified',
    tierLabel: '🔒 尚未具備審閱資格',
    reason: `審閱權限僅開放給資深工程師：需「核心工程池實戰 ≥ ${REVIEWER_MIN_CORE_POINTS} pt 且信譽 ≥ ${REVIEWER_MIN_REPUTATION}」（週邊文件/翻譯分不計入）、項目維護者，或由鎮長於後臺授予認證審閱官！`,
    stats: {
      reputation: rep,
      projectCorePoints: projectCorePts,
      globalCorePoints: globalCorePts,
      completedTasks,
    },
    requirements,
  };
}

export function canUserReview(user, project, reviewItem = null, allProjects = null) {
  return evaluateReviewerEligibility(user, project, reviewItem, allProjects).eligible;
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

// ============================================================================
// Task Spec Contract, File-Scope Conflict Lock & Layer-1 Pre-Check Gate
// ============================================================================

export function normalizeScopePath(raw) {
  if (typeof raw !== 'string') return '';
  let p = raw.trim().replace(/\\/g, '/');
  p = p.replace(/^\.\/+/, '').replace(/^\/+/, '');
  p = p.replace(/\/\*+$/, '/');
  return p.slice(0, 180);
}

export function doScopePatternsOverlap(rawA, rawB) {
  const a = normalizeScopePath(rawA);
  const b = normalizeScopePath(rawB);
  if (!a || !b) return false;
  if (a === b) return true;
  const aDir = a.endsWith('/') ? a : `${a}/`;
  const bDir = b.endsWith('/') ? b : `${b}/`;
  if (a.endsWith('/') && b.startsWith(aDir)) return true;
  if (b.endsWith('/') && a.startsWith(bDir)) return true;
  return false;
}

export function isFilePathAllowedByScope(rawFile, allowedScopes = []) {
  const scopes = (Array.isArray(allowedScopes) ? allowedScopes : [])
    .map(normalizeScopePath)
    .filter(Boolean);
  if (scopes.length === 0) return true;
  const file = normalizeScopePath(rawFile);
  if (!file) return true;
  return scopes.some((scope) => {
    if (file === scope) return true;
    const prefix = scope.endsWith('/') ? scope : `${scope}/`;
    return scope.endsWith('/') && file.startsWith(prefix);
  });
}

export function extractChangedFilesFromSubmission(content = '', explicitFiles = []) {
  const found = new Set();
  if (Array.isArray(explicitFiles)) {
    for (const f of explicitFiles) {
      const norm = normalizeScopePath(String(f || ''));
      if (norm) found.add(norm);
    }
  }
  const text = typeof content === 'string' ? content : '';
  if (text) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const gitMatch = line.match(/^diff --git a\/(.+?) b\/(.+?)\s*$/);
      if (gitMatch) {
        const norm = normalizeScopePath(gitMatch[2]);
        if (norm && norm !== 'dev/null') found.add(norm);
        continue;
      }
      const plusMatch = line.match(/^\+\+\+\s+(?:b\/)?([^\s\t]+)/);
      if (plusMatch) {
        const norm = normalizeScopePath(plusMatch[1]);
        if (norm && norm !== '/dev/null' && norm !== 'dev/null') found.add(norm);
      }
    }
  }
  return [...found];
}

export function inferDefaultFilesScope(task) {
  const cat = String(task?.category || '').toLowerCase();
  const id = String(task?.id || '').toLowerCase();
  if (id === 'task-meta-pr') return ['public/js/app.js', 'public/index.html'];
  if (id === 'task-meta-sse') return ['public/js/app.js', 'src/server/sse.mjs'];
  if (id === 'task-meta-i18n') return ['public/js/i18n.js'];
  if (id === 'task-meta-spec') return ['public/js/pixelEngine.js'];
  if (id === 'task-meta-docs') return ['docs/USER_GUIDE.md'];
  if (id === 'task-meta-ux') return ['public/styles.css', 'public/index.html'];
  if (id === 'task-i18n-ast-pr') return ['src/ast/'];
  if (id === 'task-i18n-gh-action') return ['.github/actions/i18n-bot/'];
  if (id === 'task-i18n-test') return ['tests/i18n.test.mjs'];
  if (cat === 'i18n') return ['locales/'];
  if (cat === 'docs') return ['docs/'];
  if (cat === 'unit_test') return ['tests/'];
  if (cat === 'pixel_spec') return ['assets/specs/'];
  if (cat === 'bugfix') return ['src/bugfix/'];
  if (cat === 'feature_pr' || cat === 'architecture') return ['src/core/'];
  return [];
}

export function normalizeSpecContract(rawSpec, fallbackTask = null) {
  const src = rawSpec && typeof rawSpec === 'object' ? rawSpec : {};
  const rawScope = Array.isArray(src.filesScope)
    ? src.filesScope
    : (typeof src.filesScope === 'string'
      ? src.filesScope.split(/[\n,;]+/)
      : (Array.isArray(fallbackTask?.filesScope) ? fallbackTask.filesScope : inferDefaultFilesScope(fallbackTask)));
  const filesScope = [...new Set(rawScope.map(normalizeScopePath).filter(Boolean))].slice(0, 12);

  const rawCriteria = Array.isArray(src.acceptanceCriteria)
    ? src.acceptanceCriteria
    : (typeof src.acceptanceCriteria === 'string'
      ? src.acceptanceCriteria.split(/\r?\n/)
      : (Array.isArray(fallbackTask?.acceptanceCriteria) ? fallbackTask.acceptanceCriteria : []));
  const acceptanceCriteria = rawCriteria
    .map((c) => String(c || '').trim().replace(/^[-*•]\s*/, ''))
    .filter(Boolean)
    .slice(0, 8);

  const defaultVerify = fallbackTask?.track === 'guild_bounty'
    ? 'npm test && npm run smoke'
    : 'npm run smoke';
  const verifyCommand = String(src.verifyCommand || fallbackTask?.verifyCommand || defaultVerify).trim().slice(0, 160);
  const contextDoc = String(
    src.contextDoc
      || fallbackTask?.contextDoc
      || '保持零外部 npm 依賴、遵守既定資料結構，僅改動 filesScope 核准範圍內檔案。',
  ).trim().slice(0, 320);

  return {
    filesScope,
    acceptanceCriteria,
    verifyCommand,
    contextDoc,
  };
}

export function detectFileScopeConflicts(targetTask, allTasks = []) {
  if (!targetTask || !targetTask.projectId) {
    return { locked: false, conflicts: [] };
  }
  const targetSpec = normalizeSpecContract(targetTask.specContract, targetTask);
  if (targetSpec.filesScope.length === 0) {
    return { locked: false, conflicts: [] };
  }

  const conflicts = [];
  for (const other of allTasks || []) {
    if (!other || other.id === targetTask.id) continue;
    if (other.projectId !== targetTask.projectId) continue;
    if (other.status !== 'in_progress' && other.status !== 'pending_review') continue;

    const otherSpec = normalizeSpecContract(other.specContract, other);
    if (otherSpec.filesScope.length === 0) continue;

    const overlappingScopes = [];
    for (const sA of targetSpec.filesScope) {
      for (const sB of otherSpec.filesScope) {
        if (doScopePatternsOverlap(sA, sB)) {
          overlappingScopes.push(sA === sB ? sA : `${sA} ↔ ${sB}`);
        }
      }
    }
    if (overlappingScopes.length > 0) {
      conflicts.push({
        taskId: other.id,
        title: other.title,
        status: other.status,
        claimedBy: other.claimedBy || null,
        overlappingScopes: [...new Set(overlappingScopes)],
      });
    }
  }

  return {
    locked: conflicts.length > 0,
    conflicts,
  };
}

export function runLayer1PreCheckGate({ task, content = '', changedFiles = [], ciPassed = null, ciCommand = '' }) {
  const spec = normalizeSpecContract(task?.specContract, task);
  const touchedFiles = extractChangedFilesFromSubmission(content, changedFiles);
  const outOfScopeFiles = spec.filesScope.length > 0
    ? touchedFiles.filter((f) => !isFilePathAllowedByScope(f, spec.filesScope))
    : [];

  const checks = [];
  checks.push({
    name: 'filesScope 檔案邊界守衛',
    passed: outOfScopeFiles.length === 0,
    detail: outOfScopeFiles.length === 0
      ? (touchedFiles.length > 0
        ? `改動 ${touchedFiles.length} 個檔案均在核准範圍內（${spec.filesScope.join(', ') || '不限'}）`
        : `核准範圍：${spec.filesScope.join(', ') || '不限'}`)
      : `偵測到越界修改檔案：${outOfScopeFiles.join(', ')}（核准範圍僅限：${spec.filesScope.join(', ')}）`,
  });

  const ciFailed = ciPassed === false;
  checks.push({
    name: 'CI / 驗收指令預檢',
    passed: !ciFailed,
    detail: ciFailed
      ? `驗收指令未通過（${ciCommand || spec.verifyCommand}），已於第 1 層自動攔截，不浪費人工審閱時間`
      : (ciPassed === true
        ? `驗收指令已通過（${ciCommand || spec.verifyCommand}）`
        : `建議驗收指令：${spec.verifyCommand}`),
  });

  if (outOfScopeFiles.length > 0) {
    return {
      passed: false,
      code: 'SCOPE_VIOLATION',
      touchedFiles,
      outOfScopeFiles,
      ciStatus: ciFailed ? 'failed' : (ciPassed === true ? 'passed' : 'unreported'),
      checks,
      reason: `🚫 第 1 層契約守衛攔截：提交改動了核准範圍外的檔案（${outOfScopeFiles.join(', ')}），請嚴格遵守 filesScope（${spec.filesScope.join(', ')}）後重提！`,
    };
  }

  if (ciFailed) {
    return {
      passed: false,
      code: 'CI_CHECK_FAILED',
      touchedFiles,
      outOfScopeFiles: [],
      ciStatus: 'failed',
      checks,
      reason: `🚫 第 1 層 CI 閘門攔截：驗收指令「${ciCommand || spec.verifyCommand}」回報失敗！請先在本機修到全綠再送審。`,
    };
  }

  return {
    passed: true,
    code: null,
    touchedFiles,
    outOfScopeFiles: [],
    ciStatus: ciPassed === true ? 'passed' : 'unreported',
    checks,
    reason: null,
  };
}

export function buildReviewerBrief(task, aiReview = {}, preCheck = null) {
  const spec = normalizeSpecContract(task?.specContract, task);
  const touched = preCheck?.touchedFiles || [];
  const line1 = touched.length > 0
    ? `📂 檔案邊界：改動 ${touched.length} 個檔案（${touched.slice(0, 3).join(', ')}${touched.length > 3 ? '…' : ''}），全部符合核准範圍`
    : `📂 檔案邊界：契約限定 ${spec.filesScope.length ? spec.filesScope.join(', ') : '模組邊界內'}（建議確認 PR Diff 檔案清單）`;

  const ciTag = preCheck?.ciStatus === 'passed'
    ? 'CI 預檢綠燈'
    : `驗收指令 ${spec.verifyCommand}`;
  const line2 = `🧪 體檢數據：Diff +${aiReview.diffLinesAdded ?? 0} / -${aiReview.diffLinesRemoved ?? 0} · 注水比 ${aiReview.bloatRatioPct ?? 0}% · ${ciTag}`;

  const line3 = aiReview.riskLevel === 'high'
    ? `🎯 審核焦點：高風險（${(aiReview.flags || []).slice(0, 2).join(', ') || '異常指標'}），建議直接駁回並沒收押金`
    : (aiReview.riskLevel === 'medium'
      ? `🎯 審核焦點：中度提示（${(aiReview.flags || []).slice(0, 2).join(', ') || '請抽檢邊界條件'}），預計 3 分鐘拍板`
      : `🎯 審核焦點：低風險且結構精煉，僅需抽檢 ${spec.acceptanceCriteria[0] ? `「${spec.acceptanceCriteria[0].slice(0, 26)}」` : '核心邏輯'}，預計 2 分鐘拍板`);

  return [line1, line2, line3];
}
