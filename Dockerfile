# API en Railway: monorepo npm workspaces (evita fallos Nixpacks + npm ci / EBUSY).
FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci && npm run build:api

# No fijar API_LISTEN_HOST: en el contenedor Linux Node usa el bind por defecto (acepta probes IPv4/IPv6 según el sistema). Forzar 0.0.0.0 o :: rompió healthchecks en algunos deploys.
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "@therapy/api"]
