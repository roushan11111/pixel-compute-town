// PixelCompute Town — Native SQLite (node:sqlite) WAL Persistence Store with Seamless JSON Fallback
// Zero external npm dependencies

import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialState, ensureStateSchema } from './seed.mjs';
import { ensureProjectsProvenance } from './provenance.mjs';
import { ensureProjectBuckets } from './governance.mjs';

let DatabaseSync = null;
try {
  const sqliteMod = await import('node:sqlite');
  if (sqliteMod && typeof sqliteMod.DatabaseSync === 'function') {
    DatabaseSync = sqliteMod.DatabaseSync;
  }
} catch {
  DatabaseSync = null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const WORLD_STATE_KEY = 'world_state';
const MIRROR_SHA_KEY = 'mirror_json_sha256';
const MAX_AUDIT_ROWS = 500;

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function sanitizeAuditStr(val, maxLen) {
  if (typeof val !== 'string') return '';
  return val.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLen);
}

function hydrateState(parsed) {
  if (!parsed || typeof parsed !== 'object' || !parsed.player || !Array.isArray(parsed.projects)) {
    return null;
  }
  const upgraded = ensureStateSchema(parsed);
  ensureProjectsProvenance(upgraded.projects, upgraded.users);
  for (const proj of upgraded.projects) {
    ensureProjectBuckets(proj);
  }
  return upgraded;
}

export class StateStore {
  constructor(options = {}) {
    const dataDir = options.dataDir || process.env.PIXEL_DATA_DIR || DEFAULT_DATA_DIR;
    this.dataDir = path.resolve(dataDir);
    this.stateFile = options.stateFile
      ? path.resolve(options.stateFile)
      : path.join(this.dataDir, 'state.json');
    this.dbFile = options.dbFile
      ? path.resolve(options.dbFile)
      : path.join(this.dataDir, 'pixelcompute.db');
    this.mirrorJson = options.mirrorJson !== false;
    this._forceJson = options.driver === 'json' || !DatabaseSync;
    this.driver = this._forceJson ? 'json' : 'sqlite';
    this._db = null;
    this._closed = false;
    this._cache = null;
    this._lockChain = Promise.resolve();
    this._fallbackAudit = [];
    this._fallbackAuditSeq = 0;

    if (!this._forceJson) {
      this._initSqlite();
    }
  }

  _initSqlite() {
    if (this._db || this._forceJson || !DatabaseSync) return this._db;
    try {
      fsSync.mkdirSync(path.dirname(this.dbFile), { recursive: true });
      const db = new DatabaseSync(this.dbFile);
      db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA busy_timeout = 5000;
        CREATE TABLE IF NOT EXISTS kv_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          summary TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      this._db = db;
      this.driver = 'sqlite';
      this._closed = false;
      return this._db;
    } catch (err) {
      // Graceful fallback to atomic JSON if SQLite fails in constrained environment
      this._db = null;
      this._forceJson = true;
      this.driver = 'json';
      if (process.env.DEBUG_STORE === '1') {
        console.warn('[StateStore] Falling back to JSON driver:', err?.message || err);
      }
      return null;
    }
  }

  _ensureDb() {
    if (this._closed || this._forceJson) return null;
    if (!this._db) {
      return this._initSqlite();
    }
    return this._db;
  }

  async _withLock(fn) {
    const previous = this._lockChain;
    let release;
    this._lockChain = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  async _ensureDir() {
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
  }

  _getKv(key) {
    const db = this._ensureDb();
    if (!db) return null;
    try {
      const row = db.prepare('SELECT value FROM kv_state WHERE key = ?').get(key);
      return row && typeof row.value === 'string' ? row.value : null;
    } catch {
      return null;
    }
  }

  _setKv(key, value, updatedAt) {
    const db = this._ensureDb();
    if (!db) return false;
    const stmt = db.prepare(`
      INSERT INTO kv_state (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    stmt.run(key, value, updatedAt);
    return true;
  }

  _readFromSqlite() {
    const raw = this._getKv(WORLD_STATE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return hydrateState(parsed);
    } catch {
      return null;
    }
  }

  async _readRawJsonFile() {
    try {
      return await fs.readFile(this.stateFile, 'utf8');
    } catch {
      return null;
    }
  }

  async _readFromJsonFile() {
    const raw = await this._readRawJsonFile();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return hydrateState(parsed);
    } catch {
      return null;
    }
  }

  _writeToSqlite(serialized, updatedAt, mirrorSha = null) {
    const ok = this._setKv(WORLD_STATE_KEY, serialized, updatedAt);
    if (ok && mirrorSha) {
      this._setKv(MIRROR_SHA_KEY, mirrorSha, updatedAt);
    }
    return ok;
  }

  async _atomicWriteJson(serialized) {
    await this._ensureDir();
    const tmpFile = `${this.stateFile}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;

    await fs.writeFile(tmpFile, serialized, 'utf8');

    let lastErr = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await fs.rename(tmpFile, this.stateFile);
        return;
      } catch (err) {
        lastErr = err;
        if (err && (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES')) {
          await new Promise((r) => setTimeout(r, 25 * (attempt + 1)));
          continue;
        }
        break;
      }
    }

    // Fallback: direct overwrite then cleanup temp file (handles Windows lock edge cases)
    try {
      await fs.writeFile(this.stateFile, serialized, 'utf8');
      await fs.unlink(tmpFile).catch(() => {});
    } catch {
      await fs.unlink(tmpFile).catch(() => {});
      throw lastErr;
    }
  }

  async _persistState(stateObj) {
    ensureStateSchema(stateObj);
    const updatedAt = new Date().toISOString();
    stateObj.updatedAt = updatedAt;
    const serialized = JSON.stringify(stateObj, null, 2);

    if (this.driver === 'sqlite') {
      const mirrorSha = this.mirrorJson ? sha256Hex(serialized) : null;
      const wroteSqlite = this._writeToSqlite(serialized, updatedAt, mirrorSha);
      if (wroteSqlite && this.mirrorJson) {
        await this._atomicWriteJson(serialized).catch(() => {});
      } else if (!wroteSqlite) {
        await this._atomicWriteJson(serialized);
      }
    } else {
      await this._atomicWriteJson(serialized);
    }
  }

  appendAudit(eventType, summary) {
    const cleanType = sanitizeAuditStr(String(eventType || 'event'), 64) || 'event';
    const cleanSummary = sanitizeAuditStr(String(summary || ''), 500);
    const createdAt = new Date().toISOString();

    const db = this._ensureDb();
    if (db) {
      try {
        const insertStmt = db.prepare(
          'INSERT INTO audit_log (event_type, summary, created_at) VALUES (?, ?, ?)',
        );
        const info = insertStmt.run(cleanType, cleanSummary, createdAt);

        // Retain at most the newest MAX_AUDIT_ROWS entries
        db.exec(`
          DELETE FROM audit_log
          WHERE id NOT IN (
            SELECT id FROM audit_log ORDER BY id DESC LIMIT ${MAX_AUDIT_ROWS}
          )
        `);

        return {
          id: Number(info.lastInsertRowid),
          eventType: cleanType,
          summary: cleanSummary,
          createdAt,
        };
      } catch {
        // Fall through to in-memory audit buffer if DB is closed/unavailable
      }
    }

    this._fallbackAuditSeq += 1;
    const entry = {
      id: this._fallbackAuditSeq,
      eventType: cleanType,
      summary: cleanSummary,
      createdAt,
    };
    this._fallbackAudit.unshift(entry);
    if (this._fallbackAudit.length > MAX_AUDIT_ROWS) {
      this._fallbackAudit.length = MAX_AUDIT_ROWS;
    }
    return entry;
  }

  getAuditCount() {
    const db = this._ensureDb();
    if (db) {
      try {
        const row = db.prepare('SELECT COUNT(*) AS cnt FROM audit_log').get();
        return Number(row?.cnt || 0);
      } catch {
        // fallback below
      }
    }
    return this._fallbackAudit.length;
  }

  getRecentAudit(limit = 100) {
    const safeLimit = Math.max(1, Math.min(MAX_AUDIT_ROWS, Math.round(Number(limit) || 100)));
    const db = this._ensureDb();
    if (db) {
      try {
        const rows = db
          .prepare('SELECT id, event_type, summary, created_at FROM audit_log ORDER BY id DESC LIMIT ?')
          .all(safeLimit);
        return rows.map((r) => ({
          id: Number(r.id),
          eventType: r.event_type,
          summary: r.summary,
          createdAt: r.created_at,
        }));
      } catch {
        // fallback below
      }
    }
    return this._fallbackAudit.slice(0, safeLimit);
  }

  async _loadInitialOrDisk() {
    if (this.driver === 'sqlite') {
      const fromSqlite = this._readFromSqlite();
      if (fromSqlite) {
        // Check if legacy mirror state.json was externally edited while server was offline
        if (this.mirrorJson) {
          const rawJson = await this._readRawJsonFile();
          if (rawJson) {
            const diskSha = sha256Hex(rawJson);
            const expectedSha = this._getKv(MIRROR_SHA_KEY);
            if (expectedSha && diskSha !== expectedSha) {
              try {
                const externalState = hydrateState(JSON.parse(rawJson));
                if (externalState) {
                  await this._persistState(externalState);
                  this.appendAudit(
                    'external_json_sync',
                    `Synced externally edited ${path.basename(this.stateFile)} into SQLite WAL`,
                  );
                  return externalState;
                }
              } catch {
                // Ignore corrupted external file and trust SQLite WAL
              }
            }
          }
        }
        return fromSqlite;
      }

      // Seamless migration: import legacy data/state.json into SQLite WAL if present
      const legacyJson = await this._readFromJsonFile();
      if (legacyJson) {
        await this._persistState(legacyJson);
        this.appendAudit(
          'migration',
          `Seamless migration imported legacy ${path.basename(this.stateFile)} into SQLite WAL (${path.basename(this.dbFile)})`,
        );
        return legacyJson;
      }

      const fresh = createInitialState();
      await this._persistState(fresh);
      this.appendAudit('init', 'Initialized PixelCompute Town genesis world state in SQLite WAL');
      return fresh;
    }

    // JSON fallback driver
    const disk = await this._readFromJsonFile();
    if (disk) {
      return disk;
    }
    const fresh = createInitialState();
    await this._persistState(fresh);
    this.appendAudit('init', 'Initialized PixelCompute Town genesis world state (JSON fallback)');
    return fresh;
  }

  async load() {
    return this._withLock(async () => {
      if (this._cache) {
        return this._cache;
      }
      this._cache = await this._loadInitialOrDisk();
      return this._cache;
    });
  }

  async save(nextState, auditMeta = null) {
    return this._withLock(async () => {
      await this._persistState(nextState);
      this._cache = nextState;
      if (auditMeta && auditMeta.eventType) {
        this.appendAudit(auditMeta.eventType, auditMeta.summary || '');
      }
      return this._cache;
    });
  }

  async mutate(mutator, auditMeta = null) {
    return this._withLock(async () => {
      if (!this._cache) {
        this._cache = await this._loadInitialOrDisk();
      }
      const result = await mutator(this._cache);
      await this._persistState(this._cache);
      if (auditMeta && auditMeta.eventType) {
        this.appendAudit(auditMeta.eventType, auditMeta.summary || '');
      }
      return { state: this._cache, result };
    });
  }

  async reset() {
    return this._withLock(async () => {
      const fresh = createInitialState();
      await this._persistState(fresh);
      this._cache = fresh;
      this.appendAudit('world_reset', 'Reset PixelCompute Town world state to genesis defaults');
      return this._cache;
    });
  }

  async exportBackup(auditLimit = 200) {
    const state = await this.load();
    const clonedState = JSON.parse(JSON.stringify(state));
    return {
      exportedAt: new Date().toISOString(),
      driver: this.driver,
      auditCount: this.getAuditCount(),
      state: clonedState,
      recentAudit: this.getRecentAudit(auditLimit),
    };
  }

  invalidateCache() {
    this._cache = null;
  }

  close() {
    this._closed = true;
    if (this._db) {
      try {
        this._db.close();
      } catch {
        // ignore close errors during shutdown
      }
      this._db = null;
    }
  }
}

export function createStore(options) {
  return new StateStore(options);
}
