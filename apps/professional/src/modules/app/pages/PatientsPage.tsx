import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { useNavigate } from "react-router-dom";
import { PatientAvatarImage } from "../components/PatientAvatarImage";
import { ProPageLoader } from "../components/ProPageLoader";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest, resolveApiAssetUrl } from "../services/api";
import type { PatientsResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type PatientStatus = PatientsResponse["patients"][number]["status"];
type StatusFilter = PatientStatus | "all";

function patientStatusLabel(status: PatientStatus, language: AppLanguage): string {
  if (status === "active") {
    return t(language, { es: "Activo", en: "Active", pt: "Ativo" });
  }
  if (status === "pause") {
    return t(language, { es: "En pausa", en: "Paused", pt: "Em pausa" });
  }
  if (status === "cancelled") {
    return t(language, { es: "Cancelado", en: "Cancelled", pt: "Cancelado" });
  }
  return t(language, { es: "Prueba", en: "Trial", pt: "Teste" });
}

function filterLabel(language: AppLanguage, filter: StatusFilter): string {
  if (filter === "all") {
    return t(language, { es: "Todos", en: "All", pt: "Todos" });
  }
  return patientStatusLabel(filter, language);
}

function formatLastSessionLabel(days: number, language: AppLanguage): string {
  if (days < 0) {
    return t(language, {
      es: "Con sesión próxima",
      en: "Upcoming session",
      pt: "Com sessao proxima"
    });
  }
  if (days === 0) {
    return t(language, {
      es: "Última sesión hoy",
      en: "Last session today",
      pt: "Ultima sessao hoje"
    });
  }
  if (days === 1) {
    return t(language, {
      es: "Última ayer",
      en: "Last session yesterday",
      pt: "Ultima ontem"
    });
  }
  return replaceTemplate(
    t(language, {
      es: "Última hace {days} días",
      en: "Last seen {days} days ago",
      pt: "Ultima ha {days} dias"
    }),
    { days: String(days) }
  );
}

export function PatientsPage(props: { token: string; language: AppLanguage }) {
  const navigate = useNavigate();
  const [data, setData] = useState<PatientsResponse | null>(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    apiRequest<PatientsResponse>("/api/professional/patients", props.token)
      .then((response) => {
        setData(response);
        setError("");
      })
      .catch((requestError) => {
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(professionalSurfaceMessage("patients-load", props.language, raw));
      });
  }, [props.token, props.language]);

  const filteredPatients = useMemo(() => {
    if (!data) {
      return [];
    }
    if (statusFilter === "all") {
      return data.patients;
    }
    return data.patients.filter((patient) => patient.status === statusFilter);
  }, [data, statusFilter]);

  const filterOptions: StatusFilter[] = ["all", "active", "trial", "pause", "cancelled"];
  const statusCountMap = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      all: data?.patients.length ?? 0,
      active: 0,
      trial: 0,
      pause: 0,
      cancelled: 0
    };
    for (const patient of data?.patients ?? []) {
      base[patient.status] += 1;
    }
    return base;
  }, [data]);

  if (!data && !error) {
    return <ProPageLoader language={props.language} layout="block" />;
  }

  return (
    <div className="pro-grid-stack pro-patients-page" data-tour="pro-tour-patients-body">
      <p className="pro-patients-lead">
        {t(props.language, {
          es: "Seguimiento diario y acceso rápido al detalle de cada paciente.",
          en: "Daily follow-up and quick access to each patient's detail.",
          pt: "Acompanhamento diario e acesso rapido ao detalhe de cada paciente."
        })}
      </p>

      {error ? <p className="pro-error">{error}</p> : null}

      {data && data.patients.length === 0 ? (
        <div className="pro-patients-empty-state">
          <strong>
            {t(props.language, {
              es: "Todavía no hay pacientes asignados",
              en: "No assigned patients yet",
              pt: "Ainda nao ha pacientes atribuidos"
            })}
          </strong>
          <p>
            {t(props.language, {
              es: "Cuando alguien reserve contigo, aparecerá acá con su historial y accesos directos.",
              en: "When someone books with you, they'll show up here with history and quick actions.",
              pt: "Quando alguem reservar com voce, aparecera aqui com historico e acoes rapidas."
            })}
          </p>
        </div>
      ) : null}

      {data && data.patients.length > 0 ? (
        <>
          <div className="pro-patients-toolbar" data-tour="pro-tour-patients-toolbar">
            <div className="pro-patients-filters" role="tablist" aria-label={t(props.language, { es: "Filtrar por estado", en: "Filter by status", pt: "Filtrar por estado" })}>
              {filterOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === option}
                  className={`pro-patients-filter${statusFilter === option ? " pro-patients-filter--active" : ""}`}
                  onClick={() => setStatusFilter(option)}
                >
                  <span>{filterLabel(props.language, option)}</span>
                  <span className="pro-patients-filter-count">{statusCountMap[option]}</span>
                </button>
              ))}
            </div>
            <p className="pro-patients-toolbar-meta">
              {replaceTemplate(
                t(props.language, {
                  es: "{shown} de {total} pacientes",
                  en: "{shown} of {total} patients",
                  pt: "{shown} de {total} pacientes"
                }),
                { shown: String(filteredPatients.length), total: String(data.patients.length) }
              )}
            </p>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="pro-patients-empty-state pro-patients-empty-state--inline">
              <p>
                {t(props.language, {
                  es: "No hay pacientes con ese estado. Probá otro filtro.",
                  en: "No patients match this filter. Try another.",
                  pt: "Nenhum paciente com esse estado. Tente outro filtro."
                })}
              </p>
            </div>
          ) : (
            <ul className="pro-patients-list">
              {filteredPatients.map((patient) => {
                const avatarSrc = resolveApiAssetUrl(patient.avatarUrl ?? null);
                return (
                  <li key={patient.patientId}>
                    <article className="pro-patient-card">
                      <button
                        type="button"
                        className="pro-patient-card-main"
                        onClick={() => {
                          navigate(`/pacientes/${encodeURIComponent(patient.patientId)}`);
                        }}
                      >
                        <PatientAvatarImage
                          src={avatarSrc}
                          imgClassName="pro-patient-avatar pro-patient-avatar--card"
                          emptyClassName="pro-patient-avatar pro-patient-avatar--card pro-patient-avatar--empty"
                        />
                        <div className="pro-patient-card-copy">
                          <div className="pro-patient-card-title-row">
                            <strong className="pro-patient-card-name">{patient.patientName}</strong>
                            <span className={`pro-patient-status pro-patient-status--${patient.status}`}>
                              {patientStatusLabel(patient.status, props.language)}
                            </span>
                          </div>
                          <span className="pro-patient-card-email">{patient.patientEmail}</span>
                          <div className="pro-patient-card-metrics">
                            <span className="pro-patient-card-metric">
                              <span className="pro-patient-card-metric-value">{patient.totalSessions}</span>
                              <span className="pro-patient-card-metric-label">
                                {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
                              </span>
                            </span>
                            <span className="pro-patient-card-metric-divider" aria-hidden="true" />
                            <span className="pro-patient-card-metric pro-patient-card-metric--soft">
                              {formatLastSessionLabel(patient.daysSinceLastSession, props.language)}
                            </span>
                          </div>
                        </div>
                      </button>
                      <div className="pro-patient-card-actions">
                        <button
                          type="button"
                          className="pro-patient-action-btn"
                          onClick={() => {
                            navigate(`/chat?patientId=${encodeURIComponent(patient.patientId)}`);
                          }}
                        >
                          {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
                        </button>
                        <button
                          type="button"
                          className="pro-patient-action-btn pro-patient-action-btn--primary"
                          onClick={() => {
                            navigate(`/pacientes/${encodeURIComponent(patient.patientId)}`);
                          }}
                        >
                          {t(props.language, { es: "Ver perfil", en: "View profile", pt: "Ver perfil" })}
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
