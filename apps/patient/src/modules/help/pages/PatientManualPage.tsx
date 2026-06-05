import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import { Link } from "react-router-dom";
import { HelpManualSections } from "../components/HelpContentBlocks";
import { PATIENT_MANUAL_SECTIONS } from "../content/patientManualContent";
import { PatientHelpLayout } from "./PatientHelpLayout";

const t = (language: AppLanguage, values: { es: string; en: string; pt: string }) =>
  textByLanguage(language, values);

export function PatientManualPage(props: { language: AppLanguage }) {
  const { language } = props;

  return (
    <PatientHelpLayout
      language={language}
      title={t(language, { es: "Manual de usuario", en: "User manual", pt: "Manual do usuário" })}
    >
      <p className="patient-help-intro">
        {t(language, {
          es: "Guía completa del portal MotivarCare. También podés consultar las",
          en: "Complete guide to the MotivarCare portal. You can also check the",
          pt: "Guia completa do portal MotivarCare. Você também pode consultar as"
        })}{" "}
        <Link to="/ayuda/preguntas-frecuentes" className="patient-help-inline-link">
          {t(language, { es: "preguntas frecuentes", en: "FAQ", pt: "perguntas frequentes" })}
        </Link>
        {t(language, {
          es: " para respuestas rápidas.",
          en: " for quick answers.",
          pt: " para respostas rápidas."
        })}
      </p>

      <HelpManualSections language={language} sections={PATIENT_MANUAL_SECTIONS} />
    </PatientHelpLayout>
  );
}
