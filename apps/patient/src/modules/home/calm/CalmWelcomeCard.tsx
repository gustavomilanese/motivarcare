import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { IconFlecha } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const STEPS: LocalizedText[] = [
  { es: "Elegí a tu profesional", en: "Choose your professional", pt: "Escolha seu profissional" },
  { es: "Elegí un horario", en: "Choose a time", pt: "Escolha um horário" },
  { es: "Elegí cómo pagar", en: "Choose how to pay", pt: "Escolha como pagar" },
  { es: "Confirmá la reserva", en: "Confirm the booking", pt: "Confirme a reserva" }
];

export function CalmWelcomeCard(props: { language: AppLanguage; onFindProfessional: () => void }) {
  return (
    <article className="calm-welcome">
      <p className="calm-welcome-kicker">
        {t(props.language, {
          es: "Tu primera sesión, en 4 pasos",
          en: "Your first session, in 4 steps",
          pt: "Sua primeira sessão, em 4 passos"
        })}
      </p>
      <ol className="calm-steps">
        {STEPS.map((step, index) => (
          <li key={step.es} className={index === 0 ? "is-current" : "is-pending"}>
            <span>{index + 1}</span>
            {t(props.language, step)}
          </li>
        ))}
      </ol>
      <div className="calm-welcome-actions">
        <button className="calm-btn calm-btn--yellow calm-btn--large" type="button" onClick={props.onFindProfessional}>
          {t(props.language, {
            es: "Encontrá a tu profesional",
            en: "Find your professional",
            pt: "Encontre seu profissional"
          })}
          <IconFlecha size={18} />
        </button>
        <p>
          {t(props.language, {
            es: "Cada profesional define su precio. Sin suscripción.",
            en: "Each professional sets their price. No subscription.",
            pt: "Cada profissional define o preço. Sem assinatura."
          })}
        </p>
      </div>
    </article>
  );
}
