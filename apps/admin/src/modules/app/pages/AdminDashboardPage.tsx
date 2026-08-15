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

  const pkgFee = k?.packagePlatformFeeFromPurchasesMonthCents ?? 0;
  const pkgProNet = k?.packageProfessionalNetFromPurchasesMonthCents ?? 0;
  const grossPkg = k?.packagePurchasesMonthCents ?? 0;
  const trialGross = k?.trialGrossMonthCents ?? 0;
  const trialFee = k?.trialPlatformFeeMonthCents ?? 0;
  const trialNet = k?.trialProfessionalNetMonthCents ?? 0;
  const grossPkgAndTrial = grossPkg + trialGross;
  const feePkgAndTrial = pkgFee + trialFee;
  const proNetPkgAndTrial = pkgProNet + trialNet;

  return (
    <div className="dashboard-page">
      <header className="dashboard-page-toolbar">
        <h1 className="dashboard-page-heading">
          {t(props.language, { es: "Dashboard", en: "Dashboard", pt: "Dashboard" })}
        </h1>
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

      <DashboardPendingProfessionalApprovals token={props.token} language={props.language} />

      {k === undefined ? null : (
        <>
      <section className="dashboard-section dashboard-section--highlight dashboard-section--tone-pkg" aria-labelledby="dash-pkg">
        <h2
          id="dash-pkg"
          className="dashboard-section-title"
          title={t(props.language, {
            es: "Cobros del mes en USD: paquetes comprados + sesiones de prueba.",
            en: "Month collections in USD: package purchases + trial sessions.",
            pt: "Cobranças do mês em USD: pacotes + sessões de teste."
          })}
        >
          {t(props.language, {
            es: "Ingresos del mes",
            en: "Month revenue",
            pt: "Receita do mes"
          })}
        </h2>
        <div className="dashboard-stat-grid dashboard-stat-grid--3">
          <StatCard
            label={t(props.language, { es: "Bruto cobrado", en: "Gross collected", pt: "Bruto cobrado" })}
            value={formatMoneyCents(grossPkgAndTrial, props.language)}
            to={`/finances?platformTab=purchases&month=${encodeURIComponent(selectedMonth)}`}
            detail={replaceTemplate(
              t(props.language, {
                es: "Paquetes {p} · pruebas {t}",
                en: "Packages {p} · trials {t}",
                pt: "Pacotes {p} · testes {t}"
              }),
              {
                p: formatMoneyCents(grossPkg, props.language),
                t: formatMoneyCents(trialGross, props.language)
              }
            )}
          />
          <StatCard
            variant="accent"
            label={t(props.language, { es: "Comisión MotivarCare", en: "MotivarCare fee", pt: "Comissão MotivarCare" })}
            value={formatMoneyCents(feePkgAndTrial, props.language)}
            to={`/finances?platformTab=purchases&month=${encodeURIComponent(selectedMonth)}`}
            detail={t(props.language, {
              es: "Tu parte sobre paquetes y pruebas cobrados este mes",
              en: "Your cut of packages and trials collected this month",
              pt: "Sua parte sobre pacotes e testes cobrados neste mês"
            })}
          />
          <StatCard
            label={t(props.language, { es: "Neto profesionales", en: "Pro net", pt: "Líquido profissionais" })}
            value={formatMoneyCents(proNetPkgAndTrial, props.language)}
            to={`/finances?platformTab=purchases&month=${encodeURIComponent(selectedMonth)}`}
            detail={t(props.language, {
              es: "Parte de profesionales sobre esos cobros (no es el pendiente a liquidar)",
              en: "Professionals’ share of those collections (not the unpaid queue)",
              pt: "Parte dos profissionais desses cobranças (não é o pendente)"
            })}
          />
        </div>
      </section>

      <section
        className="dashboard-section dashboard-section--raised dashboard-section--tone-op"
        aria-labelledby="dash-op"
      >
        <h2 id="dash-op" className="dashboard-section-title">
          {t(props.language, { es: "Pacientes y profesionales", en: "Patients and professionals", pt: "Pacientes e profissionais" })}
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
            to="/patients?status=active"
            detail={t(props.language, {
              es: "Ver pacientes activos",
              en: "View active patients",
              pt: "Ver pacientes ativos"
            })}
          />
          <StatCard
            label={t(props.language, { es: "Profesionales", en: "Professionals", pt: "Profissionais" })}
            value={String(k.activeProfessionals)}
            to="/professionals?visible=true"
            detail={t(props.language, {
              es: "Ver listado de profesionales",
              en: "View professionals list",
              pt: "Ver lista de profissionais"
            })}
          />
        </div>
      </section>

      <section
        className="dashboard-section dashboard-section--tone-sess"
        aria-labelledby="dash-unpaid"
      >
        <AdminUnpaidProfessionalsPanel
          token={props.token}
          language={props.language}
          initialRows={unpaidRows}
          onChanged={() => setRefreshToken((value) => value + 1)}
        />
      </section>
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
