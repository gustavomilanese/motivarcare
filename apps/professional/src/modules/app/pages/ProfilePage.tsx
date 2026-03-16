import { type ChangeEvent, useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { detectBrowserTimezone, syncUserTimezone } from "@therapy/auth";
import { API_BASE, apiRequest } from "../services/api";
import { fileToDataUrl } from "../utils/mediaPreview";
import type { AuthUser, ProfessionalProfile } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfilePage(props: { token: string; user: AuthUser; language: AppLanguage; onUserChange: (user: AuthUser) => void }) {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isReadingPhoto, setIsReadingPhoto] = useState(false);

  const loadProfile = async () => {
    try {
      const response = await apiRequest<{ role: string; profile: ProfessionalProfile }>("/api/profiles/me", props.token);
      setProfile(response.profile ? { ...response.profile, timezone: response.profile.timezone ?? detectBrowserTimezone() } : null);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo cargar el perfil.",
              en: "Could not load profile.",
              pt: "Nao foi possivel carregar o perfil."
            })
      );
    }
  };

  useEffect(() => {
    loadProfile();
  }, [props.token]);

  const handleSave = async () => {
    if (!profile) {
      return;
    }

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
          languages: profile.languages,
          bio: profile.bio,
          shortDescription: profile.shortDescription,
          therapeuticApproach: profile.therapeuticApproach,
          yearsExperience: profile.yearsExperience,
          sessionPriceUsd: profile.sessionPriceUsd,
          discount4: profile.discount4,
          discount12: profile.discount12,
          discount24: profile.discount24,
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
      setMessage(t(props.language, { es: "Perfil actualizado.", en: "Profile updated.", pt: "Perfil atualizado." }));
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo guardar el perfil.",
              en: "Could not save profile.",
              pt: "Nao foi possivel salvar o perfil."
            })
      );
    }
  };

  const handlePhotoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        t(props.language, {
          es: "Selecciona un archivo de imagen valido.",
          en: "Select a valid image file.",
          pt: "Selecione um arquivo de imagem valido."
        })
      );
      setMessage("");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError(
        t(props.language, {
          es: "La imagen supera 4 MB. Usa una mas liviana.",
          en: "Image exceeds 4 MB. Use a lighter one.",
          pt: "A imagem supera 4 MB. Use uma menor."
        })
      );
      setMessage("");
      return;
    }

    setIsReadingPhoto(true);
    setError("");
    setMessage("");

    try {
      const dataUrl = await fileToDataUrl(file);
      setProfile((current) => (current ? { ...current, photoUrl: dataUrl } : current));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo leer la imagen.",
              en: "Could not read the image.",
              pt: "Nao foi possivel ler a imagem."
            })
      );
    } finally {
      setIsReadingPhoto(false);
    }
  };

  return (
    <section className="pro-card">
      <h2>{t(props.language, { es: "Perfil publico", en: "Public profile", pt: "Perfil publico" })}</h2>
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
                <input
                  value={profile.birthCountry ?? ""}
                  onChange={(event) => setProfile((current) => (current ? { ...current, birthCountry: event.target.value } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "Enfoque principal", en: "Primary focus", pt: "Foco principal" })}
                <input
                  value={profile.focusPrimary ?? ""}
                  onChange={(event) => setProfile((current) => (current ? { ...current, focusPrimary: event.target.value } : current))}
                />
              </label>
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
                {t(props.language, { es: "Descuento 4 sesiones (%)", en: "4-session discount (%)", pt: "Desconto 4 sessoes (%)" })}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={profile.discount4 ?? 0}
                  onChange={(event) => setProfile((current) => (current ? { ...current, discount4: Number(event.target.value || 0) } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "Descuento 12 sesiones (%)", en: "12-session discount (%)", pt: "Desconto 12 sessoes (%)" })}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={profile.discount12 ?? 0}
                  onChange={(event) => setProfile((current) => (current ? { ...current, discount12: Number(event.target.value || 0) } : current))}
                />
              </label>
              <label>
                {t(props.language, { es: "Descuento 24 sesiones (%)", en: "24-session discount (%)", pt: "Desconto 24 sessoes (%)" })}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={profile.discount24 ?? 0}
                  onChange={(event) => setProfile((current) => (current ? { ...current, discount24: Number(event.target.value || 0) } : current))}
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

          <label>
            {t(props.language, { es: "URL portada de video", en: "Video cover URL", pt: "URL da capa do video" })}
            <input
              value={profile.videoCoverUrl ?? ""}
              onChange={(event) => setProfile((current) => (current ? { ...current, videoCoverUrl: event.target.value } : current))}
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
            {t(props.language, { es: "Politica de cancelacion (horas)", en: "Cancellation policy (hours)", pt: "Politica de cancelamento (horas)" })}
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

          <button className="pro-primary" type="button" onClick={handleSave}>
            {t(props.language, { es: "Guardar perfil", en: "Save profile", pt: "Salvar perfil" })}
          </button>
          {message ? <p className="pro-success">{message}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
