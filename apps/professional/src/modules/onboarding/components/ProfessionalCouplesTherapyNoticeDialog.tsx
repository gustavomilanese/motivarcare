import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { PROFESSIONAL_COUPLES_THERAPY_MEET_NOTICE_BULLETS } from "../constants/professionalProfileGuidanceCopy";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalCouplesTherapyNoticeDialog(props: {
  language: AppLanguage;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="pro-couples-meet-notice-backdrop" role="presentation" onClick={props.onDismiss}>
      <article
        className="pro-couples-meet-notice-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-couples-meet-notice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pro-couples-meet-notice-head">
          <p className="pro-couples-meet-notice-kicker">
            {t(props.language, {
              es: "Terapia de pareja",
              en: "Couples therapy",
              pt: "Terapia de casal"
            })}
          </p>
          <h3 id="pro-couples-meet-notice-title">
            {t(props.language, {
              es: "Sesiones por Google Meet",
              en: "Sessions via Google Meet",
              pt: "Sessoes por Google Meet"
            })}
          </h3>
        </header>

        <ul className="pro-couples-meet-notice-points">
          {PROFESSIONAL_COUPLES_THERAPY_MEET_NOTICE_BULLETS.map((point) => (
            <li key={point.es}>{t(props.language, point)}</li>
          ))}
        </ul>

        <div className="pro-couples-meet-notice-actions">
          <button type="button" className="pro-secondary pro-couples-meet-notice-secondary" onClick={props.onDismiss}>
            {t(props.language, {
              es: "Cancelar",
              en: "Cancel",
              pt: "Cancelar"
            })}
          </button>
          <button type="button" className="pro-primary pro-couples-meet-notice-primary" onClick={props.onConfirm}>
            {t(props.language, {
              es: "Entendido",
              en: "Got it",
              pt: "Entendi"
            })}
          </button>
        </div>
      </article>
    </div>
  );
}
