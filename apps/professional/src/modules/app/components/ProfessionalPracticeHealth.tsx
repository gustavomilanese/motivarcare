import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { PracticeHealthVariant } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const GAUGE_R = 17;
const GAUGE_C = 2 * Math.PI * GAUGE_R;

/** Medidor circular compacto (mobile-friendly): lectura rápida ok vs atención. */
function PracticeSignalGauge(props: { ok: boolean; label: string }) {
  const { ok, label } = props;
  const arcLen = ok ? GAUGE_C : GAUGE_C * 0.38;
  return (
    <div className="pro-signal-gauge">
      <div className="pro-signal-gauge-dial" aria-hidden>
        <svg className="pro-signal-gauge-svg" viewBox="0 0 44 44">
          {/* Marcas tipo reloj (12h) */}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x1 = 22 + Math.cos(a) * 14.5;
            const y1 = 22 + Math.sin(a) * 14.5;
            const x2 = 22 + Math.cos(a) * 16.8;
            const y2 = 22 + Math.sin(a) * 16.8;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="pro-signal-gauge-tick" />;
          })}
          <circle className="pro-signal-gauge-track" cx="22" cy="22" r={GAUGE_R} fill="none" />
          <circle
            className={ok ? "pro-signal-gauge-ring pro-signal-gauge-ring--ok" : "pro-signal-gauge-ring pro-signal-gauge-ring--warn"}
            cx="22"
            cy="22"
            r={GAUGE_R}
            fill="none"
            strokeDasharray={`${arcLen} ${GAUGE_C}`}
            transform="rotate(-90 22 22)"
          />
          <circle className="pro-signal-gauge-hub" cx="22" cy="22" r="3.2" />
          <line
            className="pro-signal-gauge-hand pro-signal-gauge-hand--hour"
            x1="22"
            y1="22"
            x2="22"
            y2={ok ? "12.5" : "15"}
          />
          <line
            className="pro-signal-gauge-hand pro-signal-gauge-hand--minute"
            x1="22"
            y1="22"
            x2={ok ? "30" : "26"}
            y2="22"
          />
        </svg>
      </div>
      <span className="pro-signal-gauge-label">{label}</span>
    </div>
  );
}

const ITEM_LABELS: Record<string, LocalizedText> = {
  listing_live: {
    es: "Perfil público y oferta clara",
    en: "Public profile and clear offer",
    pt: "Perfil publico e oferta clara"
  },
  availability_week: {
    es: "Disponibilidad en los próximos 7 días",
    en: "Availability in the next 7 days",
    pt: "Disponibilidade nos proximos 7 dias"
  },
  agenda_active: {
    es: "Agenda con movimiento (semana o reservas)",
    en: "Active schedule (this week or bookings)",
    pt: "Agenda com movimento (semana ou reservas)"
  },
  conversion_sound: {
    es: "Conversión de reservas (con datos)",
    en: "Booking conversion (with enough data)",
    pt: "Conversao de reservas (com dados)"
  },
  active_caseload: {
    es: "Al menos un paciente activo",
    en: "At least one active patient",
    pt: "Pelo menos um paciente ativo"
  }
};

function variantCopy(
  language: AppLanguage,
  variant: PracticeHealthVariant
): { title: string; subtitle: string } {
  if (variant === "strong") {
    return {
      title: t(language, { es: "Muy buen ritmo", en: "Strong momentum", pt: "Otimo ritmo" }),
      subtitle: t(language, {
        es: "Tus indicadores clave se ven sólidos.",
        en: "Your key signals look solid.",
        pt: "Seus indicadores chave estao solidos."
      })
    };
  }
  if (variant === "balanced") {
    return {
      title: t(language, { es: "Buen camino", en: "On the right track", pt: "No caminho certo" }),
      subtitle: t(language, {
        es: "Hay margen para afinar algunos hábitos.",
        en: "There is room to refine a few habits.",
        pt: "Ha espaco para ajustar alguns habitos."
      })
    };
  }
  return {
    title: t(language, { es: "Hay margen de crecimiento", en: "Room to grow", pt: "Espaco para crescer" }),
    subtitle: t(language, {
      es: "Revisá los ítems en ámbar y el detalle en tu perfil.",
      en: "Review the amber items and your profile details.",
      pt: "Revise os itens em ambar e os detalhes do perfil."
    })
  };
}

function variantPillClass(variant: PracticeHealthVariant): string {
  if (variant === "strong") {
    return "pro-practice-health-pill pro-practice-health-pill--strong";
  }
  if (variant === "balanced") {
    return "pro-practice-health-pill pro-practice-health-pill--balanced";
  }
  return "pro-practice-health-pill pro-practice-health-pill--growth";
}

export function ProfessionalPracticeHealth(props: {
  language: AppLanguage;
  variant: PracticeHealthVariant;
  items: Array<{ id: string; ok: boolean }>;
}) {
  const { title, subtitle } = variantCopy(props.language, props.variant);
  return (
    <section className="pro-card pro-practice-health pro-practice-health--gauges" aria-labelledby="pro-practice-health-title">
      <div className="pro-practice-health-head pro-practice-health-head--gauges">
        <div className="pro-practice-health-head-text">
          <div className="pro-practice-health-title-row">
            <h2 id="pro-practice-health-title">
              {t(props.language, { es: "Indicadores de práctica", en: "Practice signals", pt: "Indicadores de pratica" })}
            </h2>
            <span className={variantPillClass(props.variant)} title={title}>
              <span className="sr-only">{title}</span>
            </span>
          </div>
          <p className="pro-practice-health-lead">
            <strong>{title}</strong> — {subtitle}
          </p>
        </div>
      </div>
      <div className="pro-practice-health-gauges" role="list" aria-label={t(props.language, { es: "Señales", en: "Signals", pt: "Sinais" })}>
        {props.items.map((item) => (
          <div key={item.id} className="pro-signal-gauge-wrap" role="listitem">
            <PracticeSignalGauge
              ok={item.ok}
              label={ITEM_LABELS[item.id] ? t(props.language, ITEM_LABELS[item.id]) : item.id}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PatientStatusSummaryBar(props: {
  language: AppLanguage;
  counts: { active: number; pause: number; cancelled: number; trial: number };
  /** Modificadores extra (p. ej. layout en dashboard). */
  className?: string;
}) {
  const { counts } = props;
  const rows = [
    { key: "active", label: t(props.language, { es: "Activos", en: "Active", pt: "Ativos" }), n: counts.active },
    { key: "trial", label: t(props.language, { es: "Prueba", en: "Trial", pt: "Teste" }), n: counts.trial },
    { key: "pause", label: t(props.language, { es: "Pausa", en: "Paused", pt: "Pausa" }), n: counts.pause },
    {
      key: "cancelled",
      label: t(props.language, { es: "Cancelado", en: "Cancelled", pt: "Cancelado" }),
      n: counts.cancelled
    }
  ];
  const rootClass = ["pro-patient-status-summary", props.className].filter(Boolean).join(" ");
  return (
    <section className={rootClass} aria-label={t(props.language, { es: "Pacientes por estado", en: "Patients by status", pt: "Pacientes por estado" })}>
      {rows.map((row) => (
        <div key={row.key} className={`pro-patient-status-pill pro-patient-status-pill--${row.key}`}>
          <span>{row.label}</span>
          <strong>{row.n}</strong>
        </div>
      ))}
    </section>
  );
}
