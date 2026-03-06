import { FormEvent, KeyboardEvent, SyntheticEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";

type RiskLevel = "low" | "medium" | "high";
type PackageId = "starter" | "growth" | "intensive";
type SenderRole = "patient" | "professional";
type ProfileTab = "data" | "cards" | "subscription" | "settings" | "support";

interface SessionUser {
  id: string;
  fullName: string;
  email: string;
}

interface AuthApiUser {
  id: string;
  fullName: string;
  email: string;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  patientProfileId: string | null;
  professionalProfileId: string | null;
}

interface AuthApiResponse {
  token: string;
  user: AuthApiUser;
}

interface IntakeQuestion {
  id: string;
  title: string;
  help: string;
  options?: string[];
  multiline?: boolean;
}

interface IntakeState {
  completed: boolean;
  completedAt: string;
  riskLevel: RiskLevel;
  riskBlocked: boolean;
  answers: Record<string, string>;
}

interface Professional {
  id: string;
  fullName: string;
  title: string;
  yearsExperience: number;
  compatibility: number;
  specialties: string[];
  languages: string[];
  approach: string;
  bio: string;
  rating: number;
  activePatients: number;
  introVideoUrl: string;
  slots: TimeSlot[];
}

interface TimeSlot {
  id: string;
  startsAt: string;
  endsAt: string;
}

interface Booking {
  id: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled";
  joinUrl: string;
  createdAt: string;
}

interface Message {
  id: string;
  professionalId: string;
  sender: SenderRole;
  text: string;
  read: boolean;
  createdAt: string;
}

interface SubscriptionState {
  packageId: PackageId | null;
  packageName: string;
  creditsTotal: number;
  creditsRemaining: number;
  purchasedAt?: string;
}

interface PaymentCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
}

interface PatientProfile {
  timezone: string;
  phone: string;
  emergencyContact: string;
  notificationsEmail: boolean;
  notificationsReminder: boolean;
  cards: PaymentCard[];
}

interface PatientAppState {
  session: SessionUser | null;
  authToken: string | null;
  intake: IntakeState | null;
  selectedProfessionalId: string;
  activeChatProfessionalId: string;
  bookedSlotIds: string[];
  bookings: Booking[];
  messages: Message[];
  subscription: SubscriptionState;
  profile: PatientProfile;
}

interface ApiChatThread {
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
}

interface ApiChatMessage {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderUserId: string;
  senderName: string;
  senderRole: "PATIENT" | "PROFESSIONAL" | "ADMIN";
}

interface PackagePlan {
  id: PackageId;
  name: string;
  credits: number;
  priceUsd: number;
  description: string;
}

const STORAGE_KEY = "therapy_patient_portal_v3";
const API_BASE =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://localhost:4000";

const intakeQuestions: IntakeQuestion[] = [
  {
    id: "mainReason",
    title: "1. Cual es tu motivo principal de consulta?",
    help: "Selecciona lo que mejor describa tu necesidad actual.",
    options: ["Ansiedad", "Depresion", "Vinculos y pareja", "Estres / burnout", "Otro"]
  },
  {
    id: "therapyGoal",
    title: "2. Que objetivo te gustaria lograr en terapia?",
    help: "Esta respuesta mejora la calidad del matching.",
    multiline: true
  },
  {
    id: "preferredApproach",
    title: "3. Enfoque terapeutico preferido",
    help: "Si no sabes, no hay problema.",
    options: ["TCC", "Psicodinamico", "Integrativo", "Mindfulness", "No estoy seguro"]
  },
  {
    id: "previousTherapy",
    title: "4. Experiencia previa en terapia",
    help: "Te ayuda a elegir ritmo y profesional.",
    options: ["No", "Si, menos de 3 meses", "Si, entre 3 y 12 meses", "Si, mas de 1 ano"]
  },
  {
    id: "emotionalState",
    title: "5. Como te sentis hoy?",
    help: "Estado emocional actual.",
    options: ["Estable", "Sobrepasado", "Triste", "Ansioso", "No lo se"]
  },
  {
    id: "availability",
    title: "6. Disponibilidad horaria preferida",
    help: "Para mostrarte los mejores slots disponibles.",
    options: ["Manana", "Tarde", "Noche", "Flexible"]
  },
  {
    id: "language",
    title: "7. Idioma para la sesion",
    help: "Se usa para el matching.",
    options: ["Ingles", "Espanol", "Bilingue"]
  },
  {
    id: "budget",
    title: "8. Presupuesto estimado",
    help: "Luego podras elegir paquetes de sesiones.",
    options: ["Paquete inicial", "Paquete intermedio", "Paquete intensivo", "No estoy seguro"]
  },
  {
    id: "supportNetwork",
    title: "9. Contas con red de apoyo (familia/amigos)?",
    help: "Contexto para continuidad terapeutica.",
    options: ["Apoyo fuerte", "Apoyo limitado", "Sin apoyo", "Prefiero no responder"]
  },
  {
    id: "safetyRisk",
    title: "10. En las ultimas 2 semanas tuviste ideas de autolesion?",
    help: "Pregunta de seguridad obligatoria antes de habilitar reservas.",
    options: ["No", "A veces", "Frecuentemente", "Prefiero no responder"]
  }
];

const packagePlans: PackagePlan[] = [
  {
    id: "starter",
    name: "Inicio - 4 sesiones",
    credits: 4,
    priceUsd: 360,
    description: "Ideal para una primera etapa de trabajo terapeutico."
  },
  {
    id: "growth",
    name: "Continuidad - 8 sesiones",
    credits: 8,
    priceUsd: 680,
    description: "Plan recomendado para trabajo mensual sostenido."
  },
  {
    id: "intensive",
    name: "Intensivo - 12 sesiones",
    credits: 12,
    priceUsd: 960,
    description: "Mayor frecuencia para procesos de alta demanda."
  }
];

function buildSlot(professionalId: string, dayOffset: number, hour: number, minute: number): TimeSlot {
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(hour, minute, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 50);

  return {
    id: `${professionalId}-${dayOffset}-${hour}-${minute}`,
    startsAt: start.toISOString(),
    endsAt: end.toISOString()
  };
}

function buildProfessionals(): Professional[] {
  return [
    {
      id: "pro-1",
      fullName: "Dr. Emma Collins",
      title: "Clinical Psychologist",
      yearsExperience: 11,
      compatibility: 92,
      specialties: ["Anxiety", "Stress", "Work burnout"],
      languages: ["English", "Spanish"],
      approach: "CBT + mindfulness protocols",
      bio: "Focus on anxiety regulation, cognitive reframing, and practical routines for sustained recovery.",
      rating: 4.9,
      activePatients: 46,
      introVideoUrl: "https://example.com/video/emma",
      slots: [
        buildSlot("pro-1", 1, 9, 0),
        buildSlot("pro-1", 1, 11, 0),
        buildSlot("pro-1", 2, 16, 30),
        buildSlot("pro-1", 3, 10, 0),
        buildSlot("pro-1", 4, 18, 0),
        buildSlot("pro-1", 5, 12, 30)
      ]
    },
    {
      id: "pro-2",
      fullName: "Dr. Michael Rivera",
      title: "Psychotherapist",
      yearsExperience: 14,
      compatibility: 88,
      specialties: ["Relationships", "Trauma", "Emotional regulation"],
      languages: ["English", "Spanish"],
      approach: "Integrative psychodynamic",
      bio: "Trabajo terapeutico de mediano y largo plazo con foco en vinculos y regulacion emocional.",
      rating: 4.8,
      activePatients: 39,
      introVideoUrl: "https://example.com/video/michael",
      slots: [
        buildSlot("pro-2", 1, 14, 0),
        buildSlot("pro-2", 2, 9, 30),
        buildSlot("pro-2", 3, 15, 30),
        buildSlot("pro-2", 4, 11, 0),
        buildSlot("pro-2", 6, 10, 30)
      ]
    },
    {
      id: "pro-3",
      fullName: "Dr. Sophia Nguyen",
      title: "Counseling Psychologist",
      yearsExperience: 9,
      compatibility: 85,
      specialties: ["Depression", "Life transitions", "Self esteem"],
      languages: ["English"],
      approach: "Evidence based integrative",
      bio: "Tratamiento breve con objetivos claros, seguimiento y avances medibles.",
      rating: 4.7,
      activePatients: 31,
      introVideoUrl: "https://example.com/video/sophia",
      slots: [
        buildSlot("pro-3", 1, 13, 30),
        buildSlot("pro-3", 2, 17, 0),
        buildSlot("pro-3", 3, 8, 30),
        buildSlot("pro-3", 5, 9, 0),
        buildSlot("pro-3", 6, 16, 0)
      ]
    }
  ];
}

const professionalsCatalog = buildProfessionals();
const professionalImageMap: Record<string, string> = {
  "pro-1": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80",
  "pro-2": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
  "pro-3": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80"
};

const heroImage = "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&w=1400&q=80";

const initialMessages: Message[] = [
  {
    id: "msg-1",
    professionalId: "pro-1",
    sender: "professional",
    text: "Hola! Si quieres, podemos comenzar con una llamada breve antes de tu primera sesion completa.",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString()
  }
];

const defaultProfile: PatientProfile = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  phone: "",
  emergencyContact: "",
  notificationsEmail: true,
  notificationsReminder: true,
  cards: []
};

const defaultState: PatientAppState = {
  session: null,
  authToken: null,
  intake: null,
  selectedProfessionalId: professionalsCatalog[0].id,
  activeChatProfessionalId: professionalsCatalog[0].id,
  bookedSlotIds: [],
  bookings: [],
  messages: initialMessages,
  subscription: {
    packageId: null,
    packageName: "Sin paquete activo",
    creditsTotal: 0,
    creditsRemaining: 0
  },
  profile: defaultProfile
};

function loadState(): PatientAppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw) as PatientAppState;
    return {
      ...defaultState,
      ...parsed,
      profile: {
        ...defaultProfile,
        ...parsed.profile,
        cards: parsed.profile?.cards ?? []
      }
    };
  } catch {
    return defaultState;
  }
}

function saveState(state: PatientAppState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        errorMessage = payload.error;
      }
    } catch {
      // ignore parse error
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

function formatDateTime(isoDate: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone
  }).format(new Date(isoDate));
}

function formatDateOnly(isoDate: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone
  }).format(new Date(isoDate));
}

function evaluateRisk(answers: Record<string, string>): { level: RiskLevel; blocked: boolean } {
  const safetyAnswer = answers.safetyRisk ?? "";

  if (safetyAnswer === "Frequently" || safetyAnswer === "Frecuentemente") {
    return { level: "high", blocked: true };
  }

  if (safetyAnswer === "Sometimes" || safetyAnswer === "A veces") {
    return { level: "medium", blocked: true };
  }

  return { level: "low", blocked: false };
}

function findProfessionalById(professionalId: string): Professional {
  return professionalsCatalog.find((item) => item.id === professionalId) ?? professionalsCatalog[0];
}

function getUnreadCount(messages: Message[], professionalId?: string): number {
  return messages.filter((message) => !message.read && (!professionalId || message.professionalId === professionalId)).length;
}

function getNextBooking(bookings: Booking[]): Booking | null {
  const now = Date.now();

  return (
    bookings
      .filter((booking) => booking.status === "confirmed" && new Date(booking.startsAt).getTime() > now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null
  );
}

function handleImageFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/prof-emma.svg";
}

function handleHeroFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/hero-therapy.svg";
}

function AuthScreen(props: { onLogin: (user: SessionUser, token: string | null) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("Alex Morgan");
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("SecurePass123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.includes("@") || password.length < 8) {
      setError("Usa un email valido y una contrasena de al menos 8 caracteres.");
      return;
    }

    if (mode === "register" && fullName.trim().length < 2) {
      setError("Completa tu nombre y apellido.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        mode === "register"
          ? {
              fullName: fullName.trim(),
              email: email.trim().toLowerCase(),
              password,
              role: "PATIENT",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
            }
          : {
              email: email.trim().toLowerCase(),
              password
            };

      const response = await apiRequest<AuthApiResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.user.role !== "PATIENT") {
        throw new Error("La cuenta no corresponde al portal paciente.");
      }

      props.onLogin(
        {
          id: response.user.id,
          fullName: response.user.fullName,
          email: response.user.email
        },
        response.token
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo autenticar contra la API. Revisa que el backend este encendido."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="visual-hero">
          <img src={heroImage} alt="Plataforma de terapia online" onError={handleHeroFallback} />
        </div>
        <span className="chip">Plataforma de terapia online</span>
        <h1>Terapia online, simple y profesional</h1>
        <p>
          Registrate o ingresa para completar el intake clinico, ver el matching recomendado y reservar sesiones.
        </p>

        <div className="auth-mode-switch">
          <button
            className={mode === "register" ? "active" : ""}
            type="button"
            onClick={() => setMode("register")}
          >
            Registrarme
          </button>
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            Ingresar
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label>
              Nombre completo
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

          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Validando..." : mode === "register" ? "Crear cuenta" : "Entrar"}
          </button>
        </form>
      </section>
    </div>
  );
}

function IntakeScreen(props: {
  user: SessionUser;
  onComplete: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const question of intakeQuestions) {
      seed[question.id] = "";
    }
    return seed;
  });

  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const missing = intakeQuestions.filter((question) => !answers[question.id]?.trim());
    if (missing.length > 0) {
      setError("Completa las 10 preguntas para continuar.");
      return;
    }

    setError("");
    props.onComplete(answers);
  };

  return (
    <div className="intake-shell">
      <section className="intake-card">
        <span className="chip">Cuestionario inicial obligatorio</span>
        <h1>{props.user.fullName}, completemos tu intake clinico</h1>
        <p>
          Este paso es obligatorio antes del matching. Incluye screening de riesgo para detectar situaciones urgentes.
        </p>

        <form className="stack" onSubmit={handleSubmit}>
          {intakeQuestions.map((question) => (
            <article className="question-card" key={question.id}>
              <h3>{question.title}</h3>
              <p>{question.help}</p>

              {question.multiline ? (
                <textarea
                  rows={3}
                  value={answers[question.id]}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value
                    }))
                  }
                />
              ) : (
                <select
                  value={answers[question.id]}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value
                    }))
                  }
                >
                  <option value="">Seleccionar</option>
                  {question.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </article>
          ))}

          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary" type="submit">
            Finalizar intake y ver profesionales recomendados
          </button>
        </form>
      </section>
    </div>
  );
}

function DashboardPage(props: {
  state: PatientAppState;
  onGoToBooking: (professionalId: string) => void;
  onGoToChat: (professionalId: string) => void;
}) {
  const nextBooking = getNextBooking(props.state.bookings);
  const unreadTotal = getUnreadCount(props.state.messages);
  const confirmedSessions = props.state.bookings.filter((booking) => booking.status === "confirmed").length;
  const topProfessionals = [...professionalsCatalog].sort((a, b) => b.compatibility - a.compatibility).slice(0, 3);
  const selectedProfessional = findProfessionalById(props.state.selectedProfessionalId);

  const journeySteps = [
    { key: "intake", label: "Intake completado", done: Boolean(props.state.intake?.completed) },
    { key: "match", label: "Profesional asignado", done: Boolean(props.state.selectedProfessionalId) },
    { key: "credits", label: "Paquete activo", done: props.state.subscription.creditsTotal > 0 },
    { key: "booking", label: "Reserva confirmada", done: confirmedSessions > 0 }
  ];

  const journeyDone = journeySteps.filter((step) => step.done).length;
  const journeyPercent = Math.round((journeyDone / journeySteps.length) * 100);

  return (
    <div className="page-stack">
      <section className="content-card dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="chip">Panel principal</span>
          <h2>Tu espacio personal de terapia, agenda y seguimiento</h2>
          <p>
            Todo tu proceso en un mismo lugar: reserva, pago, chat y acceso rapido a tus proximas sesiones.
          </p>
          <div className="button-row">
            <button className="primary" type="button" onClick={() => props.onGoToBooking(props.state.selectedProfessionalId)}>
              Reservar ahora
            </button>
            <button type="button" onClick={() => props.onGoToChat(props.state.activeChatProfessionalId)}>
              Abrir chat
            </button>
          </div>
        </div>

        <aside className="dashboard-progress-card">
          <span className="label">Progreso del proceso</span>
          <strong>{journeyPercent}%</strong>
          <ul className="journey-list">
            {journeySteps.map((step) => (
              <li className={step.done ? "done" : ""} key={step.key}>
                <span>{step.done ? "*" : "-"}</span>
                <span>{step.label}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="dashboard-metrics">
        <article className="metric-card">
          <span className="label">Sesiones confirmadas</span>
          <strong>{confirmedSessions}</strong>
          <p>
            {nextBooking
              ? `Proxima: ${formatDateTime(nextBooking.startsAt, props.state.profile.timezone)}`
              : "Todavia no tienes sesiones agendadas"}
          </p>
        </article>

        <article className="metric-card">
          <span className="label">Creditos disponibles</span>
          <strong>{props.state.subscription.creditsRemaining}</strong>
          <p>{props.state.subscription.packageName}</p>
        </article>

        <article className="metric-card">
          <span className="label">Mensajes sin leer</span>
          <strong>{unreadTotal}</strong>
          <p>Mensajeria 1 a 1 con tu profesional.</p>
        </article>

        <article className="metric-card">
          <span className="label">Profesional activo</span>
          <strong>{selectedProfessional.fullName.split(" ")[0]}</strong>
          <p>{selectedProfessional.compatibility}% compatibilidad</p>
        </article>
      </section>

      <section className="content-card quick-actions-card">
        <h2>Siguiente paso recomendado</h2>
        <div className="quick-actions-grid">
          <button className="quick-action" type="button" onClick={() => props.onGoToBooking(selectedProfessional.id)}>
            <strong>1. Reserva + pago</strong>
            <span>Flujo guiado paso a paso para confirmar sesion en minutos.</span>
          </button>
          <button className="quick-action" type="button" onClick={() => props.onGoToChat(selectedProfessional.id)}>
            <strong>2. Enviar mensaje</strong>
            <span>Confirma objetivos o dudas antes de la proxima sesion.</span>
          </button>
          <a className="quick-action" href={nextBooking?.joinUrl ?? "#"}>
            <strong>3. Entrar a sesion</strong>
            <span>{nextBooking ? "Acceso directo disponible para tu sesion confirmada." : "Se habilita al confirmar tu reserva."}</span>
          </a>
        </div>
      </section>

      <section className="content-card premium-banner">
        <div className="banner-copy">
          <span className="chip">Experiencia premium</span>
          <h2>Tu terapia online con acompanamiento continuo</h2>
          <p>
            Crea habitos de bienestar con una experiencia ordenada, simple y profesional.
          </p>
        </div>
        <img src={heroImage} alt="Paciente y profesional en sesion online" onError={handleHeroFallback} />
      </section>

      <section className="content-card">
        <h2>Proximas sesiones</h2>
        {props.state.bookings.length === 0 ? (
          <p>Aun no hay sesiones agendadas. Elige profesional y confirma tu primer horario.</p>
        ) : (
          <ul className="simple-list">
            {props.state.bookings.map((booking) => {
              const professional = findProfessionalById(booking.professionalId);
              return (
                <li key={booking.id}>
                  <div>
                    <strong>{professional.fullName}</strong>
                    <span>{formatDateTime(booking.startsAt, props.state.profile.timezone)}</span>
                  </div>
                  <a href={booking.joinUrl} target="_blank" rel="noreferrer">
                    Entrar a sesion
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="content-card">
        <h2>Profesionales recomendados</h2>
        <div className="card-grid">
          {topProfessionals.map((professional) => (
            <article className="mini-card" key={professional.id}>
              <img
                className="thumb"
                src={professionalImageMap[professional.id]}
                alt={`Perfil de ${professional.fullName}`}
                onError={handleImageFallback}
              />
              <h3>{professional.fullName}</h3>
              <p>{professional.title}</p>
              <p className="compatibility">{professional.compatibility}% compatibilidad</p>
              <div className="button-row">
                <button type="button" onClick={() => props.onGoToBooking(professional.id)}>
                  Ir a reservar
                </button>
                <button type="button" onClick={() => props.onGoToChat(professional.id)}>
                  Chat
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="content-card">
        <h2>Chat</h2>
        <p>Ultima actividad de tus conversaciones, con notificaciones y estado de lectura.</p>
        <div className="button-row">
          <button type="button" onClick={() => props.onGoToChat(props.state.activeChatProfessionalId)}>
            Abrir conversaciones
          </button>
        </div>
      </section>
    </div>
  );
}

function MatchingPage(props: {
  selectedProfessionalId: string;
  onSelectProfessional: (professionalId: string) => void;
  onReserve: (professionalId: string) => void;
  onChat: (professionalId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");

  const specialties = useMemo(() => {
    const set = new Set<string>();
    professionalsCatalog.forEach((professional) => {
      professional.specialties.forEach((value) => set.add(value));
    });
    return ["all", ...Array.from(set)];
  }, []);

  const languages = useMemo(() => {
    const set = new Set<string>();
    professionalsCatalog.forEach((professional) => {
      professional.languages.forEach((value) => set.add(value));
    });
    return ["all", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    return [...professionalsCatalog]
      .filter((professional) => {
        const matchesSearch =
          search.trim().length === 0
          || professional.fullName.toLowerCase().includes(search.toLowerCase())
          || professional.specialties.some((item) => item.toLowerCase().includes(search.toLowerCase()));

        const matchesSpecialty = specialtyFilter === "all" || professional.specialties.includes(specialtyFilter);
        const matchesLanguage = languageFilter === "all" || professional.languages.includes(languageFilter);

        return matchesSearch && matchesSpecialty && matchesLanguage;
      })
      .sort((a, b) => b.compatibility - a.compatibility);
  }, [languageFilter, search, specialtyFilter]);

  return (
    <div className="page-stack">
      <section className="content-card">
        <h2>Matching y profesionales recomendados</h2>
        <p>Los perfiles se ordenan por compatibilidad segun tu intake y preferencias.</p>

        <div className="filters">
          <input
            placeholder="Buscar por nombre o especialidad"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select value={specialtyFilter} onChange={(event) => setSpecialtyFilter(event.target.value)}>
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty === "all" ? "Todas las especialidades" : specialty}
              </option>
            ))}
          </select>

          <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
            {languages.map((language) => (
              <option key={language} value={language}>
                {language === "all" ? "Todos los idiomas" : language}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="card-grid">
        {filtered.map((professional) => {
          const isSelected = professional.id === props.selectedProfessionalId;

          return (
            <article className={`professional-card ${isSelected ? "selected" : ""}`} key={professional.id}>
              <img
                className="thumb"
                src={professionalImageMap[professional.id]}
                alt={`Perfil de ${professional.fullName}`}
                onError={handleImageFallback}
              />
              <header>
                <h3>{professional.fullName}</h3>
                <span>{professional.title}</span>
              </header>

              <p>{professional.bio}</p>

              <ul className="tag-list">
                {professional.specialties.map((specialty) => (
                  <li key={specialty}>{specialty}</li>
                ))}
              </ul>

              <div className="metric-row">
                <span>{professional.compatibility}% compatibilidad</span>
                <span>{professional.rating.toFixed(1)} valoracion</span>
                <span>{professional.yearsExperience} anos exp.</span>
              </div>

              <div className="profile-preview">
                <p><strong>Enfoque:</strong> {professional.approach}</p>
                <p><strong>Video presentacion:</strong> {professional.introVideoUrl}</p>
                <p><strong>Pacientes activos:</strong> {professional.activePatients}</p>
              </div>

              <div className="button-row">
                <button type="button" onClick={() => props.onSelectProfessional(professional.id)}>
                  {isSelected ? "Perfil seleccionado" : "Seleccionar perfil"}
                </button>
                <button type="button" onClick={() => props.onReserve(professional.id)}>
                  Reservar
                </button>
                <button type="button" onClick={() => props.onChat(professional.id)}>
                  Chat
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function BookingPage(props: {
  state: PatientAppState;
  onSelectProfessional: (professionalId: string) => void;
  onAddPackage: (plan: PackagePlan) => void;
  onConfirmBooking: (professionalId: string, slot: TimeSlot) => void;
}) {
  type BookingStep = 1 | 2 | 3 | 4;

  const [step, setStep] = useState<BookingStep>(1);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<PackageId>("growth");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [confirmedReservation, setConfirmedReservation] = useState<{
    professionalName: string;
    startsAt: string;
    timezone: string;
  } | null>(null);

  const professional = findProfessionalById(props.state.selectedProfessionalId);
  const availableSlots = professional.slots.filter((slot) => !props.state.bookedSlotIds.includes(slot.id));
  const selectedSlot = availableSlots.find((slot) => slot.id === selectedSlotId) ?? null;
  const hasCredits = props.state.subscription.creditsRemaining > 0;
  const selectedPlan = packagePlans.find((plan) => plan.id === selectedPlanId) ?? packagePlans[1];
  const previewStartsAt = confirmedReservation?.startsAt ?? selectedSlot?.startsAt ?? null;

  const stepConfig: Array<{ id: BookingStep; label: string }> = [
    { id: 1, label: "Profesional" },
    { id: 2, label: "Horario" },
    { id: 3, label: "Pago" },
    { id: 4, label: "Confirmar" }
  ];

  const canOpenStep = (targetStep: BookingStep): boolean => {
    if (targetStep <= 2) {
      return true;
    }

    if (targetStep === 3) {
      return Boolean(selectedSlot);
    }

    if (targetStep === 4) {
      return Boolean(confirmedReservation) || (Boolean(selectedSlot) && hasCredits);
    }

    return false;
  };

  const openStep = (targetStep: BookingStep) => {
    if (canOpenStep(targetStep)) {
      setStep(targetStep);
    }
  };

  const handlePurchase = () => {
    props.onAddPackage(selectedPlan);
    setPurchaseMessage(`Pago acreditado: ${selectedPlan.name}. Ya puedes confirmar la sesion.`);
  };

  const handleBooking = () => {
    if (!selectedSlot || !hasCredits) {
      return;
    }

    props.onConfirmBooking(professional.id, selectedSlot);
    setConfirmedReservation({
      professionalName: professional.fullName,
      startsAt: selectedSlot.startsAt,
      timezone: props.state.profile.timezone
    });
    setSelectedSlotId("");
    setStep(4);
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedSlotId("");
    setPurchaseMessage("");
    setConfirmedReservation(null);
    setSelectedPlanId("growth");
  };

  if (props.state.intake?.riskBlocked) {
    return (
      <section className="content-card danger">
        <h2>Reserva deshabilitada por screening de seguridad</h2>
        <p>
          El intake detecto un posible riesgo urgente. Por seguridad, la agenda queda bloqueada hasta triage manual.
        </p>
        <ul>
          <li>Llama o escribe al 988 para apoyo en crisis.</li>
          <li>Si hay peligro inmediato, llama al 911.</li>
          <li>Usa recursos de emergencia de tu zona.</li>
        </ul>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="content-card booking-wizard">
        <header className="wizard-header">
          <div>
            <h2>Reserva + pago guiado</h2>
            <p>Sigue este paso a paso para agendar y confirmar tu proxima sesion sin perderte.</p>
          </div>
          <span className="chip">Huso horario: {props.state.profile.timezone}</span>
        </header>

        <ol className="wizard-steps">
          {stepConfig.map((item) => {
            const completed = step > item.id || (item.id === 4 && Boolean(confirmedReservation));
            const active = step === item.id;
            const locked = !canOpenStep(item.id);

            return (
              <li key={item.id}>
                <button
                  className={`wizard-step ${active ? "active" : ""} ${completed ? "completed" : ""}`}
                  disabled={locked}
                  type="button"
                  onClick={() => openStep(item.id)}
                >
                  <span>Paso {item.id}</span>
                  <strong>{item.label}</strong>
                </button>
              </li>
            );
          })}
        </ol>

        {step === 1 ? (
          <article className="wizard-panel">
            <h3>1. Elige profesional</h3>
            <p>Selecciona el perfil con el que deseas continuar la proxima sesion.</p>

            <label>
              Profesional
              <select
                value={professional.id}
                onChange={(event) => {
                  props.onSelectProfessional(event.target.value);
                  setSelectedSlotId("");
                  setConfirmedReservation(null);
                }}
              >
                {professionalsCatalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName} - {item.compatibility}%
                  </option>
                ))}
              </select>
            </label>

            <div className="wizard-summary">
              <strong>{professional.fullName}</strong>
              <p>{professional.title}</p>
              <span>{professional.compatibility}% compatibilidad</span>
            </div>

            <div className="wizard-nav">
              <span />
              <button className="primary" type="button" onClick={() => setStep(2)}>
                Continuar
              </button>
            </div>
          </article>
        ) : null}

        {step === 2 ? (
          <article className="wizard-panel">
            <h3>2. Elige horario</h3>
            <p>Selecciona un slot disponible para {professional.fullName}.</p>

            {availableSlots.length === 0 ? (
              <p>No quedan slots disponibles para este profesional durante la semana actual.</p>
            ) : (
              <div className="slot-grid">
                {availableSlots.map((slot) => (
                  <button
                    className={selectedSlotId === slot.id ? "slot-button active" : "slot-button"}
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setConfirmedReservation(null);
                    }}
                  >
                    <span>{formatDateOnly(slot.startsAt, props.state.profile.timezone)}</span>
                    <strong>{formatDateTime(slot.startsAt, props.state.profile.timezone)}</strong>
                  </button>
                ))}
              </div>
            )}

            <div className="wizard-nav">
              <button type="button" onClick={() => setStep(1)}>
                Volver
              </button>
              <button className="primary" disabled={!selectedSlot} type="button" onClick={() => setStep(3)}>
                Continuar al pago
              </button>
            </div>
          </article>
        ) : null}

        {step === 3 ? (
          <article className="wizard-panel">
            <h3>3. Pago y creditos</h3>
            <p>Paquete actual: <strong>{props.state.subscription.packageName}</strong></p>
            <p>Creditos disponibles: <strong>{props.state.subscription.creditsRemaining}</strong></p>

            {!hasCredits ? (
              <>
                <p>Necesitas un paquete activo para confirmar la reserva.</p>
                <div className="card-grid">
                  {packagePlans.map((plan) => (
                    <label className={`mini-card selectable ${selectedPlanId === plan.id ? "selected" : ""}`} key={plan.id}>
                      <input
                        checked={selectedPlanId === plan.id}
                        type="radio"
                        name="package"
                        value={plan.id}
                        onChange={() => setSelectedPlanId(plan.id)}
                      />
                      <h3>{plan.name}</h3>
                      <p>{plan.description}</p>
                      <p>
                        <strong>${plan.priceUsd}</strong> / {plan.credits} creditos
                      </p>
                    </label>
                  ))}
                </div>

                <button className="primary" type="button" onClick={handlePurchase}>
                  Pagar con Stripe
                </button>
                {purchaseMessage ? <p className="success-text">{purchaseMessage}</p> : null}
              </>
            ) : (
              <div className="wizard-summary">
                <strong>Listo para confirmar</strong>
                <p>Tienes creditos suficientes. Se consumira 1 credito al confirmar la sesion.</p>
              </div>
            )}

            <div className="wizard-nav">
              <button type="button" onClick={() => setStep(2)}>
                Volver
              </button>
              <button className="primary" disabled={!hasCredits || !selectedSlot} type="button" onClick={() => setStep(4)}>
                Revisar confirmacion
              </button>
            </div>
          </article>
        ) : null}

        {step === 4 ? (
          <article className="wizard-panel">
            <h3>4. Confirmacion</h3>
            <p>Revisa el resumen final y confirma tu sesion.</p>

            <div className="wizard-summary">
              <p><strong>Profesional:</strong> {confirmedReservation?.professionalName ?? professional.fullName}</p>
              <p>
                <strong>Fecha y hora:</strong>{" "}
                {previewStartsAt ? formatDateTime(previewStartsAt, props.state.profile.timezone) : "Selecciona un horario"}
              </p>
              <p><strong>Zona horaria:</strong> {confirmedReservation?.timezone ?? props.state.profile.timezone}</p>
              <p><strong>Politica de cancelacion:</strong> cancelacion gratuita hasta 24 horas antes.</p>
            </div>

            {confirmedReservation ? (
              <div className="wizard-success-box">
                <p className="success-text">Sesion confirmada correctamente.</p>
                <p>Ya tienes la sesion en tu dashboard y acceso al link de videollamada.</p>
              </div>
            ) : null}

            <div className="wizard-nav">
              <button type="button" onClick={() => setStep(3)}>
                Volver
              </button>
              <button
                className="primary"
                disabled={!selectedSlot || !hasCredits || Boolean(confirmedReservation)}
                type="button"
                onClick={handleBooking}
              >
                Confirmar sesion
              </button>
            </div>

            {confirmedReservation ? (
              <div className="button-row">
                <button type="button" onClick={resetFlow}>Nueva reserva</button>
              </div>
            ) : null}
          </article>
        ) : null}
      </section>
    </div>
  );
}

function ChatPage(props: {
  state: PatientAppState;
  authToken: string | null;
  sessionUserId: string;
  onSetActiveProfessional: (professionalId: string) => void;
  onSendMessage: (professionalId: string, text: string) => void;
  onMarkRead: (professionalId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [apiThreads, setApiThreads] = useState<ApiChatThread[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiChatMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [apiError, setApiError] = useState("");

  const remoteMode = Boolean(props.authToken);

  const threadProfessional = findProfessionalById(props.state.activeChatProfessionalId);
  const threadMessages = props.state.messages
    .filter((message) => message.professionalId === threadProfessional.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const apiThreadByProfessional = useMemo(() => {
    const map = new Map<string, ApiChatThread>();
    for (const thread of apiThreads) {
      map.set(thread.professionalId, thread);
    }
    return map;
  }, [apiThreads]);

  useEffect(() => {
    if (remoteMode) {
      return;
    }

    const unread = getUnreadCount(props.state.messages, threadProfessional.id);
    if (unread > 0) {
      props.onMarkRead(threadProfessional.id);
    }
  }, [remoteMode, threadProfessional.id, props.onMarkRead, props.state.messages]);

  const loadThreads = async () => {
    if (!props.authToken) {
      return;
    }

    try {
      const response = await apiRequest<{ threads: ApiChatThread[] }>(
        "/api/chat/threads",
        {},
        props.authToken ?? undefined
      );
      setApiThreads(response.threads);
      setApiError("");
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : "No se pudo cargar el chat");
    }
  };

  const loadMessages = async (threadId: string) => {
    if (!props.authToken) {
      return;
    }

    try {
      const response = await apiRequest<{ messages: ApiChatMessage[] }>(
        `/api/chat/threads/${threadId}/messages`,
        {},
        props.authToken ?? undefined
      );
      setApiMessages(response.messages);
      setApiError("");
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : "No se pudieron cargar mensajes");
    }
  };

  const ensureThreadForProfessional = async (professionalId: string): Promise<string | null> => {
    if (!props.authToken) {
      return null;
    }

    try {
      const response = await apiRequest<{ threadId: string }>(
        `/api/chat/threads/by-professional/${professionalId}`,
        { method: "POST" },
        props.authToken ?? undefined
      );
      setActiveThreadId(response.threadId);
      return response.threadId;
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : "No se pudo abrir la conversacion");
      return null;
    }
  };

  useEffect(() => {
    if (!remoteMode || !props.authToken) {
      return;
    }

    loadThreads();
    const timer = window.setInterval(() => {
      loadThreads();
    }, 3500);

    return () => {
      window.clearInterval(timer);
    };
  }, [remoteMode, props.authToken]);

  useEffect(() => {
    if (!remoteMode || !props.authToken) {
      return;
    }

    let active = true;

    const run = async () => {
      const threadId = await ensureThreadForProfessional(props.state.activeChatProfessionalId);
      if (!threadId || !active) {
        return;
      }

      await loadMessages(threadId);
      await apiRequest<{ markedAsRead: number }>(
        `/api/chat/threads/${threadId}/read`,
        { method: "POST" },
        props.authToken ?? undefined
      ).catch(() => undefined);
    };

    run();

    return () => {
      active = false;
    };
  }, [remoteMode, props.authToken, props.state.activeChatProfessionalId]);

  useEffect(() => {
    if (!remoteMode || !props.authToken || !activeThreadId) {
      return;
    }

    const timer = window.setInterval(() => {
      loadMessages(activeThreadId);
    }, 2500);

    return () => {
      window.clearInterval(timer);
    };
  }, [remoteMode, props.authToken, activeThreadId]);

  const handleSelectProfessional = async (professionalId: string) => {
    props.onSetActiveProfessional(professionalId);

    if (!remoteMode || !props.authToken) {
      return;
    }

    const threadId = await ensureThreadForProfessional(professionalId);
    if (threadId) {
      await loadMessages(threadId);
      await loadThreads();
    }
  };

  const handleSend = async () => {
    if (!draft.trim()) {
      return;
    }

    if (remoteMode && props.authToken) {
      const threadId = activeThreadId || (await ensureThreadForProfessional(threadProfessional.id));
      if (!threadId) {
        return;
      }

      try {
        await apiRequest(
          `/api/chat/threads/${threadId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ body: draft.trim() })
          },
          props.authToken ?? undefined
        );
        setDraft("");
        await loadMessages(threadId);
        await loadThreads();
      } catch (requestError) {
        setApiError(requestError instanceof Error ? requestError.message : "No se pudo enviar el mensaje");
      }
      return;
    }

    props.onSendMessage(threadProfessional.id, draft.trim());
    setDraft("");
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="wa-shell">
      <aside className="wa-sidebar">
        <header className="wa-sidebar-header">
          <h2>Mensajes</h2>
        </header>

        <div className="wa-thread-list">
          {professionalsCatalog.map((professional) => {
            const remoteThread = apiThreadByProfessional.get(professional.id);
            const unread = remoteMode ? remoteThread?.unreadCount ?? 0 : getUnreadCount(props.state.messages, professional.id);
            const lastMessageText = remoteMode
              ? remoteThread?.lastMessage?.body ?? "Todavia no hay mensajes"
              : props.state.messages
                  .filter((message) => message.professionalId === professional.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.text
                ?? "Todavia no hay mensajes";

            return (
              <button
                className={professional.id === threadProfessional.id ? "wa-thread-item active" : "wa-thread-item"}
                key={professional.id}
                type="button"
                onClick={() => {
                  void handleSelectProfessional(professional.id);
                }}
              >
                <img
                  src={professionalImageMap[professional.id]}
                  alt={professional.fullName}
                  onError={handleImageFallback}
                />
                <div>
                  <strong>{professional.fullName}</strong>
                  <p>{lastMessageText}</p>
                </div>
                {unread > 0 ? <span className="badge">{unread}</span> : null}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="wa-main">
        <header className="wa-main-header">
          <div className="wa-main-profile">
            <img
              src={professionalImageMap[threadProfessional.id]}
              alt={threadProfessional.fullName}
              onError={handleImageFallback}
            />
            <div>
              <h3>{threadProfessional.fullName}</h3>
              <span>En linea</span>
            </div>
          </div>
        </header>

        <div className="wa-messages">
          {remoteMode && apiMessages.length === 0 ? (
            <p className="wa-empty">Todavia no hay mensajes en esta conversacion.</p>
          ) : null}

          {remoteMode
            ? apiMessages.map((message) => (
                <article
                  className={message.senderUserId === props.sessionUserId ? "wa-message outgoing" : "wa-message incoming"}
                  key={message.id}
                >
                  <p>{message.body}</p>
                  <time>{formatDateTime(message.createdAt, props.state.profile.timezone)}</time>
                </article>
              ))
            : null}

          {!remoteMode && threadMessages.length === 0 ? (
            <p className="wa-empty">Todavia no hay mensajes en esta conversacion.</p>
          ) : (
            !remoteMode ? threadMessages.map((message) => (
              <article
                className={message.sender === "patient" ? "wa-message outgoing" : "wa-message incoming"}
                key={message.id}
              >
                <p>{message.text}</p>
                <time>{formatDateTime(message.createdAt, props.state.profile.timezone)}</time>
              </article>
            )) : null
          )}
        </div>

        <footer className="wa-composer">
          <textarea
            placeholder="Escribe un mensaje"
            rows={2}
            value={draft}
            onKeyDown={handleComposerKeyDown}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button className="wa-send" type="button" onClick={handleSend}>
            Enviar
          </button>
        </footer>
      </section>
      {apiError ? <p className="error-text">{apiError}</p> : null}
    </div>
  );
}

function ProfilePage(props: {
  user: SessionUser;
  profile: PatientProfile;
  subscription: SubscriptionState;
  onUpdateProfile: (profile: PatientProfile) => void;
  onLogout: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localProfile, setLocalProfile] = useState<PatientProfile>(props.profile);
  const [cardBrand, setCardBrand] = useState("Visa");
  const [cardLast4, setCardLast4] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const validTabs: ProfileTab[] = ["data", "cards", "subscription", "settings", "support"];
  const tabParam = searchParams.get("tab");
  const tab: ProfileTab = validTabs.includes(tabParam as ProfileTab) ? (tabParam as ProfileTab) : "data";

  useEffect(() => {
    setLocalProfile(props.profile);
  }, [props.profile]);

  const goToTab = (next: ProfileTab) => {
    setSearchParams({ tab: next });
  };

  const saveProfile = () => {
    props.onUpdateProfile(localProfile);
  };

  const addCard = () => {
    if (cardLast4.length !== 4 || cardExpMonth.length === 0 || cardExpYear.length === 0) {
      return;
    }

    const nextCards = [
      ...localProfile.cards,
      {
        id: `card-${Date.now()}`,
        brand: cardBrand,
        last4: cardLast4,
        expMonth: cardExpMonth,
        expYear: cardExpYear
      }
    ];

    const updated = { ...localProfile, cards: nextCards };
    setLocalProfile(updated);
    props.onUpdateProfile(updated);

    setCardLast4("");
    setCardExpMonth("");
    setCardExpYear("");
  };

  return (
    <div className="profile-layout">
      <aside className="content-card">
        <h2>Menu de perfil</h2>
        <div className="stack">
          <button className={tab === "data" ? "menu-button active" : "menu-button"} type="button" onClick={() => goToTab("data")}>MIS DATOS</button>
          <button className={tab === "cards" ? "menu-button active" : "menu-button"} type="button" onClick={() => goToTab("cards")}>MIS TARJETAS</button>
          <button className={tab === "subscription" ? "menu-button active" : "menu-button"} type="button" onClick={() => goToTab("subscription")}>MI SUSCRIPCION</button>
          <button className={tab === "settings" ? "menu-button active" : "menu-button"} type="button" onClick={() => goToTab("settings")}>AJUSTES</button>
          <button className={tab === "support" ? "menu-button active" : "menu-button"} type="button" onClick={() => goToTab("support")}>SOPORTE</button>
          <button className="danger" type="button" onClick={props.onLogout}>SALIR</button>
        </div>
      </aside>

      <section className="content-card">
        {tab === "data" ? (
          <>
            <h2>Mis datos</h2>
            <label>
              Nombre completo
              <input value={props.user.fullName} disabled />
            </label>
            <label>
              Email
              <input value={props.user.email} disabled />
            </label>
            <label>
              Telefono
              <input
                value={localProfile.phone}
                onChange={(event) => setLocalProfile((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
            <label>
              Contacto de emergencia
              <input
                value={localProfile.emergencyContact}
                onChange={(event) =>
                  setLocalProfile((current) => ({
                    ...current,
                    emergencyContact: event.target.value
                  }))
                }
              />
            </label>
            <label>
              Zona horaria
              <input
                value={localProfile.timezone}
                onChange={(event) => setLocalProfile((current) => ({ ...current, timezone: event.target.value }))}
              />
            </label>
            <button className="primary" type="button" onClick={saveProfile}>
              Guardar perfil
            </button>
          </>
        ) : null}

        {tab === "cards" ? (
          <>
            <h2>Mis tarjetas</h2>
            {localProfile.cards.length === 0 ? <p>Todavia no hay tarjetas guardadas.</p> : null}
            <ul className="simple-list">
              {localProfile.cards.map((card) => (
                <li key={card.id}>
                  <div>
                    <strong>{card.brand} **** {card.last4}</strong>
                    <span>Vence {card.expMonth}/{card.expYear}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="card-grid">
              <label>
                Marca
                <select value={cardBrand} onChange={(event) => setCardBrand(event.target.value)}>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="Amex">Amex</option>
                </select>
              </label>
              <label>
                Ultimos 4 digitos
                <input value={cardLast4} onChange={(event) => setCardLast4(event.target.value.replace(/\D/g, "").slice(0, 4))} />
              </label>
              <label>
                Mes de vencimiento
                <input value={cardExpMonth} onChange={(event) => setCardExpMonth(event.target.value.replace(/\D/g, "").slice(0, 2))} />
              </label>
              <label>
                Ano de vencimiento
                <input value={cardExpYear} onChange={(event) => setCardExpYear(event.target.value.replace(/\D/g, "").slice(0, 4))} />
              </label>
            </div>
            <button className="primary" type="button" onClick={addCard}>
              Agregar tarjeta
            </button>
          </>
        ) : null}

        {tab === "subscription" ? (
          <>
            <h2>Mi suscripcion</h2>
            <p><strong>{props.subscription.packageName}</strong></p>
            <p>
              Creditos: {props.subscription.creditsRemaining} / {props.subscription.creditsTotal}
            </p>
            <p>
              Fecha de compra: {props.subscription.purchasedAt ? new Date(props.subscription.purchasedAt).toLocaleString() : "-"}
            </p>
            <p>Los paquetes se compran desde la pantalla de reservas.</p>
          </>
        ) : null}

        {tab === "settings" ? (
          <>
            <h2>Ajustes</h2>
            <label className="inline-toggle">
              <input
                checked={localProfile.notificationsEmail}
                type="checkbox"
                onChange={(event) =>
                  setLocalProfile((current) => ({
                    ...current,
                    notificationsEmail: event.target.checked
                  }))
                }
              />
              Notificaciones por email
            </label>
            <label className="inline-toggle">
              <input
                checked={localProfile.notificationsReminder}
                type="checkbox"
                onChange={(event) =>
                  setLocalProfile((current) => ({
                    ...current,
                    notificationsReminder: event.target.checked
                  }))
                }
              />
              Recordatorios de sesion
            </label>
            <button className="primary" type="button" onClick={saveProfile}>
              Guardar ajustes
            </button>
          </>
        ) : null}

        {tab === "support" ? (
          <>
            <h2>Soporte</h2>
            <p>Envianos tu consulta y el equipo operativo te responde a la brevedad.</p>
            <textarea
              rows={4}
              value={supportMessage}
              onChange={(event) => setSupportMessage(event.target.value)}
              placeholder="Describe tu consulta"
            />
            <button className="primary" type="button" onClick={() => setSupportMessage("Solicitud enviada.")}>
              Enviar solicitud
            </button>
            {supportMessage ? <p className="success-text">{supportMessage}</p> : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

function MainPortal(props: {
  state: PatientAppState;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleReserveFromAnywhere = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      selectedProfessionalId: professionalId
    }));
    navigate("/booking");
  };

  const handleChatFromAnywhere = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      activeChatProfessionalId: professionalId
    }));
    navigate("/chat");
  };

  const openProfileTabFromMenu = (tab: ProfileTab) => {
    setMenuOpen(false);
    navigate(`/profile?tab=${tab}`);
  };

  const addPackage = (plan: PackagePlan) => {
    props.onStateChange((current) => ({
      ...current,
      subscription: {
        packageId: plan.id,
        packageName: plan.name,
        creditsTotal: plan.credits,
        creditsRemaining: current.subscription.creditsRemaining + plan.credits,
        purchasedAt: new Date().toISOString()
      }
    }));
  };

  const confirmBooking = (professionalId: string, slot: TimeSlot) => {
    props.onStateChange((current) => {
      if (current.subscription.creditsRemaining <= 0) {
        return current;
      }

      const bookingId = `booking-${Date.now()}`;
      const newBooking: Booking = {
        id: bookingId,
        professionalId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "confirmed",
        joinUrl: `https://video.therapy.local/session/${bookingId}`,
        createdAt: new Date().toISOString()
      };

      return {
        ...current,
        bookings: [newBooking, ...current.bookings],
        bookedSlotIds: [...current.bookedSlotIds, slot.id],
        subscription: {
          ...current.subscription,
          creditsRemaining: current.subscription.creditsRemaining - 1
        }
      };
    });
  };

  const sendMessage = (professionalId: string, text: string) => {
    const messageId = `msg-${Date.now()}`;

    props.onStateChange((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: messageId,
          professionalId,
          sender: "patient",
          text,
          read: true,
          createdAt: new Date().toISOString()
        }
      ]
    }));

    window.setTimeout(() => {
      props.onStateChange((current) => {
        const professional = findProfessionalById(professionalId);
        return {
          ...current,
          messages: [
            ...current.messages,
            {
              id: `msg-${Date.now() + 1}`,
              professionalId,
              sender: "professional",
              text: `${professional.fullName}: Gracias por tu mensaje. Lo revise y lo vemos en la sesion.`,
              read: false,
              createdAt: new Date().toISOString()
            }
          ]
        };
      });
    }, 900);
  };

  const markThreadAsRead = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.professionalId === professionalId && message.sender === "professional"
          ? { ...message, read: true }
          : message
      )
    }));
  };

  return (
    <div className="portal-layout">
      <header className="portal-header">
        <div>
          <h1>{props.state.session?.fullName}</h1>
          <p>
            Zona horaria: {props.state.profile.timezone} | Creditos: {props.state.subscription.creditsRemaining}
          </p>
        </div>

        <div className="header-actions">
          <span className={`risk-pill ${props.state.intake?.riskBlocked ? "blocked" : "safe"}`}>
            Riesgo: {props.state.intake?.riskLevel ?? "-"}
          </span>
          <span className="chip">Sin leer: {getUnreadCount(props.state.messages)}</span>
          <div className="menu-wrap">
            <button
              aria-label="Abrir menu"
              className="menu-toggle"
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
            >
              &#9776;
            </button>
            {menuOpen ? (
              <div className="menu-dropdown">
                <button type="button" onClick={() => openProfileTabFromMenu("data")}>Perfil</button>
                <button type="button" onClick={() => openProfileTabFromMenu("cards")}>Tarjetas</button>
                <button type="button" onClick={() => openProfileTabFromMenu("subscription")}>Suscripcion</button>
                <button type="button" onClick={() => openProfileTabFromMenu("settings")}>Ajustes</button>
                <button type="button" onClick={() => openProfileTabFromMenu("support")}>Soporte</button>
                <button
                  className="danger"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    props.onLogout();
                    navigate("/");
                  }}
                >
                  Cerrar sesion
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {props.state.intake?.riskBlocked ? (
        <section className="content-card danger">
          <strong>Triage de seguridad activo:</strong> la reserva queda deshabilitada hasta revision manual.
        </section>
      ) : null}

      <nav className="portal-nav">
        <NavLink end to="/">Inicio</NavLink>
        <NavLink to="/matching">Profesionales</NavLink>
        <NavLink to="/booking">Reserva + pago</NavLink>
        <NavLink to="/chat">Chat</NavLink>
      </nav>

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                state={props.state}
                onGoToBooking={handleReserveFromAnywhere}
                onGoToChat={handleChatFromAnywhere}
              />
            }
          />
          <Route
            path="/matching"
            element={
              <MatchingPage
                selectedProfessionalId={props.state.selectedProfessionalId}
                onSelectProfessional={(professionalId) =>
                  props.onStateChange((current) => ({ ...current, selectedProfessionalId: professionalId }))
                }
                onReserve={handleReserveFromAnywhere}
                onChat={handleChatFromAnywhere}
              />
            }
          />
          <Route
            path="/booking"
            element={
              <BookingPage
                state={props.state}
                onSelectProfessional={(professionalId) =>
                  props.onStateChange((current) => ({ ...current, selectedProfessionalId: professionalId }))
                }
                onAddPackage={addPackage}
                onConfirmBooking={confirmBooking}
              />
            }
          />
          <Route
            path="/chat"
            element={
              <ChatPage
                state={props.state}
                authToken={props.state.authToken}
                sessionUserId={props.state.session?.id ?? ""}
                onSetActiveProfessional={(professionalId) =>
                  props.onStateChange((current) => ({ ...current, activeChatProfessionalId: professionalId }))
                }
                onSendMessage={sendMessage}
                onMarkRead={markThreadAsRead}
              />
            }
          />
          <Route
            path="/profile"
            element={
              props.state.session ? (
                <ProfilePage
                  user={props.state.session}
                  profile={props.state.profile}
                  subscription={props.state.subscription}
                  onUpdateProfile={(profile) =>
                    props.onStateChange((current) => ({
                      ...current,
                      profile
                    }))
                  }
                  onLogout={() => {
                    props.onLogout();
                    navigate("/");
                  }}
                />
              ) : null
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  const [state, setState] = useState<PatientAppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = (updater: (current: PatientAppState) => PatientAppState) => {
    setState((current) => updater(current));
  };

  if (!state.session) {
    return (
      <AuthScreen
        onLogin={(user, token) => {
          setState((current) => ({
            ...current,
            session: user,
            authToken: token
          }));
        }}
      />
    );
  }

  if (!state.intake?.completed) {
    return (
      <IntakeScreen
        user={state.session}
        onComplete={(answers) => {
          const riskResult = evaluateRisk(answers);
          setState((current) => ({
            ...current,
            intake: {
              completed: true,
              completedAt: new Date().toISOString(),
              riskLevel: riskResult.level,
              riskBlocked: riskResult.blocked,
              answers
            }
          }));
        }}
      />
    );
  }

  return (
    <MainPortal
      state={state}
      onStateChange={updateState}
      onLogout={() => setState(defaultState)}
    />
  );
}
