import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Una sola línea: copy + link a paquetes del profesional asignado. */
export function CalmFirstSessionNextSteps(props: {
  language: AppLanguage;
  onBuyPackage: () => void;
}) {
  return (
    <p className="calm-first-session__packages-line">
      {t(props.language, {
        es: "También podés ",
        en: "You can also ",
        pt: "Também pode "
      })}
      <button type="button" className="calm-text-link" onClick={props.onBuyPackage}>
        {t(props.language, {
          es: "ver y comprar paquetes",
          en: "view and buy packages",
          pt: "ver e comprar pacotes"
        })}
      </button>
      {t(props.language, {
        es: " de tu profesional.",
        en: " from your professional.",
        pt: " do seu profissional."
      })}
    </p>
  );
}
