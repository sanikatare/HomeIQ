# syntax=docker/dockerfile:1.7
# ==============================================================================
# HomeIQ — Production Full-Stack Container (Render / Cloud Run / Docker)
# Bundles React 19 Vite SPA + Node 22 Production API Server + Python 3 Eval Runtime
# ==============================================================================

FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/datasets ./datasets
COPY --from=builder /app/evaluation ./evaluation
COPY --from=builder /app/.homeiq_data ./.homeiq_data

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT:-3000}/health/live || exit 1

CMD ["node", "--experimental-strip-types", "server.ts"]
