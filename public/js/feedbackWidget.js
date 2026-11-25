/**
 * PixelCompute Town — Self-Contained Daily Feedback / Suggestion Box Widget
 * Reusable across /app and / landing page; submits to POST /api/feedback for Founder daily inbox.
 */

const COPY = {
  'zh-TW': {
    fab: '📮 意見箱',
    title: '📮 鎮民意見箱（鎮長每天必看）',
    subtitle: '介面太繁瑣、想要新功能、遇到 Bug 或任何點子，10 秒留一句給鎮長！',
    catLabel: '意見分類',
    cats: [
      { id: 'suggestion', label: '💡 功能建議' },
      { id: 'ui', label: '🎨 介面體驗' },
      { id: 'bug', label: '🐛 回報 Bug' },
      { id: 'other', label: '💬 其他想法' },
    ],
    rateLabel: '目前使用滿意度',
    msgLabel: '你的建議或問題 *',
    msgPh: '例如：希望哪個按鈕更清楚、哪個流程可以簡化，或想玩的新功能...',
    contactLabel: '聯絡方式（選填，方便鎮長回覆你）',
    contactPh: 'Email / GitHub @帳號 / Discord / X（可留空匿名）',
    submit: '🚀 送出給鎮長',
    submitting: '送出中...',
    close: '✕ 關閉',
    thanks: '✅ 感謝你的意見！已送進鎮長每日意見箱，鎮長每天都會親自閱讀。',
    errShort: '請輸入至少 2 個字的建議內容',
  },
  'zh-CN': {
    fab: '📮 意见箱',
    title: '📮 镇民意见箱（镇长每天必看）',
    subtitle: '界面太繁琐、想要新功能、遇到 Bug 或任何点子，10 秒留一句给镇长！',
    catLabel: '意见分类',
    cats: [
      { id: 'suggestion', label: '💡 功能建议' },
      { id: 'ui', label: '🎨 界面体验' },
      { id: 'bug', label: '🐛 反馈 Bug' },
      { id: 'other', label: '💬 其他想法' },
    ],
    rateLabel: '当前使用满意度',
    msgLabel: '你的建议或问题 *',
    msgPh: '例如：希望哪个按钮更清楚、哪个流程可以简化，或想玩的新功能...',
    contactLabel: '联系方式（选填，方便镇长回复你）',
    contactPh: 'Email / GitHub @账号 / Discord / 微信（可留空匿名）',
    submit: '🚀 发送给镇长',
    submitting: '发送中...',
    close: '✕ 关闭',
    thanks: '✅ 感谢你的建议！已送进镇长每日意见箱，镇长每天都会亲自阅读。',
    errShort: '请输入至少 2 个字的建议内容',
  },
  en: {
    fab: '📮 Feedback',
    title: '📮 Town Feedback Box (Read Daily)',
    subtitle: 'Spot a bug, want a simpler UI, or have a feature idea? Drop a quick note for the Mayor!',
    catLabel: 'Category',
    cats: [
      { id: 'suggestion', label: '💡 Feature Idea' },
      { id: 'ui', label: '🎨 UX / Layout' },
      { id: 'bug', label: '🐛 Bug Report' },
      { id: 'other', label: '💬 Other' },
    ],
    rateLabel: 'Experience Rating',
    msgLabel: 'Your Feedback *',
    msgPh: 'Tell us what feels cluttered, what broke, or what you want next...',
    contactLabel: 'Contact (Optional, for reply)',
    contactPh: 'Email / GitHub / Discord / X (leave blank for anonymous)',
    submit: '🚀 Send to Mayor',
    submitting: 'Sending...',
    close: '✕ Close',
    thanks: '✅ Thank you! Your note is in the Mayor daily inbox.',
    errShort: 'Please enter at least 2 characters.',
  },
};

function getActiveLocale() {
  try {
    const raw = localStorage.getItem('pct_locale') || localStorage.getItem('pixel_compute_town_lang_v1') || 'zh-TW';
    if (raw === 'zh-CN' || raw === 'zh-Hans') return 'zh-CN';
    if (raw.toLowerCase().startsWith('en')) return 'en';
  } catch {}
  return 'zh-TW';
}

function injectStyles() {
  if (document.getElementById('pct-feedback-styles')) return;
  const style = document.createElement('style');
  style.id = 'pct-feedback-styles';
  style.textContent = `
    .pct-fb-fab {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 88;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 13px;
      border: 2px solid #4deeea;
      background: linear-gradient(180deg, #1b2448, #121734);
      color: #f4f7ff;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 3px 3px 0px #070511, 0 8px 20px rgba(0, 0, 0, 0.45);
      transition: transform 0.12s ease, border-color 0.14s ease, box-shadow 0.14s ease;
    }
    .pct-fb-fab:hover {
      transform: translateY(-2px);
      border-color: #facc15;
      box-shadow: 4px 4px 0px #070511, 0 10px 24px rgba(77, 238, 234, 0.25);
    }
    body[data-theme='day'] .pct-fb-fab {
      background: linear-gradient(180deg, #ffffff, #eef2ff);
      color: #1b1533;
      border-color: #4f46e5;
      box-shadow: 3px 3px 0px rgba(45, 36, 86, 0.24), 0 8px 20px rgba(45, 36, 86, 0.16);
    }
    .pct-fb-backdrop {
      position: fixed;
      inset: 0;
      z-index: 120;
      background: rgba(6, 8, 22, 0.72);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .pct-fb-backdrop.open { display: flex; }
    .pct-fb-dialog {
      width: 100%;
      max-width: 460px;
      background: #141937;
      color: #eef2ff;
      border: 2px solid #4deeea;
      box-shadow: 6px 6px 0px #070511, 0 18px 40px rgba(0, 0, 0, 0.65);
      overflow: hidden;
    }
    body[data-theme='day'] .pct-fb-dialog {
      background: #ffffff;
      color: #1b1533;
      border-color: #4f46e5;
      box-shadow: 6px 6px 0px rgba(45, 36, 86, 0.2), 0 18px 40px rgba(27, 21, 51, 0.2);
    }
    .pct-fb-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      border-bottom: 2px solid rgba(114, 134, 211, 0.35);
    }
    .pct-fb-head h3 { margin: 0; font-size: 14.5px; font-weight: 900; }
    .pct-fb-close {
      padding: 4px 8px;
      border: 1px solid rgba(148, 163, 184, 0.45);
      background: transparent;
      color: inherit;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .pct-fb-body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 11px;
    }
    .pct-fb-sub {
      margin: 0;
      font-size: 12px;
      opacity: 0.82;
      line-height: 1.5;
    }
    .pct-fb-label {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      font-weight: 800;
      margin-bottom: 5px;
      opacity: 0.9;
    }
    .pct-fb-cats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }
    .pct-fb-cat-btn {
      padding: 7px 8px;
      border: 2px solid rgba(114, 134, 211, 0.4);
      background: rgba(10, 14, 34, 0.55);
      color: inherit;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      text-align: center;
    }
    body[data-theme='day'] .pct-fb-cat-btn {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .pct-fb-cat-btn.active {
      border-color: #4deeea;
      background: rgba(77, 238, 234, 0.16);
      color: #4deeea;
    }
    body[data-theme='day'] .pct-fb-cat-btn.active {
      border-color: #4f46e5;
      background: #eef2ff;
      color: #4338ca;
    }
    .pct-fb-stars {
      display: flex;
      gap: 6px;
    }
    .pct-fb-star {
      flex: 1;
      padding: 6px 0;
      border: 2px solid rgba(114, 134, 211, 0.35);
      background: rgba(10, 14, 34, 0.5);
      color: #94a3b8;
      font-size: 14px;
      font-weight: 900;
      cursor: pointer;
    }
    body[data-theme='day'] .pct-fb-star {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #94a3b8;
    }
    .pct-fb-star.active {
      border-color: #facc15;
      background: rgba(250, 204, 21, 0.16);
      color: #facc15;
    }
    body[data-theme='day'] .pct-fb-star.active {
      color: #d97706;
      border-color: #d97706;
      background: #fef3c7;
    }
    .pct-fb-input, .pct-fb-textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border: 2px solid rgba(114, 134, 211, 0.45);
      background: rgba(9, 12, 28, 0.72);
      color: inherit;
      font-family: inherit;
      font-size: 12.5px;
      outline: none;
    }
    .pct-fb-textarea { min-height: 92px; resize: vertical; line-height: 1.5; }
    body[data-theme='day'] .pct-fb-input,
    body[data-theme='day'] .pct-fb-textarea {
      background: #ffffff;
      border-color: #cbd5e1;
    }
    .pct-fb-input:focus, .pct-fb-textarea:focus { border-color: #4deeea; }
    .pct-fb-msg {
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid #34d399;
      background: rgba(16, 185, 129, 0.14);
      display: none;
    }
    .pct-fb-msg.err {
      border-color: #f87171;
      background: rgba(239, 68, 68, 0.14);
      color: #fca5a5;
    }
    body[data-theme='day'] .pct-fb-msg.err { color: #b91c1c; }
    .pct-fb-submit {
      width: 100%;
      padding: 9px 14px;
      border: 2px solid #34d399;
      background: linear-gradient(180deg, #10b981, #059669);
      color: #ffffff;
      font-family: inherit;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
    }
    .pct-fb-submit:disabled { opacity: 0.6; cursor: wait; }
  `;
  document.head.appendChild(style);
}

function initFeedbackWidget() {
  if (document.getElementById('pct-fb-fab')) return;
  injectStyles();

  let selectedCat = 'suggestion';
  let selectedRating = 5;

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.id = 'pct-fb-fab';
  fab.className = 'pct-fb-fab';
  document.body.appendChild(fab);

  const backdrop = document.createElement('div');
  backdrop.id = 'pct-fb-modal';
  backdrop.className = 'pct-fb-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.innerHTML = `
    <div class="pct-fb-dialog">
      <div class="pct-fb-head">
        <h3 id="pct-fb-title"></h3>
        <button type="button" class="pct-fb-close" id="pct-fb-close"></button>
      </div>
      <form class="pct-fb-body" id="pct-fb-form">
        <p class="pct-fb-sub" id="pct-fb-sub"></p>
        <div>
          <div class="pct-fb-label"><span id="pct-fb-cat-label"></span></div>
          <div class="pct-fb-cats" id="pct-fb-cats"></div>
        </div>
        <div>
          <div class="pct-fb-label"><span id="pct-fb-rate-label"></span><span id="pct-fb-rate-val">5 / 5 ★</span></div>
          <div class="pct-fb-stars" id="pct-fb-stars"></div>
        </div>
        <div>
          <div class="pct-fb-label">
            <span id="pct-fb-msg-label"></span>
            <span id="pct-fb-char-count">0 / 1000</span>
          </div>
          <textarea class="pct-fb-textarea" id="pct-fb-textarea" maxlength="1000" required></textarea>
        </div>
        <div>
          <div class="pct-fb-label"><span id="pct-fb-contact-label"></span></div>
          <input class="pct-fb-input" id="pct-fb-contact" type="text" maxlength="120" />
        </div>
        <div class="pct-fb-msg" id="pct-fb-status"></div>
        <button type="submit" class="pct-fb-submit" id="pct-fb-submit"></button>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);

  const titleEl = backdrop.querySelector('#pct-fb-title');
  const closeBtn = backdrop.querySelector('#pct-fb-close');
  const subEl = backdrop.querySelector('#pct-fb-sub');
  const catLabelEl = backdrop.querySelector('#pct-fb-cat-label');
  const catsEl = backdrop.querySelector('#pct-fb-cats');
  const rateLabelEl = backdrop.querySelector('#pct-fb-rate-label');
  const rateValEl = backdrop.querySelector('#pct-fb-rate-val');
  const starsEl = backdrop.querySelector('#pct-fb-stars');
  const msgLabelEl = backdrop.querySelector('#pct-fb-msg-label');
  const charCountEl = backdrop.querySelector('#pct-fb-char-count');
  const textareaEl = backdrop.querySelector('#pct-fb-textarea');
  const contactLabelEl = backdrop.querySelector('#pct-fb-contact-label');
  const contactEl = backdrop.querySelector('#pct-fb-contact');
  const statusEl = backdrop.querySelector('#pct-fb-status');
  const submitBtn = backdrop.querySelector('#pct-fb-submit');
  const formEl = backdrop.querySelector('#pct-fb-form');

  function renderLocalized() {
    const c = COPY[getActiveLocale()] || COPY['zh-TW'];
    fab.textContent = c.fab;
    titleEl.textContent = c.title;
    closeBtn.textContent = c.close;
    subEl.textContent = c.subtitle;
    catLabelEl.textContent = c.catLabel;
    rateLabelEl.textContent = c.rateLabel;
    msgLabelEl.textContent = c.msgLabel;
    textareaEl.placeholder = c.msgPh;
    contactLabelEl.textContent = c.contactLabel;
    contactEl.placeholder = c.contactPh;
    submitBtn.textContent = c.submit;

    catsEl.innerHTML = c.cats
      .map(
        (cat) =>
          `<button type="button" class="pct-fb-cat-btn ${selectedCat === cat.id ? 'active' : ''}" data-fb-cat="${cat.id}">${cat.label}</button>`,
      )
      .join('');

    starsEl.innerHTML = [1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<button type="button" class="pct-fb-star ${n <= selectedRating ? 'active' : ''}" data-fb-star="${n}">${n}★</button>`,
      )
      .join('');
    rateValEl.textContent = `${selectedRating} / 5 ★`;
  }

  function showStatus(text, isErr = false) {
    if (!text) {
      statusEl.style.display = 'none';
      statusEl.textContent = '';
      return;
    }
    statusEl.textContent = text;
    statusEl.className = `pct-fb-msg${isErr ? ' err' : ''}`;
    statusEl.style.display = 'block';
  }

  function openModal() {
    renderLocalized();
    showStatus('');
    backdrop.classList.add('open');
    setTimeout(() => textareaEl.focus(), 60);
  }

  function closeModal() {
    backdrop.classList.remove('open');
  }

  fab.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('open')) closeModal();
  });

  catsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fb-cat]');
    if (!btn) return;
    selectedCat = btn.dataset.fbCat;
    renderLocalized();
  });

  starsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fb-star]');
    if (!btn) return;
    selectedRating = Number(btn.dataset.fbStar) || 5;
    renderLocalized();
  });

  textareaEl.addEventListener('input', () => {
    charCountEl.textContent = `${textareaEl.value.length} / 1000`;
  });

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const c = COPY[getActiveLocale()] || COPY['zh-TW'];
    const message = textareaEl.value.trim();
    if (message.length < 2) {
      return showStatus(c.errShort, true);
    }

    submitBtn.disabled = true;
    submitBtn.textContent = c.submitting;
    showStatus('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCat,
          rating: selectedRating,
          message,
          contact: contactEl.value.trim(),
          page: window.location.pathname || '/app',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showStatus(data.error || 'Submit failed', true);
      } else {
        textareaEl.value = '';
        charCountEl.textContent = '0 / 1000';
        showStatus(c.thanks, false);
        setTimeout(() => {
          closeModal();
        }, 1400);
      }
    } catch (err) {
      showStatus(err.message || 'Network error', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = c.submit;
    }
  });

  // Sync language button text when locale changes on page
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-lang]')) {
      setTimeout(renderLocalized, 40);
    }
  });

  renderLocalized();
  window.openFeedbackModal = openModal;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFeedbackWidget);
} else {
  initFeedbackWidget();
}
