import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { useEffect, useState } from "react";
import { PROFESSIONAL_EMPTY_ART_URL } from "../constants";
import {
  type ProfessionalBookingDraft,
  type ProfessionalEditDraft,
  type ProfessionalSlotDraft,
  ProfessionalEditModal
} from "../components/professionals/ProfessionalEditModal";
import { ProfessionalPhotoUrlField } from "../components/shared/ProfessionalPhotoUrlField";
import { PortalHeroSettingsSection } from "../components/PortalHeroSettingsSection";
import { adminSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
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

function buildProfessionalEditDraft(professional: AdminProfessionalOps): ProfessionalEditDraft {
  return {
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

type ProfessionalProfileEditSection = null | "account" | "presentation" | "media";

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
  const [editingProfileSection, setEditingProfileSection] = useState<ProfessionalProfileEditSection>(null);
  const [professionalSlotDrafts, setProfessionalSlotDrafts] = useState<Record<string, ProfessionalSlotDraft>>({});
  const [professionalBookings, setProfessionalBookings] = useState<Record<string, AdminBookingOps[]>>({});
  const [professionalBookingsLoading, setProfessionalBookingsLoading] = useState<Record<string, boolean>>({});
  const [professionalBookingDrafts, setProfessionalBookingDrafts] = useState<Record<string, ProfessionalBookingDraft>>({});
  const [showConfirmedSessions, setShowConfirmedSessions] = useState(false);
  const [expandedConfirmedBookingId, setExpandedConfirmedBookingId] = useState<string | null>(null);
  const [professionalEditDrafts, setProfessionalEditDrafts] = useState<Record<string, ProfessionalEditDraft>>({});
  const syncProfessionalDrafts = (nextProfessionals: AdminProfessionalOps[]) => {
    setProfessionalEditDrafts(() => {
      const next: Record<string, ProfessionalEditDraft> = {};
      for (const professional of nextProfessionals) {
        next[professional.id] = buildProfessionalEditDraft(professional);
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

  const buildProfessionalsListUrl = (normalizedSearch: string): string | null => {
    if (normalizedSearch.length === 0) {
      return null;
    }
    const params = new URLSearchParams();
    if (normalizedSearch !== "*") {
      params.set("search", normalizedSearch);
    }
    const qs = params.toString();
    return qs.length > 0 ? `/api/admin/professionals?${qs}` : "/api/admin/professionals";
  };

  const load = async (searchValue?: string) => {
    setLoading(true);
    setError("");

    try {
      const normalizedSearch = (searchValue ?? professionalSearch).trim();
      const listUrl = buildProfessionalsListUrl(normalizedSearch);
      const request =
        listUrl === null
          ? Promise.resolve<ProfessionalsResponse>({ professionals: [] })
          : apiRequest<ProfessionalsResponse>(listUrl, {}, props.token);

      const data = await request;
      setProfessionals(data.professionals);
      syncProfessionalDrafts(data.professionals);

      if (selectedProfessionalId && !data.professionals.some((item) => item.id === selectedProfessionalId)) {
        setSelectedProfessionalId(null);
        setIsProfessionalEditModalOpen(false);
        setEditingProfileSection(null);
      }
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("prof-ops-list", props.language, raw));
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

  const cancelProfileSectionEdit = (professional: AdminProfessionalOps) => {
    setEditingProfileSection(null);
    setProfessionalEditDrafts((current) => ({
      ...current,
      [professional.id]: buildProfessionalEditDraft(professional)
    }));
  };

  const beginProfileSectionEdit = (professional: AdminProfessionalOps, section: Exclude<ProfessionalProfileEditSection, null>) => {
    setProfessionalEditDrafts((current) => ({
      ...current,
      [professional.id]: buildProfessionalEditDraft(professional)
    }));
    setEditingProfileSection(section);
  };

  const afterProfessionalPatchSuccess = async (professionalId: string) => {
    setEditingProfileSection(null);
    await load(professionalSearch);
    if (showConfirmedSessions) {
      await loadProfessionalBookings(professionalId);
    }
  };

  const saveProfessionalAccountSection = async (professional: AdminProfessionalOps) => {
    const draft = professionalEditDrafts[professional.id];
    if (!draft) {
      return;
    }

    if (draft.fullName.trim().length < 2) {
      setError(
        t(props.language, {
          es: "El nombre público necesita al menos 2 caracteres.",
          en: "Public name needs at least 2 characters.",
          pt: "O nome publico precisa de pelo menos 2 caracteres."
        })
      );
      return;
    }

    if (draft.email.trim().length === 0) {
      setError(
        t(props.language, {
          es: "Necesitamos un email de contacto.",
          en: "We need a contact email.",
          pt: "Precisamos de um e-mail de contato."
        })
      );
      return;
    }

    const cancellationHours = Number(draft.cancellationHours);
    if (!Number.isInteger(cancellationHours) || cancellationHours < 0 || cancellationHours > 168) {
      setError(
        t(props.language, {
          es: "Las horas de cancelación: entero entre 0 y 168.",
          en: "Cancellation hours: whole number from 0 to 168.",
          pt: "Horas de cancelamento: inteiro de 0 a 168."
        })
      );
      return;
    }

    const sessionPriceRaw = draft.sessionPriceUsd.trim();
    const sessionPriceUsd = sessionPriceRaw.length > 0 ? Number(sessionPriceRaw) : null;
    if (sessionPriceRaw.length > 0 && (!Number.isInteger(sessionPriceUsd ?? 0) || (sessionPriceUsd ?? 0) < 0 || (sessionPriceUsd ?? 0) > 100000)) {
      setError(
        t(props.language, {
          es: "Valor sesión (USD): entero entre 0 y 100000.",
          en: "Session price (USD): integer from 0 to 100000.",
          pt: "Preco (USD): inteiro de 0 a 100000."
        })
      );
      return;
    }

    const ratingRaw = draft.ratingAverage.trim();
    const ratingAverage = ratingRaw.length > 0 ? Number(ratingRaw) : null;
    if (ratingRaw.length > 0 && (!Number.isFinite(ratingAverage ?? 0) || (ratingAverage ?? 0) < 0 || (ratingAverage ?? 0) > 5)) {
      setError(
        t(props.language, {
          es: "Ranking: entre 0 y 5 (decimales permitidos).",
          en: "Rating: between 0 and 5 (decimals allowed).",
          pt: "Nota: entre 0 e 5."
        })
      );
      return;
    }

    const reviewsRaw = draft.reviewsCount.trim();
    const reviewsCount = reviewsRaw.length > 0 ? Number(reviewsRaw) : 0;
    if (!Number.isInteger(reviewsCount) || reviewsCount < 0 || reviewsCount > 100000) {
      setError(
        t(props.language, {
          es: "Opiniones: entero entre 0 y 100000.",
          en: "Review count: whole number from 0 to 100000.",
          pt: "Avaliacoes: inteiro de 0 a 100000."
        })
      );
      return;
    }

    const sessionDurationRaw = draft.sessionDurationMinutes.trim();
    const sessionDurationMinutes = sessionDurationRaw.length > 0 ? Number(sessionDurationRaw) : null;
    if (
      sessionDurationRaw.length > 0
      && (!Number.isInteger(sessionDurationMinutes ?? 0)
        || (sessionDurationMinutes ?? 0) < 15
        || (sessionDurationMinutes ?? 0) > 120)
    ) {
      setError(
        t(props.language, {
          es: "Duración sesión (card): 15–120 minutos, entero.",
          en: "Session length (card): 15–120 minutes, integer.",
          pt: "Duracao (card): 15–120 minutos."
        })
      );
      return;
    }

    const activePatientsRaw = draft.activePatientsCount.trim();
    const activePatientsCount = activePatientsRaw.length > 0 ? Number(activePatientsRaw) : null;
    if (
      activePatientsRaw.length > 0
      && (!Number.isInteger(activePatientsCount ?? 0)
        || (activePatientsCount ?? 0) < 0
        || (activePatientsCount ?? 0) > 100000)
    ) {
      setError(
        t(props.language, {
          es: "Pacientes activos (card): entero 0–100000.",
          en: "Active patients (card): integer 0–100000.",
          pt: "Pacientes ativos: inteiro 0–100000."
        })
      );
      return;
    }

    const sessionsRaw = draft.sessionsCount.trim();
    const sessionsCount = sessionsRaw.length > 0 ? Number(sessionsRaw) : null;
    if (sessionsRaw.length > 0 && (!Number.isInteger(sessionsCount ?? 0) || (sessionsCount ?? 0) < 0 || (sessionsCount ?? 0) > 1000000)) {
      setError(
        t(props.language, {
          es: "Sesiones (card): entero 0–1000000.",
          en: "Sessions (card): integer 0–1000000.",
          pt: "Sessoes: inteiro 0–1000000."
        })
      );
      return;
    }

    const completedRaw = draft.completedSessionsCount.trim();
    const completedSessionsCount = completedRaw.length > 0 ? Number(completedRaw) : null;
    if (
      completedRaw.length > 0
      && (!Number.isInteger(completedSessionsCount ?? 0)
        || (completedSessionsCount ?? 0) < 0
        || (completedSessionsCount ?? 0) > 1000000)
    ) {
      setError(
        t(props.language, {
          es: "Completadas (card): entero 0–1000000.",
          en: "Completed (card): integer 0–1000000.",
          pt: "Concluidas: inteiro 0–1000000."
        })
      );
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
            sessionPriceUsd,
            ratingAverage,
            reviewsCount,
            sessionDurationMinutes,
            activePatientsCount,
            sessionsCount,
            completedSessionsCount
          })
        },
        props.token
      );

      setSuccess(
        t(props.language, {
          es: "Cuenta y datos de tarjeta guardados. Los pacientes verán estos valores al refrescar el listado.",
          en: "Account and card fields saved. Patients will see updates after the directory reloads.",
          pt: "Conta e dados do card salvos. Pacientes veem apos recarregar o listado."
        })
      );
      await afterProfessionalPatchSuccess(professional.id);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("prof-ops-update", props.language, raw));
    } finally {
      setProfessionalSaveLoading(false);
    }
  };

  const saveProfessionalPresentationSection = async (professional: AdminProfessionalOps) => {
    const draft = professionalEditDrafts[professional.id];
    if (!draft) {
      return;
    }

    const yearsExperienceRaw = draft.yearsExperience.trim();
    const yearsExperience = yearsExperienceRaw.length > 0 ? Number(yearsExperienceRaw) : null;
    if (yearsExperienceRaw.length > 0 && (!Number.isInteger(yearsExperience ?? 0) || (yearsExperience ?? 0) < 0 || (yearsExperience ?? 0) > 80)) {
      setError(
        t(props.language, {
          es: "Años de experiencia: entero 0–80 o vacío.",
          en: "Years of experience: integer 0–80 or blank.",
          pt: "Anos de experiencia: inteiro 0–80 ou vazio."
        })
      );
      return;
    }

    setError("");
    setSuccess("");
    setProfessionalSaveLoading(true);

    try {
      await apiRequest<{ professional: AdminProfessionalOps }>(
        "/api/admin/professionals/" + professional.id,
        {
          method: "PATCH",
          body: JSON.stringify({
            bio: draft.bio.trim().length > 0 ? draft.bio.trim() : null,
            therapeuticApproach: draft.therapeuticApproach.trim().length > 0 ? draft.therapeuticApproach.trim() : null,
            yearsExperience,
            birthCountry: draft.birthCountry.trim().length > 0 ? draft.birthCountry.trim() : null
          })
        },
        props.token
      );

      setSuccess(
        t(props.language, {
          es: "Presentación clínica guardada (bio y textos que ve el paciente en el matching).",
          en: "Clinical presentation saved (bio and copy shown to patients in matching).",
          pt: "Apresentacao clinica salva (bio no matching do paciente)."
        })
      );
      await afterProfessionalPatchSuccess(professional.id);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("prof-ops-update", props.language, raw));
    } finally {
      setProfessionalSaveLoading(false);
    }
  };

  const saveProfessionalMediaSection = async (professional: AdminProfessionalOps) => {
    const draft = professionalEditDrafts[professional.id];
    if (!draft) {
      return;
    }

    const videoTrim = draft.videoUrl.trim();
    if (videoTrim.length > 0 && typeof URL !== "undefined" && !URL.canParse(videoTrim)) {
      setError(
        t(props.language, {
          es: "La URL del video tiene que ser una dirección completa (https://…).",
          en: "Video URL must be a full address (https://…).",
          pt: "A URL do video deve ser completa (https://…)."
        })
      );
      return;
    }

    setError("");
    setSuccess("");
    setProfessionalSaveLoading(true);

    try {
      await apiRequest<{ professional: AdminProfessionalOps }>(
        "/api/admin/professionals/" + professional.id,
        {
          method: "PATCH",
          body: JSON.stringify({
            photoUrl: draft.photoUrl.trim().length > 0 ? draft.photoUrl.trim() : null,
            videoUrl: videoTrim.length > 0 ? videoTrim : null
          })
        },
        props.token
      );

      setSuccess(
        t(props.language, {
          es: "Medios guardados (foto y video de presentación).",
          en: "Media saved (profile photo and intro video).",
          pt: "Midia salva (foto e video)."
        })
      );
      await afterProfessionalPatchSuccess(professional.id);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("prof-ops-update", props.language, raw));
    } finally {
      setProfessionalSaveLoading(false);
    }
  };

  const createSlot = async (professionalId: string) => {
    const draft = professionalSlotDrafts[professionalId] ?? createEmptySlotDraft();
    if (draft.slotDate.trim().length === 0 || draft.slotTime.trim().length === 0) {
      setError(
        t(props.language, {
          es: "Elegí fecha y hora de inicio para crear el turno.",
          en: "Pick a start date and time to create the slot.",
          pt: "Escolha data e hora de inicio para criar o horario."
        })
      );
      return;
    }

    const profileDraft = professionalEditDrafts[professionalId];
    const currentProfessional = professionals.find((item) => item.id === professionalId) ?? null;
    const fallbackDuration = currentProfessional?.sessionDurationMinutes ?? 60;
    const durationMinutes = Number(profileDraft?.sessionDurationMinutes?.trim() || fallbackDuration);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
      setError(
        t(props.language, {
          es: "La duración del turno debe ser un entero entre 15 y 240 minutos (revisá el perfil del profesional).",
          en: "Slot duration must be a whole number from 15 to 240 minutes (check the professional profile).",
          pt: "Duracao do horario: inteiro de 15 a 240 minutos."
        })
      );
      return;
    }

    const startsAt = parseLocalDateAndTime(draft.slotDate, draft.slotTime);
    if (!startsAt) {
      setError(
        t(props.language, {
          es: "La fecha u hora no tienen un formato válido. Usá el selector o el formato AAAA-MM-DD y HH:MM.",
          en: "Date or time format looks invalid. Use the picker or YYYY-MM-DD and HH:MM.",
          pt: "Data ou hora invalidas. Use o seletor ou AAAA-MM-DD e HH:MM."
        })
      );
      return;
    }
    const endsAt = new Date(startsAt.getTime() + (durationMinutes * 60_000));

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setError(
        t(props.language, {
          es: "Ese inicio de turno no es válido. Revisá día y hora.",
          en: "That slot start isn’t valid. Double-check day and time.",
          pt: "Esse inicio de horario nao e valido. Confira dia e hora."
        })
      );
      return;
    }
    if (endsAt <= startsAt) {
      setError(
        t(props.language, {
          es: "El fin del turno tiene que ser después del inicio (revisá la duración).",
          en: "The slot end must be after the start (check duration).",
          pt: "O fim do horario deve ser depois do inicio."
        })
      );
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
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("prof-ops-slot-create", props.language, raw));
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
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("prof-ops-slot-delete", props.language, raw));
    }
  };

  const saveProfessionalBooking = async (professionalId: string, bookingId: string) => {
    const draft = professionalBookingDrafts[bookingId];
    if (!draft) {
      setError(
        t(props.language, {
          es: "No encontramos el borrador de esa reserva en pantalla. Cerrá el detalle y volvé a abrirlo.",
          en: "We couldn’t find that booking draft on screen. Close the detail and open it again.",
          pt: "Nao encontramos o rascunho dessa reserva. Feche e abra de novo."
        })
      );
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
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("prof-ops-session-update", props.language, raw));
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
              placeholder="Buscar psicólogo por nombre o email"
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
          <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            {t(props.language, {
              es: "Para listar todos los perfiles usá * en el buscador. Las altas pendientes de aprobación se revisan en el Dashboard (debajo de «Resumen del mes»).",
              en: "Use * in the search field to list all profiles. Pending sign-ups are reviewed on the Dashboard (under Month at a glance).",
              pt: "Use * na busca para listar todos os perfis. Cadastros pendentes ficam no Dashboard (abaixo de «Resumo do mes»)."
            })}
          </p>
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
                  setEditingProfileSection(null);
                }}
              >
                <div className="patient-result-main">
                  <strong>{professional.fullName}</strong>
                  <span>
                    {professional.email} · {professional.visible ? "visible" : "oculto"} ·{" "}
                    {professional.registrationApproval === "PENDING"
                      ? t(props.language, { es: "alta pendiente", en: "approval pending", pt: "cadastro pendente" })
                      : professional.registrationApproval === "REJECTED"
                        ? t(props.language, { es: "alta rechazada", en: "registration rejected", pt: "cadastro rejeitado" })
                        : t(props.language, { es: "alta aprobada", en: "approved", pt: "cadastro aprovado" })}{" "}
                    · slots {professional.slots.length}
                  </span>
                </div>
                <div className="patient-result-actions">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedProfessionalId(professional.id);
                      setEditingProfileSection(null);
                      setIsProfessionalEditModalOpen(true);
                    }}
                  >
                    {t(props.language, {
                      es: "Horarios y sesiones",
                      en: "Slots & sessions",
                      pt: "Horarios e sessoes"
                    })}
                  </button>
                </div>
              </article>
            ))}
            </div>
          </section>

        {selectedProfessional && selectedProfessionalDraft ? (
          <section className="patient-inline-panel record-panel prof-ops-detail">
            <div className="record-badge">
              {t(props.language, { es: "Psicólogo seleccionado", en: "Selected psychologist", pt: "Psicologo selecionado" })}
            </div>
            <div className="patient-inline-head">
              <h3>{selectedProfessional.fullName}</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingProfileSection(null);
                  setIsProfessionalEditModalOpen(true);
                }}
              >
                {t(props.language, {
                  es: "Horarios y sesiones",
                  en: "Slots & sessions",
                  pt: "Horarios e sessoes"
                })}
              </button>
            </div>
            <p className="muted prof-ops-detail-lead">
              {t(props.language, {
                es: "Editá por sección y guardá. Es el mismo perfil que ve el paciente en el matching (tras recargar la página del portal).",
                en: "Edit by section and save. Same profile patients see in matching (after they refresh the portal).",
                pt: "Edite por secao e salve. Mesmo perfil do matching (apos atualizar o portal)."
              })}
            </p>

            <div className="prof-ops-profile-section">
              <div className="prof-ops-profile-section__head">
                <div>
                  <h4 className="prof-ops-profile-section__title">
                    {t(props.language, {
                      es: "1 · Cuenta y datos en tarjeta",
                      en: "1 · Account & card display",
                      pt: "1 · Conta e dados do card"
                    })}
                  </h4>
                  <p className="muted prof-ops-profile-section__hint">
                    {t(props.language, {
                      es: "Nombre público, email, visibilidad, cancelación, precio y cifras opcionales del listado.",
                      en: "Public name, email, visibility, cancellation, price, optional listing stats.",
                      pt: "Nome publico, email, visibilidade, precos e numeros do listado."
                    })}
                  </p>
                </div>
                {editingProfileSection !== "account" ? (
                  <button type="button" className="ghost" onClick={() => beginProfileSectionEdit(selectedProfessional, "account")}>
                    {t(props.language, { es: "Editar", en: "Edit", pt: "Editar" })}
                  </button>
                ) : null}
              </div>
              {editingProfileSection === "account" ? (
                <>
                  <div className="grid-form">
                    <label>
                      {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
                      <input
                        value={selectedProfessionalDraft.fullName}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              fullName: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        autoComplete="off"
                        value={selectedProfessionalDraft.email}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              email: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Perfil visible", en: "Profile visible", pt: "Perfil visivel" })}
                      <select
                        value={selectedProfessionalDraft.visible ? "true" : "false"}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              visible: event.target.value === "true"
                            }
                          }))
                        }
                      >
                        <option value="true">{t(props.language, { es: "Sí", en: "Yes", pt: "Sim" })}</option>
                        <option value="false">{t(props.language, { es: "No", en: "No", pt: "Nao" })}</option>
                      </select>
                    </label>
                    <label>
                      {t(props.language, { es: "Horas de cancelación", en: "Cancellation hours", pt: "Horas de cancelamento" })}
                      <input
                        type="number"
                        min={0}
                        max={168}
                        value={selectedProfessionalDraft.cancellationHours}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              cancellationHours: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Valor sesión (USD)", en: "Session price (USD)", pt: "Preco sessao (USD)" })}
                      <input
                        type="number"
                        min={0}
                        max={100000}
                        value={selectedProfessionalDraft.sessionPriceUsd}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              sessionPriceUsd: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Ranking (0–5)", en: "Rating (0–5)", pt: "Nota (0–5)" })}
                      <input
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        value={selectedProfessionalDraft.ratingAverage}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              ratingAverage: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Opiniones (card)", en: "Reviews (card)", pt: "Avaliacoes" })}
                      <input
                        type="number"
                        min={0}
                        max={100000}
                        value={selectedProfessionalDraft.reviewsCount}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              reviewsCount: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Duración sesión (min, card)", en: "Session length (min, card)", pt: "Duracao (min)" })}
                      <input
                        type="number"
                        min={15}
                        max={120}
                        value={selectedProfessionalDraft.sessionDurationMinutes}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              sessionDurationMinutes: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Pacientes activos (card)", en: "Active patients (card)", pt: "Pacientes ativos" })}
                      <input
                        type="number"
                        min={0}
                        max={100000}
                        value={selectedProfessionalDraft.activePatientsCount}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              activePatientsCount: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Sesiones (card)", en: "Sessions (card)", pt: "Sessoes" })}
                      <input
                        type="number"
                        min={0}
                        max={1000000}
                        value={selectedProfessionalDraft.sessionsCount}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              sessionsCount: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Completadas (card)", en: "Completed (card)", pt: "Concluidas" })}
                      <input
                        type="number"
                        min={0}
                        max={1000000}
                        value={selectedProfessionalDraft.completedSessionsCount}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              completedSessionsCount: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="button-row prof-ops-section-actions">
                    <button
                      className="primary"
                      type="button"
                      disabled={professionalSaveLoading}
                      onClick={() => void saveProfessionalAccountSection(selectedProfessional)}
                    >
                      {professionalSaveLoading
                        ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                        : t(props.language, { es: "Guardar sección", en: "Save section", pt: "Salvar secao" })}
                    </button>
                    <button type="button" onClick={() => cancelProfileSectionEdit(selectedProfessional)}>
                      {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                    </button>
                  </div>
                </>
              ) : (
                <dl className="prof-ops-read-grid">
                  <dt>{t(props.language, { es: "Nombre", en: "Name", pt: "Nome" })}</dt>
                  <dd>{selectedProfessional.fullName}</dd>
                  <dt>Email</dt>
                  <dd>{selectedProfessional.email}</dd>
                  <dt>{t(props.language, { es: "Visible", en: "Visible", pt: "Visivel" })}</dt>
                  <dd>{selectedProfessional.visible ? "Sí" : "No"}</dd>
                  <dt>{t(props.language, { es: "Horas cancelación", en: "Cancellation h.", pt: "Horas cancel." })}</dt>
                  <dd>{selectedProfessional.cancellationHours}</dd>
                  <dt>{t(props.language, { es: "Slots", en: "Slots", pt: "Horarios" })}</dt>
                  <dd>{selectedProfessional.slots.length}</dd>
                  <dt>{t(props.language, { es: "Sesiones confirmadas", en: "Confirmed sessions", pt: "Sessoes confirmadas" })}</dt>
                  <dd>{confirmedSessionsCount}</dd>
                  <dt>{t(props.language, { es: "USD sesión", en: "Session USD", pt: "USD" })}</dt>
                  <dd>{selectedProfessional.sessionPriceUsd ?? "—"}</dd>
                  <dt>{t(props.language, { es: "Ranking / opiniones", en: "Rating / reviews", pt: "Nota / opinioes" })}</dt>
                  <dd>
                    {(selectedProfessional.ratingAverage ?? "—") + " · " + (selectedProfessional.reviewsCount ?? 0)}
                  </dd>
                  <dt>{t(props.language, { es: "Duración (card)", en: "Duration (card)", pt: "Duracao" })}</dt>
                  <dd>{selectedProfessional.sessionDurationMinutes ?? "—"}</dd>
                  <dt>{t(props.language, { es: "Pacientes / sesiones / hechas", en: "Patients / sessions / done", pt: "Pacientes / sessoes" })}</dt>
                  <dd>
                    {(selectedProfessional.activePatientsCount ?? "—")
                      + " · "
                      + (selectedProfessional.sessionsCount ?? "—")
                      + " · "
                      + (selectedProfessional.completedSessionsCount ?? "—")}
                  </dd>
                </dl>
              )}
            </div>

            <div className="prof-ops-profile-section">
              <div className="prof-ops-profile-section__head">
                <div>
                  <h4 className="prof-ops-profile-section__title">
                    {t(props.language, {
                      es: "2 · Presentación (matching del paciente)",
                      en: "2 · Presentation (patient matching)",
                      pt: "2 · Apresentacao (matching)"
                    })}
                  </h4>
                  <p className="muted prof-ops-profile-section__hint">
                    {t(props.language, {
                      es: "Bio y textos que el paciente lee al elegir profesional.",
                      en: "Bio and copy patients read when choosing a therapist.",
                      pt: "Bio e textos na escolha do terapeuta."
                    })}
                  </p>
                </div>
                {editingProfileSection !== "presentation" ? (
                  <button type="button" className="ghost" onClick={() => beginProfileSectionEdit(selectedProfessional, "presentation")}>
                    {t(props.language, { es: "Editar", en: "Edit", pt: "Editar" })}
                  </button>
                ) : null}
              </div>
              {editingProfileSection === "presentation" ? (
                <>
                  <div className="grid-form">
                    <label>
                      {t(props.language, { es: "Enfoque terapéutico", en: "Therapeutic approach", pt: "Abordagem" })}
                      <input
                        value={selectedProfessionalDraft.therapeuticApproach}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              therapeuticApproach: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "País de origen", en: "Birth country", pt: "Pais de origem" })}
                      <input
                        value={selectedProfessionalDraft.birthCountry}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              birthCountry: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Años de experiencia", en: "Years of experience", pt: "Anos de experiencia" })}
                      <input
                        type="number"
                        min={0}
                        max={80}
                        value={selectedProfessionalDraft.yearsExperience}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              yearsExperience: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label className="prof-ops-bio-label">
                      Bio
                      <textarea
                        rows={5}
                        value={selectedProfessionalDraft.bio}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              bio: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="button-row prof-ops-section-actions">
                    <button
                      className="primary"
                      type="button"
                      disabled={professionalSaveLoading}
                      onClick={() => void saveProfessionalPresentationSection(selectedProfessional)}
                    >
                      {professionalSaveLoading
                        ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                        : t(props.language, { es: "Guardar sección", en: "Save section", pt: "Salvar secao" })}
                    </button>
                    <button type="button" onClick={() => cancelProfileSectionEdit(selectedProfessional)}>
                      {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                    </button>
                  </div>
                </>
              ) : (
                <dl className="prof-ops-read-stack">
                  <dt>{t(props.language, { es: "Enfoque", en: "Approach", pt: "Abordagem" })}</dt>
                  <dd>{selectedProfessional.therapeuticApproach?.trim() || "—"}</dd>
                  <dt>{t(props.language, { es: "País", en: "Country", pt: "Pais" })}</dt>
                  <dd>{selectedProfessional.birthCountry?.trim() || "—"}</dd>
                  <dt>{t(props.language, { es: "Años experiencia", en: "Years exp.", pt: "Anos" })}</dt>
                  <dd>
                    {selectedProfessional.yearsExperience === null || selectedProfessional.yearsExperience === undefined
                      ? "—"
                      : String(selectedProfessional.yearsExperience)}
                  </dd>
                  <dt>Bio</dt>
                  <dd className="prof-ops-read-bio">{selectedProfessional.bio?.trim() || "—"}</dd>
                </dl>
              )}
            </div>

            <div className="prof-ops-profile-section">
              <div className="prof-ops-profile-section__head">
                <div>
                  <h4 className="prof-ops-profile-section__title">
                    {t(props.language, {
                      es: "3 · Medios",
                      en: "3 · Media",
                      pt: "3 · Midia"
                    })}
                  </h4>
                  <p className="muted prof-ops-profile-section__hint">
                    {t(props.language, {
                      es: "Foto de perfil y video (mismos campos que en Configuración → usuarios).",
                      en: "Profile photo and intro video (same fields as Settings → users).",
                      pt: "Foto e video (mesmos campos de Configuracao → usuarios)."
                    })}
                  </p>
                </div>
                {editingProfileSection !== "media" ? (
                  <button type="button" className="ghost" onClick={() => beginProfileSectionEdit(selectedProfessional, "media")}>
                    {t(props.language, { es: "Editar", en: "Edit", pt: "Editar" })}
                  </button>
                ) : null}
              </div>
              {editingProfileSection === "media" ? (
                <>
                  <div className="prof-ops-media-edit">
                    <ProfessionalPhotoUrlField
                      language={props.language}
                      disabled={professionalSaveLoading}
                      value={selectedProfessionalDraft.photoUrl}
                      onChange={(next) =>
                        setProfessionalEditDrafts((current) => ({
                          ...current,
                          [selectedProfessional.id]: {
                            ...selectedProfessionalDraft,
                            photoUrl: next
                          }
                        }))
                      }
                    />
                    <label>
                      {t(props.language, {
                        es: "URL video presentación",
                        en: "Intro video URL",
                        pt: "URL do video"
                      })}
                      <input
                        type="url"
                        autoComplete="off"
                        placeholder="https://"
                        value={selectedProfessionalDraft.videoUrl}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: {
                              ...selectedProfessionalDraft,
                              videoUrl: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="button-row prof-ops-section-actions">
                    <button
                      className="primary"
                      type="button"
                      disabled={professionalSaveLoading}
                      onClick={() => void saveProfessionalMediaSection(selectedProfessional)}
                    >
                      {professionalSaveLoading
                        ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                        : t(props.language, { es: "Guardar sección", en: "Save section", pt: "Salvar secao" })}
                    </button>
                    <button type="button" onClick={() => cancelProfileSectionEdit(selectedProfessional)}>
                      {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                    </button>
                  </div>
                </>
              ) : (
                <div className="prof-ops-media-read">
                  <div>
                    <strong>{t(props.language, { es: "Foto", en: "Photo", pt: "Foto" })}</strong>
                    {selectedProfessional.photoUrl?.trim() ? (
                      <div className="prof-ops-media-thumb-wrap">
                        <img className="prof-ops-media-thumb" src={selectedProfessional.photoUrl} alt="" />
                      </div>
                    ) : (
                      <p className="muted">—</p>
                    )}
                  </div>
                  <div>
                    <strong>{t(props.language, { es: "Video", en: "Video", pt: "Video" })}</strong>
                    <p className="prof-ops-read-bio">{selectedProfessional.videoUrl?.trim() || "—"}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        <ProfessionalEditModal
          open={Boolean(selectedProfessional && isProfessionalEditModalOpen)}
          selectedProfessional={selectedProfessional}
          showConfirmedSessions={showConfirmedSessions}
          loadingSelectedBookings={loadingSelectedBookings}
          selectedBookings={selectedBookings}
          expandedConfirmedBookingId={expandedConfirmedBookingId}
          professionalSlotDrafts={professionalSlotDrafts}
          professionalBookingDrafts={professionalBookingDrafts}
          professionals={professionals}
          setProfessionalSlotDrafts={setProfessionalSlotDrafts}
          setProfessionalBookingDrafts={setProfessionalBookingDrafts}
          setExpandedConfirmedBookingId={setExpandedConfirmedBookingId}
          formatDate={(value) => formatDate(value, props.language)}
          isoToInputDateTime={isoToInputDateTime}
          t={(values) => t(props.language, values)}
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
