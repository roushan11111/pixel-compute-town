// PixelCompute Town — Proof of Accepted Work (Anti-Slop & Output Verifier)

const GITHUB_PR_REGEX = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)(?:\/.*)?$/i;
const GITHUB_PR_INLINE_REGEX = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)/i;

const SLOP_PATTERNS = [
  /lorem ipsum/i,
  /^(test\s*){3,}$/i,
  /^(asdf|qwer|zxcv|123456|hello world|todo|tbd|placeholder)+$/i,
  /隨便寫|敷衍一下|測試測試測試|不知道寫什麼|佔位符而已/,
];

export function validateGitHubPrUrl(rawUrl) {
  if (typeof rawUrl !== 'string') {
    return { valid: false, reason: 'PR 連結必須為字串' };
  }
  const trimmed = rawUrl.trim();
  const match = trimmed.match(GITHUB_PR_REGEX);
  if (!match) {
    return {
      valid: false,
      reason: '無效的 GitHub PR 網址格式，需為 https://github.com/<owner>/<repo>/pull/<number>',
    };
  }
  return {
    valid: true,
    owner: match[1],
    repo: match[2],
    pullNumber: Number(match[3]),
    url: `https://github.com/${match[1]}/${match[2]}/pull/${match[3]}`,
  };
}

function extractJsonCandidate(text) {
  const trimmed = text.trim();
  // Try raw JSON first
  try {
    return { parsed: JSON.parse(trimmed), extracted: trimmed };
  } catch {
    // Try fenced ```json ... ``` block
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try {
      return { parsed: JSON.parse(fenced[1].trim()), extracted: fenced[1].trim() };
    } catch {
      // fall through
    }
  }

  // Try locating outermost { ... } or [ ... ]
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const slice = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return { parsed: JSON.parse(slice), extracted: slice };
    } catch {
      // fall through
    }
  }

  return null;
}

function detectSlop(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return { isSlop: true, detail: '提交內容為空' };
  }

  // Repeated single character spam (e.g., "aaaaaaaaaaaa" or "哈哈哈哈哈哈哈哈哈哈")
  if (/(.)\1{9,}/.test(normalized)) {
    return { isSlop: true, detail: '偵測到大量重複字元（疑似灌水）' };
  }

  for (const rx of SLOP_PATTERNS) {
    if (rx.test(normalized)) {
      return { isSlop: true, detail: '偵測到佔位符或敷衍測試字串（AI Slop 攔截）' };
    }
  }

  // Token diversity check for whitespace-separated languages & CJK bigram diversity
  const words = normalized.toLowerCase().split(/[\s,.;:!?()[\]{}"'`]+/).filter(Boolean);
  if (words.length >= 16) {
    const uniqueWords = new Set(words);
    const ratio = uniqueWords.size / words.length;
    if (ratio < 0.22) {
      return {
        isSlop: true,
        detail: `內容詞彙重複率過高（多樣性僅 ${(ratio * 100).toFixed(0)}%），疑似重複廢話`,
      };
    }
  }

  // CJK bigram diversity check for Chinese-heavy spam
  const cjkChars = normalized.replace(/[^\u4e00-\u9fff]/g, '');
  if (cjkChars.length >= 30) {
    const bigrams = [];
    for (let i = 0; i < cjkChars.length - 1; i += 1) {
      bigrams.push(cjkChars.slice(i, i + 2));
    }
    const uniqueBigrams = new Set(bigrams);
    const ratio = uniqueBigrams.size / bigrams.length;
    if (ratio < 0.28) {
      return {
        isSlop: true,
        detail: `中文內容高度重複（有效資訊密度 ${(ratio * 100).toFixed(0)}%），判定為無效灌水`,
      };
    }
  }

  // Repeated identical lines
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 4);
  if (lines.length >= 6) {
    const uniqueLines = new Set(lines);
    if (uniqueLines.size / lines.length < 0.35) {
      return { isSlop: true, detail: '偵測到多行重複複製貼上內容' };
    }
  }

  return { isSlop: false, detail: '通過反垃圾產出與資訊密度檢查' };
}

function hasCodeFeatures(text) {
  const patterns = [
    /```[\s\S]{15,}```/,
    /\b(function|const|let|var|export|import|class|return|async|await|interface|type)\b/,
    /=>/,
    /(diff --git|\+\+\+ b\/|@@ -\d+)/,
    /\b(def |pub fn |func |SELECT |CREATE TABLE)/,
    /on:\s*\n\s*(pull_request|push)/,
  ];
  let matched = 0;
  for (const p of patterns) {
    if (p.test(text)) matched += 1;
  }
  return matched >= 2 || (/```[\s\S]{25,}```/.test(text) && matched >= 1);
}

export function verifySubmission(task, payload = {}) {
  const rawContent = typeof payload.content === 'string'
    ? payload.content
    : (payload.content != null ? JSON.stringify(payload.content, null, 2) : '');
  const prUrl = typeof payload.prUrl === 'string' ? payload.prUrl.trim() : '';
  const combinedText = [rawContent.trim(), prUrl].filter(Boolean).join('\n').trim();

  const checks = [];
  let score = 0;

  // Check 1: Non-empty & minimum substantive length
  const prCheckInline = combinedText.match(GITHUB_PR_INLINE_REGEX);
  const prExplicitValid = prUrl ? validateGitHubPrUrl(prUrl).valid : false;
  const hasValidPr = prExplicitValid || Boolean(prCheckInline);

  const minLen = hasValidPr ? 24 : 40;
  const lengthPassed = combinedText.length >= minLen;
  checks.push({
    name: '基礎完整度檢查',
    passed: lengthPassed,
    detail: lengthPassed
      ? `交付內容共 ${combinedText.length} 字元，符合基本長度要求`
      : `交付內容過短（僅 ${combinedText.length} 字元，需至少 ${minLen} 字元或附有效 GitHub PR 連結）`,
  });
  if (lengthPassed) score += 25;

  // Check 2: Anti-Slop detection
  const slopResult = detectSlop(rawContent || combinedText);
  const antiSlopPassed = !slopResult.isSlop;
  checks.push({
    name: 'AI Slop 反灌水偵測',
    passed: antiSlopPassed,
    detail: slopResult.detail,
  });
  if (antiSlopPassed) score += 25;

  // Check 3: Category-specific acceptance rules
  const category = task?.category || 'general';
  let categoryPassed = true;
  let categoryDetail = '結構與任務類別相符';

  if (category === 'i18n' || category === 'pixel_spec') {
    const jsonCandidate = extractJsonCandidate(rawContent);
    if (!jsonCandidate || typeof jsonCandidate.parsed !== 'object' || jsonCandidate.parsed === null) {
      categoryPassed = false;
      categoryDetail = `${category} 類任務必須提交可解析的合法 JSON 物件`;
    } else {
      const keys = Object.keys(jsonCandidate.parsed);
      if (keys.length < 2) {
        categoryPassed = false;
        categoryDetail = `JSON 物件欄位過少（僅 ${keys.length} 個頂層鍵，至少需 2 個有效鍵值）`;
      } else {
        categoryPassed = true;
        categoryDetail = `JSON 語法合法，偵測到 ${keys.length} 個頂層鍵（${keys.slice(0, 4).join(', ')}）`;
      }
    }
  } else if (category === 'feature_pr' || category === 'bugfix') {
    if (prUrl && !prExplicitValid) {
      categoryPassed = false;
      categoryDetail = '填寫的 GitHub PR URL 格式不合法（需為 https://github.com/owner/repo/pull/編號）';
    } else if (hasValidPr) {
      categoryPassed = true;
      categoryDetail = `偵測到合法 GitHub PR 連結（${prExplicitValid ? prUrl : prCheckInline[0]}）`;
    } else if (hasCodeFeatures(rawContent) && rawContent.trim().length >= 70) {
      categoryPassed = true;
      categoryDetail = '偵測到有效程式碼實作特徵與函式結構';
    } else {
      categoryPassed = false;
      categoryDetail = '程式碼類懸賞任務需附帶合法 GitHub PR 連結，或包含實質程式碼實作（>= 70 字元）';
    }
  } else if (category === 'unit_test') {
    const hasTestSyntax = /\b(test|it|describe|assert|expect)\s*\(/.test(rawContent)
      || /node:test|node:assert/.test(rawContent);
    if (hasTestSyntax && rawContent.trim().length >= 60) {
      categoryPassed = true;
      categoryDetail = '偵測到標準單元測試語法與斷言結構';
    } else {
      categoryPassed = false;
      categoryDetail = '單元測試任務需包含 test()/assert/expect 等測試斷言語法';
    }
  } else {
    const hasStructure = /(^|\n)\s*(#{1,3}\s|[-*]\s|\d+\.\s|\|.+\|)/m.test(rawContent)
      || rawContent.trim().length >= 80;
    if (hasStructure) {
      categoryPassed = true;
      categoryDetail = '文件／巡檢報告具備清晰結構與實質內容';
    } else {
      categoryPassed = false;
      categoryDetail = '文件或巡檢任務需具備標題／條列結構或足夠說明內容（>= 80 字元）';
    }
  }

  checks.push({
    name: `專項結構驗收 (${category})`,
    passed: categoryPassed,
    detail: categoryDetail,
  });
  if (categoryPassed) score += 35;

  // Check 4: Richness / Quality bonus
  const hasRichDetail = combinedText.length >= 140 || (hasValidPr && rawContent.trim().length >= 60);
  checks.push({
    name: '交付細緻度評分',
    passed: hasRichDetail,
    detail: hasRichDetail
      ? '內容詳盡度高，符合公開開源協作品質標準'
      : '內容偏精簡，建議補充更多註解或驗證細節以獲更高評分',
  });
  score += hasRichDetail ? 15 : 8;

  const passed = lengthPassed && antiSlopPassed && categoryPassed;
  if (!passed) {
    score = Math.min(score, 45);
  } else {
    score = Math.min(100, Math.max(70, score));
  }

  const failedChecks = checks.filter((c) => !c.passed);
  const reason = passed
    ? `驗收通過（品質評分 ${score}/100）：所有 Proof of Accepted Work 規則皆達標。`
    : `驗收未通過：${failedChecks.map((c) => c.detail).join('；')}（0 貢獻值，信譽分 -2）`;

  return {
    passed,
    score,
    checks,
    reason,
    verifiedAt: new Date().toISOString(),
  };
}
