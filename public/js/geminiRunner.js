/**
 * PixelCompute Town — 零信任瀏覽器端 BYOK 執行器
 *
 * 安全設計原則：
 * 1. 所有 API Key 僅保存於瀏覽器 localStorage，絕不傳送至後端伺服器。
 * 2. Gemini API 為一等公民，直接由瀏覽器呼叫 generativelanguage.googleapis.com。
 * 3. 相容任意 OpenAI-compatible Endpoint（OpenRouter / DeepSeek / 本地 Ollama 等）。
 * 4. 未設定 Key 時自動進入高品質擬真體驗模式，讓開發者零門檻體驗完整雙軌流程。
 */

const STORAGE_KEY = 'pixel_compute_town_byok_v1';

export const DEFAULT_BYOK_CONFIG = Object.freeze({
  provider: 'gemini', // 'gemini' | 'openai_compat'
  apiKey: '',
  model: 'gemini-2.5-flash',
  baseUrl: 'https://openrouter.ai/api/v1',
  maxTokensPerTask: 2048,
  temperature: 0.35,
});

export const PRESET_MODELS = Object.freeze({
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash（高性價比推薦）' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro（複雜推理與架構）' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash（極速微任務）' },
  ],
  openai_compat: [
    { id: 'google/gemini-2.5-flash', label: 'OpenRouter · Gemini 2.5 Flash' },
    { id: 'deepseek-chat', label: 'DeepSeek Chat (V3)' },
    { id: 'gpt-4.1-mini', label: 'OpenAI · GPT-4.1 mini' },
    { id: 'qwen2.5-coder:7b', label: 'Ollama 本地 · Qwen 2.5 Coder 7B' },
  ],
});

export function getByokConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BYOK_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BYOK_CONFIG,
      ...parsed,
      maxTokensPerTask: clampInt(parsed.maxTokensPerTask, 256, 16384, DEFAULT_BYOK_CONFIG.maxTokensPerTask),
      temperature: clampFloat(parsed.temperature, 0, 1.5, DEFAULT_BYOK_CONFIG.temperature),
    };
  } catch {
    return { ...DEFAULT_BYOK_CONFIG };
  }
}

export function saveByokConfig(partial) {
  const next = {
    ...getByokConfig(),
    ...partial,
  };
  next.provider = next.provider === 'openai_compat' ? 'openai_compat' : 'gemini';
  next.apiKey = String(next.apiKey || '').trim();
  next.model = String(next.model || DEFAULT_BYOK_CONFIG.model).trim();
  next.baseUrl = String(next.baseUrl || DEFAULT_BYOK_CONFIG.baseUrl).trim().replace(/\/+$/, '');
  next.maxTokensPerTask = clampInt(next.maxTokensPerTask, 256, 16384, DEFAULT_BYOK_CONFIG.maxTokensPerTask);
  next.temperature = clampFloat(next.temperature, 0, 1.5, DEFAULT_BYOK_CONFIG.temperature);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors in private mode
  }
  return next;
}

export function clearByokKey() {
  return saveByokConfig({ apiKey: '' });
}

export function hasLiveApiKey(cfg = getByokConfig()) {
  const key = String(cfg?.apiKey || '').trim();
  if (key.length > 0) return true;
  // 本地 Ollama 可免金鑰呼叫
  if (cfg?.provider === 'openai_compat' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(cfg?.baseUrl || '')) {
    return true;
  }
  return false;
}

export function isJsonExpectedTask(task) {
  const cat = String(task?.category || task?.taskType || task?.type || '').toLowerCase();
  const title = String(task?.title || '').toLowerCase();
  const criteria = Array.isArray(task?.acceptanceCriteria)
    ? task.acceptanceCriteria.join(' ').toLowerCase()
    : String(task?.acceptanceCriteria || '').toLowerCase();
  if (cat.includes('feature_pr') || cat.includes('bugfix') || cat.includes('unit_test')) {
    return false;
  }
  return (
    cat.includes('i18n') ||
    cat.includes('pixel_spec') ||
    cat.includes('json') ||
    criteria.includes('合法 json') ||
    criteria.includes('json 物件')
  );
}

export function buildTaskPrompt(task, project = null) {
  const criteriaText = Array.isArray(task?.acceptanceCriteria)
    ? task.acceptanceCriteria.map((c, idx) => `${idx + 1}. ${c}`).join('\n')
    : String(task?.acceptanceCriteria || '輸出結構完整、可直接被專案採用且無冗餘廢話。');

  const jsonHint = isJsonExpectedTask(task)
    ? '\n【格式硬性要求】請僅輸出合法的純 JSON（不要使用 Markdown 程式碼圍欄以外的多餘說明文字）。'
    : '\n【格式要求】請使用清晰結構化的繁體中文與標準程式碼區塊輸出可直接落地驗收的成果。';

  const sampleText =
    typeof task?.sampleInput === 'object' && task.sampleInput !== null
      ? JSON.stringify(task.sampleInput, null, 2)
      : String(task?.sampleInput || '');

  return [
    `你是像素算力鎮（PixelCompute Town）的專業 AI 工程師，正在協助項目「${project?.name || task?.projectId || '創世專案'}」。`,
    `任務標題：${task?.title || '標準化微任務'}`,
    `任務類別：${task?.category || task?.taskType || 'api_auto'}`,
    task?.promptTemplate ? `\n【任務指令】\n${task.promptTemplate}` : '',
    sampleText ? `\n【參考輸入資料】\n${sampleText}` : '',
    `\n【驗收標準（Proof of Accepted Work）】\n${criteriaText}`,
    jsonHint,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function testConnection(cfgOverride) {
  const cfg = cfgOverride ? { ...getByokConfig(), ...cfgOverride } : getByokConfig();
  const startedAt = performance.now();

  if (!hasLiveApiKey(cfg)) {
    return {
      ok: true,
      mode: 'simulated',
      latencyMs: 12,
      model: cfg.model,
      message: '未設定 API Key，目前為「零門檻擬真體驗模式」。填入 Gemini Key 後即可直連真實模型（Key 永不離開瀏覽器）。',
    };
  }

  try {
    if (cfg.provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with strictly: OK' }] }],
          generationConfig: { maxOutputTokens: 16, temperature: 0 },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = data?.error?.message || `HTTP ${res.status}`;
        return {
          ok: false,
          mode: 'live',
          latencyMs: Math.round(performance.now() - startedAt),
          model: cfg.model,
          message: `Gemini API 連線失敗：${errMsg}`,
        };
      }
      const reply = extractGeminiText(data);
      return {
        ok: true,
        mode: 'live',
        latencyMs: Math.round(performance.now() - startedAt),
        model: cfg.model,
        message: `Gemini API 連線成功（${Math.round(performance.now() - startedAt)}ms），模型回應：${reply.slice(0, 32) || 'OK'}`,
      };
    }

    // OpenAI-compatible Endpoint
    const endpoint = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'user', content: 'Reply with strictly: OK' }],
        max_tokens: 16,
        temperature: 0,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      return {
        ok: false,
        mode: 'live',
        latencyMs: Math.round(performance.now() - startedAt),
        model: cfg.model,
        message: `OpenAI 相容介面連線失敗：${errMsg}`,
      };
    }
    const reply = data?.choices?.[0]?.message?.content || 'OK';
    return {
      ok: true,
      mode: 'live',
      latencyMs: Math.round(performance.now() - startedAt),
      model: cfg.model,
      message: `相容介面連線成功（${Math.round(performance.now() - startedAt)}ms），模型回應：${String(reply).slice(0, 32)}`,
    };
  } catch (err) {
    return {
      ok: false,
      mode: 'live',
      latencyMs: Math.round(performance.now() - startedAt),
      model: cfg.model,
      message: `網路或 CORS 連線錯誤：${err?.message || String(err)}`,
    };
  }
}

/**
 * 執行單一 API 任務（真實 BYOK 或無金鑰高品質擬真模式）
 */
export async function runApiTask(task, worker, cfgOverride = null, options = {}) {
  const cfg = cfgOverride ? { ...getByokConfig(), ...cfgOverride } : getByokConfig();
  const { project = null, onProgress = null } = options;
  const startedAt = performance.now();

  // 每日體力（Token 上限）保護檢查
  const cap = Number(worker?.dailyTokenCap ?? 0);
  const used = Number(worker?.usedTokensToday ?? worker?.dailyTokenUsed ?? 0);
  const est = Number(task?.tokenCostEst ?? 1200);
  if (cap > 0 && used + est > cap) {
    return {
      ok: false,
      error: `小人「${worker?.name || 'Worker'}」今日 Token 體力額度不足（已用 ${used.toLocaleString()} / 上限 ${cap.toLocaleString()}），請先喝咖啡回復體力或調高上限。`,
      code: 'TOKEN_CAP_EXCEEDED',
    };
  }

  const prompt = buildTaskPrompt(task, project);
  const expectJson = isJsonExpectedTask(task);

  // 真實 BYOK 模式
  if (hasLiveApiKey(cfg)) {
    try {
      onProgress?.(`正在瀏覽器端直連 ${cfg.provider === 'gemini' ? 'Gemini' : 'OpenAI 相容'} (${cfg.model})...`);
      const liveResult =
        cfg.provider === 'gemini'
          ? await callGeminiDirect(cfg, prompt, expectJson)
          : await callOpenAiCompatDirect(cfg, prompt, expectJson);

      const latencyMs = Math.round(performance.now() - startedAt);
      const cleanedContent = expectJson ? stripCodeFence(liveResult.text) : liveResult.text;

      return {
        ok: true,
        mode: 'live',
        provider: cfg.provider === 'gemini' ? 'Gemini BYOK (瀏覽器直連)' : `BYOK (${cfg.baseUrl})`,
        model: cfg.model,
        content: cleanedContent,
        tokensUsed: liveResult.tokensUsed || Math.min(cfg.maxTokensPerTask, est),
        latencyMs,
        summary: `瀏覽器直連 ${cfg.model} 完成交付（${latencyMs}ms，消耗 ${liveResult.tokensUsed || est} tokens）`,
      };
    } catch (err) {
      return {
        ok: false,
        mode: 'live',
        error: `BYOK 模型呼叫失敗：${err?.message || String(err)}`,
        code: 'LIVE_API_ERROR',
      };
    }
  }

  // 零門檻高品質擬真模式（未填 Key 時無縫運作）
  onProgress?.('啟動免金鑰擬真算力引擎...');
  await sleep(360);
  onProgress?.(`解析任務規格與驗收條件：${task?.title?.slice(0, 18) || '微任務'}...`);
  await sleep(420);
  onProgress?.('生成結構化交付成果並自檢格式...');
  await sleep(380);

  const content = generateMockDeliverable(task, worker, project);
  const latencyMs = Math.round(performance.now() - startedAt);
  const tokensUsed = Math.max(450, Math.min(cfg.maxTokensPerTask, est || 1200));

  return {
    ok: true,
    mode: 'simulated',
    provider: '免金鑰擬真引擎（Demo）',
    model: worker?.providerLabel || cfg.model || 'gemini-2.5-flash',
    content,
    tokensUsed,
    latencyMs,
    summary: `擬真執行器已完成結構化交付（${latencyMs}ms，預估 ${tokensUsed} tokens；填入 Gemini Key 可切換真實呼叫）`,
  };
}

async function callGeminiDirect(cfg, prompt, expectJson) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
  const generationConfig = {
    temperature: cfg.temperature,
    maxOutputTokens: cfg.maxTokensPerTask,
  };
  if (expectJson) {
    generationConfig.responseMimeType = 'application/json';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
  }

  const text = extractGeminiText(data);
  if (!text) {
    throw new Error('Gemini 未回傳有效文字內容（可能被安全過濾器攔截）。');
  }

  const tokensUsed =
    data?.usageMetadata?.totalTokenCount ||
    (data?.usageMetadata?.promptTokenCount || 0) + (data?.usageMetadata?.candidatesTokenCount || 0) ||
    Math.ceil(text.length / 3);

  return { text, tokensUsed };
}

async function callOpenAiCompatDirect(cfg, prompt, expectJson) {
  const endpoint = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

  const body = {
    model: cfg.model,
    messages: [
      {
        role: 'system',
        content: 'You are an expert software engineer delivering production-ready, concise artifacts for PixelCompute Town.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: cfg.temperature,
    max_tokens: cfg.maxTokensPerTask,
  };
  if (expectJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Endpoint HTTP ${res.status}`);
  }

  const text = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('相容介面回傳空內容');
  const tokensUsed = data?.usage?.total_tokens || Math.ceil(text.length / 3);
  return { text, tokensUsed };
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('\n')
    .trim();
}

function stripCodeFence(text) {
  const trimmed = String(text || '').trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

/**
 * 依據任務類型產生可通過嚴格 Proof of Accepted Work 驗收的高品質交付物
 */
export function generateMockDeliverable(task, worker = null, project = null) {
  const cat = String(task?.category || task?.taskType || '').toLowerCase();
  const title = String(task?.title || '像素算力鎮任務');
  const projName = project?.name || task?.projectId || 'PixelCompute Town';
  const workerName = worker?.name || 'Flash-01';

  if (cat.includes('feature_pr') || cat.includes('bugfix') || task?.track === 'guild_bounty') {
    return [
      `### 工會交付報告：${title}`,
      `- **所屬項目**：${projName}`,
      `- **執行小人**：${workerName}（BYOT 本機工作流）`,
      `- **PR 參照**：https://github.com/pixel-compute-town/core/pull/${100 + Math.floor(Math.random() * 800)}`,
      ``,
      `#### 核心實作變更`,
      '```js',
      `export function executeFeaturePipeline(payload) {`,
      `  if (!payload || typeof payload !== 'object') {`,
      `    throw new Error('Invalid pipeline payload');`,
      `  }`,
      `  const normalized = {`,
      `    id: String(payload.id || 'item'),`,
      `    verifiedAt: new Date().toISOString(),`,
      `    status: 'accepted',`,
      `  };`,
      `  return { ok: true, data: normalized };`,
      `}`,
      '```',
      ``,
      `#### 本機驗證紀錄`,
      `- [x] 通過原生 ESM 語法與邊界輸入檢查`,
      `- [x] 零外部相依，符合專案架構準則`,
      `- [x] 已附帶單元斷言與回滾保護邏輯`,
    ].join('\n');
  }

  if (cat.includes('unit_test') || cat.includes('test')) {
    return [
      `// Delivered by ${workerName} for ${projName} (${title})`,
      `import test from 'node:test';`,
      `import assert from 'node:assert/strict';`,
      ``,
      `export function calculateRevenueSplit(grossUsd) {`,
      `  const founderUsd = Number((grossUsd * 0.30).toFixed(2));`,
      `  const platformUsd = Number((grossUsd * 0.10).toFixed(2));`,
      `  const contributorsUsd = Number((grossUsd - founderUsd - platformUsd).toFixed(2));`,
      `  return { founderUsd, contributorsUsd, platformUsd };`,
      `}`,
      ``,
      `test('30/60/10 分紅結算必須精確守恆且不產生浮點誤差', () => {`,
      `  const result = calculateRevenueSplit(200);`,
      `  assert.equal(result.founderUsd, 60);`,
      `  assert.equal(result.contributorsUsd, 120);`,
      `  assert.equal(result.platformUsd, 20);`,
      `  assert.equal(result.founderUsd + result.contributorsUsd + result.platformUsd, 200);`,
      `});`,
      ``,
      `test('懸賞 10% 平臺服務費與開發者 90% 淨額計算正確', () => {`,
      `  const bounty = 40;`,
      `  const fee = Number((bounty * 0.1).toFixed(2));`,
      `  const payout = Number((bounty - fee).toFixed(2));`,
      `  assert.equal(fee, 4);`,
      `  assert.equal(payout, 36);`,
      `});`,
    ].join('\n');
  }

  if (cat.includes('i18n') || (!cat && (title.includes('多語系') || title.includes('翻譯')))) {
    const baseKeys = extractSampleKeys(task?.sampleInput);
    const payload = {
      en: {
        townTitle: 'PixelCompute Town',
        factoryTab: 'Auto Factory',
        guildTab: 'Bounty Guild',
        launchBtn: 'Launch & Distribute Dividends',
        zeroTrustTip: 'API keys stay strictly in your local browser',
        ERR_NO_CONFIG: 'Configuration file not found. Run init to create one.',
        ERR_INVALID_JSON: 'Invalid JSON syntax detected in locale file.',
        ERR_RATE_LIMIT: 'API rate limit reached. Retrying with exponential backoff.',
        ERR_PR_DENIED: 'Pull request permission denied for external repository.',
        ...baseKeys.enUS,
      },
      ja: {
        townTitle: 'ピクセル計算タウン',
        factoryTab: '自動工房',
        guildTab: '懸賞ギルド',
        launchBtn: '公開して配当を分配',
        zeroTrustTip: 'APIキーはブラウザ内のみに保存されます',
        ERR_NO_CONFIG: '設定ファイルが見つかりません。initを実行してください。',
        ERR_INVALID_JSON: 'ロケールファイルに不正なJSON構文があります。',
        ERR_RATE_LIMIT: 'APIレート制限に達しました。待機後に再試行します。',
        ERR_PR_DENIED: '外部リポジトリへのPR権限が拒否されました。',
        ...baseKeys.jaJP,
      },
      'zh-TW': {
        townTitle: '像素算力鎮',
        factoryTab: '自動工坊',
        guildTab: '懸賞工會',
        launchBtn: '發布上線並分紅',
        zeroTrustTip: 'API Key 僅保留在你的瀏覽器本機',
        ERR_NO_CONFIG: '找不到設定檔，請先執行初始化指令。',
        ERR_INVALID_JSON: '語系檔案 JSON 語法錯誤，請檢查括號與逗號。',
        ERR_RATE_LIMIT: '觸發 API 速率限制，將以指數退避自動重試。',
        ERR_PR_DENIED: '無權限對此儲存庫建立 Pull Request。',
        ...baseKeys.zhTW,
      },
      ko: {
        townTitle: '픽셀 컴퓨트 타운',
        factoryTab: '자동 공방',
        guildTab: '현상금 길드',
        launchBtn: '출시 및 수익 분배',
        zeroTrustTip: 'API 키는 로컬 브라우저에만 보관됩니다',
        ERR_NO_CONFIG: '설정 파일을 찾을 수 없습니다.',
        ERR_INVALID_JSON: '로케일 파일의 JSON 구문이 올바르지 않습니다.',
        ERR_RATE_LIMIT: 'API 호출 한도에 도달하여 잠시 후 재시도합니다.',
        ERR_PR_DENIED: '저장소 Pull Request 권한이 거부되었습니다.',
        ...baseKeys.koKR,
      },
      _meta: {
        project: projName,
        taskId: task?.id || 'task-i18n',
        deliveredBy: workerName,
        qaStatus: 'verified-placeholders-clean',
      },
    };
    return JSON.stringify(payload, null, 2);
  }

  if (cat.includes('pixel_spec') || (!cat && (title.includes('像素') || title.includes('精靈') || title.includes('調色盤')))) {
    const spec = {
      project: projName,
      assetName: `${task?.id || 'sprite'}_sheet_v1`,
      gridSize: { width: 16, height: 16, scale: 2 },
      theme: 'retro-cyber-warm-night',
      palette: {
        outline: '#0d0c1d',
        amberGlow: '#ffb74d',
        cyberCyan: '#4deeea',
        neonPink: '#ff5ea8',
        warmSlate: '#2a2744',
        emeraldOk: '#52e59a',
      },
      billboardFrames: [
        `🔥 ${projName} 雙軌算力協作開放接單！`,
        `🚀 30/60/10 透明分紅池 · 賽博夜市限定主題`,
      ],
      particleColors: ['#ffb74d', '#4deeea', '#ff5ea8', '#52e59a', '#ffd95a'],
      icons: [
        { name: 'status_working', desc: '發光青色鍵盤與電流火花' },
        { name: 'status_verified', desc: '翠綠像素打勾徽章與金幣閃光' },
        { name: 'status_coffee', desc: '冒熱氣的 8-bit 義式咖啡杯' },
      ],
      typography: { primary: 'Noto Sans TC', mono: 'JetBrains Mono', pixelScale: 2 },
      author: workerName,
    };
    return JSON.stringify(spec, null, 2);
  }

  // docs / qa / general structured report
  return [
    `# ${title} — 交付成果文件`,
    ``,
    `> 項目：${projName} ｜ 交付小人：${workerName}`,
    ``,
    `## 1. 核心產出摘要`,
    `- 針對任務規格完成結構化盤點，覆蓋所有必檢驗收條件。`,
    `- 確認邊界條件、錯誤訊息與繁體中文介面文案一致。`,
    ``,
    `## 2. 具體實施清單`,
    `1. **零信任安全驗證**：確認敏感金鑰與本機 CLI 憑證絕不外洩至遠端伺服器。`,
    `2. **成果可驗證性**：輸出包含明確 Schema 與可重複執行的檢查步驟。`,
    `3. **社群協作就緒**：所有設定檔與範例指令皆可直接複製執行。`,
    ``,
    `## 3. 建議後續行動`,
    `- 將本次產出納入下一輪孵化里程碑檢核表，並透過 SSE 即時同步給全鎮成員。`,
  ].join('\n');
}

function extractSampleKeys(sampleInput) {
  const empty = { zhTW: {}, enUS: {}, jaJP: {}, koKR: {} };
  if (!sampleInput) return empty;
  try {
    const obj = typeof sampleInput === 'string' ? JSON.parse(sampleInput) : sampleInput;
    if (!obj || typeof obj !== 'object') return empty;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') {
        empty.zhTW[k] = v;
        empty.enUS[k] = `[EN] ${v}`;
        empty.jaJP[k] = `[JA] ${v}`;
        empty.koKR[k] = `[KO] ${v}`;
      }
    }
  } catch {
    // Non-JSON sampleInput is fine
  }
  return empty;
}

function clampInt(val, min, max, fallback) {
  const n = Number.parseInt(val, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampFloat(val, min, max, fallback) {
  const n = Number.parseFloat(val);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
