import { SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";

const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

const API_BASE = viteEnv.VITE_API_URL?.trim() || "http://localhost:4000";

/** Sin barra final. En prod default: dominios canónicos; sobreescribí con VITE_* en build si hace falta. */
function portalUrl(explicit: string | undefined, devUrl: string, prodDefault: string): string {
  const trimmed = explicit?.trim();
  const raw = trimmed && trimmed.length > 0 ? trimmed : import.meta.env.DEV ? devUrl : prodDefault;
  return raw.replace(/\/+$/, "");
}

const PROFESSIONAL_PORTAL_URL = portalUrl(
  viteEnv.VITE_PROFESSIONAL_PORTAL_URL,
  "http://localhost:5174",
  "https://pro.motivarcare.com"
);

const localProfessionalHeroImage = "/images/professional-hero.jpg";
const fallbackProfessionalHeroImage = "/images/professional-hero.svg";
const heroWidths = [480, 768, 1280, 1600] as const;

const sessionImage = localProfessionalHeroImage;

function handleImageFallback(event: SyntheticEvent<HTMLImageElement>, fallback: string) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === "true") {
    return;
  }
  image.dataset.fallbackApplied = "true";
  image.src = fallback;
}

function buildResponsiveSrcSet(baseName: string, ext: "avif" | "webp" | "jpg") {
  return heroWidths.map((width) => `/images/${baseName}-${width}.${ext} ${width}w`).join(", ");
}

function shouldUseOptimizedHeroVariants(imageUrl: string, originalPath: string) {
  return imageUrl === originalPath || imageUrl.endsWith(originalPath);
}

function HeroShowcaseImage(props: {
  src: string;
  alt: string;
  fallback: string;
  originalPath: string;
  optimizedBaseName: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
}) {
  const {
    src,
    alt,
    fallback,
    originalPath,
    optimizedBaseName,
    loading = "lazy",
    fetchPriority = "auto",
    sizes = "(max-width: 700px) 90vw, 42vw"
  } = props;

  if (!shouldUseOptimizedHeroVariants(src, originalPath)) {
    return <img src={src} alt={alt} loading={loading} fetchPriority={fetchPriority} decoding="async" onError={(event) => handleImageFallback(event, fallback)} />;
  }

  return (
    <picture>
      <source type="image/avif" srcSet={buildResponsiveSrcSet(optimizedBaseName, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={buildResponsiveSrcSet(optimizedBaseName, "webp")} sizes={sizes} />
      <img
        src={`/images/${optimizedBaseName}-1280.jpg`}
        srcSet={buildResponsiveSrcSet(optimizedBaseName, "jpg")}
        sizes={sizes}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        onError={(event) => handleImageFallback(event, fallback)}
      />
    </picture>
  );
}

type BlogStatus = "draft" | "published";
type Language = "es" | "en" | "pt";

interface PlatformMetric {
  id: string;
  title: string;
  description: string;
}

interface ReviewItem {
  id: string;
  name: string;
  role: string;
  reviewDate?: string;
  relativeDate: string;
  text: string;
  rating: number;
  avatar: string;
  accent: string;
}

interface BlogPost {
  id: string;
  title: string;
  titleLink?: string;
  subtitle?: string;
  slug: string;
  excerpt: string;
  category: string;
  coverImage: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  publishedAt: string;
  readTime: number;
  likes: number;
  tags: string[];
  status: BlogStatus;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  body: string;
}

interface LocalizedPostContent {
  title: string;
  subtitle?: string;
  excerpt: string;
  body?: string;
}

interface BlogComment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  createdAt: string;
  likes: number;
  reply?: {
    author: string;
    text: string;
    createdAt: string;
  };
}

interface ResourceLink {
  label: string;
  href: string;
}

interface LandingSettingsResponse {
  settings: {
    patientHeroImageUrl: string | null;
    patientDesktopImageUrl?: string | null;
    patientMobileImageUrl?: string | null;
    professionalDesktopImageUrl?: string | null;
    professionalMobileImageUrl?: string | null;
  };
}

interface WebContentResponse {
  settings: {
    patientHeroImageUrl: string | null;
    patientDesktopImageUrl: string | null;
    patientMobileImageUrl: string | null;
    professionalDesktopImageUrl: string | null;
    professionalMobileImageUrl: string | null;
  };
  reviews: ReviewItem[];
  blogPosts: BlogPost[];
}

const UI_TEXT: Record<
  Language,
  {
    heroTitle: string;
    patientHeadline: string;
    patients: string;
    psychologists: string;
    professionalHeadline: string;
    patientCopy: string;
    professionalCopy: string;
    patientPortal: string;
    professionalPortal: string;
    reviewsTitle: string;
    reviewsTag: string;
    reviewsNavPrev: string;
    reviewsNavNext: string;
    blogTitleA: string;
    blogTitleB: string;
    blogIntro: string;
    blogSearch: string;
    found: string;
    readMore: string;
    page: string;
    of: string;
    prev: string;
    next: string;
    close: string;
    like: string;
    unlike: string;
    comment: string;
    comments: string;
    writeComment: string;
    publish: string;
    articlePrev: string;
    articleNext: string;
    usefulLinks: string;
    likesLabel: string;
    yourUser: string;
    company: string;
    useful: string;
    supportLine: string;
    patientPortalShort: string;
    professionalPortalShort: string;
    footerLanguage: string;
    footerBrand: string;
    terms: string;
    privacy: string;
    acceptableUse: string;
    rights: string;
    metricsAria: string;
    cardsAria: string;
    reviewsAria: string;
    blogAria: string;
    categoriesAria: string;
    myAccount: string;
    accountAccessTitle: string;
    accountAccessCopy: string;
    accountPortalPatient: string;
    accountPortalProfessional: string;
  }
> = {
  es: {
    heroTitle: "MotivarCare para profesionales: tu consulta online, sin fricción",
    patientHeadline: "Terapia online desde tu teléfono o notebook…",
    patients: "Pacientes",
    psychologists: "Psicólogos",
    professionalHeadline: "Conectá con nuevos pacientes y administrá tu práctica con claridad",
    patientCopy: "Una experiencia simple para reservar, entrar a sesión y comenzar tu proceso terapéutico.",
    professionalCopy:
      "Gestioná agenda, videollamadas y seguimiento en un solo lugar. Menos logística, más foco clínico.",
    patientPortal: "Portal web para pacientes",
    professionalPortal: "Entrar al portal de profesionales",
    reviewsTitle: "Experiencias de quienes ya usan la plataforma",
    reviewsTag: "Reseñas",
    reviewsNavPrev: "Ver reseñas anteriores",
    reviewsNavNext: "Ver reseñas siguientes",
    blogTitleA: "Biblioteca clínica MotivarCare:",
    blogTitleB: "lecturas breves para aplicar en tu práctica.",
    blogIntro:
      "Textos claros sobre ansiedad, vínculos, duelo, estrés y más: pensados para complementar tu trabajo con pacientes.",
    blogSearch: "Busca por temática…",
    found: "artículos encontrados",
    readMore: "Leer más",
    page: "Página",
    of: "de",
    prev: "Anterior",
    next: "Siguiente",
    close: "Cerrar artículo",
    like: "Me gusta",
    unlike: "Quitar me gusta",
    comment: "Comentar",
    comments: "Comentarios",
    writeComment: "Escribe tu comentario…",
    publish: "Publicar",
    articlePrev: "Artículo anterior",
    articleNext: "Artículo siguiente",
    usefulLinks: "Vínculos útiles",
    likesLabel: "me gusta",
    yourUser: "Tu usuario",
    company: "Compañía",
    useful: "Útil",
    supportLine: "Línea 988 de prevención del suicidio",
    patientPortalShort: "Portal pacientes",
    professionalPortalShort: "Portal psicólogos",
    footerLanguage: "Español",
    footerBrand: "Herramientas digitales para profesionales que acompañan el bienestar emocional.",
    terms: "Términos y condiciones",
    privacy: "Política de privacidad",
    acceptableUse: "Política de uso aceptable",
    rights: "Todos los derechos reservados.",
    metricsAria: "Métricas de MotivarCare",
    cardsAria: "Opciones de plataforma",
    reviewsAria: "Reseñas de usuarios",
    blogAria: "Blog de salud mental",
    categoriesAria: "Categorías del blog",
    myAccount: "Mi cuenta",
    accountAccessTitle: "Portal para profesionales",
    accountAccessCopy: "Ingresá con tu cuenta para gestionar pacientes, sesiones y tu perfil.",
    accountPortalPatient: "Soy paciente",
    accountPortalProfessional: "Ir al portal de profesionales"
  },
  en: {
    heroTitle: "MotivarCare for professionals: your online practice, streamlined",
    patientHeadline: "Online therapy from your phone or laptop.",
    patients: "Patients",
    psychologists: "Psychologists",
    professionalHeadline: "Reach new patients and run your practice with clarity",
    patientCopy: "A simple experience to book, join your session, and keep your process moving.",
    professionalCopy:
      "Manage scheduling, video sessions, and follow-up in one place. Less admin, more clinical focus.",
    patientPortal: "Web portal for patients",
    professionalPortal: "Open professional portal",
    reviewsTitle: "What colleagues and users say about the platform",
    reviewsTag: "Reviews",
    reviewsNavPrev: "See previous reviews",
    reviewsNavNext: "See next reviews",
    blogTitleA: "MotivarCare clinical library:",
    blogTitleB: "short reads for your practice.",
    blogIntro:
      "Clear articles on anxiety, relationships, grief, stress, and more—written to support your work with clients.",
    blogSearch: "Search by topic...",
    found: "articles found",
    readMore: "Read more",
    page: "Page",
    of: "of",
    prev: "Previous",
    next: "Next",
    close: "Close article",
    like: "Like",
    unlike: "Unlike",
    comment: "Comment",
    comments: "Comments",
    writeComment: "Write your comment...",
    publish: "Post",
    articlePrev: "Previous article",
    articleNext: "Next article",
    usefulLinks: "Useful links",
    likesLabel: "likes",
    yourUser: "Your user",
    company: "Company",
    useful: "Useful",
    supportLine: "988 suicide prevention hotline",
    patientPortalShort: "Patient portal",
    professionalPortalShort: "Psychologist portal",
    footerLanguage: "English",
    footerBrand: "Digital tools for professionals who support mental wellbeing.",
    terms: "Terms and conditions",
    privacy: "Privacy policy",
    acceptableUse: "Acceptable use policy",
    rights: "All rights reserved.",
    metricsAria: "MotivarCare metrics",
    cardsAria: "Platform options",
    reviewsAria: "User reviews",
    blogAria: "Mental health blog",
    categoriesAria: "Blog categories",
    myAccount: "My account",
    accountAccessTitle: "Professional portal",
    accountAccessCopy: "Sign in to manage clients, sessions, and your profile.",
    accountPortalPatient: "I am a patient",
    accountPortalProfessional: "Open professional portal"
  },
  pt: {
    heroTitle: "MotivarCare para profissionais: sua consulta online, sem atrito",
    patientHeadline: "Terapia online pelo celular ou notebook.",
    patients: "Pacientes",
    psychologists: "Psicólogos",
    professionalHeadline: "Conecte-se a novos pacientes e organize sua prática com clareza",
    patientCopy: "Uma experiência simples para agendar, entrar na sessão e continuar o processo.",
    professionalCopy:
      "Gerencie agenda, videochamadas e acompanhamento em um só lugar. Menos burocracia, mais foco clínico.",
    patientPortal: "Portal web para pacientes",
    professionalPortal: "Abrir portal do profissional",
    reviewsTitle: "Experiências de quem já usa a plataforma",
    reviewsTag: "Avaliações",
    reviewsNavPrev: "Ver reviews anteriores",
    reviewsNavNext: "Ver proximas reviews",
    blogTitleA: "Biblioteca clínica MotivarCare:",
    blogTitleB: "leituras curtas para a sua prática.",
    blogIntro:
      "Textos claros sobre ansiedade, vínculos, luto, estresse e outros temas para apoiar seu trabalho com pacientes.",
    blogSearch: "Buscar por tema...",
    found: "artigos encontrados",
    readMore: "Ler mais",
    page: "Pagina",
    of: "de",
    prev: "Anterior",
    next: "Proxima",
    close: "Fechar artigo",
    like: "Curtir",
    unlike: "Descurtir",
    comment: "Comentar",
    comments: "Comentarios",
    writeComment: "Escreva seu comentario...",
    publish: "Publicar",
    articlePrev: "Artigo anterior",
    articleNext: "Proximo artigo",
    usefulLinks: "Links uteis",
    likesLabel: "curtidas",
    yourUser: "Seu usuario",
    company: "Empresa",
    useful: "Util",
    supportLine: "Linha 988 de prevencao ao suicidio",
    patientPortalShort: "Portal pacientes",
    professionalPortalShort: "Portal psicologos",
    footerLanguage: "Português",
    footerBrand: "Ferramentas digitais para profissionais que cuidam do bem-estar emocional.",
    terms: "Termos e condicoes",
    privacy: "Politica de privacidade",
    acceptableUse: "Politica de uso aceitavel",
    rights: "Todos os direitos reservados.",
    metricsAria: "Metricas da MotivarCare",
    cardsAria: "Opcoes da plataforma",
    reviewsAria: "Avaliacoes de usuarios",
    blogAria: "Blog de saude mental",
    categoriesAria: "Categorias do blog",
    myAccount: "Minha conta",
    accountAccessTitle: "Portal do profissional",
    accountAccessCopy: "Entre com sua conta para gerir pacientes, sessões e seu perfil.",
    accountPortalPatient: "Sou paciente",
    accountPortalProfessional: "Abrir portal do profissional"
  }
};

const metricsByLanguage: Record<Language, PlatformMetric[]> = {
  es: [
    {
      id: "psychologists",
      title: "Más de 150 profesionales certificados",
      description: "Profesionales seleccionados y matriculados."
    },
    {
      id: "sessions",
      title: "+10 000 sesiones coordinadas en la plataforma",
      description: "Encuentros entre pacientes y profesionales, con herramientas integradas."
    },
    {
      id: "wellbeing",
      title: "Soporte dedicado para tu práctica digital",
      description: "Equipo y recursos para que la experiencia en la plataforma sea fluida."
    }
  ],
  en: [
    {
      id: "psychologists",
      title: "More than 150 certified professionals",
      description: "Selected and licensed professionals."
    },
    {
      id: "sessions",
      title: "+10,000 sessions coordinated on the platform",
      description: "Meetings between clients and professionals with integrated tools."
    },
    {
      id: "wellbeing",
      title: "Dedicated support for your digital practice",
      description: "Team and resources to keep the platform experience smooth."
    }
  ],
  pt: [
    {
      id: "psychologists",
      title: "Mais de 150 profissionais certificados",
      description: "Profissionais selecionados e registrados."
    },
    {
      id: "sessions",
      title: "+10 000 sessoes coordenadas na plataforma",
      description: "Encontros entre pacientes e profissionais, com ferramentas integradas."
    },
    {
      id: "wellbeing",
      title: "Suporte dedicado à sua prática digital",
      description: "Equipe e recursos para uma experiência fluida na plataforma."
    }
  ]
};

const initialReviews: ReviewItem[] = [
  {
    id: "melanie",
    name: "Melanie",
    role: "Paciente",
    relativeDate: "hace 19 días",
    text: "Comencé hace un tiempo mi terapia y estoy muy contenta. Siento atención real en cada sesión.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#0f4f79"
  },
  {
    id: "virginia",
    name: "Virginia",
    role: "Paciente",
    relativeDate: "hace 24 días",
    text: "La comunicación es clara y me siento a gusto. Todo el proceso de reserva y pago es simple.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#7a5cff"
  },
  {
    id: "paulo",
    name: "Paulo",
    role: "Paciente",
    relativeDate: "hace 25 días",
    text: "Excelente experiencia. Se nota cercanía profesional y seguridad desde la primera sesión.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#2f9d83"
  },
  {
    id: "jose",
    name: "José",
    role: "Paciente",
    relativeDate: "hace 26 días",
    text: "Para mí fue una profesional excelente. Muy receptiva y humana para trabajar temas complejos.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#be4d63"
  },
  {
    id: "lucia",
    name: "Lucía",
    role: "Paciente",
    relativeDate: "hace 14 días",
    text: "Me sentí escuchada desde el primer contacto. El proceso de agenda y seguimiento funciona excelente.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#3d7cc9"
  },
  {
    id: "martin",
    name: "Martín",
    role: "Paciente",
    relativeDate: "hace 11 días",
    text: "La sesión por video fue estable y sin cortes. Muy buena experiencia general.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#597ef7"
  },
  {
    id: "sabina",
    name: "Sabina",
    role: "Paciente",
    relativeDate: "hace 9 días",
    text: "Pude encontrar terapeuta acorde a lo que buscaba en muy poco tiempo.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#9a61ff"
  },
  {
    id: "camilo",
    name: "Camilo",
    role: "Paciente",
    relativeDate: "hace 8 días",
    text: "Muy claro el flujo para reservar y pagar. Todo está ordenado y sin confusiones.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#2f9d83"
  },
  {
    id: "valeria",
    name: "Valeria",
    role: "Paciente",
    relativeDate: "hace 6 días",
    text: "Aprecio mucho la calidez de la profesional y la facilidad para continuar el tratamiento.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#d96b6b"
  },
  {
    id: "sergio",
    name: "Sergio",
    role: "Paciente",
    relativeDate: "hace 5 días",
    text: "Me gustó la puntualidad y la calidad del encuentro. Recomiendo totalmente.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#4766b0"
  },
  {
    id: "agostina",
    name: "Agostina",
    role: "Paciente",
    relativeDate: "hace 4 días",
    text: "La plataforma es intuitiva y me da confianza para sostener el proceso.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#8e65f5"
  },
  {
    id: "tomas",
    name: "Tomás",
    role: "Paciente",
    relativeDate: "hace 3 días",
    text: "Excelente seguimiento entre sesiones. Se nota que está pensado para pacientes reales.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#3f90c7"
  },
  {
    id: "julieta",
    name: "Julieta",
    role: "Paciente",
    relativeDate: "hace 3 días",
    text: "Gran experiencia, me sentí acompañada en todo momento. Muy recomendable.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#6c5ce7"
  },
  {
    id: "nicolas",
    name: "Nicolás",
    role: "Paciente",
    relativeDate: "hace 2 días",
    text: "Me ayudó mucho tener una opción online flexible para organizar mis horarios.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#5e8f49"
  },
  {
    id: "maria-paz",
    name: "María Paz",
    role: "Paciente",
    relativeDate: "hace 2 días",
    text: "La calidad humana del equipo y del profesional asignado fue clave para mi mejora.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=200&h=200&q=80",
    accent: "#bf5f83"
  }
];

const reviewTextByLanguage: Record<"en" | "pt", Record<string, string>> = {
  en: {
    melanie: "I started therapy a while ago and I am very happy. I feel real care in every session.",
    virginia: "Communication is clear and I feel comfortable. Booking and payment are simple.",
    paulo: "Excellent experience. You can feel professional closeness and safety from the first session.",
    jose: "For me she was an all-star professional. Very receptive and human for complex topics.",
    lucia: "I felt heard from the first contact. Scheduling and follow-up work really well.",
    martin: "The video session was stable with no interruptions. Great overall experience.",
    sabina: "I found a therapist that matched what I needed in very little time.",
    camilo: "The booking and payment flow is very clear. Everything is organized and easy.",
    valeria: "I really value the therapist's warmth and how easy it is to continue treatment.",
    sergio: "I liked the punctuality and quality of the session. I fully recommend it.",
    agostina: "The platform is intuitive and gives me confidence to stay consistent with therapy.",
    tomas: "Excellent follow-up between sessions. It's clearly built for real patients.",
    julieta: "Great experience, I felt supported at all times. Highly recommended.",
    nicolas: "Having a flexible online option helped me a lot to organize my schedule.",
    "maria-paz": "The team's human quality and the assigned therapist were key to my improvement."
  },
  pt: {
    melanie: "Comecei terapia ha algum tempo e estou muito contente. Sinto cuidado real em cada sessao.",
    virginia: "A comunicacao e clara e me sinto confortavel. Reserva e pagamento sao simples.",
    paulo: "Experiencia excelente. Existe proximidade profissional e seguranca desde a primeira sessao.",
    jose: "Para mim foi uma profissional nota dez. Muito receptiva e humana para temas complexos.",
    lucia: "Me senti escutada desde o primeiro contato. Agenda e acompanhamento funcionam muito bem.",
    martin: "A sessao por video foi estavel, sem cortes. Experiencia geral muito boa.",
    sabina: "Consegui encontrar uma terapeuta alinhada ao que eu buscava em pouco tempo.",
    camilo: "O fluxo para reservar e pagar e bem claro. Tudo esta organizado e sem confusoes.",
    valeria: "Valorizo muito o acolhimento da profissional e a facilidade para seguir no tratamento.",
    sergio: "Gostei da pontualidade e da qualidade do encontro. Recomendo totalmente.",
    agostina: "A plataforma e intuitiva e me da confianca para sustentar o processo.",
    tomas: "Excelente acompanhamento entre sessoes. Da para ver que foi pensado para pacientes reais.",
    julieta: "Otima experiencia, me senti acompanhada o tempo todo. Super recomendado.",
    nicolas: "Ter uma opcao online flexivel me ajudou muito a organizar meus horarios.",
    "maria-paz": "A qualidade humana da equipe e da profissional foi chave para minha melhora."
  }
};

const reviewTextFallbackByLanguage: Record<"en" | "pt", Record<string, string>> = {
  en: {
    "Gracias por ayudarme con este servicio online, que me permite  sesiones con profesionales de primera a menor costo! ":
      "Thank you for helping me with this online service, which lets me have sessions with top professionals at a lower cost!",
    "Muy buena plataforma para mantener continuidad terapéutica.":
      "A very good platform to maintain therapeutic continuity.",
    "El seguimiento profesional fue claro y cercano desde el inicio.":
      "Professional follow-up felt clear and close from the very beginning.",
    "Excelente experiencia. Pude organizar mis sesiones sin fricción.":
      "Excellent experience. I was able to organize my sessions without friction."
  },
  pt: {
    "Gracias por ayudarme con este servicio online, que me permite  sesiones con profesionales de primera a menor costo! ":
      "Obrigado por me ajudar com este servico online, que me permite ter sessoes com profissionais de primeira por um custo menor!",
    "Muy buena plataforma para mantener continuidad terapéutica.":
      "Muito boa plataforma para manter a continuidade terapeutica.",
    "El seguimiento profesional fue claro y cercano desde el inicio.":
      "O acompanhamento profissional foi claro e proximo desde o inicio.",
    "Excelente experiencia. Pude organizar mis sesiones sin fricción.":
      "Experiencia excelente. Consegui organizar minhas sessoes sem friccao."
  }
};

const blogContentByLanguage: Record<"en" | "pt", Record<string, LocalizedPostContent>> = {
  en: {
    "blog-1": {
      title: "Breathing exercises for anxiety: 5 techniques that help",
      subtitle: "Clinical Team - Motivar Care · November 17, 2025 · 6 min read",
      excerpt: "Five practical breathing techniques to lower physical activation and recover control."
    },
    "blog-2": {
      title: "What the comfort zone is and how to leave it without overwhelm",
      excerpt: "Small steps to expand confidence without forcing extreme changes."
    },
    "blog-3": {
      title: "Generational trauma: how to identify it and begin healing",
      excerpt: "Common signs and first resources to interrupt repeated patterns."
    },
    "blog-4": {
      title: "5 techniques to overcome the fear of anxiety tremors",
      subtitle: "Clinical Team - Motivar Care · April 4, 2025 · 6 min read",
      excerpt: "Practical tools to understand anxiety tremors and regain body confidence."
    },
    "blog-5": {
      title: "How to set boundaries without guilt in close relationships",
      excerpt: "Concrete strategies to protect your wellbeing without breaking connection."
    },
    "blog-6": {
      title: "Grief: 7 keys to move through it with more support",
      excerpt: "A realistic guide to navigate difficult days without impossible self-demands."
    },
    "blog-7": {
      title: "Anxiety insomnia: a 20-minute night routine",
      excerpt: "Simple steps to lower mental activation before sleep."
    },
    "blog-8": {
      title: "Self-esteem and self-talk: how to stop attacking yourself",
      subtitle: "Clinical Team - Motivar Care · February 22, 2026 · 7 min read",
      excerpt: "How to transform harsh self-criticism into a fairer and more balanced inner voice."
    },
    "blog-9": {
      title: "Panic attacks: what to do in the first 5 minutes",
      excerpt: "A short protocol to regain orientation and control when fear spikes."
    },
    "blog-10": {
      title: "Emotional dependency: early signs and how to work on it",
      excerpt: "Identify common patterns and start building affective autonomy."
    },
    "blog-11": {
      title: "Work stress: how to recognize it and restore balance in daily life",
      subtitle: "Clinical Team - Motivar Care · March 7, 2026 · 7 min read",
      excerpt: "Keys to detect work stress early and regulate it with practical tools."
    },
    "blog-12": {
      title: "Social anxiety: exercises to speak in public without freezing",
      subtitle: "Clinical Team - Motivar Care · February 26, 2026 · 7 min read",
      excerpt: "Social anxiety is common and can be worked through with concrete strategies."
    },
    "blog-13": {
      title: "How to support a family member with depression",
      excerpt: "What to say, what to avoid, and how to offer sustainable support."
    },
    "blog-14": {
      title: "Online therapy: 9 questions to choose the right professional",
      excerpt: "A practical checklist to make a better decision from the first interview."
    },
    "blog-15": {
      title: "Mindfulness for beginners: a 7-minute practice",
      excerpt: "A short exercise to train focus and reduce daily rumination."
    },
    "blog-16": {
      title: "Breakup recovery: how to support yourself during the first weeks",
      subtitle: "Clinical Team - Motivar Care · December 2, 2025 · 8 min read",
      excerpt: "Practical keys to navigate separation with greater emotional stability."
    },
    "blog-17": {
      title: "Emotional procrastination: why we postpone what matters",
      subtitle: "Clinical Team - Motivar Care · March 3, 2026 · 7 min read",
      excerpt: "Understand the emotional root of delay and build consistent action."
    },
    "blog-18": {
      title: "How to prepare for your first online therapy session",
      subtitle: "Clinical Team - Motivar Care · March 4, 2025 · 6 min read",
      excerpt: "A practical checklist to start your therapeutic process with clarity."
    }
  },
  pt: {
    "blog-1": {
      title: "Exercicios para ansiedade: 5 tecnicas de respiracao que ajudam",
      subtitle: "Equipe Clínica - Motivar Care · 17 de novembro de 2025 · 6 min de leitura",
      excerpt: "Cinco tecnicas praticas de respiracao para reduzir ativacao fisica e recuperar controle."
    },
    "blog-2": {
      title: "O que e a zona de conforto e como sair sem se sobrecarregar",
      excerpt: "Micro passos para ampliar confianca sem exigir mudancas extremas."
    },
    "blog-3": {
      title: "Trauma geracional: como identificar e comecar a curar",
      excerpt: "Sinais frequentes e recursos iniciais para romper padroes repetidos."
    },
    "blog-4": {
      title: "5 tecnicas para superar o medo dos tremores de ansiedade",
      subtitle: "Equipe Clínica - Motivar Care · 4 de abril de 2025 · 6 min de leitura",
      excerpt: "Ferramentas concretas para entender tremores e recuperar seguranca corporal."
    },
    "blog-5": {
      title: "Como colocar limites sem culpa em relacionamentos proximos",
      excerpt: "Estrategias concretas para cuidar dos vinculos sem se abandonar."
    },
    "blog-6": {
      title: "Luto: 7 chaves para atravessar com mais acolhimento",
      excerpt: "Um guia para se sustentar em dias dificeis sem exigencias impossiveis."
    },
    "blog-7": {
      title: "Insônia por ansiedade: rotina noturna em 20 minutos",
      excerpt: "Passos simples para reduzir ativacao mental antes de dormir."
    },
    "blog-8": {
      title: "Autoestima e dialogo interno: como parar de se atacar",
      subtitle: "Equipe Clínica - Motivar Care · 22 de fevereiro de 2026 · 7 min de leitura",
      excerpt: "Como transformar autocritica excessiva em uma avaliacao mais justa e realista."
    },
    "blog-9": {
      title: "Ataques de panico: o que fazer nos primeiros 5 minutos",
      excerpt: "Protocolo breve para recuperar orientacao e controle quando o medo sobe."
    },
    "blog-10": {
      title: "Dependencia emocional: sinais precoces e como trabalhar",
      excerpt: "Identifique padroes frequentes e fortaleça autonomia afetiva."
    },
    "blog-11": {
      title: "Estresse no trabalho: como reconhecer e recuperar equilibrio no dia a dia",
      subtitle: "Equipe Clínica - Motivar Care · 7 de marco de 2026 · 7 min de leitura",
      excerpt: "Chaves para detectar estresse laboral cedo e regular com ferramentas praticas."
    },
    "blog-12": {
      title: "Ansiedade social: exercicios para falar em publico sem travar",
      subtitle: "Equipe Clínica - Motivar Care · 26 de fevereiro de 2026 · 7 min de leitura",
      excerpt: "A ansiedade social e comum e pode ser trabalhada com estrategias concretas."
    },
    "blog-13": {
      title: "Como apoiar um familiar com depressao",
      excerpt: "O que dizer, o que evitar e como sustentar ajuda sem se esgotar."
    },
    "blog-14": {
      title: "Terapia online: 9 perguntas para escolher o profissional",
      excerpt: "Checklist pratico para tomar uma boa decisao desde a primeira conversa."
    },
    "blog-15": {
      title: "Mindfulness para iniciantes: pratica de 7 minutos",
      excerpt: "Exercicio breve para treinar foco e reduzir ruminacao diaria."
    },
    "blog-16": {
      title: "Ruptura amorosa: como se sustentar nas primeiras semanas",
      subtitle: "Equipe Clínica - Motivar Care · 2 de dezembro de 2025 · 8 min de leitura",
      excerpt: "Recursos praticos para atravessar separacao com mais estabilidade emocional."
    },
    "blog-17": {
      title: "Procrastinacao emocional: por que adiamos o importante",
      subtitle: "Equipe Clínica - Motivar Care · 3 de marco de 2026 · 7 min de leitura",
      excerpt: "Entenda a raiz emocional da procrastinacao e construa acao consistente."
    },
    "blog-18": {
      title: "Como se preparar para sua primeira sessao de terapia online",
      subtitle: "Equipe Clínica - Motivar Care · 4 de marco de 2025 · 6 min de leitura",
      excerpt: "Checklist pratico para comecar o processo terapeutico com clareza."
    }
  }
};

const blogPosts: BlogPost[] = [
  {
    id: "blog-1",
    title: "Ejercicios para la ansiedad: 5 técnicas de respiración que ayudan",
    subtitle: "Equipo Clínico - Motivar Care · 17 de noviembre de 2025 · 6 min de lectura",
    slug: "ejercicios-ansiedad-tecnicas-respiracion",
    excerpt: "Cinco técnicas de respiración prácticas para bajar activación física y recuperar control.",
    category: "Ansiedad",
    coverImage:
      "https://images.pexels.com/photos/3811082/pexels-photo-3811082.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2025-11-17",
    readTime: 6,
    likes: 213,
    tags: ["ansiedad", "respiracion", "autocuidado"],
    status: "published",
    featured: true,
    seoTitle: "Técnicas de respiración para ansiedad | MotivarCare",
    seoDescription: "Aprende 5 técnicas prácticas de respiración para bajar ansiedad y regular emociones.",
    body:
      "La ansiedad puede aparecer de forma repentina y generar una sensacion de desorden en el cuerpo. Muchas personas describen sintomas como respiracion corta, tension muscular, inquietud interna y pensamientos que se aceleran.\n\nCuando esto sucede, el cuerpo entra en un estado de alerta que dificulta recuperar la calma rapidamente.\n\nUna herramienta simple y efectiva para intervenir en estos momentos son las tecnicas de respiracion guiada. Estas practicas no reemplazan un tratamiento psicologico cuando es necesario, pero pueden ayudarte a recuperar control y reducir la intensidad del malestar.\n\nCon practica regular, la respiracion consciente se convierte en un recurso util para regular el sistema nervioso y evitar que la ansiedad escale.\n\n## Por que la respiracion ayuda a regular la ansiedad\nLa respiracion esta directamente conectada con el sistema nervioso. Cuando respiramos de forma rapida y superficial, el cuerpo interpreta que existe una amenaza y mantiene activado el estado de alerta.\n\nEn cambio, cuando respiramos de forma lenta y profunda, se activa el sistema nervioso parasimpatico, responsable de la respuesta de relajacion.\n\nUn cambio tan simple como alargar la exhalacion puede enviar una senal fisiologica de calma al cerebro.\n\nPor eso muchas intervenciones breves para la ansiedad comienzan por trabajar la respiracion.\n\n## Primer paso: crear una base de calma\nAntes de comenzar con cualquier ejercicio de respiracion, es importante preparar el cuerpo.\n\nPuedes hacerlo de forma sencilla:\n\n- apoya ambos pies en el suelo\n- endereza suavemente la espalda\n- relaja los hombros\n- lleva la atencion al ritmo de tu respiracion\n\nLuego comienza a alargar la exhalacion ligeramente mas que la inhalacion.\n\nPor ejemplo, puedes inhalar contando hasta cuatro y exhalar contando hasta seis.\n\nEste pequeno cambio ayuda a reducir la activacion fisiologica.\n\n## Cinco tecnicas de respiracion que pueden ayudarte\nEstas practicas pueden utilizarse en momentos de ansiedad o incorporarse como habito diario.\n\n### 1. Respiracion diafragmatica\nColoca una mano en el pecho y otra en el abdomen.\n\nInhala lentamente por la nariz intentando que se eleve el abdomen mas que el pecho.\n\nExhala de forma lenta por la boca.\n\nEste ejercicio favorece una respiracion mas profunda y relajada.\n\n### 2. Respiracion 4-6\nInhala por la nariz durante cuatro segundos.\n\nExhala lentamente durante seis segundos.\n\nRepite durante dos o tres minutos.\n\nAlargar la exhalacion ayuda a activar la respuesta de relajacion del cuerpo.\n\n### 3. Respiracion en caja (box breathing)\nEsta tecnica es utilizada incluso en contextos de alto estres.\n\nEl ritmo es el siguiente:\n\n- inhalar 4 segundos\n- sostener el aire 4 segundos\n- exhalar 4 segundos\n- sostener 4 segundos\n\nRepetir durante varios ciclos.\n\nAyuda a estabilizar la respiracion y enfocar la mente.\n\n### 4. Respiracion consciente con conteo\nInhala contando lentamente hasta cinco.\n\nExhala contando nuevamente hasta cinco.\n\nEl objetivo no es controlar la respiracion de forma rigida, sino mantener la atencion en el conteo.\n\nEsto ayuda a interrumpir el flujo de pensamientos acelerados.\n\n### 5. Respiracion con pausa de regulacion\nInhala profundamente.\n\nExhala lentamente y al final de la exhalacion haz una pausa breve antes de volver a inhalar.\n\nEsta pausa natural puede generar una sensacion de descanso en el sistema nervioso.\n\n## Plan de accion en 3 pasos\nSi quieres empezar a aplicar estas herramientas de forma practica, puedes seguir este esquema simple.\n\n### 1. Identifica el disparador\nObserva que situaciones activan tu ansiedad.\n\nPuede tratarse de una conversacion dificil, una situacion laboral exigente o una preocupacion recurrente.\n\nReconocer el disparador es el primer paso para intervenir a tiempo.\n\n### 2. Reduce la activacion fisica\nCuando notes que la ansiedad comienza a aumentar, utiliza una tecnica breve de regulacion.\n\nPuedes elegir entre:\n\n- respiracion guiada durante dos minutos\n- una caminata corta\n- estiramientos suaves\n\nEstas intervenciones ayudan a disminuir la intensidad del malestar.\n\n### 3. Define una accion concreta\nUna vez que la activacion disminuye, decide una pequena accion para avanzar.\n\nPor ejemplo:\n\n- responder un mensaje pendiente\n- continuar una tarea\n- retomar una conversacion\n\nLos pasos pequenos suelen ser mas efectivos que intentar resolver todo de una vez.\n\n## Errores frecuentes al manejar la ansiedad\nUno de los errores mas comunes es evitar completamente las situaciones que generan ansiedad.\n\nAunque esta estrategia puede aliviar en el corto plazo, a largo plazo suele mantener el problema.\n\nMuchas intervenciones terapeuticas trabajan con exposicion gradual, donde la persona enfrenta estas situaciones de forma progresiva y acompanada.\n\nOtro error frecuente es intentar eliminar la ansiedad por completo.\n\nEn realidad, el objetivo suele ser aprender a regularla, no hacerla desaparecer.\n\n## Senales de progreso\nA medida que desarrollas habilidades de regulacion emocional, pueden aparecer algunos cambios positivos.\n\nPor ejemplo:\n\n- recuperas el foco con mayor rapidez\n- duermes mejor antes de situaciones desafiantes\n- disminuye la sensacion de urgencia interna\n- te resulta mas facil retomar actividades despues de un momento de ansiedad\n\nEstos avances suelen ser graduales, pero indican que el proceso esta funcionando.\n\n## Desarrollo clinico y herramientas aplicables\nEn el trabajo terapeutico, uno de los objetivos principales es transformar la comprension del problema en acciones sostenibles en la vida cotidiana.\n\nEsto incluye:\n\n- definir objetivos concretos\n- registrar avances\n- identificar obstaculos\n- revisar el proceso sin caer en el autojuicio\n\nCuando el proceso terapeutico se combina con practicas simples en la vida diaria, la mejora suele ser mas estable en el tiempo.\n\n## Implementacion semanal sugerida\nSemana 1:\n\nObservacion y registro de situaciones que activan ansiedad.\n\nSemana 2:\n\nAplicacion de una herramienta de regulacion, como la respiracion guiada.\n\nSemana 3:\n\nEvaluacion de avances, ajuste de estrategias y redefinicion de objetivos.\n\n## Cita destacada\n> No necesitas apagar tus emociones.\n> Necesitas aprender a regularlas.\n\n> Equipo Clínico - Motivar Care"
  },
  {
    id: "blog-2",
    title: "Qué es la zona de confort y cómo salir de ella sin abrumarte",
    slug: "zona-de-confort-como-salir",
    excerpt: "Micro pasos para expandir tu confianza sin exigir cambios extremos.",
    category: "Autoestima",
    coverImage:
      "https://images.pexels.com/photos/1461974/pexels-photo-1461974.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-02-18",
    readTime: 8,
    likes: 295,
    tags: ["autoestima", "habitos", "cambio"],
    status: "published",
    featured: false,
    seoTitle: "Zona de confort: como crecer sin bloquearte | MotivarCare",
    seoDescription: "Estrategias realistas para salir de la zona de confort sin sobreexigirte.",
    body:
      "La zona de confort no es mala por si misma: te da previsibilidad. El problema aparece cuando se vuelve una frontera fija.\n\nSalir de ahi no implica hacer cambios dramaticos. Funciona mejor avanzar con pasos pequenos y medibles.\n\nDefine una accion semanal que te acerque a lo que queres: hablar, pedir ayuda o probar una rutina nueva.\n\nLa repeticion de pequeños logros construye seguridad real y sostenible."
  },
  {
    id: "blog-3",
    title: "Trauma generacional: como identificarlo y empezar a sanar",
    slug: "trauma-generacional-identificar-sanar",
    excerpt: "Senales frecuentes y recursos iniciales para cortar patrones que se repiten.",
    category: "Traumas",
    coverImage:
      "https://images.pexels.com/photos/5699431/pexels-photo-5699431.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-02-18",
    readTime: 9,
    likes: 329,
    tags: ["trauma", "familia", "salud mental"],
    status: "published",
    featured: false,
    seoTitle: "Trauma generacional: primeras claves para sanar | MotivarCare",
    seoDescription: "Comprende patrones familiares repetidos y estrategias iniciales para trabajarlos en terapia.",
    body:
      "Algunas heridas emocionales no se originan solo en experiencias individuales, sino en historias familiares repetidas.\n\nIdentificar patrones de silencio, miedo o culpa ayuda a entender de donde vienen ciertas respuestas actuales.\n\nEl trabajo terapeutico permite diferenciar lo heredado de lo elegido, y abrir nuevas formas de relacionarte.\n\nPedir ayuda es una forma de cortar ciclos, no de culpar al pasado."
  },
  {
    id: "blog-4",
    title: "5 técnicas para superar el miedo a los temblores",
    subtitle: "Equipo Clínico - Motivar Care · 4 de abril de 2025 · 6 min de lectura",
    slug: "tecnicas-superar-miedo-temblores",
    excerpt: "Técnicas concretas para comprender los temblores por ansiedad y recuperar seguridad corporal.",
    category: "Fobias",
    coverImage:
      "https://images.pexels.com/photos/236380/pexels-photo-236380.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2025-04-04",
    readTime: 6,
    likes: 152,
    tags: ["fobias", "miedo", "regulacion"],
    status: "published",
    featured: false,
    seoTitle: "Miedo a los temblores: técnicas útiles | MotivarCare",
    seoDescription: "Recursos practicos para disminuir la respuesta de miedo ante sensaciones fisicas intensas.",
    body:
      "Cuando una persona experimenta ansiedad intensa, el cuerpo puede reaccionar con diferentes sintomas fisicos. Uno de los mas comunes y tambien uno de los que mas preocupan es el temblor.\n\nLas manos pueden vibrar ligeramente, la voz puede temblar o el cuerpo puede sentirse inestable por algunos momentos. Aunque estas reacciones son parte de la respuesta natural del sistema nervioso ante el estres, muchas personas interpretan el temblor como una senal de perdida de control o como algo peligroso.\n\nEsta interpretacion suele intensificar el miedo. El cuerpo reacciona con mas alerta, lo que aumenta la ansiedad y refuerza el circulo de tension.\n\nLa buena noticia es que existen estrategias concretas para comprender mejor estas sensaciones y aprender a manejarlas.\n\n## Por que el cuerpo tiembla cuando hay ansiedad\nEl temblor es una reaccion fisiologica normal cuando el sistema nervioso entra en estado de alerta. En situaciones de estres o miedo, el organismo libera adrenalina para preparar al cuerpo para actuar.\n\nEste proceso puede generar:\n\n- tension muscular\n- respiracion acelerada\n- aumento del ritmo cardiaco\n- temblores o vibraciones en el cuerpo\n\nAunque la sensacion puede resultar incomoda o desconcertante, en la mayoria de los casos no representa ningun peligro real para la salud.\n\nLo que suele generar mas malestar no es el temblor en si, sino la interpretacion que hacemos de el.\n\n## Cinco tecnicas para manejar el miedo a los temblores\nExisten herramientas que ayudan a reducir la intensidad de la ansiedad y recuperar la confianza corporal.\n\n### 1. Nombrar lo que esta ocurriendo\nEl primer paso suele ser reconocer lo que esta pasando sin dramatizar la experiencia.\n\nEn lugar de pensar algo grave esta ocurriendo, puede ser util decirse internamente: estoy experimentando ansiedad y mi cuerpo esta reaccionando.\n\nNombrar la experiencia ayuda a reducir la sensacion de amenaza y permite observar el sintoma con mayor distancia.\n\n### 2. Reducir los estimulos del entorno\nCuando el cuerpo esta en alerta, el exceso de estimulos puede aumentar la sensacion de tension.\n\nBuscar un espacio mas tranquilo, bajar el ritmo de actividad o tomarse unos minutos de pausa puede ayudar a que el sistema nervioso comience a regularse.\n\nPequenos cambios en el entorno suelen tener un impacto mayor de lo que parece.\n\n### 3. Utilizar respiracion pautada\nLa respiracion es una de las herramientas mas efectivas para reducir la activacion fisica.\n\nUna tecnica sencilla consiste en:\n\n- inhalar lentamente por la nariz durante cuatro segundos\n- exhalar por la boca durante seis segundos\n\nRepetir este ritmo durante algunos minutos puede ayudar a estabilizar el sistema nervioso.\n\n### 4. Practicar exposicion gradual\nUna reaccion frecuente frente a los temblores es evitar las situaciones donde aparecieron por primera vez.\n\nSin embargo, la evitacion suele mantener el miedo a largo plazo.\n\nUna estrategia mas util consiste en exponerse gradualmente a esas situaciones de forma planificada y segura.\n\nPor ejemplo:\n\n- participar brevemente en una reunion\n- hablar frente a un pequeno grupo de confianza\n- permanecer algunos minutos en una situacion que genera incomodidad\n\nCon el tiempo, el cerebro aprende que el temblor no implica peligro real.\n\n### 5. Reconstruir la confianza corporal\nEl objetivo no es eliminar completamente las sensaciones fisicas, sino aprender que pueden ser toleradas.\n\nA medida que la persona experimenta que puede seguir actuando incluso cuando aparece cierta ansiedad, se fortalece la confianza en su propio cuerpo.\n\nEste proceso suele ser gradual, pero genera cambios importantes en la relacion con el miedo.\n\n## Exposicion gradual: una estrategia clave\nLa evitacion puede aliviar el malestar en el corto plazo, pero suele reforzar la ansiedad en el largo plazo.\n\nPor eso muchos enfoques terapeuticos trabajan con planes de exposicion progresiva, donde la persona se acerca gradualmente a las situaciones que le generan miedo.\n\nEste proceso se realiza de forma escalonada y respetando los tiempos personales.\n\nEl objetivo no es forzar experiencias extremas, sino recuperar la sensacion de capacidad para actuar.\n\n## Preparacion antes de una exposicion\nAntes de enfrentar una situacion que genera ansiedad, puede ser util realizar una breve preparacion.\n\nPor ejemplo:\n\n- practicar respiracion durante algunos minutos\n- definir un objetivo simple y concreto\n- establecer un tiempo limitado para la exposicion\n\nEste tipo de preparacion ayuda a disminuir la incertidumbre y facilita la experiencia.\n\n## Que resultado esperar\nMuchas personas creen que el objetivo es eliminar completamente el miedo.\n\nEn realidad, el cambio mas importante suele ser desarrollar la capacidad de actuar incluso cuando aparece cierta incomodidad.\n\nLa ansiedad puede disminuir con el tiempo, pero el verdadero avance ocurre cuando la persona recupera la libertad de participar en situaciones que antes evitaba.\n\n## Desarrollo clinico y herramientas aplicables\nEn el proceso terapeutico, uno de los objetivos centrales es transformar la comprension del problema en acciones sostenibles en la vida cotidiana.\n\nEsto puede incluir:\n\n- definir objetivos concretos\n- registrar avances\n- identificar obstaculos\n- revisar el proceso sin caer en el autojuicio\n\nCuando el acompanamiento terapeutico se combina con practicas simples fuera de las sesiones, la mejora suele consolidarse con mayor estabilidad.\n\n## Implementacion semanal sugerida\n### Semana 1\nObservacion y registro de situaciones que activan ansiedad.\n\n### Semana 2\nAplicacion de una herramienta de regulacion, como la respiracion guiada.\n\n### Semana 3\nEvaluacion de avances, ajuste de estrategias y redefinicion de metas.\n\nCada proceso es diferente, pero avanzar paso a paso suele generar resultados mas sostenibles."
  },
  {
    id: "blog-5",
    title: "Cómo poner límites sin culpa en relaciones cercanas",
    slug: "como-poner-limites-sin-culpa",
    excerpt: "Estrategias concretas para cuidar tus vinculos sin descuidarte.",
    category: "Relaciones",
    coverImage:
      "https://images.pexels.com/photos/5439367/pexels-photo-5439367.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-02-20",
    readTime: 7,
    likes: 187,
    tags: ["relaciones", "limites", "bienestar"],
    status: "published",
    featured: false,
    seoTitle: "Cómo poner límites sanos sin culpa | MotivarCare",
    seoDescription: "Aprende a comunicar limites claros para mejorar tus relaciones y tu bienestar emocional.",
    body:
      "Poner limites no significa alejarte de quienes queres, sino definir lo que necesitas para estar bien.\n\nCuando comunicas tus limites con claridad y respeto, mejoras la calidad del vinculo y reduces desgaste emocional.\n\nLa clave es hablar en primera persona, con ejemplos concretos y acuerdos realistas."
  },
  {
    id: "blog-6",
    title: "Duelo: 7 claves para atravesarlo con mas contencion",
    slug: "duelo-claves-para-atravesarlo",
    excerpt: "Una guia para sostenerte en dias dificiles sin exigirte tiempos imposibles.",
    category: "Duelo",
    coverImage:
      "https://images.pexels.com/photos/6634286/pexels-photo-6634286.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-02-21",
    readTime: 8,
    likes: 203,
    tags: ["duelo", "perdida", "emociones"],
    status: "published",
    featured: false,
    seoTitle: "Duelo: claves para transitar una perdida | MotivarCare",
    seoDescription: "Recursos practicos para atravesar procesos de duelo de forma mas acompanada.",
    body:
      "El duelo no sigue una linea recta ni tiene plazos exactos.\n\nPermitirte sentir, pedir ayuda y sostener rutinas basicas puede marcar una diferencia importante en el proceso.\n\nLa terapia brinda un espacio seguro para elaborar la perdida sin tener que hacerlo en soledad."
  },
  {
    id: "blog-7",
    title: "Insomnio por ansiedad: rutina nocturna en 20 minutos",
    slug: "insomnio-por-ansiedad-rutina-nocturna",
    excerpt: "Pasos simples para bajar activacion mental antes de dormir.",
    category: "Ansiedad",
    coverImage:
      "https://images.pexels.com/photos/935743/pexels-photo-935743.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-02-22",
    readTime: 6,
    likes: 246,
    tags: ["ansiedad", "sueno", "habitos"],
    status: "published",
    featured: false,
    seoTitle: "Insomnio por ansiedad: que hacer antes de dormir | MotivarCare",
    seoDescription: "Construye una rutina corta para reducir ansiedad nocturna y mejorar el descanso.",
    body:
      "Cuando la ansiedad sube de noche, el cuerpo se mantiene en alerta y cuesta descansar.\n\nUna rutina breve con respiracion, luz tenue y desconexion digital ayuda a disminuir estimulos.\n\nLa consistencia diaria importa mas que la perfeccion: pequenos pasos sostenidos mejoran el sueno."
  },
  {
    id: "blog-8",
    title: "Autoestima y dialogo interno: como dejar de atacarte",
    subtitle: "Equipo Clínico - Motivar Care · 22 de febrero de 2026 · 7 min de lectura",
    slug: "autoestima-dialogo-interno",
    excerpt: "Como transformar autocrítica excesiva en una evaluacion mas justa y realista.",
    category: "Autoestima",
    coverImage:
      "https://images.pexels.com/photos/3764011/pexels-photo-3764011.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-02-22",
    readTime: 7,
    likes: 264,
    tags: ["autoestima", "autocritica", "salud mental"],
    status: "published",
    featured: false,
    seoTitle: "Dialogo interno y autoestima: guia practica | MotivarCare",
    seoDescription: "Aprende a transformar pensamientos autocríticos en una mirada mas compasiva y efectiva.",
    body:
      "Muchas personas mantienen un dialogo interno muy duro consigo mismas sin darse cuenta. Frases como soy un desastre, siempre hago todo mal o no deberia haber dicho eso aparecen de forma automatica despues de cometer un error o enfrentar una situacion dificil.\n\nCon el tiempo, este tipo de pensamientos puede erosionar la autoestima y generar una sensacion constante de insuficiencia.\n\nAprender a reconocer ese dialogo interno y transformarlo en una forma de pensamiento mas equilibrada es un paso importante para construir una relacion mas saludable con uno mismo.\n\n## Que es el dialogo interno\nEl dialogo interno es la forma en que interpretamos nuestras experiencias a traves de pensamientos y evaluaciones personales.\n\nTodos tenemos una voz interna que comenta lo que hacemos, como nos sentimos y que pensamos sobre nuestras propias acciones. Esa voz puede ser comprensiva y realista, o puede volverse critica y exigente.\n\nCuando el dialogo interno se vuelve excesivamente negativo, muchas personas comienzan a evaluarse con criterios mucho mas duros de los que aplicarian a otras personas.\n\n## Como afecta el dialogo interno a la autoestima\nEl modo en que nos hablamos influye directamente en como nos sentimos.\n\nSi despues de cada error aparece una critica intensa, el cerebro aprende a asociar la experiencia cotidiana con una sensacion constante de fracaso o insuficiencia.\n\nEsto puede generar:\n\n- mayor inseguridad personal\n- miedo a equivocarse\n- dificultad para valorar los propios logros\n- tendencia a compararse constantemente con otros\n\nCon el tiempo, este patron puede consolidar una autoestima fragil que depende demasiado del rendimiento o la aprobacion externa.\n\n## No se trata de pensar positivo todo el tiempo\nTrabajar el dialogo interno no significa obligarse a pensar de forma optimista o ignorar las dificultades reales.\n\nEl objetivo es desarrollar una forma de pensamiento mas realista y equilibrada.\n\nEn lugar de reemplazar una critica con un elogio exagerado, se busca transformar el mensaje en una evaluacion mas justa.\n\nPor ejemplo:\n\nPensamiento automatico:\nSiempre arruino todo.\n\nPensamiento mas realista:\nEsta vez no salio como esperaba, pero puedo aprender de lo que paso.\n\nEste cambio puede parecer pequeno, pero tiene un impacto importante en la forma en que el cerebro procesa las experiencias.\n\n## Ejercicio practico para trabajar el dialogo interno\nUna forma util de comenzar a modificar este patron es observar como nos hablamos durante la semana.\n\nDurante algunos dias puedes realizar el siguiente ejercicio:\n\n- Registra tres situaciones donde hayas tenido un pensamiento duro hacia ti mismo o hacia ti misma.\n- Escribe la frase exacta que aparecio en tu mente.\n- Reformula esa frase utilizando un tono mas justo y realista.\n\nPor ejemplo:\n\nFrase original:\nSoy incapaz de hacer bien este trabajo.\n\nReformulacion:\nEsta tarea me resulto dificil, pero puedo mejorar con practica.\n\nEl objetivo no es negar el error, sino cambiar la forma en que te relacionas con el.\n\n## El papel de la autoexigencia\nEn muchas personas, el dialogo interno critico esta vinculado a una historia de autoexigencia elevada.\n\nCuando alguien crece en entornos donde el valor personal se asocia fuertemente con el rendimiento, es comun desarrollar una voz interna que evalua constantemente si se esta haciendo lo suficiente.\n\nTambien pueden influir factores como:\n\n- comparaciones frecuentes con otros\n- miedo al fracaso\n- experiencias previas de critica o juicio\n\nReconocer estos patrones es un paso importante para comenzar a transformarlos.\n\n## Como se trabaja en terapia\nEn el espacio terapeutico, uno de los objetivos suele ser comprender como se formo ese dialogo interno critico y que creencias lo sostienen.\n\nAlgunas areas que suelen explorarse son:\n\n- la historia personal de exigencia o comparacion\n- creencias de insuficiencia o desvalorizacion\n- formas alternativas de evaluar las experiencias\n\nEl objetivo no es eliminar la autocritica por completo, sino construir una base interna mas estable y compasiva.\n\n## Un objetivo realista para la autoestima\nUn error frecuente es pensar que una buena autoestima significa sentirse bien todo el tiempo.\n\nEn realidad, una autoestima saludable implica poder atravesar errores, dificultades o momentos de inseguridad sin convertirlos en ataques contra uno mismo.\n\nEl cambio mas importante suele ser dejar de tratarse como enemigo cuando algo no sale perfecto.\n\n## Desarrollo clinico y herramientas aplicables\nEn el proceso terapeutico, uno de los aspectos centrales es transformar la comprension del problema en acciones sostenibles en la vida cotidiana.\n\nEsto incluye:\n\n- definir objetivos concretos\n- registrar avances y dificultades\n- revisar obstaculos sin caer en el autojuicio\n\nCuando el trabajo terapeutico se combina con pequenas practicas diarias, el cambio suele consolidarse con mayor estabilidad.\n\n## Implementacion semanal sugerida\n### Semana 1\nObservacion del dialogo interno y registro de situaciones relevantes.\n\n### Semana 2\nAplicacion de herramientas para reformular pensamientos criticos.\n\n### Semana 3\nEvaluacion de avances y ajuste de estrategias personales.\n\nEste tipo de trabajo gradual permite desarrollar nuevas formas de relacion con uno mismo."
  },
  {
    id: "blog-9",
    title: "Ataques de panico: que hacer en los primeros 5 minutos",
    slug: "ataques-de-panico-primeros-5-minutos",
    excerpt: "Protocolo breve para recuperar orientacion y control cuando sube el miedo.",
    category: "Ansiedad",
    coverImage:
      "https://images.pexels.com/photos/3094230/pexels-photo-3094230.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-02-24",
    readTime: 5,
    likes: 312,
    tags: ["panico", "ansiedad", "regulacion"],
    status: "published",
    featured: false,
    seoTitle: "Ataque de panico: primeros pasos para regularte | MotivarCare",
    seoDescription: "Guia inmediata para atravesar crisis de panico con herramientas simples.",
    body:
      "Un ataque de panico se siente intenso, pero pasa.\n\nNombrar lo que te ocurre, regular la respiracion y ubicar referencias visuales en el entorno ayuda a bajar la alarma.\n\nCon apoyo terapeutico, tambien podes trabajar el miedo anticipatorio y prevenir recaidas."
  },
  {
    id: "blog-10",
    title: "Dependencia emocional: senales tempranas y como trabajarla",
    slug: "dependencia-emocional-senales",
    excerpt: "Identifica patrones frecuentes y empieza a fortalecer autonomia afectiva.",
    category: "Relaciones",
    coverImage:
      "https://images.pexels.com/photos/7176319/pexels-photo-7176319.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-02-25",
    readTime: 8,
    likes: 221,
    tags: ["relaciones", "dependencia emocional", "autonomia"],
    status: "published",
    featured: false,
    seoTitle: "Dependencia emocional: como detectarla y superarla | MotivarCare",
    seoDescription: "Aprende a reconocer conductas de dependencia emocional y avanzar hacia vinculos mas sanos.",
    body:
      "La dependencia emocional suele aparecer como miedo intenso al abandono y dificultad para sostener decisiones propias.\n\nTrabajar autoestima, limites y red de apoyo permite salir de ese patron de manera gradual.\n\nEl objetivo no es aislarte, sino vincularte desde mayor seguridad interna."
  },
  {
    id: "blog-11",
    title: "Estres laboral: como reconocerlo y recuperar equilibrio en tu dia a dia",
    subtitle: "Equipo Clínico - Motivar Care · 7 de marzo de 2026 · 7 min de lectura",
    slug: "estres-laboral-micro-pausas",
    excerpt: "Claves para detectar estres laboral a tiempo y regularlo con herramientas practicas.",
    category: "Estrés",
    coverImage:
      "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-03-07",
    readTime: 7,
    likes: 176,
    tags: ["estres", "burnout", "trabajo"],
    status: "published",
    featured: false,
    seoTitle: "Estres laboral: como reconocerlo y recuperar equilibrio | MotivarCare",
    seoDescription: "Guia practica para detectar senales de estres laboral y recuperar bienestar.",
    body:
      "El estres laboral es una de las formas de malestar psicologico mas frecuentes en la vida adulta. Jornadas intensas, presion por resultados, exceso de responsabilidades o falta de reconocimiento pueden generar una carga emocional sostenida que termina afectando tanto el bienestar mental como la salud fisica.\n\nAunque cierto nivel de exigencia puede ser estimulante, cuando el estres se vuelve constante comienza a impactar en la concentracion, el sueno, el estado de animo y la motivacion.\n\nAprender a reconocer las senales tempranas y desarrollar estrategias de regulacion puede marcar una diferencia importante para recuperar equilibrio en la vida cotidiana.\n\n## Que es el estres laboral\nEl estres laboral aparece cuando las demandas del trabajo superan la capacidad percibida de la persona para afrontarlas.\n\nEsto puede suceder por diferentes motivos, entre ellos:\n\n- exceso de tareas o plazos muy ajustados\n- falta de control sobre el propio trabajo\n- conflictos con companeros o superiores\n- presion constante por rendimiento\n- dificultad para desconectarse del trabajo\n\nCuando estas condiciones se mantienen en el tiempo, el organismo permanece en un estado de activacion prolongada que puede afectar el bienestar general.\n\n## Senales frecuentes de estres laboral\nEl estres no siempre aparece de forma evidente. Muchas veces se manifiesta a traves de cambios graduales en el comportamiento o el estado fisico.\n\nAlgunas senales comunes pueden ser:\n\n- cansancio constante incluso despues de descansar\n- dificultad para concentrarse\n- irritabilidad o menor tolerancia a la frustracion\n- problemas de sueno\n- sensacion de saturacion mental\n- dificultad para desconectarse del trabajo fuera del horario laboral\n\nReconocer estas senales es un primer paso para poder intervenir antes de que el malestar se intensifique.\n\n## La importancia de las pausas durante la jornada\nUna de las estrategias mas simples y efectivas para reducir el estres laboral es introducir micro pausas durante el dia.\n\nCuando trabajamos durante largos periodos sin descanso, el cerebro mantiene un nivel alto de esfuerzo cognitivo que puede aumentar la fatiga y la tension.\n\nRealizar pausas breves cada cierto tiempo ayuda a regular la atencion y disminuir la acumulacion de estres.\n\nAlgunas opciones pueden ser:\n\n- levantarse y caminar unos minutos\n- estirar el cuerpo\n- realizar respiraciones profundas\n- apartar la mirada de la pantalla por unos momentos\n\nEstas pausas permiten recuperar claridad mental y mejorar la productividad.\n\n## Recuperar limites entre trabajo y vida personal\nUno de los desafios actuales del trabajo, especialmente en contextos de trabajo remoto, es la dificultad para establecer limites claros entre la jornada laboral y el tiempo personal.\n\nCuando el trabajo invade constantemente otros espacios de la vida, el descanso se vuelve insuficiente.\n\nAlgunas practicas que pueden ayudar son:\n\n- definir horarios de inicio y cierre de jornada\n- evitar revisar correos o mensajes laborales fuera de horario\n- reservar momentos del dia para actividades personales o recreativas\n\nEstos limites no solo protegen el bienestar emocional, sino que tambien favorecen una relacion mas saludable con el trabajo.\n\n## Estrategias para regular el estres en el momento\nCuando la tension comienza a aumentar durante el dia, algunas herramientas simples pueden ayudar a recuperar equilibrio.\n\nPor ejemplo:\n\n### Respiracion consciente\nInhalar profundamente durante cuatro segundos y exhalar lentamente durante seis segundos puede ayudar a disminuir la activacion fisiologica.\n\n### Cambio breve de contexto\nAlejarse del espacio de trabajo durante algunos minutos permite que el cerebro reduzca el nivel de alerta.\n\n### Reorganizacion de tareas\nCuando todo parece urgente, ordenar prioridades puede reducir la sensacion de saturacion.\n\nPequenos ajustes en el momento pueden evitar que el estres escale.\n\n## Cuando el estres se vuelve cronico\nSi el estres laboral se mantiene durante periodos prolongados sin espacios de recuperacion, puede aparecer lo que se conoce como burnout o agotamiento laboral.\n\nEste estado suele caracterizarse por:\n\n- agotamiento emocional intenso\n- sensacion de distanciamiento del trabajo\n- disminucion de la motivacion o del rendimiento\n\nEn estos casos, puede ser importante revisar de forma mas profunda las condiciones laborales y buscar apoyo profesional.\n\n## El papel del acompanamiento terapeutico\nLa terapia puede ser un espacio util para comprender como se relaciona una persona con las exigencias laborales y desarrollar estrategias para manejar la presion de forma mas saludable.\n\nEn el proceso terapeutico se pueden trabajar aspectos como:\n\n- manejo del estres y la ansiedad\n- establecimiento de limites\n- regulacion emocional\n- organizacion de prioridades\n- prevencion del agotamiento\n\nEl objetivo no es eliminar todas las exigencias del trabajo, sino desarrollar recursos internos para afrontarlas con mayor equilibrio.\n\n## Desarrollo clinico y herramientas aplicables\nEn consulta, uno de los puntos mas importantes es transformar la comprension del problema en acciones sostenibles en la vida cotidiana.\n\nEsto incluye:\n\n- definir objetivos concretos\n- registrar avances\n- identificar obstaculos\n- revisar el proceso sin caer en el autojuicio\n\nCuando el acompanamiento terapeutico se combina con practicas simples en la vida diaria, la mejora suele consolidarse con mayor estabilidad.\n\n## Implementacion semanal sugerida\n### Semana 1\nObservacion de situaciones laborales que generan mayor tension.\n\n### Semana 2\nAplicacion de herramientas de regulacion como pausas y respiracion consciente.\n\n### Semana 3\nEvaluacion de avances, ajuste de rutinas y redefinicion de prioridades.\n\nEste proceso gradual permite construir habitos mas saludables en relacion con el trabajo.\n\n## Cita destacada\n> El bienestar laboral no depende solo de trabajar menos, sino de aprender a trabajar con mayor equilibrio.\n\n> Equipo Clínico - Motivar Care"
  },
  {
    id: "blog-12",
    title: "Ansiedad social: ejercicios para hablar en publico sin bloquearte",
    subtitle: "Equipo Clínico - Motivar Care · 26 de febrero de 2026 · 7 min de lectura",
    slug: "ansiedad-social-hablar-en-publico",
    excerpt: "La ansiedad social es mas comun de lo que parece y puede trabajarse con herramientas concretas.",
    category: "Ansiedad",
    coverImage:
      "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-02-26",
    readTime: 7,
    likes: 194,
    tags: ["ansiedad social", "oratoria", "confianza"],
    status: "published",
    featured: false,
    seoTitle: "Ansiedad social al hablar en publico | MotivarCare",
    seoDescription: "Entrena habilidades practicas para comunicarte con menos miedo y mas claridad.",
    body:
      "La ansiedad social es mas comun de lo que parece. Muchas personas sienten una fuerte activacion emocional cuando deben hablar frente a otros, participar en reuniones o simplemente expresar su opinion en publico.\n\nEl miedo a ser juzgado, a equivocarse o a quedarse en blanco puede hacer que evitemos situaciones importantes en el trabajo, la universidad o incluso en la vida cotidiana.\n\nLa buena noticia es que existen estrategias concretas que ayudan a reducir el bloqueo y ganar confianza al hablar frente a otras personas. Con practica gradual y algunas herramientas simples, es posible entrenar al cuerpo y a la mente para manejar mejor estos momentos.\n\n## Por que aparece la ansiedad al hablar en publico\nCuando anticipamos una situacion social desafiante, el cerebro puede interpretarla como una amenaza. Esto activa el sistema de alerta del cuerpo, generando sintomas fisicos y mentales como:\n\n- aceleracion del ritmo cardiaco\n- respiracion mas rapida\n- tension muscular\n- pensamientos de autocritica o miedo al error\n\nEstas reacciones son normales. El problema aparece cuando la ansiedad se vuelve tan intensa que nos paraliza o nos lleva a evitar sistematicamente estas situaciones.\n\nLa evitacion suele traer alivio momentaneo, pero a largo plazo refuerza el miedo, porque el cerebro aprende que la unica forma de sentirse seguro es escapar de ese tipo de escenarios.\n\n## La clave: exposicion gradual\nUna de las estrategias mas efectivas para superar la ansiedad social es la exposicion progresiva.\n\nEsto significa enfrentarse a las situaciones que generan miedo de forma gradual, preparada y repetida. Con el tiempo, el cerebro aprende que la situacion no representa un peligro real, y la intensidad de la ansiedad disminuye.\n\nPracticar primero en contextos de baja exigencia suele acelerar el proceso. Por ejemplo:\n\n- hablar frente a un amigo\n- grabarse explicando una idea\n- participar brevemente en una reunion pequena\n\nEstos pasos iniciales ayudan a construir confianza antes de enfrentar situaciones mas desafiantes.\n\n## Plan de accion en 3 pasos\nSi quieres empezar a trabajar sobre tu ansiedad social, este plan sencillo puede servirte como punto de partida.\n\n### 1. Identifica el disparador puntual\nEl primer paso es reconocer que situaciones activan tu ansiedad.\n\nPuede tratarse de:\n\n- una presentacion laboral\n- participar en una reunion\n- iniciar una conversacion con desconocidos\n- expresar una opinion frente a un grupo\n\nCuanto mas especifico seas al identificar el disparador, mas facil sera disenar estrategias para enfrentarlo.\n\n### 2. Reduce la activacion fisica\nAntes de enfrentar una situacion social desafiante, es util regular el estado fisico del cuerpo.\n\nAlgunas tecnicas simples pueden ayudar a bajar la intensidad de la ansiedad:\n\n- respiracion profunda y lenta\n- una caminata breve\n- estiramientos suaves\n- escuchar musica relajante durante unos minutos\n\nEstas acciones ayudan a disminuir la activacion del sistema nervioso y facilitan recuperar claridad mental.\n\n### 3. Define una accion concreta para hoy\nEl progreso suele comenzar con pasos pequenos.\n\nEn lugar de intentar enfrentar la situacion mas dificil de inmediato, elige una accion manejable que puedas realizar hoy. Por ejemplo:\n\n- hacer una pregunta breve en una reunion\n- comentar una idea en una conversacion\n- practicar una presentacion frente a una persona de confianza\n\nLo importante es acumular experiencias positivas, incluso si al principio parecen pequenas.\n\n## Errores frecuentes al enfrentar la ansiedad social\nUno de los errores mas comunes es intentar eliminar completamente la ansiedad antes de actuar.\n\nEn realidad, la ansiedad suele disminuir despues de empezar a exponerse, no antes.\n\nOtro error habitual es evitar sistematicamente las situaciones que generan incomodidad. Aunque esta estrategia reduce el malestar en el corto plazo, a largo plazo fortalece el miedo.\n\nPor eso, muchos profesionales recomiendan una exposicion progresiva y acompanada, donde cada paso se planifica de forma gradual y segura.\n\n## Senales de que estas progresando\nEl cambio suele ser gradual, pero hay algunas senales claras de mejora:\n\n- recuperas el foco mas rapido despues de sentir ansiedad\n- duermes mejor antes de eventos sociales\n- disminuye la sensacion de urgencia o tension interna\n- puedes hablar durante mas tiempo sin bloquearte\n\nIncluso pequenos avances son importantes. Cada experiencia positiva ayuda a reentrenar la respuesta del cerebro frente a estas situaciones.\n\n## Cuando puede ser util buscar ayuda profesional\nSi la ansiedad social interfiere significativamente con tu trabajo, tus estudios o tus relaciones, hablar con un profesional puede marcar una gran diferencia.\n\nLa terapia psicologica ofrece herramientas especificas para:\n\n- trabajar los pensamientos que alimentan la ansiedad\n- desarrollar habilidades sociales\n- entrenar estrategias de exposicion progresiva\n\nCon acompanamiento adecuado, muchas personas logran recuperar seguridad y desenvolverse con mayor tranquilidad en situaciones sociales."
  },
  {
    id: "blog-13",
    title: "Cómo acompañar a un familiar con depresión",
    slug: "acompanar-familiar-con-depresion",
    excerpt: "Que decir, que evitar y como sostener ayuda real sin agotarte.",
    category: "Depresión",
    coverImage:
      "https://images.pexels.com/photos/7176025/pexels-photo-7176025.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-02-28",
    readTime: 8,
    likes: 258,
    tags: ["depresion", "familia", "acompanamiento"],
    status: "published",
    featured: false,
    seoTitle: "Acompanamiento familiar en depresion | MotivarCare",
    seoDescription: "Recomendaciones practicas para apoyar a una persona con depresion de forma saludable.",
    body:
      "Acompanar a alguien con depresion requiere presencia, paciencia y escucha sin juicios.\n\nFrases simples, ayuda concreta y aliento para buscar tratamiento suelen ser mas utiles que consejos rapidos.\n\nTambien es importante cuidar tus propios limites para sostener el acompanamiento en el tiempo."
  },
  {
    id: "blog-14",
    title: "Terapia online: 9 preguntas para elegir profesional",
    slug: "terapia-online-preguntas-para-elegir-profesional",
    excerpt: "Checklist para tomar una buena decision desde la primera entrevista.",
    category: "Guia",
    coverImage:
      "https://images.pexels.com/photos/4226868/pexels-photo-4226868.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-03-01",
    readTime: 9,
    likes: 301,
    tags: ["terapia online", "guia", "profesionales"],
    status: "published",
    featured: false,
    seoTitle: "Cómo elegir psicólogo online: preguntas clave | MotivarCare",
    seoDescription: "Una lista de preguntas para evaluar enfoque, experiencia y compatibilidad terapeutica.",
    body:
      "Elegir profesional es una decision importante y vale la pena prepararla.\n\nConsultar enfoque, experiencia en tu motivo de consulta, frecuencia y expectativas de proceso ayuda a tomar mejores decisiones.\n\nEl mejor match terapeutico combina criterio profesional con sensacion de confianza y seguridad."
  },
  {
    id: "blog-15",
    title: "Mindfulness para principiantes: una practica de 7 minutos",
    slug: "mindfulness-para-principiantes-7-minutos",
    excerpt: "Un ejercicio breve para entrenar foco y reducir rumiacion diaria.",
    category: "Autocuidado",
    coverImage:
      "https://images.pexels.com/photos/3822864/pexels-photo-3822864.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-03-02",
    readTime: 6,
    likes: 142,
    tags: ["mindfulness", "autocuidado", "ansiedad"],
    status: "published",
    featured: false,
    seoTitle: "Mindfulness: practica corta para empezar hoy | MotivarCare",
    seoDescription: "Aprende una rutina simple de mindfulness para bajar ansiedad y mejorar concentracion.",
    body:
      "No necesitas sesiones largas para comenzar con mindfulness.\n\nUna practica de pocos minutos, sostenida en el tiempo, puede ayudarte a bajar el ruido mental.\n\nLa clave es observar sensaciones y pensamientos sin pelearte con ellos."
  },
  {
    id: "blog-16",
    title: "Ruptura amorosa: como sostenerte durante las primeras semanas",
    subtitle: "Equipo Clínico - Motivar Care · 2 de diciembre de 2025 · 8 min de lectura",
    slug: "ruptura-amorosa-primeras-semanas",
    excerpt: "Claves practicas para atravesar una separacion con mayor estabilidad emocional y acompanamiento.",
    category: "Relaciones",
    coverImage:
      "https://images.pexels.com/photos/5699442/pexels-photo-5699442.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2025-12-02",
    readTime: 8,
    likes: 167,
    tags: ["ruptura", "duelo", "relaciones"],
    status: "published",
    featured: false,
    seoTitle: "Ruptura amorosa: herramientas para transitarla | MotivarCare",
    seoDescription: "Claves para atravesar una separacion con mayor contencion emocional.",
    body:
      "Una ruptura amorosa puede ser una de las experiencias emocionales mas intensas que atravesamos en la vida. No solo implica el final de un vinculo, sino tambien la perdida de proyectos compartidos, rutinas cotidianas y expectativas sobre el futuro.\n\nDurante las primeras semanas es comun experimentar una mezcla de emociones: tristeza, enojo, confusion e incertidumbre. Muchas personas tambien sienten ansiedad, dificultad para concentrarse o cambios en el sueno.\n\nAunque cada proceso es diferente, existen algunas estrategias que pueden ayudar a atravesar este momento con mayor estabilidad emocional.\n\n## Entender lo que estas atravesando\nDespues de una ruptura, el cerebro necesita tiempo para procesar el cambio. La relacion formaba parte de la estructura emocional de la vida cotidiana, y su ausencia genera un periodo de reajuste.\n\nEs normal que aparezcan pensamientos repetitivos sobre lo ocurrido, recuerdos del vinculo o preguntas sobre lo que podria haberse hecho de otra manera.\n\nReconocer que este proceso forma parte del duelo afectivo puede ayudar a transitarlo con mayor comprension hacia uno mismo.\n\n## Sostener rutinas basicas\nEn momentos de impacto emocional, mantener ciertas rutinas puede funcionar como un ancla de estabilidad.\n\nAlgunas practicas simples pueden marcar una diferencia importante:\n\n- mantener horarios de sueno relativamente regulares\n- comer de forma equilibrada\n- realizar actividad fisica ligera\n- salir a caminar o cambiar de entorno durante el dia\n\nEstas acciones ayudan a regular el sistema nervioso y evitan que el aislamiento profundice el malestar.\n\n## Limitar los impulsos de contacto\nDespues de una ruptura, muchas personas sienten el impulso de volver a contactar a la ex pareja para buscar explicaciones, cerrar conversaciones pendientes o intentar recuperar el vinculo.\n\nAunque estos impulsos son comprensibles, repetir estos contactos en los primeros momentos puede intensificar el dolor emocional.\n\nEn muchos casos resulta util establecer cierta distancia temporal para que las emociones se estabilicen y poder procesar lo ocurrido con mayor claridad.\n\n## Apoyarte en personas de confianza\nEl duelo emocional se vuelve mas dificil cuando se atraviesa en soledad.\n\nHablar con amigos, familiares o personas de confianza puede ayudar a ordenar pensamientos y aliviar parte de la carga emocional.\n\nNo se trata necesariamente de buscar soluciones inmediatas, sino de contar con espacios donde expresar lo que se siente sin sentirse juzgado.\n\nEl acompanamiento social suele ser uno de los factores mas importantes para atravesar este tipo de procesos.\n\n## Como tener conversaciones dificiles sin escalar el conflicto\nEn algunos casos, despues de la ruptura pueden surgir conversaciones necesarias para resolver temas pendientes.\n\nCuando esto ocurre, puede ser util aplicar algunas pautas de comunicacion que reduzcan la posibilidad de escalada emocional.\n\nPor ejemplo:\n\n- hablar en primera persona\n- expresar necesidades concretas\n- evitar generalizaciones o acusaciones\n\nEn lugar de decir: nunca me escuchas.\n\nPuede resultar mas constructivo decir: cuando me interrumpes me cuesta expresar lo que quiero decir.\n\nEste tipo de lenguaje facilita el dialogo y reduce la confrontacion.\n\n## El papel de los limites saludables\nEstablecer limites despues de una ruptura no significa castigar al otro ni cerrar todas las puertas.\n\nUn limite saludable es simplemente una forma de cuidado personal que protege el bienestar emocional.\n\nPor ejemplo, algunas personas necesitan un periodo sin contacto para reorganizarse emocionalmente. Otras prefieren reducir las conversaciones a temas estrictamente necesarios.\n\nLos limites ayudan a crear un espacio donde el proceso de duelo pueda desarrollarse con mayor claridad.\n\n## Cuando es importante buscar ayuda\nEn algunas situaciones, la ruptura puede estar vinculada a dinamicas mas complejas, como relaciones conflictivas o episodios de violencia emocional o fisica.\n\nEn estos casos es fundamental priorizar la seguridad personal y buscar apoyo profesional o institucional.\n\nNadie deberia atravesar estas situaciones en soledad.\n\n## El papel del acompanamiento terapeutico\nEl proceso de una ruptura puede generar preguntas profundas sobre la propia historia afectiva, las expectativas en las relaciones o los patrones de vinculo.\n\nEn terapia, el objetivo suele ser comprender estas dinamicas y transformar la experiencia en una oportunidad de crecimiento personal.\n\nEl acompanamiento profesional puede ayudar a:\n\n- ordenar emociones intensas\n- comprender lo ocurrido en la relacion\n- fortalecer la autoestima\n- reconstruir proyectos personales\n\nCuando este proceso se realiza con apoyo adecuado, muchas personas logran atravesar el duelo con mayor claridad y aprendizaje.\n\n## Desarrollo clinico y herramientas aplicables\nEn el trabajo terapeutico, uno de los objetivos principales es transformar la comprension emocional en acciones sostenibles en la vida cotidiana.\n\nEsto puede incluir:\n\n- definir objetivos personales concretos\n- registrar avances y dificultades\n- revisar obstaculos sin caer en el autojuicio\n\nCuando el proceso terapeutico se combina con pequenas practicas diarias, la recuperacion emocional suele ser mas estable en el tiempo.\n\n## Implementacion semanal sugerida\n### Semana 1\nObservacion de emociones y registro de situaciones que generan mayor impacto.\n\n### Semana 2\nAplicacion de herramientas de regulacion emocional y ajuste de rutinas.\n\n### Semana 3\nEvaluacion del proceso, redefinicion de objetivos y consolidacion de habitos saludables.\n\nCada persona atraviesa el duelo a su propio ritmo, por lo que estos pasos deben adaptarse a cada situacion.\n\n## Cita destacada\n> Un vinculo sano no evita los conflictos.\n> Aprende a atravesarlos sin destruirse.\n\n> Equipo Clínico - Motivar Care"
  },
  {
    id: "blog-17",
    title: "Procrastinacion emocional: por que postergamos lo importante",
    subtitle: "Equipo Clínico - Motivar Care · 3 de marzo de 2026 · 7 min de lectura",
    slug: "procrastinacion-emocional",
    excerpt: "Comprende la raiz emocional de la postergacion y como construir accion sostenida.",
    category: "Hábitos",
    coverImage:
      "https://images.pexels.com/photos/7648047/pexels-photo-7648047.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2026-03-03",
    readTime: 7,
    likes: 133,
    tags: ["habitos", "productividad", "regulacion emocional"],
    status: "published",
    featured: false,
    seoTitle: "Procrastinacion emocional: por que postergamos lo importante | MotivarCare",
    seoDescription: "Guia practica para superar la postergacion desde la regulacion emocional.",
    body:
      "Muchas personas piensan que procrastinar significa simplemente administrar mal el tiempo. Sin embargo, en muchos casos la postergacion no tiene que ver con falta de organizacion, sino con una dificultad para manejar ciertas emociones.\n\nCuando una tarea genera ansiedad, miedo al error, presion o inseguridad, el cerebro busca evitar ese malestar. La forma mas comun de hacerlo es posponer la actividad.\n\nPor eso, muchas veces no postergamos porque no tengamos tiempo, sino porque la tarea despierta emociones que preferimos evitar.\n\nComprender esta dimension emocional de la procrastinacion puede ayudar a abordarla de una forma mas efectiva.\n\n## Que es la procrastinacion emocional\nLa procrastinacion emocional ocurre cuando evitamos tareas importantes porque estan asociadas a emociones incomodas.\n\nEstas emociones pueden ser muy variadas, por ejemplo:\n\n- miedo a equivocarse\n- inseguridad sobre nuestras capacidades\n- sensacion de sobrecarga\n- perfeccionismo elevado\n- miedo a la evaluacion de otras personas\n\nEn lugar de enfrentar directamente esa incomodidad, el cerebro busca una alternativa que genere alivio inmediato, como revisar redes sociales, responder mensajes o dedicarse a tareas menos relevantes.\n\nAunque esto reduce la tension en el momento, suele aumentar el estres mas adelante.\n\n## El papel del perfeccionismo\nUno de los factores que mas contribuyen a la procrastinacion es el perfeccionismo.\n\nCuando sentimos que una tarea debe hacerse de forma impecable, el punto de inicio puede volverse intimidante. La exigencia de hacerlo perfecto desde el principio genera una presion que paraliza la accion.\n\nEn estos casos, el problema no es la falta de capacidad, sino la dificultad para comenzar bajo estandares demasiado altos.\n\nAprender a trabajar con metas mas realistas suele ser una parte importante del cambio.\n\n## Reducir la friccion para empezar\nUno de los principios mas efectivos para superar la procrastinacion es reducir la dificultad del primer paso.\n\nCuando una tarea parece demasiado grande o compleja, dividirla en partes mas pequenas puede facilitar el inicio.\n\nPor ejemplo:\n\n- escribir solo el primer parrafo de un informe\n- trabajar diez minutos en una tarea pendiente\n- organizar unicamente el material necesario para empezar\n\nComenzar con un paso pequeno reduce la friccion inicial y permite que el impulso de accion se active.\n\n## La importancia de la consistencia\nMuchas personas intentan superar la procrastinacion proponiendose cambios intensos de corta duracion. Sin embargo, el progreso sostenido suele aparecer cuando se prioriza la consistencia sobre la intensidad.\n\nEn lugar de trabajar durante largas horas de forma esporadica, puede ser mas efectivo crear una rutina breve pero constante.\n\nEl cambio suele consolidarse cuando la accion se vuelve parte de la estructura cotidiana.\n\n## Cambio sostenible: objetivos minimos viables\nUna estrategia util consiste en comenzar con metas pequenas que puedan sostenerse en el tiempo.\n\nPor ejemplo:\n\n- dedicar diez minutos diarios a una tarea importante\n- avanzar un paso concreto cada dia\n- trabajar en bloques cortos de concentracion\n\nEstos objetivos minimos reducen la resistencia inicial y facilitan el desarrollo del habito.\n\n## Disenar el entorno para facilitar la accion\nEl entorno en el que trabajamos influye mucho mas de lo que solemos pensar.\n\nCuando el acceso a distracciones es muy facil, mantener la atencion se vuelve mas dificil.\n\nAlgunas formas de reducir la friccion pueden ser:\n\n- dejar preparado el material necesario para trabajar\n- ordenar el espacio antes de comenzar\n- limitar notificaciones durante periodos de concentracion\n\nEstos ajustes ayudan a que la accion resulte mas natural y menos costosa.\n\n## La importancia del seguimiento\nRegistrar el progreso semanal puede ser una herramienta poderosa para sostener la motivacion.\n\nCuando observamos avances concretos, incluso si son pequenos, el cerebro recibe senales de progreso que refuerzan el comportamiento.\n\nEl seguimiento permite tambien detectar obstaculos y ajustar estrategias sin caer en la autocritica excesiva.\n\n## Desarrollo clinico y herramientas aplicables\nEn el trabajo terapeutico, uno de los objetivos principales es transformar la comprension del problema en acciones sostenibles en la vida cotidiana.\n\nEsto puede incluir:\n\n- definir objetivos concretos\n- registrar avances\n- identificar obstaculos\n- revisar el proceso sin caer en el autojuicio\n\nCuando el proceso terapeutico se combina con pequenas practicas diarias, el cambio suele consolidarse con mayor estabilidad.\n\n## Implementacion semanal sugerida\n### Semana 1\nObservacion y registro de situaciones donde aparece procrastinacion.\n\n### Semana 2\nAplicacion de una herramienta de accion minima, como bloques breves de trabajo.\n\n### Semana 3\nEvaluacion de avances y ajuste de estrategias personales.\n\nEste proceso gradual permite construir habitos mas sostenibles.\n\n## Cita destacada\n> Cambiar habitos requiere menos motivacion de la que crees y mas sistema del que imaginas.\n\n> Equipo Clínico - Motivar Care"
  },
  {
    id: "blog-18",
    title: "Cómo prepararte para tu primera sesión de terapia online",
    subtitle: "Equipo Clínico - Motivar Care · 4 de marzo de 2025 · 6 min de lectura",
    slug: "primera-sesion-terapia-online-como-prepararte",
    excerpt: "Checklist practico para llegar con claridad y aprovechar mejor el primer encuentro terapeutico.",
    category: "Guia",
    coverImage:
      "https://images.pexels.com/photos/7176318/pexels-photo-7176318.jpeg?auto=compress&cs=tinysrgb&w=1600",
    authorName: "Equipo Clínico - Motivar Care",
    authorRole: "",
    authorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    publishedAt: "2025-03-04",
    readTime: 6,
    likes: 154,
    tags: ["terapia online", "primera sesion", "guia practica"],
    status: "published",
    featured: false,
    seoTitle: "Primera sesión de terapia online: guía breve | MotivarCare",
    seoDescription: "Todo lo que necesitas para empezar tu proceso terapeutico online con seguridad.",
    body:
      "Dar el primer paso hacia la terapia puede generar muchas preguntas. Algunas personas sienten curiosidad, otras cierta incertidumbre, y muchas simplemente no saben que esperar de la primera sesion.\n\nPrepararte con algunas ideas claras antes del encuentro puede ayudarte a comenzar el proceso con mayor tranquilidad. No se trata de tener todas las respuestas, sino de llegar con una disposicion abierta a explorar lo que te esta pasando.\n\nEl primer encuentro suele ser un espacio para conocerse, comprender el motivo de consulta y empezar a construir un camino de trabajo en conjunto.\n\n## Que esperar de la primera sesion\nEn la mayoria de los casos, la primera sesion tiene un objetivo exploratorio. El profesional buscara conocer tu situacion actual, tu historia personal relevante y las razones que te llevaron a buscar ayuda.\n\nDurante la conversacion pueden aparecer temas como:\n\n- que te esta preocupando en este momento\n- cuando comenzaron las dificultades que estas atravesando\n- como afectan tu vida cotidiana\n- que tipo de cambios te gustaria lograr\n\nNo es necesario tener todo organizado o explicado de forma perfecta. El espacio terapeutico esta pensado justamente para ordenar pensamientos y emociones gradualmente.\n\n## Por que prepararse puede ayudar\nReflexionar un poco antes de la sesion puede facilitar el inicio del proceso. Cuando llegas con cierta claridad sobre lo que te preocupa, el profesional puede comprender mas rapido tu situacion y comenzar a orientar el trabajo terapeutico.\n\nAlgunas preguntas simples pueden ayudarte a prepararte:\n\n- Que me motivo a buscar terapia ahora?\n- Que situaciones me generan mas malestar ultimamente?\n- Que cambios me gustaria lograr en mi vida?\n\nNo es necesario tener respuestas definitivas. Incluso formular estas preguntas ya es una forma de empezar a reflexionar.\n\n## Checklist sugerido antes de la primera sesion\nAntes de tu primer encuentro, puede ser util considerar algunos aspectos practicos.\n\n### Define tu motivo principal de consulta\nIntenta identificar que situacion o emocion te gustaria trabajar primero.\n\n### Piensa en tu disponibilidad horaria\nEsto ayudara a definir una frecuencia de sesiones realista.\n\n### Considera un presupuesto estimado\nTener claridad sobre este punto facilita sostener el proceso en el tiempo.\n\n### Reflexiona sobre tus expectativas\nLa terapia es un proceso gradual. Pensar que esperas del acompanamiento puede orientar mejor el trabajo.\n\n## Preguntas que puedes hacerle al profesional\nLa primera sesion tambien es una oportunidad para conocer el enfoque de trabajo del terapeuta.\n\nAlgunas preguntas que pueden ayudarte a tomar una decision informada son:\n\n- Que enfoque terapeutico utilizas?\n- Tienes experiencia trabajando con situaciones similares a la mia?\n- Con que frecuencia suelen realizarse las sesiones?\n- Como se evalua el progreso en el proceso terapeutico?\n\nEstas preguntas no solo aportan claridad, sino que tambien ayudan a construir una relacion terapeutica basada en confianza y transparencia.\n\n## Como evaluar si es un buen espacio para ti\nLa conexion con el profesional es un factor importante en el proceso terapeutico.\n\nDespues de la primera sesion puedes preguntarte:\n\n- Me senti escuchado o escuchada?\n- Senti respeto y comprension durante la conversacion?\n- El profesional explico claramente como podria desarrollarse el proceso?\n\nNo siempre se siente una conexion profunda desde el primer encuentro, pero si suele percibirse una sensacion basica de confianza y seguridad.\n\n## El objetivo del proceso terapeutico\nMas alla de la conversacion en cada sesion, uno de los aspectos centrales de la terapia es transformar la comprension en acciones concretas que puedan sostenerse en la vida cotidiana.\n\nEsto puede incluir:\n\n- definir objetivos personales claros\n- registrar avances y dificultades\n- revisar obstaculos sin caer en el autojuicio\n- incorporar herramientas practicas de regulacion emocional\n\nCuando el proceso terapeutico se combina con pequenas practicas diarias, la mejora suele ser mas estable y significativa.\n\n## Una posible estructura de las primeras semanas\nCada proceso es diferente, pero muchas intervenciones terapeuticas siguen una logica gradual.\n\n### Semana 1\nObservacion y registro de situaciones relevantes en la vida cotidiana.\n\n### Semana 2\nIntroduccion de una primera herramienta de regulacion o cambio de habitos.\n\n### Semana 3\nEvaluacion de avances, ajuste de estrategias y redefinicion de objetivos.\n\nEste tipo de estructura permite avanzar paso a paso, evitando expectativas poco realistas.\n\n## Un paso importante para tu bienestar\nBuscar ayuda psicologica no significa tener todo resuelto ni saber exactamente que decir. Muchas veces el primer paso consiste simplemente en abrir un espacio para hablar y empezar a comprender lo que esta ocurriendo.\n\nLa terapia es un proceso que se construye con tiempo, reflexion y acompanamiento profesional."
  }
];

const initialCommentsByPost: Record<string, BlogComment[]> = {
  "blog-1": [
    {
      id: "c-1",
      author: "Melanie",
      avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=120",
      text: "Me sirvió mucho la parte de alargar la exhalación. Lo apliqué antes de dormir.",
      createdAt: "2026-03-01",
      likes: 18,
      reply: {
        author: "Equipo Clínico - Motivar Care",
        text: "Excelente Melanie, gracias por compartir tu experiencia.",
        createdAt: "2026-03-01"
      }
    }
  ],
  "blog-2": [
    {
      id: "c-2",
      author: "José",
      avatar: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=120",
      text: "Gran artículo. Me ayudó a bajar la autoexigencia de cambiar todo de golpe.",
      createdAt: "2026-03-02",
      likes: 14
    }
  ],
  "blog-3": [
    {
      id: "c-3",
      author: "Virginia",
      avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=120",
      text: "Muy claro para entender patrones familiares sin culpas.",
      createdAt: "2026-03-02",
      likes: 12
    }
  ],
  "blog-5": [
    {
      id: "c-4",
      author: "Lucia",
      avatar: "https://images.pexels.com/photos/712521/pexels-photo-712521.jpeg?auto=compress&cs=tinysrgb&w=120",
      text: "Necesitaba esto para conversar mejor con mi pareja.",
      createdAt: "2026-03-03",
      likes: 9
    }
  ],
  "blog-6": [
    {
      id: "c-5",
      author: "Paulo",
      avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=120",
      text: "Se agradece que hable de tiempos reales y no de soluciones rapidas.",
      createdAt: "2026-03-03",
      likes: 16
    }
  ],
  "blog-9": [
    {
      id: "c-6",
      author: "Sergio",
      avatar: "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=120",
      text: "El protocolo de 5 minutos me dio herramientas concretas.",
      createdAt: "2026-03-04",
      likes: 21,
      reply: {
        author: "Equipo Clínico - Motivar Care",
        text: "Gracias Sergio, te recomendamos practicarlo tambien en momentos de calma.",
        createdAt: "2026-03-04"
      }
    }
  ],
  "blog-11": [
    {
      id: "c-7",
      author: "Martin",
      avatar: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=120",
      text: "Las micro pausas me cambiaron la semana de trabajo.",
      createdAt: "2026-03-04",
      likes: 11
    }
  ],
  "blog-13": [
    {
      id: "c-8",
      author: "Maria Paz",
      avatar: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=120",
      text: "Muy útil para familiares que no saben cómo acompañar.",
      createdAt: "2026-03-05",
      likes: 13
    }
  ],
  "blog-14": [
    {
      id: "c-9",
      author: "Agostina",
      avatar: "https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=120",
      text: "Excelente checklist para la primera entrevista.",
      createdAt: "2026-03-05",
      likes: 8
    }
  ],
  "blog-18": [
    {
      id: "c-10",
      author: "Julieta",
      avatar: "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=120",
      text: "Super claro y practico para arrancar terapia online sin miedo.",
      createdAt: "2026-03-06",
      likes: 10
    }
  ]
};

const categoryBodyAppendix: Record<string, string> = {
  Ansiedad:
    "## Plan de accion en 3 pasos\n1) Identifica el disparador puntual: una conversacion, una situacion laboral o una preocupacion recurrente.\n2) Baja la activacion fisica con respiracion o una caminata corta antes de tomar decisiones.\n3) Define una accion concreta para hoy, aunque sea pequena.\n\n## Errores frecuentes\nEvitar todo lo que te genera ansiedad suele aliviar en el corto plazo, pero la mantiene en el largo. Conviene una exposicion progresiva y acompanada.\n\n## Senales de progreso\nEmpiezas a recuperar foco mas rapido, duermes mejor y disminuye la sensacion de urgencia interna.",
  Autoestima:
    "## Ejercicio practico\nDurante una semana, registra tres situaciones donde te hablaste con dureza y reescribe esa frase con un tono mas justo y realista.\n\n## En terapia\nSe trabaja la historia de autoexigencia, comparacion y creencias de insuficiencia para construir una base interna mas estable.\n\n## Objetivo realista\nNo es sentirte bien todo el tiempo, sino dejar de tratarte como enemigo cuando algo no sale perfecto.",
  Relaciones:
    "## Conversaciones dificiles sin escalar\nHabla en primera persona, define lo que necesitas y evita generalizaciones. Ejemplo: en vez de 'nunca me escuchas', usar 'cuando interrumpes me cuesta expresarme'.\n\n## Limites saludables\nUn limite no es castigo: es una regla de cuidado mutuo que protege el vinculo.\n\n## Cuidados\nSi hay violencia fisica o psicologica, prioriza seguridad y apoyo profesional inmediato.",
  Duelo:
    "## Ritmo emocional\nHay dias de mas energia y otros de mucho cansancio. Ese movimiento es esperable.\n\n## Red de apoyo\nPedir ayuda concreta (acompanarte a una cita, cocinar, resolver tramites) suele ser mas efectivo que intentar sostener todo solo/a.\n\n## Cuando consultar\nSi el dolor se vuelve incapacitante de forma sostenida, la terapia puede ofrecer contencion y estructura.",
  Traumas:
    "## Regulacion antes de profundidad\nEn trauma, primero se entrena seguridad emocional y corporal. Despues se avanza en elaboracion de experiencias.\n\n## Recursos utiles\nRespiracion guiada, anclaje sensorial y rutinas de descanso son base para sostener el proceso.\n\n## Progreso\nDisminuye la reactividad, mejora el sueno y aparece mayor sensacion de control personal.",
  Fobias:
    "## Exposicion gradual\nLa evitacion mantiene el miedo. Un plan escalonado permite recuperar confianza sin forzar procesos extremos.\n\n## Preparacion\nAntes de cada exposicion: respiracion, objetivo claro y tiempo limitado.\n\n## Resultado esperado\nNo es ausencia total de miedo, sino mayor capacidad para actuar aun con malestar moderado.",
  Estrés:
    "## Micro recuperacion diaria\nPausas de 3 a 5 minutos cada 90 minutos, hidratacion y cierre de jornada con desconexion real.\n\n## Organizacion\nPrioriza tres tareas criticas por dia; lo demas se agenda.\n\n## Indicadores de mejora\nMenor irritabilidad, mejor descanso y mas claridad para decidir.",
  Depresión:
    "## Acompanamiento efectivo\nEscuchar sin minimizar, validar emociones y ofrecer ayuda concreta son claves.\n\n## Activacion gradual\nPequenas acciones sostenidas (ducha, salida breve, rutina de comida) pueden marcar diferencia clinica.\n\n## Derivacion\nSi hay desesperanza intensa o ideacion suicida, buscar ayuda profesional urgente.",
  Guia:
    "## Checklist sugerido\nDefine objetivo, disponibilidad horaria, presupuesto estimado y expectativas de proceso antes de la primera sesion.\n\n## Preguntas clave al profesional\nEnfoque terapeutico, experiencia en tu motivo de consulta y frecuencia recomendada.\n\n## Criterio de continuidad\nEvalua si te sentiste escuchado/a, comprendido/a y con un plan inicial claro.",
  Hábitos:
    "## Cambio sostenible\nConviene empezar con objetivos minimos viables: 10 minutos diarios antes que metas perfectas imposibles de sostener.\n\n## Diseno ambiental\nReducir friccion (dejar preparado lo necesario) aumenta adherencia.\n\n## Seguimiento\nMedir progreso semanal ayuda a sostener motivacion real.",
  Autocuidado:
    "## Autocuidado sin culpa\nNo es premio por productividad: es una condicion para funcionar mejor.\n\n## Base minima\nSueno, alimentacion, movimiento y limites digitales.\n\n## Indicador util\nSi tu energia cae de forma cronica, necesitas reducir demanda o aumentar recuperacion."
};

const categoryQuoteByCategory: Record<string, { text: string; author: string }> = {
  Ansiedad: {
    text: "No tienes que apagar tus emociones, tienes que aprender a regularlas.",
    author: "Equipo Clínico - Motivar Care"
  },
  Autoestima: {
    text: "La autoestima madura no es sentirte superior, es dejar de sentirte insuficiente.",
    author: "Equipo Clínico - Motivar Care"
  },
  Relaciones: {
    text: "Un vinculo sano no evita conflictos: aprende a atravesarlos sin destruirse.",
    author: "Equipo Clínico - Motivar Care"
  },
  Duelo: {
    text: "El duelo no se supera: se integra, y desde ahi se vuelve habitable.",
    author: "Equipo Clínico - Motivar Care"
  },
  Traumas: {
    text: "Sanar trauma es recuperar seguridad interna y posibilidad de elegir.",
    author: "Equipo Clínico - Motivar Care"
  },
  Fobias: {
    text: "La valentia no es ausencia de miedo, es moverte a pesar de el.",
    author: "Equipo Clínico - Motivar Care"
  },
  "Estrés": {
    text: "Gestionar estres no es rendir mas: es sostenerte mejor.",
    author: "Equipo Clínico - Motivar Care"
  },
  Depresión: {
    text: "Incluso en dias oscuros, pequenos actos de cuidado tienen valor terapeutico.",
    author: "Equipo Clínico - Motivar Care"
  },
  Guia: {
    text: "Una buena decision terapeutica se construye con criterio y escucha interna.",
    author: "Equipo Clínico - Motivar Care"
  },
  "Hábitos": {
    text: "Cambiar habitos requiere menos motivacion de la que crees y mas sistema del que imaginas.",
    author: "Equipo Clínico - Motivar Care"
  },
  Autocuidado: {
    text: "Sin recuperacion, no hay rendimiento sostenible.",
    author: "Equipo Clínico - Motivar Care"
  }
};

const categoryResourceLinks: Record<string, ResourceLink[]> = {
  Ansiedad: [
    { label: "NIMH - Anxiety Disorders", href: "https://www.nimh.nih.gov/health/topics/anxiety-disorders" },
    { label: "NHS - Anxiety Overview", href: "https://www.nhs.uk/mental-health/conditions/anxiety-disorders/overview/" }
  ],
  Depresión: [
    { label: "WHO - Depression", href: "https://www.who.int/news-room/fact-sheets/detail/depression" },
    { label: "NIMH - Depression", href: "https://www.nimh.nih.gov/health/topics/depression" }
  ],
  Relaciones: [
    { label: "APA - Healthy Relationships", href: "https://www.apa.org/topics/relationships" },
    { label: "Mental Health America", href: "https://www.mhanational.org/" }
  ],
  Duelo: [
    { label: "NHS - Bereavement and Grief", href: "https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/grief-bereavement-loss/" },
    { label: "Mayo Clinic - Grief", href: "https://www.mayoclinic.org/diseases-conditions/complicated-grief/symptoms-causes/syc-20360374" }
  ],
  Traumas: [
    { label: "SAMHSA - Trauma and Violence", href: "https://www.samhsa.gov/trauma-violence" },
    { label: "NIMH - PTSD", href: "https://www.nimh.nih.gov/health/topics/post-traumatic-stress-disorder-ptsd" }
  ],
  Fobias: [
    { label: "NHS - Phobias", href: "https://www.nhs.uk/mental-health/conditions/phobias/overview/" },
    { label: "Mayo Clinic - Specific phobias", href: "https://www.mayoclinic.org/diseases-conditions/specific-phobias/symptoms-causes/syc-20355156" }
  ],
  "Estrés": [
    { label: "APA - Stress Effects", href: "https://www.apa.org/topics/stress/body" },
    { label: "CDC - Coping with Stress", href: "https://www.cdc.gov/mental-health/living-with/index.html" }
  ],
  Autoestima: [
    { label: "NHS - Self-esteem and confidence", href: "https://www.nhs.uk/mental-health/self-help/tips-and-support/raise-low-self-esteem/" },
    { label: "Mind UK - Self-esteem", href: "https://www.mind.org.uk/information-support/types-of-mental-health-problems/self-esteem/" }
  ],
  "Hábitos": [
    { label: "James Clear - Habit formation principles", href: "https://jamesclear.com/habits" },
    { label: "NHS - Mental wellbeing tips", href: "https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/" }
  ],
  Guia: [
    { label: "APA - How to choose a psychologist", href: "https://www.apa.org/topics/psychotherapy/choose-therapist" },
    { label: "NIMH - Psychotherapies", href: "https://www.nimh.nih.gov/health/topics/psychotherapies" }
  ],
  Autocuidado: [
    { label: "WHO - Mental Health", href: "https://www.who.int/health-topics/mental-health" },
    { label: "NHS - 5 steps to mental wellbeing", href: "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/" }
  ]
};

const globalResourceLinks: ResourceLink[] = [
  { label: "MotivarCare - Linea de crisis", href: "/docs/crisis.html" },
  { label: "Privacy Policy / Política de Privacidad – MotivarCare", href: "/docs/privacy.html" }
];

const titleLinksByCategory: Record<string, string> = {
  Ansiedad: "https://www.nimh.nih.gov/health/topics/anxiety-disorders",
  Autoestima: "https://www.nhs.uk/mental-health/self-help/tips-and-support/raise-low-self-esteem/",
  Relaciones: "https://www.apa.org/topics/relationships",
  Duelo: "https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/grief-bereavement-loss/",
  Traumas: "https://www.samhsa.gov/trauma-violence",
  Fobias: "https://www.nhs.uk/mental-health/conditions/phobias/overview/",
  "Estrés": "https://www.apa.org/topics/stress/body",
  Depresión: "https://www.who.int/news-room/fact-sheets/detail/depression",
  Guia: "https://www.apa.org/topics/psychotherapy/choose-therapist",
  "Hábitos": "https://jamesclear.com/habits",
  Autocuidado: "https://www.who.int/health-topics/mental-health"
};

const galleryByPostId: Record<string, string[]> = {
  "blog-1": ["https://images.pexels.com/photos/3759657/pexels-photo-3759657.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-2": ["https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-3": ["https://images.pexels.com/photos/5699458/pexels-photo-5699458.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-4": ["https://images.pexels.com/photos/3807738/pexels-photo-3807738.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-5": ["https://images.pexels.com/photos/5699460/pexels-photo-5699460.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-6": ["https://images.pexels.com/photos/6634238/pexels-photo-6634238.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-7": ["https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-8": ["https://images.pexels.com/photos/5699479/pexels-photo-5699479.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-9": ["https://images.pexels.com/photos/3760270/pexels-photo-3760270.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-10": ["https://images.pexels.com/photos/5699446/pexels-photo-5699446.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-11": ["https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-12": ["https://images.pexels.com/photos/1181400/pexels-photo-1181400.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-13": ["https://images.pexels.com/photos/7176311/pexels-photo-7176311.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-14": ["https://images.pexels.com/photos/5699482/pexels-photo-5699482.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-15": ["https://images.pexels.com/photos/3822906/pexels-photo-3822906.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-16": ["https://images.pexels.com/photos/5699436/pexels-photo-5699436.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-17": ["https://images.pexels.com/photos/7648463/pexels-photo-7648463.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  "blog-18": ["https://images.pexels.com/photos/7176030/pexels-photo-7176030.jpeg?auto=compress&cs=tinysrgb&w=1200"]
};

function TrendMetric({ item, index }: { item: PlatformMetric; index: number }) {
  return (
    <article className="metric-item" style={{ animationDelay: `${index * 130}ms` }}>
      <strong>{item.title}</strong>
      {item.description ? <span>{item.description}</span> : null}
    </article>
  );
}

function RatingStars({ value }: { value: number }) {
  return (
    <span className="stars" aria-label={`Rating ${value} de 5`}>
      {"★".repeat(value)}
    </span>
  );
}

export function App() {
  const reviewsTrackRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [language, setLanguage] = useState<Language>("es");
  const [professionalHeroDesktopImage, setProfessionalHeroDesktopImage] = useState(sessionImage);
  const [professionalHeroMobileImage, setProfessionalHeroMobileImage] = useState(sessionImage);
  const [managedBlogPosts, setManagedBlogPosts] = useState<BlogPost[]>(blogPosts);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 700);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isAcceptableUseOpen, setIsAcceptableUseOpen] = useState(false);
  const [isInformedConsentOpen, setIsInformedConsentOpen] = useState(false);
  const [likeDeltas, setLikeDeltas] = useState<Record<string, number>>({});
  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState("");
  const [commentsByPost, setCommentsByPost] = useState<Record<string, BlogComment[]>>(initialCommentsByPost);
  const t = UI_TEXT[language];
  const metrics = metricsByLanguage[language];
  const postsPerPage = isMobile ? 4 : 6;
  const localeByLanguage: Record<Language, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" };
  const languageMeta: Record<Language, { label: string }> = {
    es: { label: "Español" },
    en: { label: "English" },
    pt: { label: "Português" }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isAccountOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAccountOpen]);

  useEffect(() => {
    let active = true;

    async function loadLandingSettings() {
      try {
        const contentResponse = await fetch(API_BASE + "/api/public/web-content?audience=landing");
        if (!contentResponse.ok) {
          return;
        }
        const data = (await contentResponse.json()) as WebContentResponse;
        if (!active) {
          return;
        }

        const professionalDesktop = data.settings.professionalDesktopImageUrl ?? sessionImage;
        const professionalMobile = data.settings.professionalMobileImageUrl ?? professionalDesktop;

        setProfessionalHeroDesktopImage(professionalDesktop);
        setProfessionalHeroMobileImage(professionalMobile);

        if (Array.isArray(data.reviews) && data.reviews.length > 0) {
          setReviews(data.reviews);
        }

        if (Array.isArray(data.blogPosts) && data.blogPosts.length > 0) {
          setManagedBlogPosts(data.blogPosts);
        }
      } catch {
        // fallback to default content
      }
    }

    void loadLandingSettings();

    return () => {
      active = false;
    };
  }, []);

  function localizeRelativeDate(review: ReviewItem) {
    if (review.reviewDate) {
      const from = new Date(`${review.reviewDate}T00:00:00`);
      const to = new Date();
      const diffMs = Math.max(0, to.getTime() - from.getTime());
      const days = Math.floor(diffMs / 86400000);
      if (language === "en") {
        return `${days} days ago`;
      }
      if (language === "pt") {
        return `ha ${days} dias`;
      }
      return `hace ${days} dias`;
    }

    const daysMatch = review.relativeDate.match(/(\d+)/);
    const days = daysMatch ? Number(daysMatch[1]) : null;
    if (language === "en") {
      return days ? `${days} days ago` : review.relativeDate;
    }
    if (language === "pt") {
      return days ? `ha ${days} dias` : review.relativeDate;
    }
    return review.relativeDate;
  }

  function localizeReviewRole(role: string) {
    if (language === "en" && role.toLowerCase() === "paciente") {
      return "Patient";
    }
    if (language === "pt" && role.toLowerCase() === "paciente") {
      return "Paciente";
    }
    return role;
  }

  function localizeReviewText(review: ReviewItem) {
    if (language === "es") {
      return review.text;
    }
    return reviewTextByLanguage[language]?.[review.id] ?? reviewTextFallbackByLanguage[language]?.[review.text] ?? review.text;
  }

  function localizeBlogPost(post: BlogPost): BlogPost {
    if (language === "es") {
      return post;
    }

    const localized = blogContentByLanguage[language]?.[post.id];
    const fallbackBody =
      language === "en"
        ? `${localized?.excerpt ?? post.excerpt}\n\nThis article is available in full Spanish and was adapted to English for smoother browsing. You can still review the same key ideas, practical steps, and recommendations in this version.`
        : `${localized?.excerpt ?? post.excerpt}\n\nEste artigo esta disponivel em espanhol completo e foi adaptado ao portugues para facilitar a navegacao. Nesta versao voce encontra as mesmas ideias principais, passos praticos e recomendacoes.`;

    return {
      ...post,
      title: localized?.title ?? post.title,
      subtitle: localized?.subtitle ?? post.subtitle,
      excerpt: localized?.excerpt ?? post.excerpt,
      body: localized?.body ?? fallbackBody
    };
  }

  function translateCategory(category: string) {
    const map: Record<string, { en: string; pt: string }> = {
      Ansiedad: { en: "Anxiety", pt: "Ansiedade" },
      Autoestima: { en: "Self-esteem", pt: "Autoestima" },
      Traumas: { en: "Trauma", pt: "Traumas" },
      Fobias: { en: "Phobias", pt: "Fobias" },
      Relaciones: { en: "Relationships", pt: "Relacionamentos" },
      Duelo: { en: "Grief", pt: "Luto" },
      Estrés: { en: "Stress", pt: "Estresse" },
      Depresión: { en: "Depression", pt: "Depressao" },
      Guia: { en: "Guide", pt: "Guia" },
      Hábitos: { en: "Habits", pt: "Habitos" },
      Autocuidado: { en: "Self-care", pt: "Autocuidado" },
      Todos: { en: "All", pt: "Todos" }
    };

    if (language === "es") {
      return category;
    }

    return map[category]?.[language] ?? category;
  }

  const publishedPosts = useMemo(
    () =>
      managedBlogPosts
        .filter((post) => post.status === "published")
        .sort((a, b) => {
          if (a.featured !== b.featured) {
            return Number(b.featured) - Number(a.featured);
          }
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        }),
    [managedBlogPosts]
  );

  const categories = useMemo(() => {
    const unique = Array.from(new Set(publishedPosts.map((post) => post.category))).filter(Boolean);
    return ["Todos", ...unique];
  }, [publishedPosts]);

  const localizedPublishedPosts = useMemo(() => publishedPosts.map((post) => localizeBlogPost(post)), [publishedPosts, language]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return localizedPublishedPosts.filter((post) => {
      const byCategory = activeCategory === "Todos" || post.category === activeCategory;
      const byQuery =
        normalizedQuery.length === 0 ||
        [post.title, post.excerpt, post.category, post.authorName, post.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return byCategory && byQuery;
    });
  }, [localizedPublishedPosts, activeCategory, query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, query]);

  useEffect(() => {
    if (openPostId && filteredPosts.some((post) => post.id === openPostId)) {
      return;
    }

    setOpenPostId(null);
  }, [filteredPosts, openPostId]);

  useEffect(() => {
    if (!openPostId) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPostId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openPostId]);

  useEffect(() => {
    if (!isDisclaimerOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDisclaimerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDisclaimerOpen]);

  useEffect(() => {
    if (!isTermsOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTermsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isTermsOpen]);

  useEffect(() => {
    if (!isAcceptableUseOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAcceptableUseOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAcceptableUseOpen]);

  useEffect(() => {
    if (!isInformedConsentOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsInformedConsentOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isInformedConsentOpen]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / postsPerPage));

  useEffect(() => {
    if (currentPage <= totalPages) {
      return;
    }

    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * postsPerPage;
    return filteredPosts.slice(start, start + postsPerPage);
  }, [filteredPosts, currentPage, postsPerPage]);

  const openPostIndex = useMemo(
    () => filteredPosts.findIndex((post) => post.id === openPostId),
    [filteredPosts, openPostId]
  );

  const openPost = openPostIndex >= 0 ? filteredPosts[openPostIndex] : null;

  useEffect(() => {
    const previousTitle = document.title;
    const metaName = "description";
    let meta = document.querySelector(`meta[name="${metaName}"]`) as HTMLMetaElement | null;
    const previousDescription = meta?.content ?? "";

    if (openPost) {
      document.title = openPost.seoTitle || openPost.title;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = metaName;
        document.head.appendChild(meta);
      }
      meta.content = openPost.seoDescription || openPost.excerpt;
    } else {
      document.title = "MotivarCare — Profesionales";
      if (meta) {
        meta.content = previousDescription || "Plataforma para psicólogos: agenda, videollamadas y gestión de pacientes.";
      }
    }

    return () => {
      document.title = previousTitle;
      if (meta) {
        meta.content = previousDescription;
      }
    };
  }, [openPost]);

  const openPostBody = openPost
    ? language !== "es"
      ? openPost.body
      : openPost.id === "blog-12"
      ? openPost.body
      : `${openPost.body}\n\n${categoryBodyAppendix[openPost.category] ?? categoryBodyAppendix.Guia}\n\n## Desarrollo clínico y herramientas aplicables\nEn consulta, uno de los puntos más importantes es transformar comprensión en acciones sostenibles.\n\nEso incluye definir objetivos concretos, registrar avances y revisar obstáculos sin caer en autojuicio.\n\nCuando el proceso terapéutico se combina con prácticas diarias simples, la mejora suele ser más estable en el tiempo.\n\n## Implementación semanal sugerida\nSemana 1: observación y registro de situaciones clave.\n\nSemana 2: primera herramienta de regulación y ajuste de rutina.\n\nSemana 3: consolidación, evaluación de avances y redefinición de metas.\n\n## Cita destacada\n> ${categoryQuoteByCategory[openPost.category]?.text ?? categoryQuoteByCategory.Guia.text}\n> \n> ${categoryQuoteByCategory[openPost.category]?.author ?? categoryQuoteByCategory.Guia.author}`
    : "";
  const openPostResources = openPost
    ? [...(categoryResourceLinks[openPost.category] ?? categoryResourceLinks.Guia), ...globalResourceLinks]
    : [];
  const openPostGallery = openPost ? galleryByPostId[openPost.id] ?? [] : [];

  function goToModalPost(direction: "prev" | "next") {
    if (openPostIndex < 0) {
      return;
    }

    const nextIndex = direction === "prev" ? openPostIndex - 1 : openPostIndex + 1;
    if (nextIndex < 0 || nextIndex >= filteredPosts.length) {
      return;
    }

    setOpenPostId(filteredPosts[nextIndex].id);
  }

  function scrollReviews(direction: "left" | "right") {
    if (!reviewsTrackRef.current) {
      return;
    }

    const cardWidth = 340;
    reviewsTrackRef.current.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth"
    });
  }

  function toggleLike(postId: string) {
    setLikedPostIds((current) => {
      const isLiked = Boolean(current[postId]);
      setLikeDeltas((deltas) => ({ ...deltas, [postId]: (deltas[postId] ?? 0) + (isLiked ? -1 : 1) }));
      return { ...current, [postId]: !isLiked };
    });
  }

  function handleAddComment() {
    if (!openPostId) {
      return;
    }

    const text = commentText.trim();
    if (!text) {
      return;
    }

    const newComment: BlogComment = {
      id: `new-${Date.now()}`,
      author: t.yourUser,
      avatar: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=120",
      text,
      createdAt: new Date().toISOString().slice(0, 10),
      likes: 0
    };

    setCommentsByPost((current) => ({
      ...current,
      [openPostId]: [newComment, ...(current[openPostId] ?? [])]
    }));
    setCommentText("");
  }

  return (
    <div className="landing">
      <header className="top">
        <div className="logo" aria-label="MotivarCare">
          <img className="logo-wordmark" src="/brand/motivarcare-wordmark.png" alt="" width={200} height={40} />
        </div>
        <div className="top-actions">
          <label className="lang-select-wrap">
            <span className="lang-select-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </span>
            <select
              className="lang-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              aria-label="Idioma / Language"
            >
              <option value="es">{languageMeta.es.label}</option>
              <option value="en">{languageMeta.en.label}</option>
              <option value="pt">{languageMeta.pt.label}</option>
            </select>
          </label>
          <button type="button" className="account-trigger" onClick={() => setIsAccountOpen(true)}>
            {t.myAccount}
          </button>
        </div>
      </header>

      <main className="main">
        <h1>{t.heroTitle}</h1>

        <section className="cards-stack cards-stack--single" aria-label={t.cardsAria}>
          <article className="card card-primary card-hero-professional">
            <div className="card-copy compact">
              <p className="tag">{t.psychologists}</p>
              <h2>{t.professionalHeadline}</h2>
              <p className="copy">{t.professionalCopy}</p>

              <a className="card-link-break card-cta-primary" href={PROFESSIONAL_PORTAL_URL} target="_blank" rel="noreferrer">
                {t.professionalPortal} <span aria-hidden="true">→</span>
              </a>
            </div>

            <div className="device-showcase compact-showcase">
              <figure className="macbook-shell compact-macbook">
                <div className="macbook-screen">
                  <HeroShowcaseImage
                    src={professionalHeroDesktopImage}
                    alt="Sesión remota desde MacBook Air"
                    fallback={fallbackProfessionalHeroImage}
                    originalPath={localProfessionalHeroImage}
                    optimizedBaseName="professional-hero"
                    loading="eager"
                    fetchPriority="high"
                    sizes="(max-width: 700px) 86vw, 38vw"
                  />
                </div>
                <div className="macbook-hinge" aria-hidden="true" />
                <div className="macbook-base" aria-hidden="true" />
              </figure>

              <figure className="phone-shell compact-phone">
                <span className="phone-notch" aria-hidden="true" />
                <HeroShowcaseImage
                  src={professionalHeroMobileImage}
                  alt="Sesión remota desde celular"
                  fallback={fallbackProfessionalHeroImage}
                  originalPath={localProfessionalHeroImage}
                  optimizedBaseName="professional-hero"
                  sizes="(max-width: 700px) 54vw, 18vw"
                />
              </figure>
            </div>
          </article>
        </section>

        <section className="metrics" aria-label={t.metricsAria}>
          {metrics.map((item, index) => (
            <TrendMetric key={item.id} item={item} index={index} />
          ))}
        </section>

        <section className="reviews" aria-label={t.reviewsAria}>
          <header className="reviews-head">
            <div>
              <p className="tag">{t.reviewsTag}</p>
              <h3>{t.reviewsTitle}</h3>
            </div>
            <div className="reviews-nav">
              <button type="button" onClick={() => scrollReviews("left")} aria-label={t.reviewsNavPrev}>
                ←
              </button>
              <button type="button" onClick={() => scrollReviews("right")} aria-label={t.reviewsNavNext}>
                →
              </button>
            </div>
          </header>

          <div className="reviews-viewport" ref={reviewsTrackRef}>
            <div className="reviews-grid">
              {reviews.map((review) => (
                <article key={review.id} className="review-card" style={{ borderColor: `${(review.accent ?? "#7a5cff")}33` }}>
                  <header className="review-top">
                    <div className="review-user">
                      <img src={review.avatar} alt={`Avatar de ${review.name}`} loading="lazy" />
                      <div>
                        <strong>{review.name}</strong>
                        <span>
                        {localizeReviewRole(review.role)} · {localizeRelativeDate(review)}
                        </span>
                      </div>
                    </div>
                    <RatingStars value={review.rating} />
                  </header>
                  <p>“{localizeReviewText(review)}”</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="blog" aria-label={t.blogAria}>
          <header className="blog-head">
            <p className="tag">Blog</p>
            <h3>
              {t.blogTitleA} <span>{t.blogTitleB}</span>
            </h3>
            <p>{t.blogIntro}</p>
          </header>

          <div className="blog-filters">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.blogSearch}
              aria-label={t.blogSearch}
            />
            <div className="category-pills" role="tablist" aria-label={t.categoriesAria}>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={category === activeCategory ? "active" : ""}
                  onClick={() => setActiveCategory(category)}
                >
                  {translateCategory(category)}
                </button>
              ))}
            </div>
            <p className="blog-count">
              {filteredPosts.length} {t.found}
            </p>
          </div>

          <div className="blog-grid">
            {paginatedPosts.map((post) => (
              <article key={post.id} className="blog-card" onClick={() => setOpenPostId(post.id)}>
                <img src={post.coverImage} alt={post.title} loading="lazy" />
                <div className="blog-card-copy">
                  <span>{translateCategory(post.category)}</span>
                  <h4>{post.title}</h4>
                  <p>{post.excerpt}</p>
                  <div className="blog-keywords">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={`${post.id}-${tag}`}>#{tag}</span>
                    ))}
                  </div>
                  <div className="blog-meta">
                    <small>{new Date(post.publishedAt).toLocaleDateString(localeByLanguage[language])}</small>
                    <small>{post.readTime} min</small>
                    <small>
                      {post.likes + (likeDeltas[post.id] ?? 0)} {t.likesLabel}
                    </small>
                  </div>
                  <button type="button">
                    {t.readMore} →
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="blog-pagination">
            <button type="button" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
              ← {t.prev}
            </button>
            <span>
              {t.page} {currentPage} {t.of} {totalPages}
            </span>
            <button type="button" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
              {t.next} →
            </button>
          </div>

        </section>
      </main>

      {openPost ? (
        <div className="blog-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setOpenPostId(null)}>
          <article className="blog-modal blog-modal--article" onClick={(event) => event.stopPropagation()}>
            <header className="blog-modal-head">
              <p>{translateCategory(openPost.category)}</p>
              <button type="button" onClick={() => setOpenPostId(null)} aria-label={t.close}>
                ×
              </button>
            </header>
            <img src={openPost.coverImage} alt={openPost.title} loading="lazy" />
            <h4>{openPost.title}</h4>
            <p className="detail-meta">
              {openPost.subtitle ?? `${openPost.authorName} · ${new Date(openPost.publishedAt).toLocaleDateString(localeByLanguage[language])} · ${openPost.readTime} min`}
            </p>

            <div className="blog-modal-actions">
              <button type="button" onClick={() => toggleLike(openPost.id)}>
                {likedPostIds[openPost.id] ? t.unlike : t.like} · {openPost.likes + (likeDeltas[openPost.id] ?? 0)}
              </button>
              <button type="button" onClick={() => commentInputRef.current?.focus()}>
                {t.comment} ({(commentsByPost[openPost.id] ?? []).length})
              </button>
            </div>

            <div className="blog-modal-body">
              {openPostBody.split("\n\n").map((paragraph, index) => {
                if (paragraph.startsWith("## ")) {
                  return <h5 key={`h-${index}`}>{paragraph.replace("## ", "")}</h5>;
                }

                if (paragraph.startsWith("### ")) {
                  return <h6 key={`h6-${index}`}>{paragraph.replace("### ", "")}</h6>;
                }

                if (paragraph.trimStart().startsWith(">")) {
                  const quoteLines = paragraph
                    .split("\n")
                    .map((line) => line.replace(/^>\s?/, "").trimEnd())
                    .filter((line) => line.length > 0);
                  return (
                    <blockquote key={`q-${index}`}>
                      {quoteLines.map((line, lineIndex) => (
                        <p key={`q-${index}-l-${lineIndex}`}>{line}</p>
                      ))}
                    </blockquote>
                  );
                }

                if (paragraph.startsWith("- ")) {
                  return (
                    <ul key={`ul-${index}`}>
                      {paragraph.split("\n").map((line) => (
                        <li key={line}>{line.replace("- ", "")}</li>
                      ))}
                    </ul>
                  );
                }

                return <p key={`p-${index}`}>{paragraph}</p>;
              })}
            </div>

            {openPostGallery.length > 0 ? (
              <section className="blog-modal-gallery">
                {openPostGallery.map((image) => (
                  <img key={image} src={image} alt={openPost.title} loading="lazy" />
                ))}
              </section>
            ) : null}

            <section className="blog-modal-links">
              <h5>{t.usefulLinks}</h5>
              <ul>
                {openPostResources.map((resource) => (
                  <li key={resource.href}>
                    <a href={resource.href} target="_blank" rel="noreferrer">
                      {resource.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section className="blog-comments">
              <h5>{t.comments}</h5>
              <div className="blog-comment-input">
                <input
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder={t.writeComment}
                />
                <button type="button" onClick={handleAddComment}>
                  {t.publish}
                </button>
              </div>

              <div className="blog-comments-list">
                {(commentsByPost[openPost.id] ?? []).map((comment) => (
                  <article key={comment.id}>
                    <div className="comment-user">
                      <img src={comment.avatar} alt={comment.author} loading="lazy" />
                      <div>
                        <strong>{comment.author}</strong>
                        <span>{new Date(comment.createdAt).toLocaleDateString(localeByLanguage[language])}</span>
                      </div>
                    </div>
                    <p>{comment.text}</p>
                    <small>
                      {comment.likes} {t.likesLabel}
                    </small>
                    {comment.reply ? (
                      <div className="comment-reply">
                        <strong>{comment.reply.author}</strong>
                        <p>{comment.reply.text}</p>
                        <span>{new Date(comment.reply.createdAt).toLocaleDateString(localeByLanguage[language])}</span>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <footer className="blog-modal-nav">
              <button type="button" onClick={() => goToModalPost("prev")} disabled={openPostIndex <= 0}>
                ← {t.articlePrev}
              </button>
              <button type="button" onClick={() => goToModalPost("next")} disabled={openPostIndex >= filteredPosts.length - 1}>
                {t.articleNext} →
              </button>
            </footer>
          </article>
        </div>
      ) : null}

      {isDisclaimerOpen ? (
        <div className="blog-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setIsDisclaimerOpen(false)}>
          <article className="blog-modal legal-modal" onClick={(event) => event.stopPropagation()}>
            <header className="blog-modal-head">
              <p>Legal</p>
              <button type="button" onClick={() => setIsDisclaimerOpen(false)} aria-label="Cerrar descargo de responsabilidad">
                ×
              </button>
            </header>

            <div className="legal-modal-body">
              <h4>Descargo de responsabilidad</h4>
              <p>Ultima actualizacion: 7 de marzo de 2026</p>

              <p>
                MotivarCare le otorga acceso al sitio web https://motivarcare.com (en adelante, el Sitio) y a sus aplicaciones
                moviles, invitandolo a utilizar los servicios de informacion y conexion con profesionales de salud mental que se
                ofrecen en esta plataforma.
              </p>
              <p>El uso del Sitio implica la aceptacion de los terminos establecidos en este descargo de responsabilidad.</p>

              <h5>Definiciones</h5>
              <p>Para facilitar la comprension de este documento, los siguientes terminos tendran el significado que se describe a continuacion:</p>

              <h6>Compania</h6>
              <p>
                Cuando este documento menciona MotivarCare, nosotros, nos o nuestro, se refiere a MotivarCare y a los servicios que
                ofrece a traves de su plataforma digital.
              </p>

              <h6>Plataforma</h6>
              <p>Hace referencia al sitio web, aplicaciones moviles y cualquier otro sistema digital operado por MotivarCare.</p>

              <h6>Servicio</h6>
              <p>
                Se refiere a los servicios ofrecidos por MotivarCare, que incluyen el acceso a contenido informativo, herramientas
                digitales y la conexion entre pacientes y profesionales de salud mental.
              </p>

              <h6>Usuario</h6>
              <p>Persona que accede al sitio web, utiliza la plataforma o se registra para utilizar los servicios disponibles.</p>

              <h6>Contenido</h6>
              <p>Incluye textos, articulos, graficos, imagenes, videos, informacion y cualquier otro material disponible en la plataforma.</p>

              <h5>Finalidad informativa del contenido</h5>
              <p>
                El contenido publicado en MotivarCare, incluyendo articulos del blog, materiales educativos y recursos informativos,
                tiene unicamente fines informativos y educativos.
              </p>
              <p>La informacion disponible en este sitio no constituye asesoramiento medico, psicologico o terapeutico personalizado.</p>
              <p>
                Cada persona tiene circunstancias particulares, por lo que las decisiones relacionadas con su salud mental deben
                tomarse con la orientacion de un profesional cualificado.
              </p>
              <p>La lectura o utilizacion de la informacion publicada en MotivarCare no reemplaza la consulta con un profesional de salud mental.</p>

              <h5>Relacion con profesionales de salud mental</h5>
              <p>MotivarCare ofrece una plataforma tecnologica que permite a los usuarios conectarse con profesionales independientes.</p>
              <p>
                Los profesionales que brindan servicios a traves de la plataforma son responsables de su practica profesional, sus
                intervenciones clinicas y la informacion que proporcionan durante las sesiones.
              </p>
              <p>MotivarCare actua como intermediario tecnologico y no sustituye la relacion directa entre paciente y profesional.</p>

              <h5>Limitacion de responsabilidad</h5>
              <p>
                MotivarCare realiza esfuerzos razonables para mantener actualizada y precisa la informacion disponible en la
                plataforma. Sin embargo, no garantiza que todo el contenido sea completamente exacto, actualizado o libre de errores.
              </p>
              <p>El uso del sitio y de los servicios disponibles se realiza bajo la responsabilidad del usuario.</p>
              <p>
                MotivarCare no sera responsable por danos directos o indirectos derivados del uso o de la imposibilidad de uso del
                sitio, incluyendo errores tecnicos, interrupciones del servicio o informacion incompleta.
              </p>

              <h5>Enlaces a sitios de terceros</h5>
              <p>El sitio puede contener enlaces a paginas web externas que no son operadas ni controladas por MotivarCare.</p>
              <p>Estos enlaces se proporcionan unicamente para facilitar el acceso a informacion adicional.</p>
              <p>MotivarCare no es responsable del contenido, politicas o practicas de privacidad de dichos sitios externos.</p>
              <p>Se recomienda revisar los terminos y politicas de cualquier sitio web de terceros antes de interactuar con el.</p>

              <h5>Uso del contenido</h5>
              <p>
                Todo el contenido disponible en MotivarCare, incluyendo textos, diseno, graficos, logotipos y materiales
                informativos, esta protegido por derechos de propiedad intelectual.
              </p>
              <p>
                La reproduccion, distribucion o uso de estos materiales sin autorizacion previa por escrito de MotivarCare esta
                prohibida, salvo en los casos permitidos por la legislacion aplicable.
              </p>

              <h5>Testimonios y opiniones</h5>
              <p>Los testimonios y resenas publicados en la plataforma reflejan experiencias individuales de los usuarios.</p>
              <p>Los resultados personales pueden variar y las experiencias compartidas no garantizan resultados similares para otros usuarios.</p>

              <h5>Emergencias de salud mental</h5>
              <p>MotivarCare no esta disenado para gestionar emergencias medicas o psiquiatricas.</p>
              <p>
                Si usted cree que esta atravesando una emergencia o crisis de salud mental, debe buscar ayuda inmediata a traves de
                servicios de emergencia locales o lineas de asistencia especializadas.
              </p>

              <h5>Cambios en este documento</h5>
              <p>
                MotivarCare puede actualizar este descargo de responsabilidad en cualquier momento para reflejar cambios en los
                servicios o en la normativa aplicable.
              </p>
              <p>Las modificaciones se publicaran en esta pagina con la fecha de actualizacion correspondiente.</p>
              <p>
                El uso continuado de la plataforma despues de dichos cambios implica la aceptacion de la version actualizada del documento.
              </p>

              <h5>Contacto</h5>
              <p>Si tiene preguntas sobre este descargo de responsabilidad, puede contactarnos a traves de:</p>
              <p>
                Correo electronico:
                <br />
                <a href="mailto:support@motivarcare.com">support@motivarcare.com</a>
              </p>
            </div>
          </article>
        </div>
      ) : null}

      {isTermsOpen ? (
        <div className="blog-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setIsTermsOpen(false)}>
          <article className="blog-modal legal-modal" onClick={(event) => event.stopPropagation()}>
            <header className="blog-modal-head">
              <p>Legal</p>
              <button type="button" onClick={() => setIsTermsOpen(false)} aria-label="Cerrar terminos y condiciones">
                ×
              </button>
            </header>

            <div className="legal-modal-body">
              <h4>TERMINOS Y CONDICIONES GENERALES</h4>
              <p><strong>MotivarCare</strong></p>
              <p>Ultima actualizacion: 7 de marzo de 2026</p>
              <p>
                Estos Terminos y Condiciones regulan el acceso y uso de la plataforma MotivarCare, incluyendo el sitio web, las
                aplicaciones moviles y cualquier servicio asociado.
              </p>
              <p>Al registrarse o utilizar la plataforma, el usuario acepta estos Terminos y Condiciones.</p>

              <h5>1. DEFINICIONES</h5>
              <p>Para los efectos de este documento, los siguientes terminos tendran el significado indicado:</p>
              <h6>Cuenta</h6>
              <p>Perfil personal creado por el usuario para acceder a los servicios de la plataforma.</p>
              <h6>Plataforma</h6>
              <p>El sitio web, aplicaciones moviles y cualquier sistema digital operado por MotivarCare.</p>
              <h6>Servicio</h6>
              <p>Servicios de conexion entre pacientes y profesionales de salud mental, incluyendo sesiones online por videollamada o audio.</p>
              <h6>Usuario</h6>
              <p>Persona que accede o utiliza la plataforma, incluyendo pacientes y profesionales.</p>
              <h6>Paciente</h6>
              <p>Persona que utiliza la plataforma para acceder a servicios de acompanamiento psicologico o terapeutico.</p>
              <h6>Profesional / Terapeuta</h6>
              <p>Profesional de salud mental registrado en la plataforma que ofrece sesiones terapeuticas a pacientes.</p>
              <h6>Sesion</h6>
              <p>Encuentro terapeutico realizado entre paciente y profesional a traves de la plataforma mediante videollamada o audio.</p>

              <h5>2. USO GENERAL DE LA PLATAFORMA</h5>
              <p>MotivarCare opera una plataforma tecnologica que permite conectar a pacientes con profesionales de salud mental.</p>
              <p>MotivarCare no presta servicios de terapia directamente y no interviene en la relacion profesional entre paciente y terapeuta.</p>
              <p>Los profesionales son responsables de su practica profesional y del servicio brindado durante las sesiones.</p>
              <p>El uso de la plataforma esta condicionado a la aceptacion de estos Terminos y Condiciones.</p>

              <h5>3. REQUISITOS DE USO</h5>
              <p>Para utilizar la plataforma, el usuario debe:</p>
              <ul>
                <li>tener al menos 18 anos de edad, o contar con autorizacion de un padre, madre o tutor legal si es menor</li>
                <li>proporcionar informacion veraz y actualizada</li>
                <li>mantener la confidencialidad de sus datos de acceso</li>
              </ul>
              <p>El usuario es responsable de todas las actividades realizadas desde su cuenta.</p>

              <h5>4. CREACION Y SEGURIDAD DE LA CUENTA</h5>
              <p>Para utilizar los servicios, el usuario debera crear una cuenta proporcionando:</p>
              <ul>
                <li>direccion de correo electronico</li>
                <li>contrasena</li>
                <li>informacion basica de perfil</li>
              </ul>
              <p>El usuario es responsable de proteger sus credenciales de acceso.</p>
              <p>Si detecta uso no autorizado de su cuenta, debera notificarlo inmediatamente a MotivarCare.</p>

              <h5>5. PRESTACION DE SERVICIOS</h5>
              <p>La plataforma facilita el contacto entre pacientes y profesionales de salud mental.</p>
              <p>Los usuarios pueden:</p>
              <ul>
                <li>buscar profesionales disponibles</li>
                <li>reservar sesiones</li>
                <li>realizar sesiones online mediante la plataforma</li>
                <li>gestionar citas y pagos</li>
              </ul>
              <p>Las sesiones se realizan mediante videollamada o audio dentro de la plataforma o mediante herramientas indicadas por el profesional.</p>
              <p>MotivarCare no graba ni almacena el contenido de las sesiones.</p>

              <h5>6. PAGOS Y SESIONES</h5>
              <p>Las sesiones pueden requerir pago previo segun el profesional seleccionado.</p>
              <p>Los pagos se procesan a traves de proveedores de pago externos.</p>
              <p>Cada profesional puede definir:</p>
              <ul>
                <li>el precio de sus sesiones</li>
                <li>su disponibilidad</li>
                <li>su politica de cancelacion</li>
              </ul>
              <p>Los pacientes pueden reservar sesiones segun la disponibilidad publicada por el profesional.</p>

              <h5>7. CANCELACIONES Y REPROGRAMACIONES</h5>
              <p>Las sesiones pueden ser reprogramadas o canceladas segun las condiciones establecidas por el profesional.</p>
              <p>En general:</p>
              <ul>
                <li>las cancelaciones deben realizarse con anticipacion razonable</li>
                <li>las cancelaciones tardias pueden considerarse sesion realizada</li>
              </ul>
              <p>Cada profesional puede establecer condiciones especificas dentro de la plataforma.</p>

              <h5>8. LIMITACION DE RESPONSABILIDAD</h5>
              <p>MotivarCare proporciona unicamente una plataforma tecnologica para conectar pacientes con profesionales.</p>
              <p>MotivarCare no es responsable por:</p>
              <ul>
                <li>el contenido de las sesiones terapeuticas</li>
                <li>las recomendaciones clinicas de los profesionales</li>
                <li>las decisiones tomadas por los usuarios a partir de dichas sesiones</li>
              </ul>
              <p>Los profesionales son responsables de cumplir con las regulaciones profesionales aplicables en su jurisdiccion.</p>

              <h5>9. EMERGENCIAS DE SALUD MENTAL</h5>
              <p>La plataforma no esta disenada para situaciones de emergencia.</p>
              <p>
                Si el usuario se encuentra en una crisis o emergencia de salud mental, debe contactar inmediatamente con servicios de
                emergencia locales o lineas de asistencia especializadas.
              </p>

              <h5>10. SUSPENSION O CIERRE DE CUENTAS</h5>
              <p>MotivarCare podra suspender o cerrar una cuenta si:</p>
              <ul>
                <li>el usuario viola estos terminos</li>
                <li>se detecta uso fraudulento de la plataforma</li>
                <li>se proporciona informacion falsa</li>
                <li>se realiza uso indebido del servicio</li>
              </ul>
              <p>El usuario tambien puede solicitar el cierre de su cuenta en cualquier momento.</p>

              <h5>11. PROPIEDAD INTELECTUAL</h5>
              <p>Todos los contenidos de la plataforma, incluyendo:</p>
              <ul>
                <li>textos</li>
                <li>disenos</li>
                <li>logotipos</li>
                <li>software</li>
                <li>materiales informativos</li>
              </ul>
              <p>son propiedad de MotivarCare o de sus licenciantes.</p>
              <p>No esta permitido reproducir o distribuir estos contenidos sin autorizacion previa.</p>

              <h5>12. MODIFICACIONES DE LOS TERMINOS</h5>
              <p>MotivarCare puede actualizar estos Terminos y Condiciones en cualquier momento.</p>
              <p>Las modificaciones seran publicadas en esta pagina.</p>
              <p>El uso continuado de la plataforma despues de los cambios implica la aceptacion de los nuevos terminos.</p>

              <h5>13. LEGISLACION APLICABLE</h5>
              <p>Estos Terminos se regiran por la legislacion aplicable segun el pais donde MotivarCare opere o tenga su sede legal.</p>
              <p>Las disputas que no puedan resolverse de forma amistosa se someteran a los tribunales competentes.</p>

              <h5>14. CONTACTO</h5>
              <p>Para consultas relacionadas con estos Terminos y Condiciones:</p>
              <p>
                <a href="mailto:support@motivarcare.com">support@motivarcare.com</a>
              </p>
            </div>
          </article>
        </div>
      ) : null}

      {isAcceptableUseOpen ? (
        <div className="blog-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setIsAcceptableUseOpen(false)}>
          <article className="blog-modal legal-modal" onClick={(event) => event.stopPropagation()}>
            <header className="blog-modal-head">
              <p>Legal</p>
              <button type="button" onClick={() => setIsAcceptableUseOpen(false)} aria-label="Cerrar politica de uso aceptable">
                ×
              </button>
            </header>

            <div className="legal-modal-body">
              <h4>Politica de uso aceptable</h4>
              <p>
                Esta Politica de Uso Aceptable (Politica) establece las reglas y pautas para el uso de la Plataforma Mindly
                (Plataforma). Al acceder o utilizar nuestros servicios, los Clientes aceptan cumplir con esta Politica. El
                incumplimiento puede resultar en acceso restringido, cierre de cuenta o consecuencias legales.
              </p>
              <p>
                Todas las definiciones y terminologia utilizadas en esta Politica estan alineadas con las descritas en los Terminos y
                Condiciones Generales, lo que garantiza la coherencia y la claridad.
              </p>

              <h5>1. CUMPLIMIENTO DE LA LEY</h5>
              <p>
                1.1. Los Clientes de la Plataforma deben cumplir con todas las leyes y regulaciones locales, nacionales e
                internacionales aplicables al utilizar la Plataforma y sus Servicios.
              </p>

              <h5>2. ACTIVIDADES PROHIBIDAS</h5>
              <p>2.1. Los Clientes de la Plataforma no deben participar en:</p>
              <ul>
                <li>
                  2.1.1. Violar cualquier ley, estatuto, ordenanza o reglamento o derechos de terceros, incluidas las leyes de
                  propiedad intelectual y privacidad de datos.
                </li>
                <li>
                  2.1.2. Acoso, difamacion, incitacion al odio o cualquier comportamiento discriminatorio o abusivo.
                </li>
                <li>
                  2.1.3. Suplantacion de identidad, falsas representaciones o uso de la Plataforma para actividades fraudulentas.
                </li>
                <li>
                  2.1.4. Cargar, compartir o distribuir software malicioso, archivos daninos o contenido inapropiado.
                </li>
                <li>
                  2.1.5. Obtener o intentar obtener acceso no autorizado a sistemas, datos o cuentas de usuario.
                </li>
                <li>
                  2.1.6. Los Clientes deben respetar la privacidad de los demas y no recopilar, almacenar ni compartir datos
                  personales sin consentimiento explicito.
                </li>
                <li>
                  2.1.7. Promocionar contenido explicito u obsceno que no este directamente alineado con los objetivos de Mindly.
                </li>
                <li>
                  2.1.8. Involucrar o promover productos o servicios que sean ilegales o esten sujetos a restricciones regulatorias
                  significativas.
                </li>
              </ul>

              <h5>3. USO DEL SERVICIO</h5>
              <ul>
                <li>
                  3.1. Los Terapeutas deben proporcionar servicios dentro del alcance de sus cualificaciones profesionales y cumplir
                  con los estandares eticos y legales. Se prohibe la tergiversacion de las cualificaciones o la oferta de servicios
                  que no sean de su especialidad.
                </li>
                <li>
                  3.2. Se prohibe estrictamente que los Terapeutas proporcionen sesiones o intenten gestionar situaciones que
                  impliquen a Pacientes que experimenten emergencias.
                </li>
                <li>
                  3.3. Los Pacientes deben utilizar la Plataforma con el proposito genuino de recibir terapia o servicios
                  relacionados. Esta estrictamente prohibido utilizar la Plataforma para explotar a los Terapeutas de cualquier otra
                  forma.
                </li>
                <li>
                  3.4. Los Clientes no deben realizar un uso excesivo o disruptivo que pueda afectar la disponibilidad de la
                  Plataforma para otros.
                </li>
              </ul>

              <h5>4. PAGOS Y TRANSACCIONES FINANCIERAS</h5>
              <ul>
                <li>
                  4.1. Todos los pagos procesados a traves de la Plataforma deben cumplir con las regulaciones financieras, la ley y
                  los Terminos y Condiciones Generales aplicables.
                </li>
                <li>
                  4.2. Los Clientes tienen prohibido participar en fraudes de devolucion de cargos, reversiones de pagos no
                  aprobados o cualquier actividad que socave la integridad de los sistemas de pago.
                </li>
              </ul>

              <h5>5. SEGURIDAD E INTEGRIDAD DE LA PLATAFORMA</h5>
              <p>5.1. Para mantener la integridad y seguridad de la Plataforma, los Clientes deberan:</p>
              <ul>
                <li>5.1.1. Utilizar unicamente credenciales de acceso autorizadas;</li>
                <li>
                  5.1.2. Abstenerse de introducir software, scripts o herramientas daninos que puedan danar la Plataforma;
                </li>
                <li>
                  5.1.3. Informar de inmediato al equipo de soporte de Mindly sobre cualquier vulnerabilidad o infraccion.
                </li>
              </ul>

              <h5>6. ENMIENDAS</h5>
              <p>
                6.1. Mindly se reserva el derecho de actualizar esta Politica en cualquier momento. El uso continuado de la
                Plataforma despues de las actualizaciones constituye la aceptacion de los terminos actualizados.
              </p>
            </div>
          </article>
        </div>
      ) : null}

      {isInformedConsentOpen ? (
        <div className="blog-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setIsInformedConsentOpen(false)}>
          <article className="blog-modal legal-modal" onClick={(event) => event.stopPropagation()}>
            <header className="blog-modal-head">
              <p>Legal</p>
              <button type="button" onClick={() => setIsInformedConsentOpen(false)} aria-label="Cerrar consentimiento informado">
                ×
              </button>
            </header>

            <div className="legal-modal-body">
              <h4>CONSENTIMIENTO INFORMADO</h4>
              <p><strong>Terapia Online - MotivarCare</strong></p>
              <p>Ultima actualizacion: 7 de marzo de 2026</p>
              <p>
                Este documento explica la naturaleza de los servicios de terapia online ofrecidos a traves de la plataforma
                MotivarCare. Su objetivo es asegurarse de que los usuarios comprendan las caracteristicas, beneficios y posibles
                limitaciones de este tipo de servicio.
              </p>
              <p>
                Al utilizar MotivarCare y reservar una sesion con un profesional, usted declara haber leido y comprendido este
                consentimiento informado.
              </p>

              <h5>1. Naturaleza del servicio</h5>
              <p>
                MotivarCare es una plataforma digital que conecta pacientes con profesionales de salud mental para la realizacion de
                sesiones de terapia online.
              </p>
              <p>Las sesiones pueden realizarse mediante:</p>
              <ul>
                <li>videollamada</li>
                <li>llamada de audio</li>
                <li>otros medios de comunicacion digital disponibles en la plataforma</li>
              </ul>
              <p>MotivarCare no presta servicios terapeuticos directamente. Las sesiones son proporcionadas por profesionales independientes.</p>

              <h5>2. Alcance de la terapia online</h5>
              <p>La terapia online puede ser util para trabajar temas como:</p>
              <ul>
                <li>ansiedad</li>
                <li>estres</li>
                <li>autoestima</li>
                <li>relaciones personales</li>
                <li>desarrollo personal</li>
                <li>acompanamiento emocional</li>
              </ul>
              <p>Sin embargo, la terapia online puede no ser adecuada para todas las situaciones clinicas.</p>
              <p>
                En algunos casos, el profesional puede recomendar atencion presencial u otro tipo de tratamiento especializado.
              </p>

              <h5>3. Limitaciones de la terapia online</h5>
              <p>Aunque la terapia online puede ser efectiva, existen algunas limitaciones potenciales:</p>
              <ul>
                <li>interrupciones tecnicas o problemas de conexion</li>
                <li>menor disponibilidad de senales no verbales</li>
                <li>dificultades para intervenir en situaciones de crisis</li>
              </ul>
              <p>
                Los usuarios aceptan que el uso de tecnologia puede implicar riesgos tecnicos fuera del control del profesional o de
                la plataforma.
              </p>

              <h5>4. Confidencialidad</h5>
              <p>
                Los profesionales que brindan servicios a traves de MotivarCare estan obligados a respetar los principios de
                confidencialidad propios de la practica psicologica.
              </p>
              <p>
                La informacion compartida durante las sesiones debe mantenerse confidencial, excepto en situaciones donde la ley
                requiera su divulgacion, como por ejemplo:
              </p>
              <ul>
                <li>riesgo de dano para el propio paciente</li>
                <li>riesgo de dano para terceros</li>
                <li>requerimientos legales o judiciales</li>
              </ul>
              <p>Se recomienda a los pacientes participar en las sesiones desde un entorno privado para proteger su propia confidencialidad.</p>

              <h5>5. Emergencias</h5>
              <p>MotivarCare no esta disenado para atender emergencias de salud mental.</p>
              <p>
                Si usted se encuentra en una situacion de crisis o emergencia, debe contactar inmediatamente con servicios de
                emergencia locales o lineas de asistencia especializadas.
              </p>

              <h5>6. Responsabilidad del paciente</h5>
              <p>El paciente es responsable de:</p>
              <ul>
                <li>proporcionar informacion veraz al profesional</li>
                <li>asistir a las sesiones programadas</li>
                <li>contar con una conexion a internet adecuada</li>
                <li>participar en un espacio privado y seguro</li>
              </ul>

              <h5>7. Consentimiento</h5>
              <p>Al utilizar MotivarCare y reservar sesiones de terapia online, el paciente declara que:</p>
              <ul>
                <li>comprende la naturaleza de la terapia online</li>
                <li>acepta las posibles limitaciones tecnologicas</li>
                <li>entiende que el profesional es responsable de la atencion clinica</li>
                <li>acepta participar voluntariamente en el proceso terapeutico</li>
              </ul>

              <h5>8. Contacto</h5>
              <p>
                Si tiene preguntas sobre este consentimiento informado o sobre el funcionamiento de la plataforma, puede contactarnos en:
              </p>
              <p>
                <a href="mailto:support@motivarcare.com">support@motivarcare.com</a>
              </p>
            </div>
          </article>
        </div>
      ) : null}

      {isAccountOpen ? (
        <div className="blog-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setIsAccountOpen(false)}>
          <article className="blog-modal account-modal" onClick={(event) => event.stopPropagation()}>
            <header className="blog-modal-head">
              <p>{t.myAccount}</p>
              <button type="button" onClick={() => setIsAccountOpen(false)} aria-label={t.close}>
                ×
              </button>
            </header>

            <div className="account-modal-body">
              <h4>{t.accountAccessTitle}</h4>
              <p>{t.accountAccessCopy}</p>
              <a
                className="account-modal-cta"
                href={PROFESSIONAL_PORTAL_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsAccountOpen(false)}
              >
                {t.accountPortalProfessional} <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>
        </div>
      ) : null}

      <footer className="footer">
        <div className="footer-top">
          <section className="footer-brand">
            <div className="logo logo--footer" aria-label="MotivarCare">
              <img className="logo-full" src="/brand/motivarcare-logo-full.png" alt="" width={260} height={80} />
            </div>
            <p>{t.footerBrand}</p>
            <a href="mailto:soporte@motivarcare.com">soporte@motivarcare.com</a>
          </section>

          <section className="footer-col">
            <h5>{t.company}</h5>
            <button type="button" className="footer-disclaimer-trigger" onClick={() => setIsDisclaimerOpen(true)}>
              Descargo de responsabilidad
            </button>
            <button type="button" className="footer-disclaimer-trigger" onClick={() => setIsTermsOpen(true)}>
              {t.terms}
            </button>
            <a className="footer-disclaimer-trigger" href="/docs/privacy.html">
              {t.privacy}
            </a>
            <button type="button" className="footer-disclaimer-trigger" onClick={() => setIsAcceptableUseOpen(true)}>
              Política de uso aceptable
            </button>
            <button type="button" className="footer-disclaimer-trigger" onClick={() => setIsInformedConsentOpen(true)}>
              Consentimiento informado
            </button>
          </section>

          <section className="footer-col">
            <h5>{t.useful}</h5>
            <a href="/docs/crisis.html">{t.supportLine}</a>
            <a href={PROFESSIONAL_PORTAL_URL} target="_blank" rel="noreferrer">
              {t.professionalPortalShort}
            </a>
          </section>
        </div>

        <div className="footer-bottom">
          <span>{t.footerLanguage}</span>
          <span>
            v 0.1.0 · © 2026 MotivarCare. {t.rights}
          </span>
        </div>
      </footer>
    </div>
  );
}
