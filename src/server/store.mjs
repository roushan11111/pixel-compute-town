// PixelCompute Town — Atomic JSON Persistence Store with Concurrency Lock

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialState } from './seed.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

export class StateStore {
  constructor(options = {}) {
    const dataDir = options.dataDir || process.env.PIXEL_DATA_DIR || DEFAULT_DATA_DIR;
    this.dataDir = path.resolve(dataDir);
    this.stateFile = options.stateFile
      ? path.resolve(options.stateFile)
      : path.join(this.dataDir, 'state.json');
    this._cache = null;
    this._lockChain = Promise.resolve();
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

  async _readFromDisk() {
    try {
      const raw = await fs.readFile(this.stateFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.player && Array.isArray(parsed.projects)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  async _atomicWrite(stateObj) {
    await this._ensureDir();
    stateObj.updatedAt = new Date().toISOString();
    const serialized = JSON.stringify(stateObj, null, 2);
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

  async load() {
    return this._withLock(async () => {
      if (this._cache) {
        return this._cache;
      }
      const disk = await this._readFromDisk();
      if (disk) {
        this._cache = disk;
        return this._cache;
      }
      const fresh = createInitialState();
      await this._atomicWrite(fresh);
      this._cache = fresh;
      return this._cache;
    });
  }

  async save(nextState) {
    return this._withLock(async () => {
      await this._atomicWrite(nextState);
      this._cache = nextState;
      return this._cache;
    });
  }

  async mutate(mutator) {
    return this._withLock(async () => {
      if (!this._cache) {
        const disk = await this._readFromDisk();
        this._cache = disk || createInitialState();
      }
      const result = await mutator(this._cache);
      await this._atomicWrite(this._cache);
      return { state: this._cache, result };
    });
  }

  async reset() {
    return this._withLock(async () => {
      const fresh = createInitialState();
      await this._atomicWrite(fresh);
      this._cache = fresh;
      return this._cache;
    });
  }

  invalidateCache() {
    this._cache = null;
  }
}

export function createStore(options) {
  return new StateStore(options);
}
