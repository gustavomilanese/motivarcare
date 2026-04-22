import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyCents,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { adminSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
import { apiRequest } from "../services/api";
import type { AdminProfessionalOps, KpisResponse, ProfessionalsResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function utcMonthKeyFromDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMoneyCents(cents: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyCents({
    centsInUsd: cents,
    language,
    currency,
    maximumFractionDigits: 0
  });
}

function StatCard(props: {
  label: string;
  value: string;
  hint?: string;
  variant?: "default" | "accent";
}) {
  return (
    <article className={`dashboard-stat-card${props.variant === "accent" ? " dashboard-stat-card--accent" : ""}`}>
      <span className="dashboard-stat-label">{props.label}</span>
      <strong className="dashboard-stat-value">{props.value}</strong>
      {props.hint ? <p className="dashboard-stat-hint">{props.hint}</p> : null}
    </article>
  );
}

function truncatePlain(text: string, maxLen: number): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= maxLen) {
    return s;
  }
  return `${s.slice(0, maxLen - 1)}…`;
}

function DashboardPendingProfessionalApprovals(props: { token: string; language: AppLanguage }) {
  const [rows, setRows] = useState<AdminProfessionalOps[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<"approve" | "reject" | null>(null);
  const [actionError, setActionError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setActionError("");
    try {
      const data = await apiRequest<ProfessionalsResponse>(
        "/api/admin/professionals?registrationApproval=PENDING",
        {},
        props.token
      );
      const pending = (data.professionals ?? []).filter((p) => p.registrationApproval === "PENDING");
      setRows(pending);
      setExpandedId((current) => (current && pending.some((p) => p.id === current) ? current : null));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [props.token]);

  useEffect(() => {
    void load();
  }, [load]);

  const bumpSidebar = () => {
    try {
      window.dispatchEvent(new CustomEvent("mc-admin-pending-prof-refresh"));
    } catch {
      // ignore
    }
  };

  const approveOne = async (professional: AdminProfessionalOps) => {
    setActionError("");
    setActionId(professional.id);
    setActionKind("approve");
    try {
      await apiRequest<{ professional: AdminProfessionalOps }>(
        `/api/admin/professionals/${professional.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ registrationApproval: "APPROVED", visible: true })
        },
        props.token
      );
      setExpandedId((id) => (id === professional.id ? null : id));
      await load();
      bumpSidebar();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setActionError(adminSurfaceMessage("prof-ops-update", props.language, raw));
    } finally {
      setActionId(null);
      setActionKind(null);
    }
  };

  const rejectOne = async (professional: AdminProfessionalOps) => {
    const ok = window.confirm(
      t(props.language, {
        es: "¿Rechazar esta alta? No aparecerá en el directorio ni en matching.",
        en: "Reject this sign-up? They will not appear in the directory or matching.",
        pt: "Rejeitar este cadastro? Nao aparecera no diretorio nem no matching."
      })
    );
    if (!ok) {
      return;
    }
    setActionError("");
    setActionId(professional.id);
    setActionKind("reject");
    try {
      await apiRequest<{ professional: AdminProfessionalOps }>(
        `/api/admin/professionals/${professional.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ registrationApproval: "REJECTED", visible: false })
        },
        props.token
      );
      setExpandedId((id) => (id === professional.id ? null : id));
      await load();
      bumpSidebar();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setActionError(adminSurfaceMessage("prof-ops-update", props.language, raw));
    } finally {
      setActionId(null);
      setActionKind(null);
    }
  };

  if (loading || rows.length === 0) {
    return null;
  }

  return (
    <section
      id="admin-pending-prof-approvals"
      className="dashboard-pending-approvals"
      aria-label={t(props.language, {
        es: "Profesionales con alta pendiente de aprobación",
        en: "Professionals pending registration approval",
        pt: "Profissionais com cadastro pendente de aprovacao"
      })}
    >
      <div className="dashboard-pending-approvals__head">
        <h2 className="dashboard-pending-approvals__title">
          {t(props.language, {
            es: "Altas pendientes",
            en: "Pending sign-ups",
            pt: "Cadastros pendentes"
          })}
        </h2>
        <Link className="dashboard-pending-approvals__link" to="/professionals">
          {t(props.language, { es: "Ficha en Psicólogos", en: "Full profile in Psychologists", pt: "Ficha em Psicologos" })}
        </Link>
      </div>
      <p className="dashboard-pending-approvals__hint">
        {t(props.language, {
          es: "Desplegá el detalle, revisá y aprobá o rechazá.",
          en: "Expand details, review, then approve or reject.",
          pt: "Abra o detalhe, revise e aprove ou rejeite."
        })}
      </p>
      <ul className="dashboard-pending-approvals__list">
        {rows.map((professional) => {
          const open = expandedId === professional.id;
          const busy = actionId === professional.id;
          return (
            <li key={professional.id} className="dashboard-pending-approvals__card">
              <div className="dashboard-pending-approvals__row">
                <button
                  type="button"
                  className="dashboard-pending-approvals__toggle"
                  aria-expanded={open}
                  aria-controls={`pending-prof-detail-${professional.id}`}
                  onClick={() => setExpandedId(open ? null : professional.id)}
                >
                  <span className="dashboard-pending-approvals__chevron" aria-hidden>
                    {open ? "▼" : "▶"}
                  </span>
                  <span className="dashboard-pending-approvals__toggle-text">
                    <strong>{professional.fullName}</strong>
                    <span className="dashboard-pending-approvals__email">{professional.email}</span>
                  </span>
                </button>
                <div className="dashboard-pending-approvals__actions">
                  <button
                    type="button"
                    className="dashboard-pending-approvals__approve"
                    disabled={busy}
                    onClick={() => void approveOne(professional)}
                  >
                    {busy && actionKind === "approve"
                      ? t(props.language, { es: "Aprobando…", en: "Approving…", pt: "Aprovando…" })
                      : t(props.language, { es: "Aprobar", en: "Approve", pt: "Aprovar" })}
                  </button>
                  <button
                    type="button"
                    className="dashboard-pending-approvals__reject"
                    disabled={busy}
                    onClick={() => void rejectOne(professional)}
                  >
                    {busy && actionKind === "reject"
                      ? t(props.language, { es: "Rechazando…", en: "Rejecting…", pt: "Rejeitando…" })
                      : t(props.language, { es: "Rechazar", en: "Reject", pt: "Rejeitar" })}
                  </button>
                </div>
              </div>
              {open ? (
                <div
                  id={`pending-prof-detail-${professional.id}`}
                  className="dashboard-pending-approvals__detail"
                  role="region"
                >
                  <dl className="dashboard-pending-approvals__dl">
                    <div>
                      <dt>{t(props.language, { es: "Título", en: "Title", pt: "Titulo" })}</dt>
                      <dd>{professional.professionalTitle?.trim() || "—"}</dd>
                    </div>
                    <div>
                      <dt>{t(props.language, { es: "Especialidad", en: "Specialization", pt: "Especialidade" })}</dt>
                      <dd>{professional.specialization?.trim() || "—"}</dd>
                    </div>
                    <div>
                      <dt>{t(props.language, { es: "Sesión USD", en: "Session (USD)", pt: "Sessao USD" })}</dt>
                      <dd>
                        {professional.sessionPriceUsd != null ? `$${professional.sessionPriceUsd}` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>{t(props.language, { es: "Experiencia (años)", en: "Experience (yrs)", pt: "Experiencia (anos)" })}</dt>
                      <dd>{professional.yearsExperience != null ? String(professional.yearsExperience) : "—"}</dd>
                    </div>
                    <div>
                      <dt>{t(props.language, { es: "País", en: "Country", pt: "Pais" })}</dt>
                      <dd>{professional.birthCountry?.trim() || "—"}</dd>
                    </div>
                  </dl>
                  <div className="dashboard-pending-approvals__long">
                    <span className="dashboard-pending-approvals__long-label">
                      {t(props.language, { es: "Bio", en: "Bio", pt: "Bio" })}
                    </span>
                    <p>{professional.bio?.trim() ? truncatePlain(professional.bio, 560) : "—"}</p>
                  </div>
                  <div className="dashboard-pending-approvals__long">
                    <span className="dashboard-pending-approvals__long-label">
                      {t(props.language, { es: "Enfoque", en: "Approach", pt: "Abordagem" })}
                    </span>
                    <p>
                      {professional.therapeuticApproach?.trim()
                        ? truncatePlain(professional.therapeuticApproach, 320)
                        : "—"}
                    </p>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {actionError ? <p className="dashboard-pending-approvals__error">{actionError}</p> : null}
    </section>
  );
}

function BarCompare(props: {
  title: string;
  subtitle: string;
  rows: Array<{ key: string; label: string; value: number; display: string; color: string }>;
}) {
  const max = Math.max(...props.rows.map((r) => r.value), 1);
  return (
    <article className="card dashboard-compare-card">
      <header className="dashboard-compare-head">
        <h3>{props.title}</h3>
        <small>{props.subtitle}</small>
      </header>
      <div className="dashboard-compare-body">
        {props.rows.map((row) => (
          <div key={row.key} className="dashboard-compare-row">
            <div className="dashboard-compare-row-top">
              <span>{row.label}</span>
              <strong>{row.display}</strong>
            </div>
            <div className="dashboard-bar-track dashboard-compare-track">
              <div
                className="dashboard-bar-fill"
                style={{ width: `${Math.max(6, Math.round((row.value / max) * 100))}%`, background: row.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

type OverviewPageProps = {
  token: string;
  language: AppLanguage;
  currency: SupportedCurrency;
  pendingProfessionalRegistrationCount?: number;
  onNotificationCenterClick?: () => void;
};

function OverviewPage(props: OverviewPageProps) {
  const [response, setResponse] = useState<KpisResponse | null>(null);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => utcMonthKeyFromDate(new Date()));
  const maxMonth = utcMonthKeyFromDate(new Date());
  const viewingPastMonth = selectedMonth !== maxMonth;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setError("");
      setResponse(null);
      try {
        const query = new URLSearchParams();
        query.set("month", selectedMonth);
        const data = await apiRequest<KpisResponse>(`/api/admin/kpis?${query.toString()}`, {}, props.token);
        if (active) {
          setResponse(data);
        }
      } catch (requestError) {
        if (active) {
          setResponse(null);
          const raw = requestError instanceof Error ? requestError.message : "";
          setError(adminSurfaceMessage("admin-kpis-load", props.language, raw));
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [props.token, selectedMonth]);

  const k = response?.kpis;
  const loadBars =
    k !== undefined
      ? [
          {
            key: "patients",
            label: t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" }),
            value: k.activePatients,
            tone: "var(--brand)"
          },
          {
            key: "pros",
            label: t(props.language, { es: "Profesionales visibles", en: "Visible pros", pt: "Profissionais" }),
            value: Math.max(1, k.activeProfessionals),
            tone: "var(--brand-2)"
          },
          {
            key: "sessions",
            label: t(props.language, { es: "Sesiones confirmadas", en: "Confirmed sessions", pt: "Sessoes confirmadas" }),
            value: k.scheduledSessions,
            tone: "#9d8cf6"
          },
          {
            key: "purchases",
            label: t(props.language, { es: "Compras del mes (#)", en: "Purchases (mo. #)", pt: "Compras (n)" }),
            value: Math.max(1, k.packagePurchasesMonthCount ?? 0),
            tone: "#c9c0fd"
          }
        ]
      : [];
  const maxLoad = Math.max(...loadBars.map((item) => item.value), 1);

  const pkgFee = k?.packagePlatformFeeFromPurchasesMonthCents ?? 0;
  const pkgProNet = k?.packageProfessionalNetFromPurchasesMonthCents ?? 0;
  const grossPkg = k?.packagePurchasesMonthCents ?? 0;
  const trialCount = k?.trialSessionsMonthCount ?? 0;
  const trialGross = k?.trialGrossMonthCents ?? 0;
  const trialFee = k?.trialPlatformFeeMonthCents ?? 0;
  const trialNet = k?.trialProfessionalNetMonthCents ?? 0;
  const grossPkgAndTrial = grossPkg + trialGross;
  const feePkgAndTrial = pkgFee + trialFee;
  const proNetPkgAndTrial = pkgProNet + trialNet;
  const grossSess = k?.grossSessionsMonthCents ?? 0;
  const feeSess = k?.platformFeeMonthCents ?? 0;

  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div className="dashboard-page-header__top">
          <div>
            <p className="dashboard-hero-eyebrow">{t(props.language, { es: "Panel ejecutivo", en: "Executive overview", pt: "Painel executivo" })}</p>
            <h1 className="dashboard-page-title">{t(props.language, { es: "Resumen del mes", en: "Month at a glance", pt: "Resumo do mes" })}</h1>
          </div>
          <div className="dashboard-header-actions">
            {typeof props.onNotificationCenterClick === "function" ? (
              <button
                type="button"
                className="dashboard-notify-bell"
                onClick={props.onNotificationCenterClick}
                aria-label={t(props.language, {
                  es: "Notificaciones: altas de psicólogos pendientes",
                  en: "Notifications: pending psychologist sign-ups",
                  pt: "Notificacoes: cadastros de psicologos pendentes"
                })}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {(props.pendingProfessionalRegistrationCount ?? 0) > 0 ? (
                  <span className="dashboard-notify-badge">{props.pendingProfessionalRegistrationCount}</span>
                ) : null}
              </button>
            ) : null}
            <div className="dashboard-month-field">
              <input
                className="dashboard-month-input"
                type="month"
                value={selectedMonth}
                max={maxMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                aria-label={t(props.language, { es: "Mes del resumen", en: "Summary month", pt: "Mes do resumo" })}
              />
            </div>
          </div>
        </div>
        <DashboardPendingProfessionalApprovals token={props.token} language={props.language} />
      </header>

      {error ? (
        <section className="card">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {!response && !error ? (
        <section className="card">
          <p>{t(props.language, { es: "Cargando overview...", en: "Loading overview...", pt: "Carregando visao geral..." })}</p>
        </section>
      ) : null}

      {k === undefined ? null : (
        <>
      <section
        className="dashboard-section dashboard-section--raised dashboard-section--tone-op"
        aria-labelledby="dash-op"
      >
        <h2 id="dash-op" className="dashboard-section-title">
          {t(props.language, { es: "Operación", en: "Operations", pt: "Operacao" })}
        </h2>
        {viewingPastMonth ? (
          <p className="dashboard-section-asof">
            {t(props.language, {
              es: "Pacientes y profesionales: estado actual. Sesiones confirmadas e ingresos: mes elegido (UTC), misma ventana que las pruebas y paquetes.",
              en: "Patients and pros: current state. Confirmed sessions and revenue: selected month (UTC), same window as trials and packages.",
              pt: "Pacientes e pros: estado atual. Sessoes confirmadas e receita: mes escolhido (UTC)."
            })}
          </p>
        ) : null}
        <div className="dashboard-stat-grid dashboard-stat-grid--3">
          <StatCard label={t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })} value={String(k.activePatients)} />
          <StatCard
            label={t(props.language, { es: "Profesionales visibles", en: "Visible professionals", pt: "Profissionais visiveis" })}
            value={String(k.activeProfessionals)}
          />
          <StatCard
            label={t(props.language, {
              es: "Sesiones confirmadas (mes)",
              en: "Confirmed sessions (month)",
              pt: "Sessoes confirmadas (mes)"
            })}
            value={String(k.scheduledSessions)}
            hint={t(props.language, {
              es: "Inicio de la reserva en el mes UTC elegido",
              en: "Booking start falls in the selected UTC month",
              pt: "Inicio da reserva no mes UTC escolhido"
            })}
          />
        </div>
      </section>

      <section className="dashboard-section dashboard-section--highlight dashboard-section--tone-pkg" aria-labelledby="dash-pkg">
        <h2 id="dash-pkg" className="dashboard-section-title">
          {t(props.language, {
            es: "Ingresos del mes: paquetes + sesiones de prueba",
            en: "Month revenue: packages + trial sessions",
            pt: "Receita do mes: pacotes + sessoes de teste"
          })}
        </h2>
        <p className="dashboard-section-asof" style={{ marginTop: 0 }}>
          {t(props.language, {
            es: "Las pruebas usan el precio de sesión del profesional y el % de comisión de prueba configurado en finanzas (p. ej. 100% plataforma).",
            en: "Trial rows use the professional session price and the trial commission percent from finance settings (e.g. 100% platform).",
            pt: "Trials usam o preco da sessao do profissional e o percentual de trial em financas."
          })}
        </p>
        <div className="dashboard-stat-grid dashboard-stat-grid--4">
          <StatCard
            label={t(props.language, { es: "Movimientos (#)", en: "Line items (#)", pt: "Linhas (#)" })}
            value={String((k.packagePurchasesMonthCount ?? 0) + trialCount)}
            hint={replaceTemplate(
              t(props.language, {
                es: "{pkg} paquetes · {pr} pruebas",
                en: "{pkg} packages · {pr} trials",
                pt: "{pkg} pacotes · {pr} provas"
              }),
              { pkg: String(k.packagePurchasesMonthCount ?? 0), pr: String(trialCount) }
            )}
          />
          <StatCard
            label={t(props.language, { es: "Bruto pacientes", en: "Patient gross", pt: "Bruto pacientes" })}
            value={formatMoneyCents(grossPkgAndTrial, props.language, props.currency)}
            hint={replaceTemplate(
              t(props.language, {
                es: "Paquetes {p} + pruebas {t}",
                en: "Packages {p} + trials {t}",
                pt: "Pacotes {p} + provas {t}"
              }),
              {
                p: formatMoneyCents(grossPkg, props.language, props.currency),
                t: formatMoneyCents(trialGross, props.language, props.currency)
              }
            )}
          />
          <StatCard
            variant="accent"
            label={t(props.language, { es: "Comisión plataforma", en: "Platform commission", pt: "Comissao plataforma" })}
            value={formatMoneyCents(feePkgAndTrial, props.language, props.currency)}
            hint={t(props.language, {
              es: "Sobre paquetes vendidos + pruebas del mes",
              en: "On packages sold + trials in month",
              pt: "Pacotes + provas no mes"
            })}
          />
          <StatCard
            label={t(props.language, { es: "A pagar a profesionales", en: "Owed to professionals", pt: "A pagar pros" })}
            value={formatMoneyCents(proNetPkgAndTrial, props.language, props.currency)}
            hint={t(props.language, {
              es: "Reparto paquetes + neto pruebas (según % prueba)",
              en: "Package split + trial net (per trial %)",
              pt: "Pacotes + liquido provas"
            })}
          />
        </div>
      </section>

      <section
        className="dashboard-section dashboard-section--raised dashboard-section--tone-viz"
        aria-labelledby="dash-viz"
      >
        <h2 id="dash-viz" className="dashboard-section-title">
          {t(props.language, { es: "Comparativas del mes", en: "Month comparisons", pt: "Comparativas do mes" })}
        </h2>
        <div className="dashboard-chart-grid">
        <BarCompare
          title={t(props.language, {
            es: "Bruto: paquetes, pruebas y sesiones hechas",
            en: "Gross: packages, trials, completed sessions",
            pt: "Bruto: pacotes, provas e sessoes"
          })}
          subtitle={t(props.language, {
            es: "Misma escala relativa dentro del mes",
            en: "Same relative scale for the month",
            pt: "Escala relativa no mes"
          })}
          rows={[
            {
              key: "pkg",
              label: t(props.language, { es: "Ventas paquetes", en: "Package sales", pt: "Vendas pacotes" }),
              value: grossPkg,
              display: formatMoneyCents(grossPkg, props.language, props.currency),
              color: "var(--brand)"
            },
            {
              key: "trial",
              label: t(props.language, { es: "Sesiones de prueba", en: "Trial sessions", pt: "Sessoes de teste" }),
              value: trialGross,
              display: formatMoneyCents(trialGross, props.language, props.currency),
              color: "#7c6ae8"
            },
            {
              key: "sess",
              label: t(props.language, { es: "Sesiones completadas", en: "Completed sessions", pt: "Sessoes concluidas" }),
              value: grossSess,
              display: formatMoneyCents(grossSess, props.language, props.currency),
              color: "#c9c0fd"
            }
          ]}
        />
        <BarCompare
          title={t(props.language, {
            es: "Comisión: paquete, prueba y sesión",
            en: "Fee: package, trial, session",
            pt: "Comissao: pacote, prova e sessao"
          })}
          subtitle={t(props.language, {
            es: "Plataforma: paquetes, % trial del backend y sesiones contabilizadas",
            en: "Platform: packages, backend trial % and counted sessions",
            pt: "Plataforma: pacotes, trial e sessoes"
          })}
          rows={[
            {
              key: "pf",
              label: t(props.language, { es: "Por compra de paquete", en: "From package purchase", pt: "Na compra do pacote" }),
              value: pkgFee,
              display: formatMoneyCents(pkgFee, props.language, props.currency),
              color: "var(--brand)"
            },
            {
              key: "tf",
              label: t(props.language, { es: "Por sesión de prueba", en: "From trial session", pt: "Por sessao de teste" }),
              value: trialFee,
              display: formatMoneyCents(trialFee, props.language, props.currency),
              color: "#7c6ae8"
            },
            {
              key: "sf",
              label: t(props.language, { es: "Por sesión completada", en: "From completed session", pt: "Por sessao feita" }),
              value: feeSess,
              display: formatMoneyCents(feeSess, props.language, props.currency),
              color: "#c9c0fd"
            }
          ]}
        />
        </div>
      </section>

      <section
        className="dashboard-section dashboard-section--raised dashboard-section--tone-load"
        aria-labelledby="dash-load"
      >
        <h2 id="dash-load" className="dashboard-section-title">
          {t(props.language, { es: "Carga relativa", en: "Relative load", pt: "Carga relativa" })}
        </h2>
        <article className="card dashboard-chart-card">
          <div className="dashboard-bar-chart">
            {loadBars.map((item) => (
              <div key={item.key} className="dashboard-bar-row">
                <span>{item.label}</span>
                <div className="dashboard-bar-track">
                  <div className="dashboard-bar-fill" style={{ width: `${Math.max(10, Math.round((item.value / maxLoad) * 100))}%`, background: item.tone }} />
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section
        className="dashboard-section dashboard-section--raised dashboard-section--tone-sess"
        aria-labelledby="dash-sess-mo"
      >
        <h2 id="dash-sess-mo" className="dashboard-section-title">
          {t(props.language, { es: "Por sesiones completadas (mes)", en: "From completed sessions (month)", pt: "Por sessoes concluidas (mes)" })}
        </h2>
        <div className="dashboard-stat-grid dashboard-stat-grid--4">
          <StatCard
            label={t(props.language, { es: "Sesiones contabilizadas", en: "Sessions counted", pt: "Sessoes" })}
            value={String(k.completedSessionsMonthCount ?? 0)}
          />
          <StatCard
            label={t(props.language, { es: "Bruto (sesiones)", en: "Gross (sessions)", pt: "Bruto (sessoes)" })}
            value={formatMoneyCents(grossSess, props.language, props.currency)}
          />
          <StatCard
            label={t(props.language, { es: "Comisión (sesiones)", en: "Fee (sessions)", pt: "Comissao (sessoes)" })}
            value={formatMoneyCents(feeSess, props.language, props.currency)}
          />
          <StatCard
            label={t(props.language, { es: "Neto prof. (sesiones)", en: "Pro net (sessions)", pt: "Liquido pro (sessoes)" })}
            value={formatMoneyCents(k.professionalNetMonthCents ?? 0, props.language, props.currency)}
          />
        </div>
      </section>

      <footer className="dashboard-footnote">
        <span className="role-pill">Live</span>
        <span>
          {t(props.language, {
            es: "Finanzas: devengado ejecutado y cobrado.",
            en: "Finance: accrued vs collected.",
            pt: "Financas: devengado e cobrado."
          })}
        </span>
      </footer>
        </>
      )}
    </div>
  );
}

export function AdminDashboardPage(props: OverviewPageProps) {
  return (
    <OverviewPage
      token={props.token}
      language={props.language}
      currency={props.currency}
      pendingProfessionalRegistrationCount={props.pendingProfessionalRegistrationCount}
      onNotificationCenterClick={props.onNotificationCenterClick}
    />
  );
}
