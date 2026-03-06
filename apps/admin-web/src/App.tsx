import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

type AccessRole = "PATIENT" | "PROFESSIONAL" | "ADMIN";
type UserFilterRole = "ALL" | AccessRole;
type PatientStatus = "active" | "pause" | "cancelled" | "trial";
type PortalSection = "/" | "/users" | "/policies" | "/ai";

interface ApiErrorPayload {
  error?: string;
}

interface AuthApiResponse {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: AccessRole;
    patientProfileId: string | null;
    professionalProfileId: string | null;
  };
}

interface AdminAuthUser {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN";
}

interface DashboardResponse {
  kpis: {
    activePatients: number;
    activeProfessionals: number;
    scheduledSessions: number;
    monthlyRevenueCents: number;
  };
  note: string;
}

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AccessRole;
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
  } | null;
  adminProfile: {
    id: string;
  } | null;
}

const runtimeEnv = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const API_BASE = runtimeEnv.VITE_API_URL ?? "http://localhost:4000";
const PATIENT_PORTAL_URL = runtimeEnv.VITE_PATIENT_PORTAL_URL ?? "http://localhost:5173";
const PROFESSIONAL_PORTAL_URL = runtimeEnv.VITE_PROFESSIONAL_PORTAL_URL ?? "http://localhost:5174";
const ADMIN_PORTAL_URL = runtimeEnv.VITE_ADMIN_PORTAL_URL ?? "http://localhost:5175";

const TOKEN_KEY = "therapy_admin_token";
const USER_KEY = "therapy_admin_user";

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
      if (payload.error) {
        errorMessage = payload.error;
      }
    } catch {
      // ignore parse errors
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function readStoredUser(): AdminAuthUser | null {
  const rawUser = window.localStorage.getItem(USER_KEY);
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token || !rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser) as AdminAuthUser;
    if (parsed.role !== "ADMIN") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function RoleGateway(props: { onAuthSuccess: (token: string, user: AdminAuthUser) => void }) {
  const [selectedRole, setSelectedRole] = useState<AccessRole>("ADMIN");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("Motivarte Admin");
  const [email, setEmail] = useState("admin@motivarte.com");
  const [password, setPassword] = useState("SecurePass123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roleMeta = {
    PATIENT: {
      label: "Paciente",
      portalUrl: PATIENT_PORTAL_URL,
      description: "Intake, matching, reserva + pago y chat 1 a 1."
    },
    PROFESSIONAL: {
      label: "Profesional",
      portalUrl: PROFESSIONAL_PORTAL_URL,
      description: "Dashboard profesional, agenda, pacientes y videollamadas."
    },
    ADMIN: {
      label: "Admin",
      portalUrl: ADMIN_PORTAL_URL,
      description: "Gestion operativa, usuarios, politicas y auditoria IA."
    }
  } as const;

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
              role: "ADMIN"
            }
          : {
              email: email.trim().toLowerCase(),
              password
            };

      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const response = await apiRequest<AuthApiResponse>(path, undefined, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.user.role !== "ADMIN") {
        throw new Error("La cuenta no corresponde al portal admin.");
      }

      props.onAuthSuccess(response.token, {
        id: response.user.id,
        fullName: response.user.fullName,
        email: response.user.email,
        role: "ADMIN"
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <span className="chip">Acceso unificado</span>
        <h1>Elegir portal por rol</h1>
        <p>Selecciona si ingresas como paciente, profesional o admin.</p>

        <div className="role-switch">
          {(["PATIENT", "PROFESSIONAL", "ADMIN"] as AccessRole[]).map((role) => (
            <button
              key={role}
              className={selectedRole === role ? "active" : ""}
              type="button"
              onClick={() => setSelectedRole(role)}
            >
              {roleMeta[role].label}
            </button>
          ))}
        </div>

        {selectedRole !== "ADMIN" ? (
          <article className="role-card">
            <h2>Portal {roleMeta[selectedRole].label}</h2>
            <p>{roleMeta[selectedRole].description}</p>
            <a className="primary-link" href={roleMeta[selectedRole].portalUrl}>
              Abrir portal {roleMeta[selectedRole].label.toLowerCase()}
            </a>
          </article>
        ) : (
          <article className="role-card">
            <div className="auth-mode-switch">
              <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
                Ingresar
              </button>
              <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>
                Crear admin
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
              <button className="primary" disabled={loading} type="submit">
                {loading ? "Validando..." : mode === "register" ? "Crear admin" : "Entrar al admin"}
              </button>
            </form>
          </article>
        )}
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
        const response = await apiRequest<DashboardResponse>("/api/admin/kpis", props.token);
        if (active) {
          setData(response);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "No se pudo cargar dashboard");
        }
      }
    };

    void load();
    const timer = window.setInterval(load, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [props.token]);

  if (error) {
    return (
      <section className="card">
        <p className="error-text">{error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="card">
        <p>Cargando dashboard...</p>
      </section>
    );
  }

  return (
    <div className="stack-lg">
      <section className="kpi-grid">
        <article className="kpi-card">
          <span>Pacientes activos</span>
          <strong>{data.kpis.activePatients}</strong>
        </article>
        <article className="kpi-card">
          <span>Profesionales activos</span>
          <strong>{data.kpis.activeProfessionals}</strong>
        </article>
        <article className="kpi-card">
          <span>Sesiones agendadas</span>
          <strong>{data.kpis.scheduledSessions}</strong>
        </article>
        <article className="kpi-card">
          <span>Revenue mensual</span>
          <strong>{centsToUsd(data.kpis.monthlyRevenueCents)}</strong>
        </article>
      </section>
      <section className="card">
        <h2>Estado operativo</h2>
        <p>{data.note}</p>
      </section>
    </div>
  );
}

function UserRow(props: {
  token: string;
  user: AdminUser;
  onUpdated: (user: AdminUser) => void;
}) {
  const [fullName, setFullName] = useState(props.user.fullName);
  const [password, setPassword] = useState("");
  const [patientStatus, setPatientStatus] = useState<PatientStatus>(
    (props.user.patientProfile?.status as PatientStatus | undefined) ?? "active"
  );
  const [patientTimezone, setPatientTimezone] = useState(props.user.patientProfile?.timezone ?? "America/New_York");
  const [professionalVisible, setProfessionalVisible] = useState(props.user.professionalProfile?.visible ?? true);
  const [professionalCancellationHours, setProfessionalCancellationHours] = useState(
    props.user.professionalProfile?.cancellationHours ?? 24
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setFullName(props.user.fullName);
    setPatientStatus((props.user.patientProfile?.status as PatientStatus | undefined) ?? "active");
    setPatientTimezone(props.user.patientProfile?.timezone ?? "America/New_York");
    setProfessionalVisible(props.user.professionalProfile?.visible ?? true);
    setProfessionalCancellationHours(props.user.professionalProfile?.cancellationHours ?? 24);
  }, [props.user]);

  const handleSave = async () => {
    const payload: Record<string, unknown> = {};

    if (fullName.trim() && fullName.trim() !== props.user.fullName) {
      payload.fullName = fullName.trim();
    }

    if (password.trim().length > 0) {
      payload.password = password.trim();
    }

    if (props.user.role === "PATIENT") {
      if (patientStatus !== props.user.patientProfile?.status) {
        payload.patientStatus = patientStatus;
      }
      if (patientTimezone.trim() && patientTimezone.trim() !== props.user.patientProfile?.timezone) {
        payload.patientTimezone = patientTimezone.trim();
      }
    }

    if (props.user.role === "PROFESSIONAL") {
      if (professionalVisible !== props.user.professionalProfile?.visible) {
        payload.professionalVisible = professionalVisible;
      }
      if (professionalCancellationHours !== props.user.professionalProfile?.cancellationHours) {
        payload.professionalCancellationHours = professionalCancellationHours;
      }
    }

    if (Object.keys(payload).length === 0) {
      setMessage("Sin cambios para guardar.");
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiRequest<{ user: AdminUser }>(`/api/admin/users/${props.user.id}`, props.token, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      props.onUpdated(response.user);
      setPassword("");
      setMessage("Usuario actualizado.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="user-card">
      <header>
        <div>
          <h3>{props.user.fullName}</h3>
          <p>{props.user.email}</p>
        </div>
        <span className="role-pill">{props.user.role}</span>
      </header>

      <div className="user-grid">
        <label>
          Nombre
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </label>

        <label>
          Reset password
          <input
            placeholder="Nueva contrasena (opcional)"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {props.user.role === "PATIENT" ? (
          <>
            <label>
              Estado del paciente
              <select value={patientStatus} onChange={(event) => setPatientStatus(event.target.value as PatientStatus)}>
                <option value="active">active</option>
                <option value="pause">pause</option>
                <option value="cancelled">cancelled</option>
                <option value="trial">trial</option>
              </select>
            </label>
            <label>
              Zona horaria
              <input value={patientTimezone} onChange={(event) => setPatientTimezone(event.target.value)} />
            </label>
          </>
        ) : null}

        {props.user.role === "PROFESSIONAL" ? (
          <>
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={professionalVisible}
                onChange={(event) => setProfessionalVisible(event.target.checked)}
              />
              Perfil visible
            </label>
            <label>
              Politica cancelacion (horas)
              <input
                type="number"
                min={0}
                max={168}
                value={professionalCancellationHours}
                onChange={(event) => setProfessionalCancellationHours(Number(event.target.value || 24))}
              />
            </label>
          </>
        ) : null}
      </div>

      <footer className="user-card-footer">
        <small>
          Creado: {formatDateTime(props.user.createdAt)} · Actualizado: {formatDateTime(props.user.updatedAt)}
        </small>
        <button className="primary" disabled={loading} type="button" onClick={() => void handleSave()}>
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
      </footer>

      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}
    </article>
  );
}

function UsersPage(props: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [roleFilter, setRoleFilter] = useState<UserFilterRole>("ALL");
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("SecurePass123");
  const [role, setRole] = useState<AccessRole>("PATIENT");
  const [timezone, setTimezone] = useState("America/New_York");
  const [patientStatus, setPatientStatus] = useState<PatientStatus>("active");
  const [professionalVisible, setProfessionalVisible] = useState(true);
  const [professionalCancellationHours, setProfessionalCancellationHours] = useState(24);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [createError, setCreateError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (roleFilter !== "ALL") {
        params.set("role", roleFilter);
      }
      if (appliedSearch.trim()) {
        params.set("search", appliedSearch.trim());
      }

      const query = params.toString();
      const path = query.length > 0 ? `/api/admin/users?${query}` : "/api/admin/users";
      const response = await apiRequest<{ users: AdminUser[] }>(path, props.token);
      setUsers(response.users);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [props.token, roleFilter, appliedSearch]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const counters = useMemo(() => {
    return {
      total: users.length,
      patients: users.filter((user) => user.role === "PATIENT").length,
      professionals: users.filter((user) => user.role === "PROFESSIONAL").length,
      admins: users.filter((user) => user.role === "ADMIN").length
    };
  }, [users]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setCreateMessage("");
    setCreateLoading(true);

    try {
      const payload: Record<string, unknown> = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role
      };

      if (role === "PATIENT") {
        payload.timezone = timezone.trim();
        payload.patientStatus = patientStatus;
      }

      if (role === "PROFESSIONAL") {
        payload.professionalVisible = professionalVisible;
        payload.professionalCancellationHours = professionalCancellationHours;
      }

      await apiRequest<{ user: AdminUser }>("/api/admin/users", props.token, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setCreateMessage("Usuario creado correctamente.");
      setFullName("");
      setEmail("");
      setPassword("SecurePass123");
      await loadUsers();
    } catch (requestError) {
      setCreateError(requestError instanceof Error ? requestError.message : "No se pudo crear el usuario");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="stack-lg">
      <section className="card">
        <h2>Gestion de usuarios</h2>
        <p>Alta y mantenimiento de cuentas paciente, profesional y admin.</p>

        <div className="kpi-grid">
          <article className="kpi-card">
            <span>Total</span>
            <strong>{counters.total}</strong>
          </article>
          <article className="kpi-card">
            <span>Pacientes</span>
            <strong>{counters.patients}</strong>
          </article>
          <article className="kpi-card">
            <span>Profesionales</span>
            <strong>{counters.professionals}</strong>
          </article>
          <article className="kpi-card">
            <span>Admins</span>
            <strong>{counters.admins}</strong>
          </article>
        </div>
      </section>

      <section className="card">
        <h2>Crear usuario</h2>
        <form className="grid-form" onSubmit={handleCreate}>
          <label>
            Nombre completo
            <input required value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>

          <label>
            Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            Contrasena
            <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          <label>
            Rol
            <select value={role} onChange={(event) => setRole(event.target.value as AccessRole)}>
              <option value="PATIENT">PATIENT</option>
              <option value="PROFESSIONAL">PROFESSIONAL</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>

          {role === "PATIENT" ? (
            <>
              <label>
                Zona horaria
                <input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
              </label>
              <label>
                Estado inicial
                <select value={patientStatus} onChange={(event) => setPatientStatus(event.target.value as PatientStatus)}>
                  <option value="active">active</option>
                  <option value="pause">pause</option>
                  <option value="cancelled">cancelled</option>
                  <option value="trial">trial</option>
                </select>
              </label>
            </>
          ) : null}

          {role === "PROFESSIONAL" ? (
            <>
              <label className="inline-toggle">
                <input
                  type="checkbox"
                  checked={professionalVisible}
                  onChange={(event) => setProfessionalVisible(event.target.checked)}
                />
                Perfil visible
              </label>
              <label>
                Politica cancelacion (horas)
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={professionalCancellationHours}
                  onChange={(event) => setProfessionalCancellationHours(Number(event.target.value || 24))}
                />
              </label>
            </>
          ) : null}

          <button className="primary" disabled={createLoading} type="submit">
            {createLoading ? "Creando..." : "Crear usuario"}
          </button>
        </form>
        {createError ? <p className="error-text">{createError}</p> : null}
        {createMessage ? <p className="success-text">{createMessage}</p> : null}
      </section>

      <section className="card">
        <div className="toolbar">
          <h2>Usuarios existentes</h2>

          <div className="toolbar-actions">
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as UserFilterRole)}>
              <option value="ALL">Todos los roles</option>
              <option value="PATIENT">PATIENT</option>
              <option value="PROFESSIONAL">PROFESSIONAL</option>
              <option value="ADMIN">ADMIN</option>
            </select>

            <form
              className="search-row"
              onSubmit={(event) => {
                event.preventDefault();
                setAppliedSearch(searchDraft);
              }}
            >
              <input
                placeholder="Buscar por nombre o email"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
              <button type="submit">Buscar</button>
            </form>

            <button type="button" onClick={() => void loadUsers()}>
              Refrescar
            </button>
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {loading ? <p>Cargando usuarios...</p> : null}
        {!loading && users.length === 0 ? <p>No hay usuarios para este filtro.</p> : null}
        <div className="stack">
          {users.map((user) => (
            <UserRow
              key={user.id}
              token={props.token}
              user={user}
              onUpdated={(updated) =>
                setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function PoliciesPage() {
  return (
    <section className="card">
      <h2>Politicas operativas</h2>
      <ul>
        <li>Cancelacion gratuita hasta 24 horas antes.</li>
        <li>No-show configurable por regla de creditos.</li>
        <li>Mensajeria protegida con trazabilidad.</li>
        <li>Consentimiento explicito para auditoria IA.</li>
      </ul>
    </section>
  );
}

function AiAuditPage() {
  return (
    <section className="card">
      <h2>IA Audit</h2>
      <p>
        Modulo preparado para auditar texto y, con consentimiento, transcripciones de llamadas. Se recomienda
        revison humana para casos de riesgo.
      </p>
    </section>
  );
}

function Portal(props: { token: string; user: AdminAuthUser; onLogout: () => void }) {
  const links: Array<{ to: PortalSection; label: string }> = [
    { to: "/", label: "Dashboard" },
    { to: "/users", label: "Usuarios" },
    { to: "/policies", label: "Politicas" },
    { to: "/ai", label: "IA Audit" }
  ];

  return (
    <div className="layout">
      <header className="header">
        <div>
          <span className="chip">Portal admin</span>
          <h1>{props.user.fullName}</h1>
          <p>{props.user.email}</p>
        </div>
        <button className="danger" type="button" onClick={props.onLogout}>
          Cerrar sesion
        </button>
      </header>

      <nav className="nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? "active" : "")}
            end={link.to === "/"}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<DashboardPage token={props.token} />} />
          <Route path="/users" element={<UsersPage token={props.token} />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/ai" element={<AiAuditPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  const [token, setToken] = useState<string>(() => window.localStorage.getItem(TOKEN_KEY) ?? "");
  const [user, setUser] = useState<AdminAuthUser | null>(() => readStoredUser());

  const handleAuthSuccess = (nextToken: string, nextUser: AdminAuthUser) => {
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
    return <RoleGateway onAuthSuccess={handleAuthSuccess} />;
  }

  return <Portal token={token} user={user} onLogout={handleLogout} />;
}
