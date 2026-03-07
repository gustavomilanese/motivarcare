import { FormEvent, KeyboardEvent, SyntheticEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  currencyOptionLabel,
  formatCurrencyAmount,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";

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
  bookingMode?: "credit" | "trial";
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
  dashboardPhotoDataUrl: string;
  cards: PaymentCard[];
}

interface PatientAppState {
  session: SessionUser | null;
  authToken: string | null;
  language: AppLanguage;
  currency: SupportedCurrency;
  intake: IntakeState | null;
  selectedProfessionalId: string;
  activeChatProfessionalId: string;
  bookedSlotIds: string[];
  bookings: Booking[];
  trialUsedProfessionalIds: string[];
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
  discountPercent: number;
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
    discountPercent: 30,
    description: "Ideal para una primera etapa de trabajo terapeutico."
  },
  {
    id: "growth",
    name: "Continuidad - 8 sesiones",
    credits: 8,
    priceUsd: 680,
    discountPercent: 36,
    description: "Plan recomendado para trabajo mensual sostenido."
  },
  {
    id: "intensive",
    name: "Intensivo - 12 sesiones",
    credits: 12,
    priceUsd: 960,
    discountPercent: 40,
    description: "Mayor frecuencia para procesos de alta demanda."
  }
];

const packageTextById: Record<PackageId, { name: LocalizedText; description: LocalizedText }> = {
  starter: {
    name: {
      es: "Inicio - 4 sesiones",
      en: "Starter - 4 sessions",
      pt: "Inicio - 4 sessoes"
    },
    description: {
      es: "Ideal para una primera etapa de trabajo terapeutico.",
      en: "Ideal for an initial therapy stage.",
      pt: "Ideal para uma primeira etapa de trabalho terapeutico."
    }
  },
  growth: {
    name: {
      es: "Continuidad - 8 sesiones",
      en: "Continuity - 8 sessions",
      pt: "Continuidade - 8 sessoes"
    },
    description: {
      es: "Plan recomendado para trabajo mensual sostenido.",
      en: "Recommended plan for sustained monthly work.",
      pt: "Plano recomendado para trabalho mensal sustentado."
    }
  },
  intensive: {
    name: {
      es: "Intensivo - 12 sesiones",
      en: "Intensive - 12 sessions",
      pt: "Intensivo - 12 sessoes"
    },
    description: {
      es: "Mayor frecuencia para procesos de alta demanda.",
      en: "Higher frequency for high-demand processes.",
      pt: "Maior frequencia para processos de alta demanda."
    }
  }
};

function localizedPackageName(planId: PackageId | null, fallback: string, language: AppLanguage): string {
  if (!planId) {
    return t(language, {
      es: "Sin paquete activo",
      en: "No active package",
      pt: "Sem pacote ativo"
    });
  }
  return packageTextById[planId]?.name[language] ?? fallback;
}

function localizedPackageDescription(planId: PackageId, fallback: string, language: AppLanguage): string {
  return packageTextById[planId]?.description[language] ?? fallback;
}

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
    },
    {
      id: "pro-4",
      fullName: "Dr. Olivia Carter",
      title: "Trauma Specialist",
      yearsExperience: 12,
      compatibility: 83,
      specialties: ["Trauma recovery", "Anxiety", "Emotional resilience"],
      languages: ["English"],
      approach: "Trauma-informed CBT",
      bio: "Acompana procesos de regulacion del sistema nervioso y reconstruccion de seguridad emocional.",
      rating: 4.8,
      activePatients: 34,
      introVideoUrl: "https://example.com/video/olivia",
      slots: [
        buildSlot("pro-4", 1, 8, 30),
        buildSlot("pro-4", 2, 12, 0),
        buildSlot("pro-4", 3, 18, 0),
        buildSlot("pro-4", 4, 9, 30),
        buildSlot("pro-4", 5, 15, 0),
        buildSlot("pro-4", 6, 11, 30)
      ]
    }
  ];
}

const professionalsCatalog = buildProfessionals();
const professionalImageMap: Record<string, string> = {
  "pro-1": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80",
  "pro-2": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
  "pro-3": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
  "pro-4": "https://images.unsplash.com/photo-1594824804732-ca8db7d6e6f8?auto=format&fit=crop&w=900&q=80"
};

const heroImage = "https://source.unsplash.com/1600x900/?person,laptop,mountain,lake";

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
  dashboardPhotoDataUrl: "",
  cards: []
};

const defaultState: PatientAppState = {
  session: null,
  authToken: null,
  language: "es",
  currency: "USD",
  intake: null,
  selectedProfessionalId: professionalsCatalog[0].id,
  activeChatProfessionalId: professionalsCatalog[0].id,
  bookedSlotIds: [],
  bookings: [],
  trialUsedProfessionalIds: [],
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
      language: (SUPPORTED_LANGUAGES as readonly string[]).includes((parsed as any).language)
        ? (parsed as any).language
        : "es",
      currency: (SUPPORTED_CURRENCIES as readonly string[]).includes((parsed as any).currency)
        ? (parsed as any).currency
        : "USD",
      trialUsedProfessionalIds: parsed.trialUsedProfessionalIds ?? [],
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

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateTime(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function formatDateOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "long",
      month: "long",
      day: "numeric"
    }
  });
}

function formatMoney(amountInUsd: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyAmount({
    amountInUsd,
    currency,
    language,
    maximumFractionDigits: 0
  });
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

function AuthScreen(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  onLogin: (user: SessionUser, token: string | null) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("Alex Morgan");
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("SecurePass123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.includes("@") || password.length < 8) {
      setError(
        t(props.language, {
          es: "Usa un email valido y una contrasena de al menos 8 caracteres.",
          en: "Use a valid email and a password with at least 8 characters.",
          pt: "Use um email valido e uma senha com pelo menos 8 caracteres."
        })
      );
      return;
    }

    if (mode === "register" && fullName.trim().length < 2) {
      setError(
        t(props.language, {
          es: "Completa tu nombre y apellido.",
          en: "Please complete your full name.",
          pt: "Preencha seu nome completo."
        })
      );
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
        throw new Error(
          t(props.language, {
            es: "La cuenta no corresponde al portal paciente.",
            en: "This account does not belong to the patient portal.",
            pt: "Esta conta nao pertence ao portal do paciente."
          })
        );
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
          : t(props.language, {
              es: "No se pudo autenticar contra la API. Revisa que el backend este encendido.",
              en: "Could not authenticate against the API. Check that the backend is running.",
              pt: "Nao foi possivel autenticar na API. Verifique se o backend esta ativo."
            })
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
        <span className="chip">
          {t(props.language, { es: "Plataforma de terapia online", en: "Online therapy platform", pt: "Plataforma de terapia online" })}
        </span>
        <h1>{t(props.language, { es: "Terapia online, simple y profesional", en: "Online therapy, simple and professional", pt: "Terapia online, simples e profissional" })}</h1>
        <p>
          {t(props.language, {
            es: "Registrate o ingresa para completar el intake clinico, ver el matching recomendado y reservar sesiones.",
            en: "Sign up or log in to complete the clinical intake, view recommended matching, and book sessions.",
            pt: "Cadastre-se ou entre para completar o intake clinico, ver o matching recomendado e reservar sessoes."
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

        <div className="auth-mode-switch">
          <button
            className={mode === "register" ? "active" : ""}
            type="button"
            onClick={() => setMode("register")}
          >
            {t(props.language, { es: "Registrarme", en: "Sign up", pt: "Cadastrar" })}
          </button>
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            {t(props.language, { es: "Ingresar", en: "Sign in", pt: "Entrar" })}
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label>
              {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
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

          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary" type="submit" disabled={loading}>
            {loading
              ? t(props.language, { es: "Validando...", en: "Validating...", pt: "Validando..." })
              : mode === "register"
                ? t(props.language, { es: "Crear cuenta", en: "Create account", pt: "Criar conta" })
                : t(props.language, { es: "Entrar", en: "Sign in", pt: "Entrar" })}
          </button>
        </form>
      </section>
    </div>
  );
}

function IntakeScreen(props: {
  user: SessionUser;
  language: AppLanguage;
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
      setError(
        t(props.language, {
          es: "Completa las 10 preguntas para continuar.",
          en: "Complete all 10 questions to continue.",
          pt: "Complete as 10 perguntas para continuar."
        })
      );
      return;
    }

    setError("");
    props.onComplete(answers);
  };

  return (
    <div className="intake-shell">
      <section className="intake-card">
        <span className="chip">
          {t(props.language, { es: "Cuestionario inicial obligatorio", en: "Mandatory initial questionnaire", pt: "Questionario inicial obrigatorio" })}
        </span>
        <h1>
          {replaceTemplate(
            t(props.language, {
              es: "{name}, completemos tu intake clinico",
              en: "{name}, let us complete your clinical intake",
              pt: "{name}, vamos completar seu intake clinico"
            }),
            { name: props.user.fullName }
          )}
        </h1>
        <p>
          {t(props.language, {
            es: "Este paso es obligatorio antes del matching. Incluye screening de riesgo para detectar situaciones urgentes.",
            en: "This step is required before matching. It includes risk screening for urgent situations.",
            pt: "Este passo e obrigatorio antes do matching. Inclui triagem de risco para situacoes urgentes."
          })}
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
                  <option value="">
                    {t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}
                  </option>
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
            {t(props.language, {
              es: "Finalizar intake y ver profesionales recomendados",
              en: "Finish intake and view recommended professionals",
              pt: "Finalizar intake e ver profissionais recomendados"
            })}
          </button>
        </form>
      </section>
    </div>
  );
}

function SessionDetailModal(props: { booking: Booking; timezone: string; language: AppLanguage; onClose: () => void }) {
  const professional = findProfessionalById(props.booking.professionalId);
  const startsAt = new Date(props.booking.startsAt);
  const endsAt = new Date(props.booking.endsAt);
  const durationMinutes = Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / (1000 * 60)));

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [props.onClose]);

  return (
    <div className="session-modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        aria-label={t(props.language, {
          es: "Detalle de sesion",
          en: "Session details",
          pt: "Detalhes da sessao"
        })}
        aria-modal="true"
        className="session-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="session-modal-header">
          <div>
            <span className="chip">
              {t(props.language, { es: "Sesion confirmada", en: "Confirmed session", pt: "Sessao confirmada" })}
            </span>
            <h2>{t(props.language, { es: "Detalle de tu sesion", en: "Your session details", pt: "Detalhes da sua sessao" })}</h2>
          </div>
          <button type="button" onClick={props.onClose}>
            {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          </button>
        </header>

        <div className="session-modal-grid">
          <article className="session-modal-card">
            <h3>{professional.fullName}</h3>
            <p>{professional.title}</p>
            <p>
              <strong>{t(props.language, { es: "Tipo:", en: "Type:", pt: "Tipo:" })}</strong>{" "}
              {props.booking.bookingMode === "trial"
                ? t(props.language, { es: "Sesion de prueba", en: "Trial session", pt: "Sessao de teste" })
                : t(props.language, { es: "Sesion regular", en: "Regular session", pt: "Sessao regular" })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Enfoque:", en: "Approach:", pt: "Abordagem:" })}</strong> {professional.approach}
            </p>
          </article>

          <article className="session-modal-card">
            <p>
              <strong>{t(props.language, { es: "Fecha:", en: "Date:", pt: "Data:" })}</strong>{" "}
              {formatDateOnly({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Horario:", en: "Time:", pt: "Horario:" })}</strong>{" "}
              {formatDateTime({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Duracion:", en: "Duration:", pt: "Duracao:" })}</strong>{" "}
              {replaceTemplate(t(props.language, { es: "{m} minutos", en: "{m} minutes", pt: "{m} minutos" }), {
                m: durationMinutes
              })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Estado:", en: "Status:", pt: "Status:" })}</strong>{" "}
              {t(props.language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Reserva ID:", en: "Booking ID:", pt: "ID da reserva:" })}</strong> {props.booking.id}
            </p>
            <p>
              <strong>{t(props.language, { es: "Zona horaria:", en: "Time zone:", pt: "Fuso horario:" })}</strong> {props.timezone}
            </p>
          </article>
        </div>

        <section className="session-modal-footer">
          <a className="session-link" href={props.booking.joinUrl} rel="noreferrer" target="_blank">
            {t(props.language, {
              es: "Entrar a videollamada (simulada)",
              en: "Join video call (simulated)",
              pt: "Entrar na videochamada (simulada)"
            })}
          </a>
          <p>
            {t(props.language, {
              es: "Politica de cancelacion: puedes cancelar hasta 24 horas antes del inicio.",
              en: "Cancellation policy: you can cancel up to 24 hours before start.",
              pt: "Politica de cancelamento: voce pode cancelar ate 24 horas antes."
            })}
          </p>
          <p>
            {t(props.language, {
              es: "Tip: conecta 5 minutos antes para probar audio y camara.",
              en: "Tip: connect 5 minutes early to test audio and camera.",
              pt: "Dica: conecte 5 minutos antes para testar audio e camera."
            })}
          </p>
        </section>
      </section>
    </div>
  );
}

function DashboardPage(props: {
  state: PatientAppState;
  language: AppLanguage;
  currency: SupportedCurrency;
  onGoToBooking: (professionalId: string) => void;
  onGoToProfessional: (professionalId: string) => void;
  onGoToChat: (professionalId: string) => void;
  onGoToUnreadChat: () => void;
  onOpenBookingDetail: (bookingId: string) => void;
}) {
  const nextBooking = getNextBooking(props.state.bookings);
  const unreadTotal = getUnreadCount(props.state.messages);
  const confirmedBookings = props.state.bookings.filter((booking) => booking.status === "confirmed");
  const nextConfirmedBooking = nextBooking ?? confirmedBookings[0] ?? null;
  const fallbackBooking = confirmedBookings[0] ?? null;
  const activeProfessionalBooking = nextBooking ?? fallbackBooking;
  const activeProfessional = activeProfessionalBooking
    ? findProfessionalById(activeProfessionalBooking.professionalId)
    : null;
  const topProfessionals = [...professionalsCatalog].sort((a, b) => b.compatibility - a.compatibility).slice(0, 4);

  return (
    <div className="page-stack">
      <section className="content-card premium-banner">
        <div className="banner-copy">
          <span className="chip">{t(props.language, { es: "Experiencia premium", en: "Premium experience", pt: "Experiencia premium" })}</span>
          <h2>
            {t(props.language, {
              es: "Tu espacio de bienestar, con tecnologia y seguimiento profesional",
              en: "Your wellness space with professional follow-up and technology",
              pt: "Seu espaco de bem-estar com tecnologia e acompanhamento profissional"
            })}
          </h2>
          <p>
            {t(props.language, {
              es: "Gestiona reserva, seguimiento y mensajes en un solo lugar.",
              en: "Manage booking, follow-up, and messages in one place.",
              pt: "Gerencie reserva, acompanhamento e mensagens em um unico lugar."
            })}
          </p>
          <div className="button-row">
            <button className="primary" type="button" onClick={() => props.onGoToBooking(props.state.selectedProfessionalId)}>
              {t(props.language, { es: "Reservar siguiente sesion", en: "Book next session", pt: "Reservar proxima sessao" })}
            </button>
            <button type="button" onClick={() => props.onGoToChat(props.state.activeChatProfessionalId)}>
              {t(props.language, { es: "Ir al chat", en: "Open chat", pt: "Abrir chat" })}
            </button>
          </div>
        </div>
        <div className="photo-upload-panel static">
          <div className="photo-frame">
            <img src={heroImage} alt="Espacio de terapia online" onError={handleHeroFallback} />
          </div>
        </div>
      </section>

      <section className="hero-grid">
        <button
          className="hero-card hero-card-button"
          disabled={!nextConfirmedBooking}
          type="button"
          onClick={() => {
            if (nextConfirmedBooking) {
              props.onOpenBookingDetail(nextConfirmedBooking.id);
            }
          }}
        >
          <span className="label">{t(props.language, { es: "Sesiones confirmadas", en: "Confirmed sessions", pt: "Sessoes confirmadas" })}</span>
          <strong>{props.state.bookings.filter((booking) => booking.status === "confirmed").length}</strong>
          <p>
            {nextBooking
              ? `${t(props.language, { es: "Proxima", en: "Next", pt: "Proxima" })}: ${formatDateTime({
                  isoDate: nextBooking.startsAt,
                  timezone: props.state.profile.timezone,
                  language: props.language
                })}`
              : t(props.language, {
                  es: "Todavia no tenes sesiones reservadas",
                  en: "You do not have any booked sessions yet",
                  pt: "Voce ainda nao tem sessoes reservadas"
                })}
          </p>
          <span className="hero-card-link">
            {nextConfirmedBooking
              ? t(props.language, { es: "Ver detalle", en: "View details", pt: "Ver detalhes" })
              : t(props.language, { es: "Sin sesiones confirmadas", en: "No confirmed sessions", pt: "Sem sessoes confirmadas" })}
          </span>
        </button>

        <button
          className="hero-card hero-card-button active-professional-card"
          disabled={!activeProfessional}
          type="button"
          onClick={() => {
            if (activeProfessional) {
              props.onGoToProfessional(activeProfessional.id);
            }
          }}
        >
          <span className="label">{t(props.language, { es: "Profesional activo", en: "Active professional", pt: "Profissional ativo" })}</span>
          {activeProfessional && activeProfessionalBooking ? (
            <>
              <div className="active-professional-row">
                <img
                  className="active-professional-avatar"
                  src={professionalImageMap[activeProfessional.id]}
                  alt={activeProfessional.fullName}
                  onError={handleImageFallback}
                />
                <div>
                  <h3>{activeProfessional.fullName}</h3>
                  <p>{activeProfessional.title}</p>
                </div>
              </div>
              <p>
                {replaceTemplate(
                  t(props.language, {
                    es: "{compat}% compatibilidad · {years} anos de experiencia",
                    en: "{compat}% match · {years} years of experience",
                    pt: "{compat}% compatibilidade · {years} anos de experiencia"
                  }),
                  { compat: activeProfessional.compatibility, years: activeProfessional.yearsExperience }
                )}
              </p>
              <button
                className="chat-gradient-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onGoToChat(activeProfessional.id);
                }}
              >
                {t(props.language, { es: "Abrir chat con profesional", en: "Open chat with professional", pt: "Abrir chat com profissional" })}
              </button>
            </>
          ) : (
            <p>
              {t(props.language, {
                es: "Reserva tu primera sesion para ver aqui los datos de tu profesional.",
                en: "Book your first session to see your professional details here.",
                pt: "Reserve sua primeira sessao para ver aqui os dados do profissional."
              })}
            </p>
          )}
        </button>

        <button
          className="hero-card hero-card-button"
          type="button"
          onClick={() => props.onGoToBooking(props.state.selectedProfessionalId)}
        >
          <span className="label">{t(props.language, { es: "Sesiones disponibles", en: "Available sessions", pt: "Sessoes disponiveis" })}</span>
          <strong>{props.state.subscription.creditsRemaining}</strong>
          <p>
            {localizedPackageName(
              props.state.subscription.packageId,
              props.state.subscription.packageName,
              props.language
            )}
          </p>
          <span className="hero-card-link">{t(props.language, { es: "Ir a reserva y compra", en: "Go to booking and purchase", pt: "Ir para reserva e compra" })}</span>
        </button>

        <button
          className="hero-card hero-card-button unread-messages-card"
          disabled={unreadTotal === 0}
          type="button"
          onClick={props.onGoToUnreadChat}
        >
          <span className="label">{t(props.language, { es: "Mensajes sin leer", en: "Unread messages", pt: "Mensagens nao lidas" })}</span>
          <strong>{unreadTotal}</strong>
          <p>
            {unreadTotal > 0
              ? t(props.language, {
                  es: "Abrir chat en el primer mensaje pendiente.",
                  en: "Open chat at the first pending message.",
                  pt: "Abrir chat na primeira mensagem pendente."
                })
              : t(props.language, {
                  es: "No tienes mensajes pendientes.",
                  en: "You have no pending messages.",
                  pt: "Voce nao tem mensagens pendentes."
                })}
          </p>
        </button>
      </section>

      <section className="content-card">
        <h2>{t(props.language, { es: "Profesionales Recomendados", en: "Recommended professionals", pt: "Profissionais recomendados" })}</h2>
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
                  {t(props.language, { es: "Reservar", en: "Book", pt: "Reservar" })}
                </button>
                <button type="button" onClick={() => props.onGoToChat(professional.id)}>
                  Chat
                </button>
              </div>
            </article>
          ))}
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
  language: AppLanguage;
  currency: SupportedCurrency;
  onSelectProfessional: (professionalId: string) => void;
  onAddPackage: (plan: PackagePlan) => void;
  onConfirmBooking: (professionalId: string, slot: TimeSlot, useTrialSession: boolean) => void;
}) {
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<PackageId>("growth");
  const [useTrialSession, setUseTrialSession] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState("");

  const professional = findProfessionalById(props.state.selectedProfessionalId);
  const availableSlots = professional.slots.filter((slot) => !props.state.bookedSlotIds.includes(slot.id));
  const selectedSlot = availableSlots.find((slot) => slot.id === selectedSlotId) ?? null;
  const hasUsedTrialWithProfessional = props.state.trialUsedProfessionalIds.includes(professional.id);
  const canUseTrialWithProfessional = !hasUsedTrialWithProfessional;
  const canConfirmBooking =
    Boolean(selectedSlot) && (useTrialSession ? canUseTrialWithProfessional : props.state.subscription.creditsRemaining > 0);

  useEffect(() => {
    setUseTrialSession(false);
    setPurchaseMessage("");
  }, [professional.id]);

  const handlePurchase = () => {
    const plan = packagePlans.find((item) => item.id === selectedPlanId);
    if (!plan) {
      return;
    }

    props.onAddPackage(plan);
    setPurchaseMessage(
      replaceTemplate(
        t(props.language, {
          es: "Pago acreditado: {plan}.",
          en: "Payment approved: {plan}.",
          pt: "Pagamento creditado: {plan}."
        }),
        {
          plan: localizedPackageName(plan.id, plan.name, props.language)
        }
      )
    );
  };

  const handleBooking = () => {
    if (!selectedSlot || !canConfirmBooking) {
      return;
    }

    props.onConfirmBooking(professional.id, selectedSlot, useTrialSession);
    setSelectedSlotId("");
    setUseTrialSession(false);
  };

  if (props.state.intake?.riskBlocked) {
    return (
      <section className="content-card danger">
        <h2>
          {t(props.language, {
            es: "Reserva deshabilitada por screening de seguridad",
            en: "Booking disabled by safety screening",
            pt: "Reserva desabilitada por triagem de seguranca"
          })}
        </h2>
        <p>
          {t(props.language, {
            es: "El intake detecto un posible riesgo urgente. Por seguridad, la agenda queda bloqueada hasta triage manual.",
            en: "The intake detected possible urgent risk. For safety, booking stays blocked until manual triage.",
            pt: "O intake detectou possivel risco urgente. Por seguranca, a agenda fica bloqueada ate triagem manual."
          })}
        </p>
        <ul>
          <li>{t(props.language, { es: "Llama o escribe al 988 para apoyo en crisis.", en: "Call or text 988 for crisis support.", pt: "Ligue ou envie mensagem para 988 para apoio em crise." })}</li>
          <li>{t(props.language, { es: "Si hay peligro inmediato, llama al 911.", en: "If there is immediate danger, call 911.", pt: "Se houver perigo imediato, ligue para 911." })}</li>
          <li>{t(props.language, { es: "Usa recursos de emergencia de tu zona.", en: "Use your local emergency resources.", pt: "Use os recursos de emergencia da sua regiao." })}</li>
        </ul>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="content-card">
        <h2>{t(props.language, { es: "Reserva de sesion", en: "Session booking", pt: "Reserva de sessao" })}</h2>
        <p>
          {t(props.language, { es: "Huso horario de visualizacion:", en: "Display time zone:", pt: "Fuso horario de visualizacao:" })}{" "}
          <strong>{props.state.profile.timezone}</strong>
        </p>

        <label>
          {t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}
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

        <h3>{t(props.language, { es: "Slots disponibles", en: "Available slots", pt: "Horarios disponiveis" })}</h3>
        {availableSlots.length === 0 ? (
          <p>
            {t(props.language, {
              es: "No quedan slots disponibles para este profesional durante la semana actual.",
              en: "No slots left for this professional this week.",
              pt: "Nao ha horarios disponiveis para este profissional nesta semana."
            })}
          </p>
        ) : (
          <div className="slot-grid">
            {availableSlots.map((slot) => (
              <button
                className={selectedSlotId === slot.id ? "slot-button active" : "slot-button"}
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
              >
                <span>
                  {formatDateOnly({ isoDate: slot.startsAt, timezone: props.state.profile.timezone, language: props.language })}
                </span>
                <strong>
                  {formatDateTime({ isoDate: slot.startsAt, timezone: props.state.profile.timezone, language: props.language })}
                </strong>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="content-card">
        <h2>{t(props.language, { es: "Pago y sesiones disponibles", en: "Payment and available sessions", pt: "Pagamento e sessoes disponiveis" })}</h2>
        <div className="booking-payment-layout">
          <article className={`trial-session-card ${hasUsedTrialWithProfessional ? "used" : ""}`}>
            <span className="chip">{t(props.language, { es: "Sesion de prueba", en: "Trial session", pt: "Sessao de teste" })}</span>
            <h3>{t(props.language, { es: "Conoce al profesional antes del proceso completo", en: "Meet the professional before the full process", pt: "Conheca o profissional antes do processo completo" })}</h3>
            <p>
              {t(props.language, {
                es: "Esta sesion inicial te sirve para conocer al terapeuta, su estilo de trabajo y validar si es un buen match para ti.",
                en: "This initial session helps you meet the therapist, understand their approach, and validate if it is a good match.",
                pt: "Esta sessao inicial ajuda voce a conhecer o terapeuta, entender o estilo de trabalho e validar se ha um bom match."
              })}
            </p>
            <p className="trial-rule">{t(props.language, { es: "Solo puedes tener 1 sesion de prueba por terapeuta.", en: "You can only have 1 trial session per therapist.", pt: "Voce so pode ter 1 sessao de teste por terapeuta." })}</p>

            {hasUsedTrialWithProfessional ? (
              <p className="error-text">
                {replaceTemplate(
                  t(props.language, {
                    es: "Ya usaste la sesion de prueba con {name}.",
                    en: "You already used the trial session with {name}.",
                    pt: "Voce ja usou a sessao de teste com {name}."
                  }),
                  { name: professional.fullName }
                )}
              </p>
            ) : (
              <button
                className={useTrialSession ? "primary" : ""}
                type="button"
                onClick={() => setUseTrialSession((current) => !current)}
              >
                {useTrialSession
                  ? t(props.language, { es: "Sesion de prueba seleccionada", en: "Trial session selected", pt: "Sessao de teste selecionada" })
                  : t(props.language, { es: "Usar sesion de prueba", en: "Use trial session", pt: "Usar sessao de teste" })}
              </button>
            )}
          </article>

          <article className="session-payment-card">
            <p>
              {t(props.language, { es: "Paquete actual:", en: "Current package:", pt: "Pacote atual:" })}{" "}
              <strong>
                {localizedPackageName(
                  props.state.subscription.packageId,
                  props.state.subscription.packageName,
                  props.language
                )}
              </strong>
            </p>
            <p>
              {t(props.language, { es: "Sesiones disponibles:", en: "Available sessions:", pt: "Sessoes disponiveis:" })}{" "}
              <strong>{props.state.subscription.creditsRemaining}</strong>
            </p>

            {props.state.subscription.creditsRemaining === 0 ? (
              useTrialSession ? (
                <p>Reserva habilitada como sesion de prueba. No hace falta comprar paquete para esta sesion.</p>
              ) : (
                <>
                  <p>Necesitas un paquete activo para confirmar una reserva sin sesion de prueba.</p>

                  <div className="deal-grid">
                    {packagePlans.map((plan) => (
                      <label className={`deal-card ${selectedPlanId === plan.id ? "selected" : ""}`} key={plan.id}>
                        <input
                          checked={selectedPlanId === plan.id}
                          type="radio"
                          name="package"
                          value={plan.id}
                          onChange={() => setSelectedPlanId(plan.id)}
                        />
                        <h3>{localizedPackageName(plan.id, plan.name, props.language)}</h3>
                        <p>{localizedPackageDescription(plan.id, plan.description, props.language)}</p>
                        <div className="deal-pricing-top">
                          <span className="deal-list-price">
                            {formatMoney(Math.round(plan.priceUsd / (1 - plan.discountPercent / 100)), props.language, props.currency)}
                          </span>
                          <span className="deal-discount-badge">{plan.discountPercent}% OFF</span>
                        </div>
                        <p className="deal-from">Desde</p>
                        <p className="deal-main-price">{formatMoney(plan.priceUsd, props.language, props.currency)}</p>
                        <p className="deal-caption">{plan.credits} sesiones incluidas.</p>
                        <span className="deal-cta">
                          {selectedPlanId === plan.id ? "Paquete seleccionado" : "Seleccionar paquete"}
                        </span>
                      </label>
                    ))}
                  </div>

                  <button className="primary" type="button" onClick={handlePurchase}>
                    Pagar con Stripe
                  </button>
                </>
              )
            ) : (
              <p>
                {useTrialSession
                  ? "Esta reserva se confirmara como sesion de prueba y no consumira sesiones disponibles."
                  : "Se consumira 1 sesion disponible al confirmar esta reserva."}
              </p>
            )}
            {purchaseMessage ? <p className="success-text">{purchaseMessage}</p> : null}
          </article>
        </div>

        <div className="booking-confirm-row">
          <p>
            {useTrialSession
              ? "Confirmaras una sesion de prueba para conocer al profesional."
              : "Confirmaras una sesion regular con consumo de sesiones disponibles."}
          </p>
          <button className="primary" disabled={!canConfirmBooking} type="button" onClick={handleBooking}>
            Confirmar sesion
          </button>
        </div>
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
  language: AppLanguage;
  authToken: string | null;
  sessionUserId: string;
  onSetActiveProfessional: (professionalId: string) => void;
  onSendMessage: (professionalId: string, text: string) => void;
  onMarkRead: (professionalId: string) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState("");
  const [apiThreads, setApiThreads] = useState<ApiChatThread[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiChatMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [apiError, setApiError] = useState("");
  const [pendingUnreadFocus, setPendingUnreadFocus] = useState(searchParams.get("focus") === "first-unread");

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
    if (searchParams.get("focus") === "first-unread") {
      setPendingUnreadFocus(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (remoteMode) {
      return;
    }

    const unread = getUnreadCount(props.state.messages, threadProfessional.id);
    if (unread > 0) {
      if (pendingUnreadFocus) {
        const timer = window.setTimeout(() => {
          props.onMarkRead(threadProfessional.id);
        }, 650);
        return () => {
          window.clearTimeout(timer);
        };
      }
      props.onMarkRead(threadProfessional.id);
    }
  }, [remoteMode, threadProfessional.id, props.onMarkRead, props.state.messages, pendingUnreadFocus]);

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

  useEffect(() => {
    if (!pendingUnreadFocus) {
      return;
    }

    const firstUnreadMessageId = remoteMode
      ? apiMessages.find((message) => message.senderUserId !== props.sessionUserId && !message.readAt)?.id ?? null
      : threadMessages.find((message) => message.sender === "professional" && !message.read)?.id ?? null;

    if (firstUnreadMessageId) {
      const messageElement = document.getElementById(`chat-msg-${firstUnreadMessageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      setPendingUnreadFocus(false);
      setSearchParams({}, { replace: true });
      return;
    }

    if (!remoteMode || apiMessages.length > 0) {
      setPendingUnreadFocus(false);
      setSearchParams({}, { replace: true });
    }
  }, [
    pendingUnreadFocus,
    remoteMode,
    apiMessages,
    threadMessages,
    props.sessionUserId,
    setSearchParams
  ]);

  return (
    <div className="wa-shell">
      <aside className="wa-sidebar">
        <header className="wa-sidebar-header">
          <h2>{t(props.language, { es: "Mensajes", en: "Messages", pt: "Mensagens" })}</h2>
        </header>

        <div className="wa-thread-list">
          {professionalsCatalog.map((professional) => {
            const remoteThread = apiThreadByProfessional.get(professional.id);
            const unread = remoteMode ? remoteThread?.unreadCount ?? 0 : getUnreadCount(props.state.messages, professional.id);
            const lastMessageText = remoteMode
              ? remoteThread?.lastMessage?.body
                ?? t(props.language, { es: "Todavia no hay mensajes", en: "No messages yet", pt: "Ainda nao ha mensagens" })
              : props.state.messages
                  .filter((message) => message.professionalId === professional.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.text
                ?? t(props.language, { es: "Todavia no hay mensajes", en: "No messages yet", pt: "Ainda nao ha mensagens" });

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
              <span>{t(props.language, { es: "En linea", en: "Online", pt: "Online" })}</span>
            </div>
          </div>
        </header>

        <div className="wa-messages">
          {remoteMode && apiMessages.length === 0 ? (
            <p className="wa-empty">
              {t(props.language, {
                es: "Todavia no hay mensajes en esta conversacion.",
                en: "There are no messages in this conversation yet.",
                pt: "Ainda nao ha mensagens nesta conversa."
              })}
            </p>
          ) : null}

          {remoteMode
            ? apiMessages.map((message) => (
                <article
                  id={`chat-msg-${message.id}`}
                  className={message.senderUserId === props.sessionUserId ? "wa-message outgoing" : "wa-message incoming"}
                  key={message.id}
                >
                  <p>{message.body}</p>
                  <time>
                    {formatDateTime({
                      isoDate: message.createdAt,
                      timezone: props.state.profile.timezone,
                      language: props.language
                    })}
                  </time>
                </article>
              ))
            : null}

          {!remoteMode && threadMessages.length === 0 ? (
            <p className="wa-empty">
              {t(props.language, {
                es: "Todavia no hay mensajes en esta conversacion.",
                en: "There are no messages in this conversation yet.",
                pt: "Ainda nao ha mensagens nesta conversa."
              })}
            </p>
          ) : (
            !remoteMode ? threadMessages.map((message) => (
              <article
                id={`chat-msg-${message.id}`}
                className={message.sender === "patient" ? "wa-message outgoing" : "wa-message incoming"}
                key={message.id}
              >
                <p>{message.text}</p>
                <time>
                  {formatDateTime({
                    isoDate: message.createdAt,
                    timezone: props.state.profile.timezone,
                    language: props.language
                  })}
                </time>
              </article>
            )) : null
          )}
        </div>

        <footer className="wa-composer">
          <textarea
            placeholder={t(props.language, { es: "Escribe un mensaje", en: "Write a message", pt: "Escreva uma mensagem" })}
            rows={2}
            value={draft}
            onKeyDown={handleComposerKeyDown}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button className="wa-send" type="button" onClick={handleSend}>
            {t(props.language, { es: "Enviar", en: "Send", pt: "Enviar" })}
          </button>
        </footer>
      </section>
      {apiError ? <p className="error-text">{apiError}</p> : null}
    </div>
  );
}

function ProfilePage(props: {
  user: SessionUser;
  language: AppLanguage;
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
        <h2>{t(props.language, { es: "Menu de perfil", en: "Profile menu", pt: "Menu de perfil" })}</h2>
        <div className="stack">
          <button className={tab === "data" ? "menu-button active" : "menu-button"} type="button" onClick={() => goToTab("data")}>
            {t(props.language, { es: "MIS DATOS", en: "MY DATA", pt: "MEUS DADOS" })}
          </button>
          <button className={tab === "cards" ? "menu-button active" : "menu-button"} type="button" onClick={() => goToTab("cards")}>
            {t(props.language, { es: "MIS TARJETAS", en: "MY CARDS", pt: "MEUS CARTOES" })}
          </button>
          <button className={tab === "subscription" ? "menu-button active" : "menu-button"} type="button" onClick={() => goToTab("subscription")}>
            {t(props.language, { es: "MI SUSCRIPCION", en: "MY SUBSCRIPTION", pt: "MINHA ASSINATURA" })}
          </button>
          <button className={tab === "settings" ? "menu-button active" : "menu-button"} type="button" onClick={() => goToTab("settings")}>
            {t(props.language, { es: "AJUSTES", en: "SETTINGS", pt: "CONFIGURACOES" })}
          </button>
          <button className={tab === "support" ? "menu-button active" : "menu-button"} type="button" onClick={() => goToTab("support")}>
            {t(props.language, { es: "SOPORTE", en: "SUPPORT", pt: "SUPORTE" })}
          </button>
          <button className="danger" type="button" onClick={props.onLogout}>
            {t(props.language, { es: "SALIR", en: "SIGN OUT", pt: "SAIR" })}
          </button>
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
            <p>
              <strong>
                {localizedPackageName(props.subscription.packageId, props.subscription.packageName, props.language)}
              </strong>
            </p>
            <p>
              Sesiones disponibles: {props.subscription.creditsRemaining} / {props.subscription.creditsTotal}
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
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const selectedBooking = selectedBookingId
    ? props.state.bookings.find((booking) => booking.id === selectedBookingId) ?? null
    : null;

  const handleReserveFromAnywhere = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      selectedProfessionalId: professionalId
    }));
    navigate("/booking");
  };

  const handleGoToProfessional = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      selectedProfessionalId: professionalId
    }));
    navigate("/matching");
  };

  const handleChatFromAnywhere = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      activeChatProfessionalId: professionalId
    }));
    navigate("/chat");
  };

  const handleUnreadChatFromDashboard = () => {
    const firstUnread = [...props.state.messages]
      .filter((message) => message.sender === "professional" && !message.read)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

    if (firstUnread) {
      props.onStateChange((current) => ({
        ...current,
        activeChatProfessionalId: firstUnread.professionalId
      }));
      navigate("/chat?focus=first-unread");
      return;
    }

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

  const confirmBooking = (professionalId: string, slot: TimeSlot, useTrialSession: boolean) => {
    props.onStateChange((current) => {
      const trialAlreadyUsed = current.trialUsedProfessionalIds.includes(professionalId);
      const bookingAsTrial = useTrialSession && !trialAlreadyUsed;
      const hasCredits = current.subscription.creditsRemaining > 0;

      if (!bookingAsTrial && !hasCredits) {
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
        createdAt: new Date().toISOString(),
        bookingMode: bookingAsTrial ? "trial" : "credit"
      };

      return {
        ...current,
        bookings: [newBooking, ...current.bookings],
        bookedSlotIds: [...current.bookedSlotIds, slot.id],
        trialUsedProfessionalIds:
          bookingAsTrial && !trialAlreadyUsed
            ? [...current.trialUsedProfessionalIds, professionalId]
            : current.trialUsedProfessionalIds,
        subscription: {
          ...current.subscription,
          creditsRemaining: bookingAsTrial ? current.subscription.creditsRemaining : current.subscription.creditsRemaining - 1
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
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <span className="portal-brand-mark">M</span>
          <div>
            <strong>Motivarte</strong>
            <p>{t(props.state.language, { es: "Portal paciente", en: "Patient portal", pt: "Portal do paciente" })}</p>
          </div>
        </div>

        <nav className="portal-sidebar-nav">
          <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} end to="/">
            {t(props.state.language, { es: "Inicio", en: "Home", pt: "Inicio" })}
          </NavLink>
          <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/matching">
            {t(props.state.language, { es: "Profesionales", en: "Professionals", pt: "Profissionais" })}
          </NavLink>
          <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/booking">
            {t(props.state.language, { es: "Reserva", en: "Booking", pt: "Reserva" })}
          </NavLink>
          <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/chat">
            Chat
          </NavLink>
        </nav>

        <div className="portal-sidebar-foot">
          <p>{props.state.session?.email}</p>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-header">
          <div>
            <h1>
              {replaceTemplate(
                t(props.state.language, {
                  es: "Hola, {name}",
                  en: "Hi, {name}",
                  pt: "Ola, {name}"
                }),
                { name: props.state.session?.fullName ?? "" }
              )}
            </h1>
            <p>
              {t(props.state.language, {
                es: "Tu espacio personal de terapia online.",
                en: "Your personal online therapy space.",
                pt: "Seu espaco pessoal de terapia online."
              })}
            </p>
          </div>

          <div className="header-actions">
            <div className="locale-controls">
              <label>
                {t(props.state.language, { es: "Idioma", en: "Language", pt: "Idioma" })}
                <select
                  value={props.state.language}
                  onChange={(event) =>
                    props.onStateChange((current) => ({
                      ...current,
                      language: event.target.value as AppLanguage
                    }))
                  }
                >
                  {SUPPORTED_LANGUAGES.map((language) => (
                    <option key={language} value={language}>
                      {language === "es" ? "Espanol" : language === "en" ? "English" : "Portugues"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t(props.state.language, { es: "Moneda", en: "Currency", pt: "Moeda" })}
                <select
                  value={props.state.currency}
                  onChange={(event) =>
                    props.onStateChange((current) => ({
                      ...current,
                      currency: event.target.value as SupportedCurrency
                    }))
                  }
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currencyOptionLabel(currency, props.state.language)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="menu-wrap">
              <button
                aria-label={t(props.state.language, { es: "Abrir menu", en: "Open menu", pt: "Abrir menu" })}
                className="menu-toggle"
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
              >
                &#9776;
              </button>
              {menuOpen ? (
                <div className="menu-dropdown">
                  <button className="menu-item" type="button" onClick={() => openProfileTabFromMenu("data")}>
                    {t(props.state.language, { es: "Perfil", en: "Profile", pt: "Perfil" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => openProfileTabFromMenu("cards")}>
                    {t(props.state.language, { es: "Tarjetas", en: "Cards", pt: "Cartoes" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => openProfileTabFromMenu("subscription")}>
                    {t(props.state.language, { es: "Suscripcion", en: "Subscription", pt: "Assinatura" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => openProfileTabFromMenu("settings")}>
                    {t(props.state.language, { es: "Ajustes", en: "Settings", pt: "Configuracoes" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => openProfileTabFromMenu("support")}>
                    {t(props.state.language, { es: "Soporte", en: "Support", pt: "Suporte" })}
                  </button>
                  <button
                    className="menu-item danger"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      props.onLogout();
                      navigate("/");
                    }}
                  >
                    {t(props.state.language, { es: "Cerrar sesion", en: "Sign out", pt: "Sair" })}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <nav className="portal-mobile-nav" aria-label="Navegacion principal mobile">
          <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} end to="/">
            {t(props.state.language, { es: "Inicio", en: "Home", pt: "Inicio" })}
          </NavLink>
          <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/matching">
            {t(props.state.language, { es: "Profesionales", en: "Professionals", pt: "Profissionais" })}
          </NavLink>
          <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/booking">
            {t(props.state.language, { es: "Reserva", en: "Booking", pt: "Reserva" })}
          </NavLink>
          <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/chat">
            Chat
          </NavLink>
        </nav>

        {props.state.intake?.riskBlocked ? (
          <section className="content-card danger">
            <strong>
              {t(props.state.language, {
                es: "Triage de seguridad activo:",
                en: "Safety triage active:",
                pt: "Triagem de seguranca ativa:"
              })}
            </strong>{" "}
            {t(props.state.language, {
              es: "la reserva queda deshabilitada hasta revision manual.",
              en: "booking is disabled until manual review.",
              pt: "a reserva fica desabilitada ate revisao manual."
            })}
          </section>
        ) : null}

        <main className="portal-main-content">
          <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                state={props.state}
                language={props.state.language}
                currency={props.state.currency}
                onGoToBooking={handleReserveFromAnywhere}
                onGoToProfessional={handleGoToProfessional}
                onGoToChat={handleChatFromAnywhere}
                onGoToUnreadChat={handleUnreadChatFromDashboard}
                onOpenBookingDetail={(bookingId) => setSelectedBookingId(bookingId)}
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
                language={props.state.language}
                currency={props.state.currency}
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
                language={props.state.language}
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
                  language={props.state.language}
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
      {selectedBooking ? (
        <SessionDetailModal
          booking={selectedBooking}
          timezone={props.state.profile.timezone}
          language={props.state.language}
          onClose={() => setSelectedBookingId("")}
        />
      ) : null}
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
        language={state.language}
        currency={state.currency}
        onLanguageChange={(language) => {
          setState((current) => ({
            ...current,
            language
          }));
        }}
        onCurrencyChange={(currency) => {
          setState((current) => ({
            ...current,
            currency
          }));
        }}
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
        language={state.language}
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
