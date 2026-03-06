import { FormEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";

type RiskLevel = "low" | "medium" | "high";
type PackageId = "starter" | "growth" | "intensive";
type SenderRole = "patient" | "professional";
type ProfileTab = "data" | "cards" | "subscription" | "settings" | "support";

interface SessionUser {
  id: string;
  fullName: string;
  email: string;
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
  intake: IntakeState | null;
  selectedProfessionalId: string;
  activeChatProfessionalId: string;
  bookedSlotIds: string[];
  bookings: Booking[];
  messages: Message[];
  subscription: SubscriptionState;
  profile: PatientProfile;
}

interface PackagePlan {
  id: PackageId;
  name: string;
  credits: number;
  priceUsd: number;
  description: string;
}

const STORAGE_KEY = "therapy_patient_demo_v2";

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
  "pro-1": "/images/prof-emma.svg",
  "pro-2": "/images/prof-michael.svg",
  "pro-3": "/images/prof-sophia.svg"
};

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

function AuthScreen(props: { onLogin: (user: SessionUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [fullName, setFullName] = useState("Alex Morgan");
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("demoPassword123");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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
    props.onLogin({
      id: `pat-${Date.now()}`,
      fullName: mode === "register" ? fullName.trim() : "Alex Morgan",
      email: email.trim().toLowerCase()
    });
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="visual-hero">
          <img src="/images/hero-therapy.svg" alt="Plataforma de terapia online" />
        </div>
        <span className="chip">Lado Paciente - Demo Premium</span>
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
          <button className="primary" type="submit">
            {mode === "register" ? "Crear cuenta" : "Entrar"}
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
  const topProfessionals = [...professionalsCatalog].sort((a, b) => b.compatibility - a.compatibility).slice(0, 3);

  return (
    <div className="page-stack">
      <section className="content-card premium-banner">
        <div className="banner-copy">
          <span className="chip">Experiencia premium</span>
          <h2>Tu espacio de bienestar, con tecnologia y seguimiento profesional</h2>
          <p>
            Desde aca gestionas agenda, mensajes, sesiones y tu suscripcion en un solo lugar.
          </p>
          <div className="button-row">
            <button className="primary" type="button" onClick={() => props.onGoToBooking(props.state.selectedProfessionalId)}>
              Reservar siguiente sesion
            </button>
            <button type="button" onClick={() => props.onGoToChat(props.state.activeChatProfessionalId)}>
              Ir al chat
            </button>
          </div>
        </div>
        <img src="/images/hero-therapy.svg" alt="Paciente y profesional en sesion online" />
      </section>

      <section className="hero-grid">
        <article className="hero-card">
          <span className="label">Sesiones confirmadas</span>
          <strong>{props.state.bookings.filter((booking) => booking.status === "confirmed").length}</strong>
          <p>
            {nextBooking
              ? `Proxima: ${formatDateTime(nextBooking.startsAt, props.state.profile.timezone)}`
              : "Todavia no tenes sesiones reservadas"}
          </p>
        </article>

        <article className="hero-card">
          <span className="label">Creditos disponibles</span>
          <strong>{props.state.subscription.creditsRemaining}</strong>
          <p>{props.state.subscription.packageName}</p>
        </article>

        <article className="hero-card">
          <span className="label">Mensajes sin leer</span>
          <strong>{unreadTotal}</strong>
          <p>Mensajeria interna 1 a 1 con tu profesional.</p>
        </article>
      </section>

      <section className="content-card">
        <h2>HORARIO</h2>
        {props.state.bookings.length === 0 ? (
          <p>Aun no hay sesiones agendadas. Elegi profesional y reserva tu primer slot.</p>
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
        <h2>LISTA (profesionales recomendados)</h2>
        <div className="card-grid">
          {topProfessionals.map((professional) => (
            <article className="mini-card" key={professional.id}>
              <img
                className="thumb"
                src={professionalImageMap[professional.id]}
                alt={`Perfil de ${professional.fullName}`}
              />
              <h3>{professional.fullName}</h3>
              <p>{professional.title}</p>
              <p className="compatibility">{professional.compatibility}% compatibilidad</p>
              <div className="button-row">
                <button type="button" onClick={() => props.onGoToBooking(professional.id)}>
                  Reservar
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
        <h2>CHAT</h2>
        <p>Ultima actividad de tus conversaciones, con notificaciones y estado de lectura.</p>
      </section>

      <section className="content-card">
        <h2>PERFIL</h2>
        <div className="pill-row">
          <span className="pill">MIS DATOS</span>
          <span className="pill">MIS TARJETAS</span>
          <span className="pill">MI SUSCRIPCION</span>
          <span className="pill">AJUSTES</span>
          <span className="pill">SOPORTE</span>
          <span className="pill">SALIR</span>
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
                <span>{professional.rating.toFixed(1)} rating</span>
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
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<PackageId>("growth");
  const [purchaseMessage, setPurchaseMessage] = useState("");

  const professional = findProfessionalById(props.state.selectedProfessionalId);
  const availableSlots = professional.slots.filter((slot) => !props.state.bookedSlotIds.includes(slot.id));
  const selectedSlot = availableSlots.find((slot) => slot.id === selectedSlotId) ?? null;

  const handlePurchase = () => {
    const plan = packagePlans.find((item) => item.id === selectedPlanId);
    if (!plan) {
      return;
    }

    props.onAddPackage(plan);
    setPurchaseMessage(`Pago exitoso en modo demo: ${plan.name}.`);
  };

  const handleBooking = () => {
    if (!selectedSlot) {
      return;
    }

    props.onConfirmBooking(professional.id, selectedSlot);
    setSelectedSlotId("");
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
      <section className="content-card">
        <h2>Reserva de sesion</h2>
        <p>Huso horario de visualizacion: <strong>{props.state.profile.timezone}</strong></p>

        <label>
          Profesional
          <select
            value={professional.id}
            onChange={(event) => {
              props.onSelectProfessional(event.target.value);
              setSelectedSlotId("");
            }}
          >
            {professionalsCatalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.fullName} - {item.compatibility}%
              </option>
            ))}
          </select>
        </label>

        <h3>Slots disponibles</h3>
        {availableSlots.length === 0 ? (
          <p>No quedan slots disponibles para este profesional durante la semana actual.</p>
        ) : (
          <div className="slot-grid">
            {availableSlots.map((slot) => (
              <button
                className={selectedSlotId === slot.id ? "slot-button active" : "slot-button"}
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
              >
                <span>{formatDateOnly(slot.startsAt, props.state.profile.timezone)}</span>
                <strong>{formatDateTime(slot.startsAt, props.state.profile.timezone)}</strong>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="content-card">
        <h2>Pago y creditos de sesiones</h2>
        <p>
          Paquete actual: <strong>{props.state.subscription.packageName}</strong>
        </p>
        <p>
          Creditos disponibles: <strong>{props.state.subscription.creditsRemaining}</strong>
        </p>

        {props.state.subscription.creditsRemaining === 0 ? (
          <>
            <p>Necesitas un paquete activo para confirmar una reserva.</p>

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
              Pagar con Stripe (demo)
            </button>
            {purchaseMessage ? <p className="success-text">{purchaseMessage}</p> : null}
          </>
        ) : (
          <>
            <p>Se consumira 1 credito al confirmar esta reserva.</p>
            <button className="primary" disabled={!selectedSlot} type="button" onClick={handleBooking}>
              Confirmar sesion
            </button>
          </>
        )}
      </section>

      <section className="content-card">
        <h2>Post reserva</h2>
        <p>Luego de reservar, tenes:</p>
        <ul>
          <li>Confirmacion automatica de la sesion.</li>
          <li>Confirmacion por email.</li>
          <li>Link directo para ingresar.</li>
          <li>Historial de sesiones en dashboard.</li>
        </ul>
      </section>
    </div>
  );
}

function ChatPage(props: {
  state: PatientAppState;
  onSetActiveProfessional: (professionalId: string) => void;
  onSendMessage: (professionalId: string, text: string) => void;
  onMarkRead: (professionalId: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const threadProfessional = findProfessionalById(props.state.activeChatProfessionalId);
  const threadMessages = props.state.messages
    .filter((message) => message.professionalId === threadProfessional.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    props.onMarkRead(threadProfessional.id);
  }, [props, threadProfessional.id]);

  const handleSend = () => {
    if (!draft.trim()) {
      return;
    }

    props.onSendMessage(threadProfessional.id, draft.trim());
    setDraft("");
  };

  return (
    <div className="chat-layout">
      <aside className="content-card chat-sidebar">
        <h2>Conversaciones</h2>

        {professionalsCatalog.map((professional) => {
          const unread = getUnreadCount(props.state.messages, professional.id);
          const lastMessage = props.state.messages
            .filter((message) => message.professionalId === professional.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

          return (
            <button
              className={professional.id === threadProfessional.id ? "thread-item active" : "thread-item"}
              key={professional.id}
              type="button"
              onClick={() => props.onSetActiveProfessional(professional.id)}
            >
              <div>
                <strong>{professional.fullName}</strong>
                <p>{lastMessage ? lastMessage.text : "Todavia no hay mensajes"}</p>
              </div>
              {unread > 0 ? <span className="badge">{unread}</span> : null}
            </button>
          );
        })}
      </aside>

      <section className="content-card chat-thread">
        <header className="chat-header">
          <h2>{threadProfessional.fullName}</h2>
          <span>{threadProfessional.title}</span>
        </header>

        <div className="messages">
          {threadMessages.length === 0 ? (
            <p>Todavia no hay mensajes en esta conversacion.</p>
          ) : (
            threadMessages.map((message) => (
              <article
                className={message.sender === "patient" ? "message outgoing" : "message incoming"}
                key={message.id}
              >
                <p>{message.text}</p>
                <time>{formatDateTime(message.createdAt, props.state.profile.timezone)}</time>
              </article>
            ))
          )}
        </div>

        <footer className="chat-input">
          <textarea
            placeholder="Escribe tu mensaje"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button className="primary" type="button" onClick={handleSend}>
            Enviar
          </button>
        </footer>
      </section>
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
  const [tab, setTab] = useState<ProfileTab>("data");
  const [localProfile, setLocalProfile] = useState<PatientProfile>(props.profile);
  const [cardBrand, setCardBrand] = useState("Visa");
  const [cardLast4, setCardLast4] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  useEffect(() => {
    setLocalProfile(props.profile);
  }, [props.profile]);

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
          <button type="button" onClick={() => setTab("data")}>MIS DATOS</button>
          <button type="button" onClick={() => setTab("cards")}>MIS TARJETAS</button>
          <button type="button" onClick={() => setTab("subscription")}>MI SUSCRIPCION</button>
          <button type="button" onClick={() => setTab("settings")}>AJUSTES</button>
          <button type="button" onClick={() => setTab("support")}>SOPORTE</button>
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
              Timezone
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
            <button className="primary" type="button" onClick={() => setSupportMessage("Solicitud enviada (demo).")}>
              Enviar solicitud
            </button>
            {supportMessage ? <p className="success-text">{supportMessage}</p> : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

function VisionPage() {
  return (
    <div className="page-stack">
      <section className="content-card">
        <span className="chip">Vista para accionistas</span>
        <h2>Arquitectura modular de la plataforma</h2>
        <p>Disenada para crecer por modulos, con independencia entre frontends, backend, datos e integraciones externas.</p>
      </section>

      <section className="architecture-grid">
        <article className="architecture-layer front">
          <h3>Frontends</h3>
          <ul>
            <li>Portal Paciente (React)</li>
            <li>Portal Profesional (React)</li>
            <li>Portal Admin (React)</li>
          </ul>
        </article>

        <article className="architecture-layer backend">
          <h3>Backend API</h3>
          <ul>
            <li>Auth y roles</li>
            <li>Intake y triage de riesgo</li>
            <li>Matching y perfiles</li>
            <li>Agenda, booking, chat</li>
            <li>Payments, video, AI audit</li>
          </ul>
        </article>

        <article className="architecture-layer data">
          <h3>Data Layer</h3>
          <ul>
            <li>PostgreSQL + Prisma</li>
            <li>Redis (colas y cache)</li>
          </ul>
        </article>

        <article className="architecture-layer apis">
          <h3>External APIs</h3>
          <ul>
            <li>Stripe (paquetes)</li>
            <li>Daily (videollamadas)</li>
            <li>OpenAI (auditoria IA)</li>
            <li>Email/SMS provider</li>
          </ul>
        </article>
      </section>

      <section className="content-card">
        <h2>Estado del producto</h2>
        <div className="status-grid">
          <article className="status-card ready">
            <h3>Listo hoy para demo</h3>
            <ul>
              <li>UX completa lado paciente</li>
              <li>Flujo end-to-end con estado real de producto</li>
              <li>Arquitectura modular ya definida</li>
            </ul>
          </article>
          <article className="status-card evolve">
            <h3>Evolucion para produccion</h3>
            <ul>
              <li>Autenticacion real y hardening de seguridad</li>
              <li>Webhook Stripe real + conciliacion</li>
              <li>Daily rooms reales + monitoreo + compliance</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}

function MainPortal(props: {
  state: PatientAppState;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
}) {
  const navigate = useNavigate();

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
          <span className="chip">Lado paciente listo para demostracion con stakeholders</span>
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
        <NavLink to="/profile">Perfil</NavLink>
        <NavLink to="/vision">Arquitectura</NavLink>
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
                    props.onStateChange(() => defaultState);
                    navigate("/");
                  }}
                />
              ) : null
            }
          />
          <Route
            path="/vision"
            element={<VisionPage />}
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
        onLogin={(user) => {
          setState((current) => ({
            ...current,
            session: user
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

  return <MainPortal state={state} onStateChange={updateState} />;
}
