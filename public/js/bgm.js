/**
 * PixelCompute Town — 8-bit Retro Original Chiptune BGM Engine
 * Zero external audio files, zero external dependencies.
 * Pure browser-native Web Audio API synthesizer with lookahead scheduling,
 * authentic NES pulse waves (12.5% / 25% / 50%), warm triangle bass,
 * low-passed white-noise percussion, and 4 complete 24-bar original tracks.
 */

const STORAGE_KEY = 'pixelcompute_bgm_v1';
const DEFAULT_VOLUME = 0.32;
const DEFAULT_TRACK_ID = 'plaza';
const MASTER_LOWPASS_HZ = 3400;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.14;

/**
 * Room / scene -> default BGM track mapping.
 */
export const SCENE_TRACK_MAP = Object.freeze({
  town: 'plaza',
  launchpad: 'plaza',
  factory: 'factory',
  guild: 'guild',
  lounge: 'guild',
  vault: 'vault',
});

/**
 * Public metadata for all 4 original 8-bit chiptune tracks.
 */
export const BGM_TRACKS = Object.freeze([
  Object.freeze({
    id: 'plaza',
    nameZhTW: '像素晨光・廣場序曲',
    nameZhCN: '像素晨光・广场序曲',
    nameEn: 'Pixel Horizon',
    moodZhTW: '明快溫馨・開羅風',
    moodZhCN: '明快温馨・开罗风',
    moodEn: 'Bright & Cozy Town',
    bpm: 116,
    bars: 24,
    key: 'C Major',
    scenes: Object.freeze(['town', 'launchpad']),
  }),
  Object.freeze({
    id: 'factory',
    nameZhTW: '霓虹流水線・超算節拍',
    nameZhCN: '霓虹流水线・超算节拍',
    nameEn: 'Neon Pipeline',
    moodZhTW: '輕快賽博・脈衝節拍',
    moodZhCN: '轻快赛博・脉冲节拍',
    moodEn: 'Upbeat Cyber Pulse',
    bpm: 126,
    bars: 24,
    key: 'A Minor',
    scenes: Object.freeze(['factory']),
  }),
  Object.freeze({
    id: 'guild',
    nameZhTW: '匠人木屋・工會小調',
    nameZhCN: '匠人木屋・工会小调',
    nameEn: 'Artisan Hearth',
    moodZhTW: '溫暖酒館・冒險RPG',
    moodZhCN: '温暖酒馆・冒险RPG',
    moodEn: 'Warm Tavern RPG',
    bpm: 104,
    bars: 24,
    key: 'G Major',
    scenes: Object.freeze(['guild', 'lounge']),
  }),
  Object.freeze({
    id: 'vault',
    nameZhTW: '流金分紅・榮耀狂想',
    nameZhCN: '流金分红・荣耀狂想',
    nameEn: 'Golden Dividend',
    moodZhTW: '璀璨歡快・勝利狂想',
    moodZhCN: '璀璨欢快・胜利狂想',
    moodEn: 'Radiant Victory Fanfare',
    bpm: 122,
    bars: 24,
    key: 'D Major',
    scenes: Object.freeze(['vault']),
  }),
]);

// ---------------------------------------------------------------------------
// Pitch & Musical Pattern Compiler
// ---------------------------------------------------------------------------

const SEMITONE_MAP = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

const FREQ_CACHE = new Map();

function noteToFreq(note) {
  if (!note) return 0;
  const cached = FREQ_CACHE.get(note);
  if (cached !== undefined) return cached;
  const m = /^([A-G][#b]?)(-?\d)$/.exec(note);
  if (!m) return 0;
  const semitone = SEMITONE_MAP[m[1]];
  if (semitone === undefined) return 0;
  const octave = Number(m[2]);
  const midi = (octave + 1) * 12 + semitone;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  FREQ_CACHE.set(note, freq);
  return freq;
}

/**
 * Compiles an array of 16-token bars into an indexed step map.
 * Tokens:
 *   - Note name (e.g. 'C5', 'F#4', 'Bb3'): triggers a note
 *   - '~' or '-': extends the duration of the previous note by 1 sixteenth step
 *   - '.': silence / rest
 * Returns an Array of length (bars.length * 16), where each trigger step holds
 * `{ freq, note, durSteps }` and non-trigger steps hold `null`.
 */
function compileMelodyBars(bars) {
  const flat = [];
  for (let b = 0; b < bars.length; b++) {
    const tokens = bars[b].trim().split(/\s+/);
    for (let i = 0; i < 16; i++) {
      flat.push(tokens[i] || '.');
    }
  }
  const events = new Array(flat.length).fill(null);
  let active = null;
  for (let s = 0; s < flat.length; s++) {
    const tok = flat[s];
    if (tok === '.' || tok === '_') {
      active = null;
    } else if (tok === '~' || tok === '-') {
      if (active) {
        active.durSteps += 1;
      }
    } else {
      const freq = noteToFreq(tok);
      if (freq > 0) {
        active = { freq, note: tok, durSteps: 1 };
        events[s] = active;
      } else {
        active = null;
      }
    }
  }
  return events;
}

/**
 * Builds one 16-step arpeggio bar from chord tones and a rhythmic index pattern.
 * Example: arpBar(['C4','E4','G4','B4'], '0 . 1 . 2 . 1 . 3 . 2 . 1 . 2 .')
 */
function arpBar(chordNotes, pattern) {
  const tokens = pattern.trim().split(/\s+/);
  const out = [];
  for (let i = 0; i < 16; i++) {
    const tok = tokens[i] || '.';
    if (tok === '.' || tok === '~' || tok === '-') {
      out.push(tok);
    } else {
      const idx = Number(tok);
      out.push(Number.isInteger(idx) && chordNotes[idx] ? chordNotes[idx] : '.');
    }
  }
  return out.join(' ');
}

/**
 * Compiles 16-token drum bars into an Array of hit strings (or null for rest).
 * Legend: K=kick, S=snare, H=closed hat, O=open hat, T=woodblock/rim, C=soft crash.
 */
function compileDrumBars(bars) {
  const out = [];
  for (let b = 0; b < bars.length; b++) {
    const tokens = bars[b].trim().split(/\s+/);
    for (let i = 0; i < 16; i++) {
      const tok = tokens[i] || '.';
      out.push(tok === '.' ? null : tok);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Track 1: PLAZA — 像素晨光・廣場序曲 / Pixel Horizon (116 BPM, C Major, 24 bars)
// Warm, cheerful Kairosoft / Stardew Valley inspired town square overture
// ---------------------------------------------------------------------------

function buildPlazaScore() {
  const leadBars = [
    // Section A (Bars 1-8): Sunny morning stroll
    'E5 ~ G5 ~ C6 ~ B5 A5 G5 ~ ~ . E5 ~ D5 E5',
    'D5 ~ ~ . B4 ~ D5 ~ G5 ~ ~ . F5 ~ E5 D5',
    'E5 ~ C5 ~ A4 ~ C5 D5 E5 ~ ~ . G5 ~ E5 D5',
    'B4 ~ ~ . G4 ~ B4 D5 E5 ~ ~ ~ . . D5 E5',
    'F5 ~ ~ A5 G5 ~ F5 E5 D5 ~ C5 ~ A4 ~ C5 ~',
    'E5 ~ ~ G5 E5 ~ D5 C5 G4 ~ ~ ~ . . C5 D5',
    'F5 ~ E5 D5 C5 ~ D5 E5 F5 ~ A5 ~ G5 ~ F5 ~',
    'D5 ~ ~ . G4 ~ A4 B4 D5 ~ ~ ~ . . . .',

    // Section A' (Bars 9-16): Brighter bustling square with sparkling climb
    'E5 ~ G5 ~ C6 ~ D6 C6 B5 ~ G5 ~ E5 ~ G5 ~',
    'D6 ~ ~ . B5 ~ G5 ~ B5 ~ A5 G5 F5 ~ E5 D5',
    'E5 ~ C5 ~ A4 ~ C5 E5 A5 ~ ~ G5 E5 ~ D5 C5',
    'B4 ~ ~ D5 G5 ~ F5 E5 D5 ~ ~ ~ . . D5 E5',
    'F5 ~ A5 ~ C6 ~ B5 A5 G5 ~ E5 ~ C5 ~ D5 E5',
    'F5 ~ E5 D5 G5 ~ F5 E5 D5 ~ ~ G5 F5 ~ E5 D5',
    'C5 ~ ~ E5 G5 ~ C6 ~ B5 ~ G5 ~ E5 ~ G5 ~',
    'C6 ~ ~ ~ ~ ~ . . G5 ~ E5 ~ C5 ~ D5 E5',

    // Section B (Bars 17-24): Launchpad horizon & warm turnaround
    'A5 ~ ~ G5 A5 ~ C6 ~ A5 ~ G5 F5 E5 ~ F5 ~',
    'G5 ~ ~ F5 G5 ~ B5 ~ A5 ~ G5 F5 E5 ~ D5 ~',
    'E5 ~ ~ D5 E5 ~ G5 ~ B5 ~ A5 G5 E5 ~ D5 ~',
    'C5 ~ ~ B4 C5 ~ E5 ~ A5 ~ G5 E5 C5 ~ D5 E5',
    'F5 ~ ~ E5 F5 ~ A5 ~ C6 ~ B5 A5 G5 ~ F5 ~',
    'G5 ~ ~ F5 E5 ~ D5 ~ B4 ~ D5 G5 A5 ~ B5 ~',
    'G5 ~ ~ E5 B4 ~ E5 G5 A5 ~ ~ G5 E5 ~ C#5 E5',
    'F5 ~ E5 D5 A4 ~ D5 F5 G5 ~ A5 B5 G5 ~ F5 D5',
  ];

  const arpPatternA = '0 . 1 . 2 . 1 . 3 . 2 . 1 . 2 .';
  const arpPatternB = '0 1 2 3 2 1 2 . 0 1 2 3 2 1 0 .';
  const arpBars = [
    // Section A
    arpBar(['C4', 'E4', 'G4', 'C5'], arpPatternA),
    arpBar(['B3', 'D4', 'G4', 'B4'], arpPatternA),
    arpBar(['A3', 'C4', 'E4', 'G4'], arpPatternA),
    arpBar(['G3', 'B3', 'D4', 'G4'], arpPatternA),
    arpBar(['F3', 'A3', 'C4', 'E4'], arpPatternA),
    arpBar(['E3', 'G3', 'C4', 'E4'], arpPatternA),
    arpBar(['D3', 'F3', 'A3', 'C4'], arpPatternA),
    arpBar(['G3', 'B3', 'D4', 'F4'], arpPatternA),
    // Section A'
    arpBar(['C4', 'E4', 'G4', 'C5'], arpPatternB),
    arpBar(['B3', 'D4', 'G4', 'B4'], arpPatternB),
    arpBar(['A3', 'C4', 'E4', 'G4'], arpPatternB),
    arpBar(['G3', 'B3', 'D4', 'G4'], arpPatternB),
    arpBar(['F3', 'A3', 'C4', 'E4'], arpPatternB),
    arpBar(['G3', 'B3', 'D4', 'F4'], arpPatternB),
    arpBar(['C4', 'E4', 'G4', 'C5'], arpPatternB),
    arpBar(['C4', 'E4', 'G4', 'B4'], arpPatternA),
    // Section B
    arpBar(['F3', 'A3', 'C4', 'E4'], arpPatternB),
    arpBar(['G3', 'B3', 'D4', 'F4'], arpPatternB),
    arpBar(['E3', 'G3', 'B3', 'D4'], arpPatternB),
    arpBar(['A3', 'C4', 'E4', 'G4'], arpPatternB),
    arpBar(['D3', 'F3', 'A3', 'C4'], arpPatternB),
    arpBar(['G3', 'B3', 'D4', 'F4'], arpPatternB),
    'E3 . G3 . B3 . D4 . A3 . C#4 . E4 . G4 .',
    'D3 . F3 . A3 . C4 . G3 . B3 . D4 . F4 .',
  ];

  const bassBars = [
    // Section A
    'C3 ~ . . G2 ~ . . C3 ~ . G2 C3 ~ G2 .',
    'B2 ~ . . G2 ~ . . B2 ~ . G2 B2 ~ D3 .',
    'A2 ~ . . E2 ~ . . A2 ~ . E2 A2 ~ G2 .',
    'E2 ~ . . B2 ~ . . E2 ~ . G2 B2 ~ G2 .',
    'F2 ~ . . C3 ~ . . F2 ~ . C3 A2 ~ F2 .',
    'E2 ~ . . C3 ~ . . E2 ~ . G2 C3 ~ G2 .',
    'D2 ~ . . A2 ~ . . D2 ~ . F2 A2 ~ F2 .',
    'G2 ~ . . D3 ~ . . G2 ~ . A2 B2 ~ G2 .',
    // Section A'
    'C3 ~ . G2 C3 ~ G2 . C3 ~ . G2 E3 ~ C3 .',
    'B2 ~ . G2 B2 ~ D3 . G2 ~ . B2 D3 ~ B2 .',
    'A2 ~ . E2 A2 ~ C3 . A2 ~ . E2 G2 ~ E2 .',
    'E2 ~ . B2 E3 ~ B2 . E2 ~ . G2 B2 ~ G2 .',
    'F2 ~ . C3 F3 ~ C3 . F2 ~ . C3 A2 ~ F2 .',
    'G2 ~ . D3 G3 ~ D3 . G2 ~ . B2 D3 ~ B2 .',
    'C3 ~ . G2 E2 ~ G2 . C3 ~ . G2 E3 ~ C3 .',
    'C3 ~ . G2 C3 ~ E3 . G3 ~ . E3 C3 ~ G2 .',
    // Section B
    'F2 ~ . C3 F2 ~ A2 . F2 ~ . C3 F3 ~ C3 .',
    'G2 ~ . D3 G2 ~ B2 . G2 ~ . D3 G3 ~ D3 .',
    'E2 ~ . B2 E2 ~ G2 . E2 ~ . B2 E3 ~ B2 .',
    'A2 ~ . E2 A2 ~ C3 . A2 ~ . E2 G2 ~ E2 .',
    'D2 ~ . A2 D3 ~ A2 . D2 ~ . F2 A2 ~ C3 .',
    'G2 ~ . D3 G2 ~ B2 . G2 ~ . B2 D3 ~ B2 .',
    'E2 ~ . B2 E3 ~ B2 . A2 ~ . E2 A2 ~ G2 .',
    'D2 ~ . A2 D3 ~ C3 . G2 ~ . B2 D3 ~ G2 .',
  ];

  const grooveA = 'KH . H . SH . H . KH . H K SH . H .';
  const grooveB = 'KH . H T SH . H K KH . H T SH . H O';
  const fillBar = 'KH . H . SH . H K KH . T T SH S T O';
  const downBar = 'KC . H . SH . H . KH . H K SH . H .';

  const drumBars = [
    downBar, grooveA, grooveA, grooveA, grooveA, grooveA, grooveA, fillBar,
    downBar, grooveB, grooveB, grooveB, grooveB, grooveB, grooveB, fillBar,
    downBar, grooveB, grooveB, grooveB, grooveB, grooveB, grooveB, fillBar,
  ];

  return {
    bpm: 116,
    totalSteps: 24 * 16,
    voices: {
      lead: { wave: 'pulse25', gain: 0.21, attack: 0.011, release: 0.04, vibrato: true },
      arp: { wave: 'pulse12', gain: 0.095, attack: 0.006, release: 0.028, plucky: true },
      bass: { wave: 'triangle', gain: 0.34, attack: 0.006, release: 0.025 },
      drums: { gain: 0.24 },
    },
    lead: compileMelodyBars(leadBars),
    arp: compileMelodyBars(arpBars),
    bass: compileMelodyBars(bassBars),
    drums: compileDrumBars(drumBars),
  };
}

// ---------------------------------------------------------------------------
// Track 2: FACTORY — 霓虹流水線・超算節拍 / Neon Pipeline (126 BPM, A Minor, 24 bars)
// Energetic cyber-pulse groove for the Auto-Factory & GPU Compute Nodes
// ---------------------------------------------------------------------------

function buildFactoryScore() {
  const leadBars = [
    // Section A (Bars 1-8): Cyber compute motif
    'A4 . C5 E5 ~ D5 C5 B4 A4 . G4 A4 C5 ~ B4 .',
    'A4 . C5 E5 ~ G5 ~ E5 D5 ~ C5 B4 C5 ~ . .',
    'F5 . E5 D5 C5 ~ A4 C5 E5 ~ D5 C5 A4 ~ . .',
    'G5 . F5 E5 D5 ~ B4 D5 G5 ~ ~ . F5 ~ E5 D5',
    'A4 . C5 E5 ~ A5 ~ G5 E5 ~ D5 C5 E5 ~ . .',
    'G5 . E5 C5 G5 ~ A5 G5 E5 ~ D5 C5 G4 ~ . .',
    'F5 ~ E5 D5 A4 ~ D5 F5 A5 ~ G5 F5 E5 ~ D5 .',
    'E5 ~ G#5 ~ B5 ~ A5 G#5 E5 ~ ~ . D5 ~ C5 B4',

    // Section A' (Bars 9-16): Overclocked pipeline melody
    'A5 . G5 E5 A5 ~ G5 E5 C5 ~ D5 E5 A5 ~ . .',
    'G5 . F5 D5 G5 ~ F5 D5 B4 ~ C5 D5 G5 ~ . .',
    'F5 . E5 C5 F5 ~ E5 C5 A4 ~ C5 E5 F5 ~ E5 D5',
    'E5 ~ D5 B4 E5 ~ G5 B5 G5 ~ E5 D5 B4 ~ . .',
    'D5 . F5 A5 ~ G5 F5 E5 D5 ~ C5 A4 D5 ~ E5 F5',
    'E5 . C5 A4 E5 ~ A5 G5 E5 ~ C5 A4 C5 ~ E5 .',
    'F5 ~ E5 D5 B4 ~ D5 F5 E5 ~ G#5 ~ B5 ~ A5 G#5',
    'A5 ~ ~ ~ E5 ~ C5 ~ A4 ~ ~ . E5 ~ G5 ~',

    // Section B (Bars 17-24): Neon bridge & rapid ascent
    'A5 ~ ~ G5 A5 ~ C6 ~ A5 ~ G5 E5 F5 ~ E5 C5',
    'G5 ~ ~ F5 G5 ~ B5 ~ G5 ~ F5 D5 E5 ~ D5 B4',
    'E5 ~ ~ D5 E5 ~ G5 ~ B5 ~ A5 G5 E5 ~ G5 B5',
    'A5 ~ ~ G5 E5 ~ C5 ~ A4 ~ C5 E5 A5 ~ G5 E5',
    'F5 ~ ~ E5 F5 ~ A5 ~ C6 ~ B5 A5 F5 ~ A5 C6',
    'B5 ~ ~ A5 G5 ~ D5 ~ G5 ~ A5 B5 G5 ~ F5 D5',
    'F5 ~ E5 D5 A4 ~ D5 F5 A5 ~ G5 F5 D5 ~ F5 A5',
    'G#5 ~ ~ . B5 ~ E5 G#5 B5 ~ A5 G#5 E5 ~ D5 B4',
  ];

  const arpFast = '0 1 2 3 2 1 0 1 2 3 2 1 3 2 1 2';
  const arpSync = '0 . 1 2 . 3 2 1 0 . 1 2 3 . 2 1';
  const arpBars = [
    // Section A
    arpBar(['A3', 'C4', 'E4', 'A4'], arpSync),
    arpBar(['A3', 'C4', 'E4', 'G4'], arpSync),
    arpBar(['F3', 'A3', 'C4', 'E4'], arpSync),
    arpBar(['G3', 'B3', 'D4', 'G4'], arpSync),
    arpBar(['A3', 'C4', 'E4', 'A4'], arpSync),
    arpBar(['C4', 'E4', 'G4', 'C5'], arpSync),
    arpBar(['D3', 'F3', 'A3', 'C4'], arpSync),
    arpBar(['E3', 'G#3', 'B3', 'D4'], arpFast),
    // Section A'
    arpBar(['A3', 'C4', 'E4', 'A4'], arpFast),
    arpBar(['G3', 'B3', 'D4', 'G4'], arpFast),
    arpBar(['F3', 'A3', 'C4', 'E4'], arpFast),
    arpBar(['E3', 'G3', 'B3', 'D4'], arpFast),
    arpBar(['D3', 'F3', 'A3', 'C4'], arpFast),
    arpBar(['C4', 'E4', 'A4', 'C5'], arpFast),
    'D3 F3 A3 B3 D4 B3 A3 F3 E3 G#3 B3 D4 E4 D4 B3 G#3',
    arpBar(['A3', 'C4', 'E4', 'A4'], arpSync),
    // Section B
    arpBar(['F3', 'A3', 'C4', 'E4'], arpFast),
    arpBar(['G3', 'B3', 'D4', 'G4'], arpFast),
    arpBar(['E3', 'G3', 'B3', 'D4'], arpFast),
    arpBar(['A3', 'C4', 'E4', 'A4'], arpFast),
    arpBar(['F3', 'A3', 'C4', 'E4'], arpFast),
    arpBar(['G3', 'B3', 'D4', 'G4'], arpFast),
    arpBar(['D3', 'F3', 'A3', 'C4'], arpFast),
    arpBar(['E3', 'G#3', 'B3', 'E4'], arpFast),
  ];

  const bassBars = [
    // Section A: Driving octave cyber-bass
    'A2 . A3 . A2 . A3 . A2 . G2 . A2 . E2 .',
    'A2 . A3 . A2 . A3 . G2 . G3 . E2 . G2 .',
    'F2 . F3 . F2 . F3 . F2 . C3 . F2 . A2 .',
    'G2 . G3 . G2 . G3 . G2 . D3 . G2 . B2 .',
    'A2 . A3 . A2 . A3 . A2 . E2 . A2 . B2 .',
    'C3 . C4 . C3 . G2 . C3 . G2 . E2 . G2 .',
    'D2 . D3 . D2 . D3 . D2 . A2 . D2 . F2 .',
    'E2 . E3 . E2 . E3 . E2 . G#2 . B2 . E2 .',
    // Section A'
    'A2 . A3 A2 . A3 E2 . A2 . A3 A2 G2 . E2 .',
    'G2 . G3 G2 . G3 D2 . G2 . G3 G2 B2 . D3 .',
    'F2 . F3 F2 . F3 C3 . F2 . F3 F2 A2 . C3 .',
    'E2 . E3 E2 . E3 B2 . E2 . E3 E2 G2 . B2 .',
    'D2 . D3 D2 . D3 A2 . D2 . D3 D2 F2 . A2 .',
    'C3 . C4 C3 . A2 E2 . C3 . A2 E2 A2 . C3 .',
    'B2 . D3 F3 D3 . B2 . E2 . G#2 B2 E3 . B2 .',
    'A2 . A3 . A2 . E2 . A2 . C3 . E3 . G3 .',
    // Section B
    'F2 . F3 . F2 . C3 . F2 . F3 . A2 . C3 .',
    'G2 . G3 . G2 . D3 . G2 . G3 . B2 . D3 .',
    'E2 . E3 . E2 . B2 . E2 . E3 . G2 . B2 .',
    'A2 . A3 . A2 . E2 . A2 . A3 . G2 . E2 .',
    'F2 . F3 . F2 . C3 . F2 . F3 . C3 . A2 .',
    'G2 . G3 . G2 . D3 . G2 . G3 . D3 . B2 .',
    'D2 . D3 . D2 . A2 . D2 . D3 . F2 . A2 .',
    'E2 . E3 . E2 . B2 . E2 . G#2 . B2 . E3 .',
  ];

  const beatA = 'KH . H . SH . H K KH . H . SH . H O';
  const beatB = 'KH H H K SH . H K KH H H K SH . H O';
  const downB = 'KC . H . SH . H K KH . H K SH . H O';
  const fillB = 'KH . H K SH . S K KH . S T SH S S O';

  const drumBars = [
    downB, beatA, beatA, beatA, beatA, beatA, beatA, fillB,
    downB, beatB, beatB, beatB, beatB, beatB, beatB, fillB,
    downB, beatB, beatB, beatB, beatB, beatB, beatB, fillB,
  ];

  return {
    bpm: 126,
    totalSteps: 24 * 16,
    voices: {
      lead: { wave: 'square', gain: 0.175, attack: 0.008, release: 0.032, vibrato: true },
      arp: { wave: 'pulse25', gain: 0.082, attack: 0.005, release: 0.022, plucky: true },
      bass: { wave: 'triangle', gain: 0.36, attack: 0.005, release: 0.022 },
      drums: { gain: 0.27 },
    },
    lead: compileMelodyBars(leadBars),
    arp: compileMelodyBars(arpBars),
    bass: compileMelodyBars(bassBars),
    drums: compileDrumBars(drumBars),
  };
}

// ---------------------------------------------------------------------------
// Track 3: GUILD — 匠人木屋・工會小調 / Artisan Hearth (104 BPM, G Major, 24 bars)
// Warm adventurer's tavern / cozy wooden hearth RPG folk melody
// ---------------------------------------------------------------------------

function buildGuildScore() {
  const leadBars = [
    // Section A (Bars 1-8): Warm tavern flute & hearth melody
    'D5 ~ ~ E5 D5 ~ B4 A4 G4 ~ B4 D5 G5 ~ ~ .',
    'F#5 ~ ~ G5 F#5 ~ D5 B4 A4 ~ ~ ~ . . B4 C5',
    'B4 ~ ~ A4 G4 ~ E4 G4 B4 ~ D5 ~ E5 ~ D5 B4',
    'A4 ~ ~ B4 D5 ~ B4 A4 F#4 ~ ~ ~ . . G4 A4',
    'G4 ~ ~ A4 B4 ~ C5 D5 E5 ~ ~ G5 E5 ~ D5 C5',
    'D5 ~ ~ E5 D5 ~ B4 G4 B4 ~ ~ ~ . . A4 B4',
    'C5 ~ ~ B4 A4 ~ G4 E4 A4 ~ C5 ~ E5 ~ D5 C5',
    'D5 ~ ~ ~ A4 ~ B4 C5 D5 ~ ~ ~ . . . .',

    // Section A' (Bars 9-16): Heartfelt storytelling variation
    'B4 ~ D5 ~ G5 ~ F#5 G5 A5 ~ G5 F#5 D5 ~ ~ .',
    'A5 ~ ~ B5 A5 ~ F#5 D5 F#5 ~ E5 D5 A4 ~ B4 C5',
    'B4 ~ E5 ~ G5 ~ F#5 E5 D5 ~ B4 G4 E5 ~ D5 B4',
    'D5 ~ ~ E5 F#5 ~ D5 B4 D5 ~ ~ ~ . . B4 D5',
    'E5 ~ ~ G5 E5 ~ C5 G4 C5 ~ D5 E5 G5 ~ F#5 E5',
    'F#5 ~ ~ G5 A5 ~ F#5 D5 A4 ~ B4 C5 D5 ~ F#5 ~',
    'G5 ~ ~ F#5 D5 ~ B4 A4 G4 ~ B4 D5 G5 ~ ~ .',
    'G5 ~ ~ ~ ~ ~ . . D5 ~ B4 ~ G4 ~ A4 B4',

    // Section B (Bars 17-24): Quiet lantern lounge & gentle return
    'E5 ~ ~ D5 E5 ~ G5 ~ F#5 ~ E5 D5 B4 ~ ~ .',
    'D5 ~ ~ C#5 D5 ~ F#5 ~ E5 ~ D5 B4 A4 ~ ~ .',
    'C5 ~ ~ B4 C5 ~ E5 ~ G5 ~ F#5 E5 D5 ~ C5 ~',
    'B4 ~ ~ A4 G4 ~ B4 D5 G5 ~ F#5 D5 B4 ~ ~ .',
    'C5 ~ ~ D5 E5 ~ G5 ~ E5 ~ D5 C5 A4 ~ ~ .',
    'B4 ~ ~ A4 G4 ~ E4 G4 B4 ~ D5 E5 D5 ~ B4 ~',
    'C5 ~ B4 A4 G4 ~ C5 E5 A5 ~ G5 E5 C5 ~ B4 A4',
    'D5 ~ ~ E5 F#5 ~ A5 ~ F#5 ~ D5 C5 A4 ~ B4 C5',
  ];

  // Lute-like gentle broken chord pattern (off-beat warmth)
  const luteA = '. . 0 . 1 . 2 . . . 1 . 2 . 3 .';
  const luteB = '0 . 1 . 2 . 3 . 2 . 1 . 2 . 1 .';
  const arpBars = [
    // Section A
    arpBar(['G3', 'B3', 'D4', 'G4'], luteA),
    arpBar(['F#3', 'A3', 'D4', 'F#4'], luteA),
    arpBar(['E3', 'G3', 'B3', 'D4'], luteA),
    arpBar(['F#3', 'B3', 'D4', 'F#4'], luteA),
    arpBar(['E3', 'G3', 'C4', 'E4'], luteA),
    arpBar(['D3', 'G3', 'B3', 'D4'], luteA),
    arpBar(['E3', 'A3', 'C4', 'E4'], luteA),
    arpBar(['F#3', 'A3', 'C4', 'D4'], luteA),
    // Section A'
    arpBar(['G3', 'B3', 'D4', 'G4'], luteB),
    arpBar(['F#3', 'A3', 'D4', 'F#4'], luteB),
    arpBar(['E3', 'G3', 'B3', 'D4'], luteB),
    arpBar(['F#3', 'B3', 'D4', 'F#4'], luteB),
    arpBar(['E3', 'G3', 'C4', 'E4'], luteB),
    arpBar(['F#3', 'A3', 'C4', 'D4'], luteB),
    arpBar(['G3', 'B3', 'D4', 'G4'], luteB),
    arpBar(['G3', 'B3', 'D4', 'G4'], luteA),
    // Section B
    arpBar(['E3', 'G3', 'B3', 'D4'], luteB),
    arpBar(['F#3', 'B3', 'D4', 'F#4'], luteB),
    arpBar(['E3', 'G3', 'C4', 'E4'], luteB),
    arpBar(['D3', 'G3', 'B3', 'D4'], luteB),
    arpBar(['E3', 'A3', 'C4', 'E4'], luteB),
    arpBar(['E3', 'G3', 'B3', 'D4'], luteB),
    'E3 . G3 . C4 . E4 . E3 . A3 . C4 . E4 .',
    arpBar(['F#3', 'A3', 'C4', 'D4'], luteB),
  ];

  const bassBars = [
    // Section A: Cozy folk acoustic triangle bass
    'G2 ~ ~ ~ D3 ~ . . G2 ~ ~ ~ D3 ~ B2 .',
    'F#2 ~ ~ ~ D3 ~ . . F#2 ~ ~ ~ A2 ~ D3 .',
    'E2 ~ ~ ~ B2 ~ . . E2 ~ ~ ~ G2 ~ B2 .',
    'B2 ~ ~ ~ F#2 ~ . . B2 ~ ~ ~ F#2 ~ B2 .',
    'C3 ~ ~ ~ G2 ~ . . C3 ~ ~ ~ G2 ~ C3 .',
    'B2 ~ ~ ~ G2 ~ . . B2 ~ ~ ~ D3 ~ G2 .',
    'A2 ~ ~ ~ E2 ~ . . A2 ~ ~ ~ E2 ~ A2 .',
    'D2 ~ ~ ~ A2 ~ . . D2 ~ ~ ~ A2 ~ F#2 .',
    // Section A'
    'G2 ~ ~ . D3 ~ G2 . G2 ~ ~ . D3 ~ B2 .',
    'F#2 ~ ~ . D3 ~ A2 . F#2 ~ ~ . A2 ~ D3 .',
    'E2 ~ ~ . B2 ~ G2 . E2 ~ ~ . G2 ~ B2 .',
    'B2 ~ ~ . F#2 ~ D2 . B2 ~ ~ . F#2 ~ B2 .',
    'C3 ~ ~ . G2 ~ E2 . C3 ~ ~ . G2 ~ C3 .',
    'D2 ~ ~ . A2 ~ F#2 . D2 ~ ~ . A2 ~ D3 .',
    'G2 ~ ~ . D3 ~ B2 . G2 ~ ~ . D3 ~ G2 .',
    'G2 ~ ~ ~ D3 ~ . . G2 ~ ~ ~ F#2 ~ . .',
    // Section B
    'E2 ~ ~ . B2 ~ E3 . E2 ~ ~ . B2 ~ G2 .',
    'B2 ~ ~ . F#2 ~ B2 . B2 ~ ~ . F#2 ~ D3 .',
    'C3 ~ ~ . G2 ~ C3 . C3 ~ ~ . G2 ~ E2 .',
    'G2 ~ ~ . D3 ~ G2 . G2 ~ ~ . D3 ~ B2 .',
    'A2 ~ ~ . E2 ~ A2 . A2 ~ ~ . E2 ~ C3 .',
    'E2 ~ ~ . B2 ~ G2 . E2 ~ ~ . G2 ~ B2 .',
    'C3 ~ ~ . G2 ~ . . A2 ~ ~ . E2 ~ G2 .',
    'D2 ~ ~ . A2 ~ D3 . D2 ~ ~ . A2 ~ F#2 .',
  ];

  // Soft hearth percussion: gentle kick + woodblock rim + light brush hat
  const hearthA = 'K . . . T . H . K . . . T . H .';
  const hearthB = 'K . H . T . H . K . H K T . H .';
  const hearthDown = 'KC . . . T . H . K . . . T . H .';
  const hearthFill = 'K . H . T . H . K . T . T . H O';

  const drumBars = [
    hearthDown, hearthA, hearthA, hearthA, hearthA, hearthA, hearthA, hearthFill,
    hearthDown, hearthB, hearthB, hearthB, hearthB, hearthB, hearthB, hearthFill,
    hearthDown, hearthB, hearthB, hearthB, hearthB, hearthB, hearthB, hearthFill,
  ];

  return {
    bpm: 104,
    totalSteps: 24 * 16,
    voices: {
      lead: { wave: 'pulse25', gain: 0.195, attack: 0.016, release: 0.052, vibrato: true },
      arp: { wave: 'pulse12', gain: 0.088, attack: 0.008, release: 0.036, plucky: true },
      bass: { wave: 'triangle', gain: 0.35, attack: 0.009, release: 0.035 },
      drums: { gain: 0.18 },
    },
    lead: compileMelodyBars(leadBars),
    arp: compileMelodyBars(arpBars),
    bass: compileMelodyBars(bassBars),
    drums: compileDrumBars(drumBars),
  };
}

// ---------------------------------------------------------------------------
// Track 4: VAULT — 流金分紅・榮耀狂想 / Golden Dividend (122 BPM, D Major, 24 bars)
// Radiant, jubilant victory fanfare & golden treasury celebration
// ---------------------------------------------------------------------------

function buildVaultScore() {
  const leadBars = [
    // Section A (Bars 1-8): Sparkling golden fanfare
    'A4 . D5 ~ F#5 ~ A5 ~ D6 ~ ~ C#6 B5 ~ A5 ~',
    'A5 ~ ~ G5 E5 ~ A5 ~ C#6 ~ ~ B5 A5 ~ G5 E5',
    'F#5 ~ ~ E5 D5 ~ F#5 ~ B5 ~ ~ A5 F#5 ~ D5 ~',
    'C#5 ~ ~ D5 E5 ~ F#5 ~ A5 ~ ~ ~ . . E5 F#5',
    'G5 ~ ~ A5 B5 ~ D6 ~ B5 ~ A5 G5 F#5 ~ G5 ~',
    'A5 ~ ~ G5 F#5 ~ D5 ~ A4 ~ D5 F#5 A5 ~ G5 F#5',
    'G5 ~ F#5 E5 B4 ~ E5 G5 B5 ~ A5 G5 F#5 ~ E5 ~',
    'E5 ~ ~ F#5 G5 ~ A5 ~ C#6 ~ B5 A5 G5 ~ F#5 E5',

    // Section A' (Bars 9-16): Shower of golden coins & triumph
    'D5 . F#5 A5 ~ D6 ~ C#6 D6 ~ A5 ~ F#5 ~ A5 ~',
    'E6 ~ ~ D6 C#6 ~ A5 ~ E5 ~ A5 C#6 E6 ~ D6 C#6',
    'D6 ~ ~ C#6 B5 ~ F#5 ~ D5 ~ F#5 B5 D6 ~ C#6 B5',
    'A5 ~ ~ G5 F#5 ~ C#5 ~ F#5 ~ A5 C#6 A5 ~ F#5 ~',
    'B5 ~ ~ C#6 D6 ~ B5 G5 D5 ~ G5 B5 D6 ~ C#6 B5',
    'A5 ~ G5 F#5 E5 ~ A5 C#6 E6 ~ ~ D6 C#6 ~ B5 A5',
    'D6 ~ ~ ~ A5 ~ F#5 ~ D5 ~ F#5 A5 D6 ~ ~ .',
    'D6 ~ ~ ~ ~ ~ . . A5 ~ F#5 ~ D5 ~ E5 F#5',

    // Section B (Bars 17-24): Grand dividend celebration & royal return
    'G5 ~ ~ A5 B5 ~ D6 ~ B5 ~ A5 G5 D5 ~ G5 B5',
    'A5 ~ ~ B5 C#6 ~ E6 ~ C#6 ~ B5 A5 E5 ~ A5 C#6',
    'F#5 ~ ~ G5 A5 ~ C#6 ~ A5 ~ G5 F#5 C#5 ~ F#5 A5',
    'B5 ~ ~ A5 F#5 ~ D5 ~ B4 ~ D5 F#5 B5 ~ A5 F#5',
    'G5 ~ ~ F#5 E5 ~ G5 B5 E6 ~ D6 C#6 B5 ~ A5 G5',
    'A5 ~ ~ G5 E5 ~ C#5 E5 A5 ~ B5 C#6 E6 ~ D6 C#6',
    'D6 ~ ~ A5 F#5 ~ A5 D6 B5 ~ ~ A5 F#5 ~ D5 ~',
    'G5 ~ F#5 E5 B4 ~ E5 G5 A5 ~ B5 C#6 A5 ~ G5 E5',
  ];

  const coinArpA = '0 1 2 3 2 1 0 . 0 1 2 3 2 1 2 .';
  const coinArpB = '0 2 1 3 0 2 1 3 0 2 1 3 2 1 2 3';
  const arpBars = [
    // Section A
    arpBar(['D4', 'F#4', 'A4', 'D5'], coinArpA),
    arpBar(['C#4', 'E4', 'A4', 'C#5'], coinArpA),
    arpBar(['B3', 'D4', 'F#4', 'B4'], coinArpA),
    arpBar(['A3', 'C#4', 'F#4', 'A4'], coinArpA),
    arpBar(['G3', 'B3', 'D4', 'G4'], coinArpA),
    arpBar(['A3', 'D4', 'F#4', 'A4'], coinArpA),
    arpBar(['G3', 'B3', 'E4', 'G4'], coinArpA),
    arpBar(['A3', 'C#4', 'E4', 'G4'], coinArpA),
    // Section A'
    arpBar(['D4', 'F#4', 'A4', 'D5'], coinArpB),
    arpBar(['C#4', 'E4', 'A4', 'C#5'], coinArpB),
    arpBar(['B3', 'D4', 'F#4', 'B4'], coinArpB),
    arpBar(['A3', 'C#4', 'F#4', 'A4'], coinArpB),
    arpBar(['G3', 'B3', 'D4', 'G4'], coinArpB),
    arpBar(['A3', 'C#4', 'E4', 'G4'], coinArpB),
    arpBar(['D4', 'F#4', 'A4', 'D5'], coinArpB),
    arpBar(['D4', 'F#4', 'A4', 'D5'], coinArpA),
    // Section B
    arpBar(['G3', 'B3', 'D4', 'G4'], coinArpB),
    arpBar(['A3', 'C#4', 'E4', 'A4'], coinArpB),
    arpBar(['A3', 'C#4', 'F#4', 'A4'], coinArpB),
    arpBar(['B3', 'D4', 'F#4', 'B4'], coinArpB),
    arpBar(['G3', 'B3', 'E4', 'G4'], coinArpB),
    arpBar(['A3', 'C#4', 'E4', 'G4'], coinArpB),
    'D4 F#4 A4 D5 A4 F#4 D4 . B3 D4 F#4 B4 F#4 D4 B3 .',
    'G3 B3 E4 G4 E4 B3 G3 . A3 C#4 E4 G4 A4 G4 E4 C#4',
  ];

  const bassBars = [
    // Section A: Jubilant golden march bass
    'D3 ~ . A2 D3 ~ A2 . D3 ~ . A2 F#3 ~ D3 .',
    'C#3 ~ . A2 C#3 ~ A2 . C#3 ~ . A2 E3 ~ C#3 .',
    'B2 ~ . F#2 B2 ~ F#2 . B2 ~ . F#2 D3 ~ B2 .',
    'F#2 ~ . C#3 F#2 ~ C#3 . F#2 ~ . A2 C#3 ~ A2 .',
    'G2 ~ . D3 G2 ~ D3 . G2 ~ . B2 D3 ~ B2 .',
    'F#2 ~ . D3 A2 ~ D3 . F#2 ~ . A2 D3 ~ A2 .',
    'E2 ~ . B2 E2 ~ B2 . E2 ~ . G2 B2 ~ G2 .',
    'A2 ~ . E2 A2 ~ C#3 . E3 ~ . C#3 A2 ~ G2 .',
    // Section A'
    'D3 . A2 . D3 . F#3 . D3 . A2 . F#2 . A2 .',
    'C#3 . A2 . C#3 . E3 . C#3 . A2 . E2 . A2 .',
    'B2 . F#2 . B2 . D3 . B2 . F#2 . D2 . F#2 .',
    'F#2 . C#3 . F#2 . A2 . F#2 . C#3 . A2 . F#2 .',
    'G2 . D3 . G2 . B2 . G2 . D3 . B2 . G2 .',
    'A2 . E2 . A2 . C#3 . A2 . E3 . C#3 . A2 .',
    'D3 . A2 . F#2 . A2 . D3 . F#3 . A3 . F#3 .',
    'D3 ~ . A2 D3 ~ F#3 . D3 ~ . A2 F#2 ~ A2 .',
    // Section B
    'G2 . D3 . G2 . B2 . G2 . D3 . G3 . D3 .',
    'A2 . E2 . A2 . C#3 . A2 . E3 . A2 . C#3 .',
    'F#2 . C#3 . F#2 . A2 . F#2 . C#3 . F#3 . C#3 .',
    'B2 . F#2 . B2 . D3 . B2 . F#2 . D3 . B2 .',
    'E2 . B2 . E2 . G2 . E2 . B2 . E3 . B2 .',
    'A2 . E2 . A2 . C#3 . A2 . E3 . C#3 . A2 .',
    'D3 . A2 . F#2 . A2 . B2 . F#2 . D2 . F#2 .',
    'E2 . B2 . G2 . B2 . A2 . C#3 . E3 . G2 .',
  ];

  const marchA = 'KH . H . SH . H K KH . H . SH . H O';
  const marchB = 'KH . H K SH . H K KH . H K SH . S O';
  const marchDown = 'KC . H . SH . H K KH . H K SH . H O';
  const marchFill = 'KH . H K SH . S S KH . S T SH S S O';

  const drumBars = [
    marchDown, marchA, marchA, marchA, marchA, marchA, marchA, marchFill,
    marchDown, marchB, marchB, marchB, marchB, marchB, marchB, marchFill,
    marchDown, marchB, marchB, marchB, marchB, marchB, marchB, marchFill,
  ];

  return {
    bpm: 122,
    totalSteps: 24 * 16,
    voices: {
      lead: { wave: 'pulse25', gain: 0.21, attack: 0.009, release: 0.038, vibrato: true },
      arp: { wave: 'pulse12', gain: 0.095, attack: 0.005, release: 0.024, plucky: true },
      bass: { wave: 'triangle', gain: 0.35, attack: 0.006, release: 0.024 },
      drums: { gain: 0.25 },
    },
    lead: compileMelodyBars(leadBars),
    arp: compileMelodyBars(arpBars),
    bass: compileMelodyBars(bassBars),
    drums: compileDrumBars(drumBars),
  };
}

const SCORES = {
  plaza: buildPlazaScore(),
  factory: buildFactoryScore(),
  guild: buildGuildScore(),
  vault: buildVaultScore(),
};

const TRACK_MAP = new Map(BGM_TRACKS.map((t) => [t.id, t]));

// ---------------------------------------------------------------------------
// Web Audio Chiptune Player Engine
// ---------------------------------------------------------------------------

function clampVolume(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_VOLUME;
  return Math.max(0, Math.min(1, n));
}

function createPulseWave(ctx, dutyCycle) {
  try {
    const harmonics = 24;
    const real = new Float32Array(harmonics + 1);
    const imag = new Float32Array(harmonics + 1);
    for (let n = 1; n <= harmonics; n++) {
      real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * dutyCycle);
    }
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  } catch {
    return null;
  }
}

function createNoiseBuffer(ctx) {
  const sampleRate = ctx.sampleRate || 44100;
  const length = Math.floor(sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  // Deterministic soft LFSR-like white noise for crisp authentic retro percussion
  let seed = 0x51a7c3;
  for (let i = 0; i < length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

class RetroBgmPlayer {
  constructor() {
    this._playing = false;
    this._trackId = DEFAULT_TRACK_ID;
    this._volume = DEFAULT_VOLUME;
    this._autoScene = true;
    this._lastSceneId = null;

    this._listeners = new Set();

    // Audio graph state
    this._ctx = null;
    this._masterFilter = null;
    this._compressor = null;
    this._masterGain = null;
    this._waves = {};
    this._noiseBuffer = null;

    // Lookahead scheduler state
    this._timerId = null;
    this._currentStep = 0;
    this._nextNoteTime = 0;

    this._loadPreferences();
  }

  _loadPreferences() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.volume === 'number' && Number.isFinite(parsed.volume)) {
          this._volume = clampVolume(parsed.volume);
        }
        if (typeof parsed.trackId === 'string' && TRACK_MAP.has(parsed.trackId)) {
          this._trackId = parsed.trackId;
        }
        if (typeof parsed.autoScene === 'boolean') {
          this._autoScene = parsed.autoScene;
        }
      }
    } catch {
      // Ignore storage access or malformed JSON errors
    }
  }

  _savePreferences() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          volume: this._volume,
          trackId: this._trackId,
          autoScene: this._autoScene,
        })
      );
    } catch {
      // Ignore private mode / quota errors
    }
  }

  _ensureAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this._ctx) {
      const ctx = new AudioCtx();
      this._ctx = ctx;

      // Gentle master low-pass filter (~3400Hz) removes harsh square-wave buzz
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = MASTER_LOWPASS_HZ;
      filter.Q.value = 0.65;

      // Soft dynamics compressor keeps chord peaks balanced and distortion-free
      let mixNode = filter;
      if (typeof ctx.createDynamicsCompressor === 'function') {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 18;
        comp.ratio.value = 4;
        comp.attack.value = 0.004;
        comp.release.value = 0.12;
        filter.connect(comp);
        this._compressor = comp;
        mixNode = comp;
      }

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      mixNode.connect(masterGain);
      masterGain.connect(ctx.destination);

      this._masterFilter = filter;
      this._masterGain = masterGain;

      // Pre-build authentic NES 25% & 12.5% duty cycle pulse waves + noise buffer
      this._waves = {
        pulse25: createPulseWave(ctx, 0.25),
        pulse12: createPulseWave(ctx, 0.125),
      };
      this._noiseBuffer = createNoiseBuffer(ctx);
    }

    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }

    return this._ctx;
  }

  _notify() {
    const state = this.getState();
    for (const listener of this._listeners) {
      try {
        listener(state);
      } catch {
        // Isolate subscriber errors from audio engine
      }
    }
  }

  _fadeMasterTo(targetGain, durationSec = 0.1) {
    if (!this._ctx || !this._masterGain) return;
    const now = this._ctx.currentTime;
    const gainParam = this._masterGain.gain;
    const safeTarget = Math.max(0.0001, targetGain);
    try {
      gainParam.cancelScheduledValues(now);
      gainParam.setValueAtTime(Math.max(0.0001, gainParam.value), now);
      gainParam.linearRampToValueAtTime(safeTarget, now + durationSec);
    } catch {
      gainParam.value = safeTarget;
    }
  }

  _startScheduler(startOffsetSec = 0.04) {
    this._stopScheduler();
    const ctx = this._ctx;
    if (!ctx) return;

    this._nextNoteTime = ctx.currentTime + startOffsetSec;
    this._timerId = setInterval(() => this._schedulerTick(), LOOKAHEAD_MS);
    // Run one immediate scheduling pass for snappy start
    this._schedulerTick();
  }

  _stopScheduler() {
    if (this._timerId !== null) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  _schedulerTick() {
    if (!this._playing || !this._ctx) return;
    const ctx = this._ctx;
    if (ctx.state === 'suspended') return;

    const score = SCORES[this._trackId] || SCORES.plaza;
    const stepDur = 60 / score.bpm / 4; // 16th-note duration in seconds

    // Background tab safety: if timer was throttled, snap forward instead of bursting queued notes
    if (this._nextNoteTime < ctx.currentTime - 0.25) {
      this._nextNoteTime = ctx.currentTime + 0.04;
    }

    while (this._nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      this._scheduleStep(score, this._currentStep, this._nextNoteTime, stepDur);
      this._currentStep = (this._currentStep + 1) % score.totalSteps;
      this._nextNoteTime += stepDur;
    }
  }

  _scheduleStep(score, stepIdx, time, stepDur) {
    const leadEv = score.lead[stepIdx];
    if (leadEv) {
      this._playTone(leadEv.freq, time, leadEv.durSteps * stepDur, score.voices.lead, leadEv.durSteps);
    }

    const arpEv = score.arp[stepIdx];
    if (arpEv) {
      this._playTone(arpEv.freq, time, arpEv.durSteps * stepDur, score.voices.arp, arpEv.durSteps);
    }

    const bassEv = score.bass[stepIdx];
    if (bassEv) {
      this._playTone(bassEv.freq, time, bassEv.durSteps * stepDur, score.voices.bass, bassEv.durSteps);
    }

    const drumTok = score.drums[stepIdx];
    if (drumTok) {
      this._playDrum(drumTok, time, score.voices.drums.gain);
    }
  }

  _playTone(freq, startTime, duration, voiceCfg, durSteps) {
    const ctx = this._ctx;
    if (!ctx || !this._masterFilter || freq <= 0) return;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    if (voiceCfg.wave === 'pulse25' && this._waves.pulse25) {
      osc.setPeriodicWave(this._waves.pulse25);
    } else if (voiceCfg.wave === 'pulse12' && this._waves.pulse12) {
      osc.setPeriodicWave(this._waves.pulse12);
    } else if (voiceCfg.wave === 'triangle' || voiceCfg.wave === 'sine' || voiceCfg.wave === 'sawtooth') {
      osc.type = voiceCfg.wave;
    } else {
      osc.type = 'square';
    }

    osc.frequency.setValueAtTime(freq, startTime);

    const attack = Math.min(voiceCfg.attack || 0.01, duration * 0.3);
    const release = voiceCfg.release || 0.035;
    const peak = voiceCfg.gain || 0.18;
    const holdEnd = Math.max(startTime + attack + 0.01, startTime + duration - 0.012);
    const stopTime = holdEnd + release;

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peak, startTime + attack);

    if (voiceCfg.plucky) {
      // Short bell/lute pluck decay for arpeggios
      const decayTarget = Math.max(0.0001, peak * 0.25);
      env.gain.exponentialRampToValueAtTime(decayTarget, holdEnd);
      env.gain.exponentialRampToValueAtTime(0.0001, stopTime);
    } else {
      const sustain = Math.max(0.0001, peak * 0.68);
      const decayTime = Math.min(holdEnd, startTime + attack + 0.08);
      env.gain.exponentialRampToValueAtTime(sustain, decayTime);
      env.gain.setValueAtTime(sustain, holdEnd);
      env.gain.exponentialRampToValueAtTime(0.0001, stopTime);
    }

    // Subtle warm vibrato on held lead notes (quarter note or longer)
    let lfo = null;
    if (voiceCfg.vibrato && durSteps >= 4) {
      lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(5.2, startTime);
      lfoGain.gain.setValueAtTime(0.0001, startTime);
      lfoGain.gain.setValueAtTime(0.0001, startTime + 0.11);
      lfoGain.gain.linearRampToValueAtTime(5.0, Math.min(holdEnd, startTime + 0.28));
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start(startTime);
      lfo.stop(stopTime + 0.02);
    }

    osc.connect(env);
    env.connect(this._masterFilter);

    osc.start(startTime);
    osc.stop(stopTime + 0.02);
  }

  _playDrum(token, time, drumLevel) {
    const ctx = this._ctx;
    if (!ctx || !this._masterFilter) return;

    if (token.includes('K')) {
      this._triggerKick(time, drumLevel * 0.95);
    }
    if (token.includes('S')) {
      this._triggerSnare(time, drumLevel * 0.55);
    }
    if (token.includes('H')) {
      this._triggerHat(time, drumLevel * 0.26, 0.032);
    }
    if (token.includes('O')) {
      this._triggerHat(time, drumLevel * 0.28, 0.11);
    }
    if (token.includes('T')) {
      this._triggerWoodblock(time, drumLevel * 0.42);
    }
    if (token.includes('C')) {
      this._triggerCrash(time, drumLevel * 0.24);
    }
  }

  _triggerKick(time, level) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(148, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.075);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.095);

    osc.connect(gain);
    gain.connect(this._masterFilter);
    osc.start(time);
    osc.stop(time + 0.11);
  }

  _triggerSnare(time, level) {
    const ctx = this._ctx;
    if (this._noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this._noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1850, time);
      filter.Q.setValueAtTime(0.85, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(level, time + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.085);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this._masterFilter);
      src.start(time);
      src.stop(time + 0.095);
    }

    // Subtle warm body tap
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(210, time);
    body.frequency.exponentialRampToValueAtTime(115, time + 0.045);

    bodyGain.gain.setValueAtTime(0.0001, time);
    bodyGain.gain.linearRampToValueAtTime(level * 0.55, time + 0.003);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

    body.connect(bodyGain);
    bodyGain.connect(this._masterFilter);
    body.start(time);
    body.stop(time + 0.065);
  }

  _triggerHat(time, level, duration) {
    const ctx = this._ctx;
    if (!this._noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, time);
    filter.Q.setValueAtTime(1.4, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterFilter);
    src.start(time);
    src.stop(time + duration + 0.015);
  }

  _triggerWoodblock(time, level) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, time);
    osc.frequency.exponentialRampToValueAtTime(420, time + 0.03);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(gain);
    gain.connect(this._masterFilter);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  _triggerCrash(time, level) {
    const ctx = this._ctx;
    if (!this._noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, time);
    filter.Q.setValueAtTime(0.7, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.34);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterFilter);
    src.start(time);
    src.stop(time + 0.36);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  play() {
    if (this._playing) {
      if (this._ctx && this._ctx.state === 'suspended') {
        this._ctx.resume().catch(() => {});
      }
      return this.getState();
    }

    const ctx = this._ensureAudioContext();
    this._playing = true;
    // Snap resume to the start of the current bar for musical phrasing
    this._currentStep = Math.floor(this._currentStep / 16) * 16;

    if (ctx) {
      this._fadeMasterTo(this._volume, 0.14);
      this._startScheduler(0.04);
    }

    this._notify();
    return this.getState();
  }

  pause() {
    if (!this._playing) return this.getState();

    this._playing = false;
    this._stopScheduler();
    if (this._ctx) {
      this._fadeMasterTo(0.0001, 0.08);
    }

    this._notify();
    return this.getState();
  }

  toggle() {
    return this._playing ? this.pause() : this.play();
  }

  setTrack(trackId) {
    if (!TRACK_MAP.has(trackId)) return this.getState();
    if (this._trackId === trackId) return this.getState();

    this._trackId = trackId;
    this._currentStep = 0;
    this._savePreferences();

    if (this._playing && this._ctx) {
      // Smooth quick dip & rise to avoid any abrupt click when switching tracks
      this._stopScheduler();
      this._fadeMasterTo(0.0001, 0.045);
      const ctx = this._ctx;
      const now = ctx.currentTime;
      const gainParam = this._masterGain.gain;
      try {
        gainParam.linearRampToValueAtTime(Math.max(0.0001, this._volume), now + 0.13);
      } catch {
        // Fallback already handled
      }
      this._startScheduler(0.055);
    }

    this._notify();
    return this.getState();
  }

  nextTrack() {
    const idx = BGM_TRACKS.findIndex((t) => t.id === this._trackId);
    const next = BGM_TRACKS[(idx + 1) % BGM_TRACKS.length];
    return this.setTrack(next.id);
  }

  prevTrack() {
    const idx = BGM_TRACKS.findIndex((t) => t.id === this._trackId);
    const prev = BGM_TRACKS[(idx - 1 + BGM_TRACKS.length) % BGM_TRACKS.length];
    return this.setTrack(prev.id);
  }

  setVolume(v) {
    const nextVol = clampVolume(v);
    this._volume = nextVol;
    this._savePreferences();

    if (this._playing && this._ctx && this._masterGain) {
      const now = this._ctx.currentTime;
      try {
        this._masterGain.gain.cancelScheduledValues(now);
        this._masterGain.gain.setTargetAtTime(Math.max(0.0001, nextVol), now, 0.025);
      } catch {
        this._masterGain.gain.value = Math.max(0.0001, nextVol);
      }
    }

    this._notify();
    return this.getState();
  }

  setAutoScene(bool) {
    const next = Boolean(bool);
    this._autoScene = next;
    this._savePreferences();

    if (next && this._lastSceneId) {
      const mapped = SCENE_TRACK_MAP[this._lastSceneId];
      if (mapped && mapped !== this._trackId) {
        return this.setTrack(mapped);
      }
    }

    this._notify();
    return this.getState();
  }

  syncScene(sceneId) {
    if (typeof sceneId !== 'string' || !sceneId) return this.getState();
    this._lastSceneId = sceneId;
    if (!this._autoScene) return this.getState();

    const mapped = SCENE_TRACK_MAP[sceneId];
    if (mapped && mapped !== this._trackId) {
      return this.setTrack(mapped);
    }
    return this.getState();
  }

  getState() {
    const track = TRACK_MAP.get(this._trackId) || BGM_TRACKS[0];
    return {
      playing: this._playing,
      trackId: this._trackId,
      track,
      volume: this._volume,
      autoScene: this._autoScene,
      tracks: BGM_TRACKS,
    };
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }
}

export const bgmPlayer = new RetroBgmPlayer();
