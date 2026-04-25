import type { LocalizedText } from "@therapy/i18n-config";

/** Valor canónico guardado en estado / perfil (español, alineado al intake paciente salvo «Otros»). */
export const PROFESSIONAL_THERAPY_MODALITY_EXCLUSIVE_ES = "Otros";

export const PROFESSIONAL_THERAPY_MODALITY_ROWS: readonly {
  valueEs: string;
  title: LocalizedText;
  subtext: LocalizedText;
}[] = [
  {
    valueEs: "Terapia cognitivo-conductual (TCC)",
    title: {
      es: "Terapia cognitivo-conductual (TCC)",
      en: "Cognitive behavioral therapy (CBT)",
      pt: "Terapia cognitivo-comportamental (TCC)"
    },
    subtext: {
      es: "Enfoque en pensamientos y conductas; suele incluir técnicas concretas y tareas entre sesiones.",
      en: "Focus on thoughts and behaviors; often includes concrete techniques and between-session tasks.",
      pt: "Foco em pensamentos e comportamentos; costuma incluir tecnicas concretas e tarefas entre sessoes."
    }
  },
  {
    valueEs: "Psicodinámica o psicoanalítica",
    title: {
      es: "Psicodinámica o psicoanalítica",
      en: "Psychodynamic or psychoanalytic",
      pt: "Psicodinamica ou psicanalitica"
    },
    subtext: {
      es: "Exploración del pasado, los vínculos y patrones que hoy se repiten.",
      en: "Explores the past, relationships, and patterns that repeat today.",
      pt: "Explora o passado, vinculos e padroes que se repetem hoje."
    }
  },
  {
    valueEs: "Humanista o centrada en la persona",
    title: {
      es: "Humanista o centrada en la persona",
      en: "Humanistic or person-centered",
      pt: "Humanista ou centrada na pessoa"
    },
    subtext: {
      es: "Espacio de escucha, validación y autorregulación emocional.",
      en: "Listening, validation, and emotional self-regulation.",
      pt: "Escuta, validacao e autorregulacao emocional."
    }
  },
  {
    valueEs: "Sistémica o familiar",
    title: {
      es: "Sistémica o familiar",
      en: "Systemic or family therapy",
      pt: "Sistemica ou familiar"
    },
    subtext: {
      es: "Se mira la red de relaciones (pareja, familia, trabajo) y no solo la persona.",
      en: "Looks at the relationship network (partner, family, work), not only the individual.",
      pt: "Olha a rede de relacoes (casal, familia, trabalho), nao so a pessoa."
    }
  },
  {
    valueEs: "Integradora o ecléctica",
    title: {
      es: "Integradora o ecléctica",
      en: "Integrative or eclectic",
      pt: "Integradora ou ecletica"
    },
    subtext: {
      es: "Combina herramientas según lo que vaya surgiendo en el proceso.",
      en: "Combines tools depending on what emerges in the process.",
      pt: "Combina ferramentas conforme o que for surgindo no processo."
    }
  },
  {
    valueEs: PROFESSIONAL_THERAPY_MODALITY_EXCLUSIVE_ES,
    title: {
      es: "Otros",
      en: "Other",
      pt: "Outros"
    },
    subtext: {
      es: "Marcá esta opción si trabajás con otro enfoque o una combinación que no está arriba; podés ampliarlo en «Cómo trabajo».",
      en: "Choose this if you use another approach or a combination not listed above; add detail in How I work.",
      pt: "Marque se voce usa outro enfoque ou combinacao nao listada; detalhe em Como trabalho."
    }
  }
];
