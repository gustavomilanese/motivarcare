import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { CollapsiblePageSection } from "../components/CollapsiblePageSection";
import { defaultCreateForm } from "../constants";
import { UsersCreateSection, UsersListSection } from "../components/users/UsersPageSections";
import { closeStickyCollapsibleSection, useStickySectionNavigation } from "../hooks/useStickySectionNavigation";
import { adminSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
import { apiRequest } from "../services/api";
import { joinFirstLastToFullName, splitFullNameToFirstLast } from "@therapy/types";
import type {
  AdminUser,
  CreateUserFormState,
  EditUserDraft,
  PatientStatus,
  Role,
  RoleFilter,
  UsersResponse
} from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
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

function buildEditDraft(user: AdminUser): EditUserDraft {
  const fn = user.firstName?.trim() ?? "";
  const ln = user.lastName?.trim() ?? "";
  const { firstName, lastName } =
    fn !== "" || ln !== "" ? { firstName: fn, lastName: ln } : splitFullNameToFirstLast(user.fullName);
  return {
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
    professionalVideoUrl: user.professionalProfile?.videoUrl ?? ""
  };
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

const USERS_STANDALONE_SECTION_IDS = ["users-list", "users-create"] as const;

export function UsersPage(props: { token: string; language: AppLanguage; embedded?: boolean }) {
  const embedded = props.embedded ?? false;
  const sectionIdsForNavigation = embedded ? (["users-create"] as const) : USERS_STANDALONE_SECTION_IDS;
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
  const [deleteLoadingUserId, setDeleteLoadingUserId] = useState<string | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<AdminUser | null>(null);
  const [purgeHistoricalOnDelete, setPurgeHistoricalOnDelete] = useState(false);
  const deleteInFlightRef = useRef<AbortController | null>(null);

  const { scrollToSection } = useStickySectionNavigation(sectionIdsForNavigation, { loading: embedded });

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
      const raw = requestError instanceof Error ? requestError.message : "";
      setListError(adminSurfaceMessage("users-list-load", props.language, raw));
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
          es: "Horas de cancelación inválidas.",
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
          es: "Años de experiencia inválidos.",
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

    if (!createForm.firstName.trim() || !createForm.lastName.trim()) {
      setCreateError(
        t(props.language, {
          es: "Completá nombre y apellido.",
          en: "Enter first name and last name.",
          pt: "Preencha nome e sobrenome."
        })
      );
      return;
    }

    const createFullName = joinFirstLastToFullName(createForm.firstName, createForm.lastName);

    const payload: {
      email: string;
      fullName: string;
      password: string;
      role: Role;
      isTestUser?: boolean;
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
      fullName: createFullName,
      password: createForm.password,
      role: createForm.role,
      isTestUser: createForm.isTestUser
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
      const raw = requestError instanceof Error ? requestError.message : "";
      setCreateError(adminSurfaceMessage("users-create", props.language, raw));
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

    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setSaveLoading(false);
      setEditError(
        t(props.language, {
          es: "Completá nombre y apellido.",
          en: "Enter first name and last name.",
          pt: "Preencha nome e sobrenome."
        })
      );
      return;
    }

    const payload: {
      fullName: string;
      password?: string;
      isTestUser?: boolean;
      patientStatus?: PatientStatus;
      patientTimezone?: string;
      avatarUrl?: string | null;
      professionalVisible?: boolean;
      professionalCancellationHours?: number;
      professionalBio?: string;
      professionalTherapeuticApproach?: string;
      professionalYearsExperience?: number;
      professionalPhotoUrl?: string | null;
      professionalVideoUrl?: string | null;
    } = {
      fullName: joinFirstLastToFullName(draft.firstName, draft.lastName)
    };

    const passwordTrim = draft.password.trim();
    const passwordConfirmTrim = draft.passwordConfirm.trim();
    if (passwordTrim.length === 0 && passwordConfirmTrim.length === 0) {
      // sin cambio de contraseña
    } else if (passwordTrim.length === 0 || passwordConfirmTrim.length === 0) {
      setSaveLoading(false);
      setEditError(
        t(props.language, {
          es: "Completá la nueva contraseña y la confirmación, o dejá ambos campos vacíos.",
          en: "Enter both the new password and confirmation, or leave both fields blank.",
          pt: "Preencha a nova senha e a confirmacao, ou deixe os dois campos em branco."
        })
      );
      return;
    } else if (passwordTrim !== passwordConfirmTrim) {
      setSaveLoading(false);
      setEditError(
        t(props.language, {
          es: "Las contraseñas no coinciden.",
          en: "Passwords do not match.",
          pt: "As senhas nao coincidem."
        })
      );
      return;
    } else {
      payload.password = passwordTrim;
    }
    payload.isTestUser = draft.isTestUser;

    if (draft.role === "PATIENT") {
      payload.patientStatus = draft.patientStatus;
      payload.patientTimezone = draft.patientTimezone.trim() || "America/New_York";
      payload.avatarUrl = draft.patientAvatarUrl.trim().length > 0 ? draft.patientAvatarUrl.trim() : null;
    }

    if (draft.role === "PROFESSIONAL") {
      const cancellationHours = parseIntField(draft.professionalCancellationHours);
      if (cancellationHours === null) {
        setSaveLoading(false);
        setEditError(
          t(props.language, {
            es: "Horas de cancelación inválidas.",
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
            es: "Años de experiencia inválidos.",
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

  const requestDeleteUser = (user: AdminUser) => {
    setPurgeHistoricalOnDelete(false);
    setPendingDeleteUser(user);
  };

  const closeDeleteModal = useCallback(() => {
    deleteInFlightRef.current?.abort();
    deleteInFlightRef.current = null;
    setDeleteLoadingUserId(null);
    setPendingDeleteUser(null);
    setPurgeHistoricalOnDelete(false);
  }, []);

  const confirmDeleteUser = async () => {
    if (!pendingDeleteUser) {
      return;
    }

    const user = pendingDeleteUser;

    setEditError("");
    setEditSuccess("");
    deleteInFlightRef.current?.abort();
    const controller = new AbortController();
    deleteInFlightRef.current = controller;
    setDeleteLoadingUserId(user.id);

    try {
      const purgeQuery = purgeHistoricalOnDelete ? "?purgeHistoricalData=true" : "";
      const response = await apiRequest<{
        ok: true;
        action?: "deleted" | "deactivated";
        message?: string;
      }>(
        `/api/admin/users/${user.id}/delete${purgeQuery}`,
        {
          method: "POST",
          body: JSON.stringify({ purgeHistoricalData: purgeHistoricalOnDelete }),
          signal: controller.signal
        },
        props.token
      );

      if (response.message) {
        setEditSuccess(response.message);
      } else if (response.action === "deactivated") {
        setEditSuccess(
          t(props.language, {
            es: "Usuario desactivado. Se conservo el historial.",
            en: "User disabled. History was preserved.",
            pt: "Usuario desativado. O historico foi preservado."
          })
        );
      } else {
        setEditSuccess(
          t(props.language, {
            es: "Usuario eliminado correctamente.",
            en: "User deleted successfully.",
            pt: "Usuario excluido com sucesso."
          })
        );
      }
      setPendingDeleteUser(null);

      if (editingUserId === user.id) {
        setEditingUserId(null);
      }

      await loadUsers(usersPage);
    } catch (requestError) {
      if (
        requestError instanceof Error
        && (requestError.name === "AbortError" || requestError.message.toLowerCase().includes("abort"))
      ) {
        return;
      }
      const raw = requestError instanceof Error ? requestError.message : "";
      setEditError(adminSurfaceMessage("users-delete", props.language, raw));
    } finally {
      deleteInFlightRef.current = null;
      setDeleteLoadingUserId(null);
    }
  };

  useEffect(() => {
    if (!pendingDeleteUser) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      closeDeleteModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDeleteUser, closeDeleteModal]);

  const usersListBody = (
    <UsersListSection
      language={props.language}
      roleFilter={roleFilter}
      searchInput={searchInput}
      users={users}
      usersPagination={usersPagination}
      listLoading={listLoading}
      listError={listError}
      editError={editError}
      editSuccess={editSuccess}
      editingUserId={editingUserId}
      editDrafts={editDrafts}
      saveLoading={saveLoading}
      deleteLoadingUserId={deleteLoadingUserId}
      setRoleFilter={setRoleFilter}
      setSearchInput={setSearchInput}
      setUsersPage={setUsersPage}
      setSearch={setSearch}
      setEditDrafts={setEditDrafts}
      setEditingUserId={setEditingUserId}
      setEditError={setEditError}
      roleLabel={(role) => roleLabel(role, props.language)}
      patientStatusLabel={(status) => patientStatusLabel(status, props.language)}
      yesNoLabel={(value) => yesNoLabel(value, props.language)}
      formatDate={(value) => formatDate(value, props.language)}
      t={(values) => t(props.language, values)}
      onSaveEdit={(user) => void saveEdit(user)}
      onDeleteUser={(user) => requestDeleteUser(user)}
    />
  );

  const usersCreateSection = (
    <CollapsiblePageSection
      sectionId="users-create"
      summary={t(props.language, { es: "Alta de usuarios", en: "Create users", pt: "Criar usuarios" })}
      bodyExtraClass="finance-collapsible-body--stack"
      visuallyHiddenSummary={embedded}
      detailsAriaLabel={t(props.language, {
        es: "Formulario de alta de usuarios",
        en: "Create user form",
        pt: "Formulario de cadastro de usuarios"
      })}
    >
      <UsersCreateSection
        language={props.language}
        createForm={createForm}
        createError={createError}
        createSuccess={createSuccess}
        createLoading={createLoading}
        setCreateForm={setCreateForm}
        patientStatusLabel={(status) => patientStatusLabel(status, props.language)}
        t={(values) => t(props.language, values)}
        onSubmit={handleCreateUser}
        embeddedDismiss={
          embedded ? { onClose: () => closeStickyCollapsibleSection("users-create") } : undefined
        }
      />
    </CollapsiblePageSection>
  );

  const collapsiblesAndModal = (
    <>
      {embedded ? (
        <div className="users-admin-embedded-list">{usersListBody}</div>
      ) : (
        <CollapsiblePageSection
          sectionId="users-list"
          summary={t(props.language, { es: "Listado de usuarios", en: "Users list", pt: "Lista de usuarios" })}
          bodyExtraClass="finance-collapsible-body--stack"
        >
          {usersListBody}
        </CollapsiblePageSection>
      )}

      {usersCreateSection}

      {pendingDeleteUser
        ? createPortal(
            <div className="patient-modal-backdrop patient-modal-backdrop--portal" onClick={closeDeleteModal}>
              <section className="patient-modal patient-create-modal" onClick={(event) => event.stopPropagation()}>
                <header className="patient-modal-head">
                  <h2>{t(props.language, { es: "Eliminar usuario", en: "Delete user", pt: "Excluir usuario" })}</h2>
                  <button type="button" onClick={closeDeleteModal}>
                    {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
                  </button>
                </header>
                <p>
                  {pendingDeleteUser.isTestUser
                    ? t(props.language, {
                        es: "Este usuario está marcado como prueba. Se eliminará de forma definitiva aunque tenga actividad.",
                        en: "This user is marked as test. It will be permanently deleted even with activity.",
                        pt: "Este usuario esta marcado como teste. Sera excluido permanentemente mesmo com atividade."
                      })
                    : t(props.language, {
                        es: "Si el usuario tiene pagos o reservas, por defecto solo se desactiva y se conserva el historial. Podés forzar borrado total con la opción de abajo (sesiones, compras, ledger).",
                        en: "If the user has bookings or payments, by default we only disable the account and keep history. You can force a full wipe with the option below (sessions, purchases, ledger).",
                        pt: "Se o usuario tiver historico, por padrao apenas desativamos. Voce pode forcar exclusao total com a opcao abaixo."
                      })}
                </p>
                <p>
                  <strong>{pendingDeleteUser.fullName}</strong> · {pendingDeleteUser.email}
                </p>
                <label className="inline-toggle user-purge-toggle">
                  <input
                    type="checkbox"
                    checked={purgeHistoricalOnDelete}
                    disabled={Boolean(deleteLoadingUserId)}
                    onChange={(event) => setPurgeHistoricalOnDelete(event.target.checked)}
                  />
                  {t(props.language, {
                    es: "Borrar también reservas, finanzas y compras vinculadas (irreversible).",
                    en: "Also delete bookings, finance rows, and linked purchases (irreversible).",
                    pt: "Excluir também reservas, financas e compras (irreversível)."
                  })}
                </label>
                <div className="button-row">
                  <button type="button" onClick={closeDeleteModal}>
                    {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void confirmDeleteUser()}
                    disabled={Boolean(deleteLoadingUserId)}
                  >
                    {deleteLoadingUserId === pendingDeleteUser.id
                      ? t(props.language, { es: "Eliminando...", en: "Deleting...", pt: "Excluindo..." })
                      : t(props.language, { es: "Sí, eliminar", en: "Yes, delete", pt: "Sim, excluir" })}
                  </button>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  );

  if (embedded) {
    return <div className="users-admin-page users-admin-page--embedded stack-lg">{collapsiblesAndModal}</div>;
  }

  return (
    <div className="ops-page finance-page users-admin-page">
      <section className="card stack finance-kpi-card finance-page-hero">
        <header className="toolbar">
          <h2>{t(props.language, { es: "Usuarios", en: "Users", pt: "Usuarios" })}</h2>
          <button
            type="button"
            className="users-admin-add-button"
            title={t(props.language, { es: "Alta de usuario", en: "Create user", pt: "Cadastro de usuario" })}
            aria-label={t(props.language, { es: "Alta de usuario", en: "Create user", pt: "Cadastro de usuario" })}
            onClick={() => scrollToSection("users-create")}
          >
            +
          </button>
        </header>
        <p className="settings-section-lead">
          {t(props.language, {
            es: "Alta, edición y baja de cuentas del ecosistema.",
            en: "Create, edit, and remove accounts across the ecosystem.",
            pt: "Criacao, edicao e exclusao de contas do ecossistema."
          })}
        </p>
      </section>

      {collapsiblesAndModal}
    </div>
  );
}
