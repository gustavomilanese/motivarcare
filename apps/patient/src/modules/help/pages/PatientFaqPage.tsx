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
          es: "Respuestas a las dudas más comunes del portal paciente. Si no encontrás lo que buscás, revisá el manual de usuario o escribinos a soporte@motivarcare.com.",
          en: "Answers to the most common patient portal questions. If you can't find what you need, see the user manual or email soporte@motivarcare.com.",
          pt: "Respostas às dúvidas mais comuns do portal do paciente. Se não encontrar o que precisa, veja o manual do usuário ou escreva para soporte@motivarcare.com."
        })}{" "}
        <Link to="/ayuda/manual" className="patient-help-inline-link">
          {t(language, { es: "Manual de usuario", en: "User manual", pt: "Manual do usuário" })}
        </Link>
      </p>

      <HelpFaqSections language={language} sections={PATIENT_FAQ_SECTIONS} />
    </PatientHelpLayout>
  );
}
