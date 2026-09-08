# Limpieza de los `legacy.css` — dónde quedamos

Nota de traspaso para retomar sin reconstruir el análisis. Última actualización: 8 de septiembre.

## Dónde estamos

| archivo | antes | ahora |
| --- | --- | --- |
| `apps/patient/src/styles/legacy.css` | 28.819 | 24.750 |
| `apps/professional/src/styles/legacy.css` | 21.746 | 20.199 |
| `apps/admin/src/styles/legacy.css` | 8.823 | 7.542 |
| **total** | **59.388** | **52.491** |

6.897 líneas menos en neto (7.320 borradas, ~420 reescritas como ajustes propios de cada portal).

Nada de esto está commiteado todavía.

## Qué se hizo

**Compartir lo duplicado.** Lo que estaba copiado en dos o tres portales pasó a `packages/ui/src/*.css`,
escrito una sola vez: `srOnly`, `inAppBack`, `calendarConsent`, `preferencesModal` (modal + grupos +
opciones), `sessionActionIcon`, `sessionModal`, `intakeCard`, `onboardingDraftNotice`. Cada portal
conserva en su `legacy.css` solo lo que tiene distinto, con un comentario que dice dónde está la base.

`packages/ui/package.json` exporta `"./*.css"` con comodín: una hoja nueva funciona sin anotarla.

**Borrar código muerto.** 479 clases definidas en CSS que ningún componente renderiza (296 paciente,
89 profesional, 94 admin). Verificadas una por una contra el código de las tres apps antes de tocarlas.

## Lo que hay que saber antes de seguir

**Borrar por familia es peligroso.** El primer intento fue borrar todo lo que empezara con
`dashboard-ml`: de esas 189 clases, **164 estaban vivas**. Siempre borrar por nombre exacto y cruzar
cada nombre contra el código.

**Cuidado con los límites de palabra al buscar.** `rg "\bbanner-copy\b"` matchea dentro de
`dashboard-ml-feature-banner-copy`. Para verificar uso real hay que usar
`(^|[^A-Za-z0-9_-])nombre([^A-Za-z0-9_-]|$)`.

**Compartir una hoja puede agregar estilos donde no había.** Al mover `intake-card` le sumé al portal
profesional un padding de mobile que antes no tenía. Lo atajó `npm run css:check`; siempre correrlo.

**Diez clases quedaron excluidas del borrado** por ser palabras genéricas (`warning`, `partial`,
`highlight`, `thumb`, `selectable`, `duplicate`, `auth-lead`, `menu-sep`, `driver-overlay`,
`driver-popover`). Aparecen en código pero no está claro si son estas mismas.

## Herramientas

| comando | qué hace |
| --- | --- |
| `npm run css:snapshot` | Guarda el estado actual como referencia en `.tmp/css-before.json` |
| `npm run css:check` | Compara contra la referencia: avisa si algo cambió de aspecto |
| `npm run css:dead` | Lista clases definidas que nadie usa (`--app patient --dump` para el detalle) |
| `npm run css:dup` | Lista lo que está repetido entre portales |
| `npm run css:family -- --family X --apps a,b` | Muestra las reglas de una familia en cada app |

Las excepciones ya revisadas (borrados intencionales, reordenamientos verificados) están en
`scripts/css-migration.config.json` con el motivo de cada una.

El snapshot vive en `.tmp/` y está al día. Si se pierde, `npm run css:snapshot` lo regenera, pero
entonces la referencia pasa a ser el estado de ese momento.

## Lo que sigue

Compartir entre portales ya casi no tiene margen: quedan **38 selectores repetidos**. El resto del
tamaño es código que pertenece a una sola app.

Lo que sí resolvería el tamaño es **partir cada archivo por pantalla**, guardando cada pedazo al lado
del componente que lo usa. No se borra nada ni cambia cómo se ve. Las secciones más pesadas:

- Paciente (257 secciones): `dashboard-ml` ~3.400 líneas, `patient-dashboard` ~1.250,
  `sessions-booking` ~730, `sessions-calendar` ~670.
- Profesional (137 secciones): `pro-web` ~2.250, `pro-dashboard` ~1.200, `pro-profile` ~1.200,
  `pro-patient` ~810.

Quedó pendiente elegir el rumbo entre: partir por pantalla (lo recomendado), cazar código muerto en
los CSS que no toqué (`mobile-portal-flat.css` 3.970 líneas, `emotional-diary.css` 2.571), o terminar
de compartir esos 38 selectores.

## Pendiente de otro tema (onboarding)

- El cuestionario de la app de celular todavía pierde el progreso: esa app no usa `@therapy/ui`.
- Falta la prueba visual haciendo clic en el navegador; quedó bloqueada por el MCP inestable.
