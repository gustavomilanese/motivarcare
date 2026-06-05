import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import { Link } from "react-router-dom";
import { HelpFaqSections } from "../components/HelpContentBlocks";
import { PATIENT_FAQ_SECTIONS } from "../content/patientFaqContent";
import { PatientHelpLayout } from "./PatientHelpLayout";

const t = (language: AppLanguage, values: { es: string; en: string; pt: string }) =>
  textByLanguage(language, values);

export function PatientFaqPage(props: { language: AppLanguage }) {
  const { language } = props;

  return (
    <PatientHelpLayout
      language={language}
      title={t(language, { es: "Preguntas frecuentes", en: "Frequently asked questions", pt: "Perguntas frequentes" })}
    >
      <p className="patient-help-intro">
        {t(language, {
          es: "Respuestas a las dudas más comunes. Tocá cada pregunta para expandirla.",
          en: "Answers to common questions. Tap each question to expand it.",
          pt: "Respostas às dúvidas mais comuns. Toque em cada pergunta para expandir."
        })}{" "}
        <Link to="/ayuda/manual" className="patient-help-inline-link">
          {t(language, { es: "Manual de usuario", en: "User manual", pt: "Manual do usuário" })}
        </Link>
      </p>

      <HelpFaqSections language={language} sections={PATIENT_FAQ_SECTIONS} />
    </PatientHelpLayout>
  );
}
