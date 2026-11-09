import { replaceTemplate, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function SessionsCalmBalance(props: {
  language: AppLanguage;
  available: number;
  packageName: string;
  packageSize: number;
  bookingOpen: boolean;
  canBuy: boolean;
  bookPrimary: boolean;
  onBook: () => void;
  onBuy: () => void;
}) {
  const dots = props.packageSize > 0 && props.packageSize <= 12 ? props.packageSize : 0;
  const used = dots > 0 ? Math.max(0, Math.min(dots, dots - props.available)) : 0;

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
          {dots > 0 ? (
            <span className="sessions-calm-dots" aria-hidden="true">
              {Array.from({ length: dots }, (_, index) => (
                <i key={index} className={index < used ? "is-used" : ""} />
              ))}
            </span>
          ) : null}
        </div>
      </div>
      <div className="sessions-calm-balance-actions">
        <button
          type="button"
          className={props.bookPrimary ? "sessions-calm-book" : "sessions-calm-book is-outline"}
          onClick={props.onBook}
        >
          {props.bookingOpen
            ? t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })
            : t(props.language, { es: "Reservar", en: "Book", pt: "Reservar" })}
        </button>
        {props.canBuy ? (
          <button type="button" className="sessions-calm-buy" onClick={props.onBuy}>
            {props.available > 0
              ? t(props.language, { es: "Comprar más", en: "Buy more", pt: "Comprar mais" })
              : t(props.language, { es: "Comprar sesiones", en: "Buy sessions", pt: "Comprar sessões" })}
          </button>
        ) : null}
      </div>
      <p className="sr-only">
        {replaceTemplate(
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
