import { FormEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  currencyOptionLabel,
  formatCurrencyCents,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";

type PortalSection =
  | "/"
  | "/horarios"
  | "/video"
  | "/pacientes"
  | "/chat"
  | "/ingresos"
  | "/admin"
  | "/perfil"
  | "/ajustes";

interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: "PROFESSIONAL";
  professionalProfileId: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
    professionalProfileId: string | null;
  };
}

interface ApiErrorPayload {
  error: string;
}

interface DashboardResponse {
  kpis: {
    activePatients: number;
    sessionsCompleted: number;
    sessionsScheduled: number;
    conversionRate: number;
    hoursAvailable: number;
    weeklySessions: number;
    pendingPayoutCents: number;
  };
  upcomingSessions: Array<{
    id: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    startsAt: string;
    endsAt: string;
    status: string;
    joinUrl: string | null;
  }>;
}

interface AvailabilitySlot {
  id: string;
  startsAt: string;
  endsAt: string;
  isBlocked: boolean;
  source: string;
}

interface PatientsResponse {
  patients: Array<{
    patientId: string;
    patientName: string;
    patientEmail: string;
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    daysSinceLastSession: number;
    status: "active" | "pause" | "cancelled" | "trial";
  }>;
}

interface EarningsResponse {
  summary: {
    totalCents: number;
    currentPeriodCents: number;
    totalSessions: number;
    currentPeriodSessions: number;
    sessionFeeCents: number;
  };
  movements: Array<{
    bookingId: string;
    patientName: string;
    startsAt: string;
    amountCents: number;
    status: string;
  }>;
}

interface ThreadSummary {
  id: string;
  patientId: string;
  professionalId: string;
  counterpartName: string;
  counterpartUserId: string;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderUserId: string;
  } | null;
  unreadCount: number;
  createdAt: string;
}

interface ThreadMessage {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderUserId: string;
  senderName: string;
  senderRole: "PATIENT" | "PROFESSIONAL" | "ADMIN";
}

interface ProfessionalProfile {
  id: string;
  fullName: string;
  email: string;
  visible: boolean;
  bio: string | null;
  therapeuticApproach: string | null;
  yearsExperience: number | null;
  photoUrl: string | null;
  videoUrl: string | null;
  cancellationHours: number;
}

interface AdminData {
  taxId?: string;
  payoutMethod?: string;
  payoutAccount?: string;
  legalAcceptedAt?: string | null;
  acceptedDocuments?: string[];
  notes?: string;
}

const API_BASE =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "therapy_pro_token";
const USER_KEY = "therapy_pro_user";
const LANGUAGE_KEY = "therapy_pro_language";
const CURRENCY_KEY = "therapy_pro_currency";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

async function apiRequest<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;

    try {
      const payload = (await response.json()) as ApiErrorPayload;
      if (payload?.error) {
        errorMessage = payload.error;
      }
    } catch {
      // ignore
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

function formatDateTime(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function formatDateHeading(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      weekday: "long",
      month: "short",
      day: "numeric"
    }
  });
}

function formatTime(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function formatMoneyCents(cents: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyCents({
    centsInUsd: cents,
    language,
    currency,
    maximumFractionDigits: 0
  });
}

function readStoredUser(): AuthUser | null {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!token || !rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser) as AuthUser;
    if (!user?.professionalProfileId || user.role !== "PROFESSIONAL") {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

function AuthScreen(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  onAuthSuccess: (token: string, user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("Dr. Emma Collins");
  const [email, setEmail] = useState("emma.collins@motivarte.com");
  const [password, setPassword] = useState("SecurePass123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload =
        mode === "register"
          ? {
              fullName: fullName.trim(),
              email: email.trim().toLowerCase(),
              password,
              role: "PROFESSIONAL"
            }
          : {
              email: email.trim().toLowerCase(),
              password
            };

      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const response = await apiRequest<AuthResponse>(path, undefined, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.user.role !== "PROFESSIONAL" || !response.user.professionalProfileId) {
        throw new Error(
          t(props.language, {
            es: "El usuario no pertenece al portal profesional.",
            en: "This user does not belong to the professional portal.",
            pt: "Este usuario nao pertence ao portal profissional."
          })
        );
      }

      props.onAuthSuccess(response.token, {
        id: response.user.id,
        fullName: response.user.fullName,
        email: response.user.email,
        role: "PROFESSIONAL",
        professionalProfileId: response.user.professionalProfileId
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo autenticar.",
              en: "Could not authenticate.",
              pt: "Nao foi possivel autenticar."
            })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-auth-shell">
      <section className="pro-auth-card">
        <span className="pro-chip">{t(props.language, { es: "Portal profesional", en: "Professional portal", pt: "Portal profissional" })}</span>
        <h1>{t(props.language, { es: "Gestiona pacientes, agenda y sesiones", en: "Manage patients, schedule, and sessions", pt: "Gerencie pacientes, agenda e sessoes" })}</h1>
        <p>
          {t(props.language, {
            es: "Accede con tu cuenta para administrar horarios, chat y seguimiento clinico.",
            en: "Sign in to manage schedule, chat, and clinical follow-up.",
            pt: "Acesse com sua conta para administrar horarios, chat e acompanhamento clinico."
          })}
        </p>

        <div className="locale-controls auth">
          <label>
            {t(props.language, { es: "Idioma", en: "Language", pt: "Idioma" })}
            <select value={props.language} onChange={(event) => props.onLanguageChange(event.target.value as AppLanguage)}>
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language === "es" ? "Espanol" : language === "en" ? "English" : "Portugues"}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(props.language, { es: "Moneda", en: "Currency", pt: "Moeda" })}
            <select value={props.currency} onChange={(event) => props.onCurrencyChange(event.target.value as SupportedCurrency)}>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currencyOptionLabel(currency, props.language)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="pro-switch">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
            {t(props.language, { es: "Ingresar", en: "Sign in", pt: "Entrar" })}
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>
            {t(props.language, { es: "Crear cuenta", en: "Create account", pt: "Criar conta" })}
          </button>
        </div>

        <form className="pro-stack" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label>
              {t(props.language, { es: "Nombre y apellido", en: "Full name", pt: "Nome completo" })}
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
          ) : null}

          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            {t(props.language, { es: "Contrasena", en: "Password", pt: "Senha" })}
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          {error ? <p className="pro-error">{error}</p> : null}

          <button className="pro-primary" type="submit" disabled={loading}>
            {loading
              ? t(props.language, { es: "Validando...", en: "Validating...", pt: "Validando..." })
              : mode === "register"
                ? t(props.language, { es: "Crear cuenta", en: "Create account", pt: "Criar conta" })
                : t(props.language, { es: "Ingresar", en: "Sign in", pt: "Entrar" })}
          </button>
        </form>
      </section>
    </div>
  );
}

function DashboardPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await apiRequest<DashboardResponse>("/api/professional/dashboard", props.token);
        if (active) {
          setData(response);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el dashboard");
        }
      }
    };

    load();
    const timer = window.setInterval(load, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [props.token]);

  if (error) {
    return <section className="pro-card"><p className="pro-error">{error}</p></section>;
  }

  if (!data) {
    return (
      <section className="pro-card">
        <p>{t(props.language, { es: "Cargando dashboard...", en: "Loading dashboard...", pt: "Carregando dashboard..." })}</p>
      </section>
    );
  }

  return (
    <div className="pro-grid-stack">
      <section className="pro-kpi-grid">
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })}</span>
          <strong>{data.kpis.activePatients}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Sesiones completadas", en: "Completed sessions", pt: "Sessoes concluidas" })}</span>
          <strong>{data.kpis.sessionsCompleted}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Sesiones agendadas", en: "Scheduled sessions", pt: "Sessoes agendadas" })}</span>
          <strong>{data.kpis.sessionsScheduled}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Horas disponibles", en: "Available hours", pt: "Horas disponiveis" })}</span>
          <strong>{data.kpis.hoursAvailable}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Conversion", en: "Conversion", pt: "Conversao" })}</span>
          <strong>{data.kpis.conversionRate}%</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "A cobrar", en: "To collect", pt: "A receber" })}</span>
          <strong>{formatMoneyCents(data.kpis.pendingPayoutCents, props.language, props.currency)}</strong>
        </article>
      </section>

      <section className="pro-card">
        <h2>{t(props.language, { es: "Proximas sesiones", en: "Upcoming sessions", pt: "Proximas sessoes" })}</h2>
        {data.upcomingSessions.length === 0 ? (
          <p>{t(props.language, { es: "Todavia no hay sesiones proximas.", en: "There are no upcoming sessions yet.", pt: "Ainda nao ha sessoes futuras." })}</p>
        ) : (
          <ul className="pro-list">
            {data.upcomingSessions.map((session) => (
              <li key={session.id}>
                <div>
                  <strong>{session.patientName}</strong>
                  <span>{formatDateTime(session.startsAt, props.language)}</span>
                </div>
                {session.joinUrl ? (
                  <a href={session.joinUrl} target="_blank" rel="noreferrer">
                    {t(props.language, { es: "Entrar", en: "Join", pt: "Entrar" })}
                  </a>
                ) : (
                  <span className="pro-muted">{t(props.language, { es: "Sin link", en: "No link", pt: "Sem link" })}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SchedulePage(props: { token: string; language: AppLanguage }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [agendaStartDate, setAgendaStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedWeekDays, setSelectedWeekDays] = useState<boolean[]>([false, true, true, true, true, true, false]);
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("17:00");
  const [duration, setDuration] = useState(50);
  const [breakMinutes, setBreakMinutes] = useState(10);
  const [repeatWeeks, setRepeatWeeks] = useState(2);

  const weekDays = [
    { index: 0, label: "Dom" },
    { index: 1, label: "Lun" },
    { index: 2, label: "Mar" },
    { index: 3, label: "Mie" },
    { index: 4, label: "Jue" },
    { index: 5, label: "Vie" },
    { index: 6, label: "Sab" }
  ] as const;

  const parseTimeToMinutes = (value: string): number => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const loadSlots = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const response = await apiRequest<{ slots: AvailabilitySlot[] }>("/api/availability/me/slots", props.token);
      setSlots(response.slots);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar los horarios");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadSlots(true);
  }, [props.token]);

  const plannedSlots = useMemo(() => {
    const result: Array<{ startsAt: string; endsAt: string; startMs: number }> = [];
    const baseDate = new Date(`${agendaStartDate}T00:00:00`);
    if (Number.isNaN(baseDate.getTime())) {
      return result;
    }

    const startMinutes = parseTimeToMinutes(rangeStart);
    const endMinutes = parseTimeToMinutes(rangeEnd);
    const cleanDuration = Math.max(30, Math.min(120, duration));
    const cleanBreak = Math.max(0, Math.min(30, breakMinutes));
    const cleanWeeks = Math.max(1, Math.min(8, repeatWeeks));

    if (startMinutes >= endMinutes) {
      return result;
    }

    for (let dayOffset = 0; dayOffset < cleanWeeks * 7; dayOffset += 1) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + dayOffset);

      if (!selectedWeekDays[currentDate.getDay()]) {
        continue;
      }

      let currentMinute = startMinutes;
      while (currentMinute + cleanDuration <= endMinutes) {
        const startsAt = new Date(currentDate);
        startsAt.setHours(Math.floor(currentMinute / 60), currentMinute % 60, 0, 0);
        const endsAt = new Date(startsAt.getTime() + cleanDuration * 60000);

        result.push({
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          startMs: startsAt.getTime()
        });

        currentMinute += cleanDuration + cleanBreak;
        if (result.length > 400) {
          return result;
        }
      }
    }

    return result;
  }, [agendaStartDate, breakMinutes, duration, rangeEnd, rangeStart, repeatWeeks, selectedWeekDays]);

  const existingStartTimes = useMemo(() => {
    return new Set(slots.map((slot) => new Date(slot.startsAt).getTime()));
  }, [slots]);

  const slotsToCreate = useMemo(() => {
    return plannedSlots.filter((slot) => !existingStartTimes.has(slot.startMs));
  }, [plannedSlots, existingStartTimes]);

  const duplicateCount = plannedSlots.length - slotsToCreate.length;
  const previewSlots = plannedSlots.slice(0, 14);

  const groupedSlots = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    const sorted = [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    for (const slot of sorted) {
      const key = slot.startsAt.slice(0, 10);
      const current = map.get(key) ?? [];
      current.push(slot);
      map.set(key, current);
    }

    return Array.from(map.entries()).map(([dateKey, items]) => ({
      dateKey,
      label: formatDateHeading(`${dateKey}T00:00:00`, props.language),
      items
    }));
  }, [slots]);

  const toggleWeekDay = (dayIndex: number) => {
    setSelectedWeekDays((current) => current.map((enabled, index) => (index === dayIndex ? !enabled : enabled)));
  };

  const applyWeekPreset = (preset: "workdays" | "weekend" | "all") => {
    if (preset === "workdays") {
      setSelectedWeekDays([false, true, true, true, true, true, false]);
      return;
    }

    if (preset === "weekend") {
      setSelectedWeekDays([true, false, false, false, false, false, true]);
      return;
    }

    setSelectedWeekDays([true, true, true, true, true, true, true]);
  };

  const applyTimePreset = (preset: "morning" | "afternoon" | "full") => {
    if (preset === "morning") {
      setRangeStart("09:00");
      setRangeEnd("13:00");
      setDuration(50);
      setBreakMinutes(10);
      return;
    }

    if (preset === "afternoon") {
      setRangeStart("14:00");
      setRangeEnd("18:00");
      setDuration(50);
      setBreakMinutes(10);
      return;
    }

    setRangeStart("09:00");
    setRangeEnd("17:00");
    setDuration(50);
    setBreakMinutes(10);
  };

  const resetBuilder = () => {
    setSelectedWeekDays([false, true, true, true, true, true, false]);
    setRangeStart("09:00");
    setRangeEnd("17:00");
    setDuration(50);
    setBreakMinutes(10);
    setRepeatWeeks(2);
    setMessage("");
    setError("");
  };

  const handlePublishSlots = async () => {
    if (slotsToCreate.length === 0) {
      setError("No hay nuevos horarios para publicar con esta configuracion.");
      return;
    }

    if (slotsToCreate.length > 180) {
      setError("La carga es muy grande. Reduce semanas o dias para publicar hasta 180 slots por vez.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const chunkSize = 10;
      for (let index = 0; index < slotsToCreate.length; index += chunkSize) {
        const chunk = slotsToCreate.slice(index, index + chunkSize);
        await Promise.all(
          chunk.map((slot) =>
            apiRequest<{ slot: AvailabilitySlot }>("/api/availability/slots", props.token, {
              method: "POST",
              body: JSON.stringify({
                startsAt: slot.startsAt,
                endsAt: slot.endsAt,
                source: "professional-web"
              })
            })
          )
        );
      }

      setMessage(`Disponibilidad publicada: ${slotsToCreate.length} horarios nuevos.`);
      await loadSlots();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo publicar disponibilidad");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (slotId: string) => {
    setDeletingSlotId(slotId);
    setError("");
    try {
      await apiRequest<{ message: string }>(`/api/availability/slots/${slotId}`, props.token, {
        method: "DELETE"
      });
      await loadSlots();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo borrar el slot");
    } finally {
      setDeletingSlotId("");
    }
  };

  return (
    <div className="pro-grid-stack">
      <section className="pro-card schedule-builder">
        <h2>Disponibilidad asistida</h2>
        <p>
          Configura tus bloques por semana y publica varios horarios de una sola vez.
        </p>

        <div className="schedule-preset-row">
          <span className="pro-muted">Dias rapidos:</span>
          <button type="button" onClick={() => applyWeekPreset("workdays")}>Lun a Vie</button>
          <button type="button" onClick={() => applyWeekPreset("weekend")}>Fin de semana</button>
          <button type="button" onClick={() => applyWeekPreset("all")}>Todos</button>
          <span className="pro-muted">Turnos:</span>
          <button type="button" onClick={() => applyTimePreset("morning")}>Manana</button>
          <button type="button" onClick={() => applyTimePreset("afternoon")}>Tarde</button>
          <button type="button" onClick={() => applyTimePreset("full")}>Jornada completa</button>
        </div>

        <div className="schedule-controls">
          <label>
            Inicio de agenda
            <input type="date" value={agendaStartDate} onChange={(event) => setAgendaStartDate(event.target.value)} />
          </label>

          <label>
            Repetir semanas
            <input
              type="number"
              min={1}
              max={8}
              value={repeatWeeks}
              onChange={(event) => setRepeatWeeks(Number(event.target.value || 2))}
            />
          </label>

          <label>
            Desde
            <input type="time" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
          </label>

          <label>
            Hasta
            <input type="time" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
          </label>

          <label>
            Duracion por sesion (min)
            <input
              type="number"
              min={30}
              max={120}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value || 50))}
            />
          </label>

          <label>
            Pausa entre sesiones (min)
            <input
              type="number"
              min={0}
              max={30}
              value={breakMinutes}
              onChange={(event) => setBreakMinutes(Number(event.target.value || 0))}
            />
          </label>
        </div>

        <div className="schedule-day-picker">
          {weekDays.map((day) => (
            <button
              key={day.index}
              className={selectedWeekDays[day.index] ? "day-chip active" : "day-chip"}
              type="button"
              onClick={() => toggleWeekDay(day.index)}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="schedule-actions">
          <button className="pro-primary" disabled={isSubmitting || slotsToCreate.length === 0} type="button" onClick={handlePublishSlots}>
            {isSubmitting ? "Publicando..." : `Publicar ${slotsToCreate.length} horarios`}
          </button>
          <button type="button" onClick={resetBuilder}>Reiniciar</button>
          <span className="pro-muted">
            Vista previa: {plannedSlots.length} horarios ({duplicateCount} ya existentes)
          </span>
        </div>

        {error ? <p className="pro-error">{error}</p> : null}
        {message ? <p className="pro-success">{message}</p> : null}

        {previewSlots.length > 0 ? (
          <div className="schedule-preview">
            <h3>Vista previa de horarios</h3>
            <ul>
              {previewSlots.map((slot) => {
                const isDuplicate = existingStartTimes.has(slot.startMs);
                return (
                  <li key={slot.startMs} className={isDuplicate ? "duplicate" : ""}>
                    <span>
                      {formatDateHeading(slot.startsAt, props.language)} · {formatTime(slot.startsAt, props.language)} - {formatTime(slot.endsAt, props.language)}
                    </span>
                    <em>{isDuplicate ? "Ya existe" : "Nuevo"}</em>
                  </li>
                );
              })}
            </ul>
            {plannedSlots.length > previewSlots.length ? (
              <p className="pro-muted">Mostrando {previewSlots.length} de {plannedSlots.length} horarios.</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="pro-card">
        <h2>Agenda disponible</h2>
        <p className="pro-muted">Ordenada por dia, con acciones rapidas para limpiar slots puntuales.</p>
        {loading ? <p>Cargando...</p> : null}
        {!loading && groupedSlots.length === 0 ? <p>No hay horarios cargados.</p> : null}
        {!loading && groupedSlots.length > 0 ? (
          <div className="schedule-group-list">
            {groupedSlots.map((group) => (
              <article className="schedule-day-card" key={group.dateKey}>
                <header>
                  <h3>{group.label}</h3>
                  <span>{group.items.length} horarios</span>
                </header>
                <ul className="pro-list schedule-slot-list">
                  {group.items.map((slot) => (
                    <li key={slot.id}>
                      <div>
                        <strong>{formatTime(slot.startsAt, props.language)} - {formatTime(slot.endsAt, props.language)}</strong>
                        <span>{slot.isBlocked ? "Bloqueado" : "Disponible"}</span>
                      </div>
                      <button disabled={deletingSlotId === slot.id} type="button" onClick={() => handleDelete(slot.id)}>
                        {deletingSlotId === slot.id ? "Quitando..." : "Quitar"}
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function PatientsPage(props: { token: string; language: AppLanguage }) {
  const [data, setData] = useState<PatientsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<PatientsResponse>("/api/professional/patients", props.token)
      .then((response) => {
        setData(response);
        setError("");
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar pacientes");
      });
  }, [props.token]);

  return (
    <section className="pro-card">
      <h2>Clientes / Pacientes</h2>
      {error ? <p className="pro-error">{error}</p> : null}
      {!data ? <p>Cargando...</p> : null}
      {data && data.patients.length === 0 ? <p>Todavia no hay pacientes asignados.</p> : null}
      {data && data.patients.length > 0 ? (
        <ul className="pro-list">
          {data.patients.map((patient) => (
            <li key={patient.patientId}>
              <div>
                <strong>{patient.patientName}</strong>
                <span>{patient.patientEmail}</span>
                <span>
                  Estado: <em>{patient.status}</em> · Sesiones: {patient.totalSessions} · Ultima hace {patient.daysSinceLastSession} dias
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ChatPage(props: { token: string; user: AuthUser; language: AppLanguage }) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null,
    [threads, selectedThreadId]
  );

  const loadThreads = async () => {
    try {
      const response = await apiRequest<{ threads: ThreadSummary[] }>("/api/chat/threads", props.token);
      setThreads(response.threads);
      if (!selectedThreadId && response.threads[0]) {
        setSelectedThreadId(response.threads[0].id);
      }
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cargar chat");
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const response = await apiRequest<{ messages: ThreadMessage[] }>(`/api/chat/threads/${threadId}/messages`, props.token);
      setMessages(response.messages);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar mensajes");
    }
  };

  useEffect(() => {
    loadThreads();
    const timer = window.setInterval(loadThreads, 3000);
    return () => window.clearInterval(timer);
  }, [props.token]);

  useEffect(() => {
    if (!selectedThread) {
      setMessages([]);
      return;
    }

    let active = true;

    const readAndLoad = async () => {
      if (!active) {
        return;
      }
      await apiRequest<{ markedAsRead: number }>(`/api/chat/threads/${selectedThread.id}/read`, props.token, {
        method: "POST"
      }).catch(() => undefined);
      await loadMessages(selectedThread.id);
    };

    readAndLoad();
    const timer = window.setInterval(() => {
      readAndLoad();
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [selectedThread?.id, props.token]);

  const handleSend = async () => {
    if (!draft.trim() || !selectedThread) {
      return;
    }

    try {
      await apiRequest<{ message: ThreadMessage }>(`/api/chat/threads/${selectedThread.id}/messages`, props.token, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() })
      });
      setDraft("");
      await loadMessages(selectedThread.id);
      await loadThreads();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo enviar el mensaje");
    }
  };

  return (
    <section className="pro-chat-shell">
      <aside className="pro-chat-sidebar">
        <header>
          <h2>Conversaciones</h2>
        </header>
        <div className="pro-chat-thread-list">
          {threads.length === 0 ? <p className="pro-muted">No hay conversaciones activas.</p> : null}
          {threads.map((thread) => (
            <button
              key={thread.id}
              className={thread.id === selectedThread?.id ? "pro-thread active" : "pro-thread"}
              type="button"
              onClick={() => setSelectedThreadId(thread.id)}
            >
              <div>
                <strong>{thread.counterpartName}</strong>
                <p>{thread.lastMessage?.body ?? "Sin mensajes"}</p>
              </div>
              {thread.unreadCount > 0 ? <span className="pro-badge">{thread.unreadCount}</span> : null}
            </button>
          ))}
        </div>
      </aside>

      <div className="pro-chat-main">
        <header className="pro-chat-main-header">
          <h3>{selectedThread?.counterpartName ?? "Selecciona un chat"}</h3>
        </header>

        <div className="pro-chat-messages">
          {messages.length === 0 ? <p className="pro-muted">Todavia no hay mensajes.</p> : null}
          {messages.map((message) => (
            <article
              className={message.senderUserId === props.user.id ? "pro-message outgoing" : "pro-message incoming"}
              key={message.id}
            >
              <p>{message.body}</p>
              <time>{formatDateTime(message.createdAt, props.language)}</time>
            </article>
          ))}
        </div>

        <footer className="pro-chat-composer">
          <textarea
            value={draft}
            placeholder="Escribe un mensaje"
            rows={2}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button className="pro-primary" type="button" onClick={handleSend}>
            Enviar
          </button>
        </footer>
      </div>

      {error ? <p className="pro-error chat-error">{error}</p> : null}
    </section>
  );
}

function IncomePage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<EarningsResponse>("/api/professional/earnings", props.token)
      .then((response) => {
        setData(response);
        setError("");
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar ingresos");
      });
  }, [props.token]);

  return (
    <div className="pro-grid-stack">
      <section className="pro-kpi-grid">
        <article className="pro-kpi-card">
          <span>Monto acumulado</span>
          <strong>{data ? formatMoneyCents(data.summary.totalCents, props.language, props.currency) : "-"}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>Periodo actual</span>
          <strong>{data ? formatMoneyCents(data.summary.currentPeriodCents, props.language, props.currency) : "-"}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>Sesiones pagas (mes)</span>
          <strong>{data?.summary.currentPeriodSessions ?? 0}</strong>
        </article>
      </section>

      <section className="pro-card">
        <h2>Detalle de sesiones</h2>
        {error ? <p className="pro-error">{error}</p> : null}
        {!data ? <p>Cargando...</p> : null}
        {data && data.movements.length === 0 ? <p>Sin movimientos en el periodo actual.</p> : null}
        {data && data.movements.length > 0 ? (
          <ul className="pro-list">
            {data.movements.map((movement) => (
              <li key={movement.bookingId}>
                <div>
                  <strong>{movement.patientName}</strong>
                  <span>{formatDateTime(movement.startsAt, props.language)}</span>
                </div>
                <span>{formatMoneyCents(movement.amountCents, props.language, props.currency)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function ProfilePage(props: { token: string; user: AuthUser; language: AppLanguage }) {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadProfile = async () => {
    try {
      const response = await apiRequest<{ role: string; profile: ProfessionalProfile }>("/api/profiles/me", props.token);
      setProfile(response.profile);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cargar perfil");
    }
  };

  useEffect(() => {
    loadProfile();
  }, [props.token]);

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    try {
      await apiRequest<{ message: string }>(`/api/profiles/professional/${profile.id}/public-profile`, props.token, {
        method: "PATCH",
        body: JSON.stringify({
          visible: profile.visible,
          bio: profile.bio,
          therapeuticApproach: profile.therapeuticApproach,
          yearsExperience: profile.yearsExperience,
          photoUrl: profile.photoUrl,
          videoUrl: profile.videoUrl,
          cancellationHours: profile.cancellationHours
        })
      });
      setMessage("Perfil actualizado.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar perfil");
    }
  };

  return (
    <section className="pro-card">
      <h2>Perfil publico</h2>
      {error ? <p className="pro-error">{error}</p> : null}
      {!profile ? <p>Cargando...</p> : null}
      {profile ? (
        <div className="pro-stack">
          <label>
            Nombre
            <input value={props.user.fullName} disabled />
          </label>

          <label className="pro-inline">
            <input
              type="checkbox"
              checked={profile.visible}
              onChange={(event) => setProfile((current) => (current ? { ...current, visible: event.target.checked } : current))}
            />
            Perfil visible
          </label>

          <label>
            Biografia
            <textarea
              rows={3}
              value={profile.bio ?? ""}
              onChange={(event) => setProfile((current) => (current ? { ...current, bio: event.target.value } : current))}
            />
          </label>

          <label>
            Enfoque terapeutico
            <input
              value={profile.therapeuticApproach ?? ""}
              onChange={(event) =>
                setProfile((current) => (current ? { ...current, therapeuticApproach: event.target.value } : current))
              }
            />
          </label>

          <label>
            Anos de experiencia
            <input
              type="number"
              min={0}
              max={80}
              value={profile.yearsExperience ?? 0}
              onChange={(event) =>
                setProfile((current) =>
                  current
                    ? {
                        ...current,
                        yearsExperience: Number(event.target.value || 0)
                      }
                    : current
                )
              }
            />
          </label>

          <label>
            URL foto
            <input
              value={profile.photoUrl ?? ""}
              onChange={(event) => setProfile((current) => (current ? { ...current, photoUrl: event.target.value } : current))}
            />
          </label>

          <label>
            URL video presentacion
            <input
              value={profile.videoUrl ?? ""}
              onChange={(event) => setProfile((current) => (current ? { ...current, videoUrl: event.target.value } : current))}
            />
          </label>

          <label>
            Politica de cancelacion (horas)
            <input
              type="number"
              min={0}
              max={168}
              value={profile.cancellationHours}
              onChange={(event) =>
                setProfile((current) =>
                  current
                    ? {
                        ...current,
                        cancellationHours: Number(event.target.value || 24)
                      }
                    : current
                )
              }
            />
          </label>

          <button className="pro-primary" type="button" onClick={handleSave}>Guardar perfil</button>
          {message ? <p className="pro-success">{message}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function AdminPage(props: { token: string; language: AppLanguage }) {
  const [form, setForm] = useState<AdminData>({
    taxId: "",
    payoutMethod: "stripe",
    payoutAccount: "",
    legalAcceptedAt: null,
    acceptedDocuments: ["contrato", "terminos", "consentimientos"],
    notes: ""
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiRequest<{ data: AdminData }>("/api/professional/admin", props.token)
      .then((response) => {
        setForm((current) => ({
          ...current,
          ...response.data,
          acceptedDocuments: response.data.acceptedDocuments ?? []
        }));
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "No se pudo cargar la solapa administrativa");
      });
  }, [props.token]);

  const handleSave = async () => {
    try {
      await apiRequest<{ message: string }>("/api/professional/admin", props.token, {
        method: "PUT",
        body: JSON.stringify(form)
      });
      setMessage("Datos administrativos guardados.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar");
    }
  };

  return (
    <section className="pro-card">
      <h2>Solapa administrativa</h2>
      <div className="pro-grid-form">
        <label>
          Datos fiscales (Tax ID)
          <input value={form.taxId ?? ""} onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))} />
        </label>

        <label>
          Metodo de cobro
          <input
            value={form.payoutMethod ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, payoutMethod: event.target.value }))}
          />
        </label>

        <label>
          Cuenta de cobro
          <input
            value={form.payoutAccount ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, payoutAccount: event.target.value }))}
          />
        </label>

        <label>
          Notas internas
          <textarea rows={3} value={form.notes ?? ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>
      </div>

      <button className="pro-primary" type="button" onClick={handleSave}>Guardar</button>
      {error ? <p className="pro-error">{error}</p> : null}
      {message ? <p className="pro-success">{message}</p> : null}
    </section>
  );
}

function VideoPage(props: { language: AppLanguage }) {
  return (
    <section className="pro-card">
      <h2>Videollamadas</h2>
      <p>Las sesiones tienen link unico por reserva. Se accede desde agenda o desde dashboard.</p>
      <p>
        Proximo paso de producto: integrar Daily/Twilio con creacion de salas y grabacion opcional solo con consentimiento.
      </p>
    </section>
  );
}

function SettingsPage(props: { onLogout: () => void; language: AppLanguage }) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  return (
    <section className="pro-card">
      <h2>Ajustes generales</h2>
      <label className="pro-inline">
        <input type="checkbox" checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)} />
        Notificaciones por email
      </label>
      <label className="pro-inline">
        <input type="checkbox" checked={securityAlerts} onChange={(event) => setSecurityAlerts(event.target.checked)} />
        Alertas de seguridad
      </label>

      <button className="pro-danger" type="button" onClick={props.onLogout}>
        Cerrar sesion
      </button>
    </section>
  );
}

function Portal(props: {
  token: string;
  user: AuthUser;
  onLogout: () => void;
  language: AppLanguage;
  currency: SupportedCurrency;
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
}) {
  const links: Array<{ to: PortalSection; label: string }> = [
    { to: "/", label: "Dashboard" },
    { to: "/horarios", label: t(props.language, { es: "Horarios", en: "Schedule", pt: "Horarios" }) },
    { to: "/video", label: t(props.language, { es: "Videollamadas", en: "Video calls", pt: "Videochamadas" }) },
    { to: "/pacientes", label: t(props.language, { es: "Pacientes", en: "Patients", pt: "Pacientes" }) },
    { to: "/chat", label: "Chat" },
    { to: "/ingresos", label: t(props.language, { es: "Ingresos", en: "Earnings", pt: "Receitas" }) },
    { to: "/admin", label: "Admin" },
    { to: "/perfil", label: t(props.language, { es: "Perfil", en: "Profile", pt: "Perfil" }) },
    { to: "/ajustes", label: t(props.language, { es: "Ajustes", en: "Settings", pt: "Configuracoes" }) }
  ];

  return (
    <div className="pro-shell">
      <aside className="pro-sidebar">
        <div className="pro-brand">
          <span className="pro-brand-mark">M</span>
          <div>
            <strong>Motivarte</strong>
            <p>{t(props.language, { es: "Portal profesional", en: "Professional portal", pt: "Portal profissional" })}</p>
          </div>
        </div>

        <nav className="pro-sidebar-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "pro-link active" : "pro-link")} end={link.to === "/"}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="pro-sidebar-foot">
          <p>{props.user.email}</p>
        </div>
      </aside>

      <div className="pro-main">
        <header className="pro-header">
          <div>
            <p className="pro-eyebrow">{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</p>
            <h1>
              {replaceTemplate(
                t(props.language, { es: "Hola, {name}", en: "Hi, {name}", pt: "Ola, {name}" }),
                { name: props.user.fullName }
              )}
            </h1>
            <p>
              {t(props.language, {
                es: "Gestiona agenda, pacientes y sesiones desde un unico panel.",
                en: "Manage schedule, patients, and sessions from a single panel.",
                pt: "Gerencie agenda, pacientes e sessoes em um unico painel."
              })}
            </p>
          </div>
          <div className="locale-controls">
            <label>
              {t(props.language, { es: "Idioma", en: "Language", pt: "Idioma" })}
              <select value={props.language} onChange={(event) => props.onLanguageChange(event.target.value as AppLanguage)}>
                {SUPPORTED_LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {language === "es" ? "Espanol" : language === "en" ? "English" : "Portugues"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t(props.language, { es: "Moneda", en: "Currency", pt: "Moeda" })}
              <select value={props.currency} onChange={(event) => props.onCurrencyChange(event.target.value as SupportedCurrency)}>
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currencyOptionLabel(currency, props.language)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="pro-danger" type="button" onClick={props.onLogout}>
            {t(props.language, { es: "Salir", en: "Sign out", pt: "Sair" })}
          </button>
        </header>

        <nav className="pro-mobile-nav" aria-label="Professional mobile navigation">
          {links.map((link) => (
            <NavLink
              key={`mobile-${link.to}`}
              to={link.to}
              className={({ isActive }) => (isActive ? "pro-mobile-link active" : "pro-mobile-link")}
              end={link.to === "/"}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <main className="pro-main-content">
          <Routes>
            <Route path="/" element={<DashboardPage token={props.token} language={props.language} currency={props.currency} />} />
            <Route path="/horarios" element={<SchedulePage token={props.token} language={props.language} />} />
            <Route path="/video" element={<VideoPage language={props.language} />} />
            <Route path="/pacientes" element={<PatientsPage token={props.token} language={props.language} />} />
            <Route path="/chat" element={<ChatPage token={props.token} user={props.user} language={props.language} />} />
            <Route path="/ingresos" element={<IncomePage token={props.token} language={props.language} currency={props.currency} />} />
            <Route path="/admin" element={<AdminPage token={props.token} language={props.language} />} />
            <Route path="/perfil" element={<ProfilePage token={props.token} user={props.user} language={props.language} />} />
            <Route path="/ajustes" element={<SettingsPage onLogout={props.onLogout} language={props.language} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export function App() {
  const [token, setToken] = useState<string>(() => window.localStorage.getItem(TOKEN_KEY) ?? "");
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(saved ?? "") ? (saved as AppLanguage) : "es";
  });
  const [currency, setCurrency] = useState<SupportedCurrency>(() => {
    const saved = window.localStorage.getItem(CURRENCY_KEY);
    return (SUPPORTED_CURRENCIES as readonly string[]).includes(saved ?? "") ? (saved as SupportedCurrency) : "USD";
  });

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(CURRENCY_KEY, currency);
  }, [currency]);

  const handleAuthSuccess = (nextToken: string, nextUser: AuthUser) => {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setToken("");
    setUser(null);
  };

  if (!token || !user) {
    return (
      <AuthScreen
        language={language}
        currency={currency}
        onLanguageChange={setLanguage}
        onCurrencyChange={setCurrency}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <Portal
      token={token}
      user={user}
      onLogout={handleLogout}
      language={language}
      currency={currency}
      onLanguageChange={setLanguage}
      onCurrencyChange={setCurrency}
    />
  );
}
