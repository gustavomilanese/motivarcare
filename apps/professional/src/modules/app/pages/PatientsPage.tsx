import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { useNavigate } from "react-router-dom";
import { PatientAvatarImage } from "../components/PatientAvatarImage";
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
    return t(language, { es: "activo", en: "active", pt: "ativo" });
  }
  if (status === "pause") {
    return t(language, { es: "en pausa", en: "paused", pt: "em pausa" });
  }
  if (status === "cancelled") {
    return t(language, { es: "cancelado", en: "cancelled", pt: "cancelado" });
  }
  return t(language, { es: "prueba", en: "trial", pt: "teste" });
}

function filterLabel(language: AppLanguage, filter: StatusFilter): string {
  if (filter === "all") {
    return t(language, { es: "Todos", en: "All", pt: "Todos" });
  }
  return patientStatusLabel(filter, language);
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
  }, [props.token]);

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

  return (
    <section className="pro-card pro-patients-card">
      <header className="pro-patients-header">
        <h2>{t(props.language, { es: "Pacientes", en: "Patients", pt: "Pacientes" })}</h2>
        <p className="pro-muted">
          {t(props.language, {
            es: "Vista agrupada para seguimiento diario y acceso rápido al detalle.",
            en: "Grouped view for daily follow-up and quick detail access.",
            pt: "Visao agrupada para acompanhamento diario e acesso rapido."
          })}
        </p>
      </header>
      {error ? <p className="pro-error">{error}</p> : null}
      {!data ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
      {data && data.patients.length === 0 ? (
        <p>{t(props.language, { es: "Todavía no hay pacientes asignados.", en: "There are no assigned patients yet.", pt: "Ainda nao ha pacientes atribuidos." })}</p>
      ) : null}
      {data && data.patients.length > 0 ? (
        <>
          <div className="pro-patient-status-summary pro-patient-status-summary--panel">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`pro-patient-filter-chip ${statusFilter === option ? "pro-patient-filter-chip--active" : ""}`}
                onClick={() => setStatusFilter(option)}
              >
                <span>{filterLabel(props.language, option)}</span>
                <strong>{statusCountMap[option]}</strong>
              </button>
            ))}
          </div>
          {filteredPatients.length === 0 ? (
            <p className="pro-muted">
              {t(props.language, {
                es: "No hay pacientes con ese estado. Probá otro filtro.",
                en: "No patients match this filter. Try another.",
                pt: "Nenhum paciente com esse estado. Tente outro filtro."
              })}
            </p>
          ) : (
            <ul className="pro-list pro-list--patients">
              {filteredPatients.map((patient) => {
                const avatarSrc = resolveApiAssetUrl(patient.avatarUrl ?? null);
                return (
                  <li key={patient.patientId} className="pro-patient-card-row">
                    <button
                      type="button"
                      className="pro-patient-row-hit"
                      onClick={() => {
                        navigate(`/pacientes/${encodeURIComponent(patient.patientId)}`);
                      }}
                    >
                      <div className="pro-patient-row-main">
                        <PatientAvatarImage
                          src={avatarSrc}
                          imgClassName="pro-patient-avatar"
                          emptyClassName="pro-patient-avatar pro-patient-avatar--empty"
                        />
                        <div className="pro-patient-row-texts">
                          <strong>{patient.patientName}</strong>
                          <span>{patient.patientEmail}</span>
                          <div className="pro-patient-row-stats">
                            <span>
                              {replaceTemplate(
                                t(props.language, {
                                  es: "{sessions} sesiones",
                                  en: "{sessions} sessions",
                                  pt: "{sessions} sessoes"
                                }),
                                { sessions: String(patient.totalSessions) }
                              )}
                            </span>
                            <span>
                              {replaceTemplate(
                                t(props.language, {
                                  es: "Última hace {days} días",
                                  en: "Last seen {days} days ago",
                                  pt: "Ultima ha {days} dias"
                                }),
                                { days: String(patient.daysSinceLastSession) }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`pro-status-pill pro-status-pill--${patient.status}`} aria-hidden="true">
                        {patientStatusLabel(patient.status, props.language)}
                      </span>
                    </button>
                    <div className="pro-patient-row-actions">
                      <button
                        type="button"
                        className="pro-patient-chat-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/chat?patientId=${encodeURIComponent(patient.patientId)}`);
                        }}
                      >
                        {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
                      </button>
                      <button
                        type="button"
                        className="pro-patient-chat-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/pacientes/${encodeURIComponent(patient.patientId)}`);
                        }}
                      >
                        {t(props.language, { es: "Perfil", en: "Profile", pt: "Perfil" })}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
