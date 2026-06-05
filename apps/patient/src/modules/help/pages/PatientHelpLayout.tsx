import { Link, useLocation } from "react-router-dom";
import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import { useEffect, useRef, type ReactNode } from "react";

const t = (language: AppLanguage, values: { es: string; en: string; pt: string }) =>
  textByLanguage(language, values);

function scrollHelpPageToStart(pageEl: HTMLElement | null) {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  pageEl?.scrollIntoView({ block: "start", inline: "nearest" });
}

export function PatientHelpLayout(props: {
  language: AppLanguage;
  title: string;
  children: ReactNode;
}) {
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    scrollHelpPageToStart(pageRef.current);
    const heading = titleRef.current;
    if (!heading) {
      return;
    }
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div ref={pageRef} className="patient-help-page page-stack">
      <p className="patient-help-back">
        <Link to="/">
          {t(props.language, { es: "← Volver al inicio", en: "← Back to home", pt: "← Voltar ao início" })}
        </Link>
      </p>
      <article className="content-card patient-help-card">
        <h1 ref={titleRef}>{props.title}</h1>
        {props.children}
      </article>
    </div>
  );
}
