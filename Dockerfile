# API en Railway: monorepo npm workspaces (evita fallos Nixpacks + npm ci / EBUSY).
FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci && npm run build:api

# Railway/Docker: forzar bind en todas las interfaces (evita healthcheck "unavailable").
ENV NODE_ENV=production
ENV API_LISTEN_HOST=0.0.0.0
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "@therapy/api"]
