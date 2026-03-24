import type { AppLanguage } from "@therapy/i18n-config";
import type { Dispatch, SetStateAction } from "react";
import { PATIENT_EMPTY_ART_URL } from "../../constants";
import type {
  AdminPatientRiskTriageItem,
  AdminPatientOps,
  AdminProfessionalOps,
  PatientStatus
} from "../../types";

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
                <div className="patient-result-main">
                  <strong>{patient.fullName}</strong>
                  <span>{patient.email} · {patient.status} · {patient.timezone}</span>
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
        <h3>{props.editingPatient.fullName}</h3>
        <button type="button" onClick={props.onOpenEdit}>Editar</button>
      </div>
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
    </section>
  );
}

export function RiskTriageQueueSection(props: {
  loading: boolean;
  items: AdminPatientRiskTriageItem[];
  actionPatientId: string | null;
  onOpenPatient: (patientId: string) => void;
  onApprove: (patientId: string) => void;
  onCancel: (patientId: string) => void;
}) {
  return (
    <section className="ops-section risk-triage-section">
      <header className="ops-section-head risk-triage-head">
        <h3>Triage de riesgo</h3>
        <span>{props.items.length} pendientes</span>
      </header>

      {props.loading ? <p>Cargando casos de riesgo...</p> : null}
      {!props.loading && props.items.length === 0 ? (
        <p className="risk-triage-empty">No hay pacientes pendientes de triage.</p>
      ) : null}

      {!props.loading ? (
        <div className="risk-triage-list">
          {props.items.map((item) => (
            <article key={item.patientId} className="risk-triage-row">
              <div className="risk-triage-main">
                <strong>{item.fullName}</strong>
                <span>
                  {item.email}
                  {item.intakeCompletedAt ? ` · ${new Date(item.intakeCompletedAt).toLocaleString("es-AR")}` : ""}
                </span>
              </div>
              <span className={`risk-level-pill ${item.intakeRiskLevel}`}>Riesgo {item.intakeRiskLevel}</span>
              <div className="risk-triage-actions">
                <button type="button" onClick={() => props.onOpenPatient(item.patientId)}>Ver paciente</button>
                <button
                  type="button"
                  className="primary"
                  disabled={props.actionPatientId === item.patientId}
                  onClick={() => props.onApprove(item.patientId)}
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={props.actionPatientId === item.patientId}
                  onClick={() => props.onCancel(item.patientId)}
                >
                  Cancelar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
