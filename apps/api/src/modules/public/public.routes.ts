import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { Router } from "express";
import type { Market } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import {
  featuredLandingIdForSlot,
  featuredPatientIdForMarket,
  landingVisibilityIdsForSlot,
  parseSessionPackagesVisibility,
  patientVisibilityIdsForMarket
} from "../../lib/sessionPackageVisibility.js";
import {
  AR_SESSION_LIST_MAX,
  AR_SESSION_LIST_MIN,
  listPriceMajorUnitsForPackageMarket
} from "../../lib/professionalSessionListPrice.js";
import { getFinanceRules } from "../finance/finance.service.js";
import { getUsdArsRate } from "../../lib/usdArsExchange.js";
import { env } from "../../config/env.js";
import { DEFAULT_EXERCISES, type ExercisePost } from "../web-content/exercises.defaults.js";
import { DEFAULT_BLOG_POSTS, type BlogPostDefault } from "../web-content/blogPosts.defaults.js";

const publicModuleDir = path.dirname(fileURLToPath(import.meta.url));
const demoAvatarsDir = path.join(publicModuleDir, "../../../public/demo-avatars");

const LANDING_SETTINGS_KEY = "landing-settings";
const WEB_REVIEWS_KEY = "landing-web-reviews";
const WEB_BLOG_POSTS_KEY = "landing-web-blog-posts";
const WEB_EXERCISES_KEY = "patient-web-exercises";
const SESSION_PACKAGES_VISIBILITY_KEY = "session-packages-visibility";
const blogStatusSchema = z.enum(["draft", "published"]);
const exerciseStatusSchema = z.enum(["draft", "published"]);
const exerciseDifficultySchema = z.enum(["principiante", "intermedio", "avanzado"]);
const exerciseCategorySchema = z.enum([
  "respiracion",
  "postura",
  "grounding",
  "movimiento",
  "relajacion",
  "mindfulness"
]);
const landingPackagesSlotSchema = z.enum(["patient_main", "patient_v2", "professional"]);

const sessionPackagesChannelSchema = z.object({
  channel: z.enum(["landing", "patient"]).optional(),
  /** Con `channel=landing`, elige qué sitio consume la lista (default `patient_main`). */
  landingSlot: landingPackagesSlotSchema.optional(),
  professionalId: z.string().trim().min(1).optional(),
  /** Catálogo por mercado (default AR). */
  market: z.enum(["AR", "US", "BR", "ES"]).optional()
});

const imageSourceSchema = z
  .string()
  .trim()
  .max(20_000_000)
  .refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/"), {
    message: "Invalid image source"
  });

const landingSettingsSchema = z.object({
  patientHeroImageUrl: imageSourceSchema.nullable(),
  patientDesktopImageUrl: imageSourceSchema.nullable().optional(),
  patientMobileImageUrl: imageSourceSchema.nullable().optional(),
  professionalDesktopImageUrl: imageSourceSchema.nullable().optional(),
  professionalMobileImageUrl: imageSourceSchema.nullable().optional()
});

const reviewSchema = z.object({
  id: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  role: z.string().min(2).max(80),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  relativeDate: z.string().min(2).max(80),
  text: z.string().min(5).max(2000),
  rating: z.number().int().min(1).max(5),
  avatar: imageSourceSchema,
  accent: z.string().trim().min(4).max(32).optional()
});

const blogPostSchema = z.object({
  id: z.string().min(2).max(120),
  title: z.string().min(5).max(200),
  subtitle: z.string().max(240).optional(),
  slug: z.string().min(3).max(160),
  excerpt: z.string().min(10).max(600),
  category: z.string().min(2).max(80),
  coverImage: imageSourceSchema,
  authorName: z.string().min(2).max(120),
  authorRole: z.string().min(2).max(120),
  authorAvatar: imageSourceSchema,
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  readTime: z.number().int().min(1).max(120),
  likes: z.number().int().min(0).max(1_000_000),
  tags: z.array(z.string().min(1).max(48)).max(24),
  status: blogStatusSchema,
  featured: z.boolean(),
  seoTitle: z.string().min(10).max(220),
  seoDescription: z.string().min(20).max(320),
  body: z.string().min(80).max(100_000),
  /** Si una nota no especifica audiencias, se asume visible en ambos lugares (legacy compat). */
  showOnPatientPortal: z.boolean().optional().default(true),
  showOnLanding: z.boolean().optional().default(true)
});

const blogAudienceSchema = z.enum(["patient", "landing"]);

const exerciseSchema = z.object({
  id: z.string().min(2).max(120),
  slug: z.string().min(2).max(160),
  title: z.string().min(3).max(160),
  summary: z.string().min(10).max(500),
  description: z.string().min(20).max(2_000),
  category: exerciseCategorySchema,
  durationMinutes: z.number().int().min(1).max(120),
  difficulty: exerciseDifficultySchema,
  emoji: z.string().min(1).max(8),
  steps: z.array(z.string().min(2).max(600)).min(1).max(20),
  tips: z.array(z.string().min(2).max(400)).max(12),
  benefits: z.array(z.string().min(2).max(200)).max(10),
  contraindications: z.string().max(800),
  tags: z.array(z.string().min(1).max(40)).max(12),
  status: exerciseStatusSchema,
  featured: z.boolean(),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sortOrder: z.number().int().min(0).max(100_000)
});

function parseLandingSettings(value: unknown) {
  const parsed = landingSettingsSchema.safeParse(value);
  if (parsed.success) {
    return {
      patientHeroImageUrl: parsed.data.patientHeroImageUrl,
      patientDesktopImageUrl: parsed.data.patientDesktopImageUrl ?? parsed.data.patientHeroImageUrl,
      patientMobileImageUrl: parsed.data.patientMobileImageUrl ?? parsed.data.patientHeroImageUrl,
      professionalDesktopImageUrl: parsed.data.professionalDesktopImageUrl ?? null,
      professionalMobileImageUrl: parsed.data.professionalMobileImageUrl ?? null
    };
  }

  return {
    patientHeroImageUrl: null,
    patientDesktopImageUrl: null,
    patientMobileImageUrl: null,
    professionalDesktopImageUrl: null,
    professionalMobileImageUrl: null
  };
}

export const publicRouter = Router();

/** Fotos demo servidas por el mismo host que el API (útil en Expo: misma IP/LAN que login). */
publicRouter.use("/demo-avatars", express.static(demoAvatarsDir, { index: false, maxAge: "7d" }));

/** Límites de precio por sesión (USD) alineados con `getFinanceRules` y validación de perfil profesional. */
publicRouter.get("/session-price-bounds", async (_req, res) => {
  const rules = await getFinanceRules();
  return res.json({
    sessionPriceMinUsd: rules.sessionPriceMinUsd,
    sessionPriceMaxUsd: rules.sessionPriceMaxUsd,
    sessionPriceMinArs: AR_SESSION_LIST_MIN,
    sessionPriceMaxArs: AR_SESSION_LIST_MAX
  });
});

/**
 * Feature flags públicos (los que el cliente puede leer sin auth).
 * Mantener acotado: solo flags de visibilidad de UI, NUNCA secretos.
 */
publicRouter.get("/features", (_req, res) => {
  return res.json({
    intakeChatEnabled: env.INTAKE_CHAT_ENABLED,
    treatmentChatEnabled: env.TREATMENT_CHAT_ENABLED
  });
});

/** Cotización ARS por USD (oficial, cacheada en el API). Usada para derivar precio de lista en pesos. */
publicRouter.get("/fx/usd-ars", async (_req, res) => {
  try {
    const rate = await getUsdArsRate();
    return res.json({ rate });
  } catch {
    return res.status(503).json({ error: "FX_UNAVAILABLE" });
  }
});

const checkEmailQuerySchema = z.object({
  email: z.string().trim().email().max(254)
});

/** Comprueba si un email está libre para registro (onboarding web antes de crear cuenta). */
publicRouter.get("/check-email", async (req, res) => {
  const parsed = checkEmailQuerySchema.safeParse({
    email: typeof req.query.email === "string" ? req.query.email : ""
  });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email" });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return res.json({ available: existing === null });
});

function resolvePackageDiscountPercent(params: {
  credits: number;
  fallbackDiscountPercent: number;
  profileDiscount4: number | null | undefined;
  profileDiscount8: number | null | undefined;
  profileDiscount12: number | null | undefined;
}): number {
  if (params.credits === 1) {
    return 0;
  }
  if (params.credits === 4 && params.profileDiscount4 !== null && params.profileDiscount4 !== undefined) {
    return params.profileDiscount4;
  }
  if (params.credits === 8 && params.profileDiscount8 !== null && params.profileDiscount8 !== undefined) {
    return params.profileDiscount8;
  }
  if (params.credits === 12 && params.profileDiscount12 !== null && params.profileDiscount12 !== undefined) {
    return params.profileDiscount12;
  }
  return params.fallbackDiscountPercent;
}

function resolvePackagePriceCents(params: {
  credits: number;
  fallbackPriceCents: number;
  sessionPriceUsd: number | null | undefined;
  discountPercent: number;
}): number {
  if (!params.sessionPriceUsd || params.sessionPriceUsd <= 0) {
    return params.fallbackPriceCents;
  }
  const listPriceCents = params.sessionPriceUsd * params.credits * 100;
  return Math.max(0, Math.round(listPriceCents * (1 - params.discountPercent / 100)));
}

function resolveSessionPackageMarketingLabel(credits: number): "Inicio" | "Continuidad" | "Intensivo" {
  if (credits <= 4) {
    return "Inicio";
  }
  if (credits <= 8) {
    return "Continuidad";
  }
  return "Intensivo";
}

const CURRENCY_FOR_MARKET: Record<Market, string> = {
  AR: "ars",
  US: "usd",
  BR: "brl",
  ES: "eur"
};

publicRouter.get("/session-packages", async (req, res) => {
  const parsed = sessionPackagesChannelSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const market: Market =
    parsed.data.market === "US" || parsed.data.market === "BR" || parsed.data.market === "ES"
      ? parsed.data.market
      : "AR";

  /**
   * Para market=AR, intentamos obtener cotización USD/ARS para derivar precio si el
   * profesional sólo tiene `sessionPriceUsd`. Si la cotización no está disponible,
   * caemos al precio guardado en el package (que ya viene en pesos por seed/ABM).
   */
  let arsPerUsd: number | null = null;
  if (market === "AR") {
    try {
      arsPerUsd = await getUsdArsRate();
    } catch (error) {
      console.warn("USD/ARS rate unavailable for /session-packages — usando fallback DB", error);
      arsPerUsd = null;
    }
  }

  const [packages, visibilityConfig, selectedProfessional] = await Promise.all([
    prisma.sessionPackage.findMany({
      where: { active: true, market },
      include: {
        professional: {
          select: {
            id: true,
            market: true,
            sessionPriceArs: true,
            sessionPriceUsd: true,
            discount4: true,
            discount8: true,
            discount12: true,
            user: { select: { fullName: true } }
          }
        }
      },
      orderBy: [{ credits: "asc" }, { createdAt: "asc" }]
    }),
    prisma.systemConfig.findUnique({ where: { key: SESSION_PACKAGES_VISIBILITY_KEY } }),
    parsed.data.professionalId
      ? prisma.professionalProfile.findUnique({
          where: { id: parsed.data.professionalId },
          select: {
            id: true,
            market: true,
            sessionPriceArs: true,
            sessionPriceUsd: true,
            discount4: true,
            discount8: true,
            discount12: true,
            user: { select: { fullName: true } }
          }
        })
      : Promise.resolve(null)
  ]);
  const visibility = parseSessionPackagesVisibility(visibilityConfig?.value);
  const patientIdsForMarket = patientVisibilityIdsForMarket(visibility, market);
  const landingSlot = parsed.data.landingSlot ?? "patient_main";
  const requestedIds =
    parsed.data.channel === "landing"
      ? landingVisibilityIdsForSlot(visibility, landingSlot)
      : parsed.data.channel === "patient"
        ? patientIdsForMarket
        : [];
  let orderedPackages =
    parsed.data.channel
      ? requestedIds.map((id) => packages.find((item) => item.id === id)).filter((item): item is (typeof packages)[number] => Boolean(item))
      : packages.slice(0, 3);

  if (parsed.data.channel === "patient") {
    const singleCredit = packages.find((item) => item.active && item.credits === 1 && item.professionalId === null);
    if (singleCredit && !orderedPackages.some((item) => item.id === singleCredit.id)) {
      orderedPackages = [singleCredit, ...orderedPackages];
    }
  }
  const featuredPatientForMarket = featuredPatientIdForMarket(visibility, market);
  const featuredPackageId =
    parsed.data.channel === "landing"
      ? featuredLandingIdForSlot(visibility, landingSlot)
      : parsed.data.channel === "patient"
        ? featuredPatientForMarket
        : null;

  return res.json({
    market,
    featuredPackageId: featuredPackageId && orderedPackages.some((item) => item.id === featuredPackageId) ? featuredPackageId : null,
    sessionPackages: orderedPackages.map((item) => {
      const pricingProfile = selectedProfessional ?? item.professional;
      const discountPercent = resolvePackageDiscountPercent({
        credits: item.credits,
        fallbackDiscountPercent: item.discountPercent,
        profileDiscount4: pricingProfile?.discount4,
        profileDiscount8: pricingProfile?.discount8,
        profileDiscount12: pricingProfile?.discount12
      });
      const sessionListPriceMajor =
        pricingProfile
          ? listPriceMajorUnitsForPackageMarket(
              pricingProfile,
              market,
              market === "AR" ? arsPerUsd : null
            )
          : null;
      const priceCents = resolvePackagePriceCents({
        credits: item.credits,
        fallbackPriceCents: item.priceCents,
        sessionPriceUsd: sessionListPriceMajor,
        discountPercent
      });
      /**
       * Forzamos `currency` por market para evitar incoherencias con seeds antiguos:
       * lo que el paciente ve siempre debe coincidir con la moneda real del mercado.
       */
      const normalizedCurrency = CURRENCY_FOR_MARKET[market];

      return {
        id: item.id,
        professionalId: item.professionalId,
        professionalName: item.professional?.user.fullName ?? null,
        stripePriceId: item.stripePriceId,
        market: item.market,
        paymentProvider: item.paymentProvider,
        name: item.name,
        credits: item.credits,
        priceCents,
        discountPercent,
        marketingLabel: resolveSessionPackageMarketingLabel(item.credits),
        currency: normalizedCurrency,
        active: item.active,
        createdAt: item.createdAt
      };
    })
  });
});


publicRouter.get("/landing-settings", async (_req, res) => {
  const config = await prisma.systemConfig.findUnique({
    where: { key: LANDING_SETTINGS_KEY }
  });

  if (!config) {
    return res.json({
      settings: parseLandingSettings(null),
      updatedAt: null
    });
  }

  return res.json({
    settings: parseLandingSettings(config.value),
    updatedAt: config.updatedAt
  });
});

publicRouter.get("/web-content", async (req, res) => {
  const audienceParsed = blogAudienceSchema.safeParse(req.query.audience);
  const audience = audienceParsed.success ? audienceParsed.data : null;

  const [settingsConfig, reviewsConfig, blogConfig, exercisesConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: LANDING_SETTINGS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_EXERCISES_KEY } })
  ]);

  const reviewsParsed = z.array(reviewSchema).safeParse(reviewsConfig?.value);
  const postsParsed = z.array(blogPostSchema).safeParse(blogConfig?.value);
  const exercisesParsed = z.array(exerciseSchema).safeParse(exercisesConfig?.value);

  // Si admin todavía no cargó ninguna nota, devolvemos el catálogo de cortesía (publicadas).
  // En cuanto el admin guarde aunque sea una, solo se sirven las suyas.
  const storedPosts = postsParsed.success ? postsParsed.data : [];
  const postsSource: BlogPostDefault[] = storedPosts.length > 0 ? storedPosts : DEFAULT_BLOG_POSTS;
  const publishedPosts = postsSource
    .filter((post) => post.status === "published")
    .filter((post) => {
      if (audience === "patient") {
        return post.showOnPatientPortal !== false;
      }
      if (audience === "landing") {
        return post.showOnLanding !== false;
      }
      // Sin audiencia explícita: incluir si está visible en al menos un canal.
      return post.showOnPatientPortal !== false || post.showOnLanding !== false;
    })
    .sort((a, b) => {
      if (a.featured !== b.featured) {
        return Number(b.featured) - Number(a.featured);
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  // Si admin todavía no cargó ninguno, devolvemos los 10 ejercicios de fallback (publicados).
  // En cuanto el admin guarde aunque sea uno, solo se usan los suyos.
  const storedExercises = exercisesParsed.success ? exercisesParsed.data : [];
  const exercisesSource: ExercisePost[] = storedExercises.length > 0 ? storedExercises : DEFAULT_EXERCISES;
  const publishedExercises = exercisesSource
    .filter((exercise) => exercise.status === "published")
    .sort((a, b) => {
      if (a.featured !== b.featured) {
        return Number(b.featured) - Number(a.featured);
      }
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  return res.json({
    settings: parseLandingSettings(settingsConfig?.value),
    reviews: reviewsParsed.success ? reviewsParsed.data : [],
    blogPosts: publishedPosts,
    exercises: publishedExercises,
    updatedAt: {
      settings: settingsConfig?.updatedAt ?? null,
      reviews: reviewsConfig?.updatedAt ?? null,
      blogPosts: blogConfig?.updatedAt ?? null,
      exercises: exercisesConfig?.updatedAt ?? null
    }
  });
});
