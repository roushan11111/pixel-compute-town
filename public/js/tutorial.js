/**
 * PixelCompute Town — Classic RPG Pixel Dialogue Interactive Tutorial
 * Zero-dependency ES Module inspired by Kairosoft, Stardew Valley & Pokemon RPG tutorials.
 * Features live 32x32 HD animated pixel guide portrait ("Volt Kitty · Town Guide") on 64x64 canvas,
 * 5 plain-language steps welcoming both non-coders and developers, live tab/scene sync,
 * +100G graduation bonus claim, and one-click 8-bit original BGM launcher.
 */

import { renderWorkerPortrait } from './sprites.js';
import { t } from './i18n.js';
import { soundFX } from './sound.js';

export const TUTORIAL_STORAGE_KEY = 'pct_tutorial_done_v1';
export const TUTORIAL_ROLE_STORAGE_KEY = 'pct_tutorial_role_v1';
export const TUTORIAL_TOTAL_STEPS = 5;

const STEP_CONFIG = Object.freeze([
  {
    index: 0,
    tab: null,
    scene: null,
    animState: 'idle',
    skin: 'default',
    titleKey: 'tutorial.step1.title',
    bodyKey: 'tutorial.step1.body',
    tipKey: null,
  },
  {
    index: 1,
    tab: 'factory',
    scene: 'factory',
    animState: 'work',
    skin: 'default',
    titleKey: 'tutorial.step2.title',
    bodyKey: 'tutorial.step2.body',
    tipKey: 'tutorial.step2.tip',
  },
  {
    index: 2,
    tab: 'guild',
    scene: 'guild',
    animState: 'work',
    skin: 'skin-cyber',
    titleKey: 'tutorial.step3.title',
    bodyKey: 'tutorial.step3.body',
    tipKey: 'tutorial.step3.tip',
  },
  {
    index: 3,
    tab: 'incubator',
    scene: 'launchpad',
    animState: 'idle',
    skin: 'default',
    titleKey: 'tutorial.step4.title',
    bodyKey: 'tutorial.step4.body',
    tipKey: 'tutorial.step4.tip',
  },
  {
    index: 4,
    tab: null,
    scene: 'town',
    animState: 'celebrate',
    skin: 'skin-gold',
    titleKey: 'tutorial.step5.title',
    bodyKey: 'tutorial.step5.body',
    tipKey: 'tutorial.step5.tip',
  },
]);

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readStorage(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeStorage(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch {
    // Ignore storage quota / private mode errors
  }
}

/**
 * Create the interactive 5-step RPG pixel tutorial controller.
 *
 * @param {object} options
 * @param {() => string} [options.getLocale]
 * @param {(tabName: string) => void} [options.selectTab]
 * @param {(sceneId: string) => void} [options.selectScene]
 * @param {(role: 'beginner'|'dev') => void} [options.onSelectRole]
 * @param {() => Promise<{ ok?: boolean, alreadyClaimed?: boolean, bonusGold?: number }>} [options.onClaimGraduationBonus]
 * @param {() => boolean|void} [options.onOpenBgm]
 */
export function createTutorialController({
  getLocale = () => 'zh-TW',
  selectTab = () => {},
  selectScene = () => {},
  onSelectRole = () => {},
  onClaimGraduationBonus = async () => ({ ok: false }),
  onOpenBgm = () => false,
} = {}) {
  let rootEl = null;
  let openState = false;
  let currentStep = 0;
  let selectedRole = readStorage(TUTORIAL_ROLE_STORAGE_KEY) || null;
  let bonusClaimed = false;
  let claimingBonus = false;
  let bgmPlaying = false;
  let portraitTimer = null;
  let portraitFrame = 0;
  let keydownHandler = null;

  function tr(key, vars) {
    const loc = typeof getLocale === 'function' ? getLocale() : 'zh-TW';
    return t(key, vars, loc);
  }

  function stopPortraitLoop() {
    if (portraitTimer) {
      clearInterval(portraitTimer);
      portraitTimer = null;
    }
  }

  function drawGuidePortrait() {
    if (!rootEl) return;
    const canvas = rootEl.querySelector('.rpg-tut-portrait-canvas');
    if (!canvas) return;
    const cfg = STEP_CONFIG[currentStep] || STEP_CONFIG[0];
    const animState = currentStep === 4 && bonusClaimed ? 'celebrate' : cfg.animState;
    const skin = currentStep === 4 ? 'skin-gold' : cfg.skin || 'default';
    try {
      renderWorkerPortrait(canvas, 'flash_worker', skin, {
        animState,
        frame: portraitFrame,
        crown: currentStep === 4 && bonusClaimed ? 'gold' : null,
      });
    } catch {
      // Keep tutorial resilient in headless browsers
    }
  }

  function startPortraitLoop() {
    stopPortraitLoop();
    drawGuidePortrait();
    portraitTimer = setInterval(() => {
      portraitFrame = (portraitFrame + 1) % 4;
      drawGuidePortrait();
    }, 320);
  }

  function syncStepEnvironment(stepIndex) {
    const cfg = STEP_CONFIG[stepIndex];
    if (!cfg) return;
    if (cfg.tab && typeof selectTab === 'function') {
      try {
        selectTab(cfg.tab);
      } catch {
        // ignore
      }
    }
    if (cfg.scene && typeof selectScene === 'function') {
      try {
        selectScene(cfg.scene);
      } catch {
        // ignore
      }
    }
  }

  function renderStepExtraHtml(stepIndex) {
    if (stepIndex === 0) {
      const isBeginner = selectedRole === 'beginner';
      const isDev = selectedRole === 'dev';
      const tipHtml = isBeginner
        ? `<div class="rpg-tut-tip beginner">${escapeHtml(tr('tutorial.step1.beginnerTip'))}</div>`
        : isDev
          ? `<div class="rpg-tut-tip dev">${escapeHtml(tr('tutorial.step1.devTip'))}</div>`
          : '';

      return `
        <div class="rpg-tut-role-grid" role="radiogroup" aria-label="Adventure Role">
          <button type="button" class="rpg-tut-role-card beginner ${isBeginner ? 'selected' : ''}" data-tut-role="beginner" aria-checked="${isBeginner ? 'true' : 'false'}">
            <div class="rpg-tut-role-head">
              <span class="rpg-tut-role-title">${escapeHtml(tr('tutorial.step1.beginnerTitle'))}</span>
              ${isBeginner ? `<span class="rpg-tut-role-check">${escapeHtml(tr('tutorial.roleSelectedBadge'))}</span>` : ''}
            </div>
            <p class="rpg-tut-role-desc">${escapeHtml(tr('tutorial.step1.beginnerDesc'))}</p>
          </button>
          <button type="button" class="rpg-tut-role-card dev ${isDev ? 'selected' : ''}" data-tut-role="dev" aria-checked="${isDev ? 'true' : 'false'}">
            <div class="rpg-tut-role-head">
              <span class="rpg-tut-role-title">${escapeHtml(tr('tutorial.step1.devTitle'))}</span>
              ${isDev ? `<span class="rpg-tut-role-check">${escapeHtml(tr('tutorial.roleSelectedBadge'))}</span>` : ''}
            </div>
            <p class="rpg-tut-role-desc">${escapeHtml(tr('tutorial.step1.devDesc'))}</p>
          </button>
        </div>
        ${tipHtml}
      `;
    }

    if (stepIndex === 4) {
      const claimLabel = claimingBonus
        ? tr('tutorial.step5.claimingBtn')
        : bonusClaimed
          ? tr('tutorial.step5.claimedBtn')
          : tr('tutorial.step5.claimBtn');
      const bgmLabel = bgmPlaying
        ? tr('tutorial.step5.bgmPlayingBtn')
        : tr('tutorial.step5.bgmBtn');

      return `
        <div class="rpg-tut-reward-actions">
          <button
            type="button"
            class="btn rpg-tut-claim-btn ${bonusClaimed ? 'claimed' : ''}"
            data-tut-action="claim-bonus"
            ${claimingBonus || bonusClaimed ? 'disabled' : ''}
          >
            ${escapeHtml(claimLabel)}
          </button>
          <button
            type="button"
            class="btn rpg-tut-bgm-btn ${bgmPlaying ? 'playing' : ''}"
            data-tut-action="open-bgm"
          >
            ${escapeHtml(bgmLabel)}
          </button>
        </div>
        <div class="rpg-tut-tip">${escapeHtml(tr('tutorial.step5.tip'))}</div>
      `;
    }

    const cfg = STEP_CONFIG[stepIndex];
    if (cfg?.tipKey) {
      return `<div class="rpg-tut-tip">${escapeHtml(tr(cfg.tipKey))}</div>`;
    }
    return '';
  }

  function render() {
    if (!rootEl) return;
    const cfg = STEP_CONFIG[currentStep] || STEP_CONFIG[0];
    const isFirst = currentStep === 0;
    const isLast = currentStep === TUTORIAL_TOTAL_STEPS - 1;

    const dotsHtml = STEP_CONFIG.map((s) => {
      const cls =
        s.index === currentStep ? 'active' : s.index < currentStep ? 'done' : '';
      return `<button type="button" class="rpg-tut-dot ${cls}" data-tut-step="${s.index}" aria-label="${escapeHtml(tr('tutorial.stepCounter', { cur: s.index + 1, total: TUTORIAL_TOTAL_STEPS }))}"></button>`;
    }).join('');

    rootEl.innerHTML = `
      <div class="rpg-tut-backdrop" data-tut-action="backdrop"></div>
      <div class="rpg-tut-window" role="dialog" aria-modal="false" aria-labelledby="pct-rpg-tut-heading">
        <div class="rpg-tut-corner tl" aria-hidden="true"></div>
        <div class="rpg-tut-corner tr" aria-hidden="true"></div>
        <div class="rpg-tut-corner bl" aria-hidden="true"></div>
        <div class="rpg-tut-corner br" aria-hidden="true"></div>

        <aside class="rpg-tut-guide">
          <div class="rpg-tut-portrait-frame ${isLast ? 'gold-glow' : ''}">
            <canvas class="rpg-tut-portrait-canvas" width="64" height="64"></canvas>
          </div>
          <div class="rpg-tut-nameplate">
            <div class="rpg-tut-guide-name">${escapeHtml(tr('tutorial.guideName'))}</div>
            <div class="rpg-tut-guide-role">${escapeHtml(tr('tutorial.guideRole'))}</div>
          </div>
        </aside>

        <div class="rpg-tut-content">
          <header class="rpg-tut-header">
            <div class="rpg-tut-progress-wrap">
              <span class="rpg-tut-step-pill mono">${escapeHtml(tr('tutorial.stepCounter', { cur: currentStep + 1, total: TUTORIAL_TOTAL_STEPS }))}</span>
              <div class="rpg-tut-dots" role="tablist" aria-label="Tutorial Progress">
                ${dotsHtml}
              </div>
            </div>
            <button type="button" class="rpg-tut-skip-top" data-tut-action="skip">
              ✕ ${escapeHtml(tr('tutorial.skipBtn'))}
            </button>
          </header>

          <h2 class="rpg-tut-title" id="pct-rpg-tut-heading">
            <span class="rpg-tut-cursor" aria-hidden="true">▶</span>
            <span>${escapeHtml(tr(cfg.titleKey))}</span>
          </h2>

          <p class="rpg-tut-body">${escapeHtml(tr(cfg.bodyKey))}</p>

          <div class="rpg-tut-extra">
            ${renderStepExtraHtml(currentStep)}
          </div>

          <footer class="rpg-tut-footer">
            <div class="rpg-tut-footer-left">
              ${
                !isFirst
                  ? `<button type="button" class="btn btn-sm" data-tut-action="prev">${escapeHtml(tr('tutorial.prevBtn'))}</button>`
                  : `<button type="button" class="btn btn-sm" data-tut-action="skip">${escapeHtml(tr('tutorial.skipBtn'))}</button>`
              }
            </div>
            <div class="rpg-tut-footer-right">
              ${
                !isFirst
                  ? `<button type="button" class="btn btn-sm" data-tut-action="skip">${escapeHtml(tr('tutorial.skipBtn'))}</button>`
                  : ''
              }
              <button type="button" class="btn btn-sm ${isLast ? 'btn-green' : 'btn-amber'} rpg-tut-next-btn" data-tut-action="${isLast ? 'finish' : 'next'}">
                <span>${escapeHtml(isLast ? tr('tutorial.finishBtn') : tr('tutorial.nextBtn'))}</span>
                <span class="rpg-tut-caret" aria-hidden="true">▼</span>
              </button>
            </div>
          </footer>
        </div>
      </div>
    `;

    drawGuidePortrait();
  }

  async function handleAction(action, targetEl) {
    if (action === 'skip' || action === 'finish' || action === 'backdrop') {
      soundFX?.playClick?.();
      close({ markDone: true });
      return;
    }

    if (action === 'prev') {
      if (currentStep > 0) {
        soundFX?.playClick?.();
        goToStep(currentStep - 1);
      }
      return;
    }

    if (action === 'next') {
      if (currentStep < TUTORIAL_TOTAL_STEPS - 1) {
        soundFX?.playClick?.();
        goToStep(currentStep + 1);
      } else {
        soundFX?.playClick?.();
        close({ markDone: true });
      }
      return;
    }

    if (action === 'claim-bonus') {
      if (claimingBonus || bonusClaimed) return;
      claimingBonus = true;
      render();
      try {
        const res = await onClaimGraduationBonus();
        if (res && (res.ok || res.alreadyClaimed)) {
          bonusClaimed = true;
          writeStorage(TUTORIAL_STORAGE_KEY, '1');
        }
      } finally {
        claimingBonus = false;
        render();
      }
      return;
    }

    if (action === 'open-bgm') {
      const playing = onOpenBgm();
      if (typeof playing === 'boolean') {
        bgmPlaying = playing;
      } else {
        bgmPlaying = true;
      }
      render();
      return;
    }

    const role = targetEl?.dataset?.tutRole;
    if (role === 'beginner' || role === 'dev') {
      selectedRole = role;
      writeStorage(TUTORIAL_ROLE_STORAGE_KEY, role);
      soundFX?.playDispatch?.();
      try {
        onSelectRole(role);
      } catch {
        // ignore
      }
      render();
    }
  }

  function ensureRoot() {
    if (rootEl) return rootEl;
    if (typeof document === 'undefined') return null;

    rootEl = document.createElement('div');
    rootEl.className = 'rpg-tut-overlay';
    rootEl.setAttribute('aria-live', 'polite');

    rootEl.addEventListener('click', (e) => {
      const stepBtn = e.target.closest('[data-tut-step]');
      if (stepBtn) {
        const idx = Number(stepBtn.dataset.tutStep);
        if (Number.isInteger(idx) && idx >= 0 && idx < TUTORIAL_TOTAL_STEPS) {
          soundFX?.playClick?.();
          goToStep(idx);
        }
        return;
      }

      const roleBtn = e.target.closest('[data-tut-role]');
      if (roleBtn) {
        handleAction('select-role', roleBtn);
        return;
      }

      const actionBtn = e.target.closest('[data-tut-action]');
      if (actionBtn) {
        handleAction(actionBtn.dataset.tutAction, actionBtn);
      }
    });

    document.body.appendChild(rootEl);
    return rootEl;
  }

  function bindKeyboard() {
    if (keydownHandler || typeof document === 'undefined') return;
    keydownHandler = (e) => {
      if (!openState) return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close({ markDone: true });
      } else if (e.key === 'ArrowRight') {
        if (currentStep < TUTORIAL_TOTAL_STEPS - 1) {
          e.preventDefault();
          soundFX?.playClick?.();
          goToStep(currentStep + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          e.preventDefault();
          soundFX?.playClick?.();
          goToStep(currentStep - 1);
        }
      }
    };
    document.addEventListener('keydown', keydownHandler);
  }

  function unbindKeyboard() {
    if (keydownHandler && typeof document !== 'undefined') {
      document.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
  }

  function goToStep(stepIndex) {
    const nextIdx = Math.max(0, Math.min(TUTORIAL_TOTAL_STEPS - 1, Number(stepIndex) || 0));
    currentStep = nextIdx;
    syncStepEnvironment(currentStep);
    if (openState) {
      render();
    }
  }

  function open(stepIndex = 0) {
    const el = ensureRoot();
    if (!el) return;
    openState = true;
    currentStep = Math.max(0, Math.min(TUTORIAL_TOTAL_STEPS - 1, Number(stepIndex) || 0));
    el.classList.add('open');
    syncStepEnvironment(currentStep);
    render();
    startPortraitLoop();
    bindKeyboard();
  }

  function close({ markDone = true } = {}) {
    openState = false;
    stopPortraitLoop();
    unbindKeyboard();
    if (markDone) {
      writeStorage(TUTORIAL_STORAGE_KEY, '1');
    }
    if (rootEl) {
      rootEl.classList.remove('open');
    }
  }

  function maybeAutoStart(delayMs = 420) {
    if (readStorage(TUTORIAL_STORAGE_KEY) === '1') return false;
    setTimeout(() => {
      if (readStorage(TUTORIAL_STORAGE_KEY) !== '1' && !openState) {
        open(0);
      }
    }, delayMs);
    return true;
  }

  function refreshLocale() {
    if (openState && rootEl) {
      render();
    }
  }

  function setClaimed(flag) {
    bonusClaimed = Boolean(flag);
    if (openState && rootEl) render();
  }

  function setBgmPlaying(flag) {
    bgmPlaying = Boolean(flag);
    if (openState && rootEl) render();
  }

  return {
    open,
    close,
    goToStep,
    next: () => handleAction('next'),
    prev: () => handleAction('prev'),
    maybeAutoStart,
    refreshLocale,
    setClaimed,
    setBgmPlaying,
    isOpen: () => openState,
    getSelectedRole: () => selectedRole,
    getCurrentStep: () => currentStep,
  };
}
