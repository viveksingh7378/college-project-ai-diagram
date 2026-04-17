# ── React + Vite client ──
# Stage 1: build the React bundle
FROM node:20-alpine AS build

WORKDIR /app

# Build-time API base URL (Vite inlines VITE_* at build time).
# Default "/api" means the client calls the same origin, letting nginx proxy to the server.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: serve the static bundle with nginx
FROM nginx:1.27-alpine AS runtime

# nginx config that serves the SPA and proxies /api to the backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
