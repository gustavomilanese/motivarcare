import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export type AdminSessionPayoutStatus = "pending" | "not_submitted" | "paid";

export type AdminSessionPayoutTone = "pending" | "waiting" | "paid";

/** Copy for Admin: the professional's "Pendiente de cobro" is "waiting to send to DLocal" here. */
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
      es: "Por enviar a DLocal",
      en: "Ready to send to DLocal",
      pt: "Por enviar ao DLocal"
    })
  };
}

export function adminPendingSessionsHint(language: AppLanguage): string {
  return t(language, {
    es: "El profesional ya las mandó a cobro. Siguiente paso: Pagar para enviarlas a DLocal.",
    en: "The professional already submitted them for payout. Next: Pay to send them to DLocal.",
    pt: "O profissional ja enviou a cobranca. Proximo passo: Pagar para enviar ao DLocal."
  });
}
