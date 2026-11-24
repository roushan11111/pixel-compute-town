# PixelCompute Town (像素算力鎮) — Zero-Dependency Production Container
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3456 \
    HOST=0.0.0.0 \
    PIXEL_DATA_DIR=/app/data

# Copy application metadata and source files (zero external npm dependencies)
COPY package.json ./
COPY server.mjs ./
COPY src ./src
COPY public ./public
COPY bin ./bin
COPY docs ./docs

# Ensure persistent data directory exists and is writable by the non-root node user
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3456

# Built-in HTTP healthcheck using Node.js native fetch (no curl/wget required)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3456) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.mjs"]
