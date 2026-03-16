import { type FormEvent, useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { defaultCreateForm } from "../constants";
import { UsersCreateSection, UsersListSection } from "../components/users/UsersPageSections";
import { apiRequest } from "../services/api";
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

export function UsersPage(props: { token: string; language: AppLanguage }) {
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
      />

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
      />
    </div>
  );
}
