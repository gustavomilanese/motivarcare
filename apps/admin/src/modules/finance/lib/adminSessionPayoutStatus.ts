import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export type AdminSessionPayoutStatus = "pending" | "not_submitted" | "paid";

export type AdminSessionPayoutTone = "pending" | "waiting" | "paid";

/** Copy for Admin: the professional's "Pendiente de cobro" is "ready to pay" here. */
export function adminSessionPayoutStatusCopy(
  status: AdminSessionPayoutStatus | undefined,
  language: AppLanguage
): { label: string; tone: AdminSessionPayoutTone } {
  if (status === "paid") {
    return {
      tone: "paid",
      label: t(language, { es: "Pagada", en: "Paid", pt: "Paga" })
    };
  }
  if (status === "not_submitted") {
    return {
      tone: "waiting",
      label: t(language, {
        es: "Falta envío del profesional",
        en: "Professional hasn’t submitted",
        pt: "Falta envio do profissional"
      })
    };
  }
  return {
    tone: "pending",
    label: t(language, {
      es: "Por pagar",
      en: "To pay",
      pt: "A pagar"
    })
  };
}

export function adminPendingSessionsHint(language: AppLanguage): string {
  return t(language, {
    es: "El profesional ya las mandó a cobro. Revisá las sesiones y tocá Pagar.",
    en: "The professional already submitted them for payout. Review the sessions, then Pay.",
    pt: "O profissional ja enviou a cobranca. Revise as sessoes e toque em Pagar."
  });
}
