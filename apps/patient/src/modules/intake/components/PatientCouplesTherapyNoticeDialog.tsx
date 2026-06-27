import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { PATIENT_COUPLES_THERAPY_MEET_NOTICE_BULLETS } from "../constants/patientCouplesTherapyNoticeCopy";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function PatientCouplesTherapyNoticeDialog(props: {
  language: AppLanguage;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="intake-couples-notice-backdrop"
      role="presentation"
      onClick={props.onDismiss}
    >
      <article
        className="intake-couples-notice-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-couples-notice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="intake-couples-notice-head">
          <p className="intake-couples-notice-kicker">
            {t(props.language, {
              es: "Antes de continuar",
              en: "Before you continue",
              pt: "Antes de continuar"
            })}
          </p>
          <h3 id="intake-couples-notice-title">
            {t(props.language, {
              es: "Terapia de pareja por videollamada",
              en: "Couples therapy by video call",
              pt: "Terapia de casal por videochamada"
            })}
          </h3>
          <p className="intake-couples-notice-lead">
            {t(props.language, {
              es: "Las sesiones en MotivarCare usan Google Meet. Tené en cuenta esto al elegir terapia de pareja:",
              en: "MotivarCare sessions use Google Meet. Keep this in mind when choosing couples therapy:",
              pt: "As sessoes no MotivarCare usam Google Meet. Tenha isso em mente ao escolher terapia de casal:"
            })}
          </p>
        </header>

        <ul className="intake-couples-notice-points">
          {PATIENT_COUPLES_THERAPY_MEET_NOTICE_BULLETS.map((point) => (
            <li key={point.es}>{t(props.language, point)}</li>
          ))}
        </ul>

        <div className="intake-couples-notice-actions">
          <button type="button" className="ghost intake-couples-notice-secondary" onClick={props.onDismiss}>
            {t(props.language, {
              es: "Elegir otra opción",
              en: "Choose another option",
              pt: "Escolher outra opcao"
            })}
          </button>
          <button type="button" className="primary intake-couples-notice-primary" onClick={props.onConfirm}>
            {t(props.language, {
              es: "Entendido, continuar",
              en: "Got it, continue",
              pt: "Entendi, continuar"
            })}
          </button>
        </div>
      </article>
    </div>
  );
}
