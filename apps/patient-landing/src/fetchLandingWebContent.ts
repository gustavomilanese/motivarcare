/** Forma alineada con `reviewSchema` en `apps/api` / GET `/api/public/web-content`. */
export type LandingWebReview = {
  id: string;
  name: string;
  role: string;
  reviewDate?: string;
  relativeDate: string;
  text: string;
  rating: number;
  avatar: string;
  accent?: string;
};

export async function fetchLandingWebContent(apiBase: string): Promise<{
  reviews: LandingWebReview[];
}> {
  const base = apiBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/public/web-content?audience=landing`);
  if (!res.ok) {
    throw new Error("web-content failed");
  }
  return res.json() as Promise<{ reviews: LandingWebReview[] }>;
}

/** Avatar puede venir absoluto o path relativo al API. */
export function resolveReviewAvatarUrl(avatar: string, apiBase: string): string {
  const s = typeof avatar === "string" ? avatar.trim() : "";
  if (!s) {
    return "";
  }
  if (s.startsWith("data:") || s.startsWith("http://") || s.startsWith("https://")) {
    return s;
  }
  const base = apiBase.replace(/\/+$/, "");
  if (s.startsWith("/")) {
    return `${base}${s}`;
  }
  return `${base}/${s.replace(/^\/+/, "")}`;
}
