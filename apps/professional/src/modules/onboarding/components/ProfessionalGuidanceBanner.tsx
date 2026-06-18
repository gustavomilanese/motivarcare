import { type AppLanguage } from "@therapy/i18n-config";
import { proGuidanceCopy } from "../constants/professionalProfileGuidanceCopy";

export function ProfessionalGuidanceBanner(props: {
  language: AppLanguage;
  text: { es: string; en: string; pt: string };
  variant?: "info" | "warn";
}) {
  return (
    <p className={`pro-guidance-banner${props.variant === "warn" ? " pro-guidance-banner--warn" : ""}`} role="note">
      {proGuidanceCopy(props.language, props.text)}
    </p>
  );
}

export function ProfessionalGuidanceList(props: {
  language: AppLanguage;
  items: Array<{ es: string; en: string; pt: string }>;
}) {
  return (
    <ul className="pro-guidance-list">
      {props.items.map((item) => (
        <li key={item.es}>{proGuidanceCopy(props.language, item)}</li>
      ))}
    </ul>
  );
}
