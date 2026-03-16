# Estado actual de funcionalidades (corte: 2026-03-16)

## 1) Objetivo del documento
Este documento resume, en lenguaje de negocio, qué está funcionando hoy, qué está parcial y qué falta cerrar para pasar a la siguiente etapa del producto.

Convención de estado:

- ✅ Implementado y funcionando
- 🟡 Implementado parcial (funciona, pero requiere cierre)
- 🔴 Pendiente

---

## 2) Vista global por actor

### Paciente
- ✅ Registro/login con API real.
- ✅ Verificación de email (token + link + bloqueo si no verifica, según configuración).
- ✅ Cuestionario clínico inicial (intake) persistido en DB.
- ✅ Selección de terapeuta post-intake.
- ✅ Matching de profesionales en base a respuestas del intake + datos reales del perfil profesional.
- ✅ Reserva de sesión con persistencia real en DB.
- ✅ Chat con profesionales permitidos.
- ✅ Perfil paciente (datos básicos + zona horaria).
- 🟡 Flujo visual de pago implementado, pero sin cobro real conectado a Stripe desde frontend.

### Profesional
- ✅ Registro/login con API real.
- ✅ Verificación de email (mismo esquema que paciente).
- ✅ Onboarding web/mobile con persistencia de perfil profesional.
- ✅ Carga y persistencia de diplomas múltiples.
- ✅ Dashboard con KPIs, próximas sesiones y navegación a módulos.
- ✅ Configuración de horarios y publicación de disponibilidad.
- ✅ Agenda con vista de semana actual + siguiente por defecto y foco en hoy.
- ✅ Marcado de sesión completada (endpoint real).
- ✅ Gestión de pacientes y chat.
- 🟡 Ingresos del profesional hoy usan lógica simplificada fija en endpoint de earnings (no 100% acoplado al ledger financiero avanzado).

### Admin
- ✅ Dashboard admin + autenticación.
- ✅ Gestión de usuarios (pacientes, profesionales, admins).
- ✅ Gestión de paquetes de sesiones.
- ✅ Gestión de pacientes y profesionales.
- ✅ Gestión de contenidos web/landing (settings, reviews, blog).
- ✅ Módulo de finanzas completo y modularizado:
  - filtros por fecha/profesional/paciente/paquete/estado/trial
  - KPIs de plataforma
  - corridas de liquidación
  - detalle por profesional/paciente/paquete
  - estado de eventos Stripe/outbox y reintentos
- 🟡 Algunos módulos del menú aún son placeholder (por ejemplo calendario/biblioteca/importaciones, según ruta).

---

## 3) Flujo funcional actual (end-to-end)

### 3.1 Alta y acceso
1. Usuario se registra (paciente o profesional).
2. Cuenta se crea con `email_verified = false`.
3. Se genera token de verificación (24h) y se envía link por email.
4. Si verificación está exigida (`EMAIL_VERIFICATION_REQUIRED=true`), onboarding/portal se bloquea hasta verificar.
5. En desarrollo existe bypass `Verify Email (DEV)`.

Estado: ✅ implementado.

### 3.2 Onboarding profesional
1. El profesional completa wizard (identidad, perfil, servicios, multimedia, formación, verificación).
2. Se persisten datos en `ProfessionalProfile` y `ProfessionalDiploma`.
3. Puede agregar múltiples diplomas.
4. Esos datos luego alimentan su perfil editable y el matching del lado paciente.

Estado: ✅ implementado.

### 3.3 Onboarding paciente
1. Registro/login.
2. Intake clínico obligatorio.
3. Si no hay riesgo alto, pasa a selección de terapeuta (matching).
4. Selecciona profesional y slot.
5. Confirma reserva.

Estado: ✅ implementado.

### 3.4 Reserva y agenda
- Reserva crea booking real, evita doble toma de slot con lock distribuido, y guarda timezone de paciente/profesional al momento de reservar.
- Reprogramación y cancelación implementadas.
- Profesional puede marcar completada la sesión.

Estado: ✅ implementado.

### 3.5 Chat
- Hilos y mensajes persistidos en DB.
- Dedupe por par paciente-profesional (evita duplicados visuales tipo WhatsApp).
- Paciente solo puede chatear con profesionales permitidos/asignados por relación real.

Estado: ✅ implementado.

### 3.6 Finanzas y monetización
- Cada sesión completada genera/actualiza registro financiero (`FinanceSessionRecord`).
- Comisión de plataforma configurable desde admin.
- Sesión trial configurable para que plataforma retenga 100% (si así se define en reglas).
- Corridas de pago a profesionales (`FinancePayoutRun` y `FinancePayoutLine`).
- Tablero admin con visión por profesional, paciente y paquete.

Estado: ✅ backend + admin implementado.

---

## 4) Qué queda parcial o pendiente

### 4.1 Cobro real desde frontend paciente
- Hoy existe UX de pago en flujo de matching/onboarding final.
- Pero el botón de pago actualmente dispara confirmación de reserva sin completar checkout Stripe real en frontend.
- Backend Stripe sí está preparado (`checkout-session` + webhook + outbox).

Estado: 🟡 (backend listo, frontend por conectar).

### 4.2 Catálogo local residual en portal paciente
- Algunas pantallas todavía usan `professionalsCatalog` local para fallback visual.
- El matching principal ya toma datos reales desde API (`/api/profiles/professionals`).

Estado: 🟡 (funciona, pero hay que terminar de unificar 100% DB-driven en todo el portal).

### 4.3 Módulos grandes por dividir
- `landing/App.tsx`, `admin.routes.ts`, `MainPortal.tsx` y otros todavía grandes.

Estado: 🟡 (no rompe funcionalidad hoy, pero complica mantenimiento y velocidad de cambio).

---

## 5) Persistencia de datos (qué se guarda hoy)

Se persiste en DB:

- Usuarios + roles + verificación de email.
- Perfil paciente + intake + zona horaria.
- Perfil profesional completo + diplomas + multimedia.
- Disponibilidad del profesional.
- Reservas, cambios de estado y timestamps.
- Chat (hilos + mensajes + lectura).
- Compras/paquetes/créditos y ledger de movimientos.
- Ledger financiero de sesiones + corridas de pago.
- Configuraciones de sistema (reglas financieras, asignaciones, contenido web).

Conclusión: ✅ la base de datos ya guarda el núcleo operativo y comercial del negocio.

---

## 6) Riesgos funcionales actuales (para decidir con socios)

1. Cobro real frontend aún sin cierre end-to-end.
2. Experiencia paciente todavía mezcla partes nuevas con catálogo local en algunas pantallas.
3. Sin suite automática amplia de regresión (hay tests puntuales, no cobertura integral del journey completo).

---

## 7) Recomendación de próximas decisiones

1. Cerrar checkout Stripe real en flujo paciente (prioridad negocio #1).
2. Completar migración paciente a datos 100% API/DB (eliminar dependencia de catálogo local donde aún quede).
3. Continuar refactor modular de archivos grandes para sostener velocidad del equipo.
4. Expandir tests automáticos por journeys críticos (registro, verificación email, onboarding, matching, reserva, pago, sesión completada, finanzas).

---

## 8) Mensaje simple para socios
Hoy ya tenemos una plataforma funcional con persistencia real, onboarding completo, agenda, chat, reservas y módulo financiero admin. No estamos en etapa de maqueta: estamos en etapa de consolidación para escalar con seguridad. El próximo hito clave es cerrar el cobro real end-to-end en frontend y continuar la limpieza modular para crecer más rápido.
