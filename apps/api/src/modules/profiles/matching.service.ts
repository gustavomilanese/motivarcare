export type MatchingLanguage = "es" | "en" | "pt";

export interface MatchingSlot {
  id: string;
  startsAt: Date | string;
  endsAt: Date | string;
}

export interface MatchingProfessionalInput {
  id: string;
  fullName: string;
  title: string;
  specialization: string | null;
  focusPrimary: string | null;
  bio: string | null;
  therapeuticApproach: string | null;
  languages: string[];
  yearsExperience: number | null;
  ratingAverage: number | null;
  compatibilityBase: number;
  slots: MatchingSlot[];
}

export interface ProfessionalMatchResult {
  score: number;
  reasons: string[];
  matchedTopics: string[];
  suggestedSlots: Array<{
    id: string;
    startsAt: Date | string;
    endsAt: Date | string;
  }>;
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
  depression: { es: "depresion", en: "depression", pt: "depressao" },
  relationships: { es: "vinculos y pareja", en: "relationships", pt: "relacionamentos" },
  burnout: { es: "estres y burnout", en: "stress and burnout", pt: "estresse e burnout" },
  trauma: { es: "trauma", en: "trauma", pt: "trauma" },
  "emotional-regulation": { es: "regulacion emocional", en: "emotional regulation", pt: "regulacao emocional" },
  "self-esteem": { es: "autoestima", en: "self-esteem", pt: "autoestima" }
};

const MAIN_REASON_TO_TOPIC: Record<string, TopicKey | null> = {
  ansiedad: "anxiety",
  ansiedade: "anxiety",
  anxiety: "anxiety",
  depresion: "depression",
  depressao: "depression",
  depression: "depression",
  "vinculos y pareja": "relationships",
  relationships: "relationships",
  "relacionamentos e casal": "relationships",
  relacionamentos: "relationships",
  "estres / burnout": "burnout",
  "estresse / burnout": "burnout",
  "stress / burnout": "burnout",
  otro: null,
  outro: null,
  other: null
};

const APPROACH_KEYWORDS: Record<string, string[]> = {
  tcc: ["tcc", "cbt", "cognitive", "conductual"],
  psicodinamico: ["psicodinamico", "psychodynamic", "dinamico"],
  integrativo: ["integrativo", "integrative"],
  mindfulness: ["mindfulness", "aceptacion", "atencion plena"]
};

function approachKeywordListsForSegments(preferredApproachRaw: string): string[][] {
  const normAll = normalize(preferredApproachRaw);
  if (!normAll) {
    return [];
  }
  if (normAll.includes("no estoy seguro") || normAll.includes("recomiende el profesional")) {
    return [];
  }
  const segments = preferredApproachRaw
    .split(/\n+/)
    .map((line) => normalize(line.trim()))
    .filter(Boolean);
  if (segments.length === 0) {
    return [];
  }
  const lists: string[][] = [];
  for (const seg of segments) {
    const keywords =
      APPROACH_KEYWORDS[seg]
      ?? (seg.includes("cognitiv") || seg.includes("tcc")
        ? APPROACH_KEYWORDS.tcc
        : seg.includes("psicodin")
          ? APPROACH_KEYWORDS.psicodinamico
          : seg.includes("human")
            ? APPROACH_KEYWORDS.integrativo
            : seg.includes("sistemic") || seg.includes("familiar")
              ? APPROACH_KEYWORDS.integrativo
              : seg.includes("integr")
                ? APPROACH_KEYWORDS.integrativo
                : []);
    if (keywords.length > 0) {
      lists.push(keywords);
    }
  }
  return lists;
}

function professionalMatchesApproachPreferences(preferredApproachRaw: string, therapeuticApproach: string | null | undefined): boolean {
  const approachText = normalize(therapeuticApproach ?? "");
  const lists = approachKeywordListsForSegments(preferredApproachRaw);
  return lists.some((keywords) => keywords.some((keyword) => approachText.includes(keyword)));
}

function hasSpecificTherapyApproachPreference(preferredApproachRaw: string): boolean {
  const normAll = normalize(preferredApproachRaw);
  if (!normAll) {
    return false;
  }
  return !normAll.includes("no estoy seguro") && !normAll.includes("recomiende el profesional");
}

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

function localize(language: MatchingLanguage, values: { es: string; en: string; pt: string }): string {
  if (language === "en") {
    return values.en;
  }
  if (language === "pt") {
    return values.pt;
  }
  return values.es;
}

function parseIntakeAnswers(answers: unknown): Record<string, string> {
  if (!answers || typeof answers !== "object") {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

function extractPatientTopics(answers: Record<string, string>): TopicKey[] {
  const mainReasonRaw = answers.mainReason ?? "";
  const goalText = normalize(answers.therapyGoal);
  const emotionalState = normalize(answers.emotionalState);
  const combined = `${goalText} ${emotionalState}`;
  const topics: TopicKey[] = [];

  const mainParts = mainReasonRaw
    .split(/\n+/)
    .map((piece) => normalize(piece))
    .filter(Boolean);
  for (const part of mainParts) {
    const mapped = MAIN_REASON_TO_TOPIC[part];
    if (mapped) {
      topics.push(mapped);
    }
  }

  (Object.keys(TOPIC_KEYWORDS) as TopicKey[]).forEach((topic) => {
    if (TOPIC_KEYWORDS[topic].some((keyword) => combined.includes(keyword))) {
      topics.push(topic);
    }
  });

  return unique(topics);
}

function extractProfessionalTopics(professional: MatchingProfessionalInput): TopicKey[] {
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

function slotMatchesAvailability(slot: MatchingSlot, availability: string): boolean {
  const slotDate = new Date(slot.startsAt);
  const hour = slotDate.getHours();
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

function sortFutureSlots(slots: MatchingSlot[]): MatchingSlot[] {
  const now = Date.now();
  return [...slots]
    .filter((slot) => new Date(slot.startsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function rankProfessionalMatch(params: {
  professional: MatchingProfessionalInput;
  intakeAnswers: unknown;
  language: MatchingLanguage;
}): ProfessionalMatchResult {
  const answers = parseIntakeAnswers(params.intakeAnswers);
  const patientTopics = extractPatientTopics(answers);
  const availabilityPreference = normalize(answers.availability);
  const preferredApproachRaw = answers.preferredApproach ?? "";
  const preferredLanguage = normalize(answers.language);
  const previousTherapy = normalize(answers.previousTherapy);

  const professionalTopics = extractProfessionalTopics(params.professional);
  const matchedTopics = patientTopics.filter((topic) => professionalTopics.includes(topic));
  const suggestedSlots = sortFutureSlots(params.professional.slots).slice(0, 6);
  const availabilityMatches = suggestedSlots.some((slot) => slotMatchesAvailability(slot, availabilityPreference));

  let score = 35;
  score += Math.min(36, matchedTopics.length * 14);

  if (hasSpecificTherapyApproachPreference(preferredApproachRaw)) {
    if (professionalMatchesApproachPreferences(preferredApproachRaw, params.professional.therapeuticApproach)) {
      score += 14;
    }
  } else {
    score += 6;
  }

  const professionalLanguages = params.professional.languages.map((item) => normalize(item));
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

  if (previousTherapy.includes("mas de 1") || previousTherapy.includes("ayudo") || previousTherapy.includes("ayudó")) {
    score += (params.professional.yearsExperience ?? 0) >= 8 ? 5 : 2;
  } else if (previousTherapy === "no" || previousTherapy.includes("nunca")) {
    const years = params.professional.yearsExperience ?? 0;
    score += years >= 5 && years <= 15 ? 4 : 2;
  }

  score += Math.round(Math.max(0, params.professional.compatibilityBase) * 0.08);

  const rating = params.professional.ratingAverage ?? 4.2;
  score += Math.round(Math.max(0, rating - 4.2) * 4);
  score = Math.max(1, Math.min(99, score));

  const reasons: string[] = [];
  if (matchedTopics.length > 0) {
    const topicLabels = matchedTopics
      .slice(0, 2)
      .map((topic) => localize(params.language, TOPIC_LABELS[topic]))
      .join(", ");
    reasons.push(
      localize(params.language, {
        es: `Experiencia en ${topicLabels}.`,
        en: `Experience in ${topicLabels}.`,
        pt: `Experiencia em ${topicLabels}.`
      })
    );
  }

  if (hasSpecificTherapyApproachPreference(preferredApproachRaw)) {
    if (professionalMatchesApproachPreferences(preferredApproachRaw, params.professional.therapeuticApproach)) {
      reasons.push(
        localize(params.language, {
          es: "Su enfoque terapéutico coincide con alguna de tus preferencias.",
          en: "Therapeutic approach matches at least one of your preferences.",
          pt: "A abordagem terapeutica coincide com pelo menos uma das suas preferencias."
        })
      );
    }
  }

  if (
    availabilityPreference &&
    availabilityPreference !== "flexible" &&
    availabilityMatches
  ) {
    reasons.push(
      localize(params.language, {
        es: "Tiene horarios en tu franja horaria preferida.",
        en: "Has openings in your preferred time range.",
        pt: "Tem horarios na sua faixa preferida."
      })
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      localize(params.language, {
        es: "Perfil compatible según tus respuestas y disponibilidad.",
        en: "Compatible profile based on your responses and availability.",
        pt: "Perfil compativel com base nas suas respostas e disponibilidade."
      })
    );
  }

  return {
    score,
    reasons: reasons.slice(0, 3),
    matchedTopics: matchedTopics.map((topic) => localize(params.language, TOPIC_LABELS[topic])),
    suggestedSlots: suggestedSlots.map((slot) => ({
      id: slot.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt
    }))
  };
}
