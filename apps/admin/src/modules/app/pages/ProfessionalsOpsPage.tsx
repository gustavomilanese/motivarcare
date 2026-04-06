import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { useEffect, useState } from "react";
import { PROFESSIONAL_EMPTY_ART_URL } from "../constants";
import {
  type ProfessionalBookingDraft,
  type ProfessionalEditDraft,
  type ProfessionalSlotDraft,
  ProfessionalEditModal
} from "../components/professionals/ProfessionalEditModal";
import { PortalHeroSettingsSection } from "../components/PortalHeroSettingsSection";
import { apiRequest } from "../services/api";
import type {
  AdminBookingOps,
  AdminBookingsResponse,
  AdminProfessionalOps,
  AdminUser,
  ProfessionalsResponse
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

function createEmptySlotDraft(): ProfessionalSlotDraft {
  return {
    slotDate: "",
    slotTime: "09:00"
  };
}

function parseLocalDateAndTime(slotDate: string, slotTime: string): Date | null {
  const [year, month, day] = slotDate.split("-").map((part) => Number(part));
  const [hours, minutes] = slotTime.split(":").map((part) => Number(part));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function ProfessionalsOpsPage(props: { token: string; language: AppLanguage }) {
  const [professionals, setProfessionals] = useState<AdminProfessionalOps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [professionalSearchInput, setProfessionalSearchInput] = useState("");
  const [professionalSearch, setProfessionalSearch] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [isProfessionalEditModalOpen, setIsProfessionalEditModalOpen] = useState(false);
  const [professionalSaveLoading, setProfessionalSaveLoading] = useState(false);
  const [professionalSlotDrafts, setProfessionalSlotDrafts] = useState<Record<string, ProfessionalSlotDraft>>({});
  const [professionalBookings, setProfessionalBookings] = useState<Record<string, AdminBookingOps[]>>({});
  const [professionalBookingsLoading, setProfessionalBookingsLoading] = useState<Record<string, boolean>>({});
  const [professionalBookingDrafts, setProfessionalBookingDrafts] = useState<Record<string, ProfessionalBookingDraft>>({});
  const [showConfirmedSessions, setShowConfirmedSessions] = useState(false);
  const [expandedConfirmedBookingId, setExpandedConfirmedBookingId] = useState<string | null>(null);
  const [professionalEditDrafts, setProfessionalEditDrafts] = useState<Record<string, ProfessionalEditDraft>>({});

  const syncProfessionalDrafts = (nextProfessionals: AdminProfessionalOps[]) => {
    setProfessionalEditDrafts((current) => {
      const next = { ...current };
      for (const professional of nextProfessionals) {
        if (!next[professional.id]) {
          next[professional.id] = {
            fullName: professional.fullName,
            email: professional.email,
            visible: professional.visible,
            cancellationHours: String(professional.cancellationHours),
            bio: professional.bio ?? "",
            therapeuticApproach: professional.therapeuticApproach ?? "",
            yearsExperience:
              professional.yearsExperience === null || professional.yearsExperience === undefined
                ? ""
                : String(professional.yearsExperience),
            birthCountry: professional.birthCountry ?? "",
            sessionPriceUsd:
              professional.sessionPriceUsd === null || professional.sessionPriceUsd === undefined
                ? ""
                : String(professional.sessionPriceUsd),
            ratingAverage:
              professional.ratingAverage === null || professional.ratingAverage === undefined
                ? ""
                : String(professional.ratingAverage),
            reviewsCount: String(professional.reviewsCount ?? 0),
            sessionDurationMinutes:
              professional.sessionDurationMinutes === null || professional.sessionDurationMinutes === undefined
                ? ""
                : String(professional.sessionDurationMinutes),
            activePatientsCount:
              professional.activePatientsCount === null || professional.activePatientsCount === undefined
                ? ""
                : String(professional.activePatientsCount),
            sessionsCount:
              professional.sessionsCount === null || professional.sessionsCount === undefined
                ? ""
                : String(professional.sessionsCount),
            completedSessionsCount:
              professional.completedSessionsCount === null || professional.completedSessionsCount === undefined
                ? ""
                : String(professional.completedSessionsCount),
            photoUrl: professional.photoUrl ?? "",
            videoUrl: professional.videoUrl ?? ""
          };
        }
      }
      return next;
    });

    setProfessionalSlotDrafts((current) => {
      const next = { ...current };
      for (const professional of nextProfessionals) {
        if (!next[professional.id]) {
          next[professional.id] = createEmptySlotDraft();
        } else {
          next[professional.id] = { ...createEmptySlotDraft(), ...next[professional.id] };
        }
      }
      return next;
    });
  };

  const load = async (searchValue?: string) => {
    setLoading(true);
    setError("");

    try {
      const normalizedSearch = (searchValue ?? professionalSearch).trim();
      const request =
        normalizedSearch.length === 0
          ? Promise.resolve<ProfessionalsResponse>({ professionals: [] })
          : normalizedSearch === "*"
            ? apiRequest<ProfessionalsResponse>("/api/admin/professionals", {}, props.token)
            : apiRequest<ProfessionalsResponse>(
                "/api/admin/professionals?search=" + encodeURIComponent(normalizedSearch),
                {},
                props.token
              );

      const data = await request;
      setProfessionals(data.professionals);
      syncProfessionalDrafts(data.professionals);

      if (selectedProfessionalId && !data.professionals.some((item) => item.id === selectedProfessionalId)) {
        setSelectedProfessionalId(null);
        setIsProfessionalEditModalOpen(false);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load professionals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [props.token]);

  const loadProfessionalBookings = async (professionalId: string) => {
    setProfessionalBookingsLoading((current) => ({ ...current, [professionalId]: true }));
    try {
      const response = await apiRequest<AdminBookingsResponse>(
        "/api/admin/bookings?professionalId=" + professionalId + "&status=CONFIRMED",
        {},
        props.token
      );

      setProfessionalBookings((current) => ({ ...current, [professionalId]: response.bookings }));
      setProfessionalBookingDrafts((current) => {
        const next = { ...current };
        for (const booking of response.bookings) {
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
      setError(requestError instanceof Error ? requestError.message : "Could not load professional bookings");
    } finally {
      setProfessionalBookingsLoading((current) => ({ ...current, [professionalId]: false }));
    }
  };

  const applyProfessionalSearch = async () => {
    const nextSearch = professionalSearchInput.trim();
    setProfessionalSearch(nextSearch);
    await load(nextSearch);
  };

  const saveProfessionalProfile = async (professional: AdminProfessionalOps) => {
    const draft = professionalEditDrafts[professional.id];
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

    const cancellationHours = Number(draft.cancellationHours);
    if (!Number.isInteger(cancellationHours) || cancellationHours < 0 || cancellationHours > 168) {
      setError("Horas de cancelacion debe estar entre 0 y 168");
      return;
    }

    const yearsExperienceRaw = draft.yearsExperience.trim();
    const yearsExperience = yearsExperienceRaw.length > 0 ? Number(yearsExperienceRaw) : null;
    if (yearsExperienceRaw.length > 0 && (!Number.isInteger(yearsExperience ?? 0) || (yearsExperience ?? 0) < 0 || (yearsExperience ?? 0) > 80)) {
      setError("Anos de experiencia debe estar entre 0 y 80");
      return;
    }

    const sessionPriceRaw = draft.sessionPriceUsd.trim();
    const sessionPriceUsd = sessionPriceRaw.length > 0 ? Number(sessionPriceRaw) : null;
    if (sessionPriceRaw.length > 0 && (!Number.isInteger(sessionPriceUsd ?? 0) || (sessionPriceUsd ?? 0) < 0 || (sessionPriceUsd ?? 0) > 100000)) {
      setError("Valor sesion debe estar entre 0 y 100000");
      return;
    }

    const ratingRaw = draft.ratingAverage.trim();
    const ratingAverage = ratingRaw.length > 0 ? Number(ratingRaw) : null;
    if (ratingRaw.length > 0 && (!Number.isFinite(ratingAverage ?? 0) || (ratingAverage ?? 0) < 0 || (ratingAverage ?? 0) > 5)) {
      setError("Ranking debe estar entre 0 y 5");
      return;
    }

    const reviewsRaw = draft.reviewsCount.trim();
    const reviewsCount = reviewsRaw.length > 0 ? Number(reviewsRaw) : 0;
    if (!Number.isInteger(reviewsCount) || reviewsCount < 0 || reviewsCount > 100000) {
      setError("Opiniones debe estar entre 0 y 100000");
      return;
    }

    const sessionDurationRaw = draft.sessionDurationMinutes.trim();
    const sessionDurationMinutes = sessionDurationRaw.length > 0 ? Number(sessionDurationRaw) : null;
    if (sessionDurationRaw.length > 0 && (!Number.isInteger(sessionDurationMinutes ?? 0) || (sessionDurationMinutes ?? 0) < 15 || (sessionDurationMinutes ?? 0) > 120)) {
      setError("Duracion sesion debe estar entre 15 y 120");
      return;
    }

    const activePatientsRaw = draft.activePatientsCount.trim();
    const activePatientsCount = activePatientsRaw.length > 0 ? Number(activePatientsRaw) : null;
    if (activePatientsRaw.length > 0 && (!Number.isInteger(activePatientsCount ?? 0) || (activePatientsCount ?? 0) < 0 || (activePatientsCount ?? 0) > 100000)) {
      setError("Pacientes activos debe estar entre 0 y 100000");
      return;
    }

    const sessionsRaw = draft.sessionsCount.trim();
    const sessionsCount = sessionsRaw.length > 0 ? Number(sessionsRaw) : null;
    if (sessionsRaw.length > 0 && (!Number.isInteger(sessionsCount ?? 0) || (sessionsCount ?? 0) < 0 || (sessionsCount ?? 0) > 1000000)) {
      setError("Sesiones debe estar entre 0 y 1000000");
      return;
    }

    const completedRaw = draft.completedSessionsCount.trim();
    const completedSessionsCount = completedRaw.length > 0 ? Number(completedRaw) : null;
    if (completedRaw.length > 0 && (!Number.isInteger(completedSessionsCount ?? 0) || (completedSessionsCount ?? 0) < 0 || (completedSessionsCount ?? 0) > 1000000)) {
      setError("Sesiones completadas debe estar entre 0 y 1000000");
      return;
    }

    setError("");
    setSuccess("");
    setProfessionalSaveLoading(true);

    try {
      await apiRequest<{ user: AdminUser }>(
        "/api/admin/users/" + professional.userId,
        {
          method: "PATCH",
          body: JSON.stringify({
            fullName: draft.fullName.trim(),
            email: draft.email.trim().toLowerCase()
          })
        },
        props.token
      );

      await apiRequest<{ professional: AdminProfessionalOps }>(
        "/api/admin/professionals/" + professional.id,
        {
          method: "PATCH",
          body: JSON.stringify({
            visible: draft.visible,
            cancellationHours,
            bio: draft.bio.trim().length > 0 ? draft.bio.trim() : null,
            therapeuticApproach: draft.therapeuticApproach.trim().length > 0 ? draft.therapeuticApproach.trim() : null,
            yearsExperience,
            birthCountry: draft.birthCountry.trim().length > 0 ? draft.birthCountry.trim() : null,
            sessionPriceUsd,
            ratingAverage,
            reviewsCount,
            sessionDurationMinutes,
            activePatientsCount,
            sessionsCount,
            completedSessionsCount,
            photoUrl: draft.photoUrl.trim().length > 0 ? draft.photoUrl.trim() : null,
            videoUrl: draft.videoUrl.trim().length > 0 ? draft.videoUrl.trim() : null
          })
        },
        props.token
      );

      setSuccess("Profesional actualizado");
      setIsProfessionalEditModalOpen(false);
      await load(professionalSearch);
      if (showConfirmedSessions) {
        await loadProfessionalBookings(professional.id);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el profesional");
    } finally {
      setProfessionalSaveLoading(false);
    }
  };

  const createSlot = async (professionalId: string) => {
    const draft = professionalSlotDrafts[professionalId] ?? createEmptySlotDraft();
    if (draft.slotDate.trim().length === 0 || draft.slotTime.trim().length === 0) {
      setError("Completa dia y hora para crear el slot.");
      return;
    }

    const profileDraft = professionalEditDrafts[professionalId];
    const currentProfessional = professionals.find((item) => item.id === professionalId) ?? null;
    const fallbackDuration = currentProfessional?.sessionDurationMinutes ?? 60;
    const durationMinutes = Number(profileDraft?.sessionDurationMinutes?.trim() || fallbackDuration);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
      setError("Duracion de sesion invalida. Ajustala entre 15 y 240 minutos.");
      return;
    }

    const startsAt = parseLocalDateAndTime(draft.slotDate, draft.slotTime);
    if (!startsAt) {
      setError("Fecha u hora invalida para crear el slot.");
      return;
    }
    const endsAt = new Date(startsAt.getTime() + (durationMinutes * 60_000));

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setError("Slot invalido: revisa fecha y hora.");
      return;
    }
    if (endsAt <= startsAt) {
      setError("El horario de fin debe ser posterior al de inicio.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await apiRequest<{ slot: unknown }>(
        "/api/admin/professionals/" + professionalId + "/slots",
        {
          method: "POST",
          body: JSON.stringify({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() })
        },
        props.token
      );

      setProfessionalSlotDrafts((current) => ({ ...current, [professionalId]: createEmptySlotDraft() }));
      setSuccess("Slot creado");
      await load(professionalSearch);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear el slot");
    }
  };

  const deleteSlot = async (professionalId: string, slotId: string) => {
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ success: boolean }>(
        "/api/admin/professionals/" + professionalId + "/slots/" + slotId,
        { method: "DELETE" },
        props.token
      );
      setSuccess("Slot eliminado");
      await load(professionalSearch);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar el slot");
    }
  };

  const saveProfessionalBooking = async (professionalId: string, bookingId: string) => {
    const draft = professionalBookingDrafts[bookingId];
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
      await loadProfessionalBookings(professionalId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar la sesion");
    }
  };

  const selectedProfessional = selectedProfessionalId
    ? professionals.find((professional) => professional.id === selectedProfessionalId) ?? null
    : null;
  const selectedProfessionalDraft = selectedProfessional ? professionalEditDrafts[selectedProfessional.id] : undefined;
  const selectedBookings = selectedProfessional ? professionalBookings[selectedProfessional.id] ?? [] : [];
  const loadingSelectedBookings = selectedProfessional ? professionalBookingsLoading[selectedProfessional.id] === true : false;
  const confirmedSessionsCount = selectedBookings.filter((booking) => booking.status === "CONFIRMED").length;

  return (
    <div className="stack-lg ops-page">
      <section className="card stack ops-panel patient-search-section">
        <div className="patient-section-head">
          <h2>Buscador de Psicologos</h2>
        </div>

        <div className="patient-search-shell">
          <div className="patient-search-inline">
            <input
              className="patient-search-input"
              placeholder="Buscar psicologo por nombre o email"
              value={professionalSearchInput}
              onChange={(event) => setProfessionalSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void applyProfessionalSearch();
                }
              }}
            />
            <button type="button" className="primary" onClick={() => void applyProfessionalSearch()}>Buscar</button>
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        {loading ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}

                  <section className="ops-section results-section">
            {!loading && professionals.length > 0 ? (
            <header className="ops-section-head">
              <h3>Resultados de busqueda</h3>
            </header>
            ) : null}
            {!loading && professionals.length === 0 ? (
              <div className="patient-empty-art">
                <img src={PROFESSIONAL_EMPTY_ART_URL} alt="La Creacion de Adan de Miguel Angel (Capilla Sixtina)" loading="lazy" />
              </div>
            ) : null}
            <div className="patient-results-list">
            {professionals.map((professional) => (
              <article
                key={professional.id}
                className={"patient-result-row" + (selectedProfessionalId === professional.id ? " active" : "")}
                onClick={() => {
                  setSelectedProfessionalId(professional.id);
                  setIsProfessionalEditModalOpen(false);
                }}
              >
                <div className="patient-result-main">
                  <strong>{professional.fullName}</strong>
                  <span>{professional.email} · {professional.visible ? "visible" : "oculto"} · slots {professional.slots.length}</span>
                </div>
                <div className="patient-result-actions">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedProfessionalId(professional.id);
                      setIsProfessionalEditModalOpen(true);
                    }}
                  >
                    Editar
                  </button>
                </div>
              </article>
            ))}
            </div>
          </section>

        {selectedProfessional && selectedProfessionalDraft ? (
          <section className="patient-inline-panel record-panel">
            <div className="record-badge">Psicologo seleccionado</div>
            <div className="patient-inline-head">
              <h3>{selectedProfessional.fullName}</h3>
              <button type="button" onClick={() => setIsProfessionalEditModalOpen(true)}>Editar</button>
            </div>
            <div className="grid-form">
              <label>
                Nombre completo
                <input value={selectedProfessionalDraft.fullName} readOnly />
              </label>
              <label>
                Email
                <input value={selectedProfessionalDraft.email} readOnly />
              </label>
              <label>
                Perfil visible
                <input value={selectedProfessionalDraft.visible ? "si" : "no"} readOnly />
              </label>
              <label>
                Horas cancelacion
                <input value={selectedProfessionalDraft.cancellationHours} readOnly />
              </label>
              <label>
                Slots disponibles
                <input value={String(selectedProfessional.slots.length)} readOnly />
              </label>
              <label>
                Sesiones confirmadas
                <input value={String(confirmedSessionsCount)} readOnly />
              </label>
              <label>
                Valor sesion USD
                <input value={selectedProfessionalDraft.sessionPriceUsd || "-"} readOnly />
              </label>
              <label>
                Ranking / opiniones
                <input value={`${selectedProfessionalDraft.ratingAverage || "-"} · ${selectedProfessionalDraft.reviewsCount}`} readOnly />
              </label>
              <label>
                Duracion sesion
                <input value={selectedProfessionalDraft.sessionDurationMinutes || "-"} readOnly />
              </label>
              <label>
                Pacientes activos (card)
                <input value={selectedProfessionalDraft.activePatientsCount || "-"} readOnly />
              </label>
              <label>
                Sesiones (card)
                <input value={selectedProfessionalDraft.sessionsCount || "-"} readOnly />
              </label>
              <label>
                Completadas (card)
                <input value={selectedProfessionalDraft.completedSessionsCount || "-"} readOnly />
              </label>
            </div>
          </section>
        ) : null}

        <ProfessionalEditModal
          open={Boolean(selectedProfessional && isProfessionalEditModalOpen)}
          language={props.language}
          selectedProfessional={selectedProfessional}
          selectedProfessionalDraft={selectedProfessionalDraft}
          showConfirmedSessions={showConfirmedSessions}
          loadingSelectedBookings={loadingSelectedBookings}
          professionalSaveLoading={professionalSaveLoading}
          selectedBookings={selectedBookings}
          expandedConfirmedBookingId={expandedConfirmedBookingId}
          professionalSlotDrafts={professionalSlotDrafts}
          professionalBookingDrafts={professionalBookingDrafts}
          professionals={professionals}
          setProfessionalEditDrafts={setProfessionalEditDrafts}
          setProfessionalSlotDrafts={setProfessionalSlotDrafts}
          setProfessionalBookingDrafts={setProfessionalBookingDrafts}
          setExpandedConfirmedBookingId={setExpandedConfirmedBookingId}
          formatDate={(value) => formatDate(value, props.language)}
          isoToInputDateTime={isoToInputDateTime}
          onClose={() => setIsProfessionalEditModalOpen(false)}
          onCreateSlot={() => {
            if (!selectedProfessional) {
              return;
            }
            void createSlot(selectedProfessional.id);
          }}
          onDeleteSlot={(slotId) => {
            if (!selectedProfessional) {
              return;
            }
            void deleteSlot(selectedProfessional.id, slotId);
          }}
          onSaveProfessional={() => {
            if (!selectedProfessional) {
              return;
            }
            void saveProfessionalProfile(selectedProfessional);
          }}
          onToggleConfirmedSessions={() => {
            const next = !showConfirmedSessions;
            setShowConfirmedSessions(next);
            if (next && selectedProfessional) {
              void loadProfessionalBookings(selectedProfessional.id);
            }
          }}
          onSaveBooking={(bookingId) => {
            if (!selectedProfessional) {
              return;
            }
            void saveProfessionalBooking(selectedProfessional.id, bookingId);
          }}
        />
      </section>

      <PortalHeroSettingsSection token={props.token} language={props.language} target="professional" />
    </div>
  );
}
