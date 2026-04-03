import type { FormEvent, Dispatch, SetStateAction } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { TIMEZONE_OPTIONS } from "../../constants";
import type {
  AdminUser,
  CreateUserFormState,
  EditUserDraft,
  PatientStatus,
  Role,
  RoleFilter
} from "../../types";

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
}) {
  return (
    <div className="stack">
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
            {props.t({ es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
            <input
              value={props.createForm.fullName}
              onChange={(event) => props.setCreateForm((current) => ({ ...current, fullName: event.target.value }))}
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
            {props.t({ es: "Contrasena", en: "Password", pt: "Senha" })}
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
                {props.t({ es: "Horas de cancelacion", en: "Cancellation hours", pt: "Horas de cancelamento" })}
                <input
                  value={props.createForm.professionalCancellationHours}
                  onChange={(event) =>
                    props.setCreateForm((current) => ({ ...current, professionalCancellationHours: event.target.value }))
                  }
                />
              </label>

              <label>
                {props.t({ es: "Anos de experiencia", en: "Years of experience", pt: "Anos de experiencia" })}
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
                {props.t({ es: "Enfoque terapeutico", en: "Therapeutic approach", pt: "Abordagem terapeutica" })}
                <input
                  value={props.createForm.professionalTherapeuticApproach}
                  onChange={(event) =>
                    props.setCreateForm((current) => ({ ...current, professionalTherapeuticApproach: event.target.value }))
                  }
                />
              </label>

              <label>
                {props.t({ es: "URL foto profesional", en: "Professional photo URL", pt: "URL da foto profissional" })}
                <input
                  value={props.createForm.professionalPhotoUrl}
                  onChange={(event) =>
                    props.setCreateForm((current) => ({ ...current, professionalPhotoUrl: event.target.value }))
                  }
                />
              </label>

              <label>
                {props.t({ es: "URL video de presentacion", en: "Intro video URL", pt: "URL do video de apresentacao" })}
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
    props.setEditDrafts((current) => ({
      ...current,
      [user.id]: {
        role: user.role,
        isTestUser: user.isTestUser,
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
      }
    }));
  };

  return (
    <div className="stack">
      <header className="toolbar toolbar--wrap">
        <div className="toolbar-actions">
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
      {props.editError ? <p className="error-text">{props.editError}</p> : null}
      {props.editSuccess ? <p className="success-text">{props.editSuccess}</p> : null}

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
                <div className="user-row">
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

                  <div className="user-row-actions">
                    <button type="button" onClick={() => toggleExpand(user)}>
                      {isExpanded
                        ? props.t({ es: "Contraer", en: "Collapse", pt: "Fechar" })
                        : props.t({ es: "Expandir", en: "Expand", pt: "Expandir" })}
                    </button>
                  </div>
                </div>

                {isExpanded && draft ? (
                  <div className="stack">
                    <div className="user-grid">
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
                            <strong>{props.t({ es: "Paciente · Zona horaria", en: "Patient · Time zone", pt: "Paciente · Fuso horario" })}</strong>
                            <p>{user.patientProfile.timezone}</p>
                          </div>
                        </>
                      ) : null}

                      {user.professionalProfile ? (
                        <>
                          <div>
                            <strong>{props.t({ es: "Profesional · Visible", en: "Professional · Visible", pt: "Profissional · Visivel" })}</strong>
                            <p>{props.yesNoLabel(user.professionalProfile.visible)}</p>
                          </div>
                          <div>
                            <strong>{props.t({ es: "Horas cancelacion", en: "Cancellation hours", pt: "Horas de cancelamento" })}</strong>
                            <p>{user.professionalProfile.cancellationHours}h</p>
                          </div>
                          <div>
                            <strong>{props.t({ es: "Bio", en: "Bio", pt: "Bio" })}</strong>
                            <p>{user.professionalProfile.bio || "-"}</p>
                          </div>
                          <div>
                            <strong>{props.t({ es: "Video presentacion", en: "Intro video", pt: "Video de apresentacao" })}</strong>
                            <p>{user.professionalProfile.videoUrl || "-"}</p>
                          </div>
                        </>
                      ) : null}
                    </div>

                    <div className="grid-form">
                      <label>
                        {props.t({ es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
                        <input
                          value={draft.fullName}
                          onChange={(event) =>
                            props.setEditDrafts((current) => ({
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
                        {props.t({ es: "Nueva contrasena (opcional)", en: "New password (optional)", pt: "Nova senha (opcional)" })}
                        <input
                          type="password"
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

                      <label className="inline-toggle">
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
                        {props.t({ es: "Usuario de prueba (permite borrado total)", en: "Test user (allows full delete)", pt: "Usuario de teste (permite exclusao total)" })}
                      </label>

                      {draft.role === "PATIENT" ? (
                        <>
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
                        </>
                      ) : null}

                      {draft.role === "PROFESSIONAL" ? (
                        <>
                          <label className="inline-toggle">
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
                            {props.t({ es: "Perfil visible", en: "Visible profile", pt: "Perfil visivel" })}
                          </label>

                          <label>
                            {props.t({ es: "Horas de cancelacion", en: "Cancellation hours", pt: "Horas de cancelamento" })}
                            <input
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
                            {props.t({ es: "Anos de experiencia", en: "Years of experience", pt: "Anos de experiencia" })}
                            <input
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

                          <label>
                            {props.t({ es: "Bio", en: "Bio", pt: "Bio" })}
                            <textarea
                              rows={3}
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

                          <label>
                            {props.t({ es: "Enfoque terapeutico", en: "Therapeutic approach", pt: "Abordagem terapeutica" })}
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
                            {props.t({ es: "URL de foto", en: "Photo URL", pt: "URL da foto" })}
                            <input
                              value={draft.professionalPhotoUrl}
                              onChange={(event) =>
                                props.setEditDrafts((current) => ({
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
                            {props.t({ es: "URL video presentacion", en: "Intro video URL", pt: "URL do video de apresentacao" })}
                            <input
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
                        </>
                      ) : null}
                    </div>

                    <div className="user-card-footer">
                      <small>ID: {user.id}</small>
                      <div className="ops-actions">
                        <button className="primary" disabled={props.saveLoading} type="button" onClick={() => props.onSaveEdit(user)}>
                          {props.saveLoading
                            ? props.t({ es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                            : props.t({ es: "Guardar cambios", en: "Save changes", pt: "Salvar alteracoes" })}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            props.setEditingUserId(null);
                            props.setEditError("");
                          }}
                        >
                          {props.t({ es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={props.deleteLoadingUserId === user.id}
                          onClick={() => props.onDeleteUser(user)}
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
            aria-label={props.t({ es: "Pagina anterior", en: "Previous page", pt: "Pagina anterior" })}
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
            aria-label={props.t({ es: "Pagina siguiente", en: "Next page", pt: "Pagina seguinte" })}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
