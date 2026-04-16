import type { LocalizedText } from "@therapy/i18n-config";

/** Opción: valor persistido (español, estable) + etiquetas i18n. */
export type ProblemQuestionOption = {
  valueEs: string;
  label: LocalizedText;
};

export type ProblemQuestionBlockId = "motivos" | "objetivos" | "preferencias";

export type ProblemQuestionBlock = {
  id: ProblemQuestionBlockId;
  title: LocalizedText;
  hint?: LocalizedText;
  requireAtLeastOne: boolean;
  options: ProblemQuestionOption[];
  otherLabel: LocalizedText;
  otherValuePrefixEs: string;
};

export const PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE: ProblemQuestionBlock[] = [
  {
    id: "motivos",
    title: {
      es: "¿Cuáles son los motivos principales de consulta que atendés?",
      en: "What are the main reasons for consultation that you work with?",
      pt: "Quais sao os principais motivos de consulta que voce atende?"
    },
    hint: {
      es: "Podés marcar uno o varios.",
      en: "You can select one or more.",
      pt: "Voce pode marcar uma ou varias."
    },
    requireAtLeastOne: true,
    otherLabel: {
      es: "Otro (especificar)",
      en: "Other (specify)",
      pt: "Outro (especificar)"
    },
    otherValuePrefixEs: "Otro (motivos de consulta):",
    options: [
      { valueEs: "Ansiedad", label: { es: "Ansiedad", en: "Anxiety", pt: "Ansiedade" } },
      { valueEs: "Ataques de pánico", label: { es: "Ataques de pánico", en: "Panic attacks", pt: "Ataques de panico" } },
      { valueEs: "Estrés", label: { es: "Estrés", en: "Stress", pt: "Estresse" } },
      { valueEs: "Depresión", label: { es: "Depresión", en: "Depression", pt: "Depressao" } },
      { valueEs: "Problemas de autoestima", label: { es: "Problemas de autoestima", en: "Self-esteem issues", pt: "Problemas de autoestima" } },
      { valueEs: "Dificultad en relaciones", label: { es: "Dificultad en relaciones", en: "Relationship difficulties", pt: "Dificuldade em relacionamentos" } },
      { valueEs: "Rupturas amorosas o duelos", label: { es: "Rupturas amorosas o duelos", en: "Breakups or grief", pt: "Rupturas amorosas ou luto" } },
      { valueEs: "Problemas laborales o burnout", label: { es: "Problemas laborales o burnout", en: "Work issues or burnout", pt: "Problemas de trabalho ou burnout" } },
      { valueEs: "Toma de decisiones importantes", label: { es: "Toma de decisiones importantes", en: "Important decisions", pt: "Tomada de decisoes importantes" } },
      { valueEs: "Falta de motivación o propósito", label: { es: "Falta de motivación o propósito", en: "Lack of motivation or purpose", pt: "Falta de motivacao ou proposito" } },
      { valueEs: "Problemas de sueño", label: { es: "Problemas de sueño", en: "Sleep problems", pt: "Problemas de sono" } },
      { valueEs: "Manejo de emociones", label: { es: "Manejo de emociones", en: "Emotion regulation", pt: "Gestao de emocoes" } },
      { valueEs: "Consumo o conductas adictivas", label: { es: "Consumo o conductas adictivas", en: "Substance use or addictive behaviors", pt: "Consumo ou comportamentos adictivos" } },
      { valueEs: "Experiencias difíciles del pasado", label: { es: "Experiencias difíciles del pasado", en: "Difficult past experiences", pt: "Experiencias dificeis do passado" } },
      { valueEs: "Crisis personales", label: { es: "Crisis personales", en: "Personal crises", pt: "Crises pessoais" } },
      { valueEs: "Soledad", label: { es: "Soledad", en: "Loneliness", pt: "Solidao" } },
      { valueEs: "Dificultad para controlar impulsos", label: { es: "Dificultad para controlar impulsos", en: "Difficulty controlling impulses", pt: "Dificuldade para controlar impulsos" } },
      { valueEs: "Crecimiento personal", label: { es: "Crecimiento personal", en: "Personal growth", pt: "Crescimento pessoal" } }
    ]
  },
  {
    id: "objetivos",
    title: {
      es: "¿Qué suelen buscar lograr tus consultantes con la terapia?",
      en: "What do your clients usually want to achieve with therapy?",
      pt: "O que seus consultantes costumam buscar alcancar com a terapia?"
    },
    hint: {
      es: "Marcá lo que aplica a tu práctica.",
      en: "Select what applies to your practice.",
      pt: "Marque o que se aplica a sua pratica."
    },
    requireAtLeastOne: true,
    otherLabel: {
      es: "Otro (especificar)",
      en: "Other (specify)",
      pt: "Outro (especificar)"
    },
    otherValuePrefixEs: "Otro (objetivos de terapia):",
    options: [
      { valueEs: "Sentirse mejor emocionalmente", label: { es: "Sentirse mejor emocionalmente", en: "Feel better emotionally", pt: "Sentir-se melhor emocionalmente" } },
      { valueEs: "Entender qué les pasa", label: { es: "Entender qué les pasa", en: "Understand what is going on for them", pt: "Entender o que esta acontecendo" } },
      { valueEs: "Resolver un problema puntual", label: { es: "Resolver un problema puntual", en: "Resolve a specific issue", pt: "Resolver um problema pontual" } },
      { valueEs: "Mejorar sus relaciones", label: { es: "Mejorar sus relaciones", en: "Improve their relationships", pt: "Melhorar seus relacionamentos" } },
      { valueEs: "Tomar una decisión importante", label: { es: "Tomar una decisión importante", en: "Make an important decision", pt: "Tomar uma decisao importante" } },
      { valueEs: "Reducir ansiedad o estrés", label: { es: "Reducir ansiedad o estrés", en: "Reduce anxiety or stress", pt: "Reduzir ansiedade ou estresse" } },
      { valueEs: "Superar una situación difícil", label: { es: "Superar una situación difícil", en: "Get through a difficult situation", pt: "Superar uma situacao dificil" } },
      { valueEs: "Crecer personalmente", label: { es: "Crecer personalmente", en: "Grow personally", pt: "Crescer pessoalmente" } }
    ]
  },
  {
    id: "preferencias",
    title: {
      es: "¿Qué preferencias de consultantes podés atender respecto del vínculo terapéutico?",
      en: "Which client preferences can you accommodate in the therapeutic relationship?",
      pt: "Quais preferencias de consultantes voce pode atender na relacao terapeutica?"
    },
    hint: {
      es: "Opcional: ayuda a emparejar expectativas.",
      en: "Optional: helps align expectations.",
      pt: "Opcional: ajuda a alinhar expectativas."
    },
    requireAtLeastOne: false,
    otherLabel: {
      es: "Otro (especificar)",
      en: "Other (specify)",
      pt: "Outro (especificar)"
    },
    otherValuePrefixEs: "Otro (preferencias):",
    options: [
      { valueEs: "Preferencia de género del profesional", label: { es: "Género del/la profesional", en: "Therapist gender", pt: "Genero do profissional" } },
      { valueEs: "Preferencia de edad aproximada del profesional", label: { es: "Edad aproximada del/la profesional", en: "Approximate age of therapist", pt: "Idade aproximada do profissional" } },
      { valueEs: "Preferencia de país o acento", label: { es: "País o acento", en: "Country or accent", pt: "Pais ou sotaque" } },
      { valueEs: "Experiencia en temas LGBTQ+", label: { es: "Experiencia en temas LGBTQ+", en: "Experience with LGBTQ+ topics", pt: "Experiencia em temas LGBTQIA+" } }
    ]
  }
];

function countSelectionsForBlock(block: ProblemQuestionBlock, values: string[]): number {
  const allowed = new Set(block.options.map((o) => o.valueEs));
  let n = 0;
  for (const v of values) {
    if (allowed.has(v)) {
      n += 1;
    }
  }
  const prefix = block.otherValuePrefixEs;
  if (
    values.some((v) => {
      if (!v.startsWith(prefix)) {
        return false;
      }
      return v.slice(prefix.length).trim().length > 0;
    })
  ) {
    n += 1;
  }
  return n;
}

/** Al menos una opción en “motivos” y una en “objetivos” (preferencias opcional). */
export function professionalProblemSelectionIsComplete(values: string[]): boolean {
  const motivos = PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE.find((b) => b.id === "motivos");
  const objetivos = PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE.find((b) => b.id === "objetivos");
  if (!motivos || !objetivos) {
    return false;
  }
  return countSelectionsForBlock(motivos, values) >= 1 && countSelectionsForBlock(objetivos, values) >= 1;
}

export function allQuestionnaireValueEs(): string[] {
  const out: string[] = [];
  for (const block of PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE) {
    for (const o of block.options) {
      if (!out.includes(o.valueEs)) {
        out.push(o.valueEs);
      }
    }
  }
  return out;
}
