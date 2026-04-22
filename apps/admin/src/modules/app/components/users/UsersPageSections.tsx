import type { FormEvent, Dispatch, SetStateAction } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { ProfessionalPhotoUrlField } from "../shared/ProfessionalPhotoUrlField";
import { TIMEZONE_OPTIONS } from "../../constants";
import { RESIDENCY_COUNTRY_OPTIONS, splitFullNameToFirstLast } from "@therapy/types";
import type {
  AdminUser,
  CreateUserFormState,
  EditUserDraft,
  PatientStatus,
  Role,
  RoleFilter
} from "../../types";

function stringFromOptionalNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

export function UsersCreateSection(props: {
  language: AppLanguage;
  createForm: CreateUserFormState;
  createError: string;
  createSuccess: string;
  createLoading: boolean;
  setCreateForm: Dispatch<SetStateAction<CreateUserFormState>>;
  patientStatusLabel: (status: PatientStatus | string) => string;
  t: (values: { es: string; en: string; pt: string }) => string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** En Configuración: ocultar barra de título del acordeón y cerrar con este control. */
  embeddedDismiss?: { onClose: () => void };
}) {
  return (
    <div className="stack">
      {props.embeddedDismiss ? (
        <div className="toolbar-actions users-create-embedded-dismiss">
          <button type="button" className="ghost" onClick={props.embeddedDismiss.onClose}>
            {props.t({ es: "Cerrar formulario", en: "Close form", pt: "Fechar formulario" })}
          </button>
        </div>
      ) : null}
      <form className="stack" onSubmit={props.onSubmit}>
        <div className="grid-form">
          <label>
            {props.t({ es: "Rol", en: "Role", pt: "Perfil" })}
            <select
              value={props.createForm.role}
              onChange={(event) => props.setCreateForm((current) => ({ ...current, role: event.target.value as Role }))}
            >
              <option value="PATIENT">{props.t({ es: "Paciente", en: "Patient", pt: "Paciente" })}</option>
              <option value="PROFESSIONAL">{props.t({ es: "Profesional", en: "Professional", pt: "Profissional" })}</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>

          <label>
            {props.t({ es: "Nombre", en: "First name", pt: "Nome" })}
            <input
              autoComplete="given-name"
              value={props.createForm.firstName}
              onChange={(event) => props.setCreateForm((current) => ({ ...current, firstName: event.target.value }))}
            />
          </label>

          <label>
            {props.t({ es: "Apellido", en: "Last name", pt: "Sobrenome" })}
            <input
              autoComplete="family-name"
              value={props.createForm.lastName}
              onChange={(event) => props.setCreateForm((current) => ({ ...current, lastName: event.target.value }))}
            />
          </label>

          <label>
            {props.t({ es: "Email", en: "Email", pt: "Email" })}
            <input
              type="email"
              autoComplete="off"
              value={props.createForm.email}
              onChange={(event) => props.setCreateForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>

          <label>
            {props.t({ es: "Contraseña", en: "Password", pt: "Senha" })}
            <input
              type="password"
              autoComplete="new-password"
              value={props.createForm.password}
              onChange={(event) => props.setCreateForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>

          <label className="inline-toggle">
            <input
              checked={props.createForm.isTestUser}
              type="checkbox"
              onChange={(event) =>
                props.setCreateForm((current) => ({ ...current, isTestUser: event.target.checked }))
              }
            />
            {props.t({ es: "Usuario de prueba (permite borrado total)", en: "Test user (allows full delete)", pt: "Usuario de teste (permite exclusao total)" })}
          </label>

          {props.createForm.role === "PATIENT" ? (
            <>
              <label>
                {props.t({ es: "Zona horaria", en: "Time zone", pt: "Fuso horario" })}
                <select
                  value={props.createForm.timezone}
                  onChange={(event) => props.setCreateForm((current) => ({ ...current, timezone: event.target.value }))}
                >
                  <option value="">{props.t({ es: "Pendiente", en: "Pending", pt: "Pendente" })}</option>
                  {TIMEZONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label>
                {props.t({ es: "Estado paciente", en: "Patient status", pt: "Status do paciente" })}
                <select
                  value={props.createForm.patientStatus}
                  onChange={(event) =>
                    props.setCreateForm((current) => ({ ...current, patientStatus: event.target.value as PatientStatus }))
                  }
                >
                  <option value="active">{props.patientStatusLabel("active")}</option>
                  <option value="pause">{props.patientStatusLabel("pause")}</option>
                  <option value="cancelled">{props.patientStatusLabel("cancelled")}</option>
                  <option value="trial">{props.patientStatusLabel("trial")}</option>
                </select>
              </label>

              <label>
                {props.t({
                  es: "País de residencia (define el mercado de precios)",
                  en: "Country of residence (sets pricing market)",
                  pt: "Pais de residencia (define o mercado de precos)"
                })}
                <select
                  value={props.createForm.patientResidencyCountry}
                  onChange={(event) =>
                    props.setCreateForm((current) => ({ ...current, patientResidencyCountry: event.target.value }))
                  }
                >
                  <option value="">{props.t({ es: "Seleccionar…", en: "Select…", pt: "Selecionar…" })}</option>
                  {RESIDENCY_COUNTRY_OPTIONS.map((row) => (
                    <option key={row.code} value={row.code}>
                      {row.names.es} ({row.code})
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {props.createForm.role === "PROFESSIONAL" ? (
            <>
              <label className="inline-toggle">
                <input
                  checked={props.createForm.professionalVisible}
                  type="checkbox"
                  onChange={(event) =>
                    props.setCreateForm((current) => ({ ...current, professionalVisible: event.target.checked }))
                  }
                />
                {props.t({ es: "Perfil visible", en: "Visible profile", pt: "Perfil visivel" })}
              </label>

              <label>
                {props.t({
                  es: "Anticipación mínima definida para cancelar una sesión (en horas)",
                  en: "Minimum advance notice required to cancel a session (hours)",
                  pt: "Antecedência mínima definida para cancelar uma sessão (horas)"
                })}
                <input
                  value={props.createForm.professionalCancellationHours}
                  onChange={(event) =>
                    props.setCreateForm((current) => ({ ...current, professionalCancellationHours: event.target.value }))
                  }
                />
              </label>

              <label>
                {props.t({ es: "Años de experiencia", en: "Years of experience", pt: "Anos de experiencia" })}
                <input
                  value={props.createForm.professionalYearsExperience}
                  onChange={(event) =>
                    props.setCreateForm((current) => ({ ...current, professionalYearsExperience: event.target.value }))
                  }
                />
              </label>

              <label>
                {props.t({ es: "Bio", en: "Bio", pt: "Bio" })}
                <textarea
                  rows={3}
                  value={props.createForm.professionalBio}
                  onChange={(event) => props.setCreateForm((current) => ({ ...current, professionalBio: event.target.value }))}
                />
              </label>

              <label>
                {props.t({ es: "Enfoque terapéutico", en: "Therapeutic approach", pt: "Abordagem terapeutica" })}
                <input
                  value={props.createForm.professionalTherapeuticApproach}
                  onChange={(event) =>
                    props.setCreateForm((current) => ({ ...current, professionalTherapeuticApproach: event.target.value }))
                  }
                />
              </label>

              <ProfessionalPhotoUrlField
                language={props.language}
                disabled={props.createLoading}
                value={props.createForm.professionalPhotoUrl}
                onChange={(next) => props.setCreateForm((current) => ({ ...current, professionalPhotoUrl: next }))}
              />

              <label>
                {props.t({ es: "URL video de presentación", en: "Intro video URL", pt: "URL do video de apresentacao" })}
                <input
                  value={props.createForm.professionalVideoUrl}
                  onChange={(event) =>
                    props.setCreateForm((current) => ({ ...current, professionalVideoUrl: event.target.value }))
                  }
                />
              </label>
            </>
          ) : null}
        </div>

        {props.createError ? <p className="error-text">{props.createError}</p> : null}
        {props.createSuccess ? <p className="success-text">{props.createSuccess}</p> : null}

        <button className="primary" disabled={props.createLoading} type="submit">
          {props.createLoading
            ? props.t({ es: "Creando...", en: "Creating...", pt: "Criando..." })
            : props.t({ es: "Crear usuario", en: "Create user", pt: "Criar usuario" })}
        </button>
      </form>
    </div>
  );
}

export function UsersListSection(props: {
  language: AppLanguage;
  roleFilter: RoleFilter;
  searchInput: string;
  users: AdminUser[];
  usersPagination: { page: number; pageSize: number; total: number; totalPages: number; hasPrev: boolean; hasNext: boolean } | null;
  listLoading: boolean;
  listError: string;
  editError: string;
  editSuccess: string;
  editingUserId: string | null;
  editDrafts: Record<string, EditUserDraft>;
  saveLoading: boolean;
  deleteLoadingUserId: string | null;
  setRoleFilter: Dispatch<SetStateAction<RoleFilter>>;
  setSearchInput: Dispatch<SetStateAction<string>>;
  setUsersPage: Dispatch<SetStateAction<number>>;
  setSearch: Dispatch<SetStateAction<string>>;
  setEditDrafts: Dispatch<SetStateAction<Record<string, EditUserDraft>>>;
  setEditingUserId: Dispatch<SetStateAction<string | null>>;
  setEditError: Dispatch<SetStateAction<string>>;
  roleLabel: (role: Role) => string;
  patientStatusLabel: (status: PatientStatus | string) => string;
  yesNoLabel: (value: boolean) => string;
  formatDate: (value: string) => string;
  t: (values: { es: string; en: string; pt: string }) => string;
  onSaveEdit: (user: AdminUser) => void;
  onDeleteUser: (user: AdminUser) => void;
}) {
  const toggleExpand = (user: AdminUser) => {
    if (props.editingUserId === user.id) {
      props.setEditingUserId(null);
      props.setEditError("");
      return;
    }

    props.setEditingUserId(user.id);
    props.setEditError("");
    const fn = user.firstName?.trim() ?? "";
    const ln = user.lastName?.trim() ?? "";
    const { firstName, lastName } =
      fn !== "" || ln !== "" ? { firstName: fn, lastName: ln } : splitFullNameToFirstLast(user.fullName);
    props.setEditDrafts((current) => ({
      ...current,
      [user.id]: {
        role: user.role,
        isTestUser: user.isTestUser,
        firstName,
        lastName,
        password: "",
        passwordConfirm: "",
        patientAvatarUrl: user.avatarUrl ?? "",
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
        professionalVideoUrl: user.professionalProfile?.videoUrl ?? "",
        professionalBirthCountry: user.professionalProfile?.birthCountry ?? "",
        professionalSessionPriceUsd: stringFromOptionalNumber(user.professionalProfile?.sessionPriceUsd),
        professionalTitle: user.professionalProfile?.professionalTitle ?? "",
        professionalSpecialization: user.professionalProfile?.specialization ?? "",
        professionalFocusPrimary: user.professionalProfile?.focusPrimary ?? "",
        professionalRatingAverage: stringFromOptionalNumber(user.professionalProfile?.ratingAverage),
        professionalReviewsCount: String(user.professionalProfile?.reviewsCount ?? 0),
        professionalSessionDurationMinutes: stringFromOptionalNumber(user.professionalProfile?.sessionDurationMinutes),
        professionalActivePatientsCount: stringFromOptionalNumber(user.professionalProfile?.activePatientsCount),
        professionalSessionsCount: stringFromOptionalNumber(user.professionalProfile?.sessionsCount),
        professionalCompletedSessionsCount: stringFromOptionalNumber(user.professionalProfile?.completedSessionsCount)
      }
    }));
  };

  return (
    <div className="stack users-admin-list-root">
      <header className="toolbar users-admin-list-toolbar">
        <div className="toolbar-actions users-admin-list-filters">
          <select
            value={props.roleFilter}
            onChange={(event) => {
              props.setRoleFilter(event.target.value as RoleFilter);
              props.setUsersPage(1);
            }}
          >
            <option value="ALL">{props.t({ es: "Todos los roles", en: "All roles", pt: "Todos os perfis" })}</option>
            <option value="PATIENT">{props.t({ es: "Pacientes", en: "Patients", pt: "Pacientes" })}</option>
            <option value="PROFESSIONAL">{props.t({ es: "Profesionales", en: "Professionals", pt: "Profissionais" })}</option>
            <option value="ADMIN">Admin</option>
          </select>

          <form
            className="search-row"
            onSubmit={(event) => {
              event.preventDefault();
              props.setUsersPage(1);
              props.setSearch(props.searchInput);
            }}
          >
            <input
              placeholder={props.t({
                es: "Buscar por email o nombre",
                en: "Search by email or name",
                pt: "Buscar por email ou nome"
              })}
              value={props.searchInput}
              onChange={(event) => props.setSearchInput(event.target.value)}
            />
            <button type="submit">{props.t({ es: "Buscar", en: "Search", pt: "Buscar" })}</button>
          </form>
        </div>
      </header>

      {props.listError ? <p className="error-text">{props.listError}</p> : null}
      {props.editError || props.editSuccess ? (
        <div
          id="admin-users-edit-feedback"
          className="users-admin-edit-feedback"
          role="status"
          aria-live="polite"
        >
          {props.editError ? <p className="error-text">{props.editError}</p> : null}
          {props.editSuccess ? <p className="success-text">{props.editSuccess}</p> : null}
        </div>
      ) : null}

      {props.listLoading ? <p>{props.t({ es: "Cargando usuarios...", en: "Loading users...", pt: "Carregando usuarios..." })}</p> : null}
      {!props.listLoading && props.users.length === 0 ? (
        <p>{props.t({ es: "No hay usuarios para el filtro actual.", en: "No users for the current filter.", pt: "Nao ha usuarios para o filtro atual." })}</p>
      ) : null}

      {!props.listLoading
        ? props.users.map((user) => {
            const draft = props.editDrafts[user.id];
            const isExpanded = props.editingUserId === user.id && Boolean(draft);

            return (
              <article className={`user-card user-card-compact${isExpanded ? " expanded" : ""}`} key={user.id}>
                <div
                  className="user-row user-row--toggles"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-label={props.t({
                    es: `${isExpanded ? "Contraer" : "Expandir"} fila de ${user.fullName}`,
                    en: `${isExpanded ? "Collapse" : "Expand"} row for ${user.fullName}`,
                    pt: `${isExpanded ? "Fechar" : "Expandir"} linha de ${user.fullName}`
                  })}
                  onClick={() => toggleExpand(user)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleExpand(user);
                    }
                  }}
                >
                  <div className="user-row-main">
                    <strong>{user.fullName}</strong>
                    <span>
                      {user.email} · {props.roleLabel(user.role)} · {user.isActive
                        ? props.t({ es: "Activo", en: "Active", pt: "Ativo" })
                        : props.t({ es: "Desactivado", en: "Disabled", pt: "Desativado" })} · {user.isTestUser
                        ? props.t({ es: "Test", en: "Test", pt: "Teste" })
                        : props.t({ es: "Real", en: "Real", pt: "Real" })} · {props.formatDate(user.createdAt)}
                    </span>
                  </div>

                  <div className="user-row-actions" aria-hidden="true">
                    <span className="user-row-expand-pill">
                      {isExpanded
                        ? props.t({ es: "Contraer", en: "Collapse", pt: "Fechar" })
                        : props.t({ es: "Expandir", en: "Expand", pt: "Expandir" })}
                    </span>
                  </div>
                </div>

                {isExpanded && draft ? (
                  <div
                    className="user-edit-form"
                    role="region"
                    aria-label={props.t({
                      es: "Formulario de edición de usuario",
                      en: "User edit form",
                      pt: "Formulario de edição de usuario"
                    })}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="user-edit-form__body">
                      <details className="user-edit-accordion">
                        <summary>
                          <span>{props.t({ es: "Información registrada", en: "Saved snapshot", pt: "Informação registrada" })}</span>
                          <span className="user-edit-accordion__hint">
                            {props.t({
                              es: "Solo lectura · valores en servidor",
                              en: "Read-only · server values",
                              pt: "Somente leitura · valores no servidor"
                            })}
                          </span>
                        </summary>
                        <div className="user-edit-accordion__panel">
                          <div className="user-grid user-grid--snapshot">
                            <div>
                              <strong>{props.t({ es: "Creado", en: "Created", pt: "Criado" })}</strong>
                              <p>{props.formatDate(user.createdAt)}</p>
                            </div>
                            <div>
                              <strong>{props.t({ es: "Actualizado", en: "Updated", pt: "Atualizado" })}</strong>
                              <p>{props.formatDate(user.updatedAt)}</p>
                            </div>
                            <div>
                              <strong>{props.t({ es: "Cuenta", en: "Account", pt: "Conta" })}</strong>
                              <p>
                                {user.isActive
                                  ? props.t({ es: "Activa", en: "Active", pt: "Ativa" })
                                  : props.t({ es: "Desactivada", en: "Disabled", pt: "Desativada" })}
                              </p>
                            </div>
                            {!user.isActive && user.deactivatedAt ? (
                              <div>
                                <strong>{props.t({ es: "Desactivada el", en: "Disabled on", pt: "Desativada em" })}</strong>
                                <p>{props.formatDate(user.deactivatedAt)}</p>
                              </div>
                            ) : null}

                            {user.patientProfile ? (
                              <>
                                <div>
                                  <strong>{props.t({ es: "Paciente · Estado", en: "Patient · Status", pt: "Paciente · Status" })}</strong>
                                  <p>{props.patientStatusLabel(user.patientProfile.status)}</p>
                                </div>
                                <div>
                                  <strong>
                                    {props.t({ es: "Paciente · Zona horaria", en: "Patient · Time zone", pt: "Paciente · Fuso horario" })}
                                  </strong>
                                  <p>{user.patientProfile.timezone}</p>
                                </div>
                              </>
                            ) : null}

                            {user.professionalProfile ? (
                              <>
                                <div>
                                  <strong>
                                    {props.t({ es: "Profesional · Visible", en: "Professional · Visible", pt: "Profissional · Visivel" })}
                                  </strong>
                                  <p>{props.yesNoLabel(user.professionalProfile.visible)}</p>
                                </div>
                                <div>
                                  <strong>
                                    {props.t({
                                      es: "Anticipación mínima definida para cancelar una sesión",
                                      en: "Minimum advance notice to cancel a session",
                                      pt: "Antecedência mínima definida para cancelar uma sessão"
                                    })}
                                  </strong>
                                  <p>{user.professionalProfile.cancellationHours}h</p>
                                </div>
                                <div>
                                  <strong>{props.t({ es: "Bio", en: "Bio", pt: "Bio" })}</strong>
                                  <p>{user.professionalProfile.bio || "-"}</p>
                                </div>
                                <div>
                                  <strong>{props.t({ es: "Video presentación", en: "Intro video", pt: "Video de apresentacao" })}</strong>
                                  <p>{user.professionalProfile.videoUrl || "-"}</p>
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </details>

                      <details className="user-edit-accordion">
                        <summary>
                          <span>{props.t({ es: "Cuenta y acceso", en: "Account & access", pt: "Conta e acesso" })}</span>
                          <span className="user-edit-accordion__hint">
                            {props.t({
                              es: "Nombre, contraseña (doble) y tipo de cuenta",
                              en: "Name, password (twice) & account type",
                              pt: "Nome, senha (dupla) e tipo de conta"
                            })}
                          </span>
                        </summary>
                        <div className="user-edit-accordion__panel">
                          <div className="user-edit-pro user-edit-account">
                            <div className="user-edit-pro-group">
                              <p className="user-edit-pro-group-title">
                                {props.t({ es: "Identidad", en: "Identity", pt: "Identidade" })}
                              </p>
                              <div className="user-edit-pro-pair">
                                <label>
                                  {props.t({ es: "Nombre", en: "First name", pt: "Nome" })}
                                  <input
                                    autoComplete="given-name"
                                    value={draft.firstName}
                                    onChange={(event) =>
                                      props.setEditDrafts((current) => ({
                                        ...current,
                                        [user.id]: {
                                          ...draft,
                                          firstName: event.target.value
                                        }
                                      }))
                                    }
                                  />
                                </label>
                                <label>
                                  {props.t({ es: "Apellido", en: "Last name", pt: "Sobrenome" })}
                                  <input
                                    autoComplete="family-name"
                                    value={draft.lastName}
                                    onChange={(event) =>
                                      props.setEditDrafts((current) => ({
                                        ...current,
                                        [user.id]: {
                                          ...draft,
                                          lastName: event.target.value
                                        }
                                      }))
                                    }
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="user-edit-pro-group">
                              <p className="user-edit-pro-group-title">
                                {props.t({ es: "Contraseña", en: "Password", pt: "Senha" })}
                              </p>
                              <p className="user-edit-account-hint">
                                {props.t({
                                  es: "Opcional: dejá ambos campos vacíos si no querés cambiarla.",
                                  en: "Optional: leave both fields blank to keep the current password.",
                                  pt: "Opcional: deixe os dois em branco para manter a senha atual."
                                })}
                              </p>
                              <div className="user-edit-pro-pair user-edit-account-password-pair">
                                <label>
                                  {props.t({ es: "Nueva contraseña", en: "New password", pt: "Nova senha" })}
                                  <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={draft.password}
                                    onChange={(event) =>
                                      props.setEditDrafts((current) => ({
                                        ...current,
                                        [user.id]: {
                                          ...draft,
                                          password: event.target.value
                                        }
                                      }))
                                    }
                                  />
                                </label>
                                <label>
                                  {props.t({ es: "Repetir contraseña", en: "Repeat password", pt: "Repetir senha" })}
                                  <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={draft.passwordConfirm}
                                    onChange={(event) =>
                                      props.setEditDrafts((current) => ({
                                        ...current,
                                        [user.id]: {
                                          ...draft,
                                          passwordConfirm: event.target.value
                                        }
                                      }))
                                    }
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="user-edit-pro-group">
                              <p className="user-edit-pro-group-title">
                                {props.t({ es: "Tipo de cuenta", en: "Account type", pt: "Tipo de conta" })}
                              </p>
                              <div className="user-edit-pro-visibility">
                                <label className="inline-toggle user-edit-pro-visibility-toggle">
                                  <input
                                    checked={draft.isTestUser}
                                    type="checkbox"
                                    onChange={(event) =>
                                      props.setEditDrafts((current) => ({
                                        ...current,
                                        [user.id]: {
                                          ...draft,
                                          isTestUser: event.target.checked
                                        }
                                      }))
                                    }
                                  />
                                  {props.t({
                                    es: "Usuario de prueba (permite borrado total)",
                                    en: "Test user (allows full delete)",
                                    pt: "Usuario de teste (permite exclusao total)"
                                  })}
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </details>

                      {draft.role === "PATIENT" ? (
                        <details className="user-edit-accordion">
                          <summary>
                            <span>{props.t({ es: "Perfil del paciente", en: "Patient profile", pt: "Perfil do paciente" })}</span>
                            <span className="user-edit-accordion__hint">
                              {props.t({ es: "Estado, zona y avatar", en: "Status, zone & avatar", pt: "Status, fuso e avatar" })}
                            </span>
                          </summary>
                          <div className="user-edit-accordion__panel">
                            <div className="grid-form">
                              <label>
                                {props.t({ es: "Estado del paciente", en: "Patient status", pt: "Status do paciente" })}
                                <select
                                  value={draft.patientStatus}
                                  onChange={(event) =>
                                    props.setEditDrafts((current) => ({
                                      ...current,
                                      [user.id]: {
                                        ...draft,
                                        patientStatus: event.target.value as PatientStatus
                                      }
                                    }))
                                  }
                                >
                                  <option value="active">{props.patientStatusLabel("active")}</option>
                                  <option value="pause">{props.patientStatusLabel("pause")}</option>
                                  <option value="cancelled">{props.patientStatusLabel("cancelled")}</option>
                                  <option value="trial">{props.patientStatusLabel("trial")}</option>
                                </select>
                              </label>

                              <label>
                                {props.t({ es: "Zona horaria", en: "Time zone", pt: "Fuso horario" })}
                                <input
                                  value={draft.patientTimezone}
                                  onChange={(event) =>
                                    props.setEditDrafts((current) => ({
                                      ...current,
                                      [user.id]: {
                                        ...draft,
                                        patientTimezone: event.target.value
                                      }
                                    }))
                                  }
                                />
                              </label>

                              <ProfessionalPhotoUrlField
                                variant="patient"
                                language={props.language}
                                disabled={props.saveLoading}
                                value={draft.patientAvatarUrl}
                                onChange={(next) =>
                                  props.setEditDrafts((current) => ({
                                    ...current,
                                    [user.id]: {
                                      ...draft,
                                      patientAvatarUrl: next
                                    }
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </details>
                      ) : null}

                      {draft.role === "PROFESSIONAL" ? (
                        <details className="user-edit-accordion">
                          <summary>
                            <span>{props.t({ es: "Perfil profesional", en: "Professional profile", pt: "Perfil profissional" })}</span>
                            <span className="user-edit-accordion__hint">
                              {props.t({
                                es: "Visibilidad, tarjeta del paciente (matching), presentación y medios",
                                en: "Visibility, patient card (matching), presentation & media",
                                pt: "Visibilidade, card do paciente, apresentacao e midia"
                              })}
                            </span>
                          </summary>
                          <div className="user-edit-accordion__panel">
                            <div className="user-edit-pro">
                              <div className="user-edit-pro-group">
                                <p className="user-edit-pro-group-title">
                                  {props.t({ es: "Visibilidad", en: "Visibility", pt: "Visibilidade" })}
                                </p>
                                <div className="user-edit-pro-visibility">
                                  <label className="inline-toggle user-edit-pro-visibility-toggle">
                                    <input
                                      checked={draft.professionalVisible}
                                      type="checkbox"
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalVisible: event.target.checked
                                          }
                                        }))
                                      }
                                    />
                                    {props.t({ es: "Perfil visible en la plataforma", en: "Profile visible on the platform", pt: "Perfil visivel na plataforma" })}
                                  </label>
                                </div>
                              </div>

                              <div className="user-edit-pro-group">
                                <p className="user-edit-pro-group-title">
                                  {props.t({ es: "Reservas y experiencia", en: "Bookings & experience", pt: "Reservas e experiencia" })}
                                </p>
                                <div className="user-edit-pro-pair">
                                  <label>
                                    {props.t({
                                      es: "Anticipación mínima definida para cancelar una sesión (en horas)",
                                      en: "Minimum advance notice required to cancel a session (hours)",
                                      pt: "Antecedência mínima definida para cancelar uma sessão (horas)"
                                    })}
                                    <input
                                      inputMode="numeric"
                                      value={draft.professionalCancellationHours}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
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
                                    {props.t({ es: "Años de experiencia", en: "Years of experience", pt: "Anos de experiencia" })}
                                    <input
                                      inputMode="numeric"
                                      value={draft.professionalYearsExperience}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalYearsExperience: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="user-edit-pro-group">
                                <p className="user-edit-pro-group-title">
                                  {props.t({ es: "Presentación", en: "Presentation", pt: "Apresentação" })}
                                </p>
                                <div className="user-edit-pro-stack">
                                  <label>
                                    {props.t({ es: "Enfoque terapéutico", en: "Therapeutic approach", pt: "Abordagem terapeutica" })}
                                    <input
                                      value={draft.professionalTherapeuticApproach}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
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
                                    {props.t({ es: "Bio", en: "Bio", pt: "Bio" })}
                                    <textarea
                                      className="user-edit-pro-textarea"
                                      rows={4}
                                      value={draft.professionalBio}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalBio: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="user-edit-pro-group">
                                <p className="user-edit-pro-group-title">
                                  {props.t({ es: "Listado y país", en: "Directory & country", pt: "Listagem e pais" })}
                                </p>
                                <div className="user-edit-pro-stack">
                                  <label>
                                    {props.t({ es: "País (bandera en tarjeta)", en: "Country (card flag)", pt: "Pais (bandeira)" })}
                                    <input
                                      value={draft.professionalBirthCountry}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalBirthCountry: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    {props.t({ es: "Título profesional", en: "Professional title", pt: "Titulo profissional" })}
                                    <input
                                      value={draft.professionalTitle}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalTitle: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    {props.t({ es: "Especialización (etiqueta)", en: "Specialization (tag)", pt: "Especializacao" })}
                                    <input
                                      value={draft.professionalSpecialization}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalSpecialization: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    {props.t({
                                      es: "Área de enfoque (2.ª etiqueta)",
                                      en: "Focus area (second tag)",
                                      pt: "Area de foco (2a tag)"
                                    })}
                                    <input
                                      value={draft.professionalFocusPrimary}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalFocusPrimary: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="user-edit-pro-group">
                                <p className="user-edit-pro-group-title">
                                  {props.t({
                                    es: "Tarjeta del paciente (matching)",
                                    en: "Patient card (matching)",
                                    pt: "Card do paciente (matching)"
                                  })}
                                </p>
                                <p className="muted user-edit-pro-card-hint">
                                  {props.t({
                                    es: "Precio, duración, ranking, opiniones y cifras que ves en el portal del paciente al elegir profesional.",
                                    en: "Price, duration, rating, reviews and stats shown when patients pick a therapist.",
                                    pt: "Preco, duracao, nota, avaliacoes e numeros no portal."
                                  })}
                                </p>
                                <div className="user-edit-pro-pair">
                                  <label>
                                    {props.t({ es: "Valor sesión (USD)", en: "Session price (USD)", pt: "Preco (USD)" })}
                                    <input
                                      inputMode="numeric"
                                      value={draft.professionalSessionPriceUsd}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalSessionPriceUsd: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    {props.t({
                                      es: "Duración mostrada (min)",
                                      en: "Duration shown (min)",
                                      pt: "Duracao exibida (min)"
                                    })}
                                    <input
                                      inputMode="numeric"
                                      value={draft.professionalSessionDurationMinutes}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalSessionDurationMinutes: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                                <div className="user-edit-pro-pair">
                                  <label>
                                    {props.t({ es: "Ranking (0–5)", en: "Rating (0–5)", pt: "Nota (0–5)" })}
                                    <input
                                      inputMode="decimal"
                                      value={draft.professionalRatingAverage}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalRatingAverage: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    {props.t({ es: "Cantidad de opiniones", en: "Review count", pt: "N. de avaliacoes" })}
                                    <input
                                      inputMode="numeric"
                                      value={draft.professionalReviewsCount}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalReviewsCount: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                                <div className="user-edit-pro-pair">
                                  <label>
                                    {props.t({ es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })}
                                    <input
                                      inputMode="numeric"
                                      value={draft.professionalActivePatientsCount}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalActivePatientsCount: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    {props.t({ es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
                                    <input
                                      inputMode="numeric"
                                      value={draft.professionalSessionsCount}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalSessionsCount: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                                <label>
                                  {props.t({
                                    es: "Sesiones completadas",
                                    en: "Completed sessions",
                                    pt: "Sessoes concluidas"
                                  })}
                                  <input
                                    inputMode="numeric"
                                    value={draft.professionalCompletedSessionsCount}
                                    onChange={(event) =>
                                      props.setEditDrafts((current) => ({
                                        ...current,
                                        [user.id]: {
                                          ...draft,
                                          professionalCompletedSessionsCount: event.target.value
                                        }
                                      }))
                                    }
                                  />
                                </label>
                              </div>

                              <div className="user-edit-pro-group">
                                <p className="user-edit-pro-group-title">
                                  {props.t({ es: "Medios", en: "Media", pt: "Midia" })}
                                </p>
                                <div className="user-edit-pro-stack user-edit-pro-stack--media">
                                  <div className="user-edit-pro-photo-wrap">
                                    <ProfessionalPhotoUrlField
                                      language={props.language}
                                      disabled={props.saveLoading}
                                      value={draft.professionalPhotoUrl}
                                      onChange={(next) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalPhotoUrl: next
                                          }
                                        }))
                                      }
                                    />
                                  </div>
                                  <label>
                                    {props.t({ es: "URL video presentación", en: "Intro video URL", pt: "URL do video de apresentacao" })}
                                    <input
                                      type="url"
                                      autoComplete="off"
                                      value={draft.professionalVideoUrl}
                                      onChange={(event) =>
                                        props.setEditDrafts((current) => ({
                                          ...current,
                                          [user.id]: {
                                            ...draft,
                                            professionalVideoUrl: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </details>
                      ) : null}

                      {draft.role === "ADMIN" ? (
                        <details className="user-edit-accordion">
                          <summary>
                            <span>{props.t({ es: "Administrador", en: "Administrator", pt: "Administrador" })}</span>
                            <span className="user-edit-accordion__hint">
                              {props.t({
                                es: "Sin campos de perfil adicionales",
                                en: "No extra profile fields",
                                pt: "Sem campos de perfil extras"
                              })}
                            </span>
                          </summary>
                          <div className="user-edit-accordion__panel">
                            <p className="user-edit-admin-note">
                              {props.t({
                                es: "Los administradores solo usan cuenta y acceso. Guardá los cambios en la barra inferior.",
                                en: "Admins only use account fields. Save changes using the bar below.",
                                pt: "Administradores usam apenas conta e acesso. Salve na barra abaixo."
                              })}
                            </p>
                          </div>
                        </details>
                      ) : null}
                    </div>

                    <div className="user-edit-actions" role="toolbar" aria-label={props.t({ es: "Acciones del usuario", en: "User actions", pt: "Ações do usuario" })}>
                      <div className="user-edit-actions__primary">
                        <button
                          className="primary"
                          disabled={props.saveLoading}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            props.onSaveEdit(user);
                          }}
                        >
                          {props.saveLoading
                            ? props.t({ es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                            : props.t({ es: "Guardar cambios", en: "Save changes", pt: "Salvar alteracoes" })}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            props.setEditingUserId(null);
                            props.setEditError("");
                          }}
                        >
                          {props.t({ es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                        </button>
                      </div>
                      <div className="user-edit-actions__danger">
                        <button
                          type="button"
                          className="danger"
                          disabled={props.deleteLoadingUserId === user.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            props.onDeleteUser(user);
                          }}
                        >
                          {props.deleteLoadingUserId === user.id
                            ? props.t({ es: "Eliminando...", en: "Deleting...", pt: "Excluindo..." })
                            : props.t({ es: "Eliminar usuario", en: "Delete user", pt: "Excluir usuario" })}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        : null}

      {props.usersPagination ? (
        <div className="patient-pagination">
          <button
            type="button"
            disabled={!props.usersPagination.hasPrev || props.listLoading}
            onClick={() => props.setUsersPage((current) => Math.max(1, current - 1))}
            aria-label={props.t({ es: "Página anterior", en: "Previous page", pt: "Pagina anterior" })}
          >
            ‹
          </button>
          <span>
            {props.t({
              es: `Pagina ${props.usersPagination.page} de ${props.usersPagination.totalPages}`,
              en: `Page ${props.usersPagination.page} of ${props.usersPagination.totalPages}`,
              pt: `Pagina ${props.usersPagination.page} de ${props.usersPagination.totalPages}`
            })}
          </span>
          <button
            type="button"
            disabled={!props.usersPagination.hasNext || props.listLoading}
            onClick={() => props.setUsersPage((current) => current + 1)}
            aria-label={props.t({ es: "Página siguiente", en: "Next page", pt: "Pagina seguinte" })}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
