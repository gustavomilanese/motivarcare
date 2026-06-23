import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  replaceTemplate,
  textByLanguage,
  roundSessionPriceArsFromUsd,
  SESSION_PRICE_ARS_ROUND_STEP
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
import { ProfessionalPublicProfilePreviewCard } from "../components/ProfessionalPublicProfilePreviewCard";
import { useProPortalChrome } from "../components/ProPortalChromeContext";
import {
  profileExperienceBandOptions,
  profileGenderOptions,
  profilePracticeBandOptions,
  profileTitleOptions
} from "../lib/profileFormOptions";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { API_BASE, apiRequest } from "../services/api";
import { fetchPublicUsdArsRate } from "../services/usdArsPublicRate";
import { compressImageDataUrl, fileToDataUrl, readVideoFileForUpload } from "../utils/mediaPreview";
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
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isReadingPhoto, setIsReadingPhoto] = useState(false);
  const [isReadingVideo, setIsReadingVideo] = useState(false);
  const [readingDiplomaIndex, setReadingDiplomaIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [usdArsRate, setUsdArsRate] = useState<number | null>(null);

  useProPortalChrome({
    title: t(props.language, { es: "Perfil profesional", en: "Professional profile", pt: "Perfil profissional" })
  });

  const titleOptions = useMemo(() => profileTitleOptions(props.language), [props.language]);
  const experienceOptions = useMemo(() => profileExperienceBandOptions(props.language), [props.language]);
  const practiceOptions = useMemo(() => profilePracticeBandOptions(props.language), [props.language]);
  const genderOptions = useMemo(() => profileGenderOptions(props.language), [props.language]);

  const computedSessionPriceArs = useMemo(() => {
    const usd = Math.round(Number(profile?.sessionPriceUsd ?? 0));
    if (!usd || usdArsRate === null || !Number.isFinite(usdArsRate)) {
      return null;
    }
    return roundSessionPriceArsFromUsd(usd, usdArsRate);
  }, [profile?.sessionPriceUsd, usdArsRate]);

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
    let cancelled = false;
    void fetchPublicUsdArsRate()
      .then((rate) => {
        if (!cancelled) {
          setUsdArsRate(rate);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUsdArsRate(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const birthCountryOptions = useMemo(() => {
    const current = profile?.birthCountry?.trim();
    const base = LATIN_AMERICA_COUNTRY_OPTIONS;
    if (current && !base.some((c) => c.value === current)) {
      return [{ value: current, label: current }, ...base];
    }
    return base;
  }, [profile?.birthCountry]);

  const toggleProfileFocusArea = (area: string) => {
    setProfile((current) => {
      if (!current) {
        return current;
      }
      const areas = current.focusAreas ?? [];
      const next = areas.includes(area) ? areas.filter((item) => item !== area) : [...areas, area];
      return { ...current, focusAreas: next };
    });
  };

  const handleSave = async () => {
    if (!profile || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const authResponse = await apiRequest<{ message: string; user: AuthUser }>("/api/auth/me", props.token, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim()
        })
      });
      await apiRequest<{ message: string }>(`/api/profiles/professional/${profile.id}/public-profile`, props.token, {
        method: "PATCH",
        body: JSON.stringify({
          visible: profile.visible,
          professionalTitle: profile.professionalTitle,
          specialization: profile.specialization,
          experienceBand: profile.experienceBand,
          practiceBand: profile.practiceBand,
          gender: profile.gender,
          birthCountry: profile.birthCountry,
          focusPrimary: profile.focusPrimary,
          focusAreas: profile.focusAreas?.length ? profile.focusAreas : undefined,
          languages: profile.languages,
          bio: profile.bio,
          shortDescription: profile.shortDescription,
          therapeuticApproach: profile.therapeuticApproach,
          yearsExperience: profile.yearsExperience,
          sessionPriceUsd: profile.sessionPriceUsd,
          discount4: profile.discount4,
          discount8: profile.discount8,
          discount12: profile.discount12,
          photoUrl: profile.photoUrl,
          videoUrl: profile.videoUrl,
          videoCoverUrl: profile.videoCoverUrl,
          stripeDocUrl: profile.stripeDocUrl,
          stripeVerified: profile.stripeVerified,
          stripeVerificationStarted: profile.stripeVerificationStarted,
          timezone: profile.timezone,
          diplomas: (profile.diplomas ?? []).map((diploma) => ({
            institution: diploma.institution,
            degree: diploma.degree,
            startYear: diploma.startYear,
            graduationYear: diploma.graduationYear,
            documentUrl: diploma.documentUrl ?? null
          })),
          cancellationHours: profile.cancellationHours
        })
      });
      await syncUserTimezone({
        baseUrl: API_BASE,
        token: props.token,
        timezone: profile.timezone,
        persistPreference: true
      });
      props.onUserChange({
        ...authResponse.user,
        role: "PROFESSIONAL",
        professionalProfileId: authResponse.user.professionalProfileId
      });
      setMessage("");
      setError("");
      navigate("/", { state: { profileUpdated: true } });
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
    if (!file.type.startsWith("image/")) {
      setError(professionalSurfaceMessage("profile-image-type", props.language));
      setMessage("");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError(professionalSurfaceMessage("profile-image-size", props.language));
      setMessage("");
      return;
    }
    setIsReadingPhoto(true);
    setError("");
    setMessage("");
    try {
      const raw = await fileToDataUrl(file);
      const dataUrl = await compressImageDataUrl(raw, 1600, 0.82);
      setProfile((current) => (current ? { ...current, photoUrl: dataUrl } : current));
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("profile-image-read", props.language, raw));
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
      setProfile((current) =>
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
      setProfile((current) =>
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
      {error ? (
        <p className="pro-profile-studio__alert pro-profile-studio__alert--error" role="alert">
          {error}
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
                  fullName={props.user.fullName}
                  firstName={profile.firstName}
                  lastName={profile.lastName}
                  professionalTitle={profile.professionalTitle}
                  focusAreas={profile.focusAreas}
                  shortDescription={profile.shortDescription}
                  photoUrl={profile.photoUrl}
                  sessionPriceUsd={profile.sessionPriceUsd}
                />
              </div>

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
              <section className="pro-profile-block" id="pro-profile-identity">
                <header className="pro-profile-block__head">
                  <span className="pro-profile-block__step">01</span>
                  <div>
                    <h2>{t(props.language, { es: "Identidad profesional", en: "Professional identity", pt: "Identidade profissional" })}</h2>
                    <p>
                      {t(props.language, {
                        es: "Datos básicos que los pacientes ven al conocerte.",
                        en: "Core details patients see when they discover you.",
                        pt: "Dados basicos que os pacientes veem ao conhecer voce."
                      })}
                    </p>
                  </div>
                </header>
                <div className="pro-profile-fields">
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Nombre", en: "First name", pt: "Nome" })}</span>
                    <input
                      value={profile.firstName}
                      onChange={(event) => setProfile((c) => (c ? { ...c, firstName: event.target.value } : c))}
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Apellido", en: "Last name", pt: "Sobrenome" })}</span>
                    <input
                      value={profile.lastName}
                      onChange={(event) => setProfile((c) => (c ? { ...c, lastName: event.target.value } : c))}
                      autoComplete="family-name"
                    />
                  </label>
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Título profesional", en: "Professional title", pt: "Titulo profissional" })}</span>
                    <select
                      value={profile.professionalTitle ?? ""}
                      onChange={(event) => setProfile((c) => (c ? { ...c, professionalTitle: event.target.value } : c))}
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
                      value={profile.specialization ?? ""}
                      onChange={(event) => setProfile((c) => (c ? { ...c, specialization: event.target.value } : c))}
                      placeholder={t(props.language, { es: "Ej. TCC, psicoanalítica", en: "E.g. CBT, psychodynamic", pt: "Ex. TCC, psicanalitica" })}
                    />
                  </label>
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Experiencia clínica", en: "Clinical experience", pt: "Experiencia clinica" })}</span>
                    <select
                      value={profile.experienceBand ?? ""}
                      onChange={(event) => setProfile((c) => (c ? { ...c, experienceBand: event.target.value } : c))}
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
                      value={profile.practiceBand ?? ""}
                      onChange={(event) => setProfile((c) => (c ? { ...c, practiceBand: event.target.value } : c))}
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
                      value={profile.gender ?? ""}
                      onChange={(event) => setProfile((c) => (c ? { ...c, gender: event.target.value } : c))}
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
                      value={profile.birthCountry ?? ""}
                      onChange={(event) => setProfile((c) => (c ? { ...c, birthCountry: event.target.value } : c))}
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
                      value={(profile.languages ?? []).join(", ")}
                      onChange={(event) =>
                        setProfile((c) =>
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
              </section>

              <section className="pro-profile-block" id="pro-profile-education">
                <header className="pro-profile-block__head">
                  <span className="pro-profile-block__step">02</span>
                  <div>
                    <h2>{t(props.language, { es: "Formación y títulos", en: "Education and credentials", pt: "Formacao e titulos" })}</h2>
                    <p>
                      {t(props.language, {
                        es: "Tus diplomas respaldan la confianza del paciente y la validación del equipo.",
                        en: "Your degrees build patient trust and support our review process.",
                        pt: "Seus diplomas sustentam a confianca do paciente e nossa revisao."
                      })}
                    </p>
                  </div>
                </header>
                <div className="pro-profile-education-list">
                  {(profile.diplomas ?? []).map((diploma, index) => (
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
                            setProfile((c) =>
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
                              setProfile((c) =>
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
                              setProfile((c) =>
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
                              setProfile((c) =>
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
                              setProfile((c) =>
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
                          <a
                            className="pro-profile-diploma-thumb"
                            href={diploma.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
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
                                setProfile((c) =>
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
                      setProfile((c) =>
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
              </section>

              <section className="pro-profile-block" id="pro-profile-focus">
                <header className="pro-profile-block__head">
                  <span className="pro-profile-block__step">03</span>
                  <div>
                    <h2>{t(props.language, { es: "Ámbitos de atención", en: "Focus areas", pt: "Areas de atuacao" })}</h2>
                    <p>
                      {t(props.language, {
                        es: "Elegí los motivos con los que mejor encajás en el matching.",
                        en: "Choose the reasons you match best with in our directory.",
                        pt: "Escolha os motivos com os quais voce combina melhor no matching."
                      })}
                    </p>
                  </div>
                </header>
                {(profile.focusAreas ?? []).length > 0 ? (
                  <ProfessionalGuidanceBanner language={props.language} text={PROFESSIONAL_FOCUS_AREAS_AI_NOTICE} />
                ) : null}
                <ProfessionalFocusAreasPicker
                  language={props.language}
                  selected={profile.focusAreas ?? []}
                  onToggle={toggleProfileFocusArea}
                />
              </section>

              <section className="pro-profile-block" id="pro-profile-presentation">
                <header className="pro-profile-block__head">
                  <span className="pro-profile-block__step">04</span>
                  <div>
                    <h2>{t(props.language, { es: "Presentación pública", en: "Public presentation", pt: "Apresentacao publica" })}</h2>
                    <p>
                      {t(props.language, {
                        es: "Contá quién sos y cómo trabajás. Esto aparece en tu ficha pública.",
                        en: "Share who you are and how you work. This appears on your public profile.",
                        pt: "Conte quem voce e e como trabalha. Isso aparece na sua ficha publica."
                      })}
                    </p>
                  </div>
                </header>
                <div className="pro-profile-fields pro-profile-fields--stack">
                  <label className="pro-profile-field pro-profile-field--wide">
                    <span>{t(props.language, { es: "Descripción corta", en: "Short description", pt: "Descricao curta" })}</span>
                    <input
                      value={profile.shortDescription ?? ""}
                      maxLength={250}
                      onChange={(event) => setProfile((c) => (c ? { ...c, shortDescription: event.target.value } : c))}
                      placeholder={t(props.language, {
                        es: "Una frase que resuma tu enfoque",
                        en: "One line that captures your approach",
                        pt: "Uma frase que resuma sua abordagem"
                      })}
                    />
                  </label>
                  <label className="pro-profile-field pro-profile-field--wide">
                    <span>{t(props.language, { es: "Biografía", en: "Biography", pt: "Biografia" })}</span>
                    <textarea
                      rows={5}
                      value={profile.bio ?? ""}
                      onChange={(event) => setProfile((c) => (c ? { ...c, bio: event.target.value } : c))}
                      placeholder={t(props.language, {
                        es: "Experiencia, formación y estilo de trabajo…",
                        en: "Experience, training, and working style…",
                        pt: "Experiencia, formacao e estilo de trabalho…"
                      })}
                    />
                  </label>
                  <label className="pro-profile-field pro-profile-field--wide">
                    <span>{t(props.language, { es: "Enfoque terapéutico", en: "Therapeutic approach", pt: "Abordagem terapeutica" })}</span>
                    <input
                      value={profile.therapeuticApproach ?? ""}
                      onChange={(event) => setProfile((c) => (c ? { ...c, therapeuticApproach: event.target.value } : c))}
                      placeholder={t(props.language, {
                        es: "Ej. Integrativa, cognitivo-conductual",
                        en: "E.g. Integrative, CBT",
                        pt: "Ex. Integrativa, TCC"
                      })}
                    />
                  </label>
                </div>
              </section>

              <section className="pro-profile-block" id="pro-profile-pricing">
                <header className="pro-profile-block__head">
                  <span className="pro-profile-block__step">05</span>
                  <div>
                    <h2>{t(props.language, { es: "Tarifas", en: "Pricing", pt: "Tarifas" })}</h2>
                    <p>
                      {t(props.language, {
                        es: "Precio de referencia por sesión y descuentos por paquetes.",
                        en: "Reference session price and package discounts.",
                        pt: "Preco de referencia por sessao e descontos por pacotes."
                      })}
                    </p>
                  </div>
                </header>
                <div className="pro-profile-pricing-highlight">
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "Precio por sesión (USD)", en: "Price per session (USD)", pt: "Preco por sessao (USD)" })}</span>
                    <input
                      type="number"
                      min={0}
                      max={10_000_000}
                      value={profile.sessionPriceUsd ?? 0}
                      onChange={(event) =>
                        setProfile((c) => (c ? { ...c, sessionPriceUsd: Number(event.target.value || 0) } : c))
                      }
                    />
                  </label>
                  {computedSessionPriceArs !== null ? (
                    <p className="pro-profile-pricing-equiv">
                      ≈ {computedSessionPriceArs.toLocaleString("es-AR")} ARS
                    </p>
                  ) : null}
                </div>
                <div className="pro-profile-discount-row">
                  <label className="pro-profile-field">
                    <span>{t(props.language, { es: "4 sesiones", en: "4 sessions", pt: "4 sessoes" })}</span>
                    <div className="pro-profile-discount-input">
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={profile.discount4 ?? 0}
                        onChange={(event) =>
                          setProfile((c) =>
                            c ? { ...c, discount4: clampInt(Number(event.target.value || 0), 0, 5) } : c
                          )
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
                        value={profile.discount8 ?? 0}
                        onChange={(event) =>
                          setProfile((c) =>
                            c ? { ...c, discount8: clampInt(Number(event.target.value || 0), 0, 10) } : c
                          )
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
                        value={profile.discount12 ?? 0}
                        onChange={(event) =>
                          setProfile((c) =>
                            c ? { ...c, discount12: clampInt(Number(event.target.value || 0), 0, 15) } : c
                          )
                        }
                      />
                      <em>%</em>
                    </div>
                  </label>
                </div>
              </section>

              <section className="pro-profile-block" id="pro-profile-media">
                <header className="pro-profile-block__head">
                  <span className="pro-profile-block__step">06</span>
                  <div>
                    <h2>{t(props.language, { es: "Foto y video", en: "Photo and video", pt: "Foto e video" })}</h2>
                    <p>
                      {t(props.language, {
                        es: "Una imagen clara y un video breve aumentan la confianza del paciente.",
                        en: "A clear photo and short video build patient trust.",
                        pt: "Uma foto clara e um video curto aumentam a confianca do paciente."
                      })}
                    </p>
                  </div>
                </header>
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
                    <div className="pro-profile-media-actions">
                      <label className="pro-profile-upload-btn pro-profile-upload-btn--primary">
                        <input type="file" accept="image/*" onChange={(e) => void handlePhotoSelected(e)} />
                        <span>
                          {isReadingPhoto
                            ? t(props.language, { es: "Cargando…", en: "Uploading…", pt: "Carregando…" })
                            : t(props.language, { es: "Subir foto", en: "Upload photo", pt: "Enviar foto" })}
                        </span>
                      </label>
                      {profile.photoUrl ? (
                        <button
                          type="button"
                          className="pro-profile-link-btn"
                          onClick={() => setProfile((c) => (c ? { ...c, photoUrl: null } : c))}
                        >
                          {t(props.language, { es: "Quitar", en: "Remove", pt: "Remover" })}
                        </button>
                      ) : null}
                    </div>
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
                    <div className="pro-profile-media-actions">
                      <label className="pro-profile-upload-btn">
                        <input type="file" accept="video/*" onChange={(e) => void handleVideoSelected(e)} />
                        <span>
                          {isReadingVideo
                            ? t(props.language, { es: "Cargando…", en: "Uploading…", pt: "Carregando…" })
                            : profile.videoUrl
                              ? t(props.language, { es: "Cambiar video", en: "Change video", pt: "Alterar video" })
                              : t(props.language, { es: "Subir video", en: "Upload video", pt: "Enviar video" })}
                        </span>
                      </label>
                      {profile.videoUrl ? (
                        <button
                          type="button"
                          className="pro-profile-link-btn"
                          onClick={() => setProfile((c) => (c ? { ...c, videoUrl: null, videoCoverUrl: null } : c))}
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
              </section>

              <details className="pro-profile-block pro-profile-block--advanced">
                <summary>
                  {t(props.language, { es: "Preferencias avanzadas", en: "Advanced preferences", pt: "Preferencias avancadas" })}
                </summary>
                <div className="pro-profile-fields pro-profile-fields--stack">
                  <label className="pro-profile-field pro-profile-field--wide">
                    <span>{t(props.language, { es: "Zona horaria", en: "Time zone", pt: "Fuso horario" })}</span>
                    <input
                      value={profile.timezone}
                      onChange={(event) => setProfile((c) => (c ? { ...c, timezone: event.target.value } : c))}
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
                      value={profile.cancellationHours}
                      onChange={(event) =>
                        setProfile((c) =>
                          c ? { ...c, cancellationHours: Number(event.target.value || 24) } : c
                        )
                      }
                    />
                  </label>
                  <ProfessionalGuidanceBanner language={props.language} text={PROFESSIONAL_CANCELLATION_POLICY_NOTICE} />
                  {profile.registrationApproval === "PENDING" ? (
                    <p className="pro-profile-studio__hint">
                      {t(props.language, {
                        es: "La visibilidad en matching se controla desde el header una vez que el equipo apruebe tu alta.",
                        en: "Matching visibility is controlled from the header once your signup is approved.",
                        pt: "A visibilidade no matching e controlada no header apos aprovacao da equipe."
                      })}
                    </p>
                  ) : null}
                </div>
              </details>
            </div>
          </div>

          <footer className="pro-profile-studio__savebar">
            <div className="pro-profile-studio__savebar-inner">
              <p>
                {t(props.language, {
                  es: "Los cambios se reflejan en tu ficha pública al guardar.",
                  en: "Changes apply to your public profile when you save.",
                  pt: "As alteracoes valem na ficha publica ao salvar."
                })}
              </p>
              <button className="pro-primary pro-profile-studio__save-btn" type="button" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving
                  ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                  : t(props.language, { es: "Guardar perfil", en: "Save profile", pt: "Salvar perfil" })}
              </button>
            </div>
            {message ? <p className="pro-success">{message}</p> : null}
          </footer>
        </>
      ) : null}
    </div>
  );
}
