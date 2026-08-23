# MotivarCare Profesionales (nativo)

App Expo que replica el portal profesional en el teléfono: Dashboard, Horarios, Pacientes, Chat e Ingresos, más el cajón `⋯` (perfil, reportes, ajustes de agenda, cuenta).

## Arranque

1. API en `:4000` (`npm run dev:api` desde la raíz) o `EXPO_PUBLIC_API_URL` apuntando a prod/sandbox.
2. Desde la raíz:

```bash
npm run dev:professional-mobile
```

Metro queda en el puerto **8191** (el de pacientes usa 8190). Escaneá el QR con Expo Go.

Entrá con una cuenta **PROFESSIONAL** (no paciente). En el teléfono físico, misma Wi‑Fi y `EXPO_PUBLIC_API_URL=http://TU_IP:4000`.
