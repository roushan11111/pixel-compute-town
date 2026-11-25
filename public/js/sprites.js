/**
 * PixelCompute Town — 32x32 HD Pixel Art Sprite & Interior Prop Engine
 * Zero-dependency ES Module for razor-sharp HTML5 Canvas pixel art.
 *
 * Exports (100% backward-compatible + new HD 32x32 & Room Prop APIs):
 *   Legacy & Metadata:
 *     WORKER_ROLE_META, SKIN_PALETTES, WORKER_SPRITES, OBJECT_SPRITES,
 *     getWorkerPalette, drawPixelMatrix, drawWorkerSprite, drawObjectSprite
 *   New 32x32 HD Characters & Portraits:
 *     HD_ROLE_PALETTES, drawHDWorker, renderWorkerPortrait, getWorkerPortraitDataUrl
 *   New HD Interior Scene Props:
 *     drawMonitorDesk, drawServerRack, drawBountyBoard, drawHologramCore,
 *     drawCoffeeBar, drawSleepingCat, drawPottedPlant, drawTrophyCase,
 *     drawVaultDoor, drawGoldPile, ROOM_PROPS
 */

// ============================================================================
// 1. ROLE METADATA & PALETTES (Legacy + Enriched HD Metadata)
// ============================================================================

export const WORKER_ROLE_META = {
  flash_worker: {
    name: '閃電工坊機師',
    speciesName: '閃電機甲貓',
    codename: 'Cyber Volt-Bot',
    accent: '#22d3ee',
    badge: '⚡',
    track: 'api',
    desc: '青藍光盾耳機＋發光護目鏡＋閃電天線，專精極速 API 微任務流水線',
  },
  pro_architect: {
    name: '首席架構師',
    speciesName: '紫金貓頭鷹架構師',
    codename: 'Sage Architect',
    accent: '#a855f7',
    badge: '🔮',
    track: 'quota',
    desc: '深紫星辰披風＋發光金邊眼鏡＋懸浮代碼符文，坐鎮高難度系統架構',
  },
  pixel_artist: {
    name: '像素美術師',
    speciesName: '櫻粉像素狐狸畫師',
    codename: 'Pixel Fox Artist',
    accent: '#f472b6',
    badge: '🎨',
    track: 'api',
    desc: '俏皮大耳＋櫻粉貝雷帽＋發光像素畫筆，負責介面與像素視覺創作',
  },
  guild_artisan: {
    name: '工會匠人',
    speciesName: '琥珀工會熊匠人',
    codename: 'Forge Artisan',
    accent: '#f59e0b',
    badge: '⚔️',
    track: 'quota',
    desc: '金色頭帶＋工裝圍裙＋機械護腕，沉穩可靠的懸賞大單鍛造主力',
  },
};

/**
 * Legacy 12x14 palettes (preserved for 100% backward compatibility).
 */
const BASE_ROLE_PALETTES = {
  flash_worker: {
    O: '#111827',
    H: '#1e293b',
    h: '#475569',
    V: '#06b6d4',
    v: '#a5f3fc',
    S: '#fde68a',
    s: '#f59e0b',
    E: '#0f172a',
    B: '#0ea5e9',
    b: '#0369a1',
    A: '#22d3ee',
    C: '#334155',
    P: '#1e293b',
    G: '#67e8f9',
  },
  pro_architect: {
    O: '#130f26',
    H: '#3b0764',
    h: '#7e22ce',
    V: '#c084fc',
    v: '#f3e8ff',
    S: '#fed7aa',
    s: '#fb923c',
    E: '#1e1b4b',
    B: '#581c87',
    b: '#3b0764',
    A: '#fbbf24',
    C: '#9333ea',
    P: '#1e1b4b',
    G: '#e879f9',
  },
  pixel_artist: {
    O: '#241224',
    H: '#ec4899',
    h: '#f9a8d4',
    V: '#f472b6',
    v: '#fdf2f8',
    S: '#ffedd5',
    s: '#fda4af',
    E: '#1f2937',
    B: '#f43f5e',
    b: '#be123c',
    A: '#38bdf8',
    C: '#fef08a',
    P: '#312e81',
    G: '#f9a8d4',
  },
  guild_artisan: {
    O: '#1c140d',
    H: '#78350f',
    h: '#b45309',
    V: '#f59e0b',
    v: '#fef08a',
    S: '#fed7aa',
    s: '#f97316',
    E: '#1c1917',
    B: '#b91c1c',
    b: '#7f1d1d',
    A: '#fbbf24',
    C: '#d97706',
    P: '#292524',
    G: '#fde047',
  },
};

/**
 * Rich 16-channel HD 32x32 palettes per original character species.
 * Channels:
 *   O = bold dark outline
 *   M = primary fur / chassis / plumage
 *   L = bright top-left highlight
 *   S = mid shadow
 *   D = deep shadow
 *   B = soft cream/ivory face / muzzle / belly
 *   b = soft belly / muzzle shadow
 *   A = primary outfit / gear / beret / cape accent
 *   a = outfit shadow / secondary fabric
 *   V = luminous visor / gold trim / tech accent
 *   v = specular tech / gold gleam
 *   E = expressive eye iris / sclera
 *   P = deep pupil
 *   G = pure white eye specular gleam / star sparkle
 *   C = rosy cheek blush / secondary magic glow
 *   K = dark metal / boots / apron / belt
 */
export const HD_ROLE_PALETTES = {
  flash_worker: {
    O: '#091124',
    M: '#1ec8ff',
    L: '#99f6ff',
    S: '#0284c7',
    D: '#0c4a6e',
    B: '#eef9ff',
    b: '#bae6fd',
    A: '#1e293b',
    a: '#0f172a',
    V: '#fde047',
    v: '#fffbeb',
    E: '#ecfeff',
    P: '#0b1736',
    G: '#ffffff',
    C: '#fb7185',
    K: '#334155',
  },
  pro_architect: {
    O: '#130924',
    M: '#7c3aed',
    L: '#c4b5fd',
    S: '#5b21b6',
    D: '#2e1065',
    B: '#f5f0ff',
    b: '#ddd6fe',
    A: '#3b0764',
    a: '#1e1042',
    V: '#fbbf24',
    v: '#fef08a',
    E: '#fef3c7',
    P: '#1a0c30',
    G: '#ffffff',
    C: '#38bdf8',
    K: '#4c1d95',
  },
  pixel_artist: {
    O: '#240b1d',
    M: '#f472b6',
    L: '#fbcfe8',
    S: '#db2777',
    D: '#831843',
    B: '#fff1f5',
    b: '#fecdd3',
    A: '#e11d48',
    a: '#9f1239',
    V: '#fde047',
    v: '#fef9c3',
    E: '#fff5f8',
    P: '#2b0f26',
    G: '#ffffff',
    C: '#38bdf8',
    K: '#312e81',
  },
  guild_artisan: {
    O: '#1c1007',
    M: '#d97706',
    L: '#fcd34d',
    S: '#b45309',
    D: '#78350f',
    B: '#fef3c7',
    b: '#f5c27b',
    A: '#dc2626',
    a: '#991b1b',
    V: '#fbbf24',
    v: '#fef9c3',
    E: '#fffbeb',
    P: '#1c120c',
    G: '#ffffff',
    C: '#fb923c',
    K: '#44403c',
  },
};

export const SKIN_PALETTES = {
  'skin-cyber': {
    label: '賽博霓虹',
    overrides: {
      O: '#09090b',
      H: '#18181b',
      h: '#ec4899',
      V: '#00f5ff',
      v: '#ffffff',
      B: '#1e1b4b',
      b: '#0f172a',
      A: '#f43f5e',
      C: '#06b6d4',
      P: '#09090b',
      G: '#00f5ff',
    },
    hdOverrides: {
      O: '#070614',
      A: '#1e1b4b',
      a: '#0f172a',
      V: '#00f5ff',
      v: '#e0ffff',
      C: '#f43f5e',
      K: '#171738',
    },
    accessory: 'cyber_antenna',
  },
  'skin-gold': {
    label: '創世黃金',
    overrides: {
      O: '#271704',
      H: '#d97706',
      h: '#fef08a',
      V: '#fde047',
      v: '#ffffff',
      B: '#f59e0b',
      b: '#b45309',
      A: '#fffbeb',
      C: '#fbbf24',
      P: '#78350f',
      G: '#fef08a',
    },
    hdOverrides: {
      O: '#231403',
      M: '#f59e0b',
      L: '#fef08a',
      S: '#d97706',
      D: '#92400e',
      A: '#fbbf24',
      a: '#b45309',
      V: '#fffbeb',
      v: '#ffffff',
      K: '#78350f',
    },
    accessory: 'gold_halo',
  },
  'skin-cat': {
    label: '像素貓耳',
    overrides: {
      A: '#f472b6',
      G: '#fbcfe8',
    },
    hdOverrides: {
      A: '#f472b6',
      a: '#be185d',
      V: '#fde047',
      v: '#fffbeb',
      C: '#f9a8d4',
    },
    accessory: 'cat_ears',
  },
};

/**
 * Resolve merged legacy palette for a worker's roleClass + skinId.
 */
export function getWorkerPalette(roleClass = 'flash_worker', skinId = 'default') {
  const base = BASE_ROLE_PALETTES[roleClass] || BASE_ROLE_PALETTES.flash_worker;
  const skin = SKIN_PALETTES[skinId];
  if (!skin) return { ...base };
  return { ...base, ...skin.overrides };
}

/**
 * Resolve merged 16-channel HD palette for a worker's roleClass + skinId.
 */
function getHDWorkerPalette(roleClass = 'flash_worker', skinId = 'default') {
  const base = HD_ROLE_PALETTES[roleClass] || HD_ROLE_PALETTES.flash_worker;
  const skin = SKIN_PALETTES[skinId];
  if (!skin || !skin.hdOverrides) return { ...base };
  return { ...base, ...skin.hdOverrides };
}

// ============================================================================
// 2. 32x32 HD CHARACTER GRID COMPOSER & 4 ORIGINAL PIXEL SPECIES
// ============================================================================

function createGrid32() {
  return Array.from({ length: 32 }, () => Array(32).fill('.'));
}

function setPx(g, x, y, ch) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix >= 0 && ix < 32 && iy >= 0 && iy < 32) g[iy][ix] = ch;
}

function fillRect32(g, x, y, w, h, ch) {
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) setPx(g, x0 + dx, y0 + dy, ch);
  }
}

function fillEllipse32(g, cx, cy, rx, ry, ch) {
  const xMin = Math.floor(cx - rx - 1);
  const xMax = Math.ceil(cx + rx + 1);
  const yMin = Math.floor(cy - ry - 1);
  const yMax = Math.ceil(cy + ry + 1);
  for (let y = yMin; y <= yMax; y++) {
    for (let x = xMin; x <= xMax; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1.0) setPx(g, x, y, ch);
    }
  }
}

function applyBoldOutline32(g) {
  const out = g.map((r) => r.slice());
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (g[y][x] !== '.') continue;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          nx < 32 &&
          ny >= 0 &&
          ny < 32 &&
          g[ny][nx] !== '.' &&
          g[ny][nx] !== 'O'
        ) {
          out[y][x] = 'O';
          break;
        }
      }
    }
  }
  return out;
}

/**
 * Helper to draw expressive big dual-gleam pixel eyes (or blink / happy / sleep).
 */
function drawExpressiveEyes(g, lx, rx, ey, mode, isHappy) {
  if (mode === 'sleep' || mode === 'blink') {
    fillRect32(g, lx - 1, ey + 1, 4, 1, 'O');
    fillRect32(g, rx - 1, ey + 1, 4, 1, 'O');
    return;
  }
  if (isHappy) {
    // Joyful ^ ^ curved smile eyes!
    fillRect32(g, lx, ey, 2, 1, 'O');
    setPx(g, lx - 1, ey + 1, 'O');
    setPx(g, lx + 2, ey + 1, 'O');
    fillRect32(g, rx, ey, 2, 1, 'O');
    setPx(g, rx - 1, ey + 1, 'O');
    setPx(g, rx + 2, ey + 1, 'O');
    return;
  }
  // Big 4x4 expressive eyes with bright sclera, deep pupil & dual crisp white specular gleams!
  for (const ex of [lx, rx]) {
    fillRect32(g, ex - 1, ey - 1, 4, 4, 'E');
    fillRect32(g, ex, ey, 2, 3, 'P');
    // Upper-left large gleam + lower-right micro gleam
    setPx(g, ex - 1, ey - 1, 'G');
    setPx(g, ex, ey - 1, 'G');
    setPx(g, ex + 2, ey + 2, 'G');
  }
}

/**
 * 1) FLASH WORKER — 閃電機甲貓 / Cyber Volt-Bot (32x32)
 * Pointed cyber-cat ears, crackling lightning antenna, cyan shield headphones,
 * luminous visor goggles, glowing volt chest core, zigzag electric tail!
 */
function buildFlashWorker32(anim, frame) {
  const g = createGrid32();
  const f4 = ((frame % 4) + 4) % 4;
  const f2 = f4 % 2;
  const sleep = anim === 'sleep' || anim === 'rest';
  const celebrate = anim === 'celebrate';
  const work = anim === 'work';
  const walk = anim === 'walk';

  const bob =
    celebrate
      ? f2 === 0
        ? -3
        : -1
      : walk
        ? f2 === 0
          ? -1
          : 0
        : anim === 'idle' && f4 === 2
          ? 1
          : sleep
            ? 2
            : 0;
  const y0 = bob;

  // 1. Zigzag electric-bolt cat tail behind right flank!
  const tailShift = f2 === 0 ? 0 : -1;
  fillRect32(g, 21, 23 + y0, 4, 2, 'S');
  fillRect32(g, 24, 20 + y0 + tailShift, 3, 4, 'V');
  fillRect32(g, 26, 17 + y0 + tailShift, 3, 4, 'V');
  setPx(g, 27, 17 + y0 + tailShift, 'v');
  setPx(g, 28, 16 + y0 + tailShift, 'v');

  // 2. Cyber boots / legs (4-frame walk stride)
  const stepL = walk ? (f4 === 0 ? -2 : f4 === 2 ? 1 : 0) : celebrate ? -1 : 0;
  const stepR = walk ? (f4 === 2 ? -2 : f4 === 0 ? 1 : 0) : celebrate ? -1 : 0;
  // Left leg & boot
  fillRect32(g, 10, 24 + y0, 4, 4 + Math.min(0, stepL), 'K');
  fillRect32(g, 9, 27 + y0 + stepL, 5, 3, 'A');
  fillRect32(g, 10, 27 + y0 + stepL, 3, 1, 'L');
  // Right leg & boot
  fillRect32(g, 18, 24 + y0, 4, 4 + Math.min(0, stepR), 'K');
  fillRect32(g, 18, 27 + y0 + stepR, 5, 3, 'A');
  fillRect32(g, 19, 27 + y0 + stepR, 3, 1, 'L');

  // 3. Sleek cyber-mecha jacket torso + glowing lightning core
  fillEllipse32(g, 15.5, 21 + y0, 6.8, 5.2, 'M');
  fillRect32(g, 10, 18 + y0, 12, 7, 'A');
  fillRect32(g, 11, 18 + y0, 10, 6, 'S');
  // Jacket inner metallic chest plate
  fillRect32(g, 12, 18 + y0, 8, 6, 'B');
  fillRect32(g, 12, 23 + y0, 8, 1, 'b');
  // Glowing chest lightning bolt core!
  fillRect32(g, 15, 19 + y0, 3, 1, 'V');
  fillRect32(g, 14, 20 + y0, 3, 1, 'v');
  fillRect32(g, 15, 21 + y0, 3, 1, 'V');
  fillRect32(g, 15, 22 + y0, 2, 1, 'V');
  // Collar highlight
  fillRect32(g, 11, 17 + y0, 10, 1, 'L');

  // 4. Arms & Paws (rapid typing, waving, or cheering!)
  if (work) {
    const leftUp = f2 === 0 ? -2 : 1;
    const rightUp = f2 === 0 ? 1 : -2;
    fillRect32(g, 6, 19 + y0 + leftUp, 4, 3, 'M');
    fillRect32(g, 5, 21 + y0 + leftUp, 3, 2, 'B');
    fillRect32(g, 22, 19 + y0 + rightUp, 4, 3, 'M');
    fillRect32(g, 24, 21 + y0 + rightUp, 3, 2, 'B');
    // Keystroke electric sparks!
    setPx(g, 5, 24 + y0 + (f2 === 0 ? -1 : 0), 'v');
    setPx(g, 25, 24 + y0 + (f2 === 1 ? -1 : 0), 'L');
  } else if (celebrate) {
    fillRect32(g, 5, 13 + y0, 4, 5, 'M');
    fillRect32(g, 5, 11 + y0, 3, 3, 'B');
    fillRect32(g, 23, 13 + y0, 4, 5, 'M');
    fillRect32(g, 24, 11 + y0, 3, 3, 'B');
  } else {
    const armSwL = walk ? (f4 === 0 ? 1 : f4 === 2 ? -1 : 0) : 0;
    const armSwR = -armSwL;
    fillRect32(g, 7, 19 + y0 + armSwL, 3, 5, 'M');
    fillRect32(g, 7, 23 + y0 + armSwL, 3, 2, 'B');
    fillRect32(g, 22, 19 + y0 + armSwR, 3, 5, 'M');
    fillRect32(g, 22, 23 + y0 + armSwR, 3, 2, 'B');
  }

  // 5. Rounded expressive cyber-cat head!
  fillEllipse32(g, 15.5, 11.5 + y0, 7.6, 5.8, 'M');
  fillEllipse32(g, 15.5, 12.8 + y0, 6.4, 4.3, 'B');
  // Top crown rim highlight
  fillRect32(g, 11, 6 + y0, 10, 2, 'L');
  // Lower jaw shadow
  fillRect32(g, 12, 16 + y0, 8, 1, 'b');

  // 6. Iconic Pointed Cyber-Cat Ears with glowing cyan inner circuits!
  // Left ear
  fillRect32(g, 8, 4 + y0, 4, 4, 'M');
  fillRect32(g, 9, 3 + y0, 2, 2, 'L');
  fillRect32(g, 9, 5 + y0, 2, 2, 'V');
  // Right ear
  fillRect32(g, 20, 4 + y0, 4, 4, 'M');
  fillRect32(g, 21, 3 + y0, 2, 2, 'L');
  fillRect32(g, 21, 5 + y0, 2, 2, 'V');

  // 7. Crackling Lightning Antenna on top center!
  fillRect32(g, 15, 2 + y0, 2, 4, 'V');
  setPx(g, 16, 1 + y0, f2 === 0 ? 'v' : 'V');
  setPx(g, 14, 3 + y0, 'v');
  if (f2 === 0 || work || celebrate) {
    setPx(g, 13, 1 + y0, 'L');
    setPx(g, 18, 2 + y0, 'v');
  }

  // 8. Cyan Shield Headphones clamping both sides of head!
  fillRect32(g, 6, 9 + y0, 3, 6, 'A');
  fillRect32(g, 7, 10 + y0, 1, 4, 'L');
  setPx(g, 6, 11 + y0, 'V');
  fillRect32(g, 23, 9 + y0, 3, 6, 'A');
  fillRect32(g, 24, 10 + y0, 1, 4, 'L');
  setPx(g, 25, 11 + y0, 'V');

  // 9. Luminous Cyber Visor Forehead Band (pulses/scans!)
  fillRect32(g, 9, 7 + y0, 14, 2, 'A');
  fillRect32(g, 10, 7 + y0, 12, 2, 'S');
  const scanX = 10 + ((frame * 2) % 9);
  fillRect32(g, scanX, 7 + y0, 3, 2, 'L');
  setPx(g, scanX + 1, 7 + y0, 'G');

  // 10. Big Expressive Dual-Specular Eyes + Cute Cat Mouth & Blush!
  const isBlink = anim === 'idle' && f4 === 3;
  drawExpressiveEyes(g, 11, 19, 11 + y0, sleep ? 'sleep' : isBlink ? 'blink' : 'open', celebrate);
  // Rosy cyber-blush cheeks
  fillRect32(g, 9, 14 + y0, 2, 1, 'C');
  fillRect32(g, 21, 14 + y0, 2, 1, 'C');
  // Cute cat ":3" mouth
  setPx(g, 14, 15 + y0, 'O');
  setPx(g, 15, 14 + y0, 'O');
  setPx(g, 16, 14 + y0, 'O');
  setPx(g, 17, 15 + y0, 'O');

  return applyBoldOutline32(g);
}

/**
 * 2) PRO ARCHITECT — 紫金貓頭鷹架構師 / Sage Architect (32x32)
 * Majestic tufted owl ear-plumes, deep starry purple cape with gold trim,
 * large glowing gold-rimmed spectacles, wise golden eyes, golden beak, floating code rune!
 */
function buildProArchitect32(anim, frame) {
  const g = createGrid32();
  const f4 = ((frame % 4) + 4) % 4;
  const f2 = f4 % 2;
  const sleep = anim === 'sleep' || anim === 'rest';
  const celebrate = anim === 'celebrate';
  const work = anim === 'work';
  const walk = anim === 'walk';

  const bob =
    celebrate
      ? f2 === 0
        ? -3
        : -1
      : walk
        ? f2 === 0
          ? -1
          : 0
        : anim === 'idle' && f4 === 2
          ? 1
          : sleep
            ? 2
            : 0;
  const y0 = bob;

  // 1. Billowing Deep-Purple Starry Cape (wider when celebrating or walking!)
  const capeSpread = celebrate ? 2 : walk ? (f2 === 0 ? 1 : 0) : 0;
  fillRect32(g, 7 - capeSpread, 17 + y0, 18 + capeSpread * 2, 9, 'A');
  fillRect32(g, 8 - capeSpread, 18 + y0, 16 + capeSpread * 2, 8, 'D');
  // Gold bottom trim & starry dots on cape
  fillRect32(g, 7 - capeSpread, 25 + y0, 18 + capeSpread * 2, 1, 'V');
  setPx(g, 9, 21 + y0, 'v');
  setPx(g, 22, 22 + y0, 'C');

  // 2. Owl talons / scholarly boots
  const stepL = walk ? (f4 === 0 ? -1 : f4 === 2 ? 1 : 0) : 0;
  const stepR = walk ? (f4 === 2 ? -1 : f4 === 0 ? 1 : 0) : 0;
  fillRect32(g, 10, 26 + y0 + stepL, 4, 3, 'V');
  fillRect32(g, 11, 28 + y0 + stepL, 3, 1, 'S');
  fillRect32(g, 18, 26 + y0 + stepR, 4, 3, 'V');
  fillRect32(g, 18, 28 + y0 + stepR, 3, 1, 'S');

  // 3. Regal Owl Robe Body & Soft Feathered Chest + Gold Star Brooch!
  fillEllipse32(g, 15.5, 21 + y0, 6.8, 5.8, 'M');
  fillEllipse32(g, 15.5, 21.5 + y0, 4.4, 4.6, 'B');
  fillRect32(g, 13, 24 + y0, 6, 2, 'b');
  // Subtle feather texture marks on chest
  setPx(g, 13, 21 + y0, 'b');
  setPx(g, 18, 21 + y0, 'b');
  setPx(g, 15, 23 + y0, 'b');
  // Golden architectural compass / brooch clasp
  fillRect32(g, 14, 17 + y0, 4, 2, 'V');
  fillRect32(g, 15, 18 + y0, 2, 2, 'C');
  setPx(g, 15, 17 + y0, 'v');
  // Shoulder mantle with gold trim
  fillRect32(g, 9, 16 + y0, 14, 2, 'S');
  fillRect32(g, 10, 16 + y0, 12, 1, 'V');

  // 4. Fluffy Wing-Sleeves (casting/typing or celebrating!)
  if (work) {
    const leftUp = f2 === 0 ? -2 : 0;
    const rightUp = f2 === 0 ? 0 : -2;
    fillRect32(g, 6, 18 + y0 + leftUp, 4, 5, 'M');
    fillRect32(g, 5, 21 + y0 + leftUp, 3, 2, 'L');
    fillRect32(g, 22, 18 + y0 + rightUp, 4, 5, 'M');
    fillRect32(g, 24, 21 + y0 + rightUp, 3, 2, 'L');
  } else if (celebrate) {
    fillRect32(g, 4, 13 + y0, 5, 5, 'M');
    fillRect32(g, 4, 12 + y0, 3, 2, 'L');
    fillRect32(g, 23, 13 + y0, 5, 5, 'M');
    fillRect32(g, 25, 12 + y0, 3, 2, 'L');
  } else {
    fillRect32(g, 7, 18 + y0, 3, 6, 'M');
    fillRect32(g, 7, 18 + y0, 2, 2, 'L');
    fillRect32(g, 22, 18 + y0, 3, 6, 'M');
    fillRect32(g, 23, 18 + y0, 2, 2, 'L');
  }

  // 5. Majestic Round Owl Head & Facial Feather Disc!
  fillEllipse32(g, 15.5, 10.5 + y0, 7.6, 5.8, 'M');
  fillRect32(g, 11, 5 + y0, 10, 2, 'L'); // top plumage highlight
  // Iconic heart-shaped cream owl facial disc!
  fillEllipse32(g, 12, 11.2 + y0, 3.6, 3.4, 'B');
  fillEllipse32(g, 19, 11.2 + y0, 3.6, 3.4, 'B');
  fillRect32(g, 12, 13 + y0, 8, 2, 'B');

  // 6. Signature Tufted Owl Ear-Plumes with Starlight Gold Tips!
  fillRect32(g, 7, 3 + y0, 4, 4, 'M');
  fillRect32(g, 6, 2 + y0, 3, 2, 'L');
  setPx(g, 6, 2 + y0, 'V');
  fillRect32(g, 21, 3 + y0, 4, 4, 'M');
  fillRect32(g, 23, 2 + y0, 3, 2, 'L');
  setPx(g, 25, 2 + y0, 'V');
  // Subtle forehead star gem
  fillRect32(g, 15, 6 + y0, 2, 2, 'V');
  setPx(g, 15, 6 + y0, 'v');

  // 7. Big Wise Owl Eyes + Glowing Gold-Rimmed Round Spectacles!
  const isBlink = anim === 'idle' && f4 === 3;
  drawExpressiveEyes(g, 11, 19, 10 + y0, sleep ? 'sleep' : isBlink ? 'blink' : 'open', celebrate);

  // Gold spectacle rims framing both eyes + bridge!
  fillRect32(g, 9, 8 + y0, 6, 1, 'V');
  fillRect32(g, 9, 13 + y0, 6, 1, 'V');
  fillRect32(g, 9, 9 + y0, 1, 4, 'V');
  fillRect32(g, 14, 9 + y0, 1, 4, 'V');
  fillRect32(g, 15, 10 + y0, 2, 1, 'V'); // nose bridge
  fillRect32(g, 17, 8 + y0, 6, 1, 'V');
  fillRect32(g, 17, 13 + y0, 6, 1, 'V');
  fillRect32(g, 17, 9 + y0, 1, 4, 'V');
  fillRect32(g, 22, 9 + y0, 1, 4, 'V');
  // Lens glint highlight
  if (f2 === 0 && !sleep) {
    setPx(g, 10, 9 + y0, 'v');
    setPx(g, 18, 9 + y0, 'v');
  }

  // Cute golden owl beak right below spectacle bridge!
  fillRect32(g, 15, 12 + y0, 2, 2, 'V');
  setPx(g, 15, 14 + y0, 'S');
  setPx(g, 16, 14 + y0, 'S');

  // 8. Floating Holographic Code Rune orbiting on right/left!
  const runeY = 9 + y0 + (f2 === 0 ? -1 : 1);
  if (!sleep) {
    setPx(g, 28, runeY, 'C');
    setPx(g, 27, runeY + 1, 'G');
    setPx(g, 29, runeY + 1, 'C');
    setPx(g, 28, runeY + 2, 'v');
    if (work || celebrate) {
      setPx(g, 3, runeY + 1, 'C');
      setPx(g, 2, runeY + 2, 'v');
      setPx(g, 4, runeY + 2, 'C');
    }
  }

  return applyBoldOutline32(g);
}

/**
 * 3) PIXEL ARTIST — 櫻粉像素狐狸畫師 / Pixel Fox Artist (32x32)
 * Huge fluffy pointed sakura-pink fox ears, tilted painter's beret, sunny scarf,
 * huge fluffy cream-tipped fox tail, holding a glowing magic pixel paintbrush!
 */
function buildPixelArtist32(anim, frame) {
  const g = createGrid32();
  const f4 = ((frame % 4) + 4) % 4;
  const f2 = f4 % 2;
  const sleep = anim === 'sleep' || anim === 'rest';
  const celebrate = anim === 'celebrate';
  const work = anim === 'work';
  const walk = anim === 'walk';

  const bob =
    celebrate
      ? f2 === 0
        ? -3
        : -1
      : walk
        ? f2 === 0
          ? -1
          : 0
        : anim === 'idle' && f4 === 2
          ? 1
          : sleep
            ? 2
            : 0;
  const y0 = bob;

  // 1. HUGE FLUFFY CREAM-TIPPED SAKURA FOX TAIL swishing on right!
  const wag = f2 === 0 ? 0 : -1;
  fillEllipse32(g, 24.5, 22 + y0 + wag, 4.4, 3.6, 'M');
  fillEllipse32(g, 26.5, 19.5 + y0 + wag, 3.2, 2.8, 'L');
  fillEllipse32(g, 27.5, 18.5 + y0 + wag, 2.2, 2.0, 'B'); // iconic fluffy white/cream tail tip!
  setPx(g, 23, 24 + y0 + wag, 'S');

  // 2. Nimble fox boots / paws
  const stepL = walk ? (f4 === 0 ? -2 : f4 === 2 ? 1 : 0) : celebrate ? -1 : 0;
  const stepR = walk ? (f4 === 2 ? -2 : f4 === 0 ? 1 : 0) : celebrate ? -1 : 0;
  fillRect32(g, 10, 25 + y0, 4, 3 + Math.min(0, stepL), 'S');
  fillRect32(g, 9, 27 + y0 + stepL, 5, 3, 'K');
  fillRect32(g, 10, 27 + y0 + stepL, 3, 1, 'B');
  fillRect32(g, 18, 25 + y0, 4, 3 + Math.min(0, stepR), 'S');
  fillRect32(g, 18, 27 + y0 + stepR, 5, 3, 'K');
  fillRect32(g, 19, 27 + y0 + stepR, 3, 1, 'B');

  // 3. Cute Artist Smock Dress + Sunny Scarf!
  fillEllipse32(g, 15.5, 21.5 + y0, 6.2, 5.0, 'A');
  fillRect32(g, 11, 18 + y0, 10, 7, 'A');
  fillRect32(g, 12, 19 + y0, 8, 5, 'B'); // cream artist smock bib
  // Paint dabs on smock pocket!
  setPx(g, 13, 22 + y0, 'C');
  setPx(g, 15, 22 + y0, 'V');
  setPx(g, 17, 22 + y0, 'M');
  // Cozy sunny-gold artist scarf wrapping neck + fluttering tail!
  fillRect32(g, 10, 16 + y0, 12, 3, 'V');
  fillRect32(g, 11, 16 + y0, 10, 1, 'v');
  fillRect32(g, 10, 19 + y0, 3, 4 + (f2 === 0 ? 0 : -1), 'V');
  setPx(g, 11, 22 + y0, 'C');

  // 4. Fox Arms + GLOWING MAGIC PIXEL PAINTBRUSH held in hand!
  if (work) {
    const brushBob = f2 === 0 ? -2 : 1;
    // Left typing/palette paw
    fillRect32(g, 6, 19 + y0 - brushBob, 4, 3, 'M');
    fillRect32(g, 5, 20 + y0 - brushBob, 2, 2, 'B');
    // Right paw waving glowing paintbrush!
    fillRect32(g, 21, 18 + y0 + brushBob, 4, 3, 'M');
    // Paintbrush handle + glowing cyan/gold tip
    fillRect32(g, 25, 14 + y0 + brushBob, 2, 7, 'K');
    fillRect32(g, 25, 11 + y0 + brushBob, 3, 3, 'C');
    setPx(g, 26, 11 + y0 + brushBob, 'G');
    // Floating pixel paint drop!
    setPx(g, 28, 10 + y0 + (f2 === 0 ? 0 : 2), 'V');
  } else if (celebrate) {
    fillRect32(g, 5, 13 + y0, 4, 5, 'M');
    fillRect32(g, 5, 12 + y0, 3, 2, 'B');
    fillRect32(g, 23, 13 + y0, 4, 5, 'M');
    // Raised paintbrush triumphantly!
    fillRect32(g, 25, 8 + y0, 2, 6, 'K');
    fillRect32(g, 25, 5 + y0, 3, 3, 'C');
    setPx(g, 26, 5 + y0, 'G');
  } else {
    const sw = walk ? (f4 === 0 ? 1 : f4 === 2 ? -1 : 0) : 0;
    fillRect32(g, 7, 19 + y0 + sw, 3, 5, 'M');
    fillRect32(g, 7, 23 + y0 + sw, 3, 2, 'B');
    fillRect32(g, 22, 19 + y0 - sw, 3, 4, 'M');
    // Held pixel paintbrush resting neatly at right side
    fillRect32(g, 24, 15 + y0 - sw, 2, 7, 'K');
    fillRect32(g, 24, 12 + y0 - sw, 3, 3, f2 === 0 ? 'C' : 'V');
    setPx(g, 25, 12 + y0 - sw, 'G');
  }

  // 5. Adorable Fluffy Fox Head with Cheek Tufts!
  fillEllipse32(g, 15.5, 11.2 + y0, 7.6, 5.4, 'M');
  // Fluffy side cheek tufts!
  fillRect32(g, 7, 12 + y0, 3, 3, 'B');
  fillRect32(g, 22, 12 + y0, 3, 3, 'B');
  // Soft cream lower fox face & muzzle
  fillEllipse32(g, 15.5, 13.6 + y0, 6.2, 3.2, 'B');
  fillRect32(g, 11, 7 + y0, 10, 1, 'L');

  // 6. HUGE FLUFFY POINTED FOX EARS (outer sakura-pink, inner cream!)
  // Left big fox ear
  fillRect32(g, 7, 3 + y0, 5, 5, 'M');
  fillRect32(g, 6, 2 + y0, 3, 3, 'L');
  fillRect32(g, 8, 4 + y0, 2, 3, 'B');
  // Right big fox ear (slightly peeking from under tilted beret)
  fillRect32(g, 20, 3 + y0, 5, 5, 'M');
  fillRect32(g, 22, 2 + y0, 3, 3, 'L');
  fillRect32(g, 21, 4 + y0, 2, 3, 'B');

  // 7. Jaunty Tilted Sakura-Berry Painter's Beret perched between ears!
  fillEllipse32(g, 15.5, 5.5 + y0, 6.2, 2.6, 'A');
  fillRect32(g, 12, 3 + y0, 7, 2, 'L');
  fillRect32(g, 15, 1 + y0, 2, 2, 'a'); // cute beret stem!
  fillRect32(g, 10, 7 + y0, 12, 1, 'a'); // beret rim

  // 8. Huge Sparkling Expressive Fox Eyes + Cute Fox Nose & Blush!
  const isBlink = anim === 'idle' && f4 === 3;
  drawExpressiveEyes(g, 11, 19, 11 + y0, sleep ? 'sleep' : isBlink ? 'blink' : 'open', celebrate);
  // Rosy cheek blushes
  fillRect32(g, 8, 14 + y0, 2, 1, 'M');
  fillRect32(g, 22, 14 + y0, 2, 1, 'M');
  // Cute dark fox button nose & happy smile
  fillRect32(g, 15, 13 + y0, 2, 1, 'O');
  setPx(g, 14, 15 + y0, 'O');
  setPx(g, 15, 15 + y0, 'O');
  setPx(g, 16, 15 + y0, 'O');
  setPx(g, 17, 15 + y0, 'O');

  return applyBoldOutline32(g);
}

/**
 * 4) GUILD ARTISAN — 琥珀工會熊匠人 / Forge Artisan (32x32)
 * Broad warm round bear ears, forged golden headband with fluttering ties,
 * craftsman apron & crimson forge tunic, chunky glowing mechanical bracers!
 */
function buildGuildArtisan32(anim, frame) {
  const g = createGrid32();
  const f4 = ((frame % 4) + 4) % 4;
  const f2 = f4 % 2;
  const sleep = anim === 'sleep' || anim === 'rest';
  const celebrate = anim === 'celebrate';
  const work = anim === 'work';
  const walk = anim === 'walk';

  const bob =
    celebrate
      ? f2 === 0
        ? -3
        : -1
      : walk
        ? f2 === 0
          ? -1
          : 0
        : anim === 'idle' && f4 === 2
          ? 1
          : sleep
            ? 2
            : 0;
  const y0 = bob;

  // 1. Sturdy Armored Work Boots & Legs
  const stepL = walk ? (f4 === 0 ? -1 : f4 === 2 ? 1 : 0) : 0;
  const stepR = walk ? (f4 === 2 ? -1 : f4 === 0 ? 1 : 0) : 0;
  fillRect32(g, 9, 24 + y0, 5, 4 + Math.min(0, stepL), 'D');
  fillRect32(g, 8, 27 + y0 + stepL, 6, 3, 'K');
  fillRect32(g, 9, 27 + y0 + stepL, 4, 1, 'V'); // steel-toe brass trim
  fillRect32(g, 18, 24 + y0, 5, 4 + Math.min(0, stepR), 'D');
  fillRect32(g, 18, 27 + y0 + stepR, 6, 3, 'K');
  fillRect32(g, 19, 27 + y0 + stepR, 4, 1, 'V');

  // 2. Broad Stalwart Bear Torso — Crimson Forge Tunic + Heavy Leather Craftsman Apron!
  fillEllipse32(g, 15.5, 21 + y0, 8.0, 5.8, 'A');
  fillRect32(g, 9, 17 + y0, 14, 8, 'A');
  // Heavy craftsman apron front panel & shoulder straps
  fillRect32(g, 11, 17 + y0, 2, 4, 'K');
  fillRect32(g, 19, 17 + y0, 2, 4, 'K');
  fillRect32(g, 11, 19 + y0, 10, 7, 'K');
  fillRect32(g, 12, 20 + y0, 8, 5, 'D');
  // Forged Golden Guild Belt & Anvil Buckle!
  fillRect32(g, 10, 22 + y0, 12, 2, 'V');
  fillRect32(g, 14, 21 + y0, 4, 3, 'V');
  fillRect32(g, 15, 22 + y0, 2, 1, 'v');

  // 3. Powerful Bear Arms + CHUNKY MECHANICAL FORGE BRACERS!
  if (work) {
    const leftUp = f2 === 0 ? -2 : 1;
    const rightUp = f2 === 0 ? 1 : -2;
    // Left arm + glowing forge bracer
    fillRect32(g, 5, 18 + y0 + leftUp, 5, 4, 'M');
    fillRect32(g, 4, 21 + y0 + leftUp, 5, 3, 'K');
    fillRect32(g, 5, 22 + y0 + leftUp, 3, 1, 'C'); // glowing orange forge vent!
    // Right arm + glowing forge bracer
    fillRect32(g, 22, 18 + y0 + rightUp, 5, 4, 'M');
    fillRect32(g, 23, 21 + y0 + rightUp, 5, 3, 'K');
    fillRect32(g, 24, 22 + y0 + rightUp, 3, 1, 'C');
    // Forge spark!
    setPx(g, 4, 25 + y0 + (f2 === 0 ? -1 : 0), 'v');
    setPx(g, 27, 25 + y0 + (f2 === 1 ? -1 : 0), 'V');
  } else if (celebrate) {
    fillRect32(g, 4, 12 + y0, 5, 6, 'M');
    fillRect32(g, 4, 11 + y0, 5, 3, 'K');
    fillRect32(g, 5, 12 + y0, 3, 1, 'C');
    fillRect32(g, 23, 12 + y0, 5, 6, 'M');
    fillRect32(g, 23, 11 + y0, 5, 3, 'K');
    fillRect32(g, 24, 12 + y0, 3, 1, 'C');
  } else {
    const sw = walk ? (f4 === 0 ? 1 : f4 === 2 ? -1 : 0) : 0;
    fillRect32(g, 6, 18 + y0 + sw, 4, 6, 'M');
    fillRect32(g, 5, 22 + y0 + sw, 5, 3, 'K');
    fillRect32(g, 6, 23 + y0 + sw, 3, 1, 'C');
    fillRect32(g, 22, 18 + y0 - sw, 4, 6, 'M');
    fillRect32(g, 22, 22 + y0 - sw, 5, 3, 'K');
    fillRect32(g, 23, 23 + y0 - sw, 3, 1, 'C');
  }

  // 4. Broad Warm Round Bear Head!
  fillEllipse32(g, 15.5, 11.2 + y0, 7.8, 5.6, 'M');
  fillRect32(g, 11, 6 + y0, 10, 2, 'L');
  // Broad warm biscuit bear snout/muzzle!
  fillEllipse32(g, 15.5, 14 + y0, 4.8, 2.8, 'B');
  fillRect32(g, 13, 16 + y0, 6, 1, 'b');

  // 5. Iconic Round Cozy Bear Ears!
  fillEllipse32(g, 8.5, 5.5 + y0, 2.8, 2.6, 'M');
  fillRect32(g, 8, 5 + y0, 2, 2, 'B');
  fillEllipse32(g, 22.5, 5.5 + y0, 2.8, 2.6, 'M');
  fillRect32(g, 22, 5 + y0, 2, 2, 'B');

  // 6. Forged Golden Artisan Headband + Center Emblem + Fluttering Tie-Tails!
  fillRect32(g, 8, 7 + y0, 16, 2, 'V');
  fillRect32(g, 10, 7 + y0, 12, 1, 'v');
  fillRect32(g, 14, 6 + y0, 4, 3, 'K'); // steel plate
  fillRect32(g, 15, 7 + y0, 2, 1, 'C'); // glowing forge gem
  // Fluttering headband ribbon tails on right side!
  const tailY = f2 === 0 ? 0 : 1;
  fillRect32(g, 24, 8 + y0, 3, 2, 'V');
  fillRect32(g, 26, 9 + y0 + tailY, 3, 2, 'A');
  setPx(g, 28, 10 + y0 + tailY, 'v');

  // 7. Expressive Warm Bear Eyes + Broad Bear Nose & Determined Smile!
  const isBlink = anim === 'idle' && f4 === 3;
  drawExpressiveEyes(g, 11, 19, 11 + y0, sleep ? 'sleep' : isBlink ? 'blink' : 'open', celebrate);
  // Warm rosy blush
  fillRect32(g, 8, 14 + y0, 2, 1, 'C');
  fillRect32(g, 22, 14 + y0, 2, 1, 'C');
  // Bear dark button nose & warm smile
  fillRect32(g, 14, 13 + y0, 4, 2, 'O');
  setPx(g, 15, 13 + y0, 'L'); // subtle nose highlight
  fillRect32(g, 14, 15 + y0, 4, 1, 'O');

  return applyBoldOutline32(g);
}

// Memoized 32x32 grid cache for buttery 60 FPS performance!
const hdGridCache = new Map();

function getHDWorkerGrid32(roleClass, animState, frame) {
  const role = HD_ROLE_PALETTES[roleClass] ? roleClass : 'flash_worker';
  const anim =
    animState === 'walk' ||
    animState === 'work' ||
    animState === 'celebrate' ||
    animState === 'sleep' ||
    animState === 'rest'
      ? animState
      : 'idle';
  const f4 = ((Math.floor(frame) % 4) + 4) % 4;
  const key = `${role}|${anim}|${f4}`;
  if (hdGridCache.has(key)) return hdGridCache.get(key);

  let grid;
  switch (role) {
    case 'pro_architect':
      grid = buildProArchitect32(anim, f4);
      break;
    case 'pixel_artist':
      grid = buildPixelArtist32(anim, f4);
      break;
    case 'guild_artisan':
      grid = buildGuildArtisan32(anim, f4);
      break;
    case 'flash_worker':
    default:
      grid = buildFlashWorker32(anim, f4);
      break;
  }
  hdGridCache.set(key, grid);
  return grid;
}

// ============================================================================
// 3. WEARABLE LIMITED SKINS & CELEBRATION EFFECTS FOR 32x32 HD WORKERS
// ============================================================================

function drawHDSkinOverlay(ctx, skinId, animState, frame, ox, oy, p, crownOverride = null) {
  const f4 = ((Math.floor(frame) % 4) + 4) % 4;
  const f2 = f4 % 2;
  const bob =
    animState === 'celebrate'
      ? f2 === 0
        ? -3
        : -1
      : animState === 'walk'
        ? f2 === 0
          ? -1
          : 0
        : animState === 'idle' && f4 === 2
          ? 1
          : animState === 'sleep' || animState === 'rest'
            ? 2
            : 0;

  const px = (x, y, color, w = 1, h = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(ox + x * p), Math.round(oy + (y + bob) * p), Math.round(w * p), Math.round(h * p));
  };

  if (skinId === 'skin-cyber') {
    // Pulsing Neon Cyan/Magenta Holographic Halo hovering above head!
    const hy = f2 === 0 ? -2 : -1;
    px(9, hy, '#070614', 14, 3);
    px(10, hy, '#00f5ff', 12, 2);
    px(12, hy, '#ffffff', 4, 1);
    px(17, hy + 1, '#f43f5e', 4, 1);
    // Side holographic data fins
    px(4, 7 + f2, '#00f5ff', 2, 5);
    px(4, 8 + f2, '#ffffff', 1, 2);
    px(26, 7 + (1 - f2), '#f43f5e', 2, 5);
    px(27, 8 + (1 - f2), '#fbcfe8', 1, 2);
    // Orbiting neon glitch motes
    px(2 + (f4 % 2), 3 + f2, '#00f5ff', 1, 1);
    px(29 - (f4 % 2), 4 + (1 - f2), '#f43f5e', 1, 1);
  } else if (skinId === 'skin-gold' || crownOverride) {
    // Radiant 3-Pronged Royal Crown (Gold / Silver / Bronze support for Vault Podium!)
    const isSilver = crownOverride === 'silver';
    const isBronze = crownOverride === 'bronze';
    const cDark = isSilver ? '#334155' : isBronze ? '#451a03' : '#451a03';
    const cMain = isSilver ? '#cbd5e1' : isBronze ? '#d97706' : '#f59e0b';
    const cHi = isSilver ? '#f8fafc' : isBronze ? '#fbbf24' : '#fef08a';
    const gemCenter = isSilver ? '#38bdf8' : isBronze ? '#f472b6' : '#22d3ee';
    const gemSide = isSilver ? '#a855f7' : isBronze ? '#fde047' : '#f43f5e';

    const cy = 0;
    // Bold dark outline behind crown
    px(10, cy - 1, cDark, 12, 5);
    px(10, cy - 3, cDark, 3, 2);
    px(14, cy - 4, cDark, 4, 3);
    px(19, cy - 3, cDark, 3, 2);
    // Crown base & prongs
    px(11, cy, cMain, 10, 3);
    px(11, cy - 2, cHi, 2, 2);
    px(15, cy - 3, cHi, 2, 3);
    px(19, cy - 2, cHi, 2, 2);
    px(11, cy, cHi, 10, 1);
    // Royal jewels
    px(15, cy + 1, gemCenter, 2, 2);
    px(12, cy + 1, gemSide, 1, 1);
    px(19, cy + 1, gemSide, 1, 1);
    // Shimmering liquid-gold star sparkles!
    if (f2 === 0) {
      px(7, cy - 1, '#ffffff', 1, 1);
      px(24, cy + 1, cHi, 1, 1);
    } else {
      px(8, cy + 1, cHi, 1, 1);
      px(24, cy - 2, '#ffffff', 1, 1);
    }
  } else if (skinId === 'skin-cat') {
    // Dynamic Animated Pixel Cat-Ear Headband (Sakura Pink + Rose Gold!)
    const twitchL = f4 === 1 ? -1 : 0;
    const twitchR = f4 === 3 ? -1 : 0;
    // Rose-gold headband arch
    px(9, 4, '#240b1d', 14, 2);
    px(10, 4, '#fde047', 12, 1);
    // Left dynamic pixel cat ear
    px(7, 0 + twitchL, '#240b1d', 5, 5);
    px(8, 1 + twitchL, '#f472b6', 3, 3);
    px(8, 1 + twitchL, '#fbcfe8', 2, 1);
    px(9, 2 + twitchL, '#fff1f5', 1, 2);
    // Right dynamic pixel cat ear
    px(20, 0 + twitchR, '#240b1d', 5, 5);
    px(21, 1 + twitchR, '#f472b6', 3, 3);
    px(22, 1 + twitchR, '#fbcfe8', 2, 1);
    px(22, 2 + twitchR, '#fff1f5', 1, 2);
    // Cute pastel floating heart/sparkle
    if (f2 === 0) {
      px(26, 2, '#f472b6', 2, 1);
      px(27, 1, '#fbcfe8', 1, 1);
    }
  }
}

function drawCelebrateConfetti32(ctx, frame, ox, oy, p) {
  const f = ((Math.floor(frame) % 4) + 4) % 4;
  const colors = ['#fde047', '#22d3ee', '#f472b6', '#4ade80', '#a855f7'];
  const spots = [
    [2, 1 + (f % 2)],
    [28, 0 + ((f + 1) % 2)],
    [5, 6 - (f % 2)],
    [26, 7 - ((f + 1) % 2)],
    [15, -3 + (f % 2)],
  ];
  for (let i = 0; i < spots.length; i++) {
    ctx.fillStyle = colors[(i + f) % colors.length];
    ctx.fillRect(
      Math.round(ox + spots[i][0] * p),
      Math.round(oy + spots[i][1] * p),
      Math.round(2 * p),
      Math.round(2 * p)
    );
  }
}

/**
 * Draw a 32x32 HD Pixel Worker anchored horizontally centered at `x` and feet at `y`.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Horizontal center anchor
 * @param {number} y - Bottom feet anchor
 * @param {object|string} worker - Worker object `{ roleClass, skinId, flipX, ... }` or roleClass string
 * @param {'idle'|'walk'|'work'|'celebrate'|'sleep'|'rest'} animState
 * @param {number} frame - Animation frame counter
 * @param {number} scale - Logical pixel size multiplier (default 1 => 32x32 logical px)
 * @param {object} [opts] - Optional overrides `{ flipX, shadow, skinId, crown, glowColor }`
 */
export function drawHDWorker(
  ctx,
  x,
  y,
  worker = 'flash_worker',
  animState = 'idle',
  frame = 0,
  scale = 1,
  opts = {}
) {
  const isObj = worker && typeof worker === 'object';
  const roleClass = isObj
    ? worker.roleClass || worker.role || 'flash_worker'
    : String(worker || 'flash_worker');
  const skinId = opts.skinId ?? (isObj ? worker.skinId || worker.skin || 'default' : 'default');
  const flipX = Boolean(opts.flipX ?? (isObj ? worker.flipX : false));
  const showShadow = opts.shadow !== false;
  const crownOverride = opts.crown || null;

  const p = Math.max(0.5, Number(scale) || 1);
  const w = 32 * p;
  const h = 32 * p;
  const ox = Math.round(x - w / 2);
  const oy = Math.round(y - h + 2 * p);

  const grid = getHDWorkerGrid32(roleClass, animState, frame);
  const pal = getHDWorkerPalette(roleClass, skinId);

  // Ground contact drop shadow
  if (showShadow) {
    const isJumping = animState === 'celebrate' && Math.floor(frame) % 2 === 0;
    const sw = (isJumping ? 16 : 22) * p;
    ctx.fillStyle = 'rgba(4, 8, 18, 0.42)';
    ctx.fillRect(Math.round(x - sw / 2), Math.round(y - 1 * p), Math.round(sw), Math.round(3 * p));
  }

  // Optional subtle floor skin aura for Cyber / Gold skins
  if (skinId === 'skin-cyber' || skinId === 'skin-gold' || opts.glowColor) {
    ctx.fillStyle =
      opts.glowColor ||
      (skinId === 'skin-gold' ? 'rgba(253, 224, 71, 0.22)' : 'rgba(0, 245, 255, 0.20)');
    ctx.fillRect(Math.round(x - 13 * p), Math.round(y - 2 * p), Math.round(26 * p), Math.round(4 * p));
  }

  ctx.save();
  if (flipX) {
    ctx.translate(Math.round(x * 2), 0);
    ctx.scale(-1, 1);
  }

  for (let row = 0; row < 32; row++) {
    const line = grid[row];
    for (let col = 0; col < 32; col++) {
      const ch = line[col];
      if (ch === '.') continue;
      const color = pal[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(ox + col * p),
        Math.round(oy + row * p),
        Math.ceil(p),
        Math.ceil(p)
      );
    }
  }

  // Wearable limited skin accessories (or Vault Champion crown!)
  if ((skinId && skinId !== 'default') || crownOverride) {
    drawHDSkinOverlay(ctx, skinId, animState, frame, ox, oy, p, crownOverride);
  }

  // Celebration pixel confetti burst!
  if (animState === 'celebrate') {
    drawCelebrateConfetti32(ctx, frame, ox, oy, p);
  }

  ctx.restore();
}

// ============================================================================
// 4. HD WORKER PORTRAIT RENDERER (For Right Panel Cards, Shop, Leaderboard)
// ============================================================================

/**
 * Render a razor-sharp 32x32 HD pixel portrait directly onto an HTMLCanvasElement.
 * Automatically adapts to any canvas resolution (44x44, 48x48, 64x64, 96x96...)
 * with crisp nearest-neighbor scaling and themed cyber-pixel backdrop!
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} roleClass - 'flash_worker' | 'pro_architect' | 'pixel_artist' | 'guild_artisan'
 * @param {string} [skinId='default'] - 'default' | 'skin-cyber' | 'skin-gold' | 'skin-cat'
 * @param {object} [opts] - `{ animState, frame, bg, crown }`
 */
export function renderWorkerPortrait(
  canvas,
  roleClass = 'flash_worker',
  skinId = 'default',
  opts = {}
) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width || 48;
  const h = canvas.height || 48;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  const meta = WORKER_ROLE_META[roleClass] || WORKER_ROLE_META.flash_worker;
  const accent =
    skinId === 'skin-gold'
      ? '#facc15'
      : skinId === 'skin-cyber'
        ? '#00f5ff'
        : skinId === 'skin-cat'
          ? '#f472b6'
          : meta.accent;

  // Styled cyber-pixel backdrop (disable with opts.bg === false)
  if (opts.bg !== false) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (skinId === 'skin-gold') {
      grad.addColorStop(0, '#3b2406');
      grad.addColorStop(1, '#1a1004');
    } else if (skinId === 'skin-cyber') {
      grad.addColorStop(0, '#161136');
      grad.addColorStop(1, '#081b26');
    } else if (skinId === 'skin-cat') {
      grad.addColorStop(0, '#36132b');
      grad.addColorStop(1, '#1b0d1e');
    } else {
      grad.addColorStop(0, '#172036');
      grad.addColorStop(1, '#0c1220');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle pixel floor platform glow
    ctx.fillStyle = `${accent}30`;
    ctx.fillRect(Math.round(w * 0.14), Math.round(h * 0.78), Math.round(w * 0.72), Math.round(h * 0.14));

    // Crisp pixel corner rivets
    ctx.fillStyle = `${accent}aa`;
    const dot = Math.max(2, Math.round(w / 22));
    ctx.fillRect(2, 2, dot, dot);
    ctx.fillRect(w - 2 - dot, 2, dot, dot);
    ctx.fillRect(2, h - 2 - dot, dot, dot);
    ctx.fillRect(w - 2 - dot, h - 2 - dot, dot, dot);
  }

  const animState = opts.animState || 'idle';
  const frame = opts.frame || 0;

  // Render at exact 36x36 internal pixel-art canvas (with headroom for crowns/halos!)
  // then nearest-neighbor blit cleanly into target canvas for 100% razor-sharp pixels at ANY size!
  const spriteBox = 36;
  const intScale = Math.floor(Math.min(w, h) / spriteBox);

  if (intScale >= 2 || typeof document === 'undefined') {
    const scale = Math.max(1, Math.min(w, h) / spriteBox);
    drawHDWorker(
      ctx,
      w / 2,
      h - Math.max(2, Math.round(h * 0.08)),
      { roleClass, skinId },
      animState,
      frame,
      intScale >= 2 ? intScale : scale,
      { shadow: true, crown: opts.crown || null }
    );
  } else {
    const tmp = document.createElement('canvas');
    tmp.width = spriteBox;
    tmp.height = spriteBox;
    const tctx = tmp.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    drawHDWorker(
      tctx,
      spriteBox / 2,
      spriteBox - 2,
      { roleClass, skinId },
      animState,
      frame,
      1,
      { shadow: true, crown: opts.crown || null }
    );
    const pad = Math.max(1, Math.round(Math.min(w, h) * 0.03));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, pad, pad, w - pad * 2, h - pad * 2);
  }
}

const portraitUrlCache = new Map();

/**
 * Memoized data URL helper for rendering crisp HD portraits into <img> tags if needed.
 */
export function getWorkerPortraitDataUrl(roleClass = 'flash_worker', skinId = 'default', size = 64) {
  if (typeof document === 'undefined') return '';
  const key = `${roleClass}|${skinId}|${size}`;
  if (portraitUrlCache.has(key)) return portraitUrlCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  renderWorkerPortrait(canvas, roleClass, skinId);
  const url = canvas.toDataURL();
  portraitUrlCache.set(key, url);
  return url;
}

// ============================================================================
// 5. HIGH-DETAIL INTERIOR SCENE PROPS (For 480x300 HD Multi-Scene Engine)
// ============================================================================

/**
 * 1) High-Detail Monitor Workstation Desk (with spacious widescreen monitor rect
 *    reserved for crisp HiDPI live terminal text overlay!).
 *
 * Anchor: `(x, y)` is workstation center (desk surface center).
 * Returns `{ screenRect, deskRect, seatPos }` in logical pixel coordinates.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {'factory'|'guild'|'wood'|'cyber'|'launchpad'} [style='factory']
 * @param {boolean} [active=false]
 * @param {number} [frame=0]
 * @param {object} [opts] - `{ selected, hovered, accentColor }`
 */
export function drawMonitorDesk(
  ctx,
  x,
  y,
  style = 'factory',
  active = false,
  frame = 0,
  opts = {}
) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const isWood = style === 'guild' || style === 'wood';
  const isHolo = style === 'launchpad' || style === 'holo';
  const accent =
    opts.accentColor || (isWood ? '#f59e0b' : isHolo ? '#a855f7' : '#22d3ee');
  const f = Math.floor(frame);

  // 1. Ergonomic chair back/seat positioned cleanly in front of desk
  const chairY = cy + 8;
  ctx.fillStyle = '#090d16';
  ctx.fillRect(cx - 10, chairY, 20, 10);
  ctx.fillStyle = isWood ? '#5c341d' : '#1e293b';
  ctx.fillRect(cx - 9, chairY + 1, 18, 8);
  ctx.fillStyle = isWood ? '#8c5330' : '#334155';
  ctx.fillRect(cx - 7, chairY + 2, 14, 5);
  ctx.fillStyle = active ? accent : '#475569';
  ctx.fillRect(cx - 5, chairY + 1, 10, 1);

  // 2. Desk floor drop shadow
  const dx = cx - 35;
  const dy = cy - 9;
  const dw = 70;
  ctx.fillStyle = 'rgba(4, 8, 18, 0.38)';
  ctx.fillRect(dx + 2, dy + 17, dw - 2, 5);

  // 3. Desk legs & front apron
  ctx.fillStyle = isWood ? '#3d2212' : '#0f172a';
  ctx.fillRect(dx + 2, dy + 13, 5, 8);
  ctx.fillRect(dx + dw - 7, dy + 13, 5, 8);

  // 4. Desk surface (Rich wood grain OR brushed cyber-steel!)
  ctx.fillStyle = '#090d16';
  ctx.fillRect(dx - 1, dy, dw + 2, 15);
  if (isWood) {
    ctx.fillStyle = '#52301a'; // front lip shadow
    ctx.fillRect(dx, dy + 10, dw, 4);
    ctx.fillStyle = opts.hovered ? '#a36f45' : '#855532'; // warm oak top
    ctx.fillRect(dx, dy + 1, dw, 9);
    ctx.fillStyle = '#a87449'; // top bevel highlight
    ctx.fillRect(dx + 1, dy + 1, dw - 2, 2);
    // Subtle wood plank grain lines
    ctx.fillStyle = '#6b4225';
    ctx.fillRect(dx + 6, dy + 5, 18, 1);
    ctx.fillRect(dx + 38, dy + 7, 22, 1);
    // Brass corner brackets
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(dx, dy + 1, 3, 2);
    ctx.fillRect(dx + dw - 3, dy + 1, 3, 2);
  } else {
    ctx.fillStyle = '#141d2e'; // front edge
    ctx.fillRect(dx, dy + 10, dw, 4);
    ctx.fillStyle = opts.hovered ? '#334866' : '#1e2c42'; // cyber steel top
    ctx.fillRect(dx, dy + 1, dw, 9);
    ctx.fillStyle = '#364b6b'; // metallic specular rim
    ctx.fillRect(dx + 1, dy + 1, dw - 2, 2);
    // Glowing under-edge LED strip!
    ctx.fillStyle = active ? accent : '#334155';
    ctx.fillRect(dx + 2, dy + 11, dw - 4, 1);
  }

  // 5. Large Widescreen Primary Monitor (62x32 bezel -> 58x28 crisp inner screen!)
  const mw = 62;
  const mh = 32;
  const mx = cx - 31;
  const my = cy - 41;

  // Monitor neck & wide metallic base stand
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx - 5, my + mh, 10, 4);
  ctx.fillStyle = '#475569';
  ctx.fillRect(cx - 4, my + mh, 8, 3);
  ctx.fillStyle = '#334155';
  ctx.fillRect(cx - 11, my + mh + 3, 22, 2);

  // Optional dual-monitor side wing (gives lush dual-screen coder workstation vibe!)
  ctx.fillStyle = '#090d16';
  ctx.fillRect(mx + mw - 1, my + 6, 8, 22);
  ctx.fillStyle = active ? (isWood ? '#1f2937' : '#082032') : '#111827';
  ctx.fillRect(mx + mw, my + 8, 6, 18);
  if (active) {
    // Mini vertical telemetry bars on secondary side monitor!
    for (let i = 0; i < 4; i++) {
      const bw = 2 + ((f + i * 2) % 4);
      ctx.fillStyle = i % 2 === 0 ? accent : '#4ade80';
      ctx.fillRect(mx + mw + 1, my + 10 + i * 4, bw, 2);
    }
  }

  // Primary Monitor Outer Frame (highlights Gold on select, accent when active!)
  const borderColor = opts.selected
    ? '#facc15'
    : opts.hovered
      ? '#86efac'
      : active
        ? accent
        : '#334155';
  ctx.fillStyle = borderColor;
  ctx.fillRect(mx - 1, my - 1, mw + 2, mh + 2);
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(mx, my, mw, mh);

  // Inner Glass Screen Surface (58x28 logical px)
  const sx = mx + 2;
  const sy = my + 2;
  const sw = mw - 4;
  const sh = mh - 4;

  if (active) {
    ctx.fillStyle = isWood ? '#0d1917' : isHolo ? '#140c29' : '#071624';
    ctx.fillRect(sx, sy, sw, sh);
    // Subtle dark header strip inside screen
    ctx.fillStyle = `${accent}26`;
    ctx.fillRect(sx, sy, sw, 5);
    // Faint moving CRT scanline sheen
    const scanY = sy + ((f * 2) % sh);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(sx, scanY, sw, 2);
    // Active power LED green dot on bottom bezel
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(mx + mw - 5, my + mh - 1, 3, 1);
  } else {
    ctx.fillStyle = '#0d1320';
    ctx.fillRect(sx, sy, sw, sh);
    // Gentle standby bouncing screensaver pixel
    const bx = sx + 4 + Math.abs(((f * 2) % ((sw - 10) * 2)) - (sw - 10));
    const by = sy + 5 + Math.abs((f % ((sh - 12) * 2)) - (sh - 12));
    ctx.fillStyle = `${accent}88`;
    ctx.fillRect(bx, by, 3, 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(mx + mw - 5, my + mh - 1, 2, 1);
  }

  // 6. Mechanical RGB Keyboard + Mousepad & Mouse
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx - 15, dy + 4, 28, 5);
  ctx.fillStyle = active ? accent : '#475569';
  ctx.fillRect(cx - 14, dy + 5, 26, 1);
  // Keycaps with subtle RGB wave when typing!
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(cx - 14, dy + 6, 26, 2);
  if (active) {
    const waveX = cx - 14 + ((f * 3) % 21);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(waveX, dy + 6, 4, 1);
  }
  // Mousepad & cyber mouse
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx + 15, dy + 4, 9, 5);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(cx + 17, dy + 5, 4, 3);
  if (active) {
    ctx.fillStyle = accent;
    ctx.fillRect(cx + 18, dy + 5, 2, 1);
  }

  // 7. Desk Props: Steaming Coffee Mug (left) + Mini Potted Succulent (far right)!
  // Coffee mug
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(dx + 3, dy + 2, 7, 7);
  ctx.fillStyle = isWood ? '#f59e0b' : '#f472b6';
  ctx.fillRect(dx + 4, dy + 3, 5, 5);
  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(dx + 5, dy + 3, 3, 2);
  // Animated mini steam pixel above mug
  if (active || isWood) {
    const stShift = f % 2;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
    ctx.fillRect(dx + 5 + stShift, dy, 1, 2);
    ctx.fillRect(dx + 7 - stShift, dy - 1, 1, 2);
  }

  // Mini desktop succulent / energy cell on far right
  ctx.fillStyle = isWood ? '#c2410c' : '#334155';
  ctx.fillRect(dx + dw - 9, dy + 4, 5, 4);
  ctx.fillStyle = isWood ? '#22c55e' : '#22d3ee';
  ctx.fillRect(dx + dw - 8, dy + 1, 3, 3);
  ctx.fillStyle = isWood ? '#86efac' : '#a5f3fc';
  ctx.fillRect(dx + dw - 7, dy + 1, 1, 2);

  return {
    screenRect: { x: sx, y: sy, w: sw, h: sh },
    deskRect: { x: dx, y: dy, w: dw, h: 15 },
    seatPos: { x: cx, y: cy + 25 },
  };
}

/**
 * 2) Multi-Tier Server Rack / Neon Overclocked Liquid-Cooled Mega-Tower (`decor-neon-rack`).
 *
 * Top-left `(x, y)`, footprint `54 x 48`.
 */
export function drawServerRack(ctx, x, y, overclocked = false, frame = 0) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const w = 54;
  const h = 48;
  const f = Math.floor(frame);

  // Ambient floor glow when overclocked!
  if (overclocked) {
    ctx.fillStyle = f % 2 === 0 ? 'rgba(0, 245, 255, 0.24)' : 'rgba(244, 114, 182, 0.24)';
    ctx.fillRect(rx - 4, ry + h - 5, w + 8, 9);
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.fillRect(rx + 2, ry + h - 2, w - 4, 5);
  }

  // Overclocked Top Neon Radiator Fins!
  if (overclocked) {
    ctx.fillStyle = '#09090b';
    ctx.fillRect(rx + 4, ry - 4, w - 8, 5);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = (i + f) % 2 === 0 ? '#00f5ff' : '#f472b6';
      ctx.fillRect(rx + 7 + i * 7, ry - 3, 4, 3);
    }
  }

  // Main Chassis Frame
  ctx.fillStyle = overclocked ? '#00f5ff' : '#090d16';
  ctx.fillRect(rx, ry, w, h);
  ctx.fillStyle = overclocked ? '#151036' : '#1e293b';
  ctx.fillRect(rx + 2, ry + 2, w - 4, h - 4);
  ctx.fillStyle = overclocked ? '#261d59' : '#334155';
  ctx.fillRect(rx + 2, ry + 2, w - 4, 2);

  // Left & Right Neon Liquid-Coolant Tubes when overclocked!
  if (overclocked) {
    for (const tx of [rx + 3, rx + w - 6]) {
      ctx.fillStyle = '#082032';
      ctx.fillRect(tx, ry + 4, 3, h - 8);
      ctx.fillStyle = tx < rx + 20 ? '#00f5ff' : '#f472b6';
      ctx.fillRect(tx + 1, ry + 5, 1, h - 10);
      // Rising coolant bubbles!
      const b1 = ry + h - 7 - ((f * 3) % (h - 14));
      const b2 = ry + h - 7 - ((f * 3 + 18) % (h - 14));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tx + 1, b1, 1, 2);
      ctx.fillRect(tx + 1, b2, 1, 2);
    }
  }

  // Left Server Blade Stack (4 stacked rack units with animated LED arrays)
  const bx = overclocked ? rx + 8 : rx + 4;
  const bw = overclocked ? 22 : 27;
  for (let i = 0; i < 4; i++) {
    const by = ry + 5 + i * 10;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(bx, by, bw, 8);
    // Air vent lines
    ctx.fillStyle = overclocked ? '#312e81' : '#334155';
    ctx.fillRect(bx + 2, by + 2, bw - 12, 1);
    ctx.fillRect(bx + 2, by + 5, bw - 12, 1);

    // Dynamic Red / Green / Cyan LED array
    const phase = (f + i * 3) % 6;
    ctx.fillStyle = phase < 3 ? '#22c55e' : '#14532d';
    ctx.fillRect(bx + bw - 9, by + 2, 2, 2);
    ctx.fillStyle = phase % 2 === 0 ? '#22d3ee' : '#0c4a6e';
    ctx.fillRect(bx + bw - 6, by + 2, 2, 2);
    ctx.fillStyle = phase === 5 ? '#ef4444' : overclocked ? '#f472b6' : '#f59e0b';
    ctx.fillRect(bx + bw - 3, by + 2, 2, 2);
  }

  // Right Column: Dual Spinning Cooling Fans!
  const fx = overclocked ? rx + 32 : rx + 33;
  const fw = 15;
  ctx.fillStyle = '#090d16';
  ctx.fillRect(fx, ry + 5, fw, 38);
  // Top GPU/Overclock bar
  ctx.fillStyle = overclocked ? (f % 2 === 0 ? '#00f5ff' : '#f472b6') : '#84cc16';
  ctx.fillRect(fx + 1, ry + 6, fw - 2, 2);

  for (let i = 0; i < 2; i++) {
    const fy = ry + 11 + i * 15;
    ctx.fillStyle = '#111827';
    ctx.fillRect(fx + 2, fy, 11, 11);
    const rot = (f + i) % 2;
    ctx.fillStyle = overclocked ? '#38bdf8' : '#475569';
    if (rot === 0) {
      ctx.fillRect(fx + 7, fy + 1, 1, 9);
      ctx.fillRect(fx + 3, fy + 5, 9, 1);
    } else {
      ctx.fillRect(fx + 4, fy + 2, 2, 2);
      ctx.fillRect(fx + 9, fy + 7, 2, 2);
      ctx.fillRect(fx + 9, fy + 2, 2, 2);
      ctx.fillRect(fx + 4, fy + 7, 2, 2);
    }
    ctx.fillStyle = overclocked ? '#f472b6' : '#84cc16';
    ctx.fillRect(fx + 6, fy + 4, 3, 3);
  }
}

/**
 * 3) Medieval-Cyber Wooden Bounty Board with glowing parchment scrolls & wax seals.
 *
 * Top-left `(x, y)`, footprint `88 x 46`.
 * Returns `{ width, height, scrollRects }`.
 */
export function drawBountyBoard(ctx, x, y, bountyCount = 3, frame = 0) {
  const bx = Math.round(x);
  const by = Math.round(y);
  const w = 88;
  const h = 46;
  const f = Math.floor(frame);

  // Wall drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(bx + 2, by + 3, w, h);

  // Carved dark mahogany outer frame
  ctx.fillStyle = '#1c0f07';
  ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = '#6b3a1e';
  ctx.fillRect(bx + 2, by + 2, w - 4, h - 4);
  ctx.fillStyle = '#92542d';
  ctx.fillRect(bx + 2, by + 2, w - 4, 2);

  // Brass corner rivets
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(bx + 2, by + 2, 3, 3);
  ctx.fillRect(bx + w - 5, by + 2, 3, 3);
  ctx.fillRect(bx + 2, by + h - 5, 3, 3);
  ctx.fillRect(bx + w - 5, by + h - 5, 3, 3);

  // Top Guild Crest Plaque
  ctx.fillStyle = '#1c0f07';
  ctx.fillRect(bx + 26, by - 4, 36, 9);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(bx + 27, by - 3, 34, 7);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(bx + 31, by - 1, 26, 2);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(bx + 42, by - 2, 4, 4);

  // Warm corkboard interior
  ctx.fillStyle = '#4a2915';
  ctx.fillRect(bx + 5, by + 6, w - 10, h - 11);
  ctx.fillStyle = '#5e361d';
  ctx.fillRect(bx + 6, by + 7, w - 12, h - 13);

  // Side miniature warm flickering lantern sconces!
  const flicker = f % 3 === 0 ? '#fef08a' : '#f59e0b';
  for (const lx of [bx - 4, bx + w + 1]) {
    ctx.fillStyle = '#1c0f07';
    ctx.fillRect(lx, by + 14, 4, 9);
    ctx.fillStyle = flicker;
    ctx.fillRect(lx + 1, by + 16, 2, 4);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.fillRect(lx - 3, by + 12, 10, 12);
  }

  // Hanging Glowing Parchment Scrolls (up to 8 based on real open bountyCount!)
  const count = Math.max(0, Math.min(8, Math.round(Number(bountyCount) || 0)));
  const scrollRects = [];
  for (let i = 0; i < count; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const sx = bx + 9 + col * 18 + (row === 1 ? 2 : 0);
    const sy = by + 9 + row * 16;
    const sw = 14;
    const sh = 13;
    scrollRects.push({ x: sx, y: sy, w: sw, h: sh, index: i });

    // Subtle magical glow behind fresh bounties
    if ((i + Math.floor(f / 4)) % 3 === 0) {
      ctx.fillStyle = 'rgba(253, 224, 71, 0.28)';
      ctx.fillRect(sx - 1, sy - 1, sw + 2, sh + 2);
    }
    // Parchment shadow & scroll paper
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(sx + 1, sy + 1, sw, sh);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(sx, sy + sh - 3, sw, 3);
    // Tiny ink text lines
    ctx.fillStyle = '#78350f';
    ctx.fillRect(sx + 2, sy + 4, 9, 1);
    ctx.fillRect(sx + 2, sy + 6, 7, 1);
    ctx.fillRect(sx + 2, sy + 8, 10, 1);
    // Crimson wax seal (or glowing cyan cyber-seal on every 3rd!)
    ctx.fillStyle = i % 3 === 2 ? '#06b6d4' : '#dc2626';
    ctx.fillRect(sx + 5, sy - 1, 4, 3);
    ctx.fillStyle = i % 3 === 2 ? '#a5f3fc' : '#fca5a5';
    ctx.fillRect(sx + 6, sy, 1, 1);
  }

  return { width: w, height: h, scrollRects };
}

/**
 * 4) Launchpad Central Floating 3D Hologram Building Projection Pedestal!
 * Evolves smoothly across 0% -> 100% / 'launched':
 *   0-29%: Wireframe Blueprint
 *   30-64%: Golden Scaffolding & Crane
 *   65-99%: Illuminated Cyber Skyscraper
 *   100% / 'launched': Radiant Neon Citadel HQ + Orbital Halo!
 *
 * Anchor: `(x, y)` is center-bottom of the octagonal pedestal.
 */
export function drawHologramCore(
  ctx,
  x,
  y,
  progressPct = 0,
  status = 'building',
  frame = 0
) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const pct = Math.max(0, Math.min(100, Number(progressPct) || 0));
  const isLaunched = status === 'launched' || pct >= 100;
  const f = Math.floor(frame);
  const pulse = Math.sin(f * 0.25);

  const primaryGlow = isLaunched
    ? '#facc15'
    : pct >= 65
      ? '#c084fc'
      : pct >= 30
        ? '#38bdf8'
        : '#22d3ee';

  // 1. Intense Cyber Floor Halo Glow
  ctx.fillStyle = isLaunched
    ? 'rgba(250, 204, 21, 0.22)'
    : 'rgba(56, 189, 248, 0.20)';
  ctx.fillRect(cx - 42, cy - 10, 84, 24);
  ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
  ctx.fillRect(cx - 32, cy - 7, 64, 18);

  // 2. Heavy Octagonal Sci-Fi Emitter Pedestal
  ctx.fillStyle = '#090d16';
  ctx.fillRect(cx - 34, cy - 8, 68, 18);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(cx - 32, cy - 6, 64, 14);
  ctx.fillStyle = '#334155';
  ctx.fillRect(cx - 28, cy - 10, 56, 7);
  // Emitter ring
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx - 22, cy - 8, 44, 4);
  ctx.fillStyle = primaryGlow;
  ctx.fillRect(cx - 18, cy - 7, 36, 2);

  // Rotating pedestal corner beacons
  const lit = f % 4;
  const beacons = [-29, -12, 10, 27];
  for (let i = 0; i < beacons.length; i++) {
    ctx.fillStyle = i === lit ? '#ffffff' : primaryGlow;
    ctx.fillRect(cx + beacons[i], cy - 4, 3, 2);
  }

  // Front LED Progress Bar integrated into pedestal
  ctx.fillStyle = '#090d16';
  ctx.fillRect(cx - 24, cy + 3, 48, 4);
  const fillW = Math.round((46 * (isLaunched ? 100 : pct)) / 100);
  ctx.fillStyle = isLaunched ? '#facc15' : '#22d3ee';
  ctx.fillRect(cx - 23, cy + 4, fillW, 2);

  // 3. Upward Volumetric Hologram Projection Cone
  ctx.fillStyle = isLaunched
    ? 'rgba(250, 204, 21, 0.11)'
    : 'rgba(34, 211, 238, 0.12)';
  ctx.fillRect(cx - 24, cy - 68, 48, 60);
  ctx.fillStyle = 'rgba(168, 85, 247, 0.10)';
  ctx.fillRect(cx - 18, cy - 74, 36, 66);

  // Rising holographic data motes
  for (let i = 0; i < 5; i++) {
    const my = cy - 12 - ((f * 2 + i * 13) % 58);
    const mx = cx - 18 + ((i * 9 + (f % 3)) % 36);
    ctx.fillStyle = i % 2 === 0 ? '#a5f3fc' : '#f0abfc';
    ctx.fillRect(mx, my, 2, 1);
  }

  // 4. Evolving 3D Floating Pixel Building Hologram!
  const bob = Math.round(pulse * 2.5);
  const baseY = cy - 18 + bob;

  if (pct < 30 && !isLaunched) {
    // STAGE 1: Cyan Wireframe Blueprint Foundation
    ctx.fillStyle = '#0891b2';
    ctx.fillRect(cx - 18, baseY - 12, 36, 12);
    ctx.fillStyle = '#22d3ee';
    // Wireframe edges
    ctx.fillRect(cx - 18, baseY - 14, 36, 1);
    ctx.fillRect(cx - 18, baseY, 36, 1);
    ctx.fillRect(cx - 18, baseY - 14, 1, 15);
    ctx.fillRect(cx + 17, baseY - 14, 1, 15);
    ctx.fillRect(cx, baseY - 14, 1, 15);
    // Blueprint grid dashes
    ctx.fillStyle = '#a5f3fc';
    for (let gx = -14; gx <= 12; gx += 6) {
      ctx.fillRect(cx + gx, baseY - 8, 3, 1);
      ctx.fillRect(cx + gx, baseY - 4, 3, 1);
    }
    // Corner blueprint beacons
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 18, baseY - 15, 2, 2);
    ctx.fillRect(cx + 16, baseY - 15, 2, 2);
  } else if (pct < 65 && !isLaunched) {
    // STAGE 2: Mid-Rise Tower + Golden Scaffolding & Pixel Crane!
    const hTower = 26 + Math.round(((pct - 30) / 35) * 10);
    const topY = baseY - hTower;
    // Left face (cyan lit) & right face (deep indigo shadow) for 3D depth!
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(cx - 14, topY, 14, hTower);
    ctx.fillStyle = '#312e81';
    ctx.fillRect(cx, topY, 14, hTower);
    // Glowing pixel windows
    for (let wy = topY + 4; wy < baseY - 3; wy += 5) {
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(cx - 11, wy, 3, 2);
      ctx.fillRect(cx - 5, wy, 3, 2);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(cx + 3, wy, 3, 2);
      ctx.fillRect(cx + 9, wy, 3, 2);
    }
    // Golden Scaffolding Bars!
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 16, topY - 2, 2, hTower + 2);
    ctx.fillRect(cx + 14, topY - 2, 2, hTower + 2);
    ctx.fillRect(cx - 16, topY + 6, 32, 1);
    ctx.fillRect(cx - 16, topY + 16, 32, 1);
    // Animated rooftop construction crane arm!
    ctx.fillStyle = '#fde047';
    ctx.fillRect(cx + 8, topY - 10, 2, 10);
    ctx.fillRect(cx - 6, topY - 10, 18, 2);
    const hookX = cx - 4 + (f % 8);
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(hookX, topY - 8, 1, 5);
    ctx.fillRect(hookX - 1, topY - 3, 3, 2);
  } else {
    // STAGE 3 (65-99%) & STAGE 4 (100% / Launched): Towering Neon Citadel HQ!
    const hTower = isLaunched ? 46 : 38;
    const topY = baseY - hTower;
    // Left & right side wings
    ctx.fillStyle = isLaunched ? '#5b21b6' : '#1e3a8a';
    ctx.fillRect(cx - 21, baseY - 22, 8, 22);
    ctx.fillRect(cx + 13, baseY - 22, 8, 22);
    // Central 3D skyscraper shaft
    ctx.fillStyle = isLaunched ? '#0ea5e9' : '#0284c7';
    ctx.fillRect(cx - 13, topY, 13, hTower);
    ctx.fillStyle = isLaunched ? '#6d28d9' : '#4338ca';
    ctx.fillRect(cx, topY, 13, hTower);
    // Crisp specular edge down center spine
    ctx.fillStyle = isLaunched ? '#fef08a' : '#a5f3fc';
    ctx.fillRect(cx - 1, topY, 2, hTower);

    // Illuminated Cyber Window Grid
    for (let wy = topY + 4; wy < baseY - 3; wy += 5) {
      const shimmer = (wy + f) % 3 === 0;
      ctx.fillStyle = isLaunched ? (shimmer ? '#fef08a' : '#67e8f9') : '#67e8f9';
      ctx.fillRect(cx - 10, wy, 3, 2);
      ctx.fillRect(cx - 5, wy, 3, 2);
      ctx.fillStyle = isLaunched ? (shimmer ? '#f472b6' : '#e879f9') : '#c084fc';
      ctx.fillRect(cx + 2, wy, 3, 2);
      ctx.fillRect(cx + 7, wy, 3, 2);
    }

    // Rooftop Spire & Glowing Beacon!
    ctx.fillStyle = isLaunched ? '#facc15' : '#38bdf8';
    ctx.fillRect(cx - 8, topY - 3, 16, 3);
    ctx.fillRect(cx - 4, topY - 7, 8, 4);
    ctx.fillRect(cx - 1, topY - 14, 2, 7);
    ctx.fillStyle = f % 2 === 0 ? '#ffffff' : isLaunched ? '#fde047' : '#22d3ee';
    ctx.fillRect(cx - 2, topY - 16, 4, 3);

    // Orbiting Hologram Energy Ring!
    const ringY = topY + 14 + Math.round(Math.cos(f * 0.2) * 3);
    ctx.fillStyle = isLaunched ? '#fde047' : '#22d3ee';
    ctx.fillRect(cx - 24, ringY, 48, 1);
    const orbX = cx + Math.round(Math.sin(f * 0.25) * 22);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(orbX - 1, ringY - 1, 3, 3);

    // Celebratory star sparkles for launched Citadel HQ!
    if (isLaunched) {
      const sOff = f % 2;
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - 25, topY - 4 + sOff, 2, 2);
      ctx.fillRect(cx + 23, topY + 2 - sOff, 2, 2);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(cx + 20, topY - 10 + sOff, 2, 2);
      ctx.fillRect(cx - 22, topY + 12 - sOff, 2, 2);
    }
  }
}

/**
 * 5) Hand-Pour Coffee Bar & Multi-Layer Rising Steam
 *    Upgrades to Liquid-Gold Italian Lever Espresso Machine when `golden = true` (`decor-gold-coffee`).
 *
 * Top-left `(x, y)`, footprint `66 x 36`.
 */
export function drawCoffeeBar(ctx, x, y, golden = false, frame = 0) {
  const bx = Math.round(x);
  const by = Math.round(y);
  const f = Math.floor(frame);

  // Floor shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.fillRect(bx + 2, by + 33, 62, 5);

  // Wooden Café Counter Base (slatted panel front)
  ctx.fillStyle = '#1c0f07';
  ctx.fillRect(bx, by + 14, 66, 22);
  ctx.fillStyle = golden ? '#6b3e12' : '#5c3317';
  ctx.fillRect(bx + 2, by + 16, 62, 18);
  // Vertical decorative wood slats
  ctx.fillStyle = golden ? '#452408' : '#3d200e';
  for (let sx = bx + 6; sx < bx + 62; sx += 6) {
    ctx.fillRect(sx, by + 21, 2, 12);
  }
  // Golden brass kickplate if upgraded
  if (golden) {
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(bx + 2, by + 33, 62, 2);
  }
  // Marble / Cream Countertop
  ctx.fillStyle = golden ? '#fef3c7' : '#e2e8f0';
  ctx.fillRect(bx - 1, by + 14, 68, 5);
  ctx.fillStyle = golden ? '#fde68a' : '#cbd5e1';
  ctx.fillRect(bx, by + 18, 66, 2);

  // Left: Artisanal Espresso Machine (Standard Ruby-Chrome OR Liquid-Gold Italian Lever!)
  const mx = bx + 6;
  const my = by + 1;
  ctx.fillStyle = '#18100a';
  ctx.fillRect(mx, my, 24, 15);
  if (golden) {
    // Gleaming Liquid-Gold Espresso Machine!
    ctx.fillStyle = '#d97706';
    ctx.fillRect(mx + 1, my + 1, 22, 13);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(mx + 2, my + 1, 20, 6);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(mx + 3, my + 2, 18, 2);
    // Sweeping specular gold shine!
    const glintX = mx + 3 + ((f * 2) % 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(glintX, my + 2, 3, 2);
    // Italian Lever Pull Arm sticking out on right!
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(mx + 23, my + 3, 4, 2);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(mx + 26, my + 2, 3, 3);
    // Twin Pressure Gauges
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(mx + 5, my + 4, 3, 3);
    ctx.fillRect(mx + 16, my + 4, 3, 3);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(mx + 6, my + 5, 1, 1);
    ctx.fillRect(mx + 17, my + 5, 1, 1);
  } else {
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(mx + 1, my + 1, 22, 13);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(mx + 2, my + 1, 20, 5);
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(mx + 3, my + 2, 16, 1);
    // Status LEDs
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(mx + 18, my + 3, 2, 2);
  }
  // Chrome brew alcove & espresso cup
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(mx + 4, my + 7, 16, 6);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(mx + 9, my + 7, 6, 2); // portafilter nozzle
  ctx.fillStyle = '#78350f';
  ctx.fillRect(mx + 11, my + 9, 2, 2); // rich coffee stream
  ctx.fillStyle = golden ? '#fef08a' : '#f8fafc';
  ctx.fillRect(mx + 9, my + 10, 6, 3); // cup

  // Center: Hand-Pour Glass Carafe & Kettle
  ctx.fillStyle = '#334155';
  ctx.fillRect(bx + 34, by + 7, 9, 8);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(bx + 35, by + 11, 7, 3);
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(bx + 35, by + 8, 7, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx + 36, by + 8, 1, 4);

  // Right: Stacked Porcelain Cups & Pastry Dome
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(bx + 47, by + 7, 13, 8);
  ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
  ctx.fillRect(bx + 48, by + 8, 11, 6);
  ctx.fillStyle = '#f59e0b'; // golden croissant inside glass dome!
  ctx.fillRect(bx + 50, by + 11, 7, 3);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(bx + 51, by + 11, 4, 1);

  // Multi-Layer Rising Pixel Steam Wisps!
  for (let s = 0; s < 3; s++) {
    const sy = by - 2 - ((f + s * 4) % 10);
    const sx = mx + 7 + s * 6 + Math.round(Math.sin((f + s * 3) * 0.6));
    const alpha = Math.max(0.2, 0.85 - ((by - sy) / 14) * 0.65);
    ctx.fillStyle = golden
      ? `rgba(254, 240, 138, ${alpha.toFixed(2)})`
      : `rgba(241, 245, 249, ${alpha.toFixed(2)})`;
    ctx.fillRect(sx, sy, 2, 2);
  }
}

/**
 * 6) High-Detail 24x20 Sleeping Orange Tabby Cat curled on a plush velvet cushion!
 * Features breathing rise/fall, occasional sleepy blink/peek, tail wag, and floating Zzz!
 *
 * Top-left `(x, y)`, footprint `28 x 22`.
 */
export function drawSleepingCat(ctx, x, y, frame = 0) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const f = Math.floor(frame);
  const breath = Math.floor(f / 6) % 2; // gentle breathing rise/fall
  const peek = f % 32 >= 26 && f % 32 <= 29; // occasional cute half-open eye peek!
  const tailWag = Math.floor(f / 4) % 2;

  // 1. Plush Berry-Plum Velvet Cat Bed Cushion (28x14)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.fillRect(cx + 2, cy + 16, 24, 5);
  ctx.fillStyle = '#2e1065';
  ctx.fillRect(cx + 1, cy + 10, 26, 10);
  ctx.fillStyle = '#7e22ce';
  ctx.fillRect(cx + 2, cy + 11, 24, 8);
  ctx.fillStyle = '#c084fc';
  ctx.fillRect(cx + 4, cy + 12, 20, 5);
  ctx.fillStyle = '#e9d5ff';
  ctx.fillRect(cx + 6, cy + 13, 16, 2);

  // 2. Curled 24x20 Orange Tabby Cat Body!
  const by = cy + 6 + breath;
  // Bold dark espresso outline silhouette
  ctx.fillStyle = '#271204';
  ctx.fillRect(cx + 4, by, 18, 10 - breath);
  ctx.fillRect(cx + 3, by + 2, 20, 7 - breath);
  // Warm ginger orange fur
  ctx.fillStyle = '#f97316';
  ctx.fillRect(cx + 5, by + 1, 16, 8 - breath);
  ctx.fillRect(cx + 4, by + 3, 18, 5 - breath);
  // Sunlit cream-orange top fur highlight
  ctx.fillStyle = '#fdba74';
  ctx.fillRect(cx + 8, by + 1, 10, 2);
  // Deep tabby tiger stripes across back!
  ctx.fillStyle = '#9a3412';
  ctx.fillRect(cx + 12, by + 1, 2, 4);
  ctx.fillRect(cx + 16, by + 1, 2, 4);
  ctx.fillRect(cx + 19, by + 2, 2, 3);

  // 3. Cute Cat Head resting on front paws (left side)
  const hy = cy + 5;
  ctx.fillStyle = '#271204';
  ctx.fillRect(cx + 3, hy, 10, 9);
  // Pointed cat ears with pink inner tips
  ctx.fillRect(cx + 3, hy - 2, 3, 3);
  ctx.fillRect(cx + 10, hy - 2, 3, 3);
  ctx.fillStyle = '#fb923c';
  ctx.fillRect(cx + 4, hy + 1, 8, 7);
  ctx.fillRect(cx + 4, hy - 1, 2, 2);
  ctx.fillRect(cx + 10, hy - 1, 2, 2);
  ctx.fillStyle = '#fda4af'; // pink inner ear
  ctx.fillRect(cx + 4, hy, 1, 1);
  ctx.fillRect(cx + 11, hy, 1, 1);
  // Cream muzzle & pink nose
  ctx.fillStyle = '#ffedd5';
  ctx.fillRect(cx + 5, hy + 5, 6, 3);
  ctx.fillStyle = '#f472b6';
  ctx.fillRect(cx + 7, hy + 5, 2, 1);

  // Sleeping closed eyes OR occasional cute emerald sleepy peek!
  if (peek) {
    ctx.fillStyle = '#14532d';
    ctx.fillRect(cx + 5, hy + 3, 2, 2);
    ctx.fillRect(cx + 9, hy + 3, 2, 2);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(cx + 5, hy + 3, 1, 1);
    ctx.fillRect(cx + 9, hy + 3, 1, 1);
  } else {
    ctx.fillStyle = '#271204';
    ctx.fillRect(cx + 5, hy + 4, 2, 1);
    ctx.fillRect(cx + 9, hy + 4, 2, 1);
  }

  // Front tucked cream paws
  ctx.fillStyle = '#ffedd5';
  ctx.fillRect(cx + 4, cy + 13, 3, 2);
  ctx.fillRect(cx + 9, cy + 13, 3, 2);

  // 4. Wagging Tabby Tail curled around right edge!
  ctx.fillStyle = '#271204';
  ctx.fillRect(cx + 21, cy + 10 - tailWag, 5, 4);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(cx + 21, cy + 11 - tailWag, 4, 2);
  ctx.fillStyle = '#ffedd5';
  ctx.fillRect(cx + 24, cy + 11 - tailWag, 1, 2);

  // 5. Floating Pixel "z Z" Dream Bubbles!
  if (!peek) {
    const zRise = Math.floor(f / 3) % 6;
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(cx + 13 + (zRise % 2), cy + 1 - zRise, 3, 1);
    ctx.fillRect(cx + 14 + (zRise % 2), cy + 2 - zRise, 1, 1);
    ctx.fillRect(cx + 13 + (zRise % 2), cy + 3 - zRise, 3, 1);
  }
}

/**
 * 7) Potted Plant: Handcrafted Terracotta Monstera / Glowing Cyber Fern / Sakura Bonsai.
 *
 * Anchor: `(x, y)` is center-bottom of pot (footprint `22 x 26`, drawn `x-11..x+11, y-26..y`).
 */
export function drawPottedPlant(ctx, x, y, variant = 'monstera', frame = 0) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const f = Math.floor(frame);
  const sway = Math.floor(f / 8) % 2;

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.fillRect(cx - 8, cy - 2, 16, 4);

  if (variant === 'cyber_fern' || variant === 'neon') {
    // Sleek Obsidian Hex Cyber Planter + Bioluminescent Cyan-Mint Fern!
    ctx.fillStyle = '#090d16';
    ctx.fillRect(cx - 7, cy - 10, 14, 10);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 6, cy - 9, 12, 8);
    ctx.fillStyle = '#00f5ff';
    ctx.fillRect(cx - 6, cy - 6, 12, 2); // glowing neon planter band
    // Bioluminescent fern fronds
    ctx.fillStyle = '#0d9488';
    ctx.fillRect(cx - 9 + sway, cy - 18, 7, 4);
    ctx.fillRect(cx + 2 - sway, cy - 19, 7, 4);
    ctx.fillRect(cx - 4, cy - 24, 8, 12);
    ctx.fillStyle = '#2dd4bf';
    ctx.fillRect(cx - 8 + sway, cy - 19, 6, 2);
    ctx.fillRect(cx + 2 - sway, cy - 20, 6, 2);
    ctx.fillRect(cx - 3, cy - 23, 6, 8);
    ctx.fillStyle = '#a5f3fc';
    ctx.fillRect(cx - 1, cy - 24, 2, 6);
    // Floating glowing cyan spores
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6, cy - 25 + (f % 3), 1, 1);
    ctx.fillRect(cx + 6, cy - 23 - (f % 3), 1, 1);
    return;
  }

  if (variant === 'sakura' || variant === 'bonsai') {
    // Ceramic Slate Pot + Blooming Sakura Bonsai
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(cx - 7, cy - 8, 14, 8);
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - 6, cy - 7, 12, 6);
    // Gnarled bonsai trunk
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - 2, cy - 16, 4, 9);
    ctx.fillRect(cx - 5, cy - 18, 5, 3);
    // Sakura pink pixel canopy
    ctx.fillStyle = '#be185d';
    ctx.fillRect(cx - 10 + sway, cy - 24, 20, 8);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(cx - 9 + sway, cy - 25, 18, 6);
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(cx - 6 + sway, cy - 25, 8, 3);
    return;
  }

  // Default: Rich Terracotta Pot + Lush Split Monstera Leaves!
  ctx.fillStyle = '#271207';
  ctx.fillRect(cx - 7, cy - 10, 14, 10);
  ctx.fillStyle = '#c2410c';
  ctx.fillRect(cx - 6, cy - 9, 12, 8);
  ctx.fillStyle = '#ea580c'; // terracotta rim highlight
  ctx.fillRect(cx - 7, cy - 10, 14, 3);
  ctx.fillStyle = '#fb923c';
  ctx.fillRect(cx - 6, cy - 10, 6, 1);

  // Stems
  ctx.fillStyle = '#14532d';
  ctx.fillRect(cx - 1, cy - 16, 2, 7);
  ctx.fillRect(cx - 5, cy - 14, 4, 2);
  ctx.fillRect(cx + 2, cy - 15, 4, 2);

  // Lush Monstera Leaf Clusters with bold dark outlines & split leaf notches!
  const leaves = [
    [cx - 10 + sway, cy - 21, 9, 7],
    [cx + 1 - sway, cy - 22, 9, 7],
    [cx - 5, cy - 26, 10, 8],
  ];
  for (const [lx, ly, lw, lh] of leaves) {
    ctx.fillStyle = '#052e16';
    ctx.fillRect(lx - 1, ly - 1, lw + 2, lh + 2);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(lx, ly, lw, lh);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(lx + 1, ly, lw - 2, lh - 2);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(lx + 2, ly + 1, 3, 2);
    // Iconic Monstera leaf fenestration (notch)
    ctx.fillStyle = '#052e16';
    ctx.fillRect(lx + lw - 2, ly + 3, 2, 1);
  }
}

/**
 * 8) 6-Slot Wall-Mounted Genesis Achievement Trophy Glass Display Case!
 * Unlocked slots illuminate with golden trophy cups, colored gems, and sparkles.
 *
 * Top-left `(x, y)`, footprint `80 x 32`.
 */
export function drawTrophyCase(ctx, x, y, achievements = [], frame = 0) {
  const tx = Math.round(x);
  const ty = Math.round(y);
  const w = 80;
  const h = 32;
  const f = Math.floor(frame);

  // Normalize achievement unlock booleans (supports array of objects, booleans, or count)
  const unlockedFlags = [];
  if (typeof achievements === 'number') {
    for (let i = 0; i < 6; i++) unlockedFlags.push(i < achievements);
  } else if (Array.isArray(achievements)) {
    for (let i = 0; i < 6; i++) {
      const item = achievements[i];
      unlockedFlags.push(Boolean(typeof item === 'object' ? item?.unlocked : item));
    }
  } else {
    for (let i = 0; i < 6; i++) unlockedFlags.push(false);
  }

  // Drop shadow & dark walnut + gold-trimmed cabinet frame
  ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
  ctx.fillRect(tx + 2, ty + 2, w, h);
  ctx.fillStyle = '#1c1008';
  ctx.fillRect(tx, ty, w, h);
  ctx.fillStyle = '#5c3317';
  ctx.fillRect(tx + 1, ty + 1, w - 2, h - 2);
  ctx.fillStyle = '#fbbf24'; // top gold nameplate bar
  ctx.fillRect(tx + 22, ty + 1, 36, 3);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(tx + 25, ty + 2, 30, 1);

  // Interior velvet backing
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(tx + 3, ty + 5, w - 6, h - 8);

  const gemColors = ['#22d3ee', '#a855f7', '#f472b6', '#facc15', '#4ade80', '#fb923c'];

  // 6 Individual Illuminated Trophy Alcoves!
  for (let i = 0; i < 6; i++) {
    const sx = tx + 5 + i * 12;
    const sy = ty + 7;
    const unlocked = unlockedFlags[i];

    // Alcove background (warm golden spotlight when unlocked!)
    ctx.fillStyle = unlocked ? '#241b0c' : '#131a2b';
    ctx.fillRect(sx, sy, 10, 20);
    // Pedestal base
    ctx.fillStyle = unlocked ? '#b45309' : '#1e293b';
    ctx.fillRect(sx + 1, sy + 16, 8, 3);

    if (unlocked) {
      // Soft top spotlight glow
      ctx.fillStyle = 'rgba(253, 224, 71, 0.22)';
      ctx.fillRect(sx + 1, sy + 1, 8, 15);
      // Gleaming Golden Pixel Trophy Cup!
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(sx + 2, sy + 5, 6, 6);
      ctx.fillRect(sx + 1, sy + 6, 8, 3); // handles
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 3, sy + 5, 4, 2); // top rim gleam
      ctx.fillStyle = '#d97706';
      ctx.fillRect(sx + 4, sy + 11, 2, 4); // stem
      ctx.fillRect(sx + 2, sy + 14, 6, 2); // cup foot
      // Unique Achievement Jewel Center!
      ctx.fillStyle = gemColors[i % gemColors.length];
      ctx.fillRect(sx + 4, sy + 7, 2, 2);
      // Animated white sparkle glint!
      if ((f + i * 2) % 6 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 2, sy + 3, 2, 2);
      }
    } else {
      // Locked trophy silhouette
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(sx + 3, sy + 6, 4, 5);
      ctx.fillRect(sx + 4, sy + 11, 2, 3);
      ctx.fillStyle = '#334155';
      ctx.fillRect(sx + 4, sy + 8, 2, 2);
    }
  }

  // Crisp Diagonal Glass Cabinet Reflection Sheen!
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(tx + 8, ty + 6, 5, 20);
  ctx.fillRect(tx + 15, ty + 6, 2, 20);
  ctx.fillRect(tx + 56, ty + 6, 4, 20);
}

/**
 * 9a) Creator Vault Monumental Black-Gold Cyber Bank Vault Door!
 *
 * Top-left `(x, y)`, footprint `76 x 68`.
 */
export function drawVaultDoor(ctx, x, y, frame = 0) {
  const vx = Math.round(x);
  const vy = Math.round(y);
  const w = 76;
  const h = 68;
  const f = Math.floor(frame);

  // Armored Obsidian Archway Frame
  ctx.fillStyle = '#05070d';
  ctx.fillRect(vx, vy, w, h);
  ctx.fillStyle = '#181c29';
  ctx.fillRect(vx + 2, vy + 2, w - 4, h - 4);
  // Gold architectural trim & corner rivets
  ctx.fillStyle = '#b45309';
  ctx.fillRect(vx + 2, vy + 2, w - 4, 3);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(vx + 4, vy + 3, w - 8, 1);
  for (const [rx, ry] of [
    [vx + 4, vy + 7],
    [vx + w - 7, vy + 7],
    [vx + 4, vy + h - 8],
    [vx + w - 7, vy + h - 8],
  ]) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(rx, ry, 3, 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(rx, ry, 1, 1);
  }

  // Twin Top Security Beacons
  const beaconColor = f % 4 < 2 ? '#fde047' : '#f59e0b';
  ctx.fillStyle = beaconColor;
  ctx.fillRect(vx + 10, vy + 7, 5, 3);
  ctx.fillRect(vx + w - 15, vy + 7, 5, 3);
  ctx.fillStyle = 'rgba(253, 224, 71, 0.20)';
  ctx.fillRect(vx + 7, vy + 5, 11, 7);
  ctx.fillRect(vx + w - 18, vy + 5, 11, 7);

  // Massive Circular Reinforced Titanium Vault Door (pixelated circle!)
  const cx = vx + 38;
  const cy = vy + 37;
  const drawPixelCircle = (r, color) => {
    ctx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const span = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(cx - span, cy + dy, span * 2 + 1, 1);
    }
  };

  drawPixelCircle(26, '#090d16');
  drawPixelCircle(24, '#272f42');
  drawPixelCircle(21, '#111622');
  drawPixelCircle(19, '#1f2638');

  // 8 Heavy Steel Locking Bolts around perimeter
  const boltOffsets = [
    [-22, 0],
    [22, 0],
    [0, -22],
    [0, 22],
    [-16, -16],
    [16, -16],
    [-16, 16],
    [16, 16],
  ];
  for (const [ox, oy] of boltOffsets) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx + ox - 2, cy + oy - 2, 4, 4);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx + ox - 1, cy + oy - 1, 2, 1);
  }

  // Gleaming Golden 6-Spoke Combination Wheel!
  drawPixelCircle(12, '#78350f');
  drawPixelCircle(11, '#f59e0b');
  drawPixelCircle(8, '#1f2638');
  // Spokes (subtle animated gleam rotation!)
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(cx - 10, cy - 1, 21, 3);
  ctx.fillRect(cx - 1, cy - 10, 3, 21);
  ctx.fillStyle = '#fef08a';
  if (f % 2 === 0) {
    ctx.fillRect(cx - 7, cy - 7, 3, 3);
    ctx.fillRect(cx + 5, cy + 5, 3, 3);
  } else {
    ctx.fillRect(cx + 5, cy - 7, 3, 3);
    ctx.fillRect(cx - 7, cy + 5, 3, 3);
  }
  // Center lock hub with glowing emerald/gold cyber core
  drawPixelCircle(4, '#d97706');
  ctx.fillStyle = f % 6 === 0 ? '#ffffff' : '#4ade80';
  ctx.fillRect(cx - 1, cy - 1, 3, 3);

  // Digital Security Status Strip on right jamb
  ctx.fillStyle = '#090d16';
  ctx.fillRect(vx + w - 10, vy + 28, 7, 16);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(vx + w - 9, vy + 30, 5, 3);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(vx + w - 9, vy + 35, 5, 2);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(vx + w - 9, vy + 39, 5, 3);
}

/**
 * 9b) Sparkling Pixel Gold Coin Mountain & Bullion Pile!
 * Scales richly with `level` (0..5; higher numbers automatically cap at majestic level 5).
 *
 * Anchor: `(x, y)` is center-bottom of the treasure mound.
 */
export function drawGoldPile(ctx, x, y, level = 1, frame = 0) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const lvl = Math.max(0, Math.min(5, Math.round(Number(level) || 0)));
  const f = Math.floor(frame);

  // Base ambient golden glow & contact shadow
  const baseW = 24 + lvl * 9;
  const baseH = 7 + lvl * 5;
  ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
  ctx.fillRect(cx - Math.round(baseW / 2) - 4, cy - 6, baseW + 8, 10);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
  ctx.fillRect(cx - Math.round(baseW / 2), cy - 1, baseW, 4);

  // Layered stepped coin mountain silhouette
  const layers = Math.max(2, lvl + 2);
  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    const lw = Math.max(10, Math.round(baseW * (1 - t * 0.72)));
    const ly = cy - 4 - i * 4;
    // Bold bronze-dark outline & base gold
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - Math.round(lw / 2) - 1, ly - 1, lw + 2, 6);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(cx - Math.round(lw / 2), ly, lw, 5);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - Math.round(lw / 2) + 1, ly, lw - 2, 3);
    // Individual glinting gold coin caps along the layer!
    for (let ox = -Math.round(lw / 2) + 2; ox < Math.round(lw / 2) - 3; ox += 5) {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx + ox, ly, 3, 2);
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(cx + ox, ly, 1, 1);
    }
  }

  // Stacked Gold Bullion Bars at foreground!
  if (lvl >= 2) {
    for (const bx of [cx - 14, cx + 6]) {
      ctx.fillStyle = '#451a03';
      ctx.fillRect(bx - 1, cy - 6, 12, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(bx, cy - 5, 10, 4);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 1, cy - 5, 8, 2);
    }
  }

  // Scattered Precious Gems (Cyan Sapphire, Ruby, Emerald) nestled in high-level piles!
  if (lvl >= 3) {
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(cx - 6, cy - 10, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6, cy - 10, 1, 1);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(cx + 8, cy - 12, 3, 3);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(cx - 1, cy - 15, 3, 3);
  }

  // Animated Twinkling Star Sparkles popping across the gold pile!
  const sparkleCount = 2 + lvl;
  for (let i = 0; i < sparkleCount; i++) {
    if ((f + i * 3) % 5 > 1) continue;
    const sx = cx - Math.round(baseW * 0.38) + ((i * 13 + f * 3) % Math.max(8, Math.round(baseW * 0.76)));
    const sy = cy - 4 - ((i * 7 + f) % Math.max(6, baseH));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx, sy, 1, 3);
    ctx.fillRect(sx - 1, sy + 1, 3, 1);
  }
}

/**
 * Bundled Room Props namespace (for convenient grouped import by pixelEngine.js).
 */
export const ROOM_PROPS = {
  drawMonitorDesk,
  drawServerRack,
  drawBountyBoard,
  drawHologramCore,
  drawCoffeeBar,
  drawSleepingCat,
  drawPottedPlant,
  drawTrophyCase,
  drawVaultDoor,
  drawGoldPile,
};

// ============================================================================
// 6. LEGACY 12x14 WORKER MATRICES & OBJECT SPRITES (100% BACKWARD COMPATIBLE)
// ============================================================================

const FLASH_WORKER_FRAMES = {
  idle: [
    [
      '.....AA.....',
      '...OOHHOO...',
      '..OHhhhhHO..',
      '..OVvvvvVO..',
      '..OVVVVVVO..',
      '..OSSSSSSO..',
      '...OOBBOO...',
      '..OBBAABBO..',
      '..OBBBBBBO..',
      '..OCbbbbCO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '.....GG.....',
      '............',
      '...OOHHOO...',
      '..OHhhhhHO..',
      '..OVVvvVVO..',
      '..OVVVVVVO..',
      '..OSSSSSSO..',
      '..OBBAABBO..',
      '..OBBBBBBO..',
      '..OCbbbbCO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  walk: [
    [
      '.....AA.....',
      '...OOHHOO...',
      '..OHhhhhHO..',
      '..OVvvvvVO..',
      '..OVVVVVVO..',
      '..OSSSSSSO..',
      '...OOBBOO...',
      '.OOBBAABBO..',
      '..OBBBBBBOO.',
      '..OCbbbbCO..',
      '...OOBBOO...',
      '..OP....PO..',
      '..OP....PO..',
      '.OOP....OO..',
    ],
    [
      '.....AA.....',
      '...OOHHOO...',
      '..OHhhhhHO..',
      '..OVvvvvVO..',
      '..OVVVVVVO..',
      '..OSSSSSSO..',
      '...OOBBOO...',
      '..OBBAABBO..',
      '..OBBBBBBO..',
      '..OCbbbbCO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '.....AA.....',
      '...OOHHOO...',
      '..OHhhhhHO..',
      '..OVvvvvVO..',
      '..OVVVVVVO..',
      '..OSSSSSSO..',
      '...OOBBOO...',
      '..OBBAABBOO.',
      '.OOBBBBBBO..',
      '..OCbbbbCO..',
      '...OOBBOO...',
      '..OP....PO..',
      '..OP....PO..',
      '..OO....POO.',
    ],
    [
      '.....AA.....',
      '...OOHHOO...',
      '..OHhhhhHO..',
      '..OVvvvvVO..',
      '..OVVVVVVO..',
      '..OSSSSSSO..',
      '...OOBBOO...',
      '..OBBAABBO..',
      '..OBBBBBBO..',
      '..OCbbbbCO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  work: [
    [
      '.....GG.....',
      '...OOHHOO...',
      '..OHhhhhHO..',
      '..OVvvvvVO..',
      '..OVVVVVVO..',
      '..OSSSSSSO..',
      '...OOBBOO...',
      '.SOBBAABBO..',
      '..OBBBBBBS..',
      '..OCbbbbCO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '.....AA.....',
      '...OOHHOO...',
      '..OHhhhhHO..',
      '..OVvVVvVO..',
      '..OVVVVVVO..',
      '..OSSSSSSO..',
      '...OOBBOO...',
      '..OBBAABBS..',
      '.SOBBBBBBO..',
      '..OCbbbbCO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  celebrate: [
    [
      '.G...GG...G.',
      'SO.OOHHOO.OS',
      '.OOHhhhhHOO.',
      '..OVvvvvVO..',
      '..OVVVVVVO..',
      '..OSSSSSSO..',
      '..OBBAABBO..',
      '..OBBBBBBO..',
      '..OCbbbbCO..',
      '...OOBBOO...',
      '..OP....PO..',
      '..OOP..POO..',
      '............',
      '............',
    ],
    [
      'G....AA....G',
      '.S.OOHHOO.S.',
      '.OOHhhhhHOO.',
      '..OVVvvVVO..',
      '..OVVVVVVO..',
      '..OSSSSSSO..',
      '...OOBBOO...',
      '..OBBAABBO..',
      '..OBBBBBBO..',
      '..OCbbbbCO..',
      '...OP..PO...',
      '..OOP..POO..',
      '............',
      '............',
    ],
  ],
};

const PRO_ARCHITECT_FRAMES = {
  idle: [
    [
      '....OOOO....',
      '..OOHhhHOO..',
      '.OHHHHHHHHO.',
      '.OShSSSShSO.',
      '.OSVVSSVVSO.',
      '..OSSSSSSO..',
      '.OOCBAAABCO.',
      '.OCBBBBBBCO.',
      '.OCBbbbbBCO.',
      '.OCCBBBBCCO.',
      '.OC.OOOO.CO.',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '............',
      '....OOOO....',
      '..OOHhhHOO..',
      '.OHHHHHHHHO.',
      '.OShSSSShSO.',
      '.OSVvSSvVSO.',
      '..OSSSSSSO..',
      '.OOCBAAABCO.',
      '.OCBBBBBBCO.',
      '.OCBbbbbBCO.',
      '.OCCBBBBCCO.',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  walk: [
    [
      '....OOOO....',
      '..OOHhhHOO..',
      '.OHHHHHHHHO.',
      '.OShSSSShSO.',
      '.OSVVSSVVSO.',
      '..OSSSSSSO..',
      '.OOCBAAABCO.',
      'OCCBBBBBBCO.',
      'OC.BbbbbBCO.',
      '...CBBBBC...',
      '...OOOOOO...',
      '..OP....PO..',
      '..OP....PO..',
      '.OOP....OO..',
    ],
    [
      '....OOOO....',
      '..OOHhhHOO..',
      '.OHHHHHHHHO.',
      '.OShSSSShSO.',
      '.OSVVSSVVSO.',
      '..OSSSSSSO..',
      '.OOCBAAABCO.',
      '.OCBBBBBBCO.',
      '.OCBbbbbBCO.',
      '.OCCBBBBCCO.',
      '...OOOOOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '....OOOO....',
      '..OOHhhHOO..',
      '.OHHHHHHHHO.',
      '.OShSSSShSO.',
      '.OSVVSSVVSO.',
      '..OSSSSSSO..',
      '.OOCBAAABCO.',
      '.OCBBBBBBCCO',
      '.OCBbbbbB.CO',
      '...CBBBBC...',
      '...OOOOOO...',
      '..OP....PO..',
      '..OP....PO..',
      '..OO....POO.',
    ],
    [
      '....OOOO....',
      '..OOHhhHOO..',
      '.OHHHHHHHHO.',
      '.OShSSSShSO.',
      '.OSVVSSVVSO.',
      '..OSSSSSSO..',
      '.OOCBAAABCO.',
      '.OCBBBBBBCO.',
      '.OCBbbbbBCO.',
      '.OCCBBBBCCO.',
      '...OOOOOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  work: [
    [
      '....OOOO....',
      '..OOHhhHOO..',
      '.OHHHHHHHHO.',
      '.OShSSSShSO.',
      '.OSvVSSvVSO.',
      '..OSSSSSSO..',
      '.OOCBAAABCO.',
      'SOCBBBBBBCO.',
      '.OCBbbbbBCS.',
      '.OCCBBBBCCO.',
      '...OOOOOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '....OOOO....',
      '..OOHhhHOO..',
      '.OHHHHHHHHO.',
      '.OShSSSShSO.',
      '.OSVvSSVvSO.',
      '..OSSSSSSO..',
      '.OOCBAAABCO.',
      '.OCBBBBBBCS.',
      'SOCBbbbbBCO.',
      '.OCCBBBBCCO.',
      '...OOOOOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  celebrate: [
    [
      '.G..OOOO..G.',
      'SOOOHhhHOOS.',
      '.OHHHHHHHHO.',
      '.OSvVSSvVSO.',
      '..OSSSSSSO..',
      '.OOCBAAABCO.',
      'OCCBBBBBBCCO',
      'OC.BbbbbB.CO',
      '...OOOOOO...',
      '..OP....PO..',
      '..OOP..POO..',
      '............',
      '............',
      '............',
    ],
    [
      'G...OOOO...G',
      '.SOOHhhHOOS.',
      '.OHHHHHHHHO.',
      '.OSVVSSVVSO.',
      '..OSSSSSSO..',
      '.OOCBAAABCO.',
      '.OCBBBBBBCO.',
      '.OCBbbbbBCO.',
      '...OOOOOO...',
      '...OP..PO...',
      '..OOP..POO..',
      '............',
      '............',
      '............',
    ],
  ],
};

const PIXEL_ARTIST_FRAMES = {
  idle: [
    [
      '.....OO.....',
      '..OOHHHHOO..',
      '.OHHhhhhHHO.',
      '.OHHHHHHHHO.',
      '..OSSSSSSO..',
      '..OSEssESO..',
      '..OSSSSSSO..',
      '..OBBACBBO..',
      '..OBBBBBBO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '............',
      '.....OO.....',
      '..OOHHHHOO..',
      '.OHHhhhhHHO.',
      '.OHHHHHHHHO.',
      '..OSSSSSSO..',
      '..OSEssESO..',
      '..OBBACBBO..',
      '..OBBBBBBO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  walk: [
    [
      '.....OO.....',
      '..OOHHHHOO..',
      '.OHHhhhhHHO.',
      '.OHHHHHHHHO.',
      '..OSSSSSSO..',
      '..OSEssESO..',
      '..OSSSSSSO..',
      '.OOBBACBBO..',
      '..OBBBBBBOO.',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '..OP....PO..',
      '..OP....PO..',
      '.OOP....OO..',
    ],
    [
      '.....OO.....',
      '..OOHHHHOO..',
      '.OHHhhhhHHO.',
      '.OHHHHHHHHO.',
      '..OSSSSSSO..',
      '..OSEssESO..',
      '..OSSSSSSO..',
      '..OBBACBBO..',
      '..OBBBBBBO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '.....OO.....',
      '..OOHHHHOO..',
      '.OHHhhhhHHO.',
      '.OHHHHHHHHO.',
      '..OSSSSSSO..',
      '..OSEssESO..',
      '..OSSSSSSO..',
      '..OBBACBBOO.',
      '.OOBBBBBBO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '..OP....PO..',
      '..OP....PO..',
      '..OO....POO.',
    ],
    [
      '.....OO.....',
      '..OOHHHHOO..',
      '.OHHhhhhHHO.',
      '.OHHHHHHHHO.',
      '..OSSSSSSO..',
      '..OSEssESO..',
      '..OSSSSSSO..',
      '..OBBACBBO..',
      '..OBBBBBBO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  work: [
    [
      '.....OO.....',
      '..OOHHHHOO..',
      '.OHHhhhhHHO.',
      '.OHHHHHHHHO.',
      '..OSSSSSSO..',
      '..OSEssESO..',
      '..OSSSSSSO..',
      '.SOBBACBBO..',
      '..OBBBBBBS..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '.....OO.....',
      '..OOHHHHOO..',
      '.OHHhhhhHHO.',
      '.OHHHHHHHHO.',
      '..OSSSSSSO..',
      '..OSEssESO..',
      '..OSSSSSSO..',
      '..OBBACBBS..',
      '.SOBBBBBBO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  celebrate: [
    [
      '.G...OO...G.',
      'SOOOHHHHOOS.',
      '.OHHhhhhHHO.',
      '..OSSSSSSO..',
      '..OSEssESO..',
      '..OBBACBBO..',
      '..OBBBBBBO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '..OP....PO..',
      '..OOP..POO..',
      '............',
      '............',
      '............',
    ],
    [
      'G....OO....G',
      '.SOOHHHHOOS.',
      '.OHHhhhhHHO.',
      '..OSSSSSSO..',
      '..OSEssESO..',
      '..OBBACBBO..',
      '..OBBBBBBO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '..OOP..POO..',
      '............',
      '............',
      '............',
    ],
  ],
};

const GUILD_ARTISAN_FRAMES = {
  idle: [
    [
      '..O.OOOO.O..',
      '..OHhhhhHO..',
      '.OVVVvvVVVO.',
      '.OOHHHHHHOv.',
      '..OSSSSSSOv.',
      '..OSESSSSO..',
      '..OSSSSSSO..',
      '..OBBBBBBO..',
      '..OCCAACCO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '............',
      '..O.OOOO.O..',
      '..OHhhhhHO..',
      '.OVVVvvVVVO.',
      '.OOHHHHHHOv.',
      '..OSSSSSSO..',
      '..OSESSSSO..',
      '..OBBBBBBO..',
      '..OCCAACCO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  walk: [
    [
      '..O.OOOO.O..',
      '..OHhhhhHO..',
      '.OVVVvvVVVO.',
      '.OOHHHHHHOv.',
      '..OSSSSSSO..',
      '..OSESSSSO..',
      '..OSSSSSSO..',
      '.OOBBBBBBO..',
      '..OCCAACCOO.',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '..OP....PO..',
      '..OP....PO..',
      '.OOP....OO..',
    ],
    [
      '..O.OOOO.O..',
      '..OHhhhhHO..',
      '.OVVVvvVVVO.',
      '.OOHHHHHHOv.',
      '..OSSSSSSO..',
      '..OSESSSSO..',
      '..OSSSSSSO..',
      '..OBBBBBBO..',
      '..OCCAACCO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '..O.OOOO.O..',
      '..OHhhhhHO..',
      '.OVVVvvVVVO.',
      '.OOHHHHHHOv.',
      '..OSSSSSSO..',
      '..OSESSSSO..',
      '..OSSSSSSO..',
      '..OBBBBBBOO.',
      '.OOCCAACCO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '..OP....PO..',
      '..OP....PO..',
      '..OO....POO.',
    ],
    [
      '..O.OOOO.O..',
      '..OHhhhhHO..',
      '.OVVVvvVVVO.',
      '.OOHHHHHHOv.',
      '..OSSSSSSO..',
      '..OSESSSSO..',
      '..OSSSSSSO..',
      '..OBBBBBBO..',
      '..OCCAACCO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  work: [
    [
      '..O.OOOO.O..',
      '..OHhhhhHO..',
      '.OVVVvvVVVO.',
      '.OOHHHHHHOv.',
      '..OSSSSSSO..',
      '..OSESSSSO..',
      '..OSSSSSSO..',
      '.SOBBBBBBO..',
      '..OCCAACCS..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
    [
      '..O.OOOO.O..',
      '..OHhhhhHO..',
      '.OVVVvvVVVO.',
      '.OOHHHHHHOv.',
      '..OSSSSSSO..',
      '..OSESSSSO..',
      '..OSSSSSSO..',
      '..OBBBBBBS..',
      '.SOCCAACCO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '...OP..PO...',
      '..OOP..POO..',
    ],
  ],
  celebrate: [
    [
      '.G.OOOOOO.G.',
      'SOOHhhhhHOOS',
      '.OVVVvvVVVO.',
      '..OSSSSSSO..',
      '..OSESSSSO..',
      '..OBBBBBBO..',
      '..OCCAACCO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '..OP....PO..',
      '..OOP..POO..',
      '............',
      '............',
      '............',
    ],
    [
      'G..OOOOOO..G',
      '.SOHhhhhHOS.',
      '.OVVVvvVVVO.',
      '..OSSSSSSO..',
      '..OSESSSSO..',
      '..OBBBBBBO..',
      '..OCCAACCO..',
      '..OBbbbbBO..',
      '...OOBBOO...',
      '...OP..PO...',
      '..OOP..POO..',
      '............',
      '............',
      '............',
    ],
  ],
};

export const WORKER_SPRITES = {
  flash_worker: FLASH_WORKER_FRAMES,
  pro_architect: PRO_ARCHITECT_FRAMES,
  pixel_artist: PIXEL_ARTIST_FRAMES,
  guild_artisan: GUILD_ARTISAN_FRAMES,
};

const ACCESSORY_MATRICES = {
  cat_ears: {
    offsetY: -3,
    palette: {
      O: '#1f1024',
      E: '#f472b6',
      I: '#fbcfe8',
    },
    matrix: [
      '..OO....OO..',
      '.OEIO..OIEO.',
      '.OEEO..OEEO.',
    ],
  },
  gold_halo: {
    offsetY: -3,
    palette: {
      G: '#fde047',
      W: '#fffbeb',
    },
    matrix: [
      '...GWWWWG...',
      '..G......G..',
    ],
  },
  cyber_antenna: {
    offsetY: -3,
    palette: {
      C: '#00f5ff',
      M: '#f43f5e',
    },
    matrix: [
      '..M......C..',
      '...M....C...',
    ],
  },
};

export const OBJECT_SPRITES = {
  desk_pc: {
    palette: {
      O: '#0f172a',
      D: '#78350f',
      d: '#b45309',
      M: '#334155',
      m: '#64748b',
      S: '#0f4c5c',
      s: '#22d3ee',
      K: '#cbd5e1',
    },
    frames: [
      [
        '....OOOOOOOO....',
        '....OMmmmmMO....',
        '....OMSSSSMO....',
        '....OMSssSMO....',
        '....OMSSSSMO....',
        '....OOOOOOOO....',
        '.......OO.......',
        '.OOOOOOOOOOOOOO.',
        '.OddddddddddddO.',
        '.ODDDKKKKKKDDDO.',
        '.ODDDDDDDDDDDDO.',
        '.OO..........OO.',
        '.OO..........OO.',
      ],
      [
        '....OOOOOOOO....',
        '....OMmmmmMO....',
        '....OMSSSSMO....',
        '....OMSSssMO....',
        '....OMSSSSMO....',
        '....OOOOOOOO....',
        '.......OO.......',
        '.OOOOOOOOOOOOOO.',
        '.OddddddddddddO.',
        '.ODDDKKKKKKDDDO.',
        '.ODDDDDDDDDDDDO.',
        '.OO..........OO.',
        '.OO..........OO.',
      ],
    ],
  },
  desk_pc_active: {
    palette: {
      O: '#0f172a',
      D: '#78350f',
      d: '#b45309',
      M: '#1e293b',
      m: '#38bdf8',
      S: '#083344',
      s: '#22d3ee',
      g: '#4ade80',
      K: '#e2e8f0',
    },
    frames: [
      [
        '....OOOOOOOO....',
        '....OMmmmmMO....',
        '....OMsggSMO....',
        '....OMSsSSMO....',
        '....OMggssMO....',
        '....OOOOOOOO....',
        '.......OO.......',
        '.OOOOOOOOOOOOOO.',
        '.OddddddddddddO.',
        '.ODDDKKKKKKDDDO.',
        '.ODDDDDDDDDDDDO.',
        '.OO..........OO.',
        '.OO..........OO.',
      ],
      [
        '....OOOOOOOO....',
        '....OMmmmmMO....',
        '....OMSsSSMO....',
        '....OMggssMO....',
        '....OMsggSMO....',
        '....OOOOOOOO....',
        '.......OO.......',
        '.OOOOOOOOOOOOOO.',
        '.OddddddddddddO.',
        '.ODDDKKKKKKDDDO.',
        '.ODDDDDDDDDDDDO.',
        '.OO..........OO.',
        '.OO..........OO.',
      ],
    ],
  },
  gear: {
    palette: {
      O: '#271704',
      B: '#b45309',
      b: '#f59e0b',
      h: '#fde68a',
      C: '#451a03',
    },
    frames: [
      [
        '....OOOO....',
        '....ObbO....',
        '..OObbbbOO..',
        '.ObbhBBhbbO.',
        'OObBCCCCBbOO',
        'ObbBC..CBbbO',
        'ObbBC..CBbbO',
        'OObBCCCCBbOO',
        '.ObbhBBhbbO.',
        '..OObbbbOO..',
        '....ObbO....',
        '....OOOO....',
      ],
      [
        '.OO......OO.',
        'ObbO....ObbO',
        '.ObbOOOObbO.',
        '..ObbhBBbO..',
        '..ObCCCCbO..',
        '..ObC..CbO..',
        '..ObC..CbO..',
        '..ObCCCCbO..',
        '..ObBBhbbO..',
        '.ObbOOOObbO.',
        'ObbO....ObbO',
        '.OO......OO.',
      ],
    ],
  },
  coffee_machine: {
    palette: {
      O: '#18181b',
      M: '#dc2626',
      m: '#f87171',
      S: '#94a3b8',
      W: '#f8fafc',
      C: '#78350f',
      G: '#4ade80',
      t: '#e2e8f0',
    },
    frames: [
      [
        '....t...t...',
        '...t...t....',
        '..OOOOOOOO..',
        '.OMmmmmmmMO.',
        '.OMMMGGMMMO.',
        '.OSSSSSSSSO.',
        '.OS..OO..SO.',
        '.OS..CC..SO.',
        '.OS.WWWW.SO.',
        '.OS.WWWW.SO.',
        '.OSSSSSSSSO.',
        '.OOOOOOOOOO.',
      ],
      [
        '...t...t....',
        '....t...t...',
        '..OOOOOOOO..',
        '.OMmmmmmmMO.',
        '.OMMMGGMMMO.',
        '.OSSSSSSSSO.',
        '.OS..OO..SO.',
        '.OS..CC..SO.',
        '.OS.WWWW.SO.',
        '.OS.WWWW.SO.',
        '.OSSSSSSSSO.',
        '.OOOOOOOOOO.',
      ],
    ],
  },
  bounty_board: {
    palette: {
      O: '#1c140d',
      W: '#78350f',
      w: '#b45309',
      C: '#92400e',
      P: '#fef3c7',
      p: '#fde68a',
      R: '#ef4444',
      B: '#38bdf8',
      T: '#78350f',
    },
    frames: [
      [
        'OOOOOOOOOOOOOOOOOOOOOO',
        'OwwwwwwwwwwwwwwwwwwwwO',
        'OwCCCCCCCCCCCCCCCCCCwO',
        'OwC.RPPP..BPPP..RPP.wO',
        'OwC.PppP..PppP..PpP.wO',
        'OwC.PppP..PPPP..PpP.wO',
        'OwC.PPPP..C..C..PPP.wO',
        'OwC..C.RPPPP..BPPP..wO',
        'OwC....PpppP..PppP..wO',
        'OwC....PPPPP..PPPP..wO',
        'OwCCCCCCCCCCCCCCCCCCwO',
        'OwwwwwwwwwwwwwwwwwwwwO',
        'OOOOOOOOOOOOOOOOOOOOOO',
        '..OO..............OO..',
        '..OO..............OO..',
      ],
      [
        'OOOOOOOOOOOOOOOOOOOOOO',
        'OwwwwwwwwwwwwwwwwwwwwO',
        'OwCCCCCCCCCCCCCCCCCCwO',
        'OwC.RPPP..BPPP..RPP.wO',
        'OwC.PppP..PppP..PpP.wO',
        'OwC.PppP..PPPP..PpP.wO',
        'OwC.PPPP..C..C..PPP.wO',
        'OwC..C.RPPPP..BPPP..wO',
        'OwC....PpppP..PppP..wO',
        'OwC....PPPPP..PPpP..wO',
        'OwCCCCCCCCCCCCCCCCCCwO',
        'OwwwwwwwwwwwwwwwwwwwwO',
        'OOOOOOOOOOOOOOOOOOOOOO',
        '..OO..............OO..',
        '..OO..............OO..',
      ],
    ],
  },
  potted_tree: {
    palette: {
      O: '#0f172a',
      L: '#15803d',
      l: '#22c55e',
      h: '#86efac',
      T: '#78350f',
      P: '#c2410c',
      p: '#ea580c',
    },
    frames: [
      [
        '....OOOO....',
        '..OOlhhLOO..',
        '.OllhllllLO.',
        '.OlhllllLLO.',
        '.OllllLLLLO.',
        '..OLLLLLLO..',
        '...OOTTOO...',
        '....OTTO....',
        '..OOPppPOO..',
        '...OPPPPO...',
        '...OPPPPO...',
        '....OOOO....',
      ],
      [
        '....OOOO....',
        '..OOlhhlOO..',
        '.OllhllllLO.',
        '.OlllllllLO.',
        '.OllllLLLLO.',
        '..OLLLLLLO..',
        '...OOTTOO...',
        '....OTTO....',
        '..OOPppPOO..',
        '...OPPPPO...',
        '...OPPPPO...',
        '....OOOO....',
      ],
    ],
  },
  coin: {
    palette: {
      O: '#451a03',
      G: '#f59e0b',
      g: '#fde047',
      W: '#fffbeb',
    },
    frames: [
      [
        '..OOOO..',
        '.OGggGO.',
        'OGgWWgGO',
        'OGgWWgGO',
        'OGgGGgGO',
        'OGgGGgGO',
        '.OGggGO.',
        '..OOOO..',
      ],
      [
        '...OO...',
        '..OGgO..',
        '.OGWgGO.',
        '.OGWgGO.',
        '.OGGgGO.',
        '.OGGgGO.',
        '..OGgO..',
        '...OO...',
      ],
      [
        '...OO...',
        '...OgO..',
        '...OWO..',
        '...OWO..',
        '...OGO..',
        '...OGO..',
        '...OgO..',
        '...OO...',
      ],
      [
        '...OO...',
        '..OGgO..',
        '.OGgWGO.',
        '.OGgWGO.',
        '.OGgGGO.',
        '.OGgGGO.',
        '..OGgO..',
        '...OO...',
      ],
    ],
  },
  server_rack: {
    palette: {
      O: '#09090b',
      M: '#1e293b',
      m: '#334155',
      G: '#22c55e',
      C: '#22d3ee',
      A: '#f59e0b',
      R: '#ef4444',
    },
    frames: [
      [
        '.OOOOOOOOOO.',
        '.OMmmmmmmMO.',
        '.OMGC..mMMO.',
        '.OMmmmmmmMO.',
        '.OMCG..mMMO.',
        '.OMmmmmmmMO.',
        '.OMGA..mMMO.',
        '.OMmmmmmmMO.',
        '.OMCC..mMMO.',
        '.OMmmmmmmMO.',
        '.OMMMMMMMMO.',
        '.OOOOOOOOOO.',
      ],
      [
        '.OOOOOOOOOO.',
        '.OMmmmmmmMO.',
        '.OMCG..mMMO.',
        '.OMmmmmmmMO.',
        '.OMGC..mMMO.',
        '.OMmmmmmmMO.',
        '.OMAG..mMMO.',
        '.OMmmmmmmMO.',
        '.OMGC..mMMO.',
        '.OMmmmmmmMO.',
        '.OMMMMMMMMO.',
        '.OOOOOOOOOO.',
      ],
    ],
  },
  sofa: {
    palette: {
      O: '#1e1b4b',
      S: '#6366f1',
      s: '#818cf8',
      D: '#4338ca',
      W: '#78350f',
    },
    frames: [
      [
        '..OOOOOOOOOOOOOOOOOO..',
        '.OSssssssssssssssssSO.',
        'OOSDDDDDDDDDDDDDDDDSOO',
        'OSsSSsSSsSSsSSsSSsSSsO',
        'OSsSSSSSSSSSSSSSSSSSsO',
        'OSsDDDDDDDDDDDDDDDDDsO',
        'OODDDDDDDDDDDDDDDDDDOO',
        '.OWO..............OWO.',
        '.OOO..............OOO.',
      ],
    ],
  },
  charge_pad: {
    palette: {
      O: '#0f172a',
      M: '#334155',
      C: '#06b6d4',
      c: '#67e8f9',
    },
    frames: [
      [
        '..OOOOOOOOOO..',
        '.OMMMMMMMMMMO.',
        'OMMCCCCCCCCMMO',
        'OMMCccccccCMMO',
        'OMMCCCCCCCCMMO',
        '.OMMMMMMMMMMO.',
        '..OOOOOOOOOO..',
      ],
      [
        '..OOOOOOOOOO..',
        '.OMMMMMMMMMMO.',
        'OMMccccccccMMO',
        'OMMcCCCCCCcMMO',
        'OMMccccccccMMO',
        '.OMMMMMMMMMMO.',
        '..OOOOOOOOOO..',
      ],
    ],
  },
  trophy_banner: {
    palette: {
      O: '#1c140d',
      R: '#b91c1c',
      r: '#ef4444',
      G: '#fbbf24',
      g: '#fef08a',
      W: '#78350f',
    },
    frames: [
      [
        'OWWWWWWWWO',
        '.ORrrrrRO.',
        '.ORrGGrRO.',
        '.ORgGGgRO.',
        '.ORrGGrRO.',
        '.ORrrrrRO.',
        '..ORrrRO..',
        '...ORRO...',
        '....OO....',
      ],
      [
        'OWWWWWWWWO',
        '.ORrrrrRO.',
        '.ORrGGrRO.',
        '.ORgGGgRO.',
        '.ORrGGrRO.',
        '..ORrrrRO.',
        '...ORrrRO.',
        '....ORRO..',
        '.....OO...',
      ],
    ],
  },
  neon_server_rack: {
    palette: {
      O: '#09090b',
      M: '#1e1b4b',
      m: '#312e81',
      C: '#00f5ff',
      P: '#f472b6',
      G: '#4ade80',
      W: '#ffffff',
    },
    frames: [
      [
        '.OCCCCCCCCO.',
        '.OMmmmmmmMO.',
        '.OMCW..PPMO.',
        '.OMmmmmmmMO.',
        '.OMPP..CCMO.',
        '.OMmmmmmmMO.',
        '.OMGW..PPMO.',
        '.OMmmmmmmMO.',
        '.OMCC..GGMO.',
        '.OMmmmmmmMO.',
        '.OPPPPPPPPO.',
        '.OOOOOOOOOO.',
      ],
      [
        '.OPPPPPPPPO.',
        '.OMmmmmmmMO.',
        '.OMPP..CWMO.',
        '.OMmmmmmmMO.',
        '.OMCC..PPMO.',
        '.OMmmmmmmMO.',
        '.OMPP..GWMO.',
        '.OMmmmmmmMO.',
        '.OMGG..CCMO.',
        '.OMmmmmmmMO.',
        '.OCCCCCCCCO.',
        '.OOOOOOOOOO.',
      ],
    ],
  },
  gold_espresso: {
    palette: {
      O: '#271704',
      G: '#d97706',
      g: '#fbbf24',
      h: '#fef08a',
      S: '#f8fafc',
      C: '#78350f',
      E: '#22c55e',
      t: '#e2e8f0',
    },
    frames: [
      [
        '...t..t..t....',
        '....t..t..t...',
        '..OOOOOOOOOO..',
        '.OGhhggggggGO.',
        '.OGGGEGGGEGGO.',
        '.OSSSSSSSSSSO.',
        '.OS..OOOO..SO.',
        '.OS..CCCC..SO.',
        '.OS.SSSSSS.SO.',
        '.OS.SggggS.SO.',
        '.OggggggggggO.',
        '.OOOOOOOOOOOO.',
      ],
      [
        '....t..t..t...',
        '...t..t..t....',
        '..OOOOOOOOOO..',
        '.OGggggghhgGO.',
        '.OGGGEGGGEGGO.',
        '.OSSSSSSSSSSO.',
        '.OS..OOOO..SO.',
        '.OS..CCCC..SO.',
        '.OS.SSSSSS.SO.',
        '.OS.SggggS.SO.',
        '.OggggggggggO.',
        '.OOOOOOOOOOOO.',
      ],
    ],
  },
  sleeping_cat: {
    palette: {
      O: '#271704',
      C: '#f59e0b',
      c: '#fde68a',
      S: '#b45309',
      P: '#f472b6',
      Z: '#67e8f9',
    },
    frames: [
      [
        '.........Z..',
        '....OO.OO...',
        '..OOCcOcCOO.',
        '.OCCcCCCcCCO',
        'OCCSSCCCcPCO',
        'OCcCCCCCCcCO',
        '.OOOOOOOOOO.',
      ],
      [
        '..........Z.',
        '....OO.OO...',
        '..OOCcOcCOO.',
        '.OCcCCCCcCCO',
        'OCCSSCCCcPCO',
        'OCcCCCCCCcCO',
        '.OOOOOOOOOO.',
      ],
    ],
  },
  genesis_trophy: {
    palette: {
      O: '#1e1b4b',
      G: '#f59e0b',
      g: '#fde047',
      W: '#fffbeb',
      B: '#334155',
      b: '#64748b',
      C: '#22d3ee',
    },
    frames: [
      [
        '.W........W.',
        '..OOOOOOOO..',
        '.OGgWWWWgGO.',
        'OGOgGGGGgOGO',
        '.O.OgGGgO.O.',
        '...OOGGOO...',
        '....OGGO....',
        '...OOGGOO...',
        '..ObbbbbbO..',
        '.OBBCWWCBBO.',
        '.OBBBBBBBBO.',
        '.OOOOOOOOOO.',
      ],
      [
        '....W..W....',
        '..OOOOOOOO..',
        '.OGgWWWWgGO.',
        'OGOgGWGGgOGO',
        '.O.OgGGgO.O.',
        '...OOGGOO...',
        '....OGGO....',
        '...OOGGOO...',
        '..ObbbbbbO..',
        '.OBBCGGCBBO.',
        '.OBBBBBBBBO.',
        '.OOOOOOOOOO.',
      ],
    ],
  },
};

/**
 * Core Pixel Matrix Renderer.
 */
export function drawPixelMatrix(ctx, matrix, palette, x, y, scale = 1, flipX = false) {
  if (!matrix || !matrix.length) return;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const baseX = Math.round(x);
  const baseY = Math.round(y);
  const s = Math.max(1, scale);

  for (let r = 0; r < rows; r++) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      const drawCol = flipX ? cols - 1 - c : c;
      ctx.fillRect(baseX + drawCol * s, baseY + r * s, s, s);
    }
  }
}

/**
 * Legacy 12x14 worker sprite renderer (preserved for 100% backward compatibility).
 */
export function drawWorkerSprite(
  ctx,
  roleClass = 'flash_worker',
  skinId = 'default',
  animState = 'idle',
  frameIndex = 0,
  x = 0,
  y = 0,
  scale = 1,
  flipX = false
) {
  const roleFrames = WORKER_SPRITES[roleClass] || WORKER_SPRITES.flash_worker;
  const frames = roleFrames[animState] || roleFrames.idle;
  const matrix = frames[Math.abs(Math.floor(frameIndex)) % frames.length];
  const palette = getWorkerPalette(roleClass, skinId);

  const width = matrix[0].length * scale;
  const height = matrix.length * scale;
  const drawX = Math.round(x - width / 2);
  const drawY = Math.round(y - height);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.fillRect(
    Math.round(x - 4 * scale),
    Math.round(y - 1 * scale),
    Math.round(8 * scale),
    Math.round(2 * scale)
  );

  drawPixelMatrix(ctx, matrix, palette, drawX, drawY, scale, flipX);

  const skin = SKIN_PALETTES[skinId];
  if (skin && skin.accessory && ACCESSORY_MATRICES[skin.accessory]) {
    const acc = ACCESSORY_MATRICES[skin.accessory];
    const accBob = animState === 'idle' && frameIndex % 2 === 1 ? 1 : 0;
    const accY = drawY + (acc.offsetY + accBob) * scale;
    drawPixelMatrix(ctx, acc.matrix, acc.palette, drawX, accY, scale, flipX);
  }
}

/**
 * Legacy named object sprite renderer (preserved for 100% backward compatibility).
 */
export function drawObjectSprite(ctx, name, x, y, scale = 1, frameIndex = 0, flipX = false) {
  const obj = OBJECT_SPRITES[name];
  if (!obj) return;
  const matrix = obj.frames[Math.abs(Math.floor(frameIndex)) % obj.frames.length];
  drawPixelMatrix(ctx, matrix, obj.palette, x, y, scale, flipX);
}
