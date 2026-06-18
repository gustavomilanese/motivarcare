import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { type AppLanguage, type LocalizedText, type SupportedCurrency, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { PatientAvatarImage } from "../components/PatientAvatarImage";
import { ProPageLoader } from "../components/ProPageLoader";
import { useProPortalChrome } from "../components/ProPortalChromeContext";
import { formatRecordedFinanceMinor } from "../lib/formatRecordedFinanceMinor";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest, resolveApiAssetUrl } from "../services/api";
import { PatientEmotionalDiaryPanel } from "../../patients/components/PatientEmotionalDiaryPanel";
import type { PatientDetailResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function patientStatusLabel(
  status: PatientDetailResponse["patient"]["status"],
  language: AppLanguage
): string {
  if (status === "active") {
    return t(language, { es: "Activo", en: "Active", pt: "Ativo" });
  }
  if (status === "pause") {
    return t(language, { es: "En pausa", en: "Paused", pt: "Em pausa" });
  }
  if (status === "cancelled") {
    return t(language, { es: "Cancelado", en: "Cancelled", pt: "Cancelado" });
  }
  return t(language, { es: "De prueba", en: "Trial", pt: "Teste" });
}

function formatDateOnly(value: string | null, language: AppLanguage): string {
  if (!value) {
    return "—";
  }
  return formatDateWithLocale({
    value,
    language,
    options: { month: "short", day: "numeric", year: "numeric" }
  });
}

export function PatientDetailPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const highlightBookingId = searchParams.get("bookingId")?.trim() || "";
  const navigate = useNavigate();
  const [data, setData] = useState<PatientDetailResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) {
      return;
    }
    apiRequest<PatientDetailResponse>(`/api/professional/patients/${encodeURIComponent(patientId)}`, props.token)
      .then((response) => {
        setData(response);
        setError("");
      })
      .catch((requestError) => {
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(professionalSurfaceMessage("patient-detail-load", props.language, raw));
      });
  }, [props.token, patientId, props.language]);

  useEffect(() => {
    if (!highlightBookingId || !data) {
      return;
    }
    requestAnimationFrame(() => {
      document.getElementById(`pro-booking-${highlightBookingId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [highlightBookingId, data]);

  useProPortalChrome({
    title:
      data?.patient.patientName
      ?? t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })
  });

  if (!patientId) {
    return (
      <section className="pro-card">
        <p className="pro-error">{t(props.language, { es: "Paciente no válido.", en: "Invalid patient.", pt: "Paciente invalido." })}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="pro-card">
        <button type="button" className="pro-link-back" onClick={() => navigate(-1)}>
          ← {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
        </button>
        <p className="pro-error">{error}</p>
      </section>
    );
  }

  if (!data) {
    return <ProPageLoader language={props.language} layout="block" />;
  }

  const { patient, paymentMovements } = data;
  const avatarSrc = resolveApiAssetUrl(patient.avatarUrl ?? null);
  const visiblePaymentMovements = (() => {
    const preview = paymentMovements.slice(0, 8);
    if (!highlightBookingId) {
      return preview;
    }
    if (preview.some((movement) => movement.bookingId === highlightBookingId)) {
      return preview;
    }
    const highlighted = paymentMovements.find((movement) => movement.bookingId === highlightBookingId);
    return highlighted ? [...preview, highlighted] : preview;
  })();

  return (
    <div className="pro-grid-stack pro-patient-detail-page">
      <header className="pro-patient-detail-header">
        <button type="button" className="pro-link-back" onClick={() => navigate("/pacientes")}>
          ← {t(props.language, { es: "Clientes", en: "Clients", pt: "Clientes" })}
        </button>
        <div className="pro-patient-detail-hero">
          <PatientAvatarImage
            src={avatarSrc}
            imgClassName="pro-patient-avatar pro-patient-avatar--large"
            emptyClassName="pro-patient-avatar pro-patient-avatar--large pro-patient-avatar--empty"
          />
          <div>
            <p className="pro-patient-detail-name">{patient.patientName}</p>
            <span className={`pro-status-pill pro-status-pill--${patient.status}`}>
              {patientStatusLabel(patient.status, props.language)}
            </span>
            <p className="pro-patient-detail-email">{patient.patientEmail}</p>
          </div>
        </div>
      </header>

      <section className="pro-card pro-patient-metrics-card" aria-labelledby="pro-patient-activity-title">
        <h2 id="pro-patient-activity-title" className="pro-section-kicker">
          {t(props.language, { es: "Actividad", en: "Activity", pt: "Atividade" })}
        </h2>
        <dl className="pro-patient-metrics-dl">
          <div>
            <dt>{t(props.language, { es: "Sesiones realizadas", en: "Completed sessions", pt: "Sessoes realizadas" })}</dt>
            <dd>{patient.completedSessions}</dd>
          </div>
          <div>
            <dt>{t(props.language, { es: "Total de reservas", en: "Total bookings", pt: "Total de reservas" })}</dt>
            <dd>{patient.totalSessions}</dd>
          </div>
          <div>
            <dt>{t(props.language, { es: "Canceladas (hist.)", en: "Cancelled (hist.)", pt: "Canceladas (hist.)" })}</dt>
            <dd>{patient.cancelledSessions}</dd>
          </div>
          <div>
            <dt>{t(props.language, { es: "Primera sesión", en: "First session", pt: "Primeira sessao" })}</dt>
            <dd>{formatDateOnly(patient.firstSessionAt, props.language)}</dd>
          </div>
          <div>
            <dt>{t(props.language, { es: "Última sesión completada", en: "Last completed session", pt: "Ultima sessao concluida" })}</dt>
            <dd>{formatDateOnly(patient.lastCompletedSessionAt, props.language)}</dd>
          </div>
          <div>
            <dt>{t(props.language, { es: "Días desde última sesión", en: "Days since last session", pt: "Dias desde ultima sessao" })}</dt>
            <dd>{patient.daysSinceLastSession}</dd>
          </div>
        </dl>
        {(patient.lifetimeTotals ?? []).length > 0 ? (
          <div className="pro-patient-finance-strip">
            <h3 className="pro-patient-finance-strip__title">
              {t(props.language, {
                es: "Cobros registrados",
                en: "Recorded payouts",
                pt: "Pagamentos registrados"
              })}
            </h3>
            <p className="pro-patient-finance-strip__hint">
              {t(props.language, {
                es: "Neto profesional según las liquidaciones en la plataforma.",
                en: "Your net from platform payout records.",
                pt: "Liquido profissional nas liquidacoes da plataforma."
              })}
            </p>
            <ul className="pro-patient-finance-rows">
              {(patient.lifetimeTotals ?? []).map((row) => (
                <li key={row.currency} className="pro-patient-finance-row">
                  <div className="pro-patient-finance-row__main">
                    <span className="pro-currency-chip">{row.currency.toUpperCase()}</span>
                    <span className="pro-patient-finance-row__amount">
                      {formatRecordedFinanceMinor(row.netCents, row.currency, props.language)}
                    </span>
                  </div>
                  <span className="pro-patient-finance-row__meta">
                    {t(props.language, {
                      es: `${row.sessions} sesión(es) liquidadas`,
                      en: `${row.sessions} paid session(s)`,
                      pt: `${row.sessions} sessao(oes) liquidadas`
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="pro-card pro-patient-actions-card">
        <h2>{t(props.language, { es: "Acciones", en: "Actions", pt: "Acoes" })}</h2>
        <ul className="pro-patient-action-list">
          <li>
            <Link className="pro-patient-action-row" to={`/chat?patientId=${encodeURIComponent(patient.patientId)}`}>
              <span className="pro-patient-action-icon" aria-hidden="true">
                💬
              </span>
              <span>{t(props.language, { es: "Escribir en el chat", en: "Message in chat", pt: "Escrever no chat" })}</span>
            </Link>
          </li>
          <li>
            <Link
              className="pro-patient-action-row"
              to={`/ingresos?patientId=${encodeURIComponent(patient.patientId)}`}
            >
              <span className="pro-patient-action-icon" aria-hidden="true">
                📊
              </span>
              <span>{t(props.language, { es: "Ver ingresos de este paciente", en: "View earnings for this client", pt: "Ver receitas deste paciente" })}</span>
            </Link>
          </li>
        </ul>
      </section>

      <PatientEmotionalDiaryPanel patientId={patientId} token={props.token} language={props.language} />

      <section className="pro-card pro-patient-payments-preview">
        <h2>{t(props.language, { es: "Últimos cobros", en: "Recent payouts", pt: "Ultimos cobros" })}</h2>
        {paymentMovements.length === 0 ? (
          <p className="pro-muted">
            {t(props.language, {
              es: "Todavía no hay sesiones completadas con liquidación para este paciente.",
              en: "No completed sessions with payout records for this patient yet.",
              pt: "Ainda nao ha sessoes concluidas com liquidacao para este paciente."
            })}
          </p>
        ) : (
          <ul className="pro-list pro-list--income pro-list--compact">
            {visiblePaymentMovements.map((movement) => (
              <li
                key={movement.bookingId}
                id={`pro-booking-${movement.bookingId}`}
                className={highlightBookingId === movement.bookingId ? "pro-booking-highlight" : undefined}
              >
                <div className="pro-income-movement-meta">
                  <strong>{formatDateWithLocale({ value: movement.startsAt, language: props.language, options: { dateStyle: "medium" } })}</strong>
                  <span className="pro-income-movement-dateline">
                    <span className="pro-currency-chip">{movement.currency.toUpperCase()}</span>
                  </span>
                </div>
                <div className="pro-income-movement-amounts">
                  <div className="pro-income-movement-hero-net">
                    {t(props.language, { es: "Neto", en: "Net", pt: "Liquido" })}{" "}
                    <strong>{formatRecordedFinanceMinor(movement.amountCents, movement.currency, props.language)}</strong>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pro-card pro-patient-roadmap">
        <h2>{t(props.language, { es: "Próximamente", en: "Coming soon", pt: "Em breve" })}</h2>
        <p className="pro-muted">
          {t(props.language, {
            es: "Acuerdo formal con el paciente, ajuste de precio por vínculo y seguimiento de visitas al perfil público.",
            en: "Formal agreement with the patient, per-relationship pricing, and public profile visit tracking.",
            pt: "Acordo formal com o paciente, ajuste de preco por vinculo e visitas ao perfil publico."
          })}
        </p>
      </section>
    </div>
  );
}
