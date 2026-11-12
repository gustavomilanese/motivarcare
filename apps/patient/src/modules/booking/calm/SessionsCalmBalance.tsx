import { replaceTemplate, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { SessionCreditsMeter } from "../../home/calm/SessionCreditsMeter";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function SessionsCalmBalance(props: {
  language: AppLanguage;
  available: number;
  packageName: string;
  packageSize: number;
  /** Próximas con crédito de paquete (círculo salvia del DS). */
  reserved?: number;
  bookingOpen: boolean;
  canBuy: boolean;
  bookPrimary: boolean;
  onBook: () => void;
  onBuy: () => void;
}) {
  const needsPurchase = !props.bookingOpen && props.available <= 0;
  const primaryAction = needsPurchase ? props.onBuy : props.onBook;
  const primaryLabel = props.bookingOpen
    ? t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })
    : needsPurchase
      ? t(props.language, { es: "Comprar", en: "Buy", pt: "Comprar" })
      : t(props.language, { es: "Reservar", en: "Book", pt: "Reservar" });

  return (
    <section className="sessions-calm-balance">
      <div className="sessions-calm-balance-info">
        <span className="sessions-calm-count">{props.available}</span>
        <div className="sessions-calm-balance-copy">
          <b>
            {props.available === 1
              ? t(props.language, { es: "sesión disponible", en: "session available", pt: "sessão disponível" })
              : t(props.language, { es: "sesiones disponibles", en: "sessions available", pt: "sessões disponíveis" })}
          </b>
          {props.packageName ? <span>{props.packageName}</span> : null}
          <SessionCreditsMeter
            language={props.language}
            available={props.available}
            packageSize={props.packageSize}
            reserved={props.reserved}
            variant="sessions"
          />
        </div>
      </div>
      <div className="sessions-calm-balance-actions">
        <button
          type="button"
          className={props.bookPrimary ? "sessions-calm-book" : "sessions-calm-book is-outline"}
          onClick={primaryAction}
        >
          {primaryLabel}
        </button>
        {props.canBuy && !needsPurchase ? (
          <button type="button" className="sessions-calm-buy" onClick={props.onBuy}>
            {t(props.language, { es: "Comprar más", en: "Buy more", pt: "Comprar mais" })}
          </button>
        ) : null}
      </div>
      <p className="sr-only">
        {props.available === 1
          ? t(props.language, {
              es: "1 sesión disponible",
              en: "1 session available",
              pt: "1 sessão disponível"
            })
          : replaceTemplate(
              t(props.language, {
                es: "{count} sesiones disponibles",
                en: "{count} sessions available",
                pt: "{count} sessões disponíveis"
              }),
              { count: String(props.available) }
            )}
      </p>
    </section>
  );
}
