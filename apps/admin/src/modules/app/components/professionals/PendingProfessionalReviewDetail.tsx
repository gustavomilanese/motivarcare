import { useEffect, useId, useState, type ReactNode } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { majorCurrencyCodeForMarket } from "@therapy/types";
import { resolveApiAssetUrl } from "../../services/api";
import type { AdminProfessionalOps } from "../../types";
import { PendingProfessionalCredentialsPanel } from "./PendingProfessionalCredentialsPanel";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function displayOrDash(value: string | number | null | undefined): string {
  if (value == null) {
    return "—";
  }
  if (typeof value === "number") {
    return String(value);
  }
  const trimmed = value.trim();
  return trimmed || "—";
}

function isLikelyPlayableVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith("data:video/")) {
    return true;
  }
  if (trimmed.startsWith("data:")) {
    return false;
  }
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) {
    return false;
  }
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(trimmed)) {
    return false;
  }
  return true;
}

type ReviewTabId = "credentials" | "media" | "bio" | "basics";

function PendingMediaPanel(props: { language: AppLanguage; professional: AdminProfessionalOps }) {
  const photoSrc = resolveApiAssetUrl(props.professional.photoUrl);
  const videoRaw = props.professional.videoUrl?.trim() || "";
  const videoSrc = resolveApiAssetUrl(videoRaw) ?? null;
  const canPlayVideo = Boolean(videoSrc && isLikelyPlayableVideoUrl(videoRaw));

  return (
    <div className="dashboard-pending-media">
      <article className="dashboard-pending-media__card">
        <h4 className="dashboard-pending-media__label">
          {t(props.language, { es: "Foto de perfil", en: "Profile photo", pt: "Foto de perfil" })}
        </h4>
        {photoSrc ? (
          <a
            className="dashboard-pending-media__photo"
            href={photoSrc}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t(props.language, {
              es: "Abrir foto en tamaño completo",
              en: "Open photo full size",
              pt: "Abrir foto em tamanho completo"
            })}
          >
            <img src={photoSrc} alt="" />
          </a>
        ) : (
          <p className="dashboard-pending-media__empty">
            {t(props.language, { es: "Sin foto", en: "No photo", pt: "Sem foto" })}
          </p>
        )}
      </article>

      <article className="dashboard-pending-media__card">
        <h4 className="dashboard-pending-media__label">
          {t(props.language, { es: "Video de presentación", en: "Intro video", pt: "Video de apresentacao" })}
        </h4>
        {videoSrc && canPlayVideo ? (
          <div className="dashboard-pending-media__video-wrap">
            <video className="dashboard-pending-media__video" src={videoSrc} controls preload="metadata" />
            <a className="dashboard-pending-media__link" href={videoSrc} target="_blank" rel="noopener noreferrer">
              {t(props.language, {
                es: "Abrir video en nueva pestaña",
                en: "Open video in new tab",
                pt: "Abrir video em nova aba"
              })}
            </a>
          </div>
        ) : videoSrc ? (
          <p className="dashboard-pending-media__link-only">
            <a className="dashboard-pending-media__link" href={videoSrc} target="_blank" rel="noopener noreferrer">
              {t(props.language, {
                es: "Abrir video / enlace",
                en: "Open video / link",
                pt: "Abrir video / link"
              })}
            </a>
          </p>
        ) : (
          <p className="dashboard-pending-media__empty">
            {t(props.language, { es: "Sin video", en: "No video", pt: "Sem video" })}
          </p>
        )}
      </article>
    </div>
  );
}

type BioSubTab = "orientation" | "methodology" | "bio" | "focus";

/** El alta guarda modalidades + «Cómo trabajo» juntos en `therapeuticApproach`. */
function splitTherapeuticApproach(value: string): { modalities: string; methodology: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { modalities: "", methodology: "" };
  }
  const parts = trimmed.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { modalities: parts[0], methodology: parts.slice(1).join("\n\n") };
  }
  // Un solo bloque: las modalidades suelen ser etiquetas cortas (a veces con ";").
  if (trimmed.includes(";") || trimmed.length <= 140) {
    return { modalities: trimmed, methodology: "" };
  }
  return { modalities: "", methodology: trimmed };
}

function PendingBioPanel(props: { language: AppLanguage; professional: AdminProfessionalOps }) {
  const [subTab, setSubTab] = useState<BioSubTab>("orientation");
  const split = splitTherapeuticApproach(props.professional.therapeuticApproach ?? "");
  const bio = props.professional.bio?.trim() || "";
  const focus = props.professional.focusPrimary?.trim() || "";

  useEffect(() => {
    setSubTab("orientation");
  }, [props.professional.id]);

  const subTabs: Array<{ id: BioSubTab; label: LocalizedText }> = [
    {
      id: "orientation",
      label: { es: "Orientación", en: "Orientation", pt: "Orientacao" }
    },
    {
      id: "methodology",
      label: { es: "Cómo trabajo", en: "How I work", pt: "Como trabalho" }
    },
    {
      id: "bio",
      label: { es: "Bio", en: "Bio", pt: "Bio" }
    },
    {
      id: "focus",
      label: { es: "Foco", en: "Focus", pt: "Foco" }
    }
  ];

  const body =
    subTab === "orientation"
      ? split.modalities || "—"
      : subTab === "methodology"
        ? split.methodology || "—"
        : subTab === "bio"
          ? bio || "—"
          : focus || "—";

  return (
    <div className="dashboard-pending-bio-hub">
      <nav
        className="dashboard-pending-hub-tabs"
        aria-label={t(props.language, {
          es: "Textos del perfil",
          en: "Profile copy",
          pt: "Textos do perfil"
        })}
      >
        <div className="dashboard-pending-hub-tabs-track" role="tablist">
          {subTabs.map((tab) => {
            const selected = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={"dashboard-pending-hub-tab" + (selected ? " active" : "")}
                onClick={() => setSubTab(tab.id)}
              >
                {t(props.language, tab.label)}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="dashboard-pending-bio-hub__body" role="tabpanel">
        {subTab === "orientation" && split.modalities.includes(";") ? (
          <ul className="dashboard-pending-bio-modalities">
            {split.modalities.split(";").map((item) => item.trim()).filter(Boolean).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>{body}</p>
        )}
      </div>
    </div>
  );
}

function PendingBasicsPanel(props: { language: AppLanguage; professional: AdminProfessionalOps }) {
  const { professional, language } = props;
  const price =
    professional.sessionPriceUsd != null
      ? `${majorCurrencyCodeForMarket(professional.market)} ${professional.sessionPriceUsd}`
      : "—";

  return (
    <dl className="dashboard-pending-basics">
      <div>
        <dt>{t(language, { es: "Especialidad", en: "Specialization", pt: "Especialidade" })}</dt>
        <dd>{displayOrDash(professional.specialization)}</dd>
      </div>
      <div>
        <dt>{t(language, { es: "Título", en: "Title", pt: "Titulo" })}</dt>
        <dd>{displayOrDash(professional.professionalTitle)}</dd>
      </div>
      <div>
        <dt>{t(language, { es: "Experiencia (años)", en: "Experience (yrs)", pt: "Experiencia (anos)" })}</dt>
        <dd>{displayOrDash(professional.yearsExperience)}</dd>
      </div>
      <div>
        <dt>{t(language, { es: "País de origen", en: "Birth country", pt: "Pais de origem" })}</dt>
        <dd>{displayOrDash(professional.birthCountry)}</dd>
      </div>
      <div>
        <dt>{t(language, { es: "Residencia", en: "Residency", pt: "Residencia" })}</dt>
        <dd>{displayOrDash(professional.residencyCountry)}</dd>
      </div>
      <div>
        <dt>
          {t(language, {
            es: "Precio lista / sesión",
            en: "List price / session",
            pt: "Preco lista / sessao"
          })}
        </dt>
        <dd>{price}</dd>
      </div>
    </dl>
  );
}

function ReviewTabPanel(props: {
  title: string;
  subtitle: string;
  children: ReactNode;
  labelledBy: string;
  /** Si false, solo el body (la solapa ya da el contexto). */
  showHead?: boolean;
}) {
  const showHead = props.showHead !== false;
  return (
    <div className="dashboard-pending-review-panel" role="tabpanel" aria-labelledby={props.labelledBy}>
      {showHead ? (
        <header className="dashboard-pending-review-panel__head">
          <h3 className="dashboard-pending-review-panel__title">{props.title}</h3>
          <p className="dashboard-pending-review-panel__subtitle">{props.subtitle}</p>
        </header>
      ) : null}
      <div className="dashboard-pending-review-panel__body">{props.children}</div>
    </div>
  );
}

export function PendingProfessionalReviewDetail(props: {
  language: AppLanguage;
  professional: AdminProfessionalOps;
  token: string;
  onProfessionalPatch: (professionalId: string, patch: Partial<AdminProfessionalOps>) => void;
}) {
  const { professional, language } = props;
  const tabsId = useId();
  const [activeTab, setActiveTab] = useState<ReviewTabId>("credentials");

  useEffect(() => {
    setActiveTab("credentials");
  }, [professional.id]);

  const diplomas = professional.diplomas ?? [];
  const missingDiplomaDocs = diplomas.filter((diploma) => !diploma.documentUrl?.trim()).length;
  const missingIdentity = !professional.stripeDocUrl?.trim();
  const credentialsAlertCount = missingDiplomaDocs + (missingIdentity ? 1 : 0);
  const missingMediaCount =
    (professional.photoUrl?.trim() ? 0 : 1) + (professional.videoUrl?.trim() ? 0 : 1);

  const tabs: Array<{
    id: ReviewTabId;
    label: LocalizedText;
    badge?: number;
    badgeTone?: "warn" | "muted";
  }> = [
    {
      id: "credentials",
      label: { es: "Formación", en: "Credentials", pt: "Formacao" },
      badge: credentialsAlertCount > 0 ? credentialsAlertCount : undefined,
      badgeTone: "warn"
    },
    {
      id: "media",
      label: { es: "Media", en: "Media", pt: "Midia" },
      badge: missingMediaCount > 0 ? missingMediaCount : undefined,
      badgeTone: "muted"
    },
    {
      id: "bio",
      label: { es: "Perfil", en: "Profile", pt: "Perfil" }
    },
    {
      id: "basics",
      label: { es: "Datos", en: "Basics", pt: "Dados" }
    }
  ];

  const panelCopy: Record<ReviewTabId, { title: LocalizedText; subtitle: LocalizedText }> = {
    credentials: {
      title: { es: "Formación", en: "Credentials", pt: "Formacao" },
      subtitle: {
        es: "Tres pasos: título declarado → identidad → diplomas.",
        en: "Three steps: declared title → identity → diplomas.",
        pt: "Tres passos: titulo declarado → identidade → diplomas."
      }
    },
    media: {
      title: { es: "Foto y video", en: "Photo and video", pt: "Foto e video" },
      subtitle: {
        es: "Así se va a ver en matching y en su ficha pública.",
        en: "This is how they appear in matching and on their public profile.",
        pt: "Assim aparece no matching e no perfil publico."
      }
    },
    bio: {
      title: { es: "Orientación y bio", en: "Orientation and bio", pt: "Orientacao e bio" },
      subtitle: {
        es: "Texto que el paciente lee al elegir profesional.",
        en: "Copy patients read when choosing a professional.",
        pt: "Texto que o paciente le ao escolher o profissional."
      }
    },
    basics: {
      title: { es: "Datos básicos", en: "Basic details", pt: "Dados basicos" },
      subtitle: {
        es: "Identidad comercial, ubicación y precio de lista.",
        en: "Commercial identity, location, and list price.",
        pt: "Identidade comercial, localizacao e preco de lista."
      }
    }
  };

  return (
    <div className="dashboard-pending-review">
      <div className="dashboard-pending-review-tabs" role="tablist" aria-label={t(language, {
        es: "Secciones de la revisión",
        en: "Review sections",
        pt: "Secoes da revisao"
      })}>
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          const tabDomId = `${tabsId}-${tab.id}`;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tabDomId}
              aria-selected={selected}
              className={
                "dashboard-pending-review-tabs__btn" +
                (selected ? " dashboard-pending-review-tabs__btn--active" : "")
              }
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{t(language, tab.label)}</span>
              {tab.badge != null ? (
                <span
                  className={
                    "dashboard-pending-review-tabs__badge" +
                    (tab.badgeTone === "warn"
                      ? " dashboard-pending-review-tabs__badge--warn"
                      : " dashboard-pending-review-tabs__badge--muted")
                  }
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <ReviewTabPanel
        labelledBy={`${tabsId}-${activeTab}`}
        title={t(language, panelCopy[activeTab].title)}
        subtitle={t(language, panelCopy[activeTab].subtitle)}
        showHead={activeTab !== "credentials" && activeTab !== "bio"}
      >
        {activeTab === "credentials" ? (
          <PendingProfessionalCredentialsPanel
            language={language}
            professional={professional}
            token={props.token}
            embedded
            onProfessionalPatch={(patch) => props.onProfessionalPatch(professional.id, patch)}
          />
        ) : null}
        {activeTab === "media" ? <PendingMediaPanel language={language} professional={professional} /> : null}
        {activeTab === "bio" ? <PendingBioPanel language={language} professional={professional} /> : null}
        {activeTab === "basics" ? <PendingBasicsPanel language={language} professional={professional} /> : null}
      </ReviewTabPanel>
    </div>
  );
}
