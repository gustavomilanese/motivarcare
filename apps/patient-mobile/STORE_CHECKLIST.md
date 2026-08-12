# MotivarCare Pacientes — Ola 5 store checklist

## Pre-requisitos EAS / stores

- [ ] Cuenta Expo (`eas login`) y `eas init` en `apps/patient-mobile`
- [ ] Pegar `projectId` en `app.json` → `extra.eas.projectId`
- [ ] Apple Developer + App Store Connect (bundle `com.motivarcare.patient`)
- [ ] Google Play Console (package `com.motivarcare.patient`)
- [ ] Completar `eas.json` → `submit.production.ios.ascAppId`
- [ ] Íconos / splash brand finales (hoy assets placeholder Expo + color `#5F44EB`)
- [ ] Privacy policy URL + soporte email en fichas de store

## Builds internos

```bash
cd apps/patient-mobile
npm run eas:ios:preview      # → TestFlight / ad hoc vía EAS
npm run eas:android:preview  # → APK internal
```

- [ ] iOS preview instalado en dispositivo real
- [ ] Android preview instalado en dispositivo real
- [ ] Deep links `motivarcare://` abren la app (verify-email, reset-password, payment-return)

## QA vs web mobile (pantalla por pantalla)

### Auth / cimientos
- [ ] Login / register
- [ ] Forgot + reset password (deep link)
- [ ] Verify email (deep link)
- [ ] Logout + 401 limpia sesión

### Onboarding
- [ ] Intake wizard (+ chat si flag ON)
- [ ] Risk blocked
- [ ] Calendar connect / skip
- [ ] Matching + hold + trial dLocal return

### Core clínico
- [ ] Home: saldo, accesos, pro card, bienestar
- [ ] Sesiones: lista, cancelar, reagendar, historial, paquetes, actividad
- [ ] Checkout paquete dLocal + acreditación sin refresh mental
- [ ] Chat profesional (threads, unread, envío)

### Bienestar
- [ ] Diario (nueva / registros / stats)
- [ ] Ejercicios lista / detalle / rutinas
- [ ] Música in-app (sin salir a YouTube)

### Maca + cuenta
- [ ] FAB Maca (si flag + elegible)
- [ ] Caps diarios / sesión visibles
- [ ] Consent compartir con profesional
- [ ] Preferencias: emails, recordatorios, idioma, moneda, dark mode
- [ ] FAQ + solicitud cambio profesional
- [ ] Google Calendar connect/disconnect

### Store-ready
- [ ] Banner offline al cortar red
- [ ] Error boundary no tumba toda la app
- [ ] Permiso de notificaciones pedido
- [ ] Recordatorio local ~1h antes de sesión confirmada
- [ ] Token Expo registrado en API (`POST /api/profiles/me/push-token`) tras EAS projectId
- [ ] Safe areas OK en notch / home indicator
- [ ] API prod `https://api.motivarcare.com` en builds preview/production

## Notas

- Push **remoto** (servidor → Expo Push API) todavía no dispara eventos; solo registro de token + locales.
- En Expo Go, push remoto puede estar limitado; probar en build EAS preview.
- No hacer `git push` / submit a stores hasta que el usuario lo pida.
