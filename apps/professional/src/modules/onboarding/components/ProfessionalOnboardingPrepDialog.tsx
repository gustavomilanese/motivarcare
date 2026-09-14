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
    es: "Títulos y diplomas: institución, años y foto del certificado",
    en: "Degrees and diplomas: school, years, and a photo of the certificate",
    pt: "Títulos e diplomas: instituição, anos e foto do certificado"
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

const PREP_SEEN_KEY = "pro-web-onboarding-prep-seen";

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
      title={t(props.language, {
        es: "Antes de empezar, tené a mano",
        en: "Before you start, have ready",
        pt: "Antes de começar, tenha em mãos"
      })}
      onClose={props.onContinue}
      closeLabel={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
      footer={
        <McButton onClick={props.onContinue}>
          {t(props.language, {
            es: "Entendido, empezar",
            en: "Got it, start",
            pt: "Entendi, começar"
          })}
        </McButton>
      }
    >
      <p>
        {t(props.language, {
          es: "El alta es más rápido si preparás esto. Podés avanzar y completar después lo que falte.",
          en: "Setup goes faster if you prepare these. You can continue and finish anything later.",
          pt: "O cadastro fica mais rápido se você preparar isto. Pode seguir e completar o que faltar depois."
        })}
      </p>
      <ul className="pro-web-identity-confirm-points">
        {PREP_ITEMS.map((item) => (
          <li key={item.es}>{t(props.language, item)}</li>
        ))}
      </ul>
    </McModal>
  );
}
