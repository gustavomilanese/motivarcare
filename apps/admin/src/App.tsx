import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
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

type Role = "PATIENT" | "PROFESSIONAL" | "ADMIN";
type PatientStatus = "active" | "pause" | "cancelled" | "trial";
type RoleFilter = Role | "ALL";
type PortalPath =
  | "/"
  | "/patients"
  | "/professionals"
  | "/sessions"
  | "/finances"
  | "/calendar"
  | "/library"
  | "/imports"
  | "/users"
  | "/web-admin"
  | "/settings"
  | "/ai";

interface AuthApiUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  patientProfileId: string | null;
  professionalProfileId: string | null;
}

interface AuthApiResponse {
  token: string;
  user: AuthApiUser;
}

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN";
}

interface ApiErrorPayload {
  error?: string;
}

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  patientProfile: {
    id: string;
    timezone: string;
    status: string;
  } | null;
  professionalProfile: {
    id: string;
    visible: boolean;
    cancellationHours: number;
    bio: string | null;
    therapeuticApproach: string | null;
    yearsExperience: number | null;
    photoUrl: string | null;
    videoUrl: string | null;
  } | null;
  adminProfile: {
    id: string;
  } | null;
}

interface UsersResponse {
  users: AdminUser[];
}

interface KpisResponse {
  kpis: {
    activePatients: number;
    activeProfessionals: number;
    scheduledSessions: number;
    monthlyRevenueCents: number;
  };
  note: string;
}

interface LandingSettingsResponse {
  settings: {
    patientHeroImageUrl: string | null;
    patientDesktopImageUrl?: string | null;
    patientMobileImageUrl?: string | null;
    professionalDesktopImageUrl?: string | null;
    professionalMobileImageUrl?: string | null;
  };
  updatedAt: string | null;
}

interface WebLandingSettings {
  patientHeroImageUrl: string | null;
  patientDesktopImageUrl: string | null;
  patientMobileImageUrl: string | null;
  professionalDesktopImageUrl: string | null;
  professionalMobileImageUrl: string | null;
}

interface AdminReview {
  id: string;
  name: string;
  role: string;
  relativeDate: string;
  text: string;
  rating: number;
  avatar: string;
  accent: string;
}

interface AdminBlogPost {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  excerpt: string;
  category: string;
  coverImage: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  publishedAt: string;
  readTime: number;
  likes: number;
  tags: string[];
  status: "draft" | "published";
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  body: string;
}

interface WebContentResponse {
  settings: WebLandingSettings;
  reviews: AdminReview[];
  blogPosts: AdminBlogPost[];
  updatedAt: {
    settings: string | null;
    reviews: string | null;
    blogPosts: string | null;
  };
}

interface AdminSessionPackage {
  id: string;
  professionalId: string | null;
  professionalName: string | null;
  stripePriceId: string;
  name: string;
  credits: number;
  priceCents: number;
  currency: string;
  active: boolean;
  createdAt: string;
  purchasesCount: number;
}

interface SessionPackagesResponse {
  sessionPackages: AdminSessionPackage[];
}

interface AdminPatientOps {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  timezone: string;
  status: string;
  latestPurchase: {
    id: string;
    packageName: string;
    totalCredits: number;
    remainingCredits: number;
    purchasedAt: string;
  } | null;
  bookingsCount: number;
  creditBalance: number;
}

interface PatientsResponse {
  patients: AdminPatientOps[];
}

interface AdminProfessionalOps {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  visible: boolean;
  cancellationHours: number;
  bio: string | null;
  therapeuticApproach: string | null;
  yearsExperience: number | null;
  photoUrl: string | null;
  videoUrl: string | null;
  bookingsCount: number;
  slots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    isBlocked: boolean;
    source: string;
  }>;
}

interface ProfessionalsResponse {
  professionals: AdminProfessionalOps[];
}

interface AdminBookingOps {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  startsAt: string;
  endsAt: string;
  status: "REQUESTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  consumedCredits: number;
  cancellationReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
}

interface AdminBookingsResponse {
  bookings: AdminBookingOps[];
}

interface CreateUserFormState {
  role: Role;
  fullName: string;
  email: string;
  password: string;
  timezone: string;
  patientStatus: PatientStatus;
  professionalVisible: boolean;
  professionalCancellationHours: string;
  professionalBio: string;
  professionalTherapeuticApproach: string;
  professionalYearsExperience: string;
  professionalPhotoUrl: string;
  professionalVideoUrl: string;
}

interface EditUserDraft {
  role: Role;
  fullName: string;
  password: string;
  patientStatus: PatientStatus;
  patientTimezone: string;
  professionalVisible: boolean;
  professionalCancellationHours: string;
  professionalBio: string;
  professionalTherapeuticApproach: string;
  professionalYearsExperience: string;
  professionalPhotoUrl: string;
  professionalVideoUrl: string;
}

const API_BASE =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "therapy_admin_token";
const USER_KEY = "therapy_admin_user";
const LANGUAGE_KEY = "therapy_admin_language";
const CURRENCY_KEY = "therapy_admin_currency";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const links: Array<{ to: PortalPath; label: string }> = [
  { to: "/", label: "Dashboard" },
  { to: "/patients", label: "Pacientes" },
  { to: "/professionals", label: "Psicologos" },
  { to: "/sessions", label: "Sesiones" },
  { to: "/finances", label: "Finanzas" },
  { to: "/calendar", label: "Calendario" },
  { to: "/library", label: "Biblioteca" },
  { to: "/imports", label: "Importaciones" },
  { to: "/users", label: "Usuarios" },
  { to: "/web-admin", label: "Administrador Web" },
  { to: "/settings", label: "Configuracion" },
  { to: "/ai", label: "IA Audit" }
];

const defaultCreateForm: CreateUserFormState = {
  role: "PATIENT",
  fullName: "",
  email: "",
  password: "SecurePass123",
  timezone: "America/New_York",
  patientStatus: "active",
  professionalVisible: true,
  professionalCancellationHours: "24",
  professionalBio: "",
  professionalTherapeuticApproach: "",
  professionalYearsExperience: "",
  professionalPhotoUrl: "",
  professionalVideoUrl: ""
};

async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;

    try {
      const payload = (await response.json()) as ApiErrorPayload;
      if (payload.error) {
        errorMessage = payload.error;
      }
    } catch {
      // noop
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
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

function formatMoneyCents(cents: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyCents({
    centsInUsd: cents,
    language,
    currency,
    maximumFractionDigits: 0
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

function readStoredUser(): AuthUser | null {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);

  if (!token || !rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser) as AuthUser;
    if (user.role !== "ADMIN") {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

function buildEditDraft(user: AdminUser): EditUserDraft {
  return {
    role: user.role,
    fullName: user.fullName,
    password: "",
    patientStatus: (user.patientProfile?.status as PatientStatus) ?? "active",
    patientTimezone: user.patientProfile?.timezone ?? "America/New_York",
    professionalVisible: user.professionalProfile?.visible ?? true,
    professionalCancellationHours: String(user.professionalProfile?.cancellationHours ?? 24),
    professionalBio: user.professionalProfile?.bio ?? "",
    professionalTherapeuticApproach: user.professionalProfile?.therapeuticApproach ?? "",
    professionalYearsExperience:
      user.professionalProfile?.yearsExperience !== null && user.professionalProfile?.yearsExperience !== undefined
        ? String(user.professionalProfile.yearsExperience)
        : "",
    professionalPhotoUrl: user.professionalProfile?.photoUrl ?? "",
    professionalVideoUrl: user.professionalProfile?.videoUrl ?? ""
  };
}

function parseIntField(rawValue: string): number | null {
  const value = rawValue.trim();
  if (value.length === 0) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read file"));
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode image"));
    image.src = dataUrl;
  });
}

async function compressImageDataUrl(dataUrl: string, maxWidth = 1600, quality = 0.82): Promise<string> {
  const image = await loadImage(dataUrl);
  const scale = image.width > maxWidth ? maxWidth / image.width : 1;
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return dataUrl;
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", quality);
}

function roleLabel(role: Role, language: AppLanguage): string {
  if (role === "PATIENT") {
    return t(language, { es: "Paciente", en: "Patient", pt: "Paciente" });
  }
  if (role === "PROFESSIONAL") {
    return t(language, { es: "Profesional", en: "Professional", pt: "Profissional" });
  }
  return "Admin";
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

function yesNoLabel(value: boolean, language: AppLanguage): string {
  return value
    ? t(language, { es: "Si", en: "Yes", pt: "Sim" })
    : t(language, { es: "No", en: "No", pt: "Nao" });
}

function AuthScreen(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  onAuthSuccess: (token: string, user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("Motivarte Admin");
  const [email, setEmail] = useState("admin@motivarte.com");
  const [password, setPassword] = useState("SecurePass123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";

      const payload =
        mode === "register"
          ? {
              email: email.trim().toLowerCase(),
              password,
              fullName: fullName.trim(),
              role: "ADMIN" as const
            }
          : {
              email: email.trim().toLowerCase(),
              password
            };

      const response = await apiRequest<AuthApiResponse>(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.user.role !== "ADMIN") {
        throw new Error(
          t(props.language, {
            es: "Esta cuenta no pertenece al portal admin.",
            en: "This account does not belong to the admin portal.",
            pt: "Esta conta nao pertence ao portal admin."
          })
        );
      }

      props.onAuthSuccess(response.token, {
        id: response.user.id,
        email: response.user.email,
        fullName: response.user.fullName,
        role: "ADMIN"
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, { es: "No se pudo autenticar.", en: "Could not authenticate.", pt: "Nao foi possivel autenticar." })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="admin-brand auth-brand">
          <span className="admin-brand-mark" aria-hidden="true" />
          <div>
            <strong>motivarcare</strong>
            <p>{t(props.language, { es: "Admin", en: "Admin", pt: "Admin" })}</p>
          </div>
        </div>
        <span className="chip">{t(props.language, { es: "Portal admin", en: "Admin portal", pt: "Portal admin" })}</span>
        <h1>{t(props.language, { es: "Gestion de usuarios, pagos y politicas", en: "User, payment, and policy management", pt: "Gestao de usuarios, pagamentos e politicas" })}</h1>
        <p>
          {t(props.language, {
            es: "Accede como administrador para operar pacientes, profesionales y configuraciones criticas.",
            en: "Sign in as admin to operate patients, professionals, and critical settings.",
            pt: "Acesse como administrador para operar pacientes, profissionais e configuracoes criticas."
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
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
            {t(props.language, { es: "Ingresar", en: "Sign in", pt: "Entrar" })}
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>
            {t(props.language, { es: "Crear admin", en: "Create admin", pt: "Criar admin" })}
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
            {t(props.language, { es: "Email", en: "Email", pt: "Email" })}
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            {t(props.language, { es: "Contrasena", en: "Password", pt: "Senha" })}
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="primary" disabled={loading} type="submit">
            {loading
              ? t(props.language, { es: "Validando...", en: "Validating...", pt: "Validando..." })
              : mode === "register"
                ? t(props.language, { es: "Crear admin", en: "Create admin", pt: "Criar admin" })
                : t(props.language, { es: "Ingresar", en: "Sign in", pt: "Entrar" })}
          </button>
        </form>
      </section>
    </div>
  );
}

function OverviewPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const [response, setResponse] = useState<KpisResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await apiRequest<KpisResponse>("/api/admin/kpis", {}, props.token);
        if (active) {
          setResponse(data);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : t(props.language, {
                  es: "No se pudo cargar el overview.",
                  en: "Could not load the overview.",
                  pt: "Nao foi possivel carregar a visao geral."
                })
          );
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [props.token]);

  if (error) {
    return (
      <section className="card">
        <p className="error-text">{error}</p>
      </section>
    );
  }

  if (!response) {
    return (
      <section className="card">
        <p>{t(props.language, { es: "Cargando overview...", en: "Loading overview...", pt: "Carregando visao geral..." })}</p>
      </section>
    );
  }

  return (
    <section className="card stack">
      <h2>{t(props.language, { es: "Overview operativo", en: "Operational overview", pt: "Visao operacional" })}</h2>
      <div className="kpi-grid">
        <article className="kpi-card">
          <span>{t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })}</span>
          <strong>{response.kpis.activePatients}</strong>
        </article>
        <article className="kpi-card">
          <span>{t(props.language, { es: "Profesionales visibles", en: "Visible professionals", pt: "Profissionais visiveis" })}</span>
          <strong>{response.kpis.activeProfessionals}</strong>
        </article>
        <article className="kpi-card">
          <span>{t(props.language, { es: "Sesiones agendadas", en: "Scheduled sessions", pt: "Sessoes agendadas" })}</span>
          <strong>{response.kpis.scheduledSessions}</strong>
        </article>
        <article className="kpi-card">
          <span>{t(props.language, { es: "Revenue mensual", en: "Monthly revenue", pt: "Receita mensal" })}</span>
          <strong>{formatMoneyCents(response.kpis.monthlyRevenueCents, props.language, props.currency)}</strong>
        </article>
      </div>
      <p>{response.note}</p>
    </section>
  );
}

function AdminDashboardPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  return (
    <div className="stack-lg">
      <OverviewPage token={props.token} language={props.language} currency={props.currency} />
      <section className="card stack">
        <h2>{t(props.language, { es: "Estructura operativa", en: "Operational structure", pt: "Estrutura operacional" })}</h2>
        <p>
          {t(props.language, {
            es: "Dashboard con la estructura de Acompanarte adaptada a MotivarCare: pacientes, psicologos, sesiones, finanzas y administracion.",
            en: "Dashboard with Acompanarte structure adapted to MotivarCare: patients, psychologists, sessions, finance, and administration.",
            pt: "Dashboard com a estrutura do Acompanarte adaptada para MotivarCare: pacientes, psicologos, sessoes, financas e administracao."
          })}
        </p>
      </section>
    </div>
  );
}

function ModulePlaceholderPage(props: {
  language: AppLanguage;
  title: LocalizedText;
  description: LocalizedText;
  imageUrl?: string;
  imageAlt?: LocalizedText;
}) {
  return (
    <section className="card module-placeholder-card">
      <div className="module-placeholder-copy">
        <h2>{t(props.language, props.title)}</h2>
        <p>{t(props.language, props.description)}</p>
      </div>
      {typeof props.imageUrl === "string" && props.imageUrl.length > 0 ? (
        <figure className="module-placeholder-image">
          <img src={props.imageUrl} alt={t(props.language, props.imageAlt ?? props.title)} loading="lazy" />
        </figure>
      ) : null}
    </section>
  );
}

function PatientsOpsPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const [packages, setPackages] = useState<AdminSessionPackage[]>([]);
  const [patients, setPatients] = useState<AdminPatientOps[]>([]);
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

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [packagesResponse, patientsResponse] = await Promise.all([
        apiRequest<SessionPackagesResponse>("/api/admin/session-packages", {}, props.token),
        apiRequest<PatientsResponse>("/api/admin/patients", {}, props.token)
      ]);
      setPackages(packagesResponse.sessionPackages);
      setPatients(patientsResponse.patients);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load patient operations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [props.token]);

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
        `/api/admin/session-packages/${item.id}`,
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
        `/api/admin/patients/${patientId}/credits`,
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            note: `Admin adjustment ${amount > 0 ? "+" : ""}${amount}`
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

  return (
    <div className="stack-lg ops-page">
      <section className="card stack ops-panel">
        <h2>{t(props.language, { es: "Pacientes · Soporte operativo", en: "Patients · Operational support", pt: "Pacientes · Suporte operacional" })}</h2>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        {loading ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
      </section>

      <section className="card stack ops-panel">
        <h3>{t(props.language, { es: "Tarjetas de venta (planes)", en: "Sales cards (plans)", pt: "Cartoes de venda (planos)" })}</h3>
        <div className="grid-form">
          <label>
            Nombre
            <input value={createPackage.name} onChange={(event) => setCreatePackage((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            Creditos
            <input value={createPackage.credits} onChange={(event) => setCreatePackage((current) => ({ ...current, credits: event.target.value }))} />
          </label>
          <label>
            Price cents
            <input value={createPackage.priceCents} onChange={(event) => setCreatePackage((current) => ({ ...current, priceCents: event.target.value }))} />
          </label>
          <label>
            Currency
            <input value={createPackage.currency} onChange={(event) => setCreatePackage((current) => ({ ...current, currency: event.target.value }))} />
          </label>
        </div>
        <div className="button-row ops-actions">
          <button className="primary" type="button" onClick={() => void createPackageAction()}>Crear plan</button>
        </div>
        {packages.map((item) => (
          <article key={item.id} className="user-card ops-entity-card">
            <header>
              <div>
                <h3>{item.name}</h3>
                <p>{formatMoneyCents(item.priceCents, props.language, props.currency)} · {item.credits} creditos · {item.purchasesCount} compras</p>
              </div>
              <span className="role-pill">{item.active ? "Activo" : "Inactivo"}</span>
            </header>
            <div className="toolbar-actions ops-actions">
              <button type="button" onClick={() => void updatePackage(item, { active: !item.active })}>{item.active ? "Desactivar" : "Activar"}</button>
              <button type="button" onClick={() => void updatePackage(item, { priceCents: item.priceCents + 1000 })}>+1000 cents</button>
            </div>
          </article>
        ))}
      </section>

      <section className="card stack ops-panel">
        <h3>{t(props.language, { es: "Pacientes y ajustes", en: "Patients and adjustments", pt: "Pacientes e ajustes" })}</h3>
        {patients.map((patient) => (
          <article key={patient.id} className="user-card ops-entity-card">
            <header>
              <div>
                <h3>{patient.fullName}</h3>
                <p>{patient.email} · {patient.status} · {patient.timezone}</p>
              </div>
              <span className="role-pill">Balance {patient.creditBalance}</span>
            </header>
            <p>
              Ultimo plan: {patient.latestPurchase ? `${patient.latestPurchase.packageName} (${patient.latestPurchase.remainingCredits}/${patient.latestPurchase.totalCredits})` : "Sin plan"}
            </p>
            <div className="toolbar-actions ops-actions">
              <input
                placeholder="+2 / -1"
                value={creditAdjustments[patient.id] ?? ""}
                onChange={(event) => setCreditAdjustments((current) => ({ ...current, [patient.id]: event.target.value }))}
              />
              <button type="button" onClick={() => void adjustCredits(patient.id)}>Ajustar creditos</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function ProfessionalsOpsPage(props: { token: string; language: AppLanguage }) {
  const [professionals, setProfessionals] = useState<AdminProfessionalOps[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotDrafts, setSlotDrafts] = useState<Record<string, { startsAt: string; endsAt: string }>>({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<ProfessionalsResponse>("/api/admin/professionals", {}, props.token);
      setProfessionals(data.professionals);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load professionals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [props.token]);

  const patchProfessional = async (professional: AdminProfessionalOps, patch: { visible?: boolean; cancellationHours?: number }) => {
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ professional: AdminProfessionalOps }>(
        `/api/admin/professionals/${professional.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch)
        },
        props.token
      );
      setSuccess("Professional updated");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update professional");
    }
  };

  const createSlot = async (professionalId: string) => {
    const draft = slotDrafts[professionalId];
    if (!draft?.startsAt || !draft?.endsAt) {
      setError("Slot requires startsAt and endsAt");
      return;
    }

    setError("");
    setSuccess("");
    try {
      await apiRequest<{ slot: unknown }>(
        `/api/admin/professionals/${professionalId}/slots`,
        {
          method: "POST",
          body: JSON.stringify({ startsAt: new Date(draft.startsAt).toISOString(), endsAt: new Date(draft.endsAt).toISOString() })
        },
        props.token
      );
      setSlotDrafts((current) => ({ ...current, [professionalId]: { startsAt: "", endsAt: "" } }));
      setSuccess("Slot created");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create slot");
    }
  };

  const deleteSlot = async (professionalId: string, slotId: string) => {
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ success: boolean }>(
        `/api/admin/professionals/${professionalId}/slots/${slotId}`,
        { method: "DELETE" },
        props.token
      );
      setSuccess("Slot deleted");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete slot");
    }
  };

  return (
    <div className="stack-lg ops-page">
      <section className="card stack ops-panel">
        <h2>{t(props.language, { es: "Profesionales · ABM + disponibilidad", en: "Professionals · CRUD + availability", pt: "Profissionais · CRUD + disponibilidade" })}</h2>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        {loading ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
      </section>
      {professionals.map((professional) => (
        <section key={professional.id} className="card stack ops-panel">
          <header className="toolbar">
            <div>
              <h3>{professional.fullName}</h3>
              <p>{professional.email} · bookings {professional.bookingsCount}</p>
            </div>
            <div className="toolbar-actions ops-actions">
              <button type="button" onClick={() => void patchProfessional(professional, { visible: !professional.visible })}>
                {professional.visible ? "Ocultar" : "Publicar"}
              </button>
              <button type="button" onClick={() => void patchProfessional(professional, { cancellationHours: professional.cancellationHours + 1 })}>
                +1h cancelacion
              </button>
            </div>
          </header>
          <div className="grid-form">
            <label>
              Slot inicio
              <input
                type="datetime-local"
                value={slotDrafts[professional.id]?.startsAt ?? ""}
                onChange={(event) =>
                  setSlotDrafts((current) => ({
                    ...current,
                    [professional.id]: { startsAt: event.target.value, endsAt: current[professional.id]?.endsAt ?? "" }
                  }))
                }
              />
            </label>
            <label>
              Slot fin
              <input
                type="datetime-local"
                value={slotDrafts[professional.id]?.endsAt ?? ""}
                onChange={(event) =>
                  setSlotDrafts((current) => ({
                    ...current,
                    [professional.id]: { startsAt: current[professional.id]?.startsAt ?? "", endsAt: event.target.value }
                  }))
                }
              />
            </label>
          </div>
          <div className="button-row ops-actions">
            <button type="button" onClick={() => void createSlot(professional.id)}>Crear slot</button>
          </div>
          <div className="stack">
            {professional.slots.slice(0, 12).map((slot) => (
              <div key={slot.id} className="toolbar ops-slot-row">
                <p>{formatDate(slot.startsAt, props.language)} - {formatDate(slot.endsAt, props.language)}</p>
                <button type="button" onClick={() => void deleteSlot(professional.id, slot.id)}>Eliminar</button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SessionsOpsPage(props: { token: string; language: AppLanguage }) {
  const [bookings, setBookings] = useState<AdminBookingOps[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | AdminBookingOps["status"]>("");
  const [drafts, setDrafts] = useState<Record<string, { status: AdminBookingOps["status"]; startsAt: string; endsAt: string }>>({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (statusFilter) {
        query.set("status", statusFilter);
      }
      const response = await apiRequest<AdminBookingsResponse>(
        `/api/admin/bookings${query.toString().length > 0 ? `?${query.toString()}` : ""}`,
        {},
        props.token
      );
      setBookings(response.bookings);
      setDrafts((current) => {
        const next: Record<string, { status: AdminBookingOps["status"]; startsAt: string; endsAt: string }> = { ...current };
        for (const booking of response.bookings) {
          if (!next[booking.id]) {
            next[booking.id] = {
              status: booking.status,
              startsAt: isoToInputDateTime(booking.startsAt),
              endsAt: isoToInputDateTime(booking.endsAt)
            };
          }
        }
        return next;
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [props.token, statusFilter]);

  const saveBooking = async (booking: AdminBookingOps) => {
    const draft = drafts[booking.id];
    if (!draft) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ booking: AdminBookingOps }>(
        `/api/admin/bookings/${booking.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: draft.status,
            startsAt: new Date(draft.startsAt).toISOString(),
            endsAt: new Date(draft.endsAt).toISOString()
          })
        },
        props.token
      );
      setSuccess("Booking updated");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update booking");
    }
  };

  return (
    <div className="stack-lg ops-page">
      <section className="card stack ops-panel">
        <header className="toolbar">
          <h2>{t(props.language, { es: "Sesiones · ABM operativo", en: "Sessions · Operational CRUD", pt: "Sessoes · CRUD operacional" })}</h2>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | AdminBookingOps["status"])}>
            <option value="">Todos</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>
        </header>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        {loading ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
      </section>

      {bookings.map((booking) => {
        const draft = drafts[booking.id];
        if (!draft) {
          return null;
        }
        return (
          <section key={booking.id} className="card stack ops-panel">
            <header>
              <h3>{booking.patientName} ↔ {booking.professionalName}</h3>
              <p>ID: {booking.id}</p>
            </header>
            <div className="grid-form">
              <label>
                Estado
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [booking.id]: { ...current[booking.id], status: event.target.value as AdminBookingOps["status"] }
                    }))
                  }
                >
                  <option value="REQUESTED">REQUESTED</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="NO_SHOW">NO_SHOW</option>
                </select>
              </label>
              <label>
                Inicio
                <input
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [booking.id]: { ...current[booking.id], startsAt: event.target.value }
                    }))
                  }
                />
              </label>
              <label>
                Fin
                <input
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [booking.id]: { ...current[booking.id], endsAt: event.target.value }
                    }))
                  }
                />
              </label>
            </div>
            <div className="button-row ops-actions">
              <button type="button" className="primary" onClick={() => void saveBooking(booking)}>Guardar sesion</button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function UsersPage(props: { token: string; language: AppLanguage }) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [createForm, setCreateForm] = useState<CreateUserFormState>(defaultCreateForm);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, EditUserDraft>>({});
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users]);

  const loadUsers = async () => {
    setListLoading(true);
    setListError("");

    try {
      const query = new URLSearchParams();
      if (roleFilter !== "ALL") {
        query.set("role", roleFilter);
      }
      if (search.trim().length > 0) {
        query.set("search", search.trim());
      }

      const response = await apiRequest<UsersResponse>(
        `/api/admin/users${query.toString().length > 0 ? `?${query.toString()}` : ""}`,
        {},
        props.token
      );

      setUsers(response.users);
    } catch (requestError) {
      setListError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo cargar usuarios.",
              en: "Could not load users.",
              pt: "Nao foi possivel carregar usuarios."
            })
      );
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [props.token, roleFilter, search]);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    const professionalCancellationHours = parseIntField(createForm.professionalCancellationHours);
    if (createForm.role === "PROFESSIONAL" && professionalCancellationHours === null) {
      setCreateError(
        t(props.language, {
          es: "Horas de cancelacion invalidas.",
          en: "Invalid cancellation hours.",
          pt: "Horas de cancelamento invalidas."
        })
      );
      return;
    }

    const professionalYearsExperience = parseIntField(createForm.professionalYearsExperience);
    if (createForm.role === "PROFESSIONAL" && createForm.professionalYearsExperience.trim().length > 0 && professionalYearsExperience === null) {
      setCreateError(
        t(props.language, {
          es: "Anos de experiencia invalidos.",
          en: "Invalid years of experience.",
          pt: "Anos de experiencia invalidos."
        })
      );
      return;
    }

    const payload: {
      email: string;
      fullName: string;
      password: string;
      role: Role;
      timezone?: string;
      patientStatus?: PatientStatus;
      professionalVisible?: boolean;
      professionalCancellationHours?: number;
      professionalBio?: string;
      professionalTherapeuticApproach?: string;
      professionalYearsExperience?: number;
      professionalPhotoUrl?: string;
      professionalVideoUrl?: string;
    } = {
      email: createForm.email.trim().toLowerCase(),
      fullName: createForm.fullName.trim(),
      password: createForm.password,
      role: createForm.role
    };

    if (createForm.role === "PATIENT") {
      payload.timezone = createForm.timezone.trim() || "America/New_York";
      payload.patientStatus = createForm.patientStatus;
    }

    if (createForm.role === "PROFESSIONAL") {
      payload.professionalVisible = createForm.professionalVisible;
      payload.professionalCancellationHours = professionalCancellationHours ?? 24;
      payload.professionalBio = createForm.professionalBio.trim();
      payload.professionalTherapeuticApproach = createForm.professionalTherapeuticApproach.trim();
      if (professionalYearsExperience !== null) {
        payload.professionalYearsExperience = professionalYearsExperience;
      }
      if (createForm.professionalPhotoUrl.trim().length > 0) {
        payload.professionalPhotoUrl = createForm.professionalPhotoUrl.trim();
      }
      if (createForm.professionalVideoUrl.trim().length > 0) {
        payload.professionalVideoUrl = createForm.professionalVideoUrl.trim();
      }
    }

    setCreateLoading(true);

    try {
      await apiRequest<{ user: AdminUser }>(
        "/api/admin/users",
        {
          method: "POST",
          body: JSON.stringify(payload)
        },
        props.token
      );

      setCreateForm((current) => ({
        ...defaultCreateForm,
        role: current.role,
        password: current.password
      }));
      setCreateSuccess(
        t(props.language, {
          es: "Usuario creado correctamente.",
          en: "User created successfully.",
          pt: "Usuario criado com sucesso."
        })
      );
      await loadUsers();
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo crear el usuario.",
              en: "Could not create the user.",
              pt: "Nao foi possivel criar o usuario."
            })
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (user: AdminUser) => {
    setEditingUserId(user.id);
    setEditError("");
    setEditSuccess("");
    setEditDrafts((current) => ({
      ...current,
      [user.id]: buildEditDraft(user)
    }));
  };

  const saveEdit = async (user: AdminUser) => {
    const draft = editDrafts[user.id];
    if (!draft) {
      return;
    }

    setSaveLoading(true);
    setEditError("");
    setEditSuccess("");

    const payload: {
      fullName: string;
      password?: string;
      patientStatus?: PatientStatus;
      patientTimezone?: string;
      professionalVisible?: boolean;
      professionalCancellationHours?: number;
      professionalBio?: string;
      professionalTherapeuticApproach?: string;
      professionalYearsExperience?: number;
      professionalPhotoUrl?: string | null;
      professionalVideoUrl?: string | null;
    } = {
      fullName: draft.fullName.trim()
    };

    if (draft.password.trim().length > 0) {
      payload.password = draft.password.trim();
    }

    if (draft.role === "PATIENT") {
      payload.patientStatus = draft.patientStatus;
      payload.patientTimezone = draft.patientTimezone.trim() || "America/New_York";
    }

    if (draft.role === "PROFESSIONAL") {
      const cancellationHours = parseIntField(draft.professionalCancellationHours);
      if (cancellationHours === null) {
        setSaveLoading(false);
        setEditError(
          t(props.language, {
            es: "Horas de cancelacion invalidas.",
            en: "Invalid cancellation hours.",
            pt: "Horas de cancelamento invalidas."
          })
        );
        return;
      }

      const yearsExperience = parseIntField(draft.professionalYearsExperience);
      if (draft.professionalYearsExperience.trim().length > 0 && yearsExperience === null) {
        setSaveLoading(false);
        setEditError(
          t(props.language, {
            es: "Anos de experiencia invalidos.",
            en: "Invalid years of experience.",
            pt: "Anos de experiencia invalidos."
          })
        );
        return;
      }

      payload.professionalVisible = draft.professionalVisible;
      payload.professionalCancellationHours = cancellationHours ?? 24;
      payload.professionalBio = draft.professionalBio;
      payload.professionalTherapeuticApproach = draft.professionalTherapeuticApproach;
      if (yearsExperience !== null) {
        payload.professionalYearsExperience = yearsExperience;
      }
      payload.professionalPhotoUrl = draft.professionalPhotoUrl.trim().length > 0 ? draft.professionalPhotoUrl.trim() : null;
      payload.professionalVideoUrl = draft.professionalVideoUrl.trim().length > 0 ? draft.professionalVideoUrl.trim() : null;
    }

    try {
      await apiRequest<{ user: AdminUser }>(
        `/api/admin/users/${user.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload)
        },
        props.token
      );

      setEditSuccess(
        t(props.language, {
          es: "Usuario actualizado.",
          en: "User updated.",
          pt: "Usuario atualizado."
        })
      );
      setEditingUserId(null);
      await loadUsers();
    } catch (requestError) {
      setEditError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo actualizar el usuario.",
              en: "Could not update the user.",
              pt: "Nao foi possivel atualizar o usuario."
            })
      );
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="stack-lg">
      <section className="card stack">
        <header className="toolbar">
          <div>
            <h2>{t(props.language, { es: "Modulo de usuarios", en: "User module", pt: "Modulo de usuarios" })}</h2>
            <p>
              {t(props.language, {
                es: "Alta y edicion de pacientes, profesionales y administradores.",
                en: "Create and edit patients, professionals, and admins.",
                pt: "Criacao e edicao de pacientes, profissionais e administradores."
              })}
            </p>
          </div>

          <div className="toolbar-actions">
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}>
              <option value="ALL">{t(props.language, { es: "Todos los roles", en: "All roles", pt: "Todos os perfis" })}</option>
              <option value="PATIENT">{t(props.language, { es: "Pacientes", en: "Patients", pt: "Pacientes" })}</option>
              <option value="PROFESSIONAL">{t(props.language, { es: "Profesionales", en: "Professionals", pt: "Profissionais" })}</option>
              <option value="ADMIN">Admin</option>
            </select>

            <form
              className="search-row"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput);
              }}
            >
              <input
                placeholder={t(props.language, {
                  es: "Buscar por email o nombre",
                  en: "Search by email or name",
                  pt: "Buscar por email ou nome"
                })}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <button type="submit">{t(props.language, { es: "Buscar", en: "Search", pt: "Buscar" })}</button>
            </form>
          </div>
        </header>

        {listError ? <p className="error-text">{listError}</p> : null}
        {editError ? <p className="error-text">{editError}</p> : null}
        {editSuccess ? <p className="success-text">{editSuccess}</p> : null}

        {listLoading ? <p>{t(props.language, { es: "Cargando usuarios...", en: "Loading users...", pt: "Carregando usuarios..." })}</p> : null}
        {!listLoading && sortedUsers.length === 0 ? (
          <p>{t(props.language, { es: "No hay usuarios para el filtro actual.", en: "No users for the current filter.", pt: "Nao ha usuarios para o filtro atual." })}</p>
        ) : null}

        {!listLoading
          ? sortedUsers.map((user) => {
              const draft = editDrafts[user.id];
              const isEditing = editingUserId === user.id && Boolean(draft);

              return (
                <article className="user-card" key={user.id}>
                  <header>
                    <div>
                      <h3>{user.fullName}</h3>
                      <p>{user.email}</p>
                    </div>
                    <span className="role-pill">{roleLabel(user.role, props.language)}</span>
                  </header>

                  <div className="user-grid">
                    <div>
                      <strong>{t(props.language, { es: "Creado", en: "Created", pt: "Criado" })}</strong>
                      <p>{formatDate(user.createdAt, props.language)}</p>
                    </div>
                    <div>
                      <strong>{t(props.language, { es: "Actualizado", en: "Updated", pt: "Atualizado" })}</strong>
                      <p>{formatDate(user.updatedAt, props.language)}</p>
                    </div>

                    {user.patientProfile ? (
                      <>
                        <div>
                          <strong>{t(props.language, { es: "Paciente · Estado", en: "Patient · Status", pt: "Paciente · Status" })}</strong>
                          <p>{patientStatusLabel(user.patientProfile.status, props.language)}</p>
                        </div>
                        <div>
                          <strong>{t(props.language, { es: "Paciente · Zona horaria", en: "Patient · Time zone", pt: "Paciente · Fuso horario" })}</strong>
                          <p>{user.patientProfile.timezone}</p>
                        </div>
                      </>
                    ) : null}

                    {user.professionalProfile ? (
                      <>
                        <div>
                          <strong>{t(props.language, { es: "Profesional · Visible", en: "Professional · Visible", pt: "Profissional · Visivel" })}</strong>
                          <p>{yesNoLabel(user.professionalProfile.visible, props.language)}</p>
                        </div>
                        <div>
                          <strong>{t(props.language, { es: "Horas cancelacion", en: "Cancellation hours", pt: "Horas de cancelamento" })}</strong>
                          <p>{user.professionalProfile.cancellationHours}h</p>
                        </div>
                        <div>
                          <strong>{t(props.language, { es: "Bio", en: "Bio", pt: "Bio" })}</strong>
                          <p>{user.professionalProfile.bio || "-"}</p>
                        </div>
                        <div>
                          <strong>{t(props.language, { es: "Video presentacion", en: "Intro video", pt: "Video de apresentacao" })}</strong>
                          <p>{user.professionalProfile.videoUrl || "-"}</p>
                        </div>
                      </>
                    ) : null}
                  </div>

                  {isEditing && draft ? (
                    <div className="stack">
                      <div className="grid-form">
                        <label>
                          {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
                          <input
                            value={draft.fullName}
                            onChange={(event) =>
                              setEditDrafts((current) => ({
                                ...current,
                                [user.id]: {
                                  ...draft,
                                  fullName: event.target.value
                                }
                              }))
                            }
                          />
                        </label>

                        <label>
                          {t(props.language, { es: "Nueva contrasena (opcional)", en: "New password (optional)", pt: "Nova senha (opcional)" })}
                          <input
                            type="password"
                            value={draft.password}
                            onChange={(event) =>
                              setEditDrafts((current) => ({
                                ...current,
                                [user.id]: {
                                  ...draft,
                                  password: event.target.value
                                }
                              }))
                            }
                          />
                        </label>

                        {draft.role === "PATIENT" ? (
                          <>
                            <label>
                              {t(props.language, { es: "Estado del paciente", en: "Patient status", pt: "Status do paciente" })}
                              <select
                                value={draft.patientStatus}
                                onChange={(event) =>
                                  setEditDrafts((current) => ({
                                    ...current,
                                    [user.id]: {
                                      ...draft,
                                      patientStatus: event.target.value as PatientStatus
                                    }
                                  }))
                                }
                              >
                                <option value="active">{patientStatusLabel("active", props.language)}</option>
                                <option value="pause">{patientStatusLabel("pause", props.language)}</option>
                                <option value="cancelled">{patientStatusLabel("cancelled", props.language)}</option>
                                <option value="trial">{patientStatusLabel("trial", props.language)}</option>
                              </select>
                            </label>

                            <label>
                              {t(props.language, { es: "Zona horaria", en: "Time zone", pt: "Fuso horario" })}
                              <input
                                value={draft.patientTimezone}
                                onChange={(event) =>
                                  setEditDrafts((current) => ({
                                    ...current,
                                    [user.id]: {
                                      ...draft,
                                      patientTimezone: event.target.value
                                    }
                                  }))
                                }
                              />
                            </label>
                          </>
                        ) : null}

                        {draft.role === "PROFESSIONAL" ? (
                          <>
                            <label className="inline-toggle">
                              <input
                                checked={draft.professionalVisible}
                                type="checkbox"
                                onChange={(event) =>
                                  setEditDrafts((current) => ({
                                    ...current,
                                    [user.id]: {
                                      ...draft,
                                      professionalVisible: event.target.checked
                                    }
                                  }))
                                }
                              />
                              {t(props.language, { es: "Perfil visible", en: "Visible profile", pt: "Perfil visivel" })}
                            </label>

                            <label>
                              {t(props.language, { es: "Horas de cancelacion", en: "Cancellation hours", pt: "Horas de cancelamento" })}
                              <input
                                value={draft.professionalCancellationHours}
                                onChange={(event) =>
                                  setEditDrafts((current) => ({
                                    ...current,
                                    [user.id]: {
                                      ...draft,
                                      professionalCancellationHours: event.target.value
                                    }
                                  }))
                                }
                              />
                            </label>

                            <label>
                              {t(props.language, { es: "Anos de experiencia", en: "Years of experience", pt: "Anos de experiencia" })}
                              <input
                                value={draft.professionalYearsExperience}
                                onChange={(event) =>
                                  setEditDrafts((current) => ({
                                    ...current,
                                    [user.id]: {
                                      ...draft,
                                      professionalYearsExperience: event.target.value
                                    }
                                  }))
                                }
                              />
                            </label>

                            <label>
                              {t(props.language, { es: "Bio", en: "Bio", pt: "Bio" })}
                              <textarea
                                rows={3}
                                value={draft.professionalBio}
                                onChange={(event) =>
                                  setEditDrafts((current) => ({
                                    ...current,
                                    [user.id]: {
                                      ...draft,
                                      professionalBio: event.target.value
                                    }
                                  }))
                                }
                              />
                            </label>

                            <label>
                              {t(props.language, { es: "Enfoque terapeutico", en: "Therapeutic approach", pt: "Abordagem terapeutica" })}
                              <input
                                value={draft.professionalTherapeuticApproach}
                                onChange={(event) =>
                                  setEditDrafts((current) => ({
                                    ...current,
                                    [user.id]: {
                                      ...draft,
                                      professionalTherapeuticApproach: event.target.value
                                    }
                                  }))
                                }
                              />
                            </label>

                            <label>
                              {t(props.language, { es: "URL de foto", en: "Photo URL", pt: "URL da foto" })}
                              <input
                                value={draft.professionalPhotoUrl}
                                onChange={(event) =>
                                  setEditDrafts((current) => ({
                                    ...current,
                                    [user.id]: {
                                      ...draft,
                                      professionalPhotoUrl: event.target.value
                                    }
                                  }))
                                }
                              />
                            </label>

                            <label>
                              {t(props.language, { es: "URL video presentacion", en: "Intro video URL", pt: "URL do video de apresentacao" })}
                              <input
                                value={draft.professionalVideoUrl}
                                onChange={(event) =>
                                  setEditDrafts((current) => ({
                                    ...current,
                                    [user.id]: {
                                      ...draft,
                                      professionalVideoUrl: event.target.value
                                    }
                                  }))
                                }
                              />
                            </label>
                          </>
                        ) : null}
                      </div>

                      <div className="user-card-footer">
                        <button className="primary" disabled={saveLoading} type="button" onClick={() => void saveEdit(user)}>
                          {saveLoading
                            ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                            : t(props.language, { es: "Guardar cambios", en: "Save changes", pt: "Salvar alteracoes" })}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserId(null);
                            setEditError("");
                          }}
                        >
                          {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <footer className="user-card-footer">
                    <small>ID: {user.id}</small>
                    <button type="button" onClick={() => openEdit(user)}>
                      {t(props.language, { es: "Editar", en: "Edit", pt: "Editar" })}
                    </button>
                  </footer>
                </article>
              );
            })
          : null}
      </section>

      <section className="card stack">
        <h2>{t(props.language, { es: "Alta de usuarios", en: "Create users", pt: "Criar usuarios" })}</h2>
        <p>{t(props.language, { es: "Registra pacientes, profesionales o admins desde este modulo.", en: "Register patients, professionals, or admins from this module.", pt: "Cadastre pacientes, profissionais ou admins neste modulo." })}</p>

        <form className="stack" onSubmit={handleCreateUser}>
          <div className="grid-form">
            <label>
              {t(props.language, { es: "Rol", en: "Role", pt: "Perfil" })}
              <select
                value={createForm.role}
                onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value as Role }))}
              >
                <option value="PATIENT">{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</option>
                <option value="PROFESSIONAL">{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>

            <label>
              {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
              <input
                value={createForm.fullName}
                onChange={(event) => setCreateForm((current) => ({ ...current, fullName: event.target.value }))}
              />
            </label>

            <label>
              {t(props.language, { es: "Email", en: "Email", pt: "Email" })}
              <input
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>

            <label>
              {t(props.language, { es: "Contrasena", en: "Password", pt: "Senha" })}
              <input
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>

            {createForm.role === "PATIENT" ? (
              <>
                <label>
                  {t(props.language, { es: "Zona horaria", en: "Time zone", pt: "Fuso horario" })}
                  <input
                    value={createForm.timezone}
                    onChange={(event) => setCreateForm((current) => ({ ...current, timezone: event.target.value }))}
                  />
                </label>

                <label>
                  {t(props.language, { es: "Estado paciente", en: "Patient status", pt: "Status do paciente" })}
                  <select
                    value={createForm.patientStatus}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, patientStatus: event.target.value as PatientStatus }))
                    }
                  >
                    <option value="active">{patientStatusLabel("active", props.language)}</option>
                    <option value="pause">{patientStatusLabel("pause", props.language)}</option>
                    <option value="cancelled">{patientStatusLabel("cancelled", props.language)}</option>
                    <option value="trial">{patientStatusLabel("trial", props.language)}</option>
                  </select>
                </label>
              </>
            ) : null}

            {createForm.role === "PROFESSIONAL" ? (
              <>
                <label className="inline-toggle">
                  <input
                    checked={createForm.professionalVisible}
                    type="checkbox"
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, professionalVisible: event.target.checked }))
                    }
                  />
                  {t(props.language, { es: "Perfil visible", en: "Visible profile", pt: "Perfil visivel" })}
                </label>

                <label>
                  {t(props.language, { es: "Horas de cancelacion", en: "Cancellation hours", pt: "Horas de cancelamento" })}
                  <input
                    value={createForm.professionalCancellationHours}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, professionalCancellationHours: event.target.value }))
                    }
                  />
                </label>

                <label>
                  {t(props.language, { es: "Anos de experiencia", en: "Years of experience", pt: "Anos de experiencia" })}
                  <input
                    value={createForm.professionalYearsExperience}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, professionalYearsExperience: event.target.value }))
                    }
                  />
                </label>

                <label>
                  {t(props.language, { es: "Bio", en: "Bio", pt: "Bio" })}
                  <textarea
                    rows={3}
                    value={createForm.professionalBio}
                    onChange={(event) => setCreateForm((current) => ({ ...current, professionalBio: event.target.value }))}
                  />
                </label>

                <label>
                  {t(props.language, { es: "Enfoque terapeutico", en: "Therapeutic approach", pt: "Abordagem terapeutica" })}
                  <input
                    value={createForm.professionalTherapeuticApproach}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, professionalTherapeuticApproach: event.target.value }))
                    }
                  />
                </label>

                <label>
                  {t(props.language, { es: "URL foto profesional", en: "Professional photo URL", pt: "URL da foto profissional" })}
                  <input
                    value={createForm.professionalPhotoUrl}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, professionalPhotoUrl: event.target.value }))
                    }
                  />
                </label>

                <label>
                  {t(props.language, { es: "URL video de presentacion", en: "Intro video URL", pt: "URL do video de apresentacao" })}
                  <input
                    value={createForm.professionalVideoUrl}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, professionalVideoUrl: event.target.value }))
                    }
                  />
                </label>
              </>
            ) : null}
          </div>

          {createError ? <p className="error-text">{createError}</p> : null}
          {createSuccess ? <p className="success-text">{createSuccess}</p> : null}

          <button className="primary" disabled={createLoading} type="submit">
            {createLoading
              ? t(props.language, { es: "Creando...", en: "Creating...", pt: "Criando..." })
              : t(props.language, { es: "Crear usuario", en: "Create user", pt: "Criar usuario" })}
          </button>
        </form>
      </section>
    </div>
  );
}

function InfoPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

function LandingSettingsPage({ token, language }: { token: string; language: AppLanguage }) {
  const [imageUrl, setImageUrl] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await apiRequest<LandingSettingsResponse>("/api/admin/landing-settings", {}, token);
        if (!active) {
          return;
        }
        setImageUrl(data.settings.patientHeroImageUrl ?? "");
        setUpdatedAt(data.updatedAt);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Error loading landing settings");
      } finally {
        if (active) {
          setInitialLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const trimmed = imageUrl.trim();
    if (trimmed.length > 0) {
      try {
        new URL(trimmed);
      } catch {
        setSaving(false);
        setError(t(language, { es: "Ingresa una URL valida", en: "Enter a valid URL", pt: "Informe uma URL valida" }));
        return;
      }
    }

    try {
      const data = await apiRequest<LandingSettingsResponse>(
        "/api/admin/landing-settings",
        {
          method: "PUT",
          body: JSON.stringify({
            patientHeroImageUrl: trimmed.length > 0 ? trimmed : null
          })
        },
        token
      );
      setUpdatedAt(data.updatedAt);
      setSuccess(
        t(language, {
          es: "Imagen de landing guardada correctamente.",
          en: "Landing image saved successfully.",
          pt: "Imagem da landing salva com sucesso."
        })
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error saving landing settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>{t(language, { es: "Landing: imagen principal de pacientes", en: "Landing: patient hero image", pt: "Landing: imagem principal de pacientes" })}</h2>
      <p>
        {t(language, {
          es: "Carga la URL de la imagen para el bloque Terapia online desde celular o notebook.",
          en: "Set the image URL for the Online therapy from your phone or laptop block.",
          pt: "Defina a URL da imagem para o bloco Terapia online pelo celular ou notebook."
        })}
      </p>

      <form className="stack" onSubmit={handleSubmit}>
        <label>
          {t(language, { es: "URL de imagen", en: "Image URL", pt: "URL da imagem" })}
          <input
            placeholder="https://..."
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            disabled={initialLoading || saving}
          />
        </label>

        {imageUrl.trim().length > 0 ? (
          <div className="user-card">
            <strong>{t(language, { es: "Vista previa", en: "Preview", pt: "Previa" })}</strong>
            <img src={imageUrl.trim()} alt="Landing patient hero preview" style={{ width: "100%", borderRadius: "12px", maxHeight: "280px", objectFit: "cover" }} />
          </div>
        ) : null}

        {updatedAt ? (
          <small>{t(language, { es: "Ultima actualizacion", en: "Last update", pt: "Ultima atualizacao" })}: {formatDate(updatedAt, language)}</small>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}

        <div className="toolbar-actions">
          <button className="primary" type="submit" disabled={initialLoading || saving}>
            {saving
              ? t(language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
              : t(language, { es: "Guardar imagen", en: "Save image", pt: "Salvar imagem" })}
          </button>
          <button
            type="button"
            onClick={() => setImageUrl("")}
            disabled={initialLoading || saving}
          >
            {t(language, { es: "Limpiar", en: "Clear", pt: "Limpar" })}
          </button>
        </div>
      </form>
    </section>
  );
}

function WebAdminPage({ token, language }: { token: string; language: AppLanguage }) {
  const emptySettings: WebLandingSettings = {
    patientHeroImageUrl: null,
    patientDesktopImageUrl: null,
    patientMobileImageUrl: null,
    professionalDesktopImageUrl: null,
    professionalMobileImageUrl: null
  };
  const emptyReview: Omit<AdminReview, "id"> = {
    name: "",
    role: "Paciente",
    relativeDate: "hace 1 dia",
    text: "",
    rating: 5,
    avatar: "",
    accent: "#7a5cff"
  };
  const emptyPost: Omit<AdminBlogPost, "id"> = {
    title: "",
    subtitle: "",
    slug: "",
    excerpt: "",
    category: "Ansiedad",
    coverImage: "",
    authorName: "Equipo MotivarCare",
    authorRole: "Psicologa clinica",
    authorAvatar: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    readTime: 6,
    likes: 30,
    tags: ["salud mental"],
    status: "published",
    featured: false,
    seoTitle: "",
    seoDescription: "",
    body: ""
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [settings, setSettings] = useState<WebLandingSettings>(emptySettings);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<Omit<AdminReview, "id">>(emptyReview);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postForm, setPostForm] = useState<Omit<AdminBlogPost, "id">>(emptyPost);

  async function loadWebContent() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<WebContentResponse>("/api/admin/web-content", {}, token);
      setSettings(data.settings);
      setReviews(data.reviews);
      setPosts(data.blogPosts);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load web content");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWebContent();
  }, [token]);

  async function saveSettings() {
    setError("");
    setSuccess("");
    setSettingsFeedback(null);
    setSavingSettings(true);
    const normalizedSettings: WebLandingSettings = {
      ...settings,
      patientHeroImageUrl: settings.patientDesktopImageUrl ?? settings.patientHeroImageUrl ?? null,
      patientDesktopImageUrl: settings.patientDesktopImageUrl ?? settings.patientHeroImageUrl ?? null,
      patientMobileImageUrl:
        settings.patientMobileImageUrl
        ?? settings.patientDesktopImageUrl
        ?? settings.patientHeroImageUrl
        ?? null,
      professionalDesktopImageUrl: settings.professionalDesktopImageUrl ?? null,
      professionalMobileImageUrl: settings.professionalMobileImageUrl ?? settings.professionalDesktopImageUrl ?? null
    };
    try {
      await apiRequest(
        "/api/admin/landing-settings",
        {
          method: "PUT",
          body: JSON.stringify(normalizedSettings)
        },
        token
      );
      setSettings(normalizedSettings);
      setSuccess(t(language, { es: "Configuracion de imagenes guardada.", en: "Image settings saved.", pt: "Configuracao de imagens salva." }));
      setSettingsFeedback({
        type: "ok",
        message: t(language, {
          es: "Imagenes publicadas correctamente.",
          en: "Images published successfully.",
          pt: "Imagens publicadas com sucesso."
        })
      });
    } catch (requestError) {
      const rawMessage = requestError instanceof Error ? requestError.message : "Could not save settings";
      const message =
        rawMessage.includes("HTTP 413")
          ? t(language, {
              es: "La imagen es demasiado pesada. Prueba con una imagen mas liviana.",
              en: "Image is too large. Please try a lighter image.",
              pt: "A imagem e muito pesada. Tente uma imagem menor."
            })
          : rawMessage;
      setError(message);
      setSettingsFeedback({ type: "error", message });
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (editingReviewId) {
        await apiRequest(
          `/api/admin/web-content/reviews/${editingReviewId}`,
          { method: "PUT", body: JSON.stringify(reviewForm) },
          token
        );
      } else {
        await apiRequest("/api/admin/web-content/reviews", { method: "POST", body: JSON.stringify(reviewForm) }, token);
      }
      setReviewForm(emptyReview);
      setEditingReviewId(null);
      setSuccess(t(language, { es: "Review guardada.", en: "Review saved.", pt: "Review salva." }));
      await loadWebContent();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save review");
    }
  }

  async function removeReview(reviewId: string) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/web-content/reviews/${reviewId}`, { method: "DELETE" }, token);
      setSuccess(t(language, { es: "Review eliminada.", en: "Review deleted.", pt: "Review removida." }));
      await loadWebContent();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete review");
    }
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const payload = { ...postForm, tags: postForm.tags.filter((tag) => tag.trim().length > 0) };
    try {
      if (editingPostId) {
        await apiRequest(`/api/admin/web-content/blog-posts/${editingPostId}`, { method: "PUT", body: JSON.stringify(payload) }, token);
      } else {
        await apiRequest("/api/admin/web-content/blog-posts", { method: "POST", body: JSON.stringify(payload) }, token);
      }
      setPostForm(emptyPost);
      setEditingPostId(null);
      setSuccess(t(language, { es: "Articulo guardado.", en: "Article saved.", pt: "Artigo salvo." }));
      await loadWebContent();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save blog post");
    }
  }

  async function removePost(postId: string) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/web-content/blog-posts/${postId}`, { method: "DELETE" }, token);
      setSuccess(t(language, { es: "Articulo eliminado.", en: "Article deleted.", pt: "Artigo removido." }));
      await loadWebContent();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete blog post");
    }
  }

  async function setImageFromFile(
    event: ChangeEvent<HTMLInputElement>,
    key: keyof WebLandingSettings
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const originalDataUrl = await fileToDataUrl(file);
      const dataUrl = await compressImageDataUrl(originalDataUrl);
      setSettings((current) => ({
        ...current,
        [key]: dataUrl,
        ...(key === "patientDesktopImageUrl" ? { patientHeroImageUrl: dataUrl } : {})
      }));
      setSuccess(t(language, { es: "Imagen cargada. Guarda para aplicar cambios.", en: "Image loaded. Save to apply changes.", pt: "Imagem carregada. Salve para aplicar as mudancas." }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load image");
    } finally {
      event.target.value = "";
    }
  }

  if (loading) {
    return <section className="card"><p>{t(language, { es: "Cargando contenido web...", en: "Loading web content...", pt: "Carregando conteudo web..." })}</p></section>;
  }

  const imageSlots: Array<{ key: keyof WebLandingSettings; label: string }> = [
    { key: "patientDesktopImageUrl", label: "Pacientes · laptop" },
    { key: "patientMobileImageUrl", label: "Pacientes · telefono" },
    { key: "professionalDesktopImageUrl", label: "Psicologos · laptop" },
    { key: "professionalMobileImageUrl", label: "Psicologos · telefono" }
  ];

  return (
    <div className="stack-lg">
      <section className="card stack">
        <h2>{t(language, { es: "Administrador Web", en: "Web Administrator", pt: "Administrador Web" })}</h2>
        <p>{t(language, { es: "Gestiona imagenes, reviews y articulos de la landing desde un solo modulo.", en: "Manage landing images, reviews, and blog articles from one module.", pt: "Gerencie imagens, reviews e artigos da landing em um unico modulo." })}</p>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
      </section>

      <section className="card stack">
        <h2>{t(language, { es: "Imagenes de hero (laptop + telefono)", en: "Hero images (laptop + phone)", pt: "Imagens de hero (laptop + telefone)" })}</h2>
        <div className="upload-grid">
          {imageSlots.map((slot) => {
            const inputId = `upload-${slot.key}`;
            const imageValue = settings[slot.key];
            return (
              <article className="upload-card" key={slot.key}>
                <header>
                  <h3>{slot.label}</h3>
                  <span className={`upload-status ${imageValue ? "ok" : ""}`}>{imageValue ? "Imagen cargada" : "Sin imagen"}</span>
                </header>
                <label className="upload-trigger" htmlFor={inputId}>
                  Seleccionar imagen
                </label>
                <input
                  id={inputId}
                  className="upload-input-hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => void setImageFromFile(event, slot.key)}
                />
                {imageValue ? (
                  <div className="upload-preview">
                    <img src={imageValue} alt={`Preview ${slot.label}`} loading="lazy" />
                  </div>
                ) : (
                  <div className="upload-preview empty">Preview disponible al cargar imagen</div>
                )}
              </article>
            );
          })}
        </div>
        <button className="primary" type="button" onClick={() => void saveSettings()} disabled={savingSettings}>
          {savingSettings
            ? t(language, { es: "Guardando imagenes...", en: "Saving images...", pt: "Salvando imagens..." })
            : t(language, { es: "Guardar imagenes", en: "Save images", pt: "Salvar imagens" })}
        </button>
        {settingsFeedback ? (
          <p className={settingsFeedback.type === "ok" ? "success-text" : "error-text"}>{settingsFeedback.message}</p>
        ) : null}
      </section>

      <section className="card stack">
        <h2>{t(language, { es: "ABM Reviews", en: "Reviews CRUD", pt: "ABM Reviews" })}</h2>
        <form className="stack" onSubmit={(event) => void saveReview(event)}>
          <div className="grid-form">
            <label>Nombre<input value={reviewForm.name} onChange={(event) => setReviewForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label>Rol<input value={reviewForm.role} onChange={(event) => setReviewForm((current) => ({ ...current, role: event.target.value }))} /></label>
            <label>Fecha relativa<input value={reviewForm.relativeDate} onChange={(event) => setReviewForm((current) => ({ ...current, relativeDate: event.target.value }))} /></label>
            <label>Rating<input value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) || 5 }))} /></label>
            <label>Avatar URL<input value={reviewForm.avatar} onChange={(event) => setReviewForm((current) => ({ ...current, avatar: event.target.value }))} /></label>
            <label>Color acento<input value={reviewForm.accent} onChange={(event) => setReviewForm((current) => ({ ...current, accent: event.target.value }))} /></label>
          </div>
          <label>Texto<textarea rows={3} value={reviewForm.text} onChange={(event) => setReviewForm((current) => ({ ...current, text: event.target.value }))} /></label>
          <div className="toolbar-actions">
            <button className="primary" type="submit">{editingReviewId ? "Actualizar review" : "Crear review"}</button>
            <button type="button" onClick={() => { setEditingReviewId(null); setReviewForm(emptyReview); }}>Limpiar</button>
          </div>
        </form>
        <div className="stack">
          {reviews.map((review) => (
            <article className="user-card" key={review.id}>
              <header><h3>{review.name}</h3><span className="role-pill">{review.rating}★</span></header>
              <p>{review.text}</p>
              <div className="user-card-footer">
                <small>{review.role} · {review.relativeDate}</small>
                <div className="toolbar-actions">
                  <button type="button" onClick={() => { setEditingReviewId(review.id); setReviewForm({ name: review.name, role: review.role, relativeDate: review.relativeDate, text: review.text, rating: review.rating, avatar: review.avatar, accent: review.accent }); }}>Editar</button>
                  <button className="danger" type="button" onClick={() => void removeReview(review.id)}>Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>{t(language, { es: "ABM Articulos", en: "Articles CRUD", pt: "ABM Artigos" })}</h2>
        <form className="stack" onSubmit={(event) => void savePost(event)}>
          <div className="grid-form">
            <label>Titulo<input value={postForm.title} onChange={(event) => setPostForm((current) => ({ ...current, title: event.target.value }))} /></label>
            <label>Slug<input value={postForm.slug} onChange={(event) => setPostForm((current) => ({ ...current, slug: event.target.value }))} /></label>
            <label>Categoria<input value={postForm.category} onChange={(event) => setPostForm((current) => ({ ...current, category: event.target.value }))} /></label>
            <label>Fecha (YYYY-MM-DD)<input value={postForm.publishedAt} onChange={(event) => setPostForm((current) => ({ ...current, publishedAt: event.target.value }))} /></label>
            <label>Likes<input value={postForm.likes} onChange={(event) => setPostForm((current) => ({ ...current, likes: Number(event.target.value) || 0 }))} /></label>
            <label>Lectura (min)<input value={postForm.readTime} onChange={(event) => setPostForm((current) => ({ ...current, readTime: Number(event.target.value) || 1 }))} /></label>
            <label>Autor<input value={postForm.authorName} onChange={(event) => setPostForm((current) => ({ ...current, authorName: event.target.value }))} /></label>
            <label>Rol autor<input value={postForm.authorRole} onChange={(event) => setPostForm((current) => ({ ...current, authorRole: event.target.value }))} /></label>
            <label>Cover image URL<input value={postForm.coverImage} onChange={(event) => setPostForm((current) => ({ ...current, coverImage: event.target.value }))} /></label>
            <label>Avatar autor URL<input value={postForm.authorAvatar} onChange={(event) => setPostForm((current) => ({ ...current, authorAvatar: event.target.value }))} /></label>
            <label>Status<select value={postForm.status} onChange={(event) => setPostForm((current) => ({ ...current, status: event.target.value as "draft" | "published" }))}><option value="published">published</option><option value="draft">draft</option></select></label>
            <label className="inline-toggle"><input type="checkbox" checked={postForm.featured} onChange={(event) => setPostForm((current) => ({ ...current, featured: event.target.checked }))} />Featured</label>
          </div>
          <label>Subtitulo<input value={postForm.subtitle ?? ""} onChange={(event) => setPostForm((current) => ({ ...current, subtitle: event.target.value }))} /></label>
          <label>Excerpt<textarea rows={2} value={postForm.excerpt} onChange={(event) => setPostForm((current) => ({ ...current, excerpt: event.target.value }))} /></label>
          <label>SEO title<input value={postForm.seoTitle} onChange={(event) => setPostForm((current) => ({ ...current, seoTitle: event.target.value }))} /></label>
          <label>SEO description<textarea rows={2} value={postForm.seoDescription} onChange={(event) => setPostForm((current) => ({ ...current, seoDescription: event.target.value }))} /></label>
          <label>Tags (coma separadas)<input value={postForm.tags.join(", ")} onChange={(event) => setPostForm((current) => ({ ...current, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }))} /></label>
          <label>Contenido<textarea rows={8} value={postForm.body} onChange={(event) => setPostForm((current) => ({ ...current, body: event.target.value }))} /></label>
          <div className="toolbar-actions">
            <button className="primary" type="submit">{editingPostId ? "Actualizar articulo" : "Crear articulo"}</button>
            <button type="button" onClick={() => { setEditingPostId(null); setPostForm(emptyPost); }}>Limpiar</button>
          </div>
        </form>
        <div className="stack">
          {posts.map((post) => (
            <article className="user-card" key={post.id}>
              <header><h3>{post.title}</h3><span className="role-pill">{post.status}</span></header>
              <p>{post.excerpt}</p>
              <div className="user-card-footer">
                <small>{post.publishedAt} · {post.likes} likes</small>
                <div className="toolbar-actions">
                  <button type="button" onClick={() => { setEditingPostId(post.id); setPostForm({ ...post }); }}>Editar</button>
                  <button className="danger" type="button" onClick={() => void removePost(post.id)}>Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
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
  const labelForLink = (to: PortalPath): string => {
    if (to === "/") {
      return t(props.language, { es: "Dashboard", en: "Dashboard", pt: "Dashboard" });
    }
    if (to === "/patients") {
      return t(props.language, { es: "Pacientes", en: "Patients", pt: "Pacientes" });
    }
    if (to === "/professionals") {
      return t(props.language, { es: "Psicologos", en: "Psychologists", pt: "Psicologos" });
    }
    if (to === "/sessions") {
      return t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" });
    }
    if (to === "/finances") {
      return t(props.language, { es: "Finanzas", en: "Finance", pt: "Financas" });
    }
    if (to === "/calendar") {
      return t(props.language, { es: "Calendario", en: "Calendar", pt: "Calendario" });
    }
    if (to === "/library") {
      return t(props.language, { es: "Biblioteca", en: "Library", pt: "Biblioteca" });
    }
    if (to === "/imports") {
      return t(props.language, { es: "Importaciones", en: "Imports", pt: "Importacoes" });
    }
    if (to === "/users") {
      return t(props.language, { es: "Usuarios", en: "Users", pt: "Usuarios" });
    }
    if (to === "/web-admin") {
      return t(props.language, { es: "Administrador Web", en: "Web Administrator", pt: "Administrador Web" });
    }
    if (to === "/settings") {
      return t(props.language, { es: "Configuracion", en: "Settings", pt: "Configuracoes" });
    }
    return t(props.language, { es: "Auditoria IA", en: "AI audit", pt: "Auditoria IA" });
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true" />
          <div>
            <strong>motivarcare</strong>
            <p>{t(props.language, { es: "Admin", en: "Admin", pt: "Admin" })}</p>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? "admin-link active" : "admin-link")}
              end={link.to === "/"}
            >
              {labelForLink(link.to)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="header">
          <div>
            <p className="admin-eyebrow">{t(props.language, { es: "Administrador", en: "Administrator", pt: "Administrador" })}</p>
            <h1>
              {replaceTemplate(
                t(props.language, { es: "Hola, {name}", en: "Hi, {name}", pt: "Ola, {name}" }),
                { name: props.user.fullName }
              )}
            </h1>
            <p>{props.user.email}</p>
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
          <button className="danger" type="button" onClick={props.onLogout}>
            {t(props.language, { es: "Salir", en: "Sign out", pt: "Sair" })}
          </button>
        </header>

        <nav
          className="admin-mobile-nav"
          aria-label={t(props.language, {
            es: "Navegacion mobile admin",
            en: "Admin mobile navigation",
            pt: "Navegacao mobile admin"
          })}
        >
          {links.map((link) => (
            <NavLink
              key={`mobile-${link.to}`}
              to={link.to}
              className={({ isActive }) => (isActive ? "admin-mobile-link active" : "admin-mobile-link")}
              end={link.to === "/"}
            >
              {labelForLink(link.to)}
            </NavLink>
          ))}
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<AdminDashboardPage token={props.token} language={props.language} currency={props.currency} />} />
            <Route
              path="/patients"
              element={
                <PatientsOpsPage token={props.token} language={props.language} currency={props.currency} />
              }
            />
            <Route
              path="/professionals"
              element={
                <ProfessionalsOpsPage token={props.token} language={props.language} />
              }
            />
            <Route
              path="/sessions"
              element={
                <SessionsOpsPage token={props.token} language={props.language} />
              }
            />
            <Route
              path="/finances"
              element={
                <ModulePlaceholderPage
                  language={props.language}
                  title={{ es: "Finanzas", en: "Finance", pt: "Financas" }}
                  description={{
                    es: "Control de cobros, pagos, conciliaciones y resultados por sesion.",
                    en: "Control collections, payouts, reconciliations, and per-session performance.",
                    pt: "Controle de cobrancas, pagamentos, conciliacoes e resultado por sessao."
                  }}
                />
              }
            />
            <Route
              path="/calendar"
              element={
                <ModulePlaceholderPage
                  language={props.language}
                  title={{ es: "Calendario", en: "Calendar", pt: "Calendario" }}
                  description={{
                    es: "Vista de agenda operativa para sesiones, ocupacion y disponibilidad.",
                    en: "Operational agenda view for sessions, occupancy, and availability.",
                    pt: "Visao de agenda operacional para sessoes, ocupacao e disponibilidade."
                  }}
                />
              }
            />
            <Route
              path="/library"
              element={
                <ModulePlaceholderPage
                  language={props.language}
                  title={{ es: "Biblioteca admin", en: "Admin library", pt: "Biblioteca admin" }}
                  description={{
                    es: "Recursos internos, guias y materiales de soporte para operacion clinica.",
                    en: "Internal resources, guides, and support materials for clinical operations.",
                    pt: "Recursos internos, guias e materiais de apoio para operacao clinica."
                  }}
                />
              }
            />
            <Route
              path="/imports"
              element={
                <ModulePlaceholderPage
                  language={props.language}
                  title={{ es: "Importaciones", en: "Imports", pt: "Importacoes" }}
                  description={{
                    es: "Carga masiva y procesos de importacion para datos operativos del portal.",
                    en: "Bulk upload and import workflows for portal operational data.",
                    pt: "Carga em massa e processos de importacao para dados operacionais do portal."
                  }}
                />
              }
            />
            <Route path="/users" element={<UsersPage token={props.token} language={props.language} />} />
            <Route path="/web-admin" element={<WebAdminPage token={props.token} language={props.language} />} />
            <Route
              path="/settings"
              element={
                <LandingSettingsPage token={props.token} language={props.language} />
              }
            />
            <Route
              path="/ai"
              element={
                <InfoPage
                  title={t(props.language, { es: "Auditoria IA", en: "AI audit", pt: "Auditoria IA" })}
                  description={t(props.language, {
                    es: "Cola de auditoria IA con consentimiento explicito y revision humana.",
                    en: "AI audit queue with explicit consent and human review.",
                    pt: "Fila de auditoria de IA com consentimento explicito e revisao humana."
                  })}
                />
              }
            />
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
