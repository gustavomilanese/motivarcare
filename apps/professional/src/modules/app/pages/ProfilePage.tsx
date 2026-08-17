import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { detectBrowserTimezone, syncUserTimezone } from "@therapy/auth";
import { LATIN_AMERICA_COUNTRY_OPTIONS } from "../../onboarding/constants/latinAmericaCountries";
import {
  PROFESSIONAL_CANCELLATION_POLICY_NOTICE,
  PROFESSIONAL_FOCUS_AREAS_AI_NOTICE,
  PROFESSIONAL_VIDEO_MAX_DURATION_SEC
} from "../../onboarding/constants/professionalProfileGuidanceCopy";
import { ProfessionalFocusAreasPicker } from "../../onboarding/components/ProfessionalFocusAreasPicker";
import { ProfessionalGuidanceBanner } from "../../onboarding/components/ProfessionalGuidanceBanner";
import { ProPageLoader } from "../components/ProPageLoader";
import { ProfileCollapsibleSection } from "../components/ProfileCollapsibleSection";
import { ProfileEditModal } from "../components/ProfileEditModal";
import { ProfessionalBankDetailsSection } from "../components/ProfessionalBankDetailsSection";
import { ProfessionalPublicProfilePreviewCard } from "../components/ProfessionalPublicProfilePreviewCard";
import { ProfessionalReviewsInvitePanel } from "../components/ProfessionalReviewsInvitePanel";
import { useProPortalChrome } from "../components/ProPortalChromeContext";
import {
  profileExperienceBandOptions,
  profileGenderOptions,
  profilePracticeBandOptions,
  profileTitleOptions
} from "../lib/profileFormOptions";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { useProfessionalLocalSessionPriceDisplay } from "../hooks/useProfessionalLocalSessionPriceDisplay";
import { API_BASE, apiRequest } from "../services/api";
import { compressImageDataUrl, fileToDataUrl, prepareProfessionalProfilePhotoDataUrl, readVideoFileForUpload } from "../utils/mediaPreview";
import { avatarInitialsFromNameParts, resolvedFirstLastFromUserRecord } from "@therapy/types";
import type { AuthUser, ProfessionalProfile } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

type ProfileStudioSection =
  | "identity"
  | "bank"
  | "education"
  | "focus"
  | "presentation"
  | "pricing"
  | "media"
  | "advanced";

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "—";
}

function optionLabel(options: Array<{ value: string; label: string }>, value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "—";
  }
  return options.find((option) => option.value === trimmed)?.label ?? trimmed;
}

function cloneProfile(profile: ProfessionalProfile): ProfessionalProfile {
  return {
    ...profile,
    languages: [...(profile.languages ?? [])],
    focusAreas: [...(profile.focusAreas ?? [])],
    diplomas: (profile.diplomas ?? []).map((diploma) => ({ ...diploma }))
  };
}

type EditableProfileSection = Exclude<ProfileStudioSection, "bank">;

function profileCompletionScore(profile: ProfessionalProfile): { done: number; total: number } {
  const checks = [
    Boolean(profile.firstName?.trim() && profile.lastName?.trim()),
    Boolean(profile.professionalTitle?.trim()),
    Boolean(profile.bio?.trim()),
    Boolean(profile.shortDescription?.trim()),
    Boolean(profile.photoUrl),
    (profile.focusAreas?.length ?? 0) > 0,
    (profile.diplomas?.length ?? 0) > 0,
    Number(profile.sessionPriceUsd ?? 0) > 0
  ];
  return { done: checks.filter(Boolean).length, total: checks.length };
}

export function ProfilePage(props: { token: string; user: AuthUser; language: AppLanguage; onUserChange: (user: AuthUser) => void }) {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isReadingPhoto, setIsReadingPhoto] = useState(false);
  const [isReadingVideo, setIsReadingVideo] = useState(false);
  const [readingDiplomaIndex, setReadingDiplomaIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Partial<Record<ProfileStudioSection, boolean>>>({
    identity: true
  });
  const [bankEditing, setBankEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<EditableProfileSection | null>(null);
  const [draft, setDraft] = useState<ProfessionalProfile | null>(null);

  const isSectionOpen = (id: ProfileStudioSection) => Boolean(openSections[id]);
  const toggleSection = (id: ProfileStudioSection) => {
    setOpenSections((current) => ({ ...current, [id]: !current[id] }));
  };
  const openBankForEdit = () => {
    setOpenSections((current) => ({ ...current, bank: true }));
    setBankEditing(true);
  };
  const openSectionForEdit = (id: EditableProfileSection) => {
    if (!profile) {
      return;
    }
    setOpenSections((current) => ({ ...current, [id]: true }));
    setDraft(cloneProfile(profile));
    setEditingSection(id);
    setError("");
    setMessage("");
  };
  const closeSectionEditor = () => {
    if (isSaving) {
      return;
    }
    setEditingSection(null);
    setDraft(null);
  };
  const editButton = (id: EditableProfileSection) => (
    <button type="button" className="pro-secondary pro-profile-section-edit-btn" onClick={() => openSectionForEdit(id)}>
      {t(props.language, { es: "Editar", en: "Edit", pt: "Editar" })}
    </button>
  );

  const { sessionPriceLocalLabel } = useProfessionalLocalSessionPriceDisplay({
    residencyCountry: profile?.residencyCountry,
    sessionPriceUsd: Math.round(Number(profile?.sessionPriceUsd ?? 0)),
    language: props.language
  });

  useProPortalChrome({
    title: t(props.language, { es: "Perfil profesional", en: "Professional profile", pt: "Perfil profissional" })
  });

  const titleOptions = useMemo(() => profileTitleOptions(props.language), [props.language]);
  const experienceOptions = useMemo(() => profileExperienceBandOptions(props.language), [props.language]);
  const practiceOptions = useMemo(() => profilePracticeBandOptions(props.language), [props.language]);
  const genderOptions = useMemo(() => profileGenderOptions(props.language), [props.language]);

  const completion = useMemo(
    () => (profile ? profileCompletionScore(profile) : { done: 0, total: 8 }),
    [profile]
  );

  const loadProfile = async () => {
    try {
      const response = await apiRequest<{ role: string; profile: ProfessionalProfile }>("/api/profiles/me", props.token);
      const nameParts = response.profile
        ? resolvedFirstLastFromUserRecord({
            firstName: response.profile.firstName,
            lastName: response.profile.lastName,
            fullName: response.profile.fullName ?? ""
          })
        : null;
      setProfile(
        response.profile
          ? {
              ...response.profile,
              firstName: nameParts?.firstName ?? "",
              lastName: nameParts?.lastName ?? "",
              timezone: response.profile.timezone ?? detectBrowserTimezone(),
              focusAreas:
                Array.isArray(response.profile.focusAreas) && response.profile.focusAreas.length > 0
                  ? response.profile.focusAreas
                  : response.profile.focusPrimary
                    ? response.profile.focusPrimary
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    : []
            }
          : null
      );
      setError("");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("profile-load", props.language, raw));
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [props.token]);

  useEffect(() => {
    if (!profile || window.location.hash !== "#pro-profile-bank") {
      return;
    }
    setOpenSections((current) => ({ ...current, bank: true }));
    requestAnimationFrame(() => {
      document.getElementById("pro-profile-bank")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [profile]);

  const birthCountryOptions = useMemo(() => {
    const current = profile?.birthCountry?.trim();
    const base = LATIN_AMERICA_COUNTRY_OPTIONS;
    if (current && !base.some((c) => c.value === current)) {
      return [{ value: current, label: current }, ...base];
    }
    return base;
  }, [profile?.birthCountry]);

  const toggleDraftFocusArea = (area: string) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const areas = current.focusAreas ?? [];
      const next = areas.includes(area) ? areas.filter((item) => item !== area) : [...areas, area];
      return { ...current, focusAreas: next };
    });
  };

  const saveEditingSection = async () => {
    if (!profile || !draft || !editingSection || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      if (editingSection === "identity") {
        const authResponse = await apiRequest<{ message: string; user: AuthUser }>("/api/auth/me", props.token, {
          method: "PATCH",
          body: JSON.stringify({
            firstName: draft.firstName.trim(),
            lastName: draft.lastName.trim()
          })
        });
        props.onUserChange({
          ...authResponse.user,
          role: "PROFESSIONAL",
          professionalProfileId: authResponse.user.professionalProfileId
        });
        await apiRequest<{ message: string }>(`/api/profiles/professional/${profile.id}/public-profile`, props.token, {
          method: "PATCH",
          body: JSON.stringify({
            professionalTitle: draft.professionalTitle,
            specialization: draft.specialization,
            experienceBand: draft.experienceBand,
            practiceBand: draft.practiceBand,
            gender: draft.gender,
            birthCountry: draft.birthCountry,
            languages: draft.languages
          })
        });
      } else if (editingSection === "education") {
        const diplomas = (draft.diplomas ?? []).filter((item) => item.institution.trim() && item.degree.trim());
        await apiRequest<{ message: string }>(`/api/profiles/professional/${profile.id}/public-profile`, props.token, {
          method: "PATCH",
          body: JSON.stringify({
            diplomas: diplomas.map((diploma) => ({
              institution: diploma.institution,
              degree: diploma.degree,
              startYear: diploma.startYear,
              graduationYear: diploma.graduationYear,
              documentUrl: diploma.documentUrl ?? null
            }))
          })
        });
      } else if (editingSection === "focus") {
        await apiRequest<{ message: string }>(`/api/profiles/professional/${profile.id}/public-profile`, props.token, {
          method: "PATCH",
          body: JSON.stringify({
            focusAreas: draft.focusAreas ?? []
          })
        });
      } else if (editingSection === "presentation") {
        await apiRequest<{ message: string }>(`/api/profiles/professional/${profile.id}/public-profile`, props.token, {
          method: "PATCH",
          body: JSON.stringify({
            shortDescription: draft.shortDescription,
            bio: draft.bio,
            therapeuticApproach: draft.therapeuticApproach
          })
        });
      } else if (editingSection === "pricing") {
        await apiRequest<{ message: string }>(`/api/profiles/professional/${profile.id}/public-profile`, props.token, {
          method: "PATCH",
          body: JSON.stringify({
            sessionPriceUsd: Math.round(Number(draft.sessionPriceUsd ?? 0)),
            discount4: draft.discount4,
            discount8: draft.discount8,
            discount12: draft.discount12
          })
        });
      } else if (editingSection === "media") {
        await apiRequest<{ message: string }>(`/api/profiles/professional/${profile.id}/public-profile`, props.token, {
          method: "PATCH",
          body: JSON.stringify({
            photoUrl: draft.photoUrl,
            videoUrl: draft.videoUrl,
            videoCoverUrl: draft.videoCoverUrl
          })
        });
      } else if (editingSection === "advanced") {
        await apiRequest<{ message: string }>(`/api/profiles/professional/${profile.id}/public-profile`, props.token, {
          method: "PATCH",
          body: JSON.stringify({
            timezone: draft.timezone,
            cancellationHours: draft.cancellationHours
          })
        });
        await syncUserTimezone({
          baseUrl: API_BASE,
          token: props.token,
          timezone: draft.timezone,
          persistPreference: true
        });
      }

      await loadProfile();
      setMessage(
        t(props.language, {
          es: "Cambios guardados. Ya valen para matching y tu ficha pública.",
          en: "Saved. Matching and your public profile now use these details.",
          pt: "Salvo. Matching e sua ficha publica ja usam esses dados."
        })
      );
      setError("");
      setEditingSection(null);
      setDraft(null);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("profile-save", props.language, raw));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setIsReadingPhoto(true);
    setError("");
    setMessage("");
    try {
      const dataUrl = await prepareProfessionalProfilePhotoDataUrl(file);
      setDraft((current) => (current ? { ...current, photoUrl: dataUrl } : current));
      setMessage(
        t(props.language, {
          es: "Foto lista. Guardá para publicarla.",
          en: "Photo ready. Save to publish it.",
          pt: "Foto pronta. Salve para publicar."
        })
      );
    } catch (requestError) {
      const code = requestError instanceof Error ? requestError.message : "";
      if (code === "HEIC_UNSUPPORTED") {
        setError(professionalSurfaceMessage("profile-image-heic", props.language));
      } else if (code === "INVALID_IMAGE_TYPE") {
        setError(professionalSurfaceMessage("profile-image-type", props.language));
      } else if (code === "IMAGE_TOO_LARGE") {
        setError(professionalSurfaceMessage("profile-image-size", props.language));
      } else {
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(professionalSurfaceMessage("profile-image-read", props.language, raw));
      }
    } finally {
      setIsReadingPhoto(false);
    }
  };

  const handleVideoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setIsReadingVideo(true);
    setError("");
    setMessage("");
    try {
      const uploaded = await readVideoFileForUpload(file, { maxDurationSec: PROFESSIONAL_VIDEO_MAX_DURATION_SEC });
      setDraft((current) =>
        current ? { ...current, videoUrl: uploaded.dataUrl, videoCoverUrl: uploaded.previewDataUrl } : current
      );
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(
        raw
          ? professionalSurfaceMessage("profile-image-read", props.language, raw)
          : t(props.language, {
              es: `Video inválido: máximo 30 MB y ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC} segundos.`,
              en: `Invalid video: max 30 MB and ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC} seconds.`,
              pt: `Video invalido: maximo 30 MB e ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC} segundos.`
            })
      );
    } finally {
      setIsReadingVideo(false);
    }
  };

  const handleDiplomaDocumentSelected = async (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError(professionalSurfaceMessage("profile-image-type", props.language));
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError(professionalSurfaceMessage("profile-image-size", props.language));
      return;
    }
    setReadingDiplomaIndex(index);
    setError("");
    try {
      const raw = await fileToDataUrl(file);
      const dataUrl = await compressImageDataUrl(raw, 1800, 0.85);
      setDraft((current) =>
        current
          ? {
              ...current,
              diplomas: (current.diplomas ?? []).map((item, itemIndex) =>
                itemIndex === index ? { ...item, documentUrl: dataUrl } : item
              )
            }
          : current
      );
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("profile-image-read", props.language, raw));
    } finally {
      setReadingDiplomaIndex(null);
    }
  };

  if (!profile && !error) {
    return <ProPageLoader language={props.language} layout="block" />;
  }

  const completionPct = Math.round((completion.done / completion.total) * 100);

  return (
    <div className="pro-profile-studio">
      {error && !editingSection ? (
        <p className="pro-profile-studio__alert pro-profile-studio__alert--error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="pro-profile-studio__alert pro-success" role="status">
          {message}
        </p>
      ) : null}

      {profile ? (
        <>
          <div className="pro-profile-studio__layout">
            <aside className="pro-profile-studio__aside">
              <div className="pro-profile-studio__preview-card">
                <p className="pro-profile-studio__eyebrow">
                  {t(props.language, { es: "Vista en matching", en: "Matching preview", pt: "Previa no matching" })}
                </p>
                <ProfessionalPublicProfilePreviewCard
                  language={props.language}
                  professionalId={profile.id}
                  fullName={props.user.fullName}
                  firstName={profile.firstName}
                  lastName={profile.lastName}
                  professionalTitle={profile.professionalTitle}
                  specialization={profile.specialization}
                  focusAreas={profile.focusAreas}
                  bio={profile.bio}
                  shortDescription={profile.shortDescription}
                  therapeuticApproach={profile.therapeuticApproach}
                  languages={profile.languages}
                  yearsExperience={profile.yearsExperience}
                  birthCountry={profile.birthCountry}
                  stripeVerified={profile.stripeVerified}
                  photoUrl={profile.photoUrl}
                  sessionPriceUsd={profile.sessionPriceUsd}
                />
              </div>

              <ProfessionalReviewsInvitePanel language={props.language} professionalId={profile.id} />

              <div className="pro-profile-studio__completion" aria-label={t(props.language, { es: "Completitud del perfil", en: "Profile completeness", pt: "Completude do perfil" })}>
                <div className="pro-profile-studio__completion-head">
                  <strong>
                    {replaceTemplate(
                      t(props.language, {
                        es: "{{done}} de {{total}} listos",
                        en: "{{done}} of {{total}} complete",
                        pt: "{{done}} de {{total}} prontos"
                      }),
                      { done: String(completion.done), total: String(completion.total) }
                    )}
                  </strong>
                  <span>{completionPct}%</span>
                </div>
                <div className="pro-profile-studio__completion-track" aria-hidden="true">
                  <div className="pro-profile-studio__completion-fill" style={{ width: `${completionPct}%` }} />
                </div>
                <ul className="pro-profile-studio__checklist">
                  <li className={profile.firstName?.trim() && profile.lastName?.trim() ? "done" : ""}>
                    {t(props.language, { es: "Nombre y apellido", en: "Name", pt: "Nome e sobrenome" })}
                  </li>
                  <li className={profile.professionalTitle?.trim() ? "done" : ""}>
                    {t(props.language, { es: "Título profesional", en: "Professional title", pt: "Titulo profissional" })}
                  </li>
                  <li className={(profile.diplomas?.length ?? 0) > 0 ? "done" : ""}>
                    {t(props.language, { es: "Formación académica", en: "Education", pt: "Formacao academica" })}
                  </li>
                  <li className={(profile.focusAreas?.length ?? 0) > 0 ? "done" : ""}>
                    {t(props.language, { es: "Ámbitos de atención", en: "Focus areas", pt: "Areas de atuacao" })}
                  </li>
                  <li className={profile.bio?.trim() ? "done" : ""}>
                    {t(props.language, { es: "Biografía", en: "Bio", pt: "Biografia" })}
                  </li>
                  <li className={profile.photoUrl ? "done" : ""}>
                    {t(props.language, { es: "Foto profesional", en: "Photo", pt: "Foto" })}
                  </li>
                </ul>
              </div>
            </aside>

            <div className="pro-profile-studio__main">
              <ProfileCollapsibleSection
                id="pro-profile-identity"
                step="01"
                title={t(props.language, { es: "Identidad profesional", en: "Professional identity", pt: "Identidade profissional" })}
                description={t(props.language, {
                  es: "Datos básicos que los pacientes ven al conocerte.",
                  en: "Core details patients see when they discover you.",
                  pt: "Dados basicos que os pacientes veem ao conhecer voce."
                })}
                open={isSectionOpen("identity")}
                onToggle={() => toggleSection("identity")}
                headerActions={editButton("identity")}
              >
                <dl className="pro-profile-summary-dl">
                  <div>
                    <dt>{t(props.language, { es: "Nombre", en: "First name", pt: "Nome" })}</dt>
                    <dd>{displayValue(profile.firstName)}</dd>
                  </div>
                  <div>
                    <dt>{t(props.language, { es: "Apellido", en: "Last name", pt: "Sobrenome" })}</dt>
                    <dd>{displayValue(profile.lastName)}</dd>
                  </div>
                  <div>
                    <dt>{t(props.language, { es: "Título profesional", en: "Professional title", pt: "Titulo profissional" })}</dt>
                    <dd>{optionLabel(titleOptions, profile.professionalTitle)}</dd>
                  </div>
                  <div>
                    <dt>{t(props.language, { es: "Especialización", en: "Specialization", pt: "Especializacao" })}</dt>
                    <dd>{displayValue(profile.specialization)}</dd>
                  </div>
                  <div>
                    <dt>{t(props.language, { es: "Experiencia clínica", en: "Clinical experience", pt: "Experiencia clinica" })}</dt>
                    <dd>{optionLabel(experienceOptions, profile.experienceBand)}</dd>
                  </div>
                  <div>
                    <dt>{t(props.language, { es: "Horas de práctica", en: "Practice hours", pt: "Horas de pratica" })}</dt>
                    <dd>{optionLabel(practiceOptions, profile.practiceBand)}</dd>
                  </div>
                  <div>
                    <dt>{t(props.language, { es: "Género", en: "Gender", pt: "Genero" })}</dt>
                    <dd>{optionLabel(genderOptions, profile.gender)}</dd>
                  </div>
                  <div>
                    <dt>{t(props.language, { es: "País de nacimiento", en: "Country of birth", pt: "Pais de nascimento" })}</dt>
                    <dd>{optionLabel(birthCountryOptions, profile.birthCountry)}</dd>
                  </div>
                  <div className="pro-profile-summary-wide">
                    <dt>{t(props.language, { es: "Idiomas de atención", en: "Session languages", pt: "Idiomas de atendimento" })}</dt>
                    <dd>{(profile.languages ?? []).length > 0 ? profile.languages.join(", ") : "—"}</dd>
                  </div>
                </dl>
              </ProfileCollapsibleSection>

              <ProfileCollapsibleSection
                id="pro-profile-bank"
                step="02"
                title={t(props.language, { es: "Datos bancarios", en: "Bank details", pt: "Dados bancarios" })}
                description={t(props.language, {
                  es: "Para recibir el pago de tus sesiones realizadas.",
                  en: "Used to pay you for completed sessions.",
                  pt: "Para receber o pagamento das sessoes realizadas."
                })}
                open={isSectionOpen("bank")}
                onToggle={() => {
                  if (isSectionOpen("bank")) {
                    setBankEditing(false);
                  }
                  toggleSection("bank");
                }}
                headerActions={
                  <button type="button" className="pro-secondary pro-profile-bank-edit-btn" onClick={openBankForEdit}>
                    {t(props.language, { es: "Editar", en: "Edit", pt: "Editar" })}
                  </button>
                }
              >
                <ProfessionalBankDetailsSection
                  token={props.token}
                  language={props.language}
                  editing={bankEditing}
                  onEditingChange={setBankEditing}
                  residencyCountry={profile?.residencyCountry}
                />
              </ProfileCollapsibleSection>


              <ProfileCollapsibleSection
                id="pro-profile-education"
                step="03"
                title={t(props.language, { es: "Formación y títulos", en: "Education and credentials", pt: "Formacao e titulos" })}
                description={t(props.language, {
                  es: "Tus diplomas respaldan la confianza del paciente y la validación del equipo.",
                  en: "Your degrees build patient trust and support our review process.",
                  pt: "Seus diplomas sustentam a confianca do paciente e nossa revisao."
                })}
                open={isSectionOpen("education")}
                onToggle={() => toggleSection("education")}
                headerActions={editButton("education")}
              >
                {(profile.diplomas ?? []).length === 0 ? (
                  <p className="pro-profile-summary-empty">
                    {t(props.language, { es: "Todavía no cargaste títulos.", en: "No degrees added yet.", pt: "Ainda nao ha titulos." })}
                  </p>
                ) : (
                  <dl className="pro-profile-summary-dl">
                    {(profile.diplomas ?? []).map((diploma, index) => (
                      <div key={diploma.id ?? `diploma-${index}`} className="pro-profile-summary-wide">
                        <dt>
                          {t(props.language, {
                            es: `Título ${index + 1}`,
                            en: `Degree ${index + 1}`,
                            pt: `Titulo ${index + 1}`
                          })}
                        </dt>
                        <dd>
                          {displayValue(diploma.degree)} · {displayValue(diploma.institution)}
                          {diploma.startYear || diploma.graduationYear
                            ? ` · ${diploma.startYear || "—"}–${diploma.graduationYear || "—"}`
                            : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </ProfileCollapsibleSection>

              <ProfileCollapsibleSection
                id="pro-profile-focus"
                step="04"
                title={t(props.language, { es: "Ámbitos de atención", en: "Focus areas", pt: "Areas de atuacao" })}
                description={t(props.language, {
                  es: "Elegí los motivos con los que mejor encajás en el matching.",
                  en: "Choose the reasons you match best with in our directory.",
                  pt: "Escolha os motivos com os quais voce combina melhor no matching."
                })}
                open={isSectionOpen("focus")}
                onToggle={() => toggleSection("focus")}
                headerActions={editButton("focus")}
              >
                {(profile.focusAreas ?? []).length === 0 ? (
                  <p className="pro-profile-summary-empty">
                    {t(props.language, { es: "Todavía no elegiste ámbitos.", en: "No focus areas selected yet.", pt: "Ainda nao ha areas." })}
                  </p>
                ) : (
                  <div className="pro-profile-summary-chips">
                    {(profile.focusAreas ?? []).map((area) => (
                      <span key={area} className="pro-profile-summary-chip">
                        {area}
                      </span>
                    ))}
                  </div>
                )}
              </ProfileCollapsibleSection>

              <ProfileCollapsibleSection
                id="pro-profile-presentation"
                step="05"
                title={t(props.language, { es: "Presentación pública", en: "Public presentation", pt: "Apresentacao publica" })}
                description={t(props.language, {
                  es: "Contá quién sos y cómo trabajás. Esto aparece en tu ficha pública.",
                  en: "Share who you are and how you work. This appears on your public profile.",
                  pt: "Conte quem voce e e como trabalha. Isso aparece na sua ficha publica."
                })}
                open={isSectionOpen("presentation")}
                onToggle={() => toggleSection("presentation")}
                headerActions={editButton("presentation")}
              >
                <dl className="pro-profile-summary-dl">
                  <div className="pro-profile-summary-wide">
                    <dt>{t(props.language, { es: "Descripción corta", en: "Short description", pt: "Descricao curta" })}</dt>
                    <dd>{displayValue(profile.shortDescription)}</dd>
                  </div>
                  <div className="pro-profile-summary-wide">
                    <dt>{t(props.language, { es: "Biografía", en: "Biography", pt: "Biografia" })}</dt>
                    <dd>{displayValue(profile.bio)}</dd>
                  </div>
                  <div className="pro-profile-summary-wide">
                    <dt>{t(props.language, { es: "Enfoque terapéutico", en: "Therapeutic approach", pt: "Abordagem terapeutica" })}</dt>
                    <dd>{displayValue(profile.therapeuticApproach)}</dd>
                  </div>
                </dl>
              </ProfileCollapsibleSection>

              <ProfileCollapsibleSection
                id="pro-profile-pricing"
                step="06"
                title={t(props.language, { es: "Tarifas", en: "Pricing", pt: "Tarifas" })}
                description={t(props.language, {
                  es: "Precio de referencia por sesión y descuentos por paquetes.",
                  en: "Reference session price and package discounts.",
                  pt: "Preco de referencia por sessao e descontos por pacotes."
                })}
                open={isSectionOpen("pricing")}
                onToggle={() => toggleSection("pricing")}
                headerActions={editButton("pricing")}
              >
                <dl className="pro-profile-summary-dl">
                  <div>
                    <dt>{t(props.language, { es: "Precio por sesión (USD)", en: "Price per session (USD)", pt: "Preco por sessao (USD)" })}</dt>
                    <dd>{profile.sessionPriceUsd ?? 0}</dd>
                  </div>
                  {sessionPriceLocalLabel ? (
                    <div>
                      <dt>{t(props.language, { es: "Equivalente local", en: "Local equivalent", pt: "Equivalente local" })}</dt>
                      <dd>≈ {sessionPriceLocalLabel}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>{t(props.language, { es: "4 sesiones", en: "4 sessions", pt: "4 sessoes" })}</dt>
                    <dd>{profile.discount4 ?? 0}%</dd>
                  </div>
                  <div>
                    <dt>{t(props.language, { es: "8 sesiones", en: "8 sessions", pt: "8 sessoes" })}</dt>
                    <dd>{profile.discount8 ?? 0}%</dd>
                  </div>
                  <div>
                    <dt>{t(props.language, { es: "12 sesiones", en: "12 sessions", pt: "12 sessoes" })}</dt>
                    <dd>{profile.discount12 ?? 0}%</dd>
                  </div>
                </dl>
              </ProfileCollapsibleSection>

              <ProfileCollapsibleSection
                id="pro-profile-media"
                step="07"
                title={t(props.language, { es: "Foto y video", en: "Photo and video", pt: "Foto e video" })}
                description={t(props.language, {
                  es: "Una imagen clara y un video breve aumentan la confianza del paciente.",
                  en: "A clear photo and short video build patient trust.",
                  pt: "Uma foto clara e um video curto aumentam a confianca do paciente."
                })}
                open={isSectionOpen("media")}
                onToggle={() => toggleSection("media")}
                headerActions={editButton("media")}
              >
                <div className="pro-profile-media-grid">
                  <div className="pro-profile-media-card">
                    <div className="pro-profile-media-preview">
                      {profile.photoUrl ? (
                        <img src={profile.photoUrl} alt="" />
                      ) : (
                        <span>
                          {avatarInitialsFromNameParts(profile.firstName, profile.lastName, props.user.fullName).slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <small>
                      {profile.photoUrl
                        ? t(props.language, { es: "Foto publicada", en: "Photo published", pt: "Foto publicada" })
                        : t(props.language, { es: "Sin foto", en: "No photo", pt: "Sem foto" })}
                    </small>
                  </div>
                  <div className="pro-profile-media-card">
                    <div className="pro-profile-media-preview pro-profile-media-preview--video">
                      {profile.videoCoverUrl ? (
                        <img src={profile.videoCoverUrl} alt="" />
                      ) : profile.videoUrl ? (
                        <span>{t(props.language, { es: "Video listo", en: "Video ready", pt: "Video pronto" })}</span>
                      ) : (
                        <span className="pro-profile-media-placeholder">▶</span>
                      )}
                    </div>
                    <small>
                      {profile.videoUrl
                        ? t(props.language, { es: "Video publicado", en: "Video published", pt: "Video publicado" })
                        : t(props.language, { es: "Sin video", en: "No video", pt: "Sem video" })}
                    </small>
                  </div>
                </div>
              </ProfileCollapsibleSection>

              <ProfileCollapsibleSection
                step="08"
                title={t(props.language, { es: "Preferencias avanzadas", en: "Advanced preferences", pt: "Preferencias avancadas" })}
                open={isSectionOpen("advanced")}
                onToggle={() => toggleSection("advanced")}
                headerActions={editButton("advanced")}
              >
                <dl className="pro-profile-summary-dl">
                  <div className="pro-profile-summary-wide">
                    <dt>{t(props.language, { es: "Zona horaria", en: "Time zone", pt: "Fuso horario" })}</dt>
                    <dd>{displayValue(profile.timezone)}</dd>
                  </div>
                  <div>
                    <dt>
                      {t(props.language, {
                        es: "Cancelación (horas de anticipación)",
                        en: "Cancellation (hours notice)",
                        pt: "Cancelamento (horas de antecedencia)"
                      })}
                    </dt>
                    <dd>{profile.cancellationHours}</dd>
                  </div>
                </dl>
                {profile.registrationApproval === "PENDING" ? (
                  <p className="pro-profile-studio__hint">
                    {t(props.language, {
                      es: "La visibilidad en matching se controla desde el header una vez que el equipo apruebe tu alta.",
                      en: "Matching visibility is controlled from the header once your signup is approved.",
                      pt: "A visibilidade no matching e controlada no header apos aprovacao da equipe."
                    })}
                  </p>
                ) : null}
              </ProfileCollapsibleSection>
            </div>
          </div>

          {editingSection && draft ? (
            <ProfileEditModal
              language={props.language}
              wide={editingSection === "education" || editingSection === "focus" || editingSection === "media"}
              title={
                editingSection === "identity"
                  ? t(props.language, { es: "Editar identidad profesional", en: "Edit professional identity", pt: "Editar identidade profissional" })
                  : editingSection === "education"
                    ? t(props.language, { es: "Editar formación y títulos", en: "Edit education and credentials", pt: "Editar formacao e titulos" })
                    : editingSection === "focus"
                      ? t(props.language, { es: "Editar ámbitos de atención", en: "Edit focus areas", pt: "Editar areas de atuacao" })
                      : editingSection === "presentation"
                        ? t(props.language, { es: "Editar presentación pública", en: "Edit public presentation", pt: "Editar apresentacao publica" })
                        : editingSection === "pricing"
                          ? t(props.language, { es: "Editar tarifas", en: "Edit pricing", pt: "Editar tarifas" })
                          : editingSection === "media"
                            ? t(props.language, { es: "Editar foto y video", en: "Edit photo and video", pt: "Editar foto e video" })
                            : t(props.language, { es: "Editar preferencias avanzadas", en: "Edit advanced preferences", pt: "Editar preferencias avancadas" })
              }
              lead={
                editingSection === "focus" || editingSection === "presentation" || editingSection === "identity"
                  ? t(props.language, {
                      es: "Esto se usa en matching y en tu ficha pública.",
                      en: "This is used in matching and on your public profile.",
                      pt: "Isso e usado no matching e na sua ficha publica."
                    })
                  : editingSection === "pricing"
                    ? t(props.language, {
                        es: "El precio de sesión se muestra a los pacientes al elegir y comprar.",
                        en: "Session price is shown to patients when they choose and buy.",
                        pt: "O preco da sessao aparece para o paciente ao escolher e comprar."
                      })
                    : undefined
              }
              saving={isSaving}
              error={error}
              onClose={closeSectionEditor}
              onSave={() => void saveEditingSection()}
            >
              {editingSection === "identity" ? (
                <div className="pro-profile-fields">
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Nombre", en: "First name", pt: "Nome" })}</span>
                    <input
                      value={draft.firstName}
                      onChange={(event) => setDraft((c) => (c ? { ...c, firstName: event.target.value } : c))}
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Apellido", en: "Last name", pt: "Sobrenome" })}</span>
                    <input
                      value={draft.lastName}
                      onChange={(event) => setDraft((c) => (c ? { ...c, lastName: event.target.value } : c))}
                      autoComplete="family-name"
                    />
                  </label>
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Título profesional", en: "Professional title", pt: "Titulo profissional" })}</span>
                    <select
                      value={draft.professionalTitle ?? ""}
                      onChange={(event) => setDraft((c) => (c ? { ...c, professionalTitle: event.target.value } : c))}
                    >
                      <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                      {titleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Especialización", en: "Specialization", pt: "Especializacao" })}</span>
                    <input
                      value={draft.specialization ?? ""}
                      onChange={(event) => setDraft((c) => (c ? { ...c, specialization: event.target.value } : c))}
                      placeholder={t(props.language, { es: "Ej. TCC, psicoanalítica", en: "E.g. CBT, psychodynamic", pt: "Ex. TCC, psicanalitica" })}
                    />
                  </label>
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Experiencia clínica", en: "Clinical experience", pt: "Experiencia clinica" })}</span>
                    <select
                      value={draft.experienceBand ?? ""}
                      onChange={(event) => setDraft((c) => (c ? { ...c, experienceBand: event.target.value } : c))}
                    >
                      <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                      {experienceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Horas de práctica", en: "Practice hours", pt: "Horas de pratica" })}</span>
                    <select
                      value={draft.practiceBand ?? ""}
                      onChange={(event) => setDraft((c) => (c ? { ...c, practiceBand: event.target.value } : c))}
                    >
                      <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                      {practiceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Género", en: "Gender", pt: "Genero" })}</span>
                    <select
                      value={draft.gender ?? ""}
                      onChange={(event) => setDraft((c) => (c ? { ...c, gender: event.target.value } : c))}
                    >
                      <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                      {genderOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "País de nacimiento", en: "Country of birth", pt: "Pais de nascimento" })}</span>
                    <select
                      value={draft.birthCountry ?? ""}
                      onChange={(event) => setDraft((c) => (c ? { ...c, birthCountry: event.target.value } : c))}
                    >
                      <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                      {birthCountryOptions.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pro-profile-field pro-profile-field--wide">
                    <span>{t(props.language, { es: "Idiomas de atención", en: "Session languages", pt: "Idiomas de atendimento" })}</span>
                    <input
                      value={(draft.languages ?? []).join(", ")}
                      onChange={(event) =>
                        setDraft((c) =>
                          c
                            ? {
                                ...c,
                                languages: event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                              }
                            : c
                        )
                      }
                      placeholder={t(props.language, { es: "Español, Inglés", en: "Spanish, English", pt: "Espanhol, Ingles" })}
                    />
                  </label>
                </div>
              ) : null}

              {editingSection === "education" ? (
                <div className="pro-profile-education-list">
                  {(draft.diplomas ?? []).map((diploma, index) => (
                    <article className="pro-profile-education-card" key={diploma.id ?? `diploma-${index}`}>
                      <div className="pro-profile-education-card__head">
                        <h3>
                          {t(props.language, {
                            es: `Título ${index + 1}`,
                            en: `Degree ${index + 1}`,
                            pt: `Titulo ${index + 1}`
                          })}
                        </h3>
                        <button
                          type="button"
                          className="pro-profile-education-card__remove"
                          onClick={() =>
                            setDraft((c) =>
                              c ? { ...c, diplomas: (c.diplomas ?? []).filter((_, i) => i !== index) } : c
                            )
                          }
                        >
                          {t(props.language, { es: "Eliminar", en: "Remove", pt: "Remover" })}
                        </button>
                      </div>
                      <div className="pro-profile-fields pro-profile-fields--tight">
                        <label className="pro-profile-field pro-profile-field--wide">
                          <span>{t(props.language, { es: "Institución", en: "Institution", pt: "Instituicao" })}</span>
                          <input
                            value={diploma.institution}
                            onChange={(event) =>
                              setDraft((c) =>
                                c
                                  ? {
                                      ...c,
                                      diplomas: (c.diplomas ?? []).map((item, i) =>
                                        i === index ? { ...item, institution: event.target.value } : item
                                      )
                                    }
                                  : c
                              )
                            }
                          />
                        </label>
                        <label className="pro-profile-field pro-profile-field--wide">
                          <span>{t(props.language, { es: "Título / especialidad", en: "Degree / specialty", pt: "Titulo / especialidade" })}</span>
                          <input
                            value={diploma.degree}
                            onChange={(event) =>
                              setDraft((c) =>
                                c
                                  ? {
                                      ...c,
                                      diplomas: (c.diplomas ?? []).map((item, i) =>
                                        i === index ? { ...item, degree: event.target.value } : item
                                      )
                                    }
                                  : c
                              )
                            }
                          />
                        </label>
                        <label className="pro-profile-field">
                          <span>{t(props.language, { es: "Inicio", en: "Start", pt: "Inicio" })}</span>
                          <input
                            type="number"
                            value={diploma.startYear}
                            onChange={(event) =>
                              setDraft((c) =>
                                c
                                  ? {
                                      ...c,
                                      diplomas: (c.diplomas ?? []).map((item, i) =>
                                        i === index ? { ...item, startYear: Number(event.target.value || 0) } : item
                                      )
                                    }
                                  : c
                              )
                            }
                          />
                        </label>
                        <label className="pro-profile-field">
                          <span>{t(props.language, { es: "Graduación", en: "Graduation", pt: "Graduacao" })}</span>
                          <input
                            type="number"
                            value={diploma.graduationYear}
                            onChange={(event) =>
                              setDraft((c) =>
                                c
                                  ? {
                                      ...c,
                                      diplomas: (c.diplomas ?? []).map((item, i) =>
                                        i === index ? { ...item, graduationYear: Number(event.target.value || 0) } : item
                                      )
                                    }
                                  : c
                              )
                            }
                          />
                        </label>
                      </div>
                      <div className="pro-profile-diploma-upload">
                        {diploma.documentUrl ? (
                          <a className="pro-profile-diploma-thumb" href={diploma.documentUrl} target="_blank" rel="noopener noreferrer">
                            <img src={diploma.documentUrl} alt="" />
                          </a>
                        ) : (
                          <div className="pro-profile-diploma-thumb pro-profile-diploma-thumb--empty" aria-hidden="true">
                            <span>📄</span>
                          </div>
                        )}
                        <div className="pro-profile-diploma-upload__actions">
                          <label className="pro-profile-upload-btn">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => void handleDiplomaDocumentSelected(index, event)}
                            />
                            <span>
                              {readingDiplomaIndex === index
                                ? t(props.language, { es: "Cargando…", en: "Uploading…", pt: "Carregando…" })
                                : diploma.documentUrl
                                  ? t(props.language, { es: "Cambiar documento", en: "Change document", pt: "Alterar documento" })
                                  : t(props.language, { es: "Subir diploma", en: "Upload degree", pt: "Enviar diploma" })}
                            </span>
                          </label>
                          {diploma.documentUrl ? (
                            <button
                              type="button"
                              className="pro-profile-link-btn"
                              onClick={() =>
                                setDraft((c) =>
                                  c
                                    ? {
                                        ...c,
                                        diplomas: (c.diplomas ?? []).map((item, i) =>
                                          i === index ? { ...item, documentUrl: null } : item
                                        )
                                      }
                                    : c
                                )
                              }
                            >
                              {t(props.language, { es: "Quitar archivo", en: "Remove file", pt: "Remover arquivo" })}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                  <button
                    type="button"
                    className="pro-profile-add-btn"
                    onClick={() =>
                      setDraft((c) =>
                        c
                          ? {
                              ...c,
                              diplomas: [
                                ...(c.diplomas ?? []),
                                {
                                  institution: "",
                                  degree: "",
                                  startYear: new Date().getFullYear() - 4,
                                  graduationYear: new Date().getFullYear(),
                                  documentUrl: null
                                }
                              ]
                            }
                          : c
                      )
                    }
                  >
                    + {t(props.language, { es: "Agregar título", en: "Add degree", pt: "Adicionar titulo" })}
                  </button>
                </div>
              ) : null}

              {editingSection === "focus" ? (
                <>
                  {(draft.focusAreas ?? []).length > 0 ? (
                    <ProfessionalGuidanceBanner language={props.language} text={PROFESSIONAL_FOCUS_AREAS_AI_NOTICE} />
                  ) : null}
                  <ProfessionalFocusAreasPicker
                    language={props.language}
                    selected={draft.focusAreas ?? []}
                    onToggle={toggleDraftFocusArea}
                  />
                </>
              ) : null}

              {editingSection === "presentation" ? (
                <div className="pro-profile-fields pro-profile-fields--stack">
                  <label className="pro-profile-field pro-profile-field--wide">
                    <span>{t(props.language, { es: "Descripción corta", en: "Short description", pt: "Descricao curta" })}</span>
                    <input
                      value={draft.shortDescription ?? ""}
                      maxLength={250}
                      onChange={(event) => setDraft((c) => (c ? { ...c, shortDescription: event.target.value } : c))}
                    />
                  </label>
                  <label className="pro-profile-field pro-profile-field--wide">
                    <span>{t(props.language, { es: "Biografía", en: "Biography", pt: "Biografia" })}</span>
                    <textarea
                      rows={5}
                      value={draft.bio ?? ""}
                      onChange={(event) => setDraft((c) => (c ? { ...c, bio: event.target.value } : c))}
                    />
                  </label>
                  <label className="pro-profile-field pro-profile-field--wide">
                    <span>{t(props.language, { es: "Enfoque terapéutico", en: "Therapeutic approach", pt: "Abordagem terapeutica" })}</span>
                    <input
                      value={draft.therapeuticApproach ?? ""}
                      onChange={(event) => setDraft((c) => (c ? { ...c, therapeuticApproach: event.target.value } : c))}
                    />
                  </label>
                </div>
              ) : null}

              {editingSection === "pricing" ? (
                <>
                  <div className="pro-profile-pricing-highlight">
                    <label className="pro-profile-field">
                      <span>{t(props.language, { es: "Precio por sesión (USD)", en: "Price per session (USD)", pt: "Preco por sessao (USD)" })}</span>
                      <input
                        type="number"
                        min={0}
                        max={10_000_000}
                        value={draft.sessionPriceUsd ?? 0}
                        onChange={(event) =>
                          setDraft((c) => (c ? { ...c, sessionPriceUsd: Number(event.target.value || 0) } : c))
                        }
                      />
                    </label>
                  </div>
                  <div className="pro-profile-discount-row">
                    <label className="pro-profile-field">
                      <span>{t(props.language, { es: "4 sesiones", en: "4 sessions", pt: "4 sessoes" })}</span>
                      <div className="pro-profile-discount-input">
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={draft.discount4 ?? 0}
                          onChange={(event) =>
                            setDraft((c) => (c ? { ...c, discount4: clampInt(Number(event.target.value || 0), 0, 5) } : c))
                          }
                        />
                        <em>%</em>
                      </div>
                    </label>
                    <label className="pro-profile-field">
                      <span>{t(props.language, { es: "8 sesiones", en: "8 sessions", pt: "8 sessoes" })}</span>
                      <div className="pro-profile-discount-input">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={draft.discount8 ?? 0}
                          onChange={(event) =>
                            setDraft((c) => (c ? { ...c, discount8: clampInt(Number(event.target.value || 0), 0, 10) } : c))
                          }
                        />
                        <em>%</em>
                      </div>
                    </label>
                    <label className="pro-profile-field">
                      <span>{t(props.language, { es: "12 sesiones", en: "12 sessions", pt: "12 sessoes" })}</span>
                      <div className="pro-profile-discount-input">
                        <input
                          type="number"
                          min={0}
                          max={15}
                          value={draft.discount12 ?? 0}
                          onChange={(event) =>
                            setDraft((c) => (c ? { ...c, discount12: clampInt(Number(event.target.value || 0), 0, 15) } : c))
                          }
                        />
                        <em>%</em>
                      </div>
                    </label>
                  </div>
                </>
              ) : null}

              {editingSection === "media" ? (
                <div className="pro-profile-media-grid">
                  <div className="pro-profile-media-card">
                    <div className="pro-profile-media-preview">
                      {draft.photoUrl ? (
                        <img src={draft.photoUrl} alt="" />
                      ) : (
                        <span>
                          {avatarInitialsFromNameParts(draft.firstName, draft.lastName, props.user.fullName).slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="pro-profile-media-actions">
                      <label className="pro-profile-upload-btn pro-profile-upload-btn--primary">
                        <input type="file" accept="image/*" onChange={(e) => void handlePhotoSelected(e)} />
                        <span>
                          {isReadingPhoto
                            ? t(props.language, { es: "Cargando…", en: "Uploading…", pt: "Carregando…" })
                            : t(props.language, { es: "Subir foto", en: "Upload photo", pt: "Enviar foto" })}
                        </span>
                      </label>
                      {draft.photoUrl ? (
                        <button
                          type="button"
                          className="pro-profile-link-btn"
                          onClick={() => setDraft((c) => (c ? { ...c, photoUrl: null } : c))}
                        >
                          {t(props.language, { es: "Quitar", en: "Remove", pt: "Remover" })}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="pro-profile-media-card">
                    <div className="pro-profile-media-preview pro-profile-media-preview--video">
                      {draft.videoCoverUrl ? (
                        <img src={draft.videoCoverUrl} alt="" />
                      ) : draft.videoUrl ? (
                        <span>{t(props.language, { es: "Video listo", en: "Video ready", pt: "Video pronto" })}</span>
                      ) : (
                        <span className="pro-profile-media-placeholder">▶</span>
                      )}
                    </div>
                    <div className="pro-profile-media-actions">
                      <label className="pro-profile-upload-btn">
                        <input type="file" accept="video/*" onChange={(e) => void handleVideoSelected(e)} />
                        <span>
                          {isReadingVideo
                            ? t(props.language, { es: "Cargando…", en: "Uploading…", pt: "Carregando…" })
                            : draft.videoUrl
                              ? t(props.language, { es: "Cambiar video", en: "Change video", pt: "Alterar video" })
                              : t(props.language, { es: "Subir video", en: "Upload video", pt: "Enviar video" })}
                        </span>
                      </label>
                      {draft.videoUrl ? (
                        <button
                          type="button"
                          className="pro-profile-link-btn"
                          onClick={() => setDraft((c) => (c ? { ...c, videoUrl: null, videoCoverUrl: null } : c))}
                        >
                          {t(props.language, { es: "Quitar", en: "Remove", pt: "Remover" })}
                        </button>
                      ) : null}
                      <small>
                        {t(props.language, {
                          es: `Máx. 30 MB · ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC}s`,
                          en: `Max 30 MB · ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC}s`,
                          pt: `Max. 30 MB · ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC}s`
                        })}
                      </small>
                    </div>
                  </div>
                </div>
              ) : null}

              {editingSection === "advanced" ? (
                <div className="pro-profile-fields pro-profile-fields--stack">
                  <label className="pro-profile-field pro-profile-field--wide">
                    <span>{t(props.language, { es: "Zona horaria", en: "Time zone", pt: "Fuso horario" })}</span>
                    <input
                      value={draft.timezone}
                      onChange={(event) => setDraft((c) => (c ? { ...c, timezone: event.target.value } : c))}
                    />
                  </label>
                  <label className="pro-profile-field">
                    <span>
                      {t(props.language, {
                        es: "Cancelación (horas de anticipación)",
                        en: "Cancellation (hours notice)",
                        pt: "Cancelamento (horas de antecedencia)"
                      })}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={168}
                      value={draft.cancellationHours}
                      onChange={(event) =>
                        setDraft((c) => (c ? { ...c, cancellationHours: Number(event.target.value || 24) } : c))
                      }
                    />
                  </label>
                  <ProfessionalGuidanceBanner language={props.language} text={PROFESSIONAL_CANCELLATION_POLICY_NOTICE} />
                </div>
              ) : null}
            </ProfileEditModal>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
