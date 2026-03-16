# Data Model

## Entidades core actuales
- `User`, `PatientProfile`, `ProfessionalProfile`, `AdminProfile`
- `AvailabilitySlot`, `Booking`, `VideoSession`
- `SessionPackage`, `PatientPackagePurchase`, `CreditLedger`
- `SystemConfig`
- `FinanceSessionRecord`, `FinancePayoutRun`, `FinancePayoutLine`

## Modelo financiero actual
- `FinanceSessionRecord`: 1 registro por sesión monetizable (normalmente `COMPLETED`).
  - Guarda bruto, fee plataforma, neto profesional, trial, paquete y referencias.
- `FinancePayoutRun`: corrida de liquidación por período.
- `FinancePayoutLine`: línea por profesional dentro de una corrida.

## Reglas de negocio (v1)
- Sesión trial: `% plataforma` configurable (default 100%).
- Sesión regular: `% comisión plataforma` configurable (default 25%).
- Neto profesional = bruto - fee plataforma.

## Índices importantes
- `Booking(patientId, startsAt)`, `Booking(professionalId, startsAt)`
- `FinanceSessionRecord(bookingCompletedAt)`
- `FinanceSessionRecord(professionalId, bookingCompletedAt)`
- `FinanceSessionRecord(patientId, bookingCompletedAt)`
- `FinancePayoutLine(payoutRunId, professionalId)`

## Próximas mejoras de modelo (recomendado)
1. Moneda por transacción real y FX snapshot.
2. Tabla de `PaymentTransaction` normalizada (captura, refund, chargeback).
3. Tabla `FinanceJournalEntry` (doble entrada) para auditoría completa.
4. Snapshot diario (`finance_daily_aggregate`) para dashboard rápido.
5. Soft delete + `archivedAt` para entidades operativas.

## Integridad y concurrencia
- Idempotencia por `idempotencyKey` en corridas de payout.
- Transacciones para creación de corrida y linkeo de registros.
- Reglas de cierre: no cerrar corrida con líneas pendientes.
