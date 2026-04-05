# API en Railway: monorepo npm workspaces (evita fallos Nixpacks + npm ci / EBUSY).
FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci && npm run build:api

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "@therapy/api"]
