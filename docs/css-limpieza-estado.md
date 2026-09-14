# Limpieza de los `legacy.css` — dónde quedamos

Nota de traspaso. Última actualización: 8 de septiembre (corte &lt;1.5k patient).

## Criterio

- Partir por **pantalla / dominio**, no por componente React (salvo UI compartida en `@therapy/ui`).
- Umbral de esta pasada: **nada > ~1.5k líneas** en patient.

## Paciente — estado actual (todos &lt; 1.5k)

| archivo | líneas |
| --- | ---: |
| `styles/legacy.css` | ~1.374 |
| `modules/app/styles/portal-shell.css` | ~1.484 |
| `modules/app/styles/portal-nav.css` | ~1.183 |
| `modules/app/styles/portal-notifications.css` | ~359 |
| `modules/home/home.css` | ~1.391 |
| `modules/home/home-sessions.css` | ~617 |
| `modules/home/home-history.css` | ~246 |
| `modules/home/home-promo.css` | ~839 |
| `modules/home/home-dashboard.css` | ~1.498 |
| `modules/home/home-widgets.css` | ~1.387 |
| `modules/home/home-patient.css` | ~1.221 |
| `modules/home/home-mobile.css` | ~849 |
| `modules/booking/sessions.css` | ~1.128 |
| `modules/booking/sessions-calendar.css` | ~723 |
| `modules/booking/sessions-booking-ui.css` | ~614 |
| `modules/booking/sessions-lists.css` | ~407 |
| `modules/booking/sessions-mobile.css` | ~1.222 |
| `modules/booking/session-detail.css` | ~458 |
| `modules/booking/session-booking.css` | ~1.084 |
| `modules/booking/availability.css` | ~699 |
| `modules/checkout/checkout.css` | ~1.134 |
| `modules/checkout/checkout-trial.css` | ~561 |
| `modules/emotional-diary/emotional-diary.css` | ~1.441 |
| `modules/emotional-diary/diary-entry.css` | ~905 |
| `modules/emotional-diary/diary-charts.css` | ~281 |
| `modules/emotional-diary/diary-mobile.css` | ~180 |
| `mobile-portal-flat.css` | ~707 |

Imports en `styles/index.css`. `npm run css:check` OK. Excepciones en `scripts/css-migration.config.json`.

## Qué sigue (opcional)

- Profesional / admin: mismo patrón por pantalla
- Dead CSS / splits finos si algún archivo vuelve a crecer
- Componentizar CSS **solo** cuando un bloque se reusa entre pantallas → `@therapy/ui`