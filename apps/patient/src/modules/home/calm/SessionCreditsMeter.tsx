import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Paquetes reales del DS (~4). Arriba de esto no caben círculos legibles. */
export const SESSION_CREDITS_MAX_DOTS = 8;

function resolveTotals(available: number, packageSize: number): { total: number; used: number; available: number } {
  const remaining = Math.max(0, Math.floor(available));
  const pack = Math.max(0, Math.floor(packageSize));
  const total = Math.max(pack, remaining);
  const used = Math.min(total, Math.max(0, total - remaining));
  return { total, used, available: remaining };
}

/** Puntitos DS para paquetes chicos; resumen textual si el total es grande (ej. 40 de prueba). */
export function SessionCreditsMeter(props: {
  language: AppLanguage;
  available: number;
  packageSize: number;
  /** Marca el próximo círculo libre como “hoy” (home). */
  includesToday?: boolean;
  variant?: "home" | "sessions";
}) {
  const variant = props.variant ?? "home";
  const { total, used, available } = resolveTotals(props.available, props.packageSize);
  if (total <= 0) return null;

  if (total > SESSION_CREDITS_MAX_DOTS) {
    const summary =
      used > 0
        ? t(props.language, {
            es: `${used} usadas · ${available} disponibles`,
            en: `${used} used · ${available} available`,
            pt: `${used} usadas · ${available} disponíveis`
          })
        : t(props.language, {
            es: `Paquete de ${total}`,
            en: `Pack of ${total}`,
            pt: `Pacote de ${total}`
          });
    return <p className={`session-credits-meter-summary session-credits-meter-summary--${variant}`}>{summary}</p>;
  }

  const todayIndex = props.includesToday && used < total ? used : -1;
  const rowClass = variant === "sessions" ? "sessions-calm-dots" : "calm-dots";

  return (
    <div className={rowClass} aria-hidden="true">
      {Array.from({ length: total }, (_, index) => {
        if (index < used) return <i key={index} className="is-used" />;
        // Home con “hoy”: el próximo queda sólido (salvia); el resto, libre punteado.
        if (props.includesToday) {
          return <i key={index} className={index === todayIndex ? undefined : "is-free"} />;
        }
        return <i key={index} />;
      })}
    </div>
  );
}
