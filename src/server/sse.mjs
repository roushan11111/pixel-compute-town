// PixelCompute Town — Server-Sent Events (SSE) Real-Time Broadcast Hub

export class SseHub {
  constructor() {
    this.clients = new Set();
  }

  handleConnection(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const client = {
      res,
      connectedAt: Date.now(),
      heartbeatTimer: null,
    };

    this.clients.add(client);

    this._writeEvent(res, 'connected', {
      ok: true,
      clients: this.clients.size,
      timestamp: new Date().toISOString(),
    });

    client.heartbeatTimer = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        this._removeClient(client);
      }
    }, 20_000);

    // Don't hold Node event loop open if server is closing
    if (typeof client.heartbeatTimer.unref === 'function') {
      client.heartbeatTimer.unref();
    }

    req.on('close', () => {
      this._removeClient(client);
    });

    res.on('error', () => {
      this._removeClient(client);
    });
  }

  _writeEvent(res, event, data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    res.write(`event: ${event}\ndata: ${payload}\n\n`);
  }

  _removeClient(client) {
    if (client.heartbeatTimer) {
      clearInterval(client.heartbeatTimer);
      client.heartbeatTimer = null;
    }
    this.clients.delete(client);
  }

  broadcast(event, data) {
    for (const client of Array.from(this.clients)) {
      try {
        this._writeEvent(client.res, event, data);
      } catch {
        this._removeClient(client);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }

  closeAll() {
    for (const client of Array.from(this.clients)) {
      this._removeClient(client);
      try {
        client.res.end();
      } catch {
        // ignore
      }
    }
  }
}

export function createSseHub() {
  return new SseHub();
}
