// PixelCompute Town — Proof of First Spark (Idea Provenance Hash Chain & Anti-Copycat Engine)
// Zero external npm dependencies (Node.js native node:crypto)

import crypto from 'node:crypto';

export const GENESIS_HASH = '0'.repeat(64);
export const COPYCAT_HIGH_THRESHOLD = 0.65;
export const COPYCAT_WARN_THRESHOLD = 0.40;

/**
 * Compute immutable SHA-256 idea fingerprint (64-char lowercase hex).
 */
export function computeIdeaHash({
  name = '',
  tagline = '',
  description = '',
  originatorId = '',
  originatedAt = '',
  prevIdeaHash = GENESIS_HASH,
} = {}) {
  const canonical = JSON.stringify({
    protocol: 'PCT-POFS-v1',
    name: String(name || '').trim(),
    tagline: String(tagline || '').trim(),
    description: String(description || '').trim(),
    originatorId: String(originatorId || '').trim(),
    originatedAt: String(originatedAt || '').trim(),
    prevIdeaHash: String(prevIdeaHash || GENESIS_HASH).trim(),
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Tokenize mixed Chinese/CJK (character 2-grams) and English/alphanumeric (normalized words).
 */
export function tokenizeIdeaText(text) {
  const tokens = new Set();
  const normalized = String(text || '').normalize('NFKC').toLowerCase().trim();
  if (!normalized) return tokens;

  // English / alphanumeric normalized words
  const enMatches = normalized.match(/[a-z0-9]+/g);
  if (enMatches) {
    for (const word of enMatches) {
      tokens.add(`en:${word}`);
    }
  }

  // CJK character 2-grams (with single-char fallback for 1-char runs)
  const cjkRuns = normalized.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]+/g);
  if (cjkRuns) {
    for (const run of cjkRuns) {
      if (run.length === 1) {
        tokens.add(`zh:${run}`);
      } else {
        for (let i = 0; i < run.length - 1; i += 1) {
          tokens.add(`zh:${run.slice(i, i + 2)}`);
        }
      }
    }
  }

  return tokens;
}

/**
 * Compute Jaccard similarity (0.0 ~ 1.0) supporting both Chinese (2-grams) and English (normalized words).
 */
export function computeSimilarity(textA, textB) {
  const normA = String(textA || '').normalize('NFKC').toLowerCase().trim();
  const normB = String(textB || '').normalize('NFKC').toLowerCase().trim();
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const setA = tokenizeIdeaText(normA);
  const setB = tokenizeIdeaText(normB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  for (const tok of smaller) {
    if (larger.has(tok)) intersection += 1;
  }

  const union = setA.size + setB.size - intersection;
  if (union <= 0) return 0;
  return Math.round((intersection / union) * 10000) / 10000;
}

/**
 * Find the most similar existing projects for anti-copycat detection.
 * Returns sorted array of { projectId, name, originatorName, originatedAt, ideaHash, similarity }.
 */
export function findSimilarIdeas(candidate, projects = [], options = {}) {
  const list = Array.isArray(projects) ? projects : [];
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 5;
  const minSimilarity = typeof options.minSimilarity === 'number' ? options.minSimilarity : 0.05;
  const excludeProjectId = options.excludeProjectId || null;

  const candObj = typeof candidate === 'string' ? { name: candidate } : (candidate || {});
  const candName = String(candObj.name || '').trim();
  const candTagline = String(candObj.tagline || '').trim();
  const candDesc = String(candObj.description || '').trim();
  const candCombined = [candName, candTagline, candDesc].filter(Boolean).join(' ');

  if (!candCombined) return [];

  const matches = [];

  for (const proj of list) {
    if (!proj || (excludeProjectId && proj.id === excludeProjectId)) continue;

    const projName = String(proj.name || '').trim();
    const projShort = String(proj.shortName || '').trim();
    const projTagline = String(proj.tagline || '').trim();
    const projDesc = String(proj.description || '').trim();

    const nameSim = candName
      ? Math.max(
        computeSimilarity(candName, projName),
        projShort ? computeSimilarity(candName, projShort) : 0,
      )
      : 0;
    const taglineSim = (candTagline && projTagline)
      ? computeSimilarity(candTagline, projTagline)
      : 0;
    const descSim = (candDesc && projDesc)
      ? computeSimilarity(candDesc, projDesc)
      : 0;

    // Compare candidate against matched fields of project so omitting optional description doesn't dilute score
    const projMatched = [
      candName ? projName : '',
      candTagline ? projTagline : '',
      candDesc ? projDesc : '',
    ].filter(Boolean).join(' ');
    const matchedSim = projMatched ? computeSimilarity(candCombined, projMatched) : 0;

    // Also compare full combined text to detect cross-field copy-pasting (e.g. tagline pasted into description)
    const projAll = [projName, projTagline, projDesc].filter(Boolean).join(' ');
    const allSim = projAll ? computeSimilarity(candCombined, projAll) : 0;

    const similarity = Math.max(nameSim, taglineSim, descSim, matchedSim, allSim);

    if (similarity >= minSimilarity) {
      matches.push({
        projectId: proj.id,
        name: proj.name,
        shortName: proj.shortName || proj.name,
        originatorId: proj.originatorId || proj.creatorId || '',
        originatorName: proj.originatorName || proj.creatorName || '',
        originatedAt: proj.originatedAt || proj.createdAt || '',
        ideaHash: proj.ideaHash || '',
        similarity,
      });
    }
  }

  matches.sort((a, b) => {
    if (b.similarity !== a.similarity) return b.similarity - a.similarity;
    return String(a.originatedAt).localeCompare(String(b.originatedAt));
  });

  return matches.slice(0, limit);
}

/**
 * Verify the complete SHA-256 idea provenance hash chain in ascending provenanceIndex order.
 */
export function verifyProvenanceChain(projects = []) {
  const list = Array.isArray(projects) ? [...projects] : [];
  list.sort((a, b) => {
    const idxA = Number.isInteger(a?.provenanceIndex) ? a.provenanceIndex : Number.MAX_SAFE_INTEGER;
    const idxB = Number.isInteger(b?.provenanceIndex) ? b.provenanceIndex : Number.MAX_SAFE_INTEGER;
    if (idxA !== idxB) return idxA - idxB;
    return String(a?.originatedAt || a?.createdAt || '').localeCompare(
      String(b?.originatedAt || b?.createdAt || ''),
    );
  });

  let expectedPrevHash = GENESIS_HASH;
  const records = [];

  for (let idx = 0; idx < list.length; idx += 1) {
    const p = list[idx];
    const originatorId = p.originatorId || p.creatorId || '';
    const originatorName = p.originatorName || p.creatorName || '';
    const originatedAt = p.originatedAt || p.createdAt || '';
    const storedHash = typeof p.ideaHash === 'string' ? p.ideaHash : '';
    const storedPrevHash = typeof p.prevIdeaHash === 'string' ? p.prevIdeaHash : '';
    const storedIndex = Number.isInteger(p.provenanceIndex) ? p.provenanceIndex : -1;

    const expectedHash = computeIdeaHash({
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      originatorId,
      originatedAt,
      prevIdeaHash: storedPrevHash,
    });

    const verified = (
      storedIndex === idx
      && storedPrevHash === expectedPrevHash
      && storedHash.length === 64
      && storedHash === expectedHash
    );

    records.push({
      projectId: p.id,
      name: p.name,
      originatorId,
      originatorName,
      originatedAt,
      ideaHash: storedHash,
      prevIdeaHash: storedPrevHash,
      provenanceIndex: storedIndex >= 0 ? storedIndex : idx,
      verified,
    });

    expectedPrevHash = storedHash || expectedHash;
  }

  const valid = records.every((r) => r.verified);
  const headHash = records.length > 0 ? records[records.length - 1].ideaHash : GENESIS_HASH;

  return {
    valid,
    chainLength: records.length,
    headHash,
    genesisHash: GENESIS_HASH,
    records,
  };
}

function resolveUsername(userId, usersMap = {}, fallbackName = '') {
  if (usersMap && usersMap[userId]?.username) {
    return usersMap[userId].username;
  }
  const knownNpcHandles = {
    'founder-demo': 'founder-dev',
    'npc-kuro': 'kuro-dev',
    'npc-momo': 'momo-pixel',
    'npc-yuna': 'yuna-ai',
    'npc-rin': 'rin-cli',
    'npc-zero': 'zero-byte',
  };
  if (knownNpcHandles[userId]) return knownNpcHandles[userId];
  return String(userId || fallbackName || 'builder').replace(/[^a-zA-Z0-9_-]/g, '') || 'builder';
}

/**
 * Backfill missing provenance, hash chain, coBuilders, and 5/85/10 split fields
 * for newly seeded projects or legacy saved states.
 * Does NOT overwrite an already-present ideaHash (preserves tamper detection).
 */
export function ensureProjectsProvenance(projects = [], usersMap = {}) {
  if (!Array.isArray(projects)) return projects;
  const now = new Date().toISOString();

  let prevHash = GENESIS_HASH;

  for (let idx = 0; idx < projects.length; idx += 1) {
    const p = projects[idx];
    if (!p || typeof p !== 'object') continue;

    // Originator metadata
    p.originatorId = p.originatorId || p.creatorId || 'founder-demo';
    p.originatorName = p.originatorName || p.creatorName || '創始鎮長 (Demo)';
    p.originatedAt = p.originatedAt || p.createdAt || now;
    if (!p.creatorId) p.creatorId = p.originatorId;
    if (!p.creatorName) p.creatorName = p.originatorName;

    // 5/85/10 Merit Split fields + legacy aliases
    if (p.sparkRoyaltyPct == null || !Number.isFinite(Number(p.sparkRoyaltyPct))) p.sparkRoyaltyPct = 5;
    if (p.meritPoolPct == null || !Number.isFinite(Number(p.meritPoolPct))) p.meritPoolPct = 85;
    if (p.platformSharePct == null || !Number.isFinite(Number(p.platformSharePct))) p.platformSharePct = 10;
    p.creatorSharePct = p.sparkRoyaltyPct;
    p.contributorsSharePct = p.meritPoolPct;
    p.revenueSplit = {
      originatorSparkPct: p.sparkRoyaltyPct,
      meritPoolPct: p.meritPoolPct,
      platformPct: p.platformSharePct,
    };

    if (p.inspiredByHash === undefined) {
      p.inspiredByHash = null;
    }

    // Co-builders list (always includes originator)
    if (!Array.isArray(p.coBuilders) || p.coBuilders.length === 0) {
      const initialBuilders = [
        {
          userId: p.originatorId,
          username: resolveUsername(p.originatorId, usersMap, p.originatorName),
          displayName: p.originatorName,
          joinedAt: p.originatedAt,
        },
      ];
      if (p.contributorNames && typeof p.contributorNames === 'object') {
        for (const [cid, cname] of Object.entries(p.contributorNames)) {
          if (!cid || cid === p.originatorId) continue;
          initialBuilders.push({
            userId: cid,
            username: resolveUsername(cid, usersMap, cname),
            displayName: cname || cid,
            joinedAt: p.originatedAt,
          });
        }
      }
      p.coBuilders = initialBuilders;
    }

    // Hash chain backfill ONLY if missing (never mask tampered hashes)
    const hasExistingHash = typeof p.ideaHash === 'string' && p.ideaHash.length > 0;
    if (!hasExistingHash) {
      p.provenanceIndex = Number.isInteger(p.provenanceIndex) ? p.provenanceIndex : idx;
      p.prevIdeaHash = (typeof p.prevIdeaHash === 'string' && p.prevIdeaHash.length > 0)
        ? p.prevIdeaHash
        : prevHash;
      p.ideaHash = computeIdeaHash({
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        originatorId: p.originatorId,
        originatedAt: p.originatedAt,
        prevIdeaHash: p.prevIdeaHash,
      });
    } else {
      if (!Number.isInteger(p.provenanceIndex)) {
        p.provenanceIndex = idx;
      }
      if (typeof p.prevIdeaHash !== 'string' || !p.prevIdeaHash) {
        p.prevIdeaHash = prevHash;
      }
    }

    prevHash = p.ideaHash;
  }

  return projects;
}
