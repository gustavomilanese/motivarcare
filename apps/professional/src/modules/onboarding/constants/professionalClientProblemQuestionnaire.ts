import type { LocalizedText } from "@therapy/i18n-config";

/** Opción: valor persistido (español, estable) + etiquetas i18n. */
export type ProblemQuestionOption = {
  valueEs: string;
  label: LocalizedText;
  description?: LocalizedText;
  /** Opción de riesgo (Q6): dispara pantalla de recursos de crisis. */
  isCrisis?: boolean;
};

export type ProblemQuestionBlockId =
  | "motivos"
  | "objetivos"
  | "preferencias"
  | "tipoTerapia"
  | "terapiaPrevia"
  | "sentimientoHoy";

export type ProblemQuestionBlock = {
  id: ProblemQuestionBlockId;
  title: LocalizedText;
  hint?: LocalizedText;
  requireAtLeastOne: boolean;
  selectionMode: "multi" | "single";
  options: ProblemQuestionOption[];
  otherLabel?: LocalizedText;
  otherValuePrefixEs?: string;
  /** Opción que anula el resto del bloque (p. ej. “No tengo preferencias”). */
  exclusiveOptionValueEs?: string;
};

/** Valor persistido de la opción de crisis en Q6 (debe coincidir con `options`). */
export const PROFESSIONAL_CLIENT_CRISIS_SENTIMIENTO_VALUE_ES =
  "Estoy teniendo pensamientos de hacerme daño o de no querer vivir";

const PACK_PREFIX: Record<ProblemQuestionBlockId, string> = {
  motivos: "Motivos",
  objetivos: "Objetivos",
  preferencias: "Preferencias",
  tipoTerapia: "Tipo de terapia",
  terapiaPrevia: "Terapia previa",
  sentimientoHoy: "Cómo te sentís hoy"
};

export const PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE: ProblemQuestionBlock[] = [
  {
    id: "motivos",
    title: {
      es: "¿Cuáles son tus motivos principales de consulta?",
      en: "What are your main reasons for seeking support?",
      pt: "Quais sao seus principais motivos de busca?"
    },
    hint: {
      es: "Podés marcar uno o varios.",
      en: "You can select one or more.",
      pt: "Voce pode marcar uma ou varias."
    },
    requireAtLeastOne: true,
    selectionMode: "multi",
    otherLabel: {
      es: "Otro (especificar)",
      en: "Other (specify)",
      pt: "Outro (especificar)"
    },
    otherValuePrefixEs: "Otro (motivos):",
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
      es: "¿Qué te gustaría lograr con la terapia?",
      en: "What would you like to achieve with therapy?",
      pt: "O que voce gostaria de alcancar com a terapia?"
    },
    hint: {
      es: "Podés marcar uno o varios.",
      en: "You can select one or more.",
      pt: "Voce pode marcar uma ou varias."
    },
    requireAtLeastOne: true,
    selectionMode: "multi",
    otherLabel: {
      es: "Otro (especificar)",
      en: "Other (specify)",
      pt: "Outro (especificar)"
    },
    otherValuePrefixEs: "Otro (objetivos):",
    options: [
      { valueEs: "Sentirme mejor emocionalmente", label: { es: "Sentirme mejor emocionalmente", en: "Feel better emotionally", pt: "Sentir-me melhor emocionalmente" } },
      { valueEs: "Entender qué me pasa", label: { es: "Entender qué me pasa", en: "Understand what is going on for me", pt: "Entender o que esta acontecendo comigo" } },
      { valueEs: "Resolver un problema puntual", label: { es: "Resolver un problema puntual", en: "Resolve a specific issue", pt: "Resolver um problema pontual" } },
      { valueEs: "Mejorar mis relaciones", label: { es: "Mejorar mis relaciones", en: "Improve my relationships", pt: "Melhorar meus relacionamentos" } },
      { valueEs: "Tomar una decisión importante", label: { es: "Tomar una decisión importante", en: "Make an important decision", pt: "Tomar uma decisao importante" } },
      { valueEs: "Reducir ansiedad o estrés", label: { es: "Reducir ansiedad o estrés", en: "Reduce anxiety or stress", pt: "Reduzir ansiedade ou estresse" } },
      { valueEs: "Superar una situación difícil", label: { es: "Superar una situación difícil", en: "Get through a difficult situation", pt: "Superar uma situacao dificil" } },
      { valueEs: "Crecer personalmente", label: { es: "Crecer personalmente", en: "Grow personally", pt: "Crescer pessoalmente" } }
    ]
  },
  {
    id: "preferencias",
    title: {
      es: "¿Tenés alguna preferencia respecto de tu psicólogo/a?",
      en: "Do you have any preferences about your therapist?",
      pt: "Voce tem alguma preferencia sobre seu psicologo/a?"
    },
    hint: {
      es: "Marcá lo que aplique, o elegí “No tengo preferencias”.",
      en: "Select what applies, or choose “I have no preferences”.",
      pt: "Marque o que se aplica ou escolha “Nao tenho preferencias”."
    },
    requireAtLeastOne: true,
    selectionMode: "multi",
    exclusiveOptionValueEs: "No tengo preferencias",
    otherLabel: {
      es: "Otro (especificar)",
      en: "Other (specify)",
      pt: "Outro (especificar)"
    },
    otherValuePrefixEs: "Otro (preferencias):",
    options: [
      { valueEs: "Género del/de la psicólogo/a", label: { es: "Género del/de la psicólogo/a", en: "Therapist gender", pt: "Genero do psicologo/a" } },
      { valueEs: "Edad aproximada del/de la psicólogo/a", label: { es: "Edad aproximada del/de la psicólogo/a", en: "Approximate age of therapist", pt: "Idade aproximada do psicologo/a" } },
      { valueEs: "País o acento", label: { es: "País o acento", en: "Country or accent", pt: "Pais ou sotaque" } },
      {
        valueEs: "Experiencia en temas LGBTIQ+",
        label: { es: "Experiencia en temas LGBTIQ+", en: "Experience with LGBTIQ+ topics", pt: "Experiencia em temas LGBTIQ+" }
      },
      { valueEs: "No tengo preferencias", label: { es: "No tengo preferencias", en: "I have no preferences", pt: "Nao tenho preferencias" } }
    ]
  },
  {
    id: "tipoTerapia",
    title: {
      es: "¿Qué tipo de terapia preferís?",
      en: "What type of therapy do you prefer?",
      pt: "Que tipo de terapia voce prefere?"
    },
    hint: {
      es: "Elegí una opción. Si no estás seguro/a, podés dejarlo en manos del profesional.",
      en: "Choose one. If unsure, you can leave it to the professional.",
      pt: "Escolha uma opcao. Se nao tiver certeza, deixe a cargo do profissional."
    },
    requireAtLeastOne: true,
    selectionMode: "single",
    options: [
      {
        valueEs: "Terapia cognitivo-conductual (TCC)",
        label: { es: "Terapia cognitivo-conductual (TCC)", en: "Cognitive-behavioral therapy (CBT)", pt: "Terapia cognitivo-comportamental (TCC)" },
        description: {
          es: "Enfoque en pensamientos y conductas; suele incluir técnicas concretas y tareas entre sesiones.",
          en: "Focus on thoughts and behaviors; often includes concrete techniques and between-session tasks.",
          pt: "Foco em pensamentos e comportamentos; costuma incluir tecnicas concretas e tarefas entre sessoes."
        }
      },
      {
        valueEs: "Psicodinámica o psicoanalítica",
        label: { es: "Psicodinámica o psicoanalítica", en: "Psychodynamic or psychoanalytic", pt: "Psicodinamica ou psicanalitica" },
        description: {
          es: "Exploración del pasado, los vínculos y patrones que hoy se repiten.",
          en: "Exploration of the past, relationships, and patterns that repeat today.",
          pt: "Exploracao do passado, vinculos e padroes que se repetem hoje."
        }
      },
      {
        valueEs: "Humanista o centrada en la persona",
        label: { es: "Humanista o centrada en la persona", en: "Humanistic or person-centered", pt: "Humanista ou centrada na pessoa" },
        description: {
          es: "Espacio de escucha, validación y autorregulación emocional.",
          en: "Space for listening, validation, and emotional self-regulation.",
          pt: "Espaco de escuta, validacao e autorregulacao emocional."
        }
      },
      {
        valueEs: "Sistémica o familiar",
        label: { es: "Sistémica o familiar", en: "Systemic or family therapy", pt: "Sistemica ou familiar" },
        description: {
          es: "Se mira la red de relaciones (pareja, familia, trabajo) y no solo la persona.",
          en: "Looks at the relationship network (partner, family, work), not only the individual.",
          pt: "Olha para a rede de relacionamentos (casal, familia, trabalho), nao so a pessoa."
        }
      },
      {
        valueEs: "Integradora o ecléctica",
        label: { es: "Integradora o ecléctica", en: "Integrative or eclectic", pt: "Integradora ou ecleatica" },
        description: {
          es: "Combina herramientas según lo que vaya surgiendo en el proceso.",
          en: "Combines tools depending on what emerges in the process.",
          pt: "Combina ferramentas conforme o que for surgindo no processo."
        }
      },
      {
        valueEs: "No estoy seguro/a; lo que recomiende el profesional",
        label: { es: "No estoy seguro/a; lo que recomiende el profesional", en: "Not sure; whatever the professional recommends", pt: "Nao tenho certeza; o que o profissional recomendar" },
        description: {
          es: "Podés empezar sin una etiqueta fija y ajustar con tu psicólogo/a.",
          en: "You can start without a fixed label and adjust with your therapist.",
          pt: "Voce pode comecar sem um rotulo fixo e ajustar com seu psicologo/a."
        }
      }
    ]
  },
  {
    id: "terapiaPrevia",
    title: {
      es: "¿Ya estuviste en terapia antes?",
      en: "Have you been in therapy before?",
      pt: "Voce ja fez terapia antes?"
    },
    requireAtLeastOne: true,
    selectionMode: "single",
    options: [
      { valueEs: "Sí, y me ayudó", label: { es: "Sí, y me ayudó", en: "Yes, and it helped", pt: "Sim, e me ajudou" } },
      { valueEs: "Sí, pero no me sirvió mucho", label: { es: "Sí, pero no me sirvió mucho", en: "Yes, but it did not help much", pt: "Sim, mas nao ajudou muito" } },
      { valueEs: "No, nunca fui a terapia", label: { es: "No, nunca fui a terapia", en: "No, I have never been to therapy", pt: "Nao, nunca fiz terapia" } }
    ]
  },
  {
    id: "sentimientoHoy",
    title: {
      es: "¿Cómo te sentís hoy?",
      en: "How are you feeling today?",
      pt: "Como voce se sente hoje?"
    },
    requireAtLeastOne: true,
    selectionMode: "single",
    options: [
      { valueEs: "Bastante bien", label: { es: "Bastante bien", en: "Quite well", pt: "Bastante bem" } },
      { valueEs: "Con altibajos, pero puedo", label: { es: "Con altibajos, pero puedo", en: "Ups and downs, but I can cope", pt: "Com altos e baixos, mas consigo" } },
      { valueEs: "Mal/a, me cuesta", label: { es: "Mal/a, me cuesta", en: "Bad; it is hard", pt: "Mal, e dificil" } },
      { valueEs: "Muy mal/a o desbordado/a", label: { es: "Muy mal/a o desbordado/a", en: "Very bad or overwhelmed", pt: "Muito mal ou sobrecarregado/a" } },
      {
        valueEs: PROFESSIONAL_CLIENT_CRISIS_SENTIMIENTO_VALUE_ES,
        label: {
          es: PROFESSIONAL_CLIENT_CRISIS_SENTIMIENTO_VALUE_ES,
          en: "I am having thoughts of hurting myself or not wanting to live",
          pt: "Estou tendo pensamentos de me machucar ou de nao querer viver"
        },
        isCrisis: true
      }
    ]
  }
];

function optionValueSet(block: ProblemQuestionBlock): Set<string> {
  return new Set(block.options.map((o) => o.valueEs));
}

function countSelectionsForBlock(block: ProblemQuestionBlock, values: string[]): number {
  const allowed = optionValueSet(block);
  let n = 0;
  for (const v of values) {
    if (allowed.has(v)) {
      n += 1;
    }
  }
  if (block.otherValuePrefixEs) {
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
  }
  return n;
}

function blockSatisfied(block: ProblemQuestionBlock, values: string[]): boolean {
  const n = countSelectionsForBlock(block, values);
  if (block.selectionMode === "single") {
    return n === 1;
  }
  if (!block.requireAtLeastOne) {
    return true;
  }
  return n >= 1;
}

/** Completitud: motivos, objetivos, preferencias, tipo de terapia, terapia previa y estado actual. */
export function professionalProblemSelectionIsComplete(values: string[]): boolean {
  return PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE.every((b) => blockSatisfied(b, values));
}

export function professionalProblemSelectionHasCrisisSentimiento(values: string[]): boolean {
  return values.includes(PROFESSIONAL_CLIENT_CRISIS_SENTIMIENTO_VALUE_ES);
}

function collectPartsForBlock(block: ProblemQuestionBlock, values: string[]): string[] {
  const allowed = optionValueSet(block);
  const parts: string[] = [];
  for (const v of values) {
    if (allowed.has(v)) {
      parts.push(v);
    }
  }
  if (block.otherValuePrefixEs) {
    const prefix = block.otherValuePrefixEs;
    for (const v of values) {
      if (v.startsWith(prefix)) {
        parts.push(v.trim());
      }
    }
  }
  return parts;
}

/**
 * Resume el cuestionario en pocas filas para `focusAreas` (límite del API).
 * Cada bloque → como máximo una cadena prefijada.
 */
export function packProblemFocusSelectionsForApi(values: string[]): string[] {
  const packed: string[] = [];
  for (const block of PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE) {
    const parts = collectPartsForBlock(block, values);
    if (parts.length === 0) {
      continue;
    }
    const prefix = PACK_PREFIX[block.id];
    const joined = parts.join(", ");
    const row = `${prefix}: ${joined}`;
    packed.push(row.length > 120 ? `${row.slice(0, 117)}…` : row);
  }
  return packed.slice(0, 25);
}

/** Valores únicos para checklist de perfil / áreas de atención (español). */
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
