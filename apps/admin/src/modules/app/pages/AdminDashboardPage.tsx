import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { majorCurrencyCodeForMarket } from "@therapy/types";
import { adminSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
import { formatAdminFinanceUsd } from "../../finance/lib/formatAdminFinanceUsd";
import { AdminUnpaidProfessionalsPanel } from "../../finance/components/AdminUnpaidProfessionalsPanel";
import { PendingProfessionalCredentialsPanel } from "../components/professionals/PendingProfessionalCredentialsPanel";
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

function formatMoneyCents(cents: number, language: AppLanguage): string {
  return formatAdminFinanceUsd(cents, language);
}

function StatCard(props: {
  label: string;
  value: string;
  /** Detalle útil en hover / title; no ocupa espacio en la card. */
  detail?: string;
  variant?: "default" | "accent";
  /** Si hay `to`, la card es un enlace con hover. */
  to?: string;
}) {
  const className = `dashboard-stat-card${props.variant === "accent" ? " dashboard-stat-card--accent" : ""}${
    props.to ? " dashboard-stat-card--link" : ""
  }`;
  const title = props.detail || undefined;
  const body = (
    <>
      <span className="dashboard-stat-label">{props.label}</span>
      <strong className="dashboard-stat-value">{props.value}</strong>
    </>
  );
  if (props.to) {
    return (
      <Link className={className} to={props.to} title={title}>
        {body}
      </Link>
    );
  }
  return (
    <article className={className} title={title}>
      {body}
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
                  <PendingProfessionalCredentialsPanel language={props.language} professional={professional} />
                  <dl className="dashboard-pending-approvals__dl dashboard-pending-approvals__dl--secondary">
                    <div>
                      <dt>{t(props.language, { es: "Especialidad", en: "Specialization", pt: "Especialidade" })}</dt>
                      <dd>{professional.specialization?.trim() || "—"}</dd>
                    </div>
                    <div>
                      <dt>
                        {t(props.language, {
                          es: "Precio lista / sesión",
                          en: "List price / session",
                          pt: "Preco lista / sessao"
                        })}
                      </dt>
                      <dd>
                        {professional.sessionPriceUsd != null
                          ? `${majorCurrencyCodeForMarket(professional.market)} ${professional.sessionPriceUsd}`
                          : "—"}
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
  const [refreshToken, setRefreshToken] = useState(0);
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
  }, [props.token, selectedMonth, refreshToken]);

  const k = response?.kpis;
  const unpaidRows = response?.unpaidByProfessional ?? [];
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
          <div className="dashboard-header-actions dashboard-header-actions--end">
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
              es: "Pacientes y profesionales: estado actual. Ingresos: mes elegido (UTC).",
              en: "Patients and pros: current state. Revenue: selected month (UTC).",
              pt: "Pacientes e pros: estado atual. Receita: mes escolhido (UTC)."
            })}
          </p>
        ) : null}
        <div className="dashboard-stat-grid dashboard-stat-grid--2">
          <StatCard
            label={t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })}
            value={String(k.activePatients)}
            to="/patients"
            detail={t(props.language, {
              es: "Abrir listado de pacientes",
              en: "Open patients list",
              pt: "Abrir lista de pacientes"
            })}
          />
          <StatCard
            label={t(props.language, { es: "Profesionales visibles", en: "Visible professionals", pt: "Profissionais visiveis" })}
            value={String(k.activeProfessionals)}
            to="/professionals"
            detail={t(props.language, {
              es: "Abrir listado de psicólogos",
              en: "Open professionals list",
              pt: "Abrir lista de profissionais"
            })}
          />
        </div>
      </section>

      <section className="dashboard-section dashboard-section--highlight dashboard-section--tone-pkg" aria-labelledby="dash-pkg">
        <h2
          id="dash-pkg"
          className="dashboard-section-title"
          title={t(props.language, {
            es: "USD (valor original). Pruebas = tarifa del profesional + % trial de Finanzas.",
            en: "USD (original). Trials = pro rate + trial % from Finance.",
            pt: "USD (original). Testes = tarifa do profissional + % trial."
          })}
        >
          {t(props.language, {
            es: "Ingresos del mes",
            en: "Month revenue",
            pt: "Receita do mes"
          })}
        </h2>
        <div className="dashboard-stat-grid dashboard-stat-grid--4">
          <StatCard
            label={t(props.language, { es: "Compras + pruebas", en: "Purchases + trials", pt: "Compras + testes" })}
            value={String((k.packagePurchasesMonthCount ?? 0) + trialCount)}
            to={`/finances?platformTab=purchases&month=${encodeURIComponent(selectedMonth)}`}
            detail={replaceTemplate(
              t(props.language, {
                es: "{pkg} paquetes · {pr} pruebas · ver ventas",
                en: "{pkg} packages · {pr} trials · view sales",
                pt: "{pkg} pacotes · {pr} provas · ver vendas"
              }),
              { pkg: String(k.packagePurchasesMonthCount ?? 0), pr: String(trialCount) }
            )}
          />
          <StatCard
            label={t(props.language, { es: "Bruto pacientes", en: "Patient gross", pt: "Bruto pacientes" })}
            value={formatMoneyCents(grossPkgAndTrial, props.language)}
            to={`/finances?platformTab=purchases&month=${encodeURIComponent(selectedMonth)}`}
            detail={replaceTemplate(
              t(props.language, {
                es: "Paquetes {p} + pruebas {t} · ver ventas del mes",
                en: "Packages {p} + trials {t} · view month sales",
                pt: "Pacotes {p} + provas {t} · ver vendas"
              }),
              {
                p: formatMoneyCents(grossPkg, props.language),
                t: formatMoneyCents(trialGross, props.language)
              }
            )}
          />
          <StatCard
            variant="accent"
            label={t(props.language, { es: "Comisión plataforma", en: "Platform commission", pt: "Comissao plataforma" })}
            value={formatMoneyCents(feePkgAndTrial, props.language)}
            to={`/finances?platformTab=purchases&month=${encodeURIComponent(selectedMonth)}`}
            detail={t(props.language, {
              es: "Comisión sobre paquetes + pruebas · ver ventas",
              en: "Fee on packages + trials · view sales",
              pt: "Comissao sobre pacotes + provas · ver vendas"
            })}
          />
          <StatCard
            label={t(props.language, { es: "A pagar a profesionales", en: "Owed to professionals", pt: "A pagar pros" })}
            value={formatMoneyCents(proNetPkgAndTrial, props.language)}
            to={`/finances?platformTab=purchases&month=${encodeURIComponent(selectedMonth)}`}
            detail={t(props.language, {
              es: "Reparto de paquetes + neto de pruebas · ver ventas",
              en: "Package split + trial net · view sales",
              pt: "Pacotes + liquido provas · ver vendas"
            })}
          />
        </div>
      </section>

      <section
        className="dashboard-section dashboard-section--raised dashboard-section--tone-sess"
        aria-labelledby="dash-unpaid"
      >
        <AdminUnpaidProfessionalsPanel
          token={props.token}
          language={props.language}
          initialRows={unpaidRows}
          onChanged={() => setRefreshToken((value) => value + 1)}
        />
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
              display: formatMoneyCents(grossPkg, props.language),
              color: "var(--brand)"
            },
            {
              key: "trial",
              label: t(props.language, { es: "Sesiones de prueba", en: "Trial sessions", pt: "Sessoes de teste" }),
              value: trialGross,
              display: formatMoneyCents(trialGross, props.language),
              color: "#7c6ae8"
            },
            {
              key: "sess",
              label: t(props.language, { es: "Sesiones completadas", en: "Completed sessions", pt: "Sessoes concluidas" }),
              value: grossSess,
              display: formatMoneyCents(grossSess, props.language),
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
              display: formatMoneyCents(pkgFee, props.language),
              color: "var(--brand)"
            },
            {
              key: "tf",
              label: t(props.language, { es: "Por sesión de prueba", en: "From trial session", pt: "Por sessao de teste" }),
              value: trialFee,
              display: formatMoneyCents(trialFee, props.language),
              color: "#7c6ae8"
            },
            {
              key: "sf",
              label: t(props.language, { es: "Por sesión completada", en: "From completed session", pt: "Por sessao feita" }),
              value: feeSess,
              display: formatMoneyCents(feeSess, props.language),
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
          {t(props.language, { es: "Por sesiones completadas (mes · USD)", en: "From completed sessions (month · USD)", pt: "Por sessoes concluidas (mes · USD)" })}
        </h2>
        <div className="dashboard-stat-grid dashboard-stat-grid--4">
          <StatCard
            label={t(props.language, { es: "Sesiones contabilizadas", en: "Sessions counted", pt: "Sessoes" })}
            value={String(k.completedSessionsMonthCount ?? 0)}
          />
          <StatCard
            label={t(props.language, { es: "Bruto (sesiones)", en: "Gross (sessions)", pt: "Bruto (sessoes)" })}
            value={formatMoneyCents(grossSess, props.language)}
          />
          <StatCard
            label={t(props.language, { es: "Comisión (sesiones)", en: "Fee (sessions)", pt: "Comissao (sessoes)" })}
            value={formatMoneyCents(feeSess, props.language)}
          />
          <StatCard
            label={t(props.language, { es: "Neto prof. (sesiones)", en: "Pro net (sessions)", pt: "Liquido pro (sessoes)" })}
            value={formatMoneyCents(k.professionalNetMonthCents ?? 0, props.language)}
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
