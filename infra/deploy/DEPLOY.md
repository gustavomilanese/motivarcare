# Despliegue: Railway (API) + Hostinger (frontends / VPS)

Guía paso a paso para **MotivarCare / therapy-platform**. La API es **Node + Express + Prisma + MySQL + Redis**; en producción hace falta **dos procesos**: servidor HTTP y **worker outbox** (Stripe y efectos async).

Archivos de apoyo en el repo:

- `railway.toml` y `nixpacks.toml` (raíz) — build/start de la API en Railway.
- `hostinger-nginx-api.example.conf` — ejemplo de reverse proxy si la API corre en un VPS Hostinger.

---

## Parte A — Railway (backend)

### A1. Cuenta y proyecto

1. Entrá a [railway.app](https://railway.app) e iniciá sesión (GitHub recomendado).
2. **New project** → **Deploy from GitHub repo** → elegí `therapy-platform` (o el nombre de tu fork).
3. Railway detectará `railway.toml` en la **raíz** del repo.

### A2. MySQL y Redis

1. En el proyecto, **New** → **Database** → **Add MySQL**.
2. Repetí: **New** → **Add Redis**.
3. Abrí cada servicio → pestaña **Variables** → copiá las URLs internas (Railway suele exponer `MYSQL_URL`, `REDIS_URL` o similares).

En el servicio de la **API**, agregá variables (o usá **Reference** para enlazar la variable del plugin):

- `DATABASE_URL` — URL MySQL en formato Prisma, por ejemplo la que genera Railway para MySQL. Si solo ves `MYSQL_URL`, puede que necesites armar el string `mysql://user:pass@host:port/db` según el panel de Railway.
- `REDIS_URL` — URL completa del Redis (ej. `redis://default:...@...`).

**SSL MySQL:** si Prisma falla con SSL, probá añadir a la URL parámetros según [documentación Prisma + MySQL](https://www.prisma.io/docs/orm/overview/databases/mysql) (p. ej. `?sslaccept=strict` o el modo que indique el proveedor).

### A3. Servicio API (primer servicio)

1. El deploy desde GitHub crea un servicio; dejalo como **API principal**.
2. **Settings** → confirmá que la **root directory** sea la raíz del monorepo (vacío o `/`), no `apps/api` solo.
3. **Build** y **Deploy** deberían tomar:
   - Build: `npm ci && npm run build:api` (desde `railway.toml`).
   - Start: `npm run start -w @therapy/api`.

4. En **Variables**, agregá al menos:

| Variable | Valor / notas |
|----------|----------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | (MySQL) |
| `REDIS_URL` | (Redis) |
| `JWT_SECRET` | Cadena larga aleatoria (nunca commitear) |
| `CORS_ORIGINS` | URLs HTTPS de tus frontends, separadas por coma (sin barra final) |
| `TRUST_PROXY` | `true` |
| `API_PUBLIC_URL` | URL pública de esta API, ej. `https://xxxx.up.railway.app` |
| `PATIENT_APP_URL` | URL del portal paciente en prod |
| `PROFESSIONAL_APP_URL` | URL portal profesional |
| `ADMIN_APP_URL` | URL portal admin |
| `API_RATE_LIMIT_BACKEND` | `redis` (recomendado si Redis está bien configurado) |
| `STRIPE_SECRET_KEY` | Live o test |
| `STRIPE_WEBHOOK_SECRET` | Del dashboard Stripe |
| `DAILY_API_KEY`, `DAILY_DOMAIN` | Si usás video Daily |
| `RESEND_API_KEY`, `EMAIL_FROM` | Si enviás mail |
| `EMAIL_VERIFICATION_REQUIRED` | `true` o `false` según producto |

Copiá el resto desde `.env.example` en la raíz del repo según necesites.

**Puerto:** Railway inyecta `PORT`; la app ya lo usa.

### A4. Esquema de base de datos (primera vez y tras cambios de Prisma)

El repo hoy usa **`prisma db push`** (no hay carpeta `migrations` versionada en el flujo habitual).

Desde tu máquina, con `DATABASE_URL` apuntando a la base **de Railway**:

```bash
cd /ruta/al/therapy-platform
export DATABASE_URL='mysql://...'   # pegar la de Railway
npm run db:push:remote
```

O desde Railway: **New** → **Empty service** → **Run** one-off con imagen Node y el mismo repo, o usá la CLI de Railway para ejecutar un comando. Lo más simple suele ser correr `db:push:remote` local con la URL de prod.

### A5. Segundo servicio: worker Outbox

1. **New** → **GitHub Repo** → **el mismo repositorio** (o **Duplicate** del servicio API y cambiá solo el start).
2. **Settings** → **Deploy** → **Custom start command**:

   ```bash
   npm run start:outbox -w @therapy/api
   ```

3. **Variables:** duplicá las mismas que el servicio API (sobre todo `DATABASE_URL`, `REDIS_URL`, `NODE_ENV`, Stripe, etc.). En Railway podés **Share variables** entre servicios del mismo proyecto.

4. **Build:** puede ser el mismo `build:api` o un build mínimo; lo importante es que exista `apps/api/dist/workers/outbox.worker.js`. Si el segundo servicio reutiliza la misma imagen/build que el primero, configurá según la opción que ofrezca Railway (dos servicios con mismo build, distinto start).

   Si Railway construye dos veces: está bien; el `buildCommand` puede ser el mismo `npm ci && npm run build:api`.

### A6. Dominio público y Stripe

1. En el servicio API → **Settings** → **Networking** → **Generate domain** o conectá dominio propio.
2. Actualizá `API_PUBLIC_URL` y `CORS_ORIGINS` con las URLs finales.
3. En Stripe → Webhooks → URL:

   `https://TU-API/api/v1/payments/stripe/webhook`

   (o `/api/payments/...` según lo que expongas; revisá `apps/api/src/app.ts`).

### A7. Comprobar

- `GET https://TU-API/health/live`
- `GET https://TU-API/health/ready` → debe ser **200** si MySQL (y Redis si aplica) responden.

---

## Parte B — Hostinger

### B1. Qué producto usar

- **Hosting compartido solo PHP:** no sirve para esta API Node.
- **VPS Hostinger:** sí — Node + PM2 + Nginx (ver ejemplo `hostinger-nginx-api.example.conf`).
- **Solo sitios estáticos (frontends):** construís en tu PC y subís la carpeta `dist` de cada app Vite.

### B2. Frontends estáticos (admin, patient, professional, landing)

Las apps web leen la URL del API con **`VITE_API_URL`** en tiempo de build. Antes de compilar, creá `.env` / `.env.production` en la **raíz de cada app** (o exportá en shell) con:

```bash
export VITE_API_URL=https://tu-api.up.railway.app
```

En tu máquina (con Node 20+):

```bash
npm ci
VITE_API_URL=https://tu-api.up.railway.app npm run build -w @therapy/admin
VITE_API_URL=https://tu-api.up.railway.app npm run build -w @therapy/patient
VITE_API_URL=https://tu-api.up.railway.app npm run build -w @therapy/professional
VITE_API_URL=https://tu-api.up.railway.app npm run build -w @therapy/landing
```

Cada app deja salida en su `dist/` (Vite). Subí el contenido de cada `dist` a:

- un subdirectorio del dominio, o
- subdominios distintos (`admin.`, `app.`, `pro.`, `www`),

según cómo configures **Vite `base`** y rutas. Si usás React Router en modo **history**, Nginx debe hacer **try_files** al `index.html` (config típica SPA).

**Variables de entorno en front:** las apps suelen leer la URL del API en build-time (`import.meta.env.VITE_...`) o en runtime. Revisá cada `apps/*/vite` y `.env` de ejemplo para definir la URL pública de la API **antes** del `npm run build`.

### B3. API en VPS Hostinger (si no usás Railway)

1. Instalá **Node 22** (nvm recomendado), **git**, **PM2** (`npm i -g pm2`).
2. Cloná el repo, en la raíz:

   ```bash
   npm ci
   npm run build:api
   ```

3. Creá `.env` en la raíz del repo (o variables de sistema) con las mismas claves que en Railway.
4. PM2:

   ```bash
   pm2 start "npm run start -w @therapy/api" --name therapy-api --cwd /ruta/al/therapy-platform
   pm2 start "npm run start:outbox -w @therapy/api" --name therapy-outbox --cwd /ruta/al/therapy-platform
   pm2 save && pm2 startup
   ```

5. Nginx como reverse proxy a `127.0.0.1:4000` (ajustá `PORT` si cambiás).
6. Certificado TLS con Certbot (Let’s Encrypt).

---

## Parte C — Checklist rápido

- [ ] MySQL y Redis accesibles desde la API.
- [ ] `DATABASE_URL` y `REDIS_URL` correctos.
- [ ] `npm run build:api` pasa en local.
- [ ] `db:push:remote` (o equivalente) aplicado contra prod.
- [ ] Servicio API + servicio Outbox corriendo.
- [ ] `GET /health/ready` = 200.
- [ ] `CORS_ORIGINS` incluye los dominios reales de los frontends.
- [ ] Webhook Stripe apunta a la URL pública y el secret coincide.
- [ ] Frontends buildados con la URL correcta del API.

---

## Soporte en código (ya incluido en el repo)

- `npm run build:api` — `prisma generate` + compilación TypeScript del paquete `@therapy/api`.
- `railway.toml` — build y start del servicio principal.
- `nixpacks.toml` — Node 22 para Nixpacks.
- Script Prisma local (`prisma-with-root-env.mjs`) compatible con entornos sin `.env` (solo variables de entorno).

Si algo falla en el build de Railway, revisá el log: suele ser `DATABASE_URL` ausente en la fase de build (Prisma generate no lo necesita; si falla, pegá el error completo).
