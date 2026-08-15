import { useCallback, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { MIN_COMPLETED_SESSIONS_FOR_PROFESSIONAL_REVIEW } from "@therapy/types";
import { buildPatientReviewInviteUrl } from "../lib/buildPatientReviewInviteUrl";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalReviewsInvitePanel(props: {
  language: AppLanguage;
  professionalId: string;
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = useMemo(() => buildPatientReviewInviteUrl(props.professionalId), [props.professionalId]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }, [inviteUrl]);

  return (
    <section className="pro-profile-studio__reviews-invite" aria-labelledby="pro-reviews-invite-title">
      <p className="pro-profile-studio__eyebrow" id="pro-reviews-invite-title">
        {t(props.language, { es: "Opiniones de pacientes", en: "Patient reviews", pt: "Avaliações de pacientes" })}
      </p>
      <p className="pro-profile-studio__reviews-invite-copy">
        {t(props.language, {
          es: `Las opiniones las dejan pacientes con al menos ${MIN_COMPLETED_SESSIONS_FOR_PROFESSIONAL_REVIEW} sesiones completadas en MotivarCare. Compartí este enlace para que puedan calificarte desde el portal paciente.`,
          en: `Reviews are left by patients with at least ${MIN_COMPLETED_SESSIONS_FOR_PROFESSIONAL_REVIEW} completed sessions on MotivarCare. Share this link so they can rate you from the patient portal.`,
          pt: `As avaliações são deixadas por pacientes com pelo menos ${MIN_COMPLETED_SESSIONS_FOR_PROFESSIONAL_REVIEW} sessões concluídas na MotivarCare. Compartilhe este link para que possam avaliar você no portal do paciente.`
        })}
      </p>
      <div className="pro-profile-studio__reviews-invite-link-row">
        <input
          className="pro-profile-studio__reviews-invite-input"
          type="text"
          readOnly
          value={inviteUrl}
          aria-label={t(props.language, { es: "Enlace para dejar opinión", en: "Review invite link", pt: "Link para avaliar" })}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button type="button" className="pro-secondary pro-profile-studio__reviews-invite-copy-btn" onClick={() => void handleCopy()}>
          {copied
            ? t(props.language, { es: "Copiado", en: "Copied", pt: "Copiado" })
            : t(props.language, { es: "Copiar", en: "Copy", pt: "Copiar" })}
        </button>
      </div>
    </section>
  );
}
