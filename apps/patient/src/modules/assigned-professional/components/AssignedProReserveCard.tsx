import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Col 3: reservar / comprar según saldo del vínculo. */
export function AssignedProReserveCard(props: {
  language: AppLanguage;
  availableSessions: number;
  onReserve: () => void;
  onBuy: () => void;
}) {
  const needsPurchase = props.availableSessions <= 0;
  return (
    <article className="assigned-pro-rail-card assigned-pro-rail-card--action">
      <p className="assigned-pro-rail-kicker">
        {t(props.language, { es: "Con tu profesional", en: "With your professional", pt: "Com seu profissional" })}
      </p>
      <h3 className="assigned-pro-rail-title">
        {needsPurchase
          ? t(props.language, { es: "Comprar sesiones", en: "Buy sessions", pt: "Comprar sessões" })
          : t(props.language, { es: "Reservar sesión", en: "Book a session", pt: "Reservar sessão" })}
      </h3>
      <p className="assigned-pro-rail-copy">
        {needsPurchase
          ? t(props.language, {
              es: "Sin saldo disponible. Comprá un paquete de tu profesional.",
              en: "No credits left. Buy a package with your professional.",
              pt: "Sem saldo. Compre um pacote do seu profissional."
            })
          : t(props.language, {
              es:
                props.availableSessions === 1
                  ? "Tenés 1 sesión disponible."
                  : `Tenés ${props.availableSessions} sesiones disponibles.`,
              en:
                props.availableSessions === 1
                  ? "You have 1 session available."
                  : `You have ${props.availableSessions} sessions available.`,
              pt:
                props.availableSessions === 1
                  ? "Você tem 1 sessão disponível."
                  : `Você tem ${props.availableSessions} sessões disponíveis.`
            })}
      </p>
      <button
        type="button"
        className="assigned-pro-rail-cta"
        onClick={needsPurchase ? props.onBuy : props.onReserve}
      >
        {needsPurchase
          ? t(props.language, { es: "Comprar", en: "Buy", pt: "Comprar" })
          : t(props.language, { es: "Reservar", en: "Book", pt: "Reservar" })}
      </button>
    </article>
  );
}
