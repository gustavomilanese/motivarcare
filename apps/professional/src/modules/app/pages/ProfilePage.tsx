import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { detectBrowserTimezone, syncUserTimezone } from "@therapy/auth";
import { ATTENTION_AREA_OPTIONS_ES, LATIN_AMERICA_COUNTRY_OPTIONS } from "../../onboarding/constants/latinAmericaCountries";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { API_BASE, apiRequest } from "../services/api";
import { compressImageDataUrl, fileToDataUrl } from "../utils/mediaPreview";
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

export function ProfilePage(props: { token: string; user: AuthUser; language: AppLanguage; onUserChange: (user: AuthUser) => void }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isReadingPhoto, setIsReadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = async () => {
    try {
      const response = await apiRequest<{ role: string; profile: ProfessionalProfile }>("/api/profiles/me", props.token);
      setProfile(
        response.profile
          ? {
              ...response.profile,
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
    loadProfile();
  }, [props.token]);

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
          fullName: profile.fullName
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

  return (
    <section className="pro-card">
      <h2>{t(props.language, { es: "Perfil público", en: "Public profile", pt: "Perfil publico" })}</h2>
      {error ? <p className="pro-error">{error}</p> : null}
      {!profile ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
      {profile ? (
        <div className="pro-stack pro-profile-editor">
          <section className="pro-card pro-profile-section">
            <h3>{t(props.language, { es: "Identidad profesional", en: "Professional identity", pt: "Identidade profissional" })}</h3>
            <div className="pro-grid-form">
              <label>
                {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
                <input
                  value={profile.fullName}
                  onChange={(event) => setProfile((current) => (current ? { ...current, fullName: event.target.value } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "Título profesional", en: "Professional title", pt: "Titulo profissional" })}
                <input
                  value={profile.professionalTitle ?? ""}
                  onChange={(event) => setProfile((current) => (current ? { ...current, professionalTitle: event.target.value } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "Especialización", en: "Specialization", pt: "Especializacao" })}
                <input
                  value={profile.specialization ?? ""}
                  onChange={(event) => setProfile((current) => (current ? { ...current, specialization: event.target.value } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "Años de experiencia", en: "Years of experience", pt: "Anos de experiencia" })}
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={profile.yearsExperience ?? 0}
                  onChange={(event) =>
                    setProfile((current) =>
                      current
                        ? {
                            ...current,
                            yearsExperience: Number(event.target.value || 0)
                          }
                        : current
                    )
                  }
                />
              </label>
              <label>
                {t(props.language, { es: "Rango de experiencia", en: "Experience range", pt: "Faixa de experiencia" })}
                <input
                  value={profile.experienceBand ?? ""}
                  onChange={(event) => setProfile((current) => (current ? { ...current, experienceBand: event.target.value } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "Horas de práctica", en: "Practice hours range", pt: "Faixa de horas de pratica" })}
                <input
                  value={profile.practiceBand ?? ""}
                  onChange={(event) => setProfile((current) => (current ? { ...current, practiceBand: event.target.value } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "Género", en: "Gender", pt: "Genero" })}
                <input
                  value={profile.gender ?? ""}
                  onChange={(event) => setProfile((current) => (current ? { ...current, gender: event.target.value } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "País de nacimiento", en: "Country of birth", pt: "Pais de nascimento" })}
                <select
                  value={profile.birthCountry ?? ""}
                  onChange={(event) => setProfile((current) => (current ? { ...current, birthCountry: event.target.value } : current))}
                >
                  <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                  {birthCountryOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="pro-profile-focus-areas">
                <span>{t(props.language, { es: "Áreas de atención", en: "Areas of focus", pt: "Areas de atencao" })}</span>
                <div className="pro-web-checks">
                  {ATTENTION_AREA_OPTIONS_ES.map((area) => (
                    <button
                      key={area}
                      type="button"
                      className={(profile.focusAreas ?? []).includes(area) ? "active" : ""}
                      onClick={() => toggleProfileFocusArea(area)}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
              <label>
                {t(props.language, { es: "Idiomas (separados por coma)", en: "Languages (comma separated)", pt: "Idiomas (separados por virgula)" })}
                <input
                  value={(profile.languages ?? []).join(", ")}
                  onChange={(event) =>
                    setProfile((current) =>
                      current
                        ? {
                            ...current,
                            languages: event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                          }
                        : current
                    )
                  }
                />
              </label>
              <label>
                {t(props.language, { es: "Zona horaria (avanzado)", en: "Time zone (advanced)", pt: "Fuso horario (avancado)" })}
                <input
                  value={profile.timezone}
                  onChange={(event) => setProfile((current) => (current ? { ...current, timezone: event.target.value } : current))}
                />
              </label>
              <label className="pro-inline">
                <input
                  type="checkbox"
                  checked={profile.visible}
                  onChange={(event) => setProfile((current) => (current ? { ...current, visible: event.target.checked } : current))}
                />
                {t(props.language, { es: "Perfil visible", en: "Visible profile", pt: "Perfil visivel" })}
              </label>
            </div>
          </section>

          <section className="pro-card pro-profile-section">
            <h3>{t(props.language, { es: "Presentación pública", en: "Public presentation", pt: "Apresentacao publica" })}</h3>
            <div className="pro-grid-form">
              <label>
                {t(props.language, { es: "Biografía", en: "Biography", pt: "Biografia" })}
                <textarea
                  rows={4}
                  value={profile.bio ?? ""}
                  onChange={(event) => setProfile((current) => (current ? { ...current, bio: event.target.value } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "Descripción corta", en: "Short description", pt: "Descricao curta" })}
                <input
                  value={profile.shortDescription ?? ""}
                  onChange={(event) => setProfile((current) => (current ? { ...current, shortDescription: event.target.value } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "Enfoque terapéutico", en: "Therapeutic approach", pt: "Abordagem terapeutica" })}
                <input
                  value={profile.therapeuticApproach ?? ""}
                  onChange={(event) =>
                    setProfile((current) => (current ? { ...current, therapeuticApproach: event.target.value } : current))
                  }
                />
              </label>
            </div>
          </section>

          <section className="pro-card pro-profile-section">
            <h3>{t(props.language, { es: "Precios y descuentos", en: "Pricing and discounts", pt: "Precos e descontos" })}</h3>
            <div className="pro-grid-form">
              <label>
                {t(props.language, { es: "Precio por sesión (USD)", en: "Session price (USD)", pt: "Preco por sessao (USD)" })}
                <input
                  type="number"
                  min={0}
                  value={profile.sessionPriceUsd ?? 0}
                  onChange={(event) => setProfile((current) => (current ? { ...current, sessionPriceUsd: Number(event.target.value || 0) } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "Descuento 4 sesiones (máx. 5%)", en: "4-session discount (max 5%)", pt: "Desconto 4 sessoes (max. 5%)" })}
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={profile.discount4 ?? 0}
                  onChange={(event) =>
                    setProfile((current) =>
                      current
                        ? { ...current, discount4: clampInt(Number(event.target.value || 0), 0, 5) }
                        : current
                    )
                  }
                />
              </label>
              <label>
                {t(props.language, { es: "Descuento 8 sesiones (máx. 10%)", en: "8-session discount (max 10%)", pt: "Desconto 8 sessoes (max. 10%)" })}
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={profile.discount8 ?? 0}
                  onChange={(event) =>
                    setProfile((current) =>
                      current
                        ? { ...current, discount8: clampInt(Number(event.target.value || 0), 0, 10) }
                        : current
                    )
                  }
                />
              </label>
              <label>
                {t(props.language, { es: "Descuento 12 sesiones (máx. 15%)", en: "12-session discount (max 15%)", pt: "Desconto 12 sessoes (max. 15%)" })}
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={profile.discount12 ?? 0}
                  onChange={(event) =>
                    setProfile((current) =>
                      current
                        ? { ...current, discount12: clampInt(Number(event.target.value || 0), 0, 15) }
                        : current
                    )
                  }
                />
              </label>
            </div>
          </section>

          <div className="pro-photo-field">
            <span>{t(props.language, { es: "Foto profesional", en: "Professional photo", pt: "Foto profissional" })}</span>
            <div className="pro-photo-picker">
              <div className="pro-photo-preview" aria-hidden={!profile.photoUrl}>
                {profile.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={t(props.language, {
                      es: "Vista previa de la foto profesional",
                      en: "Professional photo preview",
                      pt: "Previa da foto profissional"
                    })}
                  />
                ) : (
                  <strong>{props.user.fullName.slice(0, 1)}</strong>
                )}
              </div>
              <div className="pro-photo-actions">
                <label className="pro-photo-upload">
                  <input type="file" accept="image/*" onChange={handlePhotoSelected} />
                  <span>
                    {isReadingPhoto
                      ? t(props.language, { es: "Cargando foto...", en: "Loading photo...", pt: "Carregando foto..." })
                      : t(props.language, {
                          es: "Subir desde tu dispositivo",
                          en: "Upload from your device",
                          pt: "Enviar do seu dispositivo"
                        })}
                  </span>
                </label>
                {profile.photoUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      setProfile((current) => (current ? { ...current, photoUrl: null } : current));
                      setMessage("");
                      setError("");
                    }}
                  >
                    {t(props.language, { es: "Quitar foto", en: "Remove photo", pt: "Remover foto" })}
                  </button>
                ) : null}
                <small>
                  {t(props.language, {
                    es: "Carga una imagen local desde tu compu o celular.",
                    en: "Upload a local image from your computer or phone.",
                    pt: "Envie uma imagem local do seu computador ou celular."
                  })}
                </small>
              </div>
            </div>
          </div>

          <label>
            {t(props.language, { es: "URL video presentación", en: "Intro video URL", pt: "URL do video de apresentacao" })}
            <input
              value={profile.videoUrl ?? ""}
              onChange={(event) => setProfile((current) => (current ? { ...current, videoUrl: event.target.value } : current))}
            />
          </label>

          <section className="pro-card pro-profile-section">
            <h3>{t(props.language, { es: "Formación", en: "Education", pt: "Formacao" })}</h3>
            <div className="pro-stack">
              {(profile.diplomas ?? []).map((diploma, index) => (
                <article className="pro-education-item" key={diploma.id ?? `profile-diploma-${index}`}>
                  <h4>{t(props.language, { es: `Diploma #${index + 1}`, en: `Diploma #${index + 1}`, pt: `Diploma #${index + 1}` })}</h4>
                  <div className="pro-grid-form">
                    <label>
                      {t(props.language, { es: "Institución", en: "Institution", pt: "Instituicao" })}
                      <input
                        value={diploma.institution}
                        onChange={(event) =>
                          setProfile((current) =>
                            current
                              ? {
                                  ...current,
                                  diplomas: (current.diplomas ?? []).map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, institution: event.target.value } : item
                                  )
                                }
                              : current
                          )
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Título", en: "Degree", pt: "Titulo" })}
                      <input
                        value={diploma.degree}
                        onChange={(event) =>
                          setProfile((current) =>
                            current
                              ? {
                                  ...current,
                                  diplomas: (current.diplomas ?? []).map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, degree: event.target.value } : item
                                  )
                                }
                              : current
                          )
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Año inicio", en: "Start year", pt: "Ano de inicio" })}
                      <input
                        type="number"
                        value={diploma.startYear}
                        onChange={(event) =>
                          setProfile((current) =>
                            current
                              ? {
                                  ...current,
                                  diplomas: (current.diplomas ?? []).map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, startYear: Number(event.target.value || 0) } : item
                                  )
                                }
                              : current
                          )
                        }
                      />
                    </label>
                    <label>
                      {t(props.language, { es: "Año graduación", en: "Graduation year", pt: "Ano de graduacao" })}
                      <input
                        type="number"
                        value={diploma.graduationYear}
                        onChange={(event) =>
                          setProfile((current) =>
                            current
                              ? {
                                  ...current,
                                  diplomas: (current.diplomas ?? []).map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, graduationYear: Number(event.target.value || 0) } : item
                                  )
                                }
                              : current
                          )
                        }
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    className="pro-secondary"
                    onClick={() =>
                      setProfile((current) =>
                        current
                          ? {
                              ...current,
                              diplomas: (current.diplomas ?? []).filter((_, itemIndex) => itemIndex !== index)
                            }
                          : current
                      )
                    }
                  >
                    {t(props.language, { es: "Eliminar diploma", en: "Remove diploma", pt: "Remover diploma" })}
                  </button>
                </article>
              ))}
              <button
                type="button"
                onClick={() =>
                  setProfile((current) =>
                    current
                      ? {
                          ...current,
                          diplomas: [
                            ...(current.diplomas ?? []),
                            {
                              institution: "",
                              degree: "",
                              startYear: new Date().getFullYear() - 4,
                              graduationYear: new Date().getFullYear(),
                              documentUrl: null
                            }
                          ]
                        }
                      : current
                  )
                }
              >
                {t(props.language, { es: "Agregar diploma", en: "Add diploma", pt: "Adicionar diploma" })}
              </button>
            </div>
          </section>

          <section className="pro-card pro-profile-section">
            <h3>{t(props.language, { es: "Stripe y verificación", en: "Stripe and verification", pt: "Stripe e verificacao" })}</h3>
            <div className="pro-grid-form">
              <label>
                {t(props.language, { es: "Documento Stripe (URL)", en: "Stripe document (URL)", pt: "Documento Stripe (URL)" })}
                <input
                  value={profile.stripeDocUrl ?? ""}
                  onChange={(event) => setProfile((current) => (current ? { ...current, stripeDocUrl: event.target.value } : current))}
                />
              </label>
              <label className="pro-inline">
                <input
                  type="checkbox"
                  checked={profile.stripeVerificationStarted}
                  onChange={(event) => setProfile((current) => (current ? { ...current, stripeVerificationStarted: event.target.checked } : current))}
                />
                {t(props.language, { es: "Verificación iniciada", en: "Verification started", pt: "Verificacao iniciada" })}
              </label>
              <label className="pro-inline">
                <input
                  type="checkbox"
                  checked={profile.stripeVerified}
                  onChange={(event) => setProfile((current) => (current ? { ...current, stripeVerified: event.target.checked } : current))}
                />
                {t(props.language, { es: "Verificado en Stripe", en: "Stripe verified", pt: "Verificado no Stripe" })}
              </label>
            </div>
          </section>

          <label>
            {t(props.language, { es: "Política de cancelación (horas)", en: "Cancellation policy (hours)", pt: "Politica de cancelamento (horas)" })}
            <input
              type="number"
              min={0}
              max={168}
              value={profile.cancellationHours}
              onChange={(event) =>
                setProfile((current) =>
                  current
                    ? {
                        ...current,
                        cancellationHours: Number(event.target.value || 24)
                      }
                    : current
                )
              }
            />
          </label>

          <button className="pro-primary" type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
              : t(props.language, { es: "Guardar perfil", en: "Save profile", pt: "Salvar perfil" })}
          </button>
          {message ? <p className="pro-success">{message}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
