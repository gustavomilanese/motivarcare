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
  textByLanguage
} from "@therapy/i18n-config";

type Role = "PATIENT" | "PROFESSIONAL" | "ADMIN";
type PatientStatus = "active" | "pause" | "cancelled" | "trial";
type RoleFilter = Role | "ALL";
type PortalPath =
  | "/"
  | "/patients"
  | "/professionals"
  | "/plans-packages"
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
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
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


function normalizeWebLandingSettings(settings: WebLandingSettings): WebLandingSettings {
  return {
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
}

interface AdminReview {
  id: string;
  name: string;
  role: string;
  reviewDate?: string;
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
  discountPercent: number;
  currency: string;
  active: boolean;
  createdAt: string;
  purchasesCount: number;
  landingPublished: boolean;
  patientPublished: boolean;
}

interface SessionPackagesResponse {
  sessionPackages: AdminSessionPackage[];
  visibility: {
    landing: string[];
    patient: string[];
    featuredLanding: string | null;
    featuredPatient: string | null;
  };
}

interface AdminPatientOps {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  timezone: string;
  status: string;
  activeProfessionalId?: string | null;
  activeProfessionalName?: string | null;
  assignmentStatus?: "assigned" | "pending";
  latestPurchase: {
    id: string;
    packageId?: string;
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
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
}

interface PatientManagementResponse {
  patient: AdminPatientOps & {
    confirmedBookings: AdminBookingOps[];
  };
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
  { to: "/plans-packages", label: "Planes y paquetes de sesiones" },
  { to: "/web-admin", label: "Gestion Landing Page" },
  { to: "/finances", label: "Finanzas" },
  { to: "/settings", label: "Configuracion" },
  { to: "/ai", label: "IA Audit" }
];

const defaultCreateForm: CreateUserFormState = {
  role: "PATIENT",
  fullName: "",
  email: "",
  password: "",
  timezone: "",
  patientStatus: "active",
  professionalVisible: true,
  professionalCancellationHours: "24",
  professionalBio: "",
  professionalTherapeuticApproach: "",
  professionalYearsExperience: "",
  professionalPhotoUrl: "",
  professionalVideoUrl: ""
};

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "USA Eastern - New York/Miami (UTC-05:00 / -04:00 DST)" },
  { value: "America/Detroit", label: "USA Eastern - Detroit (UTC-05:00 / -04:00 DST)" },
  { value: "America/Indiana/Indianapolis", label: "USA Eastern - Indianapolis (UTC-05:00 / -04:00 DST)" },
  { value: "America/Kentucky/Louisville", label: "USA Eastern - Louisville (UTC-05:00 / -04:00 DST)" },
  { value: "America/Chicago", label: "USA Central - Chicago (UTC-06:00 / -05:00 DST)" },
  { value: "America/Menominee", label: "USA Central - Menominee (UTC-06:00 / -05:00 DST)" },
  { value: "America/North_Dakota/Center", label: "USA Central - North Dakota Center (UTC-06:00 / -05:00 DST)" },
  { value: "America/Denver", label: "USA Mountain - Denver (UTC-07:00 / -06:00 DST)" },
  { value: "America/Boise", label: "USA Mountain - Boise (UTC-07:00 / -06:00 DST)" },
  { value: "America/Phoenix", label: "USA Mountain - Phoenix (UTC-07:00, sin DST)" },
  { value: "America/Los_Angeles", label: "USA Pacific - Los Angeles (UTC-08:00 / -07:00 DST)" },
  { value: "America/Anchorage", label: "USA Alaska - Anchorage (UTC-09:00 / -08:00 DST)" },
  { value: "America/Juneau", label: "USA Alaska - Juneau (UTC-09:00 / -08:00 DST)" },
  { value: "America/Sitka", label: "USA Alaska - Sitka (UTC-09:00 / -08:00 DST)" },
  { value: "America/Nome", label: "USA Alaska - Nome (UTC-09:00 / -08:00 DST)" },
  { value: "America/Adak", label: "USA Aleutian - Adak (UTC-10:00 / -09:00 DST)" },
  { value: "Pacific/Honolulu", label: "USA Hawaii - Honolulu (UTC-10:00, sin DST)" },
  { value: "America/Puerto_Rico", label: "USA Territory - Puerto Rico (UTC-04:00)" },
  { value: "America/St_Thomas", label: "USA Territory - U.S. Virgin Islands (UTC-04:00)" },
  { value: "Pacific/Pago_Pago", label: "USA Territory - American Samoa (UTC-11:00)" },
  { value: "Pacific/Guam", label: "USA Territory - Guam (UTC+10:00)" },
  { value: "Pacific/Saipan", label: "USA Territory - Northern Mariana Islands (UTC+10:00)" },
  { value: "Etc/GMT+1", label: "GMT/UTC -01:00" },
  { value: "Etc/GMT+2", label: "GMT/UTC -02:00" },
  { value: "Etc/GMT+3", label: "GMT/UTC -03:00" },
  { value: "Etc/GMT+4", label: "GMT/UTC -04:00" },
  { value: "Etc/GMT+5", label: "GMT/UTC -05:00" },
  { value: "Etc/GMT+6", label: "GMT/UTC -06:00" },
  { value: "Etc/GMT+7", label: "GMT/UTC -07:00" },
  { value: "Etc/GMT+8", label: "GMT/UTC -08:00" },
  { value: "Etc/GMT+9", label: "GMT/UTC -09:00" },
  { value: "Etc/GMT+10", label: "GMT/UTC -10:00" },
  { value: "Etc/GMT+11", label: "GMT/UTC -11:00" },
  { value: "Etc/GMT+12", label: "GMT/UTC -12:00" },
  { value: "Etc/GMT-1", label: "GMT/UTC +01:00" },
  { value: "Etc/GMT-2", label: "GMT/UTC +02:00" },
  { value: "Etc/GMT-3", label: "GMT/UTC +03:00" }
] as const;

const PATIENT_EMPTY_ART_URL = "/images/da-vinci-last-supper.jpg";
const PROFESSIONAL_EMPTY_ART_URL = "/images/sistine-creation-of-adam.jpg";

const SESSION_REASON_OPTIONS = [
  { value: "ajuste_manual", label: "Ajuste manual" },
  { value: "regalo", label: "Regalo" },
  { value: "correccion_compra", label: "Correccion de compra" },
  { value: "devolucion_sesion", label: "Devolucion de sesion" },
  { value: "error_operativo", label: "Error operativo" }
] as const;

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

function formatRelativeDateFromReviewDate(reviewDate: string): string {
  if (!reviewDate) {
    return "hace 0 dias";
  }
  const from = new Date(`${reviewDate}T00:00:00`);
  if (Number.isNaN(from.getTime())) {
    return "hace 0 dias";
  }
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - from.getTime());
  const days = Math.floor(diffMs / 86400000);
  return `hace ${days} dias`;
}

function inferReviewDate(relativeDate: string): string {
  const match = relativeDate.match(/(\d+)/);
  const days = match ? Number(match[1]) : 0;
  const date = new Date();
  date.setDate(date.getDate() - (Number.isFinite(days) ? days : 0));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  const trendValues = [0.48, 0.56, 0.62, 0.58, 0.71, 0.79, 0.86, 0.94, 1.0, 0.92].map((factor) =>
    Math.max(1, Math.round(response.kpis.scheduledSessions * factor + response.kpis.activePatients * 0.08))
  );
  const trendMax = Math.max(...trendValues, 1);
  const trendPoints = trendValues
    .map((value, index) => {
      const x = (index / Math.max(1, trendValues.length - 1)) * 100;
      const y = 100 - (value / trendMax) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const loadBars = [
    {
      key: "patients",
      label: t(props.language, { es: "Pacientes", en: "Patients", pt: "Pacientes" }),
      value: response.kpis.activePatients,
      tone: "var(--accent-strong)"
    },
    {
      key: "pros",
      label: t(props.language, { es: "Psicologos", en: "Psychologists", pt: "Psicologos" }),
      value: Math.max(1, response.kpis.activeProfessionals * 6),
      tone: "#5a8de3"
    },
    {
      key: "sessions",
      label: t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" }),
      value: response.kpis.scheduledSessions,
      tone: "#2f7f71"
    },
    {
      key: "finance",
      label: t(props.language, { es: "Finanzas", en: "Finance", pt: "Financas" }),
      value: Math.max(1, Math.round(response.kpis.monthlyRevenueCents / 10000)),
      tone: "#9f6b24"
    }
  ];
  const maxLoad = Math.max(...loadBars.map((item) => item.value), 1);

  return (
    <div className="dashboard-stack">
      <section className="card dashboard-hero-card">
        <div className="dashboard-hero-copy">
          <p className="dashboard-hero-eyebrow">{t(props.language, { es: "Panel ejecutivo", en: "Executive panel", pt: "Painel executivo" })}</p>
          <h2>{t(props.language, { es: "Estado general de la operacion", en: "Overall operation status", pt: "Status geral da operacao" })}</h2>
          <p>{response.note}</p>
        </div>
        <div className="dashboard-hero-chips">
          <article className="dashboard-chip">
            <span>{t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })}</span>
            <strong>{response.kpis.activePatients}</strong>
          </article>
          <article className="dashboard-chip">
            <span>{t(props.language, { es: "Sesiones agendadas", en: "Scheduled sessions", pt: "Sessoes agendadas" })}</span>
            <strong>{response.kpis.scheduledSessions}</strong>
          </article>
          <article className="dashboard-chip highlight">
            <span>{t(props.language, { es: "Revenue mensual", en: "Monthly revenue", pt: "Receita mensal" })}</span>
            <strong>{formatMoneyCents(response.kpis.monthlyRevenueCents, props.language, props.currency)}</strong>
          </article>
        </div>
      </section>

      <section className="card stack">
        <div className="dashboard-section-head">
          <h3>{t(props.language, { es: "Indicadores clave", en: "Key indicators", pt: "Indicadores chave" })}</h3>
          <span className="role-pill">Live</span>
        </div>
        <div className="kpi-grid dashboard-kpi-grid">
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
      </section>

      <section className="dashboard-chart-grid">
        <article className="card dashboard-chart-card">
          <header>
            <h3>{t(props.language, { es: "Tendencia de actividad", en: "Activity trend", pt: "Tendencia de atividade" })}</h3>
            <small>{t(props.language, { es: "Ultimos bloques operativos", en: "Recent operational blocks", pt: "Ultimos blocos operacionais" })}</small>
          </header>
          <div className="dashboard-line-chart" role="img" aria-label="Activity trend chart">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={trendPoints} />
            </svg>
          </div>
          <div className="dashboard-line-legend">
            {trendValues.map((value, index) => (
              <span key={`trend-${index}`}>{value}</span>
            ))}
          </div>
        </article>

        <article className="card dashboard-chart-card">
          <header>
            <h3>{t(props.language, { es: "Carga por modulo", en: "Load by module", pt: "Carga por modulo" })}</h3>
            <small>{t(props.language, { es: "Intensidad relativa", en: "Relative intensity", pt: "Intensidade relativa" })}</small>
          </header>
          <div className="dashboard-bar-chart">
            {loadBars.map((item) => (
              <div key={item.key} className="dashboard-bar-row">
                <span>{item.label}</span>
                <div className="dashboard-bar-track">
                  <div className="dashboard-bar-fill" style={{ width: `${Math.max(10, Math.round((item.value / maxLoad) * 100))}%`, background: item.tone }} />
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function AdminDashboardPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  return <OverviewPage token={props.token} language={props.language} currency={props.currency} />;
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

function PortalHeroSettingsSection(props: { token: string; language: AppLanguage; target: "patient" | "professional" }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [settings, setSettings] = useState<WebLandingSettings>({
    patientHeroImageUrl: null,
    patientDesktopImageUrl: null,
    patientMobileImageUrl: null,
    professionalDesktopImageUrl: null,
    professionalMobileImageUrl: null
  });
  const [savedSettings, setSavedSettings] = useState<WebLandingSettings>({
    patientHeroImageUrl: null,
    patientDesktopImageUrl: null,
    patientMobileImageUrl: null,
    professionalDesktopImageUrl: null,
    professionalMobileImageUrl: null
  });

  const desktopKey: keyof WebLandingSettings = props.target === "patient" ? "patientDesktopImageUrl" : "professionalDesktopImageUrl";
  const mobileKey: keyof WebLandingSettings = props.target === "patient" ? "patientMobileImageUrl" : "professionalMobileImageUrl";

  const hasPendingChanges =
    settings[desktopKey] !== savedSettings[desktopKey]
    || settings[mobileKey] !== savedSettings[mobileKey]
    || (props.target === "patient" && settings.patientHeroImageUrl !== savedSettings.patientHeroImageUrl);

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<LandingSettingsResponse>("/api/admin/landing-settings", {}, props.token);
      const normalized = normalizeWebLandingSettings({
        patientHeroImageUrl: data.settings.patientHeroImageUrl,
        patientDesktopImageUrl: data.settings.patientDesktopImageUrl ?? data.settings.patientHeroImageUrl,
        patientMobileImageUrl: data.settings.patientMobileImageUrl ?? data.settings.patientHeroImageUrl,
        professionalDesktopImageUrl: data.settings.professionalDesktopImageUrl ?? null,
        professionalMobileImageUrl: data.settings.professionalMobileImageUrl ?? data.settings.professionalDesktopImageUrl ?? null
      });
      setSettings(normalized);
      setSavedSettings(normalized);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cargar configuracion de hero");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, [props.token, props.target]);

  const setImageFromFile = async (
    event: ChangeEvent<HTMLInputElement>,
    key: keyof WebLandingSettings
  ) => {
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
        ...(props.target === "patient" && key === "patientDesktopImageUrl" ? { patientHeroImageUrl: dataUrl } : {})
      }));
      setSuccess("Imagen cargada. Guarda para aplicar cambios.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cargar la imagen");
    } finally {
      event.target.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    const normalized = normalizeWebLandingSettings(settings);
    try {
      await apiRequest(
        "/api/admin/landing-settings",
        {
          method: "PUT",
          body: JSON.stringify(normalized)
        },
        props.token
      );
      setSettings(normalized);
      setSavedSettings(normalized);
      setSuccess("Imagen de hero guardada.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar la imagen");
    } finally {
      setSaving(false);
    }
  };

  const sectionTitle =
    props.target === "patient"
      ? "Hero del Portal Paciente"
      : "Hero del Portal Psicologo";

  const sectionSubtitle =
    props.target === "patient"
      ? "Imagenes de cabecera para el portal paciente (laptop y telefono)."
      : "Imagenes de cabecera para el portal psicologo (laptop y telefono).";

  return (
    <details className="card stack web-admin-accordion">
      <summary className="web-admin-accordion-summary">
        <div>
          <h2>{sectionTitle}</h2>
          <p>{sectionSubtitle}</p>
        </div>
      </summary>
      <div className="web-admin-accordion-content stack">
        {loading ? <p>Cargando configuracion...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}

        {!loading ? (
          <>
            <div className="upload-grid">
              <article className="upload-card">
                <header>
                  <h3>{props.target === "patient" ? "Pacientes · laptop" : "Psicologos · laptop"}</h3>
                  <span className={`upload-status ${settings[desktopKey] ? "ok" : ""}`}>{settings[desktopKey] ? "Imagen cargada" : "Sin imagen"}</span>
                </header>
                <label className="upload-trigger" htmlFor={`hero-${props.target}-desktop`}>
                  Seleccionar imagen
                </label>
                <input
                  id={`hero-${props.target}-desktop`}
                  className="upload-input-hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => void setImageFromFile(event, desktopKey)}
                />
                {settings[desktopKey] ? (
                  <div className="upload-preview">
                    <img src={settings[desktopKey] ?? ""} alt={`${props.target} desktop hero`} loading="lazy" />
                  </div>
                ) : (
                  <div className="upload-preview empty">Preview disponible al cargar imagen</div>
                )}
              </article>

              <article className="upload-card">
                <header>
                  <h3>{props.target === "patient" ? "Pacientes · telefono" : "Psicologos · telefono"}</h3>
                  <span className={`upload-status ${settings[mobileKey] ? "ok" : ""}`}>{settings[mobileKey] ? "Imagen cargada" : "Sin imagen"}</span>
                </header>
                <label className="upload-trigger" htmlFor={`hero-${props.target}-mobile`}>
                  Seleccionar imagen
                </label>
                <input
                  id={`hero-${props.target}-mobile`}
                  className="upload-input-hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => void setImageFromFile(event, mobileKey)}
                />
                {settings[mobileKey] ? (
                  <div className="upload-preview">
                    <img src={settings[mobileKey] ?? ""} alt={`${props.target} mobile hero`} loading="lazy" />
                  </div>
                ) : (
                  <div className="upload-preview empty">Preview disponible al cargar imagen</div>
                )}
              </article>
            </div>

            <button className="primary" type="button" onClick={() => void save()} disabled={saving || !hasPendingChanges}>
              {saving
                ? "Guardando imagenes..."
                : hasPendingChanges
                  ? "Guardar imagenes"
                  : "Sin cambios por guardar"}
            </button>
          </>
        ) : null}
      </div>
    </details>
  );
}

function SessionPackagesAdminPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const emptyForm = {
    name: "",
    credits: "4",
    priceUsd: "360",
    discountPercent: "0",
    currency: "usd",
    professionalId: "",
    stripePriceId: "",
    active: true
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [packages, setPackages] = useState<AdminSessionPackage[]>([]);
  const [professionals, setProfessionals] = useState<AdminProfessionalOps[]>([]);
  const [search, setSearch] = useState("");
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [visibilityDraft, setVisibilityDraft] = useState<{ landing: string[]; patient: string[]; featuredLanding: string | null; featuredPatient: string | null }>({
    landing: [],
    patient: [],
    featuredLanding: null,
    featuredPatient: null
  });
  const [savedVisibility, setSavedVisibility] = useState<{ landing: string[]; patient: string[]; featuredLanding: string | null; featuredPatient: string | null }>({
    landing: [],
    patient: [],
    featuredLanding: null,
    featuredPatient: null
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [packagesResponse, professionalsResponse] = await Promise.all([
        apiRequest<SessionPackagesResponse>("/api/admin/session-packages", {}, props.token),
        apiRequest<ProfessionalsResponse>("/api/admin/professionals", {}, props.token)
      ]);
      setPackages(packagesResponse.sessionPackages);
      setVisibilityDraft(packagesResponse.visibility);
      setSavedVisibility(packagesResponse.visibility);
      setProfessionals(professionalsResponse.professionals);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load session packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [props.token]);

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return packages;
    }
    return packages.filter((item) =>
      [item.name, item.professionalName ?? "", String(item.credits)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [packages, search]);

  const activePackages = packages.filter((item) => item.active);
  const inactivePackages = packages.length - activePackages.length;
  const totalCredits = packages.reduce((sum, item) => sum + item.credits, 0);
  const totalPurchases = packages.reduce((sum, item) => sum + item.purchasesCount, 0);
  const packagesById = useMemo(() => new Map(packages.map((item) => [item.id, item])), [packages]);
  const hasPendingVisibilityChanges =
    JSON.stringify(visibilityDraft) !== JSON.stringify(savedVisibility);

  const saveVisibility = async () => {
    setError("");
    setSuccess("");
    setSavingVisibility(true);
    try {
      await apiRequest<{ visibility: { landing: string[]; patient: string[]; featuredLanding: string | null; featuredPatient: string | null } }>(
        "/api/admin/session-packages/visibility",
        {
          method: "PUT",
          body: JSON.stringify(visibilityDraft)
        },
        props.token
      );
      setSuccess("Publicacion actualizada");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save package visibility");
    } finally {
      setSavingVisibility(false);
    }
  };

  const togglePublished = (channel: "landing" | "patient", packageId: string, checked: boolean) => {
    if (checked && !visibilityDraft[channel].includes(packageId) && visibilityDraft[channel].length >= 3) {
      setError(`Solo puedes publicar 3 paquetes en ${channel === "landing" ? "landing" : "patient"}.`);
      return;
    }

    setVisibilityDraft((current) => {
      const currentIds = current[channel];
      if (checked) {
        if (currentIds.includes(packageId)) {
          return current;
        }
        return { ...current, [channel]: [...currentIds, packageId] };
      }
      const nextIds = currentIds.filter((id) => id !== packageId);
      const featuredKey = channel === "landing" ? "featuredLanding" : "featuredPatient";
      return {
        ...current,
        [channel]: nextIds,
        [featuredKey]: current[featuredKey] === packageId ? null : current[featuredKey]
      };
    });
  };

  const setFeatured = (channel: "landing" | "patient", packageId: string | null) => {
    setVisibilityDraft((current) => ({
      ...current,
      [channel === "landing" ? "featuredLanding" : "featuredPatient"]: packageId
    }));
  };

  const setPublishedOrder = (channel: "landing" | "patient", packageId: string, nextOrder: number) => {
    setVisibilityDraft((current) => {
      const currentIds = [...current[channel]];
      const currentIndex = currentIds.indexOf(packageId);
      const targetIndex = nextOrder - 1;
      if (currentIndex === -1 || targetIndex < 0 || targetIndex >= currentIds.length || currentIndex === targetIndex) {
        return current;
      }
      const [moved] = currentIds.splice(currentIndex, 1);
      currentIds.splice(targetIndex, 0, moved);
      return { ...current, [channel]: currentIds };
    });
  };

  const resetForm = () => {
    setEditingPackageId(null);
    setForm(emptyForm);
  };

  const closeModal = () => {
    setIsPackageModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setError("");
    setSuccess("");
    setIsPackageModalOpen(true);
  };

  const openEdit = (item: AdminSessionPackage) => {
    setEditingPackageId(item.id);
    setForm({
      name: item.name,
      credits: String(item.credits),
      priceUsd: String(Math.round(item.priceCents / 100)),
      discountPercent: String(item.discountPercent),
      currency: item.currency,
      professionalId: item.professionalId ?? "",
      stripePriceId: item.stripePriceId,
      active: item.active
    });
    setError("");
    setSuccess("");
    setIsPackageModalOpen(true);
  };

  const submit = async () => {
    const credits = Number(form.credits);
    const priceUsd = Number(form.priceUsd);
    const discountPercent = Number(form.discountPercent);
    const priceCents = Math.round(priceUsd * 100);
    if (form.name.trim().length < 2) {
      setError("Nombre invalido");
      return;
    }
    if (!Number.isInteger(credits) || credits <= 0) {
      setError("Sesiones incluidas invalido");
      return;
    }
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      setError("Precio invalido");
      return;
    }
    if (!Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      setError("Descuento invalido");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        name: form.name.trim(),
        credits,
        priceCents,
        discountPercent,
        currency: form.currency.trim().toLowerCase() || "usd",
        professionalId: form.professionalId.trim().length > 0 ? form.professionalId : null,
        stripePriceId: form.stripePriceId.trim().length > 0 ? form.stripePriceId.trim() : undefined,
        active: form.active
      };

      if (editingPackageId) {
        await apiRequest<{ sessionPackage: AdminSessionPackage }>("/api/admin/session-packages/" + editingPackageId, { method: "PATCH", body: JSON.stringify(payload) }, props.token);
        setSuccess("Paquete actualizado");
      } else {
        await apiRequest<{ sessionPackage: AdminSessionPackage }>("/api/admin/session-packages", { method: "POST", body: JSON.stringify(payload) }, props.token);
        setSuccess("Paquete creado");
      }

      resetForm();
      setIsPackageModalOpen(false);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save session package");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: AdminSessionPackage) => {
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ sessionPackage: AdminSessionPackage }>("/api/admin/session-packages/" + item.id, { method: "PATCH", body: JSON.stringify({ active: !item.active }) }, props.token);
      setSuccess(item.active ? "Paquete desactivado" : "Paquete activado");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update package status");
    }
  };

  const removePackage = async (item: AdminSessionPackage) => {
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest<{ note?: string }>("/api/admin/session-packages/" + item.id, { method: "DELETE" }, props.token);
      setSuccess(response.note ?? "Paquete eliminado");
      if (editingPackageId === item.id) {
        resetForm();
      }
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete package");
    }
  };

  return (
    <div className="stack-lg package-admin-page">
      <section className="card stack package-admin-hero">
        <div className="package-admin-hero-copy">
          <p className="admin-eyebrow">Comercial</p>
          <h2>Planes y paquetes de sesiones</h2>
          <p>Administra el catalogo que consume el portal de pacientes y que tambien puede mostrarse en la landing.</p>
        </div>
        <div className="package-admin-kpis">
          <article className="package-admin-kpi"><span>Activos</span><strong>{activePackages.length}</strong></article>
          <article className="package-admin-kpi"><span>Inactivos</span><strong>{inactivePackages}</strong></article>
          <article className="package-admin-kpi"><span>Sesiones total</span><strong>{totalCredits}</strong></article>
          <article className="package-admin-kpi"><span>Compras historicas</span><strong>{totalPurchases}</strong></article>
        </div>
      </section>

      <section className="package-admin-grid">
        <section className="card stack package-admin-list-card">
          <div className="package-admin-section-head">
            <div>
              <h3>Catalogo actual</h3>
              <p>Marca que paquetes van a landing y cuales a patient. Maximo 3 por canal. El orden tambien se define desde este catalogo.</p>
            </div>
            <button className="package-admin-secondary-button" type="button" onClick={openCreateModal}>Nuevo paquete</button>
          </div>
          <input className="package-admin-search" type="search" placeholder="Buscar por nombre, profesional o sesiones" value={search} onChange={(event) => setSearch(event.target.value)} />

          {loading ? <p>Cargando paquetes...</p> : null}

          {!loading ? (
            <div className="package-admin-list">
              <div className="package-admin-list-head" aria-hidden="true">
                <span>Paquete</span>
                <span>Landing</span>
                <span>Orden</span>
                <span>Patient</span>
                <span>Orden</span>
                <span />
              </div>
              {filteredPackages.map((item) => (
                <article className={"package-admin-card " + (item.active ? "is-active" : "is-inactive")} key={item.id}>
                  <div className="package-admin-card-main">
                    <div className="package-admin-card-head">
                      <div>
                        <div className="package-admin-card-title-row">
                          <h4>{item.name}</h4>
                          <span className={"role-pill" + (item.active ? "" : " muted")}>{item.active ? "Activo" : "Inactivo"}</span>
                        </div>
                        {item.professionalName ? <p>{`Asignado a ${item.professionalName}`}</p> : null}
                        <strong className="package-admin-card-price">{formatMoneyCents(item.priceCents, props.language, props.currency)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="package-admin-card-channel">
                    <div className="package-admin-channel-options">
                      <button
                        type="button"
                        className={"package-admin-publish-icon-button" + (visibilityDraft.landing.includes(item.id) ? " active" : "")}
                        aria-label={visibilityDraft.landing.includes(item.id) ? "Quitar de landing" : "Publicar en landing"}
                        title={visibilityDraft.landing.includes(item.id) ? "Quitar de landing" : "Publicar en landing"}
                        disabled={!item.active}
                        onClick={() => togglePublished("landing", item.id, !visibilityDraft.landing.includes(item.id))}
                      >
                        {visibilityDraft.landing.includes(item.id) ? "✓" : ""}
                      </button>
                    </div>
                  </div>

                  <div className="package-admin-card-channel package-admin-card-order-column">
                    <div className="package-admin-channel-options">
                      {visibilityDraft.landing.includes(item.id) ? (
                        <div className="package-admin-channel-order">
                          <select
                            className="package-admin-order-select"
                            aria-label="Orden en landing"
                            value={String(visibilityDraft.landing.indexOf(item.id) + 1)}
                            onChange={(event) => setPublishedOrder("landing", item.id, Number(event.target.value))}
                          >
                            {visibilityDraft.landing.map((_, index) => (
                              <option key={`landing-order-${index + 1}`} value={String(index + 1)}>
                                {index + 1}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={"package-admin-featured-icon-button" + (visibilityDraft.featuredLanding === item.id ? " active" : "")}
                            aria-label={visibilityDraft.featuredLanding === item.id ? "Quitar mas elegido en landing" : "Marcar mas elegido en landing"}
                            title={visibilityDraft.featuredLanding === item.id ? "Quitar mas elegido en landing" : "Marcar mas elegido en landing"}
                            onClick={() => setFeatured("landing", visibilityDraft.featuredLanding === item.id ? null : item.id)}
                          >
                            ★
                          </button>
                        </div>
                      ) : (
                        <span className="package-admin-order-placeholder">-</span>
                      )}
                    </div>
                  </div>

                  <div className="package-admin-card-channel">
                    <div className="package-admin-channel-options">
                      <button
                        type="button"
                        className={"package-admin-publish-icon-button" + (visibilityDraft.patient.includes(item.id) ? " active" : "")}
                        aria-label={visibilityDraft.patient.includes(item.id) ? "Quitar de patient" : "Publicar en patient"}
                        title={visibilityDraft.patient.includes(item.id) ? "Quitar de patient" : "Publicar en patient"}
                        disabled={!item.active}
                        onClick={() => togglePublished("patient", item.id, !visibilityDraft.patient.includes(item.id))}
                      >
                        {visibilityDraft.patient.includes(item.id) ? "✓" : ""}
                      </button>
                    </div>
                  </div>

                  <div className="package-admin-card-channel package-admin-card-order-column">
                    <div className="package-admin-channel-options">
                      {visibilityDraft.patient.includes(item.id) ? (
                        <div className="package-admin-channel-order">
                          <select
                            className="package-admin-order-select"
                            aria-label="Orden en patient"
                            value={String(visibilityDraft.patient.indexOf(item.id) + 1)}
                            onChange={(event) => setPublishedOrder("patient", item.id, Number(event.target.value))}
                          >
                            {visibilityDraft.patient.map((_, index) => (
                              <option key={`patient-order-${index + 1}`} value={String(index + 1)}>
                                {index + 1}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={"package-admin-featured-icon-button" + (visibilityDraft.featuredPatient === item.id ? " active" : "")}
                            aria-label={visibilityDraft.featuredPatient === item.id ? "Quitar mas elegido en patient" : "Marcar mas elegido en patient"}
                            title={visibilityDraft.featuredPatient === item.id ? "Quitar mas elegido en patient" : "Marcar mas elegido en patient"}
                            onClick={() => setFeatured("patient", visibilityDraft.featuredPatient === item.id ? null : item.id)}
                          >
                            ★
                          </button>
                        </div>
                      ) : (
                        <span className="package-admin-order-placeholder">-</span>
                      )}
                    </div>
                  </div>

                  <div className="package-admin-card-actions">
                    <div className="package-admin-icon-actions">
                      <button
                        className="package-admin-icon-button"
                        type="button"
                        title="Editar"
                        aria-label="Editar"
                        onClick={() => openEdit(item)}
                      >
                        ✏️
                      </button>
                      <button
                        className="package-admin-icon-button"
                        type="button"
                        title={item.active ? "Desactivar" : "Activar"}
                        aria-label={item.active ? "Desactivar" : "Activar"}
                        onClick={() => void toggleActive(item)}
                      >
                        {item.active ? "⏸" : "▶"}
                      </button>
                      <button
                        className="package-admin-icon-button danger"
                        type="button"
                        title="Eliminar"
                        aria-label="Eliminar"
                        onClick={() => void removePackage(item)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {filteredPackages.length === 0 ? <p className="web-admin-empty-list">No hay paquetes para mostrar.</p> : null}
            </div>
          ) : null}

          <div className="toolbar-actions package-admin-toolbar">
            <div className="package-admin-toolbar-status">
              <span className="role-pill">Landing: {visibilityDraft.landing.length}/3</span>
              <span className="role-pill">Patient: {visibilityDraft.patient.length}/3</span>
            </div>
            <button
              className={"primary" + (hasPendingVisibilityChanges ? " package-admin-save-pending" : "")}
              type="button"
              onClick={() => void saveVisibility()}
              disabled={savingVisibility || !hasPendingVisibilityChanges}
            >
              {savingVisibility ? "Guardando..." : hasPendingVisibilityChanges ? "Guardar publicacion" : "Publicacion guardada"}
            </button>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          {success ? <p className="success-text">{success}</p> : null}
        </section>
      </section>

      {isPackageModalOpen ? (
        <div className="patient-modal-backdrop" onClick={closeModal}>
          <section className="patient-modal patient-create-modal web-admin-form-modal package-admin-modal" onClick={(event) => event.stopPropagation()}>
            <header className="patient-modal-head">
              <div>
                <h3>{editingPackageId ? "Editar paquete" : "Nuevo paquete"}</h3>
                <p>Define nombre, cantidad de sesiones, precio, Stripe y profesional opcional.</p>
              </div>
              <button type="button" onClick={closeModal}>Cerrar</button>
            </header>
            <div className="grid-form">
              <label>Nombre<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Sesiones incluidas<input type="number" min="1" value={form.credits} onChange={(event) => setForm((current) => ({ ...current, credits: event.target.value }))} /></label>
              <label>Precio (USD)<input type="number" min="1" step="1" value={form.priceUsd} onChange={(event) => setForm((current) => ({ ...current, priceUsd: event.target.value }))} /></label>
              <label>Descuento (%)<input type="number" min="0" max="100" step="1" value={form.discountPercent} onChange={(event) => setForm((current) => ({ ...current, discountPercent: event.target.value }))} /></label>
              <label>Moneda<input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} /></label>
              <label>Profesional asociado<select value={form.professionalId} onChange={(event) => setForm((current) => ({ ...current, professionalId: event.target.value }))}><option value="">General</option>{professionals.map((professional) => (<option key={professional.id} value={professional.id}>{professional.fullName}</option>))}</select></label>
              <label className="inline-toggle package-admin-toggle"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />Activo para patient y landing</label>
            </div>
            <div className="toolbar-actions">
              <button className="primary" type="button" onClick={() => void submit()} disabled={saving}>{saving ? "Guardando..." : editingPackageId ? "Guardar cambios" : "Crear paquete"}</button>
              <button type="button" onClick={closeModal}>Cancelar</button>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            {success ? <p className="success-text">{success}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function PatientsOpsPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
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
  const [bookingDrafts, setBookingDrafts] = useState<Record<string, { status: AdminBookingOps["status"]; startsAt: string; endsAt: string; professionalId: string }>>({});
  const [patientBookingsLoading, setPatientBookingsLoading] = useState<Record<string, boolean>>({});
  const [patientDetailDrafts, setPatientDetailDrafts] = useState<Record<string, {
    fullName: string;
    email: string;
    password: string;
    timezone: string;
    status: PatientStatus;
    remainingCredits: string;
    activeProfessionalId: string;
  }>>({});
  const [patientSaveLoading, setPatientSaveLoading] = useState(false);
  const [sessionOpsLoading, setSessionOpsLoading] = useState(false);
  const [sessionReasonDrafts, setSessionReasonDrafts] = useState<Record<string, string>>({});
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [isPatientEditModalOpen, setIsPatientEditModalOpen] = useState(false);
  const [isCreatePatientModalOpen, setIsCreatePatientModalOpen] = useState(false);
  const [createPatientForm, setCreatePatientForm] = useState<{
    fullName: string;
    email: string;
    password: string;
    timezone: string;
    patientStatus: PatientStatus;
  }>({
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

  const syncPatientDrafts = (nextPatients: AdminPatientOps[]) => {
    setActiveProfessionalDrafts((current) => {
      const next = { ...current };
      for (const patient of nextPatients) {
        if (next[patient.id] === undefined) {
          next[patient.id] = patient.activeProfessionalId ?? "";
        }
      }
      return next;
    });

    setRemainingSessionsDrafts((current) => {
      const next = { ...current };
      for (const patient of nextPatients) {
        if (next[patient.id] === undefined) {
          next[patient.id] = String(patient.latestPurchase?.remainingCredits ?? 0);
        }
      }
      return next;
    });
  };

  const load = async (searchValue?: string, pageValue?: number) => {
    setLoading(true);
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

      const [packagesResponse, professionalsResponse, patientsResponse] = await Promise.all([
        apiRequest<SessionPackagesResponse>("/api/admin/session-packages", {}, props.token),
        apiRequest<ProfessionalsResponse>("/api/admin/professionals", {}, props.token),
        patientsRequest
      ]);

      setPackages(packagesResponse.sessionPackages);
      setProfessionals(professionalsResponse.professionals);
      setPatients(patientsResponse.patients);
      setPatientPagination(patientsResponse.pagination ?? null);
      setPatientPage(patientsResponse.pagination?.page ?? requestedPage);
      syncPatientDrafts(patientsResponse.patients);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load patient operations");
    } finally {
      setLoading(false);
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
          if (!next[booking.id]) {
            next[booking.id] = {
              status: booking.status,
              startsAt: isoToInputDateTime(booking.startsAt),
              endsAt: isoToInputDateTime(booking.endsAt),
              professionalId: booking.professionalId
            };
          }
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

  const saveRemainingSessions = async (patientId: string) => {
    const raw = remainingSessionsDrafts[patientId] ?? "";
    const remainingCredits = Number(raw);
    if (!Number.isInteger(remainingCredits) || remainingCredits < 0) {
      setError("Sesiones disponibles debe ser un entero mayor o igual a 0");
      return;
    }

    setError("");
    setSuccess("");
    try {
      await apiRequest<{ latestPurchase: AdminPatientOps["latestPurchase"] }>(
        "/api/admin/patients/" + patientId + "/sessions-available",
        {
          method: "PATCH",
          body: JSON.stringify({ remainingCredits, reason: getSessionReason(patientId) })
        },
        props.token
      );
      setSuccess("Sesiones disponibles actualizadas");
      await load();
      await loadPatientManagement(patientId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update sessions available");
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

  const editingPatient = editingPatientId ? patients.find((patient) => patient.id === editingPatientId) ?? null : null;
  const editingPatientDraft = editingPatient ? patientDetailDrafts[editingPatient.id] : undefined;
  const editingBookings = editingPatient ? patientBookings[editingPatient.id] ?? [] : [];
  const confirmedSessionsCount = editingBookings.filter((booking) => booking.status === "CONFIRMED").length;
  const loadingEditingBookings = editingPatient ? patientBookingsLoading[editingPatient.id] === true : false;

  return (
    <div className="stack-lg ops-page">
      <section className="card stack ops-panel patient-search-section">
        <div className="patient-section-head">
          <h2>Buscador de Pacientes</h2>
          <button className="new-patient-btn" type="button" onClick={() => openCreatePatientModal()}>Nuevo paciente</button>
        </div>

        <div className="patient-search-shell">
          <div className="patient-search-inline">
            <input
              className="patient-search-input"
              placeholder="Buscar paciente por nombre o email"
              value={patientSearchInput}
              onChange={(event) => setPatientSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void applyPatientSearch();
                }
              }}
            />
            <button type="button" className="primary" onClick={() => void applyPatientSearch()}>Buscar</button>
          </div>
          <div className="patient-search-actions">
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        {loading ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
        {!loading && patients.length === 0 ? (
          <div className="patient-empty-art">
            <img src={PATIENT_EMPTY_ART_URL} alt="La Ultima Cena - Leonardo da Vinci" loading="lazy" />
          </div>
        ) : null}

        {patientSearch.length > 0 ? (
          <section className="ops-section results-section">
            <header className="ops-section-head">
              <h3>Resultados de busqueda</h3>
            </header>
            <div className="patient-results-list">
              {patients.map((patient) => (
                <article
                  key={patient.id}
                  className={"patient-result-row" + (editingPatientId === patient.id ? " active" : "")}
                  onClick={() => {
                    setEditingPatientId(patient.id);
                    setIsPatientEditModalOpen(false);
                    void loadPatientManagement(patient.id);
                  }}
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
                        setEditingPatientId(patient.id);
                        setIsPatientEditModalOpen(true);
                        void loadPatientManagement(patient.id);
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

        {patientSearch === "*" && patientPagination ? (
          <div className="patient-pagination">
            <button
              type="button"
              aria-label="Pagina anterior"
              onClick={() => void goToPatientPage(patientPagination.page - 1)}
              disabled={!patientPagination.hasPrev}
            >
              &lt;
            </button>
            <span>Pagina {patientPagination.page} de {patientPagination.totalPages}</span>
            <button
              type="button"
              aria-label="Pagina siguiente"
              onClick={() => void goToPatientPage(patientPagination.page + 1)}
              disabled={!patientPagination.hasNext}
            >
              &gt;
            </button>
          </div>
        ) : null}

        {editingPatient && editingPatientDraft ? (
          <section className="patient-inline-panel record-panel">
            <div className="record-badge">Paciente seleccionado</div>
            <div className="patient-inline-head">
              <h3>{editingPatient.fullName}</h3>
              <button type="button" onClick={() => setIsPatientEditModalOpen(true)}>Editar</button>
            </div>
            <div className="grid-form">
              <label>
                Nombre completo
                <input value={editingPatientDraft.fullName} readOnly />
              </label>
              <label>
                Email
                <input value={editingPatientDraft.email} readOnly />
              </label>
              <label>
                Contrasena
                <input value={editingPatientDraft.password || "(sin cambio)"} readOnly />
              </label>
              <label>
                Zona horaria
                <input value={editingPatientDraft.timezone || "Pendiente"} readOnly />
              </label>
              <label>
                Estado
                <input value={editingPatientDraft.status} readOnly />
              </label>
              <label>
                Profesional asignado
                <input
                  value={
                    editingPatientDraft.activeProfessionalId
                      ? professionals.find((professional) => professional.id === editingPatientDraft.activeProfessionalId)?.fullName ?? editingPatientDraft.activeProfessionalId
                      : "Pendiente de asignacion"
                  }
                  readOnly
                />
              </label>
              <label>
                Sesiones confirmadas (solo lectura)
                <input value={String(confirmedSessionsCount)} readOnly />
              </label>
              <label>
                Saldo disponible (solo lectura)
                <input value={editingPatientDraft.remainingCredits} readOnly />
              </label>
            </div>
          </section>
        ) : null}

        {isCreatePatientModalOpen ? (
          <div className="patient-modal-backdrop" onClick={() => setIsCreatePatientModalOpen(false)}>
            <div className="patient-modal patient-create-modal" onClick={(event) => event.stopPropagation()}>
              <div className="patient-modal-head">
                <h3>Nuevo paciente</h3>
                <button type="button" onClick={() => setIsCreatePatientModalOpen(false)}>Cerrar</button>
              </div>

              <div className="grid-form">
                <label>
                  Nombre completo
                  <input
                    value={createPatientForm.fullName}
                    onChange={(event) => setCreatePatientForm((current) => ({ ...current, fullName: event.target.value }))}
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    autoComplete="off"
                    value={createPatientForm.email}
                    onChange={(event) => setCreatePatientForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>

                <label>
                  Contrasena
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={createPatientForm.password}
                    onChange={(event) => setCreatePatientForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>

                <label>
                  Zona horaria
                  <select
                    value={createPatientForm.timezone}
                    onChange={(event) => setCreatePatientForm((current) => ({ ...current, timezone: event.target.value }))}
                  >
                    <option value="">Pendiente</option>
                    {TIMEZONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Estado paciente
                  <select
                    value={createPatientForm.patientStatus}
                    onChange={(event) => setCreatePatientForm((current) => ({ ...current, patientStatus: event.target.value as PatientStatus }))}
                  >
                    <option value="active">{patientStatusLabel("active", props.language)}</option>
                    <option value="pause">{patientStatusLabel("pause", props.language)}</option>
                    <option value="cancelled">{patientStatusLabel("cancelled", props.language)}</option>
                    <option value="trial">{patientStatusLabel("trial", props.language)}</option>
                  </select>
                </label>
              </div>

              {createPatientError ? <p className="error-text">{createPatientError}</p> : null}

              <div className="button-row">
                <button className="primary" type="button" onClick={() => void createPatientFromModal()} disabled={createPatientLoading}>
                  {createPatientLoading ? "Creando..." : "Crear paciente"}
                </button>
                <button type="button" onClick={() => setIsCreatePatientModalOpen(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        ) : null}

        {editingPatient && isPatientEditModalOpen ? (
          <div className="patient-modal-backdrop" onClick={() => setIsPatientEditModalOpen(false)}>
            <div className="patient-modal" onClick={(event) => event.stopPropagation()}>
              <div className="patient-modal-head">
                <h3>{editingPatient.fullName}</h3>
                <button type="button" onClick={() => setIsPatientEditModalOpen(false)}>Cerrar</button>
              </div>

              {editingPatientDraft ? (
                <>
                  <div className="grid-form">
                    <label>
                      Nombre completo
                      <input
                        value={editingPatientDraft.fullName}
                        onChange={(event) =>
                          setPatientDetailDrafts((current) => ({
                            ...current,
                            [editingPatient.id]: { ...editingPatientDraft, fullName: event.target.value }
                          }))
                        }
                      />
                    </label>

                    <label>
                      Email
                      <input
                        type="email"
                        autoComplete="off"
                        value={editingPatientDraft.email}
                        onChange={(event) =>
                          setPatientDetailDrafts((current) => ({
                            ...current,
                            [editingPatient.id]: { ...editingPatientDraft, email: event.target.value }
                          }))
                        }
                      />
                    </label>

                    <label>
                      Contrasena (visible)
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder="Dejar vacio para mantener"
                        value={editingPatientDraft.password}
                        onChange={(event) =>
                          setPatientDetailDrafts((current) => ({
                            ...current,
                            [editingPatient.id]: { ...editingPatientDraft, password: event.target.value }
                          }))
                        }
                      />
                    </label>

                    <label>
                      Zona horaria
                      <select
                        value={editingPatientDraft.timezone}
                        onChange={(event) =>
                          setPatientDetailDrafts((current) => ({
                            ...current,
                            [editingPatient.id]: { ...editingPatientDraft, timezone: event.target.value }
                          }))
                        }
                      >
                        <option value="">Pendiente</option>
                        {TIMEZONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                      </select>
                    </label>

                    <label>
                      Estado paciente
                      <select
                        value={editingPatientDraft.status}
                        onChange={(event) =>
                          setPatientDetailDrafts((current) => ({
                            ...current,
                            [editingPatient.id]: { ...editingPatientDraft, status: event.target.value as PatientStatus }
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
                      Profesional asignado
                      <select
                        value={editingPatientDraft.activeProfessionalId}
                        onChange={(event) =>
                          setPatientDetailDrafts((current) => ({
                            ...current,
                            [editingPatient.id]: { ...editingPatientDraft, activeProfessionalId: event.target.value }
                          }))
                        }
                      >
                        <option value="">Pendiente de asignacion</option>
                        {professionals.map((professional) => (
                          <option key={professional.id} value={professional.id}>{professional.fullName}</option>
                        ))}
                      </select>
                    </label>

                  </div>

                  <section className="sessions-subsection">
                    <div className="sessions-subsection-head">
                      <h4>Subseccion de sesiones</h4>
                      <span className="record-badge">Gestion operativa</span>
                    </div>
                    <div className="sessions-subsection-grid">
                      <article className="sessions-metric-card">
                        <span>Sesiones confirmadas</span>
                        <strong>{confirmedSessionsCount}</strong>
                      </article>
                      <article className="sessions-metric-card">
                        <span>Sesiones disponibles</span>
                        <div className="sessions-available-editor">
                          <button
                            type="button"
                            onClick={() =>
                              setPatientDetailDrafts((current) => ({
                                ...current,
                                [editingPatient.id]: {
                                  ...current[editingPatient.id],
                                  remainingCredits: String(Math.max(0, Number(current[editingPatient.id]?.remainingCredits ?? "0") - 1))
                                }
                              }))
                            }
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={editingPatientDraft.remainingCredits}
                            onChange={(event) =>
                              setPatientDetailDrafts((current) => ({
                                ...current,
                                [editingPatient.id]: { ...editingPatientDraft, remainingCredits: event.target.value }
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPatientDetailDrafts((current) => ({
                                ...current,
                                [editingPatient.id]: {
                                  ...current[editingPatient.id],
                                  remainingCredits: String(Math.max(0, Number(current[editingPatient.id]?.remainingCredits ?? "0") + 1))
                                }
                              }))
                            }
                          >
                            +
                          </button>
                        </div>
                      </article>
                    </div>

                    <label>
                      Motivo del ajuste de sesiones
                      <select
                        value={sessionReasonDrafts[editingPatient.id] ?? SESSION_REASON_OPTIONS[0].value}
                        onChange={(event) =>
                          setSessionReasonDrafts((current) => ({
                            ...current,
                            [editingPatient.id]: event.target.value
                          }))
                        }
                      >
                        {SESSION_REASON_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <details className="card stack sessions-confirmed-accordion">
                      <summary className="patient-inline-head">
                        <h4>Ver sesiones confirmadas ({confirmedSessionsCount})</h4>
                        <span>Expandir</span>
                      </summary>
                      {loadingEditingBookings ? <p>Cargando sesiones confirmadas...</p> : null}
                      {!loadingEditingBookings && editingBookings.length === 0 ? <p>No hay sesiones confirmadas para este paciente.</p> : null}

                      {editingBookings.map((booking) => {
                        const draft = bookingDrafts[booking.id];
                        if (!draft) {
                          return null;
                        }
                        const draftProfessional = professionals.find((professional) => professional.id === draft.professionalId) ?? null;
                        const draftSlotValue = draft.startsAt + "__" + draft.endsAt;

                        return (
                          <details key={booking.id} className="card stack">
                            <summary className="patient-inline-head">
                              <h4>{booking.professionalName} · {formatDate(booking.startsAt, props.language)}</h4>
                              <span>Expandir</span>
                            </summary>
                            <div className="grid-form">
                              <label>
                                Estado
                                <select
                                  value={draft.status}
                                  onChange={(event) =>
                                    setBookingDrafts((current) => ({
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
                                Profesional
                                <select
                                  value={draft.professionalId}
                                  onChange={(event) =>
                                    setBookingDrafts((current) => ({
                                      ...current,
                                      [booking.id]: { ...current[booking.id], professionalId: event.target.value }
                                    }))
                                  }
                                >
                                  {professionals.map((professional) => (
                                    <option key={professional.id} value={professional.id}>{professional.fullName}</option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Slot del profesional
                                <select
                                  value={draftSlotValue}
                                  onChange={(event) => {
                                    const [slotStartsAt, slotEndsAt] = event.target.value.split("__");
                                    if (!slotStartsAt || !slotEndsAt) {
                                      return;
                                    }
                                    setBookingDrafts((current) => ({
                                      ...current,
                                      [booking.id]: {
                                        ...current[booking.id],
                                        startsAt: slotStartsAt,
                                        endsAt: slotEndsAt
                                      }
                                    }));
                                  }}
                                >
                                  <option value={draftSlotValue}>Personalizado</option>
                                  {(draftProfessional?.slots ?? []).map((slot) => (
                                    <option
                                      key={slot.id}
                                      value={isoToInputDateTime(slot.startsAt) + "__" + isoToInputDateTime(slot.endsAt)}
                                    >
                                      {formatDate(slot.startsAt, props.language)} - {formatDate(slot.endsAt, props.language)}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                Inicio
                                <input
                                  type="datetime-local"
                                  value={draft.startsAt}
                                  onChange={(event) =>
                                    setBookingDrafts((current) => ({
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
                                    setBookingDrafts((current) => ({
                                      ...current,
                                      [booking.id]: { ...current[booking.id], endsAt: event.target.value }
                                    }))
                                  }
                                />
                              </label>
                            </div>
                            <div className="button-row ops-actions">
                              <button className="primary" type="button" onClick={() => void savePatientBooking(editingPatient.id, booking.id)}>
                                Guardar sesion
                              </button>
                              <button className="danger" type="button" onClick={() => void cancelConfirmedBooking(editingPatient.id, booking.id)} disabled={sessionOpsLoading}>
                                Cancelar sesion
                              </button>
                            </div>
                          </details>
                        );
                      })}
                    </details>
                  </section>

                  <div className="button-row ops-actions">
                    <button className="primary" type="button" disabled={patientSaveLoading} onClick={() => void savePatientProfile(editingPatient)}>
                      {patientSaveLoading ? "Guardando..." : "Guardar paciente"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const value = Number(editingPatientDraft.remainingCredits);
                        if (!Number.isInteger(value) || value < 0) {
                          setError("Sesiones disponibles debe ser un entero mayor o igual a 0");
                          return;
                        }
                        setRemainingSessionsDrafts((current) => ({ ...current, [editingPatient.id]: String(value) }));
                        void saveRemainingSessions(editingPatient.id);
                      }}
                      disabled={sessionOpsLoading}
                    >
                      Guardar sesiones disponibles
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <PortalHeroSettingsSection token={props.token} language={props.language} target="patient" />
    </div>
  );
}

function ProfessionalsOpsPage(props: { token: string; language: AppLanguage }) {
  const [professionals, setProfessionals] = useState<AdminProfessionalOps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [professionalSearchInput, setProfessionalSearchInput] = useState("");
  const [professionalSearch, setProfessionalSearch] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [isProfessionalEditModalOpen, setIsProfessionalEditModalOpen] = useState(false);
  const [professionalSaveLoading, setProfessionalSaveLoading] = useState(false);
  const [professionalSlotDrafts, setProfessionalSlotDrafts] = useState<Record<string, { startsAt: string; endsAt: string }>>({});
  const [professionalBookings, setProfessionalBookings] = useState<Record<string, AdminBookingOps[]>>({});
  const [professionalBookingsLoading, setProfessionalBookingsLoading] = useState<Record<string, boolean>>({});
  const [professionalBookingDrafts, setProfessionalBookingDrafts] = useState<
    Record<string, { status: AdminBookingOps["status"]; startsAt: string; endsAt: string; professionalId: string }>
  >({});
  const [showConfirmedSessions, setShowConfirmedSessions] = useState(false);
  const [expandedConfirmedBookingId, setExpandedConfirmedBookingId] = useState<string | null>(null);
  const [professionalEditDrafts, setProfessionalEditDrafts] = useState<
    Record<
      string,
      {
        fullName: string;
        email: string;
        visible: boolean;
        cancellationHours: string;
        bio: string;
        therapeuticApproach: string;
        yearsExperience: string;
        photoUrl: string;
        videoUrl: string;
      }
    >
  >({});

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
          next[professional.id] = { startsAt: "", endsAt: "" };
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
            photoUrl: draft.photoUrl.trim().length > 0 ? draft.photoUrl.trim() : null,
            videoUrl: draft.videoUrl.trim().length > 0 ? draft.videoUrl.trim() : null
          })
        },
        props.token
      );

      setSuccess("Profesional actualizado");
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
    const draft = professionalSlotDrafts[professionalId];
    if (!draft?.startsAt || !draft?.endsAt) {
      setError("Slot requiere inicio y fin");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await apiRequest<{ slot: unknown }>(
        "/api/admin/professionals/" + professionalId + "/slots",
        {
          method: "POST",
          body: JSON.stringify({ startsAt: new Date(draft.startsAt).toISOString(), endsAt: new Date(draft.endsAt).toISOString() })
        },
        props.token
      );

      setProfessionalSlotDrafts((current) => ({ ...current, [professionalId]: { startsAt: "", endsAt: "" } }));
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
            </div>
          </section>
        ) : null}

        {selectedProfessional && isProfessionalEditModalOpen ? (
          <div className="patient-modal-backdrop" onClick={() => setIsProfessionalEditModalOpen(false)}>
            <div className="patient-modal" onClick={(event) => event.stopPropagation()}>
              <div className="patient-modal-head">
                <h3>{selectedProfessional.fullName}</h3>
                <button type="button" onClick={() => setIsProfessionalEditModalOpen(false)}>Cerrar</button>
              </div>

              {selectedProfessionalDraft ? (
                <>
                  <div className="grid-form">
                    <label>
                      Nombre completo
                      <input
                        value={selectedProfessionalDraft.fullName}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: { ...selectedProfessionalDraft, fullName: event.target.value }
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
                            [selectedProfessional.id]: { ...selectedProfessionalDraft, email: event.target.value }
                          }))
                        }
                      />
                    </label>

                    <label>
                      Perfil visible
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
                        <option value="true">Visible</option>
                        <option value="false">Oculto</option>
                      </select>
                    </label>

                    <label>
                      Horas de cancelacion
                      <input
                        type="number"
                        min={0}
                        max={168}
                        value={selectedProfessionalDraft.cancellationHours}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: { ...selectedProfessionalDraft, cancellationHours: event.target.value }
                          }))
                        }
                      />
                    </label>

                    <label>
                      Anos de experiencia
                      <input
                        type="number"
                        min={0}
                        max={80}
                        value={selectedProfessionalDraft.yearsExperience}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: { ...selectedProfessionalDraft, yearsExperience: event.target.value }
                          }))
                        }
                      />
                    </label>

                    <label>
                      Enfoque terapeutico
                      <input
                        value={selectedProfessionalDraft.therapeuticApproach}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: { ...selectedProfessionalDraft, therapeuticApproach: event.target.value }
                          }))
                        }
                      />
                    </label>

                    <label>
                      URL foto
                      <input
                        value={selectedProfessionalDraft.photoUrl}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: { ...selectedProfessionalDraft, photoUrl: event.target.value }
                          }))
                        }
                      />
                    </label>

                    <label>
                      URL video
                      <input
                        value={selectedProfessionalDraft.videoUrl}
                        onChange={(event) =>
                          setProfessionalEditDrafts((current) => ({
                            ...current,
                            [selectedProfessional.id]: { ...selectedProfessionalDraft, videoUrl: event.target.value }
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label>
                    Bio
                    <textarea
                      rows={3}
                      value={selectedProfessionalDraft.bio}
                      onChange={(event) =>
                        setProfessionalEditDrafts((current) => ({
                          ...current,
                          [selectedProfessional.id]: { ...selectedProfessionalDraft, bio: event.target.value }
                        }))
                      }
                    />
                  </label>

                  <section className="card stack">
                    <h4>Disponibilidad</h4>
                    <div className="grid-form">
                      <label>
                        Slot inicio
                        <input
                          type="datetime-local"
                          value={professionalSlotDrafts[selectedProfessional.id]?.startsAt ?? ""}
                          onChange={(event) =>
                            setProfessionalSlotDrafts((current) => ({
                              ...current,
                              [selectedProfessional.id]: {
                                startsAt: event.target.value,
                                endsAt: current[selectedProfessional.id]?.endsAt ?? ""
                              }
                            }))
                          }
                        />
                      </label>
                      <label>
                        Slot fin
                        <input
                          type="datetime-local"
                          value={professionalSlotDrafts[selectedProfessional.id]?.endsAt ?? ""}
                          onChange={(event) =>
                            setProfessionalSlotDrafts((current) => ({
                              ...current,
                              [selectedProfessional.id]: {
                                startsAt: current[selectedProfessional.id]?.startsAt ?? "",
                                endsAt: event.target.value
                              }
                            }))
                          }
                        />
                      </label>
                    </div>
                    <div className="button-row ops-actions">
                      <button type="button" onClick={() => void createSlot(selectedProfessional.id)}>Crear slot</button>
                    </div>
                    <div className="stack">
                      {selectedProfessional.slots.slice(0, 20).map((slot) => (
                        <div key={slot.id} className="toolbar ops-slot-row">
                          <p>{formatDate(slot.startsAt, props.language)} - {formatDate(slot.endsAt, props.language)}</p>
                          <button type="button" onClick={() => void deleteSlot(selectedProfessional.id, slot.id)}>Eliminar</button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="button-row ops-actions">
                    <button
                      className="primary"
                      type="button"
                      disabled={professionalSaveLoading}
                      onClick={() => void saveProfessionalProfile(selectedProfessional)}
                    >
                      {professionalSaveLoading ? "Guardando..." : "Guardar profesional"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !showConfirmedSessions;
                        setShowConfirmedSessions(next);
                        if (next) {
                          void loadProfessionalBookings(selectedProfessional.id);
                        }
                      }}
                    >
                      {showConfirmedSessions ? "Ocultar sesiones confirmadas" : "Ver sesiones confirmadas"}
                    </button>
                  </div>
                </>
              ) : null}

              {showConfirmedSessions ? (
                <>
                  {loadingSelectedBookings ? <p>Cargando sesiones confirmadas...</p> : null}
                  {!loadingSelectedBookings && selectedBookings.length === 0 ? <p>No hay sesiones confirmadas para este psicologo.</p> : null}

                  {selectedBookings.map((booking) => {
                    const draft = professionalBookingDrafts[booking.id];
                    if (!draft) {
                      return null;
                    }

                    const isExpanded = expandedConfirmedBookingId === booking.id;
                    const draftProfessional = professionals.find((item) => item.id === draft.professionalId) ?? null;
                    const draftSlotValue = draft.startsAt + "__" + draft.endsAt;

                    return (
                      <section key={booking.id} className="card stack">
                        <div className="patient-inline-head">
                          <h4>{booking.patientName} · {formatDate(booking.startsAt, props.language)}</h4>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedConfirmedBookingId((current) => (current === booking.id ? null : booking.id))
                            }
                          >
                            {isExpanded ? "Contraer" : "Expandir"}
                          </button>
                        </div>

                        {isExpanded ? (
                          <>
                            <div className="grid-form">
                              <label>
                                Estado
                                <select
                                  value={draft.status}
                                  onChange={(event) =>
                                    setProfessionalBookingDrafts((current) => ({
                                      ...current,
                                      [booking.id]: {
                                        ...current[booking.id],
                                        status: event.target.value as AdminBookingOps["status"]
                                      }
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
                                Slot del profesional
                                <select
                                  value={draftSlotValue}
                                  onChange={(event) => {
                                    const [slotStartsAt, slotEndsAt] = event.target.value.split("__");
                                    if (!slotStartsAt || !slotEndsAt) {
                                      return;
                                    }
                                    setProfessionalBookingDrafts((current) => ({
                                      ...current,
                                      [booking.id]: {
                                        ...current[booking.id],
                                        startsAt: slotStartsAt,
                                        endsAt: slotEndsAt
                                      }
                                    }));
                                  }}
                                >
                                  <option value={draftSlotValue}>Personalizado</option>
                                  {(draftProfessional?.slots ?? []).map((slot) => (
                                    <option
                                      key={slot.id}
                                      value={isoToInputDateTime(slot.startsAt) + "__" + isoToInputDateTime(slot.endsAt)}
                                    >
                                      {formatDate(slot.startsAt, props.language)} - {formatDate(slot.endsAt, props.language)}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                Inicio
                                <input
                                  type="datetime-local"
                                  value={draft.startsAt}
                                  onChange={(event) =>
                                    setProfessionalBookingDrafts((current) => ({
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
                                    setProfessionalBookingDrafts((current) => ({
                                      ...current,
                                      [booking.id]: { ...current[booking.id], endsAt: event.target.value }
                                    }))
                                  }
                                />
                              </label>
                            </div>
                            <div className="button-row ops-actions">
                              <button className="primary" type="button" onClick={() => void saveProfessionalBooking(selectedProfessional.id, booking.id)}>
                                Guardar sesion
                              </button>
                            </div>
                          </>
                        ) : null}
                      </section>
                    );
                  })}
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <PortalHeroSettingsSection token={props.token} language={props.language} target="professional" />
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
  const [usersPage, setUsersPage] = useState(1);
  const [usersPagination, setUsersPagination] = useState<{ page: number; pageSize: number; total: number; totalPages: number; hasPrev: boolean; hasNext: boolean } | null>(null);
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

  const loadUsers = async (requestedPage = usersPage) => {
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
      query.set("page", String(requestedPage));
      query.set("pageSize", "10");

      const response = await apiRequest<UsersResponse>(`/api/admin/users?${query.toString()}`, {}, props.token);

      setUsers(response.users);
      setUsersPagination(response.pagination ?? null);
      setUsersPage(response.pagination?.page ?? requestedPage);

      if (editingUserId && !response.users.some((item) => item.id === editingUserId)) {
        setEditingUserId(null);
      }
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
    void loadUsers(usersPage);
  }, [props.token, roleFilter, search, usersPage]);

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

    if (createForm.role === "PATIENT" && createForm.timezone.trim().length === 0) {
      setCreateError(
        t(props.language, {
          es: "Selecciona una zona horaria de USA.",
          en: "Select a USA time zone.",
          pt: "Selecione um fuso horario dos EUA."
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
      payload.timezone = createForm.timezone.trim();
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
        role: current.role
      }));
      setCreateSuccess(
        t(props.language, {
          es: "Usuario creado correctamente.",
          en: "User created successfully.",
          pt: "Usuario criado com sucesso."
        })
      );
      setUsersPage(1);
      await loadUsers(1);
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

  const toggleExpand = (user: AdminUser) => {
    if (editingUserId === user.id) {
      setEditingUserId(null);
      setEditError("");
      return;
    }
    openEdit(user);
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
      await loadUsers(usersPage);
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
                autoComplete="off"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>

            <label>
              {t(props.language, { es: "Contrasena", en: "Password", pt: "Senha" })}
              <input
                type="password"
                autoComplete="new-password"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>

            {createForm.role === "PATIENT" ? (
              <>
                <label>
                  {t(props.language, { es: "Zona horaria", en: "Time zone", pt: "Fuso horario" })}
                  <select
                    value={createForm.timezone}
                    onChange={(event) => setCreateForm((current) => ({ ...current, timezone: event.target.value }))}
                  >
                    <option value="">{t(props.language, { es: "Pendiente", en: "Pending", pt: "Pendente" })}</option>
                    {TIMEZONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
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

      <section className="card stack">
        <header className="toolbar">
          <div>
            <h2>{t(props.language, { es: "Listado de usuarios", en: "Users list", pt: "Lista de usuarios" })}</h2>
            <p>
              {t(props.language, {
                es: "Vista compacta: 1 linea por usuario, con expansion para ver y editar.",
                en: "Compact view: 1 line per user, expandable to view and edit.",
                pt: "Vista compacta: 1 linha por usuario, expansivel para ver e editar."
              })}
            </p>
          </div>

          <div className="toolbar-actions">
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as RoleFilter);
                setUsersPage(1);
              }}
            >
              <option value="ALL">{t(props.language, { es: "Todos los roles", en: "All roles", pt: "Todos os perfis" })}</option>
              <option value="PATIENT">{t(props.language, { es: "Pacientes", en: "Patients", pt: "Pacientes" })}</option>
              <option value="PROFESSIONAL">{t(props.language, { es: "Profesionales", en: "Professionals", pt: "Profissionais" })}</option>
              <option value="ADMIN">Admin</option>
            </select>

            <form
              className="search-row"
              onSubmit={(event) => {
                event.preventDefault();
                setUsersPage(1);
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
        {!listLoading && users.length === 0 ? (
          <p>{t(props.language, { es: "No hay usuarios para el filtro actual.", en: "No users for the current filter.", pt: "Nao ha usuarios para o filtro atual." })}</p>
        ) : null}

        {!listLoading
          ? users.map((user) => {
              const draft = editDrafts[user.id];
              const isExpanded = editingUserId === user.id && Boolean(draft);

              return (
                <article className={`user-card user-card-compact${isExpanded ? " expanded" : ""}`} key={user.id}>
                  <div className="user-row">
                    <div className="user-row-main">
                      <strong>{user.fullName}</strong>
                      <span>
                        {user.email} · {roleLabel(user.role, props.language)} · {formatDate(user.createdAt, props.language)}
                      </span>
                    </div>

                    <div className="user-row-actions">
                      <button type="button" onClick={() => toggleExpand(user)}>
                        {isExpanded
                          ? t(props.language, { es: "Contraer", en: "Collapse", pt: "Fechar" })
                          : t(props.language, { es: "Expandir", en: "Expand", pt: "Expandir" })}
                      </button>
                    </div>
                  </div>

                  {isExpanded && draft ? (
                    <div className="stack">
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
                        <small>ID: {user.id}</small>
                        <div className="ops-actions">
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
                    </div>
                  ) : null}
                </article>
              );
            })
          : null}

        {usersPagination ? (
          <div className="patient-pagination">
            <button
              type="button"
              disabled={!usersPagination.hasPrev || listLoading}
              onClick={() => setUsersPage((current) => Math.max(1, current - 1))}
            >
              {t(props.language, { es: "Anterior", en: "Previous", pt: "Anterior" })}
            </button>
            <span>
              {t(props.language, { es: `Pagina ${usersPagination.page} de ${usersPagination.totalPages}`, en: `Page ${usersPagination.page} of ${usersPagination.totalPages}`, pt: `Pagina ${usersPagination.page} de ${usersPagination.totalPages}` })}
            </span>
            <button
              type="button"
              disabled={!usersPagination.hasNext || listLoading}
              onClick={() => setUsersPage((current) => current + 1)}
            >
              {t(props.language, { es: "Siguiente", en: "Next", pt: "Seguinte" })}
            </button>
          </div>
        ) : null}
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
    reviewDate: new Date().toISOString().slice(0, 10),
    relativeDate: "hace 0 dias",
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
  const [savedSettings, setSavedSettings] = useState<WebLandingSettings>(emptySettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<Omit<AdminReview, "id">>(emptyReview);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postForm, setPostForm] = useState<Omit<AdminBlogPost, "id">>(emptyPost);
  const [reviewSearch, setReviewSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  const webListPageSize = 3;

  async function loadWebContent() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<WebContentResponse>("/api/admin/web-content", {}, token);
      const normalizedLoadedSettings = normalizeWebLandingSettings(data.settings ?? emptySettings);
      setSettings(normalizedLoadedSettings);
      setSavedSettings(normalizedLoadedSettings);
      setReviews(
        Array.isArray(data.reviews)
          ? data.reviews
              .filter((item): item is AdminReview => Boolean(item && typeof item === "object"))
              .map((item) => ({
                ...item,
                id: String(item.id ?? ""),
                name: String(item.name ?? "Sin nombre"),
                role: String(item.role ?? "Paciente"),
                relativeDate: String(item.relativeDate ?? "hace 0 dias"),
                text: String(item.text ?? ""),
                rating: Number(item.rating ?? 5),
                avatar: String(item.avatar ?? ""),
                accent: String(item.accent ?? "#7a5cff")
              }))
              .filter((item) => item.id.length > 0)
          : []
      );
      setPosts(
        Array.isArray(data.blogPosts)
          ? data.blogPosts
              .filter((item): item is AdminBlogPost => Boolean(item && typeof item === "object"))
              .map((item) => ({
                ...item,
                id: String(item.id ?? ""),
                title: String(item.title ?? "Sin titulo"),
                slug: String(item.slug ?? ""),
                excerpt: String(item.excerpt ?? ""),
                category: String(item.category ?? "General"),
                coverImage: String(item.coverImage ?? ""),
                authorName: String(item.authorName ?? "Equipo MotivarCare"),
                authorRole: String(item.authorRole ?? "Psicologa clinica"),
                authorAvatar: String(item.authorAvatar ?? ""),
                publishedAt: String(item.publishedAt ?? new Date().toISOString().slice(0, 10)),
                readTime: Number(item.readTime ?? 1),
                likes: Number(item.likes ?? 0),
                tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
                status: (item.status === "draft" ? "draft" : "published") as "draft" | "published",
                featured: Boolean(item.featured),
                seoTitle: String(item.seoTitle ?? ""),
                seoDescription: String(item.seoDescription ?? ""),
                body: String(item.body ?? "")
              }))
              .filter((item) => item.id.length > 0)
          : []
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load web content");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWebContent();
  }, [token]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setIsReviewModalOpen(false);
      setIsPostModalOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function saveSettings() {
    setError("");
    setSuccess("");
    setSettingsFeedback(null);
    setSavingSettings(true);

    const normalizedSettings = normalizeWebLandingSettings(settings);
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
      setSavedSettings(normalizedSettings);
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

  async function setReviewAvatarFromFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const originalDataUrl = await fileToDataUrl(file);
      const dataUrl = await compressImageDataUrl(originalDataUrl, 420, 0.86);
      setReviewForm((current) => ({ ...current, avatar: dataUrl }));
      setSuccess("Foto de review cargada.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cargar la foto");
    } finally {
      event.target.value = "";
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (reviewForm.name.trim().length < 2) {
      setError("Nombre invalido");
      return;
    }
    if ((reviewForm.reviewDate ?? "").trim().length === 0) {
      setError("Selecciona fecha de review");
      return;
    }
    if (!reviewForm.avatar || reviewForm.avatar.trim().length === 0) {
      setError("Carga una foto para la review");
      return;
    }
    if (reviewForm.text.trim().length < 5) {
      setError("Texto demasiado corto");
      return;
    }

    try {
      const payload = {
        ...reviewForm,
        reviewDate: reviewForm.reviewDate,
        relativeDate: formatRelativeDateFromReviewDate(reviewForm.reviewDate ?? inferReviewDate(reviewForm.relativeDate))
      };

      if (editingReviewId) {
        await apiRequest(
          `/api/admin/web-content/reviews/${editingReviewId}`,
          { method: "PUT", body: JSON.stringify(payload) },
          token
        );
      } else {
        await apiRequest("/api/admin/web-content/reviews", { method: "POST", body: JSON.stringify(payload) }, token);
      }
      setReviewForm(emptyReview);
      setEditingReviewId(null);
      setIsReviewModalOpen(false);
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

  async function setPostImageFromFile(
    event: ChangeEvent<HTMLInputElement>,
    key: "coverImage" | "authorAvatar"
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const originalDataUrl = await fileToDataUrl(file);
      const dataUrl = await compressImageDataUrl(originalDataUrl, 1600, 0.84);
      setPostForm((current) => ({ ...current, [key]: dataUrl }));
      setSuccess(key === "coverImage" ? "Portada cargada." : "Avatar de autor cargado.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cargar la imagen");
    } finally {
      event.target.value = "";
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
      setIsPostModalOpen(false);
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

  const filteredReviews = useMemo(() => {
    const search = reviewSearch.trim().toLowerCase();
    if (!search) {
      return reviews;
    }
    return reviews.filter((review) => {
      const values = [review.name, review.role, review.text].map((value) => String(value ?? "").toLowerCase());
      return values.some((value) => value.includes(search));
    });
  }, [reviewSearch, reviews]);

  const filteredPosts = useMemo(() => {
    const search = postSearch.trim().toLowerCase();
    if (!search) {
      return posts;
    }
    return posts.filter((post) => {
      const tagText = Array.isArray(post.tags) ? post.tags.join(" ") : "";
      const values = [post.title, post.slug, post.excerpt, post.subtitle ?? "", tagText].map((value) => String(value ?? "").toLowerCase());
      return values.some((value) => value.includes(search));
    });
  }, [postSearch, posts]);

  const hasPendingSettingsChanges = JSON.stringify(normalizeWebLandingSettings(settings)) !== JSON.stringify(savedSettings);

  const imageSlots: Array<{ key: keyof WebLandingSettings; label: string }> = [
    { key: "patientDesktopImageUrl", label: "Pacientes · laptop" },
    { key: "patientMobileImageUrl", label: "Pacientes · telefono" },
    { key: "professionalDesktopImageUrl", label: "Psicologos · laptop" },
    { key: "professionalMobileImageUrl", label: "Psicologos · telefono" }
  ];

  if (loading) {
    return <section className="card"><p>{t(language, { es: "Cargando contenido web...", en: "Loading web content...", pt: "Carregando conteudo web..." })}</p></section>;
  }

  function openCreateReviewModal() {
    setEditingReviewId(null);
    setReviewForm(emptyReview);
    setIsReviewModalOpen(true);
  }

  function openEditReviewModal(review: AdminReview) {
    setEditingReviewId(review.id);
    setReviewForm({
      name: review.name,
      role: review.role,
      reviewDate: review.reviewDate ?? inferReviewDate(review.relativeDate),
      relativeDate: review.relativeDate,
      text: review.text,
      rating: review.rating,
      avatar: review.avatar,
      accent: review.accent ?? "#7a5cff"
    });
    setIsReviewModalOpen(true);
  }

  function openCreatePostModal() {
    setEditingPostId(null);
    setPostForm(emptyPost);
    setIsPostModalOpen(true);
  }

  function openEditPostModal(post: AdminBlogPost) {
    setEditingPostId(post.id);
    setPostForm({ ...post });
    setIsPostModalOpen(true);
  }

  return (
    <div className="stack-lg">
      <section className="card stack">
        <h2>{t(language, { es: "Gestion Landing Page", en: "Landing Page Management", pt: "Gestao Landing Page" })}</h2>
        <p>{t(language, { es: "Gestiona reviews y articulos de la landing desde un solo modulo.", en: "Manage landing reviews and blog articles from one module.", pt: "Gerencie reviews e artigos da landing em um unico modulo." })}</p>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
      </section>

      <details className="card stack web-admin-accordion">
        <summary className="web-admin-accordion-summary">
          <div>
            <h2>{t(language, { es: "Imagenes hero landing", en: "Landing hero images", pt: "Imagens hero landing" })}</h2>
            <p>{t(language, { es: "Gestiona las 4 imagenes de la landing: pacientes y psicologos (laptop + telefono).", en: "Manage the 4 landing images: patients and psychologists (laptop + phone).", pt: "Gerencie as 4 imagens da landing: pacientes e psicologos (laptop + telefone)." })}</p>
          </div>
        </summary>
        <div className="web-admin-accordion-content stack">
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
          <button className="primary" type="button" onClick={() => void saveSettings()} disabled={savingSettings || !hasPendingSettingsChanges}>
            {savingSettings
              ? t(language, { es: "Guardando imagenes...", en: "Saving images...", pt: "Salvando imagens..." })
              : hasPendingSettingsChanges
                ? t(language, { es: "Guardar imagenes", en: "Save images", pt: "Salvar imagens" })
                : t(language, { es: "Sin cambios por guardar", en: "No changes to save", pt: "Sem alteracoes para salvar" })}
          </button>
          {settingsFeedback ? (
            <p className={settingsFeedback.type === "ok" ? "success-text" : "error-text"}>{settingsFeedback.message}</p>
          ) : null}
        </div>
      </details>

      <details className="card stack web-admin-accordion">
        <summary className="web-admin-accordion-summary">
          <div>
            <h2>{t(language, { es: `ABM Reviews (${reviews.length})`, en: `Reviews CRUD (${reviews.length})`, pt: `ABM Reviews (${reviews.length})` })}</h2>
            <p>{t(language, { es: "Crear, editar o eliminar reviews de la landing.", en: "Create, edit, or delete landing reviews.", pt: "Criar, editar ou excluir reviews da landing." })}</p>
          </div>
        </summary>
        <div className="web-admin-accordion-content stack">
          <div className="web-admin-list-toolbar">
            <input
              type="search"
              placeholder="Buscar review por nombre, rol o texto"
              value={reviewSearch}
              onChange={(event) => setReviewSearch(event.target.value)}
            />
            <button className="primary" type="button" onClick={openCreateReviewModal}>Nueva review</button>
          </div>
          <div className="stack web-admin-scroll-list">
            {filteredReviews.length === 0 ? (
              <p className="web-admin-empty-list">No hay reviews para mostrar con ese filtro.</p>
            ) : (
              filteredReviews.map((review) => (
                <article className="user-card web-admin-row-card" key={review.id}>
                  <header>
                    <h3>{review.name}</h3>
                    <span className="role-pill">{review.rating}★</span>
                  </header>
                  <p>{review.text}</p>
                  <div className="user-card-footer">
                    <small>{review.role} · {review.relativeDate}</small>
                    <div className="package-admin-icon-actions">
                      <button
                        className="package-admin-icon-button"
                        type="button"
                        title="Editar"
                        aria-label="Editar"
                        onClick={() => openEditReviewModal(review)}
                      >
                        ✏️
                      </button>
                      <button
                        className="package-admin-icon-button danger"
                        type="button"
                        title="Eliminar"
                        aria-label="Eliminar"
                        onClick={() => void removeReview(review.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </details>

      <details className="card stack web-admin-accordion">
        <summary className="web-admin-accordion-summary">
          <div>
            <h2>{t(language, { es: `ABM Articulos (${posts.length})`, en: `Articles CRUD (${posts.length})`, pt: `ABM Artigos (${posts.length})` })}</h2>
            <p>{t(language, { es: "Gestiona articulos del blog y su SEO desde un solo bloque.", en: "Manage blog posts and SEO in one block.", pt: "Gerencie artigos do blog e SEO em um unico bloco." })}</p>
          </div>
        </summary>
        <div className="web-admin-accordion-content stack">
          <div className="web-admin-list-toolbar">
            <input
              type="search"
              placeholder="Buscar articulo por titulo, slug, texto o tags"
              value={postSearch}
              onChange={(event) => setPostSearch(event.target.value)}
            />
            <button className="primary" type="button" onClick={openCreatePostModal}>Nuevo articulo</button>
          </div>
          <div className="stack web-admin-scroll-list">
            {filteredPosts.length === 0 ? (
              <p className="web-admin-empty-list">No hay articulos para mostrar con ese filtro.</p>
            ) : (
              filteredPosts.map((post) => (
                <article className="user-card web-admin-row-card" key={post.id}>
                  <header><h3>{post.title}</h3><span className="role-pill">{post.status}</span></header>
                  <p>{post.excerpt}</p>
                  <div className="user-card-footer">
                    <small>{post.publishedAt} · {post.likes} likes</small>
                    <div className="package-admin-icon-actions">
                      <button
                        className="package-admin-icon-button"
                        type="button"
                        title="Editar"
                        aria-label="Editar"
                        onClick={() => openEditPostModal(post)}
                      >
                        ✏️
                      </button>
                      <button
                        className="package-admin-icon-button danger"
                        type="button"
                        title="Eliminar"
                        aria-label="Eliminar"
                        onClick={() => void removePost(post.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </details>

      {isReviewModalOpen ? (
        <div className="patient-modal-backdrop" onClick={() => setIsReviewModalOpen(false)}>
          <section className="patient-modal patient-create-modal web-admin-form-modal" onClick={(event) => event.stopPropagation()}>
            <header className="patient-modal-head">
              <h2>{editingReviewId ? "Editar review" : "Nueva review"}</h2>
              <button type="button" onClick={() => setIsReviewModalOpen(false)}>Cerrar</button>
            </header>
            <form className="stack" onSubmit={(event) => void saveReview(event)}>
              <div className="grid-form">
                <label>Nombre<input value={reviewForm.name} onChange={(event) => setReviewForm((current) => ({ ...current, name: event.target.value }))} /></label>
                <label>Rol<input value={reviewForm.role} onChange={(event) => setReviewForm((current) => ({ ...current, role: event.target.value }))} /></label>
                <label>
                  Fecha de review
                  <input
                    className="review-date-input"
                    type="date"
                    value={reviewForm.reviewDate ?? ""}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(event) =>
                      setReviewForm((current) => ({
                        ...current,
                        reviewDate: event.target.value,
                        relativeDate: formatRelativeDateFromReviewDate(event.target.value)
                      }))
                    }
                  />
                </label>
                <label>
                  Rating
                  <select
                    value={String(reviewForm.rating)}
                    onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) || 5 }))}
                  >
                    <option value="5">★★★★★ (5)</option>
                    <option value="4">★★★★☆ (4)</option>
                    <option value="3">★★★☆☆ (3)</option>
                    <option value="2">★★☆☆☆ (2)</option>
                    <option value="1">★☆☆☆☆ (1)</option>
                  </select>
                </label>
                <label>
                  Foto
                  <input type="file" accept="image/*" onChange={(event) => void setReviewAvatarFromFile(event)} />
                </label>
              </div>
              {reviewForm.avatar ? (
                <div className="review-avatar-preview">
                  <img src={reviewForm.avatar} alt="Preview avatar review" loading="lazy" />
                  <button type="button" onClick={() => setReviewForm((current) => ({ ...current, avatar: "" }))}>Quitar foto</button>
                </div>
              ) : null}
              <label>Texto<textarea rows={3} value={reviewForm.text} onChange={(event) => setReviewForm((current) => ({ ...current, text: event.target.value }))} /></label>
              <div className="toolbar-actions">
                <button className="primary" type="submit">{editingReviewId ? "Actualizar review" : "Crear review"}</button>
                <button type="button" onClick={() => { setEditingReviewId(null); setReviewForm(emptyReview); }}>Limpiar</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isPostModalOpen ? (
        <div className="patient-modal-backdrop" onClick={() => setIsPostModalOpen(false)}>
          <section className="patient-modal web-admin-form-modal" onClick={(event) => event.stopPropagation()}>
            <header className="patient-modal-head">
              <h2>{editingPostId ? "Editar articulo" : "Nuevo articulo"}</h2>
              <button type="button" onClick={() => setIsPostModalOpen(false)}>Cerrar</button>
            </header>
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
                <label>
                  Portada (archivo)
                  <input type="file" accept="image/*" onChange={(event) => void setPostImageFromFile(event, "coverImage")} />
                </label>
                <label>
                  Avatar autor (archivo)
                  <input type="file" accept="image/*" onChange={(event) => void setPostImageFromFile(event, "authorAvatar")} />
                </label>
                <label>Cover image URL<input value={postForm.coverImage} onChange={(event) => setPostForm((current) => ({ ...current, coverImage: event.target.value }))} /></label>
                <label>Avatar autor URL<input value={postForm.authorAvatar} onChange={(event) => setPostForm((current) => ({ ...current, authorAvatar: event.target.value }))} /></label>
                <label>Status<select value={postForm.status} onChange={(event) => setPostForm((current) => ({ ...current, status: event.target.value as "draft" | "published" }))}><option value="published">published</option><option value="draft">draft</option></select></label>
                <label className="inline-toggle"><input type="checkbox" checked={postForm.featured} onChange={(event) => setPostForm((current) => ({ ...current, featured: event.target.checked }))} />Featured</label>
              </div>
              {(postForm.coverImage || postForm.authorAvatar) ? (
                <div className="post-image-preview-row">
                  {postForm.coverImage ? (
                    <figure className="post-image-preview">
                      <figcaption>Preview portada</figcaption>
                      <img src={postForm.coverImage} alt="Preview portada" loading="lazy" />
                    </figure>
                  ) : null}
                  {postForm.authorAvatar ? (
                    <figure className="post-image-preview post-image-preview-avatar">
                      <figcaption>Preview avatar autor</figcaption>
                      <img src={postForm.authorAvatar} alt="Preview avatar autor" loading="lazy" />
                    </figure>
                  ) : null}
                </div>
              ) : null}
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
          </section>
        </div>
      ) : null}
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
    if (to === "/plans-packages") {
      return t(props.language, { es: "Planes y paquetes de sesiones", en: "Session plans and packages", pt: "Planos e pacotes de sessoes" });
    }
    if (to === "/web-admin") {
      return t(props.language, { es: "Gestion Landing Page", en: "Landing Page Management", pt: "Gestao Landing Page" });
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

        <div className="sidebar-controls">
          <button className="danger" type="button" onClick={props.onLogout}>
            {t(props.language, { es: "Salir", en: "Sign out", pt: "Sair" })}
          </button>
        </div>
      </aside>

      <div className="admin-main">
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
              path="/plans-packages"
              element={
                <SessionPackagesAdminPage token={props.token} language={props.language} currency={props.currency} />
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
                <div className="stack-lg">
                  <section className="card stack">
                    <h2>{t(props.language, { es: "Configuracion regional", en: "Regional settings", pt: "Configuracoes regionais" })}</h2>
                    <div className="grid-form">
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
                  </section>

                  <section className="card stack">
                    <h2>{t(props.language, { es: "Administracion", en: "Administration", pt: "Administracao" })}</h2>
                    <p>{t(props.language, { es: "Accesos y herramientas avanzadas del panel.", en: "Access and advanced admin tools.", pt: "Acessos e ferramentas avancadas do painel." })}</p>
                    <div className="toolbar-actions">
                      <NavLink to="/users" className="primary">
                        {t(props.language, { es: "Ir a Usuarios", en: "Open Users", pt: "Abrir Usuarios" })}
                      </NavLink>
                    </div>
                  </section>
                </div>
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

  useEffect(() => {
    document.title = "MotivarCare Admin";
    let icon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.type = "image/svg+xml";
    icon.href = "/favicon.svg?v=admin-20260309";
  }, []);

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
