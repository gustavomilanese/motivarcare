import { FormEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function centsToUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
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
        throw new Error("El usuario no pertenece al portal profesional.");
      }

      props.onAuthSuccess(response.token, {
        id: response.user.id,
        fullName: response.user.fullName,
        email: response.user.email,
        role: "PROFESSIONAL",
        professionalProfileId: response.user.professionalProfileId
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-auth-shell">
      <section className="pro-auth-card">
        <span className="pro-chip">Portal profesional</span>
        <h1>Gestiona pacientes, agenda y sesiones</h1>
        <p>Accede con tu cuenta para administrar horarios, chat y seguimiento clinico.</p>

        <div className="pro-switch">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
            Ingresar
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>
            Crear cuenta
          </button>
        </div>

        <form className="pro-stack" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label>
              Nombre y apellido
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
          ) : null}

          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            Contrasena
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          {error ? <p className="pro-error">{error}</p> : null}

          <button className="pro-primary" type="submit" disabled={loading}>
            {loading ? "Validando..." : mode === "register" ? "Crear cuenta" : "Ingresar"}
          </button>
        </form>
      </section>
    </div>
  );
}

function DashboardPage(props: { token: string }) {
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
    return <section className="pro-card"><p>Cargando dashboard...</p></section>;
  }

  return (
    <div className="pro-grid-stack">
      <section className="pro-kpi-grid">
        <article className="pro-kpi-card">
          <span>Pacientes activos</span>
          <strong>{data.kpis.activePatients}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>Sesiones completadas</span>
          <strong>{data.kpis.sessionsCompleted}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>Sesiones agendadas</span>
          <strong>{data.kpis.sessionsScheduled}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>Horas disponibles</span>
          <strong>{data.kpis.hoursAvailable}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>Conversion</span>
          <strong>{data.kpis.conversionRate}%</strong>
        </article>
        <article className="pro-kpi-card">
          <span>A cobrar</span>
          <strong>{centsToUsd(data.kpis.pendingPayoutCents)}</strong>
        </article>
      </section>

      <section className="pro-card">
        <h2>Proximas sesiones</h2>
        {data.upcomingSessions.length === 0 ? (
          <p>Todavia no hay sesiones proximas.</p>
        ) : (
          <ul className="pro-list">
            {data.upcomingSessions.map((session) => (
              <li key={session.id}>
                <div>
                  <strong>{session.patientName}</strong>
                  <span>{formatDateTime(session.startsAt)}</span>
                </div>
                {session.joinUrl ? (
                  <a href={session.joinUrl} target="_blank" rel="noreferrer">
                    Entrar
                  </a>
                ) : (
                  <span className="pro-muted">Sin link</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SchedulePage(props: { token: string }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(50);

  const loadSlots = async () => {
    try {
      const response = await apiRequest<{ slots: AvailabilitySlot[] }>("/api/availability/me/slots", props.token);
      setSlots(response.slots);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar los horarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [props.token]);

  const handleCreateSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!date || !time) {
      setError("Completa fecha y hora.");
      return;
    }

    const startsAt = new Date(`${date}T${time}:00`);
    const endsAt = new Date(startsAt.getTime() + duration * 60000);

    try {
      await apiRequest<{ slot: AvailabilitySlot }>("/api/availability/slots", props.token, {
        method: "POST",
        body: JSON.stringify({
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          source: "professional-web"
        })
      });
      setDate("");
      setDuration(50);
      await loadSlots();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear el slot");
    }
  };

  const handleDelete = async (slotId: string) => {
    try {
      await apiRequest<{ message: string }>(`/api/availability/slots/${slotId}`, props.token, {
        method: "DELETE"
      });
      await loadSlots();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo borrar el slot");
    }
  };

  return (
    <div className="pro-grid-stack">
      <section className="pro-card">
        <h2>Cargar disponibilidad</h2>
        <form className="pro-grid-form" onSubmit={handleCreateSlot}>
          <label>
            Fecha
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>

          <label>
            Hora
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </label>

          <label>
            Duracion (min)
            <input
              type="number"
              min={30}
              max={120}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value || 50))}
            />
          </label>

          <button className="pro-primary" type="submit">Guardar slot</button>
        </form>
        {error ? <p className="pro-error">{error}</p> : null}
      </section>

      <section className="pro-card">
        <h2>Agenda disponible</h2>
        {loading ? <p>Cargando...</p> : null}
        {!loading && slots.length === 0 ? <p>No hay slots cargados.</p> : null}
        {!loading && slots.length > 0 ? (
          <ul className="pro-list">
            {slots.map((slot) => (
              <li key={slot.id}>
                <div>
                  <strong>{formatDateTime(slot.startsAt)}</strong>
                  <span>{slot.isBlocked ? "Bloqueado" : "Disponible"}</span>
                </div>
                <button type="button" onClick={() => handleDelete(slot.id)}>
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function PatientsPage(props: { token: string }) {
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

function ChatPage(props: { token: string; user: AuthUser }) {
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
              <time>{formatDateTime(message.createdAt)}</time>
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

function IncomePage(props: { token: string }) {
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
          <strong>{data ? centsToUsd(data.summary.totalCents) : "-"}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>Periodo actual</span>
          <strong>{data ? centsToUsd(data.summary.currentPeriodCents) : "-"}</strong>
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
                  <span>{formatDateTime(movement.startsAt)}</span>
                </div>
                <span>{centsToUsd(movement.amountCents)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function ProfilePage(props: { token: string; user: AuthUser }) {
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

function AdminPage(props: { token: string }) {
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

function VideoPage() {
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

function SettingsPage(props: { onLogout: () => void }) {
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

function Portal(props: { token: string; user: AuthUser; onLogout: () => void }) {
  const links: Array<{ to: PortalSection; label: string }> = [
    { to: "/", label: "Dashboard" },
    { to: "/horarios", label: "Horarios" },
    { to: "/video", label: "Videollamadas" },
    { to: "/pacientes", label: "Pacientes" },
    { to: "/chat", label: "Chat" },
    { to: "/ingresos", label: "Ingresos" },
    { to: "/admin", label: "Admin" },
    { to: "/perfil", label: "Perfil" },
    { to: "/ajustes", label: "Ajustes" }
  ];

  return (
    <div className="pro-layout">
      <header className="pro-header">
        <div>
          <h1>{props.user.fullName}</h1>
          <p>{props.user.email}</p>
        </div>
        <button className="pro-danger" type="button" onClick={props.onLogout}>
          Salir
        </button>
      </header>

      <nav className="pro-nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "active" : "")} end={link.to === "/"}>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<DashboardPage token={props.token} />} />
          <Route path="/horarios" element={<SchedulePage token={props.token} />} />
          <Route path="/video" element={<VideoPage />} />
          <Route path="/pacientes" element={<PatientsPage token={props.token} />} />
          <Route path="/chat" element={<ChatPage token={props.token} user={props.user} />} />
          <Route path="/ingresos" element={<IncomePage token={props.token} />} />
          <Route path="/admin" element={<AdminPage token={props.token} />} />
          <Route path="/perfil" element={<ProfilePage token={props.token} user={props.user} />} />
          <Route path="/ajustes" element={<SettingsPage onLogout={props.onLogout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  const [token, setToken] = useState<string>(() => window.localStorage.getItem(TOKEN_KEY) ?? "");
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

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
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return <Portal token={token} user={user} onLogout={handleLogout} />;
}
