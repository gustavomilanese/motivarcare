import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const LANDING_SETTINGS_KEY = "landing-settings";
const WEB_REVIEWS_KEY = "landing-web-reviews";
const WEB_BLOG_POSTS_KEY = "landing-web-blog-posts";
const blogStatusSchema = z.enum(["draft", "published"]);

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
  relativeDate: z.string().min(2).max(80),
  text: z.string().min(5).max(2000),
  rating: z.number().int().min(1).max(5),
  avatar: imageSourceSchema,
  accent: z.string().trim().min(4).max(32)
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

export const publicRouter = Router();

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
