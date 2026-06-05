import { type ReactNode, useLayoutEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { useDiaryPortalToolbarMountTarget } from "../context/DiaryPortalToolbarMount";
import { t } from "../lib/labels";

/** Hero del diario — journal en cama (full-bleed en home). */
const DIARY_HEADER_IMAGE_SRC = "/images/diario-emocional-hero.png";

const DIARY_SECTIONS = [
  {
    to: "/diario/nueva",
    end: false,
    label: { es: "Nueva entrada", en: "New entry", pt: "Nova entrada" }
  },
  {
    to: "/diario/registros",
    end: false,
    label: { es: "Mis registros", en: "My records", pt: "Meus registros" }
  }
] as const;

export function DiarySubNav(props: { language: AppLanguage }) {
  return (
    <nav className="diary-subnav" aria-label={t(props.language, { es: "Secciones del diario", en: "Diary sections", pt: "Seções do diário" })}>
      {DIARY_SECTIONS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `diary-subnav-link${isActive ? " diary-subnav-link--active" : ""}`}
        >
          {t(props.language, item.label)}
        </NavLink>
      ))}
    </nav>
  );
}

export function DiaryShell(props: { language: AppLanguage; className?: string; children: ReactNode }) {
  const extra = props.className?.trim() ? ` ${props.className.trim()}` : "";
  return <section className={`diary-page${extra}`}>{props.children}</section>;
}

/** Título y subtítulo primero; pestañas de sección debajo (orden lógico de lectura). */
export function DiarySectionIntro(props: {
  language: AppLanguage;
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; to?: string }[];
  /** Banner ancho en inicio del diario; en formularios conviene ocultarla. */
  showHeroImage?: boolean;
  /** Pestañas Nueva entrada / Mis registros (p. ej. ocultar en el formulario de nueva entrada). */
  showSubNav?: boolean;
}) {
  const showSubNav = props.showSubNav ?? true;

  return (
    <div className="diary-section-intro">
      <DiaryPageHeader
        language={props.language}
        title={props.title}
        subtitle={props.subtitle}
        breadcrumb={props.breadcrumb}
        showHeroImage={props.showHeroImage ?? false}
      />
      {showSubNav ? <DiarySubNav language={props.language} /> : null}
    </div>
  );
}

export function useDiaryLeaveConfirm(language: AppLanguage, isDirty: boolean) {
  return () => {
    if (!isDirty) return true;
    return window.confirm(
      t(language, {
        es: "¿Salir sin guardar? Se perderá lo que escribiste en esta entrada.",
        en: "Leave without saving? What you wrote in this entry will be lost.",
        pt: "Sair sem salvar? O que você escreveu nesta entrada será perdido."
      })
    );
  };
}

/** Barra superior: volver (opcional) + iconos del portal. */
export function DiaryPortalToolbar(props: {
  language: AppLanguage;
  isDirty?: boolean;
  showLeaveActions?: boolean;
  backTo?: string;
}) {
  const backTo = props.backTo ?? "/diario";
  const confirmLeave = useDiaryLeaveConfirm(props.language, props.isDirty ?? false);
  const setPortalToolbarMount = useDiaryPortalToolbarMountTarget();

  useLayoutEffect(() => {
    return () => setPortalToolbarMount(null);
  }, [setPortalToolbarMount]);

  function handleBack(event: { preventDefault: () => void }) {
    if (!confirmLeave()) {
      event.preventDefault();
    }
  }

  return (
    <div className={`diary-portal-toolbar${props.showLeaveActions ? "" : " diary-portal-toolbar--subpage"}`}>
      <div className="diary-portal-toolbar-start">
        {props.showLeaveActions ? (
          <Link to={backTo} className="diary-back-link" onClick={handleBack}>
            <span aria-hidden="true">←</span>
            {t(props.language, { es: "Volver a Diario", en: "Back to Diary", pt: "Voltar ao Diário" })}
          </Link>
        ) : null}
      </div>
      <div
        id="diary-portal-toolbar-mount"
        className="diary-portal-toolbar-mount"
        ref={setPortalToolbarMount}
      />
    </div>
  );
}

/** @deprecated Usar DiaryPortalToolbar con showLeaveActions */
export function DiaryLeaveBar(props: {
  language: AppLanguage;
  isDirty: boolean;
  backTo?: string;
}) {
  return (
    <DiaryPortalToolbar
      language={props.language}
      isDirty={props.isDirty}
      showLeaveActions
      backTo={props.backTo}
    />
  );
}

export function DiaryBreadcrumb(props: {
  language: AppLanguage;
  items: { label: string; to?: string }[];
}) {
  return (
    <nav className="diary-breadcrumb" aria-label="Breadcrumb">
      {props.items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="diary-breadcrumb-item">
          {index > 0 ? <span className="diary-breadcrumb-sep" aria-hidden="true">{">"}</span> : null}
          {item.to ? (
            <Link to={item.to}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function DiaryPageHeader(props: {
  language: AppLanguage;
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; to?: string }[];
  showHeroImage?: boolean;
}) {
  if (props.showHeroImage) {
    return (
      <header className="diary-page-header diary-page-header--hero-banner">
        <div className="diary-hero-banner-wrap">
          <div className="diary-hero-banner">
          <img
            className="diary-hero-banner-photo"
            src={DIARY_HEADER_IMAGE_SRC}
            alt=""
            width={1200}
            height={520}
            loading="eager"
            decoding="async"
          />
          <div className="diary-hero-banner-scrim" aria-hidden="true" />
          <div className="diary-hero-banner-copy">
            {props.breadcrumb ? <DiaryBreadcrumb language={props.language} items={props.breadcrumb} /> : null}
            <h2 className="diary-page-title diary-page-title--on-hero">{props.title}</h2>
            {props.subtitle ? <p className="diary-page-subtitle diary-page-subtitle--on-hero">{props.subtitle}</p> : null}
          </div>
          </div>
          <div id="diary-hero-toolbar-mount" className="diary-hero-toolbar-mount" />
        </div>
      </header>
    );
  }

  return (
    <header className="diary-page-header">
      <div className="diary-page-header-copy">
        {props.breadcrumb ? <DiaryBreadcrumb language={props.language} items={props.breadcrumb} /> : null}
        <h2 className="diary-page-title">{props.title}</h2>
        {props.subtitle ? <p className="diary-page-subtitle">{props.subtitle}</p> : null}
      </div>
    </header>
  );
}

export function DiaryMacaFab(props: { language: AppLanguage }) {
  return (
    <Link className="diary-maca-fab" to="/chat">
      <span aria-hidden="true">💬</span>
      {t(props.language, {
        es: "Hablar con Maca",
        en: "Talk to Maca",
        pt: "Falar com Maca"
      })}
    </Link>
  );
}
