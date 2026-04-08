import { useEffect, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { ProfessionalWebOnboardingPayload } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export type WebInterstitialVisual = "earnings" | "reservations" | "growth" | "trust";

export type WebInterstitialContent = {
  kicker: string;
  title: string;
  body: string;
  cta: string;
  visual: WebInterstitialVisual;
  metric: string;
  metricCaption: string;
};

export function useProfessionalWebOnboardingWizard(input: {
  language: AppLanguage;
  onFinish: (payload: ProfessionalWebOnboardingPayload) => void;
}) {
  const [step, setStep] = useState(0);
  const [maxReachedStep, setMaxReachedStep] = useState(0);
  const [activeInterstitialStep, setActiveInterstitialStep] = useState<number | null>(null);
  const [seenInterstitials, setSeenInterstitials] = useState<Record<number, true>>({});
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);

  const webPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const webVideoInputRef = useRef<HTMLInputElement | null>(null);
  const webVideoCoverInputRef = useRef<HTMLInputElement | null>(null);
  const webDiplomaInputRef = useRef<HTMLInputElement | null>(null);
  const webStripeDocInputRef = useRef<HTMLInputElement | null>(null);

  const [activeDiplomaUploadIndex, setActiveDiplomaUploadIndex] = useState<number | null>(null);

  const [form, setForm] = useState({
    fullName: "Gustavo Milanese",
    professionalTitle: "Psicologo clinico",
    yearsExperience: "10",
    specialization: "Psicologo",
    experienceBand: "6-10 anos",
    practiceBand: "1000-3000 horas",
    gender: "Hombre",
    birthCountry: "Uruguay",
    focusAreas: ["Ansiedad"] as string[],
    languages: ["Espanol", "Ingles"] as string[],
    about: "Trabajo con ansiedad, autoestima y procesos de cambio vital.",
    methodology: "Enfoque integrador con herramientas cognitivo-conductuales.",
    shortDescription: "Acompanamiento cercano, practico y orientado a objetivos.",
    sessionPrice: "50",
    discount4: "3",
    discount8: "5",
    discount12: "10",
    profilePhotoReady: false,
    profilePhotoPreview: "",
    videoReady: false,
    videoPreview: "",
    videoCoverReady: false,
    videoCoverPreview: "",
    diplomas: [
      {
        institution: "Colegio Manuel Belgrano",
        degree: "Psicólogo social",
        startYear: "2014",
        graduationYear: "2018",
        diplomaUploaded: false,
        diplomaPreview: ""
      }
    ],
    stripeVerified: true,
    stripeDocPreview: "",
    stripeVerificationStarted: true,
    email: "gustavo@example.com",
    password: "SecurePass123"
  });

  const years = Array.from({ length: 31 }, (_, index) => String(2000 + index));
  const labels = [
    t(input.language, { es: "Identidad profesional", en: "Professional identity", pt: "Identidade profissional" }),
    t(input.language, { es: "Perfil público", en: "Public profile", pt: "Perfil publico" }),
    t(input.language, { es: "Servicios y precios", en: "Services and pricing", pt: "Servicos e precos" }),
    t(input.language, { es: "Multimedia", en: "Media", pt: "Midia" }),
    t(input.language, { es: "Formación y cuenta", en: "Education and account", pt: "Formacao e conta" }),
    t(input.language, { es: "Stripe y verificación", en: "Stripe and verification", pt: "Stripe e verificacao" })
  ];

  const stepSubtitles = [
    t(input.language, {
      es: "Complete sus datos principales para definir como se mostrara su perfil profesional.",
      en: "Complete your core data to define how your professional profile will appear.",
      pt: "Preencha seus dados principais para definir como seu perfil profissional sera exibido."
    }),
    null,
    t(input.language, {
      es: "Precio por sesión y descuentos por paquetes de 4, 8 y 12 sesiones (límites máximos definidos por la plataforma).",
      en: "Per-session price and discounts for 4, 8, and 12 session bundles (platform maximums apply).",
      pt: "Preco por sessao e descontos para pacotes de 4, 8 e 12 sessoes (limites maximos da plataforma)."
    }),
    t(input.language, {
      es: "Cargue los recursos visuales que refuerzan confianza en su perfil.",
      en: "Upload visual assets that reinforce trust in your profile.",
      pt: "Envie os recursos visuais que reforcam a confianca no seu perfil."
    }),
    null,
    t(input.language, {
      es: "Conecte Stripe para validar documentos y activar cobros.",
      en: "Connect Stripe to validate documents and activate payouts.",
      pt: "Conecte o Stripe para validar documentos e ativar pagamentos."
    })
  ] as const;

  const webSpecializationOptions = [
    { es: "Psicologo", en: "Psychologist", pt: "Psicologo" },
    { es: "Psicoterapeuta", en: "Psychotherapist", pt: "Psicoterapeuta" },
    { es: "Psicoanalista", en: "Psychoanalyst", pt: "Psicanalista" },
    { es: "Psiquiatra", en: "Psychiatrist", pt: "Psiquiatra" },
    { es: "Terapeuta Gestalt", en: "Gestalt therapist", pt: "Terapeuta Gestalt" },
    { es: "Sexologo", en: "Sexologist", pt: "Sexologo" },
    { es: "Coach", en: "Coach", pt: "Coach" },
    { es: "Nutricionista", en: "Nutritionist", pt: "Nutricionista" },
    { es: "Doc. de Ciencias Medicas", en: "Medical sciences PhD", pt: "Doutor em ciencias medicas" },
    { es: "Doc. de Ciencias Psicologicas", en: "Psychological sciences PhD", pt: "Doutor em ciencias psicologicas" },
    { es: "Psicologo en practicas", en: "Psychologist in training", pt: "Psicologo em formacao" },
    { es: "Psicologo perinatal", en: "Perinatal psychologist", pt: "Psicologo perinatal" },
    { es: "Psicologo para militares y sus familiares", en: "Psychologist for military families", pt: "Psicologo para militares e familiares" }
  ].map((option) => t(input.language, option));

  const interstitialByStep: Partial<Record<number, WebInterstitialContent>> = {
    0: {
      kicker: t(input.language, { es: "Proyección real", en: "Real projection", pt: "Projecao real" }),
      title: t(input.language, { es: "Calculemos tus ganancias potenciales", en: "Let's estimate your potential revenue", pt: "Vamos calcular seu potencial de receita" }),
      body: t(input.language, {
        es: "Con un perfil completo y claro, tu agenda mensual puede empezar a crecer desde la primera semana.",
        en: "With a complete profile, your monthly agenda can grow from week one.",
        pt: "Com um perfil completo, sua agenda mensal pode crescer desde a primeira semana."
      }),
      cta: t(input.language, { es: "Vamos", en: "Let's go", pt: "Vamos" }),
      visual: "earnings",
      metric: "$5.173,75",
      metricCaption: t(input.language, { es: "ganancia proyectada", en: "projected earnings", pt: "ganho projetado" })
    },
    1: {
      kicker: t(input.language, { es: "Primeras reservas", en: "First bookings", pt: "Primeiras reservas" }),
      title: t(input.language, { es: "Los psicólogos reciben clientes rápido", en: "Psychologists receive clients fast", pt: "Psicologos recebem clientes rapido" }),
      body: t(input.language, {
        es: "Un perfil claro acelera la confianza y mejora la conversión en las primeras horas.",
        en: "A clear profile speeds up trust and improves conversion in the first hours.",
        pt: "Um perfil claro acelera a confianca e melhora a conversao nas primeiras horas."
      }),
      cta: t(input.language, { es: "Seguimos", en: "Continue", pt: "Seguimos" }),
      visual: "reservations",
      metric: "2 horas",
      metricCaption: t(input.language, { es: "tiempo promedio hasta la primera reserva", en: "average time to first booking", pt: "tempo medio para a primeira reserva" })
    },
    2: {
      kicker: t(input.language, { es: "Escalamiento", en: "Growth curve", pt: "Curva de crescimento" }),
      title: t(input.language, { es: "Con descuentos inteligentes aumenta la continuidad", en: "Smart discounts increase continuity", pt: "Descontos inteligentes aumentam a continuidade" }),
      body: t(input.language, {
        es: "Los paquetes con descuento ayudan a sostener procesos largos y estabilizar ingresos.",
        en: "Discounted packages support longer treatments and stabilize revenue.",
        pt: "Pacotes com desconto sustentam tratamentos longos e estabilizam sua receita."
      }),
      cta: t(input.language, { es: "Continuar", en: "Continue", pt: "Continuar" }),
      visual: "growth",
      metric: "30 clientes",
      metricCaption: t(input.language, { es: "promedio en el primer mes", en: "average in the first month", pt: "media no primeiro mes" })
    },
    3: {
      kicker: t(input.language, { es: "Confianza", en: "Trust signal", pt: "Sinal de confianca" }),
      title: t(input.language, { es: "Tu formación validada eleva el valor de tu perfil", en: "Verified education raises your profile value", pt: "Formacao validada aumenta o valor do perfil" }),
      body: t(input.language, {
        es: "La mayoría de los pacientes compara credenciales antes de reservar su primera sesión.",
        en: "Most patients compare credentials before booking their first session.",
        pt: "A maioria dos pacientes compara credenciais antes de reservar a primeira sessao."
      }),
      cta: t(input.language, { es: "Casi listo", en: "Almost done", pt: "Quase pronto" }),
      visual: "trust",
      metric: "97%",
      metricCaption: t(input.language, { es: "revisa la formación antes de reservar", en: "reviews education before booking", pt: "revisa formacao antes de reservar" })
    }
  };

  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const updateDiploma = (
    index: number,
    patch: Partial<{
      institution: string;
      degree: string;
      startYear: string;
      graduationYear: string;
      diplomaUploaded: boolean;
      diplomaPreview: string;
    }>
  ) => {
    setForm((current) => ({
      ...current,
      diplomas: current.diplomas.map((diploma, diplomaIndex) =>
        diplomaIndex === index ? { ...diploma, ...patch } : diploma
      )
    }));
  };

  const addDiploma = () => {
    setForm((current) => ({
      ...current,
      diplomas: [
        ...current.diplomas,
        {
          institution: "",
          degree: "",
          startYear: "",
          graduationYear: "",
          diplomaUploaded: false,
          diplomaPreview: ""
        }
      ]
    }));
  };

  const toggleLanguage = (value: string) => {
    const next = form.languages.includes(value)
      ? form.languages.filter((item) => item !== value)
      : [...form.languages, value];
    update({ languages: next });
  };

  const toggleFocusArea = (value: string) => {
    const next = form.focusAreas.includes(value)
      ? form.focusAreas.filter((item) => item !== value)
      : [...form.focusAreas, value];
    update({ focusAreas: next });
  };

  const clampDiscountInput = (raw: string, max: number) => {
    const numeric = raw.replace(/\D/g, "");
    if (!numeric) {
      return "";
    }
    return String(Math.min(max, Math.max(0, Number(numeric))));
  };

  const discountedPriceLabel = (discount: string) => {
    const sessionPrice = Number(form.sessionPrice || "0");
    if (!sessionPrice) {
      return null;
    }
    const percent = Number(discount || "0");
    if (!percent) {
      return null;
    }
    const value = Math.max(0, Math.round(sessionPrice * (1 - percent / 100)));
    return `${value} USD ${t(input.language, { es: "por sesion", en: "per session", pt: "por sessao" })}`;
  };

  const stepValidations = [
    Boolean(
      form.fullName.trim()
      && form.professionalTitle.trim()
      && form.yearsExperience.trim()
      && form.specialization
      && form.experienceBand
      && form.practiceBand
      && form.gender
      && form.birthCountry
      && form.focusAreas.length
      && form.languages.length
    ),
    Boolean(form.about.trim() && form.methodology.trim() && form.shortDescription.trim()),
    Boolean(form.sessionPrice.trim()),
    true,
    Boolean(
      form.diplomas.length
      && form.diplomas.every((diploma) =>
        diploma.institution.trim()
        && diploma.degree.trim()
        && diploma.startYear
        && diploma.graduationYear
      )
      && form.email.trim()
      && form.password.trim().length >= 6
    ),
    true
  ];

  const canContinue = stepValidations[step];

  const handleContinue = () => {
    if (!canContinue) {
      return;
    }
    if (step < labels.length - 1) {
      setMaxReachedStep((current) => Math.max(current, step + 1));
      setStep((current) => current + 1);
      return;
    }
    setShowCompletionCelebration(true);
  };

  const continueFromInterstitial = () => {
    if (activeInterstitialStep === null) {
      return;
    }
    setSeenInterstitials((current) => ({ ...current, [activeInterstitialStep]: true }));
    setActiveInterstitialStep(null);
  };

  useEffect(() => {
    if (activeInterstitialStep !== null) {
      return;
    }
    if (interstitialByStep[step] && !seenInterstitials[step]) {
      setActiveInterstitialStep(step);
    }
  }, [step, seenInterstitials, activeInterstitialStep, interstitialByStep]);

  const finishWebOnboarding = () => {
    input.onFinish({
      fullName: form.fullName,
      email: form.email,
      password: form.password,
      professionalTitle: form.professionalTitle,
      specialization: form.specialization,
      experienceBand: form.experienceBand,
      practiceBand: form.practiceBand,
      gender: form.gender,
      birthCountry: form.birthCountry,
      focusAreas: form.focusAreas,
      languages: form.languages,
      yearsExperience: form.yearsExperience.trim() ? Number(form.yearsExperience) : null,
      bio: form.about,
      shortDescription: form.shortDescription,
      therapeuticApproach: form.methodology,
      sessionPriceUsd: form.sessionPrice.trim() ? Number(form.sessionPrice) : null,
      discount4: form.discount4.trim() ? Number(form.discount4) : null,
      discount8: form.discount8.trim() ? Number(form.discount8) : null,
      discount12: form.discount12.trim() ? Number(form.discount12) : null,
      photoUrl: form.profilePhotoPreview || null,
      videoUrl: form.videoPreview || null,
      videoCoverUrl: form.videoCoverPreview || null,
      stripeDocUrl: form.stripeDocPreview || null,
      stripeVerified: form.stripeVerified,
      stripeVerificationStarted: form.stripeVerificationStarted,
      diplomas: form.diplomas
        .filter((diploma) => diploma.institution.trim() && diploma.degree.trim() && diploma.startYear && diploma.graduationYear)
        .map((diploma) => ({
          institution: diploma.institution.trim(),
          degree: diploma.degree.trim(),
          startYear: Number(diploma.startYear),
          graduationYear: Number(diploma.graduationYear),
          documentUrl: diploma.diplomaPreview || null
        }))
    });
  };

  useEffect(() => {
    if (activeInterstitialStep === null && !showCompletionCelebration) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (showCompletionCelebration) {
        setShowCompletionCelebration(false);
        return;
      }

      if (activeInterstitialStep !== null) {
        continueFromInterstitial();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeInterstitialStep, showCompletionCelebration]);

  return {
    step,
    setStep,
    maxReachedStep,
    labels,
    stepSubtitles,
    form,
    years,
    webSpecializationOptions,
    webPhotoInputRef,
    webVideoInputRef,
    webVideoCoverInputRef,
    webDiplomaInputRef,
    webStripeDocInputRef,
    activeDiplomaUploadIndex,
    setActiveDiplomaUploadIndex,
    update,
    updateDiploma,
    addDiploma,
    toggleLanguage,
    toggleFocusArea,
    clampDiscountInput,
    discountedPriceLabel,
    canContinue,
    handleContinue,
    activeInterstitialStep,
    interstitialByStep,
    continueFromInterstitial,
    showCompletionCelebration,
    setShowCompletionCelebration,
    finishWebOnboarding
  };
}
