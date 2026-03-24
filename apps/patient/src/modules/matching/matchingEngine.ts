import type { AppLanguage } from "@therapy/i18n-config";
import type { MatchCardProfessional } from "./types";

interface TimeSlot {
  id: string;
  startsAt: string;
  endsAt: string;
}

export interface RankedProfessional {
  professional: MatchCardProfessional;
  score: number;
  reasons: string[];
  matchedTopics: string[];
  suggestedSlots: TimeSlot[];
}

type TopicKey =
  | "anxiety"
  | "depression"
  | "relationships"
  | "burnout"
  | "trauma"
  | "emotional-regulation"
  | "self-esteem";

const TOPIC_KEYWORDS: Record<TopicKey, string[]> = {
  anxiety: ["ansiedad", "anxiety", "panico", "panic", "nervios", "ansioso", "ansiosa"],
  depression: ["depresion", "depression", "triste", "tristeza", "animo bajo", "apatia"],
  relationships: ["pareja", "vinculo", "vinculos", "relaciones", "relationship", "familia"],
  burnout: ["estres", "stress", "burnout", "trabajo", "laboral", "agotamiento", "sobrepasado"],
  trauma: ["trauma", "abuso", "violencia", "duelo", "perdida", "ptsd"],
  "emotional-regulation": ["regulacion emocional", "emocional", "impulsividad", "reactividad"],
  "self-esteem": ["autoestima", "self esteem", "inseguridad", "confianza", "valor personal"]
};

const TOPIC_LABELS: Record<TopicKey, { es: string; en: string; pt: string }> = {
  anxiety: { es: "ansiedad", en: "anxiety", pt: "ansiedade" },
  depression: { es: "depresión", en: "depression", pt: "depressao" },
  relationships: { es: "vínculos y pareja", en: "relationships", pt: "relacionamentos" },
  burnout: { es: "estrés y burnout", en: "stress and burnout", pt: "estresse e burnout" },
  trauma: { es: "trauma", en: "trauma", pt: "trauma" },
  "emotional-regulation": { es: "regulación emocional", en: "emotional regulation", pt: "regulacao emocional" },
  "self-esteem": { es: "autoestima", en: "self-esteem", pt: "autoestima" }
};

const MAIN_REASON_TO_TOPIC: Record<string, TopicKey | null> = {
  ansiedad: "anxiety",
  depresion: "depression",
  "vinculos y pareja": "relationships",
  "estres / burnout": "burnout",
  otro: null
};

const APPROACH_KEYWORDS: Record<string, string[]> = {
  tcc: ["tcc", "cbt", "cognitive", "conductual"],
  psicodinamico: ["psicodinamico", "psychodynamic", "dinamico"],
  integrativo: ["integrativo", "integrative"],
  mindfulness: ["mindfulness", "aceptacion", "atencion plena"]
};

function normalize(value: string | undefined | null): string {
  if (!value) {
    return "";
  }
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function localize(language: AppLanguage, values: { es: string; en: string; pt: string }): string {
  if (language === "en") {
    return values.en;
  }
  if (language === "pt") {
    return values.pt;
  }
  return values.es;
}

function localizeReason(language: AppLanguage, values: { es: string; en: string; pt: string }): string {
  return localize(language, values);
}

function extractPatientTopics(answers: Record<string, string>): TopicKey[] {
  const mainReason = normalize(answers.mainReason);
  const goalText = normalize(answers.therapyGoal);
  const emotionalState = normalize(answers.emotionalState);
  const combined = `${goalText} ${emotionalState}`;
  const topics: TopicKey[] = [];

  const mappedMainReason = MAIN_REASON_TO_TOPIC[mainReason];
  if (mappedMainReason) {
    topics.push(mappedMainReason);
  }

  (Object.keys(TOPIC_KEYWORDS) as TopicKey[]).forEach((topic) => {
    if (TOPIC_KEYWORDS[topic].some((keyword) => combined.includes(keyword))) {
      topics.push(topic);
    }
  });

  return unique(topics);
}

function extractProfessionalTopics(professional: MatchCardProfessional): TopicKey[] {
  const haystack = normalize(
    `${professional.specialization ?? ""} ${professional.focusPrimary ?? ""} ${professional.therapeuticApproach ?? ""} ${professional.bio ?? ""} ${professional.title}`
  );
  const topics: TopicKey[] = [];

  (Object.keys(TOPIC_KEYWORDS) as TopicKey[]).forEach((topic) => {
    if (TOPIC_KEYWORDS[topic].some((keyword) => haystack.includes(keyword))) {
      topics.push(topic);
    }
  });

  return unique(topics);
}

function slotMatchesAvailability(slot: TimeSlot, availability: string): boolean {
  const hour = new Date(slot.startsAt).getHours();
  if (availability === "manana") {
    return hour >= 6 && hour < 12;
  }
  if (availability === "tarde") {
    return hour >= 12 && hour < 18;
  }
  if (availability === "noche") {
    return hour >= 18 && hour <= 23;
  }
  return true;
}

function sortFutureSlots(slots: TimeSlot[]): TimeSlot[] {
  const now = Date.now();
  return [...slots]
    .filter((slot) => new Date(slot.startsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function rankProfessionalsForPatient(params: {
  professionals: MatchCardProfessional[];
  intakeAnswers?: Record<string, string> | null;
  language: AppLanguage;
}): RankedProfessional[] {
  const answers = params.intakeAnswers ?? {};
  const patientTopics = extractPatientTopics(answers);
  const availabilityPreference = normalize(answers.availability);
  const preferredApproach = normalize(answers.preferredApproach);
  const preferredLanguage = normalize(answers.language);
  const previousTherapy = normalize(answers.previousTherapy);

  return params.professionals
    .map((professional) => {
      const professionalTopics = extractProfessionalTopics(professional);
      const matchedTopics = patientTopics.filter((topic) => professionalTopics.includes(topic));
      const suggestedSlots = sortFutureSlots(professional.slots).slice(0, 6);
      const availabilityMatches = suggestedSlots.some((slot) => slotMatchesAvailability(slot, availabilityPreference));

      let score = 35;

      score += Math.min(36, matchedTopics.length * 14);

      if (preferredApproach && preferredApproach !== "no estoy seguro") {
        const approachText = normalize(professional.therapeuticApproach ?? "");
        const approachKeywords = APPROACH_KEYWORDS[preferredApproach] ?? [];
        if (approachKeywords.some((keyword) => approachText.includes(keyword))) {
          score += 14;
        }
      } else {
        score += 6;
      }

      const professionalLanguages = professional.languages.map((item) => normalize(item));
      if (preferredLanguage === "espanol") {
        score += professionalLanguages.some((language) => language.includes("spanish") || language.includes("espanol")) ? 12 : -8;
      } else if (preferredLanguage === "ingles") {
        score += professionalLanguages.some((language) => language.includes("english") || language.includes("ingles")) ? 12 : -8;
      } else if (preferredLanguage === "bilingue") {
        score += professionalLanguages.length >= 2 ? 10 : 4;
      }

      if (availabilityPreference && availabilityPreference !== "flexible") {
        score += availabilityMatches ? 8 : 0;
      } else {
        score += suggestedSlots.length > 0 ? 6 : 0;
      }

      if (previousTherapy.includes("mas de 1")) {
        score += professional.yearsExperience >= 8 ? 5 : 2;
      } else if (previousTherapy === "no") {
        score += professional.yearsExperience >= 5 && professional.yearsExperience <= 15 ? 4 : 2;
      }

      score += Math.round(Math.max(0, professional.compatibilityBase) * 0.08);

      const rating = professional.ratingAverage ?? 4.2;
      score += Math.round(Math.max(0, rating - 4.2) * 4);
      score = Math.max(1, Math.min(99, score));

      const reasons: string[] = [];
      if (matchedTopics.length > 0) {
        const topicLabels = matchedTopics
          .slice(0, 2)
          .map((topic) => localize(params.language, TOPIC_LABELS[topic]))
          .join(", ");
        reasons.push(
          localizeReason(params.language, {
            es: `Experiencia en ${topicLabels}.`,
            en: `Experience in ${topicLabels}.`,
            pt: `Experiencia em ${topicLabels}.`
          })
        );
      }

      if (preferredApproach && preferredApproach !== "no estoy seguro") {
        const approachText = normalize(professional.therapeuticApproach ?? "");
        const approachKeywords = APPROACH_KEYWORDS[preferredApproach] ?? [];
        if (approachKeywords.some((keyword) => approachText.includes(keyword))) {
          reasons.push(
            localizeReason(params.language, {
              es: "Su enfoque terapéutico coincide con tu preferencia.",
              en: "Therapeutic approach matches your preference.",
              pt: "A abordagem terapeutica coincide com sua preferencia."
            })
          );
        }
      }

      if (availabilityMatches) {
        reasons.push(
          localizeReason(params.language, {
            es: "Tiene horarios en tu franja horaria preferida.",
            en: "Has openings in your preferred time range.",
            pt: "Tem horarios na sua faixa preferida."
          })
        );
      }

      if (reasons.length === 0) {
        reasons.push(
          localizeReason(params.language, {
            es: "Perfil compatible según tus respuestas y disponibilidad.",
            en: "Compatible profile based on your responses and availability.",
            pt: "Perfil compativel com base nas suas respostas e disponibilidade."
          })
        );
      }

      return {
        professional,
        score,
        reasons: reasons.slice(0, 3),
        matchedTopics: matchedTopics.map((topic) => localize(params.language, TOPIC_LABELS[topic])),
        suggestedSlots
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const aNext = a.suggestedSlots[0] ? new Date(a.suggestedSlots[0].startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bNext = b.suggestedSlots[0] ? new Date(b.suggestedSlots[0].startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aNext - bNext;
    });
}
