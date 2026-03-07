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

type Role = "PATIENT" | "PROFESSIONAL" | "ADMIN";
type PatientStatus = "active" | "pause" | "cancelled" | "trial";
type RoleFilter = Role | "ALL";
type PortalPath = "/" | "/users" | "/payments" | "/policies" | "/ai";

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
  { to: "/", label: "Overview" },
  { to: "/users", label: "Usuarios" },
  { to: "/payments", label: "Pagos" },
  { to: "/policies", label: "Politicas" },
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
            Email
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
          setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el overview");
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
        <p>Cargando overview...</p>
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
      setListError(requestError instanceof Error ? requestError.message : "No se pudo cargar usuarios");
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
      setCreateError("Horas de cancelacion invalida.");
      return;
    }

    const professionalYearsExperience = parseIntField(createForm.professionalYearsExperience);
    if (createForm.role === "PROFESSIONAL" && createForm.professionalYearsExperience.trim().length > 0 && professionalYearsExperience === null) {
      setCreateError("Anos de experiencia invalido.");
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
      setCreateSuccess("Usuario creado correctamente.");
      await loadUsers();
    } catch (requestError) {
      setCreateError(requestError instanceof Error ? requestError.message : "No se pudo crear el usuario");
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
        setEditError("Horas de cancelacion invalida.");
        return;
      }

      const yearsExperience = parseIntField(draft.professionalYearsExperience);
      if (draft.professionalYearsExperience.trim().length > 0 && yearsExperience === null) {
        setSaveLoading(false);
        setEditError("Anos de experiencia invalido.");
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

      setEditSuccess("Usuario actualizado.");
      setEditingUserId(null);
      await loadUsers();
    } catch (requestError) {
      setEditError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el usuario");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="stack-lg">
      <section className="card stack">
        <header className="toolbar">
          <div>
            <h2>Modulo de usuarios</h2>
            <p>Alta y edicion de pacientes, profesionales y administradores.</p>
          </div>

          <div className="toolbar-actions">
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}>
              <option value="ALL">Todos los roles</option>
              <option value="PATIENT">Pacientes</option>
              <option value="PROFESSIONAL">Profesionales</option>
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
                placeholder="Buscar por email o nombre"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <button type="submit">Buscar</button>
            </form>
          </div>
        </header>

        {listError ? <p className="error-text">{listError}</p> : null}
        {editError ? <p className="error-text">{editError}</p> : null}
        {editSuccess ? <p className="success-text">{editSuccess}</p> : null}

        {listLoading ? <p>Cargando usuarios...</p> : null}
        {!listLoading && sortedUsers.length === 0 ? <p>No hay usuarios para el filtro actual.</p> : null}

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
                    <span className="role-pill">{user.role}</span>
                  </header>

                  <div className="user-grid">
                    <div>
                      <strong>Creado</strong>
                      <p>{formatDate(user.createdAt, props.language)}</p>
                    </div>
                    <div>
                      <strong>Actualizado</strong>
                      <p>{formatDate(user.updatedAt, props.language)}</p>
                    </div>

                    {user.patientProfile ? (
                      <>
                        <div>
                          <strong>Paciente · Estado</strong>
                          <p>{user.patientProfile.status}</p>
                        </div>
                        <div>
                          <strong>Paciente · Zona horaria</strong>
                          <p>{user.patientProfile.timezone}</p>
                        </div>
                      </>
                    ) : null}

                    {user.professionalProfile ? (
                      <>
                        <div>
                          <strong>Profesional · Visible</strong>
                          <p>{user.professionalProfile.visible ? "Si" : "No"}</p>
                        </div>
                        <div>
                          <strong>Horas cancelacion</strong>
                          <p>{user.professionalProfile.cancellationHours}h</p>
                        </div>
                        <div>
                          <strong>Bio</strong>
                          <p>{user.professionalProfile.bio || "-"}</p>
                        </div>
                        <div>
                          <strong>Video presentacion</strong>
                          <p>{user.professionalProfile.videoUrl || "-"}</p>
                        </div>
                      </>
                    ) : null}
                  </div>

                  {isEditing && draft ? (
                    <div className="stack">
                      <div className="grid-form">
                        <label>
                          Nombre completo
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
                          Nueva contrasena (opcional)
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
                              Estado del paciente
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
                                <option value="active">active</option>
                                <option value="pause">pause</option>
                                <option value="cancelled">cancelled</option>
                                <option value="trial">trial</option>
                              </select>
                            </label>

                            <label>
                              Zona horaria
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
                              Perfil visible
                            </label>

                            <label>
                              Horas de cancelacion
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
                              Anos de experiencia
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
                              Bio
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
                              Enfoque terapeutico
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
                              URL de foto
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
                              URL video presentacion
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
                          {saveLoading ? "Guardando..." : "Guardar cambios"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserId(null);
                            setEditError("");
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <footer className="user-card-footer">
                    <small>ID: {user.id}</small>
                    <button type="button" onClick={() => openEdit(user)}>Editar</button>
                  </footer>
                </article>
              );
            })
          : null}
      </section>

      <section className="card stack">
        <h2>Alta de usuarios</h2>
        <p>Registra pacientes, profesionales o admins desde este modulo.</p>

        <form className="stack" onSubmit={handleCreateUser}>
          <div className="grid-form">
            <label>
              Rol
              <select
                value={createForm.role}
                onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value as Role }))}
              >
                <option value="PATIENT">Paciente</option>
                <option value="PROFESSIONAL">Profesional</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>

            <label>
              Nombre completo
              <input
                value={createForm.fullName}
                onChange={(event) => setCreateForm((current) => ({ ...current, fullName: event.target.value }))}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>

            <label>
              Contrasena
              <input
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>

            {createForm.role === "PATIENT" ? (
              <>
                <label>
                  Zona horaria
                  <input
                    value={createForm.timezone}
                    onChange={(event) => setCreateForm((current) => ({ ...current, timezone: event.target.value }))}
                  />
                </label>

                <label>
                  Estado paciente
                  <select
                    value={createForm.patientStatus}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, patientStatus: event.target.value as PatientStatus }))
                    }
                  >
                    <option value="active">active</option>
                    <option value="pause">pause</option>
                    <option value="cancelled">cancelled</option>
                    <option value="trial">trial</option>
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
                  Perfil visible
                </label>

                <label>
                  Horas de cancelacion
                  <input
                    value={createForm.professionalCancellationHours}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, professionalCancellationHours: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Anos de experiencia
                  <input
                    value={createForm.professionalYearsExperience}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, professionalYearsExperience: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Bio
                  <textarea
                    rows={3}
                    value={createForm.professionalBio}
                    onChange={(event) => setCreateForm((current) => ({ ...current, professionalBio: event.target.value }))}
                  />
                </label>

                <label>
                  Enfoque terapeutico
                  <input
                    value={createForm.professionalTherapeuticApproach}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, professionalTherapeuticApproach: event.target.value }))
                    }
                  />
                </label>

                <label>
                  URL foto profesional
                  <input
                    value={createForm.professionalPhotoUrl}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, professionalPhotoUrl: event.target.value }))
                    }
                  />
                </label>

                <label>
                  URL video de presentacion
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
            {createLoading ? "Creando..." : "Crear usuario"}
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
      return t(props.language, { es: "Overview", en: "Overview", pt: "Visao geral" });
    }
    if (to === "/users") {
      return t(props.language, { es: "Usuarios", en: "Users", pt: "Usuarios" });
    }
    if (to === "/payments") {
      return t(props.language, { es: "Pagos", en: "Payments", pt: "Pagamentos" });
    }
    if (to === "/policies") {
      return t(props.language, { es: "Politicas", en: "Policies", pt: "Politicas" });
    }
    return "IA Audit";
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">M</span>
          <div>
            <strong>Motivarte</strong>
            <p>Admin</p>
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

        <nav className="admin-mobile-nav" aria-label="Admin mobile navigation">
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
            <Route path="/" element={<OverviewPage token={props.token} language={props.language} currency={props.currency} />} />
            <Route path="/users" element={<UsersPage token={props.token} language={props.language} />} />
            <Route
              path="/payments"
              element={
                <InfoPage
                  title={t(props.language, { es: "Pagos", en: "Payments", pt: "Pagamentos" })}
                  description={t(props.language, {
                    es: "Control de Stripe, conciliaciones y payouts para profesionales.",
                    en: "Stripe control, reconciliations, and professional payouts.",
                    pt: "Controle de Stripe, conciliacoes e pagamentos para profissionais."
                  })}
                />
              }
            />
            <Route
              path="/policies"
              element={
                <InfoPage
                  title={t(props.language, { es: "Politicas y seguridad", en: "Policies and security", pt: "Politicas e seguranca" })}
                  description={t(props.language, {
                    es: "Cancelacion 24h, no-show, control de acceso por rol y CORS restringido por origen.",
                    en: "24h cancellation, no-show policy, role-based access, and origin-restricted CORS.",
                    pt: "Cancelamento em 24h, politica de no-show, acesso por perfil e CORS restrito por origem."
                  })}
                />
              }
            />
            <Route
              path="/ai"
              element={
                <InfoPage
                  title="IA Audit"
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
