/**
 * PixelCompute Town — 8-bit Retro Web Audio API Synthesizer
 * Zero-dependency ES Module. Muted by default to respect browser UX.
 */

class RetroSoundFX {
  constructor() {
    this._enabled = false;
    this._ctx = null;
    this._masterGain = null;
  }

  get enabled() {
    return this._enabled;
  }

  get muted() {
    return !this._enabled;
  }

  isEnabled() {
    return this._enabled;
  }

  isMuted() {
    return !this._enabled;
  }

  _ensureContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this._ctx) {
      this._ctx = new AudioCtx();
      this._masterGain = this._ctx.createGain();
      // Keep overall level comfortable and warm
      this._masterGain.gain.value = 0.22;

      // Gentle low-pass filter to remove harsh high-frequency square-wave buzz
      const filter = this._ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3400;
      filter.Q.value = 0.6;

      this._masterGain.connect(filter);
      filter.connect(this._ctx.destination);
    }

    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  setEnabled(flag) {
    this._enabled = Boolean(flag);
    if (this._enabled) {
      this._ensureContext();
    }
    return this._enabled;
  }

  toggle() {
    this._enabled = !this._enabled;
    if (this._enabled) {
      this._ensureContext();
      this.playClick();
    }
    return this._enabled;
  }

  /**
   * Play a single shaped 8-bit tone.
   */
  _tone(freq, startOffset, duration, type = 'square', volume = 0.5, slideToFreq = null) {
    if (!this._enabled) return;
    const ctx = this._ensureContext();
    if (!ctx || !this._masterGain) return;

    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, now + duration);
    }

    // Smooth click-free envelope
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.012, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this._masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Subtle crisp UI click blip.
   */
  playClick() {
    this._tone(680, 0, 0.045, 'triangle', 0.45, 920);
  }

  /**
   * Upbeat worker dispatch / task claim chime.
   */
  playDispatch() {
    this._tone(523.25, 0, 0.075, 'square', 0.32); // C5
    this._tone(659.25, 0.06, 0.075, 'square', 0.34); // E5
    this._tone(783.99, 0.12, 0.11, 'triangle', 0.48); // G5
  }

  /**
   * Classic crisp 8-bit gold coin ding (B5 -> E6).
   */
  playCoin() {
    this._tone(987.77, 0, 0.07, 'square', 0.36); // B5
    this._tone(1318.51, 0.065, 0.24, 'square', 0.38); // E6
    this._tone(1318.51, 0.065, 0.24, 'triangle', 0.25);
  }

  /**
   * Triumphant proof-of-work verification pass jingle.
   */
  playVerify() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((n, idx) => {
      this._tone(n, idx * 0.075, idx === 3 ? 0.22 : 0.085, 'square', 0.32);
      this._tone(n * 0.5, idx * 0.075, 0.08, 'triangle', 0.24);
    });
  }

  /**
   * Soft retro rejection / AI-slop warning buzz (never harsh).
   */
  playReject() {
    this._tone(329.63, 0, 0.1, 'sawtooth', 0.26, 293.66); // E4 -> D4
    this._tone(246.94, 0.11, 0.18, 'sawtooth', 0.28, 196.0); // B3 -> G3
  }

  /**
   * Celebratory project launch fanfare + pixel firework sparkle!
   */
  playLaunch() {
    const melody = [
      { f: 523.25, t: 0.0, d: 0.09 }, // C5
      { f: 659.25, t: 0.09, d: 0.09 }, // E5
      { f: 783.99, t: 0.18, d: 0.09 }, // G5
      { f: 1046.5, t: 0.28, d: 0.16 }, // C6
      { f: 783.99, t: 0.44, d: 0.09 }, // G5
      { f: 1046.5, t: 0.54, d: 0.12 }, // C6
      { f: 1318.51, t: 0.66, d: 0.34 }, // E6
    ];
    for (const note of melody) {
      this._tone(note.f, note.t, note.d, 'square', 0.32);
      this._tone(note.f * 0.5, note.t, note.d + 0.04, 'triangle', 0.3);
    }
    // Firework shimmer notes
    this._tone(1567.98, 0.72, 0.12, 'triangle', 0.22); // G6
    this._tone(2093.0, 0.80, 0.18, 'triangle', 0.2); // C7
  }

  /**
   * Dramatic two-stage 8-bit sound: laser blade slash + crisp gold coins dropping into bag!
   * Used when rejecting AI slop and slashing the submitter's sincerity stake.
   */
  playSlash() {
    // Stage 1: Crisp cyber laser/blade slash (0.00s - 0.15s)
    this._tone(1480.0, 0.0, 0.115, 'sawtooth', 0.34, 155.0);
    this._tone(880.0, 0.0, 0.095, 'square', 0.28, 110.0);
    this._tone(1975.53, 0.015, 0.055, 'triangle', 0.3, 660.0); // metallic glint
    this._tone(155.0, 0.045, 0.085, 'triangle', 0.36, 55.0); // punchy impact thump

    // Stage 2: Crisp gold coins dropping into bag (0.16s - 0.54s)
    this._tone(987.77, 0.16, 0.065, 'square', 0.32); // B5
    this._tone(1318.51, 0.215, 0.085, 'square', 0.35); // E6
    this._tone(1318.51, 0.215, 0.085, 'triangle', 0.22);
    this._tone(1567.98, 0.285, 0.12, 'square', 0.34); // G6
    this._tone(1975.53, 0.345, 0.19, 'triangle', 0.3); // B6 sparkle tail
  }

  /**
   * Bright 4-note 8-bit victory horn arpeggio for approving quality PRs & earning review reward!
   */
  playApproveFanfare() {
    const notes = [
      { f: 523.25, t: 0.0, d: 0.09 }, // C5
      { f: 659.25, t: 0.085, d: 0.09 }, // E5
      { f: 783.99, t: 0.17, d: 0.09 }, // G5
      { f: 1046.5, t: 0.255, d: 0.3 }, // C6 triumphant peak
    ];
    for (const note of notes) {
      this._tone(note.f, note.t, note.d, 'square', 0.33);
      this._tone(note.f * 0.5, note.t, note.d + 0.03, 'triangle', 0.26);
    }
    // Bright harmonic triad shimmer on peak note
    this._tone(1318.51, 0.295, 0.22, 'triangle', 0.22); // E6
    this._tone(1567.98, 0.335, 0.24, 'triangle', 0.18); // G6
  }
}

export const soundFX = new RetroSoundFX();
