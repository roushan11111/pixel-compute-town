import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PORT = Number(process.env.PORT || 3456);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readSavedState() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeSavedState(stateObj) {
  await ensureDataDir();
  await fs.writeFile(STATE_FILE, JSON.stringify(stateObj, null, 2), 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

async function parseJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw new Error('Payload too large');
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, service: 'pixel-compute-town', version: '0.1.0' });
    }

    if (url.pathname === '/api/state' && req.method === 'GET') {
      const saved = await readSavedState();
      return sendJson(res, 200, { state: saved });
    }

    if (url.pathname === '/api/state' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body || typeof body.state !== 'object') {
        return sendJson(res, 400, { error: 'Missing state object' });
      }
      await writeSavedState(body.state);
      return sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
    }

    if (url.pathname === '/api/reset' && req.method === 'POST') {
      try {
        await fs.unlink(STATE_FILE);
      } catch {
        // File may not exist yet
      }
      return sendJson(res, 200, { ok: true });
    }

    // Serve static files from public/
    const safeRelPath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
    const targetPath = path.resolve(PUBLIC_DIR, safeRelPath);
    if (!targetPath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    try {
      const fileData = await fs.readFile(targetPath);
      const ext = path.extname(targetPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(fileData);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    }
  } catch (err) {
    console.error('[Server Error]', err);
    sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`PixelCompute Town MVP running at http://localhost:${PORT}`);
});
