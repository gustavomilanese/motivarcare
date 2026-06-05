import { Link } from "react-router-dom";
import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import type { ReactNode } from "react";

const t = (language: AppLanguage, values: { es: string; en: string; pt: string }) =>
  textByLanguage(language, values);

export function PatientHelpLayout(props: {
  language: AppLanguage;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="patient-help-page page-stack">
      <p className="patient-help-back">
        <Link to="/">
          {t(props.language, { es: "← Volver al inicio", en: "← Back to home", pt: "← Voltar ao início" })}
        </Link>
      </p>
      <article className="content-card patient-help-card">
        <h1>{props.title}</h1>
        {props.children}
      </article>
    </div>
  );
}
