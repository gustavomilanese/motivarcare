import { type AppLanguage, type LocalizedText, type SupportedCurrency, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { useEffect, useState } from "react";
import { SESSION_REASON_OPTIONS, TIMEZONE_OPTIONS } from "../constants";
import {
  type BookingDraft,
  CreatePatientModal,
  type CreatePatientFormState,
  PatientEditModal,
  type PatientDetailDraft
} from "../components/patients/PatientsOpsModals";
import {
  PatientsSearchHeader,
  PatientsSearchResults,
  RiskTriageQueueSection
} from "../components/patients/PatientsOpsSections";
import { apiRequest } from "../services/api";
import type {
  AdminBookingOps,
  AdminPatientOps,
  AdminPatientRiskTriageItem,
  AdminProfessionalOps,
  AdminSessionPackage,
  AdminUser,
  PatientManagementResponse,
  PatientRiskTriageResponse,
  PatientStatus,
  PatientsResponse,
  ProfessionalsResponse,
  SessionPackagesResponse
} from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDate(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function isoToInputDateTime(value: string): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function patientStatusLabel(status: PatientStatus | string, language: AppLanguage): string {
  if (status === "active") {
    return t(language, { es: "activo", en: "active", pt: "ativo" });
  }
  if (status === "pause") {
    return t(language, { es: "en pausa", en: "paused", pt: "em pausa" });
  }
  if (status === "cancelled") {
    return t(language, { es: "cancelado", en: "cancelled", pt: "cancelado" });
  }
  if (status === "trial") {
    return t(language, { es: "prueba", en: "trial", pt: "teste" });
  }
  return status;
}

export function PatientsOpsPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const [packages, setPackages] = useState<AdminSessionPackage[]>([]);
  const [patients, setPatients] = useState<AdminPatientOps[]>([]);
  const [professionals, setProfessionals] = useState<AdminProfessionalOps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createPackage, setCreatePackage] = useState({
    name: "",
    credits: "4",
    priceCents: "36000",
    currency: "usd"
  });
  const [creditAdjustments, setCreditAdjustments] = useState<Record<string, string>>({});
  const [activeProfessionalDrafts, setActiveProfessionalDrafts] = useState<Record<string, string>>({});
  const [remainingSessionsDrafts, setRemainingSessionsDrafts] = useState<Record<string, string>>({});
  const [patientBookings, setPatientBookings] = useState<Record<string, AdminBookingOps[]>>({});
  const [bookingDrafts, setBookingDrafts] = useState<Record<string, BookingDraft>>({});
  const [patientBookingsLoading, setPatientBookingsLoading] = useState<Record<string, boolean>>({});
  const [patientDetailDrafts, setPatientDetailDrafts] = useState<Record<string, PatientDetailDraft>>({});
  const [patientSaveLoading, setPatientSaveLoading] = useState(false);
  const [sessionOpsLoading, setSessionOpsLoading] = useState(false);
  const [sessionReasonDrafts, setSessionReasonDrafts] = useState<Record<string, string>>({});
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [isPatientEditModalOpen, setIsPatientEditModalOpen] = useState(false);
  const [isCreatePatientModalOpen, setIsCreatePatientModalOpen] = useState(false);
  const [createPatientForm, setCreatePatientForm] = useState<CreatePatientFormState>({
    fullName: "",
    email: "",
    password: "",
    timezone: "",
    patientStatus: "active"
  });
  const [createPatientLoading, setCreatePatientLoading] = useState(false);
  const [createPatientError, setCreatePatientError] = useState("");
  const [patientSearchInput, setPatientSearchInput] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const [patientPagination, setPatientPagination] = useState<{ page: number; pageSize: number; total: number; totalPages: number; hasPrev: boolean; hasNext: boolean } | null>(null);
  const [riskTriageItems, setRiskTriageItems] = useState<AdminPatientRiskTriageItem[]>([]);
  const [riskTriagePendingCount, setRiskTriagePendingCount] = useState(0);
  const [riskTriageLoading, setRiskTriageLoading] = useState(false);
  const [riskTriageActionPatientId, setRiskTriageActionPatientId] = useState<string | null>(null);

  const syncPatientDrafts = (nextPatients: AdminPatientOps[]) => {
    setActiveProfessionalDrafts((current) => {
      const next = { ...current };
      for (const patient of nextPatients) {
        const isEditingThisPatient = isPatientEditModalOpen && editingPatientId === patient.id;
        if (!isEditingThisPatient || next[patient.id] === undefined) {
          next[patient.id] = patient.activeProfessionalId ?? "";
        }
      }
      return next;
    });

    setRemainingSessionsDrafts((current) => {
      const next = { ...current };
      for (const patient of nextPatients) {
        const isEditingThisPatient = isPatientEditModalOpen && editingPatientId === patient.id;
        if (!isEditingThisPatient || next[patient.id] === undefined) {
          next[patient.id] = String(patient.latestPurchase?.remainingCredits ?? 0);
        }
      }
      return next;
    });
  };

  const load = async (searchValue?: string, pageValue?: number) => {
    setLoading(true);
    setRiskTriageLoading(true);
    setError("");
    try {
      const normalizedSearch = (searchValue ?? patientSearch).trim();
      const requestedPage = pageValue ?? patientPage;

      const patientsRequest = (() => {
        if (normalizedSearch.length === 0) {
          return Promise.resolve<PatientsResponse>({ patients: [] as AdminPatientOps[] });
        }
        if (normalizedSearch === "*") {
          return apiRequest<PatientsResponse>(
            "/api/admin/patients?search=*" + "&page=" + requestedPage + "&pageSize=10",
            {},
            props.token
          );
        }
        return apiRequest<PatientsResponse>("/api/admin/patients?search=" + encodeURIComponent(normalizedSearch), {}, props.token);
      })();

      const [packagesResponse, professionalsResponse, patientsResponse, riskTriageResponse] = await Promise.all([
        apiRequest<SessionPackagesResponse>("/api/admin/session-packages", {}, props.token),
        apiRequest<ProfessionalsResponse>("/api/admin/professionals", {}, props.token),
        patientsRequest,
        apiRequest<PatientRiskTriageResponse>("/api/admin/patients/risk-triage", {}, props.token)
      ]);

      setPackages(packagesResponse.sessionPackages);
      setProfessionals(professionalsResponse.professionals);
      setPatients(patientsResponse.patients);
      setPatientPagination(patientsResponse.pagination ?? null);
      setPatientPage(patientsResponse.pagination?.page ?? requestedPage);
      syncPatientDrafts(patientsResponse.patients);
      setRiskTriageItems(riskTriageResponse.items);
      setRiskTriagePendingCount(Number(riskTriageResponse.pending) || 0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load patient operations");
    } finally {
      setLoading(false);
      setRiskTriageLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [props.token]);

  useEffect(() => {
    if (!editingPatientId && !isCreatePatientModalOpen && !isPatientEditModalOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPatientEditModalOpen(false);
        setIsCreatePatientModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingPatientId, isCreatePatientModalOpen, isPatientEditModalOpen]);

  const applyPatientSearch = async () => {
    const nextSearch = patientSearchInput.trim();
    setPatientSearch(nextSearch);
    setPatientPage(1);
    await load(nextSearch, 1);
  };

  const goToPatientPage = async (nextPage: number) => {
    if (nextPage < 1) {
      return;
    }
    setPatientPage(nextPage);
    await load(patientSearch, nextPage);
  };

  const openCreatePatientModal = () => {
    setCreatePatientError("");
    setCreatePatientForm({
      fullName: "",
      email: "",
      password: "",
      timezone: "",
      patientStatus: "active"
    });
    setIsCreatePatientModalOpen(true);
  };

  const createPatientFromModal = async () => {
    setCreatePatientError("");

    if (createPatientForm.fullName.trim().length < 2) {
      setCreatePatientError("Nombre invalido");
      return;
    }

    if (createPatientForm.password.trim().length < 8) {
      setCreatePatientError("La contrasena debe tener al menos 8 caracteres");
      return;
    }

    if (createPatientForm.timezone.trim().length === 0) {
      setCreatePatientError("Selecciona una zona horaria de USA");
      return;
    }

    setCreatePatientLoading(true);

    try {
      await apiRequest<{ user: AdminUser }>(
        "/api/admin/users",
        {
          method: "POST",
          body: JSON.stringify({
            email: createPatientForm.email.trim().toLowerCase(),
            fullName: createPatientForm.fullName.trim(),
            password: createPatientForm.password,
            role: "PATIENT",
            timezone: createPatientForm.timezone.trim(),
            patientStatus: createPatientForm.patientStatus
          })
        },
        props.token
      );

      setIsCreatePatientModalOpen(false);
      setSuccess("Paciente creado correctamente");
      setPatientSearchInput("*");
      setPatientSearch("*");
      setPatientPage(1);
      await load("*", 1);
    } catch (requestError) {
      setCreatePatientError(requestError instanceof Error ? requestError.message : "No se pudo crear el paciente");
    } finally {
      setCreatePatientLoading(false);
    }
  };

  const loadPatientManagement = async (patientId: string) => {
    setPatientBookingsLoading((current) => ({ ...current, [patientId]: true }));
    try {
      const response = await apiRequest<PatientManagementResponse>("/api/admin/patients/" + patientId + "/management", {}, props.token);

      setPatients((current) => current.map((patient) =>
        patient.id === patientId
          ? {
              ...patient,
              avatarUrl: response.patient.avatarUrl ?? patient.avatarUrl ?? null,
              intakeAnswers: response.patient.intakeAnswers ?? null,
              activeProfessionalId: response.patient.activeProfessionalId ?? null,
              activeProfessionalName: response.patient.activeProfessionalName ?? null,
              assignmentStatus: response.patient.assignmentStatus ?? "pending",
              latestPurchase: response.patient.latestPurchase
            }
          : patient
      ));

      setPatientBookings((current) => ({ ...current, [patientId]: response.patient.confirmedBookings }));
      setActiveProfessionalDrafts((current) => ({ ...current, [patientId]: response.patient.activeProfessionalId ?? "" }));
      setRemainingSessionsDrafts((current) => ({
        ...current,
        [patientId]: String(response.patient.latestPurchase?.remainingCredits ?? 0)
      }));
      setPatientDetailDrafts((current) => ({
        ...current,
        [patientId]: {
          fullName: response.patient.fullName,
          email: response.patient.email,
          password: "",
          timezone: response.patient.timezone,
          status: (response.patient.status as PatientStatus) ?? "active",
          remainingCredits: String(response.patient.latestPurchase?.remainingCredits ?? 0),
          activeProfessionalId: response.patient.activeProfessionalId ?? ""
        }
      }));

      setBookingDrafts((current) => {
        const next = { ...current };
        for (const booking of response.patient.confirmedBookings) {
          next[booking.id] = {
            status: booking.status,
            startsAt: isoToInputDateTime(booking.startsAt),
            endsAt: isoToInputDateTime(booking.endsAt),
            professionalId: booking.professionalId
          };
        }
        return next;
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load patient sessions");
    } finally {
      setPatientBookingsLoading((current) => ({ ...current, [patientId]: false }));
    }
  };

  const createPackageAction = async () => {
    setError("");
    setSuccess("");
    const credits = Number(createPackage.credits);
    const priceCents = Number(createPackage.priceCents);
    if (!Number.isInteger(credits) || !Number.isInteger(priceCents) || credits <= 0 || priceCents <= 0) {
      setError("Credits and price must be valid integers");
      return;
    }

    try {
      await apiRequest<{ sessionPackage: AdminSessionPackage }>(
        "/api/admin/session-packages",
        {
          method: "POST",
          body: JSON.stringify({
            name: createPackage.name.trim(),
            credits,
            priceCents,
            currency: createPackage.currency.trim().toLowerCase(),
            active: true
          })
        },
        props.token
      );
      setCreatePackage({ name: "", credits: "4", priceCents: "36000", currency: "usd" });
      setSuccess("Package created");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create package");
    }
  };

  const updatePackage = async (item: AdminSessionPackage, patch: Partial<AdminSessionPackage>) => {
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ sessionPackage: AdminSessionPackage }>(
        "/api/admin/session-packages/" + item.id,
        {
          method: "PATCH",
          body: JSON.stringify(patch)
        },
        props.token
      );
      setSuccess("Package updated");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update package");
    }
  };

  const adjustCredits = async (patientId: string) => {
    const rawAmount = creditAdjustments[patientId] ?? "";
    const amount = Number(rawAmount);
    if (!Number.isInteger(amount) || amount === 0) {
      setError("Adjustment must be an integer different from 0");
      return;
    }
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ creditMovement: unknown }>(
        "/api/admin/patients/" + patientId + "/credits",
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            note: "Admin adjustment " + (amount > 0 ? "+" : "") + amount
          })
        },
        props.token
      );
      setCreditAdjustments((current) => ({ ...current, [patientId]: "" }));
      setSuccess("Credits adjusted");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not adjust credits");
    }
  };

  const getSessionReason = (patientId: string): string => {
    const reason = (sessionReasonDrafts[patientId] ?? SESSION_REASON_OPTIONS[0].value).trim();
    return reason.length > 0 ? reason : SESSION_REASON_OPTIONS[0].value;
  };

  const saveActiveProfessional = async (patientId: string, professionalId: string | null) => {
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ assignmentStatus: string }>(
        "/api/admin/patients/" + patientId + "/active-professional",
        {
          method: "PATCH",
          body: JSON.stringify({ professionalId })
        },
        props.token
      );
      setSuccess("Profesional activo actualizado");
      await load();
      await loadPatientManagement(patientId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update active professional");
    }
  };

  const savePatientProfile = async (patient: AdminPatientOps) => {
    const draft = patientDetailDrafts[patient.id];
    if (!draft) {
      return;
    }

    if (draft.fullName.trim().length < 2) {
      setError("Nombre invalido");
      return;
    }

    if (draft.email.trim().length === 0) {
      setError("Email invalido");
      return;
    }

    if (draft.timezone.trim().length === 0) {
      setError("Selecciona una zona horaria");
      return;
    }

    const remainingCredits = Number(draft.remainingCredits);
    if (!Number.isInteger(remainingCredits) || remainingCredits < 0) {
      setError("Sesiones disponibles debe ser un entero mayor o igual a 0");
      return;
    }

    setError("");
    setSuccess("");
    setPatientSaveLoading(true);

    try {
      await apiRequest<{ user: AdminUser }>(
        "/api/admin/users/" + patient.userId,
        {
          method: "PATCH",
          body: JSON.stringify({
            fullName: draft.fullName.trim(),
            email: draft.email.trim().toLowerCase(),
            ...(draft.password.trim().length > 0 ? { password: draft.password } : {}),
            patientStatus: draft.status,
            patientTimezone: draft.timezone.trim()
          })
        },
        props.token
      );

      await apiRequest<{ assignmentStatus: string }>(
        "/api/admin/patients/" + patient.id + "/active-professional",
        {
          method: "PATCH",
          body: JSON.stringify({ professionalId: draft.activeProfessionalId || null })
        },
        props.token
      );

      const sessionsResponse = await apiRequest<{ latestPurchase: AdminPatientOps["latestPurchase"] }>(
        "/api/admin/patients/" + patient.id + "/sessions-available",
        {
          method: "PATCH",
          body: JSON.stringify({ remainingCredits, reason: getSessionReason(patient.id) })
        },
        props.token
      );

      const nextRemainingCredits = sessionsResponse.latestPurchase?.remainingCredits ?? remainingCredits;
      setRemainingSessionsDrafts((current) => ({ ...current, [patient.id]: String(nextRemainingCredits) }));
      setPatientDetailDrafts((current) => {
        const currentDraft = current[patient.id];
        if (!currentDraft) {
          return current;
        }
        return {
          ...current,
          [patient.id]: {
            ...currentDraft,
            remainingCredits: String(nextRemainingCredits)
          }
        };
      });

      setSuccess("Paciente actualizado");
      await load(patientSearch, patientPage);
      setIsPatientEditModalOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el paciente");
    } finally {
      setPatientSaveLoading(false);
    }
  };

  const savePatientBooking = async (patientId: string, bookingId: string) => {
    const draft = bookingDrafts[bookingId];
    if (!draft) {
      setError("Booking draft not found");
      return;
    }

    setError("");
    setSuccess("");
    try {
      await apiRequest<{ booking: AdminBookingOps }>(
        "/api/admin/bookings/" + bookingId,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: draft.status,
            startsAt: new Date(draft.startsAt).toISOString(),
            endsAt: new Date(draft.endsAt).toISOString(),
            professionalId: draft.professionalId
          })
        },
        props.token
      );
      setSuccess("Sesion actualizada");
      await loadPatientManagement(patientId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update booking");
    }
  };

  const cancelConfirmedBooking = async (patientId: string, bookingId: string) => {
    const draft = bookingDrafts[bookingId];
    if (!draft) {
      setError("No se encontro la sesion");
      return;
    }

    setError("");
    setSuccess("");
    setSessionOpsLoading(true);
    try {
      await apiRequest<{ booking: AdminBookingOps }>(
        "/api/admin/bookings/" + bookingId,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "CANCELLED",
            startsAt: new Date(draft.startsAt).toISOString(),
            endsAt: new Date(draft.endsAt).toISOString(),
            professionalId: draft.professionalId,
            cancellationReason: "Admin: sesion cancelada"
          })
        },
        props.token
      );

      setSuccess("Sesion cancelada");
      await loadPatientManagement(patientId);
      await load(patientSearch, patientPage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cancelar la sesion");
    } finally {
      setSessionOpsLoading(false);
    }
  };

  const reactivateCancelledBooking = async (patientId: string, bookingId: string) => {
    const draft = bookingDrafts[bookingId];
    if (!draft) {
      setError("No se encontro la sesion");
      return;
    }

    setError("");
    setSuccess("");
    setSessionOpsLoading(true);
    try {
      await apiRequest<{ booking: AdminBookingOps }>(
        "/api/admin/bookings/" + bookingId,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "CONFIRMED",
            startsAt: new Date(draft.startsAt).toISOString(),
            endsAt: new Date(draft.endsAt).toISOString(),
            professionalId: draft.professionalId,
            cancellationReason: null
          })
        },
        props.token
      );

      setSuccess("Sesion reactivada");
      await loadPatientManagement(patientId);
      await load(patientSearch, patientPage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo reactivar la sesion");
    } finally {
      setSessionOpsLoading(false);
    }
  };

  const editingPatient = editingPatientId ? patients.find((patient) => patient.id === editingPatientId) ?? null : null;
  const editingPatientDraft = editingPatient ? patientDetailDrafts[editingPatient.id] : undefined;
  const editingBookings = editingPatient ? patientBookings[editingPatient.id] ?? [] : [];
  const confirmedSessionsCount = editingBookings.filter((booking) => booking.status === "CONFIRMED").length;
  const loadingEditingBookings = editingPatient ? patientBookingsLoading[editingPatient.id] === true : false;

  const resolvePatientRiskTriage = async (patientId: string, decision: "approved" | "cancelled") => {
    setError("");
    setSuccess("");
    setRiskTriageActionPatientId(patientId);
    try {
      await apiRequest<{ triageDecision: string }>(
        "/api/admin/patients/" + patientId + "/risk-triage",
        {
          method: "PATCH",
          body: JSON.stringify({ decision })
        },
        props.token
      );
      setSuccess(decision === "approved" ? "Paciente aprobado en triage" : "Paciente rechazado por triage");
      await load(patientSearch, patientPage);
      if (editingPatientId === patientId) {
        await loadPatientManagement(patientId);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el triage");
    } finally {
      setRiskTriageActionPatientId(null);
    }
  };

  return (
    <div className="stack-lg ops-page">
      <section className="card stack ops-panel patient-search-section">
        <PatientsSearchHeader
          language={props.language}
          patientSearchInput={patientSearchInput}
          setPatientSearchInput={setPatientSearchInput}
          onSearch={() => void applyPatientSearch()}
          onOpenCreate={openCreatePatientModal}
        />

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        {loading ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}

        <PatientsSearchResults
          language={props.language}
          loading={loading}
          patientSearch={patientSearch}
          patients={patients}
          editingPatientId={editingPatientId}
          patientPagination={patientPagination}
          onSelectPatient={(patientId) => {
            setEditingPatientId(patientId);
            setIsPatientEditModalOpen(false);
            void loadPatientManagement(patientId);
          }}
          onEditPatient={(patientId) => {
            setEditingPatientId(patientId);
            setIsPatientEditModalOpen(true);
            void loadPatientManagement(patientId);
          }}
          onPrevPage={() => {
            if (!patientPagination) {
              return;
            }
            void goToPatientPage(patientPagination.page - 1);
          }}
          onNextPage={() => {
            if (!patientPagination) {
              return;
            }
            void goToPatientPage(patientPagination.page + 1);
          }}
        />

        <CreatePatientModal
          open={isCreatePatientModalOpen}
          createPatientForm={createPatientForm}
          createPatientError={createPatientError}
          createPatientLoading={createPatientLoading}
          setCreatePatientForm={setCreatePatientForm}
          patientStatusLabel={(status) => patientStatusLabel(status, props.language)}
          onClose={() => setIsCreatePatientModalOpen(false)}
          onSubmit={() => void createPatientFromModal()}
        />

        <PatientEditModal
          open={Boolean(editingPatient) && isPatientEditModalOpen}
          editingPatient={editingPatient}
          editingPatientDraft={editingPatientDraft}
          editingBookings={editingBookings}
          bookingDrafts={bookingDrafts}
          professionals={professionals}
          loadingEditingBookings={loadingEditingBookings}
          confirmedSessionsCount={confirmedSessionsCount}
          sessionReasonDrafts={sessionReasonDrafts}
          sessionOpsLoading={sessionOpsLoading}
          patientSaveLoading={patientSaveLoading}
          triagePending={editingPatient?.riskTriageDecision !== "approved"}
          triageActionLoading={editingPatient ? riskTriageActionPatientId === editingPatient.id : false}
          setPatientDetailDrafts={setPatientDetailDrafts}
          setBookingDrafts={setBookingDrafts}
          setSessionReasonDrafts={setSessionReasonDrafts}
          patientStatusLabel={(status) => patientStatusLabel(status, props.language)}
          formatDate={(value) => formatDate(value, props.language)}
          isoToInputDateTime={isoToInputDateTime}
          onClose={() => setIsPatientEditModalOpen(false)}
          onSavePatient={() => {
            if (!editingPatient) {
              return;
            }
            void savePatientProfile(editingPatient);
          }}
          onSaveBooking={(bookingId) => {
            if (!editingPatient) {
              return;
            }
            void savePatientBooking(editingPatient.id, bookingId);
          }}
          onCancelBooking={(bookingId) => {
            if (!editingPatient) {
              return;
            }
            void cancelConfirmedBooking(editingPatient.id, bookingId);
          }}
          onReactivateBooking={(bookingId) => {
            if (!editingPatient) {
              return;
            }
            void reactivateCancelledBooking(editingPatient.id, bookingId);
          }}
          onApproveTriage={() => {
            if (!editingPatient) {
              return;
            }
            void resolvePatientRiskTriage(editingPatient.id, "approved");
          }}
          onRejectTriage={() => {
            if (!editingPatient) {
              return;
            }
            void resolvePatientRiskTriage(editingPatient.id, "cancelled");
          }}
        />
      </section>

      <RiskTriageQueueSection
        loading={riskTriageLoading}
        items={riskTriageItems}
        pendingCount={riskTriagePendingCount}
        actionPatientId={riskTriageActionPatientId}
        onOpenPatient={(patientId) => {
          setEditingPatientId(patientId);
          setIsPatientEditModalOpen(true);
          void loadPatientManagement(patientId);
        }}
        onApprovePatient={(patientId) => {
          void resolvePatientRiskTriage(patientId, "approved");
        }}
        onRejectPatient={(patientId) => {
          void resolvePatientRiskTriage(patientId, "cancelled");
        }}
      />
    </div>
  );
}
