# ── Node.js Express backend for AI Diagram Agent ──
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Runtime
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Simple healthcheck against /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "index.js"]
