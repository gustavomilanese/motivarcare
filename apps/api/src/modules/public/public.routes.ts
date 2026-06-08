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
import { getResilientUsdArsRate } from "../../lib/usdArsExchangeResilient.js";
import { env } from "../../config/env.js";
import { type ExercisePost } from "../web-content/exercises.defaults.js";
import {
  WEB_EXERCISE_ROUTINES_KEY,
  exerciseRoutinesCollectionSchema,
  type ExerciseRoutine
} from "../web-content/exerciseRoutines.defaults.js";
import { DEFAULT_BLOG_POSTS, type BlogPostDefault } from "../web-content/blogPosts.defaults.js";
import {
  WEB_RELAXATION_PLAYLISTS_KEY,
  relaxationPlaylistsCollectionSchema,
  resolvePublicRelaxationPlaylists
} from "../web-content/relaxationPlaylists.defaults.js";
import { DEFAULT_LANDING_WEB_REVIEWS } from "../web-content/reviews.defaults.js";

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
  reviewDate: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? undefined : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  ),
  relativeDate: z.string().min(2).max(80),
  text: z.string().min(5).max(2000),
  rating: z.coerce.number().int().min(1).max(5),
  avatar: imageSourceSchema,
  accent: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? undefined : v),
    z.string().trim().min(4).max(32).optional()
  )
});

function parseStoredLandingReviews(raw: unknown): z.infer<typeof reviewSchema>[] {
  if (!Array.isArray(raw)) return [];
  const out: z.infer<typeof reviewSchema>[] = [];
  for (const item of raw) {
    const parsed = reviewSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

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

type PublicExerciseRoutineStep = Pick<
  ExercisePost,
  "id" | "slug" | "title" | "emoji" | "durationMinutes" | "category" | "summary"
>;

interface PublicExerciseRoutine extends Omit<ExerciseRoutine, "exerciseIds"> {
  exerciseIds: string[];
  exercises: PublicExerciseRoutineStep[];
  totalDurationMinutes: number;
}

function resolvePublishedExerciseRoutines(
  storedRoutines: ExerciseRoutine[],
  publishedExercises: ExercisePost[]
): PublicExerciseRoutine[] {
  const exerciseById = new Map(publishedExercises.map((exercise) => [exercise.id, exercise]));

  return storedRoutines
    .filter((routine) => routine.status === "published")
    .map((routine) => {
      const exercises = routine.exerciseIds
        .map((id) => exerciseById.get(id))
        .filter((exercise): exercise is ExercisePost => Boolean(exercise))
        .map((exercise) => ({
          id: exercise.id,
          slug: exercise.slug,
          title: exercise.title,
          emoji: exercise.emoji,
          durationMinutes: exercise.durationMinutes,
          category: exercise.category,
          summary: exercise.summary
        }));

      if (exercises.length < 2) {
        return null;
      }

      return {
        ...routine,
        exercises,
        totalDurationMinutes: exercises.reduce((total, exercise) => total + exercise.durationMinutes, 0)
      } satisfies PublicExerciseRoutine;
    })
    .filter((routine): routine is PublicExerciseRoutine => routine !== null)
    .sort((a, b) => {
      if (a.featured !== b.featured) {
        return Number(b.featured) - Number(a.featured);
      }
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
}

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

import { billingCurrencyCodeForMarket } from "@therapy/types";
import {
  resolvePackageDiscountPercent,
  resolvePackagePriceUsdCents
} from "../../lib/resolveSessionPackagePrice.js";

function resolveSessionPackageMarketingLabel(credits: number): "Inicio" | "Continuidad" | "Intensivo" {
  if (credits <= 4) {
    return "Inicio";
  }
  if (credits <= 8) {
    return "Continuidad";
  }
  return "Intensivo";
}

const sessionPackageCatalogInclude = {
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
} as const;

function bundleSessionPackages<T extends { credits: number }>(items: T[]): T[] {
  return items.filter((item) => item.credits > 1);
}

function orderPatientSessionPackages<T extends {
  id: string;
  active: boolean;
  credits: number;
  professionalId: string | null;
}>(params: {
  channel: "landing" | "patient" | undefined;
  market: Market;
  packages: T[];
  visibility: ReturnType<typeof parseSessionPackagesVisibility>;
  landingSlot: "patient_main" | "patient_v2" | "professional";
}): T[] {
  const patientIdsForMarket = patientVisibilityIdsForMarket(params.visibility, params.market);
  const requestedIds =
    params.channel === "landing"
      ? landingVisibilityIdsForSlot(params.visibility, params.landingSlot)
      : params.channel === "patient"
        ? patientIdsForMarket
        : [];
  const packagesFromVisibility = requestedIds
    .map((id) => params.packages.find((item) => item.id === id))
    .filter((item): item is T => Boolean(item));
  let orderedPackages = params.channel
    ? packagesFromVisibility.length > 0
      ? packagesFromVisibility
      : bundleSessionPackages(params.packages).slice(0, 3)
    : params.packages.slice(0, 3);

  if (params.channel === "patient") {
    const singleCredit = params.packages.find(
      (item) => item.active && item.credits === 1 && item.professionalId === null
    );
    if (singleCredit && !orderedPackages.some((item) => item.id === singleCredit.id)) {
      orderedPackages = [singleCredit, ...orderedPackages];
    }
  }

  return orderedPackages;
}

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
   * Cotización USD/ARS para normalizar filas legacy del catálogo (ARS → USD).
   */
  const arsPerUsd = await getResilientUsdArsRate();
  const landingSlot = parsed.data.landingSlot ?? "patient_main";

  const [packages, visibilityConfig, selectedProfessional] = await Promise.all([
    prisma.sessionPackage.findMany({
      where: { active: true, market },
      include: sessionPackageCatalogInclude,
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
  let orderedPackages = orderPatientSessionPackages({
    channel: parsed.data.channel,
    market,
    packages,
    visibility,
    landingSlot
  });

  if (parsed.data.channel === "patient" && bundleSessionPackages(orderedPackages).length === 0 && market !== "AR") {
    const arPackages = await prisma.sessionPackage.findMany({
      where: { active: true, market: "AR" },
      include: sessionPackageCatalogInclude,
      orderBy: [{ credits: "asc" }, { createdAt: "asc" }]
    });
    if (bundleSessionPackages(arPackages).length > 0) {
      orderedPackages = orderPatientSessionPackages({
        channel: "patient",
        market: "AR",
        packages: arPackages,
        visibility,
        landingSlot
      });
    }
  }
  const featuredPatientForMarket = featuredPatientIdForMarket(visibility, market);
  const configuredFeaturedPackageId =
    parsed.data.channel === "landing"
      ? featuredLandingIdForSlot(visibility, landingSlot)
      : parsed.data.channel === "patient"
        ? featuredPatientForMarket
        : null;
  const featuredPackageId =
    configuredFeaturedPackageId && orderedPackages.some((item) => item.id === configuredFeaturedPackageId)
      ? configuredFeaturedPackageId
      : orderedPackages.find((item) => item.credits > 1)?.id ?? orderedPackages[0]?.id ?? null;

  return res.json({
    market,
    featuredPackageId,
    sessionPackages: orderedPackages.map((item) => {
      const pricingProfile = selectedProfessional ?? item.professional;
      const discountPercent = resolvePackageDiscountPercent({
        credits: item.credits,
        fallbackDiscountPercent: item.discountPercent,
        profileDiscount4: pricingProfile?.discount4,
        profileDiscount8: pricingProfile?.discount8,
        profileDiscount12: pricingProfile?.discount12
      });
      const sessionListPriceUsdMajor =
        pricingProfile ? listPriceMajorUnitsForPackageMarket(pricingProfile, market, arsPerUsd) : null;
      const priceCents = resolvePackagePriceUsdCents({
        credits: item.credits,
        fallbackPriceCents: item.priceCents,
        fallbackCurrency: item.currency,
        sessionListPriceUsdMajor,
        discountPercent,
        arsPerUsd
      });
      const normalizedCurrency = billingCurrencyCodeForMarket(market);

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

  const [settingsConfig, reviewsConfig, blogConfig, exercisesConfig, routinesConfig, relaxationConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: LANDING_SETTINGS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_EXERCISES_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_EXERCISE_ROUTINES_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_RELAXATION_PLAYLISTS_KEY } })
  ]);

  const storedReviews = parseStoredLandingReviews(reviewsConfig?.value);
  const reviewsForPublic = storedReviews.length > 0 ? storedReviews : [...DEFAULT_LANDING_WEB_REVIEWS];
  const postsParsed = z.array(blogPostSchema).safeParse(blogConfig?.value);
  const exercisesParsed = z.array(exerciseSchema).safeParse(exercisesConfig?.value);
  const routinesParsed = exerciseRoutinesCollectionSchema.safeParse(routinesConfig?.value);
  const relaxationParsed = relaxationPlaylistsCollectionSchema.safeParse(relaxationConfig?.value);

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

  const storedExercises = exercisesParsed.success ? exercisesParsed.data : [];
  const publishedExercises = storedExercises
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

  const storedRoutines = routinesParsed.success ? routinesParsed.data : [];
  const publishedExerciseRoutines = resolvePublishedExerciseRoutines(storedRoutines, publishedExercises);

  const storedRelaxation = relaxationParsed.success ? relaxationParsed.data : [];
  const relaxationPlaylists = resolvePublicRelaxationPlaylists(storedRelaxation);

  return res.json({
    settings: parseLandingSettings(settingsConfig?.value),
    reviews: reviewsForPublic,
    blogPosts: publishedPosts,
    exercises: publishedExercises,
    exerciseRoutines: publishedExerciseRoutines,
    relaxationPlaylists,
    updatedAt: {
      settings: settingsConfig?.updatedAt ?? null,
      reviews: reviewsConfig?.updatedAt ?? null,
      blogPosts: blogConfig?.updatedAt ?? null,
      exercises: exercisesConfig?.updatedAt ?? null,
      exerciseRoutines: routinesConfig?.updatedAt ?? null,
      relaxationPlaylists: relaxationConfig?.updatedAt ?? null
    }
  });
});
