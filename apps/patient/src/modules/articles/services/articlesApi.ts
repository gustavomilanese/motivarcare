import { apiRequest } from "../../app/services/api";

/** Coincide con `blogPostSchema` del backend (apps/api/src/modules/public/public.routes.ts). */
export interface ArticlePost {
  id: string;
  title: string;
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
  status: "published" | "draft" | "scheduled";
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  body: string;
}

interface WebContentResponse {
  blogPosts?: ArticlePost[];
  updatedAt?: { blogPosts?: string | null };
}

let inflight: Promise<ArticlePost[]> | null = null;

/**
 * Lista de notas publicadas (mismo origen que la landing).
 * El backend ya filtra `status === "published"` y prioriza `featured` + `publishedAt` desc.
 */
export async function fetchPublishedArticles(): Promise<ArticlePost[]> {
  if (inflight) {
    return inflight;
  }
  const pending = (async (): Promise<ArticlePost[]> => {
    const response = await apiRequest<WebContentResponse>("/api/public/web-content?audience=patient", {});
    return Array.isArray(response.blogPosts) ? response.blogPosts : [];
  })().finally(() => {
    inflight = null;
  });
  inflight = pending;
  return pending;
}
