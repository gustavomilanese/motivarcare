import { type ChangeEvent, useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { adminSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
import { apiRequest } from "../services/api";
import type { LandingSettingsResponse, WebLandingSettings } from "../types";
import { compressImageDataUrl, fileToDataUrl, normalizeWebLandingSettings } from "../utils/media";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function PortalHeroSettingsSection(props: {
  token: string;
  language: AppLanguage;
  target: "patient" | "professional";
  /** Sin acordeón propio: para anidar dentro de otra sección (p. ej. Configuración). */
  layout?: "accordion" | "embedded";
}) {
  const layout = props.layout ?? "accordion";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [settings, setSettings] = useState<WebLandingSettings>({
    patientHeroImageUrl: null,
    patientDesktopImageUrl: null,
    patientMobileImageUrl: null,
    professionalDesktopImageUrl: null,
    professionalMobileImageUrl: null
  });
  const [savedSettings, setSavedSettings] = useState<WebLandingSettings>({
    patientHeroImageUrl: null,
    patientDesktopImageUrl: null,
    patientMobileImageUrl: null,
    professionalDesktopImageUrl: null,
    professionalMobileImageUrl: null
  });

  const desktopKey: keyof WebLandingSettings = props.target === "patient" ? "patientDesktopImageUrl" : "professionalDesktopImageUrl";
  const mobileKey: keyof WebLandingSettings = props.target === "patient" ? "patientMobileImageUrl" : "professionalMobileImageUrl";

  const hasPendingChanges =
    settings[desktopKey] !== savedSettings[desktopKey]
    || settings[mobileKey] !== savedSettings[mobileKey]
    || (props.target === "patient" && settings.patientHeroImageUrl !== savedSettings.patientHeroImageUrl);

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<LandingSettingsResponse>("/api/admin/landing-settings", {}, props.token);
      const normalized = normalizeWebLandingSettings({
        patientHeroImageUrl: data.settings.patientHeroImageUrl,
        patientDesktopImageUrl: data.settings.patientDesktopImageUrl ?? data.settings.patientHeroImageUrl,
        patientMobileImageUrl: data.settings.patientMobileImageUrl ?? data.settings.patientHeroImageUrl,
        professionalDesktopImageUrl: data.settings.professionalDesktopImageUrl ?? null,
        professionalMobileImageUrl: data.settings.professionalMobileImageUrl ?? data.settings.professionalDesktopImageUrl ?? null
      });
      setSettings(normalized);
      setSavedSettings(normalized);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("portal-hero-load", props.language, raw));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, [props.token, props.target]);

  const setImageFromFile = async (
    event: ChangeEvent<HTMLInputElement>,
    key: keyof WebLandingSettings
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const originalDataUrl = await fileToDataUrl(file);
      const dataUrl = await compressImageDataUrl(originalDataUrl);
      setSettings((current) => ({
        ...current,
        [key]: dataUrl,
        ...(props.target === "patient" && key === "patientDesktopImageUrl" ? { patientHeroImageUrl: dataUrl } : {})
      }));
      setSuccess("Imagen cargada. Guarda para aplicar cambios.");
      setError("");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("portal-hero-asset-load", props.language, raw));
    } finally {
      event.target.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    const normalized = normalizeWebLandingSettings(settings);
    try {
      await apiRequest(
        "/api/admin/landing-settings",
        {
          method: "PUT",
          body: JSON.stringify(normalized)
        },
        props.token
      );
      setSettings(normalized);
      setSavedSettings(normalized);
      setSuccess("Imagen de hero guardada.");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("portal-hero-asset-save", props.language, raw));
    } finally {
      setSaving(false);
    }
  };

  const sectionTitle =
    props.target === "patient"
      ? "Configuracion portal de paciente"
      : "Hero del Portal Psicologo";

  const sectionSubtitle =
    props.target === "patient"
      ? "Hero del portal paciente (laptop y teléfono)."
      : "Imágenes de cabecera para el portal psicólogo (laptop y teléfono).";

  const body = (
    <>
      {loading ? <p>Cargando configuracion...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      {!loading ? (
        <>
          <div className="upload-grid">
            <article className="upload-card">
              <header>
                <h3>{props.target === "patient" ? "Pacientes · laptop" : "Psicologos · laptop"}</h3>
                <span className={`upload-status ${settings[desktopKey] ? "ok" : ""}`}>{settings[desktopKey] ? "Imagen cargada" : "Sin imagen"}</span>
              </header>
              <label className="upload-trigger" htmlFor={`hero-${props.target}-desktop`}>
                Seleccionar imagen
              </label>
              <input
                id={`hero-${props.target}-desktop`}
                className="upload-input-hidden"
                type="file"
                accept="image/*"
                onChange={(event) => void setImageFromFile(event, desktopKey)}
              />
              {settings[desktopKey] ? (
                <div className="upload-preview">
                  <img src={settings[desktopKey] ?? ""} alt={`${props.target} desktop hero`} loading="lazy" />
                </div>
              ) : (
                <div className="upload-preview empty">Preview disponible al cargar imagen</div>
              )}
            </article>

            <article className="upload-card">
              <header>
                <h3>{props.target === "patient" ? "Pacientes · teléfono" : "Psicólogos · teléfono"}</h3>
                <span className={`upload-status ${settings[mobileKey] ? "ok" : ""}`}>{settings[mobileKey] ? "Imagen cargada" : "Sin imagen"}</span>
              </header>
              <label className="upload-trigger" htmlFor={`hero-${props.target}-mobile`}>
                Seleccionar imagen
              </label>
              <input
                id={`hero-${props.target}-mobile`}
                className="upload-input-hidden"
                type="file"
                accept="image/*"
                onChange={(event) => void setImageFromFile(event, mobileKey)}
              />
              {settings[mobileKey] ? (
                <div className="upload-preview">
                  <img src={settings[mobileKey] ?? ""} alt={`${props.target} mobile hero`} loading="lazy" />
                </div>
              ) : (
                <div className="upload-preview empty">Preview disponible al cargar imagen</div>
              )}
            </article>
          </div>

          <button className="primary" type="button" onClick={() => void save()} disabled={saving || !hasPendingChanges}>
            {saving
              ? "Guardando imagenes..."
              : hasPendingChanges
                ? "Guardar imagenes"
                : "Sin cambios por guardar"}
          </button>
        </>
      ) : null}
    </>
  );

  if (layout === "embedded") {
    return <div className="stack portal-hero-settings-embedded">{body}</div>;
  }

  return (
    <details className="card stack web-admin-accordion">
      <summary className="web-admin-accordion-summary">
        <div>
          <h2>{sectionTitle}</h2>
          <p>{sectionSubtitle}</p>
        </div>
      </summary>
      <div className="web-admin-accordion-content stack">{body}</div>
    </details>
  );
}
