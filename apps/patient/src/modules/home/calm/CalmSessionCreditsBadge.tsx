import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Contador de créditos en el borde superior derecho de la card principal. */
export function CalmSessionCreditsBadge(props: {
  language: AppLanguage;
  available: number;
}) {
  const label =
    props.available === 1
      ? t(props.language, { es: "disponible", en: "available", pt: "disponível" })
      : t(props.language, { es: "disponibles", en: "available", pt: "disponíveis" });

  return (
    <p
      className="calm-session-credits"
      aria-label={
        props.available === 1
          ? t(props.language, {
              es: "1 sesión disponible",
              en: "1 session available",
              pt: "1 sessão disponível"
            })
          : t(props.language, {
              es: `${props.available} sesiones ${label}`,
              en: `${props.available} sessions ${label}`,
              pt: `${props.available} sessões ${label}`
            })
      }
    >
      <b>{props.available}</b>
      <span>{label}</span>
    </p>
  );
}
