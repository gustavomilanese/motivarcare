import { allQuestionnaireValueEs } from "./professionalClientProblemQuestionnaire";

/** Países de Latinoamérica y el Caribe (habitual en onboarding). Valor = etiqueta en español. */
export const LATIN_AMERICA_COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: "Antigua y Barbuda", label: "Antigua y Barbuda" },
  { value: "Argentina", label: "Argentina" },
  { value: "Bahamas", label: "Bahamas" },
  { value: "Barbados", label: "Barbados" },
  { value: "Belice", label: "Belice" },
  { value: "Bolivia", label: "Bolivia" },
  { value: "Brasil", label: "Brasil" },
  { value: "Chile", label: "Chile" },
  { value: "Colombia", label: "Colombia" },
  { value: "Costa Rica", label: "Costa Rica" },
  { value: "Cuba", label: "Cuba" },
  { value: "Dominica", label: "Dominica" },
  { value: "Ecuador", label: "Ecuador" },
  { value: "El Salvador", label: "El Salvador" },
  { value: "Granada", label: "Granada" },
  { value: "Guatemala", label: "Guatemala" },
  { value: "Guyana", label: "Guyana" },
  { value: "Haití", label: "Haití" },
  { value: "Honduras", label: "Honduras" },
  { value: "Jamaica", label: "Jamaica" },
  { value: "México", label: "México" },
  { value: "Nicaragua", label: "Nicaragua" },
  { value: "Panamá", label: "Panamá" },
  { value: "Paraguay", label: "Paraguay" },
  { value: "Perú", label: "Perú" },
  { value: "Puerto Rico", label: "Puerto Rico" },
  { value: "República Dominicana", label: "República Dominicana" },
  { value: "San Cristóbal y Nieves", label: "San Cristóbal y Nieves" },
  { value: "Santa Lucía", label: "Santa Lucía" },
  { value: "San Vicente y las Granadinas", label: "San Vicente y las Granadinas" },
  { value: "Surinam", label: "Surinam" },
  { value: "Trinidad y Tobago", label: "Trinidad y Tobago" },
  { value: "Uruguay", label: "Uruguay" },
  { value: "Venezuela", label: "Venezuela" }
].sort((a, b) => a.label.localeCompare(b.label, "es"));

const ATTENTION_AREA_BASE_ES = [
  "Ansiedad",
  "Autoestima",
  "Pareja",
  "Duelo",
  "Depresión",
  "Adicciones",
  "Trauma",
  "Infancia y adolescencia",
  "Estrés laboral",
  "Identidad y diversidad",
  "Alimentación",
  "Dolor crónico",
  "TOC",
  "Mindfulness"
] as const;

/** Áreas de atención en perfil + opciones del cuestionario de problemáticas (onboarding profesional). */
export const ATTENTION_AREA_OPTIONS_ES: string[] = (() => {
  const merged = [...ATTENTION_AREA_BASE_ES];
  for (const v of allQuestionnaireValueEs()) {
    if (!merged.includes(v)) {
      merged.push(v);
    }
  }
  return merged;
})();
