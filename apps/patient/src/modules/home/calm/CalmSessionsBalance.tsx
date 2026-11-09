import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { calmGivenName } from "./calmHomeFormat";
import type { Professional } from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmSessionsBalance(props: {
  language: AppLanguage;
  available: number;
  packageName: string;
  packageSize: number;
  includesToday: boolean;
  professional: Professional | null;
  onReserveAnother: () => void;
  /** Compacta para el stack mobile debajo de la card de sesión. */
  compact?: boolean;
}) {
  const given = props.professional ? calmGivenName(props.professional) : "";
  const packageLine = props.packageName.trim();
  const total = Math.min(Math.max(props.packageSize, props.available, 0), 8);
  const used = Math.min(Math.max(total - props.available, 0), total);
  const todayIndex = props.includesToday && used < total ? used : -1;
  const withName = packageLine && given && !packageLine.toLowerCase().includes(`con ${given.toLowerCase()}`)
    ? `${packageLine} con ${given}`
    : packageLine || (given
      ? t(props.language, { es: `Con ${given}`, en: `With ${given}`, pt: `Com ${given}` })
      : "");
  const today = t(props.language, { es: "una es hoy", en: "one is today", pt: "uma é hoje" });
  const copy = props.includesToday ? (withName ? `${withName} · ${today}` : today) : withName;

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
        {total > 0 ? (
          <div className="calm-dots" aria-hidden="true">
            {Array.from({ length: total }, (_, index) => (
              <i
                key={index}
                className={index < used ? "is-used" : index === todayIndex ? "" : "is-free"}
              />
            ))}
          </div>
        ) : null}
      </div>
      <button className="calm-btn calm-btn--yellow" type="button" onClick={props.onReserveAnother}>
        {t(props.language, { es: "Reservar otra", en: "Book another", pt: "Reservar outra" })}
      </button>
    </article>
  );
}
