import { FormEvent, KeyboardEvent, SyntheticEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  currencyOptionLabel,
  formatCurrencyAmount,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";

type RiskLevel = "low" | "medium" | "high";
type PackageId = "starter" | "growth" | "intensive";
type SenderRole = "patient" | "professional";
type ProfileTab = "data" | "cards" | "subscription" | "settings" | "support";
type PackagePurchaseSource = "checkout_button";

interface SessionUser {
  id: string;
  fullName: string;
  email: string;
}

interface AuthApiUser {
  id: string;
  fullName: string;
  email: string;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  patientProfileId: string | null;
  professionalProfileId: string | null;
}

interface AuthApiResponse {
  token: string;
  user: AuthApiUser;
}

interface IntakeQuestion {
  id: string;
  title: string;
  help: string;
  options?: string[];
  multiline?: boolean;
}

interface IntakeState {
  completed: boolean;
  completedAt: string;
  riskLevel: RiskLevel;
  riskBlocked: boolean;
  answers: Record<string, string>;
}

interface Professional {
  id: string;
  fullName: string;
  title: string;
  yearsExperience: number;
  compatibility: number;
  specialties: string[];
  languages: string[];
  approach: string;
  bio: string;
  rating: number;
  activePatients: number;
  introVideoUrl: string;
  slots: TimeSlot[];
}

interface TimeSlot {
  id: string;
  startsAt: string;
  endsAt: string;
}

interface Booking {
  id: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled";
  joinUrl: string;
  createdAt: string;
  bookingMode?: "credit" | "trial";
}

interface Message {
  id: string;
  professionalId: string;
  sender: SenderRole;
  text: string;
  read: boolean;
  createdAt: string;
}

interface SubscriptionState {
  packageId: PackageId | null;
  packageName: string;
  creditsTotal: number;
  creditsRemaining: number;
  purchasedAt?: string;
}

interface PaymentCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
}

interface PatientProfile {
  timezone: string;
  phone: string;
  emergencyContact: string;
  notificationsEmail: boolean;
  notificationsReminder: boolean;
  dashboardPhotoDataUrl: string;
  cards: PaymentCard[];
}

interface PatientAppState {
  session: SessionUser | null;
  authToken: string | null;
  language: AppLanguage;
  currency: SupportedCurrency;
  intake: IntakeState | null;
  selectedProfessionalId: string;
  assignedProfessionalId: string | null;
  activeChatProfessionalId: string;
  bookedSlotIds: string[];
  bookings: Booking[];
  trialUsedProfessionalIds: string[];
  messages: Message[];
  subscription: SubscriptionState;
  profile: PatientProfile;
}

interface ApiChatThread {
  id: string;
  patientId: string;
  professionalId: string;
  counterpartName: string;
  counterpartUserId: string;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderUserId: string;
  } | null;
  unreadCount: number;
}

interface ApiChatMessage {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderUserId: string;
  senderName: string;
  senderRole: "PATIENT" | "PROFESSIONAL" | "ADMIN";
}

interface PackagePlan {
  id: PackageId;
  name: string;
  credits: number;
  priceUsd: number;
  discountPercent: number;
  description: string;
}

const STORAGE_KEY = "therapy_patient_portal_v3";
const API_BASE =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://localhost:4000";
const DEFAULT_PATIENT_HERO_IMAGE =
  "https://images.pexels.com/photos/8148648/pexels-photo-8148648.jpeg?auto=compress&cs=tinysrgb&w=1600";

const intakeQuestions: IntakeQuestion[] = [
  {
    id: "mainReason",
    title: "1. Cual es tu motivo principal de consulta?",
    help: "Selecciona lo que mejor describa tu necesidad actual.",
    options: ["Ansiedad", "Depresion", "Vinculos y pareja", "Estres / burnout", "Otro"]
  },
  {
    id: "therapyGoal",
    title: "2. Que objetivo te gustaria lograr en terapia?",
    help: "Esta respuesta mejora la calidad del matching.",
    multiline: true
  },
  {
    id: "preferredApproach",
    title: "3. Enfoque terapeutico preferido",
    help: "Si no sabes, no hay problema.",
    options: ["TCC", "Psicodinamico", "Integrativo", "Mindfulness", "No estoy seguro"]
  },
  {
    id: "previousTherapy",
    title: "4. Experiencia previa en terapia",
    help: "Te ayuda a elegir ritmo y profesional.",
    options: ["No", "Si, menos de 3 meses", "Si, entre 3 y 12 meses", "Si, mas de 1 ano"]
  },
  {
    id: "emotionalState",
    title: "5. Como te sentis hoy?",
    help: "Estado emocional actual.",
    options: ["Estable", "Sobrepasado", "Triste", "Ansioso", "No lo se"]
  },
  {
    id: "availability",
    title: "6. Disponibilidad horaria preferida",
    help: "Para mostrarte los mejores slots disponibles.",
    options: ["Manana", "Tarde", "Noche", "Flexible"]
  },
  {
    id: "language",
    title: "7. Idioma para la sesion",
    help: "Se usa para el matching.",
    options: ["Ingles", "Espanol", "Bilingue"]
  },
  {
    id: "budget",
    title: "8. Presupuesto estimado",
    help: "Luego podras elegir paquetes de sesiones.",
    options: ["Paquete inicial", "Paquete intermedio", "Paquete intensivo", "No estoy seguro"]
  },
  {
    id: "supportNetwork",
    title: "9. Contas con red de apoyo (familia/amigos)?",
    help: "Contexto para continuidad terapeutica.",
    options: ["Apoyo fuerte", "Apoyo limitado", "Sin apoyo", "Prefiero no responder"]
  },
  {
    id: "safetyRisk",
    title: "10. En las ultimas 2 semanas tuviste ideas de autolesion?",
    help: "Pregunta de seguridad obligatoria antes de habilitar reservas.",
    options: ["No", "A veces", "Frecuentemente", "Prefiero no responder"]
  }
];

const packagePlans: PackagePlan[] = [
  {
    id: "starter",
    name: "Inicio - 4 sesiones",
    credits: 4,
    priceUsd: 360,
    discountPercent: 30,
    description: "Ideal para una primera etapa de trabajo terapeutico."
  },
  {
    id: "growth",
    name: "Continuidad - 8 sesiones",
    credits: 8,
    priceUsd: 680,
    discountPercent: 36,
    description: "Plan recomendado para trabajo mensual sostenido."
  },
  {
    id: "intensive",
    name: "Intensivo - 12 sesiones",
    credits: 12,
    priceUsd: 960,
    discountPercent: 40,
    description: "Mayor frecuencia para procesos de alta demanda."
  }
];

const packageTextById: Record<PackageId, { name: LocalizedText; description: LocalizedText }> = {
  starter: {
    name: {
      es: "Inicio - 4 sesiones",
      en: "Starter - 4 sessions",
      pt: "Inicio - 4 sessoes"
    },
    description: {
      es: "Ideal para una primera etapa de trabajo terapeutico.",
      en: "Ideal for an initial therapy stage.",
      pt: "Ideal para uma primeira etapa de trabalho terapeutico."
    }
  },
  growth: {
    name: {
      es: "Continuidad - 8 sesiones",
      en: "Continuity - 8 sessions",
      pt: "Continuidade - 8 sessoes"
    },
    description: {
      es: "Plan recomendado para trabajo mensual sostenido.",
      en: "Recommended plan for sustained monthly work.",
      pt: "Plano recomendado para trabalho mensal sustentado."
    }
  },
  intensive: {
    name: {
      es: "Intensivo - 12 sesiones",
      en: "Intensive - 12 sessions",
      pt: "Intensivo - 12 sessoes"
    },
    description: {
      es: "Mayor frecuencia para procesos de alta demanda.",
      en: "Higher frequency for high-demand processes.",
      pt: "Maior frequencia para processos de alta demanda."
    }
  }
};

function localizedPackageName(planId: PackageId | null, fallback: string, language: AppLanguage): string {
  if (!planId) {
    return t(language, {
      es: "Sin paquete activo",
      en: "No active package",
      pt: "Sem pacote ativo"
    });
  }
  return packageTextById[planId]?.name[language] ?? fallback;
}

function localizedPackageDescription(planId: PackageId, fallback: string, language: AppLanguage): string {
  return packageTextById[planId]?.description[language] ?? fallback;
}

function localizeIntakeQuestion(question: IntakeQuestion, language: AppLanguage): IntakeQuestion {
  if (question.id === "mainReason") {
    return {
      ...question,
      title: t(language, {
        es: "1. Cual es tu motivo principal de consulta?",
        en: "1. What is your main reason for consulting?",
        pt: "1. Qual e seu principal motivo de consulta?"
      }),
      help: t(language, {
        es: "Selecciona lo que mejor describa tu necesidad actual.",
        en: "Select what best describes your current need.",
        pt: "Selecione o que melhor descreve sua necessidade atual."
      }),
      options: [
        t(language, { es: "Ansiedad", en: "Anxiety", pt: "Ansiedade" }),
        t(language, { es: "Depresion", en: "Depression", pt: "Depressao" }),
        t(language, { es: "Vinculos y pareja", en: "Relationships", pt: "Relacionamentos e casal" }),
        t(language, { es: "Estres / burnout", en: "Stress / burnout", pt: "Estresse / burnout" }),
        t(language, { es: "Otro", en: "Other", pt: "Outro" })
      ]
    };
  }

  if (question.id === "therapyGoal") {
    return {
      ...question,
      title: t(language, {
        es: "2. Que objetivo te gustaria lograr en terapia?",
        en: "2. What goal would you like to achieve in therapy?",
        pt: "2. Qual objetivo voce gostaria de alcancar na terapia?"
      }),
      help: t(language, {
        es: "Esta respuesta mejora la calidad del matching.",
        en: "This answer improves matching quality.",
        pt: "Esta resposta melhora a qualidade do matching."
      })
    };
  }

  if (question.id === "preferredApproach") {
    return {
      ...question,
      title: t(language, {
        es: "3. Enfoque terapeutico preferido",
        en: "3. Preferred therapeutic approach",
        pt: "3. Abordagem terapeutica preferida"
      }),
      help: t(language, {
        es: "Si no sabes, no hay problema.",
        en: "If you are not sure, that is okay.",
        pt: "Se voce nao souber, tudo bem."
      }),
      options: [
        "CBT",
        t(language, { es: "Psicodinamico", en: "Psychodynamic", pt: "Psicodinamico" }),
        t(language, { es: "Integrativo", en: "Integrative", pt: "Integrativo" }),
        "Mindfulness",
        t(language, { es: "No estoy seguro", en: "I am not sure", pt: "Nao tenho certeza" })
      ]
    };
  }

  if (question.id === "previousTherapy") {
    return {
      ...question,
      title: t(language, {
        es: "4. Experiencia previa en terapia",
        en: "4. Previous therapy experience",
        pt: "4. Experiencia previa em terapia"
      }),
      help: t(language, {
        es: "Te ayuda a elegir ritmo y profesional.",
        en: "This helps choose pace and therapist.",
        pt: "Isso ajuda a definir ritmo e profissional."
      }),
      options: [
        t(language, { es: "No", en: "No", pt: "Nao" }),
        t(language, { es: "Si, menos de 3 meses", en: "Yes, less than 3 months", pt: "Sim, menos de 3 meses" }),
        t(language, { es: "Si, entre 3 y 12 meses", en: "Yes, between 3 and 12 months", pt: "Sim, entre 3 e 12 meses" }),
        t(language, { es: "Si, mas de 1 ano", en: "Yes, more than 1 year", pt: "Sim, mais de 1 ano" })
      ]
    };
  }

  if (question.id === "emotionalState") {
    return {
      ...question,
      title: t(language, {
        es: "5. Como te sentis hoy?",
        en: "5. How do you feel today?",
        pt: "5. Como voce se sente hoje?"
      }),
      help: t(language, {
        es: "Estado emocional actual.",
        en: "Current emotional state.",
        pt: "Estado emocional atual."
      }),
      options: [
        t(language, { es: "Estable", en: "Stable", pt: "Estavel" }),
        t(language, { es: "Sobrepasado", en: "Overwhelmed", pt: "Sobrecarregado" }),
        t(language, { es: "Triste", en: "Sad", pt: "Triste" }),
        t(language, { es: "Ansioso", en: "Anxious", pt: "Ansioso" }),
        t(language, { es: "No lo se", en: "I do not know", pt: "Nao sei" })
      ]
    };
  }

  if (question.id === "availability") {
    return {
      ...question,
      title: t(language, {
        es: "6. Disponibilidad horaria preferida",
        en: "6. Preferred availability",
        pt: "6. Disponibilidade horaria preferida"
      }),
      help: t(language, {
        es: "Para mostrarte los mejores slots disponibles.",
        en: "To show the best available slots.",
        pt: "Para mostrar os melhores horarios disponiveis."
      }),
      options: [
        t(language, { es: "Manana", en: "Morning", pt: "Manha" }),
        t(language, { es: "Tarde", en: "Afternoon", pt: "Tarde" }),
        t(language, { es: "Noche", en: "Evening", pt: "Noite" }),
        t(language, { es: "Flexible", en: "Flexible", pt: "Flexivel" })
      ]
    };
  }

  if (question.id === "language") {
    return {
      ...question,
      title: t(language, {
        es: "7. Idioma para la sesion",
        en: "7. Session language",
        pt: "7. Idioma para a sessao"
      }),
      help: t(language, {
        es: "Se usa para el matching.",
        en: "Used for matching.",
        pt: "Usado para o matching."
      }),
      options: [
        t(language, { es: "Ingles", en: "English", pt: "Ingles" }),
        t(language, { es: "Espanol", en: "Spanish", pt: "Espanhol" }),
        t(language, { es: "Bilingue", en: "Bilingual", pt: "Bilingue" })
      ]
    };
  }

  if (question.id === "budget") {
    return {
      ...question,
      title: t(language, {
        es: "8. Presupuesto estimado",
        en: "8. Estimated budget",
        pt: "8. Orcamento estimado"
      }),
      help: t(language, {
        es: "Luego podras elegir paquetes de sesiones.",
        en: "You can choose session packages afterwards.",
        pt: "Depois voce podera escolher pacotes de sessoes."
      }),
      options: [
        t(language, { es: "Paquete inicial", en: "Starter package", pt: "Pacote inicial" }),
        t(language, { es: "Paquete intermedio", en: "Growth package", pt: "Pacote intermediario" }),
        t(language, { es: "Paquete intensivo", en: "Intensive package", pt: "Pacote intensivo" }),
        t(language, { es: "No estoy seguro", en: "I am not sure", pt: "Nao tenho certeza" })
      ]
    };
  }

  if (question.id === "supportNetwork") {
    return {
      ...question,
      title: t(language, {
        es: "9. Contas con red de apoyo (familia/amigos)?",
        en: "9. Do you have a support network (family/friends)?",
        pt: "9. Voce conta com rede de apoio (familia/amigos)?"
      }),
      help: t(language, {
        es: "Contexto para continuidad terapeutica.",
        en: "Context for therapy continuity.",
        pt: "Contexto para continuidade terapeutica."
      }),
      options: [
        t(language, { es: "Apoyo fuerte", en: "Strong support", pt: "Apoio forte" }),
        t(language, { es: "Apoyo limitado", en: "Limited support", pt: "Apoio limitado" }),
        t(language, { es: "Sin apoyo", en: "No support", pt: "Sem apoio" }),
        t(language, { es: "Prefiero no responder", en: "Prefer not to answer", pt: "Prefiro nao responder" })
      ]
    };
  }

  if (question.id === "safetyRisk") {
    return {
      ...question,
      title: t(language, {
        es: "10. En las ultimas 2 semanas tuviste ideas de autolesion?",
        en: "10. In the last 2 weeks, have you had self-harm thoughts?",
        pt: "10. Nas ultimas 2 semanas voce teve ideias de autoagressao?"
      }),
      help: t(language, {
        es: "Pregunta de seguridad obligatoria antes de habilitar reservas.",
        en: "Mandatory safety question before enabling bookings.",
        pt: "Pergunta obrigatoria de seguranca antes de habilitar reservas."
      }),
      options: [
        t(language, { es: "No", en: "No", pt: "Nao" }),
        t(language, { es: "A veces", en: "Sometimes", pt: "As vezes" }),
        t(language, { es: "Frecuentemente", en: "Frequently", pt: "Frequentemente" }),
        t(language, { es: "Prefiero no responder", en: "Prefer not to answer", pt: "Prefiro nao responder" })
      ]
    };
  }

  return question;
}

function buildSlot(professionalId: string, dayOffset: number, hour: number, minute: number): TimeSlot {
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(hour, minute, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 50);

  return {
    id: `${professionalId}-${dayOffset}-${hour}-${minute}`,
    startsAt: start.toISOString(),
    endsAt: end.toISOString()
  };
}

function buildProfessionals(): Professional[] {
  return [
    {
      id: "pro-1",
      fullName: "Dr. Emma Collins",
      title: "Clinical Psychologist",
      yearsExperience: 11,
      compatibility: 92,
      specialties: ["Anxiety", "Stress", "Work burnout"],
      languages: ["English", "Spanish"],
      approach: "CBT + mindfulness protocols",
      bio: "Focus on anxiety regulation, cognitive reframing, and practical routines for sustained recovery.",
      rating: 4.9,
      activePatients: 46,
      introVideoUrl: "https://example.com/video/emma",
      slots: [
        buildSlot("pro-1", 1, 9, 0),
        buildSlot("pro-1", 1, 11, 0),
        buildSlot("pro-1", 2, 16, 30),
        buildSlot("pro-1", 3, 10, 0),
        buildSlot("pro-1", 4, 18, 0),
        buildSlot("pro-1", 5, 12, 30)
      ]
    },
    {
      id: "pro-2",
      fullName: "Dr. Michael Rivera",
      title: "Psychotherapist",
      yearsExperience: 14,
      compatibility: 88,
      specialties: ["Relationships", "Trauma", "Emotional regulation"],
      languages: ["English", "Spanish"],
      approach: "Integrative psychodynamic",
      bio: "Trabajo terapeutico de mediano y largo plazo con foco en vinculos y regulacion emocional.",
      rating: 4.8,
      activePatients: 39,
      introVideoUrl: "https://example.com/video/michael",
      slots: [
        buildSlot("pro-2", 1, 14, 0),
        buildSlot("pro-2", 2, 9, 30),
        buildSlot("pro-2", 3, 15, 30),
        buildSlot("pro-2", 4, 11, 0),
        buildSlot("pro-2", 6, 10, 30)
      ]
    },
    {
      id: "pro-3",
      fullName: "Dr. Sophia Nguyen",
      title: "Counseling Psychologist",
      yearsExperience: 9,
      compatibility: 85,
      specialties: ["Depression", "Life transitions", "Self esteem"],
      languages: ["English"],
      approach: "Evidence based integrative",
      bio: "Tratamiento breve con objetivos claros, seguimiento y avances medibles.",
      rating: 4.7,
      activePatients: 31,
      introVideoUrl: "https://example.com/video/sophia",
      slots: [
        buildSlot("pro-3", 1, 13, 30),
        buildSlot("pro-3", 2, 17, 0),
        buildSlot("pro-3", 3, 8, 30),
        buildSlot("pro-3", 5, 9, 0),
        buildSlot("pro-3", 6, 16, 0)
      ]
    },
    {
      id: "pro-4",
      fullName: "Dr. Olivia Carter",
      title: "Trauma Specialist",
      yearsExperience: 12,
      compatibility: 83,
      specialties: ["Trauma recovery", "Anxiety", "Emotional resilience"],
      languages: ["English"],
      approach: "Trauma-informed CBT",
      bio: "Acompana procesos de regulacion del sistema nervioso y reconstruccion de seguridad emocional.",
      rating: 4.8,
      activePatients: 34,
      introVideoUrl: "https://example.com/video/olivia",
      slots: [
        buildSlot("pro-4", 1, 8, 30),
        buildSlot("pro-4", 2, 12, 0),
        buildSlot("pro-4", 3, 18, 0),
        buildSlot("pro-4", 4, 9, 30),
        buildSlot("pro-4", 5, 15, 0),
        buildSlot("pro-4", 6, 11, 30)
      ]
    }
  ];
}

const professionalsCatalog = buildProfessionals();
const professionalImageMap: Record<string, string> = {
  "pro-1": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80",
  "pro-2": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
  "pro-3": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
  "pro-4": "https://images.unsplash.com/photo-1594824804732-ca8db7d6e6f8?auto=format&fit=crop&w=900&q=80"
};

const heroImage = "https://source.unsplash.com/1600x900/?person,laptop,mountain,lake";

const initialMessages: Message[] = [];

const defaultProfile: PatientProfile = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  phone: "",
  emergencyContact: "",
  notificationsEmail: true,
  notificationsReminder: true,
  dashboardPhotoDataUrl: "",
  cards: []
};

const defaultState: PatientAppState = {
  session: null,
  authToken: null,
  language: "es",
  currency: "USD",
  intake: null,
  selectedProfessionalId: professionalsCatalog[0].id,
  assignedProfessionalId: null,
  activeChatProfessionalId: professionalsCatalog[0].id,
  bookedSlotIds: [],
  bookings: [],
  trialUsedProfessionalIds: [],
  messages: initialMessages,
  subscription: {
    packageId: null,
    packageName: "Sin paquete activo",
    creditsTotal: 0,
    creditsRemaining: 0
  },
  profile: defaultProfile
};

function loadState(): PatientAppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw) as PatientAppState;
    return {
      ...defaultState,
      ...parsed,
      language: (SUPPORTED_LANGUAGES as readonly string[]).includes((parsed as any).language)
        ? (parsed as any).language
        : "es",
      currency: (SUPPORTED_CURRENCIES as readonly string[]).includes((parsed as any).currency)
        ? (parsed as any).currency
        : "USD",
      trialUsedProfessionalIds: parsed.trialUsedProfessionalIds ?? [],
      assignedProfessionalId: parsed.assignedProfessionalId ?? null,
      profile: {
        ...defaultProfile,
        ...parsed.profile,
        cards: parsed.profile?.cards ?? []
      }
    };
  } catch {
    return defaultState;
  }
}

function saveState(state: PatientAppState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        errorMessage = payload.error;
      }
    } catch {
      // ignore parse error
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateTime(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function formatDateOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "long",
      month: "long",
      day: "numeric"
    }
  });
}

function formatMoney(amountInUsd: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyAmount({
    amountInUsd,
    currency,
    language,
    maximumFractionDigits: 0
  });
}

function evaluateRisk(answers: Record<string, string>): { level: RiskLevel; blocked: boolean } {
  const safetyAnswer = answers.safetyRisk ?? "";

  if (safetyAnswer === "Frequently" || safetyAnswer === "Frecuentemente" || safetyAnswer === "Frequentemente") {
    return { level: "high", blocked: true };
  }

  if (safetyAnswer === "Sometimes" || safetyAnswer === "A veces" || safetyAnswer === "As vezes") {
    return { level: "medium", blocked: true };
  }

  return { level: "low", blocked: false };
}

function findProfessionalById(professionalId: string): Professional {
  return professionalsCatalog.find((item) => item.id === professionalId) ?? professionalsCatalog[0];
}

function getUnreadCount(messages: Message[], professionalId?: string): number {
  return messages.filter((message) => !message.read && (!professionalId || message.professionalId === professionalId)).length;
}

function currencySymbolOnly(currency: SupportedCurrency): string {
  switch (currency) {
    case "USD":
      return "$";
    case "EUR":
      return "EUR";
    case "GBP":
      return "GBP";
    case "BRL":
      return "R$";
    case "ARS":
      return "$";
    default:
      return currency;
  }
}

function getNextBooking(bookings: Booking[]): Booking | null {
  const now = Date.now();

  return (
    bookings
      .filter((booking) => booking.status === "confirmed" && new Date(booking.startsAt).getTime() > now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null
  );
}

function handleImageFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/prof-emma.svg";
}

function handleHeroFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/hero-therapy.svg";
}

function AuthScreen(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  onLogin: (user: SessionUser, token: string | null) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("Alex Morgan");
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("SecurePass123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.includes("@") || password.length < 8) {
      setError(
        t(props.language, {
          es: "Usa un email valido y una contrasena de al menos 8 caracteres.",
          en: "Use a valid email and a password with at least 8 characters.",
          pt: "Use um email valido e uma senha com pelo menos 8 caracteres."
        })
      );
      return;
    }

    if (mode === "register" && fullName.trim().length < 2) {
      setError(
        t(props.language, {
          es: "Completa tu nombre y apellido.",
          en: "Please complete your full name.",
          pt: "Preencha seu nome completo."
        })
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        mode === "register"
          ? {
              fullName: fullName.trim(),
              email: email.trim().toLowerCase(),
              password,
              role: "PATIENT",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
            }
          : {
              email: email.trim().toLowerCase(),
              password
            };

      const response = await apiRequest<AuthApiResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.user.role !== "PATIENT") {
        throw new Error(
          t(props.language, {
            es: "La cuenta no corresponde al portal paciente.",
            en: "This account does not belong to the patient portal.",
            pt: "Esta conta nao pertence ao portal do paciente."
          })
        );
      }

      props.onLogin(
        {
          id: response.user.id,
          fullName: response.user.fullName,
          email: response.user.email
        },
        response.token
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo autenticar contra la API. Revisa que el backend este encendido.",
              en: "Could not authenticate against the API. Check that the backend is running.",
              pt: "Nao foi possivel autenticar na API. Verifique se o backend esta ativo."
            })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="visual-hero">
          <img
            src={heroImage}
            alt={t(props.language, {
              es: "Plataforma de terapia online",
              en: "Online therapy platform",
              pt: "Plataforma de terapia online"
            })}
            onError={handleHeroFallback}
          />
        </div>
        <span className="chip">
          {t(props.language, { es: "Plataforma de terapia online", en: "Online therapy platform", pt: "Plataforma de terapia online" })}
        </span>
        <h1>{t(props.language, { es: "Terapia online, simple y profesional", en: "Online therapy, simple and professional", pt: "Terapia online, simples e profissional" })}</h1>
        <p>
          {t(props.language, {
            es: "Registrate o ingresa para completar el intake clinico, ver el matching recomendado y reservar sesiones.",
            en: "Sign up or log in to complete the clinical intake, view recommended matching, and book sessions.",
            pt: "Cadastre-se ou entre para completar o intake clinico, ver o matching recomendado e reservar sessoes."
          })}
        </p>

        <div className="locale-controls auth">
          <label>
            {t(props.language, { es: "Idioma", en: "Language", pt: "Idioma" })}
            <select value={props.language} onChange={(event) => props.onLanguageChange(event.target.value as AppLanguage)}>
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language === "es" ? "Espanol" : language === "en" ? "English" : "Portugues"}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(props.language, { es: "Moneda", en: "Currency", pt: "Moeda" })}
            <select value={props.currency} onChange={(event) => props.onCurrencyChange(event.target.value as SupportedCurrency)}>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currencyOptionLabel(currency, props.language)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="auth-mode-switch">
          <button
            className={mode === "register" ? "active" : ""}
            type="button"
            onClick={() => setMode("register")}
          >
            {t(props.language, { es: "Registrarme", en: "Sign up", pt: "Cadastrar" })}
          </button>
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            {t(props.language, { es: "Ingresar", en: "Sign in", pt: "Entrar" })}
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label>
              {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
          ) : null}

          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            {t(props.language, { es: "Contrasena", en: "Password", pt: "Senha" })}
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary" type="submit" disabled={loading}>
            {loading
              ? t(props.language, { es: "Validando...", en: "Validating...", pt: "Validando..." })
              : mode === "register"
                ? t(props.language, { es: "Crear cuenta", en: "Create account", pt: "Criar conta" })
                : t(props.language, { es: "Entrar", en: "Sign in", pt: "Entrar" })}
          </button>
        </form>
      </section>
    </div>
  );
}

function IntakeScreen(props: {
  user: SessionUser;
  language: AppLanguage;
  onComplete: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const question of intakeQuestions) {
      seed[question.id] = "";
    }
    return seed;
  });

  const [error, setError] = useState("");
  const localizedQuestions = useMemo(
    () => intakeQuestions.map((question) => localizeIntakeQuestion(question, props.language)),
    [props.language]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const missing = intakeQuestions.filter((question) => !answers[question.id]?.trim());
    if (missing.length > 0) {
      setError(
        t(props.language, {
          es: "Completa las 10 preguntas para continuar.",
          en: "Complete all 10 questions to continue.",
          pt: "Complete as 10 perguntas para continuar."
        })
      );
      return;
    }

    setError("");
    props.onComplete(answers);
  };

  return (
    <div className="intake-shell">
      <section className="intake-card">
        <span className="chip">
          {t(props.language, { es: "Cuestionario inicial obligatorio", en: "Mandatory initial questionnaire", pt: "Questionario inicial obrigatorio" })}
        </span>
        <h1>
          {replaceTemplate(
            t(props.language, {
              es: "{name}, completemos tu intake clinico",
              en: "{name}, let us complete your clinical intake",
              pt: "{name}, vamos completar seu intake clinico"
            }),
            { name: props.user.fullName }
          )}
        </h1>
        <p>
          {t(props.language, {
            es: "Este paso es obligatorio antes del matching. Incluye screening de riesgo para detectar situaciones urgentes.",
            en: "This step is required before matching. It includes risk screening for urgent situations.",
            pt: "Este passo e obrigatorio antes do matching. Inclui triagem de risco para situacoes urgentes."
          })}
        </p>

        <form className="stack" onSubmit={handleSubmit}>
          {localizedQuestions.map((question) => (
            <article className="question-card" key={question.id}>
              <h3>{question.title}</h3>
              <p>{question.help}</p>

              {question.multiline ? (
                <textarea
                  rows={3}
                  value={answers[question.id]}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value
                    }))
                  }
                />
              ) : (
                <select
                  value={answers[question.id]}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value
                    }))
                  }
                >
                  <option value="">
                    {t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}
                  </option>
                  {question.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </article>
          ))}

          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary" type="submit">
            {t(props.language, {
              es: "Finalizar intake y ver profesionales recomendados",
              en: "Finish intake and view recommended professionals",
              pt: "Finalizar intake e ver profissionais recomendados"
            })}
          </button>
        </form>
      </section>
    </div>
  );
}

function SessionDetailModal(props: { booking: Booking; timezone: string; language: AppLanguage; onClose: () => void }) {
  const professional = findProfessionalById(props.booking.professionalId);
  const startsAt = new Date(props.booking.startsAt);
  const endsAt = new Date(props.booking.endsAt);
  const durationMinutes = Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / (1000 * 60)));

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [props.onClose]);

  return (
    <div className="session-modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        aria-label={t(props.language, {
          es: "Detalle de sesion",
          en: "Session details",
          pt: "Detalhes da sessao"
        })}
        aria-modal="true"
        className="session-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="session-modal-header">
          <div>
            <span className="chip">
              {t(props.language, { es: "Sesion confirmada", en: "Confirmed session", pt: "Sessao confirmada" })}
            </span>
            <h2>{t(props.language, { es: "Detalle de tu sesion", en: "Your session details", pt: "Detalhes da sua sessao" })}</h2>
          </div>
          <button type="button" onClick={props.onClose}>
            {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          </button>
        </header>

        <div className="session-modal-grid">
          <article className="session-modal-card">
            <h3>{professional.fullName}</h3>
            <p>{professional.title}</p>
            <p>
              <strong>{t(props.language, { es: "Tipo:", en: "Type:", pt: "Tipo:" })}</strong>{" "}
              {props.booking.bookingMode === "trial"
                ? t(props.language, { es: "Sesion de prueba", en: "Trial session", pt: "Sessao de teste" })
                : t(props.language, { es: "Sesion regular", en: "Regular session", pt: "Sessao regular" })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Enfoque:", en: "Approach:", pt: "Abordagem:" })}</strong> {professional.approach}
            </p>
          </article>

          <article className="session-modal-card">
            <p>
              <strong>{t(props.language, { es: "Fecha:", en: "Date:", pt: "Data:" })}</strong>{" "}
              {formatDateOnly({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Horario:", en: "Time:", pt: "Horario:" })}</strong>{" "}
              {formatDateTime({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Duracion:", en: "Duration:", pt: "Duracao:" })}</strong>{" "}
              {replaceTemplate(t(props.language, { es: "{m} minutos", en: "{m} minutes", pt: "{m} minutos" }), {
                m: durationMinutes
              })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Estado:", en: "Status:", pt: "Status:" })}</strong>{" "}
              {t(props.language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Reserva ID:", en: "Booking ID:", pt: "ID da reserva:" })}</strong> {props.booking.id}
            </p>
            <p>
              <strong>{t(props.language, { es: "Zona horaria:", en: "Time zone:", pt: "Fuso horario:" })}</strong> {props.timezone}
            </p>
          </article>
        </div>

        <section className="session-modal-footer">
          <a className="session-link" href={props.booking.joinUrl} rel="noreferrer" target="_blank">
            {t(props.language, {
              es: "Entrar a videollamada (simulada)",
              en: "Join video call (simulated)",
              pt: "Entrar na videochamada (simulada)"
            })}
          </a>
          <p>
            {t(props.language, {
              es: "Politica de cancelacion: puedes cancelar hasta 24 horas antes del inicio.",
              en: "Cancellation policy: you can cancel up to 24 hours before start.",
              pt: "Politica de cancelamento: voce pode cancelar ate 24 horas antes."
            })}
          </p>
          <p>
            {t(props.language, {
              es: "Tip: conecta 5 minutos antes para probar audio y camara.",
              en: "Tip: connect 5 minutes early to test audio and camera.",
              pt: "Dica: conecte 5 minutos antes para testar audio e camera."
            })}
          </p>
        </section>
      </section>
    </div>
  );
}

function DashboardPage(props: {
  state: PatientAppState;
  language: AppLanguage;
  currency: SupportedCurrency;
  onGoToBooking: (professionalId: string) => void;
  onGoToProfessional: (professionalId: string) => void;
  onGoToChat: (professionalId: string) => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onPlanTrialFromDashboard: (professionalId: string, slot: TimeSlot) => void;
  onCancelTrialFromDashboard: () => void;
  onStartPackagePurchase: (plan: PackagePlan) => void;
}) {
  const now = Date.now();
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [trialProfessionalId, setTrialProfessionalId] = useState(props.state.assignedProfessionalId ?? props.state.selectedProfessionalId);
  const [trialSlotId, setTrialSlotId] = useState("");
  const [landingPatientHeroImage, setLandingPatientHeroImage] = useState(DEFAULT_PATIENT_HERO_IMAGE);
  const nextBooking = getNextBooking(props.state.bookings);
  const confirmedBookings = props.state.bookings.filter((booking) => booking.status === "confirmed");
  const trialBookings = confirmedBookings.filter((booking) => booking.bookingMode === "trial");
  const activeTrialBooking = trialBookings
    .filter((booking) => new Date(booking.endsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;
  const hasTrialPlanned = trialBookings.some((booking) => new Date(booking.endsAt).getTime() >= now);
  const hasCompletedTrial = trialBookings.some((booking) => new Date(booking.endsAt).getTime() < now);
  const hasAssignedProfessional = Boolean(props.state.assignedProfessionalId);
  const trialStatus: "pending" | "reserved" | "completed" = hasCompletedTrial
    ? "completed"
    : hasTrialPlanned
      ? "reserved"
      : "pending";
  const nextConfirmedBooking = nextBooking ?? confirmedBookings[0] ?? null;
  const fallbackBooking = confirmedBookings[0] ?? null;
  const activeProfessionalBooking = nextBooking ?? fallbackBooking;
  const activeProfessional = activeProfessionalBooking
    ? findProfessionalById(activeProfessionalBooking.professionalId)
    : null;
  const activeTrialProfessional = activeTrialBooking ? findProfessionalById(activeTrialBooking.professionalId) : null;
  const activeTrialSlotId = activeTrialProfessional
    ? activeTrialProfessional.slots.find(
        (slot) => slot.startsAt === activeTrialBooking?.startsAt && slot.endsAt === activeTrialBooking?.endsAt
      )?.id ?? ""
    : "";
  const trialProfessional = findProfessionalById(trialProfessionalId);
  const availableTrialSlots = trialProfessional.slots.filter(
    (slot) => !props.state.bookedSlotIds.includes(slot.id) || slot.id === activeTrialSlotId
  );
  const selectedTrialSlot = availableTrialSlots.find((slot) => slot.id === trialSlotId) ?? null;

  const openTrialModal = () => {
    const initialProfessionalId = activeTrialBooking?.professionalId ?? props.state.assignedProfessionalId ?? props.state.selectedProfessionalId;
    setTrialProfessionalId(initialProfessionalId);
    setTrialSlotId(activeTrialSlotId);
    setTrialModalOpen(true);
  };

  useEffect(() => {
    setTrialProfessionalId(props.state.assignedProfessionalId ?? props.state.selectedProfessionalId);
  }, [props.state.assignedProfessionalId, props.state.selectedProfessionalId]);

  useEffect(() => {
    setTrialSlotId("");
  }, [trialProfessionalId]);

  useEffect(() => {
    if (!trialModalOpen) {
      return;
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setTrialModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [trialModalOpen]);

  useEffect(() => {
    let active = true;

    async function loadLandingImage() {
      try {
        const response = await fetch(`${API_BASE}/api/public/web-content`);
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          settings?: {
            patientDesktopImageUrl?: string | null;
            patientHeroImageUrl?: string | null;
          };
        };

        if (!active) {
          return;
        }

        const imageFromLanding = data.settings?.patientDesktopImageUrl ?? data.settings?.patientHeroImageUrl;
        if (imageFromLanding) {
          setLandingPatientHeroImage(imageFromLanding);
        }
      } catch {
        // keep default image if API is unavailable
      }
    }

    void loadLandingImage();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-stack">
      <section className="hero-composite">
        <div className="hero-media">
          <figure className="hero-photo-tile">
            <img
              src={landingPatientHeroImage}
              alt={t(props.language, {
                es: "Paciente en sesion virtual",
                en: "Patient in a virtual session",
                pt: "Paciente em sessao virtual"
              })}
              loading="lazy"
              onError={handleHeroFallback}
            />
            <figcaption className="hero-note-card">
              <p>
                {t(props.language, {
                  es: "La paz viene de adentro. No la busques afuera.",
                  en: "Peace comes from within. Do not seek it without.",
                  pt: "A paz vem de dentro. Nao a procure fora."
                })}
              </p>
            </figcaption>
          </figure>
        </div>
        <div className="hero-title-wrap">
          <span className="hero-eyebrow">{t(props.language, { es: "Portal pacientes", en: "Patient portal", pt: "Portal pacientes" })}</span>
          <h3>
            {t(props.language, {
              es: "Gestiona tus sesiones de psicologia en un solo lugar",
              en: "Manage your psychology sessions in one place",
              pt: "Gerencie suas sessoes de psicologia em um so lugar"
            })}
          </h3>
          <p>
            {t(props.language, {
              es: "Desde aqui puedes ver tu agenda, reservar nuevas sesiones y mantener continuidad terapeutica.",
              en: "From here you can view your schedule, book new sessions, and keep therapeutic continuity.",
              pt: "Daqui voce pode ver sua agenda, reservar novas sessoes e manter continuidade terapeutica."
            })}
          </p>
        </div>
      </section>

      <section className="content-card trial-priority-banner trial-priority-inline">
        <h2>
          <span className="trial-inline-icon" aria-hidden="true" />
          {trialStatus === "pending"
            ? t(props.language, { es: "Sesion de prueba pendiente", en: "Pending trial session", pt: "Sessao de teste pendente" })
            : trialStatus === "reserved"
              ? t(props.language, { es: "Sesion de prueba planificada", en: "Trial session scheduled", pt: "Sessao de teste agendada" })
              : t(props.language, { es: "Sesion de prueba completada", en: "Trial session completed", pt: "Sessao de teste concluida" })}
        </h2>
        <button className="trial-inline-action" type="button" onClick={openTrialModal}>
          {hasTrialPlanned
            ? t(props.language, { es: "Modificar", en: "Modify", pt: "Modificar" })
            : t(props.language, { es: "Planificar", en: "Plan", pt: "Planejar" })}
        </button>
      </section>

      <section className="hero-grid">
        <article className="hero-card sessions-combined-card">
          <button
            className="sessions-combined-section sessions-combined-action"
            type="button"
            onClick={() => {
              if (nextConfirmedBooking) {
                props.onOpenBookingDetail(nextConfirmedBooking.id);
                return;
              }
              props.onGoToBooking(props.state.selectedProfessionalId);
            }}
          >
            <span className="label">{t(props.language, { es: "Sesiones confirmadas", en: "Confirmed sessions", pt: "Sessoes confirmadas" })}</span>
            <strong>{props.state.bookings.filter((booking) => booking.status === "confirmed").length}</strong>
            <p>
              {nextBooking
                ? `${t(props.language, { es: "Proxima", en: "Next", pt: "Proxima" })}: ${formatDateTime({
                    isoDate: nextBooking.startsAt,
                    timezone: props.state.profile.timezone,
                    language: props.language
                  })}`
                : t(props.language, {
                    es: "Todavia no tenes sesiones reservadas",
                    en: "You do not have any booked sessions yet",
                    pt: "Voce ainda nao tem sessoes reservadas"
                  })}
            </p>
            <span className="hero-inline-link">
              {nextConfirmedBooking
                ? t(props.language, { es: "Ver detalle", en: "View details", pt: "Ver detalhes" })
                : t(props.language, { es: "Sin sesiones confirmadas", en: "No confirmed sessions", pt: "Sem sessoes confirmadas" })}
            </span>
          </button>

          <button
            className="sessions-combined-section sessions-combined-action"
            type="button"
            onClick={() => props.onGoToBooking(props.state.selectedProfessionalId)}
          >
            <span className="label sessions-available-label">
              <span className="sessions-available-icon" aria-hidden="true">◌</span>
              {t(props.language, { es: "Sesiones disponibles", en: "Available sessions", pt: "Sessoes disponiveis" })}
            </span>
            <strong>{props.state.subscription.creditsRemaining}</strong>
            <p>
              {localizedPackageName(
                props.state.subscription.packageId,
                props.state.subscription.packageName,
                props.language
              )}
            </p>
            <span className="hero-inline-link hero-inline-link-primary">
              {t(props.language, { es: "Ir a sesiones", en: "Go to sessions", pt: "Ir para sessoes" })}
            </span>
          </button>
        </article>

        <button
          className="hero-card hero-card-button active-professional-card"
          disabled={!activeProfessional}
          type="button"
          onClick={() => {
            if (activeProfessional) {
              props.onGoToProfessional(activeProfessional.id);
            }
          }}
        >
          <span className="label">{t(props.language, { es: "Profesional activo", en: "Active professional", pt: "Profissional ativo" })}</span>
          {activeProfessional && activeProfessionalBooking ? (
            <>
              <div className="active-professional-row">
                <img
                  className="active-professional-avatar"
                  src={professionalImageMap[activeProfessional.id]}
                  alt={activeProfessional.fullName}
                  onError={handleImageFallback}
                />
                <div>
                  <h3>{activeProfessional.fullName}</h3>
                  <p>{activeProfessional.title}</p>
                </div>
              </div>
              <p>
                {replaceTemplate(
                  t(props.language, {
                    es: "{compat}% compatibilidad · {years} anos de experiencia",
                    en: "{compat}% match · {years} years of experience",
                    pt: "{compat}% compatibilidade · {years} anos de experiencia"
                  }),
                  { compat: activeProfessional.compatibility, years: activeProfessional.yearsExperience }
                )}
              </p>
              <button
                className="chat-gradient-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onGoToChat(activeProfessional.id);
                }}
              >
                {t(props.language, { es: "Abrir chat con profesional", en: "Open chat with professional", pt: "Abrir chat com profissional" })}
              </button>
            </>
          ) : (
            <p>
              {t(props.language, {
                es: "Reserva tu primera sesion para ver aqui los datos de tu profesional.",
                en: "Book your first session to see your professional details here.",
                pt: "Reserve sua primeira sessao para ver aqui os dados do profissional."
              })}
            </p>
          )}
        </button>

      </section>

      <section className="content-card purchase-section">
        <header className="purchase-head">
          <h3>{t(props.language, { es: "Planes para continuar tu proceso", en: "Plans to continue your process", pt: "Planos para continuar seu processo" })}</h3>
          <p>{t(props.language, { es: "Elige el paquete que mejor se adapte a tu ritmo terapeutico.", en: "Choose the package that best fits your therapeutic rhythm.", pt: "Escolha o pacote que melhor se adapta ao seu ritmo terapeutico." })}</p>
        </header>
        <figure className="purchase-art" aria-hidden="true">
          <img
            src="/images/miro-constellation.svg"
            alt=""
            loading="lazy"
          />
          <figcaption>Arte moderno · Inspirado en Miro</figcaption>
        </figure>
        <div className="deal-grid">
          {packagePlans.map((plan) => (
            <article className={`deal-card dashboard-deal-card ${plan.id === "growth" ? "featured" : ""}`} key={plan.id}>
              {plan.id === "growth" ? <span className="deal-most-sold">{t(props.language, { es: "Mas vendido", en: "Best seller", pt: "Mais vendido" })}</span> : null}
              <h3>{localizedPackageName(plan.id, plan.name, props.language)}</h3>
              <p>{localizedPackageDescription(plan.id, plan.description, props.language)}</p>
              <div className="deal-pricing-top">
                <span className="deal-list-price">
                  {formatMoney(Math.round(plan.priceUsd / (1 - plan.discountPercent / 100)), props.language, props.currency)}
                </span>
                <span className="deal-discount-badge">{plan.discountPercent}% OFF</span>
              </div>
              <p className="deal-main-price">
                {formatMoney(plan.priceUsd, props.language, props.currency)}
                <span className="deal-price-suffix">{t(props.language, { es: "/mes", en: "/mo", pt: "/mes" })}</span>
              </p>
              <p className="deal-free-months">{t(props.language, { es: "+2 mes(es) gratis", en: "+2 months free", pt: "+2 mes(es) gratis" })}</p>
              <p className="deal-offer-bar">{t(props.language, { es: "Oferta por tiempo limitado", en: "Limited-time offer", pt: "Oferta por tempo limitado" })}</p>
              <button
                className={`deal-select-button ${plan.id === "growth" ? "featured" : ""}`}
                type="button"
                onClick={() => props.onStartPackagePurchase(plan)}
              >
                {t(props.language, { es: "Elegir plan", en: "Choose plan", pt: "Escolher plano" })}
              </button>
              <p className="deal-caption">
                {replaceTemplate(
                  t(props.language, {
                    es: "Incluye {count} sesiones para este ciclo.",
                    en: "Includes {count} sessions for this cycle.",
                    pt: "Inclui {count} sessoes para este ciclo."
                  }),
                  { count: String(plan.credits) }
                )}
              </p>
            </article>
          ))}
        </div>
      </section>

      {trialModalOpen ? (
        <div className="session-modal-backdrop" role="presentation" onClick={() => setTrialModalOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            className="session-modal trial-plan-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="session-modal-header">
              <h2>{t(props.language, { es: "Planificar sesion de prueba", en: "Plan trial session", pt: "Planejar sessao de teste" })}</h2>
            </header>

            <div className="booking-inline-fields">
              <label>
                {t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}
                <select
                  value={trialProfessionalId}
                  onChange={(event) => setTrialProfessionalId(event.target.value)}
                >
                  {professionalsCatalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullName} - {item.compatibility}%
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t(props.language, { es: "Slot disponible", en: "Available slot", pt: "Horario disponivel" })}
                <select value={trialSlotId} onChange={(event) => setTrialSlotId(event.target.value)}>
                  <option value="">
                    {availableTrialSlots.length === 0
                      ? t(props.language, {
                          es: "Sin slots esta semana",
                          en: "No slots this week",
                          pt: "Sem horarios esta semana"
                        })
                      : t(props.language, {
                          es: "Selecciona un horario",
                          en: "Select a time",
                          pt: "Selecione um horario"
                        })}
                  </option>
                  {availableTrialSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatDateOnly({ isoDate: slot.startsAt, timezone: props.state.profile.timezone, language: props.language })} ·{" "}
                      {formatDateTime({ isoDate: slot.startsAt, timezone: props.state.profile.timezone, language: props.language })}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="booking-confirm-row">
              <p>
                {t(props.language, {
                  es: "Confirmaras una sesion de prueba y quedara asignado ese profesional.",
                  en: "You will confirm a trial session and that professional will be assigned.",
                  pt: "Voce confirmara uma sessao de teste e esse profissional ficara atribuido."
                })}
              </p>
              <div className="button-row">
                {hasTrialPlanned ? (
                  <button
                    type="button"
                    onClick={() => {
                      props.onCancelTrialFromDashboard();
                      setTrialModalOpen(false);
                    }}
                  >
                    {t(props.language, { es: "Dar de baja", en: "Cancel trial", pt: "Cancelar sessao" })}
                  </button>
                ) : null}
                <button
                  className="primary"
                  type="button"
                  disabled={!selectedTrialSlot}
                  onClick={() => {
                    if (!selectedTrialSlot) {
                      return;
                    }
                    props.onPlanTrialFromDashboard(trialProfessionalId, selectedTrialSlot);
                    setTrialModalOpen(false);
                  }}
                >
                  {hasTrialPlanned
                    ? t(props.language, { es: "Guardar cambios", en: "Save changes", pt: "Salvar alteracoes" })
                    : t(props.language, { es: "Confirmar", en: "Confirm", pt: "Confirmar" })}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function MatchingPage(props: {
  language: AppLanguage;
  selectedProfessionalId: string;
  onSelectProfessional: (professionalId: string) => void;
  onReserve: (professionalId: string) => void;
  onChat: (professionalId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");

  const specialties = useMemo(() => {
    const set = new Set<string>();
    professionalsCatalog.forEach((professional) => {
      professional.specialties.forEach((value) => set.add(value));
    });
    return ["all", ...Array.from(set)];
  }, []);

  const languages = useMemo(() => {
    const set = new Set<string>();
    professionalsCatalog.forEach((professional) => {
      professional.languages.forEach((value) => set.add(value));
    });
    return ["all", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    return [...professionalsCatalog]
      .filter((professional) => {
        const matchesSearch =
          search.trim().length === 0
          || professional.fullName.toLowerCase().includes(search.toLowerCase())
          || professional.specialties.some((item) => item.toLowerCase().includes(search.toLowerCase()));

        const matchesSpecialty = specialtyFilter === "all" || professional.specialties.includes(specialtyFilter);
        const matchesLanguage = languageFilter === "all" || professional.languages.includes(languageFilter);

        return matchesSearch && matchesSpecialty && matchesLanguage;
      })
      .sort((a, b) => b.compatibility - a.compatibility);
  }, [languageFilter, search, specialtyFilter]);

  return (
    <div className="page-stack">
      <section className="content-card">
        <h2>{t(props.language, { es: "Matching y profesionales recomendados", en: "Matching and recommended professionals", pt: "Matching e profissionais recomendados" })}</h2>
        <p>
          {t(props.language, {
            es: "Los perfiles se ordenan por compatibilidad segun tu intake y preferencias.",
            en: "Profiles are sorted by compatibility based on your intake and preferences.",
            pt: "Os perfis sao ordenados por compatibilidade com base no seu intake e preferencias."
          })}
        </p>

        <div className="filters">
          <input
            placeholder={t(props.language, {
              es: "Buscar por nombre o especialidad",
              en: "Search by name or specialty",
              pt: "Buscar por nome ou especialidade"
            })}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select value={specialtyFilter} onChange={(event) => setSpecialtyFilter(event.target.value)}>
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty === "all"
                  ? t(props.language, { es: "Todas las especialidades", en: "All specialties", pt: "Todas as especialidades" })
                  : specialty}
              </option>
            ))}
          </select>

          <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
            {languages.map((language) => (
              <option key={language} value={language}>
                {language === "all"
                  ? t(props.language, { es: "Todos los idiomas", en: "All languages", pt: "Todos os idiomas" })
                  : language}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="card-grid">
        {filtered.map((professional) => {
          const isSelected = professional.id === props.selectedProfessionalId;

          return (
            <article className={`professional-card ${isSelected ? "selected" : ""}`} key={professional.id}>
              <img
                className="thumb"
                src={professionalImageMap[professional.id]}
                alt={replaceTemplate(
                  t(props.language, {
                    es: "Perfil de {name}",
                    en: "{name} profile",
                    pt: "Perfil de {name}"
                  }),
                  { name: professional.fullName }
                )}
                onError={handleImageFallback}
              />
              <header>
                <h3>{professional.fullName}</h3>
                <span>{professional.title}</span>
              </header>

              <p>{professional.bio}</p>

              <ul className="tag-list">
                {professional.specialties.map((specialty) => (
                  <li key={specialty}>{specialty}</li>
                ))}
              </ul>

              <div className="metric-row">
                <span>
                  {replaceTemplate(t(props.language, { es: "{value}% compatibilidad", en: "{value}% compatibility", pt: "{value}% compatibilidade" }), {
                    value: String(professional.compatibility)
                  })}
                </span>
                <span>
                  {replaceTemplate(t(props.language, { es: "{value} valoracion", en: "{value} rating", pt: "{value} avaliacao" }), {
                    value: professional.rating.toFixed(1)
                  })}
                </span>
                <span>
                  {replaceTemplate(t(props.language, { es: "{value} anos exp.", en: "{value} years exp.", pt: "{value} anos exp." }), {
                    value: String(professional.yearsExperience)
                  })}
                </span>
              </div>

              <div className="profile-preview">
                <p>
                  <strong>{t(props.language, { es: "Enfoque:", en: "Approach:", pt: "Abordagem:" })}</strong> {professional.approach}
                </p>
                <p>
                  <strong>{t(props.language, { es: "Video presentacion:", en: "Intro video:", pt: "Video de apresentacao:" })}</strong> {professional.introVideoUrl}
                </p>
                <p>
                  <strong>{t(props.language, { es: "Pacientes activos:", en: "Active patients:", pt: "Pacientes ativos:" })}</strong> {professional.activePatients}
                </p>
              </div>

              <div className="button-row">
                <button type="button" onClick={() => props.onSelectProfessional(professional.id)}>
                  {isSelected
                    ? t(props.language, { es: "Perfil seleccionado", en: "Selected profile", pt: "Perfil selecionado" })
                    : t(props.language, { es: "Seleccionar perfil", en: "Select profile", pt: "Selecionar perfil" })}
                </button>
                <button type="button" onClick={() => props.onReserve(professional.id)}>
                  {t(props.language, { es: "Reservar", en: "Book", pt: "Reservar" })}
                </button>
                <button type="button" onClick={() => props.onChat(professional.id)}>
                  {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
function BookingPage(props: {
  state: PatientAppState;
  language: AppLanguage;
  currency: SupportedCurrency;
  onSelectProfessional: (professionalId: string) => void;
  onAddPackage: (plan: PackagePlan, source: PackagePurchaseSource) => void;
  onConfirmBooking: (professionalId: string, slot: TimeSlot, useTrialSession: boolean) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<PackageId>("growth");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const purchaseFlow = searchParams.get("flow");
  const planFromQuery = searchParams.get("plan");

  const assignedProfessionalId = props.state.assignedProfessionalId;
  const canChangeProfessionalForNewPackage = !assignedProfessionalId || props.state.subscription.creditsRemaining <= 0;
  const effectiveProfessionalId = canChangeProfessionalForNewPackage
    ? props.state.selectedProfessionalId
    : assignedProfessionalId ?? props.state.selectedProfessionalId;
  const professional = findProfessionalById(effectiveProfessionalId);
  const availableSlots = professional.slots.filter((slot) => !props.state.bookedSlotIds.includes(slot.id));
  const selectedSlot = availableSlots.find((slot) => slot.id === selectedSlotId) ?? null;
  const now = Date.now();

  const upcomingRegularBookings = props.state.bookings
    .filter(
      (booking) =>
        booking.status === "confirmed" &&
        booking.bookingMode !== "trial" &&
        new Date(booking.startsAt).getTime() > now
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const historyRegularBookings = props.state.bookings
    .filter(
      (booking) =>
        booking.bookingMode !== "trial" &&
        (booking.status !== "confirmed" || new Date(booking.startsAt).getTime() <= now)
    )
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const pendingSessions = props.state.subscription.creditsRemaining;
  const canConfirmBooking = Boolean(selectedSlot) && pendingSessions > 0;
  const activePackageLabel = localizedPackageName(
    props.state.subscription.packageId,
    props.state.subscription.packageName,
    props.language
  );

  useEffect(() => {
    setPurchaseMessage("");
    setShowBookingForm(false);
  }, [professional.id]);

  useEffect(() => {
    const validPlanFromQuery =
      planFromQuery === "starter" || planFromQuery === "growth" || planFromQuery === "intensive"
        ? (planFromQuery as PackageId)
        : null;

    if (validPlanFromQuery) {
      setSelectedPlanId(validPlanFromQuery);
    }

    if (purchaseFlow === "checkout") {
      setShowBookingForm(true);
      const element = document.getElementById("purchase-flow");
      if (element) {
        window.requestAnimationFrame(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("flow");
      setSearchParams(nextParams, { replace: true });
    }
  }, [planFromQuery, purchaseFlow, searchParams, setSearchParams]);

  const handlePurchase = () => {
    const plan = packagePlans.find((item) => item.id === selectedPlanId);
    if (!plan) {
      return;
    }

    props.onAddPackage(plan, "checkout_button");
    setPurchaseMessage(
      replaceTemplate(
        t(props.language, {
          es: "Pago acreditado: {plan}.",
          en: "Payment approved: {plan}.",
          pt: "Pagamento creditado: {plan}."
        }),
        {
          plan: localizedPackageName(plan.id, plan.name, props.language)
        }
      )
    );
  };

  const handleBooking = () => {
    if (!selectedSlot || !canConfirmBooking) {
      return;
    }

    props.onConfirmBooking(professional.id, selectedSlot, false);
    setSelectedSlotId("");
  };

  if (props.state.intake?.riskBlocked) {
    return (
      <section className="content-card danger">
        <h2>
          {t(props.language, {
            es: "Reserva deshabilitada por screening de seguridad",
            en: "Booking disabled by safety screening",
            pt: "Reserva desabilitada por triagem de seguranca"
          })}
        </h2>
        <p>
          {t(props.language, {
            es: "El intake detecto un posible riesgo urgente. Por seguridad, la agenda queda bloqueada hasta triage manual.",
            en: "The intake detected possible urgent risk. For safety, booking stays blocked until manual triage.",
            pt: "O intake detectou possivel risco urgente. Por seguranca, a agenda fica bloqueada ate triagem manual."
          })}
        </p>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="content-card booking-session-card booking-card-minimal">
        <h2>{t(props.language, { es: "Sesiones reservadas", en: "Booked sessions", pt: "Sessoes reservadas" })}</h2>
        {upcomingRegularBookings.length === 0 ? (
          <p>
            {t(props.language, {
              es: "No tienes sesiones reservadas por ahora.",
              en: "You do not have any sessions booked right now.",
              pt: "Voce nao tem sessoes reservadas no momento."
            })}
          </p>
        ) : (
          <ul className="simple-list session-history-list">
            {upcomingRegularBookings.map((booking) => {
              const bookingProfessional = findProfessionalById(booking.professionalId);
              return (
                <li key={booking.id}>
                  <div>
                    <strong>{formatDateTime({ isoDate: booking.startsAt, timezone: props.state.profile.timezone, language: props.language })}</strong>
                    <span>{bookingProfessional.fullName}</span>
                  </div>
                  <a className="session-link" href={booking.joinUrl} target="_blank" rel="noreferrer">
                    {t(props.language, { es: "Entrar", en: "Join", pt: "Entrar" })}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="content-card booking-session-card booking-card-minimal" id="purchase-flow">
        <h2>{t(props.language, { es: "Sesiones disponibles", en: "Available sessions", pt: "Sessoes disponiveis" })}</h2>
        <div className="sessions-summary-grid">
          <article className="session-summary-item">
            <span>{t(props.language, { es: "Disponibles", en: "Available", pt: "Disponiveis" })}</span>
            <strong>{pendingSessions}</strong>
          </article>
          <article className="session-summary-item">
            <span>{t(props.language, { es: "Paquete", en: "Package", pt: "Pacote" })}</span>
            <strong className="session-summary-compact">{activePackageLabel}</strong>
          </article>
        </div>

        <div className="sessions-booking-action">
          <button className="primary" type="button" onClick={() => setShowBookingForm((current) => !current)}>
            {showBookingForm
              ? t(props.language, { es: "Ocultar reserva", en: "Hide booking", pt: "Ocultar reserva" })
              : t(props.language, { es: "Reservar sesion", en: "Book session", pt: "Reservar sessao" })}
          </button>
          <p>
            {!canChangeProfessionalForNewPackage
              ? t(props.language, {
                  es: "Tu profesional esta definido por el paquete activo.",
                  en: "Your professional is defined by your active package.",
                  pt: "Seu profissional esta definido pelo pacote ativo."
                })
              : t(props.language, {
                  es: "Selecciona profesional y horario para confirmar.",
                  en: "Select professional and time to confirm.",
                  pt: "Selecione profissional e horario para confirmar."
                })}
          </p>
        </div>

        {showBookingForm ? (
          <>
            <p>
              {t(props.language, { es: "Huso horario de visualizacion:", en: "Display time zone:", pt: "Fuso horario de visualizacao:" })}{" "}
              <strong>{props.state.profile.timezone}</strong>
            </p>

            <div className="booking-inline-fields">
              {!canChangeProfessionalForNewPackage ? (
                <label className="booking-readonly-field">
                  <span>{t(props.language, { es: "Profesional asignado", en: "Assigned professional", pt: "Profissional atribuido" })}</span>
                  <strong>{professional.fullName}</strong>
                  <small>{professional.title}</small>
                </label>
              ) : (
                <label>
                  {t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}
                  <select
                    value={professional.id}
                    onChange={(event) => {
                      props.onSelectProfessional(event.target.value);
                      setSelectedSlotId("");
                    }}
                  >
                    {professionalsCatalog.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.fullName} - {item.compatibility}%
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                {t(props.language, { es: "Slot disponible", en: "Available slot", pt: "Horario disponivel" })}
                <select value={selectedSlotId} onChange={(event) => setSelectedSlotId(event.target.value)}>
                  <option value="">
                    {availableSlots.length === 0
                      ? t(props.language, {
                          es: "Sin slots esta semana",
                          en: "No slots this week",
                          pt: "Sem horarios esta semana"
                        })
                      : t(props.language, {
                          es: "Selecciona un horario",
                          en: "Select a time",
                          pt: "Selecione um horario"
                        })}
                  </option>
                  {availableSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatDateOnly({ isoDate: slot.startsAt, timezone: props.state.profile.timezone, language: props.language })} ·{" "}
                      {formatDateTime({ isoDate: slot.startsAt, timezone: props.state.profile.timezone, language: props.language })}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="booking-confirm-row">
              <p>
                {t(props.language, {
                  es: "Confirmaras una sesion regular con consumo de sesiones disponibles.",
                  en: "You will confirm a regular session using available sessions.",
                  pt: "Voce confirmara uma sessao regular com consumo de sessoes disponiveis."
                })}
              </p>
              <button className="primary" disabled={!canConfirmBooking} type="button" onClick={handleBooking}>
                {t(props.language, { es: "Confirmar sesion", en: "Confirm session", pt: "Confirmar sessao" })}
              </button>
            </div>
          </>
        ) : null}

        <div className="booking-payment-layout">
          <article className="session-payment-card hostinger-payment-card">
            <div className="payment-summary-stack">
              <p>
                {t(props.language, { es: "Paquete actual:", en: "Current package:", pt: "Pacote atual:" })} <strong>{activePackageLabel}</strong>
              </p>
              <p>
                {t(props.language, { es: "Sesiones disponibles:", en: "Available sessions:", pt: "Sessoes disponiveis:" })} <strong>{props.state.subscription.creditsRemaining}</strong>
              </p>
            </div>

            <div className="deal-hostinger-wrap">
              <p>
                {t(props.language, {
                  es: "Puedes comprar mas sesiones en cualquier momento.",
                  en: "You can buy more sessions at any time.",
                  pt: "Voce pode comprar mais sessoes a qualquer momento."
                })}
              </p>

              <div className="deal-grid">
                {packagePlans.map((plan) => (
                  <label className={`deal-card dashboard-deal-card ${selectedPlanId === plan.id ? "selected" : ""}`} key={plan.id}>
                    <input
                      checked={selectedPlanId === plan.id}
                      type="radio"
                      name="package"
                      value={plan.id}
                      onChange={() => setSelectedPlanId(plan.id)}
                    />
                    <h3>{localizedPackageName(plan.id, plan.name, props.language)}</h3>
                    <p>{localizedPackageDescription(plan.id, plan.description, props.language)}</p>
                    <div className="deal-pricing-top">
                      <span className="deal-list-price">
                        {formatMoney(Math.round(plan.priceUsd / (1 - plan.discountPercent / 100)), props.language, props.currency)}
                      </span>
                      <span className="deal-discount-badge">{plan.discountPercent}% OFF</span>
                    </div>
                    <p className="deal-from">{t(props.language, { es: "Desde", en: "From", pt: "Desde" })}</p>
                    <p className="deal-main-price">{formatMoney(plan.priceUsd, props.language, props.currency)}</p>
                    <p className="deal-caption">
                      {replaceTemplate(
                        t(props.language, {
                          es: "{count} sesiones incluidas.",
                          en: "{count} sessions included.",
                          pt: "{count} sessoes incluidas."
                        }),
                        { count: String(plan.credits) }
                      )}
                    </p>
                    <span className="deal-cta">
                      {selectedPlanId === plan.id
                        ? t(props.language, { es: "Paquete seleccionado", en: "Selected package", pt: "Pacote selecionado" })
                        : t(props.language, { es: "Seleccionar paquete", en: "Select package", pt: "Selecionar pacote" })}
                    </span>
                  </label>
                ))}
              </div>

              <button className="primary stripe-payment-button" type="button" onClick={handlePurchase}>
                {t(props.language, { es: "Pagar con Stripe", en: "Pay with Stripe", pt: "Pagar com Stripe" })}
              </button>
            </div>
            {purchaseMessage ? <p className="success-text">{purchaseMessage}</p> : null}
          </article>
        </div>
      </section>

      <section className="content-card booking-session-card booking-card-minimal">
        <h2>{t(props.language, { es: "Historial de sesiones", en: "Session history", pt: "Historico de sessoes" })}</h2>
        {historyRegularBookings.length === 0 ? (
          <p>
            {t(props.language, {
              es: "Todavia no tienes historial de sesiones.",
              en: "You do not have session history yet.",
              pt: "Voce ainda nao tem historico de sessoes."
            })}
          </p>
        ) : (
          <ul className="simple-list session-history-list">
            {historyRegularBookings.slice(0, 10).map((booking) => {
              const bookingProfessional = findProfessionalById(booking.professionalId);
              const statusLabel =
                booking.status === "cancelled"
                  ? t(props.language, { es: "Cancelada", en: "Cancelled", pt: "Cancelada" })
                  : t(props.language, { es: "Completada", en: "Completed", pt: "Concluida" });
              return (
                <li key={booking.id}>
                  <div>
                    <strong>{formatDateTime({ isoDate: booking.startsAt, timezone: props.state.profile.timezone, language: props.language })}</strong>
                    <span>{bookingProfessional.fullName}</span>
                  </div>
                  <span className={`session-status-pill ${booking.status}`}>{statusLabel}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
function ChatPage(props: {
  state: PatientAppState;
  language: AppLanguage;
  authToken: string | null;
  sessionUserId: string;
  onSetActiveProfessional: (professionalId: string) => void;
  onSendMessage: (professionalId: string, text: string) => void;
  onMarkRead: (professionalId: string) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState("");
  const [apiThreads, setApiThreads] = useState<ApiChatThread[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiChatMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [apiError, setApiError] = useState("");
  const [pendingUnreadFocus, setPendingUnreadFocus] = useState(searchParams.get("focus") === "first-unread");

  const remoteMode = Boolean(props.authToken);

  const threadProfessional = findProfessionalById(props.state.activeChatProfessionalId);
  const threadMessages = props.state.messages
    .filter((message) => message.professionalId === threadProfessional.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const apiThreadByProfessional = useMemo(() => {
    const map = new Map<string, ApiChatThread>();
    for (const thread of apiThreads) {
      map.set(thread.professionalId, thread);
    }
    return map;
  }, [apiThreads]);

  useEffect(() => {
    if (searchParams.get("focus") === "first-unread") {
      setPendingUnreadFocus(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (remoteMode) {
      return;
    }

    const unread = getUnreadCount(props.state.messages, threadProfessional.id);
    if (unread > 0) {
      if (pendingUnreadFocus) {
        const timer = window.setTimeout(() => {
          props.onMarkRead(threadProfessional.id);
        }, 650);
        return () => {
          window.clearTimeout(timer);
        };
      }
      props.onMarkRead(threadProfessional.id);
    }
  }, [remoteMode, threadProfessional.id, props.onMarkRead, props.state.messages, pendingUnreadFocus]);

  const loadThreads = async () => {
    if (!props.authToken) {
      return;
    }

    try {
      const response = await apiRequest<{ threads: ApiChatThread[] }>(
        "/api/chat/threads",
        {},
        props.authToken ?? undefined
      );
      setApiThreads(response.threads);
      setApiError("");
    } catch (requestError) {
      setApiError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo cargar el chat.",
              en: "Could not load chat.",
              pt: "Nao foi possivel carregar o chat."
            })
      );
    }
  };

  const loadMessages = async (threadId: string) => {
    if (!props.authToken) {
      return;
    }

    try {
      const response = await apiRequest<{ messages: ApiChatMessage[] }>(
        `/api/chat/threads/${threadId}/messages`,
        {},
        props.authToken ?? undefined
      );
      setApiMessages(response.messages);
      setApiError("");
    } catch (requestError) {
      setApiError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudieron cargar mensajes.",
              en: "Could not load messages.",
              pt: "Nao foi possivel carregar mensagens."
            })
      );
    }
  };

  const ensureThreadForProfessional = async (professionalId: string): Promise<string | null> => {
    if (!props.authToken) {
      return null;
    }

    try {
      const response = await apiRequest<{ threadId: string }>(
        `/api/chat/threads/by-professional/${professionalId}`,
        { method: "POST" },
        props.authToken ?? undefined
      );
      setActiveThreadId(response.threadId);
      return response.threadId;
    } catch (requestError) {
      setApiError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo abrir la conversacion.",
              en: "Could not open conversation.",
              pt: "Nao foi possivel abrir a conversa."
            })
      );
      return null;
    }
  };

  useEffect(() => {
    if (!remoteMode || !props.authToken) {
      return;
    }

    loadThreads();
    const timer = window.setInterval(() => {
      loadThreads();
    }, 3500);

    return () => {
      window.clearInterval(timer);
    };
  }, [remoteMode, props.authToken]);

  useEffect(() => {
    if (!remoteMode || !props.authToken) {
      return;
    }

    let active = true;

    const run = async () => {
      const threadId = await ensureThreadForProfessional(props.state.activeChatProfessionalId);
      if (!threadId || !active) {
        return;
      }

      await loadMessages(threadId);
      await apiRequest<{ markedAsRead: number }>(
        `/api/chat/threads/${threadId}/read`,
        { method: "POST" },
        props.authToken ?? undefined
      ).catch(() => undefined);
    };

    run();

    return () => {
      active = false;
    };
  }, [remoteMode, props.authToken, props.state.activeChatProfessionalId]);

  useEffect(() => {
    if (!remoteMode || !props.authToken || !activeThreadId) {
      return;
    }

    const timer = window.setInterval(() => {
      loadMessages(activeThreadId);
    }, 2500);

    return () => {
      window.clearInterval(timer);
    };
  }, [remoteMode, props.authToken, activeThreadId]);

  const handleSelectProfessional = async (professionalId: string) => {
    props.onSetActiveProfessional(professionalId);

    if (!remoteMode || !props.authToken) {
      return;
    }

    const threadId = await ensureThreadForProfessional(professionalId);
    if (threadId) {
      await loadMessages(threadId);
      await loadThreads();
    }
  };

  const handleSend = async () => {
    if (!draft.trim()) {
      return;
    }

    if (remoteMode && props.authToken) {
      const threadId = activeThreadId || (await ensureThreadForProfessional(threadProfessional.id));
      if (!threadId) {
        return;
      }

      try {
        await apiRequest(
          `/api/chat/threads/${threadId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ body: draft.trim() })
          },
          props.authToken ?? undefined
        );
        setDraft("");
        await loadMessages(threadId);
        await loadThreads();
      } catch (requestError) {
        setApiError(
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "No se pudo enviar el mensaje.",
                en: "Could not send message.",
                pt: "Nao foi possivel enviar a mensagem."
              })
        );
      }
      return;
    }

    props.onSendMessage(threadProfessional.id, draft.trim());
    setDraft("");
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (!pendingUnreadFocus) {
      return;
    }

    const firstUnreadMessageId = remoteMode
      ? apiMessages.find((message) => message.senderUserId !== props.sessionUserId && !message.readAt)?.id ?? null
      : threadMessages.find((message) => message.sender === "professional" && !message.read)?.id ?? null;

    if (firstUnreadMessageId) {
      const messageElement = document.getElementById(`chat-msg-${firstUnreadMessageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      setPendingUnreadFocus(false);
      setSearchParams({}, { replace: true });
      return;
    }

    if (!remoteMode || apiMessages.length > 0) {
      setPendingUnreadFocus(false);
      setSearchParams({}, { replace: true });
    }
  }, [
    pendingUnreadFocus,
    remoteMode,
    apiMessages,
    threadMessages,
    props.sessionUserId,
    setSearchParams
  ]);

  return (
    <div className="wa-shell">
      <aside className="wa-sidebar">
        <header className="wa-sidebar-header">
          <h2>{t(props.language, { es: "Mensajes", en: "Messages", pt: "Mensagens" })}</h2>
        </header>

        <div className="wa-thread-list">
          {professionalsCatalog.map((professional) => {
            const remoteThread = apiThreadByProfessional.get(professional.id);
            const unread = remoteMode ? remoteThread?.unreadCount ?? 0 : getUnreadCount(props.state.messages, professional.id);
            const lastMessageText = remoteMode
              ? remoteThread?.lastMessage?.body
                ?? t(props.language, { es: "Todavia no hay mensajes", en: "No messages yet", pt: "Ainda nao ha mensagens" })
              : props.state.messages
                  .filter((message) => message.professionalId === professional.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.text
                ?? t(props.language, { es: "Todavia no hay mensajes", en: "No messages yet", pt: "Ainda nao ha mensagens" });

            return (
              <button
                className={professional.id === threadProfessional.id ? "wa-thread-item active" : "wa-thread-item"}
                key={professional.id}
                type="button"
                onClick={() => {
                  void handleSelectProfessional(professional.id);
                }}
              >
                <img
                  src={professionalImageMap[professional.id]}
                  alt={professional.fullName}
                  onError={handleImageFallback}
                />
                <div>
                  <strong>{professional.fullName}</strong>
                  <p>{lastMessageText}</p>
                </div>
                {unread > 0 ? <span className="badge">{unread}</span> : null}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="wa-main">
        <header className="wa-main-header">
          <div className="wa-main-profile">
            <img
              src={professionalImageMap[threadProfessional.id]}
              alt={threadProfessional.fullName}
              onError={handleImageFallback}
            />
            <div>
              <h3>{threadProfessional.fullName}</h3>
              <span>{t(props.language, { es: "En linea", en: "Online", pt: "Online" })}</span>
            </div>
          </div>
        </header>

        <div className="wa-messages">
          {remoteMode && apiMessages.length === 0 ? (
            <p className="wa-empty">
              {t(props.language, {
                es: "Todavia no hay mensajes en esta conversacion.",
                en: "There are no messages in this conversation yet.",
                pt: "Ainda nao ha mensagens nesta conversa."
              })}
            </p>
          ) : null}

          {remoteMode
            ? apiMessages.map((message) => (
                <article
                  id={`chat-msg-${message.id}`}
                  className={message.senderUserId === props.sessionUserId ? "wa-message outgoing" : "wa-message incoming"}
                  key={message.id}
                >
                  <p>{message.body}</p>
                  <time>
                    {formatDateTime({
                      isoDate: message.createdAt,
                      timezone: props.state.profile.timezone,
                      language: props.language
                    })}
                  </time>
                </article>
              ))
            : null}

          {!remoteMode && threadMessages.length === 0 ? (
            <p className="wa-empty">
              {t(props.language, {
                es: "Todavia no hay mensajes en esta conversacion.",
                en: "There are no messages in this conversation yet.",
                pt: "Ainda nao ha mensagens nesta conversa."
              })}
            </p>
          ) : (
            !remoteMode ? threadMessages.map((message) => (
              <article
                id={`chat-msg-${message.id}`}
                className={message.sender === "patient" ? "wa-message outgoing" : "wa-message incoming"}
                key={message.id}
              >
                <p>{message.text}</p>
                <time>
                  {formatDateTime({
                    isoDate: message.createdAt,
                    timezone: props.state.profile.timezone,
                    language: props.language
                  })}
                </time>
              </article>
            )) : null
          )}
        </div>

        <footer className="wa-composer">
          <textarea
            placeholder={t(props.language, { es: "Escribe un mensaje", en: "Write a message", pt: "Escreva uma mensagem" })}
            rows={2}
            value={draft}
            onKeyDown={handleComposerKeyDown}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button className="wa-send" type="button" onClick={handleSend}>
            {t(props.language, { es: "Enviar", en: "Send", pt: "Enviar" })}
          </button>
        </footer>
      </section>
      {apiError ? <p className="error-text">{apiError}</p> : null}
    </div>
  );
}

function ProfilePage(props: {
  user: SessionUser;
  language: AppLanguage;
  profile: PatientProfile;
  subscription: SubscriptionState;
  onUpdateProfile: (profile: PatientProfile) => void;
}) {
  const [searchParams] = useSearchParams();
  const [localProfile, setLocalProfile] = useState<PatientProfile>(props.profile);
  const [cardBrand, setCardBrand] = useState("Visa");
  const [cardLast4, setCardLast4] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const validTabs: ProfileTab[] = ["data", "cards", "subscription", "settings", "support"];
  const tabParam = searchParams.get("tab");
  const tab: ProfileTab = validTabs.includes(tabParam as ProfileTab) ? (tabParam as ProfileTab) : "data";

  useEffect(() => {
    setLocalProfile(props.profile);
  }, [props.profile]);

  const saveProfile = () => {
    props.onUpdateProfile(localProfile);
  };

  const addCard = () => {
    if (cardLast4.length !== 4 || cardExpMonth.length === 0 || cardExpYear.length === 0) {
      return;
    }

    const nextCards = [
      ...localProfile.cards,
      {
        id: `card-${Date.now()}`,
        brand: cardBrand,
        last4: cardLast4,
        expMonth: cardExpMonth,
        expYear: cardExpYear
      }
    ];

    const updated = { ...localProfile, cards: nextCards };
    setLocalProfile(updated);
    props.onUpdateProfile(updated);

    setCardLast4("");
    setCardExpMonth("");
    setCardExpYear("");
  };

  return (
    <div className="profile-layout">
      <section className="content-card profile-panel hostinger-payment-card">
        {tab === "data" ? (
          <>
            <h2>{t(props.language, { es: "Mis datos", en: "My data", pt: "Meus dados" })}</h2>
            <p className="profile-panel-lead">
              {t(props.language, {
                es: "Actualiza tus datos de contacto y deja listo tu perfil clinico.",
                en: "Update your contact details and keep your clinical profile ready.",
                pt: "Atualize seus dados de contato e mantenha seu perfil clinico pronto."
              })}
            </p>
            <div className="profile-form-grid">
              <label>
                {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
                <input value={props.user.fullName} disabled />
              </label>
              <label>
                {t(props.language, { es: "Email", en: "Email", pt: "Email" })}
                <input value={props.user.email} disabled />
              </label>
              <label>
                {t(props.language, { es: "Telefono", en: "Phone", pt: "Telefone" })}
                <input
                  value={localProfile.phone}
                  onChange={(event) => setLocalProfile((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label>
                {t(props.language, { es: "Contacto de emergencia", en: "Emergency contact", pt: "Contato de emergencia" })}
                <input
                  value={localProfile.emergencyContact}
                  onChange={(event) =>
                    setLocalProfile((current) => ({
                      ...current,
                      emergencyContact: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                {t(props.language, { es: "Zona horaria", en: "Time zone", pt: "Fuso horario" })}
                <input
                  value={localProfile.timezone}
                  onChange={(event) => setLocalProfile((current) => ({ ...current, timezone: event.target.value }))}
                />
              </label>
            </div>
            <button className="primary" type="button" onClick={saveProfile}>
              {t(props.language, { es: "Guardar perfil", en: "Save profile", pt: "Salvar perfil" })}
            </button>
          </>
        ) : null}

        {tab === "cards" ? (
          <>
            <h2>{t(props.language, { es: "Mis tarjetas", en: "My cards", pt: "Meus cartoes" })}</h2>
            <p className="profile-panel-lead">
              {t(props.language, {
                es: "Gestiona tus medios de pago para comprar sesiones cuando lo necesites.",
                en: "Manage your payment methods to buy sessions whenever needed.",
                pt: "Gerencie seus meios de pagamento para comprar sessoes quando precisar."
              })}
            </p>
            {localProfile.cards.length === 0 ? <p className="profile-empty-note">{t(props.language, { es: "Todavia no hay tarjetas guardadas.", en: "There are no saved cards yet.", pt: "Ainda nao ha cartoes salvos." })}</p> : null}
            <ul className="simple-list profile-list">
              {localProfile.cards.map((card) => (
                <li key={card.id}>
                  <div>
                    <strong>{card.brand} **** {card.last4}</strong>
                    <span>
                      {replaceTemplate(t(props.language, { es: "Vence {value}", en: "Expires {value}", pt: "Vence {value}" }), {
                        value: `${card.expMonth}/${card.expYear}`
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="card-grid profile-form-grid">
              <label>
                {t(props.language, { es: "Marca", en: "Brand", pt: "Bandeira" })}
                <select value={cardBrand} onChange={(event) => setCardBrand(event.target.value)}>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="Amex">Amex</option>
                </select>
              </label>
              <label>
                {t(props.language, { es: "Ultimos 4 digitos", en: "Last 4 digits", pt: "Ultimos 4 digitos" })}
                <input value={cardLast4} onChange={(event) => setCardLast4(event.target.value.replace(/\D/g, "").slice(0, 4))} />
              </label>
              <label>
                {t(props.language, { es: "Mes de vencimiento", en: "Expiration month", pt: "Mes de vencimento" })}
                <input value={cardExpMonth} onChange={(event) => setCardExpMonth(event.target.value.replace(/\D/g, "").slice(0, 2))} />
              </label>
              <label>
                {t(props.language, { es: "Ano de vencimiento", en: "Expiration year", pt: "Ano de vencimento" })}
                <input value={cardExpYear} onChange={(event) => setCardExpYear(event.target.value.replace(/\D/g, "").slice(0, 4))} />
              </label>
            </div>
            <button className="primary" type="button" onClick={addCard}>
              {t(props.language, { es: "Agregar tarjeta", en: "Add card", pt: "Adicionar cartao" })}
            </button>
          </>
        ) : null}

        {tab === "subscription" ? (
          <>
            <h2>{t(props.language, { es: "Mi suscripcion", en: "My subscription", pt: "Minha assinatura" })}</h2>
            <p className="profile-panel-lead">
              {t(props.language, {
                es: "Resumen de tu plan activo y disponibilidad de sesiones.",
                en: "Summary of your active plan and available sessions.",
                pt: "Resumo do seu plano ativo e disponibilidade de sessoes."
              })}
            </p>
            <div className="sessions-summary-grid profile-subscription-grid">
              <article className="session-summary-item">
                <span>{t(props.language, { es: "Paquete actual", en: "Current package", pt: "Pacote atual" })}</span>
                <strong className="session-summary-compact">
                  {localizedPackageName(props.subscription.packageId, props.subscription.packageName, props.language)}
                </strong>
              </article>
              <article className="session-summary-item">
                <span>{t(props.language, { es: "Sesiones disponibles", en: "Available sessions", pt: "Sessoes disponiveis" })}</span>
                <strong>{props.subscription.creditsRemaining} / {props.subscription.creditsTotal}</strong>
              </article>
            </div>
            <p>
              {t(props.language, { es: "Fecha de compra:", en: "Purchase date:", pt: "Data da compra:" })}{" "}
              {props.subscription.purchasedAt
                ? formatDateTime({
                    isoDate: props.subscription.purchasedAt,
                    timezone: localProfile.timezone,
                    language: props.language
                  })
                : "-"}
            </p>
            <p>{t(props.language, { es: "Los paquetes se compran desde la pantalla de sesiones.", en: "Packages are purchased from the sessions screen.", pt: "Os pacotes sao comprados na tela de sessoes." })}</p>
          </>
        ) : null}

        {tab === "settings" ? (
          <>
            <h2>{t(props.language, { es: "Ajustes", en: "Settings", pt: "Configuracoes" })}</h2>
            <p className="profile-panel-lead">
              {t(props.language, {
                es: "Define como quieres recibir avisos de la plataforma.",
                en: "Choose how you want to receive platform notifications.",
                pt: "Defina como deseja receber notificacoes da plataforma."
              })}
            </p>
            <div className="profile-settings-stack">
              <label className="inline-toggle">
                <input
                  checked={localProfile.notificationsEmail}
                  type="checkbox"
                  onChange={(event) =>
                    setLocalProfile((current) => ({
                      ...current,
                      notificationsEmail: event.target.checked
                    }))
                  }
                />
                {t(props.language, { es: "Notificaciones por email", en: "Email notifications", pt: "Notificacoes por email" })}
              </label>
              <label className="inline-toggle">
                <input
                  checked={localProfile.notificationsReminder}
                  type="checkbox"
                  onChange={(event) =>
                    setLocalProfile((current) => ({
                      ...current,
                      notificationsReminder: event.target.checked
                    }))
                  }
                />
                {t(props.language, { es: "Recordatorios de sesion", en: "Session reminders", pt: "Lembretes de sessao" })}
              </label>
            </div>
            <button className="primary" type="button" onClick={saveProfile}>
              {t(props.language, { es: "Guardar ajustes", en: "Save settings", pt: "Salvar configuracoes" })}
            </button>
          </>
        ) : null}

        {tab === "support" ? (
          <>
            <h2>{t(props.language, { es: "Soporte", en: "Support", pt: "Suporte" })}</h2>
            <p className="profile-panel-lead">{t(props.language, { es: "Envianos tu consulta y el equipo operativo te responde a la brevedad.", en: "Send us your request and the operations team will reply shortly.", pt: "Envie sua consulta e a equipe operacional respondera em breve." })}</p>
            <textarea
              rows={4}
              value={supportMessage}
              onChange={(event) => setSupportMessage(event.target.value)}
              placeholder={t(props.language, { es: "Describe tu consulta", en: "Describe your request", pt: "Descreva sua solicitacao" })}
            />
            <button
              className="primary"
              type="button"
              onClick={() =>
                setSupportMessage(
                  t(props.language, {
                    es: "Solicitud enviada.",
                    en: "Request sent.",
                    pt: "Solicitacao enviada."
                  })
                )
              }
            >
              {t(props.language, { es: "Enviar solicitud", en: "Send request", pt: "Enviar solicitacao" })}
            </button>
            {supportMessage ? <p className="success-text">{supportMessage}</p> : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

function MainPortal(props: {
  state: PatientAppState;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const unreadMessagesCount = getUnreadCount(props.state.messages);
  const selectedBooking = selectedBookingId
    ? props.state.bookings.find((booking) => booking.id === selectedBookingId) ?? null
    : null;
  const languageChoices: Array<{ value: AppLanguage; nativeLabel: string; englishLabel: string }> = [
    { value: "es", nativeLabel: "Espanol", englishLabel: "Spanish" },
    { value: "en", nativeLabel: "English", englishLabel: "English" },
    { value: "pt", nativeLabel: "Portugues", englishLabel: "Portuguese" }
  ];

  useEffect(() => {
    if (!menuOpen && !preferencesOpen) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setMenuOpen(false);
      setPreferencesOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, preferencesOpen]);

  const handleReserveFromAnywhere = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      selectedProfessionalId: professionalId
    }));
    navigate("/sessions");
  };

  const handleGoToProfessional = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      selectedProfessionalId: professionalId
    }));
    navigate("/matching");
  };

  const handleChatFromAnywhere = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      activeChatProfessionalId: professionalId
    }));
    navigate("/chat");
  };

  const openProfileTabFromMenu = (tab: ProfileTab) => {
    setMenuOpen(false);
    navigate(`/profile?tab=${tab}`);
  };

  const addPackage = (plan: PackagePlan, source: PackagePurchaseSource) => {
    if (source !== "checkout_button") {
      return;
    }

    props.onStateChange((current) => ({
      ...current,
      assignedProfessionalId: current.selectedProfessionalId,
      subscription: {
        packageId: plan.id,
        packageName: plan.name,
        creditsTotal: plan.credits,
        creditsRemaining: current.subscription.creditsRemaining + plan.credits,
        purchasedAt: new Date().toISOString()
      }
    }));
  };

  const startPackagePurchase = (plan: PackagePlan) => {
    navigate(`/sessions?flow=checkout&plan=${plan.id}`);
  };

  const confirmBooking = (professionalId: string, slot: TimeSlot, useTrialSession: boolean) => {
    props.onStateChange((current) => {
      const trialAlreadyUsed = current.trialUsedProfessionalIds.includes(professionalId);
      const bookingAsTrial = useTrialSession && !trialAlreadyUsed;
      const hasCredits = current.subscription.creditsRemaining > 0;

      if (!bookingAsTrial && !hasCredits) {
        return current;
      }

      const bookingId = `booking-${Date.now()}`;
      const newBooking: Booking = {
        id: bookingId,
        professionalId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "confirmed",
        joinUrl: `https://video.therapy.local/session/${bookingId}`,
        createdAt: new Date().toISOString(),
        bookingMode: bookingAsTrial ? "trial" : "credit"
      };

      return {
        ...current,
        selectedProfessionalId: professionalId,
        assignedProfessionalId: current.assignedProfessionalId ?? professionalId,
        bookings: [newBooking, ...current.bookings],
        bookedSlotIds: [...current.bookedSlotIds, slot.id],
        trialUsedProfessionalIds:
          bookingAsTrial && !trialAlreadyUsed
            ? [...current.trialUsedProfessionalIds, professionalId]
            : current.trialUsedProfessionalIds,
        subscription: {
          ...current.subscription,
          creditsRemaining: bookingAsTrial ? current.subscription.creditsRemaining : current.subscription.creditsRemaining - 1
        }
      };
    });
  };

  const planTrialFromDashboard = (professionalId: string, slot: TimeSlot) => {
    props.onStateChange((current) => {
      const now = Date.now();
      const activeTrial = current.bookings
        .filter(
          (booking) =>
            booking.bookingMode === "trial" &&
            booking.status === "confirmed" &&
            new Date(booking.endsAt).getTime() >= now
        )
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;

      const previousSlotId = activeTrial
        ? findProfessionalById(activeTrial.professionalId).slots.find(
            (candidate) => candidate.startsAt === activeTrial.startsAt && candidate.endsAt === activeTrial.endsAt
          )?.id ?? null
        : null;

      if (activeTrial && activeTrial.professionalId === professionalId && activeTrial.startsAt === slot.startsAt) {
        return current;
      }

      const updatedBookings = activeTrial
        ? current.bookings.map((booking) => (booking.id === activeTrial.id ? { ...booking, status: "cancelled" as const } : booking))
        : current.bookings;

      let nextTrialUsed = [...current.trialUsedProfessionalIds];
      if (activeTrial) {
        const previousProfessionalId = activeTrial.professionalId;
        const hasCompletedTrialForPrevious = current.bookings.some(
          (booking) =>
            booking.id !== activeTrial.id &&
            booking.bookingMode === "trial" &&
            booking.status === "confirmed" &&
            booking.professionalId === previousProfessionalId &&
            new Date(booking.endsAt).getTime() < now
        );
        if (!hasCompletedTrialForPrevious) {
          nextTrialUsed = nextTrialUsed.filter((id) => id !== previousProfessionalId);
        }
      }
      if (!nextTrialUsed.includes(professionalId)) {
        nextTrialUsed.push(professionalId);
      }

      const bookingId = `booking-${Date.now()}`;
      const newTrialBooking: Booking = {
        id: bookingId,
        professionalId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "confirmed",
        joinUrl: `https://video.therapy.local/session/${bookingId}`,
        createdAt: new Date().toISOString(),
        bookingMode: "trial"
      };

      return {
        ...current,
        selectedProfessionalId: professionalId,
        assignedProfessionalId: professionalId,
        bookings: [newTrialBooking, ...updatedBookings],
        bookedSlotIds: [
          ...current.bookedSlotIds.filter((id) => id !== previousSlotId),
          slot.id
        ],
        trialUsedProfessionalIds: nextTrialUsed
      };
    });
  };

  const cancelTrialFromDashboard = () => {
    props.onStateChange((current) => {
      const now = Date.now();
      const activeTrial = current.bookings
        .filter(
          (booking) =>
            booking.bookingMode === "trial" &&
            booking.status === "confirmed" &&
            new Date(booking.endsAt).getTime() >= now
        )
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;

      if (!activeTrial) {
        return current;
      }

      const previousSlotId =
        findProfessionalById(activeTrial.professionalId).slots.find(
          (candidate) => candidate.startsAt === activeTrial.startsAt && candidate.endsAt === activeTrial.endsAt
        )?.id ?? null;

      const hasCompletedTrialForProfessional = current.bookings.some(
        (booking) =>
          booking.id !== activeTrial.id &&
          booking.bookingMode === "trial" &&
          booking.status === "confirmed" &&
          booking.professionalId === activeTrial.professionalId &&
          new Date(booking.endsAt).getTime() < now
      );

      return {
        ...current,
        assignedProfessionalId: current.subscription.creditsRemaining > 0 ? current.assignedProfessionalId : null,
        bookings: current.bookings.map((booking) =>
          booking.id === activeTrial.id ? { ...booking, status: "cancelled" as const } : booking
        ),
        bookedSlotIds: current.bookedSlotIds.filter((id) => id !== previousSlotId),
        trialUsedProfessionalIds: hasCompletedTrialForProfessional
          ? current.trialUsedProfessionalIds
          : current.trialUsedProfessionalIds.filter((id) => id !== activeTrial.professionalId)
      };
    });
  };

  const sendMessage = (professionalId: string, text: string) => {
    const messageId = `msg-${Date.now()}`;

    props.onStateChange((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: messageId,
          professionalId,
          sender: "patient",
          text,
          read: true,
          createdAt: new Date().toISOString()
        }
      ]
    }));

    window.setTimeout(() => {
      props.onStateChange((current) => {
        const professional = findProfessionalById(professionalId);
        return {
          ...current,
          messages: [
            ...current.messages,
            {
              id: `msg-${Date.now() + 1}`,
              professionalId,
              sender: "professional",
              text: replaceTemplate(
                t(current.language, {
                  es: "{name}: Gracias por tu mensaje. Lo revise y lo vemos en la sesion.",
                  en: "{name}: Thanks for your message. I reviewed it and we will go over it in session.",
                  pt: "{name}: Obrigado pela mensagem. Revisei e veremos isso na sessao."
                }),
                { name: professional.fullName }
              ),
              read: false,
              createdAt: new Date().toISOString()
            }
          ]
        };
      });
    }, 900);
  };

  const markThreadAsRead = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.professionalId === professionalId && message.sender === "professional"
          ? { ...message, read: true }
          : message
      )
    }));
  };

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <span className="portal-brand-mark">M</span>
          <div>
            <strong>Motivarte</strong>
            <p>{t(props.state.language, { es: "Portal paciente", en: "Patient portal", pt: "Portal do paciente" })}</p>
          </div>
        </div>

        <nav className="portal-sidebar-nav">
          <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} end to="/">
            {t(props.state.language, { es: "Inicio", en: "Home", pt: "Inicio" })}
          </NavLink>
          <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/sessions">
            {t(props.state.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
          </NavLink>
          <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/chat">
            <span className="nav-link-with-badge">
              {t(props.state.language, { es: "Chat", en: "Chat", pt: "Chat" })}
              {unreadMessagesCount > 0 ? <span className="chat-badge-dot" aria-label="Nuevos mensajes" /> : null}
            </span>
          </NavLink>
          <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/matching">
            {t(props.state.language, { es: "Profesionales", en: "Professionals", pt: "Profissionais" })}
          </NavLink>
        </nav>

        <div className="portal-sidebar-foot">
          <p>{props.state.session?.email}</p>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-header">
          <div>
            <h1>
              {replaceTemplate(
                t(props.state.language, {
                  es: "Hola, {name}",
                  en: "Hi, {name}",
                  pt: "Ola, {name}"
                }),
                { name: props.state.session?.fullName ?? "" }
              )}
            </h1>
          </div>

          <div className="header-actions">
            <div className="menu-wrap">
              <button
                aria-label={t(props.state.language, { es: "Abrir menu", en: "Open menu", pt: "Abrir menu" })}
                className="menu-toggle"
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
              >
                &#9776;
              </button>
              {menuOpen ? (
                <div className="menu-dropdown">
                  <div className="menu-panel-head">
                    <strong>{props.state.session?.email ?? ""}</strong>
                    <span>{props.state.session?.fullName ?? ""}</span>
                  </div>
                  <div className="menu-sep" />

                  <button className="menu-item" type="button" onClick={() => openProfileTabFromMenu("data")}>
                    {t(props.state.language, { es: "Informacion de cuenta", en: "Account information", pt: "Informacoes da conta" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => openProfileTabFromMenu("cards")}>
                    {t(props.state.language, { es: "Tarjetas", en: "Cards", pt: "Cartoes" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => openProfileTabFromMenu("subscription")}>
                    {t(props.state.language, { es: "Actividad de sesiones", en: "Session activity", pt: "Atividade de sessoes" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => openProfileTabFromMenu("settings")}>
                    {t(props.state.language, { es: "Notificaciones", en: "Notification settings", pt: "Notificacoes" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => openProfileTabFromMenu("support")}>
                    {t(props.state.language, { es: "Soporte", en: "Support", pt: "Suporte" })}
                  </button>

                  <button
                    className="menu-item menu-item-split"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setPreferencesOpen(true);
                    }}
                  >
                    <span>{t(props.state.language, { es: "Idioma y moneda", en: "Language and currency", pt: "Idioma e moeda" })}</span>
                    <small>
                      {languageChoices.find((item) => item.value === props.state.language)?.nativeLabel ?? "Espanol"} ·{" "}
                      {currencySymbolOnly(props.state.currency)}
                    </small>
                  </button>

                  <div className="menu-sep" />
                  <button
                    className="menu-item danger"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      props.onLogout();
                      navigate("/");
                    }}
                  >
                    {t(props.state.language, { es: "Cerrar sesion", en: "Sign out", pt: "Sair" })}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <nav
          className="portal-mobile-nav"
          aria-label={t(props.state.language, {
            es: "Navegacion principal mobile",
            en: "Main mobile navigation",
            pt: "Navegacao principal mobile"
          })}
        >
          <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} end to="/">
            {t(props.state.language, { es: "Inicio", en: "Home", pt: "Inicio" })}
          </NavLink>
          <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/sessions">
            {t(props.state.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
          </NavLink>
          <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/chat">
            <span className="nav-link-with-badge">
              {t(props.state.language, { es: "Chat", en: "Chat", pt: "Chat" })}
              {unreadMessagesCount > 0 ? <span className="chat-badge-dot" aria-label="Nuevos mensajes" /> : null}
            </span>
          </NavLink>
          <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/matching">
            {t(props.state.language, { es: "Profesionales", en: "Professionals", pt: "Profissionais" })}
          </NavLink>
        </nav>

        {props.state.intake?.riskBlocked ? (
          <section className="content-card danger">
            <strong>
              {t(props.state.language, {
                es: "Triage de seguridad activo:",
                en: "Safety triage active:",
                pt: "Triagem de seguranca ativa:"
              })}
            </strong>{" "}
            {t(props.state.language, {
              es: "la reserva queda deshabilitada hasta revision manual.",
              en: "booking is disabled until manual review.",
              pt: "a reserva fica desabilitada ate revisao manual."
            })}
          </section>
        ) : null}

        <main className="portal-main-content">
          <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                state={props.state}
                language={props.state.language}
                currency={props.state.currency}
                onGoToBooking={handleReserveFromAnywhere}
                onGoToProfessional={handleGoToProfessional}
                onGoToChat={handleChatFromAnywhere}
                onOpenBookingDetail={(bookingId) => setSelectedBookingId(bookingId)}
                onPlanTrialFromDashboard={planTrialFromDashboard}
                onCancelTrialFromDashboard={cancelTrialFromDashboard}
                onStartPackagePurchase={startPackagePurchase}
              />
            }
          />
          <Route
            path="/matching"
            element={
              <MatchingPage
                language={props.state.language}
                selectedProfessionalId={props.state.selectedProfessionalId}
                onSelectProfessional={(professionalId) =>
                  props.onStateChange((current) => ({ ...current, selectedProfessionalId: professionalId }))
                }
                onReserve={handleReserveFromAnywhere}
                onChat={handleChatFromAnywhere}
              />
            }
          />
          <Route
            path="/sessions"
            element={
              <BookingPage
                state={props.state}
                language={props.state.language}
                currency={props.state.currency}
                onSelectProfessional={(professionalId) =>
                  props.onStateChange((current) => ({ ...current, selectedProfessionalId: professionalId }))
                }
                onAddPackage={addPackage}
                onConfirmBooking={confirmBooking}
              />
            }
          />
          <Route path="/booking" element={<Navigate replace to="/sessions" />} />
          <Route
            path="/chat"
            element={
              <ChatPage
                state={props.state}
                language={props.state.language}
                authToken={props.state.authToken}
                sessionUserId={props.state.session?.id ?? ""}
                onSetActiveProfessional={(professionalId) =>
                  props.onStateChange((current) => ({ ...current, activeChatProfessionalId: professionalId }))
                }
                onSendMessage={sendMessage}
                onMarkRead={markThreadAsRead}
              />
            }
          />
          <Route
            path="/profile"
            element={
              props.state.session ? (
                <ProfilePage
                  user={props.state.session}
                  language={props.state.language}
                  profile={props.state.profile}
                  subscription={props.state.subscription}
                  onUpdateProfile={(profile) =>
                    props.onStateChange((current) => ({
                      ...current,
                      profile
                    }))
                  }
                />
              ) : null
            }
          />
          </Routes>
        </main>
      </div>
      {selectedBooking ? (
        <SessionDetailModal
          booking={selectedBooking}
          timezone={props.state.profile.timezone}
          language={props.state.language}
          onClose={() => setSelectedBookingId("")}
        />
      ) : null}
      {preferencesOpen ? (
        <div className="session-modal-backdrop" role="presentation" onClick={() => setPreferencesOpen(false)}>
          <section
            className="session-modal preferences-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="preferences-modal-header">
              <div>
                <h2>{t(props.state.language, { es: "Idioma y moneda", en: "Language and currency", pt: "Idioma e moeda" })}</h2>
                <p>
                  {t(props.state.language, {
                    es: "Tu portal se mostrara con estas preferencias en este dispositivo.",
                    en: "Your portal will use these preferences on this device.",
                    pt: "Seu portal usara essas preferencias neste dispositivo."
                  })}
                </p>
              </div>
              <button type="button" className="preferences-modal-close" onClick={() => setPreferencesOpen(false)}>
                ×
              </button>
            </header>

            <div className="preferences-groups">
              <section className="preferences-group">
                <h3>{t(props.state.language, { es: "Seleccionar idioma", en: "Select language", pt: "Selecionar idioma" })}</h3>
                <div className="preferences-options-grid">
                  {languageChoices.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`preferences-option ${props.state.language === item.value ? "active" : ""}`}
                      onClick={() =>
                        props.onStateChange((current) => ({
                          ...current,
                          language: item.value
                        }))
                      }
                    >
                      <strong>{item.nativeLabel}</strong>
                      <span>{item.englishLabel}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="preferences-group">
                <h3>{t(props.state.language, { es: "Seleccionar moneda", en: "Select currency", pt: "Selecionar moeda" })}</h3>
                <div className="preferences-options-grid">
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <button
                      key={currency}
                      type="button"
                      className={`preferences-option ${props.state.currency === currency ? "active" : ""}`}
                      onClick={() =>
                        props.onStateChange((current) => ({
                          ...current,
                          currency
                        }))
                      }
                    >
                      <strong>{currency}</strong>
                      <span>{currencyOptionLabel(currency, props.state.language)}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export function App() {
  const [state, setState] = useState<PatientAppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = (updater: (current: PatientAppState) => PatientAppState) => {
    setState((current) => updater(current));
  };

  if (!state.session) {
    return (
      <AuthScreen
        language={state.language}
        currency={state.currency}
        onLanguageChange={(language) => {
          setState((current) => ({
            ...current,
            language
          }));
        }}
        onCurrencyChange={(currency) => {
          setState((current) => ({
            ...current,
            currency
          }));
        }}
        onLogin={(user, token) => {
          setState((current) => ({
            ...current,
            session: user,
            authToken: token
          }));
        }}
      />
    );
  }

  if (!state.intake?.completed) {
    return (
      <IntakeScreen
        user={state.session}
        language={state.language}
        onComplete={(answers) => {
          const riskResult = evaluateRisk(answers);
          setState((current) => ({
            ...current,
            intake: {
              completed: true,
              completedAt: new Date().toISOString(),
              riskLevel: riskResult.level,
              riskBlocked: riskResult.blocked,
              answers
            }
          }));
        }}
      />
    );
  }

  return (
    <MainPortal
      state={state}
      onStateChange={updateState}
      onLogout={() => setState(defaultState)}
    />
  );
}
