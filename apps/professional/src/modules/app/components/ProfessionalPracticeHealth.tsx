import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { PracticeHealthVariant } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
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

export function ProfessionalPracticeHealth(props: {
  language: AppLanguage;
  variant: PracticeHealthVariant;
  items: Array<{ id: string; ok: boolean }>;
}) {
  const { title, subtitle } = variantCopy(props.language, props.variant);
  return (
    <section className="pro-card pro-practice-health" aria-labelledby="pro-practice-health-title">
      <div className="pro-practice-health-head">
        <div>
          <h2 id="pro-practice-health-title">
            {t(props.language, { es: "Indicadores de práctica", en: "Practice signals", pt: "Indicadores de pratica" })}
          </h2>
          <p className="pro-practice-health-lead">
            <strong>{title}</strong> — {subtitle}
          </p>
        </div>
      </div>
      <ul className="pro-practice-health-dots" aria-label={t(props.language, { es: "Señales", en: "Signals", pt: "Sinais" })}>
        {props.items.map((item) => (
          <li key={item.id} className="pro-practice-health-dot-item">
            <span
              className={`pro-practice-health-dot ${item.ok ? "pro-practice-health-dot--ok" : "pro-practice-health-dot--warn"}`}
              aria-hidden="true"
            >
              {item.ok ? "✓" : "!"}
            </span>
            <span className="pro-practice-health-dot-label">
              {ITEM_LABELS[item.id]
                ? t(props.language, ITEM_LABELS[item.id])
                : item.id}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PatientStatusSummaryBar(props: {
  language: AppLanguage;
  counts: { active: number; pause: number; cancelled: number; trial: number };
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
  return (
    <section className="pro-patient-status-summary" aria-label={t(props.language, { es: "Pacientes por estado", en: "Patients by status", pt: "Pacientes por estado" })}>
      {rows.map((row) => (
        <div key={row.key} className={`pro-patient-status-pill pro-patient-status-pill--${row.key}`}>
          <span>{row.label}</span>
          <strong>{row.n}</strong>
        </div>
      ))}
    </section>
  );
}
