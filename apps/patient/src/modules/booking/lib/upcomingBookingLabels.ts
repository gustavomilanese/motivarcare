import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function upcomingBookingStatusPillLabel(
  language: AppLanguage,
  isTrialBooking: boolean
): string {
  return isTrialBooking
    ? t(language, { es: "Prueba confirmada", en: "Trial confirmed", pt: "Teste confirmado" })
    : t(language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" });
}

export function upcomingBookingCardStatusLine(language: AppLanguage, isTrialBooking: boolean): string {
  const statusConfirmed = t(language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" });
  return isTrialBooking
    ? `${statusConfirmed} · ${t(language, { es: "Sesión de prueba", en: "Trial session", pt: "Sessao de teste" })}`
    : statusConfirmed;
}

export function rescheduleUnavailableTitle(language: AppLanguage): string {
  return t(language, {
    es: "Disponible hasta 24 horas antes de la sesión.",
    en: "Available up to 24 hours before the session.",
    pt: "Disponivel ate 24 horas antes da sessao."
  });
}

export function joinSessionLabel(language: AppLanguage): string {
  return t(language, {
    es: "Entrar a la sesión",
    en: "Join session",
    pt: "Entrar na sessao"
  });
}

export function joinPendingLabel(language: AppLanguage): string {
  return t(language, {
    es: "El enlace se generará al confirmar la sesión.",
    en: "The link will be available once the session is confirmed.",
    pt: "O link ficara disponivel quando a sessao for confirmada."
  });
}

export function viewDetailLabel(language: AppLanguage): string {
  return t(language, { es: "Ver detalle", en: "View detail", pt: "Ver detalhe" });
}

export function rescheduleAriaLabel(language: AppLanguage): string {
  return t(language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" });
}

export function upcomingBookingsTableHeadLabels(language: AppLanguage) {
  return {
    date: t(language, { es: "Fecha", en: "Date", pt: "Data" }),
    time: t(language, { es: "Hora", en: "Time", pt: "Hora" }),
    professional: t(language, { es: "Profesional", en: "Professional", pt: "Profissional" }),
    status: t(language, { es: "Estado", en: "Status", pt: "Status" }),
    actions: t(language, { es: "Acciones", en: "Actions", pt: "Acoes" })
  };
}
