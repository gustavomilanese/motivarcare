import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { resolveSessionCreditDots } from "./resolveSessionCreditDots";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Paquetes reales del DS (~4). Arriba de esto no caben círculos legibles. */
export const SESSION_CREDITS_MAX_DOTS = 8;

/** Puntitos DS: tomada (bosque) · reservada (salvia) · disponible (punteado). */
export function SessionCreditsMeter(props: {
  language: AppLanguage;
  available: number;
  packageSize: number;
  /** Próximas reservas que ya consumieron crédito del paquete. */
  reserved?: number;
  variant?: "home" | "sessions";
}) {
  const variant = props.variant ?? "home";
  const dots = resolveSessionCreditDots({
    available: props.available,
    packageSize: props.packageSize,
    reserved: props.reserved ?? 0
  });
  if (dots.length === 0) return null;

  if (dots.length > SESSION_CREDITS_MAX_DOTS) {
    const taken = dots.filter((dot) => dot === "taken").length;
    const reserved = dots.filter((dot) => dot === "reserved").length;
    const free = dots.filter((dot) => dot === "free").length;
    const summary =
      taken > 0 || reserved > 0
        ? t(props.language, {
            es: `${taken} tomadas · ${reserved} reservadas · ${free} disponibles`,
            en: `${taken} taken · ${reserved} reserved · ${free} available`,
            pt: `${taken} feitas · ${reserved} reservadas · ${free} disponíveis`
          })
        : t(props.language, {
            es: `Paquete de ${dots.length}`,
            en: `Pack of ${dots.length}`,
            pt: `Pacote de ${dots.length}`
          });
    return <p className={`session-credits-meter-summary session-credits-meter-summary--${variant}`}>{summary}</p>;
  }

  const rowClass = variant === "sessions" ? "sessions-calm-dots" : "calm-dots";

  return (
    <div className={rowClass} aria-hidden="true">
      {dots.map((dot, index) => {
        if (dot === "taken") return <i key={index} className="is-used" />;
        if (dot === "free") return <i key={index} className="is-free" />;
        // Reservada = estilo base del DS (salvia sólida, sin clase).
        return <i key={index} />;
      })}
    </div>
  );
}
