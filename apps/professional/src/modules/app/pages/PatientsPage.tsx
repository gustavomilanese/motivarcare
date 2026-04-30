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

  return (
    <section className="pro-card pro-patients-card">
      <h2>{t(props.language, { es: "Clientes / Pacientes", en: "Clients / Patients", pt: "Clientes / Pacientes" })}</h2>
      {error ? <p className="pro-error">{error}</p> : null}
      {!data ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
      {data && data.patients.length === 0 ? (
        <p>{t(props.language, { es: "Todavía no hay pacientes asignados.", en: "There are no assigned patients yet.", pt: "Ainda nao ha pacientes atribuidos." })}</p>
      ) : null}
      {data && data.patients.length > 0 ? (
        <>
          <div className="pro-patient-filter-bar" role="group" aria-label={t(props.language, { es: "Filtrar por estado", en: "Filter by status", pt: "Filtrar por estado" })}>
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`pro-patient-filter-chip ${statusFilter === option ? "pro-patient-filter-chip--active" : ""}`}
                onClick={() => setStatusFilter(option)}
              >
                {filterLabel(props.language, option)}
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
                  <li key={patient.patientId}>
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
                        <div>
                          <strong>{patient.patientName}</strong>
                          <span>{patient.patientEmail}</span>
                          <span>
                            {replaceTemplate(
                              t(props.language, {
                                es: "Estado: {status} · Sesiones: {sessions} · Última hace {days} días",
                                en: "Status: {status} · Sessions: {sessions} · Last seen {days} days ago",
                                pt: "Status: {status} · Sessoes: {sessions} · Última há {days} dias"
                              }),
                              {
                                status: patientStatusLabel(patient.status, props.language),
                                sessions: String(patient.totalSessions),
                                days: String(patient.daysSinceLastSession)
                              }
                            )}
                          </span>
                        </div>
                      </div>
                      <span className={`pro-status-pill pro-status-pill--${patient.status}`} aria-hidden="true">
                        {patientStatusLabel(patient.status, props.language)}
                      </span>
                    </button>
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
