/**
 * PixelCompute Town — Pixel Town Game Engine (HTML5 Canvas)
 * Logical Resolution: 540 x 340, crisp nearest-neighbor pixel rendering.
 * Zero-dependency ES Module.
 */

import {
  drawWorkerSprite,
  drawObjectSprite,
  WORKER_ROLE_META,
} from './sprites.js';

export const LOGICAL_W = 540;
export const LOGICAL_H = 340;

const BUILDINGS = {
  factory: {
    id: 'factory',
    label: '🏭 自動工坊',
    subtitle: 'API 微任務流水線',
    x: 14,
    y: 24,
    w: 172,
    h: 122,
    doorNode: 'door_factory',
    hubNode: 'in_factory',
    accent: '#22d3ee',
    seats: [
      { x: 66, y: 92, deskX: 58, deskY: 66 },
      { x: 128, y: 92, deskX: 120, deskY: 66 },
      { x: 66, y: 132, deskX: 58, deskY: 106 },
      { x: 128, y: 132, deskX: 120, deskY: 106 },
    ],
  },
  guild: {
    id: 'guild',
    label: '⚔️ 懸賞工會',
    subtitle: '月/週額度大單',
    x: 354,
    y: 24,
    w: 172,
    h: 122,
    doorNode: 'door_guild',
    hubNode: 'in_guild',
    accent: '#f59e0b',
    seats: [
      { x: 392, y: 98, deskX: 384, deskY: 72 },
      { x: 444, y: 130, deskX: 436, deskY: 104 },
      { x: 496, y: 98, deskX: 488, deskY: 72 },
    ],
  },
  lounge: {
    id: 'lounge',
    label: '☕ 算力宿舍',
    subtitle: '咖啡回血 & 充電',
    x: 14,
    y: 202,
    w: 172,
    h: 122,
    doorNode: 'door_lounge',
    hubNode: 'in_lounge',
    accent: '#f472b6',
    spots: [
      { x: 48, y: 262, kind: 'coffee' },
      { x: 104, y: 262, kind: 'sofa' },
      { x: 48, y: 302, kind: 'pad' },
      { x: 96, y: 302, kind: 'pad' },
      { x: 144, y: 302, kind: 'pad' },
    ],
  },
  launchpad: {
    id: 'launchpad',
    label: '🚀 孵化廣場',
    subtitle: '項目建造 & 上線',
    x: 354,
    y: 202,
    w: 172,
    h: 122,
    doorNode: 'door_launchpad',
    hubNode: 'in_launchpad',
    accent: '#a855f7',
    spots: [
      { x: 384, y: 278 },
      { x: 384, y: 306 },
    ],
  },
};

const WAYPOINTS = {
  plaza_c: { x: 270, y: 178, neighbors: ['plaza_nw', 'plaza_ne', 'plaza_sw', 'plaza_se'] },
  plaza_nw: { x: 204, y: 152, neighbors: ['plaza_c', 'plaza_ne', 'plaza_sw', 'door_factory'] },
  plaza_ne: { x: 336, y: 152, neighbors: ['plaza_c', 'plaza_nw', 'plaza_se', 'door_guild'] },
  plaza_sw: { x: 204, y: 198, neighbors: ['plaza_c', 'plaza_nw', 'plaza_se', 'door_lounge'] },
  plaza_se: { x: 336, y: 198, neighbors: ['plaza_c', 'plaza_ne', 'plaza_sw', 'door_launchpad'] },
  door_factory: { x: 162, y: 148, neighbors: ['plaza_nw', 'in_factory'] },
  in_factory: { x: 156, y: 112, neighbors: ['door_factory'] },
  door_guild: { x: 378, y: 148, neighbors: ['plaza_ne', 'in_guild'] },
  in_guild: { x: 384, y: 112, neighbors: ['door_guild'] },
  door_lounge: { x: 162, y: 200, neighbors: ['plaza_sw', 'in_lounge'] },
  in_lounge: { x: 152, y: 274, neighbors: ['door_lounge'] },
  door_launchpad: { x: 378, y: 200, neighbors: ['plaza_se', 'in_launchpad'] },
  in_launchpad: { x: 388, y: 274, neighbors: ['door_launchpad'] },
};

const API_WORK_BUBBLES = [
  '呼叫 Gemini Flash...',
  '撰寫單元測試...',
  '產出 i18n JSON...',
  '自動驗收校驗中...',
  '打包微任務交付...',
];

const GUILD_WORK_BUBBLES = [
  '本機 CLI 同步中...',
  '設計核心模組...',
  '撰寫 PR Diff...',
  '排查邊界條件...',
  '檢查測試覆蓋率...',
];

const IDLE_BUBBLES = [
  '☕ 喝杯像素拿鐵',
  '⚡ 算力充電中...',
  '✨ 隨時準備接單',
  '👀 看看廣告招牌',
];

const THEMES = {
  night: {
    skyTop: '#0b1024',
    skyBottom: '#161e3a',
    ground: '#151b2e',
    groundAlt: '#1a2238',
    road: '#232c45',
    roadTrim: '#334163',
    plazaA: '#26304c',
    plazaB: '#2d395a',
    plazaBorder: '#475985',
    factoryRoof: '#7c3f1d',
    factoryRoofLight: '#b45309',
    factoryFloor: '#172233',
    guildRoof: '#7f1d1d',
    guildRoofLight: '#b91c1c',
    guildFloor: '#2a1d17',
    loungeRoof: '#115e59',
    loungeRoofLight: '#0f766e',
    loungeFloor: '#241e2e',
    launchFloor: '#181c30',
    wallBorder: '#090d1a',
    textMain: '#f8fafc',
    textDim: '#94a3b8',
    ambientOverlay: null,
  },
  day: {
    skyTop: '#38bdf8',
    skyBottom: '#bae6fd',
    ground: '#5b8c5a',
    groundAlt: '#689b66',
    road: '#c9bfa7',
    roadTrim: '#a89b82',
    plazaA: '#e7dec8',
    plazaB: '#dcd0b4',
    plazaBorder: '#b2a384',
    factoryRoof: '#9a4d22',
    factoryRoofLight: '#d97706',
    factoryFloor: '#cbd5e1',
    guildRoof: '#991b1b',
    guildRoofLight: '#dc2626',
    guildFloor: '#d6bc99',
    loungeRoof: '#0f766e',
    loungeRoofLight: '#14b8a6',
    loungeFloor: '#eadbc8',
    launchFloor: '#cbd5e1',
    wallBorder: '#1e293b',
    textMain: '#0f172a',
    textDim: '#475569',
    ambientOverlay: null,
  },
};

function bfsWaypoints(startNode, endNode) {
  if (!startNode || !endNode) return [];
  if (startNode === endNode) return [WAYPOINTS[endNode]];
  const queue = [[startNode]];
  const visited = new Set([startNode]);
  while (queue.length > 0) {
    const path = queue.shift();
    const curr = path[path.length - 1];
    const node = WAYPOINTS[curr];
    if (!node) continue;
    for (const next of node.neighbors) {
      if (next === endNode) {
        return [...path, next].map((id) => ({ x: WAYPOINTS[id].x, y: WAYPOINTS[id].y, nodeId: id }));
      }
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return [];
}

function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

function truncateText(text, maxChars) {
  if (!text) return '';
  const str = String(text);
  return str.length > maxChars ? `${str.slice(0, maxChars - 1)}…` : str;
}

export class PixelTownEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ onSelectBuilding?: (id: string) => void, onSelectWorker?: (id: string) => void }} callbacks
   */
  constructor(canvas, callbacks = {}) {
    if (!canvas) {
      throw new Error('PixelTownEngine requires a valid <canvas> element');
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.callbacks = callbacks || {};

    this.dayNight = 'night';
    this.destroyed = false;
    this.time = 0;
    this.lastFrameTs = 0;
    this.rafId = null;

    // World state snapshot
    this.state = {
      workers: [],
      projects: [],
      tasks: [],
    };

    // Animated worker agents keyed by workerId
    this.agents = new Map();
    this.selectedBuildingId = null;
    this.selectedWorkerId = null;
    this.hoveredBuildingId = null;
    this.hoveredWorkerId = null;

    // Visual effects
    this.floatingTexts = [];
    this.coinParticles = [];
    this.fireworkRockets = [];
    this.fireworkSparks = [];
    this.dataParticles = [];
    this.launchBannerTimer = 0;
    this.launchBannerText = '';
    this.ambientFlash = 0;

    // Billboard scrolling state
    this.marqueeOffset = 0;

    // Decorative stars / fireflies (deterministic pseudo-random)
    this.stars = Array.from({ length: 34 }, (_, i) => ({
      x: (i * 53 + 17) % LOGICAL_W,
      y: (i * 19 + 4) % 22,
      phase: i * 0.7,
      size: i % 5 === 0 ? 2 : 1,
    }));
    this.fireflies = Array.from({ length: 12 }, (_, i) => ({
      baseX: 192 + ((i * 41) % 156),
      baseY: 112 + ((i * 29) % 120),
      phase: i * 1.13,
      speed: 0.7 + (i % 4) * 0.25,
    }));

    // Offscreen logical buffer for razor-sharp pixel art scaling
    this.buffer = document.createElement('canvas');
    this.buffer.width = LOGICAL_W;
    this.buffer.height = LOGICAL_H;
    this.bctx = this.buffer.getContext('2d', { alpha: false });
    this.bctx.imageSmoothingEnabled = false;

    // Viewport transform cache for pointer hit-testing
    this.viewRect = { x: 0, y: 0, w: LOGICAL_W, h: LOGICAL_H, scale: 1 };

    // Bind events
    this._onResize = this._resize.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerLeave = this._handlePointerLeave.bind(this);
    this._onClick = this._handleClick.bind(this);

    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerleave', this._onPointerLeave);
    this.canvas.addEventListener('click', this._onClick);

    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this._resizeObserver = new ResizeObserver(() => this._resize());
      this._resizeObserver.observe(this.canvas.parentElement);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._onResize);
    }

    this._resize();
    this._startLoop();
  }

  // ---------------------------------------------------------------------------
  // Public Contract API
  // ---------------------------------------------------------------------------

  setDayNight(mode) {
    this.dayNight = mode === 'day' ? 'day' : 'night';
  }

  syncState(state) {
    if (!state || typeof state !== 'object') return;
    const raw = state.state && Array.isArray(state.state.workers) ? state.state : state;

    this.state = {
      workers: Array.isArray(raw.workers) ? raw.workers : [],
      projects: Array.isArray(raw.projects) ? raw.projects : [],
      tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    };

    const activeIds = new Set();
    const occupiedFactorySeats = new Set();
    const occupiedGuildSeats = new Set();

    // First pass: keep existing seat reservations for still-working agents
    for (const w of this.state.workers) {
      activeIds.add(w.id);
      const existing = this.agents.get(w.id);
      if (existing && this._isWorkerBusy(w)) {
        if (existing.seatBuilding === 'factory' && existing.seatIndex != null) {
          occupiedFactorySeats.add(existing.seatIndex);
        }
        if (existing.seatBuilding === 'guild' && existing.seatIndex != null) {
          occupiedGuildSeats.add(existing.seatIndex);
        }
      }
    }

    // Remove deleted workers
    for (const id of Array.from(this.agents.keys())) {
      if (!activeIds.has(id)) {
        this.agents.delete(id);
      }
    }

    // Upsert agents
    this.state.workers.forEach((w, idx) => {
      let agent = this.agents.get(w.id);
      const busy = this._isWorkerBusy(w);
      const targetBuilding = this._getWorkBuildingForWorker(w);

      if (!agent) {
        const startSpot = busy
          ? this._claimSeat(targetBuilding, occupiedFactorySeats, occupiedGuildSeats, idx)
          : this._getLoungeSpot(idx);

        agent = {
          id: w.id,
          name: w.name || w.id,
          roleClass: w.roleClass || 'flash_worker',
          skinId: w.skin || w.skinId || 'default',
          track: w.track || 'api',
          level: w.level || 1,
          x: startSpot.x,
          y: startSpot.y,
          flipX: false,
          zone: busy ? targetBuilding : 'lounge',
          seatBuilding: busy ? targetBuilding : null,
          seatIndex: busy ? startSpot.seatIndex : null,
          path: [],
          anim: busy ? 'work' : 'idle',
          speed: 44 + (idx % 3) * 5,
          celebrateTimer: 0,
          bubbleText: '',
          bubbleTimer: 0,
          bubbleStyle: 'normal',
          nextAmbientBubble: 2 + (idx * 1.7) % 5,
          wanderTimer: 4 + (idx * 2.3) % 6,
          taskTitle: this._findWorkerTaskTitle(w),
          cliTimer: 0,
        };
        this.agents.set(w.id, agent);
      } else {
        agent.name = w.name || agent.name;
        agent.roleClass = w.roleClass || agent.roleClass;
        agent.skinId = w.skin || w.skinId || 'default';
        agent.track = w.track || agent.track;
        agent.level = w.level || agent.level;
        agent.taskTitle = this._findWorkerTaskTitle(w);

        if (busy && agent.seatBuilding !== targetBuilding) {
          const seat = this._claimSeat(targetBuilding, occupiedFactorySeats, occupiedGuildSeats, idx);
          agent.seatBuilding = targetBuilding;
          agent.seatIndex = seat.seatIndex;
          this._routeAgentTo(agent, targetBuilding, seat.x, seat.y);
        } else if (!busy && agent.seatBuilding !== null && agent.cliTimer <= 0) {
          agent.seatBuilding = null;
          agent.seatIndex = null;
          const spot = this._getLoungeSpot(idx);
          this._routeAgentTo(agent, 'lounge', spot.x, spot.y);
        }
      }
    });
  }

  triggerWorkerDispatch(workerId, task = null, project = null) {
    const agent = this.agents.get(workerId);
    if (!agent) return;

    const isGuild =
      (task && (task.track === 'guild_bounty' || task.track === 'quota')) ||
      agent.track === 'quota' ||
      agent.roleClass === 'pro_architect' ||
      agent.roleClass === 'guild_artisan';

    const buildingId = isGuild ? 'guild' : 'factory';
    const seat = this._findFreeSeat(buildingId, workerId);
    agent.seatBuilding = buildingId;
    agent.seatIndex = seat.seatIndex;
    agent.taskTitle = (task && task.title) || agent.taskTitle || '';
    agent.celebrateTimer = 0;

    this._routeAgentTo(agent, buildingId, seat.x, seat.y);

    const shortTitle = task && task.title ? truncateText(task.title, 14) : isGuild ? '接取工會懸賞!' : '前往工坊開工!';
    const projHint = project && project.name ? ` [${truncateText(project.name, 8)}]` : '';
    this._setBubble(agent, `🚀 ${shortTitle}${projHint}`, 4.2, 'dispatch');
  }

  triggerTaskComplete(workerId, rewards = {}) {
    const agent = this.agents.get(workerId);
    const originX = agent ? agent.x : 270;
    const originY = agent ? agent.y - 16 : 165;

    if (agent) {
      agent.celebrateTimer = 2.8;
      agent.anim = 'celebrate';
      agent.cliTimer = 0;
      this._setBubble(agent, '🎉 驗收通過！', 2.8, 'success');
    }

    const gold = rewards.gold ?? rewards.goldReward ?? 0;
    const pts = rewards.contributionPoints ?? rewards.points ?? 0;
    const usd =
      rewards.bountyNetUsd ??
      rewards.usd ??
      rewards.cashUsd ??
      rewards.bountyUsd ??
      rewards.netBountyUsd ??
      0;

    let offsetY = 0;
    if (gold > 0) {
      this._spawnFloatingText(originX, originY - offsetY, `+${gold}G`, '#fde047');
      offsetY += 12;
    }
    if (pts > 0) {
      this._spawnFloatingText(originX, originY - offsetY, `+${pts} 貢獻點`, '#38bdf8');
      offsetY += 12;
    }
    if (usd > 0) {
      this._spawnFloatingText(originX, originY - offsetY, `+$${Number(usd).toFixed(2)}`, '#4ade80');
      offsetY += 12;
    }
    if (offsetY === 0) {
      this._spawnFloatingText(originX, originY, '✔ 驗收通過!', '#4ade80');
    }

    // Burst spinning pixel gold coins
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const spd = 28 + Math.random() * 44;
      this.coinParticles.push({
        x: originX,
        y: originY + 4,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 20,
        life: 1.1 + Math.random() * 0.5,
        maxLife: 1.6,
        frame: i % 4,
      });
    }
  }

  triggerProjectLaunch(projectId) {
    const proj = this.state.projects.find((p) => p.id === projectId);
    const title = proj ? truncateText(proj.name, 16) : '新項目';
    this.launchBannerText = `🚀 ${title} 正式上線！分紅結算中！`;
    this.launchBannerTimer = 5.5;
    this.ambientFlash = 0.65;

    // Make all workers cheer
    for (const agent of this.agents.values()) {
      agent.celebrateTimer = 3.4;
      this._setBubble(agent, '🎆 上線啦！分紅！', 3.2, 'success');
    }

    // Schedule wave of pixel fireworks across the sky & launchpad
    const paletteSet = [
      ['#22d3ee', '#67e8f9', '#ffffff'],
      ['#f472b6', '#fbcfe8', '#fde047'],
      ['#a855f7', '#e879f9', '#38bdf8'],
      ['#fbbf24', '#fef08a', '#fb7185'],
      ['#4ade80', '#22d3ee', '#ffffff'],
    ];
    for (let i = 0; i < 14; i++) {
      const startX = i % 3 === 0 ? 440 + (Math.random() - 0.5) * 60 : 60 + Math.random() * 420;
      const targetY = 34 + Math.random() * 115;
      this.fireworkRockets.push({
        delay: i * 0.28 + Math.random() * 0.12,
        x: startX,
        y: LOGICAL_H - 18,
        vx: (Math.random() - 0.5) * 24,
        vy: -(165 + Math.random() * 55),
        targetY,
        colors: paletteSet[i % paletteSet.length],
        launched: false,
      });
    }
  }

  triggerCliActivity(workerId, message = '本機 CLI 同步中...') {
    let agent = this.agents.get(workerId);
    if (!agent && this.agents.size > 0) {
      // Fallback to first quota worker if workerId isn't matched yet
      for (const a of this.agents.values()) {
        if (a.track === 'quota' || a.roleClass === 'pro_architect' || a.roleClass === 'guild_artisan') {
          agent = a;
          break;
        }
      }
      if (!agent) agent = this.agents.values().next().value;
    }
    if (!agent) return;

    agent.cliTimer = 8.0;
    if (agent.seatBuilding !== 'guild') {
      const seat = this._findFreeSeat('guild', agent.id);
      agent.seatBuilding = 'guild';
      agent.seatIndex = seat.seatIndex;
      this._routeAgentTo(agent, 'guild', seat.x, seat.y);
    }

    const text = truncateText(message || '本機 CLI 同步中...', 18);
    this._setBubble(agent, `> ${text}`, 4.5, 'cli');

    // Emerald terminal data particles rising from worker
    for (let i = 0; i < 7; i++) {
      this.dataParticles.push({
        x: agent.x + (Math.random() - 0.5) * 14,
        y: agent.y - 10 - Math.random() * 6,
        vy: -(14 + Math.random() * 18),
        vx: (Math.random() - 0.5) * 8,
        color: i % 2 === 0 ? '#4ade80' : '#22d3ee',
        life: 0.9 + Math.random() * 0.5,
        maxLife: 1.4,
      });
    }
  }

  destroy() {
    this.destroyed = true;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerleave', this._onPointerLeave);
    this.canvas.removeEventListener('click', this._onClick);
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    } else if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._onResize);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal State & Pathfinding Helpers
  // ---------------------------------------------------------------------------

  _isWorkerBusy(worker) {
    if (!worker) return false;
    return (
      worker.status === 'working' ||
      worker.status === 'busy' ||
      Boolean(worker.currentTaskId)
    );
  }

  _getWorkBuildingForWorker(worker) {
    if (!worker) return 'factory';
    if (worker.currentTaskId && this.state.tasks.length) {
      const task = this.state.tasks.find((t) => t.id === worker.currentTaskId);
      if (task) {
        if (task.track === 'guild_bounty' || task.track === 'quota') return 'guild';
        if (task.track === 'api_auto' || task.track === 'api') return 'factory';
      }
    }
    if (
      worker.track === 'quota' ||
      worker.roleClass === 'pro_architect' ||
      worker.roleClass === 'guild_artisan'
    ) {
      return 'guild';
    }
    return 'factory';
  }

  _findWorkerTaskTitle(worker) {
    if (!worker || !worker.currentTaskId) return '';
    const task = this.state.tasks.find((t) => t.id === worker.currentTaskId);
    return task ? task.title : '';
  }

  _claimSeat(buildingId, occFactory, occGuild, fallbackIdx) {
    const b = BUILDINGS[buildingId] || BUILDINGS.factory;
    const occ = buildingId === 'guild' ? occGuild : occFactory;
    let chosen = fallbackIdx % b.seats.length;
    for (let i = 0; i < b.seats.length; i++) {
      if (!occ.has(i)) {
        chosen = i;
        break;
      }
    }
    occ.add(chosen);
    return { ...b.seats[chosen], seatIndex: chosen };
  }

  _findFreeSeat(buildingId, excludeWorkerId) {
    const b = BUILDINGS[buildingId] || BUILDINGS.factory;
    const used = new Set();
    for (const [id, ag] of this.agents.entries()) {
      if (id !== excludeWorkerId && ag.seatBuilding === buildingId && ag.seatIndex != null) {
        used.add(ag.seatIndex);
      }
    }
    for (let i = 0; i < b.seats.length; i++) {
      if (!used.has(i)) {
        return { ...b.seats[i], seatIndex: i };
      }
    }
    const idx = Math.floor(Math.random() * b.seats.length);
    return { ...b.seats[idx], seatIndex: idx };
  }

  _getLoungeSpot(index) {
    const spots = BUILDINGS.lounge.spots;
    return spots[Math.abs(index) % spots.length];
  }

  _getNearestWaypointForAgent(agent) {
    if (agent.zone && BUILDINGS[agent.zone]) {
      return BUILDINGS[agent.zone].hubNode;
    }
    let bestId = 'plaza_c';
    let bestDist = Infinity;
    for (const [id, wp] of Object.entries(WAYPOINTS)) {
      if (id.startsWith('in_')) continue;
      const d = Math.hypot(wp.x - agent.x, wp.y - agent.y);
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    return bestId;
  }

  _routeAgentTo(agent, targetZone, destX, destY) {
    if (agent.zone === targetZone) {
      agent.path = [{ x: destX, y: destY, finalZone: targetZone }];
      return;
    }
    const startNode = this._getNearestWaypointForAgent(agent);
    const endNode = BUILDINGS[targetZone] ? BUILDINGS[targetZone].hubNode : 'plaza_c';
    const route = bfsWaypoints(startNode, endNode);
    route.push({ x: destX, y: destY, finalZone: targetZone });
    agent.path = route;
  }

  _setBubble(agent, text, duration = 3.5, style = 'normal') {
    agent.bubbleText = text;
    agent.bubbleTimer = duration;
    agent.bubbleStyle = style;
  }

  _spawnFloatingText(x, y, text, color) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      vy: -18,
      life: 1.9,
      maxLife: 1.9,
    });
  }

  _getFeaturedProject() {
    const projects = this.state.projects || [];
    if (!projects.length) {
      return {
        name: '像素算力鎮 v1.0',
        status: 'building',
        progressPct: 60,
      };
    }
    const launched = projects.find((p) => p.status === 'launched' || (p.progressPct ?? 0) >= 100);
    if (launched) return launched;
    const building = projects
      .filter((p) => p.status === 'building')
      .sort((a, b) => (b.progressPct ?? 0) - (a.progressPct ?? 0));
    if (building.length) return building[0];
    return projects[0];
  }

  _getBillboardTicker() {
    const projects = this.state.projects || [];
    const sponsored = projects.filter((p) => p.sponsoredBillboard);
    const launched = projects.filter((p) => p.status === 'launched');
    const items = [];

    for (const p of sponsored) {
      const promo = p.billboardText
        ? p.billboardText
        : `★ 贊助強推: ${p.name} (${p.progressPct ?? 0}%) ★`;
      items.push(promo);
    }
    for (const p of launched) {
      const rev = p.totalRevenueUsd != null ? ` · 累計營收 $${p.totalRevenueUsd}` : '';
      items.push(`🚀 榮耀上線: ${p.name}${rev}`);
    }

    if (items.length === 0) {
      const building = projects.find((p) => p.status === 'building');
      if (building) {
        items.push(`🔥 孵化衝刺中: ${building.name} (${building.progressPct ?? 0}%)`);
      }
      items.push('⚡ PIXELCOMPUTE TOWN · 閒置算力共建產品共享分紅 ⚡');
    }

    return {
      isSponsored: sponsored.length > 0,
      isLaunched: launched.length > 0,
      text: items.join('   ◆   ') + '   ◆   ',
    };
  }

  // ---------------------------------------------------------------------------
  // Canvas Sizing & Pointer Interaction
  // ---------------------------------------------------------------------------

  _resize() {
    const parent = this.canvas.parentElement;
    const cssW = Math.max(280, parent ? parent.clientWidth : this.canvas.clientWidth || LOGICAL_W);
    const cssH = Math.max(
      180,
      parent && parent.clientHeight > 60
        ? parent.clientHeight
        : Math.round((cssW * LOGICAL_H) / LOGICAL_W)
    );
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);

    // Compute aspect-preserving letterbox/cover fit (contain)
    const scale = Math.min(this.canvas.width / LOGICAL_W, this.canvas.height / LOGICAL_H);
    const drawW = Math.floor(LOGICAL_W * scale);
    const drawH = Math.floor(LOGICAL_H * scale);
    const offsetX = Math.floor((this.canvas.width - drawW) / 2);
    const offsetY = Math.floor((this.canvas.height - drawH) / 2);

    this.viewRect = { x: offsetX, y: offsetY, w: drawW, h: drawH, scale, dpr };
    this.ctx.imageSmoothingEnabled = false;
  }

  _clientToLogical(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: -1, y: -1 };
    const px = ((clientX - rect.left) / rect.width) * this.canvas.width;
    const py = ((clientY - rect.top) / rect.height) * this.canvas.height;
    return {
      x: (px - this.viewRect.x) / this.viewRect.scale,
      y: (py - this.viewRect.y) / this.viewRect.scale,
    };
  }

  _hitTest(lx, ly) {
    // Workers have priority over buildings
    for (const agent of this.agents.values()) {
      if (lx >= agent.x - 10 && lx <= agent.x + 10 && ly >= agent.y - 19 && ly <= agent.y + 4) {
        return { type: 'worker', id: agent.id };
      }
    }
    for (const b of Object.values(BUILDINGS)) {
      if (pointInRect(lx, ly, b)) {
        return { type: 'building', id: b.id };
      }
    }
    return null;
  }

  _handlePointerMove(e) {
    const { x, y } = this._clientToLogical(e.clientX, e.clientY);
    const hit = this._hitTest(x, y);
    this.hoveredWorkerId = hit && hit.type === 'worker' ? hit.id : null;
    this.hoveredBuildingId = hit && hit.type === 'building' ? hit.id : null;
    this.canvas.style.cursor = hit ? 'pointer' : 'default';
  }

  _handlePointerLeave() {
    this.hoveredWorkerId = null;
    this.hoveredBuildingId = null;
    this.canvas.style.cursor = 'default';
  }

  _handleClick(e) {
    const { x, y } = this._clientToLogical(e.clientX, e.clientY);
    const hit = this._hitTest(x, y);
    if (!hit) {
      this.selectedBuildingId = null;
      this.selectedWorkerId = null;
      return;
    }
    if (hit.type === 'worker') {
      this.selectedWorkerId = hit.id;
      this.selectedBuildingId = null;
      if (typeof this.callbacks.onSelectWorker === 'function') {
        this.callbacks.onSelectWorker(hit.id);
      }
    } else if (hit.type === 'building') {
      this.selectedBuildingId = hit.id;
      this.selectedWorkerId = null;
      if (typeof this.callbacks.onSelectBuilding === 'function') {
        this.callbacks.onSelectBuilding(hit.id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Animation Loop & Simulation
  // ---------------------------------------------------------------------------

  _startLoop() {
    const step = (ts) => {
      if (this.destroyed) return;
      if (!this.lastFrameTs) this.lastFrameTs = ts;
      const dt = Math.min(0.05, (ts - this.lastFrameTs) / 1000);
      this.lastFrameTs = ts;
      this.time += dt;

      this._update(dt);
      this._render();

      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  _update(dt) {
    this.marqueeOffset += dt * 26;
    if (this.launchBannerTimer > 0) this.launchBannerTimer = Math.max(0, this.launchBannerTimer - dt);
    if (this.ambientFlash > 0) this.ambientFlash = Math.max(0, this.ambientFlash - dt * 0.9);

    // Update worker agents
    for (const agent of this.agents.values()) {
      if (agent.bubbleTimer > 0) {
        agent.bubbleTimer = Math.max(0, agent.bubbleTimer - dt);
      }
      if (agent.cliTimer > 0) {
        agent.cliTimer = Math.max(0, agent.cliTimer - dt);
      }
      if (agent.celebrateTimer > 0) {
        agent.celebrateTimer = Math.max(0, agent.celebrateTimer - dt);
        agent.anim = 'celebrate';
        continue;
      }

      if (agent.path.length > 0) {
        const target = agent.path[0];
        const dx = target.x - agent.x;
        const dy = target.y - agent.y;
        const dist = Math.hypot(dx, dy);
        const stepDist = agent.speed * dt;

        if (Math.abs(dx) > 0.5) {
          agent.flipX = dx < 0;
        }

        if (dist <= stepDist) {
          agent.x = target.x;
          agent.y = target.y;
          if (target.finalZone) {
            agent.zone = target.finalZone;
          } else if (target.nodeId && target.nodeId.startsWith('plaza_')) {
            agent.zone = 'plaza';
          }
          agent.path.shift();
        } else {
          agent.x += (dx / dist) * stepDist;
          agent.y += (dy / dist) * stepDist;
        }
        agent.anim = 'walk';
      } else {
        // Arrived at destination
        const isWorking = agent.seatBuilding !== null || agent.cliTimer > 0;
        if (isWorking) {
          agent.anim = 'work';
          agent.flipX = false;

          // Periodic working speech bubble
          agent.nextAmbientBubble -= dt;
          if (agent.nextAmbientBubble <= 0 && agent.bubbleTimer <= 0) {
            const list = agent.seatBuilding === 'guild' ? GUILD_WORK_BUBBLES : API_WORK_BUBBLES;
            const pick =
              agent.taskTitle && Math.random() < 0.4
                ? truncateText(agent.taskTitle, 14)
                : list[Math.floor(Math.random() * list.length)];
            this._setBubble(agent, pick, 3.2, agent.cliTimer > 0 ? 'cli' : 'normal');
            agent.nextAmbientBubble = 5.0 + Math.random() * 4.5;
          }
        } else {
          agent.anim = 'idle';
          agent.wanderTimer -= dt;
          if (agent.wanderTimer <= 0) {
            agent.wanderTimer = 5.5 + Math.random() * 6.5;
            if (Math.random() < 0.25 && agent.zone === 'lounge') {
              // Stroll out to central plaza to admire the neon billboard
              const px = 220 + Math.random() * 100;
              const py = 176 + Math.random() * 24;
              this._routeAgentTo(agent, 'plaza', px, py);
            } else {
              // Move between coffee machine, sofa, and charging pads inside lounge
              const spot = BUILDINGS.lounge.spots[Math.floor(Math.random() * BUILDINGS.lounge.spots.length)];
              this._routeAgentTo(agent, 'lounge', spot.x, spot.y);
            }
          }

          agent.nextAmbientBubble -= dt;
          if (agent.nextAmbientBubble <= 0 && agent.bubbleTimer <= 0) {
            const pick = IDLE_BUBBLES[Math.floor(Math.random() * IDLE_BUBBLES.length)];
            this._setBubble(agent, pick, 2.8, 'normal');
            agent.nextAmbientBubble = 7.0 + Math.random() * 6.0;
          }
        }
      }
    }

    // Floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Coin particles
    for (let i = this.coinParticles.length - 1; i >= 0; i--) {
      const p = this.coinParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt;
      if (p.life <= 0) this.coinParticles.splice(i, 1);
    }

    // CLI data particles
    for (let i = this.dataParticles.length - 1; i >= 0; i--) {
      const p = this.dataParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.dataParticles.splice(i, 1);
    }

    // Fireworks rockets -> sparks
    for (let i = this.fireworkRockets.length - 1; i >= 0; i--) {
      const r = this.fireworkRockets[i];
      if (r.delay > 0) {
        r.delay -= dt;
        continue;
      }
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      if (r.y <= r.targetY) {
        this._explodeFirework(r.x, r.y, r.colors);
        this.fireworkRockets.splice(i, 1);
      }
    }

    for (let i = this.fireworkSparks.length - 1; i >= 0; i--) {
      const s = this.fireworkSparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.97;
      s.vy = s.vy * 0.97 + 42 * dt;
      s.life -= dt;
      if (s.life <= 0) this.fireworkSparks.splice(i, 1);
    }
  }

  _explodeFirework(x, y, colors) {
    this.ambientFlash = Math.min(0.45, this.ambientFlash + 0.14);
    const count = 26;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
      const spd = 30 + Math.random() * 68;
      this.fireworkSparks.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: colors[i % colors.length],
        size: i % 3 === 0 ? 2 : 1,
        life: 0.75 + Math.random() * 0.55,
        maxLife: 1.3,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering Pipeline (Logical 540x340 -> Crisp Blit to Canvas)
  // ---------------------------------------------------------------------------

  _render() {
    const g = this.bctx;
    const theme = THEMES[this.dayNight] || THEMES.night;
    const isNight = this.dayNight === 'night';

    g.imageSmoothingEnabled = false;

    // 1. Sky backdrop strip + Town ground
    this._drawBackdropAndGround(g, theme, isNight);

    // 2. Roads & Central Cobblestone Plaza
    this._drawPlazaAndRoads(g, theme, isNight);

    // 3. Four Buildings (Interiors + Roofs + Dynamic Evolution)
    this._drawFactory(g, theme, isNight);
    this._drawGuild(g, theme, isNight);
    this._drawLounge(g, theme, isNight);
    this._drawLaunchpad(g, theme, isNight);

    // 4. Central Neon Billboard & Plaza Props (trees, lamps)
    this._drawNeonBillboard(g, isNight);
    this._drawPlazaProps(g, isNight);

    // 5. Workers sorted by Y for crisp painter's depth
    const sortedAgents = Array.from(this.agents.values()).sort((a, b) => a.y - b.y);
    for (const agent of sortedAgents) {
      this._drawWorkerAgent(g, agent, isNight);
    }

    // 6. Night-time warm lamp cones & floating fireflies
    if (isNight) {
      this._drawNightAtmosphere(g);
    }

    // 7. Speech Bubbles & Particles & Fireworks
    for (const agent of sortedAgents) {
      if (agent.bubbleTimer > 0 && agent.bubbleText) {
        this._drawSpeechBubble(g, agent);
      }
    }
    this._drawParticlesAndFireworks(g);
    this._drawLaunchBanner(g);

    // 8. Blit logical buffer sharply onto main display canvas
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = theme.skyTop;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(
      this.buffer,
      0,
      0,
      LOGICAL_W,
      LOGICAL_H,
      this.viewRect.x,
      this.viewRect.y,
      this.viewRect.w,
      this.viewRect.h
    );
  }

  _drawBackdropAndGround(g, theme, isNight) {
    // Top sky strip
    g.fillStyle = theme.skyTop;
    g.fillRect(0, 0, LOGICAL_W, 14);
    g.fillStyle = theme.skyBottom;
    g.fillRect(0, 14, LOGICAL_W, 10);

    if (isNight) {
      // Twinkling stars
      for (const s of this.stars) {
        const alpha = 0.35 + 0.65 * Math.abs(Math.sin(this.time * 1.8 + s.phase));
        g.fillStyle = `rgba(226, 232, 240, ${alpha.toFixed(2)})`;
        g.fillRect(s.x, s.y, s.size, s.size);
      }
    } else {
      // Soft drifting pixel clouds
      g.fillStyle = '#ffffff';
      const c1 = Math.floor((this.time * 5) % (LOGICAL_W + 60)) - 30;
      const c2 = Math.floor((this.time * 3.5 + 220) % (LOGICAL_W + 60)) - 30;
      g.fillRect(c1, 6, 22, 5);
      g.fillRect(c1 + 4, 3, 14, 4);
      g.fillRect(c2, 9, 26, 5);
      g.fillRect(c2 + 6, 6, 14, 4);
    }

    // Town ground base with subtle tile texture
    g.fillStyle = theme.ground;
    g.fillRect(0, 22, LOGICAL_W, LOGICAL_H - 22);
    g.fillStyle = theme.groundAlt;
    for (let y = 26; y < LOGICAL_H; y += 16) {
      for (let x = (y % 32 === 0 ? 0 : 8); x < LOGICAL_W; x += 16) {
        g.fillRect(x, y, 4, 2);
      }
    }
  }

  _drawPlazaAndRoads(g, theme, isNight) {
    // Vertical & Horizontal connecting avenues
    g.fillStyle = theme.roadTrim;
    g.fillRect(250, 22, 40, LOGICAL_H - 22);
    g.fillRect(14, 158, LOGICAL_W - 28, 34);
    g.fillStyle = theme.road;
    g.fillRect(252, 22, 36, LOGICAL_H - 22);
    g.fillRect(14, 160, LOGICAL_W - 28, 30);

    // Door aprons connecting each building cleanly to plaza/roads
    g.fillRect(150, 144, 24, 18); // factory door
    g.fillRect(366, 144, 24, 18); // guild door
    g.fillRect(150, 188, 24, 18); // lounge door
    g.fillRect(366, 188, 24, 18); // launchpad door

    // Central Stone Plaza
    const px = 192;
    const py = 112;
    const pw = 156;
    const ph = 122;

    g.fillStyle = theme.plazaBorder;
    g.fillRect(px - 2, py - 2, pw + 4, ph + 4);

    // Checkerboard cobblestones
    const tile = 12;
    for (let ty = 0; ty < ph; ty += tile) {
      for (let tx = 0; tx < pw; tx += tile) {
        const even = ((tx / tile) + (ty / tile)) % 2 === 0;
        g.fillStyle = even ? theme.plazaA : theme.plazaB;
        g.fillRect(px + tx, py + ty, Math.min(tile, pw - tx), Math.min(tile, ph - ty));
        // Subtle stone bevel pixel
        g.fillStyle = isNight ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.22)';
        g.fillRect(px + tx + 1, py + ty + 1, Math.min(tile - 2, pw - tx - 1), 1);
      }
    }

    // Plaza decorative center ring under billboard
    g.strokeStyle = isNight ? 'rgba(34, 211, 238, 0.25)' : 'rgba(120, 53, 15, 0.22)';
    g.lineWidth = 1;
    g.strokeRect(px + 6.5, py + 6.5, pw - 13, ph - 13);
  }

  _drawBuildingShell(g, b, roofMain, roofLight, floorColor, theme, isNight) {
    const isHover = this.hoveredBuildingId === b.id;
    const isSel = this.selectedBuildingId === b.id;

    // Drop shadow
    g.fillStyle = 'rgba(0, 0, 0, 0.35)';
    g.fillRect(b.x + 3, b.y + 4, b.w, b.h);

    // Outer wall frame
    g.fillStyle = theme.wallBorder;
    g.fillRect(b.x, b.y, b.w, b.h);

    // Interior floor
    g.fillStyle = floorColor;
    g.fillRect(b.x + 3, b.y + 22, b.w - 6, b.h - 25);

    // Roof band with pixel shingle/rib texture
    g.fillStyle = roofMain;
    g.fillRect(b.x + 2, b.y + 2, b.w - 4, 20);
    g.fillStyle = roofLight;
    g.fillRect(b.x + 2, b.y + 2, b.w - 4, 4);
    for (let rx = b.x + 8; rx < b.x + b.w - 8; rx += 12) {
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.fillRect(rx, b.y + 6, 2, 14);
    }

    // Inner wall border line
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(b.x + 3, b.y + 22, b.w - 6, 2);

    // Interactive highlight outline
    if (isHover || isSel) {
      const pulse = 0.65 + 0.35 * Math.sin(this.time * 6);
      g.strokeStyle = isSel ? '#fde047' : b.accent;
      g.lineWidth = isSel ? 2 : 1.5;
      g.globalAlpha = isSel ? 1 : pulse;
      g.strokeRect(b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3);
      g.globalAlpha = 1;
    }

    // Chinese Pixel Plaque Signboard on roof
    const plaqueW = 78;
    const plaqueH = 14;
    const plaqueX = Math.round(b.x + (b.w - plaqueW) / 2);
    const plaqueY = b.y + 5;

    g.fillStyle = '#090d1a';
    g.fillRect(plaqueX, plaqueY, plaqueW, plaqueH);
    g.fillStyle = b.accent;
    g.fillRect(plaqueX, plaqueY, plaqueW, 1);
    g.fillRect(plaqueX, plaqueY + plaqueH - 1, plaqueW, 1);
    g.fillRect(plaqueX, plaqueY, 1, plaqueH);
    g.fillRect(plaqueX + plaqueW - 1, plaqueY, 1, plaqueH);

    g.font = 'bold 9px "Courier New", "Microsoft JhengHei", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = isNight ? '#f8fafc' : '#fef08a';
    g.fillText(b.label, plaqueX + plaqueW / 2, plaqueY + plaqueH / 2 + 0.5);
  }

  _drawFactory(g, theme, isNight) {
    const b = BUILDINGS.factory;
    this._drawBuildingShell(g, b, theme.factoryRoof, theme.factoryRoofLight, theme.factoryFloor, theme, isNight);

    // Subtle floor circuit lines
    g.fillStyle = isNight ? 'rgba(34, 211, 238, 0.08)' : 'rgba(15, 23, 42, 0.07)';
    g.fillRect(b.x + 6, b.y + 94, b.w - 12, 1);
    g.fillRect(b.x + 150, b.y + 24, 1, b.h - 28);

    // Door cutout at bottom-right
    g.fillStyle = theme.road;
    g.fillRect(154, b.y + b.h - 3, 18, 4);
    g.fillStyle = '#22d3ee';
    g.fillRect(154, b.y + b.h - 4, 18, 1);

    // Blinking Server Racks
    const rackFrame = Math.floor(this.time * 2.5) % 2;
    drawObjectSprite(g, 'server_rack', b.x + 7, b.y + 28, 1, rackFrame);
    drawObjectSprite(g, 'server_rack', b.x + 21, b.y + 28, 1, (rackFrame + 1) % 2);
    drawObjectSprite(g, 'server_rack', b.x + 7, b.y + 46, 1, (rackFrame + 1) % 2);

    // Rotating bronze gears mounted on roof corners
    const gearFrame = Math.floor(this.time * 4) % 2;
    drawObjectSprite(g, 'gear', b.x + 6, b.y - 3, 1, gearFrame);
    drawObjectSprite(g, 'gear', b.x + b.w - 18, b.y - 2, 1, (gearFrame + 1) % 2);

    // 4 PC Workstations (light up brightly when a worker occupies that seat)
    const occupiedSeats = new Set();
    for (const ag of this.agents.values()) {
      if (ag.seatBuilding === 'factory' && ag.anim === 'work' && ag.seatIndex != null) {
        occupiedSeats.add(ag.seatIndex);
      }
    }
    const screenFrame = Math.floor(this.time * 5) % 2;
    b.seats.forEach((seat, idx) => {
      const active = occupiedSeats.has(idx);
      drawObjectSprite(g, active ? 'desk_pc_active' : 'desk_pc', seat.deskX, seat.deskY, 1, screenFrame);
      if (active && isNight) {
        g.fillStyle = 'rgba(34, 211, 238, 0.14)';
        g.fillRect(seat.deskX + 1, seat.deskY - 2, 14, 12);
      }
    });
  }

  _drawGuild(g, theme, isNight) {
    const b = BUILDINGS.guild;
    this._drawBuildingShell(g, b, theme.guildRoof, theme.guildRoofLight, theme.guildFloor, theme, isNight);

    // Warm plank floorboards
    g.fillStyle = isNight ? 'rgba(245, 158, 11, 0.06)' : 'rgba(120, 53, 15, 0.10)';
    for (let fy = b.y + 30; fy < b.y + b.h - 4; fy += 8) {
      g.fillRect(b.x + 4, fy, b.w - 8, 1);
    }

    // Door cutout at bottom-left
    g.fillStyle = theme.road;
    g.fillRect(368, b.y + b.h - 3, 18, 4);
    g.fillStyle = '#f59e0b';
    g.fillRect(368, b.y + b.h - 4, 18, 1);

    // Trophy banners & Bounty Bulletin Board along back wall
    const bannerFrame = Math.floor(this.time * 2) % 2;
    drawObjectSprite(g, 'trophy_banner', b.x + 8, b.y + 26, 1, bannerFrame);
    drawObjectSprite(g, 'trophy_banner', b.x + b.w - 18, b.y + 26, 1, (bannerFrame + 1) % 2);
    drawObjectSprite(g, 'bounty_board', b.x + 75, b.y + 25, 1, bannerFrame);

    // 3 Artisan Desks
    const occupiedSeats = new Set();
    for (const ag of this.agents.values()) {
      if (ag.seatBuilding === 'guild' && ag.anim === 'work' && ag.seatIndex != null) {
        occupiedSeats.add(ag.seatIndex);
      }
    }
    const screenFrame = Math.floor(this.time * 4.5) % 2;
    b.seats.forEach((seat, idx) => {
      const active = occupiedSeats.has(idx);
      drawObjectSprite(g, active ? 'desk_pc_active' : 'desk_pc', seat.deskX, seat.deskY, 1, screenFrame);
      if (active && isNight) {
        g.fillStyle = 'rgba(245, 158, 11, 0.14)';
        g.fillRect(seat.deskX + 1, seat.deskY - 2, 14, 12);
      }
    });
  }

  _drawLounge(g, theme, isNight) {
    const b = BUILDINGS.lounge;
    this._drawBuildingShell(g, b, theme.loungeRoof, theme.loungeRoofLight, theme.loungeFloor, theme, isNight);

    // Cozy rug in center
    g.fillStyle = isNight ? '#3b2442' : '#c084fc';
    g.fillRect(b.x + 58, b.y + 44, 62, 34);
    g.fillStyle = isNight ? '#582c5e' : '#e9d5ff';
    g.fillRect(b.x + 61, b.y + 47, 56, 28);

    // Door cutout at top-right (facing plaza)
    g.fillStyle = theme.road;
    g.fillRect(154, b.y, 18, 4);
    g.fillStyle = '#f472b6';
    g.fillRect(154, b.y + 3, 18, 1);

    // Coffee counter + Steaming Coffee Machine
    g.fillStyle = '#78350f';
    g.fillRect(b.x + 8, b.y + 40, 34, 10);
    g.fillStyle = '#b45309';
    g.fillRect(b.x + 8, b.y + 40, 34, 3);
    const steamFrame = Math.floor(this.time * 3.2) % 2;
    drawObjectSprite(g, 'coffee_machine', b.x + 14, b.y + 29, 1, steamFrame);

    // Plush Sofa & Potted Tree
    drawObjectSprite(g, 'sofa', b.x + 82, b.y + 34, 1, 0);
    drawObjectSprite(g, 'potted_tree', b.x + 150, b.y + 30, 1, steamFrame);

    // 3 Glowing Charging Pads
    const padFrame = Math.floor(this.time * 2.5) % 2;
    drawObjectSprite(g, 'charge_pad', b.x + 27, b.y + 92, 1, padFrame);
    drawObjectSprite(g, 'charge_pad', b.x + 75, b.y + 92, 1, (padFrame + 1) % 2);
    drawObjectSprite(g, 'charge_pad', b.x + 123, b.y + 92, 1, padFrame);
  }

  _drawLaunchpad(g, theme, isNight) {
    const b = BUILDINGS.launchpad;
    const proj = this._getFeaturedProject();
    const pct = Math.max(0, Math.min(100, Number(proj.progressPct ?? 0)));
    const isLaunched = proj.status === 'launched' || pct >= 100;

    // Roof color upgrades to royal purple/gold once launched
    const roofMain = isLaunched ? '#581c87' : '#312e81';
    const roofLight = isLaunched ? '#a855f7' : '#6366f1';
    this._drawBuildingShell(g, b, roofMain, roofLight, theme.launchFloor, theme, isNight);

    // Door cutout at top-left
    g.fillStyle = theme.road;
    g.fillRect(368, b.y, 18, 4);
    g.fillStyle = '#a855f7';
    g.fillRect(368, b.y + 3, 18, 1);

    // Construction pad base area
    const padX = b.x + 36;
    const padY = b.y + 30;
    const padW = 104;
    const padH = 64;

    // Hazard stripe border around launch site
    g.fillStyle = '#1e293b';
    g.fillRect(padX, padY, padW, padH);
    for (let sx = padX; sx < padX + padW; sx += 8) {
      g.fillStyle = (sx / 8) % 2 === 0 ? '#eab308' : '#0f172a';
      g.fillRect(sx, padY + padH - 3, 4, 3);
    }

    // Visual Evolution Stage
    if (isLaunched) {
      // STAGE 4 (100% / Launched): Sleek Neon HQ Tower + Rooftop Signboard + Upward Beams!
      const beamAlpha = 0.14 + 0.08 * Math.sin(this.time * 4);
      g.fillStyle = `rgba(168, 85, 247, ${beamAlpha.toFixed(2)})`;
      g.fillRect(padX + 26, padY - 6, 52, 14);

      // Tower body
      g.fillStyle = '#0f172a';
      g.fillRect(padX + 22, padY + 8, 60, 52);
      g.fillStyle = '#1e1b4b';
      g.fillRect(padX + 24, padY + 10, 56, 48);

      // Vertical neon trim strips
      g.fillStyle = '#22d3ee';
      g.fillRect(padX + 23, padY + 10, 2, 48);
      g.fillStyle = '#f472b6';
      g.fillRect(padX + 79, padY + 10, 2, 48);

      // Glowing office windows
      for (let wy = padY + 18; wy < padY + 52; wy += 8) {
        for (let wx = padX + 29; wx < padX + 74; wx += 9) {
          const lit = ((wx + wy + Math.floor(this.time * 1.5)) % 5) !== 0;
          g.fillStyle = lit ? '#fde047' : '#334155';
          g.fillRect(wx, wy, 5, 4);
        }
      }

      // Rooftop Neon Signboard
      g.fillStyle = '#090d1a';
      g.fillRect(padX + 14, padY - 1, 76, 12);
      g.strokeStyle = Math.floor(this.time * 4) % 2 === 0 ? '#22d3ee' : '#f472b6';
      g.lineWidth = 1;
      g.strokeRect(padX + 14.5, padY - 0.5, 75, 11);
      g.font = 'bold 7px "Courier New", "Microsoft JhengHei", monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fef08a';
      g.fillText(`★ ${truncateText(proj.name, 9)} ★`, padX + 52, padY + 5.5);
    } else if (pct >= 76) {
      // STAGE 3 (76–99%): Topping Out & Interior Finishing
      g.fillStyle = '#1e293b';
      g.fillRect(padX + 24, padY + 12, 56, 48);
      g.fillStyle = '#334155';
      g.fillRect(padX + 26, padY + 14, 52, 44);
      // Warm interior windows lighting up
      for (let wy = padY + 18; wy < padY + 52; wy += 8) {
        for (let wx = padX + 30; wx < padX + 72; wx += 10) {
          g.fillStyle = wy > padY + 26 ? '#fbbf24' : '#38bdf8';
          g.fillRect(wx, wy, 6, 4);
        }
      }
      // Topping-out red banner + crane fin
      g.fillStyle = '#ef4444';
      g.fillRect(padX + 32, padY + 8, 40, 4);
      g.fillStyle = '#fde047';
      g.fillRect(padX + 46, padY + 9, 12, 2);
    } else if (pct >= 31) {
      // STAGE 2 (31–75%): Steel Scaffolding Construction + Crane + Welding Sparks
      // Concrete rising core
      g.fillStyle = '#475569';
      g.fillRect(padX + 28, padY + 24, 48, 36);
      g.fillStyle = '#64748b';
      g.fillRect(padX + 32, padY + 28, 40, 28);

      // Steel scaffolding lattice
      g.fillStyle = '#f59e0b';
      g.fillRect(padX + 24, padY + 16, 2, 44);
      g.fillRect(padX + 78, padY + 16, 2, 44);
      g.fillRect(padX + 24, padY + 24, 56, 2);
      g.fillRect(padX + 24, padY + 40, 56, 2);

      // Moving pixel crane jib on right
      const jibShift = Math.round(Math.sin(this.time * 1.8) * 6);
      g.fillStyle = '#eab308';
      g.fillRect(padX + 84, padY + 6, 3, 54);
      g.fillRect(padX + 42 + jibShift, padY + 6, 46, 3);
      g.fillStyle = '#cbd5e1';
      g.fillRect(padX + 48 + jibShift, padY + 9, 1, 14);
      g.fillStyle = '#22d3ee';
      g.fillRect(padX + 45 + jibShift, padY + 23, 7, 5);

      // Periodic welding sparks
      if (Math.floor(this.time * 8) % 3 === 0) {
        g.fillStyle = '#fef08a';
        g.fillRect(padX + 36, padY + 34, 2, 2);
        g.fillStyle = '#38bdf8';
        g.fillRect(padX + 39, padY + 32, 1, 1);
        g.fillRect(padX + 34, padY + 37, 1, 1);
      }
    } else {
      // STAGE 1 (0–30%): Cyan Blueprint Foundation
      g.fillStyle = '#0c4a6e';
      g.fillRect(padX + 12, padY + 12, 80, 44);
      g.fillStyle = '#0284c7';
      for (let gx = padX + 16; gx < padX + 90; gx += 10) {
        g.fillRect(gx, padY + 12, 1, 44);
      }
      for (let gy = padY + 16; gy < padY + 54; gy += 10) {
        g.fillRect(padX + 12, gy, 80, 1);
      }
      // Blueprint hologram building outline
      const holoAlpha = 0.5 + 0.4 * Math.sin(this.time * 4);
      g.strokeStyle = `rgba(103, 232, 249, ${holoAlpha.toFixed(2)})`;
      g.lineWidth = 1;
      g.strokeRect(padX + 28.5, padY + 18.5, 48, 30);
      // Orange surveyor cones
      g.fillStyle = '#f97316';
      g.fillRect(padX + 14, padY + 50, 4, 4);
      g.fillRect(padX + 86, padY + 50, 4, 4);
    }

    // Progress Bar & Featured Project Label at bottom of Launchpad
    const barX = b.x + 10;
    const barY = b.y + b.h - 21;
    const barW = b.w - 20;

    g.font = 'bold 8px "Courier New", "Microsoft JhengHei", monospace';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = isNight ? '#e2e8f0' : '#0f172a';
    g.fillText(truncateText(proj.name, 14), barX, barY);

    g.textAlign = 'right';
    g.fillStyle = isLaunched ? '#4ade80' : '#38bdf8';
    g.fillText(isLaunched ? '🚀 已上線' : `${pct}%`, barX + barW, barY);

    // Pixel progress bar
    g.fillStyle = '#0f172a';
    g.fillRect(barX, barY + 11, barW, 6);
    const fillW = Math.round(((barW - 2) * pct) / 100);
    g.fillStyle = isLaunched ? '#22c55e' : pct >= 76 ? '#a855f7' : '#22d3ee';
    g.fillRect(barX + 1, barY + 12, fillW, 4);
  }

  _drawNeonBillboard(g, isNight) {
    const bx = 204;
    const by = 117;
    const bw = 132;
    const bh = 40;
    const ticker = this._getBillboardTicker();

    // Support pillars
    g.fillStyle = '#334155';
    g.fillRect(bx + 18, by + bh, 4, 9);
    g.fillRect(bx + bw - 22, by + bh, 4, 9);
    g.fillStyle = '#0f172a';
    g.fillRect(bx + 16, by + bh + 8, 8, 2);
    g.fillRect(bx + bw - 24, by + bh + 8, 8, 2);

    // Outer glow aura at night
    if (isNight) {
      g.fillStyle = ticker.isSponsored
        ? 'rgba(244, 114, 182, 0.16)'
        : 'rgba(34, 211, 238, 0.14)';
      g.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    }

    // Billboard casing
    g.fillStyle = '#090d1a';
    g.fillRect(bx, by, bw, bh);
    g.fillStyle = '#111827';
    g.fillRect(bx + 3, by + 3, bw - 6, bh - 6);

    // Chase LED border bulbs
    const step = Math.floor(this.time * 6);
    const bulbColorA = ticker.isSponsored ? '#f472b6' : '#22d3ee';
    const bulbColorB = ticker.isSponsored ? '#fde047' : '#a855f7';
    for (let i = 0; i < bw; i += 6) {
      const lit = ((i / 6 + step) % 2) === 0;
      g.fillStyle = lit ? bulbColorA : bulbColorB;
      g.fillRect(bx + i + 1, by + 1, 2, 2);
      g.fillRect(bx + i + 1, by + bh - 3, 2, 2);
    }
    for (let j = 6; j < bh - 6; j += 6) {
      const lit = ((j / 6 + step) % 2) === 0;
      g.fillStyle = lit ? bulbColorB : bulbColorA;
      g.fillRect(bx + 1, by + j, 2, 2);
      g.fillRect(bx + bw - 3, by + j, 2, 2);
    }

    // Header badge inside billboard
    g.font = 'bold 7px "Courier New", "Microsoft JhengHei", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillStyle = ticker.isSponsored ? '#f472b6' : '#38bdf8';
    const header = ticker.isSponsored
      ? '★ PIXEL NEON SPONSORED ★'
      : ticker.isLaunched
        ? '🚀 TOWN LAUNCHBOARD 🚀'
        : '⚡ PIXELCOMPUTE PLAZA ⚡';
    g.fillText(header, bx + bw / 2, by + 6);

    // Clipped horizontally scrolling marquee text
    g.save();
    g.beginPath();
    g.rect(bx + 5, by + 17, bw - 10, 17);
    g.clip();

    g.font = 'bold 9px "Courier New", "Microsoft JhengHei", monospace';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    const textW = Math.max(120, g.measureText(ticker.text).width);
    const scrollX = bx + 6 - (this.marqueeOffset % textW);

    g.fillStyle = ticker.isSponsored ? '#fef08a' : '#67e8f9';
    g.fillText(ticker.text, scrollX, by + 26);
    g.fillText(ticker.text, scrollX + textW, by + 26);
    g.restore();
  }

  _drawPlazaProps(g, isNight) {
    const sway = Math.floor(this.time * 1.5) % 2;

    // Potted pixel trees framing the town avenues
    drawObjectSprite(g, 'potted_tree', 194, 34, 1, sway);
    drawObjectSprite(g, 'potted_tree', 334, 34, 1, (sway + 1) % 2);
    drawObjectSprite(g, 'potted_tree', 194, 306, 1, (sway + 1) % 2);
    drawObjectSprite(g, 'potted_tree', 334, 306, 1, sway);

    // 4 Warm Retro Street Lamps at plaza corners
    const lamps = [
      { x: 194, y: 114 },
      { x: 342, y: 114 },
      { x: 194, y: 222 },
      { x: 342, y: 222 },
    ];
    for (const lamp of lamps) {
      g.fillStyle = '#1e293b';
      g.fillRect(lamp.x, lamp.y, 2, 12);
      g.fillStyle = '#475569';
      g.fillRect(lamp.x - 1, lamp.y + 11, 4, 2);
      g.fillStyle = isNight ? '#fde047' : '#fbbf24';
      g.fillRect(lamp.x - 1, lamp.y - 3, 4, 3);
    }
  }

  _drawNightAtmosphere(g) {
    // Warm amber glow cones around the 4 plaza street lamps
    const lamps = [
      { x: 195, y: 112 },
      { x: 343, y: 112 },
      { x: 195, y: 220 },
      { x: 343, y: 220 },
    ];
    for (const lamp of lamps) {
      const grad = g.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 26);
      grad.addColorStop(0, 'rgba(253, 224, 71, 0.28)');
      grad.addColorStop(0.55, 'rgba(251, 191, 36, 0.10)');
      grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      g.fillStyle = grad;
      g.fillRect(lamp.x - 26, lamp.y - 26, 52, 52);
    }

    // Gentle glowing cyber fireflies drifting around plaza
    for (const f of this.fireflies) {
      const fx = Math.round(f.baseX + Math.sin(this.time * f.speed + f.phase) * 8);
      const fy = Math.round(f.baseY + Math.cos(this.time * f.speed * 0.8 + f.phase) * 5);
      const a = 0.25 + 0.55 * Math.abs(Math.sin(this.time * 2.5 + f.phase));
      g.fillStyle = f.phase % 2 > 1 ? `rgba(103, 232, 249, ${a.toFixed(2)})` : `rgba(253, 224, 71, ${a.toFixed(2)})`;
      g.fillRect(fx, fy, 1, 1);
    }

    // Firework sky flash overlay
    if (this.ambientFlash > 0.01) {
      g.fillStyle = `rgba(168, 85, 247, ${(this.ambientFlash * 0.22).toFixed(3)})`;
      g.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }
  }

  _drawWorkerAgent(g, agent, isNight) {
    const isHovered = this.hoveredWorkerId === agent.id;
    const isSelected = this.selectedWorkerId === agent.id;
    const meta = WORKER_ROLE_META[agent.roleClass] || WORKER_ROLE_META.flash_worker;

    // Selection or hover pixel reticle beneath worker's feet
    if (isHovered || isSelected) {
      g.strokeStyle = isSelected ? '#fde047' : meta.accent;
      g.lineWidth = 1;
      g.strokeRect(Math.round(agent.x - 7) + 0.5, Math.round(agent.y - 3) + 0.5, 14, 5);
    }

    // Choose frame speed based on animation state
    let frameIndex = 0;
    if (agent.anim === 'walk') {
      frameIndex = Math.floor(this.time * 9);
    } else if (agent.anim === 'work') {
      frameIndex = Math.floor(this.time * 10);
    } else if (agent.anim === 'celebrate') {
      frameIndex = Math.floor(this.time * 8);
    } else {
      frameIndex = Math.floor(this.time * 2.2);
    }

    drawWorkerSprite(
      g,
      agent.roleClass,
      agent.skinId,
      agent.anim,
      frameIndex,
      agent.x,
      agent.y,
      1,
      agent.flipX
    );

    // Compact pixel name tag below feet
    const shortName = truncateText(agent.name, 7);
    g.font = 'bold 7px "Courier New", "Microsoft JhengHei", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    const tw = Math.min(48, Math.ceil(g.measureText(shortName).width) + 4);
    const tx = Math.round(agent.x - tw / 2);
    const ty = Math.round(agent.y + 2);

    g.fillStyle = isNight ? 'rgba(9, 13, 26, 0.78)' : 'rgba(255, 255, 255, 0.82)';
    g.fillRect(tx, ty, tw, 9);
    g.fillStyle = agent.anim === 'work' ? meta.accent : isNight ? '#e2e8f0' : '#0f172a';
    g.fillText(shortName, Math.round(agent.x), ty + 1);
  }

  _drawSpeechBubble(g, agent) {
    const text = agent.bubbleText;
    g.font = 'bold 7px "Courier New", "Microsoft JhengHei", monospace';
    const textW = Math.ceil(g.measureText(text).width);
    const padX = 4;
    const bw = Math.min(130, textW + padX * 2);
    const bh = 13;

    let bx = Math.round(agent.x - bw / 2);
    let by = Math.round(agent.y - 31);
    bx = Math.max(4, Math.min(LOGICAL_W - bw - 4, bx));
    by = Math.max(4, by);

    let bg = '#0f172a';
    let border = '#38bdf8';
    let fg = '#f8fafc';
    if (agent.bubbleStyle === 'cli') {
      bg = '#052e16';
      border = '#4ade80';
      fg = '#86efac';
    } else if (agent.bubbleStyle === 'success') {
      bg = '#1e1b4b';
      border = '#fde047';
      fg = '#fef08a';
    } else if (agent.bubbleStyle === 'dispatch') {
      bg = '#172554';
      border = '#22d3ee';
      fg = '#a5f3fc';
    }

    g.fillStyle = bg;
    g.fillRect(bx, by, bw, bh);
    g.fillStyle = border;
    g.fillRect(bx, by, bw, 1);
    g.fillRect(bx, by + bh - 1, bw, 1);
    g.fillRect(bx, by, 1, bh);
    g.fillRect(bx + bw - 1, by, 1, bh);

    // Little tail pointing to worker
    const tailX = Math.max(bx + 4, Math.min(bx + bw - 6, Math.round(agent.x - 1)));
    g.fillStyle = bg;
    g.fillRect(tailX, by + bh - 1, 3, 3);
    g.fillStyle = border;
    g.fillRect(tailX, by + bh + 1, 3, 1);

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = fg;
    g.fillText(text, bx + bw / 2, by + bh / 2 + 0.5);
  }

  _drawParticlesAndFireworks(g) {
    // CLI data stream particles
    for (const p of this.dataParticles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      g.globalAlpha = alpha;
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    g.globalAlpha = 1;

    // Spinning pixel coins
    const coinTick = Math.floor(this.time * 12);
    for (const p of this.coinParticles) {
      g.globalAlpha = Math.max(0, Math.min(1, p.life / 0.5));
      drawObjectSprite(g, 'coin', p.x - 4, p.y - 4, 1, p.frame + coinTick);
    }
    g.globalAlpha = 1;

    // Firework rockets
    for (const r of this.fireworkRockets) {
      if (r.delay > 0) continue;
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(r.x), Math.round(r.y), 2, 4);
      g.fillStyle = r.colors[0];
      g.fillRect(Math.round(r.x), Math.round(r.y + 4), 2, 3);
    }

    // Firework starburst sparks
    for (const s of this.fireworkSparks) {
      g.globalAlpha = Math.max(0, s.life / s.maxLife);
      g.fillStyle = s.color;
      g.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
    }
    g.globalAlpha = 1;

    // Floating pixel reward texts
    g.font = 'bold 9px "Courier New", "Microsoft JhengHei", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, Math.min(1, ft.life / 0.7));
      g.globalAlpha = alpha;
      const fx = Math.round(ft.x);
      const fy = Math.round(ft.y);
      // Crisp 1px dark outline
      g.fillStyle = '#090d1a';
      g.fillText(ft.text, fx - 1, fy);
      g.fillText(ft.text, fx + 1, fy);
      g.fillText(ft.text, fx, fy - 1);
      g.fillText(ft.text, fx, fy + 1);
      g.fillStyle = ft.color;
      g.fillText(ft.text, fx, fy);
    }
    g.globalAlpha = 1;
  }

  _drawLaunchBanner(g) {
    if (this.launchBannerTimer <= 0 || !this.launchBannerText) return;
    const alpha = Math.min(1, this.launchBannerTimer);
    g.globalAlpha = alpha;

    const bw = 280;
    const bh = 22;
    const bx = Math.round((LOGICAL_W - bw) / 2);
    const by = 18;

    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.fillRect(bx, by, bw, bh);
    g.strokeStyle = Math.floor(this.time * 6) % 2 === 0 ? '#fde047' : '#f472b6';
    g.lineWidth = 1.5;
    g.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

    g.font = 'bold 10px "Courier New", "Microsoft JhengHei", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fef08a';
    g.fillText(this.launchBannerText, LOGICAL_W / 2, by + bh / 2 + 0.5);
    g.globalAlpha = 1;
  }
}
