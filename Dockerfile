# API en Railway: monorepo npm workspaces (evita fallos Nixpacks + npm ci / EBUSY).
FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci && npm run build:api

# Railway/Docker: escuchar en :: (IPv6 any) para que en Linux acepte IPv4 mapeado e IPv6; 0.0.0.0 solo IPv4 y el healthcheck interno a veces pega por IPv6.
ENV NODE_ENV=production
ENV API_LISTEN_HOST=::
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "@therapy/api"]
