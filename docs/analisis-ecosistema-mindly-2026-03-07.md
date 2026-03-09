# Analisis de ecosistema competidor (Mindly)

**Fecha:** 7 de marzo de 2026  
**Preparado para:** socios/stakeholders de Motivarte  
**Nivel de certeza:** mixto (alta en flujo visible; media en stack backend; baja en arquitectura interna no publica)

---

## 1) Resumen ejecutivo

Mindly opera con un **modelo de doble embudo**:

1. **Sitio publico de adquisicion** (`mindly.la`) para SEO, contenido, confianza y captacion.
2. **Aplicacion transaccional separada** (`app.mindly.la`) para registro/login, matching con profesionales, agenda, paquetes y chat.

Esto les permite:

- escalar marketing y producto por separado,
- optimizar conversion por etapas (contenido -> test -> prueba -> compra),
- instrumentar analitica fina del funnel (Ads/GTM/Hotjar),
- mantener una UX de app mas limpia para operacion recurrente del paciente.

Para Motivarte en USA, esta arquitectura es correcta como referencia, pero conviene fortalecer desde inicio:

- compliance (privacidad/consentimiento),
- modelo de disponibilidad del profesional,
- matching y conversion (trial -> paquete),
- base de datos y backend listos para crecimiento.

---

## 2) Que se observo del competidor

## 2.1 Capa publica (marketing / SEO)

- Navegacion por areas clinicas (ansiedad, depresion, etc.), tests, blog y contacto.
- CTA claros: **Iniciar sesion** y **Prueba ahora**.
- Estrategia de contenido para captacion organica (blog + tests + landing por problema).
- Pagina para especialistas (reclutamiento B2B2C).

## 2.2 Capa app (producto)

- `app.mindly.la/login`: login por email/password + opcion Google.
- `app.mindly.la/register`: alta de paciente con nombre, email y password + Google.
- Home de paciente con menu lateral: Inicio, Mis citas, Especialistas, Paquetes, Chat, Mi cuenta.
- Pantalla de especialistas con:
  - buscador,
  - filtros,
  - cards con experiencia/satisfaccion/precio,
  - CTA de perfil y agenda.

## 2.3 Herramientas externas detectadas

- Enlaces a `app.mindly.la` desde web publica.
- Enlace a **Typeform** para flujo externo (ej.: para especialistas/lead capture).
- Senales de instrumentacion de marketing/analitica (GTM/Ads/Hotjar) observadas en DevTools.

---

## 3) Sobre el link de Typeform privado

Link consultado: `https://www.typeform.com/private-typeform?...`

Interpretacion:

- Es una pagina de Typeform que aparece cuando el formulario es **privado** o no tenes permisos de acceso.
- Los parametros `utm_source`, `utm_medium`, `utm_campaign` son de trazabilidad de marketing (atribucion), no un error tecnico por si mismo.

Impacto para Motivarte:

- Si usas formularios externos para onboarding, hay que definir si son publicos, protegidos o embebidos.
- Conviene no depender de un flujo externo para etapas core (intake clinico, matching, reserva, consentimiento).

---

## 4) Hipotesis de arquitectura de Mindly (alto nivel)

**Confirmado por observacion:**

- Front publico y app en subdominios separados.
- Funnel tipo: landing -> prueba/registro -> app -> seleccion profesional -> cita/paquete.

**Inferido (no confirmado internamente):**

- Frontend moderno tipo SPA/SSR (patrones y artefactos web observables).
- Integracion de analitica y performance marketing.
- Uso de formularios externos para ciertos sub-flujos.

---

## 5) Benchmark funcional contra tu producto actual

## 5.1 Lo que ya tenes bien encaminado

- Modulo paciente/profesional/admin separado.
- Flujo de sesion de prueba + compra de paquetes + reserva.
- Chat 1:1 y agenda base.
- Preparacion de multidioma y multimoneda.

## 5.2 Brechas para cerrar antes de salida comercial fuerte

1. **Onboarding estructurado real** (intake + scoring + riesgos + recomendaciones).
2. **Matching asistido por reglas** (y luego IA), no solo listado.
3. **Persistencia robusta + observabilidad** (logs, metricas, alertas).
4. **Pagos y conciliacion** (Stripe completo + webhooks + estados).
5. **Operacion profesional** (disponibilidad avanzada, reprogramaciones, ausencias).
6. **Compliance USA** (consentimientos, privacidad, retencion, acceso por roles).

---

## 6) Ecosistema recomendado para Motivarte (version socios)

## 6.1 Capa 1: Growth Website (publica)

- Landing por problema (ansiedad, duelo, etc.)
- Test orientativo (no diagnostico) para captacion
- Blog SEO
- CTA principal a registro en app
- Pagina para reclutamiento de profesionales

## 6.2 Capa 2: App transaccional (paciente/profesional/admin)

- Auth (email + OAuth)
- Intake y matching
- Reserva de sesiones y paquetes
- Videollamada
- Chat asincronico
- Historial y facturacion

## 6.3 Capa 3: Core backend y datos

- API central (dominio terapeutico)
- DB relacional (MySQL en Railway, segun tu preferencia)
- Redis para cache/sesiones/colas
- Webhooks de Stripe
- Motor de notificaciones (email/whatsapp/push)

## 6.4 Capa 4: Inteligencia y calidad

- Auditor IA de textos (opt-in + consentimiento)
- Alertas de riesgo (reglas + IA asistiva)
- Panel de calidad de sesion y conversion

---

## 7) Roadmap sugerido (30 / 60 / 90 dias)

## 0-30 dias (MVP comercial controlado)

- End-to-end estable: registro -> compra -> reserva -> sesion -> seguimiento.
- Stripe productivo con webhooks.
- Agenda profesional con UX amigable.
- Base de datos consolidada y backups.
- i18n completo en todas las vistas.

## 31-60 dias (operacion y crecimiento)

- Matching mejorado por perfil.
- Embudo medible completo (CAC, trial->pago, retencion).
- Notificaciones transaccionales.
- Admin de usuarios/profesionales/pacientes robusto.

## 61-90 dias (escala)

- Hardening de concurrencia/latencia.
- Observabilidad completa (APM + logs + trazas).
- Preparacion mobile-first y base para apps nativas.
- Primera version de auditor IA con guardrails.

---

## 8) Riesgos y controles

- **Riesgo legal/compliance:** consentimientos, privacidad, terminos por rol.
- **Riesgo clinico:** no reemplazar criterio profesional; IA como apoyo.
- **Riesgo operativo:** caidas en pago/video/chat -> plan de contingencia.
- **Riesgo de conversion:** friccion alta en onboarding.

Mitigacion:

- trazabilidad completa de eventos,
- feature flags,
- playbooks de incidentes,
- A/B de onboarding y pricing.

---

## 9) Due diligence competitiva sugerida (proxima iteracion)

1. Mapear todo el journey con cuenta real (sin scraping invasivo).
2. Medir tiempos por paso y fricciones.
3. Documentar pricing real, descuentos y paquetes.
4. Analizar emails/eventos post-registro.
5. Relevar politicas legales visibles (terminos/privacidad/cancelacion).

---

## 10) Conclusiones para presentar

- Mindly parece operar con una estrategia madura de **adquisicion + conversion + retencion** en capas.
- Tu producto ya tiene base funcional correcta para competir.
- El salto a nivel “inversion/escala” depende de: 
  - robustez backend,
  - UX de agenda/matching,
  - instrumentacion de negocio,
  - compliance USA desde el dia 1.

---

## Fuentes y evidencia

### Fuentes publicas

- Mindly home: [https://mindly.la/](https://mindly.la/)
- Mindly blog: [https://mindly.la/blog](https://mindly.la/blog)
- Mindly para especialistas: [https://mindly.la/para-especialistas](https://mindly.la/para-especialistas)
- Mindly contacto: [https://mindly.la/contact-us](https://mindly.la/contact-us)
- Mindly test (ejemplo): [https://mindly.la/tests/test-depresion-online](https://mindly.la/tests/test-depresion-online)
- Typeform Private page: [https://www.typeform.com/private-typeform](https://www.typeform.com/private-typeform)
- Typeform UTM basics: [https://help.typeform.com/hc/en-us/articles/360029249111-What-are-UTM-parameters-and-where-do-I-use-them](https://help.typeform.com/hc/en-us/articles/360029249111-What-are-UTM-parameters-and-where-do-I-use-them)
- Stripe Checkout (official): [https://docs.stripe.com/payments/checkout](https://docs.stripe.com/payments/checkout)
- Stripe multi-currency presentment (official): [https://docs.stripe.com/payments/currencies/localize-prices](https://docs.stripe.com/payments/currencies/localize-prices)
- Daily HIPAA support (official): [https://www.daily.co/blog/hipaa-compliant-video-api/](https://www.daily.co/blog/hipaa-compliant-video-api/)
- Twilio programmable video (official docs): [https://www.twilio.com/docs/video](https://www.twilio.com/docs/video)
- HHS telehealth guidance (official): [https://telehealth.hhs.gov/](https://telehealth.hhs.gov/)

### Evidencia observada en tus capturas

- Flujo login/register en `app.mindly.la`.
- Home paciente y listado de especialistas.
- Uso de rutas internas `/mi-espacio/*`.
- Señales de scripts de analitica y artefactos de frontend en DevTools.

