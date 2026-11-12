import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { calmGivenName } from "./calmHomeFormat";
import type { Professional } from "../../app/types";
import { SessionCreditsMeter } from "./SessionCreditsMeter";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmSessionsBalance(props: {
  language: AppLanguage;
  available: number;
  packageName: string;
  packageSize: number;
  /** Próximas con crédito de paquete (círculo salvia del DS). */
  reserved?: number;
  includesToday: boolean;
  professional: Professional | null;
  onReserveAnother: () => void;
  /** Sin saldo: mismo botón amarillo abre compra de paquetes. */
  onBuyAnother?: () => void;
  /** Compacta para el stack mobile debajo de la card de sesión. */
  compact?: boolean;
}) {
  const given = props.professional ? calmGivenName(props.professional) : "";
  const packageLine = props.packageName.trim();
  const withName = packageLine && given && !packageLine.toLowerCase().includes(`con ${given.toLowerCase()}`)
    ? `${packageLine} con ${given}`
    : packageLine || (given
      ? t(props.language, { es: `Con ${given}`, en: `With ${given}`, pt: `Com ${given}` })
      : "");
  const today = t(props.language, { es: "una es hoy", en: "one is today", pt: "uma é hoje" });
  const copy = props.includesToday ? (withName ? `${withName} · ${today}` : today) : withName;
  const needsPurchase = props.available <= 0;
  const onPrimary = needsPurchase
    ? (props.onBuyAnother ?? props.onReserveAnother)
    : props.onReserveAnother;

  return (
    <article
      className={`calm-card calm-balance${props.compact ? " calm-balance--follow" : ""}`}
      data-tour="patient-tour-credits"
    >
      <strong className="calm-balance-number">{props.available}</strong>
      <div className="calm-balance-text">
        <b>
          {props.available === 1
            ? t(props.language, { es: "sesión disponible", en: "session available", pt: "sessão disponível" })
            : t(props.language, { es: "sesiones disponibles", en: "sessions available", pt: "sessões disponíveis" })}
        </b>
        {copy ? <p className="calm-balance-copy">{copy}</p> : null}
        <SessionCreditsMeter
          language={props.language}
          available={props.available}
          packageSize={props.packageSize}
          reserved={props.reserved}
          variant="home"
        />
      </div>
      <button className="calm-btn calm-btn--yellow" type="button" onClick={onPrimary}>
        {needsPurchase
          ? t(props.language, { es: "Comprar", en: "Buy", pt: "Comprar" })
          : t(props.language, { es: "Reservar otra", en: "Book another", pt: "Reservar outra" })}
      </button>
    </article>
  );
}
