import type { AppLanguage } from "@therapy/i18n-config";
import type { Dispatch, SetStateAction } from "react";
import { PATIENT_EMPTY_ART_URL } from "../../constants";
import { resolveApiAssetUrl } from "../../services/api";
import type {
  AdminPatientRiskTriageItem,
  AdminPatientOps,
  AdminProfessionalOps,
  PatientStatus
} from "../../types";

export function PatientOpsAvatar(props: { url?: string | null; label: string; size?: "md" | "lg" }) {
  const size = props.size ?? "md";
  const cls = size === "lg" ? "patient-ops-avatar patient-ops-avatar--lg" : "patient-ops-avatar";
  const src = resolveApiAssetUrl(props.url ?? null);
  if (src) {
    return <img src={src} alt="" className={cls} />;
  }
  return (
    <div
      className={cls + " patient-ops-avatar--empty"}
      aria-hidden
      title={props.label}
    />
  );
}

export function PatientsSearchHeader(props: {
  language: AppLanguage;
  patientSearchInput: string;
  setPatientSearchInput: Dispatch<SetStateAction<string>>;
  onSearch: () => void;
  onOpenCreate: () => void;
}) {
  return (
    <>
      <div className="patient-section-head">
        <h2>Buscador de Pacientes</h2>
        <button className="new-patient-btn" type="button" onClick={props.onOpenCreate}>Nuevo paciente</button>
      </div>

      <div className="patient-search-shell">
        <div className="patient-search-inline">
          <input
            className="patient-search-input"
            placeholder="Buscar paciente por nombre o email"
            value={props.patientSearchInput}
            onChange={(event) => props.setPatientSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                props.onSearch();
              }
            }}
          />
          <button type="button" className="primary" onClick={props.onSearch}>Buscar</button>
        </div>
      </div>
    </>
  );
}

export function PatientsSearchResults(props: {
  language: AppLanguage;
  loading: boolean;
  patientSearch: string;
  patients: AdminPatientOps[];
  editingPatientId: string | null;
  patientPagination: { page: number; totalPages: number; hasPrev: boolean; hasNext: boolean } | null;
  onSelectPatient: (patientId: string) => void;
  onEditPatient: (patientId: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  if (!props.loading && props.patients.length === 0) {
    return (
      <div className="patient-empty-art">
        <img src={PATIENT_EMPTY_ART_URL} alt="La Ultima Cena - Leonardo da Vinci" loading="lazy" />
      </div>
    );
  }

  return (
    <>
      {props.patientSearch.length > 0 ? (
        <section className="ops-section results-section">
          <header className="ops-section-head">
            <h3>Resultados de busqueda</h3>
          </header>
          <div className="patient-results-list">
            {props.patients.map((patient) => (
              <article
                key={patient.id}
                className={"patient-result-row" + (props.editingPatientId === patient.id ? " active" : "")}
                onClick={() => props.onSelectPatient(patient.id)}
              >
                <div className="patient-result-row-body">
                  <PatientOpsAvatar url={patient.avatarUrl} label={patient.fullName} />
                  <div className="patient-result-main">
                    <strong>{patient.fullName}</strong>
                  </div>
                </div>
                <div className="patient-result-actions">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onEditPatient(patient.id);
                    }}
                  >
                    Editar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {props.patientSearch === "*" && props.patientPagination ? (
        <div className="patient-pagination">
          <button
            type="button"
            aria-label="Pagina anterior"
            onClick={props.onPrevPage}
            disabled={!props.patientPagination.hasPrev}
          >
            &lt;
          </button>
          <span>Pagina {props.patientPagination.page} de {props.patientPagination.totalPages}</span>
          <button
            type="button"
            aria-label="Pagina siguiente"
            onClick={props.onNextPage}
            disabled={!props.patientPagination.hasNext}
          >
            &gt;
          </button>
        </div>
      ) : null}
    </>
  );
}

export function SelectedPatientSummaryCard(props: {
  editingPatient: AdminPatientOps | null;
  editingPatientDraft?: {
    fullName: string;
    email: string;
    password: string;
    timezone: string;
    status: PatientStatus;
    remainingCredits: string;
    activeProfessionalId: string;
  };
  professionals: AdminProfessionalOps[];
  confirmedSessionsCount: number;
  onOpenEdit: () => void;
}) {
  if (!props.editingPatient || !props.editingPatientDraft) {
    return null;
  }

  return (
    <section className="patient-inline-panel record-panel">
      <div className="record-badge">Paciente seleccionado</div>
      <div className="patient-inline-head">
        <div className="patient-inline-head-main">
          <PatientOpsAvatar url={props.editingPatient.avatarUrl} label={props.editingPatient.fullName} size="lg" />
          <h3>{props.editingPatient.fullName}</h3>
        </div>
        <button type="button" onClick={props.onOpenEdit}>Editar</button>
      </div>
      <details className="patient-inline-details">
        <summary>Ver detalle</summary>
        <div className="grid-form">
          <label>
            Nombre completo
            <input value={props.editingPatientDraft.fullName} readOnly />
          </label>
          <label>
            Email
            <input value={props.editingPatientDraft.email} readOnly />
          </label>
          <label>
            Contrasena
            <input value={props.editingPatientDraft.password || "(sin cambio)"} readOnly />
          </label>
          <label>
            Zona horaria
            <input value={props.editingPatientDraft.timezone || "Pendiente"} readOnly />
          </label>
          <label>
            Estado
            <input value={props.editingPatientDraft.status} readOnly />
          </label>
          <label>
            Profesional asignado
            <input
              value={
                props.editingPatientDraft.activeProfessionalId
                  ? props.professionals.find((professional) => professional.id === props.editingPatientDraft?.activeProfessionalId)?.fullName ?? props.editingPatientDraft.activeProfessionalId
                  : "Pendiente de asignacion"
              }
              readOnly
            />
          </label>
          <label>
            Sesiones confirmadas (solo lectura)
            <input value={String(props.confirmedSessionsCount)} readOnly />
          </label>
          <label>
            Saldo disponible (solo lectura)
            <input value={props.editingPatientDraft.remainingCredits} readOnly />
          </label>
        </div>
      </details>
    </section>
  );
}

export function RiskTriageQueueSection(props: {
  loading: boolean;
  items: AdminPatientRiskTriageItem[];
  pendingCount: number;
  actionPatientId: string | null;
  onOpenPatient: (patientId: string) => void;
  onApprovePatient: (patientId: string) => void;
  onRejectPatient: (patientId: string) => void;
}) {
  const blockedCount = props.items.length;

  return (
    <details className="card stack web-admin-accordion risk-triage-accordion" open={blockedCount > 0}>
      <summary className="web-admin-accordion-summary risk-triage-accordion-summary">
        <div>
          <h2>Analisis de pacientes de Riesgo</h2>
          <p>Lista de pacientes bloqueados por triage para aprobar, rechazar y revisar sus caracteristicas.</p>
        </div>
        <span className="risk-triage-summary-count">{blockedCount} bloqueados · {props.pendingCount} pendientes</span>
      </summary>

      <div className="web-admin-accordion-content stack">
        {props.loading ? <p>Cargando casos de riesgo...</p> : null}
        {!props.loading && blockedCount === 0 ? (
          <p className="risk-triage-empty">No hay pacientes bloqueados por triage.</p>
        ) : null}

        {!props.loading ? (
          <div className="risk-triage-list">
            {props.items.map((item) => {
              const actionLoading = props.actionPatientId === item.patientId;
              return (
                <article key={item.patientId} className="risk-triage-row">
                  <div className="risk-triage-main">
                    <div className="risk-triage-name-block">
                      <PatientOpsAvatar url={item.avatarUrl} label={item.fullName} />
                      <div className="risk-triage-name-stack">
                    <div className="risk-triage-name-row">
                      <strong>{item.fullName}</strong>
                      <span className={`risk-level-pill ${item.intakeRiskLevel}`}>Riesgo {item.intakeRiskLevel}</span>
                    </div>
                    <span>
                      {item.email}
                      {item.intakeCompletedAt ? ` · ${new Date(item.intakeCompletedAt).toLocaleString("es-AR")}` : ""}
                    </span>
                      </div>
                    </div>
                  </div>
                  <div className="risk-triage-row-side">
                    <div className="risk-triage-actions">
                      <button
                        type="button"
                        className="risk-triage-detail-button"
                        onClick={() => props.onOpenPatient(item.patientId)}
                        disabled={actionLoading}
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        className="risk-triage-icon-action approve"
                        aria-label="Aprobar paciente"
                        title="Aprobar paciente"
                        onClick={() => props.onApprovePatient(item.patientId)}
                        disabled={actionLoading}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="risk-triage-icon-action reject"
                        aria-label="Rechazar paciente"
                        title="Rechazar paciente"
                        onClick={() => props.onRejectPatient(item.patientId)}
                        disabled={actionLoading}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </details>
  );
}
