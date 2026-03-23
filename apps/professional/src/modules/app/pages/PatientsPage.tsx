import { useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../services/api";
import type { PatientsResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function patientStatusLabel(status: PatientsResponse["patients"][number]["status"], language: AppLanguage): string {
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

export function PatientsPage(props: { token: string; language: AppLanguage }) {
  const [data, setData] = useState<PatientsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<PatientsResponse>("/api/professional/patients", props.token)
      .then((response) => {
        setData(response);
        setError("");
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "No se pudieron cargar pacientes.",
                en: "Could not load patients.",
                pt: "Nao foi possivel carregar pacientes."
              })
        );
      });
  }, [props.token]);

  return (
    <section className="pro-card pro-patients-card">
      <h2>{t(props.language, { es: "Clientes / Pacientes", en: "Clients / Patients", pt: "Clientes / Pacientes" })}</h2>
      {error ? <p className="pro-error">{error}</p> : null}
      {!data ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
      {data && data.patients.length === 0 ? <p>{t(props.language, { es: "Todavia no hay pacientes asignados.", en: "There are no assigned patients yet.", pt: "Ainda nao ha pacientes atribuidos." })}</p> : null}
      {data && data.patients.length > 0 ? (
        <ul className="pro-list">
          {data.patients.map((patient) => (
            <li key={patient.patientId}>
              <div>
                <strong>{patient.patientName}</strong>
                <span>{patient.patientEmail}</span>
                <span>
                  {replaceTemplate(
                    t(props.language, {
                      es: "Estado: {status} · Sesiones: {sessions} · Ultima hace {days} dias",
                      en: "Status: {status} · Sessions: {sessions} · Last seen {days} days ago",
                      pt: "Status: {status} · Sessoes: {sessions} · Ultima ha {days} dias"
                    }),
                    {
                      status: patientStatusLabel(patient.status, props.language),
                      sessions: String(patient.totalSessions),
                      days: String(patient.daysSinceLastSession)
                    }
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
