# MotivarCare — tecnologías (desa y prod)

Resumen corto para compartir. Un solo repo (monorepo) con API, portales web, landings y apps móviles.

## Qué es

Plataforma de terapia online: **paciente**, **profesional** y **admin**. El backend es una API Node. Los fronts son apps web (React). Hay apps nativas (Expo) en camino; hoy el uso principal es la web, también en el celular.

Idiomas: español, inglés, portugués. Precios en moneda local según el país del paciente.

---

## Lo mismo en desa y en prod

| Pieza | Tecnología |
|---|---|
| Lenguaje | TypeScript, Node 20+ |
| API | Express |
| Base de datos | MySQL + Prisma |
| Cache / colas / locks | Redis |
| Web | React + Vite |
| Móvil nativo | Expo / React Native |
| Auth | JWT (el usuario se loguea, el token viaja en cada pedido) |
| Mail | Resend |
| Calendario / Meet | Google Calendar |
| Video de sesión | Daily (y Meet si hay Calendar) |
| IA (entrevista Maca) | OpenAI |

Pagos: **dLocal Go** para LATAM (en desa usamos **sandbox**). Stripe sigue en el código por el flujo histórico / otros mercados.

---

## Desarrollo (tu Mac)

Corrés casi todo en la máquina. Docker solo levanta **MySQL** (tope ~448 MB). Redis es opcional.

- **API:** `http://localhost:4000`
- **Web paciente:** `http://localhost:5173`
- **Web profesional:** `http://localhost:5174` (no se levanta con `npm run dev`)
- **Web admin:** `http://localhost:5175` (idem)
- **Landings / Expo:** solo con `npm run dev:all` — en 8 GB no lo uses

**Mac 8 GB:** `npm run dev` = Docker + API + paciente. Docker Desktop → Resources → Memory **1.5 GB**.

Los fronts hablan con la API local. Los datos son de tu base local (se puede seedear con usuarios demo).

---

## Producción

Al hacer **push a `main`** se disparan los deploys.

| Qué | Dónde corre |
|---|---|
| API + worker (outbox: pagos, mails, jobs) | **Railway** (`api.motivarcare.com`) |
| MySQL y Redis de prod | **Railway** (plugins del mismo proyecto) |
| Portales web y landings | **Vercel** (dominios tipo `www.motivarcare.com`, `app.motivarcare.com`) |
| Apps nativas (cuando hay build de store) | **EAS / Expo** → TestFlight / Play interno |

El front de prod apunta a la API de prod (`VITE_API_URL` / `https://api.motivarcare.com`). Un cambio solo en la laptop **no** llega a prod hasta commit + push.

dLocal en prod usaría credenciales live; hoy el trabajo de cobros está en **sandbox**.

---

## Mapa mental

```
Celular o notebook
        │
        ▼
  Web (Vercel)  o  Expo (cuando esté publicada)
        │
        ▼
  API Node (Railway)
        │
        ├── MySQL   (usuarios, turnos, chat, intake…)
        ├── Redis   (sesiones cortas, locks, colas)
        ├── dLocal  (cobro)
        ├── Google  (calendario)
        └── OpenAI  (Maca)
```

---

## Cómo se organiza el código

- `apps/api` — backend
- `apps/patient` — portal paciente (web; en el celu es la misma app, layout chico)
- `apps/professional` — portal profesional
- `apps/admin` — panel interno
- `apps/patient-landing`, `patient-landing-v2`, `landing` — sitios públicos
- `apps/patient-mobile`, `professional-mobile` — Expo
- `packages/` — código compartido (tipos, i18n, UI)
- `infra/docker` — MySQL de desa (Redis opcional)

---

## Una frase para el asado

> Web en React, API en Node, datos en MySQL. En la Mac Docker solo para la base. En internet: Vercel los sitios, Railway el servidor. Cobramos con dLocal, Maca habla con OpenAI.
