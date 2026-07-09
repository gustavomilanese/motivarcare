import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function upcomingBookingStatusPillLabel(
  language: AppLanguage,
  isTrialBooking: boolean
): string {
  return isTrialBooking
    ? t(language, { es: "Prueba reservada", en: "Trial booked", pt: "Teste reservado" })
    : t(language, { es: "Reservada", en: "Booked", pt: "Reservada" });
}

export function upcomingBookingCardStatusLine(language: AppLanguage, isTrialBooking: boolean): string {
  const statusBooked = t(language, { es: "Reservada", en: "Booked", pt: "Reservada" });
  return isTrialBooking
    ? `${statusBooked} · ${t(language, { es: "Sesión de prueba", en: "Trial session", pt: "Sessao de teste" })}`
    : statusBooked;
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
    es: "El enlace se generará al reservar la sesión.",
    en: "The link will be available once the session is booked.",
    pt: "O link ficara disponivel quando a sessao for reservada."
  });
}

export function viewDetailLabel(language: AppLanguage): string {
  return t(language, { es: "Ver detalle", en: "View detail", pt: "Ver detalhe" });
}

export function rescheduleAriaLabel(language: AppLanguage): string {
  return t(language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" });
}

export function rescheduleTooltipLabel(language: AppLanguage): string {
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
