import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

/**
 * Labels de display para opciones del intake.
 * El valor canónico guardado sigue siendo el texto ES (clave del mapa).
 */
const INTAKE_OPTION_LABELS: Record<string, LocalizedText> = {
  // Motivos individuales
  Ansiedad: { es: "Ansiedad", en: "Anxiety", pt: "Ansiedade" },
  "Ataques de pánico": { es: "Ataques de pánico", en: "Panic attacks", pt: "Ataques de panico" },
  Estrés: { es: "Estrés", en: "Stress", pt: "Estresse" },
  Depresión: { es: "Depresión", en: "Depression", pt: "Depressao" },
  "Problemas de autoestima": {
    es: "Problemas de autoestima",
    en: "Self-esteem issues",
    pt: "Problemas de autoestima"
  },
  "Dificultad en relaciones": {
    es: "Dificultad en relaciones",
    en: "Relationship difficulties",
    pt: "Dificuldade nos relacionamentos"
  },
  "Rupturas amorosas o duelos": {
    es: "Rupturas amorosas o duelos",
    en: "Breakups or grief",
    pt: "Terminos amorosos ou luto"
  },
  "Problemas laborales o burnout": {
    es: "Problemas laborales o burnout",
    en: "Work issues or burnout",
    pt: "Problemas no trabalho ou burnout"
  },
  "Toma de decisiones importantes": {
    es: "Toma de decisiones importantes",
    en: "Important decision-making",
    pt: "Tomada de decisoes importantes"
  },
  "Falta de motivación o propósito": {
    es: "Falta de motivación o propósito",
    en: "Lack of motivation or purpose",
    pt: "Falta de motivacao ou proposito"
  },
  "Problemas de sueño": { es: "Problemas de sueño", en: "Sleep problems", pt: "Problemas de sono" },
  "Manejo de emociones": { es: "Manejo de emociones", en: "Emotion regulation", pt: "Manejo de emocoes" },
  "Consumo o conductas adictivas": {
    es: "Consumo o conductas adictivas",
    en: "Substance use or addictive behaviors",
    pt: "Consumo ou condutas aditivas"
  },
  "Experiencias difíciles del pasado": {
    es: "Experiencias difíciles del pasado",
    en: "Difficult past experiences",
    pt: "Experiencias dificeis do passado"
  },
  "Crisis personales": { es: "Crisis personales", en: "Personal crises", pt: "Crises pessoais" },
  Soledad: { es: "Soledad", en: "Loneliness", pt: "Solidao" },
  "Dificultad para controlar impulsos": {
    es: "Dificultad para controlar impulsos",
    en: "Difficulty controlling impulses",
    pt: "Dificuldade para controlar impulsos"
  },
  "Crecimiento personal": { es: "Crecimiento personal", en: "Personal growth", pt: "Crescimento pessoal" },
  Otro: { es: "Otro", en: "Other", pt: "Outro" },
  "Terapia de pareja": { es: "Terapia de pareja", en: "Couples therapy", pt: "Terapia de casal" },

  // Foco pareja
  "Comunicación y conflictos": {
    es: "Comunicación y conflictos",
    en: "Communication and conflict",
    pt: "Comunicacao e conflitos"
  },
  "Distanciamiento emocional": {
    es: "Distanciamiento emocional",
    en: "Emotional distance",
    pt: "Distanciamento emocional"
  },
  "Confianza, celos o infidelidad": {
    es: "Confianza, celos o infidelidad",
    en: "Trust, jealousy, or infidelity",
    pt: "Confianca, ciumes ou infidelidade"
  },
  "Intimidad y sexualidad": {
    es: "Intimidad y sexualidad",
    en: "Intimacy and sexuality",
    pt: "Intimidade e sexualidade"
  },
  "Convivencia, crianza y proyectos de vida": {
    es: "Convivencia, crianza y proyectos de vida",
    en: "Living together, parenting, and life plans",
    pt: "Convivencia, criacao e projetos de vida"
  },
  "Otro / No estoy seguro(a)": {
    es: "Otro / No estoy seguro(a)",
    en: "Other / I'm not sure",
    pt: "Outro / Nao tenho certeza"
  },

  // Objetivos
  "Sentirme mejor emocionalmente": {
    es: "Sentirme mejor emocionalmente",
    en: "Feel better emotionally",
    pt: "Me sentir melhor emocionalmente"
  },
  "Entender qué me pasa": {
    es: "Entender qué me pasa",
    en: "Understand what is happening to me",
    pt: "Entender o que esta acontecendo comigo"
  },
  "Resolver un problema puntual": {
    es: "Resolver un problema puntual",
    en: "Solve a specific problem",
    pt: "Resolver um problema pontual"
  },
  "Mejorar mis relaciones": {
    es: "Mejorar mis relaciones",
    en: "Improve my relationships",
    pt: "Melhorar meus relacionamentos"
  },
  "Tomar una decisión importante": {
    es: "Tomar una decisión importante",
    en: "Make an important decision",
    pt: "Tomar uma decisao importante"
  },
  "Reducir ansiedad o estrés": {
    es: "Reducir ansiedad o estrés",
    en: "Reduce anxiety or stress",
    pt: "Reduzir ansiedade ou estresse"
  },
  "Superar una situación difícil": {
    es: "Superar una situación difícil",
    en: "Get through a hard situation",
    pt: "Superar uma situacao dificil"
  },
  "Crecer personalmente": {
    es: "Crecer personalmente",
    en: "Grow personally",
    pt: "Crescer pessoalmente"
  },

  // Preferencias terapeuta
  "No tengo preferencias": {
    es: "No tengo preferencias",
    en: "I have no preferences",
    pt: "Nao tenho preferencias"
  },
  "Sin preferencia": { es: "Sin preferencia", en: "No preference", pt: "Sem preferencia" },
  Hombre: { es: "Hombre", en: "Man", pt: "Homem" },
  Mujer: { es: "Mujer", en: "Woman", pt: "Mulher" },
  "25 a 35": { es: "25 a 35", en: "25 to 35", pt: "25 a 35" },
  "35 a 45": { es: "35 a 45", en: "35 to 45", pt: "35 a 45" },
  "45 a 55": { es: "45 a 55", en: "45 to 55", pt: "45 a 55" },
  "55 a 65": { es: "55 a 65", en: "55 to 65", pt: "55 a 65" },
  "65 a 75": { es: "65 a 75", en: "65 to 75", pt: "65 a 75" },
  "75 o más": { es: "75 o más", en: "75 or older", pt: "75 ou mais" },
  "Sí, prefiero experiencia o formación en temas LGBTIQ+": {
    es: "Sí, prefiero experiencia o formación en temas LGBTIQ+",
    en: "Yes, I prefer experience or training in LGBTIQ+ topics",
    pt: "Sim, prefiro experiencia ou formacao em temas LGBTIQ+"
  },
  "No es un criterio para mí": {
    es: "No es un criterio para mí",
    en: "Not a criterion for me",
    pt: "Nao e um criterio para mim"
  },

  // Enfoque
  "Terapia cognitivo-conductual (TCC)": {
    es: "Terapia cognitivo-conductual (TCC)",
    en: "Cognitive behavioral therapy (CBT)",
    pt: "Terapia cognitivo-comportamental (TCC)"
  },
  "Psicodinámica o psicoanalítica": {
    es: "Psicodinámica o psicoanalítica",
    en: "Psychodynamic or psychoanalytic",
    pt: "Psicodinamica ou psicanalitica"
  },
  "Humanista o centrada en la persona": {
    es: "Humanista o centrada en la persona",
    en: "Humanistic or person-centered",
    pt: "Humanista ou centrada na pessoa"
  },
  "Sistémica o familiar": {
    es: "Sistémica o familiar",
    en: "Systemic or family",
    pt: "Sistemica ou familiar"
  },
  "Integradora o ecléctica": {
    es: "Integradora o ecléctica",
    en: "Integrative or eclectic",
    pt: "Integrativa ou ecleptica"
  },
  "No estoy seguro/a; lo que recomiende el profesional": {
    es: "No estoy seguro/a; lo que recomiende el profesional",
    en: "I'm not sure; whatever the professional recommends",
    pt: "Nao tenho certeza; o que o profissional recomendar"
  },

  // Terapia previa
  "Sí, y me ayudó": { es: "Sí, y me ayudó", en: "Yes, and it helped me", pt: "Sim, e me ajudou" },
  "Sí, pero no me sirvió mucho": {
    es: "Sí, pero no me sirvió mucho",
    en: "Yes, but it didn't help much",
    pt: "Sim, mas nao me ajudou muito"
  },
  "No, nunca fui a terapia": {
    es: "No, nunca fui a terapia",
    en: "No, I've never been to therapy",
    pt: "Nao, nunca fiz terapia"
  },

  // Estado emocional
  "Bastante bien": { es: "Bastante bien", en: "Pretty well", pt: "Bastante bem" },
  "Con altibajos": { es: "Con altibajos", en: "Ups and downs", pt: "Com altos e baixos" },
  "Me siento muy mal": { es: "Me siento muy mal", en: "I feel very bad", pt: "Me sinto muito mal" },
  "Estoy desbordado/a": { es: "Estoy desbordado/a", en: "I'm overwhelmed", pt: "Estou sobrecarregado/a" },
  "Estoy teniendo pensamientos de hacerme daño o de no querer vivir": {
    es: "Estoy teniendo pensamientos de hacerme daño o de no querer vivir",
    en: "I'm having thoughts of harming myself or not wanting to live",
    pt: "Estou tendo pensamentos de me machucar ou de nao querer viver"
  },

  // Red de apoyo / seguridad (por si se muestran desde valor ES guardado)
  "Apoyo fuerte": { es: "Apoyo fuerte", en: "Strong support", pt: "Apoio forte" },
  "Apoyo limitado": { es: "Apoyo limitado", en: "Limited support", pt: "Apoio limitado" },
  "Sin apoyo": { es: "Sin apoyo", en: "No support", pt: "Sem apoio" },
  "Prefiero no responder": {
    es: "Prefiero no responder",
    en: "Prefer not to answer",
    pt: "Prefiro nao responder"
  },
  No: { es: "No", en: "No", pt: "Nao" },
  Sí: { es: "Sí", en: "Yes", pt: "Sim" },
  "A veces": { es: "A veces", en: "Sometimes", pt: "As vezes" },
  Frecuentemente: { es: "Frecuentemente", en: "Frequently", pt: "Frequentemente" },

  // Prefijos de preferencia de terapeuta (valor guardado "Prefijo: detalle")
  "Género del/de la psicólogo/a": {
    es: "Género del/de la psicólogo/a",
    en: "Therapist gender",
    pt: "Genero do/a psicologo/a"
  },
  "Edad aproximada del/de la psicólogo/a": {
    es: "Edad aproximada del/de la psicólogo/a",
    en: "Approximate therapist age",
    pt: "Idade aproximada do/a psicologo/a"
  },
  "Experiencia en temas LGBTIQ+": {
    es: "Experiencia en temas LGBTIQ+",
    en: "LGBTIQ+ experience",
    pt: "Experiencia em temas LGBTIQ+"
  },
  Género: { es: "Género", en: "Gender", pt: "Genero" },
  "Edad aproximada": { es: "Edad aproximada", en: "Approximate age", pt: "Idade aproximada" },
  "LGBTIQ+": { es: "LGBTIQ+", en: "LGBTIQ+", pt: "LGBTIQ+" }
};

const INTAKE_OPTION_SUBTEXTS: Record<string, LocalizedText> = {
  "Terapia cognitivo-conductual (TCC)": {
    es: "Enfoque en pensamientos y conductas; suele incluir técnicas concretas y tareas entre sesiones.",
    en: "Focus on thoughts and behaviors; often includes concrete techniques and between-session tasks.",
    pt: "Foco em pensamentos e comportamentos; costuma incluir tecnicas concretas e tarefas entre sessoes."
  },
  "Psicodinámica o psicoanalítica": {
    es: "Exploración del pasado, los vínculos y patrones que hoy se repiten.",
    en: "Explores the past, relationships, and patterns that repeat today.",
    pt: "Explora o passado, os vinculos e padroes que se repetem hoje."
  },
  "Humanista o centrada en la persona": {
    es: "Espacio de escucha, validación y autorregulación emocional.",
    en: "A space for listening, validation, and emotional self-regulation.",
    pt: "Espaco de escuta, validacao e autorregulacao emocional."
  },
  "Sistémica o familiar": {
    es: "Se mira la red de relaciones (pareja, familia, trabajo) y no solo la persona.",
    en: "Looks at the relationship network (partner, family, work), not only the person.",
    pt: "Olha a rede de relacoes (casal, familia, trabalho), nao so a pessoa."
  },
  "Integradora o ecléctica": {
    es: "Combina herramientas según lo que vaya surgiendo en el proceso.",
    en: "Combines tools based on what comes up in the process.",
    pt: "Combina ferramentas conforme o que for surgindo no processo."
  },
  "No estoy seguro/a; lo que recomiende el profesional": {
    es: "Podés empezar sin una etiqueta fija y ajustar con tu psicólogo/a.",
    en: "You can start without a fixed label and adjust with your therapist.",
    pt: "Voce pode comecar sem um rotulo fixo e ajustar com seu psicologo/a."
  }
};

export function intakeOptionLabel(language: AppLanguage, optionEs: string): string {
  const separator = optionEs.indexOf(": ");
  if (separator < 0) {
    const mapped = INTAKE_OPTION_LABELS[optionEs];
    return mapped ? textByLanguage(language, mapped) : optionEs;
  }
  const base = optionEs.slice(0, separator);
  const detail = optionEs.slice(separator + 2);
  const mappedBase = INTAKE_OPTION_LABELS[base];
  const label = mappedBase ? textByLanguage(language, mappedBase) : base;
  const mappedDetail = INTAKE_OPTION_LABELS[detail];
  const detailLabel = mappedDetail ? textByLanguage(language, mappedDetail) : detail;
  return `${label}: ${detailLabel}`;
}

export function intakeOptionSubtext(language: AppLanguage, optionEs: string): string | null {
  const mapped = INTAKE_OPTION_SUBTEXTS[optionEs];
  return mapped ? textByLanguage(language, mapped) : null;
}
