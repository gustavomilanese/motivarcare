import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { McButton, McModal } from "@therapy/ui";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const PREP_ITEMS: LocalizedText[] = [
  {
    es: "Datos personales y una foto profesional clara",
    en: "Personal details and a clear professional photo",
    pt: "Dados pessoais e uma foto profissional nítida"
  },
  {
    es: "Un video corto de presentación (celular alcanza)",
    en: "A short intro video (phone is fine)",
    pt: "Um vídeo curto de apresentação (o celular serve)"
  },
  {
    es: "Títulos y diplomas: institución, años y foto o PDF del certificado",
    en: "Degrees and diplomas: school, years, and a photo or PDF of the certificate",
    pt: "Títulos e diplomas: instituição, anos e foto ou PDF do certificado"
  },
  {
    es: "El precio de sesión que querés cobrar (en USD)",
    en: "The session price you want to charge (in USD)",
    pt: "O preço da sessão que você quer cobrar (em USD)"
  },
  {
    es: "Datos de cobro: cuenta bancaria / CBU-CVU y documento fiscal",
    en: "Payout details: bank account and tax ID",
    pt: "Dados de recebimento: conta bancária e documento fiscal"
  }
];

const PREP_SEEN_KEY = "pro-web-onboarding-prep-seen-v2";

export function shouldShowProfessionalOnboardingPrep(params: {
  initialWizardStep?: number;
  hasExistingSession?: boolean;
}): boolean {
  if ((params.initialWizardStep ?? 0) > 0 || params.hasExistingSession) {
    return false;
  }
  try {
    return sessionStorage.getItem(PREP_SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markProfessionalOnboardingPrepSeen(): void {
  try {
    sessionStorage.setItem(PREP_SEEN_KEY, "1");
  } catch {
    /* ignore private mode / storage blocked */
  }
}

export function ProfessionalOnboardingPrepDialog(props: {
  language: AppLanguage;
  onContinue: () => void;
}) {
  return (
    <McModal
      open
      className="pro-web-onboarding-prep-modal"
      title={
        <span className="pro-web-onboarding-prep-title-stack">
          <span className="pro-web-onboarding-prep-kicker">
            {t(props.language, {
              es: "Checklist breve",
              en: "Quick checklist",
              pt: "Checklist rápido"
            })}
          </span>
          <span className="pro-web-onboarding-prep-title">
            {t(props.language, {
              es: "Antes de empezar, tené a mano",
              en: "Before you start, have ready",
              pt: "Antes de começar, tenha em mãos"
            })}
          </span>
        </span>
      }
      onClose={props.onContinue}
      closeLabel={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
      footer={
        <McButton className="pro-web-onboarding-prep-cta" onClick={props.onContinue}>
          {t(props.language, {
            es: "Entendido, empezar",
            en: "Got it, start",
            pt: "Entendi, começar"
          })}
        </McButton>
      }
    >
      <p className="pro-web-onboarding-prep-lead">
        {t(props.language, {
          es: "El alta es más rápido si preparás esto. Podés avanzar y completar después lo que falte.",
          en: "Setup goes faster if you prepare these. You can continue and finish anything later.",
          pt: "O cadastro fica mais rápido se você preparar isto. Pode seguir e completar o que faltar depois."
        })}
      </p>
      <ol className="pro-web-onboarding-prep-list">
        {PREP_ITEMS.map((item, index) => (
          <li key={item.es} className="pro-web-onboarding-prep-item">
            <span className="pro-web-onboarding-prep-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="pro-web-onboarding-prep-item-text">{t(props.language, item)}</span>
          </li>
        ))}
      </ol>
      <p className="pro-web-onboarding-prep-note">
        {t(props.language, {
          es: "Nada de esto es obligatorio de una sola vez: el flujo te guía paso a paso.",
          en: "None of this has to be done at once — the flow guides you step by step.",
          pt: "Nada disso precisa ser feito de uma vez: o fluxo te guia passo a passo."
        })}
      </p>
    </McModal>
  );
}
