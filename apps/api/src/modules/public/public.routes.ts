import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const LANDING_SETTINGS_KEY = "landing-settings";
const WEB_REVIEWS_KEY = "landing-web-reviews";
const WEB_BLOG_POSTS_KEY = "landing-web-blog-posts";
const SESSION_PACKAGES_VISIBILITY_KEY = "session-packages-visibility";
const blogStatusSchema = z.enum(["draft", "published"]);
const sessionPackagesChannelSchema = z.object({
  channel: z.enum(["landing", "patient"]).optional()
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
  body: z.string().min(80).max(100_000)
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

function parseSessionPackagesVisibility(value: unknown) {
  const parsed = z
    .object({
      landing: z.array(z.string().min(1)).max(3),
      patient: z.array(z.string().min(1)).max(3),
      featuredLanding: z.string().min(1).nullable().optional(),
      featuredPatient: z.string().min(1).nullable().optional()
    })
    .safeParse(value);

  if (!parsed.success) {
    return { landing: [] as string[], patient: [] as string[], featuredLanding: null as string | null, featuredPatient: null as string | null };
  }

  const landing = Array.from(new Set(parsed.data.landing));
  const patient = Array.from(new Set(parsed.data.patient));

  return {
    landing,
    patient,
    featuredLanding: parsed.data.featuredLanding && landing.includes(parsed.data.featuredLanding) ? parsed.data.featuredLanding : null,
    featuredPatient: parsed.data.featuredPatient && patient.includes(parsed.data.featuredPatient) ? parsed.data.featuredPatient : null
  };
}

export const publicRouter = Router();

publicRouter.get("/session-packages", async (req, res) => {
  const parsed = sessionPackagesChannelSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const [packages, visibilityConfig] = await Promise.all([
    prisma.sessionPackage.findMany({
      where: { active: true },
      include: {
        professional: { select: { id: true, user: { select: { fullName: true } } } }
      },
      orderBy: [{ credits: "asc" }, { createdAt: "asc" }]
    }),
    prisma.systemConfig.findUnique({ where: { key: SESSION_PACKAGES_VISIBILITY_KEY } })
  ]);
  const visibility = parseSessionPackagesVisibility(visibilityConfig?.value);
  const requestedIds =
    parsed.data.channel === "landing"
      ? visibility.landing
      : parsed.data.channel === "patient"
        ? visibility.patient
        : [];
  const orderedPackages =
    parsed.data.channel
      ? requestedIds.map((id) => packages.find((item) => item.id === id)).filter((item): item is (typeof packages)[number] => Boolean(item))
      : packages.slice(0, 3);
  const featuredPackageId =
    parsed.data.channel === "landing"
      ? visibility.featuredLanding
      : parsed.data.channel === "patient"
        ? visibility.featuredPatient
        : null;

  return res.json({
    featuredPackageId: featuredPackageId && orderedPackages.some((item) => item.id === featuredPackageId) ? featuredPackageId : null,
    sessionPackages: orderedPackages.map((item) => ({
      id: item.id,
      professionalId: item.professionalId,
      professionalName: item.professional?.user.fullName ?? null,
      stripePriceId: item.stripePriceId,
      name: item.name,
      credits: item.credits,
      priceCents: item.priceCents,
      discountPercent: item.discountPercent,
      currency: item.currency,
      active: item.active,
      createdAt: item.createdAt
    }))
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

publicRouter.get("/web-content", async (_req, res) => {
  const [settingsConfig, reviewsConfig, blogConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: LANDING_SETTINGS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } })
  ]);

  const reviewsParsed = z.array(reviewSchema).safeParse(reviewsConfig?.value);
  const postsParsed = z.array(blogPostSchema).safeParse(blogConfig?.value);

  const allPosts = postsParsed.success ? postsParsed.data : [];
  const publishedPosts = allPosts
    .filter((post) => post.status === "published")
    .sort((a, b) => {
      if (a.featured !== b.featured) {
        return Number(b.featured) - Number(a.featured);
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  return res.json({
    settings: parseLandingSettings(settingsConfig?.value),
    reviews: reviewsParsed.success ? reviewsParsed.data : [],
    blogPosts: publishedPosts,
    updatedAt: {
      settings: settingsConfig?.updatedAt ?? null,
      reviews: reviewsConfig?.updatedAt ?? null,
      blogPosts: blogConfig?.updatedAt ?? null
    }
  });
});
